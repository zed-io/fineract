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
package org.apache.fineract.portfolio.savings.service.notifications;

import java.util.Map;

/**
 * Service interface for managing notification templates for savings accounts
 */
public interface SavingsNotificationTemplateService {

    /**
     * Generates notification content from a template using the given parameters
     *
     * @param event The notification event type
     * @param parameters The template parameters
     * @return The generated notification content
     */
    String generateContentFromTemplate(SavingsNotificationEvent event, Map<String, Object> parameters);
    
    /**
     * Gets the default template content for a given notification event
     *
     * @param event The notification event type
     * @return The default template content
     */
    String getDefaultTemplate(SavingsNotificationEvent event);
    
    /**
     * Updates a custom template for a notification event
     *
     * @param event The notification event type
     * @param templateContent The custom template content
     * @return True if the template was updated successfully
     */
    boolean updateTemplate(SavingsNotificationEvent event, String templateContent);
}