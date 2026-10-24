# [SsulDak (쓸고닦고)] USER-REQ-00 (통합 청소 서비스 신청) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-REQ-00` |
| **화면명** | 통합 청소 서비스 신청 (Integrated Cleaning Service Request / Tender) |
| **지원 채널** | Web [Y] / App [Y] |
| **도메인 역할** | `User` (이용자 전용) |
| **프론트엔드 파일** | `SsulDak_Web/User/frontend/USER-REQ-00/index.tsx`<br>`SsulDak_Web/User/frontend/USER-REQ-00/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/User/backend/api_USER_REQ_00/route.ts` |
| **API 엔드포인트** | `POST /api/user/user_req_00` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |

### 핵심 아키텍처 준수 규칙
1. **물리적 역할 격리**: 모든 소스코드는 `SsulDak_Web/User` 하위에서 완결되며, `Admin` 또는 `Partner` 도메인과 소스코드를 교차 참조하거나 공유하지 않습니다.
2. **1:1 매핑 및 전용 SQL ID 원칙**: 타 화면과 API 및 SQL을 절대 공유하지 않으며, 오직 이 화면 전용 SQL ID(`USER-REQ-00-SQL-001 ~ 005`)로 독립 수행됩니다.
3. **채번 표준 준수**:
   - 마스터 요청서 ID: `REQ` + `YYYYMMDD` + `5자리 순번` (예: `REQ2026102200001`, 총 16자리)
   - 품목 슬롯 ID: `{REQ_NO}` + `-` + `2자리 순번` (예: `REQ2026102200001-01`, 총 19자리)
4. **비즈니스 룰 강제 및 이중 검증**:
   - **정기청소 3개월(90일) 강제 락**: (종료일 - 시작일) < 90일일 경우 프론트엔드 등록 버튼 비활성화 및 백엔드 HTTP 400 (`INVALID_PERIOD`) 차단.
   - **확정 데이터 이용료 연산**: `MAX(ROUND(총용역금액 * 0.033), 33000)` (VAT 포함).
   - **슬롯별 1주일 만료**: 미청약 타임아웃 기본 만료시각을 `NOW() + INTERVAL 7 DAY`로 설정.
5. **감사 추적 컬럼 필수 바인딩**: `REG_DT(NOW())`, `REG_ID(USER_NO)`, `MOD_DT(NOW())`, `MOD_ID(USER_NO)` 갱신.

---

## 2. 채번 표준 및 슬롯 체계 (16바이트 마스터 / 19바이트 슬롯)

### 2.1 마스터 견적 신청서 번호 (`REQ_NO`: 16자리)
$$\mathbf{REQ\_NO} = \mathbf{REQ} + \mathbf{YYYYMMDD(8자리)} + \mathbf{Sequence(5자리)}$$
- 예시: `REQ2026102200001`, `REQ2026102200002`

### 2.2 개별 품목 슬롯 번호 (`SLOT_NO`: 19자리)
$$\mathbf{SLOT\_NO} = \mathbf{REQ\_NO} + \mathbf{-} + \mathbf{Seq(2자리)}$$
- 예시:
  - `REQ2026102200001-01` (계단 청소 1~4층)
  - `REQ2026102200001-02` (건물주위 / 주차장)
  - `REQ2026102200001-03` (스탠드 에어컨 LG)

---

## 3. 프론트엔드 (FrontEnd) 구현 명세

### 3.1 파일 위치
- 메인 컴포넌트: [`SsulDak_Web/User/frontend/USER-REQ-00/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-00/index.tsx)
- Re-export 엔트리: [`SsulDak_Web/User/frontend/USER-REQ-00/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-00/index.jsx)

### 3.2 화면 UI/UX 구성요소

1. **상단 GNB 헤더 (`<header>`)**:
   - 뒤로가기 버튼 (`<`) -> `USER-COM-00` 메인 홈 허브 이동.
   - 중앙 타이틀: `"청소 견적 신청서 작성"`.
   - 우측 닫기 버튼 (`X`).

2. **Section 1: 청소지 주소 및 작업 환경 카드**:
   - **도로명 주소 입력**: 읽기 전용/직접입력 인풋 + `[주소 검색]` 버튼 클릭 시 주소 검색 모달 연동.
   - **상세 주소 입력**: 동/호수 및 층수 입력.
   - **승강기(엘리베이터) 여부**: `[● 있음 (탑승 가능)]` vs `[○ 없음 (계단 이용)]` 세그먼트 버튼.
   - **주차 여건 칩**: `[무료 주차]`, `[유료 지원]`, `[주차 불가]` 3종 선택 칩.

