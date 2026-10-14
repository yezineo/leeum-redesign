/* ===== 챗봇 대화: 빠른 질문 = 정해진 답 / 직접 입력 = AI 답변 / 대화 여러 개 보관 ===== */
const chatLog = document.querySelector('.chat__log');
const chatForm = document.querySelector('.chat__form');

if (chatLog && chatForm) {
  const input = chatForm.querySelector('.chat__input');
  const sendBtn = chatForm.querySelector('.chat__send');
  let busy = false;            // AI 답변 기다리는 중이면 true

  // 15-1 대화 목록
  const STORE = 'leeum-chats';
  const MAX_CONVS = 20;
  const listBox = document.querySelector('.chat-list');
  const itemTpl = document.getElementById('chat-item-tpl');
  const listEmpty = document.querySelector('.chatbot__empty');
  const newBtn = document.querySelector('.chatbot__start .chatbot__ask');     // 대화 탭 버튼
  const homeAsk = document.querySelector('.chatbot__card .chatbot__ask');     // 홈 [문의하기]

  // 대화 = { id, saved: 말풍선 기록, history: AI용 기록, updated: 마지막 시각 }
  let convs = [];
  let cur = null;              // 지금 보고 있는 대화

  // 처음 화면에 있던 것(인사 말풍선 + 빠른 질문)은 대화를 바꿔도 남겨둠
  const initialNodes = [...chatLog.children];

  // 빠른 질문 답변 (확인된 정보만, 모르는 건 문의 안내)
  const FAQ = {
    '운영시간': { text: '운영시간은 10:00 - 18:00입니다.\n매주 월요일은 휴관합니다.' },
    '입장료':   { text: '입장료는 현장에서 결제합니다.\n전시별 관람료는 대표전화(02-2014-6900)로 문의해 주세요.' },
    '주차':     { text: '주차장이 협소하여 만차 시 주차가 불가합니다.\n가급적 대중교통을 이용해 주세요.',
                  link: { label: '오시는 길 보기', href: '#' } },
    '위치':     { text: '04348\n서울특별시 용산구 이태원로55길 60-16',
                  link: { label: '오시는 길 보기', href: '#' } },
    '예약방법': { text: '전시 상세에서 [전시 예약]을 누른 뒤\n날짜 · 시간 · 인원을 선택하면 예약할 수 있습니다.\n예약은 로그인 후 이용할 수 있습니다.',
                  link: { label: '전시 보러 가기', href: '/exhibitions' } },
    '물품보관': { text: '물품보관 안내는 대표전화(02-2014-6900)로 문의해 주세요.' },
  };

  // AI 연결 실패 시
  const FALLBACK = { text: '죄송합니다. 지금은 답변을 드리기 어려워요.\n위의 버튼을 누르거나 대표전화(02-2014-6900)로 문의해 주세요.' };

  const scrollToBottom = () => { chatLog.scrollTop = chatLog.scrollHeight; };

  // 상대 시간: 방금 / N분 전 / 16:52 / 10.13
  function timeLabel(ts) {
    const diff = Math.floor((Date.now() - ts) / 60000);
    if (diff < 1) return '방금';
    if (diff < 60) return `${diff}분 전`;
    const d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    if (d.toDateString() === new Date().toDateString()) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
  }

  /* --- 저장 · 불러오기 (탭을 닫으면 사라짐) --- */
  function saveAll() {
    convs.sort((a, b) => b.updated - a.updated);         // 최근 대화가 위로
    convs = convs.slice(0, MAX_CONVS);
    try { sessionStorage.setItem(STORE, JSON.stringify(convs)); } catch (e) {}
    renderList();
  }

  function loadAll() {
    try { convs = JSON.parse(sessionStorage.getItem(STORE)) || []; } catch (e) { convs = []; }
  }

  /* --- 대화 전환 --- */
  function clearLog() {
    [...chatLog.children].forEach(el => { if (!initialNodes.includes(el)) el.remove(); });
  }

  function newConv() {
    cur = { id: Date.now().toString(36), saved: [], history: [], updated: Date.now() };
    clearLog();                                          // 빈 대화는 메시지가 생겨야 목록에 저장됨
  }

  function openConv(id) {
    const c = convs.find(x => x.id === id);
    if (!c) return;
    cur = c;
    clearLog();
    c.saved.forEach(m => (m.who === 'user' ? drawUser(m.text) : drawBot(m)));
  }

  // 말풍선 하나를 대화에 기록 (처음 기록될 때 목록에 추가)
  function record(conv, m) {
    conv.saved.push({ ...m, ts: Date.now() });
    conv.updated = Date.now();
    if (!convs.includes(conv)) convs.push(conv);
    saveAll();
  }

  /* --- 대화 탭 목록 그리기 --- */
  function renderList() {
    if (!listBox) return;
    listBox.innerHTML = '';
    convs.forEach(c => {
      const li = itemTpl.content.firstElementChild.cloneNode(true);
      const btn = li.querySelector('.chat-item');
      const last = c.saved[c.saved.length - 1];
      const lastBot = [...c.saved].reverse().find(m => m.who === 'bot') || last;
      btn.dataset.id = c.id;
      btn.querySelector('.chat-item__text').textContent = lastBot.text;
      btn.querySelector('.chat-item__time').textContent = timeLabel(last.ts);
      listBox.append(li);
    });
    const has = convs.length > 0;
    listEmpty.hidden = has;
    newBtn.textContent = has ? '새 문의하기' : '문의하기';
  }

  /* --- 말풍선 그리기 --- */
  function drawUser(text) {
    const p = document.createElement('p');
    p.className = 'bubble bubble--user';
    p.textContent = text;
    chatLog.append(p);
    scrollToBottom();
  }

  function drawBot({ text, link }) {
    const wrap = document.createElement('div');
    wrap.className = 'chat__bot';

    const p = document.createElement('p');
    p.className = 'bubble bubble--bot';
    p.textContent = text;                     // textContent: AI 답변에 태그가 섞여도 글자로만 표시 (안전)
    wrap.append(p);

    if (link) {
      const a = document.createElement('a');
      a.className = 'btn-chip';
      a.href = link.href;
      a.textContent = link.label;
      wrap.append(a);
    }
    chatLog.append(wrap);
    scrollToBottom();
  }

  // "답변을 준비하고 있어요…" 말풍선
  function addTyping() {
    const p = document.createElement('p');
    p.className = 'bubble bubble--bot is-typing';
    p.textContent = '답변을 준비하고 있어요…';
    chatLog.append(p);
    scrollToBottom();
    return p;
  }

  function setBusy(on) {
    busy = on;
    sendBtn.disabled = on;
    chatLog.setAttribute('aria-busy', String(on));
  }

  // 빠른 질문: 정해진 답 (AI 기록에도 남겨서 이어지는 질문의 맥락으로 씀)
  function answerFAQ(question) {
    const conv = cur;
    const answer = FAQ[question];
    drawUser(question);
    record(conv, { who: 'user', text: question });
    conv.history.push({ role: 'user', content: question }, { role: 'assistant', content: answer.text });

    setBusy(true);                            // 400ms 사이에 다른 대화로 못 넘어가게
    setTimeout(() => {
      drawBot(answer);
      record(conv, { who: 'bot', ...answer });
      setBusy(false);
    }, 400);                                  // 답하는 느낌으로 살짝 늦게
  }

  // 직접 입력: AI 답변
  async function answerAI(question) {
    const conv = cur;
    drawUser(question);
    record(conv, { who: 'user', text: question });
    conv.history.push({ role: 'user', content: question });
    const typing = addTyping();
    setBusy(true);

    let answer = FALLBACK;
    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: conv.history.slice(-10) }),
      });
      const data = await res.json();
      if (data.ok) {
        answer = { text: data.text };
        conv.history.push({ role: 'assistant', content: data.text });
      }
    } catch (err) { /* 서버가 꺼져 있는 등 연결 실패 → FALLBACK */ }

    typing.remove();
    drawBot(answer);
    record(conv, { who: 'bot', ...answer });
    setBusy(false);
  }

  function ask(question) {
    if (busy) return;                         // 답 기다리는 중엔 새 질문 막기
    if (FAQ[question]) answerFAQ(question);   // 버튼과 같은 말을 입력해도 정해진 답
    else answerAI(question);
  }

  // 빠른 질문 버튼
  chatLog.querySelectorAll('.quick__btn').forEach(btn =>
    btn.addEventListener('click', () => ask(btn.textContent.trim()))
  );

  // 입력창 보내기
  chatForm.addEventListener('submit', e => {
    e.preventDefault();                       // 새로고침 막기
    const question = input.value.trim();
    if (!question || busy) return;            // 빈 칸이거나 답 기다리는 중이면 무시
    input.value = '';
    ask(question);
  });

  // Enter = 보내기, Shift+Enter = 줄바꿈
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      chatForm.requestSubmit();
    }
  });

  /* --- 버튼 연결 (화면 전환은 common.js가 함께 처리) --- */
  // 대화 탭 [새 문의하기]: 새 대화 시작 (이전 대화는 목록에 남음)
  newBtn.addEventListener('click', () => { if (!busy) newConv(); });

  // 홈 [문의하기]: 가장 최근 대화 이어가기 (없으면 새 대화)
  homeAsk.addEventListener('click', () => {
    if (busy) return;
    if (convs.length) openConv(convs[0].id);
    else newConv();
  });

  // 목록의 대화 누르기: 그 대화 열기
  listBox.addEventListener('click', e => {
    const item = e.target.closest('.chat-item');
    if (!item || busy) return;
    openConv(item.dataset.id);
    if (window.chatbotShowView) window.chatbotShowView('chat');
  });

  // "방금 → 3분 전" 갱신 (1분마다)
  setInterval(renderList, 60000);

  // 시작할 때: 저장된 대화 불러오기 → 가장 최근 대화를 열어둠
  loadAll();
  if (convs.length) openConv(convs[0].id);
  else newConv();
  renderList();
}