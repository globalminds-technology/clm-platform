import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client | null = null;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME', 'clm');
    this.publicUrl = (this.configService.get<string>('R2_PUBLIC_URL') || '').replace(/\/+$/, '');

    if (accountId && accessKeyId && secretAccessKey) {
      this.s3Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });
      this.logger.log(`Cloudflare R2 Storage initialized for bucket '${this.bucketName}'`);
    } else {
      this.logger.warn('Cloudflare R2 credentials not fully configured. Object storage is disabled.');
    }
  }

  isConfigured(): boolean {
    return this.s3Client !== null;
  }

  async testConnection(): Promise<boolean> {
    if (!this.s3Client) return false;
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      return true;
    } catch (err: any) {
      this.logger.error(`Cloudflare R2 connection test failed: ${err.message}`);
      return false;
    }
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
    if (!this.s3Client) {
      throw new Error('Cloudflare R2 is not configured.');
    }

    const cleanKey = key.replace(/^\/+/, '');
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: cleanKey,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return this.getPublicUrl(cleanKey);
  }

  async uploadBase64(
    keyPrefix: string,
    base64Data: string,
  ): Promise<{ url: string; key: string }> {
    let contentType = 'image/png';
    let rawBase64 = base64Data;
    let ext = 'png';

    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (match && match[1] && match[2]) {
      contentType = match[1];
      rawBase64 = match[2];
      const sub = contentType.split('/')[1];
      if (sub) ext = sub.replace('svg+xml', 'svg');
    }

    const buffer = Buffer.from(rawBase64, 'base64');
    const timestamp = Date.now();
    const cleanPrefix = keyPrefix.replace(/\/+$/, '');
    const key = `${cleanPrefix}-${timestamp}.${ext}`;

    const url = await this.uploadBuffer(key, buffer, contentType);
    return { url, key };
  }

  async deleteObject(key: string): Promise<void> {
    if (!this.s3Client) return;
    try {
      const cleanKey = key.replace(/^\/+/, '');
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: cleanKey,
        }),
      );
    } catch (err: any) {
      this.logger.warn(`Failed to delete object from R2 (${key}): ${err.message}`);
    }
  }

  getPublicUrl(key: string): string {
    const cleanKey = key.replace(/^\/+/, '');
    if (this.publicUrl) {
      return `${this.publicUrl}/${cleanKey}`;
    }
    return `https://${this.bucketName}.r2.cloudflarestorage.com/${cleanKey}`;
  }
}
