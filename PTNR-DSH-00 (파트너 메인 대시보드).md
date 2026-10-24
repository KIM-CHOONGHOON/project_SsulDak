# [SsulDak (쓸고닦고)] PTNR-DSH-00 (파트너 메인 대시보드) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `PTNR-DSH-00` |
| **화면명** | 파트너 메인 대시보드 (Partner Fleet Operations Console) |
| **지원 채널** | Web Console (PC 1440px 최적화) / Mobile Web (390px 반응형) |
| **도메인 역할** | `Partner` (전문가/시공 파트너 전용) |
| **프론트엔드 파일** | `SsulDak_Web/Partner/frontend/PTNR-DSH-00/index.tsx`<br>`SsulDak_Web/Partner/frontend/PTNR-DSH-00/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/Partner/backend/api_PTNR_DSH_00/route.ts` |
| **API 엔드포인트** | `POST /api/partner/ptnr_dsh_00` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |
| **호출 화면(GNB/URL)** | `PTNR-DSH-00` (`#partner-dashboard` 또는 `#ptnr-dsh-00`) |
| **연계 대상 화면** | `PTNR-QOT-00` (공고목록/오더수신), `PTNR-JOB-00` (작업관리/시공보고), `PTNR-SET-00` (정산/혜택관리), `PTNR-DSH-01` (지역/전문분야설정), `PTNR-DSH-02` (프로필관리) |

