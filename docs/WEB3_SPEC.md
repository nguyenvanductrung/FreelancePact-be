# Web3 Specification (FreelancePact on Cardano)

Tài liệu này mô tả kiến trúc và luồng tích hợp Web3 của dự án FreelancePact, hoạt động trên mạng lưới **Cardano** và được quản lý bởi **DAOPilot AI**.

> **Mục đích:** Cung cấp ngữ cảnh đầy đủ cho Developer hoặc AI về cách hệ thống Blockchain tương tác với Backend/Frontend.

---

## 1. Công nghệ & Nền tảng (Tech Stack)
- **Blockchain:** Cardano
- **Token thanh toán:** ADA
- **Wallet Support:** Nami, Eternl
- **Smart Contract:** Plutus (hoặc ngôn ngữ tương đương trên Cardano)
- **Automation:** DAOPilot AI (Agent tự động hóa các thao tác on-chain)

---

## 2. Luồng Escrow Thông Minh (Smart Escrow Flow)

Hệ thống Escrow không yêu cầu con người can thiệp thủ công (ngoại trừ lúc nạp tiền và xác nhận).

### Bước 1: Nạp tiền (Deposit)
1. **Client** kết nối ví (Nami/Eternl) thông qua Frontend.
2. Client gửi số lượng **ADA** tương ứng với ngân sách hợp đồng (hoặc Milestone) vào **Escrow Contract**.

### Bước 2: Hoàn thành & Xác nhận (Completion & Confirmation)
1. **Freelancer** nộp sản phẩm qua hệ thống Backend.
2. **Client** xác nhận nghiệm thu sản phẩm trên giao diện.
3. Cả 2 bên (Client & Freelancer) đều có action xác nhận trạng thái hoàn thành.

### Bước 3: Tự động Giải ngân (Auto-release by AI)
1. Khi có đủ tín hiệu xác nhận từ 2 bên, **DAOPilot AI Agent** sẽ tự động parse (phân tích) trạng thái.
2. DAOPilot tự động thực thi giao dịch trên Escrow Contract để chuyển ADA từ ví Contract sang ví của Freelancer.
3. Hệ thống gửi email thông báo cho cả 2 bên.
4. Cập nhật lịch sử giao dịch on-chain (Immutable Audit Log).

---

## 3. Luồng Giải quyết Tranh chấp (Dispute Resolution)

Trong trường hợp có bất đồng giữa Client và Freelancer:
1. **Mở tranh chấp:** Một trong hai bên bấm nút `Dispute`. Tiền ADA tiếp tục bị khóa trong Escrow.
2. **Bỏ phiếu (Voting):** Bên thứ 3 (Third-party/DAO) sẽ tham gia xem xét các bằng chứng (tin nhắn, file đã nộp) và thực hiện việc bỏ phiếu (Vote) phân định đúng sai.
3. **Thực thi:** Sau khi có kết quả bỏ phiếu, **DAOPilot AI Agent** sẽ lấy kết quả này và tự động thực thi việc chuyển tiền ADA cho bên thắng (hoặc chia theo tỷ lệ biểu quyết).

---

## 4. Hệ thống Uy tín On-chain (On-chain Reputation & NFT)

Để đảm bảo danh tiếng của Freelancer là không thể làm giả:
- Khi một hợp đồng kết thúc thành công (Completed Contract), hệ thống sẽ tự động **Mint (đúc) một NFT**.
- NFT này đóng vai trò như một chứng nhận on-chain vĩnh viễn về kỹ năng và kinh nghiệm của Freelancer.
- Mọi giao dịch (Thanh toán, Tranh chấp, Đúc NFT) đều được ghi lại trên Cardano thành một **Audit Log Immutable**, cho phép bất kỳ ai cũng có thể verify tính minh bạch của nền tảng.
