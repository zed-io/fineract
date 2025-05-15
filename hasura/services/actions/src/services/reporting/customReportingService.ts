import { v4 as uuidv4 } from 'uuid';
import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import {
  CustomReportTemplate,
  CustomReportParameter,
  CustomReportSavedQuery,
  CustomReportExecution,
  CustomReportError,
  CustomReportValidationError,
  CustomReportExecutionError,
  ParameterType,
  ExecutionStatus,
  DataType,
  DataSource,
  ReportConfig,
  ColumnConfig,
  ConditionGroup,
  Condition,
  JoinConfig
} from '../../models/reporting/customReporting';

/**
 * Service for managing custom reports
 */
export class CustomReportingService {
  /**
   * Create a new custom report template
   * 
   * @param template The template to create
   * @param userId The user ID creating the template
   * @returns The created report template with ID
   */
  async createCustomReportTemplate(
    template: CustomReportTemplate,
    userId: string
  ): Promise<CustomReportTemplate> {
    return db.transaction(async (client) => {
      try {
        // Validate the template
        this.validateCustomReportTemplate(template);

        // Generate a new UUID
        const id = uuidv4();

        // Insert the template
        await client.query(
          `INSERT INTO m_custom_report_template (
            id, name, display_name, description, data_sources, report_config,
            is_template, is_public, parent_template_id, owner_id, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)`,
          [
            id,
            template.name,
            template.displayName,
            template.description,
            JSON.stringify(template.dataSources),
            JSON.stringify(template.reportConfig),
            template.isTemplate,
            template.isPublic,
            template.parentTemplateId,
            userId
          ]
        );

        // Insert parameters if provided
        if (template.parameters && template.parameters.length > 0) {
          for (const param of template.parameters) {
            await client.query(
              `INSERT INTO m_custom_report_parameter (
                id, report_id, name, display_name, parameter_type,
                default_value, options, is_required, validation_rules,
                help_text, order_position
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                uuidv4(),
                id,
                param.name,
                param.displayName,
                param.parameterType,
                param.defaultValue !== undefined ? JSON.stringify(param.defaultValue) : null,
                param.options ? JSON.stringify(param.options) : null,
                param.isRequired,
                param.validationRules ? JSON.stringify(param.validationRules) : null,
                param.helpText,
                param.orderPosition
              ]
            );
          }
        }

        // Return the created template with ID
        return {
          ...template,
          id,
          ownerId: userId,
          createdDate: new Date()
        };
      } catch (error) {
        logger.error('Error creating custom report template', { 
          template: template.name, 
          userId, 
          error 
        });

        if (error instanceof CustomReportError) {
          throw error;
        }

        throw new CustomReportError(`Failed to create custom report template: ${error.message}`);
      }
    });
  }

  /**
   * Update an existing custom report template
   * 
   * @param id The template ID
   * @param template The updated template data
   * @param userId The user ID updating the template
   * @returns The updated template
   */
  async updateCustomReportTemplate(
    id: string,
    template: Partial<CustomReportTemplate>,
    userId: string
  ): Promise<CustomReportTemplate> {
    return db.transaction(async (client) => {
      try {
        // Verify the template exists and user has permissions
        const existingTemplate = await this.getCustomReportTemplate(id);
        
        if (!existingTemplate) {
          throw new CustomReportError(`Custom report template with ID ${id} not found`);
        }

        // Only the owner or admin can update the template
        if (existingTemplate.ownerId !== userId && !(await this.isUserAdmin(userId))) {
          throw new CustomReportError('You do not have permission to update this template');
        }

        // Build the update query
        const updates: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;

        if (template.name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          values.push(template.name);
        }

        if (template.displayName !== undefined) {
          updates.push(`display_name = $${paramIndex++}`);
          values.push(template.displayName);
        }

        if (template.description !== undefined) {
          updates.push(`description = $${paramIndex++}`);
          values.push(template.description);
        }

        if (template.dataSources !== undefined) {
          updates.push(`data_sources = $${paramIndex++}`);
          values.push(JSON.stringify(template.dataSources));
        }

        if (template.reportConfig !== undefined) {
          updates.push(`report_config = $${paramIndex++}`);
          values.push(JSON.stringify(template.reportConfig));
        }

        if (template.isTemplate !== undefined) {
          updates.push(`is_template = $${paramIndex++}`);
          values.push(template.isTemplate);
        }

        if (template.isPublic !== undefined) {
          updates.push(`is_public = $${paramIndex++}`);
          values.push(template.isPublic);
        }

        if (template.parentTemplateId !== undefined) {
          updates.push(`parent_template_id = $${paramIndex++}`);
          values.push(template.parentTemplateId);
        }

        // Add ID and updated timestamp
        values.push(id);
        
        // Execute the update if there are changes
        if (updates.length > 0) {
          await client.query(
            `UPDATE m_custom_report_template 
             SET ${updates.join(', ')}
             WHERE id = $${paramIndex}`,
            values
          );
        }

        // Update parameters if provided
        if (template.parameters !== undefined) {
          // Delete existing parameters
          await client.query(
            'DELETE FROM m_custom_report_parameter WHERE report_id = $1',
            [id]
          );

          // Add new parameters
          for (const param of template.parameters) {
            await client.query(
              `INSERT INTO m_custom_report_parameter (
                id, report_id, name, display_name, parameter_type,
                default_value, options, is_required, validation_rules,
                help_text, order_position
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
              [
                uuidv4(),
                id,
                param.name,
                param.displayName,
                param.parameterType,
                param.defaultValue !== undefined ? JSON.stringify(param.defaultValue) : null,
                param.options ? JSON.stringify(param.options) : null,
                param.isRequired,
                param.validationRules ? JSON.stringify(param.validationRules) : null,
                param.helpText,
                param.orderPosition
              ]
            );
          }
        }

        // Get the updated template
        return this.getCustomReportTemplate(id);
      } catch (error) {
        logger.error('Error updating custom report template', { 
          id, 
          userId, 
          error 
        });

        if (error instanceof CustomReportError) {
          throw error;
        }

        throw new CustomReportError(`Failed to update custom report template: ${error.message}`);
      }
    });
  }

  /**
   * Get a custom report template by ID
   * 
   * @param id The template ID
   * @returns The report template or undefined if not found
   */
  async getCustomReportTemplate(id: string): Promise<CustomReportTemplate | undefined> {
    try {
      // Query the template
      const result = await db.query(
        `SELECT t.*, u.display_name as owner_name
         FROM m_custom_report_template t
         LEFT JOIN m_appuser u ON t.owner_id = u.id
         WHERE t.id = $1`,
        [id]
      );

      if (result.rowCount === 0) {
        return undefined;
      }

      const templateData = result.rows[0];

      // Query the parameters
      const paramsResult = await db.query(
        `SELECT * FROM m_custom_report_parameter 
         WHERE report_id = $1 
         ORDER BY order_position`,
        [id]
      );

      // Map the parameters
      const parameters = paramsResult.rows.map(row => ({
        id: row.id,
        reportId: row.report_id,
        name: row.name,
        displayName: row.display_name,
        parameterType: row.parameter_type,
        defaultValue: row.default_value ? JSON.parse(row.default_value) : undefined,
        options: row.options ? JSON.parse(row.options) : undefined,
        isRequired: row.is_required,
        validationRules: row.validation_rules ? JSON.parse(row.validation_rules) : undefined,
        helpText: row.help_text,
        orderPosition: row.order_position
      }));

      // Return the template with parameters
      return {
        id: templateData.id,
        name: templateData.name,
        displayName: templateData.display_name,
        description: templateData.description,
        dataSources: templateData.data_sources,
        reportConfig: templateData.report_config,
        isTemplate: templateData.is_template,
        isPublic: templateData.is_public,
        parentTemplateId: templateData.parent_template_id,
        ownerId: templateData.owner_id,
        createdDate: templateData.created_date,
        updatedDate: templateData.updated_date,
        parameters
      };
    } catch (error) {
      logger.error('Error getting custom report template', { id, error });
      throw new CustomReportError(`Failed to get custom report template: ${error.message}`);
    }
  }

  /**
   * List custom report templates
   * 
   * @param filters Optional filters
   * @param userId User ID for permission checking
   * @returns List of templates with count
   */
  async listCustomReportTemplates(
    filters: {
      search?: string;
      isTemplate?: boolean;
      isPublic?: boolean;
      ownerId?: string;
      parentTemplateId?: string;
      limit?: number;
      offset?: number;
    },
    userId: string
  ): Promise<{ templates: CustomReportTemplate[]; count: number }> {
    try {
      const isAdmin = await this.isUserAdmin(userId);
      
      // Build the query conditions
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Filter by public/private access
      if (!isAdmin) {
        conditions.push(`(t.is_public = true OR t.owner_id = $${paramIndex++})`);
        params.push(userId);
      }

      // Filter by search term
      if (filters.search) {
        conditions.push(`(
          t.name ILIKE $${paramIndex} OR 
          t.display_name ILIKE $${paramIndex} OR 
          t.description ILIKE $${paramIndex}
        )`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Filter by template flag
      if (filters.isTemplate !== undefined) {
        conditions.push(`t.is_template = $${paramIndex++}`);
        params.push(filters.isTemplate);
      }

      // Filter by public flag
      if (filters.isPublic !== undefined) {
        conditions.push(`t.is_public = $${paramIndex++}`);
        params.push(filters.isPublic);
      }

      // Filter by owner
      if (filters.ownerId) {
        conditions.push(`t.owner_id = $${paramIndex++}`);
        params.push(filters.ownerId);
      }

      // Filter by parent template
      if (filters.parentTemplateId) {
        conditions.push(`t.parent_template_id = $${paramIndex++}`);
        params.push(filters.parentTemplateId);
      }

      // Build the where clause
      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';

      // Count query
      const countResult = await db.query(
        `SELECT COUNT(*) FROM m_custom_report_template t ${whereClause}`,
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
        `SELECT t.*, u.display_name as owner_name
         FROM m_custom_report_template t
         LEFT JOIN m_appuser u ON t.owner_id = u.id
         ${whereClause}
         ORDER BY t.created_date DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        params
      );

      // Map the results
      const templates: CustomReportTemplate[] = await Promise.all(
        result.rows.map(async row => {
          // Get parameters for each template
          const paramsResult = await db.query(
            `SELECT * FROM m_custom_report_parameter 
             WHERE report_id = $1 
             ORDER BY order_position`,
            [row.id]
          );

          const parameters = paramsResult.rows.map(paramRow => ({
            id: paramRow.id,
            reportId: paramRow.report_id,
            name: paramRow.name,
            displayName: paramRow.display_name,
            parameterType: paramRow.parameter_type,
            defaultValue: paramRow.default_value ? JSON.parse(paramRow.default_value) : undefined,
            options: paramRow.options ? JSON.parse(paramRow.options) : undefined,
            isRequired: paramRow.is_required,
            validationRules: paramRow.validation_rules ? JSON.parse(paramRow.validation_rules) : undefined,
            helpText: paramRow.help_text,
            orderPosition: paramRow.order_position
          }));

          return {
            id: row.id,
            name: row.name,
            displayName: row.display_name,
            description: row.description,
            dataSources: row.data_sources,
            reportConfig: row.report_config,
            isTemplate: row.is_template,
            isPublic: row.is_public,
            parentTemplateId: row.parent_template_id,
            ownerId: row.owner_id,
            createdDate: row.created_date,
            updatedDate: row.updated_date,
            parameters
          };
        })
      );

      return { templates, count };
    } catch (error) {
      logger.error('Error listing custom report templates', { filters, error });
      throw new CustomReportError(`Failed to list custom report templates: ${error.message}`);
    }
  }

  /**
   * Delete a custom report template
   * 
   * @param id The template ID to delete
   * @param userId The user ID attempting the deletion
   * @returns Success flag
   */
  async deleteCustomReportTemplate(id: string, userId: string): Promise<boolean> {
    try {
      // Verify the template exists and user has permissions
      const template = await this.getCustomReportTemplate(id);
      
      if (!template) {
        throw new CustomReportError(`Custom report template with ID ${id} not found`);
      }

      // Only the owner or admin can delete the template
      if (template.ownerId !== userId && !(await this.isUserAdmin(userId))) {
        throw new CustomReportError('You do not have permission to delete this template');
      }

      // Check if this is a system template
      if (template.isTemplate && template.isPublic && (await this.isSystemTemplate(id))) {
        throw new CustomReportError('System templates cannot be deleted');
      }

      // Delete the template (will cascade to parameters due to foreign key)
      const result = await db.query(
        'DELETE FROM m_custom_report_template WHERE id = $1',
        [id]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting custom report template', { id, userId, error });
      
      if (error instanceof CustomReportError) {
        throw error;
      }

      throw new CustomReportError(`Failed to delete custom report template: ${error.message}`);
    }
  }

  /**
   * Add a parameter to a custom report template
   * 
   * @param reportId The report template ID
   * @param parameter The parameter to add
   * @param userId The user ID adding the parameter
   * @returns The added parameter with ID
   */
  async addCustomReportParameter(
    reportId: string,
    parameter: CustomReportParameter,
    userId: string
  ): Promise<CustomReportParameter> {
    try {
      // Verify the template exists and user has permissions
      const template = await this.getCustomReportTemplate(reportId);
      
      if (!template) {
        throw new CustomReportError(`Custom report template with ID ${reportId} not found`);
      }

      // Only the owner or admin can modify the template
      if (template.ownerId !== userId && !(await this.isUserAdmin(userId))) {
        throw new CustomReportError('You do not have permission to modify this template');
      }

      // Validate the parameter
      this.validateParameter(parameter);

      // Generate a new UUID
      const id = uuidv4();

      // Insert the parameter
      await db.query(
        `INSERT INTO m_custom_report_parameter (
          id, report_id, name, display_name, parameter_type,
          default_value, options, is_required, validation_rules,
          help_text, order_position
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          reportId,
          parameter.name,
          parameter.displayName,
          parameter.parameterType,
          parameter.defaultValue !== undefined ? JSON.stringify(parameter.defaultValue) : null,
          parameter.options ? JSON.stringify(parameter.options) : null,
          parameter.isRequired,
          parameter.validationRules ? JSON.stringify(parameter.validationRules) : null,
          parameter.helpText,
          parameter.orderPosition
        ]
      );

      // Return the added parameter with ID
      return {
        ...parameter,
        id,
        reportId
      };
    } catch (error) {
      logger.error('Error adding custom report parameter', { 
        reportId, 
        parameter: parameter.name, 
        error 
      });

      if (error instanceof CustomReportError) {
        throw error;
      }

      throw new CustomReportError(`Failed to add custom report parameter: ${error.message}`);
    }
  }

  /**
   * Update a custom report parameter
   * 
   * @param id The parameter ID
   * @param parameter The updated parameter data
   * @param userId The user ID updating the parameter
   * @returns The updated parameter
   */
  async updateCustomReportParameter(
    id: string,
    parameter: Partial<CustomReportParameter>,
    userId: string
  ): Promise<CustomReportParameter> {
    try {
      // Get the existing parameter
      const result = await db.query(
        'SELECT * FROM m_custom_report_parameter WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        throw new CustomReportError(`Parameter with ID ${id} not found`);
      }

      const existingParam = result.rows[0];
      const reportId = existingParam.report_id;

      // Check if user has permission to modify the report
      const template = await this.getCustomReportTemplate(reportId);
      
      if (!template) {
        throw new CustomReportError(`Custom report template with ID ${reportId} not found`);
      }

      // Only the owner or admin can modify the template
      if (template.ownerId !== userId && !(await this.isUserAdmin(userId))) {
        throw new CustomReportError('You do not have permission to modify this template');
      }

      // Build the update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (parameter.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(parameter.name);
      }

      if (parameter.displayName !== undefined) {
        updates.push(`display_name = $${paramIndex++}`);
        values.push(parameter.displayName);
      }

      if (parameter.parameterType !== undefined) {
        updates.push(`parameter_type = $${paramIndex++}`);
        values.push(parameter.parameterType);
      }

      if (parameter.defaultValue !== undefined) {
        updates.push(`default_value = $${paramIndex++}`);
        values.push(JSON.stringify(parameter.defaultValue));
      }

      if (parameter.options !== undefined) {
        updates.push(`options = $${paramIndex++}`);
        values.push(parameter.options ? JSON.stringify(parameter.options) : null);
      }

      if (parameter.isRequired !== undefined) {
        updates.push(`is_required = $${paramIndex++}`);
        values.push(parameter.isRequired);
      }

      if (parameter.validationRules !== undefined) {
        updates.push(`validation_rules = $${paramIndex++}`);
        values.push(parameter.validationRules ? JSON.stringify(parameter.validationRules) : null);
      }

      if (parameter.helpText !== undefined) {
        updates.push(`help_text = $${paramIndex++}`);
        values.push(parameter.helpText);
      }

      if (parameter.orderPosition !== undefined) {
        updates.push(`order_position = $${paramIndex++}`);
        values.push(parameter.orderPosition);
      }

      // Add ID
      values.push(id);

      // Execute the update if there are changes
      if (updates.length > 0) {
        await db.query(
          `UPDATE m_custom_report_parameter 
           SET ${updates.join(', ')}
           WHERE id = $${paramIndex}`,
          values
        );
      }

      // Get the updated parameter
      const updatedResult = await db.query(
        'SELECT * FROM m_custom_report_parameter WHERE id = $1',
        [id]
      );

      const updatedParam = updatedResult.rows[0];

      // Return the updated parameter
      return {
        id: updatedParam.id,
        reportId: updatedParam.report_id,
        name: updatedParam.name,
        displayName: updatedParam.display_name,
        parameterType: updatedParam.parameter_type,
        defaultValue: updatedParam.default_value ? JSON.parse(updatedParam.default_value) : undefined,
        options: updatedParam.options ? JSON.parse(updatedParam.options) : undefined,
        isRequired: updatedParam.is_required,
        validationRules: updatedParam.validation_rules ? JSON.parse(updatedParam.validation_rules) : undefined,
        helpText: updatedParam.help_text,
        orderPosition: updatedParam.order_position
      };
    } catch (error) {
      logger.error('Error updating custom report parameter', { 
        id, 
        userId, 
        error 
      });

      if (error instanceof CustomReportError) {
        throw error;
      }

      throw new CustomReportError(`Failed to update custom report parameter: ${error.message}`);
    }
  }

  /**
   * Delete a custom report parameter
   * 
   * @param id The parameter ID to delete
   * @param userId The user ID attempting the deletion
   * @returns Success flag
   */
  async deleteCustomReportParameter(id: string, userId: string): Promise<boolean> {
    try {
      // Get the parameter to check permissions
      const result = await db.query(
        'SELECT * FROM m_custom_report_parameter WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        throw new CustomReportError(`Parameter with ID ${id} not found`);
      }

      const param = result.rows[0];
      const reportId = param.report_id;

      // Check if user has permission to modify the report
      const template = await this.getCustomReportTemplate(reportId);
      
      if (!template) {
        throw new CustomReportError(`Custom report template with ID ${reportId} not found`);
      }

      // Only the owner or admin can modify the template
      if (template.ownerId !== userId && !(await this.isUserAdmin(userId))) {
        throw new CustomReportError('You do not have permission to modify this template');
      }

      // Delete the parameter
      const deleteResult = await db.query(
        'DELETE FROM m_custom_report_parameter WHERE id = $1',
        [id]
      );

      return deleteResult.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting custom report parameter', { 
        id, 
        userId, 
        error 
      });

      if (error instanceof CustomReportError) {
        throw error;
      }

      throw new CustomReportError(`Failed to delete custom report parameter: ${error.message}`);
    }
  }

