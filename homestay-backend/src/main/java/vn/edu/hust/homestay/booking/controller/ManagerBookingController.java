package vn.edu.hust.homestay.booking.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.booking.dto.ManagerAdjustBookingRequest;
import vn.edu.hust.homestay.booking.dto.ManagerAdjustBookingResponse;
import vn.edu.hust.homestay.booking.dto.ManagerBookingDetailResponse;
import vn.edu.hust.homestay.booking.dto.ManagerBookingSummaryResponse;
import vn.edu.hust.homestay.booking.dto.ManagerCreateBookingRequest;
import vn.edu.hust.homestay.booking.dto.ManagerCreateBookingResponse;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.booking.service.ManagerBookingService;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.common.response.PageMeta;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

/**
 * Controller xử lý các API quản lý Booking của Manager:
 * - API-MGR-BOOK-01: GET /api/v1/manager/bookings (Danh sách booking cơ sở)
 */
@Tag(name = "Manager — Bookings", description = "Các API quản lý đơn đặt phòng tại cơ sở homestay")
@RestController
@RequestMapping("/api/v1/manager/bookings")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerBookingController {

    private final ManagerBookingService managerBookingService;

    public ManagerBookingController(ManagerBookingService managerBookingService) {
        this.managerBookingService = managerBookingService;
    }

    /**
     * API-MGR-BOOK-01 — Danh sách booking cơ sở
     */
    @Operation(summary = "API-MGR-BOOK-01: Danh sách booking cơ sở")
    @GetMapping
    public ResponseEntity<ApiResponse<List<ManagerBookingSummaryResponse>>> getHomestayBookings(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        int validPage = Math.max(0, page);
        int boundedSize = Math.max(1, Math.min(100, size));
        Page<ManagerBookingSummaryResponse> result = managerBookingService.getHomestayBookings(
                principal,
                status,
                fromDate,
                toDate,
                keyword,
                PageRequest.of(validPage, boundedSize, parseSort(sort))
        );

        PageMeta meta = PageMeta.builder()
                .page(result.getNumber())
                .size(result.getSize())
                .totalElements(result.getTotalElements())
                .totalPages(result.getTotalPages())
                .first(result.isFirst())
                .last(result.isLast())
                .build();

        return ResponseEntity.ok(ApiResponse.ok(result.getContent(), meta));
    }

    /**
     * API-MGR-BOOK-02 — Đặt phòng hộ khách
     */
    @Operation(summary = "API-MGR-BOOK-02: Đặt phòng hộ khách")
    @PostMapping
    public ResponseEntity<ApiResponse<ManagerCreateBookingResponse>> createBooking(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody ManagerCreateBookingRequest request
    ) {
        ManagerCreateBookingResponse response = managerBookingService.createBooking(principal, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    /**
     * API-MGR-BOOK-03 — Chi tiết booking
     */
    @Operation(summary = "API-MGR-BOOK-03: Chi tiết booking")
    @GetMapping("/{bookingId}")
    public ResponseEntity<ApiResponse<ManagerBookingDetailResponse>> getBookingDetail(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long bookingId
    ) {
        ManagerBookingDetailResponse response = managerBookingService.getBookingDetail(principal, bookingId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    /**
     * API-MGR-BOOK-04 — Điều chỉnh booking
     */
    @Operation(summary = "API-MGR-BOOK-04: Điều chỉnh booking")
    @PatchMapping("/{bookingId}")
    public ResponseEntity<ApiResponse<ManagerAdjustBookingResponse>> adjustBooking(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long bookingId,
            @Valid @RequestBody ManagerAdjustBookingRequest request
    ) {
        ManagerAdjustBookingResponse response = managerBookingService.adjustBooking(principal, bookingId, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    private Sort parseSort(String sort) {
        String[] parts = sort == null ? new String[0] : sort.trim().split(",", 2);
        String property = parts.length > 0 ? parts[0].trim() : "";
        if (!Set.of("createdAt", "checkInDate", "checkOutDate", "roomTotalPrice", "status", "id").contains(property)) {
            throw BusinessException.badRequest("INVALID_SORT", "Trường sort không được hỗ trợ");
        }

        Sort.Direction direction;
        try {
            direction = parts.length > 1 ? Sort.Direction.fromString(parts[1].trim()) : Sort.Direction.DESC;
        } catch (IllegalArgumentException e) {
            throw BusinessException.badRequest("INVALID_SORT", "Chiều sort chỉ nhận asc hoặc desc");
        }
        return Sort.by(direction, property);
    }
}