### 핵심 아키텍처 준수 규칙
1. **물리적 격리**: 모든 파트너 관련 소스코드는 `SsulDak_Web/Partner/` 내에서 프론트엔드와 백엔드를 독립 완결하며, `User`(이용자) 및 `Admin`(관리자) 도메인 파일과 코드를 일체 공유하지 않습니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/Partner/frontend/PTNR-DSH-00/index.tsx`
   - 백엔드 라우터: `SsulDak_Web/Partner/backend/api_PTNR_DSH_00/route.ts`
   - 엔드포인트 URL: `POST /api/partner/ptnr_dsh_00`
3. **독립 전용 SQL 원칙**: 타 화면과 쿼리를 일체 공유하지 않으며 오직 `PTNR-DSH-00-SQL-001 ~ PTNR-DSH-00-SQL-005` 전용 SQL ID로 작성 및 트랜잭션을 분리합니다.
4. **회원 식별자 12바이트 고정 규격 준수**: 파트너 식별자(`PTNR_NO`)는 반드시 `CHAR(12)` 규격(`P` + `YYYYMM` + 5자리 일련번호)을 따릅니다.
5. **실시간 영업 상태 제어 및 낙관적 UI 업데이트(Optimistic Update)**:
   - 파트너가 상단 스위치를 조작할 때 즉시 UI(버튼 슬라이더, 상태 텍스트, 펄스 LED)를 반영하고, 백엔드 `TOGGLE_OPER_STATUS` 비동기 요청 실패 시 이전 상태로 롤백합니다.
   - 영업 상태(`OPER_STAT_CD = 'ON'`)일 때만 신규 매칭 대기 공고 알림 및 긴급 배차가 자동 수신됩니다.

---

## 2. 회원 식별자 및 영업 상태 규격

### 2.1 파트너 식별자 (12바이트 고정: `CHAR(12)`)
$$\mathbf{파트너\ 식별자(12바이트)} = \mathbf{['P'(1바이트)]} + \mathbf{[가입\ 년월(6바이트)]} + \mathbf{[일련번호(5바이트)]}$$

- **표준 예시**: `P20261000001` (반짝빌라클린 - 대표 이수)

### 2.2 영업 상태 코드 (`OPER_STAT_CD`)
- **`ON` (영업 중)**:
  - 초록색 펄스 LED 표시 (`bg-secondary animate-pulse`)
  - 실시간 배차 알림 정상 수신 상태
  - 백그라운드 기사앱 위치 동기화 및 신규 요청 알림 활성화
- **`OFF` (영업 일시 중단)**:
  - 회색 정적 LED 표시 (`bg-outline`)
  - 신규 매칭 오더 수신 일시 보류 상태

---

## 3. 프론트엔드 (FrontEnd) 구현 명세

### 3.1 파일 경로
- 메인 컴포넌트: [`SsulDak_Web/Partner/frontend/PTNR-DSH-00/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/Partner/frontend/PTNR-DSH-00/index.tsx)
- Re-export 엔트리: [`SsulDak_Web/Partner/frontend/PTNR-DSH-00/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/Partner/frontend/PTNR-DSH-00/index.jsx)

### 3.2 화면 레이아웃 및 컴포넌트 구조

```
+----------------------------------------------------------------------------------------------------+
| [Top GNB Bar]                                                                                      |
| [SsulDak PARTNER CONSOLE] | [반짝빌라클린 (● 영업 중 ON)]     [홈] [공고목록] [작업관리] [정산] [프로필]       |
| [긴급 핫라인 1588-0000] [알림 4] [이수 대표 (마스터 파트너)] [로그아웃]                                   |
+----------------------------------------------------------------------------------------------------+
| [Top Welcome & Live Operation Controller Banner]                                                   |
| - 상호명: 반짝빌라클린 (대표 이*수)  |  국세청 • 5억 책임보험 인증 마스터 파트너                             |
| - 활동권역: 경기 고양시 일산동구 • 서구, 파주시 전역  |  ★ 4.96 (누적 시공 284건)                         |
| - [우측] [● 영업 중 (ON) 스위치 토글]  [긴급 배차: 자동수신]  [기사앱 동기화 정상]                       |
+----------------------------------------------------------------------------------------------------+
| [Core Status Metrics Cards (4열 그리드)]                                                            |
| 1. 신규 매칭 대기 (4건)              | 2. 진행 중 정기 관리 (3개 건물)                                      |
|    - 맞춤 요청 대기 중 / 실시간 뱃지  |    - 마두동 백마빌라 외 2곳 (이번 주 6회차)                           |
|    - [신규 공고 확인 및 견적 제출 >]  |    - [관리 빌라 목록 조회 >]                                        |
| 3. 보유 배차지원 쿠폰 (1장 - D-29)   | 4. 11월 정산 예정액 (3,840,000원)                                   |
|    - 첫 배차 100% 무료 웰컴 패스     |    - 완료 8건 정산 완료 • 검수대기 2건 (에스크로 D+1)                |
|    - [보유 쿠폰함 확인 >]            |    - [정산 내역서 • 입금계좌 >]                                     |
+----------------------------------------------------------------------------------------------------+
| [Main Section: 오늘의 시공 일정 (2026년 11월 1일 금요일) - 총 2건 배정]                              |
| - 시공 지연 방지 실시간 GPS 체크인 기능 활성화 중                                                  |
| 1. [NEXT JOB] 14:00~16:30 | 마두동 빌라 계단청소 2회차 (공용부 4개층 + 필로티 주차장)                   |
|    - 현장 출발 대기 (펄스) | 백마그린빌 101동 | 이*수 대표 직영 | 고압스팀기 지참                       |
|    - [고객 안심통화 0507 버튼]  [작업관리 • 시공 전 사진 등록 CTA]                                   |
| 2. [COMPLETED] 09:30~11:30 | 백석동 단독주택 입주 이사 청소 마무리 (전용 34평형)                        |
|    - 검수완료/D+1 정산대기 | 정산 예정액: 420,000원 | 고객 별점 5.0 (사진 8장 승인)                  |
|    - [시공 보고서 조회 버튼]                                                                        |
+----------------------------------------------------------------------------------------------------+
| [2-Column Bottom Row]                                                                             |
| [좌측 7-Col: 파트너 운영 관리 허브]               | [우측 5-Col: 파트너 안심 공지 • 규정]             |
| 1. 지역 • 전문분야 설정 (일산/파주 3개 구역)       | 1. [동절기 안전시공] 친환경 계단 세정 약품 권고  |
| 2. 파트너 프로필 • 장비 관리 (사업자/자격증)      | 2. [파트너 보호정책] 고객 일방 취소(노쇼) 100% 보장|
| 3. 매출 및 정산 통계 (월별 추이, 계산서)         |                                                   |
| 4. 기사 PIN • 보조 작업자 배정 (현장 팀원 2명)     | [파트너 전담 24시 긴급 핫라인 박스]                |
| - 주간 퍼포먼스 인라인 배너 (정시 착수율 100% + SVG)| - 1588-0000 | [카카오톡 전용 문의]                 |
+----------------------------------------------------------------------------------------------------+
| [Bottom Mobile Nav (모바일 전용 하단 바)]                                                          |
| [홈 (Active)] | [공고목록] | [작업관리] | [정산/혜택]                                             |
+----------------------------------------------------------------------------------------------------+
| [Footer] 쓸고닦고 공인 플릿 파트너사 보증 시스템 • 100% 에스크로 익일 정산 보장 • 24시 기술지원 1588-0000 |
+----------------------------------------------------------------------------------------------------+
```

### 3.3 프론트엔드 주요 기능 구현
1. **낙관적 UI 토글 (Optimistic Status Update)**:
   - 토글 스위치 클릭 즉시 `isOperating` 상태 반전 및 실시간 토스트 메시지 표출.
   - 백엔드에 `POST /api/partner/ptnr_dsh_00` (`mode: 'TOGGLE_OPER_STATUS'`) 전송.
   - 실패 시 롤백 및 에러 알림.
2. **0507 고객 안심통화 인터랙션**:
   - `0507-1234-5678` 안심 가상번호 연결 팝업 토스트 및 시공자 보호 기능.
3. **사진 등록 및 시공 보고서 연동**:
   - `PTNR-JOB-00` 화면으로 즉시 이동하여 작업 전/후 사진 업로드 프로세스 유도.
4. **SVG 스파크라인 그래픽**:
   - 지난 7일간 착수율 100% 추이를 인라인 벡터 차트로 렌더링.

---

## 4. 백엔드 라우터 및 데이터베이스 명세

### 4.1 파일 경로
- 백엔드 라우터: [`SsulDak_Web/Partner/backend/api_PTNR_DSH_00/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/Partner/backend/api_PTNR_DSH_00/route.ts)

