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
package org.apache.fineract.organisation.monetary.api;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Created by sanyam on 14/8/17.
 */
public final class CurrenciesApiResourceSwagger {

    private CurrenciesApiResourceSwagger() {

    }

    public static final class CurrencyItem {

        private CurrencyItem() {}

        @Schema(example = "USD")
        public String code;
        @Schema(example = "US Dollar")
        public String name;
        @Schema(example = "2")
        public Integer decimalPlaces;
        @Schema(example = "100")
        public Integer inMultiplesOf;
        @Schema(example = "$")
        public String displaySymbol;
        @Schema(example = "currency.USD")
        public String nameCode;
        @Schema(example = "US Dollar ($)")
        public String displayLabel;
    }

    @Schema(description = "PutCurrenciesResponse")
    public static final class PutCurrenciesResponse {

        private PutCurrenciesResponse() {

        }

        @Schema(example = "[\"KES\",\n" + "        \"BND\",\n" + "        \"LBP\",\n" + "        \"GHC\",\n" + "        \"USD\",\n"
                + "        \"XOF\",\n" + "        \"AED\",\n" + "        \"AMD\"]")
        public String[] currencies;
    }
}
