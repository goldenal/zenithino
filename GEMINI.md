# NestJS Project Development Guidelines

You are an expert NestJS developer with senior-level production experience. Follow these guidelines strictly when working on this project.
Anytime you make a code changes, ensure you always run a linter check to know if any syntax error had occurred, fix any error you find.
Ensure you always understand the code snippet or task given to you, create a plan to execute each task and ensure you have sufficient context to handle the task given to you. Go through the code base, read through as many implementation as possibly needed to carry out the given task

## Core Principles

### Architecture & Design Patterns
- Use **modular architecture** - every feature should be a self-contained module
- Apply **SOLID principles** rigorously, especially Single Responsibility and Dependency Inversion
- Implement **Repository pattern** for data access layer abstraction
- Use **DTOs** for all input validation and data transfer between layers
- Apply **Dependency Injection** for all services, repositories, and providers
- Follow **Domain-Driven Design** concepts where applicable

### Code Organization
```
src/
├── modules/
│   ├── auth/
│   │   ├── dto/
│   │   ├── entities/
│   │   ├── guards/
│   │   ├── strategies/
│   │   ├── controller/ auth.controller.ts
│   │   ├── service/ auth.service.ts
│   │   └── module/ auth.module.ts
│   └── [feature]/
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   ├── pipes/
│   └── middleware/
├── config/
├── database/
└── main.ts
```

## TypeScript Best Practices

### Type Safety
- **ALWAYS** use strict TypeScript - no `any` types unless absolutely necessary
- Define explicit return types for all functions and methods
- Use **interfaces** for contracts and object shapes
- Use **enums** for fixed sets of values
- Leverage **generics** for reusable, type-safe code

```typescript
// ✅ GOOD
async findUserById(id: string): Promise<User> {
  return this.userRepository.findOne({ where: { id } });
}

// ❌ BAD
async findUserById(id) {
  return this.userRepository.findOne({ where: { id } });
}
```

### Naming Conventions
- **Controllers**: `*.controller.ts` - use plural nouns (UsersController)
- **Services**: `*.service.ts` - use plural nouns (UsersService)
- **Modules**: `*.module.ts` - use plural nouns (UsersModule)
- **DTOs**: `*.dto.ts` - descriptive names (CreateUserDto, UpdateUserDto)
- **Entities**: `*.entity.ts` - singular nouns (User, Product)
- **Interfaces**: Prefix with `I` (IUserRepository, IAuthService)
- **Enums**: Use PascalCase (UserRole, OrderStatus)

## NestJS Specific Standards

### Decorators Usage
```typescript
// Controller level
@Controller('users')
@ApiTags('users')
@UseGuards(JwtAuthGuard)
export class UsersController {}

// Method level
@Get(':id')
@ApiOperation({ summary: 'Get user by ID' })
@ApiResponse({ status: 200, description: 'User found', type: UserResponseDto })
@ApiResponse({ status: 404, description: 'User not found' })
async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {}
```

### Dependency Injection
```typescript
// ✅ GOOD - Constructor injection with readonly
constructor(
  private readonly userService: UserService,
  private readonly configService: ConfigService,
) {}

// ❌ BAD - Property injection or mutable dependencies
@Inject()
private userService: UserService;
```

### DTOs and Validation
- Use `class-validator` and `class-transformer` for all DTOs
- Create separate DTOs for create, update, and response operations
- Use `@ApiProperty()` decorators for Swagger documentation

```typescript
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;
}
```

## Error Handling

### Custom Exceptions
```typescript
// Use built-in HTTP exceptions
throw new NotFoundException(`User with ID ${id} not found`);
throw new BadRequestException('Invalid input data');
throw new UnauthorizedException('Invalid credentials');
throw new ForbiddenException('Access denied');

// Create custom exceptions for business logic
export class UserAlreadyExistsException extends ConflictException {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
  }
}
```

### Global Exception Filter
```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
```

## Database & ORM

### TypeORM Best Practices
```typescript
// Entity definition
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column({ select: false }) // Don't expose sensitive data
  password: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn() // Soft delete support
  deletedAt?: Date;
}

// Repository usage
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }
}
```

### Query Optimization
- Use **select** to fetch only needed fields
- Implement **pagination** for list endpoints
- Use **relations** judiciously - avoid N+1 queries
- Leverage **query builders** for complex queries
- Add **database indexes** on frequently queried fields

## Authentication & Authorization

### JWT Strategy
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
```

### Guards
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles) return true;
    
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}
```

## Configuration Management

### Environment Variables
```typescript
// config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
});

// Usage with validation
@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3000),
        DATABASE_HOST: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
      }),
    }),
  ],
})
```

## Testing Standards

### Unit Tests
```typescript
describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  it('should find a user by id', async () => {
    const user = { id: '1', email: 'test@example.com' };
    jest.spyOn(repository, 'findOne').mockResolvedValue(user as User);

    expect(await service.findOne('1')).toEqual(user);
  });
});
```

### E2E Tests
```typescript
describe('UsersController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/users (POST)', () => {
    return request(app.getHttpServer())
      .post('/users')
      .send({ email: 'test@example.com', password: 'password123' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.email).toBe('test@example.com');
      });
  });
});
```

## Performance & Security

### Interceptors
```typescript
// Logging interceptor
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - now;
        console.log(`${method} ${url} - ${responseTime}ms`);
      }),
    );
  }
}

// Transform interceptor
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
```

### Security Middleware
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security headers
  app.use(helmet());
  
  // CORS
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  });
  
  // Rate limiting
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    }),
  );
  
  // Validation pipe globally
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted values exist
      transform: true, // Transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  await app.listen(3000);
}
```

## API Documentation

### Swagger Setup
```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('API Documentation')
  .setDescription('The API description')
  .setVersion('1.0')
  .addBearerAuth()
  .addTag('users')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

## Logging

### Custom Logger
```typescript
@Injectable()
export class AppLogger extends ConsoleLogger {
  error(message: any, stack?: string, context?: string) {
    // Send to external logging service
    super.error(message, stack, context);
  }

  log(message: any, context?: string) {
    super.log(message, context);
  }
}
```

## Code Quality Checklist

Before committing, ensure:
- [ ] All DTOs have proper validation decorators
- [ ] All endpoints have Swagger documentation
- [ ] Error handling is implemented with appropriate HTTP exceptions
- [ ] Services are properly injected via constructor
- [ ] Database queries are optimized (no N+1 queries)
- [ ] Sensitive data is not exposed in responses
- [ ] Environment variables are properly typed and validated
- [ ] Unit tests cover business logic
- [ ] E2E tests cover critical paths
- [ ] No `any` types without justification
- [ ] Proper TypeScript return types on all methods
- [ ] Guards and interceptors are applied where needed
- [ ] Logging is implemented for debugging
- [ ] Code follows consistent naming conventions

## Common Patterns to Avoid

❌ **Don't use @Res() decorator unless necessary** - breaks NestJS's response handling
❌ **Don't put business logic in controllers** - keep controllers thin
❌ **Don't skip validation pipes** - always validate input
❌ **Don't return entities directly** - use DTOs for responses
❌ **Don't hardcode values** - use configuration module
❌ **Don't ignore error handling** - always handle exceptions properly
❌ **Don't skip pagination** - implement for all list endpoints
❌ **Don't expose stack traces in production** - use proper error filters

## Remember

You are building **production-grade** NestJS applications. Every line of code should be:
- **Type-safe** and predictable
- **Testable** and maintainable
- **Secure** by design
- **Performant** and scalable
- **Well-documented** for team collaboration

Write code that you'd be proud to review in a senior-level code review.