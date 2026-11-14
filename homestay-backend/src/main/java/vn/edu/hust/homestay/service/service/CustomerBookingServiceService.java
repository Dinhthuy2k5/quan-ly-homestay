package vn.edu.hust.homestay.service.service;

import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.booking.entity.Booking;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.booking.repository.BookingRepository;
import vn.edu.hust.homestay.booking.repository.BookingRoomNightRepository;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.service.dto.CustomerBookingServiceRequest;
import vn.edu.hust.homestay.service.dto.CustomerBookingServiceSelectionRequest;
import vn.edu.hust.homestay.service.dto.CustomerBookingServiceResponse;
import vn.edu.hust.homestay.service.dto.CustomerBookingServiceSummaryResponse;
import vn.edu.hust.homestay.service.entity.BookingService;
import vn.edu.hust.homestay.service.entity.Service;
import vn.edu.hust.homestay.service.repository.BookingServiceRepository;
import vn.edu.hust.homestay.service.repository.ServiceRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@org.springframework.stereotype.Service
public class CustomerBookingServiceService {

    private final BookingRepository bookingRepository;
    private final BookingRoomNightRepository bookingRoomNightRepository;
    private final ServiceRepository serviceRepository;
    private final BookingServiceRepository bookingServiceRepository;

    public CustomerBookingServiceService(
            BookingRepository bookingRepository,
            BookingRoomNightRepository bookingRoomNightRepository,
            ServiceRepository serviceRepository,
            BookingServiceRepository bookingServiceRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingRoomNightRepository = bookingRoomNightRepository;
        this.serviceRepository = serviceRepository;
        this.bookingServiceRepository = bookingServiceRepository;
    }

    @Transactional(readOnly = true)
    public List<CustomerBookingServiceSummaryResponse> getBookingServices(UserPrincipal principal, Long bookingId) {
        Booking booking = findOwnedBooking(principal, bookingId, false);
        return bookingServiceRepository.findByBookingIdOrderByIdAsc(booking.getId()).stream()
                .map(bookingService -> CustomerBookingServiceSummaryResponse.from(
                        bookingService, serviceRepository.findById(bookingService.getServiceId())
                                .map(Service::getName).orElse("Dịch vụ không còn trong danh mục")))
                .toList();
    }

    @Transactional
    public CustomerBookingServiceResponse registerService(
            UserPrincipal principal,
            Long bookingId,
            Long roomId,
            CustomerBookingServiceRequest request
    ) {
        Booking booking = findOwnedBooking(principal, bookingId, true);
        if (!canRegisterService(booking)) {
            throw BusinessException.conflict("SERVICE_BOOKING_CLOSED", "Đơn đặt phòng hiện không nhận đăng ký dịch vụ");
        }

        boolean roomIsCurrentlyBooked = bookingRoomNightRepository.findByBookingId(booking.getId()).stream()
                .anyMatch(night -> night.getId().getRoomId().equals(roomId));
        if (!roomIsCurrentlyBooked) {
            throw BusinessException.badRequest("ROOM_NOT_IN_BOOKING", "Phòng không thuộc đơn đặt phòng này");
        }

        BookingService bookingService = createBookingService(booking, roomId, request.serviceId(), request.quantity(),
                request.serviceDate(), request.note(), principal.getId());
        BookingService saved = bookingServiceRepository.saveAndFlush(bookingService);
        long totalPrice = Math.multiplyExact(saved.getUnitPrice(), saved.getQuantity().longValue());
        String serviceName = serviceRepository.findById(saved.getServiceId())
                .map(Service::getName).orElseThrow();
        return CustomerBookingServiceResponse.from(saved, serviceName, totalPrice);
    }

    public void createInitialServices(
            Booking booking,
            Long requestedBy,
            Set<Long> bookedRoomIds,
            List<CustomerBookingServiceSelectionRequest> selections
    ) {
        if (selections == null || selections.isEmpty()) {
            return;
        }
        List<BookingService> bookingServices = selections.stream().map(selection -> {
            if (!bookedRoomIds.contains(selection.roomId())) {
                throw BusinessException.badRequest("ROOM_NOT_IN_BOOKING", "Phòng đăng ký dịch vụ không thuộc booking");
            }
            return createBookingService(booking, selection.roomId(), selection.serviceId(), selection.quantity(),
                    selection.serviceDate(), selection.note(), requestedBy);
        }).toList();
        bookingServiceRepository.saveAllAndFlush(bookingServices);
    }

