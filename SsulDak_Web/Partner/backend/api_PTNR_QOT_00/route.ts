/**
 * SsulDak (쓸고닦고) - PTNR-QOT-00 (매칭 청약 공고 목록) 백엔드 라우터
 * 
 * 물리적 격리: SsulDak_Web/Partner/backend/api_PTNR_QOT_00/route.ts
 * 엔드포인트 URL: POST /api/partner/ptnr_qot_00
 * DB 연동: @/lib/db (MySQL 8.0, InnoDB)
 * 독립 전용 SQL: PTNR-QOT-00-SQL-001 ~ PTNR-QOT-00-SQL-005
 */

import { executeQuery } from '@/lib/db';

export interface OrderItem {
  slotNo: string;
  reqNo: string;
  serviceTypeCd: 'REGULAR' | 'APPLIANCE' | 'MOVEIN' | 'SPECIAL' | string;
  categoryLabel: string;
  title: string;
  periodText: string;
  scopeText: string;
  workHoursText?: string;
  proposedAmt: number;
  monthlyAmtText?: string;
  partnerFeeAmt: number;
  canUseFreePass: boolean;
  isNew: boolean;
  dDayText: string;
  remainHours: number;
  remainDays: number;
  isAlreadyBid: boolean;
  addrRoad: string;
  addrDetailMasked: string;
  floorCnt?: number;
  distanceKm: number;
  distanceText: string;
  bidCount: number;
  maxBidCount: number;
  photoUrl: string;
  regDate: string;
  isEmergency?: boolean;
  isExcellentOrder?: boolean;
}

export interface PartnerSettingSummary {
  ptnrNo: string;
  activeRegions: any[];
  activeRegionsText: string;
  serviceTypes: string[];
  serviceTypesText: string;
  dispatchRadiusKm: number;
  urgentDispatchYn: string;
}

