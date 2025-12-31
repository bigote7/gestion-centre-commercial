package com.centrecommercial.service;

import com.centrecommercial.domain.user.Role;
import com.centrecommercial.domain.user.RoleType;
import com.centrecommercial.domain.user.User;
import com.centrecommercial.dto.user.PasswordUpdateRequest;
import com.centrecommercial.dto.user.ProfileUpdateRequest;
import com.centrecommercial.dto.user.UserCreateRequest;
import com.centrecommercial.dto.user.UserResponse;
import com.centrecommercial.dto.user.UserUpdateRequest;
import com.centrecommercial.exception.BusinessException;
import com.centrecommercial.exception.NotFoundException;
import com.centrecommercial.repository.RoleRepository;
import com.centrecommercial.repository.UserRepository;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public List<UserResponse> findAll() {
        return userRepository.findAll().stream().map(this::toResponse).toList();
    }

    public List<UserResponse> findByRole(String roleName) {
        RoleType roleType = RoleType.valueOf(roleName);
        return userRepository.findAll().stream()
                .filter(user -> user.hasRole(roleType))
                .map(this::toResponse)
                .toList();
    }

    public UserResponse findById(Long id) {
        return toResponse(getById(id));
    }

    public UserResponse findByEmail(String email) {
        return toResponse(getByEmail(email));
    }

    @Transactional
    public UserResponse create(UserCreateRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BusinessException("Email déjà utilisé.");
        }
        User user = new User();
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(request.email());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setPhone(request.phone());
        user.setRoles(resolveRoles(request.roles()));
        user.setSpecialite(request.specialite());
        user.setReparateurPercentage(request.reparateurPercentage());
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse update(Long id, UserUpdateRequest request) {
        User user = getById(id);
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(request.email());
        user.setPhone(request.phone());
        if (request.roles() != null && !request.roles().isEmpty()) {
            user.setRoles(resolveRoles(request.roles()));
        }
        if (request.enabled() != null) {
            user.setEnabled(request.enabled());
        }
        user.setSpecialite(request.specialite());
        user.setReparateurPercentage(request.reparateurPercentage());
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void delete(Long id) {
        userRepository.deleteById(id);
    }

    @Transactional
    public UserResponse updatePassword(Long userId, PasswordUpdateRequest request) {
        User user = getById(userId);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Mot de passe actuel incorrect.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateProfile(Long userId, ProfileUpdateRequest request) {
        User user = getById(userId);
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPhone(request.phone());
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updateProfile(String email, ProfileUpdateRequest request) {
        User user = getByEmail(email);
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setPhone(request.phone());
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse updatePassword(String email, PasswordUpdateRequest request) {
        User user = getByEmail(email);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BusinessException("Mot de passe actuel incorrect.");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        return toResponse(userRepository.save(user));
    }

    private Set<Role> resolveRoles(Set<RoleType> roleTypes) {
        return roleTypes.stream()
                .map(role -> roleRepository.findByName(role)
                        .orElseThrow(() -> new NotFoundException("Rôle " + role + " introuvable")))
                .collect(Collectors.toSet());
    }

    private User getById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
    }

    private User getByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("Utilisateur introuvable"));
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

