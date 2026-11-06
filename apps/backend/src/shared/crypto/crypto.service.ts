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
}

