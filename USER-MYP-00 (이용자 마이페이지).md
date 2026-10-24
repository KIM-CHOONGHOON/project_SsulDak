# [SsulDak (쓸고닦고)] USER-MYP-00 (이용자 마이페이지) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-MYP-00` |
| **화면명** | 이용자 마이페이지 (Customer My Page Dashboard & Signature Management) |
| **지원 채널** | Web [Y] / App [Y] (데스크톱 1280px~1440px 12컬럼 그리드 분할: 8컬럼 프로필 및 서비스 관리 / 4컬럼 스티키 안심보증 및 고객센터 사이드바, 모바일 390px 반응형 뷰) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 부모 화면** | [`USER-COM-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-COM-00) (메인 홈), 상단 글로벌 헤더 '마이' 메뉴 |
| **호출 대상 화면** | [`USER-MYP-01`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-ATH-03) (회원정보 수정), [`USER-MYP-02`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-ATH-03) (쿠폰함), [`USER-HIS-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-00) (청소 이용 내역), [`USER-COM-01`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-COM-00) (공지사항 및 품질보증) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-MYP-00/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-MYP-00/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-MYP-00/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-MYP-00/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_MYP_00/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_MYP_00/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_myp_00` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **사용 테이블** | `TB_USER`, `TB_USER_COUPON`, `TB_USER_POINT_LEDGER`, `TB_CLEAN_CONTRACT` |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

---

### 핵심 아키텍처 및 비즈니스 규정 준수
1. **물리적 격리**: 모든 소스코드는 `SsulDak_Web/User/` 폴더 하위에 프론트엔드와 백엔드가 완결 배치되어 있으며, 타 도메인과의 컴포넌트 공유를 엄격히 배제합니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/User/frontend/USER-MYP-00/index.jsx` & `index.tsx`
   - 백엔드 라우터: `SsulDak_Web/User/backend/api_USER_MYP_00/route.ts`
   - 엔드포인트 URL: `POST /api/user/user_myp_00`
3. **독립 전용 SQL ID 적용**: 타 화면과 쿼리를 일체 공유하지 않고 `USER-MYP-00-SQL-001`부터 `USER-MYP-00-SQL-004`까지 전용 SQL로 완결 실행합니다.
4. **패널티 및 제재 상태 D-Day 동적 판정 & Self-Healing**:
   - `USER_STAT_CD == 'NORMAL'`: [정상 회원 (신뢰도 100%)] (Green Badge).
   - `USER_STAT_CD == 'SUSPENDED_7D'`:
     * `CEIL(TIMESTAMPDIFF(HOUR, NOW(), SUSPEND_EXPIRE_DT) / 24.0)` 연산하여 `[D-{N} 정지 회원]` (Coral Red Badge) 뱃지 출력.
     * 클릭 또는 툴팁 시: "선취소 패널티로 인해 {SUSPEND_EXPIRE_DT}까지 신규 견적 신청이 제한됩니다." 안내.
     * 만료일시가 경과되었을 경우 백엔드에서 `USER-MYP-00-SQL-001`을 통해 즉시 `NORMAL`로 자동 갱신(Self-Healing).
5. **개인정보 마스킹**:
   - 전화번호 가운데 4자리 마스킹 (예: `010-****-1234`).
6. **자필 전자서명 관리 및 실시간 재등록**:
   - 등록된 서명 미리보기 모달(Signature Preview Modal)을 통해 암호화 서명 확인.
   - HTML5 Canvas 기반의 자필 서명 패드를 통해 마우스/터치로 실시간 서명 후 `UPDATE_SIGNATURE` 액션으로 DB 반영.

---

## 2. 데이터베이스 명세 및 독립 전용 SQL ID

### 2.1 독립 전용 SQL 쿼리 매핑 목록

| SQL ID | 설명 | 대상 테이블 | 작업 유형 |
| :--- | :--- | :--- | :--- |
| `USER-MYP-00-SQL-001` | 정지 만료일 경과 회원 NORMAL 자동 복구 (Self-Healing) | `TB_USER` | `UPDATE` |
| `USER-MYP-00-SQL-002` | 이용자 프로필 및 패널티/D-Day 정보 조회 | `TB_USER` | `SELECT` |
| `USER-MYP-00-SQL-003` | 사용 가능한 유효 쿠폰 수 조회 | `TB_USER_COUPON` | `SELECT` |
| `USER-MYP-00-SQL-004` | 최신 누적 리워드 포인트 잔액 조회 | `TB_USER_POINT_LEDGER` | `SELECT` |

