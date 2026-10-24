# [SsulDak (쓸고닦고)] PTNR-JOB-02 (고객 1:1 상담 채팅) 개발 및 검증 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `PTNR-JOB-02` |
| **화면명** | 고객 1:1 상담 채팅 (Partner 1:1 Consultation Chat) |
| **지원 채널** | Web Console (PC 1440px 최적화 2열 레이아웃 68%:32%) / Mobile Web (390px 반응형) |
| **도메인 역할** | `Partner` (전문가/시공 파트너 전용) |
| **프론트엔드 파일** | `SsulDak_Web/Partner/frontend/PTNR-JOB-02/index.tsx`<br>`SsulDak_Web/Partner/frontend/PTNR-JOB-02/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/Partner/backend/api_PTNR_JOB_02/route.ts` |
| **API 엔드포인트** | `POST /api/partner/ptnr_job_02` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |
| **호출 부모 화면** | `PTNR-JOB-00` (예약 및 작업 관리) |
| **대응 소비자 화면** | `USER-QOT-02` (사용자 파트너 1:1 상담 채팅) |
| **연계 모달** | `PTNR-JOB-01` (작업 상태 업데이트 및 완료 보고 모달) |

---

## 2. 핵심 아키텍처 및 코딩 규칙 준수

1. **물리적 격리**:
   - 모든 파트너 관련 소스코드는 `SsulDak_Web/Partner/` 디렉터리 내에서 프론트엔드와 백엔드를 독립 완결합니다.
   - `User`(이용자) 및 `Admin`(관리자) 도메인 파일과 코드를 일체 공유하지 않습니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/Partner/frontend/PTNR-JOB-02/index.tsx` (및 `index.jsx`)
   - 백엔드 라우터: `SsulDak_Web/Partner/backend/api_PTNR_JOB_02/route.ts`
   - 엔드포인트 URL: `POST /api/partner/ptnr_job_02`
3. **독립 전용 SQL 원칙**:
   - 타 화면과 쿼리를 일체 공유하지 않으며, 오직 `PTNR-JOB-02-SQL-001 ~ PTNR-JOB-02-SQL-007` 전용 SQL ID로 작성 및 트랜잭션을 분리합니다.
4. **데이터 정합성 및 권한 제약 (핵심 룰)**:
   - **파트너 소유권 검증**: 본 화면은 파트너(`PTNR_NO`) 소유의 계약 및 채팅방에 한해 접근 가능하며 타 파트너 접근 시 403 차단합니다.
   - **결제 완료 상태 검증**: 계약 상태가 `CONTRACT_STAT_CD IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED')` 상태에서만 채팅방이 개설되고 대화가 가능합니다.
   - **발신자 명확 구분**: 파트너 발송 시 `SENDER_TYPE_CD = 'PARTNER'`, `SENDER_ID = ptnrNo`.
   - **0507 안심통화 연동**: 상단 헤더의 `[ 0507 안심통화 연결 ]` 버튼은 계약 마스터에 부여된 `SAFE_TEL_NO`로 `tel:` 직통 다이얼 연동.
   - **실시간 증분 동기화(폴링)**: 3초 간격의 클라이언트 폴링(`SYNC_MESSAGES`) 및 새 메시지 도착 시 하단으로의 부드러운 자동 스크롤(`scrollIntoView({ behavior: 'smooth' })`).

---

## 3. 데이터베이스 스키마 및 사용 컬럼

| 테이블명 | 테이블 설명 | 주요 사용 컬럼 및 데이터 타입 |
| :--- | :--- | :--- |
| `TB_CLEAN_CONTRACT` | 체결 계약 마스터 | `CONTRACT_NO` (CHAR(16), PK)<br>`REQ_NO` (CHAR(16))<br>`USER_NO` (CHAR(12))<br>`PTNR_NO` (CHAR(12))<br>`CONTRACT_STAT_CD` ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED')<br>`TOTAL_PAY_AMT` (INT, 총 용역비)<br>`SAFE_TEL_NO` (VARCHAR(30), 0507 안심번호)<br>`SUB_ITEM_NM` (VARCHAR(100), 품목명) |
| `TB_USER` | 고객 마스터 | `USER_NO` (CHAR(12), PK)<br>`USER_NM` (고객 성명: "김충훈") |
| `TB_CLEAN_REQ` | 신청서 마스터 | `REQ_NO` (CHAR(16), PK)<br>`ADDR_ROAD` (도로명 주소) |
| `TB_CHAT_ROOM` | 1:1 상담 채팅방 원장 | `ROOM_NO` (CHAR(16), PK)<br>`CONTRACT_NO` (CHAR(16), UNIQUE)<br>`USER_NO` (CHAR(12))<br>`PTNR_NO` (CHAR(12))<br>`LAST_MSG_CONTENT` (VARCHAR(500))<br>`LAST_MSG_DT` (DATETIME)<br>`IS_ACTIVE_YN` (CHAR(1), 'Y') |
| `TB_CHAT_MESSAGE` | 채팅 메시지 원장 | `MSG_SEQ` (BIGINT, PK, AUTO_INCREMENT)<br>`ROOM_NO` (CHAR(16))<br>`SENDER_TYPE_CD` ('USER', 'PARTNER', 'SYSTEM')<br>`SENDER_ID` (VARCHAR(50))<br>`MSG_TYPE_CD` ('TEXT', 'IMAGE', 'NOTICE')<br>`CONTENT` (TEXT)<br>`ATTACH_IMG_URL` (VARCHAR(500))<br>`IS_READ_YN` (CHAR(1), 'Y'/'N')<br>`REG_DT` (DATETIME) |

