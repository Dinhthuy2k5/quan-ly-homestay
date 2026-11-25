package vn.edu.hust.homestay.payment.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(name = "payments")
@Getter
@Setter
@NoArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_id", nullable = false)
    private Long bookingId;

    @Column(name = "homestay_id", nullable = false)
    private Long homestayId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentType type;

    @Column(nullable = false)
    private Long amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status = PaymentStatus.PENDING;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    @Column(name = "bank_account_number", length = 100)
    private String bankAccountNumber;

    @Column(name = "bank_account_holder", length = 100)
    private String bankAccountHolder;

    @Column(name = "reference_code", length = 100)
    private String referenceCode;

    /** Mã đơn duy nhất gửi sang cổng thanh toán (VNPay vnp_TxnRef) để chống gửi trùng và đối soát. */
    @Column(name = "provider_order_id", length = 100, unique = true)
    private String providerOrderId;

    /** Mã giao dịch do cổng thanh toán (VNPay vnp_TransactionNo) cấp khi thu/hoàn thành công; dùng để gọi API hoàn tiền. */
    @Column(name = "provider_trans_id", length = 100)
    private String providerTransId;

    @Column(name = "proof_url", length = 500)
    private String proofUrl;

    @Column(name = "rejection_reason", length = 255)
    private String rejectionReason;

    @Column(length = 255)
    private String note;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "confirmed_by")
    private Long confirmedBy;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (status == null) status = PaymentStatus.PENDING;
        if (createdAt == null) createdAt = LocalDateTime.now(ZoneOffset.UTC);
    }

    public enum PaymentType { DEPOSIT, PAYMENT, REFUND }
    public enum PaymentMethod {
        CASH, BANK_TRANSFER, VNPAY;

        /** Xác định đây có phải phương thức thanh toán qua cổng trực tuyến tự động (VNPay) hay không. */
        public boolean isOnlineGateway() {
            return this == VNPAY;
        }
    }
    public enum PaymentStatus { PENDING, CONFIRMED, REJECTED }
}
