import { 
  Job, 
  JobWorker, 
  JobType, 
  JobParameters 
} from '../models/job';
import { db } from '../utils/db';
import { createContextLogger } from '../utils/logger';
import { hostname } from 'os';

/**
 * System health check job worker
 * Performs health checks on various system components
 */
export class SystemHealthCheckJobWorker implements JobWorker {
  private logger = createContextLogger('SystemHealthCheck');
  
  /**
   * Process the job
   * @param job The job to process
   * @returns Health check results
   */
  async process(job: Job, parameters?: JobParameters): Promise<any> {
    this.logger.info('Starting system health check', { jobId: job.id });
    
    // Collect start time
    const startTime = Date.now();
    
    // Collect system info
    const systemInfo = await this.getSystemInfo();
    
    // Check database connection
    const dbStatus = await this.checkDatabase();
    
    // Check tenants (if multi-tenant)
    const tenantStatus = await this.checkTenants();
    
    // Calculate execution time
    const executionTimeMs = Date.now() - startTime;
    
    // Compile results
    const results = {
      timestamp: new Date().toISOString(),
      executionTimeMs,
      system: systemInfo,
      database: dbStatus,
      tenants: tenantStatus,
      status: 'healthy', // Will be updated if any issues are found
      issues: [] as string[]
    };
    
    // Check for issues
    if (!dbStatus.connected) {
      results.status = 'unhealthy';
      results.issues.push('Database connection failed');
    }
    
    if (tenantStatus.failedTenants > 0) {
      results.status = tenantStatus.failedTenants === tenantStatus.totalTenants 
        ? 'unhealthy' 
        : 'degraded';
      
      results.issues.push(`${tenantStatus.failedTenants} tenant connections failed`);
    }
    
    this.logger.info('System health check completed', { 
      status: results.status,
      executionTimeMs,
      issues: results.issues.length
    });
    
    return results;
  }
  
  /**
   * Get job type handled by this worker
   */
  getJobType(): JobType {
    return JobType.SYSTEM_HEALTH_CHECK;
  }
  
  /**
   * Check if worker can handle the job
   * @param job The job to check
   */
  canHandle(job: Job): boolean {
    return job.jobType === JobType.SYSTEM_HEALTH_CHECK;
  }
  
  /**
   * Get system information
   */
  private async getSystemInfo(): Promise<any> {
    const { cpus, totalmem, freemem, platform, release, uptime } = require('os');
    
    return {
      hostname: hostname(),
      platform,
      release,
      uptime: uptime(),
      memory: {
        total: totalmem(),
        free: freemem(),
        usedPercent: Math.round((1 - freemem() / totalmem()) * 100)
      },
      cpus: cpus().length,
      process: {
        version: process.version,
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    };
  }
  
  /**
   * Check database connection
   */
  private async checkDatabase(): Promise<any> {
    try {
      const start = Date.now();
      
      // Test simple query
      const result = await db.query('SELECT 1 as test');
      
      const latencyMs = Date.now() - start;
      
      return {
        connected: true,
        latencyMs,
        version: await this.getDatabaseVersion()
      };
    } catch (error) {
      this.logger.error('Database health check failed', { error });
      
      return {
        connected: false,
        error: error.message
      };
    }
  }
  
  /**
   * Get database version
   */
  private async getDatabaseVersion(): Promise<string> {
    try {
      const result = await db.query('SELECT version()');
      return result.rows[0].version;
    } catch (error) {
      return 'Unknown';
    }
  }
  
  /**
   * Check tenant connections
   */
  private async checkTenants(): Promise<any> {
    try {
      // Get active tenants
      const tenantsResult = await db.query(
        'SELECT id, name, identifier FROM tenant WHERE is_active = true'
      );
      
      const tenants = tenantsResult.rows;
      
      if (tenants.length === 0) {
        return {
          totalTenants: 0,
          activeTenants: 0,
          failedTenants: 0,
          tenantDetails: []
        };
      }
      
      // Check each tenant connection
      const tenantDetails = [];
      let failedTenants = 0;
      
      for (const tenant of tenants) {
        try {
          // Try to get a connection for the tenant
          const tenantConnection = await db.getTenantConnection(tenant.id);
          
          // Test simple query
          const start = Date.now();
          await tenantConnection.query('SELECT 1 as test');
          const latencyMs = Date.now() - start;
          
          // Release connection
          tenantConnection.release();
          
          tenantDetails.push({
            id: tenant.id,
            name: tenant.name,
            identifier: tenant.identifier,
            status: 'connected',
            latencyMs
          });
        } catch (error) {
          failedTenants++;
          
          tenantDetails.push({
            id: tenant.id,
            name: tenant.name,
            identifier: tenant.identifier,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      return {
        totalTenants: tenants.length,
        activeTenants: tenants.length - failedTenants,
        failedTenants,
        tenantDetails
      };
    } catch (error) {
      this.logger.error('Tenant health check failed', { error });
      
      return {
        totalTenants: 0,
        activeTenants: 0,
        failedTenants: 0,
        error: error.message
      };
    }
  }
}