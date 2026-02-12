import * as crypto from 'crypto';
import { Readable } from 'stream';
import { Client as MinioClient, ItemBucketMetadata } from 'minio';
import { env } from '../../config/env';
import { createLogger } from './logger';

const logger = createLogger('minio');

// MinIO configuration
const minioConfig = {
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
};

// Public endpoint for presigned URLs (for agents outside Docker network)
const publicEndpoint = env.MINIO_PUBLIC_ENDPOINT || env.MINIO_ENDPOINT;
const publicPort = env.MINIO_PUBLIC_PORT || env.MINIO_PORT;

// Default bucket for patches
const DEFAULT_BUCKET = env.MINIO_BUCKET;

// Bucket organization structure
export const BUCKET_PREFIXES = {
  WINDOWS: 'windows',
  MACOS: 'macos',
  LINUX: 'linux',
  FIRMWARE: 'firmware',
  ENTERPRISE: 'enterprise',
  RUNTIME: 'runtime',
  SECURITY: 'security',
  BROWSER: 'browser',
  UTILITY: 'utility',
} as const;

export type BucketPrefix = (typeof BUCKET_PREFIXES)[keyof typeof BUCKET_PREFIXES];

export interface UploadOptions {
  bucket?: string;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  bucket: string;
  objectKey: string;
  etag: string;
  size: number;
  checksum: string;
  checksumType: string;
}

export interface PresignedUrlOptions {
  expirySeconds?: number;
  responseContentDisposition?: string;
}

export interface ObjectInfo {
  name: string;
  size: number;
  etag: string;
  lastModified: Date;
  metadata?: ItemBucketMetadata;
}

class MinioStorageService {
  private client: MinioClient | null = null;
  private initialized = false;

  /**
   * Initialize MinIO client and ensure bucket exists
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.client = new MinioClient(minioConfig);

      // Check if bucket exists, create if not
      const bucketExists = await this.client.bucketExists(DEFAULT_BUCKET);
      if (!bucketExists) {
        await this.client.makeBucket(DEFAULT_BUCKET, 'us-east-1');
        logger.info({ bucket: DEFAULT_BUCKET }, 'Created MinIO bucket');
      }

      this.initialized = true;
      logger.info({ endpoint: minioConfig.endPoint, port: minioConfig.port }, 'MinIO connected');
    } catch (error) {
      logger.error({ err: error }, 'MinIO failed to initialize');
      throw error;
    }
  }

  /**
   * Ensure a bucket exists, creating it if necessary
   */
  async ensureBucket(bucket: string): Promise<void> {
    const client = await this.getClient();
    const exists = await client.bucketExists(bucket);
    if (!exists) {
      await client.makeBucket(bucket, 'us-east-1');
    }
  }

  /**
   * Get the MinIO client (initializes if needed)
   */
  private async getClient(): Promise<MinioClient> {
    if (!this.client) {
      await this.initialize();
    }
    return this.client!;
  }

