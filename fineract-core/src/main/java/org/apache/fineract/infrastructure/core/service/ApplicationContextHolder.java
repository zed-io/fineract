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
package org.apache.fineract.infrastructure.core.service;

import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

/**
 * Holder for the ApplicationContext that can be used to access Spring beans from non-Spring managed classes.
 */
@Component
public class ApplicationContextHolder implements ApplicationContextAware {

    private static ApplicationContext CONTEXT;

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        CONTEXT = applicationContext;
    }

    /**
     * Gets a bean from the Spring application context by type.
     *
     * @param <T> The type of the bean
     * @param beanClass The class of the bean to get
     * @return The bean instance, or null if no bean of the given type is found
     */
    public static <T> T getBean(Class<T> beanClass) {
        if (CONTEXT == null) {
            return null;
        }
        try {
            return CONTEXT.getBean(beanClass);
        } catch (BeansException e) {
            return null;
        }
    }

    /**
     * Gets a bean from the Spring application context by name.
     *
     * @param <T> The type of the bean
     * @param beanName The name of the bean to get
     * @param beanClass The class of the bean to get
     * @return The bean instance, or null if no bean of the given name is found
     */
    public static <T> T getBean(String beanName, Class<T> beanClass) {
        if (CONTEXT == null) {
            return null;
        }
        try {
            return CONTEXT.getBean(beanName, beanClass);
        } catch (BeansException e) {
            return null;
        }
    }
}