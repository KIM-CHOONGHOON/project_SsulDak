# [SsulDak (쓸고닦고)] USER-HIS-02 (서비스 리뷰 작성 및 리워드 적립) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-HIS-02` |
| **화면명** | 서비스 리뷰 작성 및 리워드 적립 (Service Review & Photo Reward Points) |
| **지원 채널** | Web [Y] / App [Y] (데스크톱 1280px~1440px 12컬럼 그리드 분할: 8컬럼 리뷰 폼 / 4컬럼 스티키 혜택 요약 사이드바, 모바일 390px 반응형 뷰) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 부모 화면** | [`USER-HIS-01`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-01) (청소 진행 상세 및 검수) |
| **호출 대상 화면** | [`USER-HIS-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-00) (청소 이용 내역) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-HIS-02/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-02/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-HIS-02/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-02/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_HIS_02/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_HIS_02/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_his_02` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **사용 테이블** | `TB_CLEAN_REVIEW`, `TB_CLEAN_CONTRACT`, `TB_USER_POINT_LEDGER`, `TB_PARTNER` |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

---

### 핵심 아키텍처 및 비즈니스 규정 준수
1. **물리적 격리**: 모든 소스코드는 `SsulDak_Web/User/` 폴더 하위에 완결 배치되어 있으며, 타 도메인과의 컴포넌트 공유를 엄격히 배제합니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/User/frontend/USER-HIS-02/index.jsx` & `index.tsx`
   - 백엔드 라우터: `SsulDak_Web/User/backend/api_USER_HIS_02/route.ts`
   - 엔드포인트: `POST /api/user/user_his_02`
3. **독립 전용 SQL ID 적용**: 타 화면과 쿼리를 일체 공유하지 않고 `USER-HIS-02-SQL-001`부터 `USER-HIS-02-SQL-005`까지 전용 SQL로 완결 실행합니다.
4. **1계약 1리뷰 원칙**:
   - 이미 리뷰가 작성된 계약 건(`CONTRACT_NO`)은 중복 등록이 불가하며, 중복 시 `409 Conflict` 반환.
   - 시공 완료(`CONTRACT_STAT_CD == 'COMPLETED'`) 계약에 대해서만 후기 작성 가능.
5. **포토 리뷰 프로모션 리워드 적립**:
   - 사진 1장 이상 첨부 시 `TB_USER_POINT_LEDGER`에 `REVIEW_1000P` 변동 구분으로 즉시 **+1,000P** 적립 (`BALANCE_AMT` 누적 합산).
   - 일반 텍스트 후기 시 기본 300P(또는 0P) 차등 정책 적용.
6. **파트너 통계 실시간 재계산**:
   - 리뷰 등록 즉시 해당 파트너(`TB_PARTNER`)의 누적 리뷰 수(`REVIEW_CNT`, `REVIEW_TOTAL_CNT`)와 평균 별점(`AVG_RATING = ROUND(AVG(RATING), 1)`)을 실시간 재집계하여 업데이트.
7. **감사 컬럼**:
   - 리뷰 및 포인트 원장 등록 시 `REG_DT(NOW())`, `REG_ID(USER_NO)` 기록.

---

## 2. 데이터베이스 명세 및 독립 전용 SQL ID

### 2.1 독립 전용 SQL 쿼리 매핑 목록

| SQL ID | 설명 | 대상 테이블 | 작업 유형 |
| :--- | :--- | :--- | :--- |
| `USER-HIS-02-SQL-001` | 리뷰 작성 대상 계약 유효성 및 기작성 여부 확인 | `TB_CLEAN_CONTRACT`, `TB_PARTNER`, `TB_CLEAN_REVIEW` | `SELECT` |
| `USER-HIS-02-SQL-002` | 고객 리뷰 데이터 저장 | `TB_CLEAN_REVIEW` | `INSERT` |
| `USER-HIS-02-SQL-003` | 이용자 현재 최신 포인트 잔액 조회 | `TB_USER_POINT_LEDGER` | `SELECT` |
| `USER-HIS-02-SQL-004` | 포토리뷰 1,000P 리워드 적립 등록 | `TB_USER_POINT_LEDGER` | `INSERT` |
| `USER-HIS-02-SQL-005` | 파트너 평균 평점 및 누적 리뷰 수 실시간 재집계 갱신 | `TB_PARTNER` | `UPDATE` |

---

## 3. 백엔드 서비스 명세 (`POST /api/user/user_his_02`)

### 3.1 요청 규격 (Request Body)

```json
// 1) 리뷰 작성 대상 계약 정보 조회 모드
{
  "mode": "GET_TARGET_CONTRACT",
  "userNo": "U20261000001",
  "contractNo": "CT2026102100001"
}

// 2) 리뷰 등록 및 포인트 지급 모드
{
  "mode": "SUBMIT_REVIEW",
  "userNo": "U20261000001",
  "contractNo": "CT2026102100001",
  "rating": 5,
  "content": "구석구석 거미줄과 묵은 때까지 말끔하게 청소해 주셔서 정말 만족스럽습니다. 다음에도 기사님께 맡길게요!",
  "cleanTypeNm": "정기청소",
  "photoUrls": [
    "https://ssuldak.s3.ap-northeast-2.amazonaws.com/review/rev_01.jpg",
    "https://ssuldak.s3.ap-northeast-2.amazonaws.com/review/rev_02.jpg"
  ],
  "shareToProfile": true,
  "applyHallOfFame": true
}
```

### 3.2 응답 규격 (Response JSON)

```json
// 1) GET_TARGET_CONTRACT 성공 응답
{
  "success": true,
  "contract": {
    "contractNo": "CT2026102100001",
    "userNo": "U20261000001",
    "ptnrNo": "P20260900012",
    "subItemNm": "정기청소 3개월 · 1회차",
    "contractStatCd": "COMPLETED",
    "companyNm": "반짝빌라클린",
    "ceoNm": "이*수",
    "profileImgUrl": "...",
    "avgRating": 5.0,
    "reviewCnt": 428,
    "alreadyWrittenCnt": 0
  },
  "currentBalance": 13000,
  "isCompleted": true
}

// 2) SUBMIT_REVIEW 성공 응답 (HTTP 201 Created)
{
  "success": true,
  "rewardPoint": 1000,
  "newBalance": 14000,
  "message": "포토리뷰 작성이 완료되어 1,000P가 즉시 적립되었습니다!"
}
```

---

## 4. UI 컴포넌트 구성 명세

1. **상단 네비게이션 및 브레드크럼**:
   - `홈` / `이용내역` / `청소 진행 상세 (USER-HIS-01)` / `시공 후기 작성`
   - 뒤로가기(`<`) 버튼 클릭 시 [`USER-HIS-01`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-01) 화면으로 이동.
   - `100% 실 이용자 검수 후기 시스템` 안심 뱃지 부착.
2. **리워드 프로모션 히어로 배너 (Hero Banner)**:
   - "🎁 사진을 포함한 포토 리뷰를 작성하시면 즉시 현금성 1,000P를 적립해 드립니다!"
   - 3대 리워드 안내 (즉시 1,000P 지급 / 베스트 후기 10,000P / 1P=1원 현금 사용).
3. **시공 완료 내역 확인 카드**:
   - 계약번호(`CNT-20261021-0001`), 시공 품목 및 일정 요약.
   - 담당 파트너 프로필 박스 (`반짝빌라클린 이*수 마스터 기사님`, 총 428회 시공 · 평점 5.0).
4. **대형 별점 인터랙션 (Rating Stars)**:
   - 1~5점 터치/클릭 토글 (대형 골드 스타 `#ffb95f`).
   - 별점 점수(`5.0 / 5.0`) 및 동적 피드백 문구 표시 (예: "매우 만족해요! 공간이 기대 이상으로 깨끗해졌어요.").
5. **만족 키워드 태그 필 (Quick Satisfaction Tag Pills)**:
   - "구석구석 꼼꼼해요", "약속 시간을 잘 지켜요", "친절하고 설명이 자세해요", "뒤처리가 깔끔해요", "전문 장비가 훌륭해요", "가격대비 만족도가 높아요"
   - 복수 선택 및 토글 인터랙션.
6. **상세 시공 후기 입력 폼 (Textarea)**:
   - 최소 10자 이상 필수 입력, 최대 500자 제한.
   - 실시간 글자 수 카운터 (`142 / 500자`, 10자 미만 시 붉은색 경고).
7. **현장 사진 첨부 슬롯 (Photo Upload Slots, 최대 2장)**:
   - 사진 2열 모자이크 그리드 (미리보기, 삭제 `X` 버튼, 메타데이터 정보).
   - 사진 1장 이상 등록 시 `포토 리뷰 1,000P 적립 대상` 뱃지 활성화.
   - 파일 첨부 인풋(`input[type="file"]`) 연동.
8. **우측 고정 혜택 요약 및 제출 패널 (Sticky Sidebar)**:
   - 리뷰 작성 혜택 실시간 계산 (+300P 기본 + 700P 포토 보너스 = 총 1,000P).
   - 내 SsulDak 캐시 변동 (현재 13,000P ➔ 등록 후 14,000P).
   - 마스터 프로필 감사 후기 등록 동의 및 명예의 전당 베스트 후기 응모 체크박스.
   - 메인 CTA: `[ 1,000P 받고 리뷰 등록 완료하기 ]` (10자 미만 시 `disabled`).
   - 임시저장 및 나중에 작성 버튼.
   - 클린 리뷰 정책 및 고객센터 안심 링크.
9. **축하 모달 (Celebration Modal)**:
   - 리뷰 등록 성공 시 `리뷰 작성이 완료되었습니다! +1,000 P` 축하 팝업 표출.
   - `[이용내역 확인하러 가기]` 클릭 시 청소 이용 내역([`USER-HIS-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-HIS-00)) 화면으로 자동 이동.

---

## 5. E2E 테스트 검증 보고

1. **DB 마이그레이션 및 준비**:
   - `TB_CLEAN_REVIEW`에 `PHOTO_URL_1`, `PHOTO_URL_2`, `POINT_REWARD_AMT`, `REG_ID` 컬럼 추가 완료.
   - `TB_USER_POINT_LEDGER`에 `CHANGE_AMT`, `CHANGE_TYPE_CD`, `RMK` 컬럼 추가 및 초기 웰컴 포인트 잔액 세팅 완료.
2. **백엔드 라우터 API 검증**:
   - `POST /api/user/user_his_02` 엔드포인트 정상 연동.
   - `GET_TARGET_CONTRACT` 및 `SUBMIT_REVIEW` 트랜잭션 정상 수행 확인.
3. **브라우저 자동화 E2E 테스트**:
   - `http://localhost:3000/?v=20261023_his02_v1#review` 진입.
   - 5개 별점 인터랙션 (4점 클릭 시 피드백 문구 변경, 5점 클릭 확인).
   - 만족 태그 필('전문 장비가 훌륭해요') 토글 성공.
   - 2개 사진 슬롯 및 1,000P 실시간 계산 확인.
   - `[ 1,000P 받고 리뷰 등록 완료하기 ]` 클릭 시 서버 트랜잭션 정상 실행 및 축하 모달 표출 확인 (`리뷰 작성이 완료되었습니다! +1,000 P`).
   - 모달 내 `[이용내역 확인하러 가기]` 클릭 시 이용내역 화면(`#history`)으로 라우팅 확인.
