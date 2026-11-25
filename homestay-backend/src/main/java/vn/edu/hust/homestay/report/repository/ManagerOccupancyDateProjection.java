package vn.edu.hust.homestay.report.repository;

import java.time.LocalDate;

/** Kết quả truy vấn số phòng được khai thác theo từng ngày cho API-REPORT-MGR-03. */
public interface ManagerOccupancyDateProjection {
    LocalDate getStayDate();
    Long getOccupiedRooms();
}
