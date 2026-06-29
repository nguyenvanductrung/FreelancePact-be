# FreelancePact — Tài Liệu Dự Án Toàn Diện

> **Phiên bản:** 1.0 · **Cập nhật lần cuối:** 14/06/2026  
> **Tác giả:** Team FreelancePact  
> **Mô tả:** Nền tảng quản lý hợp đồng freelance tích hợp smart contract & escrow trên Cardano blockchain

---

## Mục Lục

1. [Tổng quan dự án](#1-tổng-quan-dự-án)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Backend — NestJS](#3-backend--nestjs)
   - 3.1 [Tech stack & Dependencies](#31-tech-stack--dependencies)
   - 3.2 [Cấu trúc thư mục](#32-cấu-trúc-thư-mục)
   - 3.3 [Database Schema (Prisma)](#33-database-schema-prisma)
   - 3.4 [Biến môi trường](#34-biến-môi-trường)
   - 3.5 [Modules & Nghiệp vụ](#35-modules--nghiệp-vụ)
   - 3.6 [API Endpoints đầy đủ](#36-api-endpoints-đầy-đủ)
   - 3.7 [WebSocket Events](#37-websocket-events)
   - 3.8 [Conventions & Chuẩn mã hóa](#38-conventions--chuẩn-mã-hóa)
4. [Frontend — Next.js 14](#4-frontend--nextjs-14)
   - 4.1 [Tech stack & Dependencies](#41-tech-stack--dependencies)
   - 4.2 [Cấu trúc thư mục](#42-cấu-trúc-thư-mục)
   - 4.3 [Biến môi trường](#43-biến-môi-trường)
   - 4.4 [Danh sách màn hình](#44-danh-sách-màn-hình)
   - 4.5 [Authentication Flow](#45-authentication-flow)
   - 4.6 [Shared Types](#46-shared-types)
   - 4.7 [Screen → API Mapping](#47-screen--api-mapping)
5. [5 Tính năng nghiệp vụ cốt lõi](#5-5-tính-năng-nghiệp-vụ-cốt-lõi)
   - 5.1 [Đăng ký / Đăng nhập & Hồ Sơ](#51-đăng-ký--đăng-nhập--hồ-sơ)
   - 5.2 [Tạo Hợp Đồng](#52-tạo-hợp-đồng)
   - 5.3 [Theo Dõi Theo Từng Giai Đoạn (Milestones)](#53-theo-dõi-theo-từng-giai-đoạn-milestones)
   - 5.4 [Trò Chuyện Thời Gian Thực](#54-trò-chuyện-thời-gian-thực)
   - 5.5 [Thông Báo (Notification System)](#55-thông-báo-notification-system)
6. [Luồng hoạt động tổng thể](#6-luồng-hoạt-động-tổng-thể)
7. [Hướng dẫn cài đặt & chạy dự án](#7-hướng-dẫn-cài-đặt--chạy-dự-án)
8. [Roadmap — Tuần 3 & 4 (Blockchain)](#8-roadmap--tuần-3--4-blockchain)

---

## 1. Tổng quan dự án

**FreelancePact** là nền tảng kết nối Freelancer và Client, cho phép hai bên:

- Tạo và ký kết hợp đồng số (Web2 first, sau đó on-chain Cardano)
- Quản lý công việc theo từng giai đoạn (Milestone-based)
- Thanh toán qua cơ chế Escrow an toàn
- Giao tiếp realtime qua chat tích hợp trong hợp đồng
- Nhận thông báo tức thì về mọi sự kiện quan trọng

### Roadmap tổng thể

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| **Tuần 1–2** | Web2 Core (Auth, Contract, Milestone, Chat, Notification) | ✅ Đang thực hiện |
| **Tuần 3** | Tích hợp Cardano Wallet, map `wallet_address`, Escrow Smart Contract | 🔜 Sắp tới |
| **Tuần 4** | AI Agent giải ngân tự động, DAO Dispute Resolution, NFT Certificate | 🔜 Sắp tới |

---

## 2. Kiến trúc hệ thống

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT BROWSER                           │
│              Next.js 14 (App Router) — Port 3000            │
│         Tailwind CSS + shadcn/ui + lucide-react              │
└─────────────────┬───────────────────────┬───────────────────┘
                  │  REST API             │  WebSocket
                  │  (HTTP/JSON)          │  (Socket.IO)
                  ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND — NestJS — Port 3001               │
│                                                              │
│  ┌──────────┐ ┌───────────┐ ┌────────────┐ ┌─────────────┐ │
│  │   Auth   │ │ Contracts │ │ Milestones │ │  Messages   │ │
│  │  Module  │ │  Module   │ │   Module   │ │   Module    │ │
│  └──────────┘ └───────────┘ └────────────┘ └─────────────┘ │
│  ┌──────────┐ ┌───────────┐ ┌────────────────────────────┐  │
│  │  Users   │ │Notificati │ │         Prisma ORM         │  │
│  │  Module  │ │ ons Module│ └────────────────────────────┘  │
│  └──────────┘ └───────────┘                                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Socket.IO Gateways (Messages + Notifications)       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────┐
         │     SQLite (dev) / PostgreSQL   │
         │      (prod via Prisma ORM)      │
         └────────────────────────────────┘
                          │
                          ▼ (Tuần 3+)
         ┌────────────────────────────────┐
         │        Cardano Blockchain       │
         │  (Plutus Smart Contracts +      │
         │   Cardano Wallet Integration)   │
         └────────────────────────────────┘
```

---

## 3. Backend — NestJS

### 3.1 Tech stack & Dependencies

| Layer | Công nghệ | Version |
|---|---|---|
| Framework | NestJS | ^11.0 |
| Language | TypeScript | ^5.7 |
| ORM | Prisma | ^7.8 |
| Database (dev) | SQLite (`dev.db`) | — |
| Database (prod) | PostgreSQL | ^8.21 (pg) |
| Database adapter | `@prisma/adapter-libsql`, `@prisma/adapter-pg` | ^7.8 |
| Authentication | JWT (access 15m + refresh 7d) | @nestjs/jwt ^11 |
| Password hash | bcrypt | ^6.0 |
| Realtime | Socket.IO | ^4.8 |
| File upload | Multer + Cloudinary | ^2.1 / ^1.41 |
| API Docs | Swagger (@nestjs/swagger) | ^11.4 |
| Validation | class-validator + class-transformer | ^0.15 / ^0.5 |

### 3.2 Cấu trúc thư mục

```
FreelancePact-be/
├── prisma/
│   └── schema.prisma          # Database schema (tất cả models)
├── src/
│   ├── main.ts                # Bootstrap — global prefix, CORS, pipes, Swagger
│   ├── app.module.ts          # Root module — import tất cả feature modules
│   │
│   ├── auth/                  # Module xác thực
│   │   ├── auth.controller.ts # POST /auth/login, /register, /logout, /me, /refresh
│   │   ├── auth.service.ts    # Logic đăng ký, đăng nhập, JWT generation
│   │   ├── auth.module.ts
│   │   ├── dto/               # LoginDto, RegisterDto, AuthResponseDto
│   │   ├── guards/            # JwtAuthGuard
│   │   └── strategies/        # jwt.strategy.ts (passport-jwt)
│   │
│   ├── users/                 # Module người dùng & hồ sơ
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── dto/               # UpdateProfileDto
│   │
│   ├── contracts/             # Module hợp đồng
│   │   ├── contracts.controller.ts
│   │   ├── contracts.service.ts
│   │   ├── contracts.module.ts
│   │   └── dto/               # CreateContractDto, ContractResponseDto
│   │
│   ├── milestones/            # Module giai đoạn công việc
│   │   ├── milestones.controller.ts
│   │   ├── milestones.service.ts
│   │   ├── milestones.module.ts
│   │   └── dto/               # MilestoneActionDto (submit / reject)
│   │
│   ├── messages/              # Module tin nhắn & chat
│   │   ├── messages.controller.ts
│   │   ├── messages.service.ts
│   │   ├── messages.gateway.ts  # WebSocket Gateway (Socket.IO)
│   │   ├── messages.module.ts
│   │   └── dto/               # SendMessageDto
│   │
│   ├── notifications/         # Module thông báo
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   ├── notifications.gateway.ts  # WebSocket Gateway (push notification)
│   │   └── notifications.module.ts
│   │
│   ├── prisma/                # Prisma service wrapper
│   │   ├── prisma.service.ts
│   │   └── prisma.module.ts
│   │
│   └── common/                # Shared utilities
│       ├── dto/               # PaginationDto
│       ├── filters/           # HttpExceptionFilter (chuẩn hóa error response)
│       └── interceptors/      # ResponseTransformInterceptor ({ data, message })
│
├── .env                       # Biến môi trường
├── docker-compose.yml         # PostgreSQL container (production)
├── patch-prisma.js            # Script fix Prisma sau generate
└── package.json
```

### 3.3 Database Schema (Prisma)

#### Sơ đồ quan hệ

```
User ─────────────────────────────────────────────────────────────
 │ id, email, password, fullName, avatarUrl                        
 │ role (CLIENT | FREELANCER)                                       
 │ isKycVerified, isOnline                                         
 │ title, location, bio, hourlyRate                                 
 │ skills (JSON array string), successRate, rating                 
 │ wallet_address (nullable — dùng tuần 3)                         
 ├── clientContracts    → Contract[] (as Client)
 ├── freelancerContracts → Contract[] (as Freelancer)
 ├── sentMessages       → Message[]
 ├── notifications      → Notification[]
 ├── refreshTokens      → RefreshToken[]
 ├── badges             → Badge[]
 ├── portfolioItems     → PortfolioItem[]
 └── experience         → Experience[]

Contract ─────────────────────────────────────────────────────────
 │ id, title, partnerName, description                             
 │ status: DRAFT | PENDING_SIGNATURE | ACTIVE | COMPLETED | CANCELLED | DISPUTED
 │ totalValue, escrowedAmount                                       
 │ startDate, endDate, progressPercent                             
 │ paymentTerm: ESCROW_MILESTONE | ESCROW_FULL | NET_15 | NET_30   
 │ specialTerms                                                     
 │ freelancerId, clientId                                           
 ├── milestones → Milestone[]
 ├── messages   → Message[]
 └── payments   → Payment[]

Milestone ─────────────────────────────────────────────────────────
 │ id, name, budget, deadline                                       
 │ status: PENDING | ACTIVE | SUBMITTED | REVISION_REQUESTED | COMPLETED
 │ progressPercent, submissionNote, rejectionNote, submittedAt     
 │ contractId                                                       
 ├── payments → Payment[]
 └── files    → MilestoneFile[]

Message ───────────────────────────────────────────────────────────
 │ id, contractId, senderId, senderName, senderAvatar              
 │ type: TEXT | FILE | SYSTEM                                       
 │ text, fileUrl, fileName, fileSizeBytes, milestoneNote           
 └── createdAt

Notification ──────────────────────────────────────────────────────
 │ id, userId, type, title, body, isRead                           
 │ metadata (JSON), createdAt                                       
 └── type: MILESTONE_SUBMITTED | MILESTONE_APPROVED | MILESTONE_REJECTED
           | CONTRACT_SIGNED | DISPUTE_OPENED | PAYMENT_RELEASED | NFT_MINTED

Payment, RefreshToken, Badge, PortfolioItem, Experience, MilestoneFile
```

### 3.4 Biến môi trường

File `.env` tại root của `FreelancePact-be/`:

```env
# ─── Database ─────────────────────────────────────
DATABASE_URL="file:./dev.db"          # SQLite (dev)
# DATABASE_URL="postgresql://..."     # PostgreSQL (prod)

# ─── JWT ──────────────────────────────────────────
JWT_SECRET="change-me-in-production-use-a-long-random-string"
JWT_EXPIRES_IN="15m"                  # Access token TTL
JWT_REFRESH_EXPIRES_IN="7d"           # Refresh token TTL

# ─── Cloudinary (file uploads) ────────────────────
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# ─── App ──────────────────────────────────────────
PORT=3001
NODE_ENV=development
```

### 3.5 Modules & Nghiệp vụ

#### Auth Module

**Trách nhiệm:** Xác thực người dùng, phát hành JWT, quản lý phiên đăng nhập.

**Logic chính trong `auth.service.ts`:**

| Method | Nghiệp vụ |
|---|---|
| `register(dto)` | Kiểm tra email unique → hash password (bcrypt, salt=12) → tạo User → phát `accessToken` (15m) + `refreshToken` (7d) |
| `login(dto)` | Tìm user theo email → so sánh bcrypt → cập nhật `isOnline: true` → phát tokens |
| `me(userId)` | Trả về thông tin public của user đang đăng nhập |
| `refresh(token)` | Kiểm tra refresh token trong DB → xóa token cũ (rotation) → phát tokens mới |
| `logout(userId)` | Xóa tất cả refresh tokens của user → cập nhật `isOnline: false` |

**Role-based Access Control (RBAC):**
- `Role.CLIENT` — Người thuê (tạo contract, approve/reject milestone)
- `Role.FREELANCER` — Người làm (submit milestone, nhận thanh toán)
- Một user có thể đóng cả hai vai trò ở các dự án khác nhau (FE chọn role khi đăng ký, có thể mở rộng sau)

#### Users Module

**Trách nhiệm:** Quản lý hồ sơ người dùng (profile).

| Endpoint | Method | Nghiệp vụ |
|---|---|---|
| `/users/:userId/profile` | GET | Lấy public profile của bất kỳ user nào |
| `/users/me/profile` | PATCH | Cập nhật thông tin của chính mình |

**Fields hồ sơ quan trọng:**

```typescript
{
  title: string,           // "Senior UI/UX Designer"
  location: string,        // "Ho Chi Minh City"
  bio: string,
  hourlyRate: number,      // USD/giờ
  availabilityHoursPerWeek: number,
  skills: string[],        // ["React", "NestJS", "Figma"]
  successRate: number,     // 0–100%
  rating: number,          // 0–5.0
  badges: Badge[],
  portfolioItems: PortfolioItem[],
  experience: Experience[],
  wallet_address: string | null  // ← Sẽ dùng tuần 3 (Cardano)
}
```

#### Contracts Module

**Trách nhiệm:** Tạo và quản lý hợp đồng.

**Luồng tạo hợp đồng:**
```
Client tạo POST /contracts (kèm milestones)
    ↓
Hệ thống tính totalValue = sum(milestones.budget)
    ↓
Tạo Contract + Milestones trong 1 Prisma transaction
    ↓
Status: DRAFT
    ↓
POST /contracts/:id/sign (cả 2 bên)
    ↓
Status: ACTIVE (hoặc WAITING_FOR_DEPOSIT tuần 3)
```

**Contract Status Enum:**

| Status | Ý nghĩa |
|---|---|
| `DRAFT` | Hợp đồng vừa tạo, chưa ký |
| `PENDING_SIGNATURE` | Đang chờ 1 bên ký |
| `ACTIVE` | Đã ký — đang thực hiện |
| `COMPLETED` | Tất cả milestone xong |
| `CANCELLED` | Đã hủy |
| `DISPUTED` | Đang tranh chấp |

#### Milestones Module

**Trách nhiệm:** Quản lý vòng đời từng giai đoạn công việc.

**Milestone Status Flow:**

```
PENDING
  ↓ (Client/Freelancer bắt đầu)
ACTIVE
  ↓ (Freelancer submit)
SUBMITTED  ←──────────────────────────┐
  ↓ Client review                     │
  ├─ APPROVE → COMPLETED              │
  └─ REJECT → REVISION_REQUESTED ─────┘
                (Freelancer sửa rồi submit lại)
```

**Logic trong `milestones.service.ts`:**

- `submit()`: Kiểm tra user là Freelancer của contract → milestone status phải là `ACTIVE` hoặc `REVISION_REQUESTED` → lưu files → gửi notification cho Client
- `reject()`: Kiểm tra user là Client → milestone phải `SUBMITTED` → tạo system message trong chat → gửi notification cho Freelancer
- `approve()`: Kiểm tra Client → chuyển status `COMPLETED` → trigger payment release (tuần 3)

#### Messages Module

**Trách nhiệm:** Lưu trữ & phát tin nhắn theo thời gian thực.

**REST APIs:**
- `GET /conversations` — Danh sách hội thoại của user
- `GET /contracts/:contractId/messages` — Lịch sử chat của một contract
- `POST /contracts/:contractId/messages` — Gửi tin nhắn mới

**WebSocket Gateway (`messages.gateway.ts`):**

```
Client emit: joinContractRoom  { contractId: "abc" }
    → Server: client.join("contract_abc")

Client emit: leaveContractRoom { contractId: "abc" }
    → Server: client.leave("contract_abc")

Server emit: newMessage (to room "contract_abc")
    → Tất cả client trong room nhận được message ngay lập tức
```

**Message Type:**
- `TEXT` — Tin nhắn văn bản thông thường
- `FILE` — Đính kèm file/link (upload qua Cloudinary)
- `SYSTEM` — Tin nhắn tự động từ hệ thống (vd: "Client yêu cầu chỉnh sửa...")

#### Notifications Module

**Trách nhiệm:** Tạo và phát thông báo realtime.

**WebSocket Gateway (`notifications.gateway.ts`):**

```
Client emit: joinUserRoom  { userId: "usr_abc" }
    → Server: client.join("user_usr_abc")

Server emit: notification (to room "user_usr_abc")
    → User nhận notification popup ngay lập tức
```

**Notification Types & Triggers:**

| NotificationType | Trigger | Gửi cho |
|---|---|---|
| `MILESTONE_SUBMITTED` | Freelancer submit milestone | Client |
| `MILESTONE_APPROVED` | Client approve milestone | Freelancer |
| `MILESTONE_REJECTED` | Client reject milestone | Freelancer |
| `CONTRACT_SIGNED` | Hợp đồng được ký | Cả 2 bên |
| `DISPUTE_OPENED` | Mở tranh chấp | Cả 2 bên |
| `PAYMENT_RELEASED` | Thanh toán được giải ngân | Freelancer |
| `NFT_MINTED` | NFT certificate được mint | Cả 2 bên (tuần 4) |

### 3.6 API Endpoints đầy đủ

#### Base URL

```
http://localhost:3001/api/v1
```

#### Swagger Docs

```
http://localhost:3001/api/docs
```

#### Auth Endpoints

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/auth/register` | ❌ | Đăng ký tài khoản mới |
| `POST` | `/auth/login` | ❌ | Đăng nhập |
| `POST` | `/auth/logout` | ✅ JWT | Đăng xuất |
| `GET` | `/auth/me` | ✅ JWT | Lấy thông tin user hiện tại |
| `POST` | `/auth/refresh` | ❌ | Làm mới access token |

**POST /auth/register:**
```json
// Request
{
  "fullName": "Nguyen Van A",
  "email": "user@example.com",
  "password": "securePassword123",
  "role": "freelancer"  // "freelancer" | "client"
}

// Response 200
{
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "id": "cuid_abc",
      "email": "user@example.com",
      "fullName": "Nguyen Van A",
      "avatarUrl": null,
      "role": "freelancer",
      "isKycVerified": false
    }
  }
}
```

**POST /auth/login:**
```json
// Request
{ "email": "user@example.com", "password": "securePassword123" }

// Response 200
{
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Lỗi chung:**
```json
{ "statusCode": 400, "message": "Validation failed", "errors": { "email": ["Email không hợp lệ"] } }
```

#### Users Endpoints

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/users/:userId/profile` | ✅ JWT | Xem profile người dùng |
| `PATCH` | `/users/me/profile` | ✅ JWT | Cập nhật profile của mình |

**GET /users/:userId/profile — Response:**
```json
{
  "data": {
    "id": "usr_abc",
    "fullName": "Elena Rodriguez",
    "title": "Senior UI/UX Designer",
    "location": "Ho Chi Minh City",
    "bio": "Crafting intuitive digital experiences...",
    "hourlyRate": 85,
    "availabilityHoursPerWeek": 20,
    "skills": ["UI Design", "UX Research", "Figma"],
    "successRate": 100,
    "totalContracts": 24,
    "rating": 4.9,
    "isKycVerified": true,
    "isOnline": true,
    "badges": [{ "id": "b1", "label": "Top Rated", "icon": "award" }],
    "portfolioItems": [{ "id": "pf1", "title": "FinTech App", "tag": "UI/UX" }],
    "experience": [{ "id": "ex1", "role": "Lead Designer", "company": "TechCorp", "startYear": 2021 }]
  }
}
```

#### Contracts Endpoints

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/contracts` | ✅ JWT | Danh sách hợp đồng của user |
| `POST` | `/contracts` | ✅ JWT | Tạo hợp đồng mới |
| `GET` | `/contracts/:id` | ✅ JWT | Chi tiết hợp đồng |
| `POST` | `/contracts/:id/sign` | ✅ JWT | Ký hợp đồng |
| `GET` | `/contracts/:id/messages` | ✅ JWT | Lịch sử chat |
| `POST` | `/contracts/:id/messages` | ✅ JWT | Gửi tin nhắn |
| `GET` | `/contracts/:id/payments` | ✅ JWT | Lịch sử thanh toán |
| `POST` | `/contracts/:id/payments/release` | ✅ JWT | Giải ngân escrow |

**POST /contracts — Request:**
```json
{
  "title": "Thiết kế Website Thương mại điện tử",
  "partnerName": "Acme Corporation",
  "description": "Mô tả phạm vi công việc...",
  "paymentTerm": "escrow-milestone",
  "specialTerms": "Bảo mật NDA trong 2 năm",
  "milestones": [
    { "name": "UI/UX Design", "budget": 5000000, "deadline": "2024-11-15" },
    { "name": "Frontend Code", "budget": 10000000, "deadline": "2024-12-01" }
  ]
}
```

**Payment Term Enum:** `escrow-milestone | escrow-full | net-15 | net-30`

#### Milestones Endpoints

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/milestones/:id/submit` | ✅ JWT (Freelancer) | Nộp kết quả milestone |
| `POST` | `/milestones/:id/approve` | ✅ JWT (Client) | Phê duyệt milestone |
| `POST` | `/milestones/:id/reject` | ✅ JWT (Client) | Từ chối milestone |

**POST /milestones/:id/submit:**
```json
// Request
{
  "submissionNote": "Đã hoàn thành UI/UX mockups và export ra PDF.",
  "fileUrls": ["https://cloudinary.com/files/wireframes_v1.pdf"]
}

// Response 200 — trả về ContractDetail đầy đủ
{ "data": { /* ContractDetail với milestone đã cập nhật status: "submitted" */ } }
```

**POST /milestones/:id/reject:**
```json
// Request
{ "rejectionNote": "Màu sắc chưa đúng brand guideline, vui lòng chỉnh lại." }
```

#### Notifications Endpoints

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/notifications` | ✅ JWT | Danh sách thông báo (unread first) |
| `PATCH` | `/notifications/:id/read` | ✅ JWT | Đánh dấu đã đọc |
| `PATCH` | `/notifications/read-all` | ✅ JWT | Đánh dấu tất cả đã đọc |

**GET /notifications — Response:**
```json
{
  "data": [
    {
      "id": "notif-1",
      "type": "MILESTONE_SUBMITTED",
      "title": "Milestone đã được nộp",
      "body": "Freelancer đã nộp sản phẩm cho milestone: UI Design",
      "isRead": false,
      "metadata": { "contractId": "ctr_abc", "milestoneId": "ms_001" },
      "createdAt": "2026-06-14T08:30:00Z"
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 20,
  "unreadCount": 2
}
```

#### Conversations Endpoint

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/conversations` | ✅ JWT | Danh sách cuộc hội thoại |

### 3.7 WebSocket Events

#### Namespace / Connection

Kết nối Socket.IO đến `ws://localhost:3001` (cùng port với REST API).

#### Chat Events (Messages Gateway)

| Direction | Event | Payload | Mô tả |
|---|---|---|---|
| Client → Server | `joinContractRoom` | `{ contractId: string }` | Tham gia phòng chat của contract |
| Client → Server | `leaveContractRoom` | `{ contractId: string }` | Rời phòng chat |
| Server → Client | `newMessage` | `Message object` | Tin nhắn mới realtime |

#### Notification Events (Notifications Gateway)

| Direction | Event | Payload | Mô tả |
|---|---|---|---|
| Client → Server | `joinUserRoom` | `{ userId: string }` | Đăng ký nhận notification |
| Client → Server | `leaveUserRoom` | `{ userId: string }` | Hủy nhận notification |
| Server → Client | `notification` | `Notification object` | Thông báo mới realtime |

#### Ví dụ tích hợp Socket.IO phía FE

```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

// ─ Join contract room (khi mở trang chi tiết contract)
socket.emit('joinContractRoom', { contractId: 'ctr_abc' });
socket.on('newMessage', (message) => {
  setMessages(prev => [...prev, message]);
});

// ─ Join user room (khi user đăng nhập)
socket.emit('joinUserRoom', { userId: currentUser.id });
socket.on('notification', (notif) => {
  showToast(notif.title, notif.body);
  setUnreadCount(prev => prev + 1);
});
```

### 3.8 Conventions & Chuẩn mã hóa

#### Response Format (Global Interceptor)

**Thành công:**
```json
{ "data": { ... }, "message": "OK" }
```

**Danh sách có phân trang:**
```json
{ "data": [...], "total": 100, "page": 1, "pageSize": 10 }
```

**Lỗi (HttpExceptionFilter):**
```json
{ "statusCode": 400, "message": "Validation failed", "errors": { "field": ["message"] } }
```

#### Field Naming Conventions

| Field | Kiểu | Ghi chú |
|---|---|---|
| `id` | `string` (CUID) | Không dùng số nguyên |
| `createdAt`, `updatedAt` | ISO 8601 string | Không dùng `timestamp` hay `created_at` |
| `budget`, `totalValue` | `number` (VNĐ nguyên) | Không dùng string |
| `progressPercent` | `number` 0–100 | |
| `status` | `string` (lowercase enum) | `"active"` không phải `"ACTIVE"` |
| `role` | `"freelancer"` \| `"client"` | Lowercase cho FE |
| `skills` | `string[]` | Lưu DB là JSON string, response là array |

#### Scripts

```bash
npm run start:dev      # Development với hot-reload
npm run db:push        # Push schema lên SQLite (dev)
npm run db:migrate     # Migrate + generate Prisma client
npm run db:studio      # Mở Prisma Studio
npm run db:reset       # Reset database
npm run build          # Build production
```

---

## 4. Frontend — Next.js 14

### 4.1 Tech stack & Dependencies

| Layer | Công nghệ | Version |
|---|---|---|
| Framework | Next.js 14 (App Router) | 14.2.35 |
| Language | TypeScript | ^5 |
| Styling | Tailwind CSS + shadcn/ui | ^3.4 |
| Icons | lucide-react | ^1.17 |
| UI Components | @base-ui/react, @radix-ui | ^1.5 / ^1.1 |
| Auth (Google) | @react-oauth/google | ^0.13 |
| State Management | React useState (local) | — |
| API Client | Fetch API (wrapped in `lib/api.ts`) | — |
| Auth Storage | JWT trong `localStorage` | — |

### 4.2 Cấu trúc thư mục

```
FreelancePact-fe/
├── app/                              # Next.js App Router
│   ├── layout.tsx                   # Root layout (metadata, fonts, providers)
│   ├── page.tsx                     # Home → redirect
│   ├── globals.css                  # Global Tailwind styles
│   │
│   ├── (auth)/                      # Route group — không có layout chính
│   │   ├── login/page.tsx           # Màn hình đăng nhập
│   │   └── register/page.tsx        # Màn hình đăng ký (chọn role)
│   │
│   ├── contracts/
│   │   ├── page.tsx                 # Marketplace — danh sách hợp đồng
│   │   ├── new/page.tsx             # Form tạo hợp đồng mới
│   │   └── [id]/page.tsx            # Chi tiết hợp đồng + chat + milestones
│   │
│   ├── dashboard/
│   │   ├── page.tsx                 # Dashboard Freelancer
│   │   └── client/page.tsx          # Dashboard Client
│   │
│   ├── messages/
│   │   └── page.tsx                 # Trung tâm tin nhắn (tất cả conversations)
│   │
│   ├── notifications/
│   │   └── page.tsx                 # Trung tâm thông báo
│   │
│   └── profile/
│       └── page.tsx                 # Hồ sơ người dùng
│
├── components/
│   ├── shared/
│   │   ├── NavBar.tsx               # Thanh điều hướng — props: activePage
│   │   ├── Footer.tsx
│   │   └── SectionCard.tsx          # Card wrapper cho form sections
│   ├── milestones/
│   │   └── SubmitMilestoneModal.tsx # Modal nộp kết quả milestone
│   ├── LogoIcon.tsx
│   └── ui/                          # shadcn/ui components (Button, Input, etc.)
│
├── constants/
│   └── index.ts                     # API_BASE_URL, brand colors, nav links
│
├── types/
│   └── index.ts                     # Tất cả TypeScript interfaces
│
├── lib/
│   ├── utils.ts                     # cn() helper (classnames)
│   └── api.ts                       # Typed API client + authHeaders()
│
├── public/                          # Static assets
├── .env.local                       # Biến môi trường (không commit)
└── FE_SPEC.md                       # Tài liệu API Contract (chi tiết)
```

### 4.3 Biến môi trường

File `.env.local` tại root `FreelancePact-fe/`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
```

### 4.4 Danh sách màn hình

| Màn hình | Route | Dành cho |
|---|---|---|
| Đăng nhập | `/login` | Tất cả |
| Đăng ký | `/register` | Tất cả (chọn role) |
| Dashboard Freelancer | `/dashboard` | Freelancer |
| Dashboard Client | `/dashboard/client` | Client |
| Marketplace hợp đồng | `/contracts` | Tất cả |
| Tạo hợp đồng | `/contracts/new` | Client / Freelancer |
| Chi tiết hợp đồng | `/contracts/[id]` | Cả 2 bên |
| Tin nhắn | `/messages` | Tất cả |
| Thông báo | `/notifications` | Tất cả |
| Hồ sơ | `/profile` | Tất cả |

#### Chi tiết màn hình `/contracts/[id]` (quan trọng nhất)

Màn hình này bao gồm nhiều tab/section:

```
┌─────────────────────────────────────────────────┐
│ Contract Header (title, status badge, progress) │
├─────────────────┬───────────────────────────────┤
│  Tab: Overview  │  Tab: Milestones               │
│  Tab: Thảo luận │  Tab: Payments                 │
├─────────────────┴───────────────────────────────┤
│                                                 │
│  [Milestone Tab]                                │
│  Milestone 1: UI/UX  [COMPLETED ✅]            │
│  Milestone 2: Code   [SUBMITTED 🔍]            │
│    → [Approve] [Reject] (Client only)          │
│    → [Submit Proof] (Freelancer only)          │
│                                                 │
│  [Thảo luận Tab — Chat Panel]                  │
│  ┌─────────────────────────────────────────┐   │
│  │ Messages list (realtime via Socket.IO)  │   │
│  └─────────────────────────────────────────┘   │
│  [Input] [Attach file] [Send]                  │
└─────────────────────────────────────────────────┘
```

### 4.5 Authentication Flow

```
1. User nhập email + password → POST /auth/login
2. FE nhận { accessToken, refreshToken }
3. Lưu vào localStorage:
   - key "accessToken" → accessToken
   - key "refreshToken" → refreshToken
4. Mọi request tiếp theo:
   Header: "Authorization: Bearer <accessToken>"
5. Khi gặp lỗi 401:
   → FE tự động gọi POST /auth/refresh
   → Nhận accessToken mới → lưu lại → retry request gốc
6. Logout:
   → POST /auth/logout
   → Xóa localStorage
   → Redirect về /login
```

**API Client wrapper (`lib/api.ts`):**

```typescript
// authHeaders() — tự động đọc token từ localStorage
function authHeaders(): HeadersInit {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Ví dụ typed API call
const contractsApi = {
  getList: () => fetch(`${API_BASE_URL}/contracts`, { headers: authHeaders() }),
  create: (dto: CreateContractDto) => fetch(`${API_BASE_URL}/contracts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(dto),
  }),
};
```

### 4.6 Shared Types

File `types/index.ts` — các interface quan trọng:

```typescript
// Auth
interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: 'freelancer' | 'client';
  isKycVerified: boolean;
}

// Contract
interface ContractSummary {
  id: string;
  title: string;
  partnerName: string;
  status: 'draft' | 'pending_signature' | 'active' | 'completed' | 'cancelled' | 'disputed';
  totalValue: number;
  startDate: string;
  endDate: string;
  progressPercent: number;
}

// Milestone
interface Milestone {
  id: string;
  name: string;
  budget: number;         // VNĐ (số nguyên)
  deadline: string;       // YYYY-MM-DD
  status: 'pending' | 'active' | 'submitted' | 'revision_requested' | 'completed';
  progressPercent: number;
  submissionNote?: string;
  rejectionNote?: string;
  submittedAt?: string;
  files: string[];        // Array of URLs
}

// Message
interface ChatMessage {
  id: string;
  contractId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  type: 'text' | 'file' | 'system';
  text: string | null;
  file?: { name: string; sizeBytes: number; url: string; milestoneNote?: string };
  createdAt: string;
}

// Notification
interface Notification {
  id: string;
  type: 'MILESTONE_SUBMITTED' | 'MILESTONE_APPROVED' | 'MILESTONE_REJECTED' 
      | 'CONTRACT_SIGNED' | 'PAYMENT_RELEASED' | 'DISPUTE_OPENED' | 'NFT_MINTED';
  title: string;
  body: string;
  isRead: boolean;
  metadata: { contractId?: string; milestoneId?: string } | null;
  createdAt: string;
}
```

### 4.7 Screen → API Mapping

| Màn hình | APIs gọi |
|---|---|
| `/login` | `POST /auth/login` |
| `/register` | `POST /auth/register` |
| `/dashboard` (Freelancer) | `GET /contracts`, `GET /notifications` |
| `/dashboard/client` | `GET /contracts`, `POST /milestones/:id/approve`, `POST /milestones/:id/reject` |
| `/contracts` | `GET /contracts?search=&category=&sort=` |
| `/contracts/new` | `POST /contracts` |
| `/contracts/[id]` | `GET /contracts/:id`, `GET /contracts/:id/messages`, `POST /contracts/:id/messages`, `GET /contracts/:id/payments`, `POST /contracts/:id/sign` |
| `/messages` | `GET /conversations`, `GET /contracts/:id/messages`, `POST /contracts/:id/messages` |
| `/notifications` | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` |
| `/profile` | `GET /users/:userId/profile`, `PATCH /users/me/profile` |
| Submit Milestone Modal | `POST /milestones/:id/submit` |
| Approve Milestone | `POST /milestones/:id/approve` |
| Reject Milestone | `POST /milestones/:id/reject` |
| Release Payment | `POST /contracts/:id/payments/release` |

---

## 5. 5 Tính năng nghiệp vụ cốt lõi

### 5.1 Đăng ký / Đăng nhập & Hồ Sơ

#### Mục tiêu nghiệp vụ

Hệ thống cần biết "ai là ai" trước khi họ ký hợp đồng bằng ví điện tử (tuần 3+).

#### Luồng đăng ký

```
User vào /register
    ↓
Điền: fullName, email, password, chọn role (Freelancer / Client)
    ↓
POST /auth/register
    ↓
Hệ thống: hash password (bcrypt salt=12) → tạo User → tạo tokens
    ↓
FE lưu tokens → redirect /dashboard hoặc /dashboard/client
    ↓
Profile được tạo với wallet_address = null (sẽ điền tuần 3)
```

#### RBAC (Role-based Access Control)

```
┌─────────────────┬───────────────────────────────────────────────┐
│ Role            │ Quyền hạn                                     │
├─────────────────┼───────────────────────────────────────────────┤
│ CLIENT          │ Tạo hợp đồng, Approve/Reject milestone,       │
│                 │ Giải ngân thanh toán, Mở tranh chấp           │
├─────────────────┼───────────────────────────────────────────────┤
│ FREELANCER      │ Apply hợp đồng, Submit milestone kèm proof,   │
│                 │ Nhận thanh toán, Chat trong contract           │
└─────────────────┴───────────────────────────────────────────────┘
```

#### Hồ sơ người dùng (Profile)

Các thông tin quan trọng cần cập nhật sau đăng ký:

```typescript
{
  // Hiển thị & tìm kiếm
  title: "Senior Full-Stack Developer",
  location: "Hà Nội, Việt Nam",
  bio: "Mô tả bản thân...",
  hourlyRate: 50,           // USD/giờ
  skills: ["React", "Node.js", "AWS"],
  
  // Tuần 3 — Cardano Integration
  wallet_address: null,     // Sẽ map với Cardano wallet address
  
  // Hệ thống tự tính toán
  successRate: 95.5,
  totalContracts: 12,
  rating: 4.8,
}
```

---

### 5.2 Tạo Hợp Đồng

#### Mục tiêu nghiệp vụ

Client và Freelancer "vẽ" thỏa thuận chung trên giao diện web (lưu PostgreSQL) trước khi đưa lên Blockchain.

#### Luồng tạo hợp đồng đầy đủ

```
Bước 1: Client tạo Job Post (POST /contracts với status DRAFT)
         ↓
Bước 2: Freelancer vào Apply (tính năng mở rộng)
         ↓
Bước 3: Client chọn Freelancer
         ↓
Bước 4: Hai bên thống nhất điều khoản:
         - Mô tả công việc
         - Tổng ngân sách (tính từ sum(milestones.budget))
         - Deadline tổng
         - Chia milestone với % phân bổ
         ↓
Bước 5: Client bấm "Đồng ý" → POST /contracts/:id/sign
         Status: DRAFT → ACTIVE
         (hoặc → WAITING_FOR_DEPOSIT khi tích hợp Escrow tuần 3)
```

#### Cấu trúc dữ liệu khi tạo

```
Contract
├── title: "Website E-commerce"
├── totalValue: 15,000,000 VNĐ   (auto-calculated)
├── paymentTerm: "escrow-milestone"
├── status: DRAFT → ACTIVE
└── milestones:
    ├── Milestone 1: UI/UX Design   — 4,500,000đ — deadline 15/11
    ├── Milestone 2: Frontend Code  — 7,500,000đ — deadline 01/12
    └── Milestone 3: Deploy & Test  — 3,000,000đ — deadline 15/12
```

---

### 5.3 Theo Dõi Theo Từng Giai Đoạn (Milestones)

#### Mục tiêu nghiệp vụ

Thay vì trả một cục tiền vào cuối dự án, Milestone-based giúp giảm rủi ro cho cả 2 bên: Client kiểm soát được tiến độ và chất lượng, Freelancer được thanh toán ngay sau từng giai đoạn.

#### Vòng đời đầy đủ của một Milestone

```
[PENDING] ──────────────────────────────────────────────
  │ Client / Freelancer bắt đầu giai đoạn              
  ▼                                                    
[ACTIVE]                                               
  │ Freelancer làm việc                                
  │ Bấm "Submit" + Upload bằng chứng                  
  ▼                                                    
[SUBMITTED] ─────────────────────────────────────────── 
  │ ⚡ Notification gửi cho Client: "Vào kiểm tra"    
  │                                                    
  ├── Client bấm [APPROVE] ──────────────────────────  
  │       ⚡ Notification cho Freelancer: "Đã duyệt" 
  │       → Trigger giải ngân (tuần 3: AI Agent)       
  │       ▼                                            
  │   [COMPLETED] ✅                                  
  │                                                    
  └── Client bấm [REJECT] + điền lý do ─────────────  
          ⚡ Notification cho Freelancer: "Cần sửa"   
          → System message tự động tạo trong chat     
          ▼                                            
      [REVISION_REQUESTED]                             
          │ Freelancer sửa và submit lại              
          └──────────────────────────────► [SUBMITTED]
```

#### Proof of Work (Bằng chứng nộp bài)

Khi Freelancer submit milestone, phải đính kèm ít nhất 1 trong:
- **Link GitHub** — cho code
- **Link Figma** — cho thiết kế
- **File PDF/ZIP** — báo cáo, deliverables
- **Link video demo**

Tất cả files được lưu trên **Cloudinary** và URL được lưu vào `MilestoneFile` table.

---

### 5.4 Trò Chuyện Thời Gian Thực

#### Mục tiêu nghiệp vụ

Nơi hai bên thảo luận trực tiếp. Dữ liệu chat cực kỳ quan trọng vì sau này nó là "bằng chứng" để AI Agent hoặc DAO đọc và phân giải tranh chấp.

#### Kiến trúc Chat

```
Khi hợp đồng được tạo
    ↓
Hệ thống tự động assign room: "contract_{contractId}"
    ↓
FE emit: joinContractRoom({ contractId })
    ↓
Cả 2 bên (Client & Freelancer) join cùng room
    ↓
Freelancer gửi tin nhắn:
    POST /contracts/:id/messages (REST — lưu DB)
    → messagesService.broadcastNewMessage() (Socket.IO — realtime)
    → Client nhận ngay qua event "newMessage"
```

#### Luồng gửi tin nhắn hoàn chỉnh

```typescript
// 1. FE gọi REST API để lưu vào DB
await fetch('/api/v1/contracts/abc/messages', {
  method: 'POST',
  body: JSON.stringify({ type: 'text', text: 'Chào bạn!' })
});

// 2. BE lưu vào DB → gọi gateway.broadcastNewMessage()
// 3. Gateway emit 'newMessage' đến room "contract_abc"
// 4. FE listener cập nhật UI ngay lập tức (không cần refresh)
socket.on('newMessage', (msg) => {
  setMessages(prev => [...prev, msg]);
});
```

#### Loại tin nhắn hỗ trợ

| Type | Mô tả | Hiển thị |
|---|---|---|
| `text` | Văn bản thông thường | Bubble chat |
| `file` | Đính kèm link/file (Cloudinary) | Card với icon file + size |
| `system` | Tự động từ hệ thống | Banner xám (vd: "Client yêu cầu chỉnh sửa: ...") |

---

### 5.5 Thông Báo (Notification System)

#### Mục tiêu nghiệp vụ

Đảm bảo luồng vận hành mượt mà, nhắc nhở các bên không quên việc, không cần mở app để biết có cập nhật mới.

#### Kiến trúc Notification

```
Sự kiện xảy ra (vd: Freelancer submit milestone)
    ↓
notificationsService.create(clientId, type, title, body, metadata)
    ↓
├── Lưu Notification vào DB (persistent)
└── notificationsGateway.emitNotification(clientId, notification)
        ↓
        Server emit 'notification' đến room "user_{clientId}"
        ↓
        Client nhận → hiện toast popup + tăng badge count
```

#### Danh sách sự kiện có notification

| Sự kiện | Người nhận | Nội dung thông báo |
|---|---|---|
| Freelancer submit milestone | **Client** | "Vào kiểm tra sản phẩm của Milestone: [tên]" |
| Client approve milestone | **Freelancer** | "Milestone [tên] đã được duyệt! Thanh toán sắp được giải ngân" |
| Client reject milestone | **Freelancer** | "Milestone [tên] cần chỉnh sửa. Xem lý do trong hợp đồng" |
| Hợp đồng được ký | **Cả 2 bên** | "Hợp đồng [tên] đã có hiệu lực" |
| Sắp deadline (chưa nộp) | **Freelancer** | "⏰ Deadline milestone [tên] còn X ngày!" |
| Thanh toán được giải ngân | **Freelancer** | "💰 X VNĐ đã được chuyển vào ví của bạn" |

#### Deadline Reminder (Cron Job — Tương lai)

```typescript
// Sẽ implement cron job hàng ngày:
@Cron('0 9 * * *') // 9h sáng mỗi ngày
async checkUpcomingDeadlines() {
  const threeDaysLater = addDays(new Date(), 3);
  const milestones = await prisma.milestone.findMany({
    where: {
      status: { in: ['PENDING', 'ACTIVE'] },
      deadline: { lte: threeDaysLater.toISOString() }
    },
    include: { contract: { include: { freelancer: true } } }
  });
  
  for (const ms of milestones) {
    await notificationsService.create(
      ms.contract.freelancerId,
      NotificationType.DEADLINE_REMINDER,
      'Sắp tới deadline!',
      `Milestone "${ms.name}" sẽ đến hạn vào ${ms.deadline}`
    );
  }
}
```

---

## 6. Luồng hoạt động tổng thể

```
GIAI ĐOẠN 1: THIẾT LẬP HỢP ĐỒNG
──────────────────────────────────
1. Freelancer đăng ký → chọn role FREELANCER → cập nhật profile + skills
2. Client đăng ký → chọn role CLIENT
3. Client tạo Job Post (POST /contracts) với các milestone
4. [Mở rộng] Freelancer apply → Client chọn Freelancer
5. Hai bên đồng ý điều khoản → POST /contracts/:id/sign
6. Status: DRAFT → ACTIVE
7. ⚡ Notification: "Hợp đồng đã có hiệu lực!"
8. Chat room "contract_{id}" được dùng để trao đổi

GIAI ĐOẠN 2: THỰC HIỆN MILESTONE
──────────────────────────────────
9.  Freelancer làm Milestone 1 (PENDING → ACTIVE)
10. Freelancer upload proof + bấm Submit
    → POST /milestones/:id/submit
    → Status: ACTIVE → SUBMITTED
    → ⚡ Notification cho Client: "Vào kiểm tra!"
11. Client review bằng chứng
    ├── APPROVE:
    │   → Status: SUBMITTED → COMPLETED
    │   → ⚡ Notification cho Freelancer: "Đã duyệt!"
    │   → Trigger thanh toán (tuần 3: AI Agent giải ngân escrow)
    └── REJECT + lý do:
        → Status: SUBMITTED → REVISION_REQUESTED
        → System message tự động trong chat
        → ⚡ Notification cho Freelancer: "Cần sửa!"
        → Freelancer sửa → Submit lại → loop

GIAI ĐOẠN 3: HOÀN THÀNH (TẤT CẢ MILESTONE DONE)
─────────────────────────────────────────────────
12. Tất cả milestone COMPLETED
    → Contract status: ACTIVE → COMPLETED
    → [Tuần 4] Mint NFT Certificate cho cả 2 bên
```

---

## 7. Hướng dẫn cài đặt & chạy dự án

### Backend (FreelancePact-be)

```bash
# 1. Cài dependencies
cd FreelancePact-be
npm install

# 2. Cấu hình biến môi trường
cp .env.example .env
# Sửa .env theo môi trường của bạn

# 3. Setup database
npm run db:push       # Tạo tables từ schema (dev/SQLite)
# hoặc
npm run db:migrate    # Migrate (production/PostgreSQL)

# 4. Chạy development server
npm run start:dev
# → API: http://localhost:3001/api/v1
# → Swagger: http://localhost:3001/api/docs

# 5. Xem database (optional)
npm run db:studio
```

### Frontend (FreelancePact-fe)

```bash
# 1. Cài dependencies
cd FreelancePact-fe
npm install

# 2. Cấu hình biến môi trường
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1" > .env.local

# 3. Chạy development server
npm run dev
# → http://localhost:3000
```

### Docker (Production PostgreSQL)

```bash
# Trong FreelancePact-be/
docker-compose up -d  # Khởi động PostgreSQL container

# Cập nhật .env:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/freelancepact"

# Migrate database
npm run db:migrate:prod
```

---

## 8. Roadmap — Tuần 3 & 4 (Blockchain)

### Tuần 3: Cardano Integration

| Tính năng | Mô tả |
|---|---|
| **Wallet Connection** | Tích hợp Cardano Wallet (Nami, Eternl, Lace) vào FE |
| **wallet_address mapping** | User kết nối ví → lưu `wallet_address` vào profile (Web2 ↔ Web3 bridge) |
| **Escrow Smart Contract** | Deploy Plutus contract — giam giữ ADA khi hợp đồng ACTIVE |
| **On-chain Contract** | Serialize hợp đồng → hash → lưu lên Cardano |
| **Payment via Escrow** | Khi milestone APPROVED → AI Agent ra lệnh giải ngân ADA từ smart contract |

### Tuần 4: AI Agent & DAO

| Tính năng | Mô tả |
|---|---|
| **AI Agent** | Đọc chat history + proof → tự động đề xuất approve/reject |
| **Dispute Resolution** | Mở tranh chấp → DAO vote → AI phán xét dựa trên evidence |
| **NFT Certificate** | Khi hợp đồng COMPLETED → mint NFT với metadata (title, parties, amount, date) |
| **Reputation System** | Cập nhật `successRate` và `rating` on-chain sau mỗi contract |

---

*Tài liệu này được tạo từ source code thực tế của dự án FreelancePact.*  
*Cập nhật tương ứng khi có thay đổi lớn về API hoặc kiến trúc.*
