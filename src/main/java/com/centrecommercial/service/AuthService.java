package com.centrecommercial.service;

import com.centrecommercial.domain.user.RefreshToken;
import com.centrecommercial.domain.user.Role;
import com.centrecommercial.domain.user.RoleType;
import com.centrecommercial.domain.user.User;
import com.centrecommercial.dto.auth.AuthResponse;
import com.centrecommercial.dto.auth.LoginRequest;
import com.centrecommercial.dto.auth.RefreshTokenRequest;
import com.centrecommercial.dto.auth.RegisterRequest;
import com.centrecommercial.dto.user.UserResponse;
import com.centrecommercial.exception.BusinessException;
import com.centrecommercial.exception.NotFoundException;
import com.centrecommercial.repository.RefreshTokenRepository;
import com.centrecommercial.repository.RoleRepository;
import com.centrecommercial.repository.UserRepository;
import com.centrecommercial.security.JwtUtils;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException("Un compte existe déjà avec cet email.");
        }
        Role userRole = roleRepository.findByName(RoleType.ROLE_USER)
                .orElseThrow(() -> new NotFoundException("Rôle ROLE_USER introuvable"));

        User user = User.builder()
                .firstName(request.firstName())
                .lastName(request.lastName())
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .phone(request.phone())
                .roles(Set.of(userRole))
                .build();

        userRepository.save(user);
        return toResponse(user);
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.email(), request.password()));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        String token = jwtUtils.generateToken((org.springframework.security.core.userdetails.UserDetails) authentication.getPrincipal());
        RefreshToken refreshToken = createRefreshToken(request.email());

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));

        return new AuthResponse(token, refreshToken.getToken(), jwtUtils.getExpirationMs(), toResponse(user));
    }

    public AuthResponse refresh(RefreshTokenRequest request) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(request.refreshToken())
                .filter(token -> !token.isRevoked() && token.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new BusinessException("Refresh token invalide ou expiré."));

        User user = refreshToken.getUser();
        String token = jwtUtils.generateToken(org.springframework.security.core.userdetails.User.withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .authorities(user.getRoles().stream().map(r -> r.getName().name()).toArray(String[]::new))
                .build());

        return new AuthResponse(token, refreshToken.getToken(), jwtUtils.getExpirationMs(), toResponse(user));
    }

    @Transactional
    public void logout(Long userId) {
        refreshTokenRepository.deleteByUser_Id(userId);
    }

    private RefreshToken createRefreshToken(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(user);
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiresAt(Instant.now().plusSeconds(60L * 60L * 24L * 7L)); // 7 jours
        return refreshTokenRepository.save(refreshToken);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhone(),
                user.isEnabled(),
                user.isEmailVerified(),
                user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()),
                user.getSpecialite(),
                user.getReparateurPercentage(),
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}

