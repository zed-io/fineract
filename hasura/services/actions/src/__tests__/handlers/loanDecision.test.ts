import { Request, Response } from 'express';
import { LoanDecisionHandler } from '../../handlers/loanDecision';
import { LoanDecisionService } from '../../services/loanDecisionService';
import { DecisionResult } from '../../models/loanDecision';

// Mock the loan decision service
jest.mock('../../services/loanDecisionService');

// Mock logger to avoid console output during tests
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('LoanDecisionHandler', () => {
  let loanDecisionHandler: LoanDecisionHandler;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  
  // Setup mock response with jest spies
  beforeEach(() => {
    loanDecisionHandler = new LoanDecisionHandler();
    
    mockRequest = {
      body: {},
      headers: {
        'x-hasura-user-id': 'user-123'
      }
    };
    
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  describe('assessLoanApplication', () => {
    it('should return successful assessment', async () => {
      // Setup mock request data
      mockRequest.body = {
        input: {
          loanId: 'loan-123',
          assessmentDate: '2023-05-01',
          includeDocumentVerification: true
        }
      };
      
      // Mock service response
      const mockAssessment = {
        loanId: 'loan-123',
        decisionId: 'decision-123',
        result: DecisionResult.APPROVED,
        factors: [],
        isFinal: true,
        assessmentDate: '2023-05-01'
      };
      
      // Setup mock implementation of service method
      (LoanDecisionService.prototype.assessLoanApplication as jest.Mock).mockResolvedValue(mockAssessment);
      
      // Call the handler
      await loanDecisionHandler.assessLoanApplication(
        mockRequest as Request,
        mockResponse as Response
      );
      
      // Verify response
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        assessment: mockAssessment
      });
      
      // Verify service was called with correct parameters
      expect(LoanDecisionService.prototype.assessLoanApplication).toHaveBeenCalledWith(
        mockRequest.body.input,
        'user-123'
      );
    });
    
    it('should handle errors during assessment', async () => {
      // Setup mock request data
      mockRequest.body = {
        input: {
          loanId: 'loan-123',
          assessmentDate: '2023-05-01'
        }
      };
      
      // Mock service error
      const mockError = new Error('Assessment failed');
      (LoanDecisionService.prototype.assessLoanApplication as jest.Mock).mockRejectedValue(mockError);
      
      // Call the handler
      await loanDecisionHandler.assessLoanApplication(
        mockRequest as Request,
        mockResponse as Response
      );
      
      // Verify error response
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Assessment failed'
      });
    });
  });
  
  describe('makeLoanDecision', () => {
    it('should return successful decision', async () => {
      // Setup mock request data
      mockRequest.body = {
        input: {
          loanId: 'loan-123',
          decisionResult: DecisionResult.APPROVED,
          notes: 'Approved based on good credit history'
        }
      };
      
      // Mock service response
      const mockDecision = {
        decisionId: 'decision-123',
        loanId: 'loan-123',
        result: DecisionResult.APPROVED,
        timestamp: '2023-05-01T12:00:00.000Z',
        decisionBy: 'user-123',
        isFinal: true
      };
      
      // Setup mock implementation of service method
      (LoanDecisionService.prototype.makeLoanDecision as jest.Mock).mockResolvedValue(mockDecision);
      
      // Call the handler
      await loanDecisionHandler.makeLoanDecision(
        mockRequest as Request,
        mockResponse as Response
      );
      
      // Verify response
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        decision: mockDecision
      });
    });
    
    it('should require a user ID', async () => {
      // Setup mock request without user ID
      const requestWithoutUser = {
        body: {
          input: {
            loanId: 'loan-123',
            decisionResult: DecisionResult.APPROVED
          }
        },
        headers: {}
      };
      
      // Call the handler
      await loanDecisionHandler.makeLoanDecision(
        requestWithoutUser as Request,
        mockResponse as Response
      );
      
      // Verify error response
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User ID is required to make a loan decision'
      });
      
      // Verify service was not called
      expect(LoanDecisionService.prototype.makeLoanDecision).not.toHaveBeenCalled();
    });
  });
  
  describe('getLoanDecisionHistory', () => {
    it('should return loan decision history', async () => {
      // Setup mock request data
      mockRequest.body = {
        input: {
          loanId: 'loan-123',
          includeDetails: true
        }
      };
      
      // Mock service response
      const mockHistory = {
        loanId: 'loan-123',
        decisions: [
          {
            id: 'decision-1',
            loanId: 'loan-123',
            decisionTimestamp: '2023-05-01T10:00:00.000Z',
            decisionResult: DecisionResult.MANUAL_REVIEW,
            decisionSource: 'automated'
          },
          {
            id: 'decision-2',
            loanId: 'loan-123',
            decisionTimestamp: '2023-05-02T11:00:00.000Z',
            decisionResult: DecisionResult.APPROVED,
            decisionSource: 'manual'
          }
        ],
        count: 2
      };
      
      // Setup mock implementation of service method
      (LoanDecisionService.prototype.getLoanDecisionHistory as jest.Mock).mockResolvedValue(mockHistory);
      
      // Call the handler
      await loanDecisionHandler.getLoanDecisionHistory(
        mockRequest as Request,
        mockResponse as Response
      );
      
      // Verify response
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        history: mockHistory
      });
    });
  });
});