# [SsulDak (쓸고닦고)] USER-ATH-00 (이용자 로그인 및 인증) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-ATH-00` |
| **화면명** | 이용자 로그인 및 인증 (User Login & Authentication) |
| **지원 채널** | Web [Y] / App [Y] |
| **도메인 역할** | `User` (이용자 전용) |
| **프론트엔드 파일** | `SsulDak_Web/User/frontend/USER-ATH-00/index.tsx`<br>`SsulDak_Web/User/frontend/USER-ATH-00/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/User/backend/api_USER_ATH_00/route.ts` |
| **API 엔드포인트** | `POST /api/user/user_ath_00` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |

### 핵심 아키텍처 준수 규칙
1. **물리적 역할 격리**: 모든 소스코드는 `SsulDak_Web/User` 하위에서 완결되며, `Admin` 또는 `Partner` 도메인과 소스코드를 교차 참조하거나 공유하지 않습니다.
2. **1:1 매핑 및 전용 SQL ID 원칙**: 타 화면과 API 및 SQL을 절대 공유하지 않으며, 오직 이 화면 전용 SQL ID(`USER-ATH-00-SQL-001 ~ 007`)로 독립 수행됩니다.
3. **회원 식별자 12바이트 고정 규격 준수**: 아래 제2절의 "회원 식별자 규격"을 엄격히 준수합니다.
4. **플랫폼 공식 브랜드 로고 사용 원칙**: 모든 WEB 및 APP 화면(GNB, 푸터, 스플래시 등)에서 임의의 폰트 아이콘 대신 반드시 공식 첨부 파일(`쓸고딱고 로고.png` / `/logo.png`)을 적용합니다.
5. **멀티 디바이스 4대 한도 및 안심 세션 정책**: PC, 노트북, 태블릿, 휴대전화 총 4대까지 안전하게 동시 관리되며, 휴대전화 로그인 유지 시 30일간 세션을 지속하고 디바이스 지문 바인딩으로 보안을 보장합니다.

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

### 2.2 채번 예시 (정확히 12바이트)
- **이용자 1호**: `U` + `202610` + `00001` = **`U20261000001`** (12자리)
- **파트너 1호**: `P` + `202610` + `00001` = **`P20261000001`** (12자리)
- **관리자 1호**: `A` + `202610` + `00001` = **`A20261000001`** (12자리)

### 2.3 프론트엔드 및 백엔드 회원 식별자 처리 규칙
1. **백엔드 (`route.ts`)**:
   - `validateUserNo(userNo)`를 통해 전체 길이 12자리 여부(`trimmed.length === 12`), 'U' 시작 여부, 정규식 `/^U(20\d{2})(0[1-9]|1[0-2])(\d{5})$/` 일치 여부를 필수 검증합니다.
   - DB에서 조회된 계정 식별자가 12자리 규격에 부합하지 않을 경우 HTTP 500 내부 규격 오류로 차단합니다.
2. **프론트엔드 (`index.tsx`)**:
   - 로그인 성공 후 전달받은 세션 객체 내 `userNo`의 12자리 유효성을 사전에 검증하여 `localStorage`에 저장 및 화면 바인딩합니다.

---

## 3. 프론트엔드 (FrontEnd) 구현 명세

### 3.1 파일 위치
- 메인 컴포넌트: [`SsulDak_Web/User/frontend/USER-ATH-00/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-ATH-00/index.tsx)
- Re-export 엔트리: [`SsulDak_Web/User/frontend/USER-ATH-00/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-ATH-00/index.jsx)

### 3.2 화면 UI/UX 구성요소

1. **상단 GNB / 헤더 (`<header>`)**:
   - **브랜드 로고**: 청록색 원형 심볼 로고(`/logo.png`) 일관 적용 (클릭 시 `USER-COM-00` 홈 이동).
   - **뒤로가기/홈 링크**: `[ Back to Home ]` 버튼 (클릭 시 `USER-COM-00` 홈 화면 라우팅).

