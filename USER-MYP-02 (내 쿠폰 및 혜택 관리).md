# [SsulDak (쓸고닦고)] USER-MYP-02 (내 쿠폰 및 혜택 관리) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-MYP-02` |
| **화면명** | 내 쿠폰 및 혜택 관리 (My Coupons & Benefits Management) |
| **지원 채널** | Web [Y] / App [Y] (데스크톱 1280px~1440px 12컬럼 그리드 분할: 8컬럼 쿠폰함 및 등록 / 4컬럼 추천인 및 리워드 지갑 사이드바, 모바일 390px 반응형 뷰) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 부모 화면** | [`USER-MYP-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-MYP-00) (이용자 마이페이지 메인) |
| **호출 대상 화면** | [`USER-MYP-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-MYP-00) (마이페이지 복귀), [`USER-QOT-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-00) (쿠폰 사용 예약 이동) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-MYP-02/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-MYP-02/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-MYP-02/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-MYP-02/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_MYP_02/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_MYP_02/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_myp_02` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **사용 테이블** | `TB_USER_COUPON`, `TB_PROMO_CAMPAIGN`, `TB_COUPON_POOL` |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

---

### 핵심 아키텍처 및 비즈니스 규정 준수
1. **물리적 격리**: 모든 소스코드는 `SsulDak_Web/User/` 폴더 하위에 프론트엔드와 백엔드가 완결 배치되어 있으며, 타 도메인과의 종속성을 철저히 배제합니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/User/frontend/USER-MYP-02/index.jsx` & `index.tsx`
   - 백엔드 라우터: `SsulDak_Web/User/backend/api_USER_MYP_02/route.ts`
   - 엔드포인트: `POST /api/user/user_myp_02`
3. **독립 전용 SQL ID 적용**: 타 화면과 쿼리를 일체 공유하지 않고 `USER-MYP-02-SQL-001`부터 `USER-MYP-02-SQL-006`까지 전용 SQL로 완결 실행합니다.
4. **쿠폰 시리얼 등록 및 유효성 관리 정책**:
   - 16자리 시리얼 코드(예: `SSD-2026-XXXX-XXXX`, `SSUL-2026-WELC-5000`) 대소문자 무시 검증.
   - `TB_COUPON_POOL`과 `TB_PROMO_CAMPAIGN` 조인 검증:
     * 존재하지 않는 코드: `404 Not Found` 차단
     * 이미 등록/사용된 코드 (`IS_ISSUED_YN = 'Y'`): `409 Conflict` 차단
     * 등록 만료일 경과 (`EXPIRE_DT < NOW()`): `400 Bad Request` 차단
   - 동시성 제어 및 원자성 트랜잭션:
     * `USER-MYP-02-SQL-004`로 당일 기준 `UCP` + YYYYMMDD + 5자리 순번을 `FOR UPDATE` 락 채번.
     * `USER-MYP-02-SQL-005`로 `TB_USER_COUPON`에 신규 발급 인서트.
     * `USER-MYP-02-SQL-006`으로 `TB_COUPON_POOL`에 발급 완료 마킹(`IS_ISSUED_YN = 'Y'`, `ISSUED_USER_NO = ?`).
   - 상태 구분 필터 및 D-Day 연산:
     * **사용 가능 (AVAILABLE)**: `COUPON_STAT_CD = 'AVAILABLE' AND EXPIRE_DT >= NOW()` (`DATEDIFF(EXPIRE_DT, NOW())`로 잔여일 표시 e.g. D-40, D-60)
     * **사용 완료 (USED)**: `COUPON_STAT_CD = 'USED'`
     * **기간 만료됨 (EXPIRED)**: `COUPON_STAT_CD = 'EXPIRED' OR (COUPON_STAT_CD = 'AVAILABLE' AND EXPIRE_DT < NOW())`
   - 감사 컬럼: 쿠폰 등록 시 `REG_DT(NOW())`, `REG_ID(USER_NO)`, `MOD_DT(NOW())`, `MOD_ID(USER_NO)` 기록.

---

## 2. 데이터베이스 명세 및 독립 전용 SQL ID

### 2.1 독립 전용 SQL 쿼리 매핑 목록

| SQL ID | 설명 | 대상 테이블 | 작업 유형 |
| :--- | :--- | :--- | :--- |
| `USER-MYP-02-SQL-001` | 탭별 쿠폰 보유 건수 집계 (사용 가능, 사용 완료, 기간 만료됨) | `TB_USER_COUPON` | `SELECT` |
| `USER-MYP-02-SQL-002` | 쿠폰함 목록 조회 (탭 필터링 및 D-Day 잔여일 연산) | `TB_USER_COUPON`, `TB_PROMO_CAMPAIGN` | `SELECT` |
| `USER-MYP-02-SQL-003` | 시리얼 코드 유효성 검증 (쿠폰 풀 및 캠페인 원장 조회) | `TB_COUPON_POOL`, `TB_PROMO_CAMPAIGN` | `SELECT` |
| `USER-MYP-02-SQL-004` | 당일 기준 신규 U_COUPON_NO 채번 동시성 락 조회 | `TB_USER_COUPON` | `SELECT ... FOR UPDATE` |
| `USER-MYP-02-SQL-005` | 신규 사용자 쿠폰 발급 등록 | `TB_USER_COUPON` | `INSERT` |
| `USER-MYP-02-SQL-006` | 시리얼 쿠폰 풀 발급 완료 마킹 | `TB_COUPON_POOL` | `UPDATE` |

### 2.2 독립 전용 SQL 상세 쿼리문

```sql
-- [USER-MYP-02-SQL-001] 탭별 쿠폰 보유 건수 집계
SELECT 
  COUNT(CASE WHEN COUPON_STAT_CD = 'AVAILABLE' AND EXPIRE_DT >= NOW() THEN 1 END) AS availableCnt,
  COUNT(CASE WHEN COUPON_STAT_CD = 'USED' THEN 1 END) AS usedCnt,
  COUNT(CASE WHEN (COUPON_STAT_CD = 'EXPIRED' OR (COUPON_STAT_CD = 'AVAILABLE' AND EXPIRE_DT < NOW())) THEN 1 END) AS expiredCnt
FROM TB_USER_COUPON
WHERE USER_NO = ?;

-- [USER-MYP-02-SQL-002] 쿠폰함 목록 조회 (탭 필터링 및 D-Day 연산)
SELECT 
  COALESCE(c.U_COUPON_NO, c.COUPON_ISSUE_NO) AS couponNo,
  COALESCE(p.CAMPAIGN_NM, c.COUPON_NM) AS campaignNm,
  COALESCE(p.DISCOUNT_AMT, c.DISCOUNT_AMT, 5000) AS discountAmt,
  COALESCE(p.TARGET_CLEAN_TYPE, '전 청소 유형 적용 가능') AS targetCleanType,
  c.COUPON_STAT_CD AS couponStatCd,
  c.EXPIRE_DT AS expireDt,
  c.USED_DT AS usedDt,
  DATEDIFF(c.EXPIRE_DT, NOW()) AS dDayRemaining,
  DATE_FORMAT(c.EXPIRE_DT, '%Y.%m.%d') AS formattedExpireDt
FROM TB_USER_COUPON c
LEFT JOIN TB_PROMO_CAMPAIGN p ON COALESCE(c.CAMPAIGN_NO, c.CAMPAIGN_ID) = p.CAMPAIGN_NO
WHERE c.USER_NO = ?
  AND (
    (? = 'AVAILABLE' AND c.COUPON_STAT_CD = 'AVAILABLE' AND c.EXPIRE_DT >= NOW()) OR
    (? = 'USED' AND c.COUPON_STAT_CD = 'USED') OR
    (? = 'EXPIRED' AND (c.COUPON_STAT_CD = 'EXPIRED' OR (c.COUPON_STAT_CD = 'AVAILABLE' AND c.EXPIRE_DT < NOW())))
  )
ORDER BY 
  CASE WHEN ? = 'AVAILABLE' THEN c.EXPIRE_DT END ASC,
  c.REG_DT DESC;

-- [USER-MYP-02-SQL-003] 시리얼 코드 유효성 검증
SELECT 
  cp.SERIAL_CD AS serialCd,
  cp.CAMPAIGN_NO AS campaignNo,
  cp.IS_ISSUED_YN AS isIssuedYn,
  cp.EXPIRE_DT AS poolExpireDt,
  p.CAMPAIGN_NM AS campaignNm,
  p.VALID_DAYS AS validDays,
  p.DISCOUNT_AMT AS discountAmt
FROM TB_COUPON_POOL cp
INNER JOIN TB_PROMO_CAMPAIGN p ON cp.CAMPAIGN_NO = p.CAMPAIGN_NO
WHERE cp.SERIAL_CD = ?;

-- [USER-MYP-02-SQL-004] 당일 기준 신규 U_COUPON_NO 채번 락 조회
SELECT MAX(U_COUPON_NO) AS maxCouponNo
FROM TB_USER_COUPON
WHERE U_COUPON_NO LIKE CONCAT('UCP', DATE_FORMAT(NOW(), '%Y%m%d'), '%')
FOR UPDATE;

-- [USER-MYP-02-SQL-005] 신규 사용자 쿠폰 발급 등록
INSERT INTO TB_USER_COUPON (
  U_COUPON_NO, COUPON_ISSUE_NO, USER_NO, CAMPAIGN_NO, CAMPAIGN_ID, COUPON_SERIAL_CD,
  COUPON_NM, DISCOUNT_AMT, COUPON_STAT_CD,
  EXPIRE_DT, REG_DT, REG_ID, MOD_DT, MOD_ID
) VALUES (
  ?, ?, ?, ?, ?, ?,
  ?, ?, 'AVAILABLE',
  DATE_ADD(NOW(), INTERVAL ? DAY), NOW(), ?, NOW(), ?
);

-- [USER-MYP-02-SQL-006] 시리얼 코드 사용 완료 마킹
UPDATE TB_COUPON_POOL
SET 
  IS_ISSUED_YN = 'Y',
  ISSUED_USER_NO = ?,
  MOD_DT = NOW()
WHERE SERIAL_CD = ?;
```

---

## 3. 백엔드 API 명세

### 3.1 요청 헤더
```http
POST /api/user/user_myp_02 HTTP/1.1
Content-Type: application/json
Authorization: Bearer {USER_JWT_TOKEN}
```

### 3.2 처리 모드별 요청 및 응답

#### 모드 1: 쿠폰함 목록 및 상태별 카운트 조회 (`mode: "GET_COUPON_LIST"`)
- **요청 바디**:
```json
{
  "mode": "GET_COUPON_LIST",
  "userNo": "U20261000001",
  "tabType": "AVAILABLE"
}
```
- **응답 바디 (200 OK)**:
```json
{
  "success": true,
  "counts": {
    "available": 3,
    "used": 2,
    "expired": 1
  },
  "coupons": [
    {
      "couponNo": "UCP2026100100001",
      "campaignNm": "[웰컴 첫 가입] 데이터 이용료 5,000원 할인권",
      "discountAmt": 5000,
      "targetCleanType": "전 청소 유형 적용 가능",
      "couponStatCd": "AVAILABLE",
      "expireDt": "2026-12-02T02:34:26.000Z",
      "usedDt": null,
      "dDayRemaining": 40,
      "formattedExpireDt": "2026.12.02"
    },
    {
      "couponNo": "UCP2026100100002",
      "campaignNm": "[친구초대 리워드] 감사 5,000원 할인권",
      "discountAmt": 5000,
      "targetCleanType": "정기청소 및 입주청소 데이터 이용료 결제 시",
      "couponStatCd": "AVAILABLE",
      "expireDt": "2026-12-22T02:34:26.000Z",
      "usedDt": null,
      "dDayRemaining": 60,
      "formattedExpireDt": "2026.12.22"
    }
  ]
}
```

#### 모드 2: 16자리 프로모션 시리얼 코드 등록 (`mode: "REGISTER_SERIAL_COUPON"`)
- **요청 바디**:
```json
{
  "mode": "REGISTER_SERIAL_COUPON",
  "userNo": "U20261000001",
  "serialCode": "SSD-2026-XXXX-XXXX"
}
```
- **성공 응답 (201 Created)**:
```json
{
  "success": true,
  "couponNo": "UCP2026102300002",
  "couponNm": "[특별 감사 프로모션] 10,000원 즉시 할인권",
  "message": "쿠폰이 성공적으로 등록되었습니다."
}
```
- **예외 응답 (존재하지 않는 코드 - 404 Not Found)**:
```json
{
  "success": false,
  "message": "유효하지 않은 쿠폰 번호입니다."
}
```
- **예외 응답 (중복 등록/사용된 코드 - 409 Conflict)**:
```json
{
  "success": false,
  "message": "이미 사용/등록된 쿠폰 코드입니다."
}
```

---

## 4. 프론트엔드 UI 컴포넌트 구성 명세

1. **상단 네비게이션 헤더 (`Header`)**:
   - SsulDak 로고, 서비스 타이틀, 지역 선택기 (`경기 고양시 일산동구`)
   - 5대 메뉴: 홈, 견적현황, 이용내역, **쿠폰북 (Active - Primary Navy Container)**, 마이
   - 알림 벨(읽지 않은 뱃지), 사용자 아바타

2. **브레드크럼 및 헤더 바 (`Breadcrumb & Header`)**:
   - 경로: `홈 > 마이페이지 > 내 쿠폰 및 혜택 관리`
   - 페이지 타이틀: `내 쿠폰 및 혜택 관리` (Font-extrabold 28px)
   - 서브타이틀: `보유 중인 할인 쿠폰과 리워드 혜택을 확인하고 신규 프로모션 코드를 등록하세요.`
   - 마이페이지로 복귀 버튼: `arrow_back` 아이콘 + `마이페이지로 돌아가기` (클릭 시 `#mypage` 이동)

3. **요약 대시보드 배너 (3단 카드)**:
   - **보유 쿠폰**: `{counts.available}장` + [사용 가능] 뱃지
   - **SsulDak 리워드**: `3,000 P` (1P = 1원 즉시 차감)
   - **이번 달 절약한 청소비**: `15,000 원` (정기청소 누적할인 포함)

4. **16자리 시리얼 쿠폰 등록 박스**:
   - 키 아이콘 + 실시간 대문자 변환 인풋
   - 입력 시 취소 버튼(X) 노출
   - [쿠폰 등록하기] 액션 버튼 (로딩/비활성화 처리)
   - 즉시 계정 등록 뱃지 및 안내 캡션

5. **쿠폰 필터 세그먼트 탭 & 정렬 셀렉터**:
   - **사용 가능 ({available})** / **사용 완료 ({used})** / **기간 만료됨 ({expired})** 탭 전환
   - 정렬: 최신 등록순, 마감 임박순, 할인 금액 높은순

6. **바우처 티켓 카드 (Voucher Ticket Card)**:
   - 좌측 스텁(Stub): 원형 Notch 천공 그래픽 효과, `D-{dDayRemaining}` 뱃지, 할인금액, 카테고리
   - 우측 본문: 리워드 뱃지, 쿠폰 발급 코드, 캠페인명, 적용 조건, 유효기간, [지금 예약에 사용하기] CTA 버튼
   - 사용 완료/만료 카드: 그레이스케일 및 스탬프 뱃지, 라인쓰루(취소선) 스타일링

7. **우측 추천인 & 리워드 사이드바**:
   - **친구 초대 상시 이벤트**: 고유 추천인 코드 (`SSD-KIM-7788`), [코드 복사] 버튼(클립보드 API 연동), 카카오톡 공유 버튼
   - **리워드 포인트 지갑**: 실시간 3,000 P, 30일 내 소멸 0 P, 내역 확인 링크
   - **정기구독 10% 추가할인 배너 위젯**: 고화질 클리닝 비주얼 이미지
   - **고객지원 위젯**: 고객센터 전화 연결 및 1:1 카카오톡 상담 버튼

8. **플로팅 마이크로 인터랙션 토스트 (`Floating Toast`)**:
   - 코드 복사 완료 토스트
   - 쿠폰 등록 성공/실패 토스트
   - 안내 팝업 피드백

---

## 5. 실환경 테스트 및 브라우저 검증 결과

- **테스트 환경**: Node.js v20 + Express Daemon (`http://localhost:3000/?v=20261023_myp02_v2#coupon-book`)
- **브라우저 서브에이전트 검증 항목**:
  1. `GET_COUPON_LIST` 초기 로딩 시 보유 쿠폰 3장, 리워드 3,000 P 정상 수신 및 렌더링 확인.
  2. 세그먼트 탭 전환 테스트: [사용 완료] 클릭 시 2장의 사용 완료 쿠폰, [기간 만료됨] 클릭 시 1장의 만료 쿠폰이 즉각 로딩됨을 확인.
  3. 시리얼 쿠폰 등록 테스트: `SSD-2026-XXXX-XXXX` 입력 후 [쿠폰 등록하기] 클릭 시 트랜잭션 채번(`UCP2026102300002`) 및 등록 성공 토스트 출력 확인.
  4. 친구 추천인 코드 복사 버튼 클릭 시 클립보드 복사 및 성공 토스트 피드백 확인.
  5. 하단 접이식 프리뷰 컨트롤러와 반응형 레이아웃 정상 동작 확인.
