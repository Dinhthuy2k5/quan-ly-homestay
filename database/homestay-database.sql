-- =====================================================================
-- HỆ THỐNG QUẢN LÝ VẬN HÀNH HOMESTAY — schema MySQL 8 / MariaDB 10.6+ (v6 - giá theo đêm, nhận phòng từ 11:00, trả phòng trước 08:00)
-- Quy ước: tiền = BIGINT (đồng VND); ngày ở = DATE; giờ hệ thống = UTC
-- Tên cột tiền: *_price (đơn giá/tổng giá), *_amount (số tiền giao dịch)
-- =====================================================================
SET NAMES utf8mb4;
CREATE DATABASE IF NOT EXISTS homestayv4
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE homestayv4;
-- ---------------------------------------------------------------------
-- 1. HOMESTAY & NGƯỜI DÙNG
-- ---------------------------------------------------------------------
-- hotline_phone là số điện thoại liên hệ công khai của chính homestay; không phụ thuộc số điện thoại Manager.
CREATE TABLE homestays (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  province    VARCHAR(100) NOT NULL,
  address     VARCHAR(255) NOT NULL,
  hotline_phone VARCHAR(20) NOT NULL,
  description TEXT,
  status      ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',   -- DIR-03.2
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_homestays_name (province, name)
) ENGINE=InnoDB;
-- 4 vai trò cố định => ENUM, không cần bảng role/permission.
-- Mỗi Manager phụ trách đúng 1 homestay => users.homestay_id (DIR-03.3 gán/gỡ = set/NULL).
-- Khách đặt online cần tài khoản. Khách vãng lai do Manager đặt hộ không cần users row:
-- customer_id = NULL và thông tin liên hệ được chụp vào bookings.contact_* tại thời điểm đặt.
CREATE TABLE users (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  phone         VARCHAR(20)  NULL,
  role          ENUM('CUSTOMER','MANAGER','ADMIN','DIRECTOR') NOT NULL,
  status        ENUM('ACTIVE','LOCKED') NOT NULL DEFAULT 'ACTIVE',
  homestay_id   BIGINT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_homestay (homestay_id),   -- thay cho KEY idx_users_homestay
  KEY idx_users_phone (phone),
  CONSTRAINT fk_users_homestay FOREIGN KEY (homestay_id) REFERENCES homestays(id),
  CONSTRAINT ck_users_manager_homestay CHECK (role = 'MANAGER' OR homestay_id IS NULL),
  CONSTRAINT ck_users_customer_phone   CHECK (role <> 'CUSTOMER' OR phone IS NOT NULL),
  CONSTRAINT ck_users_manager_phone    CHECK (role <> 'MANAGER' OR phone IS NOT NULL)
) ENGINE=InnoDB;
-- ---------------------------------------------------------------------
-- 2. PHÒNG
-- ---------------------------------------------------------------------
CREATE TABLE room_types (                       -- danh mục do Manager quản lý (mục 5)
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  homestay_id BIGINT NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  UNIQUE KEY uq_room_types_name (homestay_id, name),
  UNIQUE KEY uq_room_types_id_hs (id, homestay_id),   -- để rooms tham chiếu cùng homestay
  CONSTRAINT fk_room_types_hs FOREIGN KEY (homestay_id) REFERENCES homestays(id)
) ENGINE=InnoDB;
-- name = tên/số phòng hiển thị ("Phòng 101"), duy nhất trong homestay. id chỉ dùng nội bộ.
-- Giá, khóa/mở, ngừng sử dụng đều nằm trong thông tin phòng (MGR-02).
-- "Trống / đang ở" KHÔNG lưu: suy ra từ booking_room_nights.
CREATE TABLE rooms (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  homestay_id BIGINT NOT NULL,
  room_type_id BIGINT NOT NULL,
  name        VARCHAR(100) NOT NULL,              -- tên/số phòng hiển thị, ví dụ "Phòng 101"
  description TEXT,
  max_guests  TINYINT UNSIGNED NOT NULL,
  amenities   JSON NULL,                           -- ["Wifi","Điều hòa",...]
  status      ENUM('ACTIVE','LOCKED','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
              -- ACTIVE: nhận đặt | LOCKED: tạm khóa | INACTIVE: ngừng khai thác
  status_reason VARCHAR(255) NULL,                 -- lý do gần nhất khi Manager đổi trạng thái
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_rooms_name (homestay_id, name),
  UNIQUE KEY uq_rooms_id_hs (id, homestay_id),
  CONSTRAINT fk_rooms_type FOREIGN KEY (room_type_id, homestay_id)
    REFERENCES room_types(id, homestay_id),
  CONSTRAINT ck_rooms_guests CHECK (max_guests > 0)
) ENGINE=InnoDB;
-- Media chỉ dùng cho nội dung giới thiệu của homestay, phòng và dịch vụ.
-- owner_type + owner_id là tham chiếu đa hình, nên ứng dụng phải xác thực owner_type/owner_id/homestay_id.
-- mime_type là MIME type chi tiết (vd image/jpeg, video/mp4).
-- Chứng từ thanh toán không nằm ở đây; dùng payments.proof_url.
CREATE TABLE media (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  homestay_id BIGINT NOT NULL,
  owner_type  ENUM('HOMESTAY','ROOM','SERVICE') NOT NULL,
  owner_id    BIGINT NOT NULL,
  url         VARCHAR(500) NOT NULL,
  mime_type   VARCHAR(100) NULL,
  size_bytes  BIGINT NULL,
  caption     VARCHAR(255),
  sort_order  INT NOT NULL DEFAULT 0,
  uploaded_by BIGINT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_media_owner (owner_type, owner_id, sort_order),
  KEY idx_media_homestay (homestay_id),
  CONSTRAINT fk_media_hs   FOREIGN KEY (homestay_id) REFERENCES homestays(id),
  CONSTRAINT fk_media_user FOREIGN KEY (uploaded_by) REFERENCES users(id),
  CONSTRAINT ck_media_size CHECK (size_bytes IS NULL OR size_bytes >= 0)
) ENGINE=InnoDB;
-- ---------------------------------------------------------------------
-- 3. CHÍNH SÁCH TOÀN CÔNG TY + QUY TẮC GIÁ
-- ---------------------------------------------------------------------
-- Dạng khóa-giá trị: ứng dụng phải kiểm tra khóa, kiểu và miền giá trị trước khi lưu.
-- Quy tắc hủy được lưu dưới dạng JSON trong policy_settings, không cần bảng riêng.
CREATE TABLE policy_settings (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  policy_group VARCHAR(30) NOT NULL,       -- BOOKING, PAYMENT, STAY, CANCELLATION, ...
  policy_key   VARCHAR(60) NOT NULL,
  value_type   VARCHAR(20) NOT NULL,       -- INT, BOOL, TIME, TEXT, JSON, ...
  policy_value TEXT NOT NULL,
  description  VARCHAR(255),
  updated_by   BIGINT NULL,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_policy (policy_group, policy_key),
  CONSTRAINT fk_policy_user FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB;
-- Mỗi phòng có một giá cơ bản cho mỗi đêm lưu trú.
-- Quy tắc ADJUSTMENT thay đổi giá cơ bản theo ngày trong tuần, ngày lễ/khoảng ngày, v.v.
-- room_id NULL ở ADJUSTMENT = áp dụng cho mọi phòng của homestay; điều kiện ngày có thể áp dụng theo weekday hoặc khoảng ngày.
-- PERCENT: điều chỉnh tương đối so với giá cơ bản (+20 = tăng 20%, -10 = giảm 10%).
-- FIXED_PRICE: thay bằng giá cuối cùng (VND), không phải cộng thêm vào giá cơ bản.
-- Chọn một rule ADJUSTMENT phù hợp có priority cao nhất; nếu bằng priority, ưu tiên rule theo room cụ thể.
-- Ứng dụng phải tránh tạo các rule chồng lấn cùng priority và cùng mức cụ thể.
CREATE TABLE price_rules (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  homestay_id    BIGINT NOT NULL,
  room_id        BIGINT NULL,
  rule_type      ENUM('BASE','ADJUSTMENT') NOT NULL,
  name           VARCHAR(100) NOT NULL,
  base_price     BIGINT NULL,                    -- giá cơ bản cho một đêm
  adjust_type    ENUM('PERCENT','FIXED_PRICE') NULL,
  adjust_value   BIGINT NULL,
  weekdays       SET('MON','TUE','WED','THU','FRI','SAT','SUN') NULL,
  start_date     DATE NULL,
  end_date       DATE NULL,
  priority       SMALLINT NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,   -- quy tắc đang áp dụng phải được Director phê duyệt
  -- Mỗi phòng chỉ có một giá BASE đang hoạt động; quy tắc ADJUSTMENT có thể có nhiều dòng.
  base_room_id   BIGINT GENERATED ALWAYS AS
                   (CASE WHEN rule_type = 'BASE' AND is_active = TRUE THEN room_id ELSE NULL END) STORED,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_price_base_room (base_room_id),
  UNIQUE KEY uq_price_rules_id_hs (id, homestay_id),
  KEY idx_price_rules_scope (homestay_id, is_active, room_id, rule_type, priority),
  CONSTRAINT fk_price_rules_hs FOREIGN KEY (homestay_id) REFERENCES homestays(id),
  CONSTRAINT fk_price_rules_room FOREIGN KEY (room_id, homestay_id) REFERENCES rooms(id, homestay_id),
  CONSTRAINT ck_price_rule_shape CHECK (
       (rule_type = 'BASE' AND room_id IS NOT NULL AND base_price IS NOT NULL
        AND base_price >= 0 AND adjust_type IS NULL AND adjust_value IS NULL
        AND weekdays IS NULL AND start_date IS NULL AND end_date IS NULL)
    OR (rule_type = 'ADJUSTMENT' AND base_price IS NULL AND adjust_type IS NOT NULL AND adjust_value IS NOT NULL
        AND (start_date IS NULL OR end_date IS NULL OR start_date <= end_date))
  ),
  CONSTRAINT ck_price_rule_adjust_value CHECK (
       (adjust_type IS NULL AND adjust_value IS NULL)
    OR (adjust_type = 'PERCENT' AND adjust_value > -100)
    OR (adjust_type = 'FIXED_PRICE' AND adjust_value >= 0)
  )
) ENGINE=InnoDB;


-- Manager không sửa trực tiếp quy tắc đang áp dụng. Mọi yêu cầu tạo/sửa/ngừng quy tắc giá
-- được ghi tại đây; Director duyệt thì ứng dụng mới áp dụng vào price_rules.
-- Ứng dụng phải xác thực requested_by là Manager được phân công và reviewed_by có vai trò Director.
-- Không cho ngừng quy tắc BASE đang dùng nếu chưa bảo đảm phòng vẫn có giá BASE được duyệt.
CREATE TABLE price_rule_change_requests (
  id                 BIGINT AUTO_INCREMENT PRIMARY KEY,
  homestay_id        BIGINT NOT NULL,
  target_rule_id     BIGINT NULL,  -- NULL với CREATE; bắt buộc có với UPDATE/DEACTIVATE
  request_type       ENUM('CREATE','UPDATE','DEACTIVATE') NOT NULL,
  proposed_rule      JSON NOT NULL, -- dữ liệu quy tắc mà Manager đề xuất
  status             ENUM('PENDING_APPROVAL','APPROVED','REJECTED') NOT NULL DEFAULT 'PENDING_APPROVAL',
  requested_by       BIGINT NOT NULL,
  requested_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_by        BIGINT NULL,  -- Director
  reviewed_at        DATETIME NULL,
  rejection_reason   VARCHAR(255) NULL,
  KEY idx_price_request_status (status, requested_at),
  KEY idx_price_request_homestay (homestay_id, status),
  CONSTRAINT fk_prcr_homestay FOREIGN KEY (homestay_id) REFERENCES homestays(id),
  CONSTRAINT fk_prcr_target_rule FOREIGN KEY (target_rule_id, homestay_id)
    REFERENCES price_rules(id, homestay_id),
  CONSTRAINT fk_prcr_requester FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_prcr_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id),
  CONSTRAINT ck_prcr_target CHECK (
       (request_type = 'CREATE' AND target_rule_id IS NULL)
    OR (request_type IN ('UPDATE','DEACTIVATE') AND target_rule_id IS NOT NULL)
  ),
  CONSTRAINT ck_prcr_review CHECK (
       (status = 'PENDING_APPROVAL' AND reviewed_by IS NULL AND reviewed_at IS NULL)
    OR (status IN ('APPROVED','REJECTED') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  ),
  CONSTRAINT ck_prcr_rejection CHECK (status <> 'REJECTED' OR rejection_reason IS NOT NULL)
) ENGINE=InnoDB;
-- ---------------------------------------------------------------------
-- 4. ĐẶT PHÒNG
-- ---------------------------------------------------------------------
-- Vòng đời status đã chốt:
-- PENDING_DEPOSIT: khách chưa gửi yêu cầu xác minh đặt cọc.
-- PENDING_APPROVAL: khách đã gửi chứng từ/khai báo thanh toán, đang chờ Manager kiểm tra; CHƯA được xác nhận.
-- CONFIRMED: Manager đã xác minh khoản cọc và duyệt booking; đây mới là đặt phòng chính thức.
-- CHECKED_IN / CHECKED_OUT: khách nhận phòng / đã trả phòng.
-- Khi tạo booking, booking_room_nights giữ chỗ tạm theo từng đêm để chống overbooking; chưa phải xác nhận chính thức.
-- Manager xác minh payment đặt cọc và duyệt booking trong cùng transaction; Director duyệt riêng yêu cầu thay đổi giá phòng.
-- Nếu payment bị từ chối, booking quay lại PENDING_DEPOSIT nếu còn hạn, nếu không thì EXPIRED.
-- Khách vãng lai do Manager đặt hộ có customer_id NULL; contact_* là bản chụp liên hệ tại thời điểm đặt.
-- Booking chỉ lưu ngày nhận và ngày trả. Chính sách: nhận phòng từ 11:00 trở đi; trả phòng trước 08:00.
-- Mỗi dòng booking_room_nights đại diện một phòng được giữ trong một đêm, từ check_in_date đến trước check_out_date.
-- Ngày check_out_date không tính tiền đêm và không bị chiếm dụng như một đêm lưu trú.
CREATE TABLE bookings (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  code              VARCHAR(20) NOT NULL,           -- mã công khai, khách ghi vào nội dung chuyển khoản
  homestay_id       BIGINT NOT NULL,
  customer_id       BIGINT NULL,                    -- NULL khi Manager đặt hộ khách chưa có tài khoản
  contact_name      VARCHAR(100) NOT NULL,
  contact_phone     VARCHAR(20)  NOT NULL,
  contact_email     VARCHAR(150) NULL,
  check_in_date     DATE NOT NULL,
  check_out_date    DATE NOT NULL,
  guest_count       SMALLINT NOT NULL,
  status            ENUM('PENDING_DEPOSIT','PENDING_APPROVAL','CONFIRMED','CHECKED_IN','CHECKED_OUT','CANCELLED','EXPIRED') NOT NULL,
  room_total_price  BIGINT NOT NULL,                -- tổng giá phòng đã chốt, bằng SUM(booking_room_nights.nightly_price) lúc tạo đơn
  deposit_amount    BIGINT NOT NULL,                -- cọc đã chốt theo policy tại thời điểm tạo booking
  hold_expires_at   DATETIME NOT NULL,              -- hạn giữ tạm khi chờ khách nộp cọc
  policy_snapshot   JSON NULL,
  note              VARCHAR(500),
  approved_by       BIGINT NULL,                    -- Manager duyệt sau khi xác minh tiền cọc
  approved_at       DATETIME NULL,
  -- checked_in_at     DATETIME NULL,
  -- checked_out_at    DATETIME NULL,
  cancelled_at      DATETIME NULL,
  cancelled_by      BIGINT NULL,
  cancel_reason     VARCHAR(255),
  refund_amount     BIGINT NULL,
  created_by        BIGINT NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  version           INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_bookings_code (code),
  UNIQUE KEY uq_bookings_id_hs (id, homestay_id),
  KEY idx_bookings_hs_status (homestay_id, status, check_in_date),
  KEY idx_bookings_customer (customer_id, created_at),
  KEY idx_bookings_phone (contact_phone),
  KEY idx_bookings_hold (status, hold_expires_at),
  KEY idx_bookings_approval (status, created_at),
  CONSTRAINT fk_bookings_hs        FOREIGN KEY (homestay_id)  REFERENCES homestays(id),
  CONSTRAINT fk_bookings_customer  FOREIGN KEY (customer_id)  REFERENCES users(id),
  CONSTRAINT fk_bookings_cancelby  FOREIGN KEY (cancelled_by) REFERENCES users(id),
  CONSTRAINT fk_bookings_createdby FOREIGN KEY (created_by)   REFERENCES users(id),
  CONSTRAINT fk_bookings_approvedby FOREIGN KEY (approved_by) REFERENCES users(id),
  CONSTRAINT ck_bookings_dates CHECK (check_out_date > check_in_date),
  CONSTRAINT ck_bookings_guests CHECK (guest_count > 0),
  CONSTRAINT ck_bookings_money CHECK (room_total_price > 0 AND deposit_amount > 0 AND deposit_amount <= room_total_price),
  CONSTRAINT ck_bookings_approval_pair CHECK (
       (approved_by IS NULL AND approved_at IS NULL)
    OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
  CONSTRAINT ck_bookings_confirmed_approval CHECK (
       status NOT IN ('CONFIRMED','CHECKED_IN','CHECKED_OUT')
    OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
) ENGINE=InnoDB;
CREATE TABLE booking_rooms (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id  BIGINT NOT NULL,
  homestay_id BIGINT NOT NULL,
  room_id     BIGINT NOT NULL,
  UNIQUE KEY uq_booking_rooms (booking_id, room_id, homestay_id),
  CONSTRAINT fk_br_booking FOREIGN KEY (booking_id, homestay_id)
    REFERENCES bookings(id, homestay_id) ON DELETE CASCADE,
  CONSTRAINT fk_br_room FOREIGN KEY (room_id, homestay_id) REFERENCES rooms(id, homestay_id)
) ENGINE=InnoDB;
-- Sổ đêm lưu trú của đơn: mỗi dòng = một phòng được giữ trong một đêm, kèm giá đêm đã chốt.
-- Tạo dòng từ check_in_date đến trước check_out_date; ngày trả phòng không được tính tiền đêm.
-- PRIMARY KEY (room_id, stay_date) ngăn hai booking giữ cùng phòng trong cùng đêm.
-- nightly_price là giá sau khi áp dụng price_rules đã được Director phê duyệt tại thời điểm đặt.
-- Khi hủy/hết hạn: xóa các dòng của booking để nhả phòng; room_total_price vẫn được lưu trong bookings.
-- Khi điều chỉnh đơn: xóa và tạo lại các dòng trong cùng transaction.
-- Tính khả dụng phải tính cả PENDING_DEPOSIT/PENDING_APPROVAL.
CREATE TABLE booking_room_nights (
  room_id                    BIGINT NOT NULL,
  stay_date                  DATE NOT NULL,
  booking_id                 BIGINT NOT NULL,
  homestay_id                BIGINT NOT NULL,
  nightly_price              BIGINT NOT NULL,
  applied_rule_name_snapshot VARCHAR(100) NOT NULL,
  created_at                 DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, stay_date),
  KEY idx_brn_booking (booking_id),
  KEY idx_brn_date (stay_date),
  CONSTRAINT fk_brn_booking_room
    FOREIGN KEY (booking_id, room_id, homestay_id)
    REFERENCES booking_rooms(booking_id, room_id, homestay_id)
    ON DELETE CASCADE,
  CONSTRAINT ck_brn_price CHECK (nightly_price >= 0)
) ENGINE=InnoDB;
-- ---------------------------------------------------------------------
-- 5. DỊCH VỤ
-- ---------------------------------------------------------------------
CREATE TABLE service_categories (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  homestay_id BIGINT NOT NULL,
  name        VARCHAR(100) NOT NULL,
  UNIQUE KEY uq_svc_cat_name (homestay_id, name),
  UNIQUE KEY uq_svc_cat_id_hs (id, homestay_id),
  CONSTRAINT fk_svc_cat_hs FOREIGN KEY (homestay_id) REFERENCES homestays(id)
) ENGINE=InnoDB;
CREATE TABLE services (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  homestay_id BIGINT NOT NULL,
  category_id BIGINT NOT NULL,
  name        VARCHAR(150) NOT NULL,
  unit        VARCHAR(30)  NOT NULL,              -- lượt, giờ, suất, chuyến...
  unit_price  BIGINT NOT NULL,                    -- MGR-05.2
  description VARCHAR(255),
  status      ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  UNIQUE KEY uq_services_name (homestay_id, name),
  UNIQUE KEY uq_services_id_hs (id, homestay_id),
  CONSTRAINT fk_services_cat FOREIGN KEY (category_id, homestay_id)
    REFERENCES service_categories(id, homestay_id),
  CONSTRAINT ck_services_price CHECK (unit_price >= 0)
) ENGINE=InnoDB;
-- Khách của dịch vụ = bookings.customer_id (join qua booking_id), không lặp user_id ở đây.
-- requested_by = ai tạo yêu cầu (khách CUS-03.2 hoặc Manager đặt hộ MGR-03.3); recorded_by = Manager ghi nhận đã dùng.
-- REGISTERED: đã đăng ký | USED: Manager ghi nhận đã dùng (MGR-05.3) | CANCELLED: hủy. Chỉ USED được tính tiền.
CREATE TABLE booking_services (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id   BIGINT NOT NULL,
  homestay_id  BIGINT NOT NULL,
  room_id      BIGINT NOT NULL,
  service_id   BIGINT NOT NULL,
  quantity     INT NOT NULL,
  unit_price   BIGINT NOT NULL,                   -- giá chốt tại thời điểm đăng ký
  total_price  BIGINT AS (quantity * unit_price) STORED,
  status       ENUM('REGISTERED','USED','CANCELLED') NOT NULL DEFAULT 'REGISTERED',
  service_date DATE NULL,
  note         VARCHAR(255),
  requested_by BIGINT NOT NULL,
  recorded_by  BIGINT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_bs_booking (booking_id, status),
  CONSTRAINT fk_bs_booking_room FOREIGN KEY (booking_id, room_id, homestay_id)
  REFERENCES booking_rooms(booking_id, room_id, homestay_id) ON DELETE CASCADE,
  CONSTRAINT fk_bs_service FOREIGN KEY (service_id, homestay_id) REFERENCES services(id, homestay_id),
  CONSTRAINT fk_bs_reqby FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_bs_recby FOREIGN KEY (recorded_by)  REFERENCES users(id),
  CONSTRAINT ck_bs_qty CHECK (quantity > 0),
  CONSTRAINT ck_bs_unit_price CHECK (unit_price >= 0)
) ENGINE=InnoDB;
-- ---------------------------------------------------------------------
-- 6. THANH TOÁN — Manager xác minh cọc và duyệt booking
-- ---------------------------------------------------------------------
-- Khách gửi thông tin chuyển khoản/chứng từ -> payment PENDING và booking PENDING_APPROVAL.
-- Manager kiểm tra giao dịch; thao tác duyệt cần xác nhận payment và booking trong cùng transaction.
-- Chứng từ thanh toán lưu trực tiếp trong payments.proof_url; media chỉ lưu nội dung homestay/phòng/dịch vụ.
-- Nếu không khớp: payment REJECTED; booking quay về PENDING_DEPOSIT hoặc EXPIRED theo hold_expires_at.
-- Hoàn tiền: tạo payment type REFUND; chỉ ghi nhận thực hoàn khi Manager xác nhận giao dịch hoàn tiền.
CREATE TABLE payments (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  booking_id     BIGINT NOT NULL,
  homestay_id    BIGINT NOT NULL,
  type           ENUM('DEPOSIT','PAYMENT','REFUND') NOT NULL,
  amount         BIGINT NOT NULL,
  method         ENUM('CASH','BANK_TRANSFER') NOT NULL,
  status         ENUM('PENDING','CONFIRMED','REJECTED') NOT NULL DEFAULT 'PENDING', 
  bank_name      VARCHAR(100),
  bank_account_number VARCHAR(100),
  bank_account_holder VARCHAR(100),
  reference_code VARCHAR(100),                    -- mã giao dịch/nội dung chuyển khoản khách cung cấp
  proof_url      VARCHAR(500) NULL,                -- đường dẫn ảnh/URL chứng từ khách gửi
  rejection_reason VARCHAR(255) NULL,              -- lý do từ chối chứng từ/thanh toán (nếu có)
  note           VARCHAR(255),
  created_by     BIGINT NOT NULL,
  confirmed_by   BIGINT NULL,
  confirmed_at   DATETIME NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pay_booking (booking_id),
  KEY idx_pay_finance (homestay_id, status, confirmed_at),
  CONSTRAINT fk_pay_booking FOREIGN KEY (booking_id, homestay_id)
    REFERENCES bookings(id, homestay_id),
  CONSTRAINT fk_pay_createdby FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT fk_pay_confby FOREIGN KEY (confirmed_by) REFERENCES users(id),
  CONSTRAINT ck_pay_amount CHECK (amount > 0),
  CONSTRAINT ck_pay_confirmed CHECK (status <> 'CONFIRMED' OR (confirmed_by IS NOT NULL AND confirmed_at IS NOT NULL)),
  CONSTRAINT ck_pay_rejected  CHECK (status <> 'REJECTED' OR rejection_reason IS NOT NULL)
) ENGINE=InnoDB;
-- ---------------------------------------------------------------------
-- 7. CHI PHÍ VẬN HÀNH
-- ---------------------------------------------------------------------
CREATE TABLE expense_categories (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  homestay_id BIGINT NOT NULL,
  name        VARCHAR(100) NOT NULL,              -- điện, nước, nhân công, sửa chữa...
  UNIQUE KEY uq_exp_cat_name (homestay_id, name),
  UNIQUE KEY uq_exp_cat_id_hs (id, homestay_id),
  CONSTRAINT fk_exp_cat_hs FOREIGN KEY (homestay_id) REFERENCES homestays(id)
) ENGINE=InnoDB;
CREATE TABLE expenses (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  homestay_id  BIGINT NOT NULL,
  category_id  BIGINT NOT NULL,
  amount       BIGINT NOT NULL,
  expense_date DATE NOT NULL,
  description  VARCHAR(255),
  supplier_name VARCHAR(150) NULL,
  document_type ENUM('INVOICE','RECEIPT','BANK_TRANSFER_CONFIRMATION','OTHER') NULL,
  document_number VARCHAR(100) NULL,
  document_date DATE NULL,
  transaction_reference VARCHAR(100) NULL,
  payment_method ENUM('CASH','BANK_TRANSFER','CARD','OTHER') NULL,
  proof_url VARCHAR(500) NULL,
  created_by   BIGINT NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_expenses_hs_date (homestay_id, expense_date),
  KEY idx_expenses_document (document_type, document_date),
  KEY idx_expenses_transaction_reference (transaction_reference),
  CONSTRAINT fk_exp_cat FOREIGN KEY (category_id, homestay_id)
    REFERENCES expense_categories(id, homestay_id),
  CONSTRAINT fk_exp_user FOREIGN KEY (created_by) REFERENCES users(id),
  CONSTRAINT ck_exp_amount CHECK (amount > 0)
) ENGINE=InnoDB;
-- ---------------------------------------------------------------------
-- 8. XÁC THỰC & NHẬT KÝ
-- ---------------------------------------------------------------------
CREATE TABLE refresh_tokens (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT NOT NULL,
  token_hash CHAR(64) NOT NULL,                   -- SHA-256 của token, không lưu token gốc
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_refresh_hash (token_hash),
  KEY idx_refresh_user (user_id),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE password_reset_tokens (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id    BIGINT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at    DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reset_hash (token_hash),
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
-- CREATE TABLE audit_logs (                       -- thao tác nhạy cảm: xác nhận thanh toán, hủy, khóa TK, đổi chính sách
--   id          BIGINT AUTO_INCREMENT PRIMARY KEY,
--   user_id     BIGINT NULL,
--   action      VARCHAR(50)  NOT NULL,
--   entity_type VARCHAR(50)  NOT NULL,
--   entity_id   BIGINT NULL,
--   detail      JSON NULL,
--   created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   KEY idx_audit_entity (entity_type, entity_id),
--   KEY idx_audit_time (created_at)
-- ) ENGINE=InnoDB;
-- ---------------------------------------------------------------------
-- 9. VIEW CHO THANH TOÁN VÀ BÁO CÁO
-- ---------------------------------------------------------------------
-- Công nợ từng đơn (MGR-06.1). Đơn đã hủy/hết hạn: không có "còn phải thanh toán" (NULL),
-- thay vào đó refund_pending = số tiền phải hoàn mà chưa hoàn.
CREATE VIEW v_booking_balance AS
SELECT b.id AS booking_id, b.homestay_id, b.code, b.status,
       b.room_total_price,
       COALESCE(s.service_total, 0) AS service_total_price,
       CASE WHEN b.status IN ('CANCELLED','EXPIRED') THEN NULL
            ELSE b.room_total_price + COALESCE(s.service_total, 0) END AS grand_total_price,
       COALESCE(p.paid_in, 0)   AS paid_amount,
       COALESCE(p.refunded, 0)  AS refunded_amount,
       CASE WHEN b.status IN ('CANCELLED','EXPIRED') THEN NULL
            ELSE b.room_total_price + COALESCE(s.service_total, 0)
                 - (COALESCE(p.paid_in, 0) - COALESCE(p.refunded, 0)) END AS outstanding_amount,
       CASE WHEN b.status = 'CANCELLED'
            THEN COALESCE(b.refund_amount, 0) - COALESCE(p.refunded, 0) END AS refund_pending_amount
FROM bookings b
LEFT JOIN (SELECT booking_id, SUM(total_price) AS service_total
           FROM booking_services WHERE status = 'USED' GROUP BY booking_id) s ON s.booking_id = b.id
LEFT JOIN (SELECT booking_id,
                  SUM(CASE WHEN type IN ('DEPOSIT','PAYMENT') THEN amount ELSE 0 END) AS paid_in,
                  SUM(CASE WHEN type = 'REFUND' THEN amount ELSE 0 END)               AS refunded
           FROM payments WHERE status = 'CONFIRMED' GROUP BY booking_id) p ON p.booking_id = b.id;
-- Doanh thu / chi phí / lợi nhuận theo homestay và tháng (MGR-08, DIR-02)
-- Doanh thu = tiền thực thu ròng (đã xác nhận, trừ hoàn tiền), theo ngày xác nhận
-- Lợi nhuận = doanh thu - chi phí vận hành
CREATE VIEW v_monthly_finance AS
SELECT homestay_id, ym,
       SUM(revenue) AS revenue,
       SUM(expense) AS expense,
       SUM(revenue) - SUM(expense) AS profit
FROM (
  SELECT homestay_id,
         DATE_FORMAT(CONVERT_TZ(confirmed_at,'+00:00','+07:00'),'%Y-%m') AS ym,
         SUM(CASE WHEN type = 'REFUND' THEN -amount ELSE amount END) AS revenue,
         0 AS expense
  FROM payments WHERE status = 'CONFIRMED'
  GROUP BY homestay_id, DATE_FORMAT(CONVERT_TZ(confirmed_at,'+00:00','+07:00'),'%Y-%m')
  UNION ALL
  SELECT homestay_id, DATE_FORMAT(expense_date, '%Y-%m'), 0, SUM(amount)
  FROM expenses
  GROUP BY homestay_id, DATE_FORMAT(expense_date, '%Y-%m')
) t
GROUP BY homestay_id, ym;
-- Công suất phòng = số đêm-phòng đã sử dụng / (số phòng ACTIVE * số đêm trong kỳ).
-- Mỗi dòng booking_room_nights là một phòng được sử dụng/giữ trong một đêm.
CREATE VIEW v_monthly_occupancy AS
SELECT b.homestay_id, DATE_FORMAT(o.stay_date, '%Y-%m') AS ym,
       COUNT(*) AS occupied_room_nights
FROM booking_room_nights o
JOIN bookings b ON b.id = o.booking_id
WHERE b.status IN ('CONFIRMED','CHECKED_IN','CHECKED_OUT')
GROUP BY b.homestay_id, DATE_FORMAT(o.stay_date, '%Y-%m');

-- Trạng thái phòng theo từng đêm cho màn hình tra cứu:
-- HELD = đang giữ chỗ (chờ cọc / chờ Manager duyệt)
-- BOOKED = đã xác nhận hoặc đang/trước đó lưu trú (CONFIRMED, CHECKED_IN, CHECKED_OUT)
-- Không có dòng cho phòng/ngày = không bị booking chiếm dụng trong đêm đó.
-- CANCELLED / EXPIRED đã bị xóa khỏi booking_room_nights nên tự thành không còn giữ chỗ.
CREATE VIEW v_room_night_status AS
SELECT n.homestay_id, n.room_id, n.stay_date, n.booking_id,
       CASE WHEN b.status IN ('PENDING_DEPOSIT','PENDING_APPROVAL')
            THEN 'HELD' ELSE 'BOOKED' END AS night_status
FROM booking_room_nights n
JOIN bookings b ON b.id = n.booking_id;
-- ---------------------------------------------------------------------
-- 10. DỮ LIỆU KHỞI TẠO
-- ---------------------------------------------------------------------
INSERT INTO policy_settings (policy_group, policy_key, value_type, policy_value, description) VALUES
 ('BOOKING','min_nights', 'INT', '1', 'Số đêm tối thiểu mỗi đơn'),
 ('BOOKING','max_nights', 'INT', '30', 'Số đêm tối đa có thể đặt'),
 ('BOOKING','max_advance_days', 'INT', '365', 'Được đặt trước tối đa bao nhiêu ngày'),
 ('BOOKING','adjust_min_days_before', 'INT', '3', 'Chỉ được điều chỉnh đơn nếu còn >= N ngày đến ngày nhận phòng'),
 ('PAYMENT','deposit_percent', 'INT', '30', 'Tỷ lệ đặt cọc bắt buộc trên tổng giá phòng (%)'),
 ('PAYMENT','hold_hours', 'INT', '24', 'Thời hạn gửi chứng từ; PENDING_APPROVAL không tự hết hạn khi Manager đang xét'),
 ('STAY','check_in_time', 'TIME', '11:00', 'Khách được nhận phòng từ 11:00 trở đi'),
 ('STAY','check_out_deadline', 'TIME', '08:00', 'Khách phải trả phòng không muộn hơn 08:00; mốc 08:00 được tính là hợp lệ'),
 ('STAY','house_rules', 'TEXT', '', 'Nội quy lưu trú'),
 ('CANCELLATION','refund_rules', 'JSON', '[{"days_before_checkin":7,"refund_percent":100},{"days_before_checkin":3,"refund_percent":50},{"days_before_checkin":0,"refund_percent":0}]', 'Các mốc ngày trước check-in và tỷ lệ hoàn tiền; chọn mốc lớn nhất không vượt quá số ngày còn lại');

-- Giá cơ bản: mỗi phòng có một dòng price_rules với rule_type='BASE', là giá cho một đêm.
-- Các giá trị cơ bản không seed ở đây vì mỗi homestay/phòng sẽ có mức giá riêng.
-- Tài khoản Admin đầu tiên tạo bằng seeder trong ứng dụng (băm BCrypt), không chèn mật khẩu ở đây.
-- Quy trình đặt phòng phải được thực thi ở tầng ứng dụng trong transaction: tạo giữ chỗ theo từng đêm;
-- nhận chứng từ -> PENDING_APPROVAL; Manager xác minh cọc và duyệt booking trong cùng transaction;
-- từ chối -> payment REJECTED và booking quay lại PENDING_DEPOSIT hoặc EXPIRED.
-- Quy tắc giá do Manager đề xuất được lưu ở price_rule_change_requests; chỉ Director phê duyệt mới được áp dụng vào price_rules.
