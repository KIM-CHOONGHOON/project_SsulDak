# [SsulDak (쓸고닦고)] USER-CNT-02 (결제 실패 및 자산 복원) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-CNT-02` |
| **화면명** | 결제 승인 실패 및 자산 복원 (Payment Failure & Asset Restoration Safeguard) |
| **지원 채널** | Web [Y] / App [Y] (데스크톱 1440px 타겟 2컬럼 레이아웃 / 모바일 390px 반응형 뷰) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 부모 화면** | [`USER-CNT-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-CNT-00) (계약 확정 및 결제) |
| **호출 대상 화면** | [`USER-CNT-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-CNT-00) (재결제 재시도), [`USER-QOT-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-00) (수신 청약 목록 복귀), [`USER-COM-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-COM-00) (메인 홈) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-CNT-02/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-CNT-02/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-CNT-02/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-CNT-02/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_CNT_02/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_CNT_02/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_cnt_02` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **사용 테이블** | `TB_PAY_FAIL_LOG`, `TB_USER_COUPON`, `TB_USER_POINT_LEDGER`, `TB_CLEAN_REQ_SLOT`, `TB_CLEAN_BID` |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

### 핵심 아키텍처 및 코딩 규칙 준수
1. **물리적 격리**: 모든 소스코드는 `SsulDak_Web/User/` 폴더 하위에 완결 배치되어 타 도메인과의 교차 참조 및 컴포넌트 공유를 엄격히 금지합니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/User/frontend/USER-CNT-02/index.jsx` (및 `index.tsx`)
   - 백엔드 라우터: `SsulDak_Web/User/backend/api_USER_CNT_02/route.ts`
   - 엔드포인트: `POST /api/user/user_cnt_02`
3. **독립 전용 SQL ID 적용**: 타 화면과 쿼리를 일체 공유하지 않고 `USER-CNT-02-SQL-001`부터 `USER-CNT-02-SQL-005`까지 고유 ID로 실행합니다.
4. **자산 자동 복원 및 정합성 보장 (핵심 롤백 정책)**:
   - PG 승인 실패 시 즉시 백엔드 롤백 API(`processUserCnt02`)를 호출하여 선점/임시 사용된 쿠폰 상태를 `'AVAILABLE'`로 복구.
   - 선 차감된 포인트가 존재할 경우 `'RESTORE'` 변동 구분으로 원복 `INSERT` 처리.
   - 체결 시도되었던 계약서 생성 전 단계에서 임시 생성 데이터 및 세션 상태를 안전하게 롤백.
   - 장애/오류 이력 추적을 위해 `TB_PAY_FAIL_LOG` 원장에 영구 로깅.
   - 이용자에게 실패 사유(카드 한도 초과, 인증 시간 초과 등)를 친화적인 한국어 가이드로 번역하여 제공.
5. **플랫폼 공식 브랜드 로고 및 디자인 시스템**:
   - GNB 상단 바에 공식 브랜드 로고(`public/logo.png`)를 렌더링.
   - 브랜드 메인 네이비(`brand-navy: #1F497D`) 및 포인트 민트/그린(`secondary: #006c4a`, `secondary-container: #82f5c1`)을 조화롭게 적용.

---

## 2. 데이터베이스 명세 및 독립 전용 SQL ID

### 2.1 테이블 구조

#### 1) `TB_PAY_FAIL_LOG` (결제 실패/취소 로그 원장)
```sql
CREATE TABLE IF NOT EXISTS TB_PAY_FAIL_LOG (
  FAIL_SEQ BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '결제 실패 고유 일련번호',
  USER_NO VARCHAR(50) NOT NULL COMMENT '이용자 회원번호',
  REQ_NO VARCHAR(50) NULL COMMENT '청소 의뢰 요청번호',
  ERROR_CODE VARCHAR(50) NOT NULL COMMENT 'PG/결제사 오류 코드',
  ERROR_MSG VARCHAR(500) NOT NULL COMMENT '결제 오류 메시지 상세',
  ATTEMPTED_AMT INT DEFAULT 0 COMMENT '결제 시도 금액(원)',
  COUPON_RESTORE_YN CHAR(1) DEFAULT 'N' COMMENT '쿠폰 원복 여부 (Y/N)',
  POINT_RESTORE_AMT INT DEFAULT 0 COMMENT '포인트 복원 금액(P)',
  REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '실패 기록 일시',
  INDEX IX_TB_PAY_FAIL_LOG_USER (USER_NO, REG_DT)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='결제 승인 실패 및 자산 복원 감사 로그';
```

