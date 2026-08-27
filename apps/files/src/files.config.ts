import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FilesConfig {
  readonly port: number;
  readonly mongodbUri: string;
  readonly s3Region: string;
  readonly s3Bucket: string;
  readonly s3AccessKeyId: string;
  readonly s3SecretAccessKey: string;
  readonly s3Endpoint?: string;
  readonly s3ForcePathStyle: boolean;
  readonly rabbitMqUrl: string;
  readonly rabbitMqMainToFilesQueue: string;
  readonly rabbitMqFilesToMainQueue: string;

  constructor(configService: ConfigService) {
    this.port = configService.getOrThrow<number>('PORT');
    this.mongodbUri = configService.getOrThrow<string>('MONGODB_URI');
    this.s3Region = configService.getOrThrow<string>('S3_REGION');
    this.s3Bucket = configService.getOrThrow<string>('S3_BUCKET');
    this.s3AccessKeyId = configService.getOrThrow<string>('S3_ACCESS_KEY_ID');
    this.s3SecretAccessKey = configService.getOrThrow<string>(
      'S3_SECRET_ACCESS_KEY',
    );
    this.s3Endpoint = configService.get<string>('S3_ENDPOINT');
    this.s3ForcePathStyle = configService.getOrThrow<boolean>(
      'S3_FORCE_PATH_STYLE',
    );
    this.rabbitMqUrl = configService.getOrThrow<string>('RABBITMQ_URL');
    this.rabbitMqMainToFilesQueue = configService.getOrThrow<string>(
      'RABBITMQ_MAIN_TO_FILES_QUEUE',
    );
    this.rabbitMqFilesToMainQueue = configService.getOrThrow<string>(
      'RABBITMQ_FILES_TO_MAIN_QUEUE',
    );
  }
}
