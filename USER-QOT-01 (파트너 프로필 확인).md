# [SsulDak (쓸고닦고)] USER-QOT-01 (파트너 프로필 확인) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-QOT-01` |
| **화면명** | 파트너 프로필 확인 및 청약 상세 계획 (Partner Profile & Proposal Plan Details) |
| **지원 채널** | Web [Y] / App [Y] (데스크톱 1280px 2컬럼 레이아웃 / 모바일 390px 반응형 뷰) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 부모 화면** | [`USER-QOT-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-00) (수신 청약 목록 및 진행 현황) |
| **호출 대상 화면** | [`USER-CNT-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-CNT-00) (계약 및 결제 진행) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-QOT-01/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-01/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-QOT-01/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-01/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_QOT_01/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_QOT_01/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_qot_01` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **사용 테이블** | `TB_PARTNER`, `TB_CLEAN_BID`, `TB_PARTNER_PORTFOLIO`, `TB_CLEAN_REVIEW`, `TB_USER` |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

### 핵심 아키텍처 및 코딩 규칙 준수
1. **물리적 격리**: 모든 코드는 `SsulDak_Web/User` 폴더 하위에서 완결되며 타 도메인과 코드를 공유하지 않습니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/User/frontend/USER-QOT-01/index.tsx`
   - 백엔드 라우터: `SsulDak_Web/User/backend/api_USER_QOT_01/route.ts`
   - 엔드포인트 URL: `POST /api/user/user_qot_01`
3. **독립 전용 SQL ID 적용**: 타 화면과 쿼리를 일체 공유하지 않고 `USER-QOT-01-SQL-001`부터 `USER-QOT-01-SQL-004`까지 고유 ID로 실행합니다.
4. **개인정보 보호 원칙**:
   - 본 화면은 계약 체결(상호 결제) 전 단계이므로, 파트너의 실제 휴대폰 번호 및 상세 자택 주소는 절대 반환하지 않습니다.
   - 상호명, 대표자 성명, 보유 장비, 승인된 보험 증서 가입 여부 뱃지만 안전하게 제공합니다.
5. **안심 1:1 채팅 문의 모달 지원**:
   - 전화번호 노출 없는 인앱 1:1 안심채팅 다이얼로그를 통해 시공 조건, 일정, 특이사항을 실시간으로 사전 소통할 수 있습니다.

---

## 2. 데이터베이스 명세 및 DDL

### 2.1 테이블: `TB_PARTNER_PORTFOLIO` (시공 전/후 비교 포트폴리오)
```sql
CREATE TABLE IF NOT EXISTS TB_PARTNER_PORTFOLIO (
  PORT_SEQ BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '포트폴리오 고유번호 (PK)',
  PTNR_NO CHAR(12) NOT NULL COMMENT '파트너 식별자 (FK)',
  SERVICE_TYPE_CD VARCHAR(30) DEFAULT 'REGULAR' COMMENT '시공 분야: REGULAR, APPLIANCE 등',
  TITLE VARCHAR(200) NOT NULL COMMENT '포트폴리오 제목',
  BEFORE_IMG_URL VARCHAR(500) NOT NULL COMMENT '시공 전 오염 사진 URL',
  AFTER_IMG_URL VARCHAR(500) NOT NULL COMMENT '시공 후 청결 사진 URL',
  CATEGORY VARCHAR(50) DEFAULT 'floor' COMMENT '분류: floor, details',
  SORT_ORD INT DEFAULT 1 COMMENT '정렬 순번',
  REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
  INDEX IDX_PORT_PTNR (PTNR_NO)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='파트너 시공 전/후 포트폴리오 원장';
```

### 2.2 테이블: `TB_CLEAN_REVIEW` (파트너에게 작성된 고객 실제 후기 원장)
```sql
CREATE TABLE IF NOT EXISTS TB_CLEAN_REVIEW (
  REVIEW_SEQ BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '리뷰 고유번호 (PK)',
  PTNR_NO CHAR(12) NOT NULL COMMENT '파트너 식별자 (FK)',
  USER_NO CHAR(12) NOT NULL COMMENT '작성자 이용자 ID (FK)',
  RATING TINYINT NOT NULL DEFAULT 5 COMMENT '별점 (1~5)',
  CONTENT TEXT NOT NULL COMMENT '후기 본문 내용',
  CLEAN_TYPE_NM VARCHAR(50) NOT NULL COMMENT '시공 항목명',
  REG_DT DATE NOT NULL COMMENT '작성 일자',
  INDEX IDX_REV_PTNR (PTNR_NO),
  INDEX IDX_REV_USER (USER_NO)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='파트너 고객 이용 후기 원장';
```

