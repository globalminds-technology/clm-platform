import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaProvider, type CreateCaIntegrationRequest } from '@clm/shared-types';

export class CreateCaIntegrationDto implements CreateCaIntegrationRequest {
  @ApiProperty({ enum: CaProvider, example: CaProvider.DIGICERT })
  @IsEnum(CaProvider)
  @IsNotEmpty()
  provider!: CaProvider;

  @ApiProperty({ example: 'Corporate CertCentral Master' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'security@fintechglobal.com' })
  @IsString()
  @IsOptional()
  accountEmail?: string;

  @ApiPropertyOptional({ example: 'eab_key_id_12345' })
  @IsString()
  @IsOptional()
  externalAccountBindingId?: string;

  @ApiPropertyOptional({ example: 'eab_hmac_secret_base64' })
  @IsString()
  @IsOptional()
  eabHmacKey?: string;

  @ApiPropertyOptional({ example: 'https://acme.zerossl.com/v2/DV90' })
  @IsString()
  @IsOptional()
  acmeDirectoryUrl?: string;

  @ApiPropertyOptional({ example: 'X-DC-DEVKEY-89417284910248' })
  @IsString()
  @IsOptional()
  digicertApiKey?: string;

  @ApiPropertyOptional({ example: '12345' })
  @IsString()
  @IsOptional()
  digicertContainerId?: string;

  @ApiPropertyOptional({ example: 'sectigo_admin_user' })
  @IsString()
  @IsOptional()
  sectigoUsername?: string;

  @ApiPropertyOptional({ example: 'sectigo_secure_pass_or_token' })
  @IsString()
  @IsOptional()
  sectigoPassword?: string;

  @ApiPropertyOptional({ example: 'customer_uri_code' })
  @IsString()
  @IsOptional()
  sectigoCustomerUri?: string;

  @ApiPropertyOptional({ example: 'api_key_or_client_id' })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ example: 'api_secret_key' })
  @IsString()
  @IsOptional()
  apiSecret?: string;

  @ApiPropertyOptional({ example: 'arn:aws:acm-pca:us-east-1:123456789012:certificate-authority/12345678-1234-1234-1234-123456789012' })
  @IsString()
  @IsOptional()
  awsPcaArn?: string;

  @ApiPropertyOptional({ example: '4a2b9c8d-1e7f-0a3b-5c7d-e3b0c44298fc' })
  @IsString()
  @IsOptional()
  awsCloudAccountId?: string;

  @ApiPropertyOptional({ example: 'https://vault.azure.net' })
  @IsString()
  @IsOptional()
  azureVaultUri?: string;

  @ApiPropertyOptional({ example: 'azure-tenant-id-uuid' })
  @IsString()
  @IsOptional()
  azureTenantId?: string;

  @ApiPropertyOptional({ example: 'azure-client-id-uuid' })
  @IsString()
  @IsOptional()
  azureClientId?: string;

  @ApiPropertyOptional({ example: 'azure-client-secret-val' })
  @IsString()
  @IsOptional()
  azureClientSecret?: string;

  @ApiPropertyOptional({ example: 'https://vault.internal:8200' })
  @IsString()
  @IsOptional()
  vaultAddress?: string;

  @ApiPropertyOptional({ example: 's.abcdef123456' })
  @IsString()
  @IsOptional()
  vaultToken?: string;

  @ApiPropertyOptional({ example: 'https://ca.corp.internal/certsrv' })
  @IsString()
  @IsOptional()
  mscaServerUrl?: string;

  @ApiPropertyOptional({ example: 'WebServerEnterpriseTemplate' })
  @IsString()
  @IsOptional()
  mscaTemplateName?: string;

  @ApiPropertyOptional({ example: 'https://k8s.internal:6443' })
  @IsString()
  @IsOptional()
  k8sClusterUrl?: string;

  @ApiPropertyOptional({ example: 'cert-manager' })
  @IsString()
  @IsOptional()
  k8sNamespace?: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}
