import { 
  Job, 
  JobWorker, 
  JobType,
  DatabaseMaintenanceJobParameters
} from '../models/job';
import { db } from '../utils/db';
import { createContextLogger } from '../utils/logger';

/**
 * Database maintenance job worker
 * Performs database optimization tasks like vacuum, analyze, reindex
 */
export class DatabaseMaintenanceJobWorker implements JobWorker {
  private logger = createContextLogger('DatabaseMaintenance');
  
  /**
   * Process the job
   * @param job The job to process
   * @param parameters The job parameters
   * @returns Maintenance results
   */
  async process(job: Job, parameters?: DatabaseMaintenanceJobParameters): Promise<any> {
    this.logger.info('Starting database maintenance', { jobId: job.id });
    
    // Extract parameters
    const params = parameters || {};
    const analysisOnly = params.analysisOnly === true;
    const specificTables = params.tables || [];
    const vacuumFull = params.vacuumFull === true;
    const reindex = params.reindex === true;
    
    // Collect start time
    const startTime = Date.now();
    
    // Get database size before maintenance
    const sizeBefore = await this.getDatabaseSize();
    
    // Get table statistics before maintenance
    const tableStatsBefore = await this.getTableStatistics(specificTables);
    
    // Results object
    const results = {
      timestamp: new Date().toISOString(),
      executionTimeMs: 0,
      analysisOnly,
      databaseName: await this.getDatabaseName(),
      sizeBefore,
      sizeAfter: null,
      tablesMaintained: 0,
      tablesReindexed: 0,
      errors: [] as string[],
      tableResults: [] as any[]
    };
    
    try {
      // Skip maintenance if only analysis is requested
      if (!analysisOnly) {
        // Perform vacuum
        const vacuumResults = await this.performVacuum(specificTables, vacuumFull);
        results.tablesMaintained = vacuumResults.length;
        
        // Perform reindex if requested
        if (reindex) {
          const reindexResults = await this.performReindex(specificTables);
          results.tablesReindexed = reindexResults.length;
        }
      }
      
      // Get database size after maintenance
      results.sizeAfter = await this.getDatabaseSize();
      
      // Get table statistics after maintenance
      const tableStatsAfter = await this.getTableStatistics(specificTables);
      
      // Calculate table-level results
      results.tableResults = this.calculateTableResults(tableStatsBefore, tableStatsAfter);
      
    } catch (error) {
      this.logger.error('Database maintenance error', { error });
      results.errors.push(error.message);
    }
    
    // Calculate execution time
    results.executionTimeMs = Date.now() - startTime;
    
    this.logger.info('Database maintenance completed', { 
      executionTimeMs: results.executionTimeMs,
      tablesMaintained: results.tablesMaintained
    });
    
    return results;
  }
  
  /**
   * Get job type handled by this worker
   */
  getJobType(): JobType {
    return JobType.DATABASE_MAINTENANCE;
  }
  
  /**
   * Check if worker can handle the job
   * @param job The job to check
   */
  canHandle(job: Job): boolean {
    return job.jobType === JobType.DATABASE_MAINTENANCE;
  }
  
  /**
   * Get database name
   */
  private async getDatabaseName(): Promise<string> {
    try {
      const result = await db.query('SELECT current_database()');
      return result.rows[0].current_database;
    } catch (error) {
      this.logger.error('Failed to get database name', { error });
      return 'unknown';
    }
  }
  
  /**
   * Get database size
   */
  private async getDatabaseSize(): Promise<any> {
    try {
      // Get overall database size
      const sizeResult = await db.query(`
        SELECT pg_size_pretty(pg_database_size(current_database())) as pretty_size,
               pg_database_size(current_database()) as size_bytes
      `);
      
      // Get sum of all user tables
      const tablesResult = await db.query(`
        SELECT pg_size_pretty(sum(pg_total_relation_size(relid))) as pretty_size,
               sum(pg_total_relation_size(relid)) as size_bytes
        FROM pg_stat_user_tables
      `);
      
      // Get sum of all indexes
      const indexesResult = await db.query(`
        SELECT pg_size_pretty(sum(pg_indexes_size(relid))) as pretty_size,
               sum(pg_indexes_size(relid)) as size_bytes
        FROM pg_stat_user_tables
      `);
      
      return {
        database: {
          prettySize: sizeResult.rows[0].pretty_size,
          sizeBytes: parseInt(sizeResult.rows[0].size_bytes)
        },
        tables: {
          prettySize: tablesResult.rows[0].pretty_size,
          sizeBytes: parseInt(tablesResult.rows[0].size_bytes)
        },
        indexes: {
          prettySize: indexesResult.rows[0].pretty_size,
          sizeBytes: parseInt(indexesResult.rows[0].size_bytes)
        }
      };
    } catch (error) {
      this.logger.error('Failed to get database size', { error });
      return {
        error: error.message
      };
    }
  }
  
