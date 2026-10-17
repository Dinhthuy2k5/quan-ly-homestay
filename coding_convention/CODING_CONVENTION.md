# CODING CONVENTION — HỆ THỐNG QUẢN LÝ VẬN HÀNH HOMESTAY

**Phiên bản:** 1.2 — đồng bộ với source hiện hành (Spring Data JPA/Hibernate)  
**Phạm vi:** Backend Java Spring Boot, REST API, MySQL và frontend ReactJS/Vite  
**Mục đích:** Là quy ước chung để developer/coding agent viết code nhất quán, dễ đọc, dễ kiểm thử và không làm sai nghiệp vụ đã chốt. Backend hiện dùng Spring Data JPA/Hibernate, Entity, Repository và transaction của Spring; không tự ý thay bằng Spring JDBC.

> Trước mỗi nhiệm vụ code, agent phải đọc file này, `README.md`, tài liệu API/nghiệp vụ liên quan, `database/homestay-database.sql` và các `SKILL.md` liên quan. Hiện `.gitignore` bỏ qua `docs/`; nếu tài liệu không có trong checkout, không đoán hợp đồng API/nghiệp vụ. Nêu rõ tài liệu nào thiếu và chỉ tiếp tục phần không phụ thuộc vào nội dung đó.

---

## 1. Nguyên tắc ưu tiên và phạm vi thay đổi

### 1.1. Thứ tự nguồn sự thật

Khi có thông tin mâu thuẫn, xử lý theo thứ tự:

1. Chỉ dẫn mới nhất được người dùng xác nhận.
2. `database/homestay-database.sql` hiện hành và schema thực tế đang chạy (schema quyết định tên/cấu trúc dữ liệu; kiểm tra schema thực tế nếu có thể).
3. Tài liệu nghiệp vụ đã chốt gần nhất (quyết định quy tắc nghiệp vụ).
4. Tài liệu thiết kế API hiện hành (quyết định method, path, request, response và mã lỗi).
5. Cấu trúc, dependency và cách triển khai đã có trong source.
6. Quy ước trong file này, skill, ví dụ cũ hoặc giả định của agent.

Nếu hai nguồn có thẩm quyền ngang nhau mâu thuẫn, **không tự chọn một bên**. Báo rõ điểm mâu thuẫn, ảnh hưởng và hỏi người dùng trước khi thay đổi schema hoặc nghiệp vụ.

### 1.2. Không mở rộng phạm vi tự ý

- Chỉ sửa phần cần thiết để hoàn thành yêu cầu đang được giao.
- Không tự viết code khi người dùng chỉ yêu cầu phân tích, thiết kế, kế hoạch hoặc viết tài liệu.
- Không tự thêm nghiệp vụ, trạng thái, endpoint, trường database, thư viện, bảng hoặc quy trình duyệt chưa được xác nhận.
- Không tự xóa hoặc đổi tên API, cột, bảng, enum hay trạng thái đang được sử dụng.
- Không chạy destructive DDL, không reset database, không để ORM tự tạo/sửa schema. Giữ `spring.jpa.hibernate.ddl-auto: validate`; thay đổi cấu trúc DB phải được yêu cầu riêng và có cập nhật schema SQL/migration được review.
- Không báo đã build/test thành công nếu chưa thực sự chạy lệnh và kiểm tra kết quả.

### 1.3. Quy trình trước khi sửa code

1. Đọc yêu cầu cụ thể và xác định module/API liên quan.
2. Đọc file `SKILL.md` phù hợp trong `skills/` hoặc `.agents/skills/` tùy vị trí cài đặt.
3. Kiểm tra code hiện tại, cấu trúc package, dependency, Entity/DTO, repository, test và API contract.
4. Kiểm tra schema thực tế; không mặc định file SQL mới nhất đã được chạy trên MySQL.
5. Liệt kê ngắn gọn các file dự kiến sửa và quy tắc nghiệp vụ có liên quan.
6. Thực hiện thay đổi nhỏ nhất nhưng hoàn chỉnh.
7. Chạy build/test có sẵn; báo chính xác lệnh đã chạy, kết quả và phần chưa kiểm chứng.

---

## 2. Stack và phạm vi kỹ thuật

### Backend

- Java 21.
- Spring Boot và Maven theo phiên bản/dependency đang có trong repository.
- Spring Web cho REST API.
- Spring Validation cho kiểm tra request.
- Spring Security cho xác thực và phân quyền.
- **Spring Data JPA/Hibernate là cách truy cập MySQL hiện hành.** Dùng Entity ánh xạ schema, Spring Data Repository cho thao tác thông thường và JPQL/Criteria khi cần truy vấn tùy biến.
- Không đưa Spring JDBC/`NamedParameterJdbcTemplate` vào module mới để thay thế repository hiện hành nếu chưa có yêu cầu/đánh giá kiến trúc rõ ràng. Native SQL chỉ dùng khi truy vấn không phù hợp với JPA; phải bind parameter và kiểm tra tương thích MySQL.
- Dùng `@Transactional` ở service cho nghiệp vụ ghi nhiều bước/bảng. Không để Hibernate tự tạo/sửa schema; giữ `ddl-auto: validate`.
- MySQL 8 / MariaDB tương thích theo schema đang sử dụng.
- JUnit 5 và Spring Boot Test cho kiểm thử; dùng thư viện kiểm thử hiện có trong repository.

### Frontend

- ReactJS + Vite.
- JavaScript theo cấu hình hiện có; không tự chuyển dự án sang TypeScript nếu chưa được yêu cầu.
- Dùng API client và router đã cài đặt trong repository. Không tự thêm thư viện chỉ để giải quyết một việc nhỏ nếu thư viện hiện có đáp ứng được.

### Database và file

