/* PitchPro modular frontend. Load scripts in the order specified by index.html. */
'use strict';

  function renderSchedule(){
    const today=localDay();const bks=daysBookings(selectedDay);const filtered=pitchList.filter(p=>pitchFilter==='all'||p.type===pitchFilter);
    const strip=Array.from({length:7},(_,i)=>{const day=addDay(today,i-1);return `<button class="day-pill ${day===selectedDay?'active':''}" data-action="day" data-id="${day}"><small>${i===1?'HÔM NAY':esc(dayLabel(day).split(' ')[0])}</small><strong>${day.slice(8)}/${day.slice(5,7)}</strong></button>`;}).join('');
    const board=filtered.map(p=>{const ses=bks.filter(b=>b.pitchId===p.id).sort((a,b)=>a.start.localeCompare(b.start));return `<div class="schedule-col"><div class="schedule-head">${p.name} <span class="small-text">· ${p.type} người</span></div>${ses.map(b=>`<div class="schedule-block ${b.status==='booked'?'booked':b.status==='completed'?'completed':''}"><strong>${b.start}–${b.end}</strong><div>${esc(b.name)}</div></div>`).join('')||'<div class="schedule-free">+ Chưa có lịch</div>'}</div>`;}).join('');
    const grid=filtered.map(p=>{const ses=bks.filter(b=>b.pitchId===p.id).sort((a,b)=>a.start.localeCompare(b.start));const primary=ses.find(b=>b.status==='using')||ses.find(b=>b.status==='booked')||ses[0];return `<div class="pitch-card"><div class="pitch-top"><div><div class="pitch-type">SÂN ${p.type} NGƯỜI · ${money(pitchRates[p.type])}/GIỜ (DEMO)</div><div class="pitch-nr">${p.name}</div></div>${primary?tag(primary.status,stages):tag('Trống',{Trống:['Còn trống','green']})}</div><div class="pitch-detail">${ses.length?ses.map(b=>`<strong>${b.start}–${b.end}</strong> · ${esc(b.name)}<br>`).join(''):'Chưa có lượt đặt sân trong ngày đã chọn.'}</div><div class="btn-row">${primary&&primary.status==='booked'?btn('Nhận sân','start',primary.id,'small soft'):primary&&primary.status==='using'?btn('Trả sân','release',primary.id,'small primary'):''}${btn('Chi tiết / thêm lịch','pitch-detail',p.id,'small')}</div></div>`;}).join('');
    return heading('QUY TRÌNH 01','Lịch sân & tiếp nhận dịch vụ','Đặt sân → tạo hóa đơn nháp → nhận/trả sân → chốt và thanh toán.',btn('+ Đặt sân mới','booking','','primary'))+
    `<div class="toolbar"><div class="filters">${['all','5','7'].map(x=>`<button class="filter-btn ${x===pitchFilter?'active':''}" data-action="pitch-filter" data-id="${x}">${x==='all'?'Tất cả sân':`Sân ${x} người`}</button>`).join('')}</div><label class="small-text">Chọn ngày: <input id="scheduleDate" class="date-input" type="date" value="${selectedDay}"></label></div><div class="calendar-strip">${strip}</div><section class="surface" style="margin-bottom:19px"><div class="panel-head"><div class="panel-title">Sơ đồ lịch sân · ${esc(dayLabel(selectedDay))}</div><span class="small-text">Hiển thị các lượt đặt theo từng sân</span></div><div class="schedule-board">${board}</div></section><div class="panel-head"><span class="panel-title">Danh sách sân đang quản lý</span><span class="small-text">${filtered.length} sân</span></div><div class="pitch-grid">${grid}</div>${FOOT}`;
  }
  function bookingModal(pid=''){
    const opts=pitchList.map(p=>[p.id,`${p.name} · ${p.type} người · ${money(pitchRates[p.type])}/giờ (giá demo)`]);
    const fields=selectField('Chọn sân','pitch',opts,pid||1)+field('Ngày sử dụng','date','date',selectedDay,`min="${localDay()}"`)+field('Bắt đầu','start','time','18:00', 'required')+field('Kết thúc','end','time','19:30','required')+field('Tên người đặt / đội bóng','name','text','','required maxlength="100"')+field('Số điện thoại','phone','tel','','required maxlength="20"')+
      selectField('Tỷ lệ cọc dự kiến','rate',[[0,'Không yêu cầu cọc'],[40,'40%'],[50,'50%'],[60,'60%']],50)+`<div class="field"><label>Nguyên tắc</label><p class="field-hint">Lúc đặt sân hệ thống chỉ xác định <b>cọc phải thu</b>. Chỉ khấu trừ sau khi nhân viên đã xác nhận nhận cọc hợp lệ.</p></div>`;
    openModal('Tạo lượt đặt sân',makeForm('formBooking',fields,'Hóa đơn nháp được khởi tạo cùng mã lượt đặt. Hệ thống sẽ chặn lịch trùng sân.'),formBtns('formBooking','Tạo lượt đặt'),true);
  }
  function pitchDetailModal(pid){
    const p=pitchOf(pid),b=state.bookings.filter(b=>b.pitchId===p.id&&b.date===selectedDay);const content=`<p class="modal-description">Lịch sân ${p.name}, ngày ${dayLabel(selectedDay)}. Đơn giá bên dưới là mẫu để thử chức năng.</p><div class="tone-soft">Đơn giá: <b>${money(pitchRates[p.type])}/giờ</b> · Loại ${p.type} người</div><div class="divider"></div>${b.length?b.map(x=>`<div class="kpi-line"><span><b>${x.start}–${x.end}</b> · ${esc(x.name)}<br>${tag(x.status,stages)}</span><span>${btn('Xem hóa đơn','invoice',x.invoiceId,'small')}</span></div>`).join(''):empty('Chưa có lịch trong ngày')}`;
    openModal(`${p.name} · Lịch chi tiết`,content,`${btn('Đóng','modal-close')}${btn('Đặt sân này','booking',pid,'primary')}`);
  }
