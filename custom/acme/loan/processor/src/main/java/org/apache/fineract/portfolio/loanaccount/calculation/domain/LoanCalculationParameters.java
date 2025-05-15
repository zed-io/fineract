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
import java.util.Set;
import org.apache.fineract.organisation.monetary.domain.Money;
import org.apache.fineract.portfolio.common.domain.DaysInMonthType;
import org.apache.fineract.portfolio.common.domain.DaysInYearType;
import org.apache.fineract.portfolio.common.domain.PeriodFrequencyType;
import org.apache.fineract.portfolio.loanaccount.data.HolidayDetailDTO;
import org.apache.fineract.portfolio.loanaccount.domain.LoanCharge;
import org.apache.fineract.portfolio.loanproduct.domain.AmortizationMethod;
import org.apache.fineract.portfolio.loanproduct.domain.InterestCalculationPeriodMethod;
import org.apache.fineract.portfolio.loanproduct.domain.InterestMethod;

/**
 * Parameters needed for loan schedule calculation
 */
public class LoanCalculationParameters {
    
    private final Money principal;
    private final BigDecimal annualNominalInterestRate;
    private final Integer numberOfRepayments;
    private final Integer repaymentEvery;
    private final PeriodFrequencyType repaymentPeriodFrequencyType;
    private final InterestMethod interestMethod;
    private final AmortizationMethod amortizationMethod;
    private final InterestCalculationPeriodMethod interestCalculationPeriodMethod;
    private final LocalDate expectedDisbursementDate;
    private final LocalDate repaymentsStartingFromDate;
    private final BigDecimal fixedEmiAmount;
    private final Integer principalGrace;
    private final Integer interestPaymentGrace;
    private final Integer interestChargingGrace;
    private final LocalDate interestChargedFromDate;
    private final DaysInMonthType daysInMonthType;
    private final DaysInYearType daysInYearType;
    private final Set<LoanCharge> loanCharges;
    private final HolidayDetailDTO holidayDetailDTO;
    private final boolean multiDisburseLoan;
    private final boolean allowPartialPeriodInterestCalculation;
    private final boolean isFirstRepaymentDateAllowedOnHoliday;
    private final boolean isInterestToBeRecoveredFirstWhenGreaterThanEMI;

    /**
     * Constructor for the loan calculation parameters
     */
    public LoanCalculationParameters(Money principal, BigDecimal annualNominalInterestRate,
            Integer numberOfRepayments, Integer repaymentEvery, PeriodFrequencyType repaymentPeriodFrequencyType,
            InterestMethod interestMethod, AmortizationMethod amortizationMethod,
            InterestCalculationPeriodMethod interestCalculationPeriodMethod, LocalDate expectedDisbursementDate,
            LocalDate repaymentsStartingFromDate, BigDecimal fixedEmiAmount, Integer principalGrace,
            Integer interestPaymentGrace, Integer interestChargingGrace, LocalDate interestChargedFromDate,
            DaysInMonthType daysInMonthType, DaysInYearType daysInYearType, Set<LoanCharge> loanCharges,
            HolidayDetailDTO holidayDetailDTO, boolean multiDisburseLoan,
            boolean allowPartialPeriodInterestCalculation, boolean isFirstRepaymentDateAllowedOnHoliday,
            boolean isInterestToBeRecoveredFirstWhenGreaterThanEMI) {
        this.principal = principal;
        this.annualNominalInterestRate = annualNominalInterestRate;
        this.numberOfRepayments = numberOfRepayments;
        this.repaymentEvery = repaymentEvery;
        this.repaymentPeriodFrequencyType = repaymentPeriodFrequencyType;
        this.interestMethod = interestMethod;
        this.amortizationMethod = amortizationMethod;
        this.interestCalculationPeriodMethod = interestCalculationPeriodMethod;
        this.expectedDisbursementDate = expectedDisbursementDate;
        this.repaymentsStartingFromDate = repaymentsStartingFromDate;
        this.fixedEmiAmount = fixedEmiAmount;
        this.principalGrace = principalGrace;
        this.interestPaymentGrace = interestPaymentGrace;
        this.interestChargingGrace = interestChargingGrace;
        this.interestChargedFromDate = interestChargedFromDate;
        this.daysInMonthType = daysInMonthType;
        this.daysInYearType = daysInYearType;
        this.loanCharges = loanCharges;
        this.holidayDetailDTO = holidayDetailDTO;
        this.multiDisburseLoan = multiDisburseLoan;
        this.allowPartialPeriodInterestCalculation = allowPartialPeriodInterestCalculation;
        this.isFirstRepaymentDateAllowedOnHoliday = isFirstRepaymentDateAllowedOnHoliday;
        this.isInterestToBeRecoveredFirstWhenGreaterThanEMI = isInterestToBeRecoveredFirstWhenGreaterThanEMI;
    }

