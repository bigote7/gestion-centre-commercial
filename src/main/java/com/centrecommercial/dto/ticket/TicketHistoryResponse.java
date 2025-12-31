package com.centrecommercial.dto.ticket;

import java.time.Instant;

public record TicketHistoryResponse(
        Long id,
        String action,
        String fromStatus,
        String toStatus,
        String actor,
        String note,
        Instant createdAt
) {}

