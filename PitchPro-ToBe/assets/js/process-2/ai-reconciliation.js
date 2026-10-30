
/*
 * Hỗ trợ phân tích chênh lệch bằng luật nghiệp vụ.
 * Không sử dụng mô hình AI thật.
 * Nhân viên xác minh, quản lý quyết định.
 */
'use strict';

function analyzeReconIssue(id) {
  const issue = state.issues.find(x => x.id === id);

  if (
    !issue ||
    issue.kind !== 'recon' ||
    issue.status !== 'pending'
  ) {
    throw new Error(
      'Chỉ phân tích yêu cầu đối soát đang chờ xử lý.'
    );
  }

  const r = state.recons.find(x => x.day === issue.day);

  if (!r) {
    throw new Error('Chưa có dữ liệu đối soát.');
  }

  const v = variance(r);

  if (v.cashDiff == null || v.bankDiff == null) {
    throw new Error(
      'Cần nhập đủ số kiểm đếm và chuyển khoản.'
    );
  }

  const entries = dayReceipts(issue.day);

  const settled = entries.filter(
    x => x.type === 'settlement'
  );

  const deposits = entries.filter(
    x => x.type === 'deposit'
  );

  const refunds = entries.filter(
    x => x.type === 'refund'
  );

  const outstanding = state.invoices.filter(inv => {
    const bk = getBooking(inv.bookingId);

    return (
      bk?.date === issue.day ||
      (
        inv.createdAt &&
        localDay(new Date(inv.createdAt)) === issue.day
      )
    ) &&
    ['awaiting', 'qr_pending'].includes(inv.status);
  });

  const causes = [];
  const evidence = [];
  const actions = [];

  const add = (arr, item) => {
    if (!arr.includes(item)) {
      arr.push(item);
    }
  };

  // PHÂN TÍCH TIỀN MẶT
  if (v.cashDiff < 0) {
    add(
      causes,
      `Tiền mặt thực đếm thiếu ` +
      `${money(Math.abs(v.cashDiff))} so với sổ.`
    );

    add(
      evidence,
      'Phiếu thu tiền mặt, biên bản giao ca và tiền trong két.'
    );

    add(
      actions,
      'Đếm lại tiền cùng người bàn giao, đối chiếu từng phiếu thu.'
    );
  } else if (v.cashDiff > 0) {
    add(
      causes,
      `Tiền mặt thực đếm thừa ${money(v.cashDiff)}; ` +
      'có thể có khoản thu chưa ghi sổ.'
    );

    add(
      evidence,
      'Các hóa đơn chưa thanh toán, phiếu thu và sổ bán dịch vụ.'
    );

    add(
      actions,
      'Kiểm tra các khoản tiền nhận chưa có chứng từ tương ứng.'
    );
  }

  // PHÂN TÍCH CHUYỂN KHOẢN
  if (v.bankDiff < 0) {
    add(
      causes,
      `Chuyển khoản thực nhận thiếu ` +
      `${money(Math.abs(v.bankDiff))} so với số đã ghi.`
    );

    add(
      evidence,
      'Lịch sử giao dịch ngân hàng và mã tham chiếu đã nhập.'
    );

    add(
      actions,
      'Đối chiếu đúng số tiền, người nhận, trạng thái và mã giao dịch.'
    );
  } else if (v.bankDiff > 0) {
    add(
      causes,
      `Chuyển khoản thực nhận thừa ${money(v.bankDiff)}; ` +
      'có thể có giao dịch chưa gắn hóa đơn.'
    );

    add(
      evidence,
      'Sao kê, các hóa đơn chờ xác minh và mã chuyển khoản.'
    );

    add(
      actions,
      'Tìm khoản tiền về chưa được ghi nhận hoặc bị ghi thiếu.'
    );
  }

  // KIỂM TRA HÓA ĐƠN CHƯA HOÀN TẤT
  if (outstanding.length) {
    add(
      evidence,
      `${outstanding.length} hóa đơn trong ngày đang chờ ` +
      'thanh toán hoặc chờ xác nhận QR.'
    );

    add(
      actions,
      'Kiểm tra từng hóa đơn chờ, không tự coi yêu cầu QR là đã nhận tiền.'
    );
  }

  // KIỂM TRA TIỀN CỌC
  if (deposits.length) {
    add(
      evidence,
      `${deposits.length} khoản cọc cần đối chiếu ` +
      'với hóa đơn và phần tất toán.'
    );
  }

  // KIỂM TRA HOÀN TIỀN
  if (refunds.length) {
    add(
      evidence,
      `${refunds.length} khoản hoàn tiền âm ` +
      'cần kiểm tra chứng từ chi.'
    );
  }

  // KIỂM TRA MÃ GIAO DỊCH TRÙNG
  const refs = new Set();
  const duplicate = [];

  for (const x of entries) {
    const ref = String(x.reference || '').trim();

    if (!ref) continue;

    const key = x.method + '|' + ref;

    if (refs.has(key)) {
      duplicate.push(ref);
    }

    refs.add(key);
  }

  if (duplicate.length) {
    add(
      causes,
      'Có mã tham chiếu giao dịch xuất hiện nhiều lần.'
    );

    add(
      evidence,
      'Các mã cần đối chiếu: ' +
      duplicate.slice(0, 4).join(', ')
    );

    add(
      actions,
      'Kiểm tra chứng từ trùng và điều chỉnh theo quy trình có phê duyệt.'
    );
  }

  if (!causes.length) {
    causes.push(
      'Tiền mặt và chuyển khoản đều khớp số kiểm đếm.'
    );

    actions.push(
      'Rà soát lần cuối hồ sơ rồi trình quản lý xác nhận.'
    );
  }

  add(
    actions,
    'Ghi rõ kết quả kiểm tra thực tế và bổ sung chứng từ trước khi trình duyệt.'
  );

  const summary =
    `Kỳ ${issue.day}: ${entries.length} khoản thu/chi, ` +
    `${settled.length} lần tất toán; ` +
    `chênh lệch tiền mặt ${money(v.cashDiff)}, ` +
    `chuyển khoản ${money(v.bankDiff)}.`;

  // Chỉ lưu gợi ý.
  // Không thay đổi số tiền hay trạng thái phê duyệt.
  issue.aiAdvice = {
    summary,
    possible_causes: causes,
    evidence_to_check: evidence,
    next_steps: actions,
    source: 'rules',
    generatedAt: new Date().toISOString(),

    snapshot: {
      cash: v.cash,
      bank: v.bank,
      cashDiff: v.cashDiff,
      bankDiff: v.bankDiff
    }
  };

  log(
    `Phân tích hỗ trợ chênh lệch kỳ ` +
    `${issue.day}, yêu cầu ${id}`
  );

  save();
  showAIAdvice(id);
}

