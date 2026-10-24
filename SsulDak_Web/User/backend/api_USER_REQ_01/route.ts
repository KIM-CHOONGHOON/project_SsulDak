/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 개발 명세
 * 화면 ID: USER-REQ-01 (정기청소 중분류 추가 모달)
 * 백엔드 라우터 경로: SsulDak_Web/User/backend/api_USER_REQ_01/route.ts
 * 엔드포인트 URL: POST /api/user/user_req_01
 *
 * [독립 전용 SQL 쿼리 ID]
 *   - USER-REQ-01-SQL-001 (정기청소 구역 중분류 코드 목록 조회)
 *   - USER-REQ-01-SQL-002 (방문 주기 코드 목록 조회)
 *
 * [비즈니스 룰 및 단가 하한선 가이드]
 *   - 정기청소는 3개월(90일) 의무 계약 기준이므로 모든 단가는 "3개월 총액" 기준으로 계산.
 *   - 계단 청소(STAIR)의 경우 층수(시작층~끝층)와 방문 주기에 따라 최소 권장 하한선 가이드 실시간 산출.
 *     (기본 4층 주 1회 기준 3개월 최저 하한선 180,000원 -> 월 60,000원 상당)
 *     층당 ±20,000원 증감 반영 (최소 120,000원 하한 보장).
 * =============================================================================
 */

import { executeQuery } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

// =============================================================================
// 1. 인터페이스 정의
// =============================================================================

export type Req01Mode = 'GET_INIT_CODES' | 'CALC_GUIDE_PRICE';

export interface UserReq01ReqBody {
  mode: Req01Mode;
  areaCd?: string;
  startFloor?: number | string;
  endFloor?: number | string;
  cycleCd?: string;
}

export interface AreaCodeItem {
  areaCd: string;
  areaNm: string;
  basePrice3M: number;
  calcType: string | null;
  sortOrd: number;
}

export interface CycleCodeItem {
  cycleCd: string;
  cycleNm: string;
  monthlyVisitCnt: number;
  sortOrd: number;
}

export interface UserReq01Response {
  success: boolean;
  message?: string;
  data?: {
    areas: AreaCodeItem[];
    cycles: CycleCodeItem[];
  };
  floorCount?: number;
  minGuidePrice?: number;
  guideMsg?: string;
}

// =============================================================================
// 2. 비즈니스 엔진 처리 함수 (processUserReq01)
// =============================================================================

