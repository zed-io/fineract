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
package org.apache.fineract.integrationtests.support;

import io.qameta.allure.Allure;
import io.qameta.allure.model.Status;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import lombok.extern.slf4j.Slf4j;
import org.apache.fineract.client.util.JSON;
import org.json.JSONObject;

/**
 * Utility class for test reporting. Provides methods to add various types of attachments and steps to the test report.
 */
@Slf4j
public class TestReporter {

    private static final JSON JSON_FORMATTER = new JSON();
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * Adds a step to the test report.
     *
     * @param name     name of the step
     * @param status   status of the step
     * @param details  additional details for the step
     */
    public static void addStep(String name, Status status, String details) {
        Allure.step(name, step -> {
            step.setStatus(status);
            if (details != null && !details.isEmpty()) {
                try (InputStream is = new ByteArrayInputStream(details.getBytes(StandardCharsets.UTF_8))) {
                    Allure.addAttachment("Details", "text/plain", is, ".txt");
                } catch (Exception e) {
                    log.error("Failed to add step details", e);
                }
            }
        });
    }

    /**
     * Adds a successful step to the test report.
     *
     * @param name name of the step
     */
    public static void addSuccessStep(String name) {
        addStep(name, Status.PASSED, null);
    }

    /**
     * Adds a successful step with details to the test report.
     *
     * @param name    name of the step
     * @param details additional details for the step
     */
    public static void addSuccessStep(String name, String details) {
        addStep(name, Status.PASSED, details);
    }

    /**
     * Adds a failed step to the test report.
     *
     * @param name    name of the step
     * @param details additional details for the step
     */
    public static void addFailedStep(String name, String details) {
        addStep(name, Status.FAILED, details);
    }

    /**
     * Adds an info attachment to the test report.
     *
     * @param name    name of the attachment
     * @param content content of the attachment
     */
    public static void addInfoAttachment(String name, String content) {
        try (InputStream is = new ByteArrayInputStream(content.getBytes(StandardCharsets.UTF_8))) {
            Allure.addAttachment(name, "text/plain", is, ".txt");
        } catch (Exception e) {
            log.error("Failed to add info attachment", e);
        }
    }

    /**
     * Adds a JSON attachment to the test report.
     *
     * @param name    name of the attachment
     * @param content content of the attachment as an object, which will be converted to JSON
     */
    public static void addJsonAttachment(String name, Object content) {
        try {
            String jsonContent;
            if (content instanceof String) {
                jsonContent = content.toString();
            } else {
                jsonContent = JSON_FORMATTER.serialize(content);
            }
            
            // Try to pretty print the JSON for better readability
            try {
                JSONObject json = new JSONObject(jsonContent);
                jsonContent = json.toString(2);
            } catch (Exception ignored) {
                // If it's not valid JSON or can't be pretty printed, use as is
            }
            
            try (InputStream is = new ByteArrayInputStream(jsonContent.getBytes(StandardCharsets.UTF_8))) {
                Allure.addAttachment(name, "application/json", is, ".json");
            }
        } catch (Exception e) {
            log.error("Failed to add JSON attachment", e);
            addInfoAttachment(name, content.toString());
        }
    }

    /**
     * Adds a timestamp attachment to the test report.
     *
     * @param name name of the attachment
     */
    public static void addTimestamp(String name) {
        String timestamp = LocalDateTime.now().format(DATE_TIME_FORMATTER);
        addInfoAttachment(name, timestamp);
    }

    /**
     * Records an API request-response cycle as attachments.
     *
     * @param endpoint   the API endpoint 
     * @param method     HTTP method (GET, POST, etc.)
     * @param request    the request body (can be null for GET requests)
     * @param response   the response body
     * @param statusCode the HTTP status code
     */
    public static void recordApiCall(String endpoint, String method, Object request, Object response, int statusCode) {
        String statusText = statusCode >= 200 && statusCode < 300 ? "Success" : "Failed";
        addStep(method + " " + endpoint + " - " + statusText,
                statusCode >= 200 && statusCode < 300 ? Status.PASSED : Status.FAILED,
                "Status Code: " + statusCode);
        
        if (request != null) {
            addJsonAttachment("Request", request);
        }
        
        if (response != null) {
            addJsonAttachment("Response", response);
        }
        
        addTimestamp("Timestamp");
    }
}