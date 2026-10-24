/**
 * =============================================================================
 * SsulDak (쓸고닦고) 전용 백엔드 라우터 및 서비스
 * 화면 ID: USER-ATH-02 (계정 찾기 및 비밀번호 재설정)
 * 파일 경로: SsulDak_Web/User/backend/api_USER_ATH_02/route.ts
 * API 엔드포인트 URL: POST /api/user/user_ath_02
 * 전용 쿼리 식별자:
 *   - USER-ATH-02-SQL-001 (이름과 휴대폰 번호로 등록 이메일 마스킹 조회)
 *   - USER-ATH-02-SQL-002 (이메일과 휴대폰 번호 일치 검증 및 회원 식별자 조회)
 *   - USER-ATH-02-SQL-003 (비밀번호 재설정 인증번호 저장: TB_SMS_AUTH_LOG INSERT)
 *   - USER-ATH-02-SQL-004 (유효한 3분 이내 인증번호 검증)
 *   - USER-ATH-02-SQL-005 (인증 완료 처리: VERIFY_YN = 'Y')
 *   - USER-ATH-02-SQL-006 (신규 비밀번호 해시 및 솔트 갱신: TB_USER UPDATE)
 *
 * [엄격 준수 아키텍처 규칙]
 *   - 물리적 격리: SsulDak_Web/User 내부에서 완결.
 *   - 1:1 매핑 및 공통화 배제: 타 화면과 API/쿼리를 공유하지 않고 독립 실행.
 *   - 감사 추적 컬럼: 비밀번호 변경 시 MOD_DT(NOW()), MOD_ID(대상 USER_NO) 기록.
 * =============================================================================
 */

import { executeQuery, executeTransaction } from '../../../../lib/db';
import crypto from 'crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// =============================================================================
// 인터페이스 정의
// =============================================================================

export interface UserAth02RequestBody {
  mode: 'FIND_EMAIL' | 'SEND_RESET_CODE' | 'RESET_PASSWORD';
  userNm?: string;
  userTel?: string;
  userEmail?: string;
  authCode?: string;
  newPassword?: string;
}

export interface UserAth02ResponseData {
  success: boolean;
  message: string;
  code?: string;
  maskedEmail?: string;
  regDate?: string;
  devAuthCode?: string; // 개발/테스트 편의용 발송 인증번호
}

// =============================================================================
// 비밀번호 단방향 암호화 유틸리티
// =============================================================================

function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

// 이메일 마스킹 유틸리티 (예: customer@ssuldak.com -> cus***@ssuldak.com)
function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 3) {
    return `${local.slice(0, 1)}**@${domain}`;
  }
  return `${local.slice(0, 3)}***@${domain}`;
}

// =============================================================================
// 핵심 비즈니스 로직 프로세서 (processUserAth02)
// =============================================================================

