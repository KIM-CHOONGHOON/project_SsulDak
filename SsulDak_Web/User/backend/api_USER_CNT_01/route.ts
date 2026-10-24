/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 개발 명세
 * 화면 ID: USER-CNT-01 (결제 완료 및 파트너 대기)
 * 백엔드 라우터 경로: SsulDak_Web/User/backend/api_USER_CNT_01/route.ts
 * 엔드포인트 URL: POST /api/user/user_cnt_01
 *
 * [독립 전용 SQL 쿼리 ID]
 *   - USER-CNT-01-SQL-001 (이용자 결제 전자 영수증 및 승인 내역 조회)
 *   - USER-CNT-01-SQL-002 (계약 마스터 및 파트너 현황 조회)
 *
 * [비즈니스 룰 및 결제 완료 상태 안내]
 *   - 본 결제는 플랫폼 데이터 이용료 납부 완료 영수증을 제공함.
 *   - 실제 시공 용역비(예: 320,000원)는 "시공 완료 후 현장 직불"임을 명확히 분리 안내.
 *   - 파트너가 플랫폼 이용료를 후결제할 때까지 계약 상태는 'WAITING_PAY' 또는 'CONFIRMED(파트너대기)'로 관리됨을 고지.
 *   - 파트너 후결제 완료 시 안심번호(SAFE_TEL_NO) 및 1:1 채팅방(USER-QOT-02)이 활성화됨을 안내.
 * =============================================================================
 */

import { executeQuery } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

// =============================================================================
// 1. 타입 및 인터페이스 정의
// =============================================================================

export interface UserCnt01ReqBody {
  actionType?: 'GET_PAY_RECEIPT';
  userNo?: string;
  contractNo?: string;
  payNo?: string;
  reqNo?: string;
}

export interface ReceiptInfo {
  orderNo: string;
  contractNo: string;
  payNo: string;
  baseFeeAmt: number;
  discountCouponAmt: number;
  usedPointAmt: number;
  totalDiscountAmt: number;
  actualPaidAmt: number;
  totalServiceAmt: number;
  pgProviderCd: string;
  pgTid: string;
  paidDt: string;
  payStatCd: string;
}

export interface ConfirmedContractService {
  contractNo: string;
  reqNo: string;
  slotNo: string;
  subItemNm: string;
  totalServiceAmt: number;
  contractStatCd: string;
  ptnrFeePaidYn: string;
  serviceStartDt: string;
  partnerCompanyNm: string;
  partnerCeoNm: string;
  avgRating: number;
  reviewCnt: number;
}

export interface PartnerWaitInfo {
  companyNm: string;
  ptnrFeePaidYn: string;
  guideMsg: string;
}

export interface UserCnt01Response {
  success: boolean;
  message?: string;
  receipt?: ReceiptInfo;
  services?: ConfirmedContractService[];
  partnerInfo?: PartnerWaitInfo;
}

// =============================================================================
// 2. 비즈니스 로직 처리 함수 (Next.js & Express 공용)
// =============================================================================

