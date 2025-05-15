# Backend Implementation Guide for Trinidad & Tobago Credit Unions

## Overview

This technical document details the backend implementation required to support the Trinidad and Tobago Credit Union modernization initiative. It provides developers with specific instructions for implementing the Hasura-based GraphQL API, service layer components, and integration points needed to meet the requirements identified in the user research.

## Core Components & Implementation Priority

### 1. Loan Module Implementation (High Priority)

The loan module is currently at 40% completion and requires significant development to meet the Credit Union's requirements.

#### Database Schema

Expand the existing loan schema in `/hasura/migrations/000004_loan_schema.up.sql` with:

```sql
-- Add specialized loan products for Credit Unions
ALTER TABLE loan_product 
ADD COLUMN is_credit_union_specific BOOLEAN DEFAULT FALSE,
ADD COLUMN requires_guarantor BOOLEAN DEFAULT FALSE,
ADD COLUMN allows_group_loans BOOLEAN DEFAULT FALSE;

-- Add digital document tracking
CREATE TABLE loan_document (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loan(id),
    document_type VARCHAR(50) NOT NULL,
    document_name VARCHAR(255) NOT NULL,
    document_location VARCHAR(255) NOT NULL,
    verification_status VARCHAR(20) DEFAULT 'PENDING',
    verification_date TIMESTAMP,
    verified_by UUID REFERENCES "user"(id),
    uploaded_by UUID NOT NULL REFERENCES "user"(id),
    uploaded_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_required BOOLEAN DEFAULT TRUE,
    rejection_reason VARCHAR(500),
    metadata JSONB
);

-- Add loan decisioning support
CREATE TABLE loan_decision (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID NOT NULL REFERENCES loan(id),
    decision_type VARCHAR(20) NOT NULL,
    decision_result VARCHAR(20) NOT NULL,
    decision_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    decision_by UUID REFERENCES "user"(id),
    risk_score DECIMAL(5,2),
    rejection_reason VARCHAR(500),
    approval_conditions JSONB,
    override_reason VARCHAR(500),
    automated_decision BOOLEAN DEFAULT FALSE,
    decision_factors JSONB,
    approval_level INTEGER DEFAULT 1,
    next_approval_level INTEGER,
    is_final BOOLEAN DEFAULT FALSE
);
```

#### Service Implementation

Create the following service files:

1. `/hasura/services/actions/src/services/loanOriginationService.ts` - Handles loan application processing
2. `/hasura/services/actions/src/services/loanDecisionService.ts` - Implements the loan decisioning algorithm
3. `/hasura/services/actions/src/services/loanDocumentService.ts` - Manages document uploads and verification

Key service methods to implement:

```typescript
// loanOriginationService.ts
async createLoanApplication(application: LoanApplicationRequest, userId: string): Promise<string>;
async updateLoanApplication(loanId: string, updates: LoanApplicationUpdate, userId: string): Promise<boolean>;
async submitLoanApplication(loanId: string, userId: string): Promise<SubmissionResult>;

// loanDecisionService.ts
async calculateRiskScore(loanId: string): Promise<RiskAssessmentResult>;
async makeLoanDecision(loanId: string, decisionData: DecisionData, userId?: string): Promise<LoanDecisionResult>;
async overrideDecision(loanId: string, overrideData: OverrideData, userId: string): Promise<boolean>;

// loanDocumentService.ts
async uploadDocument(loanId: string, document: DocumentUpload, userId: string): Promise<string>;
async verifyDocument(documentId: string, verification: DocumentVerification, userId: string): Promise<boolean>;
async getRequiredDocuments(productId: string): Promise<RequiredDocument[]>;
```

#### GraphQL Actions

Create actions in `/hasura/metadata/actions/loan_actions.yaml`:

```yaml
- name: createLoanApplication
  definition:
    kind: synchronous
    handler: '{{ACTIONS_BASE_URL}}/loan/application/create'
  permissions:
    - role: user
    - role: admin

- name: updateLoanApplication
  definition:
    kind: synchronous
    handler: '{{ACTIONS_BASE_URL}}/loan/application/update'
  permissions:
    - role: user
    - role: admin
    
- name: submitLoanApplication
  definition:
    kind: synchronous
    handler: '{{ACTIONS_BASE_URL}}/loan/application/submit'
  permissions:
    - role: user
    - role: admin

# Add remaining loan actions...
```

