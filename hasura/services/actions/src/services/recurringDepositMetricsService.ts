/**
 * Recurring Deposit Metrics Service for Fineract
 * Provides functionality for generating performance metrics and dashboard data
 */

import { query, transaction } from '../utils/db';
import { logger } from '../utils/logger';
import Decimal from 'decimal.js';

/**
 * Interface for general statistics
 */
export interface RecurringDepositStats {
  totalAccounts: number;
  activeAccounts: number;
  pendingAccounts: number;
  maturedAccounts: number;
  closedAccounts: number;
  totalDeposits: string;
  totalInterestPosted: string;
  totalOutstandingBalance: string;
  accountsCreatedThisMonth: number;
  accountsMaturedThisMonth: number;
  accountsClosedThisMonth: number;
}

/**
 * Interface for recent activity
 */
export interface RecentActivity {
  id: string;
  date: string;
  accountId: string;
  accountNo: string;
  clientId: string;
  clientName: string;
  activityType: string;
  amount?: string;
  details?: string;
}

/**
 * Interface for product performance
 */
export interface ProductPerformance {
  productId: string;
  productName: string;
  totalAccounts: number;
  activeAccounts: number;
  totalDeposits: string;
  totalInterestPosted: string;
  averageDepositAmount: string;
}

/**
 * Interface for charts data
 */
export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
    borderWidth?: number;
  }[];
}

/**
 * Interface for deposit trends
 */
export interface DepositTrends {
  daily: ChartData;
  weekly: ChartData;
  monthly: ChartData;
}

/**
 * Interface for maturity forecast
 */
export interface MaturityForecast {
  upcoming7Days: number;
  upcoming30Days: number;
  upcoming90Days: number;
  upcomingMaturityAmount7Days: string;
  upcomingMaturityAmount30Days: string;
  upcomingMaturityAmount90Days: string;
  maturityDistribution: ChartData;
}

/**
 * Interface for installment compliance
 */
export interface InstallmentCompliance {
  onTimePercentage: number;
  latePercentage: number;
  missedPercentage: number;
  complianceRate: number;
  complianceTrend: ChartData;
  overdueAccounts: number;
  totalOverdueAmount: string;
}

/**
 * Interface for all dashboard metrics
 */
export interface DashboardMetrics {
  stats: RecurringDepositStats;
  recentActivity: RecentActivity[];
  productPerformance: ProductPerformance[];
  depositTrends: DepositTrends;
  maturityForecast: MaturityForecast;
  installmentCompliance: InstallmentCompliance;
  lastUpdated: string;
}

export class RecurringDepositMetricsService {
  
