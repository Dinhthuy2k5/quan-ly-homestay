package vn.edu.hust.homestay.room.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.common.response.PagedResult;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.media.entity.Media;
import vn.edu.hust.homestay.media.entity.Media.OwnerType;
import vn.edu.hust.homestay.media.repository.MediaRepository;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.entity.PriceRule.AdjustType;
import vn.edu.hust.homestay.pricing.entity.PriceRule.RuleType;
import vn.edu.hust.homestay.pricing.repository.PriceRuleRepository;
import vn.edu.hust.homestay.room.dto.AvailabilitySearchRequest;
import vn.edu.hust.homestay.room.dto.AvailabilitySearchResponse;
import vn.edu.hust.homestay.room.dto.QuotedNightResponse;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.entity.Room.RoomStatus;
import vn.edu.hust.homestay.room.entity.RoomType;
import vn.edu.hust.homestay.room.repository.RoomRepository;
import vn.edu.hust.homestay.room.repository.RoomTypeRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** API-PUB-03: tìm phòng khả dụng và báo giá từng đêm từ price_rules đã duyệt. */
@Service
@Transactional(readOnly = true)
public class AvailabilitySearchService {

    private static final Logger log = LoggerFactory.getLogger(AvailabilitySearchService.class);
    private static final int DEFAULT_PAGE_SIZE = 10;
    private static final int MAX_PAGE_SIZE = 100;
    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final RoomRepository roomRepository;
    private final HomestayRepository homestayRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final PriceRuleRepository priceRuleRepository;
    private final MediaRepository mediaRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AvailabilitySearchService(
            RoomRepository roomRepository,
            HomestayRepository homestayRepository,
            RoomTypeRepository roomTypeRepository,
            PriceRuleRepository priceRuleRepository,
            MediaRepository mediaRepository
    ) {
        this.roomRepository = roomRepository;
        this.homestayRepository = homestayRepository;
        this.roomTypeRepository = roomTypeRepository;
        this.priceRuleRepository = priceRuleRepository;
        this.mediaRepository = mediaRepository;
    }

