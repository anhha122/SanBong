
/*
 * PitchPro / MIS3047 - Quy trình 1
 * Lịch gọn, bán nhanh, thu tiền tại hóa đơn chờ.
 */
'use strict';

(() => {
  const baseCommonAction = commonAction;
  const baseBookingAction = bookingAction;
  const baseSalesForm = salesForm;
  const baseInvoiceModal = invoiceModal;
  const baseRender = render;

  const HOUR = 34;
  let pendingFilter = 'all';
  let previousGridKey = '';
  let highlightInvoiceId = '';

  const nowMinutes = () => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  };

  const invoiceDay = inv => {
    const b = inv.bookingId
      ? getBooking(inv.bookingId)
      : null;

    return b?.date || (
      inv.createdAt
        ? localDay(new Date(inv.createdAt))
        : ''
    );
  };

  const inOpenDay = day =>
    day === localDay() && !isLocked(day);

  const canReceive = b =>
    b &&
    b.status === 'booked' &&
    inOpenDay(b.date) &&
    nowMinutes() >= timeMins(b.start);

  const customerOf = inv => {
    const b = inv.bookingId
      ? getBooking(inv.bookingId)
      : null;

    const pitch = b ? pitchOf(b.pitchId) : null;

    return b
      ? `${pitch?.name || 'Sân'} — ${b.name} (${b.start}–${b.end})`
      : `Khách lẻ — ${inv.id}`;
  };

  // Chỉ đưa vào danh sách chờ khi khách đã trả sân.
  function waitingInvoices() {
    return state.invoices.filter(inv => {
      if (
        !['awaiting', 'qr_pending'].includes(inv.status) ||
        invoiceDay(inv) !== selectedDay
      ) {
        return false;
      }

      const b = inv.bookingId
        ? getBooking(inv.bookingId)
        : null;

      if (b && b.status !== 'completed') {
        return false;
      }

      if (pendingFilter === 'team') {
        return Boolean(b);
      }

      if (pendingFilter === 'retail') {
        return !b;
      }

      return true;
    });
  }

  // Các lượt đặt hiển thị trên lưới giờ.
  function bookingBlock(b) {
    const start = timeMins(b.start);
    const end = timeMins(b.end);

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start
    ) {
      return '';
    }

    const inv = getInvoice(b.invoiceId);

    const status = [
      'booked',
      'using',
      'completed',
      'cancel_review'
    ].includes(b.status)
      ? b.status
      : 'booked';

    return `
      <button
        type="button"
        class="p1-tl-block ${status}"
        style="
          top:${start / 60 * HOUR}px;
          height:${Math.max(
            22,
            (end - start) / 60 * HOUR
          )}px
        "
        data-action="invoice"
        data-id="${esc(b.invoiceId)}"
        title="${esc(b.name)} · ${esc(b.start)}–${esc(b.end)}"
      >
        <b>${esc(b.name)}</b>
        <span>${esc(b.start)}–${esc(b.end)}</span>

        ${
          inv
            ? `<small>${esc(inv.id)}</small>`
            : ''
        }
      </button>
    `;
  }

  // Bảng lịch thời gian thu gọn.
  function timeline(pitches, bookings) {
    const locked =
      selectedDay < localDay() ||
      isLocked(selectedDay);

    const today = selectedDay === localDay();
    const nowY = nowMinutes() / 60 * HOUR;

    const columns = pitches.map(p => {
      const emptyCells = locked
        ? ''
        : Array.from({length: 48}, (_, i) => {
            const mins = i * 30;

            return `
              <button
                type="button"
                class="p1-empty-slot"
                style="top:${mins / 60 * HOUR}px"
                data-action="p1-slot"
                data-id="${p.id}|${mins}"
                title="Đặt ${esc(p.name)}"
              ></button>
            `;
          }).join('');

      return `
        <div class="p1-time-track">
          ${emptyCells}

          ${
            bookings
              .filter(b => b.pitchId === p.id)
              .map(bookingBlock)
              .join('')
          }

          ${
            today
              ? `<div
                   class="p1-time-now"
                   style="top:${nowY}px"
                 ></div>`
              : ''
          }
        </div>
      `;
    }).join('');

    return `
      <section class="p1-timeline-wrapper">
        <div class="p1-timeline-heading">
          <strong>Lịch theo giờ</strong>
          <span>
            Nhấn ô trống để đặt · Nhấn lịch màu để xem
          </span>
        </div>

        <div
          class="p1-timeline-scroll"
          id="p1TimelineScroll"
        >
          <div
            class="p1-timeline-grid"
            style="
              --p1-n:${pitches.length};
              min-width:${52 + 106 * pitches.length}px
            "
          >
            <div class="p1-time-corner">GIỜ</div>

            ${
              pitches.map(p => `
                <div class="p1-time-pitch-head">
                  <b>${esc(p.name)}</b>
                  <small>${p.type} người</small>
                </div>
              `).join('')
            }

            <div class="p1-time-axis">
              ${
                Array.from({length: 24}, (_, h) => `
                  <div style="top:${h * HOUR}px">
                    ${String(h).padStart(2, '0')}:00
                  </div>
                `).join('')
              }
            </div>

            ${columns}
          </div>
        </div>
      </section>
    `;
  }

  // Thẻ sân: chỉ nhận khi đến giờ.
  function pitchCard(p, bookings) {
    const all = bookings
      .filter(b => b.pitchId === p.id)
      .sort((a, b) => a.start.localeCompare(b.start));

    const current = all.find(
      b => b.status === 'using'
    );

    const booked = all.find(
      b => b.status === 'booked'
    );

    const target = current || booked;

    const status = current
      ? 'Đang sử dụng'
      : booked
        ? 'Có lịch đặt'
        : 'Còn trống';

    const tone = current
      ? 'green'
      : booked
        ? 'blue'
        : 'grey';

    return `
      <section class="pitch-card p1-pitch-card">
        <div class="pitch-top">
          <div>
            <div class="pitch-type">
              SÂN ${esc(p.type)} NGƯỜI
            </div>
            <div class="pitch-nr">${esc(p.name)}</div>
          </div>

          <span class="tag ${tone}">${status}</span>
        </div>

        <div class="p1-pitch-rate">
          ${money(pitchRates[p.type])}/giờ
        </div>

        <div class="p1-pitch-detail">
          ${
            target
              ? `
                <b>
                  ${esc(target.start)}–${esc(target.end)}
                  · ${esc(target.name)}
                </b>
                <small>
                  ${tag(target.status, stages)}
                  · ${esc(target.invoiceId)}
                </small>
              `
              : 'Chưa có lượt cần tiếp nhận'
          }

          ${
            all.length > 1
              ? `<small>
                  Trong ngày có ${all.length} lượt;
                  chọn trên lưới để xử lý.
                 </small>`
              : ''
          }
        </div>

        <div class="p1-pitch-actions">
          ${
            target?.status === 'booked' &&
            inOpenDay(target.date)
              ? canReceive(target)
                ? btn(
                    'Nhận sân',
                    'start',
                    target.id,
                    'small primary'
                  )
                : `<button
                     class="btn small"
                     disabled
                     title="Chưa đến giờ đã đặt"
                   >
                     Chờ đến ${esc(target.start)}
                   </button>`
              : ''
          }

          ${
            target?.status === 'using' &&
            inOpenDay(target.date)
              ? btn(
                  'Trả sân',
                  'release',
                  target.id,
                  'small primary'
                )
              : ''
          }

          ${
            target?.status === 'using' &&
            inOpenDay(target.date)
              ? btn(
                  '+ Dịch vụ',
                  'sale',
                  `target:${target.invoiceId}`,
                  'small soft'
                )
              : ''
          }

          ${
            target
              ? btn(
                  'Xem lượt',
                  'invoice',
                  target.invoiceId,
                  'small'
                )
              : ''
          }

          ${
            selectedDay >= localDay() &&
            !isLocked(selectedDay)
              ? btn(
                  '+ Đặt sân',
                  'booking',
                  p.id,
                  'small'
                )
              : ''
          }
        </div>
      </section>
    `;
  }

  // Hóa đơn chờ thanh toán bên phải màn hình.
  function waitingPanel() {
    const list = waitingInvoices();

    return `
      <aside class="p1-right" id="p1WaitingPanel">
        <div class="p1-right-title">
          <strong>Hóa đơn cần xử lý</strong>
          <span class="p1-number">
            ${list.length}
          </span>
        </div>

        <div class="p1-right-tabs">
          ${
            [
              ['all', 'Tất cả'],
              ['team', 'Đội bóng'],
              ['retail', 'Khách lẻ']
            ].map(([key, label]) => `
              <button
                class="${
                  pendingFilter === key ? 'active' : ''
                }"
                data-action="p1-pending-filter"
                data-id="${key}"
              >
                ${label}
              </button>
            `).join('')
          }
        </div>

        <div class="p1-pending-list">
          ${
            list.map(inv => {
              const booking = inv.bookingId
                ? getBooking(inv.bookingId)
                : null;

              const canPay = inOpenDay(invoiceDay(inv));

              return `
                <article
                  class="p1-pending-card ${
                    highlightInvoiceId === inv.id
                      ? 'p1-flash'
                      : ''
                  }"
                  data-invoice="${esc(inv.id)}"
                >
                  <div class="p1-pending-head">
                    <strong>${esc(inv.customer)}</strong>
                    ${tag(inv.status)}
                  </div>

                  <small>
                    ${
                      booking
                        ? `${
                            esc(
                              pitchOf(booking.pitchId)?.name || ''
                            )
                          } ·
                          ${esc(booking.start)}–${esc(booking.end)}`
                        : 'Khách mua lẻ'
                    }
                  </small>

                  <div class="p1-pending-items">
                    ${
                      inv.items.slice(0, 3).map(it => `
                        <div>
                          <span>
                            ${esc(it.name)} × ${it.qty}
                          </span>

                          <b>
                            ${money(it.qty * it.unitPrice)}
                          </b>
                        </div>
                      `).join('')
                    }

                    ${
                      inv.items.length > 3
                        ? `<small>
                            + ${inv.items.length - 3} dòng khác
                           </small>`
                        : ''
                    }
                  </div>

                  <div class="p1-pending-foot">
                    <span>
                      Còn thu <b>${money(due(inv))}</b>
                    </span>
                  </div>

                  <div class="p1-pay-actions">
                    ${
                      canPay
                        ? (
                          inv.status === 'awaiting'
                            ? `
                              ${btn(
                                'Tiền mặt',
                                'cash',
                                inv.id,
                                'small primary'
                              )}

                              ${btn(
                                'Mã QR',
                                'qr',
                                inv.id,
                                'small soft'
                              )}
                            `
                            : `
                              ${btn(
                                'Xác nhận chuyển khoản',
                                'bank-confirm',
                                inv.id,
                                'small primary'
                              )}

                              ${btn(
                                'Đổi sang tiền mặt',
                                'qr-reset',
                                inv.id,
                                'small'
                              )}
                            `
                        )
                        : ''
                    }

                    ${btn(
                      'Xem hóa đơn',
                      'invoice',
                      inv.id,
                      'small'
                    )}
                  </div>
                </article>
              `;
            }).join('')
            ||
            `<div class="p1-pending-empty">
              Chưa có hóa đơn cần thanh toán trong ngày.
             </div>`
          }
        </div>
      </aside>
    `;
  }

  // Trang lịch sân chính.
  renderSchedule = function () {
    const today = localDay();

    const bookings = daysBookings(selectedDay)
      .slice()
      .sort((a, b) => a.start.localeCompare(b.start));

    const pitches = pitchList.filter(
      p => pitchFilter === 'all' ||
           p.type === pitchFilter
    );

    const weekdays = Array.from(
      {length: 7},
      (_, i) => {
        const day = addDay(selectedDay, i - 3);

        return `
          <button
            class="p1-day ${
              day === selectedDay ? 'active' : ''
            }"
            data-action="day"
            data-id="${day}"
          >
            <small>
              ${
                day === today
                  ? 'Hôm nay'
                  : esc(dayLabel(day).split(' ')[0])
              }
            </small>

            <strong>
              ${day.slice(8)}/${day.slice(5, 7)}
            </strong>
          </button>
        `;
      }
    ).join('');

    return heading(
      '',
      'Lịch sân',
      '',
      btn('+ Đặt sân', 'booking', '', 'primary') +
      btn('Bán hàng nhanh', 'sale', '', 'soft')
    ) + `
      <div class="p1-board-layout">
        <div class="p1-board-main">

          <div class="p1-week-strip">
            ${btn(
              '‹',
              'p1-week-shift',
              '-7',
              'small'
            )}

            <div class="p1-week-days">
              ${weekdays}
            </div>

            ${btn(
              '›',
              'p1-week-shift',
              '7',
              'small'
            )}

            <input
              id="scheduleDate"
              class="date-input"
              type="date"
              value="${selectedDay}"
              aria-label="Ngày sử dụng sân"
            >
          </div>

          ${timeline(pitches, bookings)}

          <div class="p1-pitch-filter">
            ${
              [
                ['all', 'Tất cả'],
                ['5', 'Sân 5 người'],
                ['7', 'Sân 7 người']
              ].map(([key, text]) => `
                <button
                  class="${
                    pitchFilter === key ? 'active' : ''
                  }"
                  data-action="pitch-filter"
                  data-id="${key}"
                >
                  ${text}
                </button>
              `).join('')
            }
          </div>

          <div class="p1-card-grid">
            ${
              pitches.map(
                p => pitchCard(p, bookings)
              ).join('')
            }
          </div>
        </div>

        ${waitingPanel()}
      </div>
    `;
  };

  // BÁN HÀNG NHANH: chọn sân hoặc hóa đơn.
  saleModal = function (id = '') {
    const targetId = id.startsWith('target:')
      ? id.slice(7)
      : '';

    const candidates = state.invoices.filter(inv => {
      if (
        !['draft', 'awaiting'].includes(inv.status) ||
        invoiceDay(inv) !== localDay()
      ) {
        return false;
      }

      const b = inv.bookingId
        ? getBooking(inv.bookingId)
        : null;

      if (!b) {
        return inv.status === 'awaiting';
      }

      return (
        inv.status === 'draft' &&
        b.status === 'using'
      ) || (
        inv.status === 'awaiting' &&
        b.status === 'completed'
      );
    });

    const choices = [
      [
        'retail',
        'Khách lẻ — lập hóa đơn riêng'
      ],

      ...candidates.map(inv => [
        inv.id,
        customerOf(inv) + ` · ${inv.id}`
      ])
    ];

    const items = state.products.map(p => [
      p.id,
      `${p.name} · ${money(p.price)} · còn ${p.stock}`
    ]);

    const preselected = choices.some(
      ([key]) => key === targetId
    )
      ? targetId
      : 'retail';

    const fields =
      selectField(
        'Gộp vào sân / hóa đơn',
        'invoice',
        choices,
        preselected
      ) +

      selectField(
        'Sản phẩm',
        'product',
        items,
        id.startsWith('target:') ? '' : id
      ) +

      field(
        'Số lượng',
        'qty',
        'number',
        1,
        'required min="1" step="1"'
      );

    openModal(
      'Bán hàng nhanh',
      makeForm('formSale', fields),
      formBtns('formSale', 'Thêm sản phẩm'),
      true
    );
  };

  // Thêm sản phẩm, không mở thêm hóa đơn.
  salesForm = function (form, data) {
    if (form.id !== 'formSale') {
      return baseSalesForm(form, data);
    }

    const p = getProduct(data.product);
    const qty = Number(data.qty);

    if (
      !p ||
      !Number.isInteger(qty) ||
      qty < 1
    ) {
      throw new Error('Số lượng không hợp lệ.');
    }

    if (qty > p.stock) {
      throw new Error(
        `Không đủ tồn ${p.name}. ` +
        `Hiện có ${p.stock} ${p.unit}.`
      );
    }

    if (isLocked(localDay())) {
      throw new Error('Ngày hôm nay đã khóa sổ.');
    }

    let inv;

    if (data.invoice === 'retail') {
      inv = {
        id: uid('HD').toUpperCase(),
        bookingId: null,
        customer: 'Khách lẻ',
        items: [],
        status: 'awaiting',
        createdAt: new Date().toISOString()
      };

      state.invoices.push(inv);
    } else {
      inv = getInvoice(data.invoice);

      const b = inv?.bookingId
        ? getBooking(inv.bookingId)
        : null;

      if (
        !inv ||
        invoiceDay(inv) !== localDay() ||
        !['draft', 'awaiting'].includes(inv.status) ||
        (
          b &&
          !(
            (
              inv.status === 'draft' &&
              b.status === 'using'
            ) ||
            (
              inv.status === 'awaiting' &&
              b.status === 'completed'
            )
          )
        )
      ) {
        throw new Error(
          'Hóa đơn này không còn được phép thêm sản phẩm.'
        );
      }
    }

    p.stock -= qty;

    inv.items.push({
      id: uid('LINE'),
      productId: p.id,
      name: p.name,
      qty,
      unitPrice: p.price
    });

    log(
      `Bán ${qty} ${p.unit} ${p.name} · ` +
      `${inv.id} (${customerOf(inv)}), tồn ${p.stock}`
    );

    closeModal();

    selectedDay = localDay();
    save();

    toast(
      `Đã thêm ${qty} ${p.unit} ${p.name} ` +
      `vào ${inv.id}.`
    );
  };

  // NHẬN SÂN VÀ TRẢ SÂN.
  bookingAction = function (action, id) {
    if (action === 'start') {
      const b = getBooking(id);

      if (!b || b.status !== 'booked') {
        throw new Error(
          'Lượt đặt không còn chờ nhận sân.'
        );
      }

      if (!inOpenDay(b.date)) {
        throw new Error(
          'Chỉ nhận sân trong ngày sử dụng, khi chưa khóa sổ.'
        );
      }

      if (!canReceive(b)) {
        throw new Error(
          `Chưa đến giờ nhận sân (${b.start}).`
        );
      }

      b.status = 'using';

      log(
        `Nhận ${pitchOf(b.pitchId).name} · ` +
        `${b.name} · lượt ${b.id}`
      );

      closeModal();
      save();

      toast(
        'Đã nhận sân. Có thể thêm dịch vụ bằng Bán hàng nhanh.'
      );
      return;
    }

    if (action === 'release') {
      const b = getBooking(id);

      if (!b || b.status !== 'using') {
        throw new Error(
          'Lượt này không ở trạng thái đang sử dụng.'
        );
      }

      if (!inOpenDay(b.date)) {
        throw new Error(
          'Ngày đã khóa sổ hoặc không phải hôm nay.'
        );
      }

      const inv = getInvoice(b.invoiceId);

      if (!inv || inv.status !== 'draft') {
        throw new Error(
          'Không tìm thấy hóa đơn nháp hợp lệ.'
        );
      }

      // Cho phép trả sớm nếu khách thực sự đã kết thúc.
      if (
        nowMinutes() < timeMins(b.end) &&
        !confirm(
          'Chưa đến giờ kết thúc dự kiến. ' +
          'Khách đã trả sân sớm và bạn muốn chốt hóa đơn?'
        )
      ) {
        return;
      }

      b.status = 'completed';

      if (due(inv) === 0) {
        inv.status = 'paid';
        inv.paidAt = new Date().toISOString();

        log(
          `Trả sân, tất toán ${inv.id} ` +
          'bằng tiền cọc đã nhận (không phát sinh thu thêm)'
        );
      } else {
        inv.status = 'awaiting';

        log(
          `Trả ${pitchOf(b.pitchId).name} · ` +
          `${b.name}; ${inv.id} chờ thu ${money(due(inv))}`
        );
      }

      highlightInvoiceId = inv.id;
      pendingFilter = 'all';
      selectedDay = b.date;

      closeModal();
      save();

      $('p1WaitingPanel')?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });

      toast(
        inv.status === 'paid'
          ? 'Đã trả sân, tiền cọc đủ để tất toán.'
          : 'Đã trả sân. Hóa đơn nằm trong mục Cần xử lý bên phải.'
      );
      return;
    }

    return baseBookingAction(action, id);
  };

  // Hiển thị QR tham chiếu của bản mô phỏng.
  invoiceModal = function (id) {
    baseInvoiceModal(id);

    const inv = getInvoice(id);

    if (inv?.status !== 'qr_pending') {
      return;
    }

    const receipt = $('modalRoot')
      ?.querySelector('.receipt');

    if (!receipt) {
      return;
    }

    const text =
      `PITCHPRO DEMO | ` +
      `${inv.qrRef || inv.id} | ${due(inv)} VND`;

    const imageUrl =
      'https://api.qrserver.com/v1/create-qr-code/' +
      `?size=160x160&data=${encodeURIComponent(text)}`;

    receipt.insertAdjacentHTML(
      'afterend',
      `
        <div class="p1-qr-preview">
          <strong>QR tham chiếu (mô phỏng)</strong>

          <img
            src="${imageUrl}"
            alt="QR mô phỏng chứa mã tham chiếu hóa đơn"
            width="132"
            height="132"
            loading="lazy"
          >

          <small>
            ${esc(inv.qrRef || inv.id)}
            · ${money(due(inv))}
          </small>

          <small>
            Không phải mã chuyển khoản ngân hàng thật.
            Chỉ ghi nhận sau khi kiểm tra tiền vào tài khoản.
          </small>
        </div>
      `
    );
  };

  // Đăng ký hành động cho bảng lịch.
  for (const action of [
    'p1-week-shift',
    'p1-slot',
    'p1-pending-filter'
  ]) {
    commonActionKeys.add(action);
  }

  commonAction = function (action, id) {
    if (action === 'p1-week-shift') {
      selectedDay = addDay(
        selectedDay,
        Number(id) || 0
      );

      render();
      return;
    }

    if (action === 'p1-pending-filter') {
      pendingFilter = [
        'all',
        'team',
        'retail'
      ].includes(id)
        ? id
        : 'all';

      render();
      return;
    }

    if (action === 'p1-slot') {
      const [pitch, minute] = id
        .split('|')
        .map(Number);

      if (
        !pitchOf(pitch) ||
        !Number.isInteger(minute) ||
        minute < 0 ||
        minute >= 1440
      ) {
        return;
      }

      if (
        selectedDay < localDay() ||
        isLocked(selectedDay)
      ) {
        throw new Error(
          'Không đặt sân ở ngày đã qua/khóa sổ.'
        );
      }

      if (
        selectedDay === localDay() &&
        minute < nowMinutes()
      ) {
        throw new Error(
          'Giờ đã qua, vui lòng chọn giờ khác.'
        );
      }

      bookingModal(String(pitch));

      const fmt = m =>
        `${String(Math.floor(m / 60)).padStart(2, '0')}:` +
        `${String(m % 60).padStart(2, '0')}`;

      $('m_date').value = selectedDay;
      $('m_start').value = fmt(minute);
      $('m_end').value = fmt(
        Math.min(minute + 90, 1439)
      );

      return;
    }

    return baseCommonAction(action, id);
  };

  // Giữ vị trí cuộn khi danh sách thay đổi.
  render = function () {
    const old = $('p1TimelineScroll');
    const before = old?.scrollTop;
    const beforeLeft = old?.scrollLeft;

    const key = `${selectedDay}:${pitchFilter}`;

    baseRender();

    if (page === 'lich-san') {
      const grid = $('p1TimelineScroll');

      if (grid) {
        grid.scrollTop =
          key === previousGridKey &&
          before != null
            ? before
            : Math.max(
                0,
                (
                  selectedDay === localDay()
                    ? nowMinutes() - 120
                    : 14 * 60
                ) / 60 * HOUR
              );

        if (
          key === previousGridKey &&
          beforeLeft != null
        ) {
          grid.scrollLeft = beforeLeft;
        }
      }

      previousGridKey = key;
    }
  };

  render();

  // Tự cập nhật nút Nhận sân khi đến giờ.
  setInterval(() => {
    if (
      page === 'lich-san' &&
      !$('modalRoot')?.innerHTML
    ) {
      render();
    }
  }, 30000);
})();
