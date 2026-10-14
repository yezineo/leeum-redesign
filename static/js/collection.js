/* ===== 메인 소장품 (모바일: 가운데 카드 강조 + 점) ===== */
const colList = document.querySelector('.collection-list');
const colDots = document.querySelector('.collection-dots');

if (colList && colDots) {
  const cards = [...colList.children];
  cards.forEach(() => colDots.appendChild(document.createElement('span')));   // 카드 수만큼 점
  const dots = [...colDots.children];

  // 화면 가운데에 가장 가까운 카드 찾기
  function update() {
    const center = colList.scrollLeft + colList.clientWidth / 2;
    let current = 0;
    let min = Infinity;
    cards.forEach((card, i) => {
      const d = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
      if (d < min) { min = d; current = i; }
    });
    cards.forEach((c, i) => c.classList.toggle('is-current', i === current));
    dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
  }

  colList.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}