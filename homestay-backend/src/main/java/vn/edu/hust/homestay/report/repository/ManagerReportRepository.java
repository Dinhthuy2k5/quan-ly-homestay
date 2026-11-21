package vn.edu.hust.homestay.report.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;
import vn.edu.hust.homestay.booking.entity.Booking;

import java.time.LocalDate;
import java.util.Collection;

public interface ManagerReportRepository extends Repository<Booking, Long> {

    /** One round trip for the overview metrics. Check-in/out counts represent scheduled dates. */
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
}
