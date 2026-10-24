/**
 * =============================================================================
 * SsulDak (쓸고닦고) 전용 백엔드 라우터 및 서비스
 * 화면 ID: USER-ATH-01 (이용자 회원가입 및 서명등록)
 * 파일 경로: SsulDak_Web/User/backend/api_USER_ATH_01/route.ts
 * API 엔드포인트 URL: POST /api/user/user_ath_01
 * 전용 쿼리 식별자:
 *   - USER-ATH-01-SQL-001 (이메일 중복 확인)
 *   - USER-ATH-01-SQL-002 (당월 기준 12자리 이용자 ID 최댓값 조회 및 락 채번)
 *   - USER-ATH-01-SQL-003 (신규 이용자 마스터 등록: TB_USER INSERT)
 *   - USER-ATH-01-SQL-004 (추천인 코드 유효성 검증 및 추천 실적 갱신)
 *   - USER-ATH-01-SQL-005 (신규 가입 웰컴 프로모션 캠페인 조회)
 *   - USER-ATH-01-SQL-006 (신규 이용자 웰컴 쿠폰 자동 발급)
 *
 * [회원 식별자 12자리 고정 규격: CHAR(12)]
 *   - 1바이트: 역할 코드 ('U': 사용자, 'P': 파트너, 'A': 관리자)
 *   - 6바이트: 가입 년월 (YYYYMM)
 *   - 5바이트: 일련번호 (00001~, 1부터 시작하되 앞자리를 '0'으로 채운 5바이트)
 *   - 예: U20261000001
 * =============================================================================
 */

import { executeQuery, executeTransaction } from '../../../../lib/db';
import crypto from 'crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// =============================================================================
// 인터페이스 정의
// =============================================================================

export interface UserAth01RequestBody {
  actionType: 'CHECK_EMAIL' | 'CHECK_REFERRAL' | 'REGISTER';
  userEmail?: string;
  userPassword?: string;
  userNm?: string;
  userTel?: string;
  signImgBase64?: string;
  recommenderCode?: string;
  mktAgreeYn?: 'Y' | 'N';
  joinPathCd?: 'DIRECT' | 'KAKAO' | 'NAVER' | 'GOOGLE';
}

export interface UserAth01ResponseData {
  success: boolean;
  message: string;
  code?: string;
  isAvailable?: boolean;
  userNo?: string;
  userNm?: string;
  welcomeCouponIssued?: boolean;
  couponInfo?: {
    couponNo: string;
    discountAmt: number;
    expireDt: string;
  };
}

// =============================================================================
// 비밀번호 단방향 해싱 유틸리티 (crypto pbkdf2)
// =============================================================================

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

// =============================================================================
// 쿠폰 발급 번호 및 고유 시리얼 생성 헬퍼
// =============================================================================

function generateCouponIssueNo(): string {
  const now = new Date();
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random5 = Math.floor(10000 + Math.random() * 90000).toString();
  return `UCP${yyyymmdd}${random5}`;
}

function generateCouponSerial(): string {
  const randPart = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `SSUL-${randPart.slice(0, 4)}-${randPart.slice(4, 8)}-WELCOME`;
}

// =============================================================================
// 핵심 비즈니스 로직 프로세서 (독립 분리)
// =============================================================================

