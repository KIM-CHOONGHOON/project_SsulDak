# [SsulDak (쓸고닦고)] PTNR-DSH-02 (파트너 프로필 및 포트폴리오 관리) 개발 및 테스트 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `PTNR-DSH-02` |
| **화면명** | 파트너 프로필 및 포트폴리오 관리 (Partner Profile & Portfolio Management) |
| **지원 채널** | Web Console (PC 1440px 최적화) / Mobile Web (390px 반응형) |
| **도메인 역할** | `Partner` (전문가/시공 파트너 전용) |
| **프론트엔드 파일** | `SsulDak_Web/Partner/frontend/PTNR-DSH-02/index.tsx`<br>`SsulDak_Web/Partner/frontend/PTNR-DSH-02/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/Partner/backend/api_PTNR_DSH_02/route.ts` |
| **API 엔드포인트** | `POST /api/partner/ptnr_dsh_02` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |
| **호출 부모 화면** | `PTNR-DSH-00` (파트너 메인 대시보드) |
| **연계 소비자 화면** | `USER-QOT-01` (이용자 견적 확인 시 노출되는 프로필 화면) |

### 핵심 아키텍처 준수 규칙
1. **물리적 격리**: 모든 파트너 관련 소스코드는 `SsulDak_Web/Partner/` 디렉터리 내에서 프론트와 백엔드를 독립 완결하며, `User`(이용자) 및 `Admin`(관리자) 도메인 파일과 코드를 일체 공유하지 않습니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/Partner/frontend/PTNR-DSH-02/index.tsx`
   - 백엔드 라우터: `SsulDak_Web/Partner/backend/api_PTNR_DSH_02/route.ts`
   - 엔드포인트 URL: `POST /api/partner/ptnr_dsh_02`
3. **독립 전용 SQL 원칙**: 타 화면과 쿼리를 일체 공유하지 않으며 오직 `PTNR-DSH-02-SQL-001 ~ PTNR-DSH-02-SQL-005` 전용 SQL ID로 작성 및 트랜잭션을 분리합니다.
4. **비즈니스 룰 및 제약 조건**:
   - **한 줄 소개(`SHORT_INTRO`)**: 최대 50자(최대 60자 허용) 이내. 견적 입찰 카드에 노출되는 핵심 문구.
   - **상세 전문 소개(`INTRO_TEXT`)**: 전문 기술, 사용하는 약품 및 시공 철학(최대 1,000자).
   - **보유 장비 태그(`EQUIP_TAGS`)**: JSON 배열 형태로 저장하며 칩 추가/삭제 지원 (최대 10개).
   - **시공 전/후 포트폴리오(`TB_PARTNER_PORTFOLIO`)**: 시공 전(BEFORE)과 시공 후(AFTER) 세트로 최대 6세트(또는 12개)까지 등록/삭제 지원.
   - **감사 컬럼**: 갱신 시 `MOD_DT = NOW()`, `MOD_ID = ptnrNo` 필수 세팅.

---

## 2. 비즈니스 룰 및 제약 사항

### 2.1 한 줄 소개 및 상세 소개
- **한 줄 소개**: 최대 50자 권장 (최대 60자 제한). 고객 견적 비교 카드에 다이렉트 노출.
- **상세 소개**: 최대 1,000자 제한. 줄바꿈, 친환경 약품 명시, 하자 보증 기간 등 신뢰 요소 포함 권장.

### 2.2 보유 장비 및 인증 태그
- **최대 허용 개수**: 10개
- **기본 인증 태그**:
  - 독일산 크란즐 고압스팀기 (150bar)
  - 산업용 헤파필터 집진기
  - 초미립자 살균소독분무기 (ULV)
  - 보네트 저소음 바닥광택기
  - 유리창 전용 이온수 폴대시스템
  - 에코라벨 인증 중성세제 키트
- **추천 태그**: 피톤치드 연무기, 휠체어 리프트 소독기, 오존 살균 탈취기 등

### 2.3 시공 전/후 비교 갤러리 (Before & After)
- **최대 허용 건수**: 6세트 (Before 6장 + After 6장, 총 12장)
- **대표 시공 지정**: 1순위 포트폴리오에 '대표 시공' 뱃지 부여
- **분할 뷰**: 좌측 BEFORE (오염) + 우측 AFTER (청결) 슬라이스 렌더링

---

## 3. 프론트엔드 (FrontEnd) 구현 명세

### 3.1 파일 경로
- 메인 컴포넌트: [`SsulDak_Web/Partner/frontend/PTNR-DSH-02/index.tsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/Partner/frontend/PTNR-DSH-02/index.tsx)
- Re-export 엔트리: [`SsulDak_Web/Partner/frontend/PTNR-DSH-02/index.jsx`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/Partner/frontend/PTNR-DSH-02/index.jsx)

