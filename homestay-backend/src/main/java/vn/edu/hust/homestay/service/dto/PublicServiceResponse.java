package vn.edu.hust.homestay.service.dto;

import vn.edu.hust.homestay.service.entity.Service;

public record PublicServiceResponse(
        Long id,
        Long categoryId,
        String categoryName,
        String name,
        String unit,
        Long unitPrice,
        String description
) {
    public static PublicServiceResponse from(Service service, String categoryName) {
        return new PublicServiceResponse(
                service.getId(),
                service.getCategoryId(),
                categoryName != null ? categoryName : "Khác",
                service.getName(),
                service.getUnit(),
                service.getUnitPrice(),
                service.getDescription()
        );
    }

    public static PublicServiceResponse from(Service service) {
        return from(service, "Khác");
    }
}
