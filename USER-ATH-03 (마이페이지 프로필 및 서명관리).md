# [SsulDak (쓸고닦고)] USER-ATH-03 (마이페이지 프로필 및 서명관리) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-ATH-03` |
| **화면명** | 마이페이지 프로필/서명 관리 (User MyPage Profile & Digital Signature Management) |
| **지원 채널** | Web [Y] / App [Y] |
| **도메인 역할** | `User` (이용자 전용) |
| **프론트엔드 파일** | `SsulDak_Web/User/frontend/USER-ATH-03/index.tsx`<br>`SsulDak_Web/User/frontend/USER-ATH-03/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/User/backend/api_USER_ATH_03/route.ts` |
| **API 엔드포인트** | `POST /api/user/user_ath_03` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |

### 핵심 아키텍처 준수 규칙
1. **물리적 역할 격리**: 모든 소스코드는 `SsulDak_Web/User` 하위에서 완결되며, `Admin` 또는 `Partner` 도메인과 소스코드를 교차 참조하거나 공유하지 않습니다.
2. **1:1 매핑 및 전용 SQL ID 원칙**: 타 화면과 API 및 SQL을 절대 공유하지 않으며, 오직 이 화면 전용 SQL ID(`USER-ATH-03-SQL-001 ~ 007`)로 독립 수행됩니다.
3. **회원 식별자 12바이트 고정 규격 준수**: 이용자 ID는 `U` + `YYYYMM` + `5자리 순번` (예: `U20261000001`) 형식을 필수 준수합니다.
4. **감사 추적 컬럼 필수 갱신**: 데이터 수정 시 `MOD_DT = NOW()`, `MOD_ID = {USER_NO}`를 항상 바인딩하여 무결성을 보장합니다.
5. **플랫폼 공식 브랜드 로고 사용 원칙**: 모든 WEB 및 APP 화면(GNB, 푸터, 모달 등)에서 임의의 폰트 아이콘 대신 반드시 공식 첨부 파일(`쓸고딱고 로고.png` / `/logo.png`)을 적용합니다.
6. **탈퇴 방어 무결성 정책**: 진행 중인 청소 요청서(`TB_CLEAN_REQ`) 또는 미완료 시공 계약(`TB_CLEAN_CONTRACT`)이 존재하는 경우 회원 탈퇴를 엄격히 차단합니다.

---

## 2. 회원 식별자(Member ID) 규격 (12바이트 고정: `CHAR(12)`)

$$\mathbf{회원\ 식별자(12바이트)} = \mathbf{[역할\ 코드('U')]} + \mathbf{[가입\ 년월(6바이트)]} + \mathbf{[일련번호(5바이트)]}$$

- **규격**: `U` + `YYYYMM` + `00001~99999` (예: `U20261000001`)
- **유효성 검사**: 길이 12자리(`length === 12`), 접두사 `U`, 정규식 `/^U(20\d{2})(0[1-9]|1[0-2])(\d{5})$/` 일치 여부를 백엔드와 프론트엔드에서 모두 검증합니다.

---

## 3. 프론트엔드 (FrontEnd) 구현 명세

### 3.1 컴포넌트 위치
- 메인 컴포넌트: [`SsulDak_Web/User/frontend/USER-ATH-03/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-ATH-03/index.tsx)
- Re-export 엔트리: [`SsulDak_Web/User/frontend/USER-ATH-03/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-ATH-03/index.jsx)

### 3.2 화면 UI/UX 구성요소

1. **상단 GNB 헤더 (`<header>`)**:
   - **공식 원형 로고**: `/logo.png` (청록색 원형 심볼 로고) 적용.
   - **타이틀 및 브랜드명**: "쓸고닦고" / "SsulDak Care".
   - **홈으로 가기 버튼**: 클릭 시 `USER-COM-00` 홈 허브로 이동.
   - **보안 세션 뱃지**: "마이페이지 보안 세션 보호 중" 녹색 펄스 뱃지.

2. **마이페이지 상단 헤더 & 상태 뱃지**:
   - **타이틀**: `"내 정보 및 전자서명 관리"`
   - **회원번호 표시 및 원클릭 복사**: `"회원번호: U20261000001"` 우측 복사 버튼 클릭 시 클립보드 복사 및 성공 토스트 피드백.
   - **회원 상태 뱃지**:
     - `NORMAL`: `"정상 이용 회원"` (Green 뱃지 및 인증 마크)
     - `SUSPENDED_7D`: `"※ 선 취소 패널티로 {만료일}까지 견적 등록 제한 중"` (Orange 경고 뱃지)
     - `WITHDRAWN`: `"탈퇴 처리된 회원"`