### 2. Digital Document Verification (High Priority)

#### Database Schema

Create a document management schema in `/hasura/migrations/000008_document_management_schema.up.sql`:

```sql
CREATE TYPE document_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE document_type AS ENUM ('identification', 'address_proof', 'income_proof', 'consent_form', 'loan_agreement', 'other');

CREATE TABLE document (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    document_type document_type NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    file_location VARCHAR(500) NOT NULL,
    status document_status DEFAULT 'pending',
    uploaded_by UUID NOT NULL REFERENCES "user"(id),
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_by UUID REFERENCES "user"(id),
    verified_at TIMESTAMP,
    rejection_reason VARCHAR(500),
    expiry_date DATE,
    document_number VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB
);

CREATE INDEX idx_document_entity ON document(entity_type, entity_id);
CREATE INDEX idx_document_status ON document(status);
```

#### Service Implementation

Create `/hasura/services/actions/src/services/documentService.ts`:

```typescript
export class DocumentService {
  async uploadDocument(entityType: string, entityId: string, document: DocumentUpload, userId: string): Promise<string>;
  async verifyDocument(documentId: string, verification: DocumentVerification, userId: string): Promise<boolean>;
  async rejectDocument(documentId: string, reason: string, userId: string): Promise<boolean>;
  async getDocumentsByEntity(entityType: string, entityId: string): Promise<Document[]>;
  async analyzeDocument(documentId: string): Promise<DocumentAnalysisResult>;
}
```

For document analysis, implement an integration service with an OCR provider:

```typescript
export class DocumentAnalysisService {
  async extractText(documentLocation: string): Promise<string>;
  async verifyIdDocument(documentLocation: string): Promise<IdVerificationResult>;
  async detectFraud(documentLocation: string): Promise<FraudDetectionResult>;
}
```

### 3. Automated Loan Decisioning (High Priority)

#### Database Schema

Build a decisioning rules engine in `/hasura/migrations/000009_loan_decisioning_schema.up.sql`:

```sql
CREATE TABLE decisioning_ruleset (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    product_id UUID REFERENCES loan_product(id),
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER NOT NULL DEFAULT 1,
    created_by UUID REFERENCES "user"(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES "user"(id),
    updated_at TIMESTAMP
);

CREATE TABLE decisioning_rule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ruleset_id UUID NOT NULL REFERENCES decisioning_ruleset(id),
    rule_name VARCHAR(100) NOT NULL,
    rule_definition JSONB NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    priority INTEGER NOT NULL DEFAULT 1,
    action_on_trigger VARCHAR(50) NOT NULL,
    risk_score_adjustment DECIMAL(5,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES "user"(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES "user"(id),
    updated_at TIMESTAMP
);
```

#### Service Implementation

Create `/hasura/services/actions/src/services/decisionEngineService.ts`:

```typescript
export class DecisionEngineService {
  async evaluateRules(loanId: string, data: ApplicationData): Promise<RuleEvaluationResult>;
  async calculateRiskScore(loanId: string, data: ApplicationData): Promise<RiskScore>;
  async getDecisionRecommendation(loanId: string, riskScore: number): Promise<DecisionRecommendation>;
  async recordDecision(loanId: string, decision: Decision, userId?: string): Promise<string>;
  async manageRuleSet(ruleSetData: RuleSetManagement, userId: string): Promise<RuleSetResult>;
}
```

### 4. Real-time Payment Integration (High Priority)

#### Database Schema

Add payment integration schemas in `/hasura/migrations/000010_payment_integration_schema.up.sql`:

```sql
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'reversed');
CREATE TYPE payment_type AS ENUM ('ach', 'card', 'mobile_wallet', 'bank_transfer', 'cash');
CREATE TYPE integration_type AS ENUM ('ach_provider', 'card_processor', 'mobile_wallet', 'bank_api');

CREATE TABLE payment_integration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    integration_type integration_type NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    configuration JSONB NOT NULL,
    created_by UUID REFERENCES "user"(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES "user"(id),
    updated_at TIMESTAMP
);

CREATE TABLE payment_transaction (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id VARCHAR(100),
    integration_id UUID REFERENCES payment_integration(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    payment_type payment_type NOT NULL,
    amount DECIMAL(19, 6) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'TTD',
    status payment_status NOT NULL DEFAULT 'pending',
    payment_date TIMESTAMP NOT NULL,
    description TEXT,
    metadata JSONB,
    payment_method_details JSONB,
    error_message TEXT,
    created_by UUID REFERENCES "user"(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX idx_payment_transaction_entity ON payment_transaction(entity_type, entity_id);
CREATE INDEX idx_payment_transaction_status ON payment_transaction(status);
```

