/**
 * Shared HTML email templates for PatchIQ workflows.
 * All templates share consistent branding: PatchIQ blue (#1890ff), Arial font, 600px max-width.
 */

function wrapEmailHtml(content: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #1890ff; padding: 16px 24px; border-radius: 4px 4px 0 0;">
        <h1 style="margin: 0; color: #fff; font-size: 20px;">PatchIQ</h1>
      </div>
      <div style="padding: 24px; background: #fff; border: 1px solid #eee; border-top: none;">
        ${content}
      </div>
      <div style="padding: 16px 24px; background: #fafafa; border: 1px solid #eee; border-top: none; border-radius: 0 0 4px 4px;">
        <p style="margin: 0; color: #999; font-size: 11px;">This is an automated message from PatchIQ. Please do not reply to this email.</p>
      </div>
    </div>
  `;
}

function buttonHtml(href: string, label: string): string {
  return `
    <div style="margin: 24px 0;">
      <a href="${href}" style="display: inline-block; padding: 12px 24px; background: #1890ff; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">
        ${label}
      </a>
    </div>
  `;
}

export function buildPasswordResetEmailHtml(name: string, resetLink: string, expiresIn: string): string {
  return wrapEmailHtml(`
    <h2 style="margin: 0 0 16px 0; color: #1a1a1a;">Password Reset</h2>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. Click the button below to set a new password:</p>
    ${buttonHtml(resetLink, 'Reset Password')}
    <p style="color: #666;">This link expires in ${expiresIn}.</p>
    <p style="color: #666;">If you didn't request this, you can safely ignore this email.</p>
  `);
}

export function buildAdminPasswordResetEmailHtml(name: string, resetLink: string, expiresIn: string): string {
  return wrapEmailHtml(`
    <h2 style="margin: 0 0 16px 0; color: #1a1a1a;">Password Reset Requested</h2>
    <p>Hi ${name},</p>
    <p>An administrator has requested a password reset for your account. Click the button below to set a new password:</p>
    ${buttonHtml(resetLink, 'Reset Password')}
    <p style="color: #666;">This link expires in ${expiresIn}.</p>
    <p style="color: #666;">If you didn't expect this, please contact your administrator.</p>
  `);
}

export function buildInvitationEmailHtml(name: string, inviterName: string, role: string, onboardingLink: string, expiresIn: string): string {
  return wrapEmailHtml(`
    <h2 style="margin: 0 0 16px 0; color: #1a1a1a;">Welcome to PatchIQ!</h2>
    <p>${inviterName} has invited you to join PatchIQ as a <strong>${role}</strong>.</p>
    <p>Click the button below to set up your account:</p>
    ${buttonHtml(onboardingLink, 'Set Up Your Account')}
    <p style="color: #666;">This invitation expires in ${expiresIn}.</p>
  `);
}

export function buildReportEmailHtml(reportName: string, reportType: string, generatedDate: string, message: string | undefined, viewLink: string): string {
  return wrapEmailHtml(`
    <h2 style="margin: 0 0 16px 0; color: #1a1a1a;">PatchIQ Report</h2>
    ${message ? `<p>${message}</p>` : ''}
    <div style="background: #f5f5f5; padding: 16px; border-radius: 4px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Report:</strong> ${reportName}</p>
      <p style="margin: 0 0 8px 0;"><strong>Type:</strong> ${reportType}</p>
      <p style="margin: 0;"><strong>Generated:</strong> ${generatedDate}</p>
    </div>
    ${buttonHtml(viewLink, 'View Report')}
  `);
}
