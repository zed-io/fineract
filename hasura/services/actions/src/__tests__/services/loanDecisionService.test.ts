import { LoanDecisionService } from '../../services/loanDecisionService';
import { 
  DecisionResult, 
  RiskLevel, 
  DecisionFactorType 
} from '../../models/loanDecision';
import { db } from '../../utils/db';

// Mock the database module
jest.mock('../../utils/db', () => ({
  query: jest.fn(),
  transaction: jest.fn(callback => callback({ query: jest.fn() })),
  pool: {
    connect: jest.fn()
  }
}));

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock UUID generation for predictable test results
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-123')
}));

describe('LoanDecisionService', () => {
  let loanDecisionService: LoanDecisionService;
  
  beforeEach(() => {
    loanDecisionService = new LoanDecisionService();
    jest.clearAllMocks();
  });
  
  describe('assessLoanApplication', () => {
    it('should handle loan assessment with existing final decision', async () => {
      // Mock query responses
      (db.query as jest.Mock).mockImplementation((sql) => {
        if (sql.includes('FROM fineract_default.loan l')) {
          return {
            rows: [{
              id: 'loan-1',
              loan_status: 'submitted_and_pending_approval',
              product_id: 'product-1',
              client_id: 'client-1',
              loan_officer_id: 'officer-1',
              decisioning_ruleset_id: 'ruleset-1',
              min_credit_score: 600,
              max_debt_to_income_ratio: 0.4,
              credit_committee_approval_required: false,
              approval_levels: 1,
              member_since: '2020-01-01',
              credit_score: 720,
              debt_to_income_ratio: 0.35,
              monthly_income: 5000,
              monthly_expenses: 2000,
              employment_verified: true
            }]
          };
        } else if (sql.includes('FROM fineract_default.loan_decision WHERE loan_id')) {
          return {
            rows: [{
              id: 'decision-1',
              loan_id: 'loan-1',
              decision_result: 'approved',
              is_final: true,
              decision_timestamp: new Date(),
              risk_score: 700,
              risk_level: 'low',
              decision_factors: JSON.stringify([
                {
                  type: 'credit_score',
                  name: 'credit_score',
                  value: 720,
                  impact: 'positive'
                }
              ])
            }]
          };
        }
        // Default empty response for other queries
        return { rows: [] };
      });
      
      const result = await loanDecisionService.assessLoanApplication({
        loanId: 'loan-1',
        assessmentDate: '2023-05-01',
        includeDocumentVerification: true,
        includeEmploymentVerification: true,
        includeCreditCheck: true
      }, 'user-1');
      
      // Check that we didn't try to make a new decision
      expect(result.decisionId).toBe('decision-1');
      expect(result.result).toBe('approved');
      expect(db.transaction).toHaveBeenCalled();
    });
    
    it('should create a new assessment with forceReevaluation', async () => {
      // Mock query responses
      (db.query as jest.Mock).mockImplementation((sql) => {
        if (sql.includes('FROM fineract_default.loan l')) {
          return {
            rows: [{
              id: 'loan-1',
              loan_status: 'submitted_and_pending_approval',
              product_id: 'product-1',
              client_id: 'client-1',
              loan_officer_id: 'officer-1',
              decisioning_ruleset_id: 'ruleset-1',
              min_credit_score: 600,
              max_debt_to_income_ratio: 0.4,
              credit_committee_approval_required: false,
              approval_levels: 1,
              member_since: '2020-01-01',
              credit_score: 720,
              debt_to_income_ratio: 0.35,
              monthly_income: 5000,
              monthly_expenses: 2000,
              employment_verified: true
            }]
          };
        } else if (sql.includes('FROM fineract_default.loan_document')) {
          return { 
            rows: [
              { document_type: 'id', status: 'verified', verification_status: 'verified', is_required: true },
              { document_type: 'proof_of_income', status: 'verified', verification_status: 'verified', is_required: true }
            ] 
          };
        } else if (sql.includes('FROM fineract_default.loan_repayment_schedule')) {
          return { 
            rows: [{ avg_installment: 350 }]
          };
        } else if (sql.includes('FROM fineract_default.decisioning_ruleset')) {
          return { 
            rows: [{ id: 'ruleset-1', name: 'Default Ruleset' }]
          };
        } else if (sql.includes('FROM fineract_default.decisioning_rule')) {
          return { 
            rows: [
              { 
                id: 'rule-1', 
                ruleset_id: 'ruleset-1', 
                rule_name: 'Good Credit Score', 
                rule_type: 'eligibility',
                rule_definition: { condition: 'credit_score >= 650' },
                action_on_trigger: 'approve',
                risk_score_adjustment: 50,
                priority: 1,
                is_active: true
              }
            ]
          };
        }
        // Default empty response for other queries
        return { rows: [] };
      });
      
      const result = await loanDecisionService.assessLoanApplication({
        loanId: 'loan-1',
        assessmentDate: '2023-05-01',
        includeDocumentVerification: true,
        includeEmploymentVerification: true,
        includeCreditCheck: true,
        forceReevaluation: true
      }, 'user-1');
      
      // Verify result
      expect(result.loanId).toBe('loan-1');
      expect(result.decisionId).toBe('test-uuid-123');
      expect(result.result).toBe(DecisionResult.APPROVED);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.factors.length).toBeGreaterThan(0);
      expect(result.isFinal).toBe(true);
      
      // Verify DB calls
      expect(db.transaction).toHaveBeenCalled();
    });
  });

  describe('makeLoanDecision', () => {
    it('should create a loan decision record', async () => {
      // Mock query responses
      (db.query as jest.Mock).mockImplementation((sql) => {
        if (sql.includes('FROM fineract_default.loan l')) {
          return {
            rows: [{
              id: 'loan-1',
              loan_status: 'submitted_and_pending_approval',
              product_id: 'product-1',
              loan_officer_id: 'officer-1',
              credit_committee_approval_required: true,
              approval_levels: 2
            }]
          };
        } else if (sql.includes('FROM fineract_default.loan_decision')) {
          return { rows: [] }; // No existing decisions
        }
        // Default empty response for other queries
        return { rows: [] };
      });
      
      const result = await loanDecisionService.makeLoanDecision({
        loanId: 'loan-1',
        decisionResult: DecisionResult.APPROVED,
        notes: 'Approved based on good credit history'
      }, 'user-1');
      
      // Verify result
      expect(result.decisionId).toBe('test-uuid-123');
      expect(result.loanId).toBe('loan-1');
      expect(result.result).toBe(DecisionResult.APPROVED);
      expect(result.isFinal).toBe(false); // Not final because approval_levels is 2
      
      // Verify DB calls
      expect(db.transaction).toHaveBeenCalled();
    });
    
    it('should handle final decisions that update loan status', async () => {
      // Mock query responses
      (db.query as jest.Mock).mockImplementation((sql) => {
        if (sql.includes('FROM fineract_default.loan l')) {
          return {
            rows: [{
              id: 'loan-1',
              loan_status: 'submitted_and_pending_approval',
              product_id: 'product-1',
              loan_officer_id: 'officer-1',
              credit_committee_approval_required: false,
              approval_levels: 1
            }]
          };
        } else if (sql.includes('FROM fineract_default.loan_decision')) {
          return { rows: [] }; // No existing decisions
        }
        // Default empty response for other queries
        return { rows: [] };
      });
      
      const result = await loanDecisionService.makeLoanDecision({
        loanId: 'loan-1',
        decisionResult: DecisionResult.APPROVED,
        isFinal: true,
        notes: 'Final approval'
      }, 'user-1');
      
      // Verify result
      expect(result.decisionId).toBe('test-uuid-123');
      expect(result.loanId).toBe('loan-1');
      expect(result.result).toBe(DecisionResult.APPROVED);
      expect(result.isFinal).toBe(true);
      
      // Verify DB calls - should update loan status
      expect(db.transaction).toHaveBeenCalled();
    });
  });

  describe('overrideLoanDecision', () => {
    it('should create an override decision record', async () => {
      // Mock query responses
      (db.query as jest.Mock).mockImplementation((sql) => {
        if (sql.includes('FROM fineract_default.loan_decision WHERE id')) {
          return {
            rows: [{
              id: 'decision-1',
              loan_id: 'loan-1',
              decision_result: 'declined',
              approval_level: 1,
              is_final: true,
              risk_score: 580,
              risk_level: 'high',
              decision_factors: JSON.stringify([])
            }]
          };
        } else if (sql.includes('FROM fineract_default.loan l WHERE id')) {
          return {
            rows: [{
              id: 'loan-1',
              loan_status: 'rejected',
              loan_officer_id: 'officer-1'
            }]
          };
        }
        // Default empty response for other queries
        return { rows: [] };
      });
      
      const result = await loanDecisionService.overrideLoanDecision({
        decisionId: 'decision-1',
        newResult: DecisionResult.APPROVED,
        overrideReason: 'Customer provided missing documentation'
      }, 'user-1');
      
      // Verify result
      expect(result.newDecisionId).toBe('test-uuid-123');
      expect(result.previousDecisionId).toBe('decision-1');
      expect(result.loanId).toBe('loan-1');
      expect(result.result).toBe(DecisionResult.APPROVED);
      
      // Verify DB calls - should create override and update loan status
      expect(db.transaction).toHaveBeenCalled();
    });
  });

  describe('evaluateRuleset', () => {
    it('should evaluate rules against loan data', async () => {
      // Mock query responses
      (db.query as jest.Mock).mockImplementation((sql) => {
        if (sql.includes('FROM fineract_default.decisioning_ruleset WHERE id')) {
          return {
            rows: [{
              id: 'ruleset-1',
              name: 'Default Ruleset'
            }]
          };
        } else if (sql.includes('FROM fineract_default.decisioning_rule')) {
          return {
            rows: [
              { 
                id: 'rule-1', 
                ruleset_id: 'ruleset-1', 
                rule_name: 'Minimum Credit Score', 
                rule_type: 'eligibility',
                rule_definition: { condition: 'credit_score < 550' },
                action_on_trigger: 'decline',
                risk_score_adjustment: -100,
                priority: 1,
                is_active: true
              },
              { 
                id: 'rule-2', 
                ruleset_id: 'ruleset-1', 
                rule_name: 'High Debt Ratio', 
                rule_type: 'eligibility',
                rule_definition: { condition: 'debt_to_income_ratio > 0.45' },
                action_on_trigger: 'manual_review',
                risk_score_adjustment: -50,
                priority: 2,
                is_active: true
              },
              { 
                id: 'rule-3', 
                ruleset_id: 'ruleset-1', 
                rule_name: 'Good Credit Profile', 
                rule_type: 'eligibility',
                rule_definition: { condition: 'credit_score >= 700' },
                action_on_trigger: 'approve',
                risk_score_adjustment: 50,
                priority: 3,
                is_active: true
              }
            ]
          };
        }
        // Default empty response for other queries
        return { rows: [] };
      });
      
      const result = await loanDecisionService.evaluateRuleset({
        rulesetId: 'ruleset-1',
        loanData: {
          loanId: 'loan-1',
          creditScore: 720,
          debtToIncomeRatio: 0.35,
          memberYears: 3,
          employmentVerified: true,
          principalAmount: 10000
        }
      });
      
      // Verify result - should trigger the "Good Credit Profile" rule
      expect(result.rulesetId).toBe('ruleset-1');
      expect(result.result).toBe(DecisionResult.APPROVED);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.triggeredRules.length).toBe(1);
      expect(result.triggeredRules[0].ruleName).toBe('Good Credit Profile');
    });
    
    it('should handle multiple triggered rules with proper precedence', async () => {
      // Mock query responses
      (db.query as jest.Mock).mockImplementation((sql) => {
        if (sql.includes('FROM fineract_default.decisioning_ruleset WHERE id')) {
          return {
            rows: [{
              id: 'ruleset-1',
              name: 'Default Ruleset'
            }]
          };
        } else if (sql.includes('FROM fineract_default.decisioning_rule')) {
          return {
            rows: [
              { 
                id: 'rule-1', 
                ruleset_id: 'ruleset-1', 
                rule_name: 'Low Credit Score', 
                rule_type: 'eligibility',
                rule_definition: { condition: 'credit_score < 650' },
                action_on_trigger: 'decline',
                risk_score_adjustment: -100,
                priority: 1,
                is_active: true
              },
              { 
                id: 'rule-2', 
                ruleset_id: 'ruleset-1', 
                rule_name: 'High Debt Ratio', 
                rule_type: 'eligibility',
                rule_definition: { condition: 'debt_to_income_ratio > 0.40' },
                action_on_trigger: 'manual_review',
                risk_score_adjustment: -50,
                priority: 2,
                is_active: true
              },
              { 
                id: 'rule-3', 
                ruleset_id: 'ruleset-1', 
                rule_name: 'Large Loan Amount', 
                rule_type: 'limit',
                rule_definition: { condition: 'loan_amount > 50000' },
                action_on_trigger: 'conditional_approval',
                risk_score_adjustment: -25,
                priority: 3,
                is_active: true
              }
            ]
          };
        }
        // Default empty response for other queries
        return { rows: [] };
      });
      
      const result = await loanDecisionService.evaluateRuleset({
        rulesetId: 'ruleset-1',
        loanData: {
          loanId: 'loan-1',
          creditScore: 600, // Triggers rule 1 (decline)
          debtToIncomeRatio: 0.42, // Triggers rule 2 (manual review)
          memberYears: 3,
          employmentVerified: true,
          principalAmount: 60000 // Triggers rule 3 (conditional approval)
        }
      });
      
      // Verify result - should favor the most restrictive result (DECLINED)
      expect(result.result).toBe(DecisionResult.DECLINED);
      expect(result.triggeredRules.length).toBe(3);
      // Risk score adjustments from all triggered rules should be applied
      expect(result.riskScore).toBeLessThan(700); 
    });
  });
});