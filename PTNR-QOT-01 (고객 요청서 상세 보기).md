# [SsulDak (쓸고닦고)] PTNR-QOT-01 (고객 요청서 상세 보기) 개발 및 검증 명세서

---

## 1. 화면 및 아키텍처 개요

| 항목 | 내용 |
| :--- | :--- |
| **화면 ID** | `PTNR-QOT-01` |
| **화면명** | 고객 요청서 상세 보기 (Customer Order & Scope Detail) |
| **지원 채널** | Web Console (PC 1440px 최적화) / Mobile Web (390px 반응형) |
| **도메인 역할** | `Partner` (전문가/시공 파트너 전용) |
| **프론트엔드 파일** | `SsulDak_Web/Partner/frontend/PTNR-QOT-01/index.tsx`<br>`SsulDak_Web/Partner/frontend/PTNR-QOT-01/index.jsx` |
| **백엔드 라우터 파일** | `SsulDak_Web/Partner/backend/api_PTNR_QOT_01/route.ts` |
| **API 엔드포인트** | `POST /api/partner/ptnr_qot_01` |
| **데이터베이스** | `ssuldak_db` (MySQL 8.0 / InnoDB / `utf8mb4_0900_ai_ci`) |
| **DB 모듈 경로** | `@/lib/db` (`project_SsulDak/lib/db.ts`) |
| **호출 부모 화면** | `PTNR-QOT-00` (매칭 청약 공고 목록) |
| **연계 대상 화면** | `PTNR-QOT-02` (청약서 작성 및 견적 제출) |

---

## 2. 핵심 아키텍처 및 코딩 규칙 준수

1. **물리적 격리**:
   - 모든 파트너 관련 소스코드는 `SsulDak_Web/Partner/` 디렉터리 내에서 프론트엔드와 백엔드를 독립 완결합니다.
   - `User`(이용자) 및 `Admin`(관리자) 도메인 파일과 코드를 일체 공유하지 않습니다.
2. **1:1 매핑 원칙**:
   - 프론트엔드: `SsulDak_Web/Partner/frontend/PTNR-QOT-01/index.tsx` (및 `index.jsx`)
   - 백엔드 라우터: `SsulDak_Web/Partner/backend/api_PTNR_QOT_01/route.ts`
   - 엔드포인트 URL: `POST /api/partner/ptnr_qot_01`
3. **독립 전용 SQL 원칙**:
   - 타 화면과 쿼리를 일체 공유하지 않으며, 오직 `PTNR-QOT-01-SQL-001 ~ PTNR-QOT-01-SQL-003` 전용 SQL ID로 작성 및 트랜잭션을 분리합니다.
4. **보안 및 정보 보호 정책 (핵심 룰)**:
   - **주소 및 보안 비밀번호 보호**: 파트너 배차 확정(쌍방 결제 완료) 전 단계이므로 상세 동/호수 및 공동현관 키패드 비밀번호는 데이터베이스에서 조회되더라도 API 응답 객체에서 완전히 배제하거나 마스킹 처리하여 반환합니다. (구/동 도로명 단위까지만 공개)
   - **확정 단가 방식 (Reverse Auction Fix)**: 고객이 제시한 총 청소 용역 대금은 파트너가 임의 수정할 수 없는 고정 조건(`isAmtFixed: true`)으로 처리됩니다.
   - **파트너 데이터 이용료 프리뷰 연산**:
     $$\text{데이터 이용료} = \max(\text{ROUND}(\text{고객 제시 대금} \times 3.3\%), 33,000\text{원})$$
     - 파트너가 보유한 활성 무료 쿠폰(`TB_PARTNER_COUPON`) 존재 시, "쿠폰 적용 시 0원으로 확정 가능" 안내 및 예상 실수령액(100% 전액 수령)을 동적으로 노출합니다.
   - **현장 실사 사진 검증**: 고객이 직접 업로드한 원본 현장 사진(`TB_CLEAN_REQ_PHOTO`)을 고화질 라이트박스 모달로 제공하여 현장 오염도 및 진입 환경을 사전에 정밀하게 검토할 수 있도록 지원합니다.

---

## 3. 독립 전용 SQL 명세

