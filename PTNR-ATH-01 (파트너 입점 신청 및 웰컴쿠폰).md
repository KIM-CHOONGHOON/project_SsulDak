# [SsulDak (쓸고닦고)] PTNR-ATH-01 (파트너 입점 신청 및 웰컴쿠폰) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `PTNR-ATH-01` |
| **화면명** | 전문 파트너 입점 신청 및 웰컴쿠폰 (Partner Onboarding Application & Welcome Pass) |
| **지원 채널** | Web Console (PC 1440px 최적화) / Mobile Web (390px 반응형) |
| **도메인 역할** | `Partner` (전문가/시공 파트너 전용) |
| **프론트엔드 파일** | `SsulDak_Web/Partner/frontend/PTNR-ATH-01/index.tsx`<br>`SsulDak_Web/Partner/frontend/PTNR-ATH-01/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/Partner/backend/api_PTNR_ATH_01/route.ts` |
| **API 엔드포인트** | `POST /api/partner/ptnr_ath_01` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |
| **호출 부모 화면** | `PTNR-ATH-00` (파트너 로그인) |
| **완료 대상 화면** | `PTNR-ATH-00` (신청 접수 완료 후 로그인 포털 복귀) |

### 핵심 아키텍처 준수 규칙
1. **물리적 격리**: 모든 파트너 관련 소스코드는 `SsulDak_Web/Partner/` 내에서 프론트엔드와 백엔드를 독립 완결하며, `User`(이용자) 및 `Admin`(관리자) 도메인 파일과 코드를 공유하지 않습니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/Partner/frontend/PTNR-ATH-01/index.tsx`
   - 백엔드 라우터: `SsulDak_Web/Partner/backend/api_PTNR_ATH_01/route.ts`
   - 엔드포인트 URL: `POST /api/partner/ptnr_ath_01`
3. **독립 전용 SQL 원칙**: 타 화면과 쿼리를 일체 공유하지 않으며 오직 `PTNR-ATH-01-SQL-001 ~ PTNR-ATH-01-SQL-005` 전용 SQL ID로 작성 및 트랜잭션을 분리합니다.
4. **회원 식별자 12바이트 고정 규격 준수**: 파트너 식별자(`PTNR_NO`)는 반드시 `CHAR(12)` 규격(`P` + `YYYYMM` + 5자리 일련번호)을 따릅니다.
5. **초기 심사 상태 및 웰컴 쿠폰 예약 발급**:
   - 신규 입점 파트너의 초기 상태는 `PARTNER_APR_STAT_CD = 'PENDING'`(심사 대기)로 설정됩니다.
   - 서류 심사 승인(`APPROVED`) 시 활성화될 '첫 배차 100% 무료 쿠폰(33,000원 상당)'을 `TB_PARTNER_COUPON`에 `COUPON_STAT_CD = 'PENDING_APPROVAL'` 상태로 사전 예약 적재합니다.

---

## 2. 회원 식별자(Partner ID) 규격 (12바이트 고정: `CHAR(12)`)

$$\mathbf{파트너\ 식별자(12바이트)} = \mathbf{['P'(1바이트)]} + \mathbf{[가입\ 년월(6바이트)]} + \mathbf{[일련번호(5바이트)]}$$

| 자리수 | 바이트 수 | 필드명 | 규격 및 정의 |
| :---: | :---: | :--- | :--- |
| **1번째** | **1바이트** | **역할 식별 코드** | • **`P`** : 파트너 / 청소기사 / 시공팀 (Partner) |
| **2~7번째** | **6바이트** | **가입 년월 (YYYYMM)** | 가입 연월 (예: 2026년 10월 접수 시 `202610`) |
| **8~12번째**| **5바이트** | **일련번호 (Sequence)** | Zero-Padding 5자리 일련번호 (`00001` ~ `99999`) |

- **신규 채번 예시**: `P` + `202610` + `00006` = **`P20261000006`** (정확히 12자리)

---

## 3. 프론트엔드 (FrontEnd) 구현 명세

### 3.1 파일 경로
- 메인 컴포넌트: [`SsulDak_Web/Partner/frontend/PTNR-ATH-01/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/Partner/frontend/PTNR-ATH-01/index.tsx)
- Re-export 엔트리: [`SsulDak_Web/Partner/frontend/PTNR-ATH-01/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/Partner/frontend/PTNR-ATH-01/index.jsx)

### 3.2 화면 UI/UX 구성 및 반응형 아키텍처

```
+----------------------------------------------------------------------------------------------------+
| [Top GNB Bar]                                                                                      |
| SsulDak [PARTNER CONSOLE] | SSL Encrypted • 99.98% Operational      [긴급데스크 1588-0000] [로그인포털]     |
+----------------------------------------------------------------------------------------------------+
| [Breadcrumb & Header]                                                                              |
| 홈 / 파트너 로그인 (PTNR-ATH-00) / 파트너 입점 신청 (PTNR-ATH-01)          [테스트용 자동입력] [로그인포털 돌아가기] |
| 전문 파트너 입점 신청 [웰컴 프로모션 진행 중]                                                                 |
+----------------------------------------------------------------------------------------------------+
| [3-Step Process Indicator]                                                                         |
| [STEP 01: 사업자 및 대표 정보]    ->    [STEP 02: 증빙 서류 및 장비]    ->    [STEP 03: 전자서명 및 혜택]    |
+----------------------------------------------------------------------------------------------------+
| [Left Column (8-Col Form Area)]                 | [Right Column (4-Col Sticky Sidebar)]            |
| 1. D-Day 웰컴 프로모션 한정 혜택 콜아웃              | 1. 입점 신청 현황 요약 카드                         |
|    - 첫 배차 100% 무료 쿠폰 (33,000원 상당)        |    - 진행도 100% 프로그레스 바                     |
|    - COUPON: WELCOME-FREEPASS-2025              |    - 혜택 박스 (첫 배차 무료 쿠폰 33,000원)           |
|                                                |    - 심사 및 배차 개시 4단계 절차 안내                |
| 2. Section 1: 사업자 기본 정보                    |    - [ 🎁 입점 신청서 제출하고 무료 쿠폰 받기 ] CTA   |
|    - 상호명, 대표자명, 대표 연락처                 |    - 알림톡 접수증 즉시 발송 안내                    |
|    - 사업자등록번호 + [국세청 진위확인 API] 버튼   |                                                   |
|    - 콘솔 로그인 이메일 & 비밀번호 설정          | 2. 쓸고닦고 파트너 3대 안심 보증                    |
|    - 사업장 소재지 및 주소 재검색                 |    - [1] D+1 무사고 익일 정산 보장 (14시 계좌 입금)  |
|    - 주 시공 가능 지역 (우선 배차 구역) 다중 태그   |    - [2] 고객 노쇼 100% 위약금 전액 지급             |
|                                                |    - [3] 미수금 제로 에스크로 플랫폼                 |
| 3. Section 2: 필수 증빙 서류 & 장비 업로드       |                                                   |
|    - [1] 사업자등록증 사본 (필수)                | 3. 신속 입점 상담 지원 위젯                        |
|    - [2] 위생 자격증 • 수료증 (선택 우대)        |    - 1588-0000 (내선 2번)                         |
|    - [3] 영업배상책임보험 증권 1억 이상 (필수)    |    - [카카오톡 파트너 1:1 채팅 문의]                 |
|    - [4] 대표 보유 전문 장비 실물 사진 3장 (필수) |                                                   |
|    - 포트폴리오/차량 래핑 사진 드래그 앤 드롭 존    |                                                   |
|                                                |                                                   |
| 4. Section 3: 대표자 자필 전자서명                |                                                   |
|    - HTML5 Canvas 서명 패드 (마우스/터치 드로잉) |                                                   |
|    - [서명 초기화] / [서명 등록 완료]             |                                                   |
|    - 입점 및 공정 거래 필수 약관 4종 동의        |                                                   |
+----------------------------------------------------------------------------------------------------+
| [Bottom Security Assurance] KISA ISMS 인증 완료 • 국세청 실시간 대조 연동                          |
| [Footer] SsulDak Enterprise Partners • Hotline: 1588-0000 • ISO 9001/14001 Registered             |
+----------------------------------------------------------------------------------------------------+
```

### 3.3 핵심 인터랙션 및 상태 관리
1. **국세청 진위확인 API 연동**:
   - `[국세청 진위확인 API]` 버튼 클릭 시 백엔드 `mode: 'VERIFY_BIZ_NO'` 호출.
   - 유효성 및 계속사업자 판정 통과 시 그린 뱃지(`✓ 국세청 정상 사업자 인증 완료 (부가가치세 일반과세자)`)로 즉시 전환.
2. **주 시공 가능 지역 다중 태그 관리**:
   - 기본 4개 구역(고양시 일산동구, 일산서구, 파주시 전역, 고양시 덕양구) 제공.
   - `[지역 추가]` 클릭 시 모달 팝업으로 새로운 시/군/구 구역 추가 (최대 5개 제한).
   - 태그 내 `close` 버튼으로 개별 삭제 지원.
3. **서류 및 장비 사진 슬롯 (4 Grid)**:
   - 필수 서류(사업자등록증, 1억 이상 영업배상책임보험증권, 대표 청소 장비 실물 사진) 업로드 상태 및 미리보기 지원.
   - 선택 서류(위생 자격증/수료증 사본) 등록 시 마스터 뱃지 심사 연동.
4. **HTML5 Canvas 대표자 자필 전자서명**:
   - 마우스 드래그 및 스마트폰/태블릿 터치 드로잉 지원.
   - `[서명 초기화]` 및 `[서명 등록 완료]` 버튼 제공.
5. **접수 완료 성공 모달**:
   - 신청서 제출 완료 시 축하 아이콘과 함께 신규 채번된 파트너 ID(`P20261000006`) 및 웰컴 무료 쿠폰 예약 안내 표출.
   - `[파트너 로그인 포털로 이동 (PTNR-ATH-00)]` 버튼 클릭 시 로그인 화면으로 원활하게 전환.
6. **테스트용 자동입력 툴바**:
   - 상단 `[테스트용 자동입력]` 클릭 시 무결한 새 사업자 정보와 이메일이 1클릭으로 자동 주입되어 즉시 검증 가능.

---

## 4. 백엔드 라우터 및 데이터베이스 명세

### 4.1 파일 경로 및 엔드포인트
- 백엔드 파일: [`SsulDak_Web/Partner/backend/api_PTNR_ATH_01/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/Partner/backend/api_PTNR_ATH_01/route.ts)
- 엔드포인트: `POST /api/partner/ptnr_ath_01`
- Content-Type: `application/json`

