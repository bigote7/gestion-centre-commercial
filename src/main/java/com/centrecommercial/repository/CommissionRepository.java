package com.centrecommercial.repository;

import com.centrecommercial.domain.commission.Commission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CommissionRepository extends JpaRepository<Commission, Long> {
    List<Commission> findByPaymentId(Long paymentId);
    List<Commission> findByReparateurId(Long reparateurId);
    List<Commission> findByProprietaireId(Long proprietaireId);
    
    @Query("SELECT DISTINCT c FROM Commission c " +
           "INNER JOIN FETCH c.payment p " +
           "LEFT JOIN FETCH p.ticket t " +
           "LEFT JOIN FETCH t.requester " +
           "WHERE c.reparateur.id = :reparateurId " +
           "ORDER BY c.createdAt DESC")
    List<Commission> findByReparateurIdWithDetails(@Param("reparateurId") Long reparateurId);
}

