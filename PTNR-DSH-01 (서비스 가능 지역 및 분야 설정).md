# [SsulDak (쓸고닦고)] PTNR-DSH-01 (서비스 가능 지역 및 분야 설정) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `PTNR-DSH-01` |
| **화면명** | 서비스 가능 지역 및 분야 설정 (Partner Dispatch Service & Region Settings) |
| **지원 채널** | Web Console (PC 1440px 최적화) / Mobile Web (390px 반응형) |
| **도메인 역할** | `Partner` (전문가/시공 파트너 전용) |
| **프론트엔드 파일** | `SsulDak_Web/Partner/frontend/PTNR-DSH-01/index.tsx`<br>`SsulDak_Web/Partner/frontend/PTNR-DSH-01/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/Partner/backend/api_PTNR_DSH_01/route.ts` |
| **API 엔드포인트** | `POST /api/partner/ptnr_dsh_01` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |
| **호출 부모 화면** | `PTNR-DSH-00` (파트너 메인 대시보드) |
| **호출 대상 화면** | `PTNR-QOT-00` (파트너 맞춤 공고 피드) |

### 핵심 아키텍처 준수 규칙
1. **물리적 격리**: 모든 파트너 관련 소스코드는 `SsulDak_Web/Partner/` 디렉터리 내에서 프론트와 백엔드를 독립 완결하며, `User`(이용자) 및 `Admin`(관리자) 도메인 파일과 코드를 일체 공유하지 않습니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/Partner/frontend/PTNR-DSH-01/index.tsx`
   - 백엔드 라우터: `SsulDak_Web/Partner/backend/api_PTNR_DSH_01/route.ts`
   - 엔드포인트 URL: `POST /api/partner/ptnr_dsh_01`
3. **독립 전용 SQL 원칙**: 타 화면과 쿼리를 일체 공유하지 않으며 오직 `PTNR-DSH-01-SQL-001 ~ PTNR-DSH-01-SQL-003` 전용 SQL ID로 작성 및 트랜잭션을 분리합니다.
4. **비즈니스 룰 및 제약 조건**:
   - **전문 서비스 분야(`SERVICE_TYPES`)**: 최소 1개 이상 필수 선택 (`REGULAR`, `APPLIANCE`, `MOVEIN`).
   - **활동 지역(`ACTIVE_REGIONS`)**: 최대 5개 시/군/구까지 등록 가능 (중복 추가 차단, 5개 초과 시 경고 토스트).
   - **실시간 관제 연동**: 본 설정 저장 시 즉시 `PTNR-QOT-00`(맞춤 공고 피드)의 추천 쿼리와 5분 내 전국 관제 알고리즘에 자동 반영.
   - **감사 컬럼**: 갱신 시 `MOD_DT = NOW()`, `MOD_ID = ptnrNo` 필수 세팅.

---

## 2. 비즈니스 룰 및 제약 사항

### 2.1 전문 시공 서비스 분야 (`SERVICE_TYPES`)
- 최소 1개 이상 필수 유지 (체크 해제 시 최소 1개 유지 알림 토스트 출력).
- **종목 구성**:
  1. `REGULAR`: 정기청소 (빌라·상가·오피스) - 대표 전문 분야, 배차 가중치 +20%
  2. `APPLIANCE`: 계절가전 전문 케어 (에어컨/세탁기 분해) - 자격 인증 완료, 고단가 집중 배차
  3. `MOVEIN`: 입주 / 이사 청소 (종합 클리닝) - 평당 11,000원 기준
  4. 특수 청소 / 준공 화재 청소 - 사전 승인 대기 잠금 및 증빙 서류 제출 모달 연동

### 2.2 활동 가능 지역 (`ACTIVE_REGIONS`)
- **최대 허용 권역**: 5개 시/군/구
- **최소 허용 권역**: 1곳 이상
- **중복 등록 방지**: 이미 등록된 동일 시도 + 시군구 선택 시 "이미 등록된 활동 권역입니다" 알림 차단
- **출동 반경(`DISPATCH_RADIUS_KM`)**: 5km ~ 30km (권장값 15km)
- **긴급 당일 배차 오더 수신(`URGENT_DISPATCH_YN`)**: 단가 +15% 오더 수신 여부 (기본 Y)
- **최소 수신 견적 금액 필터(`MIN_QUOTE_AMT`)**: 30,000원 ~ 100,000원 필터

---

## 3. 프론트엔드 (FrontEnd) 구현 명세

### 3.1 파일 경로
- 메인 컴포넌트: [`SsulDak_Web/Partner/frontend/PTNR-DSH-01/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/Partner/frontend/PTNR-DSH-01/index.tsx)
- Re-export 엔트리: [`SsulDak_Web/Partner/frontend/PTNR-DSH-01/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/Partner/frontend/PTNR-DSH-01/index.jsx)

### 3.2 화면 레이아웃 및 컴포넌트 구조

```
+----------------------------------------------------------------------------------------------------+
| [Top GNB Bar]                                                                                      |
| [SsulDak PARTNER CONSOLE] | [반짝빌라클린 (● 영업 중 ON)]     [홈] [공고목록] [작업관리] [정산] [프로필/지역]  |
| [긴급 핫라인 1588-0000] [알림 4] [이수 대표 (마스터 파트너)] [로그아웃]                                   |
+----------------------------------------------------------------------------------------------------+
| [Breadcrumb & Sub-header Bar]                                                                      |
| 홈 > 대시보드 (PTNR-DSH-00) > 파트너 운영 설정 > 서비스 가능 지역 및 분야 설정                              |
| [<- 파트너 대시보드로 돌아가기] [배차 알고리즘 4.2 Ver]                  [실시간 반영 모드 가동 중] [기본값 초기화]|
| 타이틀: 서비스 가능 지역 및 분야 설정                                                                 |
| 설명: 파트너사의 보유 자격·전문 장비 및 활동 권역을 맞춤 설정하면 최적의 프리미엄 청소 공고 자동 수신        |
+----------------------------------------------------------------------------------------------------+
| [Main 12-Column Layout]                                                                            |
| [Left 8-Column: 메인 설정 영역]                     | [Right 4-Column: 실시간 시뮬레이션 및 안심 지원]    |
|                                                    |                                                    |
| 1. 전문 시공 서비스 분야 선택 [필수 선택 1개 이상] | 1. 실시간 오더 풀 시뮬레이션 카드                  |
|    - [V] 정기청소 (배차 가중치 +20%)               |    - ESTIMATED WEEKLY VOLUME (주간 18~24건)         |
|    - [V] 계절가전 전문 케어 (자격 인증 완료)       |    - 오더 매칭 적합도: 96% (매우 높음)             |
|    - [ ] 입주/이사 청소 (종합 클리닝)              |    - 수신 예상 오더 비중 바 차트 및 범례           |
|    - [🔒] 특수 청소 / 준공 화재 (승인 대기)        |    - 선택 조건 기준 예상 월 정산액                  |
|    - 서브설정: 긴급 당일 배차 토글 & 최소 금액 필터|                                                    |
|                                                    | 2. 파트너 안심 배차 보증 정책 3종                  |
| 2. 활동 가능 지역 설정 (시/군/구) [선택: 3/5개]    |    - [1] 설정 지역 외 강제 배차 절대 없음          |
|    - 스마트 권역 매칭 시스템 가동 안내 배너         |    - [2] 고객 노쇼 위약금 100% 플랫폼 보상          |
|    - 현재 등록된 출동 가능 권역 칩 목록 (삭제 X)   |    - [3] 첫 달 배차 수수료 무료 쿠폰 (D-29)        |
|    - 시/도 및 시/군/구 동적 선택 후 [+ 추가하기]   |                                                    |
|    - 사업장 기준 최대 출동 반경 슬라이더 (5~30km)  | 3. 설정 변경 지원 및 파트너 핫라인                  |
|    - 위성 cartographic 지도 레이더 오버레이 프리뷰 |    - 1588-0000 (내선 2번, 24시 운영)               |
|                                                    |    - [카카오톡 1:1 관제팀 실시간 상담] 모달 팝업   |
| 3. 작업 가능 요일 및 시간대 설정                   |                                                    |
|    - 요일 필즈 (월~토 활성, 일 휴무 토글)          |                                                    |
|    - 주간 작업 가능 시간 (08:00 ~ 18:00)           |                                                    |
|    - 야간 / 심야 정기청소 수신 토글 (22:00~05:00)  |                                                    |
|                                                    |                                                    |
| [하단 저장 액션 툴바]                              |                                                    |
| [5분 이내 전국 관제 반영 안내] [변경사항 취소] [맞춤 공고 설정 저장하기 CTA]                               |
+----------------------------------------------------------------------------------------------------+
| [Footer] 쓸고닦고 공인 플릿 파트너사 보증 시스템 • 100% 에스크로 익일 정산 보장 • 24시 기술지원 1588-0000 |
+----------------------------------------------------------------------------------------------------+
```

---

## 4. 백엔드 라우터 및 데이터베이스 명세

### 4.1 파일 경로
- 백엔드 라우터: [`SsulDak_Web/Partner/backend/api_PTNR_DSH_01/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/Partner/backend/api_PTNR_DSH_01/route.ts)