  /**
   * Get all dashboard metrics
   * @returns Dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    logger.info('Getting recurring deposit dashboard metrics');
    
    try {
      // Get general statistics
      const stats = await this.getGeneralStats();
      
      // Get recent activity
      const recentActivity = await this.getRecentActivity();
      
      // Get product performance
      const productPerformance = await this.getProductPerformance();
      
      // Get deposit trends
      const depositTrends = await this.getDepositTrends();
      
      // Get maturity forecast
      const maturityForecast = await this.getMaturityForecast();
      
      // Get installment compliance
      const installmentCompliance = await this.getInstallmentCompliance();
      
      return {
        stats,
        recentActivity,
        productPerformance,
        depositTrends,
        maturityForecast,
        installmentCompliance,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting recurring deposit dashboard metrics', { error });
      throw error;
    }
  }
  
  /**
   * Get general statistics
   * @returns General statistics
   */
  async getGeneralStats(): Promise<RecurringDepositStats> {
    try {
      // Get current date values for monthly calculations
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const firstDayOfMonthStr = firstDayOfMonth.toISOString().split('T')[0];
      
      // Get account statistics
      const accountStatsResult = await query(
        `SELECT 
          COUNT(*) as total_accounts,
          COUNT(*) FILTER (WHERE sa.status = 'active') as active_accounts,
          COUNT(*) FILTER (WHERE sa.status = 'pending') as pending_accounts,
          COUNT(*) FILTER (WHERE sa.status = 'matured') as matured_accounts,
          COUNT(*) FILTER (WHERE sa.status = 'closed' OR sa.status = 'premature_closed') as closed_accounts,
          COUNT(*) FILTER (WHERE sa.submitted_on_date >= $1) as accounts_created_this_month,
          COUNT(*) FILTER (WHERE sa.status = 'matured' AND rda.maturity_date >= $1) as accounts_matured_this_month,
          COUNT(*) FILTER (WHERE (sa.status = 'closed' OR sa.status = 'premature_closed') AND sa.closed_on_date >= $1) as accounts_closed_this_month,
          COALESCE(SUM(rda.total_deposits), 0) as total_deposits,
          COALESCE(SUM(rda.interest_earned), 0) as total_interest_posted,
          COALESCE(SUM(rda.total_deposits + rda.interest_earned - rda.total_withdrawals), 0) as total_outstanding_balance
         FROM recurring_deposit_account rda
         JOIN savings_account sa ON rda.savings_account_id = sa.id`,
        [firstDayOfMonthStr]
      );
      
      const stats = accountStatsResult.rows[0];
      
      return {
        totalAccounts: parseInt(stats.total_accounts) || 0,
        activeAccounts: parseInt(stats.active_accounts) || 0,
        pendingAccounts: parseInt(stats.pending_accounts) || 0,
        maturedAccounts: parseInt(stats.matured_accounts) || 0,
        closedAccounts: parseInt(stats.closed_accounts) || 0,
        totalDeposits: stats.total_deposits || '0',
        totalInterestPosted: stats.total_interest_posted || '0',
        totalOutstandingBalance: stats.total_outstanding_balance || '0',
        accountsCreatedThisMonth: parseInt(stats.accounts_created_this_month) || 0,
        accountsMaturedThisMonth: parseInt(stats.accounts_matured_this_month) || 0,
        accountsClosedThisMonth: parseInt(stats.accounts_closed_this_month) || 0
      };
    } catch (error) {
      logger.error('Error getting recurring deposit general stats', { error });
      throw error;
    }
  }
  
