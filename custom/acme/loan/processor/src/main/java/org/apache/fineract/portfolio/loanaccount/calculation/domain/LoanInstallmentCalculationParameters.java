/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
package org.apache.fineract.portfolio.loanaccount.calculation.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.common.domain.DaysInMonthType;
import org.apache.fineract.portfolio.common.domain.DaysInYearType;
import org.apache.fineract.portfolio.loanproduct.domain.AmortizationMethod;
import org.apache.fineract.portfolio.loanproduct.domain.InterestMethod;

/**
 * Parameters needed for a single installment calculation
 */
public class LoanInstallmentCalculationParameters {
    
    private final Money outstandingBalance;
    private final BigDecimal annualNominalInterestRate;
    private final int periodNumber;
    private final int totalNumberOfPeriods;
    private final LocalDate periodStartDate;
    private final LocalDate periodEndDate;
    private final DaysInMonthType daysInMonthType;
    private final DaysInYearType daysInYearType;
    private final InterestMethod interestMethod;
    private final AmortizationMethod amortizationMethod; 
    private final BigDecimal fixedEmiAmount;
    private final boolean interestGrace;
    private final boolean principalGrace;
    private final boolean lastInstallment;

    /**
     * Constructor for the installment calculation parameters
     */
    public LoanInstallmentCalculationParameters(Money outstandingBalance, BigDecimal annualNominalInterestRate,
            int periodNumber, int totalNumberOfPeriods, LocalDate periodStartDate, LocalDate periodEndDate,
            DaysInMonthType daysInMonthType, DaysInYearType daysInYearType, InterestMethod interestMethod,
            AmortizationMethod amortizationMethod, BigDecimal fixedEmiAmount, boolean interestGrace,
            boolean principalGrace, boolean lastInstallment) {
        this.outstandingBalance = outstandingBalance;
        this.annualNominalInterestRate = annualNominalInterestRate;
        this.periodNumber = periodNumber;
        this.totalNumberOfPeriods = totalNumberOfPeriods;
        this.periodStartDate = periodStartDate;
        this.periodEndDate = periodEndDate;
        this.daysInMonthType = daysInMonthType;
        this.daysInYearType = daysInYearType;
        this.interestMethod = interestMethod;
        this.amortizationMethod = amortizationMethod;
        this.fixedEmiAmount = fixedEmiAmount;
        this.interestGrace = interestGrace;
        this.principalGrace = principalGrace;
        this.lastInstallment = lastInstallment;
    }

    public Money getOutstandingBalance() {
        return outstandingBalance;
    }

    public BigDecimal getAnnualNominalInterestRate() {
        return annualNominalInterestRate;
    }

    public int getPeriodNumber() {
        return periodNumber;
    }

    public int getTotalNumberOfPeriods() {
        return totalNumberOfPeriods;
    }

    public LocalDate getPeriodStartDate() {
        return periodStartDate;
    }

    public LocalDate getPeriodEndDate() {
        return periodEndDate;
    }

    public DaysInMonthType getDaysInMonthType() {
        return daysInMonthType;
    }

    public DaysInYearType getDaysInYearType() {
        return daysInYearType;
    }

    public InterestMethod getInterestMethod() {
        return interestMethod;
    }

    public AmortizationMethod getAmortizationMethod() {
        return amortizationMethod;
    }

    public BigDecimal getFixedEmiAmount() {
        return fixedEmiAmount;
    }

    public boolean isInterestGrace() {
        return interestGrace;
    }

    public boolean isPrincipalGrace() {
        return principalGrace;
    }

    public boolean isLastInstallment() {
        return lastInstallment;
    }
    
    /**
     * Builder for installment calculation parameters
     */
    public static class Builder {
        private Money outstandingBalance;
        private BigDecimal annualNominalInterestRate;
        private int periodNumber;
        private int totalNumberOfPeriods;
        private LocalDate periodStartDate;
        private LocalDate periodEndDate;
        private DaysInMonthType daysInMonthType;
        private DaysInYearType daysInYearType;
        private InterestMethod interestMethod;
        private AmortizationMethod amortizationMethod;
        private BigDecimal fixedEmiAmount;
        private boolean interestGrace;
        private boolean principalGrace;
        private boolean lastInstallment;
        
        public Builder() {
            // Default values
            this.interestGrace = false;
            this.principalGrace = false;
            this.lastInstallment = false;
        }
        
        public Builder withOutstandingBalance(Money outstandingBalance) {
            this.outstandingBalance = outstandingBalance;
            return this;
        }
        
        public Builder withAnnualNominalInterestRate(BigDecimal annualNominalInterestRate) {
            this.annualNominalInterestRate = annualNominalInterestRate;
            return this;
        }
        
        public Builder withPeriodNumber(int periodNumber) {
            this.periodNumber = periodNumber;
            return this;
        }
        
        public Builder withTotalNumberOfPeriods(int totalNumberOfPeriods) {
            this.totalNumberOfPeriods = totalNumberOfPeriods;
            return this;
        }
        
        public Builder withPeriodStartDate(LocalDate periodStartDate) {
            this.periodStartDate = periodStartDate;
            return this;
        }
        
        public Builder withPeriodEndDate(LocalDate periodEndDate) {
            this.periodEndDate = periodEndDate;
            return this;
        }
        
        public Builder withDaysInMonthType(DaysInMonthType daysInMonthType) {
            this.daysInMonthType = daysInMonthType;
            return this;
        }
        
        public Builder withDaysInYearType(DaysInYearType daysInYearType) {
            this.daysInYearType = daysInYearType;
            return this;
        }
        
        public Builder withInterestMethod(InterestMethod interestMethod) {
            this.interestMethod = interestMethod;
            return this;
        }
        
        public Builder withAmortizationMethod(AmortizationMethod amortizationMethod) {
            this.amortizationMethod = amortizationMethod;
            return this;
        }
        
        public Builder withFixedEmiAmount(BigDecimal fixedEmiAmount) {
            this.fixedEmiAmount = fixedEmiAmount;
            return this;
        }
        
        public Builder withInterestGrace(boolean interestGrace) {
            this.interestGrace = interestGrace;
            return this;
        }
        
        public Builder withPrincipalGrace(boolean principalGrace) {
            this.principalGrace = principalGrace;
            return this;
        }
        
        public Builder withLastInstallment(boolean lastInstallment) {
            this.lastInstallment = lastInstallment;
            return this;
        }
        
        public LoanInstallmentCalculationParameters build() {
            return new LoanInstallmentCalculationParameters(
                    outstandingBalance, annualNominalInterestRate, periodNumber,
                    totalNumberOfPeriods, periodStartDate, periodEndDate, daysInMonthType,
                    daysInYearType, interestMethod, amortizationMethod, fixedEmiAmount,
                    interestGrace, principalGrace, lastInstallment);
        }
    }
}