export async function processUserAth02(body: UserAth02RequestBody): Promise<{
  status: number;
  data: UserAth02ResponseData;
}> {
  const { mode } = body;

  // ---------------------------------------------------------------------------
  // [모드 1] 아이디(이메일) 찾기 (FIND_EMAIL)
  // ---------------------------------------------------------------------------
  if (mode === 'FIND_EMAIL') {
    const userNm = body.userNm?.trim();
    const userTel = body.userTel?.trim().replace(/-/g, '');

    if (!userNm) {
      return {
        status: 400,
        data: { success: false, code: 'NAME_REQUIRED', message: '가입 시 등록한 이름을 입력해 주세요.' },
      };
    }
    if (!userTel) {
      return {
        status: 400,
        data: { success: false, code: 'TEL_REQUIRED', message: '휴대폰 번호를 입력해 주세요.' },
      };
    }

    /* USER-ATH-02-SQL-001 (이름과 휴대폰 번호로 등록 이메일 마스킹 조회) */
    const rows = await executeQuery<RowDataPacket[]>(
      `/* USER-ATH-02-SQL-001 */
       SELECT 
         USER_EMAIL, 
         REG_DT, 
         USER_STAT_CD
       FROM TB_USER
       WHERE USER_NM = ? 
         AND REPLACE(USER_TEL, '-', '') = ? 
         AND USER_STAT_CD != 'WITHDRAWN'
       ORDER BY REG_DT DESC
       LIMIT 1;`,
      [userNm, userTel]
    );

    if (rows.length === 0) {
      return {
        status: 404,
        data: {
          success: false,
          code: 'USER_NOT_FOUND',
          message: '입력하신 정보와 일치하는 회원 정보를 찾을 수 없습니다.',
        },
      };
    }

    const matchedUser = rows[0];
    const masked = maskEmail(matchedUser.USER_EMAIL);
    const regDateStr = matchedUser.REG_DT
      ? new Date(matchedUser.REG_DT).toISOString().slice(0, 10).replace(/-/g, '.')
      : '일자 정보 없음';

    return {
      status: 200,
      data: {
        success: true,
        message: '회원님의 계정 정보를 성공적으로 찾았습니다.',
        maskedEmail: masked,
        regDate: regDateStr,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // [모드 2] 비밀번호 재설정 인증번호 발송 (SEND_RESET_CODE)
  // ---------------------------------------------------------------------------
  if (mode === 'SEND_RESET_CODE') {
    const userEmail = body.userEmail?.trim();
    const userTel = body.userTel?.trim().replace(/-/g, '');

    if (!userEmail) {
      return {
        status: 400,
        data: { success: false, code: 'EMAIL_REQUIRED', message: '가입 이메일을 입력해 주세요.' },
      };
    }
    if (!userTel) {
      return {
        status: 400,
        data: { success: false, code: 'TEL_REQUIRED', message: '휴대폰 번호를 입력해 주세요.' },
      };
    }

    /* USER-ATH-02-SQL-002 (이메일과 휴대폰 번호 일치 검증 및 회원 식별자 조회) */
    const userRows = await executeQuery<RowDataPacket[]>(
      `/* USER-ATH-02-SQL-002 */
       SELECT 
         USER_NO, 
         USER_NM, 
         USER_STAT_CD
       FROM TB_USER
       WHERE USER_EMAIL = ? 
         AND REPLACE(USER_TEL, '-', '') = ?;`,
      [userEmail, userTel]
    );

    if (userRows.length === 0) {
      return {
        status: 404,
        data: {
          success: false,
          code: 'ACCOUNT_MISMATCH',
          message: '입력하신 이메일과 휴대폰 번호가 일치하는 계정을 찾을 수 없습니다.',
        },
      };
    }

    const targetUser = userRows[0];
    if (targetUser.USER_STAT_CD === 'BLOCKED') {
      return {
        status: 403,
        data: {
          success: false,
          code: 'BLOCKED_USER',
          message: '운영 정책 위반으로 영구 이용 제재된 계정은 비밀번호를 재설정할 수 없습니다.',
        },
      };
    }
    if (targetUser.USER_STAT_CD === 'WITHDRAWN') {
      return {
        status: 403,
        data: {
          success: false,
          code: 'WITHDRAWN_USER',
          message: '이미 탈퇴 처리된 계정입니다.',
        },
      };
    }

    // 6자리 난수 인증코드 생성 (100000 ~ 999999)
    const authCode = Math.floor(100000 + Math.random() * 900000).toString();

    /* USER-ATH-02-SQL-003 (비밀번호 재설정 인증번호 저장: TB_SMS_AUTH_LOG INSERT) */
    await executeQuery<ResultSetHeader>(
      `/* USER-ATH-02-SQL-003 */
       INSERT INTO TB_SMS_AUTH_LOG (
         RECV_TEL, AUTH_TYPE_CD, AUTH_CODE, EXPIRE_DT, VERIFY_YN, REG_DT
       ) VALUES (
         ?, 'PWD_RESET', ?, DATE_ADD(NOW(), INTERVAL 3 MINUTE), 'N', NOW()
       );`,
      [userTel, authCode]
    );

    console.log(`[USER-ATH-02 SMS AUTH] ${userTel} 발송 인증번호: ${authCode} (유효시간: 3분)`);

    return {
      status: 200,
      data: {
        success: true,
        message: '인증번호(6자리)가 발송되었습니다. 3분 이내에 입력해 주세요.',
        devAuthCode: authCode, // 개발/테스트 편의 제공
      },
    };
  }

  // ---------------------------------------------------------------------------
  // [모드 3] 인증번호 검증 및 신규 비밀번호 재설정 (RESET_PASSWORD)
  // ---------------------------------------------------------------------------
  if (mode === 'RESET_PASSWORD') {
    const userEmail = body.userEmail?.trim();
    const userTel = body.userTel?.trim().replace(/-/g, '');
    const authCode = body.authCode?.trim();
    const newPassword = body.newPassword;

    if (!userEmail) {
      return {
        status: 400,
        data: { success: false, code: 'EMAIL_REQUIRED', message: '이메일 주소를 입력해 주세요.' },
      };
    }
    if (!authCode || authCode.length !== 6) {
      return {
        status: 400,
        data: { success: false, code: 'AUTH_CODE_INVALID', message: '6자리 인증번호를 정확히 입력해 주세요.' },
      };
    }
    if (!newPassword || newPassword.length < 8) {
      return {
        status: 400,
        data: {
          success: false,
          code: 'PASSWORD_TOO_SHORT',
          message: '새 비밀번호는 영문, 숫자, 특수문자를 포함하여 8자리 이상이어야 합니다.',
        },
      };
    }

    /* USER-ATH-02-SQL-004 (유효한 3분 이내 인증번호 검증) */
    const authRows = await executeQuery<RowDataPacket[]>(
      `/* USER-ATH-02-SQL-004 */
       SELECT AUTH_SEQ
       FROM TB_SMS_AUTH_LOG
       WHERE REPLACE(RECV_TEL, '-', '') = ? 
         AND AUTH_TYPE_CD = 'PWD_RESET' 
         AND AUTH_CODE = ? 
         AND VERIFY_YN = 'N' 
         AND EXPIRE_DT >= NOW()
       ORDER BY AUTH_SEQ DESC
       LIMIT 1;`,
      [userTel || '', authCode]
    );

    if (authRows.length === 0) {
      return {
        status: 400,
        data: {
          success: false,
          code: 'INVALID_OR_EXPIRED_CODE',
          message: '인증번호가 일치하지 않거나 유효시간(3분)이 만료되었습니다. 다시 요청해 주세요.',
        },
      };
    }

    const authSeq = authRows[0].AUTH_SEQ;

    // 대상 회원 조회
    const userRows = await executeQuery<RowDataPacket[]>(
      `SELECT USER_NO FROM TB_USER WHERE USER_EMAIL = ?;`,
      [userEmail]
    );
    if (userRows.length === 0) {
      return {
        status: 404,
        data: { success: false, code: 'USER_NOT_FOUND', message: '회원 정보를 찾을 수 없습니다.' },
      };
    }
    const userNo = userRows[0].USER_NO;

    // 신규 비밀번호 해싱
    const { hash: newHash, salt: newSalt } = hashPassword(newPassword);

    // 트랜잭션: 인증번호 사용 완료 처리 + 비밀번호 갱신
    await executeTransaction(async (conn) => {
      /* USER-ATH-02-SQL-005 (인증 완료 처리) */
      await conn.execute<ResultSetHeader>(
        `/* USER-ATH-02-SQL-005 */
         UPDATE TB_SMS_AUTH_LOG
         SET VERIFY_YN = 'Y'
         WHERE AUTH_SEQ = ?;`,
        [authSeq]
      );

      /* USER-ATH-02-SQL-006 (신규 비밀번호 해시 및 솔트 갱신: TB_USER UPDATE) */
      await conn.execute<ResultSetHeader>(
        `/* USER-ATH-02-SQL-006 */
         UPDATE TB_USER
         SET 
           USER_PWD_HASH = ?,
           PWD_SALT = ?,
           PWD_CHG_DT = NOW(),
           MOD_DT = NOW(),
           MOD_ID = ?
         WHERE USER_NO = ?;`,
        [newHash, newSalt, userNo, userNo]
      );

      // 보안 조치: 비밀번호 변경 시 기존 활성 세션 일괄 만료
      await conn.execute<ResultSetHeader>(
        `UPDATE TB_USER_SESSION 
         SET IS_VALID_YN = 'N' 
         WHERE USER_NO = ?;`,
        [userNo]
      );
    });

    return {
      status: 200,
      data: {
        success: true,
        message: '비밀번호가 성공적으로 재설정되었습니다. 새로운 비밀번호로 로그인해 주세요.',
      },
    };
  }

  return {
    status: 400,
    data: {
      success: false,
      code: 'INVALID_MODE',
      message: '지원하지 않는 작업 모드(mode)입니다.',
    },
  };
}

// =============================================================================
// Next.js App Router POST 엔드포인트 핸들러
// =============================================================================

export async function POST(req: Request) {
  try {
    const body: UserAth02RequestBody = await req.json();
    const { status, data } = await processUserAth02(body);
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ [api_USER_ATH_02] Internal Server Error:', error.message);
    return new Response(
      JSON.stringify({
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message || '요청 처리 중 서버 내부 오류가 발생했습니다.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
}
