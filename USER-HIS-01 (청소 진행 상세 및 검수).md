# [SsulDak (쓸고닦고)] USER-HIS-01 (청소 진행 상세 및 검수) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-HIS-01` |
| **화면명** | 청소 진행 상세 및 검수 리포트 (Cleaning Inspection & Progress Detail Report) |
| **지원 채널** | Web [Y] / App [Y] (데스크톱 1280px~1440px 12컬럼 그리드 분할: 8컬럼 리포트 / 4컬럼 스티키 사이드바, 모바일 390px 스크롤 뷰) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 부모 화면** | [`USER-HIS-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-00) (청소 이용 내역) |
| **호출 대상 화면** | [`USER-HIS-02`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-02) (포토리뷰 작성), [`USER-QOT-02`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-02) (파트너 1:1 현장 채팅) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-HIS-01/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-01/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-HIS-01/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-01/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_HIS_01/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_HIS_01/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_his_01` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **사용 테이블** | `TB_CLEAN_CONTRACT`, `TB_CLEAN_WORK_LOG`, `TB_CLEAN_WORK_PHOTO`, `TB_DATA_FEE_PAY`, `TB_USER`, `TB_SANCTION_LOG`, `TB_PARTNER`, `TB_CLEAN_REQ` |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

---

### 핵심 아키텍처 및 비즈니스 규정 준수
1. **물리적 격리**: 모든 코드는 `SsulDak_Web/User/` 폴더 하위에 완결 배치되어 있으며, 타 도메인과의 컴포넌트 공유를 엄격히 배제합니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/User/frontend/USER-HIS-01/index.jsx` & `index.tsx`
   - 백엔드 라우터: `SsulDak_Web/User/backend/api_USER_HIS_01/route.ts`
   - 엔드포인트: `POST /api/user/user_his_01`
3. **독립 전용 SQL ID 적용**: 타 화면과 쿼리를 일체 공유하지 않고 `USER-HIS-01-SQL-001`부터 `USER-HIS-01-SQL-009`까지 전용 SQL로 완결 실행합니다.
4. **5단계 시공 프로세스 스테퍼 (Stepper)**:
   - `MATCHED` (1. 배차완료) ➔ `DEPARTED` (2. 현장출발) ➔ `WORKING` (3. 작업시작) ➔ `INSPECTING` (4. 검수대기 [진행중 펄스]) ➔ `COMPLETED` / `VERIFIED` (5. 시공완료)
5. **시공 사진 검증 및 라이트박스 (Lightbox)**:
   - 파트너가 최소 2장 이상의 Before/After 시공 사진을 등록해야 검수 대기 상태가 되며, 미등록 시 "시공 사진 등록 대기 중입니다" 플레이스홀더를 노출하고 완료 확정 버튼을 비활성화합니다.
   - 각 사진 클릭 시 고해상도 확대 모달(Lightbox)을 지원합니다.
6. **시공 완료 확정 (`CONFIRM_COMPLETE`)**:
   - 이용자가 [청소 시공 완료 확정하기] 터치 시 `TB_CLEAN_WORK_LOG.WORK_STAT_CD = 'VERIFIED'` 및 `TB_CLEAN_CONTRACT.CONTRACT_STAT_CD = 'COMPLETED'`로 트랜잭션 전이.
   - 확정 완료 직후 포토리뷰 작성 화면([`USER-HIS-02`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-02))으로 자동 유도.
7. **개정 취소 위약금 및 패널티 정책 (`CANCEL_RESERVATION`)**:
   - **결제 후 7일(168시간) 이내 취소 시**: 데이터 이용료의 **50% 위약 환불**, 이용자 계정 제재 없음.
   - **결제 후 7일 경과 후 취소 시**: 데이터 이용료 **100% 전액 몰수** + 이용자 계정(`TB_USER`)에 **7일간 서비스 이용 정지**(`USER_STAT_CD = 'SUSPENDED_7D'`, `SUSPEND_EXPIRE_DT = NOW() + 7일`) 부여 및 `TB_SANCTION_LOG` 기록.

---

## 2. 데이터베이스 명세 및 독립 전용 SQL ID

### 2.1 독립 전용 SQL 쿼리 매핑 목록

| SQL ID | 설명 | 대상 테이블 | 작업 유형 |
| :--- | :--- | :--- | :--- |
| `USER-HIS-01-SQL-001` | 계약 마스터, 파트너 정보, 결제일시 및 경과시간 조회 | `TB_CLEAN_CONTRACT`, `TB_PARTNER`, `TB_CLEAN_REQ`, `TB_DATA_FEE_PAY` | `SELECT` |
| `USER-HIS-01-SQL-002` | 최신 시공 회차 및 진행 상태 Stepper 조회 | `TB_CLEAN_WORK_LOG` | `SELECT` |
| `USER-HIS-01-SQL-003` | 당해 회차 시공 증빙 사진 Before/After 목록 조회 | `TB_CLEAN_WORK_PHOTO` | `SELECT` |
| `USER-HIS-01-SQL-004` | 시공 완료 확정 승인 처리 | `TB_CLEAN_WORK_LOG` | `UPDATE` |
| `USER-HIS-01-SQL-005` | 계약 마스터 최종 완료 상태 전이 | `TB_CLEAN_CONTRACT` | `UPDATE` |
| `USER-HIS-01-SQL-006` | 계약 취소 상태 갱신 | `TB_CLEAN_CONTRACT` | `UPDATE` |
| `USER-HIS-01-SQL-007` | 결제 원장 환불/몰수 상태 전이 (`REFUND_50` / `FORFEITED_100`) | `TB_DATA_FEE_PAY` | `UPDATE` |
| `USER-HIS-01-SQL-008` | 7일 경과 취소 시 회원 7일 이용 정지 및 취소누적 갱신 | `TB_USER` | `UPDATE` |
| `USER-HIS-01-SQL-009` | 7일 정지 제재 이력 로그 등록 | `TB_SANCTION_LOG` | `INSERT` |

---

## 3. 백엔드 서비스 명세 (`POST /api/user/user_his_01`)

### 3.1 요청 규격 (Request Body)

```json
// 1) 상세 시공 및 검수 데이터 조회 모드
{
  "mode": "GET_WORK_DETAIL",
  "userNo": "U20261000001",
  "contractNo": "CT2026102368719"
}

// 2) 시공 완료 확정 승인 모드
{
  "mode": "CONFIRM_COMPLETE",
  "userNo": "U20261000001",
  "contractNo": "CT2026102368719",
  "workSeq": 1
}

// 3) 예약 취소 신청 모드
{
  "mode": "CANCEL_RESERVATION",
  "userNo": "U20261000001",
  "contractNo": "CT2026102368719",
  "cancelReason": "고객 단순 변심 및 일정 변경 불가"
}
```

### 3.2 응답 규격 (Response JSON)

```json
// GET_WORK_DETAIL 성공 응답
{
  "success": true,
  "contract": {
    "contractNo": "CT2026102368719",
    "reqNo": "REQ202610210001",
    "subItemNm": "정기청소 3개월 · 1회차",
    "contractStatCd": "IN_PROGRESS",
    "totalPayAmt": 240000,
    "safeTelNo": "0507-1234-5678",
    "ptnrNo": "P20260900012",
    "companyNm": "반짝빌라클린",
    "ceoNm": "이*수",
    "profileImgUrl": "...",
    "avgRating": 5.0,
    "addrRoad": "경기 고양시 일산동구 중앙로 빌라 단지 A동",
    "actualPaidAmt": 26000,
    "paidDt": "2026-10-22 18:45:17",
    "elapsedHoursAfterPay": 6
  },
  "workLog": {
    "workSeq": 1,
    "roundNo": 1,
    "workStatCd": "INSPECTING",
    "workerMemo": "안녕하세요 고객님! 요청주신 1~4층 계단 및 복도 린스 물청소...",
    "startDt": "2026-11-01 09:00:00",
    "endDt": "2026-11-01 10:40:00"
  },
  "photos": [
    {
      "photoSeq": 1,
      "photoTypeCd": "BEFORE",
      "photoUrl": "...",
      "title": "1~4층 계단 및 복도 대리석 바닥 (시공 전)",
      "sortOrd": 1
    },
    {
      "photoSeq": 2,
      "photoTypeCd": "AFTER",
      "photoUrl": "...",
      "title": "1~4층 계단 및 복도 대리석 바닥 (시공 후)",
      "sortOrd": 2
    }
  ],
  "hasMinimumPhotos": true,
  "refundPolicy": {
    "elapsedHours": 6,
    "isWithin7Days": true,
    "refundRate": 50,
    "refundAmt": 13000,
    "willBeSuspended": false
  },
  "syncedAt": "10:42:15"
}
```

---

## 4. UI 컴포넌트 구성 명세

1. **상단 네비게이션 및 헤더**:
   - 뒤로가기(`<`) 버튼 클릭 시 [`USER-HIS-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-00) 화면으로 복귀.
   - 실시간 동기화 상태 뱃지 (`실시간 동기화 완료` + Green Ping 애니메이션).
   - 고객센터 다이렉트 콜 연결 (`1588-0000`).
