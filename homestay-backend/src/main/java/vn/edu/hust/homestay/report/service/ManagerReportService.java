package vn.edu.hust.homestay.report.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.report.dto.ManagerReportOverviewResponse;
import vn.edu.hust.homestay.report.repository.ManagerReportRepository;
import vn.edu.hust.homestay.report.repository.ManagerReportSummaryProjection;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class ManagerReportService {

    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final List<String> REPORTABLE_STATUSES = List.of(
            BookingStatus.CONFIRMED.name(), BookingStatus.CHECKED_IN.name(), BookingStatus.CHECKED_OUT.name());
    private static final List<String> OCCUPIED_STATUSES = REPORTABLE_STATUSES;

    private final ManagerReportRepository reportRepository;

    public ManagerReportService(ManagerReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    @Transactional(readOnly = true)
    public ManagerReportOverviewResponse getOverviewReport(
            UserPrincipal principal, LocalDate requestedFromDate, LocalDate requestedToDate
    ) {
        if (principal == null || principal.getId() == null || principal.getHomestayId() == null) {
            throw BusinessException.badRequest("HOMESTAY_NOT_ASSIGNED", "Tài khoản quản lý chưa được phân công cơ sở");
        }

        LocalDate today = LocalDate.now(BUSINESS_TIME_ZONE);
        LocalDate fromDate = requestedFromDate == null ? today.withDayOfMonth(1) : requestedFromDate;
        LocalDate toDate = requestedToDate == null ? today : requestedToDate;
        if (fromDate.isAfter(toDate)) {
            throw BusinessException.badRequest("INVALID_DATE_RANGE", "Ngày bắt đầu không được sau ngày kết thúc");
        }

        ManagerReportSummaryProjection summary = reportRepository.getOverviewSummary(
                principal.getHomestayId(), fromDate, toDate, REPORTABLE_STATUSES, OCCUPIED_STATUSES);
        return new ManagerReportOverviewResponse(
                fromDate,
                toDate,
                valueOrZero(summary.getBookingCount()),
                valueOrZero(summary.getCheckIns()),
                valueOrZero(summary.getCheckOuts()),
                valueOrZero(summary.getActiveRooms()),
                valueOrZero(summary.getOccupiedRoomNights())
        );
    }

    private long valueOrZero(Long value) {
        return value == null ? 0L : value;
    }
}