### 4.2 요청 및 응답 포맷

#### 1) 국세청 사업자등록번호 진위확인 모드 (`mode: 'VERIFY_BIZ_NO'`)
- **Request Body**:
```json
{
  "mode": "VERIFY_BIZ_NO",
  "bizRegNo": "123-45-67890",
  "pNm": "이순신"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "isValid": true,
  "taxType": "부가가치세 일반과세자",
  "message": "국세청에 등록된 정상 계속사업자입니다 (부가가치세 정상 가동 상태)."
}
```

#### 2) 입점 신청서 최종 제출 모드 (`mode: 'SUBMIT_APPLICATION'`)
- **Request Body**:
```json
{
  "mode": "SUBMIT_APPLICATION",
  "ptnrEmail": "newpartner@clean.com",
  "ptnrPassword": "Password1234!",
  "companyNm": "반짝빌라클린",
  "ceoNm": "이순신",
  "bizRegNo": "123-45-67890",
  "ptnrTel": "010-1234-5678",
  "bizCertDocUrl": "https://ssuldak.s3.ap-northeast-2.amazonaws.com/partner_docs/biz_01.pdf",
  "licenseDocUrl": "https://ssuldak.s3.ap-northeast-2.amazonaws.com/partner_docs/license_01.jpg",
  "insuranceDocUrl": "https://ssuldak.s3.ap-northeast-2.amazonaws.com/partner_docs/ins_01.pdf",
  "equipPhotoUrl": "https://ssuldak.s3.ap-northeast-2.amazonaws.com/partner_docs/equip_01.jpg",
  "signImgBase64": "data:image/png;base64,iVBORw0KGgo...",
  "preferredAreas": ["고양시 일산동구", "고양시 일산서구", "파주시 전역", "고양시 덕양구"]
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "ptnrNo": "P20261000006",
  "status": "PENDING",
  "message": "전문 파트너 입점 신청이 완료되었습니다. 관리자 심사(통상 24시간 이내) 완료 후 첫 배차 무료 쿠폰이 지급됩니다."
}
```