2. **실시간 5단계 시공 진행 상태 바 (Process Stepper)**:
   - 1. 배차완료 ➔ 2. 현장출발 ➔ 3. 작업시작 ➔ 4. 검수대기 [진행중 뱃지 및 Pulse] ➔ 5. 시공완료
   - 상단 자동확정 D-3일 안내 배너 및 총괄 마스터 등록 안내문.
3. **시공 정보 및 담당 마스터 카드**:
   - 반짝빌라클린 프로필, 마스터 파트너 보증 마크, 평점 5.0, 누적 시공 520회+ 뱃지.
   - [ 0507 안심통화 ] 버튼 (`tel:0507-1234-5678`).
   - [ 1:1 현장 채팅 ] 버튼 ➔ [`USER-QOT-02`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-QOT-02) 화면 전환.
   - 시공 범위(계단, 복도, 현관 유리문, 분리수거함) 및 독일 카처 고압분사기 등 장비 내역 표시.
4. **시공 증빙 전/후 비교 갤러리 (Photo Verification Gallery)**:
   - 필수 검수 2개 구역 (계단 바닥, 공동현관 자동 유리문).
   - Before(좌측 레드 뱃지) vs After(우측 그린 뱃지) 비교 카드.
   - 클릭 시 고해상도 확대 모달 (Lightbox) 오버레이.
   - 담당 마스터 현장 브리핑 코멘트 및 3대 품질 검수 체크리스트 (난간 소독, 창틀 흡입, 매트 세척).