    public Money getPrincipal() {
        return principal;
    }

    public BigDecimal getAnnualNominalInterestRate() {
        return annualNominalInterestRate;
    }

    public Integer getNumberOfRepayments() {
        return numberOfRepayments;
    }

    public Integer getRepaymentEvery() {
        return repaymentEvery;
    }

    public PeriodFrequencyType getRepaymentPeriodFrequencyType() {
        return repaymentPeriodFrequencyType;
    }

    public InterestMethod getInterestMethod() {
        return interestMethod;
    }

    public AmortizationMethod getAmortizationMethod() {
        return amortizationMethod;
    }

    public InterestCalculationPeriodMethod getInterestCalculationPeriodMethod() {
        return interestCalculationPeriodMethod;
    }

    public LocalDate getExpectedDisbursementDate() {
        return expectedDisbursementDate;
    }

    public LocalDate getRepaymentsStartingFromDate() {
        return repaymentsStartingFromDate;
    }

    public BigDecimal getFixedEmiAmount() {
        return fixedEmiAmount;
    }

    public Integer getPrincipalGrace() {
        return principalGrace;
    }

    public Integer getInterestPaymentGrace() {
        return interestPaymentGrace;
    }

    public Integer getInterestChargingGrace() {
        return interestChargingGrace;
    }

    public LocalDate getInterestChargedFromDate() {
        return interestChargedFromDate;
    }

    public DaysInMonthType getDaysInMonthType() {
        return daysInMonthType;
    }

    public DaysInYearType getDaysInYearType() {
        return daysInYearType;
    }

    public Set<LoanCharge> getLoanCharges() {
        return loanCharges;
    }

    public HolidayDetailDTO getHolidayDetailDTO() {
        return holidayDetailDTO;
    }

    public boolean isMultiDisburseLoan() {
        return multiDisburseLoan;
    }

    public boolean isAllowPartialPeriodInterestCalculation() {
        return allowPartialPeriodInterestCalculation;
    }

    public boolean isFirstRepaymentDateAllowedOnHoliday() {
        return isFirstRepaymentDateAllowedOnHoliday;
    }

    public boolean isInterestToBeRecoveredFirstWhenGreaterThanEMI() {
        return isInterestToBeRecoveredFirstWhenGreaterThanEMI;
    }
    
    /**
     * Builder for loan calculation parameters
     */
    public static class Builder {
        private Money principal;
        private BigDecimal annualNominalInterestRate;
        private Integer numberOfRepayments;
        private Integer repaymentEvery;
        private PeriodFrequencyType repaymentPeriodFrequencyType;
        private InterestMethod interestMethod;
        private AmortizationMethod amortizationMethod;
        private InterestCalculationPeriodMethod interestCalculationPeriodMethod;
        private LocalDate expectedDisbursementDate;
        private LocalDate repaymentsStartingFromDate;
        private BigDecimal fixedEmiAmount;
        private Integer principalGrace;
        private Integer interestPaymentGrace;
        private Integer interestChargingGrace;
        private LocalDate interestChargedFromDate;
        private DaysInMonthType daysInMonthType;
        private DaysInYearType daysInYearType;
        private Set<LoanCharge> loanCharges;
        private HolidayDetailDTO holidayDetailDTO;
        private boolean multiDisburseLoan;
        private boolean allowPartialPeriodInterestCalculation;
        private boolean isFirstRepaymentDateAllowedOnHoliday;
        private boolean isInterestToBeRecoveredFirstWhenGreaterThanEMI;
        
        public Builder() {
            // Default values
            this.principalGrace = 0;
            this.interestPaymentGrace = 0;
            this.interestChargingGrace = 0;
            this.multiDisburseLoan = false;
            this.allowPartialPeriodInterestCalculation = false;
            this.isFirstRepaymentDateAllowedOnHoliday = false;
            this.isInterestToBeRecoveredFirstWhenGreaterThanEMI = false;
        }
        
