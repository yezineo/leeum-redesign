const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 767px)');

/* ===== 1. 헤더: 스크롤하면 흰 배경 (메인) ===== */
const header = document.querySelector('.header--white');
if (header) {
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 0);
  window.addEventListener('scroll', onScroll);
  onScroll();
}

/* ===== 2. top 버튼 ===== */
const topBtn = document.querySelector('.floating__top');
if (topBtn) {
  // 300px 이상 내려오면 나타남
  const toggleTop = () => topBtn.classList.toggle('is-hidden', window.scrollY < 300);
  window.addEventListener('scroll', toggleTop, { passive: true });
  toggleTop();

  topBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });
}

/* ===== 3. 챗봇 패널 ===== */
const chatbot = document.getElementById('chatbot');
const chatBtn = document.querySelector('.floating__chat');

if (chatbot && chatBtn) {
  const views = chatbot.querySelectorAll('.chatbot__view');
  const tabBar = chatbot.querySelector('.chatbot__tab');
  const tabBtns = chatbot.querySelectorAll('.chatbot__tab-btn');
  const iconOpen = chatBtn.querySelector('.floating__chat-open');
  const iconClose = chatBtn.querySelector('.floating__chat-close');
  const panelClose = chatbot.querySelector('.chatbot__close');   // 모바일 ✕
  let lastTab = 'home';                       // 대화 화면에서 뒤로가기 할 곳

  // 화면 바꾸기: 'home' | 'list' | 'chat'
  function showView(name) {
    views.forEach(v => { v.hidden = !v.classList.contains('chatbot__view--' + name); });
    tabBar.hidden = (name === 'chat');        // 대화 화면에서는 탭바 대신 입력창
    chatbot.dataset.view = name;              // 모바일 ✕ 색 바꾸는 기준

    if (name !== 'chat') {
      lastTab = name;
      tabBtns.forEach(btn => {
        const on = btn.dataset.view === name;
        const img = btn.querySelector('img');
        btn.classList.toggle('is-active', on);
        img.src = on ? img.dataset.on : img.dataset.off;
      });
    }
  }
  
  window.chatbotShowView = showView;          // chatbot.js에서 대화 목록 → 대화 화면 열 때 사용

  // PC: 챗봇 버튼을 화면 맨 아래(bottom 25)까지 내리는 거리 계산
  function moveChatBtn() {
    if (isMobile.matches) {                   // 모바일은 패널이 전체 화면이라 버튼을 숨김
      chatBtn.style.transform = '';
      return;
    }
    const groupTop = chatBtn.offsetParent.getBoundingClientRect().top;
    const btnBottom = groupTop + chatBtn.offsetTop + chatBtn.offsetHeight;
    const distance = window.innerHeight - 25 - btnBottom;
    chatBtn.style.transform = `translateY(${distance}px)`;
  }

  function openChat() {
    chatbot.classList.add('is-open');
    document.body.classList.add('is-chat-open');
    iconOpen.hidden = true;
    iconClose.hidden = false;
    chatBtn.setAttribute('aria-expanded', 'true');
    chatBtn.setAttribute('aria-label', '챗봇 닫기');
    moveChatBtn();
    if (isMobile.matches && panelClose) panelClose.focus();   // 모바일: 포커스를 패널 안으로
  }

  function closeChat() {
    chatbot.classList.remove('is-open');
    document.body.classList.remove('is-chat-open');
    iconOpen.hidden = false;
    iconClose.hidden = true;
    chatBtn.setAttribute('aria-expanded', 'false');
    chatBtn.setAttribute('aria-label', '챗봇 열기');
    chatBtn.style.transform = '';             // 원래 자리로
  }

  const isOpen = () => chatbot.classList.contains('is-open');

  chatBtn.addEventListener('click', () => (isOpen() ? closeChat() : openChat()));

  // 모바일 ✕
  if (panelClose) {
    panelClose.addEventListener('click', () => {
      closeChat();
      chatBtn.focus();
    });
  }

  tabBtns.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));

  chatbot.querySelectorAll('.chatbot__ask, .chat-item').forEach(btn =>
    btn.addEventListener('click', () => showView('chat'))
  );

  chatbot.querySelector('.chat__back').addEventListener('click', () => showView(lastTab));

  // ESC로 닫기 + 포커스를 챗봇 버튼으로 돌려줌
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && isOpen()) {
      closeChat();
      chatBtn.focus();
    }
  });

  // 창 크기가 바뀌면 버튼 위치 다시 계산
  window.addEventListener('resize', () => { if (isOpen()) moveChatBtn(); });

  // 확인용 주소(/chatbot 등)로 열린 채 시작한 경우
  if (isOpen()) openChat();
}

/* ===== 모바일 햄버거 메뉴 ===== */
const mMenu = document.getElementById('m-menu');
const menuBtn = document.querySelector('.header__menu-btn');

if (mMenu && menuBtn) {
  const menuClose = mMenu.querySelector('.m-menu__close');

  function openMenu() {
    mMenu.hidden = false;
    document.body.classList.add('is-menu-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    menuClose.focus();
  }
  function closeMenu() {
    mMenu.hidden = true;
    document.body.classList.remove('is-menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.focus();
  }

  menuBtn.addEventListener('click', openMenu);
  menuClose.addEventListener('click', closeMenu);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !mMenu.hidden) closeMenu();
  });
  // 화면이 PC 크기로 넓어지면 자동으로 닫기
  window.matchMedia('(min-width: 1280px)').addEventListener('change', e => {
    if (e.matches && !mMenu.hidden) closeMenu();
  });
}