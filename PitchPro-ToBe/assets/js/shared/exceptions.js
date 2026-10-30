/* PitchPro modular frontend. Load scripts in the order specified by index.html. */
"use strict";

function renderIssues() {
  const issues = state.issues.slice().reverse();
  return (
    heading(
      "KIỂM SOÁT NGOẠI LỆ",
      "Yêu cầu & chênh lệch",
      "Các trường hợp cần người kiểm tra, bổ sung chứng từ và phê duyệt theo phân quyền.",
      btn("Đến đối soát", "goto", "doi-soat", "primary"),
    ) +
    `<div class="alert warn">Bản To-Be quy định AI có thể hỗ trợ <b>gợi ý nguyên nhân</b>, nhưng không tự phê duyệt hay sửa tiền. Demo chưa tích hợp AI; thông tin nguyên nhân phải do nhân viên nhập, quản lý quyết định.</div>` +
    `${
      issues.length
        ? issues
            .map((x) => {
              const inv = x.invoiceId ? getInvoice(x.invoiceId) : null;
              const r = x.day
                ? state.recons.find((r) => r.day === x.day)
                : null;
              const v = r ? variance(r) : null;
              return `<article class="issue-card"><div class="issue-head"><h3>${x.kind === "refund" ? "Yêu cầu hủy & hoàn tiền" : `Chênh lệch kỳ ${x.day}`} · ${esc(x.id)}</h3>${tag(x.status, issueStages)}</div><div class="issue-meta">${niceTime(x.createdAt)} · ${x.kind === "refund" ? "Cần quản lý phê duyệt yêu cầu hoàn tiền" : `Ngày ${x.day}`}</div><div class="issue-body">${x.kind === "refund" ? `Khách hàng: <b>${esc(inv?.customer || "—")}</b> · Số tiền đề nghị hoàn: <b>${money(x.amount)}</b>.` : `Đối soát tiền mặt: <b>${v?.cashDiff == null ? "Chưa nhập" : money(v.cashDiff)}</b>; chuyển khoản: <b>${v?.bankDiff == null ? "Chưa nhập" : money(v.bankDiff)}</b>.`}<br><span class="muted">Nguyên nhân/chứng từ: ${esc(x.note || "Chưa bổ sung")}</span></div>
<div class="btn-row">${x.kind === "recon" && x.status === "pending" ? btn("AI phân tích", "ai-analyze", x.id, "small soft") : ""}${x.aiAdvice ? btn("Xem AI gợi ý", "ai-view", x.id, "small") : ""}${x.status === "pending" ? btn("Bổ sung chứng từ", "issue-note", x.id, "small") : ""}
${x.status === "pending" ? btn("Quản lý duyệt", "issue-approve", x.id, "small primary") : ""}${x.kind === "refund" && x.status === "approved" ? btn("Xác nhận đã hoàn tiền", "refund-finish", x.id, "small primary") : ""}</div></article>`;
            })
            .join("")
        : empty(
            "Chưa có yêu cầu xử lý ngoại lệ. Có thể tạo trường hợp chênh lệch tại màn hình đối soát.",
          )
    }${FOOT}`
  );
}
function issueNoteModal(id) {
  const i = state.issues.find((x) => x.id === id);
  const fields = `<div class="field full"><label for="m_note">Nguyên nhân & bằng chứng</label><textarea id="m_note" name="note" required minlength="6" placeholder="Mô tả kết quả kiểm tra, mã chứng từ, phương án xử lý...">${esc(i.note || "")}</textarea><p class="field-hint">AI chưa tích hợp. Nhân viên tự ghi căn cứ; quản lý chịu trách nhiệm phê duyệt.</p></div>`;
  openModal(
    "Bổ sung chứng từ / giải trình",
    makeForm("formIssueNote", fields),
    formBtns("formIssueNote", "Lưu giải trình"),
  );
  $("formIssueNote").dataset.issue = id;
}
function issueRefundModal(id) {
  const i = state.issues.find((x) => x.id === id);
  const fields =
    selectField(
      "Phương thức hoàn thực tế",
      "method",
      [
        ["cash", "Tiền mặt"],
        ["bank", "Chuyển khoản"],
      ],
      "cash",
    ) +
    field(
      "Mã phiếu hoàn / giao dịch",
      "ref",
      "text",
      "",
      'required minlength="5" maxlength="80"',
    ) +
    `<div class="field full"><p class="field-hint">Khoản phải hoàn theo yêu cầu được quản lý duyệt: <b>${money(i.amount)}</b>. Chỉ xác nhận sau khi đã thực sự hoàn tiền; FE không chuyển tiền được.</p></div>`;
  openModal(
    "Ghi nhận đã thực hiện hoàn tiền",
    makeForm("formRefund", fields),
    formBtns("formRefund", "Xác nhận đã hoàn"),
  );
  $("formRefund").dataset.issue = id;
}
const exceptionActionKeys = new Set([
  "issue-note",
  "issue-approve",
  "refund-finish",
  "ai-analyze",
  "ai-view",
  "ai-note",
]);
function exceptionAction(action, id) {
  if (action === "issue-note") {
    issueNoteModal(id);
    return;
  }

  if (action === "ai-analyze") {
    analyzeReconIssue(id);
    return;
  }

  if (action === "ai-view") {
    showAIAdvice(id);
    return;
  }

  if (action === "ai-note") {
    draftAINote(id);
    return;
  }

  if (action === "issue-approve") {
    if (role !== "manager")
      throw new Error("Chỉ Quản lý được phê duyệt ngoại lệ.");
    const i = state.issues.find((x) => x.id === id);
    if (!i || i.status !== "pending")
      throw new Error("Yêu cầu không ở trạng thái chờ xử lý.");
    if (!i.note || i.note.trim().length < 6)
      throw new Error(
        "Cần nhân viên bổ sung nguyên nhân và chứng từ trước khi duyệt.",
      );
    if (i.kind === "recon") {
      const r = state.recons.find((x) => x.day === i.day),
        v = r ? variance(r) : null;
      if (!v || v.cashDiff !== 0 || v.bankDiff !== 0)
        throw new Error(
          "Đối soát vẫn lệch. Cần xử lý/cập nhật số tiền thực nhận rồi mới đánh dấu đã giải quyết.",
        );
      i.status = "resolved";
      log(`Quản lý đã xác nhận giải quyết chênh lệch kỳ ${i.day}, mã ${i.id}`);
    } else {
      i.status = "approved";
      log(
        `Quản lý phê duyệt đề nghị hoàn tiền ${i.id} · ${money(i.amount)}; chưa hoàn thực tế`,
      );
    }
    save();
    toast("Đã cập nhật trạng thái yêu cầu theo phân quyền.");
    return;
  }
  if (action === "refund-finish") {
    const i = state.issues.find((x) => x.id === id);
    if (!i || i.kind !== "refund" || i.status !== "approved")
      throw new Error("Yêu cầu hoàn tiền chưa được quản lý phê duyệt.");
    issueRefundModal(id);
    return;
  }
}

