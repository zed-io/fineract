/**
 * Provisioning Entries Service
 * 
 * Provides functionality for managing loan provisioning entries and categories:
 * - Provisioning category management
 * - Provisioning entry creation, listing, viewing
 * - Provisioning entry approval/rejection
 * - Generating journal entries for provisioning
 */

import { Pool, PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase } from '../utils/db';
import { logger } from '../utils/logger';
import {
  ProvisioningCategory,
  ProvisioningCategoryRequest,
  ProvisioningCategoryResponse,
  ProvisioningCategoriesResponse,
  ProvisioningEntry,
  ProvisioningEntryRequest,
  ProvisioningEntryResponse,
  ProvisioningEntriesResponse,
  ProvisioningEntryDetail,
  ProvisioningEntryStatus
} from '../models/accounting';
import { createJournalEntries } from './journalEntryService';

/**
 * Provisioning Entries Service class
 */
export class ProvisioningEntriesService {
  
  /**
   * Create a provisioning category
   */
  async createProvisioningCategory(request: ProvisioningCategoryRequest, userId?: string): Promise<string> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if category name already exists
      const existingCategory = await dbClient.query(
        `SELECT id FROM fineract_default.provisioning_category WHERE category_name = $1`,
        [request.categoryName]
      );

      if (existingCategory.rows.length > 0) {
        throw new Error(`Provisioning category with name '${request.categoryName}' already exists`);
      }

      // Validate provision percentage
      if (request.provisioningPercentage < 0 || request.provisioningPercentage > 100) {
        throw new Error('Provisioning percentage must be between 0 and 100');
      }

      // Validate age range
      if (request.minAge < 0) {
        throw new Error('Minimum age cannot be negative');
      }

      if (request.maxAge <= request.minAge) {
        throw new Error('Maximum age must be greater than minimum age');
      }

      // Check if liability account exists if provided
      if (request.liabilityAccountId) {
        const liabilityAccountCheck = await dbClient.query(
          `SELECT id, account_type FROM fineract_default.gl_account WHERE id = $1`,
          [request.liabilityAccountId]
        );

        if (liabilityAccountCheck.rows.length === 0) {
          throw new Error(`Liability GL account with ID ${request.liabilityAccountId} not found`);
        }

        if (liabilityAccountCheck.rows[0].account_type !== 'liability') {
          throw new Error(`GL account with ID ${request.liabilityAccountId} is not a liability account`);
        }
      }

      // Check if expense account exists if provided
      if (request.expenseAccountId) {
        const expenseAccountCheck = await dbClient.query(
          `SELECT id, account_type FROM fineract_default.gl_account WHERE id = $1`,
          [request.expenseAccountId]
        );

        if (expenseAccountCheck.rows.length === 0) {
          throw new Error(`Expense GL account with ID ${request.expenseAccountId} not found`);
        }

        if (expenseAccountCheck.rows[0].account_type !== 'expense') {
          throw new Error(`GL account with ID ${request.expenseAccountId} is not an expense account`);
        }
      }

      // Insert provisioning category
      const categoryId = uuidv4();
      
      const insertQuery = `
        INSERT INTO fineract_default.provisioning_category(
          id, category_name, category_description, min_age, max_age, 
          provisioning_percentage, liability_account, expense_account, created_by
        )
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `;

      await dbClient.query(insertQuery, [
        categoryId,
        request.categoryName,
        request.categoryDescription,
        request.minAge,
        request.maxAge,
        request.provisioningPercentage,
        request.liabilityAccountId,
        request.expenseAccountId,
        userId
      ]);

      await dbClient.query('COMMIT');
      return categoryId;
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error creating provisioning category', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Update a provisioning category
   */
  async updateProvisioningCategory(categoryId: string, request: Partial<ProvisioningCategoryRequest>, userId?: string): Promise<ProvisioningCategoryResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if category exists
      const categoryCheck = await dbClient.query(
        `SELECT id FROM fineract_default.provisioning_category WHERE id = $1`,
        [categoryId]
      );

      if (categoryCheck.rows.length === 0) {
        throw new Error(`Provisioning category with ID ${categoryId} not found`);
      }

