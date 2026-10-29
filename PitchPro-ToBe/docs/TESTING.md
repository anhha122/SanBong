# Checklist nghiệm thu FE — chạy trước khi tạo Pull Request

## A. Quy trình 1: từ đặt sân đến thanh toán

- [ ] Trên `Lịch & đặt sân`, tạo lượt ngày hôm nay, sân 5 người, 09:00–10:00, tên đội tùy chọn.
- [ ] Tạo xong có hóa đơn **Nháp**, chưa tự thu cọc.
- [ ] Chọn `Xem hóa đơn` → `Ghi nhận tiền cọc`, nhập 100.000đ (cọc 50% tiền sân 200.000đ).
- [ ] `Nhận sân` → `Thêm sản phẩm` → 2 chai Nước suối 500ml (10.000đ/chai).
- [ ] Kho sản phẩm giảm 2 chai; hóa đơn tổng 220.000đ.
- [ ] `Trả sân/chốt` → tổng cần thu 120.000đ. Không cho thêm sản phẩm vào hóa đơn sân đã chốt.
- [ ] `Thanh toán tiền mặt` → đã thu 120.000đ → hóa đơn **Đã thanh toán**, 2 phiếu thu (cọc + tất toán).
- [ ] Kiểm tra ở `Nhật ký thao tác` có các bước đã thực hiện.

## B. Thanh toán QR demo

- [ ] Tạo lượt mới, nhận sân và trả sân.
- [ ] `Tạo yêu cầu QR`: hóa đơn phải ở trạng thái **Chờ đối soát QR**, chưa có phiếu thu tất toán.
- [ ] Nhập mã tham chiếu giao dịch + đúng số tiền sau khi *mô phỏng* đối chiếu → hóa đơn **Đã thanh toán**.
- [ ] Không cho ghi lại một mã ngân hàng đã sử dụng.

## C. Hủy và hoàn cọc

- [ ] Tạo lượt mới, ghi nhận cọc, yêu cầu hủy.
- [ ] Hệ thống tạo `Yêu cầu hoàn tiền`; tiền chưa tự động hoàn.
- [ ] Nhân viên bổ sung giải trình; đổi dropdown Vai trò sang **Quản lý** để phê duyệt.
- [ ] Chọn xác nhận đã hoàn với mã chứng từ; tạo khoản thu âm, lượt và hóa đơn được hủy.

## D. Quy trình 2: đối soát

- [ ] Chọn `Đối soát cuối ngày` → lập phiên đối soát.
- [ ] Nhập số kiểm đếm tiền mặt và chuyển khoản thực tế để khớp tổng sổ.
- [ ] Đổi sang `Quản lý` → phê duyệt → khóa sổ, trạng thái **Đã khóa**.
- [ ] Chạy thử một phiên có chênh lệch: xuất hiện yêu cầu ngoại lệ và không được duyệt khi còn lệch.
- [ ] Bổ sung giải trình, sửa số thực nhận khớp, quản lý giải quyết ngoại lệ, phê duyệt rồi khóa sổ.

## E. Kiểm thử giao diện

- [ ] Trang `index.html` mở được bằng Live Server.
- [ ] Không có lỗi đỏ ở Chrome DevTools → Console.
- [ ] Các mục trên sidebar chuyển được.
- [ ] Trên màn hình nhỏ/sidebar mobile không bị mất nút chính.
- [ ] `Khôi phục dữ liệu demo` hoạt động, chỉ dùng khi muốn xóa dữ liệu mô phỏng trên trình duyệt.

**Lưu ý:** Vai trò, dữ liệu, giao dịch ngân hàng/hoàn tiền đều là mô phỏng trên `localStorage`; checklist không chứng minh đã hoạt động với backend thực tế.