#### Service Implementation

Create payment integration services:

1. `/hasura/services/actions/src/services/paymentService.ts` - Core payment processing
2. `/hasura/services/actions/src/services/integration/achService.ts` - ACH integration
3. `/hasura/services/actions/src/services/integration/mobileWalletService.ts` - Mobile wallet integration

```typescript
// paymentService.ts
export class PaymentService {
  async initiatePayment(paymentData: PaymentRequest, userId?: string): Promise<PaymentResult>;
  async checkPaymentStatus(transactionId: string): Promise<PaymentStatus>;
  async cancelPayment(transactionId: string, reason: string, userId: string): Promise<boolean>;
  async getTransactionHistory(entityType: string, entityId: string, filters?: TransactionFilters): Promise<Transaction[]>;
  async reconcileTransactions(date: string): Promise<ReconciliationSummary>;
}

// achService.ts
export class AchService {
  async initiateAchTransfer(transferData: AchTransferRequest): Promise<AchTransferResult>;
  async verifyBankAccount(accountData: BankAccountVerification): Promise<VerificationResult>;
}
```

### 5. KYC/AML Automation (Medium Priority)

#### Database Schema

Create KYC/AML schemas in `/hasura/migrations/000011_kyc_aml_schema.up.sql`:

```sql
CREATE TYPE verification_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'extreme');

CREATE TABLE kyc_verification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES client(id),
    verification_type VARCHAR(50) NOT NULL,
    status verification_status NOT NULL DEFAULT 'pending',
    risk_level risk_level,
    verification_date TIMESTAMP,
    expiry_date TIMESTAMP,
    verification_data JSONB,
    verification_provider VARCHAR(100),
    reference_id VARCHAR(100),
    failure_reason TEXT,
    override_reason TEXT,
    override_by UUID REFERENCES "user"(id),
    created_by UUID REFERENCES "user"(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE aml_alert (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    risk_level risk_level NOT NULL,
    generated_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    description TEXT NOT NULL,
    detection_rule VARCHAR(100),
    resolved_date TIMESTAMP,
    resolved_by UUID REFERENCES "user"(id),
    resolution_notes TEXT,
    is_false_positive BOOLEAN,
    report_filed BOOLEAN DEFAULT FALSE,
    report_reference VARCHAR(100),
    report_date TIMESTAMP
);

CREATE INDEX idx_kyc_verification_client ON kyc_verification(client_id);
CREATE INDEX idx_kyc_verification_status ON kyc_verification(status);
CREATE INDEX idx_aml_alert_entity ON aml_alert(entity_type, entity_id);
CREATE INDEX idx_aml_alert_status ON aml_alert(status);
```

#### Service Implementation

Create the following services:

1. `/hasura/services/actions/src/services/kycService.ts` - KYC verification
2. `/hasura/services/actions/src/services/amlService.ts` - AML monitoring
3. `/hasura/services/scheduled-jobs/src/jobs/amlMonitoringJob.ts` - Background AML monitoring

```typescript
// kycService.ts
export class KycService {
  async initiateKycVerification(clientId: string, verificationType: string, userData: any, userId?: string): Promise<string>;
  async verifyIdentity(clientId: string, idData: IdentityData): Promise<IdentityVerificationResult>;
  async performPepSanctionsCheck(clientId: string): Promise<SanctionsCheckResult>;
  async overrideVerification(verificationId: string, overrideData: OverrideData, userId: string): Promise<boolean>;
  async getVerificationStatus(clientId: string): Promise<VerificationStatusSummary>;
}

// amlService.ts
export class AmlService {
  async analyzeTransaction(transactionData: TransactionData): Promise<AmlAnalysisResult>;
  async generateAlert(alertData: AmlAlertData): Promise<string>;
  async resolveAlert(alertId: string, resolutionData: AlertResolution, userId: string): Promise<boolean>;
  async fileRegulatorReport(alertId: string, reportData: RegulatorReportData, userId: string): Promise<string>;
}
```

### 6. Analytics & Reporting Data Layer (Medium Priority)

