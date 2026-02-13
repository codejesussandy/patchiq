import { Client } from 'ldapts';

export interface LdapConfig {
  host: string;
  port: number;
  baseDn: string;
  bindDn: string;
  bindPassword: string;
  useTLS?: boolean;
  userFilter?: string;
}

export interface LdapTestResult {
  success: boolean;
  message: string;
  error?: string;
  responseTime?: number;
  userCount?: number;
}

/**
 * Tests LDAP connection by attempting to bind
 */
export async function testConnection(config: LdapConfig): Promise<LdapTestResult> {
  const startTime = Date.now();

  // Build LDAP URL
  const protocol = config.useTLS ? 'ldaps' : 'ldap';
  const url = `${protocol}://${config.host}:${config.port}`;

  const client = new Client({
    url,
    timeout: 10000,
    connectTimeout: 10000,
    tlsOptions: config.useTLS
      ? {
          rejectUnauthorized: false, // Allow self-signed certs for testing
        }
      : undefined,
  });

  try {
    // Attempt to bind with the provided credentials
    await client.bind(config.bindDn, config.bindPassword);

    const responseTime = Date.now() - startTime;

    // Optionally search for users to verify baseDn
    let userCount: number | undefined;
    try {
      const searchResult = await client.search(config.baseDn, {
        scope: 'sub',
        filter: config.userFilter || '(objectClass=person)',
        attributes: ['dn'],
        sizeLimit: 100,
      });
      userCount = searchResult.searchEntries.length;
    } catch {
      // Search may fail if filter is wrong, but bind succeeded
    }

    return {
      success: true,
      message: `LDAP connection successful${userCount !== undefined ? `. Found ${userCount} users.` : ''}`,
      responseTime,
      userCount,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Parse common LDAP errors for better user feedback
    let friendlyMessage = 'LDAP connection failed';
    if (errorMessage.includes('ECONNREFUSED')) {
      friendlyMessage = 'Connection refused. Please check the host and port.';
    } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
      friendlyMessage = 'Connection timed out. Please check the host and port.';
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
      friendlyMessage = 'Host not found. Please check the LDAP server address.';
    } else if (errorMessage.includes('Invalid credentials') || errorMessage.includes('49')) {
      friendlyMessage = 'Invalid credentials. Please check the Bind DN and password.';
    } else if (errorMessage.includes('certificate') || errorMessage.includes('SSL') || errorMessage.includes('TLS')) {
      friendlyMessage = 'SSL/TLS error. Please check the security settings.';
    } else if (errorMessage.includes('No such object') || errorMessage.includes('32')) {
      friendlyMessage = 'Invalid Base DN. The specified path does not exist.';
    } else if (errorMessage.includes('unwilling') || errorMessage.includes('53')) {
      friendlyMessage = 'Server unwilling to perform operation. Check server policies.';
    }

    return {
      success: false,
      message: friendlyMessage,
      error: errorMessage,
      responseTime,
    };
  } finally {
    try {
      await client.unbind();
    } catch {
      // Ignore unbind errors
    }
  }
}

/**
 * Search for users in LDAP directory
 */
export async function searchUsers(
  config: LdapConfig,
  filter?: string,
  limit: number = 100
): Promise<{ users: Record<string, unknown>[]; total: number }> {
  const protocol = config.useTLS ? 'ldaps' : 'ldap';
  const url = `${protocol}://${config.host}:${config.port}`;

  const client = new Client({
    url,
    timeout: 30000,
    connectTimeout: 10000,
    tlsOptions: config.useTLS
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
  });

  try {
    await client.bind(config.bindDn, config.bindPassword);

    const searchFilter = filter || config.userFilter || '(objectClass=person)';

    const searchResult = await client.search(config.baseDn, {
      scope: 'sub',
      filter: searchFilter,
      attributes: ['cn', 'sn', 'givenName', 'mail', 'memberOf', 'distinguishedName', 'sAMAccountName', 'uid'],
      sizeLimit: limit,
    });

    const users = searchResult.searchEntries.map((entry) => ({
      dn: entry.dn,
      cn: entry.cn,
      sn: entry.sn,
      givenName: entry.givenName,
      mail: entry.mail,
      memberOf: entry.memberOf,
      sAMAccountName: entry.sAMAccountName,
      uid: entry.uid,
    }));

    return {
      users,
      total: users.length,
    };
  } finally {
    try {
      await client.unbind();
    } catch {
      // Ignore unbind errors
    }
  }
}

export interface LdapAuthConfig {
  host: string;
  port: number;
  baseDn: string;
  bindDn: string;
  bindPassword: string;
  useTLS?: boolean;
  userSearchBase?: string;
  emailAttribute?: string;
  nameAttribute?: string;
  userFilter?: string;
  groupSearchBase?: string;
  groupFilter?: string;
  groupMemberAttribute?: string;
}

export interface LdapAuthResult {
  dn: string;
  email: string;
  name: string;
  memberOf: string[];
}

/**
 * Authenticate a user via LDAP.
 * 1. Bind as service account
 * 2. Search for user by email
 * 3. Bind as found user (verify password)
 * 4. Extract user attributes (email, name, groups)
 *
 * For OpenLDAP, memberOf overlay is often not enabled, so we search
 * for groups that contain the user as a member.
 */