---

## 5. 데이터베이스 스키마 및 독립 전용 SQL

### 5.1 테이블 스키마

#### 1) `TB_PARTNER` (파트너 마스터 테이블)
- `PTNR_NO`: `CHAR(12)` PK (예: `P20261000006`)
- `PTNR_EMAIL`: `VARCHAR(100)` UNIQUE
- `PTNR_PWD_HASH`: `VARCHAR(255)` (PBKDF2 sha512)
- `PWD_SALT`: `VARCHAR(64)`
- `COMPANY_NM`: `VARCHAR(100)`
- `REP_NM`, `CEO_NM`: `VARCHAR(50)`
- `BIZ_NO`, `BIZ_REG_NO`: `VARCHAR(20)`
- `PTNR_TEL`: `VARCHAR(20)`
- `PARTNER_APR_STAT_CD`: `VARCHAR(20)` (`'PENDING'`)
- `HAS_INSURANCE_YN`: `CHAR(1)` (`'Y'`)
- `SIGN_IMG_URL`: `VARCHAR(500)`
- `REG_DT`, `REG_ID`, `MOD_DT`, `MOD_ID`: 감사 컬럼

#### 2) `TB_PARTNER_DOC` (입점 증빙 서류 마스터)
- `DOC_SEQ`: `BIGINT` AI PK
- `PTNR_NO`: `CHAR(12)`
- `DOC_TYPE_CD`: `VARCHAR(50)` (`BIZ_CERT`, `INSURANCE`, `EQUIP_PHOTO`, `LICENSE`)
- `FILE_URL`: `VARCHAR(500)`
- `APR_STAT_CD`: `VARCHAR(30)` (`'SUBMITTED'`)
- `REG_DT`, `REG_ID`, `MOD_DT`, `MOD_ID`: 감사 컬럼

