/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 개발 명세
 * 화면 ID: USER-CNT-00 (계약 확정 및 데이터 이용료 결제)
 * 백엔드 라우터 경로: SsulDak_Web/User/backend/api_USER_CNT_00/route.ts
 * 엔드포인트 URL: POST /api/user/user_cnt_00
 *
 * [독립 전용 SQL 쿼리 ID]
 *   - USER-CNT-00-SQL-001 (선택된 슬롯 및 청약 파트너 정보 일괄 조회)
 *   - USER-CNT-00-SQL-002 (이용자 가용 포인트 잔액 및 전자서명 조회)
 *   - USER-CNT-00-SQL-003 (이용자 사용 가능한 할인 쿠폰 목록 조회)
 *   - USER-CNT-00-SQL-004 (신규 계약서 등록: TB_CLEAN_CONTRACT INSERT)
 *   - USER-CNT-00-SQL-005 (데이터 이용료 결제 원장 등록: TB_DATA_FEE_PAY INSERT)
 *   - USER-CNT-00-SQL-006 (쿠폰 사용 처리: TB_USER_COUPON UPDATE)
 *   - USER-CNT-00-SQL-007 (포인트 차감 이력 등록: TB_USER_POINT_LEDGER INSERT)
 *   - USER-CNT-00-SQL-008 (슬롯 계약 체결 전이: TB_CLEAN_REQ_SLOT UPDATE)
 *
 * [과금 및 정산 원칙 (비즈니스 룰 필수)]
 *   - 플랫폼 결제액은 "청소 용역 대금(계약금)"이 아닌 "매칭 데이터 이용료(라이선스)"임.
 *   - 기준 데이터 이용료 = MAX(ROUND(총 용역비 * 0.033), 33000) (VAT 포함).
 *   - 실제 용역비(예: 320,000원)는 시공 완료 후 현장에서 고객이 파트너에게 전액 직접 지불(에스크로 없음).
 *   - 쿠폰 및 포인트 차감 지원 (포인트는 100P 단위 사용 가능).
 *   - 최종 결제금액이 0원일 경우 PG 호출을 생략하고 'FREE_PASS' 결제로 즉시 승인(0원 바이패스 처리).
 *   - 취소 환불 정책 안내 강제: 7일 이내 취소 시 50% 환불, 7일 이후 전액 몰수 + 7일간 서비스 이용 정지.
 * =============================================================================
 */

import { executeQuery, executeTransaction } from '@/lib/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// =============================================================================
// 1. 타입 및 인터페이스 정의
// =============================================================================

export type Cnt00Mode = 'GET_ORDER_SHEET' | 'CONFIRM_PAYMENT';

export interface SelectedSlotParam {
  slotNo: string;
  bidNo: string;
}

export interface UserCnt00ReqBody {
  mode: Cnt00Mode;
  userNo?: string;
  reqNo?: string;
  selectedSlotList?: SelectedSlotParam[];
  couponNo?: string | null;
  usePointAmt?: number;
  baseFeeAmt?: number;
  discountCouponAmt?: number;
  actualPaidAmt?: number;
  pgProviderCd?: string;
  pgTid?: string | null;
  userSignUrl?: string | null;
}

export interface ConfirmedServiceItem {
  slotNo: string;
  subItemNm: string;
  serviceTypeCd: string;
  bidNo: string;
  ptnrNo: string;
  bidAmt: number;
  workerCnt: number;
  estDurationHours: string | number;
  proposalNote?: string;
  companyNm: string;
  ceoNm: string;
  profileImgUrl?: string;
  avgRating: number;
  reviewCnt: number;
}

export interface UserCouponItem {
  couponNo: string;
  campaignNm: string;
  discountAmt: number;
  expireDt: string;
}

export interface UserCnt00Response {
  success: boolean;
  code?: string;
  message?: string;
  reqNo?: string;
  services?: ConfirmedServiceItem[];
  totalServiceAmt?: number;
  baseFeeAmt?: number;
  pointBalance?: number;
  coupons?: UserCouponItem[];
  userSignUrl?: string | null;
  contractNo?: string;
  payNo?: string;
  actualPaidAmt?: number;
  safeTelNo?: string;
}

// =============================================================================
// 2. 비즈니스 로직 처리 함수 (Next.js & Express 공용)
// =============================================================================

