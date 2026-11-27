package vn.edu.hust.homestay.homestay.service;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.entity.Role;
import vn.edu.hust.homestay.auth.entity.User;
import vn.edu.hust.homestay.auth.repository.UserRepository;
import vn.edu.hust.homestay.booking.entity.Booking.BookingStatus;
import vn.edu.hust.homestay.booking.repository.BookingRepository;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.common.response.PagedResult;
import vn.edu.hust.homestay.homestay.dto.CreateDirectorHomestayRequest;
import vn.edu.hust.homestay.homestay.dto.DirectorHomestayResponse;
import vn.edu.hust.homestay.homestay.dto.UpdateDirectorHomestayRequest;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.entity.Homestay.HomestayStatus;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.room.repository.HomestayRoomCountProjection;
import vn.edu.hust.homestay.room.repository.RoomRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;

import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_ADDRESS_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_HOTLINE_PHONE_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_HOTLINE_PHONE_REGEX;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_NAME_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.HOMESTAY_PROVINCE_MAX_LENGTH;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.MAX_PAGE_SIZE;
import static vn.edu.hust.homestay.common.constant.ValidationConstants.MIN_PAGE_SIZE;

/**
 * Service xử lý nghiệp vụ quản lý cơ sở homestay dành cho Giám đốc (Director):
 * - API-DIR-HS-01: Danh sách & tạo mới homestay toàn công ty.
 * - API-DIR-HS-02: Cập nhật thông tin cơ sở, hotline hoặc kích hoạt / tạm ngừng hoạt động.
 */
@Service
public class DirectorHomestayService {

    private static final Pattern HOTLINE_PHONE_PATTERN = Pattern.compile(HOMESTAY_HOTLINE_PHONE_REGEX);

    /**
     * Tập trạng thái booking chưa kết thúc vòng đời — nếu homestay còn ít nhất 1 đơn thuộc các trạng thái này
     * thì không được chuyển homestay sang INACTIVE (bảo vệ cả đơn CHECKED_IN quá hạn trả phòng).
     */
    private static final List<BookingStatus> ACTIVE_BOOKING_STATUSES = List.of(
            BookingStatus.PENDING_DEPOSIT,
            BookingStatus.PENDING_APPROVAL,
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN
    );

    private final HomestayRepository homestayRepository;
    private final UserRepository userRepository;
    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;

    public DirectorHomestayService(
            HomestayRepository homestayRepository,
            UserRepository userRepository,
            RoomRepository roomRepository,
            BookingRepository bookingRepository
    ) {
        this.homestayRepository = homestayRepository;
        this.userRepository = userRepository;
        this.roomRepository = roomRepository;
        this.bookingRepository = bookingRepository;
    }

    /**
     * API-DIR-HS-01 (GET): Liệt kê toàn bộ homestay của công ty, hỗ trợ lọc theo trạng thái, tỉnh/thành, từ khóa và phân trang.
     */
    @Transactional(readOnly = true)
    public PagedResult<DirectorHomestayResponse> listHomestays(
            String rawStatus,
            String province,
            String keyword,
            int page,
            int size
    ) {
        HomestayStatus statusFilter = parseOptionalStatus(rawStatus);
        String normalizedProvince = normalizeOptionalText(province);
        String normalizedKeyword = normalizeOptionalText(keyword);

        int safePage = Math.max(0, page);
        int safeSize = Math.min(Math.max(MIN_PAGE_SIZE, size), MAX_PAGE_SIZE);
        Pageable pageable = PageRequest.of(safePage, safeSize);

        Page<Homestay> homestayPage = homestayRepository.searchDirectorHomestays(
                statusFilter, normalizedProvince, normalizedKeyword, pageable);

        List<Homestay> homestays = homestayPage.getContent();
        if (homestays.isEmpty()) {
            return PagedResult.of(homestayPage, List.of());
        }

        List<Long> homestayIds = homestays.stream().map(Homestay::getId).toList();
        Map<Long, User> managerByHomestayId = loadManagersByHomestayIds(homestayIds);
        Map<Long, RoomStats> roomStatsByHomestayId = loadRoomStatsByHomestayIds(homestayIds);

        List<DirectorHomestayResponse> items = homestays.stream()
                .map(homestay -> {
                    RoomStats stats = roomStatsByHomestayId.getOrDefault(homestay.getId(), RoomStats.ZERO);
                    return DirectorHomestayResponse.from(
                            homestay,
                            managerByHomestayId.get(homestay.getId()),
                            stats.totalRooms(),
                            stats.activeRooms()
                    );
                })
                .toList();

        return PagedResult.of(homestayPage, items);
    }

