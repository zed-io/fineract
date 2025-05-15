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
package org.apache.fineract.integrationtests;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;

import org.apache.fineract.client.models.GetLoanProductsProductIdResponse;
import org.apache.fineract.client.models.GetLoansLoanIdRepaymentPeriod;
import org.apache.fineract.client.models.GetLoansLoanIdResponse;
import org.apache.fineract.client.models.GetLoansLoanIdTransactions;
import org.apache.fineract.client.models.GetLoansLoanIdTransactionsTemplateResponse;
import org.apache.fineract.client.models.PostLoanProductsRequest;
import org.apache.fineract.client.models.PostLoansLoanIdChargesResponse;
import org.apache.fineract.client.models.PostLoansLoanIdResponse;
import org.apache.fineract.client.models.PostLoansLoanIdTransactionsResponse;
import org.apache.fineract.client.models.PostLoansRequest;
import org.apache.fineract.client.models.PostLoansResponse;
import org.apache.fineract.client.models.PutGlobalConfigurationsRequest;
import org.apache.fineract.infrastructure.businessdate.domain.BusinessDateType;
import org.apache.fineract.infrastructure.configuration.api.GlobalConfigurationConstants;
import org.apache.fineract.integrationtests.common.BusinessDateHelper;
import org.apache.fineract.integrationtests.common.ClientHelper;
import org.apache.fineract.integrationtests.common.GlobalConfigurationHelper;
import org.apache.fineract.integrationtests.common.TaxGroupHelper;
import org.apache.fineract.integrationtests.common.TaxHelper;
import org.apache.fineract.integrationtests.common.Utils;
import org.apache.fineract.integrationtests.common.charges.ChargesHelper;
import org.apache.fineract.integrationtests.common.funds.FundsHelper;
import org.apache.fineract.integrationtests.common.funds.FundsResourceHandler;
import org.apache.fineract.integrationtests.common.loans.LoanApplicationTestBuilder;
import org.apache.fineract.integrationtests.common.loans.LoanProductTestBuilder;
import org.apache.fineract.integrationtests.common.loans.LoanStatusChecker;
import org.apache.fineract.integrationtests.common.loans.LoanTransactionHelper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Integration tests for detailed financial calculations in loan products.
 * This class focuses on verifying correctness of:
 * 1. Loan interest calculation with different methods (declining balance, flat)
 * 2. Early loan repayment and prepayment scenarios 
 * 3. Penalty and fee calculation
 * 4. Multi-currency operations
 * 5. Tax withholding on interest
 */
public class FinancialCalculationIntegrationTest extends BaseLoanIntegrationTest {