3. **기본 회원 정보 수정 카드**:
   - **가입 이메일 아이디**: 읽기 전용 (`disabled`, 자물쇠 아이콘, 가입 계정 변경 불가 안내).
   - **이용자 실명**: `<input type="text" />` 실시간 입력 및 필수값 검증.
   - **휴대폰 번호**: `<input type="tel" />` 실시간 입력 및 필수값 검증.
   - **마케팅 수신 동의 토글 스위치**: 혜택/이벤트 알림(SMS/푸시) 동의 여부 온/오프 토글.
   - **[ 기본 정보 저장 ] CTA 버튼**: 로딩 스피너 및 저장 완료 피드백.

4. **자필 전자서명 관리 카드 (전자서명법 제3조 준수)**:
   - **기존 등록 서명 미리보기 패드**: DB에 저장된 서명 이미지(`SIGN_IMG_URL` 또는 Base64) 렌더링.
   - **[ 자필 서명 재등록 / 변경 ] 버튼**: 클릭 시 고화질 Canvas 서명 모달 팝업 호출.
   - **HTML5 Canvas 디지털 서명 모달**:
     - `380px * 180px` 터치/마우스 부드러운 벡터 드로잉 지원 (`lineWidth: 2.5`, `lineCap: 'round'`).
     - **[ 지우기 ] 버튼**: 캔버스 초기화.
     - **[ 새 서명 적용 ] 버튼**: Base64 변환 후 프로필 즉시 반영 및 DB 자동 갱신.

5. **비밀번호 변경 카드**:
   - **현재 비밀번호**: 입력 필드 및 눈 모양 가시성 토글.
   - **새 비밀번호 & 확인**: 입력 필드 및 눈 모양 가시성 토글.
   - **3대 보안 규칙 칩**: 8자리 이상, 영문/숫자 조합, 특수문자 포함 실시간 활성화/비활성화.
   - **보안 강도 뱃지**: 안전/최상(Strong), 보통(Medium), 취약(Weak).
   - **실시간 일치 검증 피드백**: 일치 시 녹색 '비밀번호가 일치합니다', 불일치 시 적색 피드백.
   - **[ 비밀번호 변경 적용 ] 버튼**: 변경 완료 시 타 기기 자동 로그아웃 보호 안내.

6. **하단 위험 구역 (Danger Zone - 회원 탈퇴 신청)**:
   - **탈퇴 유의사항 안내**: 포인트/쿠폰 즉시 소멸 및 동일 이메일 당일 재가입 제한 정책 고지.
   - **[ 회원 탈퇴 신청하기 ] 버튼**: 클릭 시 탈퇴 확인 모달 팝업 오픈.
   - **탈퇴 확인 모달**:
     - 탈퇴 사유 선택 드롭다운 (서비스 품질 불만족, 이사/청소 완료로 불필요, 타 플랫폼 전환, 기타 직접입력).
     - **진행 중 계약/견적 방어 에러 안내**: 미완료 건이 존재할 경우 모달 상단에 적색 경고 박스로 탈퇴 차단 사유를 명확히 고지.
     - **[ 탈퇴 확정 ] 버튼**: 트랜잭션 성공 시 세션 파기 후 홈 화면 이동.

---

## 4. 백엔드 라우터 및 데이터베이스 명세