### 4.2 API 요청/응답 규격

#### [엔드포인트 및 공통 헤더]
- **URL**: `POST /api/partner/ptnr_dsh_01`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer {PARTNER_JWT_TOKEN}
  ```

#### [모드 1: 기존 설정 및 행정구역 코드 조회 (`GET_SETTINGS`)]
- **Request Body**:
  ```json
  {
    "mode": "GET_SETTINGS",
    "ptnrNo": "P20261000001"
  }
  ```
- **Response (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "settings": {
      "ptnrNo": "P20261000001",
      "serviceTypes": ["REGULAR", "APPLIANCE"],
      "activeRegions": [
        { "sido": "경기", "sigungu": "고양시 일산동구", "fullRegionNm": "경기 고양시 일산동구", "isMainBase": true, "memo": "메인 활동 거점 (대표 사업장)" },
        { "sido": "경기", "sigungu": "고양시 일산서구", "fullRegionNm": "경기 고양시 일산서구", "isMainBase": false, "memo": "차량 이동 10분 권역" },
        { "sido": "경기", "sigungu": "파주시", "fullRegionNm": "경기 파주시 전역", "isMainBase": false, "memo": "운정/교하지구 집중 커버" }
      ],
      "dispatchRadiusKm": 15,
      "urgentDispatchYn": "Y",
      "minQuoteAmt": 50000,
      "workDays": ["월", "화", "수", "목", "금", "토"],
      "workStartTime": "08:00",
      "workEndTime": "18:00",
      "nightCleanYn": "N"
    },
    "regionCodes": {
      "sidoList": [
        { "cd": "41", "nm": "경기도" },
        { "cd": "11", "nm": "서울특별시" },
        { "cd": "28", "nm": "인천광역시" }
      ],
      "sigunguList": [
        { "cd": "41281", "nm": "고양시 일산동구", "parentCd": "41" },
        { "cd": "41285", "nm": "고양시 일산서구", "parentCd": "41" },
        { "cd": "41480", "nm": "파주시 전역", "parentCd": "41" },
        { "cd": "41570", "nm": "김포시 전체", "parentCd": "41" }
      ]
    },
    "simulation": {
      "estimatedWeeklyMin": 18,
      "estimatedWeeklyMax": 24,
      "matchingSuitabilityPct": 96,
      "breakdown": {
        "regularPct": 60,
        "regularWeeklyText": "주 12~14건 (60%)",
        "appliancePct": 35,
        "applianceWeeklyText": "주 6~8건 (35%)",
        "otherPct": 5,
        "otherWeeklyText": "주 1~2건 (5%)"
      },
      "projectedMonthlyText": "4,200,000 ~ 5,500,000원"
    }
  }
  ```

