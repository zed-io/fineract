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
package org.apache.fineract.portfolio.loanproduct.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.Collection;
import lombok.Getter;
import lombok.Setter;
import org.apache.fineract.infrastructure.core.domain.AbstractPersistableCustom;
import org.apache.fineract.portfolio.floatingrates.data.FloatingRateDTO;
import org.apache.fineract.portfolio.floatingrates.data.FloatingRatePeriodData;
import org.apache.fineract.portfolio.floatingrates.domain.FloatingRate;

@Setter
@Getter
@Entity
@Table(name = "m_product_loan_floating_rates")
public class LoanProductFloatingRates extends AbstractPersistableCustom<Long> {

    @OneToOne
    @JoinColumn(name = "loan_product_id", nullable = false)
    private LoanProduct loanProduct;

    @ManyToOne
    @JoinColumn(name = "floating_rates_id", nullable = false)
    private FloatingRate floatingRate;

    @Column(name = "interest_rate_differential", nullable = false)
    private BigDecimal interestRateDifferential;

    @Column(name = "min_differential_lending_rate", nullable = false)
    private BigDecimal minDifferentialLendingRate;

    @Column(name = "default_differential_lending_rate", nullable = false)
    private BigDecimal defaultDifferentialLendingRate;

    @Column(name = "max_differential_lending_rate", nullable = false)
    private BigDecimal maxDifferentialLendingRate;

    @Column(name = "is_floating_interest_rate_calculation_allowed", nullable = false)
    private boolean isFloatingInterestRateCalculationAllowed;

    public LoanProductFloatingRates() {

    }

    public LoanProductFloatingRates(FloatingRate floatingRate, LoanProduct loanProduct, BigDecimal interestRateDifferential,
            BigDecimal minDifferentialLendingRate, BigDecimal maxDifferentialLendingRate, BigDecimal defaultDifferentialLendingRate,
            boolean isFloatingInterestRateCalculationAllowed) {
        this.floatingRate = floatingRate;
        this.loanProduct = loanProduct;
        this.interestRateDifferential = interestRateDifferential;
        this.minDifferentialLendingRate = minDifferentialLendingRate;
        this.maxDifferentialLendingRate = maxDifferentialLendingRate;
        this.defaultDifferentialLendingRate = defaultDifferentialLendingRate;
        this.isFloatingInterestRateCalculationAllowed = isFloatingInterestRateCalculationAllowed;
    }

    public Collection<FloatingRatePeriodData> fetchInterestRates(final FloatingRateDTO floatingRateDTO) {
        floatingRateDTO.addInterestRateDiff(this.interestRateDifferential);
        return floatingRate.fetchInterestRates(floatingRateDTO);

    }

}
