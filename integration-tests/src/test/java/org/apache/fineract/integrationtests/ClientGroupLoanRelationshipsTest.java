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

import io.restassured.builder.RequestSpecBuilder;
import io.restassured.builder.ResponseSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import io.restassured.specification.ResponseSpecification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.apache.fineract.integrationtests.common.ClientHelper;
import org.apache.fineract.integrationtests.common.CollateralManagementHelper;
import org.apache.fineract.integrationtests.common.CommonConstants;
import org.apache.fineract.integrationtests.common.GroupHelper;
import org.apache.fineract.integrationtests.common.Utils;
import org.apache.fineract.integrationtests.common.loans.LoanApplicationTestBuilder;
import org.apache.fineract.integrationtests.common.loans.LoanProductTestBuilder;
import org.apache.fineract.integrationtests.common.loans.LoanStatusChecker;
import org.apache.fineract.integrationtests.common.loans.LoanTestLifecycleExtension;
import org.apache.fineract.integrationtests.common.loans.LoanTransactionHelper;
import org.apache.fineract.integrationtests.common.savings.SavingsAccountHelper;
import org.apache.fineract.integrationtests.common.savings.SavingsProductHelper;
import org.apache.fineract.integrationtests.guarantor.GuarantorHelper;
import org.apache.fineract.integrationtests.guarantor.GuarantorTestBuilder;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Integration Test for Client-Group-Loan relationships verification.
 * Tests the interactions between clients, groups, and loans.
 */
@SuppressWarnings({ "rawtypes", "unchecked" })
@ExtendWith(LoanTestLifecycleExtension.class)
public class ClientGroupLoanRelationshipsTest {

    private static final Logger LOG = LoggerFactory.getLogger(ClientGroupLoanRelationshipsTest.class);
    private ResponseSpecification responseSpec;
    private RequestSpecification requestSpec;
    private LoanTransactionHelper loanTransactionHelper;
    private SavingsAccountHelper savingsAccountHelper;
    private GuarantorHelper guarantorHelper;

    @BeforeEach
    public void setup() {
        Utils.initializeRESTAssured();
        this.requestSpec = new RequestSpecBuilder().setContentType(ContentType.JSON).build();
        this.requestSpec.header("Authorization", "Basic " + Utils.loginIntoServerAndGetBase64EncodedAuthenticationKey());
        this.responseSpec = new ResponseSpecBuilder().expectStatusCode(200).build();
        this.loanTransactionHelper = new LoanTransactionHelper(this.requestSpec, this.responseSpec);
        this.savingsAccountHelper = new SavingsAccountHelper(this.requestSpec, this.responseSpec);
        this.guarantorHelper = new GuarantorHelper(this.requestSpec, this.responseSpec);
    }

    @Test
    public void testGroupCreationWithMultipleClients() {
        LOG.info("------------------------------TESTING GROUP CREATION WITH MULTIPLE CLIENTS------------------------------------");
        
        // Create clients
        final Integer clientId1 = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        final Integer clientId2 = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        final Integer clientId3 = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        
        // Verify clients created successfully
        Assertions.assertNotNull(clientId1);
        Assertions.assertNotNull(clientId2);
        Assertions.assertNotNull(clientId3);
        
        // Create a group
        Integer groupId = GroupHelper.createGroup(this.requestSpec, this.responseSpec);
        GroupHelper.verifyGroupCreatedOnServer(this.requestSpec, this.responseSpec, groupId);
        
        // Activate the group
        groupId = GroupHelper.activateGroup(this.requestSpec, this.responseSpec, groupId.toString());
        GroupHelper.verifyGroupActivatedOnServer(this.requestSpec, this.responseSpec, groupId, true);
        
        // Associate clients with the group
        groupId = GroupHelper.associateClient(this.requestSpec, this.responseSpec, groupId.toString(), clientId1.toString());
        GroupHelper.verifyGroupMembers(this.requestSpec, this.responseSpec, groupId, clientId1);
        
        groupId = GroupHelper.associateClient(this.requestSpec, this.responseSpec, groupId.toString(), clientId2.toString());
        GroupHelper.verifyGroupMembers(this.requestSpec, this.responseSpec, groupId, clientId2);
        
        groupId = GroupHelper.associateClient(this.requestSpec, this.responseSpec, groupId.toString(), clientId3.toString());
        GroupHelper.verifyGroupMembers(this.requestSpec, this.responseSpec, groupId, clientId3);
        
        // Get all clients associated with the group to verify
        List<HashMap> groupClients = GroupHelper.getAllGroupClients(requestSpec, responseSpec, groupId.toString());
        Assertions.assertEquals(3, groupClients.size(), "Group should have 3 clients");
        
        // Verify each client is in the list
        boolean client1Found = false, client2Found = false, client3Found = false;
        for (HashMap client : groupClients) {
            Integer id = (Integer) client.get("id");
            if (id.equals(clientId1)) client1Found = true;
            if (id.equals(clientId2)) client2Found = true;
            if (id.equals(clientId3)) client3Found = true;
        }
        
        Assertions.assertTrue(client1Found, "Client 1 should be in the group");
        Assertions.assertTrue(client2Found, "Client 2 should be in the group");
        Assertions.assertTrue(client3Found, "Client 3 should be in the group");
    }

