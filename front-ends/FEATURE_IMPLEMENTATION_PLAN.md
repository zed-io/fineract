# Fineract Frontend Implementation Plan

This document outlines the plan to implement all remaining Hasura backend features in the credit-cloud-admin frontend application, including role-based access control considerations.

## User Personas and RBAC Summary

The system supports the following user roles with varying permissions:

1. **Admin**: Full access to all features and functionalities
2. **Branch Manager**: Extensive access with approval capabilities but limited deletion powers
3. **Loan Officer**: Client and loan focused with limited approval rights
4. **Accountant**: Financial operations and reporting focused
5. **Read Only**: View-only access across all modules
6. **Client Self-Service**: Limited customer-facing features for self-service

## Implementation Phases

### Phase 1: Fixed and Recurring Deposits (2 weeks)

| Feature | Backend Status | Frontend Status | Priority | RBAC Considerations |
|---------|---------------|----------------|----------|---------------------|
| Fixed Deposit Account Creation | ✅ Complete | ❌ Missing | High | Admin, Branch Manager, Loan Officer can create |
| Fixed Deposit Account Management | ✅ Complete | ❌ Missing | High | Admin, Branch Manager can approve |
| Fixed Deposit Maturity Processing | ✅ Complete | ❌ Missing | Medium | Admin, Branch Manager, Accountant can process |
| Recurring Deposit Account Creation | ✅ Complete | ❌ Missing | High | Admin, Branch Manager, Loan Officer can create |
| Recurring Deposit Transactions | ✅ Complete | ❌ Missing | High | Admin, Branch Manager, Loan Officer, Self-Service can transact |
| Recurring Deposit Beneficiary | ✅ Complete | ❌ Missing | Medium | Admin, Branch Manager can manage |

#### Implementation Steps:

1. Create GraphQL queries/mutations for Fixed Deposits:
   - Create, Read, Update, Delete operations
   - Approval workflow
   - Maturity processing
   - Premature closure

2. Create Fixed Deposit frontend components:
   - Account creation form
   - Account details view
   - Transaction history
   - Maturity calculator
   - Approval workflow UI

3. Create GraphQL queries/mutations for Recurring Deposits:
   - Create, Read, Update, Delete operations
   - Deposit/withdrawal transactions
   - Beneficiary management
   - Interest calculations

4. Create Recurring Deposit frontend components:
   - Account creation form
   - Account details view
   - Transaction management
   - Installment tracking
   - Beneficiary management

5. Implement RBAC for these modules:
   - Hide creation/approval buttons based on permissions
   - Restrict transaction operations by role
   - Display appropriate error messages for unauthorized actions

### Phase 2: Share Accounts and Advanced Loan Features (2 weeks)

| Feature | Backend Status | Frontend Status | Priority | RBAC Considerations |
|---------|---------------|----------------|----------|---------------------|
| Share Account Creation | ✅ Complete | ❌ Missing | Medium | Admin, Branch Manager can create |
| Share Purchase/Redemption | ✅ Complete | ❌ Missing | Medium | Admin, Branch Manager, Loan Officer can transact |
| Share Certificates | ✅ Complete | ❌ Missing | Low | Admin, Branch Manager can issue |
| Loan Down Payments | ✅ Complete | ❌ Missing | High | Admin, Branch Manager, Loan Officer can manage |
| Loan Decision Engine | ✅ Complete | ❌ Missing | High | Admin, Branch Manager can configure |
| Credit Checks | ✅ Complete | ❌ Missing | High | Admin, Branch Manager, Loan Officer can view |

#### Implementation Steps:

1. Create GraphQL queries/mutations for Share Accounts:
   - Account operations
   - Share purchase/redemption
   - Certificate generation

2. Create Share Account frontend components:
   - Account creation
   - Transaction management
   - Certificate management

3. Enhance Loan Management with advanced features:
   - Down payment handling
   - Integration with decision engine
   - Credit check visualization
   - Advanced repayment options

4. Implement RBAC for these modules:
   - Restrict approval workflows by role
   - Limit configuration access to administrators
   - Control transaction capabilities by user type

### Phase 3: Advanced Accounting and Reporting (3 weeks)

| Feature | Backend Status | Frontend Status | Priority | RBAC Considerations |
|---------|---------------|----------------|----------|---------------------|
| Advanced GL Operations | ✅ Complete | ⚠️ Partial | High | Admin, Accountant can manage |
| Multi-currency Support | ✅ Complete | ❌ Missing | Medium | Admin, Accountant can configure |
| Consolidated Reporting | ✅ Complete | ❌ Missing | High | Admin, Branch Manager, Accountant can view |
| Custom Reports | ✅ Complete | ❌ Missing | Medium | Admin, Accountant can create |
| Regulatory Reporting | ✅ Complete | ❌ Missing | Medium | Admin, Accountant can generate |
| Interest Batch Processing | ✅ Complete | ❌ Missing | High | Admin, Accountant can process |

