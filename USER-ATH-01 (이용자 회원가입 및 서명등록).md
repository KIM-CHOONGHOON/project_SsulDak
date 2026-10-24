# [SsulDak (쓸고닦고)] USER-ATH-01 (이용자 회원가입 및 서명등록) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-ATH-01` |
| **화면명** | 이용자 회원가입 및 서명등록 (User Registration & Digital Signature) |
| **지원 채널** | Web [Y] / App [Y] (반응형 모바일 스택 & 데스크톱) |
| **도메인 역할** | `User` (이용자 전용) |
| **프론트엔드 파일** | `SsulDak_Web/User/frontend/USER-ATH-01/index.tsx`<br>`SsulDak_Web/User/frontend/USER-ATH-01/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/User/backend/api_USER_ATH_01/route.ts` |
| **API 엔드포인트** | `POST /api/user/user_ath_01` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |

### 핵심 아키텍처 준수 규칙
1. **물리적 역할 격리**: 모든 소스코드는 `SsulDak_Web/User` 하위에서 완결되며, `Admin` 또는 `Partner` 도메인과 소스코드를 교차 참조하거나 공유하지 않습니다.
2. **1:1 매핑 및 전용 SQL ID 원칙**: 타 화면과 API 및 SQL을 절대 공유하지 않으며, 오직 이 화면 전용 SQL ID(`USER-ATH-01-SQL-001 ~ 006`)로 독립 수행됩니다.
3. **회원 식별자 12바이트 고정 규격 준수**: 아래 제2절의 "회원 식별자 규격"을 엄격히 준수합니다 (`U` + `YYYYMM` + `5자리 순번`).
4. **플랫폼 공식 브랜드 로고 사용 원칙**: 모든 WEB 및 APP 화면(GNB, 푸터, 스플래시 등)에서 임의의 폰트 아이콘 대신 반드시 공식 첨부 파일(`쓸고딱고 로고.png` / `/logo.png`)을 적용합니다.
5. **감사 추적 컬럼 필수 기록**: `TB_USER` 생성(INSERT) 시 `REG_DT(NOW())`, `REG_ID(본인 USER_NO)`, `MOD_DT(NOW())`, `MOD_ID(본인 USER_NO)`를 엄격히 세팅합니다.

---

## 2. 회원 식별자(Member ID) 채번 및 관리 규격 (12바이트 고정: `CHAR(12)`)

플랫폼의 모든 회원 식별자(`USER_NO`, `PTNR_NO`, `ADMIN_ID`)는 **반드시 12바이트 고정 규격**으로 생성 및 관리됩니다. 가변 길이나 12자리 미만/초과 데이터는 허용되지 않으며, 프론트엔드 및 백엔드 유효성 검사 단계에서 즉시 차단됩니다.

### 2.1 회원 식별자 12바이트 구조

$$\mathbf{회원\ 식별자(12바이트)} = \mathbf{[역할\ 코드(1바이트)]} + \mathbf{[가입\ 년월(6바이트)]} + \mathbf{[일련번호(5바이트)]}$$

| 자리수 | 바이트 수 | 필드명 | 규격 및 정의 |
| :---: | :---: | :--- | :--- |
| **1번째** | **1바이트** | **역할 식별 코드** | • **`U`** : 사용자 / 이용자 (User)<br>• **`P`** : 파트너 / 청소기사 (Partner)<br>• **`A`** : 관리자 (Admin) |
| **2~7번째** | **6바이트** | **가입 년월 (YYYYMM)** | 회원가입 시점의 연월(예: 2026년 10월 가입 시 `202610`).<br>※ 월이 바뀌면(예: 10월 ➔ 11월) 일련번호는 `00001`부터 리셋됩니다. |
| **8~12번째**| **5바이트** | **일련번호 (Sequence)** | 1부터 채번하되, **앞자리를 '0'으로 채워서(Zero-Padding) 5바이트**를 반드시 충족 (`00001` ~ `99999`). |

