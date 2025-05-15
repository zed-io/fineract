/**
 * Fixed Deposit Service for Fineract
 * Provides functionality for managing fixed deposit products and accounts
 */

import { v4 as uuidv4 } from 'uuid';
import { query, transaction } from '../utils/db';
import { logger } from '../utils/logger';
import {
  FixedDepositProduct,
  FixedDepositProductCreateRequest,
  FixedDepositInterestRateChart,
  FixedDepositInterestRateSlab,
  FixedDepositAccount,
  FixedDepositAccountCreateRequest,
  FixedDepositTransaction,
  FixedDepositAccountCharge,
  FixedDepositAccountApprovalRequest,
  FixedDepositAccountActivateRequest,
  FixedDepositAccountDepositRequest,
  FixedDepositAccountPrematureCloseRequest,
  FixedDepositAccountMaturityInstructionsUpdateRequest,
  FixedDepositProductResponse,
  FixedDepositAccountResponse
} from '../models/fixedDeposit';
import { generateAccountNumber } from '../utils/accountUtils';

export class FixedDepositService {
  
  /**
   * Create a new fixed deposit product
   * @param request Fixed deposit product creation request
   * @param userId Current user ID
   * @returns Created product ID
   */
  async createProduct(request: FixedDepositProductCreateRequest, userId?: string): Promise<string> {
    logger.info('Creating fixed deposit product', { productName: request.name });
    
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
        
        // Then create fixed deposit product
        const fixedDepositProductId = uuidv4();
        
        await client.query(
          `INSERT INTO fixed_deposit_product (
            id, savings_product_id, min_deposit_term, max_deposit_term, 
            min_deposit_term_type_enum, max_deposit_term_type_enum, 
            in_multiples_of_term, in_multiples_of_term_type_enum, 
            is_premature_closure_allowed, pre_closure_penal_applicable, 
            pre_closure_penal_interest, pre_closure_penal_interest_on_type_enum, 
            min_deposit_amount, deposit_amount, max_deposit_amount, 
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())`,
          [
            fixedDepositProductId,
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
            request.depositAmount || null,
            request.maxDepositAmount || null,
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
              `INSERT INTO fixed_deposit_interest_rate_chart (
                id, product_id, name, description, from_date, end_date, 
                is_primary_grouping_by_amount, created_by, created_date
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
              [
                chartId,
                fixedDepositProductId,
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
                  `INSERT INTO fixed_deposit_interest_rate_slab (
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
        
        return fixedDepositProductId;
      });
    } catch (error) {
      logger.error('Error creating fixed deposit product', { error, request });
      throw error;
    }
  }
  
