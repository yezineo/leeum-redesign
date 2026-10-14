"""리움 챗봇 — OpenAI 연결"""
import os
from openai import OpenAI

MODEL = 'gpt-4o-mini'      # 판단: 싸고 빠른 모델 (안내 챗봇에 충분)

# AI에게 주는 '역할 + 알고 있는 정보 + 규칙'
SYSTEM_PROMPT = """너는 리움미술관 웹사이트의 안내 챗봇이다.

[확인된 정보]
- 운영시간: 10:00 - 18:00 (전시 관람은 18시까지)
- 휴관일: 매주 월요일
- 주소: 04348 서울특별시 용산구 이태원로55길 60-16
- 대표전화: 02-2014-6900
- 주차: 주차장이 협소하여 만차 시 주차가 불가하니 대중교통 이용을 권장
- 예약 방법: 전시 상세에서 [전시 예약] → 날짜·시간·인원 선택 → 예약 확정. 로그인 후 이용 가능
- 예약 규칙: 관람일 14일 전부터 예매 가능, 1인 최대 4명, 관람 회차 10:00~17:00 매 정시
- 입장: 선택한 관람 시간부터 다음 관람 시간 전까지 입장 가능
- 결제: 입장료는 현장 결제, 미예약자도 현장 발권으로 관람 가능
- 예약 취소: 관람 전일 23:59까지 가능, 당일 취소 불가, 부분 취소 불가, 고객센터로 문의
- 예약 내역 확인: 마이페이지 > 예약 내역
- 현재 온라인 예약 가능한 전시: 구정아: 우스모스 (M2, 2026.09.05 – 2026.12.27)
- 진행 중인 다른 전시: 다른 공간 안으로: 여성 작가들의 공감각적 환경 1956-1976 (블랙박스, 그라운드갤러리, ~2026.11.29), 아이디어 뮤지엄, 내일 이후 (강당 라운지, ~2026.11.29), 가브리엘 오로즈코 정원 (야외)

[규칙]
- 반드시 위 정보로만 답한다. 위에 없는 내용(입장료 금액, 할인, 물품보관, 편의시설 등)은 절대 추측하지 말고 "정확한 내용은 대표전화 02-2014-6900으로 문의해 주세요."라고 안내한다.
- 한국어 존댓말로, 3문장 이내로 짧게 답한다.
- 인사("안녕", "안녕하세요")나 감사("고마워") 같은 일상적인 말에는 짧고 친절하게 답한 뒤, 무엇을 도와드릴지 물어본다.
- 그 외 미술관과 관계없는 질문(날씨, 숙제, 잡담 등)에만 "리움미술관 이용 관련 질문만 도와드릴 수 있어요."라고 정중히 답한다.
"""

_client = None


def get_client():
    """키가 있으면 OpenAI 연결 하나를 만들어 재사용, 없으면 None"""
    global _client
    key = os.getenv('OPENAI_API_KEY')
    if not key:
        return None
    if _client is None:
        _client = OpenAI(api_key=key, timeout=15)
    return _client


def ask_ai(messages):
    """messages: [{'role': 'user'|'assistant', 'content': '...'}] → 답변 글자, 실패하면 None"""
    client = get_client()
    if not client:
        return None
    try:
        res = client.chat.completions.create(
            model=MODEL,
            messages=[{'role': 'system', 'content': SYSTEM_PROMPT}, *messages],
            max_tokens=300,          # 답변 길이 제한 (비용·장황함 방지)
            temperature=0.3,         # 낮을수록 정해진 정보 위주로 답함
        )
        return res.choices[0].message.content.strip()
    except Exception as e:
        print('[chat] OpenAI 오류:', e)   # 터미널에서 원인 확인용
        return None