package com.centrecommercial.controller;

import com.centrecommercial.dto.commission.CommissionResponse;
import com.centrecommercial.dto.commission.CommissionSummaryResponse;
import com.centrecommercial.dto.commission.ReparateurPaymentDetailResponse;
import com.centrecommercial.dto.commission.ReparateurPaymentRequest;
import com.centrecommercial.security.UserPrincipal;
import com.centrecommercial.service.CommissionService;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/commissions")
@RequiredArgsConstructor
public class CommissionController {

    private final CommissionService commissionService;

    @GetMapping("/reparateur/{reparateurId}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_PROPRIETAIRE')")
    public ResponseEntity<List<CommissionResponse>> getByReparateur(
            @PathVariable Long reparateurId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateDebut,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFin) {
        return ResponseEntity.ok(commissionService.findByReparateur(reparateurId, dateDebut, dateFin));
    }

    @GetMapping("/reparateur/{reparateurId}/summary")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_PROPRIETAIRE')")
    public ResponseEntity<CommissionSummaryResponse> getSummary(
            @PathVariable Long reparateurId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateDebut,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFin) {
        return ResponseEntity.ok(commissionService.getSummary(reparateurId, dateDebut, dateFin));
    }

    @PostMapping("/reparateur/{reparateurId}/payment")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_PROPRIETAIRE')")
    public ResponseEntity<CommissionResponse> recordPayment(
            @PathVariable Long reparateurId,
            @Valid @RequestBody ReparateurPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(commissionService.recordReparateurPayment(reparateurId, request, principal.id()));
    }

    @PostMapping("/commission/{commissionId}/pay")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_PROPRIETAIRE')")
    public ResponseEntity<ReparateurPaymentDetailResponse> payCommission(
            @PathVariable Long commissionId,
            @Valid @RequestBody ReparateurPaymentRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(commissionService.payCommission(commissionId, request, principal.id()));
    }

    @GetMapping("/reparateur/{reparateurId}/payments")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_PROPRIETAIRE')")
    public ResponseEntity<List<CommissionResponse>> getPayments(@PathVariable Long reparateurId) {
        return ResponseEntity.ok(commissionService.getReparateurPayments(reparateurId));
    }

    @GetMapping("/my-payments")
    @PreAuthorize("hasAuthority('ROLE_REPARATEUR')")
    public ResponseEntity<List<ReparateurPaymentDetailResponse>> getMyPayments(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false, name = "dateDebut") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateDebut,
            @RequestParam(required = false, name = "dateFin") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFin) {
        try {
            if (principal == null) {
                throw new RuntimeException("Utilisateur non authentifié");
            }
            log.debug("Récupération paiements réparateur - ID: {}, Date début: {}, Date fin: {}", 
                     principal.id(), dateDebut, dateFin);
            List<ReparateurPaymentDetailResponse> result = commissionService.getReparateurPaymentDetails(principal.id(), dateDebut, dateFin);
            log.debug("Paiements trouvés: {}", result.size());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des paiements réparateur", e);
            throw e;
        }
    }

    @GetMapping("/my-summary")
    @PreAuthorize("hasAuthority('ROLE_REPARATEUR')")
    public ResponseEntity<CommissionSummaryResponse> getMySummary(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false, name = "dateDebut") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateDebut,
            @RequestParam(required = false, name = "dateFin") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant dateFin) {
        try {
            if (principal == null) {
                throw new RuntimeException("Utilisateur non authentifié");
            }
            log.debug("Récupération résumé réparateur - ID: {}, Date début: {}, Date fin: {}", 
                     principal.id(), dateDebut, dateFin);
            CommissionSummaryResponse result = commissionService.getSummary(principal.id(), dateDebut, dateFin);
            log.debug("Résumé calculé avec succès - Total commissions: {}", result.totalCommissions());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Erreur lors de la récupération du résumé réparateur", e);
            throw e;
        }
    }

    @GetMapping("/pending-payments")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_PROPRIETAIRE')")
    public ResponseEntity<List<ReparateurPaymentDetailResponse>> getPendingPayments() {
        return ResponseEntity.ok(commissionService.getPendingPayments());
    }
}

