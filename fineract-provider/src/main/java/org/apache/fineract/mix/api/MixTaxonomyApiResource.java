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
package org.apache.fineract.mix.api;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.apache.fineract.infrastructure.security.service.PlatformSecurityContext;
import org.apache.fineract.mix.data.MixTaxonomyData;
import org.apache.fineract.mix.service.MixTaxonomyReadPlatformService;
import org.springframework.stereotype.Component;

@Path("/v1/mixtaxonomy")
@Component
@Tag(name = "Mix Taxonomy", description = "")
@RequiredArgsConstructor
public class MixTaxonomyApiResource {

    private final PlatformSecurityContext context;
    private final MixTaxonomyReadPlatformService readTaxonomyService;

    @GET
    @Consumes({ MediaType.APPLICATION_JSON })
    @Produces({ MediaType.APPLICATION_JSON })
    public List<MixTaxonomyData> retrieveAll() {

        // FIXME - KW - no check for permission to read mix taxonomy data.
        this.context.authenticatedUser();

        return readTaxonomyService.retrieveAll();
    }
}
