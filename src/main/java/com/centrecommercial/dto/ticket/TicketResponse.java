package com.centrecommercial.dto.ticket;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.centrecommercial.domain.ticket.AppareilReparationStatus;
import com.centrecommercial.domain.ticket.TicketPriority;
import com.centrecommercial.domain.ticket.TicketStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record TicketResponse(
        Long id,
        String code,
        String title,
        String description,
        TicketStatus status,
        TicketPriority priority,
        AppareilReparationStatus appareilStatus,
        Long requesterId,
        String requesterName,
        Long assignedAgentId,
        String assignedAgentName,
        Instant createdAt,
        Instant updatedAt,
        Instant resolvedAt,
        @JsonFormat(shape = JsonFormat.Shape.STRING)
        BigDecimal commissionPercentage
) {}

