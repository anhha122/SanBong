# PitchPro — phân chia module theo nghiệp vụ

| Đường dẫn | Trách nhiệm chính | Gợi ý nhánh Git |
|---|---|---|
| `assets/js/process-1/booking.js` | Đặt lịch, kiểm tra trùng, nhận/trả sân, yêu cầu hủy | `feature/booking` |
| `assets/js/process-1/sales.js` | Bán nước/bóng, trừ kho, bổ sung sản phẩm vào hóa đơn mở | `feature/sales` |
| `assets/js/process-1/payment.js` | Hóa đơn, cọc, thanh toán tiền mặt/QR demo, phiếu thu | `feature/payment` |
| `assets/js/process-2/reconciliation.js` | Tập hợp khoản thu, kiểm đếm, phát hiện chênh lệch, phê duyệt và khóa sổ | `feature/reconciliation` |
| `assets/js/shared/exceptions.js` | Giải trình, phê duyệt ngoại lệ, hoàn tiền theo yêu cầu | `feature/exceptions` |
| `assets/js/shared/ui.js` | Dashboard, modal, chuyển trang, xuất dữ liệu | `feature/ui` |
| `assets/js/core.js` | Một nguồn dữ liệu, các hàm tính tiền, localStorage, nhật ký, dữ liệu khởi tạo | Người tích hợp |
| `assets/js/main.js` | Sự kiện click, submit và điều phối chức năng đến đúng module | Người tích hợp |
| `assets/css/styles.css` | Giao diện và responsive chung | Người phụ trách UI |
| `index.html` | Bố cục, menu, thứ tự nạp JS/CSS | Người tích hợp |

## Quy ước tích hợp

**Quan trọng:** `process-1` và `process-2` dùng **chung** `state.invoices`, `state.receipts`, `state.issues`, `state.recons` trong `core.js`. Không tạo hai khóa lưu trữ độc lập hoặc copy hàm tính tiền sang từng quy trình.

- Các file hiện là **classic scripts**, không phải ES Modules; thứ tự `<script defer>` trong `index.html` là bắt buộc.
- Để dễ làm song song, thành viên nên sửa đúng file mình phụ trách và báo người tích hợp nếu phải thay `core.js`, `main.js`, CSS hoặc dữ liệu chung.
- UI của một nghiệp vụ được đặt cùng module; modal cơ bản và điều hướng đặt trong `shared/ui.js`.
- Dữ liệu demo chỉ ở localStorage, không đồng bộ máy khác.
- Quy tắc nghiệm thu: chạy các bước ở `docs/TESTING.md` trước khi gộp vào `main`.

## Dọn mã cũ

Các file `assets/app.js`, `assets/demo-flow.js`, `base.html`, `comnunity.html`, `pitch_list.html`, `legacy/`, `css/calendar.css` và `js/lich.js` **không nằm trong dự án sạch này**. Chúng là bản cũ/đoạn thử nghiệm và đã được thay thế bằng các module đang hoạt động. Nếu cần tra cứu, xem bản ZIP PitchPro FE trước đó chứ không cần đem theo vào GitHub mới.
