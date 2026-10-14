"""사이트에서 혼잡도 모델 사용"""
import os
import joblib
import pandas as pd

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ml', 'crowd_model.pkl')
_bundle = None


def _load():
    """모델은 처음 한 번만 불러와서 재사용"""
    global _bundle
    if _bundle is None and os.path.exists(MODEL_PATH):
        _bundle = joblib.load(MODEL_PATH)
    return _bundle


def predict_levels(dates, times):
    """{'2026-10-20': {'10:00': '여유', ...}, ...} — 모델이 없거나 오류면 {} (화면은 '예약 가능' 그대로)"""
    try:
        b = _load()
        if not b or not dates:
            return {}
        rows = [{'weekday': d.weekday(), 'hour': int(t[:2]), 'month': d.month, 'is_weekend': int(d.weekday() >= 5)}
                for d in dates for t in times]
        preds = b['model'].predict(pd.DataFrame(rows)[b['features']])
        lo, hi = b['q']

        result, i = {}, 0
        for d in dates:
            result[d.isoformat()] = {}
            for t in times:
                v = preds[i]
                i += 1
                result[d.isoformat()][t] = '여유' if v < lo else '보통' if v < hi else '혼잡'
        return result
    except Exception as e:
        print('[crowd] 예측 오류:', e)
        return {}