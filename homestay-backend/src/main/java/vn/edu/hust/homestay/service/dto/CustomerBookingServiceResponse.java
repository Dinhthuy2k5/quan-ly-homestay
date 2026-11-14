package vn.edu.hust.homestay.service.dto;

import vn.edu.hust.homestay.service.entity.BookingService;

import java.time.LocalDate;

public record CustomerBookingServiceResponse(
        Long id,
        Long bookingId,
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
    public static CustomerBookingServiceResponse from(BookingService bookingService, String serviceName, Long totalPrice) {
        return new CustomerBookingServiceResponse(
                bookingService.getId(),
                bookingService.getBookingId(),
                bookingService.getRoomId(),
                bookingService.getServiceId(),
                serviceName,
                bookingService.getQuantity(),
                bookingService.getUnitPrice(),
                totalPrice,
                bookingService.getStatus(),
                bookingService.getServiceDate(),
                bookingService.getNote()
        );
    }
}
