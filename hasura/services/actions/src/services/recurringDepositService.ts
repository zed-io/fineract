/**
 * Recurring Deposit Service for Fineract
 * Provides functionality for managing recurring deposit products and accounts
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../utils/db';
import { logger } from '../utils/logger';
import {
  RecurringDepositProduct,
  RecurringDepositProductCreateRequest,
  RecurringDepositInterestRateChart,
  RecurringDepositInterestRateSlab,
  RecurringDepositAccount,
  RecurringDepositAccountCreateRequest,
  RecurringDepositAccountRecurringDetail,
  RecurringDepositScheduleInstallment,
  RecurringDepositTransaction,
  RecurringDepositAccountCharge,
  RecurringDepositAccountApprovalRequest,
  RecurringDepositAccountActivateRequest,
  RecurringDepositAccountDepositRequest,
  RecurringDepositAccountWithdrawalRequest,
  RecurringDepositAccountPrematureCloseRequest,
  RecurringDepositAccountMaturityInstructionsUpdateRequest,
  RecurringDepositProductResponse,
  RecurringDepositAccountResponse,
  RecurringDepositAccountDepositResponse,
  RecurringDepositAccountWithdrawalResponse
} from '../models/recurringDeposit';
import { generateAccountNumber, calculateFutureDate, calculateMaturityAmount, getCompoundingFrequency, calculateTermInYears } from '../utils/accountUtils';

/**
 * Interface for the installment tracking response
 */
export interface InstallmentTrackingResult {
  accountId: string;
  accountNo: string;
  overdueInstallments: number;
  totalOverdueAmount: number;
  clientId?: string;
  clientName?: string;
  lastCheckedDate: string;
  penaltyApplied?: boolean;
  penaltyAmount?: number;
}

/**
 * Interface for the installment tracking summary
 */
export interface InstallmentTrackingSummary {
  totalAccountsChecked: number;
  accountsWithOverdueInstallments: number;
  totalOverdueInstallments: number;
  totalOverdueAmount: number;
  totalPenaltiesApplied: number;
  totalPenaltyAmount: number;
  processedOn: string;
  accounts: InstallmentTrackingResult[];
}

/**
 * Interface for penalty configuration
 */
export interface PenaltyConfig {
  enableAutoPenalty: boolean;
  penaltyType: 'fixed' | 'percentage';
  penaltyAmount: number; // Either fixed amount or percentage of installment
  gracePeriodDays: number; // Days after due date before penalty is applied
  maxPenaltiesPerInstallment: number; // Maximum number of penalties per missed installment
}

/**
 * Interface for the penalty application result
 */
export interface PenaltyApplicationResult {
  accountId: string;
  accountNo: string;
  installmentNumber: number;
  overdueAmount: number;
  penaltyAmount: number;
  dueDate: string;
  penaltyDate: string;
  chargeId?: string;
  transactionId?: string;
}

/**
 * Interface for the penalty application summary
 */
export interface PenaltyApplicationSummary {
  totalAccountsProcessed: number;
  totalPenaltiesApplied: number;
  totalPenaltyAmount: number;
  processedOn: string;
  penalties: PenaltyApplicationResult[];
}

export class RecurringDepositService {

