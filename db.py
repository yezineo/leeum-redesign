import os
import pymysql
from dotenv import load_dotenv

load_dotenv(override=True)  # .env 파일 값을 읽어옴

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def get_db():
    """DB 연결 하나를 만들어 돌려줌 (쓰고 나면 close)"""
    options = dict(
        host=os.getenv('DB_HOST'),
        port=int(os.getenv('DB_PORT', 3306)),   # 집: 3306 / Aiven: 따로 받은 번호
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME'),
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor,
    )
    ca = os.getenv('DB_SSL_CA')   # 배포 때만 넣음 (예: ca.pem)
    if ca:
        options['ssl'] = {'ca': os.path.join(BASE_DIR, ca)}
    return pymysql.connect(**options)