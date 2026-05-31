# FreelancePact Backend 🚀

Hệ thống Backend cho dự án **FreelancePact** (Nền tảng kết nối Freelancer và Client).
Được xây dựng bằng **NestJS** (Strict TypeScript), **Prisma ORM** và cơ sở dữ liệu **PostgreSQL**.

---

## 🛠 Tech Stack

- **Framework**: NestJS (Express under the hood)
- **Database**: PostgreSQL (chạy qua Docker)
- **ORM**: Prisma (v7+)
- **Authentication**: JWT (JSON Web Token) + Passport
- **Realtime**: Socket.IO (Messages, Notifications)
- **Validation**: `class-validator` + `class-transformer`
- **Documentation**: Swagger UI

---

## 📦 Các Module đã hoàn thiện

1. **Auth (`src/auth`)**: Đăng ký, Đăng nhập, Lấy Profile (`/me`), Refresh Token (xoay vòng token), Đăng xuất.
2. **Users (`src/users`)**: Xem Profile public, Cập nhật Profile của bản thân (`PATCH /me`).
3. **Contracts (`src/contracts`)**: Tạo hợp đồng mới, tự động tính toán tổng ngân sách từ các Milestones (inline array), gán Client/Freelancer tự động qua role.
4. **Milestones (`src/milestones`)**: 
   - `submit`: Freelancer nộp bài + upload file + tự động bắn Noti.
   - `reject`: Client từ chối + tự động sinh message hệ thống vào Chat + bắn Noti.
5. **Messages (`src/messages`)**: API Chat theo hợp đồng (REST phân trang) + Websocket Gateway (Join room `contract_{id}`, emit event `newMessage`).
6. **Notifications (`src/notifications`)**: Lưu thông báo vào DB + Bắn sự kiện realtime WebSocket (`notification`) vào room `user_{id}` + API polling (kèm `unreadCount`).

---

## ⚙️ Hướng dẫn Setup & Chạy dự án (Cho Developer mới)

### 1. Yêu cầu hệ thống
- Node.js (v18 hoặc v20+)
- Docker Desktop (để chạy PostgreSQL cục bộ)

### 2. Cài đặt dependency
```bash
npm install
```

### 3. Cấu hình Môi trường
File `.env` đã được cấu hình sẵn (sao chép từ `.env.example`).
> **Lưu ý quan trọng**: Database đang chạy ở port **5433** (thay vì 5432 mặc định) để tránh đụng độ với các PostgreSQL có sẵn trên máy host.

### 4. Khởi động Cơ sở dữ liệu (PostgreSQL)
Mở Docker Desktop, sau đó chạy:
```bash
docker compose up -d
```

### 5. Khởi tạo Database (Prisma)
Chạy lệnh migration để tạo các bảng trong CSDL:
```bash
npm run db:migrate -- --name init
```
*(Lệnh này tự động gọi `prisma generate` ở background)*

### 6. Khởi động Server
```bash
# Chế độ dev (có hot-reload)
npm run start:dev
```

Server sẽ chạy tại: **http://localhost:3001**

---

## 📚 API Documentation (Swagger)

Khi server đang chạy, truy cập Swagger UI để xem toàn bộ tài liệu API và test trực tiếp:
👉 **http://localhost:3001/api/docs**

---

## 📐 Kiến trúc & Quy ước (Convention) Cần Biết

Để code backend khớp hoàn hảo với Frontend (Next.js), dự án này áp dụng các quy ước sau:

### 1. Response Format (Đã cấu hình tự động)
Bất kỳ API nào return từ Controller đều tự động được bọc qua `ResponseTransformInterceptor`:
- **Object bình thường**: `{ data: { ... }, message: "OK" }`
- **Phân trang (Pagination)**: Trả về chính xác `{ data: [...], total, page, pageSize, ... }`

### 2. Error Response
`HttpExceptionFilter` sẽ format lỗi Validation (400 Bad Request) thành định dạng FE cần:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": {
    "email": ["Email không hợp lệ"],
    "password": ["Mật khẩu không được để trống"]
  }
}
```

### 3. Roles
Database lưu Role dạng UPPERCASE (`FREELANCER`, `CLIENT`) nhưng khi trả về cho Frontend qua API thì **bắt buộc map sang lowercase** (`freelancer`, `client`). Việc này đã được làm sẵn ở `AuthService` và `UsersService`.

### 4. Prisma vs Schema
Prisma bản 7+ sử dụng file cấu hình `prisma.config.ts`.
Mọi thay đổi trong file `prisma/schema.prisma` bắt buộc phải chạy lệnh:
```bash
npm run db:generate    # Để cập nhật TypeScript types
npm run db:migrate -- --name your_migration_name  # Để push vào DB
```

### 5. WebSocket (Socket.io)
Client (FE) cần gọi các emit sau để kết nối:
- `joinContractRoom { contractId }` 👉 Nhận tin nhắn event `'newMessage'`.
- `joinUserRoom { userId }` 👉 Nhận thông báo event `'notification'`.

Chúc bạn code vui vẻ! Nếu cần tích hợp Cloudinary upload file hoặc Payment Escrow, hãy tạo thêm module mới trong `src/` nhé.
