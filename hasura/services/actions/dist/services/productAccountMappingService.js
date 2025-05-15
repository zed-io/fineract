"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductAccountMappings = getProductAccountMappings;
exports.createProductAccountMapping = createProductAccountMapping;
exports.updateProductAccountMapping = updateProductAccountMapping;
exports.deleteProductAccountMapping = deleteProductAccountMapping;
exports.getGLAccountIdForProductAndMappingType = getGLAccountIdForProductAndMappingType;
exports.setupDefaultLoanProductMappings = setupDefaultLoanProductMappings;
exports.setupDefaultSavingsProductMappings = setupDefaultSavingsProductMappings;
const uuid_1 = require("uuid");
const db_1 = require("../utils/db");
const logger_1 = require("../utils/logger");
const accounting_1 = require("../models/accounting");
/**
 * Get the GL account mappings for a product
 * @param productId The ID of the product
 * @param productType The type of product (loan, savings, or share)
 * @returns Product to GL account mappings
 */
async function getProductAccountMappings(productId, productType) {
    logger_1.logger.info('Fetching product account mappings', { productId, productType });
    try {
        const query = `
      SELECT pam.id, pam.product_id as "productId", 
             pam.product_type as "productType", 
             pam.account_mapping_type as "accountMappingType", 
             pam.gl_account_id as "glAccountId",
             ga.name as "glAccountName",
             ga.gl_code as "glCode",
             ga.account_type as "accountType"
      FROM fineract_default.product_account_mapping pam
      JOIN fineract_default.gl_account ga ON pam.gl_account_id = ga.id
      WHERE pam.product_id = $1 AND pam.product_type = $2
      ORDER BY pam.account_mapping_type
    `;
        const result = await db_1.db.query(query, [productId, productType]);
        return {
            success: true,
            productId,
            productType,
            accountMappings: result.rows
        };
    }
    catch (error) {
        logger_1.logger.error('Error fetching product account mappings', error);
        return {
            success: false,
            message: error.message
        };
    }
}
/**
 * Create a new product to GL account mapping
 * @param input The mapping input data
 * @param userId The ID of the user creating the mapping
 * @returns Result of the mapping creation
 */
async function createProductAccountMapping(input, userId) {
    const { productId, productType, accountMappingType, glAccountId } = input;
    logger_1.logger.info('Creating product account mapping', { productId, productType, accountMappingType });
    return db_1.db.transaction(async (client) => {
        try {
            // Check if the product exists
            await validateProduct(client, productId, productType);
            // Check if the GL account exists
            await validateGLAccount(client, glAccountId);
            // Check if a mapping already exists for this combination
            const existingMapping = await client.query(`SELECT id FROM fineract_default.product_account_mapping 
         WHERE product_id = $1 AND product_type = $2 AND account_mapping_type = $3`, [productId, productType, accountMappingType]);
            if (existingMapping.rows.length > 0) {
                throw new Error(`A mapping already exists for this product and account mapping type`);
            }
            // Generate mapping ID
            const mappingId = (0, uuid_1.v4)();
            // Insert the mapping
            await client.query(`INSERT INTO fineract_default.product_account_mapping(
           id, product_id, product_type, account_mapping_type, gl_account_id
         )
         VALUES ($1, $2, $3, $4, $5)`, [mappingId, productId, productType, accountMappingType, glAccountId]);
            return {
                success: true,
                mappingId,
                productId,
                productType,
                accountMappingType,
                glAccountId,
                message: 'Product account mapping created successfully'
            };
        }
        catch (error) {
            logger_1.logger.error('Error creating product account mapping', error);
            throw new Error(`Failed to create product account mapping: ${error.message}`);
        }
    });
}
/**
 * Update a product to GL account mapping
 * @param mappingId The ID of the mapping to update
 * @param glAccountId The new GL account ID
 * @param userId The ID of the user updating the mapping
 * @returns Result of the mapping update
 */
