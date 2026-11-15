package vn.edu.hust.homestay.service.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.service.entity.ServiceCategory;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceCategoryRepository extends JpaRepository<ServiceCategory, Long> {

    List<ServiceCategory> findAllByHomestayId(Long homestayId);

    List<ServiceCategory> findByHomestayIdOrderByNameAsc(Long homestayId);

    Optional<ServiceCategory> findByIdAndHomestayId(Long id, Long homestayId);

    boolean existsByHomestayIdAndName(Long homestayId, String name);

    boolean existsByHomestayIdAndNameAndIdNot(Long homestayId, String name, Long id);
}
