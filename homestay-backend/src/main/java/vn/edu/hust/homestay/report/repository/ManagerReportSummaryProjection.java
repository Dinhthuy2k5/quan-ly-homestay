package vn.edu.hust.homestay.report.repository;

public interface ManagerReportSummaryProjection {
    Long getBookingCount();
    Long getCheckIns();
    Long getCheckOuts();
    Long getActiveRooms();
    Long getOccupiedRoomNights();
}