2. **좌측 패널: Brand Heritage & Trust Pillars (약 44%)**:
   - **배경 이펙트**: 딥 로열 네이비(`bg-primary-container`) 베이스 + 민트/골드 앰비언트 글로우 블러 + 건축학적 기하학 SVG 패턴.
   - **최상단 마이크로 뱃지**: 펄스 인디케이터 + `Institutional Hygiene Standard` (기관 위생 표준 인증 표기).
   - **메인 카피**: `"공간의 가치를 더하는 스마트 청소 매칭, 쓸고닦고"`
   - **서브텍스트**: `"검증된 마스터의 정밀하고 섬세한 케어로 완성되는 티 없이 산뜻하고 품격 있는 공간 솔루션."`
   - **3대 신뢰 기둥 (Trust Pillars Trio)**:
     1. **100% 신원 및 범죄이력 심층 검증**: 엄격한 5단계 마스터 인증 필터링 통과.
     2. **불만족 시 100% 무상 재방문 보증**: 결과에 타협 없는 48시간 안심 리콜제 운영.
     3. **삼성화재 최대 1억원 영업배상책임보험**: 작업 전 과정 대물·대인 보상 완전 보장.
   - **하단 웰컴 프로모션 카드**:
     - `WELCOME BENEFIT`: `"신규 가입 즉시 15,000원 쿠폰팩"` (클릭 시 안내 토스트 표출).
   - **품질 스탬프**: `"누적 고객 만족도 99.4%"` / `"★ 4.98 / 5.0"`.

3. **우측 패널: Authentication Form (약 56%)**:
   - **상단 유틸리티**: `홈으로` 텍스트 링크 + 화면 식별자 뱃지(`USER-ATH-00`).
   - **타이틀 & 안내문**: `"로그인"` / `"청결한 일상을 관리하는 쓸고닦고 계정으로 접속해 주세요."`
   - **이메일 계정 입력 필드**:
     - 좌측 메일 아이콘(`mail`) + 플레이스홀더(`example@ssuldak.com`).
     - 실시간 정규식 유효성 검사 적용(형식 불일치 시 실시간 에러 메시지 표출).
   - **비밀번호 입력 필드**:
     - 좌측 자물쇠 아이콘(`lock`) + 우측 비밀번호 보기/숨기기 눈 모양 토글(`visibility` / `visibility_off`).
     - 우측 상단 `[ 비밀번호를 잊으셨나요? ]` 링크 (`USER-ATH-03` 연계).
   - **세션 유지 및 환경설정 체크박스**:
     - `[✓] 자동 로그인 유지`: 선택 시 기기 유형에 따라 최적화된 안심 세션 발급 (휴대전화 30일 / PC·노트북·태블릿 14일, 미선택 시 2시간).
     - `[ ] 아이디 저장`: 선택 시 `localStorage`에 이메일 저장 및 재방문 시 자동 복원.
   - **멀티 디바이스(최대 4대) 및 기기별 보안 유지 안내 배너**:
     - 현재 접속 기기 자동 판별(`PC`, `NOTEBOOK`, `TABLET`, `MOBILE`) 및 아이콘 표출.
     - 휴대전화 접속 시: `"휴대전화 로그인 유지 시 최대 30일간 로그인 상태가 유지되며, 디바이스 지문 바인딩으로 타 기기 도용이 원천 차단됩니다. (PC, 노트북, 태블릿, 휴대전화 최대 4대까지 안전하게 동시 관리)"`
     - 기타 기기 접속 시: `"로그인 유지 시 최대 14일간 안전하게 지속되며, PC·노트북·태블릿·휴대전화 최대 4대까지 동시 연결을 지원합니다."`
   - **로그인 CTA 액션 버튼**:
     - Primary Navy (`bg-primary`) 컬러 + Hover / Active 전환 애니메이션.
     - 제출 중 로딩 스피너(`progress_activity`) 애니메이션 및 다중 클릭 방지 처리.
   - **SNS 간편 로그인 구분선 & 버튼 그리드 (Google 교체 완료)**:
     - `"또는 SNS 계정으로 로그인"` 텍스트 구분선.
     - **카카오 3초 간편 로그인** (`#FEE500`, 카카오 심볼)
     - **네이버 간편 로그인** (`#03C75A`, 네이버 심볼)
     - **Google 간편 로그인** (`#FFFFFF`, 공식 4색 G 심볼, 테두리 연회색) ※ Apple에서 Google로 전면 교체 완료.
   - **미니 안심 뱃지 (Mini Assurance Badges)**:
     - `100% 신원 보증` | `친환경 약품 전용` | `A/S 책임 보증제`
   - **계정 찾기 및 회원가입 네비게이션**:
     - `[ 아이디 / 비밀번호 찾기 ]` (`USER-ATH-03`)
     - `[ 아직 회원이 아니신가요? 회원가입 ]` (`USER-ATH-01` / `USER-REG-00`)
     - 이용약관 및 개인정보처리방침 안내 링크.