- Tiền lưu bằng `BIGINT` theo đơn vị VND.
- Cột `DATE` ánh xạ thành `LocalDate`; `DATETIME` ánh xạ theo kiểu thời gian phù hợp (thường `LocalDateTime` theo quy ước DB hiện tại).
- Thời điểm lưu trong DB theo quy ước UTC của dự án; serialize API theo định dạng ISO-8601 đã thống nhất.
- File upload lưu trong thư mục vật lý `storage/uploads/`; DB lưu URL/đường dẫn tương đối, không lưu absolute path kiểu `D:\\...`.
- Schema MySQL hiện có là hợp đồng dữ liệu. Entity, Repository, truy vấn và DTO phải khớp tên bảng/cột, kiểu dữ liệu, enum, constraint, index và foreign key thực tế.

---

## 3. Cấu trúc thư mục và phân lớp

Giữ cấu trúc đang có của repository. Không tạo song song một kiến trúc mới nếu dự án đã có cấu trúc tương đương.

### 3.1. Backend

Package gốc dự kiến: `vn.edu.hust.homestay`.

Tổ chức theo module nghiệp vụ; trong từng module tách lớp theo trách nhiệm:

```text
homestay-backend/
└── src/
    ├── main/java/vn/edu/hust/homestay/
    │   ├── common/          # response, exception, pagination, helpers dùng chung
    │   ├── config/          # CORS, SecurityFilterChain, OpenAPI, static files
    │   ├── auth/            # register, login, refresh, logout, password reset
    │   ├── homestay/        # homestay và thông tin công khai/quản trị
    │   ├── room/            # room_types, rooms, tra cứu khả dụng
    │   ├── pricing/         # price_rules và yêu cầu phê duyệt giá
    │   ├── booking/         # bookings, booking_rooms, booking_room_nights
    │   ├── payment/         # DEPOSIT, PAYMENT, REFUND
    │   ├── service/         # service_categories, services, booking_services
    │   ├── expense/         # expense_categories, expenses, chứng từ chi phí
    │   ├── media/           # upload và metadata media
    │   ├── policy/          # policy_settings
    │   └── report/          # truy vấn và tổng hợp báo cáo
    └── test/java/...
```

Giữ cách chia package con đang dùng trong source: `controller`, `dto`, `entity`, `repository`, `service`. Một module có thể dùng DTO/mapper riêng khi cần; Entity chỉ ánh xạ persistence, không dùng làm request/response trực tiếp. Không tạo package/model trùng lặp hoặc tạo package rỗng trước khi có code.

### 3.2. Trách nhiệm từng lớp

- **Controller:** nhận HTTP request, bind DTO, gọi service, chọn HTTP status và trả response. Không chứa logic nghiệp vụ hoặc SQL trực tiếp.
- **Service:** điều phối nghiệp vụ, kiểm tra chuyển trạng thái, quyền sở hữu dữ liệu ở mức nghiệp vụ và transaction.
- **Repository:** Spring Data JPA Repository; khai báo truy vấn đọc/ghi dữ liệu. Không đặt quy trình nghiệp vụ nhiều bước trong repository.
- **Request DTO:** mô tả dữ liệu client được phép gửi vào.
- **Response DTO:** chỉ trả các trường API đã định nghĩa; không lộ trường nội bộ.
- **Entity:** ánh xạ bảng và quan hệ theo schema; không dùng làm API DTO.
- **Mapper:** ánh xạ Entity sang Response DTO (và ngược lại khi phù hợp); không tự thực hiện nghiệp vụ hoặc ghi DB.
- **Exception handler:** chuyển exception thành HTTP status và mã lỗi chuẩn.
- **Security:** xác thực token và áp đặt role; service vẫn phải kiểm tra phạm vi homestay/tài nguyên.

Luồng thông thường:

```text
HTTP -> Controller -> Request DTO validation -> Service -> Repository (JPA/Hibernate) -> MySQL
                               Service -> Response DTO -> API response
```

---

## 4. Quy ước đặt tên

### 4.1. Java

| Thành phần | Quy ước | Ví dụ |
|---|---|---|
| Class/record/interface | `PascalCase` | `BookingService`, `CreateBookingRequest` |
| Method/field/variable | `camelCase` | `calculateRoomTotal`, `checkOutDate` |
| Constant `static final` | `UPPER_SNAKE_CASE` | `MAX_PAGE_SIZE` |
| Enum type | `PascalCase` | `BookingStatus` |
| Enum value | `UPPER_SNAKE_CASE` | `PENDING_DEPOSIT` |
| Repository | hậu tố `Repository` | `BookingRepository` |
| DTO mapper | tên theo nhiệm vụ khi tách lớp | `BookingResponseMapper` |
| Projection/result DTO | tên nghiệp vụ rõ ràng, có thể dùng `record` | `BookingSummaryResponse` |
| Service | hậu tố `Service` | `BookingService` |
| Controller | hậu tố `Controller` | `BookingController` |
| Request DTO | hậu tố `Request` | `CreateExpenseRequest` |
| Response DTO | hậu tố `Response` | `BookingDetailResponse` |
| Custom exception | hậu tố `Exception` | `BookingStateConflictException` |

Dùng tên mô tả nghiệp vụ rõ nghĩa; tránh `data`, `obj`, `tmp`, `process1`, `handleThing` khi có thể đặt tên cụ thể hơn. Không viết tắt tùy ý; các từ viết tắt phổ biến như `DTO`, `API`, `URL`, `JWT` được chấp nhận.

### 4.2. SQL và JSON

- Table/column/index: `snake_case`, ví dụ `booking_room_nights`, `check_in_date`.
- JSON request/response: `camelCase`, ví dụ `checkInDate`, `nightlyPrice`, `hotlinePhone`.
- Java enum dùng cùng giá trị nghiệp vụ với DB khi ánh xạ string; không lưu ordinal của enum.
- Không dịch hoặc đổi tên giá trị enum DB tùy ý trong một endpoint. Nếu API cần tên khác, thực hiện mapping có chủ đích và ghi rõ.