    private static final Logger LOG = LoggerFactory.getLogger(FinancialCalculationIntegrationTest.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern(DATETIME_PATTERN);
    
    private ClientHelper clientHelper;
    private GlobalConfigurationHelper globalConfigurationHelper;
    
    @BeforeEach
    public void setup() {
        this.clientHelper = new ClientHelper(this.requestSpec, this.responseSpec);
        this.globalConfigurationHelper = new GlobalConfigurationHelper();
    }
    
    @Test
    @DisplayName("Test interest calculation methods (declining balance vs flat interest)")
    public void testDifferentInterestCalculationMethods() {
        try {
            // Set business date
            final LocalDate currentDate = LocalDate.of(2023, 1, 1);
            final String currentDateString = currentDate.format(DATE_FORMATTER);
            
            globalConfigurationHelper.updateGlobalConfiguration(GlobalConfigurationConstants.ENABLE_BUSINESS_DATE,
                    new PutGlobalConfigurationsRequest().enabled(true));
            BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, currentDate);
            
            // Create client
            Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
            LOG.info("Created client with ID {}", clientId);
            
            // Principal: 10000
            // Interest: 24% per year (2% per month)
            // Term: 12 months
            // Expected Declining Balance: Each payment consists of principal + interest on remaining balance
            // Expected Flat: Each payment consists of principal + interest calculated on original balance
            
            // Test 1: Create Declining Balance Interest Loan Product
            GetLoanProductsProductIdResponse decliningLoanProduct = createLoanProduct("Declining Balance Loan", 
                    InterestType.DECLINING_BALANCE, 24.0, false);
            LOG.info("Created declining balance loan product with ID {}", decliningLoanProduct.getId());
            
            // Test 2: Create Flat Interest Loan Product
            GetLoanProductsProductIdResponse flatLoanProduct = createLoanProduct("Flat Interest Loan", 
                    InterestType.FLAT, 24.0, false);
            LOG.info("Created flat interest loan product with ID {}", flatLoanProduct.getId());
            
            // Create and disburse declining balance loan
            Long decliningLoanId = createAndDisburseLoan(clientId, decliningLoanProduct.getId(), 
                    currentDateString, 10000.0, 12);
            LOG.info("Created and disbursed declining balance loan with ID {}", decliningLoanId);
            
            // Create and disburse flat interest loan
            Long flatLoanId = createAndDisburseLoan(clientId, flatLoanProduct.getId(), 
                    currentDateString, 10000.0, 12);
            LOG.info("Created and disbursed flat interest loan with ID {}", flatLoanId);
            
            // Retrieve and verify loan details for both loans
            GetLoansLoanIdResponse decliningLoanDetails = loanTransactionHelper.getLoanDetails(decliningLoanId);
            GetLoansLoanIdResponse flatLoanDetails = loanTransactionHelper.getLoanDetails(flatLoanId);
            
            // Verify total amount repayable (principal + total interest)
            Double decliningInterest = decliningLoanDetails.getSummary().getTotalInterestCharged();
            Double flatInterest = flatLoanDetails.getSummary().getTotalInterestCharged();
            
            // Verify that flat interest is more than declining balance interest
            LOG.info("Declining Balance Total Interest: {}", decliningInterest);
            LOG.info("Flat Interest Total Interest: {}", flatInterest);
            assertTrue(flatInterest > decliningInterest, 
                    "Flat interest should be higher than declining balance interest");
            
            // Verify first and last installment details for both methods
            GetLoansLoanIdRepaymentPeriod firstDecliningPeriod = decliningLoanDetails.getRepaymentSchedule().getPeriods().get(1);
            GetLoansLoanIdRepaymentPeriod firstFlatPeriod = flatLoanDetails.getRepaymentSchedule().getPeriods().get(1);
            
            GetLoansLoanIdRepaymentPeriod lastDecliningPeriod = decliningLoanDetails.getRepaymentSchedule().getPeriods().get(12);
            GetLoansLoanIdRepaymentPeriod lastFlatPeriod = flatLoanDetails.getRepaymentSchedule().getPeriods().get(12);
            
            // Interest in first period should be equal in both methods
            assertEquals(200.0, firstDecliningPeriod.getInterestDue(), 0.1, 
                    "First period interest in declining balance should be 2% of 10000");
            assertEquals(200.0, firstFlatPeriod.getInterestDue(), 0.1, 
                    "First period interest in flat rate should be 2% of 10000");
            
            // Interest in last period should be different
            assertTrue(lastDecliningPeriod.getInterestDue() < 40.0, 
                    "Last period interest in declining balance should be small");
            assertEquals(200.0, lastFlatPeriod.getInterestDue(), 0.1, 
                    "Last period interest in flat rate should still be 2% of 10000");
            
        } finally {
            globalConfigurationHelper.updateGlobalConfiguration(GlobalConfigurationConstants.ENABLE_BUSINESS_DATE,
                    new PutGlobalConfigurationsRequest().enabled(false));
        }
    }

    @Test
    @DisplayName("Test early loan repayment and prepayment scenarios")
    public void testEarlyLoanRepaymentAndPrepayment() {
        try {
            // Set business date
            final LocalDate currentDate = LocalDate.of(2023, 1, 1);
            final String currentDateString = currentDate.format(DATE_FORMATTER);
            
            globalConfigurationHelper.updateGlobalConfiguration(GlobalConfigurationConstants.ENABLE_BUSINESS_DATE,
                    new PutGlobalConfigurationsRequest().enabled(true));
            BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, currentDate);
            
            // Create client
            Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
            LOG.info("Created client with ID {}", clientId);
            
            // Create loan product with declining balance interest
            GetLoanProductsProductIdResponse loanProduct = createLoanProduct("Early Repayment Test Loan", 
                    InterestType.DECLINING_BALANCE, 12.0, true);
            LOG.info("Created loan product with ID {}", loanProduct.getId());
            
            // Create and disburse loan
            // Principal: 10000
            // Interest: 12% per year (1% per month)
            // Term: 12 months
            Long loanId = createAndDisburseLoan(clientId, loanProduct.getId(), 
                    currentDateString, 10000.0, 12);
            LOG.info("Created and disbursed loan with ID {}", loanId);
            
            // Advance to second month
            LocalDate secondMonthDate = currentDate.plusMonths(1);
            BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, secondMonthDate);
            
            // Make first regular payment
            Double firstInstallmentAmount = 888.49; // Principal + Interest for first month
            PostLoansLoanIdTransactionsResponse firstPaymentResponse = loanTransactionHelper.makeLoanRepayment(
                    loanId, secondMonthDate.format(DATE_FORMATTER), firstInstallmentAmount);
            assertNotNull(firstPaymentResponse);
            LOG.info("Made first regular payment of {}", firstInstallmentAmount);
            
