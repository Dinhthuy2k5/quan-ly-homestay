package vn.edu.hust.homestay.booking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "booking_rooms")
@Getter
@Setter
@NoArgsConstructor
public class BookingRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "booking_id", nullable = false)
    private Long bookingId;

    @Column(name = "homestay_id", nullable = false)
    private Long homestayId;

    @Column(name = "room_id", nullable = false)
    private Long roomId;

    public BookingRoom(Long bookingId, Long homestayId, Long roomId) {
        this.bookingId = bookingId;
        this.homestayId = homestayId;
        this.roomId = roomId;
    }
}
