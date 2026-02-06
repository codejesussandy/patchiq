import { prisma } from '@/db/client';
import { decrypt } from '@shared/utils/crypto';
import { createTransporter, type MailServerConfig } from '@shared/services/email.service';

/**
 * Load SMTP configuration from the Settings table.
 * Returns null if no mail server is configured.
 */
async function loadMailConfig(): Promise<MailServerConfig | null> {
  const settings = await prisma.setting.findMany({
    where: { category: 'mail' },
  });

  if (settings.length === 0) return null;

  const map: Record<string, unknown> = {};
  for (const s of settings) {
    map[s.key.replace('mail.', '')] = s.value;
  }

  const host = map.host as string | undefined;
  if (!host) return null;

  let password: string | undefined;
  if (map.password) {
    try {
      password = decrypt(map.password as string);
    } catch {
      password = map.password as string;
    }
  }

  return {
    host,
    port: Number(map.port) || 587,
    secure: map.secure === true,
    username: map.username as string | undefined,
    password,
    fromAddress: map.fromAddress as string | undefined,
    fromName: (map.fromName as string) || 'PatchIQ',
  };
}

/**
 * Build a simple HTML email for a notification.
 */
function buildNotificationEmailHtml(notification: {
  title: string;
  message: string;
  type: string;
  category: string;
  link?: string;
}): string {
  const colorMap: Record<string, string> = {
    error: '#ff4d4f',
    warning: '#faad14',
    success: '#52c41a',
    info: '#1890ff',
  };
  const borderColor = colorMap[notification.type] || colorMap.info;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="border-left: 4px solid ${borderColor}; padding: 16px; background: #fafafa; border-radius: 4px;">
        <h2 style="margin: 0 0 8px 0; color: #1a1a1a;">${notification.title}</h2>
        <p style="margin: 0 0 12px 0; color: #444; line-height: 1.5;">${notification.message}</p>
        <span style="display: inline-block; padding: 2px 8px; background: #e6e6e6; border-radius: 3px; font-size: 12px; color: #666; text-transform: uppercase;">
          ${notification.category}
        </span>
      </div>
      ${notification.link ? `
      <div style="margin-top: 16px;">
        <a href="${notification.link}" style="display: inline-block; padding: 8px 16px; background: #1890ff; color: #fff; text-decoration: none; border-radius: 4px;">
          View Details
        </a>
      </div>` : ''}
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #999; font-size: 11px;">
        This is an automated notification from PatchIQ. You can manage your notification preferences in Settings.
      </p>
    </div>
  `;
}

// Default email-enabled categories (when no preference record exists)
const DEFAULT_EMAIL_ENABLED: Record<string, boolean> = {
  agentEmail: false,
  deploymentEmail: false,
  vulnerabilityEmail: true,
  alertEmail: true,
  systemEmail: false,
};

/**
 * Send an email notification if the user has email enabled for this category.
 * Fire-and-forget — caller should `.catch(() => {})`.
 */
export async function maybeSendNotificationEmail(
  userId: string,
  notification: { title: string; message: string; type: string; category: string; link?: string },
): Promise<void> {
  // Check email preference
  const pref = await prisma.notificationPreference.findUnique({ where: { userId } });
  const emailKey = `${notification.category}Email` as string;
  const emailEnabled = pref
    ? (pref as Record<string, unknown>)[emailKey] !== false
    : DEFAULT_EMAIL_ENABLED[emailKey] ?? false;

  if (!emailEnabled) return;

  // Load SMTP config
  const mailConfig = await loadMailConfig();
  if (!mailConfig) return;

  // Load user email
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true },
  });
  if (!user?.email) return;

  // Send
  const transporter = createTransporter(mailConfig);
  const fromAddress = mailConfig.fromAddress || mailConfig.username || `noreply@${mailConfig.host}`;
  const fromName = mailConfig.fromName || 'PatchIQ';

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddress}>`,
    to: user.email,
    subject: `[PatchIQ] ${notification.title}`,
    html: buildNotificationEmailHtml(notification),
  });
}
