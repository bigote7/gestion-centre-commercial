package com.centrecommercial.controller;

import com.centrecommercial.dto.payment.PaymentDetailResponse;
import com.centrecommercial.dto.payment.PaymentRequest;
import com.centrecommercial.dto.payment.PaymentResponse;
import com.centrecommercial.dto.payment.PaymentValidationRequest;
import com.centrecommercial.security.UserPrincipal;
import com.centrecommercial.service.PaymentService;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @GetMapping
    public ResponseEntity<List<PaymentResponse>> listForCurrentUser(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(paymentService.findByUser(principal.id()));
    }

    @GetMapping("/all")
    @PreAuthorize("hasAuthority('ROLE_ADMIN') or hasAuthority('ROLE_PROPRIETAIRE')")
    public ResponseEntity<List<PaymentDetailResponse>> listAll() {
        return ResponseEntity.ok(paymentService.findAllWithDetails());
    }

    @GetMapping("/ticket/{ticketId}")
    public ResponseEntity<List<PaymentResponse>> listByTicket(@PathVariable Long ticketId) {
        return ResponseEntity.ok(paymentService.findByTicket(ticketId));
    }

    @PostMapping
    public ResponseEntity<PaymentResponse> create(@Valid @RequestBody PaymentRequest request,
                                                  @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(paymentService.create(principal.id(), request));
    }

    @PutMapping("/{paymentId}/validate")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<PaymentResponse> validate(@PathVariable Long paymentId,
                                                    @Valid @RequestBody PaymentValidationRequest request,
                                                    @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(paymentService.validate(paymentId, request, principal.id()));
    }
}

