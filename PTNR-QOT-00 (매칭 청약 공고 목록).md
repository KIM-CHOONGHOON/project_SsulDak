# [SsulDak (쓸고닦고)] PTNR-QOT-00 (매칭 청약 공고 목록) 개발 및 검증 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `PTNR-QOT-00` |
| **화면명** | 매칭 청약 공고 목록 (Matching Tender Order Feed) |
| **지원 채널** | Web Console (PC 1440px 최적화) / Mobile Web (390px 반응형 피드) |
| **도메인 역할** | `Partner` (전문가/시공 파트너 전용) |
| **프론트엔드 파일** | `SsulDak_Web/Partner/frontend/PTNR-QOT-00/index.tsx`<br>`SsulDak_Web/Partner/frontend/PTNR-QOT-00/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/Partner/backend/api_PTNR_QOT_00/route.ts` |
| **API 엔드포인트** | `POST /api/partner/ptnr_qot_00` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |
| **호출 부모 화면** | `PTNR-DSH-00` (파트너 메인 대시보드) |
| **연계 상세 화면** | `PTNR-QOT-01` (공고 상세 보기 및 청약 제안하기) |

---

## 2. 핵심 아키텍처 및 코딩 규칙 준수

1. **물리적 격리**: 모든 파트너 관련 소스코드는 `SsulDak_Web/Partner/` 디렉터리 내에서 프론트와 백엔드를 독립 완결하며, `User`(이용자) 및 `Admin`(관리자) 도메인 파일과 코드를 일체 공유하지 않습니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/Partner/frontend/PTNR-QOT-00/index.tsx`
   - 백엔드 라우터: `SsulDak_Web/Partner/backend/api_PTNR_QOT_00/route.ts`
   - 엔드포인트 URL: `POST /api/partner/ptnr_qot_00`
3. **독립 전용 SQL 원칙**: 타 화면과 쿼리를 일체 공유하지 않으며 오직 `PTNR-QOT-00-SQL-001 ~ PTNR-QOT-00-SQL-005` 전용 SQL ID로 작성 및 트랜잭션을 분리합니다.
4. **비즈니스 룰 및 오더피드 필터링 정책**:
   - 파트너가 설정한 활동 지역(시/군/구: `TB_PARTNER_SETTING.ACTIVE_REGIONS`)과 전문 분야(`SERVICE_TYPES`)에 부합하는 공고만 우선 정렬.
   - 공고 슬롯 상태: `SLOT_STAT_CD = 'WAITING'` 및 미만료(`EXPIRE_DT > NOW()`).
   - 이미 해당 파트너가 청약(응모)을 완료한 슬롯(`TB_CLEAN_BID` 존재)은 `[청약 응모 완료 (심사대기)]` 뱃지로 상태 구분.
   - **파트너 납부 데이터 이용료 연산 공식**:
     $$\text{데이터 이용료} = \max(\text{청소 용역 대금 총액} \times 3.3\%, 33,000\text{원})$$
     - 보유 중인 활성 무료쿠폰(`TB_PARTNER_COUPON.COUPON_STAT_CD = 'AVAILABLE'`)이 1장 이상인 경우: `0원 (웰컴패스 적용)`으로 즉시 감면 강조.
   - **D-Day 마감 타이머**: `TIMESTAMPDIFF(HOUR, NOW(), s.EXPIRE_DT)` 기반 D-Day 또는 남은 시간 표시.

---

## 3. 독립 전용 SQL 명세

### 3.1 PTNR-QOT-00-SQL-001 (파트너 보유 무료 쿠폰 가용 수 조회)
```sql
/* PTNR-QOT-00-SQL-001 */
SELECT COUNT(*) AS freePassCouponCnt
FROM TB_PARTNER_COUPON
WHERE PTNR_NO = ? 
  AND COUPON_STAT_CD = 'AVAILABLE' 
  AND (EXPIRE_DT IS NULL OR EXPIRE_DT >= NOW());
```

### 3.2 PTNR-QOT-00-SQL-002 (파트너 활동 설정 조회)
```sql
/* PTNR-QOT-00-SQL-002 */
SELECT 
  PTNR_NO AS ptnrNo,
  SERVICE_TYPES AS serviceTypes,
  ACTIVE_REGIONS AS activeRegions,
  COALESCE(DISPATCH_RADIUS_KM, 10) AS dispatchRadiusKm,
  COALESCE(URGENT_DISPATCH_YN, 'Y') AS urgentDispatchYn
