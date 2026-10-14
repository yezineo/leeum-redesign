-- 1. 리움 데이터베이스 만들기 (한글·이모지 저장 가능한 utf8mb4)
CREATE DATABASE IF NOT EXISTS leeum
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE leeum;

-- 2. 회원 테이블
CREATE TABLE IF NOT EXISTS members (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(50)  NOT NULL,
  email           VARCHAR(100) NOT NULL UNIQUE,
  password_hash   VARCHAR(255) NOT NULL,
  agree_marketing TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. 잘 만들어졌는지 확인
DESCRIBE members;

-- 4. 앱 전용 계정 (.env의 DB_USER / DB_PASSWORD와 같게)
CREATE USER IF NOT EXISTS 'leeum'@'localhost' IDENTIFIED BY 'leeum1234';
GRANT ALL PRIVILEGES ON leeum.* TO 'leeum'@'localhost';
FLUSH PRIVILEGES;

SELECT id, name, email, password_hash FROM leeum.members; -- 가입확인

-- 5. 예약 테이블
USE leeum;
CREATE TABLE IF NOT EXISTS reservations (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  reserve_no  VARCHAR(20)  NOT NULL UNIQUE,              -- 예약번호 (20260916-1091 형태)
  member_id   INT          NOT NULL,                     -- 누가 예약했는지 (members.id)
  exhibition  VARCHAR(100) NOT NULL,                     -- 전시명 (B안 때 exhibitions 테이블로 교체)
  place       VARCHAR(50)  NOT NULL,
  visit_date  DATE         NOT NULL,                     -- 관람일
  visit_time  VARCHAR(5)   NOT NULL,                     -- 10:00
  people      TINYINT      NOT NULL,                     -- 인원 1~4
  pay_method  VARCHAR(20)  NOT NULL DEFAULT '현장 결제',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,   -- 예약일
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);
DESCRIBE reservations;
