import { Request, Response } from 'express';
import { interestCalculationService, AccountType } from '../services/interestCalculationService';
import { logger } from '../utils/logger';
import { validator } from '../utils/validator';

/**
 * Handlers for interest calculation operations
 */
export const interestCalculationHandlers = {
  /**
   * Calculate interest without posting
   * @param req Request
   * @param res Response
   */
  async calculateInterest(req: Request, res: Response) {
    try {
      const { accountId, accountType, calculationDate, fromDate, toDate } = req.body.input || {};
      
      // Validate required fields
      if (!accountId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account ID is required' 
        });
      }
      
      if (!accountType) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account type is required' 
        });
      }
      
      // Validate account type
      if (!Object.values(AccountType).includes(accountType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid account type. Must be one of: ${Object.values(AccountType).join(', ')}`
        });
      }
      
      // Calculate interest for the account
      const result = await interestCalculationService.calculateInterest(
        accountId,
        accountType as AccountType,
        calculationDate || new Date().toISOString().split('T')[0],
        fromDate,
        toDate
      );
      
      // Return success response
      return res.json({
        success: true,
        calculation: result
      });
    } catch (error) {
      logger.error('Error calculating interest', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Post interest to an account
   * @param req Request
   * @param res Response
   */
  async postInterest(req: Request, res: Response) {
    try {
      const { 
        accountId, 
        accountType, 
        interestAmount, 
        postingDate, 
        fromDate, 
        toDate 
      } = req.body.input || {};
      
      const userId = req.headers['x-hasura-user-id'] as string;
      
      // Validate required fields
      if (!accountId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account ID is required' 
        });
      }
      
      if (!accountType) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account type is required' 
        });
      }
      
      if (!interestAmount) {
        return res.status(400).json({ 
          success: false, 
          error: 'Interest amount is required' 
        });
      }
      
      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'From date and to date are required'
        });
      }
      
      // Validate account type
      if (!Object.values(AccountType).includes(accountType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid account type. Must be one of: ${Object.values(AccountType).join(', ')}`
        });
      }
      
      // Validate amount
      if (!validator.isValidDecimal(interestAmount)) {
        return res.status(400).json({
          success: false,
          error: 'Interest amount must be a valid number'
        });
      }
      
      // Post interest to the account
      const result = await interestCalculationService.postInterest(
        accountId,
        accountType as AccountType,
        interestAmount,
        postingDate || new Date().toISOString().split('T')[0],
        fromDate,
        toDate,
        userId
      );
      
      // Return success response
      return res.json({
        success: true,
        transaction: result
      });
    } catch (error) {
      logger.error('Error posting interest', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Record daily interest accrual
   * @param req Request
   * @param res Response
   */
  async recordDailyAccrual(req: Request, res: Response) {
    try {
      const { 
        accountId, 
        accountType, 
        accrualDate, 
        amount,
        balance,
        interestRate
      } = req.body.input || {};
      
      const userId = req.headers['x-hasura-user-id'] as string;
      
      // Validate required fields
      if (!accountId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account ID is required' 
        });
      }
      
      if (!accountType) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account type is required' 
        });
      }
      
      if (!amount) {
        return res.status(400).json({ 
          success: false, 
          error: 'Accrual amount is required' 
        });
      }
      
      if (!balance) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account balance is required' 
        });
      }
      
      if (!interestRate) {
        return res.status(400).json({ 
          success: false, 
          error: 'Interest rate is required' 
        });
      }
      
      // Validate account type
      if (!Object.values(AccountType).includes(accountType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid account type. Must be one of: ${Object.values(AccountType).join(', ')}`
        });
      }
      
      // Validate amount and balance
      if (!validator.isValidDecimal(amount) || !validator.isValidDecimal(balance)) {
        return res.status(400).json({
          success: false,
          error: 'Amount and balance must be valid numbers'
        });
      }
      
      // Record daily accrual
      const result = await interestCalculationService.recordDailyAccrual(
        accountId,
        accountType as AccountType,
        accrualDate || new Date().toISOString().split('T')[0],
        amount,
        balance,
        interestRate,
        userId
      );
      
      // Return success response
      return res.json({
        success: true,
        accrual: result
      });
    } catch (error) {
      logger.error('Error recording daily interest accrual', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Get daily interest accruals
   * @param req Request
   * @param res Response
   */
  async getDailyAccruals(req: Request, res: Response) {
    try {
      const { 
        accountId, 
        accountType, 
        fromDate, 
        toDate,
        onlyUnposted
      } = req.body.input || {};
      
      // Validate required fields
      if (!accountId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account ID is required' 
        });
      }
      
      if (!accountType) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account type is required' 
        });
      }
      
      if (!fromDate || !toDate) {
        return res.status(400).json({
          success: false,
          error: 'From date and to date are required'
        });
      }
      
      // Validate account type
      if (!Object.values(AccountType).includes(accountType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid account type. Must be one of: ${Object.values(AccountType).join(', ')}`
        });
      }
      
      // Get daily accruals
      const accruals = await interestCalculationService.getDailyAccruals(
        accountId,
        accountType as AccountType,
        fromDate,
        toDate,
        onlyUnposted || false
      );
      
      // Return success response
      return res.json({
        success: true,
        accruals
      });
    } catch (error) {
      logger.error('Error getting daily interest accruals', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Get interest posting history
   * @param req Request
   * @param res Response
   */
  async getInterestPostingHistory(req: Request, res: Response) {
    try {
      const { accountId, accountType, limit, offset } = req.body.input || {};
      
      // Validate required fields
      if (!accountId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account ID is required' 
        });
      }
      
      if (!accountType) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account type is required' 
        });
      }
      
      // Validate account type
      if (!Object.values(AccountType).includes(accountType)) {
        return res.status(400).json({
          success: false,
          error: `Invalid account type. Must be one of: ${Object.values(AccountType).join(', ')}`
        });
      }
      
      // Get interest posting history
      const history = await interestCalculationService.getInterestPostingHistory(
        accountId,
        accountType as AccountType,
        limit || 10,
        offset || 0
      );
      
      // Return success response
      return res.json({
        success: true,
        history
      });
    } catch (error) {
      logger.error('Error getting interest posting history', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};