### 4.3. React

- Component: `PascalCase`, ví dụ `BookingDetailPage.jsx`.
- Hook: `useCamelCase`, ví dụ `useBookings.js`.
- API module/function: tên theo tài nguyên và hành động, ví dụ `bookingApi.js`, `getMyBookings()`.
- Utility/constants: `camelCase` cho function/biến, `UPPER_SNAKE_CASE` cho hằng số.

---

## 5. Java formatting và chất lượng code

- UTF-8, newline LF trong file mã nguồn; Java dùng 4 spaces; JavaScript/JSX, CSS, JSON, YAML và SQL dùng 2 spaces theo `.editorconfig`. Không trộn tab và spaces.
- Mỗi file Java chỉ có một public top-level class, trừ khi có lý do rõ ràng.
- Dùng braces cho tất cả `if`, `else`, `for`, `while`; không viết điều kiện nghiệp vụ phức tạp trên một dòng.
- Giữ method ngắn và có một trách nhiệm. Tách method private khi nó đặt tên được một bước nghiệp vụ có ý nghĩa.
- Ưu tiên `final` cho biến local chỉ gán một lần nếu giúp code dễ đọc; không biến code thành rườm rà chỉ để thêm `final`.
- Không để magic number/string trong logic. Dùng enum/constant hoặc lấy từ `policy_settings` nếu đó là chính sách có thể cấu hình.
- Không tạo `catch (Exception)` để bỏ qua lỗi. Chỉ bắt exception khi có thể xử lý hoặc bổ sung ngữ cảnh hữu ích; nếu không, để global handler xử lý.
- Không dùng `System.out.println` cho logging backend. Dùng logger của framework.
- Không để code chết, import thừa, TODO không có lý do hoặc comment mô tả điều hiển nhiên.
- Comment tập trung giải thích **vì sao** quy tắc tồn tại, các giới hạn DB hoặc quyết định khó thấy; không chép lại nguyên dòng code.
- Không thêm Lombok chỉ để giảm vài dòng boilerplate nếu repository chưa sử dụng. Ưu tiên Java `record` cho model kết quả đọc bất biến khi phù hợp.

---

## 6. Quy ước REST API

### 6.1. Định tuyến và HTTP

- API dùng prefix `/api/v1`.
- Dùng danh từ số nhiều cho collection và ID ở path, ví dụ `/manager/bookings/{bookingId}`.
- GET: đọc dữ liệu, không làm thay đổi trạng thái.
- POST: tạo tài nguyên hoặc yêu cầu một hành động nghiệp vụ rõ ràng như `/cancel`, `/approve`, `/reject`.
- PATCH: cập nhật một phần tài nguyên.
- PUT: thay thế/cập nhật toàn bộ cấu hình/tài nguyên theo API contract.
- DELETE: xóa hoặc hủy tài nguyên theo nghĩa đã được nghiệp vụ chốt; không dùng DELETE để lén chuyển state nếu contract quy định action endpoint.
- Không nhận `userId`, `role`, `confirmedBy`, `approvedBy` hoặc `homestayId` từ client làm căn cứ phân quyền. Giá trị này phải được lấy hoặc kiểm tra bằng security principal và dữ liệu server.

### 6.2. Response thống nhất

Dùng envelope theo API contract hiện hành:

```json
{
  "success": true,
  "data": {},
  "meta": null
}
```

Danh sách có phân trang phải theo response cụ thể của endpoint trong API contract. Có thể đặt `items` và số liệu phân trang trong object `data` như `PagedResult`, hoặc trong `meta` nếu contract yêu cầu; không tự đổi cấu trúc giữa các endpoint.

Response lỗi:

```json
{
  "success": false,
  "error": {
    "code": "ROOM_NOT_AVAILABLE",
    "message": "Phòng không còn khả dụng trong khoảng thời gian đã chọn.",
    "details": []
  },
  "timestamp": "2026-10-17T08:20:00+07:00",
  "path": "/api/v1/customer/bookings"
}
```

- `error.code` ổn định, không dùng nguyên chuỗi exception làm code.
- Message rõ ràng, không lộ SQL, stack trace, token, password hash hoặc bí mật nội bộ.
- Dùng status phù hợp: 400 validation, 401 chưa xác thực, 403 sai quyền/phạm vi, 404 không tồn tại, 409 xung đột trạng thái/tài nguyên, 413 file quá lớn, 415 loại file không hỗ trợ, 500 lỗi không dự kiến.
- Health check khi database không khả dụng chỉ trả trạng thái chung (`DOWN`) và HTTP 503; ghi exception chi tiết vào log server, không đưa nội dung exception vào response.

### 6.3. DTO validation

- Request DTO dùng annotation như `@NotNull`, `@NotBlank`, `@Size`, `@Min`, `@Max`, `@Email`, `@Valid` khi thích hợp.
- Kiểm tra nghiệp vụ vẫn phải nằm trong service. Frontend validation không phải ranh giới bảo mật.
- Chỉ nhận các trường client được quyền thay đổi. Không bind trực tiếp request vào object đọc/ghi DB để tránh mass assignment.
- API phân trang: `page` bắt đầu từ 0, `size` mặc định 20, tối đa 100, trừ khi contract cụ thể đã quy định khác.
- Tiền trong JSON là số nguyên VND; không dùng `float`, `double` hoặc số thập phân cho tiền.
- Ngày là `YYYY-MM-DD`; timestamp là ISO-8601 theo serializer của dự án.

### 6.4. Mã lỗi nghiệp vụ

Dùng mã dễ hiểu, ổn định, ví dụ:

- `ROOM_NOT_AVAILABLE`
- `BOOKING_STATE_CONFLICT`
- `BOOKING_NOT_OWNED`
- `HOMESTAY_SCOPE_VIOLATION`
- `DEPOSIT_AMOUNT_INVALID`
- `PAYMENT_ALREADY_REVIEWED`
- `PRICE_CHANGE_REQUEST_NOT_PENDING`
- `PRICE_RULE_CONFLICT`
- `OUTSTANDING_BALANCE`
- `EXPENSE_CATEGORY_NOT_FOUND`

Nếu lỗi tương ứng đã tồn tại trong dự án thì tái sử dụng; không tạo mã mới có nghĩa trùng mã cũ.

---

## 7. Quy ước JPA, Repository và database

### 7.1. Database là hợp đồng

- Schema MySQL/migration đang thực sự áp dụng là nguồn sự thật cho tên bảng/cột, kiểu dữ liệu, nullability, enum, unique key, index, constraint và khóa ngoại.
- Dùng JPA/Hibernate để ánh xạ Entity; `ddl-auto` phải là `validate`, không dùng `create`, `create-drop` hoặc `update`.
- Thay đổi schema phải được yêu cầu riêng và đi kèm migration có thể review. Không tự chạy script phá hủy dữ liệu.
- Khi gặp lỗi mapping/truy vấn, đối chiếu Entity, repository, schema SQL và schema thực tế; không “chữa cháy” bằng cách tự đổi database.

### 7.2. Entity và Spring Data Repository

- Entity khai báo rõ `@Table`, `@Column`, `@Enumerated(EnumType.STRING)` và kiểu/precision cần thiết để khớp schema. Không dùng enum ordinal.
- Khai báo quan hệ JPA (`@ManyToOne`, v.v.) khi có lợi cho module; dùng fetch strategy có chủ đích, tránh eager graph/N+1. FK/composite key phức tạp có thể được biểu diễn bằng scalar IDs và repository query như các module hiện tại.
- Không ánh xạ generated columns để ghi; nếu cần đọc, đặt `insertable = false, updatable = false`.
- Dùng `Optional<T>` cho finder đơn; collection query trả list rỗng, không trả `null`.
- Dùng derived query cho truy vấn đơn giản; `@Query` JPQL hoặc native SQL cho truy vấn phức tạp khi cần. Bind tham số, whitelist sort động, tránh nối chuỗi đầu vào vào SQL.
- Dùng projection/DTO query cho danh sách/report chỉ cần một phần cột; tránh tải entity graph lớn hoặc trả Entity trực tiếp qua API.
- Với update/delete, xác nhận số bản ghi/điều kiện trạng thái khi cần bảo đảm tài nguyên còn đúng scope và state.
- Lỗi unique/FK phải được chuyển thành lỗi API có mã phù hợp; không trả SQL/stack trace cho client.
- Mọi truy vấn dữ liệu Manager phải scope theo `homestay_id` lấy từ principal. Truy vấn Customer phải giới hạn quyền sở hữu ở chính tài khoản hiện tại.

### 7.3. Quy tắc truy vấn và hiệu năng

- Tên bảng/cột phải dùng `snake_case` khớp schema; Java field dùng `camelCase` và chỉ rõ `@Column(name = "...")` khi tên không được map chắc chắn.
- Dùng index hiện có để thiết kế bộ lọc; nếu truy vấn mới cho thấy cần index, đề xuất riêng thay vì tự sửa schema.
- Không truy vấn từng dòng trong vòng lặp nếu có thể giải quyết bằng một truy vấn phù hợp; tránh N+1 theo nghĩa truy vấn lặp không cần thiết.
- Với báo cáo, tổng hợp ở SQL bằng `SUM`, `COUNT`, `GROUP BY` khi phù hợp để chỉ trả về dữ liệu tổng hợp cần thiết. Không tải toàn bộ bảng vào Java rồi tự cộng nếu database có thể làm hiệu quả.
- Với truy vấn phân trang, dùng `ORDER BY` ổn định và parameter hóa `LIMIT/OFFSET` theo cách driver/DB hỗ trợ. Với dữ liệu lớn, cân nhắc chiến lược phân trang phù hợp nhưng không tự đổi API contract.
- Kiểm tra execution plan (`EXPLAIN`) khi truy vấn chậm hoặc quét dữ liệu lớn; không mặc định SQL viết tay luôn nhanh hơn.
- Tránh phụ thuộc cú pháp riêng MySQL/MariaDB nếu không cần; nếu dùng tính năng đặc thù, ghi chú và kiểm thử trên đúng DB mục tiêu.

### 7.4. Ánh xạ dữ liệu và transaction

- Dùng `LocalDate` cho SQL `DATE`; dùng kiểu thời gian tương ứng với quy ước UTC của dự án cho `DATETIME` và serialize theo API contract.
- Đọc enum từ chuỗi DB một cách tường minh; khi giá trị DB không hợp lệ, báo lỗi có ngữ cảnh, không tự đổi sang enum mặc định.
- Dùng `@Transactional` ở Service cho quy trình cập nhật nhiều bảng. Repository tham gia transaction Spring; không tự quản lý commit/rollback trong từng repository.
- Không mở transaction lâu trong lúc chờ người dùng, upload file dài hoặc gọi dịch vụ ngoài.
- Nếu cần khóa hàng, dùng SQL rõ ràng như `SELECT ... FOR UPDATE` trong transaction và trên DB mục tiêu; phải có test cho tình huống cạnh tranh khi xử lý đặt phòng hoặc phê duyệt.

---

## 8. Phân quyền cố định theo nghiệp vụ

