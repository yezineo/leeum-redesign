/* ===== 메인 히어로 슬라이드 ===== */
const hero = document.querySelector('.hero');

if (hero && hero.querySelector('.hero__track')) {
  const track = hero.querySelector('.hero__track');
  const slides = [...hero.querySelectorAll('.hero__slide')];
  const dots = [...hero.querySelectorAll('.hero__dot')];
  const ctrl = hero.querySelector('.hero__ctrl');
  const playBtn = hero.querySelector('.hero__play');
  const iconPause = playBtn.querySelector('.hero__icon-pause');
  const iconPlay = playBtn.querySelector('.hero__icon-play');
  const header = document.querySelector('.header--white');

  const DELAY = 5000;                                   // 5초마다 넘김
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  let timer = null;
  let userPaused = reduce;      // 움직임 줄이기 사용자는 처음부터 멈춘 상태
  let tempPaused = false;       // 읽는 중(마우스 올림·키보드 포커스) 잠시 멈춤

  // n번째 장으로 이동
  function goTo(n) {
    index = (n + slides.length) % slides.length;        // 끝에서 다음 → 처음으로
    track.style.transform = `translateX(${-index * 100}%)`;

    slides.forEach((slide, i) => {
      const on = i === index;
      slide.inert = !on;                                 // 안 보이는 장의 링크는 Tab으로 못 가게
      slide.setAttribute('aria-hidden', String(!on));
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === index);
      dot.setAttribute('aria-current', String(i === index));
    });

    // 밝은 이미지면 헤더 · 컨트롤을 검정 버전으로
    hero.dataset.theme = slides[index].dataset.theme;
    if (header) header.classList.toggle('is-light', hero.dataset.theme === 'light');
  }

  // 자동재생
  function stop() { clearInterval(timer); timer = null; }
  function start() {
    stop();
    if (userPaused || tempPaused) return;
    timer = setInterval(() => goTo(index + 1), DELAY);
  }
  function setPaused(paused) {
    userPaused = paused;
    iconPause.hidden = paused;
    iconPlay.hidden = !paused;
    playBtn.setAttribute('aria-label', paused ? '자동 재생 시작' : '자동 재생 멈춤');
    start();
  }

  // 점 클릭 / 일시정지 버튼
  dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); start(); }));
  playBtn.addEventListener('click', () => setPaused(!userPaused));

  // 점에서 ← → 키로 이동
  ctrl.addEventListener('keydown', e => {
    if (!e.target.classList.contains('hero__dot')) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    goTo(index + (e.key === 'ArrowRight' ? 1 : -1));
    dots[index].focus();
    start();
  });

  // 카드·컨트롤 위에 마우스가 있으면 잠시 멈춤 (읽는 중)
  hero.querySelectorAll('.hero__card, .hero__ctrl').forEach(el => {
    el.addEventListener('mouseenter', () => { tempPaused = true; stop(); });
    el.addEventListener('mouseleave', () => { tempPaused = false; start(); });
  });
  // 키보드로 히어로 안에 들어오면 잠시 멈춤
  hero.addEventListener('focusin', () => { tempPaused = true; stop(); });
  hero.addEventListener('focusout', e => {
    if (!hero.contains(e.relatedTarget)) { tempPaused = false; start(); }
  });

  // 끌어서 넘기기 (마우스 · 터치)
  let startX = 0;
  let moved = 0;
  let dragging = false;

  track.addEventListener('pointerdown', e => {
    if (e.target.closest('a, button, .hero__card')) return;   // 카드·버튼 위에선 끌기 X
    dragging = true;
    startX = e.clientX;
    moved = 0;
    hero.classList.add('is-dragging');
    track.setPointerCapture(e.pointerId);
    stop();
  });
  track.addEventListener('pointermove', e => {
    if (!dragging) return;
    moved = e.clientX - startX;
    track.style.transform = `translateX(calc(${-index * 100}% + ${moved}px))`;
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    hero.classList.remove('is-dragging');
    if (Math.abs(moved) > 80) goTo(index + (moved < 0 ? 1 : -1));   // 80px 넘게 끌면 넘김
    else goTo(index);                                               // 아니면 제자리
    start();
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  // 모바일: 손가락으로 누르고 있는 동안 멈춤
  hero.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    tempPaused = true;
    stop();
  });
  ['pointerup', 'pointercancel'].forEach(type => {
    hero.addEventListener(type, e => {
      if (e.pointerType !== 'touch') return;
      tempPaused = false;
      start();
    });
  });

  goTo(0);
  setPaused(userPaused);
}