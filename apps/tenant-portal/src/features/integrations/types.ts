import { CaProvider } from '@clm/shared-types';

export type IntegrationCategory = 'PUBLIC_CA' | 'ACME' | 'PRIVATE_CLOUD';

export interface ProviderCatalogItem {
  provider: CaProvider;
  name: string;
  category: IntegrationCategory;
  categoryLabel: string;
  tagline: string;
  brandColor: string;
  brandBg: string;
  logoType: string;
  docsUrl?: string;
}

export const CATALOG_PROVIDERS: ProviderCatalogItem[] = [
  // 1. Public CAs
  {
    provider: CaProvider.DIGICERT,
    name: 'DigiCert',
    category: 'PUBLIC_CA',
    categoryLabel: 'Public CA Integrations',
    tagline: 'CertCentral API automation for enterprise TLS, OV, & EV certificates',
    brandColor: '#0066CC',
    brandBg: '#EBF4FE',
    logoType: 'digicert',
  },
  {
    provider: CaProvider.SECTIGO,
    name: 'Sectigo',
    category: 'PUBLIC_CA',
    categoryLabel: 'Public CA Integrations',
    tagline: 'Sectigo Certificate Manager (SCM) REST automation',
    brandColor: '#26B573',
    brandBg: '#EDFAF3',
    logoType: 'sectigo',
  },
  {
    provider: CaProvider.GLOBALSIGN,
    name: 'GlobalSign',
    category: 'PUBLIC_CA',
    categoryLabel: 'Public CA Integrations',
    tagline: 'Atlas & MSSL cloud CA for automated domain validation',
    brandColor: '#003366',
    brandBg: '#E6EFF7',
    logoType: 'globalsign',
  },
  {
    provider: CaProvider.GODADDY,
    name: 'GoDaddy',
    category: 'PUBLIC_CA',
    categoryLabel: 'Public CA Integrations',
    tagline: 'GoDaddy Developer API for automated standard & wildcard SSL',
    brandColor: '#00A6A6',
    brandBg: '#E6F7F7',
    logoType: 'godaddy',
  },
  {
    provider: CaProvider.THE_SSL_STORE,
    name: 'The SSL Store',
    category: 'PUBLIC_CA',
    categoryLabel: 'Public CA Integrations',
    tagline: 'Wholesale multi-vendor certificate provisioner & partner API',
    brandColor: '#2B3890',
    brandBg: '#ECEEFB',
    logoType: 'sslstore',
  },
  {
    provider: CaProvider.EMSIGN,
    name: 'emSign',
    category: 'PUBLIC_CA',
    categoryLabel: 'Public CA Integrations',
    tagline: 'eMudhra global trust services and enterprise PKI APIs',
    brandColor: '#6A1B9A',
    brandBg: '#F3E5F5',
    logoType: 'emsign',
  },

  // 2. ACME Integrations
  {
    provider: CaProvider.LETS_ENCRYPT,
    name: "Let's Encrypt",
    category: 'ACME',
    categoryLabel: 'ACME Integrations',
    tagline: 'Automated RFC 8555 DV certificates with optional EAB',
    brandColor: '#E77E23',
    brandBg: '#FEF4EB',
    logoType: 'letsencrypt',
  },
  {
    provider: CaProvider.ZEROSSL,
    name: 'ZeroSSL',
    category: 'ACME',
    categoryLabel: 'ACME Integrations',
    tagline: 'Zero-config ACME & REST issuing with External Account Binding',
    brandColor: '#0084FF',
    brandBg: '#E6F3FF',
    logoType: 'zerossl',
  },
  {
    provider: CaProvider.BUYPASS,
    name: 'Buypass Go SSL',
    category: 'ACME',
    categoryLabel: 'ACME Integrations',
    tagline: 'European Qualified Trust Service Provider (eIDAS compliant ACME)',
    brandColor: '#0072CE',
    brandBg: '#E5F1FA',
    logoType: 'buypass',
  },
  {
    provider: CaProvider.TELIA,
    name: 'Telia',
    category: 'ACME',
    categoryLabel: 'ACME Integrations',
    tagline: 'Nordic enterprise ACME authority for automated server certificates',
    brandColor: '#990099',
    brandBg: '#F8E6F8',
    logoType: 'telia',
  },
  {
    provider: CaProvider.CUSTOM_ACME,
    name: 'New ACME (Custom)',
    category: 'ACME',
    categoryLabel: 'ACME Integrations',
    tagline: 'Connect any RFC 8555 directory URL (Step-CA, Smallstep, Boulder)',
    brandColor: '#475569',
    brandBg: '#F1F5F9',
    logoType: 'custom_acme',
  },

  // 3. Private, Cloud & Enterprise PKI
  {
    provider: CaProvider.MSCA,
    name: 'MSCA',
    category: 'PRIVATE_CLOUD',
    categoryLabel: 'Others',
    tagline: 'Microsoft Active Directory Certificate Services (AD CS / NDES / SCEP)',
    brandColor: '#0078D4',
    brandBg: '#E5F2FB',
    logoType: 'msca',
  },
  {
    provider: CaProvider.AWS_PCA,
    name: 'AWS',
    category: 'PRIVATE_CLOUD',
    categoryLabel: 'Others',
    tagline: 'AWS Private Certificate Authority (ACM-PCA) & IAM integration',
    brandColor: '#FF9900',
    brandBg: '#FFF5E6',
    logoType: 'aws',
  },
  {
    provider: CaProvider.AZURE_KEYVAULT,
    name: 'Azure',
    category: 'PRIVATE_CLOUD',
    categoryLabel: 'Others',
    tagline: 'Azure Key Vault Managed Certificate Authority & Secrets integration',
    brandColor: '#0089D6',
    brandBg: '#E6F3FB',
    logoType: 'azure',
  },
  {
    provider: CaProvider.VAULT,
    name: 'HashiCorp Vault',
    category: 'PRIVATE_CLOUD',
    categoryLabel: 'Others',
    tagline: 'Vault PKI Secrets Engine for high-speed dynamic mTLS & ephemeral certs',
    brandColor: '#000000',
    brandBg: '#F3F4F6',
    logoType: 'vault',
  },
  {
    provider: CaProvider.KUBERNETES,
    name: 'Kubernetes',
    category: 'PRIVATE_CLOUD',
    categoryLabel: 'Others',
    tagline: 'cert-manager Ingress Controller & K8s ClusterIssuer synchronization',
    brandColor: '#326CE5',
    brandBg: '#EAF0FC',
    logoType: 'kubernetes',
  },
];
