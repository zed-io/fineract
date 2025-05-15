/**
 * Service for consolidated reporting across modules
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../../utils/db';
import { logger } from '../../utils/logger';
import { 
  ConsolidatedReportRequest, 
  ConsolidatedReportResponse,
  CrossModuleDashboardRequest,
  CrossModuleDashboardResponse,
  DataSourceSyncRequest,
  DataSourceSyncResponse,
  AnalyticsInsightsRequest,
  AnalyticsInsightsResponse,
  ModuleType,
  DataSourceStatus,
  TrendDirection,
  InsightType,
  ConsolidatedReportError,
  DataSourceError,
  ReportGenerationError,
  DashboardError,
  InsightGenerationError
} from '../../models/reporting/consolidatedReporting';
import { ReportFormat } from '../../models/reporting/report';
import axios from 'axios';

/**
 * Consolidated Reporting Service
 * Handles cross-module reporting capabilities
 */
export class ConsolidatedReportingService {
  /**
   * Generate a consolidated report that pulls data from multiple modules
   *
   * @param request The consolidated report request
   * @returns The consolidated report response
   */
  async generateConsolidatedReport(request: ConsolidatedReportRequest): Promise<ConsolidatedReportResponse> {
    const startTime = Date.now();
    let reportId: string;
    
    try {
      logger.info('Generating consolidated report', { reportType: request.reportType, modules: request.modules });
      
      // Validate request parameters
      this.validateReportRequest(request);
      
      // Check if report definition exists or create dynamic definition
      let reportDefinition = await this.getOrCreateReportDefinition(request);
      reportId = reportDefinition.id || '';
      
      // Validate data sources are available and synchronized
      await this.validateDataSources(request.modules);
      
      // Fetch data from each module using GraphQL
      const moduleData = await this.fetchModuleData(request);
      
      // Process and transform the data
      const processedData = this.processReportData(request, moduleData);
      
      // Format the output based on requested format
      const formattedData = await this.formatReportOutput(processedData, request.format);
      
      // Generate metadata if requested
      const metadata = request.includeMetadata ? this.generateReportMetadata(request, moduleData) : undefined;
      
      // Create execution record
      const executionId = await this.logReportExecution(
        reportId, 
        request, 
        'success', 
        Date.now() - startTime, 
        processedData, 
        metadata
      );
      
      // Return response
      return {
        success: true,
        report: {
          id: executionId,
          name: request.name,
          description: request.description,
          reportType: request.reportType,
          generatedOn: new Date().toISOString(),
          data: formattedData,
          metadata,
          format: request.format
        }
      };
    } catch (error) {
      // Log error
      logger.error('Error generating consolidated report', { 
        reportType: request.reportType, 
        modules: request.modules,
        error 
      });
      
      // Log execution failure
      if (reportId) {
        await this.logReportExecution(
          reportId,
          request,
          'failed',
          Date.now() - startTime,
          null,
          null,
          error.message
        ).catch(err => {
          logger.error('Error logging failed report execution', { error: err });
        });
      }
      
      // Return error response
      if (error instanceof ConsolidatedReportError) {
        return {
          success: false,
          message: error.message
        };
      }
      
      return {
        success: false,
        message: `Failed to generate consolidated report: ${error.message}`
      };
    }
  }
  
  /**
   * Get a cross-module dashboard with metrics from multiple modules
   *
   * @param request The dashboard request
   * @returns The dashboard response
   */
  async getCrossModuleDashboard(request: CrossModuleDashboardRequest): Promise<CrossModuleDashboardResponse> {
    const startTime = Date.now();
    let dashboardId: string;
    
    try {
      logger.info('Generating cross-module dashboard', { 
        name: request.name, 
        modules: request.modules,
        metrics: request.metrics
      });
      
      // Validate request
      this.validateDashboardRequest(request);
      
      // Get or create dashboard definition
      const dashboardDefinition = await this.getOrCreateDashboard(request);
      dashboardId = dashboardDefinition.id || '';
      
      // Validate data sources
      await this.validateDataSources(request.modules);
      
      // Get data sources info
      const dataSources = await this.getDataSources(request.modules);
      
      // Calculate metrics
      const metrics = await this.calculateDashboardMetrics(request);
      
      // Generate visualization data
      const visualizationData = await this.generateVisualizationData(request, metrics);
      
      // Log dashboard execution
      const executionId = await this.logDashboardExecution(
        dashboardId,
        request,
        'success',
        Date.now() - startTime,
        { metrics },
        visualizationData
      );
      
      // Return response
      return {
        success: true,
        dashboard: {
          id: executionId,
          name: request.name,
          description: request.description,
          generatedOn: new Date().toISOString(),
          metrics,
          dataSources,
          visualizationData
        }
      };
    } catch (error) {
      // Log error
      logger.error('Error generating cross-module dashboard', { 
        name: request.name, 
        modules: request.modules,
        error 
      });
      
      // Log execution failure
      if (dashboardId) {
        await this.logDashboardExecution(
          dashboardId,
          request,
          'failed',
          Date.now() - startTime,
          null,
          null,
          error.message
        ).catch(err => {
          logger.error('Error logging failed dashboard execution', { error: err });
        });
      }
      
      // Return error response
      if (error instanceof ConsolidatedReportError) {
        return {
          success: false,
          message: error.message
        };
      }
      
      return {
        success: false,
        message: `Failed to generate cross-module dashboard: ${error.message}`
      };
    }
  }
  
