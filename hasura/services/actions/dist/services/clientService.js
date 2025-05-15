"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientService = void 0;
const logger_1 = require("../utils/logger");
// Custom error type
class ClientServiceError extends Error {
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = 'ClientServiceError';
    }
}
class ClientService {
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Get a list of clients with pagination and filtering
     */
    async listClients(params) {
        const { officeId, status, name, externalId, limit, offset, orderBy, sortOrder } = params;
        try {
            const queryParams = [officeId];
            let query = `
        SELECT c.*, o.name as office_name, s.display_name as staff_name,
        CASE 
          WHEN c.client_type = 'person' THEN 'person'
          ELSE 'entity'
        END as legal_form
        FROM fineract_default.client c
        JOIN fineract_default.office o ON c.office_id = o.id
        LEFT JOIN fineract_default.staff s ON c.staff_id = s.id
        WHERE c.office_id = $1
      `;
            let paramIndex = 2;
            if (status) {
                query += ` AND c.status = $${paramIndex}`;
                queryParams.push(status);
                paramIndex++;
            }
            if (name) {
                query += ` AND (c.firstname ILIKE $${paramIndex} OR c.lastname ILIKE $${paramIndex} OR c.fullname ILIKE $${paramIndex} OR c.display_name ILIKE $${paramIndex})`;
                queryParams.push(`%${name}%`);
                paramIndex++;
            }
            if (externalId) {
                query += ` AND c.external_id = $${paramIndex}`;
                queryParams.push(externalId);
                paramIndex++;
            }
            // Count total records for pagination
            const countQuery = `SELECT COUNT(*) FROM (${query}) as count_query`;
            const countResult = await this.pool.query(countQuery, queryParams);
            const totalCount = parseInt(countResult.rows[0].count, 10);
            // Add sorting and pagination
            query += ` ORDER BY c.${orderBy} ${sortOrder} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            queryParams.push(limit, offset);
            const result = await this.pool.query(query, queryParams);
            return {
                totalCount,
                clients: result.rows.map(row => ({
                    id: row.id,
                    accountNo: row.account_no,
                    externalId: row.external_id,
                    status: row.status,
                    subStatus: row.sub_status,
                    activationDate: row.activation_date,
                    officeId: row.office_id,
                    officeName: row.office_name,
                    staffId: row.staff_id,
                    staffName: row.staff_name,
                    submittedDate: row.submitted_date,
                    mobileNo: row.mobile_no,
                    emailAddress: row.email_address,
                    dateOfBirth: row.date_of_birth,
                    gender: row.gender,
                    clientType: row.client_type,
                    legalForm: row.legal_form,
                    firstname: row.firstname,
                    middlename: row.middlename,
                    lastname: row.lastname,
                    fullname: row.fullname,
                    displayName: row.display_name
                }))
            };
        }
        catch (error) {
            logger_1.logger.error('Error in listClients:', error);
            throw new ClientServiceError(`Failed to retrieve clients: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get client by ID with details
     */
    async getClientById(clientId) {
        try {
            // Get client basic information
            const clientQuery = `
        SELECT c.*, o.name as office_name, s.display_name as staff_name,
        CASE 
          WHEN c.client_type = 'person' THEN 'person'
          ELSE 'entity'
        END as legal_form,
        cv_class.code_value as classification_value,
        cv_type.code_value as client_type_value
        FROM fineract_default.client c
        JOIN fineract_default.office o ON c.office_id = o.id
        LEFT JOIN fineract_default.staff s ON c.staff_id = s.id
        LEFT JOIN fineract_default.code_value cv_class ON c.client_classification_cv_id = cv_class.id
        LEFT JOIN fineract_default.code_value cv_type ON c.client_type_cv_id = cv_type.id
        WHERE c.id = $1
      `;
            const clientResult = await this.pool.query(clientQuery, [clientId]);
            if (clientResult.rows.length === 0) {
                return null;
            }
            const client = clientResult.rows[0];
            // Get client identifiers
            const identifiersQuery = `
        SELECT ci.*, cv.code_value as document_type
        FROM fineract_default.client_identifier ci
        JOIN fineract_default.code_value cv ON ci.document_type_id = cv.id
        WHERE ci.client_id = $1
      `;
            const identifiersResult = await this.pool.query(identifiersQuery, [clientId]);
            // Get client addresses
            const addressesQuery = `
        SELECT *
        FROM fineract_default.client_address
        WHERE client_id = $1
      `;
            const addressesResult = await this.pool.query(addressesQuery, [clientId]);
            // Get family members
            const familyMembersQuery = `
        SELECT fm.*, cv.code_value as relationship
        FROM fineract_default.client_family_member fm
        LEFT JOIN fineract_default.code_value cv ON fm.relationship_id = cv.id
        WHERE fm.client_id = $1
      `;
            const familyMembersResult = await this.pool.query(familyMembersQuery, [clientId]);
            // Get notes
            const notesQuery = `
        SELECT *
        FROM fineract_default.client_note
        WHERE client_id = $1
        ORDER BY created_date DESC
      `;
            const notesResult = await this.pool.query(notesQuery, [clientId]);
            // Get documents
            const documentsQuery = `
        SELECT *
        FROM fineract_default.client_document
        WHERE client_id = $1
      `;
            const documentsResult = await this.pool.query(documentsQuery, [clientId]);
            // Format the response
            return {
                id: client.id,
                accountNo: client.account_no,
                externalId: client.external_id,
                status: client.status,
                subStatus: client.sub_status,
                activationDate: client.activation_date,
                officeId: client.office_id,
                officeName: client.office_name,
                staffId: client.staff_id,
                staffName: client.staff_name,
                submittedDate: client.submitted_date,
                mobileNo: client.mobile_no,
                emailAddress: client.email_address,
                dateOfBirth: client.date_of_birth,
                gender: client.gender,
                clientType: client.client_type,
                clientTypeValue: client.client_type_value,
                clientClassification: client.client_classification_cv_id,
                clientClassificationValue: client.classification_value,
                legalForm: client.legal_form,
                firstname: client.firstname,
                middlename: client.middlename,
                lastname: client.lastname,
                fullname: client.fullname,
                displayName: client.display_name,
                createdDate: client.created_date,
                lastModifiedDate: client.last_modified_date,
                closedDate: client.closed_date,
                reopenedDate: client.reopened_date,
                identifiers: identifiersResult.rows.map(row => ({
                    id: row.id,
                    documentType: row.document_type,
                    documentTypeId: row.document_type_id,
                    documentKey: row.document_key,
                    description: row.description,
                    status: row.status
                })),
                addresses: addressesResult.rows.map(row => ({
                    id: row.id,
                    addressType: row.address_type,
                    addressLine1: row.address_line_1,
                    addressLine2: row.address_line_2,
                    addressLine3: row.address_line_3,
                    city: row.city,
                    stateProvince: row.state_province,
                    country: row.country,
                    postalCode: row.postal_code,
                    isActive: row.is_active
                })),
                familyMembers: familyMembersResult.rows.map(row => ({
                    id: row.id,
                    firstname: row.firstname,
                    middlename: row.middlename,
                    lastname: row.lastname,
                    qualification: row.qualification,
                    mobileNumber: row.mobile_number,
                    age: row.age,
                    isDependent: row.is_dependent,
                    relationshipId: row.relationship_id,
                    relationship: row.relationship,
                    maritalStatus: row.marital_status,
                    gender: row.gender,
                    dateOfBirth: row.date_of_birth,
                    profession: row.profession
                })),
                notes: notesResult.rows.map(row => ({
                    id: row.id,
                    note: row.note,
                    createdDate: row.created_date,
                    createdBy: row.created_by
                })),
                documents: documentsResult.rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    fileName: row.file_name,
                    size: row.size,
                    type: row.type,
                    description: row.description,
                    location: row.location
                }))
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getClientById:', error);
            throw new ClientServiceError(`Failed to retrieve client: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Create a new client
     */
    async createClient(data) {
        const dbClient = await this.pool.connect();
        try {
            await dbClient.query('BEGIN');
            // Generate display name based on client type
            let displayName = data.fullname;
            if (!displayName && data.firstname) {
                displayName = [data.firstname, data.lastname].filter(Boolean).join(' ');
            }
            // Determine client type and legal form
            const clientType = data.fullname ? 'entity' : 'person';
            const legalFormId = clientType === 'person' ? 1 : 2; // Assuming 1 = person, 2 = entity in code_value
            // Insert client record
            const clientQuery = `
        INSERT INTO fineract_default.client(
          office_id, firstname, middlename, lastname, fullname, display_name, 
          mobile_no, email_address, external_id, staff_id, date_of_birth, 
          gender, client_type, client_classification_cv_id, legal_form_id, is_staff,
          status, activation_date, submitted_date, created_date, last_modified_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING *
      `;
            // Set default status as 'pending'
            let status = 'pending';
            let activationDate = null;
            // If active is true, set status to 'active' and use activation date
            if (data.active) {
                status = 'active';
                activationDate = data.activationDate || data.submittedDate;
            }
            const clientResult = await dbClient.query(clientQuery, [
                data.officeId,
                data.firstname || null,
                null, // middlename
                data.lastname || null,
                data.fullname || null,
                displayName,
                data.mobileNo || null,
                data.emailAddress || null,
                data.externalId || null,
                data.staffId || null,
                data.dateOfBirth || null,
                data.gender || null,
                clientType,
                data.clientClassification || null,
                legalFormId,
                data.isStaff || false,
                status,
                activationDate,
                data.submittedDate,
            ]);
            // Insert audit record
            const auditQuery = `
        INSERT INTO fineract_default.client_audit(
          client_id, action, action_date, entity_name, resource_id, changes, created_date
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, CURRENT_TIMESTAMP)
      `;
            await dbClient.query(auditQuery, [
                clientResult.rows[0].id,
                'CREATE',
                'CLIENT',
                clientResult.rows[0].id,
                JSON.stringify({ new: clientResult.rows[0] }),
            ]);
            await dbClient.query('COMMIT');
            // Return created client
            return {
                resourceId: clientResult.rows[0].id,
                officeId: clientResult.rows[0].office_id,
                clientId: clientResult.rows[0].id,
                resourceIdentifier: clientResult.rows[0].account_no
            };
        }
        catch (error) {
            await dbClient.query('ROLLBACK');
            logger_1.logger.error('Error in createClient:', error);
            throw new ClientServiceError(`Failed to create client: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            dbClient.release();
        }
    }
    /**
     * Update an existing client
     */
    async updateClient(clientId, data) {
        const dbClient = await this.pool.connect();
        try {
            await dbClient.query('BEGIN');
            // Retrieve current client data
            const currentClientQuery = `SELECT * FROM fineract_default.client WHERE id = $1`;
            const currentClientResult = await dbClient.query(currentClientQuery, [clientId]);
            if (currentClientResult.rows.length === 0) {
                return null;
            }
            const currentClient = currentClientResult.rows[0];
            // Generate display name based on client type
            let displayName = data.fullname || currentClient.fullname;
            if (!displayName) {
                const firstname = data.firstname !== undefined ? data.firstname : currentClient.firstname;
                const lastname = data.lastname !== undefined ? data.lastname : currentClient.lastname;
                displayName = [firstname, lastname].filter(Boolean).join(' ');
            }
            // Determine client type and legal form
            let clientType = currentClient.client_type;
            let legalFormId = currentClient.legal_form_id;
            if (data.fullname && !currentClient.fullname) {
                // Changing from person to entity
                clientType = 'entity';
                legalFormId = 2; // Entity
            }
            else if (!data.fullname && data.firstname && !currentClient.firstname) {
                // Changing from entity to person
                clientType = 'person';
                legalFormId = 1; // Person
            }
            // Build update query dynamically
            let updateQuery = 'UPDATE fineract_default.client SET ';
            const updateValues = [];
            const updateFields = [];
            let paramCounter = 1;
            // Helper function to add fields to update
            const addUpdateField = (fieldName, value, dbFieldName) => {
                if (value !== undefined) {
                    updateFields.push(`${dbFieldName || fieldName} = $${paramCounter}`);
                    updateValues.push(value);
                    paramCounter++;
                }
            };
            // Add fields to update
            addUpdateField('firstname', data.firstname);
            addUpdateField('lastname', data.lastname);
            addUpdateField('fullname', data.fullname);
            addUpdateField('display_name', displayName);
            addUpdateField('mobile_no', data.mobileNo);
            addUpdateField('email_address', data.emailAddress);
            addUpdateField('external_id', data.externalId);
            addUpdateField('staff_id', data.staffId);
            addUpdateField('date_of_birth', data.dateOfBirth);
            addUpdateField('gender', data.gender);
            addUpdateField('client_type', clientType);
            addUpdateField('client_classification_cv_id', data.clientClassification);
            addUpdateField('legal_form_id', legalFormId);
            addUpdateField('is_staff', data.isStaff);
            addUpdateField('last_modified_date', 'CURRENT_TIMESTAMP');
            if (updateFields.length === 0) {
                // No fields to update
                await dbClient.query('ROLLBACK');
                return {
                    resourceId: clientId,
                    officeId: currentClient.office_id,
                    clientId: clientId,
                    changes: {}
                };
            }
            // Complete the update query
            updateQuery += updateFields.join(', ');
            updateQuery += ` WHERE id = $${paramCounter} RETURNING *`;
            updateValues.push(clientId);
            // Execute update
            const updateResult = await dbClient.query(updateQuery, updateValues);
            // Insert audit record
            const auditQuery = `
        INSERT INTO fineract_default.client_audit(
          client_id, action, action_date, entity_name, resource_id, changes, created_date
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, CURRENT_TIMESTAMP)
      `;
            await dbClient.query(auditQuery, [
                clientId,
                'UPDATE',
                'CLIENT',
                clientId,
                JSON.stringify({
                    old: currentClient,
                    new: updateResult.rows[0]
                }),
            ]);
            await dbClient.query('COMMIT');
            // Return updated client
            return {
                resourceId: clientId,
                officeId: updateResult.rows[0].office_id,
                clientId: clientId,
                changes: updateResult.rows[0]
            };
        }
        catch (error) {
            await dbClient.query('ROLLBACK');
            logger_1.logger.error('Error in updateClient:', error);
            throw new ClientServiceError(`Failed to update client: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            dbClient.release();
        }
    }
    /**
     * Activate a client
     */
    async activateClient(clientId, activationDate) {
        const dbClient = await this.pool.connect();
        try {
            await dbClient.query('BEGIN');
            // Get current client status
            const statusQuery = `SELECT status, office_id FROM fineract_default.client WHERE id = $1`;
            const statusResult = await dbClient.query(statusQuery, [clientId]);
            if (statusResult.rows.length === 0) {
                return null;
            }
            if (statusResult.rows[0].status === 'active') {
                throw new ClientServiceError('Client is already active');
            }
            if (statusResult.rows[0].status !== 'pending') {
                throw new ClientServiceError(`Cannot activate client with status: ${statusResult.rows[0].status}`);
            }
            // Update client status
            const updateQuery = `
        UPDATE fineract_default.client 
        SET status = 'active', activation_date = $1, office_joining_date = $1, 
            last_modified_date = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
            const updateResult = await dbClient.query(updateQuery, [activationDate, clientId]);
            // Insert audit record
            const auditQuery = `
        INSERT INTO fineract_default.client_audit(
          client_id, action, action_date, entity_name, resource_id, changes, 
          office_id, created_date
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;
            await dbClient.query(auditQuery, [
                clientId,
                'ACTIVATE',
                'CLIENT',
                clientId,
                JSON.stringify({ activationDate }),
                statusResult.rows[0].office_id
            ]);
            await dbClient.query('COMMIT');
            return {
                resourceId: clientId,
                officeId: updateResult.rows[0].office_id,
                clientId: clientId,
                activationDate
            };
        }
        catch (error) {
            await dbClient.query('ROLLBACK');
            logger_1.logger.error('Error in activateClient:', error);
            if (error instanceof ClientServiceError) {
                throw error;
            }
            throw new ClientServiceError(`Failed to activate client: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            dbClient.release();
        }
    }
    /**
     * Close a client
     */
    async closeClient(clientId, closureDate, closureReasonId) {
        const dbClient = await this.pool.connect();
        try {
            await dbClient.query('BEGIN');
            // Check if client has active loans or savings accounts
            const loansQuery = `
        SELECT COUNT(*) FROM fineract_default.loan 
        WHERE client_id = $1 AND status IN ('submitted', 'approved', 'active')
      `;
            const savingsQuery = `
        SELECT COUNT(*) FROM fineract_default.savings_account 
        WHERE client_id = $1 AND status IN ('submitted', 'approved', 'active')
      `;
            const loansResult = await dbClient.query(loansQuery, [clientId]);
            const savingsResult = await dbClient.query(savingsQuery, [clientId]);
            if (parseInt(loansResult.rows[0].count) > 0) {
                throw new ClientServiceError('Cannot close client with active loans');
            }
            if (parseInt(savingsResult.rows[0].count) > 0) {
                throw new ClientServiceError('Cannot close client with active savings accounts');
            }
            // Get current client data
            const clientQuery = `SELECT status, office_id FROM fineract_default.client WHERE id = $1`;
            const clientResult = await dbClient.query(clientQuery, [clientId]);
            if (clientResult.rows.length === 0) {
                return null;
            }
            if (clientResult.rows[0].status !== 'active') {
                throw new ClientServiceError(`Cannot close client with status: ${clientResult.rows[0].status}`);
            }
            // Update client status
            const updateQuery = `
        UPDATE fineract_default.client 
        SET status = 'closed', closed_date = $1, closure_reason_id = $2, 
            last_modified_date = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
            const updateResult = await dbClient.query(updateQuery, [closureDate, closureReasonId, clientId]);
            // Insert audit record
            const auditQuery = `
        INSERT INTO fineract_default.client_audit(
          client_id, action, action_date, entity_name, resource_id, changes, 
          office_id, created_date
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;
            await dbClient.query(auditQuery, [
                clientId,
                'CLOSE',
                'CLIENT',
                clientId,
                JSON.stringify({ closureDate, closureReasonId }),
                clientResult.rows[0].office_id
            ]);
            await dbClient.query('COMMIT');
            return {
                resourceId: clientId,
                officeId: updateResult.rows[0].office_id,
                clientId: clientId,
                closureDate
            };
        }
        catch (error) {
            await dbClient.query('ROLLBACK');
            logger_1.logger.error('Error in closeClient:', error);
            if (error instanceof ClientServiceError) {
                throw error;
            }
            throw new ClientServiceError(`Failed to close client: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            dbClient.release();
        }
    }
    /**
     * Reject a client application
     */
    async rejectClient(clientId, rejectionDate, rejectionReasonId) {
        const dbClient = await this.pool.connect();
        try {
            await dbClient.query('BEGIN');
            // Get current client data
            const clientQuery = `SELECT status, office_id FROM fineract_default.client WHERE id = $1`;
            const clientResult = await dbClient.query(clientQuery, [clientId]);
            if (clientResult.rows.length === 0) {
                return null;
            }
            if (clientResult.rows[0].status !== 'pending') {
                throw new ClientServiceError(`Cannot reject client with status: ${clientResult.rows[0].status}`);
            }
            // Update client status
            const updateQuery = `
        UPDATE fineract_default.client 
        SET status = 'rejected', rejection_date = $1, rejection_reason_id = $2, 
            last_modified_date = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
            const updateResult = await dbClient.query(updateQuery, [rejectionDate, rejectionReasonId, clientId]);
            // Insert audit record
            const auditQuery = `
        INSERT INTO fineract_default.client_audit(
          client_id, action, action_date, entity_name, resource_id, changes, 
          office_id, created_date
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;
            await dbClient.query(auditQuery, [
                clientId,
                'REJECT',
                'CLIENT',
                clientId,
                JSON.stringify({ rejectionDate, rejectionReasonId }),
                clientResult.rows[0].office_id
            ]);
            await dbClient.query('COMMIT');
            return {
                resourceId: clientId,
                officeId: updateResult.rows[0].office_id,
                clientId: clientId,
                rejectionDate
            };
        }
        catch (error) {
            await dbClient.query('ROLLBACK');
            logger_1.logger.error('Error in rejectClient:', error);
            if (error instanceof ClientServiceError) {
                throw error;
            }
            throw new ClientServiceError(`Failed to reject client: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            dbClient.release();
        }
    }
    /**
     * Withdraw a client application
     */
    async withdrawClient(clientId, withdrawalDate, withdrawalReasonId) {
        const dbClient = await this.pool.connect();
        try {
            await dbClient.query('BEGIN');
            // Get current client data
            const clientQuery = `SELECT status, office_id FROM fineract_default.client WHERE id = $1`;
            const clientResult = await dbClient.query(clientQuery, [clientId]);
            if (clientResult.rows.length === 0) {
                return null;
            }
            if (clientResult.rows[0].status !== 'pending') {
                throw new ClientServiceError(`Cannot withdraw client with status: ${clientResult.rows[0].status}`);
            }
            // Update client status
            const updateQuery = `
        UPDATE fineract_default.client 
        SET status = 'withdrawn', withdrawal_date = $1, withdrawal_reason_id = $2, 
            last_modified_date = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING *
      `;
            const updateResult = await dbClient.query(updateQuery, [withdrawalDate, withdrawalReasonId, clientId]);
            // Insert audit record
            const auditQuery = `
        INSERT INTO fineract_default.client_audit(
          client_id, action, action_date, entity_name, resource_id, changes, 
          office_id, created_date
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;
            await dbClient.query(auditQuery, [
                clientId,
                'WITHDRAW',
                'CLIENT',
                clientId,
                JSON.stringify({ withdrawalDate, withdrawalReasonId }),
                clientResult.rows[0].office_id
            ]);
            await dbClient.query('COMMIT');
            return {
                resourceId: clientId,
                officeId: updateResult.rows[0].office_id,
                clientId: clientId,
                withdrawalDate
            };
        }
        catch (error) {
            await dbClient.query('ROLLBACK');
            logger_1.logger.error('Error in withdrawClient:', error);
            if (error instanceof ClientServiceError) {
                throw error;
            }
            throw new ClientServiceError(`Failed to withdraw client: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            dbClient.release();
        }
    }
    /**
     * Reactivate a closed, rejected, or withdrawn client
     */
    async reactivateClient(clientId, reactivationDate) {
        const dbClient = await this.pool.connect();
        try {
            await dbClient.query('BEGIN');
            // Get current client data
            const clientQuery = `SELECT status, office_id FROM fineract_default.client WHERE id = $1`;
            const clientResult = await dbClient.query(clientQuery, [clientId]);
            if (clientResult.rows.length === 0) {
                return null;
            }
            if (!['closed', 'rejected', 'withdrawn'].includes(clientResult.rows[0].status)) {
                throw new ClientServiceError(`Cannot reactivate client with status: ${clientResult.rows[0].status}`);
            }
            // Update client status
            const updateQuery = `
        UPDATE fineract_default.client 
        SET status = 'pending', reopened_date = $1, 
            last_modified_date = CURRENT_TIMESTAMP,
            closed_date = NULL, closure_reason_id = NULL,
            rejection_date = NULL, rejection_reason_id = NULL,
            withdrawal_date = NULL, withdrawal_reason_id = NULL
        WHERE id = $2
        RETURNING *
      `;
            const updateResult = await dbClient.query(updateQuery, [reactivationDate, clientId]);
            // Insert audit record
            const auditQuery = `
        INSERT INTO fineract_default.client_audit(
          client_id, action, action_date, entity_name, resource_id, changes, 
          office_id, created_date
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `;
            await dbClient.query(auditQuery, [
                clientId,
                'REACTIVATE',
                'CLIENT',
                clientId,
                JSON.stringify({ reactivationDate }),
                clientResult.rows[0].office_id
            ]);
            await dbClient.query('COMMIT');
            return {
                resourceId: clientId,
                officeId: updateResult.rows[0].office_id,
                clientId: clientId,
                reactivationDate
            };
        }
        catch (error) {
            await dbClient.query('ROLLBACK');
            logger_1.logger.error('Error in reactivateClient:', error);
            if (error instanceof ClientServiceError) {
                throw error;
            }
            throw new ClientServiceError(`Failed to reactivate client: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            dbClient.release();
        }
    }
    /**
     * Add a client identifier
     */
    async addClientIdentifier(clientId, data) {
        const dbClient = await this.pool.connect();
        try {
            await dbClient.query('BEGIN');
            // Check if client exists
            const clientQuery = `SELECT id FROM fineract_default.client WHERE id = $1`;
            const clientResult = await dbClient.query(clientQuery, [clientId]);
            if (clientResult.rows.length === 0) {
                throw new ClientServiceError('Client not found');
            }
            // Check if document type exists
            const docTypeQuery = `SELECT id FROM fineract_default.code_value WHERE id = $1`;
            const docTypeResult = await dbClient.query(docTypeQuery, [data.documentTypeId]);
            if (docTypeResult.rows.length === 0) {
                throw new ClientServiceError('Document type not found');
            }
            // Check if the identifier already exists for this client
            const existingQuery = `
        SELECT id FROM fineract_default.client_identifier 
        WHERE client_id = $1 AND document_type_id = $2 AND document_key = $3
      `;
            const existingResult = await dbClient.query(existingQuery, [
                clientId,
                data.documentTypeId,
                data.documentKey
            ]);
            if (existingResult.rows.length > 0) {
                throw new ClientServiceError('This identifier already exists for the client');
            }
            // Insert identifier
            const identifierQuery = `
        INSERT INTO fineract_default.client_identifier(
          client_id, document_type_id, document_key, description, status, 
          created_date, last_modified_date
        ) VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `;
            const identifierResult = await dbClient.query(identifierQuery, [
                clientId,
                data.documentTypeId,
                data.documentKey,
                data.description || null
            ]);
            await dbClient.query('COMMIT');
            return {
                resourceId: identifierResult.rows[0].id,
                clientId: clientId,
                resourceIdentifier: data.documentKey
            };
        }
        catch (error) {
            await dbClient.query('ROLLBACK');
            logger_1.logger.error('Error in addClientIdentifier:', error);
            if (error instanceof ClientServiceError) {
                throw error;
            }
            throw new ClientServiceError(`Failed to add client identifier: ${error instanceof Error ? error.message : String(error)}`);
        }
        finally {
            dbClient.release();
        }
    }
    /**
     * Get client accounts summary
     */
    async getClientAccountsSummary(clientId) {
        try {
            // Check if client exists
            const clientQuery = `SELECT id FROM fineract_default.client WHERE id = $1`;
            const clientResult = await this.pool.query(clientQuery, [clientId]);
            if (clientResult.rows.length === 0) {
                throw new ClientServiceError('Client not found');
            }
            // Get loan accounts
            const loanAccountsQuery = `
        SELECT l.id, l.account_no, l.external_id, l.status, p.name as product_name,
               l.loan_type, l.principal_amount, l.disbursedon_date, l.expected_maturity_date,
               l.total_outstanding
        FROM fineract_default.loan l
        JOIN fineract_default.loan_product p ON l.product_id = p.id
        WHERE l.client_id = $1
        ORDER BY l.submitted_on_date DESC
      `;
            const loanAccountsResult = await this.pool.query(loanAccountsQuery, [clientId]);
            // Get savings accounts
            const savingsAccountsQuery = `
        SELECT s.id, s.account_no, s.external_id, s.status, p.name as product_name,
               s.account_type, s.currency_code, s.account_balance
        FROM fineract_default.savings_account s
        JOIN fineract_default.savings_product p ON s.product_id = p.id
        WHERE s.client_id = $1
        ORDER BY s.submitted_on_date DESC
      `;
            const savingsAccountsResult = await this.pool.query(savingsAccountsQuery, [clientId]);
            return {
                loanAccounts: loanAccountsResult.rows.map(row => ({
                    id: row.id,
                    accountNo: row.account_no,
                    externalId: row.external_id,
                    status: row.status,
                    productName: row.product_name,
                    loanType: row.loan_type,
                    principalAmount: row.principal_amount,
                    disbursedDate: row.disbursedon_date,
                    expectedMaturityDate: row.expected_maturity_date,
                    totalOutstanding: row.total_outstanding
                })),
                savingsAccounts: savingsAccountsResult.rows.map(row => ({
                    id: row.id,
                    accountNo: row.account_no,
                    externalId: row.external_id,
                    status: row.status,
                    productName: row.product_name,
                    accountType: row.account_type,
                    currencyCode: row.currency_code,
                    accountBalance: row.account_balance
                }))
            };
        }
        catch (error) {
            logger_1.logger.error('Error in getClientAccountsSummary:', error);
            if (error instanceof ClientServiceError) {
                throw error;
            }
            throw new ClientServiceError(`Failed to retrieve client accounts summary: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Add a client address
     */
    async addClientAddress(clientId, data) {
        try {
            // Check if client exists
            const clientQuery = `SELECT id FROM fineract_default.client WHERE id = $1`;
            const clientResult = await this.pool.query(clientQuery, [clientId]);
            if (clientResult.rows.length === 0) {
                throw new ClientServiceError('Client not found');
            }
            // Insert address
            const addressQuery = `
        INSERT INTO fineract_default.client_address(
          client_id, address_type, address_line_1, address_line_2, address_line_3, 
          city, state_province, country, postal_code, is_active, 
          created_date, last_modified_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `;
            const addressResult = await this.pool.query(addressQuery, [
                clientId,
                data.addressType,
                data.addressLine1 || null,
                data.addressLine2 || null,
                data.addressLine3 || null,
                data.city || null,
                data.stateProvince || null,
                data.country || null,
                data.postalCode || null,
                data.isActive
            ]);
            return {
                resourceId: addressResult.rows[0].id,
                clientId: clientId,
                addressType: data.addressType
            };
        }
        catch (error) {
            logger_1.logger.error('Error in addClientAddress:', error);
            if (error instanceof ClientServiceError) {
                throw error;
            }
            throw new ClientServiceError(`Failed to add client address: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Add a family member
     */
    async addFamilyMember(clientId, data) {
        try {
            // Check if client exists
            const clientQuery = `SELECT id FROM fineract_default.client WHERE id = $1`;
            const clientResult = await this.pool.query(clientQuery, [clientId]);
            if (clientResult.rows.length === 0) {
                throw new ClientServiceError('Client not found');
            }
            // Insert family member
            const familyMemberQuery = `
        INSERT INTO fineract_default.client_family_member(
          client_id, firstname, middlename, lastname, qualification, mobile_number, 
          age, is_dependent, relationship_id, marital_status, gender, date_of_birth, profession, 
          created_date, last_modified_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `;
            const familyMemberResult = await this.pool.query(familyMemberQuery, [
                clientId,
                data.firstname,
                data.middlename || null,
                data.lastname || null,
                data.qualification || null,
                data.mobileNumber || null,
                data.age || null,
                data.isDependent,
                data.relationshipId || null,
                data.maritalStatus || null,
                data.gender || null,
                data.dateOfBirth || null,
                data.profession || null
            ]);
            return {
                resourceId: familyMemberResult.rows[0].id,
                clientId: clientId,
                firstname: data.firstname
            };
        }
        catch (error) {
            logger_1.logger.error('Error in addFamilyMember:', error);
            if (error instanceof ClientServiceError) {
                throw error;
            }
            throw new ClientServiceError(`Failed to add family member: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Add a client document
     */
    async addClientDocument(clientId, data) {
        try {
            // Check if client exists
            const clientQuery = `SELECT id FROM fineract_default.client WHERE id = $1`;
            const clientResult = await this.pool.query(clientQuery, [clientId]);
            if (clientResult.rows.length === 0) {
                throw new ClientServiceError('Client not found');
            }
            // Insert document
            const documentQuery = `
        INSERT INTO fineract_default.client_document(
          client_id, name, file_name, size, type, description, location, 
          storage_type, created_date, last_modified_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'filesystem', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `;
            const documentResult = await this.pool.query(documentQuery, [
                clientId,
                data.name,
                data.fileName,
                data.size || null,
                data.type || null,
                data.description || null,
                data.location
            ]);
            return {
                resourceId: documentResult.rows[0].id,
                clientId: clientId,
                name: data.name,
                fileName: data.fileName
            };
        }
        catch (error) {
            logger_1.logger.error('Error in addClientDocument:', error);
            if (error instanceof ClientServiceError) {
                throw error;
            }
            throw new ClientServiceError(`Failed to add client document: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.ClientService = ClientService;
