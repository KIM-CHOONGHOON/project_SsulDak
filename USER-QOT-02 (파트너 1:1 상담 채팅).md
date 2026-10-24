# [SsulDak (쓸고닦고)] USER-QOT-02 (파트너 1:1 상담 채팅) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-QOT-02` |
| **화면명** | 파트너 1:1 안심 상담 채팅 (Partner 1:1 Secure Consultation Chat) |
| **지원 채널** | Web [Y] / App [Y] (데스크톱 1280px 반응형 2컬럼 레이아웃 / 모바일 390px 뷰) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 부모 화면** | [`USER-QOT-01`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-01) (파트너 프로필 확인) 또는 [`USER-HIS-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-00) (계약/시공 내역) |
| **호출 대상 화면** | [`USER-CNT-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-CNT-00) (계약서 상세 보기) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-QOT-02/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-02/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-QOT-02/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-02/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_QOT_02/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_QOT_02/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_qot_02` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **사용 테이블** | `TB_CLEAN_CONTRACT`, `TB_PARTNER`, `TB_CHAT_ROOM`, `TB_CHAT_MESSAGE` |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

### 핵심 아키텍처 및 코딩 규칙 준수
1. **물리적 격리**: 모든 파일은 `SsulDak_Web/User` 폴더 하위에 완결 배치되어 도메인 간 결합도를 최소화합니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/User/frontend/USER-QOT-02/index.tsx`
   - 백엔드 라우터: `SsulDak_Web/User/backend/api_USER_QOT_02/route.ts`
   - 엔드포인트: `POST /api/user/user_qot_02`
3. **독립 전용 SQL ID 적용**: 타 화면과 쿼리를 일체 공유하지 않고 `USER-QOT-02-SQL-001`부터 `USER-QOT-02-SQL-007`까지 고유 ID로 실행합니다.
4. **계약 상태 기반 보안 정책**:
   - 상호 결제가 완료된 계약(`CONTRACT_STAT_CD IN ('CONFIRMED', 'IN_PROGRESS', 'COMPLETED')`)만 채팅방 진입이 허용됩니다.
   - 결제 대기(`WAITING_PAY`) 상태인 경우 403 Forbidden (`PAYMENT_REQUIRED`) 에러로 차단됩니다.
5. **0507 가상 안심번호 통화 연동**:
   - 계약에 발급된 가상번호(`SAFE_TEL_NO`)를 기반으로 헤더에 안심통화 버튼을 제공(`tel:${safeTelNo}` 연동).
6. **감사 컬럼 및 메시지 암호화/보안**:
   - 메시지 등록 시 `REG_DT(NOW())`, `SENDER_ID(USER_NO)` 등 감사 컬럼 자동 기록.
   - 정기 폴링(4초 주기 `SYNC_MESSAGES`) 및 자동 스크롤(`scrollIntoView`) 지원.

---

## 2. 데이터베이스 명세 및 DDL

### 2.1 테이블: `TB_CHAT_ROOM` (1:1 상담 채팅방 마스터)
```sql
CREATE TABLE IF NOT EXISTS TB_CHAT_ROOM (
  ROOM_NO CHAR(16) PRIMARY KEY COMMENT '채팅방 번호 (RM + YYYYMMDD + 5자리)',
  CONTRACT_NO CHAR(16) NOT NULL UNIQUE COMMENT '계약 번호 (FK)',
  USER_NO CHAR(12) NOT NULL COMMENT '이용자 ID (FK)',
  PTNR_NO CHAR(12) NOT NULL COMMENT '파트너 ID (FK)',
  LAST_MSG_CONTENT TEXT COMMENT '최종 메시지 요약',
  LAST_MSG_DT DATETIME COMMENT '최종 메시지 일시',
  IS_ACTIVE_YN CHAR(1) DEFAULT 'Y' COMMENT '활성 여부 (Y/N)',
  REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '개설 일시',
  INDEX IDX_ROOM_USER (USER_NO),
  INDEX IDX_ROOM_PTNR (PTNR_NO)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='계약 1:1 채팅방 매핑 테이블';
```

