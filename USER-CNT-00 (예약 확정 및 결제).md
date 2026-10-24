# [SsulDak (쓸고닦고)] USER-CNT-00 (예약 확정 및 데이터 이용료 결제) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-CNT-00` |
| **화면명** | 계약 확정 및 데이터 이용료 결제 (Contract Confirmation & Data Fee Payment) |
| **지원 채널** | Web [Y] / App [Y] (데스크톱 1280px 2컬럼 레이아웃 / 모바일 390px 반응형 뷰) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 부모 화면** | [`USER-QOT-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-00) (수신 청약 목록) 또는 [`USER-QOT-01`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-01) (파트너 상세 프로필) |
| **호출 대상 화면** | [`USER-QOT-02`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-02) (1:1 상담 채팅) 또는 [`USER-HIS-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-00) (계약/시공 내역) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-CNT-00/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-CNT-00/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-CNT-00/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-CNT-00/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_CNT_00/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_CNT_00/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_cnt_00` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **사용 테이블** | `TB_CLEAN_CONTRACT`, `TB_DATA_FEE_PAY`, `TB_USER_COUPON`, `TB_USER_POINT_LEDGER`, `TB_CLEAN_REQ_SLOT`, `TB_CLEAN_REQ`, `TB_CLEAN_BID`, `TB_PARTNER`, `TB_USER` |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

### 핵심 아키텍처 및 코딩 규칙 준수
1. **물리적 격리**: 모든 소스코드는 `SsulDak_Web/User/` 폴더 하위에 완결 배치되어 타 도메인과의 교차 참조 및 공유를 엄격히 금지합니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/User/frontend/USER-CNT-00/index.tsx`
   - 백엔드 라우터: `SsulDak_Web/User/backend/api_USER_CNT_00/route.ts`
   - 엔드포인트: `POST /api/user/user_cnt_00`
3. **독립 전용 SQL ID 적용**: 타 화면과 쿼리를 일체 공유하지 않고 `USER-CNT-00-SQL-001`부터 `USER-CNT-00-SQL-008`까지 고유 ID로 실행합니다.
4. **플랫폼 공식 브랜드 로고 준수**:
   - GNB 상단 바 및 결제 확인 영역에 첨부된 공식 브랜드 로고(`public/logo.png`)를 렌더링합니다.
5. **개정 과금 및 정산 원칙 (비즈니스 룰 필수)**:
   - **데이터 이용료 정의**: 본 화면에서 결제하는 금액은 "청소 용역 대금(계약금)"이 아닌 "플랫폼 시스템 매칭 및 데이터 이용료(라이선스)"입니다.
   - **기준 데이터 이용료 산정**: `MAX(ROUND(총 용역비 * 0.033), 33000)` (VAT 10% 포함).
   - **현장 직접 정산 원칙**: 실제 청소 용역비(예: 320,000원)는 공정 시공이 완료된 후 현장에서 고객이 파트너에게 전액 직접 지불(에스크로 없음)합니다.
   - **할인 혜택**: 보유 쿠폰 차감 및 포인트(100P 단위) 차감을 지원합니다.
   - **0원 바이패스 처리**: 쿠폰/포인트 적용으로 최종 실 결제금액이 0원인 경우 PG 결제창 호출을 생략하고 `FREE_PASS` 승인으로 즉시 계약을 체결합니다.
   - **취소 환불 정책 안내**: 7일 이내 취소 시 50% 환불, 7일 이후 전액 몰수 + 7일간 서비스 이용 정지 패널티를 고지하고 필수 동의를 받습니다.

---

## 2. 데이터베이스 명세 및 DDL

