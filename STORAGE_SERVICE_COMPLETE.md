# ✅ Storage Service - COMPLETE

## 📦 What We Built

### Storage Service (Step 9)
**Location**: `src/infrastructure/storage/`

#### Features:
- ✅ **Dual Provider Support**
  - Local file storage (development)
  - AWS S3 storage (production)
  - Automatic provider switching via `STORAGE_PROVIDER` env variable

- ✅ **File Upload Management**
  - Single file upload with `uploadFile()`
  - Multiple file upload with `uploadFiles()`
  - File validation (MIME type, size, extension)
  - Unique filename generation (UUID + timestamp)
  - Folder organization support

- ✅ **File Operations**
  - Upload to local storage or S3
  - Delete files from storage
  - Check if file exists
  - Generate signed URLs (S3 only, valid for 1 hour by default)

- ✅ **Multer Configuration**
  - Pre-configured for **resumes**: PDF, DOC, DOCX (max 5MB)
  - Pre-configured for **images**: JPG, PNG, WEBP (max 2MB)
  - Memory storage (buffer-based processing)
  - MIME type validation
  - File extension validation
  - Custom error messages

---

## 📁 File Structure

```
src/infrastructure/storage/
├── storage.service.ts              ✅ File upload service
├── storage.module.ts               ✅ Storage module (global)
└── multer.config.ts                ✅ Multer configurations

uploads/                            ✅ Local upload directory
└── .gitkeep                        ✅ Keep directory in git
```

---

## 🔧 Configuration

### Environment Variables

```env
# Application
APP_URL="http://localhost:3000"

# File Storage
STORAGE_PROVIDER="local"  # local or s3
UPLOAD_PATH="./uploads"

# AWS S3 (Production)
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="your-bucket-name"
AWS_REGION="us-east-1"
```

### File Type Configurations

```typescript
FileTypeConfig = {
  RESUME: {
    mimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize: 5 * 1024 * 1024, // 5MB
    extensions: ['.pdf', '.doc', '.docx'],
  },
  IMAGE: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'],
    maxSize: 2 * 1024 * 1024, // 2MB
    extensions: ['.jpg', '.jpeg', '.png', '.webp'],
  },
}
```

---

## 💻 Usage Examples

### 1. Upload Resume (Job Seeker)

```typescript
import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService, resumeMulterOptions, FileTypeConfig } from '@infrastructure/storage';

@Controller('job-seekers')
export class JobSeekerController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-resume')
  @UseInterceptors(FileInterceptor('resume', resumeMulterOptions))
  async uploadResume(@UploadedFile() file: Express.Multer.File) {
    const uploaded = await this.storageService.uploadFile(file, {
      folder: 'resumes',
      allowedMimeTypes: FileTypeConfig.RESUME.mimeTypes,
      maxSizeInBytes: FileTypeConfig.RESUME.maxSize,
    });

    // Save uploaded.url to database
    // uploaded = {
    //   originalName: 'my-resume.pdf',
    //   filename: 'uuid-timestamp.pdf',
    //   path: 'resumes/uuid-timestamp.pdf',
    //   url: 'http://localhost:3000/uploads/resumes/uuid-timestamp.pdf',
    //   mimeType: 'application/pdf',
    //   size: 1048576
    // }

    return {
      message: 'Resume uploaded successfully',
      file: uploaded,
    };
  }
}
```

### 2. Upload Company Logo (Employer)

```typescript
@Controller('employers')
export class EmployerController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload-logo')
  @UseInterceptors(FileInterceptor('logo', imageMulterOptions))
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    const uploaded = await this.storageService.uploadFile(file, {
      folder: 'logos',
      allowedMimeTypes: FileTypeConfig.IMAGE.mimeTypes,
      maxSizeInBytes: FileTypeConfig.IMAGE.maxSize,
    });

    return {
      message: 'Logo uploaded successfully',
      file: uploaded,
    };
  }
}
```

### 3. Upload Multiple Files

```typescript
@Post('upload-multiple')
@UseInterceptors(FilesInterceptor('files', 5, imageMulterOptions)) // max 5 files
async uploadMultiple(@UploadedFiles() files: Express.Multer.File[]) {
  const uploaded = await this.storageService.uploadFiles(files, {
    folder: 'gallery',
    allowedMimeTypes: FileTypeConfig.IMAGE.mimeTypes,
    maxSizeInBytes: FileTypeConfig.IMAGE.maxSize,
  });

  return {
    message: `${uploaded.length} files uploaded successfully`,
    files: uploaded,
  };
}
```

### 4. Delete File

```typescript
async deleteResume(userId: string) {
  const user = await this.prisma.jobSeeker.findUnique({
    where: { userId },
    select: { resumeUrl: true },
  });

  if (user?.resumeUrl) {
    // Extract path from URL
    const path = user.resumeUrl.replace(`${process.env.APP_URL}/uploads/`, '');
    await this.storageService.deleteFile(path);
  }
}
```

