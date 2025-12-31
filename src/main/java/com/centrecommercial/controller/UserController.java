package com.centrecommercial.controller;

import com.centrecommercial.dto.user.PasswordUpdateRequest;
import com.centrecommercial.dto.user.ProfileUpdateRequest;
import com.centrecommercial.dto.user.UserCreateRequest;
import com.centrecommercial.dto.user.UserResponse;
import com.centrecommercial.dto.user.UserUpdateRequest;
import com.centrecommercial.security.UserPrincipal;
import com.centrecommercial.service.UserService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<List<UserResponse>> list() {
        return ResponseEntity.ok(userService.findAll());
    }

    @GetMapping("/clients")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_PROPRIETAIRE')")
    public ResponseEntity<List<UserResponse>> listClients() {
        return ResponseEntity.ok(userService.findByRole("ROLE_USER"));
    }

    @GetMapping("/reparateurs")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_PROPRIETAIRE')")
    public ResponseEntity<List<UserResponse>> listReparateurs() {
        return ResponseEntity.ok(userService.findByRole("ROLE_REPARATEUR"));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.findById(principal.id()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> detail(@PathVariable Long id) {
        return ResponseEntity.ok(userService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserCreateRequest request) {
        return ResponseEntity.ok(userService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<UserResponse> update(@PathVariable Long id, @Valid @RequestBody UserUpdateRequest request) {
        return ResponseEntity.ok(userService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/me/profile")
    public ResponseEntity<UserResponse> updateProfile(@Valid @RequestBody ProfileUpdateRequest request,
                                                      @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.updateProfile(principal.getUsername(), request));
    }

    @PutMapping("/me/password")
    public ResponseEntity<UserResponse> updatePassword(@Valid @RequestBody PasswordUpdateRequest request,
                                                       @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(userService.updatePassword(principal.getUsername(), request));
    }
}

