/**
 * Email Provider Interface (Feature-flagged)
 *
 * This is a no-op provider that serves as the default.
 * When email integration is enabled (SMTP or SendGrid),
 * replace this with a real implementation.
 *
 * Environment variables (future):
 *   EMAIL_PROVIDER=smtp|sendgrid
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   SENDGRID_API_KEY
 */

class EmailProvider {
  constructor() {
    this.enabled = process.env.EMAIL_PROVIDER === 'smtp' || process.env.EMAIL_PROVIDER === 'sendgrid';
    if (!this.enabled) {
      console.log('[Email] No email provider configured. Notifications are in-app only.');
    }
  }

  /**
   * Send an email.
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} html - HTML body
   * @param {string} text - Plain text fallback
   * @returns {Promise<{success: boolean, messageId?: string}>}
   */
  async send(to, subject, html, text) {
    if (!this.enabled) {
      // No-op: log and return
      console.log(`[Email] (no-op) Would send to ${to}: ${subject}`);
      return { success: true, messageId: null };
    }

    // Future: implement SMTP via nodemailer or SendGrid via @sendgrid/mail
    throw new Error('Email provider not implemented. Set EMAIL_PROVIDER in .env');
  }

  /**
   * Send a templated notification email.
   * @param {string} to
   * @param {string} templateName
   * @param {object} data
   */
  async sendNotification(to, templateName, data) {
    const subject = data.subject || 'Pryntis Notification';
    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#6c63ff;">Pryntis</h2>
      <p>${data.body || ''}</p>
      ${data.link ? `<a href="${data.link}" style="display:inline-block;padding:10px 20px;background:#6c63ff;color:#fff;border-radius:6px;text-decoration:none;">View in Pryntis</a>` : ''}
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="font-size:12px;color:#999;">You are receiving this because you have an account at Pryntis.</p>
    </div>`;
    return this.send(to, subject, html, data.body);
  }
}

// Singleton
let instance;
function getEmailProvider() {
  if (!instance) instance = new EmailProvider();
  return instance;
}

module.exports = { EmailProvider, getEmailProvider };
