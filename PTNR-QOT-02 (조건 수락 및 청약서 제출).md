# [SsulDak (쓸고닦고)] PTNR-QOT-02 (조건 수락 및 청약서 제출) 개발 및 검증 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `PTNR-QOT-02` |
| **화면명** | 조건 수락 및 청약서 제출 (Accept Terms & Submit Tender Proposal) |
| **지원 채널** | Web Console (PC 1440px 최적화) / Mobile Web (390px 반응형) |
| **도메인 역할** | `Partner` (전문가/시공 파트너 전용) |
| **프론트엔드 파일** | `SsulDak_Web/Partner/frontend/PTNR-QOT-02/index.tsx`<br>`SsulDak_Web/Partner/frontend/PTNR-QOT-02/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/Partner/backend/api_PTNR_QOT_02/route.ts` |
| **API 엔드포인트** | `POST /api/partner/ptnr_qot_02` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |
| **호출 부모 화면** | `PTNR-QOT-01` (고객 요청서 상세 보기) |
| **호출 대상 화면** | `PTNR-QOT-00` (공고 목록 복귀 또는 응모 완료 피드백) |

---

## 2. 핵심 아키텍처 및 코딩 규칙 준수

1. **물리적 격리**:
   - 모든 파트너 관련 소스코드는 `SsulDak_Web/Partner/` 디렉터리 내에서 프론트엔드와 백엔드를 독립 완결합니다.
   - `User`(이용자) 및 `Admin`(관리자) 도메인 파일과 코드를 일체 공유하지 않습니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/Partner/frontend/PTNR-QOT-02/index.tsx` (및 `index.jsx`)
   - 백엔드 라우터: `SsulDak_Web/Partner/backend/api_PTNR_QOT_02/route.ts`
   - 엔드포인트 URL: `POST /api/partner/ptnr_qot_02`
3. **독립 전용 SQL 원칙**:
   - 타 화면과 쿼리를 일체 공유하지 않으며, 오직 `PTNR-QOT-02-SQL-001 ~ PTNR-QOT-02-SQL-005` 전용 SQL ID로 작성 및 트랜잭션을 분리합니다.
4. **비즈니스 룰 및 역경매 고정 금액 청약 원칙 (핵심 정책)**:
   - **금액 수정 원천 차단 (Reverse Auction Fix)**: 고객이 제시한 단가(`PROPOSED_UNIT_AMT`)가 그대로 청약 금액(`BID_AMT`)으로 고정 저장되며, 파트너가 임의로 수정할 수 없습니다. (스마트 계약 잠금 UI 적용)
   - **일정 수용 확정**: 고객 요청 첫 방문 시작일(`SERVICE_START_DT`)을 조건 없이 100% 수용합니다.
   - **중복 입찰 방지**: 동일 파트너가 동일 슬롯에 이미 제출한 청약 건이 존재할 경우 409 Conflict를 반환하여 중복 제출을 원천 차단합니다.
   - **제재 패널티 동의**: "배차 확정 후 파트너 귀책으로 일방 취소 시 7일간 서비스 투찰 정지" 필수 동의 미체크 시 제출 버튼이 비활성화됩니다.
   - **신규 채번 규칙**: 입찰 번호 `BID_NO` = `'BID'` + `YYYYMMDD` + 5자리 순번 (예: `BID2026102300004`).
   - **감사 컬럼**: 청약 등록 시 `REG_DT = NOW()`, `REG_ID = ptnrNo`를 필수로 세팅합니다.
   - **슬롯 상태 전이**: 청약서 등록 성공 시 대상 슬롯의 상태를 `'QUOTED'`로 안전하게 전이합니다.

---

## 3. 독립 전용 SQL 명세

### 3.1 PTNR-QOT-02-SQL-001 (공고 슬롯의 고정 대금 및 일정 조회)
```sql
/* PTNR-QOT-02-SQL-001 */
SELECT 
  s.SLOT_NO AS slotNo,
  s.REQ_NO AS reqNo,
  s.SUB_ITEM_NM AS subItemNm,
  s.PROPOSED_UNIT_AMT AS fixedAmt,
  s.SERVICE_START_DT AS startDt,
  DATE_FORMAT(s.SERVICE_START_DT, '%Y-%m-%d %H:%i') AS formattedStartDt,
  s.SLOT_STAT_CD AS slotStatCd,
  s.EXPIRE_DT AS expireDt,
  s.SERVICE_END_DT AS endDt,
  DATEDIFF(s.SERVICE_END_DT, s.SERVICE_START_DT) + 1 AS contractDays,
  COALESCE(r.ADDR_ROAD, '') AS addrRoad,
  COALESCE(r.BUILDING_FLOOR_CNT, 4) AS floorCnt,
  COALESCE(r.REQ_MEMO, '') AS reqMemo
