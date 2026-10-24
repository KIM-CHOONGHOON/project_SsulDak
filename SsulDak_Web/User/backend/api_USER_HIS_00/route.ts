// SsulDak_Web/User/backend/api_USER_HIS_00/route.ts
/**
 * [SsulDak (쓸고닦고)] USER-HIS-00 (청소 이용 내역)
 * 백엔드 전용 API 라우터 (POST /api/user/user_his_00)
 *
 * 엄격 준수 규칙:
 * 1. 물리적 격리: SsulDak_Web/User 내 완결
 * 2. 1:1 매핑: USER-HIS-00 전용 백엔드 라우터
 * 3. 독립 전용 SQL ID: USER-HIS-00-SQL-001 ~ 004
 * 4. 계약 상태별 탭 분리: ACTIVE (진행 중) / PAST (지난 내역)
 */

import { executeQuery } from '@/lib/db';

export interface UserHis00Request {
  tabType?: 'ACTIVE' | 'PAST';
  userNo?: string;
  page?: number;
  limit?: number;
  periodFilter?: string; // 'ALL', '3M', '6M'
  serviceFilter?: string; // 'ALL', 'REGULAR', 'APPLIANCE', 'MOVEIN'
}

export interface ContractItem {
  contractNo: string;
  reqNo: string;
  slotNo: string;
  serviceTypeCd: 'REGULAR' | 'APPLIANCE' | 'MOVEIN';
  serviceTypeNm: string;
  subItemNm: string;
  contractStatCd: 'WAITING_PAY' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  badgeType: 'WAITING_PAY' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  badgeText: string;
  badgeColor: 'orange' | 'green' | 'blue' | 'gray' | 'red';
  ptnrFeePaidYn: string;
  serviceStartDt: string | null;
  serviceStartFormatted: string;
  totalPayAmt: number;
  safeTelNo: string | null;
  addrRoad: string;
  addrDetail: string;
  ptnrNo: string;
  companyNm: string;
  ceoNm: string | null;
  profileImgUrl: string;
  avgRating: number;
  reviewCnt: number;
  completedRound: number;
  canChat: boolean;
  canInspect: boolean;
  canReview: boolean;
  reviewWrittenCnt?: number;
  contractDt?: string;
}

