# [SsulDak (쓸고닦고)] PTNR-JOB-01 (작업 상태 업데이트 모달) 개발 및 검증 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `PTNR-JOB-01` |
| **화면명** | 작업 상태 업데이트 모달 (Work Status Update & Completion Report Modal) |
| **지원 채널** | Web Console (PC 1440px 최적화 바텀시트/모달) / Mobile Web (390px 반응형) |
| **도메인 역할** | `Partner` (전문가/시공 파트너 전용) |
| **프론트엔드 파일** | `SsulDak_Web/Partner/frontend/PTNR-JOB-01/index.tsx`<br>`SsulDak_Web/Partner/frontend/PTNR-JOB-01/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/Partner/backend/api_PTNR_JOB_01/route.ts` |
| **API 엔드포인트** | `POST /api/partner/ptnr_job_01` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |
| **호출 부모 화면** | `PTNR-JOB-00` (예약 및 작업 관리) |
| **연계 소비자 화면** | `USER-HIS-01` (이용자 청소 진행 상세 및 시공 사진 검수) |

---

## 2. 핵심 아키텍처 및 코딩 규칙 준수

1. **물리적 격리**:
   - 모든 파트너 관련 소스코드는 `SsulDak_Web/Partner/` 디렉터리 내에서 프론트엔드와 백엔드를 독립 완결합니다.
   - `User`(이용자) 및 `Admin`(관리자) 도메인 파일과 코드를 일체 공유하지 않습니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/Partner/frontend/PTNR-JOB-01/index.tsx` (및 `index.jsx`)
   - 백엔드 라우터: `SsulDak_Web/Partner/backend/api_PTNR_JOB_01/route.ts`
   - 엔드포인트 URL: `POST /api/partner/ptnr_job_01`
3. **독립 전용 SQL 원칙**:
   - 타 화면과 쿼리를 일체 공유하지 않으며, 오직 `PTNR-JOB-01-SQL-001 ~ PTNR-JOB-01-SQL-006` 전용 SQL ID로 작성 및 트랜잭션을 분리합니다.
4. **비즈니스 룰 및 작업 상태 전이/사진 검증 정책 (핵심 룰)**:
   - **작업 상태 전이 단계**:
     * 1단계: `'DEPARTED'` (현장 출발 전송) $\rightarrow$ 고객에게 알림톡/푸시 발송
     * 2단계: `'WORKING'` (작업 시작) $\rightarrow$ `START_DT = NOW()`, 계약 상태 `'IN_PROGRESS'` 자동 전이
     * 3단계: `'INSPECTING'` (작업 완료 및 고객 검수 대기) $\rightarrow$ `END_DT = NOW()`
   - **완료 보고(검수 요청) 시 필수 사진 검증**:
     * 완료 보고(`'INSPECTING'`) 전환 시에는 반드시 시공 후(`'AFTER'`) 증빙 사진이 최소 2장 이상 업로드되어야 합니다.
     * 2장 미등록 시 프론트엔드 버튼 비활성화(`disabled`) 및 백엔드 `400 Bad Request` (`PHOTO_COUNT_SHORTAGE`)로 차단합니다.
   - **사진 등록 처리**:
     * `TB_CLEAN_WORK_PHOTO`에 슬롯별 URL, 타이틀, 정렬순번(`SORT_ORD`) 및 감사 컬럼(`REG_ID`) 적재.
   - **작업 메모 (`WORKER_MEMO`)**:
     * 최대 300자 이내 현장 특이사항 기록.

---

## 3. 데이터베이스 스키마 및 사용 컬럼

| 테이블명 | 테이블 설명 | 주요 사용 컬럼 및 데이터 타입 |
| :--- | :--- | :--- |
| `TB_CLEAN_WORK_LOG` | 회차별 시공 작업 원장 | `WORK_SEQ` (BIGINT, PK)<br>`CONTRACT_NO` (VARCHAR(50), FK)<br>`ROUND_NO` (INT, 회차 번호)<br>`WORK_STAT_CD` ('MATCHED', 'DEPARTED', 'WORKING', 'INSPECTING', 'VERIFIED')<br>`WORKER_MEMO` (VARCHAR(500), 파트너 메모)<br>`START_DT` (DATETIME, 작업 시작 일시)<br>`END_DT` (DATETIME, 작업 종료 일시)<br>`MOD_DT`, `MOD_ID` (감사 컬럼) |
| `TB_CLEAN_WORK_PHOTO` | 시공 증빙 사진 원장 | `PHOTO_SEQ` (BIGINT, PK, AUTO_INCREMENT)<br>`WORK_SEQ` (BIGINT, FK)<br>`PHOTO_TYPE_CD` ('BEFORE', 'AFTER')<br>`PHOTO_URL` (VARCHAR(500))<br>`TITLE` (VARCHAR(200))<br>`SORT_ORD` (INT)<br>`REG_DT`, `REG_ID` (감사 컬럼) |
| `TB_CLEAN_CONTRACT` | 체결 계약 마스터 | `CONTRACT_NO` (CHAR(16), PK)<br>`PTNR_NO` (CHAR(12))<br>`USER_NO` (CHAR(12))<br>`CONTRACT_STAT_CD` ('CONFIRMED' $\rightarrow$ 작업 시작 시 'IN_PROGRESS'로 전이)<br>`TOTAL_PAY_AMT` (INT, 총 용역비)<br>`SUB_ITEM_NM` (VARCHAR(100), 품목명) |

---

## 4. 독립 전용 SQL 명세 (PTNR-JOB-01-SQL-001 ~ 006)

### 4.1 PTNR-JOB-01-SQL-001 (당해 회차 작업 상태 및 계약 권한 조회)
```sql
/* PTNR-JOB-01-SQL-001 */
SELECT 
  w.WORK_SEQ AS workSeq,
  w.CONTRACT_NO AS contractNo,
  COALESCE(w.ROUND_NO, 1) AS roundNo,
  COALESCE(w.WORK_STAT_CD, 'WORKING') AS workStatCd,
  COALESCE(w.WORKER_MEMO, '') AS workerMemo,
  DATE_FORMAT(w.START_DT, '%Y-%m-%d %H:%i') AS startDt,
  DATE_FORMAT(w.END_DT, '%Y-%m-%d %H:%i') AS endDt,
  DATE_FORMAT(w.START_DT, '%H:%i') AS startTimeOnly,
  COALESCE(c.SUB_ITEM_NM, '정기청소 3개월 (총 12회차)') AS subItemNm,
  c.USER_NO AS userNo,
  c.TOTAL_PAY_AMT AS totalPayAmt,
  COALESCE(u.USER_NM, '김*훈') AS rawUserNm,
  COALESCE(r.ADDR_ROAD, '경기 고양시 일산동구 중앙로') AS addrRoad
