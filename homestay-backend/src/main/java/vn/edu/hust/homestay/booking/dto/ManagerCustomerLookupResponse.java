package vn.edu.hust.homestay.booking.dto;

import vn.edu.hust.homestay.auth.entity.User;

public record ManagerCustomerLookupResponse(
        Long id,
        String fullName,
        String phone,
        String email
) {
    public static ManagerCustomerLookupResponse from(User user) {
        return new ManagerCustomerLookupResponse(
                user.getId(),
                user.getFullName(),
                user.getPhone(),
                user.getEmail()
        );
    }
}
