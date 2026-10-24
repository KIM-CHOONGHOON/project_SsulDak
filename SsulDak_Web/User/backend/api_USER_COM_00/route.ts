/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 개발 명세
 * 화면 ID: USER-COM-00 (이용자 메인 홈/허브)
 * 백엔드 모듈 경로: SsulDak_Web/User/backend/api_USER_COM_00/route.ts
 * 엔드포인트 URL: POST /api/user/user_com_00
 * 전용 쿼리 식별자:
 *   - USER-COM-00-SQL-001 (서비스 카테고리 및 메인 마스터 코드 조회)
 *   - USER-COM-00-SQL-002 (로그인 이용자 요약 및 패널티/포인트 상태 조회)
 *   - USER-COM-00-SQL-003 (진행 중인 청소 요청 및 체결 계약 카운트 조회)
 *
 * [회원 식별자 12자리 고정 규격: CHAR(12)]
 *   - 1바이트: 역할 코드 ('U': 사용자, 'P': 파트너, 'A': 관리자)
 *   - 6바이트: 가입 년월 (YYYYMM)
 *   - 5바이트: 일련번호 (00001~, 1부터 시작하되 앞자리를 '0'으로 채운 5바이트)
 *   - 총 12바이트 필수 충족 (예: U20261000001)
 * =============================================================================
 */

import { executeQuery } from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

// =============================================================================
// 회원 식별자 규격 상수 및 유효성 검증 함수
// =============================================================================

export const MEMBER_NO_TOTAL_LENGTH = 12;
export const USER_NO_REGEX = /^U(20\d{2})(0[1-9]|1[0-2])(\d{5})$/;
export const MEMBER_NO_REGEX = /^[UPA](20\d{2})(0[1-9]|1[0-2])(\d{5})$/;

/**
 * 회원 식별자 12바이트 신규 채번 함수
 * @param role 역할 식별자 ('U': 사용자, 'P': 파트너, 'A': 관리자)
 * @param yearMonth YYYYMM 형식 6자리 문자열 또는 Date 객체
 * @param sequence 1부터 시작하는 정수 순번
 * @returns 정확히 12바이트 식별자 (예: U20261000001)
 */
export function generateMemberNo(
  role: 'U' | 'P' | 'A',
  yearMonth: string | Date,
  sequence: number
): string {
  const ym =
    typeof yearMonth === 'string'
      ? yearMonth.replace(/\D/g, '').slice(0, 6)
      : `${yearMonth.getFullYear()}${String(yearMonth.getMonth() + 1).padStart(2, '0')}`;

  if (ym.length !== 6) {
    throw new Error('가입 년월은 반드시 6자리(YYYYMM)여야 합니다.');
  }

  if (sequence < 1 || sequence > 99999) {
    throw new Error('일련번호는 1 이상 99999 이하의 숫자여야 합니다.');
  }

  const paddedSeq = String(sequence).padStart(5, '0');
  const memberNo = `${role}${ym}${paddedSeq}`;

  if (memberNo.length !== MEMBER_NO_TOTAL_LENGTH) {
    throw new Error(
      `회원 식별자는 반드시 12바이트여야 합니다. (현재 길이: ${memberNo.length})`
    );
  }

  return memberNo;
}

/**
 * 이용자 회원 식별자(userNo) 12바이트 유효성 검증 함수
 */
export function validateUserNo(userNo: unknown): { isValid: boolean; message?: string } {
  // 게스트(비로그인)는 통과
  if (userNo === null || userNo === undefined || userNo === '') {
    return { isValid: true };
  }

  if (typeof userNo !== 'string') {
    return {
      isValid: false,
      message: '회원 식별자는 문자열 형식이어야 합니다.',
    };
  }

  const trimmed = userNo.trim();

  // 1. 전체 길이 12바이트 검증
  if (trimmed.length !== MEMBER_NO_TOTAL_LENGTH) {
    return {
      isValid: false,
      message: `회원 식별자는 반드시 12자리 고정 규격이어야 합니다. (입력값: '${trimmed}', 현재: ${trimmed.length}자리)`,
    };
  }

  // 2. 역할 코드 1바이트 ('U': 사용자) 검증
  if (!trimmed.startsWith('U')) {
    return {
      isValid: false,
      message: `이용자 회원 식별자는 반드시 'U'로 시작해야 합니다. ('U': 사용자, 'P': 파트너, 'A': 관리자)`,
    };
  }

  // 3. YYYYMM(6자리) + 일련번호(5자리 제로패딩 00001~) 정규식 검증
  if (!USER_NO_REGEX.test(trimmed)) {
    return {
      isValid: false,
      message: `회원 식별자 형식이 올바르지 않습니다. (규격: 'U' + 가입년월 YYYYMM 6자리 + 순번 5자리(00001~), 예: U20261000001)`,
    };
  }

  return { isValid: true };
}