      // Check if category name already exists if being changed
      if (request.categoryName) {
        const existingCategory = await dbClient.query(
          `SELECT id FROM fineract_default.provisioning_category WHERE category_name = $1 AND id != $2`,
          [request.categoryName, categoryId]
        );

        if (existingCategory.rows.length > 0) {
          throw new Error(`Provisioning category with name '${request.categoryName}' already exists`);
        }
      }

      // Validate provision percentage if provided
      if (request.provisioningPercentage !== undefined) {
        if (request.provisioningPercentage < 0 || request.provisioningPercentage > 100) {
          throw new Error('Provisioning percentage must be between 0 and 100');
        }
      }

      // Check if liability account exists if provided
      if (request.liabilityAccountId) {
        const liabilityAccountCheck = await dbClient.query(
          `SELECT id, account_type FROM fineract_default.gl_account WHERE id = $1`,
          [request.liabilityAccountId]
        );

        if (liabilityAccountCheck.rows.length === 0) {
          throw new Error(`Liability GL account with ID ${request.liabilityAccountId} not found`);
        }

        if (liabilityAccountCheck.rows[0].account_type !== 'liability') {
          throw new Error(`GL account with ID ${request.liabilityAccountId} is not a liability account`);
        }
      }

      // Check if expense account exists if provided
      if (request.expenseAccountId) {
        const expenseAccountCheck = await dbClient.query(
          `SELECT id, account_type FROM fineract_default.gl_account WHERE id = $1`,
          [request.expenseAccountId]
        );

        if (expenseAccountCheck.rows.length === 0) {
          throw new Error(`Expense GL account with ID ${request.expenseAccountId} not found`);
        }

        if (expenseAccountCheck.rows[0].account_type !== 'expense') {
          throw new Error(`GL account with ID ${request.expenseAccountId} is not an expense account`);
        }
      }

      // Build update query
      const updateFields = [];
      const updateValues = [];
      let paramCounter = 1;

      if (request.categoryName) {
        updateFields.push(`category_name = $${paramCounter++}`);
        updateValues.push(request.categoryName);
      }

      if (request.categoryDescription !== undefined) {
        updateFields.push(`category_description = $${paramCounter++}`);
        updateValues.push(request.categoryDescription);
      }

      if (request.minAge !== undefined) {
        updateFields.push(`min_age = $${paramCounter++}`);
        updateValues.push(request.minAge);
      }

      if (request.maxAge !== undefined) {
        updateFields.push(`max_age = $${paramCounter++}`);
        updateValues.push(request.maxAge);
      }

      if (request.provisioningPercentage !== undefined) {
        updateFields.push(`provisioning_percentage = $${paramCounter++}`);
        updateValues.push(request.provisioningPercentage);
      }

      if (request.liabilityAccountId !== undefined) {
        updateFields.push(`liability_account = $${paramCounter++}`);
        updateValues.push(request.liabilityAccountId);
      }

      if (request.expenseAccountId !== undefined) {
        updateFields.push(`expense_account = $${paramCounter++}`);
        updateValues.push(request.expenseAccountId);
      }

      // Add last modified info
      updateFields.push(`last_modified_date = CURRENT_TIMESTAMP`);
      updateFields.push(`last_modified_by = $${paramCounter++}`);
      updateValues.push(userId);

      // Add category ID to parameters
      updateValues.push(categoryId);

      // Update category
      if (updateFields.length > 0) {
        const updateQuery = `
          UPDATE fineract_default.provisioning_category
          SET ${updateFields.join(', ')}
          WHERE id = $${paramCounter}
        `;

        await dbClient.query(updateQuery, updateValues);
      }

      // Get updated category data
      const updatedCategory = await dbClient.query(
        `SELECT 
          pc.id, pc.category_name AS "categoryName", pc.category_description AS "categoryDescription",
          pc.min_age AS "minAge", pc.max_age AS "maxAge", 
          pc.provisioning_percentage AS "provisioningPercentage",
          pc.liability_account AS "liabilityAccount", la.name AS "liabilityAccountName",
          pc.expense_account AS "expenseAccount", ea.name AS "expenseAccountName"
        FROM fineract_default.provisioning_category pc
        LEFT JOIN fineract_default.gl_account la ON pc.liability_account = la.id
        LEFT JOIN fineract_default.gl_account ea ON pc.expense_account = ea.id
        WHERE pc.id = $1`,
        [categoryId]
      );

