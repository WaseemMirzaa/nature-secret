/**
 * Premium reset password email template – Nature Secret brand.
 * Inline styles only for email client compatibility.
 */

function escapeHtml(s: string | null | undefined): string {
  if (s == null) return '';
  const str = String(s);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function renderResetPasswordEmail(resetLink: string): string {
  const link = escapeHtml(resetLink);
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password – Nature Secret</title>
</head>
<body style="margin:0; padding:0; background-color:#fafaf9; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#fafaf9;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 480px;">
          <!-- Header -->
          <tr>
            <td style="background-color: #1c1917; padding: 28px 32px; border-radius: 16px 16px 0 0;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 600; color: #cba847; letter-spacing: 0.02em;">Nature Secret</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 6px;">
                    <span style="font-size: 13px; color: rgba(250,250,249,0.85); letter-spacing: 0.05em; text-transform: uppercase;">Reset your password</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px; border-left: 1px solid #e7e5e4; border-right: 1px solid #e7e5e4;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #44403c; line-height: 1.6;">You requested a password reset for your Nature Secret account.</p>
              <p style="margin: 0 0 24px; font-size: 16px; color: #44403c; line-height: 1.6;">Click the button below to choose a new password. This link expires in 1 hour.</p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left">
                <tr>
                  <td style="border-radius: 12px; background-color: #1c1917;">
                    <a href="${link}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 15px; font-weight: 600; color: #cba847; text-decoration: none; letter-spacing: 0.02em;">Reset password</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 28px 0 0; font-size: 13px; color: #78716c; line-height: 1.5;">If you didn't request this, you can ignore this email. Your password will stay the same.</p>
              <p style="margin: 16px 0 0; font-size: 12px; color: #a8a29e; line-height: 1.5; word-break: break-all;">Or copy this link: <a href="${link}" style="color: #cba847;">${link}</a></p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #1c1917; padding: 24px 32px; border-radius: 0 0 16px 16px; border: 1px solid #1c1917;">
              <p style="margin: 0; font-size: 12px; color: rgba(250,250,249,0.6);">Nature Secret · Premium Herbal Oils &amp; Skincare</p>
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