  /**
   * Get recent activity
   * @param limit Maximum number of activities to return
   * @returns Recent activity
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    try {
      // Union of different activity types
      const recentActivityResult = await query(
        `(
          -- Deposits
          SELECT 
            rdt.id, 
            sat.transaction_date as activity_date,
            rda.id as account_id,
            sa.account_no,
            sa.client_id,
            c.first_name || ' ' || c.last_name as client_name,
            'deposit' as activity_type,
            sat.amount::text,
            'Deposit for installment #' || rdt.installment_number as details
          FROM recurring_deposit_transaction rdt
          JOIN savings_account_transaction sat ON rdt.savings_account_transaction_id = sat.id
          JOIN recurring_deposit_account rda ON rdt.recurring_deposit_account_id = rda.id
          JOIN savings_account sa ON rda.savings_account_id = sa.id
          JOIN client c ON sa.client_id = c.id
          WHERE rdt.transaction_type = 'deposit'
          
          UNION ALL
          
          -- Interest Postings
          SELECT 
            rdt.id, 
            sat.transaction_date as activity_date,
            rda.id as account_id,
            sa.account_no,
            sa.client_id,
            c.first_name || ' ' || c.last_name as client_name,
            'interest_posting' as activity_type,
            sat.amount::text,
            'Interest posting' as details
          FROM recurring_deposit_transaction rdt
          JOIN savings_account_transaction sat ON rdt.savings_account_transaction_id = sat.id
          JOIN recurring_deposit_account rda ON rdt.recurring_deposit_account_id = rda.id
          JOIN savings_account sa ON rda.savings_account_id = sa.id
          JOIN client c ON sa.client_id = c.id
          WHERE rdt.transaction_type = 'INTEREST_POSTING'
          
          UNION ALL
          
          -- Account Creations
          SELECT 
            sa.id, 
            sa.submitted_on_date as activity_date,
            rda.id as account_id,
            sa.account_no,
            sa.client_id,
            c.first_name || ' ' || c.last_name as client_name,
            'account_creation' as activity_type,
            NULL as amount,
            'New recurring deposit account created' as details
          FROM recurring_deposit_account rda
          JOIN savings_account sa ON rda.savings_account_id = sa.id
          JOIN client c ON sa.client_id = c.id
          
          UNION ALL
          
          -- Account Maturities
          SELECT 
            rda.id, 
            rda.maturity_date as activity_date,
            rda.id as account_id,
            sa.account_no,
            sa.client_id,
            c.first_name || ' ' || c.last_name as client_name,
            'account_maturity' as activity_type,
            rda.maturity_amount::text as amount,
            'Account matured' as details
          FROM recurring_deposit_account rda
          JOIN savings_account sa ON rda.savings_account_id = sa.id
          JOIN client c ON sa.client_id = c.id
          WHERE rda.maturity_date IS NOT NULL
          
          UNION ALL
          
          -- Account Closures
          SELECT 
            sa.id, 
            sa.closed_on_date as activity_date,
            rda.id as account_id,
            sa.account_no,
            sa.client_id,
            c.first_name || ' ' || c.last_name as client_name,
            CASE WHEN sa.status = 'premature_closed' THEN 'premature_closure' ELSE 'account_closure' END as activity_type,
            NULL as amount,
            CASE WHEN sa.status = 'premature_closed' THEN 'Account closed prematurely' ELSE 'Account closed on maturity' END as details
          FROM recurring_deposit_account rda
          JOIN savings_account sa ON rda.savings_account_id = sa.id
          JOIN client c ON sa.client_id = c.id
          WHERE sa.status IN ('closed', 'premature_closed') AND sa.closed_on_date IS NOT NULL
        )
        ORDER BY activity_date DESC
        LIMIT $1`,
        [limit]
      );
      
      return recentActivityResult.rows.map(row => ({
        id: row.id,
        date: row.activity_date ? new Date(row.activity_date).toISOString() : null,
        accountId: row.account_id,
        accountNo: row.account_no,
        clientId: row.client_id,
        clientName: row.client_name,
        activityType: row.activity_type,
        amount: row.amount,
        details: row.details
      }));
    } catch (error) {
      logger.error('Error getting recurring deposit recent activity', { error });
      throw error;
    }
  }
  
  /**
   * Get product performance metrics
   * @returns Product performance data
   */
  async getProductPerformance(): Promise<ProductPerformance[]> {
    try {
      const productPerformanceResult = await query(
        `SELECT 
          rdp.id as product_id,
          sp.name as product_name,
          COUNT(rda.id) as total_accounts,
          COUNT(rda.id) FILTER (WHERE sa.status = 'active') as active_accounts,
          COALESCE(SUM(rda.total_deposits), 0) as total_deposits,
          COALESCE(SUM(rda.interest_earned), 0) as total_interest_posted,
          CASE 
            WHEN COUNT(rda.id) > 0 THEN COALESCE(SUM(rda.deposit_amount) / COUNT(rda.id), 0)
            ELSE 0
          END as average_deposit_amount
        FROM recurring_deposit_product rdp
        JOIN savings_product sp ON rdp.savings_product_id = sp.id
        LEFT JOIN recurring_deposit_account rda ON rda.product_id = rdp.id
        LEFT JOIN savings_account sa ON rda.savings_account_id = sa.id
        GROUP BY rdp.id, sp.name
        ORDER BY total_accounts DESC`
      );
      
      return productPerformanceResult.rows.map(row => ({
        productId: row.product_id,
        productName: row.product_name,
        totalAccounts: parseInt(row.total_accounts) || 0,
        activeAccounts: parseInt(row.active_accounts) || 0,
        totalDeposits: row.total_deposits || '0',
        totalInterestPosted: row.total_interest_posted || '0',
        averageDepositAmount: row.average_deposit_amount || '0'
      }));
    } catch (error) {
      logger.error('Error getting recurring deposit product performance', { error });
      throw error;
    }
  }
  
