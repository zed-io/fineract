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
package org.apache.fineract.portfolio.loanaccount.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.organisation.monetary.domain.MonetaryCurrency;
import org.apache.fineract.portfolio.loanaccount.domain.Loan;
import org.apache.fineract.portfolio.loanaccount.domain.LoanDisbursementDetails;
import org.apache.fineract.portfolio.loanaccount.domain.LoanRepaymentScheduleInstallment;
import org.apache.fineract.portfolio.loanaccount.domain.MultiDisbursementHandler;
import org.apache.fineract.portfolio.loanaccount.loanschedule.data.LoanScheduleParams;
import org.apache.fineract.portfolio.loanaccount.loanschedule.domain.LoanScheduleGenerator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Service responsible for generating and managing loan repayment schedules for multi-disbursement loans.
 */
@Service
public class MultiDisbursementScheduleGenerationService {

    private final MultiDisbursementHandler multidisburseHandler;
    private final LoanScheduleGenerator loanScheduleGenerator;
    
    @Autowired
    public MultiDisbursementScheduleGenerationService(MultiDisbursementHandler multidisburseHandler, 
            LoanScheduleGenerator loanScheduleGenerator) {
        this.multidisburseHandler = multidisburseHandler;
        this.loanScheduleGenerator = loanScheduleGenerator;
    }
    
    /**
     * Generates a new repayment schedule for a loan with multiple disbursements.
     * 
     * @param loan The loan for which to generate the schedule
     * @param scheduleParams The parameters for the schedule generation
     * @param recalculateSchedule Whether to recalculate the entire schedule or just append new disbursements
     * @return List of repayment schedule installments
     */
    public List<LoanRepaymentScheduleInstallment> generateSchedule(Loan loan, LoanScheduleParams scheduleParams, 
            boolean recalculateSchedule) {
        
        // If the loan doesn't use multi-disbursements, delegate to the standard schedule generator
        if (!loan.getLoanProduct().isMultiDisburseLoan()) {
            return loanScheduleGenerator.generate(scheduleParams, loan.getApprovedPrincipal(), 
                    loan.getExpectedDisbursementDate(), loan.getLoanTermFrequency(), loan.getLoanTermPeriodFrequencyType());
        }
        
        List<LoanRepaymentScheduleInstallment> installments = new ArrayList<>();
        
        if (recalculateSchedule) {
            // Clear existing installments if we're recalculating the entire schedule
            loan.getRepaymentScheduleInstallments().clear();
            
            // Get all disbursement details for this loan
            List<LoanDisbursementDetails> disbursementDetails = new ArrayList<>(loan.getDisbursementDetails());
            
            // Sort disbursements by date
            disbursementDetails.sort((d1, d2) -> {
                LocalDate date1 = d1.actualDisbursementDate() != null ? d1.actualDisbursementDate() : d1.expectedDisbursementDate();
                LocalDate date2 = d2.actualDisbursementDate() != null ? d2.actualDisbursementDate() : d2.expectedDisbursementDate();
                return date1.compareTo(date2);
            });
            
            MonetaryCurrency currency = loan.getCurrency();
            LocalDate startDate = disbursementDetails.isEmpty() ? loan.getExpectedDisbursementDate() : 
                    disbursementDetails.get(0).expectedDisbursementDate();
            
            // Generate schedule considering all disbursements
            for (int i = 0; i < disbursementDetails.size(); i++) {
                LoanDisbursementDetails disbursementDetail = disbursementDetails.get(i);
                
                // Skip reversed disbursements
                if (disbursementDetail.isReversed()) {
                    continue;
                }
                
                // Use actual disbursement date if available, otherwise use expected date
                LocalDate disbursementDate = disbursementDetail.actualDisbursementDate() != null ? 
                        disbursementDetail.actualDisbursementDate() : disbursementDetail.expectedDisbursementDate();
                
                BigDecimal amount = disbursementDetail.principal();
                
                // For the first disbursement, create a new schedule
                if (i == 0) {
                    installments = loanScheduleGenerator.generate(scheduleParams, amount, disbursementDate, 
                            loan.getLoanTermFrequency(), loan.getLoanTermPeriodFrequencyType());
                } else {
                    // For subsequent disbursements, adjust the schedule
                    adjustScheduleForAdditionalDisbursement(installments, disbursementDate, amount, currency, 
                            loan.getLoanTermFrequency(), loan.getLoanTermPeriodFrequencyType());
                }
            }
            
            // Add installments to the loan
            int installmentNumber = 1;
            for (LoanRepaymentScheduleInstallment installment : installments) {
                installment.updateInstallmentNumber(installmentNumber++);
                loan.addRepaymentScheduleInstallment(installment);
            }
        } else {
            // Just get the existing installments
            installments = new ArrayList<>(loan.getRepaymentScheduleInstallments());
        }
        
        return installments;
    }
    