| Role | Phạm vi được phép |
|---|---|
| `PUBLIC` | Xem homestay, phòng, giá báo và dịch vụ công khai; không xem dữ liệu cá nhân hoặc thao tác booking của người khác. |
| `CUSTOMER` | Quản lý profile và chỉ đọc/sửa booking, dịch vụ thuộc chính mình theo chính sách. |
| `MANAGER` | Vận hành đúng homestay gán trong `users.homestay_id`: phòng, booking, lưu trú, dịch vụ, DEPOSIT/REFUND, chi phí và báo cáo cơ sở; gửi đề xuất thay đổi giá. |
| `ADMIN` | Chỉ tạo tài khoản nội bộ và khóa/mở tài khoản theo nghiệp vụ hiện hành. Không quản lý homestay, chính sách hoặc duyệt giá. |
| `DIRECTOR` | Quản lý homestay, gán/gỡ Manager, cập nhật chính sách toàn công ty, phê duyệt/từ chối yêu cầu giá, xem báo cáo toàn công ty. |

Quy tắc thực thi:

- Cấu hình quyền ở Spring Security endpoint/matcher và kiểm tra quyền dữ liệu trong service.
- Với Manager, lấy `homestay_id` từ tài khoản đã xác thực; mỗi query phải giới hạn về homestay đó.
- Customer chỉ được truy cập booking khi `booking.customer_id` khớp tài khoản hiện tại. Booking do Manager tạo hộ có `customer_id = null`; dữ liệu liên hệ nằm ở `bookings.contact_*`.
- Không tin `role`, `createdBy`, `requestedBy`, `reviewedBy`, `confirmedBy`, `approvedBy` do client gửi. Lấy ID actor từ principal ở backend.
- Ẩn hoặc bỏ dữ liệu nhạy cảm trong response; không trả hash password, refresh token hash hay reset token hash.

---

## 9. Quy tắc nghiệp vụ không được vi phạm

### 9.1. Homestay và phòng

- `homestays.hotline_phone` là hotline của homestay, độc lập với số điện thoại Manager.
- Trạng thái homestay: `ACTIVE`, `INACTIVE`.
- Trạng thái phòng: `ACTIVE`, `LOCKED`, `INACTIVE`; “trống/đang có khách” được suy ra từ booking đêm, không lưu thành trạng thái tĩnh trong `rooms`.
- Loại phòng phải thuộc cùng homestay với phòng tham chiếu.

### 9.2. Ngày ở và chính sách nhận/trả phòng

- Booking chỉ có `check_in_date` và `check_out_date`; không có `checkInSlot`, `checkOutSlot` hoặc mô hình MORNING/AFTERNOON/NIGHT.
- `check_out_date` phải sau `check_in_date`.
- Đêm tính tiền và chiếm phòng theo khoảng **[check_in_date, check_out_date)**: gồm ngày nhận, không gồm ngày trả.
- Ví dụ nhận 10/10, trả 12/10: tạo hai dòng đêm 10/10 và 11/10. Không tạo đêm 12/10.
- Chính sách hiện tại theo xác nhận mới nhất: nhận phòng từ 11:00 trở đi; trả phòng không muộn hơn 08:00 (08:00 được tính là mốc cuối hợp lệ). Đọc từ `policy_settings` theo contract, không hard-code chính sách cấu hình được.
- Không lưu `checked_in_at` hoặc `checked_out_at` trong `bookings` theo schema hiện tại.

### 9.3. Giữ đêm và chống đặt trùng

- `booking_room_nights` vừa là sổ giữ phòng vừa là snapshot giá một đêm.
- `PRIMARY KEY (room_id, stay_date)` ngăn hai booking chiếm cùng phòng trong cùng đêm.
- Các booking `PENDING_DEPOSIT` và `PENDING_APPROVAL` vẫn giữ đêm để chống overbooking.
- Tạo/điều chỉnh booking phải kiểm tra và cập nhật `bookings`, `booking_rooms`, `booking_room_nights` trong một transaction.
- Hủy hoặc hết hạn phải giải phóng các dòng `booking_room_nights` trong transaction; giữ booking và số tiền lịch sử.
- Giá gửi lên từ client chỉ mang tính tham khảo. Backend phải tính lại bằng quy tắc giá đang được duyệt; không nhận `roomTotalPrice` từ client làm nguồn chính thức.
- Dùng khóa/kiểm soát cạnh tranh phù hợp. Nếu duplicate key thể hiện đêm vừa bị booking khác chiếm, trả 409 `ROOM_NOT_AVAILABLE`, không trả 500.

### 9.4. Quy tắc giá và duyệt Director

- Giá `BASE` là giá cho một đêm trên từng phòng; `ADJUSTMENT` có thể áp dụng toàn homestay hoặc phòng cụ thể.
- `PERCENT` là phần trăm thay đổi so với giá BASE; `FIXED_PRICE` là giá cuối cùng cho đêm đó, không phải khoản cộng thêm.
- Chọn quy tắc điều chỉnh hợp lệ có `priority` cao nhất; khi bằng priority, áp dụng quy tắc theo phòng cụ thể theo nghiệp vụ đã chốt.
- **Manager không trực tiếp sửa quy tắc giá đang áp dụng.** Yêu cầu `CREATE`, `UPDATE`, `DEACTIVATE` được ghi vào `price_rule_change_requests` với `PENDING_APPROVAL`.
- `proposed_rule` chưa được duyệt không được dùng để tính báo giá hay booking.
- Chỉ Director được duyệt/từ chối. Duyệt phải trong một transaction: khóa yêu cầu, xác minh trạng thái, validate đề xuất, cập nhật `price_rules`, lưu `APPROVED`/reviewer/time. Từ chối lưu `REJECTED`, người duyệt, thời gian và lý do; giá đang áp dụng không đổi.
- Nếu transaction duyệt thất bại, cả thay đổi quy tắc và trạng thái yêu cầu phải rollback.
- Không được vô hiệu giá BASE duy nhất đang dùng nếu không đảm bảo phòng còn giá BASE hợp lệ đã duyệt.
- Không thay đổi snapshot giá của booking đã tạo khi giá hiện hành thay đổi.

