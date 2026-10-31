package vn.edu.hust.homestay.booking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "booking_room_nights")
@Getter
@Setter
@NoArgsConstructor
public class BookingRoomNight {

    @EmbeddedId
    private BookingRoomNightId id;

    @Column(name = "booking_id", nullable = false)
    private Long bookingId;

    @Column(name = "homestay_id", nullable = false)
    private Long homestayId;

    @Column(name = "nightly_price", nullable = false)
    private Long nightlyPrice;

    @Column(name = "applied_rule_name_snapshot", nullable = false, length = 100)
    private String appliedRuleNameSnapshot;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    public BookingRoomNight(Long roomId, java.time.LocalDate stayDate, Long bookingId,
                            Long homestayId, Long nightlyPrice, String appliedRuleNameSnapshot) {
        this.id = new BookingRoomNightId(roomId, stayDate);
        this.bookingId = bookingId;
        this.homestayId = homestayId;
        this.nightlyPrice = nightlyPrice;
        this.appliedRuleNameSnapshot = appliedRuleNameSnapshot;
    }
}