  /**
   * Get table statistics
   * @param tables Optional specific tables to get stats for
   */
  private async getTableStatistics(tables: string[] = []): Promise<any[]> {
    try {
      let query = `
        SELECT
          schemaname,
          relname as table_name,
          pg_size_pretty(pg_total_relation_size(relid)) as pretty_size,
          pg_total_relation_size(relid) as size_bytes,
          pg_size_pretty(pg_relation_size(relid)) as pretty_table_size,
          pg_relation_size(relid) as table_size_bytes,
          pg_size_pretty(pg_indexes_size(relid)) as pretty_index_size,
          pg_indexes_size(relid) as index_size_bytes,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows,
          CASE WHEN n_live_tup > 0 
               THEN round(n_dead_tup * 100.0 / n_live_tup, 1) 
               ELSE 0 
          END as dead_rows_pct,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
      `;
      
      // Filter by specific tables if provided
      if (tables.length > 0) {
        query += ` WHERE relname IN (${tables.map((_, i) => `$${i + 1}`).join(',')})`;
      }
      
      query += ` ORDER BY pg_total_relation_size(relid) DESC`;
      
      const result = await db.query(query, tables);
      
      return result.rows;
    } catch (error) {
      this.logger.error('Failed to get table statistics', { error });
      return [];
    }
  }
  
  /**
   * Perform vacuum on tables
   * @param tables Optional specific tables to vacuum
   * @param full Whether to perform VACUUM FULL
   */
  private async performVacuum(tables: string[] = [], full: boolean = false): Promise<string[]> {
    const vacuumedTables: string[] = [];
    
    try {
      // Get tables to vacuum
      let tablesToVacuum = tables;
      
      if (tablesToVacuum.length === 0) {
        // If no specific tables provided, get tables with dead rows
        const deadRowsResult = await db.query(`
          SELECT relname as table_name
          FROM pg_stat_user_tables
          WHERE n_dead_tup > 0
          ORDER BY n_dead_tup DESC
        `);
        
        tablesToVacuum = deadRowsResult.rows.map(row => row.table_name);
      }
      
      // Skip if no tables to vacuum
      if (tablesToVacuum.length === 0) {
        this.logger.info('No tables need vacuuming');
        return vacuumedTables;
      }
      
      // Log tables to vacuum
      this.logger.info(`Vacuuming ${tablesToVacuum.length} tables`, {
        full,
        tables: tablesToVacuum.join(', ')
      });
      
      // Vacuum each table
      for (const table of tablesToVacuum) {
        try {
          // Escape table name to prevent SQL injection
          const escapedTable = table.replace(/[^a-zA-Z0-9_]/g, '');
          
          // Build vacuum command
          let vacuumCommand = 'VACUUM';
          
          if (full) {
            vacuumCommand += ' FULL';
          }
          
          vacuumCommand += ` ANALYZE "${escapedTable}"`;
          
          // Execute vacuum
          await db.query(vacuumCommand);
          vacuumedTables.push(table);
          
          this.logger.debug(`Vacuumed table: ${table}`);
        } catch (error) {
          this.logger.error(`Failed to vacuum table: ${table}`, { error });
        }
      }
      
      return vacuumedTables;
    } catch (error) {
      this.logger.error('Failed to perform vacuum', { error });
      return vacuumedTables;
    }
  }
  