    @Test
    public void testGroupLoanApplicationAndApproval() {
        LOG.info("------------------------------TESTING GROUP LOAN APPLICATION AND APPROVAL------------------------------------");
        
        // Create clients
        final Integer clientId1 = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        final Integer clientId2 = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        
        // Create a group
        Integer groupId = GroupHelper.createGroup(this.requestSpec, this.responseSpec, true);
        groupId = GroupHelper.associateClient(this.requestSpec, this.responseSpec, groupId.toString(), clientId1.toString());
        groupId = GroupHelper.associateClient(this.requestSpec, this.responseSpec, groupId.toString(), clientId2.toString());
        
        // Create loan product
        final Integer loanProductId = createLoanProduct();
        Assertions.assertNotNull(loanProductId);
        
        // Apply for a loan
        final Integer loanId = applyForLoanApplication(groupId, loanProductId, "12000");
        Assertions.assertNotNull(loanId);
        
        // Verify loan details before approval
        HashMap loanDetails = this.loanTransactionHelper.getLoanDetail(this.requestSpec, this.responseSpec, loanId);
        Assertions.assertEquals("300.0", String.valueOf(loanDetails.get("totalExpectedRepayment")));
        Assertions.assertEquals("12000.0", String.valueOf(loanDetails.get("principal")));
        
        // Approve the loan
        this.loanTransactionHelper.approveLoan("20 September 2022", loanId);
        HashMap loanStatusHashMap = LoanStatusChecker.getStatusOfLoan(this.requestSpec, this.responseSpec, loanId);
        LoanStatusChecker.verifyLoanIsApproved(loanStatusHashMap);
        
        // Verify group association is maintained
        loanDetails = this.loanTransactionHelper.getLoanDetail(this.requestSpec, this.responseSpec, loanId);
        HashMap<String, Object> groupData = (HashMap<String, Object>) loanDetails.get("group");
        Assertions.assertEquals(groupId, groupData.get("id"));
    }

    @Test
    public void testLoanDistributionToGroupMembers() {
        LOG.info("------------------------------TESTING LOAN DISTRIBUTION TO GROUP MEMBERS------------------------------------");
        
        // Create clients
        final Integer clientId1 = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        final Integer clientId2 = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        
        // Create group and associate clients
        Integer groupId = GroupHelper.createGroup(this.requestSpec, this.responseSpec, true);
        groupId = GroupHelper.associateClient(this.requestSpec, this.responseSpec, groupId.toString(), clientId1.toString());
        groupId = GroupHelper.associateClient(this.requestSpec, this.responseSpec, groupId.toString(), clientId2.toString());
        
        // Create loan product
        final Integer loanProductId = createLoanProduct();
        
        // Create GLIM (Group Loan Individual Monitoring) application
        HashMap<String, Integer> glimMap = applyForGlimApplication(clientId1, clientId2, groupId, loanProductId);
        final Integer glimId = glimMap.get("glimId");
        Assertions.assertNotNull(glimId);
        
        List<Integer> loanIds = new ArrayList<>(glimMap.keySet().stream()
            .filter(key -> key.startsWith("loanId"))
            .map(key -> glimMap.get(key))
            .toList());
        
        Assertions.assertEquals(2, loanIds.size(), "Each client should receive a loan");
        
        // Approve the GLIM application
        List<Map<String, Object>> approvalFormData = new ArrayList<>();
        for (Integer loanId : loanIds) {
            approvalFormData.add(approvalFormData(loanId, "20 September 2022"));
        }
        
        HashMap loanStatusHashMap = this.loanTransactionHelper.approveGlimAccount(this.requestSpec, this.responseSpec, approvalFormData, glimId);
        LoanStatusChecker.verifyLoanIsApproved(loanStatusHashMap);
        
        // Disburse the GLIM
        loanStatusHashMap = this.loanTransactionHelper.disburseGlimAccount("25 September 2022", glimId);
        LoanStatusChecker.verifyLoanIsActive(loanStatusHashMap);
        
        // Verify loans were created for each client
        for (Integer loanId : loanIds) {
            HashMap loanDetails = this.loanTransactionHelper.getLoanDetail(this.requestSpec, this.responseSpec, loanId);
            Assertions.assertEquals("Disbursed", String.valueOf(((HashMap)loanDetails.get("status")).get("value")));
            
            // Verify correct client association
            HashMap<String, Object> clientData = (HashMap<String, Object>) loanDetails.get("clientData");
            Assertions.assertTrue(
                clientData.get("id").equals(clientId1) || clientData.get("id").equals(clientId2),
                "Loan should be associated with one of the clients"
            );
        }
    }

