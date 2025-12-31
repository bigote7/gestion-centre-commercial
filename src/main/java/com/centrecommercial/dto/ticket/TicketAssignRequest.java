package com.centrecommercial.dto.ticket;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record TicketAssignRequest(
        @NotNull Long agentId,
        @NotNull 
        @DecimalMin(value = "0.0", message = "Le pourcentage doit être entre 0 et 100")
        BigDecimal commissionPercentage
) {}