### 2.2 동시성 락(Lock) 기반 안전 채번 알고리즘 (`USER-ATH-01-SQL-002`)
가입 트랜잭션 진행 시 당월 접두사(예: `U202610%`)의 최댓값을 `FOR UPDATE`로 조회하여 동시 다발적인 가입 요청 환경에서도 중복 없이 안전하게 1씩 증가 채번합니다:
```sql
/* USER-ATH-01-SQL-002 */
SELECT MAX(USER_NO) AS MAX_USER_NO
FROM TB_USER
WHERE USER_NO LIKE CONCAT('U', DATE_FORMAT(NOW(), '%Y%m'), '%')
FOR UPDATE;
```
- 당월 등록된 첫 번째 회원인 경우: `U20261000001` 채번.
- 기존 최댓값이 `U20261000001`인 경우: 뒷 5자리 추출(1) + 1 = `U20261000002` 채번.

---

## 3. 프론트엔드 (FrontEnd) 구현 명세

### 3.1 파일 위치
- 메인 컴포넌트: [`SsulDak_Web/User/frontend/USER-ATH-01/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-ATH-01/index.tsx)
- Re-export 엔트리: [`SsulDak_Web/User/frontend/USER-ATH-01/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-ATH-01/index.jsx)

### 3.2 단계별 화면 UI/UX 구성요소

컴포넌트는 사용자의 자연스러운 가입 여정을 위해 **2단계 스텝(Step 1 & Step 2)**으로 유기적으로 구성되어 있습니다.

```
[Step 1: 간편 가입 선택 & 약관/추천코드]   ──(필수 약관 동의)──>   [Step 2: 계정 정보 & 자필 전자서명]
  • 카카오/네이버/Google/이메일 선택                                 • 이메일 중복확인 + 비밀번호 복잡도
  • 웰컴 5,000원 쿠폰 혜택 Bento 카드                               • 본인 실명 + 휴대폰 번호
  • 추천인 코드(+5,000P 적립 예약)                                  • ★ HTML5 Canvas 전자서명 패드
  • 구조화된 약관 동의 (만14세/이용약관/개인정보/마케팅)             • [가입 완료하고 5,000원 쿠폰 받기]
```

#### 1) 공통 상단 GNB / 헤더 (`<header>`)
- **뒤로가기 버튼**: Step 2에서는 Step 1로 전환, Step 1에서는 로그인 화면(`USER-ATH-00`)으로 라우팅.
- **브랜드 로고 & 타이틀**: 원형 공식 심볼(`/logo.png`) + "회원가입" / "계정 정보 및 전자서명".
- **단계 인디케이터**: `1 / 2` 또는 `2 / 2` 뱃지 및 상단 진행 상태 프로그레스 바.

#### 2) [Step 1] 가입 방식, 웰컴 베네핏, 추천인 코드, 약관 동의
- **브랜드 신뢰 & 환영 인사**:
  - `Premium Cleaning Care` 펄스 뱃지.
  - "반가워요! 간편하게 시작해요" / "믿을 수 있는 공간 관리 파트너, 쓸고닦고".
- **Hero Welcome Promo Bento 카드 (Mint Gradient)**:
  - `WELCOME BENEFIT` 배지 + `D-DAY 즉시지급`.
  - "가입 즉시 첫 결제 **5,000원** 웰컴 쿠폰!" + 정기청소부터 가전 케어까지 즉시 사용 가능 안내.
- **간편 가입 버튼 그리드 (Google 교체 일관 반영)**:
  - **카카오로 시작하기**: `#FEE500` 카카오 옐로우, 3초 완성.
  - **네이버로 시작하기**: `#03C75A` 네이버 그린, 간편 연동.
  - **Google로 시작하기**: `#FFFFFF` 화이트 바탕 + 공식 4색 심볼 + 원클릭 로그인.
  - **일반 이메일로 가입하기**: `#e5eeff` Surface container.
  - ※ 소셜 버튼 클릭 시 온보딩 편의를 위해 전체 약관이 자동 선택됩니다.
