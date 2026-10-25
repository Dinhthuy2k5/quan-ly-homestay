package vn.edu.hust.homestay.media.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.hust.homestay.auth.security.UserPrincipal;
import vn.edu.hust.homestay.common.exception.BusinessException;
import vn.edu.hust.homestay.homestay.repository.HomestayRepository;
import vn.edu.hust.homestay.media.dto.ManagerMediaResponse;
import vn.edu.hust.homestay.media.entity.Media;
import vn.edu.hust.homestay.media.entity.Media.OwnerType;
import vn.edu.hust.homestay.media.repository.MediaRepository;
import vn.edu.hust.homestay.room.repository.RoomRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class ManagerMediaService {

    private static final Logger log = LoggerFactory.getLogger(ManagerMediaService.class);
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
    private static final int MAX_HOMESTAY_MEDIA = 20;
    private static final int MAX_ROOM_MEDIA = 12;
    private static final int MAX_SERVICE_MEDIA = 10;

    private final MediaRepository mediaRepository;
    private final HomestayRepository homestayRepository;
    private final RoomRepository roomRepository;
    private final JdbcTemplate jdbcTemplate;
    private final Path uploadRoot;

    public ManagerMediaService(
            MediaRepository mediaRepository,
            HomestayRepository homestayRepository,
            RoomRepository roomRepository,
            JdbcTemplate jdbcTemplate,
            @Value("${app.storage.upload-dir:storage/uploads}") String uploadDir
    ) {
        this.mediaRepository = mediaRepository;
        this.homestayRepository = homestayRepository;
        this.roomRepository = roomRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.uploadRoot = Paths.get(uploadDir).toAbsolutePath().normalize();
    }

    @Transactional
    public ManagerMediaResponse upload(
            UserPrincipal principal,
            String rawOwnerType,
            Long ownerId,
            String caption,
            Integer sortOrder,
            MultipartFile file
    ) {
        long homestayId = requireHomestayId(principal);
        OwnerType ownerType = parseOwnerType(rawOwnerType);
        requireOwnerAccess(ownerType, ownerId, homestayId);

        int maxAllowed = switch (ownerType) {
            case HOMESTAY -> MAX_HOMESTAY_MEDIA;
            case ROOM -> MAX_ROOM_MEDIA;
            case SERVICE -> MAX_SERVICE_MEDIA;
        };
        long currentCount = mediaRepository.countByOwnerTypeAndOwnerId(ownerType, ownerId);
        if (currentCount >= maxAllowed) {
            throw BusinessException.badRequest(
                    "TOO_MANY_MEDIA_FILES",
                    String.format("Số lượng ảnh/video đã đạt giới hạn tối đa (%d tệp)", maxAllowed)
            );
        }

        if (file == null || file.isEmpty()) {
            throw BusinessException.badRequest("UNSUPPORTED_MEDIA_TYPE", "Tệp tải lên đang trống");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BusinessException("FILE_TOO_LARGE", "Tệp không được vượt quá 5 MB", org.springframework.http.HttpStatus.PAYLOAD_TOO_LARGE);
        }
        if (caption != null && caption.length() > 255) {
            throw BusinessException.badRequest("VALIDATION_ERROR", "caption không được vượt quá 255 ký tự");
        }
        if (sortOrder != null && sortOrder < 0) {
            throw BusinessException.badRequest("VALIDATION_ERROR", "sortOrder không được âm");
        }

        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to read uploaded media", exception);
        }
        DetectedFile detected = detectFile(content);
        String category = ownerType.name().toLowerCase(Locale.ROOT) + "s";
        String filename = UUID.randomUUID() + detected.extension();
        Path categoryRoot = uploadRoot.resolve(category).normalize();
        Path target = categoryRoot.resolve(filename).normalize();
        if (!target.startsWith(categoryRoot) || !categoryRoot.startsWith(uploadRoot)) {
            throw new IllegalStateException("Generated media path escaped upload directory");
        }

        String url = "/files/" + category + "/" + filename;
        Media media = new Media();
        media.setHomestayId(homestayId);
        media.setOwnerType(ownerType);
        media.setOwnerId(ownerId);
        media.setUrl(url);
        media.setMimeType(detected.mimeType());
        media.setSizeBytes((long) content.length);
        media.setCaption(trimToNull(caption));
        media.setSortOrder(sortOrder == null ? 0 : sortOrder);
        media.setUploadedBy(principal.getId());
        media.setCreatedAt(Instant.now());
        Media saved = mediaRepository.saveAndFlush(media);

        try {
            Files.createDirectories(categoryRoot);
            try (var input = file.getInputStream()) {
                Files.copy(input, target);
            }
        } catch (IOException exception) {
            deleteQuietly(target);
            throw new IllegalStateException("Unable to store uploaded media", exception);
        }
        cleanupUploadIfTransactionRollsBack(target);
        return ManagerMediaResponse.from(saved);
    }


    @Transactional
    public Map<String, Boolean> delete(UserPrincipal principal, Long mediaId) {
        long homestayId = requireHomestayId(principal);
        Media media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> BusinessException.notFound("MEDIA_NOT_FOUND", "Không tìm thấy tệp media"));
        if (media.getHomestayId() != homestayId) {
            throw BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Không có quyền thao tác media của cơ sở khác");
        }

        Path file = resolveStoredFile(media.getUrl());
        mediaRepository.delete(media);
        if (file != null) deleteFileAfterCommit(file);
        return Map.of("deleted", true);
    }

    private void requireOwnerAccess(OwnerType type, Long ownerId, long homestayId) {
        if (ownerId == null || ownerId < 1) {
            throw BusinessException.badRequest("OWNER_NOT_FOUND", "ownerId phải lớn hơn 0");
        }
        switch (type) {
            case HOMESTAY -> {
                if (!homestayRepository.existsById(ownerId)) {
                    throw BusinessException.notFound("OWNER_NOT_FOUND", "Không tìm thấy homestay");
                }
                if (ownerId != homestayId) throw homestayScopeViolation();
            }
            case ROOM -> {
                var room = roomRepository.findById(ownerId)
                        .orElseThrow(() -> BusinessException.notFound("OWNER_NOT_FOUND", "Không tìm thấy phòng"));
                if (room.getHomestayId() != homestayId) throw homestayScopeViolation();
            }
            case SERVICE -> {
                Long serviceHomestayId = getServiceHomestayId(ownerId);
                if (serviceHomestayId == null) {
                    throw BusinessException.notFound("OWNER_NOT_FOUND", "Không tìm thấy dịch vụ");
                }
                if (serviceHomestayId != homestayId) throw homestayScopeViolation();
            }
        }
    }

    private Long getServiceHomestayId(Long serviceId) {
        return jdbcTemplate.query("SELECT homestay_id FROM services WHERE id = ?", resultSet ->
                resultSet.next() ? resultSet.getLong(1) : null, serviceId);
    }

    private BusinessException homestayScopeViolation() {
        return BusinessException.forbidden("HOMESTAY_SCOPE_VIOLATION", "Không có quyền thao tác nội dung thuộc cơ sở khác");
    }

    private OwnerType parseOwnerType(String value) {
        if (value == null) throw BusinessException.badRequest("OWNER_NOT_FOUND", "ownerType không hợp lệ");
        try {
            return OwnerType.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException exception) {
            throw BusinessException.badRequest("OWNER_NOT_FOUND", "ownerType chỉ nhận HOMESTAY, ROOM hoặc SERVICE");
        }
    }

    private long requireHomestayId(UserPrincipal principal) {
        if (principal == null || principal.getHomestayId() == null || principal.getId() == null) {
            throw BusinessException.badRequest("HOMESTAY_NOT_ASSIGNED", "Tài khoản quản lý chưa được phân công cơ sở");
        }
        return principal.getHomestayId();
    }

    private DetectedFile detectFile(byte[] bytes) {
        if (bytes.length >= 3 && (bytes[0] & 0xff) == 0xff && (bytes[1] & 0xff) == 0xd8 && (bytes[2] & 0xff) == 0xff) {
            return new DetectedFile("image/jpeg", ".jpg");
        }
        if (bytes.length >= 8 && (bytes[0] & 0xff) == 0x89
                && bytes[1] == 0x50 && bytes[2] == 0x4e && bytes[3] == 0x47
                && bytes[4] == 0x0d && bytes[5] == 0x0a && bytes[6] == 0x1a && bytes[7] == 0x0a) {
            return new DetectedFile("image/png", ".png");
        }
        if (bytes.length >= 12 && ascii(bytes, 0, 4).equals("RIFF") && ascii(bytes, 8, 4).equals("WEBP")) {
            return new DetectedFile("image/webp", ".webp");
        }
        if (bytes.length >= 12 && ascii(bytes, 4, 4).equals("ftyp")) {
            return new DetectedFile("video/mp4", ".mp4");
        }
        throw new BusinessException("UNSUPPORTED_MEDIA_TYPE", "Chỉ chấp nhận ảnh JPG, PNG, WEBP hoặc video MP4", org.springframework.http.HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    }

    private String ascii(byte[] bytes, int offset, int length) {
        return new String(bytes, offset, length, java.nio.charset.StandardCharsets.US_ASCII);
    }

    private Path resolveStoredFile(String url) {
        if (url == null || !url.startsWith("/files/")) return null;
        String relative = url.substring("/files/".length());
        int separator = relative.indexOf('/');
        if (separator <= 0 || separator == relative.length() - 1
                || separator != relative.lastIndexOf('/') || relative.contains("\\")) return null;
        String ownerFolder = relative.substring(0, separator);
        if (!ownerFolder.equals("homestays") && !ownerFolder.equals("rooms") && !ownerFolder.equals("services")) return null;
        Path categoryRoot = uploadRoot.resolve(ownerFolder).normalize();
        Path target = categoryRoot.resolve(relative.substring(separator + 1)).normalize();
        if (!target.startsWith(categoryRoot) || !categoryRoot.startsWith(uploadRoot)) return null;
        return target;
    }

    private void cleanupUploadIfTransactionRollsBack(Path target) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) deleteQuietly(target);
            }
        });
    }

    private void deleteFileAfterCommit(Path target) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteQuietly(target);
            }
        });
    }

    private void deleteQuietly(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException exception) {
            log.warn("Could not delete media file {}", path, exception);
        }
    }

    private String trimToNull(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record DetectedFile(String mimeType, String extension) { }
}