  /**
   * Execute a custom report
   * 
   * @param request The execution request
   * @param userId The user ID executing the report
   * @returns The execution result with data
   */
  async executeCustomReport(
    request: {
      reportId: string;
      savedQueryId?: string;
      parameters: { [key: string]: any };
      filters?: any;
      sorting?: any;
      pagination?: { pageSize: number; pageNumber: number };
    },
    userId: string
  ): Promise<{
    execution: CustomReportExecution;
    data: any[];
    columns: { name: string; displayName: string; dataType: string; isVisible: boolean }[];
  }> {
    const startTime = Date.now();
    
    try {
      // Load saved query if specified
      if (request.savedQueryId) {
        const savedQuery = await this.getSavedQuery(request.savedQueryId);
        if (!savedQuery) {
          throw new CustomReportError(`Saved query with ID ${request.savedQueryId} not found`);
        }

        // Merge saved query parameters with request parameters
        request.parameters = {
          ...savedQuery.parameters,
          ...request.parameters
        };

        // Merge saved query filters with request filters
        if (savedQuery.filters) {
          request.filters = {
            ...savedQuery.filters,
            ...request.filters
          };
        }

        // Use the report ID from the saved query
        request.reportId = savedQuery.reportId;
      }

      // Get the report template
      const template = await this.getCustomReportTemplate(request.reportId);
      
      if (!template) {
        throw new CustomReportError(`Custom report template with ID ${request.reportId} not found`);
      }

      // Check if the user has access to the report
      if (!template.isPublic && template.ownerId !== userId && !(await this.isUserAdmin(userId))) {
        throw new CustomReportError('You do not have permission to execute this report');
      }

      // Validate parameters
      this.validateParameterValues(template.parameters || [], request.parameters);

      // Generate SQL query
      const { sql, params } = this.generateSqlQuery(template, request);
      
      logger.debug('Executing custom report query', { 
        reportId: template.id, 
        sql, 
        params 
      });

      // Execute the query
      const result = await db.query(sql, params);
      
      const executionTime = Date.now() - startTime;
      
      // Prepare the results
      const data = result.rows.map(row => {
        // Convert snake_case to camelCase for consistency
        const transformedRow: any = {};
        
        for (const key in row) {
          if (Object.prototype.hasOwnProperty.call(row, key)) {
            transformedRow[this.snakeToCamel(key)] = row[key];
          }
        }
        
        return transformedRow;
      });

      // Prepare column metadata
      const columns = template.reportConfig.columns
        .filter(col => col.isVisible)
        .map(col => ({
          name: this.snakeToCamel(col.name),
          displayName: col.displayName,
          dataType: col.dataType,
          isVisible: col.isVisible
        }));

      // Log the execution to history
      const executionId = await this.logReportExecution({
        reportId: template.id,
        savedQueryId: request.savedQueryId,
        parameters: request.parameters,
        filters: request.filters,
        sorting: request.sorting,
        rowCount: data.length,
        executionTimeMs: executionTime,
        status: ExecutionStatus.SUCCESS,
        ownerId: userId
      });

      // Prepare execution record
      const execution: CustomReportExecution = {
        id: executionId,
        reportId: template.id,
        savedQueryId: request.savedQueryId,
        executionDate: new Date(),
        parameters: request.parameters,
        filters: request.filters,
        sorting: request.sorting,
        executionTimeMs: executionTime,
        rowCount: data.length,
        status: ExecutionStatus.SUCCESS,
        ownerId: userId
      };

      return { execution, data, columns };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error('Error executing custom report', { 
        reportId: request.reportId, 
        userId, 
        parameters: request.parameters, 
        error 
      });

      // Log failed execution
      try {
        await this.logReportExecution({
          reportId: request.reportId,
          savedQueryId: request.savedQueryId,
          parameters: request.parameters,
          filters: request.filters,
          sorting: request.sorting,
          rowCount: 0,
          executionTimeMs: executionTime,
          status: ExecutionStatus.FAILED,
          errorMessage: error.message,
          ownerId: userId
        });
      } catch (logError) {
        logger.error('Failed to log report execution error', { logError });
      }

      if (error instanceof CustomReportError) {
        throw error;
      }

      throw new CustomReportExecutionError(`Failed to execute custom report: ${error.message}`);
    }
  }

