/* PitchPro modular frontend. Load scripts in the order specified by index.html. */
'use strict';

  const KEY = 'pitchpro_tobe_v1';
  const $ = (id) => document.getElementById(id);
  const money = (n) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(n) || 0)) + ' ₫';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
  const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const addDay = (day, d) => { const a = new Date(`${day}T12:00:00`);a.setDate(a.getDate()+d);return localDay(a); };
  const dayLabel = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('vi-VN', {weekday:'short',day:'2-digit',month:'2-digit'});
  const timeMins = (s) => {const [h,m] = String(s).split(':').map(Number);return h*60+m;};
  const niceTime = (s) => new Date(s).toLocaleString('vi-VN',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  const toDateTime = (day,hour) => new Date(`${day}T${hour}:00`).toISOString();
  const pitchRates = {'5':200000,'7':300000}; // MỨC GIÁ GIẢ ĐỊNH của bản demo; không có trong tài liệu nhóm.
  const pitchList = Array.from({length:8}, (_,i)=>({id:i+1,name:`Sân ${String(i+1).padStart(2,'0')}`,type:i<5?'5':'7'}));
  const types = {draft:['Nháp','grey'],awaiting:['Chờ thanh toán','amber'],qr_pending:['Chờ đối soát QR','blue'],paid:['Đã thanh toán','green'],cancelled:['Đã hủy','red']};
  const stages = {booked:['Đã đặt','blue'],using:['Đang sử dụng','green'],completed:['Đã trả sân','grey'],cancel_review:['Chờ duyệt hủy','amber'],cancelled:['Đã hủy','red']};
  const issueStages = {pending:['Cần xử lý','amber'],approved:['Đã phê duyệt','blue'],resolved:['Đã xử lý','green']};
  const store = (data) => { try {localStorage.setItem(KEY, JSON.stringify(data));} catch(e) {toast('Không thể ghi localStorage trong trình duyệt này.',true);} };
  function freshData() {
    const today=localDay(), yesterday=addDay(today,-1);
    const a={version:1, bookings:[], invoices:[], receipts:[], products:[
      {id:'p1',name:'Nước suối 500ml',price:10000,stock:48,unit:'chai'},
      {id:'p2',name:'Nước tăng lực',price:15000,stock:32,unit:'lon'},
      {id:'p3',name:'Bóng đá',price:120000,stock:9,unit:'quả'},
      {id:'p4',name:'Băng quấn',price:20000,stock:22,unit:'cuộn'}
    ], recons:[], issues:[], audits:[]};
    function add(id,pitchId,name,date,start,end,status,depositRate=0){
      const p=pitchList.find(p=>p.id===pitchId), cost=(timeMins(end)-timeMins(start))/60*pitchRates[p.type], invId=`HD-${id}`;
      a.bookings.push({id,pitchId,name,phone:'0900000000',date,start,end,status,invoiceId:invId,depositRate});
      a.invoices.push({id:invId,bookingId:id,customer:name,items:[{id:`line-${id}`,name:`Thuê ${p.name} · ${start}–${end}`,qty:1,unitPrice:cost}],status:status==='completed'?'paid':status==='using'?'draft':'draft',createdAt:toDateTime(date,'08:00')});
      return invId;
    }
    add('DS-101',1,'Minh Anh FC',today,'17:00','18:30','using');
    add('DS-102',2,'Tài FC',today,'19:00','20:30','booked',50);
    const inv3=add('DS-103',6,'Cường FC',today,'16:30','18:00','using',40);
    const inv4=add('DS-098',3,'Đội Sông Hàn',yesterday,'18:00','19:30','completed');
    const inv5=add('DS-099',7,'Đội Đại Phát',yesterday,'19:30','21:00','completed');
    a.receipts.push({id:'THU-M01',invoiceId:inv3,type:'deposit',method:'cash',amount:100000,reference:'TM-COC-103',verified:'manual',createdAt:toDateTime(today,'15:00')});
    a.receipts.push({id:'THU-M02',invoiceId:inv4,type:'settlement',method:'cash',amount:300000,reference:'TM-098',verified:'manual',createdAt:toDateTime(yesterday,'19:45')});
    a.receipts.push({id:'THU-M03',invoiceId:inv5,type:'settlement',method:'bank',amount:450000,reference:'DEMO-NH-099',verified:'manual',createdAt:toDateTime(yesterday,'21:10')});
    a.audits.push({id:uid('LOG'),createdAt:new Date().toISOString(),actor:'Hệ thống demo',message:'Khởi tạo dữ liệu minh họa (không phải giao dịch thật)'});
    return a;
  }
  let state;
  try {state=JSON.parse(localStorage.getItem(KEY) || 'null'); if(!state || state.version!==1 || !Array.isArray(state.bookings))state=freshData();}
  catch{state=freshData();}
  let page='tong-quan', selectedDay=localDay(), pitchFilter='all', billFilter='open', role='staff', reconDay=localDay();
  const getInvoice = (id)=>state.invoices.find(i=>i.id===id);
  const getBooking = (id)=>state.bookings.find(b=>b.id===id);
  const getProduct = (id)=>state.products.find(p=>p.id===id);
  const pitchOf = (id)=>pitchList.find(p=>p.id===Number(id));
  const invoiceTotal = inv => inv.items.reduce((s,x)=>s+(x.qty*x.unitPrice),0);
  const receiptsFor = inv => state.receipts.filter(r=>r.invoiceId===inv.id);
  const paidAmount = inv => receiptsFor(inv).reduce((s,r)=>s+r.amount,0);
  const depositAmount = inv => receiptsFor(inv).filter(x=>x.type==='deposit').reduce((s,r)=>s+r.amount,0);
  const rentalTotal = inv => inv.items.filter(x=>!x.productId).reduce((s,x)=>s+x.qty*x.unitPrice,0);
  const due = inv => Math.max(0,invoiceTotal(inv)-paidAmount(inv));
  const dayReceipts = day => state.receipts.filter(r=>localDay(new Date(r.createdAt))===day);
  const totalsForDay=day => {const r=dayReceipts(day);return {cash:r.filter(x=>x.method==='cash').reduce((s,x)=>s+x.amount,0),bank:r.filter(x=>x.method==='bank').reduce((s,x)=>s+x.amount,0),count:r.length};};
  const daysBookings = day => state.bookings.filter(b=>b.date===day && b.status!=='cancelled');
  const countOpen = () => state.invoices.filter(i=>['draft','awaiting','qr_pending'].includes(i.status)).length;
  const unresolvedIssues = () => state.issues.filter(i=>i.status!=='resolved').length;
  const isLocked = day => state.recons.some(r=>r.day===day && r.status==='locked');
  const roleName = () => role==='manager'?'Quản lý (demo)':'Nhân viên (demo)';
  function log(message){state.audits.unshift({id:uid('LOG'),createdAt:new Date().toISOString(),actor:roleName(),message});state.audits=state.audits.slice(0,200);}
  function save(){store(state);render();}
  function toast(s,error=false){const root=$('toastRoot');if(!root)return;root.innerHTML=`<div class="toast ${error?'error':''}">${esc(s)}</div>`;setTimeout(()=>{if(root)root.innerHTML='';},3700);}
  function tag(status,dict=types){const [label,tone]=dict[status]||[status,'grey'];return `<span class="tag ${tone}">${esc(label)}</span>`;}
  function btn(text,action,id,klass=''){return `<button type="button" class="btn ${klass}" data-action="${esc(action)}" data-id="${esc(id||'')}">${text}</button>`;}
  function heading(eyebrow,title,subtitle,actions=''){return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${subtitle}</p></div><div class="heading-actions">${actions}</div></div>`;}
  function empty(msg='Chưa có dữ liệu'){return `<div class="empty-state"><span class="empty-illustration">◌</span>${esc(msg)}</div>`;}
  function stat(label,value,foot,ico,tone=''){return `<div class="stat-card"><span class="stat-icon ${tone}">${ico}</span><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-foot">${foot}</div></div>`;}
  function recent(limit=5){return state.audits.slice(0,limit).map(x=>`<div class="activity-item"><span class="activity-symbol">✓</span><div><strong>${esc(x.message)}</strong><p>${esc(x.actor)} · ${niceTime(x.createdAt)}</p></div></div>`).join('')||empty();}
  const FOOT='<p class="page-footer">Mẫu thử FE · Dữ liệu lưu cục bộ trên trình duyệt, không kết nối máy chủ hoặc ngân hàng · Giá sân và tồn kho là dữ liệu giả định phục vụ trình diễn.</p>';
