package vn.edu.hust.homestay.report.repository;

/** Kết quả truy vấn công suất khai thác gom theo từng phòng cho API-REPORT-MGR-03. */
public interface ManagerOccupancyRoomProjection {
    Long getRoomId();
    String getRoomName();
    Long getRoomTypeId();
    String getRoomTypeName();
    String getRoomStatus();
    Long getOccupiedNights();
    Long getBookedRoomValue();
}