const bookingActionKeys = new Set(["booking", "pitch-detail", "start", "release", "cancel"]);
function bookingAction(action,id) {
      if(action==='booking'){bookingModal(id);return;}
      if(action==='pitch-detail'){pitchDetailModal(id);return;}
      if(action==='start'){
        const b=getBooking(id);if(!b||b.status!=='booked')throw new Error('Lượt đặt không ở trạng thái chờ nhận sân.');
        if(b.date!==localDay())throw new Error('Demo chỉ hỗ trợ nhận sân đúng ngày hiện tại.');
        if(isLocked(localDay()))throw new Error('Ngày hiện tại đã khóa sổ.');
        b.status='using';log(`Nhận sân ${pitchOf(b.pitchId).name}, khách ${b.name}, lượt ${b.id}`);closeModal();save();toast('Đã nhận sân. Hóa đơn nháp được giữ nguyên.');return;
      }
      if(action==='release'){
        const b=getBooking(id);if(!b||b.status!=='using')throw new Error('Chỉ trả sân cho lượt đang sử dụng.');
        if(isLocked(localDay()))throw new Error('Ngày đã khóa sổ.');
        b.status='completed';const inv=getInvoice(b.invoiceId);if(!inv)throw new Error('Không tìm thấy hóa đơn của lượt đặt.');
        if(due(inv)===0){inv.status='paid';inv.paidAt=new Date().toISOString();log(`Chốt hóa đơn ${inv.id} bằng tiền cọc đã xác minh (không ghi thêm khoản thu)`);}else{inv.status='awaiting';log(`Khách trả ${pitchOf(b.pitchId).name}, chốt hóa đơn ${inv.id}, cần thu ${money(due(inv))}`);}
        closeModal();save();invoiceModal(inv.id);toast('Đã chốt sân và tính dư cọc tự động.');return;
      }
      if(action==='cancel'){
        const b=getBooking(id);if(!b||!['booked','using'].includes(b.status))throw new Error('Chỉ hủy lượt đặt chưa hoàn thành dịch vụ.');
        const inv=getInvoice(b.invoiceId);const amount=paidAmount(inv);
        if(amount===0){
          if(!confirm('Hủy lượt đặt sân chưa thu tiền? Thao tác sẽ được ghi nhật ký.'))return;
          returnProducts(inv);inv.status='cancelled';b.status='cancelled';log(`Hủy lượt đặt ${b.id} và hóa đơn nháp ${inv.id} (chưa thu tiền)`);closeModal();save();toast('Đã hủy lượt đặt và ghi nhật ký.');return;
        }
        if(state.issues.some(x=>x.kind==='refund'&&x.invoiceId===inv.id&&x.status!=='resolved'))throw new Error('Đã có yêu cầu hoàn tiền chưa kết thúc.');
        state.issues.push({id:uid('YC'),kind:'refund',invoiceId:inv.id,amount,note:'',status:'pending',createdAt:new Date().toISOString()});b.status='cancel_review';log(`Tạo yêu cầu hủy/hoàn tiền ${money(amount)} cho ${inv.id}; chờ phê duyệt`);closeModal();save();toast('Đã tạo yêu cầu duyệt hoàn tiền. Chưa tự động hoàn hoặc hủy hóa đơn.');return;
      }
}

const bookingFormKeys = new Set(["formBooking"]);
function bookingForm(form,data) {
      if(form.id==='formBooking'){
        const pitch=pitchOf(data.pitch),pTime=timeMins(data.start),eTime=timeMins(data.end),day=data.date;
        if(!pitch||!data.name.trim()||!data.phone.trim()||!day)throw new Error('Vui lòng điền đầy đủ thông tin.');
        if(day<localDay())throw new Error('Không nhận đặt sân cho ngày đã qua.');
        if(isLocked(day))throw new Error('Ngày đặt đã bị khóa sổ.');
        if(!Number.isFinite(pTime)||!Number.isFinite(eTime)||pTime>=eTime)throw new Error('Giờ kết thúc phải sau giờ bắt đầu.');
        if(state.bookings.some(b=>b.pitchId===pitch.id&&b.date===day&&b.status!=='cancelled'&&pTime<timeMins(b.end)&&eTime>timeMins(b.start)))throw new Error('Sân đã có lịch trùng thời gian này. Vui lòng chọn khung giờ khác.');
        const id=uid('DS').toUpperCase(),invId=uid('HD').toUpperCase(),rate=Number(data.rate);
        const cost=(eTime-pTime)/60*pitchRates[pitch.type];
        state.bookings.push({id,pitchId:pitch.id,name:data.name.trim(),phone:data.phone.trim(),date:day,start:data.start,end:data.end,status:'booked',invoiceId:invId,depositRate:rate});
        state.invoices.push({id:invId,bookingId:id,customer:data.name.trim(),items:[{id:uid('LINE'),name:`Thuê ${pitch.name} · ${data.start}–${data.end}`,qty:1,unitPrice:cost}],status:'draft',createdAt:new Date().toISOString()});
        log(`Tạo lượt đặt ${id} · ${pitch.name} · ${money(cost)}; hóa đơn nháp ${invId}`);
        selectedDay=day;closeModal();save();navigate('lich-san');toast('Đã đặt sân và tạo hóa đơn nháp. Tiền cọc chưa được ghi là đã thu.');return;
      }
}

