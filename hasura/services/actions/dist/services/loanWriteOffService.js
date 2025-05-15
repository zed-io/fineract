"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoanWriteOffService = void 0;
const db_1 = require("../utils/db");
const logger_1 = require("../utils/logger");
const loanAdvanced_1 = require("../models/loanAdvanced");
/**
 * Service for handling loan write-offs
 * Write-off is when a loan is considered uncollectible and removed from the books
 */
class LoanWriteOffService {
    /**
     * Write off a loan
     *
     * @param loanId The loan ID
     * @param writeOffData The write-off details
     * @param userId The user ID performing the write-off
     * @returns The write-off transaction ID
     */
    async writeLoanOff(loanId, writeOffData, userId) {
        logger_1.logger.info('Processing loan write-off', {
            loanId,
            writeOffDate: writeOffData.writeOffDate,
            userId
        });
        return db_1.db.transaction(async (client) => {
            try {
                // Get loan details
                const loanResult = await client.query(`SELECT loan_status, currency_code, principal_outstanding_derived, 
           interest_outstanding_derived, fee_charges_outstanding_derived, 
           penalty_charges_outstanding_derived, total_outstanding_derived
           FROM loan WHERE id = $1`, [loanId]);
                if (loanResult.rowCount === 0) {
                    throw new Error('Loan not found');
                }
                const loan = loanResult.rows[0];
                // Validate loan status
                if (loan.loan_status !== 'active') {
                    throw new Error(`Cannot write off loan with status ${loan.loan_status}`);
                }
                // Validate there's an outstanding balance to write off
                if (loan.total_outstanding_derived <= 0) {
                    throw new Error('Loan has no outstanding balance to write off');
                }
                // Calculate write-off amount based on strategy
                const writeOffStrategy = writeOffData.writeOffStrategy || loanAdvanced_1.WriteOffStrategy.FULL_OUTSTANDING;
                let principalPortion = 0;
                let interestPortion = 0;
                let feePortion = 0;
                let penaltyPortion = 0;
                let writeOffAmount = 0;
                switch (writeOffStrategy) {
                    case loanAdvanced_1.WriteOffStrategy.FULL_OUTSTANDING:
                        // Write off all outstanding balances
                        principalPortion = loan.principal_outstanding_derived;
                        interestPortion = loan.interest_outstanding_derived;
                        feePortion = loan.fee_charges_outstanding_derived;
                        penaltyPortion = loan.penalty_charges_outstanding_derived;
                        writeOffAmount = loan.total_outstanding_derived;
                        break;
                    case loanAdvanced_1.WriteOffStrategy.PRINCIPAL_ONLY:
                        // Write off only principal
                        principalPortion = loan.principal_outstanding_derived;
                        writeOffAmount = principalPortion;
                        break;
                    case loanAdvanced_1.WriteOffStrategy.PARTIAL_AMOUNT:
                        // Write off a specified amount, allocated starting with principal
                        writeOffAmount = writeOffData.writeOffAmount || loan.total_outstanding_derived;
                        // Cap at total outstanding
                        writeOffAmount = Math.min(writeOffAmount, loan.total_outstanding_derived);
                        // Allocate to components in order: principal, interest, fees, penalties
                        let remaining = writeOffAmount;
                        // Allocate to principal
                        principalPortion = Math.min(remaining, loan.principal_outstanding_derived);
                        remaining -= principalPortion;
                        // Allocate to interest
                        if (remaining > 0) {
                            interestPortion = Math.min(remaining, loan.interest_outstanding_derived);
                            remaining -= interestPortion;
                        }
                        // Allocate to fees
                        if (remaining > 0) {
                            feePortion = Math.min(remaining, loan.fee_charges_outstanding_derived);
                            remaining -= feePortion;
                        }
                        // Allocate to penalties
                        if (remaining > 0) {
                            penaltyPortion = Math.min(remaining, loan.penalty_charges_outstanding_derived);
                        }
                        break;
                }
                // Create write-off transaction
                const transactionResult = await client.query(`INSERT INTO m_loan_transaction (
            loan_id, transaction_type_enum, transaction_date, amount, 
            principal_portion, interest_portion, fee_charges_portion, 
            penalty_charges_portion, submitted_on_date, created_by, 
            created_date, is_reversed, outstanding_loan_balance_derived
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, $12)
          RETURNING id`, [
                    loanId,
                    6, // WRITE_OFF enum value
                    writeOffData.writeOffDate,
                    writeOffAmount,
                    principalPortion,
                    interestPortion,
                    feePortion,
                    penaltyPortion,
                    writeOffData.writeOffDate,
                    userId,
                    false, // is_reversed
                    loan.total_outstanding_derived - writeOffAmount
                ]);
                const transactionId = transactionResult.rows[0].id;
                // Insert write-off details
                const writeOffResult = await client.query(`INSERT INTO m_loan_write_off (
            loan_id, write_off_date, write_off_strategy, write_off_amount, 
            write_off_reason_id, write_off_reason_comment, submitted_by_user_id, 
            transaction_id, outstanding_principal, outstanding_interest, 
            outstanding_fees, outstanding_penalties, reference, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          RETURNING id`, [
                    loanId,
                    writeOffData.writeOffDate,
                    writeOffStrategy,
                    writeOffAmount,
                    writeOffData.writeOffReasonId,
                    writeOffData.writeOffReasonComment,
                    userId,
                    transactionId,
                    loan.principal_outstanding_derived,
                    loan.interest_outstanding_derived,
                    loan.fee_charges_outstanding_derived,
                    loan.penalty_charges_outstanding_derived,
                    writeOffData.reference,
                ]);
                // Update loan status and balances
                await client.query(`UPDATE loan SET
            loan_status = $1,
            principal_writtenoff_derived = principal_writtenoff_derived + $2,
            interest_writtenoff_derived = interest_writtenoff_derived + $3,
            fee_charges_writtenoff_derived = fee_charges_writtenoff_derived + $4,
            penalty_charges_writtenoff_derived = penalty_charges_writtenoff_derived + $5,
            principal_outstanding_derived = principal_outstanding_derived - $2,
            interest_outstanding_derived = interest_outstanding_derived - $3,
            fee_charges_outstanding_derived = fee_charges_outstanding_derived - $4,
            penalty_charges_outstanding_derived = penalty_charges_outstanding_derived - $5,
            total_outstanding_derived = total_outstanding_derived - $6,
            writtenoff_on_date = $7,
            closed_on_date = CASE WHEN $6 >= total_outstanding_derived THEN $7 ELSE closed_on_date END,
            updated_by = $8,
            updated_on = NOW()
           WHERE id = $9`, [
                    writeOffAmount >= loan.total_outstanding_derived ? 'closed_written_off' : 'active',
                    principalPortion,
                    interestPortion,
                    feePortion,
                    penaltyPortion,
                    writeOffAmount,
                    writeOffData.writeOffDate,
                    userId,
                    loanId
                ]);
                return transactionId;
            }
            catch (error) {
                logger_1.logger.error('Error writing off loan', { loanId, error });
                throw new Error(`Failed to write off loan: ${error.message}`);
            }
        });
    }
    /**
     * Undo a loan write-off
     *
     * @param loanId The loan ID
     * @param transactionId The write-off transaction ID to reverse
     * @param userId The user ID performing the undo
     * @param note Optional note for the reversal
     * @returns True if successful
     */
    async undoLoanWriteOff(loanId, transactionId, userId, note) {
        logger_1.logger.info('Undoing loan write-off', {
            loanId,
            transactionId,
            userId
        });
        return db_1.db.transaction(async (client) => {
            try {
                // Get write-off transaction details
                const txnResult = await client.query(`SELECT transaction_date, amount, principal_portion, interest_portion, 
           fee_charges_portion, penalty_charges_portion, is_reversed
           FROM m_loan_transaction 
           WHERE id = $1 AND loan_id = $2 AND transaction_type_enum = 6`, [transactionId, loanId]);
                if (txnResult.rowCount === 0) {
                    throw new Error('Write-off transaction not found');
                }
                const txn = txnResult.rows[0];
                // Check if already reversed
                if (txn.is_reversed) {
                    throw new Error('Write-off transaction is already reversed');
                }
                // Get loan details
                const loanResult = await client.query('SELECT loan_status FROM loan WHERE id = $1', [loanId]);
                if (loanResult.rowCount === 0) {
                    throw new Error('Loan not found');
                }
                const loan = loanResult.rows[0];
                // Mark transaction as reversed
                await client.query(`UPDATE m_loan_transaction SET
            is_reversed = true,
            updated_by = $1,
            updated_on = NOW()
           WHERE id = $2`, [userId, transactionId]);
                // Update loan status and balances
                await client.query(`UPDATE loan SET
            loan_status = 'active',
            principal_writtenoff_derived = principal_writtenoff_derived - $1,
            interest_writtenoff_derived = interest_writtenoff_derived - $2,
            fee_charges_writtenoff_derived = fee_charges_writtenoff_derived - $3,
            penalty_charges_writtenoff_derived = penalty_charges_writtenoff_derived - $4,
            principal_outstanding_derived = principal_outstanding_derived + $1,
            interest_outstanding_derived = interest_outstanding_derived + $2,
            fee_charges_outstanding_derived = fee_charges_outstanding_derived + $3,
            penalty_charges_outstanding_derived = penalty_charges_outstanding_derived + $4,
            total_outstanding_derived = total_outstanding_derived + $5,
            writtenoff_on_date = NULL,
            closed_on_date = NULL,
            updated_by = $6,
            updated_on = NOW()
           WHERE id = $7`, [
                    txn.principal_portion,
                    txn.interest_portion,
                    txn.fee_charges_portion,
                    txn.penalty_charges_portion,
                    txn.amount,
                    userId,
                    loanId
                ]);
                // Mark write-off record as reversed
                await client.query(`UPDATE m_loan_write_off SET
            is_reversed = true,
            reversed_on_date = NOW(),
            reversed_by_user_id = $1,
            reversal_note = $2
           WHERE transaction_id = $3`, [userId, note || 'Write-off reversed', transactionId]);
                return true;
            }
            catch (error) {
                logger_1.logger.error('Error undoing loan write-off', { loanId, transactionId, error });
                throw new Error(`Failed to undo loan write-off: ${error.message}`);
            }
        });
    }
    /**
     * Get write-off details for a loan
     *
     * @param loanId The loan ID
     * @returns Array of write-off details for the loan
     */
    async getWriteOffHistory(loanId) {
        try {
            const result = await db_1.db.query(`SELECT wo.id, wo.loan_id, wo.write_off_date, wo.write_off_strategy, 
         wo.write_off_amount, wo.write_off_reason_id, wr.code as write_off_reason_code,
         wr.name as write_off_reason_name, wo.write_off_reason_comment, 
         wo.submitted_by_user_id, u.username as submitted_by_username,
         wo.transaction_id, wo.outstanding_principal, wo.outstanding_interest, 
         wo.outstanding_fees, wo.outstanding_penalties, wo.reference,
         wo.is_reversed, wo.reversed_on_date, wo.reversed_by_user_id, 
         ru.username as reversed_by_username, wo.reversal_note,
         wo.created_date
         FROM m_loan_write_off wo
         LEFT JOIN m_code_value wr ON wo.write_off_reason_id = wr.id
         LEFT JOIN app_user u ON wo.submitted_by_user_id = u.id
         LEFT JOIN app_user ru ON wo.reversed_by_user_id = ru.id
         WHERE wo.loan_id = $1
         ORDER BY wo.write_off_date DESC`, [loanId]);
            return result.rows;
        }
        catch (error) {
            logger_1.logger.error('Error getting write-off history', { loanId, error });
            throw new Error(`Failed to get write-off history: ${error.message}`);
        }
    }
}
exports.LoanWriteOffService = LoanWriteOffService;