- **추천인 프로모션 아코디언 박스 (Referral Code Box)**:
  - "친구 초대 코드가 있으신가요? **+5,000P**".
  - 코드 8자리 입력 필드 + `[적용]` 버튼.
  - 서버 API(`CHECK_REFERRAL`)를 통해 영업회원 실시간 유효성 확인.
  - 정상 확인 시 `[쓸딱파트너스] 코드가 확인되었습니다 (+5,000P 적립 예약)` 배너 및 삭제(`cancel`) 버튼 표출.
- **구조화된 약관 동의 섹션 (Structured Terms Agreement)**:
  - `[✓] 전체 약관에 동의합니다 (선택 포함)`: 마스터 체크박스.
  - `[필수] 만 14세 이상 이용 동의`
  - `[필수] 쓸고닦고 서비스 이용약관 동의` (3개월 의무 계약 및 위약금 조항 포함, 전문 보기 모달 연동)
  - `[필수] 개인정보 수집 및 전자거래 서명 이용 동의` (전문 보기 모달 연동)
  - `[선택] 마케팅 정보 수신 동의` (`+1,000P` 포인트 적립 뱃지, 전문 보기 모달 연동)
- **하단 스티키 CTA 바**:
  - 필수 약관 모두 체크 시 `[다음 단계로 이동]` 활성화 (Primary Navy, 그림자 이펙트).

#### 3) [Step 2] 계정 상세 정보 입력 및 ★자필 전자서명 등록
- **상세 계정 정보 입력 폼**:
  - **이메일 계정 (로그인 ID)**: 실시간 정규식 검사 + `[중복확인]` 버튼 (`CHECK_EMAIL` API 호출). 중복 확인 통과 시 초록색 체크 마크 표출.
  - **비밀번호**: 8자리 이상 영문/숫자/특수문자 조합 + 눈 모양 보기/숨기기 토글.
  - **비밀번호 확인**: 실시간 일치 여부 피드백 배너 ("비밀번호가 일치합니다").
  - **이름 (실명)**: 이용자 본인 실명 입력.
  - **휴대폰 번호**: 안심번호(0507) 연동을 위한 연락처 입력.
- **★ 전자거래 자필 전자서명 패드 (Signature Canvas)**:
  - 법적 근거 및 안내 문구: `"※ 청소 계약 체결 및 안심번호 거래를 위한 본인 자필 전자서명을 등록해 주세요."`
  - 터치(모바일 디바이스) 및 마우스 드래그 이벤트를 동시 지원하는 HTML5 `<canvas>` 영역 (고해상도 DPR 스케일링 적용).
  - 우측 상단 `[ 지우기 ]` 버튼: 서명 캔버스 즉시 초기화.
  - 서명 미등록 시 하단 가입 완료 버튼 비활성화 (필수 등록 강제).
- **최종 가입 CTA 버튼**:
  - `[ 가입 완료하고 5,000원 쿠폰 받기 ]`
  - 제출 시 로딩 스피너 및 중복 클릭 차단.
- **가입 완료 축하 팝업 모달**:
  - 가입 완료 축하 아이콘 애니메이션.
  - 채번된 12자리 회원 식별자(`U202610...`), 회원 실명, 발급된 5,000원 웰컴 쿠폰 발급 번호 표시.
  - `[ 로그인하러 가기 ]` 버튼 클릭 시 로그인 화면(`USER-ATH-00`)으로 자동 이동.

---

## 4. 백엔드 (BackEnd) 라우터 및 서비스 명세

