# QUY CHUẨN CODE FRONTEND — Hệ thống quản lý vận hành homestay

> Dành cho **agent/lập trình viên** khi viết frontend (React). Hệ thống có **4 giao diện riêng**: **Khách hàng (Customer)**, **Quản lý homestay (Manager)**, **Giám đốc (Director)**, **Quản trị (Admin)**.
> Hai giao diện quan trọng nhất là **Khách hàng** và **Manager**, nên mục 7A và 7B viết chi tiết nhất. Director và Admin dùng lại khung của Manager, chỉ khác menu và màn hình.
> Chuẩn tham chiếu giao diện: **Airbnb** (trang khách) và **Airbnb Host Tools** (trang quản lý). Xem mục 1.

---

## 0. Cách dùng và thứ tự ưu tiên

**Đọc theo vai trò đang code:**

| Đang làm | Đọc |
|---|---|
| Giao diện **Khách** | 1, 2, 3, 5, 6, 8–13, **7A**, 14 |
| Giao diện **Manager** | 1, 2, 3, 5, 6, 8–13, **7B**, 14 |
| Giao diện **Director / Admin** | 3, 5, 6, 8–13, **7B (khung)**, **7C / 7D**, 14 |
| Thành phần dùng chung | 3, 5, 6, 8, 9 |

**Khi các nguồn mâu thuẫn, ưu tiên theo thứ tự:**

1. **Tài liệu thiết kế API (v1.1)**: đường dẫn, tên trường, mã lỗi, quyền. Không tự đổi tên trường.
2. **Schema CSDL v6**: ý nghĩa nghiệp vụ của trạng thái, đêm lưu trú, giá.
3. **File này**: giao diện, cấu trúc code, quy ước.
4. Airbnb: chỉ lấy **bố cục và cách tương tác**. Không sao chép logo, tên thương hiệu, ảnh, phông chữ độc quyền.

**Quy tắc cho agent:**

- Repo đã dùng thư viện khác mục 8 (Redux, Ant Design…) thì **giữ nguyên**, chỉ áp dụng phần quy ước còn lại.
- Gặp tình huống file này chưa nói: chọn phương án đơn giản nhất, giống màn hình gần nhất đã có, ghi `// TODO(spec): ...`. Không tự bịa API.
- Không gọi endpoint không có trong tài liệu API. Cần endpoint mới thì ghi vào mục 14 và dùng dữ liệu giả trong `src/mocks/`.
- **Không dùng chung giao diện giữa Khách và Manager.** Hai bên có layout, mật độ thông tin và component khác nhau (mục 4). Chỉ chia sẻ token, `components/ui/` và `lib/`.

## 1. Chuẩn tham chiếu: Airbnb

### 1.1 Nền tảng đã khảo sát và lý do chọn

| Nền tảng | Mạnh | Hạn chế |
|---|---|---|
| **Airbnb** (site khách + Host Tools) | Có cả phía khách lẫn phía chủ nhà; tìm kiếm Ở đâu/Khi nào/Ai gọn; trang phòng và panel đặt phòng quen thuộc | Không có vai trò Admin/Director, không có luồng duyệt giá, quyết toán, chi phí |
| Booking.com Extranet | Điều hướng tab rõ, chỉnh giá hàng loạt | Giao diện dày, kiểu công cụ nội bộ; không có phía khách đi kèm |
| Cloudbeds | Lịch kéo thả, báo cáo | Quá nặng, hướng khách sạn lớn |
| Little Hotelier | Đơn giản cho cơ sở nhỏ | Chỉ có phía quản lý |

→ Chọn **Airbnb** cho cả hai giao diện chính. Phần Airbnb không có (duyệt cọc, duyệt giá, quyết toán, chi phí, báo cáo, Director, Admin) thì thiết kế bằng cùng token và component.

### 1.2 Những gì đã quan sát trực tiếp từ trang Airbnb

Nguồn: trang chủ `airbnb.com` và một trang phòng cụ thể (`/rooms/1445979399794262469`, villa 4 phòng ngủ ở Đà Nẵng), đọc ngày 17/10/2026. Đây là **cấu trúc và nhãn chữ** đọc từ nội dung trang, **không phải ảnh chụp màn hình**.

**Trang chủ, theo thứ tự từ trên xuống:**

1. Header: logo, tab loại hình (Homes / Experiences / Services), "Become a host", ngôn ngữ, menu "Log in or sign up".
2. **Thanh tìm kiếm 3 ô: Where · When ("Add dates") · Who ("Add guests")**.
3. Các **carousel theo địa điểm**. Mỗi carousel có tiêu đề ("Homes in Gatlinburg"), dòng phụ ("Smoky Mountain town with park trails") và link **"See all"**.
4. **Thẻ phòng**: ảnh, badge "Guest favorite" (chỉ một số thẻ), dòng loại + địa điểm ("Cottage in Sevierville"), giá cho khoảng ở ("$445 for 2 nights"), điểm đánh giá.
5. Dải "Inspiration for future getaways" có tab (Popular, Beach, Mountains…), rồi danh sách link điểm đến, rồi footer 3 cột (Support / Hosting / Airbnb).

**Trang phòng, theo thứ tự từ trên xuống:**

1. **Thư viện ảnh** + nút "Show all photos".
2. **Thanh tab neo** dưới ảnh: Photos · Amenities · Reviews · Location.
3. **Tiêu đề** + nút Share / Save → dòng loại ("Entire villa in Phước Mỹ, Vietnam") → dòng thông số **"8 guests · 4 bedrooms · 4 beds · 4 baths"** → badge.
4. Khối **chủ nhà** ("Hosted by …", năm kinh nghiệm, nút "Message host").
5. **Listing highlights**: ba ý ngắn có biểu tượng (Self check-in, Walkable area…).
6. **Mô tả**: chia 3 tiểu mục *The space / Guest access / Other things to note*.
7. **"What this place offers"**: 5 tiện nghi đầu + nút **"Show all 47 amenities"**.
8. **Đánh giá**: điểm tổng, phân bố sao, điểm theo tiêu chí (Cleanliness, Accuracy, Check-in…), "Show all N reviews".
9. **"Where you'll be"**: bản đồ; địa chỉ chính xác chỉ gửi sau khi đặt.
10. **Panel đặt phòng** (cột phải, sticky): tiêu đề "2 nights in …", ô **Check-in / Checkout / Guests**, nút **"Reserve"**, link "Report this listing".

**Điều trang Airbnb đó không có** (dự án này thì cần): lịch trống/bận hiển thị ngay trên trang, mục nội quy/giờ nhận trả phòng riêng, bảng giá từng đêm.

**Host Tools** (nguồn: trang trợ giúp của Airbnb, mô tả **app** của chủ nhà): 5 tab **Today · Calendar · Listings · Messages · Menu**.

| Tab | Airbnb làm gì |
|---|---|
| Today | Màn hình mặc định; đặt phòng hiện tại và sắp tới; mỗi đặt phòng có **gợi ý hành động** (liên hệ khách, đọc đánh giá); ghi chú riêng |
| Calendar | Quản lý trống/giá theo đêm: mở ngày, chặn đêm, số đêm tối thiểu, gợi ý giá |
| Listings | Sửa tin: ảnh, tiện nghi, hướng dẫn nhận phòng, xem trước như khách thấy |
| Messages | Trò chuyện, xét yêu cầu đặt phòng (ngày + số khách) |
| Menu | Thu nhập (báo cáo tùy chỉnh), thống kê, cài đặt |

### 1.3 Giới hạn phải nhớ

- Airbnb **không công bố đặc tả thiết kế chính thức**. Màu, bo góc, khoảng cách ở mục 3 là giá trị đã **làm tròn thành token của dự án** từ các bản tổng hợp cộng đồng. Coi token trong file này là chuẩn, không đối chiếu lại.
- **Trang thanh toán/xác nhận đặt phòng của Airbnb cần đăng nhập nên không đọc được.** Luồng đặt phòng ở 7A.4 do mình thiết kế theo mẫu hai cột quen thuộc (bên trái các bước, bên phải tóm tắt giá), không phải bản sao.
- Host Tools tối ưu cho **app di động**; hệ thống này là **web** và Manager chủ yếu dùng máy tính. Vì vậy Manager dùng **sidebar** trên desktop và **thanh tab dưới đáy** trên mobile, giữ cùng ngôn ngữ hình ảnh và cùng tên nhóm chức năng (4.3).
- Các phần Airbnb có nhưng dự án **không có dữ liệu**: đánh giá/sao, nhắn tin, yêu thích (Save), huy hiệu "Guest favorite". **Không vẽ các phần này** (không dùng sao giả, không làm nút Save).
- Phông **Airbnb Cereal** độc quyền → dùng **Inter**.

---

## 2. Nguyên tắc thiết kế (rút ra từ Airbnb)

1. **Ảnh là trung tâm, giao diện lùi lại.** Thẻ phòng không viền, không bóng; ảnh bo góc lớn, thông tin ngắn dưới ảnh.
2. **Một hành động chính mỗi màn hình.** Chỉ **một** nút primary trên mỗi màn hình hoặc modal.
3. **Khoảng trắng rộng, chữ xám trung tính.** Màu chỉ xuất hiện ở hành động chính và trạng thái.
4. **Tổng tiền luôn rõ ràng**: số đêm, giá từng đêm, tiền cọc, hạn giữ chỗ. Không để khách đoán.
5. **Mọi màn hình có dữ liệu đều có 4 trạng thái**: đang tải, rỗng, lỗi tải, lỗi gửi (mục 6.9).
6. **Tiếng Việt, ngắn gọn, thân thiện.** Nút dùng động từ ("Đặt phòng", "Duyệt cọc"), không dùng "OK/Submit".
7. **Khách và Manager khác mật độ**: Khách rộng rãi, ảnh lớn, ít chữ; Manager gọn, nhiều dữ liệu, ưu tiên thao tác nhanh (bảng, drawer, phím tắt Esc).

## 3. Design tokens

### 3.1 CSS variables (đặt trong `src/styles/tokens.css`, import một lần ở `main.tsx`)

```css
:root {
  /* Màu thương hiệu */
  --color-primary: #FF385C;
  --color-primary-hover: #E00B41;
  --color-primary-soft: #FFE8EC;      /* nền nhạt cho badge/hover */
  --color-primary-disabled: #FFD1DA;

  /* Trung tính */
  --color-ink: #222222;               /* chữ chính */
  --color-body: #484848;              /* chữ phụ nội dung */
  --color-muted: #717171;             /* chú thích, placeholder (đạt tương phản AA trên nền trắng) */
  --color-border: #DDDDDD;
  --color-border-strong: #B0B0B0;
  --color-surface: #FFFFFF;
  --color-surface-soft: #F7F7F7;      /* nền trang quản lý, ô nhập, hàng bảng xen kẽ */

  /* Trạng thái (dùng cho badge, toast, banner) */
  --color-success: #008A05;   --color-success-soft: #E6F4E6;
  --color-warning: #B25E00;   --color-warning-soft: #FFF1DC;
  --color-danger:  #C13515;   --color-danger-soft:  #FDE9E4;
  --color-info:    #1D5FBF;   --color-info-soft:    #E6EFFB;
  --color-teal:    #00786F;   --color-teal-soft:    #DDF3F0;

  /* Bo góc */
  --radius-sm: 8px;                   /* nút, input */
  --radius-md: 12px;                  /* card, modal nhỏ */
  --radius-lg: 20px;                  /* ảnh thẻ phòng, panel đặt phòng */
  --radius-pill: 999px;               /* thanh tìm kiếm, chip */

  /* Khoảng cách: lưới 4px */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;

  /* Đổ bóng: chỉ 2 mức */
  --shadow-1: 0 1px 2px rgb(0 0 0 / 8%), 0 2px 8px rgb(0 0 0 / 8%);       /* card nổi, dropdown */
  --shadow-2: 0 6px 20px rgb(0 0 0 / 16%);                                  /* modal, popover lịch */

  /* Lớp */
  --z-sticky: 20; --z-dropdown: 40; --z-modal: 60; --z-toast: 80;
}
```

Quy tắc:

- **Cấm** viết mã màu (`#xxxxxx`), `px` cho khoảng cách/bo góc rải rác trong component. Luôn dùng token (qua Tailwind `theme.extend` hoặc `var(--...)`).
- Màu chủ đạo **không** dùng cho chữ thường hoặc viền; chỉ dùng cho: nút primary, nút tìm kiếm, tab/mục menu đang chọn, liên kết hành động quan trọng.
- Màu trạng thái **không** là thông tin duy nhất: luôn kèm chữ (mục 6.5).

### 3.2 Tailwind mapping (nếu dùng Tailwind)