### 3.1 PTNR-QOT-01-SQL-001 (공고 마스터 및 건물 환경 정보 조회 - 상세주소 마스킹)
```sql
/* PTNR-QOT-01-SQL-001 */
SELECT 
  r.REQ_NO AS reqNo,
  s.SLOT_NO AS slotNo,
  s.SERVICE_TYPE_CD AS serviceTypeCd,
  s.SUB_ITEM_NM AS subItemNm,
  s.PROPOSED_UNIT_AMT AS proposedAmt,
  s.SERVICE_START_DT AS startDt,
  s.SERVICE_END_DT AS endDt,
  DATEDIFF(s.SERVICE_END_DT, s.SERVICE_START_DT) + 1 AS contractDays,
  s.EXPIRE_DT AS expireDt,
  r.ADDR_ROAD AS addrRoad,
  r.BUILDING_FLOOR_CNT AS floorCnt,
  r.HAS_ELEVATOR_YN AS hasElevatorYn,
  r.PARKING_ENV_CD AS parkingEnvCd,
  r.REQ_MEMO AS reqMemo
FROM TB_CLEAN_REQ_SLOT s
INNER JOIN TB_CLEAN_REQ r ON s.REQ_NO = r.REQ_NO
WHERE s.SLOT_NO = ?;
```

### 3.2 PTNR-QOT-01-SQL-002 (고객 업로드 현장 실사 사진 목록 조회)
```sql
/* PTNR-QOT-01-SQL-002 */
SELECT 
  PHOTO_SEQ AS photoSeq,
  PHOTO_URL AS photoUrl,
  FILE_NAME AS fileName,
  SORT_ORD AS sortOrd
FROM TB_CLEAN_REQ_PHOTO
WHERE REQ_NO = (SELECT REQ_NO FROM TB_CLEAN_REQ_SLOT WHERE SLOT_NO = ?)
ORDER BY SORT_ORD ASC, PHOTO_SEQ ASC;
```

### 3.3 PTNR-QOT-01-SQL-003 (파트너 가용 웰컴/무료 쿠폰 여부 조회)
```sql
/* PTNR-QOT-01-SQL-003 */
SELECT 
  P_COUPON_NO AS couponNo,
  CAMPAIGN_NM AS campaignNm
FROM TB_PARTNER_COUPON
WHERE PTNR_NO = ? 
  AND COUPON_STAT_CD = 'AVAILABLE' 
  AND (EXPIRE_DT IS NULL OR EXPIRE_DT >= NOW())
LIMIT 1;
```

---

## 4. 백엔드 API 명세서 (`POST /api/partner/ptnr_qot_01`)

### 4.1 요청 페이로드
```json
{
  "actionType": "GET_ORDER_DETAIL",
  "ptnrNo": "P20261000001",
  "slotNo": "SLOT202610230001"
}
```

