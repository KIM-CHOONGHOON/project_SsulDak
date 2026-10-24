# [SsulDak (쓸고닦고)] USER-HIS-00 (청소 이용 내역) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-HIS-00` |
| **화면명** | 청소 이용 내역 (Cleaning Service History & Care Dashboard) |
| **지원 채널** | Web [Y] / App [Y] (데스크톱 1280px~1440px 2컬럼 레이아웃 / 모바일 390px 4대 탭 반응형 뷰) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 부모 화면** | [`USER-COM-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-COM-00) (홈), [`USER-CNT-01`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-CNT-01) (결제 완료) |
| **호출 대상 화면** | [`USER-HIS-01`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-01) (계약 상세 및 시공 사진 검수), [`USER-QOT-02`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-02) (파트너 1:1 상담 채팅), [`USER-REQ-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-00) (새로운 청소 견적 신청) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-HIS-00/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-00/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-HIS-00/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-00/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_HIS_00/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_HIS_00/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_his_00` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **사용 테이블** | `TB_CLEAN_CONTRACT`, `TB_CLEAN_REQ`, `TB_PARTNER`, `TB_CLEAN_WORK_LOG`, `TB_CLEAN_REVIEW`, `TB_USER_COUPON`, `TB_USER_POINT_LEDGER` |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

### 핵심 아키텍처 및 코딩 규칙 준수
1. **물리적 격리**: 모든 소스코드는 `SsulDak_Web/User/` 폴더 하위에 완결 배치되어 타 도메인과의 교차 참조 및 컴포넌트 공유를 엄격히 금지합니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/User/frontend/USER-HIS-00/index.jsx` (및 `index.tsx`)
   - 백엔드 라우터: `SsulDak_Web/User/backend/api_USER_HIS_00/route.ts`
   - 엔드포인트: `POST /api/user/user_his_00`
3. **독립 전용 SQL ID 적용**: 타 화면과 쿼리를 일체 공유하지 않고 `USER-HIS-00-SQL-001`부터 `USER-HIS-00-SQL-004`까지 고유 ID로 실행합니다.
4. **계약 상태별 탭 분리 및 뱃지 정책**:
   - **진행 중인 청소 (탭 1: 'ACTIVE')**:
     * `'WAITING_PAY'`: [파트너 결제 대기 중] (Orange Badge) -> 채팅/검수 버튼 비활성화, 파트너 입금 안내
     * `'CONFIRMED'`: [배차 완료 · 1회차 대기] (Green Badge) -> [ 1:1 상담 채팅 ], [ 진행 상세 · 사진 검수 (USER-HIS-01) ] 활성화
     * `'IN_PROGRESS'`: [시공 진행 중 ({round}회차)] (Blue Badge) -> [ 시공 사진 검수 ] 활성화
   - **지난 청소 내역 (탭 2: 'PAST')**:
     * `'COMPLETED'`: [최종 완료] (Gray Badge) -> [ 포토리뷰 작성하고 1,000P 받기 (USER-HIS-02) ] 활성화
     * `'CANCELLED'`: [계약 취소/종료] (Red/Muted Badge)
5. **플랫폼 공식 브랜드 로고 및 디자인 시스템**:
   - GNB 상단 바에 공식 브랜드 로고(`public/logo.png`)를 렌더링.
   - 활성 탭에 브랜드 대표 네이비(`#1F497D`)와 민트 포인트(`secondary: #006c4a`, `secondary-container: #82f5c1`)를 조화롭게 적용.

---

## 2. 데이터베이스 명세 및 독립 전용 SQL ID

### 2.1 테이블 구조

