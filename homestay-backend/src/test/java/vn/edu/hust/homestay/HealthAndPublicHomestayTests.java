package vn.edu.hust.homestay;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Kiểm thử tích hợp toàn bộ các API công khai của Tuần 1 và Health Check.
 * Đối chiếu theo tài liệu thiết kế API v1.1 và Kế hoạch 10 tuần.
 * Ngày thực hiện: 17/10/2026
 */
@SpringBootTest
class HealthAndPublicHomestayTests {

    @Autowired
    private WebApplicationContext context;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
    }

    /**
     * Mã API: API-HEALTH-01
     * Tên API: Kiểm tra sức khỏe hệ thống
     * Ngày thực hiện: 17/10/2026
     */
    @Test
    @DisplayName("API-HEALTH-01: GET /api/v1/health — Trả về status UP và database UP kết nối MySQL thật")
    void testHealthEndpoint() throws Exception {
        mockMvc.perform(get("/api/v1/health")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("UP")))
                .andExpect(jsonPath("$.data.database", is("UP")))
                .andExpect(jsonPath("$.data.service", is("homestay-backend")));
    }

    /**
     * Mã API: API-PUB-05
     * Tên API: Tra cứu homestay theo địa điểm / danh sách homestay
     * Ngày thực hiện: 17/10/2026
     */
    @Test
    @DisplayName("API-PUB-05: GET /api/v1/public/homestays — Tra cứu danh sách homestay có phân trang, hotlinePhone và coverImageUrl")
    void testPublicHomestaySearch() throws Exception {
        mockMvc.perform(get("/api/v1/public/homestays")
                        .param("page", "0")
                        .param("size", "10")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.items", isA(java.util.List.class)))
                .andExpect(jsonPath("$.data.page", is(0)))
                .andExpect(jsonPath("$.data.size", is(10)))
                .andExpect(jsonPath("$.data.totalElements", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.data.items[0].id", notNullValue()))
                .andExpect(jsonPath("$.data.items[0].name", notNullValue()))
                .andExpect(jsonPath("$.data.items[0].province", notNullValue()))
                .andExpect(jsonPath("$.data.items[0].hotlinePhone", notNullValue()));
    }

    /**
     * Mã API: API-PUB-05
     * Kiểm tra lọc theo từ khóa hoặc địa điểm
     */
    @Test
    @DisplayName("API-PUB-05: GET /api/v1/public/homestays?province=Hòa Bình — Lọc theo tỉnh thành")
    void testPublicHomestayFilterByProvince() throws Exception {
        mockMvc.perform(get("/api/v1/public/homestays")
                        .param("province", "Hòa Bình")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.items", isA(java.util.List.class)))
                .andExpect(jsonPath("$.data.items[0].province", containsString("Hòa Bình")));
    }

    /**
     * Mã API: API-PUB-02
     * Tên API: Chi tiết homestay
     * Ngày thực hiện: 17/10/2026
     */
    @Test
    @DisplayName("API-PUB-02: GET /api/v1/public/homestays/{homestayId} — Xem chi tiết homestay thành công")
    void testGetHomestayDetailSuccess() throws Exception {
        mockMvc.perform(get("/api/v1/public/homestays/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(1)))
                .andExpect(jsonPath("$.data.name", notNullValue()))
                .andExpect(jsonPath("$.data.hotlinePhone", notNullValue()))
                .andExpect(jsonPath("$.data.address", notNullValue()))
                .andExpect(jsonPath("$.data.media", isA(java.util.List.class)));
    }

    @Test
    @DisplayName("API-PUB-02: GET /api/v1/public/homestays/{homestayId} — Homestay không tồn tại trả lỗi 404 HOMESTAY_NOT_FOUND")
    void testGetHomestayDetailNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/public/homestays/999999")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("HOMESTAY_NOT_FOUND")));
    }

    /**
     * Mã API: API-PUB-ROOM-TYPE-01
     * Tên API: Danh sách loại phòng công khai của homestay
     * Ngày thực hiện: 17/10/2026
     */
    @Test
    @DisplayName("GET /api/v1/public/homestays/{homestayId}/room-types — Lấy danh sách loại phòng của homestay")
    void testGetHomestayRoomTypes() throws Exception {
        mockMvc.perform(get("/api/v1/public/homestays/1/room-types")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data", isA(java.util.List.class)))
                .andExpect(jsonPath("$.data[0].id", notNullValue()))
                .andExpect(jsonPath("$.data[0].name", notNullValue()));
    }

    /**
     * Mã API: API-PUB-06
     * Tên API: Xem chi tiết thông tin phòng
     * Ngày thực hiện: 17/10/2026
     */
    @Test
    @DisplayName("API-PUB-06: GET /api/v1/public/rooms/{roomId} — Xem chi tiết phòng, giá BASE và tiện nghi")
    void testGetRoomDetailSuccess() throws Exception {
        mockMvc.perform(get("/api/v1/public/rooms/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.id", is(1)))
                .andExpect(jsonPath("$.data.name", notNullValue()))
                .andExpect(jsonPath("$.data.maxGuests", greaterThan(0)))
                .andExpect(jsonPath("$.data.homestay.id", notNullValue()))
                .andExpect(jsonPath("$.data.homestay.name", notNullValue()))
                .andExpect(jsonPath("$.data.homestay.hotlinePhone", notNullValue()))
                .andExpect(jsonPath("$.data.roomType.name", notNullValue()))
                .andExpect(jsonPath("$.data.nightlyPrice", notNullValue()))
                .andExpect(jsonPath("$.data.amenities", isA(java.util.List.class)))
                .andExpect(jsonPath("$.data.media", isA(java.util.List.class)));
    }

    @Test
    @DisplayName("API-PUB-06: GET /api/v1/public/rooms/{roomId} — Phòng không tồn tại trả lỗi 404 ROOM_NOT_FOUND")
    void testGetRoomDetailNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/public/rooms/999999")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success", is(false)))
                .andExpect(jsonPath("$.error.code", is("ROOM_NOT_FOUND")));
    }
}
