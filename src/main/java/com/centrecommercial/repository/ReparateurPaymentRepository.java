package com.centrecommercial.repository;

import com.centrecommercial.domain.payment.ReparateurPayment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Repository
public interface ReparateurPaymentRepository extends JpaRepository<ReparateurPayment, Long> {
    
    /**
     * Trouve tous les paiements d'un réparateur
     */
    List<ReparateurPayment> findByReparateurId(Long reparateurId);
    
    /**
     * Trouve les paiements d'un réparateur sur une période
     */
    @Query("SELECT rp FROM ReparateurPayment rp WHERE rp.reparateur.id = :reparateurId " +
           "AND (:dateDebut IS NULL OR rp.datePaiement >= :dateDebut) " +
           "AND (:dateFin IS NULL OR rp.datePaiement <= :dateFin) " +
           "ORDER BY rp.datePaiement DESC")
    List<ReparateurPayment> findByReparateurAndDateRange(
            @Param("reparateurId") Long reparateurId,
            @Param("dateDebut") Instant dateDebut,
            @Param("dateFin") Instant dateFin
    );
    
    /**
     * Calcule le total des paiements effectués à un réparateur
     */
    @Query("SELECT COALESCE(SUM(rp.montant), 0) FROM ReparateurPayment rp " +
           "WHERE rp.reparateur.id = :reparateurId " +
           "AND (:dateDebut IS NULL OR rp.datePaiement >= :dateDebut) " +
           "AND (:dateFin IS NULL OR rp.datePaiement <= :dateFin)")
    BigDecimal calculateTotalPayments(
            @Param("reparateurId") Long reparateurId,
            @Param("dateDebut") Instant dateDebut,
            @Param("dateFin") Instant dateFin
    );
}

