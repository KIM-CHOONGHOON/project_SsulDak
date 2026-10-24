# [SsulDak (쓸고닦고)] USER-CNT-01 (결제 완료 및 파트너 대기) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-CNT-01` |
| **화면명** | 결제 완료 및 파트너 대기 (Payment Complete & Waiting for Partner Acceptance) |
| **지원 채널** | Web [Y] / App [Y] (데스크톱 1280px 2컬럼 레이아웃 / 모바일 390px 반응형 뷰) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 부모 화면** | [`USER-CNT-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-CNT-00) (계약 확정 및 결제) |
| **호출 대상 화면** | [`USER-HIS-01`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-01) (예약 상세 내역), [`USER-QOT-02`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-02) (1:1 파트너 상담 채팅), [`USER-COM-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-COM-00) (메인 홈 대시보드) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-CNT-01/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-CNT-01/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-CNT-01/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-CNT-01/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_CNT_01/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_CNT_01/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_cnt_01` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **사용 테이블** | `TB_DATA_FEE_PAY`, `TB_CLEAN_CONTRACT`, `TB_PARTNER` |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

### 핵심 아키텍처 및 코딩 규칙 준수
1. **물리적 격리**: 모든 소스코드는 `SsulDak_Web/User/` 폴더 하위에 완결 배치되어 타 도메인과의 교차 참조 및 공유를 엄격히 금지합니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/User/frontend/USER-CNT-01/index.jsx` (및 `index.tsx`)
   - 백엔드 라우터: `SsulDak_Web/User/backend/api_USER_CNT_01/route.ts`
   - 엔드포인트: `POST /api/user/user_cnt_01`
3. **독립 전용 SQL ID 적용**: 타 화면과 쿼리를 일체 공유하지 않고 `USER-CNT-01-SQL-001`, `USER-CNT-01-SQL-002` 고유 ID로 실행합니다.
4. **플랫폼 공식 브랜드 로고 준수**:
   - GNB 상단 바에 공식 브랜드 로고(`public/logo.png`)를 렌더링합니다.
5. **비즈니스 룰 및 결제 완료 상태 안내**:
   - **데이터 이용료 정의**: 본 결제 완료 화면은 플랫폼 데이터 이용료(예: 정상 33,000원 - 할인 7,000원 = 실 결제 승인액 26,000원) 납부 완료 영수증을 제공합니다.
   - **현장 직불 분리 안내**: 실제 청소 시공 용역비(예: 320,000원 또는 560,000원)는 "청소 완료 후 현장에서 파트너 기사님께 직접 정산(현금영수증 및 카드 가능)"임을 명확히 구분하여 안내합니다.
   - **파트너 후결제 및 대기 고지**: 파트너가 플랫폼 이용료를 후결제(수락)할 때까지 계약 상태는 'WAITING_PAY' 또는 'CONFIRMED(파트너대기)'로 관리되며 통상 1시간 이내 수락됨을 안내합니다.
   - **안심번호 및 채팅방 오픈 예고**: 파트너 후결제 완료 시 전용 0507 안심번호(`SAFE_TEL_NO`) 및 1:1 상담 채팅방(`USER-QOT-02`)이 즉시 활성화됨을 고지합니다.
   - **뒤로가기 방지**: 결제 완료 후 브라우저 뒤로가기 시 결제 화면(`USER-CNT-00`)으로 재진입하지 않도록 방지합니다.

---

## 2. 데이터베이스 명세 및 독립 전용 SQL ID

### 2.1 독립 전용 SQL 쿼리 ID 및 쿼리문

#### [USER-CNT-01-SQL-001] 이용자 결제 전자 영수증 및 승인 내역 조회
```sql
SELECT 
  p.PAY_NO AS payNo,
  p.CONTRACT_NO AS contractNo,
  p.BASE_FEE_AMT AS baseFeeAmt,
  p.DISCOUNT_COUPON_AMT AS discountCouponAmt,
  p.USED_POINT_AMT AS usedPointAmt,
  (p.DISCOUNT_COUPON_AMT + p.USED_POINT_AMT) AS totalDiscountAmt,
  p.ACTUAL_PAID_AMT AS actualPaidAmt,
  p.PG_PROVIDER_CD AS pgProviderCd,
  p.PG_TID AS pgTid,
  DATE_FORMAT(p.PAID_DT, '%Y.%m.%d %H:%i:%s') AS paidDt,
  p.PAY_STAT_CD AS payStatCd
FROM TB_DATA_FEE_PAY p
WHERE p.PAY_NO = ? AND p.PAYER_ID = ?;
```