#### [모드 2: 맞춤 설정 저장 (`SAVE_SETTINGS`)]
- **Request Body**:
  ```json
  {
    "mode": "SAVE_SETTINGS",
    "ptnrNo": "P20261000001",
    "serviceTypes": ["REGULAR", "APPLIANCE"],
    "activeRegions": [
      { "sido": "경기", "sigungu": "고양시 일산동구", "fullRegionNm": "경기 고양시 일산동구" },
      { "sido": "경기", "sigungu": "고양시 일산서구", "fullRegionNm": "경기 고양시 일산서구" },
      { "sido": "경기", "sigungu": "파주시", "fullRegionNm": "경기 파주시 전역" }
    ],
    "dispatchRadiusKm": 15,
    "urgentDispatchYn": "Y",
    "minQuoteAmt": 50000,
    "workDays": ["월", "화", "수", "목", "금", "토"],
    "workStartTime": "08:00",
    "workEndTime": "18:00",
    "nightCleanYn": "N"
  }
  ```
- **Response (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "message": "맞춤 공고 설정이 성공적으로 저장되었습니다. (5분 내 전국 관제 반영)",
    "settings": { ... }
  }
  ```

---

## 5. 독립 전용 SQL 쿼리 명세

```sql
-- PTNR-DSH-01-SQL-001: 파트너 기존 활동 지역 및 분야 설정 단건 조회
SELECT 
  PTNR_NO AS ptnrNo,
  SERVICE_TYPES AS serviceTypes,
  ACTIVE_REGIONS AS activeRegions,
  DISPATCH_RADIUS_KM AS dispatchRadiusKm,
  URGENT_DISPATCH_YN AS urgentDispatchYn,
  MIN_QUOTE_AMT AS minQuoteAmt,
  WORK_DAYS AS workDays,
  WORK_START_TIME AS workStartTime,
  WORK_END_TIME AS workEndTime,
  NIGHT_CLEAN_YN AS nightCleanYn,
  MOD_DT AS modDt