#### Implementation Steps:

1. Enhance Accounting module:
   - Advanced journal entries
   - Financial reporting
   - Multi-currency support
   - Account reconciliation

2. Implement Consolidated Reporting:
   - Portfolio analysis
   - Performance metrics
   - Risk dashboards
   - Trend analysis

3. Create Custom Report Builder:
   - Report template designer
   - Parameter configuration
   - Export functionality

4. Implement Interest Batch Processing:
   - Scheduling interface
   - Batch execution
   - Results visualization

5. Implement RBAC for these modules:
   - Restrict advanced accounting to Admin/Accountant
   - Limit report creation to authorized roles
   - Control batch processing access

### Phase 4: Integration Features and Advanced Capabilities (2 weeks)

| Feature | Backend Status | Frontend Status | Priority | RBAC Considerations |
|---------|---------------|----------------|----------|---------------------|
| Payment Gateway Integration | ✅ Complete | ❌ Missing | High | Admin can configure, all roles can use |
| Fraud Detection | ✅ Complete | ❌ Missing | Medium | Admin, Branch Manager can view/manage |
| Mobile Optimizations | ✅ Complete | ❌ Missing | Low | All roles affected |
| Digital Banking Features | ✅ Complete | ❌ Missing | Medium | Focus on Self-Service role |
| Savings Dormancy Management | ✅ Complete | ❌ Missing | Low | Admin, Branch Manager can configure |
| Savings Account Holds | ✅ Complete | ❌ Missing | Medium | Admin, Branch Manager, Accountant can manage |

#### Implementation Steps:

1. Implement Payment Gateway Integration:
   - Configuration interface
   - Transaction processing
   - Receipt generation

2. Create Fraud Detection capabilities:
   - Alert dashboard
   - Investigation workflow
   - Risk scoring visualization

3. Implement Savings Enhancements:
   - Dormancy management
   - Account holds
   - Enhanced statements

4. Add Digital Banking Features:
   - Self-service dashboard
   - Transaction history
   - Payment scheduling

5. Implement RBAC for these modules:
   - Restrict configuration to administrators
   - Limit fraud management to appropriate roles
   - Design self-service interface for customers

## Role-Based Access Implementation

For each new component, we'll:

1. **Check permissions during component rendering**:
   ```tsx
   import { useHasPermission } from '@/utils/permissions';

   function FixedDepositCreation() {
     const canCreate = useHasPermission('fixed_deposits_create');
     
     if (!canCreate) {
       return <AccessDeniedMessage module="Fixed Deposits" action="create" />;
     }
     
     return <FixedDepositForm />;
   }
   ```

2. **Hide/show UI elements based on permissions**:
   ```tsx
   function FixedDepositDetails({ accountId }) {
     const canApprove = useHasPermission('fixed_deposits_approve');
     
     return (
       <div>
         {/* Always visible content */}
         <AccountSummary id={accountId} />
         
         {/* Conditional actions */}
         {canApprove && (
           <Button onClick={handleApprove}>Approve Account</Button>
         )}
       </div>
     );
   }
   ```

3. **Protect API calls with permission checks**:
   ```tsx
   async function handleApproval() {
     if (!hasPermission('fixed_deposits_approve')) {
       showError('You do not have permission to approve accounts');
       return;
     }
     
     // Proceed with approval
   }
   ```

4. **Implement route guards for protected pages**:
   ```tsx
   // In Next.js app router
   export default function AccountingSettingsLayout({
     children,
   }: {
     children: React.ReactNode;
   }) {
     const canManage = useHasPermission('accounting_manage');
     
     if (!canManage) {
       redirect('/dashboard');
     }
     
     return <div>{children}</div>;
   }
   ```

## Testing Strategy

1. **Unit Testing**:
   - Test permission-based rendering
   - Verify conditional UI elements
   - Mock authentication state

2. **Integration Testing**:
   - Test form submissions with different roles
   - Verify API calls respect permissions
   - Test workflows end-to-end

3. **Role-Based Testing**:
   - Create test scenarios for each role
   - Verify appropriate access/restrictions
   - Test boundary cases

## Conclusion

This implementation plan provides a structured approach to bridge the gap between the Hasura backend capabilities and the credit-cloud-admin frontend, while ensuring proper role-based access control throughout the application. By following this phased approach, we'll achieve feature completeness while maintaining security and usability for all user roles.