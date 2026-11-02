package vn.edu.hust.homestay.booking.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.booking.dto.ManagerBookingSummaryResponse;
import vn.edu.hust.homestay.booking.dto.ManagerBookingSummaryResponse.BookingRoomSummary;
import vn.edu.hust.homestay.booking.entity.Booking;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.booking.entity.BookingRoom;
import vn.edu.hust.homestay.booking.repository.BookingRepository;
import vn.edu.hust.homestay.booking.repository.BookingRoomRepository;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.repository.RoomRepository;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service xử lý các nghiệp vụ quản lý Booking của Manager:
 * - API-MGR-BOOK-01: Danh sách booking cơ sở
 */
@Service
public class ManagerBookingService {

    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final BookingRepository bookingRepository;
    private final BookingRoomRepository bookingRoomRepository;
    private final RoomRepository roomRepository;
    private final HomestayRepository homestayRepository;

    public ManagerBookingService(
            BookingRepository bookingRepository,
            BookingRoomRepository bookingRoomRepository,
            RoomRepository roomRepository,
            HomestayRepository homestayRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingRoomRepository = bookingRoomRepository;
        this.roomRepository = roomRepository;
        this.homestayRepository = homestayRepository;
    }

    /**
     * API-MGR-BOOK-01: Lấy danh sách booking của homestay được giao cho Manager.
     */
    @Transactional(readOnly = true)
    public Page<ManagerBookingSummaryResponse> getHomestayBookings(
            UserPrincipal principal,
            BookingStatus status,
            LocalDate fromDate,
            LocalDate toDate,
            String keyword,
            Pageable pageable
    ) {
        Long homestayId = validateAndGetHomestayId(principal);

        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "fromDate không được sau toDate");
        }

        String normalizedKeyword = (keyword == null || keyword.isBlank()) ? null : keyword.trim();

        Page<Booking> page = bookingRepository.findHomestayBookings(
                homestayId,
                status,
                fromDate,
                toDate,
                normalizedKeyword,
                pageable
        );

        List<Booking> bookings = page.getContent();
        if (bookings.isEmpty()) {
            return new PageImpl<>(Collections.emptyList(), pageable, page.getTotalElements());
        }

        // Tải thông tin phòng cho các booking để tránh N+1
        List<Long> bookingIds = bookings.stream().map(Booking::getId).toList();
        List<BookingRoom> bookingRooms = bookingRoomRepository.findByBookingIdIn(bookingIds);

        Set<Long> roomIds = bookingRooms.stream().map(BookingRoom::getRoomId).collect(Collectors.toSet());
        Map<Long, Room> roomMap = roomIds.isEmpty() ? Map.of() :
                roomRepository.findAllById(roomIds).stream().collect(Collectors.toMap(Room::getId, r -> r));

        Map<Long, List<BookingRoomSummary>> roomsByBookingId = bookingRooms.stream()
                .collect(Collectors.groupingBy(
                        BookingRoom::getBookingId,
                        Collectors.mapping(br -> {
                            Room room = roomMap.get(br.getRoomId());
                            return new BookingRoomSummary(
                                    br.getRoomId(),
                                    room != null ? room.getName() : "Phòng #" + br.getRoomId()
                            );
                        }, Collectors.toList())
                ));

        List<ManagerBookingSummaryResponse> responses = bookings.stream().map(b -> {
            OffsetDateTime holdExpiresAt = b.getHoldExpiresAt() == null ? null :
                    b.getHoldExpiresAt().atOffset(ZoneOffset.UTC)
                            .atZoneSameInstant(BUSINESS_TIME_ZONE).toOffsetDateTime();

            return new ManagerBookingSummaryResponse(
                    b.getId(),
                    b.getCode(),
                    b.getContactName(),
                    b.getContactPhone(),
                    b.getContactEmail(),
                    b.getStatus(),
                    b.getCheckInDate(),
                    b.getCheckOutDate(),
                    b.getGuestCount(),
                    b.getRoomTotalPrice(),
                    b.getDepositAmount(),
                    holdExpiresAt,
                    b.getCreatedAt(),
                    roomsByBookingId.getOrDefault(b.getId(), List.of())
            );
        }).toList();

        return new PageImpl<>(responses, pageable, page.getTotalElements());
    }

    private Long validateAndGetHomestayId(UserPrincipal principal) {
        if (principal == null || principal.getHomestayId() == null) {
            throw BusinessException.badRequest("HOMESTAY_NOT_ASSIGNED", "Tài khoản quản lý chưa được phân công cơ sở");
        }
        return principal.getHomestayId();
    }
}