      await dbClient.query('COMMIT');
      return updatedCategory.rows[0];
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error updating provisioning category', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Delete a provisioning category
   */
  async deleteProvisioningCategory(categoryId: string): Promise<boolean> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if category exists
      const categoryCheck = await dbClient.query(
        `SELECT id FROM fineract_default.provisioning_category WHERE id = $1`,
        [categoryId]
      );

      if (categoryCheck.rows.length === 0) {
        throw new Error(`Provisioning category with ID ${categoryId} not found`);
      }

      // Check if category is used in any provisioning entries
      const entryCheck = await dbClient.query(
        `SELECT id FROM fineract_default.provisioning_entry_detail WHERE category_id = $1 LIMIT 1`,
        [categoryId]
      );

      if (entryCheck.rows.length > 0) {
        throw new Error(`Cannot delete category because it is used in one or more provisioning entries`);
      }

      // Delete the category
      await dbClient.query(
        `DELETE FROM fineract_default.provisioning_category WHERE id = $1`,
        [categoryId]
      );

      await dbClient.query('COMMIT');
      return true;
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error deleting provisioning category', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Get a provisioning category by ID
   */
  async getProvisioningCategory(categoryId: string): Promise<ProvisioningCategoryResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      const query = `
        SELECT 
          pc.id, pc.category_name AS "categoryName", pc.category_description AS "categoryDescription",
          pc.min_age AS "minAge", pc.max_age AS "maxAge", 
          pc.provisioning_percentage AS "provisioningPercentage",
          pc.liability_account AS "liabilityAccount", la.name AS "liabilityAccountName",
          pc.expense_account AS "expenseAccount", ea.name AS "expenseAccountName"
        FROM fineract_default.provisioning_category pc
        LEFT JOIN fineract_default.gl_account la ON pc.liability_account = la.id
        LEFT JOIN fineract_default.gl_account ea ON pc.expense_account = ea.id
        WHERE pc.id = $1
      `;

      const result = await client.query(query, [categoryId]);