### 2.2 독립 전용 SQL 상세 쿼리문

```sql
-- [USER-MYP-00-SQL-001] 정지 만료일 경과 회원 NORMAL 자동 복구 (Self-Healing)
UPDATE TB_USER
SET 
  USER_STAT_CD = 'NORMAL',
  SUSPEND_EXPIRE_DT = NULL,
  MOD_DT = NOW(),
  MOD_ID = 'SYSTEM'
WHERE USER_NO = ? 
  AND USER_STAT_CD = 'SUSPENDED_7D' 
  AND SUSPEND_EXPIRE_DT <= NOW();

-- [USER-MYP-00-SQL-002] 이용자 프로필 및 패널티/D-Day 정보 조회
SELECT 
  USER_NO AS userNo,
  USER_NM AS userNm,
  USER_EMAIL AS userEmail,
  USER_TEL AS userTel,
  USER_STAT_CD AS userStatCd,
  SUSPEND_EXPIRE_DT AS suspendExpireDt,
  SIGN_IMG_URL AS signImgUrl,
  CASE 
    WHEN USER_STAT_CD = 'SUSPENDED_7D' AND SUSPEND_EXPIRE_DT > NOW() 
    THEN CEIL(TIMESTAMPDIFF(HOUR, NOW(), SUSPEND_EXPIRE_DT) / 24.0)
    ELSE 0 
  END AS penaltyDaysRemaining
FROM TB_USER
WHERE USER_NO = ?;

-- [USER-MYP-00-SQL-003] 사용 가능한 유효 쿠폰 수 조회
SELECT COUNT(*) AS availableCouponCnt
FROM TB_USER_COUPON
WHERE USER_NO = ? AND COUPON_STAT_CD = 'AVAILABLE' AND EXPIRE_DT >= NOW();

-- [USER-MYP-00-SQL-004] 최신 누적 리워드 포인트 잔액 조회
SELECT COALESCE(BALANCE_AMT, 0) AS pointBalance
FROM TB_USER_POINT_LEDGER
WHERE USER_NO = ?
ORDER BY POINT_SEQ DESC
LIMIT 1;
```

---

## 3. 백엔드 서비스 명세 (`POST /api/user/user_myp_00`)

### 3.1 요청 규격 (Request Body)

#### A. 대시보드 데이터 조회 (`GET_MYPAGE_DASHBOARD`)
```json
{
  "actionType": "GET_MYPAGE_DASHBOARD",
  "userNo": "U20261000001"
}
```

