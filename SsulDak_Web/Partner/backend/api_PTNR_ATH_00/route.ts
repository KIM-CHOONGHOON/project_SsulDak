/**
 * SsulDak (쓸고닦고) - PTNR-ATH-00 (파트너 로그인) 백엔드 라우터
 * 
 * 물리적 격리: SsulDak_Web/Partner/backend/api_PTNR_ATH_00/route.ts
 * 엔드포인트 URL: POST /api/partner/ptnr_ath_00
 * DB 연동: @/lib/db (MySQL 8.0, InnoDB)
 * 독립 전용 SQL: PTNR-ATH-00-SQL-001 ~ PTNR-ATH-00-SQL-003
 */

import crypto from 'crypto';
import { executeQuery } from '@/lib/db';

export interface PartnerLoginResult {
  status: number;
  data: {
    success: boolean;
    code?: string;
    message: string;
    token?: string;
    rejectReason?: string;
    partner?: {
      ptnrNo: string;
      ptnrEmail: string;
      companyNm: string;
      ceoNm: string;
      bizRegNo: string;
      hasInsurance: boolean;
    };
  };
}

/**
 * 비밀번호 단방향 PBKDF2 해싱 및 검증
 */
function verifyPassword(inputPassword: string, salt: string, storedHash: string): boolean {
  try {
    const computed = crypto.pbkdf2Sync(inputPassword, salt, 10000, 64, 'sha512').toString('hex');
    return computed === storedHash;
  } catch (err) {
    return false;
  }
}

/**
 * 파트너 전용 JWT 토큰 생성 (표준 서명)
 */
