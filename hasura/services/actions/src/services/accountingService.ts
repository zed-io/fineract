/**
 * Accounting Service
 * 
 * Provides comprehensive accounting functionality including:
 * - GL Account management
 * - GL Closure management
 * - Accounting Rule management
 * - Payment Type management
 * - Financial Statement generation
 */

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase } from '../utils/db';
import { logger } from '../utils/logger';
import {
  AccountType,
  AccountUsage,
  GLAccount,
  GLAccountRequest,
  GLAccountResponse,
  GLAccountsResponse,
  GLClosure,
  GLClosureCreateRequest,
  GLClosureResponse,
  GLClosuresResponse,
  AccountingRule,
  AccountingRuleRequest,
  AccountingRuleResponse,
  AccountingRulesResponse,
  PaymentType,
  PaymentTypeRequest,
  PaymentTypeResponse,
  PaymentTypesResponse,
  AccountTypeDefinition,
  FinancialActivity,
  FinancialActivityAccountMappingRequest,
  FinancialActivitiesResponse,
  BalanceSheetRequest,
  BalanceSheetResponse,
  IncomeStatementRequest,
  IncomeStatementResponse,
  TrialBalanceRequest,
  TrialBalanceResponse,
  GeneralLedgerReportRequest,
  GeneralLedgerReportResponse,
  AccountingTemplateResponse
} from '../models/accounting';

/**
 * Accounting Service class
 */
export class AccountingService {
  
  /**
   * Create a new GL account
   */
  async createGLAccount(request: GLAccountRequest, userId?: string): Promise<string> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if GL code is unique
      const existingAccount = await dbClient.query(
        `SELECT id FROM fineract_default.gl_account WHERE gl_code = $1`,
        [request.glCode]
      );

      if (existingAccount.rows.length > 0) {
        throw new Error(`GL account with code ${request.glCode} already exists`);
      }

      // Check if parent account exists
      if (request.parentId) {
        const parentAccount = await dbClient.query(
          `SELECT id, hierarchy FROM fineract_default.gl_account WHERE id = $1`,
          [request.parentId]
        );

        if (parentAccount.rows.length === 0) {
          throw new Error(`Parent GL account with ID ${request.parentId} not found`);
        }
      }

      // Insert GL account
      const glAccountQuery = `
        INSERT INTO fineract_default.gl_account(
          name, parent_id, gl_code, disabled, manual_entries_allowed,
          account_type, account_usage, description, tag_id, created_by
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `;

      const createResult = await dbClient.query(glAccountQuery, [
        request.name,
        request.parentId,
        request.glCode,
        request.disabled !== undefined ? request.disabled : false,
        request.manualEntriesAllowed !== undefined ? request.manualEntriesAllowed : true,
        request.accountType,
        request.accountUsage,
        request.description,
        request.tagId,
        userId
      ]);

      const accountId = createResult.rows[0].id;

      // Update hierarchy
      if (request.parentId) {
        const parentQuery = await dbClient.query(
          `SELECT hierarchy FROM fineract_default.gl_account WHERE id = $1`,
          [request.parentId]
        );
        
        const parentHierarchy = parentQuery.rows[0].hierarchy;
        const hierarchy = `${parentHierarchy}.${accountId}`;
        
        await dbClient.query(
          `UPDATE fineract_default.gl_account SET hierarchy = $1 WHERE id = $2`,
          [hierarchy, accountId]
        );
      } else {
        // Root account
        const hierarchy = `.${accountId}`;
        
        await dbClient.query(
          `UPDATE fineract_default.gl_account SET hierarchy = $1 WHERE id = $2`,
          [hierarchy, accountId]
        );
      }

      await dbClient.query('COMMIT');
      return accountId;
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error creating GL account', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Update an existing GL account
   */
  async updateGLAccount(accountId: string, request: Partial<GLAccountRequest>, userId?: string): Promise<GLAccountResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if account exists
      const existingAccount = await dbClient.query(
        `SELECT id FROM fineract_default.gl_account WHERE id = $1`,
        [accountId]
      );

      if (existingAccount.rows.length === 0) {
        throw new Error(`GL account with ID ${accountId} not found`);
      }

      // Check if GL code is unique if it's being changed
      if (request.glCode) {
        const codeCheck = await dbClient.query(
          `SELECT id FROM fineract_default.gl_account WHERE gl_code = $1 AND id != $2`,
          [request.glCode, accountId]
        );

        if (codeCheck.rows.length > 0) {
          throw new Error(`GL account with code ${request.glCode} already exists`);
        }
      }

      // Check if parent account exists if it's being changed
      let updateHierarchy = false;
      let parentHierarchy = '';
      