  /**
   * Get deposit trends
   * @returns Deposit trends data
   */
  async getDepositTrends(): Promise<DepositTrends> {
    try {
      // Calculate date ranges
      const now = new Date();
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      
      // Daily deposits for the last 30 days
      const dailyDepositsResult = await query(
        `SELECT 
          DATE(sat.transaction_date) as date,
          COALESCE(SUM(sat.amount), 0) as total_amount,
          COUNT(DISTINCT rdt.recurring_deposit_account_id) as accounts_count
        FROM recurring_deposit_transaction rdt
        JOIN savings_account_transaction sat ON rdt.savings_account_transaction_id = sat.id
        WHERE rdt.transaction_type = 'deposit'
          AND sat.transaction_date >= $1
          AND sat.is_reversed = false
        GROUP BY DATE(sat.transaction_date)
        ORDER BY date`,
        [thirtyDaysAgoStr]
      );
      
      // Weekly deposits
      const weeklyDepositsResult = await query(
        `SELECT 
          DATE_TRUNC('week', sat.transaction_date) as week_start,
          COALESCE(SUM(sat.amount), 0) as total_amount,
          COUNT(DISTINCT rdt.recurring_deposit_account_id) as accounts_count
        FROM recurring_deposit_transaction rdt
        JOIN savings_account_transaction sat ON rdt.savings_account_transaction_id = sat.id
        WHERE rdt.transaction_type = 'deposit'
          AND sat.transaction_date >= DATE_TRUNC('week', NOW() - INTERVAL '12 weeks')
          AND sat.is_reversed = false
        GROUP BY week_start
        ORDER BY week_start`
      );
      
      // Monthly deposits
      const monthlyDepositsResult = await query(
        `SELECT 
          DATE_TRUNC('month', sat.transaction_date) as month_start,
          COALESCE(SUM(sat.amount), 0) as total_amount,
          COUNT(DISTINCT rdt.recurring_deposit_account_id) as accounts_count
        FROM recurring_deposit_transaction rdt
        JOIN savings_account_transaction sat ON rdt.savings_account_transaction_id = sat.id
        WHERE rdt.transaction_type = 'deposit'
          AND sat.transaction_date >= DATE_TRUNC('month', NOW() - INTERVAL '12 months')
          AND sat.is_reversed = false
        GROUP BY month_start
        ORDER BY month_start`
      );
      
      // Format data for charts
      const dailyData: ChartData = {
        labels: dailyDepositsResult.rows.map(row => new Date(row.date).toLocaleDateString()),
        datasets: [
          {
            label: 'Daily Deposits',
            data: dailyDepositsResult.rows.map(row => parseFloat(row.total_amount)),
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'Accounts with Deposits',
            data: dailyDepositsResult.rows.map(row => parseInt(row.accounts_count)),
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }
        ]
      };
      
      const weeklyData: ChartData = {
        labels: weeklyDepositsResult.rows.map(row => {
          const date = new Date(row.week_start);
          return `Week of ${date.toLocaleDateString()}`;
        }),
        datasets: [
          {
            label: 'Weekly Deposits',
            data: weeklyDepositsResult.rows.map(row => parseFloat(row.total_amount)),
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'Accounts with Deposits',
            data: weeklyDepositsResult.rows.map(row => parseInt(row.accounts_count)),
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }
        ]
      };
      
      const monthlyData: ChartData = {
        labels: monthlyDepositsResult.rows.map(row => {
          const date = new Date(row.month_start);
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }),
        datasets: [
          {
            label: 'Monthly Deposits',
            data: monthlyDepositsResult.rows.map(row => parseFloat(row.total_amount)),
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'Accounts with Deposits',
            data: monthlyDepositsResult.rows.map(row => parseInt(row.accounts_count)),
            borderColor: 'rgba(153, 102, 255, 1)',
            borderWidth: 1
          }
        ]
      };
      
      return {
        daily: dailyData,
        weekly: weeklyData,
        monthly: monthlyData
      };
    } catch (error) {
      logger.error('Error getting recurring deposit trends', { error });
      throw error;
    }
  }
  
