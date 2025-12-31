import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ticketAPI } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import './MesReparations.css';

function MesReparations() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadMesTickets();
  }, []);

  const loadMesTickets = async () => {
    try {
      const response = await ticketAPI.list();
      // Filtrer les tickets du client connecté
      const mesTickets = response.data.content || [];
      setTickets(mesTickets);
    } catch (err) {
      setError('Impossible de charger vos réparations');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (appareilStatus) => {
    switch (appareilStatus) {
      case 'PAS_COMMENCE':
        return {
          label: 'En attente de prise en charge',
          icon: '⏳',
          color: '#fef3c7',
          textColor: '#92400e',
          progress: 25
        };
      case 'EN_COURS_REPARATION':
        return {
          label: 'Réparation en cours',
          icon: '🔧',
          color: '#dbeafe',
          textColor: '#1e40af',
          progress: 65
        };
      case 'BIEN_REPARE':
        return {
          label: 'Prêt à récupérer',
          icon: '✅',
          color: '#d1fae5',
          textColor: '#065f46',
          progress: 100
        };
      default:
        return {
          label: 'Statut inconnu',
          icon: '❓',
          color: '#f3f4f6',
          textColor: '#6b7280',
          progress: 0
        };
    }
  };

  if (loading) {
    return (
      <div className="mes-reparations-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement de vos réparations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mes-reparations-container">
      <div className="mes-reparations-header">
        <div className="header-content">
          <h1>📱 Mes Réparations</h1>
          <p>Suivez l'avancement de vos appareils en réparation</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}

      {tickets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📱</div>
          <h3>Aucune réparation en cours</h3>
          <p>Vous n'avez pas encore d'appareil en réparation</p>
          <button className="btn-primary" onClick={() => navigate('/tickets/nouveau')}>
            ➕ Demander une réparation
          </button>
        </div>
      ) : (
        <div className="reparations-grid">
          {tickets.map((ticket) => {
            const statusInfo = getStatusInfo(ticket.appareilStatus);
            const isTermine = ticket.appareilStatus === 'BIEN_REPARE';
            const isPaye = ticket.status === 'RESOLU';

            return (
              <div key={ticket.id} className="reparation-card">
                {/* Header */}
                <div className="card-header">
                  <div className="device-icon">📱</div>
                  <div className="device-info">
                    <h3>{ticket.title}</h3>
                    <span className="ticket-code">Ref: {ticket.code}</span>
                  </div>
                  <div 
                    className="status-badge"
                    style={{ 
                      background: statusInfo.color, 
                      color: statusInfo.textColor 
                    }}
                  >
                    <span>{statusInfo.icon}</span>
                    <span>{statusInfo.label}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="progress-section">
                  <div className="progress-header">
                    <span className="progress-label">Progression</span>
                    <span className="progress-percent">{statusInfo.progress}%</span>
                  </div>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar-fill" 
                      style={{ 
                        width: `${statusInfo.progress}%`,
                        background: statusInfo.progress === 100 
                          ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                          : 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)'
                      }}
                    ></div>
                  </div>
                </div>

                {/* Timeline Steps */}
                <div className="timeline-steps">
                  <div className={`timeline-step ${statusInfo.progress >= 25 ? 'completed' : ''}`}>
                    <div className="step-circle">1</div>
                    <div className="step-label">Reçu</div>
                  </div>
                  <div className="step-line"></div>
                  <div className={`timeline-step ${statusInfo.progress >= 65 ? 'completed' : ''}`}>
                    <div className="step-circle">2</div>
                    <div className="step-label">En cours</div>
                  </div>
                  <div className="step-line"></div>
                  <div className={`timeline-step ${statusInfo.progress >= 100 ? 'completed' : ''}`}>
                    <div className="step-circle">3</div>
                    <div className="step-label">Terminé</div>
                  </div>
                </div>

                {/* Details */}
                <div className="card-details">
                  <div className="detail-row">
                    <span className="detail-icon">📅</span>
                    <span className="detail-label">Déposé le</span>
                    <span className="detail-value">
                      {new Date(ticket.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  
                  {ticket.assignedAgentName && (
                    <div className="detail-row">
                      <span className="detail-icon">👨‍🔧</span>
                      <span className="detail-label">Technicien</span>
                      <span className="detail-value">{ticket.assignedAgentName}</span>
                    </div>
                  )}

                  {ticket.resolvedAt && (
                    <div className="detail-row">
                      <span className="detail-icon">✅</span>
                      <span className="detail-label">Terminé le</span>
                      <span className="detail-value">
                        {new Date(ticket.resolvedAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Messages */}
                {!isTermine && !ticket.assignedAgentName && (
                  <div className="status-message waiting">
                    <span className="message-icon">⏳</span>
                    <span>Votre appareil est en attente d'assignation à un technicien</span>
                  </div>
                )}

                {!isTermine && ticket.assignedAgentName && (
                  <div className="status-message progress">
                    <span className="message-icon">🔧</span>
                    <span>
                      {ticket.assignedAgentName} travaille sur votre appareil. 
                      Nous vous informerons dès qu'il sera prêt.
                    </span>
                  </div>
                )}

                {isTermine && !isPaye && (
                  <div className="status-message success">
                    <span className="message-icon">🎉</span>
                    <span>
                      Bonne nouvelle ! Votre appareil est réparé et prêt à être récupéré !
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="card-actions">
                  {isTermine && !isPaye ? (
                    <button 
                      className="btn-payment"
                      onClick={() => navigate(`/client/paiement/${ticket.id}`)}
                    >
                      <span className="btn-icon">💳</span>
                      <span>Procéder au paiement</span>
                    </button>
                  ) : isPaye ? (
                    <div className="payment-complete">
                      <span className="check-icon">✅</span>
                      <span>Paiement effectué - Vous pouvez récupérer votre appareil</span>
                    </div>
                  ) : (
                    <button 
                      className="btn-details"
                      onClick={() => navigate(`/client/suivi/${ticket.id}`)}
                    >
                      <span className="btn-icon">👁️</span>
                      <span>Voir les détails</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MesReparations;