### 4.2 응답 페이로드 (HTTP 200 OK)
```json
{
  "success": true,
  "order": {
    "reqNo": "REQ2026102300001",
    "slotNo": "SLOT202610230001",
    "addrRoad": "경기 고양시 일산동구 중앙로 1261번길 18-4",
    "addrNotice": "상세 동/호수 및 공동현관 비밀번호는 배차 확정 후 시스템에서 자동 잠금 해제되어 열람 가능합니다.",
    "envSummary": "엘리베이터 있음, 필로티 전용 주차장 무료 주차 1대 지원",
    "floorCnt": 4,
    "serviceTypeCd": "REGULAR",
    "subItemNm": "정기청소 3개월",
    "contractDays": 92,
    "periodText": "2026.11.01 ~ 2027.01.31 (총 12회차 주 1회 순회정기)",
    "workHoursText": "매주 수요일 오전 10:00 이전",
    "subItems": [
      {
        "name": "계단 및 공용 복도 순회 케어",
        "desc": "1~4층 계단실 먼지 집진, 바닥 세척, 창틀 먼지제거, 핸드레일 살균 소독",
        "badge": "기본 영역",
        "cycle": "주 1회 (월 4회) × 3개월 (월 60,000원 상당)",
        "amt": 180000
      },
      {
        "name": "건물 주위 및 1층 외곽 분리수거장 클리닝",
        "desc": "1층 주차장 쓰레기 수거, 재활용품 분리배출대 고압 물청소 및 잔재물 마대 정리",
        "badge": "외곽 환경",
        "cycle": "주 1회 (월 4회) × 3개월 (월 20,000원 상당)",
        "amt": 60000
      }
    ],
    "totalProposedAmt": 240000,
    "isAmtFixed": true,
    "reqMemo": "상가 1층에 음식점이 입점해 있어 계단실 2층 사이에 기름때와 음식 냄새가 유입될 수 있습니다. 친환경 탈취 약품과 바닥 스팀 청소를 꼭 정성스럽게 부탁드립니다."
  },
  "photos": [
    {
      "photoSeq": 1,
      "title": "1~4층 대리석 계단실 및 복도 현황",
      "desc": "1~4층 전 층 대리석 줄눈 및 코너 먼지 침착 확인 (마포 밀대 및 친환경 세제 필수)",
      "photoUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuBQL-w0SCAVE53QTKkzj13NpNBADLceGPTwHvUaFUAESGdgYeFyQlkirKW5WVHvlU0c6eGC_MWJ5p6UPUZOxfgzh5QZWQEJg-TBhIGs1z6nS_YrNmyU_vcY20kAXVSVHc6r7rHJMd5AMZPG-Tf_U8DEa8Ls_F1ke3OADqn4jS7DraQQFSGoycK-xZQqeC6iYu9XVySD02KEybLR3ljD7zLWIR9KY4nAyE-TQp7i2ecEU3hg2H8qxi2C"
    },
    {
      "photoSeq": 2,
      "title": "1층 필로티 분리수거장 바닥 오염",
      "desc": "음식물 국물 누출 자국 및 분리수거망 주변 정리 필요 (고압 분무 권장)",
      "photoUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuA-FCZzmPVaT2Xg9_ySKN722R8lxZlBtO35KjN_YtuGlEA8rXjI8bCmd7lcJVNNvrJP03ilaqtVuK5FjRqWxikqftAvTDwTGEkpTjmo68C-jrE6UQk8p-YMw5oIJW5xq8IX9bZXrrLNXXWCPWpvyWXXu1-6TVVFNs12HVPDYAZNaVLG-itLCoWi39hUbvVpPLs2iakjXoCHrhWsY7iFqtZ1G7zknFlUF7ICMuI3yyrt0E0bxFAYugc3"
    }
  ],
  "feePreview": {
    "calcFee": 7920,
    "dataFeeAmt": 33000,
    "hasFreeCoupon": true,
    "couponName": "첫 배차 100% 무료 패스 쿠폰",
    "finalPayAmt": 0,
    "expectedNetAmt": 240000
  }
}
```

---

## 5. 프론트엔드 UI 및 인터랙션 구현 내역

1. **상단 네비게이션 & 액션 헤더**:
   - `공고 목록으로 돌아가기 (PTNR-QOT-00)` 뒤로가기 버튼 링크 연동.
   - 4단계 브레드크럼 (`홈 > 대시보드 > 공고 목록 > 고객 요청서 상세`).
   - `접수 마감 D-2 | 잔여 1개사 선착순 마감` 실시간 상태 칩.
   - `공유` 및 `관심 공고 저장(북마크)` 토글 인터랙션.