async function updateProductAccountMapping(mappingId, glAccountId, userId) {
    logger_1.logger.info('Updating product account mapping', { mappingId, glAccountId });
    return db_1.db.transaction(async (client) => {
        try {
            // Check if the mapping exists
            const mappingQuery = await client.query(`SELECT id, product_id, product_type, account_mapping_type 
         FROM fineract_default.product_account_mapping 
         WHERE id = $1`, [mappingId]);
            if (mappingQuery.rows.length === 0) {
                throw new Error(`Product account mapping with ID ${mappingId} not found`);
            }
            // Check if the GL account exists
            await validateGLAccount(client, glAccountId);
            // Update the mapping
            await client.query(`UPDATE fineract_default.product_account_mapping 
         SET gl_account_id = $1,
             last_modified_date = CURRENT_TIMESTAMP,
             last_modified_by = $2
         WHERE id = $3`, [glAccountId, userId, mappingId]);
            return {
                success: true,
                mappingId,
                productId: mappingQuery.rows[0].product_id,
                productType: mappingQuery.rows[0].product_type,
                accountMappingType: mappingQuery.rows[0].account_mapping_type,
                glAccountId,
                message: 'Product account mapping updated successfully'
            };
        }
        catch (error) {
            logger_1.logger.error('Error updating product account mapping', error);
            throw new Error(`Failed to update product account mapping: ${error.message}`);
        }
    });
}
/**
 * Delete a product to GL account mapping
 * @param mappingId The ID of the mapping to delete
 * @returns Result of the mapping deletion
 */
async function deleteProductAccountMapping(mappingId) {
    logger_1.logger.info('Deleting product account mapping', { mappingId });
    return db_1.db.transaction(async (client) => {
        try {
            // Check if the mapping exists
            const mappingQuery = await client.query(`SELECT id FROM fineract_default.product_account_mapping WHERE id = $1`, [mappingId]);
            if (mappingQuery.rows.length === 0) {
                throw new Error(`Product account mapping with ID ${mappingId} not found`);
            }
            // Delete the mapping
            await client.query(`DELETE FROM fineract_default.product_account_mapping WHERE id = $1`, [mappingId]);
            return {
                success: true,
                mappingId,
                message: 'Product account mapping deleted successfully'
            };
        }
        catch (error) {
            logger_1.logger.error('Error deleting product account mapping', error);
            throw new Error(`Failed to delete product account mapping: ${error.message}`);
        }
    });
}
/**
 * Get the GL account ID for a specific product and mapping type
 * @param client The database client
 * @param productId The ID of the product
 * @param productType The type of product
 * @param accountMappingType The type of account mapping
 * @returns The GL account ID or null if not found
 */
async function getGLAccountIdForProductAndMappingType(client, productId, productType, accountMappingType) {
    const mappingQuery = await client.query(`SELECT gl_account_id FROM fineract_default.product_account_mapping 
     WHERE product_id = $1 AND product_type = $2 AND account_mapping_type = $3`, [productId, productType, accountMappingType]);
    if (mappingQuery.rows.length === 0) {
        return null;
    }
    return mappingQuery.rows[0].gl_account_id;
}
/**
 * Setup default account mappings for a loan product
 * @param productId The ID of the loan product
 * @param userId The ID of the user setting up the mappings
 * @returns Result of the setup operation
 */
async function setupDefaultLoanProductMappings(productId, userId) {
    logger_1.logger.info('Setting up default loan product mappings', { productId });
    return db_1.db.transaction(async (client) => {
        try {
            // Check if the product exists
            await validateProduct(client, productId, accounting_1.ProductType.LOAN);
            // Get default GL accounts for each mapping type
            const defaultAccounts = await getDefaultGLAccounts(client);
            // Define required mappings for loan products
            const requiredMappings = [
                { mappingType: accounting_1.LoanAccountMappingType.FUND_SOURCE, accountType: 'asset' },
                { mappingType: accounting_1.LoanAccountMappingType.LOAN_PORTFOLIO, accountType: 'asset' },
                { mappingType: accounting_1.LoanAccountMappingType.INTEREST_RECEIVABLE, accountType: 'asset' },
                { mappingType: accounting_1.LoanAccountMappingType.INTEREST_INCOME, accountType: 'income' },
                { mappingType: accounting_1.LoanAccountMappingType.FEE_INCOME, accountType: 'income' },
                { mappingType: accounting_1.LoanAccountMappingType.PENALTY_INCOME, accountType: 'income' },
                { mappingType: accounting_1.LoanAccountMappingType.LOSSES_WRITTEN_OFF, accountType: 'expense' }
            ];
            // Create mappings for each required type
            const mappingPromises = requiredMappings.map(async ({ mappingType, accountType }) => {
                // Check if mapping already exists
                const existingMapping = await client.query(`SELECT id FROM fineract_default.product_account_mapping 
           WHERE product_id = $1 AND product_type = $2 AND account_mapping_type = $3`, [productId, accounting_1.ProductType.LOAN, mappingType]);
                if (existingMapping.rows.length > 0) {
                    return {
                        mappingType,
                        status: 'skipped',
                        message: 'Mapping already exists'
                    };
                }
                // Find a suitable GL account
                const glAccountId = defaultAccounts[mappingType] || await findSuitableGLAccount(client, accountType);
                if (!glAccountId) {
                    return {
                        mappingType,
                        status: 'error',
                        message: `Could not find suitable GL account of type ${accountType} for mapping type ${mappingType}`
                    };
                }
                // Generate mapping ID
                const mappingId = (0, uuid_1.v4)();
                // Insert the mapping
                await client.query(`INSERT INTO fineract_default.product_account_mapping(
             id, product_id, product_type, account_mapping_type, gl_account_id
           )
           VALUES ($1, $2, $3, $4, $5)`, [mappingId, productId, accounting_1.ProductType.LOAN, mappingType, glAccountId]);
                return {
                    mappingType,
                    status: 'created',
                    glAccountId,
                    mappingId
                };
            });
            const results = await Promise.all(mappingPromises);
            return {
                success: true,
                productId,
                mappings: results,
                message: 'Default loan product mappings set up successfully'
            };
        }
        catch (error) {
            logger_1.logger.error('Error setting up default loan product mappings', error);
            throw new Error(`Failed to set up default loan product mappings: ${error.message}`);
        }
    });
}
/**
 * Setup default account mappings for a savings product
 * @param productId The ID of the savings product
 * @param userId The ID of the user setting up the mappings
 * @returns Result of the setup operation
 */
