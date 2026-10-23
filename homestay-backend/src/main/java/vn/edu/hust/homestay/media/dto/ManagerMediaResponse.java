package vn.edu.hust.homestay.media.dto;

import lombok.Builder;
import lombok.Getter;
import vn.edu.hust.homestay.media.entity.Media;

@Getter
@Builder
public class ManagerMediaResponse {
    private Long id;
    private Media.OwnerType ownerType;
    private Long ownerId;
    private String url;
    private String mimeType;
    private Long sizeBytes;
    private String caption;
    private Integer sortOrder;

    public static ManagerMediaResponse from(Media media) {
        return ManagerMediaResponse.builder()
                .id(media.getId())
                .ownerType(media.getOwnerType())
                .ownerId(media.getOwnerId())
                .url(media.getUrl())
                .mimeType(media.getMimeType())
                .sizeBytes(media.getSizeBytes())
                .caption(media.getCaption())
                .sortOrder(media.getSortOrder())
                .build();
    }
}
