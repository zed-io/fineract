import { v4 as uuidv4 } from 'uuid';
import { db } from '../utils/db';
import { logger } from '../utils/logger';
import { CreditCheckService } from './creditCheckService';
import {
  LoanDecision,
  DecisionResult,
  RiskLevel,
  DecisionFactorType,
  DecisionFactor,
  ApprovalCondition,
  LoanAssessmentRequest,
  LoanAssessmentResponse,
  MakeLoanDecisionRequest,
  MakeLoanDecisionResponse,
  OverrideLoanDecisionRequest,
  OverrideLoanDecisionResponse,
  GetLoanDecisionHistoryRequest,
  LoanDecisionHistoryResponse,
  EvaluateRulesetRequest,
  RulesetEvaluationResponse
} from '../models/loanDecision';
import { WorkflowStage, WorkflowStatus } from '../models/loanWorkflow';

/**
 * Service class for loan decisioning operations
 * Handles automated and manual loan decisioning
 */
export class LoanDecisionService {
  private creditCheckService: CreditCheckService;

  constructor() {
    this.creditCheckService = new CreditCheckService();
  }
  /**
   * Assess a loan application using decision rules
   * @param request The assessment request
   * @param userId The user ID of the person making the request
   * @returns Assessment result with decision factors
   */
  async assessLoanApplication(request: LoanAssessmentRequest, userId?: string): Promise<LoanAssessmentResponse> {
    logger.info('Assessing loan application', { loanId: request.loanId, userId });

    return db.transaction(async (client) => {
      // Step 1: Get loan details
      const loanQuery = await client.query(
        `SELECT 
          l.*,
          lp.decisioning_ruleset_id,
          lp.min_credit_score,
          lp.max_debt_to_income_ratio,
          lp.credit_committee_approval_required,
          lp.approval_levels,
          c.id as client_id,
          c.firstname,
          c.lastname,
          c.member_since
        FROM 
          fineract_default.loan l
        JOIN
          fineract_default.loan_product lp ON l.product_id = lp.id
        JOIN
          fineract_default.client c ON l.client_id = c.id
        WHERE 
          l.id = $1`,
        [request.loanId]
      );

      if (loanQuery.rows.length === 0) {
        throw new Error('Loan not found');
      }

      const loan = loanQuery.rows[0];

      // Optional: Check if this loan is already in final decision state and force reevaluation is not set
      if (!request.forceReevaluation) {
        const existingDecisionQuery = await client.query(
          `SELECT * FROM fineract_default.loan_decision 
           WHERE loan_id = $1 AND is_final = true 
           ORDER BY decision_timestamp DESC LIMIT 1`,
          [request.loanId]
        );

        if (existingDecisionQuery.rows.length > 0 && existingDecisionQuery.rows[0].is_final) {
          logger.info('Loan already has a final decision, returning existing decision', { loanId: request.loanId });
          
          // Format and return the existing decision
          const existingDecision = existingDecisionQuery.rows[0];
          return this.formatDecisionResponse(existingDecision, loan);
        }
      }

      // Step 2: Get document verification status if requested
      let documentVerificationComplete = true;
      let documentVerificationPassed = true;
      let documentFactors: DecisionFactor[] = [];
      
      if (request.includeDocumentVerification) {
        const documentQuery = await client.query(
          `SELECT
            document_type,
            status,
            verification_status,
            is_required
          FROM
            fineract_default.loan_document
          WHERE
            loan_id = $1`,
          [request.loanId]
        );

        // Check if all required documents are verified
        const requiredDocuments = documentQuery.rows.filter(doc => doc.is_required);
        
        if (requiredDocuments.length === 0) {
          documentFactors.push({
            type: DecisionFactorType.CUSTOM,
            name: 'missing_required_documents',
            value: true,
            impact: 'negative',
            details: 'No required documents have been uploaded'
          });
          documentVerificationComplete = false;
          documentVerificationPassed = false;
        } else {
          const pendingDocuments = requiredDocuments.filter(
            doc => doc.verification_status !== 'verified'
          );

          if (pendingDocuments.length > 0) {
            documentFactors.push({
              type: DecisionFactorType.CUSTOM,
              name: 'pending_document_verification',
              value: pendingDocuments.length,
              impact: 'negative',
              details: `${pendingDocuments.length} required documents pending verification`
            });
            documentVerificationComplete = false;
            documentVerificationPassed = false;
          } else {
            documentFactors.push({
              type: DecisionFactorType.CUSTOM,
              name: 'documents_verified',
              value: true,
              impact: 'positive',
              details: 'All required documents verified successfully'
            });
          }
        }
      }

      // Step 3: Check employment verification if requested
      let employmentFactors: DecisionFactor[] = [];
      
      if (request.includeEmploymentVerification) {
        if (!loan.employment_verified) {
          employmentFactors.push({
            type: DecisionFactorType.EMPLOYMENT,
            name: 'employment_verification',
            value: false,
            impact: 'negative',
            details: 'Employment not yet verified'
          });
        } else {
          employmentFactors.push({
            type: DecisionFactorType.EMPLOYMENT,
            name: 'employment_verification',
            value: true,
            impact: 'positive',
            details: 'Employment verified successfully'
          });
        }
      }

      // Step 4: Check credit score if requested
      let creditFactors: DecisionFactor[] = [];

      if (request.includeCreditCheck) {
        // Check if loan has a recent credit score
        const needsCreditCheck = !loan.credit_score ||
          !loan.credit_check_date ||
          this.isCreditScoreOutdated(loan.credit_check_date);

        if (needsCreditCheck) {
          // Perform a new credit check
          logger.info('Performing credit check for loan assessment', {
            loanId: request.loanId,
            clientId: loan.client_id
          });

          try {
            const creditCheck = await this.creditCheckService.performCreditCheck({
              clientId: loan.client_id,
              firstName: loan.firstname,
              lastName: loan.lastname,
              dateOfBirth: loan.date_of_birth,
              requestSource: 'loan_assessment'
            });

            // Update loan with new credit score
            await client.query(
              `UPDATE fineract_default.loan
               SET credit_score = $1, credit_check_date = $2
               WHERE id = $3`,
              [creditCheck.creditScore, creditCheck.scoreDate, request.loanId]
            );

            // Update loan object for further processing
            loan.credit_score = creditCheck.creditScore;

            // Add credit check factors
            creditFactors.push({
              type: DecisionFactorType.CREDIT_SCORE,
              name: 'credit_score',
              value: creditCheck.creditScore,
              threshold: loan.min_credit_score,
              impact: creditCheck.creditScore >= loan.min_credit_score ? 'positive' : 'negative',
              details: `Credit score: ${creditCheck.creditScore}, Minimum required: ${loan.min_credit_score}`
            });

            // Add delinquency factor if present
            if (creditCheck.delinquencyStatus) {
              creditFactors.push({
                type: DecisionFactorType.CUSTOM,
                name: 'delinquency_status',
                value: true,
                impact: 'negative',
                details: `Delinquent payments found in credit history. Max days in arrears: ${creditCheck.maxDaysInArrears || 'unknown'}`
              });
            }

            // Add bankruptcy factor if present
            if (creditCheck.bankruptcyFlag) {
              creditFactors.push({
                type: DecisionFactorType.CUSTOM,
                name: 'bankruptcy_flag',
                value: true,
                impact: 'negative',
                details: 'Bankruptcy record found in credit history'
              });
            }

            // Add active loans factor
            if (creditCheck.activeLoans > 0) {
              creditFactors.push({
                type: DecisionFactorType.CUSTOM,
                name: 'active_loans',
                value: creditCheck.activeLoans,
                threshold: 3, // Assuming 3+ loans is concerning
                impact: creditCheck.activeLoans >= 3 ? 'negative' : 'neutral',
                details: `Client has ${creditCheck.activeLoans} active loans with total outstanding of ${creditCheck.totalOutstanding || 'unknown'}`
              });
            }

            // Add other factors from credit check
            if (creditCheck.fraudFlag) {
              creditFactors.push({
                type: DecisionFactorType.CUSTOM,
                name: 'fraud_flag',
                value: true,
                impact: 'negative',
                details: 'Potential fraud indicators found in credit history'
              });
            }
          } catch (error) {
            logger.error('Failed to perform credit check during loan assessment', {
              loanId: request.loanId,
              clientId: loan.client_id,
              error
            });

            // Add error factor
            creditFactors.push({
              type: DecisionFactorType.CREDIT_SCORE,
              name: 'credit_check_error',
              value: true,
              impact: 'negative',
              details: `Failed to retrieve credit score: ${error.message}`
            });
          }
        } else {
          // Use existing credit score from loan
          creditFactors.push({
            type: DecisionFactorType.CREDIT_SCORE,
            name: 'credit_score',
            value: loan.credit_score,
            threshold: loan.min_credit_score,
            impact: loan.credit_score >= loan.min_credit_score ? 'positive' : 'negative',
            details: `Credit score: ${loan.credit_score}, Minimum required: ${loan.min_credit_score}`
          });
        }

        // Check debt-to-income ratio if available
        if (loan.debt_to_income_ratio) {
          creditFactors.push({
            type: DecisionFactorType.DEBT_RATIO,
            name: 'debt_to_income_ratio',
            value: loan.debt_to_income_ratio,
            threshold: loan.max_debt_to_income_ratio,
            impact: loan.debt_to_income_ratio <= loan.max_debt_to_income_ratio ? 'positive' : 'negative',
            details: `Debt-to-income ratio: ${(loan.debt_to_income_ratio * 100).toFixed(2)}%, Maximum allowed: ${(loan.max_debt_to_income_ratio * 100).toFixed(2)}%`
          });
        }
      }

      // Step 5: Evaluate member history and savings
      const membershipYears = this.calculateMembershipYears(loan.member_since);
      const memberFactors: DecisionFactor[] = [
        {
          type: DecisionFactorType.CUSTOM,
          name: 'membership_duration',
          value: membershipYears,
          threshold: loan.member_years_required,
          impact: membershipYears >= loan.member_years_required ? 'positive' : 'negative',
          details: `Member for ${membershipYears} years, Required: ${loan.member_years_required} years`
        }
      ];

      // Check savings account if required
      if (loan.requires_savings_account && !loan.member_savings_account_id) {
        memberFactors.push({
          type: DecisionFactorType.SAVINGS_HISTORY,
          name: 'missing_savings_account',
          value: true,
          impact: 'negative',
          details: 'Required savings account not linked'
        });
      }

      // Step 6: Check loan amount vs income for repayment capacity
      let repaymentFactors: DecisionFactor[] = [];
      
      if (loan.monthly_income && loan.monthly_expenses) {
        const disposableIncome = loan.monthly_income - loan.monthly_expenses;
        
        // Get repayment amount from loan schedule
        const scheduleQuery = await client.query(
          `SELECT 
            SUM(principal_amount + interest_amount + fee_charges_amount + penalty_charges_amount) / COUNT(*) as avg_installment
          FROM 
            fineract_default.loan_repayment_schedule
          WHERE 
            loan_id = $1 AND completed_derived = false`,
          [request.loanId]
        );
        
        let avgInstallment = 0;
        if (scheduleQuery.rows.length > 0) {
          avgInstallment = scheduleQuery.rows[0].avg_installment || 0;
        }
        
        if (avgInstallment > 0) {
          const repaymentRatio = avgInstallment / disposableIncome;
          repaymentFactors.push({
            type: DecisionFactorType.REPAYMENT_CAPACITY,
            name: 'repayment_capacity',
            value: repaymentRatio,
            threshold: 0.5, // Usually 50% of disposable income is a good threshold
            impact: repaymentRatio <= 0.5 ? 'positive' : 'negative',
            details: `Installment: ${avgInstallment.toFixed(2)}, ${(repaymentRatio * 100).toFixed(2)}% of disposable income`
          });
        }
      }

      // Step 7: Combine all factors
      const decisionFactors: DecisionFactor[] = [
        ...documentFactors,
        ...employmentFactors,
        ...creditFactors,
        ...memberFactors,
        ...repaymentFactors
      ];

      // Step 8: Apply decision rules
      let rulesetId = loan.decisioning_ruleset_id;
      let decisionResult = DecisionResult.MANUAL_REVIEW;
      let riskScore = 0;
      let riskLevel = RiskLevel.MEDIUM;
      let approvalConditions: ApprovalCondition[] = [];
      
      if (rulesetId) {
        // Get rules from ruleset
        const ruleset = await this.evaluateRuleset({
          rulesetId,
          loanData: {
            loanId: request.loanId,
            clientId: loan.client_id,
            principalAmount: loan.principal_amount,
            loanProductId: loan.product_id,
            creditScore: loan.credit_score,
            debtToIncomeRatio: loan.debt_to_income_ratio,
            memberYears: membershipYears,
            employmentVerified: loan.employment_verified,
            documentVerificationComplete,
            documentVerificationPassed
          }
        });
        
        decisionResult = ruleset.result;
        riskScore = ruleset.riskScore;
        riskLevel = ruleset.riskLevel;
        
        if (ruleset.conditions && ruleset.conditions.length > 0) {
          approvalConditions = ruleset.conditions;
        }
      } else {
        // Simple decision logic when no ruleset is available
        // Count negative factors
        const negativeFactors = decisionFactors.filter(f => f.impact === 'negative');
        
        if (negativeFactors.length === 0) {
          decisionResult = DecisionResult.APPROVED;
          riskLevel = RiskLevel.LOW;
        } else if (negativeFactors.length <= 2) {
          decisionResult = DecisionResult.CONDITIONALLY_APPROVED;
          riskLevel = RiskLevel.MEDIUM;
          
          // Create conditions for each negative factor
          approvalConditions = negativeFactors.map(factor => ({
            id: uuidv4(),
            description: `Resolve issue: ${factor.details}`,
            type: factor.type,
            requiredBy: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
            isMandatory: true,
            status: 'pending'
          }));
        } else {
          decisionResult = DecisionResult.DECLINED;
          riskLevel = RiskLevel.HIGH;
        }
      }

      // Step 9: Calculate risk score if not provided by rules
      if (riskScore === 0) {
        // Simple scoring: start with 700 (typical median credit score)
        riskScore = 700;
        
        // Adjust for credit score
        const creditScoreFactor = decisionFactors.find(f => f.name === 'credit_score');
        if (creditScoreFactor && typeof creditScoreFactor.value === 'number') {
          // Adjust risk score based on credit score difference from threshold
          const threshold = creditScoreFactor.threshold || 650;
          riskScore += (creditScoreFactor.value - threshold);
        }
        
        // Adjust for debt ratio
        const debtRatioFactor = decisionFactors.find(f => f.name === 'debt_to_income_ratio');
        if (debtRatioFactor && typeof debtRatioFactor.value === 'number') {
          // Higher debt ratio reduces score (multiply by 100 to get percentage points)
          const threshold = debtRatioFactor.threshold || 0.4;
          riskScore -= ((debtRatioFactor.value - threshold) * 100);
        }
        
        // Adjust for negative factors
        const negativeFactors = decisionFactors.filter(f => f.impact === 'negative');
        riskScore -= (negativeFactors.length * 25);
        
        // Adjust for membership years
        const membershipFactor = decisionFactors.find(f => f.name === 'membership_duration');
        if (membershipFactor && typeof membershipFactor.value === 'number') {
          // Each year adds 10 points up to 5 years
          riskScore += Math.min(membershipFactor.value, 5) * 10;
        }
        
        // Ensure score is in typical range (300-850)
        riskScore = Math.max(300, Math.min(850, riskScore));
      }

      // Determine risk level based on score if not already set
      if (riskLevel === RiskLevel.MEDIUM) {
        if (riskScore >= 720) riskLevel = RiskLevel.LOW;
        else if (riskScore < 620) riskLevel = RiskLevel.HIGH;
      }

      // Step 10: Create new decision record
      const isFinal = !loan.credit_committee_approval_required;
      const approvalLevel = 1;
      const nextApprovalLevel = loan.credit_committee_approval_required ? 2 : null;
      
      const decisionId = uuidv4();
      await client.query(
        `INSERT INTO fineract_default.loan_decision(
          id, loan_id, decision_timestamp, decision_result, decision_source,
          decision_by, risk_score, risk_level, decision_factors, notes,
          approval_level, next_approval_level, is_final, approval_conditions,
          manual_override, created_by, created_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )`,
        [
          decisionId,
          request.loanId,
          new Date(),
          decisionResult,
          'automated',
          userId,
          riskScore,
          riskLevel,
          JSON.stringify(decisionFactors),
          `Automated assessment performed on ${request.assessmentDate}`,
          approvalLevel,
          nextApprovalLevel,
          isFinal,
          JSON.stringify(approvalConditions),
          false,
          userId,
          new Date()
        ]
      );

      // Step 11: Update loan status based on decision
      // Only if decision is final and automated approval
      if (isFinal && decisionResult === DecisionResult.APPROVED) {
        await client.query(
          `UPDATE fineract_default.loan
           SET decision_source = 'automated', 
               loan_status = 'approved',
               approved_on_date = $1,
               approved_by_user_id = $2,
               last_modified_by = $2,
               last_modified_date = $1
           WHERE id = $3`,
          [request.assessmentDate, userId, request.loanId]
        );
      } else if (isFinal && decisionResult === DecisionResult.DECLINED) {
        await client.query(
          `UPDATE fineract_default.loan
           SET decision_source = 'automated', 
               loan_status = 'rejected',
               rejected_on_date = $1,
               rejected_by_user_id = $2,
               last_modified_by = $2,
               last_modified_date = $1
           WHERE id = $3`,
          [request.assessmentDate, userId, request.loanId]
        );
      }

      // Step 12: Update loan workflow
      if (isFinal) {
        // Close current workflow stage
        await client.query(
          `UPDATE fineract_default.loan_application_workflow
           SET stage_end_date = $1, 
               stage_status = $2,
               last_modified_by = $3,
               last_modified_date = $1
           WHERE loan_id = $4 
             AND current_stage = $5
             AND stage_end_date IS NULL`,
          [
            new Date(), 
            WorkflowStatus.COMPLETED, 
            userId, 
            request.loanId, 
            WorkflowStage.DECISIONING
          ]
        );

        // Create new workflow stage
        const newStage = decisionResult === DecisionResult.APPROVED 
          ? WorkflowStage.APPROVAL 
          : (decisionResult === DecisionResult.DECLINED 
              ? WorkflowStage.REJECTED 
              : WorkflowStage.COMMITTEE_REVIEW);

        await client.query(
          `INSERT INTO fineract_default.loan_application_workflow(
            id, loan_id, current_stage, stage_start_date, stage_status, 
            assigned_to, assigned_date, notes, created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            uuidv4(),
            request.loanId,
            newStage,
            new Date(),
            WorkflowStatus.IN_PROGRESS,
            loan.loan_officer_id,
            new Date(),
            `Automated decision: ${decisionResult}`,
            userId,
            new Date()
          ]
        );
      }

      // Return formatted decision response
      return {
        loanId: request.loanId,
        decisionId: decisionId,
        result: decisionResult,
        riskScore,
        riskLevel,
        factors: decisionFactors,
        conditions: approvalConditions,
        isFinal,
        nextApprovalLevel: nextApprovalLevel || undefined,
        assessmentDate: request.assessmentDate,
        assessedBy: userId,
        notes: `Automated assessment performed on ${request.assessmentDate}`
      };
    });
  }

  /**
   * Make a manual loan decision
   * @param request The decision request
   * @param userId The user ID of the person making the decision
   * @returns Decision result
   */
  async makeLoanDecision(request: MakeLoanDecisionRequest, userId: string): Promise<MakeLoanDecisionResponse> {
    logger.info('Making loan decision', { loanId: request.loanId, userId });

    return db.transaction(async (client) => {
      // Validate loan exists and check current status
      const loanQuery = await client.query(
        `SELECT 
          l.*,
          lp.credit_committee_approval_required,
          lp.approval_levels
        FROM 
          fineract_default.loan l
        JOIN
          fineract_default.loan_product lp ON l.product_id = lp.id
        WHERE 
          l.id = $1`,
        [request.loanId]
      );

      if (loanQuery.rows.length === 0) {
        throw new Error('Loan not found');
      }

      const loan = loanQuery.rows[0];
      
      // Check if this is a valid workflow transition
      if (!this.isValidStatusForDecision(loan.loan_status)) {
        throw new Error(`Cannot make decision for loan with status ${loan.loan_status}`);
      }

      // Get user's approval level/role (in real implementation, check user permissions)
      // For demo, assume user is authorized

      // Check for existing decisions and determine approval level
      const existingDecisionsQuery = await client.query(
        `SELECT * FROM fineract_default.loan_decision 
         WHERE loan_id = $1 
         ORDER BY approval_level DESC, decision_timestamp DESC 
         LIMIT 1`,
        [request.loanId]
      );

      let approvalLevel = 1;
      let previousDecisionId = null;
      
      if (existingDecisionsQuery.rows.length > 0) {
        const lastDecision = existingDecisionsQuery.rows[0];
        previousDecisionId = lastDecision.id;
        
        // If last decision is final, this is an override
        if (lastDecision.is_final) {
          if (!request.manualOverride) {
            throw new Error('Cannot make new decision on a finalized loan without override flag');
          }
        } else {
          // Otherwise, this is next level approval
          approvalLevel = (lastDecision.approval_level || 1) + 1;
        }
      }

      // Determine if this is the final decision based on product approval levels
      const isFinal = request.isFinal === undefined 
        ? (approvalLevel >= (loan.approval_levels || 1)) 
        : request.isFinal;

      // Create the decision record
      const decisionId = uuidv4();
      const timestamp = new Date();
      
      await client.query(
        `INSERT INTO fineract_default.loan_decision(
          id, loan_id, decision_timestamp, decision_result, decision_source,
          decision_by, risk_score, risk_level, decision_factors, notes,
          approval_level, is_final, approval_conditions, expiry_date,
          manual_override, override_reason, previous_decision_id,
          created_by, created_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )`,
        [
          decisionId,
          request.loanId,
          timestamp,
          request.decisionResult,
          'manual',
          userId,
          request.riskScore,
          request.riskLevel,
          request.factors ? JSON.stringify(request.factors) : null,
          request.notes,
          approvalLevel,
          isFinal,
          request.conditions ? JSON.stringify(request.conditions) : null,
          request.expiryDate ? new Date(request.expiryDate) : null,
          request.manualOverride || false,
          request.overrideReason,
          previousDecisionId,
          userId,
          timestamp
        ]
      );

      // Update loan status if final decision
      if (isFinal) {
        let newStatus = loan.loan_status;
        let updateFields: any = {
          decision_source: 'manual'
        };
        
        if (request.decisionResult === DecisionResult.APPROVED) {
          newStatus = 'approved';
          updateFields.approved_on_date = timestamp;
          updateFields.approved_by_user_id = userId;
        } else if (request.decisionResult === DecisionResult.DECLINED) {
          newStatus = 'rejected';
          updateFields.rejected_on_date = timestamp;
          updateFields.rejected_by_user_id = userId;
        }
        
        // Only update if status would change
        if (newStatus !== loan.loan_status) {
          const setClause = Object.entries(updateFields)
            .map(([key, _], index) => `${key} = $${index + 2}`)
            .join(', ');
            
          const values = [
            request.loanId,
            ...Object.values(updateFields),
            userId,
            timestamp,
            newStatus
          ];
          
          await client.query(
            `UPDATE fineract_default.loan
             SET ${setClause}, 
                 last_modified_by = $${Object.keys(updateFields).length + 2},
                 last_modified_date = $${Object.keys(updateFields).length + 3},
                 loan_status = $${Object.keys(updateFields).length + 4}
             WHERE id = $1`,
            values
          );
        }
      }

      // Update workflow if final decision
      if (isFinal) {
        // Close current workflow stage
        await client.query(
          `UPDATE fineract_default.loan_application_workflow
           SET stage_end_date = $1, 
               stage_status = $2,
               last_modified_by = $3,
               last_modified_date = $1
           WHERE loan_id = $4 
             AND (current_stage = $5 OR current_stage = $6)
             AND stage_end_date IS NULL`,
          [
            timestamp, 
            WorkflowStatus.COMPLETED, 
            userId, 
            request.loanId, 
            WorkflowStage.DECISIONING,
            WorkflowStage.COMMITTEE_REVIEW
          ]
        );

        // Create new workflow stage
        const newStage = request.decisionResult === DecisionResult.APPROVED 
          ? WorkflowStage.APPROVAL 
          : WorkflowStage.REJECTED;

        await client.query(
          `INSERT INTO fineract_default.loan_application_workflow(
            id, loan_id, current_stage, stage_start_date, stage_status, 
            assigned_to, assigned_date, notes, created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            uuidv4(),
            request.loanId,
            newStage,
            timestamp,
            WorkflowStatus.IN_PROGRESS,
            loan.loan_officer_id,
            timestamp,
            `Manual decision: ${request.decisionResult}${request.notes ? ' - ' + request.notes : ''}`,
            userId,
            timestamp
          ]
        );
      }

      // Return result
      return {
        decisionId,
        loanId: request.loanId,
        result: request.decisionResult,
        timestamp: timestamp.toISOString(),
        decisionBy: userId,
        isFinal
      };
    });
  }

