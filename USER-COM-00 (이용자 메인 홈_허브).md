# [SsulDak (쓸고닦고)] USER-COM-00 (이용자 메인 홈/허브) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-COM-00` |
| **화면명** | 이용자 메인 홈 / 허브 (Main Home & Hub) |
| **지원 채널** | Web [Y] / App [Y] |
| **도메인 역할** | `User` (이용자 전용) |
| **프론트엔드 파일** | `SsulDak_Web/User/frontend/USER-COM-00/index.tsx`<br>`SsulDak_Web/User/frontend/USER-COM-00/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/User/backend/api_USER_COM_00/route.ts` |
| **API 엔드포인트** | `POST /api/user/user_com_00` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |

### 핵심 아키텍처 준수 규칙
1. **물리적 역할 격리**: 모든 소스코드는 `SsulDak_Web/User` 하위에서 완결되며, `Admin` 또는 `Partner` 도메인과 소스코드를 교차 참조하거나 공유하지 않습니다.
2. **1:1 매핑 및 공통화 배제**: 타 화면과 API 및 SQL을 공유하지 않으며, 오직 이 화면 전용 SQL ID(`USER-COM-00-SQL-001 ~ 003`)로 독립 수행됩니다.
3. **회원 식별자 12바이트 고정 규격 준수**: 아래 제2절의 "회원 식별자 규격"을 엄격히 준수합니다.
4. **플랫폼 공식 브랜드 로고 사용 원칙**: 모든 WEB 및 APP 화면(GNB, 푸터, 스플래시 등)에서 임의의 폰트 아이콘 대신 반드시 공식 첨부 파일(`쓸고딱고 로고.png` / `/logo.png`)을 적용합니다.

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
   - 규격 미충족 시 **HTTP 400 Bad Request** 오류 반환:
     `"회원 식별자는 반드시 12자리 고정 규격('U' + 가입년월 YYYYMM 6자리 + 순번 5자리(00001~), 예: U20261000001)이어야 합니다."`
2. **프론트엔드 (`index.tsx`)**:
   - API 호출 전 `validateUserNo`로 사전 검증하여 비정상 식별자 전송을 차단합니다.
   - 상단 프로필 및 상태 시뮬레이터에서 12자리 식별자(`U20261000001`)를 명확히 바인딩합니다.
   - 파트너 목데이터(`VERIFIED_MASTERS`) 또한 `P20261000001`, `P20261000002`, `P20261000003`의 12바이트 규격을 적용합니다.

---

## 3. 프론트엔드 (FrontEnd) 구현 명세

### 3.1 파일 위치
- 메인 컴포넌트: [`SsulDak_Web/User/frontend/USER-COM-00/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-COM-00/index.tsx)
- Re-export 엔트리: [`SsulDak_Web/User/frontend/USER-COM-00/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-COM-00/index.jsx)

### 3.2 화면 UI/UX 구성요소
1. **상단 GNB / 헤더 (`<header>`)**:
   - **로고**: "쓸고닦고 (SsulDak Care)" 브랜드 로고 (클릭 시 `USER-COM-00` 홈 이동).
   - **지역 선택 칩**: 기본 "경기 고양시 일산동구" 표출. 클릭 시 서비스 가능 지역 드롭다운 모달 표시 (일산서구, 덕양구, 파주 운정, 김포 등 변경 가능).
   - **데스크톱 네비게이션**: 홈, 견적현황(`USER-QOT-00`), 이용내역(`USER-HIS-00`), 쿠폰북(`USER-MYP-02`), 마이(`USER-MYP-00`).
   - **우측 퀵 액션 & 인증 세션 제어**:
     - **로그인 상태**: 12자리 회원번호(`U20261000001`) 프로필 뱃지, 쿠폰함 아이콘, 알림 아이콘, 마이페이지(`USER-MYP-00`) 이동 버튼, 로그아웃 버튼.
     - **로그아웃 처리 로직**: 로그아웃 클릭 시 `currentUserNo = null`, `userInfo = null`, 로컬스토리지 토큰 및 회원정보(`ssuldak_token`, `ssuldak_user`) 즉시 파기 및 `onLogout` 콜백을 호출하여 안전하게 게스트 모드로 전환.
     - **게스트 상태 및 로그인 버튼 (`#gnbLoginBtn`)**: 로그아웃 후 우측에 `[ 로그인 ]` 및 `[ 회원가입 ]` 버튼 노출. [ 로그인 ] 버튼 클릭 시 `onNavigate('USER-ATH-00')` 호출 및 브라우저 URL 해시 `#login`을 동기화하여 `USER-ATH-00` 로그인 화면으로 즉각 화면 전환.