  /**
   * Save a custom report query
   * 
   * @param query The query to save
   * @param userId The user ID saving the query
   * @returns The saved query with ID
   */
  async saveCustomReportQuery(
    query: CustomReportSavedQuery,
    userId: string
  ): Promise<CustomReportSavedQuery> {
    try {
      // Verify the template exists and user has access
      const template = await this.getCustomReportTemplate(query.reportId);
      
      if (!template) {
        throw new CustomReportError(`Custom report template with ID ${query.reportId} not found`);
      }

      // Generate a new UUID
      const id = uuidv4();

      // Insert the saved query
      await db.query(
        `INSERT INTO m_custom_report_saved_query (
          id, report_id, name, description, parameters, filters,
          owner_id, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [
          id,
          query.reportId,
          query.name,
          query.description,
          JSON.stringify(query.parameters),
          query.filters ? JSON.stringify(query.filters) : null,
          userId
        ]
      );

      // Return the saved query with ID
      return {
        ...query,
        id,
        ownerId: userId,
        createdDate: new Date()
      };
    } catch (error) {
      logger.error('Error saving custom report query', { 
        reportId: query.reportId, 
        userId, 
        error 
      });

      if (error instanceof CustomReportError) {
        throw error;
      }

      throw new CustomReportError(`Failed to save custom report query: ${error.message}`);
    }
  }

  /**
   * Get a saved query by ID
   * 
   * @param id The saved query ID
   * @returns The saved query or undefined if not found
   */
  async getSavedQuery(id: string): Promise<CustomReportSavedQuery | undefined> {
    try {
      const result = await db.query(
        `SELECT q.*, r.name as report_name, r.display_name as report_display_name
         FROM m_custom_report_saved_query q
         JOIN m_custom_report_template r ON q.report_id = r.id
         WHERE q.id = $1`,
        [id]
      );

      if (result.rowCount === 0) {
        return undefined;
      }

      const row = result.rows[0];

      return {
        id: row.id,
        reportId: row.report_id,
        name: row.name,
        description: row.description,
        parameters: row.parameters,
        filters: row.filters,
        ownerId: row.owner_id,
        createdDate: row.created_date,
        updatedDate: row.updated_date
      };
    } catch (error) {
      logger.error('Error getting saved query', { id, error });
      throw new CustomReportError(`Failed to get saved query: ${error.message}`);
    }
  }

  /**
   * Get saved queries for a report
   * 
   * @param filters Filters for the query list
   * @param userId The user ID
   * @returns List of saved queries
   */
  async getSavedQueries(
    filters: {
      reportId?: string;
      ownerId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
    userId: string
  ): Promise<{ queries: CustomReportSavedQuery[]; count: number }> {
    try {
      const isAdmin = await this.isUserAdmin(userId);
      
      // Build the query conditions
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Filter by owner (non-admins can only see their own queries)
      if (!isAdmin) {
        conditions.push(`q.owner_id = $${paramIndex++}`);
        params.push(userId);
      } else if (filters.ownerId) {
        conditions.push(`q.owner_id = $${paramIndex++}`);
        params.push(filters.ownerId);
      }

      // Filter by report
      if (filters.reportId) {
        conditions.push(`q.report_id = $${paramIndex++}`);
        params.push(filters.reportId);
      }

      // Filter by search term
      if (filters.search) {
        conditions.push(`(
          q.name ILIKE $${paramIndex} OR 
          q.description ILIKE $${paramIndex}
        )`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Build the where clause
      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';

      // Count query
      const countResult = await db.query(
        `SELECT COUNT(*) FROM m_custom_report_saved_query q ${whereClause}`,
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
        `SELECT q.*, r.name as report_name, r.display_name as report_display_name,
                u.display_name as owner_name
         FROM m_custom_report_saved_query q
         JOIN m_custom_report_template r ON q.report_id = r.id
         LEFT JOIN m_appuser u ON q.owner_id = u.id
         ${whereClause}
         ORDER BY q.created_date DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        params
      );

      // Map the results
      const queries = result.rows.map(row => ({
        id: row.id,
        reportId: row.report_id,
        name: row.name,
        description: row.description,
        parameters: row.parameters,
        filters: row.filters,
        ownerId: row.owner_id,
        createdDate: row.created_date,
        updatedDate: row.updated_date
      }));

      return { queries, count };
    } catch (error) {
      logger.error('Error getting saved queries', { filters, userId, error });
      throw new CustomReportError(`Failed to get saved queries: ${error.message}`);
    }
  }