#### B. 자필 전자서명 재등록 (`UPDATE_SIGNATURE`)
```json
{
  "actionType": "UPDATE_SIGNATURE",
  "userNo": "U20261000001",
  "signDataUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### 3.2 응답 규격 (Response Body)

#### 성공 응답 (`HTTP 200 OK`)
```json
{
  "success": true,
  "profile": {
    "userNo": "U20261000001",
    "userNm": "김충훈",
    "userEmail": "chunghoon.kim@ssuldak.com",
    "maskedTel": "010-****-1234",
    "userStatCd": "NORMAL",
    "penaltyBadge": {
      "status": "NORMAL",
      "label": "정상 회원 (신뢰도 100%)",
      "daysRemaining": 0,
      "expireDt": null
    },
    "hasSignature": true,
    "signImgUrl": "data:image/png;base64,...",
    "accountDisplayId": "UD-00001",
    "membershipGrade": "VIP 케어 멤버십"
  },
  "benefits": {
    "couponCount": 2,
    "pointBalance": 14000,
    "ongoingContractCount": 4,
    "completedContractCount": 1
  }
}
```

---

## 4. 프론트엔드 UI & 인터랙션 구현 세부사항

1. **상단 글로벌 네비게이션 헤더 (Header)**:
   - SsulDak 로고, 지역 설정 드롭다운 ("경기 고양시 일산동구"), 네비게이션 탭 (홈, 견적현황, 이용내역, 쿠폰북, 마이 [Active]).
   - 알림 벨 버튼 (신규 알림 뱃지) 및 프로필 퀵 액션.
2. **브레드크럼 및 상단 스크린 바**:
   - `홈 > 마이페이지` 계층 경로 및 `USER-MYP-00` 화면 식별 태그.
   - 우측 퀵 액션 버튼: `환경설정`, `로그아웃`.
3. **프로필 요약 카드 (Profile Summary Card)**:
   - 원형 사용자 아바타 및 사진 수정 버튼.
   - 성명 ("김충훈 고객님"), VIP 케어 멤버십 뱃지, 마스킹된 전화번호 (`010-****-1234`), 본인인증 완료 뱃지, 이메일 주소.
   - `회원정보 수정 >` 버튼.
   - 신뢰도 카드: 정상 회원 (신뢰도 100%), 제재 없음 / 페널티 0점 (청정계정).
4. **혜택 및 자산 대시보드 (Benefits Dashboard)**:
   - **내 쿠폰함**: 2장 보유, "정기청소 웰컴 5,000원 쿠폰 외 1장 보유", `쿠폰함 확인 >` 버튼.
   - **리워드 포인트 (SsulDak 캐시)**: 14,000 P (1P = 1원, 현금처럼 즉시 차감 결제 가능, 30일 이내 소멸 예정 0 P), `포인트 적립/사용 내역 >` 버튼.
5. **서비스 및 계약 관리 메뉴 리스트 (Services & Contracts Menu)**:
   - **내 청소 신청 및 이용 내역**: 진행 중인 건수 뱃지 표시 및 `내역 보기 >` 링크 (`USER-HIS-00` 연동).
   - **내 등록 자필 전자서명 관리**: 표준 전자서명 등록 여부 표시, `서명 미리보기` 모달 버튼, `자필 서명 재등록` 캔버스 모달 버튼.
   - **회원정보 및 알림 설정**: 휴대폰 번호, 주소지, 알림톡 수신 설정 관리 링크 (`USER-MYP-01` 연동).
   - **결제 수단 및 환불 계좌 관리**: 등록 카드 및 가상계좌 에스크로 환불 등록 상태 표시.
6. **다음 시공 예약 스냅샷 배너 (Upcoming Service Banner)**:
   - 프리미엄 그라디언트 배경: "입주 & 이사 프리미엄 심층 클리닝", 담당 매니저 배정 안내, `진행상태 실시간 조회` 버튼.
7. **우측 안심 및 고객 지원 사이드바 (Right Column Widget)**:
   - **쓸고닦고 3대 안심 보증**: 100% 무상 재시공 보증제, 현대해상 10억원 영업배상책임, 전/후 사진 필수 검수 & 에스크로 결제.
   - **공지사항 & 이용가이드**: 노쇼 규정, 가전케어 약품 가이드, 파트너 배차 안내.
   - **고객감동센터**: 대표번호 `1588-0000`, 365일 연중무휴 안내, 카카오톡 1:1 실시간 상담 연결 (노란색 카카오 브랜드 버튼), FAQ 바로가기.
   - **약관 및 계정 푸터**: 이용약관, 개인정보처리방침 링크, 계정 식별번호, 회원탈퇴 모달 트리거.
8. **전자서명 모달 시스템**:
   - **서명 미리보기 모달**: 등록된 서명 이미지, 표준 전자서명 암호화 인증 도장 텍스트 표시, '서명 다시 그리기' 전환 기능.
   - **HTML5 Canvas 자필 서명 재등록 모달**: 마우스/터치 드래그 기반 서명 패드, '다시쓰기(Clear)', '서명 저장하기' 즉시 DB 반영.
9. **회원탈퇴 모달**:
   - 잔여 포인트 및 보유 쿠폰 소멸 경고 안내, 탈퇴 사유 선택 및 확인 절차.

---

## 5. 실증 및 브라우저 검증 결과

- **서버 주소**: `http://localhost:3000/?v=20261023_myp00_v1#mypage`
- **검증 환경**: Next.js App Router 아키텍처, Node.js 프리뷰 서버, MySQL `ssuldak_db` 연동.
- **테스트 케이스 결과**:
  1. `GET_MYPAGE_DASHBOARD` 호출 시 사용자 정보 `김충훈`, `010-****-1234`, `NORMAL`, 쿠폰 2장, 포인트 14,000 P 정상 로딩 완료.
  2. 서명 미리보기 모달 열림 및 서명 그래픽 렌더링 정상 확인.
  3. 자필 서명 재등록 HTML5 Canvas 모달 열림, 마우스/터치 드로잉 스트로크 렌더링, 서명 저장하기 호출 정상 동작 확인.
  4. 데스크톱 12컬럼 및 모바일 반응형 뷰 레이아웃 완벽 검증.
