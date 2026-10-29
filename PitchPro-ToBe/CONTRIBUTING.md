# Hướng dẫn làm việc nhóm trên GitHub

## Bắt đầu

Clone repository (thay đúng URL nhóm):

```powershell
git clone https://github.com/TEN-TAI-KHOAN/PitchPro-ToBe.git
cd PitchPro-ToBe
```

Trước khi làm chức năng mới:

```powershell
git switch main
git pull origin main
git switch -c feature/booking
```

Thay `feature/booking` bằng tên nhánh phần bạn phụ trách (`feature/sales`, `feature/payment`, `feature/reconciliation`, `feature/exceptions`...).

## Sau khi sửa code

```powershell
git status
git add .
git commit -m "Implement booking workflow"
git push -u origin feature/booking
```

Vào GitHub tạo **Pull Request** vào `main`; nhờ một thành viên khác review, chạy qua checklist rồi mới merge. Không push trực tiếp nhánh `main` khi đang làm nhóm.

## Các nguyên tắc

1. Một nhánh cho một tính năng hoặc bản sửa lỗi.
2. Không sửa đồng thời `core.js`, `main.js` và `index.html` nếu chưa thống nhất với người tích hợp.
3. Nếu thay đổi trường dữ liệu trong hóa đơn / khoản thu, thông báo cho cả nhóm Quy trình 1 và Quy trình 2.
4. Không đưa lên GitHub dữ liệu thật của khách hàng, khóa API, mật khẩu hoặc `.env`.
5. Trước khi merge, kiểm tra `docs/TESTING.md` và không để lỗi JavaScript trong Console.
6. Khi API/backend chưa có, không tuyên bố QR hay phân quyền trong bản demo là thật.

## Đồng bộ sau khi bạn khác đã merge

```powershell
git switch main
git pull origin main
```

Nếu đang làm nhánh riêng, trao đổi với nhóm về cách merge/rebase `main` trước khi cập nhật để tránh mất thay đổi chưa commit.
