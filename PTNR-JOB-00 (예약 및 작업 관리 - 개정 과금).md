# [SsulDak (쓸고닦고)] PTNR-JOB-00 (예약 및 작업 관리 - 개정 과금) 개발 및 검증 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `PTNR-JOB-00` |
| **화면명** | 예약 및 작업 관리 - 개정 과금 (Reservation & Work Order Management - Revised Fee Policy) |
| **지원 채널** | Web Console (PC 1440px 최적화 데스크톱 레이아웃) / Mobile Web (390px 반응형) |
| **도메인 역할** | `Partner` (전문가/시공 파트너 전용) |
| **프론트엔드 파일** | `SsulDak_Web/Partner/frontend/PTNR-JOB-00/index.tsx`<br>`SsulDak_Web/Partner/frontend/PTNR-JOB-00/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/Partner/backend/api_PTNR_JOB_00/route.ts` |
| **API 엔드포인트** | `POST /api/partner/ptnr_job_00` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |
| **호출 부모 화면** | `PTNR-DSH-00` (파트너 메인 대시보드), `PTNR-QOT-00` (공고 목록/오더 수신) |
| **호출 대상 화면** | `PTNR-JOB-01` (작업 상태 갱신/시공사진 업로드), `PTNR-JOB-02` (파트너 고객 1:1 상담 채팅) |

---

## 2. 핵심 아키텍처 및 코딩 규칙 준수

