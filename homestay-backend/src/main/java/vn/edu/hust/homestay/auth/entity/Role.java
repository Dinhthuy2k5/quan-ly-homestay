package vn.edu.hust.homestay.auth.entity;

/**
 * Các vai trò người dùng trong hệ thống theo CSDL v6:
 * - CUSTOMER: Khách hàng đăng ký công khai
 * - MANAGER: Quản lý cơ sở homestay
 * - ADMIN: Quản trị hệ thống (quản lý tài khoản)
 * - DIRECTOR: Giám đốc (quản lý homestay, chính sách, phê duyệt giá)
 * Ngày thực hiện: 18/10/2026
 */
public enum Role {
    CUSTOMER,
    MANAGER,
    ADMIN,
    DIRECTOR
}
