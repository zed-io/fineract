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
package org.apache.fineract.portfolio.savings.api;

import java.math.BigDecimal;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Created to facilitate Swagger documentation generation for the fixed deposit interest posting endpoints.
 */
final class FixedDepositInterestPostingApiResourceSwagger {
    private FixedDepositInterestPostingApiResourceSwagger() {}
    
    @Schema(description = "PostInterestRequest")
    public static final class PostInterestRequest {
        private PostInterestRequest() {}
        
        @Schema(example = "2023-12-31")
        public String postingDate;
    }
    
    @Schema(description = "PostInterestResponse")
    public static final class PostInterestResponse {
        private PostInterestResponse() {}
        
        @Schema(example = "1")
        public Long accountId;
        
        @Schema(example = "100.00")
        public BigDecimal interestPosted;
        
        @Schema(example = "2023-12-31")
        public String postingDate;
    }
    
    @Schema(description = "CalculateMaturityRequest")
    public static final class CalculateMaturityRequest {
        private CalculateMaturityRequest() {}
        
        @Schema(example = "false", description = "Whether this is a premature closure calculation")
        public Boolean isPreMatureClosure;
    }
    
    @Schema(description = "MaturityResponse")
    public static final class MaturityResponse {
        private MaturityResponse() {}
        
        @Schema(example = "1")
        public Long accountId;
        
        @Schema(example = "1050.00")
        public BigDecimal maturityAmount;
        
        @Schema(example = "2023-12-31")
        public String maturityDate;
        
        @Schema(example = "false")
        public Boolean isPreMatureClosure;
    }
    
    @Schema(description = "ProcessMaturityResponse")
    public static final class ProcessMaturityResponse {
        private ProcessMaturityResponse() {}
        
        @Schema(example = "1")
        public Long accountId;
        
        @Schema(example = "true")
        public Boolean success;
    }
}