/* ===== 예약 (09 · 09-1) ===== */
const form = document.querySelector('.reserve__form');

if (form) {
  const fields = {
    date: form.querySelector('input[name="date"]'),
    time: form.querySelector('input[name="time"]'),
    count: form.querySelector('input[name="count"]'),
  };
  const cal = form.querySelector('.cal');
  const grids = [...cal.querySelectorAll('.cal__grid')];    // 이번 달 (+ 다음 달)
  const monthLabel = cal.querySelector('.cal__label');
  const monthPrev = cal.querySelector('.cal__prev');
  const monthNext = cal.querySelector('.cal__next');
  const timeBox = form.querySelector('.time');
  const peopleBox = form.querySelector('.people__btns');
  const dateStep = cal.closest('.step');
  const timeStep = timeBox.closest('.step');
  const peopleStep = peopleBox.closest('.step');
  const nextBtn = form.querySelector('.btn-next');
  const ticketDate = document.getElementById('ticket-date');
  const ticketCount = document.getElementById('ticket-count');

  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  const pad = n => String(n).padStart(2, '0');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.matchMedia('(max-width: 767px)');   // 모바일: 선택 끝난 영역 접기

  // 같은 묶음 안에서 하나만 선택
  function selectOne(box, btn) {
    box.querySelectorAll('.is-selected').forEach(b => {
      b.classList.remove('is-selected');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('is-selected');
    btn.setAttribute('aria-pressed', 'true');
  }

  // 달 넘기기: 이전달 / 다음달
  let current = Math.max(0, grids.findIndex(g => g.querySelector('.is-selected')));
  function showMonth(i) {
    current = i;
    grids.forEach((g, idx) => { g.hidden = idx !== i; });
    monthLabel.textContent = grids[i].dataset.label;
    monthPrev.disabled = i === 0;
    monthNext.disabled = i === grids.length - 1;
  }
  monthPrev.addEventListener('click', () => showMonth(current - 1));
  monthNext.addEventListener('click', () => showMonth(current + 1));

  // 단계 펼치기 / 접기
  function setOpen(step, open) {
    const body = step.querySelector('.step__body');
    const toggle = step.querySelector('.step__toggle');
    body.hidden = !open;
    step.classList.toggle('is-collapsed', !open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  // 모바일이면 고른 영역을 잠깐 보여준 뒤 접기
  function collapseOnMobile(step) {
    if (!mobile.matches) return;
    setTimeout(() => setOpen(step, false), 200);
  }

  // 다음 단계 열기 + 처음 열릴 때만 그 위치로 스크롤
  function openStep(step) {
    const toggle = step.querySelector('.step__toggle');
    const arrow = step.querySelector('.step__arrow');
    const firstTime = toggle.disabled;      // 아직 잠겨 있었다면 처음 열리는 것
    if (!firstTime && !step.querySelector('.step__body').hidden) return;

    toggle.disabled = false;
    arrow.src = arrow.dataset.on;
    setOpen(step, true);

    if (firstTime) {
      setTimeout(() => {
        step.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }, 250);                              // 선택된 것을 잠깐 보여준 뒤 이동 (모바일은 접힌 뒤)
    }
  }

  // AI 예상 혼잡도: 고른 날짜의 회차별 여유/보통/혼잡 표시
  const crowdEl = document.getElementById('crowd-data');
  const crowd = crowdEl ? JSON.parse(crowdEl.textContent) : {};
  function showCrowd(date) {
    const day = crowd[date];
    timeBox.querySelectorAll('.slot').forEach(btn => {
      const level = day ? day[btn.dataset.time] : '';
      btn.querySelector('.slot__state').textContent = level || '예약 가능';
      btn.dataset.level = level || '';
    });
  }

  // 위(모바일)·왼쪽(PC) 카드 + 다음 버튼 갱신
  function update() {
    const dateVal = fields.date.value;      // 예: 2026-10-20
    const count = Number(fields.count.value);

    if (dateVal) {
      const [y, m, d] = dateVal.split('-').map(Number);
      const week = WEEK[new Date(y, m - 1, d).getDay()];
      ticketDate.textContent = `${pad(m)}월 ${pad(d)}일(${week}) ${fields.time.value}`;
    }
    ticketCount.textContent = count ? `성인 ${count}` : '';

    nextBtn.disabled = !(dateVal && fields.time.value && count > 0);
  }

  // 제목 누르면 접기/펼치기 (잠긴 단계는 disabled라 반응 없음)
  form.querySelectorAll('.step__toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const step = toggle.closest('.step');
      setOpen(step, step.querySelector('.step__body').hidden);
    });
  });

  // 1. 날짜 → (모바일: 날짜 접기) → 시간 열기
  cal.addEventListener('click', e => {
    const btn = e.target.closest('button[data-date]');
    if (!btn) return;
    selectOne(cal, btn);
    fields.date.value = btn.dataset.date;
    showCrowd(btn.dataset.date);
    collapseOnMobile(dateStep);
    openStep(timeStep);
    update();
  });

  // 2. 시간 → (모바일: 시간 접기) → 인원 열기
  timeBox.addEventListener('click', e => {
    const btn = e.target.closest('.slot');
    if (!btn) return;
    selectOne(timeBox, btn);
    fields.time.value = btn.dataset.time;
    collapseOnMobile(timeStep);
    openStep(peopleStep);
    update();
  });

  // 3. 인원
  peopleBox.addEventListener('click', e => {
    const btn = e.target.closest('button[data-count]');
    if (!btn) return;
    selectOne(peopleBox, btn);
    fields.count.value = btn.dataset.count;
    update();
  });

  // 모바일: 10에서 돌아왔을 때 이미 고른 단계는 접어 두기
  if (mobile.matches) {
    if (fields.date.value) setOpen(dateStep, false);
    if (fields.time.value) setOpen(timeStep, false);
  }

  if (fields.date.value) showCrowd(fields.date.value);   // 10에서 돌아온 경우
  showMonth(current);
  update();
}