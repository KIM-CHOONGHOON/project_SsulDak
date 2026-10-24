/**
 * SsulDak (쓸고닦고) - PTNR-QOT-02 (조건 수락 및 청약서 제출) 백엔드 라우터
 * 
 * 물리적 격리: SsulDak_Web/Partner/backend/api_PTNR_QOT_02/route.ts
 * 엔드포인트 URL: POST /api/partner/ptnr_qot_02
 * DB 연동: @/lib/db (MySQL 8.0, InnoDB)
 * 독립 전용 SQL: PTNR-QOT-02-SQL-001 ~ PTNR-QOT-02-SQL-005
 */

import { executeQuery, executeTransaction } from '@/lib/db';

export interface FixedTermsData {
  slotNo: string;
  reqNo: string;
  subItemNm: string;
  buildingTitle: string;
  addrRoad: string;
  floorCnt: number;
  scopeText: string;
  reqMemo: string;
  fixedAmt: number;
  monthlyAmt: number;
  contractDays: number;
  formattedStartDt: string;
  firstVisitText: string;
  workCycleText: string;
  slotStatCd: string;
  expireDt: string;
  currentBidCount: number;
  maxBidCount: number;
}

export interface PartnerDefaultsData {
  ptnrNo: string;
  companyNm: string;
  ratingBadge: string;
  defaultWorkerCnt: number;
  defaultHours: number;
  equipTags: string[];
  equipDesc: string;
  defaultAppealMsg: string;
  alreadyBid: boolean;
}

export interface FeeSummaryData {
  calcFormula: string;
  dataFeeAmt: number;
  discountAmt: number;
  finalPayAmt: number;
  couponName: string;
  hasFreeCoupon: boolean;
  expectedNetRevenue: number;
}

export interface GetFixedTermsResponse {
  success: boolean;
  fixedTerms?: FixedTermsData;
  partnerDefaults?: PartnerDefaultsData;
  feeSummary?: FeeSummaryData;
  code?: string;
  message?: string;
}

export interface SubmitBidResponse {
  success: boolean;
  bidNo?: string;
  message?: string;
  code?: string;
}

/**
 * PTNR-QOT-02 코어 비즈니스 처리 엔진
 */