### 2.2 테이블: `TB_CHAT_MESSAGE` (채팅 메시지 원장)
```sql
CREATE TABLE IF NOT EXISTS TB_CHAT_MESSAGE (
  MSG_SEQ BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '메시지 순번 (PK)',
  ROOM_NO CHAR(16) NOT NULL COMMENT '채팅방 번호 (FK)',
  SENDER_TYPE_CD VARCHAR(20) NOT NULL COMMENT '발신자 구분: USER, PARTNER, SYSTEM',
  SENDER_ID VARCHAR(50) NOT NULL COMMENT '발신자 ID (USER_NO, PTNR_NO, SYSTEM)',
  MSG_TYPE_CD VARCHAR(20) DEFAULT 'TEXT' COMMENT '메시지 유형: TEXT, IMAGE, NOTICE',
  CONTENT TEXT NOT NULL COMMENT '메시지 본문 내용',
  ATTACH_IMG_URL VARCHAR(500) NULL COMMENT '전송 사진/첨부파일 URL',
  IS_READ_YN CHAR(1) DEFAULT 'N' COMMENT '읽음 여부 (Y/N)',
  REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '전송 일시',
  INDEX IDX_MSG_ROOM_SEQ (ROOM_NO, MSG_SEQ)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='채팅 메시지 원장';
```

### 2.3 독립 전용 SQL 쿼리 명세
- **`USER-QOT-02-SQL-001` (계약 유효성, 안심번호 및 파트너 정보 조회)**
  ```sql
  SELECT 
    c.CONTRACT_NO AS contractNo,
    c.CONTRACT_STAT_CD AS contractStatCd,
    c.TOTAL_PAY_AMT AS totalPayAmt,
    c.SERVICE_START_DT AS serviceStartDt,
    c.SAFE_TEL_NO AS safeTelNo,
    c.SUB_ITEM_NM AS subItemNm,
    p.PTNR_NO AS ptnrNo,
    p.COMPANY_NM AS companyNm,
    COALESCE(p.CEO_NM, '홍길동 대표') AS ceoNm,
    p.PROFILE_IMG_URL AS profileImgUrl
  FROM TB_CLEAN_CONTRACT c
  INNER JOIN TB_PARTNER p ON c.PTNR_NO = p.PTNR_NO
  WHERE c.CONTRACT_NO = ? AND c.USER_NO = ?;
  ```

- **`USER-QOT-02-SQL-002` (계약 연계 채팅방 조회 또는 신규 채번 생성)**
  ```sql
  INSERT INTO TB_CHAT_ROOM (
    ROOM_NO, CONTRACT_NO, USER_NO, PTNR_NO, LAST_MSG_CONTENT, LAST_MSG_DT, IS_ACTIVE_YN, REG_DT
  ) VALUES (
    ?, ?, ?, ?, '양측 결제가 완료되어 상담 채팅방이 열렸습니다.', NOW(), 'Y', NOW()
  )
  ON DUPLICATE KEY UPDATE IS_ACTIVE_YN = 'Y';
  ```

- **`USER-QOT-02-SQL-003` (채팅방 기본 정보 조회)**
  ```sql
  SELECT ROOM_NO AS roomNo
  FROM TB_CHAT_ROOM
  WHERE CONTRACT_NO = ?;
  ```

- **`USER-QOT-02-SQL-004` (채팅 메시지 이력 최근 50건 조회)**
  ```sql
  SELECT 
    MSG_SEQ AS msgSeq,
    SENDER_TYPE_CD AS senderType,
    SENDER_ID AS senderId,
    MSG_TYPE_CD AS msgType,
    CONTENT AS content,
    ATTACH_IMG_URL AS attachImgUrl,
    IS_READ_YN AS isReadYn,
    REG_DT AS regDt
  FROM TB_CHAT_MESSAGE
  WHERE ROOM_NO = ?
  ORDER BY MSG_SEQ ASC
  LIMIT 50;
  ```

- **`USER-QOT-02-SQL-005` (새 메시지 전송 및 저장)**
  ```sql
  INSERT INTO TB_CHAT_MESSAGE (
    ROOM_NO, SENDER_TYPE_CD, SENDER_ID, MSG_TYPE_CD, CONTENT, ATTACH_IMG_URL, IS_READ_YN, REG_DT
  ) VALUES (
    ?, 'USER', ?, ?, ?, ?, 'N', NOW()
  );
  ```

- **`USER-QOT-02-SQL-006` (채팅방 최종 메시지 요약 갱신)**
  ```sql
  UPDATE TB_CHAT_ROOM
  SET 
    LAST_MSG_CONTENT = ?,
    LAST_MSG_DT = NOW()
  WHERE ROOM_NO = ?;
  ```

- **`USER-QOT-02-SQL-007` (마지막 MSG_SEQ 이후 신규 메시지 동기화 조회)**
  ```sql
  SELECT 
    MSG_SEQ AS msgSeq,
    SENDER_TYPE_CD AS senderType,
    SENDER_ID AS senderId,
    MSG_TYPE_CD AS msgType,
    CONTENT AS content,
    ATTACH_IMG_URL AS attachImgUrl,
    IS_READ_YN AS isReadYn,
    REG_DT AS regDt
  FROM TB_CHAT_MESSAGE
  WHERE ROOM_NO = ? AND MSG_SEQ > ?
  ORDER BY MSG_SEQ ASC;
  ```

