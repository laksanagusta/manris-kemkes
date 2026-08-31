# CLAUDE.md - Manris v2 AI-Driven Risk & Incident Management SaaS

## Project Overview

**Manris v2** is a comprehensive SaaS platform for digitalizing the entire risk and incident management lifecycle according to **ISO 31000:2018** standards. This application is designed for a Ministry environment (Directorate General of Disease Control) and features AI-driven capabilities for risk analysis, incident reporting, and predictive insights.

### Key Features
- End-to-end risk management lifecycle (Identification → Analysis → Evaluation → Treatment → Monitoring)
- AI-powered root cause analysis, mitigation recommendations, and document extraction
- Role-Based Access Control (RBAC) with 4 user levels (Super Admin, Unit, Reviewer, Pimpinan)
- Real-time Executive Dashboard with Risk Heatmap 5×5
- Incident management with CAPA tracking
- Approval workflows and escalation automation
- Lessons learned repository
- Risk versioning and audit trails

## Project Structure

### Monorepo Setup
```
manris-v2/
├── backend/          # Golang + Fiber API server
├── frontend/         # Next.js 16 + React + TypeScript
├── prd.md           # Product Requirements Document
└── .gitignore       # Root-level gitignore
```

### Backend (Golang + Fiber)
```
backend/
├── cmd/server/        # Application entry point
├── internal/
│   ├── domain/        # Domain entities and interfaces (Clean Architecture)
│   ├── handler/http/  # HTTP handlers (Clean Architecture)
│   ├── handler/       # Legacy handlers (being phased out)
│   ├── repository/    # Data access layer
│   ├── usecase/       # Business logic layer
│   ├── middleware/    # HTTP middleware
│   ├── config/        # Configuration management
│   ├── database/      # Database connection setup
│   └── model/         # Legacy models (being refactored)
├── db/migrations/     # Database migrations (using golang-migrate)
├── .env              # Environment variables
├── Makefile          # Database migration and build commands
├── go.mod/go.sum     # Go module dependencies
└── server            # Compiled binary
```

### Frontend (Next.js 16 + TypeScript)
```
frontend/
├── src/
│   ├── app/                   # App Router structure
│   │   ├── (app)/             # Route groups
│   │   │   ├── dashboard/     # Executive Dashboard
│   │   │   ├── inbox/         # Approval workflows
│   │   │   ├── intelligence/  # AI tools suite
│   │   │   ├── compliance/    # Controls, Lessons Learned
│   │   │   └── admin/        # Management functions
│   │   ├── (public)/          # Public routes
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Landing page
│   ├── components/            # UI components
│   │   ├── app-shell.tsx      # Main layout wrapper
│   │   ├── app-sidebar.tsx    # Navigation sidebar
│   │   ├── app-header.tsx     # Header with user info
│   │   └── ui/                # shadcn/ui components
│   ├── contexts/              # React contexts (authentication, etc.)
│   ├── lib/                  # Utility functions
│   └── types/                # TypeScript type definitions
├── public/                   # Static assets
├── package.json             # Frontend dependencies
├── next.config.ts           # Next.js configuration
├── tsconfig.json            # TypeScript configuration
└── .gitignore               # Frontend-specific ignores
```

## Technology Stack

### Backend
- **Language**: Go 1.25.0
- **Framework**: Fiber (Express.js-style web framework)
- **Database**: PostgreSQL with pgx driver
- **Authentication**: JWT (JSON Web Token)
- **AI Integration**: OpenAI API for AI-powered features
- **Database Migration**: golang-migrate
- **Architecture**: Clean Architecture (transitioning from legacy layered architecture)

### Frontend  
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.0
- **UI Library**: shadcn/ui + TailwindCSS v4
- **State Management**: React Context API
- **Form Handling**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React
- **Styling**: TailwindCSS v4 with CSS animations

### Database
- **Primary**: PostgreSQL
- **Connection**: pgx v5 (modern PostgreSQL driver)
- **ORM Pattern**: Repository pattern with clean architecture
- **Migration Tool**: golang-migrate (external tool)

## Key Dependencies

### Backend (Go)
```go
// Core Framework & Database
github.com/gofiber/fiber/v2         // Web framework
github.com/jackc/pgx/v5              // PostgreSQL driver
github.com/golang-migrate/migrate/v4 // Database migrations

// Authentication & Security
github.com/golang-jwt/jwt/v5        // JWT tokens
golang.org/x/crypto                 // Cryptographic utilities

// AI Integration
github.com/sashabaranov/go-openai   // OpenAI API client

// Utilities
github.com/google/uuid              // UUID generation
github.com/joho/godotenv             // Environment variables
```