### 2.1 테이블: `TB_DATA_FEE_PAY` (데이터 이용료 결제 원장)
```sql
CREATE TABLE IF NOT EXISTS TB_DATA_FEE_PAY (
  PAY_NO CHAR(16) PRIMARY KEY COMMENT '결제 번호 (PAY + YYYYMMDD + 5자리)',
  CONTRACT_NO CHAR(16) NOT NULL COMMENT '대표 계약번호 (FK)',
  PAYER_TYPE_CD VARCHAR(20) DEFAULT 'USER' COMMENT '결제자 구분 (USER, PARTNER)',
  PAYER_ID VARCHAR(50) NOT NULL COMMENT '이용자 ID (FK)',
  BASE_FEE_AMT INT NOT NULL COMMENT '기준 데이터 이용료',
  DISCOUNT_COUPON_AMT INT DEFAULT 0 COMMENT '쿠폰 할인액',
  USED_POINT_AMT INT DEFAULT 0 COMMENT '포인트 사용액',
  ACTUAL_PAID_AMT INT NOT NULL COMMENT '최종 실 결제액',
  PG_PROVIDER_CD VARCHAR(20) NOT NULL COMMENT 'PG사 코드 (TOSS, KAKAO, FREE_PASS, CARD 등)',
  PG_TID VARCHAR(100) NULL COMMENT 'PG 승인 거래번호',
  PAY_STAT_CD VARCHAR(20) DEFAULT 'COMPLETED' COMMENT '결제 상태',
  PAID_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '결제 일시',
  REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP,
  REG_ID VARCHAR(50),
  MOD_DT DATETIME DEFAULT CURRENT_TIMESTAMP,
  MOD_ID VARCHAR(50),
  INDEX IDX_PAY_CONTRACT (CONTRACT_NO),
  INDEX IDX_PAYER (PAYER_ID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='데이터 이용료 결제 원장';
```

### 2.2 독립 전용 SQL 쿼리 명세
- **`USER-CNT-00-SQL-001` (선택된 슬롯 및 청약 파트너 정보 일괄 조회)**
  ```sql
  SELECT 
    s.SLOT_NO AS slotNo,
    s.SUB_ITEM_NM AS subItemNm,
    s.SERVICE_TYPE_CD AS serviceTypeCd,
    b.BID_NO AS bidNo,
    b.PTNR_NO AS ptnrNo,
    b.BID_AMT AS bidAmt,
    b.WORKER_CNT AS workerCnt,
    b.EST_DURATION_HOURS AS estDurationHours,
    b.PROPOSAL_NOTE AS proposalNote,
    p.COMPANY_NM AS companyNm,
    COALESCE(p.CEO_NM, '대표자') AS ceoNm,
    p.PROFILE_IMG_URL AS profileImgUrl,
    COALESCE(p.AVG_RATING, 5.0) AS avgRating,
    COALESCE(p.REVIEW_CNT, 128) AS reviewCnt
  FROM TB_CLEAN_REQ_SLOT s
  INNER JOIN TB_CLEAN_BID b ON s.SLOT_NO = b.SLOT_NO
  INNER JOIN TB_PARTNER p ON b.PTNR_NO = p.PTNR_NO
  WHERE s.SLOT_NO IN (?) AND b.BID_NO IN (?)
  ORDER BY s.SLOT_NO ASC;
  ```

- **`USER-CNT-00-SQL-002` (이용자 가용 포인트 잔액 및 전자서명 조회)**
  ```sql
  SELECT 
    (SELECT COALESCE(BALANCE_AMT, 0) FROM TB_USER_POINT_LEDGER WHERE USER_NO = ? ORDER BY POINT_SEQ DESC LIMIT 1) AS pointBalance,
    u.SIGN_IMG_URL AS userSignUrl
  FROM TB_USER u
  WHERE u.USER_NO = ?;
  ```

- **`USER-CNT-00-SQL-003` (이용자 사용 가능한 할인 쿠폰 목록 조회)**
  ```sql
  SELECT 
    c.COUPON_ISSUE_NO AS couponNo,
    COALESCE(c.COUPON_NM, '[웰컴 가입] 첫 결제 5,000원 할인 쿠폰') AS campaignNm,
    COALESCE(c.DISCOUNT_AMT, 5000) AS discountAmt,
    DATE_FORMAT(c.EXPIRE_DT, '%Y.%m.%d') AS expireDt
  FROM TB_USER_COUPON c
  WHERE c.USER_NO = ? AND c.COUPON_STAT_CD = 'AVAILABLE' AND c.EXPIRE_DT >= NOW()
  ORDER BY c.EXPIRE_DT ASC;
  ```

