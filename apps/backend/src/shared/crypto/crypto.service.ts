import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
  /**
   * Hashes a password using Argon2id with OWASP-recommended parameters
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MB
      timeCost: 3, // 3 iterations
      parallelism: 4,
    });
  }

  /**
   * Verifies a plain-text password against an Argon2 hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Generates a cryptographically secure random token (e.g. for gateway enrollment or CSRF)
   */
  generateSecureToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Signs a payload with HMAC-SHA256 (used for signing gateway remote commands)
   */
  signHmac(payload: string, secretKey: string): string {
    return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
  }

  /**
   * Verifies an HMAC signature using timing-safe comparison
   */
  verifyHmac(payload: string, signature: string, secretKey: string): boolean {
    const expected = this.signHmac(payload, secretKey);
    const expectedBuf = Buffer.from(expected, 'hex');
    const signatureBuf = Buffer.from(signature, 'hex');

    if (expectedBuf.length !== signatureBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, signatureBuf);
  }

  /**
   * Encrypts plaintext data using AES-256-GCM authenticated encryption (for Cloud Credentials)
   */
  encryptAes256Gcm(
    plaintext: string,
    secretKeyHex?: string,
  ): { ciphertext: string; iv: string; tag: string } {
    const rawKey = secretKeyHex
      ? Buffer.from(secretKeyHex, 'hex')
      : crypto.createHash('sha256').update(process.env.ENCRYPTION_MASTER_KEY || 'clm-platform-default-master-encryption-key-32b').digest();

    const iv = crypto.randomBytes(12); // 96-bit IV standard for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', rawKey, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    return {
      ciphertext,
      iv: iv.toString('hex'),
      tag,
    };
  }

  /**
   * Decrypts AES-256-GCM authenticated ciphertext
   */
  decryptAes256Gcm(
    ciphertext: string,
    ivHex: string,
    tagHex: string,
    secretKeyHex?: string,
  ): string {
    const rawKey = secretKeyHex
      ? Buffer.from(secretKeyHex, 'hex')
      : crypto.createHash('sha256').update(process.env.ENCRYPTION_MASTER_KEY || 'clm-platform-default-master-encryption-key-32b').digest();

    const decipher = crypto.createDecipheriv('aes-256-gcm', rawKey, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}


