-- Utilisateurs
CREATE TABLE users (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    first_name      VARCHAR(100)            NOT NULL,
    last_name       VARCHAR(100)            NOT NULL,
    email           VARCHAR(180)            NOT NULL,
    password_hash   VARCHAR(255)            NOT NULL,
    phone           VARCHAR(30),
    enabled         BOOLEAN                 NOT NULL DEFAULT TRUE,
    email_verified  BOOLEAN                 NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP               NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX idx_users_email ON users (email);

CREATE TABLE roles (
    id   BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE
);

CREATE TABLE refresh_tokens (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    token       VARCHAR(512) NOT NULL,
    expires_at  TIMESTAMP    NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
    user_id     BIGINT       NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Tickets
CREATE TABLE tickets (
    id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
    code               VARCHAR(36)  NOT NULL,
    title              VARCHAR(150) NOT NULL,
    description        TEXT         NOT NULL,
    status             VARCHAR(30)  NOT NULL,
    priority           VARCHAR(30)  NOT NULL,
    requester_id       BIGINT       NOT NULL,
    assigned_agent_id  BIGINT,
    resolved_at        TIMESTAMP,
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ticket_requester FOREIGN KEY (requester_id) REFERENCES users (id),
    CONSTRAINT fk_ticket_agent FOREIGN KEY (assigned_agent_id) REFERENCES users (id),
    CONSTRAINT uk_ticket_code UNIQUE (code)
);

CREATE INDEX idx_tickets_status ON tickets (status);
CREATE INDEX idx_tickets_created_at ON tickets (created_at);

CREATE TABLE ticket_history (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    ticket_id     BIGINT       NOT NULL,
    actor_id      BIGINT,
    action        VARCHAR(100) NOT NULL,
    from_status   VARCHAR(30),
    to_status     VARCHAR(30),
    note          TEXT,
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
    CONSTRAINT fk_history_actor FOREIGN KEY (actor_id) REFERENCES users (id)
);

-- Paiements
CREATE TABLE payments (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    amount          DECIMAL(12,2) NOT NULL,
    currency        VARCHAR(10)   NOT NULL DEFAULT 'MAD',
    status          VARCHAR(30)   NOT NULL,
    method          VARCHAR(30)   NOT NULL,
    receipt_url     VARCHAR(255),
    notes           TEXT,
    user_id         BIGINT        NOT NULL,
    ticket_id       BIGINT,
    validated_by    BIGINT,
    validated_at    TIMESTAMP,
    created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_payment_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id),
    CONSTRAINT fk_payment_validator FOREIGN KEY (validated_by) REFERENCES users (id)
);

CREATE INDEX idx_payments_status ON payments (status);
CREATE INDEX idx_payments_created_at ON payments (created_at);

-- Notifications
CREATE TABLE notifications (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT       NOT NULL,
    title       VARCHAR(150) NOT NULL,
    message     TEXT         NOT NULL,
    type        VARCHAR(50),
    is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user_read ON notifications (user_id, is_read);

-- Seed rôles
INSERT INTO roles (name) VALUES ('ROLE_ADMIN'), ('ROLE_USER');