  /**
   * Get fixed deposit product by ID
   * @param productId Product ID
   * @returns Fixed deposit product details
   */
  async getProduct(productId: string): Promise<FixedDepositProductResponse> {
    logger.info('Getting fixed deposit product', { productId });
    
    try {
      // Get product details
      const productResult = await query(
        `SELECT fdp.*, sp.name, sp.short_name, sp.description, sp.currency_code, 
          sp.currency_digits, sp.nominal_annual_interest_rate, 
          sp.interest_compounding_period_type, sp.interest_posting_period_type,
          sp.interest_calculation_type, sp.interest_calculation_days_in_year_type,
          sp.accounting_type, c.name as currency_name
        FROM fixed_deposit_product fdp
        JOIN savings_product sp ON fdp.savings_product_id = sp.id
        JOIN currency c ON sp.currency_code = c.code
        WHERE fdp.id = $1`,
        [productId]
      );
      
      if (productResult.rowCount === 0) {
        throw new Error(`Fixed deposit product with ID ${productId} not found`);
      }
      
      const product = productResult.rows[0];
      
      // Get interest rate charts
      const chartsResult = await query(
        `SELECT * FROM fixed_deposit_interest_rate_chart 
         WHERE product_id = $1
         ORDER BY from_date DESC`,
        [productId]
      );
      
      const charts = [];
      
      for (const chart of chartsResult.rows) {
        // Get slabs for each chart
        const slabsResult = await query(
          `SELECT s.*, c.name as currency_name, c.decimal_places, c.in_multiples_of
           FROM fixed_deposit_interest_rate_slab s
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
        depositAmount: product.deposit_amount,
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
      logger.error('Error getting fixed deposit product', { error, productId });
      throw error;
    }
  }
  
  /**
   * Get all fixed deposit products
   * @returns List of fixed deposit products
   */
  async getProducts(): Promise<FixedDepositProductResponse[]> {
    logger.info('Getting all fixed deposit products');
    
    try {
      const productsResult = await query(
        `SELECT fdp.id
         FROM fixed_deposit_product fdp
         JOIN savings_product sp ON fdp.savings_product_id = sp.id
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
      logger.error('Error getting fixed deposit products', { error });
      throw error;
    }
  }
  
  /**
   * Create a fixed deposit account
   * @param request Fixed deposit account creation request
   * @param userId Current user ID
   * @returns Created account ID
   */
  async createAccount(request: FixedDepositAccountCreateRequest, userId?: string): Promise<string> {
    logger.info('Creating fixed deposit account', { productId: request.productId });
    
    try {
      return await transaction(async (client) => {
        // Validate client or group is provided
        if (!request.clientId && !request.groupId) {
          throw new Error('Either clientId or groupId must be provided');
        }
        
        // Validate product exists
        const productResult = await client.query(
          `SELECT fdp.*, sp.currency_code, sp.nominal_annual_interest_rate 
           FROM fixed_deposit_product fdp
           JOIN savings_product sp ON fdp.savings_product_id = sp.id
           WHERE fdp.id = $1`,
          [request.productId]
        );
        
        if (productResult.rowCount === 0) {
          throw new Error(`Fixed deposit product with ID ${request.productId} not found`);
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
        
        // Generate account number
        const accountNo = generateAccountNumber('FD');
        
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
          FROM fixed_deposit_product fdp
          JOIN savings_product sp ON fdp.savings_product_id = sp.id
          WHERE fdp.id = $13`,
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
        
        // Create fixed deposit account
        const fixedDepositAccountId = uuidv4();
        
        await client.query(
          `INSERT INTO fixed_deposit_account (
            id, savings_account_id, product_id, deposit_amount, deposit_period,
            deposit_period_frequency_type_enum, interest_rate, is_renewal_allowed,
            is_premature_closure_allowed, pre_closure_penal_applicable,
            pre_closure_penal_interest, pre_closure_penal_interest_on_type_enum,
            on_account_closure_type, transfer_to_savings_account_id,
            linked_account_id, transfer_interest_to_linked_account,
            expected_firstdeposit_on_date, created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())`,
          [
            fixedDepositAccountId,
            savingsAccountId,
            request.productId,
            request.depositAmount,
            request.depositPeriod,
            request.depositPeriodFrequencyType,
            request.interestRate || product.nominal_annual_interest_rate,
            request.isRenewalAllowed || false,
            request.isPrematureClosureAllowed !== undefined ? request.isPrematureClosureAllowed : product.is_premature_closure_allowed,
            product.pre_closure_penal_applicable,
            product.pre_closure_penal_interest,
            product.pre_closure_penal_interest_on_type_enum,
            'withdraw_deposit',  // Default closure type
            null,  // Will be set if transfer to savings is selected
            request.linkedAccountId || null,
            request.transferInterestToLinkedAccount || false,
            request.expectedFirstDepositOnDate ? new Date(request.expectedFirstDepositOnDate) : null,
            userId || null
          ]
        );
        
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
            
            // Create fixed deposit account charge
            await client.query(
              `INSERT INTO fixed_deposit_account_charge (
                id, savings_account_charge_id, fixed_deposit_account_id, created_by, created_date
              ) VALUES ($1, $2, $3, $4, NOW())`,
              [
                uuidv4(),
                savingsChargeId,
                fixedDepositAccountId,
                userId || null
              ]
            );
          }
        }
        
        return fixedDepositAccountId;
      });
    } catch (error) {
      logger.error('Error creating fixed deposit account', { error, request });
      throw error;
    }
  }
  
  /**
   * Get fixed deposit account by ID
   * @param accountId Account ID
   * @returns Fixed deposit account details
   */
  async getAccount(accountId: string): Promise<FixedDepositAccountResponse> {
    logger.info('Getting fixed deposit account', { accountId });
    
    try {
      // Get account details
      const accountResult = await query(
        `SELECT fda.*, sa.account_no, sa.external_id, sa.client_id, sa.group_id, sa.status,
                sa.field_officer_id, sa.currency_code, sa.currency_digits, 
                sa.interest_compounding_period_type, sa.interest_posting_period_type,
                sa.interest_calculation_type, sa.interest_calculation_days_in_year_type,
                sa.submitted_on_date, fdp.id as product_id, sp.name as product_name,
                c.name as client_name, g.group_name, s.display_name as staff_name,
                cur.name as currency_name, cur.decimal_places, cur.in_multiples_of,
                linked.account_no as linked_account_no,
                transfer.account_no as transfer_account_no
         FROM fixed_deposit_account fda
         JOIN savings_account sa ON fda.savings_account_id = sa.id
         JOIN fixed_deposit_product fdp ON fda.product_id = fdp.id
         JOIN savings_product sp ON fdp.savings_product_id = sp.id
         LEFT JOIN client c ON sa.client_id = c.id
         LEFT JOIN client_group g ON sa.group_id = g.id
         LEFT JOIN staff s ON sa.field_officer_id = s.id
         LEFT JOIN currency cur ON sa.currency_code = cur.code
         LEFT JOIN savings_account linked ON fda.linked_account_id = linked.id
         LEFT JOIN savings_account transfer ON fda.transfer_to_savings_account_id = transfer.id
         WHERE fda.id = $1`,
        [accountId]
      );
      
      if (accountResult.rowCount === 0) {
        throw new Error(`Fixed deposit account with ID ${accountId} not found`);
      }
      
      const account = accountResult.rows[0];
      
      // Get charges
      const chargesResult = await query(
        `SELECT sac.*, c.name, c.currency_code, c.charge_time_type, 
                c.charge_calculation_type, c.is_penalty,
                cur.name as currency_name, cur.decimal_places, cur.in_multiples_of
         FROM fixed_deposit_account_charge fdac
         JOIN savings_account_charge sac ON fdac.savings_account_charge_id = sac.id
         JOIN charge c ON sac.charge_id = c.id
         JOIN currency cur ON c.currency_code = cur.code
         WHERE fdac.fixed_deposit_account_id = $1`,
        [accountId]
      );
      
      // Get transactions if account is active
      let transactions = [];
      if (account.status === 'active') {
        const transactionsResult = await query(
          `SELECT fdt.*, sat.transaction_type, sat.amount, sat.running_balance, 
                  sat.transaction_date, sat.is_reversed, sat.submitted_on_date,
                  pd.id as payment_detail_id, pd.payment_type_id, pd.account_number,
                  pd.check_number, pd.routing_code, pd.receipt_number, pd.bank_number,
                  pt.name as payment_type_name, cur.name as currency_name, 
                  cur.decimal_places, cur.in_multiples_of
           FROM fixed_deposit_transaction fdt
           JOIN savings_account_transaction sat ON fdt.savings_account_transaction_id = sat.id
           LEFT JOIN payment_detail pd ON sat.payment_detail_id = pd.id
           LEFT JOIN payment_type pt ON pd.payment_type_id = pt.id
           JOIN currency cur ON sat.currency_code = cur.code
           WHERE fdt.fixed_deposit_account_id = $1
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
        interestRate: account.interest_rate,
        interestEarned: account.interest_earned,
        preClosurePenalApplicable: account.pre_closure_penal_applicable,
        preClosurePenalInterest: account.pre_closure_penal_interest,
        preClosurePenalInterestOnType: account.pre_closure_penal_interest_on_type_enum ? {
          id: 0,
          code: account.pre_closure_penal_interest_on_type_enum,
          value: account.pre_closure_penal_interest_on_type_enum
        } : undefined,
        summary: {
          totalDeposits: account.deposit_amount || 0,
          totalInterestEarned: account.interest_earned || 0,
          totalWithdrawals: account.total_withdrawals || 0,
          totalWithholdTax: account.total_withhold_tax || 0,
          accountBalance: (account.deposit_amount || 0) + (account.interest_earned || 0) - (account.total_withdrawals || 0) - (account.total_withhold_tax || 0)
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
        transactions
      };
    } catch (error) {
      logger.error('Error getting fixed deposit account', { error, accountId });
      throw error;
    }
  }
  
  /**
   * Approve a fixed deposit account
   * @param accountId Account ID
   * @param request Approval request
   * @param userId Current user ID
   * @returns Approved account
   */
  async approveAccount(accountId: string, request: FixedDepositAccountApprovalRequest, userId?: string): Promise<any> {
    logger.info('Approving fixed deposit account', { accountId });
    
    try {
      return await transaction(async (client) => {
        // Get account details
        const accountResult = await client.query(
          `SELECT fda.*, sa.id as savings_account_id, sa.status
           FROM fixed_deposit_account fda
           JOIN savings_account sa ON fda.savings_account_id = sa.id
           WHERE fda.id = $1`,
          [accountId]
        );
        
        if (accountResult.rowCount === 0) {
          throw new Error(`Fixed deposit account with ID ${accountId} not found`);
        }
        
        const account = accountResult.rows[0];
        
        // Validate account status
        if (account.status !== 'submitted_and_pending_approval') {
          throw new Error(`Cannot approve account with status ${account.status}`);
        }
        
        // Parse approval date
        const approvalDate = new Date(request.approvedOnDate);
        
        // Calculate maturity date based on deposit period
        let maturityDate;
        switch(account.deposit_period_frequency_type_enum) {
          case 'days':
            maturityDate = new Date(approvalDate);
            maturityDate.setDate(maturityDate.getDate() + account.deposit_period);
            break;
          case 'weeks':
            maturityDate = new Date(approvalDate);
            maturityDate.setDate(maturityDate.getDate() + (account.deposit_period * 7));
            break;
          case 'months':
            maturityDate = new Date(approvalDate);
            maturityDate.setMonth(maturityDate.getMonth() + account.deposit_period);
            break;
          case 'years':
            maturityDate = new Date(approvalDate);
            maturityDate.setFullYear(maturityDate.getFullYear() + account.deposit_period);
            break;
          default:
            throw new Error(`Unsupported deposit period frequency type: ${account.deposit_period_frequency_type_enum}`);
        }
        
        // Calculate maturity amount (simplified - in a real implementation you would use compound interest calculation)
        // A = P(1 + r/n)^(nt)
        // where:
        // A = maturity amount
        // P = principal (deposit amount)
        // r = annual interest rate (decimal)
        // n = number of times interest is compounded per year
        // t = time in years
        
        let n = 1; // Default to annual compounding
        const interestRate = account.interest_rate / 100;
        let timeInYears;
        
        switch(account.deposit_period_frequency_type_enum) {
          case 'days':
            timeInYears = account.deposit_period / 365;
            break;
          case 'weeks':
            timeInYears = (account.deposit_period * 7) / 365;
            break;
          case 'months':
            timeInYears = account.deposit_period / 12;
            break;
          case 'years':
            timeInYears = account.deposit_period;
            break;
          default:
            timeInYears = 1;
        }
        
        // Determine compounding frequency
        switch(account.interest_compounding_period_type) {
          case 'daily':
            n = 365;
            break;
          case 'monthly':
            n = 12;
            break;
          case 'quarterly':
            n = 4;
            break;
          case 'semi_annual':
            n = 2;
            break;
          case 'annual':
            n = 1;
            break;
        }
        
        const maturityAmount = account.deposit_amount * Math.pow(1 + (interestRate / n), n * timeInYears);
        const interestEarned = maturityAmount - account.deposit_amount;
        
        // Update savings account status
        await client.query(
          `UPDATE savings_account
           SET status = 'approved',
               approved_on_date = $1,
               approved_by_user_id = $2,
               last_modified_by = $2,
               last_modified_date = NOW()
           WHERE id = $3`,
          [approvalDate, userId || null, account.savings_account_id]
        );
        
        // Update fixed deposit account
        await client.query(
          `UPDATE fixed_deposit_account
           SET maturity_amount = $1,
               maturity_date = $2,
               interest_earned = $3,
               last_modified_by = $4,
               last_modified_date = NOW()
           WHERE id = $5`,
          [maturityAmount, maturityDate, interestEarned, userId || null, accountId]
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
          approvedOnDate: approvalDate.toISOString().split('T')[0],
          maturityDate: maturityDate.toISOString().split('T')[0],
          maturityAmount
        };
      });
    } catch (error) {
      logger.error('Error approving fixed deposit account', { error, accountId, request });
      throw error;
    }
  }
  
  /**
   * Activate a fixed deposit account (deposit the initial amount)
   * @param accountId Account ID
   * @param request Activation request
   * @param userId Current user ID
   * @returns Activated account
   */
  async activateAccount(accountId: string, request: FixedDepositAccountActivateRequest, userId?: string): Promise<any> {
    logger.info('Activating fixed deposit account', { accountId });
    
    try {
      return await transaction(async (client) => {
        // Get account details
        const accountResult = await client.query(
          `SELECT fda.*, sa.id as savings_account_id, sa.status, sa.currency_code
           FROM fixed_deposit_account fda
           JOIN savings_account sa ON fda.savings_account_id = sa.id
           WHERE fda.id = $1`,
          [accountId]
        );
        
        if (accountResult.rowCount === 0) {
          throw new Error(`Fixed deposit account with ID ${accountId} not found`);
        }
        
        const account = accountResult.rows[0];
        
        // Validate account status
        if (account.status !== 'approved') {
          throw new Error(`Cannot activate account with status ${account.status}`);
        }
        
        // Parse activation date
        const activationDate = new Date(request.activatedOnDate);
        
        // Create initial deposit transaction
        const savingsTransactionId = uuidv4();
        
        await client.query(
          `INSERT INTO savings_account_transaction (
            id, savings_account_id, transaction_type, transaction_date,
            amount, currency_code, running_balance, submitted_on_date,
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $5, $4, $7, NOW())`,
          [
            savingsTransactionId,
            account.savings_account_id,
            'deposit',
            activationDate,
            account.deposit_amount,
            account.currency_code,
            userId || null
          ]
        );
        
        // Create fixed deposit transaction
        const fixedDepositTransactionId = uuidv4();
        
        await client.query(
          `INSERT INTO fixed_deposit_transaction (
            id, savings_account_transaction_id, fixed_deposit_account_id,
            transaction_type, amount, balance_after_transaction,
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $5, $6, NOW())`,
          [
            fixedDepositTransactionId,
            savingsTransactionId,
            accountId,
            'deposit',
            account.deposit_amount,
            userId || null
          ]
        );
        
        // Update savings account status
        await client.query(
          `UPDATE savings_account
           SET status = 'active',
               activated_on_date = $1,
               activated_by_user_id = $2,
               last_modified_by = $2,
               last_modified_date = NOW()
           WHERE id = $3`,
          [activationDate, userId || null, account.savings_account_id]
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
          activatedOnDate: activationDate.toISOString().split('T')[0],
          transactionId: fixedDepositTransactionId
        };
      });
    } catch (error) {
      logger.error('Error activating fixed deposit account', { error, accountId, request });
      throw error;
    }
  }
}

// Export a singleton instance
export const fixedDepositService = new FixedDepositService();