  /**
   * Synchronize data sources for cross-module reporting
   *
   * @param request The data source sync request
   * @returns The data source sync response
   */
  async syncDataSources(request: DataSourceSyncRequest): Promise<DataSourceSyncResponse> {
    try {
      logger.info('Syncing data sources', { 
        moduleTypes: request.moduleTypes,
        fullSync: request.fullSync
      });
      
      // Validate request
      if (!request.moduleTypes || request.moduleTypes.length === 0) {
        throw new DataSourceError('No module types specified for sync');
      }
      
      // Update data sources to syncing status
      await this.updateDataSourcesStatus(request.moduleTypes, DataSourceStatus.SYNCING);
      
      // Initialize results
      const results: { moduleType: string; success: boolean; recordCount?: number; error?: string }[] = [];
      
      // Perform sync for each module type
      for (const moduleType of request.moduleTypes) {
        try {
          // Validate module type
          if (!Object.values(ModuleType).includes(moduleType as ModuleType)) {
            throw new DataSourceError(`Invalid module type: ${moduleType}`);
          }
          
          // Perform sync based on module type
          const recordCount = await this.syncModuleData(moduleType as ModuleType, !!request.fullSync);
          
          // Record success
          results.push({
            moduleType,
            success: true,
            recordCount
          });
          
          // Update data source status to ready
          await this.updateDataSourceStatus(
            moduleType as ModuleType, 
            DataSourceStatus.READY,
            new Date(),
            recordCount
          );
        } catch (error) {
          // Record failure
          results.push({
            moduleType,
            success: false,
            error: error.message
          });
          
          // Update data source status to error
          await this.updateDataSourceStatus(
            moduleType as ModuleType, 
            DataSourceStatus.ERROR
          );
          
          logger.error(`Error syncing data source for module ${moduleType}`, { error });
        }
      }
      
      // Get updated data sources
      const dataSources = await this.getDataSources(request.moduleTypes);
      
      // Return response
      return {
        success: results.every(r => r.success),
        dataSources,
        message: results.some(r => !r.success) 
          ? `Sync completed with errors: ${results.filter(r => !r.success).map(r => r.moduleType).join(', ')}`
          : 'Data sources synchronized successfully'
      };
    } catch (error) {
      // Log error
      logger.error('Error syncing data sources', { 
        moduleTypes: request.moduleTypes,
        error 
      });
      
      // Return error response
      if (error instanceof ConsolidatedReportError) {
        return {
          success: false,
          message: error.message
        };
      }
      
      return {
        success: false,
        message: `Failed to sync data sources: ${error.message}`
      };
    }
  }
  
