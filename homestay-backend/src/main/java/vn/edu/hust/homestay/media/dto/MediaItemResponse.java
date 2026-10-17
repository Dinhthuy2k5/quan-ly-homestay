package vn.edu.hust.homestay.media.dto;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hust.homestay.media.entity.Media;

/**
 * DTO đại diện một mục media công khai (ảnh / video).
 * Ngày thực hiện: 17/10/2026
 */
@Getter
@Builder
public class MediaItemResponse {
    private String url;
    private String mimeType;
    private String caption;

    public static MediaItemResponse from(Media m) {
        if (m == null) return null;
        return MediaItemResponse.builder()
                .url(m.getUrl())
                .mimeType(m.getMimeType())
                .caption(m.getCaption())
                .build();
    }
}
