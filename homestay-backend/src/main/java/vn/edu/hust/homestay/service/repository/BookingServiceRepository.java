package vn.edu.hust.homestay.service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.service.entity.BookingService;

import java.util.List;
import vn.edu.hust.homestay.service.entity.BookingService.BookingServiceStatus;

@Repository
public interface BookingServiceRepository extends JpaRepository<BookingService, Long> {

    List<BookingService> findByBookingIdOrderByIdAsc(Long bookingId);

    List<BookingService> findByBookingIdAndStatus(Long bookingId, BookingServiceStatus status);

}
