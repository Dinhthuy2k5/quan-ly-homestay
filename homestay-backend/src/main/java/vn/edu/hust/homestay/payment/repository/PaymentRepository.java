package vn.edu.hust.homestay.payment.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import vn.edu.hust.homestay.payment.entity.Payment;

import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findTopByBookingIdAndTypeOrderByCreatedAtDesc(Long bookingId, Payment.PaymentType type);

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
}
