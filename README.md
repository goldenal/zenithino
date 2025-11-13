# Zenithino - FinTech Credit Assessment API

## Project Overview

The "Zenith ino" project is a robust, production-grade NestJS application built with TypeScript, designed for serverless deployment. It provides a backend API for a financial technology platform, enabling users to register, manage profiles, upload documents, and undergo AI-driven credit assessments. The core functionality involves leveraging Optical Character Recognition (OCR) to extract data from documents and then utilizing Artificial Intelligence (AI), specifically Google Gemini, to validate and analyze this data for comprehensive credit assessments. The project emphasizes modularity, type safety, and robust error handling, adhering to high development standards suitable for production environments.

## Application Architecture

The application follows a modular, monolithic NestJS architecture, adhering to best practices like SOLID principles, Dependency Injection, and the Repository pattern.

*   **Modular Structure**: The codebase is organized into distinct feature modules, promoting separation of concerns and maintainability:
    *   `AuthModule`: Handles user authentication, registration, and JWT token management.
    *   `UsersModule`: Manages user profiles and related data.
    *   `DocumentsModule`: Manages document uploads, storage (integrating with Cloudinary), and retrieval.
    *   `OcrModule`: Responsible for extracting text and structured data from various document types using libraries like `pdf-parse`, `pdf-poppler`, and `tesseract.js`.
    *   `AiValidatorModule`: Integrates with Google Gemini for AI-driven validation and analysis of extracted data.
    *   `CreditAssessmentModule`: Orchestrates the entire credit assessment workflow, combining user data, OCR-extracted document data, and AI validation results.
    *   `DatabaseModule`: Centralizes the configuration and connection to the PostgreSQL database using Sequelize ORM.
*   **Layers**: The architecture implicitly follows a layered approach with controllers handling requests, services containing business logic, and entities/repositories managing data persistence.
*   **Common Components**: Global components like `HttpExceptionFilter` (for consistent error handling), `TransformInterceptor` (for standardizing API responses and logging), and `ValidationPipe` (for DTO validation) ensure consistency and robustness across the API.
*   **Configuration**: Environment-specific configurations are managed through dedicated config files (`database.config.ts`, `gemini.config.ts`, `jwt.config.ts`, `swagger.config.ts`), loaded via `@nestjs/config`.
*   **API Gateway**: The application itself acts as an API gateway, exposing endpoints under a global prefix `/api/v1`, with interactive documentation available via Swagger at `/api/docs`.
*   **Deployment**: Designed for serverless deployment, specifically on Vercel, with considerations for cold starts and database connection pooling. It supports local file uploads for development but is configured for cloud storage (Cloudinary) in production.

## Key Technologies Used

*   **Backend Framework**: NestJS (v11.x)
*   **Language**: TypeScript (v5.x)
*   **Database**: PostgreSQL (via `pg` driver)
*   **ORM**: Sequelize (v6.x) with `sequelize-typescript` (v2.x)
*   **Authentication**: JSON Web Tokens (JWT) with Passport.js (`@nestjs/jwt`, `passport-jwt`), and `bcrypt` for password hashing.
*   **AI/ML**: Google Gemini (`@google/genai`) for AI-driven validation and analysis.
*   **OCR & Document Processing**: `pdf-parse`, `pdf-poppler`, `tesseract.js` for text extraction from documents, and `sharp` for image processing.
*   **Data Validation**: `class-validator` and `class-transformer` for robust DTO validation.
*   **Cloud Storage**: Cloudinary (`cloudinary`, `multer-storage-cloudinary`) for efficient file storage.
*   **API Documentation**: Swagger (`@nestjs/swagger`, `swagger-ui-express`) for interactive API documentation.
*   **Deployment Platform**: Vercel (serverless functions).
*   **HTTP Client**: Axios.
*   **Testing**: Jest (`jest`, `@nestjs/testing`, `ts-jest`) for unit and integration tests, and Supertest (`supertest`) for end-to-end (e2e) testing.
*   **Linting & Formatting**: ESLint and Prettier.
*   **Package Manager**: npm.

## Best Practices Implemented

The project adheres to a set of best practices to ensure maintainability, scalability, and robustness:

