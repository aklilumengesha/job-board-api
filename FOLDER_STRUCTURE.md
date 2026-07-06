# Job Board API - Folder Structure (Clean Architecture)

## 📁 Complete Directory Structure

```
job-board-api/
├── src/                              # Source code
│   │
│   ├── common/                       # Shared utilities (no business logic)
│   │   ├── decorators/               # Custom decorators (@CurrentUser, @Public, etc.)
│   │   ├── filters/                  # Exception filters (HttpExceptionFilter)
│   │   ├── guards/                   # Common guards (RolesGuard, ThrottlerGuard)
│   │   ├── interceptors/             # Interceptors (LoggingInterceptor, TransformInterceptor)
│   │   ├── pipes/                    # Validation pipes (ValidationPipe, ParseUUIDPipe)
│   │   ├── dto/                      # Common DTOs (PaginationDto, ResponseDto)
│   │   ├── enums/                    # Shared enums (UserRole, Status)
│   │   ├── helpers/                  # Helper functions
│   │   └── utils/                    # Utility functions
│   │
│   ├── core/                         # Framework & app core
│   │   ├── config/                   # Configuration (app.config, jwt.config, etc.)
│   │   ├── prisma/                   # Prisma service & module
│   │   ├── database/                 # Database utilities
│   │   ├── logger/                   # Winston logger service
│   │   └── exceptions/               # Custom exceptions
│   │
│   ├── infrastructure/               # External services & integrations
│   │   ├── email/                    # Email service
│   │   │   ├── templates/            # Email templates (Handlebars)
│   │   │   ├── email.service.ts
│   │   │   └── email.module.ts
│   │   ├── storage/                  # File storage (Local/S3)
│   │   │   ├── storage.service.ts
│   │   │   └── storage.module.ts
│   │   ├── queue/                    # Job queue (Bull/BullMQ)
│   │   │   ├── queue.service.ts
│   │   │   └── queue.module.ts
│   │   ├── cache/                    # Caching (Redis)
│   │   │   ├── cache.service.ts
│   │   │   └── cache.module.ts
│   │   └── search/                   # Search engine (Elasticsearch - optional)
│   │       ├── search.service.ts
│   │       └── search.module.ts
│   │
│   ├── modules/                      # Business Logic Modules ⭐ MOST IMPORTANT
│   │   │
│   │   ├── auth/                     # Authentication & Authorization
│   │   │   ├── controllers/          # auth.controller.ts
│   │   │   ├── services/             # auth.service.ts
│   │   │   ├── repositories/         # auth.repository.ts
│   │   │   ├── dto/                  # LoginDto, RegisterDto, etc.
│   │   │   ├── strategies/           # jwt.strategy.ts, local.strategy.ts
│   │   │   ├── guards/               # jwt-auth.guard.ts
│   │   │   ├── interfaces/           # IAuthService, ITokenPayload
│   │   │   ├── mappers/              # auth.mapper.ts
│   │   │   ├── events/               # user-registered.event.ts
│   │   │   └── auth.module.ts
│   │   │
│   │   ├── user/                     # User Management
│   │   │   ├── controllers/          # user.controller.ts
│   │   │   ├── services/             # user.service.ts, job-seeker.service.ts
│   │   │   ├── repositories/         # user.repository.ts
│   │   │   ├── dto/                  # CreateUserDto, UpdateUserDto
│   │   │   ├── interfaces/           # IUser, IJobSeeker
│   │   │   ├── mappers/              # user.mapper.ts
│   │   │   └── user.module.ts
│   │   │
│   │   ├── company/                  # Company/Employer Management
│   │   │   ├── controllers/          # company.controller.ts
│   │   │   ├── services/             # company.service.ts
│   │   │   ├── repositories/         # company.repository.ts
│   │   │   ├── dto/                  # CreateCompanyDto, UpdateCompanyDto
│   │   │   ├── interfaces/           # ICompany
│   │   │   ├── mappers/              # company.mapper.ts
│   │   │   └── company.module.ts
│   │   │
│   │   ├── job/                      # Job Posting & Management
│   │   │   ├── controllers/          # job.controller.ts
│   │   │   ├── services/             # job.service.ts, job-search.service.ts
│   │   │   ├── repositories/         # job.repository.ts
│   │   │   ├── dto/                  # CreateJobDto, SearchJobDto
│   │   │   ├── interfaces/           # IJob, IJobFilter
│   │   │   ├── mappers/              # job.mapper.ts
│   │   │   └── job.module.ts
│   │   │
│   │   ├── application/              # Job Application Management
│   │   │   ├── controllers/          # application.controller.ts
│   │   │   ├── services/             # application.service.ts
│   │   │   ├── repositories/         # application.repository.ts
│   │   │   ├── dto/                  # CreateApplicationDto, UpdateStatusDto
│   │   │   ├── interfaces/           # IApplication
│   │   │   ├── mappers/              # application.mapper.ts
│   │   │   └── application.module.ts
│   │   │
│   │   ├── category/                 # Job Category Management
│   │   │   ├── controllers/          # category.controller.ts
│   │   │   ├── services/             # category.service.ts
│   │   │   ├── repositories/         # category.repository.ts
│   │   │   ├── dto/                  # CreateCategoryDto
│   │   │   ├── interfaces/           # ICategory
│   │   │   └── category.module.ts
│   │   │
│   │   └── notification/             # Notification Management
│   │       ├── controllers/          # notification.controller.ts
│   │       ├── services/             # notification.service.ts
│   │       ├── repositories/         # notification.repository.ts
│   │       ├── dto/                  # CreateNotificationDto
│   │       ├── interfaces/           # INotification
│   │       └── notification.module.ts
│   │
│   ├── app.module.ts                 # Root application module
│   ├── app.controller.ts             # Root controller
│   ├── app.service.ts                # Root service
│   └── main.ts                       # Application entry point
│
├── prisma/                           # Prisma ORM
│   ├── schema.prisma                 # Database schema
│   ├── migrations/                   # Database migrations
│   └── seeds/                        # Seed scripts
│       └── seed.ts
│
├── storage/                          # File storage (replaces uploads/)
│   ├── resumes/                      # Resume files
│   └── logos/                        # Company logos
│
├── scripts/                          # Utility scripts
│   ├── migrate.sh                    # Migration scripts
│   ├── seed.sh                       # Seed database
│   └── deploy.sh                     # Deployment scripts
│
├── test/                             # Tests
│   ├── unit/                         # Unit tests
│   │   ├── auth/
│   │   ├── user/
│   │   └── job/
│   └── e2e/                          # End-to-end tests
│       ├── auth.e2e-spec.ts
│       └── job.e2e-spec.ts
│
├── logs/                             # Application logs
│   ├── error.log
│   ├── combined.log
│   └── access.log
│
├── docs/                             # Documentation
│   ├── architecture/                 # Architecture docs
│   │   ├── CLEAN_ARCHITECTURE.md
│   │   └── DESIGN_PATTERNS.md
│   ├── api/                          # API documentation
│   │   ├── authentication.md
│   │   └── endpoints.md
│   ├── SETUP.md                      # Setup guide
│   └── DEPLOYMENT.md                 # Deployment guide
│
├── .env                              # Environment variables
├── .env.example                      # Environment variables template
├── .gitignore                        # Git ignore file
├── package.json                      # Dependencies
├── tsconfig.json                     # TypeScript configuration
├── nest-cli.json                     # NestJS CLI configuration
├── README.md                         # Project README
├── PRD.md                            # Product Requirements Document
└── FOLDER_STRUCTURE.md               # This file
```

