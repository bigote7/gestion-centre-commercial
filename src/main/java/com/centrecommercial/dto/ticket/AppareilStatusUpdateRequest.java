package com.centrecommercial.dto.ticket;

import com.centrecommercial.domain.ticket.AppareilReparationStatus;
import jakarta.validation.constraints.NotNull;

public record AppareilStatusUpdateRequest(
        @NotNull AppareilReparationStatus status
) {}

