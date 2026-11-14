package vn.edu.hust.homestay.booking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ManagerCancelBookingRequest(
        @NotBlank @Size(max = 239) String reason,
        @NotNull Boolean requestedByCustomer,
        @Size(max = 100, message = "Tên ngân hàng không được vượt quá 100 ký tự")
        String bankName,

        @Size(max = 20, message = "Số tài khoản ngân hàng không được vượt quá 20 ký tự")
        @Pattern(
                regexp = "^$|^[0-9]{6,20}$",
                message = "Số tài khoản ngân hàng không hợp lệ (phải gồm từ 6 đến 20 chữ số và chỉ chứa số từ 0-9)"
        )
        String bankAccountNumber,

        @Size(max = 50, message = "Tên chủ tài khoản không được vượt quá 50 ký tự")
        @Pattern(
                regexp = "^$|^[\\p{L}\\s]{2,50}$",
                message = "Tên chủ tài khoản không hợp lệ (phải từ 2 đến 50 ký tự chữ cái, không chứa số hoặc ký tự đặc biệt)"
        )
        String bankAccountHolder
) {}