### 3.2 화면 레이아웃 및 컴포넌트 구조

```
+----------------------------------------------------------------------------------------------------+
| [Top GNB Bar]                                                                                      |
| [SsulDak PARTNER CONSOLE] | [반짝빌라클린 (● 영업 중 ON)]     [홈] [공고목록] [작업관리] [정산] [프로필/지역]  |
| [긴급 핫라인 1588-0000] [알림 4] [이수 대표 (마스터 파트너)] [로그아웃]                                   |
+----------------------------------------------------------------------------------------------------+
| [Breadcrumb & Sub-header Bar]                                                                      |
| [<- 파트너 대시보드로 돌아가기] / 홈 > 대시보드 (PTNR-DSH-00) > 파트너 프로필/지역 설정 > 프로필 관리       |
| 타이틀: 파트너 프로필 및 포트폴리오 관리 [공인 마스터]                       [실시간 고객 노출 중]            |
| 설명: 고객에게 공개되는 공식 프로필과 시공 포트폴리오를 관리합니다.           [고객에게 보이는 프로필 미리보기] |
+----------------------------------------------------------------------------------------------------+
| [Main 12-Column Layout]                                                                            |
| [Left 8-Column: 메인 프로필 및 포트폴리오 폼]       | [Right 4-Column: 완성도 지수 및 모바일 시뮬레이터]   |
|                                                    |                                                    |
| 1. 기본 프로필 및 대표 소개 [고유코드: PT-00001-ILSAN]| 1. 프로필 완성도 지수 카드 (SCORE 92%)              |
|    - 프로필 사진 변경/삭제 (800x800px 정방형)       |    - 원형 SVG 프로그레스 게이지                    |
|    - 사업자 고정 인증 정보 (상호, 대표자, 등록번호) |    - 5대 항목 완료 체크리스트                      |
|    - 대표 한 줄 소개 인풋 (글자수 카운터 N/50자)   |                                                    |
|    - 상세 전문 소개 텍스트영역 (글자수 N/1000자)   | 2. 고객 화면 실시간 시뮬레이션 (스마트폰 쉘 뷰)    |
|                                                    |    - 실제 견적서 카드 뷰 실시간 렌더링             |
| 2. 보유 전문 장비 및 약품 인증 태그                |    - 별점 4.96, 한 줄 소개, 태그, 미니 B/A 뷰      |
|    - 등록된 태그 칩 목록 (X 삭제 지원)             |                                                    |
|    - 태그 인풋 및 [+ 장비 태그 추가] 버튼          | 3. 플릿 신뢰 정책 및 증빙 혜택                     |
|    - 추천 빠른 추가 칩들 (피톤치드, 오존 등)       |    - 허위/도용 방지 및 분쟁 시 면책 증빙 인정       |
|                                                    |                                                    |
| 3. 시공 전/후 비교 갤러리 (Before & After)         | 4. 파트너 전담 고객센터 & 핫라인                   |
|    - 등록 포트폴리오 6개 / 최대 12개                |    - 1588-0000 (ARS 2번)                           |
|    - [+ 신규 시공 전/후 사진 등록] 모달 버튼       |    - [카카오톡 @쓸고닦고파트너 1:1 상담]           |
|    - 6개 포트폴리오 카드 그리드 (BEFORE/AFTER 분할)|                                                    |
|    - 고화질 사진 드래그 앤 드롭 업로드 존          |                                                    |
|                                                    |                                                    |
| [하단 고정 액션 바]                                |                                                    |
| [즉시 고객 앱/웹 견적 화면 반영 안내] [변경사항 취소] [프로필 변경사항 저장 CTA]                             |
+----------------------------------------------------------------------------------------------------+
| [Footer] 쓸고닦고 공인 플릿 파트너사 보증 시스템 • 100% 에스크로 익일 정산 보장 • 24시 기술지원 1588-0000 |
+----------------------------------------------------------------------------------------------------+
```