            // Advance to third month
            LocalDate thirdMonthDate = secondMonthDate.plusMonths(1);
            BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, thirdMonthDate);
            
            // Get loan details after first payment
            GetLoansLoanIdResponse loanDetailsAfterFirstPayment = loanTransactionHelper.getLoanDetails(loanId);
            Double outstandingAfterFirstPayment = loanDetailsAfterFirstPayment.getSummary().getTotalOutstanding();
            LOG.info("Outstanding balance after first payment: {}", outstandingAfterFirstPayment);
            
            // Scenario 1: Make a partial prepayment (more than the due amount)
            Double partialPrepaymentAmount = 2000.0; // More than second installment
            PostLoansLoanIdTransactionsResponse partialPrepaymentResponse = loanTransactionHelper.makeLoanRepayment(
                    loanId, thirdMonthDate.format(DATE_FORMATTER), partialPrepaymentAmount);
            assertNotNull(partialPrepaymentResponse);
            LOG.info("Made partial prepayment of {}", partialPrepaymentAmount);
            
            // Advance to fourth month
            LocalDate fourthMonthDate = thirdMonthDate.plusMonths(1);
            BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, fourthMonthDate);
            
            // Get loan details after partial prepayment
            GetLoansLoanIdResponse loanDetailsAfterPartialPrepayment = loanTransactionHelper.getLoanDetails(loanId);
            Double outstandingAfterPartialPrepayment = loanDetailsAfterPartialPrepayment.getSummary().getTotalOutstanding();
            LOG.info("Outstanding balance after partial prepayment: {}", outstandingAfterPartialPrepayment);
            
            // Verify that outstanding decreased by more than the regular installment amount
            Double regularDecrease = firstInstallmentAmount;
            Double actualDecrease = outstandingAfterFirstPayment - outstandingAfterPartialPrepayment;
            assertTrue(actualDecrease > regularDecrease, 
                    "Partial prepayment should decrease outstanding by more than a regular payment");
            
            // Scenario 2: Early payoff (full settlement)
            // Get payoff amount
            GetLoansLoanIdTransactionsTemplateResponse payoffTemplate = loanTransactionHelper.retrieveTransactionTemplate(
                    loanId, "prepayLoan", fourthMonthDate.format(DATE_FORMATTER));
            Double payoffAmount = payoffTemplate.getAmount();
            LOG.info("Calculated payoff amount: {}", payoffAmount);
            
            // Make payoff payment
            PostLoansLoanIdTransactionsResponse payoffResponse = loanTransactionHelper.makeLoanRepayment(
                    loanId, fourthMonthDate.format(DATE_FORMATTER), payoffAmount);
            assertNotNull(payoffResponse);
            LOG.info("Made full payoff of {}", payoffAmount);
            
            // Verify loan is closed
            GetLoansLoanIdResponse loanDetailsAfterPayoff = loanTransactionHelper.getLoanDetails(loanId);
            assertTrue(loanDetailsAfterPayoff.getStatus().getClosedObligationsMet(), 
                    "Loan should be closed with obligations met after payoff");
            
            // Verify interest savings (should be less than total interest of original schedule)
            Double originalTotalInterest = loanDetailsAfterPayoff.getSummary().getTotalInterestCharged();
            Double actualInterestPaid = loanDetailsAfterPayoff.getSummary().getInterestPaid();
            LOG.info("Original total interest: {}", originalTotalInterest);
            LOG.info("Actual interest paid: {}", actualInterestPaid);
            assertTrue(actualInterestPaid < originalTotalInterest, 
                    "Interest paid should be less than original scheduled interest due to early repayment");
            
        } finally {
            globalConfigurationHelper.updateGlobalConfiguration(GlobalConfigurationConstants.ENABLE_BUSINESS_DATE,
                    new PutGlobalConfigurationsRequest().enabled(false));
        }
    }
    
    @Test
    @DisplayName("Test penalty and fee calculation")
    public void testPenaltyAndFeeCalculation() {
        try {
            // Set business date
            final LocalDate currentDate = LocalDate.of(2023, 1, 1);
            final String currentDateString = currentDate.format(DATE_FORMATTER);
            
            globalConfigurationHelper.updateGlobalConfiguration(GlobalConfigurationConstants.ENABLE_BUSINESS_DATE,
                    new PutGlobalConfigurationsRequest().enabled(true));
            BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, currentDate);
            
            // Create client
            Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
            LOG.info("Created client with ID {}", clientId);
            
            // Create loan product
            GetLoanProductsProductIdResponse loanProduct = createLoanProduct("Penalty Test Loan", 
                    InterestType.DECLINING_BALANCE, 12.0, false);
            LOG.info("Created loan product with ID {}", loanProduct.getId());
            
            // Create and disburse loan
            // Principal: 5000
            // Interest: 12% per year (1% per month)
            // Term: 3 months
            Long loanId = createAndDisburseLoan(clientId, loanProduct.getId(), 
                    currentDateString, 5000.0, 3);
            LOG.info("Created and disbursed loan with ID {}", loanId);
            
            // Create fee charge (fixed amount, specified due date)
            Integer feeChargeId = ChargesHelper.createCharges(requestSpec, responseSpec,
                    ChargesHelper.getLoanSpecifiedDueDateJSON(ChargesHelper.CHARGE_CALCULATION_TYPE_FLAT, "100", false));
            LOG.info("Created fee charge with ID {}", feeChargeId);
            
            // Create percentage penalty charge (percentage of overdue amount)
            Integer penaltyChargeId = ChargesHelper.createCharges(requestSpec, responseSpec, 
                    ChargesHelper.getLoanOverdueFeeJSON("10", "1", "1")); // 10% penalty on overdue amount
            LOG.info("Created penalty charge with ID {}", penaltyChargeId);
            
            // Add fee to loan for second month
            LocalDate secondMonthDate = currentDate.plusMonths(1);
            PostLoansLoanIdChargesResponse feeResponse = loanTransactionHelper.addChargeForLoan(loanId.intValue(),
                    LoanTransactionHelper.getSpecifiedDueDateChargesForLoanAsJSON(
                            feeChargeId.toString(), secondMonthDate.format(DATE_FORMATTER), "100"));
            assertNotNull(feeResponse);
            LOG.info("Added fee charge of 100 for second month");
            
            // Advance to second month (after first installment due date)
            BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, secondMonthDate);
            
            // Skip first payment (to trigger penalty)
            LOG.info("Skipping first payment to trigger penalty");
            
            // Advance past grace period to trigger penalty
            LocalDate secondMonthPlusDays = secondMonthDate.plusDays(5);
            BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, secondMonthPlusDays);
            
            // Apply penalty
            LOG.info("Applying penalty charge");
            PostLoansLoanIdChargesResponse penaltyResponse = loanTransactionHelper.addChargeForLoan(loanId.intValue(),
                    LoanTransactionHelper.getSpecifiedDueDateChargesForLoanAsJSON(
                            penaltyChargeId.toString(), currentDate.format(DATE_FORMATTER), "0"));
            assertNotNull(penaltyResponse);
            
            // Run loan job to process overdue installments
            loanTransactionHelper.applyPenaltyForOverdueLoans(loanId.intValue());
            
            // Get loan details with applied penalty
            GetLoansLoanIdResponse loanDetailsWithPenalty = loanTransactionHelper.getLoanDetails(loanId);
            
            // Verify that the penalty was applied correctly
            Double penaltyChargesDue = loanDetailsWithPenalty.getSummary().getPenaltyChargesOutstanding();
            LOG.info("Penalty charges due: {}", penaltyChargesDue);
            assertTrue(penaltyChargesDue > 0, "Penalty charges should be applied");
            
            // Verify that fee was applied correctly
            Double feeChargesDue = loanDetailsWithPenalty.getSummary().getFeeChargesOutstanding();
            LOG.info("Fee charges due: {}", feeChargesDue);
            assertEquals(100.0, feeChargesDue, 0.1, "Fee charges should be 100");
            
            // Make payment including principal, interest, fee and penalty
            Double totalDueAmount = loanDetailsWithPenalty.getSummary().getTotalOutstanding();
            LOG.info("Total due amount including penalties and fees: {}", totalDueAmount);
            
            PostLoansLoanIdTransactionsResponse paymentResponse = loanTransactionHelper.makeLoanRepayment(
                    loanId, secondMonthPlusDays.format(DATE_FORMATTER), totalDueAmount);
            assertNotNull(paymentResponse);
            LOG.info("Made full payment of {}", totalDueAmount);
            
            // Verify payment breakdown (should include fee and penalty portions)
            GetLoansLoanIdTransactions transaction = loanTransactionHelper.getLoanTransactionDetails(loanId, paymentResponse.getResourceId());
            
            Double principalPortion = transaction.getPrincipalPortion();
            Double interestPortion = transaction.getInterestPortion();
            Double feePortion = transaction.getFeeChargesPortion();
            Double penaltyPortion = transaction.getPenaltyChargesPortion();
            
            LOG.info("Payment breakdown - Principal: {}, Interest: {}, Fee: {}, Penalty: {}", 
                    principalPortion, interestPortion, feePortion, penaltyPortion);
            
            assertEquals(100.0, feePortion, 0.1, "Fee portion should be 100");
            assertTrue(penaltyPortion > 0, "Penalty portion should be positive");
            
        } finally {
            globalConfigurationHelper.updateGlobalConfiguration(GlobalConfigurationConstants.ENABLE_BUSINESS_DATE,
                    new PutGlobalConfigurationsRequest().enabled(false));
        }
    }

    @Test
    @DisplayName("Test multi-currency operations")
    public void testMultiCurrencyOperations() {
        try {
            // Set business date
            final LocalDate currentDate = LocalDate.of(2023, 1, 1);
            final String currentDateString = currentDate.format(DATE_FORMATTER);
            
            globalConfigurationHelper.updateGlobalConfiguration(GlobalConfigurationConstants.ENABLE_BUSINESS_DATE,
                    new PutGlobalConfigurationsRequest().enabled(true));
            BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, currentDate);
            
            // Create client
            Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
            LOG.info("Created client with ID {}", clientId);
            
            // Create USD loan product
            GetLoanProductsProductIdResponse usdLoanProduct = createLoanProductWithCurrency("USD Loan", 
                    InterestType.DECLINING_BALANCE, 12.0, "USD");
            LOG.info("Created USD loan product with ID {}", usdLoanProduct.getId());
            
            // Create EUR loan product
            GetLoanProductsProductIdResponse eurLoanProduct = createLoanProductWithCurrency("EUR Loan", 
                    InterestType.DECLINING_BALANCE, 10.0, "EUR");
            LOG.info("Created EUR loan product with ID {}", eurLoanProduct.getId());
            
            // Create and disburse USD loan
            Long usdLoanId = createAndDisburseLoanWithCurrency(clientId, usdLoanProduct.getId(), 
                    currentDateString, 5000.0, 12, "USD");
            LOG.info("Created and disbursed USD loan with ID {}", usdLoanId);
            
            // Create and disburse EUR loan
            Long eurLoanId = createAndDisburseLoanWithCurrency(clientId, eurLoanProduct.getId(), 
                    currentDateString, 5000.0, 12, "EUR");
            LOG.info("Created and disbursed EUR loan with ID {}", eurLoanId);
            
            // Create USD fee charge
            Integer usdFeeChargeId = ChargesHelper.createCharges(requestSpec, responseSpec,
                    ChargesHelper.getLoanSpecifiedDueDateJSON(ChargesHelper.CHARGE_CALCULATION_TYPE_FLAT, "100", false, "USD"));
            LOG.info("Created USD fee charge with ID {}", usdFeeChargeId);
            
            // Create EUR fee charge
            Integer eurFeeChargeId = ChargesHelper.createCharges(requestSpec, responseSpec,
                    ChargesHelper.getLoanSpecifiedDueDateJSON(ChargesHelper.CHARGE_CALCULATION_TYPE_FLAT, "100", false, "EUR"));
            LOG.info("Created EUR fee charge with ID {}", eurFeeChargeId);
            
            // Add USD fee to USD loan
            PostLoansLoanIdChargesResponse usdFeeResponse = loanTransactionHelper.addChargeForLoan(usdLoanId.intValue(),
                    LoanTransactionHelper.getSpecifiedDueDateChargesForLoanAsJSON(
                            usdFeeChargeId.toString(), currentDateString, "100"));
            assertNotNull(usdFeeResponse);
            LOG.info("Added USD fee charge to USD loan");
            
            // Add EUR fee to EUR loan
            PostLoansLoanIdChargesResponse eurFeeResponse = loanTransactionHelper.addChargeForLoan(eurLoanId.intValue(),
                    LoanTransactionHelper.getSpecifiedDueDateChargesForLoanAsJSON(
                            eurFeeChargeId.toString(), currentDateString, "100"));
            assertNotNull(eurFeeResponse);
            LOG.info("Added EUR fee charge to EUR loan");
            
            // Advance to second month
            LocalDate secondMonthDate = currentDate.plusMonths(1);
            BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, secondMonthDate);
            
            // Get loan details for both loans
            GetLoansLoanIdResponse usdLoanDetails = loanTransactionHelper.getLoanDetails(usdLoanId);
            GetLoansLoanIdResponse eurLoanDetails = loanTransactionHelper.getLoanDetails(eurLoanId);
            
            // Verify currency is correctly maintained
            assertEquals("USD", usdLoanDetails.getCurrency().getCode(), "USD loan should have USD currency");
            assertEquals("EUR", eurLoanDetails.getCurrency().getCode(), "EUR loan should have EUR currency");
            
            // Verify different interest rates are correctly applied
            Double usdInterestDue = usdLoanDetails.getSummary().getTotalInterestCharged();
            Double eurInterestDue = eurLoanDetails.getSummary().getTotalInterestCharged();
            LOG.info("USD loan interest charged: {}", usdInterestDue);
            LOG.info("EUR loan interest charged: {}", eurInterestDue);
            
            // USD loan has 12% interest, EUR loan has 10% interest
            assertTrue(usdInterestDue > eurInterestDue, 
                    "USD loan interest should be higher than EUR loan interest due to higher rate");
            
            // Make payment on USD loan
            Double usdFirstInstallment = usdLoanDetails.getRepaymentSchedule().getPeriods().get(1).getTotalDueForPeriod();
            PostLoansLoanIdTransactionsResponse usdPaymentResponse = loanTransactionHelper.makeLoanRepayment(
                    usdLoanId, secondMonthDate.format(DATE_FORMATTER), usdFirstInstallment);
            assertNotNull(usdPaymentResponse);
            LOG.info("Made USD loan payment of {}", usdFirstInstallment);
            
            // Make payment on EUR loan
            Double eurFirstInstallment = eurLoanDetails.getRepaymentSchedule().getPeriods().get(1).getTotalDueForPeriod();
            PostLoansLoanIdTransactionsResponse eurPaymentResponse = loanTransactionHelper.makeLoanRepayment(
                    eurLoanId, secondMonthDate.format(DATE_FORMATTER), eurFirstInstallment);
            assertNotNull(eurPaymentResponse);
            LOG.info("Made EUR loan payment of {}", eurFirstInstallment);
            
            // Get updated loan details
            GetLoansLoanIdResponse updatedUSDLoanDetails = loanTransactionHelper.getLoanDetails(usdLoanId);
            GetLoansLoanIdResponse updatedEURLoanDetails = loanTransactionHelper.getLoanDetails(eurLoanId);
            
            // Verify payments were correctly applied in respective currencies
            assertEquals(usdFirstInstallment, updatedUSDLoanDetails.getSummary().getTotalRepayment(), 0.1, 
                    "USD loan payment should match first installment amount");
            assertEquals(eurFirstInstallment, updatedEURLoanDetails.getSummary().getTotalRepayment(), 0.1, 
                    "EUR loan payment should match first installment amount");
            
        } finally {
            globalConfigurationHelper.updateGlobalConfiguration(GlobalConfigurationConstants.ENABLE_BUSINESS_DATE,
                    new PutGlobalConfigurationsRequest().enabled(false));
        }
    }

    @Test
    @DisplayName("Test tax withholding on interest")
    public void testTaxWithholdingOnInterest() {
        try {
            // Set business date
            final LocalDate currentDate = LocalDate.of(2023, 1, 1);
            final String currentDateString = currentDate.format(DATE_FORMATTER);
            
            globalConfigurationHelper.updateGlobalConfiguration(GlobalConfigurationConstants.ENABLE_BUSINESS_DATE,
                    new PutGlobalConfigurationsRequest().enabled(true));
            BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, currentDate);
            
            // Create client
            Integer clientId = clientHelper.createClient(ClientHelper.defaultClientCreationRequest()).getClientId().intValue();
            LOG.info("Created client with ID {}", clientId);
            
            // Create tax component for interest withholding (20%)
            final Integer taxComponentId = TaxHelper.createTaxComponent(this.requestSpec, this.responseSpec, "Interest Tax", "20");
            LOG.info("Created tax component with ID {}", taxComponentId);
            
            // Create tax group with the tax component
            final Integer taxGroupId = TaxGroupHelper.createTaxGroup(this.requestSpec, this.responseSpec, 
                    Arrays.asList(taxComponentId));
            LOG.info("Created tax group with ID {}", taxGroupId);
            
            // Create loan product with tax on interest
            GetLoanProductsProductIdResponse loanProduct = createLoanProductWithTax("Tax Withholding Loan", 
                    InterestType.DECLINING_BALANCE, 12.0, taxGroupId.longValue());
            LOG.info("Created loan product with tax withholding, ID {}", loanProduct.getId());
            
            // Create and disburse loan
            // Principal: 10000
            // Interest: 12% per year (1% per month)
            // Term: 12 months
            // Interest tax withholding: 20%
            Long loanId = createAndDisburseLoan(clientId, loanProduct.getId(), 
                    currentDateString, 10000.0, 12);
            LOG.info("Created and disbursed loan with ID {}", loanId);
            
            // Advance to second month
            LocalDate secondMonthDate = currentDate.plusMonths(1);
            BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, secondMonthDate);
            
            // Get loan details with first month interest
            GetLoansLoanIdResponse loanDetailsBeforePayment = loanTransactionHelper.getLoanDetails(loanId);
            
            // Calculate first installment details
            GetLoansLoanIdRepaymentPeriod firstPeriod = loanDetailsBeforePayment.getRepaymentSchedule().getPeriods().get(1);
            Double principalDue = firstPeriod.getPrincipalDue();
            Double interestDue = firstPeriod.getInterestDue();
            Double totalDue = firstPeriod.getTotalDueForPeriod();
            
            LOG.info("First installment - Principal: {}, Interest: {}, Total: {}", 
                    principalDue, interestDue, totalDue);
            
            // Expected tax amount (20% of interest)
            Double expectedTaxAmount = interestDue * 0.2;
            LOG.info("Expected tax amount (20% of interest): {}", expectedTaxAmount);
            
            // Make payment for first installment
            PostLoansLoanIdTransactionsResponse paymentResponse = loanTransactionHelper.makeLoanRepayment(
                    loanId, secondMonthDate.format(DATE_FORMATTER), totalDue);
            assertNotNull(paymentResponse);
            LOG.info("Made loan payment of {}", totalDue);
            
            // Get transaction details to verify tax withheld
            GetLoansLoanIdTransactions transaction = loanTransactionHelper.getLoanTransactionDetails(loanId, paymentResponse.getResourceId());
            
            // Verify transaction breakdown includes tax withholding
            assertNotNull(transaction.getTaxWithheldAmount(), "Tax withheld amount should not be null");
            LOG.info("Actual tax withheld: {}", transaction.getTaxWithheldAmount());
            
            // Verify tax amount matches expected calculation
            assertEquals(expectedTaxAmount, transaction.getTaxWithheldAmount(), 0.1, 
                    "Tax withheld amount should be 20% of interest");
            
            // Advance to third month
            LocalDate thirdMonthDate = secondMonthDate.plusMonths(1);
            BusinessDateHelper.updateBusinessDate(requestSpec, responseSpec, BusinessDateType.BUSINESS_DATE, thirdMonthDate);
            
            // Get updated loan details
            GetLoansLoanIdResponse updatedLoanDetails = loanTransactionHelper.getLoanDetails(loanId);
            
            // Verify total tax withheld is tracked
            Double totalTaxesWithheld = 0.0;
            List<GetLoansLoanIdTransactions> transactions = updatedLoanDetails.getTransactions();
            for (GetLoansLoanIdTransactions tx : transactions) {
                if (tx.getTaxWithheldAmount() != null) {
                    totalTaxesWithheld += tx.getTaxWithheldAmount();
                }
            }
            
            LOG.info("Total taxes withheld so far: {}", totalTaxesWithheld);
            assertEquals(expectedTaxAmount, totalTaxesWithheld, 0.1, 
                    "Total taxes withheld should match expected amount");
            
        } finally {
            globalConfigurationHelper.updateGlobalConfiguration(GlobalConfigurationConstants.ENABLE_BUSINESS_DATE,
                    new PutGlobalConfigurationsRequest().enabled(false));
        }
    }
    
    // Helper methods
    
    private GetLoanProductsProductIdResponse createLoanProduct(String name, Integer interestType, 
            Double interestRate, boolean enableAutoPayoff) {
        
        // Create loan product
        final String loanProductJSON = new LoanProductTestBuilder()
                .withName(name)
                .withPrincipal("10000")
                .withNumberOfRepayments("12")
                .withRepaymentAfterEvery("1")
                .withRepaymentTypeAsMonth()
                .withinterestRatePerPeriod(interestRate.toString())
                .withInterestRateFrequencyTypeAsMonths()
                .withInterestTypeAsDecliningBalance()
                .withInterestType(interestType)
                .withInterestCalculationPeriodTypeAsDays()
                .withAmortizationTypeAsEqualInstallments()
                .withInterestCalculationPeriodTypeAsDays()
                .build(null);
                
        Integer loanProductId = loanTransactionHelper.getLoanProductId(loanProductJSON);
        return loanTransactionHelper.getLoanProduct(loanProductId);
    }
    
    private GetLoanProductsProductIdResponse createLoanProductWithCurrency(String name, Integer interestType, 
            Double interestRate, String currencyCode) {
        
        // Create loan product with specified currency
        final String loanProductJSON = new LoanProductTestBuilder()
                .withName(name)
                .withPrincipal("10000")
                .withNumberOfRepayments("12")
                .withRepaymentAfterEvery("1")
                .withRepaymentTypeAsMonth()
                .withinterestRatePerPeriod(interestRate.toString())
                .withInterestRateFrequencyTypeAsMonths()
                .withInterestTypeAsDecliningBalance()
                .withInterestType(interestType)
                .withInterestCalculationPeriodTypeAsDays()
                .withAmortizationTypeAsEqualInstallments()
                .withInterestCalculationPeriodTypeAsDays()
                .withCurrencyCode(currencyCode)
                .build(null);
                
        Integer loanProductId = loanTransactionHelper.getLoanProductId(loanProductJSON);
        return loanTransactionHelper.getLoanProduct(loanProductId);
    }
    
    private GetLoanProductsProductIdResponse createLoanProductWithTax(String name, Integer interestType, 
            Double interestRate, Long taxGroupId) {
        
        // Create loan product with tax
        final String loanProductJSON = new LoanProductTestBuilder()
                .withName(name)
                .withPrincipal("10000")
                .withNumberOfRepayments("12")
                .withRepaymentAfterEvery("1")
                .withRepaymentTypeAsMonth()
                .withinterestRatePerPeriod(interestRate.toString())
                .withInterestRateFrequencyTypeAsMonths()
                .withInterestTypeAsDecliningBalance()
                .withInterestType(interestType)
                .withInterestCalculationPeriodTypeAsDays()
                .withAmortizationTypeAsEqualInstallments()
                .withInterestCalculationPeriodTypeAsDays()
                .withTaxGroupId(taxGroupId.toString())
                .build(null);
                
        Integer loanProductId = loanTransactionHelper.getLoanProductId(loanProductJSON);
        return loanTransactionHelper.getLoanProduct(loanProductId);
    }
    
    private Long createAndDisburseLoan(Integer clientId, Long productId, String disbursementDate, 
            Double principal, Integer termMonths) {
            
        // Generate loan application JSON
        final String loanApplicationJSON = new LoanApplicationTestBuilder()
                .withPrincipal(principal.toString())
                .withLoanTermFrequency(termMonths.toString())
                .withLoanTermFrequencyAsMonths()
                .withNumberOfRepayments(termMonths.toString())
                .withRepaymentEveryAfter("1")
                .withRepaymentFrequencyTypeAsMonths()
                .withInterestRatePerPeriod("0")
                .withAmortizationTypeAsEqualInstallments()
                .withInterestTypeAsDecliningBalance()
                .withInterestCalculationPeriodTypeSameAsRepaymentPeriod()
                .withExpectedDisbursementDate(disbursementDate)
                .withSubmittedOnDate(disbursementDate)
                .withLoanType("individual")
                .build(clientId.toString(), productId.toString(), null);
                
        // Submit loan application
        final Integer loanId = loanTransactionHelper.getLoanId(loanApplicationJSON);
        
        // Approve loan
        loanTransactionHelper.approveLoan(disbursementDate, principal.toString(), loanId, null);
        
        // Disburse loan
        loanTransactionHelper.disburseLoanWithNetDisbursalAmount(disbursementDate, loanId, principal.toString());
        
        // Verify loan status
        LoanStatusChecker.verifyLoanIsActive(loanTransactionHelper.getLoanStatusAsText(loanId));
        
        return loanId.longValue();
    }
    
    private Long createAndDisburseLoanWithCurrency(Integer clientId, Long productId, String disbursementDate, 
            Double principal, Integer termMonths, String currencyCode) {
            
        // Generate loan application JSON with currency
        final String loanApplicationJSON = new LoanApplicationTestBuilder()
                .withPrincipal(principal.toString())
                .withLoanTermFrequency(termMonths.toString())
                .withLoanTermFrequencyAsMonths()
                .withNumberOfRepayments(termMonths.toString())
                .withRepaymentEveryAfter("1")
                .withRepaymentFrequencyTypeAsMonths()
                .withInterestRatePerPeriod("0")
                .withAmortizationTypeAsEqualInstallments()
                .withInterestTypeAsDecliningBalance()
                .withInterestCalculationPeriodTypeSameAsRepaymentPeriod()
                .withExpectedDisbursementDate(disbursementDate)
                .withSubmittedOnDate(disbursementDate)
                .withLoanType("individual")
                .withCurrency(currencyCode)
                .build(clientId.toString(), productId.toString(), null);
                
        // Submit loan application
        final Integer loanId = loanTransactionHelper.getLoanId(loanApplicationJSON);
        
        // Approve loan
        loanTransactionHelper.approveLoan(disbursementDate, principal.toString(), loanId, null);
        
        // Disburse loan
        loanTransactionHelper.disburseLoanWithNetDisbursalAmount(disbursementDate, loanId, principal.toString());
        
        // Verify loan status
        LoanStatusChecker.verifyLoanIsActive(loanTransactionHelper.getLoanStatusAsText(loanId));
        
        return loanId.longValue();
    }
}