```ts
// tailwind.config.ts (trích)
theme: { extend: {
  colors: {
    primary: { DEFAULT: 'var(--color-primary)', hover: 'var(--color-primary-hover)', soft: 'var(--color-primary-soft)' },
    ink: 'var(--color-ink)', body: 'var(--color-body)', muted: 'var(--color-muted)',
    line: 'var(--color-border)', surface: { DEFAULT: 'var(--color-surface)', soft: 'var(--color-surface-soft)' },
    success: { DEFAULT: 'var(--color-success)', soft: 'var(--color-success-soft)' },
    warning: { DEFAULT: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
    danger:  { DEFAULT: 'var(--color-danger)',  soft: 'var(--color-danger-soft)' },
    info:    { DEFAULT: 'var(--color-info)',    soft: 'var(--color-info-soft)' },
    teal:    { DEFAULT: 'var(--color-teal)',    soft: 'var(--color-teal-soft)' },
  },
  borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', pill: 'var(--radius-pill)' },
  boxShadow: { 1: 'var(--shadow-1)', 2: 'var(--shadow-2)' },
  fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
}}
```

### 3.3 Typography

- Phông: **Inter** (cài qua `@fontsource-variable/inter`, **không** tải từ CDN ngoài để chạy được khi offline). Fallback: `system-ui`.
- Một họ phông duy nhất; phân cấp bằng **cỡ chữ + độ đậm** (không dùng phông thứ hai).
- Cỡ cơ sở 16px; line-height 1.5 cho đoạn văn, 1.25 cho tiêu đề.

| Token | Cỡ / độ đậm | Dùng cho |
|---|---|---|
| `display` | 32px / 700 | Tiêu đề trang chủ, hero |
| `h1` | 28px / 700 | Tiêu đề trang |
| `h2` | 22px / 600 | Tiêu đề khối (card lớn, section) |
| `h3` | 18px / 600 | Tiêu đề card, modal |
| `body` | 16px / 400 | Nội dung |
| `body-sm` | 14px / 400 | Bảng, nhãn form, chú thích |
| `caption` | 12px / 400–500 | Badge, ghi chú rất nhỏ (tối thiểu 12px) |
| `price` | 16–22px / 600, `tabular-nums` | Giá tiền (luôn dùng số đồng độ rộng) |

---

## 4. Bốn giao diện: khung, route, menu

### 4.1 Tổng quan

| | **Khách** | **Manager** | **Director** | **Admin** |
|---|---|---|---|---|
| Tiền tố route | `/` và `/account` | `/manager` | `/director` | `/admin` |
| Layout | `PublicLayout` | `BackOfficeLayout` | `BackOfficeLayout` | `BackOfficeLayout` |
| Phong cách | Rộng rãi, ảnh lớn, nền trắng | Gọn, bảng + drawer, nền xám nhạt | Như Manager | Như Manager |
| Thiết bị chính | Mobile + desktop như nhau | **Desktop trước**, mobile dùng được | Desktop | Desktop |
| Thư mục code | `features/*/customer`, `features/search` | `features/*/manager` | `features/*/director` | `features/users` |
| Mức ưu tiên | **Cao nhất** | **Cao nhì** | Thường | Thấp (ít màn hình) |

Quy tắc:

- Khách và Manager **không dùng chung component trang** (`pages/`). Chỉ chia sẻ `components/ui/`, `lib/`, `types/`.
- Mỗi layout là một route cha: `PublicLayout` (header Khách), `BackOfficeLayout` (sidebar + topbar, menu thay theo vai trò).

### 4.2 Khung layout

**`PublicLayout` (Khách và trang công khai)**

```
┌──────────────────────────────────────────────────────────────┐
│ Logo        [ Ở đâu | Nhận phòng | Trả phòng | Khách | 🔍 ]   ☰ 👤 │  cao 80px, sticky, viền dưới 1px
├──────────────────────────────────────────────────────────────┤
│                      nội dung (max 1280px)                    │
├──────────────────────────────────────────────────────────────┤
│ Footer: Hỗ trợ · Về chúng tôi · Chính sách · Hotline            │
└──────────────────────────────────────────────────────────────┘
```

- Logo bên trái; **thanh tìm kiếm pill ở giữa** (chỉ hiện ở trang chủ, kết quả, trang phòng); menu tài khoản bên phải (avatar tròn + biểu tượng ☰).
- Chưa đăng nhập: menu có "Đăng nhập", "Đăng ký". Đã đăng nhập: "Chuyến đi của tôi", "Tài khoản", "Đăng xuất".
- Lề ngang 24px (mobile 16px). Mobile: header thu gọn thành một nút "Bắt đầu tìm kiếm" + avatar.

**`BackOfficeLayout` (Manager, Director, Admin)**

```
┌────────┬───────────────────────────────────────────────────┐
│ Logo   │ Tên homestay / vai trò                  🔔  👤 ▾    │  topbar cao 64px
│        ├───────────────────────────────────────────────────┤
│ Menu   │ Tiêu đề trang                    [Nút primary]     │
│ (248px)│ ┌───────────────────────────────────────────────┐ │
│        │ │ Card trắng: bảng / form / lịch                 │ │  nền vùng nội dung = surface-soft
│        │ └───────────────────────────────────────────────┘ │
└────────┴───────────────────────────────────────────────────┘
```

- Sidebar 248px (thu gọn 72px còn biểu tượng). Nội dung tối đa 1440px.
- **Mobile (<768px)**: sidebar biến mất, thay bằng **thanh tab cố định dưới đáy tối đa 5 mục** (4.3); phần còn lại vào tab "Menu".
- Topbar Manager hiển thị **tên homestay được giao**; Director hiển thị "Toàn công ty".

Breakpoint (Tailwind mặc định): `sm 640`, `md 768`, `lg 1024`, `xl 1280`. **Thiết kế mobile trước** cho Khách; **desktop trước** cho Manager/Director/Admin.

### 4.3 Menu theo vai trò (Manager lấy tên nhóm từ 5 tab của Airbnb Host Tools)

**Manager** (sidebar desktop, 9 mục):

| Mục | Airbnb tương ứng | Ghi chú |
|---|---|---|
| **Hôm nay** | Today | Trang đầu sau khi đăng nhập |
| **Lịch** | Calendar | Lưới phòng × ngày |
| **Đặt phòng** *(badge số chờ xác nhận)* | Messages (xét yêu cầu đặt) | Danh sách + chi tiết |
| **Phòng** | Listings | Phòng, loại phòng, ảnh |
| **Giá** | Calendar (giá) | Giá cơ bản, quy tắc, yêu cầu đổi giá |
| **Dịch vụ** | — | Danh mục + dịch vụ |
| **Chi phí** | Menu → Earnings (chiều ngược) | Khoản chi + chứng từ |
| **Báo cáo** | Menu → Earnings/Insights | Tài chính, công suất |
| **Homestay** | Menu → Settings | Tên, địa chỉ, hotline, mô tả |

**Thanh tab mobile của Manager (5 mục):** Hôm nay · Lịch · Đặt phòng · Phòng · Menu *(Menu chứa Giá, Dịch vụ, Chi phí, Báo cáo, Homestay, Đăng xuất)*.

**Director:** Tổng quan · Homestay · Chính sách · **Duyệt giá** *(badge số yêu cầu chờ)* · Báo cáo.
**Admin:** Tài khoản *(chỉ một mục)*.

- Mục đang chọn: chữ ink đậm + nền `--color-primary-soft` + thanh 3px màu primary bên trái.
- Sau đăng nhập về trang đầu theo vai trò: CUSTOMER → `/` (hoặc `redirect`), MANAGER → `/manager`, DIRECTOR → `/director`, ADMIN → `/admin/users`.
- Truy cập sai vai trò → trang 403 (không chuyển hướng im lặng). Chưa đăng nhập → `/login?redirect=<đường dẫn cũ>`.

### 4.4 Bản đồ route

```
PUBLIC
/                           Trang chủ                   GET  /public/homestays
/search                     Kết quả phòng trống         POST /public/availability/search
/homestays/:id              Chi tiết homestay           GET  /public/homestays/{id}, /services
/rooms/:roomId              Chi tiết phòng + đặt        GET  /public/rooms/{id}
/login /register /forgot-password /reset-password

CUSTOMER  (/account)
/account                    Hồ sơ, đổi mật khẩu         GET/PATCH /me, PATCH /me/password
/account/bookings           Chuyến đi của tôi           GET  /customer/bookings
/account/bookings/:id       Chi tiết, cọc, dịch vụ, hủy GET  /customer/bookings/{id}
/booking/review             Xác nhận đặt phòng (trước khi tạo booking)

MANAGER  (/manager)
/manager                    Hôm nay
/manager/calendar           Lịch
/manager/bookings           Danh sách đặt phòng
/manager/bookings/new       Đặt phòng hộ khách
/manager/bookings/:id       Chi tiết (drawer mở từ danh sách; URL này mở trang đầy đủ)
/manager/rooms              Phòng      /manager/rooms/:id   Sửa phòng
/manager/room-types         Loại phòng
/manager/pricing            Giá
/manager/services           Dịch vụ
/manager/expenses           Chi phí
/manager/reports            Báo cáo
/manager/homestay           Thông tin homestay

DIRECTOR (/director)  → /director, /homestays, /policies, /price-approvals, /reports
ADMIN    (/admin)     → /admin/users
```


---

## 5. Quy tắc hiển thị dữ liệu nghiệp vụ

### 5.1 Tiền

- API trả **số nguyên VND**. Không dùng số thực, không `toFixed`.
- Hiển thị: `new Intl.NumberFormat('vi-VN').format(v) + ' ₫'` → `1.800.000 ₫`. Gói trong **một** hàm `formatVnd()` tại `src/lib/format.ts`; cấm tự định dạng ở nơi khác.
- Phần trăm hiển thị 1–2 chữ số thập phân tối đa (`37,78%`).

### 5.2 Ngày giờ (sai chỗ này rất dễ lệch ngày)

| Loại | Ví dụ từ API | Quy tắc |
|---|---|---|
| **Ngày thuần** (`checkInDate`, `stayDate`, `expenseDate`…) | `"2026-10-10"` | Giữ dạng chuỗi `YYYY-MM-DD`. **Cấm** `new Date("2026-10-10")` rồi hiển thị (lệch múi giờ). Dùng `dayjs(str)`/`date-fns parseISO` ở chế độ local, hoặc cắt chuỗi. Hiển thị `dd/MM/yyyy`. |
| **Thời điểm** (`holdExpiresAt`, `requestedAt`, `confirmedAt`…) | `"2026-10-11T10:10:00+07:00"` | Parse bằng thư viện, hiển thị theo múi **Asia/Ho_Chi_Minh**: `HH:mm dd/MM/yyyy`. |
| **Gửi lên API** | — | Ngày thuần gửi `YYYY-MM-DD`; không gửi giờ cho ngày ở. |

### 5.3 Đêm lưu trú (mô hình v6 — không còn slot)

- **Số đêm** = số ngày từ `checkInDate` đến **trước** `checkOutDate`. Ví dụ nhận 10/10, trả 12/10 → **2 đêm** (10/10 và 11/10). Ngày trả phòng **không tính tiền và không chiếm phòng**.
- Hiển thị khoảng ở: `10/10 → 12/10 · 2 đêm`.
- Chính sách giờ: **nhận phòng từ 11:00 trở đi, trả phòng đến hết 08:00 (bao gồm 08:00)**. Hiển thị dạng chữ ở trang phòng, form đặt và chi tiết booking; hệ thống **không** lưu giờ thực tế.
- Bảng giá theo đêm: dùng `quotedNights[{ stayDate, nightlyPrice }]` từ API, hiển thị từng dòng (ngày — giá) và dòng tổng. **Không tự tính lại giá ở frontend**; tổng luôn lấy từ `roomTotalPrice`.
- Bộ chọn ngày: chọn **khoảng** (nhận → trả), ngày trả phải **sau** ngày nhận ít nhất 1 ngày; chặn ngày quá khứ; đêm `HELD`/`BOOKED` tô xám, gạch chéo (mục 6.6).

### 5.4 Nhãn và màu trạng thái (dùng chung toàn dự án — định nghĩa **một lần** trong `src/lib/status.ts`)

**Booking**

| Mã | Nhãn | Màu |
|---|---|---|
| `PENDING_DEPOSIT` | Chờ đặt cọc | warning |
| `PENDING_APPROVAL` | Chờ xác nhận | info |
| `CONFIRMED` | Đã xác nhận | success |
| `CHECKED_IN` | Đang lưu trú | teal |
| `CHECKED_OUT` | Đã trả phòng | neutral (xám) |
| `CANCELLED` | Đã hủy | danger |
| `EXPIRED` | Hết hạn giữ chỗ | neutral (xám) |

