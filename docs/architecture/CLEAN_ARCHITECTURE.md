# Clean Architecture Guide

## 🏛️ Overview

This project follows **Clean Architecture** principles with clear separation of concerns across layers.

## 📐 Architecture Layers

```
┌─────────────────────────────────────────────┐
│           HTTP / External APIs              │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Controllers (HTTP Layer)            │
│  • Route handling                           │
│  • Request validation (DTOs)                │
│  • Response formatting                      │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│            Services (Business Logic)        │
│  • Core business rules                      │
│  • Orchestration                            │
│  • Use cases                                │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Repositories (Data Access)          │
│  • Database queries                         │
│  • Data persistence                         │
│  • Query optimization                       │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│          Prisma / Database                  │
└─────────────────────────────────────────────┘
```

## 🎯 Dependency Rule

**Inner layers should NOT depend on outer layers**

```
Domain Logic (Services)
    ↓ depends on
Interfaces (Abstractions)
    ↑ implemented by
Infrastructure (Repositories, External Services)
```

## 📁 Directory Structure by Layer

### 1. Common Layer (Shared)
```
src/common/
├── decorators/       # @CurrentUser, @Roles
├── guards/           # RolesGuard, ThrottlerGuard
├── filters/          # HttpExceptionFilter
├── interceptors/     # LoggingInterceptor
├── pipes/            # ValidationPipe
├── dto/              # PaginationDto, ResponseDto
├── enums/            # UserRole, JobStatus
└── utils/            # Pure utility functions
```

**Purpose**: Reusable code with no business logic

### 2. Core Layer (Framework)
```
src/core/
├── config/           # Configuration management
├── prisma/           # ORM service
├── database/         # Database utilities
├── logger/           # Logging service
└── exceptions/       # Custom exceptions
```

**Purpose**: Application infrastructure and framework concerns

### 3. Infrastructure Layer (External)
```
src/infrastructure/
├── email/            # Email service (SendGrid)
├── storage/          # File storage (S3)
├── queue/            # Job queue (Bull)
├── cache/            # Caching (Redis)
└── search/           # Search engine (Elasticsearch)
```

**Purpose**: Third-party integrations and external services

### 4. Modules Layer (Business Logic)
```
src/modules/
├── auth/             # Authentication
├── user/             # User management
├── company/          # Company profiles
├── job/              # Job postings
├── application/      # Applications
├── category/         # Categories
└── notification/     # Notifications
```

**Purpose**: Core business domain and use cases

## 🔄 Request Flow Example

### User Login Flow

```typescript
// 1. HTTP Request
POST /api/v1/auth/login
Body: { email, password }

// 2. Controller (HTTP Layer)
@Controller('auth')
export class AuthController {
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}

// 3. Service (Business Logic)
@Injectable()
export class AuthService {
  async login(loginDto: LoginDto) {
    // Validate credentials
    const user = await this.userRepository.findByEmail(loginDto.email);
    // Hash comparison
    // Generate JWT
    // Return tokens
  }
}

// 4. Repository (Data Access)
@Injectable()
export class UserRepository {
  async findByEmail(email: string): Promise<User> {
    return this.prisma.user.findUnique({ where: { email } });
  }
}

// 5. Prisma (ORM)
// Database query execution

// 6. Response
{ accessToken, refreshToken, user }
```

## 📦 Module Structure

Each module follows this pattern:

```
modules/auth/
├── controllers/              # HTTP layer
│   └── auth.controller.ts    # Routes, validation
├── services/                 # Business logic
│   └── auth.service.ts       # Use cases
├── repositories/             # Data access
│   └── auth.repository.ts    # Database queries
├── dto/                      # Data transfer objects
│   ├── login.dto.ts
│   ├── register.dto.ts
│   └── auth-response.dto.ts
├── interfaces/               # Contracts
│   ├── auth-service.interface.ts
│   └── token-payload.interface.ts
├── strategies/               # Passport strategies
│   ├── jwt.strategy.ts
│   └── local.strategy.ts
├── guards/                   # Auth guards
│   └── jwt-auth.guard.ts
├── mappers/                  # Transformations
│   └── auth.mapper.ts
├── events/                   # Domain events
│   └── user-registered.event.ts
└── auth.module.ts            # Module definition
```