async function setupDefaultSavingsProductMappings(productId, userId) {
    logger_1.logger.info('Setting up default savings product mappings', { productId });
    return db_1.db.transaction(async (client) => {
        try {
            // Check if the product exists
            await validateProduct(client, productId, accounting_1.ProductType.SAVINGS);
            // Get default GL accounts for each mapping type
            const defaultAccounts = await getDefaultGLAccounts(client);
            // Define required mappings for savings products
            const requiredMappings = [
                { mappingType: accounting_1.SavingsAccountMappingType.SAVINGS_CONTROL, accountType: 'liability' },
                { mappingType: accounting_1.SavingsAccountMappingType.SAVINGS_REFERENCE, accountType: 'liability' },
                { mappingType: accounting_1.SavingsAccountMappingType.INTEREST_ON_SAVINGS, accountType: 'expense' },
                { mappingType: accounting_1.SavingsAccountMappingType.FEE_INCOME, accountType: 'income' },
                { mappingType: accounting_1.SavingsAccountMappingType.PENALTY_INCOME, accountType: 'income' },
                { mappingType: accounting_1.SavingsAccountMappingType.INCOME_FROM_FEES, accountType: 'income' }
            ];
            // Create mappings for each required type
            const mappingPromises = requiredMappings.map(async ({ mappingType, accountType }) => {
                // Check if mapping already exists
                const existingMapping = await client.query(`SELECT id FROM fineract_default.product_account_mapping 
           WHERE product_id = $1 AND product_type = $2 AND account_mapping_type = $3`, [productId, accounting_1.ProductType.SAVINGS, mappingType]);
                if (existingMapping.rows.length > 0) {
                    return {
                        mappingType,
                        status: 'skipped',
                        message: 'Mapping already exists'
                    };
                }
                // Find a suitable GL account
                const glAccountId = defaultAccounts[mappingType] || await findSuitableGLAccount(client, accountType);
                if (!glAccountId) {
                    return {
                        mappingType,
                        status: 'error',
                        message: `Could not find suitable GL account of type ${accountType} for mapping type ${mappingType}`
                    };
                }
                // Generate mapping ID
                const mappingId = (0, uuid_1.v4)();
                // Insert the mapping
                await client.query(`INSERT INTO fineract_default.product_account_mapping(
             id, product_id, product_type, account_mapping_type, gl_account_id
           )
           VALUES ($1, $2, $3, $4, $5)`, [mappingId, productId, accounting_1.ProductType.SAVINGS, mappingType, glAccountId]);
                return {
                    mappingType,
                    status: 'created',
                    glAccountId,
                    mappingId
                };
            });
            const results = await Promise.all(mappingPromises);
            return {
                success: true,
                productId,
                mappings: results,
                message: 'Default savings product mappings set up successfully'
            };
        }
        catch (error) {
            logger_1.logger.error('Error setting up default savings product mappings', error);
            throw new Error(`Failed to set up default savings product mappings: ${error.message}`);
        }
    });
}
// Helper functions
/**
 * Validate that the product exists
 */
