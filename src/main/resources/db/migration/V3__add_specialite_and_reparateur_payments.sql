-- Migration V3 : Ajout du champ spécialité pour les réparateurs et table des paiements réparateurs

-- Ajouter le champ spécialité à la table users
ALTER TABLE users ADD COLUMN specialite VARCHAR(100) NULL;

-- Créer la table des paiements aux réparateurs
CREATE TABLE reparateur_payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reparateur_id BIGINT NOT NULL,
    montant DECIMAL(12, 2) NOT NULL,
    mode_paiement VARCHAR(30) NOT NULL,
    date_paiement DATETIME(6) NOT NULL,
    commentaire TEXT,
    effectue_par BIGINT NOT NULL,
    reference_paiement VARCHAR(100),
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    
    CONSTRAINT fk_reparateur_payment_reparateur 
        FOREIGN KEY (reparateur_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_reparateur_payment_effectue_par 
        FOREIGN KEY (effectue_par) REFERENCES users(id) ON DELETE RESTRICT,
    
    INDEX idx_reparateur_payment_reparateur (reparateur_id),
    INDEX idx_reparateur_payment_date (date_paiement),
    INDEX idx_reparateur_payment_effectue_par (effectue_par)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Commentaires sur les tables et colonnes
ALTER TABLE reparateur_payments 
    COMMENT = 'Table des paiements effectués aux réparateurs';

