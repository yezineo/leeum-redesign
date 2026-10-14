import os
import pymysql
from dotenv import load_dotenv

load_dotenv(override=True)  # .env 파일 값을 읽어옴


def get_db():
    """DB 연결 하나를 만들어 돌려줌 (쓰고 나면 close)"""
    return pymysql.connect(
        host=os.getenv('DB_HOST'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME'),
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,   # 결과를 {'name': ...} 형태로
    )