    /**
     * Adjusts an existing schedule to accommodate an additional disbursement.
     * 
     * @param installments The existing installments
     * @param disbursementDate The date of the new disbursement
     * @param amount The amount of the new disbursement
     * @param currency The loan currency
     * @param loanTermFrequency The loan term frequency
     * @param loanTermPeriodFrequencyType The loan term frequency type
     */
    private void adjustScheduleForAdditionalDisbursement(List<LoanRepaymentScheduleInstallment> installments, 
            LocalDate disbursementDate, BigDecimal amount, MonetaryCurrency currency, 
            Integer loanTermFrequency, Integer loanTermPeriodFrequencyType) {
        
        // Find the installment that contains this disbursement date
        LoanRepaymentScheduleInstallment targetInstallment = null;
        
        for (LoanRepaymentScheduleInstallment installment : installments) {
            if (!disbursementDate.isBefore(installment.getFromDate()) && 
                !disbursementDate.isAfter(installment.getDueDate())) {
                targetInstallment = installment;
                break;
            }
        }
        
        // If we found a target installment, adjust it and all following installments
        if (targetInstallment != null) {
            int targetIndex = installments.indexOf(targetInstallment);
            
            // Calculate how to distribute the new amount across remaining installments
            int remainingInstallments = installments.size() - targetIndex;
            BigDecimal amountPerInstallment = amount.divide(BigDecimal.valueOf(remainingInstallments), 
                    currency.getDigitsAfterDecimal(), BigDecimal.ROUND_HALF_EVEN);
            
            // Adjust principal for each installment, starting with the target
            for (int i = targetIndex; i < installments.size(); i++) {
                LoanRepaymentScheduleInstallment currentInstallment = installments.get(i);
                
                // Add the additional principal to this installment
                BigDecimal newPrincipal = currentInstallment.getPrincipal(currency).plus(amountPerInstallment).getAmount();
                BigDecimal newOutstanding = currentInstallment.getPrincipalOutstanding(currency).plus(amountPerInstallment).getAmount();
                
                // Update the installment with the new amounts
                currentInstallment.updatePrincipal(newPrincipal);
                currentInstallment.updateOutstandingLoanPrincipal(newOutstanding);
            }
        }
    }
    
    /**
     * Recalculates the loan schedule after a disbursement.
     * 
     * @param loan The loan to recalculate
     * @param disbursementDate The date of the disbursement
     * @param disbursementAmount The amount of the disbursement
     */
    public void recalculateScheduleAfterDisbursement(Loan loan, LocalDate disbursementDate, BigDecimal disbursementAmount) {
        // Update loan to reflect this disbursement
        loan.setDisbursedAmount(multidisburseHandler.recalculateLoanPrincipal(loan));
        
        // Check if we need to regenerate the schedule
        boolean regenerateSchedule = loan.getLoanProduct().isMultiDisburseLoan() && 
                loan.getLoanProduct().isRecalculateScheduleOnDisbursement();
                
        if (regenerateSchedule) {
            // Create schedule parameters
            LoanScheduleParams scheduleParams = LoanScheduleParams.builder()
                    .loanTermFrequency(loan.getLoanTermFrequency())
                    .repaymentEvery(loan.getRepaymentEvery())
                    .repaymentPeriodFrequencyType(loan.getRepaymentPeriodFrequencyType())
                    .interestRatePerPeriod(loan.getInterestRatePerPeriod())
                    .interestRatePeriodFrequencyType(loan.getInterestRatePeriodFrequencyType())
                    .numberOfRepayments(loan.getNumberOfRepayments())
                    .amortizationType(loan.getAmortizationType())
                    .interestType(loan.getInterestType())
                    .interestCalculationPeriodType(loan.getInterestCalculationPeriodType())
                    .expectedDisbursementDate(loan.getExpectedDisbursementDate())
                    .daysInMonthType(loan.getLoanProduct().getDaysInMonthType())
                    .daysInYearType(loan.getLoanProduct().getDaysInYearType())
                    .build();
            
            // Generate new schedule
            generateSchedule(loan, scheduleParams, true);
        }
    }
}