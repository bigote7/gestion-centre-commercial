package com.centrecommercial.controller;

import com.centrecommercial.dto.ticket.AppareilStatusUpdateRequest;
import com.centrecommercial.dto.ticket.TicketAssignRequest;
import com.centrecommercial.dto.ticket.TicketCreateRequest;
import com.centrecommercial.dto.ticket.TicketHistoryResponse;
import com.centrecommercial.dto.ticket.TicketResponse;
import com.centrecommercial.dto.ticket.TicketStatusUpdateRequest;
import com.centrecommercial.service.TicketService;
import com.centrecommercial.security.UserPrincipal;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @GetMapping
    public ResponseEntity<Page<TicketResponse>> list(Pageable pageable,
                                                    @AuthenticationPrincipal UserPrincipal principal) {
        log.debug("Liste des tickets - Page: {}, Size: {}, User: {}", 
                  pageable.getPageNumber(), pageable.getPageSize(), principal != null ? principal.id() : "anonymous");
        try {
            // Si c'est un réparateur (sans être admin), retourner uniquement ses tickets assignés
            if (principal != null && principal.authorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_REPARATEUR")) &&
                principal.authorities().stream()
                    .noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                Page<TicketResponse> result = ticketService.findByAssignedAgent(principal.id(), pageable);
                log.debug("Tickets assignés au réparateur {}: {}", principal.id(), result.getTotalElements());
                return ResponseEntity.ok(result);
            }
            
            Page<TicketResponse> result = ticketService.findAll(pageable);
            log.debug("Tickets trouvés: {} total, {} dans la page", result.getTotalElements(), result.getContent().size());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des tickets", e);
            throw e;
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketResponse> detail(@PathVariable Long id) {
        log.debug("Détail ticket ID: {}", id);
        TicketResponse response = ticketService.findById(id);
        log.debug("Ticket trouvé - ID: {}, Commission: {}, Réparateur: {}", 
                  id, response.commissionPercentage(), response.assignedAgentName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/history")
    public ResponseEntity<List<TicketHistoryResponse>> history(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.history(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_PROPRIETAIRE') or hasAuthority('ROLE_USER')")
    public ResponseEntity<TicketResponse> create(@Valid @RequestBody TicketCreateRequest request,
                                                 @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ticketService.create(principal.id(), request));
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_PROPRIETAIRE')")
    public ResponseEntity<TicketResponse> assign(@PathVariable Long id,
                                                 @Valid @RequestBody TicketAssignRequest request,
                                                 @AuthenticationPrincipal UserPrincipal principal) {
        log.info("Assignation ticket - ID: {}, Réparateur: {}, Commission: {}%", 
                 id, request.agentId(), request.commissionPercentage());
        TicketResponse response = ticketService.assign(id, request, principal.id());
        log.debug("Ticket assigné avec succès - ID: {}, Commission: {}%", id, response.commissionPercentage());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<TicketResponse> changeStatus(@PathVariable Long id,
                                                       @Valid @RequestBody TicketStatusUpdateRequest request,
                                                       @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ticketService.updateStatus(id, request, principal.id()));
    }

    @PutMapping("/{id}/appareil-status")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_REPARATEUR')")
    public ResponseEntity<TicketResponse> updateAppareilStatus(@PathVariable Long id,
                                                               @Valid @RequestBody AppareilStatusUpdateRequest request,
                                                               @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ticketService.updateAppareilStatus(id, request.status(), principal.id()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<TicketResponse> update(@PathVariable Long id,
                                                @Valid @RequestBody TicketCreateRequest request,
                                                @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(ticketService.update(id, request, principal.id()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal UserPrincipal principal) {
        ticketService.delete(id, principal.id());
        return ResponseEntity.noContent().build();
    }
}

