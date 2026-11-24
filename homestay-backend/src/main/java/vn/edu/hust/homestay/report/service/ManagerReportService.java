package vn.edu.hust.homestay.report.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.expense.entity.Expense;
import vn.edu.hust.homestay.expense.repository.ExpenseCategoryRepository;
import vn.edu.hust.homestay.report.dto.ManagerReportFinanceResponse;
import vn.edu.hust.homestay.report.dto.ManagerReportFinanceResponse.ExpenseCategoryBreakdown;
import vn.edu.hust.homestay.report.dto.ManagerReportFinanceResponse.PaymentMethodBreakdown;
import vn.edu.hust.homestay.report.dto.ManagerReportOverviewResponse;
import vn.edu.hust.homestay.report.repository.ManagerFinanceExpenseCategoryProjection;
import vn.edu.hust.homestay.report.repository.ManagerFinancePaymentMethodProjection;
import vn.edu.hust.homestay.report.repository.ManagerReportRepository;
import vn.edu.hust.homestay.report.repository.ManagerReportSummaryProjection;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
public class ManagerReportService {

    // Múi giờ nghiệp vụ Việt Nam (+07:00) dùng để xác định ngày mặc định và ranh giới kỳ báo cáo
    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    // Các trạng thái booking được tính vào báo cáo vận hành (loại bỏ đơn chờ cọc, chờ duyệt, đã hủy, hết hạn)
    private static final List<String> REPORTABLE_STATUSES = List.of(
            BookingStatus.CONFIRMED.name(), BookingStatus.CHECKED_IN.name(), BookingStatus.CHECKED_OUT.name());
    private static final List<String> OCCUPIED_STATUSES = REPORTABLE_STATUSES;

    private final ManagerReportRepository reportRepository;
    private final ExpenseCategoryRepository expenseCategoryRepository;

    public ManagerReportService(
            ManagerReportRepository reportRepository,
            ExpenseCategoryRepository expenseCategoryRepository
    ) {
        this.reportRepository = reportRepository;
        this.expenseCategoryRepository = expenseCategoryRepository;
    }

    /** API-REPORT-MGR-01: Tổng hợp số đơn, lượt nhận/trả phòng, phòng mở bán và đêm-phòng khai thác. */
    @Transactional(readOnly = true)
    public ManagerReportOverviewResponse getOverviewReport(
            UserPrincipal principal, LocalDate requestedFromDate, LocalDate requestedToDate
    ) {
        long homestayId = requireHomestayId(principal);
        DateRange range = resolveDateRange(requestedFromDate, requestedToDate);

        ManagerReportSummaryProjection summary = reportRepository.getOverviewSummary(
                homestayId, range.fromDate(), range.toDate(), REPORTABLE_STATUSES, OCCUPIED_STATUSES);
        return new ManagerReportOverviewResponse(
                range.fromDate(),
                range.toDate(),
                valueOrZero(summary.getBookingCount()),
                valueOrZero(summary.getCheckIns()),
                valueOrZero(summary.getCheckOuts()),
                valueOrZero(summary.getActiveRooms()),
                valueOrZero(summary.getOccupiedRoomNights())
        );
    }