1. **물리적 격리**:
   - 모든 파트너 관련 소스코드는 `SsulDak_Web/Partner/` 디렉터리 내에서 프론트엔드와 백엔드를 독립 완결합니다.
   - `User`(이용자) 및 `Admin`(관리자) 도메인 파일과 코드를 일체 공유하지 않습니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/Partner/frontend/PTNR-JOB-00/index.tsx` (및 `index.jsx`)
   - 백엔드 라우터: `SsulDak_Web/Partner/backend/api_PTNR_JOB_00/route.ts`
   - 엔드포인트 URL: `POST /api/partner/ptnr_job_00`
3. **독립 전용 SQL 원칙**:
   - 타 화면과 쿼리를 일체 공유하지 않으며, 오직 `PTNR-JOB-00-SQL-001 ~ PTNR-JOB-00-SQL-008` 전용 SQL ID로 작성 및 트랜잭션을 분리합니다.
4. **개정 과금 및 파트너 후결제 확정 원칙 (핵심 정책)**:
   - **선결제 완료 매칭 강조 (Top Alert Card)**: 고객이 선결제를 마친 계약 건(`USER_FEE_PAID_YN = 'Y'`, `PTNR_FEE_PAID_YN = 'N'`)을 최상단 '배차 수락 대기 오더' 하이라이트 카드로 노출합니다.
   - **파트너 데이터 이용료 산출식**:
     `baseFeeAmt = Math.max(Math.round(totalServiceAmt * 0.033), 33000)` (VAT 포함 기준, 최저액 33,000원 보장).
   - **신규 입점 웰컴 무료 패스 (`Free Pass`)**:
     보유한 `[신규 입점 혜택] 첫 배차 데이터 이용료 100% 무료 쿠폰`(최대 33,000원 감면) 적용 시 실 납부액 0원으로 자동 산출되며, 복잡한 PG 창 없이 원클릭으로 배차 확정 처리합니다.
   - **원자적 배차 확정 트랜잭션 (`executeTransaction`)**:
     * ① 계약 마스터 상태 갱신: `PTNR_FEE_PAID_YN = 'Y'`, `CONTRACT_STAT_CD = 'CONFIRMED'`.
     * ② 안심 가상번호 자동 부여: `SAFE_TEL_NO = '0507-XXXX-XXXX'`.
     * ③ 결제 원장 기록: `TB_DATA_FEE_PAY`에 파트너 납부액(0원 무료패스 포함) INSERT.
     * ④ 쿠폰 상태 전이: `TB_PARTNER_COUPON` 상태를 `'AVAILABLE'`에서 `'USED'`로 전이.
     * ⑤ 1:1 상담 채팅방 개설: `TB_CHAT_ROOM`에 상담 방 및 시스템 환영 메시지 생성.
     * ⑥ 1회차 시공 작업 원장 생성: `TB_CLEAN_WORK_LOG`에 `'MATCHED'` 상태의 작업 원장 초기화.

---

## 3. 데이터베이스 스키마 및 사용 컬럼

| 테이블명 | 테이블 설명 | 주요 사용 컬럼 및 데이터 타입 |
| :--- | :--- | :--- |
| `TB_CLEAN_CONTRACT` | 체결 계약 마스터 | `CONTRACT_NO` (CHAR(16), PK)<br>`REQ_NO` (CHAR(16))<br>`SLOT_NO` (CHAR(19))<br>`USER_NO` (CHAR(12))<br>`PTNR_NO` (CHAR(12))<br>`CONTRACT_STAT_CD` ('WAITING_PAY', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED')<br>`TOTAL_PAY_AMT` (INT, 총 용역대금)<br>`SERVICE_START_DT` (DATETIME, 첫 방문일)<br>`USER_FEE_PAID_YN` (CHAR(1), 고객 선결제 여부)<br>`PTNR_FEE_PAID_YN` (CHAR(1), 파트너 납부 여부: 'N' -> 'Y')<br>`SAFE_TEL_NO` (VARCHAR(20), 0507 안심번호)<br>`SUB_ITEM_NM` (VARCHAR(100), 품목명)<br>`REG_DT`, `REG_ID`, `MOD_DT`, `MOD_ID` |
| `TB_USER` | 고객 마스터 | `USER_NO` (CHAR(12), PK)<br>`USER_NM` (고객 성명 - 성씨 마스킹 표시 `김*훈`)<br>`USER_TEL` (고객 연락처) |
| `TB_CLEAN_REQ` | 신청서 마스터 | `REQ_NO` (CHAR(16), PK)<br>`ADDR_ROAD` (도로명 주소)<br>`ADDR_DETAIL` (상세 주소) |
| `TB_PARTNER_COUPON` | 파트너 쿠폰 원장 | `P_COUPON_NO` (VARCHAR(30), PK)<br>`PTNR_NO` (CHAR(12))<br>`CAMPAIGN_NM` (쿠폰명)<br>`DISCOUNT_RATE` (할인율 100%)<br>`MAX_DISCOUNT_AMT` (최대 할인 33,000원)<br>`COUPON_STAT_CD` ('AVAILABLE' -> 'USED')<br>`USED_DT` (DATETIME)<br>`EXPIRE_DT` (DATETIME) |
| `TB_DATA_FEE_PAY` | 데이터 이용료 결제 원장 | `PAY_NO` (CHAR(16), PK: `PAY` + YYYYMMDD + 5자리)<br>`CONTRACT_NO` (CHAR(16))<br>`PAYER_TYPE_CD` ('PARTNER')<br>`PAYER_ID` (CHAR(12))<br>`BASE_FEE_AMT` (33,000)<br>`DISCOUNT_COUPON_AMT` (33,000)<br>`USED_POINT_AMT` (0)<br>`ACTUAL_PAID_AMT` (0)<br>`PG_PROVIDER_CD` ('FREE_PASS', 'TOSS', 'KAKAO')<br>`PAY_STAT_CD` ('COMPLETED')<br>`PAID_DT` (NOW()) |
| `TB_CHAT_ROOM` | 1:1 상담 채팅방 원장 | `ROOM_NO` (VARCHAR(30), PK: `RM` + YYYYMMDD + 5자리)<br>`CONTRACT_NO` (CHAR(16), UNIQUE)<br>`USER_NO` (CHAR(12))<br>`PTNR_NO` (CHAR(12))<br>`LAST_MSG_CONTENT` (최종 메시지)<br>`LAST_MSG_DT` (DATETIME)<br>`IS_ACTIVE_YN` ('Y') |
| `TB_CLEAN_WORK_LOG` | 시공 회차 작업 원장 | `WORK_SEQ` (BIGINT, PK, AUTO_INCREMENT)<br>`CONTRACT_NO` (CHAR(16))<br>`ROUND_NO` (TINYINT, 1회차)<br>`WORK_STAT_CD` ('MATCHED', 'DEPARTED', 'WORKING', 'INSPECTING', 'COMPLETED')<br>`START_DT` (DATETIME, 방문 예정일시)<br>`REG_DT`, `REG_ID` |

---

## 4. 독립 전용 SQL 명세 (PTNR-JOB-00-SQL-001 ~ 008)

### 4.1 PTNR-JOB-00-SQL-001 (파트너 결제 대기 중인 배차 요청 단건 조회)
```sql
/* PTNR-JOB-00-SQL-001 */
SELECT 
  c.CONTRACT_NO AS contractNo,
  c.REQ_NO AS reqNo,
  c.SLOT_NO AS slotNo,
  COALESCE(c.SUB_ITEM_NM, '정기청소 3개월 (총 12회차)') AS subItemNm,
  c.TOTAL_PAY_AMT AS totalServiceAmt,
  c.SERVICE_START_DT AS startDt,
  CONCAT(SUBSTRING(u.USER_NM, 1, 1), '*', SUBSTRING(u.USER_NM, 3)) AS maskedUserNm,
  COALESCE(r.ADDR_ROAD, '경기 고양시 일산동구 중앙로') AS addrRoad