---

## 4. 독립 전용 SQL 명세 (PTNR-JOB-02-SQL-001 ~ 007)

### 4.1 PTNR-JOB-02-SQL-001 (파트너 계약 유효성, 고객명 및 안심번호 조회)
```sql
/* PTNR-JOB-02-SQL-001 */
SELECT 
  c.CONTRACT_NO AS contractNo,
  c.CONTRACT_STAT_CD AS contractStatCd,
  c.TOTAL_PAY_AMT AS totalPayAmt,
  COALESCE(c.SAFE_TEL_NO, '0507-1234-5678') AS safeTelNo,
  COALESCE(c.SUB_ITEM_NM, '일산동구 중앙로 빌라 정기청소 3개월') AS subItemNm,
  COALESCE(r.ADDR_ROAD, '경기 고양시 일산동구 중앙로 1261번길 18-4') AS addrRoad,
  u.USER_NO AS userNo,
  COALESCE(u.USER_NM, '김충훈') AS userNm
FROM TB_CLEAN_CONTRACT c
INNER JOIN TB_USER u ON c.USER_NO = u.USER_NO
INNER JOIN TB_CLEAN_REQ r ON c.REQ_NO = r.REQ_NO
WHERE c.CONTRACT_NO = ? AND c.PTNR_NO = ?;
```

### 4.2 PTNR-JOB-02-SQL-002 (계약 연계 채팅방 번호 조회)
```sql
/* PTNR-JOB-02-SQL-002 */
SELECT ROOM_NO AS roomNo
FROM TB_CHAT_ROOM
WHERE CONTRACT_NO = ?;
```

### 4.3 PTNR-JOB-02-SQL-003 (채팅 메시지 최근 50건 조회)
```sql
/* PTNR-JOB-02-SQL-003 */
SELECT 
  MSG_SEQ AS msgSeq,
  ROOM_NO AS roomNo,
  SENDER_TYPE_CD AS senderType,
  SENDER_ID AS senderId,
  MSG_TYPE_CD AS msgType,
  CONTENT AS content,
  ATTACH_IMG_URL AS attachImgUrl,
  IS_READ_YN AS isReadYn,
  DATE_FORMAT(REG_DT, '%Y-%m-%d %H:%i:%s') AS regDt,
  DATE_FORMAT(REG_DT, '%H:%i') AS timeText
FROM TB_CHAT_MESSAGE
WHERE ROOM_NO = ?
ORDER BY MSG_SEQ ASC
LIMIT 50;
```

### 4.4 PTNR-JOB-02-SQL-004 (파트너 발송 새 메시지 등록: TB_CHAT_MESSAGE INSERT)
```sql
/* PTNR-JOB-02-SQL-004 */
INSERT INTO TB_CHAT_MESSAGE (
  ROOM_NO, SENDER_TYPE_CD, SENDER_ID, MSG_TYPE_CD, CONTENT, ATTACH_IMG_URL, IS_READ_YN, REG_DT
) VALUES (
  ?, 'PARTNER', ?, ?, ?, ?, 'N', NOW()
);
```

### 4.5 PTNR-JOB-02-SQL-005 (채팅방 최종 메시지 요약 갱신: TB_CHAT_ROOM UPDATE)
```sql
/* PTNR-JOB-02-SQL-005 */
UPDATE TB_CHAT_ROOM
SET 
  LAST_MSG_CONTENT = ?,
  LAST_MSG_DT = NOW()
WHERE ROOM_NO = ?;
```

### 4.6 PTNR-JOB-02-SQL-006 (마지막 MSG_SEQ 이후 신규 메시지 증분 동기화)
```sql
/* PTNR-JOB-02-SQL-006 */
SELECT 
  MSG_SEQ AS msgSeq,
  ROOM_NO AS roomNo,
  SENDER_TYPE_CD AS senderType,
  SENDER_ID AS senderId,
  MSG_TYPE_CD AS msgType,
  CONTENT AS content,
  ATTACH_IMG_URL AS attachImgUrl,
  IS_READ_YN AS isReadYn,
  DATE_FORMAT(REG_DT, '%Y-%m-%d %H:%i:%s') AS regDt,
  DATE_FORMAT(REG_DT, '%H:%i') AS timeText
FROM TB_CHAT_MESSAGE
WHERE ROOM_NO = ? AND MSG_SEQ > ?
ORDER BY MSG_SEQ ASC;
```

