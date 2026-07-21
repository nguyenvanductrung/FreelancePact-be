# Web3 Specification (FreelancePact on Cardano)

Tài liệu này mô tả kiến trúc và luồng tích hợp Web3 của dự án FreelancePact, hoạt động trên mạng lưới **Cardano** và được quản lý bởi **DAOPilot AI**.

> **Mục đích:** Cung cấp ngữ cảnh đầy đủ cho Developer hoặc AI về cách hệ thống Blockchain tương tác với Backend/Frontend.

---

## 1. Công nghệ & Nền tảng (Tech Stack)

- **Blockchain:** Cardano
- **Token thanh toán:** ADA
- **Wallet Support:** Nami, Eternl (kết nối qua chuẩn **CIP-30**)
- **Wallet Connector & Off-chain SDK:** [Mesh SDK](https://meshjs.dev/) — cung cấp React hooks kết nối ví (`useWallet`), `TxBuilder` để xây dựng giao dịch tương tác với Aiken validator, và hỗ trợ mint NFT (CIP-25/CIP-68). Sử dụng một SDK duy nhất thay vì tích hợp nhiều thư viện rời rạc.
- **Smart Contract:** [Aiken](https://aiken-lang.org/) — ngôn ngữ hiện đại để phát triển smart contract trên Cardano, compile thẳng ra Plutus Core. Cú pháp dễ học hơn Haskell, có sẵn nhiều pattern mã nguồn mở (bao gồm escrow-like pattern từ MeshJS/TrustLevel) để tham khảo và tái sử dụng.
- **Automation:** DAOPilot AI Agent — đóng vai trò **off-chain transaction builder**, **KHÔNG** giữ quyền tự ký hay tự quyết định giải ngân. Xem chi tiết tại [Mục 5: Nguyên tắc bảo mật](#5-nguyên-tắc-bảo-mật-của-daopilot-ai-agent).

---

## 2. Luồng Escrow Thông Minh (Smart Escrow Flow)

Toàn bộ logic escrow (deposit, release, refund) được thực thi bởi **on-chain validator script (Aiken)**. Backend/AI Agent chỉ đóng vai trò build & submit transaction — mọi điều kiện giải ngân đã được validator kiểm tra trên chain.

### Bước 1: Nạp tiền (Deposit)

1. **Client** kết nối ví (Nami/Eternl) thông qua Frontend bằng **Mesh SDK** (CIP-30).
2. Client ký giao dịch gửi số lượng **ADA** tương ứng với ngân sách hợp đồng (hoặc Milestone) vào **Escrow Validator Address**.
3. **Phí giao dịch (transaction fee):** Client tự trả phí ADA cho giao dịch deposit. Ví (Nami/Eternl) sẽ pop-up yêu cầu user ký xác nhận.

### Bước 2: Hoàn thành & Xác nhận (Completion & Confirmation)

1. **Freelancer** nộp sản phẩm qua hệ thống Backend.
2. **Client** xác nhận nghiệm thu sản phẩm trên giao diện.
3. Cả 2 bên (Client & Freelancer) đều có action xác nhận trạng thái hoàn thành. Trạng thái xác nhận được ghi nhận on-chain (hoặc off-chain rồi verify bằng chữ ký).

### Bước 3: Giải ngân qua On-chain Validator (Release via Validator)

1. Khi có đủ tín hiệu xác nhận từ 2 bên, **DAOPilot AI Agent** sẽ build transaction gọi vào Aiken Escrow Validator với redeemer `Release`.
2. **On-chain Validator tự kiểm tra điều kiện:** đủ 2 chữ ký xác nhận (client + freelancer) → cho phép giải ngân. Nếu điều kiện không thỏa, transaction bị reject ngay trên chain — AI Agent không thể bypass.
3. Transaction được submit lên Cardano network. ADA từ Escrow Validator chuyển sang ví Freelancer.
4. Hệ thống gửi email thông báo cho cả 2 bên.
5. Cập nhật lịch sử giao dịch on-chain (Immutable Audit Log).

> **Quan trọng:** AI Agent **chỉ build & submit transaction dựa trên điều kiện đã được on-chain validator xác thực**. Agent không giữ private key có quyền tự ý chuyển tiền. Điều này đảm bảo không có single point of trust tập trung.

---

## 3. Luồng Giải quyết Tranh chấp (Dispute Resolution)

Trong trường hợp có bất đồng giữa Client và Freelancer, hệ thống sử dụng cơ chế Multi-Signature (Đa chữ ký) kết hợp Mesh SDK và Aiken Validator:

1. **Mở tranh chấp (Open Dispute):**
   - Một trong hai bên (Client hoặc Freelancer) yêu cầu mở tranh chấp trên giao diện.
   - Frontend gọi Backend để tạo Unsigned Transaction (với redeemer là `OpenDispute`).
   - Người dùng ký giao dịch bằng ví CIP-30 (Nami/Eternl). Trạng thái Datum on-chain của Escrow chuyển từ `Active` sang `Disputed`.
2. **Bỏ phiếu (DAO Council Voting):**
   - Một hội đồng (Council) gồm các Admin có quyền phân xử. Danh sách Public Key Hash (PKH) của Council được lưu trực tiếp trong Datum của Smart Contract để đảm bảo tính minh bạch on-chain.
   - Các Admin truy cập Dashboard để xem xét bằng chứng và chọn 1 trong 3 phán quyết: `Hoàn tiền (Client)`, `Trả lương (Freelancer)` hoặc `Chia đôi (50/50)`.
   - Mỗi lượt bỏ phiếu thực chất là quá trình Admin thực hiện **Ký một phần (Partial Sign)** lên một Unsigned Transaction phân xử do Backend cấp. Backend lưu lại chữ ký này (`partialSigCbor`).
3. **Thực thi và Giải ngân (Resolve Dispute):**
   - Backend theo dõi số lượng chữ ký cho cùng một phán quyết.
   - Khi số lượng chữ ký đạt ngưỡng tối thiểu (Threshold, ví dụ: 2/3) quy định trong Datum, Backend dùng `MeshTxBuilder.mergeWitnesses` để gộp toàn bộ chữ ký của Admin.
   - Backend sử dụng **Ví Platform** (ví server) để ký lần cuối nhằm trả phí mạng (fee) và submit giao dịch lên Blockfrost.
   - **Bảo mật On-chain:** Validator Aiken tự động kiểm tra xem giao dịch có chứa đủ chữ ký hợp lệ của các Admin thuộc Council không và lượng ADA có được phân bổ đúng như quy định trong phán quyết không. Nếu đúng, ADA sẽ được giải phóng.

---

## 4. Hệ thống Uy tín On-chain (On-chain Reputation & NFT)

Để đảm bảo danh tiếng của Freelancer là không thể làm giả:

- Khi một hợp đồng kết thúc thành công (Completed Contract), hệ thống sẽ tự động **Mint (đúc) một NFT**.
- **Chuẩn metadata:**
  - **MVP:** Sử dụng **CIP-25** — đơn giản, phổ biến, phù hợp cho NFT tĩnh chứng nhận hoàn thành hợp đồng.
  - **Tương lai:** Nâng cấp lên **CIP-68** — cho phép update metadata sau khi mint (ví dụ: NFT "level up" theo số hợp đồng hoàn thành, thêm rating, thêm skill tags). CIP-68 phù hợp hơn cho hệ thống reputation dài hạn.
- NFT này đóng vai trò như một chứng nhận on-chain vĩnh viễn về kỹ năng và kinh nghiệm của Freelancer.
- **Phí mint NFT:** Freelancer trả phí ADA cho transaction mint. Platform có thể subsidize phí này trong giai đoạn khuyến mãi.
- Mọi giao dịch (Thanh toán, Tranh chấp, Đúc NFT) đều được ghi lại trên Cardano thành một **Audit Log Immutable**, cho phép bất kỳ ai cũng có thể verify tính minh bạch của nền tảng.

---

## 5. Nguyên tắc Bảo mật của DAOPilot AI Agent

> **⚠️ QUAN TRỌNG — Đây là nguyên tắc cốt lõi của kiến trúc bảo mật:**

DAOPilot AI Agent là một **off-chain service** đóng vai trò:

- **Build transaction:** Xây dựng transaction body dựa trên trạng thái hệ thống (xác nhận 2 bên, kết quả vote, v.v.).
- **Submit transaction:** Gửi transaction đã được ký lên Cardano network.

DAOPilot AI Agent **KHÔNG ĐƯỢC**:

- ❌ Giữ private key có quyền rút tiền từ Escrow.
- ❌ Tự quyết định giải ngân mà không có xác thực on-chain.
- ❌ Bypass logic của Aiken Validator script.

**Mọi điều kiện giải ngân / phân xử tranh chấp PHẢI được kiểm tra bởi on-chain validator.** AI Agent chỉ là "người đưa thư" — nó build và gửi transaction, nhưng transaction chỉ thành công khi validator script cho phép.

Cách hoạt động cụ thể:
1. AI Agent monitor trạng thái hệ thống (qua database hoặc on-chain query).
2. Khi phát hiện điều kiện thỏa mãn (ví dụ: cả 2 bên đã xác nhận), Agent build transaction.
3. Transaction được submit lên chain → **Aiken Validator kiểm tra lại toàn bộ điều kiện**.
4. Nếu hợp lệ → transaction thành công. Nếu không → transaction bị reject. Agent không có cách nào bypass.

---

## 6. Chính sách Phí Giao dịch (Transaction Fee Policy)

Mỗi thao tác on-chain đều tốn phí ADA thật. Chính sách phí:

| Thao tác | Ai trả phí? | Ghi chú |
|---|---|---|
| Deposit ADA vào Escrow | **Client** | Ví pop-up xin ký |
| Release (giải ngân) | **Platform/Agent** | Agent submit, phí tính vào transaction |
| Mint NFT Reputation | **Freelancer** | Có thể subsidize trong giai đoạn khuyến mãi |
| Mở Dispute | **Bên mở dispute** | Tránh spam dispute |
| Vote (Council/DAO) | **Platform** (MVP) | Admin vote, platform chịu phí |

> **Lưu ý UX:** Mỗi transaction cần user ký qua ví → cần UI/UX rõ ràng giải thích cho user biết họ đang ký gì và phí ước tính bao nhiêu.

---

## 7. Thứ tự Triển khai Khuyến nghị

Theo approach **frontend-first**, thứ tự triển khai Web3 layer:

### Phase 1: Mock 100% Web3 Layer (hiện tại)
- Wallet connect giả (mock CIP-30 response)
- Escrow status giả (mock transaction states)
- NFT giả (mock metadata display)
- Hoàn thiện UI: Dashboard, Submit Milestone, Review Milestone

### Phase 2: Aiken Smart Contract
- Viết Aiken Validator cho Escrow (deposit, release, refund) — tham khảo pattern từ MeshJS/TrustLevel
- Tích hợp Mesh SDK ở off-chain code (React frontend + NestJS backend)
- Kết nối ví thật trên Cardano Testnet (Preview/Preprod)

### Phase 3: NFT Reputation
- Mint NFT CIP-25 khi contract hoàn thành
- Hiển thị NFT portfolio trên profile Freelancer

### Phase 4: Dispute & DAO Voting
- Council Vote giả lập (admin accounts)
- Giao diện vote thiết kế sẵn cho DAO thật
- Sau khi ổn định → chuyển sang on-chain governance token
