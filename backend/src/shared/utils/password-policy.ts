import { PrismaClient } from '@prisma/client';

interface PasswordPolicy {
  minCharacterCount: number;
  minNumbers: boolean;
  minLowerCaseCharacters: boolean;
  minUpperCaseCharacters: boolean;
  minSpecialCharacters: boolean;
}

interface PolicyViolation {
  field: string;
  message: string;
}

const DEFAULT_POLICY: PasswordPolicy = {
  minCharacterCount: 8,
  minNumbers: true,
  minLowerCaseCharacters: true,
  minUpperCaseCharacters: true,
  minSpecialCharacters: true,
};

/**
 * Get the current password policy from the database.
 * Falls back to default policy if none configured.
 */
export async function getPasswordPolicy(prisma: PrismaClient): Promise<PasswordPolicy> {
  const setting = await prisma.setting.findUnique({
    where: { key: 'passwordPolicy' },
  });

  if (!setting || !setting.value) {
    return DEFAULT_POLICY;
  }

  // Parse the stored policy and merge with defaults
  const storedPolicy = setting.value as Partial<PasswordPolicy>;
  return {
    ...DEFAULT_POLICY,
    ...storedPolicy,
  };
}

/**
 * Validate a password against the current policy.
 * Returns an array of all violations (not fail-fast).
 */
export async function validatePassword(password: string, prisma: PrismaClient): Promise<PolicyViolation[]> {
  const policy = await getPasswordPolicy(prisma);
  const violations: PolicyViolation[] = [];

  if (password.length < policy.minCharacterCount) {
    violations.push({
      field: 'password',
      message: `Password must be at least ${policy.minCharacterCount} characters`,
    });
  }

  if (policy.minNumbers && !/\d/.test(password)) {
    violations.push({
      field: 'password',
      message: 'Password must contain at least one number',
    });
  }

  if (policy.minLowerCaseCharacters && !/[a-z]/.test(password)) {
    violations.push({
      field: 'password',
      message: 'Password must contain at least one lowercase letter',
    });
  }

  if (policy.minUpperCaseCharacters && !/[A-Z]/.test(password)) {
    violations.push({
      field: 'password',
      message: 'Password must contain at least one uppercase letter',
    });
  }

  if (policy.minSpecialCharacters && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password)) {
    violations.push({
      field: 'password',
      message: 'Password must contain at least one special character (!@#$%^&*...)',
    });
  }

  return violations;
}
