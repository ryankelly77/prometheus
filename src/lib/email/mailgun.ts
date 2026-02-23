/**
 * Mailgun email service for transactional emails.
 * Supports white-label branding for multi-tenant organizations.
 */

interface OrganizationBranding {
  name: string;
  logoUrl?: string | null;
  primaryColor?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@prometheus.app";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Send email via Mailgun API.
 */
async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    console.error("Mailgun not configured. Set MAILGUN_API_KEY and MAILGUN_DOMAIN.");
    // In development, log the email instead of failing
    if (process.env.NODE_ENV === "development") {
      console.log("📧 [DEV] Email would be sent:");
      console.log(`  To: ${options.to}`);
      console.log(`  Subject: ${options.subject}`);
      console.log(`  Body: ${options.text || "See HTML"}`);
      return true;
    }
    return false;
  }

  try {
    const formData = new FormData();
    formData.append("from", EMAIL_FROM);
    formData.append("to", options.to);
    formData.append("subject", options.subject);
    formData.append("html", options.html);
    if (options.text) {
      formData.append("text", options.text);
    }

    const response = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString("base64")}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("Mailgun error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

/**
 * Generate email template with optional white-label branding.
 */
function generateEmailTemplate(
  content: string,
  branding?: OrganizationBranding | null
): string {
  const brandName = branding?.name || "Prometheus";
  const primaryColor = branding?.primaryColor || "#6366f1";
  const logoHtml = branding?.logoUrl
    ? `<img src="${branding.logoUrl}" alt="${brandName}" style="max-height: 48px; max-width: 200px;" />`
    : `<span style="font-size: 24px; font-weight: bold; color: ${primaryColor};">${brandName}</span>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandName}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; text-align: center; border-bottom: 1px solid #e4e4e7;">
              ${logoHtml}
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #fafafa; text-align: center; border-top: 1px solid #e4e4e7;">
              <p style="margin: 0; font-size: 13px; color: #71717a;">
                ${branding ? `Powered by Prometheus` : `Restaurant analytics and health scoring platform`}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Send password reset email.
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  branding?: OrganizationBranding | null
): Promise<boolean> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  const brandName = branding?.name || "Prometheus";
  const primaryColor = branding?.primaryColor || "#6366f1";

  const content = `
    <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b;">
      Reset your password
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
      We received a request to reset your password for your ${brandName} account. Click the button below to set a new password.
    </p>
    <table role="presentation" style="margin: 0 0 24px;">
      <tr>
        <td style="border-radius: 6px; background-color: ${primaryColor};">
          <a href="${resetUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Reset Password
          </a>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #71717a;">
      This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.
    </p>
    <p style="margin: 0; font-size: 14px; line-height: 20px; color: #71717a;">
      Or copy and paste this URL into your browser:<br>
      <a href="${resetUrl}" style="color: ${primaryColor}; word-break: break-all;">${resetUrl}</a>
    </p>
  `;

  const html = generateEmailTemplate(content, branding);
  const text = `Reset your password for ${brandName}.\n\nClick here to reset: ${resetUrl}\n\nThis link expires in 1 hour.`;

  return sendEmail({
    to: email,
    subject: `Reset your ${brandName} password`,
    html,
    text,
  });
}

/**
 * Send invitation email.
 */
export async function sendInvitationEmail(
  email: string,
  token: string,
  inviterName: string,
  organizationName: string,
  role: string,
  branding?: OrganizationBranding | null
): Promise<boolean> {
  const acceptUrl = `${APP_URL}/accept-invite/${token}`;
  const brandName = branding?.name || "Prometheus";
  const primaryColor = branding?.primaryColor || "#6366f1";

  const roleLabel = role
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const content = `
    <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b;">
      You're invited to join ${organizationName}
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
      ${inviterName} has invited you to join <strong>${organizationName}</strong> on ${brandName} as a <strong>${roleLabel}</strong>.
    </p>
    <table role="presentation" style="margin: 0 0 24px;">
      <tr>
        <td style="border-radius: 6px; background-color: ${primaryColor};">
          <a href="${acceptUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Accept Invitation
          </a>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 16px; font-size: 14px; line-height: 20px; color: #71717a;">
      This invitation will expire in 7 days.
    </p>
    <p style="margin: 0; font-size: 14px; line-height: 20px; color: #71717a;">
      Or copy and paste this URL into your browser:<br>
      <a href="${acceptUrl}" style="color: ${primaryColor}; word-break: break-all;">${acceptUrl}</a>
    </p>
  `;

  const html = generateEmailTemplate(content, branding);
  const text = `${inviterName} has invited you to join ${organizationName} on ${brandName} as a ${roleLabel}.\n\nAccept here: ${acceptUrl}\n\nThis invitation expires in 7 days.`;

  return sendEmail({
    to: email,
    subject: `You're invited to join ${organizationName}`,
    html,
    text,
  });
}

/**
 * Send welcome email after accepting invitation.
 */
export async function sendWelcomeEmail(
  email: string,
  fullName: string,
  organizationName: string,
  branding?: OrganizationBranding | null
): Promise<boolean> {
  const loginUrl = `${APP_URL}/login`;
  const brandName = branding?.name || "Prometheus";
  const primaryColor = branding?.primaryColor || "#6366f1";

  const content = `
    <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 600; color: #18181b;">
      Welcome to ${organizationName}!
    </h1>
    <p style="margin: 0 0 24px; font-size: 16px; line-height: 24px; color: #3f3f46;">
      Hi ${fullName},<br><br>
      Your account has been created and you're now a member of <strong>${organizationName}</strong>. You can sign in anytime to access your dashboard.
    </p>
    <table role="presentation" style="margin: 0 0 24px;">
      <tr>
        <td style="border-radius: 6px; background-color: ${primaryColor};">
          <a href="${loginUrl}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">
            Go to Dashboard
          </a>
        </td>
      </tr>
    </table>
  `;

  const html = generateEmailTemplate(content, branding);
  const text = `Welcome to ${organizationName}, ${fullName}!\n\nYour account is ready. Sign in here: ${loginUrl}`;

  return sendEmail({
    to: email,
    subject: `Welcome to ${organizationName}!`,
    html,
    text,
  });
}
