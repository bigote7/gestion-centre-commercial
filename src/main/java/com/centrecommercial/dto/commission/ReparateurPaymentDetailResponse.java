package com.centrecommercial.dto.commission;

import com.centrecommercial.domain.payment.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;

public record ReparateurPaymentDetailResponse(
        Long commissionId,
        Long ticketId,
        String ticketCode,
        // Informations client
        String clientFirstName,
        String clientLastName,
        // Informations réparation
        String appareilType,
        Instant dateReparation,
        // Informations paiement
        BigDecimal prixTotalPaye,
        BigDecimal pourcentageCommission,
        BigDecimal montantCommission,
        PaymentStatus statutPaiementClient,
        // Statut paiement réparateur
        String statutPaiementReparateur, // PAYE, EN_ATTENTE
        Instant datePaiementReparateur
) {}

