/* PitchPro modular frontend. Load scripts in the order specified by index.html. */
'use strict';

  function renderInvoices(){
    const filter=i=>billFilter==='all'||billFilter==='open'&&i.status!=='paid'&&i.status!=='cancelled'||billFilter===i.status;
    const data=state.invoices.filter(filter).slice().reverse();
    const bills=state.invoices.filter(i=>i.status==='paid'), allRev=bills.reduce((s,i)=>s+invoiceTotal(i),0);
    const sumPending=state.invoices.filter(i=>i.status!=='cancelled'&&i.status!=='paid').reduce((s,i)=>s+due(i),0);
    return heading('QUY TRÌNH 01','Hóa đơn & thanh toán','Theo dõi hóa đơn nháp, tiền cọc, khoản chờ và trạng thái thanh toán.',btn('+ Bán sản phẩm','sale','','primary'))+
    `<div class="stats-grid">${stat('Hóa đơn cần giải quyết',countOpen(),'Gồm nháp, chưa thanh toán và chờ QR','▣')}${stat('Chưa thu / đang chờ',money(sumPending),'Không cộng tiền cọc đã thu','◷','amber')}${stat('Doanh thu hóa đơn hoàn tất',money(allRev),'Tổng hóa đơn đã hoàn tất · dữ liệu demo','↗')}${stat('Thanh toán QR đang chờ',state.invoices.filter(i=>i.status==='qr_pending').length,'Không tự coi là đã nhận tiền','⇄','blue')}</div>`+
    `<div class="toolbar"><div class="filters">${[['open','Cần xử lý'],['all','Tất cả'],['draft','Nháp'],['awaiting','Chờ thu'],['qr_pending','Chờ QR'],['paid','Hoàn tất']].map(([k,v])=>`<button class="filter-btn ${k===billFilter?'active':''}" data-action="bill-filter" data-id="${k}">${v}</button>`).join('')}</div></div>`+
    `<section class="surface"><div class="table-wrap"><table><thead><tr><th>Mã hóa đơn</th><th>Khách hàng</th><th>Tổng tiền</th><th>Đã ghi nhận</th><th>Còn phải thu</th><th>Trạng thái</th><th></th></tr></thead><tbody>${data.map(i=>`<tr><td class="strong">${esc(i.id)}</td><td>${esc(i.customer)}<br><span class="small-text">${i.bookingId?'Dịch vụ sân':'Bán lẻ'}</span></td><td class="money">${money(invoiceTotal(i))}</td><td>${money(paidAmount(i))}</td><td>${money(due(i))}</td><td>${tag(i.status)}</td><td>${btn('Xem chi tiết','invoice',i.id,'small')}</td></tr>`).join('')||'<tr><td colspan="7">Chưa có hóa đơn theo bộ lọc</td></tr>'}</tbody></table></div></section>${FOOT}`;
  }
  function invoiceModal(id){
    const inv=getInvoice(id);if(!inv){toast('Không tìm thấy hóa đơn',true);return;}
    const b=inv.bookingId?getBooking(inv.bookingId):null, sum=invoiceTotal(inv), paid=paidAmount(inv), deposit=depositAmount(inv), remaining=due(inv);
    const lines=inv.items.map(x=>`<div class="moneyline"><span>${esc(x.name)} <span class="muted">×${x.qty}</span></span><b>${money(x.unitPrice*x.qty)}</b></div>`).join('');
    const receipt=`<div class="receipt"><h3>PHIẾU TÍNH TIỀN · ${esc(inv.id)}</h3><p class="receipt-note">Bản xem trước · Chỉ phát hành chứng từ khi đã hoàn tất thanh toán</p>${lines}<div class="divider"></div><div class="moneyline"><span>Tổng tiền hàng và dịch vụ</span><strong>${money(sum)}</strong></div><div class="moneyline"><span>Tiền cọc đã xác minh</span><strong>− ${money(deposit)}</strong></div><div class="moneyline"><span>Đã thu khác (nếu có)</span><strong>− ${money(paid-deposit)}</strong></div><div class="moneyline"><strong>Cần thanh toán</strong><strong class="total-amount">${money(remaining)}</strong></div></div>`;
    const actionButtons=[];
    if(b&&b.status==='booked')actionButtons.push(btn('Nhận sân','start',b.id,'small'));
    if(b&&b.status==='using')actionButtons.push(btn('Trả sân / chốt','release',b.id,'small'));
    if(b&&['booked','using'].includes(b.status)&&inv.status==='draft'){actionButtons.push(btn('Ghi nhận tiền cọc','deposit',inv.id,'small soft'));actionButtons.push(btn('Yêu cầu hủy','cancel',b.id,'small danger'));}
    if(inv.status==='draft'||(inv.status==='awaiting'&&!inv.bookingId))actionButtons.push(btn('+ Thêm sản phẩm','sale',`target:${inv.id}`,'small'));
    if(inv.status==='awaiting')actionButtons.push(btn('Thanh toán tiền mặt','cash',inv.id,'small primary'),btn('Tạo yêu cầu QR','qr',inv.id,'small soft'));
    if(inv.status==='qr_pending')actionButtons.push(btn('Nhập chứng từ ngân hàng','bank-confirm',inv.id,'small primary'),btn('Đưa về chờ thanh toán','qr-reset',inv.id,'small'));
    if(inv.status==='paid')actionButtons.push(btn('In chứng từ','print',inv.id,'small'));
    const qr=inv.status==='qr_pending'?`<div class="alert warn" style="margin-top:14px"><b>Yêu cầu thanh toán đang chờ</b><br>Mã tham chiếu: <strong>${esc(inv.qrRef||'')}</strong><br>Đây là mã mô phỏng để thiết kế luồng Receive Task. Chưa có mã QR ngân hàng thật hoặc callback được xác thực. Không được ghi nhận đã chuyển khoản chỉ vì đã tạo yêu cầu.</div>`:'';
    openModal('Chi tiết hóa đơn',`<div class="panel-head"><div><div class="overline">${b?'DỊCH VỤ SÂN':'HÓA ĐƠN KHÁCH LẺ'}</div><div class="panel-title" style="margin-top:7px">${esc(inv.customer)}</div><p class="small-text">${b?`${pitchOf(b.pitchId).name} · ${b.date} · ${b.start}–${b.end}`:esc(inv.id)}</p></div>${tag(inv.status)}</div>${receipt}${qr}<div class="btn-row" style="margin-top:15px">${actionButtons.join('')}</div><div class="divider"></div><div class="panel-title">Lịch sử khoản thu</div>${receiptsFor(inv).map(r=>`<div class="moneyline"><span>${r.type==='deposit'?'Tiền cọc':r.type==='refund'?'Hoàn tiền':'Tất toán'} · ${r.method==='cash'?'Tiền mặt':'Chuyển khoản'}<br><span class="small-text">${niceTime(r.createdAt)} · ${esc(r.reference)}</span></span><strong>${money(r.amount)}</strong></div>`).join('')||'<p class="small-text">Chưa có khoản thu được xác minh.</p>'}`,btn('Đóng','modal-close'),true);
  }
  function depositModal(id){
    const inv=getInvoice(id),b=getBooking(inv.bookingId),target=rentalTotal(inv)*(Number(b.depositRate)/100),already=depositAmount(inv);
    const fields=field('Số tiền cọc thực thu (đ)','amount','number',Math.max(0,Math.round(target-already)),`required min="1" max="${Math.max(0,target-already)}"`)+selectField('Phương thức nhận cọc','method',[['cash','Tiền mặt'],['bank','Chuyển khoản · phải có mã đối chiếu']],'cash')+field('Mã chứng từ / tham chiếu','ref','text','','maxlength="80"')+
      `<div class="field full"><p class="field-hint">Tổng cọc dự kiến: ${money(target)} · đã ghi nhận: ${money(already)}. Không coi tiền cọc dự kiến là đã thanh toán.</p></div>`;
    openModal('Xác nhận tiền cọc',makeForm('formDeposit',fields),formBtns('formDeposit','Ghi nhận đã thu'));
    $('formDeposit').dataset.invoice=id;
  }
  function cashModal(id){
    const inv=getInvoice(id);const fields=field('Tiền khách đưa (đ)','cash','number',due(inv),`required min="${due(inv)}"`)+field('Mã phiếu thu nội bộ','ref','text',uid('TM'),'required');
    openModal('Xác nhận thu tiền mặt',makeForm('formCash',fields,`Cần thanh toán: <b>${money(due(inv))}</b>. Nhân viên phải kiểm đếm tiền thật trước khi xác nhận; không có tự động hóa bước kiểm đếm.`),formBtns('formCash','Xác nhận đã thu'));
    $('formCash').dataset.invoice=id;
  }
  function bankModal(id){
    const inv=getInvoice(id);const fields=field('Mã giao dịch trên chứng từ ngân hàng','ref','text','','required minlength="5" maxlength="90"')+field('Số tiền đã đối chiếu (đ)','amount','number',due(inv),`required min="${due(inv)}" max="${due(inv)}"`);
    openModal('Xác minh chuyển khoản thủ công',`<div class="alert warn"><b>Quan trọng:</b> Frontend không thể tự kiểm chứng tiền vào tài khoản. Chỉ xác nhận sau khi nhân viên đối chiếu thực tế: đúng người nhận, số tiền, mã giao dịch và trạng thái thành công. Khi tích hợp thật, backend phải kiểm chứng callback/chữ ký và chống nhận trùng.</div>`+makeForm('formBank',fields),formBtns('formBank','Đã đối chiếu chứng từ'));
    $('formBank').dataset.invoice=id;
  }
  function receiptFor(inv,type,method,amount,reference){state.receipts.push({id:uid('THU'),invoiceId:inv.id,type,method,amount,reference,verified:'manual',createdAt:new Date().toISOString()});}
  function ensureOpenDay(){if(isLocked(localDay()))throw new Error('Ngày hiện tại đã khóa sổ. Không thể tạo phiếu thu/chi mới trong kỳ đã khóa.');}
  function finalize(inv,method,amount,ref){
    if(inv.status==='paid'||inv.status==='cancelled')throw new Error('Hóa đơn đã hoàn tất hoặc đã hủy.');
    ensureOpenDay();
    const owed=due(inv);
    if(amount!==owed||amount<=0)throw new Error('Số tiền ghi nhận không khớp khoản phải thu.');
    receiptFor(inv,'settlement',method,amount,ref);
    inv.status='paid';inv.paidAt=new Date().toISOString();delete inv.qrRef;
    log(`Ghi nhận thanh toán ${inv.id}: ${money(amount)} qua ${method==='cash'?'tiền mặt':'chuyển khoản xác minh thủ công'} (${ref})`);
    closeModal();save();toast('Hóa đơn đã hoàn tất. Đã ghi nhật ký và khoản thu.');
  }
  function returnProducts(inv){for(const item of inv.items){if(item.productId){const p=getProduct(item.productId);if(p)p.stock+=item.qty;}}}
