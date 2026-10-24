/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 개발 명세
 * 화면 ID: USER-REQ-00 (통합 청소 서비스 신청)
 * 백엔드 라우터 경로: SsulDak_Web/User/backend/api_USER_REQ_00/route.ts
 * 엔드포인트 URL: POST /api/user/user_req_00
 *
 * [독립 전용 SQL 쿼리 ID]
 *   - USER-REQ-00-SQL-001 (화면 초기 렌더링용 공통 코드 목록 일괄 조회)
 *   - USER-REQ-00-SQL-002 (당일 기준 마스터 REQ_NO 최댓값 조회 및 락 채번)
 *   - USER-REQ-00-SQL-003 (마스터 요청서 TB_CLEAN_REQ 등록)
 *   - USER-REQ-00-SQL-004 (개별 품목 슬롯 TB_CLEAN_REQ_SLOT 등록 - 1주일 만료)
 *   - USER-REQ-00-SQL-005 (현장 첨부 사진 TB_CLEAN_REQ_PHOTO 등록)
 *
 * [채번 표준 규격]
 *   - 마스터 요청서 ID: 'REQ' + YYYYMMDD + 5자리 순번 (예: REQ2026110100001, 총 16자리)
 *   - 품목 슬롯 ID: {REQ_NO} + '-' + 2자리 순번 (예: REQ2026110100001-01, 총 19자리)
 *
 * [비즈니스 룰 및 제약]
 *   - 정기청소(REGULAR) 선택 시: (종료일 - 시작일) >= 90일(최소 3개월) 엄격 검증
 *   - 확정 데이터 이용료 연산: MAX(ROUND(총용역금액 * 0.033), 33000) (VAT 포함)
 *   - 슬롯별 1주일 미청약 타임아웃 기본 만료시각: NOW() + INTERVAL 7 DAY
 *   - 감사 컬럼: REG_DT(NOW()), REG_ID(USER_NO), MOD_DT(NOW()), MOD_ID(USER_NO)
 * =============================================================================
 */

import { executeQuery, executeTransaction } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

// =============================================================================
// 1. 인터페이스 정의
// =============================================================================

export type ActionType = 'GET_INIT_DATA' | 'CREATE_REQUEST';

export interface RegularSubItem {
  areaCd: string;
  areaNm: string;
  propAmt: number;
}

export interface ApplianceSubItem {
  applianceCd: string;
  applianceNm: string;
  propAmt: number;
}

export interface MoveinCleanData {
  spaceTypeCd: string;
  spaceTypeNm?: string;
  pyeongCount: number;
  propAmt: number;
}

export interface RegularCleanData {
  startDt: string;
  endDt: string;
  visitCycleCd: string;
  subItems: RegularSubItem[];
}

export interface ApplianceCleanData {
  subItems: ApplianceSubItem[];
}

export interface UserReq00ReqBody {
  actionType: ActionType;
  userNo?: string;
  addrRoad?: string;
  addrDetail?: string;
  hasElevator?: 'Y' | 'N';
  parkingTypeCd?: 'FREE' | 'PAID' | 'IMPOSSIBLE';
  cleanServiceTypes?: ('REGULAR' | 'APPLIANCE' | 'MOVEIN')[];
  regularClean?: RegularCleanData | null;
  applianceClean?: ApplianceCleanData | null;
  moveinClean?: MoveinCleanData | null;
  photoUrls?: string[];
}

export interface CommonCodeItem {
  grpCd: string;
  comCd: string;
  comNm: string;
  attrVal1: string | null;
  sortOrd: number;
}

export interface UserReq00InitDataResponse {
  success: boolean;
  message?: string;
  commonCodes?: {
    regularCleanAreas: CommonCodeItem[];
    applianceTypes: CommonCodeItem[];
    moveinSpaceTypes: CommonCodeItem[];
    visitCycles: CommonCodeItem[];
    parkingTypes: CommonCodeItem[];
  };
}

export interface UserReq00CreateResponse {
  success: boolean;
  code?: string;
  message: string;
  reqNo?: string;
  totalProposedAmt?: number;
  estDataFeeAmt?: number;
}

// =============================================================================
// 2. 비즈니스 엔진 처리 함수 (processUserReq00)
// =============================================================================

