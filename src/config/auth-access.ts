const DEFAULT_ADMIN_EMAILS = ['lastw5232@gmail.com'];
const DEFAULT_DELIVERY_EMAILS = ['chetanlimbu694@gmail.com'];

export const CIT_STUDENT_DOMAIN = 'cit.ac.in';
export const ADMIN_EMAILS = DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase());
export const DELIVERY_EMAILS = DEFAULT_DELIVERY_EMAILS.map((e) => e.toLowerCase());

export function isCitStudentEmail(email: string) {
  return email.trim().toLowerCase().endsWith('@cit.ac.in');
}

export function isAdminEmail(email: string, extraAdminEmails: string[] = []) {
  const target = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(target) || extraAdminEmails.some((e) => e.trim().toLowerCase() === target);
}

/**
 * A delivery email is valid when it is in the built-in default list OR in the
 * owner-configured list (from General Settings).
 */
export function isDeliveryEmail(email: string, extraDeliveryEmails: string[] = []) {
  const target = email.trim().toLowerCase();
  return DELIVERY_EMAILS.includes(target) || extraDeliveryEmails.some((e) => e.trim().toLowerCase() === target);
}

export function isAllowedSigninEmail(email: string, extraDeliveryEmails: string[] = [], extraAdminEmails: string[] = []) {
  return isCitStudentEmail(email) || isAdminEmail(email, extraAdminEmails) || isDeliveryEmail(email, extraDeliveryEmails);
}
