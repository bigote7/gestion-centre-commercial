import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { commissionAPI, userAPI, ticketAPI, paymentAPI } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useUsers } from '../../hooks/useUsers';
import { Loading } from '../Common/Loading';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/calculations';
import './Commissions.css';

function CommissionReparateur() {
  const [selectedReparateur, setSelectedReparateur] = useState(null);
  const [summary, setSummary] = useState(null);
  const [ticketsRepares, setTicketsRepares] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    montant: '',
    modePaiement: 'CASH',
    commentaire: ''
  });
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { success, error: showError } = useNotification();
  const isAdmin = hasRole('ROLE_ADMIN');
  const isProprietaire = hasRole('ROLE_PROPRIETAIRE') || isAdmin;

  // Utiliser le hook useUsers pour charger les réparateurs
  const { users: reparateurs, loading: reparateursLoading } = useUsers('reparateurs');

  useEffect(() => {
    if (reparateurs.length > 0 && !selectedReparateur) {
      setSelectedReparateur(reparateurs[0].id);
    }
  }, [reparateurs]);

  useEffect(() => {
    if (selectedReparateur) {
      loadCommissionData();
    }
  }, [selectedReparateur, dateDebut, dateFin]);

  const loadCommissionData = async () => {
    if (!selectedReparateur) return;

    setLoading(true);
    try {
      const params = {};
      if (dateDebut) params.dateDebut = new Date(dateDebut).toISOString();
      if (dateFin) params.dateFin = new Date(dateFin + 'T23:59:59').toISOString();

      // Charger le résumé et les paiements
      const [summaryRes, paymentsRes] = await Promise.all([
        commissionAPI.getSummary(selectedReparateur, params).catch(() => ({ data: null })),
        commissionAPI.getPayments(selectedReparateur).catch(() => ({ data: [] }))
      ]);

      setSummary(summaryRes.data);
      setPayments(paymentsRes.data || []);

      // Utiliser les réparations du résumé qui contient déjà toutes les informations nécessaires
      const reparations = summaryRes.data?.reparations || [];
      
      // Enrichir avec les informations de paiement et calculer les commissions
      // Chaque ticket a son propre pourcentage de commission défini par le propriétaire
      const ticketsEnrichis = reparations.map(rep => {
        const payment = paymentsRes.data?.find(p => p.ticketId === rep.ticketId && p.status === 'VALIDE');
        const montant = parseFloat(rep.prixReparation) || 0;
        // Utiliser le pourcentage spécifique de ce ticket (défini par le propriétaire lors de l'assignation)
        const commissionPct = rep.pourcentageCommission ? parseFloat(rep.pourcentageCommission) : 
                             (summaryRes.data?.pourcentageCommission ? parseFloat(summaryRes.data.pourcentageCommission) : 30);
        // Utiliser le montant de commission déjà calculé depuis le backend (basé sur le pourcentage du ticket)
        const commission = rep.montantCommission ? parseFloat(rep.montantCommission) : 
                          (montant * commissionPct / 100);
        const revenuProprietaire = montant - commission;

        return {
          id: rep.ticketId,
          code: rep.ticketCode,
          title: rep.appareil,
          description: '',
          requesterName: rep.clientName,
          status: rep.status,
          appareilStatus: 'BIEN_REPARE',
          montant,
          commission,
          commissionPct,
          revenuProprietaire,
          estPaye: !!payment,
          datePaiement: payment ? new Date(payment.datePaiement || payment.createdAt) : null,
          paymentStatus: payment ? 'PAYE' : 'EN_ATTENTE',
          resolvedAt: rep.dateReparation,
          createdAt: rep.dateReparation
        };
      });

      setTicketsRepares(ticketsEnrichis);
    } catch (error) {
      console.error('Erreur chargement données commission', error);
      showError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReparateur) return;

    try {
      await commissionAPI.recordPayment(selectedReparateur, {
        montant: parseFloat(paymentData.montant),
        modePaiement: paymentData.modePaiement,
        commentaire: paymentData.commentaire
      });
      
      setShowPaymentModal(false);
      setPaymentData({ montant: '', modePaiement: 'CASH', commentaire: '' });
      await loadCommissionData();
      success('Paiement enregistré avec succès');
    } catch (error) {
      console.error('Erreur enregistrement paiement', error);
      showError('Impossible d\'enregistrer le paiement');
    }
  };

  const handleApplyPeriod = () => {
    loadCommissionData();
  };

  // Calculs
  const totalReparations = summary?.totalReparations || 
    ticketsRepares.reduce((sum, t) => sum + t.montant, 0);
  const totalCommissions = summary?.totalCommissions || 
    ticketsRepares.reduce((sum, t) => sum + t.commission, 0);
  const totalPaye = summary?.totalPaye || 0;
  // S'assurer que le solde restant n'est jamais négatif
  const soldeRestantCalcul = summary?.soldeRestant || (totalCommissions - totalPaye);
  const soldeRestant = Math.max(0, parseFloat(soldeRestantCalcul) || 0);
  // Pourcentage moyen pondéré (affiché à titre informatif)
  const pourcentage = summary?.pourcentageCommission || 30;

  const reparateur = reparateurs.find(r => r.id === selectedReparateur);

  // Filtrage des tickets
  const filteredTickets = ticketsRepares.filter(ticket => {
    const matchesSearch = !searchQuery || 
      (ticket.requesterName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.code || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'ALL' || 
      ticket.paymentStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  if (reparateursLoading) {
    return <Loading fullScreen text="Chargement des réparateurs..." />;
  }

  if (!isProprietaire) {
    return (
      <div className="commissions-container">
        <div className="access-denied">
          <h2>❌ Accès refusé</h2>
          <p>Cette page est réservée aux propriétaires et administrateurs.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="commissions-container">
      {/* En-tête */}
      <div className="commissions-header">
        <div>
          <h1 className="page-title-premium">
            <span className="title-icon">💰</span>
            Gestion des Commissions - Réparateurs
          </h1>
          <p className="page-subtitle">
            Consultez les appareils réparés et gérez les paiements des réparateurs
          </p>
        </div>
      </div>

      {/* Sélection du réparateur */}
      <div className="reparateur-selector-card">
        <label className="selector-label">👤 Sélectionner un réparateur</label>
        <select
          value={selectedReparateur || ''}
          onChange={(e) => setSelectedReparateur(Number(e.target.value))}
          className="reparateur-select"
        >
          <option value="">Choisir un réparateur...</option>
          {reparateurs.map((rep) => (
            <option key={rep.id} value={rep.id}>
              {rep.firstName} {rep.lastName} {rep.phone ? `- ${rep.phone}` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedReparateur && (
        <>
          {/* Informations du Réparateur */}
          <div className="reparateur-info-card">
            <div className="card-header-premium">
              <h2>👤 Informations du Réparateur</h2>
            </div>
            <div className="reparateur-info-grid">
              <div className="info-item">
                <span className="info-label">Nom complet</span>
                <span className="info-value">{reparateur?.firstName} {reparateur?.lastName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Téléphone</span>
                <span className="info-value">{reparateur?.phone || 'Non spécifié'}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email</span>
                <span className="info-value">{reparateur?.email || 'Non spécifié'}</span>
              </div>
              <div className="info-item highlight-item">
                <span className="info-label">Total appareils réparés</span>
                <span className="info-value highlight">{ticketsRepares.length}</span>
              </div>
              <div className="info-item highlight-item">
                <span className="info-label">Total commissions</span>
                <span className="info-value highlight-gold">{formatCurrency(totalCommissions)}</span>
              </div>
              <div className="info-item highlight-item">
                <span className="info-label">Solde restant</span>
                <span className="info-value highlight-gold">{formatCurrency(soldeRestant)}</span>
              </div>
            </div>
          </div>

          {/* Filtres et recherche */}
          <div className="filters-section">
            <div className="period-filter-card">
              <div className="card-header-premium">
                <h2>📅 Filtres de Période</h2>
              </div>
              <div className="period-filters">
                <div className="period-filter-group">
                  <label className="filter-label-premium">Du</label>
                  <input
                    type="date"
                    value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="filter-input-premium"
                  />
                </div>
                <div className="period-filter-group">
                  <label className="filter-label-premium">Au</label>
                  <input
                    type="date"
                    value={dateFin}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="filter-input-premium"
                  />
                </div>
                <button className="btn-apply-period" onClick={handleApplyPeriod}>
                  🔍 Appliquer
                </button>
              </div>
            </div>

            <div className="search-filter-card">
              <div className="search-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Rechercher par client, appareil, code ticket..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input-premium"
                />
              </div>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select-premium"
              >
                <option value="ALL">Tous les statuts de paiement</option>
                <option value="PAYE">Payé</option>
                <option value="EN_ATTENTE">En attente</option>
              </select>
            </div>
          </div>

          {/* Résumé financier */}
          <div className="summary-card-premium">
            <div className="card-header-premium">
              <h2>📊 Résumé Financier</h2>
            </div>
            <div className="summary-grid">
              <div className="summary-item">
                <div className="summary-icon">💵</div>
                <div className="summary-content">
                  <div className="summary-label">Total réparations</div>
                  <div className="summary-value">{formatCurrency(totalReparations)}</div>
                </div>
              </div>
              <div className="summary-item summary-commission">
                <div className="summary-icon">💰</div>
                <div className="summary-content">
                  <div className="summary-label">Commission (moyenne: {parseFloat(pourcentage).toFixed(1)}%)</div>
                  <div className="summary-value highlight-gold">{formatCurrency(totalCommissions)}</div>
                  <div className="summary-hint" style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                    Chaque appareil a son propre %
                  </div>
                </div>
              </div>
              <div className="summary-item summary-rest">
                <div className="summary-icon">🏪</div>
                <div className="summary-content">
                  <div className="summary-label">Votre revenu</div>
                  <div className="summary-value">{formatCurrency(totalReparations - totalCommissions)}</div>
                </div>
              </div>
              <div className="summary-item summary-payed">
                <div className="summary-icon">✅</div>
                <div className="summary-content">
                  <div className="summary-label">Déjà payé</div>
                  <div className="summary-value">{formatCurrency(totalPaye)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Liste des appareils réparés */}
          <div className="reparations-table-card">
            <div className="card-header-premium">
              <h2>✅ Appareils Réparés ({filteredTickets.length})</h2>
            </div>
            
            {loading ? (
              <Loading text="Chargement des appareils..." />
            ) : filteredTickets.length === 0 ? (
              <div className="no-data-content-premium">
                <span className="no-data-icon">📭</span>
                <p>Aucun appareil réparé trouvé pour ce réparateur</p>
              </div>
            ) : (
              <div className="appareils-grid">
                {filteredTickets.map((ticket) => (
                  <div key={ticket.id} className="appareil-card">
                    <div className="appareil-card-header">
                      <div className="ticket-code-badge">#{ticket.code}</div>
                      <span className={`status-badge-premium ${ticket.estPaye ? 'status-paye' : 'status-en-attente'}`}>
                        {ticket.estPaye ? '✅ Payé' : '⏳ En attente'}
                      </span>
                    </div>
                    
                    <div className="appareil-card-body">
                      <div className="appareil-info-row">
                        <span className="info-label-small">👤 Client</span>
                        <span className="info-value-small">{ticket.requesterName || 'Non spécifié'}</span>
                      </div>
                      
                      <div className="appareil-info-row">
                        <span className="info-label-small">📱 Appareil</span>
                        <span className="info-value-small">{ticket.title}</span>
                      </div>
                      
                      {ticket.description && (
                        <div className="appareil-info-row">
                          <span className="info-label-small">📝 Description</span>
                          <span className="info-value-small description-text">
                            {ticket.description.length > 100 
                              ? `${ticket.description.substring(0, 100)}...` 
                              : ticket.description}
                          </span>
                        </div>
                      )}
                      
                      <div className="appareil-info-row">
                        <span className="info-label-small">📅 Date réparation</span>
                        <span className="info-value-small">
                          {formatDate(ticket.resolvedAt || ticket.updatedAt)}
                        </span>
                      </div>
                      
                      {ticket.datePaiement && (
                        <div className="appareil-info-row">
                          <span className="info-label-small">💳 Date paiement</span>
                          <span className="info-value-small">
                            {formatDateTime(ticket.datePaiement)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="appareil-card-footer">
                      <div className="financial-info">
                        <div className="financial-item">
                          <span className="financial-label">Montant total</span>
                          <span className="financial-value">{formatCurrency(ticket.montant)}</span>
                        </div>
                        <div className="financial-item commission-item">
                          <span className="financial-label">Commission ({ticket.commissionPct}%)</span>
                          <span className="financial-value highlight-gold">
                            {formatCurrency(ticket.commission)}
                          </span>
                        </div>
                        <div className="financial-item revenu-item">
                          <span className="financial-label">Votre revenu</span>
                          <span className="financial-value text-success">
                            {formatCurrency(ticket.revenuProprietaire)}
                          </span>
                        </div>
                      </div>
                      
                      <button 
                        className="btn-view-ticket"
                        onClick={() => navigate(`/tickets/${ticket.id}`)}
                      >
                        👁️ Voir le ticket
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Paiement du réparateur */}
          {isAdmin && (
            <div className="payment-action-card">
              <div className="card-header-premium">
                <h2>💳 Paiement du Réparateur</h2>
              </div>
              <div className="payment-action-content">
                <div className="payment-info">
                  <div className="payment-info-item">
                    <span className="payment-label">Commission totale:</span>
                    <span className="payment-value">{formatCurrency(totalCommissions)}</span>
                  </div>
                  <div className="payment-info-item">
                    <span className="payment-label">Déjà payé:</span>
                    <span className="payment-value">{formatCurrency(totalPaye)}</span>
                  </div>
                  <div className={`payment-info-item payment-solde ${soldeRestant > 0 ? 'has-solde' : 'no-solde'}`}>
                    <span className="payment-label">Solde restant:</span>
                    <span className={`payment-value ${soldeRestant > 0 ? 'highlight-gold' : 'text-success'}`}>
                      {formatCurrency(soldeRestant)}
                    </span>
                    {soldeRestant === 0 && (
                      <div style={{ fontSize: '0.85rem', color: '#22543d', marginTop: '0.25rem' }}>
                        ✅ Toutes les commissions ont été payées
                      </div>
                    )}
                  </div>
                </div>
                <button 
                  className="btn-pay-premium"
                  onClick={() => setShowPaymentModal(true)}
                  disabled={soldeRestant <= 0}
                >
                  💰 Enregistrer le paiement
                </button>
              </div>
            </div>
          )}

          {/* Historique des paiements */}
          {payments.length > 0 && (
            <div className="payments-history-card">
              <div className="card-header-premium">
                <h2>📜 Historique des Paiements</h2>
              </div>
              <div className="table-wrapper-premium">
                <table className="payments-history-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Montant</th>
                      <th>Mode</th>
                      <th>Commentaire</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment, idx) => (
                      <tr key={idx}>
                        <td>
                          {payment.datePaiement 
                            ? formatDateTime(payment.datePaiement)
                            : '—'}
                        </td>
                        <td className="amount-cell-premium">
                          <strong>{formatCurrency(payment.montant || 0)}</strong>
                        </td>
                        <td>
                          <span className="payment-method-badge">{payment.modePaiement || 'N/A'}</span>
                        </td>
                        <td className="comment-cell">{payment.commentaire || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal de paiement */}
      {showPaymentModal && (
        <div className="modal-overlay-premium" onClick={() => {
          setShowPaymentModal(false);
          setPaymentData({ montant: '', modePaiement: 'CASH', commentaire: '' });
        }}>
          <div className="modal-content-premium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-premium">
              <h3>💰 Enregistrer le Paiement</h3>
              <button className="modal-close-premium" onClick={() => {
                setShowPaymentModal(false);
                setPaymentData({ montant: '', modePaiement: 'CASH', commentaire: '' });
              }}>✖️</button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="payment-form-premium">
              <div className="payment-modal-info">
                <div className="payment-info-item">
                  <span className="payment-label">Solde restant:</span>
                  <span className="payment-value highlight-gold">{formatCurrency(soldeRestant)}</span>
                </div>
              </div>
              
              <div className="form-group-premium">
                <label className="form-label-premium">Montant payé (MAD) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={soldeRestant}
                  value={paymentData.montant}
                  onChange={(e) => setPaymentData({ ...paymentData, montant: e.target.value })}
                  className="form-input-premium"
                  required
                  placeholder={`Maximum: ${formatCurrency(soldeRestant)}`}
                />
              </div>

              <div className="form-group-premium">
                <label className="form-label-premium">Mode de paiement *</label>
                <select
                  value={paymentData.modePaiement}
                  onChange={(e) => setPaymentData({ ...paymentData, modePaiement: e.target.value })}
                  className="form-input-premium"
                  required
                >
                  <option value="CASH">💵 Cash</option>
                  <option value="VIREMENT">🏦 Virement</option>
                  <option value="AUTRE">📝 Autre</option>
                </select>
              </div>

              <div className="form-group-premium">
                <label className="form-label-premium">Commentaire (optionnel)</label>
                <textarea
                  rows="3"
                  value={paymentData.commentaire}
                  onChange={(e) => setPaymentData({ ...paymentData, commentaire: e.target.value })}
                  className="form-textarea-premium"
                  placeholder="Notes sur le paiement..."
                />
              </div>

              <div className="modal-footer-premium">
                <button 
                  type="button" 
                  className="btn-secondary-premium"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setPaymentData({ montant: '', modePaiement: 'CASH', commentaire: '' });
                  }}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn-primary-premium"
                  disabled={!paymentData.montant || parseFloat(paymentData.montant) <= 0}
                >
                  ✔️ Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && selectedReparateur && (
        <Loading text="Chargement des données..." />
      )}
    </div>
  );
}

export default CommissionReparateur;
