# [SsulDak (쓸고닦고)] USER-REQ-01 (정기청소 중분류 추가 모달) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-REQ-01` |
| **화면명** | 정기청소 중분류 구역 추가 모달 (Regular Cleaning Subcategory Modal) |
| **지원 채널** | Web [Y] / App [Y] (웹 중앙 620px 모달 / 모바일 390px 바텀시트 반응형) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 부모 화면** | [`USER-REQ-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-00/index.tsx) (통합 청소 견적 신청서) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-REQ-01/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-01/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-REQ-01/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-01/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_REQ_01/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_REQ_01/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_req_01` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

### 핵심 아키텍처 준수 규칙
1. **물리적 격리**: 모든 파일은 `SsulDak_Web/User` 하위에서 완결되며, Admin이나 Partner 도메인과 소스코드를 공유하지 않습니다.
2. **1:1 매핑 및 전용 SQL ID 원칙**: 타 화면과 API 및 SQL을 공유하지 않으며, 전용 SQL ID(`USER-REQ-01-SQL-001`, `USER-REQ-01-SQL-002`)를 사용합니다.
3. **단가 산정 기준 및 3개월 의무 계약 표준화**:
   - 정기청소는 3개월(90일) 고정 용역 기준이므로, 모달의 모든 입력 단가는 "3개월 총액" 기준으로 취급됩니다.
   - 단가 입력 시 실시간으로 "(월 환산 OO원)" 뱃지를 자동 계산하여 표시합니다.
4. **실시간 권장 하한선 가이드 연산**:
   - 계단 청소(`STAIR`)는 작업 층수 범위(시작층~끝층)와 방문 주기에 따라 최소 권장 하한선을 백엔드 API와 실시간 동기화하여 산출합니다.
   - 기본 4개 층, 주 1회 기준 3개월 180,000원(월 60,000원)을 기준으로 층수 1개 층 증감당 ±20,000원을 반영하며, 최저 120,000원의 하한선을 보장합니다.
   - 입력 단가가 권장 하한선 미만일 경우 경고 뱃지를 출력하여 입찰 지연 가능성을 안내합니다.

---

## 2. 백엔드 라우터 및 데이터베이스 명세

### 2.1 API 엔드포인트 및 요청/응답 규격
- **URL**: `POST /api/user/user_req_01`
- **Request Header**: `Content-Type: application/json`

#### 모드 1: 모달 초기화 데이터 조회 (`mode: "GET_INIT_CODES"`)
```json
// Request Body
{
  "mode": "GET_INIT_CODES"
}

// Response Body (200 OK)
{
  "success": true,
  "data": {
    "areas": [
      {
        "areaCd": "STAIR",
        "areaNm": "계단 및 난간",
        "basePrice3M": 150000,
        "calcType": "FLOOR_DIFF",
        "sortOrd": 1
      },
      {
        "areaCd": "SURROUND",
        "areaNm": "건물 주위 및 외곽/분리수거장",
        "basePrice3M": 120000,
        "calcType": "OUTDOOR",
        "sortOrd": 2
      },
      ...
    ],
    "cycles": [
      {
        "cycleCd": "WEEKLY_1",
        "cycleNm": "주 1회 (월 4회 방문)",
        "monthlyVisitCnt": 4,
        "sortOrd": 1
      },
      ...
    ]
  }
}
```

#### 모드 2: 층수 및 주기별 권장 하한선 단가 계산 (`mode: "CALC_GUIDE_PRICE"`)
```json
// Request Body
{
  "mode": "CALC_GUIDE_PRICE",
  "areaCd": "STAIR",
  "startFloor": 1,
  "endFloor": 4,
  "cycleCd": "WEEKLY_1"
}

// Response Body (200 OK)
{
  "success": true,
  "floorCount": 4,
  "minGuidePrice": 180000,
  "guideMsg": "4개 층 주 1회 방문 기준 3개월 최소 권장 하한선은 180,000원(월 60,000원)입니다."
}
```

### 2.2 독립 전용 SQL 쿼리 ID 및 쿼리문

- **USER-REQ-01-SQL-001** (정기청소 구역 중분류 코드 목록 조회)
  ```sql
  SELECT 
    COM_CD AS areaCd,
    COM_NM AS areaNm,
    CAST(ATTR_VAL_1 AS UNSIGNED) AS basePrice3M,
    ATTR_VAL_2 AS calcType,
    SORT_ORD AS sortOrd
  FROM TB_COM_CODE
  WHERE GRP_CD = 'REGULAR_CLEAN_AREA' AND USE_YN = 'Y'
  ORDER BY SORT_ORD ASC;
  ```

- **USER-REQ-01-SQL-002** (방문 주기 코드 목록 조회)
  ```sql
  SELECT 
    COM_CD AS cycleCd,
    COM_NM AS cycleNm,
    CAST(ATTR_VAL_1 AS UNSIGNED) AS monthlyVisitCnt,
    SORT_ORD AS sortOrd
  FROM TB_COM_CODE
  WHERE GRP_CD = 'VISIT_CYCLE' AND USE_YN = 'Y'
  ORDER BY SORT_ORD ASC;
  ```

---

## 3. 프론트엔드 UI 컴포넌트 명세

### 3.1 파일 위치
- 메인 컴포넌트: [`SsulDak_Web/User/frontend/USER-REQ-01/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-01/index.tsx)
- Re-export 파일: [`SsulDak_Web/User/frontend/USER-REQ-01/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-01/index.jsx)

### 3.2 Props 및 데이터 교환 인터페이스
```typescript
export interface RegularItemToAdd {
  areaCd: string;
  areaNm: string;
  startFloor?: number | string;
  endFloor?: number | string;
  cycleCd: string;
  cycleNm: string;
  propAmt: number;
}

export interface UserReq01ModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAddItem?: (item: RegularItemToAdd) => void;
  apiEndpoint?: string;
  isStandalone?: boolean;
}
```

### 3.3 화면 UI/UX 구성요소

1. **Top Accent & Header**:
   - 상단 그라디언트 액센트 바 (`#163b66` ~ `#00254a` ~ `#006c4a`).
   - `TB_COM_CODE 연동` 및 `정기청소 구역 설정` 상태 뱃지.
   - 모달 닫기 버튼 (`close` 아이콘).
   - 타이틀: `"정기청소 중분류 구역 추가"`.

2. **Section 1: 청소 관리 구역 선택 (Subcategory Grid)**:
   - 6대 대표 구역 카드 그리드:
     1) **계단 청소** (`STAIR`): 복도 난간 및 손잡이, 계단 바닥 청소 (기본 선택)
     2) **건물 주위 / 외곽** (`SURROUND`): 필로티 주차장, 건물 외곽 정돈
     3) **지하 창고 / 공용공간** (`BASEMENT`): 지하 기계실 복도 및 방재실 주변
     4) **지하 주차장** (`PARKING`): 바닥 물청소 및 배수로 관리
     5) **복도 / 난간** (`CORRIDOR`): 각 층 공용 복도 벽면 및 창틀
     6) **쓰레기 분리수거장** (`RECYCLE`): 재활용 분리함 및 거치대 정돈
   - 선택 상태: Deep Navy 2px Ring 테두리 + Ice Blue 배경 + Check 아이콘 활성화.

