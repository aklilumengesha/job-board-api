import { BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

/**
 * Multer configuration for file uploads
 * Uses memory storage to keep files in buffer for processing
 */

// File type configurations
export const FileTypeConfig = {
  RESUME: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSize: 5 * 1024 * 1024, // 5MB
    extensions: ['.pdf', '.doc', '.docx'],
  },
  IMAGE: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    maxSize: 2 * 1024 * 1024, // 2MB
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
};

/**
 * Create multer configuration for specific file type
 */
export function createMulterOptions(fileType: keyof typeof FileTypeConfig): MulterOptions {
  const config = FileTypeConfig[fileType];

  return {
    storage: memoryStorage(),
    limits: {
      fileSize: config.maxSize,
    },
    fileFilter: (req, file, callback) => {
      // Check mime type
      if (!config.mimeTypes.includes(file.mimetype)) {
        return callback(
          new BadRequestException(
            `Invalid file type. Allowed types: ${config.extensions.join(', ')}`,
          ),
          false,
        );
      }

      // Check file extension
      const hasValidExtension = config.extensions.some(ext =>
        file.originalname.toLowerCase().endsWith(ext),
      );

      if (!hasValidExtension) {
        return callback(
          new BadRequestException(
            `Invalid file extension. Allowed extensions: ${config.extensions.join(', ')}`,
          ),
          false,
        );
      }

      callback(null, true);
    },
  };
}

/**
 * Pre-configured multer options for resumes
 */
export const resumeMulterOptions = createMulterOptions('RESUME');

/**
 * Pre-configured multer options for images
 */
export const imageMulterOptions = createMulterOptions('IMAGE');
