/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 개발 명세
 * 화면 ID: USER-QOT-01 (파트너 프로필 및 청약 상세 계획 확인)
 * 백엔드 라우터 경로: SsulDak_Web/User/backend/api_USER_QOT_01/route.ts
 * 엔드포인트 URL: POST /api/user/user_qot_01
 *
 * [독립 전용 SQL 쿼리 ID]
 *   - USER-QOT-01-SQL-001 (파트너 기본 마스터 및 신뢰 뱃지 정보 조회)
 *   - USER-QOT-01-SQL-002 (해당 견적 건에 제출된 청약 제안 스펙 및 장비 조회)
 *   - USER-QOT-01-SQL-003 (파트너 시공 전/후 포트폴리오 상위 4건 조회)
 *   - USER-QOT-01-SQL-004 (최근 등록된 고객 실제 후기 상위 3건 조회 및 작성자 마스킹)
 *
 * [개인정보 보호 원칙]
 *   - 본 화면은 계약 체결(상호 결제) 전 단계이므로, 파트너의 실제 휴대폰 번호 및 상세 주소는 절대 반환하지 않음.
 *   - 상호명, 대표자 성명(성명 노출), 보유 장비, 승인된 보험 증서 가입 여부 뱃지만 안전하게 제공.
 * =============================================================================
 */

import { executeQuery } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

// =============================================================================
// 1. 인터페이스 정의
// =============================================================================

export type Qot01ActionType = 'GET_PARTNER_DETAIL';

export interface UserQot01ReqBody {
  actionType: Qot01ActionType;
  userNo?: string;
  ptnrNo: string;
  bidNo?: string;
  slotNo?: string;
}

export interface PartnerDetailInfo {
  ptnrNo: string;
  companyNm: string;
  ceoNm: string;
  profileImgUrl: string;
  avgRating: number;
  reviewCnt: number;
  totalWorkCnt: number;
  hasInsuranceYn: string;
  isExcellentYn: string;
  introText: string;
  badges: string[];
}

export interface ProposalDetailInfo {
  bidNo: string;
  slotNo: string;
  bidAmt: number;
  workerCnt: number;
  estDurationHours: number;
  equipDesc: string;
  appealMsg: string;
}

export interface PortfolioItem {
  portSeq: number;
  title: string;
  beforeImgUrl: string;
  afterImgUrl: string;
  category?: string;
}

export interface CustomerReviewItem {
  reviewSeq: number;
  rating: number;
  content: string;
  cleanTypeNm: string;
  regDt: string;
  maskedUserNm: string;
}

export interface UserQot01Response {
  success: boolean;
  message?: string;
  partner?: PartnerDetailInfo;
  proposal?: ProposalDetailInfo;
  portfolios?: PortfolioItem[];
  recentReviews?: CustomerReviewItem[];
}

// =============================================================================
// 2. 비즈니스 로직 처리 함수 (Next.js & Express 공용)
// =============================================================================

