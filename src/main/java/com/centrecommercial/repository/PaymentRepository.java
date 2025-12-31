package com.centrecommercial.repository;

import com.centrecommercial.domain.payment.Payment;
import com.centrecommercial.domain.payment.PaymentStatus;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    List<Payment> findByUserId(Long userId);

    List<Payment> findByTicketId(Long ticketId);

    long countByStatus(PaymentStatus status);

    @Query("select coalesce(sum(p.amount),0) from Payment p where p.status = 'VALIDE'")
    BigDecimal sumOfValidatedPayments();

    @Query("select coalesce(sum(p.amount),0) from Payment p where p.status = 'VALIDE' and p.createdAt >= :since")
    BigDecimal sumValidatedSince(@Param("since") Instant since);

    @Query("SELECT DISTINCT p FROM Payment p " +
           "INNER JOIN FETCH p.user " +
           "LEFT JOIN FETCH p.ticket " +
           "ORDER BY p.createdAt DESC")
    List<Payment> findAllWithDetails();
}