#### [USER-CNT-01-SQL-002] 계약 마스터 및 파트너 현황 조회
```sql
SELECT 
  c.CONTRACT_NO AS contractNo,
  c.REQ_NO AS reqNo,
  c.SLOT_NO AS slotNo,
  c.SUB_ITEM_NM AS subItemNm,
  c.TOTAL_PAY_AMT AS totalServiceAmt,
  c.CONTRACT_STAT_CD AS contractStatCd,
  c.PTNR_FEE_PAID_YN AS ptnrFeePaidYn,
  DATE_FORMAT(c.SERVICE_START_DT, '%Y.%m.%d (%a) %H:%i') AS serviceStartDt,
  pt.COMPANY_NM AS partnerCompanyNm,
  pt.CEO_NM AS partnerCeoNm,
  COALESCE(pt.AVG_RATING, 5.0) AS avgRating,
  COALESCE(pt.REVIEW_CNT, 48) AS reviewCnt
FROM TB_CLEAN_CONTRACT c
INNER JOIN TB_PARTNER pt ON c.PTNR_NO = pt.PTNR_NO
WHERE (c.CONTRACT_NO = ? OR c.REQ_NO = ?) AND c.USER_NO = ?;
```

---

## 3. 백엔드 서비스 엔진 및 비즈니스 처리 로직

### 3.1 요청/응답 명세
- **HTTP 엔드포인트**: `POST /api/user/user_cnt_01`
- **Request Body (JSON)**:
```json
{
  "actionType": "GET_PAY_RECEIPT",
  "userNo": "U20261000001",
  "contractNo": "CT2026102100001",
  "payNo": "PAY2026102100001"
}
```
- **Response Body (HTTP 200 OK)**:
```json
{
  "success": true,
  "receipt": {
    "orderNo": "CNT-20261021-0001",
    "contractNo": "CT2026102100001",
    "payNo": "PAY2026102100001",
    "baseFeeAmt": 33000,
    "discountCouponAmt": 5000,
    "usedPointAmt": 2000,
    "totalDiscountAmt": 7000,
    "actualPaidAmt": 26000,
    "totalServiceAmt": 560000,
    "pgProviderCd": "신용카드 (현대카드 일시불)",
    "pgTid": "APPR-9482104",
    "paidDt": "2026.10.21 14:32:05",
    "payStatCd": "COMPLETED"
  },
  "services": [
    {
      "contractNo": "CT2026102200001",
      "reqNo": "REQ202610210001",
      "slotNo": "REQ202610210001-01",
      "subItemNm": "정기청소 3개월 (월 4회)",
      "totalServiceAmt": 240000,
      "contractStatCd": "CONFIRMED",
      "ptnrFeePaidYn": "Y",
      "serviceStartDt": "2026.11.01 (Sun) 09:00",
      "partnerCompanyNm": "반짝빌라클린",
      "partnerCeoNm": "홍길동",
      "avgRating": 5,
      "reviewCnt": 48
    }
  ],
  "partnerInfo": {
    "companyNm": "반짝빌라클린",
    "ptnrFeePaidYn": "Y",
    "guideMsg": "파트너가 데이터 이용료를 납부(통상 1시간 이내)하면 0507 안심번호와 1:1 상담 채팅방(USER-QOT-02)이 즉시 열립니다."
  }
}
```

---

## 4. 프론트엔드 UI & 인터랙션 요구사항

1. **상단 GNB 헤더**:
   - 공식 로고 (`/logo.png`) 및 브랜드명 `쓸고닦고`.
   - 지역 셀렉터: `경기 고양시 일산동구`.
   - 네비게이션: `홈`, `견적현황` (Active: `#163b66`), `이용내역`, `쿠폰북`, `마이`.
   - 유틸리티: 장바구니, 알림 뱃지, 마이페이지 프로필 아바타.
2. **성공 히어로 배너 (Hero Completion Banner)**:
   - 후광 앰비언트 글로우 블러 효과 (`bg-secondary-fixed/30`, `bg-primary-fixed/40`).
   - 체크마크 뱃지: 펄스 링 애니메이션과 진한 에메랄드 원형 체크 아이콘.
   - 타이틀: "데이터 이용료 결제가 안전하게 완료되었습니다!"
   - 서브텍스트: "선택하신 전문 파트너에게 배차 확정(후결제) 승인 요청이 실시간으로 전달되었습니다."
   - 메타데이터 리본: `● 결제 승인 완료 • 2026.10.21 14:32:05 • 승인번호 APPR-9482104`.