FROM TB_CLEAN_REQ_SLOT s
LEFT JOIN TB_CLEAN_REQ r ON s.REQ_NO = r.REQ_NO
WHERE s.SLOT_NO = ?;
```

### 3.2 PTNR-QOT-02-SQL-002 (파트너 기본 장비 태그 및 중복 청약 여부 확인)
```sql
/* PTNR-QOT-02-SQL-002 */
SELECT 
  p.COMPANY_NM AS companyNm,
  p.EQUIP_TAGS AS equipTags,
  COALESCE(p.SHORT_INTRO, '') AS shortIntro,
  (SELECT COUNT(*) FROM TB_CLEAN_BID b WHERE b.SLOT_NO = ? AND b.PTNR_NO = p.PTNR_NO) AS alreadyBidCnt,
  (SELECT COUNT(DISTINCT b2.PTNR_NO) FROM TB_CLEAN_BID b2 WHERE b2.SLOT_NO = ?) AS currentBidCount
FROM TB_PARTNER p
WHERE p.PTNR_NO = ?;
```

### 3.3 PTNR-QOT-02-SQL-003 (당일 기준 신규 BID_NO 채번 락 조회)
```sql
/* PTNR-QOT-02-SQL-003 */
SELECT MAX(BID_NO) AS maxBidNo
FROM TB_CLEAN_BID
WHERE BID_NO LIKE CONCAT('BID', DATE_FORMAT(NOW(), '%Y%m%d'), '%')
FOR UPDATE;
```

### 3.4 PTNR-QOT-02-SQL-004 (청약서 원장 등록: TB_CLEAN_BID INSERT)
```sql
/* PTNR-QOT-02-SQL-004 */
INSERT INTO TB_CLEAN_BID (
  BID_NO, SLOT_NO, PTNR_NO, BID_AMT, WORKER_CNT,
  EST_DURATION_HOURS, APPEAL_MSG, EQUIP_DESC, BID_STAT_CD,
  REG_DT, REG_ID
) VALUES (
  ?, ?, ?, ?, ?,
  ?, ?, ?, 'SUBMITTED',
  NOW(), ?
);
```

### 3.5 PTNR-QOT-02-SQL-005 (슬롯 상태 QUOTED 전이: TB_CLEAN_REQ_SLOT UPDATE)
```sql
/* PTNR-QOT-02-SQL-005 */
UPDATE TB_CLEAN_REQ_SLOT
SET 
  SLOT_STAT_CD = 'QUOTED',
  MOD_DT = NOW(),
  MOD_ID = ?
