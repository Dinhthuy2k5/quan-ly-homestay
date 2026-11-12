package vn.edu.hust.homestay.booking.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.core.io.Resource;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.booking.dto.CreateBookingRequest;
import vn.edu.hust.homestay.booking.dto.CreateBookingResponse;
import vn.edu.hust.homestay.booking.dto.DepositSubmissionResponse;
import vn.edu.hust.homestay.booking.dto.CustomerDepositProof;
import vn.edu.hust.homestay.booking.dto.CancelBookingRequest;
import vn.edu.hust.homestay.booking.dto.CancelBookingResponse;
import vn.edu.hust.homestay.booking.dto.CustomerAdjustBookingRequest;
import vn.edu.hust.homestay.booking.dto.CustomerAdjustBookingResponse;
import vn.edu.hust.homestay.booking.dto.CustomerBookingDetailResponse;
import vn.edu.hust.homestay.booking.dto.CustomerBookingSummaryResponse;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.booking.service.CustomerBookingService;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.common.response.PageMeta;

import java.util.List;
import java.util.Set;

@Tag(name = "Customer — Bookings", description = "Khách hàng tạo và tra cứu đặt phòng của chính mình")
@RestController
@RequestMapping("/api/v1/customer/bookings")
@PreAuthorize("hasRole('CUSTOMER')")
public class CustomerBookingController {

    private final CustomerBookingService customerBookingService;

    public CustomerBookingController(CustomerBookingService customerBookingService) {
        this.customerBookingService = customerBookingService;
    }

    @Operation(summary = "API-CUS-01: Tạo booking online và giữ phòng theo từng đêm")
    @PostMapping
    public ResponseEntity<ApiResponse<CreateBookingResponse>> createBooking(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateBookingRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(customerBookingService.create(principal, request)));
    }

    @Operation(summary = "API-CUS-02: Danh sách booking của khách hàng đang đăng nhập")
    @GetMapping
    public ResponseEntity<ApiResponse<List<CustomerBookingSummaryResponse>>> getBookings(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort
    ) {
        int validPage = Math.max(0, page);
        int boundedSize = Math.min(Math.max(1, size), 100);
        Page<CustomerBookingSummaryResponse> result = customerBookingService.getCustomerBookings(
                principal,
                status,
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

    @Operation(summary = "API-CUS-03: Chi tiết booking của khách hàng")
    @GetMapping("/{bookingId}")
    public ResponseEntity<ApiResponse<CustomerBookingDetailResponse>> getBookingDetail(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long bookingId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(customerBookingService.getBookingDetail(principal, bookingId)));
    }

    @Operation(summary = "API-CUS-09: Điều chỉnh đặt phòng cá nhân")
    @PatchMapping("/{bookingId}")
    public ResponseEntity<ApiResponse<CustomerAdjustBookingResponse>> adjustBooking(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long bookingId,
            @Valid @RequestBody CustomerAdjustBookingRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(customerBookingService.adjustBooking(principal, bookingId, request)));
    }

    @Operation(summary = "API-CUS-04: Hủy booking theo chính sách và giải phóng phòng")
    @PostMapping("/{bookingId}/cancel")
    public ResponseEntity<ApiResponse<CancelBookingResponse>> cancelBooking(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long bookingId,
            @Valid @RequestBody CancelBookingRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                customerBookingService.cancelBooking(principal, bookingId, request.reason())));
    }

    @Operation(summary = "API-CUS-05: Gửi chứng từ chuyển khoản đặt cọc")
    @PostMapping(value = "/{bookingId}/deposit-submissions", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<DepositSubmissionResponse>> submitDeposit(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long bookingId,
            @RequestParam Long amount,
            @RequestParam(defaultValue = "BANK_TRANSFER") String method,
            @RequestParam String referenceCode,
            @RequestPart("proofFile") MultipartFile proofFile
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(
                customerBookingService.submitDeposit(principal, bookingId, amount, method, referenceCode, proofFile)));
    }

    @Operation(summary = "Lấy chứng từ đặt cọc mới nhất của booking để khách xem lại")
    @GetMapping("/{bookingId}/deposit-submissions/latest/proof")
    public ResponseEntity<Resource> getLatestDepositProof(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long bookingId
    ) {
        CustomerDepositProof proof = customerBookingService.getLatestDepositProof(principal, bookingId);
        return ResponseEntity.ok()
                .contentType(proof.mediaType())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        org.springframework.http.ContentDisposition.inline().filename(proof.filename()).build().toString())
                .body(proof.resource());
    }

    @Operation(summary = "Lấy chứng từ thanh toán/đặt cọc theo paymentId để khách xem lại")
    @GetMapping("/{bookingId}/payments/{paymentId}/proof")
    public ResponseEntity<Resource> getPaymentProof(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long bookingId,
            @PathVariable Long paymentId
    ) {
        CustomerDepositProof proof = customerBookingService.getPaymentProof(principal, bookingId, paymentId);
        return ResponseEntity.ok()
                .contentType(proof.mediaType())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        org.springframework.http.ContentDisposition.inline().filename(proof.filename()).build().toString())
                .body(proof.resource());
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
