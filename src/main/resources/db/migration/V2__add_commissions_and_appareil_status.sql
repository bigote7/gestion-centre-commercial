-- Ajouter les nouveaux rôles
INSERT INTO roles (name) VALUES ('ROLE_REPARATEUR'), ('ROLE_PROPRIETAIRE');

-- Ajouter les colonnes de pourcentage aux utilisateurs
ALTER TABLE users 
ADD COLUMN commission_percentage DECIMAL(5,2) DEFAULT NULL,
ADD COLUMN reparateur_percentage DECIMAL(5,2) DEFAULT NULL;

-- Ajouter le statut de réparation de l'appareil aux tickets
ALTER TABLE tickets 
ADD COLUMN appareil_status VARCHAR(30) DEFAULT 'PAS_COMMENCE';

-- Table des commissions
CREATE TABLE commissions (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_id              BIGINT NOT NULL,
    reparateur_id           BIGINT,
    proprietaire_id         BIGINT,
    montant_reparateur      DECIMAL(12,2) NOT NULL,
    montant_proprietaire    DECIMAL(12,2) NOT NULL,
    pourcentage_reparateur  DECIMAL(5,2) NOT NULL,
    pourcentage_proprietaire DECIMAL(5,2) NOT NULL,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_commission_payment FOREIGN KEY (payment_id) REFERENCES payments (id) ON DELETE CASCADE,
    CONSTRAINT fk_commission_reparateur FOREIGN KEY (reparateur_id) REFERENCES users (id),
    CONSTRAINT fk_commission_proprietaire FOREIGN KEY (proprietaire_id) REFERENCES users (id)
);

CREATE INDEX idx_commissions_payment ON commissions (payment_id);
CREATE INDEX idx_commissions_reparateur ON commissions (reparateur_id);
CREATE INDEX idx_commissions_proprietaire ON commissions (proprietaire_id);

