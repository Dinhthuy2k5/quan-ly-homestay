package vn.edu.hust.homestay.service.dto;

import vn.edu.hust.homestay.service.entity.ServiceCategory;

public record ServiceCategoryResponse(
        Long id,
        Long homestayId,
        String name
) {
    public static ServiceCategoryResponse from(ServiceCategory category) {
        return new ServiceCategoryResponse(
                category.getId(),
                category.getHomestayId(),
                category.getName()
        );
    }
}
