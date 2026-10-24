/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 개발 명세
 * 화면 ID: USER-REQ-02 (계절가전 중분류 추가 모달)
 * 백엔드 라우터 경로: SsulDak_Web/User/backend/api_USER_REQ_02/route.ts
 * 엔드포인트 URL: POST /api/user/user_req_02
 *
 * [독립 전용 SQL 쿼리 ID]
 *   - USER-REQ-02-SQL-001 (가전케어 품목 및 기준 하한선 단가 목록 조회)
 *   - USER-REQ-02-SQL-002 (특정 기종의 최소 하한선 단가 단건 조회)
 *
 * [비즈니스 룰 및 단가 검증]
 *   - 가전 케어는 기종별 분해 난이도에 따른 최소 단가 하한선(ATTR_VAL_1)이 존재함.
 *     (벽걸이 에어컨 80,000원, 스탠드 130,000원, 4Way 시스템 150,000원, 드럼세탁기 120,000원 등)
 *   - 입력된 희망 단가가 기종별 최소 하한선 미만일 경우 경고 뱃지 출력 및 실시간 피드백.
 *   - 총 용역 금액 = (대당 희망 단가) * (선택 수량).
 * =============================================================================
 */

import { executeQuery } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

// =============================================================================
// 1. 인터페이스 정의
// =============================================================================

export type Req02Mode = 'GET_APPLIANCE_CODES' | 'VALIDATE_PRICE';

export interface UserReq02ReqBody {
  mode: Req02Mode;
  applianceCd?: string;
  unitPrice?: number;
  quantity?: number;
}

export interface ApplianceItemCode {
  applianceCd: string;
  applianceNm: string;
  minGuidePrice: number;
  categoryTab: string;
  sortOrd: number;
}

export interface UserReq02Response {
  success: boolean;
  message?: string;
  items?: ApplianceItemCode[];
  isValid?: boolean;
  minGuidePrice?: number;
  unitPrice?: number;
  quantity?: number;
  totalAmt?: number;
  warningMsg?: string | null;
}

// =============================================================================
// 2. 비즈니스 엔진 처리 함수 (processUserReq02)
// =============================================================================

export async function processUserReq02(
  body: UserReq02ReqBody
): Promise<{ status: number; body: UserReq02Response }> {
  try {
    const { mode } = body;

    if (!mode) {
      return {
        status: 400,
        body: { success: false, message: 'mode 매개변수가 누락되었습니다.' },
      };
    }

    // -------------------------------------------------------------------------
    // [모드 1] 가전 코드 목록 조회 (GET_APPLIANCE_CODES)
    // -------------------------------------------------------------------------
    if (mode === 'GET_APPLIANCE_CODES') {
      // USER-REQ-02-SQL-001 (가전케어 품목 및 기준 하한선 단가 목록 조회)
      const sql001 = `
        SELECT 
          COM_CD AS applianceCd,
          COM_NM AS applianceNm,
          CAST(ATTR_VAL_1 AS UNSIGNED) AS minGuidePrice,
          ATTR_VAL_2 AS categoryTab,
          SORT_ORD AS sortOrd
        FROM TB_COM_CODE
        WHERE GRP_CD = 'APPLIANCE_CLEAN_TYPE' AND USE_YN = 'Y'
        ORDER BY SORT_ORD ASC
      `;

      const rows = await executeQuery<RowDataPacket[]>(sql001);

      const items: ApplianceItemCode[] = rows.map((r) => ({
        applianceCd: r.applianceCd,
        applianceNm: r.applianceNm,
        minGuidePrice: Number(r.minGuidePrice || 80000),
        categoryTab: r.categoryTab || 'AIR_CON',
        sortOrd: Number(r.sortOrd || 0),
      }));

      return {
        status: 200,
        body: {
          success: true,
          items,
        },
      };
    }

    // -------------------------------------------------------------------------
    // [모드 2] 단가 및 수량 유효성 검증 (VALIDATE_PRICE)
    // -------------------------------------------------------------------------
    if (mode === 'VALIDATE_PRICE') {
      const { applianceCd = 'AC_STAND', unitPrice = 80000, quantity = 1 } = body;

      // USER-REQ-02-SQL-002 (특정 기종의 최소 하한선 단가 단건 조회)
      const sql002 = `
        SELECT 
          COM_CD AS applianceCd,
          COM_NM AS applianceNm,
          CAST(ATTR_VAL_1 AS UNSIGNED) AS minGuidePrice
        FROM TB_COM_CODE
        WHERE GRP_CD = 'APPLIANCE_CLEAN_TYPE' AND COM_CD = ? AND USE_YN = 'Y'
        LIMIT 1
      `;

      const rows = await executeQuery<RowDataPacket[]>(sql002, [applianceCd]);

      let minGuidePrice = 80000;
      let applianceNm = '가전 케어';

      if (rows && rows.length > 0) {
        minGuidePrice = Number(rows[0].minGuidePrice || 80000);
        applianceNm = rows[0].applianceNm || applianceNm;
      }

      const qty = Math.max(1, Math.min(10, Number(quantity) || 1));
      const price = Math.max(0, Number(unitPrice) || minGuidePrice);
      const totalAmt = price * qty;
      const isValid = price >= minGuidePrice;
      const warningMsg = !isValid
        ? `${applianceNm}의 1대당 최소 권장 하한선(${minGuidePrice.toLocaleString()}원)보다 낮아 입찰 참여율이 저조할 수 있습니다.`
        : null;

      return {
        status: 200,
        body: {
          success: true,
          isValid,
          minGuidePrice,
          unitPrice: price,
          quantity: qty,
          totalAmt,
          warningMsg,
        },
      };
    }

    return {
      status: 400,
      body: { success: false, message: `지원하지 않는 모드입니다: ${mode}` },
    };
  } catch (error: any) {
    console.error('USER-REQ-02 Backend Error:', error);
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
    const body: UserReq02ReqBody = await req.json();
    const result = await processUserReq02(body);
    return Response.json(result.body, { status: result.status });
  } catch {
    return Response.json(
      { success: false, message: '잘못된 JSON 요청입니다.' },
      { status: 400 }
    );
  }
}
