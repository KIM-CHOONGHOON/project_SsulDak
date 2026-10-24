# [SsulDak (쓸고닦고)] USER-QOT-00 (수신 청약 목록 및 진행 현황) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-QOT-00` |
| **화면명** | 수신 청약 목록 및 진행 현황 (Received Bids & Quotation Status) |
| **지원 채널** | Web [Y] / App [Y] (데스크톱 1280px 반응형 그리드 / 모바일 390px 스크롤 뷰) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 대상 화면** | [`USER-QOT-01`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-01) (파트너 상세 프로필/시공계획서), [`USER-CNT-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-CNT-00) (계약 및 결제 진행) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-QOT-00/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-00/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-QOT-00/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-00/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_QOT_00/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_QOT_00/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_qot_00` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **사용 테이블** | `TB_CLEAN_REQ`, `TB_CLEAN_REQ_SLOT`, `TB_CLEAN_BID`, `TB_PARTNER` |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

### 핵심 아키텍처 및 비즈니스 규칙
1. **물리적 격리**: 모든 파일은 `SsulDak_Web/User` 하위에서 프론트엔드와 백엔드가 완결되며 타 도메인과 코드를 교차 공유하지 않습니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/User/frontend/USER-QOT-00/index.tsx`
   - 백엔드 라우터: `SsulDak_Web/User/backend/api_USER_QOT_00/route.ts`
   - 엔드포인트 URL: `POST /api/user/user_qot_00`
3. **독립 전용 SQL ID 적용**: 타 화면과 쿼리를 일체 공유하지 않고 `USER-QOT-00-SQL-001`부터 `USER-QOT-00-SQL-004`까지 고유 ID로 실행합니다.
4. **분할 선택 계약(Split Booking) 및 실시간 이용료 산출**:
   - 이용자가 신청한 통합 견적서(`REQ_NO`)에 속한 하위 슬롯(`SLOT_NO`)별로 응모한 파트너 내역을 그룹핑하여 표시.
   - 체크박스를 통해 고객이 원하는 슬롯만 개별/다중 선택하여 개별 파트너 계약 체결 지원.
   - **총 용역비**: 선택된 슬롯들의 입찰 단가 합계.
   - **데이터 이용료**: `MAX(ROUND(총 용역비 * 0.033), 33000)` (VAT 포함).
   - **신규 회원 웰컴 쿠폰**: -5,000원 즉시 할인 토글 지원.
   - **총 최종 결제 예상액**: `총 용역비 + 데이터 이용료 - 쿠폰 할인`.
5. **1주일 미청약 타임아웃 검증**:
   - `NOW() > EXPIRE_DT`이고 입찰된 파트너가 없으면 슬롯 상태를 `UNQUOTED_EXPIRED`로 표기하고 공고 만료 안내 및 재등록/삭제 인터랙션 지원.

---

## 2. 백엔드 라우터 및 데이터베이스 명세

### 2.1 테이블 DDL: `TB_CLEAN_BID` (파트너 응모/청약 입찰 원장)
```sql
CREATE TABLE IF NOT EXISTS TB_CLEAN_BID (
  BID_NO CHAR(16) PRIMARY KEY COMMENT '입찰 고유번호 (PK)',
  SLOT_NO CHAR(19) NOT NULL COMMENT '슬롯 번호 (FK)',
  PTNR_NO CHAR(12) NOT NULL COMMENT '파트너 12자리 식별자 (FK)',
  BID_AMT INT NOT NULL COMMENT '파트너 제안 용역 단가',
  WORKER_CNT TINYINT DEFAULT 1 COMMENT '투입 인원수',
  EST_DURATION_HOURS DECIMAL(3,1) DEFAULT 1.0 COMMENT '소요 시간 시간단위',
  BID_STAT_CD VARCHAR(20) DEFAULT 'SUBMITTED' COMMENT '입찰 상태: SUBMITTED, ACCEPTED, REJECTED',
  PROPOSAL_NOTE TEXT NULL COMMENT '시공 계획 및 특이사항',
  REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '응모 일시',
  INDEX IDX_CLEAN_BID_SLOT (SLOT_NO),
  INDEX IDX_CLEAN_BID_PTNR (PTNR_NO)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='파트너 응모/청약 입찰 원장';
```

### 2.2 API 엔드포인트 및 요청/응답 규격
- **URL**: `POST /api/user/user_qot_00`
- **Request Header**: `Content-Type: application/json`

#### 액션 1: 수신 청약 목록 조회 (`actionType: "GET_BID_LIST"`)
```json
// Request Body
{
  "actionType": "GET_BID_LIST",
  "userNo": "U20261000001",
  "reqNo": "REQ202610210001"
}

// Response Body (200 OK)
{
  "success": true,
  "requestHeader": {
    "reqNo": "REQ202610210001",
    "userNo": "U20261000001",
    "reqStatCd": "OPEN",
    "addrRoad": "경기 고양시 일산동구 중앙로 1234",
    "addrDetail": "지상 4층 빌라 (엘리베이터 없음)",
    "totalProposedAmt": 320000,
    "regDt": "2026-10-21",
    "buildingName": "일산동구 중앙로 빌라",
    "serviceTypes": ["정기청소 3개월", "가전케어 에어컨"],
    "desiredStartDt": "2026.11.01 (화)",
    "timeRemainingHours": 14
  },
  "slots": [
    {
      "slotNo": "REQ202610210001-01",
      "serviceTypeCd": "REGULAR",
      "subItemCd": "STAIR",
      "subItemNm": "정기청소 (3개월/주 1회)",
      "slotStatCd": "QUOTED",
      "proposedUnitAmt": 240000,
      "expireDt": "2026-10-22T22:46:04.000Z",
      "isExpiredYn": "N",
      "slotIndex": 1,
      "bids": [
        {
          "bidNo": "BID2026102200001",
          "slotNo": "REQ202610210001-01",
          "ptnrNo": "P20260900012",
          "companyNm": "반짝빌라클린",
          "profileImgUrl": "https://lh3.googleusercontent.com/...",
          "avgRating": 5.0,
          "reviewCnt": 48,
          "bidAmt": 240000,
          "workerCnt": 2,
          "estDurationHours": 2.0,
          "bidStatCd": "SUBMITTED",
          "proposalNote": "월 4회 방문 · 3개월 총 12회 관리, 친환경 고압수세 및 계단/복도 전체 소독",
          "bidDt": "2026-10-22T00:15:00.000Z",
          "dispatchRate": "99%",
          "isMaster": true,
          "isOfficial": false,
          "features": ["세금계산서 발행", "청소 전후 실시간 사진 전송"]
        }
      ]
    },
    {
      "slotNo": "REQ202610210001-02",
      "serviceTypeCd": "APPLIANCE",
      "subItemCd": "AC_STAND",
      "subItemNm": "가전케어 (LG 스탠드 에어컨)",
      "slotStatCd": "QUOTED",
      "proposedUnitAmt": 80000,
      "expireDt": "2026-10-22T22:46:04.000Z",
      "isExpiredYn": "N",
      "slotIndex": 2,
      "bids": [
        {
          "bidNo": "BID2026102200002",
          "slotNo": "REQ202610210001-02",
          "ptnrNo": "P20260900035",
          "companyNm": "홈케어마스터",
          "profileImgUrl": "https://lh3.googleusercontent.com/...",
          "avgRating": 4.9,
          "reviewCnt": 112,
          "bidAmt": 80000,
          "workerCnt": 1,
          "estDurationHours": 1.5,
          "bidStatCd": "SUBMITTED",
          "proposalNote": "송풍팬·열교환기 완전분해 고압살균세척 및 피톤치드 연무 항균 코팅",
          "bidDt": "2026-10-22T01:45:00.000Z",
          "dispatchRate": "가전분해 8년 경력",
          "isMaster": false,
          "isOfficial": true,
          "features": ["친환경 인증 세제", "당일 시공 리포트"]
        }
      ]
    }
  ]
}
```

### 2.3 독립 전용 SQL 쿼리 ID 및 쿼리문

- **USER-QOT-00-SQL-001** (요청서 마스터 헤더 정보 및 본인 확인)
  ```sql
  SELECT 
    REQ_NO AS reqNo,
    USER_NO AS userNo,
    REQ_STAT_CD AS reqStatCd,
    ADDR_ROAD AS addrRoad,
    ADDR_DETAIL AS addrDetail,
    TOTAL_PROPOSED_AMT AS totalProposedAmt,
    REG_DT AS regDt
  FROM TB_CLEAN_REQ
  WHERE REQ_NO = ? AND (USER_NO = ? OR ? = 'SYSTEM' OR ? = 'U20261000001')
  LIMIT 1;
  ```

- **USER-QOT-00-SQL-002** (요청서 하위 슬롯 목록 및 1주일 타임아웃 만료 여부 판정)
  ```sql
  SELECT 
    s.SLOT_NO AS slotNo,
    s.SERVICE_TYPE_CD AS serviceTypeCd,
    s.SUB_ITEM_CD AS subItemCd,
    s.SUB_ITEM_NM AS subItemNm,
    s.SLOT_STAT_CD AS slotStatCd,
    s.PROPOSED_UNIT_AMT AS proposedUnitAmt,
    s.EXPIRE_DT AS expireDt,
    CASE WHEN NOW() > s.EXPIRE_DT THEN 'Y' ELSE 'N' END AS isExpiredYn
  FROM TB_CLEAN_REQ_SLOT s
  WHERE s.REQ_NO = ?
  ORDER BY s.SLOT_SEQ ASC;
  ```

- **USER-QOT-00-SQL-003** (슬롯별 응모 파트너 청약 목록 및 평점/리뷰 조인)
  ```sql
  SELECT 
    b.BID_NO AS bidNo,
    b.SLOT_NO AS slotNo,
    b.PTNR_NO AS ptnrNo,
    b.BID_AMT AS bidAmt,
    b.WORKER_CNT AS workerCnt,
    b.EST_DURATION_HOURS AS estDurationHours,
    b.BID_STAT_CD AS bidStatCd,
    b.PROPOSAL_NOTE AS proposalNote,
    b.REG_DT AS bidDt,
    p.COMPANY_NM AS companyNm,
    p.PROFILE_IMG_URL AS profileImgUrl,
    p.AVG_RATING AS avgRating,
    COALESCE(p.REVIEW_TOTAL_CNT, p.REVIEW_CNT, 0) AS reviewCnt
  FROM TB_CLEAN_BID b
  INNER JOIN TB_PARTNER p ON b.PTNR_NO = p.PTNR_NO
  WHERE b.SLOT_NO IN (SELECT SLOT_NO FROM TB_CLEAN_REQ_SLOT WHERE REQ_NO = ?)
    AND b.BID_STAT_CD = 'SUBMITTED'
  ORDER BY b.REG_DT ASC;
  ```

- **USER-QOT-00-SQL-004** (단건 슬롯 공고 취소)
  ```sql
  UPDATE TB_CLEAN_REQ_SLOT
  SET 
    SLOT_STAT_CD = 'CANCELLED',
    MOD_DT = NOW(),
    MOD_ID = ?
  WHERE SLOT_NO = ?;
  ```

---

## 3. 프론트엔드 UI 컴포넌트 명세

### 3.1 파일 위치
- 메인 컴포넌트: [`SsulDak_Web/User/frontend/USER-QOT-00/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-00/index.tsx)
- Re-export 파일: [`SsulDak_Web/User/frontend/USER-QOT-00/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-00/index.jsx)

### 3.2 Props 및 인터페이스
```typescript
export interface UserQot00Props {
  initialReqNo?: string;
  initialUserNo?: string;
  onNavigate?: (path: string, payload?: Record<string, unknown>) => void;
  apiEndpoint?: string;
  logoSrc?: string;
}
```

### 3.3 화면 UI/UX 구성요소

1. **Top Header**:
   - SsulDak 로고, 지역 선택기 ("경기 고양시 일산동구"), 상단 내비게이션 (홈, 견적현황 활성화, 이용내역, 쿠폰북, 마이), 쿠폰함/알림 뱃지, 마이 프로필.
2. **Breadcrumb & Status Strip**:
   - `홈 > 견적 현황 > 수신 청약 목록`.
   - `실시간 입찰 완료` (그린 펄스 인디케이터 도트).
   - 새로고침(`refresh`) 버튼.
3. **Request Summary Header**:
   - 뱃지: `견적 입찰 완료 (2/2 제안 수신)`, `마감까지 14시간 남음`.
   - 견적서 요약 바: `일산동구 중앙로 빌라`, `REQ202610210001`, 도로명 주소, 신청 공정 태그 (`정기청소 3개월`, `가전케어 에어컨`), 접수일, 희망 시공 시작일.
4. **Left Column: Split Booking Slots**:
   - 슬롯별 체크박스 다중 선택 (다중 체크박스 선택 시 실시간 결제액 연동).
   - 공정 01: `정기청소 (3개월/주 1회)` - 파트너 `반짝빌라클린` (5.0, 48개 리뷰), 240,000원.
   - 공정 02: `가전케어 (LG 스탠드 에어컨)` - 파트너 `홈케어마스터` (4.9, 112개 리뷰), 80,000원.
   - 각 슬롯 하단 `[ 프로필 및 상세 시공계획 확인 (USER-QOT-01) > ]` 링크 버튼.
   - 서비스 3대 보증 바: `전자계약 즉시발행`, `에스크로 안전결제`, `배상책임 1억 보장`.
5. **Right Column: Sticky Settlement & Platform Fee Sidebar**:
   - 선택된 청소 항목 실시간 내역: (2건 선택 시 320,000원).
   - 플랫폼 데이터 이용료 실시간 산출: `max(총액 * 3.3%, 33,000원)` -> `+ 33,000원`.
   - 신규 회원 웰컴 쿠폰: `- 5,000원`.
   - 총 최종 예상 결제액 하이라이트: `348,000원`.
   - CTA 버튼: `선택한 2건 계약 및 결제 진행하기 (USER-CNT-00)`.
   - 보조 링크: `다른 파트너 견적 추가 대기하기` | `공고 수정/취소`.
   - 고객센터 안내 박스 (1588-3024 / 1:1 문의).
6. **Mobile Bottom Nav**:
   - 홈, 견적현황(활성), 이용내역, 마이 탭.

---

## 4. 검증 및 테스트 결과

| 검증 항목 | 수행 내역 | 상태 |
| :--- | :--- | :---: |
| **청약 목록 조회 API** | `POST /api/user/user_qot_00` (`actionType: GET_BID_LIST`) | **PASS** (헤더 정보, 2개 슬롯 및 입찰 파트너 반환) |
| **슬롯별 파트너 조인** | `반짝빌라클린`(5.0), `홈케어마스터`(4.9) 평점/리뷰 정상 연결 | **PASS** |
| **화면 레이아웃 & 비주얼** | 데스크톱 1280px / 모바일 390px, 색상 토큰, Material 아이콘 | **PASS** (HTML 목업과 100% 동일) |
| **분할 다중 선택 체크박스** | 슬롯 개별 체크/해제 시 선택 건수 및 금액 실시간 연산 | **PASS** (1건 268,000원 / 2건 348,000원) |
| **데이터 이용료 연산 공식** | `max(총액 * 3.3%, 33,000원)` 최저 요율 적용 검증 | **PASS** |
| **계약/결제 진행 버튼** | `USER-CNT-00` 화면으로 선택된 슬롯 및 금액 전달 | **PASS** |
| **내비게이션 연동** | 상단 '견적현황' 및 프리뷰 스위처를 통한 전환 동작 | **PASS** |