export async function processUserReq00(
  body: UserReq00ReqBody,
  authHeader?: string | null
): Promise<{ status: number; body: UserReq00InitDataResponse | UserReq00CreateResponse }> {
  try {
    const { actionType } = body;

    // -------------------------------------------------------------------------
    // [모드 1] 화면 초기 렌더링용 공통 코드 일괄 조회 (GET_INIT_DATA)
    // -------------------------------------------------------------------------
    if (actionType === 'GET_INIT_DATA') {
      // USER-REQ-00-SQL-001 (공통 코드 목록 조회)
      const sql001 = `
        SELECT GRP_CD, COM_CD, COM_NM, ATTR_VAL_1, SORT_ORD
        FROM TB_COM_CODE
        WHERE GRP_CD IN ('REGULAR_CLEAN_AREA', 'APPLIANCE_CLEAN_TYPE', 'MOVEIN_SPACE_TYPE', 'VISIT_CYCLE', 'PARKING_TYPE')
          AND USE_YN = 'Y'
        ORDER BY GRP_CD ASC, SORT_ORD ASC
      `;

      const rows = await executeQuery<RowDataPacket[]>(sql001);

      const regularCleanAreas: CommonCodeItem[] = [];
      const applianceTypes: CommonCodeItem[] = [];
      const moveinSpaceTypes: CommonCodeItem[] = [];
      const visitCycles: CommonCodeItem[] = [];
      const parkingTypes: CommonCodeItem[] = [];

      for (const r of rows) {
        const item: CommonCodeItem = {
          grpCd: r.GRP_CD,
          comCd: r.COM_CD,
          comNm: r.COM_NM,
          attrVal1: r.ATTR_VAL_1,
          sortOrd: Number(r.SORT_ORD || 0),
        };

        if (r.GRP_CD === 'REGULAR_CLEAN_AREA') regularCleanAreas.push(item);
        else if (r.GRP_CD === 'APPLIANCE_CLEAN_TYPE') applianceTypes.push(item);
        else if (r.GRP_CD === 'MOVEIN_SPACE_TYPE') moveinSpaceTypes.push(item);
        else if (r.GRP_CD === 'VISIT_CYCLE') visitCycles.push(item);
        else if (r.GRP_CD === 'PARKING_TYPE') parkingTypes.push(item);
      }

      return {
        status: 200,
        body: {
          success: true,
          commonCodes: {
            regularCleanAreas,
            applianceTypes,
            moveinSpaceTypes,
            visitCycles,
            parkingTypes,
          },
        },
      };
    }

    // -------------------------------------------------------------------------
    // [모드 2] 견적 요청서 일괄 등록 (CREATE_REQUEST)
    // -------------------------------------------------------------------------
    if (actionType === 'CREATE_REQUEST') {
      const {
        userNo = 'U20261000001',
        addrRoad,
        addrDetail = '',
        hasElevator = 'Y',
        parkingTypeCd = 'FREE',
        cleanServiceTypes = [],
        regularClean,
        applianceClean,
        moveinClean,
        photoUrls = [],
      } = body;

      // 1. 필수 유효성 검사
      if (!addrRoad || !addrRoad.trim()) {
        return {
          status: 400,
          body: {
            success: false,
            code: 'MISSING_ADDR',
            message: '청소지 도로명 주소를 입력해 주세요.',
          },
        };
      }

      if (!cleanServiceTypes || cleanServiceTypes.length === 0) {
        return {
          status: 400,
          body: {
            success: false,
            code: 'MISSING_SERVICE_TYPE',
            message: '최소 1개 이상의 청소 대분류 서비스를 선택해 주세요.',
          },
        };
      }

      // 슬롯 리스트 조립 및 정기청소 3개월(90일) 엄격 검증
      interface SlotItemToInsert {
        serviceTypeCd: 'REGULAR' | 'APPLIANCE' | 'MOVEIN';
        subItemCd: string;
        subItemNm: string;
        propAmt: number;
      }
      const slotsToInsert: SlotItemToInsert[] = [];

      let hasRegular = false;
      let hasAppliance = false;
      let hasMovein = false;

      // 1) 정기청소 검증
      if (cleanServiceTypes.includes('REGULAR')) {
        hasRegular = true;
        if (!regularClean || !regularClean.startDt || !regularClean.endDt) {
          return {
            status: 400,
            body: {
              success: false,
              code: 'MISSING_REGULAR_PERIOD',
              message: '정기청소 시작일과 종료일을 지정해 주세요.',
            },
          };
        }

        const start = new Date(regularClean.startDt);
        const end = new Date(regularClean.endDt);
        const diffMs = end.getTime() - start.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays < 90) {
          return {
            status: 400,
            body: {
              success: false,
              code: 'INVALID_PERIOD',
              message: '정기청소는 최소 3개월(90일) 이상 선택하셔야 합니다.',
            },
          };
        }

        if (!regularClean.subItems || regularClean.subItems.length === 0) {
          return {
            status: 400,
            body: {
              success: false,
              code: 'MISSING_REGULAR_ITEMS',
              message: '정기청소 구역을 최소 1개 이상 추가해 주세요.',
            },
          };
        }

        for (const item of regularClean.subItems) {
          if (!item.propAmt || item.propAmt <= 0) {
            return {
              status: 400,
              body: {
                success: false,
                code: 'INVALID_ITEM_AMT',
                message: `정기청소 '${item.areaNm}'의 용역 제안 금액을 0원 이상 입력해 주세요.`,
              },
            };
          }
          slotsToInsert.push({
            serviceTypeCd: 'REGULAR',
            subItemCd: item.areaCd,
            subItemNm: item.areaNm,
            propAmt: Math.round(item.propAmt),
          });
        }
      }

      // 2) 가전케어 검증
      if (cleanServiceTypes.includes('APPLIANCE')) {
        hasAppliance = true;
        if (!applianceClean || !applianceClean.subItems || applianceClean.subItems.length === 0) {
          return {
            status: 400,
            body: {
              success: false,
              code: 'MISSING_APPLIANCE_ITEMS',
              message: '가전케어 품목을 최소 1개 이상 추가해 주세요.',
            },
          };
        }

        for (const item of applianceClean.subItems) {
          if (!item.propAmt || item.propAmt <= 0) {
            return {
              status: 400,
              body: {
                success: false,
                code: 'INVALID_ITEM_AMT',
                message: `가전케어 '${item.applianceNm}'의 용역 제안 금액을 0원 이상 입력해 주세요.`,
              },
            };
          }
          slotsToInsert.push({
            serviceTypeCd: 'APPLIANCE',
            subItemCd: item.applianceCd,
            subItemNm: item.applianceNm,
            propAmt: Math.round(item.propAmt),
          });
        }
      }

      // 3) 입주/이사청소 검증
      if (cleanServiceTypes.includes('MOVEIN')) {
        hasMovein = true;
        if (!moveinClean || !moveinClean.spaceTypeCd || !moveinClean.propAmt || moveinClean.propAmt <= 0) {
          return {
            status: 400,
            body: {
              success: false,
              code: 'MISSING_MOVEIN_ITEMS',
              message: '입주/이사청소 공간타입 및 제안 금액을 올바르게 입력해 주세요.',
            },
          };
        }
        slotsToInsert.push({
          serviceTypeCd: 'MOVEIN',
          subItemCd: moveinClean.spaceTypeCd,
          subItemNm: moveinClean.spaceTypeNm || '입주/이사 청소',
          propAmt: Math.round(moveinClean.propAmt),
        });
      }

      if (slotsToInsert.length === 0) {
        return {
          status: 400,
          body: {
            success: false,
            code: 'EMPTY_SLOTS',
            message: '최소 1개 이상의 청소 품목이 등록되어야 합니다.',
          },
        };
      }

      // 금액 연산
      const totalProposedAmt = slotsToInsert.reduce((sum, s) => sum + s.propAmt, 0);
      const calcFee = Math.round(totalProposedAmt * 0.033);
      const estDataFeeAmt = Math.max(calcFee, 33000); // 최소 하한선 33,000원

      // 채번 및 트랜잭션 수행
      const newReqNo = await executeTransaction(async (conn) => {
        // 날짜 생성 (YYYYMMDD)
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const datePrefix = `REQ${y}${m}${d}`;

        // USER-REQ-00-SQL-002 (당일 기준 마스터 REQ_NO 최댓값 조회 및 락 채번)
        const sql002 = `
          SELECT MAX(REQ_NO) AS MAX_REQ_NO
          FROM TB_CLEAN_REQ
          WHERE REQ_NO LIKE CONCAT(?, '%')
          FOR UPDATE
        `;
        const [maxRows] = await conn.execute<RowDataPacket[]>(sql002, [datePrefix]);
        const maxReqNo = maxRows[0]?.MAX_REQ_NO as string | null;

        let nextSeq = 1;
        if (maxReqNo && maxReqNo.startsWith(datePrefix)) {
          const seqStr = maxReqNo.substring(datePrefix.length);
          const parsed = parseInt(seqStr, 10);
          if (!isNaN(parsed)) {
            nextSeq = parsed + 1;
          }
        }
        const reqNo = `${datePrefix}${String(nextSeq).padStart(5, '0')}`;

        // USER-REQ-00-SQL-003 (마스터 요청서 TB_CLEAN_REQ 등록)
        const sql003 = `
          INSERT INTO TB_CLEAN_REQ (
            REQ_NO, USER_NO, REQ_STAT_CD, ZIP_CD, ADDR_ROAD, ADDR_DETAIL,
            BASE_ADDR, DETAIL_ADDR,
            HAS_ELEVATOR_YN, PARKING_TYPE_CD, HAS_REGULAR_YN, HAS_APPLIANCE_YN, HAS_MOVEIN_YN,
            REGULAR_START_DT, REGULAR_END_DT, REGULAR_VISIT_CYCLE_CD,
            TOTAL_PROPOSED_AMT, CALC_FEE_AMT, EST_DATA_FEE_AMT,
            REQ_EXPIRE_DT, REG_DT, REG_ID, MOD_DT, MOD_ID
          ) VALUES (
            ?, ?, 'OPEN', ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            DATE_ADD(NOW(), INTERVAL 7 DAY), NOW(), ?, NOW(), ?
          )
        `;

        await conn.execute(sql003, [
          reqNo,
          userNo,
          '03920', // ZIP_CD
          addrRoad.trim(),
          addrDetail.trim(),
          addrRoad.trim(), // BASE_ADDR 호환
          addrDetail.trim(), // DETAIL_ADDR 호환
          hasElevator === 'Y' ? 'Y' : 'N',
          parkingTypeCd,
          hasRegular ? 'Y' : 'N',
          hasAppliance ? 'Y' : 'N',
          hasMovein ? 'Y' : 'N',
          hasRegular && regularClean ? regularClean.startDt : null,
          hasRegular && regularClean ? regularClean.endDt : null,
          hasRegular && regularClean ? regularClean.visitCycleCd : null,
          totalProposedAmt,
          estDataFeeAmt, // CALC_FEE_AMT
          estDataFeeAmt, // EST_DATA_FEE_AMT
          userNo,
          userNo,
        ]);

        // USER-REQ-00-SQL-004 (개별 품목 슬롯 TB_CLEAN_REQ_SLOT 등록 - 1주일 만료)
        const sql004 = `
          INSERT INTO TB_CLEAN_REQ_SLOT (
            SLOT_NO, REQ_NO, SLOT_SEQ, SERVICE_TYPE_CD, SUB_ITEM_CD, SUB_ITEM_NM,
            SLOT_STAT_CD, PROPOSED_UNIT_AMT, EXPIRE_DT, REG_DT, REG_ID, MOD_DT, MOD_ID
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            'WAITING', ?, DATE_ADD(NOW(), INTERVAL 7 DAY), NOW(), ?, NOW(), ?
          )
        `;

        let seq = 1;
        for (const slot of slotsToInsert) {
          const slotNo = `${reqNo}-${String(seq).padStart(2, '0')}`;
          await conn.execute(sql004, [
            slotNo,
            reqNo,
            seq,
            slot.serviceTypeCd,
            slot.subItemCd,
            slot.subItemNm,
            slot.propAmt,
            userNo,
            userNo,
          ]);
          seq++;
        }

        // USER-REQ-00-SQL-005 (현장 첨부 사진 TB_CLEAN_REQ_PHOTO 등록)
        if (photoUrls && photoUrls.length > 0) {
          const sql005 = `
            INSERT INTO TB_CLEAN_REQ_PHOTO (
              REQ_NO, PHOTO_URL, SORT_ORD, REG_DT, REG_ID
            ) VALUES (
              ?, ?, ?, NOW(), ?
            )
          `;
          let sortOrd = 1;
          for (const url of photoUrls) {
            if (url && url.trim()) {
              await conn.execute(sql005, [reqNo, url.trim(), sortOrd, userNo]);
              sortOrd++;
            }
          }
        }

        return reqNo;
      });

      return {
        status: 201,
        body: {
          success: true,
          reqNo: newReqNo,
          totalProposedAmt,
          estDataFeeAmt,
          message: '견적 신청이 성공적으로 등록되었습니다.',
        },
      };
    }

    return {
      status: 400,
      body: {
        success: false,
        message: `알 수 없는 actionType 입니다: ${actionType}`,
      },
    };
  } catch (error: any) {
    console.error('USER-REQ-00 Backend Error:', error);
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
    const authHeader = req.headers.get('authorization');
    const body: UserReq00ReqBody = await req.json();
    const result = await processUserReq00(body, authHeader);
    return Response.json(result.body, { status: result.status });
  } catch (err: any) {
    return Response.json(
      { success: false, message: '잘못된 JSON 요청입니다.' },
      { status: 400 }
    );
  }
}
