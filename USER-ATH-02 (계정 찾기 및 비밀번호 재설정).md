# [SsulDak (쓸고닦고)] USER-ATH-02 (계정 찾기 및 비밀번호 재설정) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-ATH-02` |
| **화면명** | 계정 찾기 및 비밀번호 재설정 (Find Account & Password Reset) |
| **지원 채널** | Web [Y] / App [Y] |
| **도메인 역할** | `User` (이용자 전용) |
| **프론트엔드 파일** | `SsulDak_Web/User/frontend/USER-ATH-02/index.tsx`<br>`SsulDak_Web/User/frontend/USER-ATH-02/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/User/backend/api_USER_ATH_02/route.ts` |
| **API 엔드포인트** | `POST /api/user/user_ath_02` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |

### 핵심 아키텍처 준수 규칙
1. **물리적 역할 격리**: 모든 소스코드는 `SsulDak_Web/User` 하위에서 완결되며, `Admin` 또는 `Partner` 도메인과 소스코드를 교차 참조하거나 공유하지 않습니다.
2. **1:1 매핑 및 전용 SQL ID 원칙**: 타 화면과 API 및 SQL을 절대 공유하지 않으며, 오직 이 화면 전용 SQL ID(`USER-ATH-02-SQL-001 ~ 006`)로 독립 수행됩니다.
3. **감사 추적 컬럼 필수 기록**: 비밀번호 변경 시 대상 회원의 `MOD_DT(NOW())`, `MOD_ID(본인 USER_NO)`를 엄격히 갱신합니다.
4. **보안 강화 조치 (비밀번호 변경 시 세션 일괄 파기)**: 비밀번호 재설정 완료 시 해당 회원의 모든 기존 로그인 세션을 즉시 무효화(`TB_USER_SESSION.IS_VALID_YN = 'N'`)하여 도용 위험을 원천 차단합니다.

---

## 2. 프론트엔드 (FrontEnd) 구현 명세

### 2.1 파일 위치
- 메인 컴포넌트: [`SsulDak_Web/User/frontend/USER-ATH-02/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-ATH-02/index.tsx)
- Re-export 엔트리: [`SsulDak_Web/User/frontend/USER-ATH-02/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-ATH-02/index.jsx)

### 2.2 화면 UI/UX 구성요소

화면은 이용자 편의를 위해 **2개의 상단 탭(아이디 찾기 / 비밀번호 재설정)**으로 직관적으로 구성되어 있습니다.

```
       [ USER-ATH-02 상단 탭 네비게이션 ]
    ┌───────────────────────┬───────────────────────┐
    │   아이디(이메일) 찾기  │     비밀번호 재설정    │
    └───────────────────────┴───────────────────────┘
```

#### 1) 공통 상단 GNB 헤더
- **뒤로가기 버튼**: 클릭 시 로그인 화면(`USER-ATH-00`)으로 라우팅.
- **브랜드 로고 심볼**: 청록색 공식 로고(`/logo.png`) 및 브랜드명 표출.
- **우측 유틸리티**: `[ 로그인으로 돌아가기 ]` 링크.

#### 2) [탭 1: 아이디(이메일) 찾기]
- **입력 필드**:
  - `이름 (실명)`: 가입 시 등록한 본인 실명 입력.
  - `휴대폰 번호`: 본인 휴대폰 번호 입력 (하이픈 자동/수동 대응).
- **액션 버튼**: `[ 아이디 찾기 ]` (Primary Navy / 로딩 상태 프로그레스 표출).
- **조회 결과 카드**:
  - 회원 정보 확인 시: `"회원님의 계정을 찾았습니다"`
  - 보안 마스킹 이메일: `use***@ssuldak.com` 형태 표기.
  - 가입 일자: `2026.10.22` 형태 표기.
  - 하단 빠른 연계 버튼: `[ 로그인하러 가기 ]` / `[ 비밀번호 찾기 ]` (탭 2 자동 전환).

#### 3) [탭 2: 비밀번호 재설정 (스텝별 인터랙션)]
- **Step 1: 계정 확인 및 인증번호 요청**:
  - `가입 이메일`: 로그인 아이디 입력.
  - `휴대폰 번호`: 등록된 연락처 입력.
  - `[ 인증번호 받기 ]` / `[ 재전송 ]` 버튼.
- **Step 2: 인증번호 입력 (6자리 + 3분 타이머)**:
  - 인증번호 발송 즉시 3분(`03:00`) 카운트다운 타이머 작동.
  - 6자리 인증코드 입력 필드.
- **Step 3: 신규 비밀번호 설정**:
  - `새 비밀번호`: 눈 모양 보기/숨기기 토글 + 영문, 숫자, 특수문자 조합 8자리 이상 복잡도 검사.
  - `새 비밀번호 확인`: 실시간 일치 여부 피드백 ("비밀번호가 완벽하게 일치합니다").
  - `[ 비밀번호 재설정 완료 ]` 버튼 (Primary Navy).
- **완료 모달 팝업**:
  - 축하 아이콘 애니메이션.
  - `"비밀번호가 변경되었습니다!"` 안내.
  - `[ 새 비밀번호로 로그인 ]` 클릭 시 로그인 화면(`USER-ATH-00`)으로 자동 이동.

