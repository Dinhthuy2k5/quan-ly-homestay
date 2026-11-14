package vn.edu.hust.homestay.service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.service.entity.Service;
import vn.edu.hust.homestay.service.entity.Service.ServiceStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceRepository extends JpaRepository<Service, Long> {

    List<Service> findByHomestayIdAndStatusOrderByNameAsc(Long homestayId, ServiceStatus status);

    Optional<Service> findByIdAndHomestayIdAndStatus(Long id, Long homestayId, ServiceStatus status);
}