const paymentActionKeys = new Set(["invoice", "deposit", "cash", "qr", "qr-reset", "bank-confirm", "print"]);
function paymentAction(action,id) {
      if(action==='invoice'){invoiceModal(id);return;}
      if(action==='deposit') {const inv=getInvoice(id), b=getBooking(inv?.bookingId);if(!inv||!b||!['booked','using'].includes(b.status))throw new Error('Chỉ thu cọc cho lượt đặt sân còn hiệu lực.');const remain=rentalTotal(inv)*b.depositRate/100-depositAmount(inv);if(remain<=0)throw new Error('Đã thu đủ số cọc dự kiến.');depositModal(id);return;}
      if(action==='cash') {const i=getInvoice(id);if(i?.status!=='awaiting')throw new Error('Hóa đơn chưa ở trạng thái chờ thanh toán.');cashModal(id);return;}
      if(action==='qr') {
        const inv=getInvoice(id);if(inv?.status!=='awaiting'||due(inv)<=0)throw new Error('Chỉ được tạo yêu cầu QR cho hóa đơn đang chờ thanh toán.');
        inv.status='qr_pending';inv.qrRef=`PITCH-${Date.now().toString(36).toUpperCase()}`;
        log(`Tạo yêu cầu QR (mô phỏng) ${inv.qrRef} cho hóa đơn ${inv.id}, chưa ghi nhận thu tiền`);
        save();invoiceModal(id);toast('Đã tạo mã tham chiếu demo. Chưa có giao dịch ngân hàng.');return;
      }
      if(action==='qr-reset'){
        const inv=getInvoice(id);if(inv.status!=='qr_pending')throw new Error('Hóa đơn không ở trạng thái QR đang chờ.');
        inv.status='awaiting';delete inv.qrRef;log(`Hủy yêu cầu QR chưa xác minh của ${id}`);save();invoiceModal(id);return;
      }
      if(action==='bank-confirm'){if(getInvoice(id)?.status!=='qr_pending')throw new Error('Không có yêu cầu QR đang chờ.');bankModal(id);return;}
      if(action==='print'){const i=getInvoice(id);if(i?.status!=='paid')throw new Error('Chứng từ chỉ được in khi đã hoàn tất thanh toán.');invoiceModal(id);window.print();return;}
}

