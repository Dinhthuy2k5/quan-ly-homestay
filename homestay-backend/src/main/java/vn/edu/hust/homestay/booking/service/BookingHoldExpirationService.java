package vn.edu.hust.homestay.booking.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.booking.entity.Booking;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.booking.repository.BookingRepository;
import vn.edu.hust.homestay.booking.repository.BookingRoomNightRepository;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

/** Expires unpaid booking holds and releases their room nights atomically. */
@Service
public class BookingHoldExpirationService {

    private static final Logger log = LoggerFactory.getLogger(BookingHoldExpirationService.class);

    private final BookingRepository bookingRepository;
    private final BookingRoomNightRepository bookingRoomNightRepository;

    public BookingHoldExpirationService(
            BookingRepository bookingRepository,
            BookingRoomNightRepository bookingRoomNightRepository
    ) {
        this.bookingRepository = bookingRepository;
        this.bookingRoomNightRepository = bookingRoomNightRepository;
    }

    /** Clean up overdue holds left from before the application started. */
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void expireOverdueHoldsOnStartup() {
        expireOverdueHolds();
    }

    /** Check frequently because booking hold deadlines can occur at any time of day. */
    @Scheduled(fixedDelayString = "${app.booking.hold-expiration.fixed-delay-ms:30000}")
    @Transactional
    public void expireOverdueHoldsPeriodically() {
        expireOverdueHolds();
    }

    private void expireOverdueHolds() {
        LocalDateTime nowUtc = LocalDateTime.ofInstant(Instant.now(), ZoneOffset.UTC);
        List<Booking> expiredBookings = bookingRepository
                .findTop100ByStatusAndHoldExpiresAtLessThanEqualOrderByIdAsc(
                        BookingStatus.PENDING_DEPOSIT,
                        nowUtc
                );
        if (expiredBookings.isEmpty()) {
            return;
        }

        expiredBookings.forEach(booking -> booking.setStatus(BookingStatus.EXPIRED));
        bookingRepository.saveAllAndFlush(expiredBookings);

        List<Long> expiredBookingIds = expiredBookings.stream().map(Booking::getId).toList();
        int releasedRoomNights = bookingRoomNightRepository.deleteAllByBookingIdIn(expiredBookingIds);

        log.info("Expired {} overdue PENDING_DEPOSIT bookings and released {} room nights",
                expiredBookings.size(), releasedRoomNights);
    }
}