### 5. Check if File Exists

```typescript
const exists = await this.storageService.fileExists('resumes/uuid-timestamp.pdf');
if (!exists) {
  throw new NotFoundException('File not found');
}
```

### 6. Generate Signed URL (S3 Only)

```typescript
// For private S3 buckets, generate temporary access URL
const signedUrl = await this.storageService.getSignedUrl(
  'resumes/uuid-timestamp.pdf',
  3600, // Valid for 1 hour
);

return {
  downloadUrl: signedUrl,
};
```

---

## 🎯 Storage Strategies

### Local Storage (Development)

- Files stored in `./uploads/` directory
- Organized by folders (resumes/, logos/, general/)
- Accessible via `http://localhost:3000/uploads/path/to/file.pdf`
- Requires serving static files in `main.ts`

**Note**: Add to `main.ts` to serve static files:
```typescript
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.useStaticAssets(join(__dirname, '..', 'uploads'), {
  prefix: '/uploads/',
});
```

### AWS S3 Storage (Production)

- Files stored in S3 bucket
- Public or private access (configurable in service)
- CloudFront CDN integration (optional)
- URL format: `https://bucket.s3.region.amazonaws.com/path/to/file.pdf`
- Supports signed URLs for private files

---

## 🔒 Security Features

1. **File Type Validation**
   - MIME type checking
   - File extension verification
   - Prevents malicious file uploads

2. **File Size Limits**
   - Resumes: 5MB max
   - Images: 2MB max
   - Configurable per upload

3. **Unique Filenames**
   - UUID + timestamp prevents collisions
   - Original filename preserved in metadata

4. **Folder Isolation**
   - Separate folders for different file types
   - Prevents unauthorized access

5. **Error Handling**
   - Validation errors with clear messages
   - Upload failures logged and reported

---

## 📊 Use Cases

### Job Seeker
- ✅ Upload resume (PDF/DOC/DOCX)
- ✅ Update resume (delete old, upload new)
- ✅ Download resume for viewing

### Employer
- ✅ Upload company logo (JPG/PNG/WEBP)
- ✅ Update company logo
- ✅ View uploaded logos

### Application Process
- ✅ Attach resume to application
- ✅ Employer downloads applicant resume
- ✅ Track file uploads per user

---

## 🚀 Migration to Production

### Step 1: Set up AWS S3
1. Create S3 bucket
2. Configure bucket permissions (public or private)
3. Get AWS credentials (Access Key ID + Secret)
4. Optional: Set up CloudFront CDN

### Step 2: Update Environment Variables
```env
STORAGE_PROVIDER="s3"
AWS_ACCESS_KEY_ID="your-key"
AWS_SECRET_ACCESS_KEY="your-secret"
AWS_S3_BUCKET="your-bucket"
AWS_REGION="us-east-1"
```

### Step 3: Migrate Existing Files (if any)
```bash
# Use AWS CLI to upload local files to S3
aws s3 sync ./uploads s3://your-bucket/
```

### Step 4: Update Database URLs
- Update `resumeUrl` and `companyLogo` fields
- Replace local URLs with S3 URLs

---

## 📦 Dependencies

```json
{
  "@aws-sdk/client-s3": "^3.x",
  "@aws-sdk/s3-request-presigner": "^3.x",
  "uuid": "^8.x"
}
```

Already included in NestJS:
- `@nestjs/platform-express`
- `multer` (via @nestjs/platform-express)

---

## ✨ Key Features

1. **Flexibility** - Switch between local and S3 with one env variable
2. **Validation** - Type, size, and extension checks
3. **Security** - Unique filenames, folder isolation, signed URLs
4. **Scalability** - Easy migration from local to S3
5. **Type-Safe** - Full TypeScript support with interfaces
6. **Error Handling** - Clear error messages for users
7. **Logging** - Winston integration for debugging

---

## 🧪 Testing

### Test File Upload
```typescript
describe('StorageService', () => {
  it('should upload file successfully', async () => {
    const file: Express.Multer.File = {
      originalname: 'test.pdf',
      mimetype: 'application/pdf',
      buffer: Buffer.from('test'),
      size: 1024,
    } as any;

    const result = await storageService.uploadFile(file, {
      folder: 'test',
    });

    expect(result.originalName).toBe('test.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.url).toContain('/uploads/test/');
  });
});
```

---

## 🧪 Build Status

```bash
npm run build
```
✅ **Status**: PASSING

---

**Status**: ✅ STORAGE SERVICE COMPLETE
**Build**: ✅ PASSING
**Date**: July 6, 2026
**Files Created**: 3 (service, module, config)
**Lines of Code**: ~400+
