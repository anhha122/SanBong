# PitchPro To-Be — Quản lý sân bóng (frontend demo)

Dự án demo nghiệp vụ theo hai quy trình nhóm đã xây dựng:

- **Quy trình 1 — Xử lý dịch vụ và thanh toán khách hàng:** tạo đặt sân và hóa đơn nháp → ghi nhận cọc → nhận sân → bán thêm sản phẩm → trả sân/chốt hóa đơn → thu tiền mặt hoặc mô phỏng xác minh chuyển khoản → lưu phiếu thu và nhật ký. Có nhánh hủy và đề nghị hoàn tiền.
- **Quy trình 2 — Tổng hợp và đối soát doanh thu cuối ngày:** đọc các khoản thu/chi từ Quy trình 1 → kiểm đếm thực tế → phát hiện chênh lệch → bổ sung giải trình/chứng từ → quản lý phê duyệt → khóa sổ.

## 1. Chạy dự án

**Không cần cài Node.js, Python, npm hay database để chạy demo.**

1. Giải nén thư mục `PitchPro-ToBe`.
2. Mở bằng VS Code: **File → Open Folder**.
3. Nhấp chuột phải `index.html` → **Open with Live Server** (VS Code cần cài extension *Live Server*). Hoặc mở `index.html` trực tiếp trên Chrome.
4. Vào `Lịch & đặt sân` để bắt đầu.

Có thể dùng lệnh sau nếu máy đã cài Python:

```powershell
python -m http.server 5500
```

Sau đó mở http://localhost:5500/index.html .

Nếu trang cũ vẫn xuất hiện, nhấn `Ctrl + Shift + R` để tải lại. Không mở `base.html`/`pitch_list.html`: các trang đó đã được loại khỏi bản mới.

## 2. Cây thư mục

```text
PitchPro-ToBe/
├── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── core.js
│       ├── main.js
│       ├── process-1/
│       │   ├── booking.js
│       │   ├── sales.js
│       │   └── payment.js
│       ├── process-2/
│       │   └── reconciliation.js
│       └── shared/
│           ├── exceptions.js
│           └── ui.js
├── docs/
│   ├── WORKFLOWS.md
│   └── TESTING.md
├── CONTRIBUTING.md
├── MODULES.md
├── .gitignore
└── .editorconfig
```

## 3. Lưu ý kỹ thuật

- Đây là **frontend thuần HTML/CSS/JavaScript**. Dữ liệu giả lập lưu bằng `localStorage` của **từng trình duyệt**, không phải cơ sở dữ liệu chung của nhóm. Mỗi người sẽ có dữ liệu riêng khi thử trên máy họ.
- Nút đổi vai trò `Nhân viên` / `Quản lý` chỉ mô phỏng phân quyền, **không phải đăng nhập/xác thực thật**.
- **QR, chuyển khoản và hoàn tiền chỉ là mô phỏng giao dịch đã được nhân viên xác nhận**; chưa có tích hợp ngân hàng, API, callback/chữ ký hay chuyển tiền thực.
- Giá sân (5 người: 200.000đ/giờ; 7 người: 300.000đ/giờ), sản phẩm, số lượng và các lượt đặt mẫu đều là **dữ liệu demo**; không phải số liệu nghiệp vụ do tài liệu quy trình cung cấp.
- Các file JavaScript **chưa dùng `import/export`** mà đang tải tuần tự theo thứ tự trong `index.html`, chia sẻ scope chung. Không tự ý thay đổi thứ tự script. Đọc `MODULES.md` trước khi sửa `core.js` hoặc `main.js`.
- Khi cần nhiều người cùng cập nhật dữ liệu theo thời gian thực, nhóm phải thiết kế backend, database và API; GitHub chỉ chia sẻ **mã nguồn**, không đồng bộ `localStorage`.

## 4. Khởi tạo GitHub mới

Trên GitHub tạo repository trống `PitchPro-ToBe` (không chọn thêm README hay .gitignore). Sau đó tại terminal của thư mục này:

```powershell
git init
git branch -M main
git add .
git commit -m "Initial commit - PitchPro To-Be modular frontend"
git remote add origin https://github.com/TEN-TAI-KHOAN/PitchPro-ToBe.git
git push -u origin main
```

Thay `TEN-TAI-KHOAN` bằng tên tài khoản GitHub thật của bạn. Nếu Git chưa cấu hình tên/email hoặc GitHub chưa xác thực, hoàn thành bước đăng nhập trước khi push.

## 5. Những thứ không đưa lên repo

Không đưa `.env` chứa thông tin bí mật, token, mật khẩu, dữ liệu khách thật hoặc thư mục `.git` cũ. Tài liệu gốc DOCX/PDF không đính kèm mặc định để tránh đưa thông tin nội bộ lên repository công khai; bản tóm tắt quy trình nằm trong `docs/WORKFLOWS.md`.

Chi tiết chia việc, luồng kiểm thử và giới hạn: [MODULES.md](MODULES.md), [CONTRIBUTING.md](CONTRIBUTING.md), [docs/TESTING.md](docs/TESTING.md).
