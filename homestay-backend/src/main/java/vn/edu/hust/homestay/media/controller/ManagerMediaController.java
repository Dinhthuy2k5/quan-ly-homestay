package vn.edu.hust.homestay.media.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.response.ApiResponse;
import vn.edu.hust.homestay.media.dto.ManagerMediaResponse;
import vn.edu.hust.homestay.media.service.ManagerMediaService;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/manager/media")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerMediaController {

    private final ManagerMediaService managerMediaService;

    public ManagerMediaController(ManagerMediaService managerMediaService) {
        this.managerMediaService = managerMediaService;
    }

    @PostMapping(consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<ManagerMediaResponse>> uploadMedia(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("ownerType") String ownerType,
            @RequestParam("ownerId") Long ownerId,
            @RequestParam(value = "caption", required = false) String caption,
            @RequestParam(value = "sortOrder", defaultValue = "0") Integer sortOrder,
            @RequestParam("file") MultipartFile file
    ) {
        ManagerMediaResponse response = managerMediaService.upload(
                principal, ownerType, ownerId, caption, sortOrder, file);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response));
    }

    @DeleteMapping("/{mediaId}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> deleteMedia(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long mediaId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(managerMediaService.delete(principal, mediaId)));
    }
}