    @Test
    public void testGroupLoanRepayments() {
        LOG.info("------------------------------TESTING GROUP LOAN REPAYMENTS------------------------------------");
        
        // Create clients
        final Integer clientId1 = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        final Integer clientId2 = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        
        // Create group and associate clients
        Integer groupId = GroupHelper.createGroup(this.requestSpec, this.responseSpec, true);
        groupId = GroupHelper.associateClient(this.requestSpec, this.responseSpec, groupId.toString(), clientId1.toString());
        groupId = GroupHelper.associateClient(this.requestSpec, this.responseSpec, groupId.toString(), clientId2.toString());
        
        // Create loan product
        final Integer loanProductId = createLoanProduct();
        
        // Apply for a group loan
        final Integer loanId = applyForLoanApplication(groupId, loanProductId, "1000");
        
        // Approve and disburse the loan
        this.loanTransactionHelper.approveLoan("20 September 2022", loanId);
        String loanDetails = this.loanTransactionHelper.getLoanDetails(this.requestSpec, this.responseSpec, loanId);
        this.loanTransactionHelper.disburseLoanWithNetDisbursalAmount("20 September 2022", loanId, "1000");
        
        // Make repayment (first contribution)
        final String firstRepaymentDate = "27 September 2022";
        final String firstRepaymentAmount = "300";
        final String firstRepaymentExternalId = "ext-1";
        
        HashMap firstRepayment = this.loanTransactionHelper.makeRepaymentWithExternalId(loanId, firstRepaymentAmount, firstRepaymentDate, firstRepaymentExternalId);
        
        // Make another repayment (second contribution)
        final String secondRepaymentDate = "28 September 2022";
        final String secondRepaymentAmount = "400";
        final String secondRepaymentExternalId = "ext-2";
        
        HashMap secondRepayment = this.loanTransactionHelper.makeRepaymentWithExternalId(loanId, secondRepaymentAmount, secondRepaymentDate, secondRepaymentExternalId);
        
        // Verify repayments were recorded properly
        loanDetails = this.loanTransactionHelper.getLoanDetails(this.requestSpec, this.responseSpec, loanId);
        List<HashMap> repayments = this.loanTransactionHelper.getLoanTransactions(loanId);
        
        boolean firstRepaymentFound = false;
        boolean secondRepaymentFound = false;
        BigDecimal totalRepaid = BigDecimal.ZERO;
        
        for (HashMap repayment : repayments) {
            if (repayment.get("type").equals("Repayment")) {
                if (String.valueOf(repayment.get("amount")).equals(firstRepaymentAmount)) {
                    firstRepaymentFound = true;
                    Assertions.assertEquals(firstRepaymentExternalId, String.valueOf(repayment.get("externalId")));
                }
                
                if (String.valueOf(repayment.get("amount")).equals(secondRepaymentAmount)) {
                    secondRepaymentFound = true;
                    Assertions.assertEquals(secondRepaymentExternalId, String.valueOf(repayment.get("externalId")));
                }
                
                totalRepaid = totalRepaid.add(new BigDecimal(String.valueOf(repayment.get("amount"))));
            }
        }
        
        Assertions.assertTrue(firstRepaymentFound, "First repayment should be recorded");
        Assertions.assertTrue(secondRepaymentFound, "Second repayment should be recorded");
        Assertions.assertEquals(new BigDecimal("700"), totalRepaid, "Total repaid amount should match the sum of contributions");
    }