---

## 3. 백엔드 API 명세 (`POST /api/user/user_qot_02`)

### 3.1 채팅방 진입 및 초기화 (`mode: "INIT_CHAT"`)
#### Request Payload
```json
{
  "mode": "INIT_CHAT",
  "userNo": "U20261000001",
  "contractNo": "CT2026102200001"
}
```

#### Response Payload (200 OK)
```json
{
  "success": true,
  "roomNo": "RM2026102200001",
  "contract": {
    "contractNo": "CT2026102200001",
    "contractStatCd": "CONFIRMED",
    "subItemNm": "정기청소 3개월",
    "totalPayAmt": 240000,
    "serviceStartDt": "2026-11-01 09:00:00",
    "safeTelNo": "0507-1234-5678",
    "partner": {
      "ptnrNo": "P20260900012",
      "companyNm": "반짝빌라클린",
      "ceoNm": "홍길동 대표/마스터",
      "profileImgUrl": "https://..."
    }
  },
  "messages": [
    {
      "msgSeq": 1,
      "senderType": "SYSTEM",
      "senderId": "SYSTEM",
      "msgType": "NOTICE",
      "content": "안심 사전 조율방이 개설되었습니다...",
      "attachImgUrl": null,
      "isReadYn": "Y",
      "regDt": "2026-10-22 10:00:00"
    },
    {
      "msgSeq": 2,
      "senderType": "PARTNER",
      "senderId": "P20260900012",
      "msgType": "TEXT",
      "content": "안녕하세요 고객님! 반짝빌라클린 홍길동 대표입니다. 😊...",
      "attachImgUrl": null,
      "isReadYn": "Y",
      "regDt": "2026-10-22 10:14:00"
    }
  ]
}
```

#### 403 Forbidden (미결제 계약 차단 시)
```json
{
  "success": false,
  "code": "PAYMENT_REQUIRED",
  "message": "상호 결제가 완료되어야 1:1 상담 채팅방이 열립니다."
}
```

---

### 3.2 텍스트 및 사진 메시지 전송 (`mode: "SEND_MESSAGE"`)
#### Request Payload
```json
{
  "mode": "SEND_MESSAGE",
  "userNo": "U20261000001",
  "contractNo": "CT2026102200001",
  "msgType": "TEXT",
  "content": "네 기사님! 1층 공동현관 비번은 #1234* 입니다.",
  "imgUrl": null
}
```

#### Response Payload (200 OK)
```json
{
  "success": true,
  "msgSeq": 105,
  "regDt": "2026-10-23 10:15:30"
}
```

---

### 3.3 증분 메시지 동기화 폴링 (`mode: "SYNC_MESSAGES"`)
#### Request Payload
```json
{
  "mode": "SYNC_MESSAGES",
  "contractNo": "CT2026102200001",
  "lastMsgSeq": 104
}
```

#### Response Payload (200 OK)
```json
{
  "success": true,
  "messages": [
    {
      "msgSeq": 105,
      "senderType": "USER",
      "senderId": "U20261000001",
      "msgType": "TEXT",
      "content": "네 기사님! 1층 공동현관 비번은 #1234* 입니다.",
      "attachImgUrl": null,
      "isReadYn": "N",
      "regDt": "2026-10-23 10:15:30"
    }
  ]
}
```

---

## 4. 프론트엔드 UI 컴포넌트 구성 명세

1. **상단 네비게이션 & 브레드크럼 (Breadcrumb & Top Sub-header)**:
   - 브레드크럼: `홈 > 견적 현황 > 반짝빌라클린 파트너 1:1 상담 채팅`.
   - 복귀 버튼: `파트너 프로필로 돌아가기 (USER-QOT-01)`.
   - 서브헤더: 
     * `파트너 1:1 안심 상담 채팅` 타이틀 + `실시간 상담 가능 (매칭 완료)` 펄스 뱃지.
     * `분쟁 케어 100% 보증 에스크로 연계 방` 보안 인디케이터.

