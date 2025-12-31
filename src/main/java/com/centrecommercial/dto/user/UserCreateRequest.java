package com.centrecommercial.dto.user;

import com.centrecommercial.domain.user.RoleType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.Set;

public record UserCreateRequest(
        @NotBlank String firstName,
        @NotBlank String lastName,
        @Email @NotBlank String email,
        @Size(min = 8) String password,
        String phone,
        @NotEmpty Set<RoleType> roles,
        String specialite,
        BigDecimal reparateurPercentage
) {}