  /**
   * Track installments for recurring deposit accounts
   * Identifies overdue installments and updates account statistics
   * @param asOfDate Optional date to use for tracking (defaults to current date)
   * @param userId Current user ID
   * @returns Summary of tracking results
   */
  async trackInstallments(asOfDate?: string, applyPenalties: boolean = false, userId?: string): Promise<InstallmentTrackingSummary> {
    logger.info('Tracking recurring deposit installments', { asOfDate, applyPenalties });

    try {
      return await transaction(async (client) => {
        // Use current date if asOfDate not provided
        const trackingDate = asOfDate ? new Date(asOfDate) : new Date();
        const trackingDateStr = trackingDate.toISOString().split('T')[0];

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

        // Initialize tracking summary
        const summary: InstallmentTrackingSummary = {
          totalAccountsChecked: accountsResult.rowCount,
          accountsWithOverdueInstallments: 0,
          totalOverdueInstallments: 0,
          totalOverdueAmount: 0,
          totalPenaltiesApplied: 0,
          totalPenaltyAmount: 0,
          processedOn: trackingDateStr,
          accounts: []
        };

        // Get penalty configuration (could be stored in database or config)
        const penaltyConfig = await this.getPenaltyConfig(client);

        // Process each account
        for (const account of accountsResult.rows) {
          // Find overdue installments for this account
          const overdueInstallmentsResult = await client.query(
            `SELECT rdsi.id as installment_id, rdsi.installment_number, rdsi.due_date,
                   rdsi.deposit_amount, rdsi.deposit_amount_completed,
                   (rdsi.deposit_amount - COALESCE(rdsi.deposit_amount_completed, 0)) as overdue_amount
             FROM recurring_deposit_schedule_installment rdsi
             WHERE rdsi.account_id = $1 AND rdsi.completed = false AND rdsi.due_date < $2
             ORDER BY rdsi.due_date ASC`,
            [account.id, trackingDate]
          );

          const overdueInstallments = overdueInstallmentsResult.rows;
          const overdueCount = overdueInstallments.length;
          const overdueAmount = overdueInstallments.reduce((sum, inst) => sum + parseFloat(inst.overdue_amount), 0);

          // Track penalties to apply for this account
          let penaltiesApplied = 0;
          let penaltyAmountTotal = 0;

          if (overdueCount > 0) {
            // Add to accounts with overdue installments
            summary.accountsWithOverdueInstallments++;
            summary.totalOverdueInstallments += overdueCount;
            summary.totalOverdueAmount += overdueAmount;

            // Apply penalties if enabled
            if (applyPenalties && penaltyConfig.enableAutoPenalty) {
              for (const installment of overdueInstallments) {
                const dueDate = new Date(installment.due_date);
                const daysSinceOverdue = Math.floor((trackingDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

                // Check if we should apply penalty (grace period passed)
                if (daysSinceOverdue > penaltyConfig.gracePeriodDays) {
                  // Check if we've already applied penalties for this installment
                  const existingPenaltiesResult = await client.query(
                    `SELECT COUNT(*)
                     FROM savings_account_charge sac
                     JOIN recurring_deposit_account_charge rdac ON sac.id = rdac.savings_account_charge_id
                     WHERE rdac.recurring_deposit_account_id = $1
                     AND sac.charge_time_type = 'missed_installment'
                     AND sac.additional_data->>'installmentNumber' = $2`,
                    [account.id, installment.installment_number.toString()]
                  );

                  const existingPenalties = parseInt(existingPenaltiesResult.rows[0].count);

                  // Check if we're under the max penalties per installment limit
                  if (existingPenalties < penaltyConfig.maxPenaltiesPerInstallment) {
                    // Calculate penalty amount
                    let penaltyAmount = 0;
                    if (penaltyConfig.penaltyType === 'fixed') {
                      penaltyAmount = penaltyConfig.penaltyAmount;
                    } else {
                      // Percentage of installment
                      penaltyAmount = (penaltyConfig.penaltyAmount / 100) * parseFloat(installment.deposit_amount);
                    }

                    // Apply the penalty as a charge
                    const chargeId = await this.applyPenaltyCharge(
                      client,
                      account.id,
                      account.savings_account_id,
                      account.currency_code,
                      installment.installment_number,
                      penaltyAmount,
                      trackingDate,
                      userId
                    );

                    if (chargeId) {
                      penaltiesApplied++;
                      penaltyAmountTotal += penaltyAmount;

                      summary.totalPenaltiesApplied++;
                      summary.totalPenaltyAmount += penaltyAmount;
                    }
                  }
                }
              }
            }

            // Add account to results
            summary.accounts.push({
              accountId: account.id,
              accountNo: account.account_no,
              overdueInstallments: overdueCount,
              totalOverdueAmount: overdueAmount,
              clientId: account.client_id,
              clientName: account.client_name,
              lastCheckedDate: trackingDateStr,
              penaltyApplied: penaltiesApplied > 0,
              penaltyAmount: penaltyAmountTotal
            });

            // Update account recurring details with overdue information
            await client.query(
              `UPDATE recurring_deposit_account_recurring_detail
               SET total_overdue_amount = $1,
                   no_of_overdue_installments = $2,
                   last_modified_by = $3,
                   last_modified_date = NOW()
               WHERE account_id = $4`,
              [overdueAmount, overdueCount, userId || null, account.id]
            );
          }
        }

        // Sort the accounts by number of overdue installments (descending)
        summary.accounts.sort((a, b) => b.overdueInstallments - a.overdueInstallments);

        return summary;
      });
    } catch (error) {
      logger.error('Error tracking recurring deposit installments', { error, asOfDate });
      throw error;
    }
  }

  /**
   * Legacy method: Get penalty configuration for recurring deposits
   * This is now a wrapper to use the new penalty service
   * @param client Database client
   * @returns Penalty configuration
   */
  private async getPenaltyConfig(client): Promise<PenaltyConfig> {
    try {
      // Import the service here to avoid circular dependencies
      const { recurringDepositPenaltyService } = require('./recurringDepositPenaltyService');
      const defaultConfig = await recurringDepositPenaltyService.getDefaultPenaltyConfig();
      
      // Convert to the format expected by the existing code
      return {
        enableAutoPenalty: defaultConfig.enableAutoPenalty,
        penaltyType: defaultConfig.penaltyType,
        penaltyAmount: defaultConfig.penaltyAmount,
        gracePeriodDays: defaultConfig.gracePeriodDays,
        maxPenaltiesPerInstallment: defaultConfig.maxPenaltiesPerInstallment
      };
    } catch (error) {
      logger.error('Error getting penalty configuration', { error });

      // Fallback to default configuration
      return {
        enableAutoPenalty: true,
        penaltyType: 'fixed',
        penaltyAmount: 10,
        gracePeriodDays: 5,
        maxPenaltiesPerInstallment: 1
      };
    }
  }

  /**
   * Legacy method: Apply a penalty charge to a recurring deposit account
   * Now delegates to the dedicated penalty service 
   * @param client Database client
   * @param accountId Recurring deposit account ID
   * @param savingsAccountId Associated savings account ID
   * @param currencyCode Currency code
   * @param installmentNumber Installment number the penalty is for
   * @param amount Penalty amount
   * @param penaltyDate Date of penalty application
   * @param userId Current user ID
   * @returns Created charge ID or null if creation failed
   */
  private async applyPenaltyCharge(
    client,
    accountId: string,
    savingsAccountId: string,
    currencyCode: string,
    installmentNumber: number,
    amount: number,
    penaltyDate: Date,
    userId?: string
  ): Promise<string | null> {
    try {
      // Get the installment ID for this account and installment number
      const installmentResult = await client.query(
        `SELECT id FROM recurring_deposit_schedule_installment
         WHERE account_id = $1 AND installment_number = $2`,
        [accountId, installmentNumber]
      );
      
      if (installmentResult.rowCount === 0) {
        logger.error('Installment not found', { accountId, installmentNumber });
        return null;
      }
      
      const installmentId = installmentResult.rows[0].id;
      
      // First, get or create a penalty charge type if needed
      let penaltyChargeId = await this.getPenaltyChargeType(client, currencyCode);

      if (!penaltyChargeId) {
        logger.error('No penalty charge type found or created');
        return null;
      }

      // Create a savings account charge
      const savingsChargeId = uuidv4();
      const daysOverdue = 0; // This would need to be calculated properly

      await client.query(
        `INSERT INTO savings_account_charge (
          id, savings_account_id, charge_id, amount, amount_outstanding_derived,
          due_date, charge_time_type, charge_calculation_type, is_paid_derived,
          is_waived, is_penalty, additional_data, created_by, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
        [
          savingsChargeId,
          savingsAccountId,
          penaltyChargeId,
          amount,
          amount,
          penaltyDate,
          'missed_installment',
          'flat',
          false,
          false,
          true,
          JSON.stringify({
            installmentNumber,
            installmentId,
            appliedDate: penaltyDate.toISOString(),
            daysOverdue: daysOverdue,
            penaltyType: 'fixed'
          }),
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
          accountId,
          userId || null
        ]
      );
      
      // Create penalty history record to maintain consistency with new schema
      const penaltyHistoryId = uuidv4();
      
      await client.query(
        `INSERT INTO recurring_deposit_penalty_history (
          id, account_id, savings_account_charge_id, installment_id, installment_number,
          due_date, penalty_date, days_overdue, missed_occurrences, penalty_type,
          penalty_amount, is_waived, created_by, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
        [
          penaltyHistoryId,
          accountId,
          savingsChargeId,
          installmentId,
          installmentNumber,
          penaltyDate, // Using penalty date as due date as well since we don't have the actual due date
          penaltyDate,
          daysOverdue,
          1, // First occurrence
          'fixed',
          amount,
          false,
          userId || null
        ]
      );

      return savingsChargeId;
    } catch (error) {
      logger.error('Error applying penalty charge', {
        error, accountId, installmentNumber, amount
      });
      return null;
    }
  }

  /**
   * Legacy method: Get or create a penalty charge type
   * @param client Database client
   * @param currencyCode Currency code
   * @returns Charge type ID
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
   * Create a new recurring deposit product
   * @param request Recurring deposit product creation request
   * @param userId Current user ID
   * @returns Created product ID
   */
  async createProduct(request: RecurringDepositProductCreateRequest, userId?: string): Promise<string> {
    logger.info('Creating recurring deposit product', { productName: request.name });
    
    try {
      return await transaction(async (client) => {
        // First create savings product
        const savingsProductId = uuidv4();
        
        await client.query(
          `INSERT INTO savings_product (
            id, name, short_name, description, currency_code, currency_digits, 
            nominal_annual_interest_rate, interest_compounding_period_type, 
            interest_posting_period_type, interest_calculation_type, 
            interest_calculation_days_in_year_type, min_required_opening_balance,
            lockin_period_frequency, lockin_period_frequency_type, 
            accounting_type, active, created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())`,
          [
            savingsProductId,
            request.name,
            request.shortName,
            request.description || null,
            request.currencyCode,
            request.currencyDigits || 2,
            request.interestRate,
            request.interestCompoundingPeriodType,
            request.interestPostingPeriodType,
            request.interestCalculationType,
            request.interestCalculationDaysInYearType,
            request.minDepositAmount || null,
            request.lockinPeriodFrequency || null,
            request.lockinPeriodFrequencyType || null,
            request.accountingRule,
            true,
            userId || null
          ]
        );
        
        // Then create recurring deposit product
        const recurringDepositProductId = uuidv4();
        
        await client.query(
          `INSERT INTO recurring_deposit_product (
            id, savings_product_id, min_deposit_term, max_deposit_term, 
            min_deposit_term_type_enum, max_deposit_term_type_enum, 
            in_multiples_of_term, in_multiples_of_term_type_enum, 
            is_premature_closure_allowed, pre_closure_penal_applicable, 
            pre_closure_penal_interest, pre_closure_penal_interest_on_type_enum, 
            min_deposit_amount, max_deposit_amount, recurring_frequency,
            recurring_frequency_type, is_mandatory, allow_withdrawal,
            adjust_advance_towards_future_payments, is_calendar_inherited,
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, NOW())`,
          [
            recurringDepositProductId,
            savingsProductId,
            request.minDepositTerm,
            request.maxDepositTerm || null,
            request.minDepositTermType,
            request.maxDepositTermType || null,
            request.inMultiplesOfTerm || null,
            request.inMultiplesOfTermType || null,
            request.isPrematureClosureAllowed,
            request.preClosurePenalApplicable,
            request.preClosurePenalInterest || null,
            request.preClosurePenalInterestOnType || null,
            request.minDepositAmount || null,
            request.maxDepositAmount || null,
            request.recurringFrequency,
            request.recurringFrequencyType,
            request.isMandatory,
            request.allowWithdrawal,
            request.adjustAdvanceTowardsFuturePayments,
            request.isCalendarInherited || false,
            userId || null
          ]
        );
        
        // Add charges if provided
        if (request.charges && request.charges.length > 0) {
          for (const chargeId of request.charges) {
            await client.query(
              `INSERT INTO savings_product_charge (
                id, savings_product_id, charge_id, created_by, created_date
              ) VALUES ($1, $2, $3, $4, NOW())`,
              [uuidv4(), savingsProductId, chargeId, userId || null]
            );
          }
        }
        
        // Add interest rate charts if provided
        if (request.charts && request.charts.length > 0) {
          for (const chart of request.charts) {
            const chartId = uuidv4();
            
            await client.query(
              `INSERT INTO recurring_deposit_interest_rate_chart (
                id, product_id, name, description, from_date, end_date, 
                is_primary_grouping_by_amount, created_by, created_date
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
              [
                chartId,
                recurringDepositProductId,
                chart.name,
                chart.description || null,
                new Date(chart.fromDate),
                chart.endDate ? new Date(chart.endDate) : null,
                chart.isPrimaryGroupingByAmount,
                userId || null
              ]
            );
            
            // Add slabs to chart
            if (chart.chartSlabs && chart.chartSlabs.length > 0) {
              for (const slab of chart.chartSlabs) {
                await client.query(
                  `INSERT INTO recurring_deposit_interest_rate_slab (
                    id, interest_rate_chart_id, description, period_type_enum, 
                    from_period, to_period, amount_range_from, amount_range_to, 
                    annual_interest_rate, currency_code, created_by, created_date
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
                  [
                    uuidv4(),
                    chartId,
                    slab.description || null,
                    slab.periodType,
                    slab.fromPeriod,
                    slab.toPeriod || null,
                    slab.amountRangeFrom || null,
                    slab.amountRangeTo || null,
                    slab.annualInterestRate,
                    slab.currencyCode,
                    userId || null
                  ]
                );
              }
            }
          }
        }
        
        return recurringDepositProductId;
      });
    } catch (error) {
      logger.error('Error creating recurring deposit product', { error, request });
      throw error;
    }
  }
  
  /**
   * Get recurring deposit product by ID
   * @param productId Product ID
   * @returns Recurring deposit product details
   */
  async getProduct(productId: string): Promise<RecurringDepositProductResponse> {
    logger.info('Getting recurring deposit product', { productId });
    
    try {
      // Get product details
      const productResult = await query(
        `SELECT rdp.*, sp.name, sp.short_name, sp.description, sp.currency_code, 
          sp.currency_digits, sp.nominal_annual_interest_rate, 
          sp.interest_compounding_period_type, sp.interest_posting_period_type,
          sp.interest_calculation_type, sp.interest_calculation_days_in_year_type,
          sp.accounting_type, c.name as currency_name
        FROM recurring_deposit_product rdp
        JOIN savings_product sp ON rdp.savings_product_id = sp.id
        JOIN currency c ON sp.currency_code = c.code
        WHERE rdp.id = $1`,
        [productId]
      );
      
      if (productResult.rowCount === 0) {
        throw new Error(`Recurring deposit product with ID ${productId} not found`);
      }
      
      const product = productResult.rows[0];
      
      // Get interest rate charts
      const chartsResult = await query(
        `SELECT * FROM recurring_deposit_interest_rate_chart 
         WHERE product_id = $1
         ORDER BY from_date DESC`,
        [productId]
      );
      
      const charts = [];
      
      for (const chart of chartsResult.rows) {
        // Get slabs for each chart
        const slabsResult = await query(
          `SELECT s.*, c.name as currency_name, c.decimal_places, c.in_multiples_of
           FROM recurring_deposit_interest_rate_slab s
           JOIN currency c ON s.currency_code = c.code
           WHERE s.interest_rate_chart_id = $1
           ORDER BY s.from_period ASC, s.amount_range_from ASC`,
          [chart.id]
        );
        
        const slabs = slabsResult.rows.map(slab => ({
          id: slab.id,
          description: slab.description,
          periodType: {
            id: 0,
            code: slab.period_type_enum,
            value: slab.period_type_enum
          },
          fromPeriod: slab.from_period,
          toPeriod: slab.to_period,
          amountRangeFrom: slab.amount_range_from,
          amountRangeTo: slab.amount_range_to,
          annualInterestRate: slab.annual_interest_rate,
          currency: {
            code: slab.currency_code,
            name: slab.currency_name,
            decimalPlaces: slab.decimal_places,
            inMultiplesOf: slab.in_multiples_of,
            displaySymbol: slab.currency_code,
            nameCode: slab.currency_code.toLowerCase(),
            displayLabel: `${slab.currency_name} (${slab.currency_code})`
          }
        }));
        
        charts.push({
          id: chart.id,
          name: chart.name,
          description: chart.description,
          fromDate: chart.from_date.toISOString().split('T')[0],
          endDate: chart.end_date ? chart.end_date.toISOString().split('T')[0] : undefined,
          isPrimaryGroupingByAmount: chart.is_primary_grouping_by_amount,
          chartSlabs: slabs
        });
      }
      
      // Format the response
      return {
        id: product.id,
        name: product.name,
        shortName: product.short_name,
        description: product.description,
        currency: {
          code: product.currency_code,
          name: product.currency_name,
          decimalPlaces: product.currency_digits,
          inMultiplesOf: 1,
          displaySymbol: product.currency_code,
          nameCode: product.currency_code.toLowerCase(),
          displayLabel: `${product.currency_name} (${product.currency_code})`
        },
        recurringFrequency: product.recurring_frequency,
        recurringFrequencyType: {
          id: 0,
          code: product.recurring_frequency_type,
          value: product.recurring_frequency_type
        },
        isMandatory: product.is_mandatory,
        allowWithdrawal: product.allow_withdrawal,
        adjustAdvanceTowardsFuturePayments: product.adjust_advance_towards_future_payments,
        minDepositTerm: product.min_deposit_term,
        maxDepositTerm: product.max_deposit_term,
        minDepositTermType: {
          id: 0,
          code: product.min_deposit_term_type_enum,
          value: product.min_deposit_term_type_enum
        },
        maxDepositTermType: product.max_deposit_term_type_enum ? {
          id: 0,
          code: product.max_deposit_term_type_enum,
          value: product.max_deposit_term_type_enum
        } : undefined,
        inMultiplesOfTerm: product.in_multiples_of_term,
        inMultiplesOfTermType: product.in_multiples_of_term_type_enum ? {
          id: 0,
          code: product.in_multiples_of_term_type_enum,
          value: product.in_multiples_of_term_type_enum
        } : undefined,
        preClosurePenalApplicable: product.pre_closure_penal_applicable,
        preClosurePenalInterest: product.pre_closure_penal_interest,
        preClosurePenalInterestOnType: product.pre_closure_penal_interest_on_type_enum ? {
          id: 0,
          code: product.pre_closure_penal_interest_on_type_enum,
          value: product.pre_closure_penal_interest_on_type_enum
        } : undefined,
        minDepositAmount: product.min_deposit_amount,
        maxDepositAmount: product.max_deposit_amount,
        interestCompoundingPeriodType: {
          id: 0,
          code: product.interest_compounding_period_type,
          value: product.interest_compounding_period_type
        },
        interestPostingPeriodType: {
          id: 0,
          code: product.interest_posting_period_type,
          value: product.interest_posting_period_type
        },
        interestCalculationType: {
          id: 0,
          code: product.interest_calculation_type,
          value: product.interest_calculation_type
        },
        interestCalculationDaysInYearType: {
          id: 0,
          code: product.interest_calculation_days_in_year_type.toString(),
          value: product.interest_calculation_days_in_year_type.toString()
        },
        accountingRule: {
          id: 0,
          code: product.accounting_type,
          value: product.accounting_type
        },
        charts
      };
    } catch (error) {
      logger.error('Error getting recurring deposit product', { error, productId });
      throw error;
    }
  }
  
  /**
   * Get all recurring deposit products
   * @returns List of recurring deposit products
   */
  async getProducts(): Promise<RecurringDepositProductResponse[]> {
    logger.info('Getting all recurring deposit products');
    
    try {
      const productsResult = await query(
        `SELECT rdp.id
         FROM recurring_deposit_product rdp
         JOIN savings_product sp ON rdp.savings_product_id = sp.id
         WHERE sp.active = true
         ORDER BY sp.name`
      );
      
      const products = [];
      
      for (const row of productsResult.rows) {
        const product = await this.getProduct(row.id);
        products.push(product);
      }
      
      return products;
    } catch (error) {
      logger.error('Error getting recurring deposit products', { error });
      throw error;
    }
  }
  
  /**
   * Create a recurring deposit account
   * @param request Recurring deposit account creation request
   * @param userId Current user ID
   * @returns Created account ID
   */
  async createAccount(request: RecurringDepositAccountCreateRequest, userId?: string): Promise<string> {
    logger.info('Creating recurring deposit account', { productId: request.productId });
    
    try {
      return await transaction(async (client) => {
        // Validate client or group is provided
        if (!request.clientId && !request.groupId) {
          throw new Error('Either clientId or groupId must be provided');
        }
        
        // Validate product exists
        const productResult = await client.query(
          `SELECT rdp.*, sp.currency_code, sp.nominal_annual_interest_rate 
           FROM recurring_deposit_product rdp
           JOIN savings_product sp ON rdp.savings_product_id = sp.id
           WHERE rdp.id = $1`,
          [request.productId]
        );
        
        if (productResult.rowCount === 0) {
          throw new Error(`Recurring deposit product with ID ${request.productId} not found`);
        }
        
        const product = productResult.rows[0];
        
        // Validate client if provided
        if (request.clientId) {
          const clientResult = await client.query(
            'SELECT * FROM client WHERE id = $1',
            [request.clientId]
          );
          
          if (clientResult.rowCount === 0) {
            throw new Error(`Client with ID ${request.clientId} not found`);
          }
        }
        
        // Validate group if provided
        if (request.groupId) {
          const groupResult = await client.query(
            'SELECT * FROM client_group WHERE id = $1',
            [request.groupId]
          );
          
          if (groupResult.rowCount === 0) {
            throw new Error(`Group with ID ${request.groupId} not found`);
          }
        }
        
        // Validate field officer if provided
        if (request.fieldOfficerId) {
          const staffResult = await client.query(
            'SELECT * FROM staff WHERE id = $1',
            [request.fieldOfficerId]
          );
          
          if (staffResult.rowCount === 0) {
            throw new Error(`Staff with ID ${request.fieldOfficerId} not found`);
          }
        }
        
        // Validate linked account if provided
        if (request.linkedAccountId) {
          const linkedAccountResult = await client.query(
            'SELECT * FROM savings_account WHERE id = $1',
            [request.linkedAccountId]
          );
          
          if (linkedAccountResult.rowCount === 0) {
            throw new Error(`Linked savings account with ID ${request.linkedAccountId} not found`);
          }
        }
        
        // Set default values from product if not provided
        const recurringFrequency = request.recurringFrequency || product.recurring_frequency;
        const recurringFrequencyType = request.recurringFrequencyType || product.recurring_frequency_type;
        const isMandatory = request.isMandatory !== undefined ? request.isMandatory : product.is_mandatory;
        const allowWithdrawal = request.allowWithdrawal !== undefined ? request.allowWithdrawal : product.allow_withdrawal;
        const adjustAdvance = request.adjustAdvanceTowardsFuturePayments !== undefined ? 
                            request.adjustAdvanceTowardsFuturePayments : 
                            product.adjust_advance_towards_future_payments;
        
        // Generate account number
        const accountNo = generateAccountNumber('RD');
        
        // Create savings account first
        const savingsAccountId = uuidv4();
        
        await client.query(
          `INSERT INTO savings_account (
            id, account_no, external_id, client_id, group_id, product_id, 
            field_officer_id, status, account_type, currency_code, currency_digits,
            nominal_annual_interest_rate, interest_compounding_period_type,
            interest_posting_period_type, interest_calculation_type,
            interest_calculation_days_in_year_type, min_required_opening_balance,
            created_by, created_date, submitted_on_date
          ) SELECT $1, $2, $3, $4, $5, sp.id, $6, $7, $8, sp.currency_code, 
                 sp.currency_digits, $9, sp.interest_compounding_period_type,
                 sp.interest_posting_period_type, sp.interest_calculation_type,
                 sp.interest_calculation_days_in_year_type, $10, $11, NOW(), $12
          FROM recurring_deposit_product rdp
          JOIN savings_product sp ON rdp.savings_product_id = sp.id
          WHERE rdp.id = $13`,
          [
            savingsAccountId,
            accountNo,
            request.externalId || null,
            request.clientId || null,
            request.groupId || null,
            product.savings_product_id,
            request.fieldOfficerId || null,
            'submitted_and_pending_approval',
            request.clientId ? 'individual' : 'group',
            request.interestRate || product.nominal_annual_interest_rate,
            request.depositAmount,
            userId || null,
            new Date(request.submittedOnDate),
            request.productId
          ]
        );
        
        // Calculate expected maturity date based on deposit period
        const submittedDate = new Date(request.submittedOnDate);
        const depositPeriod = request.depositPeriod;
        const depositPeriodType = request.depositPeriodFrequencyType;
        
        const expectedMaturityDate = calculateFutureDate(
          submittedDate, 
          depositPeriod, 
          depositPeriodType
        );
        
        // Calculate the expected number of deposits
        const timeInYears = calculateTermInYears(depositPeriod, depositPeriodType);
        const recurringTimeUnit = calculateTermInYears(recurringFrequency, recurringFrequencyType);
        const expectedNumberOfDeposits = Math.floor(timeInYears / recurringTimeUnit);
        
        // Calculate expected maturity amount (simplified)
        const compoundingFrequency = getCompoundingFrequency(product.interest_compounding_period_type);
        const interestRate = request.interestRate || product.nominal_annual_interest_rate;
        const totalDeposits = request.depositAmount * expectedNumberOfDeposits;
        
        // Calculate expected maturity amount (this is simplified and should be more complex in a real implementation)
        const expectedMaturityAmount = calculateMaturityAmount(
          totalDeposits, 
          interestRate, 
          timeInYears, 
          compoundingFrequency
        );
        
        // Calculate first deposit date
        const firstDepositDate = request.expectedFirstDepositOnDate 
          ? new Date(request.expectedFirstDepositOnDate) 
          : submittedDate;
        
        // Create recurring deposit account
        const recurringDepositAccountId = uuidv4();
        
        await client.query(
          `INSERT INTO recurring_deposit_account (
            id, savings_account_id, product_id, deposit_amount, deposit_period,
            deposit_period_frequency_type_enum, expected_maturity_amount, expected_maturity_date,
            interest_rate, is_renewal_allowed, is_premature_closure_allowed, 
            pre_closure_penal_applicable, pre_closure_penal_interest, 
            pre_closure_penal_interest_on_type_enum, on_account_closure_type, 
            transfer_to_savings_account_id, linked_account_id, 
            transfer_interest_to_linked_account, created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())`,
          [
            recurringDepositAccountId,
            savingsAccountId,
            request.productId,
            request.depositAmount,
            request.depositPeriod,
            request.depositPeriodFrequencyType,
            expectedMaturityAmount,
            expectedMaturityDate,
            request.interestRate || product.nominal_annual_interest_rate,
            request.isRenewalAllowed || false,
            request.isPrematureClosureAllowed !== undefined 
              ? request.isPrematureClosureAllowed 
              : product.is_premature_closure_allowed,
            product.pre_closure_penal_applicable,
            product.pre_closure_penal_interest,
            product.pre_closure_penal_interest_on_type_enum,
            'withdraw_deposit',  // Default closure type
            null,  // Will be set if transfer to savings is selected
            request.linkedAccountId || null,
            request.transferInterestToLinkedAccount || false,
            userId || null
          ]
        );
        
        // Create recurring deposit details
        const recurringDetailId = uuidv4();
        
        await client.query(
          `INSERT INTO recurring_deposit_account_recurring_detail (
            id, account_id, mandatory_recommended_deposit_amount, recurring_frequency,
            recurring_frequency_type, is_mandatory, allow_withdrawal,
            adjust_advance_towards_future_payments, is_calendar_inherited,
            expected_first_deposit_on_date, created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
          [
            recurringDetailId,
            recurringDepositAccountId,
            request.depositAmount,
            recurringFrequency,
            recurringFrequencyType,
            isMandatory,
            allowWithdrawal,
            adjustAdvance,
            product.is_calendar_inherited,
            firstDepositDate,
            userId || null
          ]
        );
        
        // Generate schedule installments
        let currentDate = new Date(firstDepositDate);
        for (let i = 1; i <= expectedNumberOfDeposits; i++) {
          const installmentId = uuidv4();
          
          await client.query(
            `INSERT INTO recurring_deposit_schedule_installment (
              id, account_id, installment_number, due_date, deposit_amount,
              completed, created_by, created_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              installmentId,
              recurringDepositAccountId,
              i,
              currentDate,
              request.depositAmount,
              false,
              userId || null
            ]
          );
          
          // Calculate next installment date
          currentDate = calculateFutureDate(
            currentDate, 
            recurringFrequency, 
            recurringFrequencyType
          );
        }
        
        // Add charges if provided
        if (request.charges && request.charges.length > 0) {
          for (const charge of request.charges) {
            // Validate charge exists
            const chargeResult = await client.query(
              'SELECT * FROM charge WHERE id = $1',
              [charge.chargeId]
            );
            
            if (chargeResult.rowCount === 0) {
              throw new Error(`Charge with ID ${charge.chargeId} not found`);
            }
            
            // Create savings account charge
            const savingsChargeId = uuidv4();
            
            await client.query(
              `INSERT INTO savings_account_charge (
                id, savings_account_id, charge_id, amount, amount_outstanding_derived,
                due_date, charge_time_type, charge_calculation_type, is_paid_derived,
                is_waived, created_by, created_date
              ) SELECT $1, $2, $3, $4, $4, $5, c.charge_time_type, c.charge_calculation_type, 
                       false, false, $6, NOW()
              FROM charge c
              WHERE c.id = $3`,
              [
                savingsChargeId,
                savingsAccountId,
                charge.chargeId,
                charge.amount,
                charge.dueDate ? new Date(charge.dueDate) : null,
                userId || null
              ]
            );
            
            // Create recurring deposit account charge
            await client.query(
              `INSERT INTO recurring_deposit_account_charge (
                id, savings_account_charge_id, recurring_deposit_account_id, created_by, created_date
              ) VALUES ($1, $2, $3, $4, NOW())`,
              [
                uuidv4(),
                savingsChargeId,
                recurringDepositAccountId,
                userId || null
              ]
            );
          }
        }
        
        return recurringDepositAccountId;
      });
    } catch (error) {
      logger.error('Error creating recurring deposit account', { error, request });
      throw error;
    }
  }
  
  /**
   * Get recurring deposit account by ID
   * @param accountId Account ID
   * @returns Recurring deposit account details
   */
  async getAccount(accountId: string): Promise<RecurringDepositAccountResponse> {
    logger.info('Getting recurring deposit account', { accountId });
    
    try {
      // Get account details
      const accountResult = await query(
        `SELECT rda.*, rdard.*, sa.account_no, sa.external_id, sa.client_id, sa.group_id, 
                sa.status, sa.field_officer_id, sa.currency_code, sa.currency_digits, 
                sa.interest_compounding_period_type, sa.interest_posting_period_type,
                sa.interest_calculation_type, sa.interest_calculation_days_in_year_type,
                sa.submitted_on_date, rdp.id as product_id, sp.name as product_name,
                c.name as client_name, g.group_name, s.display_name as staff_name,
                cur.name as currency_name, cur.decimal_places, cur.in_multiples_of,
                linked.account_no as linked_account_no,
                transfer.account_no as transfer_account_no
         FROM recurring_deposit_account rda
         JOIN recurring_deposit_account_recurring_detail rdard ON rda.id = rdard.account_id
         JOIN savings_account sa ON rda.savings_account_id = sa.id
         JOIN recurring_deposit_product rdp ON rda.product_id = rdp.id
         JOIN savings_product sp ON rdp.savings_product_id = sp.id
         LEFT JOIN client c ON sa.client_id = c.id
         LEFT JOIN client_group g ON sa.group_id = g.id
         LEFT JOIN staff s ON sa.field_officer_id = s.id
         LEFT JOIN currency cur ON sa.currency_code = cur.code
         LEFT JOIN savings_account linked ON rda.linked_account_id = linked.id
         LEFT JOIN savings_account transfer ON rda.transfer_to_savings_account_id = transfer.id
         WHERE rda.id = $1`,
        [accountId]
      );
      
      if (accountResult.rowCount === 0) {
        throw new Error(`Recurring deposit account with ID ${accountId} not found`);
      }
      
      const account = accountResult.rows[0];
      
      // Get charges
      const chargesResult = await query(
        `SELECT sac.*, c.name, c.currency_code, c.charge_time_type, 
                c.charge_calculation_type, c.is_penalty,
                cur.name as currency_name, cur.decimal_places, cur.in_multiples_of
         FROM recurring_deposit_account_charge rdac
         JOIN savings_account_charge sac ON rdac.savings_account_charge_id = sac.id
         JOIN charge c ON sac.charge_id = c.id
         JOIN currency cur ON c.currency_code = cur.code
         WHERE rdac.recurring_deposit_account_id = $1`,
        [accountId]
      );
      
      // Get installments
      const installmentsResult = await query(
        `SELECT * FROM recurring_deposit_schedule_installment
         WHERE account_id = $1
         ORDER BY installment_number ASC`,
        [accountId]
      );
      
      // Get transactions if account is active
      let transactions = [];
      if (account.status === 'active') {
        const transactionsResult = await query(
          `SELECT rdt.*, sat.transaction_type, sat.amount, sat.running_balance, 
                  sat.transaction_date, sat.is_reversed, sat.submitted_on_date,
                  pd.id as payment_detail_id, pd.payment_type_id, pd.account_number,
                  pd.check_number, pd.routing_code, pd.receipt_number, pd.bank_number,
                  pt.name as payment_type_name, cur.name as currency_name, 
                  cur.decimal_places, cur.in_multiples_of
           FROM recurring_deposit_transaction rdt
           JOIN savings_account_transaction sat ON rdt.savings_account_transaction_id = sat.id
           LEFT JOIN payment_detail pd ON sat.payment_detail_id = pd.id
           LEFT JOIN payment_type pt ON pd.payment_type_id = pt.id
           JOIN currency cur ON sat.currency_code = cur.code
           WHERE rdt.recurring_deposit_account_id = $1
           ORDER BY sat.transaction_date DESC, sat.id DESC`,
          [accountId]
        );
        
        transactions = transactionsResult.rows.map(tx => ({
          id: tx.id,
          transactionType: {
            id: 0,
            code: tx.transaction_type,
            value: tx.transaction_type,
            deposit: tx.transaction_type === 'deposit',
            withdrawal: tx.transaction_type === 'withdrawal',
            interestPosting: tx.transaction_type === 'interest_posting',
            feeDeduction: tx.transaction_type === 'fee_charge',
            initiateTransfer: false,
            approveTransfer: false,
            withdrawTransfer: false,
            rejectTransfer: false,
            overdraftInterest: false,
            writtenoff: false,
            overdraftFee: false,
            withholdTax: false
          },
          accountId: account.savings_account_id,
          accountNo: account.account_no,
          date: tx.transaction_date.toISOString().split('T')[0],
          amount: tx.amount,
          installmentNumber: tx.installment_number,
          currency: {
            code: account.currency_code,
            name: tx.currency_name,
            decimalPlaces: tx.decimal_places,
            inMultiplesOf: tx.in_multiples_of,
            displaySymbol: account.currency_code,
            nameCode: account.currency_code.toLowerCase(),
            displayLabel: `${tx.currency_name} (${account.currency_code})`
          },
          paymentDetailData: tx.payment_detail_id ? {
            id: tx.payment_detail_id,
            paymentType: {
              id: tx.payment_type_id,
              name: tx.payment_type_name
            },
            accountNumber: tx.account_number,
            checkNumber: tx.check_number,
            routingCode: tx.routing_code,
            receiptNumber: tx.receipt_number,
            bankNumber: tx.bank_number
          } : undefined,
          runningBalance: tx.running_balance,
          reversed: tx.is_reversed,
          submittedOnDate: tx.submitted_on_date.toISOString().split('T')[0]
        }));
      }
      
      // Calculate next deposit due date and overdue installments
      let nextDepositDueDate = null;
      let overdueInstallments = 0;
      
      if (account.status === 'active' || account.status === 'approved') {
        const today = new Date();
        
        // Get next deposit due date
        const nextDepositResult = await query(
          `SELECT due_date FROM recurring_deposit_schedule_installment
           WHERE account_id = $1 AND completed = false
           ORDER BY due_date ASC
           LIMIT 1`,
          [accountId]
        );
        
        if (nextDepositResult.rowCount > 0) {
          nextDepositDueDate = nextDepositResult.rows[0].due_date;
          
          // Count overdue installments
          const overdueResult = await query(
            `SELECT COUNT(*) FROM recurring_deposit_schedule_installment
             WHERE account_id = $1 AND completed = false AND due_date < $2`,
            [accountId, today]
          );
          
          overdueInstallments = parseInt(overdueResult.rows[0].count);
        }
      }
      
      // Process installments data
      const today = new Date();
      const installments = installmentsResult.rows.map(install => {
        const dueDate = new Date(install.due_date);
        const daysLate = dueDate < today && !install.completed 
          ? Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) 
          : 0;
          
        return {
          id: install.id,
          installmentNumber: install.installment_number,
          dueDate: install.due_date.toISOString().split('T')[0],
          depositAmount: install.deposit_amount,
          depositAmountCompleted: install.deposit_amount_completed,
          totalPaidInAdvance: install.total_paid_in_advance,
          totalPaidLate: install.total_paid_late,
          completed: install.completed,
          obligationsMetOnDate: install.obligations_met_on_date 
            ? install.obligations_met_on_date.toISOString().split('T')[0] 
            : undefined,
          daysLate: daysLate,
          isPaid: install.completed,
          isOverdue: dueDate < today && !install.completed
        };
      });
      
      // Format the response
      return {
        id: account.id,
        accountNo: account.account_no,
        externalId: account.external_id,
        clientId: account.client_id,
        clientName: account.client_name,
        groupId: account.group_id,
        groupName: account.group_name,
        productId: account.product_id,
        productName: account.product_name,
        fieldOfficerId: account.field_officer_id,
        fieldOfficerName: account.staff_name,
        status: {
          id: 0,
          code: account.status,
          value: account.status,
          submittedAndPendingApproval: account.status === 'submitted_and_pending_approval',
          approved: account.status === 'approved',
          rejected: account.status === 'rejected',
          withdrawnByApplicant: account.status === 'withdrawn_by_client',
          active: account.status === 'active',
          closed: account.status === 'closed',
          prematureClosed: account.status === 'premature_closed',
          transferInProgress: false,
          transferOnHold: false,
          matured: account.status === 'matured'
        },
        timeline: {
          submittedOnDate: account.submitted_on_date.toISOString().split('T')[0],
          submittedByUsername: '',
          submittedByFirstname: '',
          submittedByLastname: '',
          approvedOnDate: account.approved_on_date ? account.approved_on_date.toISOString().split('T')[0] : undefined,
          activatedOnDate: account.activated_on_date ? account.activated_on_date.toISOString().split('T')[0] : undefined,
          closedOnDate: account.maturity_date ? account.maturity_date.toISOString().split('T')[0] : undefined
        },
        currency: {
          code: account.currency_code,
          name: account.currency_name,
          decimalPlaces: account.decimal_places,
          inMultiplesOf: account.in_multiples_of,
          displaySymbol: account.currency_code,
          nameCode: account.currency_code.toLowerCase(),
          displayLabel: `${account.currency_name} (${account.currency_code})`
        },
        interestCompoundingPeriodType: {
          id: 0,
          code: account.interest_compounding_period_type,
          value: account.interest_compounding_period_type
        },
        interestPostingPeriodType: {
          id: 0,
          code: account.interest_posting_period_type,
          value: account.interest_posting_period_type
        },
        interestCalculationType: {
          id: 0,
          code: account.interest_calculation_type,
          value: account.interest_calculation_type
        },
        interestCalculationDaysInYearType: {
          id: 0,
          code: account.interest_calculation_days_in_year_type.toString(),
          value: account.interest_calculation_days_in_year_type.toString()
        },
        depositAmount: account.deposit_amount,
        maturityAmount: account.maturity_amount,
        maturityDate: account.maturity_date ? account.maturity_date.toISOString().split('T')[0] : undefined,
        depositPeriod: account.deposit_period,
        depositPeriodFrequencyType: {
          id: 0,
          code: account.deposit_period_frequency_type_enum,
          value: account.deposit_period_frequency_type_enum
        },
        expectedMaturityAmount: account.expected_maturity_amount,
        expectedMaturityDate: account.expected_maturity_date ? account.expected_maturity_date.toISOString().split('T')[0] : undefined,
        interestRate: account.interest_rate,
        recurringFrequency: account.recurring_frequency,
        recurringFrequencyType: {
          id: 0,
          code: account.recurring_frequency_type,
          value: account.recurring_frequency_type
        },
        isMandatory: account.is_mandatory,
        allowWithdrawal: account.allow_withdrawal,
        adjustAdvanceTowardsFuturePayments: account.adjust_advance_towards_future_payments,
        interestEarned: account.interest_earned,
        preClosurePenalApplicable: account.pre_closure_penal_applicable,
        preClosurePenalInterest: account.pre_closure_penal_interest,
        preClosurePenalInterestOnType: account.pre_closure_penal_interest_on_type_enum ? {
          id: 0,
          code: account.pre_closure_penal_interest_on_type_enum,
          value: account.pre_closure_penal_interest_on_type_enum
        } : undefined,
        summary: {
          totalDeposits: account.total_deposits || 0,
          totalInterestEarned: account.interest_earned || 0,
          totalWithdrawals: account.total_withdrawals || 0,
          totalWithholdTax: account.total_withhold_tax || 0,
          accountBalance: (account.total_deposits || 0) + (account.interest_earned || 0) - 
                         (account.total_withdrawals || 0) - (account.total_withhold_tax || 0)
        },
        charges: chargesResult.rows.map(charge => ({
          id: charge.id,
          chargeId: charge.charge_id,
          name: charge.name,
          chargeTimeType: {
            id: 0,
            code: charge.charge_time_type,
            value: charge.charge_time_type
          },
          chargeCalculationType: {
            id: 0,
            code: charge.charge_calculation_type,
            value: charge.charge_calculation_type
          },
          currency: {
            code: charge.currency_code,
            name: charge.currency_name,
            decimalPlaces: charge.decimal_places,
            inMultiplesOf: charge.in_multiples_of,
            displaySymbol: charge.currency_code,
            nameCode: charge.currency_code.toLowerCase(),
            displayLabel: `${charge.currency_name} (${charge.currency_code})`
          },
          amount: charge.amount,
          amountPaid: charge.amount_paid_derived,
          amountWaived: charge.amount_waived_derived,
          amountWrittenOff: charge.amount_writtenoff_derived,
          amountOutstanding: charge.amount_outstanding_derived,
          amountOrPercentage: charge.amount,
          penalty: charge.is_penalty,
          dueDate: charge.due_date ? charge.due_date.toISOString().split('T')[0] : undefined
        })),
        linkedAccount: account.linked_account_id ? {
          id: account.linked_account_id,
          accountNo: account.linked_account_no
        } : undefined,
        transferInterestToLinkedAccount: account.transfer_interest_to_linked_account,
        maturityInstructions: {
          id: 0,
          code: account.on_account_closure_type,
          value: account.on_account_closure_type
        },
        nextDepositDueDate: nextDepositDueDate ? nextDepositDueDate.toISOString().split('T')[0] : undefined,
        overdueInstallments,
        installments,
        transactions
      };
    } catch (error) {
      logger.error('Error getting recurring deposit account', { error, accountId });
      throw error;
    }
  }
  
