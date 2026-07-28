/**
 * Email sending module for Iron Lab.
 * Uses Resend (https://resend.com) when RESEND_API_KEY is set.
 * Falls back to console logging in development.
 *
 * Required env: RESEND_API_KEY, APP_URL (e.g. https://ironlab.thisisus.ai)
 * Optional env: EMAIL_FROM (default: noreply@ironlab.thisisus.ai)
 */

import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_ADDRESS =
  process.env.EMAIL_FROM || "Iron Lab <noreply@ironlab.thisisus.ai>";

export async function sendPasswordResetEmail(
  toEmail: string,
  resetToken: string
): Promise<void> {
  const appUrl = (process.env.APP_URL || "https://ironlab.thisisus.ai").replace(/\/$/, "");
  const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

  const subject = "Reset your Iron Lab password";
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Iron Lab password</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f0f;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
          <!-- Header -->
          <tr>
            <td style="background:#ff6b00;padding:24px 32px;text-align:center;">
              <span style="font-family:'Oswald',Impact,sans-serif;font-size:28px;font-weight:700;color:#fff;letter-spacing:2px;text-transform:uppercase;">
                IRON LAB
              </span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <h2 style="margin:0 0 16px;color:#fff;font-size:20px;font-weight:600;">
                Password Reset Request
              </h2>
              <p style="margin:0 0 24px;color:#aaa;font-size:15px;line-height:1.6;">
                We received a request to reset the password for your Iron Lab account. 
                Click the button below to set a new password. This link expires in 
                <strong style="color:#ff6b00;">1 hour</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background:#ff6b00;border-radius:8px;">
                    <a href="${resetUrl}" 
                       style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.5px;text-transform:uppercase;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#666;font-size:13px;line-height:1.5;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0 0 24px;word-break:break-all;">
                <a href="${resetUrl}" style="color:#ff6b00;font-size:13px;text-decoration:none;">${resetUrl}</a>
              </p>
              <hr style="border:none;border-top:1px solid #2a2a2a;margin:0 0 24px;" />
              <p style="margin:0;color:#555;font-size:13px;line-height:1.5;">
                If you didn't request a password reset, you can safely ignore this email. 
                Your password will not change.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;background:#111;text-align:center;">
              <p style="margin:0;color:#444;font-size:12px;">
                Iron Lab Bench Press Tracker &mdash; ironlab.thisisus.ai
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

  if (!resend) {
    // Development fallback — log to console
    console.log("[Email] Password reset link (no Resend key configured):");
    console.log(`[Email]   To: ${toEmail}`);
    console.log(`[Email]   URL: ${resetUrl}`);
    return;
  }

  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to: [toEmail],
    subject,
    html,
  });

  if (error) {
    console.error("[Email] Failed to send password reset email:", error);
    throw new Error("EMAIL_SEND_FAILED");
  }
}
