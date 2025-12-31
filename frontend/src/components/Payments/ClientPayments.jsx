import React, { useEffect, useState } from 'react';
import { paymentAPI, commissionAPI } from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Loading } from '../Common/Loading';
import './ClientPayments.css';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Tous les statuts' },
  { value: 'PAYE', label: 'Payé' },
  { value: 'NON_PAYE', label: 'Non payé' },
  { value: 'PARTIEL', label: 'Partiellement payé' },
];

function ClientPayments() {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const { hasRole } = useAuth();
  const { error: showError, success } = useNotification();
  const isAdmin = hasRole('ROLE_ADMIN');
  const isProprietaire = hasRole('ROLE_PROPRIETAIRE');
  const isReparateur = hasRole('ROLE_REPARATEUR') && !hasRole('ROLE_ADMIN');
  const [validatingPayment, setValidatingPayment] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationData, setValidationData] = useState({
    status: 'VALIDE',
    receiptUrl: '',
    notes: ''
  });
  const [pendingCommissions, setPendingCommissions] = useState([]);
  const [showReparateurPayments, setShowReparateurPayments] = useState(false);
  const [payingCommission, setPayingCommission] = useState(null);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentData, setPaymentData] = useState({
    modePaiement: 'CASH',
    commentaire: ''
  });

  useEffect(() => {
    if (isAdmin || isProprietaire) {
      loadPayments();
      loadPendingCommissions();
    }
  }, [isAdmin, isProprietaire]);

  useEffect(() => {
    filterPayments();
  }, [searchTerm, statusFilter, payments]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const response = await paymentAPI.listAll();
      console.log('Paiements reçus:', response.data);
      setPayments(response.data || []);
    } catch (error) {
      console.error('Erreur chargement paiements', error);
      console.error('Détails erreur:', error.response?.data);
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Impossible de charger les paiements';
      showError(`Erreur: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Filtre par recherche (nom ou prénom)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (payment) =>
          (payment.clientFirstName && payment.clientFirstName.toLowerCase().includes(search)) ||
          (payment.clientLastName && payment.clientLastName.toLowerCase().includes(search)) ||
          (payment.clientFirstName + ' ' + payment.clientLastName).toLowerCase().includes(search)
      );
    }

    // Filtre par statut
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((payment) => payment.statutPaiement === statusFilter);
    }

    setFilteredPayments(filtered);
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
    });
  };

  const getStatusBadgeClass = (statut) => {
    switch (statut) {
      case 'PAYE':
        return 'status-badge status-paid';
      case 'NON_PAYE':
        return 'status-badge status-unpaid';
      case 'PARTIEL':
        return 'status-badge status-partial';
      default:
        return 'status-badge status-unknown';
    }
  };

  const getStatusLabel = (statut) => {
    switch (statut) {
      case 'PAYE':
        return 'Payé';
      case 'NON_PAYE':
        return 'Non payé';
      case 'PARTIEL':
        return 'Partiellement payé';
      default:
        return statut;
    }
  };

  const handleValidateClick = (payment) => {
    setValidatingPayment(payment);
    setValidationData({
      status: payment.status === 'VALIDE' ? 'VALIDE' : 'VALIDE',
      receiptUrl: payment.receiptUrl || '',
      notes: payment.notes || ''
    });
    setShowValidationModal(true);
  };

  const handleValidationSubmit = async () => {
    if (!validatingPayment) return;

    setIsValidating(true);
    try {
      console.log('Validation du paiement:', {
        paymentId: validatingPayment.id,
        status: validationData.status,
        receiptUrl: validationData.receiptUrl,
        notes: validationData.notes
      });

      const response = await paymentAPI.validate(validatingPayment.id, {
        status: validationData.status,
        receiptUrl: validationData.receiptUrl,
        notes: validationData.notes
      });

      console.log('Réponse validation:', response.data);
      success('Paiement validé avec succès ! Les commissions ont été calculées automatiquement.');
      setShowValidationModal(false);
      setValidatingPayment(null);
      setValidationData({
        status: 'VALIDE',
        receiptUrl: '',
        notes: ''
      });
      await loadPayments();
    } catch (error) {
      console.error('Erreur validation paiement', error);
      console.error('Détails erreur:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Impossible de valider le paiement';
      showError(`Erreur: ${errorMessage}`);
    } finally {
      setIsValidating(false);
    }
  };

  const getBackendStatus = (payment) => {
    // Convertir le statut frontend vers le statut backend
    if (payment.status === 'VALIDE') return 'VALIDE';
    if (payment.status === 'REFUSE') return 'REFUSE';
    return 'EN_ATTENTE';
  };

  const loadPendingCommissions = async () => {
    try {
      const response = await commissionAPI.getPendingPayments();
      setPendingCommissions(response.data || []);
    } catch (error) {
      console.error('Erreur chargement commissions en attente', error);
    }
  };

  const handlePayCommission = async (commission) => {
    setPayingCommission(commission);
    setPaymentData({
      modePaiement: 'CASH',
      commentaire: `Paiement commission pour ${commission.clientFirstName} ${commission.clientLastName} - Ticket #${commission.ticketCode}`
    });
  };

  const handleSubmitPayment = async () => {
    if (!payingCommission) {
      console.error('Aucune commission sélectionnée');
      showError('Aucune commission sélectionnée');
      return;
    }

    if (!payingCommission.commissionId) {
      console.error('ID de commission manquant:', payingCommission);
      showError('ID de commission manquant');
      return;
    }

    if (!payingCommission.montantCommission) {
      console.error('Montant de commission manquant:', payingCommission);
      showError('Montant de commission manquant');
      return;
    }

    setIsPaying(true);
    try {
      console.log('Envoi du paiement:', {
        commissionId: payingCommission.commissionId,
        montant: payingCommission.montantCommission,
        modePaiement: paymentData.modePaiement,
        commentaire: paymentData.commentaire
      });

      const response = await commissionAPI.payCommission(payingCommission.commissionId, {
        montant: parseFloat(payingCommission.montantCommission),
        modePaiement: paymentData.modePaiement,
        commentaire: paymentData.commentaire || ''
      });

      console.log('Réponse paiement:', response.data);
      success(`Paiement de ${formatCurrency(payingCommission.montantCommission)} MAD effectué avec succès !`);
      setPayingCommission(null);
      setPaymentData({
        modePaiement: 'CASH',
        commentaire: ''
      });
      await loadPendingCommissions();
    } catch (error) {
      console.error('Erreur paiement commission', error);
      console.error('Détails erreur:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        commission: payingCommission
      });
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Impossible d\'effectuer le paiement';
      showError(`Erreur: ${errorMessage}`);
    } finally {
      setIsPaying(false);
    }
  };

  if (!isAdmin && !isProprietaire) {
    return (
      <div className="client-payments-container">
        <div className="no-access">
          <h2>🔒 Accès refusé</h2>
          <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <Loading fullScreen text="Chargement des paiements..." />;
  }

  return (
    <div className="client-payments-container">
      <div className="payments-header">
        <div>
          <h1>💳 Paiements des Clients</h1>
          <p>Suivez et gérez tous les paiements de réparations</p>
        </div>
        {isAdmin && (
          <button
            className="btn-toggle-reparateur"
            onClick={() => setShowReparateurPayments(!showReparateurPayments)}
          >
            {showReparateurPayments ? '📋 Voir Paiements Clients' : '👨‍🔧 Payer les Réparateurs'}
          </button>
        )}
      </div>

      {/* Section Paiements Réparateurs */}
      {showReparateurPayments && isAdmin && (
        <div className="reparateur-payments-section">
          <h2>👨‍🔧 Paiements aux Réparateurs</h2>
          {pendingCommissions.length === 0 ? (
            <div className="no-data">
              <div className="no-data-icon">✅</div>
              <h3>Tous les réparateurs ont été payés</h3>
              <p>Aucune commission en attente de paiement</p>
            </div>
          ) : (
            <div className="commissions-table-wrapper">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Réparateur</th>
                    <th>Client</th>
                    <th>Ticket</th>
                    <th>Montant Commission</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingCommissions.map((commission) => (
                    <tr key={commission.commissionId}>
                      <td>
                        <strong>Commission #{commission.commissionId}</strong>
                      </td>
                      <td>
                        {commission.clientFirstName} {commission.clientLastName}
                      </td>
                      <td>
                        <span className="ticket-code">#{commission.ticketCode}</span>
                      </td>
                      <td className="amount-cell">
                        <strong>{formatCurrency(commission.montantCommission)}</strong> MAD
                      </td>
                      <td>
                        <button
                          className="btn-pay-commission"
                          onClick={() => handlePayCommission(commission)}
                        >
                          💰 Payer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de paiement commission */}
      {payingCommission && (
        <div className="modal-overlay" onClick={(e) => {
          // Ne fermer que si on clique directement sur l'overlay, pas sur le contenu
          if (e.target === e.currentTarget) {
            setPayingCommission(null);
          }
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>💰 Enregistrer le Paiement</h2>
            <div className="modal-payment-info">
              <p><strong>Réparateur:</strong> Commission #{payingCommission.commissionId}</p>
              <p><strong>Client:</strong> {payingCommission.clientFirstName} {payingCommission.clientLastName}</p>
              <p><strong>Ticket:</strong> #{payingCommission.ticketCode}</p>
              <div className="solde-restant">
                <span>Solde restant:</span>
                <strong>{formatCurrency(payingCommission.montantCommission)} MAD</strong>
              </div>
            </div>
            
            <div className="form-group">
              <label>MONTANT PAYÉ (MAD) *</label>
              <input
                type="number"
                value={formatCurrency(payingCommission.montantCommission)}
                readOnly
                className="form-control"
                placeholder={`Maximum: ${formatCurrency(payingCommission.montantCommission)} MAD`}
                style={{ backgroundColor: '#f5f5f5' }}
              />
              <small className="form-hint">
                Montant maximum: {formatCurrency(payingCommission.montantCommission)} MAD
              </small>
            </div>
            
            <div className="form-group">
              <label>MODE DE PAIEMENT *</label>
              <select
                value={paymentData.modePaiement}
                onChange={(e) => setPaymentData({ ...paymentData, modePaiement: e.target.value })}
                className="form-control"
                disabled={isPaying}
              >
                <option value="CASH">💵 Cash</option>
                <option value="VIREMENT">🏦 Virement</option>
                <option value="AUTRE">📝 Autre</option>
              </select>
            </div>

            <div className="form-group">
              <label>COMMENTAIRE (OPTIONNEL)</label>
              <textarea
                value={paymentData.commentaire}
                onChange={(e) => setPaymentData({ ...paymentData, commentaire: e.target.value })}
                className="form-control"
                rows="3"
                placeholder="Notes sur le paiement..."
                disabled={isPaying}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => {
                  setPayingCommission(null);
                  setPaymentData({ modePaiement: 'CASH', commentaire: '' });
                }}
                disabled={isPaying}
              >
                Annuler
              </button>
              <button
                className="btn-submit"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSubmitPayment();
                }}
                disabled={isPaying || !payingCommission || !payingCommission.commissionId}
                type="button"
              >
                {isPaying ? 'Paiement...' : '✅ Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre de recherche et filtres */}
      <div className="payments-filters">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Rechercher par nom ou prénom du client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-box">
          <label htmlFor="status-filter">Filtrer par statut :</label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="payments-stats">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{filteredPayments.length}</div>
            <div className="stat-label">Paiements affichés</div>
          </div>
        </div>
        <div className="stat-card stat-success">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-value">
              {filteredPayments.filter((p) => p.statutPaiement === 'PAYE').length}
            </div>
            <div className="stat-label">Payés</div>
          </div>
        </div>
        <div className="stat-card stat-danger">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <div className="stat-value">
              {filteredPayments.filter((p) => p.statutPaiement === 'NON_PAYE').length}
            </div>
            <div className="stat-label">Non payés</div>
          </div>
        </div>
        <div className="stat-card stat-warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <div className="stat-value">
              {filteredPayments.filter((p) => p.statutPaiement === 'PARTIEL').length}
            </div>
            <div className="stat-label">Partiels</div>
          </div>
        </div>
      </div>

      {/* Tableau des paiements */}
      <div className="payments-table-wrapper">
        {filteredPayments.length === 0 ? (
          <div className="no-data">
            <div className="no-data-icon">📭</div>
            <h3>Aucun paiement trouvé</h3>
            <p>
              {searchTerm || statusFilter !== 'ALL'
                ? 'Essayez de modifier vos critères de recherche'
                : 'Aucun paiement enregistré pour le moment'}
            </p>
          </div>
        ) : (
          <table className="payments-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Type d'appareil</th>
                <th>Prix total</th>
                <th>Montant payé</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Ticket</th>
                {isAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="client-cell">
                    <div className="client-name">
                      <strong>
                        {payment.clientFirstName || ''} {payment.clientLastName || ''}
                      </strong>
                    </div>
                    {payment.clientId && (
                      <div className="client-id">ID: {payment.clientId}</div>
                    )}
                  </td>
                  <td>
                    <span className="appareil-type">{payment.appareilType || 'Non spécifié'}</span>
                  </td>
                  <td className="amount-cell">
                    <strong>{formatCurrency(payment.totalReparation)}</strong> {payment.currency || 'MAD'}
                  </td>
                  <td className="amount-cell">
                    <strong>{formatCurrency(payment.montantPaye)}</strong> {payment.currency || 'MAD'}
                  </td>
                  <td>
                    <span className={getStatusBadgeClass(payment.statutPaiement)}>
                      {getStatusLabel(payment.statutPaiement)}
                    </span>
                    {payment.status && payment.status !== 'VALIDE' && (
                      <span className="backend-status">({payment.status})</span>
                    )}
                  </td>
                  <td>{formatDate(payment.createdAt)}</td>
                  <td>
                    {payment.ticketCode ? (
                      <span className="ticket-code">#{payment.ticketCode}</span>
                    ) : (
                      <span className="no-ticket">—</span>
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      {payment.status !== 'VALIDE' && (
                        <button
                          className="btn-validate"
                          onClick={() => handleValidateClick(payment)}
                          title="Valider ce paiement"
                        >
                          ✓ Valider
                        </button>
                      )}
                      {payment.status === 'VALIDE' && (
                        <span className="validated-badge">✓ Validé</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal de validation */}
      {showValidationModal && validatingPayment && (
        <div className="modal-overlay" onClick={() => setShowValidationModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>✅ Valider le Paiement</h2>
            <div className="modal-payment-info">
              <p><strong>Client:</strong> {validatingPayment.clientFirstName} {validatingPayment.clientLastName}</p>
              <p><strong>Montant:</strong> {formatCurrency(validatingPayment.amount || validatingPayment.totalReparation)} {validatingPayment.currency || 'MAD'}</p>
              <p><strong>Ticket:</strong> #{validatingPayment.ticketCode || 'N/A'}</p>
            </div>
            
            <div className="form-group">
              <label>Statut du paiement:</label>
              <select
                value={validationData.status}
                onChange={(e) => setValidationData({ ...validationData, status: e.target.value })}
                className="form-control"
                disabled={isValidating}
              >
                <option value="VALIDE">✅ Valider (créera les commissions)</option>
                <option value="REFUSE">❌ Refuser</option>
                <option value="EN_ATTENTE">⏳ En attente</option>
              </select>
            </div>

            <div className="form-group">
              <label>URL du reçu (optionnel):</label>
              <input
                type="text"
                value={validationData.receiptUrl}
                onChange={(e) => setValidationData({ ...validationData, receiptUrl: e.target.value })}
                className="form-control"
                placeholder="https://..."
                disabled={isValidating}
              />
            </div>

            <div className="form-group">
              <label>Notes (optionnel):</label>
              <textarea
                value={validationData.notes}
                onChange={(e) => setValidationData({ ...validationData, notes: e.target.value })}
                className="form-control"
                rows="3"
                placeholder="Notes sur la validation..."
                disabled={isValidating}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn-cancel"
                onClick={() => setShowValidationModal(false)}
              >
                Annuler
              </button>
              <button
                className="btn-submit"
                onClick={handleValidationSubmit}
                disabled={isValidating}
              >
                {isValidating ? 'Validation...' : 'Confirmer la validation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientPayments;

