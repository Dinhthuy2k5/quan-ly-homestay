package vn.edu.hust.homestay.booking.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.hust.homestay.booking.entity.Booking;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    /** Lock a bounded batch so expiry cannot race with another booking state transition. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    List<Booking> findTop100ByStatusAndHoldExpiresAtLessThanEqualOrderByIdAsc(
            BookingStatus status,
            LocalDateTime holdExpiresAt
    );

    Page<Booking> findByCustomerId(Long customerId, Pageable pageable);

    Page<Booking> findByCustomerIdAndStatus(Long customerId, BookingStatus status, Pageable pageable);

    Optional<Booking> findByIdAndCustomerId(Long id, Long customerId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT booking FROM Booking booking WHERE booking.id = :id AND booking.customerId = :customerId")
    Optional<Booking> findByIdAndCustomerIdForUpdate(
            @Param("id") Long id,
            @Param("customerId") Long customerId
    );

    @Query("""
        SELECT b FROM Booking b
        WHERE b.homestayId = :homestayId
          AND (:status IS NULL OR b.status = :status)
          AND (:fromDate IS NULL OR b.checkInDate >= :fromDate)
          AND (:toDate IS NULL OR b.checkInDate <= :toDate)
          AND (:keyword IS NULL OR (
                LOWER(b.code) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(b.contactPhone) LIKE LOWER(CONCAT('%', :keyword, '%'))
                OR LOWER(b.contactName) LIKE LOWER(CONCAT('%', :keyword, '%'))
          ))
    """)
    Page<Booking> findHomestayBookings(
            @Param("homestayId") Long homestayId,
            @Param("status") BookingStatus status,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("keyword") String keyword,
            Pageable pageable
    );
}