4. **비즈니스 특화 모달 및 토스트 피드백**:
   - **비밀번호 5회 연속 오류 10분 잠금 모달**: 5회 연속 실패 감지 시 10분(`600초`) 카운트다운 타이머 모달 표출 및 로그인 입력 차단.
   - **7일 선 취소 패널티 회원 팝업 모달 (`USER_STAT_CD === 'SUSPENDED_7D'`)**: 패널티 만료 일시 고지 후 진행 중인 계약 조회 등 한정된 이용 허용.
   - **반응형 Interactive Toast 알림**: 성공/오류/안내 메시지 3.2초 팝업.

---

## 4. 멀티 디바이스(4대) 세션 정책 및 기기 보안 담보 메커니즘

### 4.1 기기 관리 한도 정책 (최대 4대)
1. **관리 대상 기기군 (4종)**:
   - **`PC`**: 데스크톱 PC
   - **`NOTEBOOK`**: 랩톱 / 노트북 컴퓨터
   - **`TABLET`**: 아이패드, 갤럭시 탭 등 태블릿 디바이스
   - **`MOBILE`**: 스마트폰 (iOS / Android)
2. **동시 유지 및 관리 규칙**:
   - 1개 회원 계정(`USER_NO`)당 **최대 4대(Max 4 Devices)**까지 동시 로그인 세션이 유지됩니다.
   - 웹(브라우저)과 앱(모바일/태블릿) 환경에 상관없이 `TB_USER_SESSION` 원장에서 중앙 집중식으로 동시 세션을 카운트하고 제어합니다.
3. **5번째 기기 로그인 시 처리 방식 (LRU / FIFO 자동 만료)**:
   - 회원이 이미 4개 기기에 로그인되어 있는 상태에서 5번째 기기로 신규 로그인을 시도할 경우, **가장 오랫동안 활동하지 않은(가장 오래된 `LAST_ACTIVE_DT`) 기기의 세션을 자동으로 만료(`IS_VALID_YN = 'N'`)** 처리하고 신규 기기 세션을 등록합니다 (`USER-ATH-00-SQL-006`).

### 4.2 로그인 유지 기간 정책
| 기기 유형 | 자동 로그인 미선택 | 자동 로그인 유지 체크 (`autoLoginYn = 'Y'`) |
| :--- | :---: | :---: |
| **휴대전화 (`MOBILE`)** | **2시간** | **30일 (720시간)** - 모바일 앱/웹 사용성에 최적화 |
| **태블릿 (`TABLET`)** | **2시간** | **14일 (336시간)** |
| **노트북 (`NOTEBOOK`)** | **2시간** | **14일 (336시간)** |
| **데스크톱 PC (`PC`)** | **2시간** | **14일 (336시간)** |

### 4.3 기기 보안 담보 메커니즘 (Security Safeguards)

```
[클라이언트 기기]                             [백엔드 인증 엔진]                           [TB_USER_SESSION 세션 원장]
       |                                             |                                                |
       | 1. 로그인 요청 (deviceUuid + deviceType)    |                                                |
       | ------------------------------------------> |                                                |
       |                                             | 2. 계정 검증 및 활성 세션 수 체크 (MAX 4)     |
       |                                             | ---------------------------------------------> |
       |                                             | 3. [보안 1] 4대 초과 시 가장 오래된 세션 만료  |
       |                                             | 4. [보안 2] 디바이스 지문 바인딩 JWT 토큰 발급 |
       |                                             | 5. 신규 세션 원장 기록                         |
       |                                             | <--------------------------------------------- |
       | 6. HTTP 200 (Token + Session Info)          |                                                |
       | <------------------------------------------ |                                                |
       |                                             |                                                |
       | 7. 자동 로그인 / API 요청 (Token 전송)      |                                                |
       | ------------------------------------------> | 8. [보안 3] 토큰 내 deviceUuid vs 세션 원장 비교
       |                                             |    - 불일치 시: 401 차단 (탈취 토큰 차단)      |
       |                                             |    - 일치 시: LAST_ACTIVE_DT 갱신 (정상 통과)  |
```

