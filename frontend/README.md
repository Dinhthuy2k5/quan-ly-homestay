# Frontend — Quản lý homestay

Ứng dụng giao diện được xây dựng bằng React 19 và Vite.

## Chạy ứng dụng

- `npm install`: cài thư viện.
- `npm run dev`: chạy máy chủ phát triển.
- `npm run build`: tạo bản build.
- `npm run lint`: kiểm tra mã nguồn.
- `npm test`: chạy unit test.

## Cấu trúc thư mục

- `src/main.jsx`: điểm khởi chạy, gắn ứng dụng React vào trang.
- `src/App.jsx`: khai báo route công khai, đăng nhập/đăng ký, tài khoản và khu vực quản lý.
- `src/layouts/`: bố cục dùng chung cho các trang.
- `src/features/auth/`: đăng nhập, đăng ký, quên/đặt lại mật khẩu và trạng thái phiên đăng nhập.
- `src/features/account/`: trang tài khoản người dùng.
- `src/features/homestays/`: tìm kiếm, danh sách và chi tiết homestay.
- `src/features/rooms/`: trang chi tiết phòng dành cho khách.
- `src/features/manager/`: giao diện và API dành cho quản lý homestay, phòng, ảnh và loại phòng.
- `src/components/ui/`: các thành phần giao diện có thể tái sử dụng.
- `src/components/auth/`: thành phần bảo vệ route theo trạng thái đăng nhập/quyền.
- `src/lib/`: API client, lưu token, kiểm tra dữ liệu và hàm tiện ích dùng chung.
- `src/styles/tokens.css` và `src/index.css`: biến thiết kế và CSS nền tảng.
- `src/lib/__tests__/`: unit test cho các hàm tiện ích.
- `public/`: tài nguyên tĩnh được phục vụ trực tiếp, chẳng hạn favicon.

Các route quản trị viên và giám đốc chưa được khai báo trong `src/App.jsx` ở phiên bản hiện tại.

## Hướng dẫn giao diện

Xem `FRONTEND_GUIDELINES.md` ở thư mục frontend để biết quy ước giao diện và hành vi của sản phẩm.
