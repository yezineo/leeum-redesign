/* ===== 모달 (11 예약 완료) ===== */
const modal = document.querySelector('.modal');

if (modal) {
  const dim = document.querySelector('.dim');
  const focusables = [...modal.querySelectorAll('a[href], button')];
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  function closeModal(e) {
    if (e) e.preventDefault();               // 새로고침 없이 그 자리에서 닫기
    modal.hidden = true;
    if (dim) dim.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onKey);
    // 주소를 상세 페이지로 바꿔 둠 → 새로고침해도 모달이 다시 안 뜸
    if (modal.dataset.after) history.replaceState(null, '', modal.dataset.after);
    const back = document.getElementById(modal.dataset.return);
    if (back) back.focus();                  // 닫은 뒤 포커스는 페이지 제목으로
  }

  function onKey(e) {
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key !== 'Tab') return;
    // Tab이 모달 밖으로 나가지 않게
    if (!modal.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  modal.querySelectorAll('.modal__close, .modal__btn').forEach(el => el.addEventListener('click', closeModal));
  if (dim) dim.addEventListener('click', closeModal);   // 바깥 어두운 곳 클릭해도 닫힘
  document.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';              // 모달 뒤 화면 스크롤 막기
  modal.querySelector('.modal__btn').focus();
}