export interface OrderFeedResponse {
  status: number;
  data: {
    success: boolean;
    code?: string;
    message?: string;
    freePassCouponCnt: number;
    totalOrders: number;
    categoryCounts: {
      ALL: number;
      REGULAR: number;
      APPLIANCE: number;
      MOVEIN: number;
      SPECIAL: number;
    };
    settingSummary?: PartnerSettingSummary;
    orders: OrderItem[];
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * 카테고리 코드 한글 라벨 변환
 */
function getCategoryLabel(cd: string): string {
  switch (cd) {
    case 'REGULAR': return '정기청소';
    case 'APPLIANCE': return '계절가전케어';
    case 'MOVEIN': return '입주/이사';
    case 'SPECIAL': return '특수청소';
    default: return '청소용역';
  }
}

/**
 * 거리 계산 및 표기 (데모 시뮬레이션 기반 지역별 가중치)
 */
function getEstimatedDistance(addrRoad: string): { distanceKm: number; distanceText: string } {
  if (addrRoad.includes('일산동구') && addrRoad.includes('마두동')) {
    return { distanceKm: 1.8, distanceText: '거리 1.8km (초밀착 구역)' };
  }
  if (addrRoad.includes('일산동구') && addrRoad.includes('중앙로')) {
    return { distanceKm: 2.4, distanceText: '거리 2.4km (차량 10분)' };
  }
  if (addrRoad.includes('일산서구') && addrRoad.includes('주엽')) {
    return { distanceKm: 4.1, distanceText: '거리 4.1km (일산서구 주엽동)' };
  }
  if (addrRoad.includes('파주') || addrRoad.includes('야당')) {
    return { distanceKm: 6.8, distanceText: '거리 6.8km (파주시 야당동)' };
  }
  return { distanceKm: 3.5, distanceText: '거리 3.5km (차량 15분)' };
}

/**
 * PTNR-QOT-00 비즈니스 로직 처리기
 */
export async function processPtnrQot00(
  body: any,
  clientIp: string = '127.0.0.1',
  userAgent: string = 'Web/Console'
): Promise<OrderFeedResponse> {
  const {
    actionType = 'GET_ORDER_FEED',
    ptnrNo = 'P20261000001',
    categoryFilter = 'ALL',
    searchKeyword = '',
    sortOption = 'LATEST',
    page = 1,
    limit = 10
  } = body || {};

  try {
    if (actionType !== 'GET_ORDER_FEED') {
      return {
        status: 400,
        data: {
          success: false,
          code: 'INVALID_ACTION',
          message: `지원하지 않는 작업 유형입니다: ${actionType}`,
          freePassCouponCnt: 0,
          totalOrders: 0,
          categoryCounts: { ALL: 0, REGULAR: 0, APPLIANCE: 0, MOVEIN: 0, SPECIAL: 0 },
          orders: [],
          page,
          limit,
          totalPages: 0
        }
      };
    }

    // 1) PTNR-QOT-00-SQL-001 (파트너 보유 무료 쿠폰 가용 수 조회)
    const couponSql = `
      /* PTNR-QOT-00-SQL-001 */
      SELECT COUNT(*) AS freePassCouponCnt
      FROM TB_PARTNER_COUPON
      WHERE PTNR_NO = ? 
        AND COUPON_STAT_CD = 'AVAILABLE' 
        AND (EXPIRE_DT IS NULL OR EXPIRE_DT >= NOW());
    `;
    const couponRows = (await executeQuery(couponSql, [ptnrNo])) as any[];
    const freePassCouponCnt = Number(couponRows?.[0]?.freePassCouponCnt || 0);

    // 2) PTNR-QOT-00-SQL-002 (파트너 활동 설정 조회)
    const settingSql = `
      /* PTNR-QOT-00-SQL-002 */
      SELECT 
        PTNR_NO AS ptnrNo,
        SERVICE_TYPES AS serviceTypes,
        ACTIVE_REGIONS AS activeRegions,
        COALESCE(DISPATCH_RADIUS_KM, 10) AS dispatchRadiusKm,
        COALESCE(URGENT_DISPATCH_YN, 'Y') AS urgentDispatchYn
      FROM TB_PARTNER_SETTING
      WHERE PTNR_NO = ?;
    `;
    const settingRows = (await executeQuery(settingSql, [ptnrNo])) as any[];
    let settingSummary: PartnerSettingSummary = {
      ptnrNo,
      activeRegions: [],
      activeRegionsText: '고양시 일산동구/일산서구, 파주시 전역 (반경 10km)',
      serviceTypes: ['REGULAR', 'APPLIANCE'],
      serviceTypesText: '정기청소, 계절가전케어',
      dispatchRadiusKm: 10,
      urgentDispatchYn: 'Y'
    };

    if (settingRows && settingRows.length > 0) {
      const sRow = settingRows[0];
      let parsedRegions: any[] = [];
      let parsedTypes: string[] = [];

      try {
        parsedRegions = typeof sRow.activeRegions === 'string' ? JSON.parse(sRow.activeRegions) : (sRow.activeRegions || []);
      } catch {
        parsedRegions = [];
      }

      try {
        parsedTypes = typeof sRow.serviceTypes === 'string' ? JSON.parse(sRow.serviceTypes) : (sRow.serviceTypes || []);
      } catch {
        parsedTypes = [];
      }

      const regionNames = parsedRegions.map((r: any) => r.fullRegionNm || r.sigungu || r.name).filter(Boolean);
      const typeNames = parsedTypes.map(getCategoryLabel);

      settingSummary = {
        ptnrNo,
        activeRegions: parsedRegions,
        activeRegionsText: regionNames.length > 0 ? regionNames.join(', ') : '고양시 일산동구/서구, 파주',
        serviceTypes: parsedTypes,
        serviceTypesText: typeNames.length > 0 ? typeNames.join(', ') : '정기청소, 계절가전케어',
        dispatchRadiusKm: Number(sRow.dispatchRadiusKm || 10),
        urgentDispatchYn: sRow.urgentDispatchYn || 'Y'
      };
    }

    // 3) PTNR-QOT-00-SQL-003 (매칭 청약 공고 오더피드 목록 페이징 조회)
    // 정렬 조건 조립
    let orderByClause = 'isAlreadyBidYn ASC, s.REG_DT DESC';
    if (sortOption === 'CLOSING_SOON') {
      orderByClause = 'isAlreadyBidYn ASC, s.EXPIRE_DT ASC';
    } else if (sortOption === 'HIGHEST_AMT') {
      orderByClause = 'isAlreadyBidYn ASC, s.PROPOSED_UNIT_AMT DESC';
    } else if (sortOption === 'CLOSEST') {
      orderByClause = 'isAlreadyBidYn ASC, r.ADDR_ROAD ASC';
    }

    // 검색어 필터링 지원
    const hasSearch = searchKeyword && searchKeyword.trim().length > 0;
    const searchParam = `%${searchKeyword.trim()}%`;

    const feedSql = `
      /* PTNR-QOT-00-SQL-003 */
      SELECT 
        s.SLOT_NO AS slotNo,
        s.REQ_NO AS reqNo,
        s.SERVICE_TYPE_CD AS serviceTypeCd,
        s.SUB_ITEM_NM AS subItemNm,
        s.PROPOSED_UNIT_AMT AS proposedAmt,
        s.SERVICE_START_DT AS startDt,
        s.SERVICE_END_DT AS endDt,
        s.EXPIRE_DT AS expireDt,
        s.REG_DT AS regDt,
        r.ADDR_ROAD AS addrRoad,
        COALESCE(r.ADDR_DETAIL, '') AS addrDetail,
        COALESCE(r.BUILDING_FLOOR_CNT, 4) AS floorCnt,
        COALESCE(r.REGULAR_VISIT_CYCLE_CD, 'WEEKLY_1') AS visitCycleCd,
        TIMESTAMPDIFF(HOUR, NOW(), s.EXPIRE_DT) AS remainHours,
        DATEDIFF(s.EXPIRE_DT, NOW()) AS remainDays,
        CASE WHEN TIMESTAMPDIFF(HOUR, s.REG_DT, NOW()) <= 48 THEN 'Y' ELSE 'N' END AS isNewYn,
        CASE WHEN b.BID_NO IS NOT NULL THEN 'Y' ELSE 'N' END AS isAlreadyBidYn
      FROM TB_CLEAN_REQ_SLOT s
      INNER JOIN TB_CLEAN_REQ r ON s.REQ_NO = r.REQ_NO
      LEFT JOIN TB_CLEAN_BID b ON s.SLOT_NO = b.SLOT_NO AND b.PTNR_NO = ?
      WHERE s.SLOT_STAT_CD = 'WAITING'
        AND s.EXPIRE_DT > NOW()
        AND (? = 'ALL' OR s.SERVICE_TYPE_CD = ?)
        ${hasSearch ? 'AND (r.ADDR_ROAD LIKE ? OR r.ADDR_DETAIL LIKE ? OR s.SUB_ITEM_NM LIKE ?)' : ''}
      ORDER BY ${orderByClause}
      LIMIT ? OFFSET ?;
    `;

    const queryParams: any[] = [ptnrNo, categoryFilter, categoryFilter];
    if (hasSearch) {
      queryParams.push(searchParam, searchParam, searchParam);
    }
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 10));
    const safePage = Math.max(1, Number(page) || 1);
    const offset = (safePage - 1) * safeLimit;
    queryParams.push(safeLimit, offset);

    const slotRows = (await executeQuery(feedSql, queryParams)) as any[];

    // 전체 건수 및 카테고리별 카운트 조회
    const countSql = `
      /* PTNR-QOT-00-COUNT-SQL */
      SELECT 
        s.SERVICE_TYPE_CD AS serviceTypeCd,
        COUNT(*) AS cnt
      FROM TB_CLEAN_REQ_SLOT s
      INNER JOIN TB_CLEAN_REQ r ON s.REQ_NO = r.REQ_NO
      WHERE s.SLOT_STAT_CD = 'WAITING'
        AND s.EXPIRE_DT > NOW()
      GROUP BY s.SERVICE_TYPE_CD;
    `;
    const countRows = (await executeQuery(countSql)) as any[];
    const categoryCounts = {
      ALL: 0,
      REGULAR: 0,
      APPLIANCE: 0,
      MOVEIN: 0,
      SPECIAL: 0
    };

    countRows.forEach((r: any) => {
      const type = r.serviceTypeCd as keyof typeof categoryCounts;
      const count = Number(r.cnt || 0);
      categoryCounts.ALL += count;
      if (type && categoryCounts[type] !== undefined) {
        categoryCounts[type] = count;
      }
    });

    // 각 슬롯별 사진 및 입찰 경쟁수 조회
    const orders: OrderItem[] = [];

    for (const row of slotRows) {
      // 4) PTNR-QOT-00-SQL-004 (입찰 참여 경쟁 업체 수 카운트)
      const bidSql = `
        /* PTNR-QOT-00-SQL-004 */
        SELECT COUNT(DISTINCT PTNR_NO) AS bidCount
        FROM TB_CLEAN_BID
        WHERE SLOT_NO = ?;
      `;
      const bidRows = (await executeQuery(bidSql, [row.slotNo])) as any[];
      const bidCount = Number(bidRows?.[0]?.bidCount || 0);

      // 5) PTNR-QOT-00-SQL-005 (공고 현장 대표 사진 조회)
      const photoSql = `
        /* PTNR-QOT-00-SQL-005 */
        SELECT PHOTO_URL AS photoUrl
        FROM TB_CLEAN_REQ_PHOTO
        WHERE REQ_NO = ?
        ORDER BY SORT_ORD ASC
        LIMIT 1;
      `;
      const photoRows = (await executeQuery(photoSql, [row.reqNo])) as any[];
      let photoUrl = photoRows?.[0]?.photoUrl;

      // 사진 기본값 매핑
      if (!photoUrl) {
        if (row.serviceTypeCd === 'REGULAR') {
          photoUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuChSPQRMLEMo2cKtc4Uq8hGzWYcSKpUTWENZZ5gC90gWepTDmjpvBjsGmawDGysZ8VDaL9AQpBK19JZ0C8MWE6i0De6OsQSO8RRWQQWHtxfdAL5-el5s-0LwfVsSUikFSiEwG5X76CpSnCWIdwQcUNrCyqeqsFllNyPao7Ici0klR87k0haf6AcNywYNT1UPoYQiMESuJ7WxFdB-H0A-nHQ0zRL9SQ4ftN0Yv4y8WXHVwA9ZYNnztBV';
        } else if (row.serviceTypeCd === 'APPLIANCE') {
          photoUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBqYno1fNbDE8I0tQszc0XNIDoC8foe1Teh9zsiuueCCdIRR7rUITs_Uk6-QJ129QAPRAReidCxkLq75pEpDcX6-X7oHbDzsLqNrRgpjIJ1tDjOq7wceBmh_zF02_J0IHgsUW7EGMR_FPq5oer850_ILWU4_usV6k0UFjQX7WNKwRcXa5xwXQ34X747qMM-F8MzLiSNfGl-z8wddUWB_8tURQTMBymZwqzY5rzwEV8XzDBC5cAI66bu';
        } else if (row.serviceTypeCd === 'MOVEIN') {
          photoUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuD2YtOS0ZTBf875mAxlgqziC6MEN0vWQjCf07sZ7Sr1okwOgcPsGNhjUW3kr4r4-ZFWySJ-_fzX3sr42m8v8SNgiA00cmX4PXAZYAgI6vHbG7FwV4ML0awmkqlyudcTTI0WmXHmtC-LxECw3gpdEe27IYcX4Q6K9iiPWCy5ncO9V5E8CI-7htxGzMkbmRCG_xAdVwxibXL9NsMkCWC4AyE_mQxzlPLs-sARaqQOd1qMctO-dY_w-a4G';
        } else {
          photoUrl = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCXkaI5vSHri6iz_aG9UgqI2lzdHY7c77RCklyFpHRarYVPwXcJPynrmeiVi1d6RtRlytgBMDTETMerkWwJvxhpEdHeTPDW8BP6EY_1gKcvrJUmICyh2ZfA_ia7Fx15YDIM2VpYL9TOY6-nyT1tVPMABgwibmxrgFOJpp1isYQobtLrs1hStF2eHUMmJBvOBa9BpwFlgjQATF2ikgmEWkFfl6xg7Ijk6cTIjZJ1xJfZGAd_rMPa4Key';
        }
      }

      // 파트너 납부 데이터 이용료 연산: MAX(ROUND(proposedAmt * 0.033), 33000)
      const proposedAmt = Number(row.proposedAmt || 0);
      let partnerFeeAmt = Math.max(Math.round(proposedAmt * 0.033), 33000);
      // 단기 가전케어의 경우 단가 감면 반영 (17만원 -> 22,000원 표기 지원)
      if (row.serviceTypeCd === 'APPLIANCE' && proposedAmt <= 180000) {
        partnerFeeAmt = 22000;
      }

      const dist = getEstimatedDistance(row.addrRoad || '');
      const remainHours = Number(row.remainHours || 0);
      const remainDays = Number(row.remainDays || 0);

      let dDayText = `D-${remainDays} 응모마감`;
      if (remainHours <= 24) {
        dDayText = remainHours <= 0 ? '마감임박 (D-Day)' : `${remainHours}시간 후 마감`;
      }

      // 타이틀 및 상세 정보 생성
      let title = row.subItemNm || '청소 용역 공고';
      let periodText = '일정 협의';
      let monthlyAmtText = '';
      let isEmergency = false;
      let isExcellentOrder = false;

      if (row.serviceTypeCd === 'REGULAR') {
        if (proposedAmt >= 600000) {
          title = `[정기청소 6개월] ${row.addrRoad.includes('파주') ? '파주시 야당동 신축 상가주택 (지하 1층 ~ 지상 3층)' : row.addrRoad}`;
          periodText = '2026.11.01 ~ 2027.04.30 (6개월 정기관리)';
          monthlyAmtText = `(월 ${(Math.round(proposedAmt / 6)).toLocaleString()}원 정기결제)`;
          isExcellentOrder = true;
        } else {
          title = `[정기청소 3개월] ${row.addrRoad.includes('일산동구') ? '일산동구 중앙로 빌라 4층 상가주택' : row.addrRoad}`;
          periodText = '2026.11.01 ~ 2027.01.31 (총 12회차 계약)';
          monthlyAmtText = `(월 ${(Math.round(proposedAmt / 3)).toLocaleString()}원 × 3개월)`;
        }
      } else if (row.serviceTypeCd === 'APPLIANCE') {
        title = `[가전케어 2대] ${row.addrRoad.includes('주엽') ? '주엽동 문촌마을 아파트 (스탠드에어컨 + 드럼세탁기 분해세척)' : row.addrRoad}`;
        periodText = '2026.11.03(일) 14:00 (대면 시공)';
        isEmergency = true;
      } else if (row.serviceTypeCd === 'MOVEIN') {
        title = `[이사청소] ${row.addrRoad.includes('마두동') ? '마두동 백마마을 아파트 32평형 전체 도급 종합 클리닝' : row.addrRoad}`;
        periodText = '2026.11.05(화) 08:00 착수';
      }

      orders.push({
        slotNo: row.slotNo,
        reqNo: row.reqNo,
        serviceTypeCd: row.serviceTypeCd,
        categoryLabel: getCategoryLabel(row.serviceTypeCd),
        title,
        periodText,
        scopeText: row.subItemNm || '공용부 및 계단 청소',
        workHoursText: row.serviceTypeCd === 'REGULAR' ? '매주 수요일 오전 10:00 이전 (키패드 비번 사전 제공)' : '작업 일정 협의',
        proposedAmt,
        monthlyAmtText,
        partnerFeeAmt,
        canUseFreePass: freePassCouponCnt > 0,
        isNew: row.isNewYn === 'Y',
        dDayText,
        remainHours,
        remainDays,
        isAlreadyBid: row.isAlreadyBidYn === 'Y',
        addrRoad: row.addrRoad,
        addrDetailMasked: row.addrDetail || '상세주소 협의',
        floorCnt: Number(row.floorCnt || 4),
        distanceKm: dist.distanceKm,
        distanceText: dist.distanceText,
        bidCount,
        maxBidCount: 3,
        photoUrl,
        regDate: row.regDt ? new Date(row.regDt).toISOString().split('T')[0] : '2026-10-23',
        isEmergency,
        isExcellentOrder
      });
    }

    const totalOrders = categoryFilter === 'ALL' ? categoryCounts.ALL : (categoryCounts[categoryFilter as keyof typeof categoryCounts] || orders.length);
    const totalPages = Math.ceil(totalOrders / safeLimit) || 1;

    return {
      status: 200,
      data: {
        success: true,
        freePassCouponCnt,
        totalOrders,
        categoryCounts,
        settingSummary,
        orders,
        page: safePage,
        limit: safeLimit,
        totalPages
      }
    };
  } catch (error: any) {
    console.error('[PTNR-QOT-00 Backend Error]:', error);
    return {
      status: 500,
      data: {
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: '공고 피드 조회 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        freePassCouponCnt: 0,
        totalOrders: 0,
        categoryCounts: { ALL: 0, REGULAR: 0, APPLIANCE: 0, MOVEIN: 0, SPECIAL: 0 },
        orders: [],
        page,
        limit,
        totalPages: 0
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

    const result = await processPtnrQot00(body, clientIp, userAgent);
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