  /**
   * Make a deposit to a recurring deposit account
   * @param accountId Account ID
   * @param request Deposit request
   * @param userId Current user ID
   * @returns Deposit result
   */
  async makeDeposit(accountId: string, request: RecurringDepositAccountDepositRequest, userId?: string): Promise<RecurringDepositAccountDepositResponse> {
    logger.info('Making deposit to recurring deposit account', { accountId, amount: request.transactionAmount });
    
    try {
      return await transaction(async (client) => {
        // Get account details
        const accountResult = await client.query(
          `SELECT rda.*, sa.id as savings_account_id, sa.status, sa.currency_code
           FROM recurring_deposit_account rda
           JOIN savings_account sa ON rda.savings_account_id = sa.id
           WHERE rda.id = $1`,
          [accountId]
        );
        
        if (accountResult.rowCount === 0) {
          throw new Error(`Recurring deposit account with ID ${accountId} not found`);
        }
        
        const account = accountResult.rows[0];
        
        // Validate account status
        if (account.status !== 'active' && account.status !== 'approved') {
          throw new Error(`Cannot make deposit to account with status ${account.status}`);
        }
        
        // If account is approved but not active, activate it first
        if (account.status === 'approved') {
          await client.query(
            `UPDATE savings_account
             SET status = 'active',
                 activated_on_date = $1,
                 activated_by_user_id = $2,
                 last_modified_by = $2,
                 last_modified_date = NOW()
             WHERE id = $3`,
            [new Date(request.transactionDate), userId || null, account.savings_account_id]
          );
        }
        
        // Find the installment to apply the deposit to
        let installmentNumber = request.installmentNumber;
        
        if (!installmentNumber) {
          // Find the earliest incomplete installment if specific number not provided
          const installmentResult = await client.query(
            `SELECT * FROM recurring_deposit_schedule_installment
             WHERE account_id = $1 AND completed = false
             ORDER BY due_date ASC
             LIMIT 1`,
            [accountId]
          );
          
          if (installmentResult.rowCount === 0) {
            throw new Error('No pending installments found for this account');
          }
          
          installmentNumber = installmentResult.rows[0].installment_number;
        } else {
          // Verify installment exists
          const installmentResult = await client.query(
            `SELECT * FROM recurring_deposit_schedule_installment
             WHERE account_id = $1 AND installment_number = $2`,
            [accountId, installmentNumber]
          );
          
          if (installmentResult.rowCount === 0) {
            throw new Error(`Installment #${installmentNumber} not found for this account`);
          }
          
          if (installmentResult.rows[0].completed) {
            throw new Error(`Installment #${installmentNumber} is already completed`);
          }
        }
        
        // Create payment details if provided
        let paymentDetailId = null;
        if (request.paymentTypeId) {
          paymentDetailId = uuidv4();
          
          await client.query(
            `INSERT INTO payment_detail (
              id, payment_type_id, account_number, check_number,
              routing_code, receipt_number, bank_number, created_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              paymentDetailId,
              request.paymentTypeId,
              request.accountNumber || null,
              request.checkNumber || null,
              request.routingCode || null,
              request.receiptNumber || null,
              request.bankNumber || null
            ]
          );
        }
        
        // Get current balance
        const balanceResult = await client.query(
          `SELECT COALESCE(SUM(amount), 0) as current_balance
           FROM savings_account_transaction
           WHERE savings_account_id = $1 AND is_reversed = false`,
          [account.savings_account_id]
        );
        
        const currentBalance = parseFloat(balanceResult.rows[0].current_balance) || 0;
        const newBalance = currentBalance + request.transactionAmount;
        
        // Create savings account transaction
        const transactionDate = new Date(request.transactionDate);
        const savingsTransactionId = uuidv4();
        
        await client.query(
          `INSERT INTO savings_account_transaction (
            id, savings_account_id, payment_detail_id, transaction_type, transaction_date,
            amount, currency_code, running_balance, submitted_on_date,
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            savingsTransactionId,
            account.savings_account_id,
            paymentDetailId,
            'deposit',
            transactionDate,
            request.transactionAmount,
            account.currency_code,
            newBalance,
            transactionDate,
            userId || null
          ]
        );
        
        // Create recurring deposit transaction
        const recurringDepositTransactionId = uuidv4();
        
        await client.query(
          `INSERT INTO recurring_deposit_transaction (
            id, savings_account_transaction_id, recurring_deposit_account_id,
            transaction_type, installment_number, amount, balance_after_transaction,
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            recurringDepositTransactionId,
            savingsTransactionId,
            accountId,
            'deposit',
            installmentNumber,
            request.transactionAmount,
            newBalance,
            userId || null
          ]
        );
        
        // Update installment
        const installmentResult = await client.query(
          `SELECT * FROM recurring_deposit_schedule_installment
           WHERE account_id = $1 AND installment_number = $2`,
          [accountId, installmentNumber]
        );
        
        const installment = installmentResult.rows[0];
        const depositAmountCompleted = parseFloat(installment.deposit_amount_completed) || 0;
        const newDepositAmountCompleted = depositAmountCompleted + request.transactionAmount;
        
        // Determine if payment is on time, early, or late
        const today = new Date();
        const dueDate = new Date(installment.due_date);
        let totalPaidInAdvance = parseFloat(installment.total_paid_in_advance) || 0;
        let totalPaidLate = parseFloat(installment.total_paid_late) || 0;
        
        if (transactionDate < dueDate) {
          totalPaidInAdvance += request.transactionAmount;
        } else if (transactionDate > dueDate) {
          totalPaidLate += request.transactionAmount;
        }
        
        // Check if installment is complete
        const completed = newDepositAmountCompleted >= installment.deposit_amount;
        
        await client.query(
          `UPDATE recurring_deposit_schedule_installment
           SET deposit_amount_completed = $1,
               total_paid_in_advance = $2,
               total_paid_late = $3,
               completed = $4,
               obligations_met_on_date = $5,
               last_modified_by = $6,
               last_modified_date = NOW()
           WHERE id = $7`,
          [
            newDepositAmountCompleted,
            totalPaidInAdvance,
            totalPaidLate,
            completed,
            completed ? transactionDate : null,
            userId || null,
            installment.id
          ]
        );
        
        // Update account totals
        const totalDeposits = parseFloat(account.total_deposits) || 0;
        const newTotalDeposits = totalDeposits + request.transactionAmount;
        
        await client.query(
          `UPDATE recurring_deposit_account
           SET total_deposits = $1,
               last_modified_by = $2,
               last_modified_date = NOW()
           WHERE id = $3`,
          [
            newTotalDeposits,
            userId || null,
            accountId
          ]
        );
        
        // Add note if provided
        if (request.note) {
          await client.query(
            `INSERT INTO savings_account_note (
              id, savings_account_id, note, created_by, created_date
            ) VALUES ($1, $2, $3, $4, NOW())`,
            [uuidv4(), account.savings_account_id, request.note, userId || null]
          );
        }
        
        return {
          accountId,
          transactionId: recurringDepositTransactionId,
          installmentNumber,
          amount: request.transactionAmount,
          runningBalance: newBalance
        };
      });
    } catch (error) {
      logger.error('Error making deposit to recurring deposit account', { error, accountId, request });
      throw error;
    }
  }
  
  /**
   * Get recurring deposit accounts for a client
   * @param clientId Client ID
   * @returns List of client's recurring deposit accounts
   */
  async getClientAccounts(clientId: string): Promise<RecurringDepositAccountResponse[]> {
    logger.info('Getting client recurring deposit accounts', { clientId });

    try {
      // Query to get account IDs for the client
      const accountsResult = await query(
        `SELECT rda.id
         FROM recurring_deposit_account rda
         JOIN savings_account sa ON rda.savings_account_id = sa.id
         WHERE sa.client_id = $1
         ORDER BY sa.account_no`,
        [clientId]
      );

      const accounts = [];

      // Get full details for each account
      for (const row of accountsResult.rows) {
        const account = await this.getAccount(row.id);
        accounts.push(account);
      }

      return accounts;
    } catch (error) {
      logger.error('Error getting client recurring deposit accounts', { error, clientId });
      throw error;
    }
  }

  /**
   * Get recurring deposit account template
   * @param clientId Optional client ID
   * @param productId Optional product ID
   * @returns Template data for creating a new account
   */
  async getTemplate(clientId?: string, productId?: string): Promise<any> {
    logger.info('Getting recurring deposit template', { clientId, productId });

    try {
      // Get available products
      const products = await this.getProducts();

      // Get client information if provided
      let clientData = null;
      if (clientId) {
        const clientResult = await query(
          `SELECT c.id, c.account_no, c.first_name, c.last_name, c.first_name || ' ' || c.last_name as display_name
           FROM client c
           WHERE c.id = $1`,
          [clientId]
        );

        if (clientResult.rowCount > 0) {
          clientData = clientResult.rows[0];
        }
      }

      // Get specific product details if provided
      let productData = null;
      if (productId) {
        productData = await this.getProduct(productId);
      }

      // Get available payment types
      const paymentTypesResult = await query(
        'SELECT id, name, description FROM payment_type WHERE is_active = true ORDER BY name'
      );

      return {
        clientId: clientId,
        client: clientData,
        productOptions: products,
        selectedProduct: productData,
        paymentTypeOptions: paymentTypesResult.rows
      };
    } catch (error) {
      logger.error('Error getting recurring deposit template', { error, clientId, productId });
      throw error;
    }
  }

  /**
   * Approve a recurring deposit account
   * @param accountId Account ID
   * @param request Approval request
   * @param userId Current user ID
   * @returns Approval result
   */
  async approveAccount(accountId: string, request: RecurringDepositAccountApprovalRequest, userId?: string): Promise<RecurringDepositAccountApprovalResponse> {
    logger.info('Approving recurring deposit account', { accountId });

    try {
      return await transaction(async (client) => {
        // Get account details
        const accountResult = await client.query(
          `SELECT rda.*, sa.id as savings_account_id, sa.status
           FROM recurring_deposit_account rda
           JOIN savings_account sa ON rda.savings_account_id = sa.id
           WHERE rda.id = $1`,
          [accountId]
        );

        if (accountResult.rowCount === 0) {
          throw new Error(`Recurring deposit account with ID ${accountId} not found`);
        }

        const account = accountResult.rows[0];

        // Validate account status
        if (account.status !== 'submitted_and_pending_approval') {
          throw new Error(`Cannot approve account with status ${account.status}`);
        }

        // Update savings account status
        const approvedOnDate = new Date(request.approvedOnDate);

        await client.query(
          `UPDATE savings_account
           SET status = 'approved',
               approved_on_date = $1,
               approved_by_user_id = $2,
               last_modified_by = $2,
               last_modified_date = NOW()
           WHERE id = $3`,
          [approvedOnDate, userId || null, account.savings_account_id]
        );

        // Add note if provided
        if (request.note) {
          await client.query(
            `INSERT INTO savings_account_note (
              id, savings_account_id, note, created_by, created_date
            ) VALUES ($1, $2, $3, $4, NOW())`,
            [uuidv4(), account.savings_account_id, request.note, userId || null]
          );
        }

        return {
          accountId,
          savingsAccountId: account.savings_account_id,
          approvedOnDate: request.approvedOnDate,
          expectedMaturityDate: account.expected_maturity_date ? account.expected_maturity_date.toISOString().split('T')[0] : '',
          expectedMaturityAmount: parseFloat(account.expected_maturity_amount)
        };
      });
    } catch (error) {
      logger.error('Error approving recurring deposit account', { error, accountId });
      throw error;
    }
  }

  /**
   * Prematurely close a recurring deposit account
   * @param accountId Account ID
   * @param request Premature close request
   * @param userId Current user ID
   * @returns Close result
   */
  async prematureClose(accountId: string, request: RecurringDepositAccountPrematureCloseRequest, userId?: string): Promise<RecurringDepositAccountPrematureCloseResponse> {
    logger.info('Prematurely closing recurring deposit account', { accountId });

    try {
      return await transaction(async (client) => {
        // Get account details
        const accountResult = await client.query(
          `SELECT rda.*, rdard.is_mandatory, sa.id as savings_account_id, sa.status, sa.currency_code
           FROM recurring_deposit_account rda
           JOIN recurring_deposit_account_recurring_detail rdard ON rda.id = rdard.account_id
           JOIN savings_account sa ON rda.savings_account_id = sa.id
           WHERE rda.id = $1`,
          [accountId]
        );

        if (accountResult.rowCount === 0) {
          throw new Error(`Recurring deposit account with ID ${accountId} not found`);
        }

        const account = accountResult.rows[0];

        // Validate account status
        if (account.status !== 'active') {
          throw new Error(`Cannot prematurely close account with status ${account.status}`);
        }

        // Validate account can be prematurely closed
        if (!account.is_premature_closure_allowed) {
          throw new Error('Premature closure is not allowed for this account');
        }

        // Calculate total amount (with penalty if applicable)
        let totalAmount = parseFloat(account.total_deposits) || 0;
        let interestAmount = parseFloat(account.interest_earned) || 0;

        // Apply penalty if applicable
        if (account.pre_closure_penal_applicable) {
          const penaltyRate = parseFloat(account.pre_closure_penal_interest) || 0;
          const penaltyAmount = interestAmount * (penaltyRate / 100);
          interestAmount -= penaltyAmount;
        }

        totalAmount += interestAmount;

        // Create payment details if provided
        let paymentDetailId = null;
        if (request.paymentTypeId && request.onAccountClosureType === 'withdrawal') {
          paymentDetailId = uuidv4();

          await client.query(
            `INSERT INTO payment_detail (
              id, payment_type_id, account_number, check_number,
              routing_code, receipt_number, bank_number, created_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              paymentDetailId,
              request.paymentTypeId,
              request.accountNumber || null,
              request.checkNumber || null,
              request.routingCode || null,
              request.receiptNumber || null,
              request.bankNumber || null
            ]
          );
        }

        // Process closure based on closure type
        const closedOnDate = new Date(request.closedOnDate);
        let transactionId = null;

        if (request.onAccountClosureType === 'transfer_to_savings') {
          // Validate target savings account
          if (!request.toSavingsAccountId) {
            throw new Error('Savings account ID is required for transfer on closure');
          }

          const savingsResult = await client.query(
            'SELECT * FROM savings_account WHERE id = $1 AND status = $2',
            [request.toSavingsAccountId, 'active']
          );

          if (savingsResult.rowCount === 0) {
            throw new Error(`Active savings account with ID ${request.toSavingsAccountId} not found`);
          }

          // Transfer to savings account
          const transferTransactionId = uuidv4();

          await client.query(
            `INSERT INTO savings_account_transaction (
              id, savings_account_id, transaction_type, transaction_date,
              amount, currency_code, description, is_reversed,
              created_by, created_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
              transferTransactionId,
              request.toSavingsAccountId,
              'deposit',
              closedOnDate,
              totalAmount,
              account.currency_code,
              request.transferDescription || 'Transfer from matured recurring deposit',
              false,
              userId || null
            ]
          );

          transactionId = transferTransactionId;

          // Update target account
          await client.query(
            `UPDATE savings_account
             SET last_modified_by = $1,
                 last_modified_date = NOW()
             WHERE id = $2`,
            [userId || null, request.toSavingsAccountId]
          );
        } else {
          // Withdrawal
          const withdrawalTransactionId = uuidv4();

          await client.query(
            `INSERT INTO savings_account_transaction (
              id, savings_account_id, payment_detail_id, transaction_type, transaction_date,
              amount, currency_code, is_reversed,
              created_by, created_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
              withdrawalTransactionId,
              account.savings_account_id,
              paymentDetailId,
              'withdrawal',
              closedOnDate,
              totalAmount,
              account.currency_code,
              false,
              userId || null
            ]
          );

          transactionId = withdrawalTransactionId;
        }

        // Update recurring deposit account
        await client.query(
          `UPDATE recurring_deposit_account
           SET on_account_closure_type = $1,
               transfer_to_savings_account_id = $2,
               maturity_amount = $3,
               maturity_date = $4,
               last_modified_by = $5,
               last_modified_date = NOW()
           WHERE id = $6`,
          [
            request.onAccountClosureType,
            request.onAccountClosureType === 'transfer_to_savings' ? request.toSavingsAccountId : null,
            totalAmount,
            closedOnDate,
            userId || null,
            accountId
          ]
        );

        // Update savings account status
        await client.query(
          `UPDATE savings_account
           SET status = 'premature_closed',
               closed_on_date = $1,
               closed_by_user_id = $2,
               last_modified_by = $2,
               last_modified_date = NOW()
           WHERE id = $3`,
          [closedOnDate, userId || null, account.savings_account_id]
        );

        // Add note if provided
        if (request.note) {
          await client.query(
            `INSERT INTO savings_account_note (
              id, savings_account_id, note, created_by, created_date
            ) VALUES ($1, $2, $3, $4, NOW())`,
            [uuidv4(), account.savings_account_id, request.note, userId || null]
          );
        }

        return {
          accountId,
          savingsAccountId: account.savings_account_id,
          closedOnDate: request.closedOnDate,
          totalAmount,
          transactionId
        };
      });
    } catch (error) {
      logger.error('Error prematurely closing recurring deposit account', { error, accountId });
      throw error;
    }
  }