### 4.1 파일 위치
- 라우터 및 가입 트랜잭션 서비스: [`SsulDak_Web/User/backend/api_USER_ATH_01/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_ATH_01/route.ts)

### 4.2 HTTP 엔드포인트 명세
- **HTTP Method**: `POST`
- **URL**: `/api/user/user_ath_01`
- **Request Header**:
  ```http
  Content-Type: application/json; charset=utf-8
  ```

### 4.3 ActionType별 요청 및 응답 명세

#### 1) 이메일 중복 확인 (`actionType: "CHECK_EMAIL"`)
- **Request Body**:
  ```json
  {
    "actionType": "CHECK_EMAIL",
    "userEmail": "customer@ssuldak.com"
  }
  ```
- **Response Body (HTTP 200)**:
  ```json
  {
    "success": true,
    "isAvailable": true,
    "message": "사용 가능한 이메일 계정입니다."
  }
  ```

#### 2) 추천인 코드 확인 (`actionType: "CHECK_REFERRAL"`)
- **Request Body**:
  ```json
  {
    "actionType": "CHECK_REFERRAL",
    "recommenderCode": "SSULDAK8"
  }
  ```
- **Response Body (HTTP 200)**:
  ```json
  {
    "success": true,
    "isAvailable": true,
    "message": "추천인 [쓸딱파트너스] 코드가 확인되었습니다 (+5,000P 적립 혜택)."
  }
  ```

#### 3) 최종 회원가입 및 서명등록 (`actionType: "REGISTER"`)
- **Request Body**:
  ```json
  {
    "actionType": "REGISTER",
    "userEmail": "customer@ssuldak.com",
    "userPassword": "Password1234!",
    "userNm": "김충훈",
    "userTel": "010-1234-5678",
    "signImgBase64": "data:image/png;base64,iVBORw0KGgo...",
    "recommenderCode": "SSULDAK8",
    "mktAgreeYn": "Y",
    "joinPathCd": "DIRECT"
  }
  ```
- **Response Body (HTTP 201 Created)**:
  ```json
  {
    "success": true,
    "message": "회원가입이 성공적으로 완료되었습니다! 웰컴 5,000원 쿠폰이 자동 지급되었습니다.",
    "userNo": "U20261000002",
    "userNm": "김충훈",
    "welcomeCouponIssued": true,
    "couponInfo": {
      "couponNo": "UCP2026102258393",
      "discountAmt": 5000,
      "expireDt": "30일 이내"
    }
  }
  ```

---

## 5. 데이터베이스 및 전용 SQL 쿼리 명세

### 5.1 화면 전용 독립 SQL 쿼리 ID (`USER-ATH-01-SQL-001 ~ 006`)

#### 1) `USER-ATH-01-SQL-001` (이메일 중복 확인)
```sql
/* USER-ATH-01-SQL-001 */
SELECT COUNT(*) AS CNT 
FROM TB_USER 
WHERE USER_EMAIL = ?;
```

#### 2) `USER-ATH-01-SQL-002` (당월 기준 12자리 이용자 ID 최댓값 조회 및 락 채번)
```sql
/* USER-ATH-01-SQL-002 */
SELECT MAX(USER_NO) AS MAX_USER_NO
FROM TB_USER
WHERE USER_NO LIKE CONCAT(?, '%')
FOR UPDATE;
```

#### 3) `USER-ATH-01-SQL-003` (신규 이용자 마스터 등록)
```sql
/* USER-ATH-01-SQL-003 */
INSERT INTO TB_USER (
  USER_NO, USER_EMAIL, USER_PWD_HASH, PWD_SALT, USER_NM, USER_TEL,
  SIGN_IMG_URL, JOIN_PATH_CD, RECOMMENDER_CODE, USER_STAT_CD,
  CANCEL_ACCUM_CNT, MKT_AGREE_YN, LAST_LOGIN_DT, REG_DT, REG_ID, MOD_DT, MOD_ID
) VALUES (
  ?, ?, ?, ?, ?, ?,
  ?, ?, ?, 'NORMAL',
  0, ?, NOW(), NOW(), ?, NOW(), ?
);
```

#### 4) `USER-ATH-01-SQL-004` (추천인 코드 유효성 검증 및 추천 실적 갱신)
```sql
/* USER-ATH-01-SQL-004 */
UPDATE TB_SALES_MEMBER 
SET 
  TOTAL_RECRUIT_CNT = TOTAL_RECRUIT_CNT + 1,
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE REFERRAL_CODE = ? AND SALES_STAT_CD = 'ACTIVE';
```

#### 5) `USER-ATH-01-SQL-005` (신규 가입 웰컴 프로모션 캠페인 조회)
```sql
/* USER-ATH-01-SQL-005 */
SELECT CAMPAIGN_NO, CAMPAIGN_NM, DISCOUNT_AMT, VALID_DAYS
FROM TB_PROMO_CAMPAIGN
WHERE TARGET_ROLE_CD IN ('USER', 'ALL') 
  AND IS_ACTIVE_YN = 'Y' 
  AND NOW() BETWEEN START_DT AND END_DT
ORDER BY REG_DT DESC 
LIMIT 1;
```

#### 6) `USER-ATH-01-SQL-006` (신규 이용자 웰컴 쿠폰 자동 발급)
```sql
/* USER-ATH-01-SQL-006 */
INSERT INTO TB_USER_COUPON (
  COUPON_ISSUE_NO, USER_NO, CAMPAIGN_ID, COUPON_SERIAL_CD, COUPON_NM,
  DISCOUNT_AMT, COUPON_STAT_CD, EXPIRE_DT, REG_DT, REG_ID, MOD_DT, MOD_ID
) VALUES (
  ?, ?, ?, ?, ?,
  ?, 'AVAILABLE', DATE_ADD(NOW(), INTERVAL ? DAY), NOW(), 'SYSTEM', NOW(), 'SYSTEM'
);
```

---

## 6. 프로그램 테스트 및 수정 가이드 (테스트 엔지니어/개발자용)

### 6.1 CLI 기반 회원가입 엔진 통합 검증 실행

터미널에서 아래 명령을 실행하여 이메일 중복확인, 추천코드 검증, 12자리 이용자 채번 및 웰컴 쿠폰 자동 발급 트랜잭션을 일괄 검증합니다.

```bash
# 1. TypeScript 전체 정적 타입 체크
npx tsc --noEmit

# 2. 회원가입 및 서명등록 서비스 로직 단위 검증
npx tsx --env-file=.env.local -e "
import { processUserAth01 } from './SsulDak_Web/User/backend/api_USER_ATH_01/route.ts';

async function testUserAth01() {
  console.log('=== [1] 이메일 중복 확인 검증 ===');
  const res1 = await processUserAth01({
    actionType: 'CHECK_EMAIL',
    userEmail: 'new_unique_user@ssuldak.com'
  });
  console.log('중복 확인 결과 (사용 가능 여부):', res1.data.isAvailable);

  console.log('\n=== [2] 추천인 코드 유효성 검증 ===');
  const res2 = await processUserAth01({
    actionType: 'CHECK_REFERRAL',
    recommenderCode: 'SSULDAK8'
  });
  console.log('추천인 확인 결과:', res2.data.isAvailable, res2.data.message);

  console.log('\n=== [3] 회원가입 + 12자리 채번 + 웰컴쿠폰 발급 트랜잭션 ===');
  const res3 = await processUserAth01({
    actionType: 'REGISTER',
    userEmail: 'user_' + Date.now() + '@ssuldak.com',
    userPassword: 'Password1234!',
    userNm: '김충훈',
    userTel: '010-1234-5678',
    signImgBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    recommenderCode: 'SSULDAK8',
    mktAgreeYn: 'Y'
  });
  console.log('가입 성공 여부 (HTTP 201):', res3.status === 201, res3.data.success);
  console.log('채번된 12자리 이용자 식별자:', res3.data.userNo);
  console.log('쿠폰 자동 발급 완료:', res3.data.welcomeCouponIssued);
  console.log('발급 쿠폰 번호:', res3.data.couponInfo?.couponNo);
  process.exit(0);
}
testUserAth01();
"
```

### 6.2 테스트 케이스별 검증 포인트

| TC 번호 | 테스트 시나리오 | 사전 조건 / 입력값 | 예상 결과 |
| :---: | :--- | :--- | :--- |
| **TC-01** | 신규 이용자 정상 가입 | 유효한 이메일, 패스워드, 이름, 서명 Canvas | **HTTP 201 Created**: 12자리 회원 식별자(`U2026100000X`) 발급 및 5,000원 웰컴 쿠폰 자동 지급. |
| **TC-02** | 이미 존재하는 이메일 가입 시도 | 기존 가입된 이메일 계정 입력 | **HTTP 409 Conflict**: "이미 가입된 이메일 계정입니다." 안내 및 가입 차단. |
| **TC-03** | 자필 전자서명 미등록 시도 | `signImgBase64` 공백 또는 누락 | **HTTP 400 Bad Request**: "본인 자필 전자서명을 반드시 작성해 주세요." 경고 표출. |
| **TC-04** | 추천인 코드 입력 및 실적 누적 | 유효 코드 `SSULDAK8` 입력 | 추천인 정보 확인 통과 및 가입 완료 시 `TB_SALES_MEMBER.TOTAL_RECRUIT_CNT` 1 증가. |
| **TC-05** | 필수 약관 미동의 시 버튼 상태 | 필수 3개 약관 중 1개 미체크 | `[다음 단계로 이동]` 버튼 비활성화 (`cursor-not-allowed`) 및 진행 불가. |
| **TC-06** | 전체 약관 동의 토글 | 마스터 체크박스 클릭 | 만14세, 서비스이용약관, 개인정보, 마케팅 수신동의 일괄 선택/해제 동기화. |

---

## 7. DB 테스트 데이터 초기화 및 변경 SQL (MySQL)

```sql
-- 1. 영업회원(추천인 코드: SSULDAK8) 테스트 데이터 세팅
INSERT INTO TB_SALES_MEMBER (
  SALES_NO, SALES_EMAIL, SALES_PWD_HASH, PWD_SALT, SALES_NM, SALES_TEL,
  REFERRAL_CODE, BANK_CD, BANK_ACCOUNT_NO, ACCOUNT_HOLDER, SALES_STAT_CD,
  TOTAL_RECRUIT_CNT, REG_DT, REG_ID, MOD_DT, MOD_ID
)
VALUES (
  'S20261000001', 'sales01@ssuldak.com', 'dummy_hash', 'dummy_salt', '쓸딱파트너스', '010-9999-8888',
  'SSULDAK8', '004', '1234567890', '쓸딱', 'ACTIVE',
  0, NOW(), 'SYSTEM', NOW(), 'SYSTEM'
)
ON DUPLICATE KEY UPDATE SALES_STAT_CD = 'ACTIVE';

-- 2. 신규 가입 웰컴 프로모션 캠페인 세팅
INSERT INTO TB_PROMO_CAMPAIGN (
  CAMPAIGN_NO, CAMPAIGN_NM, TARGET_ROLE_CD, DISCOUNT_AMT, VALID_DAYS, IS_ACTIVE_YN, START_DT, END_DT
)
VALUES (
  'CMP_WELCOME_5000', '신규가입 웰컴 5,000원 즉시할인 쿠폰', 'USER', 5000.00, 30, 'Y',
  '2026-01-01 00:00:00', '2026-12-31 23:59:59'
)
ON DUPLICATE KEY UPDATE IS_ACTIVE_YN = 'Y';
```
