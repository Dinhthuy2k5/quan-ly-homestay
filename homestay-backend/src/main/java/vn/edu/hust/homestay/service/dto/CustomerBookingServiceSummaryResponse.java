package vn.edu.hust.homestay.service.dto;

import vn.edu.hust.homestay.service.entity.BookingService;

import java.time.LocalDate;

public record CustomerBookingServiceSummaryResponse(
        Long id,
        Long roomId,
        Long serviceId,
        String serviceName,
        Integer quantity,
        Long unitPrice,
        Long totalPrice,
        BookingService.BookingServiceStatus status,
        LocalDate serviceDate,
        String note
) {
    public static CustomerBookingServiceSummaryResponse from(BookingService bookingService, String serviceName) {
        return new CustomerBookingServiceSummaryResponse(
                bookingService.getId(),
                bookingService.getRoomId(),
                bookingService.getServiceId(),
                serviceName,
                bookingService.getQuantity(),
                bookingService.getUnitPrice(),
                bookingService.getTotalPrice() == null
                        ? Math.multiplyExact(bookingService.getUnitPrice(), bookingService.getQuantity().longValue())
                        : bookingService.getTotalPrice(),
                bookingService.getStatus(),
                bookingService.getServiceDate(),
                bookingService.getNote()
        );
    }
}
