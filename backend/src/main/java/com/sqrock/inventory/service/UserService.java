package com.sqrock.inventory.service;

import com.sqrock.inventory.dto.MessageResponse;
import com.sqrock.inventory.dto.UserCreateRequest;
import com.sqrock.inventory.dto.UserResponse;
import com.sqrock.inventory.dto.UserUpdateRequest;
import com.sqrock.inventory.entity.Role;
import com.sqrock.inventory.entity.User;
import com.sqrock.inventory.exception.BusinessRuleException;
import com.sqrock.inventory.exception.DuplicateResourceException;
import com.sqrock.inventory.exception.ResourceNotFoundException;
import com.sqrock.inventory.repository.StockTransactionRepository;
import com.sqrock.inventory.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository users;
    private final StockTransactionRepository transactions;
    private final PasswordEncoder encoder;

    public UserService(UserRepository users, StockTransactionRepository transactions, PasswordEncoder encoder) {
        this.users = users;
        this.transactions = transactions;
        this.encoder = encoder;
    }

    public List<UserResponse> list() {
        return users.findAll().stream().map(Mappers::toResponse).toList();
    }

    public UserResponse get(Long id) {
        return Mappers.toResponse(find(id));
    }

    @Transactional
    public UserResponse create(UserCreateRequest req) {
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(email)) {
            throw new DuplicateResourceException("A user with email " + email + " already exists");
        }
        User u = new User();
        u.setName(req.name().trim());
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(req.password()));
        u.setRole(req.role());
        u.setActive(true);
        return Mappers.toResponse(users.save(u));
    }

    @Transactional
    public UserResponse update(Long id, UserUpdateRequest req, String actingEmail) {
        User u = find(id);
        boolean self = u.getEmail().equalsIgnoreCase(actingEmail);
        if (self && (req.role() != u.getRole() || !req.active())) {
            throw new BusinessRuleException("You cannot change your own role or deactivate your own account");
        }
        guardLastAdmin(u, req.role(), req.active());
        u.setName(req.name().trim());
        u.setRole(req.role());
        u.setActive(req.active());
        if (req.password() != null && !req.password().isBlank()) {
            u.setPasswordHash(encoder.encode(req.password()));
        }
        return Mappers.toResponse(users.save(u));
    }

    /** Users who recorded stock transactions are deactivated instead of deleted, to keep attribution. */
    @Transactional
    public MessageResponse delete(Long id, String actingEmail) {
        User u = find(id);
        if (u.getEmail().equalsIgnoreCase(actingEmail)) {
            throw new BusinessRuleException("You cannot delete your own account");
        }
        guardLastAdmin(u, Role.STAFF, false);
        if (transactions.existsByUserId(id)) {
            u.setActive(false);
            users.save(u);
            return new MessageResponse("User deactivated because they have recorded stock transactions");
        }
        users.delete(u);
        return new MessageResponse("User deleted");
    }

    /** The system must always keep at least one active administrator. */
    private void guardLastAdmin(User u, Role newRole, boolean newActive) {
        boolean losesAdmin = u.getRole() == Role.ADMIN && u.isActive() && (newRole != Role.ADMIN || !newActive);
        if (losesAdmin && users.countByRoleAndActiveTrue(Role.ADMIN) <= 1) {
            throw new BusinessRuleException("At least one active administrator is required");
        }
    }

    private User find(Long id) {
        return users.findById(id).orElseThrow(() -> new ResourceNotFoundException("User", id));
    }
}
