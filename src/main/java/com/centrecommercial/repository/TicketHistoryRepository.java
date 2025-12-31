package com.centrecommercial.repository;

import com.centrecommercial.domain.ticket.TicketHistory;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TicketHistoryRepository extends JpaRepository<TicketHistory, Long> {
    List<TicketHistory> findByTicketIdOrderByCreatedAtAsc(Long ticketId);
}

