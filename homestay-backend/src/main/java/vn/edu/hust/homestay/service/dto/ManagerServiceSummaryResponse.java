package vn.edu.hust.homestay.service.dto;

import vn.edu.hust.homestay.service.entity.Service;
import vn.edu.hust.homestay.service.entity.Service.ServiceStatus;

public record ManagerServiceSummaryResponse(
        Long id,
        String name,
        Long categoryId,
        String categoryName,
        String unit,
        Long unitPrice,
        String description,
        ServiceStatus status
) {
    public static ManagerServiceSummaryResponse from(Service service, String categoryName) {
        return new ManagerServiceSummaryResponse(
                service.getId(),
                service.getName(),
                service.getCategoryId(),
                categoryName != null ? categoryName : "Khác",
                service.getUnit(),
                service.getUnitPrice(),
                service.getDescription(),
                service.getStatus()
        );
    }
}
