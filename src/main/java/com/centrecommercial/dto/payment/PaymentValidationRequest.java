package com.centrecommercial.dto.payment;

import com.centrecommercial.domain.payment.PaymentStatus;
import jakarta.validation.constraints.NotNull;

public record PaymentValidationRequest(
        @NotNull PaymentStatus status,
        String receiptUrl,
        String notes
) {}