*   **Modular Architecture**: Every feature is encapsulated within its own module (e.g., `AuthModule`, `UsersModule`, `DocumentsModule`), promoting clear separation of concerns.
*   **SOLID Principles**:
    *   **Single Responsibility Principle (SRP)**: Controllers are kept lean, focusing on request handling, while business logic resides in dedicated services. Services, in turn, focus on specific domain responsibilities.
    *   **Dependency Inversion Principle (DIP)**: Strongly upheld through NestJS's powerful Dependency Injection (DI) system, allowing for loose coupling and easier testing.
    *   (Other SOLID principles are generally well-applied or supported by the framework's design).
*   **Repository Pattern**: Data access logic is implicitly handled by services directly interacting with Sequelize models (e.g., `@InjectModel(CreditAssessment) private assessmentModel: typeof CreditAssessment`), abstracting database operations.
*   **DTOs for Validation and Data Transfer**:
    *   Extensively used for input validation with `class-validator` decorators (e.g., `RegisterDto` in `src/modules/auth/dto/register.dto.ts`), ensuring incoming data conforms to expected structures and rules.
    *   Also used for standardized API responses (e.g., `UserProfileDto`, `AssessmentResponseDto`), controlling the shape of outgoing data.
*   **Dependency Injection**: Widely utilized via constructor injection across services, controllers, and other providers (e.g., `UsersService` injected into `UsersController`), facilitating testability and modularity.
*   **Strong Type Safety**:
    *   The entire codebase is written in TypeScript, enforcing strong typing throughout the application.
    *   **Enums**: Used for fixed sets of values (e.g., `UserRole` in `src/common/enums/user-role.enum.ts`).
    *   **DTOs**: Define clear and explicit types for API request/response bodies.
    *   **Entities**: Sequelize-TypeScript decorators enforce strict typing and schema definition for database models (e.g., `src/modules/users/entities/user.entity.ts`), including relationships.
    *   **Interfaces**: Custom interfaces are used for complex object structures (e.g., `ValidationResult` in `src/modules/ai-validator/interfaces/validation-result.interface.ts`), enhancing code clarity and maintainability.
*   **Robust Error Handling**:
    *   **Global Exception Filter**: `src/common/filters/http-exception.filter.ts` standardizes the HTTP response format for exceptions, providing consistent and informative error messages to clients.
    *   Leverages built-in NestJS HTTP exceptions (`NotFoundException`, `InternalServerErrorException`) for common error scenarios.
*   **Comprehensive Testing Standards**:
    *   **Jest**: The primary testing framework, integrated with `@nestjs/testing` for NestJS-specific testing utilities.
    *   **Unit Tests**: Located in `*.spec.ts` files within `src/` directories, focusing on isolated component testing.
    *   **End-to-End (E2E) Tests**: Located in `*.e2e-spec.ts` files within the `test/` directory, bootstrapping the full application and using `supertest` to simulate HTTP requests.
    *   **Test Coverage**: Configured to generate coverage reports via `npm run test:cov`.
*   **Security Measures**:
    *   **Authentication Guards**: `JwtAuthGuard` (`src/modules/auth/guards/jwt-auth.guard.ts`) protects routes by validating JSON Web Tokens.
    *   **Authorization Guards**: `RolesGuard` (`src/modules/auth/guards/roles.guard.ts`) implements role-based access control, checking user permissions against defined roles.
    *   **CORS**: Enabled globally in `src/main.ts` (Note: `origin: true` is currently overly permissive and should be restricted to specific domains in production).
    *   **Global Validation Pipes**: Configured in `src/main.ts` with `whitelist: true`, `transform: true`, and `forbidNonWhitelisted: true` to automatically validate and transform incoming request payloads based on DTO decorators. (Note: A custom pipe in `app.module.ts` currently overrides this, leading to a potential security vulnerability related to mass assignment. This should be addressed by removing the custom pipe or ensuring it correctly extends the built-in one).
*   **Configuration Management**:
    *   Utilizes the `@nestjs/config` module for managing environment variables, loading configurations from `.env` files (via `dotenv-cli`) and the system environment.
    *   Accessed via `ConfigService` or directly `process.env`.
    *   **Current Limitation**: Lacks explicit schema validation for environment variables (e.g., using Joi) at application startup, which could lead to runtime errors if critical variables are missing or malformed.

## API Endpoints

The API is prefixed with `/api/v1` and documented via Swagger at `/api/docs`.

### Authentication (`/auth`)

*   `POST /auth/register`: Registers a new user.
    *   **Authentication**: None
    *   **Request Body**: `RegisterDto` (email, password, fullName, etc.)
    *   **Response**: User authentication token.
*   `POST /auth/login`: Authenticates a user and returns a JWT.
    *   **Authentication**: None
    *   **Request Body**: `LoginDto` (email, password)
    *   **Response**: User authentication token.

### Users (`/users`)

*   `GET /users/profile`: Retrieves the profile of the currently authenticated user.
    *   **Authentication**: Required (JWT)
    *   **Response**: `UserProfileDto`
*   `PATCH /users/profile`: Updates the profile of the currently authenticated user.
    *   **Authentication**: Required (JWT)
    *   **Request Body**: Partial `UserProfileDto`
    *   **Response**: Updated `UserProfileDto`

### Documents (`/documents`)

*   `POST /documents/upload`: Uploads a document for OCR processing.
    *   **Authentication**: Required (JWT)
    *   **Request Body**: `multipart/form-data` with `documentType` and `file`.
    *   **Response**: `DocumentResponseDto`
*   `GET /documents`: Retrieves all documents uploaded by the current user.
    *   **Authentication**: Required (JWT)
    *   **Response**: Array of `DocumentResponseDto`
*   `GET /documents/:id`: Retrieves a specific document by its ID.
    *   **Authentication**: Required (JWT)
    *   **Path Params**: `id` (string, UUID)
    *   **Response**: `DocumentResponseDto`
*   `DELETE /documents/:id`: Deletes a specific document by its ID.
    *   **Authentication**: Required (JWT)
    *   **Path Params**: `id` (string, UUID)
    *   **Response**: `{ message: string }`

### Credit Assessment (`/credit-assessment`)

*   `POST /credit-assessment`: Initiates a new credit assessment for the current user.
    *   **Authentication**: Required (JWT)
    *   **Request Body**: `AssessmentRequestDto` (e.g., requestedAmount)
    *   **Response**: `AssessmentResponseDto`
*   `GET /credit-assessment`: Retrieves all credit assessments for the current user.
    *   **Authentication**: Required (JWT)
    *   **Response**: Array of `AssessmentResponseDto`
*   `GET /credit-assessment/all`: Retrieves all credit assessments for all users.
    *   **Authentication**: None
    *   **Query Parameters**:
        *   `page` (optional, default: 1): Page number for pagination.
        *   `pageSize` (optional, default: 10): Number of items per page.
        *   `status` (optional, string): Filter assessments by status (e.g., 'pending', 'completed', 'failed').
    *   **Response**: Paginated list `{ rows: AssessmentResponseDto[]; count: number }`, where each `AssessmentResponseDto` includes the owner's `UserProfileDto`.
*   `GET /credit-assessment/:id`: Retrieves a specific credit assessment by its ID.
    *   **Authentication**: Required (JWT)
    *   **Path Params**: `id` (string, UUID)
    *   **Response**: `AssessmentResponseDto`

## Database Schema/Models

The application uses PostgreSQL with Sequelize ORM.

*   **User (`User` entity - `src/modules/users/entities/user.entity.ts`)**:
    *   Stores user details, including authentication credentials and profile information.
    *   **Fields**: `id` (UUID, PK), `fullName`, `email` (unique), `password` (hashed), `businessName` (optional), `phoneNumber` (optional), `role` (enum: `USER`, `LENDER`, `ADMIN`), `bvn` (optional), `createdAt`, `updatedAt`.
    *   **Relationships**: `HasMany` Documents, `HasMany` CreditAssessments.
*   **Document (`Document` entity - `src/modules/documents/entities/document.entity.ts`)**:
    *   Stores metadata about uploaded documents and their extracted data.
    *   **Fields**: `id` (UUID, PK), `userId` (UUID, FK to User), `documentType` (enum), `filename`, `fileUrl`, `status` (enum: 'pending', 'processed', 'failed'), `extractedData` (JSONB, optional), `createdAt`, `updatedAt`.
    *   **Relationships**: `BelongsTo` User.
*   **CreditAssessment (`CreditAssessment` entity - `src/modules/credit-assessment/entities/credit-assessment.entity.ts`)**:
    *   Stores the results of credit assessments, including scores, risk levels, and detailed analysis.
    *   **Fields**: `id` (UUID, PK), `userId` (UUID, FK to User), `creditScore` (number), `riskLevel` (enum), `defaultProbability` (float), `maxLoanAmount` (decimal), `expectedLoss` (decimal), `validationResult` (JSONB, optional), `financialSummary` (JSONB, optional), `riskAnalysis` (JSONB, optional), `creditFactors` (JSONB, optional), `status` (enum: 'pending', 'completed', 'failed'), `createdAt`, `updatedAt`.
    *   **Relationships**: `BelongsTo` User.

## Setup and Installation Instructions

To get the project running locally:

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd zenithino
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Environment Variables:**
    Create a `.env` file in the root directory. Populate it with necessary environment variables. A `.env.example` file might be available for reference, otherwise infer from the configuration files. Key variables include:
    *   `PORT` (e.g., `3000`)
    *   `DATABASE_URL` (or individual `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`)
    *   `JWT_SECRET`
    *   `CLOUDINARY_CLOUD_NAME`
    *   `CLOUDINARY_API_KEY`
    *   `CLOUDINARY_API_SECRET`
    *   `GEMINI_API_KEY`
4.  **Database Setup:**
    Ensure a PostgreSQL database is running and accessible.
    Run database migrations to set up the schema (check `package.json` for specific migration scripts, e.g., `npm run db:migrate`).
5.  **Run the application:**
    ```bash
    npm run start:dev
    ```
    The API will typically be available at `http://localhost:3000/api/v1` (or your configured port and prefix).
    Interactive Swagger documentation will be accessible at `http://localhost:3000/api/docs`.

## Testing Instructions

*   **Run Unit Tests:**
    ```bash
    npm test
    ```
*   **Run End-to-End Tests:**
    ```bash
    npm run test:e2e
    ```
*   **Generate Test Coverage Report:**
    ```bash
    npm run test:cov
    ```

## Deployment Information

*   The application is designed for serverless deployment, with **Vercel** being the primary target platform.
*   Refer to the `VERCEL_DEPLOYMENT.md` file for detailed instructions on Vercel-specific configurations, environment variables, and database connection pooling strategies optimized for serverless environments.
*   While local file uploads are used during development, Cloudinary is configured for robust and scalable production storage.
