package vn.edu.hust.homestay.report.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import vn.edu.hust.homestay.booking.entity.Booking;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * Repository truy vấn tổng hợp cho các báo cáo của Manager (REPORT-MGR-01, REPORT-MGR-02...).
 * Sử dụng native SQL để gom nhóm trực tiếp tại DB và tận dụng các index sẵn có.
 */
public interface ManagerReportRepository extends Repository<Booking, Long> {

    /**
     * API-REPORT-MGR-01: Lấy 5 chỉ số tổng quan trong 1 lượt truy vấn.
     * - bookingCount: đơn hợp lệ có đêm lưu trú giao với kỳ [fromDate, toDate]
     * - checkIns / checkOuts: đếm theo ngày nhận/trả phòng dự kiến trên booking
     * - activeRooms: số phòng đang mở bán (ACTIVE) tại thời điểm hiện tại
     * - occupiedRoomNights: số đêm-phòng thực tế nằm trong kỳ báo cáo
     */
    @Query(value = """
            SELECT
              (SELECT COUNT(*) FROM bookings b
                WHERE b.homestay_id = :homestayId
                  AND b.status IN (:reportableStatuses)
                  AND b.check_in_date <= :toDate
                  AND b.check_out_date > :fromDate) AS bookingCount,
              (SELECT COUNT(*) FROM bookings b
                WHERE b.homestay_id = :homestayId
                  AND b.status IN (:reportableStatuses)
                  AND b.check_in_date BETWEEN :fromDate AND :toDate) AS checkIns,
              (SELECT COUNT(*) FROM bookings b
                WHERE b.homestay_id = :homestayId
                  AND b.status IN (:reportableStatuses)
                  AND b.check_out_date BETWEEN :fromDate AND :toDate) AS checkOuts,
              (SELECT COUNT(*) FROM rooms r
                WHERE r.homestay_id = :homestayId AND r.status = 'ACTIVE') AS activeRooms,
              (SELECT COUNT(*) FROM booking_room_nights night
                JOIN bookings b ON b.id = night.booking_id
                WHERE b.homestay_id = :homestayId
                  AND b.status IN (:occupiedStatuses)
                  AND night.stay_date BETWEEN :fromDate AND :toDate) AS occupiedRoomNights
            """, nativeQuery = true)
    ManagerReportSummaryProjection getOverviewSummary(
            @Param("homestayId") Long homestayId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("reportableStatuses") Collection<String> reportableStatuses,
            @Param("occupiedStatuses") Collection<String> occupiedStatuses
    );

    /**
     * API-REPORT-MGR-02 (Phần 1 - Dòng thu & hoàn tiền theo phương thức thanh toán):
     * Gom nhóm các giao dịch thanh toán ĐÃ XÁC NHẬN (status = 'CONFIRMED') theo phương thức thanh toán.
     * - Loại bỏ giao dịch PENDING và REJECTED.
     * - Lọc theo khoảng [confirmedFromUtc, confirmedToExclusiveUtc) đã quy đổi từ giờ VN (+07:00) sang UTC
     *   để vừa chính xác ranh giới ngày vừa dùng được index idx_pay_finance(homestay_id, status, confirmed_at).
     */
    @Query(value = """
            SELECT p.method AS paymentMethod,
                   COALESCE(SUM(CASE WHEN p.type IN ('DEPOSIT', 'PAYMENT') THEN p.amount ELSE 0 END), 0) AS grossReceipts,
                   COALESCE(SUM(CASE WHEN p.type = 'DEPOSIT' THEN p.amount ELSE 0 END), 0) AS depositReceipts,
                   COALESCE(SUM(CASE WHEN p.type = 'PAYMENT' THEN p.amount ELSE 0 END), 0) AS settlementReceipts,
                   COALESCE(SUM(CASE WHEN p.type = 'REFUND' THEN p.amount ELSE 0 END), 0) AS refunds,
                   COALESCE(SUM(CASE WHEN p.type IN ('DEPOSIT', 'PAYMENT') THEN 1 ELSE 0 END), 0) AS receiptCount,
                   COALESCE(SUM(CASE WHEN p.type = 'REFUND' THEN 1 ELSE 0 END), 0) AS refundCount
            FROM payments p
            WHERE p.homestay_id = :homestayId
              AND p.status = 'CONFIRMED'
              AND p.confirmed_at >= :confirmedFromUtc
              AND p.confirmed_at < :confirmedToExclusiveUtc
              AND (:paymentMethod IS NULL OR p.method = :paymentMethod)
            GROUP BY p.method
            ORDER BY FIELD(p.method, 'CASH', 'BANK_TRANSFER', 'VNPAY'), p.method ASC
            """, nativeQuery = true)
    List<ManagerFinancePaymentMethodProjection> getFinancePaymentsByMethod(
            @Param("homestayId") Long homestayId,
            @Param("confirmedFromUtc") LocalDateTime confirmedFromUtc,
            @Param("confirmedToExclusiveUtc") LocalDateTime confirmedToExclusiveUtc,
            @Param("paymentMethod") String paymentMethod
    );