### 4.2 API 요청/응답 규격

#### [엔드포인트 및 공통 헤더]
- **URL**: `POST /api/partner/ptnr_dsh_00`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer {PARTNER_JWT_TOKEN}
  ```

#### [모드 1: 대시보드 지표 및 종합 정보 조회 (`GET_DASHBOARD_DATA`)]
- **Request Body**:
  ```json
  {
    "mode": "GET_DASHBOARD_DATA",
    "ptnrNo": "P20261000001"
  }
  ```
- **Response (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "partner": {
      "ptnrNo": "P20261000001",
      "companyNm": "반짝빌라클린",
      "ceoNm": "이수",
      "operStatus": "ON"
    },
    "stats": {
      "waitingOrderCnt": 4,
      "activeBuildingCnt": 3,
      "activeCoupon": {
        "couponNo": "PCP2026100100001",
        "badgeText": "첫 배차 100% 무료 1장",
        "campaignNm": "첫 배차 100% 무료 웰컴 패스 (~11.30)",
        "dDay": "D-29"
      },
      "monthEstAmt": 3840000
    },
    "todayJob": {
      "workSeq": 201,
      "contractNo": "CT20261000001",
      "roundNo": 2,
      "workStatCd": "DEPARTED",
      "jobTime": "14:00~16:30",
      "title": "마두동 빌라 계단청소 2회차 (공용부 4개층 + 1층 필로티 주차장)",
      "addr": "경기 고양시 일산동구 마두동 789 백마그린빌 101동",
      "timeText": "오늘 14:00~16:30"
    }
  }
  ```

#### [모드 2: 실시간 영업 상태 ON/OFF 토글 (`TOGGLE_OPER_STATUS`)]
- **Request Body**:
  ```json
  {
    "mode": "TOGGLE_OPER_STATUS",
    "ptnrNo": "P20261000001",
    "operStatus": "Y"
  }
  ```