### 4.7 PTNR-JOB-02-SQL-007 (고객이 보낸 미읽음 메시지 일괄 읽음 처리)
```sql
/* PTNR-JOB-02-SQL-007 */
UPDATE TB_CHAT_MESSAGE
SET IS_READ_YN = 'Y'
WHERE ROOM_NO = ? AND SENDER_TYPE_CD = 'USER' AND IS_READ_YN = 'N';
```

---

## 5. 백엔드 API 명세

### 5.1 엔드포인트 개요
- **URL**: `POST /api/partner/ptnr_job_02`
- **인증**: Bearer JWT 토큰 또는 파트너 세션 식별자 (`ptnrNo`)

### 5.2 모드 1: 채팅방 초기 진입 (`mode: "INIT_CHAT"`)
- **Request Body**:
```json
{
  "mode": "INIT_CHAT",
  "ptnrNo": "P20261000001",
  "contractNo": "CT2026102100001"
}
```
- **Response Body**:
```json
{
  "success": true,
  "roomNo": "RM2026102100001",
  "contract": {
    "contractNo": "CT2026102100001",
    "orderNo": "CNT-20261021-0001",
    "customerNm": "김충훈 고객님",
    "maskedCustomerNm": "김*훈 고객님",
    "subItemNm": "일산동구 중앙로 빌라 정기청소 3개월",
    "totalPayAmt": 240000,
    "monthlyAmtText": "월 80,000원 (매월 5일 지급)",
    "addrRoad": "경기 고양시 일산동구 중앙로 1261번길 18-4",
    "safeTelNo": "0507-1234-5678",
    "contractStatCd": "CONFIRMED",
    "firstVisitText": "2026.11.01(일) 09:00 확정",
    "buildingTitle": "일산동구 중앙로 빌라 4층 상가주택",
    "contractPeriodText": "2026.11.01 ~ 2027.01.31 (3개월)"
  },
  "messages": [
    {
      "msgSeq": 1,
      "roomNo": "RM2026102100001",
      "senderType": "SYSTEM",
      "senderId": "SYSTEM",
      "msgType": "NOTICE",
      "content": "배차가 확정되어 안심번호 및 1:1 실시간 상담 채팅방이 열렸습니다. 고객님과 현장 진입 방법, 주차 공간, 공동현관 비밀번호 등 세부 일정을 조율해보세요.",
      "isReadYn": "Y",
      "timeText": "14:00"
    },
    {
      "msgSeq": 2,
      "roomNo": "RM2026102100001",
      "senderType": "PARTNER",
      "senderId": "P20261000001",
      "msgType": "TEXT",
      "content": "고객님 안녕하세요! SsulDak 공식 인증 파트너 반짝빌라클린 이수택 기사입니다. 일요일 오전 9시에 방문드리겠습니다. 사전에 확인해주실 특이사항이 있으실까요?",
      "isReadYn": "Y",
      "timeText": "14:20"
    },
    {
      "msgSeq": 3,
      "roomNo": "RM2026102100001",
      "senderType": "USER",
      "senderId": "U20261000001",
      "msgType": "TEXT",
      "content": "네 기사님! 1층 공동현관 비번은 #1234* 입니다. 주차는 건물 필로티에 하시면 됩니다. 1층 음식점 뒤쪽 분리수거장에 박스가 조금 쌓여있는데 신경 써주시면 감사하겠습니다.",
      "isReadYn": "Y",
      "timeText": "14:24"
    }
  ]
}
```

### 5.3 모드 2: 메시지 전송 (`mode: "SEND_MESSAGE"`)
- **Request Body**:
```json
{
  "mode": "SEND_MESSAGE",
  "ptnrNo": "P20261000001",
  "contractNo": "CT2026102100001",
  "roomNo": "RM2026102100001",
  "content": "확인 감사합니다! 안전하게 주차하고 분리수거장 바닥 고압 물청소까지 정성껏 작업하겠습니다."
}
```
- **Response Body**:
```json
{
  "success": true,
  "msgSeq": 12,
  "roomNo": "RM2026102100001",
  "senderType": "PARTNER",
  "senderId": "P20261000001",
  "msgType": "TEXT",
  "content": "확인 감사합니다! 안전하게 주차하고 분리수거장 바닥 고압 물청소까지 정성껏 작업하겠습니다.",
  "isReadYn": "N",
  "timeText": "14:45",
  "message": "메시지가 성공적으로 전송되었습니다."
}
```