    /**
     * API-REPORT-MGR-02: Báo cáo tài chính cơ sở theo kỳ.
     * - Dòng thu: gom theo phương thức thanh toán (Tiền mặt / Chuyển khoản).
     * - Chi phí: gom theo danh mục chi phí (loại bỏ khoản đã hủy).
     * - Lợi nhuận ròng = Tiền thực thu ròng - Tổng chi phí vận hành.
     */
    @Transactional(readOnly = true)
    public ManagerReportFinanceResponse getFinanceReport(
            UserPrincipal principal,
            LocalDate requestedFromDate,
            LocalDate requestedToDate,
            Long categoryId,
            String rawPaymentMethod
    ) {
        // Bước 1: Kiểm tra homestay được phân công và chuẩn hóa khoảng ngày [fromDate, toDate]
        long homestayId = requireHomestayId(principal);
        DateRange range = resolveDateRange(requestedFromDate, requestedToDate);

        // Bước 2: Nếu có lọc theo danh mục chi phí thì xác nhận danh mục thuộc đúng homestay của Manager
        if (categoryId != null) {
            if (categoryId <= 0) {
                throw BusinessException.badRequest("INVALID_CATEGORY_ID", "categoryId phải lớn hơn 0");
            }
            expenseCategoryRepository.findByIdAndHomestayId(categoryId, homestayId)
                    .orElseThrow(() -> BusinessException.notFound(
                            "EXPENSE_CATEGORY_NOT_FOUND",
                            "Không tìm thấy danh mục chi phí thuộc homestay đang quản lý"));
        }

        // Bước 3: Kiểm tra và chuẩn hóa phương thức thanh toán (vd: "cash" -> "CASH")
        String normalizedPaymentMethod = parsePaymentMethod(rawPaymentMethod);

        // Bước 4: Quy đổi [fromDate, toDate] theo giờ VN (+07:00) sang mốc UTC
        // vì cột payments.confirmed_at trong DB được lưu theo UTC.
        LocalDateTime confirmedFromUtc = range.fromDate()
                .atStartOfDay(BUSINESS_TIME_ZONE)
                .withZoneSameInstant(ZoneOffset.UTC)
                .toLocalDateTime();
        LocalDateTime confirmedToExclusiveUtc = range.toDate()
                .plusDays(1)
                .atStartOfDay(BUSINESS_TIME_ZONE)
                .withZoneSameInstant(ZoneOffset.UTC)
                .toLocalDateTime();

        // Bước 5: Chạy 2 truy vấn tổng hợp (thu theo phương thức thanh toán & chi theo danh mục)
        List<ManagerFinancePaymentMethodProjection> paymentRows = reportRepository.getFinancePaymentsByMethod(
                homestayId, confirmedFromUtc, confirmedToExclusiveUtc, normalizedPaymentMethod);
        List<ManagerFinanceExpenseCategoryProjection> categoryRows = reportRepository.getFinanceExpensesByCategory(
                homestayId, range.fromDate(), range.toDate(), categoryId, normalizedPaymentMethod);

        // Bước 6: Cộng dồn số liệu dòng thu và lập bảng thu theo từng phương thức thanh toán
        long grossReceipts = 0L;      // Tổng tiền thu vào (cọc + thanh toán)
        long depositReceipts = 0L;    // Riêng tiền đặt cọc
        long settlementReceipts = 0L; // Riêng tiền thanh toán trả phòng / bổ sung
        long refunds = 0L;            // Tổng tiền đã hoàn cho khách
        long receiptCount = 0L;       // Tổng số lượt thu
        long refundCount = 0L;        // Tổng số lượt hoàn

        List<PaymentMethodBreakdown> byPaymentMethod = new ArrayList<>(paymentRows.size());
        for (ManagerFinancePaymentMethodProjection row : paymentRows) {
            long rowGross = valueOrZero(row.getGrossReceipts());
            long rowDeposit = valueOrZero(row.getDepositReceipts());
            long rowSettlement = valueOrZero(row.getSettlementReceipts());
            long rowRefunds = valueOrZero(row.getRefunds());
            long rowReceiptCount = valueOrZero(row.getReceiptCount());
            long rowRefundCount = valueOrZero(row.getRefundCount());

            grossReceipts += rowGross;
            depositReceipts += rowDeposit;
            settlementReceipts += rowSettlement;
            refunds += rowRefunds;
            receiptCount += rowReceiptCount;
            refundCount += rowRefundCount;

            byPaymentMethod.add(new PaymentMethodBreakdown(
                    row.getPaymentMethod(),
                    rowGross,
                    rowDeposit,
                    rowSettlement,
                    rowRefunds,
                    rowGross - rowRefunds,
                    rowReceiptCount,
                    rowRefundCount
            ));
        }

        // Bước 7: Cộng dồn tổng chi phí và lập bảng chi theo từng danh mục
        long totalExpense = 0L;
        long totalExpenseCount = 0L;
        List<ExpenseCategoryBreakdown> expensesByCategory = new ArrayList<>(categoryRows.size());
        for (ManagerFinanceExpenseCategoryProjection row : categoryRows) {
            long amount = valueOrZero(row.getTotalAmount());
            long count = valueOrZero(row.getExpenseCount());
            totalExpense += amount;
            totalExpenseCount += count;
            expensesByCategory.add(new ExpenseCategoryBreakdown(
                    row.getCategoryId(),
                    row.getCategoryName(),
                    amount,
                    count
            ));
        }

        // Bước 8: Tính Thực thu ròng và Lợi nhuận ròng
        long revenue = grossReceipts - refunds;
        long profit = revenue - totalExpense;

        return new ManagerReportFinanceResponse(
                range.fromDate(),
                range.toDate(),
                categoryId,
                normalizedPaymentMethod,
                grossReceipts,
                depositReceipts,
                settlementReceipts,
                refunds,
                revenue,
                totalExpense,
                profit,
                receiptCount,
                refundCount,
                totalExpenseCount,
                expensesByCategory,
                byPaymentMethod
        );
    }

    /** Lấy homestayId được phân công của Manager; báo lỗi nếu tài khoản chưa được gán cơ sở. */
    private long requireHomestayId(UserPrincipal principal) {
        if (principal == null || principal.getId() == null || principal.getHomestayId() == null) {
            throw BusinessException.badRequest("HOMESTAY_NOT_ASSIGNED", "Tài khoản quản lý chưa được phân công cơ sở");
        }
        return principal.getHomestayId();
    }

    /** Chuẩn hóa kỳ báo cáo: mặc định từ ngày mùng 1 tháng hiện tại đến hôm nay theo giờ Việt Nam. */
    private DateRange resolveDateRange(LocalDate requestedFromDate, LocalDate requestedToDate) {
        LocalDate today = LocalDate.now(BUSINESS_TIME_ZONE);
        LocalDate fromDate = requestedFromDate == null ? today.withDayOfMonth(1) : requestedFromDate;
        LocalDate toDate = requestedToDate == null ? today : requestedToDate;
        if (fromDate.isAfter(toDate)) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "Ngày bắt đầu không được sau ngày kết thúc");
        }
        return new DateRange(fromDate, toDate);
    }

    /** Kiểm tra mã phương thức thanh toán hợp lệ (CASH, BANK_TRANSFER, CARD, OTHER). */
    private String parsePaymentMethod(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        try {
            return Expense.PaymentMethod.valueOf(normalized).name();
        } catch (IllegalArgumentException exception) {
            throw BusinessException.badRequest(
                    "INVALID_PAYMENT_METHOD",
                    "Phương thức thanh toán chỉ hỗ trợ: CASH, BANK_TRANSFER, CARD, OTHER");
        }
    }

    private long valueOrZero(Long value) {
        return value == null ? 0L : value;
    }

    private record DateRange(LocalDate fromDate, LocalDate toDate) {}
}