  /**
   * Delete a saved query
   * 
   * @param id The saved query ID to delete
   * @param userId The user ID attempting the deletion
   * @returns Success flag
   */
  async deleteSavedQuery(id: string, userId: string): Promise<boolean> {
    try {
      // Get the saved query to check permissions
      const query = await this.getSavedQuery(id);
      
      if (!query) {
        throw new CustomReportError(`Saved query with ID ${id} not found`);
      }

      // Only the owner or admin can delete the query
      if (query.ownerId !== userId && !(await this.isUserAdmin(userId))) {
        throw new CustomReportError('You do not have permission to delete this saved query');
      }

      // Delete the saved query
      const result = await db.query(
        'DELETE FROM m_custom_report_saved_query WHERE id = $1',
        [id]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting saved query', { id, userId, error });
      
      if (error instanceof CustomReportError) {
        throw error;
      }

      throw new CustomReportError(`Failed to delete saved query: ${error.message}`);
    }
  }

  /**
   * Get the execution history for a report
   * 
   * @param filters Filters for the history list
   * @param userId The user ID
   * @returns List of execution records
   */
  async getExecutionHistory(
    filters: {
      reportId?: string;
      ownerId?: string;
      status?: ExecutionStatus;
      fromDate?: Date;
      toDate?: Date;
      limit?: number;
      offset?: number;
    },
    userId: string
  ): Promise<{ executions: CustomReportExecution[]; count: number }> {
    try {
      const isAdmin = await this.isUserAdmin(userId);
      
      // Build the query conditions
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Filter by owner (non-admins can only see their own executions)
      if (!isAdmin) {
        conditions.push(`e.owner_id = $${paramIndex++}`);
        params.push(userId);
      } else if (filters.ownerId) {
        conditions.push(`e.owner_id = $${paramIndex++}`);
        params.push(filters.ownerId);
      }

      // Filter by report
      if (filters.reportId) {
        conditions.push(`e.report_id = $${paramIndex++}`);
        params.push(filters.reportId);
      }

      // Filter by status
      if (filters.status) {
        conditions.push(`e.status = $${paramIndex++}`);
        params.push(filters.status);
      }

      // Filter by date range
      if (filters.fromDate) {
        conditions.push(`e.execution_date >= $${paramIndex++}`);
        params.push(filters.fromDate);
      }

      if (filters.toDate) {
        conditions.push(`e.execution_date <= $${paramIndex++}`);
        params.push(filters.toDate);
      }

      // Build the where clause
      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';

      // Count query
      const countResult = await db.query(
        `SELECT COUNT(*) FROM m_custom_report_execution e ${whereClause}`,
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
        `SELECT e.*, r.name as report_name, r.display_name as report_display_name,
                u.display_name as owner_name
         FROM m_custom_report_execution e
         JOIN m_custom_report_template r ON e.report_id = r.id
         LEFT JOIN m_appuser u ON e.owner_id = u.id
         ${whereClause}
         ORDER BY e.execution_date DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        params
      );

      // Map the results
      const executions = result.rows.map(row => ({
        id: row.id,
        reportId: row.report_id,
        savedQueryId: row.saved_query_id,
        executionDate: row.execution_date,
        parameters: row.parameters,
        filters: row.filters,
        sorting: row.sorting,
        executionTimeMs: row.execution_time_ms,
        rowCount: row.row_count,
        resultMetadata: row.result_metadata,
        status: row.status,
        errorMessage: row.error_message,
        ownerId: row.owner_id
      }));

      return { executions, count };
    } catch (error) {
      logger.error('Error getting execution history', { filters, userId, error });
      throw new CustomReportError(`Failed to get execution history: ${error.message}`);
    }
  }

  /**
   * Export a custom report to the specified format
   * 
   * @param request Export request parameters
   * @param userId User ID
   * @returns The exported file data
   */
  async exportCustomReport(
    request: {
      reportId: string;
      savedQueryId?: string;
      parameters: { [key: string]: any };
      filters?: any;
      format: string;
      fileName?: string;
    },
    userId: string
  ): Promise<{ fileName: string; contentType: string; data: Buffer }> {
    try {
      // Execute the report to get the data
      const { execution, data, columns } = await this.executeCustomReport(
        {
          reportId: request.reportId,
          savedQueryId: request.savedQueryId,
          parameters: request.parameters,
          filters: request.filters,
          pagination: { pageSize: 5000, pageNumber: 1 } // Larger page size for exports
        },
        userId
      );

      // Get the report template for metadata
      const template = await this.getCustomReportTemplate(execution.reportId);
      
      if (!template) {
        throw new CustomReportError(`Custom report template not found`);
      }

      // Generate file name if not provided
      const timestamp = new Date().toISOString().replace(/[:.-]/g, '').substring(0, 15);
      const fileName = request.fileName || 
        `${this.sanitizeFileName(template.name)}_${timestamp}`;

      // Export based on format
      const format = request.format.toLowerCase();
      switch (format) {
        case 'pdf':
          return this.exportToPdf(template, data, columns, fileName);
        case 'excel':
          return this.exportToExcel(template, data, columns, fileName);
        case 'csv':
          return this.exportToCsv(template, data, columns, fileName);
        case 'json':
          return this.exportToJson(template, data, fileName);
        default:
          throw new CustomReportError(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error('Error exporting custom report', { 
        reportId: request.reportId, 
        userId, 
        format: request.format, 
        error 
      });

      if (error instanceof CustomReportError) {
        throw error;
      }

      throw new CustomReportError(`Failed to export custom report: ${error.message}`);
    }
  }

  /**
   * Generate SQL query from a custom report template definition
   * 
   * @param template The report template
   * @param request The execution request
   * @returns SQL query string and parameters
   */
  private generateSqlQuery(
    template: CustomReportTemplate,
    request: {
      parameters: { [key: string]: any };
      filters?: any;
      sorting?: any;
      pagination?: { pageSize: number; pageNumber: number };
    }
  ): { sql: string; params: any[] } {
    try {
      const params: any[] = [];
      let paramIndex = 1;
      const reportConfig = template.reportConfig;
      const dataSources = template.dataSources;

      // Build SELECT clause
      let selectClause = 'SELECT ';

      // Add columns
      const columnExpressions = reportConfig.columns
        .filter(col => col.isVisible)
        .map(col => {
          const source = col.source ? `${col.source}.` : '';
          if (col.expression) {
            return `${col.expression} AS ${col.name}`;
          }
          return `${source}${col.name} AS ${col.name}`;
        });

      selectClause += columnExpressions.join(', ');

      // Build FROM clause
      const mainSource = dataSources[0];
      let fromClause = ` FROM ${mainSource.name}`;
      
      if (mainSource.alias) {
        fromClause += ` AS ${mainSource.alias}`;
      }

      // Add JOINs
      let joinClause = '';
      if (reportConfig.joins && reportConfig.joins.length > 0) {
        for (const join of reportConfig.joins) {
          const leftSourceObj = dataSources.find(ds => ds.name === join.leftSource || ds.alias === join.leftSource);
          const rightSourceObj = dataSources.find(ds => ds.name === join.rightSource || ds.alias === join.rightSource);
          
          if (!leftSourceObj || !rightSourceObj) {
            throw new CustomReportValidationError(`Invalid join sources: ${join.leftSource} or ${join.rightSource}`);
          }

          const leftSource = leftSourceObj.alias || leftSourceObj.name;
          const rightSource = rightSourceObj.name;
          const rightAlias = rightSourceObj.alias;

          joinClause += ` ${join.type.toUpperCase()} JOIN ${rightSource}`;
          
          if (rightAlias) {
            joinClause += ` AS ${rightAlias}`;
          }

          joinClause += ` ON ${leftSource}.${join.leftColumn} = ${rightAlias || rightSource}.${join.rightColumn}`;
          
          if (join.additionalCondition) {
            joinClause += ` AND ${join.additionalCondition}`;
          }
        }
      }

      // Build WHERE clause
      let whereClause = '';
      if (reportConfig.filters || request.filters) {
        const conditions: string[] = [];

        // Add conditions from report configuration
        if (reportConfig.filters) {
          const configWhere = this.buildWhereClause(
            reportConfig.filters,
            request.parameters,
            params,
            paramIndex
          );
          
          if (configWhere.sql) {
            conditions.push(configWhere.sql);
            paramIndex = configWhere.nextParamIndex;
          }
        }

        // Add conditions from request filters
        if (request.filters) {
          // Convert request filters to condition group
          const requestFilterGroup = this.convertRequestFilters(request.filters);
          
          const requestWhere = this.buildWhereClause(
            requestFilterGroup,
            request.parameters,
            params,
            paramIndex
          );
          
          if (requestWhere.sql) {
            conditions.push(requestWhere.sql);
            paramIndex = requestWhere.nextParamIndex;
          }
        }

        // Combine conditions
        if (conditions.length > 0) {
          whereClause = ` WHERE ${conditions.join(' AND ')}`;
        }
      }

      // Build GROUP BY clause
      let groupByClause = '';
      if (reportConfig.groupBy && reportConfig.groupBy.length > 0) {
        groupByClause = ` GROUP BY ${reportConfig.groupBy.map(gb => gb.column).join(', ')}`;
      }

      // Build HAVING clause
      let havingClause = '';
      if (reportConfig.havingConditions) {
        const havingResult = this.buildWhereClause(
          reportConfig.havingConditions,
          request.parameters,
          params,
          paramIndex
        );
        
        if (havingResult.sql) {
          havingClause = ` HAVING ${havingResult.sql}`;
          paramIndex = havingResult.nextParamIndex;
        }
      }

      // Build ORDER BY clause
      let orderByClause = '';
      
      // First use request sorting if provided
      if (request.sorting && Array.isArray(request.sorting) && request.sorting.length > 0) {
        const sortClauses = request.sorting.map(sort => {
          const direction = sort.direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
          return `${sort.field} ${direction}`;
        });
        
        orderByClause = ` ORDER BY ${sortClauses.join(', ')}`;
      }
      // Then try configuration sorting
      else if (reportConfig.orderBy && reportConfig.orderBy.length > 0) {
        const sortClauses = reportConfig.orderBy.map(sort => {
          const direction = sort.direction?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
          return `${sort.column} ${direction}`;
        });
        
        orderByClause = ` ORDER BY ${sortClauses.join(', ')}`;
      }

      // Build LIMIT and OFFSET for pagination
      let paginationClause = '';
      let countWrapper = '';
      
      if (request.pagination) {
        const pageSize = Math.min(request.pagination.pageSize || 20, 5000); // Limit max page size
        const offset = Math.max(0, (request.pagination.pageNumber - 1) * pageSize);
        
        paginationClause = ` LIMIT ${pageSize} OFFSET ${offset}`;
        
        // Wrap query for row count
        countWrapper = `
          WITH report_data AS (
            ${selectClause}${fromClause}${joinClause}${whereClause}${groupByClause}${havingClause}${orderByClause}
          ),
          count_data AS (
            SELECT COUNT(*) AS total_count FROM report_data
          )
          SELECT rd.*, cd.total_count
          FROM report_data rd, count_data cd
        `;
      }

      // Build final SQL query
      let sql;
      
      if (countWrapper) {
        sql = `${countWrapper}${paginationClause}`;
      } else {
        sql = `${selectClause}${fromClause}${joinClause}${whereClause}${groupByClause}${havingClause}${orderByClause}${paginationClause}`;
      }

      return { sql, params };
    } catch (error) {
      logger.error('Error generating SQL query', { templateId: template.id, error });
      
      if (error instanceof CustomReportError) {
        throw error;
      }
      
      throw new CustomReportValidationError(`Failed to generate SQL query: ${error.message}`);
    }
  }

  /**
   * Build SQL WHERE clause from condition group
   * 
   * @param conditionGroup The condition group
   * @param parameters The parameter values
   * @param params The SQL parameters array
   * @param paramIndex The current parameter index
   * @returns WHERE clause SQL and next parameter index
   */
  private buildWhereClause(
    conditionGroup: ConditionGroup,
    parameters: { [key: string]: any },
    params: any[],
    paramIndex: number
  ): { sql: string; nextParamIndex: number } {
    const clauses: string[] = [];
    let nextIndex = paramIndex;

    for (const item of conditionGroup.conditions) {
      // Handle nested condition group
      if ('operator' in item) {
        const nestedResult = this.buildWhereClause(
          item,
          parameters,
          params,
          nextIndex
        );
        
        if (nestedResult.sql) {
          clauses.push(`(${nestedResult.sql})`);
          nextIndex = nestedResult.nextParamIndex;
        }
      } 
      // Handle individual condition
      else {
        const condition = item as Condition;
        let paramValue: any;
        
        // Use parameter reference if provided
        if (condition.parameterRef && parameters[condition.parameterRef] !== undefined) {
          paramValue = parameters[condition.parameterRef];
        } else {
          paramValue = condition.value;
        }
        
        // Skip if parameter is not provided and required
        if (paramValue === undefined || paramValue === null) {
          // Only skip if this is not a NULL check
          if (!['is null', 'is not null'].includes(condition.operator)) {
            continue;
          }
        }

        // Build the condition clause
        let clause: string;
        
        switch (condition.operator) {
          case 'is null':
            clause = `${condition.column} IS NULL`;
            break;
            
          case 'is not null':
            clause = `${condition.column} IS NOT NULL`;
            break;
            
          case 'in':
            if (Array.isArray(paramValue) && paramValue.length > 0) {
              const placeholders = paramValue.map(() => `$${nextIndex++}`).join(', ');
              clause = `${condition.column} IN (${placeholders})`;
              paramValue.forEach(v => params.push(v));
            } else {
              // Skip empty IN clause
              continue;
            }
            break;
            
          case 'not in':
            if (Array.isArray(paramValue) && paramValue.length > 0) {
              const placeholders = paramValue.map(() => `$${nextIndex++}`).join(', ');
              clause = `${condition.column} NOT IN (${placeholders})`;
              paramValue.forEach(v => params.push(v));
            } else {
              // Skip empty NOT IN clause
              continue;
            }
            break;
            
          case 'between':
            if (paramValue && paramValue.from !== undefined && paramValue.to !== undefined) {
              clause = `${condition.column} BETWEEN $${nextIndex} AND $${nextIndex + 1}`;
              params.push(paramValue.from);
              params.push(paramValue.to);
              nextIndex += 2;
            } else {
              // Skip incomplete BETWEEN clause
              continue;
            }
            break;
            
          case 'like':
            clause = `${condition.column} ILIKE $${nextIndex}`;
            params.push(`%${paramValue}%`);
            nextIndex++;
            break;
            
          case 'not like':
            clause = `${condition.column} NOT ILIKE $${nextIndex}`;
            params.push(`%${paramValue}%`);
            nextIndex++;
            break;
            
          default:
            // For standard operators: =, !=, >, >=, <, <=
            clause = `${condition.column} ${condition.operator} $${nextIndex}`;
            params.push(paramValue);
            nextIndex++;
            break;
        }
        
        clauses.push(clause);
      }
    }

    // If no clauses, return empty string
    if (clauses.length === 0) {
      return { sql: '', nextParamIndex: nextIndex };
    }

    // Join clauses with the group operator
    const sql = clauses.join(` ${conditionGroup.operator.toUpperCase()} `);
    
    return { sql, nextParamIndex: nextIndex };
  }

  /**
   * Convert request filters to condition group
   * 
   * @param filters The filters from the request
   * @returns Condition group structure
   */
  private convertRequestFilters(filters: any): ConditionGroup {
    // Handle if already in correct format
    if (filters && filters.operator && filters.conditions) {
      return filters as ConditionGroup;
    }

    // Convert flat object of field:value pairs to conditions
    const conditions: Condition[] = [];
    
    for (const key in filters) {
      if (Object.prototype.hasOwnProperty.call(filters, key)) {
        const value = filters[key];
        
        // Skip undefined/null values
        if (value === undefined || value === null) {
          continue;
        }

        // Create condition based on value type
        if (Array.isArray(value)) {
          conditions.push({
            column: key,
            operator: 'in',
            value
          });
        } else if (typeof value === 'object' && value.operator) {
          // Already has operator defined
          conditions.push({
            column: key,
            operator: value.operator,
            value: value.value
          });
        } else if (typeof value === 'object' && (value.from !== undefined || value.to !== undefined)) {
          // Date range or numeric range
          conditions.push({
            column: key,
            operator: 'between',
            value
          });
        } else if (typeof value === 'string') {
          // String value - use LIKE for partial matching
          conditions.push({
            column: key,
            operator: 'like',
            value
          });
        } else {
          // Other values - use equals
          conditions.push({
            column: key,
            operator: '=',
            value
          });
        }
      }
    }

    return {
      operator: 'and',
      conditions
    };
  }

  /**
   * Log a report execution to the history table
   * 
   * @param execution The execution record to log
   * @returns The created execution ID
   */
  private async logReportExecution(execution: Omit<CustomReportExecution, 'id' | 'executionDate'>): Promise<string> {
    try {
      const id = uuidv4();
      
      await db.query(
        `INSERT INTO m_custom_report_execution (
          id, report_id, saved_query_id, execution_date, parameters,
          filters, sorting, execution_time_ms, row_count, result_metadata,
          status, error_message, owner_id
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          id,
          execution.reportId,
          execution.savedQueryId,
          JSON.stringify(execution.parameters),
          execution.filters ? JSON.stringify(execution.filters) : null,
          execution.sorting ? JSON.stringify(execution.sorting) : null,
          execution.executionTimeMs,
          execution.rowCount,
          execution.resultMetadata ? JSON.stringify(execution.resultMetadata) : null,
          execution.status,
          execution.errorMessage,
          execution.ownerId
        ]
      );

      return id;
    } catch (error) {
      logger.error('Error logging report execution', { error });
      // Don't throw - this is a non-critical operation
      return uuidv4(); // Return a dummy ID
    }
  }

  /**
   * Validate a custom report template
   * 
   * @param template The template to validate
   */
  private validateCustomReportTemplate(template: CustomReportTemplate): void {
    // Check required fields
    if (!template.name) {
      throw new CustomReportValidationError('Report name is required');
    }

    if (!template.displayName) {
      throw new CustomReportValidationError('Report display name is required');
    }

    // Check data sources
    if (!template.dataSources || template.dataSources.length === 0) {
      throw new CustomReportValidationError('At least one data source is required');
    }

    // Check report configuration
    if (!template.reportConfig) {
      throw new CustomReportValidationError('Report configuration is required');
    }

    // Check columns
    if (!template.reportConfig.columns || template.reportConfig.columns.length === 0) {
      throw new CustomReportValidationError('At least one column is required');
    }

    // Validate columns
    for (const column of template.reportConfig.columns) {
      if (!column.name) {
        throw new CustomReportValidationError('Column name is required for all columns');
      }

      if (!column.displayName) {
        throw new CustomReportValidationError(`Column display name is required for column ${column.name}`);
      }

      if (!column.dataType) {
        throw new CustomReportValidationError(`Column data type is required for column ${column.name}`);
      }
    }

    // Validate joins
    if (template.reportConfig.joins) {
      for (const join of template.reportConfig.joins) {
        if (!join.leftSource) {
          throw new CustomReportValidationError('Join left source is required');
        }

        if (!join.leftColumn) {
          throw new CustomReportValidationError('Join left column is required');
        }

        if (!join.rightSource) {
          throw new CustomReportValidationError('Join right source is required');
        }

        if (!join.rightColumn) {
          throw new CustomReportValidationError('Join right column is required');
        }

        if (!join.type) {
          throw new CustomReportValidationError('Join type is required');
        }

        // Check if sources exist in the data sources
        const leftSourceExists = template.dataSources.some(
          ds => ds.name === join.leftSource || ds.alias === join.leftSource
        );

        const rightSourceExists = template.dataSources.some(
          ds => ds.name === join.rightSource || ds.alias === join.rightSource
        );

        if (!leftSourceExists) {
          throw new CustomReportValidationError(`Join left source '${join.leftSource}' does not exist in data sources`);
        }

        if (!rightSourceExists) {
          throw new CustomReportValidationError(`Join right source '${join.rightSource}' does not exist in data sources`);
        }
      }
    }

    // Validate parameters
    if (template.parameters) {
      for (const param of template.parameters) {
        this.validateParameter(param);
      }
    }
  }

  /**
   * Validate a report parameter
   * 
   * @param parameter The parameter to validate
   */
  private validateParameter(parameter: CustomReportParameter): void {
    if (!parameter.name) {
      throw new CustomReportValidationError('Parameter name is required');
    }

    if (!parameter.displayName) {
      throw new CustomReportValidationError(`Parameter display name is required for ${parameter.name}`);
    }

    if (!parameter.parameterType) {
      throw new CustomReportValidationError(`Parameter type is required for ${parameter.name}`);
    }

    // Validate type-specific requirements
    switch (parameter.parameterType) {
      case ParameterType.SELECT:
      case ParameterType.MULTI_SELECT:
        if (!parameter.options || parameter.options.length === 0) {
          throw new CustomReportValidationError(
            `Options are required for select parameter ${parameter.name}`
          );
        }
        break;
    }

    // Validate order position
    if (parameter.orderPosition === undefined) {
      throw new CustomReportValidationError(`Order position is required for parameter ${parameter.name}`);
    }
  }

  /**
   * Validate parameter values against parameter definitions
   * 
   * @param parameters Parameter definitions
   * @param values Parameter values to validate
   */
  private validateParameterValues(
    parameters: CustomReportParameter[],
    values: { [key: string]: any }
  ): void {
    for (const param of parameters) {
      const value = values[param.name];
      
      // Check required parameters
      if (param.isRequired && (value === undefined || value === null)) {
        throw new CustomReportValidationError(`Required parameter ${param.name} is missing`);
      }

      // Skip validation for optional parameters that are not provided
      if (value === undefined || value === null) {
        continue;
      }

      // Validate based on parameter type
      switch (param.parameterType) {
        case ParameterType.NUMBER:
          if (typeof value !== 'number') {
            throw new CustomReportValidationError(
              `Parameter ${param.name} must be a number`
            );
          }
          
          // Validate numeric constraints if defined
          if (param.validationRules) {
            if (param.validationRules.min !== undefined && value < param.validationRules.min) {
              throw new CustomReportValidationError(
                `Parameter ${param.name} must be at least ${param.validationRules.min}`
              );
            }
            
            if (param.validationRules.max !== undefined && value > param.validationRules.max) {
              throw new CustomReportValidationError(
                `Parameter ${param.name} must be at most ${param.validationRules.max}`
              );
            }
          }
          break;
          
        case ParameterType.TEXT:
          if (typeof value !== 'string') {
            throw new CustomReportValidationError(
              `Parameter ${param.name} must be a string`
            );
          }
          
          // Validate string constraints if defined
          if (param.validationRules) {
            if (param.validationRules.minLength !== undefined && value.length < param.validationRules.minLength) {
              throw new CustomReportValidationError(
                `Parameter ${param.name} must be at least ${param.validationRules.minLength} characters`
              );
            }
            
            if (param.validationRules.maxLength !== undefined && value.length > param.validationRules.maxLength) {
              throw new CustomReportValidationError(
                `Parameter ${param.name} must be at most ${param.validationRules.maxLength} characters`
              );
            }
            
            if (param.validationRules.pattern && !new RegExp(param.validationRules.pattern).test(value)) {
              throw new CustomReportValidationError(
                `Parameter ${param.name} must match the pattern: ${param.validationRules.pattern}`
              );
            }
          }
          break;
          
        case ParameterType.DATE:
          if (!this.isValidDate(value)) {
            throw new CustomReportValidationError(
              `Parameter ${param.name} must be a valid date`
            );
          }
          break;
          
        case ParameterType.DATE_RANGE:
          if (typeof value !== 'object' || !value.from || !value.to) {
            throw new CustomReportValidationError(
              `Parameter ${param.name} must be a date range with from and to properties`
            );
          }
          
          if (!this.isValidDate(value.from) || !this.isValidDate(value.to)) {
            throw new CustomReportValidationError(
              `Parameter ${param.name} must contain valid dates`
            );
          }
          break;
          
        case ParameterType.BOOLEAN:
          if (typeof value !== 'boolean') {
            throw new CustomReportValidationError(
              `Parameter ${param.name} must be a boolean`
            );
          }
          break;
          
        case ParameterType.SELECT:
          // Validate against select options if provided
          if (param.options && !param.options.some(option => option.value === value)) {
            throw new CustomReportValidationError(
              `Parameter ${param.name} has invalid value: ${value}`
            );
          }
          break;
          
        case ParameterType.MULTI_SELECT:
          // Validate value is an array
          if (!Array.isArray(value)) {
            throw new CustomReportValidationError(
              `Parameter ${param.name} must be an array`
            );
          }
          
          // Validate against select options if provided
          if (param.options) {
            const validValues = new Set(param.options.map(opt => opt.value));
            for (const item of value) {
              if (!validValues.has(item)) {
                throw new CustomReportValidationError(
                  `Parameter ${param.name} has invalid value: ${item}`
                );
              }
            }
          }
          break;
      }
    }
  }

  /**
   * Check if a value is a valid date
   * 
   * @param value The value to check
   * @returns Whether the value is a valid date
   */
  private isValidDate(value: any): boolean {
    if (typeof value === 'string') {
      // Try to parse as ISO date
      const date = new Date(value);
      return !isNaN(date.getTime());
    } else if (value instanceof Date) {
      return !isNaN(value.getTime());
    }
    
    return false;
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
   * Check if a template is a system template
   * 
   * @param templateId The template ID to check
   * @returns Whether the template is a system template
   */
  private async isSystemTemplate(templateId: string): Promise<boolean> {
    try {
      // System templates usually have NULL owner and are marked as templates
      const result = await db.query(
        `SELECT COUNT(*) FROM m_custom_report_template
         WHERE id = $1 AND owner_id IS NULL AND is_template = true`,
        [templateId]
      );
      
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Error checking system template status', { templateId, error });
      return false;
    }
  }

  /**
   * Convert snake_case to camelCase
   * 
   * @param str The string to convert
   * @returns The camelCase string
   */
  private snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  /**
   * Sanitize a file name to remove invalid characters
   * 
   * @param name The file name to sanitize
   * @returns The sanitized file name
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9_\-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Export data to PDF format
   * 
   * @param template The report template
   * @param data The report data
   * @param columns The column metadata
   * @param fileName The base file name
   * @returns The exported file
   */
  private exportToPdf(
    template: CustomReportTemplate,
    data: any[],
    columns: { name: string; displayName: string; dataType: string; isVisible: boolean }[],
    fileName: string
  ): { fileName: string; contentType: string; data: Buffer } {
    // TODO: Implement PDF export
    throw new CustomReportError('PDF export not yet implemented');
  }

  /**
   * Export data to Excel format
   * 
   * @param template The report template
   * @param data The report data
   * @param columns The column metadata
   * @param fileName The base file name
   * @returns The exported file
   */
  private exportToExcel(
    template: CustomReportTemplate,
    data: any[],
    columns: { name: string; displayName: string; dataType: string; isVisible: boolean }[],
    fileName: string
  ): { fileName: string; contentType: string; data: Buffer } {
    // TODO: Implement Excel export
    throw new CustomReportError('Excel export not yet implemented');
  }

  /**
   * Export data to CSV format
   * 
   * @param template The report template
   * @param data The report data
   * @param columns The column metadata
   * @param fileName The base file name
   * @returns The exported file
   */
  private exportToCsv(
    template: CustomReportTemplate,
    data: any[],
    columns: { name: string; displayName: string; dataType: string; isVisible: boolean }[],
    fileName: string
  ): { fileName: string; contentType: string; data: Buffer } {
    // TODO: Implement CSV export
    throw new CustomReportError('CSV export not yet implemented');
  }

  /**
   * Export data to JSON format
   * 
   * @param template The report template
   * @param data The report data
   * @param fileName The base file name
   * @returns The exported file
   */
  private exportToJson(
    template: CustomReportTemplate,
    data: any[],
    fileName: string
  ): { fileName: string; contentType: string; data: Buffer } {
    try {
      const jsonData = {
        reportName: template.displayName,
        generatedDate: new Date(),
        data
      };

      const jsonString = JSON.stringify(jsonData, null, 2);
      const buffer = Buffer.from(jsonString, 'utf-8');

      return {
        fileName: `${fileName}.json`,
        contentType: 'application/json',
        data: buffer
      };
    } catch (error) {
      logger.error('Error exporting to JSON', { error });
      throw new CustomReportError(`Failed to export to JSON: ${error.message}`);
    }
  }
}