export async function processPtnrQot02(
  body: any,
  clientIp: string = '127.0.0.1',
  userAgent: string = ''
): Promise<{ status: number; data: any }> {
  const mode = body?.mode || 'GET_FIXED_TERMS';
  const ptnrNo = (body?.ptnrNo || 'P20261000001').trim();
  const rawSlotNo = (body?.slotNo || '').trim();

  // slotNo 기본값 보정
  const slotNo = rawSlotNo || 'SLOT202610230001';

  // =========================================================================
  // 모드 1: 조건 정보 로딩 (GET_FIXED_TERMS)
  // =========================================================================
  if (mode === 'GET_FIXED_TERMS') {
    try {
      // 1) PTNR-QOT-02-SQL-001 (공고 슬롯의 고정 대금 및 일정 조회)
      const sql1 = `
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
      `;

      let slotRows = (await executeQuery(sql1, [slotNo])) as any[];

      // 슬롯 미존재 시 대기 중인 최신 슬롯으로 폴백 조회
      if (!slotRows || slotRows.length === 0) {
        const fallbackSql = `
          /* PTNR-QOT-02-SQL-001-FALLBACK */
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
          WHERE s.SLOT_STAT_CD IN ('WAITING', 'QUOTED')
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
            code: 'SLOT_NOT_FOUND',
            message: '요청하신 공고 슬롯 정보를 찾을 수 없습니다.'
          }
        };
      }

      const row = slotRows[0];
      const actualSlotNo = row.slotNo;

      // 마감 시간 경과 검증
      if (row.expireDt && new Date(row.expireDt) < new Date()) {
        return {
          status: 400,
          data: {
            success: false,
            code: 'TENDER_EXPIRED',
            message: '이미 응모가 마감된 공고입니다.'
          }
        };
      }

      // 2) PTNR-QOT-02-SQL-002 (파트너 기본 장비 태그 및 중복 청약 여부 확인)
      const sql2 = `
        /* PTNR-QOT-02-SQL-002 */
        SELECT 
          p.COMPANY_NM AS companyNm,
          p.EQUIP_TAGS AS equipTags,
          COALESCE(p.SHORT_INTRO, '') AS shortIntro,
          (SELECT COUNT(*) FROM TB_CLEAN_BID b WHERE b.SLOT_NO = ? AND b.PTNR_NO = p.PTNR_NO) AS alreadyBidCnt,
          (SELECT COUNT(DISTINCT b2.PTNR_NO) FROM TB_CLEAN_BID b2 WHERE b2.SLOT_NO = ?) AS currentBidCount
        FROM TB_PARTNER p
        WHERE p.PTNR_NO = ?;
      `;

      const partnerRows = (await executeQuery(sql2, [actualSlotNo, actualSlotNo, ptnrNo])) as any[];
      const pRow = partnerRows && partnerRows.length > 0 ? partnerRows[0] : null;

      const alreadyBid = Number(pRow?.alreadyBidCnt || 0) > 0;
      const currentBidCount = Number(pRow?.currentBidCount || 2);

      // 3) 파트너 활성 무료 쿠폰 조회 (수수료 0원 혜택 프리뷰)
      const sqlCoupon = `
        /* PTNR-QOT-02-SQL-COUPON */
        SELECT P_COUPON_NO AS couponNo, CAMPAIGN_NM AS campaignNm
        FROM TB_PARTNER_COUPON
        WHERE PTNR_NO = ?
          AND COUPON_STAT_CD = 'AVAILABLE'
          AND (EXPIRE_DT IS NULL OR EXPIRE_DT >= NOW())
        LIMIT 1;
      `;
      const couponRows = (await executeQuery(sqlCoupon, [ptnrNo])) as any[];
      const hasFreeCoupon = couponRows && couponRows.length > 0;
      const couponName = hasFreeCoupon ? couponRows[0].campaignNm : '웰컴 프로모션 패스';

      // 수수료 연산: max(ROUND(fixedAmt * 0.033), 33000)
      const fixedAmt = Number(row.fixedAmt || 240000);
      const calcFee = Math.round(fixedAmt * 0.033);
      const dataFeeAmt = Math.max(calcFee, 33000);
      const discountAmt = hasFreeCoupon ? dataFeeAmt : 0;
      const finalPayAmt = Math.max(0, dataFeeAmt - discountAmt);

      // 등록 장비 파싱
      let equipTags: string[] = [];
      if (pRow?.equipTags) {
        if (Array.isArray(pRow.equipTags)) {
          equipTags = pRow.equipTags;
        } else if (typeof pRow.equipTags === 'string') {
          try {
            equipTags = JSON.parse(pRow.equipTags);
          } catch {
            equipTags = pRow.equipTags.split(',').map((t: string) => t.trim());
          }
        }
      }
      if (equipTags.length === 0) {
        equipTags = [
          '독일산 크란즐 고압스팀기 (150bar)',
          '산업용 헤파필터 집진기',
          '친환경 에코라벨 중성 인증 세제',
          '피톤치드 연무 소독기'
        ];
      }

      const defaultAppealMsg = '1층 현관 도어락 소독과 분리수거장 주변 고압 세척까지 성실히 작업하겠습니다. 매회차 시공 전/후 고화질 비교 사진을 즉시 전송해드리며, 친환경 인증 약품만 사용하여 건물 입주민 건강을 최우선으로 관리하겠습니다.';

      const fixedTerms: FixedTermsData = {
        slotNo: actualSlotNo,
        reqNo: row.reqNo,
        subItemNm: row.subItemNm || '정기청소 3개월 (계단+외곽)',
        buildingTitle: row.addrRoad ? `${row.addrRoad} 4층 상가주택` : '일산동구 중앙로 빌라 4층 상가주택',
        addrRoad: row.addrRoad || '경기 고양시 일산동구 중앙로',
        floorCnt: Number(row.floorCnt || 4),
        scopeText: '1~4층 계단실 및 복도 순회 케어, 창틀 먼지 흡입, 1층 필로티 주차장 분리수거장 2개 구역 정리 및 물청소',
        reqMemo: row.reqMemo || '1층 상가 음식점 냄새 차단을 위해 친환경 탈취 세정을 꼭 적용해주시고, 시공 전/후 사진을 매회차 2장 이상 앱에 등록해주세요.',
        fixedAmt,
        monthlyAmt: Math.round(fixedAmt / 3),
        contractDays: Number(row.contractDays || 92),
        formattedStartDt: row.formattedStartDt || '2026-11-01 09:00',
        firstVisitText: '2026년 11월 01일(일) 첫 방문',
        workCycleText: '매주 수요일 오전 10:00 이전 (총 12회차 케어)',
        slotStatCd: row.slotStatCd,
        expireDt: row.expireDt,
        currentBidCount,
        maxBidCount: 3
      };

      const partnerDefaults: PartnerDefaultsData = {
        ptnrNo,
        companyNm: pRow?.companyNm || '반짝빌라클린',
        ratingBadge: '마스터 A+ 등급',
        defaultWorkerCnt: 2,
        defaultHours: 2.0,
        equipTags,
        equipDesc: equipTags.slice(0, 3).join(', '),
        defaultAppealMsg,
        alreadyBid
      };

      const feeSummary: FeeSummaryData = {
        calcFormula: 'max(대금×3.3%, 33,000원)',
        dataFeeAmt,
        discountAmt,
        finalPayAmt,
        couponName,
        hasFreeCoupon,
        expectedNetRevenue: fixedAmt
      };

      return {
        status: 200,
        data: {
          success: true,
          fixedTerms,
          partnerDefaults,
          feeSummary
        }
      };
    } catch (error: any) {
      console.error('[PTNR-QOT-02 GET_FIXED_TERMS Error]:', error);
      return {
        status: 500,
        data: {
          success: false,
          code: 'INTERNAL_SERVER_ERROR',
          message: '공고 조건 및 파트너 정보를 조회하는 중 서버 오류가 발생했습니다.'
        }
      };
    }
  }

  // =========================================================================
  // 모드 2: 청약서 최종 제출 (SUBMIT_BID)
  // =========================================================================
  if (mode === 'SUBMIT_BID') {
    const termsAgreed = body?.termsAgreed === true;
    const workerCnt = Number(body?.workerCnt || 2);
    const estDurationHours = Number(body?.estDurationHours || 2.0);
    const appealMsg = (body?.appealMsg || '').trim();
    const equipDesc = (body?.equipDesc || '고압스팀기, 산업용 집진기, 에코라벨 세제').trim();

    // 입력 유효성 검증
    if (!termsAgreed) {
      return {
        status: 400,
        data: {
          success: false,
          code: 'TERMS_NOT_AGREED',
          message: '고객 조건 수락 및 취소 패널티 약관에 동의해야 합니다.'
        }
      };
    }

    if (!Number.isInteger(workerCnt) || workerCnt < 1 || workerCnt > 10) {
      return {
        status: 400,
        data: {
          success: false,
          code: 'INVALID_WORKER_CNT',
          message: '투입 인원 수는 1인 이상 10인 이하의 정수여야 합니다.'
        }
      };
    }

    if (isNaN(estDurationHours) || estDurationHours < 0.5 || estDurationHours > 24.0) {
      return {
        status: 400,
        data: {
          success: false,
          code: 'INVALID_DURATION',
          message: '예상 작업 소요 시간은 0.5시간 이상 24시간 이하여야 합니다.'
        }
      };
    }

    if (appealMsg.length < 10) {
      return {
        status: 400,
        data: {
          success: false,
          code: 'MSG_TOO_SHORT',
          message: '작업 계획 및 고객 어필 메시지는 최소 10자 이상 작성해 주세요.'
        }
      };
    }

    try {
      // 트랜잭션 실행
      const txResult = await executeTransaction(async (conn) => {
        // ① PTNR-QOT-02-SQL-001: 슬롯 정보 및 PROPOSED_UNIT_AMT 강제 재조회 (클라이언트 변조 원천 차단)
        const sqlSlotCheck = `
          /* PTNR-QOT-02-SQL-001 (TX LOCK) */
          SELECT 
            s.SLOT_NO AS slotNo,
            s.REQ_NO AS reqNo,
            s.PROPOSED_UNIT_AMT AS fixedAmt,
            s.SLOT_STAT_CD AS slotStatCd,
            s.EXPIRE_DT AS expireDt
          FROM TB_CLEAN_REQ_SLOT s
          WHERE s.SLOT_NO = ?
          FOR UPDATE;
        `;
        const [slotRows] = (await conn.execute(sqlSlotCheck, [slotNo])) as any[];

        if (!slotRows || slotRows.length === 0) {
          throw { status: 404, code: 'SLOT_NOT_FOUND', message: '공고 슬롯 정보를 찾을 수 없습니다.' };
        }

        const slot = slotRows[0];
        if (slot.expireDt && new Date(slot.expireDt) < new Date()) {
          throw { status: 400, code: 'TENDER_EXPIRED', message: '이미 응모가 마감된 공고입니다.' };
        }

        const fixedAmt = Number(slot.fixedAmt || 240000);

        // ② PTNR-QOT-02-SQL-002: 중복 제출 여부 검증
        const sqlDupCheck = `
          /* PTNR-QOT-02-SQL-002 (TX DUP CHECK) */
          SELECT COUNT(*) AS bidCount
          FROM TB_CLEAN_BID
          WHERE SLOT_NO = ? AND PTNR_NO = ?
          FOR UPDATE;
        `;
        const [dupRows] = (await conn.execute(sqlDupCheck, [slotNo, ptnrNo])) as any[];
        if (dupRows && dupRows.length > 0 && Number(dupRows[0].bidCount) > 0) {
          throw { status: 409, code: 'ALREADY_BID', message: '이미 청약서를 제출한 공고입니다.' };
        }

        // ③ PTNR-QOT-02-SQL-003: 당일 기준 신규 BID_NO 채번 락 조회
        const sqlMaxBid = `
          /* PTNR-QOT-02-SQL-003 */
          SELECT MAX(BID_NO) AS maxBidNo
          FROM TB_CLEAN_BID
          WHERE BID_NO LIKE CONCAT('BID', DATE_FORMAT(NOW(), '%Y%m%d'), '%')
          FOR UPDATE;
        `;
        const [maxRows] = (await conn.execute(sqlMaxBid)) as any[];

        const todayPrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        let nextSeq = 1;

        if (maxRows && maxRows.length > 0 && maxRows[0].maxBidNo) {
          const lastBidNo = String(maxRows[0].maxBidNo);
          // e.g. BID2026102300002 -> sequence is last 5 digits
          const seqPart = lastBidNo.slice(-5);
          const parsed = parseInt(seqPart, 10);
          if (!isNaN(parsed)) {
            nextSeq = parsed + 1;
          }
        }

        const newBidNo = `BID${todayPrefix}${String(nextSeq).padStart(5, '0')}`;

        // ④ PTNR-QOT-02-SQL-004: 청약서 원장 등록 (TB_CLEAN_BID INSERT)
        const sqlInsertBid = `
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
        `;
        await conn.execute(sqlInsertBid, [
          newBidNo,
          slotNo,
          ptnrNo,
          fixedAmt,
          workerCnt,
          estDurationHours,
          appealMsg,
          equipDesc,
          ptnrNo
        ]);

        // ⑤ PTNR-QOT-02-SQL-005: 슬롯 상태 QUOTED 전이 (TB_CLEAN_REQ_SLOT UPDATE)
        const sqlUpdateSlot = `
          /* PTNR-QOT-02-SQL-005 */
          UPDATE TB_CLEAN_REQ_SLOT
          SET 
            SLOT_STAT_CD = 'QUOTED',
            MOD_DT = NOW(),
            MOD_ID = ?
          WHERE SLOT_NO = ? AND SLOT_STAT_CD = 'WAITING';
        `;
        await conn.execute(sqlUpdateSlot, [ptnrNo, slotNo]);

        return {
          bidNo: newBidNo,
          fixedAmt
        };
      });

      return {
        status: 201,
        data: {
          success: true,
          bidNo: txResult.bidNo,
          message: '청약서가 성공적으로 제출되었습니다. 고객이 검토 후 계약을 진행하게 됩니다.'
        }
      };
    } catch (error: any) {
      console.error('[PTNR-QOT-02 SUBMIT_BID Error]:', error);
      const status = error?.status || 500;
      return {
        status,
        data: {
          success: false,
          code: error?.code || 'SUBMIT_BID_ERROR',
          message: error?.message || '청약서 제출 중 서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        }
      };
    }
  }

  return {
    status: 400,
    data: {
      success: false,
      code: 'INVALID_MODE',
      message: '지원하지 않는 요청 모드입니다.'
    }
  };
}

/**
 * Next.js App Router POST 핸들러
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Next.js Partner App';

    const result = await processPtnrQot02(body, clientIp, userAgent);
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