2. **12자리 회원 식별자 상태 시뮬레이터 바 (테스트 및 개발용)**:
   - 화면 상단에서 `게스트 모드` ↔ `정상 12자리 회원(U20261000001)` ↔ `오류 식별자 테스트(11자리/비정상 규격 입력 시 400 에러 검증)` ↔ `7일 제재 회원 모드`를 원클릭으로 전환하여 모든 화면 상태를 즉시 테스트 가능.

3. **회원 상태 경고 배너 (`USER_STAT_CD === 'SUSPENDED_7D'`)**:
   - 일방 취소로 인한 제재 회원의 경우 최상단에 Alert Coral Red 색상(`#ffdad6` / `#ba1a1a`) 경고 배너 자동 노출:
     `"※ 일방 취소로 인해 {SUSPEND_EXPIRE_DT}까지 견적 등록이 제한된 계정입니다."`

4. **마이 퀵 서머리 카드 (로그인 회원 전용)**:
   - 보유 포인트: `{POINT_BALANCE} P` (클릭 시 `USER-MYP-00`)
   - 사용 가능 쿠폰: `{COUPON_COUNT} 장` (클릭 시 `USER-MYP-02`)
   - 진행 중 견적: `{OPEN_REQ_CNT} 건` (클릭 시 `USER-QOT-00` 견적 목록 화면 라우팅)
   - 진행 중 계약: `{ACTIVE_CONTRACT_CNT} 건` (클릭 시 `USER-HIS-00` 계약 내역 화면 라우팅)

5. **Top Hero & 프로모션 배너 (Mint/Teal to Navy Glassmorphism)**:
   - 메인 카피: `"가입 즉시 5,000원 웰컴 할인 쿠폰팩 지급!"`
   - [지금 쿠폰받기] 버튼 클릭 시 토스트 팝업 표출 및 쿠폰 보유 수 즉시 증가 반영.

6. **실시간 매칭 티커 (Live Matching Ticker)**:
   - 3.5초 간격으로 실시간 견적 및 매칭 성공 건(입주청소, 정기청소, 가전케어) 롤링 애니메이션 제공.

7. **3대 핵심 청소 서비스 바로가기 카드 (3 Core Cleaning Categories)**:
   - **[카드 1: 계단/정기청소]**
     - 카피: "원룸/상가/빌라 정기청소 (최소 3개월 보장)"
     - 단가: "월 관리비용 최저 월 79,000원~"
     - CTA 버튼: `[ 정기 견적 요청하기 ]` ➔ `USER-REQ-00` (정기 탭 활성화)
   - **[카드 2: 계절가전 케어]**
     - 카피: "에어컨/세탁기 분해 살균 청소"
     - 단가: "얼리버드 특가 대당 65,000원~"
     - CTA 버튼: `[ 가전케어 신청하기 ]` ➔ `USER-REQ-00` (가전 탭 활성화)
   - **[카드 3: 입주/이사 청소]**
     - 카피: "신축 아파트/오피스텔 전문 입주청소"
     - 단가: "표준 공급 단가 평당 11,000원~"
     - CTA 버튼: `[ 입주청소 신청하기 ]` ➔ `USER-REQ-00` (입주 탭 활성화)

8. **쓸딱 특화 정책 안심 안내 배너 (Deep Royal Navy Accent Box)**:
   - 3-Month Guarantee 및 고객 만족도 98.8% 원형 차트 표시.
   - 3대 플랫폼 정책 명시:
     1. 3개월 의무 계약 보장으로 꼼꼼한 관리 (노쇼 시 100% 무상 대체배차 보증).
     2. 투명한 데이터 이용료 정책: `max(용역대금 3.3%, 33,000원)` 산출 공식 안내.
     3. 0507 안심번호 제공 및 삼성화재 영업배상책임보험 1억원 가입 안내.

9. **이달의 일산·고양 우수 마스터 파트너**:
   - 클린마스터 김진수 팀장 (`P20261000001`, 5.0, 리뷰 328건, 전문장비 보유)
   - 에코케어 박미영 파트너 (`P20261000002`, 5.0, 리뷰 215건, 친환경 에코인증)
   - 프로클린 이성호 파트너 (`P20261000003`, 4.9, 리뷰 184건, 가전분해 명장)
   - `[ 지정 견적요청 ]` 버튼 클릭 시 해당 마스터 식별자가 지정된 상태로 `USER-REQ-00` 라우팅.

