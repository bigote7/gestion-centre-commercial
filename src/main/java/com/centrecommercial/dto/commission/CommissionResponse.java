package com.centrecommercial.dto.commission;

import java.math.BigDecimal;
import java.time.Instant;

public record CommissionResponse(
        Long id,
        Long ticketId,
        String ticketCode,
        String ticketTitle,
        String clientName,
        String appareil,
        BigDecimal prixReparation,
        BigDecimal commissionAmount,
        BigDecimal pourcentage,
        Instant dateReparation,
        Instant datePaiement,
        String paymentMethod,
        String commentaire,
        String status
) {}