    /**
     * API-DIR-HS-01 (POST): Tạo mới một cơ sở homestay (mặc định trạng thái ACTIVE).
     */
    @Transactional
    public DirectorHomestayResponse createHomestay(CreateDirectorHomestayRequest request) {
        String name = request.getName().trim();
        String province = request.getProvince().trim();
        String address = request.getAddress().trim();
        String hotlinePhone = request.getHotlinePhone().trim();
        String description = normalizeOptionalText(request.getDescription());

        if (homestayRepository.existsByProvinceIgnoreCaseAndNameIgnoreCase(province, name)) {
            throw BusinessException.conflict(
                    "HOMESTAY_NAME_EXISTS",
                    "Tên homestay đã tồn tại tại tỉnh/thành phố này"
            );
        }

        Homestay homestay = new Homestay();
        homestay.setName(name);
        homestay.setProvince(province);
        homestay.setAddress(address);
        homestay.setHotlinePhone(hotlinePhone);
        homestay.setDescription(description);
        homestay.setStatus(HomestayStatus.ACTIVE);

        Homestay saved = saveWithUniqueNameGuard(homestay);
        return DirectorHomestayResponse.from(saved, null, 0L, 0L);
    }

    /**
     * API-DIR-HS-02 (PATCH): Cập nhật từng phần thông tin cơ sở, hotline hoặc trạng thái ACTIVE/INACTIVE.
     */
    @Transactional
    public DirectorHomestayResponse updateHomestay(Long homestayId, UpdateDirectorHomestayRequest request) {
        if (homestayId == null || homestayId <= 0) {
            throw BusinessException.badRequest("VALIDATION_ERROR", "Mã homestay không hợp lệ");
        }
        if (isEmptyPatch(request)) {
            throw BusinessException.badRequest(
                    "VALIDATION_ERROR",
                    "Cần cung cấp ít nhất một thông tin để cập nhật homestay"
            );
        }

        Homestay homestay = homestayRepository.findByIdForUpdate(homestayId)
                .orElseThrow(() -> BusinessException.notFound(
                        "HOMESTAY_NOT_FOUND",
                        "Không tìm thấy cơ sở homestay"
                ));

        String nextName = homestay.getName();
        if (request.getName() != null) {
            nextName = requireNonBlankWithinLimit(
                    request.getName(),
                    HOMESTAY_NAME_MAX_LENGTH,
                    "Tên homestay không được để trống",
                    "Tên homestay không được vượt quá " + HOMESTAY_NAME_MAX_LENGTH + " ký tự"
            );
        }

        String nextProvince = homestay.getProvince();
        if (request.getProvince() != null) {
            nextProvince = requireNonBlankWithinLimit(
                    request.getProvince(),
                    HOMESTAY_PROVINCE_MAX_LENGTH,
                    "Tỉnh/thành phố không được để trống",
                    "Tỉnh/thành phố không được vượt quá " + HOMESTAY_PROVINCE_MAX_LENGTH + " ký tự"
            );
        }

        String nextAddress = homestay.getAddress();
        if (request.getAddress() != null) {
            nextAddress = requireNonBlankWithinLimit(
                    request.getAddress(),
                    HOMESTAY_ADDRESS_MAX_LENGTH,
                    "Địa chỉ homestay không được để trống",
                    "Địa chỉ homestay không được vượt quá " + HOMESTAY_ADDRESS_MAX_LENGTH + " ký tự"
            );
        }

        String nextHotlinePhone = homestay.getHotlinePhone();
        if (request.getHotlinePhone() != null) {
            nextHotlinePhone = validateHotlinePhone(request.getHotlinePhone());
        }

        HomestayStatus nextStatus = homestay.getStatus();
        if (request.getStatus() != null) {
            nextStatus = parseRequiredStatus(request.getStatus());
        }

        // Kiểm tra trùng cặp (province, name) theo ràng buộc uq_homestays_name nếu 1 trong 2 thay đổi
        boolean identityChanged = !nextName.equalsIgnoreCase(homestay.getName())
                || !nextProvince.equalsIgnoreCase(homestay.getProvince());
        if (identityChanged
                && homestayRepository.existsByProvinceIgnoreCaseAndNameIgnoreCaseAndIdNot(
                nextProvince, nextName, homestayId)) {
            throw BusinessException.conflict(
                    "HOMESTAY_NAME_EXISTS",
                    "Tên homestay đã tồn tại tại tỉnh/thành phố này"
            );
        }

        // Chặn tạm ngừng hoạt động khi homestay vẫn còn đơn đặt phòng chưa kết thúc vòng đời
        if (nextStatus == HomestayStatus.INACTIVE && homestay.getStatus() != HomestayStatus.INACTIVE) {
            long activeBookings = bookingRepository.countByHomestayIdAndStatusIn(homestayId, ACTIVE_BOOKING_STATUSES);
            if (activeBookings > 0) {
                throw BusinessException.conflict(
                        "HOMESTAY_HAS_ACTIVE_BOOKINGS",
                        "Homestay hiện còn " + activeBookings
                                + " đơn đặt phòng đang hoạt động hoặc chưa hoàn tất, không thể tạm ngừng"
                );
            }
        }

        homestay.setName(nextName);
        homestay.setProvince(nextProvince);
        homestay.setAddress(nextAddress);
        homestay.setHotlinePhone(nextHotlinePhone);
        if (request.getDescription() != null) {
            homestay.setDescription(normalizeOptionalText(request.getDescription()));
        }
        homestay.setStatus(nextStatus);

        Homestay saved = saveWithUniqueNameGuard(homestay);
        User assignedManager = userRepository.findByRoleAndHomestayId(Role.MANAGER, saved.getId()).orElse(null);
        RoomStats stats = loadRoomStatsByHomestayIds(List.of(saved.getId()))
                .getOrDefault(saved.getId(), RoomStats.ZERO);

        return DirectorHomestayResponse.from(saved, assignedManager, stats.totalRooms(), stats.activeRooms());
    }

