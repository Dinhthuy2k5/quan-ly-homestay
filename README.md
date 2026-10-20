# 🏡 Hệ Thống Quản Lý Vận Hành Homestay

Dự án ứng dụng web phục vụ quản lý và vận hành chuỗi homestay đa cơ sở (ví dụ: Mai Châu, Mộc Châu), hỗ trợ khách hàng tìm kiếm, đặt phòng trực tuyến và nhân sự nội bộ (Manager, Admin, Director) quản lý cơ sở, phòng, dịch vụ, tài chính, báo cáo.

---

## 🛠️ Công Nghệ Sử Dụng

- **Backend**: Java 21, Spring Boot 4.1.1
  - Spring Data JPA, Hibernate ORM
  - Spring Security, JWT (JJWT 0.12.6)
  - Springdoc OpenAPI 3.1.0 (Swagger UI)
  - HikariCP, Bean Validation, Lombok
- **Frontend**: React 19, Vite, React Router DOM, Axios
- **Database**: MySQL 8.0 (Database name: `homestayv4`)

---

## 📁 Cấu Trúc Dự Án

```
quan_ly_homestay/
├── database/                 # Script khởi tạo CSDL
│   └── homestay-database.sql # Schema MySQL 8.0 (18 bảng + 4 views)
├── homestay-backend/         # Nguồn Backend Spring Boot
│   ├── src/main/java/        # Mã nguồn Java theo module nghiệp vụ
│   ├── src/main/resources/   # application.yaml
│   └── pom.xml               # Maven dependencies
├── frontend/                 # Nguồn Frontend React JS (Vite)
│   ├── src/
│   │   ├── api/              # Axios client cấu hình sẵn JWT interceptor
│   │   ├── features/         # Các module chức năng theo nghiệp vụ
│   │   └── App.jsx
│   └── package.json
├── storage/                  # Thư mục lưu trữ runtime (uploads)
└── .gitignore                # Cấu hình bỏ qua file build, tạm, tài liệu nội bộ
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án

### 1. Chuẩn bị Cơ sở dữ liệu (MySQL)
1. Cài đặt MySQL 8.0 trở lên.
2. Mở file `database/homestay-database.sql` trong MySQL Workbench hoặc Command Line và thực thi để tạo database `homestayv4` và các bảng.
3. Tạo file cấu hình riêng cho máy từ mẫu, rồi điền thông tin MySQL, JWT và SMTP. File `.env` này đã được Git bỏ qua.

   Trong PowerShell:

   ```powershell
   Copy-Item homestay-backend/.env.example homestay-backend/.env
   ```

   Điền `DB_PASSWORD`, `JWT_SECRET`, `MAIL_USERNAME`, `MAIL_PASSWORD` và `MAIL_FROM` trong `homestay-backend/.env`. `JWT_SECRET` phải là Base64 của ít nhất 32 byte ngẫu nhiên; có thể tạo bằng PowerShell:

   ```powershell
   $jwtBytes = New-Object byte[] 32
   [Security.Cryptography.RandomNumberGenerator]::Fill($jwtBytes)
   [Convert]::ToBase64String($jwtBytes)
   ```

   Gmail SMTP cần App Password 16 ký tự (bỏ khoảng trắng định dạng khi sao chép), không dùng mật khẩu đăng nhập Gmail. Không commit `.env` hoặc chia sẻ các giá trị bí mật.

### 2. Chạy Backend (Spring Boot)
Yêu cầu: JDK 21 trở lên.

```bash
cd homestay-backend
# Trên Windows
.\mvnw.cmd spring-boot:run

# Trên Linux/macOS
./mvnw spring-boot:run
```
- Server chạy tại: `http://localhost:8080`
- API Health Check: `http://localhost:8080/api/v1/health`
- Tài liệu Swagger UI: `http://localhost:8080/swagger-ui/index.html`

### 3. Chạy Frontend (React Vite)
Yêu cầu: Node.js 18 trở lên.

```bash
cd frontend
npm install
npm run dev
```
- Ứng dụng chạy tại: `http://localhost:5173`