// =============================================================================
// TypeScript 타입 인터페이스 정의
// =============================================================================

export interface MainCategoryCode extends RowDataPacket {
  GRP_CD: string;
  COM_CD: string;
  COM_NM: string;
  ATTR_VAL_1: string | null;
  ATTR_VAL_2: string | null;
  SORT_ORD: number;
}

export interface UserInfoRow extends RowDataPacket {
  USER_NO: string;
  USER_NM: string;
  USER_STAT_CD: string;
  SUSPEND_EXPIRE_DT: string | null;
  POINT_BALANCE: number;
  COUPON_COUNT: number;
}

export interface CleanReqSummaryRow extends RowDataPacket {
  OPEN_REQ_CNT: number;
  PARTIAL_CNT: number;
  ACTIVE_CONTRACT_CNT: number;
}

export interface UserSummaryData {
  categories: MainCategoryCode[];
  banners: MainCategoryCode[];
  userInfo: {
    userNo: string; // 12자리 고정 규격 (CHAR(12))
    userNm: string;
    userStatCd: string;
    suspendExpireDt: string | null;
    pointBalance: number;
    couponCount: number;
  } | null;
  summary: {
    openReqCnt: number;
    activeContractCnt: number;
  } | null;
}

export interface UserSummaryResponse {
  success: boolean;
  message?: string;
  data?: UserSummaryData;
}

export interface RequestPayload {
  userNo?: string | null; // 12자리 고정 규격 (예: U20261000001) 또는 게스트 시 null
  reqType?: 'INIT' | string;
}

// =============================================================================
// 비즈니스 로직 처리 함수 (핸들러)
// =============================================================================

