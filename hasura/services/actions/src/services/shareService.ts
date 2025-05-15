/**
 * Share Account Service
 * 
 * Provides business logic for share account and product management including:
 * - Share product management
 * - Share account operations
 * - Share purchase/redemption
 * - Dividend management
 */

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase } from '../utils/db';
import { logger } from '../utils/logger';
import {
  ShareProduct,
  ShareProductCreateRequest,
  ShareProductResponse,
  ShareProductCreateResponse,
  ShareProductsResponse,
  ShareAccount,
  ShareAccountCreateRequest,
  ShareAccountResponse,
  ShareAccountCreateResponse,
  ShareAccountsResponse,
  ShareAccountApprovalRequest,
  ShareAccountApprovalResponse,
  ShareAccountRejectRequest,
  ShareAccountRejectResponse,
  ShareAccountActivateRequest,
  ShareAccountActivateResponse,
  ShareAccountCloseRequest,
  ShareAccountCloseResponse,
  SharePurchaseSubmitRequest,
  SharePurchaseSubmitResponse,
  SharePurchaseApprovalRequest,
  SharePurchaseApprovalResponse,
  SharePurchaseRejectRequest,
  SharePurchaseRejectResponse,
  ShareRedeemRequest,
  ShareRedeemResponse,
  ShareProductDividendDeclareRequest,
  ShareProductDividendDeclareResponse,
  ShareAccountDividendProcessRequest,
  ShareAccountDividendProcessResponse,
  ShareTemplateResponse,
  ShareCapitalType,
  ShareValueCalculationType,
  ShareAccountStatus,
  SharePurchaseRequestStatus,
  ShareTransactionType,
  ShareDividendStatus
} from '../models/share';

/**
 * Service implementation for Share Account operations
 */
class ShareService {
  /**
   * Create a new share product
   */
  async createProduct(request: ShareProductCreateRequest, userId?: string): Promise<string> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Insert share product
      const shareProductQuery = `
        INSERT INTO share_product(
          name, short_name, description, currency_code, currency_digits, currency_multiplesof,
          external_id, total_shares, total_shares_to_be_issued, nominal_price, market_price,
          share_capital_type, share_value_calculation_type, allow_dividends_for_inactive_clients,
          lockin_period, lockin_period_type_enum, minimum_shares, nominal_shares_default,
          maximum_shares, accounting_rule, is_active, created_by
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
        RETURNING id
      `;

      const shareCapitalType = request.shareCapitalType || ShareCapitalType.PAID_UP;
      const shareValueCalculationType = request.shareValueCalculationType || ShareValueCalculationType.NOMINAL;
      
      const productResult = await dbClient.query(shareProductQuery, [
        request.name,
        request.shortName,
        request.description,
        request.currencyCode,
        request.currencyDigits || 2,
        request.currencyMultiplesOf,
        request.externalId,
        request.totalShares,
        request.totalSharesToBeIssued,
        request.nominalPrice,
        request.marketPrice,
        shareCapitalType,
        shareValueCalculationType,
        request.allowDividendsForInactiveClients || false,
        request.lockinPeriod,
        request.lockinPeriodType,
        request.minimumShares,
        request.nominateSharesDefault,
        request.maximumShares,
        request.accountingRule,
        true,
        userId
      ]);

      const productId = productResult.rows[0].id;

      // Insert market prices if provided
      if (request.marketPrices && request.marketPrices.length > 0) {
        const marketPriceQuery = `
          INSERT INTO share_product_market_price(
            product_id, from_date, price, created_by
          )
          VALUES($1, $2, $3, $4)
        `;

        for (const marketPrice of request.marketPrices) {
          await dbClient.query(marketPriceQuery, [
            productId,
            marketPrice.fromDate,
            marketPrice.price,
            userId
          ]);
        }
      }

      // Link charges if provided
      if (request.charges && request.charges.length > 0) {
        const chargeQuery = `
          INSERT INTO share_product_charge(
            product_id, charge_id, created_by
          )
          VALUES($1, $2, $3)
        `;

        for (const chargeId of request.charges) {
          await dbClient.query(chargeQuery, [
            productId,
            chargeId,
            userId
          ]);
        }
      }

      await dbClient.query('COMMIT');
      return productId;
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error creating share product', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Get a share product by ID
   */
  async getProduct(productId: string): Promise<ShareProductResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      // Get product details
      const productQuery = `
        SELECT 
          sp.id, sp.name, sp.short_name AS "shortName", sp.description, sp.external_id AS "externalId",
          sp.currency_code AS "currencyCode", sp.currency_digits AS "currencyDigits", 
          sp.currency_multiplesof AS "currencyMultiplesOf",
          sp.total_shares AS "totalShares", sp.issued_shares AS "issuedShares", 
          sp.total_shares_to_be_issued AS "totalSharesToBeIssued",
          sp.nominal_price AS "nominalPrice", sp.market_price AS "marketPrice",
          sp.share_capital_type AS "shareCapitalType", sp.share_value_calculation_type AS "shareValueCalculationType",
          sp.allow_dividends_for_inactive_clients AS "allowDividendsForInactiveClients",
          sp.lockin_period AS "lockinPeriod", sp.lockin_period_type_enum AS "lockinPeriodType",
          sp.minimum_shares AS "minimumShares", sp.nominal_shares_default AS "nominateSharesDefault",
          sp.maximum_shares AS "maximumShares",
          sp.accounting_rule AS "accountingRule", sp.is_active AS "isActive"
        FROM share_product sp
        WHERE sp.id = $1
      `;

      const productResult = await client.query(productQuery, [productId]);
      
      if (productResult.rows.length === 0) {
        throw new Error(`Share product with id ${productId} not found`);
      }
      
      const product = productResult.rows[0];

      // Get charges
      const chargesQuery = `
        SELECT 
          spc.id, spc.product_id AS "productId", spc.charge_id AS "chargeId",
          c.name AS "chargeName", c.charge_type_enum AS "chargeType",
          c.charge_calculation_enum AS "chargeCalculationType", c.charge_time_enum AS "chargeTimeType",
          c.amount
        FROM share_product_charge spc
        JOIN charge c ON c.id = spc.charge_id
        WHERE spc.product_id = $1
      `;

      const chargesResult = await client.query(chargesQuery, [productId]);
      const charges = chargesResult.rows;

      // Get market prices
      const marketPricesQuery = `
        SELECT 
          id, product_id AS "productId", from_date AS "fromDate", price
        FROM share_product_market_price
        WHERE product_id = $1
        ORDER BY from_date DESC
      `;

