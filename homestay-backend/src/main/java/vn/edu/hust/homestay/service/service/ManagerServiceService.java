package vn.edu.hust.homestay.service.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.common.response.PagedResult;
import vn.edu.hust.homestay.service.dto.CreateManagerServiceRequest;
import vn.edu.hust.homestay.service.dto.ManagerCreateServiceResponse;
import vn.edu.hust.homestay.service.dto.ManagerServiceSummaryResponse;
import vn.edu.hust.homestay.service.dto.ServiceCategoryResponse;
import vn.edu.hust.homestay.service.dto.UpdateManagerServiceRequest;
import vn.edu.hust.homestay.service.entity.Service;
import vn.edu.hust.homestay.service.entity.Service.ServiceStatus;
import vn.edu.hust.homestay.service.entity.ServiceCategory;
import vn.edu.hust.homestay.service.repository.ServiceCategoryRepository;
import vn.edu.hust.homestay.service.repository.ServiceRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@org.springframework.stereotype.Service
public class ManagerServiceService {

    private final ServiceRepository serviceRepository;
    private final ServiceCategoryRepository serviceCategoryRepository;

    public ManagerServiceService(
            ServiceRepository serviceRepository,
            ServiceCategoryRepository serviceCategoryRepository
    ) {
        this.serviceRepository = serviceRepository;
        this.serviceCategoryRepository = serviceCategoryRepository;
    }

    /**
     * API-MGR-SVC-01: Danh sách dịch vụ cơ sở
     */
    @Transactional(readOnly = true)
    public PagedResult<ManagerServiceSummaryResponse> getServices(
            UserPrincipal principal,
            ServiceStatus status,
            Long categoryId,
            Pageable pageable
    ) {
        Long homestayId = validateAndGetHomestayId(principal);

        Page<Service> page = serviceRepository.searchManagerServices(
                homestayId,
                status,
                categoryId,
                pageable
        );

        Map<Long, String> categoryNames = serviceCategoryRepository.findByHomestayIdOrderByNameAsc(homestayId)
                .stream()
                .collect(Collectors.toMap(ServiceCategory::getId, ServiceCategory::getName, (a, b) -> a));

        List<ManagerServiceSummaryResponse> items = page.getContent().stream()
                .map(service -> ManagerServiceSummaryResponse.from(
                        service,
                        categoryNames.getOrDefault(service.getCategoryId(), "Khác")
                ))
                .toList();

        return PagedResult.of(page, items);
    }

    /**
     * API-MGR-SVC-02: Khai báo dịch vụ
     */
    @Transactional
    public ManagerCreateServiceResponse createService(UserPrincipal principal, CreateManagerServiceRequest request) {
        Long homestayId = validateAndGetHomestayId(principal);

        if (request == null) {
            throw BusinessException.badRequest("INVALID_REQUEST", "Dữ liệu yêu cầu không được để trống");
        }
        if (request.categoryId() == null || request.categoryId() <= 0) {
            throw BusinessException.badRequest("INVALID_CATEGORY_ID", "Mã danh mục dịch vụ không hợp lệ");
        }
        if (request.name() == null || request.name().trim().isEmpty()) {
            throw BusinessException.badRequest("INVALID_SERVICE_NAME", "Tên dịch vụ không được để trống");
        }
        String trimmedName = request.name().trim();
        if (trimmedName.length() > 150) {
            throw BusinessException.badRequest("INVALID_SERVICE_NAME", "Tên dịch vụ không được vượt quá 150 ký tự");
        }
        if (request.unit() == null || request.unit().trim().isEmpty()) {
            throw BusinessException.badRequest("INVALID_SERVICE_UNIT", "Đơn vị tính không được để trống");
        }
        String trimmedUnit = request.unit().trim();
        if (trimmedUnit.length() > 30) {
            throw BusinessException.badRequest("INVALID_SERVICE_UNIT", "Đơn vị tính không được vượt quá 30 ký tự");
        }
        if (request.unitPrice() == null) {
            throw BusinessException.badRequest("INVALID_UNIT_PRICE", "Đơn giá không được để trống");
        }
        if (request.unitPrice() < 0) {
            throw BusinessException.badRequest("INVALID_UNIT_PRICE", "Đơn giá phải lớn hơn hoặc bằng 0");
        }
        if (request.unitPrice() > 1_000_000_000L) {
            throw BusinessException.badRequest("INVALID_UNIT_PRICE", "Đơn giá không được vượt quá 1.000.000.000 VNĐ");
        }
        if (request.description() != null && request.description().length() > 255) {
            throw BusinessException.badRequest("INVALID_DESCRIPTION", "Mô tả không được vượt quá 255 ký tự");
        }

        ServiceCategory category = serviceCategoryRepository.findByIdAndHomestayId(request.categoryId(), homestayId)
                .orElseThrow(() -> BusinessException.badRequest(
                        "SERVICE_CATEGORY_SCOPE_MISMATCH",
                        "Danh mục dịch vụ không thuộc homestay đang quản lý"
                ));

        if (serviceRepository.existsByHomestayIdAndNameIgnoreCase(homestayId, trimmedName)) {
            throw BusinessException.conflict("SERVICE_NAME_EXISTS", "Tên dịch vụ đã tồn tại trong homestay");
        }

        Service service = new Service();
        service.setHomestayId(homestayId);
        service.setCategoryId(category.getId());
        service.setName(trimmedName);
        service.setUnit(trimmedUnit);
        service.setUnitPrice(request.unitPrice());
        service.setDescription(request.description() != null && !request.description().isBlank()
                ? request.description().trim()
                : null);
        service.setStatus(ServiceStatus.ACTIVE);

        Service saved = serviceRepository.save(service);
        return ManagerCreateServiceResponse.from(saved, category.getName());
    }