1. **디바이스 지문(Fingerprint) 암호화 바인딩**:
   - 클라이언트에서 브라우저/기기별 고유 식별자(`deviceUuid`)를 발급하고 백엔드에 전송합니다.
   - 발급되는 JWT Access Token의 페이로드에 `deviceUuid`와 `deviceType`을 암호화 포함시킵니다.
   - 해커가 네트워크 스니핑이나 악성코드로 **토큰을 탈취하여 다른 기기에서 재사용하려 해도**, 수신된 요청의 기기 식별자와 토큰 내 바인딩된 식별자가 일치하지 않으면 **`DEVICE_MISMATCH (401 Unauthorized)`로 즉시 차단**됩니다.
2. **단일 세션 무효화 및 원격 기기 로그아웃 지원**:
   - `TB_USER_SESSION`에 각 기기별 IP, User-Agent, 기기 모델명, 마지막 활동 일시가 정밀하게 기록되므로, 사용자가 스마트폰을 분실하거나 공용 PC에서 로그아웃하지 못한 경우 **"마이페이지 > 로그인 기기 관리"**에서 해당 기기를 원격으로 즉시 로그아웃(`IS_VALID_YN = 'N'`) 시킬 수 있습니다.
3. **비밀번호 변경 및 계정 제재 시 전 기기 세션 즉시 파기**:
   - 사용자가 비밀번호를 변경하거나 비정상 행위로 제재(`SUSPENDED_7D`, `BLOCKED`) 조치될 경우, 해당 사용자의 모든 기기 세션을 즉시 무효화하여 모든 기기에서 즉각 로그아웃되도록 강제합니다.

---

## 5. 백엔드 (BackEnd) 라우터 및 서비스 명세

### 5.1 파일 위치
- 라우터 및 인증 서비스 로직: [`SsulDak_Web/User/backend/api_USER_ATH_00/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_ATH_00/route.ts)

### 5.2 HTTP 엔드포인트 명세
- **HTTP Method**: `POST`
- **URL**: `/api/user/user_ath_00`
- **Request Header**:
  ```http
  Content-Type: application/json; charset=utf-8
  ```
- **Request Body (JSON)**:
  ```json
  {
    "authType": "EMAIL_LOGIN",        // "EMAIL_LOGIN" 또는 "AUTO_LOGIN_CHECK"
    "userEmail": "user01@ssuldak.com",
    "userPassword": "Password1234!",
    "autoLoginYn": "Y",               // "Y" 선택 시 휴대전화 30일 / 기타 14일, "N" 시 2시간
    "deviceType": "MOBILE",           // "PC", "NOTEBOOK", "TABLET", "MOBILE" (기기 4종)
    "deviceUuid": "d8b2-5f3a-9c01-7e82", // 클라이언트 고유 지문 식별자
    "deviceName": "iPhone 15 Pro"     // 사용자 친화 기기 명칭
  }
  ```

### 5.3 Response Body 구조
#### 1) 정상 로그인 성공 시 (HTTP 200)
```json
{
  "success": true,
  "message": "홍길동님, 환영합니다! 안심 케어를 시작합니다.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userNo": "U20261000001",
    "userEmail": "user01@ssuldak.com",
    "userNm": "홍길동",
    "userTel": "010-1234-5678",
    "hasSignature": true,
    "userStatCd": "NORMAL",
    "isSuspended": false,
    "suspendExpireDt": null
  },
  "session": {
    "deviceType": "MOBILE",
    "deviceNm": "iPhone 15 Pro",
    "keepLoginYn": "Y",
    "expireDuration": "30d",
    "activeDeviceCount": 1,
    "maxDeviceLimit": 4,
    "activeDevices": [
      {
        "deviceType": "MOBILE",
        "deviceNm": "iPhone 15 Pro",
        "lastActiveDt": "2026-10-22 21:05:00",
        "ipAddr": "127.0.0.1",
        "isCurrent": true
      }
    ]
  }
}
```

#### 2) 디바이스 지문 불일치 시 (HTTP 401 Unauthorized)
```json
{
  "success": false,
  "code": "DEVICE_MISMATCH",
  "message": "등록된 기기 정보와 일치하지 않는 인증 토큰입니다. 보안을 위해 다시 로그인해 주세요."
}
```

#### 3) 세션 만료 시 (HTTP 401 Unauthorized)
```json
{
  "success": false,
  "code": "SESSION_EXPIRED",
  "message": "로그인 유지 기간(30일)이 만료되었거나 다른 기기 로그인으로 만료된 세션입니다."
}
```

---

## 6. 데이터베이스 및 전용 SQL 쿼리 명세

### 6.1 화면 전용 독립 SQL 쿼리 ID (`USER-ATH-00-SQL-001 ~ 007`)

#### 1) `USER-ATH-00-SQL-001` (이메일 기준 회원 인증 정보 조회)
```sql
/* USER-ATH-00-SQL-001 */
SELECT 
  USER_NO, 
  USER_EMAIL, 
  USER_PWD_HASH, 
  PWD_SALT, 
  USER_NM, 
  USER_TEL, 
  USER_STAT_CD, 
  SUSPEND_EXPIRE_DT,
  SIGN_IMG_URL
