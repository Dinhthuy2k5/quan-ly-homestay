package vn.edu.hust.homestay.booking.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.BANK_ACCOUNT_HOLDER_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.BANK_ACCOUNT_NUMBER_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.BANK_NAME_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.BOOKING_CANCEL_REASON_MAX_LENGTH;

public record CancelBookingRequest(
        @Size(max = BOOKING_CANCEL_REASON_MAX_LENGTH, message = "Lý do hủy không được vượt quá " + BOOKING_CANCEL_REASON_MAX_LENGTH + " ký tự")
        String reason,

        @Size(max = BANK_NAME_MAX_LENGTH, message = "Tên ngân hàng không được vượt quá " + BANK_NAME_MAX_LENGTH + " ký tự")
        String bankName,

        @Size(max = BANK_ACCOUNT_NUMBER_MAX_LENGTH, message = "Số tài khoản ngân hàng không được vượt quá " + BANK_ACCOUNT_NUMBER_MAX_LENGTH + " ký tự")
        @Pattern(
                regexp = "^$|^[0-9]{6,20}$",
                message = "Số tài khoản ngân hàng không hợp lệ (phải gồm từ 6 đến 20 chữ số và chỉ chứa số từ 0-9)"
        )
        String bankAccountNumber,

        @Size(max = BANK_ACCOUNT_HOLDER_MAX_LENGTH, message = "Tên chủ tài khoản không được vượt quá " + BANK_ACCOUNT_HOLDER_MAX_LENGTH + " ký tự")
        @Pattern(
                regexp = "^$|^[\\p{L}\\s]{2,50}$",
                message = "Tên chủ tài khoản không hợp lệ (phải từ 2 đến 50 ký tự chữ cái, không chứa số hoặc ký tự đặc biệt)"
        )
        String bankAccountHolder
) {}
