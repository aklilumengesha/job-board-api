import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { LoggerService } from '../../core/logger/logger.service';

export interface UploadOptions {
  allowedMimeTypes?: string[];
  maxSizeInBytes?: number;
  folder?: string;
}

export interface UploadedFile {
  originalName: string;
  filename: string;
  path: string;
  url: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class StorageService {
  private readonly storageProvider: 'local' | 's3';
  private readonly localUploadPath: string;
  private readonly s3Client?: S3Client;
  private readonly s3BucketName?: string;
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.storageProvider = this.configService.get<'local' | 's3'>('STORAGE_PROVIDER', 'local');
    this.localUploadPath = this.configService.get<string>('UPLOAD_PATH', './uploads');
    this.baseUrl = this.configService.get<string>('APP_URL', 'http://localhost:3001');

    // Initialize S3 if provider is S3
    if (this.storageProvider === 's3') {
      const region = this.configService.get<string>('AWS_REGION');
      const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
      const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
      this.s3BucketName = this.configService.get<string>('AWS_S3_BUCKET');

      if (!region || !accessKeyId || !secretAccessKey || !this.s3BucketName) {
        this.logger.error('AWS S3 credentials not configured properly', 'StorageService');
        throw new Error('AWS S3 credentials missing');
      }

      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });

      this.logger.log('S3 Storage initialized', 'StorageService');
    } else {
      this.logger.log('Local Storage initialized', 'StorageService');
      this.ensureUploadDirectory();
    }
  }

  /**
   * Upload a file to storage (local or S3)
   */
  async uploadFile(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadedFile> {
    // Validate file
    this.validateFile(file, options);

    // Generate unique filename
    const filename = this.generateFilename(file.originalname);
    const folder = options.folder || 'general';

    try {
      if (this.storageProvider === 's3') {
        return await this.uploadToS3(file, filename, folder);
      } else {
        return await this.uploadToLocal(file, filename, folder);
      }
    } catch (error) {
      this.logger.error(`File upload failed: ${error.message}`, error.stack, 'StorageService');
      throw new InternalServerErrorException('File upload failed');
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: Express.Multer.File[],
    options: UploadOptions = {},
  ): Promise<UploadedFile[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, options));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      if (this.storageProvider === 's3') {
        await this.deleteFromS3(filePath);
      } else {
        await this.deleteFromLocal(filePath);
      }
      this.logger.log(`File deleted: ${filePath}`, 'StorageService');
    } catch (error) {
      this.logger.error(`File deletion failed: ${error.message}`, error.stack, 'StorageService');
      throw new InternalServerErrorException('File deletion failed');
    }
  }

  /**
   * Get signed URL for private S3 files (valid for 1 hour)
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    if (this.storageProvider !== 's3') {
      throw new BadRequestException('Signed URLs only available for S3 storage');
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.s3BucketName,
        Key: filePath,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(`Failed to generate signed URL: ${error.message}`, error.stack, 'StorageService');
      throw new InternalServerErrorException('Failed to generate signed URL');
    }
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      if (this.storageProvider === 's3') {
        const command = new GetObjectCommand({
          Bucket: this.s3BucketName,
          Key: filePath,
        });
        await this.s3Client.send(command);
        return true;
      } else {
        const fullPath = path.join(this.localUploadPath, filePath);
        await fs.access(fullPath);
        return true;
      }
    } catch {
      return false;
    }
  }

  /**
   * Validate file against options
   */
  private validateFile(file: Express.Multer.File, options: UploadOptions): void {
    // Check mime type
    if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${options.allowedMimeTypes.join(', ')}`,
      );
    }

    // Check file size
    if (options.maxSizeInBytes && file.size > options.maxSizeInBytes) {
      const maxSizeMB = (options.maxSizeInBytes / (1024 * 1024)).toFixed(2);
      throw new BadRequestException(`File size exceeds maximum allowed size of ${maxSizeMB}MB`);
    }

    // Check for file existence
    if (!file.buffer && !file.path) {
      throw new BadRequestException('Invalid file data');
    }
  }

  /**
   * Generate unique filename
   */
  private generateFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const uuid = uuidv4();
    return `${uuid}-${timestamp}${ext}`;
  }

  /**
   * Upload file to local storage
   */
  private async uploadToLocal(
    file: Express.Multer.File,
    filename: string,
    folder: string,
  ): Promise<UploadedFile> {
    const folderPath = path.join(this.localUploadPath, folder);
    await this.ensureDirectory(folderPath);

    const filePath = path.join(folderPath, filename);
    const relativePath = path.join(folder, filename).replace(/\\/g, '/');

    // Write file to disk
    await fs.writeFile(filePath, file.buffer);

    return {
      originalName: file.originalname,
      filename,
      path: relativePath,
      url: `${this.baseUrl}/uploads/${relativePath}`,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Upload file to AWS S3
   */
  private async uploadToS3(
    file: Express.Multer.File,
    filename: string,
    folder: string,
  ): Promise<UploadedFile> {
    const key = `${folder}/${filename}`;

    const command = new PutObjectCommand({
      Bucket: this.s3BucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read', // Make files publicly accessible (change if needed)
    });

    await this.s3Client.send(command);

    const url = `https://${this.s3BucketName}.s3.${this.configService.get('AWS_REGION')}.amazonaws.com/${key}`;

    return {
      originalName: file.originalname,
      filename,
      path: key,
      url,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  /**
   * Delete file from local storage
   */
  private async deleteFromLocal(filePath: string): Promise<void> {
    const fullPath = path.join(this.localUploadPath, filePath);
    await fs.unlink(fullPath);
  }

  /**
   * Delete file from S3
   */
  private async deleteFromS3(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.s3BucketName,
      Key: key,
    });
    await this.s3Client.send(command);
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDirectory(): Promise<void> {
    await this.ensureDirectory(this.localUploadPath);
    this.logger.log(`Upload directory ensured: ${this.localUploadPath}`, 'StorageService');
  }
}