- **Response (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "operStatus": "Y",
    "operStatCd": "ON",
    "message": "영업 상태가 [영업 중 (ON)]으로 변경되었습니다."
  }
  ```

---

## 5. 데이터베이스 테이블 및 DDL 구조

### 1) `TB_PARTNER` (파트너 마스터)
```sql
CREATE TABLE IF NOT EXISTS TB_PARTNER (
  PTNR_NO CHAR(12) NOT NULL COMMENT '파트너 식별자 (P + YYYYMM + 5자리)',
  COMPANY_NM VARCHAR(100) NOT NULL COMMENT '상호명',
  CEO_NM VARCHAR(50) NOT NULL COMMENT '대표자명',
  BIZ_REG_NO VARCHAR(20) NOT NULL COMMENT '사업자등록번호',
  TEL_NO VARCHAR(20) NOT NULL COMMENT '대표 전화번호',
  EMAIL VARCHAR(100) NOT NULL COMMENT '로그인 이메일',
  PASS_HASH VARCHAR(255) NOT NULL COMMENT '비밀번호 해시',
  PARTNER_APR_STAT_CD VARCHAR(20) NOT NULL DEFAULT 'APPROVED' COMMENT '승인상태(PENDING/APPROVED/REJECTED)',
  OPER_STAT_CD VARCHAR(10) NOT NULL DEFAULT 'ON' COMMENT '영업상태(ON/OFF)',
  ACTIVE_STATUS_YN CHAR(1) NOT NULL DEFAULT 'Y' COMMENT '활동상태 Y/N',
  PRIMARY KEY (PTNR_NO)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 2) `TB_PARTNER_SETTING` (활동 권역 및 서비스 분야)
```sql
CREATE TABLE IF NOT EXISTS TB_PARTNER_SETTING (
  PTNR_NO CHAR(12) NOT NULL,
  ACTIVE_REGIONS JSON NULL COMMENT '활동 권역 목록',
  SERVICE_TYPES JSON NULL COMMENT '전문 서비스 분류 목록',
  AUTO_DISPATCH_YN CHAR(1) NOT NULL DEFAULT 'Y',
  REG_DT DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  MOD_DT DATETIME NULL,
  PRIMARY KEY (PTNR_NO)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

### 3) `TB_CLEAN_REQ_SLOT` & `TB_CLEAN_CONTRACT` & `TB_CLEAN_WORK_LOG`
- `TB_CLEAN_REQ_SLOT`: 파트너가 응모 가능한 미체결 슬롯(`SLOT_STAT_CD = 'WAITING' AND EXPIRE_DT > NOW()`).
- `TB_CLEAN_CONTRACT`: 체결되어 진행 중인 정기/이사 청소 계약(`CONTRACT_STAT_CD IN ('CONFIRMED', 'IN_PROGRESS')`).
- `TB_CLEAN_WORK_LOG`: 당일 시공 예정인 작업 세부 회차 원장(`DATE(START_DT) = CURDATE()`).

---

## 6. 독립 전용 SQL 쿼리 명세

```sql
-- PTNR-DSH-00-SQL-001: 파트너 기본 정보 및 영업 상태 조회
SELECT 
  PTNR_NO AS ptnrNo,
  COMPANY_NM AS companyNm,
  CEO_NM AS ceoNm,
  COALESCE(OPER_STAT_CD, IF(ACTIVE_STATUS_YN = 'Y', 'ON', 'OFF')) AS operStatCd
FROM TB_PARTNER
WHERE PTNR_NO = ? AND PARTNER_APR_STAT_CD = 'APPROVED';

-- PTNR-DSH-00-SQL-002: 파트너 영업 상태 ON/OFF 변경
UPDATE TB_PARTNER
SET 
  OPER_STAT_CD = ?,
  ACTIVE_STATUS_YN = IF(? = 'ON', 'Y', 'N'),
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE PTNR_NO = ?;

-- PTNR-DSH-00-SQL-003: 매칭 대기 공고 수, 진행 중 관리 건물 수 집계
SELECT 
  (SELECT COUNT(*) 
   FROM TB_CLEAN_REQ_SLOT s 
   INNER JOIN TB_CLEAN_REQ r ON s.REQ_NO = r.REQ_NO
   WHERE s.SLOT_STAT_CD = 'WAITING' 
     AND s.EXPIRE_DT > NOW()) AS waitingOrderCnt,
  (SELECT COUNT(DISTINCT CONTRACT_NO) 
   FROM TB_CLEAN_CONTRACT 
   WHERE PTNR_NO = ? AND CONTRACT_STAT_CD IN ('CONFIRMED', 'IN_PROGRESS')) AS activeBuildingCnt;