      const marketPricesResult = await client.query(marketPricesQuery, [productId]);
      const marketPrices = marketPricesResult.rows;

      return {
        ...product,
        charges,
        marketPrices,
        currency: {
          code: product.currencyCode,
          name: product.currencyCode, // We would typically fetch this from a currency table
          decimalPlaces: product.currencyDigits,
          inMultiplesOf: product.currencyMultiplesOf || 1,
          displaySymbol: product.currencyCode,
          nameCode: product.currencyCode,
          displayLabel: product.currencyCode
        }
      };
    } catch (error) {
      logger.error('Error fetching share product', { error });
      throw error;
    }
  }

  /**
   * Get all share products
   */
  async getProducts(): Promise<ShareProductsResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      // Get all products
      const productsQuery = `
        SELECT 
          sp.id, sp.name, sp.short_name AS "shortName", sp.description, sp.external_id AS "externalId",
          sp.currency_code AS "currencyCode", sp.currency_digits AS "currencyDigits", 
          sp.currency_multiplesof AS "currencyMultiplesOf",
          sp.total_shares AS "totalShares", sp.issued_shares AS "issuedShares", 
          sp.total_shares_to_be_issued AS "totalSharesToBeIssued",
          sp.nominal_price AS "nominalPrice", sp.market_price AS "marketPrice",
          sp.share_capital_type AS "shareCapitalType", sp.share_value_calculation_type AS "shareValueCalculationType",
          sp.allow_dividends_for_inactive_clients AS "allowDividendsForInactiveClients",
          sp.lockin_period AS "lockinPeriod", sp.lockin_period_type_enum AS "lockinPeriodType",
          sp.minimum_shares AS "minimumShares", sp.nominal_shares_default AS "nominateSharesDefault",
          sp.maximum_shares AS "maximumShares",
          sp.accounting_rule AS "accountingRule", sp.is_active AS "isActive"
        FROM share_product sp
        WHERE sp.is_active = true
        ORDER BY sp.name
      `;

      const productsResult = await client.query(productsQuery);
      const products = await Promise.all(productsResult.rows.map(async product => {
        // Get charges for each product
        const chargesQuery = `
          SELECT 
            spc.id, spc.product_id AS "productId", spc.charge_id AS "chargeId",
            c.name AS "chargeName", c.charge_type_enum AS "chargeType",
            c.charge_calculation_enum AS "chargeCalculationType", c.charge_time_enum AS "chargeTimeType",
            c.amount
          FROM share_product_charge spc
          JOIN charge c ON c.id = spc.charge_id
          WHERE spc.product_id = $1
        `;

        const chargesResult = await client.query(chargesQuery, [product.id]);
        const charges = chargesResult.rows;

        // Get market prices for each product
        const marketPricesQuery = `
          SELECT 
            id, product_id AS "productId", from_date AS "fromDate", price
          FROM share_product_market_price
          WHERE product_id = $1
          ORDER BY from_date DESC
        `;

        const marketPricesResult = await client.query(marketPricesQuery, [product.id]);
        const marketPrices = marketPricesResult.rows;

        return {
          ...product,
          charges,
          marketPrices,
          currency: {
            code: product.currencyCode,
            name: product.currencyCode,
            decimalPlaces: product.currencyDigits,
            inMultiplesOf: product.currencyMultiplesOf || 1,
            displaySymbol: product.currencyCode,
            nameCode: product.currencyCode,
            displayLabel: product.currencyCode
          }
        };
      }));

      return { products };
    } catch (error) {
      logger.error('Error fetching share products', { error });
      throw error;
    }
  }

  /**
   * Create a new share account
   */
  async createAccount(request: ShareAccountCreateRequest, userId?: string): Promise<string> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Generate account number
      const accountNo = await this.generateAccountNumber(dbClient);

      // Get product details
      const productQuery = `
        SELECT id, name, office_id, currency_code
        FROM share_product
        WHERE id = $1
      `;
      
      const productResult = await dbClient.query(productQuery, [request.productId]);
      if (productResult.rows.length === 0) {
        throw new Error(`Share product with id ${request.productId} not found`);
      }
      
      const product = productResult.rows[0];

      // Determine office ID (either from product or from client/group)
      let officeId = product.office_id;
      if (!officeId) {
        if (request.clientId) {
          const clientQuery = `SELECT office_id FROM client WHERE id = $1`;
          const clientResult = await dbClient.query(clientQuery, [request.clientId]);
          if (clientResult.rows.length > 0) {
            officeId = clientResult.rows[0].office_id;
          }
        } else if (request.groupId) {
          const groupQuery = `SELECT office_id FROM groups WHERE id = $1`;
          const groupResult = await dbClient.query(groupQuery, [request.groupId]);
          if (groupResult.rows.length > 0) {
            officeId = groupResult.rows[0].office_id;
          }
        }
      }

      if (!officeId) {
        throw new Error('Office ID is required but could not be determined');
      }

      // Insert share account
      const accountQuery = `
        INSERT INTO share_account(
          account_no, external_id, client_id, group_id, product_id, 
          field_officer_id, office_id, status, 
          submitted_date, submitted_by, total_approved_shares, total_pending_shares,
          lockin_period, lockin_period_type_enum, is_dividend_posted, created_by
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `;

      const accountResult = await dbClient.query(accountQuery, [
        accountNo,
        request.externalId,
        request.clientId,
        request.groupId,
        request.productId,
        request.fieldOfficerId,
        officeId,
        ShareAccountStatus.SUBMITTED_AND_PENDING_APPROVAL,
        request.submittedDate,
        userId,
        0,
        request.requestedShares,
        request.lockinPeriod,
        request.lockinPeriodFrequencyType,
        false,
        userId
      ]);

      const accountId = accountResult.rows[0].id;

      // Create initial purchase request
      const purchaseRequestQuery = `
        INSERT INTO share_purchase_request(
          account_id, request_date, requested_shares, status,
          requested_date, requested_by, created_by
        )
        VALUES($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      await dbClient.query(purchaseRequestQuery, [
        accountId,
        request.submittedDate,
        request.requestedShares,
        SharePurchaseRequestStatus.PENDING,
        request.submittedDate,
        userId,
        userId
      ]);

      // Add charges if provided
      if (request.charges && request.charges.length > 0) {
        const chargeQuery = `
          INSERT INTO share_account_charge(
            account_id, charge_id, amount, amount_outstanding,
            is_paid, is_waived, is_active, is_penalty, due_date, created_by
          )
          VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;

        for (const charge of request.charges) {
          await dbClient.query(chargeQuery, [
            accountId,
            charge.chargeId,
            charge.amount,
            charge.amount,
            false,
            false,
            true,
            false,
            charge.dueDate,
            userId
          ]);
        }
      }

      await dbClient.query('COMMIT');
      return accountId;
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error creating share account', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Get a share account by ID
   */
  async getAccount(accountId: string): Promise<ShareAccountResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      // Get account details
      const accountQuery = `
        SELECT 
          sa.id, sa.account_no AS "accountNo", sa.external_id AS "externalId",
          sa.client_id AS "clientId", c.display_name AS "clientName",
          sa.group_id AS "groupId", g.display_name AS "groupName",
          sa.product_id AS "productId", sp.name AS "productName",
          sa.field_officer_id AS "fieldOfficerId", s.display_name AS "fieldOfficerName",
          sa.office_id AS "officeId", o.name AS "officeName",
          sa.status,
          sa.submitted_date AS "submittedDate", 
          u1.username AS "submittedByUsername", u1.firstname AS "submittedByFirstname", u1.lastname AS "submittedByLastname",
          sa.approved_date AS "approvedDate", 
          u2.username AS "approvedByUsername", u2.firstname AS "approvedByFirstname", u2.lastname AS "approvedByLastname",
          sa.rejected_date AS "rejectedDate", 
          u3.username AS "rejectedByUsername", u3.firstname AS "rejectedByFirstname", u3.lastname AS "rejectedByLastname",
          sa.activated_date AS "activatedDate", 
          u4.username AS "activatedByUsername", u4.firstname AS "activatedByFirstname", u4.lastname AS "activatedByLastname",
          sa.closed_date AS "closedDate", 
          u5.username AS "closedByUsername", u5.firstname AS "closedByFirstname", u5.lastname AS "closedByLastname",
          sa.total_approved_shares AS "totalApprovedShares", sa.total_pending_shares AS "totalPendingShares",
          sa.lockin_period AS "lockinPeriod", sa.lockin_period_type_enum AS "lockinPeriodType",
          sa.is_dividend_posted AS "isDividendPosted",
          sp.currency_code AS "currencyCode", sp.currency_digits AS "currencyDigits", 
          sp.currency_multiplesof AS "currencyMultiplesOf", sp.nominal_price AS "nominalPrice"
        FROM share_account sa
        LEFT JOIN client c ON c.id = sa.client_id
        LEFT JOIN groups g ON g.id = sa.group_id
        LEFT JOIN share_product sp ON sp.id = sa.product_id
        LEFT JOIN staff s ON s.id = sa.field_officer_id
        LEFT JOIN office o ON o.id = sa.office_id
        LEFT JOIN m_appuser u1 ON u1.id = sa.submitted_by
        LEFT JOIN m_appuser u2 ON u2.id = sa.approved_by
        LEFT JOIN m_appuser u3 ON u3.id = sa.rejected_by
        LEFT JOIN m_appuser u4 ON u4.id = sa.activated_by
        LEFT JOIN m_appuser u5 ON u5.id = sa.closed_by
        WHERE sa.id = $1
      `;

      const accountResult = await client.query(accountQuery, [accountId]);
      
      if (accountResult.rows.length === 0) {
        throw new Error(`Share account with id ${accountId} not found`);
      }
      
      const account = accountResult.rows[0];

      // Get charges
      const chargesQuery = `
        SELECT 
          sac.id, sac.account_id AS "accountId", sac.charge_id AS "chargeId",
          c.name AS "chargeName", c.charge_time_enum AS "chargeTimeType",
          c.charge_calculation_enum AS "chargeCalculationType",
          sac.amount, sac.amount_paid AS "amountPaid", sac.amount_waived AS "amountWaived",
          sac.amount_outstanding AS "amountOutstanding",
          sac.is_paid AS "isPaid", sac.is_waived AS "isWaived", 
          sac.is_active AS "isActive", sac.is_penalty AS "isPenalty",
          sac.due_date AS "dueDate"
        FROM share_account_charge sac
        JOIN charge c ON c.id = sac.charge_id
        WHERE sac.account_id = $1
      `;

      const chargesResult = await client.query(chargesQuery, [accountId]);
      const charges = chargesResult.rows;

      // Get purchase requests
      const purchaseRequestsQuery = `
        SELECT 
          spr.id, spr.account_id AS "accountId", spr.request_date AS "requestDate",
          spr.requested_shares AS "requestedShares", spr.status,
          spr.requested_date AS "requestedDate", 
          u1.username AS "requestedByUsername", u1.firstname AS "requestedByFirstname", u1.lastname AS "requestedByLastname",
          spr.processed_date AS "processedDate", 
          u2.username AS "processedByUsername", u2.firstname AS "processedByFirstname", u2.lastname AS "processedByLastname"
        FROM share_purchase_request spr
        LEFT JOIN m_appuser u1 ON u1.id = spr.requested_by
        LEFT JOIN m_appuser u2 ON u2.id = spr.processed_by
        WHERE spr.account_id = $1
        ORDER BY spr.request_date DESC
      `;

      const purchaseRequestsResult = await client.query(purchaseRequestsQuery, [accountId]);
      const purchaseRequests = purchaseRequestsResult.rows;

      // Get transactions
      const transactionsQuery = `
        SELECT 
          sat.id, sat.account_id AS "accountId", sat.purchase_request_id AS "purchaseRequestId",
          sat.transaction_date AS "transactionDate", sat.transaction_type AS "transactionType",
          sat.shares_quantity AS "sharesQuantity", sat.unit_price AS "unitPrice",
          sat.total_amount AS "totalAmount", sat.charged_amount AS "chargedAmount",
          sat.is_reversed AS "isReversed"
        FROM share_account_transaction sat
        WHERE sat.account_id = $1
        ORDER BY sat.transaction_date DESC
      `;

      const transactionsResult = await client.query(transactionsQuery, [accountId]);
      const transactions = transactionsResult.rows;

      // Get dividends
      const dividendsQuery = `
        SELECT 
          sad.id, sad.account_id AS "accountId", sad.dividend_pay_out_id AS "dividendPayOutId",
          sad.amount, sad.status, sad.processed_date AS "processedDate",
          sad.savings_transaction_id AS "savingsTransactionId"
        FROM share_account_dividend sad
        WHERE sad.account_id = $1
        ORDER BY sad.processed_date DESC
      `;

      const dividendsResult = await client.query(dividendsQuery, [accountId]);
      const dividends = dividendsResult.rows;

      // Calculate summary
      const totalShareValue = (account.totalApprovedShares || 0) * (account.nominalPrice || 0);
      
      let totalDividends = 0;
      dividends.forEach(div => {
        if (div.status === ShareDividendStatus.PROCESSED) {
          totalDividends += parseFloat(div.amount || 0);
        }
      });

      let totalCharges = 0;
      charges.forEach(charge => {
        if (!charge.isWaived) {
          totalCharges += parseFloat(charge.amountPaid || 0);
        }
      });

      const totalRejectedShares = purchaseRequests.reduce((total, req) => {
        if (req.status === SharePurchaseRequestStatus.REJECTED) {
          return total + parseInt(req.requestedShares);
        }
        return total;
      }, 0);

      const summary = {
        totalApprovedShares: account.totalApprovedShares || 0,
        totalPendingShares: account.totalPendingShares || 0,
        totalRejectedShares: totalRejectedShares,
        totalActive: account.totalApprovedShares || 0,
        totalShareValue: totalShareValue,
        totalDividends: totalDividends,
        totalCharges: totalCharges
      };

      return {
        ...account,
        charges,
        purchaseRequests,
        transactions,
        dividends,
        summary,
        currency: {
          code: account.currencyCode,
          name: account.currencyCode,
          decimalPlaces: account.currencyDigits,
          inMultiplesOf: account.currencyMultiplesOf || 1,
          displaySymbol: account.currencyCode,
          nameCode: account.currencyCode,
          displayLabel: account.currencyCode
        }
      };
    } catch (error) {
      logger.error('Error fetching share account', { error });
      throw error;
    }
  }

  /**
   * Get all share accounts for a client
   */
  async getClientAccounts(clientId: string): Promise<ShareAccountsResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      // Get accounts for client
      const accountsQuery = `
        SELECT 
          sa.id, sa.account_no AS "accountNo", sa.external_id AS "externalId",
          sa.client_id AS "clientId", c.display_name AS "clientName",
          sa.product_id AS "productId", sp.name AS "productName",
          sa.status, sa.total_approved_shares AS "totalApprovedShares",
          sa.total_pending_shares AS "totalPendingShares",
          sp.currency_code AS "currencyCode", sp.currency_digits AS "currencyDigits", 
          sp.nominal_price AS "nominalPrice"
        FROM share_account sa
        JOIN client c ON c.id = sa.client_id
        JOIN share_product sp ON sp.id = sa.product_id
        WHERE sa.client_id = $1
        ORDER BY sa.submitted_date DESC
      `;

      const accountsResult = await client.query(accountsQuery, [clientId]);
      const accountSummaries = accountsResult.rows.map(account => ({
        ...account,
        currency: {
          code: account.currencyCode,
          name: account.currencyCode,
          decimalPlaces: account.currencyDigits,
          displaySymbol: account.currencyCode,
          nameCode: account.currencyCode,
          displayLabel: account.currencyCode
        },
        summary: {
          totalApprovedShares: account.totalApprovedShares || 0,
          totalPendingShares: account.totalPendingShares || 0,
          totalShareValue: (account.totalApprovedShares || 0) * (account.nominalPrice || 0)
        }
      }));

      return { accounts: accountSummaries };
    } catch (error) {
      logger.error('Error fetching client share accounts', { error });
      throw error;
    }
  }

  /**
   * Get all share accounts for a group
   */
  async getGroupAccounts(groupId: string): Promise<ShareAccountsResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      // Get accounts for group
      const accountsQuery = `
        SELECT 
          sa.id, sa.account_no AS "accountNo", sa.external_id AS "externalId",
          sa.group_id AS "groupId", g.display_name AS "groupName",
          sa.product_id AS "productId", sp.name AS "productName",
          sa.status, sa.total_approved_shares AS "totalApprovedShares",
          sa.total_pending_shares AS "totalPendingShares",
          sp.currency_code AS "currencyCode", sp.currency_digits AS "currencyDigits", 
          sp.nominal_price AS "nominalPrice"
        FROM share_account sa
        JOIN groups g ON g.id = sa.group_id
        JOIN share_product sp ON sp.id = sa.product_id
        WHERE sa.group_id = $1
        ORDER BY sa.submitted_date DESC
      `;

      const accountsResult = await client.query(accountsQuery, [groupId]);
      const accountSummaries = accountsResult.rows.map(account => ({
        ...account,
        currency: {
          code: account.currencyCode,
          name: account.currencyCode,
          decimalPlaces: account.currencyDigits,
          displaySymbol: account.currencyCode,
          nameCode: account.currencyCode,
          displayLabel: account.currencyCode
        },
        summary: {
          totalApprovedShares: account.totalApprovedShares || 0,
          totalPendingShares: account.totalPendingShares || 0,
          totalShareValue: (account.totalApprovedShares || 0) * (account.nominalPrice || 0)
        }
      }));

      return { accounts: accountSummaries };
    } catch (error) {
      logger.error('Error fetching group share accounts', { error });
      throw error;
    }
  }

  /**
   * Approve a share account
   */
  async approveAccount(accountId: string, request: ShareAccountApprovalRequest, userId?: string): Promise<ShareAccountApprovalResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if account exists and is in correct status
      const accountQuery = `
        SELECT id, status, product_id, total_pending_shares
        FROM share_account
        WHERE id = $1
      `;
      
      const accountResult = await dbClient.query(accountQuery, [accountId]);
      if (accountResult.rows.length === 0) {
        throw new Error(`Share account with id ${accountId} not found`);
      }
      
      const account = accountResult.rows[0];
      
      if (account.status !== ShareAccountStatus.SUBMITTED_AND_PENDING_APPROVAL) {
        throw new Error(`Share account with id ${accountId} is not in 'submitted and pending approval' status`);
      }

      if (request.approvedShares > account.total_pending_shares) {
        throw new Error(`Approved shares (${request.approvedShares}) cannot exceed pending shares (${account.total_pending_shares})`);
      }

      // Get product details for share price
      const productQuery = `
        SELECT id, nominal_price
        FROM share_product
        WHERE id = $1
      `;
      
      const productResult = await dbClient.query(productQuery, [account.product_id]);
      if (productResult.rows.length === 0) {
        throw new Error(`Share product not found`);
      }
      
      const product = productResult.rows[0];
      
      // Update account status and approved shares
      const updateAccountQuery = `
        UPDATE share_account
        SET 
          status = $1,
          approved_date = $2,
          approved_by = $3,
          total_approved_shares = $4,
          total_pending_shares = total_pending_shares - $4
        WHERE id = $5
        RETURNING id
      `;

      await dbClient.query(updateAccountQuery, [
        ShareAccountStatus.APPROVED,
        request.approvedDate,
        userId,
        request.approvedShares,
        accountId
      ]);

      // Get the initial purchase request
      const purchaseRequestQuery = `
        SELECT id, requested_shares
        FROM share_purchase_request
        WHERE account_id = $1 AND status = $2
        ORDER BY request_date
        LIMIT 1
      `;

      const purchaseRequestResult = await dbClient.query(purchaseRequestQuery, [
        accountId,
        SharePurchaseRequestStatus.PENDING
      ]);

      if (purchaseRequestResult.rows.length === 0) {
        throw new Error(`No pending purchase request found for account ${accountId}`);
      }

      const purchaseRequest = purchaseRequestResult.rows[0];

      // Create approve transaction
      const transactionQuery = `
        INSERT INTO share_account_transaction(
          account_id, purchase_request_id, transaction_date, transaction_type,
          shares_quantity, unit_price, total_amount, charged_amount, is_reversed, created_by
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;

      const totalAmount = request.approvedShares * product.nominal_price;
      
      await dbClient.query(transactionQuery, [
        accountId,
        purchaseRequest.id,
        request.approvedDate,
        ShareTransactionType.APPROVE,
        request.approvedShares,
        product.nominal_price,
        totalAmount,
        0,
        false,
        userId
      ]);

      // Update purchase request
      const pendingShares = purchaseRequest.requested_shares - request.approvedShares;
      const purchaseStatus = pendingShares > 0 ? SharePurchaseRequestStatus.PENDING : SharePurchaseRequestStatus.APPROVED;
      
      const updatePurchaseRequestQuery = `
        UPDATE share_purchase_request
        SET 
          requested_shares = $1,
          status = $2,
          processed_date = $3,
          processed_by = $4
        WHERE id = $5
      `;

      await dbClient.query(updatePurchaseRequestQuery, [
        pendingShares,
        purchaseStatus,
        request.approvedDate,
        userId,
        purchaseRequest.id
      ]);

      // If there are pending shares, create a new purchase request for them
      if (pendingShares > 0) {
        const newPurchaseRequestQuery = `
          INSERT INTO share_purchase_request(
            account_id, request_date, requested_shares, status,
            requested_date, requested_by, created_by
          )
          VALUES($1, $2, $3, $4, $5, $6, $7)
        `;

        await dbClient.query(newPurchaseRequestQuery, [
          accountId,
          request.approvedDate,
          request.approvedShares,
          SharePurchaseRequestStatus.APPROVED,
          request.approvedDate,
          userId,
          userId
        ]);
      }

      // Update product issued shares
      const updateProductQuery = `
        UPDATE share_product
        SET issued_shares = issued_shares + $1
        WHERE id = $2
      `;

      await dbClient.query(updateProductQuery, [
        request.approvedShares,
        account.product_id
      ]);

      await dbClient.query('COMMIT');
      
      return {
        accountId,
        approvedDate: request.approvedDate,
        approvedShares: request.approvedShares
      };
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error approving share account', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Reject a share account
   */
  async rejectAccount(accountId: string, request: ShareAccountRejectRequest, userId?: string): Promise<ShareAccountRejectResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if account exists and is in correct status
      const accountQuery = `
        SELECT id, status
        FROM share_account
        WHERE id = $1
      `;
      
      const accountResult = await dbClient.query(accountQuery, [accountId]);
      if (accountResult.rows.length === 0) {
        throw new Error(`Share account with id ${accountId} not found`);
      }
      
      const account = accountResult.rows[0];
      
      if (account.status !== ShareAccountStatus.SUBMITTED_AND_PENDING_APPROVAL) {
        throw new Error(`Share account with id ${accountId} is not in 'submitted and pending approval' status`);
      }

      // Update account status
      const updateAccountQuery = `
        UPDATE share_account
        SET 
          status = $1,
          rejected_date = $2,
          rejected_by = $3
        WHERE id = $4
      `;

      await dbClient.query(updateAccountQuery, [
        ShareAccountStatus.REJECTED,
        request.rejectedDate,
        userId,
        accountId
      ]);

      // Update all pending purchase requests to rejected
      const updatePurchaseRequestsQuery = `
        UPDATE share_purchase_request
        SET 
          status = $1,
          processed_date = $2,
          processed_by = $3
        WHERE account_id = $4 AND status = $5
      `;

      await dbClient.query(updatePurchaseRequestsQuery, [
        SharePurchaseRequestStatus.REJECTED,
        request.rejectedDate,
        userId,
        accountId,
        SharePurchaseRequestStatus.PENDING
      ]);

      await dbClient.query('COMMIT');
      
      return {
        accountId,
        rejectedDate: request.rejectedDate
      };
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error rejecting share account', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Activate a share account
   */
  async activateAccount(accountId: string, request: ShareAccountActivateRequest, userId?: string): Promise<ShareAccountActivateResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if account exists and is in correct status
      const accountQuery = `
        SELECT id, status
        FROM share_account
        WHERE id = $1
      `;
      
      const accountResult = await dbClient.query(accountQuery, [accountId]);
      if (accountResult.rows.length === 0) {
        throw new Error(`Share account with id ${accountId} not found`);
      }
      
      const account = accountResult.rows[0];
      
      if (account.status !== ShareAccountStatus.APPROVED) {
        throw new Error(`Share account with id ${accountId} is not in 'approved' status`);
      }

      // Update account status
      const updateAccountQuery = `
        UPDATE share_account
        SET 
          status = $1,
          activated_date = $2,
          activated_by = $3
        WHERE id = $4
      `;

      await dbClient.query(updateAccountQuery, [
        ShareAccountStatus.ACTIVE,
        request.activatedDate,
        userId,
        accountId
      ]);

      await dbClient.query('COMMIT');
      
      return {
        accountId,
        activatedDate: request.activatedDate
      };
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error activating share account', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Close a share account
   */
  async closeAccount(accountId: string, request: ShareAccountCloseRequest, userId?: string): Promise<ShareAccountCloseResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if account exists and is in correct status
      const accountQuery = `
        SELECT id, status, product_id, total_approved_shares
        FROM share_account
        WHERE id = $1
      `;
      
      const accountResult = await dbClient.query(accountQuery, [accountId]);
      if (accountResult.rows.length === 0) {
        throw new Error(`Share account with id ${accountId} not found`);
      }
      
      const account = accountResult.rows[0];
      
      if (account.status !== ShareAccountStatus.ACTIVE) {
        throw new Error(`Share account with id ${accountId} is not in 'active' status`);
      }

      // Update account status
      const updateAccountQuery = `
        UPDATE share_account
        SET 
          status = $1,
          closed_date = $2,
          closed_by = $3
        WHERE id = $4
      `;

      await dbClient.query(updateAccountQuery, [
        ShareAccountStatus.CLOSED,
        request.closedDate,
        userId,
        accountId
      ]);

      // Update product issued shares
      const updateProductQuery = `
        UPDATE share_product
        SET issued_shares = issued_shares - $1
        WHERE id = $2
      `;

      await dbClient.query(updateProductQuery, [
        account.total_approved_shares,
        account.product_id
      ]);

      await dbClient.query('COMMIT');
      
      return {
        accountId,
        closedDate: request.closedDate
      };
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error closing share account', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Submit a share purchase request
   */
  async submitPurchaseRequest(accountId: string, request: SharePurchaseSubmitRequest, userId?: string): Promise<SharePurchaseSubmitResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if account exists and is in correct status
      const accountQuery = `
        SELECT id, status, product_id, total_approved_shares, total_pending_shares
        FROM share_account
        WHERE id = $1
      `;
      
      const accountResult = await dbClient.query(accountQuery, [accountId]);
      if (accountResult.rows.length === 0) {
        throw new Error(`Share account with id ${accountId} not found`);
      }
      
      const account = accountResult.rows[0];
      
      if (account.status !== ShareAccountStatus.ACTIVE && account.status !== ShareAccountStatus.APPROVED) {
        throw new Error(`Share account is not in 'active' or 'approved' status`);
      }

      // Create purchase request
      const purchaseRequestQuery = `
        INSERT INTO share_purchase_request(
          account_id, request_date, requested_shares, status,
          requested_date, requested_by, created_by
        )
        VALUES($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      const purchaseRequestResult = await dbClient.query(purchaseRequestQuery, [
        accountId,
        request.requestedDate,
        request.requestedShares,
        SharePurchaseRequestStatus.PENDING,
        request.requestedDate,
        userId,
        userId
      ]);

      const purchaseRequestId = purchaseRequestResult.rows[0].id;

      // Update account pending shares
      const updateAccountQuery = `
        UPDATE share_account
        SET total_pending_shares = total_pending_shares + $1
        WHERE id = $2
      `;

      await dbClient.query(updateAccountQuery, [
        request.requestedShares,
        accountId
      ]);

      await dbClient.query('COMMIT');
      
      return {
        accountId,
        purchaseRequestId,
        requestedDate: request.requestedDate,
        requestedShares: request.requestedShares
      };
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error submitting share purchase request', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Approve a share purchase request
   */
  async approvePurchaseRequest(accountId: string, request: SharePurchaseApprovalRequest, userId?: string): Promise<SharePurchaseApprovalResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if account exists and purchase request is valid
      const accountQuery = `
        SELECT sa.id AS account_id, sa.status, sa.product_id, sa.total_approved_shares, sa.total_pending_shares,
               spr.id AS purchase_request_id, spr.requested_shares, spr.status AS purchase_status
        FROM share_account sa
        JOIN share_purchase_request spr ON spr.account_id = sa.id
        WHERE sa.id = $1 AND spr.id = $2
      `;
      
      const accountResult = await dbClient.query(accountQuery, [accountId, request.purchaseRequestId]);
      if (accountResult.rows.length === 0) {
        throw new Error(`Share account or purchase request not found`);
      }
      
      const data = accountResult.rows[0];
      
      if (data.purchase_status !== SharePurchaseRequestStatus.PENDING) {
        throw new Error(`Purchase request is not in 'pending' status`);
      }

      if (request.approvedShares > data.requested_shares) {
        throw new Error(`Approved shares (${request.approvedShares}) cannot exceed requested shares (${data.requested_shares})`);
      }

      // Get product details for share price
      const productQuery = `
        SELECT id, nominal_price
        FROM share_product
        WHERE id = $1
      `;
      
      const productResult = await dbClient.query(productQuery, [data.product_id]);
      if (productResult.rows.length === 0) {
        throw new Error(`Share product not found`);
      }
      
      const product = productResult.rows[0];

      // Create purchase transaction
      const transactionQuery = `
        INSERT INTO share_account_transaction(
          account_id, purchase_request_id, transaction_date, transaction_type,
          shares_quantity, unit_price, total_amount, charged_amount, is_reversed, created_by
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;

      const totalAmount = request.approvedShares * product.nominal_price;
      
      const transactionResult = await dbClient.query(transactionQuery, [
        accountId,
        request.purchaseRequestId,
        request.processedDate,
        ShareTransactionType.PURCHASE,
        request.approvedShares,
        product.nominal_price,
        totalAmount,
        0,
        false,
        userId
      ]);

      const transactionId = transactionResult.rows[0].id;

      // Update purchase request
      const pendingShares = data.requested_shares - request.approvedShares;
      const purchaseStatus = pendingShares > 0 ? SharePurchaseRequestStatus.PENDING : SharePurchaseRequestStatus.APPROVED;
      
      const updatePurchaseRequestQuery = `
        UPDATE share_purchase_request
        SET 
          requested_shares = $1,
          status = $2,
          processed_date = $3,
          processed_by = $4
        WHERE id = $5
      `;

      await dbClient.query(updatePurchaseRequestQuery, [
        pendingShares,
        purchaseStatus,
        request.processedDate,
        userId,
        request.purchaseRequestId
      ]);

      // If there are pending shares, create a new purchase request for them
      if (pendingShares > 0) {
        const newPurchaseRequestQuery = `
          INSERT INTO share_purchase_request(
            account_id, request_date, requested_shares, status,
            requested_date, requested_by, created_by
          )
          VALUES($1, $2, $3, $4, $5, $6, $7)
        `;

        await dbClient.query(newPurchaseRequestQuery, [
          accountId,
          request.processedDate,
          request.approvedShares,
          SharePurchaseRequestStatus.APPROVED,
          request.processedDate,
          userId,
          userId
        ]);
      }

      // Update account shares
      const updateAccountQuery = `
        UPDATE share_account
        SET 
          total_approved_shares = total_approved_shares + $1,
          total_pending_shares = total_pending_shares - $1
        WHERE id = $2
      `;

      await dbClient.query(updateAccountQuery, [
        request.approvedShares,
        accountId
      ]);

      // Update product issued shares
      const updateProductQuery = `
        UPDATE share_product
        SET issued_shares = issued_shares + $1
        WHERE id = $2
      `;

      await dbClient.query(updateProductQuery, [
        request.approvedShares,
        data.product_id
      ]);

      await dbClient.query('COMMIT');
      
      return {
        accountId,
        purchaseRequestId: request.purchaseRequestId,
        processedDate: request.processedDate,
        approvedShares: request.approvedShares,
        transactionId
      };
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error approving share purchase request', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Reject a share purchase request
   */
  async rejectPurchaseRequest(accountId: string, request: SharePurchaseRejectRequest, userId?: string): Promise<SharePurchaseRejectResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if account exists and purchase request is valid
      const accountQuery = `
        SELECT sa.id AS account_id, sa.status,
               spr.id AS purchase_request_id, spr.requested_shares, spr.status AS purchase_status
        FROM share_account sa
        JOIN share_purchase_request spr ON spr.account_id = sa.id
        WHERE sa.id = $1 AND spr.id = $2
      `;
      
      const accountResult = await dbClient.query(accountQuery, [accountId, request.purchaseRequestId]);
      if (accountResult.rows.length === 0) {
        throw new Error(`Share account or purchase request not found`);
      }
      
      const data = accountResult.rows[0];
      
      if (data.purchase_status !== SharePurchaseRequestStatus.PENDING) {
        throw new Error(`Purchase request is not in 'pending' status`);
      }

      // Update purchase request status
      const updatePurchaseRequestQuery = `
        UPDATE share_purchase_request
        SET 
          status = $1,
          processed_date = $2,
          processed_by = $3
        WHERE id = $4
      `;

      await dbClient.query(updatePurchaseRequestQuery, [
        SharePurchaseRequestStatus.REJECTED,
        request.processedDate,
        userId,
        request.purchaseRequestId
      ]);

      // Create reject transaction
      const transactionQuery = `
        INSERT INTO share_account_transaction(
          account_id, purchase_request_id, transaction_date, transaction_type,
          shares_quantity, unit_price, total_amount, charged_amount, is_reversed, created_by
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      await dbClient.query(transactionQuery, [
        accountId,
        request.purchaseRequestId,
        request.processedDate,
        ShareTransactionType.REJECT,
        data.requested_shares,
        0,
        0,
        0,
        false,
        userId
      ]);

      // Update account pending shares
      const updateAccountQuery = `
        UPDATE share_account
        SET total_pending_shares = total_pending_shares - $1
        WHERE id = $2
      `;

      await dbClient.query(updateAccountQuery, [
        data.requested_shares,
        accountId
      ]);

      await dbClient.query('COMMIT');
      
      return {
        accountId,
        purchaseRequestId: request.purchaseRequestId,
        processedDate: request.processedDate
      };
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error rejecting share purchase request', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Redeem shares
   */
  async redeemShares(accountId: string, request: ShareRedeemRequest, userId?: string): Promise<ShareRedeemResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if account exists and has enough shares
      const accountQuery = `
        SELECT sa.id, sa.status, sa.product_id, sa.total_approved_shares,
               sp.nominal_price
        FROM share_account sa
        JOIN share_product sp ON sp.id = sa.product_id
        WHERE sa.id = $1
      `;
      
      const accountResult = await dbClient.query(accountQuery, [accountId]);
      if (accountResult.rows.length === 0) {
        throw new Error(`Share account with id ${accountId} not found`);
      }
      
      const account = accountResult.rows[0];
      
      if (account.status !== ShareAccountStatus.ACTIVE) {
        throw new Error(`Share account with id ${accountId} is not in 'active' status`);
      }

      if (request.sharesQuantity > account.total_approved_shares) {
        throw new Error(`Cannot redeem more shares (${request.sharesQuantity}) than available (${account.total_approved_shares})`);
      }

      // Create redeem transaction
      const transactionQuery = `
        INSERT INTO share_account_transaction(
          account_id, transaction_date, transaction_type,
          shares_quantity, unit_price, total_amount, charged_amount, is_reversed, created_by
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;

      const totalAmount = request.sharesQuantity * account.nominal_price;
      
      const transactionResult = await dbClient.query(transactionQuery, [
        accountId,
        request.transactionDate,
        ShareTransactionType.REDEEM,
        request.sharesQuantity,
        account.nominal_price,
        totalAmount,
        0,
        false,
        userId
      ]);

      const transactionId = transactionResult.rows[0].id;

      // Update account approved shares
      const updateAccountQuery = `
        UPDATE share_account
        SET total_approved_shares = total_approved_shares - $1
        WHERE id = $2
      `;

      await dbClient.query(updateAccountQuery, [
        request.sharesQuantity,
        accountId
      ]);

      // Update product issued shares
      const updateProductQuery = `
        UPDATE share_product
        SET issued_shares = issued_shares - $1
        WHERE id = $2
      `;

      await dbClient.query(updateProductQuery, [
        request.sharesQuantity,
        account.product_id
      ]);

      await dbClient.query('COMMIT');
      
      return {
        accountId,
        transactionId,
        transactionDate: request.transactionDate,
        sharesQuantity: request.sharesQuantity,
        totalAmount
      };
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error redeeming shares', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Declare dividends for a share product
   */
  async declareProductDividend(productId: string, request: ShareProductDividendDeclareRequest, userId?: string): Promise<ShareProductDividendDeclareResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if product exists
      const productQuery = `
        SELECT id, name
        FROM share_product
        WHERE id = $1
      `;
      
      const productResult = await dbClient.query(productQuery, [productId]);
      if (productResult.rows.length === 0) {
        throw new Error(`Share product with id ${productId} not found`);
      }

      // Create product dividend
      const dividendQuery = `
        INSERT INTO share_product_dividend(
          product_id, dividend_period_start_date, dividend_period_end_date,
          dividend_amount, status, created_by
        )
        VALUES($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      const dividendResult = await dbClient.query(dividendQuery, [
        productId,
        request.dividendPeriodStartDate,
        request.dividendPeriodEndDate,
        request.dividendAmount,
        'active',
        userId
      ]);

      const dividendId = dividendResult.rows[0].id;

      // Find all active accounts for this product
      const accountsQuery = `
        SELECT id, total_approved_shares
        FROM share_account
        WHERE product_id = $1 AND status = $2
      `;

      const accountsResult = await dbClient.query(accountsQuery, [
        productId,
        ShareAccountStatus.ACTIVE
      ]);

      // Create dividend records for all active accounts
      if (accountsResult.rows.length > 0) {
        const accountDividendQuery = `
          INSERT INTO share_account_dividend(
            account_id, dividend_pay_out_id, amount, status, created_by
          )
          VALUES($1, $2, $3, $4, $5)
        `;

        for (const account of accountsResult.rows) {
          // Calculate dividend amount based on shares
          const sharePercentage = account.total_approved_shares / request.dividendAmount;
          const dividendAmount = sharePercentage * request.dividendAmount;
          
          await dbClient.query(accountDividendQuery, [
            account.id,
            dividendId,
            dividendAmount,
            ShareDividendStatus.PENDING,
            userId
          ]);
        }
      }

      await dbClient.query('COMMIT');
      
      return {
        productId,
        dividendId,
        dividendPeriodStartDate: request.dividendPeriodStartDate,
        dividendPeriodEndDate: request.dividendPeriodEndDate,
        dividendAmount: request.dividendAmount
      };
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error declaring product dividend', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Process dividend payment for a share account
   */
  async processDividend(accountId: string, request: ShareAccountDividendProcessRequest, userId?: string): Promise<ShareAccountDividendProcessResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if account dividend exists
      const dividendQuery = `
        SELECT sad.id, sad.account_id, sad.dividend_pay_out_id, sad.amount, sad.status,
               sa.client_id, sa.group_id
        FROM share_account_dividend sad
        JOIN share_account sa ON sa.id = sad.account_id
        WHERE sad.account_id = $1 AND sad.dividend_pay_out_id = $2
      `;
      
      const dividendResult = await dbClient.query(dividendQuery, [accountId, request.dividendPayOutId]);
      if (dividendResult.rows.length === 0) {
        throw new Error(`Share account dividend not found`);
      }
      
      const dividend = dividendResult.rows[0];
      
      if (dividend.status !== ShareDividendStatus.PENDING) {
        throw new Error(`Dividend is not in 'pending' status`);
      }

      let savingsTransactionId = null;

      // If savings account is provided, create a transaction
      if (request.savingsAccountId) {
        // Create savings account transaction (deposit)
        const savingsTransactionQuery = `
          INSERT INTO savings_account_transaction(
            savings_account_id, transaction_type, amount, running_balance,
            transaction_date, created_by
          )
          VALUES($1, $2, $3, (
            SELECT COALESCE(MAX(running_balance), 0) + $3
            FROM savings_account_transaction
            WHERE savings_account_id = $1
          ), CURRENT_DATE, $4)
          RETURNING id
        `;

        const savingsResult = await dbClient.query(savingsTransactionQuery, [
          request.savingsAccountId,
          'deposit',
          dividend.amount,
          userId
        ]);

        savingsTransactionId = savingsResult.rows[0].id;
      }

      // Create share transaction for dividend
      const transactionQuery = `
        INSERT INTO share_account_transaction(
          account_id, transaction_date, transaction_type,
          shares_quantity, unit_price, total_amount, charged_amount, is_reversed, created_by
        )
        VALUES($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8)
      `;

      await dbClient.query(transactionQuery, [
        accountId,
        ShareTransactionType.DIVIDEND_PAYMENT,
        0,
        0,
        dividend.amount,
        0,
        false,
        userId
      ]);

      // Update dividend status and link to savings transaction if applicable
      const updateDividendQuery = `
        UPDATE share_account_dividend
        SET 
          status = $1,
          processed_date = CURRENT_DATE,
          savings_transaction_id = $2
        WHERE id = $3
      `;

      await dbClient.query(updateDividendQuery, [
        ShareDividendStatus.PROCESSED,
        savingsTransactionId,
        dividend.id
      ]);

      // Mark account as dividend posted
      const updateAccountQuery = `
        UPDATE share_account
        SET is_dividend_posted = true
        WHERE id = $1
      `;

      await dbClient.query(updateAccountQuery, [accountId]);

      await dbClient.query('COMMIT');
      
      return {
        accountId,
        dividendId: request.dividendPayOutId,
        processedDate: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        amount: dividend.amount,
        savingsTransactionId
      };
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error processing dividend', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Get template data for creating share accounts
   */
  async getTemplate(clientId?: string, productId?: string): Promise<ShareTemplateResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      // Get product options
      const productsQuery = `
        SELECT 
          id, name, short_name AS "shortName", total_shares AS "totalShares",
          total_shares_to_be_issued AS "totalSharesToBeIssued", nominal_price AS "nominalPrice",
          market_price AS "marketPrice", currency_code AS "currencyCode",
          currency_digits AS "currencyDigits"
        FROM share_product
        WHERE is_active = true
      `;

      const productsResult = await client.query(productsQuery);
      const productOptions = productsResult.rows.map(product => ({
        ...product,
        currency: {
          code: product.currencyCode,
          name: product.currencyCode,
          decimalPlaces: product.currencyDigits,
          displaySymbol: product.currencyCode,
          nameCode: product.currencyCode,
          displayLabel: product.currencyCode
        }
      }));

      // Get charge options
      const chargesQuery = `
        SELECT 
          id, name, is_active AS "active", charge_time_enum AS "chargeTimeType",
          charge_calculation_enum AS "chargeCalculationType", currency_code AS "currencyCode",
          amount
        FROM charge
        WHERE is_active = true AND charge_applies_to_enum = 'share'
      `;

      const chargesResult = await client.query(chargesQuery);
      const chargeOptions = chargesResult.rows;

      // Get savings accounts for linking if client is provided
      let savingsAccountOptions = [];
      if (clientId) {
        const savingsQuery = `
          SELECT 
            id, account_no AS "accountNo", product_name AS "productName", status
          FROM savings_account
          WHERE client_id = $1 AND status = 'active'
        `;

        const savingsResult = await client.query(savingsQuery, [clientId]);
        savingsAccountOptions = savingsResult.rows;
      }

      // Get specific product details if requested
      let selectedProduct = null;
      if (productId) {
        const productQuery = `
          SELECT 
            id, name, short_name AS "shortName", total_shares AS "totalShares",
            total_shares_to_be_issued AS "totalSharesToBeIssued", nominal_price AS "nominalPrice",
            market_price AS "marketPrice", currency_code AS "currencyCode",
            currency_digits AS "currencyDigits",
            minimum_shares AS "minimumShares", maximum_shares AS "maximumShares"
          FROM share_product
          WHERE id = $1
        `;

        const productResult = await client.query(productQuery, [productId]);
        if (productResult.rows.length > 0) {
          selectedProduct = productResult.rows[0];
        }
      }

      return {
        productOptions,
        chargeOptions,
        savingsAccountOptions,
        selectedProduct
      };
    } catch (error) {
      logger.error('Error fetching share template', { error });
      throw error;
    }
  }

  /**
   * Generate a unique account number
   */
  private async generateAccountNumber(dbClient: Pool | PoolClient): Promise<string> {
    const prefix = 'SHA';
    
    const query = `
      SELECT COUNT(*) as count 
      FROM share_account
    `;
    
    const result = await dbClient.query(query);
    const count = parseInt(result.rows[0].count) + 1;
    
    const accountNumber = `${prefix}${count.toString().padStart(8, '0')}`;
    return accountNumber;
  }
}

// Instantiate and export
export const shareService = new ShareService();