---

## 4. 백엔드 라우터 및 데이터베이스 명세

### 4.1 파일 경로
- 백엔드 라우터: [`SsulDak_Web/Partner/backend/api_PTNR_DSH_02/route.ts`](file:///Users/handsupbus/project_SsulDak/SsulDak_Web/Partner/backend/api_PTNR_DSH_02/route.ts)

### 4.2 API 요청/응답 규격

#### [엔드포인트 및 공통 헤더]
- **URL**: `POST /api/partner/ptnr_dsh_02`
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer {PARTNER_JWT_TOKEN}
  ```

#### [모드 1: 프로필 및 포트폴리오 데이터 조회 (`GET_PROFILE_DATA`)]
- **Request Body**:
  ```json
  {
    "mode": "GET_PROFILE_DATA",
    "ptnrNo": "P20261000001"
  }
  ```
- **Response (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "profile": {
      "ptnrNo": "P20261000001",
      "companyNm": "반짝빌라클린",
      "ceoNm": "이수 대표",
      "bizRegNo": "123-45-67890",
      "profileImgUrl": "https://.../avatar.jpg",
      "shortIntro": "7년 경력 빌라 계단 및 상가 공용부 정기관리 전문 파트너 반짝빌라클린입니다.",
      "introText": "저희 반짝빌라클린은 7년간 고양시 및 파주시 일대의 다세대 빌라...",
      "equipTags": [
        "독일산 크란즐 고압스팀기 (150bar)",
        "산업용 헤파필터 집진기",
        "초미립자 살균소독분무기 (ULV)",
        "보네트 저소음 바닥광택기",
        "유리창 전용 이온수 폴대시스템",
        "에코라벨 인증 중성세제 키트"
      ],
      "partnerCode": "PT-00001-ILSAN",
      "avgRating": 4.96,
      "totalWorkCnt": 284,
      "reviewTotalCnt": 284,
      "activeRegions": "경기 고양시 일산동구/서구, 파주시 전역",
      "completionScore": 92
    },
    "portfolios": [
      {
        "portSeq": 11,
        "title": "일산 마두동 빌라 계단 대리석 광택 복원",
        "category": "정기청소 (계단)",
        "beforeImgUrl": "https://.../before.jpg",
        "afterImgUrl": "https://.../after.jpg",
        "sortOrd": 1,
        "regDate": "2026.10.23"
      }
    ]
  }
  ```

#### [모드 2: 프로필 및 포트폴리오 일괄 저장 (`SAVE_PROFILE_DATA`)]
- **Request Body**:
  ```json
  {
    "mode": "SAVE_PROFILE_DATA",
    "ptnrNo": "P20261000001",
    "shortIntro": "7년 경력 빌라 계단 및 상가 공용부 정기관리 전문 파트너 반짝빌라클린입니다.",
    "introText": "친환경 독일제 전용 약품과 산업용 장비를 활용하여...",
    "equipTags": ["독일산 고압스팀기", "산업용 집진기", "초미립자 살균분무기", "바닥 광택기"],
    "profileImgUrl": "https://.../avatar.jpg",
    "portfolioList": [
      {
        "title": "계단 묵은 때 세척",
        "category": "정기청소 (계단)",
        "beforeImgUrl": "https://.../b_01.jpg",
        "afterImgUrl": "https://.../a_01.jpg",
        "sortOrd": 1
      }
    ]
  }
  ```
- **Response (HTTP 200 OK)**:
  ```json
  {
    "success": true,
    "message": "프로필 및 포트폴리오가 성공적으로 저장되었습니다. (즉시 고객 화면 반영)",
    "profile": { ... },
    "portfolios": [ ... ]
  }
  ```

---

## 5. 독립 전용 SQL 쿼리 명세

```sql
-- PTNR-DSH-02-SQL-001: 파트너 기본 소개 및 장비 태그 조회
SELECT 
  PTNR_NO AS ptnrNo,
  COMPANY_NM AS companyNm,
  COALESCE(CEO_NM, REP_NM) AS ceoNm,
  COALESCE(BIZ_REG_NO, BIZ_NO) AS bizRegNo,
  PROFILE_IMG_URL AS profileImgUrl,
  COALESCE(SHORT_INTRO, '') AS shortIntro,
  COALESCE(INTRO_TEXT, '') AS introText,
  EQUIP_TAGS AS equipTags,
  COALESCE(AVG_RATING, 4.96) AS avgRating,
  COALESCE(TOTAL_WORK_CNT, 284) AS totalWorkCnt,
  COALESCE(REVIEW_TOTAL_CNT, 284) AS reviewTotalCnt
FROM TB_PARTNER
WHERE PTNR_NO = ?;

-- PTNR-DSH-02-SQL-002: 파트너 등록 포트폴리오 목록 조회
SELECT 
  PORT_SEQ AS portSeq,
  TITLE AS title,
  CATEGORY AS category,
  BEFORE_IMG_URL AS beforeImgUrl,
  AFTER_IMG_URL AS afterImgUrl,
  SORT_ORD AS sortOrd,
  DATE_FORMAT(REG_DT, '%Y.%m.%d') AS regDate
FROM TB_PARTNER_PORTFOLIO
WHERE PTNR_NO = ?
ORDER BY SORT_ORD ASC, PORT_SEQ ASC;

-- PTNR-DSH-02-SQL-003: 파트너 마스터 소개 정보 및 장비 태그 갱신
UPDATE TB_PARTNER
SET 
  SHORT_INTRO = ?,
  INTRO_TEXT = ?,
  EQUIP_TAGS = ?,
  PROFILE_IMG_URL = ?,
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE PTNR_NO = ?;

-- PTNR-DSH-02-SQL-004: 기존 포트폴리오 전체 삭제
DELETE FROM TB_PARTNER_PORTFOLIO
WHERE PTNR_NO = ?;

-- PTNR-DSH-02-SQL-005: 신규 포트폴리오 세트 등록
INSERT INTO TB_PARTNER_PORTFOLIO (
  PTNR_NO, SERVICE_TYPE_CD, TITLE, BEFORE_IMG_URL, AFTER_IMG_URL, CATEGORY, SORT_ORD,
  REG_DT, REG_ID, MOD_DT, MOD_ID
) VALUES (
  ?, 'REGULAR', ?, ?, ?, ?, ?,
  NOW(), ?, NOW(), ?
);
```

---

## 6. 검증 및 테스트 결과

### 6.1 단위 테스트 (API Test)
- `GET_PROFILE_DATA` (`P20261000001`): 상태 200, 상호명 반짝빌라클린, 장비 태그 6개, 완성도 지수 92점, 포트폴리오 6세트 정상 반환.
- `SAVE_PROFILE_DATA` (`P20261000001`): 트랜잭션 정상 수행, `TB_PARTNER` 소개/태그 갱신 및 `TB_PARTNER_PORTFOLIO` DELETE-INSERT 일괄 처리 확인.

### 6.2 브라우저 E2E 검증 (Chrome Automation)
- **접속 URL**: `http://localhost:3000/?v=20261023_ptnr_dsh_02_v1#partner-profile`
- **검증 항목**:
  1. 헤더/GNB 및 Breadcrumb 정상 표시.
  2. 한 줄 소개(`42 / 50자`) 및 상세 전문 소개(`340 / 1,000자`) 실시간 글자수 카운터 연동 확인.
  3. 보유 장비 태그 추가 및 삭제 기능 정상 확인.
  4. 6개 Before/After 분할 뷰 포트폴리오 카드 렌더링 확인.
  5. `고객에게 보이는 프로필 미리보기` 모달 열기 및 닫기 확인.
  6. 하단 `프로필 변경사항 저장` 클릭 시 비동기 저장, 스피너 및 성공 체크마크/토스트 피드백 확인.
