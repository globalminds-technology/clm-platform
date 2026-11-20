export enum CertStatus {
  ACTIVE = 'ACTIVE',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
  PENDING_VALIDATION = 'PENDING_VALIDATION',
  PENDING_DEPLOYMENT = 'PENDING_DEPLOYMENT',
  RENEWAL_FAILED = 'RENEWAL_FAILED',
}

export enum KeyAlgorithm {
  RSA_2048 = 'RSA_2048',
  RSA_4096 = 'RSA_4096',
  ECDSA_P256 = 'ECDSA_P256',
  ECDSA_P384 = 'ECDSA_P384',
  ED25519 = 'ED25519',
}

export enum ValidationMethod {
  DNS_01 = 'DNS_01',
  HTTP_01 = 'HTTP_01',
  TLS_ALPN_01 = 'TLS_ALPN_01',
  MANUAL = 'MANUAL',
  EMAIL = 'EMAIL',
}

export enum CertificateTrackingMode {
  MONITORED = 'MONITORED', // External 3rd party domain (read-only TLS watchdog)
  MANAGED_CLOUD = 'MANAGED_CLOUD', // AWS ACM, CloudFront, Route53 zero-touch
  MANAGED_GATEWAY = 'MANAGED_GATEWAY', // Satellite Gateway on-prem / VM webserver
  PRIVATE_PKI = 'PRIVATE_PKI', // Internal service mesh / mTLS
}