  /**
   * Generate object key path based on vendor and patch info
   * Format: {platform}/{vendor}/{product}/{version}/{filename}
   */
  generateObjectKey(
    platform: BucketPrefix,
    vendor: string,
    product: string,
    version: string,
    fileName: string
  ): string {
    const sanitize = (s: string) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9-_.]/g, '-')
        .replace(/-+/g, '-');

    return [
      platform,
      sanitize(vendor),
      sanitize(product),
      sanitize(version),
      fileName,
    ].join('/');
  }

  /**
   * Upload a file from a buffer
   */
  async uploadBuffer(
    objectKey: string,
    buffer: Buffer,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const client = await this.getClient();
    const bucket = options.bucket || DEFAULT_BUCKET;

    // Calculate SHA256 checksum
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    const checksum = hash.digest('hex');

    // Upload to MinIO
    const metadata: Record<string, string> = {
      'Content-Type': options.contentType || 'application/octet-stream',
      ...options.metadata,
    };

    const result = await client.putObject(bucket, objectKey, buffer, buffer.length, metadata);

    return {
      bucket,
      objectKey,
      etag: result.etag,
      size: buffer.length,
      checksum,
      checksumType: 'sha256',
    };
  }

  /**
   * Upload a file from a stream (for large files)
   */
  async uploadStream(
    objectKey: string,
    stream: Readable,
    size: number,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    const client = await this.getClient();
    const bucket = options.bucket || DEFAULT_BUCKET;

    // For streaming, we need to calculate checksum separately
    // This is done during the download process
    const metadata: Record<string, string> = {
      'Content-Type': options.contentType || 'application/octet-stream',
      ...options.metadata,
    };

    const result = await client.putObject(bucket, objectKey, stream, size, metadata);

    return {
      bucket,
      objectKey,
      etag: result.etag,
      size,
      checksum: '', // To be calculated separately
      checksumType: 'sha256',
    };
  }

  /**
   * Download a file to a buffer
   */
  async downloadBuffer(objectKey: string, bucket: string = DEFAULT_BUCKET): Promise<Buffer> {
    const client = await this.getClient();
    const stream = await client.getObject(bucket, objectKey);

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Get a download stream
   */
  async downloadStream(objectKey: string, bucket: string = DEFAULT_BUCKET): Promise<Readable> {
    const client = await this.getClient();
    return client.getObject(bucket, objectKey);
  }

  /**
   * Generate a presigned URL for download
   * Rewrites the internal MinIO endpoint to the public-facing endpoint
   * so agents and external devices can access files through nginx
   */
  async getPresignedUrl(
    objectKey: string,
    options: PresignedUrlOptions = {},
    bucket: string = DEFAULT_BUCKET
  ): Promise<string> {
    const client = await this.getClient();
    const expiry = options.expirySeconds || 3600; // Default 1 hour

    const requestParams: Record<string, string> = {};
    if (options.responseContentDisposition) {
      requestParams['response-content-disposition'] = options.responseContentDisposition;
    }

    let url = await client.presignedGetObject(bucket, objectKey, expiry, requestParams);

    // Replace internal MinIO endpoint with public endpoint (nginx reverse proxy)
    // This allows agents outside the Docker network to download via the public URL
    if (publicEndpoint !== env.MINIO_ENDPOINT || publicPort !== env.MINIO_PORT) {
      const useSSL = env.MINIO_USE_SSL;
      const internalOrigin = `http${useSSL ? 's' : ''}://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`;
      const externalOrigin = `http${useSSL ? 's' : ''}://${publicEndpoint}:${publicPort}`;
      url = url.replace(internalOrigin, externalOrigin);
    }

    return url;
  }

  /**
   * Generate a presigned URL for upload
   */
  async getPresignedUploadUrl(
    objectKey: string,
    expirySeconds: number = 3600,
    bucket: string = DEFAULT_BUCKET
  ): Promise<string> {
    const client = await this.getClient();
    return client.presignedPutObject(bucket, objectKey, expirySeconds);
  }

  /**
   * Check if an object exists
   */
  async objectExists(objectKey: string, bucket: string = DEFAULT_BUCKET): Promise<boolean> {
    const client = await this.getClient();
    try {
      await client.statObject(bucket, objectKey);
      return true;
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get object info/metadata
   */
  async getObjectInfo(objectKey: string, bucket: string = DEFAULT_BUCKET): Promise<ObjectInfo> {
    const client = await this.getClient();
    const stat = await client.statObject(bucket, objectKey);

    return {
      name: objectKey,
      size: stat.size,
      etag: stat.etag,
      lastModified: stat.lastModified,
      metadata: stat.metaData,
    };
  }

  /**
   * Delete an object
   */
  async deleteObject(objectKey: string, bucket: string = DEFAULT_BUCKET): Promise<void> {
    const client = await this.getClient();
    await client.removeObject(bucket, objectKey);
  }

  /**
   * List objects with a prefix
   */
  async listObjects(
    prefix: string,
    bucket: string = DEFAULT_BUCKET,
    recursive: boolean = true
  ): Promise<ObjectInfo[]> {
    const client = await this.getClient();
    const objects: ObjectInfo[] = [];

    const stream = client.listObjectsV2(bucket, prefix, recursive);

    for await (const obj of stream) {
      if (obj.name) {
        objects.push({
          name: obj.name,
          size: obj.size,
          etag: obj.etag,
          lastModified: obj.lastModified,
        });
      }
    }

    return objects;
  }

  /**
   * Copy an object within MinIO
   */
  async copyObject(
    sourceKey: string,
    destKey: string,
    sourceBucket: string = DEFAULT_BUCKET,
    destBucket: string = DEFAULT_BUCKET
  ): Promise<void> {
    const client = await this.getClient();
    const conditions = new (await import('minio')).CopyConditions();
    await client.copyObject(
      destBucket,
      destKey,
      `/${sourceBucket}/${sourceKey}`,
      conditions
    );
  }

  /**
   * Get bucket statistics
   */
  async getBucketStats(bucket: string = DEFAULT_BUCKET): Promise<{
    objectCount: number;
    totalSize: number;
  }> {
    const objects = await this.listObjects('', bucket);
    return {
      objectCount: objects.length,
      totalSize: objects.reduce((sum, obj) => sum + obj.size, 0),
    };
  }

  /**
   * Calculate checksum for a stream (utility function)
   */
  static calculateChecksum(buffer: Buffer, algorithm: string = 'sha256'): string {
    const hash = crypto.createHash(algorithm);
    hash.update(buffer);
    return hash.digest('hex');
  }
}

// Export singleton instance
export const minioStorage = new MinioStorageService();

// Export class for testing
export { MinioStorageService };