### 4.1 백엔드 모듈 정보
- 모듈 경로: [`SsulDak_Web/User/backend/api_USER_ATH_03/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_ATH_03/route.ts)
- 엔드포인트: `POST /api/user/user_ath_03`
- 처리 모드: `GET_PROFILE`, `UPDATE_PROFILE`, `CHANGE_PASSWORD`, `WITHDRAW`

### 4.2 전용 독립 SQL ID 및 쿼리문

#### 1) USER-ATH-03-SQL-001 (회원 상세 프로필 및 서명 조회)
```sql
SELECT 
  USER_NO, USER_EMAIL, USER_NM, USER_TEL, SIGN_IMG_URL,
  USER_STAT_CD, SUSPEND_EXPIRE_DT, CANCEL_ACCUM_CNT, MKT_AGREE_YN, REG_DT
FROM TB_USER
WHERE USER_NO = ?;
```

#### 2) USER-ATH-03-SQL-002 (프로필 기본 정보 및 서명 갱신)
```sql
UPDATE TB_USER
SET 
  USER_NM = ?,
  USER_TEL = ?,
  SIGN_IMG_URL = COALESCE(?, SIGN_IMG_URL),
  MKT_AGREE_YN = ?,
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE USER_NO = ?;
```

#### 3) USER-ATH-03-SQL-003 (비밀번호 변경을 위한 기존 패스워드 해시 및 솔트 조회)
```sql
SELECT USER_PWD_HASH, PWD_SALT
FROM TB_USER
WHERE USER_NO = ?;
```

#### 4) USER-ATH-03-SQL-004 (신규 비밀번호 해시 갱신)
```sql
UPDATE TB_USER
SET 
  USER_PWD_HASH = ?,
  PWD_SALT = ?,
  PWD_CHG_DT = NOW(),
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE USER_NO = ?;
```

#### 5) USER-ATH-03-SQL-005 (탈퇴 불가 사유 검증: 진행 중 견적 및 미완료 계약 건수 조회)
```sql
SELECT 
  (SELECT COUNT(*) FROM TB_CLEAN_REQ WHERE USER_NO = ? AND REQ_STAT_CD IN ('OPEN', 'PARTIAL_CONTRACTED')) AS ACTIVE_REQ_CNT,
  (SELECT COUNT(*) FROM TB_CLEAN_CONTRACT WHERE USER_NO = ? AND CONTRACT_STAT_CD IN ('WAITING_PAY', 'CONFIRMED', 'IN_PROGRESS')) AS ACTIVE_CONTRACT_CNT;
```

#### 6) USER-ATH-03-SQL-006 (회원 탈퇴 상태 갱신)
```sql
UPDATE TB_USER
SET 
  USER_STAT_CD = 'WITHDRAWN',
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE USER_NO = ?;
```

#### 7) USER-ATH-03-SQL-007 (회원 탈퇴 사유 이력 저장)
```sql
INSERT INTO TB_USER_WITHDRAW_LOG (
  USER_NO, WITHDRAW_REASON, REG_DT
) VALUES (
  ?, ?, NOW()
);
```

### 4.3 비즈니스 처리 및 무결성 방어 로직
1. **프로필 조회 (`GET_PROFILE`)**:
   - `userNo`의 12자리 유효성 사전 검사 후 `USER-ATH-03-SQL-001` 실행.
2. **프로필 수정 (`UPDATE_PROFILE`)**:
   - `userNm`, `userTel` 필수 검증.
   - `signImgBase64` 전달 시에만 서명 교체 반영 (`COALESCE(?, SIGN_IMG_URL)`).
   - 감사 컬럼 `MOD_DT = NOW()`, `MOD_ID = userNo` 갱신.
3. **비밀번호 변경 (`CHANGE_PASSWORD`)**:
   - `USER-ATH-03-SQL-003` 조회 후 기존 비밀번호 일치 검증 (불일치 시 400 에러).
   - 영문, 숫자, 특수문자 조합 8자리 이상 복잡도 검증.
   - 신규 솔트 및 bcrypt 해시 생성 후 `USER-ATH-03-SQL-004` 실행.
   - 연결된 타 기기 활성 세션 일괄 만료 처리 (`TB_USER_SESSION` 무효화).
4. **회원 탈퇴 방어 (`WITHDRAW`)**:
   - `USER-ATH-03-SQL-005` 실행.
   - `ACTIVE_REQ_CNT > 0` 또는 `ACTIVE_CONTRACT_CNT > 0`인 경우:
     - **HTTP 400 Bad Request 차단 반환**:
       `"진행 중인 청소 요청서 또는 완료되지 않은 시공 계약이 있어 탈퇴할 수 없습니다. 요청 취소 또는 시공 완료 후 진행해 주세요."`
   - 통과 시 트랜잭션(`executeTransaction`):
     - `USER-ATH-03-SQL-006`: `USER_STAT_CD` = `'WITHDRAWN'`
     - `USER-ATH-03-SQL-007`: 탈퇴 사유 이력 원장 INSERT
     - 모든 로그인 세션 만료 처리.

---

## 5. 빌드 및 테스트 검증 결과

### 5.1 컴포넌트 빌드 및 번들링
- 번들러: `esbuild` (`preview/main.tsx` ➔ `preview/bundle.js`)
- 빌드 결과: **정상 빌드 완료 (Done in 56ms, 무에러 통과)**

### 5.2 백엔드 API 테스트 (`curl`)
1. **`GET_PROFILE` 테스트**:
   - 요청: `POST /api/user/user_ath_03` (`userNo: "U20261000001"`)
   - 응답: `HTTP 200 OK`, 회원 프로필, 서명 이미지 경로, 상태 정상 반환 확인.
2. **`UPDATE_PROFILE` 테스트**:
   - 실명 및 연락처 수정 정상 반영 및 감사 컬럼 갱신 확인.

### 5.3 브라우저 E2E 인터랙션 검증 (Browser Subagent)
1. **`USER-ATH-02` 비밀번호 재설정 화면 (제공 HTML 반영)**:
   - SsulDak Safe Guard 24시간 안심 케어 보안 카드 (금융권 256-bit AES) 렌더링 확인.
   - Step 1 가입 계정 및 휴대폰 본인인증 완료 카드 정상 표시.
   - Step 2 새로운 비밀번호 설정 폼 (3대 규칙 칩, 강도 뱃지, 실시간 일치 피드백, 자동 로그아웃 안내, 완료 모달) 정상 동작 확인.
2. **`USER-ATH-03` 마이페이지 화면**:
   - 회원 식별자(`U20261000001`) 복사 및 정상 이용 뱃지 확인.
   - 자필 전자서명 캔버스 모달 오픈, 서명 드로잉 및 적용 즉시 서명 패드 반영 확인.
   - 비밀번호 변경 카드 및 회원 탈퇴 확인 모달 정상 호출 확인.
