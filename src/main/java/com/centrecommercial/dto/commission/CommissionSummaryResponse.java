package com.centrecommercial.dto.commission;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record CommissionSummaryResponse(
        Long reparateurId,
        String reparateurName,
        String reparateurPhone,
        String specialite,
        long totalTicketsRepares,
        BigDecimal totalReparations,
        BigDecimal totalCommissions,
        BigDecimal totalPaye,
        BigDecimal soldeRestant,
        BigDecimal pourcentageCommission,
        List<ReparationItem> reparations
) {
    public record ReparationItem(
            Long ticketId,
            String ticketCode,
            String clientName,
            String appareil,
            BigDecimal prixReparation,
            Instant dateReparation,
            String status,
            BigDecimal pourcentageCommission, // Pourcentage spécifique de ce ticket
            BigDecimal montantCommission // Montant de commission pour ce ticket
    ) {}
}

