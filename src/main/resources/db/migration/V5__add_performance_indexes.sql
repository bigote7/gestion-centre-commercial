-- Migration V5 : Ajout d'indexes pour améliorer les performances
-- Ces indexes optimisent les requêtes fréquentes sur les colonnes de recherche et de jointure

-- Indexes pour la table tickets
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_agent ON tickets(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_tickets_commission_percentage ON tickets(commission_percentage);
CREATE INDEX IF NOT EXISTS idx_tickets_requester ON tickets(requester_id);
CREATE INDEX IF NOT EXISTS idx_tickets_updated_at ON tickets(updated_at);

-- Indexes pour la table payments
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_ticket ON payments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_payments_status_created ON payments(status, created_at);

-- Indexes pour la table reparateur_payments
CREATE INDEX IF NOT EXISTS idx_reparateur_payments_reparateur ON reparateur_payments(reparateur_id);
CREATE INDEX IF NOT EXISTS idx_reparateur_payments_date ON reparateur_payments(date_paiement);
CREATE INDEX IF NOT EXISTS idx_reparateur_payments_reparateur_date ON reparateur_payments(reparateur_id, date_paiement);

-- Indexes pour la table commissions
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commissions(created_at);
CREATE INDEX IF NOT EXISTS idx_commissions_reparateur_created ON commissions(reparateur_id, created_at);

-- Indexes pour la table ticket_history
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_created ON ticket_history(ticket_id, created_at);

