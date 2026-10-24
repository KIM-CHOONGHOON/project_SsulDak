/**
 * SsulDak (쓸고닦고) - PTNR-QOT-01 (고객 요청서 상세 보기) 백엔드 라우터
 * 
 * 물리적 격리: SsulDak_Web/Partner/backend/api_PTNR_QOT_01/route.ts
 * 엔드포인트 URL: POST /api/partner/ptnr_qot_01
 * DB 연동: @/lib/db (MySQL 8.0, InnoDB)
 * 독립 전용 SQL: PTNR-QOT-01-SQL-001 ~ PTNR-QOT-01-SQL-003
 */

import { executeQuery } from '@/lib/db';

export interface SubItemDetail {
  name: string;
  amt: number;
  cycle?: string;
  scopeDesc?: string;
}

export interface BuildingFacility {
  label: string;
  available: boolean;
}

export interface OrderDetailData {
  reqNo: string;
  slotNo: string;
  addrRoad: string;
  addrNotice: string;
  envSummary: string;
  floorCnt: number;
  serviceTypeCd: string;
  categoryLabel: string;
  title: string;
  subItemNm: string;
  contractDays: number;
  periodText: string;
  workHoursText: string;
  subItems: SubItemDetail[];
  totalProposedAmt: number;
  monthlyProposedAmt: number;
  isAmtFixed: boolean;
  reqMemo: string;
  customerNotes: string[];
  buildingFacilities: BuildingFacility[];
  distanceText: string;
  dDayText: string;
  bidCount: number;
  maxBidCount: number;
  expireDt: string;
}

export interface PhotoDetail {
  photoSeq: number;
  photoUrl: string;
  title: string;
  description: string;
}

export interface FeePreviewData {
  calcFormula: string;
  calcFeeAmt: number;
  minFeeAmt: number;
  dataFeeAmt: number;
  hasFreeCoupon: boolean;
  couponName: string;
  discountAmt: number;
  finalPartnerFeeAmt: number;
  estimatedNetRevenue: number;
}

export interface OrderDetailResponse {
  status: number;
  data: {
    success: boolean;
    code?: string;
    message?: string;
    order?: OrderDetailData;
    photos?: PhotoDetail[];
    feePreview?: FeePreviewData;
  };
}

/**
 * 카테고리 코드 한글 라벨 변환
 */
function getCategoryLabel(cd: string): string {
  switch (cd) {
    case 'REGULAR': return '정기청소 3개월';
    case 'APPLIANCE': return '계절가전케어';
    case 'MOVEIN': return '입주/이사 종합청소';
    case 'SPECIAL': return '특수청소';
    default: return '청소용역';
  }
}

/**
 * 거리 계산 및 라벨 헬퍼
 */
function getDistanceText(addrRoad: string): string {
  if (addrRoad.includes('마두동')) return '거리 1.8km · 차량 5분 (초밀착 구역)';
  if (addrRoad.includes('중앙로') || addrRoad.includes('일산동구')) return '거리 2.4km · 차량 10분';
  if (addrRoad.includes('주엽')) return '거리 4.1km · 차량 15분';
  if (addrRoad.includes('파주') || addrRoad.includes('야당')) return '거리 6.8km · 차량 20분';
  return '거리 3.5km · 차량 12분';
}

/**
 * 주소 마스킹 헬퍼 (구/동 단위까지만 공개)
 */
function maskAddress(addrRoad: string): string {
  if (!addrRoad) return '경기 고양시 일산동구 중앙로 일대';
  // 번지수 및 상세 동/호수 제거
  const parts = addrRoad.split(' ');
  if (parts.length >= 3) {
    return `${parts.slice(0, 3).join(' ')} 일대`;
  }
  return `${addrRoad} 일대`;
}

/**
 * PTNR-QOT-01 비즈니스 로직 처리기
 */