FROM TB_PARTNER_SETTING
WHERE PTNR_NO = ?;
```

### 3.3 PTNR-QOT-00-SQL-003 (매칭 청약 공고 오더피드 목록 페이징 및 필터/정렬 조회)
```sql
/* PTNR-QOT-00-SQL-003 */
SELECT 
  s.SLOT_NO AS slotNo,
  s.REQ_NO AS reqNo,
  s.SERVICE_TYPE_CD AS serviceTypeCd,
  s.SUB_ITEM_NM AS subItemNm,
  s.PROPOSED_UNIT_AMT AS proposedAmt,
  s.SERVICE_START_DT AS startDt,
  s.SERVICE_END_DT AS endDt,
  s.EXPIRE_DT AS expireDt,
  s.REG_DT AS regDt,
  r.ADDR_ROAD AS addrRoad,
  COALESCE(r.ADDR_DETAIL, '') AS addrDetail,
  COALESCE(r.BUILDING_FLOOR_CNT, 4) AS floorCnt,
  COALESCE(r.REGULAR_VISIT_CYCLE_CD, 'WEEKLY_1') AS visitCycleCd,
  TIMESTAMPDIFF(HOUR, NOW(), s.EXPIRE_DT) AS remainHours,
  DATEDIFF(s.EXPIRE_DT, NOW()) AS remainDays,
  CASE WHEN TIMESTAMPDIFF(HOUR, s.REG_DT, NOW()) <= 48 THEN 'Y' ELSE 'N' END AS isNewYn,
  CASE WHEN b.BID_NO IS NOT NULL THEN 'Y' ELSE 'N' END AS isAlreadyBidYn
FROM TB_CLEAN_REQ_SLOT s
INNER JOIN TB_CLEAN_REQ r ON s.REQ_NO = r.REQ_NO
LEFT JOIN TB_CLEAN_BID b ON s.SLOT_NO = b.SLOT_NO AND b.PTNR_NO = ?
WHERE s.SLOT_STAT_CD = 'WAITING'
  AND s.EXPIRE_DT > NOW()
  AND (? = 'ALL' OR s.SERVICE_TYPE_CD = ?)
