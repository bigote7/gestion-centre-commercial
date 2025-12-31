package com.centrecommercial.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.centrecommercial.domain.user.Role;
import com.centrecommercial.domain.user.RoleType;
import com.centrecommercial.dto.auth.AuthResponse;
import com.centrecommercial.dto.auth.LoginRequest;
import com.centrecommercial.dto.auth.RegisterRequest;
import com.centrecommercial.dto.user.UserResponse;
import com.centrecommercial.repository.RoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AuthServiceIT {

    @Autowired
    private AuthService authService;

    @Autowired
    private RoleRepository roleRepository;

    @BeforeEach
    void setUpRoles() {
        for (RoleType type : RoleType.values()) {
            roleRepository.findByName(type).orElseGet(() -> roleRepository.save(new Role(type)));
        }
    }

    @Test
    void shouldRegisterAndLoginUser() {
        RegisterRequest registerRequest = new RegisterRequest(
                "Alice",
                "Durand",
                "alice@example.com",
                "Password123!",
                "0612345678"
        );

        UserResponse created = authService.register(registerRequest);
        assertThat(created.id()).isNotNull();
        assertThat(created.email()).isEqualTo(registerRequest.email());

        AuthResponse authResponse = authService.login(new LoginRequest(registerRequest.email(), registerRequest.password()));
        assertThat(authResponse.token()).isNotBlank();
        assertThat(authResponse.user().email()).isEqualTo(registerRequest.email());
    }
}

