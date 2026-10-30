
/*
 * Tinh gọn giao diện.
 * Không thay đổi dữ liệu hoặc logic nghiệp vụ.
 */
'use strict';

function tidyVisiblePage() {
  const root = $('appContent');

  if (!root) return;

  // Ẩn bảng BIMP trên Dashboard.
  // Nội dung này thuộc báo cáo, không cần hiển thị trong web.
  for (const title of root.querySelectorAll('.panel-title')) {
    if (
      title.textContent.includes(
        'Tham chiếu kết quả mô phỏng BIMP'
      )
    ) {
      title.closest('section.surface')?.remove();
    }
  }

  // Giữ tiêu đề chính, bỏ chú thích dài.
  const heading = root.querySelector('.page-heading');

  if (heading) {
    heading.querySelector('.eyebrow')?.remove();
    heading.querySelector('p')?.remove();
  }

  // Bỏ banner giới thiệu và dòng chú thích cuối trang.
  for (const item of root.querySelectorAll(
    ':scope > .alert.neutral'
  )) {
    item.remove();
  }

  for (const item of root.querySelectorAll('.page-footer')) {
    item.remove();
  }

  // Tên đúng với chức năng hiện tại.
  for (const item of root.querySelectorAll(
    '[data-action="ai-analyze"]'
  )) {
    item.textContent = 'Phân tích chênh lệch';
  }

  for (const item of root.querySelectorAll(
    '[data-action="ai-view"]'
  )) {
    item.textContent = 'Xem kết quả phân tích';
  }

  // Bỏ cảnh báo cũ không còn phù hợp.
  for (const item of root.querySelectorAll('.alert.warn')) {
    if (
      item.textContent.includes('Demo chưa tích hợp AI')
    ) {
      item.remove();
    }
  }
}

// Giữ nguyên render gốc và tinh gọn sau khi render.
const originalRender = render;

render = function () {
  originalRender();
  tidyVisiblePage();
};

// Chỉnh hướng dẫn cũ bên trong hộp thoại.
const originalOpenModal = openModal;

openModal = function (title, body, footer, wide) {
  originalOpenModal(title, body, footer, wide);

  for (const item of $('modalRoot').querySelectorAll(
    '.field-hint'
  )) {
    if (
      item.textContent.includes('AI chưa tích hợp')
    ) {
      item.textContent =
        'Nhân viên xác minh chứng từ trước khi gửi quản lý duyệt.';
    }
  }
};
