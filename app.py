import re
import os
import random
import calendar
from functools import wraps
from datetime import date as dt_date, timedelta

import bcrypt
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from db import get_db
from chat_ai import ask_ai
from crowd import predict_levels
from exhibitions_data import CURRENT_EXHIBITIONS, PAST_EXHIBITIONS, EX_BY_ID

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY')    # 로그인 세션용
WEEK_KO = '월화수목금토일'


# ===== 로그인 도우미 =====
def safe_next(next_page):
    """로그인/가입 후 돌아갈 주소 (우리 사이트 안 주소만 허용)"""
    if next_page == 'reserve':
        return url_for('reserve')
    if next_page and next_page.startswith('/') and not next_page.startswith('//'):
        return next_page
    return url_for('index')


def login_required(view):
    """로그인 안 했으면 로그인 화면으로 → 로그인 후 원래 화면으로 복귀"""
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get('user_id'):
            return redirect(url_for('login', next=request.full_path.rstrip('?')))
        return view(*args, **kwargs)
    return wrapped


def to_date(v):
    """'2026-10-20' 글자도, 날짜 값도 모두 날짜로"""
    return v if isinstance(v, dt_date) else dt_date.fromisoformat(v)

@app.template_filter('kodate')
def kodate(v):
    d = to_date(v)
    return f'{d.month:02d}월 {d.day:02d}일({WEEK_KO[d.weekday()]})'

@app.template_filter('dashdate')
def dashdate(v):
    d = to_date(v)
    return f'{d.year}-{d.month:02d}-{d.day:02d} ({WEEK_KO[d.weekday()]})'


# 임시 데이터 (B안 때 DB로 교체)

# 메인 히어로 슬라이드
# theme: 헤더·컨트롤 색 — 'dark'(흰 UI) / 'light'(검정 UI)
# card : 카드 색 — 'light'(밝은 반투명) / 'dark'(어두운 반투명 + 흰 글자)
HERO_SLIDES = [
    {'id': 'koojeonga', 'title': '구정아: 우스모스', 'place': 'M2', 'date': '2026.09.05. – 2026.12.27',
     'note': '《구정아: 우스모스》 전시는 삼성생명의 협찬으로 진행됩니다.',
     'img': 'hero-koojeonga.jpg','img_m': 'hero-koojeonga-m.jpg','theme': 'dark', 'card': 'light'},
    {'id': 'other-space', 'title': '다른 공간 안으로: 여성 작가들의 공감각적 환경 1956-1976', 'place': '블랙박스, 그라운드갤러리',
     'date': '2026.05.05. – 2026.11.29.', 'note': '',
     'img': 'hero-03.jpg', 'img_m': 'hero-03-m.jpg','theme': 'dark', 'card': 'dark'},
    {'id': 'idea-museum', 'title': '아이디어 뮤지엄, 내일 이후', 'place': '강당 라운지', 'date': '2026.09.05. – 2026.11.29.',
     'note': "'아이디어 뮤지엄'은 샤넬 컬처 펀드의 후원으로 진행됩니다.",
     'img': 'hero-02.jpg', 'img_m': 'hero-02-m.jpg','theme': 'light', 'card': 'dark'},
    {'id': 'orozco-garden', 'title': '가브리엘 오로즈코 정원', 'place': '야외 데크', 'date': '2026.04.03. –', 'note': '',
     'img': 'hero-04.jpg', 'img_m': 'hero-04-m.jpg','theme': 'dark', 'card': 'light'},
]

