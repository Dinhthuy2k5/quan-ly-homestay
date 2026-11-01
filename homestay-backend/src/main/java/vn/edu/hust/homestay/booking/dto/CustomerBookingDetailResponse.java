package vn.edu.hust.homestay.booking.dto;

import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Response cho API-CUS-03: Chi tiết booking của khách hàng.
 * Bao gồm đầy đủ phòng, các đêm lưu trú, tổng tiền và hướng dẫn chuyển khoản.
 */
public record CustomerBookingDetailResponse(
        Long id,
        String code,
        Long homestayId,
        String homestayName,
        String homestayProvince,
        String homestayAddress,
        BookingStatus status,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        Short guestCount,
        String note,
        Long roomTotalPrice,
        Long depositAmount,
        Long paidAmount,
        Long outstandingAmount,
        OffsetDateTime holdExpiresAt,
        Instant createdAt,
        List<BookingRoomDetail> rooms,
        CreateBookingResponse.PaymentInstruction paymentInstruction
) {
    public record BookingRoomDetail(
            Long roomId,
            String roomName,
            String coverImageUrl,
            List<RoomNightDetail> nights
    ) {}

    public record RoomNightDetail(
            LocalDate stayDate,
            Long nightlyPrice,
            String appliedRuleName
    ) {}
}
