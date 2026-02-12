import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { config } from '@config/index';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

export function hashString(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// AES-256-GCM encryption for sensitive data
export function encrypt(text: string): string {
  const key = crypto.scryptSync(config.encryption.key, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const key = crypto.scryptSync(config.encryption.key, 'salt', 32);
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function maskString(str: string, visibleChars: number = 4): string {
  if (str.length <= visibleChars) {
    return '*'.repeat(str.length);
  }
  return '*'.repeat(str.length - visibleChars) + str.slice(-visibleChars);
}