    /**
     * API-REPORT-MGR-02 (Phần 2 - Chi phí vận hành theo danh mục):
     * Gom tổng chi phí vận hành theo từng danh mục, sắp xếp giảm dần theo số tiền chi.
     * Chỉ tính khoản chi chưa bị hủy (cancelled_at IS NULL) và lọc theo ngày chi expense_date.
     */
    @Query(value = """
            SELECT e.category_id AS categoryId,
                   c.name AS categoryName,
                   COALESCE(SUM(e.amount), 0) AS totalAmount,
                   COUNT(*) AS expenseCount
            FROM expenses e
            JOIN expense_categories c
              ON c.id = e.category_id AND c.homestay_id = e.homestay_id
            WHERE e.homestay_id = :homestayId
              AND e.cancelled_at IS NULL
              AND e.expense_date BETWEEN :fromDate AND :toDate
              AND (:categoryId IS NULL OR e.category_id = :categoryId)
              AND (:paymentMethod IS NULL OR e.payment_method = :paymentMethod)
            GROUP BY e.category_id, c.name
            ORDER BY totalAmount DESC, c.name ASC
            """, nativeQuery = true)
    List<ManagerFinanceExpenseCategoryProjection> getFinanceExpensesByCategory(
            @Param("homestayId") Long homestayId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("categoryId") Long categoryId,
            @Param("paymentMethod") String paymentMethod
    );

    /**
     * API-REPORT-MGR-03 (Phần 1 - Công suất chi tiết từng phòng):
     * Lấy tất cả phòng ACTIVE (kể cả phòng có 0 đêm khai thác) và các phòng không còn ACTIVE nhưng từng phát sinh đêm ở trong kỳ.
     * Chỉ tính booking ở trạng thái CONFIRMED, CHECKED_IN, CHECKED_OUT.
     */
    @Query(value = """
            SELECT r.id AS roomId,
                   r.name AS roomName,
                   r.room_type_id AS roomTypeId,
                   rt.name AS roomTypeName,
                   r.status AS roomStatus,
                   COUNT(occ.stay_date) AS occupiedNights,
                   COALESCE(SUM(occ.nightly_price), 0) AS bookedRoomValue
            FROM rooms r
            JOIN room_types rt ON rt.id = r.room_type_id
            LEFT JOIN (
                SELECT n.room_id, n.stay_date, n.nightly_price
                FROM booking_room_nights n
                JOIN bookings b ON b.id = n.booking_id
                WHERE b.homestay_id = :homestayId
                  AND b.status IN (:occupiedStatuses)
                  AND n.stay_date BETWEEN :fromDate AND :toDate
            ) occ ON occ.room_id = r.id
            WHERE r.homestay_id = :homestayId
              AND (:roomTypeId IS NULL OR r.room_type_id = :roomTypeId)
              AND (r.status = 'ACTIVE' OR occ.stay_date IS NOT NULL)
            GROUP BY r.id, r.name, r.room_type_id, rt.name, r.status
            ORDER BY occupiedNights DESC, r.name ASC
            """, nativeQuery = true)
    List<ManagerOccupancyRoomProjection> getOccupancyByRoom(
            @Param("homestayId") Long homestayId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("roomTypeId") Long roomTypeId,
            @Param("occupiedStatuses") Collection<String> occupiedStatuses
    );

    /**
     * API-REPORT-MGR-03 (Phần 2 - Số phòng được khai thác theo từng ngày lưu trú):
     * Trả các ngày có ít nhất 1 phòng được đặt; tầng Service sẽ điền đủ 0 cho các ngày còn lại trong kỳ.
     */
    @Query(value = """
            SELECT n.stay_date AS stayDate,
                   COUNT(*) AS occupiedRooms
            FROM booking_room_nights n
            JOIN bookings b ON b.id = n.booking_id
            JOIN rooms r ON r.id = n.room_id
            WHERE b.homestay_id = :homestayId
              AND b.status IN (:occupiedStatuses)
              AND n.stay_date BETWEEN :fromDate AND :toDate
              AND (:roomTypeId IS NULL OR r.room_type_id = :roomTypeId)
            GROUP BY n.stay_date
            ORDER BY n.stay_date ASC
            """, nativeQuery = true)
    List<ManagerOccupancyDateProjection> getOccupancyByDate(
            @Param("homestayId") Long homestayId,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            @Param("roomTypeId") Long roomTypeId,
            @Param("occupiedStatuses") Collection<String> occupiedStatuses
    );
}