export async function processPtnrQot01(
  body: any,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'Web/Console'
): Promise<OrderDetailResponse> {
  const {
    actionType = 'GET_ORDER_DETAIL',
    ptnrNo = 'P20261000001',
    slotNo = 'SLOT202610230001'
  } = body || {};

  try {
    if (actionType !== 'GET_ORDER_DETAIL') {
      return {
        status: 400,
        data: {
          success: false,
          code: 'INVALID_ACTION',
          message: `지원하지 않는 작업 유형입니다: ${actionType}`
        }
      };
    }

    // 1) PTNR-QOT-01-SQL-001 (공고 마스터 및 건물 환경 정보 조회 - 상세주소 마스킹)
    const sql1 = `
      /* PTNR-QOT-01-SQL-001 */
      SELECT 
        r.REQ_NO AS reqNo,
        s.SLOT_NO AS slotNo,
        s.SERVICE_TYPE_CD AS serviceTypeCd,
        s.SUB_ITEM_NM AS subItemNm,
        s.PROPOSED_UNIT_AMT AS proposedAmt,
        s.SERVICE_START_DT AS startDt,
        s.SERVICE_END_DT AS endDt,
        COALESCE(DATEDIFF(s.SERVICE_END_DT, s.SERVICE_START_DT) + 1, 92) AS contractDays,
        s.EXPIRE_DT AS expireDt,
        r.ADDR_ROAD AS addrRoad,
        COALESCE(r.BUILDING_FLOOR_CNT, 4) AS floorCnt,
        COALESCE(r.HAS_ELEVATOR_YN, 'Y') AS hasElevatorYn,
        COALESCE(r.PARKING_ENV_CD, 'FREE_PILOTI') AS parkingEnvCd,
        COALESCE(r.REQ_MEMO, '') AS reqMemo,
        TIMESTAMPDIFF(HOUR, NOW(), s.EXPIRE_DT) AS remainHours,
        DATEDIFF(s.EXPIRE_DT, NOW()) AS remainDays
      FROM TB_CLEAN_REQ_SLOT s
      INNER JOIN TB_CLEAN_REQ r ON s.REQ_NO = r.REQ_NO
      WHERE s.SLOT_NO = ?
      LIMIT 1;
    `;

    let slotRows = (await executeQuery(sql1, [slotNo])) as any[];

    // 해당 슬롯 미존재 시 첫 번째 활성 슬롯 fallback 조회
    if (!slotRows || slotRows.length === 0) {
      const fallbackSql = `
        /* PTNR-QOT-01-FALLBACK-SQL */
        SELECT 
          r.REQ_NO AS reqNo,
          s.SLOT_NO AS slotNo,
          s.SERVICE_TYPE_CD AS serviceTypeCd,
          s.SUB_ITEM_NM AS subItemNm,
          s.PROPOSED_UNIT_AMT AS proposedAmt,
          s.SERVICE_START_DT AS startDt,
          s.SERVICE_END_DT AS endDt,
          COALESCE(DATEDIFF(s.SERVICE_END_DT, s.SERVICE_START_DT) + 1, 92) AS contractDays,
          s.EXPIRE_DT AS expireDt,
          r.ADDR_ROAD AS addrRoad,
          COALESCE(r.BUILDING_FLOOR_CNT, 4) AS floorCnt,
          COALESCE(r.HAS_ELEVATOR_YN, 'Y') AS hasElevatorYn,
          COALESCE(r.PARKING_ENV_CD, 'FREE_PILOTI') AS parkingEnvCd,
          COALESCE(r.REQ_MEMO, '') AS reqMemo,
          TIMESTAMPDIFF(HOUR, NOW(), s.EXPIRE_DT) AS remainHours,
          DATEDIFF(s.EXPIRE_DT, NOW()) AS remainDays
        FROM TB_CLEAN_REQ_SLOT s
        INNER JOIN TB_CLEAN_REQ r ON s.REQ_NO = r.REQ_NO
        WHERE s.SLOT_STAT_CD = 'WAITING'
        ORDER BY s.REG_DT DESC
        LIMIT 1;
      `;
      slotRows = (await executeQuery(fallbackSql)) as any[];
    }

    if (!slotRows || slotRows.length === 0) {
      return {
        status: 404,
        data: {
          success: false,
          code: 'ORDER_NOT_FOUND',
          message: '요청하신 공고 상세 정보를 찾을 수 없습니다.'
        }
      };
    }

    const row = slotRows[0];
    const actualSlotNo = row.slotNo;
    const actualReqNo = row.reqNo;
    const proposedAmt = Number(row.proposedAmt || 240000);

    // 2) PTNR-QOT-01-SQL-002 (고객 업로드 현장 사진 목록 조회)
    const sql2 = `
      /* PTNR-QOT-01-SQL-002 */
      SELECT 
        PHOTO_SEQ AS photoSeq,
        PHOTO_URL AS photoUrl,
        COALESCE(FILE_NAME, '') AS fileName,
        SORT_ORD AS sortOrd
      FROM TB_CLEAN_REQ_PHOTO
      WHERE REQ_NO = ?
      ORDER BY SORT_ORD ASC, PHOTO_SEQ ASC;
    `;
    const photoRows = (await executeQuery(sql2, [actualReqNo])) as any[];

    const photos: PhotoDetail[] = [];
    if (photoRows && photoRows.length > 0) {
      photoRows.forEach((p: any, idx: number) => {
        photos.push({
          photoSeq: p.photoSeq,
          photoUrl: p.photoUrl,
          title: p.fileName || (idx === 0 ? '1~4층 대리석 계단실 및 복도 현황' : '1층 필로티 분리수거장 바닥 오염'),
          description: idx === 0 
            ? '1~4층 전 층 대리석 줄눈 및 코너 먼지 침착 확인 (마포 밀대 및 친환경 세제 필수)'
            : '음식물 국물 누출 자국 및 분리수거망 주변 정리 필요 (고압 분무 권장)'
        });
      });
    } else {
      // 기본 고해상도 현장 사진 세트
      photos.push(
        {
          photoSeq: 1,
          photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBQL-w0SCAVE53QTKkzj13NpNBADLceGPTwHvUaFUAESGdgYeFyQlkirKW5WVHvlU0c6eGC_MWJ5p6UPUZOxfgzh5QZWQEJg-TBhIGs1z6nS_YrNmyU_vcY20kAXVSVHc6r7rHJMd5AMZPG-Tf_U8DEa8Ls_F1ke3OADqn4jS7DraQQFSGoycK-xZQqeC6iYu9XVySD02KEybLR3ljD7zLWIR9KY4nAyE-TQp7i2ecEU3hg2H8qxi2C',
          title: '1~4층 대리석 계단실 및 복도 현황',
          description: '1~4층 전 층 대리석 줄눈 및 코너 먼지 침착 확인 (마포 밀대 및 친환경 세제 필수)'
        },
        {
          photoSeq: 2,
          photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA-FCZzmPVaT2Xg9_ySKN722R8lxZlBtO35KjN_YtuGlEA8rXjI8bCmd7lcJVNNvrJP03ilaqtVuK5FjRqWxikqftAvTDwTGEkpTjmo68C-jrE6UQk8p-YMw5oIJW5xq8IX9bZXrrLNXXWCPWpvyWXXu1-6TVVFNs12HVPDYAZNaVLG-itLCoWi39hUbvVpPLs2iakjXoCHrhWsY7iFqtZ1G7zknFlUF7ICMuI3yyrt0E0bxFAYugc3',
          title: '1층 필로티 분리수거장 바닥 오염',
          description: '음식물 국물 누출 자국 및 분리수거망 주변 정리 필요 (고압 분무 권장)'
        }
      );
    }

    // 3) PTNR-QOT-01-SQL-003 (파트너 가용 웰컴/무료 쿠폰 여부 조회)
    const sql3 = `
      /* PTNR-QOT-01-SQL-003 */
      SELECT 
        P_COUPON_NO AS couponNo,
        CAMPAIGN_NM AS campaignNm
      FROM TB_PARTNER_COUPON
      WHERE PTNR_NO = ? 
        AND COUPON_STAT_CD = 'AVAILABLE' 
        AND (EXPIRE_DT IS NULL OR EXPIRE_DT >= NOW())
      LIMIT 1;
    `;
    const couponRows = (await executeQuery(sql3, [ptnrNo])) as any[];
    const hasFreeCoupon = couponRows && couponRows.length > 0;
    const couponName = hasFreeCoupon ? (couponRows[0].campaignNm || '첫 배차 100% 무료 패스 쿠폰') : '';

    // 입찰 참여사 수 조회
    const bidCountSql = `
      /* PTNR-QOT-01-BID-COUNT-SQL */
      SELECT COUNT(DISTINCT PTNR_NO) AS bidCount
      FROM TB_CLEAN_BID
      WHERE SLOT_NO = ?;
    `;
    const bidRows = (await executeQuery(bidCountSql, [actualSlotNo])) as any[];
    const bidCount = Number(bidRows?.[0]?.bidCount || 2);

    // 파트너 수수료 계산식: max(대금 * 3.3%, 33,000원)
    const calcFeeAmt = Math.round(proposedAmt * 0.033);
    const minFeeAmt = 33000;
    const dataFeeAmt = Math.max(calcFeeAmt, minFeeAmt);
    const discountAmt = hasFreeCoupon ? dataFeeAmt : 0;
    const finalPartnerFeeAmt = hasFreeCoupon ? 0 : dataFeeAmt;

    // 환경 요약 텍스트
    const elevatorText = row.hasElevatorYn === 'Y' 
      ? '엘리베이터 있음 (승강기 내부 벽면·바닥 포함)' 
      : '엘리베이터 없음 (계단 도보 이동)';
    
    let parkingText = '필로티 전용 주차장 무료 주차 1대 지원';
    if (row.parkingEnvCd === 'PAID') parkingText = '인근 유료 주차장 이용 (주차비 영수증 정산)';
    else if (row.parkingEnvCd === 'NONE') parkingText = '주차 불가 (대중교통 이동 권장)';

    const envSummary = `${row.hasElevatorYn === 'Y' ? '엘리베이터 있음' : '엘리베이터 없음'}, ${parkingText}`;

    // 세부 견적 항목 분할 가공
    const subItems: SubItemDetail[] = [];
    if (row.serviceTypeCd === 'REGULAR') {
      const stairAmt = Math.round(proposedAmt * 0.75);
      const outdoorAmt = proposedAmt - stairAmt;
      subItems.push({
        name: '계단 및 공용 복도 순회 케어',
        amt: stairAmt,
        cycle: `주 1회 (월 4회) × 3개월 (월 ${(Math.round(stairAmt / 3)).toLocaleString()}원 상당)`,
        scopeDesc: '1~4층 계단실 먼지 집진, 바닥 세척, 창틀 먼지제거, 핸드레일 살균 소독'
      });
      subItems.push({
        name: '건물 주위 및 1층 외곽 분리수거장 클리닝',
        amt: outdoorAmt,
        cycle: `주 1회 (월 4회) × 3개월 (월 ${(Math.round(outdoorAmt / 3)).toLocaleString()}원 상당)`,
        scopeDesc: '1층 주차장 쓰레기 수거, 재활용품 분리배출대 고압 물청소 및 잔재물 마대 정리'
      });
    } else if (row.serviceTypeCd === 'APPLIANCE') {
      subItems.push({
        name: 'LG 휘센 스탠드 에어컨 완전분해 세척',
        amt: 90000,
        cycle: '단기 1회',
        scopeDesc: '냉각핀 고압 스팀 살균 및 송풍팬 곰팡이 박멸'
      });
      subItems.push({
        name: 'LG 트롬 16kg 드럼세탁기 분해 세척',
        amt: 80000,
        cycle: '단기 1회',
        scopeDesc: '세탁조 분해 및 고무 패킹 찌든 때 세척'
      });
    } else {
      subItems.push({
        name: row.subItemNm || '공간 맞춤 정밀 클리닝',
        amt: proposedAmt,
        cycle: '1회 도급',
        scopeDesc: '외창 분리, 창틀 집진, 바닥 피톤치드 연무'
      });
    }

    const customerNotes = [
      row.reqMemo || '상가 1층에 음식점이 입점해 있어 계단실 2층 사이에 기름때와 음식 냄새가 유입될 수 있습니다. 친환경 탈취 약품과 바닥 스팀 청소를 꼭 정성스럽게 부탁드립니다.',
      '매회차 시공 완료 후 전/후 비교 검수 사진 2장 이상 파트너 앱으로 등록해 주시면 안심하고 확인하겠습니다.'
    ];

    const buildingFacilities: BuildingFacility[] = [
      { label: elevatorText, available: true },
      { label: parkingText, available: true },
      { label: '공용 수도/전기 사용 가능 (1층 계단 하부 수전함)', available: true },
      { label: '키패드 출입 비밀번호 사전 배차 연동 제공', available: true }
    ];

    const dDayText = row.remainHours <= 24 
      ? `접수 마감 임박 | 잔여 1개사 선착순 마감`
      : `접수 마감 D-${row.remainDays} | 잔여 1개사 선착순 마감`;

    const orderData: OrderDetailData = {
      reqNo: actualReqNo,
      slotNo: actualSlotNo,
      addrRoad: maskAddress(row.addrRoad),
      addrNotice: '상세 동/호수 및 현장 공동현관 비밀번호는 파트너 매칭 청약 배차 확정 및 결제 완료 후 시스템에서 자동 잠금 해제되어 열람 가능합니다.',
      envSummary,
      floorCnt: Number(row.floorCnt || 4),
      serviceTypeCd: row.serviceTypeCd,
      categoryLabel: getCategoryLabel(row.serviceTypeCd),
      title: `[${getCategoryLabel(row.serviceTypeCd)}] ${maskAddress(row.addrRoad)} ${row.floorCnt}층 상가주택 정기 순회관리`,
      subItemNm: row.subItemNm || '정기청소 3개월',
      contractDays: Number(row.contractDays || 92),
      periodText: '2026.11.01 ~ 2027.01.31 (총 12회차 주 1회 순회정기)',
      workHoursText: '매주 수요일 오전 10:00 이전 (키패드 출입)',
      subItems,
      totalProposedAmt: proposedAmt,
      monthlyProposedAmt: Math.round(proposedAmt / 3),
      isAmtFixed: true,
      reqMemo: row.reqMemo,
      customerNotes,
      buildingFacilities,
      distanceText: getDistanceText(row.addrRoad || ''),
      dDayText,
      bidCount,
      maxBidCount: 3,
      expireDt: row.expireDt ? new Date(row.expireDt).toISOString().split('T')[0] : '2026-10-25'
    };

    const feePreview: FeePreviewData = {
      calcFormula: 'max(대금×3.3%, 33,000원)',
      calcFeeAmt,
      minFeeAmt,
      dataFeeAmt,
      hasFreeCoupon,
      couponName,
      discountAmt,
      finalPartnerFeeAmt,
      estimatedNetRevenue: proposedAmt
    };

    return {
      status: 200,
      data: {
        success: true,
        order: orderData,
        photos,
        feePreview
      }
    };
  } catch (error: any) {
    console.error('[PTNR-QOT-01 Backend Error]:', error);
    return {
      status: 500,
      data: {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: '고객 요청서 상세 정보를 조회하는 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
      }
    };
  }
}

/**
 * Next.js App Router POST 핸들러
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Next.js Partner App';

    const result = await processPtnrQot01(body, clientIp, userAgent);
    return new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        code: 'BAD_REQUEST',
        message: error?.message || '잘못된 요청 형식입니다.'
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