5. **쓸고닦고 안심 케어 보증 카드**:
   - 100% 무상 AS 재시공 보증 (시공 후 7일 이내 무상 재방문).
   - 현대해상 10억원 영업배상책임보험.
6. **우측 고정 액션 사이드바**:
   - [청소 시공 완료 확정하기] Primary Navy 버튼 (`#00254a`).
   - [미흡 구역 재시공 / 보수 요청] 버튼.
   - 현장 직불 청소비 계좌 이체 완료 확인 체크박스.
   - 전자세금계산서 / 현금영수증 신청 링크.
   - 개정 취소 위약금 및 7일 이용 정지 정책 안내 박스 및 [계약 해지 / 예약 취소 신청하기] 버튼.
   - 카카오톡 긴급 분쟁 상담원 연결 데스크.
7. **인터랙티브 모달 시스템**:
   - **Lightbox 모달**: 고해상도 원본 사진 확대 및 위변조 방지 워터마크 안내.
   - **완료 확정 모달**: 완료 확정 시 에스크로 정산 및 포토리뷰 작성 유도.
   - **취소 및 위약금 모달**: 7일 이내(50% 환불) / 7일 경과(100% 몰수 + 7일 이용 정지) 동적 분기 안내.
   - **미흡 구역 재시공 요청 모달**: 7일 무상 AS 접수 및 1:1 채팅 연동.

---

## 5. 검증 결과 및 테스트 확인 내역

1. **DB 연결 및 마이그레이션**:
   - `TB_CLEAN_WORK_LOG` 누락 컬럼(`WORKER_MEMO`, `START_DT`, `END_DT`, `CONFIRM_DT`, `MOD_DT`, `MOD_ID`) 성공적으로 추가 완료.
   - `TB_CLEAN_WORK_PHOTO` 신규 테이블 생성 및 4장의 Before/After 시공 사진 시딩 완료.
   - `TB_SANCTION_LOG` 테이블에 `SANCTION_TYPE_CD`, `REASON_DESC` 컬럼 확장 완료.
2. **백엔드 라우터 연동**:
   - `POST /api/user/user_his_01` 라우터 정상 등록 및 `preview/server.ts` 연동 완료.
   - `GET_WORK_DETAIL`, `CONFIRM_COMPLETE`, `CANCEL_RESERVATION` 모드 단위 테스트 통과.
3. **브라우저 자동화 E2E 테스트 검증**:
   - 5단계 시공 진행 스테퍼 정상 렌더링 확인 (Step 4 검수대기 진행중 펄스).
   - Before/After 2개 구역 4장 사진 렌더링 확인.
   - 사진 클릭 시 Lightbox 확대 모달 정상 작동 확인.
   - [청소 시공 완료 확정하기] 클릭 시 시공 완료 확정 모달 정상 작동 확인.
   - [계약 해지 / 예약 취소 신청하기] 클릭 시 7일 이내 50% 위약금 환불 계산 및 안내 모달 정상 작동 확인.
