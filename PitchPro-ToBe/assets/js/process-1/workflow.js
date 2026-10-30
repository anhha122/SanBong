
/*
 * MIS3047 - Quy trình 1
 * Quản lý lượt sân, bán hàng và thanh toán tại Lịch sân.
 * Giữ nguyên các module gốc và Quy trình 2.
 * Nạp file này sau main.js.
 */
'use strict';

(() => {
  const originalBookingAction = bookingAction;

  const isCurrent = b =>
    b && b.date === localDay() && !isLocked(b.date);

  const isEditable = inv => {
    if (!inv) return false;

    const b = inv.bookingId
      ? getBooking(inv.bookingId)
      : null;

    return page === 'lich-san' &&
      (b ? isCurrent(b) : !isLocked(localDay()));
  };

  const paymentLabel = inv => {
    const receipts = receiptsFor(inv)
      .filter(x => x.amount !== 0);

    if (!receipts.length) {
      return 'Chưa có khoản thu';
    }

    const methods = new Set(
      receipts.map(x => x.method)
    );

    if (methods.size > 1) {
      return 'Tiền mặt + chuyển khoản';
    }

    return methods.has('cash')
      ? 'Tiền mặt'
      : 'Chuyển khoản';
  };

  // ==============================
  // 1. LỊCH SÂN VÀ CÁC LƯỢT THUÊ
  // ==============================

  renderSchedule = function () {
    const today = localDay();
    const sessions = daysBookings(selectedDay);

    const filtered = pitchList.filter(
      p => pitchFilter === 'all' ||
        p.type === pitchFilter
    );

    const days = Array.from({length: 7}, (_, n) => {
      const d = addDay(today, n - 1);

      return `
        <button
          class="day-pill ${d === selectedDay ? 'active' : ''}"
          data-action="day"
          data-id="${d}"
        >
          <small>
            ${d === today
              ? 'HÔM NAY'
              : esc(dayLabel(d).split(' ')[0])}
          </small>
          <strong>${d.slice(8)}/${d.slice(5, 7)}</strong>
        </button>
      `;
    }).join('');

    const cards = filtered.map(p => {
      const byPitch = sessions
        .filter(b => b.pitchId === p.id)
        .sort((a, b) =>
          a.start.localeCompare(b.start)
        );

      const active = byPitch.filter(
        b => b.status === 'using'
      ).length;

      return `
        <section class="pitch-card p1-card surface">
          <div class="pitch-top">
            <div>
              <div class="pitch-type">
                SÂN ${p.type} NGƯỜI
              </div>
              <div class="pitch-nr">${esc(p.name)}</div>
            </div>

            ${tag(
              active
                ? 'using'
                : byPitch.some(b => b.status === 'booked')
                  ? 'booked'
                  : 'completed',
              {
                using: ['Đang sử dụng', 'green'],
                booked: ['Có lịch đặt', 'blue'],
                completed: ['Còn lịch trống', 'grey']
              }
            )}
          </div>

          <div class="p1-rate">
            ${money(pitchRates[p.type])}/giờ
          </div>

          <div class="p1-slots">
            ${byPitch.map(b => {
              const inv = getInvoice(b.invoiceId);
              const allowed = isCurrent(b);

              return `
                <div class="p1-slot ${
                  b.status === 'using'
                    ? 'p1-slot-live'
                    : ''
                }">

                  <div class="p1-slot-top">
                    <strong>
                      ${esc(b.start)}–${esc(b.end)}
                    </strong>
                    ${tag(b.status, stages)}
                  </div>

                  <div class="p1-customer">
                    ${esc(b.name)}
                  </div>

                  <div class="p1-subtotal">
                    ${inv
                      ? `Tạm tính: ${money(invoiceTotal(inv))}`
                      : ''}
                  </div>

                  <div class="btn-row p1-actions">
                    ${btn(
                      'Chi tiết',
                      'invoice',
                      b.invoiceId,
                      'small'
                    )}

                    ${
                      allowed && b.status === 'booked'
                        ? btn(
                            'Nhận sân',
                            'start',
                            b.id,
                            'small primary'
                          )
                        : ''
                    }

                    ${
                      allowed && b.status === 'using'
                        ? btn(
                            '+ Dịch vụ',
                            'sale',
                            `target:${b.invoiceId}`,
                            'small soft'
                          )
                        : ''
                    }

                    ${
                      allowed && b.status === 'using'
                        ? btn(
                            'Trả sân & thu tiền',
                            'release',
                            b.id,
                            'small primary'
                          )
                        : ''
                    }

                    ${
                      allowed &&
                      b.status === 'completed' &&
                      inv &&
                      ['awaiting', 'qr_pending']
                        .includes(inv.status)
                        ? btn(
                            'Thu tiền',
                            'invoice',
                            inv.id,
                            'small primary'
                          )
                        : ''
                    }
                  </div>
                </div>
              `;
            }).join('') ||
              '<div class="p1-empty">Chưa có lượt đặt trong ngày</div>'
            }
          </div>

          ${btn(
            '+ Đặt sân này',
            'booking',
            p.id,
            'small full'
          )}
        </section>
      `;
    }).join('');

    return heading(
      '',
      'Lịch & đặt sân',
      '',
      btn('+ Đặt sân', 'booking', '', 'primary') +
      btn('Bán hàng nhanh', 'sale', '', 'soft')
    ) +

    `
      <div class="toolbar p1-toolbar">
        <div class="filters">
          ${
            [
              ['all', 'Tất cả sân'],
              ['5', 'Sân 5 người'],
              ['7', 'Sân 7 người']
            ].map(([id, text]) => `
              <button
                class="filter-btn ${
                  pitchFilter === id ? 'active' : ''
                }"
                data-action="pitch-filter"
                data-id="${id}"
              >${text}</button>
            `).join('')
          }
        </div>

        <label class="p1-date-label">
          Ngày
          <input
            id="scheduleDate"
            class="date-input"
            type="date"
            value="${selectedDay}"
          >
        </label>
      </div>

      <div class="calendar-strip">
        ${days}
      </div>

      <div class="p1-legend">
        <span>● Đang sử dụng</span>
        <span>● Đã đặt</span>
        <span>● Đã trả sân</span>
      </div>

      <div class="pitch-grid p1-grid">
        ${cards}
      </div>
    `;
  };

  // ==============================
  // 2. HÓA ĐƠN CHỈ TRA CỨU
  // ==============================

  renderInvoices = function () {
    const all = state.invoices;

    const paid = all.filter(
      x => x.status === 'paid'
    );

    const pending = all.filter(
      x => ['draft', 'awaiting', 'qr_pending']
        .includes(x.status)
    );

    const cash = paid.filter(
      x => paymentLabel(x) === 'Tiền mặt'
    ).length;

    const bank = paid.filter(
      x => paymentLabel(x) === 'Chuyển khoản'
    ).length;

    const mixed = paid.filter(
      x => paymentLabel(x) ===
        'Tiền mặt + chuyển khoản'
    ).length;

    const totalReceived = state.receipts.reduce(
      (sum, x) => sum + Number(x.amount || 0),
      0
    );

    const filter = x =>
      billFilter === 'all' ||
      (
        billFilter === 'open' &&
        pending.includes(x)
      ) ||
      x.status === billFilter;

    const data = all
      .filter(filter)
      .slice()
      .reverse();

    const tabs = [
      ['all', 'Tất cả'],
      ['open', 'Chưa hoàn tất'],
      ['draft', 'Nháp'],
      ['awaiting', 'Chờ thanh toán'],
      ['qr_pending', 'Chờ chuyển khoản'],
      ['paid', 'Đã thanh toán'],
      ['cancelled', 'Đã hủy']
    ];

    return heading(
      '',
      'Hóa đơn',
      '',
      ''
    ) +

    `
      <div class="stats-grid p1-invoice-stats">
        ${stat(
          'Tổng hóa đơn',
          all.length,
          `${paid.length} đã thanh toán`,
          '▣'
        )}

        ${stat(
          'Thanh toán tiền mặt',
          cash,
          'Hóa đơn chỉ thu tiền mặt',
          '₫'
        )}

        ${stat(
          'Chuyển khoản',
          bank,
          'Hóa đơn chỉ thu chuyển khoản',
          '⇄'
        )}

        ${stat(
          'Chưa hoàn tất',
          pending.length,
          `${mixed} hóa đơn dùng cả 2 phương thức`,
          '◷'
        )}
      </div>

      <div class="p1-summary-strip">
        Tổng các khoản thu đã ghi nhận:
        <b>${money(totalReceived)}</b>
        <span>· Hóa đơn đã thanh toán: ${paid.length}</span>
      </div>

      <div class="toolbar">
        <div class="filters">
          ${tabs.map(([id, text]) => `
            <button
              class="filter-btn ${
                billFilter === id ? 'active' : ''
              }"
              data-action="bill-filter"
              data-id="${id}"
            >${text}</button>
          `).join('')}
        </div>
      </div>

      <section class="surface">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mã hóa đơn</th>
                <th>Khách / đội bóng</th>
                <th>Loại</th>
                <th>Tổng tiền</th>
                <th>Đã thu</th>
                <th>Phương thức</th>
                <th>Trạng thái</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              ${data.map(inv => `
                <tr>
                  <td class="strong">
                    ${esc(inv.id)}
                  </td>

                  <td>${esc(inv.customer)}</td>

                  <td>
                    ${
                      inv.bookingId
                        ? 'Thuê sân'
                        : 'Bán lẻ'
                    }
                  </td>

                  <td class="money">
                    ${money(invoiceTotal(inv))}
                  </td>

                  <td>
                    ${money(paidAmount(inv))}
                  </td>

                  <td>
                    ${esc(paymentLabel(inv))}
                  </td>

                  <td>
                    ${tag(inv.status)}
                  </td>

                  <td>
                    ${btn(
                      'Xem',
                      'invoice',
                      inv.id,
                      'small'
                    )}
                  </td>
                </tr>
              `).join('') ||
                '<tr><td colspan="8">Không có hóa đơn phù hợp</td></tr>'
              }
            </tbody>
          </table>
        </div>
      </section>
    `;
  };

  // ==============================
  // 3. KHO HÀNG CHỈ QUẢN LÝ TỒN
  // ==============================

  renderInventory = function () {
    return heading(
      '',
      'Kho hàng & dịch vụ',
      '',
      btn('Nhập hàng', 'restock', '', 'primary')
    ) +

    `
      <section class="surface">
        <div class="panel-head">
          <div class="panel-title">
            Tồn kho hiện tại
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Đơn vị</th>
                <th>Đơn giá</th>
                <th>Tồn kho</th>
                <th>Trạng thái</th>
              </tr>
            </thead>

            <tbody>
              ${state.products.map(p => `
                <tr>
                  <td class="strong">
                    ${esc(p.name)}
                  </td>

                  <td>${esc(p.unit)}</td>

                  <td>${money(p.price)}</td>

                  <td>${p.stock}</td>

                  <td>
                    ${tag(
                      p.stock === 0
                        ? 'Hết hàng'
                        : p.stock <= 10
                          ? 'Sắp hết'
                          : 'Còn hàng',
                      {
                        'Hết hàng': ['Hết hàng', 'red'],
                        'Sắp hết': ['Sắp hết', 'amber'],
                        'Còn hàng': ['Còn hàng', 'green']
                      }
                    )}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;
  };

  // ==============================
  // 4. BÁN SẢN PHẨM TẠI LỊCH SÂN
  // ==============================

  saleModal = function (id = '') {
    const invoiceId = id.startsWith('target:')
      ? id.slice(7)
      : '';

    // Bán lẻ không gắn với lượt sân.
    if (!invoiceId) {
      const opts = state.products.map(p => [
        p.id,
        `${p.name} · ${money(p.price)} · còn ${p.stock}`
      ]);

      const fields =
        selectField('Sản phẩm', 'product', opts) +
        field(
          'Số lượng',
          'qty',
          'number',
          1,
          'required min="1" step="1"'
        ) +
        '<input type="hidden" name="invoice" value="retail">';

      openModal(
        'Bán hàng nhanh',
        makeForm('formSale', fields),
        formBtns('formSale', 'Thêm & tính tiền')
      );

      return;
    }

    const inv = getInvoice(invoiceId);

    const b = inv
      ? getBooking(inv.bookingId)
      : null;

    if (
      !inv ||
      !b ||
      b.status !== 'using' ||
      !isCurrent(b) ||
      inv.status !== 'draft'
    ) {
      throw new Error(
        'Chỉ được thêm dịch vụ cho lượt đang sử dụng sân hôm nay.'
      );
    }

    const opts = state.products.map(p => [
      p.id,
      `${p.name} · ${money(p.price)} · còn ${p.stock}`
    ]);

    const fields =
      selectField('Sản phẩm', 'product', opts) +
      field(
        'Số lượng',
        'qty',
        'number',
        1,
        'required min="1" step="1"'
      ) +
      `<input
        type="hidden"
        name="invoice"
        value="${esc(inv.id)}"
      >`;

    openModal(
      `Thêm dịch vụ · ${esc(b.name)}`,
      makeForm('formSale', fields),
      formBtns('formSale', 'Thêm vào lượt sân')
    );
  };

  // ==============================
  // 5. QUẢN LÝ LƯỢT VÀ THANH TOÁN
  // ==============================

  invoiceModal = function (id) {
    const inv = getInvoice(id);

    if (!inv) {
      throw new Error(
        'Không tìm thấy hóa đơn.'
      );
    }

    const b = inv.bookingId
      ? getBooking(inv.bookingId)
      : null;

    const editable = isEditable(inv);

    const paid = paidAmount(inv);
    const deposited = depositAmount(inv);
    const remaining = due(inv);
    const amount = invoiceTotal(inv);

    const lines = inv.items.map(x => `
      <div class="moneyline">
        <span>
          ${esc(x.name)} × ${x.qty}
        </span>

        <b>${money(x.qty * x.unitPrice)}</b>
      </div>
    `).join('');

    const actions = [];

    // Nhận sân.
    if (editable) {
      if (b && b.status === 'booked') {
        actions.push(
          btn(
            'Nhận sân',
            'start',
            b.id,
            'small primary'
          )
        );

        if (
          inv.status === 'draft' &&
          Number(b.depositRate) > 0 &&
          depositAmount(inv) <
            rentalTotal(inv) *
            Number(b.depositRate) / 100
        ) {
          actions.push(
            btn(
              'Nhận cọc',
              'deposit',
              inv.id,
              'small'
            )
          );
        }

        actions.push(
          btn(
            'Hủy đặt sân',
            'cancel',
            b.id,
            'small danger'
          )
        );
      }

      // Khách đang sử dụng.
      if (b && b.status === 'using') {
        actions.push(
          btn(
            '+ Thêm nước / dịch vụ',
            'sale',
            `target:${inv.id}`,
            'small soft'
          )
        );

        if (
          inv.status === 'draft' &&
          Number(b.depositRate) > 0 &&
          depositAmount(inv) <
            rentalTotal(inv) *
            Number(b.depositRate) / 100
        ) {
          actions.push(
            btn(
              'Nhận cọc',
              'deposit',
              inv.id,
              'small'
            )
          );
        }

        actions.push(
          btn(
            'Trả sân & tính tiền',
            'release',
            b.id,
            'small primary'
          )
        );
      }

      // Đã trả sân, cần thanh toán.
      if (inv.status === 'awaiting') {
        actions.push(
          btn(
            'Thu tiền mặt',
            'cash',
            inv.id,
            'small primary'
          )
        );

        actions.push(
          btn(
            'Chuyển khoản / QR',
            'qr',
            inv.id,
            'small soft'
          )
        );
      }

      // Chờ xác nhận chuyển khoản.
      if (inv.status === 'qr_pending') {
        actions.push(
          btn(
            'Xác nhận đã chuyển khoản',
            'bank-confirm',
            inv.id,
            'small primary'
          )
        );

        actions.push(
          btn(
            'Đổi phương thức',
            'qr-reset',
            inv.id,
            'small'
          )
        );
      }
    }

    if (inv.status === 'paid') {
      actions.push(
        btn(
          'In phiếu',
          'print',
          inv.id,
          'small'
        )
      );
    }

    const detail = b
      ? `${esc(pitchOf(b.pitchId).name)} · ` +
        `${esc(b.date)} · ` +
        `${esc(b.start)}–${esc(b.end)}`
      : 'Hóa đơn bán lẻ';

    const receipts = receiptsFor(inv).map(r => `
      <div class="moneyline">
        <span>
          ${
            r.type === 'deposit'
              ? 'Tiền cọc'
              : r.type === 'refund'
                ? 'Hoàn tiền'
                : 'Thu tiền'
          }
          ·
          ${
            r.method === 'cash'
              ? 'Tiền mặt'
              : 'Chuyển khoản'
          }

          <small class="p1-receipt-ref">
            ${esc(r.reference)} · ${niceTime(r.createdAt)}
          </small>
        </span>

        <strong>${money(r.amount)}</strong>
      </div>
    `).join('');

    const qrInfo =
      inv.status === 'qr_pending'
        ? `
          <div class="p1-payment-note">
            Mã đối chiếu:
            <strong>${esc(inv.qrRef || '')}</strong>.
            Chỉ xác nhận sau khi kiểm tra giao dịch
            đã nhận thực tế.
          </div>
        `
        : '';

    const body = `
      <div class="p1-invoice-head">
        <div>
          <h3>${esc(inv.customer)}</h3>
          <p>${detail}</p>
          <small>${esc(inv.id)}</small>
        </div>

        ${tag(inv.status)}
      </div>

      <div class="receipt">
        <div class="p1-receipt-title">
          CHI TIẾT THANH TOÁN
        </div>

        ${lines}

        <div class="moneyline">
          <span>Tổng tiền</span>
          <strong>${money(amount)}</strong>
        </div>

        <div class="moneyline">
          <span>Đã nhận cọc</span>
          <strong>${money(deposited)}</strong>
        </div>

        <div class="moneyline">
          <span>Đã thu (gồm cọc)</span>
          <strong>${money(paid)}</strong>
        </div>

        <div class="moneyline p1-total">
          <strong>Còn phải thu</strong>
          <strong>${money(remaining)}</strong>
        </div>
      </div>

      ${qrInfo}

      ${
        actions.length
          ? `<div class="btn-row p1-checkout-actions">
              ${actions.join('')}
            </div>`
          : ''
      }

      <div class="p1-receipt-history">
        <h4>Khoản thu đã ghi nhận</h4>

        ${
          receipts ||
          '<p class="small-text">Chưa có khoản thu.</p>'
        }
      </div>
    `;

    openModal(
      page === 'hoa-don'
        ? 'Chi tiết hóa đơn'
        : 'Quản lý lượt & thanh toán',
      body,
      btn('Đóng', 'modal-close'),
      true
    );
  };

  // ==============================
  // 6. TẬP TRUNG THAO TÁC TẠI LỊCH
  // ==============================

  bookingAction = function (action, id) {

    if (action === 'start') {
      const b = getBooking(id);

      if (!isCurrent(b)) {
        throw new Error(
          'Chỉ nhận sân của ngày hôm nay chưa khóa sổ.'
        );
      }

      originalBookingAction(action, id);

      // Nhận sân xong mở ngay chi tiết lượt.
      if (b.status === 'using') {
        invoiceModal(b.invoiceId);
      }

      return;
    }

    if (action === 'release') {
      const b = getBooking(id);

      if (!isCurrent(b)) {
        throw new Error(
          'Chỉ trả sân của ngày hôm nay chưa khóa sổ.'
        );
      }
    }

    return originalBookingAction(action, id);
  };

  // Hiển thị lại trang khi module đã được tải.
  render();
})();