  /**
   * Get maturity forecast
   * @returns Maturity forecast data
   */
  async getMaturityForecast(): Promise<MaturityForecast> {
    try {
      // Calculate date ranges
      const now = new Date();
      const sevenDaysLater = new Date(now);
      sevenDaysLater.setDate(now.getDate() + 7);
      
      const thirtyDaysLater = new Date(now);
      thirtyDaysLater.setDate(now.getDate() + 30);
      
      const ninetyDaysLater = new Date(now);
      ninetyDaysLater.setDate(now.getDate() + 90);
      
      const todayStr = now.toISOString().split('T')[0];
      const sevenDaysLaterStr = sevenDaysLater.toISOString().split('T')[0];
      const thirtyDaysLaterStr = thirtyDaysLater.toISOString().split('T')[0];
      const ninetyDaysLaterStr = ninetyDaysLater.toISOString().split('T')[0];
      
      // Get upcoming maturities counts
      const upcomingMaturitiesResult = await query(
        `SELECT 
          COUNT(*) FILTER (WHERE rda.expected_maturity_date BETWEEN $1 AND $2) as upcoming_7_days,
          COUNT(*) FILTER (WHERE rda.expected_maturity_date BETWEEN $1 AND $3) as upcoming_30_days,
          COUNT(*) FILTER (WHERE rda.expected_maturity_date BETWEEN $1 AND $4) as upcoming_90_days,
          COALESCE(SUM(rda.expected_maturity_amount) FILTER (WHERE rda.expected_maturity_date BETWEEN $1 AND $2), 0) as upcoming_maturity_amount_7_days,
          COALESCE(SUM(rda.expected_maturity_amount) FILTER (WHERE rda.expected_maturity_date BETWEEN $1 AND $3), 0) as upcoming_maturity_amount_30_days,
          COALESCE(SUM(rda.expected_maturity_amount) FILTER (WHERE rda.expected_maturity_date BETWEEN $1 AND $4), 0) as upcoming_maturity_amount_90_days
        FROM recurring_deposit_account rda
        JOIN savings_account sa ON rda.savings_account_id = sa.id
        WHERE sa.status = 'active'
          AND rda.expected_maturity_date IS NOT NULL`,
        [todayStr, sevenDaysLaterStr, thirtyDaysLaterStr, ninetyDaysLaterStr]
      );
      
      // Get maturity distribution by month
      const maturityDistributionResult = await query(
        `SELECT 
          DATE_TRUNC('month', rda.expected_maturity_date) as month,
          COUNT(*) as account_count,
          COALESCE(SUM(rda.expected_maturity_amount), 0) as total_maturity_amount
        FROM recurring_deposit_account rda
        JOIN savings_account sa ON rda.savings_account_id = sa.id
        WHERE sa.status = 'active'
          AND rda.expected_maturity_date IS NOT NULL
          AND rda.expected_maturity_date BETWEEN NOW() AND NOW() + INTERVAL '12 months'
        GROUP BY month
        ORDER BY month`
      );
      
      // Format data for chart
      const maturityDistribution: ChartData = {
        labels: maturityDistributionResult.rows.map(row => {
          const date = new Date(row.month);
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }),
        datasets: [
          {
            label: 'Maturing Accounts',
            data: maturityDistributionResult.rows.map(row => parseInt(row.account_count)),
            backgroundColor: [
              'rgba(255, 99, 132, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(153, 102, 255, 0.6)',
              'rgba(255, 159, 64, 0.6)',
              'rgba(255, 99, 132, 0.6)',
              'rgba(54, 162, 235, 0.6)',
              'rgba(255, 206, 86, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(153, 102, 255, 0.6)',
              'rgba(255, 159, 64, 0.6)'
            ]
          }
        ]
      };
      
      const upcomingMaturities = upcomingMaturitiesResult.rows[0];
      
      return {
        upcoming7Days: parseInt(upcomingMaturities.upcoming_7_days) || 0,
        upcoming30Days: parseInt(upcomingMaturities.upcoming_30_days) || 0,
        upcoming90Days: parseInt(upcomingMaturities.upcoming_90_days) || 0,
        upcomingMaturityAmount7Days: upcomingMaturities.upcoming_maturity_amount_7_days || '0',
        upcomingMaturityAmount30Days: upcomingMaturities.upcoming_maturity_amount_30_days || '0',
        upcomingMaturityAmount90Days: upcomingMaturities.upcoming_maturity_amount_90_days || '0',
        maturityDistribution
      };
    } catch (error) {
      logger.error('Error getting recurring deposit maturity forecast', { error });
      throw error;
    }
  }
  