3. **3단계 실시간 매칭 트래커 (3-Step Realtime Process Tracker)**:
   - **Step 1: 이용료 결제 (완료)** - 에스크로 안전 완료.
   - **Step 2: 파트너 수락 대기중 (진행중 / 강조)** - 통상 1시간 내 수락, 핑 애니메이션 라이브 인디케이터, 스케줄 검토 및 기사 자동 배정.
   - **Step 3: 1:1 채팅 & 현장 시공 (대기)** - 0507 안심번호 활성화 대기.
4. **좌측 상세 안내 컬럼 (~60%)**:
   - **진행 안내 카드**: 파트너 수락 시 0507 안심번호 및 1:1 상담 채팅방(`USER-QOT-02`) 즉시 활성화 + 카카오 알림톡 표준 전자계약서 사본 발송 안내.
   - **매칭 확정 공정 및 파트너 정보 카드**: 정기 빌라케어, 가전 분해살균 등 공정별 파트너명, 대표자명, 평점, 리뷰수, 시공 예정 일시.
   - **쓸고닦고 100% 안심 매칭 보증제 배너**: 1시간 내 미수락 시 100% 즉시 자동 환불 및 최고 등급 대체 파트너 우선 배차 보증.
5. **우측 디지털 전자 영수증 컬럼 (~40%)**:
   - **주문/계약번호 복사 기능**: `CNT-20261021-0001` 옆 복사 버튼 클릭 시 클립보드 복사 및 플로팅 토스트 피드백 표시.
   - **전자 영수증 인쇄/발송**: `window.print()` 호출.
   - **과금 세부 내역**: 정상 데이터 이용료(33,000원), 프로모션 할인(-7,000원: 쿠폰 -5,000원 + 포인트 -2,000P), 실 결제 승인액(26,000원 VAT 포함).
   - **현장 직불 청소 시공비 고지**: 현장에서 기사님께 직접 정산하는 시공비 분리 고지.
   - **액션 버튼 그룹**:
     - `예약 상세 내역 보기 (USER-HIS-01)` -> [`USER-HIS-01`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-01)로 라우팅.
     - `파트너 1:1 상담 채팅 바로가기` -> [`USER-QOT-02`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-02)로 라우팅.
     - `메인 홈으로 이동 (USER-COM-00)` -> [`USER-COM-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-COM-00)으로 라우팅.
   - **고객만족센터 문의 라인**: `1588-0000` (평일 09:00~18:00).
6. **하단 푸터**:
   - 사업자 정보, 고객센터 안내, 책임배상보험 10억원 가입 및 에스크로 안전결제 적용 안내.

---

## 5. 검증 및 테스트 결과

| 번호 | 테스트 항목 | 결과 | 비고 |
| :---: | :--- | :---: | :--- |
| 1 | `USER-CNT-01/index.jsx` 및 `index.tsx` 물리적 격리 및 1:1 매핑 | PASS | `SsulDak_Web/User/frontend/USER-CNT-01/` 내 완결 |
| 2 | `api_USER_CNT_01/route.ts` 전용 라우터 및 전용 SQL ID 실행 | PASS | `USER-CNT-01-SQL-001`, `USER-CNT-01-SQL-002` 검증 완료 |
| 3 | API 엔드포인트 `POST /api/user/user_cnt_01` HTTP 200 응답 | PASS | `curl` 테스트 결과 정상 영수증 및 서비스 목록 반환 |
| 4 | 브라우저 UI 렌더링 및 브랜드 디자인 토큰 적용 | PASS | 네이비 테마, 에메랄드 상태 뱃지, 영수증 디자인 완벽 반영 |
| 5 | 클립보드 복사 인터랙션 및 토스트 알림 | PASS | 주문번호 복사 시 상단 알림 토스트 정상 팝업 |
| 6 | 부모 화면 `USER-CNT-00` 결제 완료 시 모달에서 직통 라우팅 지원 | PASS | `USER-CNT-00` 결제 완료 모달에서 `USER-CNT-01` 바로가기 지원 |
| 7 | 대상 화면 `USER-HIS-01`, `USER-QOT-02`, `USER-COM-00` 연계 | PASS | 하단 액션 버튼 그룹 라우팅 확인 |
