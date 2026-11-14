package vn.edu.hust.homestay.payment.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.payment.dto.ConfirmRefundRequest;
import vn.edu.hust.homestay.payment.dto.ConfirmRefundResponse;
import vn.edu.hust.homestay.payment.entity.Payment;
import vn.edu.hust.homestay.payment.repository.PaymentRepository;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
public class ManagerPaymentService {

    private final PaymentRepository paymentRepository;

    public ManagerPaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    /** API-PAY-04: Confirm a refund only after the Manager has actually sent it. */
    @Transactional
    public ConfirmRefundResponse confirmRefund(
            UserPrincipal principal, Long paymentId, ConfirmRefundRequest request
    ) {
        if (principal == null || principal.getHomestayId() == null) {
            throw BusinessException.badRequest("HOMESTAY_NOT_ASSIGNED", "Tài khoản quản lý chưa được phân công cơ sở");
        }

        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> BusinessException.notFound("PAYMENT_NOT_FOUND", "Không tìm thấy khoản thanh toán"));
        if (!principal.getHomestayId().equals(payment.getHomestayId())) {
            throw BusinessException.forbidden(
                    "HOMESTAY_SCOPE_VIOLATION", "Khoản hoàn tiền không thuộc cơ sở homestay được giao quản lý");
        }
        if (payment.getType() != Payment.PaymentType.REFUND) {
            throw BusinessException.badRequest("PAYMENT_NOT_REFUND", "Khoản thanh toán này không phải khoản hoàn tiền");
        }
        if (payment.getStatus() != Payment.PaymentStatus.PENDING) {
            throw BusinessException.conflict("PAYMENT_ALREADY_REVIEWED", "Khoản hoàn tiền đã được xử lý");
        }

        Instant confirmedAt = Instant.now();
        payment.setStatus(Payment.PaymentStatus.CONFIRMED);
        payment.setConfirmedBy(principal.getId());
        payment.setConfirmedAt(LocalDateTime.ofInstant(confirmedAt, ZoneOffset.UTC));

        String referenceCode = trimToNull(request == null ? null : request.referenceCode());
        if (referenceCode != null) {
            payment.setReferenceCode(referenceCode);
        }
        String note = trimToNull(request == null ? null : request.note());
        if (note != null) {
            payment.setNote(note);
        }

        paymentRepository.saveAndFlush(payment);
        return new ConfirmRefundResponse(payment.getId(), payment.getStatus(), confirmedAt);
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
