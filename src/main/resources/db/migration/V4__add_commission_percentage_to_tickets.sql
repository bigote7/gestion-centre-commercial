-- Migration V4 : Ajout du champ commission_percentage à la table tickets
-- Ce champ stocke le pourcentage de commission du réparateur saisi par le propriétaire lors de la création du ticket

ALTER TABLE tickets 
ADD COLUMN commission_percentage DECIMAL(5,2) DEFAULT 30.00 
COMMENT 'Pourcentage de commission du réparateur saisi par le propriétaire lors de la création du ticket';

