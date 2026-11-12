package vn.edu.hust.homestay.booking.dto;

import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Response DTO cho API-MGR-BOOK-03: Chi tiết booking dành cho Manager.
 * Xem đầy đủ phòng, các đêm lưu trú, thông tin khách, chính sách snapshot,
 * dữ liệu cân đối tiền, thanh toán và dịch vụ.
 */
public record ManagerBookingDetailResponse(
        Long id,
        String code,
        Long homestayId,
        String homestayName,
        Long customerId,
        String customerFullName,
        String customerPhone,
        String customerEmail,
        String contactName,
        String contactPhone,
        String contactEmail,
        String source,
        BookingStatus status,
        LocalDate checkInDate,
        LocalDate checkOutDate,
        Short guestCount,
        String note,
        Long roomTotalPrice,
        Long depositAmount,
        Long paidAmount,
        Long outstandingAmount,
        Long refundAmount,
        OffsetDateTime holdExpiresAt,
        Long approvedBy,
        String approvedByName,
        Instant approvedAt,
        Long cancelledBy,
        String cancelledByName,
        Instant cancelledAt,
        String cancelReason,
        String policySnapshot,
        Long createdBy,
        String createdByName,
        Instant createdAt,
        Instant updatedAt,
        List<BookingRoomDetail> rooms,
        PaymentInstruction paymentInstruction,
        List<PaymentSummary> payments,
        List<ServiceSummary> services
) {
    public record BookingRoomDetail(
            Long roomId,
            String roomName,
            String name,
            String roomTypeName,
            Byte maxGuests,
            String coverImageUrl,
            List<RoomNightDetail> nights
    ) {
        public BookingRoomDetail(Long roomId, String roomName, String roomTypeName, Byte maxGuests, String coverImageUrl, List<RoomNightDetail> nights) {
            this(roomId, roomName, roomName, roomTypeName, maxGuests, coverImageUrl, nights);
        }
    }

    public record RoomNightDetail(
            LocalDate stayDate,
            Long nightlyPrice,
            String appliedRuleName
    ) {}

    public record PaymentInstruction(
            String bankName,
            String bankAccountNumber,
            String bankAccountHolder,
            String transferContent
    ) {}

    public record PaymentSummary(
            Long id,
            String paymentType,
            Long amount,
            String status,
            String paymentMethod,
            String referenceCode,
            String rejectionReason,
            Instant createdAt,
            Instant confirmedAt,
            boolean proofAvailable,
            String proofMimeType,
            String note
    ) {}

    public record ServiceSummary(
            Long id,
            String serviceName,
            Integer quantity,
            Long unitPrice,
            Long totalPrice
    ) {}
}
