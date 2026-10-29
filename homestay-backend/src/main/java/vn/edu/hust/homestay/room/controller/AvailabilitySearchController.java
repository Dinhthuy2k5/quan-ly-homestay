package vn.edu.hust.homestay.room.controller;

import io.swagger.v3.oas.annotations.Operation;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.hust.homestay.common.response.PagedResult;
import vn.edu.hust.homestay.room.dto.AvailabilitySearchRequest;
import vn.edu.hust.homestay.room.dto.AvailabilitySearchResponse;
import vn.edu.hust.homestay.room.service.AvailabilitySearchService;

/** API-PUB-03: endpoint công khai tìm phòng trống và báo giá theo đêm. */
@RestController
@RequestMapping("/api/v1/public/availability")
public class AvailabilitySearchController {

    private final AvailabilitySearchService availabilitySearchService;

    public AvailabilitySearchController(AvailabilitySearchService availabilitySearchService) {
        this.availabilitySearchService = availabilitySearchService;
    }

    @Operation(summary = "API-PUB-03: Tìm phòng trống và báo giá theo ngày lưu trú")
    @PostMapping("/search")
    public ResponseEntity<PagedResult<AvailabilitySearchResponse>> search(
            @RequestBody AvailabilitySearchRequest request
    ) {
        return ResponseEntity.ok(availabilitySearchService.search(request));
    }
}