#### 3) `TB_PARTNER_COUPON` (파트너 쿠폰 원장 - 웰컴 첫 배차 무료 쿠폰 예약)
- `P_COUPON_NO`: `CHAR(16)` PK (`PCP` + YYYYMMDD + 5자리)
- `PTNR_NO`: `CHAR(12)`
- `CAMPAIGN_NM`: `VARCHAR(200)` (`'[웰컴 입점] 첫 배차 데이터 이용료 100% 무료 (Free Pass)'`)
- `DISCOUNT_RATE`: `INT` (`100`)
- `MAX_DISCOUNT_AMT`: `INT` (`33000`)
- `COUPON_STAT_CD`: `VARCHAR(30)` (`'PENDING_APPROVAL'`)
- `REG_DT`, `REG_ID`: 감사 컬럼

### 5.2 전용 SQL 명세

- **`PTNR-ATH-01-SQL-001` (이메일 및 사업자번호 중복 가입 여부 확인)**
```sql
/* PTNR-ATH-01-SQL-001 */
SELECT 
  COUNT(CASE WHEN PTNR_EMAIL = ? THEN 1 END) AS emailDupCnt,
  COUNT(CASE WHEN BIZ_REG_NO = ? OR BIZ_NO = ? OR BIZ_REG_NO = ? OR BIZ_NO = ? THEN 1 END) AS bizDupCnt
FROM TB_PARTNER;
```

- **`PTNR-ATH-01-SQL-002` (당월 기준 신규 파트너 12자리 식별자 채번 락 조회)**
```sql
/* PTNR-ATH-01-SQL-002 */
SELECT MAX(PTNR_NO) AS maxPtnrNo
FROM TB_PARTNER
WHERE PTNR_NO LIKE CONCAT('P', DATE_FORMAT(NOW(), '%Y%m'), '%')
FOR UPDATE;
```

- **`PTNR-ATH-01-SQL-003` (파트너 마스터 신규 등록: TB_PARTNER INSERT)**
```sql
/* PTNR-ATH-01-SQL-003 */
INSERT INTO TB_PARTNER (
  PTNR_NO, PTNR_EMAIL, PTNR_PWD_HASH, PWD_SALT, COMPANY_NM, REP_NM, CEO_NM,
  BIZ_NO, BIZ_REG_NO, PTNR_TEL, PARTNER_APR_STAT_CD, APR_STAT_CD, HAS_INSURANCE_YN, SIGN_IMG_URL,
  REG_DT, REG_ID, MOD_DT, MOD_ID
) VALUES (
  ?, ?, ?, ?, ?, ?, ?,
  ?, ?, ?, 'PENDING', 'WAITING', 'Y', ?,
  NOW(), ?, NOW(), ?
);
```