#### 2) `TB_USER_COUPON` (쿠폰 마스터)
- `U_COUPON_NO` (PK, VARCHAR)
- `USER_NO` (이용자 ID)
- `COUPON_STAT_CD` ('USED' -> 'AVAILABLE'로 원상 복구)
- `USED_DT` (NULL 처리)
- `MOD_DT`, `MOD_ID` (감사 컬럼)

#### 3) `TB_USER_POINT_LEDGER` (포인트 원장)
- `POINT_SEQ` (PK, BIGINT AUTO_INCREMENT)
- `USER_NO` (이용자 ID)
- `POINT_CHG_AMT` (+ 복원 금액: 양수)
- `BALANCE_AMT` (최종 복구 후 잔액)
- `POINT_CHG_TYPE_CD` ('RESTORE' - 결제실패복원)
- `REG_DT`, `REG_ID`

---

### 2.2 독립 전용 SQL 쿼리 ID 및 쿼리문

#### [USER-CNT-02-SQL-001] 임시 사용 처리된 쿠폰 원복 (TB_USER_COUPON UPDATE)
```sql
UPDATE TB_USER_COUPON
SET 
  COUPON_STAT_CD = 'AVAILABLE',
  USED_DT = NULL,
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE U_COUPON_NO = ? AND USER_NO = ?;
```

#### [USER-CNT-02-SQL-002] 이용자 최종 포인트 잔액 조회
```sql
SELECT COALESCE(BALANCE_AMT, 0) AS currentBalance
FROM TB_USER_POINT_LEDGER
WHERE USER_NO = ?
ORDER BY POINT_SEQ DESC
LIMIT 1;
```

#### [USER-CNT-02-SQL-003] 결제 실패로 인한 포인트 복원 등록 (TB_USER_POINT_LEDGER INSERT)
```sql
INSERT INTO TB_USER_POINT_LEDGER (
  USER_NO, POINT_CHG_AMT, BALANCE_AMT, POINT_CHG_TYPE_CD, REG_DT, REG_ID
) VALUES (
  ?, ?, ?, 'RESTORE', NOW(), ?
);
```

#### [USER-CNT-02-SQL-004] 결제 실패 로그 기록 (TB_PAY_FAIL_LOG INSERT)
```sql
INSERT INTO TB_PAY_FAIL_LOG (
  USER_NO, REQ_NO, ERROR_CODE, ERROR_MSG, ATTEMPTED_AMT, COUPON_RESTORE_YN, POINT_RESTORE_AMT, REG_DT
) VALUES (
  ?, ?, ?, ?, ?, ?, ?, NOW()
);
```

#### [USER-CNT-02-SQL-005] 시공 의뢰 공정 및 견적 정보 조회 (TB_CLEAN_REQ_SLOT & TB_CLEAN_BID JOIN)
```sql
SELECT 
  s.SLOT_NO AS slotNo,
  s.PROCESS_SEQ AS processSeq,
  s.SERVICE_TYPE_CD AS serviceTypeCd,
  s.SPACE_NAME AS spaceName,
  s.DETAIL_ITEMS AS detailItems,
  s.SCHEDULE_DESC AS scheduleDesc,
  COALESCE(b.BID_AMT, 0) AS bidAmt,
  COALESCE(p.COMPANY_NM, '전문 파트너') AS partnerCompanyNm,
  COALESCE(p.CEO_NM, '담당 마스터') AS partnerCeoNm
FROM TB_CLEAN_REQ_SLOT s
LEFT JOIN TB_CLEAN_BID b ON s.REQ_NO = b.REQ_NO AND b.BID_STAT_CD IN ('SELECTED', 'ACCEPTED', 'PENDING')
LEFT JOIN TB_PARTNER p ON b.PTNR_NO = p.PTNR_NO
WHERE s.REQ_NO = ?
ORDER BY s.PROCESS_SEQ ASC, s.SLOT_NO ASC
LIMIT 4;
```

---

## 3. 백엔드 서비스 엔진 및 비즈니스 처리 로직

