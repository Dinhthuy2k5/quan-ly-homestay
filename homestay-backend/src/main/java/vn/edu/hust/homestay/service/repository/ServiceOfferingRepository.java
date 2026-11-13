package vn.edu.hust.homestay.service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.service.entity.ServiceOffering;
import vn.edu.hust.homestay.service.entity.ServiceOffering.ServiceStatus;

import java.util.List;

@Repository
public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering, Long> {

    List<ServiceOffering> findByHomestayIdAndStatusOrderByNameAsc(Long homestayId, ServiceStatus status);
}