**Thanh toán**

| Mã | Nhãn | Màu |
|---|---|---|
| `PENDING` | Chờ xác minh | warning |
| `CONFIRMED` | Đã xác nhận | success |
| `REJECTED` | Bị từ chối | danger |

Loại giao dịch: `DEPOSIT`=Tiền cọc, `PAYMENT`=Thanh toán, `REFUND`=Hoàn tiền. Phương thức: `CASH`=Tiền mặt, `BANK_TRANSFER`=Chuyển khoản (chi phí thêm `CARD`=Thẻ, `OTHER`=Khác).

**Khác**

| Nhóm | Mã → nhãn (màu) |
|---|---|
| Phòng | `ACTIVE` Đang nhận đặt (success) · `LOCKED` Tạm khóa (warning) · `INACTIVE` Ngừng khai thác (neutral) |
| Đêm (lịch) | `HELD` Đang giữ (warning) · `BOOKED` Đã đặt (primary-soft / info) · không có dòng = Trống |
| Homestay / tài khoản dịch vụ | `ACTIVE` Hoạt động (success) · `INACTIVE` Ngừng (neutral) · tài khoản `LOCKED` Đã khóa (danger) |
| Dòng dịch vụ | `REGISTERED` Đã đăng ký (info) · `USED` Đã dùng (success) · `CANCELLED` Đã hủy (neutral) |
| Yêu cầu đổi giá | `PENDING_APPROVAL` Chờ duyệt (warning) · `APPROVED` Đã duyệt (success) · `REJECTED` Bị từ chối (danger). Loại: `CREATE` Thêm · `UPDATE` Sửa · `DEACTIVATE` Ngừng áp dụng |
| Loại chứng từ chi phí | `INVOICE` Hóa đơn · `RECEIPT` Biên lai · `BANK_TRANSFER_CONFIRMATION` Xác nhận chuyển khoản · `OTHER` Khác |
| Vai trò | `CUSTOMER` Khách · `MANAGER` Quản lý · `ADMIN` Quản trị · `DIRECTOR` Giám đốc |

### 5.5 Ánh xạ mã lỗi → thông báo (định nghĩa trong `src/lib/errors.ts`)

Frontend **chỉ dựa vào `error.code`**, không parse `message`. Có mã lạ → hiện thông báo chung kèm `error.message` của server.

| Mã | Thông báo hiển thị |
|---|---|
| `VALIDATION_ERROR` | Dữ liệu chưa hợp lệ. *(Gắn lỗi vào từng ô theo `details[].field`)* |
| `INVALID_DATE_RANGE` | Ngày trả phòng phải sau ngày nhận phòng. |
| `INVALID_GUEST_COUNT` | Số khách không hợp lệ. |
| `UNAUTHORIZED` / `TOKEN_EXPIRED` | Phiên đăng nhập đã hết hạn. *(thử refresh một lần, thất bại thì về `/login`)* |
| `INVALID_CREDENTIALS` | Email hoặc mật khẩu không đúng. |
| `ACCOUNT_LOCKED` | Tài khoản đã bị khóa. Liên hệ quản trị viên. |
| `FORBIDDEN` / `HOMESTAY_SCOPE_VIOLATION` | Bạn không có quyền thực hiện thao tác này. |
| `HOMESTAY_NOT_ASSIGNED` | Tài khoản của bạn chưa được gán homestay. |
| `ROOM_NOT_AVAILABLE` | Phòng không còn trống trong khoảng ngày đã chọn. Vui lòng chọn ngày khác. |
| `ROOM_LOCKED` | Phòng đang tạm khóa. |
| `ROOM_CAPACITY_EXCEEDED` | Số khách vượt quá sức chứa của phòng. |
| `HOMESTAY_INACTIVE` | Homestay hiện không nhận đặt phòng. |
| `BOOKING_STATE_CONFLICT` | Trạng thái booking đã thay đổi. Hãy tải lại trang. |
| `BOOKING_CONCURRENT_MODIFICATION` | Booking vừa được người khác cập nhật. Hãy tải lại trang. |
| `ADJUSTMENT_WINDOW_CLOSED` | Đã quá thời hạn được phép điều chỉnh booking. |
| `CANCELLATION_NOT_ALLOWED` | Booking này không thể hủy ở trạng thái hiện tại. |
| `DEPOSIT_AMOUNT_INVALID` / `DEPOSIT_AMOUNT_INSUFFICIENT` | Số tiền cọc chưa đúng/chưa đủ theo chính sách. |
| `PAYMENT_ALREADY_REVIEWED` | Khoản thanh toán này đã được xử lý. |
| `OUTSTANDING_BALANCE` | Khách còn số tiền chưa thanh toán. |
| `PRICE_REQUEST_ALREADY_PENDING` | Đã có yêu cầu đổi giá đang chờ duyệt cho mục này. |
| `PRICE_REQUEST_ALREADY_REVIEWED` | Yêu cầu này đã được xử lý. |
| `PRICE_RULE_CONFLICT` | Quy tắc giá bị trùng/xung đột với quy tắc khác. |
| `FILE_TOO_LARGE` | Tệp quá lớn. |
| `UNSUPPORTED_MEDIA_TYPE` | Định dạng tệp không được hỗ trợ. |
| `EMAIL_ALREADY_EXISTS` | Email đã được sử dụng. |
| `INTERNAL_ERROR` | Có lỗi hệ thống. Vui lòng thử lại sau. |

---

## 6. Component chuẩn

Mọi component dùng chung đặt ở `src/components/ui/`; component nghiệp vụ ở `src/features/<module>/components/`. **Tái sử dụng trước, viết mới sau.**

### 6.1 Nút (`Button`)

| Biến thể | Kiểu | Dùng cho |
|---|---|---|
| `primary` | Nền `--color-primary`, chữ trắng, hover `--color-primary-hover` | **Một** hành động chính / màn hình |
| `secondary` | Nền trắng, viền `--color-ink` 1px, chữ ink | Hành động phụ ("Hủy", "Quay lại") |
| `ghost` | Không nền, hover nền `--color-surface-soft` | Hành động ít quan trọng, trong bảng |
| `danger` | Nền `--color-danger`, chữ trắng | Hủy booking, từ chối, xóa (luôn có xác nhận) |
| `icon` | Tròn 40px, nền trắng, viền | Đóng, sao chép, mũi tên carousel |

Kích thước: `md` cao 48px (form khách), `sm` cao 36px (bảng/quản lý). Bo `--radius-sm`. Có trạng thái `loading` (spinner, vô hiệu hóa, **chống bấm đúp**), `disabled` (nền `--color-primary-disabled`).

### 6.2 Ô nhập (`Input`, `Select`, `Textarea`, `DateRangePicker`)

- Cao 48px, viền `--color-border`, bo `--radius-sm`; focus: viền `--color-ink` 2px (không dùng viền primary).
- Nhãn đặt **phía trên** ô, 14px/500; dòng gợi ý 12px màu muted; lỗi 12px màu danger **phía dưới**, kèm biểu tượng.
- Trường bắt buộc đánh dấu `*` hoặc ghi "(không bắt buộc)" ở trường tùy chọn — chọn một cách và dùng nhất quán (mặc định: ghi chú "không bắt buộc").
- Tiền: ô nhập tiền chỉ nhận chữ số, hiển thị phân cách nghìn, gửi API là **số nguyên**.

### 6.3 Thẻ phòng / homestay (`PropertyCard`, `RoomCard`)

- Không viền, không bóng. Ảnh tỉ lệ **4:3**, bo `--radius-lg`, `object-fit: cover`, có `loading="lazy"`, `alt` mô tả.
- Dưới ảnh: dòng 1 tên (16px/600, tối đa 1 dòng), dòng 2 địa điểm hoặc loại phòng (14px muted), dòng 3 giá (`850.000 ₫ / đêm`, giá in đậm) hoặc hotline.
- Lưới: mobile 1 cột, `md` 2 cột, `lg` 3 cột, `xl` 4 cột; khoảng cách 24px.
- Không có ảnh → khung xám `--color-surface-soft` kèm biểu tượng nhà.

### 6.4 Thanh tìm kiếm (`SearchBar`)

- Dạng pill (`--radius-pill`), viền + `--shadow-1`, chia 4 ô: **Ở đâu** (tỉnh/từ khóa) · **Nhận phòng** · **Trả phòng** · **Khách**; nút tìm là hình tròn primary ở cuối.
- Bấm ô → mở popover (`--shadow-2`): địa điểm gợi ý, lịch 2 tháng (1 tháng trên mobile), bộ đếm khách (− / số / +).
- Dữ liệu gửi `POST /public/availability/search`: `province`, `keyword`, `homestayId`, `checkInDate`, `checkOutDate`, `guestCount`, `page`, `size`. **Trạng thái tìm kiếm lưu trên URL** (`/search?province=...&checkIn=...&checkOut=...&guests=2`) để chia sẻ/tải lại không mất.
- Mobile: thu gọn thành một nút pill "Bắt đầu tìm kiếm", bấm mở màn hình toàn trang.

### 6.5 Badge trạng thái (`StatusBadge`)

- Dạng chip nhỏ: nền `*-soft`, chữ màu đậm tương ứng, bo `--radius-pill`, 12px/500, padding 4×10.
- **Luôn có chữ** (không chỉ màu). Nhãn lấy từ `lib/status.ts` (mục 5.4). Cấm tự gõ nhãn trạng thái trong component.

### 6.6 Lịch đêm (`NightCalendar`)

- Hai chế độ: (a) **chọn khoảng ngày** cho khách; (b) **lưới phòng × ngày** cho Manager (hàng = phòng, cột = ngày).
- Quy ước ô: trống = trắng; `HELD` = nền `--color-warning-soft` + chữ "Giữ"; `BOOKED` = nền `--color-info-soft` + mã booking rút gọn; phòng `LOCKED/INACTIVE` = nền xám sọc.
- Ô một đêm **thuộc về ngày bắt đầu đêm đó**; ngày trả phòng của booking này có thể là ngày nhận của booking khác → **không** tô ô ngày trả phòng.
- Chạm/bấm ô có booking → mở drawer chi tiết booking.

### 6.7 Bảng dữ liệu (`DataTable`)

- Dùng ở trang quản lý. Tiêu đề cột 12px/600 chữ hoa nhẹ muted; hàng cao 56px; viền ngang `--color-border`; hover nền `--color-surface-soft`.
- Hỗ trợ: sắp xếp (nếu API có `sort`), **phân trang theo API** (`page` từ 0, `size` mặc định 20, tối đa 100), bộ lọc ở thanh trên bảng, trạng thái rỗng/đang tải (skeleton).
- Cột tiền căn **phải**, `tabular-nums`; cột hành động ở ngoài cùng bên phải (menu "⋯").
- Mobile: bảng chuyển thành **danh sách thẻ** (mỗi hàng một card).

### 6.8 Modal, Drawer, xác nhận

- Modal `--radius-md`, `--shadow-2`, nền mờ 50% đen; **đóng bằng Esc và nút ×**; focus bị khóa trong modal.
- Hành động **không thể hoàn tác** (hủy booking, duyệt/từ chối giá, xác nhận hoàn tiền, khóa tài khoản, xóa chi phí) phải qua hộp xác nhận nêu rõ **hậu quả** và (nếu API yêu cầu) ô nhập lý do bắt buộc.
- Chi tiết booking/yêu cầu mở dạng **Drawer** bên phải (rộng 480–560px) để Manager không rời danh sách.

### 6.9 Trạng thái đang tải / rỗng / lỗi (bắt buộc cho mọi màn hình có dữ liệu)

| Trạng thái | Cách hiển thị |
|---|---|
| Đang tải | **Skeleton** đúng hình dạng nội dung (không spinner toàn trang). Nút đang gửi thì có spinner trong nút |
| Rỗng | Biểu tượng + 1 câu giải thích + nút gợi ý hành động (ví dụ "Chưa có booking nào" / "Tạo booking") |
| Lỗi tải | Banner danger + nút "Thử lại" (`refetch`). Không để trắng trang |
| Lỗi gửi form | Lỗi theo ô (từ `details[].field`) + toast cho lỗi chung |
| Offline/Mạng lỗi | Toast "Không kết nối được máy chủ" |

Toast: góc trên phải (mobile: trên cùng), tự tắt sau 5 giây, tối đa 3 cái, thành công = success, lỗi = danger **và không tự tắt** nếu cần người dùng đọc.

---

## 7. Màn hình theo từng giao diện

