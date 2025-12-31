package com.centrecommercial.dto.payment;

import com.centrecommercial.domain.payment.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record PaymentRequest(
        @NotNull @DecimalMin("0.0") BigDecimal amount,
        String currency,
        PaymentMethod method,
        Long ticketId,
        String notes
) {}