const paymentFormKeys = new Set(["formDeposit", "formCash", "formBank"]);
function paymentForm(form,data) {
      if(form.id==='formDeposit'){
        ensureOpenDay();const inv=getInvoice(form.dataset.invoice),b=getBooking(inv?.bookingId),amount=Number(data.amount);
        if(!inv||!b||!['booked','using'].includes(b.status))throw new Error('Không thể ghi nhận cọc cho lượt này.');
        const remain=rentalTotal(inv)*b.depositRate/100-depositAmount(inv);
        if(!Number.isFinite(amount)||amount<=0||amount>remain)throw new Error('Số tiền cọc vượt hạn mức dự kiến hoặc không hợp lệ.');
        if(data.method==='bank'&&data.ref.trim().length<5)throw new Error('Chuyển khoản cần mã chứng từ đối chiếu hợp lệ.');
        const ref=data.ref.trim()||uid('TMCOC');
        if(state.receipts.some(r=>r.reference===ref&&r.method===data.method))throw new Error('Mã chứng từ đã có, tránh ghi nhận trùng.');
        receiptFor(inv,'deposit',data.method,amount,ref);log(`Xác nhận cọc ${money(amount)} vào ${inv.id} bằng ${data.method==='cash'?'tiền mặt':'chuyển khoản đã đối chiếu'} · ${ref}`);
        closeModal();save();invoiceModal(inv.id);toast('Đã ghi nhận tiền cọc có chứng từ.');return;
      }
      if(form.id==='formCash'){
        const inv=getInvoice(form.dataset.invoice);if(!inv||inv.status!=='awaiting')throw new Error('Hóa đơn không còn chờ thanh toán.');
        const amount=Number(data.cash),owed=due(inv);if(!Number.isFinite(amount)||amount<owed)throw new Error('Tiền khách đưa phải đủ số cần thu.');
        if(!data.ref.trim())throw new Error('Cần mã phiếu thu tiền mặt.');
        if(state.receipts.some(r=>r.method==='cash'&&r.reference===data.ref.trim()))throw new Error('Mã phiếu thu tiền mặt đã tồn tại.');
        finalize(inv,'cash',owed,data.ref.trim());if(amount>owed)toast(`Đã thu ${money(owed)}; tiền trả lại khách: ${money(amount-owed)}.`);return;
      }
      if(form.id==='formBank'){
        const inv=getInvoice(form.dataset.invoice),amount=Number(data.amount),ref=data.ref.trim();
        if(!inv||inv.status!=='qr_pending')throw new Error('Hóa đơn không còn chờ đối soát.');
        if(ref.length<5)throw new Error('Mã giao dịch thực tế phải có ít nhất 5 ký tự.');
        if(state.receipts.some(r=>r.method==='bank'&&r.reference===ref))throw new Error('Mã giao dịch ngân hàng đã được ghi nhận.');
        finalize(inv,'bank',amount,ref);return;
      }
}

