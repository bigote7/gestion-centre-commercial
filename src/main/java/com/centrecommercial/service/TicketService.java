package com.centrecommercial.service;

import com.centrecommercial.domain.ticket.AppareilReparationStatus;
import com.centrecommercial.domain.ticket.Ticket;
import com.centrecommercial.domain.ticket.TicketHistory;
import com.centrecommercial.domain.ticket.TicketPriority;
import com.centrecommercial.domain.ticket.TicketStatus;
import com.centrecommercial.domain.user.User;
import com.centrecommercial.dto.ticket.TicketAssignRequest;
import com.centrecommercial.dto.ticket.TicketCreateRequest;
import com.centrecommercial.dto.ticket.TicketHistoryResponse;
import com.centrecommercial.dto.ticket.TicketResponse;
import com.centrecommercial.dto.ticket.TicketStatusUpdateRequest;
import com.centrecommercial.exception.BusinessException;
import com.centrecommercial.exception.NotFoundException;
import com.centrecommercial.repository.TicketHistoryRepository;
import com.centrecommercial.repository.TicketRepository;
import com.centrecommercial.repository.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class TicketService {

    private final TicketRepository ticketRepository;
    private final TicketHistoryRepository ticketHistoryRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public Page<TicketResponse> findAll(Pageable pageable) {
        log.debug("Recherche de tous les tickets - Page: {}, Size: {}", pageable.getPageNumber(), pageable.getPageSize());
        try {
            Page<Ticket> tickets = ticketRepository.findAll(pageable);
            log.debug("Tickets récupérés: {} sur {}", tickets.getContent().size(), tickets.getTotalElements());
            Page<TicketResponse> result = tickets.map(this::toResponse);
            return result;
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des tickets", e);
            throw e;
        }
    }

    @Transactional(readOnly = true)
    public Page<TicketResponse> findByAssignedAgent(Long agentId, Pageable pageable) {
        Page<Ticket> tickets = ticketRepository.findByAssignedAgentId(agentId, pageable);
        return tickets.map(this::toResponse);
    }

    @Cacheable(value = "ticketDetails", key = "#id")
    @Transactional(readOnly = true)
    public TicketResponse findById(Long id) {
        log.debug("Recherche ticket ID: {}", id);
        Ticket ticket = getById(id);
        log.debug("Ticket trouvé: ID={}, Code={}, Commission={}", 
                  ticket.getId(), ticket.getCode(), ticket.getCommissionPercentage());
        return toResponse(ticket);
    }

    @Transactional(readOnly = true)
    public List<TicketHistoryResponse> history(Long ticketId) {
        return ticketHistoryRepository.findByTicketIdOrderByCreatedAtAsc(ticketId).stream()
                .map(history -> new TicketHistoryResponse(
                        history.getId(),
                        history.getAction(),
                        history.getFromStatus(),
                        history.getToStatus(),
                        history.getActor() != null ? history.getActor().getFirstName() + " " + history.getActor().getLastName() : null,
                        history.getNote(),
                        history.getCreatedAt()
                ))
                .toList();
    }

    @CacheEvict(value = {"tickets", "ticketDetails"}, allEntries = true)
    @Transactional
    public TicketResponse create(Long requesterId, TicketCreateRequest request) {
        log.debug("Création d'un nouveau ticket par utilisateur ID: {}", requesterId);
        User requester = getUser(requesterId);
        Ticket ticket = new Ticket();
        ticket.setCode(UUID.randomUUID().toString());
        ticket.setTitle(request.title());
        ticket.setDescription(request.description());
        ticket.setPriority(request.priority() != null ? request.priority() : TicketPriority.MOYENNE);
        ticket.setRequester(requester);
        
        // Le pourcentage de commission sera défini lors de l'assignation du réparateur
        // On ne le stocke pas à la création
        
        ticketRepository.save(ticket);
        saveHistory(ticket, requester, "CREATION", null, ticket.getStatus().name(), null);
        log.info("Ticket créé avec succès: ID={}, Code={}", ticket.getId(), ticket.getCode());
        return toResponse(ticket);
    }

    @Transactional
    public TicketResponse assign(Long ticketId, TicketAssignRequest request, Long actorId) {
        Ticket ticket = getById(ticketId);
        User agent = getUser(request.agentId());
        User actor = getUser(actorId);
        
        // Vérifier que le pourcentage est valide (entre 0 et 100)
        if (request.commissionPercentage().compareTo(java.math.BigDecimal.ZERO) < 0 || 
            request.commissionPercentage().compareTo(new java.math.BigDecimal("100.00")) > 0) {
            throw new BusinessException("Le pourcentage de commission doit être entre 0% et 100%");
        }
        
        // Assigner le réparateur
        ticket.setAssignedAgent(agent);
        
        // Stocker le pourcentage de commission
        ticket.setCommissionPercentage(request.commissionPercentage());
        log.debug("Commission Percentage défini: {}% pour ticket ID: {}", request.commissionPercentage(), ticketId);
        
        // Passer automatiquement le statut du ticket en EN_COURS
        TicketStatus previousStatus = ticket.getStatus();
        if (previousStatus == TicketStatus.EN_ATTENTE) {
            ticket.setStatus(TicketStatus.EN_COURS);
        }
        
        // Passer automatiquement le statut de l'appareil en EN_COURS_REPARATION
        AppareilReparationStatus previousAppareilStatus = ticket.getAppareilStatus();
        if (previousAppareilStatus == null || previousAppareilStatus == AppareilReparationStatus.PAS_COMMENCE) {
            ticket.setAppareilStatus(AppareilReparationStatus.EN_COURS_REPARATION);
        }
        
        ticketRepository.save(ticket);
        ticketRepository.flush();
        
        log.debug("Ticket assigné - ID: {}, Réparateur: {}, Commission: {}%", 
                  ticketId, agent.getId(), request.commissionPercentage());
        
        // Enregistrer dans l'historique
        String note = "Assigné à " + agent.getFirstName() + " " + agent.getLastName() +
                     " avec " + request.commissionPercentage() + "% de commission" +
                     " - Statut appareil passé automatiquement à EN_COURS_REPARATION";
        saveHistory(ticket, actor, "ASSIGNATION", previousStatus.name(), ticket.getStatus().name(), note);

        TicketResponse response = toResponse(ticket);
        log.info("Ticket assigné avec succès: ID={}, Réparateur={}, Commission={}%", 
                 ticketId, agent.getId(), request.commissionPercentage());
        return response;
    }

    @CacheEvict(value = "ticketDetails", key = "#ticketId")
    @Transactional
    public TicketResponse updateStatus(Long ticketId, TicketStatusUpdateRequest request, Long actorId) {
        log.debug("Mise à jour statut ticket ID: {} - {} -> {}", ticketId, ticketRepository.findById(ticketId).map(t -> t.getStatus()).orElse(null), request.status());
        Ticket ticket = getById(ticketId);
        TicketStatus previous = ticket.getStatus();
        ticket.setStatus(request.status());
        if (request.status() == TicketStatus.RESOLU && ticket.getResolvedAt() == null) {
            ticket.setResolvedAt(Instant.now());
        }
        ticketRepository.save(ticket);
        User actor = getUser(actorId);
        saveHistory(ticket, actor, "STATUS_CHANGE", previous.name(), request.status().name(), request.note());
        log.info("Statut ticket mis à jour: ID={}, {} -> {}", ticketId, previous, request.status());
        return toResponse(ticket);
    }

    @CacheEvict(value = "ticketDetails", key = "#ticketId")
    @Transactional
    public TicketResponse updateAppareilStatus(Long ticketId, AppareilReparationStatus status, Long actorId) {
        log.debug("Mise à jour statut appareil ticket ID: {} -> {}", ticketId, status);
        Ticket ticket = getById(ticketId);
        AppareilReparationStatus previous = ticket.getAppareilStatus();
        ticket.setAppareilStatus(status);
        ticketRepository.save(ticket);
        
        User actor = getUser(actorId);
        saveHistory(ticket, actor, "APPAREIL_STATUS_CHANGE", 
                    previous != null ? previous.name() : null, 
                    status.name(), 
                    "Statut appareil mis à jour");
        log.info("Statut appareil mis à jour: Ticket ID={}, {} -> {}", ticketId, previous, status);
        return toResponse(ticket);
    }

    @CacheEvict(value = "ticketDetails", key = "#ticketId")
    @Transactional
    public TicketResponse update(Long ticketId, TicketCreateRequest request, Long actorId) {
        log.debug("Mise à jour ticket ID: {}", ticketId);
        Ticket ticket = getById(ticketId);
        ticket.setTitle(request.title());
        ticket.setDescription(request.description());
        if (request.priority() != null) {
            ticket.setPriority(request.priority());
        }
        ticketRepository.save(ticket);
        User actor = getUser(actorId);
        saveHistory(ticket, actor, "UPDATE", ticket.getStatus().name(), ticket.getStatus().name(), "Ticket modifié");
        log.info("Ticket mis à jour: ID={}", ticketId);
        return toResponse(ticket);
    }

    @Transactional
    public void delete(Long ticketId, Long actorId) {
        Ticket ticket = getById(ticketId);
        ticketRepository.delete(ticket);
    }

    private void saveHistory(Ticket ticket, User actor, String action, String from, String to, String note) {
        TicketHistory history = new TicketHistory();
        history.setTicket(ticket);
        history.setActor(actor);
        history.setAction(action);
        history.setFromStatus(from);
        history.setToStatus(to);
        history.setNote(note);
        ticketHistoryRepository.save(history);
    }

    private Ticket getById(Long id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Ticket introuvable"));
    }

    private User getUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
    }

    private TicketResponse toResponse(Ticket ticket) {
        log.trace("Conversion Ticket en TicketResponse - ID: {}, Commission: {}", 
                  ticket.getId(), ticket.getCommissionPercentage());
        
        return new TicketResponse(
                ticket.getId(),
                ticket.getCode(),
                ticket.getTitle(),
                ticket.getDescription(),
                ticket.getStatus(),
                ticket.getPriority(),
                ticket.getAppareilStatus() != null ? ticket.getAppareilStatus() : AppareilReparationStatus.PAS_COMMENCE,
                ticket.getRequester() != null ? ticket.getRequester().getId() : null,
                ticket.getRequester() != null ? ticket.getRequester().getFirstName() + " " + ticket.getRequester().getLastName() : null,
                ticket.getAssignedAgent() != null ? ticket.getAssignedAgent().getId() : null,
                ticket.getAssignedAgent() != null ? ticket.getAssignedAgent().getFirstName() + " " + ticket.getAssignedAgent().getLastName() : null,
                ticket.getCreatedAt(),
                ticket.getUpdatedAt(),
                ticket.getResolvedAt(),
                ticket.getCommissionPercentage() // Inclure le pourcentage de commission du ticket
        );
    }
}