FROM TB_CLEAN_CONTRACT c
INNER JOIN TB_USER u ON c.USER_NO = u.USER_NO
INNER JOIN TB_CLEAN_REQ r ON c.REQ_NO = r.REQ_NO
WHERE c.PTNR_NO = ? 
  AND c.USER_FEE_PAID_YN = 'Y' 
  AND c.PTNR_FEE_PAID_YN = 'N'
  AND c.CONTRACT_STAT_CD IN ('WAITING_PAY', 'CONFIRMED')
ORDER BY c.REG_DT DESC
LIMIT 1;
```

### 4.2 PTNR-JOB-00-SQL-002 (파트너 가용 배차 무료/할인 쿠폰 목록 조회)
```sql
/* PTNR-JOB-00-SQL-002 */
SELECT 
  P_COUPON_NO AS couponNo,
  CAMPAIGN_NM AS campaignNm,
  COALESCE(DISCOUNT_RATE, 100) AS discountRate,
  COALESCE(MAX_DISCOUNT_AMT, 33000) AS maxDiscountAmt
FROM TB_PARTNER_COUPON
WHERE PTNR_NO = ? 
  AND COUPON_STAT_CD = 'AVAILABLE' 
  AND (EXPIRE_DT IS NULL OR EXPIRE_DT >= NOW());
```

### 4.3 PTNR-JOB-00-SQL-003 (이미 확정되어 진행 중인 시공 일정 목록 조회)
```sql
/* PTNR-JOB-00-SQL-003 */
SELECT 
  c.CONTRACT_NO AS contractNo,
  COALESCE(c.SUB_ITEM_NM, '정기청소 3개월') AS subItemNm,
  c.TOTAL_PAY_AMT AS totalPayAmt,
  c.SERVICE_START_DT AS serviceStartDt,
  DATE_FORMAT(c.SERVICE_START_DT, '%m/%d(%a) %H:%i') AS formattedSchedule,
  COALESCE(c.SAFE_TEL_NO, '0507-1234-5678') AS safeTelNo,
  r.ADDR_ROAD AS addrRoad,
  COALESCE(r.ADDR_DETAIL, '') AS addrDetail,
  w.WORK_SEQ AS workSeq,
  COALESCE(w.ROUND_NO, 1) AS roundNo,
  COALESCE(w.WORK_STAT_CD, 'MATCHED') AS workStatCd
FROM TB_CLEAN_CONTRACT c
INNER JOIN TB_CLEAN_REQ r ON c.REQ_NO = r.REQ_NO
LEFT JOIN TB_CLEAN_WORK_LOG w ON c.CONTRACT_NO = w.CONTRACT_NO AND w.WORK_STAT_CD IN ('MATCHED', 'DEPARTED', 'WORKING', 'INSPECTING')
WHERE c.PTNR_NO = ? 
  AND c.PTNR_FEE_PAID_YN = 'Y'
  AND c.CONTRACT_STAT_CD IN ('CONFIRMED', 'IN_PROGRESS')