WHERE SLOT_NO = ? AND SLOT_STAT_CD = 'WAITING';
```

---

## 4. 백엔드 API 명세서 (`POST /api/partner/ptnr_qot_02`)

### 4.1 모드 1: 조건 정보 로딩 (`GET_FIXED_TERMS`)

#### 요청 페이로드
```json
{
  "mode": "GET_FIXED_TERMS",
  "ptnrNo": "P20261000001",
  "slotNo": "SLOT202610230001"
}
```

#### 응답 페이로드 (HTTP 200 OK)
```json
{
  "success": true,
  "fixedTerms": {
    "slotNo": "SLOT202610230001",
    "reqNo": "REQ2026102300001",
    "subItemNm": "계단 (1~4층) + 복도 + 1층 분리수거장",
    "buildingTitle": "경기 고양시 일산동구 중앙로 1261번길 18-4 4층 상가주택",
    "addrRoad": "경기 고양시 일산동구 중앙로 1261번길 18-4",
    "floorCnt": 4,
    "scopeText": "1~4층 계단실 및 복도 순회 케어, 창틀 먼지 흡입, 1층 필로티 주차장 분리수거장 2개 구역 정리 및 물청소",
    "reqMemo": "상가 1층에 음식점이 입점해 있어 계단실 2층 사이에 기름때와 음식 냄새가 유입될 수 있습니다. 친환경 탈취 약품과 바닥 스팀 청소를 꼭 정성스럽게 부탁드립니다.",
    "fixedAmt": 240000,
    "monthlyAmt": 80000,
    "contractDays": 92,
    "formattedStartDt": "2026-11-01 09:00",
    "firstVisitText": "2026년 11월 01일(일) 첫 방문",
    "workCycleText": "매주 수요일 오전 10:00 이전 (총 12회차 케어)",
    "slotStatCd": "WAITING",
    "expireDt": "2026-10-25T04:05:21.000Z",
    "currentBidCount": 2,
    "maxBidCount": 3
  },
  "partnerDefaults": {
    "ptnrNo": "P20261000001",
    "companyNm": "반짝빌라클린",
    "ratingBadge": "마스터 A+ 등급",
    "defaultWorkerCnt": 2,
    "defaultHours": 2,
    "equipTags": [
      "독일산 크란즐 고압스팀기 (150bar)",
      "산업용 헤파필터 집진기",
      "초미립자 살균소독분무기 (ULV)",
      "보네트 저소음 바닥광택기",
      "유리창 전용 이온수 폴대시스템",
      "에코라벨 인증 중성세제 키트"
    ],
    "equipDesc": "독일산 크란즐 고압스팀기 (150bar), 산업용 헤파필터 집진기, 초미립자 살균소독분무기 (ULV)",
    "defaultAppealMsg": "1층 현관 도어락 소독과 분리수거장 주변 고압 세척까지 성실히 작업하겠습니다. 매회차 시공 전/후 고화질 비교 사진을 즉시 전송해드리며, 친환경 인증 약품만 사용하여 건물 입주민 건강을 최우선으로 관리하겠습니다.",
    "alreadyBid": false
  },
  "feeSummary": {
    "calcFormula": "max(대금×3.3%, 33,000원)",
    "dataFeeAmt": 33000,
    "discountAmt": 33000,
    "finalPayAmt": 0,
    "couponName": "[웰컴 입점] 첫 배차 데이터 이용료 100% 무료 (Free Pass)",
    "hasFreeCoupon": true,
    "expectedNetRevenue": 240000
  }
}
```

---

### 4.2 모드 2: 청약서 최종 제출 (`SUBMIT_BID`)

#### 요청 페이로드
```json
{
  "mode": "SUBMIT_BID",
  "ptnrNo": "P20261000001",
  "slotNo": "SLOT202610230001",
  "workerCnt": 2,
  "estDurationHours": 2.0,
  "appealMsg": "1층 현관 도어락 소독과 분리수거장 주변 고압 세척까지 성실히 작업하겠습니다. 매회차 시공 전/후 고화질 비교 사진을 즉시 전송해드리며, 친환경 인증 약품만 사용하여 건물 입주민 건강을 최우선으로 관리하겠습니다.",
  "equipDesc": "독일산 크란즐 고압스팀기 (150bar), 산업용 헤파필터 집진기, 에코라벨 중성세제",
  "termsAgreed": true
}
```

#### 응답 페이로드 (HTTP 201 Created)
```json
{
  "success": true,
  "bidNo": "BID2026102300004",
  "message": "청약서가 성공적으로 제출되었습니다. 고객이 검토 후 계약을 진행하게 됩니다."
}
```

#### 중복 제출 시 응답 페이로드 (HTTP 409 Conflict)
```json
{
  "success": false,
  "code": "ALREADY_BID",
  "message": "이미 청약서를 제출한 공고입니다."
}
```

---

## 5. 프론트엔드 UI 및 인터랙션 구현 내역

1. **상단 네비게이션 & 컨텍스트 바**:
   - `공고 상세 보기로 돌아가기 (PTNR-QOT-01)` 버튼 링크.
   - 접수 코드: `SSDK-TNDR-202611-0428`.
   - 입찰 현황 칩: `선착순 입찰 마감 임박 (잔여 1개사) | 현재 경쟁 2:1`.
2. **헤더 섹션**:
   - 화면 뱃지 `PTNR-QOT-02`, 배차 매칭 최종 검토.
   - 메인 타이틀: `청약서 작성 및 조건 수락 제출`.
   - 파트너사 인증 상태: `반짝빌라클린 (마스터 A+ 등급)`.
3. **좌측 주력 입력 컬럼 (8/12 그리드)**:
   - **Card 1: 고객 확정 조건 (금액 및 주요 일정 수정 원천 차단)**
     - 상단 자물쇠 배너: `스마트 계약 잠금` (금액 및 주요 일정 수정 원천 차단).
     - 고객 확정 대금: `240,000 원 (VAT 포함)`, 월 80,000원 상당 × 3개월 약정.
     - 확정 작업 일정: `2026년 11월 01일(일) 첫 방문`, `매주 수요일 오전 10:00 이전 (총 12회차 케어)`.
     - 시공 범위 및 고객 특이 요청 사항.
   - **Card 2: 파트너 시공 실행 계획 (Operational Proposal Form)**
     - **투입 인원 스텝퍼**: `[-] / [+]` 버튼으로 1인~10인 조절 가능 (1인 책임 시공 / 2인 1조 / 팀 단위 편성 안내).
     - **작업 소요 시간 셀렉트**: 1.0시간 ~ 4.0시간 (0.5시간 단위, 권장 2.0시간 기본값).
     - **전문 장비 및 약품 체크박스**: 고압스팀기, 산업용 집진기, 에코라벨 중성세제, 피톤치드 연무기 4종 체크 및 카운트 실시간 갱신.
     - **작업 계획 및 고객 어필 메시지**: 300자 제한 텍스트에어리어 및 실시간 글자수 카운터.
   - **Card 3: 필수 준수 확약 및 법적 동의**
     - 필수 체크 1: 고객 조건 100% 수락 및 단순 변심 취소 시 7일간 투찰 정지 동의.
     - 필수 체크 2: 5억원 영업배상책임보험 자동 적용 및 안전 수칙 준수 동의.
     - 필수 체크 3: 매회차 전/후 증빙 사진(최소 2매 이상) 등록 및 관리자 검수 동의.
4. **우측 고정 정산 & 제출 액션 패널 (4/12 그리드, Sticky)**:
   - **정산 및 청약 상세 내역 카드**:
     - 정상 청약 데이터 이용료: `33,000 원` (취소선).
     - 웰컴 프로모션 패스: `-33,000 원`.
     - 이번 청약 실 납부액: `0 원` (볼드 그린 강조).
     - 최종 매칭 시 파트너 실수령액: `240,000 원 (수수료 0% 전액 수령 보장)`.
     - 에스크로 정산일: 고객 검수 승인 익일(D+1) 오전 10:00.
   - **액션 버튼 그룹**:
     - `청약서 제출하기 (PTNR-QOT-02)` 메인 CTA: 약관 동의 및 어필 메시지 10자 이상 충족 시 활성화, 클릭 시 로딩 스피너 및 실제 API 호출.
     - `입력 내용 임시저장` 버튼: 로컬 스토리지 저장 및 완료 토스트 노출.
   - **24시간 관제 핫라인 & 안심 보장제 위젯**:
     - 현장 핫라인: `1588-0000 (ARS 2번)`.
     - 고객 노쇼/일방 취소 시 위약금 100% 에스크로 보상 보장.
5. **청약서 접수 완료 축하 모달**:
   - 신규 발급된 입찰 접수 번호(`BID2026102300004`), 확정 금액, 투입 편성 계획 요약 안내.
   - `공고 목록으로 돌아가기 (PTNR-QOT-00)` 버튼 터치 시 오더 목록 화면으로 안전 라우팅.

---

## 6. 브라우저 실환경 검증 결과

- **테스트 환경**: Chrome 브라우저 실동작 환경 (`http://localhost:3000/?v=20261023_ptnr_qot_02_v1#ptnr-qot-02?slotNo=SLOT202610230001`)
- **실행 결과 요약**:
  1. `SsulDak` 파트너 콘솔 GNB 및 브레드크럼 정상 렌더링 확인.
  2. 고객 확정 조건 카드(240,000원 스마트 계약 잠금 및 2026-11-01 첫 방문 일정) 노출 확인.
  3. 투입 인원 스텝퍼(2명 → 3명 → 2명) 증감 정상 작동.
  4. 전문 장비 및 약품 체크박스 4종 선택/해제 및 적용 개수 갱신 확인.
  5. `입력 내용 임시저장` 클릭 시 토스트 메시지 팝업 작동 확인.
  6. 필수 약관 체크 및 글자수 10자 이상 시 `청약서 제출하기` 버튼 활성화 및 제출 트랜잭션 정상 수행 확인.
  7. 신규 채번된 `BID2026102300004` 원장 저장 및 대상 슬롯 `SLOT_STAT_CD = 'QUOTED'` 갱신 확인.
  8. 중복 제출 시 `ALREADY_BID` 에러 반환 및 409 Conflict 방어 로직 검증 완료.