export async function processUserCom00(payload: RequestPayload): Promise<UserSummaryResponse> {
  const { userNo } = payload;

  // 회원 식별자가 전달된 경우 12바이트 엄격 검증 수행
  if (userNo !== null && userNo !== undefined && userNo !== '') {
    const val = validateUserNo(userNo);
    if (!val.isValid) {
      throw new Error(val.message);
    }
  }

  // [USER-COM-00-SQL-001] 서비스 카테고리 및 메인 마스터 코드 조회
  const rawCodes = await executeQuery<MainCategoryCode[]>(
    `/* USER-COM-00-SQL-001 */
     SELECT GRP_CD, COM_CD, COM_NM, ATTR_VAL_1, ATTR_VAL_2, SORT_ORD
     FROM TB_COM_CODE
     WHERE GRP_CD IN ('CLEAN_MAIN_SERVICE', 'MAIN_BANNER') AND USE_YN = 'Y'
     ORDER BY GRP_CD ASC, SORT_ORD ASC;`
  );

  const categories = rawCodes.filter((c) => c.GRP_CD === 'CLEAN_MAIN_SERVICE');
  const banners = rawCodes.filter((c) => c.GRP_CD === 'MAIN_BANNER');

  // 비로그인(게스트) 상태일 때는 공통 카테고리 및 배너만 안전하게 반환
  if (!userNo || typeof userNo !== 'string' || userNo.trim() === '') {
    return {
      success: true,
      data: {
        categories,
        banners,
        userInfo: null,
        summary: null,
      },
    };
  }

  const trimmedUserNo = userNo.trim();

  // [USER-COM-00-SQL-002] 로그인 이용자 요약 및 패널티/포인트 상태 조회
  const userRows = await executeQuery<UserInfoRow[]>(
    `/* USER-COM-00-SQL-002 */
     SELECT 
       u.USER_NO, u.USER_NM, u.USER_STAT_CD, u.SUSPEND_EXPIRE_DT,
       COALESCE((SELECT p.BALANCE_AMT FROM TB_USER_POINT_LEDGER p WHERE p.USER_NO = u.USER_NO ORDER BY p.POINT_SEQ DESC LIMIT 1), 0) AS POINT_BALANCE,
       (SELECT COUNT(*) FROM TB_USER_COUPON c WHERE c.USER_NO = u.USER_NO AND c.COUPON_STAT_CD = 'AVAILABLE' AND c.EXPIRE_DT >= NOW()) AS COUPON_COUNT
     FROM TB_USER u
     WHERE u.USER_NO = ?;`,
    [trimmedUserNo]
  );

  if (userRows.length === 0) {
    // 12자리 규격은 맞으나 DB에 미등록된 회원일 경우
    return {
      success: true,
      data: {
        categories,
        banners,
        userInfo: null,
        summary: null,
      },
    };
  }

  const u = userRows[0];

  // [USER-COM-00-SQL-003] 진행 중인 청소 요청 및 체결 계약 카운트 조회
  const summaryRows = await executeQuery<CleanReqSummaryRow[]>(
    `/* USER-COM-00-SQL-003 */
     SELECT 
       COUNT(CASE WHEN REQ_STAT_CD = 'OPEN' THEN 1 END) AS OPEN_REQ_CNT,
       COUNT(CASE WHEN REQ_STAT_CD = 'PARTIAL_CONTRACTED' THEN 1 END) AS PARTIAL_CNT,
       (SELECT COUNT(*) FROM TB_CLEAN_CONTRACT cnt WHERE cnt.USER_NO = ? AND cnt.CONTRACT_STAT_CD IN ('WAITING_PAY', 'CONFIRMED', 'IN_PROGRESS')) AS ACTIVE_CONTRACT_CNT
     FROM TB_CLEAN_REQ
     WHERE USER_NO = ? AND REQ_STAT_CD IN ('OPEN', 'PARTIAL_CONTRACTED');`,
    [trimmedUserNo, trimmedUserNo]
  );

  const s = summaryRows[0] || { OPEN_REQ_CNT: 0, PARTIAL_CNT: 0, ACTIVE_CONTRACT_CNT: 0 };
  const totalOpenReqCnt = Number(s.OPEN_REQ_CNT || 0) + Number(s.PARTIAL_CNT || 0);

  return {
    success: true,
    data: {
      categories,
      banners,
      userInfo: {
        userNo: u.USER_NO, // 12자리 고정 규격 보장
        userNm: u.USER_NM,
        userStatCd: u.USER_STAT_CD,
        suspendExpireDt: u.SUSPEND_EXPIRE_DT,
        pointBalance: Number(u.POINT_BALANCE || 0),
        couponCount: Number(u.COUPON_COUNT || 0),
      },
      summary: {
        openReqCnt: totalOpenReqCnt,
        activeContractCnt: Number(s.ACTIVE_CONTRACT_CNT || 0),
      },
    },
  };
}

// =============================================================================
// Next.js App Router Route Handler (POST /api/user/user_com_00)
// =============================================================================

export async function POST(req: Request): Promise<Response> {
  try {
    let payload: RequestPayload = { reqType: 'INIT' };

    try {
      const body = await req.json();
      if (body && typeof body === 'object') {
        payload = body;
      }
    } catch {
      // Body가 없거나 비어있는 경우 기본 INIT 처리
    }

    // 회원 식별자 12자리 유효성 사전 검사
    if (payload.userNo !== null && payload.userNo !== undefined && payload.userNo !== '') {
      const val = validateUserNo(payload.userNo);
      if (!val.isValid) {
        return Response.json(
          {
            success: false,
            message: val.message,
          },
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
            },
          }
        );
      }
    }

    const result = await processUserCom00(payload);
    return Response.json(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ [USER-COM-00] API 오류:', err.message);
    return Response.json(
      {
        success: false,
        message: err.message || '서버 내부 오류가 발생했습니다.',
      },
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  }
}

export default POST;
