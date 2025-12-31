package com.centrecommercial.dto.ticket;

import com.centrecommercial.domain.ticket.TicketStatus;
import jakarta.validation.constraints.NotNull;

public record TicketStatusUpdateRequest(
        @NotNull TicketStatus status,
        String note
) {}

