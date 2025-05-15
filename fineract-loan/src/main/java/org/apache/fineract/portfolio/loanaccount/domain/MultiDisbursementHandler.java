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
package org.apache.fineract.portfolio.loanaccount.domain;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

import org.apache.fineract.infrastructure.core.service.DateUtils;
import org.apache.fineract.portfolio.loanaccount.data.DisbursementData;
import org.apache.fineract.portfolio.loanproduct.domain.LoanProduct;
import org.springframework.stereotype.Component;

/**
 * A service for handling multi-disbursement loans.
 */
@Component
public class MultiDisbursementHandler {

    /**
     * Validates if the loan can be disbursed based on the product configuration and disbursement details.
     *
     * @param loan The loan to validate
     * @return true if the loan is eligible for disbursement, false otherwise
     */
    public boolean validateMultiDisbursementEligibility(Loan loan) {
        LoanProduct loanProduct = loan.getLoanProduct();
        
        // If the product doesn't allow multiple disbursements, only a single disbursement is allowed
        if (!loanProduct.isMultiDisburseLoan()) {
            return loan.getDisbursementDetails().stream()
                    .filter(detail -> detail.actualDisbursementDate() != null)
                    .count() == 0;
        }
        
        // If there are more disbursements than allowed by the product, reject
        if (loanProduct.getMaxTrancheCount() != null) {
            int maxTranchesAllowed = loanProduct.getMaxTrancheCount();
            int existingDisbursements = (int) loan.getDisbursementDetails().stream()
                    .filter(detail -> detail.actualDisbursementDate() != null)
                    .count();
            
            if (existingDisbursements >= maxTranchesAllowed) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Updates the principal amount of the loan based on the disbursed and outstanding tranches.
     *
     * @param loan The loan to update
     * @return The updated principal amount
     */
    public BigDecimal recalculateLoanPrincipal(Loan loan) {
        BigDecimal totalDisbursed = BigDecimal.ZERO;
        
        // Calculate the total amount already disbursed
        for (LoanDisbursementDetails disbursementDetail : loan.getDisbursementDetails()) {
            if (disbursementDetail.actualDisbursementDate() != null && !disbursementDetail.isReversed()) {
                totalDisbursed = totalDisbursed.add(disbursementDetail.principal());
            }
        }
        
        return totalDisbursed;
    }
    
    /**
     * Gets all planned disbursement dates for a loan.
     *
     * @param loan The loan
     * @return List of planned disbursement dates
     */
    public List<LocalDate> getPlannedDisbursementDates(Loan loan) {
        return loan.getDisbursementDetails().stream()
                .map(LoanDisbursementDetails::expectedDisbursementDate)
                .filter(date -> date != null)
                .sorted()
                .collect(Collectors.toList());
    }
    
    /**
     * Gets all actual disbursement dates for a loan.
     *
     * @param loan The loan
     * @return List of actual disbursement dates
     */
    public List<LocalDate> getActualDisbursementDates(Loan loan) {
        return loan.getDisbursementDetails().stream()
                .filter(detail -> detail.actualDisbursementDate() != null && !detail.isReversed())
                .map(LoanDisbursementDetails::actualDisbursementDate)
                .sorted()
                .collect(Collectors.toList());
    }
    
    /**
     * Creates a new disbursement detail for a loan.
     *
     * @param loan The loan
     * @param expectedDisbursementDate The expected disbursement date
     * @param principal The principal amount to disburse
     * @return The created disbursement detail
     */
    public LoanDisbursementDetails createDisbursementDetail(Loan loan, LocalDate expectedDisbursementDate, BigDecimal principal) {
        LoanDisbursementDetails disbursementDetails = new LoanDisbursementDetails(
                expectedDisbursementDate,
                null, // actual disbursement date will be set when disbursal happens
                principal,
                null, // net disbursement amount will be calculated at disbursal time
                false // not reversed
        );
        
        disbursementDetails.updateLoan(loan);
        return disbursementDetails;
    }
    
    /**
     * Processes a disbursement for a loan.
     *
     * @param loan The loan
     * @param actualDisbursementDate The actual disbursement date
     * @param disbursementAmount The amount to disburse
     * @param netDisbursalAmount The net disbursement amount after deducting charges
     * @return The processed disbursement detail
     */
    public LoanDisbursementDetails processDisbursement(Loan loan, LocalDate actualDisbursementDate, 
            BigDecimal disbursementAmount, BigDecimal netDisbursalAmount) {
        
        // Find the first undisbursed tranche
        LoanDisbursementDetails disbursementToProcess = loan.getDisbursementDetails().stream()
                .filter(detail -> detail.actualDisbursementDate() == null && !detail.isReversed())
                .findFirst()
                .orElse(null);
        
        // If there's no planned disbursement, create a new one
        if (disbursementToProcess == null) {
            disbursementToProcess = createDisbursementDetail(loan, actualDisbursementDate, disbursementAmount);
            loan.getDisbursementDetails().add(disbursementToProcess);
        }
        
        // Update the disbursement with actual values
        disbursementToProcess.updateActualDisbursementDate(actualDisbursementDate);
        disbursementToProcess.updatePrincipal(disbursementAmount);
        disbursementToProcess.setNetDisbursalAmount(netDisbursalAmount);
        
        return disbursementToProcess;
    }
    
    /**
     * Reverses a disbursement for a loan.
     *
     * @param loan The loan
     * @param disbursementId The ID of the disbursement to reverse
     * @return true if the disbursement was reversed, false otherwise
     */
    public boolean reverseDisbursement(Loan loan, Long disbursementId) {
        LoanDisbursementDetails disbursementToReverse = loan.getDisbursementDetails().stream()
                .filter(detail -> detail.getId().equals(disbursementId))
                .findFirst()
                .orElse(null);
        
        if (disbursementToReverse != null && disbursementToReverse.actualDisbursementDate() != null && !disbursementToReverse.isReversed()) {
            disbursementToReverse.reverse();
            return true;
        }
        
        return false;
    }
    
    /**
     * Converts internal LoanDisbursementDetails to DisbursementData for API responses.
     *
     * @param loan The loan
     * @return Collection of disbursement data
     */
    public Collection<DisbursementData> extractDisbursementData(Loan loan) {
        Collection<DisbursementData> disbursementData = new ArrayList<>();
        
        for (LoanDisbursementDetails disbursementDetail : loan.getDisbursementDetails()) {
            if (!disbursementDetail.isReversed()) {
                disbursementData.add(disbursementDetail.toData());
            }
        }
        
        return disbursementData;
    }
    
    /**
     * Checks if a loan has any undisbursed amounts.
     *
     * @param loan The loan
     * @return true if there are undisbursed amounts, false otherwise
     */
    public boolean hasUndisbursedAmount(Loan loan) {
        BigDecimal totalApproved = loan.getApprovedPrincipal();
        BigDecimal totalDisbursed = recalculateLoanPrincipal(loan);
        
        return totalApproved.compareTo(totalDisbursed) > 0;
    }
    
    /**
     * Gets the currently undisbursed amount for a loan.
     *
     * @param loan The loan
     * @return The undisbursed amount
     */
    public BigDecimal getUndisbursedAmount(Loan loan) {
        BigDecimal totalApproved = loan.getApprovedPrincipal();
        BigDecimal totalDisbursed = recalculateLoanPrincipal(loan);
        
        return totalApproved.subtract(totalDisbursed);
    }
    
    /**
     * Checks if the loan is fully disbursed.
     *
     * @param loan The loan
     * @return true if the loan is fully disbursed, false otherwise
     */
    public boolean isLoanFullyDisbursed(Loan loan) {
        return !hasUndisbursedAmount(loan);
    }
}