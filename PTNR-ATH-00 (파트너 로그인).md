# [SsulDak (쓸고닦고)] PTNR-ATH-00 (파트너 로그인) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `PTNR-ATH-00` |
| **화면명** | 파트너 로그인 (Partner Access & Authentication) |
| **지원 채널** | Web Console (PC 1440px 최적화) / Mobile Web (390px 반응형) |
| **도메인 역할** | `Partner` (전문가/시공 파트너 전용) |
| **프론트엔드 파일** | `SsulDak_Web/Partner/frontend/PTNR-ATH-00/index.tsx`<br>`SsulDak_Web/Partner/frontend/PTNR-ATH-00/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/Partner/backend/api_PTNR_ATH_00/route.ts` |
| **API 엔드포인트** | `POST /api/partner/ptnr_ath_00` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |
| **호출 대상 화면** | `PTNR-COM-00` (파트너 메인 오더피드 대시보드), `PTNR-ATH-01` (파트너 입점 신청) |

### 핵심 아키텍처 준수 규칙
1. **물리적 격리**: 모든 파트너 관련 소스코드는 `SsulDak_Web/Partner/` 내에서 프론트엔드와 백엔드를 독립 완결하며, `User`(이용자) 및 `Admin`(관리자) 도메인 파일과 코드를 공유하지 않습니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/Partner/frontend/PTNR-ATH-00/index.tsx`
   - 백엔드 라우터: `SsulDak_Web/Partner/backend/api_PTNR_ATH_00/route.ts`
   - 엔드포인트 URL: `POST /api/partner/ptnr_ath_00`
3. **독립 전용 SQL 원칙**: 타 화면과 쿼리를 일체 공유하지 않으며 오직 `PTNR-ATH-00-SQL-001 ~ PTNR-ATH-00-SQL-003` 전용 SQL ID로 작성 및 트랜잭션을 분리합니다.
4. **회원 식별자 12바이트 고정 규격 준수**: 파트너 식별자(`PTNR_NO`)는 반드시 `CHAR(12)` 규격(`P` + `YYYYMM` + 5자리 일련번호)을 따릅니다.
5. **파트너 심사 상태(PARTNER_APR_STAT_CD) 판정 룰**:
   - `PENDING` (심사 대기): 로그인 차단 (HTTP 403), 안내 팝업 표출.
   - `REJECTED` (심사 반려): 로그인 차단 (HTTP 403), 반려 사유 안내 및 재제출 유도.
   - `SUSPENDED_7D` (선취소 제재): 로그인 차단 (HTTP 403), 고객센터 안내.
   - `APPROVED` (정상 승인): 로그인 성공 (HTTP 200), 파트너 전용 JWT 토큰 발급, 최근 접속일시 갱신.

---

## 2. 회원 식별자(Partner ID) 규격 (12바이트 고정: `CHAR(12)`)

$$\mathbf{파트너\ 식별자(12바이트)} = \mathbf{['P'(1바이트)]} + \mathbf{[가입\ 년월(6바이트)]} + \mathbf{[일련번호(5바이트)]}$$

| 자리수 | 바이트 수 | 필드명 | 규격 및 정의 |
| :---: | :---: | :--- | :--- |
| **1번째** | **1바이트** | **역할 식별 코드** | • **`P`** : 파트너 / 청소기사 / 시공팀 (Partner) |
| **2~7번째** | **6바이트** | **가입 년월 (YYYYMM)** | 가입 승인 연월(예: 2026년 10월 승인 시 `202610`) |
| **8~12번째**| **5바이트** | **일련번호 (Sequence)** | Zero-Padding 5자리 일련번호 (`00001` ~ `99999`) |

- **파트너 1호 예시**: `P` + `202610` + `00001` = **`P20261000001`** (정확히 12자리)

---

## 3. 프론트엔드 (FrontEnd) 구현 명세

### 3.1 파일 경로
- 메인 컴포넌트: [`SsulDak_Web/Partner/frontend/PTNR-ATH-00/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/Partner/frontend/PTNR-ATH-00/index.tsx)
- Re-export 엔트리: [`SsulDak_Web/Partner/frontend/PTNR-ATH-00/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/Partner/frontend/PTNR-ATH-00/index.jsx)

### 3.2 화면 UI/UX 구성 및 반응형 아키텍처

```
+----------------------------------------------------------------------------------------------------+
| [Top Identity Minimal Bar]                                                                         |
| (Logo) SsulDak [PARTNER WEB CONSOLE] | 프리미엄 공간 케어 파트너 관리 포털    [보안 정상 (TLS 1.3)] [긴급지원 1588-0000] |
+----------------------------------------------------------------------------------------------------+
| [Left Column (7-Col Desktop Architecture)]      | [Right Column (5-Col Login Console Card)]         |
| 1. Hero Statement                              | 1. Card Header                                    |
|    - [대한민국 1위 공간 클리닝 전문가 네트워크]            |    - "파트너 로그인" / "실시간 접속" 뱃지              |
|    - 청소 전문가를 위한 스마트 배차 안심 플랫폼              | 2. Segmented Role Switcher                        |
|                                                |    - [사업자 파트너] | [마스터 클리너 (기사)]           |
| 2. Trust Stats Banner                          | 3. Login Form                                     |
|    - 3,500+ 전국 전문 시공팀 활동 (99.4% 만족)        |    - 아이디(이메일/기사코드) 입력 인풋                |
|    - 월평균 매출 480만원 (상위 20% 890만 돌파)          |    - 비밀번호 인풋 (눈 모양 토글 + 찾기 링크)           |
|                                                |    - [✓] 로그인 상태 유지  [ ] 아이디 저장            |
| 3. 3 Pillars Grid                              |    - [ 파트너 로그인 -> ] CTA 버튼                   |
|    - [스마트 오더 배차] AI 반경 추천 시스템             |    - [카카오 비즈니스 계정 간편 인증] 버튼              |
|    - [100% 에스크로 익일 정산] D+1 자동 입금 보장        |    - 사업자번호 확인 / PIN 재발급 링크               |
|    - [기업·공공 독점 계약] B2B 대형 물량 독점            | 4. High-Impact Promotion Card                     |
|                                                |    - 신규 입점 시 "첫 배차 100% 무료 쿠폰" 지급          |
| 4. Master Partner App QR Showcase              |    - [ 무료 파트너 입점 신청하기 (PTNR-ATH-01) > ]     |
|    - 현장 전용 앱 소개 & Google Play / App Store 다운 |                                                   |
+----------------------------------------------------------------------------------------------------+
| [Partner Dedicated Support & Trust Credentials]                                                    |
| [1588-0000 핫라인]            | [카카오톡 @쓸고닦고파트너]        | [ISMS-P & 전자금융보호 안심망]       |
| (C) SsulDak Partner Operations. All rights reserved. | 이용약관 · 에스크로 정산 운영정책 · 개인정보처리방침    |
+----------------------------------------------------------------------------------------------------+
```

### 3.3 핵심 인터랙션 및 상태 관리
1. **역할 스위처 (`currentRole`)**:
   - `business` (사업자 파트너): 라벨 "사업자/대표자 이메일", 플레이스홀더 `partner@clean.com`, 입력 타입 `email`.
   - `cleaner` (마스터 클리너): 라벨 "기사 등록 휴대폰 번호 또는 클리너 ID", 플레이스홀더 `010-0000-0000 또는 기사 코드`, 입력 타입 `text`.
2. **비밀번호 보기/숨기기 토글 (`showPassword`)**:
   - 우측 눈 아이콘(`visibility` / `visibility_off`) 클릭 시 타입 동적 전환.
3. **신규 입점 혜택 프로모션 카드 (`PTNR-ATH-01`)**:
   - '첫 배차 100% 무료 쿠폰(33,000원 상당)' 안내 배너 및 `PTNR-ATH-01` 입점 신청서 이동 CTA 링크.
4. **심사 상태별 인터랙티브 알림 모달**:
   - **`PENDING` 모달**: "사업자등록증 및 배상보험 서류 심사 진행 중 (24시간 이내 승인)" 고지.
   - **`REJECTED` 모달**: 반려 사유(`rejectReason`) 안내 및 `[입점 서류 보완 제출]` 링크 제공.
   - **`SUSPENDED` 모달**: "선취소 패널티로 인한 이용 제한" 고지 및 고객센터 즉시 연결 안내.
5. **개발/검증용 빠른 테스트 계정 툴바**:
   - 화면 우측 상단 플로팅 툴바를 통해 승인 계정, 심사대기 계정, 반려 계정, 제재 계정을 1클릭으로 폼에 즉시 채워 즉각 검증 가능.

---

## 4. 백엔드 라우터 및 데이터베이스 명세

### 4.1 파일 경로 및 엔드포인트
- 백엔드 파일: [`SsulDak_Web/Partner/backend/api_PTNR_ATH_00/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/Partner/backend/api_PTNR_ATH_00/route.ts)
- 엔드포인트: `POST /api/partner/ptnr_ath_00`
- Content-Type: `application/json`