> Quy ước trong mục này: **"Airbnb:"** là điều đã quan sát ở mục 1.2. **"Dự án:"** là phần thêm/đổi do nghiệp vụ của hệ thống. Nếu hai bên khác nhau thì **làm theo "Dự án"**.

---

### 7A. GIAO DIỆN KHÁCH HÀNG (ưu tiên cao nhất)

Layout: `PublicLayout` (4.2). Tinh thần: **ảnh lớn, nhiều khoảng trắng, ít chữ**. Mọi màn hình phải dùng tốt trên điện thoại.

#### 7A.1 Trang chủ `/`

**Airbnb:** header → thanh tìm kiếm Where/When/Who → các carousel theo địa điểm (tiêu đề + dòng phụ + "See all") → thẻ phòng → dải gợi ý → footer.

**Dự án:**

```
[ Header 80px + SearchBar pill ]
Hero (tùy chọn): 1 ảnh lớn bo 20px + tiêu đề "Tìm homestay cho chuyến đi của bạn"
─────────────────────────────────────────────
Homestay tại Hòa Bình                    Xem tất cả ›
Nơi nghỉ dưỡng giữa núi rừng Tây Bắc            (dòng phụ 14px, màu muted)
[Card][Card][Card][Card]  → carousel ngang, mũi tên tròn 2 bên (ẩn trên mobile, vuốt tay)
─────────────────────────────────────────────
Homestay tại Sa Pa                        Xem tất cả ›
[Card][Card][Card][Card]
─────────────────────────────────────────────
Footer
```

- Dữ liệu: `GET /public/homestays?province=<tỉnh>&size=8`, **mỗi tỉnh một carousel**. Danh sách tỉnh lấy từ `GET /public/homestays` (nhóm theo `province`). Dòng phụ dưới tiêu đề là chuỗi tĩnh trong `constants.ts`; thiếu thì bỏ dòng này.
- **Thẻ homestay (`PropertyCard`)**: ảnh `coverImageUrl` (4:3, bo 20px) → dòng 1 **tên** (16px/600) → dòng 2 **tỉnh** (14px muted) → dòng 3 **hotline** (14px). API danh sách **không có giá và không có đánh giá** → **không** hiển thị giá hay sao ở thẻ này. Bấm thẻ → `/homestays/:id`.
- "Xem tất cả" → `/search?province=<tỉnh>` (chưa chọn ngày → xem 7A.2, chế độ danh sách homestay).
- Không làm: tab "Trải nghiệm/Dịch vụ", dải cảm hứng, "Guest favorite".

#### 7A.2 Tìm kiếm và kết quả `/search`

**Thanh tìm kiếm** (Airbnb có 3 ô; dự án **tách ngày thành 2 ô** vì API cần ngày nhận và ngày trả):

| Ô | Nhãn | Placeholder | Popover |
|---|---|---|---|
| 1 | **Ở đâu** | "Tìm điểm đến" | Gợi ý tỉnh; gõ tự do vào `keyword` |
| 2 | **Nhận phòng** | "Thêm ngày" | Lịch chọn khoảng (2 tháng; mobile 1 tháng) |
| 3 | **Trả phòng** | "Thêm ngày" | Cùng lịch ở ô 2 |
| 4 | **Khách** | "Thêm khách" | Bộ đếm − / số / + (tối thiểu 1) |
| ⭘ | nút tròn primary 🔍 | | Bấm → điều hướng `/search?...` |

- Bấm một ô → ô đó nổi (nền trắng, `--shadow-1`), các ô khác xám nhạt, popover mở bên dưới (`--shadow-2`, bo 20px).
- Trạng thái lưu **trên URL**: `/search?province=Hòa Bình&keyword=&checkIn=2026-11-13&checkOut=2026-11-15&guests=2&page=0`. Tải lại hoặc chia sẻ link không mất kết quả.
- **Hai chế độ kết quả:**

| Có `checkIn` và `checkOut`? | Gọi | Hiển thị |
|---|---|---|
| **Có** | `POST /public/availability/search` | Danh sách **phòng** còn trống, kèm tổng tiền |
| **Chưa** | `GET /public/homestays` | Danh sách **homestay** (thẻ như trang chủ) + gợi ý "Chọn ngày để xem phòng trống và giá" |

**Kết quả có ngày** (mỗi phòng một thẻ `RoomResultCard`):

```
┌──────────┐  Phòng 101 · Deluxe                         
│  ảnh 4:3 │  Mai Chau Homestay · Tối đa 2 khách          
│          │  Wi-Fi · Điều hòa · Ban công  (tối đa 3, còn lại "+2")
└──────────┘  1.800.000 ₫ · 2 đêm     (giá in đậm; dòng nhỏ: "Tổng tiền phòng")
```

- **Airbnb** hiển thị "$445 for 2 nights" ngay trên thẻ; dự án làm tương tự bằng `roomTotalPrice` + số đêm tính từ ngày chọn. **Không** hiển thị "giá/đêm" tự tính (giá từng đêm có thể khác nhau).
- Bố cục: desktop **lưới 3–4 cột** hoặc danh sách ngang (ảnh trái, chữ phải); mobile 1 cột, ảnh trên.
- Bấm thẻ → `/rooms/:roomId?checkIn=…&checkOut=…&guests=…` (giữ nguyên ngày đã chọn).
- Thanh lọc phía trên (chip pill): **Homestay**, **Số khách tối đa**. Không lọc theo giá/sao (API không hỗ trợ).
- Kết quả rỗng (`items: []`): biểu tượng + "Không có phòng trống trong khoảng ngày này" + nút "Đổi ngày".
- Phân trang kiểu **"Xem thêm"** (nút ở cuối), `size = 12`.
- Nhãn đếm: "42 phòng" lấy từ `totalElements`.

#### 7A.3 Trang chi tiết phòng `/rooms/:roomId`

**Airbnb:** ảnh → tab neo → tiêu đề → thông số → chủ nhà → highlights → mô tả → tiện nghi → đánh giá → vị trí → **panel đặt sticky**.

**Dự án, thứ tự các khối từ trên xuống:**

| # | Khối | Nội dung | Nguồn dữ liệu |
|---|---|---|---|
| 1 | **Thư viện ảnh** | 1 ảnh lớn trái (50%) + 4 ảnh nhỏ phải (lưới 2×2), cao 400px, bo 20px; nút **"Hiện tất cả ảnh"** góc dưới phải mở lightbox toàn màn hình. Mobile: carousel vuốt, chỉ số "3/12" | `/public/rooms/{id}` → `media[]` (`url`, `caption`) |
| 2 | **Thanh tab neo** (sticky khi cuộn) | **Ảnh · Tiện nghi · Dịch vụ · Vị trí · Quy định**. Bấm = cuộn tới khối. **Không có tab Đánh giá** | — |
| 3 | **Tiêu đề** | `name` (28px/700). Bên dưới: `Phòng {roomType.name} tại {homestay.name}, {province}` | `name`, `roomType`, `homestay` |
| 4 | **Thông số** | `Tối đa {maxGuests} khách` (một dòng 16px, ngăn bằng " · " nếu có thêm thông số). Không bịa số giường/phòng tắm nếu API không có | `maxGuests` |
| 5 | **Khối homestay** (thay cho "chủ nhà") | Ảnh bìa nhỏ tròn + `homestay.name` + địa chỉ ngắn + **nút "Gọi {hotlinePhone}"** (`tel:`), nút phụ "Xem homestay" → `/homestays/:id` | `homestay.*` |
| 6 | **Mô tả** | `description`, rút gọn 5 dòng + "Xem thêm" mở modal | `description` + `roomType.description` |
| 7 | **"Phòng này có gì"** | Lưới 2 cột, mỗi tiện nghi một dòng có biểu tượng; hiện 8 mục đầu + nút **"Hiện tất cả {N} tiện nghi"** (modal) | `amenities[]` |
| 8 | **Dịch vụ có thể đăng ký** | Bảng gọn: tên dịch vụ · đơn vị · giá. Chú thích: "Đăng ký dịch vụ sau khi đặt phòng" | `GET /public/homestays/{id}/services` |
| 9 | **"Bạn sẽ ở đâu"** | Địa chỉ đầy đủ + (nếu có) bản đồ nhúng. **Khác Airbnb**: hiển thị địa chỉ đầy đủ vì homestay công khai | `homestay.address` |
| 10 | **Quy định và chính sách** (Airbnb không có, dự án bắt buộc) | 3 thẻ nhỏ: **Nhận phòng từ 11:00 trở đi** · **Trả phòng đến hết 08:00 (bao gồm 08:00)** · **Cọc và hủy** (cọc theo chính sách, giữ chỗ trong thời hạn, quy tắc hoàn cọc). Nội quy nằm trong "Xem nội quy" (modal) | hằng số `constants.ts` (xem mục 14) |

**Panel đặt phòng** (cột phải, rộng 33%, `position: sticky; top: 112px`, bo 20px, `--shadow-2`, đệm 24px). Có **hai trạng thái**:

*Trạng thái 1, chưa chọn ngày:*

```
┌────────────────────────────────┐
│ 850.000 ₫ / đêm   (giá cơ bản) │
│ ┌─────────────┬──────────────┐ │
│ │ NHẬN PHÒNG  │ TRẢ PHÒNG    │ │
│ │ Thêm ngày   │ Thêm ngày    │ │
│ ├─────────────┴──────────────┤ │
│ │ KHÁCH                1 khách ▾││
│ └────────────────────────────┘ │
│ [   Kiểm tra phòng trống    ]  │  ← nút primary 48px
│ Chưa thu tiền khi đặt phòng    │
└────────────────────────────────┘
```

*Trạng thái 2, đã chọn ngày và còn phòng* (gọi `POST /public/availability/search` với `homestayId`, ngày, `guestCount`, rồi lấy phần tử có đúng `roomId`):

```
┌────────────────────────────────┐
│ 2 đêm tại Mai Chau Homestay    │   ← giống "2 nights in …" của Airbnb
│ [13/11/2026] → [15/11/2026]    │
│ Khách: 2 ▾                     │
│ [        Đặt phòng         ]   │  ← primary
│ Bạn chưa phải trả tiền ngay    │
│ ▸ Giá từng đêm                 │  ← bấm mở: 13/11 — 850.000 ₫ …
│ ──────────────────────────     │
│ Tổng tiền phòng     1.800.000 ₫│
│ Tiền cọc    theo chính sách    │  ← số cụ thể chỉ có sau khi đặt (API)
└────────────────────────────────┘
```

- **Hết phòng** trong khoảng đã chọn: thay khối giá bằng banner warning "Phòng không còn trống ngày này. Vui lòng chọn ngày khác"; nút "Đặt phòng" **vô hiệu hóa**.
- **Số khách vượt `maxGuests`**: bộ đếm không cho tăng quá (chặn ở UI), kèm chú thích "Tối đa {maxGuests} khách".
- **Lịch trong ô ngày**: ngày quá khứ xám; **đêm đã bị giữ/đặt** tô xám gạch chéo (dùng dữ liệu `night-status`, xem mục 14; chưa có thì chỉ báo lỗi sau khi kiểm tra).
- **Mobile**: panel biến thành **thanh cố định dưới đáy** cao 80px: trái `850.000 ₫ / đêm` + dòng nhỏ "13–15/11", phải nút primary **"Đặt phòng"** (hoặc "Chọn ngày" nếu chưa có). Bấm nút mở **bottom sheet** chứa form ngày/khách như trên.
- Bấm "Đặt phòng": chưa đăng nhập → `/login?redirect=/rooms/101?checkIn=…&checkOut=…&guests=2`; đã đăng nhập → `/booking/review?roomId=101&checkIn=…&checkOut=…&guests=2`.

#### 7A.4 Luồng đặt phòng, nộp cọc và theo dõi

Đây là luồng quan trọng nhất của Khách. **Phải xử lý đủ các bước và đủ lỗi.**

**Bước 1. Xác nhận đặt phòng `/booking/review`** *(thiết kế theo mẫu hai cột; xem giới hạn ở 1.3)*

```
┌────────────────────────────────────┬───────────────────────┐
│ Xác nhận đặt phòng                  │ [ảnh] Phòng 101       │
│                                     │ Deluxe · Mai Chau HS  │
│ Chuyến đi của bạn                   │ ───────────────────── │
│  Ngày    13/11 → 15/11 · 2 đêm [Sửa]│ 13/11    850.000 ₫    │
│  Khách   2                    [Sửa] │ 14/11    950.000 ₫    │
│                                     │ ───────────────────── │
│ Liên hệ (từ tài khoản)              │ Tổng tiền phòng       │
│  Nguyen Van A · 09xx · a@mail.com   │              1.800.000│
│                                     │ Cọc: tính sau khi đặt │
│ Ghi chú cho homestay (không bắt buộc)│                       │
│ [____________________________]      │                       │
│                                     │                       │
│ Chính sách: nhận từ 11:00, trả đến  │                       │
│ hết 08:00 (bao gồm 08:00)…          │                       │
│ [ Xác nhận đặt phòng ]  ← primary   │                       │
└────────────────────────────────────┴───────────────────────┘
```

