import { Injectable } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { FilesConfig } from '../../files.config.js';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import ms from 'ms';

@Injectable()
export class S3Adapter {
  private readonly s3: S3Client;
  private readonly bucket: string;
  imageExpiresIn: number = ms('1h') / 1000;

  constructor(config: FilesConfig) {
    this.bucket = config.s3Bucket;

    this.s3 = new S3Client({
      region: config.s3Region,
      credentials: {
        accessKeyId: config.s3AccessKeyId,
        secretAccessKey: config.s3SecretAccessKey,
      },
    });
  }

  async uploadFIle(key: string, buffer: Buffer, contentType: string) {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async getUrl(key: string) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3, command, {
      expiresIn: this.imageExpiresIn,
    });
  }
}