3. **Section 2: 작업 범위 및 방문 주기 (Scope & Frequency Config)**:
   - **작업 층수 범위**:
     * 시작 층 셀렉트: 지하 1층(B1), 1층(지상), 2층, 3층
     * 끝 층 셀렉트: 2층, 3층, 4층(최상층), 5층(옥상포함)
     * 총 층수 계산 뱃지: `"총 N개 층 작업"` 자동 연산 출력.
   - **방문 주기**:
     * 주 1회 방문 (월 4회 기준), 주 2회, 주 3회, 격주 1회.
     * 안내 문구: `"통상적인 빌라·상가 기본 주기로 파트너들의 입찰 참여율이 가장 높습니다."`

4. **Section 3: 3개월 희망 단가 및 권장 가이드 (Pricing Input)**:
   - 대형 숫자 입력 인풋: 천 단위 콤마 및 월 환산 금액 뱃지 (`월 환산 60,000원`).
   - 최소 권장 하한선 가이드 박스:
     * 안내 문구: `"4층 빌라 계단청소 3개월 최소 권장 하한선은 180,000원(월 6만 원)입니다."`
     * 하한선 미만 입력 시 Amber/Red 경고 출력: `"※ 입력하신 금액이 권장 하한선보다 낮습니다. 입찰 참여 파트너 수가 감소할 수 있습니다."`

5. **Section 4: 추가 예정 요약 프리뷰 (Summary Preview)**:
   - 예시: `[계단 청소 (1~4층)] · 주 1회 · 3개월 180,000원 (월 60,000원)`

6. **Footer Action Bar**:
   - `[ 취소 ]` 버튼 -> 모달 닫기.
   - `[ 선택 구역 추가하기 ]` 버튼 -> 부모 화면(`USER-REQ-00`)의 `onAddItem`으로 데이터 전달 후 모달 닫기.

---

## 4. 부모 화면 (`USER-REQ-00`) 연동 명세

- 부모 화면 [`USER-REQ-00/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-00/index.tsx)의 Section 2(정기청소 과업 구역 목록)에서 `+ 구역 추가 (USER-REQ-01)` 버튼 클릭 시 모달이 오픈됩니다.
- 모달에서 선택 완료 시 부모의 `handleAddRegularItemFromReq01` 핸들러가 호출되어 `regularItems` 상태 배열에 신규 항목이 추가되고, 신청서 종합 견적 합계액 및 슬롯 목록이 실시간으로 재계산됩니다.

---

## 5. 검증 및 테스트 결과

| 테스트 항목 | 테스트 방법 | 결과 |
| :--- | :--- | :---: |
| **초기 공통코드 조회 API** | `POST /api/user/user_req_01` (`mode: GET_INIT_CODES`) 호출 | **PASS** (정기청소 7종, 방문주기 5종 반환) |
| **권장 하한선 실시간 연산 API** | `POST /api/user/user_req_01` (`mode: CALC_GUIDE_PRICE`) 호출 | **PASS** (4층 주 1회 180,000원, 5층 주 2회 360,000원 정확 연산) |
| **모달 렌더링 및 스타일** | `#user-req-01` 브라우저 접속 (블러 배경 + 620px 카드 모달) | **PASS** (HTML 목업과 100% 동일 렌더링) |
| **구역 카드 선택 전환** | '계단 청소' -> '지하 주차장' -> '계단 청소' 클릭 | **PASS** (선택 테두리, 체크/더하기 아이콘 정상 전환) |
| **층수 선택 및 총 층수 뱃지** | 1~4층 -> 2~5층 변경 시 총 층수 뱃지 및 가이드 문구 갱신 | **PASS** |
| **견적 신청서 품목 추가 연동** | '선택 구역 추가하기' 클릭 시 `USER-REQ-00` 목록에 신규 구역 반영 | **PASS** (계단 청소 1~4층 항목 정상 삽입 확인) |
| **부모 화면 내 모달 호출 및 닫기** | `USER-REQ-00`의 '+ 구역 추가' 버튼 클릭 -> '취소' 및 닫기 버튼 | **PASS** (모달 열림/닫힘 완벽 작동) |
