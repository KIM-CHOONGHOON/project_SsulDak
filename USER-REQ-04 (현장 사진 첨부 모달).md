# [SsulDak (쓸고닦고)] USER-REQ-04 (현장 사진 첨부 모달) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `USER-REQ-04` |
| **화면명** | 현장 사진 첨부 모달 (Site Condition Photo Attachment Modal) |
| **지원 채널** | Web [Y] / App [Y] (웹 중앙 620px 정밀 모달 / 모바일 390px 바텀시트 반응형) |
| **도메인 역할** | `User` (이용자 전용) |
| **호출 부모 화면** | [`USER-REQ-00`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-00/index.tsx) (통합 청소 견적 신청서) |
| **프론트엔드 파일** | [`SsulDak_Web/User/frontend/USER-REQ-04/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-04/index.tsx)<br>[`SsulDak_Web/User/frontend/USER-REQ-04/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-04/index.jsx) |
| **백엔드 라우터 파일** | [`SsulDak_Web/User/backend/api_USER_REQ_04/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/backend/api_USER_REQ_04/route.ts) |
| **API 엔드포인트** | `POST /api/user/user_req_04` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **사용 테이블** | `TB_CLEAN_REQ_PHOTO` (현장 첨부 사진 마스터), `TB_COM_CODE` (업로드 정책 코드) |
| **DB 모듈 경로** | `@/lib/db` ([`lib/db.ts`](file:///Users/handsupbus/project_SsulDak/lib/db.ts)) |

### 핵심 아키텍처 준수 규칙
1. **물리적 격리**: 모든 파일은 `SsulDak_Web/User` 하위에서 프론트엔드와 백엔드가 완결되며 타 도메인과 코드를 교차 공유하지 않습니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/User/frontend/USER-REQ-04/index.tsx` (컴포넌트)
   - 백엔드 라우터: `SsulDak_Web/User/backend/api_USER_REQ_04/route.ts`
   - 엔드포인트 URL: `POST /api/user/user_req_04`
3. **독립 전용 SQL ID 적용**: 타 화면과 쿼리를 일체 공유하지 않고 `USER-REQ-04-SQL-001`부터 `USER-REQ-04-SQL-003`까지 고유 ID로 실행합니다.
4. **사진 업로드 및 관리 규칙**:
   - 최대 5장까지 등록 가능 (1장당 용량 제한: 10MB 이하, JPG/PNG/WEBP/HEIC 포맷).
   - Base64 미리보기 및 서버 로컬 업로드 URL(`/uploads/req_photos/`)을 생성하여 부모 화면으로 안전하게 전달.
   - 단건 삭제 시 슬롯 순번(`sortOrd`)이 1번부터 연속되도록 자동 재정렬 및 첫 번째 항목에 '대표 사진' 뱃지 자동 부여.
   - 모바일 환경 카메라 촬영(`capture="environment"`) 및 PC 파일 드래그 앤 드롭 완벽 지원.

---

## 2. 백엔드 라우터 및 데이터베이스 명세

### 2.1 테이블 DDL: `TB_CLEAN_REQ_PHOTO` (현장 첨부 사진 마스터)
```sql
CREATE TABLE IF NOT EXISTS TB_CLEAN_REQ_PHOTO (
  PHOTO_SEQ BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '사진 일련번호 (PK)',
  REQ_NO CHAR(16) NOT NULL COMMENT '견적 요청서 번호 (임시 등록 시 TEMP)',
  PHOTO_URL VARCHAR(500) NOT NULL COMMENT '사진 접근/저장 URL',
  FILE_NAME VARCHAR(200) NULL COMMENT '원본파일명',
  FILE_SIZE INT NULL COMMENT '파일 크기 (바이트)',
  SORT_ORD TINYINT DEFAULT 1 COMMENT '정렬 순번 (1~5)',
  REG_DT DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '등록일시',
  REG_ID VARCHAR(50) DEFAULT 'SYSTEM' COMMENT '등록자 ID',
  INDEX IDX_REQ_PHOTO_REQ (REQ_NO)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='견적요청 현장 첨부 사진 마스터';
```

### 2.2 공통 코드: 업로드 정책 (`TB_COM_CODE`)
- `GRP_CD = 'FILE_UPLOAD_POLICY'`
- `COM_CD = 'MAX_REQ_PHOTO_CNT'`
- `ATTR_VAL_1 = '5'` (최대 업로드 허용 장수)
- `ATTR_VAL_2 = 'jpg,jpeg,png,webp,heic'` (허용 확장자)

### 2.3 API 엔드포인트 및 요청/응답 규격
- **URL**: `POST /api/user/user_req_04`
- **Request Header**: `Content-Type: application/json`

#### 모드 1: 업로드 정책 조회 (`mode: "GET_UPLOAD_POLICY"`)
```json
// Request Body
{
  "mode": "GET_UPLOAD_POLICY"
}

// Response Body (200 OK)
{
  "success": true,
  "policy": {
    "maxCount": 5,
    "allowedExt": ["jpg", "jpeg", "png", "webp", "heic"],
    "maxFileSizeMb": 10
  }
}
```

#### 모드 2: 사진 업로드 (`mode: "UPLOAD_PHOTO"`)
```json
// Request Body
{
  "mode": "UPLOAD_PHOTO",
  "userNo": "U20261000001",
  "fileName": "stair_dirty.jpg",
  "fileBase64": "data:image/jpeg;base64,...",
  "fileSize": 2516582,
  "sortOrd": 1
}

// Response Body (200 OK)
{
  "success": true,
  "message": "사진이 성공적으로 업로드되었습니다.",
  "photo": {
    "photoSeq": 4,
    "photoUrl": "/uploads/req_photos/1792682956177_i454zv.jpg",
    "fileName": "stair_dirty.jpg",
    "fileSize": 2516582,
    "sortOrd": 1
  }
}
```

#### 모드 3: 임시 사진 삭제 (`mode: "DELETE_PHOTO"`)
```json
// Request Body
{
  "mode": "DELETE_PHOTO",
  "userNo": "U20261000001",
  "photoUrl": "/uploads/req_photos/1792682956177_i454zv.jpg"
}

// Response Body (200 OK)
{
  "success": true,
  "message": "사진이 정상적으로 삭제되었습니다."
}
```

### 2.4 독립 전용 SQL 쿼리 ID 및 쿼리문

- **USER-REQ-04-SQL-001** (업로드 정책 확인: 최대 장수 및 허용 확장자 조회)
  ```sql
  SELECT COM_CD, ATTR_VAL_1 AS maxCount, ATTR_VAL_2 AS allowedExt
  FROM TB_COM_CODE
  WHERE GRP_CD = 'FILE_UPLOAD_POLICY' AND COM_CD = 'MAX_REQ_PHOTO_CNT' AND USE_YN = 'Y';
  ```

- **USER-REQ-04-SQL-002** (단일 사진 업로드 메타데이터 임시 등록)
  ```sql
  INSERT INTO TB_CLEAN_REQ_PHOTO (
    REQ_NO, PHOTO_URL, FILE_NAME, FILE_SIZE, SORT_ORD, REG_DT, REG_ID
  ) VALUES (
    'TEMP', ?, ?, ?, ?, NOW(), ?
  );
  ```

- **USER-REQ-04-SQL-003** (임시 사진 삭제)
  ```sql
  DELETE FROM TB_CLEAN_REQ_PHOTO
  WHERE (PHOTO_URL = ? OR PHOTO_URL LIKE ?) AND REQ_NO = 'TEMP';
  ```

---

## 3. 프론트엔드 UI 컴포넌트 명세

### 3.1 파일 위치
- 메인 컴포넌트: [`SsulDak_Web/User/frontend/USER-REQ-04/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-04/index.tsx)
- Re-export 파일: [`SsulDak_Web/User/frontend/USER-REQ-04/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-04/index.jsx)

### 3.2 Props 및 데이터 교환 인터페이스
```typescript
export interface SitePhotoItem {
  id: string;
  photoUrl: string;
  fileName: string;
  fileSize: number; // bytes
  sortOrd: number;
  category?: string;
  isPrimary?: boolean;
}

export interface UserReq04ModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSavePhotos?: (photos: SitePhotoItem[]) => void;
  initialPhotos?: (SitePhotoItem | string)[];
  userNo?: string;
  apiEndpoint?: string;
}
```

### 3.3 화면 UI/UX 구성요소

1. **Modal Header (상단 헤더)**:
   - `add_photo_alternate` 아이콘 (`bg-surface-container-high text-primary-container`).
   - 타이틀: `"현장 사진 첨부"` (Bold 20px, `#00254a`).
   - 등록 카운터 뱃지: `"N / 5 등록됨"` (`bg-[#82f5c1]/40 text-[#00714e]`).
   - 닫기 버튼: 우측 원형 닫기 버튼 (`close` 아이콘).
   - 안내 문구: `"오염 부위, 계단 난간, 가전 기종 및 라벨 사진을 등록하시면 마스터 파트너의 정확한 견적 산출과 불필요한 현장 추가금 방지에 큰 도움이 됩니다."`.

2. **5 Slots Layout Grid (3x2 Desktop / 반응형 모바일)**:
   - **등록된 사진 슬롯 (Aspect 4:3)**:
     * 고화질 배경 썸네일 (`bg-cover bg-center`).
     * 어두운 그라디언트 스크림 오버레이.
     * 상단 좌측: 1번 사진인 경우 `"대표 사진"` 청록색 뱃지(`star` 아이콘 포함), 그 외 `#N` 순번 뱃지.
     * 상단 우측: 원형 삭제 버튼 (호버 시 레드 스타일 전환, 클릭 시 즉시 제거 및 순번 재정렬).
     * 하단: 파일명, 카테고리/용량(MB) 표시.
   - **사진 추가 드롭존 트리거**:
     * 5장 미만일 때 노출되는 점선 테두리 대화형 타일.
     * `add_a_photo` 아이콘 (호버 시 크기 확대), `+ 사진 추가`, `클릭 또는 파일 끌어놓기`, `최대 10MB`.
     * 숨김 `<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic" />`.
     * 파일 드래그 앤 드롭(`dragOver`) 시 테두리 색상 강조.
   - **대기 중 빈 슬롯**:
     * 5개 슬롯 중 아직 등록되지 않은 칸에 `crop_original` 아이콘 및 `슬롯 0N / 대기 중` 표시.
   - **6번째 장식 타일 (100% 안심 보장)**:
     * `verified_user` 아이콘, `"100% 안심 보장"`, `"사진 촬영 등록 시 불필요한 현장 추가 비용 발생율이 94% 감소합니다."`, 펄스 인디케이터 도트.

3. **Guide & Photography Tips Card (촬영 가이드)**:
   - 전구(`lightbulb`) 아이콘 및 설명.
   - 3대 권장 구역 카드:
     1) **계단 / 복도** (`stairs`): 1층 입구부터 최상층까지 바닥재와 난간.
     2) **가전 제품** (`mode_fan`): 제조사 스티커 모델명 및 냉각팬 상태.
     3) **특이 사항** (`warning`): 파손 위험 요소, 고장 부위, 특수 오염.