---

## 3. 백엔드 (BackEnd) 라우터 및 서비스 명세

### 3.1 파일 위치
- 라우터 및 인증 서비스: [`SsulDak_Web/User/backend/api_USER_ATH_02/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_ATH_02/route.ts)

### 3.2 HTTP 엔드포인트 명세
- **HTTP Method**: `POST`
- **URL**: `/api/user/user_ath_02`
- **Request Header**:
  ```http
  Content-Type: application/json; charset=utf-8
  ```

### 3.3 모드별 요청 및 응답 JSON

#### 1) 아이디(이메일) 찾기 (`mode: "FIND_EMAIL"`)
- **Request Body**:
  ```json
  {
    "mode": "FIND_EMAIL",
    "userNm": "홍길동",
    "userTel": "010-1234-5678"
  }
  ```
- **Response Body (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "회원님의 계정 정보를 성공적으로 찾았습니다.",
    "maskedEmail": "use***@ssuldak.com",
    "regDate": "2026.10.22"
  }
  ```

#### 2) 비밀번호 재설정 인증번호 발송 요청 (`mode: "SEND_RESET_CODE"`)
- **Request Body**:
  ```json
  {
    "mode": "SEND_RESET_CODE",
    "userEmail": "user01@ssuldak.com",
    "userTel": "010-1234-5678"
  }
  ```
- **Response Body (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "인증번호(6자리)가 발송되었습니다. 3분 이내에 입력해 주세요.",
    "devAuthCode": "518987"
  }
  ```

#### 3) 인증번호 검증 및 신규 비밀번호 재설정 (`mode: "RESET_PASSWORD"`)
- **Request Body**:
  ```json
  {
    "mode": "RESET_PASSWORD",
    "userEmail": "user01@ssuldak.com",
    "userTel": "010-1234-5678",
    "authCode": "518987",
    "newPassword": "NewPassword2026!"
  }
  ```
- **Response Body (HTTP 200)**:
  ```json
  {
    "success": true,
    "message": "비밀번호가 성공적으로 재설정되었습니다. 새로운 비밀번호로 로그인해 주세요."
  }
  ```

---

## 4. 데이터베이스 및 전용 SQL 쿼리 명세

### 4.1 화면 전용 독립 SQL 쿼리 ID (`USER-ATH-02-SQL-001 ~ 006`)

#### 1) `USER-ATH-02-SQL-001` (이름과 휴대폰 번호로 등록 이메일 마스킹 조회)
```sql
/* USER-ATH-02-SQL-001 */
SELECT 
  USER_EMAIL, 
  REG_DT, 
  USER_STAT_CD
FROM TB_USER
WHERE USER_NM = ? 
  AND REPLACE(USER_TEL, '-', '') = ? 
  AND USER_STAT_CD != 'WITHDRAWN'
ORDER BY REG_DT DESC
LIMIT 1;
```

#### 2) `USER-ATH-02-SQL-002` (이메일과 휴대폰 번호 일치 검증 및 회원 식별자 조회)
```sql
/* USER-ATH-02-SQL-002 */
SELECT 
  USER_NO, 
  USER_NM, 
  USER_STAT_CD
FROM TB_USER
WHERE USER_EMAIL = ? 
  AND REPLACE(USER_TEL, '-', '') = ?;
```

#### 3) `USER-ATH-02-SQL-003` (비밀번호 재설정 인증번호 저장: TB_SMS_AUTH_LOG INSERT)
```sql
/* USER-ATH-02-SQL-003 */
INSERT INTO TB_SMS_AUTH_LOG (
  RECV_TEL, AUTH_TYPE_CD, AUTH_CODE, EXPIRE_DT, VERIFY_YN, REG_DT
) VALUES (
  ?, 'PWD_RESET', ?, DATE_ADD(NOW(), INTERVAL 3 MINUTE), 'N', NOW()
);
```

#### 4) `USER-ATH-02-SQL-004` (유효한 3분 이내 인증번호 검증)
```sql
/* USER-ATH-02-SQL-004 */
SELECT AUTH_SEQ
FROM TB_SMS_AUTH_LOG
WHERE REPLACE(RECV_TEL, '-', '') = ? 
  AND AUTH_TYPE_CD = 'PWD_RESET' 
  AND AUTH_CODE = ? 
  AND VERIFY_YN = 'N' 
  AND EXPIRE_DT >= NOW()
ORDER BY AUTH_SEQ DESC
LIMIT 1;
```

#### 5) `USER-ATH-02-SQL-005` (인증 완료 처리)
```sql
/* USER-ATH-02-SQL-005 */
UPDATE TB_SMS_AUTH_LOG
SET VERIFY_YN = 'Y'
WHERE AUTH_SEQ = ?;
```

#### 6) `USER-ATH-02-SQL-006` (신규 비밀번호 해시 및 솔트 갱신: TB_USER UPDATE)
```sql
/* USER-ATH-02-SQL-006 */
UPDATE TB_USER
SET 
  USER_PWD_HASH = ?,
  PWD_SALT = ?,
  PWD_CHG_DT = NOW(),
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE USER_NO = ?;
```

### 4.2 관련 테이블 DDL

#### `TB_SMS_AUTH_LOG` (휴대폰 인증번호 발송 원장)
```sql
CREATE TABLE IF NOT EXISTS TB_SMS_AUTH_LOG (
  AUTH_SEQ      BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '인증 일련번호',
  RECV_TEL      VARCHAR(20) NOT NULL COMMENT '수신 휴대폰 번호',
  AUTH_TYPE_CD  VARCHAR(20) NOT NULL DEFAULT 'PWD_RESET' COMMENT '인증 구분 (PWD_RESET 등)',
  AUTH_CODE     CHAR(6) NOT NULL COMMENT '6자리 인증번호',
  EXPIRE_DT     DATETIME NOT NULL COMMENT '만료 일시 (발송 3분 후)',
  VERIFY_YN     CHAR(1) NOT NULL DEFAULT 'N' COMMENT '인증 성공 여부 (Y/N)',
  REG_DT        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '발송 일시',
  KEY IX_TEL_AUTH (RECV_TEL, AUTH_TYPE_CD, VERIFY_YN, EXPIRE_DT)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='휴대폰 인증번호 발송 원장';
```

---

## 5. 프로그램 테스트 및 수정 가이드 (테스트 엔지니어/개발자용)

### 5.1 CLI 기반 통합 검증 실행

터미널에서 아래 명령을 실행하여 아이디 찾기, 인증번호 3분 만료 발송, 신규 비밀번호 변경 트랜잭션을 한 번에 테스트합니다.

```bash
# 1. TypeScript 전체 정적 타입 체크
npx tsc --noEmit

# 2. 계정 찾기 및 비밀번호 재설정 단위 검증 실행
npx tsx --env-file=.env.local -e "
import { processUserAth02 } from './SsulDak_Web/User/backend/api_USER_ATH_02/route.ts';

async function testUserAth02() {
  console.log('=== [1] 아이디(이메일) 찾기 검증 ===');
  const res1 = await processUserAth02({
    mode: 'FIND_EMAIL',
    userNm: '홍길동',
    userTel: '010-1234-5678'
  });
  console.log('성공 여부:', res1.data.success);
  console.log('마스킹 이메일:', res1.data.maskedEmail);

  console.log('\n=== [2] 인증코드 6자리 발송 검증 (3분 유효시간) ===');
  const res2 = await processUserAth02({
    mode: 'SEND_RESET_CODE',
    userEmail: 'user01@ssuldak.com',
    userTel: '010-1234-5678'
  });
  console.log('발송 성공 여부:', res2.data.success);
  const code = res2.data.devAuthCode;
  console.log('발송된 코드:', code);

  console.log('\n=== [3] 비밀번호 재설정 실행 (트랜잭션 및 세션 파기) ===');
  const res3 = await processUserAth02({
    mode: 'RESET_PASSWORD',
    userEmail: 'user01@ssuldak.com',
    userTel: '010-1234-5678',
    authCode: code,
    newPassword: 'NewPassword2026!'
  });
  console.log('비밀번호 변경 결과:', res3.data.success, res3.data.message);
  process.exit(0);
}
testUserAth02();
"
```

### 5.2 테스트 케이스별 검증 포인트

| TC 번호 | 테스트 시나리오 | 사전 조건 / 입력값 | 예상 결과 |
| :---: | :--- | :--- | :--- |
| **TC-01** | 정상 아이디 찾기 | 등록된 실명 `홍길동` + `010-1234-5678` | **HTTP 200**: 마스킹된 이메일(`use***@ssuldak.com`) 및 가입일 반환. |
| **TC-02** | 일치하지 않는 정보로 아이디 찾기 | 미등록 이름 또는 틀린 휴대폰 번호 | **HTTP 404**: "일치하는 회원 정보를 찾을 수 없습니다." |
| **TC-03** | 비밀번호 재설정 인증번호 발송 | 등록된 계정 이메일 + 휴대폰 번호 | **HTTP 200**: 6자리 난수 생성 및 3분 만료 설정으로 `TB_SMS_AUTH_LOG` 저장. |
| **TC-04** | 불일치 계정으로 인증번호 요청 | 미등록 이메일 또는 번호 불일치 | **HTTP 404**: 계정 불일치 차단. |
| **TC-05** | 영구 제재(BLOCKED) 계정 요청 | `USER_STAT_CD = 'BLOCKED'` | **HTTP 403 Forbidden**: 영구 제재 계정은 재설정 차단. |
| **TC-06** | 올바른 인증번호로 비밀번호 재설정 | 3분 이내 유효 인증코드 + 8자 이상 패스워드 | **HTTP 200**: 단방향 암호화 해시 갱신 및 기존 모든 활성 세션 일괄 만료. |
| **TC-07** | 틀린 인증번호 또는 만료 시도 | 잘못된 6자리 코드 또는 3분 경과 | **HTTP 400 Bad Request**: "인증번호가 일치하지 않거나 유효시간이 만료되었습니다." |