### Frontend (npm)
```json
{
  "next": "16.1.6",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "@types/react": "^19",
  "typescript": "^5",
  "tailwindcss": "^4",
  "shadcn": "^4.0.2",
  "react-hook-form": "^7.71.2",
  "zod": "^4.3.6",
  "recharts": "^3.8.0",
  "lucide-react": "^0.577.0"
}
```

## Available Scripts & Commands

### Backend Development
```bash
# Navigate to backend directory
cd backend

# Install golang-migrate CLI (if not installed)
make install-migrate

# Environment setup (create .env file manually - see Environment Configuration section below)

# Database operations
make migrate-up       # Run all pending migrations
make migrate-down     # Roll back last migration
make migrate-new name=create_risk_table  # Create new migration
make migrate-force    # Force migration version (if dirty state occurs)

# Run development server
make run              # Runs: go run cmd/server/main.go

# Testing
go test ./...                    # Run all tests
go test -v ./internal/...        # Run tests with verbosity
go test ./internal/domain/       # Test specific package

# Build
go build -o bin/server cmd/server/main.go
```

### Frontend Development
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
# or
yarn install
# or
pnpm install

# Development server
npm run dev
# or
yarn dev
# or
pnpm dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

### Environment Configuration

#### Backend (.env)
```bash
PORT=8080
DATABASE_URL=postgres://postgres:4msterdam@localhost:5439/manris?sslmode=disable
JWT_SECRET=manris-v2-super-secret-key-change-in-production
JWT_EXPIRY_HOURS=24
CORS_ORIGINS=http://localhost:3000
OPENAI_API_KEY=your-openai-api-key-here
```

## Architecture Patterns

### Clean Architecture (Backend)
The backend is transitioning to Clean Architecture with clear separation of concerns:

1. **Domain Layer**: Business entities and interfaces (in `/internal/domain/`)
2. **UseCase Layer**: Business logic (in `/internal/usecase/`)
3. **Handler Layer**: HTTP request/response handling (in `/internal/handler/http/`)
4. **Repository Layer**: Data access implementations (in `/internal/repository/postgres/`)

**Legacy Code**: Older handlers in `/internal/handler/` are being gradually migrated.

### Frontend Architecture
- **App Router**: Next.js 16 App Router for file-based routing
- **Route Groups**: Organized features in `(app)` groups
- **Component Structure**: 
  - `app-shell.tsx`: Main layout with sidebar and header
  - Feature-specific components in their route folders
  - Reusable UI components in `components/ui/`

### Database Design
- **Repository Pattern**: Clean interfaces for data access
- **Entity Relationships**: Risk → Incidents → Controls → Lessons Learned
- **Audit Trail**: Automatic change tracking for compliance
- **RBAC**: Role-based access control at database level

**Key Database Tables** (see `backend/db/migrations/000001_initial_schema.up.sql`):
- `users` - User accounts with roles (super_admin, unit, reviewer, pimpinan)
- `risks` - Core risk records with scoring, status, and AI analysis
- `risk_versions` - Risk version history for audit trail
- `incidents` - Incident records with CAPA tracking
- `controls` - Risk control measures
- `approvals` - Approval workflow records
- `audit_logs` - Change tracking for compliance

## Core Features & API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `GET /api/v1/auth/me` - Get current user

### Risk Management (Clean Architecture)
- `GET /api/v1/risks` - List risks
- `POST /api/v1/risks` - Create risk
- `GET /api/v1/risks/:id` - Get risk details
- `PUT /api/v1/risks/:id` - Update risk
- `DELETE /api/v1/risks/:id` - Delete risk
- `GET /api/v1/dashboard/summary` - Dashboard KPIs
- `GET /api/v1/dashboard/heatmap` - Risk heatmap data
- `GET /api/v1/dashboard/top-risks` - Top risks by score

### Incident Management
- `GET /api/v1/incidents` - List incidents
- `POST /api/v1/incidents` - Create incident
- `GET /api/v1/incidents/:id` - Get incident details

### AI-Powered Features
- `POST /api/v1/ai/cause` - Generate root cause analysis
- `POST /api/v1/ai/impact` - Generate impact analysis
- `POST /api/v1/ai/mitigation` - Generate mitigation recommendations
- `POST /api/v1/ai/transcript` - Analyze meeting transcripts
- `POST /api/v1/ai/predictive` - Risk trend prediction
- `POST /api/v1/ai/minutes` - Generate meeting minutes

### Controls
- `GET /api/v1/controls` - List controls
- `POST /api/v1/controls` - Create control

### Approval Workflows
- `GET /api/v1/approvals` - List pending approvals
- `POST /api/v1/approvals/submit` - Submit for approval
- `POST /api/v1/approvals/:id/action` - Approve/reject

## Key Design Patterns & Best Practices

