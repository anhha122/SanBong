/* PitchPro modular frontend. Load scripts in the order specified by index.html. */
'use strict';

const commonActionKeys = new Set(["goto", "modal-close", "day", "pitch-filter", "bill-filter", "export", "reset"]);
function commonAction(action,id) {
      if(action==='goto'){closeModal();navigate(id);return;}
      if(action==='modal-close'){closeModal();return;}
      if(action==='day'){selectedDay=id;render();return;}
      if(action==='pitch-filter'){pitchFilter=id;render();return;}
      if(action==='bill-filter'){billFilter=id;render();return;}
      if(action==='export'){downloadCSV(id);return;}
      if(action==='reset'){if(!confirm('Khôi phục dữ liệu demo ban đầu? Mọi thao tác bạn đã làm ở bản này sẽ bị xóa khỏi localStorage.'))return;state=freshData();store(state);closeModal();render();toast('Đã khôi phục dữ liệu demo.');return;}
}

function processAction(action,id) {
  guarded(() => {
    if (commonActionKeys.has(action)) return commonAction(action,id);
    if (bookingActionKeys.has(action)) return bookingAction(action,id);
    if (salesActionKeys.has(action)) return salesAction(action,id);
    if (paymentActionKeys.has(action)) return paymentAction(action,id);
    if (reconActionKeys.has(action)) return reconAction(action,id);
    if (exceptionActionKeys.has(action)) return exceptionAction(action,id);
    throw new Error('Không hỗ trợ thao tác: '+action);
  });
}
function processForm(form) {
  guarded(() => {
    if (!form.reportValidity()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    if (bookingFormKeys.has(form.id)) return bookingForm(form,data);
    if (salesFormKeys.has(form.id)) return salesForm(form,data);
    if (paymentFormKeys.has(form.id)) return paymentForm(form,data);
    if (reconFormKeys.has(form.id)) return reconForm(form,data);
    if (exceptionFormKeys.has(form.id)) return exceptionForm(form,data);
    throw new Error('Không hỗ trợ form: '+form.id);
  });
}
  document.addEventListener('click',(event)=>{
    const btn=event.target.closest('[data-action]');if(btn){event.preventDefault();processAction(btn.dataset.action,btn.dataset.id||'');}
    if(event.target.id==='backdrop')closeModal();
  });
  document.addEventListener('submit',(event)=>{if(event.target.matches('#modalRoot form')){event.preventDefault();processForm(event.target);}});
  document.addEventListener('change',(event)=>{if(event.target.id==='scheduleDate'){selectedDay=event.target.value;render();}if(event.target.id==='reconDate'){reconDay=event.target.value;render();}});
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&$('modalRoot').innerHTML)closeModal();});
  $('roleSelect').addEventListener('change',e=>{role=e.target.value;toast(`Đã chuyển vai trò giao diện sang ${roleName()}. Đây không phải xác thực người dùng.`);render();});
  $('mobileMenu').addEventListener('click',()=>$('sidebar').classList.toggle('open'));
  window.addEventListener('hashchange',render);
  render();
