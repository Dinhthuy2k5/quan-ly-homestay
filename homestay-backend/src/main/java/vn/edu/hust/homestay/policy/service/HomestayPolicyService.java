package vn.edu.hust.homestay.policy.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.homestay.entity.Homestay;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.policy.dto.HomestayPolicyResponse;
import vn.edu.hust.homestay.policy.dto.HomestayPolicyResponse.BookingPolicyDto;
import vn.edu.hust.homestay.policy.dto.HomestayPolicyResponse.CancellationPolicyDto;
import vn.edu.hust.homestay.policy.dto.HomestayPolicyResponse.PaymentPolicyDto;
import vn.edu.hust.homestay.policy.dto.HomestayPolicyResponse.RefundRuleDto;
import vn.edu.hust.homestay.policy.dto.HomestayPolicyResponse.StayPolicyDto;
import vn.edu.hust.homestay.policy.entity.PolicySetting;
import vn.edu.hust.homestay.policy.repository.PolicySettingRepository;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service tổng hợp và cung cấp chính sách & quy định lưu trú của homestay.
 */
@Service
@Transactional(readOnly = true)
public class HomestayPolicyService {

    private static final Logger log = LoggerFactory.getLogger(HomestayPolicyService.class);
    private final PolicySettingRepository policySettingRepository;
    private final HomestayRepository homestayRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public static final List<String> DEFAULT_HOUSE_RULES = List.of(
            "Xuất trình CCCD hoặc hộ chiếu hợp lệ khi nhận phòng để làm thủ tục đăng ký tạm trú.",
            "Giữ gìn yên tĩnh chung, hạn chế làm ồn sau 22:00 để không ảnh hưởng các phòng xung quanh.",
            "Không hút thuốc lá trong phòng ngủ; vui lòng sử dụng khu vực ngoài trời được chỉ định.",
            "Không mang chất dễ cháy nổ, vũ khí, chất cấm hoặc tổ chức đánh bạc trong khuôn viên.",
            "Giữ gìn vệ sinh chung và bảo quản các trang thiết bị tiện nghi của homestay.",
            "Vui lòng liên hệ trước với hotline homestay nếu có nhu cầu nhận phòng sớm hoặc trả phòng muộn."
    );

    public HomestayPolicyService(
            PolicySettingRepository policySettingRepository,
            HomestayRepository homestayRepository
    ) {
        this.policySettingRepository = policySettingRepository;
        this.homestayRepository = homestayRepository;
    }

    /**
     * Lấy chính sách áp dụng cho một homestay cụ thể (API công khai cho khách hàng).
     */
    public HomestayPolicyResponse getHomestayPolicies(Long homestayId) {
        Homestay homestay = homestayRepository.findById(homestayId)
                .orElseThrow(() -> BusinessException.notFound("HOMESTAY_NOT_FOUND", "Không tìm thấy cơ sở homestay"));

        Map<String, String> settings = policySettingRepository.findAll().stream()
                .collect(Collectors.toMap(
                        p -> p.getPolicyGroup() + "." + p.getPolicyKey(),
                        PolicySetting::getPolicyValue,
                        (existing, replacement) -> existing
                ));

        // 1. Chính sách đặt phòng (Booking)
        int minNights = parseInt(settings.get("BOOKING.min_nights"), 1);
        int maxNights = parseInt(settings.get("BOOKING.max_nights"), 30);
        int maxAdvanceDays = parseInt(settings.get("BOOKING.max_advance_days"), 365);
        int adjustMinDaysBefore = parseInt(settings.get("BOOKING.adjust_min_days_before"), 3);
        String bookingDesc = String.format("Mỗi đơn đặt từ %d đến %d đêm; đặt trước tối đa %d ngày; được phép điều chỉnh trước ngày nhận phòng tối thiểu %d ngày.",
                minNights, maxNights, maxAdvanceDays, adjustMinDaysBefore);
        BookingPolicyDto bookingPolicy = BookingPolicyDto.builder()
                .minNights(minNights)
                .maxNights(maxNights)
                .maxAdvanceDays(maxAdvanceDays)
                .adjustMinDaysBefore(adjustMinDaysBefore)
                .description(bookingDesc)
                .build();

        // 2. Chính sách thanh toán & đặt cọc (Payment)
        int depositPercent = parseInt(settings.get("PAYMENT.deposit_percent"), 30);
        int holdHours = parseInt(settings.get("PAYMENT.hold_hours"), 24);
        String bankName = settings.getOrDefault("PAYMENT.bank_name", "Ngân hàng TMCP Ngoại thương Việt Nam (Vietcombank)");
        String bankAccountNumber = settings.getOrDefault("PAYMENT.bank_account_number", "998877665544");
        String bankAccountHolder = settings.getOrDefault("PAYMENT.bank_account_holder", "CONG TY CP HOMESTAY VIET NAM");
        String finalPaymentTiming = settings.getOrDefault("PAYMENT.final_payment_timing", "Thanh toán nốt khi trả phòng");
        String paymentDesc = String.format("Đặt cọc %d%% tổng tiền phòng trong vòng %d giờ kể từ khi tạo đơn để giữ phòng.",
                depositPercent, holdHours);
        PaymentPolicyDto paymentPolicy = PaymentPolicyDto.builder()
                .depositPercent(depositPercent)
                .holdHours(holdHours)
                .bankName(bankName)
                .bankAccountNumber(bankAccountNumber)
                .bankAccountHolder(bankAccountHolder)
                .description(paymentDesc)
                .finalPaymentTiming(finalPaymentTiming)
                .build();

        // 3. Quy định lưu trú & giờ giấc (Stay)
        String checkInTime = settings.getOrDefault("STAY.check_in_time", "11:00");
        String checkOutDeadline = settings.getOrDefault("STAY.check_out_deadline", "08:00");
        List<String> houseRules = parseHouseRules(settings.get("STAY.house_rules"));
        StayPolicyDto stayPolicy = StayPolicyDto.builder()
                .checkInTime(checkInTime)
                .checkOutDeadline(checkOutDeadline)
                .houseRules(houseRules)
                .build();

        // 4. Chính sách hủy & hoàn tiền (Cancellation)
        List<RefundRuleDto> refundRules = parseRefundRules(settings.get("CANCELLATION.refund_rules"));
        String cancellationDesc = "Chính sách hoàn tiền cọc linh hoạt dựa trên số ngày hủy trước thời điểm nhận phòng.";
        CancellationPolicyDto cancellationPolicy = CancellationPolicyDto.builder()
                .refundRules(refundRules)
                .generalPolicyDescription(cancellationDesc)
                .build();

        return HomestayPolicyResponse.builder()
                .homestayId(homestay.getId())
                .homestayName(homestay.getName())
                .bookingPolicy(bookingPolicy)
                .paymentPolicy(paymentPolicy)
                .stayPolicy(stayPolicy)
                .cancellationPolicy(cancellationPolicy)
                .build();
    }

