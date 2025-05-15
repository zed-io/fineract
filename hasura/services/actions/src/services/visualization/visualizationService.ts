import { v4 as uuidv4 } from 'uuid';
import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import { CustomReportingService } from '../reporting/customReportingService';
import { ReportService } from '../reporting/reportService';
import {
  VisualizationComponent,
  VisualizationConfig,
  VisualizationDataSource,
  ChartData,
  VisualizationType,
  DataSourceType,
  VisualizationError,
  CustomReportError
} from '../../models/reporting/customReporting';

/**
 * Service for managing visualizations
 */
export class VisualizationService {
  private customReportService: CustomReportingService;
  private reportService: ReportService;

  constructor() {
    this.customReportService = new CustomReportingService();
    this.reportService = new ReportService();
  }

  /**
   * Create a new visualization component
   * 
   * @param component The component to create
   * @param userId The user ID creating the component
   * @returns The created component with ID
   */
  async createVisualizationComponent(
    component: VisualizationComponent,
    userId: string
  ): Promise<VisualizationComponent> {
    try {
      // Validate the component
      this.validateComponent(component);

      // Generate a new UUID
      const id = uuidv4();

      // Insert the component
      await db.query(
        `INSERT INTO m_visualization_component (
          id, name, display_name, description, component_type,
          configuration, data_source, is_template, parent_component_id,
          is_public, owner_id, created_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)`,
        [
          id,
          component.name,
          component.displayName,
          component.description,
          component.componentType,
          JSON.stringify(component.configuration),
          JSON.stringify(component.dataSource),
          component.isTemplate,
          component.parentComponentId,
          component.isPublic,
          userId
        ]
      );

      // Return the created component with ID
      return {
        ...component,
        id,
        ownerId: userId,
        createdDate: new Date()
      };
    } catch (error) {
      logger.error('Error creating visualization component', { 
        component: component.name, 
        userId, 
        error 
      });

      if (error instanceof VisualizationError) {
        throw error;
      }

      throw new VisualizationError(`Failed to create visualization component: ${error.message}`);
    }
  }