export async function authenticateUser(
  email: string,
  password: string,
  ldapConfig: LdapAuthConfig
): Promise<LdapAuthResult | null> {
  const protocol = ldapConfig.useTLS ? 'ldaps' : 'ldap';
  const url = `${protocol}://${ldapConfig.host}:${ldapConfig.port}`;

  const client = new Client({
    url,
    timeout: 10000,
    connectTimeout: 10000,
    tlsOptions: ldapConfig.useTLS
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    // Step 1: Bind as service account
    await client.bind(ldapConfig.bindDn, ldapConfig.bindPassword);

    // Step 2: Search for user by email
    const emailAttr = ldapConfig.emailAttribute || 'mail';
    const nameAttr = ldapConfig.nameAttribute || 'cn';
    const searchBase = ldapConfig.userSearchBase || ldapConfig.baseDn;
    const userFilter = ldapConfig.userFilter
      ? `(&(${emailAttr}=${email})${ldapConfig.userFilter})`
      : `(&(${emailAttr}=${email})(objectClass=inetOrgPerson))`;

    const searchResult = await client.search(searchBase, {
      scope: 'sub',
      filter: userFilter,
      attributes: ['dn', emailAttr, nameAttr, 'memberOf'],
      sizeLimit: 1,
    });

    if (searchResult.searchEntries.length === 0) {
      return null; // User not found
    }

    const userEntry = searchResult.searchEntries[0];
    const userDn = userEntry.dn;

    // Step 3: Bind as found user to verify password
    // Create a separate client for user bind to avoid interfering with service account
    const userClient = new Client({
      url,
      timeout: 10000,
      connectTimeout: 10000,
      tlsOptions: ldapConfig.useTLS
        ? { rejectUnauthorized: false }
        : undefined,
    });

    try {
      await userClient.bind(userDn, password);
    } catch {
      // Invalid password
      return null;
    } finally {
      try {
        await userClient.unbind();
      } catch {
        // Ignore unbind errors
      }
    }

    // Step 4: Extract user attributes
    const userEmail = extractStringAttribute(userEntry, emailAttr) || email;
    const userName = extractStringAttribute(userEntry, nameAttr) || email.split('@')[0];

    // Step 5: Find groups (OpenLDAP doesn't always have memberOf overlay)
    // Search for groups that have this user as a member
    const groupSearchBase = ldapConfig.groupSearchBase || ldapConfig.baseDn;
    const groupMemberAttr = ldapConfig.groupMemberAttribute || 'member';
    const groupFilter = `(&(objectClass=groupOfNames)(${groupMemberAttr}=${userDn}))`;

    let memberOf: string[] = [];
    try {
      const groupResult = await client.search(groupSearchBase, {
        scope: 'sub',
        filter: groupFilter,
        attributes: ['dn'],
        sizeLimit: 100,
      });
      memberOf = groupResult.searchEntries.map((entry) => entry.dn);
    } catch {
      // Group search may fail; continue without groups
    }

    // Also check if memberOf is directly on the user entry (Active Directory style)
    if (memberOf.length === 0 && userEntry.memberOf) {
      memberOf = normalizeToArray(userEntry.memberOf);
    }

    return {
      dn: userDn,
      email: userEmail,
      name: userName,
      memberOf,
    };
  } finally {
    try {
      await client.unbind();
    } catch {
      // Ignore unbind errors
    }
  }
}

/**
 * Search for groups in LDAP directory.
 * Returns group DNs, CNs, and member counts.
 */
export async function searchGroups(
  ldapConfig: LdapAuthConfig
): Promise<Array<{ dn: string; cn: string; memberCount: number; members: string[] }>> {
  const protocol = ldapConfig.useTLS ? 'ldaps' : 'ldap';
  const url = `${protocol}://${ldapConfig.host}:${ldapConfig.port}`;

  const client = new Client({
    url,
    timeout: 10000,
    connectTimeout: 10000,
    tlsOptions: ldapConfig.useTLS
      ? { rejectUnauthorized: false }
      : undefined,
  });

  try {
    await client.bind(ldapConfig.bindDn, ldapConfig.bindPassword);

    const searchBase = ldapConfig.groupSearchBase || ldapConfig.baseDn;
    const groupMemberAttr = ldapConfig.groupMemberAttribute || 'member';
    const filter = ldapConfig.groupFilter || '(objectClass=groupOfNames)';

    const searchResult = await client.search(searchBase, {
      scope: 'sub',
      filter,
      attributes: ['dn', 'cn', groupMemberAttr],
      sizeLimit: 200,
    });

    return searchResult.searchEntries.map((entry) => {
      const members = normalizeToArray(entry[groupMemberAttr]);
      return {
        dn: entry.dn,
        cn: extractStringAttribute(entry, 'cn') || entry.dn,
        memberCount: members.length,
        members,
      };
    });
  } finally {
    try {
      await client.unbind();
    } catch {
      // Ignore unbind errors
    }
  }
}

/**
 * Normalize an LDAP attribute value to a string array.
 * LDAP attributes can be a string, Buffer, or array of either.
 */
function normalizeToArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((v) => (v instanceof Buffer ? v.toString() : String(v)));
  }
  if (value instanceof Buffer) return [value.toString()];
  return [String(value)];
}

/**
 * Extract a string attribute from an LDAP entry.
 * Handles both string and Buffer values.
 */
function extractStringAttribute(entry: Record<string, unknown>, attr: string): string | null {
  const value = entry[attr];
  if (!value) return null;
  if (value instanceof Buffer) return value.toString();
  if (Array.isArray(value)) return value[0] instanceof Buffer ? value[0].toString() : String(value[0]);
  return String(value);
}

export const ldapService = {
  testConnection,
  searchUsers,
  authenticateUser,
  searchGroups,
};
