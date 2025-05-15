import { v4 as uuidv4 } from 'uuid';
import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import { VisualizationService } from './visualizationService';
import {
  Dashboard,
  DashboardPanel,
  UserDashboardPreference,
  ScheduledDashboard,
  DashboardError,
  DashboardPanelData,
  ChartData,
  VisualizationComponent,
  ScheduleFrequency,
  ExportFormat
} from '../../models/reporting/customReporting';

/**
 * Service for managing dashboards
 */
export class DashboardService {
  private visualizationService: VisualizationService;

  constructor() {
    this.visualizationService = new VisualizationService();
  }

  /**
   * Create a new dashboard
   * 
   * @param dashboard The dashboard to create
   * @param userId The user ID creating the dashboard
   * @returns The created dashboard with ID
   */
  async createDashboard(
    dashboard: Dashboard,
    userId: string
  ): Promise<Dashboard> {
    try {
      // Validate the dashboard
      this.validateDashboard(dashboard);

      // Generate a new UUID
      const id = uuidv4();

      // Default values for system flags
      dashboard.isSystem = dashboard.isSystem || false;

      // Set as default if it's the user's first dashboard
      let isDefault = dashboard.isDefault;
      
      if (isDefault === undefined) {
        const userDashboards = await this.listDashboards({ ownerId: userId }, userId);
        isDefault = userDashboards.count === 0;
      }

      // Insert the dashboard
      await db.query(
        `INSERT INTO m_dashboard (
          id, name, display_name, description, layout_config,
          is_system, is_public, is_default, owner_id, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)`,
        [
          id,
          dashboard.name,
          dashboard.displayName,
          dashboard.description,
          JSON.stringify(dashboard.layoutConfig),
          dashboard.isSystem,
          dashboard.isPublic,
          isDefault,
          userId
        ]
      );

      // If this is the default dashboard, update other dashboards to be non-default
      if (isDefault) {
        await db.query(
          `UPDATE m_dashboard
           SET is_default = false
           WHERE owner_id = $1 AND id != $2`,
          [userId, id]
        );
      }

      // Create dashboard panels if provided
      if (dashboard.panels && dashboard.panels.length > 0) {
        for (const panel of dashboard.panels) {
          await this.addDashboardPanel(
            {
              dashboardId: id,
              visualizationId: panel.visualizationId,
              panelTitle: panel.panelTitle,
              panelDescription: panel.panelDescription,
              positionConfig: panel.positionConfig,
              panelConfig: panel.panelConfig
            },
            userId
          );
        }
      }

      // Return the created dashboard with ID
      return {
        ...dashboard,
        id,
        ownerId: userId,
        createdDate: new Date()
      };
    } catch (error) {
      logger.error('Error creating dashboard', { 
        dashboard: dashboard.name, 
        userId, 
        error 
      });

      if (error instanceof DashboardError) {
        throw error;
      }

      throw new DashboardError(`Failed to create dashboard: ${error.message}`);
    }
  }

  /**
   * Update an existing dashboard
   * 
   * @param id The dashboard ID
   * @param dashboard The updated dashboard data
   * @param userId The user ID updating the dashboard
   * @returns The updated dashboard
   */
  async updateDashboard(
    id: string,
    dashboard: Partial<Dashboard>,
    userId: string
  ): Promise<Dashboard> {
    return db.transaction(async (client) => {
      try {
        // Verify the dashboard exists and user has permissions
        const existingDashboard = await this.getDashboard(id);
        
        if (!existingDashboard) {
          throw new DashboardError(`Dashboard with ID ${id} not found`);
        }

        // Only the owner or admin can update the dashboard
        if (existingDashboard.ownerId !== userId && !(await this.isUserAdmin(userId))) {
          throw new DashboardError('You do not have permission to update this dashboard');
        }

        // Check if this is a system dashboard
        if (existingDashboard.isSystem && !(await this.isUserAdmin(userId))) {
          throw new DashboardError('System dashboards can only be updated by admins');
        }

        // Build the update query
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (dashboard.name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          values.push(dashboard.name);
        }

        if (dashboard.displayName !== undefined) {
          updates.push(`display_name = $${paramIndex++}`);
          values.push(dashboard.displayName);
        }

        if (dashboard.description !== undefined) {
          updates.push(`description = $${paramIndex++}`);
          values.push(dashboard.description);
        }

        if (dashboard.layoutConfig !== undefined) {
          updates.push(`layout_config = $${paramIndex++}`);
          values.push(JSON.stringify(dashboard.layoutConfig));
        }

        if (dashboard.isPublic !== undefined) {
          updates.push(`is_public = $${paramIndex++}`);
          values.push(dashboard.isPublic);
        }

        // Only admins can change system flag
        if (dashboard.isSystem !== undefined && (await this.isUserAdmin(userId))) {
          updates.push(`is_system = $${paramIndex++}`);
          values.push(dashboard.isSystem);
        }

        // Handle default dashboard updates
        if (dashboard.isDefault !== undefined) {
          updates.push(`is_default = $${paramIndex++}`);
          values.push(dashboard.isDefault);
          
          // If setting as default, update other dashboards to be non-default
          if (dashboard.isDefault) {
            await client.query(
              `UPDATE m_dashboard
               SET is_default = false
               WHERE owner_id = $1 AND id != $2`,
              [userId, id]
            );
          }
        }

        // Add ID
        values.push(id);

        // Execute the update if there are changes
        if (updates.length > 0) {
          await client.query(
            `UPDATE m_dashboard 
             SET ${updates.join(', ')}
             WHERE id = $${paramIndex}`,
            values
          );
        }

        // Return the updated dashboard
        return this.getDashboard(id);
      } catch (error) {
        logger.error('Error updating dashboard', { 
          id, 
          userId, 
          error 
        });

        if (error instanceof DashboardError) {
          throw error;
        }

        throw new DashboardError(`Failed to update dashboard: ${error.message}`);
      }
    });
  }