### 3.1 요청/응답 명세
- **HTTP 엔드포인트**: `POST /api/user/user_cnt_02`
- **Request Header**:
  ```http
  Content-Type: application/json
  Authorization: Bearer {USER_JWT_TOKEN}
  ```
- **Request Body (JSON)**:
  ```json
  {
    "actionType": "ROLLBACK_AND_REPORT",
    "userNo": "U20261000001",
    "reqNo": "REQ202610210001",
    "contractNo": "CNT-20261021-0001",
    "couponNo": "UCP2026100100001",
    "usePointAmt": 2000,
    "errorCode": "PG_CARD_LIMIT",
    "errorMsg": "카드 한도 초과 또는 잔액 부족",
    "attemptedPaidAmt": 26000
  }
  ```
- **Response Body (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "isCouponRestored": true,
    "restoredCouponNm": "웰컴 신규가입 쿠폰 5,000원",
    "restoredPointAmt": 2000,
    "currentPointBalance": 11000,
    "errorCode": "PG_CARD_LIMIT",
    "friendlyErrorMsg": "등록하신 결제 수단의 온라인 결제 한도가 초과되었거나 잔액이 부족하여 승인되지 않았습니다. 일시적인 금융사 네트워크 지연 또는 설정 한도를 확인해 주세요.",
    "txId": "TX-20261023-5164",
    "attemptedDt": "2026.10.23 11:45:17",
    "attemptedPaidAmt": 26000,
    "baseFeeAmt": 33000,
    "discountCouponAmt": 5000,
    "items": [
      {
        "slotNo": "SLOT-01",
        "processSeq": 1,
        "title": "정기 오피스/빌라 케어 3개월",
        "partnerCompanyNm": "반짝빌라클린",
        "partnerCeoNm": "홍길동 대표",
        "subDesc": "주 2회 정밀 케어 약정",
        "expectedPayAmt": 240000,
        "isMonthly": true
      },
      {
        "slotNo": "SLOT-02",
        "processSeq": 2,
        "title": "가전 분해 세척 천장형 에어컨 1대",
        "partnerCompanyNm": "홈케어마스터",
        "partnerCeoNm": "이마스터 팀장",
        "subDesc": "친환경 고압 스팀 소독 포함",
        "expectedPayAmt": 80000,
        "isMonthly": false
      }
    ],
    "message": "사용 시도된 쿠폰과 포인트가 정상적으로 원복되었습니다."
  }
  ```

---

## 4. 프론트엔드 UI/UX 인터랙션 구현 명세

### 4.1 화면 레이아웃 구성
1. **GNB 헤더 (Top Fixed Header)**:
   - 좌측: 공식 브랜드 로고(`logo.png`) 및 서비스명 "SsulDak 쓸고닦고", 관할 지역 선택 뱃지("경기 고양시 일산동구").
   - 중앙: 내비게이션 탭 (홈, 견적현황[Active: 브랜드 네이비 `#1F497D`], 이용내역, 쿠폰북, 마이).
   - 우측: 장바구니 아이콘, 실시간 알림 뱃지(빨간 점 인디케이터), 프로필 아바타.
2. **상단 네비게이션 & 세션 트래킹 바**:
   - 브레드크럼: 홈 > 견적 현황 > 계약 확정 및 결제 (USER-CNT-00) > [결제 실패/취소].
   - 우측 뱃지: 세션/주문 고유번호 `TX-20261023-XXXX` (실시간 펄스 인디케이터 탑재).
3. **결제 실패 알림 히어로 배너 (Failure Warning Hero Card)**:
   - 중앙 상단: 붉은색 경고 아이콘 + `DECLINED` 뱃지.
   - 메인 헤드라인: "결제 승인 처리에 실패하였습니다".
   - 에러 태그 바: 결제 승인 거절, `[PG_CARD_LIMIT]`, 시도 일시 태그.
4. **실패 사유 및 권장 조치 가이드**:
   - PG 승인 응답 리포트 경고 박스: 구체적인 오류 원인 및 사유 설명.
   - 권장 해결 체크리스트 3종:
     * ① 카드사 앱 한도 점검 및 증액
     * ② 유효기간, CVC 보안 인증 재확인
     * ③ 대체 수단(간편결제/에스크로 가상계좌)으로 결제 권장
