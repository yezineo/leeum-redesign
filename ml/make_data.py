"""가상 관람 데이터 만들기
실제 리움 방문 데이터는 공개되지 않아, 미술관에서 흔한 패턴을 반영해 생성 (주말·오후 붐빔, 봄·가을 성수기)
실제 데이터를 받으면 visits.csv만 바꾸면 같은 방식으로 학습 가능
"""
import os
import numpy as np
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(42)                 # 매번 같은 데이터가 나오게 고정

# 회차별 기본 인원 (오후가 붐빔)
HOUR_BASE = {10: 40, 11: 60, 12: 55, 13: 70, 14: 90, 15: 95, 16: 80, 17: 45}
# 요일별 배율 (0=월 휴관, 1=화 … 5=토, 6=일)
WEEKDAY_RATE = {1: 1.0, 2: 1.0, 3: 1.05, 4: 1.15, 5: 1.7, 6: 1.5}


def month_rate(m):
    if m in (3, 4, 5, 9, 10, 11):
        return 1.2      # 봄·가을 성수기
    if m in (7, 8):
        return 1.1      # 방학
    if m in (12, 1, 2):
        return 0.85     # 겨울 비수기
    return 1.0


rows = []
for d in pd.date_range('2024-01-01', '2026-09-30'):
    wd = d.weekday()
    if wd == 0:                                 # 월요일 휴관
        continue
    for hour, base in HOUR_BASE.items():
        mean = base * WEEKDAY_RATE[wd] * month_rate(d.month)
        visitors = max(0, round(rng.normal(mean, mean * 0.15)))   # 날마다 ±15% 정도 들쭉날쭉
        rows.append({'date': d.date(), 'weekday': wd, 'hour': hour, 'month': d.month,
                     'is_weekend': int(wd >= 5), 'visitors': visitors})

df = pd.DataFrame(rows)
df.to_csv(os.path.join(HERE, 'visits.csv'), index=False)
print(f'{len(df)}줄 저장 → ml/visits.csv')
print(df.head())