export async function processUserCnt00(
  body: UserCnt00ReqBody
): Promise<{ status: number; body: UserCnt00Response }> {
  const {
    mode,
    userNo = 'U20261000001',
    reqNo = 'REQ202610210001',
    selectedSlotList = [
      { slotNo: 'REQ202610210001-01', bidNo: 'BID2026102200001' },
      { slotNo: 'REQ202610210001-02', bidNo: 'BID2026102200002' },
    ],
    couponNo,
    usePointAmt = 0,
    baseFeeAmt: clientBaseFeeAmt,
    discountCouponAmt: clientDiscountCouponAmt = 0,
    actualPaidAmt: clientActualPaidAmt,
    pgProviderCd = 'TOSS',
    pgTid = null,
    userSignUrl = null,
  } = body;

  try {
    // -------------------------------------------------------------------------
    // MODE 1: 주문서 초기 정보 조회 (GET_ORDER_SHEET)
    // -------------------------------------------------------------------------
    if (mode === 'GET_ORDER_SHEET') {
      if (!selectedSlotList || selectedSlotList.length === 0) {
        return {
          status: 400,
          body: { success: false, message: '선택된 슬롯 목록(selectedSlotList)이 비어있습니다.' },
        };
      }

      const slotNos = selectedSlotList.map((s) => s.slotNo);
      const bidNos = selectedSlotList.map((s) => s.bidNo);

      // USER-CNT-00-SQL-001: 선택된 슬롯 및 청약 파트너 정보 조회
      const slotPlaceholders = slotNos.map(() => '?').join(',');
      const bidPlaceholders = bidNos.map(() => '?').join(',');

      const sql001 = `
        SELECT 
          s.SLOT_NO AS slotNo,
          s.SUB_ITEM_NM AS subItemNm,
          s.SERVICE_TYPE_CD AS serviceTypeCd,
          b.BID_NO AS bidNo,
          b.PTNR_NO AS ptnrNo,
          b.BID_AMT AS bidAmt,
          b.WORKER_CNT AS workerCnt,
          b.EST_DURATION_HOURS AS estDurationHours,
          b.PROPOSAL_NOTE AS proposalNote,
          p.COMPANY_NM AS companyNm,
          COALESCE(p.CEO_NM, '대표자') AS ceoNm,
          p.PROFILE_IMG_URL AS profileImgUrl,
          COALESCE(p.AVG_RATING, 5.0) AS avgRating,
          COALESCE(p.REVIEW_CNT, 128) AS reviewCnt
        FROM TB_CLEAN_REQ_SLOT s
        INNER JOIN TB_CLEAN_BID b ON s.SLOT_NO = b.SLOT_NO
        INNER JOIN TB_PARTNER p ON b.PTNR_NO = p.PTNR_NO
        WHERE s.SLOT_NO IN (${slotPlaceholders}) AND b.BID_NO IN (${bidPlaceholders})
        ORDER BY s.SLOT_NO ASC;
      `;

      const serviceRows = await executeQuery<RowDataPacket[]>(sql001, [...slotNos, ...bidNos]);

      const services: ConfirmedServiceItem[] = serviceRows.map((r: any) => ({
        slotNo: r.slotNo,
        subItemNm: r.subItemNm,
        serviceTypeCd: r.serviceTypeCd,
        bidNo: r.bidNo,
        ptnrNo: r.ptnrNo,
        bidAmt: Number(r.bidAmt) || 0,
        workerCnt: Number(r.workerCnt) || 1,
        estDurationHours: r.estDurationHours || '2.0',
        proposalNote: r.proposalNote || '',
        companyNm: r.companyNm,
        ceoNm: r.ceoNm,
        profileImgUrl: r.profileImgUrl || null,
        avgRating: Number(r.avgRating) || 5.0,
        reviewCnt: Number(r.reviewCnt) || 0,
      }));

      // 총 용역금액 합계 계산
      const totalServiceAmt = services.reduce((sum, item) => sum + item.bidAmt, 0);

      // 기준 데이터 이용료 산정: MAX(ROUND(totalServiceAmt * 0.033), 33000) (VAT 포함)
      const calculatedFee = Math.round(totalServiceAmt * 0.033);
      const calculatedBaseFeeAmt = Math.max(calculatedFee, 33000);

      // USER-CNT-00-SQL-002: 이용자 포인트 잔액 및 전자서명 조회
      const sql002 = `
        SELECT 
          (SELECT COALESCE(BALANCE_AMT, 0) FROM TB_USER_POINT_LEDGER WHERE USER_NO = ? ORDER BY POINT_SEQ DESC LIMIT 1) AS pointBalance,
          u.SIGN_IMG_URL AS userSignUrl
        FROM TB_USER u
        WHERE u.USER_NO = ?;
      `;
      const userRows = await executeQuery<RowDataPacket[]>(sql002, [userNo, userNo]);
      const pointBalance = userRows.length > 0 ? Number(userRows[0].pointBalance) || 0 : 0;
      const dbSignUrl = userRows.length > 0 ? userRows[0].userSignUrl : null;

      // USER-CNT-00-SQL-003: 이용자 사용 가능한 할인 쿠폰 목록 조회
      const sql003 = `
        SELECT 
          c.COUPON_ISSUE_NO AS couponNo,
          COALESCE(c.COUPON_NM, '[웰컴 가입] 첫 결제 5,000원 할인 쿠폰') AS campaignNm,
          COALESCE(c.DISCOUNT_AMT, 5000) AS discountAmt,
          DATE_FORMAT(c.EXPIRE_DT, '%Y.%m.%d') AS expireDt
        FROM TB_USER_COUPON c
        WHERE c.USER_NO = ? AND c.COUPON_STAT_CD = 'AVAILABLE' AND c.EXPIRE_DT >= NOW()
        ORDER BY c.EXPIRE_DT ASC;
      `;
      const couponRows = await executeQuery<RowDataPacket[]>(sql003, [userNo]);
      const coupons: UserCouponItem[] = couponRows.map((c: any) => ({
        couponNo: c.couponNo,
        campaignNm: c.campaignNm,
        discountAmt: Number(c.discountAmt) || 5000,
        expireDt: c.expireDt || '',
      }));

      return {
        status: 200,
        body: {
          success: true,
          reqNo,
          services,
          totalServiceAmt,
          baseFeeAmt: calculatedBaseFeeAmt,
          pointBalance,
          coupons,
          userSignUrl: dbSignUrl,
        },
      };
    }

    // -------------------------------------------------------------------------
    // MODE 2: 결제 승인 및 계약 체결 처리 (CONFIRM_PAYMENT)
    // -------------------------------------------------------------------------
    if (mode === 'CONFIRM_PAYMENT') {
      if (!selectedSlotList || selectedSlotList.length === 0) {
        return {
          status: 400,
          body: { success: false, message: '체결할 서비스 슬롯이 지정되지 않았습니다.' },
        };
      }

      const slotNos = selectedSlotList.map((s) => s.slotNo);
      const bidNos = selectedSlotList.map((s) => s.bidNo);

      // 슬롯 및 입찰 금액 재확인
      const slotPlaceholders = slotNos.map(() => '?').join(',');
      const bidPlaceholders = bidNos.map(() => '?').join(',');

      const sqlCheck = `
        SELECT 
          s.SLOT_NO AS slotNo,
          s.SUB_ITEM_NM AS subItemNm,
          s.SERVICE_TYPE_CD AS serviceTypeCd,
          b.BID_NO AS bidNo,
          b.PTNR_NO AS ptnrNo,
          b.BID_AMT AS bidAmt
        FROM TB_CLEAN_REQ_SLOT s
        INNER JOIN TB_CLEAN_BID b ON s.SLOT_NO = b.SLOT_NO
        WHERE s.SLOT_NO IN (${slotPlaceholders}) AND b.BID_NO IN (${bidPlaceholders});
      `;
      const checkRows = await executeQuery<RowDataPacket[]>(sqlCheck, [...slotNos, ...bidNos]);

      if (checkRows.length === 0) {
        return {
          status: 404,
          body: { success: false, message: '유효한 청약 슬롯 정보를 찾을 수 없습니다.' },
        };
      }

      // 서버 측 정확한 수수료 및 결제 금액 재검증
      const totalServiceAmt = checkRows.reduce((sum, r) => sum + (Number(r.bidAmt) || 0), 0);
      const expectedBaseFee = Math.max(Math.round(totalServiceAmt * 0.033), 33000);

      // 쿠폰 할인 검증
      let actualCouponDiscount = 0;
      if (couponNo && couponNo !== 'none') {
        const couponCheck = await executeQuery<RowDataPacket[]>(
          `SELECT COALESCE(DISCOUNT_AMT, 5000) AS discountAmt 
           FROM TB_USER_COUPON 
           WHERE COUPON_ISSUE_NO = ? 
             AND USER_NO = ? AND COUPON_STAT_CD = 'AVAILABLE' AND EXPIRE_DT >= NOW()`,
          [couponNo, userNo]
        );
        if (couponCheck.length > 0) {
          actualCouponDiscount = Number(couponCheck[0].discountAmt) || 5000;
        }
      }

      // 포인트 사용 유효성 검증 (100P 단위)
      const validPointAmt = Math.max(0, Math.floor(usePointAmt / 100) * 100);

      // 포인트 잔액 확인
      const pointRows = await executeQuery<RowDataPacket[]>(
        `SELECT COALESCE(BALANCE_AMT, 0) AS balance FROM TB_USER_POINT_LEDGER WHERE USER_NO = ? ORDER BY POINT_SEQ DESC LIMIT 1`,
        [userNo]
      );
      const currentPointBalance = pointRows.length > 0 ? Number(pointRows[0].balance) || 0 : 0;
      if (validPointAmt > currentPointBalance) {
        return {
          status: 400,
          body: {
            success: false,
            message: `보유 포인트(${currentPointBalance.toLocaleString()}P)를 초과하여 사용할 수 없습니다.`,
          },
        };
      }

      // 최종 실 결제금액 계산
      const expectedActualPaid = Math.max(0, expectedBaseFee - actualCouponDiscount - validPointAmt);

      // 클라이언트가 전송한 실결제액과 비교 검증 (불일치 시 위변조 방지)
      if (clientActualPaidAmt !== undefined && clientActualPaidAmt !== expectedActualPaid) {
        return {
          status: 400,
          body: {
            success: false,
            message: `결제 금액 검증 실패: 서버 계산액(${expectedActualPaid}원)과 요청액(${clientActualPaidAmt}원)이 일치하지 않습니다.`,
          },
        };
      }

      // 0원 결제 바이패스 처리
      let finalPgProvider = pgProviderCd;
      let finalPgTid = pgTid;
      if (expectedActualPaid === 0) {
        finalPgProvider = 'FREE_PASS';
        finalPgTid = 'FREE_' + Date.now();
      }

      // 채번 생성
      const now = new Date();
      const yyyymmdd =
        now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');
      const randomSeq = Math.floor(10000 + Math.random() * 90000);
      const repContractNo = `CT${yyyymmdd}${randomSeq}`;
      const payNo = `PAY${yyyymmdd}${randomSeq}`;
      const safeTelNo = `0507-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 트랜잭션 실행
      await executeTransaction(async (conn) => {
        // 1. 선택된 슬롯별 계약 생성 (USER-CNT-00-SQL-004) 및 슬롯 상태 갱신 (USER-CNT-00-SQL-008)
        let slotIndex = 0;
        for (const row of checkRows) {
          const slotContractNo =
            slotIndex === 0 ? repContractNo : `CT${yyyymmdd}${randomSeq + slotIndex}`;
          slotIndex++;

          // USER-CNT-00-SQL-004: TB_CLEAN_CONTRACT INSERT
          const sql004 = `
            INSERT INTO TB_CLEAN_CONTRACT (
              CONTRACT_NO, REQ_NO, SLOT_NO, USER_NO, PTNR_NO,
              CONTRACT_STAT_CD, TOTAL_PAY_AMT, SAFE_TEL_NO,
              USER_FEE_PAID_YN, PTNR_FEE_PAID_YN,
              SERVICE_START_DT, SERVICE_TYPE_CD, SUB_ITEM_NM,
              USER_SIGN_URL, REG_DT, REG_ID, MOD_DT, MOD_ID
            ) VALUES (
              ?, ?, ?, ?, ?,
              'CONFIRMED', ?, ?,
              'Y', 'Y',
              DATE_ADD(NOW(), INTERVAL 9 DAY), ?, ?,
              ?, NOW(), ?, NOW(), ?
            );
          `;
          await conn.execute(sql004, [
            slotContractNo,
            reqNo,
            row.slotNo,
            userNo,
            row.ptnrNo,
            Number(row.bidAmt) || 0,
            safeTelNo,
            row.serviceTypeCd || 'REGULAR',
            row.subItemNm || '청소 서비스',
            userSignUrl || null,
            userNo,
            userNo,
          ]);

          // USER-CNT-00-SQL-008: TB_CLEAN_REQ_SLOT UPDATE
          const sql008 = `
            UPDATE TB_CLEAN_REQ_SLOT
            SET SLOT_STAT_CD = 'CONTRACTED', MOD_DT = NOW(), MOD_ID = ?
            WHERE SLOT_NO = ?;
          `;
          await conn.execute(sql008, [userNo, row.slotNo]);
        }

        // 2. 데이터 이용료 결제 원장 생성 (USER-CNT-00-SQL-005)
        const sql005 = `
          INSERT INTO TB_DATA_FEE_PAY (
            PAY_NO, CONTRACT_NO, PAYER_TYPE_CD, PAYER_ID,
            BASE_FEE_AMT, DISCOUNT_COUPON_AMT, USED_POINT_AMT, ACTUAL_PAID_AMT,
            PG_PROVIDER_CD, PG_TID, PAY_STAT_CD, PAID_DT, REG_DT, REG_ID, MOD_DT, MOD_ID
          ) VALUES (
            ?, ?, 'USER', ?,
            ?, ?, ?, ?,
            ?, ?, 'COMPLETED', NOW(), NOW(), ?, NOW(), ?
          );
        `;
        await conn.execute(sql005, [
          payNo,
          repContractNo,
          userNo,
          expectedBaseFee,
          actualCouponDiscount,
          validPointAmt,
          expectedActualPaid,
          finalPgProvider,
          finalPgTid || null,
          userNo,
          userNo,
        ]);

        // 3. 쿠폰 사용 처리 (USER-CNT-00-SQL-006)
        if (couponNo && couponNo !== 'none' && actualCouponDiscount > 0) {
          const sql006 = `
            UPDATE TB_USER_COUPON
            SET COUPON_STAT_CD = 'USED', USED_DT = NOW(), MOD_DT = NOW(), MOD_ID = ?
            WHERE COUPON_ISSUE_NO = ? AND USER_NO = ?;
          `;
          await conn.execute(sql006, [userNo, couponNo, userNo]);
        }

        // 4. 포인트 차감 처리 (USER-CNT-00-SQL-007)
        if (validPointAmt > 0) {
          const newBalance = currentPointBalance - validPointAmt;
          const sql007 = `
            INSERT INTO TB_USER_POINT_LEDGER (
              USER_NO, POINT_CHG_TYPE_CD, POINT_AMT, BALANCE_AMT, REASON_DC, REG_DT, REG_ID
            ) VALUES (
              ?, 'USE_PAY', -?, ?, '계약 체결 시 데이터 이용료 포인트 차감', NOW(), ?
            );
          `;
          await conn.execute(sql007, [userNo, validPointAmt, newBalance, userNo]);
        }

        // 5. 신청서 마스터 상태 동기화
        await conn.execute(
          `UPDATE TB_CLEAN_REQ SET REQ_STAT_CD = 'ALL_CONTRACTED', MOD_DT = NOW(), MOD_ID = ? WHERE REQ_NO = ?`,
          [userNo, reqNo]
        );
      });

      return {
        status: 200,
        body: {
          success: true,
          contractNo: repContractNo,
          payNo,
          actualPaidAmt: expectedActualPaid,
          safeTelNo,
          message: '계약 체결 및 데이터 이용료 결제가 안전하게 완료되었습니다.',
        },
      };
    }

    return {
      status: 400,
      body: { success: false, message: '지원하지 않는 mode입니다: ' + mode },
    };
  } catch (error: any) {
    console.error('❌ [USER-CNT-00] Server processing error:', error);
    return {
      status: 500,
      body: {
        success: false,
        message: '서버 내부 결제 처리 중 오류가 발생했습니다: ' + (error.message || ''),
      },
    };
  }
}

// Next.js App Router POST 핸들러
export async function POST(request: Request) {
  try {
    const body: UserCnt00ReqBody = await request.json();
    const result = await processUserCnt00(body);
    return Response.json(result.body, { status: result.status });
  } catch (error: any) {
    return Response.json(
      { success: false, message: '잘못된 요청 형식입니다: ' + (error.message || '') },
      { status: 400 }
    );
  }
}