      if (request.parentId) {
        const parentAccount = await dbClient.query(
          `SELECT id, hierarchy FROM fineract_default.gl_account WHERE id = $1`,
          [request.parentId]
        );

        if (parentAccount.rows.length === 0) {
          throw new Error(`Parent GL account with ID ${request.parentId} not found`);
        }
        
        // Check for circular references
        if (parentAccount.rows[0].hierarchy && 
            parentAccount.rows[0].hierarchy.includes(`.${accountId}.`)) {
          throw new Error(`Cannot set parent to ${request.parentId} as it would create a circular reference`);
        }
        
        updateHierarchy = true;
        parentHierarchy = parentAccount.rows[0].hierarchy;
      }

      // Build update query
      const updateFields = [];
      const updateValues = [];
      let paramCounter = 1;

      if (request.name !== undefined) {
        updateFields.push(`name = $${paramCounter++}`);
        updateValues.push(request.name);
      }

      if (request.parentId !== undefined) {
        updateFields.push(`parent_id = $${paramCounter++}`);
        updateValues.push(request.parentId);
      }

      if (request.glCode !== undefined) {
        updateFields.push(`gl_code = $${paramCounter++}`);
        updateValues.push(request.glCode);
      }

      if (request.disabled !== undefined) {
        updateFields.push(`disabled = $${paramCounter++}`);
        updateValues.push(request.disabled);
      }

      if (request.manualEntriesAllowed !== undefined) {
        updateFields.push(`manual_entries_allowed = $${paramCounter++}`);
        updateValues.push(request.manualEntriesAllowed);
      }

      if (request.description !== undefined) {
        updateFields.push(`description = $${paramCounter++}`);
        updateValues.push(request.description);
      }

      if (request.tagId !== undefined) {
        updateFields.push(`tag_id = $${paramCounter++}`);
        updateValues.push(request.tagId);
      }

      // Add last modified info
      updateFields.push(`last_modified_date = CURRENT_TIMESTAMP`);
      updateFields.push(`last_modified_by = $${paramCounter++}`);
      updateValues.push(userId);

      // Add account ID to parameters
      updateValues.push(accountId);

      // Update account
      if (updateFields.length > 0) {
        const updateQuery = `
          UPDATE fineract_default.gl_account
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCounter}
        `;

        await dbClient.query(updateQuery, updateValues);
      }

      // Update hierarchy if needed
      if (updateHierarchy) {
        // Get all child accounts recursively
        const allChildrenQuery = `
          WITH RECURSIVE children AS (
            SELECT id, hierarchy FROM fineract_default.gl_account WHERE id = $1
            UNION ALL
            SELECT a.id, a.hierarchy 
            FROM fineract_default.gl_account a
            JOIN children c ON a.parent_id = c.id
          )
          SELECT id, hierarchy FROM children
        `;
        
        const childrenResult = await dbClient.query(allChildrenQuery, [accountId]);
        const childAccounts = childrenResult.rows;
        
        // Update the main account hierarchy
        const newHierarchy = `${parentHierarchy}.${accountId}`;
        await dbClient.query(
          `UPDATE fineract_default.gl_account SET hierarchy = $1 WHERE id = $2`,
          [newHierarchy, accountId]
        );
        
        // Get the old hierarchy prefix to replace in children
        const oldHierarchyQuery = await dbClient.query(
          `SELECT hierarchy FROM fineract_default.gl_account WHERE id = $1`,
          [accountId]
        );
        
        const oldHierarchyPrefix = oldHierarchyQuery.rows[0].hierarchy;
        
        // Update all child account hierarchies
        for (const child of childAccounts) {
          if (child.id !== accountId) {
            const newChildHierarchy = child.hierarchy.replace(
              oldHierarchyPrefix, 
              newHierarchy
            );
            
            await dbClient.query(
              `UPDATE fineract_default.gl_account SET hierarchy = $1 WHERE id = $2`,
              [newChildHierarchy, child.id]
            );
          }
        }
      }

      // Get updated account data
      const updatedAccount = await dbClient.query(
        `SELECT 
          id, name, parent_id AS "parentId", hierarchy, gl_code AS "glCode",
          disabled, manual_entries_allowed AS "manualEntriesAllowed",
          account_type AS "accountType", account_usage AS "accountUsage",
          description, tag_id AS "tagId"
        FROM fineract_default.gl_account
        WHERE id = $1`,
        [accountId]
      );

      await dbClient.query('COMMIT');
      return updatedAccount.rows[0];
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error updating GL account', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Delete a GL account
   */
  async deleteGLAccount(accountId: string): Promise<boolean> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if account exists
      const existingAccount = await dbClient.query(
        `SELECT id FROM fineract_default.gl_account WHERE id = $1`,
        [accountId]
      );

      if (existingAccount.rows.length === 0) {
        throw new Error(`GL account with ID ${accountId} not found`);
      }

      // Check if account has child accounts
      const childrenCheck = await dbClient.query(
        `SELECT id FROM fineract_default.gl_account WHERE parent_id = $1 LIMIT 1`,
        [accountId]
      );

      if (childrenCheck.rows.length > 0) {
        throw new Error(`Cannot delete GL account because it has child accounts`);
      }