2. **좌측 주력 정보 컬럼 (8/12 그리드)**:
   - **Card A (공고 개요 및 건물 환경)**:
     - 태그 클러스터 (`정기청소 3개월`, `D-2 응모마감`, `거리 2.4km · 차량 10분`, `단독 상가주택`).
     - 공고 접수 번호 원클릭 클립보드 복사 (`REQ2026102300001`).
     - **보안 잠금 안내 박스**: 지번/상세 호수 및 현장 비번 보호 정책 안내.
     - 현장 편의 시설 4대 체크 (승강기 내부 벽면·바닥 포함, 필로티 무료 주차 1대, 1층 수전함 수도/전기, 키패드 사전 연동).
   - **Card B (세부 시공 범위 및 견적 구성 내역)**:
     - 계약 수행 기간 (`2026.11.01 ~ 2027.01.31`, 총 92일간 12회차).
     - 희망 작업 시간대 (`매주 수요일 오전 10:00 이전`).
     - 2대 세부 정기 시공 품목별 산출 대금 (계단 180,000원, 외곽 분리수거장 60,000원).
     - **총 청소 용역 대금 배너**: 확정 제시 금액 240,000원 (금액 수정 불가 조건).
     - 고객 특별 요구사항 (음식 냄새/기름때 스팀 세척, 전/후 검수 사진 2장 이상 전송).
   - **Card C (현장 실사 사진 갤러리)**:
     - 2장 고화질 실사 이미지 썸네일 (대리석 계단실, 필로티 분리수거장).
     - 클릭 시 고화질 확대 라이트박스 모달 연결 (`openPhotoModal`).
     - 고압스팀기 및 보네트 광택기 투입 권장 가이드 박스.
   - **Card D (파트너 안심 시공 보호 규정 3대 보장제)**:
     - 100% 에스크로 안전 결제 (시공 보고 승인 즉시 익일 D+1 입금).
     - 일방 취소 시 100% 위약금 본사 직불 보전.
     - DB손해보험 5억원 영업배상책임보험 자동 연동.
3. **우측 고정 액션 패널 (4/12 그리드, Sticky)**:
   - **Card E (파트너 데이터 이용료 산정 & 쿠폰 프리뷰)**:
     - 공식 청약 산정식 `max(대금×3.3%, 33,000원)` 계산 내역 (7,920원 산출 → 최저 33,000원 적용).
     - **첫 배차 100% 무료 패스 쿠폰 자동 적용**: `-33,000원 할인` → 파트너 최종 납부액 `0원`, 예상 실수령액 `240,000원 (전액 수령)` 강조.
   - **Card F (입찰 경쟁 현황 및 CTA 액션)**:
     - 입찰 경쟁 현황 프로그레스 바 (`2 / 3개사 참여 중`, 잔여 1개사 도달 시 자동 조기 마감 안내).
     - 메인 CTA 버튼: `조건 100% 수락하고 청약서 작성 (PTNR-QOT-02)` 클릭 시 `PTNR-QOT-02` 화면으로 안전 라우팅.
     - 서브 액션 버튼: `시공 가이드 및 매뉴얼 미리보기` 클릭 시 표준 4단계 매뉴얼 모달 팝업.
     - 24시간 파트너 긴급 관제 센터 위젯 (ARS 1588-0000 내선 2번, 카카오 @쓸고닦고파트너).
4. **인터랙티브 모달 3종**:
   - **사진 확대 라이트박스 모달**: 고해상도 확대 보기 및 상세 부연 설명.
   - **표준 시공 매뉴얼 모달**: 현장 도착부터 전/후 사진 업로드까지 4단계 표준 운영 가이드.
   - **청약서 작성 신청 확인 모달**: 고정 금액 수락 및 계약 조건 최종 확인 후 `PTNR-QOT-02`로 이동.

---

## 6. 브라우저 실환경 검증 결과

- **테스트 환경**: Chrome 브라우저 실동작 환경 (`http://localhost:3000/?v=20261023_ptnr_qot_01_v1#ptnr-qot-01?slotNo=SLOT202610230001`)
- **실행 결과 요약**:
  1. `SsulDak` 파트너 포털 GNB 및 공고 상세 정보 헤더 정상 렌더링.
  2. 공고 번호 복사 버튼 클릭 시 복사 완료 토스트 알림 작동 확인.
  3. 관심 공고 저장(북마크) 버튼 클릭 시 아이콘 토글 및 저장 완료 알림 확인.
  4. 고객 실사 사진 클릭 시 고화질 라이트박스 팝업 및 닫기 정상 작동.
  5. `시공 가이드 및 매뉴얼 미리보기` 버튼 클릭 시 4단계 표준 매뉴얼 모달 팝업 정상 작동.
  6. 메인 CTA `조건 100% 수락하고 청약서 작성 (PTNR-QOT-02)` 클릭 시 신청 모달 팝업 및 `PTNR-QOT-02` 연계 확인.
  7. 파트너 데이터 이용료 33,000원 및 100% 무료 쿠폰 적용으로 최종 납부액 0원 정확 연산 확인.
