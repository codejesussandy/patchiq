import { Client as SSHClient } from 'ssh2';
import http from 'http';
import snmp from 'net-snmp';

export interface CredentialTestResult {
  success: boolean;
  message: string;
  errorCode?: 'AUTH_FAILED' | 'HOST_UNREACHABLE' | 'TIMEOUT' | 'UNKNOWN';
  latencyMs?: number;
}

export function testSSH(
  host: string,
  port: number,
  username: string,
  password: string
): Promise<CredentialTestResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const client = new SSHClient();

    const cleanup = () => {
      try {
        client.end();
      } catch {
        // ignore cleanup errors
      }
    };

    client
      .on('ready', () => {
        const latencyMs = Date.now() - start;
        cleanup();
        resolve({
          success: true,
          message: 'SSH authentication successful',
          latencyMs,
        });
      })
      .on('error', (err: Error & { level?: string; code?: string }) => {
        const latencyMs = Date.now() - start;
        cleanup();

        if (err.level === 'client-authentication') {
          resolve({
            success: false,
            message: 'Authentication failed: invalid credentials',
            errorCode: 'AUTH_FAILED',
            latencyMs,
          });
        } else if (
          err.code === 'ECONNREFUSED' ||
          err.code === 'EHOSTUNREACH' ||
          err.code === 'ENETUNREACH'
        ) {
          resolve({
            success: false,
            message: `Host unreachable: ${err.code}`,
            errorCode: 'HOST_UNREACHABLE',
            latencyMs,
          });
        } else if (err.code === 'ETIMEDOUT') {
          resolve({
            success: false,
            message: 'Connection timed out',
            errorCode: 'TIMEOUT',
            latencyMs,
          });
        } else {
          resolve({
            success: false,
            message: `Connection error: ${err.message}`,
            errorCode: 'UNKNOWN',
            latencyMs,
          });
        }
      })
      .connect({
        host,
        port,
        username,
        password,
        readyTimeout: 10000,
        timeout: 10000,
      });
  });
}

export function testWinRM(
  host: string,
  port: number,
  username: string,
  password: string,
  domain?: string | null
): Promise<CredentialTestResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const authUser = domain ? `${domain}\\${username}` : username;
    const authHeader = `Basic ${Buffer.from(`${authUser}:${password}`).toString('base64')}`;

    const body = `<s:Envelope xmlns:s="http://www.w3.org/2003/05/soap-envelope" xmlns:wsmid="http://schemas.dmtf.org/wbem/wsman/identity/1/wsmanidentity.xsd"><s:Header/><s:Body><wsmid:Identify/></s:Body></s:Envelope>`;

    const req = http.request(
      {
        hostname: host,
        port,
        path: '/wsman',
        method: 'POST',
        headers: {
          'Content-Type': 'application/soap+xml;charset=UTF-8',
          Authorization: authHeader,
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 10000,
      },
      (res) => {
        const latencyMs = Date.now() - start;
        // 200 or 401 both indicate host is reachable
        if (res.statusCode === 200) {
          resolve({
            success: true,
            message: 'WinRM authentication successful',
            latencyMs,
          });
        } else if (res.statusCode === 401) {
          resolve({
            success: false,
            message: 'Authentication failed: invalid credentials',
            errorCode: 'AUTH_FAILED',
            latencyMs,
          });
        } else {
          resolve({
            success: false,
            message: `WinRM returned status ${res.statusCode}`,
            errorCode: 'UNKNOWN',
            latencyMs,
          });
        }
        res.resume(); // drain response
      }
    );

    req.on('timeout', () => {
      const latencyMs = Date.now() - start;
      req.destroy();
      resolve({
        success: false,
        message: 'Connection timed out',
        errorCode: 'TIMEOUT',
        latencyMs,
      });
    });

    req.on('error', (err: NodeJS.ErrnoException) => {
      const latencyMs = Date.now() - start;
      if (
        err.code === 'ECONNREFUSED' ||
        err.code === 'EHOSTUNREACH' ||
        err.code === 'ENETUNREACH'
      ) {
        resolve({
          success: false,
          message: `Host unreachable: ${err.code}`,
          errorCode: 'HOST_UNREACHABLE',
          latencyMs,
        });
      } else if (err.code === 'ETIMEDOUT') {
        resolve({
          success: false,
          message: 'Connection timed out',
          errorCode: 'TIMEOUT',
          latencyMs,
        });
      } else {
        resolve({
          success: false,
          message: `Connection error: ${err.message}`,
          errorCode: 'UNKNOWN',
          latencyMs,
        });
      }
    });

    req.write(body);
    req.end();
  });
}

export function testSNMP(
  host: string,
  port: number,
  communityString: string
): Promise<CredentialTestResult> {
  return new Promise((resolve) => {
    const start = Date.now();
    const session = snmp.createSession(host, communityString, {
      port,
      timeout: 10000,
      retries: 1,
    });

    const sysDescrOid = '1.3.6.1.2.1.1.1.0';

    session.get([sysDescrOid], (error: Error | null) => {
      const latencyMs = Date.now() - start;
      session.close();

      if (error) {
        if (error.message?.includes('RequestTimedOut') || error.name === 'RequestTimedOutError') {
          resolve({
            success: false,
            message: 'SNMP request timed out',
            errorCode: 'TIMEOUT',
            latencyMs,
          });
        } else {
          resolve({
            success: false,
            message: `SNMP error: ${error.message}`,
            errorCode: 'AUTH_FAILED',
            latencyMs,
          });
        }
      } else {
        resolve({
          success: true,
          message: 'SNMP authentication successful',
          latencyMs,
        });
      }
    });
  });
}

export function testCredentialConnection(
  type: string,
  host: string,
  options: {
    port?: number | null;
    username?: string | null;
    password?: string | null;
    domain?: string | null;
    snmpCommunity?: string | null;
  }
): Promise<CredentialTestResult> {
  switch (type) {
    case 'SSH':
      return testSSH(host, options.port || 22, options.username || '', options.password || '');
    case 'WINRM':
      return testWinRM(
        host,
        options.port || 5985,
        options.username || '',
        options.password || '',
        options.domain
      );
    case 'SNMP':
      return testSNMP(host, options.port || 161, options.snmpCommunity || 'public');
    default:
      return Promise.resolve({
        success: false,
        message: `Unsupported credential type: ${type}`,
        errorCode: 'UNKNOWN' as const,
      });
  }
}