export async function processUserReq01(
  body: UserReq01ReqBody
): Promise<{ status: number; body: UserReq01Response }> {
  try {
    const { mode } = body;

    if (!mode) {
      return {
        status: 400,
        body: { success: false, message: 'mode 매개변수가 누락되었습니다.' },
      };
    }

    // -------------------------------------------------------------------------
    // [모드 1] 모달 초기화 데이터 조회 (GET_INIT_CODES)
    // -------------------------------------------------------------------------
    if (mode === 'GET_INIT_CODES') {
      // USER-REQ-01-SQL-001 (정기청소 구역 중분류 코드 목록 조회)
      const sql001 = `
        SELECT 
          COM_CD AS areaCd,
          COM_NM AS areaNm,
          CAST(ATTR_VAL_1 AS UNSIGNED) AS basePrice3M,
          ATTR_VAL_2 AS calcType,
          SORT_ORD AS sortOrd
        FROM TB_COM_CODE
        WHERE GRP_CD = 'REGULAR_CLEAN_AREA' AND USE_YN = 'Y'
        ORDER BY SORT_ORD ASC
      `;

      // USER-REQ-01-SQL-002 (방문 주기 코드 목록 조회)
      const sql002 = `
        SELECT 
          COM_CD AS cycleCd,
          COM_NM AS cycleNm,
          CAST(ATTR_VAL_1 AS UNSIGNED) AS monthlyVisitCnt,
          SORT_ORD AS sortOrd
        FROM TB_COM_CODE
        WHERE GRP_CD = 'VISIT_CYCLE' AND USE_YN = 'Y'
        ORDER BY SORT_ORD ASC
      `;

      const [areaRows, cycleRows] = await Promise.all([
        executeQuery<RowDataPacket[]>(sql001),
        executeQuery<RowDataPacket[]>(sql002),
      ]);

      const areas: AreaCodeItem[] = areaRows.map((r) => ({
        areaCd: r.areaCd,
        areaNm: r.areaNm,
        basePrice3M: Number(r.basePrice3M || 150000),
        calcType: r.calcType,
        sortOrd: Number(r.sortOrd || 0),
      }));

      const cycles: CycleCodeItem[] = cycleRows.map((r) => ({
        cycleCd: r.cycleCd,
        cycleNm: r.cycleNm,
        monthlyVisitCnt: Number(r.monthlyVisitCnt || 4),
        sortOrd: Number(r.sortOrd || 0),
      }));

      return {
        status: 200,
        body: {
          success: true,
          data: {
            areas,
            cycles,
          },
        },
      };
    }

    // -------------------------------------------------------------------------
    // [모드 2] 층수 및 주기별 권장 하한선 단가 계산 (CALC_GUIDE_PRICE)
    // -------------------------------------------------------------------------
    if (mode === 'CALC_GUIDE_PRICE') {
      const { areaCd = 'STAIR', startFloor = 1, endFloor = 4, cycleCd = 'WEEKLY_1' } = body;

      // 층수 계산 (예: B1은 -1로 처리, 1~4층은 4개 층)
      const parseFloor = (f: string | number): number => {
        if (typeof f === 'string') {
          if (f.toUpperCase() === 'B1') return 0;
          if (f.toUpperCase() === 'B2') return -1;
          const num = parseInt(f, 10);
          return isNaN(num) ? 1 : num;
        }
        return Number(f);
      };

      const sf = parseFloor(startFloor);
      const ef = parseFloor(endFloor);
      const floorCount = Math.max(1, Math.abs(ef - sf) + 1);

      // 방문 주기 가중치
      let cycleMultiplier = 1.0;
      if (cycleCd === 'WEEKLY_2') cycleMultiplier = 1.8;
      else if (cycleCd === 'WEEKLY_3') cycleMultiplier = 2.5;
      else if (cycleCd === 'DAILY_WORK') cycleMultiplier = 4.0;
      else if (cycleCd === 'BIWEEKLY') cycleMultiplier = 0.6;

      // 기본 4층 기준 계단청소 3개월 단가 180,000원 (월 60,000원)
      let minGuidePrice = 180000;
      if (areaCd === 'STAIR') {
        const floorDiff = floorCount - 4;
        minGuidePrice = Math.max(120000, 180000 + floorDiff * 20000);
        minGuidePrice = Math.round((minGuidePrice * cycleMultiplier) / 1000) * 1000;
      } else if (areaCd === 'SURROUND' || areaCd === 'PARKING') {
        minGuidePrice = Math.round((120000 * cycleMultiplier) / 1000) * 1000;
      } else if (areaCd === 'BASEMENT' || areaCd === 'CORRIDOR') {
        minGuidePrice = Math.round((100000 * cycleMultiplier) / 1000) * 1000;
      } else if (areaCd === 'ELEVATOR') {
        minGuidePrice = Math.round((80000 * cycleMultiplier) / 1000) * 1000;
      } else {
        minGuidePrice = Math.round((90000 * cycleMultiplier) / 1000) * 1000;
      }

      const monthlyPrice = Math.round(minGuidePrice / 3);
      const guideMsg = `${floorCount}개 층 ${
        cycleCd === 'WEEKLY_1' ? '주 1회' : cycleCd === 'WEEKLY_2' ? '주 2회' : '정기'
      } 방문 기준 3개월 최소 권장 하한선은 ${minGuidePrice.toLocaleString()}원(월 ${monthlyPrice.toLocaleString()}원)입니다.`;

      return {
        status: 200,
        body: {
          success: true,
          floorCount,
          minGuidePrice,
          guideMsg,
        },
      };
    }

    return {
      status: 400,
      body: { success: false, message: `지원하지 않는 모드입니다: ${mode}` },
    };
  } catch (error: any) {
    console.error('USER-REQ-01 Backend Error:', error);
    return {
      status: 500,
      body: {
        success: false,
        message: `서버 처리 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`,
      },
    };
  }
}

// =============================================================================
// 3. Next.js App Router POST 엔드포인트 핸들러
// =============================================================================

export async function POST(req: Request) {
  try {
    const body: UserReq01ReqBody = await req.json();
    const result = await processUserReq01(body);
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json(
      { success: false, message: '잘못된 JSON 요청입니다.' },
      { status: 400 }
    );
  }
}
