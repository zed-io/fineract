/**
 * Recurring Deposit Penalty Service for Fineract
 * Provides functionality for managing penalties for missed recurring deposit installments
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../utils/db';
import { logger } from '../utils/logger';
import {
  RecurringDepositPenaltyConfig,
  RecurringDepositTieredPenalty,
  RecurringDepositPenaltyHistory,
  RecurringDepositPenaltyConfigRequest,
  RecurringDepositTieredPenaltyRequest,
  RecurringDepositPenaltyWaiverRequest,
  PenaltyApplicationResult,
  PenaltyApplicationSummary,
  PenaltyConfigResponse,
  PenaltyHistoryResponse,
  PenaltyHistorySearchCriteria,
  DepositPenaltyType
} from '../models/recurringDepositPenalty';

/**
 * Service for managing recurring deposit penalties
 */
export class RecurringDepositPenaltyService {
  
  /**
   * Get penalty configuration for a recurring deposit product
   * @param productId The recurring deposit product ID
   * @returns Penalty configuration for the product
   */
  async getPenaltyConfig(productId: string): Promise<PenaltyConfigResponse> {
    logger.info('Getting penalty configuration for recurring deposit product', { productId });
    
    try {
      // Get the penalty configuration
      const configResult = await query(
        `SELECT rdpc.*, sp.name as product_name
         FROM recurring_deposit_penalty_config rdpc
         JOIN recurring_deposit_product rdp ON rdpc.product_id = rdp.id
         JOIN savings_product sp ON rdp.savings_product_id = sp.id
         WHERE rdpc.product_id = $1`,
        [productId]
      );
      
      if (configResult.rowCount === 0) {
        throw new Error(`Penalty configuration for product ID ${productId} not found`);
      }
      
      const config = configResult.rows[0];
      
      // Get tiered penalties if available
      const tieredResult = await query(
        `SELECT * FROM recurring_deposit_tiered_penalty 
         WHERE config_id = $1 
         ORDER BY tier_number ASC`,
        [config.id]
      );
      
      const tieredPenalties = tieredResult.rows.map(tier => ({
        id: tier.id,
        tierNumber: tier.tier_number,
        daysOverdueStart: tier.days_overdue_start,
        daysOverdueEnd: tier.days_overdue_end,
        occurrencesStart: tier.occurrences_start,
        occurrencesEnd: tier.occurrences_end,
        penaltyType: tier.penalty_type,
        penaltyAmount: parseFloat(tier.penalty_amount),
        maxPenaltyAmount: tier.max_penalty_amount ? parseFloat(tier.max_penalty_amount) : undefined
      }));
      
      return {
        id: config.id,
        productId: config.product_id,
        productName: config.product_name,
        isPenaltyEnabled: config.is_penalty_enabled,
        penaltyType: config.penalty_type,
        penaltyAmount: parseFloat(config.penalty_amount),
        gracePeriodDays: config.grace_period_days,
        maxPenaltyOccurrences: config.max_penalty_occurrences,
        tieredPenalties
      };
    } catch (error) {
      logger.error('Error getting penalty configuration', { error, productId });
      throw error;
    }
  }
  