## 🏛️ Architecture Layers

### 1. **Common Layer** (Shared Utilities)
Contains reusable code with **no business logic**:
- **Decorators**: `@CurrentUser()`, `@Public()`, `@Roles()`
- **Filters**: Global exception handling
- **Guards**: Common authorization guards
- **Interceptors**: Logging, transformation, caching
- **Pipes**: Validation, transformation
- **DTOs**: Pagination, Response wrappers
- **Enums**: Shared enumerations
- **Helpers/Utils**: Pure utility functions

### 2. **Core Layer** (Framework & Infrastructure)
Application core and framework concerns:
- **Config**: Environment configuration, app settings
- **Prisma**: Database ORM service
- **Database**: Connection management, transactions
- **Logger**: Winston logging service
- **Exceptions**: Custom exception classes

### 3. **Infrastructure Layer** (External Services)
Third-party integrations and external services:
- **Email**: SendGrid/Nodemailer integration
- **Storage**: Local/S3 file storage
- **Queue**: Background job processing (Bull)
- **Cache**: Redis caching layer
- **Search**: Elasticsearch (optional)

### 4. **Modules Layer** (Business Logic) ⭐
Core business domain modules:

| Module | Purpose | Key Responsibilities |
|--------|---------|---------------------|
| **auth** | Authentication & Authorization | Login, Register, JWT, Refresh Tokens |
| **user** | User Management | User CRUD, Job Seeker profiles |
| **company** | Company/Employer Management | Company profiles, verification |
| **job** | Job Posting & Management | Job CRUD, Search, Filtering |
| **application** | Job Application | Apply, Track status, Manage applications |
| **category** | Job Categories | Category management |
| **notification** | Notifications | Email & in-app notifications |

