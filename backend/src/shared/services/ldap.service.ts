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

export const ldapService = {
  testConnection,
  searchUsers,
};