    private Homestay saveWithUniqueNameGuard(Homestay homestay) {
        try {
            return homestayRepository.saveAndFlush(homestay);
        } catch (DataIntegrityViolationException exception) {
            String detail = exception.getMostSpecificCause() != null
                    ? exception.getMostSpecificCause().getMessage()
                    : exception.getMessage();
            if (detail != null && detail.toLowerCase(Locale.ROOT).contains("uq_homestays_name")) {
                throw BusinessException.conflict(
                        "HOMESTAY_NAME_EXISTS",
                        "Tên homestay đã tồn tại tại tỉnh/thành phố này"
                );
            }
            throw exception;
        }
    }

    private Map<Long, User> loadManagersByHomestayIds(List<Long> homestayIds) {
        List<User> managers = userRepository.findByRoleAndHomestayIdIn(Role.MANAGER, homestayIds);
        Map<Long, User> result = new HashMap<>(managers.size());
        for (User manager : managers) {
            if (manager.getHomestayId() != null) {
                result.putIfAbsent(manager.getHomestayId(), manager);
            }
        }
        return result;
    }

    private Map<Long, RoomStats> loadRoomStatsByHomestayIds(List<Long> homestayIds) {
        List<HomestayRoomCountProjection> rows = roomRepository.countRoomStatsByHomestayIds(homestayIds);
        Map<Long, RoomStats> result = new HashMap<>(rows.size());
        for (HomestayRoomCountProjection row : rows) {
            if (row.getHomestayId() != null) {
                result.put(
                        row.getHomestayId(),
                        new RoomStats(valueOrZero(row.getTotalRooms()), valueOrZero(row.getActiveRooms()))
                );
            }
        }
        return result;
    }

    private boolean isEmptyPatch(UpdateDirectorHomestayRequest request) {
        return request == null
                || (request.getName() == null
                && request.getProvince() == null
                && request.getAddress() == null
                && request.getHotlinePhone() == null
                && request.getDescription() == null
                && request.getStatus() == null);
    }

    private String requireNonBlankWithinLimit(
            String raw, int maxLength, String blankMessage, String maxLengthMessage
    ) {
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) {
            throw BusinessException.badRequest("VALIDATION_ERROR", blankMessage);
        }
        if (trimmed.length() > maxLength) {
            throw BusinessException.badRequest("VALIDATION_ERROR", maxLengthMessage);
        }
        return trimmed;
    }

    private String validateHotlinePhone(String raw) {
        String trimmed = raw.trim();
        if (trimmed.isEmpty()) {
            throw BusinessException.badRequest("VALIDATION_ERROR", "Số điện thoại hotline không được để trống");
        }
        if (trimmed.length() > HOMESTAY_HOTLINE_PHONE_MAX_LENGTH) {
            throw BusinessException.badRequest(
                    "VALIDATION_ERROR",
                    "Số điện thoại hotline không được vượt quá " + HOMESTAY_HOTLINE_PHONE_MAX_LENGTH + " ký tự"
            );
        }
        if (!HOTLINE_PHONE_PATTERN.matcher(trimmed).matches()) {
            throw BusinessException.badRequest(
                    "VALIDATION_ERROR",
                    "Số điện thoại hotline không đúng định dạng (ví dụ: 02123881234 hoặc +842123881234)"
            );
        }
        return trimmed;
    }

    private HomestayStatus parseOptionalStatus(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return parseRequiredStatus(raw);
    }

    private HomestayStatus parseRequiredStatus(String raw) {
        String normalized = raw.trim().toUpperCase(Locale.ROOT);
        if (normalized.isEmpty()) {
            throw BusinessException.badRequest(
                    "VALIDATION_ERROR",
                    "Trạng thái homestay chỉ hỗ trợ ACTIVE hoặc INACTIVE"
            );
        }
        try {
            return HomestayStatus.valueOf(normalized);
        } catch (IllegalArgumentException exception) {
            throw BusinessException.badRequest(
                    "VALIDATION_ERROR",
                    "Trạng thái homestay chỉ hỗ trợ ACTIVE hoặc INACTIVE"
            );
        }
    }

    private String normalizeOptionalText(String raw) {
        if (raw == null) {
            return null;
        }
        String trimmed = raw.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private long valueOrZero(Long value) {
        return value == null ? 0L : value;
    }

    private record RoomStats(long totalRooms, long activeRooms) {
        private static final RoomStats ZERO = new RoomStats(0L, 0L);
    }
}
