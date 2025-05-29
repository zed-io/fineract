# Fineract Hasura Mono-Repo

This mono-repo contains both the Hasura GraphQL backend and the Next.js frontend for the Fineract application.

## Architecture

- **Backend**: Hasura GraphQL Engine with PostgreSQL
- **Frontend**: Next.js with TypeScript, Apollo Client, and shadcn/ui
- **Authentication**: Firebase Authentication with JWT integration

## Prerequisites

- Node.js 16+ and npm
- Docker and Docker Compose
- Hasura CLI (optional, for development)

## Quick Start

1. **Clone and setup**:
   ```bash
   # Install dependencies
   npm run setup
   
   # Copy environment variables
   cp .env.example .env
   # Edit .env with your Firebase credentials
   ```

2. **Start the entire stack**:
   ```bash
   # Start PostgreSQL, Hasura, and Frontend
   npm run docker:up
   ```

   This will start:
   - PostgreSQL on port 5432
   - Hasura GraphQL Engine on port 8080
   - Next.js frontend on port 3000

3. **Access the applications**:
   - Frontend: http://localhost:3000
   - Hasura Console: http://localhost:8080/console (password: myadminsecretkey)
   - GraphQL API: http://localhost:8080/v1/graphql

## Development

### Running services individually

```bash
# Start only PostgreSQL
npm run postgres:dev

# Start only Hasura (requires PostgreSQL)
npm run hasura:dev

# Start only Frontend
npm run frontend:dev

# Start all in development mode
npm run dev
```

### Hasura Development

```bash
# Open Hasura console
npm run hasura:console

# Apply migrations
npm run hasura:migrate

# Apply metadata
npm run hasura:metadata
```

### Frontend Development

```bash
cd front-ends/credit-cloud-admin
npm run dev
```

## Project Structure

```
fineract/
├── hasura/                    # Hasura backend configuration
│   ├── metadata/             # Hasura metadata
│   ├── migrations/           # Database migrations
│   └── seeds/               # Database seed data
├── front-ends/
│   └── credit-cloud-admin/   # Next.js frontend
│       ├── src/
│       │   ├── app/         # Next.js app router pages
│       │   ├── components/  # React components
│       │   ├── services/    # API services
│       │   └── graphql/     # GraphQL queries/mutations
│       └── public/          # Static assets
├── docker-compose-hasura.yml # Docker compose for the stack
├── package.json             # Mono-repo scripts
└── .env                     # Environment variables
```

## Database Schema

The Hasura backend implements the complete Fineract data model including:
- Client management
- Savings accounts
- Loan management
- Group management
- Accounting
- Reporting

## Migration Status

✅ **Backend Migration**: Java to Hasura GraphQL (Complete)
- All tables and relationships defined
- Authentication and authorization configured
- Real-time subscriptions enabled

✅ **Frontend Migration**: Angular to Next.js (Complete)
- All modules converted to React/Next.js
- GraphQL integration with Apollo Client
- Modern UI with shadcn/ui components

## Environment Variables

### Required
- `FIREBASE_AUTH_DOMAIN`: Firebase auth domain
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_API_KEY`: Firebase API key

### Optional
- `HASURA_GRAPHQL_ADMIN_SECRET`: Hasura admin secret (default: myadminsecretkey)
- `NEXT_PUBLIC_GRAPHQL_ENDPOINT`: GraphQL endpoint (default: http://localhost:8080/v1/graphql)

## Deployment

### Production Build

```bash
# Build frontend for production
npm run build

# Build Docker images
npm run docker:build
```

### Docker Deployment

The application can be deployed using Docker Compose:

```bash
docker-compose -f docker-compose-hasura.yml up -d
```

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 3000, 5432, and 8080 are not in use
2. **Database connection**: Ensure PostgreSQL is healthy before starting Hasura
3. **Authentication errors**: Verify Firebase credentials in .env file

### Logs

```bash
# View all logs
docker-compose -f docker-compose-hasura.yml logs

# View specific service logs
docker-compose -f docker-compose-hasura.yml logs frontend
docker-compose -f docker-compose-hasura.yml logs hasura
docker-compose -f docker-compose-hasura.yml logs postgres
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Submit a pull request

## License

This project is licensed under the Apache License 2.0.