- **`PTNR-ATH-01-SQL-004` (파트너 제출 서류 목록 등록: TB_PARTNER_DOC INSERT)**
```sql
/* PTNR-ATH-01-SQL-004 */
INSERT INTO TB_PARTNER_DOC (
  PTNR_NO, DOC_TYPE_CD, FILE_URL, APR_STAT_CD, REG_DT, REG_ID, MOD_DT, MOD_ID
) VALUES (
  ?, ?, ?, 'SUBMITTED', NOW(), ?, NOW(), ?
);
```

- **`PTNR-ATH-01-SQL-005` (첫 배차 무료 웰컴 쿠폰 예약 발급: TB_PARTNER_COUPON INSERT)**
```sql
/* PTNR-ATH-01-SQL-005 */
INSERT INTO TB_PARTNER_COUPON (
  P_COUPON_NO, PTNR_NO, CAMPAIGN_NM, DISCOUNT_RATE, MAX_DISCOUNT_AMT,
  COUPON_STAT_CD, REG_DT, REG_ID
) VALUES (
  ?, ?, '[웰컴 입점] 첫 배차 데이터 이용료 100% 무료 (Free Pass)', 100, 33000,
  'PENDING_APPROVAL', NOW(), 'SYSTEM'
);
```

---

## 6. 종합 테스트 및 검증 결과

### 6.1 시나리오별 단위 및 통합 테스트 결과
| 시나리오 | 테스트 모드 / 케이스 | 예상 HTTP 코드 | 비즈니스 결과 | 판정 |
| :--- | :--- | :---: | :--- | :---: |
| **1. 국세청 사업자 진위확인** | `VERIFY_BIZ_NO` (정상 10자리) | `200 OK` | `isValid: true`, `taxType: "부가가치세 일반과세자"` | **PASS** |
| **2. 이메일 중복 차단** | `SUBMIT_APPLICATION` (`partner@clean.com`) | `409 Conflict` | `DUPLICATE_EMAIL` 에러 반환 및 재로그인 유도 | **PASS** |
| **3. 사업자번호 중복 차단** | `SUBMIT_APPLICATION` (기존 번호) | `409 Conflict` | `DUPLICATE_BIZ_NO` 에러 반환 | **PASS** |
| **4. 서류/서명 누락 차단** | `SUBMIT_APPLICATION` (서류 누락) | `400 Bad Request` | `MISSING_BIZ_CERT` 또는 `MISSING_SIGNATURE` 안내 | **PASS** |
| **5. 신규 입점 신청 및 웰컴쿠폰 예약** | `SUBMIT_APPLICATION` (신규 파트너) | `201 Created` | `P20261000006` 채번, `TB_PARTNER` PENDING 등록, `TB_PARTNER_DOC` 4종 등록, `TB_PARTNER_COUPON` 웰컴 쿠폰 예약 발급 | **PASS** |

### 6.2 브라우저 실사 검증 결과
- **URL**: `http://localhost:3000/?v=20261023_ptnr01_v1#partner-join`
- **검증 항목**:
  - [x] 헤더 SsulDak Partner Console, 긴급데스크(1588-0000), 브레드크럼 정상 렌더링 확인
  - [x] 3-Step Process Indicator (`STEP 01` ~ `STEP 03`) 렌더링 확인
  - [x] 웰컴 프로모션 한정 혜택 콜아웃(33,000원 상당 첫 배차 100% 무료 쿠폰 티켓) 렌더링 확인
  - [x] `[국세청 진위확인 API]` 버튼 클릭 시 실시간 진위확인 및 그린 뱃지 피드백 확인
  - [x] 주 시공 가능 지역 태그 추가/삭제 인터랙션 확인
  - [x] 필수 증빙 서류 4종 카드(사업자등록증, 위생자격증, 책임보험증권 1억, 장비 실물 사진 3종) 렌더링 확인
  - [x] 대표자 자필 전자서명 캔버스 드로잉 및 약관 4종 체크박스 토글 확인
  - [x] `[테스트용 자동입력]` 클릭 시 신규 무결성 데이터 원클릭 자동 주입 확인
  - [x] `[ 🎁 입점 신청서 제출하고 무료 쿠폰 받기 ]` 클릭 시 로딩 스피너 및 성공 모달 표출 확인
  - [x] 성공 모달에서 신규 채번된 파트너 번호(`P20261000006`) 및 첫 배차 무료 쿠폰 예약 안내 확인
  - [x] `[파트너 로그인 포털로 이동]` 클릭 시 `#partner-login`(`PTNR-ATH-00`)으로 안전하게 라우팅 확인