  /**
   * Perform reindex on tables
   * @param tables Optional specific tables to reindex
   */
  private async performReindex(tables: string[] = []): Promise<string[]> {
    const reindexedTables: string[] = [];
    
    try {
      // Get tables to reindex
      let tablesToReindex = tables;
      
      if (tablesToReindex.length === 0) {
        // If no specific tables provided, get all tables
        const tablesResult = await db.query(`
          SELECT relname as table_name
          FROM pg_stat_user_tables
          ORDER BY pg_total_relation_size(relid) DESC
        `);
        
        tablesToReindex = tablesResult.rows.map(row => row.table_name);
      }
      
      // Skip if no tables to reindex
      if (tablesToReindex.length === 0) {
        this.logger.info('No tables to reindex');
        return reindexedTables;
      }
      
      // Log tables to reindex
      this.logger.info(`Reindexing ${tablesToReindex.length} tables`);
      
      // Reindex each table
      for (const table of tablesToReindex) {
        try {
          // Escape table name to prevent SQL injection
          const escapedTable = table.replace(/[^a-zA-Z0-9_]/g, '');
          
          // Reindex table
          await db.query(`REINDEX TABLE "${escapedTable}"`);
          reindexedTables.push(table);
          
          this.logger.debug(`Reindexed table: ${table}`);
        } catch (error) {
          this.logger.error(`Failed to reindex table: ${table}`, { error });
        }
      }
      
      return reindexedTables;
    } catch (error) {
      this.logger.error('Failed to perform reindex', { error });
      return reindexedTables;
    }
  }
  
  /**
   * Calculate table-level results
   * @param before Table statistics before maintenance
   * @param after Table statistics after maintenance
   */
  private calculateTableResults(before: any[], after: any[]): any[] {
    const results: any[] = [];
    
    // Create map of before stats by table name
    const beforeMap = new Map(before.map(t => [t.table_name, t]));
    
    // Process each table in after stats
    for (const tableAfter of after) {
      const tableName = tableAfter.table_name;
      const tableBefore = beforeMap.get(tableName);
      
      if (!tableBefore) {
        // Table wasn't in before stats, just use after stats
        results.push({
          tableName,
          ...tableAfter,
          spaceSavedBytes: 0,
          spaceSavedPercent: 0
        });
        continue;
      }
      
      // Calculate space saved
      const sizeBefore = parseInt(tableBefore.size_bytes);
      const sizeAfter = parseInt(tableAfter.size_bytes);
      const spaceSavedBytes = Math.max(0, sizeBefore - sizeAfter);
      const spaceSavedPercent = sizeBefore > 0 
        ? Math.round((spaceSavedBytes / sizeBefore) * 1000) / 10 
        : 0;
      
      // Calculate dead rows cleaned
      const deadRowsBefore = parseInt(tableBefore.dead_rows) || 0;
      const deadRowsAfter = parseInt(tableAfter.dead_rows) || 0;
      const deadRowsCleaned = Math.max(0, deadRowsBefore - deadRowsAfter);
      
      results.push({
        tableName,
        schemaName: tableAfter.schemaname,
        sizeBefore: {
          pretty: tableBefore.pretty_size,
          bytes: sizeBefore
        },
        sizeAfter: {
          pretty: tableAfter.pretty_size,
          bytes: sizeAfter
        },
        spaceSaved: {
          pretty: this.bytesToPrettySize(spaceSavedBytes),
          bytes: spaceSavedBytes,
          percent: spaceSavedPercent
        },
        rowsBefore: {
          live: parseInt(tableBefore.live_rows) || 0,
          dead: deadRowsBefore,
          deadPercent: parseFloat(tableBefore.dead_rows_pct) || 0
        },
        rowsAfter: {
          live: parseInt(tableAfter.live_rows) || 0,
          dead: deadRowsAfter,
          deadPercent: parseFloat(tableAfter.dead_rows_pct) || 0
        },
        deadRowsCleaned,
        lastVacuum: tableAfter.last_vacuum || tableAfter.last_autovacuum,
        lastAnalyze: tableAfter.last_analyze || tableAfter.last_autoanalyze
      });
    }
    
    // Sort by space saved (descending)
    return results.sort((a, b) => {
      return b.spaceSaved.bytes - a.spaceSaved.bytes;
    });
  }
  
  /**
   * Convert bytes to human-readable size
   * @param bytes Size in bytes
   */
  private bytesToPrettySize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const units = ['B', 'kB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${Math.round(bytes / Math.pow(1024, i) * 100) / 100} ${units[i]}`;
  }
}