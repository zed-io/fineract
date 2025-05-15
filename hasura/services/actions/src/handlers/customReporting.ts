import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { CustomReportingService } from '../services/reporting/customReportingService';
import { VisualizationService } from '../services/visualization/visualizationService';
import { DashboardService } from '../services/visualization/dashboardService';
import { CustomReportError, VisualizationError, DashboardError } from '../models/reporting/customReporting';

const customReportService = new CustomReportingService();
const visualizationService = new VisualizationService();
const dashboardService = new DashboardService();

/**
 * Custom Report Template Handlers
 */
export const createCustomReportTemplate = async (req: Request, res: Response) => {
  try {
    const { template } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const createdTemplate = await customReportService.createCustomReportTemplate(template, userId);

    return res.json({
      success: true,
      template: createdTemplate,
      message: 'Custom report template created successfully'
    });
  } catch (error) {
    logger.error('Error creating custom report template', { error });
    
    if (error instanceof CustomReportError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create custom report template'
    });
  }
};

export const updateCustomReportTemplate = async (req: Request, res: Response) => {
  try {
    const { id, template } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const updatedTemplate = await customReportService.updateCustomReportTemplate(id, template, userId);

    return res.json({
      success: true,
      template: updatedTemplate,
      message: 'Custom report template updated successfully'
    });
  } catch (error) {
    logger.error('Error updating custom report template', { error });
    
    if (error instanceof CustomReportError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update custom report template'
    });
  }
};

export const getCustomReportTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.body.input;
    
    const template = await customReportService.getCustomReportTemplate(id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: `Custom report template with ID ${id} not found`
      });
    }

    return res.json({
      success: true,
      template
    });
  } catch (error) {
    logger.error('Error getting custom report template', { error });
    
    if (error instanceof CustomReportError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to get custom report template'
    });
  }
};

export const listCustomReportTemplates = async (req: Request, res: Response) => {
  try {
    const { filters } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const { templates, count } = await customReportService.listCustomReportTemplates(filters, userId);

    return res.json({
      success: true,
      templates,
      count
    });
  } catch (error) {
    logger.error('Error listing custom report templates', { error });
    
    if (error instanceof CustomReportError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to list custom report templates'
    });
  }
};

export const deleteCustomReportTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const success = await customReportService.deleteCustomReportTemplate(id, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: `Custom report template with ID ${id} not found`
      });
    }

    return res.json({
      success: true,
      message: 'Custom report template deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting custom report template', { error });
    
    if (error instanceof CustomReportError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete custom report template'
    });
  }
};

/**
 * Custom Report Parameter Handlers
 */
export const addCustomReportParameter = async (req: Request, res: Response) => {
  try {
    const { reportId, parameter } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const addedParameter = await customReportService.addCustomReportParameter(reportId, parameter, userId);

    return res.json({
      success: true,
      parameter: addedParameter,
      message: 'Custom report parameter added successfully'
    });
  } catch (error) {
    logger.error('Error adding custom report parameter', { error });
    
    if (error instanceof CustomReportError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to add custom report parameter'
    });
  }
};

export const updateCustomReportParameter = async (req: Request, res: Response) => {
  try {
    const { id, parameter } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const updatedParameter = await customReportService.updateCustomReportParameter(id, parameter, userId);

    return res.json({
      success: true,
      parameter: updatedParameter,
      message: 'Custom report parameter updated successfully'
    });
  } catch (error) {
    logger.error('Error updating custom report parameter', { error });
    
    if (error instanceof CustomReportError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update custom report parameter'
    });
  }
};

export const deleteCustomReportParameter = async (req: Request, res: Response) => {
  try {
    const { id } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const success = await customReportService.deleteCustomReportParameter(id, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: `Custom report parameter with ID ${id} not found`
      });
    }

    return res.json({
      success: true,
      message: 'Custom report parameter deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting custom report parameter', { error });
    
    if (error instanceof CustomReportError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete custom report parameter'
    });
  }
};