- **`USER-CNT-00-SQL-004` (신규 계약서 등록: TB_CLEAN_CONTRACT INSERT)**
  ```sql
  INSERT INTO TB_CLEAN_CONTRACT (
    CONTRACT_NO, REQ_NO, SLOT_NO, USER_NO, PTNR_NO,
    CONTRACT_STAT_CD, TOTAL_PAY_AMT, SAFE_TEL_NO,
    USER_FEE_PAID_YN, PTNR_FEE_PAID_YN,
    SERVICE_START_DT, SERVICE_TYPE_CD, SUB_ITEM_NM,
    USER_SIGN_URL, REG_DT, REG_ID, MOD_DT, MOD_ID
  ) VALUES (
    ?, ?, ?, ?, ?,
    'CONFIRMED', ?, ?,
    'Y', 'Y',
    DATE_ADD(NOW(), INTERVAL 9 DAY), ?, ?,
    ?, NOW(), ?, NOW(), ?
  );
  ```

- **`USER-CNT-00-SQL-005` (데이터 이용료 결제 원장 등록: TB_DATA_FEE_PAY INSERT)**
  ```sql
  INSERT INTO TB_DATA_FEE_PAY (
    PAY_NO, CONTRACT_NO, PAYER_TYPE_CD, PAYER_ID,
    BASE_FEE_AMT, DISCOUNT_COUPON_AMT, USED_POINT_AMT, ACTUAL_PAID_AMT,
    PG_PROVIDER_CD, PG_TID, PAY_STAT_CD, PAID_DT, REG_DT, REG_ID, MOD_DT, MOD_ID
  ) VALUES (
    ?, ?, 'USER', ?,
    ?, ?, ?, ?,
    ?, ?, 'COMPLETED', NOW(), NOW(), ?, NOW(), ?
  );
  ```

- **`USER-CNT-00-SQL-006` (쿠폰 사용 처리: TB_USER_COUPON UPDATE)**
  ```sql
  UPDATE TB_USER_COUPON
  SET COUPON_STAT_CD = 'USED', USED_DT = NOW(), MOD_DT = NOW(), MOD_ID = ?
  WHERE COUPON_ISSUE_NO = ? AND USER_NO = ?;
  ```

- **`USER-CNT-00-SQL-007` (포인트 차감 이력 등록: TB_USER_POINT_LEDGER INSERT)**
  ```sql
  INSERT INTO TB_USER_POINT_LEDGER (
    USER_NO, POINT_CHG_TYPE_CD, POINT_AMT, BALANCE_AMT, REASON_DC, REG_DT, REG_ID
  ) VALUES (
    ?, 'USE_PAY', -?, ?, '계약 체결 시 데이터 이용료 포인트 차감', NOW(), ?
  );
  ```

- **`USER-CNT-00-SQL-008` (슬롯 계약 체결 전이: TB_CLEAN_REQ_SLOT UPDATE)**
  ```sql
  UPDATE TB_CLEAN_REQ_SLOT
  SET SLOT_STAT_CD = 'CONTRACTED', MOD_DT = NOW(), MOD_ID = ?
  WHERE SLOT_NO = ?;
  ```

---

## 3. 백엔드 API 명세 (`POST /api/user/user_cnt_00`)

### 3.1 결제 주문서 초기 정보 로딩 (`mode: "GET_ORDER_SHEET"`)
#### Request Payload
```json
{
  "mode": "GET_ORDER_SHEET",
  "userNo": "U20261000001",
  "reqNo": "REQ202610210001",
  "selectedSlotList": [
    { "slotNo": "REQ202610210001-01", "bidNo": "BID2026102200001" },
    { "slotNo": "REQ202610210001-02", "bidNo": "BID2026102200002" }
  ]
}
```

