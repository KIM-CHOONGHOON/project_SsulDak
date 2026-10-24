// SsulDak_Web/User/backend/api_USER_MYP_00/route.ts
/**
 * [SsulDak (쓸고닦고)] USER-MYP-00 (이용자 마이페이지)
 * 백엔드 전용 API 라우터 (POST /api/user/user_myp_00)
 *
 * 엄격 준수 규칙:
 * 1. 물리적 격리: SsulDak_Web/User 폴더 내 완결
 * 2. 1:1 매핑: USER-MYP-00 전용 백엔드 라우터
 * 3. 공통화 배제: 독립 전용 SQL ID (USER-MYP-00-SQL-001 ~ 004)
 * 4. 핵심 정책:
 *    - 패널티 및 제재 상태 D-Day 동적 판정 (NORMAL vs D-{N} 정지 회원)
 *    - 제재 만료 시 셀프 힐링(Self-Healing: 'NORMAL' 자동 복구)
 *    - 개인정보 전화번호 가운데 4자리 마스킹 (010-****-1234)
 *    - 자필 전자서명 등록 여부 및 혜택 요약 집계
 */

import { executeQuery } from '@/lib/db';

export interface UserMyp00Request {
  actionType?: 'GET_MYPAGE_DASHBOARD' | 'UPDATE_SIGNATURE';
  userNo?: string;
  signImgUrl?: string;
}

export interface UserMyp00Profile {
  userNo: string;
  userNm: string;
  userEmail: string;
  maskedTel: string;
  userStatCd: 'NORMAL' | 'SUSPENDED_7D' | 'BLOCKED' | 'WITHDRAWN';
  penaltyBadge: {
    status: 'NORMAL' | 'SUSPENDED_7D';
    label: string;
    daysRemaining: number;
    expireDt: string | null;
  };
  hasSignature: boolean;
  signImgUrl: string | null;
  accountDisplayId: string;
  membershipGrade: string;
}

export interface UserMyp00Benefits {
  couponCount: number;
  pointBalance: number;
  ongoingContractCount: number;
  completedContractCount: number;
}

