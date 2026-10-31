package vn.edu.hust.homestay.booking.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.hust.homestay.booking.entity.BookingRoom;

import java.util.Collection;
import java.util.List;

public interface BookingRoomRepository extends JpaRepository<BookingRoom, Long> {

    List<BookingRoom> findByBookingIdIn(Collection<Long> bookingIds);

    List<BookingRoom> findByBookingId(Long bookingId);
}
