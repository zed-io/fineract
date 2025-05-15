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

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.util.Properties;
import lombok.extern.slf4j.Slf4j;
import org.awaitility.Awaitility;
import org.junit.jupiter.api.extension.BeforeAllCallback;
import org.junit.jupiter.api.extension.ExtensionContext;

/**
 * JUnit 5 extension that sets up the test environment before all tests in a test class or test suite.
 * This ensures that the environment is ready for testing, including database setup, server readiness, etc.
 */
@Slf4j
public class TestEnvironmentSetup implements BeforeAllCallback {

    private static final String CONFIG_FILE = "test-environment.properties";
    private static final int DEFAULT_TIMEOUT_SECONDS = 300;
    private static boolean initialized = false;

    private Properties properties;

    @Override
    public void beforeAll(ExtensionContext context) throws Exception {
        // Only run the setup once across all test classes
        if (initialized) {
            return;
        }

        loadProperties();
        setupEnvironment();
        initialized = true;
    }

    /**
     * Load properties from the test-environment.properties file.
     */
    private void loadProperties() {
        properties = new Properties();
        
        // First load from classpath
        try (InputStream is = getClass().getClassLoader().getResourceAsStream(CONFIG_FILE)) {
            if (is != null) {
                properties.load(is);
                log.info("Loaded properties from classpath");
                return;
            }
        } catch (IOException e) {
            log.warn("Failed to load properties from classpath", e);
        }

        // Then try to load from the current directory
        Path currentDirPath = Paths.get(CONFIG_FILE);
        if (Files.exists(currentDirPath)) {
            try (InputStream is = new FileInputStream(currentDirPath.toFile())) {
                properties.load(is);
                log.info("Loaded properties from current directory");
                return;
            } catch (IOException e) {
                log.warn("Failed to load properties from current directory", e);
            }
        }

        // Finally try to load from the user's home directory
        Path homeDirPath = Paths.get(System.getProperty("user.home"), CONFIG_FILE);
        if (Files.exists(homeDirPath)) {
            try (InputStream is = new FileInputStream(homeDirPath.toFile())) {
                properties.load(is);
                log.info("Loaded properties from user's home directory");
                return;
            } catch (IOException e) {
                log.warn("Failed to load properties from user's home directory", e);
            }
        }

        log.warn("Could not find test-environment.properties file, using defaults");
    }

    /**
     * Set up the test environment.
     */
    private void setupEnvironment() {
        log.info("Setting up test environment");

        // Setup database if needed
        if (Boolean.parseBoolean(properties.getProperty("setup.database", "false"))) {
            setupDatabase();
        }

        // Wait for server to be ready
        waitForServerReady();

        log.info("Test environment setup complete");
    }

    /**
     * Set up the database for testing.
     */
    private void setupDatabase() {
        log.info("Setting up database");
        String dbType = properties.getProperty("database.type", "mysql");

        // Run the appropriate database setup script based on the type
        try {
            String setupScript = getSetupScriptPath(dbType);
            File scriptFile = new File(setupScript);
            
            if (scriptFile.exists()) {
                ProcessBuilder processBuilder = new ProcessBuilder("bash", setupScript);
                processBuilder.inheritIO();
                Process process = processBuilder.start();
                int exitCode = process.waitFor();
                
                if (exitCode != 0) {
                    log.error("Database setup script failed with exit code {}", exitCode);
                } else {
                    log.info("Database setup completed successfully");
                }
            } else {
                log.warn("Database setup script not found: {}", setupScript);
            }
        } catch (IOException | InterruptedException e) {
            log.error("Failed to run database setup script", e);
            Thread.currentThread().interrupt();
        }
    }

    /**
     * Get the path to the database setup script.
     *
     * @param dbType the database type
     * @return the path to the setup script
     */
    private String getSetupScriptPath(String dbType) {
        return properties.getProperty("database.setup.script", 
            Paths.get("scripts", "setup", dbType + "-setup.sh").toString());
    }

    /**
     * Wait for the server to be ready.
     */
    private void waitForServerReady() {
        log.info("Waiting for server to be ready");
        String serverUrl = properties.getProperty("server.url", "https://localhost:8443/fineract-provider/actuator/health");
        int timeoutSeconds = Integer.parseInt(properties.getProperty("server.timeout.seconds", String.valueOf(DEFAULT_TIMEOUT_SECONDS)));

        try {
            Awaitility.await()
                .atMost(Duration.ofSeconds(timeoutSeconds))
                .pollInterval(Duration.ofSeconds(5))
                .until(() -> {
                    try {
                        // Use curl to check server health instead of making direct HTTP call
                        // This avoids adding HTTP client dependencies just for this check
                        ProcessBuilder processBuilder = new ProcessBuilder(
                            "curl", "-k", "-s", "-o", "/dev/null", "-w", "%{http_code}", serverUrl);
                        Process process = processBuilder.start();
                        String output = new String(process.getInputStream().readAllBytes()).trim();
                        process.waitFor();
                        
                        return "200".equals(output) || "301".equals(output) || "302".equals(output);
                    } catch (Exception e) {
                        log.debug("Server not ready yet", e);
                        return false;
                    }
                });
            log.info("Server is ready");
        } catch (Exception e) {
            log.error("Server did not become ready within the timeout period", e);
        }
    }
}