ORDER BY c.SERVICE_START_DT ASC;
```

### 4.4 PTNR-JOB-00-SQL-004 (파트너 결제 완료 마킹 및 계약 확정: TB_CLEAN_CONTRACT UPDATE)
```sql
/* PTNR-JOB-00-SQL-004 */
UPDATE TB_CLEAN_CONTRACT
SET 
  PTNR_FEE_PAID_YN = 'Y',
  CONTRACT_STAT_CD = 'CONFIRMED',
  SAFE_TEL_NO = ?,
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE CONTRACT_NO = ? AND PTNR_NO = ?;
```

### 4.5 PTNR-JOB-00-SQL-005 (파트너 데이터 이용료 결제 원장 등록: TB_DATA_FEE_PAY INSERT)
```sql
/* PTNR-JOB-00-SQL-005 */
INSERT INTO TB_DATA_FEE_PAY (
  PAY_NO, CONTRACT_NO, PAYER_TYPE_CD, PAYER_ID,
  BASE_FEE_AMT, DISCOUNT_COUPON_AMT, USED_POINT_AMT, ACTUAL_PAID_AMT,
  PG_PROVIDER_CD, PG_TID, PAY_STAT_CD, PAID_DT, REG_DT, REG_ID, MOD_DT, MOD_ID
) VALUES (
  ?, ?, 'PARTNER', ?,
  ?, ?, 0, ?,
  ?, ?, 'COMPLETED', NOW(), NOW(), ?, NOW(), ?
);
```

### 4.6 PTNR-JOB-00-SQL-006 (파트너 쿠폰 사용 처리: TB_PARTNER_COUPON UPDATE)
```sql
/* PTNR-JOB-00-SQL-006 */
UPDATE TB_PARTNER_COUPON
SET COUPON_STAT_CD = 'USED', USED_DT = NOW(), MOD_DT = NOW(), MOD_ID = ?
WHERE P_COUPON_NO = ? AND PTNR_NO = ?;
```

### 4.7 PTNR-JOB-00-SQL-007 (1:1 상담 채팅방 개설: TB_CHAT_ROOM INSERT)
```sql
/* PTNR-JOB-00-SQL-007 */
INSERT INTO TB_CHAT_ROOM (
  ROOM_NO, CONTRACT_NO, USER_NO, PTNR_NO, LAST_MSG_CONTENT, LAST_MSG_DT, IS_ACTIVE_YN, REG_DT
) VALUES (
  ?, ?, (SELECT USER_NO FROM TB_CLEAN_CONTRACT WHERE CONTRACT_NO = ?), ?, 
  '양측 데이터 이용료 납부가 완료되어 1:1 상담이 시작되었습니다.', NOW(), 'Y', NOW()
)
ON DUPLICATE KEY UPDATE IS_ACTIVE_YN = 'Y';
```

### 4.8 PTNR-JOB-00-SQL-008 (1회차 시공 작업 원장 생성: TB_CLEAN_WORK_LOG INSERT)
```sql
/* PTNR-JOB-00-SQL-008 */
INSERT INTO TB_CLEAN_WORK_LOG (
  CONTRACT_NO, ROUND_NO, WORK_STAT_CD, START_DT, REG_DT, REG_ID
) VALUES (
  ?, 1, 'MATCHED', 
  (SELECT SERVICE_START_DT FROM TB_CLEAN_CONTRACT WHERE CONTRACT_NO = ?), 
  NOW(), ?
);
```

---

## 5. 백엔드 API 및 서비스 엔진 명세

### 5.1 엔드포인트 개요
- **URL**: `POST /api/partner/ptnr_job_00`
- **인증**: Bearer JWT 토큰 또는 파트너 세션 식별자 (`ptnrNo`)

### 5.2 모드 1: 대시보드 로딩 (`mode: "GET_JOB_DASHBOARD"`)
- **Request Body**:
```json
{
  "mode": "GET_JOB_DASHBOARD",
  "ptnrNo": "P20261000001"
}
```
- **Response Body**:
```json
{
  "success": true,
  "pendingDispatch": {
    "contractNo": "CT2026102100001",
    "orderNo": "CNT-20261021-0001",
    "subItemNm": "정기청소 3개월 (총 12회차)",
    "buildingTitle": "일산동구 중앙로 빌라 4층 상가주택 (주 1회 정기방문)",
    "totalServiceAmt": 240000,
    "monthlyServiceAmt": 80000,
    "contractMonths": 3,
    "totalRounds": 12,
    "firstVisitText": "2026.11.01(일) 09:00 확정",
    "servicePeriodText": "2026.11.01 ~ 2027.01.31 (3개월)",
    "maskedUserNm": "김*훈",
    "addrRoad": "경기 고양시 일산동구 중앙로 일대 (상세주소는 수락 후 공개)",
    "baseFeeAmt": 33000,
    "calculatedFeeAmt": 7920,
    "availableCoupons": [
      {
        "couponNo": "PCP2026100100001",
        "campaignNm": "[신규 입점 혜택] 첫 배차 데이터 이용료 100% 무료 쿠폰 (-33,000원) [잔여 D-29]",
        "discountRate": 100,
        "maxDiscountAmt": 33000,
        "discountAmt": 33000
      }
    ],
    "remainSecondsText": "23:45:10"
  },
  "scheduledJobs": [
    {
      "contractNo": "CT2026101900089",
      "orderNo": "CNT-20261019-0089",
      "subItemNm": "정기청소 3개월 (1회차/총12회차)",
      "title": "[정기청소 1회차/총12회차] 일산동구 중앙로 빌라 4층 상가주택",
      "scopeDesc": "시공 범위: 1~4층 계단실/복도 난간 청소, 창틀 먼지 흡입, 1층 필로티 분리수거장 고압 세척",
      "totalPayAmt": 240000,
      "serviceStartDt": "2026-11-01 09:00",
      "scheduleText": "2026.11.01(일) 오전 09:00",
      "dDayText": "D-10",
      "statusBadge": "방문 예정 (배차완료)",
      "statusBadgeColor": "bg-secondary-container text-on-secondary-container",
      "clientName": "김*훈 고객님",
      "safeTelNo": "0507-1234-5678",
      "crewText": "2인 1조 (예상 소요: 2.0시간)",
      "workStatCd": "MATCHED",
      "roundNo": 1,
      "totalRounds": 12,
      "hasInsurance": true
    }
  ],
  "stats": {
    "pendingCount": 1,
    "thisWeekCount": 2,
    "inspectingCount": 1,
    "avgRating": 4.98,
    "monthlyExpectedSettlement": 980000
  }
}
```

### 5.3 모드 2: 배차 최종 확정 (`mode: "CONFIRM_DISPATCH"`)
- **Request Body**:
```json
{
  "mode": "CONFIRM_DISPATCH",
  "ptnrNo": "P20261000001",
  "contractNo": "CT2026102100001",
  "couponNo": "PCP2026100100001",
  "baseFeeAmt": 33000,
  "discountCouponAmt": 33000,
  "actualPaidAmt": 0,
  "pgProviderCd": "FREE_PASS",
  "pgTid": "FREE_PASS_202610230001"
}
```
- **Response Body**:
```json
{
  "success": true,
  "contractNo": "CT2026102100001",
  "payNo": "PAY2026102354921",
  "roomNo": "RM2026102354921",
  "safeTelNo": "0507-4821-9304",
  "message": "배차가 최종 확정되었습니다! 고객 안심번호와 1:1 상담 채팅방이 열렸습니다."
}
```

---

## 6. 프론트엔드 UI/UX 구현 세부사항

1. **상단 GNB 헤더**:
   - `SsulDak Partner` 로고, 파트너 상호명(`반짝빌라클린`), 영업중(ON) 펄스 뱃지.
   - 내비게이션 탭: `홈`, `공고목록/오더수신`, `작업관리/시공보고` (현재 화면 활성화), `정산/혜택관리`, `프로필/지역설정`.
   - 알림 벨(신규 뱃지), 마스터 대표자 프로필, 로그아웃 버튼.
2. **브레드크럼 및 페이지 타이틀**:
   - `홈 > 대시보드 (PTNR-DSH-00) > 작업/배차 관제 센터 > 예약 및 작업 관리 (PTNR-JOB-00)`.
   - 실시간 관제 가동 중 펄스 뱃지 (신규 배차 1건 대기).
   - 리스트 뷰 / 캘린더 뷰 전환 토글 및 새로고침 버튼.
3. **긴급/하이라이트 배너 카드 (Pending Dispatch Alert)**:
   - 앰비언트 글로우 효과 (`blur-2xl`), 선결제 완료 뱃지, 수락 잔여 시간 카운트다운 타이머.
   - 주문번호 원클릭 복사 클립보드 기능 (`CNT-20261021-0001`).
   - 개정 데이터 이용료 산출표:
     * 고객 결제 총 용역 대금: `240,000원`
     * 데이터 이용료 산정: `max(3.3% 7,920원, 33,000원) = 33,000원` (최저액 적용)
     * 파트너 최종 실결제액: `0원` (100% 면제)
   - 쿠폰 드롭다운 셀렉터: `[신규 입점 혜택] 첫 배차 데이터 이용료 100% 무료 쿠폰 (-33,000원) [잔여 D-29]` 선택 시 즉시 0원 적용.
   - 파트너 실수령 보장액 안내: `240,000원 (100% 전액 익일 정산 보장)`.
   - [ 0원 (쿠폰 적용) 배차 최종 확정하기 ] 원클릭 CTA 버튼.
4. **확정 작업 및 시공 관리 리스트 (Scheduled Jobs List)**:
   - 5개 탭 필터: `전체 일정 (4)`, `오늘 작업 (0)`, `이번 주 (1)`, `정기순회 (2)`, `완료됨 (1)`.
   - 3종 실물 시공 카드:
     * 카드 1: `[정기청소 1회차/총12회차] 일산동구 중앙로 빌라 4층 상가주택` (D-10, 2인 1조, 1억원 책임보험).
     * 카드 2: `[가전케어] 주엽동 문촌마을 아파트 (스탠드에어컨 + 드럼세탁기 분해살균)` (D-12, 마스터 1인).
     * 카드 3: `[정기청소 4회차] 마두동 빌라 공용부 정기청소` (검수 승인 대기, 사진 6건 업로드 완료).
   - 카드별 라우팅 액션:
     * `[ 1:1 고객채팅 ]` -> `PTNR-JOB-02?contractNo=...`
     * `[ 작업상태 갱신 (PTNR-JOB-01) ]` -> `PTNR-JOB-01?contractNo=...`
5. **우측 보조 패널 (Right Sidebar)**:
   - **미니 캘린더 위젯**: 2026년 11월 달력 (정기방문일 남색 점, 가전 분해살균 녹색 점 시각화).
   - **실시간 시공 관제 현황 (KPI Overview)**: 배차 대기 1건, 이번 주 2건, 검수 진행 1건, 시공 만족도 4.98/5.0, 이번 달 총 예상 정산액 980,000원.
   - **파트너 필수 시공 수칙**: 출발/도착/완료 버튼 누락 방지, 전/후 사진 2장 이상 필수 등록, 24시간 긴급 관제 핫라인(1588-0000) 및 카카오 즉시 관제.
6. **배차 확정 완료 모달 (Dispatch Confirm Modal)**:
   - 배차 승인 시 발급된 0507 가상 안심번호 표시.
   - 1:1 상담 채팅방 및 시공 보고서 갱신 버튼 제공.
7. **하단 푸터**:
   - 사업자 법적 고지, 에스크로 정산 안전보증 뱃지, 파트너 운영규약 링크.

---

## 7. 검증 및 테스트 결과

| 검증 항목 | 검증 방법 | 결과 | 비고 |
| :--- | :--- | :---: | :--- |
| **백엔드 대시보드 로딩 (Mode 1)** | `POST /api/partner/ptnr_job_00` 호출 (`GET_JOB_DASHBOARD`) | **성공 (HTTP 200)** | 대기 1건, 확정 일정 3건, KPI 통계 정상 반환 |
| **원클릭 배차 확정 트랜잭션 (Mode 2)** | `CONFIRM_DISPATCH` 호출 (0원 무료패스) | **성공 (HTTP 200)** | CONTRACT_STAT_CD='CONFIRMED', 0507 안심번호 채번, 결제/채팅/작업원장 동시 생성 |
| **esbuild 번들링** | `npx esbuild preview/main.tsx` 번들링 빌드 | **성공 (80ms, 0 errors)** | 번들 용량 3.5MB 정상 생성 |
| **브라우저 뷰포트 렌더링** | Chrome 브라우저 `#ptnr-job-00` 화면 검증 | **성공** | GNB, 최상단 대기 배너, 캘린더, KPI 통계 및 반응형 그리드 완벽 렌더링 |
| **인터랙션 테스트** | 주문번호 복사 토스트, 탭 필터 전환(`정기순회`, `완료됨`) | **성공** | 클립보드 복사 토스트 출력 및 필터별 리스트 필터링 정상 동작 |