#### 1) `TB_CLEAN_CONTRACT` (체결 계약 마스터)
- `CONTRACT_NO` (계약 고유번호, CHAR(16), PK)
- `REQ_NO` (신청서 번호, CHAR(16))
- `SLOT_NO` (슬롯 번호, CHAR(19))
- `USER_NO` (이용자 ID, CHAR(12))
- `PTNR_NO` (파트너 ID, CHAR(12))
- `SERVICE_TYPE_CD` (대분류: 'REGULAR', 'APPLIANCE', 'MOVEIN')
- `SUB_ITEM_NM` (품목명, 예: "정기청소 3개월", "가전케어 에어컨")
- `CONTRACT_STAT_CD` (계약 상태: 'WAITING_PAY', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
- `PTNR_FEE_PAID_YN` (파트너 데이터 이용료 납부 여부, CHAR(1))
- `SERVICE_START_DT` (첫 방문 예정일시, DATETIME)
- `TOTAL_PAY_AMT` (현장 지불 용역비, INT)
- `SAFE_TEL_NO` (안심번호, VARCHAR(20))
- `REG_DT` (계약 체결 일시)

#### 2) `TB_CLEAN_WORK_LOG` (시공 회차 진행 이력 원장)
```sql
CREATE TABLE IF NOT EXISTS TB_CLEAN_WORK_LOG (
  WORK_SEQ BIGINT AUTO_INCREMENT PRIMARY KEY,
  CONTRACT_NO VARCHAR(50) NOT NULL,
  ROUND_NO INT NOT NULL DEFAULT 1,
  WORK_STAT_CD VARCHAR(20) NOT NULL DEFAULT 'COMPLETED',
  WORK_DT DATETIME DEFAULT CURRENT_TIMESTAMP,
  REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX IX_WORK_LOG_CONTRACT (CONTRACT_NO, WORK_STAT_CD)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
```

#### 3) `TB_CLEAN_REVIEW` (고객 시공 리뷰 원장)
- `REVIEW_SEQ` (PK, BIGINT AUTO_INCREMENT)
- `PTNR_NO` (파트너 ID)
- `USER_NO` (이용자 ID)
- `CONTRACT_NO` (계약 고유번호)
- `RATING` (별점)
- `CONTENT` (리뷰 내용)
- `CLEAN_TYPE_NM` (청소 구분)
- `REG_DT` (등록 일시)

---

### 2.2 독립 전용 SQL 쿼리 ID 및 쿼리문

#### [USER-HIS-00-SQL-001] 탭별 카운트 조회 (진행 중 / 지난 내역)
```sql
SELECT 
  COUNT(CASE WHEN CONTRACT_STAT_CD IN ('WAITING_PAY', 'CONFIRMED', 'IN_PROGRESS') THEN 1 END) AS activeCnt,
  COUNT(CASE WHEN CONTRACT_STAT_CD IN ('COMPLETED', 'CANCELLED') THEN 1 END) AS pastCnt
FROM TB_CLEAN_CONTRACT
WHERE USER_NO = ?;
```

#### [USER-HIS-00-SQL-002] 진행 중인 청소 목록 조회 (ACTIVE 탭)
```sql
SELECT 
  c.CONTRACT_NO AS contractNo,
  c.REQ_NO AS reqNo,
  c.SLOT_NO AS slotNo,
  c.SERVICE_TYPE_CD AS serviceTypeCd,
  c.SUB_ITEM_NM AS subItemNm,
  c.CONTRACT_STAT_CD AS contractStatCd,
  c.PTNR_FEE_PAID_YN AS ptnrFeePaidYn,
  c.SERVICE_START_DT AS serviceStartDt,
  DATE_FORMAT(c.SERVICE_START_DT, '%Y.%m.%d (%a) %H:%i') AS serviceStartFormatted,
  c.TOTAL_PAY_AMT AS totalPayAmt,
  c.SAFE_TEL_NO AS safeTelNo,
  COALESCE(r.ADDR_ROAD, '경기 고양시 일산동구 중앙로 빌라 단지') AS addrRoad,
  COALESCE(r.ADDR_DETAIL, '정문 현관 앞 비밀번호 사전 공유 완료') AS addrDetail,
  p.PTNR_NO AS ptnrNo,
  p.COMPANY_NM AS companyNm,
  p.CEO_NM AS ceoNm,
  COALESCE(p.PROFILE_IMG_URL, '/partner_default.png') AS profileImgUrl,
  COALESCE(p.AVG_RATING, 5.0) AS avgRating,
  COALESCE((SELECT COUNT(*) FROM TB_CLEAN_REVIEW rv WHERE rv.PTNR_NO = p.PTNR_NO), 184) AS reviewCnt,
  COALESCE((SELECT MAX(ROUND_NO) FROM TB_CLEAN_WORK_LOG w WHERE w.CONTRACT_NO = c.CONTRACT_NO AND w.WORK_STAT_CD IN ('COMPLETED', 'VERIFIED')), 0) AS completedRound
FROM TB_CLEAN_CONTRACT c
LEFT JOIN TB_CLEAN_REQ r ON c.REQ_NO = r.REQ_NO
INNER JOIN TB_PARTNER p ON c.PTNR_NO = p.PTNR_NO
WHERE c.USER_NO = ? 
  AND c.CONTRACT_STAT_CD IN ('WAITING_PAY', 'CONFIRMED', 'IN_PROGRESS')
ORDER BY c.REG_DT DESC
LIMIT ? OFFSET ?;
```

#### [USER-HIS-00-SQL-003] 지난 청소 내역 목록 조회 (PAST 탭)
```sql
SELECT 
  c.CONTRACT_NO AS contractNo,
  c.REQ_NO AS reqNo,
  c.SLOT_NO AS slotNo,
  c.SERVICE_TYPE_CD AS serviceTypeCd,
  c.SUB_ITEM_NM AS subItemNm,
  c.CONTRACT_STAT_CD AS contractStatCd,
  c.TOTAL_PAY_AMT AS totalPayAmt,
  DATE_FORMAT(c.REG_DT, '%Y.%m.%d') AS contractDt,
  c.SERVICE_START_DT AS serviceStartDt,
  DATE_FORMAT(c.SERVICE_START_DT, '%Y.%m.%d (%a) %H:%i') AS serviceStartFormatted,
  COALESCE(r.ADDR_ROAD, '경기 고양시 일산동구 중앙로 빌라 단지') AS addrRoad,
  COALESCE(r.ADDR_DETAIL, '정문 현관 앞') AS addrDetail,
  p.PTNR_NO AS ptnrNo,
  p.COMPANY_NM AS companyNm,
  p.CEO_NM AS ceoNm,
  COALESCE(p.PROFILE_IMG_URL, '/partner_default.png') AS profileImgUrl,
  COALESCE(p.AVG_RATING, 5.0) AS avgRating,
  COALESCE((SELECT COUNT(*) FROM TB_CLEAN_REVIEW rv WHERE rv.PTNR_NO = p.PTNR_NO), 184) AS reviewCnt,
  (SELECT COUNT(*) FROM TB_CLEAN_REVIEW rv WHERE rv.CONTRACT_NO = c.CONTRACT_NO AND rv.USER_NO = ?) AS reviewWrittenCnt
FROM TB_CLEAN_CONTRACT c
LEFT JOIN TB_CLEAN_REQ r ON c.REQ_NO = r.REQ_NO
INNER JOIN TB_PARTNER p ON c.PTNR_NO = p.PTNR_NO
WHERE c.USER_NO = ? 
  AND c.CONTRACT_STAT_CD IN ('COMPLETED', 'CANCELLED')
ORDER BY c.REG_DT DESC
LIMIT ? OFFSET ?;
```

#### [USER-HIS-00-SQL-004] 사용자 보유 혜택 요약 조회 (쿠폰 수, 포인트 잔액)
```sql
SELECT 
  (SELECT COUNT(*) FROM TB_USER_COUPON WHERE USER_NO = ? AND COUPON_STAT_CD = 'AVAILABLE' AND EXPIRE_DT >= NOW()) AS couponCnt,
  (SELECT COALESCE(BALANCE_AMT, 0) FROM TB_USER_POINT_LEDGER WHERE USER_NO = ? ORDER BY POINT_SEQ DESC LIMIT 1) AS pointBalance;
```

---

## 3. 백엔드 서비스 엔진 및 비즈니스 처리 로직

### 3.1 요청/응답 명세
- **HTTP 엔드포인트**: `POST /api/user/user_his_00`
- **Request Header**:
  ```http
  Content-Type: application/json
  Authorization: Bearer {USER_JWT_TOKEN}
  ```
- **Request Body (JSON)**:
  ```json
  {
    "userNo": "U20261000001",
    "tabType": "ACTIVE",
    "periodFilter": "최근 3개월",
    "serviceFilter": "ALL",
    "page": 1,
    "limit": 20
  }
  ```
- **Response Body (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "tabType": "ACTIVE",
    "counts": {
      "active": 2,
      "past": 1
    },
    "benefits": {
      "couponCnt": 2,
      "pointBalance": 11000
    },
    "page": 1,
    "limit": 20,
    "contracts": [
      {
        "contractNo": "CT2026102368719",
        "reqNo": "REQ202610210001",
        "slotNo": "REQ202610210001-01",
        "serviceTypeCd": "REGULAR",
        "serviceTypeNm": "정기청소",
        "subItemNm": "정기청소 (3개월/주 1회)",
        "contractStatCd": "CONFIRMED",
        "badgeType": "CONFIRMED",
        "badgeText": "배차 완료 · 1회차 대기",
        "badgeColor": "green",
        "ptnrFeePaidYn": "Y",
        "serviceStartDt": "2026-10-31T18:45:17.000Z",
        "serviceStartFormatted": "2026.11.01 (Sun) 03:45",
        "totalPayAmt": 240000,
        "safeTelNo": "0507-1793-3234",
        "addrRoad": "경기 고양시 일산동구 중앙로 1234",
        "addrDetail": "지상 4층 빌라 (엘리베이터 없음)",
        "ptnrNo": "P20260900012",
        "companyNm": "반짝빌라클린",
        "ceoNm": "홍길동",
        "profileImgUrl": "https://lh3.googleusercontent.com/...",
        "avgRating": 5,
        "reviewCnt": 48,
        "completedRound": 0,
        "canChat": true,
        "canInspect": true,
        "canReview": false
      },
      {
        "contractNo": "CT2026102368720",
        "reqNo": "REQ202610210001",
        "slotNo": "REQ202610210001-02",
        "serviceTypeCd": "APPLIANCE",
        "serviceTypeNm": "가전케어",
        "subItemNm": "가전케어 (LG 스탠드 에어컨)",
        "contractStatCd": "WAITING_PAY",
        "badgeType": "WAITING_PAY",
        "badgeText": "파트너 결제 대기 중",
        "badgeColor": "orange",
        "ptnrFeePaidYn": "N",
        "serviceStartDt": "2026-10-31T18:45:17.000Z",
        "serviceStartFormatted": "2026.11.01 (Sun) 03:45",
        "totalPayAmt": 80000,
        "safeTelNo": "0507-1793-3234",
        "addrRoad": "경기 고양시 일산동구 중앙로 1234",
        "addrDetail": "지상 4층 빌라 (엘리베이터 없음)",
        "ptnrNo": "P20260900035",
        "companyNm": "홈케어마스터",
        "ceoNm": null,
        "profileImgUrl": "https://lh3.googleusercontent.com/...",
        "avgRating": 4.9,
        "reviewCnt": 112,
        "completedRound": 0,
        "canChat": false,
        "canInspect": false,
        "canReview": false
      }
    ],
    "syncedAt": "16:56"
  }
  ```

---

## 4. 프론트엔드 UI/UX 인터랙션 구현 명세

### 4.1 화면 레이아웃 구성
1. **GNB 헤더 (Top Fixed Header)**:
   - 좌측: 공식 브랜드 로고(`logo.png`) 및 "SsulDak 쓸고닦고 케어", 관할 지역 선택 뱃지("경기 고양시 일산동구").
   - 중앙: 내비게이션 탭 (홈, 견적현황, 이용내역 [Active: 브랜드 네이비 `#1F497D`], 쿠폰북, 마이).
   - 우측: 장바구니/보관함(초록 인디케이터), 알림(빨간 점 인디케이터), 프로필 아바타.
2. **상단 브레드크럼 & 실시간 동기화/새로고침 바**:
   - 브레드크럼: 홈 / 이용내역 / **청소 이용 내역**.
   - 우측: 동기화 완료 시간 뱃지(`동기화 완료 HH:mm 기준` + 초록 펄스 점) + **[새로고침]** 버튼(클릭 시 회전 스핀 애니메이션 및 실시간 재동기화 토스트 팝업).
3. **세그먼트 탭 & 필터 드롭다운 바**:
   - 세그먼트 탭: **[ 진행 중인 청소 ({activeCnt}) ]** vs **[ 지난 청소 완료 내역 ({pastCnt}) ]**.
   - 필터 드롭다운: 기간 필터(최근 3개월, 최근 6개월, 2026년 전체), 서비스 필터(전체 서비스, 정기청소, 가전케어, 이사/입주청소).
4. **계약 카드 리스트 (좌측 8열)**:
   - **배차 완료 건 (정기청소)**:
     * 녹색 펄스 뱃지: `배차 완료 · 1회차 대기`
     * 계약 상세: 서비스명, 파트너 프로필(별점 5.0, 리뷰수), 시공 대상지, 다음 방문 예정일(1회차 첫 방문)
     * 금액 분리: 데이터 이용료 26,000원 결제완료 vs 현장 직불 시공비 월 240,000원
     * 액션 버튼: **[ 1:1 상담 채팅 ]** (보조) + **[ 진행 상세 · 사진 검수 (USER-HIS-01) > ]** (메인 네이비)
     * 하단 스트립: 100% 무상 재시공 보증제 적용 안내
   - **파트너 결제 대기 건 (가전케어)**:
     * 주황 핑 뱃지: `파트너 결제 대기 중`
     * 안내 박스: 파트너 데이터 이용료 입금 절차 진행 중 고지 (1시간 이내 완료 시 채팅 활성화)
     * 액션 버튼: 1:1 상담 채팅 잠금(대기 중 툴팁) + **[ 예약 정보 상세 (USER-CNT-01) > ]**
   - **지난 청소 내역 건 (PAST 탭)**:
     * 회색 뱃지: `최종 완료`
     * 액션 버튼: **[ 시공 완료 리포트 보기 ]** + **[ 포토리뷰 작성하고 1,000P 받기 (USER-HIS-02) ]** (에메랄드 그린)
5. **사이드바 요약 패널 (우측 4열)**:
   - **내 케어 요약**: 진행 중인 시공 건수, 검수 대기 리포트, 보유 쿠폰 및 잔여 포인트, **[ 새로운 청소 견적 신청 (USER-REQ-00) ]** 메인 CTA 버튼.
   - **SsulDak 안심 보증 3원칙**:
     * 1. 시공 후 7일 이내 100% 무상 AS
     * 2. 시공 전/후 사진 필수 승인제
     * 3. 현대해상 10억원 영업배상책임
   - **고객 케어 지원**: 대표번호 1588-0000, 실시간 접수 가능 뱃지, 카카오톡 1:1 상담 연결 버튼.
6. **하단 모바일 바텀 네비게이션 (390px 뷰)**:
   - [ 홈 (USER-COM-00) ]
   - [ 견적현황 (USER-QOT-00) ]
   - [ 이용내역 (USER-HIS-00) (Active Navy) ]
   - [ 마이 (USER-ATH-03) ]
7. **공식 푸터**: 사업자 정보, 안심 케어 보증 & 금융 보안, 에스크로 안내, 약관 링크 완비.

---

## 5. 단위 및 통합 테스트 검증 결과

### 5.1 데이터베이스 및 백엔드 트랜잭션 검증
- **테이블 생성**: `TB_CLEAN_WORK_LOG` 생성 완료 및 `TB_CLEAN_REVIEW`에 `CONTRACT_NO` 컬럼 확인/보강.
- **REST API 엔드포인트 curl 테스트**:
  - `POST /api/user/user_his_00` 호출 시 HTTP 200 OK 및 기대 JSON 필드 반환 완료 (`active: 3`, `past: 1`).

### 5.2 브라우저 화면 렌더링 및 인터랙션 검증
- **검증 환경**: Next.js App Router / React 19 / Tailwind CSS
- **URL**: `http://localhost:3000/?v=20261023_his00_v1#history`
- **테스트 결과**:
  1. GNB 헤더 브랜드 로고 및 `이용내역` 활성 탭 네이비(`#1F497D`) 정상 적용.
  2. 세그먼트 탭 `진행 중인 청소`와 `지난 청소 완료 내역` 간 실시간 전환 및 데이터 리로드 확인.
  3. `새로고침` 버튼 클릭 시 아이콘 회전 스핀 애니메이션 및 상단 플로팅 토스트("최신 시공 및 배차 현황이 동기화되었습니다.") 정상 팝업.
  4. `PAST` 탭에서 `[ 포토리뷰 작성하고 1,000P 받기 (USER-HIS-02) ]` 클릭 시 포인트 적립 안내 토스트 정상 동작.
  5. 배차 완료 건에서 `[ 진행 상세 · 사진 검수 (USER-HIS-01) ]` 및 `[ 1:1 상담 채팅 ]` 라우팅 연동 확인.
  6. 파트너 결제 대기 건에서 비활성화 잠금 툴팁 및 `USER-CNT-01` 이동 분기 확인.
