/**
 * PII Safe Mode utilities.
 *
 * When PII Safe Mode is enabled (localStorage pryntis_pii_safe === 'true'),
 * functions below mask sensitive data for screen-sharing / demos.
 */

const PII_SAFE_KEY = 'pryntis_pii_safe';

export function isPiiSafe() {
  return typeof window !== 'undefined' && localStorage.getItem(PII_SAFE_KEY) === 'true';
}

export function maskEmail(email) {
  if (!email) return email;
  if (!isPiiSafe()) return email;
  const [local, domain] = email.split('@');
  if (!domain) return '***@***.***';
  return local.charAt(0) + '***@' + domain.charAt(0) + '***.' + domain.split('.').pop();
}

export function maskPhone(phone) {
  if (!phone) return phone;
  if (!isPiiSafe()) return phone;
  if (phone.length <= 4) return '****';
  return '***-***-' + phone.slice(-4);
}

export function maskName(name) {
  if (!name) return name;
  if (!isPiiSafe()) return name;
  return name.charAt(0) + '***';
}
