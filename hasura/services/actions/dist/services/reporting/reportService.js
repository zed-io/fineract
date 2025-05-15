"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const uuid_1 = require("uuid");
const db_1 = require("../../utils/db");
const logger_1 = require("../../utils/logger");
const report_1 = require("../../models/reporting/report");
/**
 * Core report service for executing and managing reports
 */
class ReportService {
    constructor() {
        this.DEFAULT_PAGE_SIZE = 100;
        this.MAX_PAGE_SIZE = 5000;
    }
    /**
     * Get report definition by ID
     *
     * @param reportId The report ID
     * @returns The report definition
     */
    async getReportDefinition(reportId) {
        try {
            // Get report definition
            const reportResult = await db_1.db.query(`SELECT r.id, r.name, r.display_name, r.description, r.category, 
         r.sub_category, r.report_sql, r.report_query, r.is_active, 
         r.is_system_report, r.created_by, r.created_date, 
         r.updated_by, r.updated_date
         FROM m_report r
         WHERE r.id = $1`, [reportId]);
            if (reportResult.rowCount === 0) {
                throw new report_1.ReportNotFoundError(reportId);
            }
            const reportData = reportResult.rows[0];
            // Get report parameters
            const parametersResult = await db_1.db.query(`SELECT p.id, p.report_id, p.name, p.display_name, p.parameter_type, 
         p.default_value, p.select_options, p.is_mandatory, p.validation_regex, 
         p.query_for_options, p.depends_on, p.order_position, p.description
         FROM m_report_parameter p
         WHERE p.report_id = $1
         ORDER BY p.order_position`, [reportId]);
            // Get report columns
            const columnsResult = await db_1.db.query(`SELECT c.id, c.report_id, c.name, c.display_name, c.data_type, 
         c.is_visible, c.is_sortable, c.is_filterable, c.is_groupable, 
         c.is_aggregatable, c.aggregation_method, c.format_function, 
         c.order_position, c.default_sort_direction, c.default_is_sort, 
         c.default_sort_order, c.column_width, c.column_function
         FROM m_report_column c
         WHERE c.report_id = $1
         ORDER BY c.order_position`, [reportId]);
            // Map report parameters
            const parameters = parametersResult.rows.map(row => ({
                id: row.id,
                reportId: row.report_id,
                name: row.name,
                displayName: row.display_name,
                parameterType: row.parameter_type,
                defaultValue: row.default_value,
                selectOptions: row.select_options ? JSON.parse(row.select_options) : undefined,
                isMandatory: row.is_mandatory,
                validationRegex: row.validation_regex,
                queryForOptions: row.query_for_options,
                dependsOn: row.depends_on,
                orderPosition: row.order_position,
                description: row.description
            }));
            // Map report columns
            const columns = columnsResult.rows.map(row => ({
                id: row.id,
                reportId: row.report_id,
                name: row.name,
                displayName: row.display_name,
                dataType: row.data_type,
                isVisible: row.is_visible,
                isSortable: row.is_sortable,
                isFilterable: row.is_filterable,
                isGroupable: row.is_groupable,
                isAggregatable: row.is_aggregatable,
                aggregationMethod: row.aggregation_method,
                formatFunction: row.format_function,
                orderPosition: row.order_position,
                defaultSortDirection: row.default_sort_direction,
                defaultIsSort: row.default_is_sort,
                defaultSortOrder: row.default_sort_order,
                columnWidth: row.column_width,
                columnFunction: row.column_function
            }));
            // Construct report definition
            const report = {
                id: reportData.id,
                name: reportData.name,
                displayName: reportData.display_name,
                description: reportData.description,
                category: reportData.category,
                subCategory: reportData.sub_category,
                reportSql: reportData.report_sql,
                reportQuery: reportData.report_query ? JSON.parse(reportData.report_query) : undefined,
                parameters,
                columns,
                isActive: reportData.is_active,
                isSystemReport: reportData.is_system_report,
                createdBy: reportData.created_by,
                createdDate: reportData.created_date,
                updatedBy: reportData.updated_by,
                updatedDate: reportData.updated_date
            };
            return report;
        }
        catch (error) {
            if (error instanceof report_1.ReportNotFoundError) {
                throw error;
            }
            logger_1.logger.error('Error getting report definition', { reportId, error });
            throw new report_1.ReportError(`Failed to get report definition: ${error.message}`);
        }
    }
    /**
     * Get all report definitions
     *
     * @param category Optional category filter
     * @param activeOnly Whether to return only active reports
     * @returns Array of report definitions
     */
    async getAllReportDefinitions(category, activeOnly = true) {
        try {
            let query = `
        SELECT r.id, r.name, r.display_name, r.description, r.category, 
        r.sub_category, r.is_active, r.is_system_report
        FROM m_report r
        WHERE 1=1
      `;
            const params = [];
            let paramIndex = 1;
            if (activeOnly) {
                query += ` AND r.is_active = $${paramIndex}`;
                params.push(true);
                paramIndex++;
            }
            if (category) {
                query += ` AND r.category = $${paramIndex}`;
                params.push(category);
                paramIndex++;
            }
            query += ' ORDER BY r.category, r.sub_category, r.display_name';
            const result = await db_1.db.query(query, params);
            // Map basic report info
            return result.rows.map(row => ({
                id: row.id,
                name: row.name,
                displayName: row.display_name,
                description: row.description,
                category: row.category,
                subCategory: row.sub_category,
                isActive: row.is_active,
                isSystemReport: row.is_system_report,
                parameters: [],
                columns: []
            }));
        }
        catch (error) {
            logger_1.logger.error('Error getting all report definitions', { category, activeOnly, error });
            throw new report_1.ReportError(`Failed to get report definitions: ${error.message}`);
        }
    }
    /**
     * Execute a report
     *
     * @param request The report execution request
     * @returns The report execution result
     */
    async executeReport(request) {
        var _a, _b, _c, _d;
        const startTime = Date.now();
        try {
            // Get report definition
            const report = await this.getReportDefinition(request.reportId);
            // Check if report is active
            if (!report.isActive) {
                throw new report_1.ReportError(`Report '${report.name}' is not active`);
            }
            // Validate parameters
            this.validateParameters(report, request.parameters);
            // Prepare query
            const query = await this.prepareQuery(report, request);
            // Execute query
            logger_1.logger.debug('Executing report query', { reportId: report.id, sql: query.sql });
            const result = await db_1.db.query(query.sql, query.params);
            // Calculate execution time
            const executionTimeMs = Date.now() - startTime;
            // Prepare result data
            const data = result.rows.map(row => {
                // Convert row keys to camelCase for consistency
                const mappedRow = {};
                for (const key in row) {
                    if (Object.prototype.hasOwnProperty.call(row, key)) {
                        mappedRow[this.snakeToCamel(key)] = row[key];
                    }
                }
                return mappedRow;
            });
            // Get visible columns
            const visibleColumns = report.columns
                .filter(col => col.isVisible)
                .sort((a, b) => a.orderPosition - b.orderPosition);
            // Prepare column metadata
            const columns = visibleColumns.map(col => ({
                name: col.name,
                displayName: col.displayName,
                dataType: col.dataType,
                isVisible: col.isVisible
            }));
            // Calculate totals for columns marked as aggregatable
            const totals = this.calculateTotals(data, report.columns);
            // Prepare paging info if applicable
            const paging = request.pagination ? {
                pageSize: request.pagination.pageSize,
                pageNumber: request.pagination.pageNumber,
                totalRecords: parseInt(((_b = (_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.total_count) === null || _b === void 0 ? void 0 : _b.toString()) || data.length.toString()),
                totalPages: Math.ceil(parseInt(((_d = (_c = result.rows[0]) === null || _c === void 0 ? void 0 : _c.total_count) === null || _d === void 0 ? void 0 : _d.toString()) || data.length.toString()) /
                    request.pagination.pageSize)
            } : undefined;
            // Return the execution result
            const executionResult = {
                reportId: report.id,
                reportName: report.displayName,
                executionDate: new Date(),
                parameters: request.parameters,
                columns,
                data,
                totals,
                paging,
                executionTimeMs
            };
            // Log execution to history table
            await this.logReportExecution(report.id, request, 'success', executionTimeMs);
            return executionResult;
        }
        catch (error) {
            // Calculate execution time
            const executionTimeMs = Date.now() - startTime;
            // Log error
            logger_1.logger.error('Error executing report', {
                reportId: request.reportId,
                parameters: request.parameters,
                error
            });
            // Log failed execution to history table
            await this.logReportExecution(request.reportId, request, 'failed', executionTimeMs, error.message);
            // Re-throw appropriate error
            if (error instanceof report_1.ReportNotFoundError ||
                error instanceof report_1.InvalidReportParameterError ||
                error instanceof report_1.ReportError) {
                throw error;
            }
            throw new report_1.ReportExecutionError(`Failed to execute report: ${error.message}`);
        }
    }
    /**
     * Export a report in the specified format
     *
     * @param request The report execution request
     * @returns The exported report data
     */
    async exportReport(request) {
        try {
            // Set format if not provided
            const format = request.format || report_1.ReportFormat.PDF;
            // Execute report
            const result = await this.executeReport(request);
            // Get report definition
            const report = await this.getReportDefinition(request.reportId);
            // Generate file name
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${report.name}_${timestamp}`;
            // Export based on format
            switch (format) {
                case report_1.ReportFormat.PDF:
                    return this.exportToPdf(report, result, fileName);
                case report_1.ReportFormat.EXCEL:
                    return this.exportToExcel(report, result, fileName);
                case report_1.ReportFormat.CSV:
                    return this.exportToCsv(report, result, fileName);
                case report_1.ReportFormat.HTML:
                    return this.exportToHtml(report, result, fileName);
                default:
                    throw new report_1.ReportError(`Unsupported export format: ${format}`);
            }
        }
        catch (error) {
            logger_1.logger.error('Error exporting report', {
                reportId: request.reportId,
                format: request.format,
                error
            });
            if (error instanceof report_1.ReportError ||
                error instanceof report_1.ReportNotFoundError ||
                error instanceof report_1.InvalidReportParameterError ||
                error instanceof report_1.ReportExecutionError) {
                throw error;
            }
            throw new report_1.ReportError(`Failed to export report: ${error.message}`);
        }
    }
    /**
     * Create a new report definition
     *
     * @param report The report definition to create
     * @param userId The user ID creating the report
     * @returns The created report ID
     */
    async createReportDefinition(report, userId) {
        return db_1.db.transaction(async (client) => {
            try {
                // Validate report definition
                this.validateReportDefinition(report);
                // Insert report
                const reportId = (0, uuid_1.v4)();
                await client.query(`INSERT INTO m_report (
            id, name, display_name, description, category, sub_category,
            report_sql, report_query, is_active, is_system_report,
            created_by, created_date
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`, [
                    reportId,
                    report.name,
                    report.displayName,
                    report.description,
                    report.category,
                    report.subCategory,
                    report.reportSql,
                    report.reportQuery ? JSON.stringify(report.reportQuery) : null,
                    report.isActive,
                    report.isSystemReport || false,
                    userId
                ]);
                // Insert parameters
                for (const param of report.parameters) {
                    await client.query(`INSERT INTO m_report_parameter (
              id, report_id, name, display_name, parameter_type,
              default_value, select_options, is_mandatory, validation_regex,
              query_for_options, depends_on, order_position, description
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
                        (0, uuid_1.v4)(),
                        reportId,
                        param.name,
                        param.displayName,
                        param.parameterType,
                        param.defaultValue,
                        param.selectOptions ? JSON.stringify(param.selectOptions) : null,
                        param.isMandatory,
                        param.validationRegex,
                        param.queryForOptions,
                        param.dependsOn,
                        param.orderPosition,
                        param.description
                    ]);
                }
                // Insert columns
                for (const column of report.columns) {
                    await client.query(`INSERT INTO m_report_column (
              id, report_id, name, display_name, data_type,
              is_visible, is_sortable, is_filterable, is_groupable,
              is_aggregatable, aggregation_method, format_function,
              order_position, default_sort_direction, default_is_sort,
              default_sort_order, column_width, column_function
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`, [
                        (0, uuid_1.v4)(),
                        reportId,
                        column.name,
                        column.displayName,
                        column.dataType,
                        column.isVisible,
                        column.isSortable,
                        column.isFilterable,
                        column.isGroupable,
                        column.isAggregatable,
                        column.aggregationMethod,
                        column.formatFunction,
                        column.orderPosition,
                        column.defaultSortDirection,
                        column.defaultIsSort,
                        column.defaultSortOrder,
                        column.columnWidth,
                        column.columnFunction
                    ]);
                }
                return reportId;
            }
            catch (error) {
                logger_1.logger.error('Error creating report definition', { report, error });
                throw new report_1.ReportError(`Failed to create report definition: ${error.message}`);
            }
        });
    }
    /**
     * Log report execution to history table
     *
     * @param reportId The report ID
     * @param request The execution request
     * @param status The execution status
     * @param executionTimeMs The execution time in milliseconds
     * @param errorMessage Optional error message
     */
    async logReportExecution(reportId, request, status, executionTimeMs, errorMessage) {
        try {
            await db_1.db.query(`INSERT INTO m_report_execution_history (
          id, report_id, execution_date, parameters, format,
          status, error_message, execution_time_ms, executed_by
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, $8)`, [
                (0, uuid_1.v4)(),
                reportId,
                JSON.stringify(request.parameters),
                request.format,
                status,
                errorMessage,
                executionTimeMs,
                request.userId || 'system'
            ]);
        }
        catch (error) {
            // Log but don't throw - this is a non-critical operation
            logger_1.logger.error('Error logging report execution', { reportId, error });
        }
    }
    /**
     * Validate report parameters
     *
     * @param report The report definition
     * @param parameters The parameter values to validate
     */
    validateParameters(report, parameters) {
        // Check for missing mandatory parameters
        for (const param of report.parameters) {
            if (param.isMandatory &&
                (!parameters || parameters[param.name] === undefined || parameters[param.name] === null)) {
                throw new report_1.InvalidReportParameterError(`Missing mandatory parameter: ${param.name}`);
            }
            // Skip validation for optional parameters if not provided
            if (!parameters || parameters[param.name] === undefined || parameters[param.name] === null) {
                continue;
            }
            const value = parameters[param.name];
            // Validate parameter type
            switch (param.parameterType) {
                case report_1.ParameterType.NUMBER:
                    if (typeof value !== 'number') {
                        throw new report_1.InvalidReportParameterError(`Parameter ${param.name} must be a number`);
                    }
                    break;
                case report_1.ParameterType.DATE:
                case report_1.ParameterType.DATE_RANGE:
                    // For date range, expect an object with from and to
                    if (param.parameterType === report_1.ParameterType.DATE_RANGE) {
                        if (typeof value !== 'object' || !value.from || !value.to) {
                            throw new report_1.InvalidReportParameterError(`Parameter ${param.name} must be a date range with from and to properties`);
                        }
                        // Validate both dates
                        if (!this.isValidDate(value.from) || !this.isValidDate(value.to)) {
                            throw new report_1.InvalidReportParameterError(`Parameter ${param.name} must contain valid dates`);
                        }
                    }
                    else {
                        // Single date
                        if (!this.isValidDate(value)) {
                            throw new report_1.InvalidReportParameterError(`Parameter ${param.name} must be a valid date`);
                        }
                    }
                    break;
                case report_1.ParameterType.BOOLEAN:
                    if (typeof value !== 'boolean') {
                        throw new report_1.InvalidReportParameterError(`Parameter ${param.name} must be a boolean`);
                    }
                    break;
                case report_1.ParameterType.SELECT:
                    // Validate against select options if provided
                    if (param.selectOptions &&
                        !param.selectOptions.some(option => option.value === value)) {
                        throw new report_1.InvalidReportParameterError(`Parameter ${param.name} has invalid value: ${value}`);
                    }
                    break;
                case report_1.ParameterType.MULTI_SELECT:
                    // Validate value is an array
                    if (!Array.isArray(value)) {
                        throw new report_1.InvalidReportParameterError(`Parameter ${param.name} must be an array`);
                    }
                    // Validate against select options if provided
                    if (param.selectOptions) {
                        const validValues = new Set(param.selectOptions.map(opt => opt.value));
                        for (const item of value) {
                            if (!validValues.has(item)) {
                                throw new report_1.InvalidReportParameterError(`Parameter ${param.name} has invalid value: ${item}`);
                            }
                        }
                    }
                    break;
            }
            // Validate regex if provided
            if (param.validationRegex && typeof value === 'string') {
                const regex = new RegExp(param.validationRegex);
                if (!regex.test(value)) {
                    throw new report_1.InvalidReportParameterError(`Parameter ${param.name} fails validation regex: ${param.validationRegex}`);
                }
            }
        }
    }
    /**
     * Check if a value is a valid date
     *
     * @param value The value to check
     * @returns Whether the value is a valid date
     */
    isValidDate(value) {
        if (typeof value === 'string') {
            // Try to parse as ISO date
            const date = new Date(value);
            return !isNaN(date.getTime());
        }
        else if (value instanceof Date) {
            return !isNaN(value.getTime());
        }
        return false;
    }
    /**
     * Prepare SQL query from report definition and request
     *
     * @param report The report definition
     * @param request The execution request
     * @returns The prepared SQL and parameters
     */
    async prepareQuery(report, request) {
        // If reportSql is provided, use it (with parameter substitution)
        if (report.reportSql) {
            return this.prepareRawSqlQuery(report, request);
        }
        // Otherwise build query from reportQuery structure
        if (report.reportQuery) {
            return this.buildQueryFromDefinition(report.reportQuery, report, request);
        }
        throw new report_1.ReportError('Report definition does not contain SQL or query definition');
    }
    /**
     * Prepare raw SQL query with parameter substitution
     *
     * @param report The report definition
     * @param request The execution request
     * @returns The prepared SQL and parameters
     */
    prepareRawSqlQuery(report, request) {
        let sql = report.reportSql;
        const params = [];
        // Replace parameter placeholders
        let paramIndex = 1;
        for (const param of report.parameters) {
            const value = request.parameters[param.name];
            if (value !== undefined && value !== null) {
                const placeholder = `\${${param.name}}`;
                // Handle special parameter types
                if (param.parameterType === report_1.ParameterType.DATE_RANGE) {
                    // Date range has two placeholders: ${param.name.from} and ${param.name.to}
                    const fromPlaceholder = `\${${param.name}.from}`;
                    const toPlaceholder = `\${${param.name}.to}`;
                    while (sql.includes(fromPlaceholder)) {
                        sql = sql.replace(fromPlaceholder, `$${paramIndex}`);
                        params.push(value.from);
                        paramIndex++;
                    }
                    while (sql.includes(toPlaceholder)) {
                        sql = sql.replace(toPlaceholder, `$${paramIndex}`);
                        params.push(value.to);
                        paramIndex++;
                    }
                }
                else if (param.parameterType === report_1.ParameterType.MULTI_SELECT) {
                    // For multi-select, replace with array parameter syntax (e.g., ANY($1))
                    while (sql.includes(placeholder)) {
                        sql = sql.replace(placeholder, `$${paramIndex}`);
                        params.push(value);
                        paramIndex++;
                    }
                }
                else {
                    // Regular parameter replacement
                    while (sql.includes(placeholder)) {
                        sql = sql.replace(placeholder, `$${paramIndex}`);
                        params.push(value);
                        paramIndex++;
                    }
                }
            }
        }
        // Add pagination if requested
        if (request.pagination) {
            const pageSize = Math.min(request.pagination.pageSize || this.DEFAULT_PAGE_SIZE, this.MAX_PAGE_SIZE);
            const offset = (request.pagination.pageNumber - 1) * pageSize;
            // Add row count calculation
            sql = `
        WITH report_data AS (
          ${sql}
        ),
        count_data AS (
          SELECT COUNT(*) AS total_count FROM report_data
        )
        SELECT rd.*, cd.total_count
        FROM report_data rd, count_data cd
        LIMIT ${pageSize} OFFSET ${offset}
      `;
        }
        return { sql, params };
    }
    /**
     * Build SQL query from query definition
     *
     * @param queryDef The query definition
     * @param report The report definition
     * @param request The execution request
     * @returns The prepared SQL and parameters
     */
    buildQueryFromDefinition(queryDef, report, request) {
        const params = [];
        let paramIndex = 1;
        // Build SELECT clause
        let sql = 'SELECT ';
        // Add columns
        const columnExpressions = queryDef.columns.map(col => {
            if (col.aggregation) {
                return `${col.aggregation}(${col.expression}) AS ${col.alias}`;
            }
            return `${col.expression} AS ${col.alias}`;
        });
        sql += columnExpressions.join(', ');
        // Add FROM clause
        sql += ` FROM ${queryDef.mainTable}`;
        // Add JOINs
        if (queryDef.joins && queryDef.joins.length > 0) {
            for (const join of queryDef.joins) {
                const joinType = join.type.toUpperCase();
                const joinTable = join.alias
                    ? `${join.table} AS ${join.alias}`
                    : join.table;
                sql += ` ${joinType} JOIN ${joinTable} ON ${join.on}`;
            }
        }
        // Add WHERE clause if there are filters
        if (queryDef.filters) {
            const whereClause = this.buildFilterClause(queryDef.filters, report, request.parameters, params, paramIndex);
            if (whereClause.sql) {
                sql += ` WHERE ${whereClause.sql}`;
                paramIndex = whereClause.nextParamIndex;
            }
        }
        // Add GROUP BY clause
        if (queryDef.groupBy && queryDef.groupBy.length > 0) {
            sql += ` GROUP BY ${queryDef.groupBy.join(', ')}`;
        }
        // Add HAVING clause if there are filters
        if (queryDef.havingFilters) {
            const havingClause = this.buildFilterClause(queryDef.havingFilters, report, request.parameters, params, paramIndex);
            if (havingClause.sql) {
                sql += ` HAVING ${havingClause.sql}`;
                paramIndex = havingClause.nextParamIndex;
            }
        }
        // Add ORDER BY clause
        let orderBy = '';
        // First try to use request sorting if provided
        if (request.sorting && request.sorting.length > 0) {
            const sortClauses = request.sorting.map(sort => {
                const direction = sort.direction.toUpperCase();
                return `${sort.field} ${direction}`;
            });
            orderBy = sortClauses.join(', ');
        }
        // Otherwise use query definition sorting
        else if (queryDef.orderBy && queryDef.orderBy.length > 0) {
            const sortClauses = queryDef.orderBy.map(sort => {
                const direction = sort.direction.toUpperCase();
                return `${sort.field} ${direction}`;
            });
            orderBy = sortClauses.join(', ');
        }
        // Finally use default column sorting
        else {
            const defaultSortColumns = report.columns
                .filter(col => col.defaultIsSort)
                .sort((a, b) => (a.defaultSortOrder || 0) - (b.defaultSortOrder || 0));
            if (defaultSortColumns.length > 0) {
                const sortClauses = defaultSortColumns.map(col => {
                    const direction = col.defaultSortDirection || report_1.SortDirection.ASC;
                    return `${col.name} ${direction.toUpperCase()}`;
                });
                orderBy = sortClauses.join(', ');
            }
        }
        if (orderBy) {
            sql += ` ORDER BY ${orderBy}`;
        }
        // Add LIMIT and OFFSET for pagination
        if (request.pagination) {
            const pageSize = Math.min(request.pagination.pageSize || this.DEFAULT_PAGE_SIZE, this.MAX_PAGE_SIZE);
            const offset = (request.pagination.pageNumber - 1) * pageSize;
            // Add row count calculation
            sql = `
        WITH report_data AS (
          ${sql}
        ),
        count_data AS (
          SELECT COUNT(*) AS total_count FROM report_data
        )
        SELECT rd.*, cd.total_count
        FROM report_data rd, count_data cd
        LIMIT ${pageSize} OFFSET ${offset}
      `;
        }
        else if (queryDef.limit) {
            sql += ` LIMIT ${queryDef.limit}`;
            if (queryDef.offset) {
                sql += ` OFFSET ${queryDef.offset}`;
            }
        }
        return { sql, params };
    }
    /**
     * Build SQL filter clause from filter group
     *
     * @param filterGroup The filter group
     * @param report The report definition
     * @param paramValues The parameter values
     * @param params The SQL parameters array
     * @param paramIndex The current parameter index
     * @returns The filter clause SQL and next parameter index
     */
    buildFilterClause(filterGroup, report, paramValues, params, paramIndex) {
        const clauses = [];
        let nextIndex = paramIndex;
        for (const filter of filterGroup.filters) {
            // Handle nested filter group
            if ('operator' in filter) {
                const nestedClause = this.buildFilterClause(filter, report, paramValues, params, nextIndex);
                if (nestedClause.sql) {
                    clauses.push(`(${nestedClause.sql})`);
                    nextIndex = nestedClause.nextParamIndex;
                }
            }
            // Handle individual filter
            else {
                // Skip filters with parameterName if the parameter is not provided
                if (filter.parameterName &&
                    (!paramValues || paramValues[filter.parameterName] === undefined ||
                        paramValues[filter.parameterName] === null)) {
                    continue;
                }
                let clause;
                const value = filter.parameterName ? paramValues[filter.parameterName] : filter.value;
                // Skip the filter if the value is null/undefined and the operator is not null-related
                if ((value === undefined || value === null) &&
                    !['is null', 'is not null'].includes(filter.operator)) {
                    continue;
                }
                // Build clause based on operator
                switch (filter.operator) {
                    case 'is null':
                        clause = `${filter.field} IS NULL`;
                        break;
                    case 'is not null':
                        clause = `${filter.field} IS NOT NULL`;
                        break;
                    case 'in':
                        if (Array.isArray(value) && value.length > 0) {
                            const placeholders = value.map(() => `$${nextIndex++}`).join(', ');
                            clause = `${filter.field} IN (${placeholders})`;
                            value.forEach(v => params.push(v));
                        }
                        else {
                            // Skip empty IN clause
                            continue;
                        }
                        break;
                    case 'not in':
                        if (Array.isArray(value) && value.length > 0) {
                            const placeholders = value.map(() => `$${nextIndex++}`).join(', ');
                            clause = `${filter.field} NOT IN (${placeholders})`;
                            value.forEach(v => params.push(v));
                        }
                        else {
                            // Skip empty NOT IN clause
                            continue;
                        }
                        break;
                    case 'between':
                        if (value.from !== undefined && value.to !== undefined) {
                            clause = `${filter.field} BETWEEN $${nextIndex} AND $${nextIndex + 1}`;
                            params.push(value.from);
                            params.push(value.to);
                            nextIndex += 2;
                        }
                        else {
                            // Skip incomplete BETWEEN clause
                            continue;
                        }
                        break;
                    case 'like':
                        clause = `${filter.field} LIKE $${nextIndex}`;
                        params.push(`%${value}%`);
                        nextIndex++;
                        break;
                    case 'not like':
                        clause = `${filter.field} NOT LIKE $${nextIndex}`;
                        params.push(`%${value}%`);
                        nextIndex++;
                        break;
                    default:
                        // For standard operators: =, !=, >, >=, <, <=
                        clause = `${filter.field} ${filter.operator} $${nextIndex}`;
                        params.push(value);
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
        const sql = clauses.join(` ${filterGroup.operator} `);
        return { sql, nextParamIndex: nextIndex };
    }
    /**
     * Calculate column totals for aggregatable columns
     *
     * @param data The report data
     * @param columns The report columns
     * @returns The column totals
     */
    calculateTotals(data, columns) {
        const totals = {};
        // Get aggregatable columns
        const aggregatableColumns = columns.filter(col => col.isAggregatable);
        if (aggregatableColumns.length === 0 || data.length === 0) {
            return totals;
        }
        // Calculate totals for each aggregatable column
        for (const column of aggregatableColumns) {
            const colName = this.snakeToCamel(column.name);
            switch (column.aggregationMethod) {
                case 'sum':
                    totals[colName] = data.reduce((sum, row) => {
                        const value = parseFloat(row[colName]);
                        return sum + (isNaN(value) ? 0 : value);
                    }, 0);
                    break;
                case 'avg':
                    {
                        const sum = data.reduce((acc, row) => {
                            const value = parseFloat(row[colName]);
                            return acc + (isNaN(value) ? 0 : value);
                        }, 0);
                        totals[colName] = sum / data.length;
                    }
                    break;
                case 'min':
                    totals[colName] = Math.min(...data.map(row => {
                        const value = parseFloat(row[colName]);
                        return isNaN(value) ? Infinity : value;
                    }));
                    break;
                case 'max':
                    totals[colName] = Math.max(...data.map(row => {
                        const value = parseFloat(row[colName]);
                        return isNaN(value) ? -Infinity : value;
                    }));
                    break;
                case 'count':
                    totals[colName] = data.length;
                    break;
                case 'count_distinct':
                    {
                        const uniqueValues = new Set(data.map(row => row[colName]));
                        totals[colName] = uniqueValues.size;
                    }
                    break;
            }
        }
        return totals;
    }
    /**
     * Validate report definition
     *
     * @param report The report definition to validate
     */
    validateReportDefinition(report) {
        // Check required fields
        if (!report.name) {
            throw new report_1.ReportError('Report name is required');
        }
        if (!report.displayName) {
            throw new report_1.ReportError('Report display name is required');
        }
        if (!report.category) {
            throw new report_1.ReportError('Report category is required');
        }
        // Check that either reportSql or reportQuery is provided
        if (!report.reportSql && !report.reportQuery) {
            throw new report_1.ReportError('Either report SQL or query definition is required');
        }
        // Validate query definition if provided
        if (report.reportQuery) {
            if (!report.reportQuery.mainTable) {
                throw new report_1.ReportError('Query definition must specify a main table');
            }
            if (!report.reportQuery.columns || report.reportQuery.columns.length === 0) {
                throw new report_1.ReportError('Query definition must include at least one column');
            }
        }
        // Validate columns
        if (!report.columns || report.columns.length === 0) {
            throw new report_1.ReportError('Report must include at least one column');
        }
        // Validate parameters
        if (report.parameters) {
            for (const param of report.parameters) {
                if (!param.name) {
                    throw new report_1.ReportError('All parameters must have a name');
                }
                if (!param.displayName) {
                    throw new report_1.ReportError('All parameters must have a display name');
                }
                if (!param.parameterType) {
                    throw new report_1.ReportError('All parameters must have a parameter type');
                }
            }
        }
    }
    /**
     * Export report to PDF
     *
     * @param report The report definition
     * @param result The report execution result
     * @param fileName The base file name
     * @returns The exported PDF data
     */
    async exportToPdf(report, result, fileName) {
        // TODO: Implement PDF export
        // For now, return a placeholder implementation
        throw new report_1.ReportError('PDF export not yet implemented');
    }
    /**
     * Export report to Excel
     *
     * @param report The report definition
     * @param result The report execution result
     * @param fileName The base file name
     * @returns The exported Excel data
     */
    async exportToExcel(report, result, fileName) {
        // TODO: Implement Excel export
        // For now, return a placeholder implementation
        throw new report_1.ReportError('Excel export not yet implemented');
    }
    /**
     * Export report to CSV
     *
     * @param report The report definition
     * @param result The report execution result
     * @param fileName The base file name
     * @returns The exported CSV data
     */
    async exportToCsv(report, result, fileName) {
        // TODO: Implement CSV export
        // For now, return a placeholder implementation
        throw new report_1.ReportError('CSV export not yet implemented');
    }
    /**
     * Export report to HTML
     *
     * @param report The report definition
     * @param result The report execution result
     * @param fileName The base file name
     * @returns The exported HTML data
     */
    async exportToHtml(report, result, fileName) {
        // TODO: Implement HTML export
        // For now, return a placeholder implementation
        throw new report_1.ReportError('HTML export not yet implemented');
    }
    /**
     * Convert snake_case to camelCase
     *
     * @param str The string to convert
     * @returns The camelCase string
     */
    snakeToCamel(str) {
        return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    }
}
exports.ReportService = ReportService;