export async function processUserAth01(body: UserAth01RequestBody): Promise<{
  status: number;
  data: UserAth01ResponseData;
}> {
  const { actionType } = body;

  // ---------------------------------------------------------------------------
  // [Case 1] 이메일 중복 확인 (CHECK_EMAIL)
  // ---------------------------------------------------------------------------
  if (actionType === 'CHECK_EMAIL') {
    const email = body.userEmail?.trim();
    if (!email) {
      return {
        status: 400,
        data: {
          success: false,
          code: 'EMAIL_REQUIRED',
          message: '확인할 이메일 주소를 입력해 주세요.',
        },
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        status: 400,
        data: {
          success: false,
          code: 'INVALID_EMAIL_FORMAT',
          message: '올바른 이메일 형식이 아닙니다.',
        },
      };
    }

    /* USER-ATH-01-SQL-001 (이메일 중복 확인) */
    const countRows = await executeQuery<RowDataPacket[]>(
      `/* USER-ATH-01-SQL-001 */
       SELECT COUNT(*) AS CNT 
       FROM TB_USER 
       WHERE USER_EMAIL = ?;`,
      [email]
    );

    const exists = (countRows[0]?.CNT || 0) > 0;
    if (exists) {
      return {
        status: 200,
        data: {
          success: true,
          isAvailable: false,
          message: '이미 등록된 이메일 계정입니다. 다른 이메일을 입력해 주세요.',
        },
      };
    }

    return {
      status: 200,
      data: {
        success: true,
        isAvailable: true,
        message: '사용 가능한 이메일 계정입니다.',
      },
    };
  }

  // ---------------------------------------------------------------------------
  // [Case 2] 추천인 코드 유효성 확인 (CHECK_REFERRAL)
  // ---------------------------------------------------------------------------
  if (actionType === 'CHECK_REFERRAL') {
    const refCode = body.recommenderCode?.trim().toUpperCase();
    if (!refCode) {
      return {
        status: 400,
        data: {
          success: false,
          code: 'CODE_REQUIRED',
          message: '추천인 코드를 입력해 주세요.',
        },
      };
    }

    const salesRows = await executeQuery<RowDataPacket[]>(
      `SELECT REFERRAL_CODE, SALES_NM, SALES_STAT_CD 
       FROM TB_SALES_MEMBER 
       WHERE REFERRAL_CODE = ? AND SALES_STAT_CD = 'ACTIVE';`,
      [refCode]
    );

    if (salesRows.length === 0) {
      return {
        status: 200,
        data: {
          success: true,
          isAvailable: false,
          message: '유효하지 않거나 비활성화된 추천인 코드입니다.',
        },
      };
    }

    return {
      status: 200,
      data: {
        success: true,
        isAvailable: true,
        message: `추천인 [${salesRows[0].SALES_NM}] 코드가 확인되었습니다 (+5,000P 적립 혜택).`,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // [Case 3] 신규 이용자 회원가입 및 서명등록 (REGISTER)
  // ---------------------------------------------------------------------------
  if (actionType === 'REGISTER') {
    const {
      userEmail,
      userPassword,
      userNm,
      userTel,
      signImgBase64,
      recommenderCode,
      mktAgreeYn = 'N',
      joinPathCd = 'DIRECT',
    } = body;

    // 1) 필수값 검증
    if (!userEmail?.trim()) {
      return {
        status: 400,
        data: { success: false, code: 'EMAIL_REQUIRED', message: '이메일 주소를 입력해 주세요.' },
      };
    }
    if (!userPassword || userPassword.length < 8) {
      return {
        status: 400,
        data: {
          success: false,
          code: 'PASSWORD_WEAK',
          message: '비밀번호는 영문, 숫자, 특수문자를 포함하여 8자리 이상이어야 합니다.',
        },
      };
    }
    if (!userNm?.trim()) {
      return {
        status: 400,
        data: { success: false, code: 'NAME_REQUIRED', message: '이용자 실명을 입력해 주세요.' },
      };
    }
    if (!userTel?.trim()) {
      return {
        status: 400,
        data: { success: false, code: 'TEL_REQUIRED', message: '휴대폰 번호를 입력해 주세요.' },
      };
    }
    if (!signImgBase64?.trim() || !signImgBase64.startsWith('data:image')) {
      return {
        status: 400,
        data: {
          success: false,
          code: 'SIGNATURE_REQUIRED',
          message: '청소 계약 및 거래 보증을 위해 본인 자필 전자서명을 반드시 작성해 주세요.',
        },
      };
    }

    // 2) 이메일 중복 2차 방어 검증
    const dupCheck = await executeQuery<RowDataPacket[]>(
      `/* USER-ATH-01-SQL-001 */
       SELECT COUNT(*) AS CNT FROM TB_USER WHERE USER_EMAIL = ?;`,
      [userEmail.trim()]
    );
    if ((dupCheck[0]?.CNT || 0) > 0) {
      return {
        status: 409,
        data: {
          success: false,
          code: 'EMAIL_DUPLICATE',
          message: '이미 가입된 이메일 계정입니다. 로그인을 진행해 주세요.',
        },
      };
    }

    // 3) 비밀번호 해싱 및 솔트 생성
    const { hash: userPwdHash, salt: pwdSalt } = hashPassword(userPassword);

    // 4) 트랜잭션 내에서 12자리 USER_NO 채번 및 TB_USER, TB_SALES_MEMBER, TB_USER_COUPON 처리
    const transactionResult = await executeTransaction(async (conn) => {
      // 4-1) 당월 기준 12자리 이용자 ID 최댓값 조회 및 락 채번 (USER-ATH-01-SQL-002)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const yearMonth = `${year}${month}`; // 예: '202610'
      const prefix = `U${yearMonth}`; // 예: 'U202610'

      const [maxRows] = await conn.execute<RowDataPacket[]>(
        `/* USER-ATH-01-SQL-002 */
         SELECT MAX(USER_NO) AS MAX_USER_NO
         FROM TB_USER
         WHERE USER_NO LIKE CONCAT(?, '%')
         FOR UPDATE;`,
        [prefix]
      );

      let nextSeq = 1;
      const currentMaxNo = maxRows[0]?.MAX_USER_NO;
      if (currentMaxNo && currentMaxNo.length === 12) {
        const seqPart = parseInt(currentMaxNo.slice(7), 10);
        if (!isNaN(seqPart)) {
          nextSeq = seqPart + 1;
        }
      }

      const seqStr = String(nextSeq).padStart(5, '0');
      const newGeneratedUserNo = `${prefix}${seqStr}`; // 정확히 12바이트 (U + 202610 + 00001)

      // 4-2) 신규 이용자 마스터 등록 (USER-ATH-01-SQL-003)
      await conn.execute<ResultSetHeader>(
        `/* USER-ATH-01-SQL-003 */
         INSERT INTO TB_USER (
           USER_NO, USER_EMAIL, USER_PWD_HASH, PWD_SALT, USER_NM, USER_TEL,
           SIGN_IMG_URL, JOIN_PATH_CD, RECOMMENDER_CODE, USER_STAT_CD,
           CANCEL_ACCUM_CNT, MKT_AGREE_YN, LAST_LOGIN_DT, REG_DT, REG_ID, MOD_DT, MOD_ID
         ) VALUES (
           ?, ?, ?, ?, ?, ?,
           ?, ?, ?, 'NORMAL',
           0, ?, NOW(), NOW(), ?, NOW(), ?
         );`,
        [
          newGeneratedUserNo,
          userEmail.trim(),
          userPwdHash,
          pwdSalt,
          userNm.trim(),
          userTel.trim(),
          signImgBase64,
          joinPathCd,
          recommenderCode?.trim().toUpperCase() || null,
          mktAgreeYn === 'Y' ? 'Y' : 'N',
          newGeneratedUserNo, // 감사 추적 REG_ID: 본인 채번 식별자
          newGeneratedUserNo, // 감사 추적 MOD_ID: 본인 채번 식별자
        ]
      );

      // 4-3) 추천인 코드 유효성 검증 및 추천 실적 갱신 (USER-ATH-01-SQL-004)
      if (recommenderCode && recommenderCode.trim().length > 0) {
        await conn.execute<ResultSetHeader>(
          `/* USER-ATH-01-SQL-004 */
           UPDATE TB_SALES_MEMBER 
           SET 
             TOTAL_RECRUIT_CNT = TOTAL_RECRUIT_CNT + 1,
             MOD_DT = NOW(),
             MOD_ID = ?
           WHERE REFERRAL_CODE = ? AND SALES_STAT_CD = 'ACTIVE';`,
          [newGeneratedUserNo, recommenderCode.trim().toUpperCase()]
        );
      }

      // 4-4) 신규 가입 웰컴 프로모션 캠페인 조회 (USER-ATH-01-SQL-005)
      const [campaignRows] = await conn.execute<RowDataPacket[]>(
        `/* USER-ATH-01-SQL-005 */
         SELECT CAMPAIGN_NO, CAMPAIGN_NM, DISCOUNT_AMT, VALID_DAYS
         FROM TB_PROMO_CAMPAIGN
         WHERE TARGET_ROLE_CD IN ('USER', 'ALL') 
           AND IS_ACTIVE_YN = 'Y' 
           AND NOW() BETWEEN START_DT AND END_DT
         ORDER BY REG_DT DESC 
         LIMIT 1;`
      );

      let couponIssued = false;
      let couponInfoObj: any = null;

      if (campaignRows.length > 0) {
        const campaign = campaignRows[0];
        const couponIssueNo = generateCouponIssueNo();
        const couponSerial = generateCouponSerial();
        const validDays = Number(campaign.VALID_DAYS) || 30;
        const discountAmt = Number(campaign.DISCOUNT_AMT) || 5000;

        // 4-5) 신규 이용자 웰컴 쿠폰 자동 발급 (USER-ATH-01-SQL-006)
        await conn.execute<ResultSetHeader>(
          `/* USER-ATH-01-SQL-006 */
           INSERT INTO TB_USER_COUPON (
             COUPON_ISSUE_NO, USER_NO, CAMPAIGN_ID, COUPON_SERIAL_CD, COUPON_NM,
             DISCOUNT_AMT, COUPON_STAT_CD, EXPIRE_DT, REG_DT, REG_ID, MOD_DT, MOD_ID
           ) VALUES (
             ?, ?, ?, ?, ?,
             ?, 'AVAILABLE', DATE_ADD(NOW(), INTERVAL ? DAY), NOW(), 'SYSTEM', NOW(), 'SYSTEM'
           );`,
          [
            couponIssueNo,
            newGeneratedUserNo,
            campaign.CAMPAIGN_NO,
            couponSerial,
            campaign.CAMPAIGN_NM || '신규가입 웰컴 5,000원 할인 쿠폰',
            discountAmt,
            validDays,
          ]
        );

        couponIssued = true;
        couponInfoObj = {
          couponNo: couponIssueNo,
          discountAmt,
          expireDt: `${validDays}일 이내`,
        };
      }

      return {
        userNo: newGeneratedUserNo,
        userNm: userNm.trim(),
        welcomeCouponIssued: couponIssued,
        couponInfo: couponInfoObj,
      };
    });

    return {
      status: 201,
      data: {
        success: true,
        message: '회원가입이 성공적으로 완료되었습니다! 웰컴 5,000원 쿠폰이 자동 지급되었습니다.',
        userNo: transactionResult.userNo,
        userNm: transactionResult.userNm,
        welcomeCouponIssued: transactionResult.welcomeCouponIssued,
        couponInfo: transactionResult.couponInfo,
      },
    };
  }

  return {
    status: 400,
    data: {
      success: false,
      code: 'INVALID_ACTION_TYPE',
      message: '지원하지 않는 요청 구분(actionType)입니다.',
    },
  };
}

// =============================================================================
// Next.js App Router 표준 라우터 핸들러 (POST)
// =============================================================================

export async function POST(req: Request) {
  try {
    const body: UserAth01RequestBody = await req.json();
    const { status, data } = await processUserAth01(body);
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ [api_USER_ATH_01] Internal Server Error:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || '회원가입 처리 중 서버 내부 오류가 발생했습니다.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
