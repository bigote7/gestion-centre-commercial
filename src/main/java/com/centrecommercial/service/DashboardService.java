package com.centrecommercial.service;

import com.centrecommercial.domain.ticket.TicketStatus;
import com.centrecommercial.dto.dashboard.DashboardResponse;
import com.centrecommercial.repository.PaymentRepository;
import com.centrecommercial.repository.TicketRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TicketRepository ticketRepository;
    private final PaymentRepository paymentRepository;

    public DashboardResponse snapshot() {
        long enAttente = ticketRepository.countByStatus(TicketStatus.EN_ATTENTE);
        long enCours = ticketRepository.countByStatus(TicketStatus.EN_COURS);
        long resolu = ticketRepository.countByStatus(TicketStatus.RESOLU);
        long rejete = ticketRepository.countByStatus(TicketStatus.REJETE);

        BigDecimal montantTotal = paymentRepository.sumOfValidatedPayments();
        if (montantTotal == null) {
            montantTotal = BigDecimal.ZERO;
        }

        Map<Instant, Long> actions = new LinkedHashMap<>();
        ticketRepository.findTop5ByOrderByUpdatedAtDesc()
                .forEach(ticket -> actions.put(ticket.getUpdatedAt(), ticket.getId()));

        return new DashboardResponse(
                enAttente,
                enCours,
                resolu,
                rejete,
                montantTotal,
                List.of(),
                actions
        );
    }
}

