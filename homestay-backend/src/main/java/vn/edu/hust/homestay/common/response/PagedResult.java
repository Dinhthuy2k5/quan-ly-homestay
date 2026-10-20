package vn.edu.hust.homestay.common.response;

import lombok.Builder;
import lombok.Getter;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Cấu trúc trả về phân trang chuẩn theo tài liệu thiết kế API:
 * {
 *   "items": [ ... ],
 *   "page": 0,
 *   "size": 10,
 *   "totalElements": 1,
 *   "totalPages": 1
 * }
 * Ngày thực hiện: 17/10/2026
 */
@Getter
@Builder
public class PagedResult<T> {
    private List<T> items;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;

    public static <T> PagedResult<T> from(Page<T> page) {
        return PagedResult.<T>builder()
                .items(page.getContent())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }

    public static <T> PagedResult<T> of(List<T> items, int page, int size, long totalElements, int totalPages) {
        return PagedResult.<T>builder()
                .items(items)
                .page(page)
                .size(size)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .build();
    }

    public static <T, R> PagedResult<R> of(Page<T> page, List<R> items) {
        return PagedResult.<R>builder()
                .items(items)
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .build();
    }
}