  /**
   * Override a previous loan decision
   * @param request The override request
   * @param userId The user ID of the person making the override
   * @returns Override result
   */
  async overrideLoanDecision(request: OverrideLoanDecisionRequest, userId: string): Promise<OverrideLoanDecisionResponse> {
    logger.info('Overriding loan decision', { decisionId: request.decisionId, userId });

    return db.transaction(async (client) => {
      // Validate decision exists
      const decisionQuery = await client.query(
        `SELECT * FROM fineract_default.loan_decision WHERE id = $1`,
        [request.decisionId]
      );

      if (decisionQuery.rows.length === 0) {
        throw new Error('Decision not found');
      }

      const previousDecision = decisionQuery.rows[0];
      
      // Get loan details
      const loanQuery = await client.query(
        `SELECT l.* FROM fineract_default.loan l WHERE id = $1`,
        [previousDecision.loan_id]
      );

      if (loanQuery.rows.length === 0) {
        throw new Error('Loan not found');
      }

      const loan = loanQuery.rows[0];

      // Create the override decision
      const newDecisionId = uuidv4();
      const timestamp = new Date();
      
      await client.query(
        `INSERT INTO fineract_default.loan_decision(
          id, loan_id, decision_timestamp, decision_result, decision_source,
          decision_by, risk_score, risk_level, decision_factors, notes,
          approval_level, is_final, approval_conditions,
          manual_override, override_reason, previous_decision_id,
          created_by, created_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )`,
        [
          newDecisionId,
          previousDecision.loan_id,
          timestamp,
          request.newResult,
          'manual',
          userId,
          previousDecision.risk_score,
          previousDecision.risk_level,
          previousDecision.decision_factors,
          request.notes || `Override of previous decision ${request.decisionId}`,
          previousDecision.approval_level,
          true, // Overrides are always final
          request.conditions ? JSON.stringify(request.conditions) : previousDecision.approval_conditions,
          true,
          request.overrideReason,
          request.decisionId,
          userId,
          timestamp
        ]
      );

      // Update loan status based on new decision
      let newStatus = loan.loan_status;
      let updateFields: any = {
        decision_source: 'manual'
      };
      
      if (request.newResult === DecisionResult.APPROVED && loan.loan_status !== 'approved') {
        newStatus = 'approved';
        updateFields.approved_on_date = timestamp;
        updateFields.approved_by_user_id = userId;
      } else if (request.newResult === DecisionResult.DECLINED && loan.loan_status !== 'rejected') {
        newStatus = 'rejected';
        updateFields.rejected_on_date = timestamp;
        updateFields.rejected_by_user_id = userId;
      }
      
      // Only update if status would change
      if (newStatus !== loan.loan_status) {
        const setClause = Object.entries(updateFields)
          .map(([key, _], index) => `${key} = $${index + 2}`)
          .join(', ');
          
        const values = [
          previousDecision.loan_id,
          ...Object.values(updateFields),
          userId,
          timestamp,
          newStatus
        ];
        
        await client.query(
          `UPDATE fineract_default.loan
           SET ${setClause}, 
               last_modified_by = $${Object.keys(updateFields).length + 2},
               last_modified_date = $${Object.keys(updateFields).length + 3},
               loan_status = $${Object.keys(updateFields).length + 4}
           WHERE id = $1`,
          values
        );
      }

      // Update workflow based on new decision
      // Close current workflow stage
      await client.query(
        `UPDATE fineract_default.loan_application_workflow
         SET stage_end_date = $1, 
             stage_status = $2,
             last_modified_by = $3,
             last_modified_date = $1
         WHERE loan_id = $4 
           AND stage_end_date IS NULL`,
        [
          timestamp, 
          WorkflowStatus.COMPLETED, 
          userId, 
          previousDecision.loan_id
        ]
      );

      // Create new workflow stage
      const newStage = request.newResult === DecisionResult.APPROVED 
        ? WorkflowStage.APPROVAL 
        : WorkflowStage.REJECTED;

      await client.query(
        `INSERT INTO fineract_default.loan_application_workflow(
          id, loan_id, current_stage, stage_start_date, stage_status, 
          assigned_to, assigned_date, notes, created_by, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          uuidv4(),
          previousDecision.loan_id,
          newStage,
          timestamp,
          WorkflowStatus.IN_PROGRESS,
          loan.loan_officer_id,
          timestamp,
          `Decision override: ${request.newResult} - ${request.overrideReason}`,
          userId,
          timestamp
        ]
      );

      // Return result
      return {
        newDecisionId,
        previousDecisionId: request.decisionId,
        loanId: previousDecision.loan_id,
        result: request.newResult,
        overrideTimestamp: timestamp.toISOString(),
        overrideBy: userId
      };
    });
  }

  /**
   * Get the decision history for a loan
   * @param request The history request
   * @returns Decision history
   */
  async getLoanDecisionHistory(request: GetLoanDecisionHistoryRequest): Promise<LoanDecisionHistoryResponse> {
    logger.info('Getting loan decision history', { loanId: request.loanId });

    try {
      // Query all decisions for the loan
      const decisionsQuery = await db.query(
        `SELECT * FROM fineract_default.loan_decision 
         WHERE loan_id = $1 
         ORDER BY decision_timestamp DESC`,
        [request.loanId]
      );

      const decisions = decisionsQuery.rows;

      // Skip some details if not requested
      if (!request.includeDetails) {
        for (const decision of decisions) {
          delete decision.decision_factors;
          delete decision.approval_conditions;
        }
      }

      return {
        loanId: request.loanId,
        decisions: decisions.map(d => this.mapDbDecisionToModel(d)),
        count: decisions.length
      };
    } catch (error) {
      logger.error('Error getting loan decision history', { error, loanId: request.loanId });
      throw error;
    }
  }

  /**
   * Evaluate a ruleset against loan data
   * @param request The evaluation request
   * @returns Evaluation result
   */
  async evaluateRuleset(request: EvaluateRulesetRequest): Promise<RulesetEvaluationResponse> {
    logger.info('Evaluating decisioning ruleset', { rulesetId: request.rulesetId });

    try {
      // Get ruleset details
      const rulesetQuery = await db.query(
        `SELECT * FROM fineract_default.decisioning_ruleset WHERE id = $1`,
        [request.rulesetId]
      );

      if (rulesetQuery.rows.length === 0) {
        throw new Error('Ruleset not found');
      }

      // Get rules from ruleset
      const rulesQuery = await db.query(
        `SELECT * FROM fineract_default.decisioning_rule 
         WHERE ruleset_id = $1 AND is_active = true
         ORDER BY priority ASC`,
        [request.rulesetId]
      );

      const rules = rulesQuery.rows;
      const triggeredRules: any[] = [];
      let result = DecisionResult.APPROVED; // Default to approved
      let riskScore = 700; // Start with default risk score
      let conditions: ApprovalCondition[] = [];

      // Evaluate each rule
      for (const rule of rules) {
        const shouldTrigger = this.evaluateRule(rule, request.loanData);
        
        if (shouldTrigger) {
          triggeredRules.push({
            ruleId: rule.id,
            ruleName: rule.rule_name,
            action: rule.action_on_trigger
          });
          
          // Adjust risk score
          if (rule.risk_score_adjustment) {
            riskScore += rule.risk_score_adjustment;
          }
          
          // Set result based on rule action priority
          // More restrictive results take precedence
          if (rule.action_on_trigger === 'decline' && result !== DecisionResult.DECLINED) {
            result = DecisionResult.DECLINED;
          } else if (rule.action_on_trigger === 'manual_review' && 
                    result !== DecisionResult.DECLINED) {
            result = DecisionResult.MANUAL_REVIEW;
          } else if (rule.action_on_trigger === 'conditional_approval' && 
                    result !== DecisionResult.DECLINED && 
                    result !== DecisionResult.MANUAL_REVIEW) {
            result = DecisionResult.CONDITIONALLY_APPROVED;
            
            // Add condition based on rule
            const condition: ApprovalCondition = {
              id: uuidv4(),
              description: `Condition from rule: ${rule.rule_name}`,
              type: rule.rule_type,
              requiredBy: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
              isMandatory: true,
              status: 'pending'
            };
            
            conditions.push(condition);
          }
        }
      }

      // Determine risk level based on score
      let riskLevel = RiskLevel.MEDIUM;
      if (riskScore >= 720) riskLevel = RiskLevel.LOW;
      else if (riskScore < 620) riskLevel = RiskLevel.HIGH;

      // Ensure risk score is in valid range
      riskScore = Math.max(300, Math.min(850, riskScore));

      return {
        rulesetId: request.rulesetId,
        result,
        riskScore,
        riskLevel,
        triggeredRules,
        conditions: conditions.length > 0 ? conditions : undefined
      };
    } catch (error) {
      logger.error('Error evaluating ruleset', { error, rulesetId: request.rulesetId });
      throw error;
    }
  }

  // Helper methods

  /**
   * Calculate membership years from date
   * @param memberSince The date when the client became a member
   * @returns Number of years as a member
   */
  private calculateMembershipYears(memberSince: string | Date): number {
    if (!memberSince) return 0;
    
    const startDate = new Date(memberSince);
    const today = new Date();
    const yearDiff = today.getFullYear() - startDate.getFullYear();
    
    // Check if we haven't reached the anniversary date yet
    const notReachedAnniversary = 
      today.getMonth() < startDate.getMonth() || 
      (today.getMonth() === startDate.getMonth() && today.getDate() < startDate.getDate());
    
    return notReachedAnniversary ? yearDiff - 1 : yearDiff;
  }

  /**
   * Evaluate if a rule should trigger based on loan data
   * @param rule The rule to evaluate
   * @param loanData The loan data to evaluate against
   * @returns Whether the rule should trigger
   */
  private evaluateRule(rule: any, loanData: any): boolean {
    const ruleDefinition = rule.rule_definition;
    
    if (!ruleDefinition || !ruleDefinition.condition) {
      return false;
    }
    
    // Parse condition from rule definition
    const condition = ruleDefinition.condition;
    
    try {
      // For complex rules, you'd need a proper rule engine
      // This is a simple implementation for demo purposes
      
      // Replace field references with actual values
      let evaluatableCondition = condition;
      
      // Replace known field names with their values
      const fieldMappings: Record<string, any> = {
        'credit_score': loanData.creditScore,
        'debt_to_income_ratio': loanData.debtToIncomeRatio,
        'member_years': loanData.memberYears,
        'employment_verified': loanData.employmentVerified,
        'loan_amount': loanData.principalAmount,
        'document_verification_complete': loanData.documentVerificationComplete,
        'document_verification_passed': loanData.documentVerificationPassed
      };
      
      // Replace field references in condition
      for (const [field, value] of Object.entries(fieldMappings)) {
        // Handle booleans specially
        if (typeof value === 'boolean') {
          evaluatableCondition = evaluatableCondition.replace(
            new RegExp(`\\b${field}\\b`, 'g'), 
            value ? 'true' : 'false'
          );
        } 
        // Handle nulls specially
        else if (value === null || value === undefined) {
          evaluatableCondition = evaluatableCondition.replace(
            new RegExp(`\\b${field}\\b`, 'g'), 
            'null'
          );
        }
        // Handle numbers and strings
        else {
          evaluatableCondition = evaluatableCondition.replace(
            new RegExp(`\\b${field}\\b`, 'g'), 
            typeof value === 'number' ? value : `"${value}"`
          );
        }
      }
      
      // Create safe evaluation context with only necessary operators
      const safeEval = new Function('return ' + evaluatableCondition);
      return safeEval();
    } catch (error) {
      logger.error('Error evaluating rule condition', {
        rule: rule.rule_name,
        condition,
        error
      });
      return false;
    }
  }

  /**
   * Check if a loan status allows decisions to be made
   * @param status The current loan status
   * @returns Whether a decision can be made
   */
  private isValidStatusForDecision(status: string): boolean {
    const validStatuses = [
      'submitted_and_pending_approval',
      'pending_approval',
      'approved' // Allow re-decision on approved loans
    ];
    
    return validStatuses.includes(status);
  }

  /**
   * Format a decision response from a database row
   * @param decision The decision database row
   * @param loan Optional loan data
   * @returns Formatted decision response
   */
  private formatDecisionResponse(decision: any, loan?: any): LoanAssessmentResponse {
    return {
      loanId: decision.loan_id,
      decisionId: decision.id,
      result: decision.decision_result,
      riskScore: decision.risk_score,
      riskLevel: decision.risk_level,
      factors: decision.decision_factors || [],
      conditions: decision.approval_conditions || [],
      isFinal: decision.is_final,
      nextApprovalLevel: decision.next_approval_level,
      assessmentDate: decision.decision_timestamp.toISOString().split('T')[0],
      assessedBy: decision.decision_by,
      notes: decision.notes
    };
  }

  /**
   * Map a database decision record to the model format
   * @param dbDecision The decision record from the database
   * @returns Formatted decision model
   */
  private mapDbDecisionToModel(dbDecision: any): LoanDecision {
    return {
      id: dbDecision.id,
      loanId: dbDecision.loan_id,
      decisionTimestamp: dbDecision.decision_timestamp,
      decisionResult: dbDecision.decision_result,
      decisionSource: dbDecision.decision_source,
      decisionBy: dbDecision.decision_by,
      riskScore: dbDecision.risk_score,
      riskLevel: dbDecision.risk_level,
      decisionFactors: dbDecision.decision_factors,
      notes: dbDecision.notes,
      approvalLevel: dbDecision.approval_level,
      nextApprovalLevel: dbDecision.next_approval_level,
      isFinal: dbDecision.is_final,
      approvalConditions: dbDecision.approval_conditions,
      expiryDate: dbDecision.expiry_date,
      manualOverride: dbDecision.manual_override,
      overrideReason: dbDecision.override_reason,
      previousDecisionId: dbDecision.previous_decision_id
    };
  }

  /**
   * Check if a credit score is outdated (older than 90 days)
   * @param creditCheckDate The date of the last credit check
   * @returns Whether the credit score is outdated
   */
  private isCreditScoreOutdated(creditCheckDate: string | Date): boolean {
    if (!creditCheckDate) return true;

    const checkDate = new Date(creditCheckDate);
    const now = new Date();

    // Calculate difference in days
    const diffTime = Math.abs(now.getTime() - checkDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Credit scores older than 90 days are considered outdated
    return diffDays > 90;
  }
}