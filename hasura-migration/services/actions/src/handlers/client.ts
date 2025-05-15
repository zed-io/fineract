import { Router } from 'express';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errorHandler';
import db from '../utils/db';

const router = Router();

// Create new client
router.post('/create', async (req, res, next) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Create client request received');
    
    // Validate input
    if (!input || !input.firstname || !input.lastname || !input.officeId) {
      throw new ValidationError('Missing required fields for client creation');
    }
    
    const userId = req.user?.id;
    
    // Generate account number (simplified)
    const accountNo = 'C' + Math.floor(100000 + Math.random() * 900000);
    
    // Insert client into database (simplified)
    const result = await db.query(
      `INSERT INTO fineract_default.client
      (firstname, lastname, display_name, account_no, office_id, submitted_date, 
      submitted_by_userid, created_by, created_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id`,
      [
        input.firstname,
        input.lastname,
        `${input.firstname} ${input.lastname}`,
        accountNo,
        input.officeId,
        new Date().toISOString().split('T')[0],
        userId,
        userId
      ]
    );
    
    const clientId = result.rows[0].id;
    
    res.json({
      success: true,
      clientId,
      resourceId: clientId,
      accountNo,
      message: 'Client created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Activate client
router.post('/activate', async (req, res, next) => {
  try {
    const { input, session_variables } = req.body;
    logger.info('Activate client request received', { clientId: input.clientId });
    
    // Validate input
    if (!input || !input.clientId || !input.activationDate) {
      throw new ValidationError('Missing required fields for client activation');
    }
    
    const userId = req.user?.id;
    
    // Check if client exists and can be activated
    const clientResult = await db.query(
      'SELECT id, status FROM fineract_default.client WHERE id = $1',
      [input.clientId]
    );
    
    if (clientResult.rows.length === 0) {
      throw new NotFoundError(`Client with ID ${input.clientId} not found`);
    }
    
    const client = clientResult.rows[0];
    
    if (client.status !== 'pending') {
      throw new ValidationError(`Client with ID ${input.clientId} cannot be activated in its current status`);
    }
    
    // Update client status (simplified)
    await db.query(
      'UPDATE fineract_default.client SET status = $1, activation_date = $2, activated_by_userid = $3, last_modified_by = $4, last_modified_date = NOW() WHERE id = $5',
      ['active', input.activationDate, userId, userId, input.clientId]
    );
    
    res.json({
      success: true,
      clientId: input.clientId,
      message: 'Client activated successfully',
      activationDate: input.activationDate
    });
  } catch (error) {
    next(error);
  }
});

export const clientRoutes = router;