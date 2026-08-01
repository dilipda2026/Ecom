import { describe, expect, it } from 'vitest';
import {
  isCitStudentEmail,
  isDeliveryEmail,
  isAdminEmail,
  isAllowedSigninEmail,
} from '@/config/auth-access';

describe('auth-access', () => {
  it('allows CIT students only on the cit.ac.in domain', () => {
    expect(isCitStudentEmail('youremail@cit.ac.in')).toBe(true);
    expect(isCitStudentEmail('USER@CIT.AC.IN')).toBe(true);
    expect(isCitStudentEmail('someone@gmail.com')).toBe(false);
    expect(isCitStudentEmail('fake@cit.ac.in.evil.com')).toBe(false);
  });

  it('allows only allowlisted admin emails', () => {
    expect(isAdminEmail('lastw5232@gmail.com')).toBe(true);
    expect(isAdminEmail('LASTW5232@GMAIL.COM')).toBe(true);
    expect(isAdminEmail('notadmin@gmail.com')).toBe(false);
  });

  it('allows only allowlisted delivery emails', () => {
    expect(isDeliveryEmail('anyone@gmail.com')).toBe(false);
    expect(isDeliveryEmail('youremail@cit.ac.in')).toBe(false);
  });

  it('sign-in gate accepts CIT, admin, and delivery emails only', () => {
    expect(isAllowedSigninEmail('youremail@cit.ac.in')).toBe(true);
    expect(isAllowedSigninEmail('lastw5232@gmail.com')).toBe(true);
    expect(isAllowedSigninEmail('outsider@yahoo.com')).toBe(false);
  });
});
