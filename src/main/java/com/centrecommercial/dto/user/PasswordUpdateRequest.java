package com.centrecommercial.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordUpdateRequest(
        @NotBlank String currentPassword,
        @Size(min = 8) String newPassword
) {}