  /**
   * Get analytics insights based on cross-module data
   *
   * @param request The analytics insights request
   * @returns The analytics insights response
   */
  async getAnalyticsInsights(request: AnalyticsInsightsRequest): Promise<AnalyticsInsightsResponse> {
    try {
      logger.info('Getting analytics insights', { 
        modules: request.modules,
        insightTypes: request.insightTypes,
        limit: request.limit,
        minRelevanceScore: request.minRelevanceScore
      });
      
      // Validate request
      if (!request.modules || request.modules.length === 0) {
        throw new InsightGenerationError('No modules specified for insights');
      }
      
      // Set defaults
      const limit = request.limit || 10;
      const minRelevanceScore = request.minRelevanceScore || 0.6; // 0.0 to 1.0 scale
      
      // Build query to get insights
      let query = `
        SELECT 
          id, title, description, insight_type, relevance_score, metrics, data_sources, created_date
        FROM m_analytics_insight
        WHERE (is_acknowledged = false OR is_acknowledged IS NULL)
        AND relevance_score >= $1
      `;
      
      const params: any[] = [minRelevanceScore];
      let paramIndex = 2;
      
      // Filter by module types
      query += ` AND data_sources ?| $${paramIndex}`;
      params.push(request.modules);
      paramIndex++;
      
      // Filter by insight types if specified
      if (request.insightTypes && request.insightTypes.length > 0) {
        query += ` AND insight_type = ANY($${paramIndex})`;
        params.push(request.insightTypes);
        paramIndex++;
      }
      
      // Order by relevance and limit
      query += ` ORDER BY relevance_score DESC, created_date DESC LIMIT $${paramIndex}`;
      params.push(limit);
      
      // Execute query
      const result = await db.query(query, params);
      
      // Transform results
      const insights = result.rows.map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        insightType: row.insight_type,
        relevanceScore: row.relevance_score,
        metrics: row.metrics,
        generatedOn: row.created_date.toISOString(),
        metadata: { dataSources: row.data_sources }
      }));
      
      // Return response
      return {
        success: true,
        insights,
        message: insights.length > 0 
          ? `${insights.length} insights found`
          : 'No relevant insights found'
      };
    } catch (error) {
      // Log error
      logger.error('Error getting analytics insights', { 
        modules: request.modules,
        error 
      });
      
      // Return error response
      if (error instanceof ConsolidatedReportError) {
        return {
          success: false,
          message: error.message
        };
      }
      
      return {
        success: false,
        message: `Failed to get analytics insights: ${error.message}`
      };
    }
  }
  
  /**
   * Validate consolidated report request
   *
   * @param request The report request to validate
   */
  private validateReportRequest(request: ConsolidatedReportRequest): void {
    if (!request.name) {
      throw new ReportGenerationError('Report name is required');
    }
    
    if (!request.reportType) {
      throw new ReportGenerationError('Report type is required');
    }
    
    if (!request.modules || request.modules.length === 0) {
      throw new ReportGenerationError('At least one module must be specified');
    }
    
    if (!request.format) {
      throw new ReportGenerationError('Output format is required');
    }
    
    // Validate format
    const validFormats = Object.values(ReportFormat);
    if (!validFormats.includes(request.format as ReportFormat)) {
      throw new ReportGenerationError(`Invalid format: ${request.format}. Valid formats are: ${validFormats.join(', ')}`);
    }
    
    // Validate modules
    for (const module of request.modules) {
      if (!Object.values(ModuleType).includes(module as ModuleType)) {
        throw new ReportGenerationError(`Invalid module type: ${module}`);
      }
    }
  }
  
  /**
   * Validate dashboard request
   *
   * @param request The dashboard request to validate
   */
  private validateDashboardRequest(request: CrossModuleDashboardRequest): void {
    if (!request.name) {
      throw new DashboardError('Dashboard name is required');
    }
    
    if (!request.modules || request.modules.length === 0) {
      throw new DashboardError('At least one module must be specified');
    }
    
    if (!request.metrics || request.metrics.length === 0) {
      throw new DashboardError('At least one metric must be specified');
    }
    
    // Validate modules
    for (const module of request.modules) {
      if (!Object.values(ModuleType).includes(module as ModuleType)) {
        throw new DashboardError(`Invalid module type: ${module}`);
      }
    }
    
    // Validate date range if provided
    if (request.dateRange) {
      if (!request.dateRange.from || !request.dateRange.to) {
        throw new DashboardError('Date range must include both from and to dates');
      }
      
      // Check if dates are valid
      const fromDate = new Date(request.dateRange.from);
      const toDate = new Date(request.dateRange.to);
      
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        throw new DashboardError('Invalid date format in date range');
      }
      
      if (fromDate > toDate) {
        throw new DashboardError('From date must be before to date');
      }
    }
  }
  
  /**
   * Get or create a report definition
   *
   * @param request The report request
   * @returns The report definition
   */
  private async getOrCreateReportDefinition(request: ConsolidatedReportRequest): Promise<any> {
    // Check if a report definition with this name exists
    const existingReport = await db.query(
      `SELECT id FROM m_consolidated_report WHERE name = $1`,
      [request.name]
    );
    
    if (existingReport.rowCount > 0) {
      return { id: existingReport.rows[0].id };
    }
    
    // Create a new report definition
    const reportId = uuidv4();
    const modulesJson = JSON.stringify(request.modules.map(module => ({ moduleType: module })));
    
    await db.query(
      `INSERT INTO m_consolidated_report (
        id, name, display_name, description, report_type, modules, output_format, 
        is_active, created_by, created_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        reportId, 
        request.name, 
        request.name, // Use name as display name for now
        request.description || `Cross-module report for ${request.modules.join(', ')}`,
        request.reportType,
        modulesJson,
        request.format,
        true,
        request.userId || null
      ]
    );
    
    return { id: reportId };
  }
  
  /**
   * Get or create a dashboard definition
   *
   * @param request The dashboard request
   * @returns The dashboard definition
   */
  private async getOrCreateDashboard(request: CrossModuleDashboardRequest): Promise<any> {
    // Check if a dashboard with this name exists
    const existingDashboard = await db.query(
      `SELECT id FROM m_cross_module_dashboard WHERE name = $1`,
      [request.name]
    );
    
    if (existingDashboard.rowCount > 0) {
      return { id: existingDashboard.rows[0].id };
    }
    
    // Create a new dashboard definition
    const dashboardId = uuidv4();
    const metricsJson = JSON.stringify(
      request.metrics.map((metricId, index) => ({
        metricId,
        position: { 
          x: index % 2 * 6, // Simple layout algorithm - 2 metrics per row
          y: Math.floor(index / 2) * 2,
          w: 6,
          h: 2
        }
      }))
    );
    
    await db.query(
      `INSERT INTO m_cross_module_dashboard (
        id, name, display_name, description, metrics, is_active, created_by, created_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        dashboardId, 
        request.name, 
        request.name, // Use name as display name for now
        request.description || `Cross-module dashboard for ${request.modules.join(', ')}`,
        metricsJson,
        true,
        request.userId || null
      ]
    );
    
    return { id: dashboardId };
  }
  
  /**
   * Validate data sources are available
   *
   * @param moduleTypes The module types to validate
   */
  private async validateDataSources(moduleTypes: string[]): Promise<void> {
    const sources = await db.query(
      `SELECT module_type, is_active, sync_status FROM m_reporting_datasource 
       WHERE module_type = ANY($1)`,
      [moduleTypes]
    );
    
    if (sources.rowCount !== moduleTypes.length) {
      const foundTypes = sources.rows.map((row: any) => row.module_type);
      const missingTypes = moduleTypes.filter(type => !foundTypes.includes(type));
      throw new DataSourceError(`Data sources not found for modules: ${missingTypes.join(', ')}`);
    }
    
    // Check for inactive or error sources
    const inactiveSources = sources.rows.filter((row: any) => !row.is_active);
    if (inactiveSources.length > 0) {
      const inactiveTypes = inactiveSources.map((row: any) => row.module_type);
      throw new DataSourceError(`Data sources are inactive for modules: ${inactiveTypes.join(', ')}`);
    }
    
    const errorSources = sources.rows.filter((row: any) => row.sync_status === DataSourceStatus.ERROR);
    if (errorSources.length > 0) {
      const errorTypes = errorSources.map((row: any) => row.module_type);
      throw new DataSourceError(`Data sources have sync errors for modules: ${errorTypes.join(', ')}`);
    }
  }
  
  /**
   * Get data source information
   *
   * @param moduleTypes The module types to get
   * @returns The data sources
   */
  private async getDataSources(moduleTypes: string[]): Promise<any[]> {
    const sources = await db.query(
      `SELECT id, name, module_type, sync_status, last_sync_time, record_count 
       FROM m_reporting_datasource 
       WHERE module_type = ANY($1)`,
      [moduleTypes]
    );
    
    return sources.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      moduleType: row.module_type,
      status: row.sync_status,
      lastSyncTime: row.last_sync_time ? row.last_sync_time.toISOString() : undefined,
      recordCount: row.record_count
    }));
  }
  
  /**
   * Update status for multiple data sources
   *
   * @param moduleTypes The module types to update
   * @param status The new status
   */
  private async updateDataSourcesStatus(moduleTypes: string[], status: DataSourceStatus): Promise<void> {
    await db.query(
      `UPDATE m_reporting_datasource 
       SET sync_status = $1, updated_date = NOW() 
       WHERE module_type = ANY($2)`,
      [status, moduleTypes]
    );
  }
  
  /**
   * Update status for a single data source
   *
   * @param moduleType The module type to update
   * @param status The new status
   * @param lastSyncTime Optional last sync time
   * @param recordCount Optional record count
   */
  private async updateDataSourceStatus(
    moduleType: ModuleType, 
    status: DataSourceStatus,
    lastSyncTime?: Date,
    recordCount?: number
  ): Promise<void> {
    let query = `
      UPDATE m_reporting_datasource 
      SET sync_status = $1, updated_date = NOW()
    `;
    
    const params: any[] = [status, moduleType];
    let paramIndex = 3;
    
    if (lastSyncTime) {
      query += `, last_sync_time = $${paramIndex}`;
      params.push(lastSyncTime);
      paramIndex++;
    }
    
    if (recordCount !== undefined) {
      query += `, record_count = $${paramIndex}`;
      params.push(recordCount);
      paramIndex++;
    }
    
    query += ` WHERE module_type = $2`;
    
    await db.query(query, params);
  }
  
  /**
   * Sync data for a specific module
   *
   * @param moduleType The module type to sync
   * @param fullSync Whether to perform a full sync
   * @returns The number of records synced
   */
  private async syncModuleData(moduleType: ModuleType, fullSync: boolean): Promise<number> {
    // This would be a complex implementation that varies by module type
    // For now, we'll just return a mock record count
    switch (moduleType) {
      case ModuleType.LOAN:
        return 1250;
      case ModuleType.CLIENT:
        return 3500;
      case ModuleType.SAVINGS:
        return 2780;
      case ModuleType.ACCOUNTING:
        return 15000;
      case ModuleType.GROUP:
        return 450;
      case ModuleType.STAFF:
        return 120;
      default:
        return 1000;
    }
  }
  
  /**
   * Fetch data from multiple modules
   *
   * @param request The report request
   * @returns The module data
   */
  private async fetchModuleData(request: ConsolidatedReportRequest): Promise<Record<string, any>> {
    const moduleData: Record<string, any> = {};
    
    // Depending on the report type, fetch different data
    switch (request.reportType) {
      case 'portfolio_summary':
        moduleData.loan = await this.fetchLoanData(request);
        moduleData.client = await this.fetchClientData(request);
        break;
        
      case 'financial_performance':
        moduleData.accounting = await this.fetchAccountingData(request);
        moduleData.loan = await this.fetchLoanData(request);
        break;
        
      case 'client_performance':
        moduleData.client = await this.fetchClientData(request);
        moduleData.loan = await this.fetchLoanData(request);
        moduleData.savings = await this.fetchSavingsData(request);
        break;
        
      case 'operational_metrics':
        moduleData.staff = await this.fetchStaffData(request);
        moduleData.loan = await this.fetchLoanData(request);
        moduleData.client = await this.fetchClientData(request);
        break;
        
      default:
        // For generic reports, fetch all requested modules
        for (const moduleType of request.modules) {
          switch (moduleType) {
            case ModuleType.LOAN:
              moduleData.loan = await this.fetchLoanData(request);
              break;
            case ModuleType.CLIENT:
              moduleData.client = await this.fetchClientData(request);
              break;
            case ModuleType.SAVINGS:
              moduleData.savings = await this.fetchSavingsData(request);
              break;
            case ModuleType.ACCOUNTING:
              moduleData.accounting = await this.fetchAccountingData(request);
              break;
            case ModuleType.GROUP:
              moduleData.group = await this.fetchGroupData(request);
              break;
            case ModuleType.STAFF:
              moduleData.staff = await this.fetchStaffData(request);
              break;
          }
        }
    }
    
    return moduleData;
  }
  
  /**
   * Fetch loan module data
   *
   * @param request The report request
   * @returns The loan data
   */
  private async fetchLoanData(request: ConsolidatedReportRequest): Promise<any> {
    // In a real implementation, this would use GraphQL to fetch loan data
    // For now, return mock data
    return {
      totalLoans: 1250,
      activeLoans: 1050,
      totalOutstanding: 5250000,
      principalOutstanding: 4700000,
      interestOutstanding: 500000,
      feesOutstanding: 50000,
      overdueAmount: 125000,
      parRatio: 0.0238,
      loanProducts: [
        { id: '1', name: 'Small Business Loan', count: 450, outstanding: 2250000 },
        { id: '2', name: 'Agricultural Loan', count: 350, outstanding: 1750000 },
        { id: '3', name: 'Housing Loan', count: 250, outstanding: 1250000 }
      ],
      loansByStatus: [
        { status: 'Active', count: 1050, outstanding: 5250000 },
        { status: 'Closed', count: 150, outstanding: 0 },
        { status: 'Overpaid', count: 25, outstanding: -25000 },
        { status: 'Written Off', count: 25, outstanding: 125000 }
      ],
      disbursementsTrend: [
        { period: '2023-01', count: 45, amount: 225000 },
        { period: '2023-02', count: 50, amount: 250000 },
        { period: '2023-03', count: 55, amount: 275000 },
        { period: '2023-04', count: 60, amount: 300000 },
        { period: '2023-05', count: 65, amount: 325000 },
        { period: '2023-06', count: 70, amount: 350000 }
      ]
    };
  }
  
  /**
   * Fetch client module data
   *
   * @param request The report request
   * @returns The client data
   */
  private async fetchClientData(request: ConsolidatedReportRequest): Promise<any> {
    // Mock client data
    return {
      totalClients: 3500,
      activeClients: 3200,
      inactiveClients: 300,
      newClientsLast30Days: 150,
      clientsWithLoans: 1200,
      clientsWithSavings: 2800,
      clientsByGender: [
        { gender: 'Female', count: 2100, percentage: 60 },
        { gender: 'Male', count: 1400, percentage: 40 }
      ],
      clientsBySegment: [
        { segment: 'Rural', count: 2100, percentage: 60 },
        { segment: 'Urban', count: 1400, percentage: 40 }
      ],
      clientTrend: [
        { period: '2023-01', newClients: 120, totalClients: 3000 },
        { period: '2023-02', newClients: 130, totalClients: 3130 },
        { period: '2023-03', newClients: 125, totalClients: 3255 },
        { period: '2023-04', newClients: 140, totalClients: 3395 },
        { period: '2023-05', newClients: 105, totalClients: 3500 }
      ]
    };
  }
  
  /**
   * Fetch savings module data
   *
   * @param request The report request
   * @returns The savings data
   */
  private async fetchSavingsData(request: ConsolidatedReportRequest): Promise<any> {
    // Mock savings data
    return {
      totalAccounts: 2780,
      activeAccounts: 2500,
      totalSavings: 3500000,
      savingsProducts: [
        { id: '1', name: 'Regular Savings', count: 1500, balance: 2000000 },
        { id: '2', name: 'Term Deposit', count: 800, balance: 1200000 },
        { id: '3', name: 'Checking Account', count: 480, balance: 300000 }
      ],
      savingsTrend: [
        { period: '2023-01', deposits: 150000, withdrawals: 100000, balance: 3000000 },
        { period: '2023-02', deposits: 160000, withdrawals: 120000, balance: 3040000 },
        { period: '2023-03', deposits: 170000, withdrawals: 130000, balance: 3080000 },
        { period: '2023-04', deposits: 180000, withdrawals: 110000, balance: 3150000 },
        { period: '2023-05', deposits: 190000, withdrawals: 120000, balance: 3220000 },
        { period: '2023-06', deposits: 200000, withdrawals: 140000, balance: 3280000 },
        { period: '2023-07', deposits: 210000, withdrawals: 130000, balance: 3360000 },
        { period: '2023-08', deposits: 220000, withdrawals: 140000, balance: 3440000 },
        { period: '2023-09', deposits: 190000, withdrawals: 130000, balance: 3500000 }
      ]
    };
  }
  
  /**
   * Fetch accounting module data
   *
   * @param request The report request
   * @returns The accounting data
   */
  private async fetchAccountingData(request: ConsolidatedReportRequest): Promise<any> {
    // Mock accounting data
    return {
      balanceSheet: {
        assets: {
          total: 10000000,
          cash: 1500000,
          loansOutstanding: 7000000,
          fixedAssets: 1500000
        },
        liabilities: {
          total: 6000000,
          savings: 3500000,
          borrowings: 2500000
        },
        equity: {
          total: 4000000,
          capital: 3000000,
          reserves: 500000,
          retainedEarnings: 500000
        }
      },
      incomeStatement: {
        income: {
          total: 1200000,
          interestIncome: 900000,
          feeIncome: 300000
        },
        expenses: {
          total: 700000,
          personnel: 400000,
          admin: 200000,
          depreciation: 50000,
          financialCosts: 50000
        },
        netIncome: 500000
      },
      ratios: {
        returnOnAssets: 0.05,
        returnOnEquity: 0.125,
        operationalSelfSufficiency: 1.71,
        debtToEquity: 0.625,
        portfolioYield: 0.1285,
        operatingExpenseRatio: 0.06
      }
    };
  }
  
  /**
   * Fetch group module data
   *
   * @param request The report request
   * @returns The group data
   */
  private async fetchGroupData(request: ConsolidatedReportRequest): Promise<any> {
    // Mock group data
    return {
      totalGroups: 450,
      activeGroups: 425,
      groupsByStatus: [
        { status: 'Active', count: 425 },
        { status: 'Inactive', count: 25 }
      ],
      groupsByType: [
        { type: 'Village Bank', count: 200 },
        { type: 'Solidarity Group', count: 250 }
      ],
      averageGroupSize: 12,
      groupsWithLoans: 350,
      totalGroupMembers: 5400
    };
  }
  
  /**
   * Fetch staff module data
   *
   * @param request The report request
   * @returns The staff data
   */
  private async fetchStaffData(request: ConsolidatedReportRequest): Promise<any> {
    // Mock staff data
    return {
      totalStaff: 120,
      loanOfficers: 80,
      staffByRole: [
        { role: 'Loan Officer', count: 80 },
        { role: 'Branch Manager', count: 15 },
        { role: 'Accountant', count: 10 },
        { role: 'Administrative', count: 15 }
      ],
      loanOfficerPerformance: [
        { id: '1', name: 'John Doe', clientCount: 250, portfolioSize: 1250000, parRatio: 0.02 },
        { id: '2', name: 'Jane Smith', clientCount: 275, portfolioSize: 1375000, parRatio: 0.015 },
        { id: '3', name: 'Bob Johnson', clientCount: 225, portfolioSize: 1125000, parRatio: 0.025 }
      ],
      staffProductivity: {
        clientsPerLoanOfficer: 40,
        portfolioPerLoanOfficer: 656250,
        loansPerLoanOfficer: 13.1
      }
    };
  }
  
  /**
   * Process report data into the required structure
   *
   * @param request The report request
   * @param moduleData The module data
   * @returns The processed data
   */
  private processReportData(request: ConsolidatedReportRequest, moduleData: Record<string, any>): any {
    // Depending on the report type, process the data differently
    switch (request.reportType) {
      case 'portfolio_summary':
        return this.processPortfolioSummary(moduleData);
        
      case 'financial_performance':
        return this.processFinancialPerformance(moduleData);
        
      case 'client_performance':
        return this.processClientPerformance(moduleData);
        
      case 'operational_metrics':
        return this.processOperationalMetrics(moduleData);
        
      default:
        // For generic reports, just return the module data as is
        return moduleData;
    }
  }
  
  /**
   * Process portfolio summary report
   *
   * @param moduleData The module data
   * @returns The processed portfolio summary
   */
  private processPortfolioSummary(moduleData: Record<string, any>): any {
    const { loan, client } = moduleData;
    
    return {
      reportName: 'Portfolio Summary Report',
      asOfDate: new Date().toISOString(),
      currency: 'USD',
      summary: {
        totalPortfolio: loan.totalOutstanding,
        totalLoans: loan.totalLoans,
        activeLoans: loan.activeLoans,
        clientCount: client.totalClients,
        activeClientCount: client.activeClients,
        averageLoanSize: loan.totalOutstanding / loan.activeLoans,
        parRatio: loan.parRatio
      },
      loanProducts: loan.loanProducts,
      loansByStatus: loan.loansByStatus,
      disbursementsTrend: loan.disbursementsTrend,
      clientSegmentation: client.clientsBySegment,
      clientGrowth: client.clientTrend
    };
  }
  
  /**
   * Process financial performance report
   *
   * @param moduleData The module data
   * @returns The processed financial performance
   */
  private processFinancialPerformance(moduleData: Record<string, any>): any {
    const { accounting, loan } = moduleData;
    
    return {
      reportName: 'Financial Performance Report',
      asOfDate: new Date().toISOString(),
      currency: 'USD',
      summary: {
        totalAssets: accounting.balanceSheet.assets.total,
        totalLiabilities: accounting.balanceSheet.liabilities.total,
        totalEquity: accounting.balanceSheet.equity.total,
        netIncome: accounting.incomeStatement.netIncome,
        returnOnAssets: accounting.ratios.returnOnAssets,
        returnOnEquity: accounting.ratios.returnOnEquity,
        operationalSelfSufficiency: accounting.ratios.operationalSelfSufficiency,
        portfolioYield: accounting.ratios.portfolioYield
      },
      incomeStatement: accounting.incomeStatement,
      balanceSheet: accounting.balanceSheet,
      financialRatios: accounting.ratios,
      portfolioQuality: {
        totalPortfolio: loan.totalOutstanding,
        parRatio: loan.parRatio,
        activeLoanCount: loan.activeLoans
      }
    };
  }
  
  /**
   * Process client performance report
   *
   * @param moduleData The module data
   * @returns The processed client performance
   */
  private processClientPerformance(moduleData: Record<string, any>): any {
    const { client, loan, savings } = moduleData;
    
    return {
      reportName: 'Client Performance Report',
      asOfDate: new Date().toISOString(),
      currency: 'USD',
      summary: {
        totalClients: client.totalClients,
        activeClients: client.activeClients,
        newClients: client.newClientsLast30Days,
        clientsWithLoans: client.clientsWithLoans,
        clientsWithSavings: client.clientsWithSavings,
        percentageWomen: client.clientsByGender.find((g: any) => g.gender === 'Female')?.percentage || 0,
        averageLoanSize: loan.totalOutstanding / loan.activeLoans,
        averageSavingsBalance: savings.totalSavings / savings.activeAccounts
      },
      clientDemographics: {
        gender: client.clientsByGender,
        segment: client.clientsBySegment
      },
      clientTrend: client.clientTrend,
      productUtilization: {
        loanProducts: loan.loanProducts,
        savingsProducts: savings.savingsProducts
      },
      savingsTrend: savings.savingsTrend
    };
  }
  
  /**
   * Process operational metrics report
   *
   * @param moduleData The module data
   * @returns The processed operational metrics
   */
  private processOperationalMetrics(moduleData: Record<string, any>): any {
    const { staff, loan, client } = moduleData;
    
    return {
      reportName: 'Operational Metrics Report',
      asOfDate: new Date().toISOString(),
      currency: 'USD',
      summary: {
        totalStaff: staff.totalStaff,
        loanOfficers: staff.loanOfficers,
        clientsPerLoanOfficer: staff.staffProductivity.clientsPerLoanOfficer,
        portfolioPerLoanOfficer: staff.staffProductivity.portfolioPerLoanOfficer,
        loansPerLoanOfficer: staff.staffProductivity.loansPerLoanOfficer,
        activeClients: client.activeClients,
        activeLoans: loan.activeLoans,
        totalPortfolio: loan.totalOutstanding
      },
      staffComposition: staff.staffByRole,
      topPerformingLoanOfficers: staff.loanOfficerPerformance,
      staffProductivity: staff.staffProductivity,
      clientGrowth: client.clientTrend,
      portfolioGrowth: loan.disbursementsTrend
    };
  }
  
  /**
   * Format report output based on requested format
   *
   * @param data The report data
   * @param format The output format
   * @returns The formatted output
   */
  private async formatReportOutput(data: any, format: string): Promise<any> {
    // Simple implementation that returns the data as-is
    // In a real implementation, this would convert to CSV, PDF, etc.
    return data;
  }
  
  /**
   * Generate report metadata
   *
   * @param request The report request
   * @param moduleData The module data
   * @returns The report metadata
   */
  private generateReportMetadata(request: ConsolidatedReportRequest, moduleData: Record<string, any>): any {
    return {
      generatedAt: new Date().toISOString(),
      modules: request.modules,
      parameters: request.parameters,
      filters: request.filters,
      stats: {
        moduleCounts: Object.keys(moduleData).reduce((acc, key) => {
          acc[key] = this.countRecords(moduleData[key]);
          return acc;
        }, {} as Record<string, number>)
      }
    };
  }
  
  /**
   * Count records in a data object
   *
   * @param data The data to count
   * @returns The record count
   */
  private countRecords(data: any): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    
    if (typeof data === 'object' && data !== null) {
      let count = 0;
      
      for (const key in data) {
        if (Array.isArray(data[key])) {
          count += data[key].length;
        } else if (typeof data[key] === 'object' && data[key] !== null) {
          count += this.countRecords(data[key]);
        }
      }
      
      return count;
    }
    
    return 1;
  }
  
  /**
   * Log report execution to history
   *
   * @param reportId The report ID
   * @param request The report request
   * @param status The execution status
   * @param executionTimeMs The execution time in ms
   * @param resultData The result data
   * @param resultMetadata The result metadata
   * @param errorMessage The error message if any
   * @returns The execution ID
   */
  private async logReportExecution(
    reportId: string,
    request: ConsolidatedReportRequest,
    status: 'success' | 'failed',
    executionTimeMs: number,
    resultData: any,
    resultMetadata: any,
    errorMessage?: string
  ): Promise<string> {
    const executionId = uuidv4();
    
    await db.query(
      `INSERT INTO m_consolidated_report_execution (
        id, report_id, execution_date, parameters, filters, output_format, 
        status, error_message, execution_time_ms, result_data, result_metadata, executed_by
      ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        executionId,
        reportId,
        JSON.stringify(request.parameters || {}),
        JSON.stringify(request.filters || {}),
        request.format,
        status,
        errorMessage,
        executionTimeMs,
        resultData ? JSON.stringify(resultData) : null,
        resultMetadata ? JSON.stringify(resultMetadata) : null,
        request.userId || null
      ]
    );
    
    return executionId;
  }
  
  /**
   * Log dashboard execution to history
   *
   * @param dashboardId The dashboard ID
   * @param request The dashboard request
   * @param status The execution status
   * @param executionTimeMs The execution time in ms
   * @param metricsData The metrics data
   * @param visualizationData The visualization data
   * @param errorMessage The error message if any
   * @returns The execution ID
   */
  private async logDashboardExecution(
    dashboardId: string,
    request: CrossModuleDashboardRequest,
    status: 'success' | 'failed',
    executionTimeMs: number,
    metricsData: any,
    visualizationData: any,
    errorMessage?: string
  ): Promise<string> {
    const executionId = uuidv4();
    
    await db.query(
      `INSERT INTO m_dashboard_execution (
        id, dashboard_id, execution_date, parameters, filters, 
        status, error_message, execution_time_ms, metrics_data, visualization_data, executed_by
      ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        executionId,
        dashboardId,
        JSON.stringify(request.parameters || {}),
        JSON.stringify(request.filters || {}),
        status,
        errorMessage,
        executionTimeMs,
        metricsData ? JSON.stringify(metricsData) : null,
        visualizationData ? JSON.stringify(visualizationData) : null,
        request.userId || null
      ]
    );
    
    return executionId;
  }
  
  /**
   * Calculate dashboard metrics
   *
   * @param request The dashboard request
   * @returns The calculated metrics
   */
  private async calculateDashboardMetrics(request: CrossModuleDashboardRequest): Promise<any[]> {
    // In a real implementation, this would calculate metrics based on GraphQL data
    // For now, return mock metrics
    return [
      {
        id: 'total_portfolio',
        name: 'Total Portfolio',
        value: 5250000,
        previousValue: 5000000,
        changePercentage: 5.0,
        trend: TrendDirection.UP,
        category: 'portfolio',
        metadata: { currency: 'USD' }
      },
      {
        id: 'active_clients',
        name: 'Active Clients',
        value: 3200,
        previousValue: 3000,
        changePercentage: 6.67,
        trend: TrendDirection.UP,
        category: 'client'
      },
      {
        id: 'portfolio_at_risk',
        name: 'Portfolio at Risk (30)',
        value: 2.38,
        previousValue: 2.5,
        changePercentage: -4.8,
        trend: TrendDirection.DOWN,
        category: 'portfolio',
        subCategory: 'risk'
      },
      {
        id: 'operational_efficiency',
        name: 'Operational Efficiency Ratio',
        value: 15.2,
        previousValue: 16.5,
        changePercentage: -7.88,
        trend: TrendDirection.DOWN,
        category: 'financial',
        subCategory: 'efficiency'
      },
      {
        id: 'active_savings',
        name: 'Active Savings',
        value: 3500000,
        previousValue: 3200000,
        changePercentage: 9.38,
        trend: TrendDirection.UP,
        category: 'savings',
        metadata: { currency: 'USD' }
      }
    ].filter(metric => request.metrics.includes(metric.id));
  }
  
  /**
   * Generate visualization data for dashboard
   *
   * @param request The dashboard request
   * @param metrics The calculated metrics
   * @returns The visualization data
   */
  private async generateVisualizationData(request: CrossModuleDashboardRequest, metrics: any[]): Promise<any> {
    // In a real implementation, this would generate charts and graphs
    // For now, return mock visualization data
    return {
      portfolioByProduct: [
        { name: 'Small Business Loan', value: 2250000 },
        { name: 'Agricultural Loan', value: 1750000 },
        { name: 'Housing Loan', value: 1250000 }
      ],
      clientSegmentation: [
        { name: 'Rural', value: 2100 },
        { name: 'Urban', value: 1400 }
      ],
      portfolioTrend: [
        { period: '2023-01', value: 4500000 },
        { period: '2023-02', value: 4600000 },
        { period: '2023-03', value: 4750000 },
        { period: '2023-04', value: 4900000 },
        { period: '2023-05', value: 5100000 },
        { period: '2023-06', value: 5250000 }
      ],
      clientTrend: [
        { period: '2023-01', value: 3000 },
        { period: '2023-02', value: 3130 },
        { period: '2023-03', value: 3255 },
        { period: '2023-04', value: 3395 },
        { period: '2023-05', value: 3500 }
      ],
      savingsTrend: [
        { period: '2023-01', value: 3000000 },
        { period: '2023-02', value: 3040000 },
        { period: '2023-03', value: 3080000 },
        { period: '2023-04', value: 3150000 },
        { period: '2023-05', value: 3220000 },
        { period: '2023-06', value: 3280000 },
        { period: '2023-07', value: 3360000 },
        { period: '2023-08', value: 3440000 },
        { period: '2023-09', value: 3500000 }
      ],
      parByBranch: [
        { name: 'Branch A', value: 2.1 },
        { name: 'Branch B', value: 2.8 },
        { name: 'Branch C', value: 1.9 },
        { name: 'Branch D', value: 3.2 }
      ]
    };
  }
}