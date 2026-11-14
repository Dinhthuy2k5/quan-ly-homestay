package vn.edu.hust.homestay.service.dto;

import vn.edu.hust.homestay.service.entity.Service;

public record PublicServiceResponse(
        Long id,
        String name,
        String unit,
        Long unitPrice,
        String description
) {
    public static PublicServiceResponse from(Service service) {
        return new PublicServiceResponse(
                service.getId(), service.getName(), service.getUnit(), service.getUnitPrice(), service.getDescription());
    }
}
