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
package org.apache.fineract.integrationtests.bulkimport.populator.loan;

import io.restassured.builder.RequestSpecBuilder;
import io.restassured.builder.ResponseSpecBuilder;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import io.restassured.specification.ResponseSpecification;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.core.MediaType;
import java.io.IOException;
import org.apache.fineract.client.models.PaymentTypeRequest;
import org.apache.fineract.client.models.PostPaymentTypesResponse;
import org.apache.fineract.infrastructure.bulkimport.constants.TemplatePopulateImportConstants;
import org.apache.fineract.integrationtests.common.ClientHelper;
import org.apache.fineract.integrationtests.common.GroupHelper;
import org.apache.fineract.integrationtests.common.OfficeHelper;
import org.apache.fineract.integrationtests.common.PaymentTypeHelper;
import org.apache.fineract.integrationtests.common.Utils;
import org.apache.fineract.integrationtests.common.funds.FundsResourceHandler;
import org.apache.fineract.integrationtests.common.loans.LoanProductTestBuilder;
import org.apache.fineract.integrationtests.common.loans.LoanTransactionHelper;
import org.apache.fineract.integrationtests.common.organisation.StaffHelper;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class LoanWorkbookPopulatorTest {

    private ResponseSpecification responseSpec;
    private RequestSpecification requestSpec;
    private PaymentTypeHelper paymentTypeHelper;

    @BeforeEach
    public void setup() {
        Utils.initializeRESTAssured();
        this.requestSpec = new RequestSpecBuilder().setContentType(ContentType.JSON).build();
        this.requestSpec.header("Authorization", "Basic " + Utils.loginIntoServerAndGetBase64EncodedAuthenticationKey());
        this.responseSpec = new ResponseSpecBuilder().expectStatusCode(200).build();
        this.paymentTypeHelper = new PaymentTypeHelper();
    }

    @Test
    public void testLoanWorkbookPopulate() throws IOException {
        requestSpec.header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON);
        // in order to populate helper sheets
        OfficeHelper officeHelper = new OfficeHelper(requestSpec, responseSpec);
        Integer outcome_office_creation = officeHelper.createOffice("02 May 2000");
        Assertions.assertNotNull(outcome_office_creation, "Could not create office");

        // in order to populate helper sheets
        Integer outcome_client_creation = ClientHelper.createClient(requestSpec, responseSpec);
        Assertions.assertNotNull(outcome_client_creation, "Could not create client");

        // in order to populate helper sheets
        Integer outcome_group_creation = GroupHelper.createGroup(requestSpec, responseSpec, true);
        Assertions.assertNotNull(outcome_group_creation, "Could not create group");

        // in order to populate helper sheets
        Integer outcome_staff_creation = StaffHelper.createStaff(requestSpec, responseSpec);
        Assertions.assertNotNull(outcome_staff_creation, "Could not create staff");

        LoanTransactionHelper loanTransactionHelper = new LoanTransactionHelper(requestSpec, responseSpec);
        LoanProductTestBuilder loanProductTestBuilder = new LoanProductTestBuilder();
        String jsonLoanProduct = loanProductTestBuilder.build(null);
        Integer outcome_lp_creaion = loanTransactionHelper.getLoanProductId(jsonLoanProduct);
        Assertions.assertNotNull(outcome_lp_creaion, "Could not create Loan Product");

        String jsonFund = "{\n" + "\t\"name\": \"" + Utils.uniqueRandomStringGenerator("Fund_Name", 9) + "\"\n" + "}";
        Integer outcome_fund_creation = FundsResourceHandler.createFund(jsonFund, requestSpec, responseSpec);
        Assertions.assertNotNull(outcome_fund_creation, "Could not create Fund");

        String name = PaymentTypeHelper.randomNameGenerator("P_T", 5);
        String description = PaymentTypeHelper.randomNameGenerator("PT_Desc", 15);
        Boolean isCashPayment = true;
        Integer position = 1;
        PostPaymentTypesResponse paymentTypesResponse = paymentTypeHelper.createPaymentType(
                new PaymentTypeRequest().name(name).description(description).isCashPayment(isCashPayment).position(position));
        Long outcome_payment_creation = paymentTypesResponse.getResourceId();
        Assertions.assertNotNull(outcome_payment_creation, "Could not create payment type");

        Workbook workbook = loanTransactionHelper.getLoanWorkbook("dd MMMM yyyy");

        Sheet officeSheet = workbook.getSheet(TemplatePopulateImportConstants.OFFICE_SHEET_NAME);
        Row firstOfficeRow = officeSheet.getRow(1);
        Assertions.assertNotNull(firstOfficeRow.getCell(1), "No offices found ");

        Sheet clientSheet = workbook.getSheet(TemplatePopulateImportConstants.CLIENT_SHEET_NAME);
        Row firstClientRow = clientSheet.getRow(1);
        Assertions.assertNotNull(firstClientRow.getCell(1), "No clients found ");

        Sheet groupSheet = workbook.getSheet(TemplatePopulateImportConstants.GROUP_SHEET_NAME);
        Row firstGroupRow = groupSheet.getRow(1);
        Assertions.assertNotNull(firstGroupRow.getCell(1), "No groups found ");

        Sheet staffSheet = workbook.getSheet(TemplatePopulateImportConstants.STAFF_SHEET_NAME);
        Row firstStaffRow = staffSheet.getRow(1);
        Assertions.assertNotNull(firstStaffRow.getCell(1), "No staff found ");

        Sheet productSheet = workbook.getSheet(TemplatePopulateImportConstants.PRODUCT_SHEET_NAME);
        Row firstProductRow = productSheet.getRow(1);
        Assertions.assertNotNull(firstProductRow.getCell(1), "No products found ");

        Sheet extrasSheet = workbook.getSheet(TemplatePopulateImportConstants.EXTRAS_SHEET_NAME);
        Row firstExtrasRow = extrasSheet.getRow(1);
        Assertions.assertNotNull(firstExtrasRow.getCell(1), "No Extras found ");
    }
}
