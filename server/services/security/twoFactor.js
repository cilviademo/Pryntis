/**
 * Two-Factor Authentication Stub (Feature-flagged)
 *
 * This is a no-op implementation that serves as the interface
 * for future TOTP/WebAuthn 2FA support.
 *
 * Environment variables (future):
 *   TWO_FACTOR_ENABLED=true
 *   TWO_FACTOR_ISSUER=Pryntis
 *
 * Dependencies (future):
 *   otplib (for TOTP)
 *   @simplewebauthn/server (for WebAuthn)
 */

const TWO_FACTOR_ENABLED = process.env.TWO_FACTOR_ENABLED === 'true';

/**
 * Generate a TOTP secret for a user.
 * @param {string} userEmail
 * @returns {Promise<{secret: string, otpauthUrl: string, qrCodeDataUrl: string}>}
 */
async function generateTotpSecret(userEmail) {
  if (!TWO_FACTOR_ENABLED) {
    throw new Error('Two-factor authentication is not enabled. Set TWO_FACTOR_ENABLED=true in .env');
  }

  // Future: Use otplib to generate secret
  // const { authenticator } = require('otplib');
  // const secret = authenticator.generateSecret();
  // const otpauthUrl = authenticator.keyuri(userEmail, 'Pryntis', secret);
  // const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  // return { secret, otpauthUrl, qrCodeDataUrl };

  throw new Error('TOTP implementation pending. Install otplib and qrcode packages.');
}

/**
 * Verify a TOTP code.
 * @param {string} secret
 * @param {string} token
 * @returns {boolean}
 */
function verifyTotpToken(secret, token) {
  if (!TWO_FACTOR_ENABLED) return true; // bypass when disabled

  // Future: const { authenticator } = require('otplib');
  // return authenticator.verify({ token, secret });
  return true;
}

/**
 * Generate backup codes.
 * @returns {string[]}
 */
function generateBackupCodes() {
  // Future: Generate 10 random 8-char backup codes
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
  }
  return codes;
}

module.exports = {
  TWO_FACTOR_ENABLED,
  generateTotpSecret,
  verifyTotpToken,
  generateBackupCodes,
};