#### Response Payload (200 OK)
```json
{
  "success": true,
  "reqNo": "REQ202610210001",
  "services": [
    {
      "slotNo": "REQ202610210001-01",
      "subItemNm": "정기청소 (3개월/주 1회)",
      "serviceTypeCd": "REGULAR",
      "bidNo": "BID2026102200001",
      "ptnrNo": "P20260900012",
      "bidAmt": 240000,
      "workerCnt": 2,
      "estDurationHours": "2.0",
      "proposalNote": "월 4회 방문 · 3개월 총 12회 관리, 친환경 고압수세 및 계단/복도 전체 소독",
      "companyNm": "반짝빌라클린",
      "ceoNm": "홍길동",
      "avgRating": 5.0,
      "reviewCnt": 128
    },
    {
      "slotNo": "REQ202610210001-02",
      "subItemNm": "가전케어 (LG 스탠드 에어컨)",
      "serviceTypeCd": "APPLIANCE",
      "bidNo": "BID2026102200002",
      "ptnrNo": "P20260900035",
      "bidAmt": 80000,
      "workerCnt": 1,
      "estDurationHours": "1.5",
      "proposalNote": "송풍팬·열교환기 완전분해 고압살균세척 및 피톤치드 연무 항균 코팅",
      "companyNm": "홈케어마스터",
      "ceoNm": "대표자",
      "avgRating": 4.9,
      "reviewCnt": 94
    }
  ],
  "totalServiceAmt": 320000,
  "baseFeeAmt": 33000,
  "pointBalance": 3000,
  "coupons": [
    {
      "couponNo": "CPN202610000001",
      "campaignNm": "신규회원 웰컴 5,000원 할인쿠폰",
      "discountAmt": 5000,
      "expireDt": "2026.11.21"
    }
  ],
  "userSignUrl": "https://ssuldak.com/signs/u20261000001.png"
}
```

---

### 3.2 결제 승인 및 계약 체결 트랜잭션 (`mode: "CONFIRM_PAYMENT"`)
#### Request Payload
```json
{
  "mode": "CONFIRM_PAYMENT",
  "userNo": "U20261000001",
  "reqNo": "REQ202610210001",
  "selectedSlotList": [
    { "slotNo": "REQ202610210001-01", "bidNo": "BID2026102200001" },
    { "slotNo": "REQ202610210001-02", "bidNo": "BID2026102200002" }
  ],
  "couponNo": "CPN202610000001",
  "usePointAmt": 2000,
  "baseFeeAmt": 33000,
  "discountCouponAmt": 5000,
  "actualPaidAmt": 26000,
  "pgProviderCd": "TOSS",
  "pgTid": "toss_tid_202610230001"
}
```

#### Response Payload (200 OK)
```json
{
  "success": true,
  "contractNo": "CT2026102368719",
  "payNo": "PAY2026102368719",
  "actualPaidAmt": 26000,
  "safeTelNo": "0507-1793-3234",
  "message": "계약 체결 및 데이터 이용료 결제가 안전하게 완료되었습니다."
}
```

---

## 4. 프론트엔드 UI 컴포넌트 구성 명세

1. **상단 네비게이션 & 브레드크럼**:
   - `홈 > 견적 현황 > 수신 청약 목록 (USER-QOT-00) > 계약 확정 및 결제`.
   - `받은 청약 목록으로 돌아가기 (USER-QOT-00)` 뒤로가기 링크.
   - 서브헤더: `최종 계약 단계 (Final Escrow Stage)` 뱃지 + `256-bit SSL 보안 결제 · 에스크로 매칭 보증`.

