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
import java.lang.reflect.Method;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.extension.AfterAllCallback;
import org.junit.jupiter.api.extension.AfterEachCallback;
import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.BeforeEachCallback;
import org.junit.jupiter.api.extension.ExtensionContext;
import org.junit.jupiter.api.extension.TestWatcher;

/**
 * JUnit 5 extension that enhances test execution with additional reporting and lifecycle management.
 * This extension works in conjunction with Allure to provide enhanced test reporting.
 */
@Slf4j
public class TestExecutionExtension implements BeforeAllCallback, AfterAllCallback, BeforeEachCallback, AfterEachCallback, TestWatcher {

    @Override
    public void beforeAll(ExtensionContext context) {
        String className = context.getRequiredTestClass().getSimpleName();
        log.info("Starting test suite: {}", className);
        
        // Add test suite info to the report
        Optional<DisplayName> displayNameAnnotation = context.getTestClass()
                .flatMap(testClass -> Optional.ofNullable(testClass.getAnnotation(DisplayName.class)));
        
        String displayName = displayNameAnnotation
                .map(DisplayName::value)
                .orElse(className);
        
        Allure.epic("Integration Tests");
        Allure.suite(displayName);
    }

    @Override
    public void afterAll(ExtensionContext context) {
        log.info("Completed test suite: {}", context.getRequiredTestClass().getSimpleName());
    }

    @Override
    public void beforeEach(ExtensionContext context) {
        Method testMethod = context.getRequiredTestMethod();
        String methodName = testMethod.getName();
        
        log.info("Starting test: {}", methodName);
        
        // Extract method-level tags
        Optional.ofNullable(testMethod.getAnnotation(Tag.class))
                .ifPresent(tag -> Allure.tag(tag.value()));
        
        // Extract class-level tags
        Optional.ofNullable(context.getRequiredTestClass().getAnnotation(Tag.class))
                .ifPresent(tag -> Allure.tag(tag.value()));
        
        // Add test description from DisplayName annotation if present
        Optional.ofNullable(testMethod.getAnnotation(DisplayName.class))
                .ifPresent(displayName -> Allure.description(displayName.value()));
        
        // Record test start time
        TestReporter.addTimestamp("Test Started");
    }

    @Override
    public void afterEach(ExtensionContext context) {
        log.info("Completed test: {}", context.getRequiredTestMethod().getName());
        
        // Record test end time
        TestReporter.addTimestamp("Test Completed");
    }

    @Override
    public void testSuccessful(ExtensionContext context) {
        log.info("Test passed: {}", context.getRequiredTestMethod().getName());
        
        TestReporter.addStep("Test Execution", Status.PASSED, "Test executed successfully");
    }

    @Override
    public void testFailed(ExtensionContext context, Throwable cause) {
        String testName = context.getRequiredTestMethod().getName();
        log.error("Test failed: {}", testName, cause);
        
        TestReporter.addStep("Test Execution", Status.FAILED, "Test failed with exception: " + cause.getMessage());
        TestReporter.addInfoAttachment("Exception Stack Trace", getStackTrace(cause));
    }

    @Override
    public void testAborted(ExtensionContext context, Throwable cause) {
        log.warn("Test aborted: {}", context.getRequiredTestMethod().getName(), cause);
        
        TestReporter.addStep("Test Execution", Status.BROKEN, "Test was aborted: " + cause.getMessage());
    }

    @Override
    public void testDisabled(ExtensionContext context, Optional<String> reason) {
        log.info("Test disabled: {} - Reason: {}", context.getRequiredTestMethod().getName(), reason.orElse("No reason provided"));
        
        TestReporter.addStep("Test Execution", Status.SKIPPED, "Test was disabled. Reason: " + reason.orElse("No reason provided"));
    }
    
    /**
     * Convert a throwable's stack trace to a string.
     *
     * @param throwable the throwable
     * @return the stack trace as a string
     */
    private String getStackTrace(Throwable throwable) {
        StringBuilder sb = new StringBuilder();
        sb.append(throwable.toString()).append("\n");
        
        for (StackTraceElement element : throwable.getStackTrace()) {
            sb.append("\tat ").append(element).append("\n");
        }
        
        Throwable cause = throwable.getCause();
        if (cause != null) {
            sb.append("Caused by: ").append(getStackTrace(cause));
        }
        
        return sb.toString();
    }
}