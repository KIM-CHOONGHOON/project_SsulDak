# [SsulDak (쓸고닦고)] USER-REQ-02 (계절가전 중분류 추가 모달) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-REQ-02` |
| **화면명** | 계절가전 중분류 품목 추가 모달 (Seasonal Appliance Subcategory Modal) |
| **지원 채널** | Web [Y] / App [Y] (웹 중앙 620px 모달 / 모바일 390px 바텀시트 반응형) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 부모 화면** | [`USER-REQ-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-00/index.tsx) (통합 청소 견적 신청서) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-REQ-02/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-02/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-REQ-02/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-02/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_REQ_02/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_REQ_02/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_req_02` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

### 핵심 아키텍처 준수 규칙
1. **물리적 격리**: 모든 코드는 `SsulDak_Web/User` 하위에서 완결되며, 타 도메인과 코드를 교차 공유하지 않습니다.
2. **1:1 매핑 및 전용 SQL ID 원칙**: 타 화면과 API 및 SQL을 공유하지 않으며, 전용 SQL ID(`USER-REQ-02-SQL-001`, `USER-REQ-02-SQL-002`)를 독립 실행합니다.
3. **가전 기종별 최소 권장 하한선(Floor Guide) 실시간 검증**:
   - 가전 케어는 기종별 분해 난이도(벽걸이 에어컨 80,000원, 스탠드 130,000원, 4Way 시스템 150,000원, 드럼세탁기 120,000원 등)에 따른 권장 하한선(`ATTR_VAL_1`)이 적용됩니다.
   - 단가 입력 시 실시간으로 하한선 준수 여부를 검증하여 `✓ 표준 하한선 준수` 또는 `하한선 미달` 경고 뱃지를 출력합니다.
4. **수량 연동 및 총 가전 용역 금액 산출**:
   - 수량 카운터 Stepper(1~10대) 조작 시 `총 가전 용역 금액 = 대당 희망 단가 * 수량`을 실시간으로 자동 연산합니다.

---

## 2. 백엔드 라우터 및 데이터베이스 명세

### 2.1 API 엔드포인트 및 요청/응답 규격
- **URL**: `POST /api/user/user_req_02`
- **Request Header**: `Content-Type: application/json`

#### 모드 1: 가전 코드 목록 조회 (`mode: "GET_APPLIANCE_CODES"`)
```json
// Request Body
{
  "mode": "GET_APPLIANCE_CODES"
}

// Response Body (200 OK)
{
  "success": true,
  "items": [
    {
      "applianceCd": "AC_WALL",
      "applianceNm": "벽걸이 에어컨",
      "minGuidePrice": 80000,
      "categoryTab": "AIR_CON",
      "sortOrd": 1
    },
    {
      "applianceCd": "AC_STAND",
      "applianceNm": "스탠드형 에어컨",
      "minGuidePrice": 130000,
      "categoryTab": "AIR_CON",
      "sortOrd": 2
    },
    {
      "applianceCd": "WASH_DRUM",
      "applianceNm": "드럼 세탁기 (15kg 이하)",
      "minGuidePrice": 120000,
      "categoryTab": "WASHER",
      "sortOrd": 6
    },
    ...
  ]
}
```

#### 모드 2: 단가 및 수량 유효성 검증 (`mode: "VALIDATE_PRICE"`)
```json
// Request Body
{
  "mode": "VALIDATE_PRICE",
  "applianceCd": "AC_STAND",
  "unitPrice": 130000,
  "quantity": 2
}

// Response Body (200 OK)
{
  "success": true,
  "isValid": true,
  "minGuidePrice": 130000,
  "unitPrice": 130000,
  "quantity": 2,
  "totalAmt": 260000,
  "warningMsg": null
}
```

### 2.2 독립 전용 SQL 쿼리 ID 및 쿼리문

- **USER-REQ-02-SQL-001** (가전케어 품목 및 기준 하한선 단가 목록 조회)
  ```sql
  SELECT 
    COM_CD AS applianceCd,
    COM_NM AS applianceNm,
    CAST(ATTR_VAL_1 AS UNSIGNED) AS minGuidePrice,
    ATTR_VAL_2 AS categoryTab,
    SORT_ORD AS sortOrd
  FROM TB_COM_CODE
  WHERE GRP_CD = 'APPLIANCE_CLEAN_TYPE' AND USE_YN = 'Y'
  ORDER BY SORT_ORD ASC;
  ```

- **USER-REQ-02-SQL-002** (특정 기종의 최소 하한선 단가 단건 조회)
  ```sql
  SELECT 
    COM_CD AS applianceCd,
    COM_NM AS applianceNm,
    CAST(ATTR_VAL_1 AS UNSIGNED) AS minGuidePrice
  FROM TB_COM_CODE
  WHERE GRP_CD = 'APPLIANCE_CLEAN_TYPE' AND COM_CD = ? AND USE_YN = 'Y'
  LIMIT 1;
  ```

---

## 3. 프론트엔드 UI 컴포넌트 명세

### 3.1 파일 위치
- 메인 컴포넌트: [`SsulDak_Web/User/frontend/USER-REQ-02/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-02/index.tsx)
- Re-export 파일: [`SsulDak_Web/User/frontend/USER-REQ-02/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-02/index.jsx)

### 3.2 Props 및 데이터 교환 인터페이스
```typescript
export interface ApplianceItemToAdd {
  applianceCd: string;
  applianceNm: string;
  brand: string;
  modelDetail?: string;
  quantity: number;
  unitPrice: number;
  propAmt: number;
}

export interface UserReq02ModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAddItem?: (item: ApplianceItemToAdd) => void;
  apiEndpoint?: string;
}
```

### 3.3 화면 UI/UX 구성요소

1. **Top Header**:
   - 상단 그라디언트 액센트 바 (`#163b66` ~ `#00254a` ~ `#006c4a`).
   - `TB_COM_CODE 연동` 및 `가전 분해살균 케어` (펄스 인디케이터 포함) 뱃지.
   - 모달 닫기 버튼 (`close` 아이콘).
   - 타이틀: `"가전 케어 제품 추가"`.
   - 서브 타이틀: `"전문 마스터의 완전분해 고압세척 및 피톤치드 살균 소독이 포함된 품목을 선택하세요."`.

2. **Section 1: 케어 대상 가전 구분 (Category Tabs)**:
   - 4대 대표 카테고리 탭:
     1) **에어컨** (`AIR_CON`): `mode_fan` 아이콘
     2) **세탁기** (`WASHER`): `local_laundry_service` 아이콘
     3) **냉장고** (`FRIDGE`): `kitchen` 아이콘
     4) **매트리스** (`MATTRESS`): `bed` 아이콘
   - 탭 선택 시 하단 기종 드롭다운 및 제조사 목록이 해당 대분류에 맞게 실시간 필터링.

