
/*
 * Dữ liệu mẫu hư cấu, có quan hệ nghiệp vụ nhất quán.
 * Không phải dữ liệu khách hàng hoặc giao dịch thật.
 */
'use strict';

const originalFreshData = freshData;
const SAMPLE_VERSION = 'business-sample-2026-02';

function createBusinessSample() {
  const d = originalFreshData();

  d.bookings = [];
  d.invoices = [];
  d.receipts = [];
  d.recons = [];
  d.issues = [];
  d.audits = [];

  d.products = [
    {
      id: 'p1',
      name: 'Nước suối 500ml',
      price: 10000,
      stock: 180,
      unit: 'chai'
    },
    {
      id: 'p2',
      name: 'Nước tăng lực',
      price: 15000,
      stock: 96,
      unit: 'lon'
    },
    {
      id: 'p3',
      name: 'Bóng đá',
      price: 120000,
      stock: 24,
      unit: 'quả'
    },
    {
      id: 'p4',
      name: 'Băng quấn thể thao',
      price: 20000,
      stock: 65,
      unit: 'cuộn'
    }
  ];

  const today = localDay();

  const teams = [
    'FC Sông Hàn',
    'FC Hải Châu',
    'FC Hòa Khánh',
    'FC An Hải',
    'FC Thanh Khê',
    'FC Cẩm Lệ',
    'FC Ngũ Hành Sơn',
    'FC Hòa Xuân',
    'FC Hòa Cường',
    'FC Bách Khoa',
    'FC Điện Bàn',
    'FC Mỹ Khê'
  ];

  let sequence = 0;
  let receiptIndex = 0;

  const dateTime = (day, hour) =>
    new Date(`${day}T${hour}:00`).toISOString();

  function receipt(day, hour, invoiceId, type, method, amount) {
    receiptIndex += 1;

    d.receipts.push({
      id:
        `PT-${day.replace(/-/g, '')}-` +
        String(receiptIndex).padStart(3, '0'),

      invoiceId,
      type,
      method,
      amount,

      reference:
        (method === 'bank' ? 'CK' : 'TM') +
        day.replace(/-/g, '') +
        String(receiptIndex).padStart(4, '0'),

      verified: 'manual',
      createdAt: dateTime(day, hour)
    });
  }

  function booking(
    day,
    pitchId,
    start,
    end,
    team,
    status,
    options = {}
  ) {
    sequence += 1;

    const suffix = String(sequence).padStart(3, '0');

    const id =
      `LS-${day.replace(/-/g, '')}-${suffix}`;

    const invId =
      `HD-${day.replace(/-/g, '')}-${suffix}`;

    const pitch = pitchOf(pitchId);

    const rental =
      (timeMins(end) - timeMins(start)) / 60 *
      pitchRates[pitch.type];

    const items = [
      {
        id: `CT-${suffix}-01`,
        name: `Thuê ${pitch.name} · ${start}–${end}`,
        qty: 1,
        unitPrice: rental
      }
    ];

    if (options.water) {
      items.push({
        id: `CT-${suffix}-02`,
        productId: 'p1',
        name: 'Nước suối 500ml',
        qty: options.water,
        unitPrice: 10000
      });

      d.products.find(p => p.id === 'p1').stock -=
        options.water;
    }

    if (options.energy) {
      items.push({
        id: `CT-${suffix}-03`,
        productId: 'p2',
        name: 'Nước tăng lực',
        qty: options.energy,
        unitPrice: 15000
      });

      d.products.find(p => p.id === 'p2').stock -=
        options.energy;
    }

    const paid = status === 'completed';

    d.bookings.push({
      id,
      pitchId,
      name: team,
      phone: `099000${String(sequence).padStart(4, '0')}`,
      date: day,
      start,
      end,
      status,
      invoiceId: invId,
      depositRate: options.deposit ? 40 : 0
    });

    const inv = {
      id: invId,
      bookingId: id,
      customer: team,
      items,
      status: paid
        ? 'paid'
        : status === 'booked' || status === 'using'
          ? 'draft'
          : 'awaiting',
      createdAt: dateTime(day, start)
    };

    if (paid) {
      inv.paidAt = dateTime(day, end);
    }

    d.invoices.push(inv);

    const total = items.reduce(
      (sum, x) => sum + x.qty * x.unitPrice,
      0
    );

    if (options.deposit) {
      const amt = Math.round(rental * 0.4);

      receipt(
        day,
        start,
        invId,
        'deposit',
        options.depositMethod || 'bank',
        amt
      );

      if (paid) {
        receipt(
          day,
          end,
          invId,
          'settlement',
          options.method || 'cash',
          total - amt
        );
      }
    } else if (paid) {
      receipt(
        day,
        end,
        invId,
        'settlement',
        options.method || 'cash',
        total
      );
    }

    return invId;
  }

  const prev2 = addDay(today, -2);
  const prev1 = addDay(today, -1);

  // GIAO DỊCH HAI NGÀY TRƯỚC
  booking(
    prev2, 1, '17:00', '18:30',
    teams[0], 'completed',
    {method: 'bank', water: 4}
  );

  booking(
    prev2, 3, '18:00', '19:30',
    teams[1], 'completed',
    {method: 'cash', energy: 3}
  );

  booking(
    prev2, 6, '19:30', '21:00',
    teams[2], 'completed',
    {method: 'bank', water: 6}
  );

  booking(
    prev2, 8, '20:00', '21:30',
    teams[3], 'completed',
    {method: 'cash'}
  );

  // GIAO DỊCH HÔM QUA
  booking(
    prev1, 1, '07:00', '08:30',
    teams[4], 'completed',
    {method: 'cash', water: 6}
  );

  booking(
    prev1, 2, '09:00', '10:30',
    teams[5], 'completed',
    {method: 'bank', energy: 4}
  );

  booking(
    prev1, 4, '16:00', '17:30',
    teams[6], 'completed',
    {method: 'cash', water: 5}
  );

  booking(
    prev1, 6, '18:00', '19:30',
    teams[7], 'completed',
    {method: 'bank', deposit: true, water: 3}
  );

  booking(
    prev1, 7, '19:30', '21:00',
    teams[8], 'completed',
    {method: 'bank', energy: 4}
  );

  booking(
    prev1, 8, '20:00', '21:30',
    teams[9], 'completed',
    {method: 'cash'}
  );

  // GIAO DỊCH HÔM NAY
  booking(
    today, 1, '07:00', '08:30',
    teams[10], 'completed',
    {method: 'cash', water: 4}
  );

  booking(
    today, 2, '08:00', '09:30',
    teams[11], 'completed',
    {method: 'bank', energy: 2}
  );

  booking(
    today, 3, '10:00', '11:30',
    teams[0], 'completed',
    {method: 'cash', water: 6}
  );

  booking(
    today, 4, '11:30', '13:00',
    teams[1], 'completed',
    {method: 'bank', deposit: true, water: 5}
  );

  booking(
    today, 5, '13:00', '14:30',
    teams[2], 'completed',
    {method: 'cash', energy: 4}
  );

  booking(
    today, 6, '06:00', '07:30',
    teams[3], 'completed',
    {method: 'bank', water: 2}
  );

  // LƯỢT ĐANG DÙNG SÂN
  booking(
    today, 1, '15:00', '16:30',
    teams[4], 'using',
    {deposit: true, depositMethod: 'cash'}
  );

  // LƯỢT ĐẶT BUỔI TỐI
  booking(
    today, 7, '18:00', '19:30',
    teams[5], 'booked'
  );

  booking(
    today, 8, '19:00', '20:30',
    teams[6], 'booked'
  );

  // LỊCH NGÀY MAI
  booking(
    addDay(today, 1), 2, '17:00', '18:30',
    teams[7], 'booked'
  );

  booking(
    addDay(today, 1), 4, '19:00', '20:30',
    teams[8], 'booked'
  );

  function sum(day, method) {
    return d.receipts
      .filter(x =>
        localDay(new Date(x.createdAt)) === day &&
        x.method === method
      )
      .reduce((s, x) => s + x.amount, 0);
  }

  // HÔM QUA: ĐỐI SOÁT ĐÃ KHỚP VÀ KHÓA SỔ
  d.recons.push({
    id: `DS-${prev1.replace(/-/g, '')}`,
    day: prev1,
    status: 'locked',
    countedCash: sum(prev1, 'cash'),
    countedBank: sum(prev1, 'bank'),
    notes: 'Đã đối chiếu sổ quỹ và giao dịch.',
    createdAt: dateTime(prev1, '21:45'),
    updatedAt: dateTime(prev1, '21:55'),
    approvedBy: 'Quản lý',
    approvedAt: dateTime(prev1, '22:00'),
    lockedAt: dateTime(prev1, '22:05')
  });

  // HÔM NAY: CÓ CHÊNH LỆCH 50.000Đ ĐỂ THỬ XỬ LÝ
  const currentCash = sum(today, 'cash');
  const currentBank = sum(today, 'bank');

  d.recons.push({
    id: `DS-${today.replace(/-/g, '')}`,
    day: today,
    status: 'draft',
    countedCash: Math.max(0, currentCash - 50000),
    countedBank: currentBank,
    notes:
      'Kiểm đếm lần đầu; tiền mặt thiếu 50.000đ, ' +
      'đang kiểm tra phiếu thu.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  d.issues.push({
    id: `YC-${today.replace(/-/g, '')}-01`,
    kind: 'recon',
    day: today,
    status: 'pending',
    note: '',
    createdAt: new Date().toISOString()
  });

  d.audits = [
    {
      id: 'LG-01',
      createdAt: new Date().toISOString(),
      actor: 'Nhân viên',
      message: 'Tạo yêu cầu đối soát tiền mặt kỳ ' + today
    },
    {
      id: 'LG-02',
      createdAt: dateTime(prev1, '22:05'),
      actor: 'Quản lý',
      message: 'Khóa sổ doanh thu ngày ' + prev1
    },
    {
      id: 'LG-03',
      createdAt: dateTime(prev1, '22:00'),
      actor: 'Quản lý',
      message: 'Phê duyệt báo cáo đối soát ngày ' + prev1
    }
  ];

  d.sampleVersion = SAMPLE_VERSION;
  return d;
}

// Giữ chức năng khôi phục dữ liệu có sẵn.
freshData = createBusinessSample;

// Chỉ nạp mẫu một lần, không thêm trùng khi F5.
if (state.sampleVersion !== SAMPLE_VERSION) {
  const onlyOriginal =
    state.bookings.every(b =>
      [
        'DS-101',
        'DS-102',
        'DS-103',
        'DS-098',
        'DS-099'
      ].includes(b.id)
    ) &&
    state.issues.length === 0 &&
    state.recons.length === 0;

  const sample = createBusinessSample();

  if (onlyOriginal) {
    state = sample;
  } else {
    // Bảo toàn dữ liệu mà thành viên đã tự nhập.
    for (const prop of [
      'bookings',
      'invoices',
      'receipts',
      'recons',
      'issues',
      'audits'
    ]) {
      const known = new Set(
        state[prop].map(x => x.id)
      );

      state[prop].push(
        ...sample[prop].filter(x => !known.has(x.id))
      );
    }

    state.sampleVersion = SAMPLE_VERSION;
  }

  store(state);
}
