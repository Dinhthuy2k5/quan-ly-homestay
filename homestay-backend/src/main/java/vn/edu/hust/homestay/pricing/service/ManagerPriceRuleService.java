package vn.edu.hust.homestay.pricing.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.pricing.dto.ManagerPriceRuleResponse;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.repository.PriceRuleRepository;
import vn.edu.hust.homestay.room.entity.Room;
import vn.edu.hust.homestay.room.repository.RoomRepository;

import java.time.LocalDate;

@Service
@Transactional(readOnly = true)
public class ManagerPriceRuleService {

    private final PriceRuleRepository priceRuleRepository;
    private final RoomRepository roomRepository;

    public ManagerPriceRuleService(PriceRuleRepository priceRuleRepository, RoomRepository roomRepository) {
        this.priceRuleRepository = priceRuleRepository;
        this.roomRepository = roomRepository;
    }

    /** API-PRICE-02: View approved base and adjustment rules for the assigned homestay. */
    public Page<ManagerPriceRuleResponse> getPriceRules(
            UserPrincipal principal,
            Long roomId,
            PriceRule.RuleType ruleType,
            PriceRule.Status status,
            LocalDate fromDate,
            LocalDate toDate,
            Pageable pageable
    ) {
        Long homestayId = requireHomestayId(principal);
        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw BusinessException.badRequest("INVALID_PRICE_RULE", "fromDate không được sau toDate");
        }

        if (roomId != null) {
            Room room = roomRepository.findById(roomId)
                    .orElseThrow(() -> BusinessException.notFound("ROOM_NOT_FOUND", "Không tìm thấy phòng"));
            if (!room.getHomestayId().equals(homestayId)) {
                throw BusinessException.forbidden(
                        "HOMESTAY_SCOPE_VIOLATION",
                        "Không có quyền xem quy tắc giá của phòng thuộc cơ sở khác"
                );
            }
        }

        return priceRuleRepository.findManagerPriceRules(
                        homestayId,
                        roomId,
                        PriceRule.RuleType.ADJUSTMENT,
                        ruleType,
                        status,
                        fromDate,
                        toDate,
                        pageable
                )
                .map(ManagerPriceRuleResponse::from);
    }

    private Long requireHomestayId(UserPrincipal principal) {
        if (principal == null || principal.getHomestayId() == null) {
            throw BusinessException.badRequest("HOMESTAY_NOT_ASSIGNED", "Tài khoản quản lý chưa được phân công cơ sở");
        }
        return principal.getHomestayId();
    }
}