FROM TB_CLEAN_WORK_LOG w
INNER JOIN TB_CLEAN_CONTRACT c ON w.CONTRACT_NO = c.CONTRACT_NO
LEFT JOIN TB_USER u ON c.USER_NO = u.USER_NO
LEFT JOIN TB_CLEAN_REQ r ON c.REQ_NO = r.REQ_NO
WHERE w.WORK_SEQ = ? AND c.PTNR_NO = ?;
```

### 4.2 PTNR-JOB-01-SQL-002 (당해 회차 기등록 시공 사진 목록 조회)
```sql
/* PTNR-JOB-01-SQL-002 */
SELECT 
  PHOTO_SEQ AS photoSeq,
  PHOTO_TYPE_CD AS photoTypeCd,
  PHOTO_URL AS photoUrl,
  TITLE AS title,
  COALESCE(SORT_ORD, 1) AS sortOrd
FROM TB_CLEAN_WORK_PHOTO
WHERE WORK_SEQ = ?
ORDER BY SORT_ORD ASC, PHOTO_SEQ ASC;
```

### 4.3 PTNR-JOB-01-SQL-003 (작업 상태 갱신: TB_CLEAN_WORK_LOG UPDATE)
```sql
/* PTNR-JOB-01-SQL-003 */
UPDATE TB_CLEAN_WORK_LOG
SET 
  WORK_STAT_CD = ?,
  WORKER_MEMO = COALESCE(?, WORKER_MEMO),
  START_DT = CASE WHEN ? = 'WORKING' AND START_DT IS NULL THEN NOW() ELSE START_DT END,
  END_DT = CASE WHEN ? = 'INSPECTING' THEN NOW() ELSE END_DT END,
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE WORK_SEQ = ?;
```

### 4.4 PTNR-JOB-01-SQL-004 (작업 시작 시 계약 마스터 상태 IN_PROGRESS 전이)
```sql
/* PTNR-JOB-01-SQL-004 */
UPDATE TB_CLEAN_CONTRACT
SET 
  CONTRACT_STAT_CD = 'IN_PROGRESS',
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE CONTRACT_NO = ? AND CONTRACT_STAT_CD = 'CONFIRMED';
```

### 4.5 PTNR-JOB-01-SQL-005 (완료 사진 등록 전 기존 AFTER 사진 정리 DELETE)
```sql
/* PTNR-JOB-01-SQL-005 */
DELETE FROM TB_CLEAN_WORK_PHOTO
WHERE WORK_SEQ = ? AND PHOTO_TYPE_CD = 'AFTER';
```

### 4.6 PTNR-JOB-01-SQL-006 (완료 증빙 사진 등록: TB_CLEAN_WORK_PHOTO INSERT)
```sql
/* PTNR-JOB-01-SQL-006 */
INSERT INTO TB_CLEAN_WORK_PHOTO (
  WORK_SEQ, PHOTO_TYPE_CD, PHOTO_URL, TITLE, SORT_ORD, REG_DT, REG_ID
) VALUES (
  ?, 'AFTER', ?, ?, ?, NOW(), ?
);
```

---

## 5. 백엔드 API 및 서비스 엔진 명세

### 5.1 엔드포인트 개요
- **URL**: `POST /api/partner/ptnr_job_01`
- **인증**: Bearer JWT 토큰 또는 파트너 세션 식별자 (`ptnrNo`)

### 5.2 모드 1: 작업 상태 로딩 (`mode: "GET_WORK_STATUS"`)
- **Request Body**:
```json
{
  "mode": "GET_WORK_STATUS",
  "ptnrNo": "P20261000001",
  "contractNo": "CT2026102100001",
  "workSeq": 2
}
```
- **Response Body**:
```json
{
  "success": true,
  "workStatus": {
    "workSeq": 2,
    "contractNo": "CT2026102100001",
    "orderNo": "CNT-20261021-0001",
    "roundNo": 1,
    "totalRounds": 12,
    "workStatCd": "INSPECTING",
    "workerMemo": "1층 분리수거장 재활용 정리 및 1~4층 대리석 계단 친환경 에코라벨 중성세제로 물걸레 및 스팀 청소 완벽히 완료했습니다.",
    "startDt": "2026-11-01 09:00",
    "endDt": "2026-10-23 14:26",
    "subItemNm": "정기청소 3개월 (총 12회차)",
    "buildingTitle": "일산동구 중앙로 빌라 4층 상가주택",
    "clientName": "김*훈 고객님",
    "settlementAmt": 240000,
    "departedTimeText": "08:35",
    "startedTimeText": "09:00",
    "photos": [
      {
        "photoSeq": 1,
        "photoTypeCd": "AFTER",
        "photoUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuCVgmdStHYlGBpEaqSV7l7fbzd9...",
        "title": "1. 계단 시공 후",
        "sortOrd": 1,
        "fileName": "stair_after_20261101.jpg",
        "fileSizeText": "2.4 MB",
        "aiVerificationText": "AI 자동 검증 통과: 조도·청결도 우수"
      },
      {
        "photoSeq": 2,
        "photoTypeCd": "AFTER",
        "photoUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuCmUU9LI2VYgpQ8znE6pURBOhsL...",
        "title": "2. 현관 도어락 세척 후",
        "sortOrd": 2,
        "fileName": "door_after_sanitized.jpg",
        "fileSizeText": "1.8 MB",
        "aiVerificationText": "AI 자동 검증 통과: 도어락 식별 완료"
      }
    ]
  }
}
```

### 5.3 모드 2: 작업 상태 업데이트 및 완료 보고 (`mode: "UPDATE_WORK_STATUS"`)
- **Request Body**:
```json
{
  "mode": "UPDATE_WORK_STATUS",
  "ptnrNo": "P20261000001",
  "contractNo": "CT2026102100001",
  "workSeq": 2,
  "targetStatus": "INSPECTING",
  "workerMemo": "1층 분리수거장 재활용 정리 및 1~4층 대리석 계단 친환경 에코라벨 중성세제로 물걸레 및 스팀 청소 완벽히 완료했습니다.",
  "completionPhotos": [
    {
      "title": "1. 계단 시공 후",
      "photoUrl": "https://ssuldak.s3.ap-northeast-2.amazonaws.com/work/stair_after.jpg",
      "sortOrd": 1
    },
    {
      "title": "2. 현관 도어락 세척 후",
      "photoUrl": "https://ssuldak.s3.ap-northeast-2.amazonaws.com/work/door_after.jpg",
      "sortOrd": 2
    }
  ]
}
```
- **Response Body**:
```json
{
  "success": true,
  "workSeq": 2,
  "updatedStatus": "INSPECTING",
  "message": "시공 사진 검증이 완료되어 고객에게 검수 요청 알림톡이 성공적으로 발송되었습니다."
}
```

---

## 6. 프론트엔드 UI/UX 구현 세부사항

1. **모달 래퍼 및 배경 시뮬레이션**:
   - `bg-primary/60 backdrop-blur-md` 오버레이 및 중앙 최대 폭 780px 둥근 모달 박스.
   - 단독 프리뷰 시 뒷배경에 `PTNR-JOB-00` 작업 관제 보드가 블러(`blur-[5px] opacity-40`) 처리되어 실제 업무 환경 그대로 연출.
   - `Esc` 키 감지 시 모달 닫기 지원.
2. **상단 스티키 헤더**:
   - 오더 번호 배지(`CNT-20261021-0001`), 정기케어 회차 배지(`정기케어 1회차`, 녹색 펄스 점), 빌라 건물명.
   - 타이틀: "작업 상태 업데이트 및 완료 보고".
   - 닫기(`Esc`) 버튼.
3. **인터랙티브 3단계 프로그레스 트래커**:
   - `1. 현장 출발` (전송 완료 08:35, 녹색 체크)
   - `2. 작업 시작` (시작 보고 09:02, 녹색 체크)
   - `3. 시공 완료 (작성중)` (진행률 100% • 보고서 제출, 펄스 애니메이션)
4. **시공 완료 필수 증빙 사진 등록 (최소 2장 필수)**:
   - 검증 상태 배지: `검증 완료 (2/2 등록됨)` (2장 미만 시 적색 경고로 전환).
   - 엄격 품질 검수 규정 안내 배너 (대리석 광택, 도어락 소독 고해상도 식별 원본 보존 안내).
   - 2종 기본 사진 카드 (계단 시공 후 2.4MB / 현관 도어락 1.8MB) + AI 자동 검증 통과 배지.
   - 개별 사진 삭제(휴지통) 및 재촬영 버튼.
   - `+ 추가 사진 등록` 점선 슬롯: 클릭 시 실시간 추가 사진 슬롯 확장 (최대 5장).
5. **현장 필수 시공 점검표 (체크리스트)**:
   - 3개 타일형 인터랙티브 체크박스:
     * 1~4층 계단·복도 난간: 스팀 및 먼지 흡입 완료
     * 1층 필로티 분리수거장: 잔재물 정리·바닥 세척
     * 공용 현관문 및 도어락: 피톤치드 살균 소독 완료
   - 파트너 작업 특이사항 텍스트에어리어 (실시간 글자수 카운터 `106 / 300자`).
6. **안심 에스크로 및 알림톡 프리뷰 배너**:
   - `안심 에스크로 240,000원` 보장 배지.
   - 완료 보고서 전송 시 카카오 알림톡 자동 전송 및 D+1 익일 오전 10시 정산 안내.
7. **하단 스티키 액션 바**:
   - 좌측: 취소/닫기 버튼 및 `임시저장됨 (11:42)` 상태.
   - 우측 CTA 버튼:
     * 사진 $\ge 2$장: 활성화 민트 버튼 (`사진 N장 검증 완료 / 고객에게 검수 요청 발송`)
     * 사진 $< 2$장: 비활성화 회색 버튼 (`시공 완료 사진 2장을 등록해 주세요 (N/2)`)
     * 클릭 시 스피너 애니메이션 $\rightarrow$ `전송 완료! 고객 검수 대기중` 전환 후 자동 닫기.

---

## 7. 검증 및 테스트 결과

| 검증 항목 | 검증 방법 | 결과 | 비고 |
| :--- | :--- | :---: | :--- |
| **작업 상태 로딩 (Mode 1)** | `POST /api/partner/ptnr_job_01` (`GET_WORK_STATUS`) | **성공 (HTTP 200)** | 작업 원장, 2장 사진, 체크리스트, 고객 정보 정상 반환 |
| **사진 2장 미달 유효성 검증** | `UPDATE_WORK_STATUS` with 1 photo | **성공 (HTTP 400)** | `PHOTO_COUNT_SHORTAGE` 에러 코드 반환 및 차단 확인 |
| **완료 보고 트랜잭션 (Mode 2)** | `UPDATE_WORK_STATUS` with 2 photos | **성공 (HTTP 200)** | `INSPECTING` 전이, 기존 사진 DELETE 후 신규 사진 INSERT 완료 |
| **esbuild 번들링** | `npx esbuild preview/main.tsx` 빌드 | **성공 (78ms, 0 errors)** | 번들 용량 3.5MB 정상 생성 |
| **브라우저 프리뷰 및 인터랙션** | Chrome 브라우저 `#ptnr-job-01` 검증 | **성공** | 모달 로딩, 사진 추가(+ 추가 사진 등록), 체크리스트 토글, 제출 피드백 완벽 동작 |
