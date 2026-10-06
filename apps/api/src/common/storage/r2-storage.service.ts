import { Readable } from 'node:stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import type { R2Config } from '../../config/configuration.js';
import { ApiException } from '../exceptions/api.exception.js';
import { StorageService } from './storage.service.js';

/**
 * Cloudflare R2 implementation of {@link StorageService} (S3-compatible API),
 * selected only when `STORAGE_PROVIDER=r2`. The provider is kept behind the
 * storage abstraction so catalogue services never depend on the SDK directly.
 */
export class R2StorageService extends StorageService {
  readonly provider = 'r2' as const;

  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicHost?: string;

  constructor(config: R2Config) {
    super();
    if (!config.accountId || !config.accessKeyId || !config.secretAccessKey || !config.bucket) {
      throw new Error(
        'R2StorageService requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET',
      );
    }
    this.bucket = config.bucket;
    this.publicHost = config.publicHost || undefined;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(key: string, data: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
  }

  async get(key: string): Promise<Readable> {
    const output = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!output.Body) {
      throw ApiException.notFound('Stored object not found');
    }
    if (output.Body instanceof Readable) {
      return output.Body;
    }
    const body = output.Body as unknown as {
      transformToWebStream: () => WebReadableStream;
    };
    return Readable.fromWeb(body.transformToWebStream() as unknown as WebReadableStream);
  }

  async remove(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  publicUrl(key: string): string | null {
    if (!this.publicHost) return null;
    return `https://${this.publicHost}/${key}`;
  }
}