# 공지: 메인 공지 목록 + 챗봇 상단 공지가 같이 씀 (한 곳만 고치면 두 곳 다 바뀜)
# pin: True → 챗봇 상단에 띄울 공지 (날짜가 지나도 유효한 것)
NOTICES = [
    {'title': '온라인 예매 일시 중단 안내: 9. 6(일) 19:00 - 9. 8(화) 09:00', 'date': '2026.09.02.'},
    {'title': 'M2 2층 (드림 하우스) 단축 관람 안내 : 9. 5.(토) 16:30 까지', 'date': '2026.08.28.'},
    {'title': '미술관 임시휴관 및 단축 운영 안내 : 9. 1.(화) - 9. 3.(목)', 'date': '2026.08.12.'},
    {'title': '삼성문화재단 경력직 채용 (한국화 보존처리, 홍보)', 'date': '2026.08.06.'},
    {'title': '리움·호암미술관 사칭 주의 안내', 'date': '2026.07.15.', 'pin': True},
]


@app.context_processor
def inject_notices():
    """모든 화면(템플릿)에서 notices, pinned_notice를 쓸 수 있게"""
    pinned = next((n for n in NOTICES if n.get('pin')), None)
    return {'notices': NOTICES, 'pinned_notice': pinned}

# 예약 가능한 전시 (지금은 1개)
EXHIBITION = {'title': '구정아: 우스모스', 'place': 'M2'}
# 예약 내역 썸네일 (전시명 → 이미지)
EXHIBIT_IMG = {'구정아: 우스모스': 'history-01.jpg', '이불: 1998년 이후': 'past-02.jpg'}


# ===== 예약 데이터 도우미 =====
def to_view(r):
    """DB 한 줄 → 화면에서 쓰기 좋은 모양"""
    d = r['visit_date']
    return {
        'no': r['reserve_no'],
        'title': r['exhibition'],
        'place': r['place'],
        'date': d,
        'time': r['visit_time'],
        'people': r['people'],
        'info': f"{d:%Y.%m.%d}({WEEK_KO[d.weekday()]}) / {r['visit_time']} / 성인 {r['people']}",
        'booked': f"{r['created_at']:%Y-%m-%d %H:%M}",
        'pay': r['pay_method'],
        'img': EXHIBIT_IMG.get(r['exhibition'], 'history-01.jpg'),
    }


def my_reservations():
    """로그인한 회원의 예약 → (다가오는, 지난)"""
    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT * FROM reservations WHERE member_id = %s ORDER BY visit_date, visit_time',
                        (session['user_id'],))
            rows = cur.fetchall()
    finally:
        conn.close()

    today = dt_date.today()
    upcoming = [to_view(r) for r in rows if r['visit_date'] >= today]           # 가까운 날부터
    past = [to_view(r) for r in reversed(rows) if r['visit_date'] < today]      # 최근 것부터
    return upcoming, past


@app.route('/')
def index():
    # 02 메인: 로그인 + 다가오는 예약이 있으면 가장 가까운 예약 1건을 띠로 표시
    upcoming = None
    if session.get('user_id'):
        soon, _ = my_reservations()
        upcoming = soon[0] if soon else None
    return render_template('index.html', hero_slides=HERO_SLIDES, upcoming=upcoming)


EXHIBIT_TABS = [('current', '현재전시'), ('upcoming', '예정전시'), ('past', '과거전시')]


@app.route('/exhibitions')
def exhibitions():
    # 07: ?tab=current(기본) / upcoming / past
    tab = request.args.get('tab', 'current')
    lists = {'current': CURRENT_EXHIBITIONS, 'upcoming': [], 'past': PAST_EXHIBITIONS}   # 예정전시: 지금은 없음
    if tab not in lists:
        tab = 'current'
    return render_template('exhibitions.html', exhibitions=lists[tab], tab=tab, tabs=EXHIBIT_TABS)


def end_date(ex):
    """기간 글자에서 마지막 날짜 꺼내기 ('2026.04.03. –'·'상설전'처럼 끝 날짜 없으면 None)"""
    found = re.findall(r'(\d{4})\.(\d{2})\.(\d{2})', ex['date'])
    if len(found) < 2:
        return None
    y, m, d = map(int, found[-1])
    return dt_date(y, m, d)


@app.route('/exhibitions/detail')
def exhibition_detail_old():
    return redirect(url_for('exhibition_detail', ex_id='koojeonga'))   # 예전 주소 → 구정아 상세


