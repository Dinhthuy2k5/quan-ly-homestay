package vn.edu.hust.homestay.report.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Dữ liệu trả về cho API-REPORT-MGR-03 (Báo cáo công suất phòng cơ sở theo kỳ).
 * Quy ước công suất:
 * - Chỉ tính đêm-phòng của booking trạng thái CONFIRMED, CHECKED_IN, CHECKED_OUT (bỏ đơn chờ cọc/chờ duyệt/hủy).
 * - Công suất khả dụng = toàn bộ phòng thuộc phạm vi lọc (mọi trạng thái) × số ngày trong kỳ.
 */
public record ManagerReportOccupancyResponse(
        LocalDate fromDate,           // Ngày bắt đầu kỳ báo cáo (tính bao gồm)
        LocalDate toDate,             // Ngày kết thúc kỳ báo cáo (tính bao gồm)
        Long roomTypeId,              // Mã loại phòng đang lọc (null nếu xem toàn cơ sở)
        long periodDays,              // Tổng số ngày (đêm) trong kỳ báo cáo
        long activeRooms,             // Số phòng đang mở bán (ACTIVE) thuộc phạm vi lọc
        long totalRooms,              // Tổng số phòng mọi trạng thái thuộc phạm vi lọc
        long capacityRoomNights,      // Tổng công suất khả dụng = totalRooms * periodDays
        long occupiedRoomNights,      // Tổng số đêm-phòng đã khai thác trong kỳ
        long vacantRoomNights,        // Tổng số đêm-phòng còn trống = max(0, capacityRoomNights - occupiedRoomNights)
        double occupancyRate,         // Tỷ lệ lấp đầy (%) làm tròn 1 chữ số thập phân
        List<RoomOccupancyItem> byRoom,   // Công suất chi tiết từng phòng (sắp xếp giảm dần theo số đêm khai thác)
        List<DailyOccupancyItem> byDate   // Biến động công suất theo từng ngày trong kỳ (phục vụ biểu đồ xu hướng)
) {
    /** Công suất khai thác của một phòng trong kỳ báo cáo. */
    public record RoomOccupancyItem(
            Long roomId,              // Mã phòng
            String roomName,          // Tên phòng
            Long roomTypeId,          // Mã loại phòng
            String roomTypeName,      // Tên loại phòng
            String roomStatus,        // Trạng thái hiện tại: ACTIVE, LOCKED, INACTIVE
            long occupiedNights,      // Số đêm phòng này được khai thác trong kỳ
            long capacityNights,      // Công suất tính theo lịch sử (= periodDays, không phụ thuộc trạng thái hiện tại)
            long vacantNights,        // Số đêm còn trống của phòng
            double occupancyRate,     // Tỷ lệ lấp đầy (%) của riêng phòng này
            long bookedRoomValue      // Giá trị tiền phòng theo đơn đặt (từ booking_room_nights.nightly_price, khác tiền thực thu)
    ) {}

    /** Công suất khai thác của cơ sở tại một ngày lưu trú cụ thể. */
    public record DailyOccupancyItem(
            LocalDate stayDate,       // Ngày lưu trú
            long occupiedRooms,       // Số phòng có khách lưu trú trong đêm này
            long activeRooms,         // Số phòng ACTIVE hiện tại (duy trì để tương thích payload)
            long totalRooms,          // Số phòng mọi trạng thái dùng làm mẫu số công suất
            double occupancyRate      // Tỷ lệ lấp đầy (%) trong đêm này
    ) {}
}