/**
 * Custom Report Execution Handlers
 */
export const executeCustomReport = async (req: Request, res: Response) => {
  try {
    const { request } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const result = await customReportService.executeCustomReport(request, userId);

    return res.json({
      success: true,
      execution: result.execution,
      data: result.data,
      columns: result.columns
    });
  } catch (error) {
    logger.error('Error executing custom report', { error });
    
    if (error instanceof CustomReportError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to execute custom report'
    });
  }
};

export const getCustomReportExecutionHistory = async (req: Request, res: Response) => {
  try {
    const { filters } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const { executions, count } = await customReportService.getExecutionHistory(filters, userId);

    return res.json({
      success: true,
      executions,
      count
    });
  } catch (error) {
    logger.error('Error getting custom report execution history', { error });
    
    if (error instanceof CustomReportError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to get custom report execution history'
    });
  }
};

/**
 * Custom Report Saved Query Handlers
 */
export const saveCustomReportQuery = async (req: Request, res: Response) => {
  try {
    const { query } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const savedQuery = await customReportService.saveCustomReportQuery(query, userId);

    return res.json({
      success: true,
      savedQuery,
      message: 'Custom report query saved successfully'
    });
  } catch (error) {
    logger.error('Error saving custom report query', { error });
    
    if (error instanceof CustomReportError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to save custom report query'
    });
  }
};

export const getSavedCustomReportQueries = async (req: Request, res: Response) => {
  try {
    const { filters } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const { queries, count } = await customReportService.getSavedQueries(filters, userId);

    return res.json({
      success: true,
      queries,
      count
    });
  } catch (error) {
    logger.error('Error getting saved custom report queries', { error });
    
    if (error instanceof CustomReportError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to get saved custom report queries'
    });
  }
};

export const deleteSavedCustomReportQuery = async (req: Request, res: Response) => {
  try {
    const { id } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const success = await customReportService.deleteSavedQuery(id, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: `Saved query with ID ${id} not found`
      });
    }

    return res.json({
      success: true,
      message: 'Saved query deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting saved custom report query', { error });
    
    if (error instanceof CustomReportError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete saved custom report query'
    });
  }
};

/**
 * Export Handler
 */
export const exportCustomReport = async (req: Request, res: Response) => {
  try {
    const { request } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const exportResult = await customReportService.exportCustomReport(request, userId);

    // In a real implementation, you might want to store the file somewhere
    // and return a URL instead of the raw data

    return res.json({
      success: true,
      fileName: exportResult.fileName,
      contentType: exportResult.contentType,
      fileSize: exportResult.data.length,
      message: 'Report exported successfully'
    });
  } catch (error) {
    logger.error('Error exporting custom report', { error });
    
    if (error instanceof CustomReportError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to export custom report'
    });
  }
};

/**
 * Visualization Component Handlers
 */
export const createVisualizationComponent = async (req: Request, res: Response) => {
  try {
    const { component } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const createdComponent = await visualizationService.createVisualizationComponent(component, userId);

    return res.json({
      success: true,
      component: createdComponent,
      message: 'Visualization component created successfully'
    });
  } catch (error) {
    logger.error('Error creating visualization component', { error });
    
    if (error instanceof VisualizationError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create visualization component'
    });
  }
};

export const updateVisualizationComponent = async (req: Request, res: Response) => {
  try {
    const { id, component } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const updatedComponent = await visualizationService.updateVisualizationComponent(id, component, userId);

    return res.json({
      success: true,
      component: updatedComponent,
      message: 'Visualization component updated successfully'
    });
  } catch (error) {
    logger.error('Error updating visualization component', { error });
    
    if (error instanceof VisualizationError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update visualization component'
    });
  }
};

export const getVisualizationComponent = async (req: Request, res: Response) => {
  try {
    const { id } = req.body.input;
    
    const component = await visualizationService.getVisualizationComponent(id);

    if (!component) {
      return res.status(404).json({
        success: false,
        message: `Visualization component with ID ${id} not found`
      });
    }

    return res.json({
      success: true,
      component
    });
  } catch (error) {
    logger.error('Error getting visualization component', { error });
    
    if (error instanceof VisualizationError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to get visualization component'
    });
  }
};

