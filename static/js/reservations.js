/* ===== 예약 내역 탭 (다가오는 / 지난) ===== */
const tabs = [...document.querySelectorAll('.history__tab')];

if (tabs.length) {
  function select(tab, focus) {
    tabs.forEach(t => {
      const on = t === tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;                       // Tab 키는 선택된 탭에만 멈춤
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    // ← → 키로 탭 이동
    tab.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      select(tabs[n], true);
    });
  });
}