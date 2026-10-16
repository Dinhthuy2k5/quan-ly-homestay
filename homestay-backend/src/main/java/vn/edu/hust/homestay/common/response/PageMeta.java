package vn.edu.hust.homestay.common.response;

import lombok.Builder;
import lombok.Getter;

import java.util.List;

/**
 * Metadata phân trang, đính kèm trong ApiResponse.meta khi trả list.
 */
@Getter
@Builder
public class PageMeta {
    private int page;        // trang hiện tại (0-based)
    private int size;        // kích thước trang
    private long totalElements;
    private int totalPages;
    private boolean first;
    private boolean last;
}
