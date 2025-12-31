package com.centrecommercial.dto.auth;

import com.centrecommercial.dto.user.UserResponse;

public record AuthResponse(
        String token,
        String refreshToken,
        long expiresIn,
        UserResponse user
) {}