export const listVisualizationComponents = async (req: Request, res: Response) => {
  try {
    const { filters } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const { components, count } = await visualizationService.listVisualizationComponents(filters, userId);

    return res.json({
      success: true,
      components,
      count
    });
  } catch (error) {
    logger.error('Error listing visualization components', { error });
    
    if (error instanceof VisualizationError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to list visualization components'
    });
  }
};

export const deleteVisualizationComponent = async (req: Request, res: Response) => {
  try {
    const { id } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const success = await visualizationService.deleteVisualizationComponent(id, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: `Visualization component with ID ${id} not found`
      });
    }

    return res.json({
      success: true,
      message: 'Visualization component deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting visualization component', { error });
    
    if (error instanceof VisualizationError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete visualization component'
    });
  }
};

export const renderVisualization = async (req: Request, res: Response) => {
  try {
    const { id, parameters } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const chartData = await visualizationService.renderVisualization(id, parameters, userId);

    return res.json({
      success: true,
      chartData
    });
  } catch (error) {
    logger.error('Error rendering visualization', { error });
    
    if (error instanceof VisualizationError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to render visualization'
    });
  }
};

/**
 * Dashboard Handlers
 */
export const createDashboard = async (req: Request, res: Response) => {
  try {
    const { dashboard } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const createdDashboard = await dashboardService.createDashboard(dashboard, userId);

    return res.json({
      success: true,
      dashboard: createdDashboard,
      message: 'Dashboard created successfully'
    });
  } catch (error) {
    logger.error('Error creating dashboard', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create dashboard'
    });
  }
};

export const updateDashboard = async (req: Request, res: Response) => {
  try {
    const { id, dashboard } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const updatedDashboard = await dashboardService.updateDashboard(id, dashboard, userId);

    return res.json({
      success: true,
      dashboard: updatedDashboard,
      message: 'Dashboard updated successfully'
    });
  } catch (error) {
    logger.error('Error updating dashboard', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update dashboard'
    });
  }
};

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.body.input;
    
    const dashboard = await dashboardService.getDashboard(id);

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: `Dashboard with ID ${id} not found`
      });
    }

    return res.json({
      success: true,
      dashboard
    });
  } catch (error) {
    logger.error('Error getting dashboard', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to get dashboard'
    });
  }
};

export const listDashboards = async (req: Request, res: Response) => {
  try {
    const { filters } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const { dashboards, count } = await dashboardService.listDashboards(filters, userId);

    return res.json({
      success: true,
      dashboards,
      count
    });
  } catch (error) {
    logger.error('Error listing dashboards', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to list dashboards'
    });
  }
};

export const deleteDashboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const success = await dashboardService.deleteDashboard(id, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: `Dashboard with ID ${id} not found`
      });
    }

    return res.json({
      success: true,
      message: 'Dashboard deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting dashboard', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete dashboard'
    });
  }
};

export const getDashboardWithData = async (req: Request, res: Response) => {
  try {
    const { id, parameters } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const result = await dashboardService.getDashboardWithData(id, parameters, userId);

    return res.json({
      success: true,
      dashboard: result.dashboard,
      panels: result.panels
    });
  } catch (error) {
    logger.error('Error getting dashboard with data', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to get dashboard with data'
    });
  }
};

/**
 * Dashboard Panel Handlers
 */
export const addDashboardPanel = async (req: Request, res: Response) => {
  try {
    const { panel } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const addedPanel = await dashboardService.addDashboardPanel(panel, userId);

    return res.json({
      success: true,
      panel: addedPanel,
      message: 'Dashboard panel added successfully'
    });
  } catch (error) {
    logger.error('Error adding dashboard panel', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to add dashboard panel'
    });
  }
};