- Khi vào trang, **gọi lại** `POST /public/availability/search` để lấy `quotedNights` mới nhất; giá lệch so với trang phòng thì hiển thị giá mới và báo "Giá đã được cập nhật".
- Thông báo trước nút: **"Khi xác nhận, phòng được giữ cho bạn trong thời hạn đặt cọc. Hết hạn mà chưa cọc, đặt phòng sẽ tự hủy."**
- Bấm nút → `POST /customer/bookings` `{ homestayId, roomIds:[roomId], checkInDate, checkOutDate, guestCount, note }`. **Vô hiệu hóa nút ngay khi bấm** (chống tạo hai booking).
- Thành công `201` → chuyển `/account/bookings/:id` (trạng thái `PENDING_DEPOSIT`).
- Lỗi: `ROOM_NOT_AVAILABLE` → banner + nút "Chọn ngày khác" quay lại `/rooms/:id`; `ROOM_LOCKED`, `HOMESTAY_INACTIVE`, `ROOM_CAPACITY_EXCEEDED` → hiển thị thông báo mục 5.5.

**Bước 2. Chi tiết booking `/account/bookings/:id`: khối hiển thị theo trạng thái**

Cột trái (nội dung chính), cột phải (tóm tắt: ảnh phòng, mã booking có nút sao chép, ngày, số đêm, tổng tiền, đã trả, còn lại).

| Trạng thái | Khối nổi bật ở đầu trang | Hành động của khách |
|---|---|---|
| `PENDING_DEPOSIT` | **Thẻ "Đặt cọc để giữ phòng"** (viền warning): số tiền cọc `depositAmount`, **đồng hồ đếm ngược** tới `holdExpiresAt` (đổi sang màu danger khi còn <2 giờ). Dưới là **hướng dẫn chuyển khoản** (`paymentInstruction`: ngân hàng, số tài khoản, chủ tài khoản, **nội dung chuyển khoản**), mỗi dòng có nút **Sao chép**. Dưới cùng là **form gửi chứng từ** | **Gửi chứng từ cọc** (primary), Hủy đặt phòng (ghost) |
| `PENDING_APPROVAL` | Thẻ info "Đã nhận chứng từ. Quản lý đang xác minh khoản cọc." **Không** có đồng hồ đếm ngược | Hủy đặt phòng |
| `CONFIRMED` | Thẻ success "Đặt phòng đã được xác nhận" + hướng dẫn: nhận phòng từ 11:00, hotline homestay có nút gọi | Đăng ký dịch vụ, Thay đổi, Hủy |
| `CHECKED_IN` | Thẻ teal "Bạn đang lưu trú" + hotline | Đăng ký/hủy dịch vụ |
| `CHECKED_OUT` | Thẻ neutral "Chuyến đi đã hoàn tất" + bảng tổng kết tiền | (chỉ xem) |
| `CANCELLED` | Thẻ danger "Đã hủy" + số tiền hoàn (`refundAmount`) và tình trạng hoàn tiền | (chỉ xem) |
| `EXPIRED` | Thẻ neutral "Hết hạn giữ chỗ" + nút "Đặt lại" (quay `/rooms/:id`) | Đặt lại |

- **Form gửi chứng từ** (`POST …/deposit-submissions`, `multipart/form-data`): `amount` (mặc định = `depositAmount`, số nguyên), `method` (mặc định `BANK_TRANSFER`), `referenceCode` (mặc định = mã booking), `proofFile` (kéo thả hoặc chọn; **xem trước ảnh**; JPG/PNG/WEBP/PDF, ≤ 5 MB). Nút "Gửi chứng từ".
- Gửi xong: cập nhật tại chỗ sang `PENDING_APPROVAL` (invalidate query), toast "Đã gửi chứng từ. Quản lý sẽ xác minh khoản cọc."
- Lỗi `DEPOSIT_AMOUNT_INVALID`: gắn vào ô số tiền. `FILE_TOO_LARGE`/`UNSUPPORTED_MEDIA_TYPE`: gắn vào ô tệp.
- Nếu một khoản cọc bị từ chối, booking quay về `PENDING_DEPOSIT`: hiển thị **lý do từ chối** (nếu API trả) ngay trên thẻ cọc và cho gửi lại.
- Khối **Thanh toán**: bảng các khoản (`DEPOSIT`/`PAYMENT`/`REFUND`, số tiền, trạng thái, thời điểm).
- Khối **Dịch vụ**: danh sách dòng dịch vụ (`REGISTERED/USED/CANCELLED`), nút **Thêm dịch vụ** (chỉ khi `CONFIRMED` hoặc `CHECKED_IN`): chọn dịch vụ từ danh mục công khai + số lượng + chọn phòng. Hủy dòng `REGISTERED` bằng nút thùng rác có xác nhận.

**Hủy đặt phòng (khách):**
- Hộp xác nhận nêu rõ: "Đặt phòng sẽ bị hủy và các đêm đã giữ được trả lại. Số tiền hoàn do hệ thống tính theo chính sách, bạn không thể tự nhập." + ô lý do (tùy chọn).
- Sau `POST …/cancel`: hiển thị `refundAmount`. `> 0` → thông báo "Quản lý sẽ hoàn tiền thủ công cho bạn"; `= 0` → "Không có khoản hoàn lại theo chính sách".

#### 7A.5 Danh sách chuyến đi `/account/bookings`

- Tab trạng thái dạng chip: **Tất cả · Chờ cọc · Chờ xác nhận · Sắp tới (`CONFIRMED`) · Đang ở · Đã hoàn tất · Đã hủy**.
- Mỗi booking một thẻ ngang: ảnh nhỏ, tên homestay, mã, ngày → ngày, tổng tiền, `StatusBadge`. Bấm → chi tiết.
- Booking `PENDING_DEPOSIT` hiển thị thêm dòng **"Còn {hh:mm} để đặt cọc"** màu warning và nút primary nhỏ "Đặt cọc".
- Rỗng: "Bạn chưa có chuyến đi nào" + nút "Tìm homestay".

#### 7A.6 Tài khoản và xác thực

- `/login`, `/register`: trang giữa màn hình, thẻ trắng rộng tối đa 440px, một nút primary. Đăng ký có yêu cầu mật khẩu hiển thị sẵn.
- `/account`: hai khối **Thông tin cá nhân** (tên, SĐT; email chỉ đọc) và **Đổi mật khẩu**.
- Quên/đặt lại mật khẩu: hai trang riêng, thông báo sau khi gửi luôn trung tính ("Nếu email tồn tại, chúng tôi đã gửi hướng dẫn").

#### 7A.7 Điều cần tránh trên giao diện Khách

- Không hiển thị mã trạng thái thô (`PENDING_DEPOSIT`); luôn dùng nhãn tiếng Việt (mục 5.4).
- Không hiển thị thuật ngữ nội bộ (slot, policy snapshot, payment id).
- Không bắt khách đăng nhập **trước** khi xem phòng và giá; chỉ chặn ở bước "Đặt phòng".
- Không để mất lựa chọn ngày/khách khi chuyển trang hoặc đăng nhập (giữ trên URL).

---

### 7B. GIAO DIỆN QUẢN LÝ HOMESTAY, MANAGER (ưu tiên cao nhì)

Layout: `BackOfficeLayout` (4.2), menu ở 4.3. Tinh thần: **làm việc hằng ngày nhanh**. Manager mở trang là thấy ngay việc cần xử lý; mọi thao tác chính nằm trong **drawer** hoặc **modal** để không mất danh sách.

Nguyên tắc riêng:

- Phạm vi homestay do backend suy ra từ tài khoản. **Không bao giờ gửi `homestayId`** trong request của Manager (trừ API công khai).
- Chỉ hiện **nút hợp lệ với trạng thái hiện tại** (bảng 7B.3). Không hiện nút xám cho thao tác không thể làm.
- Mật độ cao hơn Khách: chữ bảng 14px, hàng cao 56px, nút `sm` 36px.

#### 7B.1 Hôm nay `/manager` (trang đầu; tương ứng tab *Today* của Airbnb)

**Airbnb:** Today liệt kê đặt phòng hiện tại và sắp tới, mỗi đặt phòng có **một gợi ý hành động**. **Dự án** giữ ý đó nhưng nhóm theo việc cần làm:

```
Hôm nay, Thứ Bảy 17/10/2026                           [ + Đặt phòng hộ khách ]
─────────────────────────────────────────────────────────────────────────────
 Thẻ số:  [ Chờ xác nhận cọc  3 ]  [ Nhận phòng hôm nay  2 ]  [ Đang ở  5 ]
          [ Trả phòng hôm nay  1 ]  [ Hoàn tiền chờ xử lý  1 ]
─────────────────────────────────────────────────────────────────────────────
 ① Cần xác nhận cọc (3)                                       Xem tất cả ›
   HS-261010-0501 · Nguyen Van A · P101 · 10→12/10 · cọc 540.000 ₫  [Xem chứng từ]
 ② Nhận phòng hôm nay (2)
   HS-261017-0507 · Tran Thi B · P102 · 2 khách                      [Check-in]
 ③ Trả phòng hôm nay (1)
   HS-261015-0499 · Le Van C · P103 · còn phải thu 1.460.000 ₫     [Check-out]
 ④ Hoàn tiền chờ xử lý (1)
   HS-261012-0480 · Pham D · cần hoàn 378.000 ₫                [Xác nhận hoàn]
```

- Thẻ số ở trên là **bộ lọc nhanh**: bấm một thẻ → danh sách bên dưới thu gọn vào nhóm đó.
- Mỗi dòng có **đúng một nút hành động** (gợi ý, kiểu Airbnb), mở drawer/modal tương ứng. Bấm vào dòng (không phải nút) mở drawer chi tiết.
- Nguồn dữ liệu: `GET /manager/bookings` với bộ lọc `status`, `fromDate`, `toDate`; hoặc `GET /manager/reports/overview` cho các con số. Ánh xạ nhóm:

| Nhóm | Điều kiện lọc |
|---|---|
| Cần xác nhận cọc | `status=PENDING_APPROVAL` |
| Nhận phòng hôm nay | `status=CONFIRMED`, `checkInDate=hôm nay` |
| Đang ở | `status=CHECKED_IN` |
| Trả phòng hôm nay | `status=CHECKED_IN`, `checkOutDate=hôm nay` |
| Hoàn tiền chờ xử lý | thiếu API tổng hợp, xem mục 14 |

- Không làm: ghi chú riêng, tin nhắn (dự án không có dữ liệu).

#### 7B.2 Danh sách đặt phòng `/manager/bookings`

- Thanh trên: ô tìm kiếm (**mã booking hoặc SĐT**, `keyword`), bộ lọc trạng thái (chip), khoảng ngày (`fromDate`/`toDate`), nút primary **"+ Đặt phòng hộ khách"**.
- Tab nhanh: **Tất cả · Chờ xác nhận (n) · Sắp nhận phòng · Đang ở · Đã hủy**. Số `n` lấy từ `meta.totalElements`.
- Cột bảng: **Mã** · **Khách** (`contactName`) · **Phòng** · **Ngày ở** (`10/10 → 12/10 · 2 đêm`) · **Trạng thái** (`StatusBadge`) · **Tổng tiền** (căn phải) · **⋯**.
- Bấm hàng → **drawer chi tiết** bên phải (rộng 560px). URL đổi thành `/manager/bookings/:id` để chia sẻ/tải lại.
- Phân trang dưới bảng (`size` 20). Mobile: mỗi hàng thành thẻ.

#### 7B.3 Chi tiết đặt phòng (drawer) và các thao tác

**Cấu trúc drawer, từ trên xuống:**

```
┌──────────────────────────────────────────────┐
│ HS-261010-0501  [Chờ xác nhận]            ✕  │
│ Nguyen Van A · 0912345678 · a@mail.com        │
├──────────────────────────────────────────────┤
│ [Hành động chính theo trạng thái]  [⋯ thêm]   │  ← thanh hành động cố định
├──────────────────────────────────────────────┤
│ ▍ Lưu trú     10/10 → 12/10 · 2 đêm · 2 khách │
│   Phòng 101 · 10/10 850.000 · 11/10 950.000   │
│ ▍ Tiền        Tổng phòng 1.800.000            │
│               Dịch vụ đã dùng 200.000          │
│               Đã thu 540.000 · Còn thu 1.460.000│
│               Đang chờ hoàn 0                  │
│ ▍ Thanh toán  bảng DEPOSIT/PAYMENT/REFUND     │
│ ▍ Dịch vụ     bảng dòng dịch vụ               │
│ ▍ Ghi chú     note của khách                  │
└──────────────────────────────────────────────┘
```

