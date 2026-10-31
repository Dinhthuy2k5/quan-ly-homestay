package vn.edu.hust.homestay.policy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.hust.homestay.policy.entity.PolicySetting;

import java.util.Optional;
import java.util.Collection;
import java.util.List;

public interface PolicySettingRepository extends JpaRepository<PolicySetting, Long> {

    Optional<PolicySetting> findByPolicyGroupAndPolicyKey(String policyGroup, String policyKey);

    List<PolicySetting> findByPolicyGroupAndPolicyKeyIn(String policyGroup, Collection<String> policyKeys);
}