10. **하단 스티키 CTA 및 모바일 하단 네비게이션바**:
    - 데스크톱/모바일 공통: `[ 우리 집 청소 견적 신청하기 (1분 소요) ]` 하단 고정 바.
    - 모바일 전용: 홈 / 견적현황 / 이용내역 / 마이 4대 탭 네비게이션.

### 3.3 컴포넌트 Props 인터페이스 명세
```typescript
export interface UserCom00Props {
  initialUserNo?: string | null;                                    // 12자리 회원 식별자 (예: 'U20261000001')
  apiEndpoint?: string;                                             // 기본값: '/api/user/user_com_00'
  logoUrl?: string;                                                 // 기본값: '/logo.png' (플랫폼 공식 브랜드 로고)
  onNavigate?: (screenId: string, params?: Record<string, unknown>) => void; // 화면 이동 콜백 (예: 'USER-ATH-00')
  onLogout?: () => void;                                            // 로그아웃 시 인증 세션 파기 및 상태 동기화 콜백
  defaultData?: {
    categories?: MainCategoryItem[];
    banners?: MainCategoryItem[];
    userInfo?: UserInfoState | null;
    summary?: SummaryCounts | null;
  };
}
```

---

## 4. 백엔드 (BackEnd) 라우터 및 서비스 명세

