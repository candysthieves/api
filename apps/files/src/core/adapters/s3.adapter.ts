import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  paginateListObjectsV2,
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

  async listObjects(
    prefix: string,
  ): Promise<Array<{ key: string; lastModified?: Date }>> {
    const paginator = paginateListObjectsV2(
      { client: this.s3 },
      { Bucket: this.bucket, Prefix: prefix },
    );
    const objects: Array<{ key: string; lastModified?: Date }> = [];
    for await (const page of paginator) {
      if (page.Contents) {
        for (const item of page.Contents) {
          if (item.Key) {
            objects.push({
              key: item.Key,
              lastModified: item.LastModified,
            });
          }
        }
      }
    }
    return objects;
  }

  getUrl(key: string) {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