export async function processUserHis00(data: UserHis00Request) {
  const userNo = data.userNo || 'U20261000001';
  const tabType = data.tabType || 'ACTIVE';
  const page = Math.max(1, Number(data.page) || 1);
  const limit = Math.max(1, Math.min(50, Number(data.limit) || 10));
  const offset = (page - 1) * limit;

  try {
    // [USER-HIS-00-SQL-001] 탭별 카운트 조회
    const countRows = await executeQuery<any[]>(
      `
      SELECT 
        COUNT(CASE WHEN CONTRACT_STAT_CD IN ('WAITING_PAY', 'CONFIRMED', 'IN_PROGRESS') THEN 1 END) AS activeCnt,
        COUNT(CASE WHEN CONTRACT_STAT_CD IN ('COMPLETED', 'CANCELLED') THEN 1 END) AS pastCnt
      FROM TB_CLEAN_CONTRACT
      WHERE USER_NO = ?;
      `,
      [userNo]
    );

    const activeCnt = Number(countRows[0]?.activeCnt) || 0;
    const pastCnt = Number(countRows[0]?.pastCnt) || 0;

    // [USER-HIS-00-SQL-004] 사용자 보유 혜택 요약 조회 (쿠폰 수, 포인트 잔액)
    const benefitRows = await executeQuery<any[]>(
      `
      SELECT 
        (SELECT COUNT(*) FROM TB_USER_COUPON WHERE USER_NO = ? AND COUPON_STAT_CD = 'AVAILABLE' AND EXPIRE_DT >= NOW()) AS couponCnt,
        (SELECT COALESCE(BALANCE_AMT, 0) FROM TB_USER_POINT_LEDGER WHERE USER_NO = ? ORDER BY POINT_SEQ DESC LIMIT 1) AS pointBalance
      `,
      [userNo, userNo]
    );

    const couponCnt = Number(benefitRows[0]?.couponCnt) || 0;
    const pointBalance = Number(benefitRows[0]?.pointBalance) || 0;

    let contracts: ContractItem[] = [];

    if (tabType === 'ACTIVE') {
      // [USER-HIS-00-SQL-002] 진행 중인 청소 목록 조회
      let filterSql = '';
      const filterParams: any[] = [userNo];

      if (data.serviceFilter && data.serviceFilter !== 'ALL') {
        filterSql += ' AND c.SERVICE_TYPE_CD = ?';
        filterParams.push(data.serviceFilter);
      }

      filterParams.push(limit, offset);

      const rows = await executeQuery<any[]>(
        `
        SELECT 
          c.CONTRACT_NO AS contractNo,
          c.REQ_NO AS reqNo,
          c.SLOT_NO AS slotNo,
          c.SERVICE_TYPE_CD AS serviceTypeCd,
          c.SUB_ITEM_NM AS subItemNm,
          c.CONTRACT_STAT_CD AS contractStatCd,
          c.PTNR_FEE_PAID_YN AS ptnrFeePaidYn,
          c.SERVICE_START_DT AS serviceStartDt,
          DATE_FORMAT(c.SERVICE_START_DT, '%Y.%m.%d (%a) %H:%i') AS serviceStartFormatted,
          c.TOTAL_PAY_AMT AS totalPayAmt,
          c.SAFE_TEL_NO AS safeTelNo,
          COALESCE(r.ADDR_ROAD, '경기 고양시 일산동구 중앙로 빌라 단지') AS addrRoad,
          COALESCE(r.ADDR_DETAIL, '정문 현관 앞 비밀번호 사전 공유 완료') AS addrDetail,
          p.PTNR_NO AS ptnrNo,
          p.COMPANY_NM AS companyNm,
          p.CEO_NM AS ceoNm,
          COALESCE(p.PROFILE_IMG_URL, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtVDOX_dLoEjGl_Cer-B0QyQOPLr2Yj-PIRDE3T7rF6by54b0eAvWQnfz96bxZYOjV-ijnadlVL1Ux6-8MtnswXhH0SF7Gp7JaAhCKHRNQODMIDiLKkot_K9y4R4pNOAQzlmQhazMbKSitZ0K4oUGTeb9IKAG-NR_emzgUWEzKWm_t9oLqTRK3WGBboENkonJDhyQ0Oth_iHNGLlq5id0w5sfDyHuQnja53K_r23EQIRQDQf1kdDOA') AS profileImgUrl,
          COALESCE(p.AVG_RATING, 5.0) AS avgRating,
          COALESCE((SELECT COUNT(*) FROM TB_CLEAN_REVIEW rv WHERE rv.PTNR_NO = p.PTNR_NO), 184) AS reviewCnt,
          COALESCE((SELECT MAX(ROUND_NO) FROM TB_CLEAN_WORK_LOG w WHERE w.CONTRACT_NO = c.CONTRACT_NO AND w.WORK_STAT_CD IN ('COMPLETED', 'VERIFIED')), 0) AS completedRound
        FROM TB_CLEAN_CONTRACT c
        LEFT JOIN TB_CLEAN_REQ r ON c.REQ_NO = r.REQ_NO
        INNER JOIN TB_PARTNER p ON c.PTNR_NO = p.PTNR_NO
        WHERE c.USER_NO = ? 
          AND c.CONTRACT_STAT_CD IN ('WAITING_PAY', 'CONFIRMED', 'IN_PROGRESS')
          ${filterSql}
        ORDER BY c.REG_DT DESC
        LIMIT ? OFFSET ?;
        `,
        filterParams
      );

      contracts = rows.map((r: any) => {
        let badgeType: ContractItem['badgeType'] = 'CONFIRMED';
        let badgeText = '배차 완료 · 1회차 대기';
        let badgeColor: ContractItem['badgeColor'] = 'green';
        let canChat = true;
        let canInspect = true;

        if (r.ptnrFeePaidYn === 'N' || r.contractStatCd === 'WAITING_PAY') {
          badgeType = 'WAITING_PAY';
          badgeText = '파트너 결제 대기 중';
          badgeColor = 'orange';
          canChat = false;
          canInspect = false;
        } else if (r.contractStatCd === 'IN_PROGRESS') {
          badgeType = 'IN_PROGRESS';
          badgeText = `시공 진행 중 (${r.completedRound || 1}회차)`;
          badgeColor = 'blue';
          canChat = true;
          canInspect = true;
        } else {
          badgeType = 'CONFIRMED';
          badgeText = '배차 완료 · 1회차 대기';
          badgeColor = 'green';
          canChat = true;
          canInspect = true;
        }

        const serviceTypeNm =
          r.serviceTypeCd === 'REGULAR'
            ? '정기청소'
            : r.serviceTypeCd === 'APPLIANCE'
            ? '가전케어'
            : '이사/입주청소';

        return {
          contractNo: r.contractNo,
          reqNo: r.reqNo,
          slotNo: r.slotNo,
          serviceTypeCd: r.serviceTypeCd,
          serviceTypeNm,
          subItemNm: r.subItemNm,
          contractStatCd: r.contractStatCd,
          badgeType,
          badgeText,
          badgeColor,
          ptnrFeePaidYn: r.ptnrFeePaidYn,
          serviceStartDt: r.serviceStartDt,
          serviceStartFormatted: r.serviceStartFormatted || '2026.11.01 (일) 09:00',
          totalPayAmt: Number(r.totalPayAmt) || 0,
          safeTelNo: r.safeTelNo,
          addrRoad: r.addrRoad,
          addrDetail: r.addrDetail,
          ptnrNo: r.ptnrNo,
          companyNm: r.companyNm,
          ceoNm: r.ceoNm,
          profileImgUrl: r.profileImgUrl,
          avgRating: Number(r.avgRating) || 5.0,
          reviewCnt: Number(r.reviewCnt) || 48,
          completedRound: Number(r.completedRound) || 0,
          canChat,
          canInspect,
          canReview: false,
        };
      });
    } else {
      // [USER-HIS-00-SQL-003] 지난 청소 내역 목록 조회
      let filterSql = '';
      const filterParams: any[] = [userNo];

      if (data.serviceFilter && data.serviceFilter !== 'ALL') {
        filterSql += ' AND c.SERVICE_TYPE_CD = ?';
        filterParams.push(data.serviceFilter);
      }

      filterParams.push(userNo, limit, offset);

      const rows = await executeQuery<any[]>(
        `
        SELECT 
          c.CONTRACT_NO AS contractNo,
          c.REQ_NO AS reqNo,
          c.SLOT_NO AS slotNo,
          c.SERVICE_TYPE_CD AS serviceTypeCd,
          c.SUB_ITEM_NM AS subItemNm,
          c.CONTRACT_STAT_CD AS contractStatCd,
          c.TOTAL_PAY_AMT AS totalPayAmt,
          DATE_FORMAT(c.REG_DT, '%Y.%m.%d') AS contractDt,
          c.SERVICE_START_DT AS serviceStartDt,
          DATE_FORMAT(c.SERVICE_START_DT, '%Y.%m.%d (%a) %H:%i') AS serviceStartFormatted,
          COALESCE(r.ADDR_ROAD, '경기 고양시 일산동구 중앙로 빌라 단지') AS addrRoad,
          COALESCE(r.ADDR_DETAIL, '정문 현관 앞') AS addrDetail,
          p.PTNR_NO AS ptnrNo,
          p.COMPANY_NM AS companyNm,
          p.CEO_NM AS ceoNm,
          COALESCE(p.PROFILE_IMG_URL, 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtVDOX_dLoEjGl_Cer-B0QyQOPLr2Yj-PIRDE3T7rF6by54b0eAvWQnfz96bxZYOjV-ijnadlVL1Ux6-8MtnswXhH0SF7Gp7JaAhCKHRNQODMIDiLKkot_K9y4R4pNOAQzlmQhazMbKSitZ0K4oUGTeb9IKAG-NR_emzgUWEzKWm_t9oLqTRK3WGBboENkonJDhyQ0Oth_iHNGLlq5id0w5sfDyHuQnja53K_r23EQIRQDQf1kdDOA') AS profileImgUrl,
          COALESCE(p.AVG_RATING, 5.0) AS avgRating,
          COALESCE((SELECT COUNT(*) FROM TB_CLEAN_REVIEW rv WHERE rv.PTNR_NO = p.PTNR_NO), 184) AS reviewCnt,
          (SELECT COUNT(*) FROM TB_CLEAN_REVIEW rv WHERE rv.CONTRACT_NO = c.CONTRACT_NO AND rv.USER_NO = ?) AS reviewWrittenCnt
        FROM TB_CLEAN_CONTRACT c
        LEFT JOIN TB_CLEAN_REQ r ON c.REQ_NO = r.REQ_NO
        INNER JOIN TB_PARTNER p ON c.PTNR_NO = p.PTNR_NO
        WHERE c.USER_NO = ? 
          AND c.CONTRACT_STAT_CD IN ('COMPLETED', 'CANCELLED')
          ${filterSql}
        ORDER BY c.REG_DT DESC
        LIMIT ? OFFSET ?;
        `,
        filterParams
      );

      contracts = rows.map((r: any) => {
        const isCompleted = r.contractStatCd === 'COMPLETED';
        const badgeType = isCompleted ? 'COMPLETED' : 'CANCELLED';
        const badgeText = isCompleted ? '최종 완료' : '계약 취소/종료';
        const badgeColor = isCompleted ? 'gray' : 'red';
        const reviewWritten = Number(r.reviewWrittenCnt) > 0;
        const canReview = isCompleted && !reviewWritten;

        const serviceTypeNm =
          r.serviceTypeCd === 'REGULAR'
            ? '정기청소'
            : r.serviceTypeCd === 'APPLIANCE'
            ? '가전케어'
            : '이사/입주청소';

        return {
          contractNo: r.contractNo,
          reqNo: r.reqNo,
          slotNo: r.slotNo,
          serviceTypeCd: r.serviceTypeCd,
          serviceTypeNm,
          subItemNm: r.subItemNm,
          contractStatCd: r.contractStatCd,
          badgeType,
          badgeText,
          badgeColor,
          ptnrFeePaidYn: 'Y',
          serviceStartDt: r.serviceStartDt,
          serviceStartFormatted: r.serviceStartFormatted || '2026.09.20 (일) 10:00',
          totalPayAmt: Number(r.totalPayAmt) || 0,
          safeTelNo: null,
          addrRoad: r.addrRoad,
          addrDetail: r.addrDetail,
          ptnrNo: r.ptnrNo,
          companyNm: r.companyNm,
          ceoNm: r.ceoNm,
          profileImgUrl: r.profileImgUrl,
          avgRating: Number(r.avgRating) || 5.0,
          reviewCnt: Number(r.reviewCnt) || 48,
          completedRound: 1,
          canChat: false,
          canInspect: true,
          canReview,
          reviewWrittenCnt: Number(r.reviewWrittenCnt) || 0,
          contractDt: r.contractDt,
        };
      });
    }

    return {
      success: true,
      tabType,
      counts: {
        active: activeCnt,
        past: pastCnt,
      },
      benefits: {
        couponCnt,
        pointBalance,
      },
      page,
      limit,
      contracts,
      syncedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
  } catch (error: any) {
    console.error('❌ [USER-HIS-00] Server processing error:', error);
    return {
      success: false,
      message: `청소 이용 내역 조회 중 오류가 발생했습니다: ${error.message || error}`,
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UserHis00Request;
    const result = await processUserHis00(body);
    const status = result.success ? 200 : 500;
    return new Response(JSON.stringify(result), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('❌ [USER-HIS-00] POST Handler Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        message: '요청 본문(JSON) 파싱 실패 또는 서버 내부 오류입니다.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