@app.route('/exhibitions/<ex_id>')
def exhibition_detail(ex_id):
    ex = EX_BY_ID.get(ex_id)
    if not ex:
        return redirect(url_for('exhibitions'))
    end = end_date(ex)
    ended = bool(end and end < dt_date.today())                     # 종료 여부 자동 계산
    back_tab = 'past' if ex in PAST_EXHIBITIONS else 'current'     # [목록 돌아가기] → 원래 탭으로
    return render_template('exhibition_detail.html', ex=ex, ended=ended, back_tab=back_tab)


# ===== 예약 (09 · 10 · 11 · 14) =====
TIMES = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
EXHIBIT_END = dt_date(2026, 12, 27)   # 구정아: 우스모스 종료일 — 이후 날짜는 예약 불가
HOLIDAYS = []                         # 월요일 외 휴관일 (예: dt_date(2027, 1, 1)) — 실제 날짜 확인 필요
BOOK_DAYS = 14                        # '관람일 14일 전부터 예매 가능'


def is_closed(d):
    return d.weekday() == 0 or d in HOLIDAYS          # 매주 월요일 휴관


def available_dates():
    """예약 가능일: 내일 ~ 14일 후 (휴관일·전시 종료 후 제외)"""
    today = dt_date.today()
    days = [today + timedelta(days=i) for i in range(1, BOOK_DAYS + 1)]
    return [d for d in days if not is_closed(d) and d <= EXHIBIT_END]


def valid_choice(date, time, count):
    """고른 날짜·시간·인원이 예약 가능한 값인지 (서버에서 다시 검사)"""
    avail = [d.isoformat() for d in available_dates()]
    return date in avail and time in TIMES and count and 1 <= count <= 4


def calendar_months(avail):
    """달력에 보여줄 달: 예약 가능일이 걸친 달 (보통 1~2개)"""
    if avail:
        keys = sorted({(avail[0].year, avail[0].month), (avail[-1].year, avail[-1].month)})
    else:
        today = dt_date.today()
        keys = [(today.year, today.month)]

    months = []
    for y, m in keys:
        weeks = []
        for week in calendar.Calendar(firstweekday=6).monthdayscalendar(y, m):
            row = []
            for day in week:
                if not day:
                    row.append(None)
                    continue
                d = dt_date(y, m, day)
                state = 'closed' if is_closed(d) else 'available' if d in avail else 'plain'
                row.append({'day': day, 'iso': d.isoformat(), 'label': f'{m}월 {day}일', 'state': state})
            weeks.append(row)
        months.append({'label': f'{y}년 {m}월', 'weeks': weeks})
    return months


def render_reserve(selected_date=None, selected_time=None, count=None):
    avail = available_dates()
    return render_template(
        'reserve.html',
        months=calendar_months(avail), times=TIMES,
        crowd=predict_levels(avail, TIMES),                  # AI 예상 혼잡도
        selected_date=selected_date, selected_time=selected_time, count=count,
    )


@app.route('/reserve')
@login_required
def reserve():
    # 10에서 [이전 단계로] 오면 고른 값 유지
    return render_reserve(request.args.get('date'),
                          request.args.get('time'),
                          request.args.get('count', type=int))


@app.route('/reserve/select')
@login_required
def reserve_select():
    avail = available_dates()                                 # 09-1 확인용: 첫 예약 가능일
    return render_reserve(avail[0].isoformat() if avail else None, '10:00', 1)


@app.route('/reserve/confirm')
@login_required
def reserve_confirm():
    date = request.args.get('date', '')
    time = request.args.get('time')
    count = request.args.get('count', type=int)

    if not valid_choice(date, time, count):                  # 주소를 직접 고쳐서 들어온 경우 대비
        return redirect(url_for('reserve'))

    return render_template('reserve_confirm.html',
                           selected_date=date, selected_time=time, count=count)