## 🎯 Design Principles

### 1. Single Responsibility Principle (SRP)
Each class has one reason to change.

```typescript
// ❌ BAD: Controller doing too much
export class UserController {
  async createUser(dto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({ data: dto });
    await this.sendEmail(user.email, 'Welcome!');
    return user;
  }
}

// ✅ GOOD: Separated concerns
export class UserController {
  async createUser(dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }
}

export class UserService {
  async createUser(dto: CreateUserDto) {
    const user = await this.userRepository.create(dto);
    await this.eventEmitter.emit('user.created', user);
    return user;
  }
}
```

### 2. Dependency Inversion Principle (DIP)
Depend on abstractions, not concretions.

```typescript
// Define interface
export interface IEmailService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

// Service depends on interface
export class UserService {
  constructor(
    @Inject('IEmailService') private emailService: IEmailService
  ) {}
}

// Implementation
export class SendGridEmailService implements IEmailService {
  async sendEmail(to: string, subject: string, body: string) {
    // SendGrid implementation
  }
}
```

### 3. Repository Pattern
Separate data access from business logic.

```typescript
// Repository handles all database operations
@Injectable()
export class JobRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: JobFilters): Promise<Job[]> {
    return this.prisma.job.findMany({
      where: this.buildWhereClause(filters),
      include: { company: true, category: true }
    });
  }

  async findById(id: string): Promise<Job> {
    return this.prisma.job.findUnique({ where: { id } });
  }

  async create(data: CreateJobDto): Promise<Job> {
    return this.prisma.job.create({ data });
  }

  private buildWhereClause(filters: JobFilters) {
    // Query building logic
  }
}

// Service uses repository
@Injectable()
export class JobService {
  constructor(private jobRepository: JobRepository) {}

  async getJobs(filters: JobFilters) {
    const jobs = await this.jobRepository.findAll(filters);
    return jobs.map(job => this.jobMapper.toDto(job));
  }
}
```

### 4. Mapper Pattern
Transform between entities and DTOs.

```typescript
@Injectable()
export class UserMapper {
  toDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
      // Exclude password and sensitive data
    };
  }

  toEntity(dto: CreateUserDto): Partial<User> {
    return {
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      role: dto.role,
    };
  }
}
```

## 🧪 Testing Strategy

### Unit Tests
Test business logic in isolation.

```typescript
describe('UserService', () => {
  let service: UserService;
  let repository: MockType<UserRepository>;

  beforeEach(() => {
    repository = createMock<UserRepository>();
    service = new UserService(repository);
  });

  it('should create user', async () => {
    repository.create.mockResolvedValue(mockUser);
    const result = await service.createUser(createUserDto);
    expect(result).toEqual(mockUser);
  });
});
```

### Integration Tests
Test module interactions.

```typescript
describe('Auth Module Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AuthModule, PrismaModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  it('should login user', async () => {
    return request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'password' })
      .expect(200);
  });
});
```

## 📊 Benefits of This Architecture

1. **Testability**: Easy to mock dependencies and test in isolation
2. **Maintainability**: Clear separation of concerns
3. **Scalability**: Easy to add new features without affecting existing code
4. **Flexibility**: Easy to swap implementations (e.g., change email provider)
5. **Reusability**: Common code shared across modules
6. **Team Collaboration**: Multiple developers can work on different modules

## 🚀 Best Practices

1. **Keep controllers thin** - Only handle HTTP concerns
2. **Put business logic in services** - Not in controllers or repositories
3. **Use DTOs for validation** - Validate at the edge (controller)
4. **Use mappers for transformations** - Don't expose database entities
5. **Inject dependencies** - Don't create instances directly
6. **Write interfaces** - Program to abstractions
7. **Keep modules cohesive** - Related functionality together
8. **Avoid circular dependencies** - Use events or shared interfaces

## 📚 Further Reading

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [NestJS Documentation](https://docs.nestjs.com/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