### 9.5. Vòng đời booking

Các trạng thái hiện hành:

- `PENDING_DEPOSIT`: đang chờ khách nộp cọc hoặc cần nộp bổ sung.
- `PENDING_APPROVAL`: khách đã gửi chứng từ/thông tin giao dịch, đang chờ Manager xác minh; chưa phải booking chính thức.
- `CONFIRMED`: khoản cọc đã xác minh đủ và Manager đã duyệt.
- `CHECKED_IN`: khách đã nhận phòng.
- `CHECKED_OUT`: đã hoàn tất trả phòng và điều kiện quyết toán.
- `CANCELLED`: đã hủy.
- `EXPIRED`: đã hết thời gian giữ chỗ theo chính sách.

Không thực hiện update trạng thái tự do. Mỗi chuyển trạng thái phải có điều kiện trước/sau rõ ràng, có kiểm soát concurrency và test. `PENDING_APPROVAL` không được tự hết hạn trong lúc chờ Manager xử lý; `hold_hours` áp dụng cho giai đoạn chờ khách nộp cọc theo nghiệp vụ đã chốt.

### 9.6. Đặt cọc, hoàn tiền và check-out

- Payment status: `PENDING`, `CONFIRMED`, `REJECTED`; type: `DEPOSIT`, `PAYMENT`, `REFUND`.
- Khi khách nộp chứng từ chuyển khoản, tạo `DEPOSIT/PENDING` và booking `PENDING_APPROVAL`.
- Khi Manager xác minh đặt cọc, xác nhận payment và cập nhật trạng thái/approval của booking trong cùng transaction.
- Nếu tổng DEPOSIT đã xác nhận chưa đủ, booking vẫn `PENDING_DEPOSIT`; nếu đủ và Manager duyệt, chuyển `CONFIRMED`.
- Nếu payment bị từ chối, booking về `PENDING_DEPOSIT` nếu vẫn còn hạn giữ, nếu hết hạn thì `EXPIRED` và giải phóng đêm.
- Hủy booking hợp lệ: trong cùng transaction tính `refund_amount`, lưu booking `CANCELLED`, giải phóng đêm và tạo `REFUND/PENDING` nếu số tiền hoàn > 0.
- Chỉ chuyển `REFUND` sang `CONFIRMED` sau khi Manager xác nhận đã hoàn tiền thực tế; không cho nhập số tiền hoàn tùy ý trái `refund_amount` đã tính.
- MGR-06 chỉ phụ trách DEPOSIT/REFUND. Khoản `PAYMENT` thu phần tiền còn thiếu được ghi nhận trong luồng check-out MGR-04, không chuyển sang endpoint quản lý đặt cọc/hoàn tiền.
- Số dư cần quyết toán = tổng tiền phòng + tổng tiền dịch vụ `USED` − tổng DEPOSIT/PAYMENT đã `CONFIRMED` + tổng REFUND đã `CONFIRMED`.
- Booking chỉ `CHECKED_OUT` khi các dịch vụ đã được phân loại, số dư đã được xử lý và không còn điều kiện quyết toán chưa hoàn tất theo contract.

### 9.7. Dịch vụ

- Giá dịch vụ hiện hành nằm trong `services.unit_price`; không áp dụng `price_rules` lên giá dịch vụ.
- Khi đăng ký, snapshot `unit_price` vào `booking_services`; đổi giá dịch vụ sau đó không sửa lịch sử.
- `REGISTERED`: đã đăng ký; `USED`: Manager xác nhận đã sử dụng; `CANCELLED`: không tính tiền.
- Chỉ `USED` được cộng vào tổng tiền checkout.
- `booking_services` gắn với một booking và một phòng cụ thể trong booking. Xác minh phòng, dịch vụ và homestay cùng phạm vi.

### 9.8. Chi phí, media và chứng từ

- `expenses` lưu số tiền và dữ liệu nghiệp vụ gồm danh mục, ngày chi, nhà cung cấp, loại/số/ngày chứng từ, mã giao dịch, phương thức thanh toán và `proof_url` theo schema.
- Chứng từ đặt cọc lưu tại `payments.proof_url`; chứng từ chi phí lưu tại `expenses.proof_url`.
- Bảng `media` chỉ chứa hình ảnh/video giới thiệu homestay, phòng hoặc dịch vụ; không tạo media record cho hóa đơn/biên lai thanh toán.
- Kiểm tra MIME type, phần mở rộng, kích thước, quyền truy cập và tên file được sinh phía server. Không dùng tên file do client cung cấp làm đường dẫn vật lý.
- Không trả đường dẫn hệ thống file tuyệt đối. Chỉ trả URL do ứng dụng quản lý.

### 9.9. Báo cáo