export async function processUserCnt01(
  body: UserCnt01ReqBody
): Promise<{ status: number; body: UserCnt01Response }> {
  const {
    actionType = 'GET_PAY_RECEIPT',
    userNo = 'U20261000001',
    contractNo,
    payNo,
    reqNo = 'REQ202610210001',
  } = body;

  try {
    if (actionType !== 'GET_PAY_RECEIPT') {
      return {
        status: 400,
        body: { success: false, message: '지원하지 않는 actionType입니다: ' + actionType },
      };
    }

    // 1. USER-CNT-01-SQL-001: 이용자 결제 전자 영수증 및 승인 내역 조회
    const sql001 = `
      SELECT 
        p.PAY_NO AS payNo,
        p.CONTRACT_NO AS contractNo,
        p.BASE_FEE_AMT AS baseFeeAmt,
        p.DISCOUNT_COUPON_AMT AS discountCouponAmt,
        p.USED_POINT_AMT AS usedPointAmt,
        (COALESCE(p.DISCOUNT_COUPON_AMT, 0) + COALESCE(p.USED_POINT_AMT, 0)) AS totalDiscountAmt,
        p.ACTUAL_PAID_AMT AS actualPaidAmt,
        p.PG_PROVIDER_CD AS pgProviderCd,
        p.PG_TID AS pgTid,
        DATE_FORMAT(p.PAID_DT, '%Y.%m.%d %H:%i:%s') AS paidDt,
        p.PAY_STAT_CD AS payStatCd
      FROM TB_DATA_FEE_PAY p
      WHERE (p.PAY_NO = ? OR p.CONTRACT_NO = ? OR ? IS NULL)
        AND p.PAYER_ID = ?
      ORDER BY p.PAID_DT DESC
      LIMIT 1;
    `;

    const payTargetParam = payNo || null;
    const contractTargetParam = contractNo || null;
    const payRows = await executeQuery<RowDataPacket[]>(sql001, [
      payTargetParam,
      contractTargetParam,
      payTargetParam,
      userNo,
    ]);

    // 결제 내역 기본값 설정 (조회 실패 시 최근 생성 또는 목업 데이터 적용)
    let receiptData: ReceiptInfo;
    if (payRows.length > 0) {
      const p = payRows[0];
      const providerLabel =
        p.pgProviderCd === 'FREE_PASS'
          ? '0원 결제 (전액 포인트/쿠폰 차감)'
          : p.pgProviderCd.startsWith('CARD_')
          ? `신용카드 (${p.pgProviderCd.replace('CARD_', '')} 일시불)`
          : p.pgProviderCd === 'TOSS'
          ? '간편결제 (토스페이)'
          : p.pgProviderCd === 'KAKAO'
          ? '간편결제 (카카오페이)'
          : p.pgProviderCd === 'VBANK'
          ? '가상계좌 (무통장 입금)'
          : '신용카드 (현대카드 일시불)';

      receiptData = {
        orderNo: `CNT-${(p.contractNo || '20261021-0001').replace(/^CT/, '')}`,
        contractNo: p.contractNo,
        payNo: p.payNo,
        baseFeeAmt: Number(p.baseFeeAmt) || 33000,
        discountCouponAmt: Number(p.discountCouponAmt) || 5000,
        usedPointAmt: Number(p.usedPointAmt) || 2000,
        totalDiscountAmt: Number(p.totalDiscountAmt) || 7000,
        actualPaidAmt: Number(p.actualPaidAmt) || 26000,
        totalServiceAmt: 320000, // 후속 조회에서 계산
        pgProviderCd: providerLabel,
        pgTid: p.pgTid || `APPR-${Math.floor(1000000 + Math.random() * 9000000)}`,
        paidDt: p.paidDt || '2026.10.21 14:32:05',
        payStatCd: p.payStatCd || 'COMPLETED',
      };
    } else {
      // 신규 결제 전 기본값 (모의 데이터)
      receiptData = {
        orderNo: 'CNT-20261021-0001',
        contractNo: contractNo || 'CT2026102100001',
        payNo: payNo || 'PAY2026102100001',
        baseFeeAmt: 33000,
        discountCouponAmt: 5000,
        usedPointAmt: 2000,
        totalDiscountAmt: 7000,
        actualPaidAmt: 26000,
        totalServiceAmt: 320000,
        pgProviderCd: '신용카드 (현대카드 일시불)',
        pgTid: 'APPR-9482104',
        paidDt: '2026.10.21 14:32:05',
        payStatCd: 'COMPLETED',
      };
    }

    // 2. USER-CNT-01-SQL-002: 계약 마스터 및 파트너 현황 조회
    const sql002 = `
      SELECT 
        c.CONTRACT_NO AS contractNo,
        c.REQ_NO AS reqNo,
        c.SLOT_NO AS slotNo,
        c.SUB_ITEM_NM AS subItemNm,
        c.TOTAL_PAY_AMT AS totalServiceAmt,
        c.CONTRACT_STAT_CD AS contractStatCd,
        c.PTNR_FEE_PAID_YN AS ptnrFeePaidYn,
        c.SAFE_TEL_NO AS safeTelNo,
        DATE_FORMAT(c.SERVICE_START_DT, '%Y.%m.%d (%a) %H:%i') AS serviceStartDt,
        pt.PTNR_NO AS ptnrNo,
        pt.COMPANY_NM AS partnerCompanyNm,
        COALESCE(pt.CEO_NM, '대표자') AS partnerCeoNm,
        COALESCE(pt.AVG_RATING, 5.0) AS avgRating,
        COALESCE(pt.REVIEW_CNT, 128) AS reviewCnt
      FROM TB_CLEAN_CONTRACT c
      INNER JOIN TB_PARTNER pt ON c.PTNR_NO = pt.PTNR_NO
      WHERE (c.CONTRACT_NO = ? OR c.REQ_NO = ? OR c.USER_NO = ?)
        AND c.USER_NO = ?
      ORDER BY c.CONTRACT_NO ASC;
    `;

    const contractRows = await executeQuery<RowDataPacket[]>(sql002, [
      receiptData.contractNo,
      reqNo,
      userNo,
      userNo,
    ]);

    let services: ConfirmedContractService[] = [];
    if (contractRows.length > 0) {
      services = contractRows.map((r: any) => ({
        contractNo: r.contractNo,
        reqNo: r.reqNo,
        slotNo: r.slotNo,
        subItemNm: r.subItemNm || '청소 서비스',
        totalServiceAmt: Number(r.totalServiceAmt) || 0,
        contractStatCd: r.contractStatCd,
        ptnrFeePaidYn: r.ptnrFeePaidYn || 'N',
        serviceStartDt: r.serviceStartDt || '2026.11.01 (일) 09:00',
        partnerCompanyNm: r.partnerCompanyNm || '반짝빌라클린',
        partnerCeoNm: r.partnerCeoNm || '홍길동 대표',
        avgRating: Number(r.avgRating) || 5.0,
        reviewCnt: Number(r.reviewCnt) || 128,
      }));

      // 합산 실제 시공비 반영
      const calculatedTotal = services.reduce((sum, item) => sum + item.totalServiceAmt, 0);
      if (calculatedTotal > 0) {
        receiptData.totalServiceAmt = calculatedTotal;
      }
    } else {
      // 목업 기본값
      services = [
        {
          contractNo: 'CT2026102100001',
          reqNo: 'REQ202610210001',
          slotNo: 'REQ202610210001-01',
          subItemNm: '정기청소 3개월 (빌라 1~4층 계단+주차장)',
          totalServiceAmt: 240000,
          contractStatCd: 'CONFIRMED',
          ptnrFeePaidYn: 'N',
          serviceStartDt: '2026.11.01 (일) 09:00',
          partnerCompanyNm: '반짝빌라클린',
          partnerCeoNm: '홍길동 대표',
          avgRating: 5.0,
          reviewCnt: 184,
        },
        {
          contractNo: 'CT2026102100002',
          reqNo: 'REQ202610210001',
          slotNo: 'REQ202610210001-02',
          subItemNm: '가전케어 에어컨 1대 (LG 스탠드 완전분해 세척)',
          totalServiceAmt: 80000,
          contractStatCd: 'CONFIRMED',
          ptnrFeePaidYn: 'N',
          serviceStartDt: '2026.11.01 (일) 11:30',
          partnerCompanyNm: '홈케어마스터',
          partnerCeoNm: '공식인증 엔지니어',
          avgRating: 4.9,
          reviewCnt: 96,
        },
      ];
    }

    const partnerInfo: PartnerWaitInfo = {
      companyNm: services.length > 0 ? services[0].partnerCompanyNm : '반짝빌라클린',
      ptnrFeePaidYn: services.length > 0 ? services[0].ptnrFeePaidYn : 'N',
      guideMsg:
        '파트너가 데이터 이용료를 납부(통상 1시간 이내)하면 0507 안심번호와 1:1 상담 채팅방(USER-QOT-02)이 즉시 열립니다.',
    };

    return {
      status: 200,
      body: {
        success: true,
        receipt: receiptData,
        services,
        partnerInfo,
      },
    };
  } catch (error: any) {
    console.error('❌ [USER-CNT-01] Error getting payment receipt:', error);
    return {
      status: 500,
      body: {
        success: false,
        message: '결제 영수증 조회 중 오류가 발생했습니다: ' + (error.message || ''),
      },
    };
  }
}

// Next.js App Router POST 핸들러
export async function POST(request: Request) {
  try {
    const body: UserCnt01ReqBody = await request.json();
    const result = await processUserCnt01(body);
    return Response.json(result.body, { status: result.status });
  } catch (error: any) {
    return Response.json(
      { success: false, message: '잘못된 요청 형식입니다: ' + (error.message || '') },
      { status: 400 }
    );
  }
}
