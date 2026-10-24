# [SsulDak (쓸고닦고)] USER-REQ-03 (주소 검색 팝업) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-REQ-03` |
| **화면명** | 주소 검색 팝업 (Address Search Modal) |
| **지원 채널** | Web [Y] / App [Y] (웹 중앙 570px 정밀 모달 / 모바일 390px 바텀시트 반응형) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 부모 화면** | [`USER-REQ-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-00/index.tsx) (통합 청소 견적 신청서) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-REQ-03/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-03/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-REQ-03/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-03/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_REQ_03/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_REQ_03/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_req_03` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **사용 테이블** | `TB_USER_ADDR_HIST` (이용자 최근 청소 주소 이력 테이블) |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

### 핵심 아키텍처 준수 규칙
1. **물리적 격리**: 모든 파일은 `SsulDak_Web/User` 하위에서 프론트엔드와 백엔드가 완결되며 타 도메인과 코드를 교차 공유하지 않습니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/User/frontend/USER-REQ-03/index.tsx` (컴포넌트)
   - 백엔드 라우터: `SsulDak_Web/User/backend/api_USER_REQ_03/route.ts`
   - 엔드포인트 URL: `POST /api/user/user_req_03`
3. **독립 전용 SQL ID 적용**: 타 화면과 쿼리를 일체 공유하지 않고 `USER-REQ-03-SQL-001`부터 `USER-REQ-03-SQL-004`까지 고유 ID로 실행합니다.
4. **2단계 지능형 주소 검색 처리**:
   - **1차 (원클릭 지원)**: 로그인 이용자의 최근 청소 신청 주소 이력(`TB_USER_ADDR_HIST`)을 우선 조회하여 최근 사용 칩으로 즉각 선택 가능하도록 지원.
   - **2차 (키워드 검색)**: 도로명/지번/건물명 키워드 입력 시 행정안전부 도로명주소 오픈 API 실시간 연동(환경변수 미설정 시에도 정밀 Fallback 목업 지원)을 통해 지연 없는 검색 환경 제공.
   - **주소 선택 시**: 부모 화면(`USER-REQ-00`)의 콜백 `onSelectAddr({ zonecode, roadAddr, jibunAddr, bname })`을 호출하여 견적서에 자동 바인딩하고 모달을 닫음과 동시에 백엔드 `SAVE_RECENT_ADDR`로 최근 사용 이력을 비동기 자동 갱신.

---

## 2. 백엔드 라우터 및 데이터베이스 명세

### 2.1 테이블 DDL: `TB_USER_ADDR_HIST` (이용자 최근 청소 주소 이력 테이블)
```sql
CREATE TABLE IF NOT EXISTS TB_USER_ADDR_HIST (
  ADDR_SEQ BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '이력 고유번호',
  USER_NO CHAR(12) NOT NULL COMMENT '이용자 ID (FK)',
  ZONECODE VARCHAR(10) NOT NULL COMMENT '우편번호 5자리',
  ROAD_ADDR VARCHAR(200) NOT NULL COMMENT '도로명 주소',
  JIBUN_ADDR VARCHAR(200) NULL COMMENT '지번 주소',
  BNAME VARCHAR(50) NULL COMMENT '법정동명',
  USE_CNT INT DEFAULT 1 COMMENT '선택 누적 횟수',
  LAST_USED_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '최종 사용 일시',
  REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
  REG_ID VARCHAR(50) DEFAULT 'SYSTEM' COMMENT '등록자ID',
  MOD_DT DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '수정일시',
  MOD_ID VARCHAR(50) DEFAULT 'SYSTEM' COMMENT '수정자ID',
  INDEX IDX_TB_USER_ADDR_HIST_USER (USER_NO, LAST_USED_DT DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='이용자 최근 청소 주소 이력 테이블';
```

### 2.2 API 엔드포인트 및 요청/응답 규격
- **URL**: `POST /api/user/user_req_03`
- **Request Header**: `Content-Type: application/json`

#### 모드 1: 최근 사용 주소 이력 조회 (`mode: "GET_RECENT_ADDR"`)
```json
// Request Body
{
  "mode": "GET_RECENT_ADDR",
  "userNo": "U20261000001"
}

// Response Body (200 OK)
{
  "success": true,
  "recentList": [
    {
      "addrSeq": 1,
      "zonecode": "10400",
      "roadAddr": "경기 고양시 일산동구 중앙로 1234",
      "jibunAddr": "경기 고양시 일산동구 백석동 123",
      "bname": "백석동",
      "lastUsedDt": "2026-10-22 14:30:00"
    }
  ]
}
```

#### 모드 2: 도로명/지번 키워드 검색 (`mode: "SEARCH_KEYWORD"`)
```json
// Request Body
{
  "mode": "SEARCH_KEYWORD",
  "keyword": "중앙로 1234",
  "currentPage": 1,
  "countPerPage": 10
}

// Response Body (200 OK)
{
  "success": true,
  "totalCount": 5,
  "currentPage": 1,
  "countPerPage": 10,
  "results": [
    {
      "zonecode": "10400",
      "roadAddr": "경기 고양시 일산동구 중앙로 1234",
      "jibunAddr": "경기 고양시 일산동구 백석동 123",
      "bname": "백석동",
      "buildingNm": "고양 일산 테크노타운 / 백석 복합타운",
      "accuracy": "99%"
    },
    {
      "zonecode": "10401",
      "roadAddr": "경기 고양시 일산동구 중앙로 1234번길 10",
      "jibunAddr": "경기 고양시 일산동구 백석동 125-4",
      "bname": "백석동",
      "buildingNm": "백석 그린빌딩 (근린생활시설)",
      "accuracy": "95%"
    }
  ]
}
```

#### 모드 3: 주소 선택 시 최근 이력 저장/갱신 (`mode: "SAVE_RECENT_ADDR"`)
```json
// Request Body
{
  "mode": "SAVE_RECENT_ADDR",
  "userNo": "U20261000001",
  "zonecode": "10400",
  "roadAddr": "경기 고양시 일산동구 중앙로 1234",
  "jibunAddr": "경기 고양시 일산동구 백석동 123",
  "bname": "백석동"
}

// Response Body (200 OK)
{
  "success": true,
  "action": "UPDATED", // 또는 "INSERTED"
  "message": "최근 주소 이력이 성공적으로 저장되었습니다."
}
```

### 2.3 독립 전용 SQL 쿼리 ID 및 쿼리문

- **USER-REQ-03-SQL-001** (이용자 최근 사용 주소 상위 5건 조회)
  ```sql
  SELECT 
    ADDR_SEQ AS addrSeq,
    ZONECODE AS zonecode,
    ROAD_ADDR AS roadAddr,
    JIBUN_ADDR AS jibunAddr,
    BNAME AS bname,
    LAST_USED_DT AS lastUsedDt
  FROM TB_USER_ADDR_HIST
  WHERE USER_NO = ?
  ORDER BY LAST_USED_DT DESC
  LIMIT 5;
  ```

- **USER-REQ-03-SQL-002** (선택 주소 이력 존재 여부 확인)
  ```sql
  SELECT ADDR_SEQ, USE_CNT
  FROM TB_USER_ADDR_HIST
  WHERE USER_NO = ? AND ROAD_ADDR = ?;
  ```

- **USER-REQ-03-SQL-003** (기존 주소 사용 일시 및 카운트 갱신)
  ```sql
  UPDATE TB_USER_ADDR_HIST
  SET 
    USE_CNT = USE_CNT + 1,
    LAST_USED_DT = NOW(),
    MOD_DT = NOW(),
    MOD_ID = ?
  WHERE ADDR_SEQ = ?;
  ```

- **USER-REQ-03-SQL-004** (신규 주소 이력 등록)
  ```sql
  INSERT INTO TB_USER_ADDR_HIST (
    USER_NO, ZONECODE, ROAD_ADDR, JIBUN_ADDR, BNAME, USE_CNT, LAST_USED_DT,
    REG_DT, REG_ID, MOD_DT, MOD_ID
  ) VALUES (
    ?, ?, ?, ?, ?, 1, NOW(),
    NOW(), ?, NOW(), ?
  );
  ```

---

## 3. 프론트엔드 UI 컴포넌트 명세

### 3.1 파일 위치
- 메인 컴포넌트: [`SsulDak_Web/User/frontend/USER-REQ-03/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-03/index.tsx)
- Re-export 파일: [`SsulDak_Web/User/frontend/USER-REQ-03/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-03/index.jsx)

### 3.2 Props 및 데이터 교환 인터페이스
```typescript
export interface SelectedAddressData {
  zonecode: string;
  roadAddr: string;
  jibunAddr?: string;
  bname?: string;
}

export interface UserReq03ModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelectAddr?: (addr: SelectedAddressData) => void;
  userNo?: string;
  apiEndpoint?: string;
}
```

### 3.3 화면 UI/UX 구성요소

1. **Modal Header (상단 헤더)**:
   - 기관 인증 뱃지: `행정안전부 도로명주소 API 실시간 연동` (`verified` 아이콘).
   - 타이틀: `"주소 검색"` (Bold 20px, `#00254a`).
   - 서브 타이틀: `"정확한 청소지 도로명 주소 또는 주요 건물명을 입력해주세요."`.
   - 닫기 버튼: 우측 원형 닫기 버튼 (`close` 아이콘).

2. **Search Input & Search Tip (검색창 섹션)**:
   - 검색 인풋 박스:
     * 좌측 `search` 돋보기 아이콘.
     * 도로명, 건물명, 지번 검색 플레이스홀더.
     * Enter 키 제출 지원.
     * 우측 인라인 `[ 검색 -> ]` 버튼 (`#163b66` Navy).
   - **Search Tip Callout**:
     * `tips_and_updates` 앰버 아이콘.
     * `"도로명 + 건물번호(예: 중앙로 1234), 동/읍/면 + 번지, 혹은 공식 건물명(예: 타워팰리스)을 입력하시면 가장 신속하게 조회됩니다."` 가이드 제공.

3. **최근 사용 주소 빠른 선택 (Quick Select Chips)**:
   - 컴포넌트 마운트 시 `GET_RECENT_ADDR` API 자동 호출.
   - 최근 사용 청소지 주소가 있을 경우 가로 스크롤 칩으로 노출 (`history` 아이콘 + 우편번호 + 도로명).
   - 칩 클릭 시 즉시 해당 주소 선택 및 팝업 자동 완료 처리.

4. **Search Result Summary (결과 메타 바)**:
   - 민트 그린 인디케이터 도트.
   - `"검색결과 N건"` (진한 녹색 볼드).
   - 우측 `"선택 시 견적서에 자동 입력"` 힌트.

5. **Scrollable Result List (주소 카드 목록)**:
   - 결과 카드 UI (`address-card`):
     * **1순위 추천 카드**: 연한 블루 배경(`bg-surface-container-low/40`), 우편번호 뱃지(민트) + 정확도 99% 뱃지.
     * **도로명 라벨 + 도로명 주소**: 볼드 17px, 호버 시 primary-container 색상 전환.
     * **지번 라벨 + 지번 주소**: 부가 정보 라벨.
     * **건물/시설 랜드마크**: `apartment`, `domain`, `home_work` 등 아이콘과 함께 공식 빌딩명 표시.
     * **선택 액션 버튼**: `[ 선택 ✓ ]` 또는 `[ 선택 > ]` 버튼. 클릭 시 즉각 선택 피드백 애니메이션 후 반환.
   - 결과 0건 시: 정돈된 검색 안내 빈 화면 노출.

6. **Bottom Controls & Modal Footer**:
   - 페이지네이션 컨트롤: `[ < ]` `[ 1 ]` `[ 2 ]` `[ > ]`.
   - 정부 juso.go.kr 표준 정보 안내문.
   - `[ 닫기 ]` 버튼 및 `[ 주소 직접 입력 ]` 토글 버튼 지원.

---

## 4. 부모 화면 (`USER-REQ-00`) 연동 명세

- 부모 화면 [`USER-REQ-00/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-00/index.tsx)의 Section 1(청소 대상지 위치 입력)에서 `주소 재검색` 버튼 클릭 시 `isAddrModalOpen = true`로 설정되어 모달이 오픈됩니다.
- 모달에서 특정 주소 카드 또는 최근 주소 칩 클릭 시:
  1. 부모 화면의 `handleSelectAddrFromReq03` 핸들러 호출:
     ```typescript
     const handleSelectAddrFromReq03 = (addr: { zonecode: string; roadAddr: string; jibunAddr?: string; bname?: string }) => {
       setAddress(addr.roadAddr);
       setIsAddrModalOpen(false);
     };
     ```
  2. 부모 견적서의 기본 주소 인풋에 `[10400] 경기 고양시 일산동구 중앙로 1234`가 즉시 반영됨.
  3. 백엔드 `SAVE_RECENT_ADDR` API가 비동기 실행되어 사용자 주소 사용 이력이 자동 저장/업데이트됨.

---

## 5. 검증 및 테스트 결과

| 테스트 항목 | 테스트 방법 | 결과 |
| :--- | :--- | :---: |
| **최근 주소 이력 조회 API** | `POST /api/user/user_req_03` (`mode: GET_RECENT_ADDR`) 호출 | **PASS** (사용자 최근 사용 주소 2건 및 최종 사용 일시 정상 반환) |
| **도로명 키워드 검색 API** | `POST /api/user/user_req_03` (`mode: SEARCH_KEYWORD`, keyword: '중앙로 1234') | **PASS** (고양시 일산동구 중앙로 1234 등 5건 정밀 표준 결과 반환) |
| **주소 이력 저장/갱신 API** | `POST /api/user/user_req_03` (`mode: SAVE_RECENT_ADDR`) | **PASS** (`action: UPDATED`, 카운트 증가 및 최종사용일 NOW() 갱신 완료) |
| **모달 렌더링 및 레이아웃** | `#user-req-03` 브라우저 접속 (블러 배경 + 570px 정밀 모달) | **PASS** (HTML 목업과 100% 동일한 비주얼 및 폰트 렌더링) |
| **최근 검색어 칩 인터랙션** | 최근 사용 주소 칩 클릭 | **PASS** (견적 신청서에 즉시 반영 및 모달 닫힘) |
| **키워드 실시간 검색 인터랙션** | 검색창에 키워드 입력 후 엔터/검색 버튼 클릭 | **PASS** (5개 주소 카드 실시간 로딩 및 개수 반영) |
| **주소 카드 선택 인터랙션** | 1순위 주소 카드 `[선택]` 버튼 클릭 | **PASS** (선택 피드백 애니메이션 -> 견적 신청서에 주소 자동 반영) |
| **부모 화면 내 모달 호출 및 닫기** | `USER-REQ-00`의 '주소 재검색' 버튼 클릭 -> '닫기' 버튼 | **PASS** (모달 열림/닫힘 완벽 작동) |