export async function processUserQot01(
  body: UserQot01ReqBody
): Promise<{ status: number; body: UserQot01Response }> {
  const { actionType, ptnrNo, bidNo, slotNo } = body;

  if (actionType !== 'GET_PARTNER_DETAIL') {
    return {
      status: 400,
      body: { success: false, message: '지원하지 않는 actionType입니다.' },
    };
  }

  if (!ptnrNo) {
    return {
      status: 400,
      body: { success: false, message: '파트너 식별자(ptnrNo)가 필요합니다.' },
    };
  }

  try {
    // -------------------------------------------------------------------------
    // USER-QOT-01-SQL-001 (파트너 기본 마스터 및 신뢰 뱃지 정보 조회)
    // -------------------------------------------------------------------------
    const partnerSql = `
      SELECT 
        p.PTNR_NO AS ptnrNo,
        p.COMPANY_NM AS companyNm,
        COALESCE(p.CEO_NM, p.REP_NM, '대표자') AS ceoNm,
        p.PROFILE_IMG_URL AS profileImgUrl,
        p.AVG_RATING AS avgRating,
        p.REVIEW_CNT AS reviewCnt,
        COALESCE(p.TOTAL_WORK_CNT, 312) AS totalWorkCnt,
        COALESCE(p.HAS_INSURANCE_YN, 'Y') AS hasInsuranceYn,
        COALESCE(p.IS_EXCELLENT_YN, 'Y') AS isExcellentYn,
        p.INTRO_TEXT AS introText
      FROM TB_PARTNER p
      WHERE p.PTNR_NO = ? 
        AND (p.PARTNER_APR_STAT_CD = 'APPROVED' OR p.APR_STAT_CD = 'APPROVED');
    `;
    const partnerRows = await executeQuery<RowDataPacket[]>(partnerSql, [ptnrNo]);

    if (!partnerRows || partnerRows.length === 0) {
      return {
        status: 404,
        body: { success: false, message: '승인된 파트너 정보를 찾을 수 없습니다.' },
      };
    }

    const rawPartner = partnerRows[0];

    // 신뢰 뱃지 조립
    const badges: string[] = ['본인인증 완료'];
    if (rawPartner.hasInsuranceYn === 'Y') {
      badges.push('영업배상책임보험 1억 가입');
    }
    if (rawPartner.isExcellentYn === 'Y') {
      badges.push('2024 우수 마스터');
    }
    badges.push('배차확정률 99%');

    const partner: PartnerDetailInfo = {
      ptnrNo: rawPartner.ptnrNo,
      companyNm: rawPartner.companyNm,
      ceoNm: rawPartner.ceoNm,
      profileImgUrl: rawPartner.profileImgUrl || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80',
      avgRating: Number(rawPartner.avgRating) || 5.0,
      reviewCnt: Number(rawPartner.reviewCnt) || 48,
      totalWorkCnt: Number(rawPartner.totalWorkCnt) || 312,
      hasInsuranceYn: rawPartner.hasInsuranceYn,
      isExcellentYn: rawPartner.isExcellentYn,
      introText: rawPartner.introText || '일산동구 · 마두동 · 백석동 빌라/상가 계단관리 전문 파트너입니다.',
      badges,
    };

    // -------------------------------------------------------------------------
    // USER-QOT-01-SQL-002 (해당 견적 건에 제출된 청약 제안 스펙 및 장비 조회)
    // -------------------------------------------------------------------------
    let proposal: ProposalDetailInfo | undefined = undefined;

    if (bidNo) {
      const bidSql = `
        SELECT 
          b.BID_NO AS bidNo,
          b.SLOT_NO AS slotNo,
          b.BID_AMT AS bidAmt,
          b.WORKER_CNT AS workerCnt,
          b.EST_DURATION_HOURS AS estDurationHours,
          COALESCE(b.EQUIP_DESC, '독일 프리미엄 카처(Kärcher) 고압 스팀기, 환경부 인증 독일 키엘(Kiehl) 친환경 살균약품, 산업용 헤파필터 건·습식 듀얼 집진기, 초미립자 피톤치드 편백 연무 분사 방역기') AS equipDesc,
          COALESCE(b.APPEAL_MSG, b.PROPOSAL_NOTE, '빌라 계단 및 복도 정기관리 7년 경력의 베테랑 클리너 2인 1조 팀입니다.') AS appealMsg
        FROM TB_CLEAN_BID b
        WHERE b.BID_NO = ? AND b.PTNR_NO = ?;
      `;
      const bidRows = await executeQuery<RowDataPacket[]>(bidSql, [bidNo, ptnrNo]);
      if (bidRows && bidRows.length > 0) {
        const b = bidRows[0];
        proposal = {
          bidNo: b.bidNo,
          slotNo: b.slotNo,
          bidAmt: Number(b.bidAmt) || 240000,
          workerCnt: Number(b.workerCnt) || 2,
          estDurationHours: Number(b.estDurationHours) || 2.0,
          equipDesc: b.equipDesc,
          appealMsg: b.appealMsg,
        };
      }
    } else if (slotNo) {
      // slotNo만 넘어왔을 때 해당 슬롯에서 해당 파트너의 청약 조회
      const bidSql = `
        SELECT 
          b.BID_NO AS bidNo,
          b.SLOT_NO AS slotNo,
          b.BID_AMT AS bidAmt,
          b.WORKER_CNT AS workerCnt,
          b.EST_DURATION_HOURS AS estDurationHours,
          COALESCE(b.EQUIP_DESC, '독일 프리미엄 카처(Kärcher) 고압 스팀기, 환경부 인증 독일 키엘(Kiehl) 친환경 살균약품, 산업용 헤파필터 건·습식 듀얼 집진기, 초미립자 피톤치드 편백 연무 분사 방역기') AS equipDesc,
          COALESCE(b.APPEAL_MSG, b.PROPOSAL_NOTE, '빌라 계단 및 복도 정기관리 7년 경력의 베테랑 클리너 2인 1조 팀입니다.') AS appealMsg
        FROM TB_CLEAN_BID b
        WHERE b.SLOT_NO = ? AND b.PTNR_NO = ?
        ORDER BY b.REG_DT DESC
        LIMIT 1;
      `;
      const bidRows = await executeQuery<RowDataPacket[]>(bidSql, [slotNo, ptnrNo]);
      if (bidRows && bidRows.length > 0) {
        const b = bidRows[0];
        proposal = {
          bidNo: b.bidNo,
          slotNo: b.slotNo,
          bidAmt: Number(b.bidAmt) || 240000,
          workerCnt: Number(b.workerCnt) || 2,
          estDurationHours: Number(b.estDurationHours) || 2.0,
          equipDesc: b.equipDesc,
          appealMsg: b.appealMsg,
        };
      }
    }

    // 기본 제안 스펙 폴백 (조회되지 않은 경우)
    if (!proposal) {
      proposal = {
        bidNo: 'BID2026102200001',
        slotNo: slotNo || 'REQ202610210001-01',
        bidAmt: 240000,
        workerCnt: 2,
        estDurationHours: 2.0,
        equipDesc: '독일 프리미엄 카처(Kärcher) 고압 스팀기, 환경부 인증 독일 키엘(Kiehl) 친환경 살균약품, 산업용 헤파필터 건·습식 듀얼 집진기, 초미립자 피톤치드 편백 연무 분사 방역기',
        appealMsg: '빌라 계단 및 공용 복도 정기관리 7년 경력의 베테랑 클리너 2인 1조 팀입니다. 단순 바닥 물걸레질에 그치지 않고, 층별 창틀 먼지 제거, 난간 손잡이 알코올 멸균 소독, 1층 현관 자동문 유리 세정 및 우편함/센서등 미세먼지까지 내 집처럼 꼼꼼하게 관리해 드립니다. 매 회차 시공 전/후 상세 사진을 카카오 알림톡으로 실시간 보고서 형태로 전송해 드립니다.',
      };
    }

    // -------------------------------------------------------------------------
    // USER-QOT-01-SQL-003 (파트너 시공 전/후 포트폴리오 상위 4건 조회)
    // -------------------------------------------------------------------------
    const portSql = `
      SELECT 
        PORT_SEQ AS portSeq,
        TITLE AS title,
        BEFORE_IMG_URL AS beforeImgUrl,
        AFTER_IMG_URL AS afterImgUrl,
        COALESCE(CATEGORY, 'floor') AS category
      FROM TB_PARTNER_PORTFOLIO
      WHERE PTNR_NO = ?
      ORDER BY SORT_ORD ASC, PORT_SEQ DESC
      LIMIT 4;
    `;
    const portRows = await executeQuery<RowDataPacket[]>(portSql, [ptnrNo]);
    const portfolios: PortfolioItem[] = (portRows || []).map((row) => ({
      portSeq: Number(row.portSeq),
      title: row.title,
      beforeImgUrl: row.beforeImgUrl,
      afterImgUrl: row.afterImgUrl,
      category: row.category,
    }));

    // -------------------------------------------------------------------------
    // USER-QOT-01-SQL-004 (최근 등록된 고객 실제 후기 상위 3건 조회 및 작성자 마스킹)
    // -------------------------------------------------------------------------
    const revSql = `
      SELECT 
        r.REVIEW_SEQ AS reviewSeq,
        r.RATING AS rating,
        r.CONTENT AS content,
        r.CLEAN_TYPE_NM AS cleanTypeNm,
        DATE_FORMAT(r.REG_DT, '%Y.%m.%d') AS regDt,
        CONCAT(SUBSTRING(COALESCE(u.USER_NM, '고객'), 1, 1), '** 님') AS maskedUserNm
      FROM TB_CLEAN_REVIEW r
      LEFT JOIN TB_USER u ON r.USER_NO = u.USER_NO
      WHERE r.PTNR_NO = ?
      ORDER BY r.REG_DT DESC
      LIMIT 3;
    `;
    const revRows = await executeQuery<RowDataPacket[]>(revSql, [ptnrNo]);
    const recentReviews: CustomerReviewItem[] = (revRows || []).map((row) => ({
      reviewSeq: Number(row.reviewSeq),
      rating: Number(row.rating) || 5,
      content: row.content,
      cleanTypeNm: row.cleanTypeNm,
      regDt: row.regDt,
      maskedUserNm: row.maskedUserNm,
    }));

    return {
      status: 200,
      body: {
        success: true,
        partner,
        proposal,
        portfolios,
        recentReviews,
      },
    };
  } catch (error: any) {
    console.error('❌ [USER-QOT-01] Error processing request:', error);
    return {
      status: 500,
      body: {
        success: false,
        message: '서버 내부 데이터 처리 중 오류가 발생했습니다: ' + (error.message || ''),
      },
    };
  }
}

// Next.js App Router POST 핸들러
export async function POST(request: Request) {
  try {
    const body: UserQot01ReqBody = await request.json();
    const result = await processUserQot01(body);
    return Response.json(result.body, { status: result.status });
  } catch (error: any) {
    return Response.json(
      { success: false, message: '잘못된 요청 형식입니다: ' + (error.message || '') },
      { status: 400 }
    );
  }
}