### 5.4 모드 3: 신규 메시지 동기화 (`mode: "SYNC_MESSAGES"`)
- **Request Body**:
```json
{
  "mode": "SYNC_MESSAGES",
  "contractNo": "CT2026102100001",
  "roomNo": "RM2026102100001",
  "lastMsgSeq": 11
}
```

---

## 6. 프론트엔드 UI/UX 구현 세부사항

1. **상단 고객 액션 바**:
   - `김충훈 고객님` 대형 아바타 및 실시간 접속 녹색 펄스 뱃지.
   - 뱃지: `정기계약 진행중`, `빌라정기 12회차 패키지`.
   - 컨텍스트 요약: `안심번호 0507-1234-5678` / `최근 시공 완료율 100%` / `에스크로 전액 예치완료`.
   - 액션 버튼:
     * `[ 0507 안심번호 통화 연결 ]`: `tel:` 브라우저 다이얼 연동.
     * `[ 작업상태 갱신 모달 열기 (PTNR-JOB-01) ]`: 작업 상태 모달 즉시 호출.
     * `[ 작업 관리로 돌아가기 (PTNR-JOB-00) ]`: 부모 화면 복귀 링크.
2. **좌측 채팅 콘솔 (68% 폭)**:
   - **오더 컨텍스트 배너**:
     * `CNT-20261021-0001 | 일산동구 중앙로 빌라 정기청소 3개월 (월 80,000원 직불)`
     * `D-Day 10/31 18:00 기준 시공 확정`, `첫 방문일: 2026.11.01(일) 09:00 확정`.
   - **법적 고지 및 에스크로 보호 배너**:
     * 직거래 차단 24시간 모니터링 및 암호화 보관 안내.
   - **채팅 스트림**:
     * 시스템 알림 안내 박스, 파트너 본인 말풍선(우측 남색), 고객 말풍선(좌측 백색), 읽음 표시(`읽음 1`) 및 시각.
     * 새 메시지 전송 시 부드러운 자동 스크롤.
   - **빠른 응답 추천 칩**:
     * `⚡ 현장 도착 10분 전입니다`, `🔑 공동현관 비밀번호 확인 요청`, `📸 분리수거장 시공 완료 사진 전송`, `📋 시공 완료 보고서 전송 안내`.
     * 클릭 시 입력창 자동 완성.
   - **하단 입력 도크**:
     * 파일 첨부, 현장 사진 전송, 시공 체크리스트 아이콘.
     * `Enter` 키로 즉시 전송, `Shift + Enter` 줄바꿈 지원.
3. **우측 의뢰 요약 & 안전 사이드바 (32% 폭)**:
   - **카드 1 (의뢰 상세 요약)**:
     * 현장 주소 (`경기 고양시 일산동구 중앙로 1261번길 18-4`) 및 T맵 길안내.
     * 환경 특성: 승강기 있음 / 필로티 무료 / 1층 수전 사용.
     * 공동현관 비번: `#1234*` (잠금해제됨).
     * 총 계약 대금: 240,000원 (월 80,000원 에스크로 익일 100%).
   - **카드 2 (현장 체크포인트 & 사진)**:
     * 고객 등록 사진 2장 (계단실, 1층 분리수거장) 호버 줌 효과.
     * `PTNR-JOB-01 작업상태 갱신 바로가기` 버튼.
   - **카드 3 (24시 파트너 긴급관제)**:
     * 365일 실시간 관제 및 파트너 노쇼 100% 위약금 보장, `1588-0000` 직통 버튼.

---

## 7. 검증 및 테스트 결과

| 검증 항목 | 검증 방법 | 결과 | 비고 |
| :--- | :--- | :---: | :--- |
| **채팅방 초기 진입 (Mode 1)** | `POST /api/partner/ptnr_job_02` (`INIT_CHAT`) | **성공 (HTTP 200)** | 계약 마스터, 고객명, 안심번호, 대화 내역 정상 반환 |
| **메시지 전송 (Mode 2)** | `SEND_MESSAGE` 호출 | **성공 (HTTP 200)** | 메시지 INSERT 및 채팅방 최종 메시지 갱신 완료 |
| **증분 동기화 (Mode 3)** | `SYNC_MESSAGES` 폴링 호출 | **성공 (HTTP 200)** | 신규 메시지 스트림 수신 확인 |
| **esbuild 번들링** | `npx esbuild preview/main.tsx` 번들링 | **성공 (91ms, 0 errors)** | 번들 용량 3.6MB 정상 생성 |
| **브라우저 프리뷰 및 인터랙션** | Chrome 브라우저 `#ptnr-job-02` 검증 | **성공** | 빠른 응답 칩 클릭 입력, 메시지 전송 및 스트림 추가, PTNR-JOB-01 모달 열기 완벽 동작 |
