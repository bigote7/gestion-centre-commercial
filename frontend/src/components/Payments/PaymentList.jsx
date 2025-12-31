import React, { useEffect, useState } from 'react';
import { commissionAPI } from '../../api/apiClient';
import { useUsers } from '../../hooks/useUsers';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Loading } from '../Common/Loading';
import './Payments.css';

const paymentMethods = [
  { value: 'CASH', label: '💵 Espèces' },
  { value: 'VIREMENT', label: '🏦 Virement bancaire' },
  { value: 'AUTRE', label: '📝 Autre' },
];

function PaymentList() {
  const [reparateurs, setReparateurs] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [payments, setPayments] = useState({});
  const [commissions, setCommissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedReparateur, setExpandedReparateur] = useState(null);
  const [newPayment, setNewPayment] = useState({
    reparateurId: '',
    montant: '',
    modePaiement: 'CASH',
    commentaire: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const { users: allReparateurs, loading: reparateursLoading } = useUsers('reparateurs');
  const { hasRole } = useAuth();
  const { success, error: showError } = useNotification();
  const isAdmin = hasRole('ROLE_ADMIN');
  const isProprietaire = hasRole('ROLE_PROPRIETAIRE');

  const loadAllData = async (reparateursList) => {
    setLoading(true);
    try {
      const summariesData = {};
      const paymentsData = {};
      const commissionsData = {};

      await Promise.all(
        reparateursList.map(async (rep) => {
          try {
            const [summaryRes, paymentsRes, commissionsRes] = await Promise.all([
              commissionAPI.getSummary(rep.id),
              commissionAPI.getPayments(rep.id),
              commissionAPI.getByReparateur(rep.id),
            ]);

            summariesData[rep.id] = summaryRes.data;
            paymentsData[rep.id] = paymentsRes.data || [];
            commissionsData[rep.id] = commissionsRes.data || [];
          } catch (err) {
            console.error(`Erreur chargement données réparateur ${rep.id}:`, err);
            // Initialiser avec des valeurs par défaut si erreur
            summariesData[rep.id] = null;
            paymentsData[rep.id] = [];
            commissionsData[rep.id] = [];
          }
        })
      );

      setSummaries(summariesData);
      setPayments(paymentsData);
      setCommissions(commissionsData);
    } catch (error) {
      console.error('Erreur chargement données', error);
      showError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!reparateursLoading && allReparateurs.length > 0) {
      setReparateurs(allReparateurs);
      loadAllData(allReparateurs);
    }
  }, [reparateursLoading, allReparateurs]);

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (!newPayment.reparateurId || !newPayment.montant) {
      showError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    try {
      await commissionAPI.recordPayment(Number(newPayment.reparateurId), {
        montant: parseFloat(newPayment.montant),
        modePaiement: newPayment.modePaiement,
        commentaire: newPayment.commentaire || null,
      });

      success('Paiement enregistré avec succès !');
      setNewPayment({
        reparateurId: '',
        montant: '',
        modePaiement: 'CASH',
        commentaire: '',
      });
      await loadAllData(reparateurs);
    } catch (error) {
      console.error('Erreur enregistrement paiement:', error);
      showError(error.response?.data?.message || 'Impossible d\'enregistrer le paiement');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '0.00';
    return parseFloat(amount).toFixed(2);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculer les statistiques globales
  const globalStats = {
    totalReparateurs: reparateurs.length,
    totalCommissions: Object.values(summaries).reduce(
      (sum, s) => sum + (parseFloat(s?.totalCommissions) || 0),
      0
    ),
    totalPaye: Object.values(summaries).reduce(
      (sum, s) => sum + (parseFloat(s?.totalPaye) || 0),
      0
    ),
    totalSolde: Object.values(summaries).reduce(
      (sum, s) => sum + (parseFloat(s?.soldeRestant) || 0),
      0
    ),
  };

  if (reparateursLoading || loading) {
    return <Loading fullScreen text="Chargement des paiements..." />;
  }

  if (!isAdmin && !isProprietaire) {
    return (
      <div className="payments-container">
        <div className="no-access">
          <h2>🔒 Accès refusé</h2>
          <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payments-container">
      <div className="payments-header">
        <div>
          <h1>💰 Gestion des Paiements Réparateurs</h1>
          <p>Suivez et gérez les paiements de commissions pour chaque réparateur</p>
        </div>
      </div>

      {/* Statistiques globales */}
      {reparateurs.length > 0 && (
        <div className="payments-stats">
          <div className="stat-item">
            <div className="stat-icon">👨‍🔧</div>
            <div className="stat-info">
              <div className="stat-value">{globalStats.totalReparateurs}</div>
              <div className="stat-label">Réparateurs</div>
            </div>
          </div>
          <div className="stat-item stat-primary">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <div className="stat-value">{formatCurrency(globalStats.totalCommissions)}</div>
              <div className="stat-label">MAD Commissions totales</div>
            </div>
          </div>
          <div className="stat-item stat-success">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <div className="stat-value">{formatCurrency(globalStats.totalPaye)}</div>
              <div className="stat-label">MAD Total payé</div>
            </div>
          </div>
          <div className="stat-item stat-warning">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <div className="stat-value">{formatCurrency(globalStats.totalSolde)}</div>
              <div className="stat-label">MAD Solde restant</div>
            </div>
          </div>
        </div>
      )}

      {/* Formulaire d'enregistrement de paiement */}
      <div className="payment-form-card">
        <h2>➕ Enregistrer un Paiement</h2>
        <form onSubmit={handleSubmitPayment} className="payment-form">
          <div className="form-grid-3">
            <div className="form-group">
              <label>
                <span className="label-icon">👨‍🔧</span>
                Réparateur *
              </label>
              <select
                value={newPayment.reparateurId}
                onChange={(e) => setNewPayment({ ...newPayment, reparateurId: e.target.value })}
                required
                className="form-select"
              >
                <option value="">Sélectionnez un réparateur</option>
                {reparateurs.map((rep) => {
                  const summary = summaries[rep.id];
                  const solde = summary ? parseFloat(summary.soldeRestant) : 0;
                  return (
                    <option key={rep.id} value={rep.id}>
                      {rep.firstName} {rep.lastName}
                      {summary && ` (Solde: ${formatCurrency(solde)} MAD)`}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="form-group">
              <label>
                <span className="label-icon">💵</span>
                Montant (MAD) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={newPayment.montant}
                onChange={(e) => setNewPayment({ ...newPayment, montant: e.target.value })}
                placeholder="Ex. 500.00"
                required
                className="form-input"
              />
              {newPayment.reparateurId && summaries[newPayment.reparateurId] && (
                <small className="form-hint">
                  Solde restant: {formatCurrency(summaries[newPayment.reparateurId].soldeRestant)} MAD
                </small>
              )}
            </div>

            <div className="form-group">
              <label>
                <span className="label-icon">💳</span>
                Mode de paiement *
              </label>
              <select
                value={newPayment.modePaiement}
                onChange={(e) => setNewPayment({ ...newPayment, modePaiement: e.target.value })}
                required
                className="form-select"
              >
                {paymentMethods.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>
              <span className="label-icon">📝</span>
              Commentaire (optionnel)
            </label>
            <textarea
              rows="3"
              value={newPayment.commentaire}
              onChange={(e) => setNewPayment({ ...newPayment, commentaire: e.target.value })}
              placeholder="Notes sur le paiement..."
              className="form-textarea"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? '⏳ Enregistrement...' : '✅ Enregistrer le Paiement'}
          </button>
        </form>
      </div>

      {/* Liste des réparateurs */}
      {reparateurs.length === 0 ? (
        <div className="no-data">
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👨‍🔧</div>
          <p>Aucun réparateur trouvé.</p>
        </div>
      ) : (
        <div className="reparateurs-list">
          <h2 className="section-title">📋 Détails par Réparateur</h2>
          
          {reparateurs.map((reparateur) => {
            const summary = summaries[reparateur.id] || {};
            const reparateurPayments = payments[reparateur.id] || [];
            const reparateurCommissions = commissions[reparateur.id] || [];
            const isExpanded = expandedReparateur === reparateur.id;

            return (
              <div key={reparateur.id} className="reparateur-card">
                {/* En-tête du réparateur */}
                <div className="reparateur-header">
                  <div className="reparateur-info">
                    <div className="reparateur-name">
                      <span className="reparateur-icon">👨‍🔧</span>
                      <div>
                        <h3>{reparateur.firstName} {reparateur.lastName}</h3>
                        <div className="reparateur-meta">
                          {reparateur.phone && <span>📞 {reparateur.phone}</span>}
                          {reparateur.email && <span>📧 {reparateur.email}</span>}
                          {summary.specialite && <span>🔧 {summary.specialite}</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn-expand"
                    onClick={() => setExpandedReparateur(isExpanded ? null : reparateur.id)}
                  >
                    {isExpanded ? '▼ Réduire' : '▶ Voir détails'}
                  </button>
                </div>

                {/* Résumé financier */}
                <div className="reparateur-summary">
                  <div className="summary-item">
                    <div className="summary-label">Réparations effectuées</div>
                    <div className="summary-value">{summary.totalTicketsRepares || 0}</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">Total réparations</div>
                    <div className="summary-value">{formatCurrency(summary.totalReparations)} MAD</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">Total commissions</div>
                    <div className="summary-value highlight">{formatCurrency(summary.totalCommissions)} MAD</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">Total payé</div>
                    <div className="summary-value success">{formatCurrency(summary.totalPaye)} MAD</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-label">Solde restant</div>
                    <div className={`summary-value ${parseFloat(summary.soldeRestant || 0) > 0 ? 'warning' : 'neutral'}`}>
                      {formatCurrency(summary.soldeRestant)} MAD
                    </div>
                  </div>
                  {summary.pourcentageCommission && (
                    <div className="summary-item">
                      <div className="summary-label">% Commission</div>
                      <div className="summary-value">{formatCurrency(summary.pourcentageCommission)}%</div>
                    </div>
                  )}
                </div>

                {/* Détails expandables */}
                {isExpanded && (
                  <div className="reparateur-details">
                    {/* Liste des commissions (réparations) */}
                    <div className="details-section">
                      <h4>📋 Commissions (Réparations)</h4>
                      {reparateurCommissions.length === 0 ? (
                        <p className="no-items">Aucune commission enregistrée</p>
                      ) : (
                        <div className="table-wrapper">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Ticket</th>
                                <th>Client</th>
                                <th>Prix réparation</th>
                                <th>Commission</th>
                                <th>%</th>
                                <th>Date</th>
                                <th>Statut</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reparateurCommissions.map((comm) => (
                                <tr key={comm.id}>
                                  <td>
                                    {comm.ticketCode ? `#${comm.ticketCode}` : '—'}
                                  </td>
                                  <td>{comm.clientName || '—'}</td>
                                  <td className="amount">{formatCurrency(comm.prixReparation)} MAD</td>
                                  <td className="amount highlight">{formatCurrency(comm.commissionAmount)} MAD</td>
                                  <td>{comm.pourcentage ? `${formatCurrency(comm.pourcentage)}%` : '—'}</td>
                                  <td>{formatDate(comm.dateReparation)}</td>
                                  <td>
                                    <span className={`status-badge status-${comm.status?.toLowerCase() || 'en_attente'}`}>
                                      {comm.status || 'EN_ATTENTE'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Historique des paiements */}
                    <div className="details-section">
                      <h4>💳 Historique des Paiements</h4>
                      {reparateurPayments.length === 0 ? (
                        <p className="no-items">Aucun paiement enregistré</p>
                      ) : (
                        <div className="table-wrapper">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Date</th>
                                <th>Montant</th>
                                <th>Mode</th>
                                <th>Commentaire</th>
                              </tr>
                            </thead>
                            <tbody>
                              {reparateurPayments.map((payment) => (
                                <tr key={payment.id}>
                                  <td>{formatDate(payment.datePaiement)}</td>
                                  <td className="amount highlight">{formatCurrency(payment.commissionAmount)} MAD</td>
                                  <td>
                                    {paymentMethods.find(m => m.value === payment.paymentMethod)?.label || payment.paymentMethod}
                                  </td>
                                  <td>{payment.commentaire || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Liste des réparations (si disponible dans le summary) */}
                    {summary.reparations && summary.reparations.length > 0 && (
                      <div className="details-section">
                        <h4>🔧 Détails des Réparations</h4>
                        <div className="reparations-grid">
                          {summary.reparations.map((rep, idx) => (
                            <div key={idx} className="reparation-item">
                              <div className="reparation-header">
                                <span className="ticket-code">#{rep.ticketCode}</span>
                                <span className={`status-badge status-${rep.status?.toLowerCase()}`}>
                                  {rep.status}
                                </span>
                              </div>
                              <div className="reparation-title">{rep.appareil}</div>
                              <div className="reparation-client">Client: {rep.clientName}</div>
                              <div className="reparation-amount">
                                Prix: <strong>{formatCurrency(rep.prixReparation)} MAD</strong>
                              </div>
                              <div className="reparation-date">
                                Date: {formatDate(rep.dateReparation)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default PaymentList;
