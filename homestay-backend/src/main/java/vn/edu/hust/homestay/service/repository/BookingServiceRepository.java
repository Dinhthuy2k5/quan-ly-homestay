package vn.edu.hust.homestay.service.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.service.entity.BookingService;

import java.util.List;
import java.util.Optional;
import vn.edu.hust.homestay.service.entity.BookingService.BookingServiceStatus;

@Repository
public interface BookingServiceRepository extends JpaRepository<BookingService, Long> {

    List<BookingService> findByBookingIdOrderByIdAsc(Long bookingId);

    List<BookingService> findByBookingIdAndStatus(Long bookingId, BookingServiceStatus status);

    Optional<BookingService> findByIdAndBookingId(Long id, Long bookingId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT bookingService FROM BookingService bookingService WHERE bookingService.id = :id AND bookingService.bookingId = :bookingId")
    Optional<BookingService> findByIdAndBookingIdForUpdate(
            @Param("id") Long id,
            @Param("bookingId") Long bookingId
    );

}