ORDER BY isAlreadyBidYn ASC, s.REG_DT DESC
LIMIT ? OFFSET ?;
```

### 3.4 PTNR-QOT-00-SQL-004 (입찰 참여 경쟁 업체 수 카운트)
```sql
/* PTNR-QOT-00-SQL-004 */
SELECT COUNT(DISTINCT PTNR_NO) AS bidCount
FROM TB_CLEAN_BID
WHERE SLOT_NO = ?;
```

### 3.5 PTNR-QOT-00-SQL-005 (공고 현장 대표 사진 조회)
```sql
/* PTNR-QOT-00-SQL-005 */
SELECT PHOTO_URL AS photoUrl
FROM TB_CLEAN_REQ_PHOTO
WHERE REQ_NO = ?
ORDER BY SORT_ORD ASC
LIMIT 1;
```

---

## 4. 백엔드 API 명세서 (`POST /api/partner/ptnr_qot_00`)

### 4.1 요청 페이로드
```json
{
  "actionType": "GET_ORDER_FEED",
  "ptnrNo": "P20261000001",
  "categoryFilter": "ALL",
  "searchKeyword": "",
  "sortOption": "LATEST",
  "page": 1,
  "limit": 10
}
```

### 4.2 응답 페이로드 (HTTP 200 OK)
```json
{
  "success": true,
  "freePassCouponCnt": 1,
  "totalOrders": 12,
  "categoryCounts": {
    "ALL": 12,
    "REGULAR": 7,
    "APPLIANCE": 4,
    "MOVEIN": 1,
    "SPECIAL": 0
  },
  "settingSummary": {
    "ptnrNo": "P20261000001",
    "activeRegionsText": "경기 고양시 일산동구, 경기 고양시 일산서구, 경기 파주시 전역",
    "serviceTypesText": "정기청소, 계절가전케어",
    "dispatchRadiusKm": 10,
    "urgentDispatchYn": "Y"
  },
  "orders": [
    {
      "slotNo": "SLOT202610230001",
      "reqNo": "REQ2026102300001",
      "serviceTypeCd": "REGULAR",
      "categoryLabel": "정기청소",
      "title": "[정기청소 3개월] 일산동구 중앙로 빌라 4층 상가주택",
      "periodText": "2026.11.01 ~ 2027.01.31 (총 12회차 계약)",
      "scopeText": "계단 (1~4층) + 복도 + 1층 분리수거장",
      "workHoursText": "매주 수요일 오전 10:00 이전 (키패드 비번 사전 제공)",
      "proposedAmt": 240000,
      "monthlyAmtText": "(월 80,000원 × 3개월)",
      "partnerFeeAmt": 33000,
      "canUseFreePass": true,
      "isNew": true,
      "dDayText": "D-2 응모마감",
      "remainHours": 47,
      "remainDays": 2,
      "isAlreadyBid": false,
      "addrRoad": "경기 고양시 일산동구 중앙로 1261번길 18-4",
      "addrDetailMasked": "백석동 인근",
      "floorCnt": 4,
      "distanceKm": 2.4,
      "distanceText": "거리 2.4km (차량 10분)",
      "bidCount": 2,
      "maxBidCount": 3,
      "photoUrl": "https://lh3.googleusercontent.com/...",
      "regDate": "2026-10-23",
      "isEmergency": false,
      "isExcellentOrder": false
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 2
}
```

---

## 5. 프론트엔드 UI 및 인터랙션 구현 내역

1. **상단 GNB 헤더**:
   - `SsulDak` 공식 브랜드 로고 및 `PARTNER CONSOLE` 뱃지.
   - `반짝빌라클린` + `영업 중 (ON)` 펄스 인디케이터.
   - 네비게이션 탭(`공고목록 / 오더수신` 활성화), 긴급 핫라인(1588-0000), 알림 뱃지(4), 대표 프로필.
2. **환영 혜택 배너 (Welcome Pass)**:
   - 웰컴 패스 무료 쿠폰(33,000원 면제) 보유 현황 및 `내 보유 쿠폰함 확인` 모달 연동.
3. **분야 칩 및 다이나믹 검색/정렬 툴바**:
   - 전체분야 / 정기청소 / 계절가전케어 / 입주이사 / 특수청소 실시간 필터링.
   - 활동 권역 드롭다운 (고양시 일산동구, 일산서구, 파주시 전역).
   - 건물명, 도로명 실시간 검색 인풋 및 4대 정렬(최신순, 마감임박순, 금액높은순, 거리순).
4. **오더피드 카드 (4대 실물 시공 건)**:
   - **카드 1 (대표 정기청소 3개월)**: 일산동구 중앙로 빌라 4층 (240,000원, 월 80,000원, 입찰경쟁 2/3개사, 거리 2.4km).
   - **카드 2 (단기/긴급 가전케어 2대)**: 주엽동 문촌마을 아파트 (170,000원, 스탠드+드럼세탁기, 거리 4.1km).
   - **카드 3 (장기우수 6개월)**: 파주시 야당동 신축 상가주택 (720,000원, 월 120,000원, 거리 6.8km).
   - **카드 4 (이사청소 3인 도급)**: 마두동 백마마을 아파트 32평형 (360,000원, 거리 1.8km 초밀착).
5. **우측 고정 사이드바**:
   - 맞춤 수신 조건 요약 (권역, 전문분야, 자동수신 ON).
   - 청약 매칭률 UP 3대 팁 및 최근 청약 낙찰률 87.5% 스파크라인 SVG.
   - 긴급 관제 지원 핫라인(1588-0000 ARS 2번) 및 카카오톡 1:1 관제.
6. **인터랙티브 모달 & 토스트**:
   - 시공 매뉴얼 미리보기 모달 (친환경 세제 원칙, 사진 4장 전송 규정 안내).
   - 내 보유 쿠폰함 모달 (웰컴 패스 100% 무료 쿠폰 상세).
   - 관심 공고 스크랩 북마크 토스트 및 새로고침 스피너.

---

## 6. 브라우저 실환경 검증 결과

- **테스트 환경**: Chrome 브라우저 실동작 환경 (`http://localhost:3000/?v=20261023_ptnr_qot_00_v1#partner-orders`)
- **실행 결과**:
  1. `SsulDak` 파트너 콘솔 GNB 및 영업 중 인디케이터 렌더링 정상.
  2. `PTNR-QOT-00` 매칭 청약 공고 4건 카드 및 데이터 이용료(0원 쿠폰 적용) 정확 노출.
  3. `내 보유 쿠폰함 확인` 클릭 시 모달 정상 팝업 및 닫기 완료.
  4. `정기청소` 필터 칩 클릭 시 정기청소 공고만 즉시 필터링 후 `전체분야` 복귀 확인.
  5. `시공 매뉴얼 미리보기` 클릭 시 표준 시공 매뉴얼 팝업 및 점검 체크리스트 정상 노출.
  6. 관심 공고 북마크 클릭 시 스크랩 토스트 알림 작동 확인.
  7. `공고 상세 보기 및 청약 제안하기` 클릭 시 `PTNR-QOT-01` 제안서 화면으로 즉시 전환 확인.