    @Test
    public void testClientGuarantorRelationshipsForLoans() {
        LOG.info("------------------------------TESTING CLIENT GUARANTOR RELATIONSHIPS FOR LOANS------------------------------------");
        
        // Create clients
        final Integer clientId1 = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        final Integer clientId2 = ClientHelper.createClient(this.requestSpec, this.responseSpec);
        final Integer clientId3 = ClientHelper.createClient(this.requestSpec, this.responseSpec); // Will be guarantor
        
        // Create group and associate borrower clients
        Integer groupId = GroupHelper.createGroup(this.requestSpec, this.responseSpec, true);
        groupId = GroupHelper.associateClient(this.requestSpec, this.responseSpec, groupId.toString(), clientId1.toString());
        groupId = GroupHelper.associateClient(this.requestSpec, this.responseSpec, groupId.toString(), clientId2.toString());
        
        // Create savings product and accounts for guarantor
        final Integer savingsProductId = createSavingsProduct();
        final Integer savingsId = createSavingsAccount(clientId3, savingsProductId);
        
        // Approve and activate savings account
        this.savingsAccountHelper.approveSavingsOnDate(savingsId, "01 January 2022");
        this.savingsAccountHelper.activateSavingsAccount(savingsId, "01 January 2022");
        
        // Deposit amount to guarantor's savings
        this.savingsAccountHelper.depositToSavingsAccount(savingsId, "1000", "02 January 2022", CommonConstants.RESPONSE_RESOURCE_ID);
        
        // Create loan product
        final Integer loanProductId = createLoanProduct();
        
        // Apply for a group loan
        final Integer loanId = applyForLoanApplication(groupId, loanProductId, "1000");
        
        // Approve and disburse the loan
        this.loanTransactionHelper.approveLoan("20 September 2022", loanId);
        String loanDetails = this.loanTransactionHelper.getLoanDetails(this.requestSpec, this.responseSpec, loanId);
        this.loanTransactionHelper.disburseLoanWithNetDisbursalAmount("20 September 2022", loanId, "1000");
        
        // Add client3 as guarantor for the loan
        String guarantorJSON = new GuarantorTestBuilder().existingCustomerWithGuaranteeAmount(clientId3.toString(), 
                savingsId.toString(), "500").build();
        Integer guarantorId = guarantorHelper.createGuarantor(loanId, guarantorJSON);
        Assertions.assertNotNull(guarantorId);
        
        // Verify guarantor is properly associated
        List<HashMap> guarantors = guarantorHelper.getAllGuarantor(loanId);
        Assertions.assertEquals(1, guarantors.size(), "One guarantor should be associated with the loan");
        
        HashMap guarantor = guarantors.get(0);
        Assertions.assertEquals(clientId3, guarantor.get("entityId"), "Guarantor should be client3");
        
        // Check guarantor details including savings hold amount
        HashMap guarantorDetails = (HashMap) guarantorHelper.getGuarantor(guarantorId, loanId, "");
        List<HashMap> funds = (List<HashMap>) guarantorDetails.get("guarantorFundingDetails");
        Assertions.assertFalse(funds.isEmpty(), "Guarantor should have funding details");
        
        HashMap funding = funds.get(0);
        Assertions.assertEquals("500", String.valueOf(funding.get("amount")), "Guarantee amount should be 500");
        Assertions.assertEquals(savingsId, funding.get("savingsId"), "Guarantee should be from the correct savings account");
    }

    private Integer createLoanProduct() {
        LOG.info("------------------------------CREATING LOAN PRODUCT ---------------------------------------");
        final String loanProductJSON = new LoanProductTestBuilder() 
                .withPrincipal("1000.00") 
                .withNumberOfRepayments("4") 
                .withRepaymentAfterEvery("1") 
                .withRepaymentTypeAsMonth() 
                .withinterestRatePerPeriod("1") 
                .withInterestRateFrequencyTypeAsMonths() 
                .withAmortizationTypeAsEqualInstallments() 
                .withInterestTypeAsDecliningBalance() 
                .build(null);
        return this.loanTransactionHelper.getLoanProductId(loanProductJSON);
    }

    private Integer createSavingsProduct() {
        LOG.info("------------------------------CREATING SAVINGS PRODUCT ---------------------------------------");
        SavingsProductHelper savingsProductHelper = new SavingsProductHelper();
        final String savingsProductJSON = savingsProductHelper 
                .withInterestCompoundingPeriodTypeAsDaily() 
                .withInterestPostingPeriodTypeAsMonthly() 
                .withInterestCalculationPeriodTypeAsDailyBalance() 
                .withMinimumOpeningBalance("500.0") 
                .build();
        return SavingsProductHelper.createSavingsProduct(savingsProductJSON, requestSpec, responseSpec);
    }

