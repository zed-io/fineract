import { Request, Response } from 'express';
import { LoanDecisionService } from '../services/loanDecisionService';
import { logger } from '../utils/logger';
import {
  LoanAssessmentRequest,
  MakeLoanDecisionRequest,
  OverrideLoanDecisionRequest,
  GetLoanDecisionHistoryRequest,
  EvaluateRulesetRequest
} from '../models/loanDecision';

// Initialize the loan decision service
const loanDecisionService = new LoanDecisionService();

/**
 * Handler for loan decisioning API endpoints
 */
export class LoanDecisionHandler {
  /**
   * Assess a loan application using automated rules
   * @param req Request with loan assessment parameters
   * @param res Response object
   */
  async assessLoanApplication(req: Request, res: Response) {
    try {
      const request: LoanAssessmentRequest = req.body.input;
      const userId = req.headers['x-hasura-user-id'] as string;
      
      logger.info('Received request to assess loan application', { 
        loanId: request.loanId, 
        assessmentDate: request.assessmentDate,
        userId 
      });
      
      const result = await loanDecisionService.assessLoanApplication(request, userId);
      
      return res.json({
        success: true,
        assessment: result
      });
    } catch (error) {
      logger.error('Error assessing loan application', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while assessing the loan application'
      });
    }
  }

  /**
   * Make a manual loan decision
   * @param req Request with decision parameters
   * @param res Response object
   */
  async makeLoanDecision(req: Request, res: Response) {
    try {
      const request: MakeLoanDecisionRequest = req.body.input;
      const userId = req.headers['x-hasura-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID is required to make a loan decision'
        });
      }
      
      logger.info('Received request to make loan decision', { 
        loanId: request.loanId, 
        decision: request.decisionResult,
        userId 
      });
      
      const result = await loanDecisionService.makeLoanDecision(request, userId);
      
      return res.json({
        success: true,
        decision: result
      });
    } catch (error) {
      logger.error('Error making loan decision', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while making the loan decision'
      });
    }
  }

  /**
   * Override a previous loan decision
   * @param req Request with override parameters
   * @param res Response object
   */
  async overrideLoanDecision(req: Request, res: Response) {
    try {
      const request: OverrideLoanDecisionRequest = req.body.input;
      const userId = req.headers['x-hasura-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User ID is required to override a loan decision'
        });
      }
      
      logger.info('Received request to override loan decision', { 
        decisionId: request.decisionId, 
        newResult: request.newResult,
        userId 
      });
      
      const result = await loanDecisionService.overrideLoanDecision(request, userId);
      
      return res.json({
        success: true,
        override: result
      });
    } catch (error) {
      logger.error('Error overriding loan decision', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while overriding the loan decision'
      });
    }
  }

  /**
   * Get loan decision history
   * @param req Request with history parameters
   * @param res Response object
   */
  async getLoanDecisionHistory(req: Request, res: Response) {
    try {
      const request: GetLoanDecisionHistoryRequest = req.body.input;
      
      logger.info('Received request to get loan decision history', { 
        loanId: request.loanId, 
        includeDetails: request.includeDetails 
      });
      
      const result = await loanDecisionService.getLoanDecisionHistory(request);
      
      return res.json({
        success: true,
        history: result
      });
    } catch (error) {
      logger.error('Error getting loan decision history', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while retrieving loan decision history'
      });
    }
  }

  /**
   * Evaluate a ruleset against loan data
   * @param req Request with ruleset evaluation parameters
   * @param res Response object
   */
  async evaluateRuleset(req: Request, res: Response) {
    try {
      const request: EvaluateRulesetRequest = req.body.input;
      
      logger.info('Received request to evaluate ruleset', { 
        rulesetId: request.rulesetId 
      });
      
      const result = await loanDecisionService.evaluateRuleset(request);
      
      return res.json({
        success: true,
        evaluation: result
      });
    } catch (error) {
      logger.error('Error evaluating ruleset', { error });
      return res.status(500).json({
        success: false,
        message: error.message || 'An error occurred while evaluating the ruleset'
      });
    }
  }
}