  /**
   * Get a dashboard by ID
   * 
   * @param id The dashboard ID
   * @returns The dashboard or undefined if not found
   */
  async getDashboard(id: string): Promise<Dashboard | undefined> {
    try {
      // Query the dashboard
      const result = await db.query(
        `SELECT d.*, u.display_name as owner_name
         FROM m_dashboard d
         LEFT JOIN m_appuser u ON d.owner_id = u.id
         WHERE d.id = $1`,
        [id]
      );

      if (result.rowCount === 0) {
        return undefined;
      }

      const dashboardData = result.rows[0];

      // Get dashboard panels
      const panels = await this.getDashboardPanels(id);

      // Return the dashboard with panels
      return {
        id: dashboardData.id,
        name: dashboardData.name,
        displayName: dashboardData.display_name,
        description: dashboardData.description,
        layoutConfig: dashboardData.layout_config,
        isSystem: dashboardData.is_system,
        isPublic: dashboardData.is_public,
        isDefault: dashboardData.is_default,
        ownerId: dashboardData.owner_id,
        createdDate: dashboardData.created_date,
        updatedDate: dashboardData.updated_date,
        panels
      };
    } catch (error) {
      logger.error('Error getting dashboard', { id, error });
      throw new DashboardError(`Failed to get dashboard: ${error.message}`);
    }
  }

