/* PitchPro modular frontend. Load scripts in the order specified by index.html. */
'use strict';

  function renderInventory(){
    return heading('QUY TRÌNH 01 · SUB-PROCESS','Kho hàng & sản phẩm','Kiểm tra tồn kho trước khi bổ sung sản phẩm vào hóa đơn. Cập nhật tồn kho và hóa đơn đồng thời trong bản demo.',btn('+ Bán sản phẩm','sale','','primary'))+
    `<div class="alert warn">Theo thiết kế To-Be, việc trừ kho phải được thực hiện bằng giao dịch cơ sở dữ liệu nguyên tử và có khóa chống bán quá tồn. Phiên bản này chỉ mô phỏng trong localStorage; khi triển khai thật cần xử lý ở backend.</div>`+
    `<section class="surface"><div class="panel-head"><div class="panel-title">Danh mục vật phẩm</div>${btn('Nhập thêm tồn kho','restock','','small')}</div><div class="table-wrap"><table><thead><tr><th>Sản phẩm</th><th>Đơn vị</th><th>Giá bán mẫu</th><th>Tồn khả dụng</th><th>Trạng thái</th><th></th></tr></thead><tbody>${state.products.map(p=>`<tr><td class="strong">${esc(p.name)}</td><td>${esc(p.unit)}</td><td>${money(p.price)}</td><td><strong>${p.stock}</strong></td><td>${tag(p.stock===0?'Hết hàng':p.stock<=10?'Sắp hết':'Còn hàng',{'Hết hàng':['Hết hàng','red'],'Sắp hết':['Sắp hết','amber'],'Còn hàng':['Còn hàng','green']})}</td><td>${btn('Bán sản phẩm','sale',p.id,'small soft')}</td></tr>`).join('')}</tbody></table></div></section>${FOOT}`;
  }
  function saleModal(id=''){
    let targetId=id.startsWith('target:')?id.slice(7):'';
    const open=state.invoices.filter(i=>i.status==='draft'||(i.status==='awaiting'&&!i.bookingId));
    const options=[['retail','Khách lẻ · tạo hóa đơn mới'],...open.map(i=>[i.id,`${i.id} · ${i.customer}`])];
    const items=state.products.map(p=>[p.id,`${p.name} · ${money(p.price)} · tồn ${p.stock}`]);
    const fields=selectField('Sản phẩm','product',items,id.startsWith('target:')?'':id)+field('Số lượng','qty','number',1,'required min="1" step="1"')+selectField('Gộp vào hóa đơn','invoice',options,targetId||'retail');
    openModal('Bán sản phẩm / thêm dịch vụ',makeForm('formSale',fields,'Bản demo kiểm tra tồn kho trước khi thêm và lưu thay đổi cùng hóa đơn. Cần backend transaction khi chạy nhiều máy.'),formBtns('formSale','Xác nhận bán'));
  }
  function restockModal(){
    const fields=selectField('Chọn sản phẩm','product',state.products.map(p=>[p.id,`${p.name} · tồn ${p.stock}`]))+field('Số lượng nhập thêm','qty','number',10,'required min="1" step="1"')+field('Mã phiếu nhập / nguồn hàng','ref','text','','required');
    openModal('Nhập thêm tồn kho (demo)',makeForm('formRestock',fields),formBtns('formRestock','Cập nhật tồn kho'));
  }
const salesActionKeys = new Set(["sale", "restock"]);
function salesAction(action,id) {
      if(action==='sale'){saleModal(id);return;}
      if(action==='restock'){restockModal();return;}
}

const salesFormKeys = new Set(["formSale", "formRestock"]);
function salesForm(form,data) {
      if(form.id==='formSale'){
        const p=getProduct(data.product),qty=Number(data.qty);
        if(!p||!Number.isInteger(qty)||qty<1)throw new Error('Số lượng phải là số nguyên dương.');
        if(qty>p.stock)throw new Error(`Không đủ tồn kho ${p.name}. Hiện có ${p.stock} ${p.unit}.`);
        if(isLocked(localDay()))throw new Error('Ngày hôm nay đã khóa sổ. Không thể ghi giao dịch mới.');
        let inv;
        if(data.invoice==='retail'){
          inv={id:uid('HD').toUpperCase(),bookingId:null,customer:'Khách lẻ',items:[],status:'awaiting',createdAt:new Date().toISOString()};state.invoices.push(inv);
        }else{inv=getInvoice(data.invoice);if(!inv||!(inv.status==='draft'||(inv.status==='awaiting'&&!inv.bookingId)))throw new Error('Hóa đơn sân đã chốt, không thể thêm sản phẩm.');}
        p.stock-=qty;inv.items.push({id:uid('LINE'),productId:p.id,name:p.name,qty,unitPrice:p.price});
        log(`Thêm ${qty} ${p.unit} ${p.name} vào ${inv.id}, tồn còn ${p.stock}`);closeModal();save();invoiceModal(inv.id);toast('Đã thêm sản phẩm vào hóa đơn và giảm tồn kho demo.');return;
      }
      if(form.id==='formRestock'){
        const p=getProduct(data.product),qty=Number(data.qty);if(!p||!Number.isInteger(qty)||qty<1||!data.ref.trim())throw new Error('Thông tin nhập kho không hợp lệ.');
        p.stock+=qty;log(`Nhập kho ${qty} ${p.unit} ${p.name}, phiếu ${data.ref.trim()}`);closeModal();save();toast('Đã cập nhật tồn kho.');return;
      }
}