FROM TB_PARTNER_SETTING
WHERE PTNR_NO = ?;

-- PTNR-DSH-01-SQL-002: 행정구역 시/도 및 시/군/구 공통 코드 목록 조회
SELECT 
  GRP_CD AS grpCd,
  COM_CD AS comCd,
  COM_NM AS comNm,
  ATTR_VAL_1 AS parentCd,
  SORT_ORD AS sortOrd
FROM TB_COM_CODE
WHERE GRP_CD IN ('ADMIN_SIDO', 'ADMIN_SIGUNGU') AND USE_YN = 'Y'
ORDER BY SORT_ORD ASC;

-- PTNR-DSH-01-SQL-003: 파트너 맞춤 설정 UPSERT 등록/갱신
INSERT INTO TB_PARTNER_SETTING (
  PTNR_NO, 
  SERVICE_TYPES, 
  ACTIVE_REGIONS, 
  DISPATCH_RADIUS_KM, 
  URGENT_DISPATCH_YN, 
  MIN_QUOTE_AMT, 
  WORK_DAYS, 
  WORK_START_TIME, 
  WORK_END_TIME, 
  NIGHT_CLEAN_YN, 
  REG_DT, 
  REG_ID, 
  MOD_DT, 
  MOD_ID
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), ?
)
ON DUPLICATE KEY UPDATE
  SERVICE_TYPES = VALUES(SERVICE_TYPES),
  ACTIVE_REGIONS = VALUES(ACTIVE_REGIONS),
  DISPATCH_RADIUS_KM = VALUES(DISPATCH_RADIUS_KM),
  URGENT_DISPATCH_YN = VALUES(URGENT_DISPATCH_YN),
  MIN_QUOTE_AMT = VALUES(MIN_QUOTE_AMT),
  WORK_DAYS = VALUES(WORK_DAYS),
  WORK_START_TIME = VALUES(WORK_START_TIME),
  WORK_END_TIME = VALUES(WORK_END_TIME),
  NIGHT_CLEAN_YN = VALUES(NIGHT_CLEAN_YN),
  MOD_DT = NOW(),
  MOD_ID = VALUES(MOD_ID);
```

---

## 6. 검증 및 테스트 결과

### 6.1 단위 테스트 (API Test)
- `GET_SETTINGS` (`P20261000001`): 상태 200, 등록 지역 3곳, 공통코드 26건, 주간 오더 18~24건 시뮬레이션 정상 반환.
- `SAVE_SETTINGS` (`P20261000001`): 유효성 검사 통과 및 MySQL `TB_PARTNER_SETTING` UPSERT 완료 확인.

### 6.2 브라우저 E2E 검증 (Chrome Automation)
- **접속 URL**: `http://localhost:3000/?v=20261023_ptnr_dsh_01_v1#partner-profile-settings`
- **검증 항목**:
  1. 헤더/GNB 및 Breadcrumb 정상 표시.
  2. 전문 시공 서비스 분야 카드 선택/해제 및 실시간 시뮬레이션 지표 연동 확인.
  3. 시/도, 시/군/구 드롭다운 연동 및 `+ 권역 추가하기` 동작 확인 (최대 5개 제한).
  4. 출동 반경 슬라이더 (5~30km) 드래그 시 레이블 및 지도 반경 갱신 확인.
  5. 요일 선택 버튼 (월~토 활성, 일 휴무) 토글 및 주간/야간 시간대 셀렉트 정상 작동.
  6. `맞춤 공고 설정 저장하기` 클릭 시 비동기 통신 완료 및 성공 토스트 피드백 확인.
  7. 카카오톡 1:1 관제팀 실시간 상담 모달 팝업 열기/닫기 정상 동작 확인.