### Backend (Go)
1. **Clean Architecture**: Dependency inversion with clear layers
2. **Repository Pattern**: Abstracted data access
3. **UseCase Pattern**: Business logic separated from handlers
4. **Middleware**: CORS, JWT validation, logging, correlation IDs
5. **Error Handling**: Structured error responses
6. **Environment Configuration**: Secure credential management

### Frontend (React/Next.js)
1. **TypeScript**: Strong typing throughout
2. **Component Composition**: Reusable UI components with shadcn/ui
3. **Form Handling**: React Hook Form + Zod for validation
4. **State Management**: React Context for authentication and global state
5. **Routing**: Next.js App Router with route groups
6. **Responsive Design**: TailwindCSS utility classes

### Database & Data Access
1. **Migration Management**: Version-controlled schema changes
2. **Connection Pooling**: Efficient database connections
3. **Entity Relationships**: Proper foreign key relationships
4. **Audit Trail**: Automatic change tracking
5. **Soft Deletes**: Where appropriate for data integrity

## Development Workflow

### Getting Started
1. **Clone and setup**:
   ```bash
   git clone <repository>
   cd manris-v2
   ```

2. **Backend setup**:
   ```bash
   cd backend
   # Create .env file with the following variables (see Environment Configuration section)
   make install-migrate
   make migrate-up
   make run
   ```

3. **Frontend setup**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**: http://localhost:3000

### Code Quality Standards
- **Go**: Use `go fmt`, `go vet`, and table-driven tests
- **TypeScript**: Strict TypeScript configuration with proper typing
- **React**: Follow React hooks rules and component composition patterns
- **Database**: Use migrations for all schema changes

### Testing Strategy
- **Backend**: Go testing framework with table-driven tests, benchmarks, and fuzzing
- **Frontend**: Jest + React Testing Library (setup prepared)
- **Integration**: Test both layers together

## Security Considerations

### Authentication & Authorization
- JWT-based authentication with configurable expiry
- Role-Based Access Control (RBAC) with 4 levels
- API route protection with middleware
- CORS configuration for cross-origin requests

### Data Protection
- Environment variables for sensitive data
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- Secure password handling

### Compliance Features
- ISO 31000:2018 standard adherence
- Audit trail for all data changes
- Risk versioning and historical tracking
- Approval workflow documentation

## AI Integration Features

### AI Tools Suite
1. **Fishbone Generator**: Root cause analysis using 5 categories (Manusia, Metode, Mesin, Material, Lingkungan)
2. **Smart Mitigation**: AI-powered mitigation recommendations
3. **Transcript Analyzer**: Extract risks from meeting transcripts
4. **Predictive Scoring**: Risk trend prediction based on historical data
5. **Meeting Minutes**: Automated meeting minute generation from transcripts
6. **Inline Assistants**: Per-field AI assistance in forms

### OpenAI Integration
- Structured prompts for consistent outputs
- Error handling for API failures
- Response validation and formatting
- Configurable AI endpoints and parameters

## Deployment Considerations

### Development Environment
- Hot reload for both frontend and backend
- Local PostgreSQL database
- CORS configured for localhost:3000
- Environment-specific configurations

### Production Deployment
- Database migrations must be run before application start
- JWT secrets should be rotated
- CORS origins should be restricted to production domains
- OpenAI API keys should be environment-specific
- Consider containerization with Docker

## Monitoring & Maintenance

### Health Checks
- `GET /api/health` - Basic service health check
- `GET /api/system/slow-queries` - Database performance monitoring

### Logging
- Structured logging with correlation IDs
- Request/response logging
- Error logging with stack traces

### Performance Considerations
- Connection pooling for database
- Efficient pagination for large datasets
- Caching strategies for frequently accessed data
- API rate limiting considerations

## Documentation References

- **Product Requirements**: `/prd.md` - Comprehensive PRD with feature specifications
- **API Documentation**: Refer to handler implementations for endpoint details
- **Database Schema**: Migration files in `backend/db/migrations/`
- **AI Integration**: Handler implementations for AI feature details

## Troubleshooting Common Issues

### Backend Issues

**Migration fails with "dirty database state"**
```bash
# View current migration version
psql $DATABASE_URL -c "SELECT version FROM schema_migrations;"
# Force to previous clean version
make migrate-force
# Then retry migrations
make migrate-up
```

**Database connection errors**
- Ensure PostgreSQL is running: `psql postgres -c "SELECT version();"`
- Verify DATABASE_URL in `.env` matches your PostgreSQL setup
- Check that database exists: `psql postgres -c "CREATE DATABASE manris;"`

**JWT authentication failures**
- Verify JWT_SECRET is set in `.env`
- Check token hasn't expired (default 24 hours)
- Ensure CORS_ORIGINS includes your frontend URL

**Port already in use (port 8080)**
```bash
# Find and kill process using port 8080
lsof -ti:8080 | xargs kill -9
# Or change PORT in .env
```

### Frontend Issues