      // Check if account is used in journal entries
      const journalCheck = await dbClient.query(
        `SELECT id FROM fineract_default.gl_journal_entry WHERE account_id = $1 LIMIT 1`,
        [accountId]
      );

      if (journalCheck.rows.length > 0) {
        throw new Error(`Cannot delete GL account because it has journal entries`);
      }

      // Check if account is mapped to any product
      const mappingCheck = await dbClient.query(
        `SELECT id FROM fineract_default.product_account_mapping WHERE gl_account_id = $1 LIMIT 1`,
        [accountId]
      );

      if (mappingCheck.rows.length > 0) {
        throw new Error(`Cannot delete GL account because it is mapped to one or more products`);
      }

      // Check if account is used in any accounting rule
      const ruleCheck = await dbClient.query(
        `SELECT id FROM fineract_default.accounting_rule 
         WHERE debit_account_id = $1 OR credit_account_id = $1 LIMIT 1`,
        [accountId]
      );

      if (ruleCheck.rows.length > 0) {
        throw new Error(`Cannot delete GL account because it is used in one or more accounting rules`);
      }

      // Delete the account
      await dbClient.query(
        `DELETE FROM fineract_default.gl_account WHERE id = $1`,
        [accountId]
      );

      await dbClient.query('COMMIT');
      return true;
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error deleting GL account', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Get a GL account by ID
   */
  async getGLAccount(accountId: string): Promise<GLAccountResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      const query = `
        SELECT 
          id, name, parent_id AS "parentId", hierarchy, gl_code AS "glCode",
          disabled, manual_entries_allowed AS "manualEntriesAllowed",
          account_type AS "accountType", account_usage AS "accountUsage",
          description, tag_id AS "tagId"
        FROM fineract_default.gl_account
        WHERE id = $1
      `;

      const result = await client.query(query, [accountId]);

      if (result.rows.length === 0) {
        throw new Error(`GL account with ID ${accountId} not found`);
      }

      const account = result.rows[0];

      // Get child accounts if this is a header account
      if (account.accountUsage === AccountUsage.HEADER) {
        const childrenQuery = `
          SELECT 
            id, name, parent_id AS "parentId", hierarchy, gl_code AS "glCode",
            disabled, manual_entries_allowed AS "manualEntriesAllowed",
            account_type AS "accountType", account_usage AS "accountUsage",
            description, tag_id AS "tagId"
          FROM fineract_default.gl_account
          WHERE parent_id = $1
          ORDER BY gl_code
        `;

        const childrenResult = await client.query(childrenQuery, [accountId]);
        account.children = childrenResult.rows;
      }

