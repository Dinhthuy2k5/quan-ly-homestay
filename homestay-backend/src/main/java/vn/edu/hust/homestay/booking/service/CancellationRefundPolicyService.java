package vn.edu.hust.homestay.booking.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import vn.edu.hust.homestay.booking.entity.Booking;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.policy.repository.PolicySettingRepository;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.HashSet;
import java.util.Set;

/** Resolves the immutable booking policy snapshot (or company policy for legacy bookings). */
@Service
public class CancellationRefundPolicyService {
    private static final ZoneId BUSINESS_TIME_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private final PolicySettingRepository policySettingRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public CancellationRefundPolicyService(PolicySettingRepository policySettingRepository) {
        this.policySettingRepository = policySettingRepository;
    }

    public int resolveRefundPercent(Booking booking) {
        try {
            var snapshot = booking.getPolicySnapshot() == null || booking.getPolicySnapshot().isBlank()
                    ? null : objectMapper.readTree(booking.getPolicySnapshot());
            var snapshotRules = snapshot == null ? null : snapshot.get("refundRules");
            String rulesJson = snapshotRules != null && !snapshotRules.isNull()
                    ? snapshotRules.isTextual() ? snapshotRules.asText() : snapshotRules.toString()
                    : policySettingRepository.findByPolicyGroupAndPolicyKey("CANCELLATION", "refund_rules")
                        .map(setting -> setting.getPolicyValue())
                        .orElseThrow(() -> invalidPolicy());
            validateRefundRules(rulesJson);
            long daysBeforeCheckIn = ChronoUnit.DAYS.between(LocalDate.now(BUSINESS_TIME_ZONE), booking.getCheckInDate());
            int selectedDays = -1;
            int selectedPercent = -1;
            for (var rule : objectMapper.readTree(rulesJson)) {
                int threshold = rule.path("days_before_checkin").asInt(-1);
                int percent = rule.path("refund_percent").asInt(-1);
                if (threshold <= daysBeforeCheckIn && threshold > selectedDays) {
                    selectedDays = threshold;
                    selectedPercent = percent;
                }
            }
            if (selectedPercent < 0) throw invalidPolicy();
            return selectedPercent;
        } catch (JsonProcessingException exception) {
            throw invalidPolicy();
        }
    }

    private void validateRefundRules(String rulesJson) throws JsonProcessingException {
        var rules = objectMapper.readTree(rulesJson);
        if (!rules.isArray() || rules.isEmpty()) throw invalidPolicy();
        Set<Integer> thresholds = new HashSet<>();
        for (var rule : rules) {
            var daysNode = rule.path("days_before_checkin");
            var percentNode = rule.path("refund_percent");
            if (!rule.isObject() || !daysNode.isIntegralNumber() || !percentNode.isIntegralNumber()) throw invalidPolicy();
            int days = daysNode.asInt(-1);
            int percent = percentNode.asInt(-1);
            if (days < 0 || percent < 0 || percent > 100 || !thresholds.add(days)) throw invalidPolicy();
        }
    }

    private BusinessException invalidPolicy() {
        return BusinessException.badRequest("CANCELLATION_POLICY_INVALID", "Chính sách hủy chưa được cấu hình hợp lệ");
    }
}