3. **Section 2: 기종 및 사양 선택 (Specs & Model Selection)**:
   - **기종 선택**: 대분류에 등록된 `TB_COM_CODE` 목록 자동 연동 및 기본 단가 바인딩.
   - **제조사 선택**:
     * 일반 가전: LG전자, 삼성전자, 캐리어, 위니아, 기타 제조사
     * 매트리스: 에이스침대, 시몬스, 템퍼, 씰리, 지누스, 기타 브랜드
   - **상세 모델명 또는 구입 연식 입력**: 선택 사항 기재 필드.
   - **신청 수량 Stepper**: `[ - ]` / `[ N 대 ]` / `[ + ]` (최소 1대, 최대 10대).

4. **Section 3: 대당 청소 희망 단가 및 하한선 검증**:
   - 대형 숫자 입력 인풋 및 콤마 서식화.
   - 기종 선택 시 해당 기종의 기본 권장단가가 자동 입력됨.
   - **하한선 검증 박스**:
     * 단가 >= 권장하한선: `✓ 표준 하한선 준수` 뱃지 및 친환경 공정 안내.
     * 단가 < 권장하한선: `하한선 미달` 경고 뱃지 및 배차 지연 주의 문구 노출.
   - **총 가전 용역 합산 금액 박스**:
     * `ESTIMATED TOTAL: {totalAmt.toLocaleString()} 원` (`{quantity}대 기준 (VAT 별도)`).

5. **Footer Action Bar**:
   - `[ 취소 ]` 버튼 -> 모달 닫기.
   - `[ 가전 품목 추가하기 ]` 버튼 (Mint Green `#006c4a`, `add_circle` 아이콘) -> 부모 화면(`USER-REQ-00`)의 `onAddItem`으로 데이터 전달 후 모달 닫기.

---

## 4. 부모 화면 (`USER-REQ-00`) 연동 명세

- 부모 화면 [`USER-REQ-00/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-00/index.tsx)의 Section 3(계절 가전 케어 카드)에서 `+ 가전 품목 추가 (USER-REQ-02)` 버튼 클릭 시 모달이 오픈됩니다.
- 모달에서 품목 추가 완료 시 부모의 `handleAddApplianceItemFromReq02` 핸들러가 호출되어 `applianceItems` 상태 배열에 신규 항목이 즉시 추가되고, 전체 신청서의 종합 견적 합계액 및 슬롯 목록이 실시간으로 갱신됩니다.

---

## 5. 검증 및 테스트 결과

| 테스트 항목 | 테스트 방법 | 결과 |
| :--- | :--- | :---: |
| **초기 가전 공통코드 조회 API** | `POST /api/user/user_req_02` (`mode: GET_APPLIANCE_CODES`) 호출 | **PASS** (에어컨 5종, 세탁기 3종, 냉장고 2종, 매트리스 2종 반환) |
| **하한선 단가 유효성 검증 API** | `POST /api/user/user_req_02` (`mode: VALIDATE_PRICE`) 호출 | **PASS** (정상가 통과, 저가 입력 시 warningMsg 반환) |
| **모달 렌더링 및 스타일** | `#user-req-02` 브라우저 접속 (블러 배경 + 620px 카드 모달) | **PASS** (HTML 목업과 100% 동일 렌더링) |
| **대분류 탭 전환 동작** | 에어컨 -> 세탁기 -> 냉장고 -> 매트리스 탭 클릭 | **PASS** (탭별 기종 및 제조사 목록 정상 필터링) |
| **수량 카운터 및 총액 연산** | `[+]`, `[-]` 버튼 클릭 시 수량 1 -> 2 -> 1 및 총액 실시간 연동 | **PASS** |
| **하한선 실시간 검증 피드백** | 50,000원 입력 시 '하한선 미달' 경고 / 130,000원 입력 시 '표준 준수' 전환 | **PASS** |
| **견적 신청서 품목 추가 연동** | '가전 품목 추가하기' 클릭 시 `USER-REQ-00` 목록에 신규 가전 반영 | **PASS** (에어컨 품목 정상 삽입 및 금액 합산) |
| **부모 화면 내 모달 호출 및 닫기** | `USER-REQ-00`의 '+ 가전 품목 추가' 버튼 클릭 -> '취소' 및 닫기 버튼 | **PASS** (모달 열림/닫힘 완벽 작동) |
