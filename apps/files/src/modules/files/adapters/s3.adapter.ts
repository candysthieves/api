import { Injectable } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { FilesConfig } from '../../../files.config.js';

@Injectable()
export class S3Adapter {
  private readonly s3: S3Client;
  private readonly bucket: string;

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
}
