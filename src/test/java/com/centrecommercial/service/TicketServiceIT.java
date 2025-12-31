package com.centrecommercial.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.centrecommercial.domain.ticket.TicketPriority;
import com.centrecommercial.domain.user.Role;
import com.centrecommercial.domain.user.RoleType;
import com.centrecommercial.domain.user.User;
import com.centrecommercial.dto.ticket.TicketCreateRequest;
import com.centrecommercial.dto.ticket.TicketResponse;
import com.centrecommercial.repository.RoleRepository;
import com.centrecommercial.repository.UserRepository;
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
class TicketServiceIT {

    @Autowired
    private TicketService ticketService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void ensureRoles() {
        for (RoleType type : RoleType.values()) {
            roleRepository.findByName(type).orElseGet(() -> roleRepository.save(new Role(type)));
        }
    }

    @Test
    void shouldCreateTicketForRequester() {
        User requester = createUser("paul@example.com");

        TicketCreateRequest request = new TicketCreateRequest(
                "Panne écran",
                "L'écran reste noir au démarrage",
                TicketPriority.HAUTE,
                null, // clientId
                null, // clientFirstName
                null, // clientLastName
                null, // clientEmail
                null, // clientPhone
                null, // deviceType
                null, // brand
                null, // model
                null  // accessories
        );

        TicketResponse response = ticketService.create(requester.getId(), request);

        assertThat(response.id()).isNotNull();
        assertThat(response.title()).isEqualTo(request.title());
        assertThat(response.priority()).isEqualTo(TicketPriority.HAUTE);
        assertThat(response.requesterId()).isEqualTo(requester.getId());
    }

    private User createUser(String email) {
        User user = User.builder()
                .firstName("Paul")
                .lastName("Martin")
                .email(email)
                .passwordHash(passwordEncoder.encode("Password123!"))
                .build();
        roleRepository.findByName(RoleType.ROLE_USER).ifPresent(role -> user.getRoles().add(role));
        return userRepository.save(user);
    }
}

