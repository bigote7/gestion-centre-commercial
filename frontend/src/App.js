import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Navbar from './components/Layout/Navbar';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import { Loading } from './components/Common/Loading';
import './App.css';

// Lazy loading des composants pour améliorer les performances
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const ProprietaireDashboard = lazy(() => import('./components/Dashboard/ProprietaireDashboard'));
const TicketList = lazy(() => import('./components/Tickets/TicketList'));
const TicketForm = lazy(() => import('./components/Tickets/TicketForm'));
const TicketDetail = lazy(() => import('./components/Tickets/TicketDetail'));
const PaymentList = lazy(() => import('./components/Payments/PaymentList'));
const ClientPayments = lazy(() => import('./components/Payments/ClientPayments'));
const ReparateurPayments = lazy(() => import('./components/Payments/ReparateurPayments'));
const CommissionReparateur = lazy(() => import('./components/Commissions/CommissionReparateur'));
const UsersManagement = lazy(() => import('./components/Users/UsersManagement'));
const MesReparations = lazy(() => import('./components/Client/MesReparations'));

function PrivateRoute({ children }) {
  const { isAuthenticated, loading, hasRole } = useAuth();

  if (loading) {
    return <Loading fullScreen text="Chargement..." />;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function DefaultRedirect() {
  const { hasRole } = useAuth();
  const isClient = hasRole('ROLE_USER') && !hasRole('ROLE_ADMIN') && !hasRole('ROLE_PROPRIETAIRE') && !hasRole('ROLE_REPARATEUR');
  
  return <Navigate to={isClient ? "/mes-reparations" : "/dashboard"} />;
}

function DashboardRoute() {
  const { hasRole } = useAuth();
  const isProprietaire = hasRole('ROLE_PROPRIETAIRE') && !hasRole('ROLE_ADMIN');
  
  return isProprietaire ? <ProprietaireDashboard /> : <Dashboard />;
}

function PaymentsRoute() {
  const { hasRole } = useAuth();
  const isReparateur = hasRole('ROLE_REPARATEUR') && !hasRole('ROLE_ADMIN');
  const isAdmin = hasRole('ROLE_ADMIN');
  const isProprietaire = hasRole('ROLE_PROPRIETAIRE');
  
  if (isReparateur) {
    return <ReparateurPayments />;
  } else if (isAdmin || isProprietaire) {
    return <ClientPayments />;
  } else {
    return <Navigate to="/dashboard" />;
  }
}

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Navbar />
      <main className="app-content">{children}</main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
        <Suspense fallback={<Loading fullScreen text="Chargement..." />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Layout>
                    <DashboardRoute />
                  </Layout>
                </PrivateRoute>
              }
            />

            <Route
              path="/tickets"
              element={
                <PrivateRoute>
                  <Layout>
                    <TicketList />
                  </Layout>
                </PrivateRoute>
              }
            />

            <Route
              path="/tickets/nouveau"
              element={
                <PrivateRoute>
                  <Layout>
                    <TicketForm />
                  </Layout>
                </PrivateRoute>
              }
            />

            <Route
              path="/tickets/:id"
              element={
                <PrivateRoute>
                  <Layout>
                    <TicketDetail />
                  </Layout>
                </PrivateRoute>
              }
            />

            <Route
              path="/payments"
              element={
                <PrivateRoute>
                  <Layout>
                    <PaymentsRoute />
                  </Layout>
                </PrivateRoute>
              }
            />

            <Route
              path="/commissions"
              element={
                <PrivateRoute>
                  <Layout>
                    <CommissionReparateur />
                  </Layout>
                </PrivateRoute>
              }
            />

            <Route
              path="/users"
              element={
                <PrivateRoute>
                  <Layout>
                    <UsersManagement />
                  </Layout>
                </PrivateRoute>
              }
            />

            <Route
              path="/mes-reparations"
              element={
                <PrivateRoute>
                  <Layout>
                    <MesReparations />
                  </Layout>
                </PrivateRoute>
              }
            />

            <Route path="/" element={<PrivateRoute><DefaultRedirect /></PrivateRoute>} />
            <Route path="*" element={<PrivateRoute><DefaultRedirect /></PrivateRoute>} />
          </Routes>
        </Suspense>
      </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
