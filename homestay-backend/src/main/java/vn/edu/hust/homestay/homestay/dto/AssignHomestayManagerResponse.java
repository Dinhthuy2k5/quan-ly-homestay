package vn.edu.hust.homestay.homestay.dto;

import vn.edu.hust.homestay.homestay.dto.DirectorHomestayResponse.AssignedManagerSummary;

/**
 * Dữ liệu trả về cho API-DIR-HS-03 (PUT /api/v1/director/homestays/{homestayId}/manager).
 * Giữ đúng cặp trường homestayId và managerId theo tài liệu API, đồng thời kèm thông tin tóm tắt manager (hoặc null khi gỡ).
 */
public record AssignHomestayManagerResponse(
        Long homestayId,
        Long managerId,
        AssignedManagerSummary manager
) {}