4. **Upload Status & Capacity Bar**:
   - `task_alt` 아이콘, `총 N개 파일 등록 완료`, `(N.N MB / 최대 50MB)`, `지원 포맷: JPG, PNG, WEBP, HEIC (파일당 10MB)`.

5. **Modal Footer (하단 액션 바)**:
   - 좌측: `[ 전체 삭제 ]` (`delete_sweep` 아이콘, 등록 사진 없을 시 비활성화).
   - 우측: `[ 취소 ]` 및 `[ 사진 첨부 완료 (N장) ]` (`check_circle` 민트 아이콘, Primary Navy `#00254a`, 클릭 시 부모 콜백 전달 후 모달 닫힘).

---

## 4. 부모 화면 (`USER-REQ-00`) 연동 명세

- 부모 화면 [`USER-REQ-00/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/User/frontend/USER-REQ-00/index.tsx) Section 6(현장 사진 첨부 박스)에서:
  - `사진 추가` 버튼 클릭 시 `showPhotoModal = true`로 설정되어 모달이 오픈됩니다.
  - 상단 `수정/상세 관리` 버튼 클릭 시에도 모달이 오픈됩니다.
  - 첨부된 썸네일 클릭 시에도 모달이 오픈되어 사진 상세 관리 및 추가/삭제가 가능합니다.
- 모달에서 `사진 첨부 완료` 클릭 시:
  ```typescript
  const handleSavePhotosFromReq04 = (photos: SitePhotoItem[]) => {
    setSitePhotos(photos);
    setPhotoUrls(photos.map((p) => p.photoUrl));
    setShowPhotoModal(false);
    showToast(`현장 사진 ${photos.length}장이 견적서에 성공적으로 반영되었습니다.`, 'success');
  };
  ```
  부모 화면의 `photoUrls` 및 `sitePhotos` 상태가 갱신되어 견적서에 즉각 반영됩니다.

---

## 5. 검증 및 테스트 결과

| 테스트 항목 | 테스트 방법 | 결과 |
| :--- | :--- | :---: |
| **업로드 정책 조회 API** | `POST /api/user/user_req_04` (`mode: GET_UPLOAD_POLICY`) 호출 | **PASS** (최대 5장, JPG/PNG/WEBP/HEIC, 10MB 반환) |
| **사진 업로드 API** | `POST /api/user/user_req_04` (`mode: UPLOAD_PHOTO`, Base64 데이터 전송) | **PASS** (`photoSeq: 4`, `/uploads/req_photos/` 저장 완료) |
| **사진 삭제 API** | `POST /api/user/user_req_04` (`mode: DELETE_PHOTO`) | **PASS** (로컬 파일 및 DB 임시 레코드 정상 삭제) |
| **모달 렌더링 및 비주얼** | `#user-req-04` 브라우저 접속 (블러 배경 + 620px 정밀 모달) | **PASS** (제공된 HTML 목업과 100% 일치) |
| **사진 단건 삭제 인터랙션** | 2번 슬롯 삭제 버튼 클릭 | **PASS** (순번 1개로 재정렬 및 '1 / 5 등록됨' 실시간 갱신) |
| **사진 첨부 완료 액션** | '사진 첨부 완료 (1장)' 버튼 클릭 | **PASS** (부모 화면 복귀 및 견적서 반영 알림) |
| **부모 화면 내 모달 호출 및 닫기** | `USER-REQ-00` Section 6 '수정/상세 관리' 클릭 -> 모달 오픈 | **PASS** (열기/닫기 완벽 작동) |
