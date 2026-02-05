import nodemailer, { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

export interface MailServerConfig {
  host: string;
  port: number;
  secure: boolean;
  username?: string;
  password?: string;
  fromAddress?: string;
  fromName?: string;
}

export interface TestMailResult {
  success: boolean;
  message: string;
  error?: string;
  responseTime?: number;
}

/**
 * Creates a nodemailer transporter from mail server configuration
 */
export function createTransporter(config: MailServerConfig): Transporter {
  const transportOptions: SMTPTransport.Options = {
    host: config.host,
    port: config.port,
    secure: config.secure, // true for 465, false for other ports
  };

  // Add authentication if credentials provided
  if (config.username && config.password) {
    transportOptions.auth = {
      user: config.username,
      pass: config.password,
    };
  }

  return nodemailer.createTransport(transportOptions);
}

/**
 * Tests SMTP connection by verifying the transporter
 */
export async function testConnection(config: MailServerConfig): Promise<TestMailResult> {
  const startTime = Date.now();

  try {
    const transporter = createTransporter(config);

    // Verify connection configuration
    await transporter.verify();

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      message: 'SMTP connection successful',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Parse common SMTP errors for better user feedback
    let friendlyMessage = 'SMTP connection failed';
    if (errorMessage.includes('ECONNREFUSED')) {
      friendlyMessage = 'Connection refused. Please check the host and port.';
    } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
      friendlyMessage = 'Connection timed out. Please check the host and port.';
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
      friendlyMessage = 'Host not found. Please check the SMTP host address.';
    } else if (errorMessage.includes('authentication') || errorMessage.includes('auth') || errorMessage.includes('535')) {
      friendlyMessage = 'Authentication failed. Please check your credentials.';
    } else if (errorMessage.includes('certificate') || errorMessage.includes('SSL') || errorMessage.includes('TLS')) {
      friendlyMessage = 'SSL/TLS error. Please check the security settings.';
    }

    return {
      success: false,
      message: friendlyMessage,
      error: errorMessage,
      responseTime,
    };
  }
}

/**
 * Sends a test email to verify full mail server functionality
 */
export async function sendTestEmail(
  config: MailServerConfig,
  testEmail: string
): Promise<TestMailResult> {
  const startTime = Date.now();

  try {
    const transporter = createTransporter(config);

    // First verify connection
    await transporter.verify();

    // Prepare from address
    const fromAddress = config.fromAddress || config.username || `test@${config.host}`;
    const fromName = config.fromName || 'PatchIQ';

    // Send test email
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: testEmail,
      subject: 'PatchIQ Mail Server Test',
      text: 'This is a test email from PatchIQ to verify your mail server configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1890ff;">PatchIQ Mail Server Test</h2>
          <p>This is a test email from PatchIQ to verify your mail server configuration.</p>
          <p>If you received this email, your mail server is configured correctly.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #888; font-size: 12px;">
            Sent at: ${new Date().toISOString()}<br>
            Server: ${config.host}:${config.port}
          </p>
        </div>
      `,
    });

    const responseTime = Date.now() - startTime;

    return {
      success: true,
      message: `Test email sent successfully to ${testEmail}. Message ID: ${info.messageId}`,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    // Parse common SMTP errors for better user feedback
    let friendlyMessage = 'Failed to send test email';
    if (errorMessage.includes('ECONNREFUSED')) {
      friendlyMessage = 'Connection refused. Please check the host and port.';
    } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
      friendlyMessage = 'Connection timed out. Please check the host and port.';
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('getaddrinfo')) {
      friendlyMessage = 'Host not found. Please check the SMTP host address.';
    } else if (errorMessage.includes('authentication') || errorMessage.includes('auth') || errorMessage.includes('535')) {
      friendlyMessage = 'Authentication failed. Please check your credentials.';
    } else if (errorMessage.includes('certificate') || errorMessage.includes('SSL') || errorMessage.includes('TLS')) {
      friendlyMessage = 'SSL/TLS error. Please check the security settings.';
    } else if (errorMessage.includes('Invalid login') || errorMessage.includes('Invalid credentials')) {
      friendlyMessage = 'Invalid login credentials.';
    } else if (errorMessage.includes('recipient') || errorMessage.includes('550')) {
      friendlyMessage = 'Invalid recipient email address.';
    }

    return {
      success: false,
      message: friendlyMessage,
      error: errorMessage,
      responseTime,
    };
  }
}

export const emailService = {
  createTransporter,
  testConnection,
  sendTestEmail,
};
