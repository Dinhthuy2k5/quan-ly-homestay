package vn.edu.hust.homestay.service.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import vn.edu.hust.homestay.service.entity.Service;
import vn.edu.hust.homestay.service.entity.Service.ServiceStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceRepository extends JpaRepository<Service, Long> {

    List<Service> findByHomestayIdAndStatusOrderByNameAsc(Long homestayId, ServiceStatus status);

    Optional<Service> findByIdAndHomestayIdAndStatus(Long id, Long homestayId, ServiceStatus status);

    Optional<Service> findByIdAndHomestayId(Long id, Long homestayId);

    boolean existsByHomestayIdAndName(Long homestayId, String name);

    boolean existsByHomestayIdAndNameIgnoreCase(Long homestayId, String name);

    boolean existsByHomestayIdAndNameAndIdNot(Long homestayId, String name, Long id);

    @Query("""
        SELECT COUNT(s) > 0 FROM Service s
        WHERE s.homestayId = :homestayId
          AND LOWER(s.name) = LOWER(:name)
          AND s.id <> :id
    """)
    boolean existsByHomestayIdAndNameIgnoreCaseAndIdNot(
            @Param("homestayId") Long homestayId,
            @Param("name") String name,
            @Param("id") Long id
    );

    boolean existsByCategoryIdAndHomestayId(Long categoryId, Long homestayId);

    @Query("""
        SELECT s FROM Service s
        WHERE s.homestayId = :homestayId
          AND (:status IS NULL OR s.status = :status)
          AND (:categoryId IS NULL OR s.categoryId = :categoryId)
    """)
    Page<Service> searchManagerServices(
            @Param("homestayId") Long homestayId,
            @Param("status") ServiceStatus status,
            @Param("categoryId") Long categoryId,
            Pageable pageable
    );
}
