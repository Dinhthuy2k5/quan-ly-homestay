package vn.edu.hust.homestay.pricing.service;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.pricing.entity.PriceRule;
import vn.edu.hust.homestay.pricing.repository.PriceRuleRepository;

import java.time.LocalDate;
import java.time.ZoneId;

@Service
public class PriceRuleExpirationService {

    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final PriceRuleRepository priceRuleRepository;

    public PriceRuleExpirationService(PriceRuleRepository priceRuleRepository) {
        this.priceRuleRepository = priceRuleRepository;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void expireEndedRulesOnStartup() {
        expireEndedRules();
    }

    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void expireEndedRulesDaily() {
        expireEndedRules();
    }

    private void expireEndedRules() {
        priceRuleRepository.expireEndedRules(
                PriceRule.Status.EXPIRED,
                LocalDate.now(BUSINESS_ZONE)
        );
    }
}
