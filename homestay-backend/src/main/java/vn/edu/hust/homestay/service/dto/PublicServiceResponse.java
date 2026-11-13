package vn.edu.hust.homestay.service.dto;

import vn.edu.hust.homestay.service.entity.ServiceOffering;

public record PublicServiceResponse(
        Long id,
        String name,
        String unit,
        Long unitPrice,
        String description
) {
    public static PublicServiceResponse from(ServiceOffering offering) {
        return new PublicServiceResponse(
                offering.getId(), offering.getName(), offering.getUnit(), offering.getUnitPrice(), offering.getDescription());
    }
}