  /**
   * Update maturity instructions for a recurring deposit account
   * @param accountId Account ID
   * @param request Maturity instructions update request
   * @param userId Current user ID
   * @returns Update result
   */
  async updateMaturityInstructions(accountId: string, request: RecurringDepositAccountMaturityInstructionsUpdateRequest, userId?: string): Promise<any> {
    logger.info('Updating maturity instructions for recurring deposit account', { accountId });

    try {
      return await transaction(async (client) => {
        // Get account details
        const accountResult = await client.query(
          `SELECT rda.*, sa.status
           FROM recurring_deposit_account rda
           JOIN savings_account sa ON rda.savings_account_id = sa.id
           WHERE rda.id = $1`,
          [accountId]
        );

        if (accountResult.rowCount === 0) {
          throw new Error(`Recurring deposit account with ID ${accountId} not found`);
        }

        const account = accountResult.rows[0];

        // Validate account status
        if (account.status !== 'active') {
          throw new Error(`Cannot update maturity instructions for account with status ${account.status}`);
        }

        // Validate savings account if transfer is selected
        if (request.onAccountClosureType === 'transfer_to_savings' && request.transferToSavingsAccountId) {
          const savingsResult = await client.query(
            'SELECT * FROM savings_account WHERE id = $1',
            [request.transferToSavingsAccountId]
          );

          if (savingsResult.rowCount === 0) {
            throw new Error(`Savings account with ID ${request.transferToSavingsAccountId} not found`);
          }
        }

        // Update maturity instructions
        await client.query(
          `UPDATE recurring_deposit_account
           SET on_account_closure_type = $1,
               transfer_to_savings_account_id = $2,
               last_modified_by = $3,
               last_modified_date = NOW()
           WHERE id = $4`,
          [
            request.onAccountClosureType,
            request.onAccountClosureType === 'transfer_to_savings' ? request.transferToSavingsAccountId : null,
            userId || null,
            accountId
          ]
        );

        return {
          accountId,
          onAccountClosureType: request.onAccountClosureType,
          transferToSavingsAccountId: request.onAccountClosureType === 'transfer_to_savings' ? request.transferToSavingsAccountId : null
        };
      });
    } catch (error) {
      logger.error('Error updating maturity instructions', { error, accountId });
      throw error;
    }
  }

