import { describe, it, expect } from '@jest/globals';
import { notificationPreferencesSchema } from '../notifications.validators';

describe('Notification Preferences Validator', () => {
  it('should accept valid notification preferences', () => {
    const validData = {
      agentInApp: true,
      agentEmail: false,
      deploymentInApp: true,
      deploymentEmail: false,
      vulnerabilityInApp: true,
      vulnerabilityEmail: true,
      alertInApp: true,
      alertEmail: true,
      systemInApp: true,
      systemEmail: false,
    };

    const result = notificationPreferencesSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should accept partial notification preferences', () => {
    const partialData = {
      agentInApp: false,
      deploymentEmail: true,
    };

    const result = notificationPreferencesSchema.safeParse(partialData);
    expect(result.success).toBe(true);
  });

  it('should reject unknown keys due to .strict()', () => {
    const invalidData = {
      agentInApp: true,
      agentEmail: false,
      smsNotification: true, // Unknown key
    };

    const result = notificationPreferencesSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].code).toBe('unrecognized_keys');
      expect(result.error.issues[0].message).toContain('Unrecognized key(s)');
    }
  });

  it('should reject non-boolean values', () => {
    const invalidData = {
      agentInApp: 'true', // String instead of boolean
      agentEmail: 1, // Number instead of boolean
    };

    const result = notificationPreferencesSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should accept empty object (all optional fields)', () => {
    const emptyData = {};

    const result = notificationPreferencesSchema.safeParse(emptyData);
    expect(result.success).toBe(true);
  });
});
