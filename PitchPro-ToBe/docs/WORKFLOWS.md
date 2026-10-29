# Phạm vi nghiệp vụ theo tài liệu của nhóm

Tóm tắt từ các tài liệu `BTH2.4` (As-Is), `BTH-3.1` (mô hình To-Be) và `BTH3.2` (phân loại mức tự động hóa) mà nhóm cung cấp.

## Quy trình 1 — Xử lý dịch vụ và thanh toán khách hàng

1. Tạo lượt đặt và khởi tạo hóa đơn nháp có mã duy nhất.
2. Theo dõi lượt nhận sân; nhân viên xác nhận đã nhận/trả sân thực tế.
3. Thêm nước/bóng/sản phẩm; kiểm tra tồn và ghi đồng thời thay đổi hóa đơn — tồn kho (demo localStorage, chưa có DB transaction).
4. Ghi nhận tiền cọc **chỉ khi đã thu thật**; không tự suy ra đã nhận từ tỷ lệ cọc.
5. Khi trả sân, hệ thống cộng tiền thuê + hàng bán, khấu trừ tiền cọc đã ghi nhận và chốt số phải thu.
6. Thanh toán tiền mặt do nhân viên đếm và xác nhận; với chuyển khoản, tạo yêu cầu QR demo rồi xác minh thủ công mã + số tiền trước khi chốt.
7. Lưu khoản thu, trạng thái hóa đơn và nhật ký; chỉ in chứng từ sau khi hóa đơn đã hoàn tất.
8. Nếu hủy lượt: chưa thu tiền thì hủy hóa đơn nháp; đã thu tiền thì lập yêu cầu duyệt hoàn và ghi nhận khoản hoàn âm sau khi đã thực hiện.

## Quy trình 2 — Tổng hợp và đối soát doanh thu cuối ngày

1. Chọn ngày cần đối soát; hệ thống tổng hợp giao dịch đã ghi sổ theo tiền mặt và ngân hàng.
2. Nhân viên kiểm đếm tiền mặt và nhập số đã đối chiếu chuyển khoản thực tế.
3. Hệ thống so sánh; nếu lệch, lập yêu cầu giải trình kèm chứng từ / nguyên nhân.
4. Người có vai trò Quản lý (trong demo: dropdown mô phỏng) phê duyệt khi số liệu khớp và ngoại lệ đã xử lý.
5. Khóa sổ ngày đã được phê duyệt; chặn các khoản thu/chi tiếp theo trong kỳ mô phỏng.

## Giới hạn so với To-Be mục tiêu

Bản frontend demo **chưa** tích hợp API ngân hàng hoặc webhook xác thực chữ ký, gửi nhắc hẹn theo timer, phân quyền thật, database transaction/concurrency, email/sms, AI tóm tắt chứng từ hay quy trình BPMN engine. Phần liên quan được mô phỏng có ghi chú rõ ở màn hình. Không đưa bản này vào hoạt động thu tiền thật.

Các số liệu mô phỏng BIMP (ví dụ Cycle Time) trong BTH3.1 là kết quả nghiên cứu mô phỏng, **không phải** số đo hiệu năng của phần mềm FE này.