    private Integer createSavingsAccount(final Integer clientId, final Integer savingsProductId) {
        LOG.info("------------------------------CREATING SAVINGS ACCOUNT ---------------------------------------");
        final String savingsAccountJSON = new SavingsAccountHelper().withClientId(clientId.toString())
                .savingsProductId(savingsProductId.toString())
                .build();
        return SavingsAccountHelper.createSavingsAccount(requestSpec, responseSpec, savingsAccountJSON, "");
    }

    private Integer applyForLoanApplication(final Integer groupId, final Integer loanProductId, final String principal) {
        LOG.info("--------------------------------APPLYING FOR LOAN APPLICATION--------------------------------");
        final String loanApplicationJSON = new LoanApplicationTestBuilder() 
                .withPrincipal(principal) 
                .withLoanTermFrequency("4") 
                .withLoanTermFrequencyAsMonths() 
                .withNumberOfRepayments("4") 
                .withRepaymentEveryAfter("1") 
                .withRepaymentFrequencyTypeAsMonths() 
                .withInterestRatePerPeriod("2") 
                .withAmortizationTypeAsEqualInstallments() 
                .withInterestTypeAsDecliningBalance() 
                .withInterestCalculationPeriodTypeSameAsRepaymentPeriod() 
                .withExpectedDisbursementDate("20 September 2022") 
                .withSubmittedOnDate("20 September 2022") 
                .withLoanType("group").build(groupId.toString(), loanProductId.toString(), null);
        LOG.info(loanApplicationJSON);
        return this.loanTransactionHelper.getLoanId(loanApplicationJSON);
    }

    private HashMap<String, Integer> applyForGlimApplication(final Integer clientId1, final Integer clientId2, final Integer groupId, final Integer loanProductId) {
        LOG.info("--------------------------------APPLYING FOR GLIM APPLICATION--------------------------------");
        
        List<HashMap> clientMembers = new ArrayList<>();
        
        // First client data
        HashMap<String, Object> client1 = new HashMap<>();
        client1.put("clientId", clientId1.toString());
        client1.put("transactionAmount", 5000);
        clientMembers.add(client1);
        
        // Second client data
        HashMap<String, Object> client2 = new HashMap<>();
        client2.put("clientId", clientId2.toString());
        client2.put("transactionAmount", 5000);
        clientMembers.add(client2);
        
        final String glimApplicationJSON = new LoanApplicationTestBuilder() 
                .withPrincipal("10000.00") 
                .withLoanTermFrequency("4") 
                .withLoanTermFrequencyAsMonths() 
                .withNumberOfRepayments("4") 
                .withRepaymentEveryAfter("1") 
                .withRepaymentFrequencyTypeAsMonths() 
                .withInterestRatePerPeriod("2") 
                .withAmortizationTypeAsEqualInstallments() 
                .withInterestTypeAsDecliningBalance() 
                .withInterestCalculationPeriodTypeSameAsRepaymentPeriod() 
                .withExpectedDisbursementDate("20 September 2022") 
                .withSubmittedOnDate("20 September 2022")
                .withLoanType("glim")
                .withGlimClientMembers(clientMembers)
                .build(groupId.toString(), loanProductId.toString(), null);
        
        LOG.info(glimApplicationJSON);
        return this.loanTransactionHelper.getGlimId(glimApplicationJSON);
    }

    private Map<String, Object> approvalFormData(final Integer loanId, final String approvedOnDate) {
        Map<String, Object> map = new HashMap<>();
        map.put("loanId", loanId);
        map.put("approvedOnDate", approvedOnDate);
        map.put("dateFormat", CommonConstants.DATE_FORMAT);
        map.put("locale", "en");
        return map;
    }

    private void addCollaterals(List<HashMap> collaterals, Integer collateralId, BigDecimal quantity) {
        collaterals.add(collaterals(collateralId, quantity));
    }

    private HashMap<String, String> collaterals(Integer collateralId, BigDecimal amount) {
        HashMap<String, String> collateral = new HashMap<String, String>(2);
        collateral.put("clientCollateralId", collateralId.toString());
        collateral.put("amount", amount.toString());
        return collateral;
    }
}