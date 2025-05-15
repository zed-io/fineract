# Fineract to Hasura Migration

This project contains the infrastructure and code for migrating Apache Fineract from its Java-based implementation to a modern GraphQL API using Hasura and TypeScript microservices.

## Setup Instructions

### Prerequisites

- Docker and Docker Compose
- Node.js 18+
- PostgreSQL client (optional, for direct database access)

### Getting Started

1. Clone the repository
2. Navigate to the `hasura-migration` directory
3. Start the environment:
   ```
   docker-compose up -d
   ```
4. Access the Hasura console at: http://localhost:8080
   - Admin secret: `fineract_hasura_secret`

5. Access pgAdmin at: http://localhost:5050
   - Email: `admin@fineract.org`
   - Password: `admin`

## Project Structure

```
hasura-migration/
├── docker-compose.yml        # Docker services configuration
├── migrations/               # Database migration SQL files
├── metadata/                 # Hasura metadata files
└── services/                 # Microservices
    ├── actions/              # Hasura Actions service
    │   ├── src/              # Source code
    │   │   ├── handlers/     # Action handlers for business logic
    │   │   ├── services/     # Core business logic implementations
    │   │   ├── types/        # TypeScript type definitions
    │   │   └── utils/        # Utility functions and middleware
    │   ├── Dockerfile        # Docker build instructions
    │   └── package.json      # Node.js dependencies
    ├── event-handlers/       # Event handler service
    └── scheduled-jobs/       # Scheduled jobs service
```

## Development Workflow

### Running Actions Service Locally

1. Navigate to the actions service:
   ```
   cd services/actions
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the service in development mode:
   ```
   npm run dev
   ```

### Adding New Actions

1. Define the action in Hasura console
2. Implement the corresponding handler in `services/actions/src/handlers/`
3. Add any complex business logic in `services/actions/src/services/`

### Running Migrations

Database migrations are applied automatically when the Docker services start. To manually apply migrations:

```
hasura migrate apply --endpoint http://localhost:8080 --admin-secret fineract_hasura_secret
```

## Core Features

The migration implements the following Fineract features:

1. **Authentication & Authorization**
   - JWT-based authentication
   - Role-based access control

2. **Client Management**
   - Create and activate clients
   - Client search and filtering

3. **Loan Management**
   - Loan calculation and scheduling
   - Loan approval, disbursement, and repayment

4. **Savings Management**
   - Savings account creation
   - Deposits and withdrawals

## API Documentation

Once the environment is running, API documentation is available at:
- Hasura GraphQL API: http://localhost:8080/console/api/api-explorer
- Actions API: http://localhost:3000/health

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Submit a pull request

## License

This project is licensed under the Apache License v2.0 - see the LICENSE file for details.