/* PitchPro modular frontend. Load scripts in the order specified by index.html. */
"use strict";

function variance(r) {
  const t = totalsForDay(r.day);
  return {
    cash: t.cash,
    bank: t.bank,
    cashDiff: r.countedCash == null ? null : r.countedCash - t.cash,
    bankDiff: r.countedBank == null ? null : r.countedBank - t.bank,
  };
}
function renderReconcile() {
  const t = totalsForDay(reconDay),
    r = state.recons.find((x) => x.day === reconDay),
    v = r ? variance(r) : null;
  const dayBills = state.invoices.filter(
    (i) =>
      i.status === "paid" &&
      i.paidAt &&
      localDay(new Date(i.paidAt)) === reconDay,
  );
  const dayGross = dayBills.reduce((s, i) => s + invoiceTotal(i), 0);
  const matched = v && v.cashDiff === 0 && v.bankDiff === 0;
  const steps = [
    "Chốt phạm vi ngày",
    "Tổng hợp & phân loại",
    "Nhập số thực nhận",
    "Xử lý ngoại lệ",
    "Quản lý phê duyệt",
    "Khóa sổ",
  ];
  const stepCount = !r
    ? 0
    : r.status === "locked"
      ? 6
      : r.status === "approved"
        ? 5
        : matched
          ? 4
          : r.countedCash != null && r.countedBank != null
            ? 3
            : 2;
  return (
    heading(
      "QUY TRÌNH 02",
      "Đối soát doanh thu cuối ngày",
      "Tự tổng hợp giao dịch, so sánh theo phương thức, xử lý sai lệch và khóa sổ sau phê duyệt.",
      btn("Xuất báo cáo CSV", "export", "recon", "small") +
        btn("Tạo / cập nhật đối soát", "recon-edit", reconDay, "primary"),
    ) +
    `<div class="alert neutral">Khoản thu trong ngày = tiền thực nhận đã ghi nhận trong ngày (bao gồm cọc và hoàn tiền nếu có). <b>Doanh thu hóa đơn hoàn tất</b> là chỉ tiêu riêng; không cộng trùng tiền cọc vào khoản thu.</div>` +
    `<div class="toolbar"><div class="filters"><span class="small-text">Ngày đối soát</span><input class="date-input" type="date" id="reconDate" value="${reconDay}"></div>${r ? tag(r.status, { draft: ["Đang đối soát", "amber"], approved: ["Đã phê duyệt", "blue"], locked: ["Đã khóa sổ", "green"] }) : tag("Chưa mở kỳ", { "Chưa mở kỳ": ["Chưa mở kỳ", "grey"] })}</div>` +
    `<div class="stats-grid">${stat("Đã thu bằng tiền mặt", money(t.cash), "Từ các phiếu thu đã ghi nhận", "▣")}${stat("Đã thu qua ngân hàng", money(t.bank), "Chỉ tính khoản có xác nhận thủ công", "⇄", "blue")}${stat("Tổng tiền thu ghi nhận", money(t.cash + t.bank), `${t.count} dòng giao dịch thu/hoàn`, "↗")}${stat("Doanh thu hóa đơn hoàn tất", money(dayGross), `${dayBills.length} hóa đơn chốt trong ngày`, "▤", "amber")}</div>` +
    `<section class="surface" style="margin-bottom:20px"><div class="panel-title">Tiến trình đối soát To-Be</div><div class="step-list">${steps.map((s, i) => `<div class="step ${i < stepCount ? "done" : i === stepCount ? "current" : ""}">${i + 1}. ${s}</div>`).join("")}</div><p class="inline-note">Nhân viên ghi nhận số tiền kiểm đếm; quản lý mới được phê duyệt báo cáo và khóa sổ. Phân quyền tại FE chỉ để trình diễn.</p></section>` +
    `<div class="layout-2"><section class="surface"><div class="panel-head"><div class="panel-title">Bảng đối chiếu theo phương thức</div>${btn("Nhập số kiểm đếm", "recon-edit", reconDay, "small soft")}</div><div class="table-wrap"><table><thead><tr><th>Phương thức</th><th>Hệ thống</th><th>Thực nhận nhập vào</th><th>Chênh lệch</th></tr></thead><tbody>${[
      ["Tiền mặt", t.cash, r?.countedCash, v?.cashDiff],
      ["Chuyển khoản", t.bank, r?.countedBank, v?.bankDiff],
    ]
      .map(
        (x) =>
          `<tr><td class="strong">${x[0]}</td><td>${money(x[1])}</td><td>${x[2] == null ? '<span class="muted">Chưa nhập</span>' : money(x[2])}</td><td>${x[3] == null ? '<span class="muted">—</span>' : x[3] === 0 ? tag("Khớp", { Khớp: ["Khớp", "green"] }) : `<strong style="color:#b85a47">${money(x[3])}</strong>`}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div>${r ? `<div class="divider"></div><p class="small-text">Ghi chú kiểm đếm: ${esc(r.notes || "Chưa ghi")} · Cập nhật ${niceTime(r.updatedAt)}</p>` : ""}</section><section class="surface"><div class="panel-title">Phê duyệt & khóa sổ</div><div class="divider"></div>${!r ? '<p class="small-text">Chưa tạo phiên đối soát. Hãy nhập tiền thực nhận để kiểm tra sai lệch.</p>' : `<div class="kpi-line"><span>Trạng thái phiên</span>${tag(r.status, { draft: ["Đang xử lý", "amber"], approved: ["Đã duyệt", "blue"], locked: ["Đã khóa", "green"] })}</div><div class="kpi-line"><span>Số dư chênh lệch</span><strong>${v.cashDiff == null || v.bankDiff == null ? "Chưa nhập" : money(v.cashDiff + v.bankDiff)}</strong></div><div class="kpi-line"><span>Người phê duyệt</span><strong>${esc(r.approvedBy || "Chưa có")}</strong></div><div class="divider"></div>${r.status === "draft" ? btn("Quản lý phê duyệt", "recon-approve", r.day, "full primary") : ""}${r.status === "approved" ? btn("Khóa sổ ngày", "recon-lock", r.day, "full primary") : ""}${r.status === "locked" ? '<div class="alert">Đã khóa sổ. Mọi giao dịch mới cho ngày này được chặn trong bản demo.</div>' : ""}<p class="inline-note" style="margin-top:12px">Không thể duyệt khi còn chênh lệch, thiếu số kiểm đếm hoặc còn ngoại lệ chưa giải quyết.</p>`}</section></div>` +
    `<section class="surface" style="margin-top:20px"><div class="panel-head"><div class="panel-title">Chi tiết các khoản thu / hoàn tiền</div><span class="small-text">${t.count} dòng</span></div><div class="table-wrap"><table><thead><tr><th>Thời gian</th><th>Hóa đơn</th><th>Loại thu</th><th>Phương thức</th><th>Mã tham chiếu</th><th>Số tiền</th></tr></thead><tbody>${
      dayReceipts(reconDay)
        .map(
          (x) =>
            `<tr><td>${niceTime(x.createdAt)}</td><td>${esc(x.invoiceId)}</td><td>${x.type === "deposit" ? "Tiền cọc" : x.type === "refund" ? "Hoàn tiền" : "Tất toán"}</td><td>${x.method === "cash" ? "Tiền mặt" : "Chuyển khoản"}</td><td>${esc(x.reference || "—")}</td><td class="money">${money(x.amount)}</td></tr>`,
        )
        .join("") ||
      '<tr><td colspan="6">Chưa có khoản thu trong ngày</td></tr>'
    }</tbody></table></div></section>${FOOT}`
  );
}
function reconModal(day) {
  const r = state.recons.find((x) => x.day === day),
    t = totalsForDay(day);
  const fields =
    field("Ngày đối soát", "day", "date", day, "readonly") +
    field(
      "Tiền mặt kiểm đếm thực tế (đ)",
      "cash",
      "number",
      r?.countedCash ?? "",
      'required min="0"',
    ) +
    field(
      "Số tiền chuyển khoản đối chiếu thực tế (đ)",
      "bank",
      "number",
      r?.countedBank ?? "",
      'required min="0"',
    ) +
    `<div class="field"><label>Số liệu từ hệ thống</label><div class="tone-soft" style="font-size:11px">Tiền mặt: <b>${money(t.cash)}</b><br>Chuyển khoản: <b>${money(t.bank)}</b></div></div>` +
    `<div class="field full"><label for="m_notes">Ghi chú / căn cứ kiểm đếm</label><textarea id="m_notes" name="notes" placeholder="VD: Đã kiểm tiền két; đối chiếu ứng dụng ngân hàng theo ngày...">${esc(r?.notes || "")}</textarea></div>`;
  openModal(
    r ? "Cập nhật đối soát" : "Khởi tạo đối soát",
    makeForm(
      "formRecon",
      fields,
      "Nhập số thực tế qua kiểm đếm thủ công. Phần mềm tự so sánh và tạo yêu cầu giải trình khi lệch.",
    ),
    formBtns("formRecon", r ? "Lưu đối soát" : "Chốt phạm vi và lập đối soát"),
    true,
  );
}
const reconActionKeys = new Set(["recon-edit", "recon-approve", "recon-lock"]);
function reconAction(action, id) {
  if (action === "recon-edit") {
    if (isLocked(id)) throw new Error("Kỳ này đã khóa sổ, không được sửa.");
    reconModal(id);
    return;
  }
  if (action === "recon-approve") {
    if (role !== "manager")
      throw new Error("Chỉ vai trò Quản lý được phê duyệt.");
    const r = state.recons.find((x) => x.day === id);
    if (!r || r.status !== "draft")
      throw new Error("Phiên đối soát không hợp lệ.");
    const v = variance(r);
    if (v.cashDiff !== 0 || v.bankDiff !== 0)
      throw new Error("Số tiền thực nhận còn chênh lệch hoặc chưa nhập.");
    if (
      state.issues.some(
        (x) => x.kind === "recon" && x.day === id && x.status !== "resolved",
      )
    )
      throw new Error("Còn ngoại lệ chưa được quản lý xác nhận đã giải quyết.");
    r.status = "approved";
    r.approvedBy = roleName();
    r.approvedAt = new Date().toISOString();
    log(`Phê duyệt đối soát ngày ${id}`);
    save();
    toast("Đã phê duyệt phiên đối soát.");
    return;
  }
  if (action === "recon-lock") {
    if (role !== "manager") throw new Error("Chỉ Quản lý được khóa sổ.");
    const r = state.recons.find((x) => x.day === id);
    if (r?.status !== "approved")
      throw new Error("Phải được phê duyệt trước khi khóa sổ.");
    const v = variance(r);
    if (v.cashDiff !== 0 || v.bankDiff !== 0)
      throw new Error(
        "Có biến động số liệu sau khi phê duyệt; cần kiểm tra lại.",
      );
    r.status = "locked";
    r.lockedAt = new Date().toISOString();
    log(`Khóa sổ ngày ${id} sau phê duyệt`);
    save();
    toast("Đã khóa sổ kỳ đối soát.");
    return;
  }
}

const reconFormKeys = new Set(["formRecon"]);
function reconForm(form, data) {
  if (form.id === "formRecon") {
    const day = data.day;
    if (isLocked(day)) throw new Error("Kỳ đã khóa sổ.");
    const cash = Number(data.cash),
      bank = Number(data.bank);
    if (
      !Number.isFinite(cash) ||
      cash < 0 ||
      !Number.isFinite(bank) ||
      bank < 0 ||
      data.cash === "" ||
      data.bank === ""
    )
      throw new Error("Phải nhập số thực nhận hợp lệ cho cả hai phương thức.");
    let r = state.recons.find((r) => r.day === day);
    if (!r) {
      r = {
        id: uid("DSO"),
        day,
        status: "draft",
        createdAt: new Date().toISOString(),
      };
      state.recons.push(r);
    }
    r.countedCash = cash;
    r.countedBank = bank;
    r.notes = (data.notes || "").trim();
    r.status = "draft";
    r.approvedBy = null;
    r.approvedAt = null;
    r.updatedAt = new Date().toISOString();
    const v = variance(r);
    let issue = state.issues.find(
      (i) => i.kind === "recon" && i.day === day && i.status !== "resolved",
    );
    // Nếu số liệu đối soát đã thay đổi, bỏ kết quả AI cũ
    if (issue?.aiAdvice) {
      delete issue.aiAdvice;
    }
    if (v.cashDiff !== 0 || v.bankDiff !== 0) {
      if (!issue)
        state.issues.push({
          id: uid("YC"),
          kind: "recon",
          day,
          status: "pending",
          note: "",
          createdAt: new Date().toISOString(),
        });
      else issue.status = "pending";
      log(
        `Lập bảng đối soát ${day}: phát hiện chênh lệch tiền mặt ${money(v.cashDiff)}, chuyển khoản ${money(v.bankDiff)}`,
      );
    } else {
      log(
        `Lập/cập nhật đối soát ${day}: số liệu thực nhận khớp dữ liệu hệ thống`,
      );
    }
    closeModal();
    save();
    toast(
      v.cashDiff !== 0 || v.bankDiff !== 0
        ? "Đã tạo/cập nhật yêu cầu giải trình chênh lệch."
        : "Số liệu khớp. Có thể chuyển trình quản lý duyệt.",
    );
    return;
  }
}