- Doanh thu báo cáo dựa vào payment `CONFIRMED` và hoàn tiền đã xác nhận, theo định nghĩa trong view/API hiện hành.
- Chi phí lấy từ `expenses` theo `expense_date`; không lấy khoản chưa lưu hoặc cộng trùng chứng từ.
- Lợi nhuận theo quy ước hiện tại = doanh thu ròng − chi phí vận hành.
- Công suất theo đêm: đếm `booking_room_nights` thuộc booking `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, chia cho sức chứa phòng ACTIVE × số đêm của kỳ. Không tính `PENDING_DEPOSIT`/`PENDING_APPROVAL` vào công suất báo cáo nhưng chúng vẫn khóa phòng.
- Schema hiện chưa có lịch bảo trì riêng từng đêm; không giả vờ đã trừ các đêm bảo trì riêng khỏi mẫu số.
- Manager chỉ xem homestay được gán. Director xem toàn công ty và được lọc theo homestay/khoảng thời gian theo API contract.

---

## 10. Quy tắc transaction và concurrency

Dùng `@Transactional` ở lớp service cho nghiệp vụ thay đổi nhiều bảng. Controller không điều phối transaction.

Các trường hợp bắt buộc phải atomic:

1. Tạo booking + booking_rooms + booking_room_nights + snapshot giá.
2. Điều chỉnh booking + tái tính giá/cọc + thay đổi các đêm đã giữ.
3. Xác minh DEPOSIT + cập nhật payment + trạng thái/approval của booking.
4. Hủy booking + refund_amount + CANCELLED + giải phóng đêm + tạo REFUND/PENDING nếu có.
5. Director duyệt yêu cầu giá + áp dụng quy tắc vào `price_rules` + cập nhật request.
6. Check-out: chốt dịch vụ USED/CANCELLED, tính số dư, tạo khoản PAYMENT còn thiếu (nếu có) và chuyển CHECKED_OUT khi điều kiện quyết toán đã đạt.

Quy tắc bổ sung:

- Dùng isolation/lock phù hợp để tránh hai request cùng giữ một đêm/phòng.
- Có thể dùng `SELECT ... FOR UPDATE` ở điểm cần serialize hoặc optimistic locking bằng `version`, theo kiến trúc hiện có.
- Không giữ transaction mở trong lúc chờ người dùng, upload file lâu hoặc gọi dịch vụ ngoài.
- Khi transaction rollback, không trả response thành công.
- API duyệt yêu cầu đã được duyệt/từ chối trước đó phải trả conflict, không áp dụng lại lần hai.

---

## 11. Logging, cấu hình và bảo mật

- Dùng biến môi trường hoặc cấu hình local không được commit để chứa DB password, JWT secret và thông tin nhạy cảm.
- Cung cấp `.env.example` hoặc ví dụ cấu hình với placeholder; không điền thông tin thật.
- Không log password, access/refresh token, reset token, chứng từ nhạy cảm hoặc toàn bộ thông tin cá nhân nếu không cần.
- Với health check hoặc lỗi kết nối database, response chỉ chứa trạng thái tổng quát; chi tiết exception ghi trong log backend để chẩn đoán.
- Log theo mức phù hợp: INFO cho nghiệp vụ quan trọng, WARN cho từ chối do điều kiện nghiệp vụ, ERROR cho lỗi bất thường. Không log cùng một exception ở mọi tầng gây trùng log.
- Log nên có request/correlation ID nếu dự án đã hỗ trợ, actor ID và resource ID khi an toàn; không ghi bí mật.
- CORS chỉ cho origin cần thiết; không dùng `*` cùng credentials trong môi trường có xác thực.
- File riêng tư không được phục vụ công khai chỉ bằng đường dẫn đoán được nếu đó là chứng từ thanh toán/chi phí.

---

## 12. Quy ước frontend ReactJS

### 12.1. Cấu trúc

Giữ cấu trúc đã có. Có thể dùng cấu trúc theo feature:

```text
frontend/src/
├── app/            # bootstrap ứng dụng
├── routes/         # route và guard
├── layouts/        # layout dùng chung theo role
├── components/     # component dùng chung
├── api/            # axios/fetch client, xử lý envelope/error
├── contexts/       # auth/session nếu cần
├── hooks/          # custom hooks dùng lại
├── utils/          # helper thuần
├── constants/      # enum/constants frontend
└── features/
    ├── auth/
    ├── homestays/
    ├── rooms/
    ├── pricing/
    ├── bookings/
    ├── services/
    ├── payments/
    ├── expenses/
    ├── reports/
    ├── users/
    └── policies/