function showAIAdvice(id) {
  const issue = state.issues.find(x => x.id === id);
  const a = issue?.aiAdvice;

  if (!a) {
    throw new Error('Chưa có kết quả phân tích.');
  }

  const r = state.recons.find(
    x => x.day === issue.day
  );

  const v = r ? variance(r) : null;

  if (
    !v ||
    v.cashDiff !== a.snapshot.cashDiff ||
    v.bankDiff !== a.snapshot.bankDiff
  ) {
    throw new Error(
      'Số liệu đã thay đổi. Cần phân tích lại.'
    );
  }

  const list = arr =>
    `<ul>${
      arr.map(x => `<li>${esc(x)}</li>`).join('')
    }</ul>`;

  const content = `
    <div class="alert neutral">
      <strong>Kết quả phân tích theo quy tắc.</strong>
      Đây là gợi ý để đối chiếu, không phải kết luận
      hoặc phê duyệt tự động.
    </div>

    <p><strong>Tóm tắt</strong></p>
    <p>${esc(a.summary)}</p>

    <h3>Dấu hiệu cần lưu ý</h3>
    ${list(a.possible_causes)}

    <h3>Chứng từ cần kiểm tra</h3>
    ${list(a.evidence_to_check)}

    <h3>Hướng xử lý</h3>
    ${list(a.next_steps)}
  `;

  const footer =
    btn('Đóng', 'modal-close') +
    (
      issue.status === 'pending'
        ? btn('Soạn giải trình', 'ai-note', id, 'primary')
        : ''
    );

  openModal(
    'Phân tích chênh lệch doanh thu',
    content,
    footer,
    true
  );
}

function draftAINote(id) {
  const issue = state.issues.find(x => x.id === id);

  if (!issue?.aiAdvice || issue.status !== 'pending') {
    throw new Error(
      'Không thể soạn giải trình cho yêu cầu này.'
    );
  }

  const a = issue.aiAdvice;

  issueNoteModal(id);

  const text = [
    'KẾT QUẢ KIỂM TRA ĐỐI SOÁT',
    a.summary,
    'Các dấu hiệu cần kiểm tra: ' +
      a.possible_causes.join('; '),
    'Chứng từ đối chiếu: ' +
      a.evidence_to_check.join('; '),
    'Kết quả xác minh thực tế: ',
    'Mã chứng từ đính kèm: ',
    'Đề xuất trình quản lý: '
  ].join('\n');

  $('m_note').value = issue.note?.trim()
    ? issue.note
    : text;

  $('m_note').focus();
}