  /**
   * Get installment compliance data
   * @returns Installment compliance metrics
   */
  async getInstallmentCompliance(): Promise<InstallmentCompliance> {
    try {
      // Get installment compliance statistics
      const complianceResult = await query(
        `SELECT 
          COUNT(*) as total_installments,
          COUNT(*) FILTER (WHERE completed = true) as completed_installments,
          COUNT(*) FILTER (WHERE completed = true AND total_paid_in_advance > 0) as on_time_installments,
          COUNT(*) FILTER (WHERE completed = true AND total_paid_late > 0) as late_installments,
          COUNT(*) FILTER (WHERE completed = false AND due_date < NOW()) as missed_installments,
          COALESCE(SUM(deposit_amount - COALESCE(deposit_amount_completed, 0)) 
                   FILTER (WHERE completed = false AND due_date < NOW()), 0) as total_overdue_amount
        FROM recurring_deposit_schedule_installment`
      );
      
      // Get monthly compliance trend
      const complianceTrendResult = await query(
        `SELECT 
          DATE_TRUNC('month', due_date) as month,
          COUNT(*) as total_installments,
          COUNT(*) FILTER (WHERE completed = true) as completed_installments,
          COUNT(*) FILTER (WHERE completed = true AND total_paid_in_advance > 0) as on_time_installments,
          COUNT(*) FILTER (WHERE completed = true AND total_paid_late > 0) as late_installments,
          COUNT(*) FILTER (WHERE completed = false AND due_date < NOW()) as missed_installments
        FROM recurring_deposit_schedule_installment
        WHERE due_date >= DATE_TRUNC('month', NOW() - INTERVAL '12 months')
        GROUP BY month
        ORDER BY month`
      );
      
      // Calculate percentages
      const compliance = complianceResult.rows[0];
      const totalInstallments = parseInt(compliance.total_installments) || 0;
      const completedInstallments = parseInt(compliance.completed_installments) || 0;
      const onTimeInstallments = parseInt(compliance.on_time_installments) || 0;
      const lateInstallments = parseInt(compliance.late_installments) || 0;
      const missedInstallments = parseInt(compliance.missed_installments) || 0;
      
      const onTimePercentage = totalInstallments > 0 
        ? (onTimeInstallments / totalInstallments) * 100 
        : 0;
      
      const latePercentage = totalInstallments > 0 
        ? (lateInstallments / totalInstallments) * 100 
        : 0;
      
      const missedPercentage = totalInstallments > 0 
        ? (missedInstallments / totalInstallments) * 100 
        : 0;
      
      const complianceRate = totalInstallments > 0 
        ? (completedInstallments / totalInstallments) * 100 
        : 0;
      
      // Format trend data for chart
      const complianceTrend: ChartData = {
        labels: complianceTrendResult.rows.map(row => {
          const date = new Date(row.month);
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        }),
        datasets: [
          {
            label: 'Compliance Rate (%)',
            data: complianceTrendResult.rows.map(row => {
              const total = parseInt(row.total_installments) || 0;
              const completed = parseInt(row.completed_installments) || 0;
              return total > 0 ? (completed / total) * 100 : 0;
            }),
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          },
          {
            label: 'On-Time Payment Rate (%)',
            data: complianceTrendResult.rows.map(row => {
              const total = parseInt(row.total_installments) || 0;
              const onTime = parseInt(row.on_time_installments) || 0;
              return total > 0 ? (onTime / total) * 100 : 0;
            }),
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }
        ]
      };
      
      return {
        onTimePercentage,
        latePercentage,
        missedPercentage,
        complianceRate,
        complianceTrend,
        overdueAccounts: missedInstallments,
        totalOverdueAmount: compliance.total_overdue_amount || '0'
      };
    } catch (error) {
      logger.error('Error getting recurring deposit installment compliance', { error });
      throw error;
    }
  }
}

// Export a singleton instance
export const recurringDepositMetricsService = new RecurringDepositMetricsService();