export const updateDashboardPanel = async (req: Request, res: Response) => {
  try {
    const { id, panel } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const updatedPanel = await dashboardService.updateDashboardPanel(id, panel, userId);

    return res.json({
      success: true,
      panel: updatedPanel,
      message: 'Dashboard panel updated successfully'
    });
  } catch (error) {
    logger.error('Error updating dashboard panel', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update dashboard panel'
    });
  }
};

export const deleteDashboardPanel = async (req: Request, res: Response) => {
  try {
    const { id } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const success = await dashboardService.deleteDashboardPanel(id, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: `Dashboard panel with ID ${id} not found`
      });
    }

    return res.json({
      success: true,
      message: 'Dashboard panel deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting dashboard panel', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete dashboard panel'
    });
  }
};

/**
 * User Dashboard Preferences Handlers
 */
export const setUserDashboardPreference = async (req: Request, res: Response) => {
  try {
    const { preference } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    // Ensure the preference is for the current user
    const userPreference = {
      ...preference,
      userId
    };

    const savedPreference = await dashboardService.setUserDashboardPreference(userPreference, userId);

    return res.json({
      success: true,
      preference: savedPreference,
      message: 'User dashboard preference set successfully'
    });
  } catch (error) {
    logger.error('Error setting user dashboard preference', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to set user dashboard preference'
    });
  }
};

export const getUserDashboardPreferences = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const preferences = await dashboardService.getUserDashboardPreferences(userId);

    return res.json({
      success: true,
      preferences
    });
  } catch (error) {
    logger.error('Error getting user dashboard preferences', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to get user dashboard preferences'
    });
  }
};

/**
 * Scheduled Dashboard Handlers
 */
export const scheduleReportDashboard = async (req: Request, res: Response) => {
  try {
    const { schedule } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const scheduledDashboard = await dashboardService.scheduleReportDashboard(schedule, userId);

    return res.json({
      success: true,
      scheduledDashboard,
      message: 'Dashboard scheduled successfully'
    });
  } catch (error) {
    logger.error('Error scheduling dashboard', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to schedule dashboard'
    });
  }
};

export const updateScheduledDashboard = async (req: Request, res: Response) => {
  try {
    const { id, schedule } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const updatedSchedule = await dashboardService.updateScheduledDashboard(id, schedule, userId);

    return res.json({
      success: true,
      scheduledDashboard: updatedSchedule,
      message: 'Scheduled dashboard updated successfully'
    });
  } catch (error) {
    logger.error('Error updating scheduled dashboard', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update scheduled dashboard'
    });
  }
};

export const getScheduledDashboards = async (req: Request, res: Response) => {
  try {
    const { filters } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const { schedules, count } = await dashboardService.getScheduledDashboards(filters, userId);

    return res.json({
      success: true,
      schedules,
      count
    });
  } catch (error) {
    logger.error('Error getting scheduled dashboards', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to get scheduled dashboards'
    });
  }
};

export const deleteScheduledDashboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const success = await dashboardService.deleteScheduledDashboard(id, userId);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: `Scheduled dashboard with ID ${id} not found`
      });
    }

    return res.json({
      success: true,
      message: 'Scheduled dashboard deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting scheduled dashboard', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to delete scheduled dashboard'
    });
  }
};

/**
 * Export Dashboard Handler
 */
export const exportDashboard = async (req: Request, res: Response) => {
  try {
    const { dashboardId, format, parameters } = req.body.input;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User ID is required'
      });
    }

    const exportResult = await dashboardService.exportDashboard(dashboardId, format, parameters, userId);

    // In a real implementation, you might want to store the file somewhere
    // and return a URL instead of the raw data

    return res.json({
      success: true,
      fileName: exportResult.fileName,
      contentType: exportResult.contentType,
      fileSize: exportResult.data.length,
      message: 'Dashboard exported successfully'
    });
  } catch (error) {
    logger.error('Error exporting dashboard', { error });
    
    if (error instanceof DashboardError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to export dashboard'
    });
  }
};