FROM TB_USER 
WHERE USER_EMAIL = ?;
```

#### 2) `USER-ATH-00-SQL-002` (로그인 성공 시 최종 로그인 일시 갱신)
```sql
/* USER-ATH-00-SQL-002 */
UPDATE TB_USER 
SET 
  LAST_LOGIN_DT = NOW(),
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE USER_NO = ?;
```

#### 3) `USER-ATH-00-SQL-003` (7일 정지 기간 경과 시 NORMAL 상태 자동 복구)
```sql
/* USER-ATH-00-SQL-003 */
UPDATE TB_USER 
SET 
  USER_STAT_CD = 'NORMAL',
  SUSPEND_EXPIRE_DT = NULL,
  MOD_DT = NOW(),
  MOD_ID = 'SYSTEM'
WHERE USER_NO = ? AND USER_STAT_CD = 'SUSPENDED_7D' AND SUSPEND_EXPIRE_DT <= NOW();
```

#### 4) `USER-ATH-00-SQL-004` (사용자의 유효 활성 기기 세션 목록 조회)
```sql
/* USER-ATH-00-SQL-004 */
SELECT 
  SESSION_ID,
  DEVICE_TYPE,
  DEVICE_UUID,
  DEVICE_NM,
  IP_ADDR,
  KEEP_LOGIN_YN,
  EXPIRE_DT,
  LAST_ACTIVE_DT
FROM TB_USER_SESSION
WHERE USER_NO = ? 
  AND IS_VALID_YN = 'Y' 
  AND EXPIRE_DT > NOW()
ORDER BY LAST_ACTIVE_DT DESC;
```

#### 5) `USER-ATH-00-SQL-005` (기기 세션 신규 등록 및 갱신)
```sql
/* USER-ATH-00-SQL-005 */
INSERT INTO TB_USER_SESSION (
  SESSION_ID, USER_NO, DEVICE_TYPE, DEVICE_UUID, DEVICE_NM, 
  IP_ADDR, USER_AGENT, KEEP_LOGIN_YN, EXPIRE_DT, LAST_ACTIVE_DT, 
  IS_VALID_YN, REG_DT, MOD_DT
)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'Y', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  DEVICE_NM = VALUES(DEVICE_NM),
  IP_ADDR = VALUES(IP_ADDR),
  USER_AGENT = VALUES(USER_AGENT),
  KEEP_LOGIN_YN = VALUES(KEEP_LOGIN_YN),
  EXPIRE_DT = VALUES(EXPIRE_DT),
  LAST_ACTIVE_DT = NOW(),
  IS_VALID_YN = 'Y',
  MOD_DT = NOW();
```

#### 6) `USER-ATH-00-SQL-006` (최대 4대 초과 시 가장 오래된 세션 자동 만료)
```sql
/* USER-ATH-00-SQL-006 */
UPDATE TB_USER_SESSION
SET 
  IS_VALID_YN = 'N',
  MOD_DT = NOW()
