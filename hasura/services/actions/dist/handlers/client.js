"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientRoutes = void 0;
const express_1 = require("express");
const validator_1 = require("../utils/validator");
const clientService_1 = require("../services/clientService");
const logger_1 = require("../utils/logger");
const db_1 = require("../utils/db");
const router = (0, express_1.Router)();
const clientService = new clientService_1.ClientService(db_1.pool);
// Get client list with pagination and filtering
router.post('/list', (0, validator_1.validateRequest)(['officeId']), async (req, res, next) => {
    try {
        const { officeId, status, name, externalId, limit, offset, orderBy, sortOrder } = req.body.input;
        const clients = await clientService.listClients({
            officeId,
            status,
            name,
            externalId,
            limit: limit || 20,
            offset: offset || 0,
            orderBy: orderBy || 'id',
            sortOrder: sortOrder || 'ASC'
        });
        res.json(clients);
    }
    catch (error) {
        logger_1.logger.error('Error retrieving client list:', error);
        next(error);
    }
});
// Get client by ID
router.post('/get', (0, validator_1.validateRequest)(['id']), async (req, res, next) => {
    try {
        const { id } = req.body.input;
        const client = await clientService.getClientById(id);
        if (!client) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json(client);
    }
    catch (error) {
        logger_1.logger.error('Error retrieving client:', error);
        next(error);
    }
});
// Create new client
router.post('/create', (0, validator_1.validateRequest)(['officeId']), async (req, res, next) => {
    try {
        const { officeId, firstname, lastname, fullname, mobileNo, emailAddress, externalId, staffId, dateOfBirth, gender, clientType, clientClassification, isStaff, active, activationDate, submittedDate } = req.body.input;
        // Input validation based on client type (person or entity)
        if (!fullname && (!firstname || !lastname)) {
            return res.status(400).json({
                message: 'Either fullname for entity or firstname and lastname for person must be provided'
            });
        }
        const newClient = await clientService.createClient({
            officeId,
            firstname,
            lastname,
            fullname,
            mobileNo,
            emailAddress,
            externalId,
            staffId,
            dateOfBirth,
            gender,
            clientType,
            clientClassification,
            isStaff,
            active,
            activationDate,
            submittedDate: submittedDate || new Date().toISOString().split('T')[0],
        });
        res.status(201).json(newClient);
    }
    catch (error) {
        logger_1.logger.error('Error creating client:', error);
        next(error);
    }
});
// Update client
router.post('/update', (0, validator_1.validateRequest)(['id']), async (req, res, next) => {
    try {
        const { id, firstname, lastname, fullname, mobileNo, emailAddress, externalId, staffId, dateOfBirth, gender, clientType, clientClassification, isStaff } = req.body.input;
        const updatedClient = await clientService.updateClient(id, {
            firstname,
            lastname,
            fullname,
            mobileNo,
            emailAddress,
            externalId,
            staffId,
            dateOfBirth,
            gender,
            clientType,
            clientClassification,
            isStaff
        });
        if (!updatedClient) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json(updatedClient);
    }
    catch (error) {
        logger_1.logger.error('Error updating client:', error);
        next(error);
    }
});
// Activate client
router.post('/activate', (0, validator_1.validateRequest)(['id', 'activationDate']), async (req, res, next) => {
    try {
        const { id, activationDate } = req.body.input;
        const activatedClient = await clientService.activateClient(id, activationDate);
        if (!activatedClient) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json(activatedClient);
    }
    catch (error) {
        logger_1.logger.error('Error activating client:', error);
        next(error);
    }
});
// Close client
router.post('/close', (0, validator_1.validateRequest)(['id', 'closureDate', 'closureReasonId']), async (req, res, next) => {
    try {
        const { id, closureDate, closureReasonId } = req.body.input;
        const closedClient = await clientService.closeClient(id, closureDate, closureReasonId);
        if (!closedClient) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json(closedClient);
    }
    catch (error) {
        logger_1.logger.error('Error closing client:', error);
        next(error);
    }
});
// Reject client
router.post('/reject', (0, validator_1.validateRequest)(['id', 'rejectionDate', 'rejectionReasonId']), async (req, res, next) => {
    try {
        const { id, rejectionDate, rejectionReasonId } = req.body.input;
        const rejectedClient = await clientService.rejectClient(id, rejectionDate, rejectionReasonId);
        if (!rejectedClient) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json(rejectedClient);
    }
    catch (error) {
        logger_1.logger.error('Error rejecting client:', error);
        next(error);
    }
});
// Withdraw client
router.post('/withdraw', (0, validator_1.validateRequest)(['id', 'withdrawalDate', 'withdrawalReasonId']), async (req, res, next) => {
    try {
        const { id, withdrawalDate, withdrawalReasonId } = req.body.input;
        const withdrawnClient = await clientService.withdrawClient(id, withdrawalDate, withdrawalReasonId);
        if (!withdrawnClient) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json(withdrawnClient);
    }
    catch (error) {
        logger_1.logger.error('Error withdrawing client:', error);
        next(error);
    }
});
// Reactivate client
router.post('/reactivate', (0, validator_1.validateRequest)(['id', 'reactivationDate']), async (req, res, next) => {
    try {
        const { id, reactivationDate } = req.body.input;
        const reactivatedClient = await clientService.reactivateClient(id, reactivationDate);
        if (!reactivatedClient) {
            return res.status(404).json({ message: 'Client not found' });
        }
        res.json(reactivatedClient);
    }
    catch (error) {
        logger_1.logger.error('Error reactivating client:', error);
        next(error);
    }
});
// Add client identifier
router.post('/identifier/create', (0, validator_1.validateRequest)(['clientId', 'documentTypeId', 'documentKey']), async (req, res, next) => {
    try {
        const { clientId, documentTypeId, documentKey, description } = req.body.input;
        const identifier = await clientService.addClientIdentifier(clientId, {
            documentTypeId,
            documentKey,
            description
        });
        res.status(201).json(identifier);
    }
    catch (error) {
        logger_1.logger.error('Error adding client identifier:', error);
        next(error);
    }
});
// Get client accounts summary
router.post('/accounts', (0, validator_1.validateRequest)(['clientId']), async (req, res, next) => {
    try {
        const { clientId } = req.body.input;
        const accountsSummary = await clientService.getClientAccountsSummary(clientId);
        res.json(accountsSummary);
    }
    catch (error) {
        logger_1.logger.error('Error retrieving client accounts summary:', error);
        next(error);
    }
});
// Add client address
router.post('/address/create', (0, validator_1.validateRequest)(['clientId', 'addressType']), async (req, res, next) => {
    try {
        const { clientId, addressType, addressLine1, addressLine2, addressLine3, city, stateProvince, country, postalCode, isActive } = req.body.input;
        const address = await clientService.addClientAddress(clientId, {
            addressType,
            addressLine1,
            addressLine2,
            addressLine3,
            city,
            stateProvince,
            country,
            postalCode,
            isActive: isActive !== false // Default to true if not specified
        });
        res.status(201).json(address);
    }
    catch (error) {
        logger_1.logger.error('Error adding client address:', error);
        next(error);
    }
});
// Add client family member
router.post('/family-member/create', (0, validator_1.validateRequest)(['clientId', 'firstname']), async (req, res, next) => {
    try {
        const { clientId, firstname, middlename, lastname, qualification, mobileNumber, age, isDependent, relationshipId, maritalStatus, gender, dateOfBirth, profession } = req.body.input;
        const familyMember = await clientService.addFamilyMember(clientId, {
            firstname,
            middlename,
            lastname,
            qualification,
            mobileNumber,
            age,
            isDependent: isDependent || false,
            relationshipId,
            maritalStatus,
            gender,
            dateOfBirth,
            profession
        });
        res.status(201).json(familyMember);
    }
    catch (error) {
        logger_1.logger.error('Error adding family member:', error);
        next(error);
    }
});
// Add client document
router.post('/document/create', (0, validator_1.validateRequest)(['clientId', 'name', 'fileName', 'location']), async (req, res, next) => {
    try {
        const { clientId, name, fileName, size, type, description, location } = req.body.input;
        const document = await clientService.addClientDocument(clientId, {
            name,
            fileName,
            size,
            type,
            description,
            location
        });
        res.status(201).json(document);
    }
    catch (error) {
        logger_1.logger.error('Error adding client document:', error);
        next(error);
    }
});
exports.clientRoutes = router;
