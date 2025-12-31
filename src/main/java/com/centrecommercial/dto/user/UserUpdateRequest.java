package com.centrecommercial.dto.user;

import com.centrecommercial.domain.user.RoleType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.util.Set;

public record UserUpdateRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @Email @NotBlank String email,
        String phone,
        Set<RoleType> roles,
        Boolean enabled,
        String specialite,
        BigDecimal reparateurPercentage
) {}