5. **자산 복원 안심 보증 카드 (Benefit Restoration Safeguard)**:
   - 배경: Soft Sky/Mint 그라데이션, `100% 안전 보호 중` 뱃지.
   - 💡 "안심하세요! 적용하셨던 혜택은 안전하게 자동 복원되었습니다." 안내문.
   - 3분할 자산 복원 카드:
     * `카드 1`: 웰컴 신규가입 쿠폰 5,000원 (즉시 사용 가능 / 쿠폰 원복 완료)
     * `카드 2`: 쓸고닦고 포인트 2,000 P (차감 없음 / 보유 유지)
     * `카드 3`: 파트너 견적 예약 보호 24시간 보존 (실시간 카운트다운 타이머 `23:59:XX` 동작)
6. **결제 진행 중이던 시공 의뢰 내역 (Booking Context Summary)**:
   - 복수 공정 카드 렌더링 (공정 01: 정기 오피스/빌라 케어 월 240,000원, 공정 02: 가전 분해 세척 80,000원).
   - 현장 지불 실제 용역비 합계 바: `320,000원` (플랫폼 이용료와 엄격히 분리 고지).
   - 미결제 상태 고지: 파트너 배차 및 1:1 상담 채팅방이 미결제 상태에서는 비활성화됨을 안내.
7. **우측 고정 결제 요약 및 액션 패널 (Right Sticky Panel)**:
   - **재결제 시도 요약**:
     * 청약 주문번호, 정상 데이터 이용료(33,000원), 복원 쿠폰(-5,000원), 복원 포인트(-2,000원).
     * 최종 재시도 승인 예상액: `26,000원` (부가세 포함).
   - **고대비 액션 버튼 2종**:
     * 메인 버튼: **[ 다른 결제 수단으로 다시 시도하기 (USER-CNT-00) ]** (브랜드 네이비 `#1F497D`, 화살표 및 회전 아이콘).
     * 보조 버튼: **[ 수신 청약 목록으로 돌아가기 (USER-QOT-00) ]**.
   - **전담 지원 센터 (Fast Dedicated Support)**:
     * 대표 고객센터 1588-0000, 실시간 대기 상담사 2명 뱃지, 카카오 긴급 상담 토스트, 전화 연결 요청 토스트 연동.
   - **에스크로 및 256-bit SSL 보안 인증 배지**.

---

## 5. 단위 및 통합 테스트 검증 결과

### 5.1 데이터베이스 및 백엔드 롤백 트랜잭션 검증
- **테이블 생성**: `TB_PAY_FAIL_LOG` 생성 완료.
- **쿠폰 및 포인트 롤백 쿼리**:
  - `USER-CNT-02-SQL-001` 실행 결과: `TB_USER_COUPON` 상태 `'AVAILABLE'` 원복 성공.
  - `USER-CNT-02-SQL-003` 실행 결과: `TB_USER_POINT_LEDGER` 변동구분 `'RESTORE'` +2,000P 적재 성공 (잔액 11,000P 반영).
  - `USER-CNT-02-SQL-004` 실행 결과: `TB_PAY_FAIL_LOG` 실패 이력 정상 적재.
- **REST API 엔드포인트 curl 테스트**:
  - `POST /api/user/user_cnt_02` 호출 시 HTTP 200 OK 및 기대 JSON 필드 반환 완료.

### 5.2 브라우저 화면 렌더링 및 인터랙션 검증
- **검증 환경**: Next.js App Router / React 19 / Tailwind CSS
- **URL**: `http://localhost:3000/?v=20261023_cnt02_v2#cnt-02`
- **테스트 결과**:
  1. GNB 헤더 브랜드 로고 및 active 탭 배경 네이비(`#1F497D`) 정상 적용.
  2. 세션 고유번호 TX ID 및 펄스 애니메이션 정상 작동.
  3. 실시간 24시간 카운트다운 타이머(초 단위 감소) 정상 작동.
  4. 다른 결제 수단으로 다시 시도하기 클릭 시 `USER-CNT-00`으로 상태 유지 전달.
  5. 수신 청약 목록으로 돌아가기 클릭 시 `USER-QOT-00`으로 안전하게 라우팅.
  6. 카카오 상담 및 전화 연결 요청 클릭 시 우측 상단 플로팅 토스트 정상 팝업.