```

### 12.2. React components

- Một component/page chính mỗi file; component dùng PascalCase.
- Component tập trung hiển thị và tương tác UI; không viết business rule phức tạp trong JSX.
- Tách API call sang module trong `api/` hoặc API module của feature; tránh gọi `fetch`/Axios trực tiếp ở nhiều component.
- Dùng state loading, success, empty và error rõ ràng cho màn hình phụ thuộc API.
- Dùng controlled inputs cho form có trạng thái; validate phía frontend để UX tốt nhưng backend vẫn là nguồn xác thực cuối cùng.
- Tránh lặp markup lớn; tách component khi có ý nghĩa hoặc thật sự được dùng lại.
- Không lưu dữ liệu xác thực nhạy cảm theo cách mới nếu chưa thống nhất mô hình token/session của dự án.

### 12.3. API client

- Một nơi cấu hình `baseURL`, Authorization header, timeout và xử lý response/error.
- Chuẩn hóa việc đọc `success/data/meta` và mã lỗi; không để mỗi page tự parse theo kiểu khác nhau.
- Không hiển thị stack trace hoặc raw server exception cho người dùng.
- Không gọi API hai lần do effect phụ thuộc sai; xử lý hủy request/race condition khi phù hợp.
- Guard phía frontend chỉ phục vụ UX; backend luôn enforce role và resource scope.

### 12.4. Form và tiền

- Tiền phải hiển thị theo VND, nhưng dữ liệu gửi API là số nguyên.
- Ngày dùng định dạng `YYYY-MM-DD` trong API; chỉ format cho hiển thị ở UI.
- Với booking, UI chỉ cho chọn ngày nhận < ngày trả; backend xác thực lại và trả ngày/giá đã tính phía server.
- Không tính giá cuối cùng bằng tổng số liệu do frontend tự gửi. Có thể hiển thị báo giá nhưng khi tạo/sửa booking phải dùng kết quả server.

---

## 13. Kiểm thử bắt buộc

### 13.1. Backend

Mỗi API mới/sửa phải có kiểm thử phù hợp. Tối thiểu xem xét:

- Happy path.
- Request sai định dạng/thiếu trường.
- Chưa đăng nhập hoặc sai role.
- Truy cập tài nguyên thuộc homestay khác / booking của Customer khác.
- Trạng thái nghiệp vụ không hợp lệ.
- Cạnh tranh dữ liệu nếu liên quan booking hoặc phê duyệt.
- Rollback transaction khi một bước giữa luồng thất bại.
- Dữ liệu biên: ngày check-in/out, amount, quantity, trạng thái trước/sau.

### 13.2. Các test nghiệp vụ trọng yếu

1. Booking 10/10–12/10 tạo đúng hai `booking_room_nights`: 10/10 và 11/10.
2. Hai booking cùng phòng, cùng `stay_date` không thể cùng thành công.
3. `PENDING_DEPOSIT` và `PENDING_APPROVAL` vẫn chặn phòng trùng.
4. Giá báo/booking không dùng yêu cầu giá `PENDING_APPROVAL` hoặc `REJECTED`.
5. Manager không thể trực tiếp sửa giá đang áp dụng; Director mới được approve/reject.
6. Từ chối yêu cầu giá không làm thay đổi giá hiện hành.
7. Xác nhận DEPOSIT và booking phải atomic; partial deposit không tự chuyển booking sang `CONFIRMED`.
8. REFUND chỉ thành `CONFIRMED` sau khi xác nhận đã hoàn tiền thực tế.
9. Chỉ dịch vụ `USED` đi vào tổng tiền checkout.
10. PAYMENT phần còn thiếu được xử lý trong luồng check-out; MGR-06 không nhận việc thu khoản này như một thao tác đặt cọc.
11. Manager không đọc/sửa dữ liệu ở homestay khác.
12. Admin không truy cập API quản lý homestay, chính sách hoặc phê duyệt giá.
13. Director có thể quản lý homestay/policy, duyệt giá và xem báo cáo toàn công ty.
14. Báo cáo không cộng trùng payment/expense; filter theo ngày và homestay đúng.
15. Upload chứng từ dùng `payments.proof_url` hoặc `expenses.proof_url`, không tạo `media` record.

### 13.3. Frontend

- Kiểm tra loading/empty/error và dữ liệu thực từ API.
- Kiểm tra form lỗi, submit nhiều lần, refresh trang và quyền truy cập.
- Kiểm tra UI không hiển thị chức năng người dùng không được phép; không coi điều này thay thế backend security.

---

## 14. Git và review

### Branch

Đặt tên theo dạng:

- `feature/booking-create`
- `feature/price-approval`
- `fix/checkout-balance`
- `test/booking-night-conflict`

### Commit

Dùng tiền tố nhất quán:

- `feat: add booking creation API`
- `fix: prevent duplicate room nights`
- `test: cover director price approval`
- `docs: update API contract`
- `refactor: extract booking price calculator`

Mỗi commit nên là một thay đổi logic nhỏ, không gom format toàn dự án với sửa nghiệp vụ nếu không cần thiết.

### Pull request/review checklist

- [ ] Phạm vi đúng yêu cầu; không đổi nghiệp vụ/schema ngoài yêu cầu.
- [ ] API contract và quyền đã đối chiếu tài liệu.
- [ ] Manager scope/Customer ownership được kiểm tra phía server.
- [ ] Transaction/concurrency được xử lý khi cần.
- [ ] Không trả model nội bộ không phù hợp hoặc dữ liệu nhạy cảm.
- [ ] Có test cho nhánh lỗi và state transition.
- [ ] Build/test đã chạy và báo kết quả trung thực.
- [ ] Không có secret, log nhạy cảm, dependency thừa hoặc file sinh ra không cần thiết.
- [ ] Tài liệu liên quan được cập nhật nếu thay đổi hợp đồng API.

---

## 15. Definition of Done cho từng API

Chỉ coi một API hoàn thành khi đáp ứng tất cả mục phù hợp:

1. Method/path/role/request/response và mã lỗi khớp tài liệu API.
2. Có Request DTO/Response DTO; không bind request trực tiếp vào model persistence và không trả model nội bộ khi chưa được kiểm soát.
3. Validation ở biên API và validation nghiệp vụ ở service.
4. Có kiểm tra role, ownership và scope dữ liệu phía backend.
5. Entity, repository query và DTO khớp schema MySQL thực tế.
6. Transaction/concurrency đúng với quy trình nghiệp vụ.
7. Test cho luồng thành công, lỗi xác thực/phân quyền, validation và lỗi nghiệp vụ.
8. Build/test đã chạy nếu môi trường hỗ trợ; kết quả được nêu rõ.
9. Không sửa file ngoài phạm vi cần thiết.
10. Các thay đổi cần thiết tới API docs/README/skill được đề xuất hoặc cập nhật theo yêu cầu.

---

## 16. Mẫu yêu cầu giao việc cho coding agent

Dùng mẫu sau khi giao một API:

```text
Hãy triển khai API: [METHOD] [PATH] — [mục tiêu nghiệp vụ].

Trước khi code:
1. Đọc CODING_CONVENTION.md.
2. Đọc các SKILL.md liên quan.
3. Đối chiếu tài liệu API và schema MySQL hiện tại.
4. Báo các điểm mâu thuẫn trước khi tự thay đổi thiết kế.

Yêu cầu:
- Chỉ sửa phạm vi API/module được giao.
- Không tự thay đổi nghiệp vụ, schema, dependency hoặc endpoint ngoài yêu cầu.
- Tuân thủ role, ownership, transaction và state transition của dự án.
- Viết test phù hợp, chạy build/test nếu môi trường cho phép.
- Cuối cùng liệt kê file đã sửa, hành vi API, test đã chạy và phần chưa xác minh.
```

**Nguyên tắc cuối:** nếu không chắc một hành vi đã thuộc nghiệp vụ chốt hay chưa, agent phải nêu câu hỏi hoặc giả định rõ ràng trước khi code; không được biến giả định thành quy tắc của hệ thống.