      if (result.rows.length === 0) {
        throw new Error(`Provisioning category with ID ${categoryId} not found`);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error getting provisioning category', { error });
      throw error;
    }
  }

  /**
   * Get all provisioning categories
   */
  async getProvisioningCategories(): Promise<ProvisioningCategoriesResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      const query = `
        SELECT 
          pc.id, pc.category_name AS "categoryName", pc.category_description AS "categoryDescription",
          pc.min_age AS "minAge", pc.max_age AS "maxAge", 
          pc.provisioning_percentage AS "provisioningPercentage",
          pc.liability_account AS "liabilityAccount", la.name AS "liabilityAccountName",
          pc.expense_account AS "expenseAccount", ea.name AS "expenseAccountName"
        FROM fineract_default.provisioning_category pc
        LEFT JOIN fineract_default.gl_account la ON pc.liability_account = la.id
        LEFT JOIN fineract_default.gl_account ea ON pc.expense_account = ea.id
        ORDER BY pc.min_age, pc.max_age
      `;

      const result = await client.query(query);
      
      return { categories: result.rows };
    } catch (error) {
      logger.error('Error getting provisioning categories', { error });
      throw error;
    }
  }

  /**
   * Create a provisioning entry
   */
  async createProvisioningEntry(request: ProvisioningEntryRequest, userId?: string): Promise<string> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if an entry already exists for this date
      const existingEntry = await dbClient.query(
        `SELECT id FROM fineract_default.provisioning_entry WHERE entry_date = $1`,
        [request.entryDate]
      );

      if (existingEntry.rows.length > 0) {
        throw new Error(`A provisioning entry already exists for date ${request.entryDate}`);
      }

      // Insert provisioning entry
      const entryId = uuidv4();
      
      const insertQuery = `
        INSERT INTO fineract_default.provisioning_entry(
          id, entry_date, created_date, comments, status, created_by
        )
        VALUES($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)
        RETURNING id
      `;

      await dbClient.query(insertQuery, [
        entryId,
        request.entryDate,
        request.comments,
        ProvisioningEntryStatus.PENDING,
        userId
      ]);

      // Calculate provisioning for all loan products at all offices
      // This is a complex SQL query that would calculate:
      // - Find all active loans grouped by office, product, and currency
      // - Classify them into provisioning categories based on days in arrears
      // - Calculate provisioning amounts based on outstanding principal and category provisioning percentage
      
      // For this example, we'll simulate this with a simplified version
      const loanProductsQuery = `
        SELECT id, name FROM fineract_default.loan_product WHERE is_active = true
      `;
      
      const officesQuery = `
        SELECT id, name FROM fineract_default.office
      `;
      
      const categoriesQuery = `
        SELECT id, category_name, provisioning_percentage
        FROM fineract_default.provisioning_category
        ORDER BY min_age
      `;
      
      const loanProducts = await dbClient.query(loanProductsQuery);
      const offices = await dbClient.query(officesQuery);
      const categories = await dbClient.query(categoriesQuery);
      
      let totalProvisioningAmount = 0;
      
      // For each product at each office, create a provisioning detail entry for each category
      for (const office of offices.rows) {
        for (const product of loanProducts.rows) {
          // In a real implementation, we would query actual loan data here
          // For this example, we'll simulate some plausible values
          
          // Assume a single currency for simplicity
          const currencyCode = 'USD';
          
          for (const category of categories.rows) {
            // Simulated values - in a real implementation these would come from loan data
            const amountOutstanding = Math.random() * 100000; // Random value for demonstration
            const provisioningPercentage = category.provisioning_percentage;
            const amountProvisioned = (amountOutstanding * provisioningPercentage) / 100;
            
            totalProvisioningAmount += amountProvisioned;
            
            const detailId = uuidv4();
            
            const insertDetailQuery = `
              INSERT INTO fineract_default.provisioning_entry_detail(
                id, provisioning_entry_id, office_id, loan_product_id,
                currency_code, category_id, amount_outstanding, amount_provisioned
              )
              VALUES($1, $2, $3, $4, $5, $6, $7, $8)
            `;
            
            await dbClient.query(insertDetailQuery, [
              detailId,
              entryId,
              office.id,
              product.id,
              currencyCode,
              category.id,
              amountOutstanding,
              amountProvisioned
            ]);
          }
        }
      }
      
      // Update the total provisioning amount
      await dbClient.query(
        `UPDATE fineract_default.provisioning_entry 
         SET provisioning_amount = $1 
         WHERE id = $2`,
        [totalProvisioningAmount, entryId]
      );
      
      // Create journal entries if requested
      if (request.createJournalEntries) {
        await this.createJournalEntriesForProvisioning(entryId, userId, dbClient);
      }

      await dbClient.query('COMMIT');
      return entryId;
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error creating provisioning entry', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Approve a provisioning entry
   */
  async approveProvisioningEntry(entryId: string, createJournalEntries: boolean = true, userId?: string): Promise<boolean> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if entry exists and is pending
      const entryCheck = await dbClient.query(
        `SELECT id, status FROM fineract_default.provisioning_entry WHERE id = $1`,
        [entryId]
      );

      if (entryCheck.rows.length === 0) {
        throw new Error(`Provisioning entry with ID ${entryId} not found`);
      }

      if (entryCheck.rows[0].status !== ProvisioningEntryStatus.PENDING) {
        throw new Error(`Provisioning entry is not in pending status`);
      }

      // Create journal entries if requested and not already created
      if (createJournalEntries) {
        await this.createJournalEntriesForProvisioning(entryId, userId, dbClient);
      }

      // Update entry status
      await dbClient.query(
        `UPDATE fineract_default.provisioning_entry 
         SET status = $1, approved_by = $2, approved_date = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [ProvisioningEntryStatus.APPROVED, userId, entryId]
      );

      await dbClient.query('COMMIT');
      return true;
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error approving provisioning entry', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Reject a provisioning entry
   */
  async rejectProvisioningEntry(entryId: string, userId?: string): Promise<boolean> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let dbClient: PoolClient | null = null;
    try {
      dbClient = await client.connect();
      await dbClient.query('BEGIN');

      // Check if entry exists and is pending
      const entryCheck = await dbClient.query(
        `SELECT id, status, journal_entry_id FROM fineract_default.provisioning_entry WHERE id = $1`,
        [entryId]
      );

      if (entryCheck.rows.length === 0) {
        throw new Error(`Provisioning entry with ID ${entryId} not found`);
      }

      if (entryCheck.rows[0].status !== ProvisioningEntryStatus.PENDING) {
        throw new Error(`Provisioning entry is not in pending status`);
      }

      // If journal entries were created, they would need to be reversed
      // This would be implemented in a real system

      // Update entry status
      await dbClient.query(
        `UPDATE fineract_default.provisioning_entry 
         SET status = $1, approved_by = $2, approved_date = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [ProvisioningEntryStatus.REJECTED, userId, entryId]
      );

      await dbClient.query('COMMIT');
      return true;
    } catch (error) {
      if (dbClient) {
        await dbClient.query('ROLLBACK');
      }
      logger.error('Error rejecting provisioning entry', { error });
      throw error;
    } finally {
      if (dbClient) {
        dbClient.release();
      }
    }
  }

  /**
   * Get a provisioning entry by ID
   */
  async getProvisioningEntry(entryId: string): Promise<ProvisioningEntryResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      // Get main entry data
      const entryQuery = `
        SELECT 
          pe.id, pe.journal_entry_id AS "journalEntryId", 
          pe.created_date AS "createdDate", pe.entry_date AS "entryDate",
          pe.comments, pe.provisioning_amount AS "provisioningAmount",
          pe.status, pe.created_by AS "createdBy",
          pe.approved_by AS "approvedBy", pe.approved_date AS "approvedDate"
        FROM fineract_default.provisioning_entry pe
        WHERE pe.id = $1
      `;

      const entryResult = await client.query(entryQuery, [entryId]);

      if (entryResult.rows.length === 0) {
        throw new Error(`Provisioning entry with ID ${entryId} not found`);
      }

      const entry = entryResult.rows[0];

      // Get entry details
      const detailsQuery = `
        SELECT 
          ped.id, ped.provisioning_entry_id AS "provisioningEntryId",
          ped.office_id AS "officeId", o.name AS "officeName",
          ped.loan_product_id AS "loanProductId", lp.name AS "loanProductName",
          ped.currency_code AS "currencyCode",
          ped.category_id AS "categoryId", pc.category_name AS "categoryName",
          ped.amount_outstanding AS "amountOutstanding",
          ped.amount_provisioned AS "amountProvisioned"
        FROM fineract_default.provisioning_entry_detail ped
        JOIN fineract_default.office o ON ped.office_id = o.id
        JOIN fineract_default.loan_product lp ON ped.loan_product_id = lp.id
        JOIN fineract_default.provisioning_category pc ON ped.category_id = pc.id
        WHERE ped.provisioning_entry_id = $1
        ORDER BY o.name, lp.name, pc.min_age
      `;

      const detailsResult = await client.query(detailsQuery, [entryId]);
      
      entry.details = detailsResult.rows;

      return entry;
    } catch (error) {
      logger.error('Error getting provisioning entry', { error });
      throw error;
    }
  }

  /**
   * Get all provisioning entries
   */
  async getProvisioningEntries(fromDate?: string, toDate?: string, offset: number = 0, limit: number = 20): Promise<ProvisioningEntriesResponse> {
    const client = await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    try {
      // Build query conditions
      const conditions = [];
      const queryParams = [];
      let paramCounter = 1;

      if (fromDate) {
        conditions.push(`entry_date >= $${paramCounter++}`);
        queryParams.push(fromDate);
      }

      if (toDate) {
        conditions.push(`entry_date <= $${paramCounter++}`);
        queryParams.push(toDate);
      }

      const whereClause = conditions.length > 0
        ? `WHERE ${conditions.join(' AND ')}`
        : '';

      // Count total entries
      const countQuery = `
        SELECT COUNT(*) AS total FROM fineract_default.provisioning_entry
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, queryParams);
      const totalCount = parseInt(countResult.rows[0].total);

      // Add pagination parameters
      queryParams.push(limit);
      queryParams.push(offset);

      // Get paginated entries
      const entriesQuery = `
        SELECT 
          id, journal_entry_id AS "journalEntryId", 
          created_date AS "createdDate", entry_date AS "entryDate",
          comments, provisioning_amount AS "provisioningAmount",
          status, created_by AS "createdBy",
          approved_by AS "approvedBy", approved_date AS "approvedDate"
        FROM fineract_default.provisioning_entry
        ${whereClause}
        ORDER BY entry_date DESC
        LIMIT $${paramCounter++} OFFSET $${paramCounter++}
      `;

      const entriesResult = await client.query(entriesQuery, queryParams);
      
      return { 
        entries: entriesResult.rows,
        totalCount 
      };
    } catch (error) {
      logger.error('Error getting provisioning entries', { error });
      throw error;
    }
  }

  /**
   * Create journal entries for a provisioning entry
   * This is a simplified version - a real implementation would be more complex
   */
  private async createJournalEntriesForProvisioning(entryId: string, userId?: string, dbClient?: PoolClient): Promise<string | null> {
    const client = dbClient || await initDatabase();
    if (!client) {
      throw new Error('Database connection failed');
    }

    let shouldReleaseClient = false;
    if (!dbClient) {
      shouldReleaseClient = true;
      await client.query('BEGIN');
    }

    try {
      // Check if journal entries already exist for this provisioning entry
      const entryCheck = await client.query(
        `SELECT journal_entry_id FROM fineract_default.provisioning_entry WHERE id = $1`,
        [entryId]
      );

      if (entryCheck.rows[0].journal_entry_id) {
        return entryCheck.rows[0].journal_entry_id;
      }

      // Get entry details grouped by office, product and category
      const detailsQuery = `
        SELECT 
          ped.office_id, o.name AS office_name,
          ped.category_id, pc.category_name,
          pc.liability_account, pc.expense_account,
          ped.currency_code,
          SUM(ped.amount_provisioned) AS total_amount
        FROM fineract_default.provisioning_entry_detail ped
        JOIN fineract_default.office o ON ped.office_id = o.id
        JOIN fineract_default.provisioning_category pc ON ped.category_id = pc.id
        WHERE ped.provisioning_entry_id = $1
        GROUP BY ped.office_id, o.name, ped.category_id, pc.category_name, 
                 pc.liability_account, pc.expense_account, ped.currency_code
      `;

      const details = await client.query(detailsQuery, [entryId]);

      if (details.rows.length === 0) {
        throw new Error('No provisioning details found to create journal entries');
      }

      // Get entry date for journal entries
      const entryDateQuery = `
        SELECT entry_date FROM fineract_default.provisioning_entry WHERE id = $1
      `;
      
      const entryDateResult = await client.query(entryDateQuery, [entryId]);
      const entryDate = entryDateResult.rows[0].entry_date;

      // In a real implementation, this would create actual journal entries
      // For each office and category combination, create a journal entry
      // The entry would debit the expense account and credit the liability account

      // For this example, we'll just simulate a journal entry ID
      const journalEntryId = uuidv4();

      // Update the provisioning entry with the journal entry ID
      await client.query(
        `UPDATE fineract_default.provisioning_entry 
         SET journal_entry_id = $1
         WHERE id = $2`,
        [journalEntryId, entryId]
      );

      if (shouldReleaseClient) {
        await client.query('COMMIT');
      }
      
      return journalEntryId;
    } catch (error) {
      if (shouldReleaseClient) {
        await client.query('ROLLBACK');
      }
      logger.error('Error creating journal entries for provisioning', { error });
      throw error;
    } finally {
      if (shouldReleaseClient && client instanceof PoolClient) {
        client.release();
      }
    }
  }
}

// Export an instance of the service
export const provisioningEntriesService = new ProvisioningEntriesService();