    /**
     * Lấy chính sách áp dụng cho homestay mà quản lý đang phụ trách.
     */
    public HomestayPolicyResponse getAssignedHomestayPolicies(UserPrincipal principal) {
        if (principal == null || principal.getHomestayId() == null) {
            throw BusinessException.badRequest("HOMESTAY_NOT_ASSIGNED", "Tài khoản quản lý chưa được phân công cơ sở");
        }
        return getHomestayPolicies(principal.getHomestayId());
    }

    public List<String> parseHouseRules(String rawRules) {
        if (rawRules == null || rawRules.isBlank()) {
            return DEFAULT_HOUSE_RULES;
        }
        List<String> list = Arrays.stream(rawRules.split("\\r?\\n|;"))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .toList();
        return list.isEmpty() ? DEFAULT_HOUSE_RULES : list;
    }

    public List<RefundRuleDto> parseRefundRules(String json) {
        if (json == null || json.isBlank()) {
            return defaultRefundRules();
        }
        try {
            JsonNode root = objectMapper.readTree(json);
            if (!root.isArray()) {
                return defaultRefundRules();
            }
            List<RawRule> rawRules = new ArrayList<>();
            for (JsonNode node : root) {
                int days = node.path("days_before_checkin").asInt(-1);
                int percent = node.path("refund_percent").asInt(-1);
                if (days >= 0 && percent >= 0) {
                    rawRules.add(new RawRule(days, percent));
                }
            }
            rawRules.sort(Comparator.comparingInt(RawRule::days).reversed());
            if (rawRules.isEmpty()) {
                return defaultRefundRules();
            }

            List<RefundRuleDto> result = new ArrayList<>();
            for (int i = 0; i < rawRules.size(); i++) {
                RawRule current = rawRules.get(i);
                String desc;
                if (i == 0) {
                    desc = String.format("Hủy trước ngày nhận phòng từ %d ngày trở lên: Hoàn lại %d%% tiền đặt cọc",
                            current.days(), current.percent());
                } else {
                    RawRule prev = rawRules.get(i - 1);
                    if (current.days() > 0) {
                        desc = String.format("Hủy trước ngày nhận phòng từ %d đến %d ngày: Hoàn lại %d%% tiền đặt cọc",
                                current.days(), prev.days() - 1, current.percent());
                    } else {
                        desc = String.format("Hủy trong vòng %d ngày trước ngày nhận phòng: %s",
                                prev.days(), current.percent() > 0 ? "Hoàn lại " + current.percent() + "% tiền đặt cọc" : "Không hoàn lại tiền đặt cọc (0%)");
                    }
                }
                result.add(new RefundRuleDto(current.days(), current.percent(), desc));
            }
            return result;
        } catch (Exception e) {
            log.warn("Không thể phân tích refund_rules JSON: {}", json, e);
            return defaultRefundRules();
        }
    }

    private record RawRule(int days, int percent) {}

    private List<RefundRuleDto> defaultRefundRules() {
        return List.of(
                new RefundRuleDto(7, 100, "Hủy trước ngày nhận phòng từ 7 ngày trở lên: Hoàn lại 100% tiền đặt cọc"),
                new RefundRuleDto(3, 50, "Hủy trước ngày nhận phòng từ 3 đến 6 ngày: Hoàn lại 50% tiền đặt cọc"),
                new RefundRuleDto(0, 0, "Hủy trong vòng 3 ngày trước ngày nhận phòng: Không hoàn lại tiền đặt cọc (0%)")
        );
    }

    private int parseInt(String value, int defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }
}
