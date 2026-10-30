
/*
 * PitchPro - Quy trình 1
 * Giao diện thanh toán tối giản.
 * Nạp sau pitch-timeline.js.
 */
'use strict';

(() => {
  const previousRenderSchedule = renderSchedule;
  const previousCommonAction = commonAction;

  function dayOfInvoice(inv) {
    const booking = inv.bookingId
      ? getBooking(inv.bookingId) : null;

    return booking?.date || (
      inv.createdAt
        ? localDay(new Date(inv.createdAt))
        : ''
    );
  }

  // Thay 3 nút thành 1 nút Thanh toán.
  renderSchedule = function () {
    const host = document.createElement('div');
    host.innerHTML = previousRenderSchedule();

    host.querySelectorAll(
      '.p1-pending-card[data-invoice]'
    ).forEach(card => {
      const invoiceId = card.dataset.invoice;
      const invoice = getInvoice(invoiceId);
      const actions = card.querySelector('.p1-pay-actions');

      if (!invoice || !actions) return;

      if (['awaiting', 'qr_pending'].includes(invoice.status)) {
        actions.innerHTML = btn(
          'Thanh toán',
          'p1-checkout',
          invoice.id,
          'primary'
        );
      }
    });

    // Hóa đơn hoàn tất vẫn có nút Xem hóa đơn.
    const list = host.querySelector('.p1-pending-list');

    if (list) {
      const recentlyPaid = state.invoices
        .filter(inv =>
          inv.status === 'paid' &&
          dayOfInvoice(inv) === selectedDay
        )
        .sort((a, b) =>
          String(b.paidAt || b.createdAt || '')
            .localeCompare(
              String(a.paidAt || a.createdAt || '')
            )
        )
        .slice(0, 4);

      if (recentlyPaid.length) {
        list.querySelector('.p1-pending-empty')?.remove();

        list.insertAdjacentHTML('beforeend', `
          <div style="
            grid-column:1/-1;
            padding:12px 2px 2px;
            font-size:12px;
            font-weight:800;
            color:#18734c;
            border-top:1px solid #e3eee7;
          ">
            Đã thanh toán gần đây
          </div>

          ${recentlyPaid.map(inv => {
            const booking = inv.bookingId
              ? getBooking(inv.bookingId)
              : null;

            const pitch = booking
              ? pitchOf(booking.pitchId)
              : null;

            return `
              <article class="p1-pending-card"
                style="border-color:#cdebd8;">

                <div class="p1-pending-head">
                  <strong>${esc(inv.customer)}</strong>
                  ${tag('paid')}
                </div>

                <small>
                  ${booking
                    ? `${esc(pitch?.name || 'Sân')} ·
                       ${esc(booking.start)}–${esc(booking.end)}`
                    : 'Bán hàng lẻ'
                  }
                </small>

                <div class="p1-pending-foot">
                  <span>
                    Đã thu:
                    <b>${money(paidAmount(inv))}</b>
                  </span>
                </div>

                <div class="p1-pay-actions">
                  ${btn(
                    'Xem hóa đơn',
                    'invoice',
                    inv.id,
                    'small primary'
                  )}
                </div>
              </article>
            `;
          }).join('')}
        `);
      }
    }

    return host.innerHTML;
  };

  // Hộp thoại chọn phương thức.
  function openMethodPicker(id) {
    const invoice = getInvoice(id);

    if (
      !invoice ||
      !['awaiting', 'qr_pending'].includes(invoice.status)
    ) {
      throw new Error(
        'Hóa đơn không còn chờ thanh toán.'
      );
    }

    if (isLocked(dayOfInvoice(invoice))) {
      throw new Error(
        'Kỳ giao dịch đã khóa sổ.'
      );
    }

    openModal(
      'Thanh toán',
      `
        <div style="
          text-align:center;
          padding:12px 0 20px;
        ">
          <div style="font-size:12px;color:#738a7c;">
            ${esc(invoice.customer)}
          </div>

          <div style="
            font-size:12px;
            color:#738a7c;
            margin-top:4px;
          ">
            ${esc(invoice.id)}
          </div>

          <div style="
            font-size:12px;
            margin-top:18px;
          ">
            Số tiền còn thu
          </div>

          <div style="
            font-weight:850;
            color:#146f4a;
            font-size:30px;
          ">
            ${money(due(invoice))}
          </div>
        </div>

        <div style="
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:10px;
        ">
          ${btn(
            '💵 Tiền mặt',
            'p1-pay-cash',
            id,
            'primary'
          )}

          ${btn(
            '▦ Mã QR',
            'p1-pay-qr',
            id,
            'soft'
          )}
        </div>
      `,
      btn('Đóng', 'modal-close')
    );
  }

  // Hiển thị QR tham chiếu.
  function showQr(id) {
    const invoice = getInvoice(id);

    if (
      !invoice ||
      invoice.status !== 'qr_pending'
    ) {
      throw new Error(
        'Chưa có yêu cầu QR hợp lệ.'
      );
    }

    const reference = String(
      invoice.qrRef || invoice.id
    );

    const qrText =
      `PITCHPRO-DEMO|${reference}|${due(invoice)}VND`;

    const qrSrc =
      'https://api.qrserver.com/v1/create-qr-code/' +
      '?size=170x170&data=' +
      encodeURIComponent(qrText);

    openModal(
      'Thanh toán QR',
      `
        <div style="
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:9px;
          padding:8px 0;
          text-align:center;
        ">
          <strong style="
            font-size:25px;
            color:#146f4a;
          ">
            ${money(due(invoice))}
          </strong>

          <img
            alt="QR tham chiếu mô phỏng"
            src="${qrSrc}"
            width="170"
            height="170"
            style="border:7px solid white;"
          >

          <strong>${esc(reference)}</strong>

          <p style="
            font-size:12px;
            color:#718479;
            line-height:1.5;
            max-width:350px;
          ">
            QR mô phỏng, không chuyển tiền thật.
            Nhân viên cần kiểm tra giao dịch ngân hàng
            trước khi xác nhận thanh toán.
          </p>
        </div>
      `,
      btn(
        'Quay lại',
        'p1-checkout',
        id
      ) +
      btn(
        'Xác nhận đã nhận chuyển khoản',
        'p1-verify-bank',
        id,
        'primary'
      )
    );
  }

  // Đăng ký thao tác mới.
  for (const key of [
    'p1-checkout',
    'p1-pay-cash',
    'p1-pay-qr',
    'p1-verify-bank'
  ]) {
    commonActionKeys.add(key);
  }

  commonAction = function (action, id) {
    if (action === 'p1-checkout') {
      openMethodPicker(id);
      return;
    }

    if (action === 'p1-pay-cash') {
      const inv = getInvoice(id);

      if (inv?.status === 'qr_pending') {
        if (!confirm(
          'Hãy xác minh khách chưa chuyển khoản ' +
          'trước khi đổi sang tiền mặt. Tiếp tục?'
        )) {
          return;
        }

        paymentAction('qr-reset', id);
      }

      // Giữ logic thu tiền, ghi phiếu thu, chống trùng.
      paymentAction('cash', id);
      return;
    }

    if (action === 'p1-pay-qr') {
      const inv = getInvoice(id);

      if (inv?.status === 'awaiting') {
        paymentAction('qr', id);
      }

      showQr(id);
      return;
    }

    if (action === 'p1-verify-bank') {
      paymentAction('bank-confirm', id);
      return;
    }

    return previousCommonAction(action, id);
  };

  // Sau khi thanh toán thành công,
  // hiển thị nút xem hóa đơn ngay.
  const previousPaymentForm = paymentForm;

  paymentForm = function (form, data) {
    const isCheckout =
      form.id === 'formCash' ||
      form.id === 'formBank';

    const invoiceId = form.dataset.invoice;

    previousPaymentForm(form, data);

    if (isCheckout) {
      const inv = getInvoice(invoiceId);

      if (inv?.status === 'paid') {
        openModal(
          'Thanh toán thành công',
          `
            <div style="
              text-align:center;
              padding:20px 0;
            ">
              <div style="
                font-size:32px;
                color:#168459;
              ">✓</div>

              <strong style="font-size:18px;">
                ${esc(inv.customer)}
              </strong>

              <div style="
                font-size:12px;
                color:#738a7c;
                margin:8px 0;
              ">
                ${esc(inv.id)}
              </div>

              <div style="
                font-size:25px;
                font-weight:850;
                color:#146f4a;
              ">
                ${money(invoiceTotal(inv))}
              </div>

              <p style="
                font-size:12px;
                color:#718479;
              ">
                Đã ghi nhận thanh toán
              </p>
            </div>
          `,
          btn(
            'Đóng',
            'modal-close'
          ) +
          btn(
            'Xem hóa đơn',
            'invoice',
            inv.id,
            'primary'
          )
        );
      }
    }
  };

  render();
})();