3. **Section 2: 정기청소 신청 카드 (Border Light Blue)**:
   - **상단 체크박스 토글**: `[V] 2. 정기청소 신청 (건물·상가·계단)` (체크 해제 시 내부 영역 슬라이드 접힘).
   - **계약 기간 From-To 데이트 픽커**:
     - 시작일 및 종료일 데이트 픽커.
     - 실시간 기간 계산: 90일 이상일 때 초록 뱃지 `"3개월 92일 정상"`, 90일 미만일 때 적색 경고 뱃지 및 문구 표출 (`※ 정기청소는 플랫폼 약관에 따라 최소 3개월(90일) 이상 선택하셔야 등록이 가능합니다`).
   - **방문 주기 드롭다운**: 주 1회(월 4회), 주 2회(월 8회), 주 3회(월 12회), 격주 1회, 평일 매일.
   - **동적 구역 리스트**:
     - 구역별 3개월 제안 단가 입력 필드 및 `[삭제]` 버튼.
     - `[+ 구역 추가 (USER-REQ-01)]` 버튼 클릭 시 공통 코드(`REGULAR_CLEAN_AREA`) 기반 선택 모달 팝업 호출.
   - **정기청소 소계**: `"정기청소 3개월 용역 소계: 240,000 원"`.

4. **Section 3: 계절 가전 케어 카드**:
   - **상단 체크박스 토글**: `[V] 3. 계절 가전 케어 (에어컨·세탁기·냉장고 분해소독)`.
   - **동적 가전 품목 리스트**:
     - 품목별 대당 제안 단가 입력 및 `[삭제]` 버튼.
     - `[+ 가전 품목 추가 (USER-REQ-02)]` 버튼 클릭 시 공통 코드(`APPLIANCE_CLEAN_TYPE`) 기반 모달 팝업 호출.
   - **가전케어 소계**: `"가전케어 용역 소계: 80,000 원"`.

5. **Section 4: 입주/이사 청소 카드**:
   - `[ ] 4. 입주 / 이사 청소` 체크박스 토글.
   - 공간 타입(아파트, 오피스텔, 빌라, 원룸 등) 및 전용 공급 평수 입력에 따른 자동 단가 계산.

6. **Section 5: 청소 용역 대금 및 데이터 이용료 산출 박스 (Highlight Navy)**:
   - **총 청소 용역 대금 (파트너 지급액)**: 제안 단가의 총합 실시간 표출 (예: `"320,000 원"`).
   - **플랫폼 확정 과금 연산 배너**:
     - `용역총액 3.3% 기준액: 10,560 원` vs `기본 최저 하한선: 33,000 원` 비교.
     - `확정 데이터 이용료 (VAT 포함): 33,000 원`.
   - **프로모션 넛지**: `"💡 보유 중인 웰컴 쿠폰(-5,000원)을 매칭 후 결제 단계에서 즉시 적용할 수 있습니다."`

7. **Section 6: 현장 사진 첨부 박스**:
   - 가로 스크롤 썸네일 리스트 (최대 5장 미리보기 및 삭제).
   - `[+ 사진 추가]` 버튼.

8. **Bottom Floating CTA (하단 고정 버튼)**:
   - `[ 320,000원 조건으로 견적 공고 등록하기 ]` 고정 CTA 버튼.
   - 등록 완료 시 축하 모달 팝업 노출 (`"견적 공고가 등록되었습니다! 신청서 번호 REQ2026102200001"`).

---

## 4. 백엔드 라우터 및 데이터베이스 명세