**Build fails with TypeScript errors**
```bash
# Check for type errors
npm run build
# Fix missing types
npm install --save-dev @types/package-name
```

**API calls returning 401/CORS errors**
- Verify NEXT_PUBLIC_API_URL in `.env.local` matches backend URL
- Check backend CORS_ORIGINS includes frontend URL
- Ensure JWT token is set in cookies

**shadcn/ui components not working**
```bash
# Reinstall ui components
npx shadcn@latest add [component-name]
```

**Next.js dev server not responding**
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### Development Workflow Issues

**Hot reload not working**
- Backend: Changes to `.go` files auto-reload with `go run`
- Frontend: Changes should auto-refresh; if not, check browser console for errors

**Migration not reflecting in API**
- Ensure migration was applied: `make migrate-up`
- Restart backend server after schema changes
- Check for cached query results in repository layer

## Future Development Guidelines

### Architecture Decisions
1. Continue migration to Clean Architecture
2. Implement comprehensive testing suite
3. Add API documentation generation
4. Consider microservices for scalability
5. Implement proper caching layer

### Feature Enhancements
1. Mobile app development
2. Advanced AI features (NLP improvements)
3. Real-time notifications
4. Advanced reporting and analytics
5. Integration with external systems

### Code Standards
1. Follow existing patterns and conventions
2. Maintain TypeScript strict mode
3. Keep Go dependencies updated
4. Follow Clean Architecture principles
5. Implement comprehensive error handling

This CLAUDE.md provides a comprehensive guide for working with the Manris v2 codebase. Follow the established patterns, architecture decisions, and development workflows to maintain consistency and code quality across the application.

## Common Development Patterns

### Adding a New API Endpoint (Clean Architecture)

1. **Define Domain Entity** (`internal/domain/`):
   ```go
   type MyEntity interface {
       ID() string
       Name() string
   }
   ```

2. **Create Repository Interface** (`internal/repository/`):
   ```go
   type MyEntityRepository interface {
       Create(ctx context.Context, entity MyEntity) error
       GetByID(ctx context.Context, id string) (MyEntity, error)
   }
   ```

3. **Implement Repository** (`internal/repository/postgres/`):
   ```go
   type myEntityRepo struct {
       db *pgxpool.Pool
   }
   // Implement interface methods with SQL queries
   ```

4. **Create UseCase** (`internal/usecase/`):
   ```go
   type MyEntityUseCase interface {
       Create(ctx context.Context, req CreateRequest) (MyEntity, error)
   }
   ```

5. **Create Handler** (`internal/handler/http/`):
   ```go
   func (h *Handler) CreateMyEntity(c *fiber.Ctx) error {
       // Parse request, call usecase, return response
   }
   ```

6. **Register Route** (`cmd/server/main.go`):
   ```go
   app.Post("/api/v1/my-entities", handler.CreateMyEntity)
   ```

### Adding a New Frontend Feature

1. **Create TypeScript Types** (`src/types/my-feature.ts`):
   ```typescript
   export interface MyEntity {
       id: string;
       name: string;
   }
   ```

2. **Create API Client Functions** (`src/lib/api/my-feature.ts`):
   ```typescript
   export async function createMyEntity(data: CreateMyEntityRequest): Promise<MyEntity> {
       const response = await fetch(`${API_URL}/my-entities`, { ... });
       return response.json();
   }
   ```

3. **Create Feature Component** (`src/app/(app)/my-feature/page.tsx`):
   ```typescript
   "use client"; // If using interactivity
   // Implement component with proper TypeScript typing
   ```

4. **Add Navigation** (`src/components/app-sidebar.tsx`):
   ```typescript
   // Add route to sidebar navigation
   ```

### Database Migration Workflow

1. **Create Migration**:
   ```bash
   cd backend
   make migrate-new name=add_my_feature_table
   ```

2. **Edit Migration Files** (`backend/db/migrations/`):
   - Edit `XXXXXX_add_my_feature_table.up.sql` with CREATE TABLE
   - Edit `XXXXXX_add_my_feature_table.down.sql` with DROP TABLE

3. **Apply Migration**:
   ```bash
   make migrate-up
   ```

4. **Verify Schema**:
   ```bash
   psql $DATABASE_URL -d "\d my_feature_table"
   ```

### Testing Patterns

**Backend Testing**:
```go
func TestMyUseCase_Create(t *testing.T) {
    tests := []struct {
        name    string
        input   CreateRequest
        want    MyEntity
        wantErr bool
    }{
        // Test cases...
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            // Test implementation...
        })
    }
}
```

**Frontend Testing**:
- Use React Testing Library for component tests
- Mock API calls in test setup
- Test both happy path and error states

**Prompting Guidelines**:
- Please always prioritize using skills when prompting
- If no skill related, please inform in chat
