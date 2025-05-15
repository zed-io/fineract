/**
 * Provisioning Entries Handler
 * 
 * Handles API requests for provisioning categories and entries
 */

import { Router } from 'express';
import { 
  provisioningEntriesService 
} from '../../services/provisioningEntriesService';
import { logger } from '../../utils/logger';

const router = Router();

// Provisioning Category routes
router.post('/provisioning-categories/create', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Create provisioning category request received', { categoryName: input.categoryName });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await provisioningEntriesService.createProvisioningCategory(input, userId);
    
    res.json({
      success: true,
      categoryId: result
    });
  } catch (error) {
    logger.error('Error creating provisioning category', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/provisioning-categories/update', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Update provisioning category request received', { categoryId: input.categoryId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await provisioningEntriesService.updateProvisioningCategory(
      input.categoryId,
      input,
      userId
    );
    
    res.json({
      success: true,
      category: result
    });
  } catch (error) {
    logger.error('Error updating provisioning category', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/provisioning-categories/delete', async (req, res) => {
  try {
    const { input } = req.body;
    logger.info('Delete provisioning category request received', { categoryId: input.categoryId });
    
    const result = await provisioningEntriesService.deleteProvisioningCategory(input.categoryId);
    
    res.json({
      success: true,
      deleted: result
    });
  } catch (error) {
    logger.error('Error deleting provisioning category', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/provisioning-categories/get', async (req, res) => {
  try {
    const { input } = req.body;
    logger.info('Get provisioning category request received', { categoryId: input.categoryId });
    
    const result = await provisioningEntriesService.getProvisioningCategory(input.categoryId);
    
    res.json({
      success: true,
      category: result
    });
  } catch (error) {
    logger.error('Error getting provisioning category', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/provisioning-categories/list', async (req, res) => {
  try {
    logger.info('List provisioning categories request received');
    
    const result = await provisioningEntriesService.getProvisioningCategories();
    
    res.json({
      success: true,
      categories: result.categories
    });
  } catch (error) {
    logger.error('Error listing provisioning categories', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Provisioning Entry routes
router.post('/provisioning-entries/create', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Create provisioning entry request received', { entryDate: input.entryDate });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await provisioningEntriesService.createProvisioningEntry(input, userId);
    
    res.json({
      success: true,
      entryId: result
    });
  } catch (error) {
    logger.error('Error creating provisioning entry', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/provisioning-entries/approve', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Approve provisioning entry request received', { entryId: input.entryId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await provisioningEntriesService.approveProvisioningEntry(
      input.entryId,
      input.createJournalEntries !== undefined ? input.createJournalEntries : true,
      userId
    );
    
    res.json({
      success: true,
      approved: result
    });
  } catch (error) {
    logger.error('Error approving provisioning entry', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/provisioning-entries/reject', async (req, res) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Reject provisioning entry request received', { entryId: input.entryId });
    
    const userId = session_variables['x-hasura-user-id'];
    const result = await provisioningEntriesService.rejectProvisioningEntry(
      input.entryId,
      userId
    );
    
    res.json({
      success: true,
      rejected: result
    });
  } catch (error) {
    logger.error('Error rejecting provisioning entry', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/provisioning-entries/get', async (req, res) => {
  try {
    const { input } = req.body;
    logger.info('Get provisioning entry request received', { entryId: input.entryId });
    
    const result = await provisioningEntriesService.getProvisioningEntry(input.entryId);
    
    res.json({
      success: true,
      entry: result
    });
  } catch (error) {
    logger.error('Error getting provisioning entry', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

router.post('/provisioning-entries/list', async (req, res) => {
  try {
    const { input } = req.body;
    logger.info('List provisioning entries request received');
    
    const result = await provisioningEntriesService.getProvisioningEntries(
      input.fromDate,
      input.toDate,
      input.offset || 0,
      input.limit || 20
    );
    
    res.json({
      success: true,
      entries: result.entries,
      totalCount: result.totalCount
    });
  } catch (error) {
    logger.error('Error listing provisioning entries', { error });
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

export const provisioningRoutes = router;