import React, { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

function Navbar() {
  const { user, logout, hasRole } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const isAdmin = hasRole('ROLE_ADMIN');
  const isProprietaireOrAdmin = hasRole('ROLE_PROPRIETAIRE') || hasRole('ROLE_ADMIN');
  const isClient = hasRole('ROLE_USER') && !hasRole('ROLE_ADMIN') && !hasRole('ROLE_PROPRIETAIRE') && !hasRole('ROLE_REPARATEUR');

  const handleLogout = () => {
    if (window.confirm('Voulez-vous vraiment vous déconnecter ?')) {
      logout();
    }
  };

  const displayName = user ? `${user.firstName} ${user.lastName}` : '';

  return (
    <nav className="navbar-premium">
      <div className="navbar-premium-container">
        <div className="navbar-premium-brand" onClick={() => navigate('/dashboard')}>
          <div className="brand-icon">✨</div>
          <span className="brand-text">Centre Commercial</span>
        </div>

        <div className={`navbar-premium-menu ${menuOpen ? 'active' : ''}`}>
          {!isClient && (
            <NavLink to="/dashboard" className="nav-link-premium">
              <span className="nav-icon">📊</span>
              <span className="nav-text">Dashboard</span>
            </NavLink>
          )}
          
          {isClient ? (
            <NavLink to="/mes-reparations" className="nav-link-premium">
              <span className="nav-icon">📱</span>
              <span className="nav-text">Mes Réparations</span>
            </NavLink>
          ) : (
            <NavLink to="/tickets" className="nav-link-premium">
              <span className="nav-icon">🎫</span>
              <span className="nav-text">Tickets</span>
            </NavLink>
          )}
          
          {!isClient && (
            <NavLink to="/payments" className="nav-link-premium">
              <span className="nav-icon">💳</span>
              <span className="nav-text">Paiements</span>
            </NavLink>
          )}
          
          {isAdmin && (
            <NavLink to="/commissions" className="nav-link-premium">
              <span className="nav-icon">💰</span>
              <span className="nav-text">Commissions</span>
            </NavLink>
          )}
          
          {isProprietaireOrAdmin && (
            <NavLink to="/users" className="nav-link-premium">
              <span className="nav-icon">👥</span>
              <span className="nav-text">Utilisateurs</span>
            </NavLink>
          )}
        </div>

        <div className="navbar-premium-user">
          <div className="user-avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="user-name-premium">{displayName}</span>
          <button className="btn-logout-premium" onClick={handleLogout}>
            <span className="btn-icon">🚪</span>
            <span className="btn-text">Déconnexion</span>
          </button>
        </div>

        <div className="navbar-premium-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          <div className={`hamburger ${menuOpen ? 'active' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
