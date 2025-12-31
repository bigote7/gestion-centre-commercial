import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketAPI } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Loading } from '../Common/Loading';
import { ConfirmModal } from '../Common/ConfirmModal';
import './Tickets.css';

const TicketList = memo(function TicketList() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingTicket, setDeletingTicket] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, hasRole, user } = useAuth();
  const { success, error: showError } = useNotification();
  const isReparateur = hasRole('ROLE_REPARATEUR') && !hasRole('ROLE_ADMIN');
  const isAdmin = hasRole('ROLE_ADMIN');

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        setError('Vous devez être connecté pour voir les tickets.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        loadTickets();
      }
    }
  }, [isAuthenticated, authLoading, navigate]);

  const loadTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await ticketAPI.list({ size: 100, sort: 'createdAt,desc' });
      
      let ticketsData = [];
      if (response.data?.content && Array.isArray(response.data.content)) {
        ticketsData = response.data.content;
      } else if (Array.isArray(response.data)) {
        ticketsData = response.data;
      } else if (response.data?.tickets && Array.isArray(response.data.tickets)) {
        ticketsData = response.data.tickets;
      }
      
      // Le filtrage pour réparateur est maintenant fait côté backend
      // Mais on garde un filtre de sécurité côté frontend au cas où
      if (isReparateur && user?.id) {
        ticketsData = ticketsData.filter(ticket => {
          const assignedId = ticket.assignedAgentId || ticket.assignedAgent?.id;
          return assignedId === user.id;
        });
        
        console.log(`Réparateur ${user.id} - Tickets assignés trouvés:`, ticketsData.length);
        console.log('Détails tickets:', ticketsData.map(t => ({
          id: t.id,
          code: t.code,
          assignedAgentId: t.assignedAgentId,
          assignedAgent: t.assignedAgent
        })));
      }
      
      setTickets(ticketsData);
    } catch (error) {
      console.error('Erreur chargement tickets', error);
      setError('Impossible de charger les tickets.');
      showError('Impossible de charger les tickets.');
    } finally {
      setLoading(false);
    }
  };

  // Memoization des filtres pour éviter les recalculs inutiles
  const pasCommence = useMemo(() => 
    tickets.filter(t => !t.appareilStatus || t.appareilStatus === 'PAS_COMMENCE'),
    [tickets]
  );
  
  const enCoursReparation = useMemo(() => 
    tickets.filter(t => t.appareilStatus === 'EN_COURS_REPARATION'),
    [tickets]
  );
  
  const bienRepare = useMemo(() => 
    tickets.filter(t => t.appareilStatus === 'BIEN_REPARE'),
    [tickets]
  );
  
  const handleDeleteClick = useCallback((ticketId, ticketCode) => {
    if (!isAdmin) {
      showError('Vous n\'avez pas les permissions pour supprimer un ticket.');
      return;
    }
    setTicketToDelete({ id: ticketId, code: ticketCode });
    setShowDeleteModal(true);
  }, [isAdmin, showError]);
  
  const handleDeleteConfirm = useCallback(async () => {
    if (!ticketToDelete) return;

    setDeletingTicket(ticketToDelete.id);
    try {
      await ticketAPI.delete(ticketToDelete.id);
      await loadTickets();
      success(`Ticket #${ticketToDelete.code} supprimé avec succès`);
    } catch (error) {
      console.error('Erreur suppression', error);
      showError('Impossible de supprimer le ticket');
    } finally {
      setDeletingTicket(null);
      setShowDeleteModal(false);
      setTicketToDelete(null);
    }
  }, [ticketToDelete, success, showError, loadTickets]);

  if (loading) {
    return (
      <div className="tickets-container">
        <Loading text="Chargement des tickets..." />
      </div>
    );
  }

  const renderTicketCard = (ticket, index) => {
    const createdAt = ticket.createdAt ? new Date(ticket.createdAt) : null;
    const dateFormatted = createdAt ? createdAt.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }) : '—';

    return (
      <div key={ticket.id} className="ticket-card-column" onClick={() => navigate(`/tickets/${ticket.id}`)}>
        <div className="ticket-card-header">
          <div className="ticket-number-badge">{index + 1}</div>
          <span className="ticket-code-badge">#{ticket.code}</span>
          {isAdmin && (
            <div className="ticket-card-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="card-action-btn"
                onClick={() => handleDeleteClick(ticket.id, ticket.code)}
                disabled={deletingTicket === ticket.id}
                title="Supprimer"
              >
                {deletingTicket === ticket.id ? '⏳' : '🗑️'}
              </button>
            </div>
          )}
        </div>
        <div className="ticket-card-body">
          <div className="ticket-card-client">
            <span className="card-label">👤 Client:</span>
            <span className="card-value">{ticket.requesterName || 'Non spécifié'}</span>
          </div>
          <div className="ticket-card-appareil">
            <span className="card-label">📱 Appareil:</span>
            <span className="card-value">{ticket.title || '—'}</span>
          </div>
          {ticket.description && (
            <div className="ticket-card-description">
              <span className="card-desc-text">{ticket.description.substring(0, 100)}...</span>
            </div>
          )}
          {ticket.assignedAgentName && (
            <div className="ticket-card-technicien">
              <span className="card-label">🔧 Réparateur:</span>
              <span className="card-value-technicien">{ticket.assignedAgentName}</span>
            </div>
          )}
          <div className="ticket-card-date">
            <span className="card-label">📅 Date dépôt:</span>
            <span className="card-value">{dateFormatted}</span>
          </div>
        </div>
        <div className="ticket-card-footer">
          <button 
            className="btn-view-details"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/tickets/${ticket.id}`);
            }}
          >
            👁️ Voir détails
          </button>
        </div>
      </div>
    );
  };

  // Message pour réparateur sans tickets
  if (isReparateur && tickets.length === 0 && !loading) {
    return (
      <div className="tickets-container">
        <div className="tickets-top-bar">
          <div className="top-bar-left">
            <h1 className="page-title">🔧 Mes Interventions</h1>
          </div>
        </div>
        <div className="no-tickets-message">
          <div className="no-tickets-icon">📭</div>
          <h2>Aucun ticket assigné</h2>
          <p>
            Vous n'avez actuellement aucun ticket assigné.
            <br />
            Les tickets vous seront assignés par un administrateur.
            <br />
            <br />
            <strong>Note :</strong> Si un ticket vient d'être créé, il doit d'abord être assigné à votre compte par un administrateur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="tickets-container">
      {/* Barre supérieure */}
      <div className="tickets-top-bar">
        <div className="top-bar-left">
          <h1 className="page-title">
            {isReparateur ? '🔧 Mes Interventions' : '🎫 Gestion des Tickets'}
          </h1>
        </div>
        <div className="top-bar-right">
          {!isReparateur && (
            <button 
              className="btn-create-ticket"
              onClick={() => navigate('/tickets/nouveau')}
            >
              ➕ Créer un ticket
            </button>
          )}
        </div>
      </div>

      {/* 3 Cartes structurées */}
      <div className="tickets-cards-layout">
        {/* Carte 1: Pas encore commencé */}
        <div className="status-column column-pas-commence">
          <div className="column-header">
            <div className="column-icon">1</div>
            <h2 className="column-title">Pas encore commencé</h2>
            <span className="column-count">{pasCommence.length}</span>
          </div>
          <div className="column-content">
            {pasCommence.length === 0 ? (
              <div className="empty-column">
                <span className="empty-icon">📭</span>
                <p>Aucun appareil</p>
              </div>
            ) : (
              pasCommence.map((ticket, index) => renderTicketCard(ticket, index))
            )}
          </div>
        </div>

        {/* Carte 2: En cours de réparation */}
        <div className="status-column column-en-cours">
          <div className="column-header">
            <div className="column-icon">2</div>
            <h2 className="column-title">En cours de réparation</h2>
            <span className="column-count">{enCoursReparation.length}</span>
          </div>
          <div className="column-content">
            {enCoursReparation.length === 0 ? (
              <div className="empty-column">
                <span className="empty-icon">📭</span>
                <p>Aucun appareil</p>
              </div>
            ) : (
              enCoursReparation.map((ticket, index) => renderTicketCard(ticket, index))
            )}
          </div>
        </div>

        {/* Carte 3: Bien réparé */}
        <div className="status-column column-bien-repare">
          <div className="column-header">
            <div className="column-icon">3</div>
            <h2 className="column-title">Bien réparé</h2>
            <span className="column-count">{bienRepare.length}</span>
          </div>
          <div className="column-content">
            {bienRepare.length === 0 ? (
              <div className="empty-column">
                <span className="empty-icon">📭</span>
                <p>Aucun appareil</p>
              </div>
            ) : (
              bienRepare.map((ticket, index) => renderTicketCard(ticket, index))
            )}
          </div>
        </div>
      </div>

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setTicketToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le ticket"
        message={`Êtes-vous sûr de vouloir supprimer le ticket #${ticketToDelete?.code} ?\n\nCette action est irréversible.`}
        confirmText="Oui, supprimer"
        cancelText="Annuler"
        type="danger"
      />
    </div>
  );
});

export default TicketList;