-- PTNR-DSH-00-SQL-004: 사용 가능한 대표 보유 배차 쿠폰 요약 조회
SELECT 
  P_COUPON_NO AS couponNo,
  CAMPAIGN_NM AS campaignNm,
  DISCOUNT_RATE AS discountRate
FROM TB_PARTNER_COUPON
WHERE PTNR_NO = ? AND COUPON_STAT_CD = 'AVAILABLE' AND (EXPIRE_DT IS NULL OR EXPIRE_DT >= NOW())
ORDER BY REG_DT DESC
LIMIT 1;

-- PTNR-DSH-00-SQL-005: 오늘 시공 예정인 가장 빠른 작업 일정 단건 조회
SELECT 
  w.WORK_SEQ AS workSeq,
  w.CONTRACT_NO AS contractNo,
  w.ROUND_NO AS roundNo,
  w.WORK_STAT_CD AS workStatCd,
  DATE_FORMAT(w.START_DT, '%H:%i') AS jobTime,
  CONCAT(DATE_FORMAT(w.START_DT, '%H:%i'), '~', DATE_FORMAT(COALESCE(w.END_DT, DATE_ADD(w.START_DT, INTERVAL 2 HOUR)), '%H:%i')) AS timeRange,
  r.ADDR_ROAD AS addrRoad,
  r.ADDR_DETAIL AS addrDetail,
  c.SUB_ITEM_NM AS subItemNm
FROM TB_CLEAN_WORK_LOG w
INNER JOIN TB_CLEAN_CONTRACT c ON w.CONTRACT_NO = c.CONTRACT_NO
INNER JOIN TB_CLEAN_REQ r ON c.REQ_NO = r.REQ_NO
WHERE c.PTNR_NO = ?
  AND DATE(w.START_DT) = CURDATE()
  AND w.WORK_STAT_CD IN ('MATCHED', 'DEPARTED', 'WORKING', 'INSPECTING')
ORDER BY w.START_DT ASC
LIMIT 1;
```

---

## 7. 검증 및 테스트 결과

### 7.1 단위 테스트 (Backend API Test)
- `GET_DASHBOARD_DATA` 호출 검증:
  - `ptnrNo: 'P20261000001'` 조회 성공.
  - 파트너 상호명: "반짝빌라클린", 영업상태: "ON".
  - 신규 매칭 대기 4건, 관리 건물 3개, 쿠폰 1장, 11월 정산 3,840,000원 정상 집계 확인.
  - 당일 시공 일정: `WORK_SEQ: 201`, 마두동 빌라 계단청소 2회차 정상 연동 확인.
- `TOGGLE_OPER_STATUS` 호출 검증:
  - `operStatus: 'N'` 전달 시 `OPER_STAT_CD = 'OFF'` 및 메시지 반환 정상 동작.
  - 다시 `operStatus: 'Y'` 복구 시 `OPER_STAT_CD = 'ON'` 정상 복구 확인.

### 7.2 브라우저 E2E 검증 (Chrome Automation)
- **데스크톱 (1440px)**:
  - GNB 내 브랜드 로고, 상호명 뱃지, 실시간 영업 상태 표시 확인.
  - 최상단 라이브 토글 배너에서 버튼 클릭 시 즉시 스위치 슬라이더 이동 및 "영업 일시 중단 (OFF)" ↔ "영업 중 (ON)" 전환 확인.
  - 4개 핵심 통계 카드(매칭 대기, 정기 관리, 배차 쿠폰, 정산액) 호버 효과 및 링크 정상.
  - 오늘의 시공 일정에서 "고객 안심통화 (0507)" 클릭 시 다이얼로그 토스트 정상 렌더링.
  - 하단 운영 관리 허브 및 실시간 스파크라인 SVG 렌더링 확인.
- **모바일 반응형 (390px)**:
  - 카드 1열 세로 스택 레이아웃 및 하단 네비게이션 고정 바 정상 표시 확인.