### 4.2 요청 및 응답 포맷

#### Request Body
```json
{
  "actionType": "LOGIN",
  "ptnrEmail": "partner@clean.com",
  "ptnrPassword": "Password1234!",
  "roleType": "business"
}
```

#### Response (성공: 200 OK)
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsIn...",
  "partner": {
    "ptnrNo": "P20261000001",
    "ptnrEmail": "partner@clean.com",
    "companyNm": "반짝빌라클린",
    "ceoNm": "홍길동",
    "bizRegNo": "123-45-67890",
    "hasInsurance": true
  },
  "message": "로그인에 성공하였습니다. 파트너 대시보드로 이동합니다."
}
```

#### Response (심사 대기: 403 Forbidden)
```json
{
  "success": false,
  "code": "APPROVAL_PENDING",
  "message": "사업자등록증 및 배상보험 서류 심사가 진행 중입니다. (영업일 기준 24시간 이내 승인 완료)"
}
```

#### Response (심사 반려: 403 Forbidden)
```json
{
  "success": false,
  "code": "APPROVAL_REJECTED",
  "rejectReason": "영업배상책임보험 증명서 미첨부 및 사업자등록증 식별 불가",
  "message": "입점 심사가 반려되었습니다. 사유: 영업배상책임보험 증명서 미첨부 및 사업자등록증 식별 불가"
}
```

---

## 5. 데이터베이스 스키마 및 독립 전용 SQL

### 5.1 테이블 스키마

#### 1) `TB_PARTNER` (파트너 마스터 테이블)
| 컬럼명 | 타입 | Nullable | 설명 |
| :--- | :--- | :---: | :--- |
| `PTNR_NO` | `CHAR(12)` | NO (PK) | 파트너 식별자 (`P` + `YYYYMM` + 5자리) |
| `PTNR_EMAIL` | `VARCHAR(100)` | NO (UQ) | 사업자/대표자 이메일 |
| `PTNR_PWD_HASH` | `VARCHAR(255)` | NO | 비밀번호 단방향 PBKDF2 해시 |
| `PWD_SALT` | `VARCHAR(64)` | YES | 암호화 솔트 |
| `COMPANY_NM` | `VARCHAR(100)` | NO | 상호명 |
| `CEO_NM` | `VARCHAR(50)` | YES | 대표자 성명 |
| `BIZ_REG_NO` | `VARCHAR(12)` | YES | 사업자등록번호 (10자리) |
| `PARTNER_APR_STAT_CD` | `VARCHAR(20)` | NO | 입점 승인 상태 (`PENDING`, `APPROVED`, `REJECTED`, `SUSPENDED_7D`) |
| `REJECT_REASON` | `VARCHAR(500)` | YES | 심사 반려 사유 |
| `HAS_INSURANCE_YN` | `CHAR(1)` | NO | 영업배상책임보험 가입 승인 여부 (`Y`/`N`) |
| `LAST_LOGIN_DT` | `DATETIME` | YES | 최근 로그인 일시 |
| `MOD_DT` | `DATETIME` | YES | 수정 일시 |
| `MOD_ID` | `VARCHAR(50)` | YES | 수정자 식별자 |

#### 2) `TB_PARTNER_LOGIN_LOG` (파트너 로그인 접속 이력 원장)
| 컬럼명 | 타입 | Nullable | 설명 |
| :--- | :--- | :---: | :--- |
| `LOG_SEQ` | `BIGINT` | NO (PK, AI) | 로그 순번 |
| `PTNR_NO` | `CHAR(12)` | YES | 파트너 식별자 |
| `LOGIN_IP` | `VARCHAR(50)` | YES | 접속 IP 주소 |
| `USER_AGENT` | `VARCHAR(300)` | YES | 클라이언트 브라우저 및 기기 정보 |
| `LOGIN_STAT_CD` | `VARCHAR(20)` | NO | `SUCCESS`, `FAIL_PWD`, `BLOCKED_PENDING`, `BLOCKED_REJECT`, `BLOCKED_SUSPENDED` |
| `REG_DT` | `DATETIME` | NO | 접속 로그 생성 일시 |

### 5.2 전용 SQL 명세

- **`PTNR-ATH-00-SQL-001` (파트너 인증 데이터 조회)**
```sql
/* PTNR-ATH-00-SQL-001 */
SELECT 
  PTNR_NO AS ptnrNo,
  PTNR_EMAIL AS ptnrEmail,
  PTNR_PWD_HASH AS ptnrPwdHash,
  PWD_SALT AS pwdSalt,
  COMPANY_NM AS companyNm,
  CEO_NM AS ceoNm,
  COALESCE(BIZ_REG_NO, BIZ_NO) AS bizRegNo,
  COALESCE(PARTNER_APR_STAT_CD, APR_STAT_CD) AS aprStatCd,
  REJECT_REASON AS rejectReason,
  HAS_INSURANCE_YN AS hasInsuranceYn