    public PagedResult<AvailabilitySearchResponse> search(AvailabilitySearchRequest request) {
        validateRequest(request);

        int pageNumber = Math.max(0, request.getPage() == null ? 0 : request.getPage());
        int pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1,
                request.getSize() == null ? DEFAULT_PAGE_SIZE : request.getSize()));
        String province = normalize(request.getProvince());
        String keyword = normalize(request.getKeyword());

        Page<Room> roomPage = roomRepository.searchAvailableRooms(
                request.getHomestayId(),
                province,
                keyword,
                request.getCheckInDate(),
                request.getCheckOutDate(),
                request.getGuestCount(),
                PageRequest.of(pageNumber, pageSize)
        );

        List<Room> rooms = roomPage.getContent();
        if (rooms.isEmpty()) {
            return PagedResult.of(roomPage, List.of());
        }

        Set<Long> roomIds = rooms.stream().map(Room::getId).collect(Collectors.toSet());
        Set<Long> homestayIds = rooms.stream().map(Room::getHomestayId).collect(Collectors.toSet());
        Map<Long, Homestay> homestays = homestayRepository.findAllById(homestayIds).stream()
                .collect(Collectors.toMap(Homestay::getId, homestay -> homestay));
        Map<Long, RoomType> roomTypes = roomTypeRepository.findAllById(
                        rooms.stream().map(Room::getRoomTypeId).collect(Collectors.toSet()))
                .stream().collect(Collectors.toMap(RoomType::getId, roomType -> roomType));
        Map<Long, List<PriceRule>> rulesByHomestay = priceRuleRepository.findActiveQuoteRules(
                        homestayIds, roomIds, PriceRule.Status.ACTIVE, RuleType.BASE, RuleType.ADJUSTMENT)
                .stream().collect(Collectors.groupingBy(PriceRule::getHomestayId));
        Map<Long, Media> roomCovers = mediaRepository
                .findByOwnerTypeAndOwnerIdInOrderBySortOrderAsc(OwnerType.ROOM, roomIds)
                .stream().collect(Collectors.toMap(
                        Media::getOwnerId,
                        media -> media,
                        (first, ignored) -> first
                ));

        List<AvailabilitySearchResponse> items = new ArrayList<>(rooms.size());
        for (Room room : rooms) {
            Homestay homestay = homestays.get(room.getHomestayId());
            RoomType roomType = roomTypes.get(room.getRoomTypeId());
            if (homestay == null || roomType == null) {
                log.error("Thiếu homestay/room type khi dựng kết quả availability cho room id={}", room.getId());
                continue;
            }

            List<PriceRule> applicableRules = rulesByHomestay.getOrDefault(room.getHomestayId(), List.of());
            PriceRule baseRule = applicableRules.stream()
                    .filter(rule -> rule.getRuleType() == RuleType.BASE && room.getId().equals(rule.getRoomId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException("Room có kết quả availability nhưng thiếu giá BASE ACTIVE"));

            List<QuotedNightResponse> quotedNights = quoteNights(
                    room, baseRule, applicableRules, request.getCheckInDate(), request.getCheckOutDate());
            long roomTotalPrice = quotedNights.stream()
                    .mapToLong(QuotedNightResponse::getNightlyPrice)
                    .reduce(0L, Math::addExact);
            Media cover = roomCovers.get(room.getId());

            items.add(AvailabilitySearchResponse.builder()
                    .homestayId(homestay.getId())
                    .homestayName(homestay.getName())
                    .hotlinePhone(homestay.getHotlinePhone())
                    .roomId(room.getId())
                    .roomName(room.getName())
                    .roomTypeName(roomType.getName())
                    .maxGuests(room.getMaxGuests() == null ? null : Byte.toUnsignedInt(room.getMaxGuests()))
                    .amenities(parseAmenities(room))
                    .coverImageUrl(cover == null ? null : cover.getUrl())
                    .quotedNights(quotedNights)
                    .roomTotalPrice(roomTotalPrice)
                    .build());
        }

        return PagedResult.of(roomPage, items);
    }

    private void validateRequest(AvailabilitySearchRequest request) {
        if (request.getCheckInDate() == null || request.getCheckOutDate() == null
                || !request.getCheckOutDate().isAfter(request.getCheckInDate())
                || request.getCheckInDate().isBefore(LocalDate.now(BUSINESS_TIME_ZONE))) {
            throw BusinessException.badRequest(
                    "INVALID_DATE_RANGE",
                    "Ngày nhận phòng phải từ hôm nay và ngày trả phòng phải sau ngày nhận phòng"
            );
        }
        if (request.getGuestCount() == null || request.getGuestCount() < 1) {
            throw BusinessException.badRequest("INVALID_GUEST_COUNT", "Số khách phải lớn hơn hoặc bằng 1");
        }
    }

    private List<QuotedNightResponse> quoteNights(
            Room room,
            PriceRule baseRule,
            Collection<PriceRule> roomRules,
            LocalDate checkInDate,
            LocalDate checkOutDate
    ) {
        List<QuotedNightResponse> nights = new ArrayList<>();
        for (LocalDate stayDate = checkInDate; stayDate.isBefore(checkOutDate); stayDate = stayDate.plusDays(1)) {
            LocalDate currentStayDate = stayDate;
            PriceRule adjustment = roomRules.stream()
                    .filter(rule -> rule.getRuleType() == RuleType.ADJUSTMENT)
                    .filter(rule -> rule.getRoomId() == null || room.getId().equals(rule.getRoomId()))
                    .filter(rule -> isApplicableOn(rule, currentStayDate))
                    .min(Comparator
                            .comparing(PriceRule::getPriority, Comparator.reverseOrder())
                            .thenComparing(rule -> room.getId().equals(rule.getRoomId()) ? 0 : 1)
                            .thenComparing(PriceRule::getId))
                    .orElse(null);

            long nightlyPrice = calculateNightlyPrice(baseRule.getBasePrice(), adjustment);
            nights.add(QuotedNightResponse.builder().stayDate(stayDate).nightlyPrice(nightlyPrice).build());
        }
        return nights;
    }

    private boolean isApplicableOn(PriceRule rule, LocalDate stayDate) {
        if (rule.getStartDate() != null && stayDate.isBefore(rule.getStartDate())) return false;
        if (rule.getEndDate() != null && stayDate.isAfter(rule.getEndDate())) return false;
        String weekdays = rule.getWeekdays();
        if (weekdays == null || weekdays.isBlank()) return true;

        String today = abbreviatedDay(stayDate.getDayOfWeek());
        for (String weekday : weekdays.split(",")) {
            if (today.equalsIgnoreCase(weekday.trim())) return true;
        }
        return false;
    }

    private String abbreviatedDay(DayOfWeek day) {
        return day.name().substring(0, 3);
    }

    private long calculateNightlyPrice(Long basePrice, PriceRule adjustment) {
        if (basePrice == null || basePrice < 0) {
            throw new IllegalStateException("Giá BASE ACTIVE không hợp lệ");
        }
        if (adjustment == null) return basePrice;

        Long value = adjustment.getAdjustValue();
        if (value == null || adjustment.getAdjustType() == null) {
            throw new IllegalStateException("Quy tắc ADJUSTMENT ACTIVE không hợp lệ");
        }

        long nightlyPrice;
        if (adjustment.getAdjustType() == AdjustType.FIXED_PRICE) {
            nightlyPrice = value;
        } else {
            nightlyPrice = BigDecimal.valueOf(basePrice)
                    .multiply(BigDecimal.valueOf(100L).add(BigDecimal.valueOf(value)))
                    .divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                    .longValueExact();
        }
        if (nightlyPrice < 0) throw new IllegalStateException("Quy tắc giá tạo ra giá đêm âm");
        return nightlyPrice;
    }

    private List<String> parseAmenities(Room room) {
        if (room.getAmenities() == null || room.getAmenities().isBlank()) return List.of();
        try {
            return objectMapper.readValue(room.getAmenities(), new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("Không thể đọc amenities của room id={}", room.getId(), e);
            return List.of();
        }
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }
}
