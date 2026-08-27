import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { FilesConfig } from '../../files.config.js';

@Injectable()
export class S3Adapter {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(config: FilesConfig) {
    this.bucket = config.s3Bucket;
    this.region = config.s3Region;

    this.s3 = new S3Client({
      region: config.s3Region,
      credentials: {
        accessKeyId: config.s3AccessKeyId,
        secretAccessKey: config.s3SecretAccessKey,
      },
    });
  }

  async uploadFile(key: string, buffer: Buffer, format: string) {
    const contentType = `image/${format}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  getUrl(key: string) {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