### 4.1 파일 위치
- 라우터 및 서비스 로직: [`SsulDak_Web/User/backend/api_USER_COM_00/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_COM_00/route.ts)

### 4.2 HTTP 엔드포인트 명세
- **HTTP Method**: `POST`
- **URL**: `/api/user/user_com_00`
- **Request Header**:
  ```http
  Content-Type: application/json; charset=utf-8
  Authorization: Bearer {USER_JWT_TOKEN} (선택적)
  ```
- **Request Body (JSON)**:
  ```json
  {
    "userNo": "U20261000001", // 12자리 고정 규격 (비로그인 시 null 또는 생략)
    "reqType": "INIT"          // 초기 데이터 로딩 식별자
  }
  ```

### 4.3 Response Body 구조
#### 1) 12자리 정상 로그인 회원 조회 성공 시 (`userNo: "U20261000001"`) - HTTP 200
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "GRP_CD": "CLEAN_MAIN_SERVICE",
        "COM_CD": "REGULAR",
        "COM_NM": "계단/정기청소",
        "ATTR_VAL_1": "월 79,000원~",
        "ATTR_VAL_2": "apartment",
        "SORT_ORD": 1
      },
      {
        "GRP_CD": "CLEAN_MAIN_SERVICE",
        "COM_CD": "APPLIANCE",
        "COM_NM": "계절가전 분해청소",
        "ATTR_VAL_1": "대당 65,000원~",
        "ATTR_VAL_2": "mode_fan",
        "SORT_ORD": 2
      },
      {
        "GRP_CD": "CLEAN_MAIN_SERVICE",
        "COM_CD": "MOVEIN",
        "COM_NM": "입주/이사청소",
        "ATTR_VAL_1": "평당 11,000원~",
        "ATTR_VAL_2": "vpn_key",
        "SORT_ORD": 3
      }
    ],
    "banners": [
      {
        "GRP_CD": "MAIN_BANNER",
        "COM_CD": "WELCOME_PROMO",
        "COM_NM": "가입 즉시 5,000원 웰컴 할인 쿠폰팩 지급!",
        "ATTR_VAL_1": "정기청소부터 여름맞이 에어컨 분해세척까지 바로 사용 가능한 실시간 할인 혜택",
        "ATTR_VAL_2": "auto_awesome",
        "SORT_ORD": 1
      }
    ],
    "userInfo": {
      "userNo": "U20261000001",
      "userNm": "홍길동",
      "userStatCd": "NORMAL",
      "suspendExpireDt": null,
      "pointBalance": 1000,
      "couponCount": 2
    },
    "summary": {
      "openReqCnt": 0,
      "activeContractCnt": 0
    }
  }
}
```

#### 2) 비로그인(게스트) 상태 조회 시 (`userNo: null`) - HTTP 200
```json
{
  "success": true,
  "data": {
    "categories": [ ... ],
    "banners": [ ... ],
    "userInfo": null,
    "summary": null
  }
}
```

#### 3) 회원 식별자 12자리 미충족 또는 형식 오류 시 - HTTP 400 Bad Request
```json
{
  "success": false,
  "message": "회원 식별자는 반드시 12자리 고정 규격이어야 합니다. (입력값: 'U202610_ERR', 현재: 11자리)"
}
```

---

## 5. 데이터베이스 및 전용 SQL 쿼리 명세

### 5.1 화면 전용 독립 SQL 쿼리 ID

#### 1) `USER-COM-00-SQL-001` (서비스 카테고리 및 메인 배너 코드 조회)
```sql
/* USER-COM-00-SQL-001 */
SELECT GRP_CD, COM_CD, COM_NM, ATTR_VAL_1, ATTR_VAL_2, SORT_ORD
FROM TB_COM_CODE
WHERE GRP_CD IN ('CLEAN_MAIN_SERVICE', 'MAIN_BANNER') AND USE_YN = 'Y'
ORDER BY GRP_CD ASC, SORT_ORD ASC;
```

#### 2) `USER-COM-00-SQL-002` (로그인 이용자 정보, 포인트 및 쿠폰 요약 조회)
```sql
/* USER-COM-00-SQL-002 */
SELECT 
  u.USER_NO, u.USER_NM, u.USER_STAT_CD, u.SUSPEND_EXPIRE_DT,
  COALESCE((SELECT p.BALANCE_AMT FROM TB_USER_POINT_LEDGER p WHERE p.USER_NO = u.USER_NO ORDER BY p.POINT_SEQ DESC LIMIT 1), 0) AS POINT_BALANCE,
  (SELECT COUNT(*) FROM TB_USER_COUPON c WHERE c.USER_NO = u.USER_NO AND c.COUPON_STAT_CD = 'AVAILABLE' AND c.EXPIRE_DT >= NOW()) AS COUPON_COUNT
FROM TB_USER u
WHERE u.USER_NO = ?;
```

#### 3) `USER-COM-00-SQL-003` (진행 중인 견적 요청서 및 활성 체결 계약 카운트 조회)
```sql
/* USER-COM-00-SQL-003 */
SELECT 
  COUNT(CASE WHEN REQ_STAT_CD = 'OPEN' THEN 1 END) AS OPEN_REQ_CNT,
  COUNT(CASE WHEN REQ_STAT_CD = 'PARTIAL_CONTRACTED' THEN 1 END) AS PARTIAL_CNT,
  (SELECT COUNT(*) FROM TB_CLEAN_CONTRACT cnt WHERE cnt.USER_NO = ? AND cnt.CONTRACT_STAT_CD IN ('WAITING_PAY', 'CONFIRMED', 'IN_PROGRESS')) AS ACTIVE_CONTRACT_CNT
FROM TB_CLEAN_REQ
WHERE USER_NO = ? AND REQ_STAT_CD IN ('OPEN', 'PARTIAL_CONTRACTED');
```

---

## 6. 프로그램 테스트 및 수정 가이드 (테스트 엔지니어/개발자용)

### 6.1 CLI 기반 회원 식별자 12자리 및 API 통합 검증 실행

터미널에서 아래 명령을 실행하여 12자리 회원 식별자 유효성 검증과 정상/예외 케이스를 즉시 테스트합니다.

```bash
# 1. TypeScript 전체 정적 타입 체크
npx tsc --noEmit

# 2. 12자리 회원 식별자 유효성 및 백엔드 라우터 단위 테스트 실행
npx tsx --env-file=.env.local -e "
import { POST, processUserCom00, validateUserNo, generateMemberNo } from './SsulDak_Web/User/backend/api_USER_COM_00/route.ts';

async function test() {
  console.log('=== [1] 12자리 회원 식별자 채번 함수 테스트 ===');
  const newId = generateMemberNo('U', '202610', 1);
  console.log('채번된 회원번호:', newId, '길이:', newId.length, '(12자리 일치:', newId === 'U20261000001', ')');

  console.log('\n=== [2] 12자리 회원 식별자 유효성 검증 함수 테스트 ===');
  console.log('정상 식별자 (U20261000001):', validateUserNo('U20261000001').isValid);
  console.log('비정상 식별자 (길이 11자리):', validateUserNo('U2026100001').isValid === false);
  console.log('비정상 식별자 (역할코드 오류):', validateUserNo('X20261000001').isValid === false);

  console.log('\n=== [3] 백엔드 POST() API 테스트 (정상 12자리 vs 비정상 규격) ===');
  // 정상 요청
  const validReq = new Request('http://localhost:3000/api/user/user_com_00', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userNo: 'U20261000001', reqType: 'INIT' })
  });
  const validRes = await POST(validReq);
  console.log('정상 12자리 요청 HTTP 상태코드:', validRes.status); // 200

  // 12자리 미충족 비정상 요청
  const invalidReq = new Request('http://localhost:3000/api/user/user_com_00', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userNo: 'U12345', reqType: 'INIT' })
  });
  const invalidRes = await POST(invalidReq);
  console.log('비정상 요청 HTTP 상태코드 (400 예상):', invalidRes.status); // 400
  const invalidJson = await invalidRes.json();
  console.log('400 에러 메시지:', invalidJson.message);
}
test();
"
```

### 6.2 테스트 케이스별 검증 포인트

| TC 번호 | 테스트 시나리오 | 사전 조건 / 입력값 | 예상 결과 |
| :---: | :--- | :--- | :--- |
| **TC-01** | 비로그인 게스트 접속 | `userNo: null` | `userInfo: null`, `summary: null`, 카테고리 3건 정상 반환 (HTTP 200). |
| **TC-02** | 정상 12자리 회원 로그인 | `userNo: "U20261000001"` | 홍길동 회원정보 반환, 마이 퀵 서머리 카드(포인트, 쿠폰, 견적수) 표시 (HTTP 200). |
| **TC-03** | 12자리 미충족 식별자 전송 | `userNo: "U12345"` (6자리) | **HTTP 400 에러 발생**: "회원 식별자는 반드시 12자리 고정 규격이어야 합니다." |
| **TC-04** | 역할 코드 불일치 식별자 | `userNo: "P20261000001"` (파트너 ID) | **HTTP 400 에러 발생**: "이용자 회원 식별자는 반드시 'U'로 시작해야 합니다." |
| **TC-05** | 7일 취소 제재 회원 접속 | `USER_STAT_CD = 'SUSPENDED_7D'` | 화면 최상단에 붉은색 제재 경고 배너 표출 (`※ 일방 취소로 인해...`). |
| **TC-06** | 쿠폰 다운로드 클릭 | 히어로 배너 [지금 쿠폰받기] 클릭 | 토스트 메시지 표출 및 상단 퀵 서머리 쿠폰 수 1 증가. |
| **TC-07** | 서비스 바로가기 클릭 | 정기청소 / 가전케어 / 입주청소 CTA | `USER-REQ-00` 화면으로 해당 탭 파라미터(`tab: 'regular' \| 'appliance' \| 'movein'`) 전달. |
| **TC-08** | 지역 변경 드롭다운 | 지역 칩 클릭 ➔ "파주시 운정" 선택 | 칩 텍스트 및 배차 안내 문구 동적 변경 확인. |
| **TC-09** | 로그아웃 후 로그인 화면 호출 | 로그인 상태에서 헤더 [로그아웃] 클릭 ➔ 게스트 전환 후 [로그인] 버튼 클릭 | localStorage 인증 세션 파기 후 `USER-ATH-00` (로그인) 화면 즉시 호출/렌더링 (URL: `#login`). |

---

## 7. DB 테스트 데이터 초기화 및 변경 SQL (MySQL)

테스트를 위해 12자리 회원 정보나 공통 코드를 변경하려면 DB에 접속하여 아래 쿼리를 수행합니다:

```sql
-- 1. 12자리 이용자 회원(U20261000001) 정상 상태 세팅
INSERT INTO TB_USER (USER_NO, USER_EMAIL, USER_PWD_HASH, PWD_SALT, USER_NM, USER_TEL, SIGN_IMG_URL, USER_STAT_CD, MKT_AGREE_YN, REG_DT, REG_ID, MOD_DT, MOD_ID)
VALUES ('U20261000001', 'user01@ssuldak.com', 'test_hash', 'test_salt', '홍길동', '010-1234-5678', 'https://ssuldak.com/signs/u20261000001.png', 'NORMAL', 'Y', NOW(), 'SYSTEM', NOW(), 'SYSTEM')
ON DUPLICATE KEY UPDATE USER_STAT_CD = 'NORMAL', SUSPEND_EXPIRE_DT = NULL;

-- 2. 12자리 이용자 회원 상태를 7일 제재(SUSPENDED_7D)로 변경 (경고 배너 테스트)
UPDATE TB_USER 
SET USER_STAT_CD = 'SUSPENDED_7D', SUSPEND_EXPIRE_DT = DATE_ADD(NOW(), INTERVAL 7 DAY) 
WHERE USER_NO = 'U20261000001';

-- 3. 포인트 잔액 추가 테스트 (12자리 USER_NO 바인딩)
INSERT INTO TB_USER_POINT_LEDGER (USER_NO, POINT_CHG_TYPE_CD, POINT_AMT, BALANCE_AMT, REASON_DC, REG_DT, REG_ID, MOD_DT, MOD_ID)
VALUES ('U20261000001', 'REWARD', 500, 1500, '이벤트 참여 리워드 적립', NOW(), 'SYSTEM', NOW(), 'SYSTEM');
```
