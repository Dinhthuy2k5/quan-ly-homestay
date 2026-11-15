package vn.edu.hust.homestay.service.dto;

import vn.edu.hust.homestay.service.entity.BookingService.BookingServiceStatus;

public record CustomerCancelBookingServiceResponse(
        Long id,
        BookingServiceStatus status
) {
    public static CustomerCancelBookingServiceResponse from(Long id, BookingServiceStatus status) {
        return new CustomerCancelBookingServiceResponse(id, status);
    }
}
