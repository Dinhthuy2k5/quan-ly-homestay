package vn.edu.hust.homestay.booking.repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.hust.homestay.booking.entity.BookingRoomNight;
import vn.edu.hust.homestay.booking.entity.BookingRoomNightId;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface BookingRoomNightRepository extends JpaRepository<BookingRoomNight, BookingRoomNightId> {

    /** Giải phóng tất cả các đêm phòng đang giữ cho danh sách booking hết hạn trong cùng transaction. */
    @Modifying(flushAutomatically = true)
    @Query("DELETE FROM BookingRoomNight night WHERE night.bookingId IN :bookingIds")
    int deleteAllByBookingIdIn(@Param("bookingIds") Collection<Long> bookingIds);

    @Query(value = """
            SELECT room_id, stay_date
            FROM booking_room_nights
            WHERE room_id IN (:roomIds)
              AND stay_date >= :checkInDate
              AND stay_date < :checkOutDate
            """, nativeQuery = true)
    List<Object[]> findExistingNights(
            @Param("roomIds") Collection<Long> roomIds,
            @Param("checkInDate") LocalDate checkInDate,
            @Param("checkOutDate") LocalDate checkOutDate
    );

    @Query(value = """
            SELECT room_id, stay_date
            FROM booking_room_nights
            WHERE room_id IN (:roomIds)
              AND stay_date >= :checkInDate
              AND stay_date < :checkOutDate
              AND booking_id != :excludeBookingId
            """, nativeQuery = true)
    List<Object[]> findExistingNightsExcludingBooking(
            @Param("roomIds") Collection<Long> roomIds,
            @Param("checkInDate") LocalDate checkInDate,
            @Param("checkOutDate") LocalDate checkOutDate,
            @Param("excludeBookingId") Long excludeBookingId
    );

    List<BookingRoomNight> findByBookingId(Long bookingId);

    List<BookingRoomNight> findByBookingIdIn(Collection<Long> bookingIds);

    List<BookingRoomNight> findByBookingIdOrderByIdRoomIdAscIdStayDateAsc(Long bookingId);
}