  /**
   * Create or update penalty configuration for a recurring deposit product
   * @param request Penalty configuration request
   * @param userId Current user ID
   * @returns Created/updated configuration ID
   */
  async createOrUpdatePenaltyConfig(request: RecurringDepositPenaltyConfigRequest, userId?: string): Promise<string> {
    logger.info('Creating/updating penalty configuration for recurring deposit product', { productId: request.productId });
    
    try {
      return await transaction(async (client) => {
        // Check if product exists
        const productResult = await client.query(
          'SELECT id FROM recurring_deposit_product WHERE id = $1',
          [request.productId]
        );
        
        if (productResult.rowCount === 0) {
          throw new Error(`Recurring deposit product with ID ${request.productId} not found`);
        }
        
        // Check if configuration already exists
        const configResult = await client.query(
          'SELECT id FROM recurring_deposit_penalty_config WHERE product_id = $1',
          [request.productId]
        );
        
        let configId: string;
        
        if (configResult.rowCount > 0) {
          // Update existing configuration
          configId = configResult.rows[0].id;
          
          await client.query(
            `UPDATE recurring_deposit_penalty_config
             SET is_penalty_enabled = $1,
                 penalty_type = $2,
                 penalty_amount = $3,
                 grace_period_days = $4,
                 max_penalty_occurrences = $5,
                 last_modified_date = NOW(),
                 last_modified_by = $6
             WHERE id = $7`,
            [
              request.isPenaltyEnabled,
              request.penaltyType,
              request.penaltyAmount,
              request.gracePeriodDays,
              request.maxPenaltyOccurrences,
              userId || null,
              configId
            ]
          );
          
          // Delete existing tiered penalties
          await client.query(
            'DELETE FROM recurring_deposit_tiered_penalty WHERE config_id = $1',
            [configId]
          );
        } else {
          // Create new configuration
          configId = uuidv4();
          
          await client.query(
            `INSERT INTO recurring_deposit_penalty_config (
               id, product_id, is_penalty_enabled, penalty_type, penalty_amount,
               grace_period_days, max_penalty_occurrences, created_by, created_date
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [
              configId,
              request.productId,
              request.isPenaltyEnabled,
              request.penaltyType,
              request.penaltyAmount,
              request.gracePeriodDays,
              request.maxPenaltyOccurrences,
              userId || null
            ]
          );
        }
        
        // Create tiered penalties if provided
        if (request.tieredPenalties && request.tieredPenalties.length > 0) {
          for (const tier of request.tieredPenalties) {
            await client.query(
              `INSERT INTO recurring_deposit_tiered_penalty (
                 id, config_id, tier_number, days_overdue_start, days_overdue_end,
                 occurrences_start, occurrences_end, penalty_type, penalty_amount,
                 max_penalty_amount, created_by, created_date
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
              [
                uuidv4(),
                configId,
                tier.tierNumber,
                tier.daysOverdueStart,
                tier.daysOverdueEnd || null,
                tier.occurrencesStart,
                tier.occurrencesEnd || null,
                tier.penaltyType,
                tier.penaltyAmount,
                tier.maxPenaltyAmount || null,
                userId || null
              ]
            );
          }
        }
        
        return configId;
      });
    } catch (error) {
      logger.error('Error creating/updating penalty configuration', { error, productId: request.productId });
      throw error;
    }
  }
  
