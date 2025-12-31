package com.centrecommercial.repository;

import com.centrecommercial.domain.user.Role;
import com.centrecommercial.domain.user.RoleType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(RoleType name);
}

