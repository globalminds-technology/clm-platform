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

  /**
   * Generates an X.509 PKCS#10 Certificate Signing Request (CSR) and private key pair
   * populated with tenant organizational metadata and Subject Alternative Names (SANs)
   */
  async generateCsrAndKey(options: {
    domain: string;
    sans?: string[];
    keyAlgorithm?: 'RSA_2048' | 'RSA_4096';
    organization?: string;
    organizationalUnit?: string;
    country?: string;
    state?: string;
    locality?: string;
    emailAddress?: string;
  }): Promise<{ privateKeyPem: string; publicKeyPem: string; csrPem: string }> {
    const forge = await import('node-forge');

    const keyBits = options.keyAlgorithm === 'RSA_4096' ? 4096 : 2048;

    // Generate Key Pair asynchronously
    const keyPair = await new Promise<any>((resolve, reject) => {
      forge.pki.rsa.generateKeyPair({ bits: keyBits, workers: -1 }, (err: any, keys: any) => {
        if (err) return reject(err);
        resolve(keys);
      });
    });

    // Create CSR
    const csr = forge.pki.createCertificationRequest();
    csr.publicKey = keyPair.publicKey;

    // Build Distinguished Name (DN) Subject Attributes
    const attrs = [
      { name: 'commonName', value: options.domain },
      { name: 'organizationName', value: options.organization || 'CLM Platform Customer' },
      { name: 'countryName', value: (options.country || 'US').substring(0, 2).toUpperCase() },
    ];

    if (options.organizationalUnit) {
      attrs.push({ name: 'organizationalUnitName', value: options.organizationalUnit });
    }
    if (options.state) {
      attrs.push({ name: 'stateOrProvinceName', value: options.state });
    }
    if (options.locality) {
      attrs.push({ name: 'localityName', value: options.locality });
    }
    if (options.emailAddress) {
      attrs.push({ name: 'emailAddress', value: options.emailAddress });
    }

    csr.setSubject(attrs);

    // Add Subject Alternative Names (SANs) extension
    const altNames = Array.from(new Set([options.domain, ...(options.sans || [])])).map(name => ({
      type: 2, // DNS name
      value: name,
    }));

    csr.setAttributes([
      {
        name: 'extensionRequest',
        extensions: [
          {
            name: 'subjectAltName',
            altNames,
          },
        ],
      },
    ]);

    // Sign the CSR using the newly generated private key with SHA-256
    csr.sign(keyPair.privateKey, forge.md.sha256.create());

    // Export to PEM strings
    const privateKeyPem = forge.pki.privateKeyToPem(keyPair.privateKey);
    const publicKeyPem = forge.pki.publicKeyToPem(keyPair.publicKey);
    const csrPem = forge.pki.certificationRequestToPem(csr);

    return {
      privateKeyPem,
      publicKeyPem,
      csrPem,
    };
  }
}



