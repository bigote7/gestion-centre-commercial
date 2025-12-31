package com.centrecommercial.dto.dashboard;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

public record DashboardResponse(
        long ticketsEnAttente,
        long ticketsEnCours,
        long ticketsResolus,
        long ticketsRejetes,
        BigDecimal montantTotal,
        List<TopUser> topUtilisateurs,
        Map<Instant, Long> actions30Jours
) {
    public record TopUser(Long userId, String fullName, long ticketsResolus) {}
}

