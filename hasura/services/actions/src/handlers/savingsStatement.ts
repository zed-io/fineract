import { Request, Response } from 'express';
import { savingsStatementService } from '../services/savingsStatementService';
import { logger } from '../utils/logger';
import * as fs from 'fs';

/**
 * Handlers for savings account statement-related operations
 */
export const savingsStatementHandlers = {
  /**
   * Generate a statement for a savings account
   * @param req Request
   * @param res Response
   */
  async generateStatement(req: Request, res: Response) {
    try {
      const { accountId, fromDate, toDate, includeDetails, format, download } = req.body.input || {};
      const userId = req.body.session_variables?.['x-hasura-user-id'] as string;
      
      // Validate required fields
      if (!accountId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account ID is required' 
        });
      }
      
      // Generate statement
      const statement = await savingsStatementService.generateStatement(
        {
          accountId,
          fromDate,
          toDate,
          includeDetails,
          format,
          download
        },
        userId
      );
      
      // Return statement data
      return res.json(statement);
    } catch (error) {
      logger.error('Error generating statement for savings account', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Get statement history for an account
   * @param req Request
   * @param res Response
   */
  async getStatementHistory(req: Request, res: Response) {
    try {
      const { accountId, limit } = req.body.input || {};
      
      // Validate required fields
      if (!accountId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Account ID is required' 
        });
      }
      
      // Get statement history
      const history = await savingsStatementService.getStatementHistory(
        accountId,
        limit
      );
      
      // Return statement history
      return res.json({
        success: true,
        history
      });
    } catch (error) {
      logger.error('Error getting statement history for savings account', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },
  
  /**
   * Download a statement
   * @param req Request
   * @param res Response
   */
  async downloadStatement(req: Request, res: Response) {
    try {
      const { statementId } = req.params;
      
      // Validate required fields
      if (!statementId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Statement ID is required' 
        });
      }
      
      // Get statement file details
      const fileDetails = await savingsStatementService.downloadStatement(statementId);
      
      // Check if file exists
      if (!fs.existsSync(fileDetails.filePath)) {
        return res.status(404).json({
          success: false,
          error: 'Statement file not found'
        });
      }
      
      // Set response headers
      res.setHeader('Content-Type', fileDetails.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileDetails.fileName}"`);
      
      // Stream the file
      const fileStream = fs.createReadStream(fileDetails.filePath);
      fileStream.pipe(res);
    } catch (error) {
      logger.error('Error downloading statement', { error });
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};