2. **Left Column (8/12 컬럼)**:
   - **확정 서비스 내역 카드**:
     * 선택된 각 공정(정기청소, 에어컨 분해세척) 아이콘, 품목명, 입찰 제안금액, 파트너 정보(별점, 평점, 완료 건수).
     * 시공 주기, 투입 인력, 첫 방문 예정일시 안내 박스.
     * **현장 지불 실제 용역비 합계 알림 박스**: "본 화면에서 결제하는 금액은 플랫폼 시스템 매칭 및 데이터 이용료(라이선스)이며, 실제 용역비(320,000원)는 현장에서 기사님께 직접 정산됨"을 명확히 고지.
   - **프로모션 할인 및 포인트 사용 섹션**:
     * 청약 할인 쿠폰 드롭다운: 실시간 선택 시 할인액 즉시 반영.
     * 쓸고닦고 포인트 입력: 보유 3,000P 중 100P 단위 입력, [ 전액사용 ] 버튼 클릭 시 결제 상한 내 최대 가용 포인트 자동 세팅.
   - **결제 수단 선택 섹션**:
     * 3가지 결제 탭: `신용 / 체크카드`, `간편 결제(카카오/네이버/토스)`, `가상계좌(무통장)`.
     * 탭 전환 시 카드사 빠른 선택 그리드 또는 생체인증 간편결제사 선택 안내 인터랙티브 노출.
   - **필수 계약 및 결제 동의 약관**:
     * [ 약관 전체 동의하기 ] 일괄 체크박스.
     * 3대 필수 약관: ① 플랫폼 데이터 라이선스 성격 고지, ② 3개월 내 파트너 귀책 시 100% 무상 대체배차 안심보증, ③ 취소 환불/패널티 정책.
     * [ 전문보기 ] 버튼 클릭 시 상세 모달 팝업 제공.

3. **Right Column (4/12 컬럼) - Sticky Summary Card**:
   - **선택 공정 합계 용역비 (현장 결제분)**: `320,000원`
   - **기준 데이터 이용료**: `33,000원` (물음표 호버 시 산정 공식 툴팁 노출)
   - **쿠폰 할인**: `-5,000원` (실시간 변동)
   - **포인트 즉시 사용**: `-2,000 P` (실시간 변동)
   - **최종 실 결제 금액**: `26,000원` (Emerald Green 볼드 강조)
   - **[ 결제하고 계약 완료하기 ] CTA 버튼**: 필수 약관 미체크 시 비활성화, 0원일 경우 `0원 결제 승인 및 계약 완료하기` 자동 변경.
   - **신뢰 뱃지 3종**: 에스크로 안심 결제, 공정위 표준약관 준수, 고객센터 분쟁 중재 전담팀(1588-3024) 지원.

4. **결제 완료 후속 모달 (Success Modal)**:
   - 계약 번호(`CT20261023XXXXX`), 결제 번호(`PAY20261023XXXXX`), 가상 안심번호(`0507-XXXX-XXXX`) 및 카카오 알림톡 전송 안내.
   - [ 1:1 파트너 상담 채팅 ] 클릭 시 `USER-QOT-02` 화면으로 즉시 연결.
   - [ 계약/시공 내역 확인 ] 클릭 시 `USER-HIS-00` 화면으로 즉시 연결.

---

## 5. 브라우저 및 통합 검증 결과

1. **API 기능 및 트랜잭션 검증**:
   - `POST /api/user/user_cnt_00` (`GET_ORDER_SHEET`): 200 OK, 2개 슬롯 용역비 합계 320,000원, 기준 데이터 이용료 33,000원, 보유 쿠폰 및 3,000 포인트 정상 수신 확인.
   - `POST /api/user/user_cnt_00` (`CONFIRM_PAYMENT`): 200 OK, 트랜잭션 내 `TB_CLEAN_CONTRACT`, `TB_DATA_FEE_PAY`, `TB_USER_COUPON`, `TB_USER_POINT_LEDGER`, `TB_CLEAN_REQ_SLOT` 전 테이블 무결성 갱신 확인.
2. **UI 렌더링 검증**:
   - `http://localhost:3000/?v=new#contract-payment` 로컬 브라우저 렌더링 시 데스크톱 2컬럼 레이아웃, 서비스 카드, 할인 섹션, 결제수단 탭, 우측 요약 박스가 완벽히 렌더링됨.
3. **인터랙션 검증**:
   - [ 전액사용 ] 버튼 클릭 시 보유 3,000P 자동 입력 및 최종 실 결제액 즉시 계산 반영.
   - 3개 결제수단 탭 전환 시 각 세부 정보 패널 부드러운 전환.
   - 약관 전체 동의 및 개별 체크박스 양방향 동기화 정상 작동.
   - [ 전문보기 ] 클릭 시 약관 팝업 모달 정상 오픈 및 닫기 확인.
   - 결제 완료 시 축하 모달 팝업 및 발급된 0507 안심번호 표시 확인.
