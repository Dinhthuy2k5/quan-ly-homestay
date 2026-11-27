package vn.edu.hust.homestay.homestay.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Mã API: API-DIR-HS-03 (PUT /api/v1/director/homestays/{homestayId}/manager).
 * managerId = ID tài khoản Manager để gán/thay thế, hoặc null để gỡ Manager hiện tại khỏi homestay.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AssignHomestayManagerRequest {
    private Long managerId;
}