### 4.1 백엔드 모듈 정보
- 모듈 경로: [`SsulDak_Web/User/backend/api_USER_REQ_00/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_REQ_00/route.ts)
- 엔드포인트: `POST /api/user/user_req_00`
- 처리 모드:
  - `GET_INIT_DATA`: 화면 초기 렌더링용 공통 코드 일괄 조회
  - `CREATE_REQUEST`: 견적 요청서 및 다중 슬롯 일괄 트랜잭션 등록

### 4.2 전용 독립 SQL ID 및 쿼리문

#### 1) USER-REQ-00-SQL-001 (공통 코드 목록 조회)
```sql
SELECT GRP_CD, COM_CD, COM_NM, ATTR_VAL_1, SORT_ORD
FROM TB_COM_CODE
WHERE GRP_CD IN ('REGULAR_CLEAN_AREA', 'APPLIANCE_CLEAN_TYPE', 'MOVEIN_SPACE_TYPE', 'VISIT_CYCLE', 'PARKING_TYPE')
  AND USE_YN = 'Y'
ORDER BY GRP_CD ASC, SORT_ORD ASC;
```

#### 2) USER-REQ-00-SQL-002 (당일 기준 마스터 REQ_NO 최댓값 조회 및 락 채번)
```sql
SELECT MAX(REQ_NO) AS MAX_REQ_NO
FROM TB_CLEAN_REQ
WHERE REQ_NO LIKE CONCAT(?, '%')
FOR UPDATE;
```

#### 3) USER-REQ-00-SQL-003 (마스터 요청서 TB_CLEAN_REQ 등록)
```sql
INSERT INTO TB_CLEAN_REQ (
  REQ_NO, USER_NO, REQ_STAT_CD, ADDR_ROAD, ADDR_DETAIL,
  BASE_ADDR, DETAIL_ADDR,
  HAS_ELEVATOR_YN, PARKING_TYPE_CD, HAS_REGULAR_YN, HAS_APPLIANCE_YN, HAS_MOVEIN_YN,
  REGULAR_START_DT, REGULAR_END_DT, REGULAR_VISIT_CYCLE_CD,
  TOTAL_PROPOSED_AMT, CALC_FEE_AMT, EST_DATA_FEE_AMT,
  REQ_EXPIRE_DT, REG_DT, REG_ID, MOD_DT, MOD_ID
) VALUES (
  ?, ?, 'OPEN', ?, ?,
  ?, ?,
  ?, ?, ?, ?, ?,
  ?, ?, ?,
  ?, ?, ?,
  DATE_ADD(NOW(), INTERVAL 7 DAY), NOW(), ?, NOW(), ?
);
```

#### 4) USER-REQ-00-SQL-004 (개별 품목 슬롯 TB_CLEAN_REQ_SLOT 등록 - 1주일 만료)
```sql
INSERT INTO TB_CLEAN_REQ_SLOT (
  SLOT_NO, REQ_NO, SLOT_SEQ, SERVICE_TYPE_CD, SUB_ITEM_CD, SUB_ITEM_NM,
  SLOT_STAT_CD, PROPOSED_UNIT_AMT, EXPIRE_DT, REG_DT, REG_ID, MOD_DT, MOD_ID
) VALUES (
  ?, ?, ?, ?, ?, ?,
  'WAITING', ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW(), ?, NOW(), ?
);
```

#### 5) USER-REQ-00-SQL-005 (현장 첨부 사진 TB_CLEAN_REQ_PHOTO 등록)
```sql
INSERT INTO TB_CLEAN_REQ_PHOTO (
  REQ_NO, PHOTO_URL, SORT_ORD, REG_DT, REG_ID
) VALUES (
  ?, ?, ?, NOW(), ?
);
```

### 4.3 비즈니스 처리 및 트랜잭션 로직
1. **정기청소 3개월(90일) 엄격 검증**:
   - `cleanServiceTypes.includes('REGULAR')` 시 `(endDt - startDt) < 90일`이면 즉시 HTTP 400 반환:
     `{ "success": false, "code": "INVALID_PERIOD", "message": "정기청소는 최소 3개월(90일) 이상 선택하셔야 합니다." }`
2. **확정 데이터 이용료 연산**:
   - `totalProposedAmt = SUM(슬롯별 propAmt)`
   - `estDataFeeAmt = MAX(ROUND(totalProposedAmt * 0.033), 33000)`
3. **트랜잭션 일괄 처리 (`executeTransaction`)**:
   - `TB_CLEAN_REQ` 생성 ➔ 슬롯별 루프 돌며 `TB_CLEAN_REQ_SLOT` 생성 ➔ 첨부 사진 `TB_CLEAN_REQ_PHOTO` 등록 완료.

---

## 5. 빌드 및 테스트 검증 결과

### 5.1 컴포넌트 빌드 및 번들링
- 번들러: `esbuild` (`preview/main.tsx` ➔ `preview/bundle.js`)
- 빌드 결과: **정상 빌드 완료 (Done in 63ms, 0 에러)**

### 5.2 백엔드 API 테스트 (`curl`)
1. **`GET_INIT_DATA` 테스트**:
   - 요청: `POST /api/user/user_req_00` (`actionType: "GET_INIT_DATA"`)
   - 응답: 5개 대분류/중분류 코드 정상 반환 확인.
2. **90일 미만 정기청소 등록 방어 테스트**:
   - 요청: 시작일 2026-11-01, 종료일 2026-11-30 (30일 선택)
   - 응답: `HTTP 400 Bad Request`, `code: "INVALID_PERIOD"`, 메시지 `"정기청소는 최소 3개월(90일) 이상 선택하셔야 합니다."` 정상 차단 확인.
3. **정상 신청서 등록 테스트**:
   - 정기청소 240,000원 + 가전케어 80,000원 = 총 320,000원 등록
   - 응답: `HTTP 201 Created`, `reqNo: "REQ2026102200001"`, `estDataFeeAmt: 33000` 발급 확인.

### 5.3 브라우저 E2E 인터랙션 검증 (Browser Subagent)
1. 주소 검색 모달에서 `'경기 고양시 일산동구 중앙로 1234'` 선택 완료.
2. 승강기 여부(있음/없음) 및 주차 여건(무료/유료/불가) 상호작용 검증.
3. 정기청소 기간 92일 정상 뱃지 확인 및 `[+ 구역 추가]` 모달을 통해 `'주차장 (지상/지하 바닥)'` 추가 완료.
4. 가전케어 `[+ 가전 품목 추가]` 모달을 통해 `'벽걸이 에어컨'` 추가 완료.
5. 총 청소 용역 대금 및 확정 데이터 이용료(33,000원) 실시간 계산 검증.
6. 하단 플로팅 CTA 클릭 후 **`REQ2026102200002`** 견적 공고 정상 등록 완료 모달 팝업 확인.