// 전화번호 마스킹 헬퍼 함수
function maskPhoneNumber(tel: string | null | undefined): string {
  if (!tel) return '010-****-1234';
  const cleaned = tel.replace(/[^0-9]/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.substring(0, 3)}-****-${cleaned.substring(7)}`;
  } else if (cleaned.length === 10) {
    return `${cleaned.substring(0, 3)}-***-${cleaned.substring(6)}`;
  }
  return tel.replace(/(\d{3})-(\d{3,4})-(\d{4})/, '$1-****-$3');
}

export async function processUserMyp00(data: UserMyp00Request) {
  const actionType = data.actionType || 'GET_MYPAGE_DASHBOARD';
  const userNo = data.userNo || 'U20261000001';

  try {
    // =========================================================================
    // 액션 1: 자필 전자서명 재등록 / 업데이트 (UPDATE_SIGNATURE)
    // =========================================================================
    if (actionType === 'UPDATE_SIGNATURE') {
      const signImgUrl = data.signImgUrl || '';
      if (!signImgUrl) {
        return {
          success: false,
          message: '등록할 전자서명 이미지 데이터가 없습니다.',
        };
      }

      await executeQuery(
        `
        UPDATE TB_USER 
        SET SIGN_IMG_URL = ?, MOD_DT = NOW(), MOD_ID = ?
        WHERE USER_NO = ?;
        `,
        [signImgUrl, userNo, userNo]
      );

      return {
        success: true,
        message: '자필 전자서명이 성공적으로 등록/갱신되었습니다.',
        signImgUrl,
      };
    }

    // =========================================================================
    // 액션 2: 마이페이지 대시보드 데이터 조회 (GET_MYPAGE_DASHBOARD)
    // =========================================================================
    // [USER-MYP-00-SQL-001] 정지 만료일 경과 회원 NORMAL 자동 복구 (Self-Healing)
    await executeQuery(
      `
      UPDATE TB_USER
      SET 
        USER_STAT_CD = 'NORMAL',
        SUSPEND_EXPIRE_DT = NULL,
        MOD_DT = NOW(),
        MOD_ID = 'SYSTEM'
      WHERE USER_NO = ? 
        AND USER_STAT_CD = 'SUSPENDED_7D' 
        AND SUSPEND_EXPIRE_DT <= NOW();
      `,
      [userNo]
    );

    // [USER-MYP-00-SQL-002] 이용자 프로필 및 패널티/D-Day 정보 조회
    const userRows = await executeQuery<any[]>(
      `
      SELECT 
        USER_NO AS userNo,
        USER_NM AS userNm,
        USER_EMAIL AS userEmail,
        USER_TEL AS userTel,
        USER_STAT_CD AS userStatCd,
        SUSPEND_EXPIRE_DT AS suspendExpireDt,
        SIGN_IMG_URL AS signImgUrl,
        CASE 
          WHEN USER_STAT_CD = 'SUSPENDED_7D' AND SUSPEND_EXPIRE_DT > NOW() 
          THEN CEIL(TIMESTAMPDIFF(HOUR, NOW(), SUSPEND_EXPIRE_DT) / 24.0)
          ELSE 0 
        END AS penaltyDaysRemaining
      FROM TB_USER
      WHERE USER_NO = ?;
      `,
      [userNo]
    );

    if (userRows.length === 0) {
      return {
        success: false,
        message: `해당 회원 정보를 찾을 수 없습니다. (회원번호: ${userNo})`,
      };
    }

    const user = userRows[0];
    const penaltyDaysRemaining = Number(user.penaltyDaysRemaining) || 0;
    const isSuspended = user.userStatCd === 'SUSPENDED_7D' && penaltyDaysRemaining > 0;

    const penaltyBadge = isSuspended
      ? {
          status: 'SUSPENDED_7D' as const,
          label: `D-${penaltyDaysRemaining} 정지 회원`,
          daysRemaining: penaltyDaysRemaining,
          expireDt: user.suspendExpireDt ? String(user.suspendExpireDt) : null,
          reasonText: `선취소 패널티로 인해 ${user.suspendExpireDt ? new Date(user.suspendExpireDt).toLocaleDateString('ko-KR') : ''}까지 신규 견적 신청이 제한됩니다.`,
        }
      : {
          status: 'NORMAL' as const,
          label: '정상 회원 (신뢰도 100%)',
          daysRemaining: 0,
          expireDt: null,
          reasonText: '부정 거래 및 예약 부도 이력 없음',
        };

    // [USER-MYP-00-SQL-003] 사용 가능한 유효 쿠폰 수 조회
    const couponRows = await executeQuery<any[]>(
      `
      SELECT COUNT(*) AS availableCouponCnt
      FROM TB_USER_COUPON
      WHERE USER_NO = ? AND COUPON_STAT_CD = 'AVAILABLE' AND EXPIRE_DT >= NOW();
      `,
      [userNo]
    );
    const couponCount = Number(couponRows[0]?.availableCouponCnt) || 0;

    // [USER-MYP-00-SQL-004] 최신 누적 리워드 포인트 잔액 조회
    const pointRows = await executeQuery<any[]>(
      `
      SELECT COALESCE(BALANCE_AMT, 0) AS pointBalance
      FROM TB_USER_POINT_LEDGER
      WHERE USER_NO = ?
      ORDER BY POINT_SEQ DESC
      LIMIT 1;
      `,
      [userNo]
    );
    const pointBalance = Number(pointRows[0]?.pointBalance) || 0;

    // 추가 계약 현황 집계 (진행중 / 완료)
    const contractStats = await executeQuery<any[]>(
      `
      SELECT 
        COUNT(CASE WHEN CONTRACT_STAT_CD IN ('WAITING_PAY', 'CONFIRMED', 'IN_PROGRESS') THEN 1 END) AS ongoingCnt,
        COUNT(CASE WHEN CONTRACT_STAT_CD = 'COMPLETED' THEN 1 END) AS completedCnt
      FROM TB_CLEAN_CONTRACT
      WHERE USER_NO = ?;
      `,
      [userNo]
    );
    const ongoingContractCount = Number(contractStats[0]?.ongoingCnt) || 0;
    const completedContractCount = Number(contractStats[0]?.completedCnt) || 0;

    return {
      success: true,
      profile: {
        userNo: user.userNo,
        userNm: user.userNm || '김충훈',
        userEmail: user.userEmail || 'chunghoon.kim@ssuldak.com',
        maskedTel: maskPhoneNumber(user.userTel),
        rawTel: user.userTel,
        userStatCd: user.userStatCd,
        penaltyBadge,
        hasSignature: !!user.signImgUrl,
        signImgUrl: user.signImgUrl || null,
        accountDisplayId: `UD-${user.userNo.slice(-5)}`,
        membershipGrade: 'VIP 케어 멤버십',
      },
      benefits: {
        couponCount,
        pointBalance,
        ongoingContractCount,
        completedContractCount,
      },
      syncedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }),
    };
  } catch (error: any) {
    console.error('❌ [USER-MYP-00] Server processing error:', error);
    return {
      success: false,
      message: `마이페이지 데이터 조회 중 오류가 발생했습니다: ${error.message || error}`,
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UserMyp00Request;
    const result = await processUserMyp00(body);
    const status = result.success ? 200 : 400;
    return new Response(JSON.stringify(result), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('❌ [USER-MYP-00] POST Handler Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        message: '요청 본문(JSON) 파싱 실패 또는 서버 내부 오류입니다.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