- Dữ liệu: `GET /manager/bookings/{id}` (booking, phòng, đêm) + `GET …/balance` (khối Tiền) + `GET …/payments` + `GET …/services`. Gọi song song, hiển thị skeleton từng khối.
- Ảnh chứng từ trong khối Thanh toán: bấm mở lightbox phóng to.

**Nút hành động theo trạng thái:**

| Trạng thái | Nút chính (primary) | Nút phụ (⋯ hoặc secondary) |
|---|---|---|
| `PENDING_DEPOSIT` | **Ghi nhận cọc tại quầy** | Điều chỉnh · Hủy |
| `PENDING_APPROVAL` | **Duyệt cọc** (cùng nút **Từ chối**, danger) | Điều chỉnh · Hủy |
| `CONFIRMED` | **Check-in** | Đặt dịch vụ hộ · Điều chỉnh · Hủy |
| `CHECKED_IN` | **Check-out và quyết toán** | Đặt dịch vụ hộ · Hủy dịch vụ |
| `CHECKED_OUT`, `EXPIRED` | (không có) | (chỉ xem) |
| `CANCELLED` có khoản `REFUND` đang `PENDING` | **Xác nhận đã hoàn tiền** | (chỉ xem) |

Chi tiết từng thao tác:

1. **Duyệt/Từ chối cọc** (`POST …/deposit-review`, body `{ paymentId, decision: "APPROVE" | "REJECT", reason }`)
   - Chọn khoản cần duyệt (`PENDING`) từ khối Thanh toán; hiện ảnh chứng từ + số tiền + mã tham chiếu cạnh nhau để đối chiếu.
   - **Duyệt** → hộp xác nhận ngắn "Xác nhận đã nhận {số tiền}?". **Từ chối** → **bắt buộc nhập lý do**.
   - Lỗi: `PAYMENT_ALREADY_REVIEWED` (đã có người xử lý → tải lại), `DEPOSIT_AMOUNT_INVALID`.
2. **Ghi nhận cọc tại quầy** (`POST …/payments`, body `{ type: "DEPOSIT", amount, method, note }`)
   - Modal 3 ô: số tiền (gợi ý bằng `depositAmount`), phương thức (Tiền mặt/Chuyển khoản), ghi chú. `type` luôn là `DEPOSIT`, **không cho chọn**.
   - `DEPOSIT_AMOUNT_INSUFFICIENT`: báo "Số tiền chưa đủ cọc theo chính sách"; booking **chưa** chuyển trạng thái.
3. **Check-in** (`POST …/check-in`, body `{ actualGuestCount, note }`)
   - Modal nhỏ: số khách thực tế (mặc định = `guestCount`), ghi chú. Nhắc dòng chữ "Nhận phòng từ 11:00". **Không** ghi giờ thực tế (hệ thống không lưu).
4. **Check-out và quyết toán** (`POST …/check-out`): **modal 3 bước**, cuối cùng chỉ gửi **một request**.
   - *Bước 1, dịch vụ:* liệt kê mọi dòng dịch vụ `REGISTERED`; mỗi dòng chọn **Đã dùng / Không dùng** (radio, **không có mặc định**). Nút "Tiếp" chỉ bật khi **tất cả** đã chọn (khớp `SERVICE_USAGE_SELECTION_INCOMPLETE`). Không có dịch vụ nào thì bỏ qua bước này.
   - *Bước 2, tổng kết:* hiển thị Tiền phòng + Dịch vụ đã dùng = **Tổng phải thu**; trừ **Đã thu** = **Còn phải thu**. Tính ở frontend **chỉ để xem trước** (cộng `totalPrice` các dòng được chọn "Đã dùng"); số cuối cùng do server trả.
   - *Bước 3, thu tiền:* nếu còn phải thu > 0 thì hiện form thu (số tiền mặc định = còn phải thu, phương thức, mã tham chiếu, ghi chú). Còn phải thu = 0 thì **bỏ qua**, gửi `payment: null`. Nút cuối "Hoàn tất check-out" (primary).
   - Lỗi hiển thị ngay trong bước liên quan: `PAYMENT_AMOUNT_MISMATCH` ở bước 3, `OUTSTANDING_BALANCE` ở bước 3, `CHECKOUT_NOT_ALLOWED` thì đóng modal và tải lại.
   - Thành công: toast "Đã trả phòng. Còn phải thu: 0 ₫" và đổi trạng thái `CHECKED_OUT`.
5. **Hủy đặt phòng** (`POST …/cancel`, body `{ reason, requestedByCustomer }`)
   - Hộp xác nhận: ô **lý do (bắt buộc)** + công tắc "Khách yêu cầu hủy" (`requestedByCustomer`).
   - **Không có ô nhập số tiền hoàn**; số hoàn do server tính. Sau khi hủy, nếu `refundRequired` thì đổi nút chính sang **Xác nhận đã hoàn tiền** và nhắc "Cần hoàn {refundAmount}".
6. **Xác nhận đã hoàn tiền** (`POST /manager/payments/{paymentId}/confirm`, body `{ referenceCode, note }`): modal 2 ô (mã giao dịch hoàn, ghi chú). Chỉ gọi khi đã **thực sự chuyển tiền ngoài hệ thống**; ghi rõ ngay trong modal.
7. **Điều chỉnh** (`PATCH …/{id}`, body ngày/phòng/số khách/lý do): form giống đặt phòng; sau khi lưu hiển thị **tổng tiền và cọc mới** do server trả. Lỗi `ADJUSTMENT_WINDOW_CLOSED`, `ROOM_NOT_AVAILABLE`, `PRICE_RECALCULATION_REQUIRED`.
8. **Đặt/hủy dịch vụ hộ** (`POST/DELETE …/services`): chọn phòng thuộc booking → chọn dịch vụ → số lượng.

#### 7B.4 Đặt phòng hộ khách `/manager/bookings/new`

Dùng khi khách gọi điện hoặc đến trực tiếp (`POST /manager/bookings`). Form **một trang, hai cột**:

| Cột trái (form) | Cột phải (tóm tắt, sticky) |
|---|---|
| 1. **Khách**: `contactName`*, `contactPhone`*, `contactEmail` (không bắt buộc). 2. **Lưu trú**: chọn ngày nhận/trả, số khách. 3. **Phòng**: danh sách phòng trống (lấy từ `availability/search` với `homestayId` của mình; chọn một hoặc nhiều). 4. **Ghi chú** | Ngày, số đêm, các phòng đã chọn, **tổng tiền phòng** (từ `roomTotalPrice`), nút primary **"Tạo đặt phòng"** |

- Thành công: màn hình kết quả có mã booking, **hạn giữ chỗ** (`holdExpiresAt`), `depositAmount`, hai nút: **"Ghi nhận cọc ngay"** (mở modal ở 7B.3 mục 2) và "Về danh sách".

#### 7B.5 Lịch `/manager/calendar` (tương ứng tab *Calendar*)

**Airbnb:** lịch quản lý trống/bận theo đêm và giá. **Dự án:** lịch **xem tình trạng**; giá nằm ở trang Giá (7B.7).

```
        T7 17  CN 18  T2 19  T3 20  T4 21  T5 22  T6 23 ...
P101   [████ HS-0501 ████][      ][ giữ ][        ]
P102   [      ][████ HS-0507 ███████████][        ]
P103   [░░░░░░░░░░░░ khóa ░░░░░░░░░░░░░░░░░░░░░░░░░░░]
```

- **Hàng = phòng, cột = ngày** (hiển thị 14 ngày, nút ‹ › đổi tuần/tháng, nút "Hôm nay"). Cột ngày hôm nay có nền `--color-primary-soft`.
- Quy ước ô và màu: **mục 6.6**. Booking nhiều đêm gộp thành **một thanh liền** từ đêm đầu tới đêm cuối; ô ngày trả phòng **không tô**.
- Bấm vào thanh booking → mở drawer chi tiết (7B.3). Bấm vào ô trống → mở "Đặt phòng hộ khách" với phòng và ngày đã điền sẵn.
- **Khác Airbnb:** hệ thống **không chặn từng đêm**; chỉ khóa **cả phòng** qua trạng thái phòng (`LOCKED`). Phòng khóa hiển thị cả hàng sọc xám. Không có nút "chặn đêm này".
- Dữ liệu: cần endpoint tình trạng đêm cho Manager (xem mục 14). Tạm thời gọi `GET /public/rooms/{roomId}/night-status` cho từng phòng.

#### 7B.6 Phòng `/manager/rooms` (tương ứng tab *Listings*)

- Lưới thẻ phòng (3 cột): ảnh, tên, loại phòng, **sức chứa**, `StatusBadge` trạng thái phòng, giá cơ bản/đêm (`GET …/base-price`), nút ⋯ (Sửa, Khóa/Mở, Ngừng khai thác).
- **Khóa/Mở/Ngừng khai thác** (`PATCH …/status`): hộp xác nhận. Nếu phòng còn booking tương lai, nêu rõ "Không ảnh hưởng booking đã có" hoặc hiển thị lỗi server.
- **Sửa phòng** `/manager/rooms/:id`, ba tab: **Thông tin** (tên, loại phòng, sức chứa, mô tả, tiện nghi) · **Ảnh** (xem dưới) · **Giá** (chỉ đọc, kèm link sang `/manager/pricing`).
- **Xem trước như khách thấy** (nút ở góc trên): mở `/rooms/:id` ở tab mới. Đây là điểm mượn từ nút "preview" của Airbnb Listings.
- **Tab Ảnh** (`POST /manager/media`, `ownerType=ROOM`, `ownerId=<id phòng>`): lưới ảnh, kéo thả để tải lên (nhiều tệp), mỗi ảnh có `caption` và thứ tự (`sortOrder`, kéo để đổi), nút xóa (`DELETE /manager/media/{id}`, có xác nhận). Ảnh đầu tiên là ảnh bìa. Ghi chú "JPG/PNG/WEBP, ≤ 5 MB".
- **Loại phòng** `/manager/room-types`: bảng gọn + modal tạo/sửa. Xóa chỉ được khi chưa phòng nào dùng (hiển thị lỗi server nếu bị chặn).

#### 7B.7 Giá `/manager/pricing`

Ba tab. **Mọi thay đổi đều qua Director duyệt, không áp dụng ngay.**

| Tab | Nội dung | API |
|---|---|---|
| **Giá cơ bản** | Bảng mỗi phòng một dòng: tên phòng, giá/đêm hiện tại, nút "Đề xuất giá mới" | `GET /manager/rooms/{id}/base-price` |
| **Quy tắc điều chỉnh** | Bảng quy tắc đang áp dụng (`GET /manager/price-rules`): tên, phạm vi (phòng/tất cả), ngày áp dụng (thứ trong tuần hoặc khoảng ngày), kiểu (`PERCENT`/`FIXED_PRICE`), giá trị, độ ưu tiên. Nút **"Đề xuất quy tắc mới"**; mỗi dòng có "Đề xuất sửa" và "Đề xuất ngừng áp dụng" | `GET /manager/price-rules` |
| **Yêu cầu của tôi** | Bảng yêu cầu đã gửi: loại (`CREATE/UPDATE/DEACTIVATE`), trạng thái (Chờ duyệt/Đã duyệt/Bị từ chối), ngày gửi, lý do từ chối; bấm xem chi tiết | `GET /manager/price-rule-change-requests` |

- Form đề xuất (`POST /manager/price-rule-change-requests`, body `{ requestType, targetRuleId, proposedRule:{ roomId, ruleType, name, weekdays, startDate, endDate, adjustType, adjustValue, priority } }`):
  - Chọn **phạm vi**: tất cả phòng (`roomId=null`) hoặc một phòng.
  - Chọn **ngày áp dụng**: nhóm checkbox thứ (T2…CN) **hoặc** khoảng ngày; không bắt buộc cả hai.
  - **Kiểu điều chỉnh**: `PERCENT` (ô có dấu %, cho số âm/dương) hoặc `FIXED_PRICE` (ô tiền VND).
  - **Độ ưu tiên**: số nguyên, kèm chú thích "Số lớn hơn thắng khi hai quy tắc trùng ngày".
  - Có khối **xem trước**: "Ví dụ: giá cơ bản 850.000 ₫ → 1.020.000 ₫ vào Thứ Sáu, Thứ Bảy" (chỉ minh họa tính ở frontend; ghi chú "giá chính thức do hệ thống tính").