## 📐 Module Structure Pattern

Each business module follows this consistent structure:

```
modules/[module-name]/
├── controllers/          # HTTP layer (routes & validation)
│   └── [name].controller.ts
├── services/             # Business logic layer
│   └── [name].service.ts
├── repositories/         # Data access layer
│   └── [name].repository.ts
├── dto/                  # Data Transfer Objects
│   ├── create-[name].dto.ts
│   ├── update-[name].dto.ts
│   └── [name]-response.dto.ts
├── interfaces/           # TypeScript interfaces
│   └── [name].interface.ts
├── mappers/              # Entity ↔ DTO transformations
│   └── [name].mapper.ts
├── events/               # Domain events (optional)
│   └── [name]-created.event.ts
├── guards/               # Module-specific guards (optional)
└── [name].module.ts      # NestJS module definition
```

## 🔄 Data Flow (Clean Architecture)

```
HTTP Request
    ↓
Controller (Validation via DTO)
    ↓
Guard (Authentication/Authorization)
    ↓
Service (Business Logic)
    ↓
Repository (Data Access)
    ↓
Prisma Service (ORM)
    ↓
Database (PostgreSQL)
    ↓
Repository → Service → Mapper
    ↓
Response Interceptor
    ↓
HTTP Response
```

## 🎯 Separation of Concerns

| Layer | Responsibility | Example |
|-------|----------------|---------|
| **Controller** | HTTP handling, routing, validation | `@Get()`, `@Post()`, DTOs |
| **Service** | Business logic, orchestration | User registration flow, job search logic |
| **Repository** | Data access, queries | `findByEmail()`, `createJob()` |
| **Mapper** | Transform entities ↔ DTOs | `toDto()`, `toEntity()` |
| **Guard** | Authorization checks | Role-based access, ownership validation |
| **Interceptor** | Cross-cutting concerns | Logging, transformation, caching |

## 🗂️ File Naming Conventions

- **Controllers**: `*.controller.ts` - Handle HTTP requests
- **Services**: `*.service.ts` - Business logic
- **Modules**: `*.module.ts` - NestJS module definitions
- **DTOs**: `*.dto.ts` - Data Transfer Objects
- **Guards**: `*.guard.ts` - Route protection
- **Strategies**: `*.strategy.ts` - Authentication strategies
- **Interceptors**: `*.interceptor.ts` - Request/response transformation
- **Filters**: `*.filter.ts` - Exception handling
- **Pipes**: `*.pipe.ts` - Data validation/transformation

## 🔄 Data Flow

```
Client Request
    ↓
Controller (Validation via DTO)
    ↓
Guard (Authentication/Authorization)
    ↓
Service (Business Logic)
    ↓
Prisma Service (Database)
    ↓
Response Interceptor
    ↓
Client Response
```

## 📝 Key Configuration Files

- **package.json** - Project dependencies and scripts
- **tsconfig.json** - TypeScript compiler options
- **nest-cli.json** - NestJS CLI configuration
- **.env** - Environment variables (not committed)
- **.env.example** - Environment template
- **prisma/schema.prisma** - Database schema
- **.gitignore** - Files to ignore in git

## 🚀 Next Steps

1. Initialize NestJS project
2. Set up Prisma with PostgreSQL
3. Implement authentication module
4. Create all feature modules
5. Add validation and error handling
6. Implement file upload
7. Set up email service
8. Add logging and monitoring
9. Write tests
10. Deploy to production