#### Database Schema

Create analytics schema in `/hasura/migrations/000012_analytics_reporting_schema.up.sql`:

```sql
CREATE TABLE report_definition (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    report_type VARCHAR(50) NOT NULL,
    query_definition JSONB NOT NULL,
    parameters JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES "user"(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES "user"(id),
    updated_at TIMESTAMP
);

CREATE TABLE report_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_definition_id UUID NOT NULL REFERENCES report_definition(id),
    schedule_type VARCHAR(20) NOT NULL,
    cron_expression VARCHAR(100),
    recipients JSONB,
    parameters JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    created_by UUID REFERENCES "user"(id),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES "user"(id),
    updated_at TIMESTAMP
);

CREATE TABLE report_execution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_definition_id UUID NOT NULL REFERENCES report_definition(id),
    schedule_id UUID REFERENCES report_schedule(id),
    execution_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    parameters JSONB,
    status VARCHAR(20) NOT NULL,
    result_location VARCHAR(500),
    error_message TEXT,
    executed_by UUID REFERENCES "user"(id),
    execution_time INTEGER -- in milliseconds
);

CREATE TABLE analytics_metric (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value JSONB NOT NULL,
    dimension VARCHAR(100),
    dimension_value VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id UUID,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    period_type VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL
);

CREATE INDEX idx_analytics_metric_name_period ON analytics_metric(metric_name, period_type, period_start, period_end);
CREATE INDEX idx_analytics_entity ON analytics_metric(entity_type, entity_id);
```

#### Service Implementation

Create analytics and reporting services:

1. `/hasura/services/actions/src/services/reportingService.ts` - Report generation
2. `/hasura/services/actions/src/services/analyticsService.ts` - Analytics calculations
3. `/hasura/services/scheduled-jobs/src/jobs/analyticsAggregationJob.ts` - Periodic data aggregation

```typescript
// reportingService.ts
export class ReportingService {
  async generateReport(reportId: string, parameters: any, userId?: string): Promise<ReportGenerationResult>;
  async scheduleReport(scheduleData: ReportScheduleRequest, userId: string): Promise<string>;
  async getReportHistory(reportId: string, filters?: ReportFilters): Promise<ReportExecution[]>;
  async exportReport(executionId: string, format: string): Promise<ExportResult>;
}

// analyticsService.ts
export class AnalyticsService {
  async getDashboardMetrics(filters?: MetricFilters): Promise<DashboardMetrics>;
  async getLoanPerformanceMetrics(filters?: LoanMetricFilters): Promise<LoanPerformanceMetrics>;
  async getMemberActivityMetrics(filters?: MemberMetricFilters): Promise<MemberActivityMetrics>;
  async getPortfolioRiskMetrics(filters?: RiskMetricFilters): Promise<PortfolioRiskMetrics>;
  async getOperationalMetrics(filters?: OperationalMetricFilters): Promise<OperationalMetrics>;
}
```

### 7. Digital Member Onboarding Workflow (High Priority)

#### Database Schema

Create onboarding schema in `/hasura/migrations/000013_digital_onboarding_schema.up.sql`:

```sql
CREATE TYPE onboarding_status AS ENUM ('initiated', 'profile_created', 'documents_uploaded', 'verification_pending', 'verification_completed', 'approved', 'rejected', 'cancelled');

CREATE TABLE onboarding_application (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number VARCHAR(50) UNIQUE NOT NULL,
    status onboarding_status NOT NULL DEFAULT 'initiated',
    applicant_data JSONB NOT NULL,
    current_step VARCHAR(50) NOT NULL DEFAULT 'personal_info',
    submission_date TIMESTAMP,
    completion_date TIMESTAMP,
    rejection_reason TEXT,
    created_ip VARCHAR(45),
    device_info JSONB,
    source_channel VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE onboarding_document (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES onboarding_application(id),
    document_type document_type NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size INTEGER NOT NULL,
    file_location VARCHAR(500) NOT NULL,
    status document_status DEFAULT 'pending',
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_by UUID REFERENCES "user"(id),
    verified_at TIMESTAMP,
    rejection_reason VARCHAR(500)
);

CREATE TABLE onboarding_verification (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES onboarding_application(id),
    verification_type VARCHAR(50) NOT NULL,
    status verification_status NOT NULL DEFAULT 'pending',
    verification_date TIMESTAMP,
    verification_data JSONB,
    verification_result JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE TABLE onboarding_approval (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES onboarding_application(id),
    approved_by UUID REFERENCES "user"(id),
    approval_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    approval_level INTEGER NOT NULL DEFAULT 1,
    is_final BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_onboarding_application_status ON onboarding_application(status);
CREATE INDEX idx_onboarding_document_application ON onboarding_document(application_id);
CREATE INDEX idx_onboarding_verification_application ON onboarding_verification(application_id);
```