2. **Left Column: 인터랙티브 채팅 허브 (Chat Hub - ~68% Width)**:
   - **파트너 헤더 바**:
     * 파트너 프로필 사진 및 온라인 인디케이터 초록점.
     * 상호명(`반짝빌라클린 홍길동 대표/마스터`), `책임 시공` 뱃지, 평점 5.0, 평균 5분 이내 응답 라벨.
     * `0507 안심번호 통화 (녹취적용)` 다이렉트 콜 버튼 (`tel:0507-1234-5678`).
     * 더보기 드롭다운 메뉴 (채팅 신고하기, 파트너 차단, 채팅방 나가기).
   - **Sticky Contract Summary Ribbon (계약 연계 요약 띠)**:
     * `계약 연계: 정기청소 3개월 (240,000원/월) | 첫 방문: 2026.11.01(일) 09:00`
     * 고양시 일산동구 중앙로 빌라 1~4층 복도/계단/주차장.
     * `계약서 보기` 링크 클릭 시 계약 상세 모달 안내.
   - **Scrollable Chat Stream (메시지 스크롤 영역)**:
     * 시스템 웰컴 카드 (에스크로 안전보관 안내, E2EE 암호화 공지).
     * 날짜 구분선: `2026년 10월 22일 목요일`.
     * 파트너 말풍선 (좌측, 화이트 배경, 아바타, 전송 시각).
     * 이용자 말풍선 (우측, Primary Navy 배경, 흰색 텍스트, '읽음' 뱃지, 전송 시각).
     * 이미지 첨부 말풍선: 사진 썸네일 및 클릭 시 원본 확대 모달.
     * 파트너 타이핑 인디케이터 (메시지 전송 시 지능형 자동 응답 지원).
   - **Quick Assist Suggestion Chips (빠른 응답 칩)**:
     * 📸 현장 특이사항 사진 첨부
     * 🔑 추가 열쇠 보관함 위치 안내
     * 🕒 방문 시간 30분 전 사전 연락 요청
     * 칩 클릭 시 텍스트 영역에 자동 문구 삽입 및 포커스.
   - **Bottom Input Dock (하단 고정 입력 영역)**:
     * 파일 첨부 클립 버튼 및 카메라 즉시 촬영 버튼 (모달 및 파일 선택 연동).
     * 메시지 입력 textarea (Enter 전송, Shift+Enter 줄바꿈).
     * Primary Navy 전송 버튼 (Hover 확대 및 Active 스케일 애니메이션).
     * 하단 보안 안내: "욕설, 비방, 직거래 유도 시 이용이 제한될 수 있습니다. | 실시간 종단간 암호화(E2EE) 적용됨".

3. **Right Column: 파트너 정보 & 계약 요약 패널 (Summary Panel - ~32% Width)**:
   - **1. 파트너 마스터 정보 카드**:
     * 상호명, 대표자 성명, 2024 우수마스터 뱃지, 평점 5.0 (리뷰 48건).
     * 통계 그리드: 시공 경력 7년차, 총 시공 건수 312건+.
     * 신뢰 인증 뱃지: 신원/사업자 본인인증 완료, 영업배상책임보험 1억 가입, 환경부 인증 친환경 세제 100%.
   - **2. 계약 세부 정보 카드**:
     * 에스크로 안전보관 라벨.
     * 신청 공정 (빌라 정기청소 주 1회/월 4회), 첫 방문 일정 (2026.11.01 일 09:00), 투입 인원 (2인 1조), 월 청약 대금 (240,000원 VAT 포함).
     * 계약 진행률 75% 원형 게이지 (SVG Circular Progress Indicator).
   - **3. 안심 케어 보증 & 고객 신뢰 지원 센터 위젯**:
     * 0507 가상번호 배정 정책 안내.
     * 고객 신뢰 지원 센터 `1588-3024` 원클릭 통화 버튼.

---

## 5. 브라우저 및 통합 검증 결과

1. **API 기능 검증**:
   - `POST /api/user/user_qot_02` (`INIT_CHAT`):
     * 200 OK 응답 및 계약 정보, 0507 안심번호, 파트너 정보, 최근 대화 내역 반환 확인.
   - `POST /api/user/user_qot_02` (`SEND_MESSAGE`):
     * 200 OK 응답 및 `TB_CHAT_MESSAGE`에 정상 INSERT 및 방 최신 요약 업데이트 확인.
   - `POST /api/user/user_qot_02` (`SYNC_MESSAGES`):
     * 200 OK 응답 및 마지막 시퀀스 이후 신규 등록된 메시지 증분 동기화 확인.
2. **UI 렌더링 검증**:
   - `http://localhost:3000/#user-qot-02` 접속 시 2컬럼 레이아웃, 헤더, 계약 리본, 채팅 스트림, 우측 마스터 정보 카드가 완벽 렌더링됨.
3. **인터랙션 및 자동 스크롤 검증**:
   - 빠른 응답 칩 클릭 시 입력창 자동 채우기 및 포커스 작동.
   - Enter 키 전송 시 내 말풍선이 즉시 렌더링되며, 파트너 자동 응답 메시지 수신 및 스크롤 하단 이동(`scrollIntoView`) 정상 작동.
   - `0507 안심번호 통화` 버튼 클릭 시 `tel:0507-1234-5678` 호출 동작 확인.