- Sau khi gửi: toast "Đã gửi yêu cầu, chờ Giám đốc duyệt". Quy tắc hiện hành **giữ nguyên** hiển thị; mục có yêu cầu đang chờ gắn badge **Chờ duyệt** và vô hiệu hóa nút sửa (khớp `PRICE_REQUEST_ALREADY_PENDING`).
- Lỗi: `PRICE_RULE_CONFLICT`, `INVALID_PRICE_RULE`, `ROOM_NOT_FOUND` (mục 5.5).

#### 7B.8 Dịch vụ `/manager/services`

- Hai tab: **Dịch vụ** (bảng: tên, danh mục, đơn vị, đơn giá, trạng thái) và **Danh mục**.
- Tạo/sửa dịch vụ bằng modal (`POST/PATCH /manager/services`). Đổi giá có hiệu lực cho dòng dịch vụ **đăng ký mới**, **không** đổi giá dòng đã đăng ký (ghi chú ngay trong modal).
- Xóa danh mục chỉ khi chưa dịch vụ nào dùng.

#### 7B.9 Chi phí `/manager/expenses`

- Bảng: ngày, danh mục, nhà cung cấp, loại chứng từ, số chứng từ, phương thức thanh toán, số tiền (phải), 📎 nếu có `proofUrl`.
- Bộ lọc: khoảng ngày, danh mục, loại chứng từ, phương thức, nhà cung cấp (khớp query của `GET /manager/expenses`). Hàng tổng cuối bảng: **Tổng chi** của kết quả đang lọc.
- Form tạo/sửa (`multipart/form-data`) chia hai khối:
  - **Khoản chi**: danh mục*, số tiền* (> 0), ngày chi*, mô tả.
  - **Chứng từ (không bắt buộc)**: nhà cung cấp, loại chứng từ (`INVOICE/RECEIPT/BANK_TRANSFER_CONFIRMATION/OTHER`), số chứng từ, ngày chứng từ, mã giao dịch, phương thức (`CASH/BANK_TRANSFER/CARD/OTHER`), tệp (`proofFile`, ảnh hoặc PDF).
- Xóa khoản chi: hộp xác nhận. Quản lý danh mục chi phí: modal riêng từ nút "Danh mục".

#### 7B.10 Báo cáo `/manager/reports`

- Bộ lọc kỳ ở đầu (`fromDate`, `toDate`; mặc định tháng hiện tại; nút nhanh "Tháng này / Tháng trước / 3 tháng").
- Hàng **thẻ chỉ số**: Doanh thu · Chi phí · **Lợi nhuận** · Số đêm-phòng đã dùng · **Công suất %**.
- Hai tab: **Tài chính** (biểu đồ cột doanh thu và chi phí theo tháng + bảng) và **Công suất** (biểu đồ đường theo ngày/tháng + bảng theo phòng).
- Công suất = số đêm-phòng đã dùng ÷ (số phòng `ACTIVE` × số đêm trong kỳ). Dùng đúng thuật ngữ **"đêm-phòng"**.
- Biểu đồ: màu `--color-primary` và xám trung tính; có tooltip; có bảng số liệu dưới biểu đồ (để đọc chính xác và cho trình đọc màn hình).

#### 7B.11 Homestay `/manager/homestay`

- Form: tên, tỉnh, địa chỉ, **hotline** (bắt buộc), mô tả (`PATCH /manager/homestay`).
- Khối **Ảnh homestay** giống tab Ảnh của phòng (`ownerType=HOMESTAY`).
- Tài khoản Manager chưa được gán: toàn bộ khu vực `/manager/**` hiện **một trang thông báo** "Tài khoản của bạn chưa được gán homestay. Vui lòng liên hệ Giám đốc" (khi gặp `HOMESTAY_NOT_ASSIGNED`).

#### 7B.12 Phím tắt và thao tác nhanh (nên có)

| Phím | Việc |
|---|---|
| `Esc` | Đóng drawer/modal |
| `/` | Focus ô tìm kiếm danh sách |
| `g` rồi `h` | Về Hôm nay (tùy chọn) |

---

### 7C. GIAO DIỆN GIÁM ĐỐC, DIRECTOR

Layout: `BackOfficeLayout`. Dùng **lại toàn bộ component của 7B** (bảng, drawer, thẻ chỉ số). Chỉ khác menu: **Tổng quan · Homestay · Chính sách · Duyệt giá · Báo cáo**.

**Tổng quan `/director`:** hàng thẻ chỉ số toàn công ty (`GET /director/reports/overview`) + khối **"Yêu cầu giá chờ duyệt (n)"** (5 yêu cầu mới nhất, link "Xem tất cả") + bảng homestay (tên, Manager, số phòng, công suất).

**Duyệt giá `/director/price-approvals`:**

- Tab **Chờ duyệt · Đã duyệt · Bị từ chối** (`GET /director/price-rule-change-requests?status=`).
- Cột: homestay, người gửi, loại (Thêm/Sửa/Ngừng), tóm tắt quy tắc, ngày gửi.
- Bấm hàng → drawer **"So sánh Trước và Sau"** (`GET …/{id}`): hai cột *Hiện tại* (quy tắc đang áp dụng, bỏ trống khi `CREATE`) và *Đề xuất* (`proposedRule`); ô khác nhau tô `--color-warning-soft`. Dưới có người gửi và thời điểm gửi.
- Nút **Duyệt** (primary, có xác nhận "Quy tắc sẽ áp dụng ngay cho báo giá mới") và **Từ chối** (danger, **bắt buộc nhập lý do**).
- Lỗi: `PRICE_REQUEST_ALREADY_REVIEWED` (có người xử lý rồi → tải lại), `PRICE_RULE_CONFLICT`.
- Yêu cầu đã xử lý chỉ xem, không có nút.

**Homestay `/director/homestays`:** bảng (tên, tỉnh, hotline, Manager phụ trách, trạng thái). Nút **"+ Thêm homestay"** (form: tên*, tỉnh*, địa chỉ*, **hotline\***, mô tả). Menu ⋯: Sửa, **Gán/Gỡ Manager** (`PUT …/manager`; chọn Manager chưa có homestay, hoặc "Gỡ"), Ngừng/Kích hoạt (cảnh báo `HOMESTAY_HAS_ACTIVE_BOOKINGS` nếu còn booking).

**Chính sách `/director/policies`:** nhóm theo `policyGroup` (accordion), mỗi chính sách một dòng gồm tên, mô tả, **ô nhập đúng theo `valueType`** (`INT` số nguyên, `TIME` chọn giờ, `TEXT`, `JSON`) và nút "Lưu" riêng cho từng dòng (`PUT /director/policies/{group}/{key}`).
- Quy tắc hoàn tiền dạng JSON: **không để người dùng gõ JSON thô**. Dùng bảng "Từ … ngày trước nhận phòng → hoàn … % tiền cọc" rồi chuyển thành JSON khi lưu.
- Hiển thị **cảnh báo** trước khi lưu: "Chính sách mới chỉ áp dụng cho booking tạo sau thời điểm lưu" *(nếu backend đúng như vậy; xác nhận lại với nghiệp vụ trước khi hiển thị câu này)*.

**Báo cáo `/director/reports`:** giống 7B.10, thêm bộ lọc **Homestay** (tất cả hoặc một) và bảng so sánh giữa các homestay.

---

### 7D. GIAO DIỆN QUẢN TRỊ, ADMIN

Admin **chỉ quản lý tài khoản**, không đụng nghiệp vụ homestay. Một mục menu duy nhất: **Tài khoản** `/admin/users`.

- Bảng: họ tên, email, SĐT, **vai trò** (badge), trạng thái (`ACTIVE`/`LOCKED`), ngày tạo. Bộ lọc: vai trò, trạng thái, từ khóa. Nút primary **"+ Tạo tài khoản"**.
- **Tạo tài khoản nội bộ** (`POST /admin/users`): họ tên*, email*, SĐT, **vai trò** (Quản lý / Giám đốc / Quản trị), mật khẩu tạm. **Không có ô chọn homestay**: việc gán Manager vào homestay là của Giám đốc (hiển thị chú thích dưới ô vai trò Quản lý).
- **Khóa/Mở khóa** (`PATCH …/status`): hộp xác nhận nêu hậu quả ("Người này sẽ không đăng nhập được"). Lỗi `CANNOT_LOCK_LAST_ADMIN`. Không cho tự khóa chính mình (ẩn nút ở dòng của mình).
- Không làm: xem/sửa booking, giá, homestay.


---

## 8. Công nghệ mặc định và cấu trúc thư mục

> Mặc định cho dự án mới. Nếu repo đã khác → giữ repo (mục 0).

| Việc | Lựa chọn mặc định |
|---|---|
| Nền | React 18 + **Vite** + **TypeScript** (strict) |
| Định tuyến | React Router v6 |
| Gọi API + cache | **Axios** + **TanStack Query** |
| Form + kiểm tra | React Hook Form + **Zod** |
| Giao diện | Tailwind CSS + token mục 3; thành phần nền tảng truy cập được (Radix UI hoặc shadcn/ui) |
| Ngày | `dayjs` (plugin `customParseFormat`, `utc`, `timezone`) hoặc `date-fns` |
| Chọn khoảng ngày | `react-day-picker` |
| Biểu đồ | Recharts |
| Biểu tượng | `lucide-react` |
| Kiểm thử | Vitest + React Testing Library (logic `lib/` bắt buộc có test) |

```
src/
  app/                 # router, providers (QueryClient, Auth), layouts (PublicLayout, ManagerLayout…)
  components/ui/       # Button, Input, Select, Modal, Drawer, DataTable, StatusBadge, Toast, Skeleton…
  features/
    auth/              # login, register, quên mật khẩu, AuthContext, RequireRole
    search/            # SearchBar, kết quả availability
    homestays/         # trang công khai + manager/director homestay
    rooms/
    bookings/          # customer + manager (api.ts, hooks.ts, components/, pages/)
    payments/
    pricing/           # giá cơ bản, quy tắc, yêu cầu đổi giá, duyệt giá
    services/
    expenses/
    reports/
    policies/
    users/             # admin
    media/
  lib/
    api/               # axios instance, envelope, interceptors, endpoints
    format.ts          # formatVnd, formatDate, formatDateTime, nightsBetween
    status.ts          # nhãn/màu trạng thái (mục 5.4)
    errors.ts          # ánh xạ mã lỗi (mục 5.5)
    constants.ts       # CHECK_IN_TIME='11:00', CHECK_OUT_DEADLINE='08:00', page size…
  styles/tokens.css
  mocks/               # dữ liệu giả cho API chưa có (mục 14)
  types/               # kiểu TypeScript khớp tài liệu API
```

Trong mỗi feature có cả hai giao diện thì **tách thư mục trang theo vai trò**: `pages/customer/…` và `pages/manager/…` (Director: `pages/director/…`). Component dùng riêng cho một giao diện đặt trong `components/` của đúng vai trò đó; chỉ đưa lên `components/ui/` khi cả hai bên cùng dùng.

Quy ước đặt tên:

- Thành phần React: `PascalCase.tsx`; hook: `useXxx.ts`; hàm/biến: `camelCase`; hằng: `UPPER_SNAKE`; thư mục: `kebab-case`.
- Mỗi feature có `api.ts` (hàm gọi API thuần), `hooks.ts` (TanStack Query hooks), `schemas.ts` (Zod), `types.ts`. **Component không gọi axios trực tiếp.**
- Kiểu TypeScript đặt đúng theo tên trường API (camelCase). **Cấm `any`**; dữ liệu API không chắc chắn dùng `unknown` + Zod parse ở biên.
- Một component tối đa ~250 dòng; quá thì tách. Không để logic nghiệp vụ trong JSX.

---

## 9. Tầng gọi API

**Cấu hình** `src/lib/api/client.ts`:

- `baseURL = import.meta.env.VITE_API_BASE_URL` (mặc định `http://localhost:8080/api/v1`). Endpoint trong code viết **rút gọn sau `/api/v1`** như tài liệu (`/customer/bookings`).
- Header `Authorization: Bearer <accessToken>` cho mọi endpoint trừ: `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, và `/public/**`.

**Phong bì phản hồi** (mọi API trả JSON theo dạng):

```ts
type ApiSuccess<T> = { success: true; data: T; meta: Meta | null };
type ApiError = { success: false; error: { code: string; message: string; details?: { field: string; reason: string }[] }; timestamp: string; path: string };
type Meta = { page: number; size: number; totalElements: number; totalPages: number };
```

- Interceptor "mở phong bì": hàm API trả thẳng `data` (và `meta` nếu là danh sách); lỗi ném `ApiError` đã chuẩn hóa. Một số API tìm kiếm công khai (availability, danh sách homestay) trả `{ items, page, size, totalElements, totalPages }` không bọc — viết adapter riêng trong `api.ts` của feature để **component luôn nhận một dạng thống nhất**.
- **Làm mới token:** gặp `401` với `TOKEN_EXPIRED` → gọi `/auth/refresh` **một lần** (xếp hàng các request đang chờ, tránh gọi nhiều lần), thử lại request gốc; refresh thất bại → xóa phiên, chuyển `/login`.
- Lưu token: **accessToken trong bộ nhớ** (state), **refreshToken trong `localStorage`**. Ghi chú này là đánh đổi chấp nhận được cho đồ án; không lưu mật khẩu, không log token ra console.
- Đăng xuất: gọi `/auth/logout`, xóa token, xóa cache TanStack Query.

**Quy tắc TanStack Query:**

- Query key: `[feature, resource, params]`, ví dụ `['bookings','manager','list',{status,page}]`.
- Sau mutation: `invalidateQueries` đúng key liên quan (ví dụ duyệt cọc → danh sách booking + chi tiết + số badge chờ xác nhận).
- Mutation **chống gửi trùng**: vô hiệu hóa nút khi `isPending`. Với tạo booking, tránh bấm đúp tạo hai đơn.
- Danh sách phân trang: `placeholderData: keepPreviousData` để không nháy trắng.
- Dữ liệu tra cứu (availability) `staleTime` ngắn (≤ 30 giây) vì phòng có thể bị đặt mất bất cứ lúc nào; **luôn dựa vào kết quả server lúc tạo booking** (lỗi `ROOM_NOT_AVAILABLE` phải được xử lý mượt: báo, giữ nguyên lựa chọn khác, cho chọn lại ngày).

**Upload tệp (`multipart/form-data`):** dùng `FormData`, **không** tự đặt `Content-Type` (để trình duyệt thêm boundary). Kiểm tra phía client trước: định dạng (`image/jpeg`, `image/png`, `image/webp`, `application/pdf` tùy chỗ) và dung lượng (≤ 5 MB nếu server chưa quy định khác); vẫn xử lý `FILE_TOO_LARGE`/`UNSUPPORTED_MEDIA_TYPE` từ server. Ảnh server trả đường dẫn dạng `/files/...` → ghép với origin của API; qua một hàm `fileUrl()`.

---

## 10. Phân quyền ở giao diện

- `RequireRole roles={['MANAGER']}` bọc nhóm route; token/role lấy từ `AuthContext` (từ `/me` và `login.user.role`).
- Ẩn menu/nút người dùng không có quyền, **nhưng không coi đó là bảo mật** — server mới là nơi chặn; luôn xử lý `403`.
- **Manager:** không bao giờ gửi `homestayId` để xác định phạm vi (backend tự lấy từ tài khoản). Tài khoản Manager chưa được gán (`HOMESTAY_NOT_ASSIGNED`) → trang thông báo "Tài khoản chưa được gán homestay, liên hệ Giám đốc".
- **Customer:** chỉ truy cập `/account/**`; xem booking người khác → `BOOKING_NOT_OWNED` → trang 404/403.

---

## 11. Form và kiểm tra dữ liệu

- Dùng React Hook Form + Zod; kiểm tra **khi rời ô (blur)** và khi gửi. Lỗi từ server (`details[].field`) gán lại đúng ô bằng `setError`.
- Quy tắc nhập mặc định:

| Trường | Quy tắc |
|---|---|
| Email | Định dạng hợp lệ, ≤ 150 ký tự |
| Mật khẩu | ≥ 8 ký tự, có chữ hoa, chữ thường, số (hiển thị yêu cầu trước khi nhập; có nút hiện/ẩn) |
| Số điện thoại / hotline | Chỉ số, có thể có `+`, 8–15 chữ số, ≤ 20 ký tự |
| Ngày | `checkOutDate` > `checkInDate`; không chọn quá khứ; (nếu có) tôn trọng `min_nights`/`max_nights`/`max_advance_days` — lỗi chính thức do server trả |
| Số khách | Số nguyên ≥ 1, ≤ `maxGuests` của phòng |
| Số tiền | Số nguyên > 0 |
| Lý do hủy/từ chối | Bắt buộc, ≤ 255 ký tự |

- Nút gửi chỉ vô hiệu hóa khi đang gửi (không vô hiệu hóa chỉ vì form chưa hợp lệ — để người dùng thấy lỗi).
- Cảnh báo khi rời trang có dữ liệu chưa lưu (form dài: chi phí, chính sách).

---

## 12. Responsive, truy cập và hiệu năng

- Mục tiêu bấm tối thiểu **44×44px** trên mobile.
- Tương phản chữ/nền tối thiểu **4.5:1** (token ở mục 3 đã chọn theo mức này). Tuyệt đối không dùng `--color-muted` cho chữ cỡ dưới 12px.
- Mọi phần tử tương tác dùng thẻ ngữ nghĩa (`button`, `a`, `label`); nhãn cho ô nhập; `aria-live="polite"` cho toast; biểu tượng đơn thuần có `aria-label`.
- Điều hướng bàn phím đầy đủ: thứ tự Tab hợp lý, viền focus nhìn thấy rõ (không `outline: none` khi chưa có thay thế), modal khóa focus, Esc để đóng.
- Ảnh: `loading="lazy"`, kích thước cố định để tránh nhảy bố cục; ưu tiên `webp`.
- Tách mã theo route (`React.lazy` cho `/manager`, `/director`, `/admin`).
- Tôn trọng `prefers-reduced-motion` (tắt hiệu ứng chuyển động lớn). Hiệu ứng chuyển ≤ 200ms; chỉ dùng `opacity/transform`.

---

## 13. Nội dung và văn phong (tiếng Việt)

- Xưng hô trung tính, lịch sự, không cảm thán thừa. Nút = động từ: "Đặt phòng", "Gửi chứng từ", "Duyệt cọc", "Từ chối", "Xác nhận hoàn tiền", "Lưu thay đổi".
- Thông báo thành công nêu **kết quả**, ví dụ "Đã gửi chứng từ. Quản lý sẽ xác minh khoản cọc." — không chỉ "Thành công".
- Thông báo lỗi nêu **việc cần làm tiếp** ("Vui lòng chọn ngày khác"), không nêu mã kỹ thuật cho người dùng.
- Dùng thuật ngữ thống nhất: **đêm** (không "slot/buổi"), **nhận phòng / trả phòng**, **tiền cọc**, **quy tắc giá**, **yêu cầu đổi giá**, **Giám đốc / Quản lý / Quản trị viên / Khách**.
- Không để lộ dữ liệu nhạy cảm: chỉ hiển thị số tài khoản ngân hàng nhận cọc **của công ty** (được cấu hình), không in token/mật khẩu ở bất kỳ đâu.

---

## 14. Thiếu API: dùng mock, không tự bịa

Các nhu cầu giao diện chưa có endpoint trong tài liệu API v1.1. Làm bằng dữ liệu giả trong `src/mocks/` (đánh dấu `TODO(spec)`) và ghi lại để bổ sung vào tài liệu API:

| # | Nhu cầu | Giao diện | Hiện trạng | Đề xuất |
|---|---|---|---|---|
| 1 | **Tình trạng đêm của phòng** (HELD/BOOKED) để tô lịch | Khách (7A.3), Manager (7B.5) | Chỉ có ghi chú `GET /public/rooms/{roomId}/night-status?fromDate=&toDate=`, chưa vào danh mục | Đưa vào danh mục; thêm bản cho Manager trả **nhiều phòng một lần** (`GET /manager/room-night-status?fromDate=&toDate=`) |
| 2 | **Giờ nhận/trả phòng, nội quy, chính sách hoàn cọc** để hiện ở trang phòng | Khách (7A.3 khối 10) | Chỉ đọc được qua `/director/policies` | `GET /public/policies`. Tạm dùng hằng số `constants.ts` (11:00 / 08:00) và văn bản tĩnh |
| 3 | **Báo giá riêng cho một phòng** theo ngày | Khách (7A.3, 7A.4) | Phải gọi `availability/search` cả homestay rồi lọc `roomId` | `GET /public/rooms/{roomId}/quote?checkIn=&checkOut=&guests=` |
| 4 | **Xem trước số tiền hoàn** khi hủy | Khách (7A.4), Manager (7B.3) | Chỉ biết sau khi hủy | `GET …/bookings/{id}/cancel-preview` |
| 5 | **Danh sách khoản hoàn tiền đang chờ** | Manager (7B.1) | Phải duyệt từng booking đã hủy | `GET /manager/payments?type=REFUND&status=PENDING` |
| 6 | **Danh sách Manager chưa gán homestay** | Director (7C) | `GET /admin/users` chỉ Admin dùng được | `GET /director/managers?unassigned=true` |
| 7 | Mô tả chi tiết `GET /manager/price-rule-change-requests/{id}` | Manager (7B.7) | Có trong danh mục, chưa có mục mô tả chi tiết | Bổ sung mô tả |
| 8 | **Giá hiển thị trên thẻ homestay** | Khách (7A.1) | `GET /public/homestays` không có giá | Thêm `minNightlyPrice` vào mỗi homestay (nếu muốn thẻ có giá "từ … ₫/đêm") |
| 9 | Danh sách tỉnh để gợi ý ô "Ở đâu" | Khách (7A.2) | Không có | `GET /public/provinces`, hoặc suy ra từ danh sách homestay |

Số lượng huy hiệu menu (chờ xác nhận, chờ duyệt giá): dùng `meta.totalElements` của danh sách đã lọc `status=PENDING_*` với `size=1`, **không cần** endpoint riêng.

---

## 15. Danh sách kiểm tra trước khi coi một màn hình là xong (Definition of Done)

- [ ] Dùng **token** (không mã màu/px rải rác) và component trong `components/ui/`.
- [ ] Chỉ **một** nút primary trên màn hình/modal.
- [ ] Có đủ 4 trạng thái: đang tải (skeleton) · rỗng · lỗi tải (thử lại) · lỗi gửi form.
- [ ] Tiền qua `formatVnd`, ngày qua hàm trong `format.ts`; ngày thuần **không** đi qua `new Date(string)`.
- [ ] Nhãn/màu trạng thái lấy từ `status.ts`; lỗi lấy từ `errors.ts`.
- [ ] Không tự tính giá/tiền hoàn ở frontend; tổng lấy từ API.
- [ ] Hành động không hoàn tác có hộp xác nhận nêu hậu quả; lý do bắt buộc nếu API yêu cầu.
- [ ] Chống bấm đúp khi đang gọi API.
- [ ] Chạy tốt ở 375px, 768px, 1280px; không cuộn ngang.
- [ ] Điều hướng bằng bàn phím được; có `label`/`alt`; tương phản đạt 4.5:1.
- [ ] Đúng **giao diện**: Khách dùng `PublicLayout`, Manager/Director/Admin dùng `BackOfficeLayout`; không dùng chung component trang giữa Khách và Manager.
- [ ] Bố cục khớp mục 7A (Khách) hoặc 7B/7C/7D (quản lý) cho đúng màn hình đó, kể cả thứ tự khối và nhãn chữ.
- [ ] Nút hành động chỉ hiện khi hợp lệ với trạng thái booking (bảng 7B.3 / 7A.4).
- [ ] Không hiển thị sao đánh giá, nút Save, tin nhắn (dự án không có dữ liệu).
- [ ] Đúng vai trò: ẩn UI không có quyền **và** xử lý `403`.
- [ ] Không `any`, không `console.log`, không đường dẫn API gõ cứng ngoài `lib/api`.
- [ ] Hàm trong `lib/` có test (`formatVnd`, `nightsBetween`, ánh xạ trạng thái/lỗi).

---

## Nguồn tham khảo (khảo sát ngày 17/10/2026)

- Trang chủ Airbnb và trang phòng (đọc bố cục, nhãn chữ): airbnb.com, `/rooms/1445979399794262469`.
- Airbnb Host Tools (Today / Calendar / Listings / Messages / Menu): airbnb.com — "New hosting tools to help grow your business"; airbnb.com.au — "Exploring your hosting tools".
- Tổng hợp thiết kế Airbnb (không chính thức): superdesign.dev — "Airbnb design system"; opendesigner.io — "Airbnb design system".
- Booking.com Extranet: hostex.io — "Booking.com Extranet 101".
- Cloudbeds / Little Hotelier: hotelsync.com — "Cloudbeds vs Little Hotelier" (bài của bên cạnh tranh, chỉ dùng tham khảo tính năng).
