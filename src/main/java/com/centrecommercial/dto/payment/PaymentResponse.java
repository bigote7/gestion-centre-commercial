package com.centrecommercial.dto.payment;

import com.centrecommercial.domain.payment.PaymentMethod;
import com.centrecommercial.domain.payment.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record PaymentResponse(
        Long id,
        BigDecimal amount,
        String currency,
        PaymentStatus status,
        PaymentMethod method,
        Long ticketId,
        Long userId,
        Long validatedBy,
        Instant validatedAt,
        String receiptUrl,
        String notes,
        Instant createdAt
) {}

