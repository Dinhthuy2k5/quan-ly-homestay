package vn.edu.hust.homestay.payment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;
import vn.edu.hust.homestay.payment.entity.Payment;

import java.util.Optional;
import java.util.List;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findTopByBookingIdAndTypeOrderByCreatedAtDesc(Long bookingId, Payment.PaymentType type);

    List<Payment> findByBookingIdAndTypeInOrderByCreatedAtDesc(
            Long bookingId,
            List<Payment.PaymentType> types
    );

    Optional<Payment> findByIdAndBookingIdAndHomestayId(Long paymentId, Long bookingId, Long homestayId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT payment FROM Payment payment WHERE payment.id = :paymentId AND payment.bookingId = :bookingId AND payment.homestayId = :homestayId")
    Optional<Payment> findByIdAndBookingIdAndHomestayIdForUpdate(
            @Param("paymentId") Long paymentId,
            @Param("bookingId") Long bookingId,
            @Param("homestayId") Long homestayId
    );

    // nếu ko có bản ghi nào, coalesce(sum(), 0) trả về 0
    @Query("""
            SELECT COALESCE(SUM(payment.amount), 0)
            FROM Payment payment
            WHERE payment.bookingId = :bookingId
              AND payment.type = :type
              AND payment.status = :status
            """)
    long sumConfirmedDeposits(
            @Param("bookingId") Long bookingId,
            @Param("type") Payment.PaymentType type,
            @Param("status") Payment.PaymentStatus status
    );

    @Query("""
            SELECT COALESCE(SUM(payment.amount), 0)
            FROM Payment payment
            WHERE payment.bookingId = :bookingId
              AND payment.type IN :types
              AND payment.status = :status
            """)
    long sumConfirmedAmounts(
            @Param("bookingId") Long bookingId,
            @Param("types") List<Payment.PaymentType> types,
            @Param("status") Payment.PaymentStatus status
    );
}