  /**
   * List dashboards
   * 
   * @param filters Optional filters
   * @param userId User ID for permission checking
   * @returns List of dashboards with count
   */
  async listDashboards(
    filters: {
      search?: string;
      isPublic?: boolean;
      isSystem?: boolean;
      ownerId?: string;
      limit?: number;
      offset?: number;
    },
    userId: string
  ): Promise<{ dashboards: Dashboard[]; count: number }> {
    try {
      const isAdmin = await this.isUserAdmin(userId);
      
      // Build the query conditions
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Filter by access permissions
      if (!isAdmin) {
        conditions.push(`(d.is_public = true OR d.owner_id = $${paramIndex++})`);
        params.push(userId);
      }

      // Filter by search term
      if (filters.search) {
        conditions.push(`(
          d.name ILIKE $${paramIndex} OR 
          d.display_name ILIKE $${paramIndex} OR 
          d.description ILIKE $${paramIndex}
        )`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Filter by public flag
      if (filters.isPublic !== undefined) {
        conditions.push(`d.is_public = $${paramIndex++}`);
        params.push(filters.isPublic);
      }

      // Filter by system flag
      if (filters.isSystem !== undefined) {
        conditions.push(`d.is_system = $${paramIndex++}`);
        params.push(filters.isSystem);
      }

      // Filter by owner
      if (filters.ownerId) {
        conditions.push(`d.owner_id = $${paramIndex++}`);
        params.push(filters.ownerId);
      }

      // Build the where clause
      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';

      // Count query
      const countResult = await db.query(
        `SELECT COUNT(*) FROM m_dashboard d ${whereClause}`,
        params
      );
      
      const count = parseInt(countResult.rows[0].count);

      // Add pagination parameters
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      params.push(limit);
      params.push(offset);

      // Main query
      const result = await db.query(
        `SELECT d.*, u.display_name as owner_name
         FROM m_dashboard d
         LEFT JOIN m_appuser u ON d.owner_id = u.id
         ${whereClause}
         ORDER BY d.is_default DESC, d.created_date DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        params
      );

      // Map the results and fetch panels
      const dashboards = await Promise.all(
        result.rows.map(async row => {
          const panels = await this.getDashboardPanels(row.id);
          
          return {
            id: row.id,
            name: row.name,
            displayName: row.display_name,
            description: row.description,
            layoutConfig: row.layout_config,
            isSystem: row.is_system,
            isPublic: row.is_public,
            isDefault: row.is_default,
            ownerId: row.owner_id,
            createdDate: row.created_date,
            updatedDate: row.updated_date,
            panels
          };
        })
      );

      return { dashboards, count };
    } catch (error) {
      logger.error('Error listing dashboards', { filters, userId, error });
      throw new DashboardError(`Failed to list dashboards: ${error.message}`);
    }
  }

  /**
   * Delete a dashboard
   * 
   * @param id The dashboard ID to delete
   * @param userId The user ID attempting the deletion
   * @returns Success flag
   */
  async deleteDashboard(id: string, userId: string): Promise<boolean> {
    return db.transaction(async (client) => {
      try {
        // Verify the dashboard exists and user has permissions
        const dashboard = await this.getDashboard(id);
        
        if (!dashboard) {
          throw new DashboardError(`Dashboard with ID ${id} not found`);
        }

        // Only the owner or admin can delete the dashboard
        if (dashboard.ownerId !== userId && !(await this.isUserAdmin(userId))) {
          throw new DashboardError('You do not have permission to delete this dashboard');
        }

        // Check if this is a system dashboard
        if (dashboard.isSystem && !(await this.isUserAdmin(userId))) {
          throw new DashboardError('System dashboards can only be deleted by admins');
        }

        // Check if the dashboard is used in any scheduled dashboards
        const scheduleResult = await client.query(
          'SELECT COUNT(*) FROM m_scheduled_dashboard WHERE dashboard_id = $1',
          [id]
        );
        
        if (parseInt(scheduleResult.rows[0].count) > 0) {
          throw new DashboardError('Cannot delete dashboard that has scheduled deliveries');
        }

        // Delete dashboard panels first (will cascade, but better to be explicit)
        await client.query(
          'DELETE FROM m_dashboard_panel WHERE dashboard_id = $1',
          [id]
        );

        // Delete user preferences
        await client.query(
          'DELETE FROM m_user_dashboard_preferences WHERE dashboard_id = $1',
          [id]
        );

        // Delete the dashboard
        const result = await client.query(
          'DELETE FROM m_dashboard WHERE id = $1',
          [id]
        );

        // If this was the default dashboard, make another dashboard the default
        if (dashboard.isDefault) {
          const nextDefaultResult = await client.query(
            `SELECT id FROM m_dashboard
             WHERE owner_id = $1
             ORDER BY created_date DESC
             LIMIT 1`,
            [userId]
          );
          
          if (nextDefaultResult.rowCount > 0) {
            await client.query(
              `UPDATE m_dashboard
               SET is_default = true
               WHERE id = $1`,
              [nextDefaultResult.rows[0].id]
            );
          }
        }

        return result.rowCount > 0;
      } catch (error) {
        logger.error('Error deleting dashboard', { id, userId, error });
        
        if (error instanceof DashboardError) {
          throw error;
        }

        throw new DashboardError(`Failed to delete dashboard: ${error.message}`);
      }
    });
  }

  /**
   * Add a panel to a dashboard
   * 
   * @param panel The panel to add
   * @param userId The user ID adding the panel
   * @returns The added panel with ID
   */
  async addDashboardPanel(
    panel: Omit<DashboardPanel, 'id' | 'createdDate' | 'updatedDate' | 'visualization'>,
    userId: string
  ): Promise<DashboardPanel> {
    try {
      // Verify the dashboard exists and user has permissions
      const dashboard = await this.getDashboard(panel.dashboardId);
      
      if (!dashboard) {
        throw new DashboardError(`Dashboard with ID ${panel.dashboardId} not found`);
      }

      // Only the owner or admin can modify the dashboard
      if (dashboard.ownerId !== userId && !(await this.isUserAdmin(userId))) {
        throw new DashboardError('You do not have permission to modify this dashboard');
      }

      // Check if this is a system dashboard
      if (dashboard.isSystem && !(await this.isUserAdmin(userId))) {
        throw new DashboardError('System dashboards can only be modified by admins');
      }

      // Verify the visualization exists
      const visualization = await this.visualizationService.getVisualizationComponent(panel.visualizationId);
      
      if (!visualization) {
        throw new DashboardError(`Visualization with ID ${panel.visualizationId} not found`);
      }

      // Generate a new UUID
      const id = uuidv4();

      // Insert the panel
      await db.query(
        `INSERT INTO m_dashboard_panel (
          id, dashboard_id, visualization_id, panel_title, panel_description,
          position_config, panel_config, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [
          id,
          panel.dashboardId,
          panel.visualizationId,
          panel.panelTitle,
          panel.panelDescription,
          JSON.stringify(panel.positionConfig),
          panel.panelConfig ? JSON.stringify(panel.panelConfig) : null
        ]
      );

      // Return the added panel with ID
      return {
        ...panel,
        id,
        visualization,
        createdDate: new Date()
      };
    } catch (error) {
      logger.error('Error adding dashboard panel', { 
        dashboardId: panel.dashboardId, 
        visualizationId: panel.visualizationId, 
        userId, 
        error 
      });

      if (error instanceof DashboardError) {
        throw error;
      }

      throw new DashboardError(`Failed to add dashboard panel: ${error.message}`);
    }
  }

  /**
   * Update a dashboard panel
   * 
   * @param id The panel ID
   * @param panel The updated panel data
   * @param userId The user ID updating the panel
   * @returns The updated panel
   */
  async updateDashboardPanel(
    id: string,
    panel: Partial<DashboardPanel>,
    userId: string
  ): Promise<DashboardPanel> {
    try {
      // Get the existing panel
      const existingPanel = await this.getDashboardPanel(id);
      
      if (!existingPanel) {
        throw new DashboardError(`Dashboard panel with ID ${id} not found`);
      }

      // Verify the dashboard exists and user has permissions
      const dashboard = await this.getDashboard(existingPanel.dashboardId);
      
      if (!dashboard) {
        throw new DashboardError(`Dashboard with ID ${existingPanel.dashboardId} not found`);
      }

      // Only the owner or admin can modify the dashboard
      if (dashboard.ownerId !== userId && !(await this.isUserAdmin(userId))) {
        throw new DashboardError('You do not have permission to modify this dashboard');
      }

      // Check if this is a system dashboard
      if (dashboard.isSystem && !(await this.isUserAdmin(userId))) {
        throw new DashboardError('System dashboards can only be modified by admins');
      }

      // Verify the visualization exists if changed
      if (panel.visualizationId && panel.visualizationId !== existingPanel.visualizationId) {
        const visualization = await this.visualizationService.getVisualizationComponent(panel.visualizationId);
        
        if (!visualization) {
          throw new DashboardError(`Visualization with ID ${panel.visualizationId} not found`);
        }
      }

      // Build the update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (panel.visualizationId !== undefined) {
        updates.push(`visualization_id = $${paramIndex++}`);
        values.push(panel.visualizationId);
      }

      if (panel.panelTitle !== undefined) {
        updates.push(`panel_title = $${paramIndex++}`);
        values.push(panel.panelTitle);
      }

      if (panel.panelDescription !== undefined) {
        updates.push(`panel_description = $${paramIndex++}`);
        values.push(panel.panelDescription);
      }

      if (panel.positionConfig !== undefined) {
        updates.push(`position_config = $${paramIndex++}`);
        values.push(JSON.stringify(panel.positionConfig));
      }

      if (panel.panelConfig !== undefined) {
        updates.push(`panel_config = $${paramIndex++}`);
        values.push(panel.panelConfig ? JSON.stringify(panel.panelConfig) : null);
      }

      // Add ID
      values.push(id);

      // Execute the update if there are changes
      if (updates.length > 0) {
        await db.query(
          `UPDATE m_dashboard_panel 
           SET ${updates.join(', ')}
           WHERE id = $${paramIndex}`,
          values
        );
      }

      // Return the updated panel
      return this.getDashboardPanel(id);
    } catch (error) {
      logger.error('Error updating dashboard panel', { 
        id, 
        userId, 
        error 
      });

      if (error instanceof DashboardError) {
        throw error;
      }

      throw new DashboardError(`Failed to update dashboard panel: ${error.message}`);
    }
  }

  /**
   * Delete a dashboard panel
   * 
   * @param id The panel ID to delete
   * @param userId The user ID attempting the deletion
   * @returns Success flag
   */
  async deleteDashboardPanel(id: string, userId: string): Promise<boolean> {
    try {
      // Get the existing panel
      const panel = await this.getDashboardPanel(id);
      
      if (!panel) {
        throw new DashboardError(`Dashboard panel with ID ${id} not found`);
      }

      // Verify the dashboard exists and user has permissions
      const dashboard = await this.getDashboard(panel.dashboardId);
      
      if (!dashboard) {
        throw new DashboardError(`Dashboard with ID ${panel.dashboardId} not found`);
      }

      // Only the owner or admin can modify the dashboard
      if (dashboard.ownerId !== userId && !(await this.isUserAdmin(userId))) {
        throw new DashboardError('You do not have permission to modify this dashboard');
      }

      // Check if this is a system dashboard
      if (dashboard.isSystem && !(await this.isUserAdmin(userId))) {
        throw new DashboardError('System dashboards can only be modified by admins');
      }

      // Delete the panel
      const result = await db.query(
        'DELETE FROM m_dashboard_panel WHERE id = $1',
        [id]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting dashboard panel', { id, userId, error });
      
      if (error instanceof DashboardError) {
        throw error;
      }

      throw new DashboardError(`Failed to delete dashboard panel: ${error.message}`);
    }
  }

  /**
   * Get dashboard with rendered data
   * 
   * @param id The dashboard ID
   * @param parameters Optional parameters to pass to visualizations
   * @param userId The user ID viewing the dashboard
   * @returns The dashboard with rendered panels
   */
  async getDashboardWithData(
    id: string,
    parameters?: { [key: string]: any },
    userId?: string
  ): Promise<{ dashboard: Dashboard; panels: DashboardPanelData[] }> {
    try {
      // Get the dashboard
      const dashboard = await this.getDashboard(id);
      
      if (!dashboard) {
        throw new DashboardError(`Dashboard with ID ${id} not found`);
      }

      // Check permissions if user ID provided
      if (userId && !dashboard.isPublic && dashboard.ownerId !== userId && !(await this.isUserAdmin(userId))) {
        throw new DashboardError('You do not have permission to view this dashboard');
      }

      // Render each panel
      const panelsWithData: DashboardPanelData[] = await Promise.all(
        (dashboard.panels || []).map(async panel => {
          try {
            const chartData = await this.visualizationService.renderVisualization(
              panel.visualizationId,
              parameters,
              userId
            );

            return {
              panel,
              chartData
            };
          } catch (error) {
            logger.error('Error rendering panel', { 
              panelId: panel.id, 
              visualizationId: panel.visualizationId, 
              error 
            });

            // Return panel without data on error
            return { panel };
          }
        })
      );

      return { dashboard, panels: panelsWithData };
    } catch (error) {
      logger.error('Error getting dashboard with data', { 
        id, 
        parameters, 
        userId, 
        error 
      });

      if (error instanceof DashboardError) {
        throw error;
      }

      throw new DashboardError(`Failed to get dashboard with data: ${error.message}`);
    }
  }

  /**
   * Set user dashboard preference
   * 
   * @param preference The dashboard preference to set
   * @param userId The user ID setting the preference
   * @returns The saved preference
   */
  async setUserDashboardPreference(
    preference: UserDashboardPreference,
    userId: string
  ): Promise<UserDashboardPreference> {
    return db.transaction(async (client) => {
      try {
        // Verify the dashboard exists
        const dashboard = await this.getDashboard(preference.dashboardId);
        
        if (!dashboard) {
          throw new DashboardError(`Dashboard with ID ${preference.dashboardId} not found`);
        }

        // Check if preference already exists
        const existingResult = await client.query(
          `SELECT id FROM m_user_dashboard_preferences
           WHERE user_id = $1 AND dashboard_id = $2`,
          [userId, preference.dashboardId]
        );

        let id: string;
        let isUpdate = false;
        
        if (existingResult.rowCount > 0) {
          // Update existing preference
          id = existingResult.rows[0].id;
          isUpdate = true;
          
          await client.query(
            `UPDATE m_user_dashboard_preferences
             SET is_favorite = $1, is_default = $2, display_order = $3,
                 custom_settings = $4, updated_date = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [
              preference.isFavorite,
              preference.isDefault,
              preference.displayOrder,
              preference.customSettings ? JSON.stringify(preference.customSettings) : null,
              id
            ]
          );
        } else {
          // Create new preference
          id = uuidv4();
          
          await client.query(
            `INSERT INTO m_user_dashboard_preferences (
              id, user_id, dashboard_id, is_favorite, is_default,
              display_order, custom_settings, created_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
            [
              id,
              userId,
              preference.dashboardId,
              preference.isFavorite,
              preference.isDefault,
              preference.displayOrder,
              preference.customSettings ? JSON.stringify(preference.customSettings) : null
            ]
          );
        }

        // If setting as default, update other preferences to be non-default
        if (preference.isDefault) {
          await client.query(
            `UPDATE m_user_dashboard_preferences
             SET is_default = false
             WHERE user_id = $1 AND dashboard_id != $2`,
            [userId, preference.dashboardId]
          );
        }

        // Return the saved preference
        return {
          ...preference,
          id,
          userId,
          createdDate: new Date(),
          updatedDate: isUpdate ? new Date() : undefined
        };
      } catch (error) {
        logger.error('Error setting user dashboard preference', { 
          dashboardId: preference.dashboardId, 
          userId, 
          error 
        });

        if (error instanceof DashboardError) {
          throw error;
        }

        throw new DashboardError(`Failed to set user dashboard preference: ${error.message}`);
      }
    });
  }

  /**
   * Get user dashboard preferences
   * 
   * @param userId The user ID
   * @returns List of user dashboard preferences
   */
  async getUserDashboardPreferences(userId: string): Promise<UserDashboardPreference[]> {
    try {
      const result = await db.query(
        `SELECT p.*, d.name as dashboard_name, d.display_name as dashboard_display_name
         FROM m_user_dashboard_preferences p
         JOIN m_dashboard d ON p.dashboard_id = d.id
         WHERE p.user_id = $1
         ORDER BY p.is_default DESC, p.display_order, p.created_date DESC`,
        [userId]
      );

      // Map the results
      const preferences: UserDashboardPreference[] = await Promise.all(
        result.rows.map(async row => {
          const dashboard = await this.getDashboard(row.dashboard_id);
          
          return {
            id: row.id,
            userId: row.user_id,
            dashboardId: row.dashboard_id,
            dashboard,
            isFavorite: row.is_favorite,
            isDefault: row.is_default,
            displayOrder: row.display_order,
            customSettings: row.custom_settings,
            createdDate: row.created_date,
            updatedDate: row.updated_date
          };
        })
      );

      return preferences;
    } catch (error) {
      logger.error('Error getting user dashboard preferences', { userId, error });
      throw new DashboardError(`Failed to get user dashboard preferences: ${error.message}`);
    }
  }

  /**
   * Schedule a dashboard for delivery
   * 
   * @param schedule The schedule configuration
   * @param userId The user ID creating the schedule
   * @returns The created schedule with ID
   */
  async scheduleReportDashboard(
    schedule: Omit<ScheduledDashboard, 'id' | 'createdDate' | 'updatedDate' | 'dashboard'>,
    userId: string
  ): Promise<ScheduledDashboard> {
    try {
      // Verify the dashboard exists
      const dashboard = await this.getDashboard(schedule.dashboardId);
      
      if (!dashboard) {
        throw new DashboardError(`Dashboard with ID ${schedule.dashboardId} not found`);
      }

      // Validate email addresses
      if (!schedule.recipientEmails || schedule.recipientEmails.length === 0) {
        throw new DashboardError('At least one recipient email is required');
      }

      for (const email of schedule.recipientEmails) {
        if (!this.isValidEmail(email)) {
          throw new DashboardError(`Invalid email address: ${email}`);
        }
      }

      // Calculate next run date based on schedule
      const nextRunDate = this.calculateNextRunDate(schedule.frequency, schedule.scheduleConfig);

      // Generate a new UUID
      const id = uuidv4();

      // Insert the schedule
      await db.query(
        `INSERT INTO m_scheduled_dashboard (
          id, dashboard_id, name, frequency, schedule_config,
          format, recipient_emails, is_active, next_run_date,
          owner_id, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
        [
          id,
          schedule.dashboardId,
          schedule.name,
          schedule.frequency,
          JSON.stringify(schedule.scheduleConfig),
          schedule.format,
          schedule.recipientEmails,
          schedule.isActive,
          nextRunDate,
          userId
        ]
      );

      // Return the created schedule with ID
      return {
        ...schedule,
        id,
        dashboard,
        nextRunDate,
        ownerId: userId,
        createdDate: new Date()
      };
    } catch (error) {
      logger.error('Error scheduling dashboard report', { 
        dashboardId: schedule.dashboardId, 
        userId, 
        error 
      });

      if (error instanceof DashboardError) {
        throw error;
      }

      throw new DashboardError(`Failed to schedule dashboard report: ${error.message}`);
    }
  }

  /**
   * Update a scheduled dashboard
   * 
   * @param id The schedule ID
   * @param schedule The updated schedule data
   * @param userId The user ID updating the schedule
   * @returns The updated schedule
   */
  async updateScheduledDashboard(
    id: string,
    schedule: Partial<ScheduledDashboard>,
    userId: string
  ): Promise<ScheduledDashboard> {
    try {
      // Verify the schedule exists and user has permissions
      const existingSchedule = await this.getScheduledDashboard(id);
      
      if (!existingSchedule) {
        throw new DashboardError(`Scheduled dashboard with ID ${id} not found`);
      }

      // Only the owner or admin can update the schedule
      if (existingSchedule.ownerId !== userId && !(await this.isUserAdmin(userId))) {
        throw new DashboardError('You do not have permission to update this schedule');
      }

      // Verify the dashboard exists if changed
      if (schedule.dashboardId && schedule.dashboardId !== existingSchedule.dashboardId) {
        const dashboard = await this.getDashboard(schedule.dashboardId);
        
        if (!dashboard) {
          throw new DashboardError(`Dashboard with ID ${schedule.dashboardId} not found`);
        }
      }

      // Validate email addresses if provided
      if (schedule.recipientEmails && schedule.recipientEmails.length === 0) {
        throw new DashboardError('At least one recipient email is required');
      }

      if (schedule.recipientEmails) {
        for (const email of schedule.recipientEmails) {
          if (!this.isValidEmail(email)) {
            throw new DashboardError(`Invalid email address: ${email}`);
          }
        }
      }

      // Calculate next run date if frequency or schedule config changed
      let nextRunDate = existingSchedule.nextRunDate;
      
      if ((schedule.frequency && schedule.frequency !== existingSchedule.frequency) || 
          (schedule.scheduleConfig && JSON.stringify(schedule.scheduleConfig) !== JSON.stringify(existingSchedule.scheduleConfig))) {
        nextRunDate = this.calculateNextRunDate(
          schedule.frequency || existingSchedule.frequency,
          schedule.scheduleConfig || existingSchedule.scheduleConfig
        );
      }

      // Build the update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (schedule.dashboardId !== undefined) {
        updates.push(`dashboard_id = $${paramIndex++}`);
        values.push(schedule.dashboardId);
      }

      if (schedule.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(schedule.name);
      }

      if (schedule.frequency !== undefined) {
        updates.push(`frequency = $${paramIndex++}`);
        values.push(schedule.frequency);
      }

      if (schedule.scheduleConfig !== undefined) {
        updates.push(`schedule_config = $${paramIndex++}`);
        values.push(JSON.stringify(schedule.scheduleConfig));
      }

      if (schedule.format !== undefined) {
        updates.push(`format = $${paramIndex++}`);
        values.push(schedule.format);
      }

      if (schedule.recipientEmails !== undefined) {
        updates.push(`recipient_emails = $${paramIndex++}`);
        values.push(schedule.recipientEmails);
      }

      if (schedule.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(schedule.isActive);
      }

      // Update next run date if changed
      if (nextRunDate !== existingSchedule.nextRunDate) {
        updates.push(`next_run_date = $${paramIndex++}`);
        values.push(nextRunDate);
      }

      // Add ID
      values.push(id);

      // Execute the update if there are changes
      if (updates.length > 0) {
        await db.query(
          `UPDATE m_scheduled_dashboard
           SET ${updates.join(', ')}, updated_date = CURRENT_TIMESTAMP
           WHERE id = $${paramIndex}`,
          values
        );
      }

      // Return the updated schedule
      return this.getScheduledDashboard(id);
    } catch (error) {
      logger.error('Error updating scheduled dashboard', { 
        id, 
        userId, 
        error 
      });

      if (error instanceof DashboardError) {
        throw error;
      }

      throw new DashboardError(`Failed to update scheduled dashboard: ${error.message}`);
    }
  }

  /**
   * Get a scheduled dashboard by ID
   * 
   * @param id The schedule ID
   * @returns The scheduled dashboard or undefined if not found
   */
  async getScheduledDashboard(id: string): Promise<ScheduledDashboard | undefined> {
    try {
      const result = await db.query(
        `SELECT s.*, u.display_name as owner_name
         FROM m_scheduled_dashboard s
         LEFT JOIN m_appuser u ON s.owner_id = u.id
         WHERE s.id = $1`,
        [id]
      );

      if (result.rowCount === 0) {
        return undefined;
      }

      const row = result.rows[0];
      
      // Get the dashboard
      const dashboard = await this.getDashboard(row.dashboard_id);

      // Return the scheduled dashboard
      return {
        id: row.id,
        dashboardId: row.dashboard_id,
        dashboard,
        name: row.name,
        frequency: row.frequency,
        scheduleConfig: row.schedule_config,
        format: row.format,
        recipientEmails: row.recipient_emails,
        isActive: row.is_active,
        lastRunDate: row.last_run_date,
        nextRunDate: row.next_run_date,
        ownerId: row.owner_id,
        createdDate: row.created_date,
        updatedDate: row.updated_date
      };
    } catch (error) {
      logger.error('Error getting scheduled dashboard', { id, error });
      throw new DashboardError(`Failed to get scheduled dashboard: ${error.message}`);
    }
  }

  /**
   * Get scheduled dashboards
   * 
   * @param filters Optional filters
   * @param userId User ID for permission checking
   * @returns List of scheduled dashboards
   */
  async getScheduledDashboards(
    filters: {
      dashboardId?: string;
      isActive?: boolean;
      ownerId?: string;
      limit?: number;
      offset?: number;
    },
    userId: string
  ): Promise<{ schedules: ScheduledDashboard[]; count: number }> {
    try {
      const isAdmin = await this.isUserAdmin(userId);
      
      // Build the query conditions
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Filter by permission (non-admins can only see their own schedules)
      if (!isAdmin) {
        conditions.push(`s.owner_id = $${paramIndex++}`);
        params.push(userId);
      } else if (filters.ownerId) {
        conditions.push(`s.owner_id = $${paramIndex++}`);
        params.push(filters.ownerId);
      }

      // Filter by dashboard
      if (filters.dashboardId) {
        conditions.push(`s.dashboard_id = $${paramIndex++}`);
        params.push(filters.dashboardId);
      }

      // Filter by active status
      if (filters.isActive !== undefined) {
        conditions.push(`s.is_active = $${paramIndex++}`);
        params.push(filters.isActive);
      }

      // Build the where clause
      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';

      // Count query
      const countResult = await db.query(
        `SELECT COUNT(*) FROM m_scheduled_dashboard s ${whereClause}`,
        params
      );
      
      const count = parseInt(countResult.rows[0].count);

      // Add pagination parameters
      const limit = filters.limit || 20;
      const offset = filters.offset || 0;

      params.push(limit);
      params.push(offset);

      // Main query
      const result = await db.query(
        `SELECT s.*, u.display_name as owner_name,
                d.name as dashboard_name, d.display_name as dashboard_display_name
         FROM m_scheduled_dashboard s
         LEFT JOIN m_appuser u ON s.owner_id = u.id
         JOIN m_dashboard d ON s.dashboard_id = d.id
         ${whereClause}
         ORDER BY s.next_run_date, s.created_date DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        params
      );

      // Map the results
      const schedules = await Promise.all(
        result.rows.map(async row => {
          const dashboard = await this.getDashboard(row.dashboard_id);
          
          return {
            id: row.id,
            dashboardId: row.dashboard_id,
            dashboard,
            name: row.name,
            frequency: row.frequency,
            scheduleConfig: row.schedule_config,
            format: row.format,
            recipientEmails: row.recipient_emails,
            isActive: row.is_active,
            lastRunDate: row.last_run_date,
            nextRunDate: row.next_run_date,
            ownerId: row.owner_id,
            createdDate: row.created_date,
            updatedDate: row.updated_date
          };
        })
      );

      return { schedules, count };
    } catch (error) {
      logger.error('Error getting scheduled dashboards', { filters, userId, error });
      throw new DashboardError(`Failed to get scheduled dashboards: ${error.message}`);
    }
  }

  /**
   * Delete a scheduled dashboard
   * 
   * @param id The schedule ID to delete
   * @param userId The user ID attempting the deletion
   * @returns Success flag
   */
  async deleteScheduledDashboard(id: string, userId: string): Promise<boolean> {
    try {
      // Verify the schedule exists and user has permissions
      const schedule = await this.getScheduledDashboard(id);
      
      if (!schedule) {
        throw new DashboardError(`Scheduled dashboard with ID ${id} not found`);
      }

      // Only the owner or admin can delete the schedule
      if (schedule.ownerId !== userId && !(await this.isUserAdmin(userId))) {
        throw new DashboardError('You do not have permission to delete this schedule');
      }

      // Delete the schedule
      const result = await db.query(
        'DELETE FROM m_scheduled_dashboard WHERE id = $1',
        [id]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting scheduled dashboard', { id, userId, error });
      
      if (error instanceof DashboardError) {
        throw error;
      }

      throw new DashboardError(`Failed to delete scheduled dashboard: ${error.message}`);
    }
  }

  /**
   * Export a dashboard to the specified format
   * 
   * @param dashboardId The dashboard ID
   * @param format Export format
   * @param parameters Optional parameters for visualizations
   * @param userId The user ID exporting the dashboard
   * @returns The exported file data
   */
  async exportDashboard(
    dashboardId: string,
    format: ExportFormat,
    parameters?: { [key: string]: any },
    userId?: string
  ): Promise<{ fileName: string; contentType: string; data: Buffer }> {
    try {
      // Get the dashboard with data
      const { dashboard, panels } = await this.getDashboardWithData(
        dashboardId,
        parameters,
        userId
      );

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '').substring(0, 15);
      const fileName = `${this.sanitizeFileName(dashboard.name)}_${timestamp}`;

      // Export based on format
      switch (format) {
        case ExportFormat.PDF:
          return this.exportToPdf(dashboard, panels, fileName);
        case ExportFormat.HTML:
          return this.exportToHtml(dashboard, panels, fileName);
        case ExportFormat.IMAGE:
          return this.exportToImage(dashboard, panels, fileName);
        default:
          throw new DashboardError(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error('Error exporting dashboard', { 
        dashboardId, 
        format, 
        parameters, 
        userId, 
        error 
      });

      if (error instanceof DashboardError) {
        throw error;
      }

      throw new DashboardError(`Failed to export dashboard: ${error.message}`);
    }
  }

  /**
   * Get all panels for a dashboard
   * 
   * @param dashboardId The dashboard ID
   * @returns List of dashboard panels
   */
  private async getDashboardPanels(dashboardId: string): Promise<DashboardPanel[]> {
    try {
      const result = await db.query(
        `SELECT p.*
         FROM m_dashboard_panel p
         WHERE p.dashboard_id = $1
         ORDER BY p.created_date`,
        [dashboardId]
      );

      // Map the results and fetch visualizations
      return await Promise.all(
        result.rows.map(async row => {
          const visualization = await this.visualizationService.getVisualizationComponent(row.visualization_id);
          
          return {
            id: row.id,
            dashboardId: row.dashboard_id,
            visualizationId: row.visualization_id,
            visualization,
            panelTitle: row.panel_title,
            panelDescription: row.panel_description,
            positionConfig: row.position_config,
            panelConfig: row.panel_config,
            createdDate: row.created_date,
            updatedDate: row.updated_date
          };
        })
      );
    } catch (error) {
      logger.error('Error getting dashboard panels', { dashboardId, error });
      throw new DashboardError(`Failed to get dashboard panels: ${error.message}`);
    }
  }

  /**
   * Get a dashboard panel by ID
   * 
   * @param id The panel ID
   * @returns The panel or undefined if not found
   */
  private async getDashboardPanel(id: string): Promise<DashboardPanel | undefined> {
    try {
      const result = await db.query(
        'SELECT * FROM m_dashboard_panel WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        return undefined;
      }

      const row = result.rows[0];
      
      // Get the visualization
      const visualization = await this.visualizationService.getVisualizationComponent(row.visualization_id);

      return {
        id: row.id,
        dashboardId: row.dashboard_id,
        visualizationId: row.visualization_id,
        visualization,
        panelTitle: row.panel_title,
        panelDescription: row.panel_description,
        positionConfig: row.position_config,
        panelConfig: row.panel_config,
        createdDate: row.created_date,
        updatedDate: row.updated_date
      };
    } catch (error) {
      logger.error('Error getting dashboard panel', { id, error });
      throw new DashboardError(`Failed to get dashboard panel: ${error.message}`);
    }
  }

  /**
   * Validate dashboard object
   * 
   * @param dashboard The dashboard to validate
   */
  private validateDashboard(dashboard: Dashboard): void {
    if (!dashboard.name) {
      throw new DashboardError('Dashboard name is required');
    }

    if (!dashboard.displayName) {
      throw new DashboardError('Dashboard display name is required');
    }

    if (!dashboard.layoutConfig) {
      throw new DashboardError('Dashboard layout configuration is required');
    }
  }

  /**
   * Check if a user is an admin
   * 
   * @param userId The user ID to check
   * @returns Whether the user is an admin
   */
  private async isUserAdmin(userId: string): Promise<boolean> {
    try {
      const result = await db.query(
        `SELECT COUNT(*) FROM m_role r
         JOIN m_appuser_role ur ON r.id = ur.role_id
         WHERE ur.appuser_id = $1 AND r.name = 'Super user'`,
        [userId]
      );
      
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Error checking admin status', { userId, error });
      return false; // Assume not admin on error
    }
  }

  /**
   * Check if an email address is valid
   * 
   * @param email The email address to validate
   * @returns Whether the email is valid
   */
  private isValidEmail(email: string): boolean {
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Calculate the next run date based on schedule configuration
   * 
   * @param frequency The schedule frequency
   * @param config The schedule configuration
   * @returns The next run date
   */
  private calculateNextRunDate(
    frequency: ScheduleFrequency,
    config: any
  ): Date {
    const now = new Date();
    let nextRun = new Date(now);
    
    switch (frequency) {
      case ScheduleFrequency.DAILY:
        // Set time if provided, otherwise use current time
        if (config && config.hour !== undefined && config.minute !== undefined) {
          nextRun.setHours(config.hour, config.minute, 0, 0);
        }
        
        // If time has already passed today, move to tomorrow
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1);
        }
        break;
        
      case ScheduleFrequency.WEEKLY:
        // Set day of week (0-6, Sunday-Saturday)
        if (config && config.dayOfWeek !== undefined) {
          const currentDay = now.getDay();
          const daysToAdd = (config.dayOfWeek - currentDay + 7) % 7;
          
          nextRun.setDate(now.getDate() + daysToAdd);
        } else {
          // Default to next week same day if no day specified
          nextRun.setDate(now.getDate() + 7);
        }
        
        // Set time if provided
        if (config && config.hour !== undefined && config.minute !== undefined) {
          nextRun.setHours(config.hour, config.minute, 0, 0);
        } else {
          nextRun.setHours(0, 0, 0, 0); // Default to midnight
        }
        
        // If the calculated time has already passed, move to next week
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7);
        }
        break;
        
      case ScheduleFrequency.BIWEEKLY:
        // Similar to weekly but add 2 weeks
        if (config && config.dayOfWeek !== undefined) {
          const currentDay = now.getDay();
          const daysToAdd = (config.dayOfWeek - currentDay + 7) % 7;
          
          nextRun.setDate(now.getDate() + daysToAdd);
        } else {
          // Default to two weeks from now if no day specified
          nextRun.setDate(now.getDate() + 14);
        }
        
        // Set time if provided
        if (config && config.hour !== undefined && config.minute !== undefined) {
          nextRun.setHours(config.hour, config.minute, 0, 0);
        } else {
          nextRun.setHours(0, 0, 0, 0); // Default to midnight
        }
        
        // If the calculated time has already passed, move to next biweekly period
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 14);
        }
        break;
        
      case ScheduleFrequency.MONTHLY:
        // Set day of month (1-31)
        if (config && config.dayOfMonth !== undefined) {
          nextRun.setDate(config.dayOfMonth);
        } else {
          // Default to 1st of next month if no day specified
          nextRun.setMonth(nextRun.getMonth() + 1, 1);
        }
        
        // Set time if provided
        if (config && config.hour !== undefined && config.minute !== undefined) {
          nextRun.setHours(config.hour, config.minute, 0, 0);
        } else {
          nextRun.setHours(0, 0, 0, 0); // Default to midnight
        }
        
        // If the calculated time has already passed, move to next month
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1);
        }
        break;
        
      case ScheduleFrequency.QUARTERLY:
        // Calculate the next quarter's first day
        const currentMonth = now.getMonth();
        const currentQuarter = Math.floor(currentMonth / 3);
        const nextQuarterFirstMonth = (currentQuarter + 1) * 3 % 12; // 0, 3, 6, or 9
        
        nextRun.setMonth(nextQuarterFirstMonth);
        
        // Set day of month if provided, otherwise use 1st day
        if (config && config.dayOfMonth !== undefined) {
          nextRun.setDate(config.dayOfMonth);
        } else {
          nextRun.setDate(1);
        }
        
        // Set time if provided
        if (config && config.hour !== undefined && config.minute !== undefined) {
          nextRun.setHours(config.hour, config.minute, 0, 0);
        } else {
          nextRun.setHours(0, 0, 0, 0); // Default to midnight
        }
        
        // If the calculated time has already passed, move to next quarter
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 3);
        }
        break;
        
      case ScheduleFrequency.YEARLY:
        // Advance to next year
        nextRun.setFullYear(now.getFullYear() + 1);
        
        // Set month if provided (0-11), otherwise January
        if (config && config.month !== undefined) {
          nextRun.setMonth(config.month);
        } else {
          nextRun.setMonth(0);
        }
        
        // Set day if provided, otherwise 1st
        if (config && config.dayOfMonth !== undefined) {
          nextRun.setDate(config.dayOfMonth);
        } else {
          nextRun.setDate(1);
        }
        
        // Set time if provided
        if (config && config.hour !== undefined && config.minute !== undefined) {
          nextRun.setHours(config.hour, config.minute, 0, 0);
        } else {
          nextRun.setHours(0, 0, 0, 0); // Default to midnight
        }
        break;
        
      case ScheduleFrequency.CUSTOM:
        // For custom frequency, use cron-like expression if provided
        if (config && config.cronExpression) {
          try {
            // Implement cron parsing or use a library
            // This is a placeholder - in a real implementation, you'd use a cron parser
            // For now, default to tomorrow at midnight
            nextRun.setDate(nextRun.getDate() + 1);
            nextRun.setHours(0, 0, 0, 0);
          } catch (error) {
            logger.error('Error parsing cron expression', { expression: config.cronExpression, error });
            // Default to tomorrow on error
            nextRun.setDate(nextRun.getDate() + 1);
            nextRun.setHours(0, 0, 0, 0);
          }
        } else {
          // Default to tomorrow if no configuration
          nextRun.setDate(nextRun.getDate() + 1);
          nextRun.setHours(0, 0, 0, 0);
        }
        break;
        
      default:
        // Default to tomorrow
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(0, 0, 0, 0);
    }
    
    return nextRun;
  }

  /**
   * Sanitize a file name to remove invalid characters
   * 
   * @param name The file name to sanitize
   * @returns The sanitized file name
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_\-]/g, '_') // Replace invalid chars with underscore
      .replace(/_{2,}/g, '_')           // Replace multiple underscores with one
      .replace(/^_|_$/g, '');           // Remove leading/trailing underscores
  }

  /**
   * Export dashboard to PDF
   * 
   * @param dashboard The dashboard
   * @param panels The dashboard panels with data
   * @param fileName The base file name
   * @returns The exported file
   */
  private exportToPdf(
    dashboard: Dashboard,
    panels: DashboardPanelData[],
    fileName: string
  ): { fileName: string; contentType: string; data: Buffer } {
    // TODO: Implement PDF export
    throw new DashboardError('PDF export not yet implemented');
  }

  /**
   * Export dashboard to HTML
   * 
   * @param dashboard The dashboard
   * @param panels The dashboard panels with data
   * @param fileName The base file name
   * @returns The exported file
   */
  private exportToHtml(
    dashboard: Dashboard,
    panels: DashboardPanelData[],
    fileName: string
  ): { fileName: string; contentType: string; data: Buffer } {
    // TODO: Implement HTML export
    throw new DashboardError('HTML export not yet implemented');
  }

  /**
   * Export dashboard to image
   * 
   * @param dashboard The dashboard
   * @param panels The dashboard panels with data
   * @param fileName The base file name
   * @returns The exported file
   */
  private exportToImage(
    dashboard: Dashboard,
    panels: DashboardPanelData[],
    fileName: string
  ): { fileName: string; contentType: string; data: Buffer } {
    // TODO: Implement image export
    throw new DashboardError('Image export not yet implemented');
  }
}