package com.centrecommercial.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.centrecommercial.domain.payment.PaymentMethod;
import com.centrecommercial.domain.payment.PaymentStatus;
import com.centrecommercial.domain.ticket.TicketPriority;
import com.centrecommercial.domain.user.Role;
import com.centrecommercial.domain.user.RoleType;
import com.centrecommercial.domain.user.User;
import com.centrecommercial.dto.payment.PaymentRequest;
import com.centrecommercial.dto.payment.PaymentResponse;
import com.centrecommercial.dto.payment.PaymentValidationRequest;
import com.centrecommercial.dto.ticket.TicketCreateRequest;
import com.centrecommercial.dto.ticket.TicketResponse;
import com.centrecommercial.repository.RoleRepository;
import com.centrecommercial.repository.UserRepository;
import java.math.BigDecimal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class PaymentServiceIT {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private TicketService ticketService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private User requester;
    private User validator;
    private TicketResponse ticket;

    @BeforeEach
    void initData() {
        for (RoleType type : RoleType.values()) {
            roleRepository.findByName(type).orElseGet(() -> roleRepository.save(new Role(type)));
        }
        requester = createUser("client@example.com");
        validator = createUser("admin@example.com");
        ticket = ticketService.create(requester.getId(),
                new TicketCreateRequest(
                        "Diagnostic",
                        "Analyse complète",
                        TicketPriority.MOYENNE,
                        null, // clientId
                        null, // clientFirstName
                        null, // clientLastName
                        null, // clientEmail
                        null, // clientPhone
                        null, // deviceType
                        null, // brand
                        null, // model
                        null  // accessories
                ));
    }

    @Test
    void shouldCreateAndValidatePayment() {
        PaymentRequest request = new PaymentRequest(
                new BigDecimal("499.99"),
                "MAD",
                PaymentMethod.CARTE_BANCAIRE,
                ticket.id(),
                "Payment initial"
        );

        PaymentResponse created = paymentService.create(requester.getId(), request);
        assertThat(created.id()).isNotNull();
        assertThat(created.status()).isEqualTo(PaymentStatus.EN_ATTENTE);

        PaymentValidationRequest validationRequest = new PaymentValidationRequest(
                PaymentStatus.VALIDE,
                "https://cdn.example.com/receipt.pdf",
                "Validé par support"
        );

        PaymentResponse validated = paymentService.validate(created.id(), validationRequest, validator.getId());
        assertThat(validated.status()).isEqualTo(PaymentStatus.VALIDE);
        assertThat(validated.validatedBy()).isEqualTo(validator.getId());
    }

    private User createUser(String email) {
        User user = User.builder()
                .firstName("Test")
                .lastName("User")
                .email(email)
                .passwordHash(passwordEncoder.encode("Password123!"))
                .build();
        roleRepository.findByName(RoleType.ROLE_USER).ifPresent(role -> user.getRoles().add(role));
        return userRepository.save(user);
    }
}