        public Builder withPrincipal(Money principal) {
            this.principal = principal;
            return this;
        }
        
        public Builder withAnnualNominalInterestRate(BigDecimal annualNominalInterestRate) {
            this.annualNominalInterestRate = annualNominalInterestRate;
            return this;
        }
        
        public Builder withNumberOfRepayments(Integer numberOfRepayments) {
            this.numberOfRepayments = numberOfRepayments;
            return this;
        }
        
        public Builder withRepaymentEvery(Integer repaymentEvery) {
            this.repaymentEvery = repaymentEvery;
            return this;
        }
        
        public Builder withRepaymentPeriodFrequencyType(PeriodFrequencyType repaymentPeriodFrequencyType) {
            this.repaymentPeriodFrequencyType = repaymentPeriodFrequencyType;
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
        
        public Builder withInterestCalculationPeriodMethod(InterestCalculationPeriodMethod interestCalculationPeriodMethod) {
            this.interestCalculationPeriodMethod = interestCalculationPeriodMethod;
            return this;
        }
        
        public Builder withExpectedDisbursementDate(LocalDate expectedDisbursementDate) {
            this.expectedDisbursementDate = expectedDisbursementDate;
            return this;
        }
        
        public Builder withRepaymentsStartingFromDate(LocalDate repaymentsStartingFromDate) {
            this.repaymentsStartingFromDate = repaymentsStartingFromDate;
            return this;
        }
        
        public Builder withFixedEmiAmount(BigDecimal fixedEmiAmount) {
            this.fixedEmiAmount = fixedEmiAmount;
            return this;
        }
        
        public Builder withPrincipalGrace(Integer principalGrace) {
            this.principalGrace = principalGrace;
            return this;
        }
        
        public Builder withInterestPaymentGrace(Integer interestPaymentGrace) {
            this.interestPaymentGrace = interestPaymentGrace;
            return this;
        }
        
        public Builder withInterestChargingGrace(Integer interestChargingGrace) {
            this.interestChargingGrace = interestChargingGrace;
            return this;
        }
        
        public Builder withInterestChargedFromDate(LocalDate interestChargedFromDate) {
            this.interestChargedFromDate = interestChargedFromDate;
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
        
        public Builder withLoanCharges(Set<LoanCharge> loanCharges) {
            this.loanCharges = loanCharges;
            return this;
        }
        
        public Builder withHolidayDetailDTO(HolidayDetailDTO holidayDetailDTO) {
            this.holidayDetailDTO = holidayDetailDTO;
            return this;
        }
        
        public Builder withMultiDisburseLoan(boolean multiDisburseLoan) {
            this.multiDisburseLoan = multiDisburseLoan;
            return this;
        }
        
        public Builder withAllowPartialPeriodInterestCalculation(boolean allowPartialPeriodInterestCalculation) {
            this.allowPartialPeriodInterestCalculation = allowPartialPeriodInterestCalculation;
            return this;
        }
        
        public Builder withFirstRepaymentDateAllowedOnHoliday(boolean isFirstRepaymentDateAllowedOnHoliday) {
            this.isFirstRepaymentDateAllowedOnHoliday = isFirstRepaymentDateAllowedOnHoliday;
            return this;
        }
        
        public Builder withInterestToBeRecoveredFirstWhenGreaterThanEMI(boolean isInterestToBeRecoveredFirstWhenGreaterThanEMI) {
            this.isInterestToBeRecoveredFirstWhenGreaterThanEMI = isInterestToBeRecoveredFirstWhenGreaterThanEMI;
            return this;
        }
        
        public LoanCalculationParameters build() {
            return new LoanCalculationParameters(
                    principal, annualNominalInterestRate, numberOfRepayments, repaymentEvery,
                    repaymentPeriodFrequencyType, interestMethod, amortizationMethod,
                    interestCalculationPeriodMethod, expectedDisbursementDate, repaymentsStartingFromDate,
                    fixedEmiAmount, principalGrace, interestPaymentGrace, interestChargingGrace,
                    interestChargedFromDate, daysInMonthType, daysInYearType, loanCharges, holidayDetailDTO,
                    multiDisburseLoan, allowPartialPeriodInterestCalculation,
                    isFirstRepaymentDateAllowedOnHoliday, isInterestToBeRecoveredFirstWhenGreaterThanEMI);
        }
    }
}