    public void cancelRegisteredServices(Long bookingId) {
        List<BookingService> registeredServices = bookingServiceRepository.findByBookingIdAndStatus(
                bookingId, BookingService.BookingServiceStatus.REGISTERED);
        registeredServices.forEach(bookingService -> bookingService.setStatus(BookingService.BookingServiceStatus.CANCELLED));
        if (!registeredServices.isEmpty()) {
            bookingServiceRepository.saveAllAndFlush(registeredServices);
        }
    }

    public void deleteServicesInvalidatedByAdjustment(
            Long bookingId,
            Set<Long> retainedRoomIds,
            LocalDate checkInDate,
            LocalDate checkOutDate
    ) {
        List<BookingService> invalidatedServices = bookingServiceRepository.findByBookingIdOrderByIdAsc(bookingId).stream()
                .filter(bookingService -> !retainedRoomIds.contains(bookingService.getRoomId())
                        || (bookingService.getServiceDate() != null
                        && (bookingService.getServiceDate().isBefore(checkInDate)
                        || !bookingService.getServiceDate().isBefore(checkOutDate))))
                .toList();
        if (!invalidatedServices.isEmpty()) {
            bookingServiceRepository.deleteAll(invalidatedServices);
            bookingServiceRepository.flush();
        }
    }

    private BookingService createBookingService(
            Booking booking,
            Long roomId,
            Long serviceId,
            Integer quantity,
            LocalDate serviceDate,
            String note,
            Long requestedBy
    ) {
        Service service = serviceRepository
                .findByIdAndHomestayIdAndStatus(serviceId, booking.getHomestayId(), Service.ServiceStatus.ACTIVE)
                .orElseThrow(() -> BusinessException.badRequest("SERVICE_NOT_ACTIVE", "Dịch vụ không còn được cung cấp tại homestay này"));
        validateServiceDate(booking, serviceDate);
        try {
            Math.multiplyExact(service.getUnitPrice(), quantity.longValue());
        } catch (ArithmeticException exception) {
            throw BusinessException.badRequest("SERVICE_TOTAL_INVALID", "Số lượng dịch vụ vượt quá giới hạn cho phép");
        }

        BookingService bookingService = new BookingService();
        bookingService.setBookingId(booking.getId());
        bookingService.setHomestayId(booking.getHomestayId());
        bookingService.setRoomId(roomId);
        bookingService.setServiceId(service.getId());
        bookingService.setQuantity(quantity);
        bookingService.setUnitPrice(service.getUnitPrice());
        bookingService.setStatus(BookingService.BookingServiceStatus.REGISTERED);
        bookingService.setServiceDate(serviceDate);
        bookingService.setNote(normalizeNote(note));
        bookingService.setRequestedBy(requestedBy);
        return bookingService;
    }

    private void validateServiceDate(Booking booking, LocalDate serviceDate) {
        if (serviceDate != null && (serviceDate.isBefore(booking.getCheckInDate())
                || !serviceDate.isBefore(booking.getCheckOutDate()))) {
            throw BusinessException.badRequest("SERVICE_DATE_OUTSIDE_BOOKING", "Ngày sử dụng dịch vụ phải nằm trong thời gian lưu trú");
        }
    }

    private boolean canRegisterService(Booking booking) {
        if (booking.getStatus() == BookingStatus.PENDING_DEPOSIT) {
            return booking.getHoldExpiresAt() != null
                    && booking.getHoldExpiresAt().isAfter(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC));
        }
        return booking.getStatus() == BookingStatus.PENDING_APPROVAL
                || booking.getStatus() == BookingStatus.CONFIRMED
                || booking.getStatus() == BookingStatus.CHECKED_IN;
    }

    private Booking findOwnedBooking(UserPrincipal principal, Long bookingId, boolean lock) {
        boolean exists = bookingRepository.existsById(bookingId);
        return (lock
                ? bookingRepository.findByIdAndCustomerIdForUpdate(bookingId, principal.getId())
                : bookingRepository.findByIdAndCustomerId(bookingId, principal.getId()))
                .orElseThrow(() -> exists
                        ? BusinessException.forbidden("BOOKING_NOT_OWNED", "Đây không phải đơn đặt phòng của bạn")
                        : BusinessException.notFound("BOOKING_NOT_FOUND", "Không tìm thấy đơn đặt phòng"));
    }

    private String normalizeNote(String note) {
        if (note == null) {
            return null;
        }
        String trimmed = note.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
