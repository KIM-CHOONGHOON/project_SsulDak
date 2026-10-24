# [SsulDak (쓸고닦고)] USER-MYP-01 (회원 정보 수정) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-MYP-01` |
| **화면명** | 회원 정보 수정 (Customer Account & Profile Settings) |
| **지원 채널** | Web [Y] / App [Y] (데스크톱 1280px~1440px 12컬럼 그리드 분할: 8컬럼 폼 입력 / 4컬럼 스티키 보안 등급 및 고객지원 사이드바, 모바일 390px 반응형 뷰) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 부모 화면** | [`USER-MYP-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-MYP-00) (이용자 마이페이지 메인) |
| **호출 대상 화면** | [`USER-MYP-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-MYP-00) (마이페이지 복귀), [`USER-COM-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-COM-00) (회원탈퇴 완료 시 메인 홈) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-MYP-01/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-MYP-01/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-MYP-01/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-MYP-01/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_MYP_01/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_MYP_01/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_myp_01` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **사용 테이블** | `TB_USER`, `TB_CLEAN_REQ`, `TB_CLEAN_CONTRACT`, `TB_USER_COUPON`, `TB_USER_POINT_LEDGER`, `TB_USER_ADDR_HIST`, `TB_USER_WITHDRAW_LOG` |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

---

### 핵심 아키텍처 및 비즈니스 규정 준수
1. **물리적 격리**: 모든 소스코드는 `SsulDak_Web/User/` 폴더 하위에 프론트엔드와 백엔드가 완결 배치되어 있으며, 타 도메인과의 종속성을 철저히 배제합니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/User/frontend/USER-MYP-01/index.jsx` & `index.tsx`
   - 백엔드 라우터: `SsulDak_Web/User/backend/api_USER_MYP_01/route.ts`
   - 엔드포인트: `POST /api/user/user_myp_01`
3. **독립 전용 SQL ID 적용**: 타 화면과 쿼리를 일체 공유하지 않고 `USER-MYP-01-SQL-001`부터 `USER-MYP-01-SQL-006`까지 전용 SQL로 완결 실행합니다.
4. **보안 및 무결성 제약**:
   - **이메일 계정 불변**: 로그인 고유 식별자인 `USER_EMAIL`은 정책상 읽기 전용(Read-Only)으로 수정 불가.
   - **휴대폰 번호 변경 시 본인인증 강제**: 기존 번호와 다른 번호 입력 시 SMS 인증(`SEND_PHONE_VERIFY_CODE`, `VERIFY_PHONE_CODE`)을 통과하여 `telVerified === true`일 때만 저장 허용 (미인증 시 `400 TEL_NOT_VERIFIED` 반환).
   - **비밀번호 변경 선택 사항 및 안전 해싱**: 입력 시에만 영문, 숫자, 특수문자 조합 8자 이상 정규식 검증 후 `crypto.pbkdf2Sync`(10,000회 반복, sha512) 솔트 해싱 적용.
   - **회원 탈퇴 방어 무결성**: 진행 중인 견적 신청(`OPEN`, `PARTIAL_CONTRACTED`) 또는 미완료 시공 계약(`WAITING_PAY`, `CONFIRMED`, `IN_PROGRESS`)이 1건이라도 존재할 경우 탈퇴를 원천 차단.
   - **감사 컬럼**: 정보 수정 시 `MOD_DT(NOW())`, `MOD_ID(USER_NO)` 기록.

---

## 2. 데이터베이스 명세 및 독립 전용 SQL ID

### 2.1 독립 전용 SQL 쿼리 매핑 목록

| SQL ID | 설명 | 대상 테이블 | 작업 유형 |
| :--- | :--- | :--- | :--- |
| `USER-MYP-01-SQL-001` | 기존 회원 기본 정보 조회 | `TB_USER` | `SELECT` |
| `USER-MYP-01-SQL-002` | 비밀번호 미변경 시 기본 정보 및 마케팅 동의 갱신 | `TB_USER` | `UPDATE` |
| `USER-MYP-01-SQL-003` | 비밀번호 변경 포함 시 전체 갱신 | `TB_USER` | `UPDATE` |
| `USER-MYP-01-SQL-004` | 탈퇴 방어 검증: 진행 중 견적 및 미완료 계약 건수 조회 | `TB_CLEAN_REQ`, `TB_CLEAN_CONTRACT` | `SELECT` |
| `USER-MYP-01-SQL-005` | 회원 상태 탈퇴 전이 (`WITHDRAWN`) | `TB_USER` | `UPDATE` |
| `USER-MYP-01-SQL-006` | 회원 탈퇴 사유 및 일시 기록 | `TB_USER_WITHDRAW_LOG` | `INSERT` |

### 2.2 독립 전용 SQL 상세 쿼리문

```sql
-- [USER-MYP-01-SQL-001] 기존 회원 기본 정보 조회
SELECT 
  USER_NO AS userNo,
  USER_EMAIL AS userEmail,
  USER_NM AS userNm,
  USER_TEL AS userTel,
  MKT_AGREE_YN AS mktAgreeYn,
  SIGN_IMG_URL AS signImgUrl,
  JOIN_PATH_CD AS joinPathCd,
  REG_DT AS regDt,
  LAST_LOGIN_DT AS lastLoginDt
FROM TB_USER
WHERE USER_NO = ?;

-- [USER-MYP-01-SQL-002] 비밀번호 미변경 시 기본 정보 및 마케팅 동의 갱신
UPDATE TB_USER
SET 
  USER_NM = ?,
  USER_TEL = ?,
  MKT_AGREE_YN = ?,
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE USER_NO = ?;

-- [USER-MYP-01-SQL-003] 비밀번호 변경 포함 시 전체 갱신
UPDATE TB_USER
SET 
  USER_NM = ?,
  USER_TEL = ?,
  USER_PWD_HASH = ?,
  PWD_SALT = ?,
  PWD_CHG_DT = NOW(),
  MKT_AGREE_YN = ?,
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE USER_NO = ?;

-- [USER-MYP-01-SQL-004] 탈퇴 방어 검증: 진행 중 견적 및 미완료 계약 건수 조회
SELECT 
  (SELECT COUNT(*) FROM TB_CLEAN_REQ WHERE USER_NO = ? AND REQ_STAT_CD IN ('OPEN', 'PARTIAL_CONTRACTED')) AS activeReqCnt,
  (SELECT COUNT(*) FROM TB_CLEAN_CONTRACT WHERE USER_NO = ? AND CONTRACT_STAT_CD IN ('WAITING_PAY', 'CONFIRMED', 'IN_PROGRESS')) AS activeContractCnt;

-- [USER-MYP-01-SQL-005] 회원 상태 탈퇴 전이
UPDATE TB_USER
SET 
  USER_STAT_CD = 'WITHDRAWN',
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE USER_NO = ?;

-- [USER-MYP-01-SQL-006] 회원 탈퇴 사유 기록
INSERT INTO TB_USER_WITHDRAW_LOG (
  USER_NO, WITHDRAW_REASON, REG_DT
) VALUES (
  ?, ?, NOW()
);
```

---

## 3. 백엔드 서비스 명세 (`POST /api/user/user_myp_01`)

### 3.1 요청 규격 (Request Body)

#### 1) 기존 회원 정보 로딩 (`GET_USER_INFO`)
```json
{
  "mode": "GET_USER_INFO",
  "userNo": "U20261000001"
}
```

#### 2) 휴대폰 인증번호 발송 요청 (`SEND_PHONE_VERIFY_CODE`)
```json
{
  "mode": "SEND_PHONE_VERIFY_CODE",
  "userNo": "U20261000001",
  "userTel": "010-9876-5432"
}
```

#### 3) 휴대폰 인증번호 검증 (`VERIFY_PHONE_CODE`)
```json
{
  "mode": "VERIFY_PHONE_CODE",
  "userNo": "U20261000001",
  "userTel": "010-9876-5432",
  "verifyCode": "123456"
}
```

#### 4) 회원 정보 수정 저장 (`UPDATE_USER_INFO`)
```json
{
  "mode": "UPDATE_USER_INFO",
  "userNo": "U20261000001",
  "userNm": "김충훈",
  "userTel": "010-1234-1234",
  "telVerified": true,
  "newPassword": "NewPassword123!",
  "mktAgreeYn": "Y",
  "agreeKakao": true,
  "agreeEmail": true,
  "agreeNight": false
}
```

#### 5) 탈퇴 가능 여부 사전 점검 (`CHECK_WITHDRAWABLE`)
```json
{
  "mode": "CHECK_WITHDRAWABLE",
  "userNo": "U20261000001"
}
```

#### 6) 회원 탈퇴 실행 (`EXECUTE_WITHDRAW`)
```json
{
  "mode": "EXECUTE_WITHDRAW",
  "userNo": "U20261000001",
  "withdrawReason": "서비스 이용 빈도 낮음"
}
```

### 3.2 응답 규격 (Response Body)

#### A. 회원 정보 로딩 성공
```json
{
  "success": true,
  "userInfo": {
    "userNo": "U20261000001",
    "userEmail": "chunghoon.kim@ssuldak.com",
    "userNm": "김충훈",
    "userTel": "010-1234-1234",
    "mktAgreeYn": "Y",
    "signImgUrl": "https://ssuldak.com/signs/u20261000001.png",
    "activeReqCnt": 2,
    "activeContractCnt": 4,
    "couponCount": 2,
    "pointBalance": 14000,
    "address": {
      "roadAddr": "경기 고양시 일산동구 중앙로 1236, 102동 504호 (백석동, 흰돌마을)",
      "detailAddr": "102동 504호",
      "extraNote": "공동현관 출입: 세대호출 (#102504) · 엘리베이터: 유 (작업차량 지하주차 가능)"
    },
    "security": {
      "score": 95,
      "grade": "안전 (A+)",
      "twoFactorMethod": "SMS 일회용 OTP",
      "lastAuthDt": "2026.10.15 NICE",
      "recentLoginDevice": "Chrome / Windows"
    }
  }
}
```

#### B. 탈퇴 차단 점검 결과
```json
{
  "success": true,
  "canWithdraw": false,
  "activeReqCnt": 2,
  "activeContractCnt": 4,
  "message": "현재 진행 중인 견적 신청(2건) 또는 미완료 시공 계약(4건)이 있어 탈퇴할 수 없습니다. 모든 시공이 완료 및 정산된 후 다시 신청해 주세요."
}
```

---

## 4. 프론트엔드 UI & 인터랙션 구현 세부사항

1. **상단 글로벌 네비게이션 & 브레드크럼**:
   - `홈 > 마이페이지 (USER-MYP-00) > 회원정보 수정` 계층 경로.
   - `USER-MYP-01` 화면 뱃지 및 `계정 보안 인증 정상` 펄스 인디케이터.
   - `마이페이지로 돌아가기` 원클릭 복귀 버튼.
2. **기본 계정 정보 (Card 1)**:
   - **이메일 (아이디)**: 자물쇠 아이콘, `chunghoon.kim@ssuldak.com`, 카카오 간편가입 연동 뱃지, 수정 불가 안내.
   - **회원 성명**: 실명 인증 완료 뱃지, `김충훈`, 개명 안내 문구.
   - **휴대폰 번호**: 번호 변경 시 미인증 경고 배너 출력 및 `[번호 변경 인증]` 버튼.
   - **휴대폰 SMS 인증 모달**: 6자리 인증번호 입력, 3분 카운트다운 타이머, 성공 시 `인증 완료` 동적 뱃지 반영.
   - **비밀번호 변경 아코디언**: `[펼쳐서 변경하기]` / `[접어두기]` 토글, 현재 비밀번호, 새 비밀번호, 확인 입력 및 실시간 정규식 유효성 피드백.
3. **기본 시공 주소 및 안심 전자서명 (Card 2)**:
   - **대표 주소지**: 도로명 주소 및 공동현관 출입/엘리베이터 상세 안내. `주소 변경` 모달을 통해 변경 가능.
   - **안심 전자서명**: 등록 완료 상태 표시, `[서명 미리보기]` 토글 박스 및 `[재등록]` 시 HTML5 Canvas 서명 패드 모달 오픈.
4. **마케팅 혜택 및 알림 수신 설정 (Card 3)**:
   - **혜택 전체 동의 마스터 토글**: 토글 시 하위 3개 채널 일괄 변경.
   - **프로모션 안내 배너**: 매월 1일 정기 청소 5,000원 쿠폰 지급 및 거래 필수 정보 안내.
   - **하위 채널 토글**: 카카오 알림톡/SMS, 이메일 뉴스레터, 야간 혜택(20:00~08:00) 수신 동의.
5. **위험 구역 / 회원 탈퇴 안내 (Card 4)**:
   - 잔여 쿠폰 및 포인트 즉시 소멸 안내.
   - `[회원 탈퇴 신청 >]` 클릭 시 `CHECK_WITHDRAWABLE` 검증 실행:
     * 미완료 계약/신청 존재 시: 탈퇴 차단 경고 모달(진행 건수 및 사유 안내) 노출.
     * 진행 건 부재 시: 탈퇴 사유 선택 및 최종 확인 모달 오픈 후 세션 초기화 및 홈 화면 이동.
6. **우측 보안 등급 및 고객지원 사이드바**:
   - **계정 보안 등급**: 95점 Circular SVG 프로그레스 게이지, 안전(A+), 최근 로그인 및 NICE 본인인증 이력.
   - **개인정보 보호 약속**: SHA-512/PBKDF2 일방향 암호화, ISMS-P 인증 규격 준수.
   - **전담 고객 지원**: 1588-0000 전화 바로걸기, 카카오톡 1:1 실시간 상담 연결.
7. **하단 액션 컨트롤**:
   - `취소하고 돌아가기` (마이페이지 복귀) 및 `수정사항 저장하기` (저장 성공 토스트 노출 후 자동 복귀).

---

## 5. 실증 및 브라우저 검증 결과

- **서버 주소**: `http://localhost:3000/?v=20261023_myp01_v1#profile-edit`
- **검증 환경**: Next.js App Router 아키텍처, Express/Node.js 프리뷰 서버, Remote MySQL `ssuldak_db` 연동.
- **실행 테스트 결과**:
  1. `GET_USER_INFO` 호출 시 `김충훈`, `chunghoon.kim@ssuldak.com`, `010-1234-1234`, 대표 주소 정상 바인딩 확인.
  2. 비밀번호 아코디언 열림/닫힘 및 비밀번호 일치 실시간 검증 정상 동작 확인.
  3. 자필 서명 미리보기 토글 및 HTML5 Canvas 서명 드로잉 재등록 정상 동작 확인.
  4. 마케팅 마스터 토글 및 하위 채널 토글 상호작용 검증 완료.
  5. 회원 탈퇴 신청 시 진행 중 청소 계약 건수(2건/4건) 감지로 탈퇴 차단 모달 정상 출력 확인.
  6. 수정사항 저장하기 버튼 클릭 시 유효성 검사 및 DB 반영 처리 완료.
