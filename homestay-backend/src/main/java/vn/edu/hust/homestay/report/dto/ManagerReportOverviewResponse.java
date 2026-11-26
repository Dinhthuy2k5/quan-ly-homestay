package vn.edu.hust.homestay.report.dto;

import java.time.LocalDate;

public record ManagerReportOverviewResponse(
        LocalDate fromDate,
        LocalDate toDate,
        long bookingCount,
        long checkIns,
        long checkOuts,
        long activeRooms,
        long totalRooms,
        long occupiedRoomNights
) {}