def new_reserve_no(cur, visit):
    """예약번호: 관람일-4자리 (겹치면 다시 뽑기)"""
    while True:
        no = f'{visit:%Y%m%d}-{random.randint(1000, 9999)}'
        cur.execute('SELECT 1 FROM reservations WHERE reserve_no = %s', (no,))
        if not cur.fetchone():
            return no


@app.route('/reserve/complete', methods=['POST'])
@login_required
def reserve_complete():
    date = request.form.get('date', '')
    time = request.form.get('time')
    count = request.form.get('count', type=int)

    if not valid_choice(date, time, count):
        return redirect(url_for('reserve'))

    visit = dt_date.fromisoformat(date)
    conn = get_db()
    try:
        with conn.cursor() as cur:
            no = new_reserve_no(cur, visit)
            cur.execute(
                'INSERT INTO reservations (reserve_no, member_id, exhibition, place, visit_date, visit_time, people) '
                'VALUES (%s, %s, %s, %s, %s, %s, %s)',
                (no, session['user_id'], EXHIBITION['title'], EXHIBITION['place'], visit, time, count),
            )
        conn.commit()
    finally:
        conn.close()

    # 저장 후 상세 화면으로 이동 (새로고침해도 두 번 저장 안 됨) + 완료 모달(11)
    return redirect(url_for('reservation_detail', reserve_no=no, done=1))


@app.route('/reservations/<reserve_no>')
@login_required
def reservation_detail(reserve_no):
    conn = get_db()
    try:
        with conn.cursor() as cur:
            # 본인 예약만 (다른 사람 예약번호를 넣어도 안 열림)
            cur.execute('SELECT * FROM reservations WHERE reserve_no = %s AND member_id = %s',
                        (reserve_no, session['user_id']))
            row = cur.fetchone()
    finally:
        conn.close()

    if not row:
        return redirect(url_for('reservations'))
    return render_template('reservation_detail.html', r=to_view(row),
                           completed=request.args.get('done') == '1')     # 11 = 14 + 완료 모달


@app.route('/mypage')
@login_required
def mypage():
    return render_template('mypage.html')


@app.route('/reservations')
@login_required
def reservations():
    upcoming, past = my_reservations()
    return render_template('reservations.html', upcoming=upcoming, past=past)     # 13


@app.route('/reservations/empty')
@login_required
def reservations_empty():
    return render_template('reservations.html', upcoming=[], past=[])             # 13-1 확인용

# ===== 챗봇 (16) =====
@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json(silent=True) or {}
    messages = []
    for m in data.get('history', [])[-10:]:                  # 최근 10개만
        if m.get('role') in ('user', 'assistant') and isinstance(m.get('content'), str):
            messages.append({'role': m['role'], 'content': m['content'][:500]})   # 너무 긴 글 자르기

    if not messages or messages[-1]['role'] != 'user':
        return jsonify(ok=False)

    answer = ask_ai(messages)
    if answer is None:                                        # 키 없음 · 오류 → 화면에서 안내 문구
        return jsonify(ok=False)
    return jsonify(ok=True, text=answer)

# ===== 로그인 · 회원가입 =====
@app.route('/login', methods=['GET', 'POST'])
def login():
    next_page = request.args.get('next')                     # 03-1: 예약 화면에서 넘어오면 안내 문구
    if request.method == 'GET' and session.get('user_id'):   # 화면 열 때만: 이미 로그인이면 바로 이동
        return redirect(safe_next(next_page))
    if request.method == 'POST':                             # 버튼 누르면 항상 비번 검사 → 기존 로그인은 먼저 해제
        session.clear()

    saved_email = request.cookies.get('saved_email', '')     # '이메일 저장'으로 기억된 값
    if request.method == 'GET':
        return render_template('login.html', next_page=next_page,
                               email=saved_email, save_email=bool(saved_email))

    email = request.form.get('email', '').strip().lower()
    pw = request.form.get('password', '')
    save = bool(request.form.get('save_email'))

    def fail(msg):                                           # 실패: 이메일은 남기고 오류 표시
        return render_template('login.html', next_page=next_page,
                               email=email, save_email=save, login_error=msg)

    if not email or not pw:
        return fail('이메일과 비밀번호를 입력해 주세요.')

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT id, name, password_hash FROM members WHERE email = %s', (email,))
            user = cur.fetchone()
    finally:
        conn.close()

    # 이메일이 없든 비밀번호가 틀리든 같은 문구 (어느 쪽이 틀렸는지 알려주지 않음 = 보안)
    if not user or not bcrypt.checkpw(pw.encode(), user['password_hash'].encode()):
        return fail('이메일 또는 비밀번호가 일치하지 않습니다.')

    session.clear()
    session['user_id'] = user['id']
    session['user_name'] = user['name']
    session['user_email'] = email

    resp = redirect(safe_next(next_page))
    if save:
        resp.set_cookie('saved_email', email, max_age=60 * 60 * 24 * 30)   # 판단: 30일 기억
    else:
        resp.delete_cookie('saved_email')
    return resp