WHERE USER_NO = ? 
  AND IS_VALID_YN = 'Y' 
  AND SESSION_ID NOT IN (
    SELECT S.SESSION_ID FROM (
      SELECT SESSION_ID FROM TB_USER_SESSION 
      WHERE USER_NO = ? AND IS_VALID_YN = 'Y'
      ORDER BY LAST_ACTIVE_DT DESC 
      LIMIT 4
    ) AS S
  );
```

#### 7) `USER-ATH-00-SQL-007` (세션 유효성 및 디바이스 UUID 일치 검증)
```sql
/* USER-ATH-00-SQL-007 */
SELECT 
  SESSION_ID,
  USER_NO,
  DEVICE_TYPE,
  DEVICE_UUID,
  KEEP_LOGIN_YN,
  EXPIRE_DT,
  IS_VALID_YN
FROM TB_USER_SESSION
WHERE USER_NO = ? 
  AND DEVICE_UUID = ? 
  AND IS_VALID_YN = 'Y'
  AND EXPIRE_DT > NOW();
```

### 6.2 데이터베이스 테이블 DDL 및 정의

#### 1) `TB_USER` (이용자 마스터)
```sql
CREATE TABLE IF NOT EXISTS TB_USER (
  USER_NO            CHAR(12)      NOT NULL COMMENT '이용자 식별자 (U + YYYYMM + 5자리 순번)',
  USER_EMAIL         VARCHAR(100)  NOT NULL COMMENT '이용자 로그인 이메일',
  USER_PWD_HASH      VARCHAR(255)  NOT NULL COMMENT '단방향 해시 비밀번호',
  PWD_SALT           VARCHAR(64)   NOT NULL COMMENT '비밀번호 암호화 솔트',
  USER_NM            VARCHAR(50)   NOT NULL COMMENT '이용자 실명',
  USER_TEL           VARCHAR(20)   NULL     COMMENT '연락처 (휴대폰 번호)',
  SIGN_IMG_URL       VARCHAR(500)  NULL     COMMENT '자필 전자서명 이미지 경로',
  USER_STAT_CD       VARCHAR(20)   NOT NULL DEFAULT 'NORMAL' COMMENT '상태 (NORMAL, SUSPENDED_7D, BLOCKED, WITHDRAWN)',
  SUSPEND_EXPIRE_DT  DATETIME      NULL     COMMENT '선 취소 패널티 7일 정지 만료 일시',
  LAST_LOGIN_DT      DATETIME      NULL     COMMENT '최종 로그인 일시',
  MKT_AGREE_YN       CHAR(1)       NOT NULL DEFAULT 'N' COMMENT '마케팅 정보 수신 동의 여부',
  REG_DT             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  REG_ID             VARCHAR(50)   NOT NULL DEFAULT 'SYSTEM',
  MOD_DT             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  MOD_ID             VARCHAR(50)   NOT NULL DEFAULT 'SYSTEM',
  PRIMARY KEY (USER_NO),
  UNIQUE KEY UK_USER_EMAIL (USER_EMAIL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='이용자 회원 마스터';
```

#### 2) `TB_USER_SESSION` (기기 세션 원장 - 최대 4대 관리 및 보안)
```sql
CREATE TABLE IF NOT EXISTS TB_USER_SESSION (
  SESSION_ID         VARCHAR(64)   NOT NULL COMMENT '세션 고유 ID (UUID or Hash)',
  USER_NO            CHAR(12)      NOT NULL COMMENT '회원 식별자 (CHAR(12))',
  DEVICE_TYPE        VARCHAR(20)   NOT NULL COMMENT '기기 유형 (PC, NOTEBOOK, TABLET, MOBILE)',
  DEVICE_UUID        VARCHAR(100)  NOT NULL COMMENT '클라이언트 디바이스 지문 UUID',
  DEVICE_NM          VARCHAR(100)  NULL     COMMENT '사용자 기기 명칭 (예: iPhone 15 Pro, 맥북 에어)',
  IP_ADDR            VARCHAR(45)   NULL     COMMENT '접속 IP 주소 (IPv4/IPv6)',
  USER_AGENT         VARCHAR(500)  NULL     COMMENT '브라우저 및 클라이언트 User-Agent',
  KEEP_LOGIN_YN      CHAR(1)       NOT NULL DEFAULT 'N' COMMENT '로그인 유지 선택 여부 (Y/N)',
  EXPIRE_DT          DATETIME      NOT NULL COMMENT '세션 만료 일시 (휴대전화 유지 시 30일)',
  LAST_ACTIVE_DT     DATETIME      NOT NULL COMMENT '마지막 활동 일시',
  IS_VALID_YN        CHAR(1)       NOT NULL DEFAULT 'Y' COMMENT '세션 유효 여부 (Y: 유효, N: 만료/원격 로그아웃)',
  REG_DT             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  MOD_DT             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (SESSION_ID),
  KEY IX_USER_SESSION_LOOKUP (USER_NO, IS_VALID_YN, LAST_ACTIVE_DT),
  KEY IX_DEVICE_UUID (USER_NO, DEVICE_UUID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='이용자 로그인 기기 및 세션 관리 원장';
```

---

## 7. 프로그램 테스트 및 수정 가이드 (테스트 엔지니어/개발자용)

### 7.1 CLI 기반 로그인 인증 및 세션 검증 실행

터미널에서 아래 명령을 실행하여 4대 기기 세션 관리 및 휴대전화 30일 로그인 유지 로직을 즉시 검증합니다.

```bash
# 1. TypeScript 전체 정적 타입 체크
npx tsc --noEmit

# 2. 로그인 인증 및 기기 세션 비즈니스 엔진 단위 테스트 실행
npx tsx --env-file=.env.local -e "
import { processUserAth00 } from './SsulDak_Web/User/backend/api_USER_ATH_00/route.ts';

async function testAuth() {
  console.log('=== [1] 휴대전화(MOBILE) 30일 로그인 유지 검증 ===');
  const res1 = await processUserAth00({
    authType: 'EMAIL_LOGIN',
    userEmail: 'user01@ssuldak.com',
    userPassword: 'Password1234!',
    autoLoginYn: 'Y',
    deviceType: 'MOBILE',
    deviceUuid: 'mobile-test-uuid-001',
    deviceName: 'iPhone 15 Pro'
  });
  console.log('성공 여부:', res1.data.success);
  console.log('유지 기간:', res1.data.session?.expireDuration); // 30d
  console.log('활성 기기 수:', res1.data.session?.activeDeviceCount);

  console.log('\n=== [2] 토큰 디바이스 지문 바인딩 검증 (AUTO_LOGIN_CHECK) ===');
  const res2 = await processUserAth00({
    authType: 'AUTO_LOGIN_CHECK',
    token: res1.data.token,
    deviceUuid: 'mobile-test-uuid-001'
  });
  console.log('정상 기기 검증 결과:', res2.data.success);

  console.log('\n=== [3] 타 기기에서 토큰 탈취 시도 시 차단 검증 ===');
  const res3 = await processUserAth00({
    authType: 'AUTO_LOGIN_CHECK',
    token: res1.data.token,
    deviceUuid: 'stolen-hacker-device-uuid'
  });
  console.log('탈취 기기 차단 상태코드 (401 예상):', res3.status, '에러코드:', res3.data.code);
}
testAuth();
"
```

### 7.2 테스트 케이스별 검증 포인트

| TC 번호 | 테스트 시나리오 | 사전 조건 / 입력값 | 예상 결과 |
| :---: | :--- | :--- | :--- |
| **TC-01** | 정상 로그인 및 세션 발급 | `user01@ssuldak.com` / `Password1234!` | HTTP 200, JWT Access Token 발급, 홍길동 회원정보 반환, 메인 홈 이동. |
| **TC-02** | 휴대전화 자동 로그인 유지 선택 | `deviceType: 'MOBILE'`, `autoLoginYn: 'Y'` | **30일(`30d`) 유효기간** 세션 발급, `TB_USER_SESSION`에 기록. |
| **TC-03** | PC/노트북 로그인 유지 선택 | `deviceType: 'PC'`, `autoLoginYn: 'Y'` | **14일(`14d`) 유효기간** 세션 발급. |
| **TC-04** | 기기 4대 동시 연결 테스트 | PC, 노트북, 태블릿, 휴대전화 순차 로그인 | 4대 기기 모두 정상 활성 유지 (`activeDeviceCount = 4`). |
| **TC-05** | 5번째 기기 초과 로그인 테스트 | 4대 연결 상태에서 5번째 기기 로그인 | `USER-ATH-00-SQL-006` 작동하여 **가장 오래 미활동한 기기 세션 자동 만료**, 신규 기기 포함 총 4대 유지. |
| **TC-06** | 토큰 탈취 시도 방어 테스트 | 발급된 토큰을 다른 `deviceUuid`로 전송 | **HTTP 401 (`DEVICE_MISMATCH`)**: 기기 지문 불일치로 즉시 차단. |
| **TC-07** | SNS 간편 로그인 UI 확인 | 카카오 3초 / 네이버 / Google 확인 | Apple 버튼 없이 **Google 버튼(공식 컬러 SVG)** 정상 표출. |
| **TC-08** | 비밀번호 5회 연속 오류 | 틀린 비밀번호 5회 연속 제출 | **10분 잠금 모달 표출**: 카운트다운 타이머 동작 및 입력 필드 일시 잠금. |
| **TC-09** | 7일 선 취소 제재 계정 로그인 | `USER_STAT_CD = 'SUSPENDED_7D'` (만료일 미래) | 로그인 성공하되 **제재 경고 팝업** 표출: "선 취소 패널티로 신규 견적 제한 고지". |
| **TC-10** | 7일 제재 기간 경과 계정 로그인 | `USER_STAT_CD = 'SUSPENDED_7D'` (만료일 경과) | `USER-ATH-00-SQL-003` 실행되어 'NORMAL' 자동 복구 후 정상 로그인. |

---

## 8. DB 테스트 데이터 초기화 및 변경 SQL (MySQL)

```sql
-- 1. 12자리 정상 이용자 회원(U20261000001) 테스트 계정 세팅
INSERT INTO TB_USER (
  USER_NO, USER_EMAIL, USER_PWD_HASH, PWD_SALT, USER_NM, USER_TEL, 
  SIGN_IMG_URL, USER_STAT_CD, MKT_AGREE_YN, REG_DT, REG_ID, MOD_DT, MOD_ID
)
VALUES (
  'U20261000001', 'user01@ssuldak.com', 'test_hash', 'test_salt', '홍길동', '010-1234-5678', 
  'https://ssuldak.com/signs/u20261000001.png', 'NORMAL', 'Y', NOW(), 'SYSTEM', NOW(), 'SYSTEM'
)
ON DUPLICATE KEY UPDATE 
  USER_STAT_CD = 'NORMAL', 
  SUSPEND_EXPIRE_DT = NULL;

-- 2. 세션 원장 테스트 데이터 초기화 (4대 기기 등록 시뮬레이션)
INSERT INTO TB_USER_SESSION (
  SESSION_ID, USER_NO, DEVICE_TYPE, DEVICE_UUID, DEVICE_NM, 
  IP_ADDR, USER_AGENT, KEEP_LOGIN_YN, EXPIRE_DT, LAST_ACTIVE_DT, IS_VALID_YN
)
VALUES 
('sess_pc_01', 'U20261000001', 'PC', 'uuid-pc-001', '데스크톱 PC (사무실)', '127.0.0.1', 'Mozilla/5.0...', 'Y', DATE_ADD(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 3 DAY), 'Y'),
('sess_nb_01', 'U20261000001', 'NOTEBOOK', 'uuid-nb-001', '맥북 프로 16', '127.0.0.1', 'Mozilla/5.0...', 'Y', DATE_ADD(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 2 DAY), 'Y'),
('sess_tb_01', 'U20261000001', 'TABLET', 'uuid-tb-001', '아이패드 프로 12.9', '127.0.0.1', 'Mozilla/5.0...', 'Y', DATE_ADD(NOW(), INTERVAL 14 DAY), DATE_SUB(NOW(), INTERVAL 1 DAY), 'Y'),
('sess_mb_01', 'U20261000001', 'MOBILE', 'uuid-mb-001', 'iPhone 15 Pro', '127.0.0.1', 'Mozilla/5.0...', 'Y', DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), 'Y')
ON DUPLICATE KEY UPDATE IS_VALID_YN = 'Y';
```
