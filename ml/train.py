"""혼잡도 예측 모델 학습 · 평가 · 저장"""
import os
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

HERE = os.path.dirname(os.path.abspath(__file__))
FEATURES = ['weekday', 'hour', 'month', 'is_weekend']    # 모델이 보는 정보
TARGET = 'visitors'                                       # 맞힐 값: 회차별 방문 인원

df = pd.read_csv(os.path.join(HERE, 'visits.csv'), parse_dates=['date'])

# 마지막 6개월은 시험용으로 숨겨둠 → '처음 보는 미래'를 맞히는지 확인
is_test = df['date'] >= '2026-04-01'
train, test = df[~is_test], df[is_test]

model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
model.fit(train[FEATURES], train[TARGET])
pred = model.predict(test[FEATURES])

# 비교용 단순 방법: 요일·시간별 평균만 사용 (머신러닝이 더 나은지 확인)
avg = train.groupby(['weekday', 'hour'])[TARGET].mean()
base_pred = [avg[(w, h)] for w, h in zip(test['weekday'], test['hour'])]

print('=== 시험 결과 (2026.04 ~ 2026.09) ===')
print(f'머신러닝  평균 오차: {mean_absolute_error(test[TARGET], pred):.1f}명 / R²: {r2_score(test[TARGET], pred):.3f}')
print(f'단순 평균 평균 오차: {mean_absolute_error(test[TARGET], base_pred):.1f}명 / R²: {r2_score(test[TARGET], base_pred):.3f}')

print('\n=== 무엇을 중요하게 봤나 ===')
for name, imp in sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1]):
    print(f'{name:<11} {imp:.2f}')

# 여유/보통/혼잡 기준: 하위 40% / 40~75% / 상위 25%
q = train[TARGET].quantile([0.4, 0.75]).tolist()
print(f'\n기준: 여유 < {q[0]:.0f}명 ≤ 보통 < {q[1]:.0f}명 ≤ 혼잡')

# 최종 모델은 전체 데이터로 다시 학습해서 저장
model.fit(df[FEATURES], df[TARGET])
joblib.dump({'model': model, 'features': FEATURES, 'q': q}, os.path.join(HERE, 'crowd_model.pkl'))
print('저장 → ml/crowd_model.pkl')