    /**
     * Xem danh mục dịch vụ thuộc homestay để phục vụ bộ lọc và hiển thị.
     */
    @Transactional(readOnly = true)
    public List<ServiceCategoryResponse> getServiceCategories(UserPrincipal principal) {
        Long homestayId = validateAndGetHomestayId(principal);
        return serviceCategoryRepository.findByHomestayIdOrderByNameAsc(homestayId)
                .stream()
                .map(ServiceCategoryResponse::from)
                .toList();
    }

    /**
     * Lấy thông tin chi tiết dịch vụ thuộc homestay
     */
    @Transactional(readOnly = true)
    public ManagerServiceSummaryResponse getServiceDetail(UserPrincipal principal, Long serviceId) {
        Long homestayId = validateAndGetHomestayId(principal);

        if (serviceId == null || serviceId <= 0) {
            throw BusinessException.badRequest("INVALID_SERVICE_ID", "Mã dịch vụ không hợp lệ");
        }

        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> BusinessException.notFound("SERVICE_NOT_FOUND", "Không tìm thấy dịch vụ"));

        if (!service.getHomestayId().equals(homestayId)) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Dịch vụ không thuộc homestay đang quản lý");
        }

        String categoryName = serviceCategoryRepository.findById(service.getCategoryId())
                .map(ServiceCategory::getName)
                .orElse("Khác");

        return ManagerServiceSummaryResponse.from(service, categoryName);
    }

    /**
     * API-MGR-SVC-03: Cập nhật dịch vụ
     */
    @Transactional
    public ManagerServiceSummaryResponse updateService(
            UserPrincipal principal,
            Long serviceId,
            UpdateManagerServiceRequest request
    ) {
        Long homestayId = validateAndGetHomestayId(principal);

        if (serviceId == null || serviceId <= 0) {
            throw BusinessException.badRequest("INVALID_SERVICE_ID", "Mã dịch vụ không hợp lệ");
        }

        Service service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> BusinessException.notFound("SERVICE_NOT_FOUND", "Không tìm thấy dịch vụ"));

        if (!service.getHomestayId().equals(homestayId)) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Dịch vụ không thuộc homestay đang quản lý");
        }

        if (request == null) {
            String categoryName = serviceCategoryRepository.findById(service.getCategoryId())
                    .map(ServiceCategory::getName)
                    .orElse("Khác");
            return ManagerServiceSummaryResponse.from(service, categoryName);
        }

        if (request.categoryId() != null) {
            if (request.categoryId() <= 0) {
                throw BusinessException.badRequest("INVALID_CATEGORY_ID", "Mã danh mục dịch vụ không hợp lệ");
            }
            ServiceCategory category = serviceCategoryRepository.findByIdAndHomestayId(request.categoryId(), homestayId)
                    .orElseThrow(() -> BusinessException.badRequest(
                            "SERVICE_CATEGORY_SCOPE_MISMATCH",
                            "Danh mục dịch vụ không thuộc homestay đang quản lý"
                    ));
            service.setCategoryId(category.getId());
        }

        if (request.name() != null) {
            String trimmedName = request.name().trim();
            if (trimmedName.isEmpty()) {
                throw BusinessException.badRequest("INVALID_SERVICE_NAME", "Tên dịch vụ không được để trống");
            }
            if (trimmedName.length() > 150) {
                throw BusinessException.badRequest("INVALID_SERVICE_NAME", "Tên dịch vụ không được vượt quá 150 ký tự");
            }
            if (serviceRepository.existsByHomestayIdAndNameIgnoreCaseAndIdNot(homestayId, trimmedName, serviceId)) {
                throw BusinessException.conflict("SERVICE_NAME_EXISTS", "Tên dịch vụ đã tồn tại trong homestay");
            }
            service.setName(trimmedName);
        }

        if (request.unit() != null) {
            String trimmedUnit = request.unit().trim();
            if (trimmedUnit.isEmpty()) {
                throw BusinessException.badRequest("INVALID_SERVICE_UNIT", "Đơn vị tính không được để trống");
            }
            if (trimmedUnit.length() > 30) {
                throw BusinessException.badRequest("INVALID_SERVICE_UNIT", "Đơn vị tính không được vượt quá 30 ký tự");
            }
            service.setUnit(trimmedUnit);
        }

        if (request.unitPrice() != null) {
            if (request.unitPrice() < 0) {
                throw BusinessException.badRequest("INVALID_UNIT_PRICE", "Đơn giá phải lớn hơn hoặc bằng 0");
            }
            if (request.unitPrice() > 1_000_000_000L) {
                throw BusinessException.badRequest("INVALID_UNIT_PRICE", "Đơn giá không được vượt quá 1.000.000.000 VNĐ");
            }
            service.setUnitPrice(request.unitPrice());
        }

        if (request.description() != null) {
            if (request.description().length() > 255) {
                throw BusinessException.badRequest("INVALID_DESCRIPTION", "Mô tả không được vượt quá 255 ký tự");
            }
            service.setDescription(request.description().isBlank() ? null : request.description().trim());
        }

        if (request.status() != null) {
            service.setStatus(request.status());
        }

        Service saved = serviceRepository.save(service);
        String categoryName = serviceCategoryRepository.findById(saved.getCategoryId())
                .map(ServiceCategory::getName)
                .orElse("Khác");

        return ManagerServiceSummaryResponse.from(saved, categoryName);
    }

    private Long validateAndGetHomestayId(UserPrincipal principal) {
        if (principal == null || principal.getHomestayId() == null) {
            throw BusinessException.badRequest("HOMESTAY_NOT_ASSIGNED", "Tài khoản quản lý chưa được phân công cơ sở");
        }
        return principal.getHomestayId();
    }
}
