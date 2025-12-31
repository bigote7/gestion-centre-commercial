import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketAPI, paymentAPI } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import './ClientDashboard.css';

function ClientDashboard() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    enCours: 0,
    termines: 0,
    enAttente: 0
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await ticketAPI.list({ size: 100 });
      const mesTickets = response.data.content || [];
      setTickets(mesTickets);
      
      // Calculer les statistiques
      const stats = {
        total: mesTickets.length,
        enCours: mesTickets.filter(t => t.appareilStatus === 'EN_COURS_REPARATION').length,
        termines: mesTickets.filter(t => t.appareilStatus === 'BIEN_REPARE').length,
        enAttente: mesTickets.filter(t => t.appareilStatus === 'PAS_COMMENCE' || !t.appareilStatus).length
      };
      setStats(stats);
    } catch (err) {
      console.error('Erreur chargement', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (appareilStatus) => {
    switch (appareilStatus) {
      case 'PAS_COMMENCE':
        return { label: 'En attente', icon: '⏳', color: '#fef3c7', textColor: '#92400e', progress: 25 };
      case 'EN_COURS_REPARATION':
        return { label: 'En cours', icon: '🔧', color: '#dbeafe', textColor: '#1e40af', progress: 65 };
      case 'BIEN_REPARE':
        return { label: 'Terminé', icon: '✅', color: '#d1fae5', textColor: '#065f46', progress: 100 };
      default:
        return { label: 'Nouveau', icon: '🆕', color: '#f3f4f6', textColor: '#6b7280', progress: 10 };
    }
  };

  const ticketsEnCours = tickets.filter(t => 
    t.appareilStatus === 'EN_COURS_REPARATION' || t.appareilStatus === 'PAS_COMMENCE'
  );
  
  const ticketsTermines = tickets.filter(t => t.appareilStatus === 'BIEN_REPARE');

  if (loading) {
    return (
      <div className="client-dashboard">
        <div className="loading-elegant">
          <div className="loader-ring"></div>
          <p>Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="client-dashboard">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <h1>👋 Bonjour {user?.firstName} !</h1>
          <p>Bienvenue dans votre espace de suivi de réparations</p>
        </div>
        <button className="btn-new-repair" onClick={() => navigate('/tickets/nouveau')}>
          <span className="btn-icon">➕</span>
          <span>Nouvelle réparation</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Réparations Total</div>
          </div>
        </div>

        <div className="stat-card waiting">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.enAttente}</div>
            <div className="stat-label">En attente</div>
          </div>
        </div>

        <div className="stat-card progress">
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <div className="stat-value">{stats.enCours}</div>
            <div className="stat-label">En cours</div>
          </div>
        </div>

        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.termines}</div>
            <div className="stat-label">Terminées</div>
          </div>
        </div>
      </div>

      {/* Réparations en cours */}
      {ticketsEnCours.length > 0 && (
        <section className="dashboard-section">
          <h2 className="section-title">
            <span className="title-icon">🔧</span>
            <span>Réparations en cours</span>
            <span className="title-badge">{ticketsEnCours.length}</span>
          </h2>
          
          <div className="tickets-list">
            {ticketsEnCours.map((ticket) => {
              const statusInfo = getStatusInfo(ticket.appareilStatus);
              
              return (
                <div key={ticket.id} className="ticket-card-modern" onClick={() => navigate(`/client/suivi/${ticket.id}`)}>
                  <div className="ticket-header-modern">
                    <div className="device-badge">
                      <span className="device-icon-large">📱</span>
                      <div className="device-info-modern">
                        <h3>{ticket.title}</h3>
                        <span className="ticket-ref">#{ticket.code}</span>
                      </div>
                    </div>
                    <div 
                      className="status-pill"
                      style={{ background: statusInfo.color, color: statusInfo.textColor }}
                    >
                      {statusInfo.icon} {statusInfo.label}
                    </div>
                  </div>

                  <div className="ticket-body-modern">
                    {/* Progress Bar */}
                    <div className="progress-modern">
                      <div className="progress-info">
                        <span>Progression</span>
                        <span className="progress-value">{statusInfo.progress}%</span>
                      </div>
                      <div className="progress-track">
                        <div 
                          className="progress-fill-animated" 
                          style={{ width: `${statusInfo.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Info rapide */}
                    <div className="quick-info">
                      {ticket.assignedAgentName ? (
                        <div className="info-item">
                          <span className="info-icon">👨‍🔧</span>
                          <span className="info-text">
                            <strong>{ticket.assignedAgentName}</strong> s'occupe de votre appareil
                          </span>
                        </div>
                      ) : (
                        <div className="info-item waiting-assignment">
                          <span className="info-icon">⏳</span>
                          <span className="info-text">En attente d'assignation</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="ticket-footer-modern">
                    <span className="footer-date">
                      📅 Déposé le {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="footer-arrow">→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Réparations terminées */}
      {ticketsTermines.length > 0 && (
        <section className="dashboard-section">
          <h2 className="section-title">
            <span className="title-icon">✅</span>
            <span>Réparations terminées</span>
            <span className="title-badge success">{ticketsTermines.length}</span>
          </h2>
          
          <div className="tickets-grid-compact">
            {ticketsTermines.map((ticket) => {
              const isPaye = ticket.status === 'RESOLU';
              
              return (
                <div key={ticket.id} className="ticket-card-compact">
                  <div className="compact-header">
                    <span className="compact-icon">✅</span>
                    <div className="compact-info">
                      <h4>{ticket.title}</h4>
                      <span className="compact-ref">#{ticket.code}</span>
                    </div>
                  </div>

                  <div className="compact-body">
                    <div className="compact-detail">
                      <span>📅 Terminé le</span>
                      <strong>
                        {ticket.resolvedAt 
                          ? new Date(ticket.resolvedAt).toLocaleDateString('fr-FR')
                          : new Date(ticket.updatedAt).toLocaleDateString('fr-FR')
                        }
                      </strong>
                    </div>
                  </div>

                  {isPaye ? (
                    <div className="compact-footer paid">
                      <span className="footer-icon">💳</span>
                      <span>Payé - Prêt à récupérer</span>
                    </div>
                  ) : (
                    <button 
                      className="btn-compact-payment"
                      onClick={() => navigate(`/client/paiement/${ticket.id}`)}
                    >
                      💳 Payer maintenant
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Empty State */}
      {tickets.length === 0 && (
        <div className="empty-state-elegant">
          <div className="empty-illustration">
            <div className="empty-circle">📱</div>
          </div>
          <h3>Aucune réparation pour le moment</h3>
          <p>Déposez votre premier appareil pour commencer</p>
          <button className="btn-cta" onClick={() => navigate('/tickets/nouveau')}>
            <span className="cta-icon">✨</span>
            <span>Démarrer une réparation</span>
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="quick-actions-section">
        <h3>⚡ Actions rapides</h3>
        <div className="quick-actions-grid">
          <button className="quick-action-btn" onClick={() => navigate('/tickets/nouveau')}>
            <span className="qa-icon">➕</span>
            <span className="qa-label">Nouvelle réparation</span>
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/client/historique')}>
            <span className="qa-icon">📜</span>
            <span className="qa-label">Historique complet</span>
          </button>
          <button className="quick-action-btn" onClick={() => navigate('/client/profil')}>
            <span className="qa-icon">👤</span>
            <span className="qa-label">Mon profil</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClientDashboard;