#### Service Implementation

Create onboarding services:

1. `/hasura/services/actions/src/services/onboardingService.ts` - Main onboarding workflow
2. `/hasura/services/actions/src/services/onboardingVerificationService.ts` - Verification steps

```typescript
// onboardingService.ts
export class OnboardingService {
  async initiateOnboarding(requestData: OnboardingRequest): Promise<OnboardingInitiationResult>;
  async updateApplicationStep(applicationId: string, stepData: StepData): Promise<StepUpdateResult>;
  async submitApplication(applicationId: string): Promise<SubmissionResult>;
  async reviewApplication(applicationId: string, reviewData: ReviewData, userId: string): Promise<ReviewResult>;
  async approveApplication(applicationId: string, approvalData: ApprovalData, userId: string): Promise<ApprovalResult>;
  async rejectApplication(applicationId: string, rejectionData: RejectionData, userId: string): Promise<boolean>;
  async convertToMember(applicationId: string, accountData: AccountCreationData, userId: string): Promise<string>;
}

// onboardingVerificationService.ts
export class OnboardingVerificationService {
  async verifyIdentity(applicationId: string): Promise<IdentityVerificationResult>;
  async verifyAddress(applicationId: string): Promise<AddressVerificationResult>;
  async verifyDocuments(applicationId: string): Promise<DocumentVerificationResult>;
  async performBackgroundChecks(applicationId: string): Promise<BackgroundCheckResult>;
}
```

### 8. API Gateway & Integration Framework (Medium Priority)

#### Core Integration Framework

Create integration framework in `/hasura/services/integration-gateway/`:

```
/hasura/services/integration-gateway/
├── src/
│   ├── config/
│   │   ├── gateway.config.ts
│   │   └── providers.config.ts
│   ├── controllers/
│   │   ├── gatewayController.ts
│   │   └── webhookController.ts
│   ├── middleware/
│   │   ├── authMiddleware.ts
│   │   ├── rateLimitMiddleware.ts
│   │   └── validationMiddleware.ts
│   ├── providers/
│   │   ├── achProvider.ts
│   │   ├── bankApiProvider.ts
│   │   ├── creditBureauProvider.ts
│   │   ├── kycProvider.ts
│   │   └── paymentGatewayProvider.ts
│   ├── routes/
│   │   ├── gatewayRoutes.ts
│   │   └── webhookRoutes.ts
│   ├── services/
│   │   ├── apiKeyService.ts
│   │   ├── logService.ts
│   │   └── transformationService.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── encryption.ts
│   │   ├── httpClient.ts
│   │   └── validators.ts
│   └── index.ts
└── package.json
```

Key Service Implementations:

```typescript
// bankApiProvider.ts
export class BankApiProvider {
  async getAccountDetails(accountNumber: string, bankCode: string): Promise<BankAccountDetails>;
  async verifyAccount(accountNumber: string, bankCode: string): Promise<AccountVerificationResult>;
  async initiateTransfer(transferData: TransferRequest): Promise<TransferResult>;
  async getTransferStatus(transferId: string): Promise<TransferStatus>;
}

// gatewayController.ts
export class GatewayController {
  async routeRequest(req: Request, res: Response): Promise<void>;
  async transformRequest(req: Request, provider: string): Promise<any>;
  async transformResponse(response: any, provider: string): Promise<any>;
  async logTransaction(transaction: TransactionLog): Promise<void>;
}
```

## Development Standards

### Error Handling

Implement consistent error handling across all services:

```typescript
export class ApplicationError extends Error {
  statusCode: number;
  errorCode: string;

  constructor(message: string, statusCode: number = 400, errorCode: string = 'GENERIC_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }
}

// Example specialized errors
export class ValidationError extends ApplicationError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message: string = 'You are not authorized to perform this action') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}
```

### Logging