function createPartnerJwt(payload: any): string {
  const secret = process.env.JWT_SECRET || 'ssuldak_partner_secret_2026';
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60 * 24 * 7; // 7일

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify({ ...payload, iat: now, exp })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * PTNR-ATH-00 비즈니스 로직 처리기
 */
export async function processPtnrAth00(body: any, clientIp: string = '127.0.0.1', userAgent: string = 'Web/Console'): Promise<PartnerLoginResult> {
  const {
    actionType = 'LOGIN',
    ptnrEmail,
    ptnrPassword,
    roleType = 'business'
  } = body || {};

  try {
    if (actionType === 'KAKAO_BIZ_LOGIN') {
      return {
        status: 200,
        data: {
          success: true,
          message: '카카오 비즈니스 계정 동기화 인증이 완료되었습니다.'
        }
      };
    }

    const email = String(ptnrEmail || '').trim();
    const password = String(ptnrPassword || '').trim();

    if (!email || !password) {
      return {
        status: 400,
        data: {
          success: false,
          code: 'INVALID_INPUT',
          message: '이메일(아이디)과 비밀번호를 모두 입력해 주세요.'
        }
      };
    }

    // PTNR-ATH-00-SQL-001: 파트너 계정 정보 조회
    const ptnrRows: any = await executeQuery(`
      /* PTNR-ATH-00-SQL-001 */
      SELECT 
        PTNR_NO AS ptnrNo,
        PTNR_EMAIL AS ptnrEmail,
        PTNR_PWD_HASH AS ptnrPwdHash,
        PWD_SALT AS pwdSalt,
        COMPANY_NM AS companyNm,
        CEO_NM AS ceoNm,
        COALESCE(BIZ_REG_NO, BIZ_NO) AS bizRegNo,
        COALESCE(PARTNER_APR_STAT_CD, APR_STAT_CD) AS aprStatCd,
        REJECT_REASON AS rejectReason,
        HAS_INSURANCE_YN AS hasInsuranceYn
      FROM TB_PARTNER
      WHERE PTNR_EMAIL = ?;
    `, [email]);

    // 계정이 없거나 삭제된 경우
    if (!ptnrRows || ptnrRows.length === 0) {
      // PTNR-ATH-00-SQL-003: 실패 로그 적재
      await executeQuery(`
        /* PTNR-ATH-00-SQL-003 */
        INSERT INTO TB_PARTNER_LOGIN_LOG (
          PTNR_NO, LOGIN_IP, USER_AGENT, LOGIN_STAT_CD, REG_DT
        ) VALUES (
          NULL, ?, ?, 'FAIL_PWD', NOW()
        );
      `, [clientIp, userAgent]);

      return {
        status: 401,
        data: {
          success: false,
          code: 'AUTH_FAILED',
          message: '등록되지 않은 사업자 이메일이거나 비밀번호가 일치하지 않습니다.'
        }
      };
    }

    const partner = ptnrRows[0];

    // 비밀번호 검증
    const isPasswordValid = verifyPassword(password, partner.pwdSalt || '', partner.ptnrPwdHash || '');
    if (!isPasswordValid) {
      // 실패 로그 적재
      await executeQuery(`
        /* PTNR-ATH-00-SQL-003 */
        INSERT INTO TB_PARTNER_LOGIN_LOG (
          PTNR_NO, LOGIN_IP, USER_AGENT, LOGIN_STAT_CD, REG_DT
        ) VALUES (
          ?, ?, ?, 'FAIL_PWD', NOW()
        );
      `, [partner.ptnrNo, clientIp, userAgent]);

      return {
        status: 401,
        data: {
          success: false,
          code: 'AUTH_FAILED',
          message: '등록되지 않은 사업자 이메일이거나 비밀번호가 일치하지 않습니다.'
        }
      };
    }

    // -------------------------------------------------------------
    // 파트너 계정 심사 상태(PARTNER_APR_STAT_CD) 비즈니스 룰 판정
    // -------------------------------------------------------------
    const aprStatus = partner.aprStatCd || 'APPROVED';

    // 1) 서류 심사 대기 중 (PENDING)
    if (aprStatus === 'PENDING') {
      await executeQuery(`
        /* PTNR-ATH-00-SQL-003 */
        INSERT INTO TB_PARTNER_LOGIN_LOG (
          PTNR_NO, LOGIN_IP, USER_AGENT, LOGIN_STAT_CD, REG_DT
        ) VALUES (
          ?, ?, ?, 'BLOCKED_PENDING', NOW()
        );
      `, [partner.ptnrNo, clientIp, userAgent]);

      return {
        status: 403,
        data: {
          success: false,
          code: 'APPROVAL_PENDING',
          message: '사업자등록증 및 배상보험 서류 심사가 진행 중입니다. (영업일 기준 24시간 이내 승인 완료)'
        }
      };
    }

    // 2) 심사 반려 (REJECTED)
    if (aprStatus === 'REJECTED') {
      await executeQuery(`
        /* PTNR-ATH-00-SQL-003 */
        INSERT INTO TB_PARTNER_LOGIN_LOG (
          PTNR_NO, LOGIN_IP, USER_AGENT, LOGIN_STAT_CD, REG_DT
        ) VALUES (
          ?, ?, ?, 'BLOCKED_REJECT', NOW()
        );
      `, [partner.ptnrNo, clientIp, userAgent]);

      const reason = partner.rejectReason || '제출하신 서류의 유효기간 만료 또는 식별 불가';
      return {
        status: 403,
        data: {
          success: false,
          code: 'APPROVAL_REJECTED',
          rejectReason: reason,
          message: `입점 심사가 반려되었습니다. 사유: ${reason}`
        }
      };
    }

    // 3) 선취소 패널티 제재 (SUSPENDED_7D)
    if (aprStatus === 'SUSPENDED_7D' || aprStatus === 'SUSPENDED') {
      await executeQuery(`
        /* PTNR-ATH-00-SQL-003 */
        INSERT INTO TB_PARTNER_LOGIN_LOG (
          PTNR_NO, LOGIN_IP, USER_AGENT, LOGIN_STAT_CD, REG_DT
        ) VALUES (
          ?, ?, ?, 'BLOCKED_SUSPENDED', NOW()
        );
      `, [partner.ptnrNo, clientIp, userAgent]);

      return {
        status: 403,
        data: {
          success: false,
          code: 'SUSPENDED',
          message: '선취소 패널티로 인해 계정 이용이 제한되어 있습니다. 고객센터(1588-0000)로 문의해 주세요.'
        }
      };
    }

    // 4) 정상 승인 (APPROVED) -> 로그인 성공
    const token = createPartnerJwt({
      ptnrNo: partner.ptnrNo,
      ptnrEmail: partner.ptnrEmail,
      companyNm: partner.companyNm,
      role: 'PARTNER'
    });

    // PTNR-ATH-00-SQL-002: 최근 접속 일시 갱신
    await executeQuery(`
      /* PTNR-ATH-00-SQL-002 */
      UPDATE TB_PARTNER
      SET 
        LAST_LOGIN_DT = NOW(),
        MOD_DT = NOW(),
        MOD_ID = ?
      WHERE PTNR_NO = ?;
    `, [partner.ptnrNo, partner.ptnrNo]);

    // PTNR-ATH-00-SQL-003: 접속 로그 적재
    await executeQuery(`
      /* PTNR-ATH-00-SQL-003 */
      INSERT INTO TB_PARTNER_LOGIN_LOG (
        PTNR_NO, LOGIN_IP, USER_AGENT, LOGIN_STAT_CD, REG_DT
      ) VALUES (
        ?, ?, ?, 'SUCCESS', NOW()
      );
    `, [partner.ptnrNo, clientIp, userAgent]);

    return {
      status: 200,
      data: {
        success: true,
        token,
        partner: {
          ptnrNo: partner.ptnrNo,
          ptnrEmail: partner.ptnrEmail,
          companyNm: partner.companyNm,
          ceoNm: partner.ceoNm || partner.companyNm,
          bizRegNo: partner.bizRegNo || '',
          hasInsurance: partner.hasInsuranceYn === 'Y'
        },
        message: '로그인에 성공하였습니다. 파트너 대시보드로 이동합니다.'
      }
    };
  } catch (error: any) {
    console.error('PTNR-ATH-00 Route Error:', error);
    return {
      status: 500,
      data: {
        success: false,
        code: 'SERVER_ERROR',
        message: error.message || '서버 오류가 발생했습니다.'
      }
    };
  }
}

/**
 * Next.js App Router POST 핸들러
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Next.js App';
    const result = await processPtnrAth00(body, clientIp, userAgent);
    return new Response(JSON.stringify(result.data), {
      status: result.status,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