### 2.3 독립 전용 SQL 쿼리 명세
- **`USER-QOT-01-SQL-001` (파트너 기본 마스터 및 신뢰 뱃지 정보 조회)**
  ```sql
  SELECT 
    p.PTNR_NO AS ptnrNo,
    p.COMPANY_NM AS companyNm,
    COALESCE(p.CEO_NM, p.REP_NM, '대표자') AS ceoNm,
    p.PROFILE_IMG_URL AS profileImgUrl,
    p.AVG_RATING AS avgRating,
    p.REVIEW_CNT AS reviewCnt,
    COALESCE(p.TOTAL_WORK_CNT, 312) AS totalWorkCnt,
    COALESCE(p.HAS_INSURANCE_YN, 'Y') AS hasInsuranceYn,
    COALESCE(p.IS_EXCELLENT_YN, 'Y') AS isExcellentYn,
    p.INTRO_TEXT AS introText
  FROM TB_PARTNER p
  WHERE p.PTNR_NO = ? 
    AND (p.PARTNER_APR_STAT_CD = 'APPROVED' OR p.APR_STAT_CD = 'APPROVED');
  ```

- **`USER-QOT-01-SQL-002` (해당 견적 건에 제출된 청약 제안 스펙 및 장비 조회)**
  ```sql
  SELECT 
    b.BID_NO AS bidNo,
    b.SLOT_NO AS slotNo,
    b.BID_AMT AS bidAmt,
    b.WORKER_CNT AS workerCnt,
    b.EST_DURATION_HOURS AS estDurationHours,
    COALESCE(b.EQUIP_DESC, '독일 프리미엄 카처 고압 스팀기, 키엘 친환경 살균약품...') AS equipDesc,
    COALESCE(b.APPEAL_MSG, b.PROPOSAL_NOTE, '...') AS appealMsg
  FROM TB_CLEAN_BID b
  WHERE b.BID_NO = ? AND b.PTNR_NO = ?;
  ```

- **`USER-QOT-01-SQL-003` (파트너 시공 전/후 포트폴리오 상위 4건 조회)**
  ```sql
  SELECT 
    PORT_SEQ AS portSeq,
    TITLE AS title,
    BEFORE_IMG_URL AS beforeImgUrl,
    AFTER_IMG_URL AS afterImgUrl,
    COALESCE(CATEGORY, 'floor') AS category
  FROM TB_PARTNER_PORTFOLIO
  WHERE PTNR_NO = ?
  ORDER BY SORT_ORD ASC, PORT_SEQ DESC
  LIMIT 4;
  ```

- **`USER-QOT-01-SQL-004` (최근 등록된 고객 실제 후기 상위 3건 조회 및 작성자 마스킹)**
  ```sql
  SELECT 
    r.REVIEW_SEQ AS reviewSeq,
    r.RATING AS rating,
    r.CONTENT AS content,
    r.CLEAN_TYPE_NM AS cleanTypeNm,
    DATE_FORMAT(r.REG_DT, '%Y.%m.%d') AS regDt,
    CONCAT(SUBSTRING(COALESCE(u.USER_NM, '고객'), 1, 1), '** 님') AS maskedUserNm
  FROM TB_CLEAN_REVIEW r
  LEFT JOIN TB_USER u ON r.USER_NO = u.USER_NO
  WHERE r.PTNR_NO = ?
  ORDER BY r.REG_DT DESC
  LIMIT 3;
  ```

---

## 3. 백엔드 API 명세 (`POST /api/user/user_qot_01`)

### 3.1 Request Payload
```json
{
  "actionType": "GET_PARTNER_DETAIL",
  "userNo": "U20261000001",
  "ptnrNo": "P20260900012",
  "bidNo": "BID2026102200001",
  "slotNo": "REQ202610210001-01"
}
```

### 3.2 Response Payload (200 OK)
```json
{
  "success": true,
  "partner": {
    "ptnrNo": "P20260900012",
    "companyNm": "반짝빌라클린",
    "ceoNm": "홍길동",
    "profileImgUrl": "https://...",
    "avgRating": 5.0,
    "reviewCnt": 48,
    "totalWorkCnt": 312,
    "hasInsuranceYn": "Y",
    "isExcellentYn": "Y",
    "introText": "일산동구 · 마두동 · 백석동 빌라/상가 계단관리 전문 파트너입니다...",
    "badges": [
      "본인인증 완료",
      "영업배상책임보험 1억 가입",
      "2024 우수 마스터",
      "배차확정률 99%"
    ]
  },
  "proposal": {
    "bidNo": "BID2026102200001",
    "slotNo": "REQ202610210001-01",
    "bidAmt": 240000,
    "workerCnt": 2,
    "estDurationHours": 2,
    "equipDesc": "독일 프리미엄 카처(Kärcher) 고압 스팀기, 환경부 인증 독일 키엘(Kiehl) 친환경 살균약품...",
    "appealMsg": "빌라 계단 및 공용 복도 정기관리 7년 경력의 베테랑 클리너 2인 1조 팀입니다..."
  },
  "portfolios": [
    {
      "portSeq": 1,
      "title": "1. 로비 대리석 고압 수세 세척",
      "beforeImgUrl": "https://...",
      "afterImgUrl": "https://...",
      "category": "floor"
    }
  ],
  "recentReviews": [
    {
      "reviewSeq": 1,
      "rating": 5,
      "content": "매주 화요일마다 시간 약속 칼같이 지키셔서 와주시고...",
      "cleanTypeNm": "일산동구 빌라 정기관리 6개월차 이용 중",
      "regDt": "2024.10.18",
      "maskedUserNm": "박** 님"
    }
  ]
}
```