const exceptionFormKeys = new Set(["formIssueNote", "formRefund"]);
function exceptionForm(form, data) {
  if (form.id === "formIssueNote") {
    const i = state.issues.find((x) => x.id === form.dataset.issue);
    if (!i || i.status !== "pending")
      throw new Error("Không thể cập nhật yêu cầu đã duyệt.");
    if (data.note.trim().length < 6)
      throw new Error("Cần giải trình ít nhất 6 ký tự.");
    i.note = data.note.trim();
    log(`Bổ sung giải trình/chứng từ cho yêu cầu ${i.id}`);
    closeModal();
    save();
    toast("Đã lưu giải trình để quản lý xem xét.");
    return;
  }
  if (form.id === "formRefund") {
    ensureOpenDay();
    const i = state.issues.find((x) => x.id === form.dataset.issue);
    if (!i || i.status !== "approved" || i.kind !== "refund")
      throw new Error("Yêu cầu hoàn tiền chưa được duyệt.");
    const inv = getInvoice(i.invoiceId),
      b = getBooking(inv?.bookingId),
      ref = data.ref.trim();
    if (ref.length < 5) throw new Error("Cần mã chứng từ thực hiện hoàn tiền.");
    if (
      state.receipts.some(
        (x) => x.reference === ref && x.method === data.method,
      )
    )
      throw new Error("Trùng mã chứng từ hoàn tiền.");
    if (paidAmount(inv) !== i.amount)
      throw new Error(
        "Khoản thu đã thay đổi từ lúc lập yêu cầu, phải đối chiếu lại.",
      );
    receiptFor(inv, "refund", data.method, -i.amount, ref);
    returnProducts(inv);
    inv.status = "cancelled";
    b.status = "cancelled";
    i.status = "resolved";
    log(
      `Đã thực hiện hoàn ${money(i.amount)} cho ${inv.id} theo duyệt ${i.id}, chứng từ ${ref}`,
    );
    closeModal();
    save();
    toast("Đã ghi nhận khoản hoàn âm trong sổ và đóng yêu cầu.");
    return;
  }
}
