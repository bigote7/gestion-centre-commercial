package com.centrecommercial.repository;

import com.centrecommercial.domain.ticket.Ticket;
import com.centrecommercial.domain.ticket.TicketStatus;
import java.time.Instant;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TicketRepository extends JpaRepository<Ticket, Long> {

    Page<Ticket> findByStatus(TicketStatus status, Pageable pageable);

    Page<Ticket> findByRequesterId(Long requesterId, Pageable pageable);

    Page<Ticket> findByAssignedAgentId(Long agentId, Pageable pageable);

    long countByStatus(TicketStatus status);

    @Query("select count(t) from Ticket t where t.createdAt >= :since")
    long countCreatedSince(@Param("since") Instant since);

    List<Ticket> findTop5ByOrderByUpdatedAtDesc();
}

