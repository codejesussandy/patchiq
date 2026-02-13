import https from 'https';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { prisma } from '@/db/client';
import { decrypt } from '@shared/utils/crypto';
import { createLogger } from './logger';

const logger = createLogger('proxy-service');

export interface ProxyConfig {
  host: string;
  port: number;
  protocol: 'HTTP' | 'HTTPS' | 'SOCKS5';
  username?: string;
  password?: string;
}

export interface ProxyTestResult {
  success: boolean;
  message: string;
  error?: string;
  responseTime?: number;
  externalIp?: string;
}

/**
 * Creates a proxy agent based on the protocol
 */
function createProxyAgent(config: ProxyConfig) {
  let proxyUrl: string;

  // Build authentication string if credentials provided
  const auth = config.username && config.password
    ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`
    : '';

  switch (config.protocol) {
    case 'SOCKS5':
      proxyUrl = `socks5://${auth}${config.host}:${config.port}`;
      return new SocksProxyAgent(proxyUrl);

    case 'HTTPS':
      proxyUrl = `https://${auth}${config.host}:${config.port}`;
      return new HttpsProxyAgent(proxyUrl);

    case 'HTTP':
    default:
      proxyUrl = `http://${auth}${config.host}:${config.port}`;
      return new HttpProxyAgent(proxyUrl);
  }
}

/**
 * Tests proxy connection by making a request through the proxy
 */
export async function testConnection(config: ProxyConfig): Promise<ProxyTestResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    try {
      const agent = createProxyAgent(config);

      // Use httpbin.org to test the proxy (returns the requesting IP)
      const options = {
        hostname: 'httpbin.org',
        port: 443,
        path: '/ip',
        method: 'GET',
        agent,
        timeout: 15000,
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          const responseTime = Date.now() - startTime;

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            let externalIp: string | undefined;
            try {
              const parsed = JSON.parse(data);
              externalIp = parsed.origin;
            } catch {
              // Couldn't parse IP
            }

            resolve({
              success: true,
              message: `Proxy connection successful${externalIp ? `. External IP: ${externalIp}` : ''}`,
              responseTime,
              externalIp,
            });
          } else {
            resolve({
              success: false,
              message: `Proxy returned status ${res.statusCode}`,
              error: `HTTP ${res.statusCode}: ${data}`,
              responseTime,
            });
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          message: 'Connection timed out. Please check the proxy host and port.',
          error: 'Request timeout',
          responseTime: Date.now() - startTime,
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        const errorMessage = error.message;

        // Parse common proxy errors for better user feedback
        let friendlyMessage = 'Proxy connection failed';
        if (errorMessage.includes('ECONNREFUSED')) {
          friendlyMessage = 'Connection refused. Please check the proxy host and port.';
        } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
          friendlyMessage = 'Connection timed out. Please check the proxy host and port.';
        } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
          friendlyMessage = 'Host not found. Please check the proxy host address.';
        } else if (errorMessage.includes('authentication') || errorMessage.includes('auth') || errorMessage.includes('407')) {
          friendlyMessage = 'Proxy authentication failed. Please check your credentials.';
        } else if (errorMessage.includes('SOCKS') || errorMessage.includes('socks')) {
          friendlyMessage = 'SOCKS proxy error. Please check protocol and credentials.';
        } else if (errorMessage.includes('certificate') || errorMessage.includes('SSL') || errorMessage.includes('TLS')) {
          friendlyMessage = 'SSL/TLS error. Please check the security settings.';
        }

        resolve({
          success: false,
          message: friendlyMessage,
          error: errorMessage,
          responseTime,
        });
      });

      req.end();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      resolve({
        success: false,
        message: 'Failed to create proxy connection',
        error: errorMessage,
        responseTime: Date.now() - startTime,
      });
    }
  });
}

/**
 * Get proxy agent for outbound HTTP requests based on saved proxy settings.
 * Returns undefined if proxy is disabled.
 */
export async function getProxyAgent(): Promise<HttpProxyAgent<string> | HttpsProxyAgent<string> | SocksProxyAgent | undefined> {
  try {
    // Read proxy settings from DB
    const settings = await prisma.setting.findMany({
      where: { category: 'proxy' },
    });

    const config: Record<string, unknown> = {};
    for (const setting of settings) {
      const key = setting.key.replace('proxy.', '');
      config[key] = setting.value;
    }

    // If proxy is not enabled, return undefined
    if (!config.enabled) {
      return undefined;
    }

    // Validate required fields
    if (!config.host || !config.port || !config.protocol) {
      logger.warn('Proxy is enabled but missing required fields (host, port, protocol)');
      return undefined;
    }

    // Decrypt password if present
    let password: string | undefined;
    if (config.password) {
      try {
        password = decrypt(config.password as string);
      } catch (error) {
        logger.error({ err: error }, 'Failed to decrypt proxy password');
        return undefined;
      }
    }

    // Build proxy config
    const proxyConfig: ProxyConfig = {
      host: config.host as string,
      port: Number(config.port),
      protocol: config.protocol as 'HTTP' | 'HTTPS' | 'SOCKS5',
      username: config.username as string | undefined,
      password,
    };

    // Create and return appropriate agent
    return createProxyAgent(proxyConfig);
  } catch (error) {
    logger.error({ err: error }, 'Failed to get proxy agent');
    return undefined;
  }
}

export const proxyService = {
  testConnection,
  getProxyAgent,
};
