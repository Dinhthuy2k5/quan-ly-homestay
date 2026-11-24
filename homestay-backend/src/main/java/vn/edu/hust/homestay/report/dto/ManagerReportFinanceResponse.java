package vn.edu.hust.homestay.report.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Dữ liệu trả về cho API-REPORT-MGR-02 (Báo cáo tài chính cơ sở theo kỳ).
 * Tất cả số tiền đều tính theo đơn vị VND (số nguyên).
 */
public record ManagerReportFinanceResponse(
        // Khoảng ngày báo cáo thực tế đã áp dụng (theo giờ Việt Nam Asia/Ho_Chi_Minh)
        LocalDate fromDate,
        LocalDate toDate,
        // Bộ lọc đang áp dụng (null nếu không lọc)
        Long categoryId,
        String paymentMethod,

        // --- NHÓM CHỈ SỐ DÒNG THU (từ bảng payments có status = CONFIRMED) ---
        long grossReceipts,       // Tổng tiền thu gộp = depositReceipts + settlementReceipts
        long depositReceipts,     // Tổng tiền đặt cọc đã xác nhận (type = DEPOSIT)
        long settlementReceipts,  // Tổng tiền thanh toán trả phòng / bổ sung đã xác nhận (type = PAYMENT)
        long refunds,             // Tổng tiền đã hoàn trả cho khách (type = REFUND)
        long revenue,             // Tiền thực thu ròng = grossReceipts - refunds

        // --- NHÓM CHỈ SỐ CHI PHÍ & LỢI NHUẬN ---
        long expense,             // Tổng chi phí vận hành còn hiệu lực (bảng expenses, bỏ khoản đã hủy)
        long profit,              // Lợi nhuận ròng = revenue - expense (có thể âm nếu chi > thu)

        // --- SỐ LƯỢNG GIAO DỊCH / KHOẢN CHI TRONG KỲ ---
        long receiptCount,        // Số lượt giao dịch thu (DEPOSIT + PAYMENT)
        long refundCount,         // Số lượt giao dịch hoàn tiền (REFUND)
        long expenseCount,        // Số khoản chi phí hiệu lực

        // --- BẢNG PHÂN TÍCH CHI TIẾT ---
        List<ExpenseCategoryBreakdown> expensesByCategory, // Chi phí gom theo từng danh mục
        List<PaymentMethodBreakdown> byPaymentMethod       // Dòng thu gom theo từng phương thức thanh toán
) {
    /** Tổng hợp chi phí vận hành của một danh mục (ví dụ: Điện nước, Bảo trì...). */
    public record ExpenseCategoryBreakdown(
            Long categoryId,      // Mã danh mục chi phí
            String categoryName,  // Tên danh mục chi phí
            long totalAmount,     // Tổng tiền chi của danh mục trong kỳ
            long expenseCount     // Số khoản chi thuộc danh mục
    ) {}

    /** Tổng hợp dòng thu & hoàn tiền theo từng phương thức thanh toán (Tiền mặt, Chuyển khoản). */
    public record PaymentMethodBreakdown(
            String paymentMethod, // Mã phương thức: CASH, BANK_TRANSFER
            long grossReceipts,   // Tổng tiền thu vào qua phương thức này
            long depositReceipts, // Tiền đặt cọc qua phương thức này
            long settlementReceipts, // Tiền thanh toán trả phòng/bổ sung qua phương thức này
            long refunds,         // Tổng tiền hoàn ra qua phương thức này
            long netRevenue,      // Thực thu ròng = grossReceipts - refunds
            long receiptCount,    // Số giao dịch thu
            long refundCount      // Số giao dịch hoàn tiền
    ) {}
}
