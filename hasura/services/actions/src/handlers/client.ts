import { Router } from 'express';
import { validateRequest } from '../utils/validator';
import { ClientService } from '../services/clientService';
import { logger } from '../utils/logger';
import { pool } from '../utils/db';

const router = Router();
const clientService = new ClientService(pool);

// Get client list with pagination and filtering
router.post('/list', validateRequest(['officeId']), async (req, res, next) => {
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
  } catch (error) {
    logger.error('Error retrieving client list:', error);
    next(error);
  }
});

// Get client by ID
router.post('/get', validateRequest(['id']), async (req, res, next) => {
  try {
    const { id } = req.body.input;
    const client = await clientService.getClientById(id);
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    res.json(client);
  } catch (error) {
    logger.error('Error retrieving client:', error);
    next(error);
  }
});

// Create new client
router.post('/create', validateRequest(['officeId']), async (req, res, next) => {
  try {
    const { 
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
      submittedDate
    } = req.body.input;
    
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
  } catch (error) {
    logger.error('Error creating client:', error);
    next(error);
  }
});

// Update client
router.post('/update', validateRequest(['id']), async (req, res, next) => {
  try {
    const { 
      id,
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
    } = req.body.input;
    
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
  } catch (error) {
    logger.error('Error updating client:', error);
    next(error);
  }
});

// Activate client
router.post('/activate', validateRequest(['id', 'activationDate']), async (req, res, next) => {
  try {
    const { id, activationDate } = req.body.input;
    
    const activatedClient = await clientService.activateClient(id, activationDate);
    
    if (!activatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    res.json(activatedClient);
  } catch (error) {
    logger.error('Error activating client:', error);
    next(error);
  }
});

// Close client
router.post('/close', validateRequest(['id', 'closureDate', 'closureReasonId']), async (req, res, next) => {
  try {
    const { id, closureDate, closureReasonId } = req.body.input;
    
    const closedClient = await clientService.closeClient(id, closureDate, closureReasonId);
    
    if (!closedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    res.json(closedClient);
  } catch (error) {
    logger.error('Error closing client:', error);
    next(error);
  }
});

// Reject client
router.post('/reject', validateRequest(['id', 'rejectionDate', 'rejectionReasonId']), async (req, res, next) => {
  try {
    const { id, rejectionDate, rejectionReasonId } = req.body.input;
    
    const rejectedClient = await clientService.rejectClient(id, rejectionDate, rejectionReasonId);
    
    if (!rejectedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    res.json(rejectedClient);
  } catch (error) {
    logger.error('Error rejecting client:', error);
    next(error);
  }
});

// Withdraw client
router.post('/withdraw', validateRequest(['id', 'withdrawalDate', 'withdrawalReasonId']), async (req, res, next) => {
  try {
    const { id, withdrawalDate, withdrawalReasonId } = req.body.input;
    
    const withdrawnClient = await clientService.withdrawClient(id, withdrawalDate, withdrawalReasonId);
    
    if (!withdrawnClient) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    res.json(withdrawnClient);
  } catch (error) {
    logger.error('Error withdrawing client:', error);
    next(error);
  }
});

// Reactivate client
router.post('/reactivate', validateRequest(['id', 'reactivationDate']), async (req, res, next) => {
  try {
    const { id, reactivationDate } = req.body.input;
    
    const reactivatedClient = await clientService.reactivateClient(id, reactivationDate);
    
    if (!reactivatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    res.json(reactivatedClient);
  } catch (error) {
    logger.error('Error reactivating client:', error);
    next(error);
  }
});

// Add client identifier
router.post('/identifier/create', validateRequest(['clientId', 'documentTypeId', 'documentKey']), 
  async (req, res, next) => {
    try {
      const { clientId, documentTypeId, documentKey, description } = req.body.input;
      
      const identifier = await clientService.addClientIdentifier(clientId, {
        documentTypeId,
        documentKey,
        description
      });
      
      res.status(201).json(identifier);
    } catch (error) {
      logger.error('Error adding client identifier:', error);
      next(error);
    }
});

// Get client accounts summary
router.post('/accounts', validateRequest(['clientId']), async (req, res, next) => {
  try {
    const { clientId } = req.body.input;
    
    const accountsSummary = await clientService.getClientAccountsSummary(clientId);
    
    res.json(accountsSummary);
  } catch (error) {
    logger.error('Error retrieving client accounts summary:', error);
    next(error);
  }
});

// Add client address
router.post('/address/create', validateRequest(['clientId', 'addressType']), 
  async (req, res, next) => {
    try {
      const { 
        clientId, 
        addressType, 
        addressLine1, 
        addressLine2, 
        addressLine3,
        city,
        stateProvince,
        country,
        postalCode,
        isActive
      } = req.body.input;
      
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
    } catch (error) {
      logger.error('Error adding client address:', error);
      next(error);
    }
});

// Add client family member
router.post('/family-member/create', validateRequest(['clientId', 'firstname']), 
  async (req, res, next) => {
    try {
      const { 
        clientId, 
        firstname, 
        middlename, 
        lastname,
        qualification,
        mobileNumber,
        age,
        isDependent,
        relationshipId,
        maritalStatus,
        gender,
        dateOfBirth,
        profession
      } = req.body.input;
      
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
    } catch (error) {
      logger.error('Error adding family member:', error);
      next(error);
    }
});

// Add client document
router.post('/document/create', validateRequest(['clientId', 'name', 'fileName', 'location']), 
  async (req, res, next) => {
    try {
      const { 
        clientId, 
        name, 
        fileName, 
        size,
        type,
        description,
        location
      } = req.body.input;
      
      const document = await clientService.addClientDocument(clientId, {
        name,
        fileName,
        size,
        type,
        description,
        location
      });
      
      res.status(201).json(document);
    } catch (error) {
      logger.error('Error adding client document:', error);
      next(error);
    }
});

export const clientRoutes = router;