async function validateProduct(client, productId, productType) {
    let tableName;
    switch (productType) {
        case accounting_1.ProductType.LOAN:
            tableName = 'loan_product';
            break;
        case accounting_1.ProductType.SAVINGS:
            tableName = 'savings_product';
            break;
        case accounting_1.ProductType.SHARE:
            tableName = 'share_product';
            break;
        default:
            throw new Error(`Invalid product type: ${productType}`);
    }
    const productQuery = await client.query(`SELECT id FROM fineract_default.${tableName} WHERE id = $1`, [productId]);
    if (productQuery.rows.length === 0) {
        throw new Error(`${productType.charAt(0).toUpperCase() + productType.slice(1)} product with ID ${productId} not found`);
    }
}
/**
 * Validate that the GL account exists
 */
async function validateGLAccount(client, glAccountId) {
    const accountQuery = await client.query(`SELECT id, disabled FROM fineract_default.gl_account WHERE id = $1`, [glAccountId]);
    if (accountQuery.rows.length === 0) {
        throw new Error(`GL account with ID ${glAccountId} not found`);
    }
    if (accountQuery.rows[0].disabled) {
        throw new Error(`GL account with ID ${glAccountId} is disabled`);
    }
}
/**
 * Find a suitable GL account for the given account type
 */
async function findSuitableGLAccount(client, accountType) {
    const accountQuery = await client.query(`SELECT id FROM fineract_default.gl_account 
     WHERE account_type = $1 
     AND disabled = false 
     AND manual_entries_allowed = true 
     AND account_usage = 'detail'
     LIMIT 1`, [accountType]);
    if (accountQuery.rows.length === 0) {
        return null;
    }
    return accountQuery.rows[0].id;
}
/**
 * Get default GL accounts for common mapping types
 */
async function getDefaultGLAccounts(client) {
    const defaultAccounts = {};
    // Fetch commonly named accounts that are likely to match mapping types
    const accountsQuery = await client.query(`
    SELECT id, name, gl_code, account_type 
    FROM fineract_default.gl_account 
    WHERE disabled = false 
    AND manual_entries_allowed = true 
    AND account_usage = 'detail'
  `);
    // Map account names to mapping types
    for (const account of accountsQuery.rows) {
        const accountName = account.name.toLowerCase();
        if (accountName.includes('loan') && accountName.includes('portfolio')) {
            defaultAccounts[accounting_1.LoanAccountMappingType.LOAN_PORTFOLIO] = account.id;
        }
        else if (accountName.includes('fund') && accountName.includes('source')) {
            defaultAccounts[accounting_1.LoanAccountMappingType.FUND_SOURCE] = account.id;
        }
        else if (accountName.includes('interest') && accountName.includes('receivable')) {
            defaultAccounts[accounting_1.LoanAccountMappingType.INTEREST_RECEIVABLE] = account.id;
        }
        else if (accountName.includes('interest') && accountName.includes('income')) {
            defaultAccounts[accounting_1.LoanAccountMappingType.INTEREST_INCOME] = account.id;
        }
        else if (accountName.includes('fee') && accountName.includes('income')) {
            defaultAccounts[accounting_1.LoanAccountMappingType.FEE_INCOME] = account.id;
            defaultAccounts[accounting_1.SavingsAccountMappingType.FEE_INCOME] = account.id;
        }
        else if (accountName.includes('penalty') || accountName.includes('penalties')) {
            defaultAccounts[accounting_1.LoanAccountMappingType.PENALTY_INCOME] = account.id;
            defaultAccounts[accounting_1.SavingsAccountMappingType.PENALTY_INCOME] = account.id;
        }
        else if (accountName.includes('write') && accountName.includes('off')) {
            defaultAccounts[accounting_1.LoanAccountMappingType.LOSSES_WRITTEN_OFF] = account.id;
        }
        else if (accountName.includes('savings')) {
            defaultAccounts[accounting_1.SavingsAccountMappingType.SAVINGS_CONTROL] = account.id;
            defaultAccounts[accounting_1.SavingsAccountMappingType.SAVINGS_REFERENCE] = account.id;
        }
        else if (accountName.includes('interest') && accountName.includes('expense')) {
            defaultAccounts[accounting_1.SavingsAccountMappingType.INTEREST_ON_SAVINGS] = account.id;
        }
    }
    return defaultAccounts;
}