  /**
   * Update an existing visualization component
   * 
   * @param id The component ID
   * @param component The updated component data
   * @param userId The user ID updating the component
   * @returns The updated component
   */
  async updateVisualizationComponent(
    id: string,
    component: Partial<VisualizationComponent>,
    userId: string
  ): Promise<VisualizationComponent> {
    try {
      // Verify the component exists and user has permissions
      const existingComponent = await this.getVisualizationComponent(id);
      
      if (!existingComponent) {
        throw new VisualizationError(`Visualization component with ID ${id} not found`);
      }

      // Only the owner or admin can update the component
      if (existingComponent.ownerId !== userId && !(await this.isUserAdmin(userId))) {
        throw new VisualizationError('You do not have permission to update this component');
      }

      // Build the update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (component.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(component.name);
      }

      if (component.displayName !== undefined) {
        updates.push(`display_name = $${paramIndex++}`);
        values.push(component.displayName);
      }

      if (component.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(component.description);
      }

      if (component.componentType !== undefined) {
        updates.push(`component_type = $${paramIndex++}`);
        values.push(component.componentType);
      }

      if (component.configuration !== undefined) {
        updates.push(`configuration = $${paramIndex++}`);
        values.push(JSON.stringify(component.configuration));
      }

      if (component.dataSource !== undefined) {
        updates.push(`data_source = $${paramIndex++}`);
        values.push(JSON.stringify(component.dataSource));
      }

      if (component.isTemplate !== undefined) {
        updates.push(`is_template = $${paramIndex++}`);
        values.push(component.isTemplate);
      }

      if (component.parentComponentId !== undefined) {
        updates.push(`parent_component_id = $${paramIndex++}`);
        values.push(component.parentComponentId);
      }

      if (component.isPublic !== undefined) {
        updates.push(`is_public = $${paramIndex++}`);
        values.push(component.isPublic);
      }

      // Add ID
      values.push(id);

      // Execute the update if there are changes
      if (updates.length > 0) {
        await db.query(
          `UPDATE m_visualization_component 
           SET ${updates.join(', ')}
           WHERE id = $${paramIndex}`,
          values
        );
      }

      // Return the updated component
      return this.getVisualizationComponent(id);
    } catch (error) {
      logger.error('Error updating visualization component', { 
        id, 
        userId, 
        error 
      });

      if (error instanceof VisualizationError) {
        throw error;
      }

      throw new VisualizationError(`Failed to update visualization component: ${error.message}`);
    }
  }

  /**
   * Get a visualization component by ID
   * 
   * @param id The component ID
   * @returns The component or undefined if not found
   */
  async getVisualizationComponent(id: string): Promise<VisualizationComponent | undefined> {
    try {
      const result = await db.query(
        `SELECT c.*, u.display_name as owner_name
         FROM m_visualization_component c
         LEFT JOIN m_appuser u ON c.owner_id = u.id
         WHERE c.id = $1`,
        [id]
      );

      if (result.rowCount === 0) {
        return undefined;
      }

      const row = result.rows[0];

      // Return the component
      return {
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        description: row.description,
        componentType: row.component_type,
        configuration: row.configuration,
        dataSource: row.data_source,
        isTemplate: row.is_template,
        parentComponentId: row.parent_component_id,
        isPublic: row.is_public,
        ownerId: row.owner_id,
        createdDate: row.created_date,
        updatedDate: row.updated_date
      };
    } catch (error) {
      logger.error('Error getting visualization component', { id, error });
      throw new VisualizationError(`Failed to get visualization component: ${error.message}`);
    }
  }

  /**
   * List visualization components
   * 
   * @param filters Optional filters
   * @param userId User ID for permission checking
   * @returns List of components with count
   */
  async listVisualizationComponents(
    filters: {
      search?: string;
      componentType?: VisualizationType;
      isTemplate?: boolean;
      isPublic?: boolean;
      ownerId?: string;
      parentComponentId?: string;
      limit?: number;
      offset?: number;
    },
    userId: string
  ): Promise<{ components: VisualizationComponent[]; count: number }> {
    try {
      const isAdmin = await this.isUserAdmin(userId);
      
      // Build the query conditions
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Filter by public/private access
      if (!isAdmin) {
        conditions.push(`(c.is_public = true OR c.owner_id = $${paramIndex++})`);
        params.push(userId);
      }

      // Filter by search term
      if (filters.search) {
        conditions.push(`(
          c.name ILIKE $${paramIndex} OR 
          c.display_name ILIKE $${paramIndex} OR 
          c.description ILIKE $${paramIndex}
        )`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      // Filter by component type
      if (filters.componentType) {
        conditions.push(`c.component_type = $${paramIndex++}`);
        params.push(filters.componentType);
      }

      // Filter by template flag
      if (filters.isTemplate !== undefined) {
        conditions.push(`c.is_template = $${paramIndex++}`);
        params.push(filters.isTemplate);
      }

      // Filter by public flag
      if (filters.isPublic !== undefined) {
        conditions.push(`c.is_public = $${paramIndex++}`);
        params.push(filters.isPublic);
      }

      // Filter by owner
      if (filters.ownerId) {
        conditions.push(`c.owner_id = $${paramIndex++}`);
        params.push(filters.ownerId);
      }

      // Filter by parent component
      if (filters.parentComponentId) {
        conditions.push(`c.parent_component_id = $${paramIndex++}`);
        params.push(filters.parentComponentId);
      }

      // Build the where clause
      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';

      // Count query
      const countResult = await db.query(
        `SELECT COUNT(*) FROM m_visualization_component c ${whereClause}`,
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
        `SELECT c.*, u.display_name as owner_name
         FROM m_visualization_component c
         LEFT JOIN m_appuser u ON c.owner_id = u.id
         ${whereClause}
         ORDER BY c.created_date DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        params
      );

      // Map the results
      const components = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        displayName: row.display_name,
        description: row.description,
        componentType: row.component_type,
        configuration: row.configuration,
        dataSource: row.data_source,
        isTemplate: row.is_template,
        parentComponentId: row.parent_component_id,
        isPublic: row.is_public,
        ownerId: row.owner_id,
        createdDate: row.created_date,
        updatedDate: row.updated_date
      }));

      return { components, count };
    } catch (error) {
      logger.error('Error listing visualization components', { filters, error });
      throw new VisualizationError(`Failed to list visualization components: ${error.message}`);
    }
  }

  /**
   * Delete a visualization component
   * 
   * @param id The component ID to delete
   * @param userId The user ID attempting the deletion
   * @returns Success flag
   */
  async deleteVisualizationComponent(id: string, userId: string): Promise<boolean> {
    try {
      // Verify the component exists and user has permissions
      const component = await this.getVisualizationComponent(id);
      
      if (!component) {
        throw new VisualizationError(`Visualization component with ID ${id} not found`);
      }

      // Only the owner or admin can delete the component
      if (component.ownerId !== userId && !(await this.isUserAdmin(userId))) {
        throw new VisualizationError('You do not have permission to delete this component');
      }

      // Check if this is a system component
      if (component.isTemplate && component.isPublic && (await this.isSystemComponent(id))) {
        throw new VisualizationError('System components cannot be deleted');
      }

      // Check if the component is used in any dashboards
      const usageResult = await db.query(
        'SELECT COUNT(*) FROM m_dashboard_panel WHERE visualization_id = $1',
        [id]
      );
      
      if (parseInt(usageResult.rows[0].count) > 0) {
        throw new VisualizationError('Cannot delete component that is used in dashboards');
      }

      // Delete the component
      const result = await db.query(
        'DELETE FROM m_visualization_component WHERE id = $1',
        [id]
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Error deleting visualization component', { id, userId, error });
      
      if (error instanceof VisualizationError) {
        throw error;
      }

      throw new VisualizationError(`Failed to delete visualization component: ${error.message}`);
    }
  }

  /**
   * Render a visualization component
   * 
   * @param id The component ID
   * @param parameters Optional parameters to override component's data source parameters
   * @param userId The user ID rendering the component
   * @returns The chart data for rendering
   */
  async renderVisualization(
    id: string,
    parameters?: { [key: string]: any },
    userId?: string
  ): Promise<ChartData> {
    try {
      // Get the component
      const component = await this.getVisualizationComponent(id);
      
      if (!component) {
        throw new VisualizationError(`Visualization component with ID ${id} not found`);
      }

      // Check permissions if user ID provided
      if (userId && !component.isPublic && component.ownerId !== userId && !(await this.isUserAdmin(userId))) {
        throw new VisualizationError('You do not have permission to render this component');
      }

      // Fetch data based on the data source type
      const data = await this.fetchVisualizationData(component, parameters, userId);

      // Process the data for the specific chart type
      return this.processDataForChart(component, data);
    } catch (error) {
      logger.error('Error rendering visualization', { id, parameters, error });
      
      if (error instanceof VisualizationError) {
        throw error;
      }

      throw new VisualizationError(`Failed to render visualization: ${error.message}`);
    }
  }

  /**
   * Fetch data for a visualization component
   * 
   * @param component The visualization component
   * @param parameters Optional parameters to override component's data source parameters
   * @param userId The user ID for permission checking
   * @returns The raw data for the visualization
   */
  private async fetchVisualizationData(
    component: VisualizationComponent,
    parameters?: { [key: string]: any },
    userId?: string
  ): Promise<any[]> {
    const dataSource = component.dataSource;
    
    // Merge parameters if provided
    const mergedParams = {
      ...(dataSource.parameters || {}),
      ...(parameters || {})
    };
    
    switch (dataSource.type) {
      case DataSourceType.CUSTOM_REPORT:
        if (!dataSource.customReportId) {
          throw new VisualizationError('Custom report ID is required for custom report data source');
        }
        
        try {
          const result = await this.customReportService.executeCustomReport(
            {
              reportId: dataSource.customReportId,
              parameters: mergedParams,
              filters: dataSource.filters
            },
            userId || 'system'
          );
          
          return result.data;
        } catch (error) {
          if (error instanceof CustomReportError) {
            throw new VisualizationError(`Error executing custom report: ${error.message}`);
          }
          throw error;
        }
        
      case DataSourceType.REPORT:
        if (!dataSource.reportId) {
          throw new VisualizationError('Report ID is required for report data source');
        }
        
        try {
          const result = await this.reportService.executeReport({
            reportId: dataSource.reportId,
            parameters: mergedParams,
            userId: userId
          });
          
          return result.data;
        } catch (error) {
          throw new VisualizationError(`Error executing report: ${error.message}`);
        }
        
      case DataSourceType.QUERY:
        if (!dataSource.query) {
          throw new VisualizationError('Query is required for query data source');
        }
        
        try {
          // Replace parameters in the query
          let query = dataSource.query;
          const queryParams: any[] = [];
          
          // Simple parameter replacement using $n notation
          Object.entries(mergedParams).forEach(([key, value], index) => {
            const placeholder = new RegExp(`\\$${key}\\b`, 'g');
            query = query.replace(placeholder, `$${index + 1}`);
            queryParams.push(value);
          });
          
          const result = await db.query(query, queryParams);
          return result.rows;
        } catch (error) {
          throw new VisualizationError(`Error executing query: ${error.message}`);
        }
        
      case DataSourceType.STATIC:
        if (!dataSource.staticData || !Array.isArray(dataSource.staticData)) {
          throw new VisualizationError('Static data must be an array');
        }
        
        return dataSource.staticData;
        
      case DataSourceType.API:
        // API data source not implemented yet
        throw new VisualizationError('API data source not implemented yet');
        
      default:
        throw new VisualizationError(`Unknown data source type: ${dataSource.type}`);
    }
  }

  /**
   * Process data for a specific chart type
   * 
   * @param component The visualization component
   * @param data The raw data
   * @returns Processed chart data
   */
  private processDataForChart(component: VisualizationComponent, data: any[]): ChartData {
    if (!data || data.length === 0) {
      return {
        type: component.componentType,
        data: {},
        options: component.configuration || {}
      };
    }

    const mapping = component.dataSource.mapping;
    
    switch (component.componentType) {
      case VisualizationType.PIE:
      case VisualizationType.DONUT:
        return this.processPieDonutChart(component, data, mapping);
        
      case VisualizationType.BAR:
      case VisualizationType.LINE:
      case VisualizationType.AREA:
        return this.processAxisChart(component, data, mapping);
        
      case VisualizationType.TABLE:
        return this.processTableChart(component, data, mapping);
        
      case VisualizationType.CARD:
        return this.processCardChart(component, data, mapping);
        
      case VisualizationType.GAUGE:
        return this.processGaugeChart(component, data, mapping);
        
      default:
        throw new VisualizationError(`Chart type not implemented: ${component.componentType}`);
    }
  }

  /**
   * Process data for pie/donut charts
   * 
   * @param component The visualization component
   * @param data The raw data
   * @param mapping The data mapping
   * @returns Processed chart data
   */
  private processPieDonutChart(
    component: VisualizationComponent,
    data: any[],
    mapping: any
  ): ChartData {
    if (!mapping.labels || !mapping.values) {
      throw new VisualizationError('Pie/donut charts require labels and values mapping');
    }

    const labels: string[] = [];
    const values: number[] = [];
    const tooltipData: any[] = [];

    // Extract labels and values
    data.forEach(item => {
      labels.push(item[mapping.labels]);
      
      if (typeof mapping.values === 'string') {
        values.push(Number(item[mapping.values]) || 0);
      } else {
        throw new VisualizationError('Pie/donut charts require a single value field');
      }

      // Build tooltip data if specified
      if (mapping.tooltipFields && Array.isArray(mapping.tooltipFields)) {
        const tooltipItem: any = {};
        mapping.tooltipFields.forEach(field => {
          tooltipItem[field] = item[field];
        });
        tooltipData.push(tooltipItem);
      }
    });

    const chartData = {
      labels,
      datasets: [{
        data: values,
        backgroundColor: this.generateColors(labels.length),
        tooltipData
      }]
    };

    // Get chart configuration
    const config = component.configuration || {};
    const chartConfig = config.chart || {};

    // Build options
    const options = {
      cutout: component.componentType === VisualizationType.DONUT ? '50%' : '0%',
      plugins: {
        legend: {
          display: chartConfig.showLegend !== false,
          position: chartConfig.legendPosition || 'right'
        },
        tooltip: {
          enabled: chartConfig.tooltip?.enabled !== false
        }
      }
    };

    return {
      type: component.componentType,
      data: chartData,
      options
    };
  }

  /**
   * Process data for axis-based charts (bar, line, area)
   * 
   * @param component The visualization component
   * @param data The raw data
   * @param mapping The data mapping
   * @returns Processed chart data
   */
  private processAxisChart(
    component: VisualizationComponent,
    data: any[],
    mapping: any
  ): ChartData {
    if (!mapping.x || !mapping.y) {
      throw new VisualizationError('Axis charts require x and y mapping');
    }

    const xValues: string[] = [];
    const datasets: any[] = [];
    
    // Extract x values
    data.forEach(item => {
      const xValue = item[mapping.x];
      if (!xValues.includes(xValue)) {
        xValues.push(xValue);
      }
    });
    
    // Sort x values if they're dates
    if (xValues.length > 0 && this.isDate(xValues[0])) {
      xValues.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    }

    // Handle y values
    if (Array.isArray(mapping.y)) {
      // Multiple y fields (multiple series)
      mapping.y.forEach((field: string, index: number) => {
        const seriesName = mapping.series?.[index] || field;
        const seriesData = xValues.map(x => {
          const match = data.find(item => item[mapping.x] === x);
          return match ? Number(match[field]) || 0 : 0;
        });

        datasets.push({
          label: seriesName,
          data: seriesData,
          backgroundColor: this.getColor(index),
          borderColor: this.getColor(index),
          fill: component.componentType === VisualizationType.AREA
        });
      });
    } else {
      // Single y field (single series)
      const seriesName = mapping.series || mapping.y;
      const seriesData = xValues.map(x => {
        const match = data.find(item => item[mapping.x] === x);
        return match ? Number(match[mapping.y]) || 0 : 0;
      });

      datasets.push({
        label: seriesName,
        data: seriesData,
        backgroundColor: this.getColor(0),
        borderColor: this.getColor(0),
        fill: component.componentType === VisualizationType.AREA
      });
    }

    const chartData = {
      labels: xValues,
      datasets
    };

    // Get chart configuration
    const config = component.configuration || {};
    const chartConfig = config.chart || {};

    // Build options
    const options = {
      plugins: {
        legend: {
          display: chartConfig.showLegend !== false,
          position: chartConfig.legendPosition || 'top'
        },
        tooltip: {
          enabled: chartConfig.tooltip?.enabled !== false
        }
      },
      scales: {
        x: {
          title: {
            display: !!chartConfig.xAxis?.title,
            text: chartConfig.xAxis?.title
          },
          grid: {
            display: chartConfig.xAxis?.showGridLines !== false
          }
        },
        y: {
          title: {
            display: !!chartConfig.yAxis?.title,
            text: chartConfig.yAxis?.title
          },
          grid: {
            display: chartConfig.yAxis?.showGridLines !== false
          },
          beginAtZero: true,
          min: chartConfig.yAxis?.min,
          max: chartConfig.yAxis?.max
        }
      }
    };

    return {
      type: component.componentType,
      data: chartData,
      options
    };
  }

  /**
   * Process data for table visualization
   * 
   * @param component The visualization component
   * @param data The raw data
   * @param mapping The data mapping
   * @returns Processed table data
   */
  private processTableChart(
    component: VisualizationComponent,
    data: any[],
    mapping: any
  ): ChartData {
    if (!mapping.columns || !Array.isArray(mapping.columns)) {
      throw new VisualizationError('Table visualization requires columns mapping');
    }

    // Get table configuration
    const config = component.configuration || {};
    const tableConfig = config.table || {};

    // Convert raw data to table format
    const tableData = data.map(row => {
      const formattedRow: any = {};
      
      mapping.columns.forEach((col: any) => {
        formattedRow[col.field] = row[col.field];
      });
      
      return formattedRow;
    });

    // Create column definitions
    const columns = mapping.columns.map((col: any) => ({
      field: col.field,
      title: col.title || col.field,
      format: col.format
    }));

    return {
      type: 'table',
      data: {
        columns,
        rows: tableData
      },
      options: {
        showHeader: tableConfig.showHeader !== false,
        striped: tableConfig.striped !== false,
        bordered: tableConfig.bordered !== false,
        compact: tableConfig.compact === true,
        pagination: tableConfig.pagination !== false,
        pageSize: tableConfig.defaultPageSize || 10,
        pageSizeOptions: tableConfig.rowsPerPageOptions || [5, 10, 25, 50, 100],
        sorting: tableConfig.sorting !== false,
        filtering: tableConfig.filtering === true,
        highlightRules: tableConfig.highlightRules || []
      }
    };
  }

  /**
   * Process data for card visualization
   * 
   * @param component The visualization component
   * @param data The raw data
   * @param mapping The data mapping
   * @returns Processed card data
   */
  private processCardChart(
    component: VisualizationComponent,
    data: any[],
    mapping: any
  ): ChartData {
    if (!mapping.value) {
      throw new VisualizationError('Card visualization requires value mapping');
    }

    // Get card configuration
    const config = component.configuration || {};
    const cardConfig = config.card || {};

    // Extract the main value
    let mainValue = 0;
    if (data.length > 0) {
      mainValue = Number(data[0][mapping.value]) || 0;
    }

    // Extract trend value if specified
    let trendValue: number | undefined;
    let trendPercent: number | undefined;
    
    if (mapping.trend && data.length > 0 && data[0][mapping.trend] !== undefined) {
      trendValue = Number(data[0][mapping.trend]) || 0;
      
      if (mainValue !== 0) {
        trendPercent = (trendValue / mainValue) * 100;
      }
    }

    // Format options
    const formatOptions = cardConfig.formatOptions || {};

    return {
      type: 'card',
      data: {
        value: mainValue,
        trend: trendValue,
        trendPercent,
        label: cardConfig.label || mapping.value
      },
      options: {
        icon: cardConfig.icon,
        iconColor: cardConfig.iconColor,
        valueSize: cardConfig.valueSize || 36,
        showTrend: cardConfig.showTrend !== false && trendValue !== undefined,
        positiveIsBetter: cardConfig.positiveIsBetter !== false,
        formatOptions
      }
    };
  }

  /**
   * Process data for gauge visualization
   * 
   * @param component The visualization component
   * @param data The raw data
   * @param mapping The data mapping
   * @returns Processed gauge data
   */
  private processGaugeChart(
    component: VisualizationComponent,
    data: any[],
    mapping: any
  ): ChartData {
    if (!mapping.value) {
      throw new VisualizationError('Gauge visualization requires value mapping');
    }

    // Get gauge configuration
    const config = component.configuration || {};
    const gaugeConfig = config.gauge || {};

    // Extract the value
    let value = 0;
    if (data.length > 0) {
      value = Number(data[0][mapping.value]) || 0;
    }

    // Validate gauge min/max
    if (gaugeConfig.min === undefined || gaugeConfig.max === undefined) {
      throw new VisualizationError('Gauge visualization requires min and max configuration');
    }

    // Ensure value is within bounds
    value = Math.max(gaugeConfig.min, Math.min(gaugeConfig.max, value));

    // Default color stops if not provided
    const colorStops = gaugeConfig.colorStops || [
      { value: gaugeConfig.min, color: '#00C851' },
      { value: (gaugeConfig.max - gaugeConfig.min) / 2, color: '#FFBB33' },
      { value: gaugeConfig.max, color: '#FF4444' }
    ];

    return {
      type: 'gauge',
      data: {
        value,
        min: gaugeConfig.min,
        max: gaugeConfig.max,
        label: gaugeConfig.label || mapping.value
      },
      options: {
        colorStops,
        showValue: gaugeConfig.showValue !== false,
        format: gaugeConfig.format || 'number',
        arcWidth: gaugeConfig.arcWidth || 0.2,
        animationDuration: 1000
      }
    };
  }

  /**
   * Generate an array of colors for chart elements
   * 
   * @param count Number of colors needed
   * @returns Array of color strings
   */
  private generateColors(count: number): string[] {
    const baseColors = [
      '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
      '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'
    ];
    
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
      colors.push(baseColors[i % baseColors.length]);
    }
    
    return colors;
  }

  /**
   * Get a single color by index
   * 
   * @param index Color index
   * @returns Color string
   */
  private getColor(index: number): string {
    const baseColors = [
      '#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f',
      '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'
    ];
    
    return baseColors[index % baseColors.length];
  }

  /**
   * Check if a string is a valid date
   * 
   * @param value String value to check
   * @returns Whether the string is a valid date
   */
  private isDate(value: string): boolean {
    if (!value) return false;
    
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  /**
   * Validate a visualization component
   * 
   * @param component The component to validate
   */
  private validateComponent(component: VisualizationComponent): void {
    // Check required fields
    if (!component.name) {
      throw new VisualizationError('Component name is required');
    }

    if (!component.displayName) {
      throw new VisualizationError('Component display name is required');
    }

    if (!component.componentType) {
      throw new VisualizationError('Component type is required');
    }

    // Validate data source
    if (!component.dataSource) {
      throw new VisualizationError('Component data source is required');
    }

    if (!component.dataSource.type) {
      throw new VisualizationError('Data source type is required');
    }

    // Validate data source specific requirements
    switch (component.dataSource.type) {
      case DataSourceType.REPORT:
        if (!component.dataSource.reportId) {
          throw new VisualizationError('Report ID is required for report data source');
        }
        break;

      case DataSourceType.CUSTOM_REPORT:
        if (!component.dataSource.customReportId) {
          throw new VisualizationError('Custom report ID is required for custom report data source');
        }
        break;

      case DataSourceType.QUERY:
        if (!component.dataSource.query) {
          throw new VisualizationError('Query is required for query data source');
        }
        break;

      case DataSourceType.STATIC:
        if (!component.dataSource.staticData || !Array.isArray(component.dataSource.staticData)) {
          throw new VisualizationError('Static data must be an array');
        }
        break;

      case DataSourceType.API:
        if (!component.dataSource.apiUrl) {
          throw new VisualizationError('API URL is required for API data source');
        }
        break;
    }

    // Validate mapping
    if (!component.dataSource.mapping) {
      throw new VisualizationError('Data source mapping is required');
    }

    // Validate component type specific requirements
    switch (component.componentType) {
      case VisualizationType.PIE:
      case VisualizationType.DONUT:
        if (!component.dataSource.mapping.labels || !component.dataSource.mapping.values) {
          throw new VisualizationError('Pie/donut charts require labels and values mapping');
        }
        break;

      case VisualizationType.BAR:
      case VisualizationType.LINE:
      case VisualizationType.AREA:
        if (!component.dataSource.mapping.x || !component.dataSource.mapping.y) {
          throw new VisualizationError('Axis charts require x and y mapping');
        }
        break;

      case VisualizationType.TABLE:
        if (!component.dataSource.mapping.columns || !Array.isArray(component.dataSource.mapping.columns)) {
          throw new VisualizationError('Table visualization requires columns mapping');
        }
        break;

      case VisualizationType.CARD:
        if (!component.dataSource.mapping.value) {
          throw new VisualizationError('Card visualization requires value mapping');
        }
        break;

      case VisualizationType.GAUGE:
        if (!component.dataSource.mapping.value) {
          throw new VisualizationError('Gauge visualization requires value mapping');
        }

        // Validate gauge configuration
        const gaugeConfig = component.configuration?.gauge;
        if (!gaugeConfig || gaugeConfig.min === undefined || gaugeConfig.max === undefined) {
          throw new VisualizationError('Gauge visualization requires min and max configuration');
        }
        break;
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
   * Check if a component is a system component
   * 
   * @param componentId The component ID to check
   * @returns Whether the component is a system component
   */
  private async isSystemComponent(componentId: string): Promise<boolean> {
    try {
      // System components usually have NULL owner and are marked as templates
      const result = await db.query(
        `SELECT COUNT(*) FROM m_visualization_component
         WHERE id = $1 AND owner_id IS NULL AND is_template = true`,
        [componentId]
      );
      
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      logger.error('Error checking system component status', { componentId, error });
      return false;
    }
  }
}