  /**
   * Make a withdrawal from a recurring deposit account (if allowed)
   * @param accountId Account ID
   * @param request Withdrawal request
   * @param userId Current user ID
   * @returns Withdrawal result
   */
  async makeWithdrawal(accountId: string, request: RecurringDepositAccountWithdrawalRequest, userId?: string): Promise<RecurringDepositAccountWithdrawalResponse> {
    logger.info('Making withdrawal from recurring deposit account', { accountId, amount: request.transactionAmount });
    
    try {
      return await transaction(async (client) => {
        // Get account details
        const accountResult = await client.query(
          `SELECT rda.*, rdard.allow_withdrawal, sa.id as savings_account_id, sa.status, sa.currency_code
           FROM recurring_deposit_account rda
           JOIN recurring_deposit_account_recurring_detail rdard ON rda.id = rdard.account_id
           JOIN savings_account sa ON rda.savings_account_id = sa.id
           WHERE rda.id = $1`,
          [accountId]
        );
        
        if (accountResult.rowCount === 0) {
          throw new Error(`Recurring deposit account with ID ${accountId} not found`);
        }
        
        const account = accountResult.rows[0];
        
        // Validate account status
        if (account.status !== 'active') {
          throw new Error(`Cannot make withdrawal from account with status ${account.status}`);
        }
        
        // Check if withdrawals are allowed
        if (!account.allow_withdrawal) {
          throw new Error('Withdrawals are not allowed for this account');
        }
        
        // Check available balance
        const balanceResult = await client.query(
          `SELECT COALESCE(SUM(amount), 0) as current_balance
           FROM savings_account_transaction
           WHERE savings_account_id = $1 AND is_reversed = false`,
          [account.savings_account_id]
        );
        
        const currentBalance = parseFloat(balanceResult.rows[0].current_balance) || 0;
        
        if (currentBalance < request.transactionAmount) {
          throw new Error('Insufficient balance for withdrawal');
        }
        
        const newBalance = currentBalance - request.transactionAmount;
        
        // Create payment details if provided
        let paymentDetailId = null;
        if (request.paymentTypeId) {
          paymentDetailId = uuidv4();
          
          await client.query(
            `INSERT INTO payment_detail (
              id, payment_type_id, account_number, check_number,
              routing_code, receipt_number, bank_number, created_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              paymentDetailId,
              request.paymentTypeId,
              request.accountNumber || null,
              request.checkNumber || null,
              request.routingCode || null,
              request.receiptNumber || null,
              request.bankNumber || null
            ]
          );
        }
        
        // Create savings account transaction
        const transactionDate = new Date(request.transactionDate);
        const savingsTransactionId = uuidv4();
        
        await client.query(
          `INSERT INTO savings_account_transaction (
            id, savings_account_id, payment_detail_id, transaction_type, transaction_date,
            amount, currency_code, running_balance, submitted_on_date,
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
          [
            savingsTransactionId,
            account.savings_account_id,
            paymentDetailId,
            'withdrawal',
            transactionDate,
            request.transactionAmount,
            account.currency_code,
            newBalance,
            transactionDate,
            userId || null
          ]
        );
        
        // Create recurring deposit transaction
        const recurringDepositTransactionId = uuidv4();
        
        await client.query(
          `INSERT INTO recurring_deposit_transaction (
            id, savings_account_transaction_id, recurring_deposit_account_id,
            transaction_type, amount, balance_after_transaction,
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [
            recurringDepositTransactionId,
            savingsTransactionId,
            accountId,
            'withdrawal',
            request.transactionAmount,
            newBalance,
            userId || null
          ]
        );
        
        // Update account totals
        const totalWithdrawals = parseFloat(account.total_withdrawals) || 0;
        const newTotalWithdrawals = totalWithdrawals + request.transactionAmount;
        
        await client.query(
          `UPDATE recurring_deposit_account
           SET total_withdrawals = $1,
               last_modified_by = $2,
               last_modified_date = NOW()
           WHERE id = $3`,
          [
            newTotalWithdrawals,
            userId || null,
            accountId
          ]
        );
        
        // Add note if provided
        if (request.note) {
          await client.query(
            `INSERT INTO savings_account_note (
              id, savings_account_id, note, created_by, created_date
            ) VALUES ($1, $2, $3, $4, NOW())`,
            [uuidv4(), account.savings_account_id, request.note, userId || null]
          );
        }
        
        return {
          accountId,
          transactionId: recurringDepositTransactionId,
          amount: request.transactionAmount,
          runningBalance: newBalance
        };
      });
    } catch (error) {
      logger.error('Error making withdrawal from recurring deposit account', { error, accountId, request });
      throw error;
    }
  }
}

// Export a singleton instance
export const recurringDepositService = new RecurringDepositService();