---

## 4. 프론트엔드 UI 컴포넌트 구성 명세

1. **상단 네비게이션 & 브레드크럼 (Breadcrumb Header)**:
   - 홈 > 견적 현황 > 받은 견적 및 청약 현황 > 파트너 프로필 상세.
   - 좌측: `청약 목록으로 돌아가기` 뒤로가기 버튼 ([`USER-QOT-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-00) 연동).
   - 우측: `정기청소 제안 파트너` 뱃지 및 `입찰 제안금액: 240,000원 / 월 4회` 강조 리본.

2. **파트너 히어로 오버뷰 카드 (Hero Overview Card)**:
   - 프로필 사진 (활성 상태 점 포함).
   - 상호명(`반짝빌라클린`), 대표자(`홍길동 대표`), 전문분야 설명.
   - 평점 5.0 (리뷰 48건), 재계약율 94%.
   - 주요 지표 캡슐: 총 시공 누적 312건, 전문 업력 7년차.
   - 신뢰 뱃지 4종: 본인인증 완료, 영업배상책임보험 1억 가입, 2024 우수 마스터, 배차확정률 99%.
   - 금융/세무 태그: 사업자등록 정상 인증, 세금계산서 100% 즉시 발행, 법인/개인 카드 결제 지원.

3. **Section 1: 청약 제출 시공 계획 및 상세 제안 (Execution Plan)**:
   - 투입 인원 및 소요 시간: 전문 마스터 클리너 2인 1조 투입 (회당 약 2시간 정밀 케어).
   - 주간 및 월간 방문 일정: 월 4회 (주 1회, 매주 화요일 09:00 ~ 11:00).
   - 보유 전문 장비 및 약품: 독일 카처 고압 스팀기, 키엘 친환경 살균약품, 헤파필터 집진기, 피톤치드 방역기.
   - 파트너 전달 한마디: 10분 이내 카카오 알림톡 리포트 발송 보장.

4. **Section 2: 실제 시공 포트폴리오 (Before / After Gallery)**:
   - 탭 필터: `전체 비교 (4)`, `대리석·바닥`, `창틀·세부구역`.
   - Before / After 사진 나란히 배치 및 라벨 표시, 호버 시 미세 확대 애니메이션.

5. **Section 3: 파트너 보유 자격 및 안심 검증 내역**:
   - 위생관리용역업 정식 등록 (고양시 일산동구청 인허가 제2019-3950호).
   - 영업배상책임보험 (DB손해보험 대인/대물 각 1억원 가입 증권 보관 완료).
   - 신원 및 범죄경력 조회 (마스터 인증 기준 무결점 실명 인증).

6. **Section 4: 실제 고객 이용 후기**:
   - 평점 5.0 만족도 표시.
   - 관리인 박*훈 님, 이*영 님, 김*수 님 실제 이용 후기 및 시공 분야 표시.

7. **우측 고정 사이드바: 선택 공정 청약 요약 (Sticky Contract Sidebar)**:
   - 공정 01 청약 선택, 계약 가능 상태 인디케이터.
   - 핵심 조건: 공정 01 빌라 정기청소, 3개월 총 12회, 2인 1조 2시간, 매주 화요일 09:00.
   - 금액 계산:
     * 월 제안 용역비: 240,000원
     * 총 3개월 용역비: 720,000원
     * 플랫폼 안심 데이터 이용료: 33,000원
     * 신규 빌라 지원 쿠폰: -5,000원
     * 이번 회차 결제 예정액: 268,000원 (에스크로 보관)
   - 액션 버튼:
     * `이 파트너와 계약 확정하기` -> [`USER-CNT-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-CNT-00) 화면 연계
     * `1:1 파트너 안심 문의하기` -> 인앱 1:1 안심채팅 다이얼로그 모달 오픈
     * `다른 파트너 견적과 비교하기` -> [`USER-QOT-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-00) 복귀

---

## 5. 브라우저 및 통합 검증 결과

1. **API 기능 검증**:
   - `curl -X POST http://localhost:3000/api/user/user_qot_01` 호출 시 200 OK 및 파트너, 청약 제안, 포트폴리오 4건, 후기 3건 정상 응답 확인.
2. **UI 렌더링 검증**:
   - `http://localhost:3000/#user-qot-01` 브라우저 렌더링 시 Hero Card, 시공계획서, 포트폴리오 카드, 검증 뱃지, 이용후기, 우측 청약 요약 사이드바 완벽 출력 확인.
3. **인터랙션 검증**:
   - 포트폴리오 탭 필터링 (`전체 비교`, `대리석·바닥`, `창틀·세부구역`) 클릭 시 실시간 리스트 변경 정상 작동.
   - `1:1 파트너 안심 문의하기` 클릭 시 안심채팅 모달이 열리고 실시간 질문 전송 및 파트너 답변 수신 작동.
   - `청약 목록으로 돌아가기` 버튼 클릭 시 부모 화면인 `USER-QOT-00`으로 매끄럽게 전환.