      return account;
    } catch (error) {
      logger.error('Error getting GL account', { error });
      throw error;
    }
  }

  /**
   * Get all GL accounts, optionally filtered
   */
  async getGLAccounts(type?: AccountType, usage?: AccountUsage, disabled?: boolean, manualEntriesAllowed?: boolean): Promise<GLAccountsResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      // Build query filters
      const conditions = [];
      const queryParams = [];
      let paramCounter = 1;

      if (type) {
        conditions.push(`account_type = $${paramCounter++}`);
        queryParams.push(type);
      }

      if (usage) {
        conditions.push(`account_usage = $${paramCounter++}`);
        queryParams.push(usage);
      }

      if (disabled !== undefined) {
        conditions.push(`disabled = $${paramCounter++}`);
        queryParams.push(disabled);
      }

      if (manualEntriesAllowed !== undefined) {
        conditions.push(`manual_entries_allowed = $${paramCounter++}`);
        queryParams.push(manualEntriesAllowed);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      const query = `
        SELECT 
          id, name, parent_id AS "parentId", hierarchy, gl_code AS "glCode",
          disabled, manual_entries_allowed AS "manualEntriesAllowed",
          account_type AS "accountType", account_usage AS "accountUsage",
          description, tag_id AS "tagId"
        FROM fineract_default.gl_account
        ${whereClause}
        ORDER BY CASE
          WHEN account_type = 'asset' THEN 1
          WHEN account_type = 'liability' THEN 2
          WHEN account_type = 'equity' THEN 3
          WHEN account_type = 'income' THEN 4
          WHEN account_type = 'expense' THEN 5
        END, gl_code
      `;

      const result = await client.query(query, queryParams);
      
      // Organize accounts in a hierarchical structure
      const accountsMap = new Map<string, GLAccount>();
      const rootAccounts: GLAccount[] = [];

      // First pass - create a map of all accounts
      for (const row of result.rows) {
        accountsMap.set(row.id, { ...row, children: [] });
      }

      // Second pass - build hierarchy
      for (const row of result.rows) {
        const account = accountsMap.get(row.id);
        
        if (row.parentId && accountsMap.has(row.parentId)) {
          const parent = accountsMap.get(row.parentId);
          parent.children.push(account);
        } else {
          rootAccounts.push(account);
        }
      }
      
      return { glAccounts: rootAccounts };
    } catch (error) {
      logger.error('Error getting GL accounts', { error });
      throw error;
    }
  }

  /**
   * Get GL account tree
   */
  async getGLAccountsTree(type?: AccountType): Promise<GLAccount[]> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      // Get all accounts of the specified type
      const typeCondition = type ? `WHERE account_type = $1` : '';
      const params = type ? [type] : [];

      const query = `
        SELECT 
          id, name, parent_id AS "parentId", hierarchy, gl_code AS "glCode",
          disabled, manual_entries_allowed AS "manualEntriesAllowed",
          account_type AS "accountType", account_usage AS "accountUsage",
          description, tag_id AS "tagId"
        FROM fineract_default.gl_account
        ${typeCondition}
        ORDER BY hierarchy
      `;

      const result = await client.query(query, params);
      
      // Build account tree
      const accountsMap = new Map<string, GLAccount>();
      const rootAccounts: GLAccount[] = [];

      // First pass - create a map of all accounts
      for (const row of result.rows) {
        accountsMap.set(row.id, { ...row, children: [] });
      }

      // Second pass - build hierarchy
      for (const row of result.rows) {
        const account = accountsMap.get(row.id);
        
        if (row.parentId && accountsMap.has(row.parentId)) {
          const parent = accountsMap.get(row.parentId);
          parent.children.push(account);
        } else {
          rootAccounts.push(account);
        }
      }
      
      return rootAccounts;
    } catch (error) {
      logger.error('Error getting GL account tree', { error });
      throw error;
    }
  }

  /**
   * Create a GL closure
   */
  async createGLClosure(request: GLClosureCreateRequest, userId?: string): Promise<string> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if office exists
      const officeCheck = await dbClient.query(
        `SELECT id FROM fineract_default.office WHERE id = $1`,
        [request.officeId]
      );

      if (officeCheck.rows.length === 0) {
        throw new Error(`Office with ID ${request.officeId} not found`);
      }

      // Check if a closure already exists for this office and date
      const existingClosure = await dbClient.query(
        `SELECT id FROM fineract_default.gl_closure
         WHERE office_id = $1 AND closing_date = $2 AND is_deleted = false`,
        [request.officeId, request.closingDate]
      );

      if (existingClosure.rows.length > 0) {
        throw new Error(`A GL closure already exists for this office and closing date`);
      }

      // Check if there are any closures with future dates for this office
      const futureClosure = await dbClient.query(
        `SELECT closing_date FROM fineract_default.gl_closure
         WHERE office_id = $1 AND closing_date > $2 AND is_deleted = false
         ORDER BY closing_date ASC LIMIT 1`,
        [request.officeId, request.closingDate]
      );

      if (futureClosure.rows.length > 0) {
        throw new Error(`Cannot create a closure before an existing future closure date (${futureClosure.rows[0].closing_date})`);
      }

      // Insert GL closure
      const closureId = uuidv4();
      
      const insertQuery = `
        INSERT INTO fineract_default.gl_closure(
          id, office_id, closing_date, is_deleted, comments, created_by
        )
        VALUES($1, $2, $3, false, $4, $5)
      `;

      await dbClient.query(insertQuery, [
        closureId,
        request.officeId,
        request.closingDate,
        request.comments,
        userId
      ]);

      await dbClient.query('COMMIT');
      return closureId;
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error creating GL closure', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Delete a GL closure
   */
  async deleteGLClosure(closureId: string): Promise<boolean> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if closure exists
      const existingClosure = await dbClient.query(
        `SELECT id FROM fineract_default.gl_closure WHERE id = $1 AND is_deleted = false`,
        [closureId]
      );

      if (existingClosure.rows.length === 0) {
        throw new Error(`GL closure with ID ${closureId} not found or already deleted`);
      }

      // Soft delete the closure
      await dbClient.query(
        `UPDATE fineract_default.gl_closure SET is_deleted = true WHERE id = $1`,
        [closureId]
      );

      await dbClient.query('COMMIT');
      return true;
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error deleting GL closure', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Get a GL closure by ID
   */
  async getGLClosure(closureId: string): Promise<GLClosureResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      const query = `
        SELECT 
          c.id, c.office_id AS "officeId", o.name AS "officeName",
          c.closing_date AS "closingDate", c.is_deleted AS "isDeleted",
          c.comments
        FROM fineract_default.gl_closure c
        JOIN fineract_default.office o ON c.office_id = o.id
        WHERE c.id = $1 AND c.is_deleted = false
      `;

      const result = await client.query(query, [closureId]);

      if (result.rows.length === 0) {
        throw new Error(`GL closure with ID ${closureId} not found or deleted`);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting GL closure', { error });
      throw error;
    }
  }

  /**
   * Get all GL closures, optionally filtered by office
   */
  async getGLClosures(officeId?: string): Promise<GLClosuresResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      const condition = officeId ? 'AND c.office_id = $1' : '';
      const params = officeId ? [officeId] : [];

      const query = `
        SELECT 
          c.id, c.office_id AS "officeId", o.name AS "officeName",
          c.closing_date AS "closingDate", c.is_deleted AS "isDeleted",
          c.comments
        FROM fineract_default.gl_closure c
        JOIN fineract_default.office o ON c.office_id = o.id
        WHERE c.is_deleted = false ${condition}
        ORDER BY c.closing_date DESC
      `;

      const result = await client.query(query, params);
      
      return { closures: result.rows };
    } catch (error) {
      logger.error('Error getting GL closures', { error });
      throw error;
    }
  }

  /**
   * Create a new accounting rule
   */
  async createAccountingRule(request: AccountingRuleRequest, userId?: string): Promise<string> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check for duplicate name
      const nameCheck = await dbClient.query(
        `SELECT id FROM fineract_default.accounting_rule WHERE name = $1`,
        [request.name]
      );

      if (nameCheck.rows.length > 0) {
        throw new Error(`Accounting rule with name '${request.name}' already exists`);
      }

      // Check if office exists if specified
      if (request.officeId) {
        const officeCheck = await dbClient.query(
          `SELECT id FROM fineract_default.office WHERE id = $1`,
          [request.officeId]
        );

        if (officeCheck.rows.length === 0) {
          throw new Error(`Office with ID ${request.officeId} not found`);
        }
      }

      // Check if debit account exists if specified
      if (request.debitAccountId) {
        const debitAccountCheck = await dbClient.query(
          `SELECT id, disabled FROM fineract_default.gl_account WHERE id = $1`,
          [request.debitAccountId]
        );

        if (debitAccountCheck.rows.length === 0) {
          throw new Error(`Debit GL account with ID ${request.debitAccountId} not found`);
        }

        if (debitAccountCheck.rows[0].disabled) {
          throw new Error(`Debit GL account with ID ${request.debitAccountId} is disabled`);
        }
      }

      // Check if credit account exists if specified
      if (request.creditAccountId) {
        const creditAccountCheck = await dbClient.query(
          `SELECT id, disabled FROM fineract_default.gl_account WHERE id = $1`,
          [request.creditAccountId]
        );

        if (creditAccountCheck.rows.length === 0) {
          throw new Error(`Credit GL account with ID ${request.creditAccountId} not found`);
        }

        if (creditAccountCheck.rows[0].disabled) {
          throw new Error(`Credit GL account with ID ${request.creditAccountId} is disabled`);
        }
      }

      // Validate that at least one of debit or credit account is specified
      if (!request.debitAccountId && !request.creditAccountId) {
        throw new Error(`At least one of debit or credit account must be specified`);
      }

      // Insert accounting rule
      const ruleId = uuidv4();
      
      const insertQuery = `
        INSERT INTO fineract_default.accounting_rule(
          id, name, office_id, debit_account_id, credit_account_id,
          description, system_defined, created_by
        )
        VALUES($1, $2, $3, $4, $5, $6, false, $7)
      `;

      await dbClient.query(insertQuery, [
        ruleId,
        request.name,
        request.officeId,
        request.debitAccountId,
        request.creditAccountId,
        request.description,
        userId
      ]);

      await dbClient.query('COMMIT');
      return ruleId;
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error creating accounting rule', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Update an accounting rule
   */
  async updateAccountingRule(ruleId: string, request: Partial<AccountingRuleRequest>, userId?: string): Promise<AccountingRuleResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if rule exists and is not system-defined
      const ruleCheck = await dbClient.query(
        `SELECT id, system_defined FROM fineract_default.accounting_rule WHERE id = $1`,
        [ruleId]
      );

      if (ruleCheck.rows.length === 0) {
        throw new Error(`Accounting rule with ID ${ruleId} not found`);
      }

      if (ruleCheck.rows[0].system_defined) {
        throw new Error(`Cannot update system-defined accounting rule`);
      }

      // Check for duplicate name if name is being changed
      if (request.name) {
        const nameCheck = await dbClient.query(
          `SELECT id FROM fineract_default.accounting_rule WHERE name = $1 AND id != $2`,
          [request.name, ruleId]
        );

        if (nameCheck.rows.length > 0) {
          throw new Error(`Accounting rule with name '${request.name}' already exists`);
        }
      }

      // Check if office exists if specified
      if (request.officeId) {
        const officeCheck = await dbClient.query(
          `SELECT id FROM fineract_default.office WHERE id = $1`,
          [request.officeId]
        );

        if (officeCheck.rows.length === 0) {
          throw new Error(`Office with ID ${request.officeId} not found`);
        }
      }

      // Check if debit account exists if specified
      if (request.debitAccountId) {
        const debitAccountCheck = await dbClient.query(
          `SELECT id, disabled FROM fineract_default.gl_account WHERE id = $1`,
          [request.debitAccountId]
        );

        if (debitAccountCheck.rows.length === 0) {
          throw new Error(`Debit GL account with ID ${request.debitAccountId} not found`);
        }

        if (debitAccountCheck.rows[0].disabled) {
          throw new Error(`Debit GL account with ID ${request.debitAccountId} is disabled`);
        }
      }

      // Check if credit account exists if specified
      if (request.creditAccountId) {
        const creditAccountCheck = await dbClient.query(
          `SELECT id, disabled FROM fineract_default.gl_account WHERE id = $1`,
          [request.creditAccountId]
        );

        if (creditAccountCheck.rows.length === 0) {
          throw new Error(`Credit GL account with ID ${request.creditAccountId} not found`);
        }

        if (creditAccountCheck.rows[0].disabled) {
          throw new Error(`Credit GL account with ID ${request.creditAccountId} is disabled`);
        }
      }

      // Build update query
      const updateFields = [];
      const updateValues = [];
      let paramCounter = 1;

      if (request.name) {
        updateFields.push(`name = $${paramCounter++}`);
        updateValues.push(request.name);
      }

      if (request.officeId !== undefined) {
        updateFields.push(`office_id = $${paramCounter++}`);
        updateValues.push(request.officeId);
      }

      if (request.debitAccountId !== undefined) {
        updateFields.push(`debit_account_id = $${paramCounter++}`);
        updateValues.push(request.debitAccountId);
      }

      if (request.creditAccountId !== undefined) {
        updateFields.push(`credit_account_id = $${paramCounter++}`);
        updateValues.push(request.creditAccountId);
      }

      if (request.description !== undefined) {
        updateFields.push(`description = $${paramCounter++}`);
        updateValues.push(request.description);
      }

      // Add last modified info
      updateFields.push(`last_modified_date = CURRENT_TIMESTAMP`);
      updateFields.push(`last_modified_by = $${paramCounter++}`);
      updateValues.push(userId);

      // Add rule ID to parameters
      updateValues.push(ruleId);

      // Update rule
      if (updateFields.length > 0) {
        const updateQuery = `
          UPDATE fineract_default.accounting_rule
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCounter}
        `;

        await dbClient.query(updateQuery, updateValues);
      }

      // Get updated rule
      const updatedRule = await dbClient.query(
        `SELECT 
          r.id, r.name, r.office_id AS "officeId", o.name AS "officeName",
          r.debit_account_id AS "debitAccountId", dga.name AS "debitAccountName",
          r.credit_account_id AS "creditAccountId", cga.name AS "creditAccountName",
          r.description, r.system_defined AS "systemDefined"
        FROM fineract_default.accounting_rule r
        LEFT JOIN fineract_default.office o ON r.office_id = o.id
        LEFT JOIN fineract_default.gl_account dga ON r.debit_account_id = dga.id
        LEFT JOIN fineract_default.gl_account cga ON r.credit_account_id = cga.id
        WHERE r.id = $1`,
        [ruleId]
      );

      await dbClient.query('COMMIT');
      return updatedRule.rows[0];
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error updating accounting rule', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Delete an accounting rule
   */
  async deleteAccountingRule(ruleId: string): Promise<boolean> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if rule exists and is not system-defined
      const ruleCheck = await dbClient.query(
        `SELECT id, system_defined FROM fineract_default.accounting_rule WHERE id = $1`,
        [ruleId]
      );

      if (ruleCheck.rows.length === 0) {
        throw new Error(`Accounting rule with ID ${ruleId} not found`);
      }

      if (ruleCheck.rows[0].system_defined) {
        throw new Error(`Cannot delete system-defined accounting rule`);
      }

      // Delete the rule
      await dbClient.query(
        `DELETE FROM fineract_default.accounting_rule WHERE id = $1`,
        [ruleId]
      );

      await dbClient.query('COMMIT');
      return true;
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error deleting accounting rule', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Get an accounting rule by ID
   */
  async getAccountingRule(ruleId: string): Promise<AccountingRuleResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      const query = `
        SELECT 
          r.id, r.name, r.office_id AS "officeId", o.name AS "officeName",
          r.debit_account_id AS "debitAccountId", dga.name AS "debitAccountName",
          r.credit_account_id AS "creditAccountId", cga.name AS "creditAccountName",
          r.description, r.system_defined AS "systemDefined"
        FROM fineract_default.accounting_rule r
        LEFT JOIN fineract_default.office o ON r.office_id = o.id
        LEFT JOIN fineract_default.gl_account dga ON r.debit_account_id = dga.id
        LEFT JOIN fineract_default.gl_account cga ON r.credit_account_id = cga.id
        WHERE r.id = $1
      `;

      const result = await client.query(query, [ruleId]);

      if (result.rows.length === 0) {
        throw new Error(`Accounting rule with ID ${ruleId} not found`);
      }

      // Add GL account details
      if (result.rows[0].debitAccountId) {
        const debitAccount = await this.getGLAccount(result.rows[0].debitAccountId);
        result.rows[0].debitAccount = debitAccount;
      }

      if (result.rows[0].creditAccountId) {
        const creditAccount = await this.getGLAccount(result.rows[0].creditAccountId);
        result.rows[0].creditAccount = creditAccount;
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting accounting rule', { error });
      throw error;
    }
  }

  /**
   * Get all accounting rules
   */
  async getAccountingRules(): Promise<AccountingRulesResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      const query = `
        SELECT 
          r.id, r.name, r.office_id AS "officeId", o.name AS "officeName",
          r.debit_account_id AS "debitAccountId", dga.name AS "debitAccountName",
          r.credit_account_id AS "creditAccountId", cga.name AS "creditAccountName",
          r.description, r.system_defined AS "systemDefined"
        FROM fineract_default.accounting_rule r
        LEFT JOIN fineract_default.office o ON r.office_id = o.id
        LEFT JOIN fineract_default.gl_account dga ON r.debit_account_id = dga.id
        LEFT JOIN fineract_default.gl_account cga ON r.credit_account_id = cga.id
        ORDER BY r.name
      `;

      const result = await client.query(query);
      
      return { rules: result.rows };
    } catch (error) {
      logger.error('Error getting accounting rules', { error });
      throw error;
    }
  }

  /**
   * Create a payment type
   */
  async createPaymentType(request: PaymentTypeRequest, userId?: string): Promise<string> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check for duplicate name
      const nameCheck = await dbClient.query(
        `SELECT id FROM fineract_default.payment_type WHERE name = $1`,
        [request.name]
      );

      if (nameCheck.rows.length > 0) {
        throw new Error(`Payment type with name '${request.name}' already exists`);
      }

      // Insert payment type
      const paymentTypeId = uuidv4();
      
      const insertQuery = `
        INSERT INTO fineract_default.payment_type(
          id, name, description, is_cash_payment, order_position, is_enabled, created_by
        )
        VALUES($1, $2, $3, $4, $5, $6, $7)
      `;

      await dbClient.query(insertQuery, [
        paymentTypeId,
        request.name,
        request.description,
        request.isCashPayment !== undefined ? request.isCashPayment : true,
        request.orderPosition,
        request.isEnabled !== undefined ? request.isEnabled : true,
        userId
      ]);

      await dbClient.query('COMMIT');
      return paymentTypeId;
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error creating payment type', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Update a payment type
   */
  async updatePaymentType(paymentTypeId: string, request: Partial<PaymentTypeRequest>, userId?: string): Promise<PaymentTypeResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if payment type exists
      const paymentTypeCheck = await dbClient.query(
        `SELECT id FROM fineract_default.payment_type WHERE id = $1`,
        [paymentTypeId]
      );

      if (paymentTypeCheck.rows.length === 0) {
        throw new Error(`Payment type with ID ${paymentTypeId} not found`);
      }

      // Check for duplicate name if name is being changed
      if (request.name) {
        const nameCheck = await dbClient.query(
          `SELECT id FROM fineract_default.payment_type WHERE name = $1 AND id != $2`,
          [request.name, paymentTypeId]
        );

        if (nameCheck.rows.length > 0) {
          throw new Error(`Payment type with name '${request.name}' already exists`);
        }
      }

      // Build update query
      const updateFields = [];
      const updateValues = [];
      let paramCounter = 1;

      if (request.name) {
        updateFields.push(`name = $${paramCounter++}`);
        updateValues.push(request.name);
      }

      if (request.description !== undefined) {
        updateFields.push(`description = $${paramCounter++}`);
        updateValues.push(request.description);
      }

      if (request.isCashPayment !== undefined) {
        updateFields.push(`is_cash_payment = $${paramCounter++}`);
        updateValues.push(request.isCashPayment);
      }

      if (request.orderPosition !== undefined) {
        updateFields.push(`order_position = $${paramCounter++}`);
        updateValues.push(request.orderPosition);
      }

      if (request.isEnabled !== undefined) {
        updateFields.push(`is_enabled = $${paramCounter++}`);
        updateValues.push(request.isEnabled);
      }

      // Add last modified info
      updateFields.push(`last_modified_date = CURRENT_TIMESTAMP`);
      updateFields.push(`last_modified_by = $${paramCounter++}`);
      updateValues.push(userId);

      // Add payment type ID to parameters
      updateValues.push(paymentTypeId);

      // Update payment type
      if (updateFields.length > 0) {
        const updateQuery = `
          UPDATE fineract_default.payment_type
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCounter}
        `;

        await dbClient.query(updateQuery, updateValues);
      }

      // Get updated payment type
      const updatedType = await dbClient.query(
        `SELECT 
          id, name, description, is_cash_payment AS "isCashPayment",
          order_position AS "orderPosition", is_enabled AS "isEnabled"
        FROM fineract_default.payment_type
        WHERE id = $1`,
        [paymentTypeId]
      );

      await dbClient.query('COMMIT');
      return updatedType.rows[0];
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error updating payment type', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Delete a payment type
   */
  async deletePaymentType(paymentTypeId: string): Promise<boolean> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if payment type exists
      const paymentTypeCheck = await dbClient.query(
        `SELECT id FROM fineract_default.payment_type WHERE id = $1`,
        [paymentTypeId]
      );

      if (paymentTypeCheck.rows.length === 0) {
        throw new Error(`Payment type with ID ${paymentTypeId} not found`);
      }

      // Check if payment type is used in any payment details
      const paymentDetailCheck = await dbClient.query(
        `SELECT id FROM fineract_default.payment_detail WHERE payment_type_id = $1 LIMIT 1`,
        [paymentTypeId]
      );

      if (paymentDetailCheck.rows.length > 0) {
        throw new Error(`Cannot delete payment type because it is used in one or more transactions`);
      }

      // Delete the payment type
      await dbClient.query(
        `DELETE FROM fineract_default.payment_type WHERE id = $1`,
        [paymentTypeId]
      );

      await dbClient.query('COMMIT');
      return true;
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error deleting payment type', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Get a payment type by ID
   */
  async getPaymentType(paymentTypeId: string): Promise<PaymentTypeResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      const query = `
        SELECT 
          id, name, description, is_cash_payment AS "isCashPayment",
          order_position AS "orderPosition", is_enabled AS "isEnabled"
        FROM fineract_default.payment_type
        WHERE id = $1
      `;

      const result = await client.query(query, [paymentTypeId]);

      if (result.rows.length === 0) {
        throw new Error(`Payment type with ID ${paymentTypeId} not found`);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting payment type', { error });
      throw error;
    }
  }

  /**
   * Get all payment types
   */
  async getPaymentTypes(onlyEnabled: boolean = false): Promise<PaymentTypesResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      const condition = onlyEnabled ? 'WHERE is_enabled = true' : '';
      
      const query = `
        SELECT 
          id, name, description, is_cash_payment AS "isCashPayment",
          order_position AS "orderPosition", is_enabled AS "isEnabled"
        FROM fineract_default.payment_type
        ${condition}
        ORDER BY COALESCE(order_position, 999999), name
      `;

      const result = await client.query(query);
      
      return { paymentTypes: result.rows };
    } catch (error) {
      logger.error('Error getting payment types', { error });
      throw error;
    }
  }

  /**
   * Get template data for accounting operations
   */
  async getAccountingTemplate(): Promise<AccountingTemplateResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      // Get all active GL accounts
      const glAccountsQuery = `
        SELECT 
          id, name, parent_id AS "parentId", hierarchy, gl_code AS "glCode",
          disabled, manual_entries_allowed AS "manualEntriesAllowed",
          account_type AS "accountType", account_usage AS "accountUsage",
          description, tag_id AS "tagId"
        FROM fineract_default.gl_account
        WHERE disabled = false AND account_usage = 'detail'
        ORDER BY account_type, gl_code
      `;

      const glAccountsResult = await client.query(glAccountsQuery);
      const glAccountOptions = glAccountsResult.rows;

      // Get all offices
      const officesQuery = `
        SELECT id, name FROM fineract_default.office ORDER BY name
      `;

      const officesResult = await client.query(officesQuery);
      const officeOptions = officesResult.rows;

      // Get all payment types
      const paymentTypesQuery = `
        SELECT 
          id, name, description, is_cash_payment AS "isCashPayment",
          order_position AS "orderPosition", is_enabled AS "isEnabled"
        FROM fineract_default.payment_type
        WHERE is_enabled = true
        ORDER BY COALESCE(order_position, 999999), name
      `;

      const paymentTypesResult = await client.query(paymentTypesQuery);
      const paymentTypeOptions = paymentTypesResult.rows;

      // Get account type options
      const accountTypeOptions: AccountTypeDefinition[] = [
        { id: 'asset', code: 'account.type.asset', value: 'Asset', category: 'asset' },
        { id: 'liability', code: 'account.type.liability', value: 'Liability', category: 'liability' },
        { id: 'equity', code: 'account.type.equity', value: 'Equity', category: 'equity' },
        { id: 'income', code: 'account.type.income', value: 'Income', category: 'income' },
        { id: 'expense', code: 'account.type.expense', value: 'Expense', category: 'expense' }
      ];

      // Get account usage options
      const accountUsageOptions: AccountTypeDefinition[] = [
        { id: 'detail', code: 'account.usage.detail', value: 'Detail', category: 'usage' },
        { id: 'header', code: 'account.usage.header', value: 'Header', category: 'usage' }
      ];

      // Get tag options (code values for account tags)
      const tagsQuery = `
        SELECT id, code_value AS name
        FROM fineract_default.code_value
        WHERE code_id = (SELECT id FROM fineract_default.code WHERE code_name = 'AccountTags')
        ORDER BY code_value
      `;

      const tagsResult = await client.query(tagsQuery);
      const tagOptions = tagsResult.rows;

      return {
        glAccountOptions,
        officeOptions,
        paymentTypeOptions,
        accountTypeOptions,
        accountUsageOptions,
        tagOptions
      };
    } catch (error) {
      logger.error('Error getting accounting template', { error });
      throw error;
    }
  }
}

// Export an instance of the service
export const accountingService = new AccountingService();