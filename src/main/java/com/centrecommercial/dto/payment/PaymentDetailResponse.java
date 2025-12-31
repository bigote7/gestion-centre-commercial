package com.centrecommercial.dto.payment;

import com.centrecommercial.domain.payment.PaymentMethod;
import com.centrecommercial.domain.payment.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record PaymentDetailResponse(
        Long id,
        BigDecimal amount,
        String currency,
        PaymentStatus status,
        PaymentMethod method,
        Instant createdAt,
        // Informations client
        Long clientId,
        String clientFirstName,
        String clientLastName,
        // Informations ticket
        Long ticketId,
        String ticketCode,
        String ticketTitle,
        String appareilType, // Type d'appareil réparé (extrait du title ou description)
        BigDecimal totalReparation, // Prix total de la réparation (montant du paiement)
        BigDecimal montantPaye, // Montant payé (amount)
        // Statut calculé
        String statutPaiement // PAYE, NON_PAYE, PARTIEL
) {}