Implement structured logging across all services:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'hasura-actions' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Usage example
logger.info('Processing loan application', { 
  loanId: 'abc123',
  userId: 'user456',
  productId: 'prod789' 
});
```

### Testing Strategy

Implement comprehensive testing:

1. Unit Tests: For service methods using Jest
2. Integration Tests: For API endpoints
3. Database Tests: For migrations and complex queries

Example test case:

```typescript
// loanDecisionService.test.ts
describe('LoanDecisionService', () => {
  let service: LoanDecisionService;
  
  beforeEach(() => {
    service = new LoanDecisionService();
    // Setup mocks and test data
  });
  
  describe('calculateRiskScore', () => {
    it('should calculate low risk score for good credit history', async () => {
      // Arrange
      const loanId = 'test-loan-id';
      const applicationData = {
        creditScore: 750,
        income: 5000,
        debts: 1000,
        loanAmount: 10000,
        loanTerm: 24
      };
      
      // Act
      const result = await service.calculateRiskScore(loanId, applicationData);
      
      // Assert
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.riskLevel).toBe('low');
    });
    
    it('should calculate high risk score for poor credit history', async () => {
      // Arrange
      const loanId = 'test-loan-id';
      const applicationData = {
        creditScore: 580,
        income: 3000,
        debts: 2000,
        loanAmount: 20000,
        loanTerm: 36
      };
      
      // Act
      const result = await service.calculateRiskScore(loanId, applicationData);
      
      // Assert
      expect(result.score).toBeLessThan(50);
      expect(result.riskLevel).toBe('high');
    });
  });
});
```

## Deployment & Infrastructure

### Docker Configuration

Create Docker configurations for each service component:

```yaml
# docker-compose.yml for development
version: '3.8'

services:
  postgres:
    image: postgres:14
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: postgrespassword
      POSTGRES_USER: postgres
      POSTGRES_DB: fineract
    volumes:
      - postgres-data:/var/lib/postgresql/data

  hasura:
    image: hasura/graphql-engine:v2.25.0
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    environment:
      HASURA_GRAPHQL_DATABASE_URL: postgres://postgres:postgrespassword@postgres:5432/fineract
      HASURA_GRAPHQL_ENABLE_CONSOLE: "true"
      HASURA_GRAPHQL_DEV_MODE: "true"
      HASURA_GRAPHQL_ADMIN_SECRET: adminpassword
      HASURA_GRAPHQL_JWT_SECRET: '{"type":"HS256", "key":"your-jwt-secret-key"}'
      ACTIONS_BASE_URL: http://actions:3000

  actions:
    build: 
      context: ./services/actions
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://postgres:postgrespassword@postgres:5432/fineract
      NODE_ENV: development
      JWT_SECRET: your-jwt-secret-key
    volumes:
      - ./services/actions:/app
      - /app/node_modules

  scheduled-jobs:
    build:
      context: ./services/scheduled-jobs
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgres://postgres:postgrespassword@postgres:5432/fineract
      NODE_ENV: development
    volumes:
      - ./services/scheduled-jobs:/app
      - /app/node_modules

  integration-gateway:
    build:
      context: ./services/integration-gateway
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgres://postgres:postgrespassword@postgres:5432/fineract
      NODE_ENV: development
    volumes:
      - ./services/integration-gateway:/app
      - /app/node_modules

volumes:
  postgres-data:
```

### CI/CD Pipeline Configuration

Create GitHub Actions workflow:

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18.x'
      - name: Install dependencies
        run: |
          cd hasura/services/actions
          npm ci
      - name: Run tests
        run: |
          cd hasura/services/actions
          npm test

  build:
    runs-on: ubuntu-latest
    needs: test
    if: github.event_name == 'push'
    steps:
      - uses: actions/checkout@v3
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      - name: Login to DockerHub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - name: Build and push actions service
        uses: docker/build-push-action@v3
        with:
          context: ./hasura/services/actions
          push: true
          tags: yourusername/fineract-actions:latest
```

## Next Steps

1. Implement the high-priority components in order:
   - Loan Module Implementation
   - Digital Document Verification
   - Automated Loan Decisioning
   - Real-time Payment Integration
   - Digital Member Onboarding Workflow

2. Follow with medium-priority components:
   - KYC/AML Automation
   - Analytics & Reporting Data Layer
   - API Gateway & Integration Framework

3. Set up development environment with Docker Compose

4. Establish CI/CD pipeline for automated testing and deployment