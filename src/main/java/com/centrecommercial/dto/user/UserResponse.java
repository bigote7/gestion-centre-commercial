package com.centrecommercial.dto.user;

import com.centrecommercial.domain.user.RoleType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Set;

public record UserResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        String phone,
        boolean enabled,
        boolean emailVerified,
        Set<RoleType> roles,
        String specialite,
        BigDecimal reparateurPercentage,
        Instant createdAt,
        Instant updatedAt
) {}