  /**
   * Delete penalty configuration for a recurring deposit product
   * @param configId Penalty configuration ID
   * @returns Success indicator
   */
  async deletePenaltyConfig(configId: string): Promise<boolean> {
    logger.info('Deleting penalty configuration', { configId });
    
    try {
      const result = await query(
        'DELETE FROM recurring_deposit_penalty_config WHERE id = $1 RETURNING id',
        [configId]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting penalty configuration', { error, configId });
      throw error;
    }
  }
  
  /**
   * Get default penalty configuration from system settings
   * @returns Default penalty configuration
   */
  async getDefaultPenaltyConfig(): Promise<any> {
    try {
      const configResult = await query(
        `SELECT value FROM system_configuration
         WHERE name = 'recurring_deposit_penalty_config' AND enabled = true`
      );
      
      if (configResult.rowCount > 0) {
        return JSON.parse(configResult.rows[0].value);
      }
      
      // Default configuration if not found in database
      return {
        enableAutoPenalty: true,
        penaltyType: 'fixed',
        penaltyAmount: 10,
        gracePeriodDays: 5,
        maxPenaltiesPerInstallment: 3,
        advancedConfig: {
          tiers: [
            {
              daysOverdueStart: 1,
              daysOverdueEnd: 10,
              penaltyType: 'fixed',
              penaltyAmount: 10
            },
            {
              daysOverdueStart: 11,
              daysOverdueEnd: 30,
              penaltyType: 'fixed',
              penaltyAmount: 20
            },
            {
              daysOverdueStart: 31,
              daysOverdueEnd: null,
              penaltyType: 'percentage',
              penaltyAmount: 5,
              maxPenaltyAmount: 50
            }
          ]
        }
      };
    } catch (error) {
      logger.error('Error getting default penalty configuration', { error });
      
      // Fallback to basic default configuration
      return {
        enableAutoPenalty: true,
        penaltyType: 'fixed',
        penaltyAmount: 10,
        gracePeriodDays: 5,
        maxPenaltiesPerInstallment: 3
      };
    }
  }
  
  /**
   * Apply penalties for missed recurring deposit installments
   * @param asOfDate Optional date to use for penalty calculation (defaults to current date)
   * @param userId Current user ID
   * @returns Summary of penalty application results
   */
  async applyPenalties(asOfDate?: string, userId?: string): Promise<PenaltyApplicationSummary> {
    logger.info('Applying penalties for missed recurring deposit installments', { asOfDate });
    
    try {
      return await transaction(async (client) => {
        // Use current date if asOfDate not provided
        const penaltyDate = asOfDate ? new Date(asOfDate) : new Date();
        const penaltyDateStr = penaltyDate.toISOString().split('T')[0];
        
        // Get default penalty configuration
        const defaultPenaltyConfig = await this.getDefaultPenaltyConfig();
        
        // Get all active recurring deposit accounts
        const accountsResult = await client.query(
          `SELECT rda.id, rda.savings_account_id, rda.product_id, sa.account_no, sa.client_id, sa.currency_code,
                  c.first_name || ' ' || c.last_name as client_name,
                  rdard.mandatory_recommended_deposit_amount
           FROM recurring_deposit_account rda
           JOIN savings_account sa ON rda.savings_account_id = sa.id
           JOIN recurring_deposit_account_recurring_detail rdard ON rda.id = rdard.account_id
           LEFT JOIN client c ON sa.client_id = c.id
           WHERE sa.status = 'active'
           ORDER BY sa.account_no`,
          []
        );
        
        // Initialize summary
        const summary: PenaltyApplicationSummary = {
          totalAccountsProcessed: accountsResult.rowCount,
          accountsWithPenalties: 0,
          totalPenaltiesApplied: 0,
          totalPenaltyAmount: 0,
          processedOn: penaltyDateStr,
          penalties: []
        };
        
        // Process each account
        for (const account of accountsResult.rows) {
          // Get penalty configuration for this product
          let productPenaltyConfig = null;
          try {
            const productConfigResult = await client.query(
              `SELECT * FROM recurring_deposit_penalty_config
               WHERE product_id = $1 AND is_penalty_enabled = true`,
              [account.product_id]
            );
            
            if (productConfigResult.rowCount > 0) {
              productPenaltyConfig = productConfigResult.rows[0];
            }
          } catch (error) {
            logger.warn('Error getting product penalty config, using default', { 
              error, productId: account.product_id 
            });
          }
          
          // If no product-specific config, use default
          const penaltyConfig = productPenaltyConfig || {
            is_penalty_enabled: defaultPenaltyConfig.enableAutoPenalty,
            penalty_type: defaultPenaltyConfig.penaltyType,
            penalty_amount: defaultPenaltyConfig.penaltyAmount,
            grace_period_days: defaultPenaltyConfig.gracePeriodDays,
            max_penalty_occurrences: defaultPenaltyConfig.maxPenaltiesPerInstallment
          };
          
          // If penalties not enabled, skip this account
          if (!penaltyConfig.is_penalty_enabled) {
            continue;
          }
          
          // Get tiered penalties if available
          let tieredPenalties = [];
          if (productPenaltyConfig) {
            const tieredResult = await client.query(
              `SELECT * FROM recurring_deposit_tiered_penalty 
               WHERE config_id = $1 
               ORDER BY tier_number ASC`,
              [productPenaltyConfig.id]
            );
            
            tieredPenalties = tieredResult.rows;
          } else if (defaultPenaltyConfig.advancedConfig?.tiers) {
            // Map default tiers to DB structure format
            tieredPenalties = defaultPenaltyConfig.advancedConfig.tiers.map((tier, index) => ({
              tier_number: index + 1,
              days_overdue_start: tier.daysOverdueStart,
              days_overdue_end: tier.daysOverdueEnd,
              occurrences_start: tier.occurrencesStart || 1,
              occurrences_end: tier.occurrencesEnd,
              penalty_type: tier.penaltyType,
              penalty_amount: tier.penaltyAmount,
              max_penalty_amount: tier.maxPenaltyAmount
            }));
          }
          
          // Find overdue installments for this account
          const overdueInstallmentsResult = await client.query(
            `SELECT rdsi.id as installment_id, rdsi.installment_number, rdsi.due_date,
                   rdsi.deposit_amount, rdsi.deposit_amount_completed,
                   (rdsi.deposit_amount - COALESCE(rdsi.deposit_amount_completed, 0)) as overdue_amount
             FROM recurring_deposit_schedule_installment rdsi
             WHERE rdsi.account_id = $1 AND rdsi.completed = false AND rdsi.due_date < $2
             ORDER BY rdsi.due_date ASC`,
            [account.id, penaltyDate]
          );
          
          const overdueInstallments = overdueInstallmentsResult.rows;
          
          // Apply penalties to each overdue installment if appropriate
          let accountHasPenalties = false;
          
          for (const installment of overdueInstallments) {
            const dueDate = new Date(installment.due_date);
            const daysOverdue = Math.floor((penaltyDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            
            // Skip if within grace period
            if (daysOverdue <= penaltyConfig.grace_period_days) {
              continue;
            }
            
            // Check existing penalties for this installment
            const existingPenaltiesResult = await client.query(
              `SELECT COUNT(*) 
               FROM recurring_deposit_penalty_history
               WHERE account_id = $1 AND installment_id = $2`,
              [account.id, installment.installment_id]
            );
            
            const existingPenalties = parseInt(existingPenaltiesResult.rows[0].count);
            
            // Check if we've reached the maximum penalties allowed for this installment
            if (existingPenalties >= penaltyConfig.max_penalty_occurrences) {
              continue;
            }
            
            // Determine penalty amount using tiered approach if available
            let penaltyType = penaltyConfig.penalty_type;
            let penaltyAmount = parseFloat(penaltyConfig.penalty_amount);
            let maxPenaltyAmount = null;
            let tierApplied = 0;
            
            if (tieredPenalties.length > 0) {
              // Find applicable tier based on days overdue and occurrences
              const applicableTier = tieredPenalties.find(tier => {
                const meetsStartDaysCondition = daysOverdue >= tier.days_overdue_start;
                const meetsEndDaysCondition = tier.days_overdue_end === null || daysOverdue <= tier.days_overdue_end;
                const meetsStartOccurrencesCondition = existingPenalties + 1 >= tier.occurrences_start;
                const meetsEndOccurrencesCondition = tier.occurrences_end === null || existingPenalties + 1 <= tier.occurrences_end;
                
                return meetsStartDaysCondition && meetsEndDaysCondition && 
                       meetsStartOccurrencesCondition && meetsEndOccurrencesCondition;
              });
              
              if (applicableTier) {
                penaltyType = applicableTier.penalty_type;
                penaltyAmount = parseFloat(applicableTier.penalty_amount);
                maxPenaltyAmount = applicableTier.max_penalty_amount ? parseFloat(applicableTier.max_penalty_amount) : null;
                tierApplied = applicableTier.tier_number;
              }
            }
            
            // Calculate final penalty amount
            let finalPenaltyAmount = penaltyAmount;
            if (penaltyType === 'percentage') {
              // Calculate percentage of installment amount
              finalPenaltyAmount = (penaltyAmount / 100) * parseFloat(installment.deposit_amount);
              
              // Cap at max penalty amount if specified
              if (maxPenaltyAmount !== null && finalPenaltyAmount > maxPenaltyAmount) {
                finalPenaltyAmount = maxPenaltyAmount;
              }
            }
            
            // Apply the penalty
            try {
              // Get or create penalty charge type
              const penaltyChargeId = await this.getPenaltyChargeType(client, account.currency_code);
              
              if (!penaltyChargeId) {
                logger.error('Failed to get or create penalty charge type', { 
                  accountId: account.id, currencyCode: account.currency_code 
                });
                continue;
              }
              
              // Create savings account charge
              const savingsChargeId = uuidv4();
              const additionalData = {
                installmentNumber: installment.installment_number,
                daysOverdue: daysOverdue,
                penaltyType: penaltyType,
                originalPenaltyAmount: penaltyAmount,
                missedOccurrences: existingPenalties + 1,
                tierApplied: tierApplied > 0 ? tierApplied : undefined
              };
              
              await client.query(
                `INSERT INTO savings_account_charge (
                  id, savings_account_id, charge_id, amount, amount_outstanding_derived,
                  due_date, charge_time_type, charge_calculation_type, is_paid_derived,
                  is_waived, is_penalty, additional_data, created_by, created_date
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
                [
                  savingsChargeId,
                  account.savings_account_id,
                  penaltyChargeId,
                  finalPenaltyAmount,
                  finalPenaltyAmount,
                  penaltyDate,
                  'missed_installment',
                  penaltyType === 'fixed' ? 'flat' : 'percent_of_amount',
                  false,
                  false,
                  true,
                  JSON.stringify(additionalData),
                  userId || null
                ]
              );
              
              // Create penalty history record
              const penaltyHistoryId = uuidv4();
              
              await client.query(
                `INSERT INTO recurring_deposit_penalty_history (
                  id, account_id, savings_account_charge_id, installment_id, installment_number,
                  due_date, penalty_date, days_overdue, missed_occurrences, penalty_type,
                  penalty_amount, is_waived, created_by, created_date
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
                [
                  penaltyHistoryId,
                  account.id,
                  savingsChargeId,
                  installment.installment_id,
                  installment.installment_number,
                  dueDate,
                  penaltyDate,
                  daysOverdue,
                  existingPenalties + 1,
                  penaltyType,
                  finalPenaltyAmount,
                  false,
                  userId || null
                ]
              );
              
              // Link to recurring deposit account
              const recurringDepositChargeId = uuidv4();
              
              await client.query(
                `INSERT INTO recurring_deposit_account_charge (
                  id, savings_account_charge_id, recurring_deposit_account_id, created_by, created_date
                ) VALUES ($1, $2, $3, $4, NOW())`,
                [
                  recurringDepositChargeId,
                  savingsChargeId,
                  account.id,
                  userId || null
                ]
              );
              
              // Update summary
              summary.totalPenaltiesApplied++;
              summary.totalPenaltyAmount += finalPenaltyAmount;
              
              accountHasPenalties = true;
              
              // Add to results
              summary.penalties.push({
                accountId: account.id,
                accountNo: account.account_no,
                installmentNumber: installment.installment_number,
                overdueAmount: parseFloat(installment.overdue_amount),
                penaltyAmount: finalPenaltyAmount,
                dueDate: dueDate.toISOString().split('T')[0],
                penaltyDate: penaltyDate.toISOString().split('T')[0],
                chargeId: savingsChargeId,
                penaltyHistoryId: penaltyHistoryId,
                daysOverdue: daysOverdue,
                missedOccurrences: existingPenalties + 1,
                penaltyType: penaltyType,
                tierApplied: tierApplied > 0 ? tierApplied : undefined
              });
            } catch (error) {
              logger.error('Error applying penalty for installment', { 
                error, accountId: account.id, installmentNumber: installment.installment_number 
              });
            }
          }
          
          // Count accounts with penalties
          if (accountHasPenalties) {
            summary.accountsWithPenalties++;
          }
        }
        
        // Sort penalties by account number
        summary.penalties.sort((a, b) => a.accountNo.localeCompare(b.accountNo));
        
        return summary;
      });
    } catch (error) {
      logger.error('Error applying penalties for missed installments', { error, asOfDate });
      throw error;
    }
  }
  
  /**
   * Get penalty charge type for the given currency
   * @param client Database client
   * @param currencyCode Currency code
   * @returns Charge type ID or null if not found/created
   */
  private async getPenaltyChargeType(client, currencyCode: string): Promise<string | null> {
    try {
      // Check if a penalty charge type already exists
      const chargeResult = await client.query(
        `SELECT id FROM charge
         WHERE name = 'Missed Installment Penalty'
         AND currency_code = $1
         AND is_penalty = true`,
        [currencyCode]
      );
      
      if (chargeResult.rowCount > 0) {
        return chargeResult.rows[0].id;
      }
      
      // If not, create a new charge type
      const chargeId = uuidv4();
      
      await client.query(
        `INSERT INTO charge (
          id, name, currency_code, charge_applies_to_enum,
          charge_time_type, charge_calculation_type, amount,
          is_penalty, is_active, is_savings_charge, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          chargeId,
          'Missed Installment Penalty',
          currencyCode,
          'savings',
          'missed_installment',
          'flat',
          10, // Default amount
          true,
          true,
          true
        ]
      );
      
      return chargeId;
    } catch (error) {
      logger.error('Error getting or creating penalty charge type', { error });
      return null;
    }
  }
  
  /**
   * Get penalty history for an account
   * @param accountId Recurring deposit account ID
   * @returns List of penalty history entries
   */
  async getPenaltyHistory(accountId: string): Promise<PenaltyHistoryResponse[]> {
    logger.info('Getting penalty history for account', { accountId });
    
    try {
      const historyResult = await query(
        `SELECT rdph.*, sa.account_no, c.id as client_id, c.first_name || ' ' || c.last_name as client_name,
                u.username as waived_by_username
         FROM recurring_deposit_penalty_history rdph
         JOIN recurring_deposit_account rda ON rdph.account_id = rda.id
         JOIN savings_account sa ON rda.savings_account_id = sa.id
         LEFT JOIN client c ON sa.client_id = c.id
         LEFT JOIN app_user u ON rdph.waived_by = u.id
         WHERE rdph.account_id = $1
         ORDER BY rdph.penalty_date DESC, rdph.installment_number ASC`,
        [accountId]
      );
      
      return historyResult.rows.map(item => ({
        id: item.id,
        accountId: item.account_id,
        accountNo: item.account_no,
        clientId: item.client_id,
        clientName: item.client_name,
        installmentNumber: item.installment_number,
        dueDate: item.due_date.toISOString().split('T')[0],
        penaltyDate: item.penalty_date.toISOString().split('T')[0],
        daysOverdue: item.days_overdue,
        missedOccurrences: item.missed_occurrences,
        penaltyType: item.penalty_type,
        penaltyAmount: parseFloat(item.penalty_amount),
        isWaived: item.is_waived,
        waivedDate: item.waived_date ? item.waived_date.toISOString().split('T')[0] : undefined,
        waivedByUsername: item.waived_by_username,
        waiverReason: item.waiver_reason
      }));
    } catch (error) {
      logger.error('Error getting penalty history', { error, accountId });
      throw error;
    }
  }
  
  /**
   * Search penalty history with various criteria
   * @param criteria Search criteria
   * @returns Matching penalty history entries
   */
  async searchPenaltyHistory(criteria: PenaltyHistorySearchCriteria): Promise<PenaltyHistoryResponse[]> {
    logger.info('Searching penalty history', { criteria });
    
    try {
      let query = `
        SELECT rdph.*, sa.account_no, c.id as client_id, c.first_name || ' ' || c.last_name as client_name,
               u.username as waived_by_username
        FROM recurring_deposit_penalty_history rdph
        JOIN recurring_deposit_account rda ON rdph.account_id = rda.id
        JOIN savings_account sa ON rda.savings_account_id = sa.id
        LEFT JOIN client c ON sa.client_id = c.id
        LEFT JOIN app_user u ON rdph.waived_by = u.id
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;
      
      // Apply filters based on criteria
      if (criteria.accountId) {
        query += ` AND rdph.account_id = $${paramIndex}`;
        params.push(criteria.accountId);
        paramIndex++;
      }
      
      if (criteria.clientId) {
        query += ` AND c.id = $${paramIndex}`;
        params.push(criteria.clientId);
        paramIndex++;
      }
      
      if (criteria.fromDate) {
        query += ` AND rdph.penalty_date >= $${paramIndex}`;
        params.push(criteria.fromDate);
        paramIndex++;
      }
      
      if (criteria.toDate) {
        query += ` AND rdph.penalty_date <= $${paramIndex}`;
        params.push(criteria.toDate);
        paramIndex++;
      }
      
      if (criteria.isWaived !== undefined) {
        query += ` AND rdph.is_waived = $${paramIndex}`;
        params.push(criteria.isWaived);
        paramIndex++;
      }
      
      if (criteria.minAmount) {
        query += ` AND rdph.penalty_amount >= $${paramIndex}`;
        params.push(criteria.minAmount);
        paramIndex++;
      }
      
      if (criteria.maxAmount) {
        query += ` AND rdph.penalty_amount <= $${paramIndex}`;
        params.push(criteria.maxAmount);
        paramIndex++;
      }
      
      // Add sorting
      query += ` ORDER BY rdph.penalty_date DESC, rdph.account_id, rdph.installment_number ASC`;
      
      // Add pagination if specified
      if (criteria.page !== undefined && criteria.pageSize !== undefined) {
        const offset = (criteria.page - 1) * criteria.pageSize;
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(criteria.pageSize, offset);
      }
      
      const historyResult = await this.executeQuery(query, params);
      
      return historyResult.rows.map(item => ({
        id: item.id,
        accountId: item.account_id,
        accountNo: item.account_no,
        clientId: item.client_id,
        clientName: item.client_name,
        installmentNumber: item.installment_number,
        dueDate: item.due_date.toISOString().split('T')[0],
        penaltyDate: item.penalty_date.toISOString().split('T')[0],
        daysOverdue: item.days_overdue,
        missedOccurrences: item.missed_occurrences,
        penaltyType: item.penalty_type,
        penaltyAmount: parseFloat(item.penalty_amount),
        isWaived: item.is_waived,
        waivedDate: item.waived_date ? item.waived_date.toISOString().split('T')[0] : undefined,
        waivedByUsername: item.waived_by_username,
        waiverReason: item.waiver_reason
      }));
    } catch (error) {
      logger.error('Error searching penalty history', { error, criteria });
      throw error;
    }
  }
  
  /**
   * Execute a database query
   * Helper to avoid duplicate code with postgres module
   */
  private async executeQuery(queryStr: string, params: any[] = []) {
    return await query(queryStr, params);
  }
  
  /**
   * Waive a penalty
   * @param request Penalty waiver request
   * @param userId Current user ID
   * @returns Success indicator
   */
  async waivePenalty(request: RecurringDepositPenaltyWaiverRequest, userId?: string): Promise<boolean> {
    logger.info('Waiving penalty', { penaltyId: request.penaltyId });
    
    try {
      return await transaction(async (client) => {
        // Get penalty info
        const penaltyResult = await client.query(
          `SELECT rdph.*, sac.id as charge_id
           FROM recurring_deposit_penalty_history rdph
           JOIN savings_account_charge sac ON rdph.savings_account_charge_id = sac.id
           WHERE rdph.id = $1`,
          [request.penaltyId]
        );
        
        if (penaltyResult.rowCount === 0) {
          throw new Error(`Penalty with ID ${request.penaltyId} not found`);
        }
        
        const penalty = penaltyResult.rows[0];
        
        // Check if already waived
        if (penalty.is_waived) {
          throw new Error('This penalty has already been waived');
        }
        
        const waivedDate = request.waiveDate ? new Date(request.waiveDate) : new Date();
        
        // Update penalty history
        await client.query(
          `UPDATE recurring_deposit_penalty_history
           SET is_waived = true,
               waived_date = $1,
               waived_by = $2,
               waiver_reason = $3,
               last_modified_date = NOW(),
               last_modified_by = $2
           WHERE id = $4`,
          [waivedDate, userId || null, request.waiverReason, request.penaltyId]
        );
        
        // Update savings account charge
        await client.query(
          `UPDATE savings_account_charge
           SET is_waived = true,
               waived_on_date = $1,
               amount_waived_derived = amount,
               amount_outstanding_derived = 0,
               last_modified_date = NOW(),
               last_modified_by = $2
           WHERE id = $3`,
          [waivedDate, userId || null, penalty.charge_id]
        );
        
        // Create a journal entry or transaction record if needed for accounting
        // This would depend on the specific accounting requirements
        
        return true;
      });
    } catch (error) {
      logger.error('Error waiving penalty', { error, penaltyId: request.penaltyId });
      throw error;
    }
  }
}

// Export a singleton instance
export const recurringDepositPenaltyService = new RecurringDepositPenaltyService();