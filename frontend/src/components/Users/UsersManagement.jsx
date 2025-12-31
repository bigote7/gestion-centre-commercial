import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './UsersManagement.css';

function UsersManagement() {
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [reparateurs, setReparateurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);

  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const isProprietaire = hasRole('ROLE_PROPRIETAIRE') || hasRole('ROLE_ADMIN');

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    specialite: '',
    reparateurPercentage: '30',
    enabled: true,
  });

  useEffect(() => {
    if (!isProprietaire) {
      alert('❌ Accès refusé : Seuls les propriétaires peuvent accéder à cette page.');
      navigate('/dashboard');
      return;
    }
    loadUsers();
  }, [isProprietaire, navigate]);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('accessToken');
      
        const [clientsRes, reparateursRes] = await Promise.all([
        fetch('http://localhost:8081/api/users/clients', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('http://localhost:8081/api/users/reparateurs', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json();
        setClients(clientsData);
      }

      if (reparateursRes.ok) {
        const reparateursData = await reparateursRes.json();
        setReparateurs(reparateursData);
      }
    } catch (err) {
      setError('Erreur lors du chargement des utilisateurs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode, user = null) => {
    setModalMode(mode);
    setSelectedUser(user);
    
    if (mode === 'edit' && user) {
      setFormData({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone || '',
        password: '',
        specialite: user.specialite || '',
        reparateurPercentage: user.reparateurPercentage || '30',
        enabled: user.enabled !== false,
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: '',
        specialite: '',
        reparateurPercentage: '30',
        enabled: true,
      });
    }
    
    setShowModal(true);
    setError('');
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedUser(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      specialite: '',
      reparateurPercentage: '30',
      enabled: true,
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('accessToken');
      const isReparateur = activeTab === 'reparateurs';
      
      // Générer un mot de passe automatiquement si vide (mode ajout)
      let passwordToUse = formData.password;
      if (modalMode === 'add' && !passwordToUse) {
        passwordToUse = generatePassword();
      }
      
      let requestData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        roles: [isReparateur ? 'ROLE_REPARATEUR' : 'ROLE_USER'],
        enabled: formData.enabled,
      };

      if (isReparateur) {
        requestData.specialite = formData.specialite || null;
        requestData.reparateurPercentage = parseFloat(formData.reparateurPercentage);
      }

      if (modalMode === 'add') {
        requestData.password = passwordToUse;

        const response = await fetch('http://localhost:8081/api/users', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erreur lors de la création');
        }

        // Afficher les identifiants générés
        setGeneratedCredentials({
          email: formData.email,
          password: passwordToUse,
          firstName: formData.firstName,
          lastName: formData.lastName,
          type: isReparateur ? 'Réparateur' : 'Client'
        });
        
        setSuccess(`${isReparateur ? 'Réparateur' : 'Client'} ajouté avec succès !`);
        setShowCredentialsModal(true);
      } else {
        // Mode édition
        const response = await fetch(`http://localhost:8081/api/users/${selectedUser.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erreur lors de la modification');
        }

        setSuccess(`${isReparateur ? 'Réparateur' : 'Client'} modifié avec succès !`);
      }

      await loadUsers();
      handleCloseModal();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer ${userName} ?`)) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://localhost:8081/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      setSuccess('Utilisateur supprimé avec succès !');
      await loadUsers();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    `${client.firstName} ${client.lastName} ${client.email} ${client.phone || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const filteredReparateurs = reparateurs.filter(rep =>
    `${rep.firstName} ${rep.lastName} ${rep.email} ${rep.phone || ''} ${rep.specialite || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const currentList = activeTab === 'clients' ? filteredClients : filteredReparateurs;

  return (
    <div className="users-management-container">
      <div className="users-management-header">
        <div className="header-content">
          <h1>👥 Gestion des Utilisateurs</h1>
          <p>Gérez vos clients et réparateurs en toute simplicité</p>
        </div>
        <button
          className="btn-add-user"
          onClick={() => handleOpenModal('add')}
        >
          <span className="btn-icon">➕</span>
          Ajouter {activeTab === 'clients' ? 'un client' : 'un réparateur'}
        </button>
      </div>

      {success && (
        <div className="alert alert-success">
          <span>✅</span>
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>❌</span>
          <span>{error}</span>
        </div>
      )}

      <div className="users-tabs">
        <button
          className={`tab ${activeTab === 'clients' ? 'active' : ''}`}
          onClick={() => { setActiveTab('clients'); setSearchTerm(''); }}
        >
          <span className="tab-icon">👤</span>
          <span className="tab-label">Clients</span>
          <span className="tab-count">{clients.length}</span>
        </button>
        <button
          className={`tab ${activeTab === 'reparateurs' ? 'active' : ''}`}
          onClick={() => { setActiveTab('reparateurs'); setSearchTerm(''); }}
        >
          <span className="tab-icon">👨‍🔧</span>
          <span className="tab-label">Réparateurs</span>
          <span className="tab-count">{reparateurs.length}</span>
        </button>
      </div>

      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder={`Rechercher ${activeTab === 'clients' ? 'un client' : 'un réparateur'}...`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement...</p>
        </div>
      ) : (
        <div className="users-grid">
          {currentList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                {activeTab === 'clients' ? '👤' : '👨‍🔧'}
              </div>
              <h3>Aucun {activeTab === 'clients' ? 'client' : 'réparateur'} trouvé</h3>
              <p>
                {searchTerm
                  ? 'Essayez de modifier votre recherche'
                  : `Commencez par ajouter ${activeTab === 'clients' ? 'un client' : 'un réparateur'}`
                }
              </p>
            </div>
          ) : (
            currentList.map((user) => (
              <div key={user.id} className="user-card">
                <div className="user-card-header">
                  <div className="user-avatar">
                    {activeTab === 'clients' ? '👤' : '👨‍🔧'}
                  </div>
                  <div className="user-info">
                    <h3>{user.firstName} {user.lastName}</h3>
                    <p className="user-email">{user.email}</p>
                  </div>
                  <div className={`user-status ${user.enabled ? 'active' : 'inactive'}`}>
                    {user.enabled ? '✓ Actif' : '⚠ Inactif'}
                  </div>
                </div>

                <div className="user-card-body">
                  <div className="user-detail">
                    <span className="detail-icon">📞</span>
                    <span className="detail-label">Téléphone</span>
                    <span className="detail-value">{user.phone || 'Non renseigné'}</span>
                  </div>

                  {activeTab === 'reparateurs' && (
                    <>
                      <div className="user-detail">
                        <span className="detail-icon">🔧</span>
                        <span className="detail-label">Spécialité</span>
                        <span className="detail-value">{user.specialite || 'Non spécifiée'}</span>
                      </div>
                      <div className="user-detail">
                        <span className="detail-icon">💰</span>
                        <span className="detail-label">Commission</span>
                        <span className="detail-value">{user.reparateurPercentage || 30}%</span>
                      </div>
                    </>
                  )}

                  <div className="user-detail">
                    <span className="detail-icon">📅</span>
                    <span className="detail-label">Inscrit le</span>
                    <span className="detail-value">
                      {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>

                <div className="user-card-footer">
                  <button
                    className="btn-action btn-edit"
                    onClick={() => handleOpenModal('edit', user)}
                  >
                    <span>✏️</span>
                    Modifier
                  </button>
                  <button
                    className="btn-action btn-delete"
                    onClick={() => handleDelete(user.id, `${user.firstName} ${user.lastName}`)}
                  >
                    <span>🗑️</span>
                    Supprimer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal Add/Edit User */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalMode === 'add' ? '➕ Ajouter' : '✏️ Modifier'}{' '}
                {activeTab === 'clients' ? 'un client' : 'un réparateur'}
              </h2>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">👤</span>
                      Prénom *
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="form-input"
                      required
                      placeholder="Prénom"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">👤</span>
                      Nom *
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="form-input"
                      required
                      placeholder="Nom"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">📧</span>
                      Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="form-input"
                      required
                      placeholder="email@example.com"
                      disabled={modalMode === 'edit'}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">
                      <span className="label-icon">📞</span>
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="06 12 34 56 78"
                    />
                  </div>

                  {modalMode === 'add' && (
                    <div className="form-group">
                      <label className="form-label">
                        <span className="label-icon">🔒</span>
                        Mot de passe
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Laissez vide pour générer automatiquement"
                        minLength="8"
                      />
                      <small className="form-hint">
                        💡 Si laissé vide, un mot de passe sécurisé sera généré automatiquement
                      </small>
                    </div>
                  )}

                  {activeTab === 'reparateurs' && (
                    <>
                      <div className="form-group">
                        <label className="form-label">
                          <span className="label-icon">🔧</span>
                          Spécialité
                        </label>
                        <input
                          type="text"
                          name="specialite"
                          value={formData.specialite}
                          onChange={handleChange}
                          className="form-input"
                          placeholder="Ex: Électronique, Téléphonie..."
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">
                          <span className="label-icon">💰</span>
                          Commission (%)
                        </label>
                        <input
                          type="number"
                          name="reparateurPercentage"
                          value={formData.reparateurPercentage}
                          onChange={handleChange}
                          className="form-input"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="30"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="enabled"
                      checked={formData.enabled}
                      onChange={handleChange}
                    />
                    <span>Compte actif</span>
                  </label>
                </div>

                {error && (
                  <div className="alert alert-error">
                    <span>❌</span>
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleCloseModal}
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? '⏳ En cours...' : modalMode === 'add' ? 'Ajouter' : 'Modifier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Affichage des Identifiants */}
      {showCredentialsModal && generatedCredentials && (
        <div className="modal-overlay" onClick={() => {
          setShowCredentialsModal(false);
          handleCloseModal();
        }}>
          <div className="modal-content-credentials" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header credentials-header">
              <h2>✅ {generatedCredentials.type} créé avec succès !</h2>
              <button className="modal-close" onClick={() => {
                setShowCredentialsModal(false);
                handleCloseModal();
              }}>×</button>
            </div>

            <div className="modal-body credentials-body">
              <div className="credentials-intro">
                <p>📋 <strong>Identifiants de connexion générés</strong></p>
                <p className="warning-text">⚠️ Notez bien ces informations, elles ne seront plus affichées !</p>
              </div>

              <div className="credentials-box">
                <div className="credential-row">
                  <span className="credential-label">👤 Nom complet :</span>
                  <span className="credential-value">{generatedCredentials.firstName} {generatedCredentials.lastName}</span>
                </div>

                <div className="credential-row">
                  <span className="credential-label">📧 Email / Identifiant :</span>
                  <span className="credential-value selectable">{generatedCredentials.email}</span>
                  <button 
                    className="btn-copy"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCredentials.email);
                      alert('Email copié !');
                    }}
                  >
                    📋 Copier
                  </button>
                </div>

                <div className="credential-row">
                  <span className="credential-label">🔒 Mot de passe :</span>
                  <span className="credential-value selectable password-value">{generatedCredentials.password}</span>
                  <button 
                    className="btn-copy"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCredentials.password);
                      alert('Mot de passe copié !');
                    }}
                  >
                    📋 Copier
                  </button>
                </div>
              </div>

              <div className="credentials-instructions">
                <h4>📝 Instructions :</h4>
                <ol>
                  <li>Communiquez ces identifiants au {generatedCredentials.type.toLowerCase()}</li>
                  <li>Le {generatedCredentials.type.toLowerCase()} peut se connecter sur : <strong>http://localhost:3000/login</strong></li>
                  <li>Il est recommandé de changer le mot de passe lors de la première connexion</li>
                </ol>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-primary btn-large"
                onClick={() => {
                  setShowCredentialsModal(false);
                  handleCloseModal();
                }}
              >
                ✓ J'ai noté les identifiants
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersManagement;

