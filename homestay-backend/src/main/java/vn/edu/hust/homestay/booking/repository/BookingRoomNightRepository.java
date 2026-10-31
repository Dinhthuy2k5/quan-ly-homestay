package vn.edu.hust.homestay.booking.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.hust.homestay.booking.entity.BookingRoomNight;
import vn.edu.hust.homestay.booking.entity.BookingRoomNightId;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface BookingRoomNightRepository extends JpaRepository<BookingRoomNight, BookingRoomNightId> {

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
}