PW_RULE = re.compile(r'^(?=.*[A-Za-z])(?=.*\d).{8,}$')     # account.js와 같은 규칙
EMAIL_RULE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')


@app.route('/join', methods=['GET', 'POST'])
def join():
    next_page = request.args.get('next')
    if request.method == 'GET':
        return render_template('join.html', next_page=next_page)

    name = request.form.get('name', '').strip()
    email = request.form.get('email', '').strip().lower()          # 판단: 대소문자 구분 없이 저장
    pw = request.form.get('password', '')
    pw_check = request.form.get('password_check', '')
    agreed = request.form.get('agree_terms') and request.form.get('agree_privacy')
    marketing = 1 if request.form.get('agree_marketing') else 0

    # 서버에서 한 번 더 검사 (JS를 건너뛰고 보내는 경우 대비)
    if not name or not EMAIL_RULE.match(email) or not PW_RULE.match(pw) or pw != pw_check or not agreed:
        return redirect(url_for('join', next=next_page))

    conn = get_db()
    try:
        with conn.cursor() as cur:
            cur.execute('SELECT id FROM members WHERE email = %s', (email,))
            if cur.fetchone():                                     # 이미 가입된 이메일
                return render_template('join.html', next_page=next_page, form=request.form,
                                       email_error='이미 가입된 이메일입니다.')

            pw_hash = bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()   # 비밀번호 암호화
            cur.execute(
                'INSERT INTO members (name, email, password_hash, agree_marketing) VALUES (%s, %s, %s, %s)',
                (name, email, pw_hash, marketing),
            )
            conn.commit()
            user_id = cur.lastrowid
    finally:
        conn.close()

    # 자동 로그인
    session.clear()
    session['user_id'] = user_id
    session['user_name'] = name
    session['user_email'] = email
    return redirect(safe_next(next_page))

@app.route('/coming-soon')
def coming_soon():
    return render_template('coming_soon.html')     # 이번 범위에서 뺀 메뉴

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('index'))


@app.route('/find-password')
def find_password():
    return render_template('find_password.html')

@app.route('/find-password/sent')
def find_password_sent():
    return render_template('find_password.html', sent=True)       # 05-1 확인용

@app.route('/reset-password')
def reset_password():
    return render_template('reset_password.html')

@app.route('/reset-password/mismatch')
def reset_password_mismatch():
    return render_template('reset_password.html', mismatch=True)   # 06-1 확인용

@app.route('/chatbot')
def chatbot_preview():
    return render_template('index.html', hero_slides=HERO_SLIDES, chatbot_open=True)                       # 15 확인용

@app.route('/chatbot/list')
def chatbot_list_preview():
    return render_template('index.html', hero_slides=HERO_SLIDES, chatbot_open=True, chatbot_view='list')  # 15-1 확인용

@app.route('/chatbot/chat')
def chatbot_chat_preview():
    return render_template('index.html', hero_slides=HERO_SLIDES, chatbot_open=True, chatbot_view='chat')  # 16 확인용


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)