FROM TB_PARTNER
WHERE PTNR_EMAIL = ?;
```

- **`PTNR-ATH-00-SQL-002` (로그인 성공 시 최근 접속일시 및 감사정보 갱신)**
```sql
/* PTNR-ATH-00-SQL-002 */
UPDATE TB_PARTNER
SET 
  LAST_LOGIN_DT = NOW(),
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE PTNR_NO = ?;
```

- **`PTNR-ATH-00-SQL-003` (파트너 로그인 접속 로그 적재)**
```sql
/* PTNR-ATH-00-SQL-003 */
INSERT INTO TB_PARTNER_LOGIN_LOG (
  PTNR_NO, LOGIN_IP, USER_AGENT, LOGIN_STAT_CD, REG_DT
) VALUES (
  ?, ?, ?, ?, NOW()
);
```

---

## 6. 종합 테스트 및 검증 결과

### 6.1 시나리오별 단위 및 통합 테스트 결과
| 시나리오 | 테스트 계정 | 입력 비밀번호 | 예상 HTTP 코드 | 비즈니스 결과 | 판정 |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **1. 정상 승인 로그인** | `partner@clean.com` | `Password1234!` | `200 OK` | JWT 발급, `LAST_LOGIN_DT` 갱신, `PTNR-COM-00` 이동 | **PASS** |
| **2. 심사 대기 계정 차단** | `pending@clean.com` | `Password1234!` | `403 Forbidden` | `APPROVAL_PENDING` 응답, 24시간 심사 안내 모달 표출 | **PASS** |
| **3. 심사 반려 계정 차단** | `rejected@clean.com` | `Password1234!` | `403 Forbidden` | `APPROVAL_REJECTED` 응답, 반려 사유 표출 및 서류 재제출 유도 | **PASS** |
| **4. 선취소 제재 계정** | `suspended@clean.com`| `Password1234!` | `403 Forbidden` | `SUSPENDED` 응답, 1588-0000 고객센터 안내 모달 표출 | **PASS** |
| **5. 비밀번호 불일치** | `partner@clean.com` | `WrongPassword!` | `401 Unauthorized`| `FAIL_PWD` 로그 기록, 인증 실패 토스트 표출 | **PASS** |

### 6.2 브라우저 실사 검증 결과
- **URL**: `http://localhost:3000/#partner-login`
- **검증 항목**:
  - [x] 상단 헤더 Minimal Identity Bar 렌더링 확인
  - [x] 좌측 7열 신뢰 지표 배너, 3대 기둥, 모바일 파트너 앱 QR 쇼케이스 렌더링 확인
  - [x] 우측 5열 파트너 로그인 카드 및 역할 스위처(`사업자 파트너` ↔ `마스터 클리너`) 탭 전환 및 폼 라벨/플레이스홀더 동적 반응 확인
  - [x] 비밀번호 보기/숨기기 토글 아이콘 및 상태 전환 확인
  - [x] '신규 입점 혜택 프로모션 카드'에서 `PTNR-ATH-01` 라우팅 확인
  - [x] 심사 대기(`PENDING`) 모달 인터랙션 및 닫기 확인
  - [x] 심사 반려(`REJECTED`) 모달에서 반려 사유 텍스트 노출 및 보완 제출 링크 확인
  - [x] 정상 파트너(`APPROVED`) 로그인 성공 시 `ssuldak_ptnr_token` 로컬스토리지 저장 및 대시보드 라우팅 확인
