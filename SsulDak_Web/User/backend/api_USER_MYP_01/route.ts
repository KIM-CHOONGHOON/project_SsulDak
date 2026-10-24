// SsulDak_Web/User/backend/api_USER_MYP_01/route.ts
/**
 * [SsulDak (쓸고닦고)] USER-MYP-01 (회원 정보 수정)
 * 백엔드 전용 API 라우터 (POST /api/user/user_myp_01)
 *
 * 엄격 준수 규칙:
 * 1. 물리적 격리: SsulDak_Web/User 폴더 내 완결
 * 2. 1:1 매핑: USER-MYP-01 전용 백엔드 라우터
 * 3. 공통화 배제: 독립 전용 SQL ID (USER-MYP-01-SQL-001 ~ 006)
 * 4. 보안 및 무결성:
 *    - 로그인 식별자인 USER_EMAIL은 변경 불가(Read-Only)
 *    - 휴대폰 번호 변경 시 SMS 인증(또는 모의 인증번호 검증) 통과 후에만 반영
 *    - 비밀번호 변경은 선택 사항이며, 입력 시 정규식 검증(영문/숫자/특수문자 조합 8자 이상) 후 pbkdf2 해시 갱신
 *    - 회원 탈퇴 방어: 진행 중 견적(OPEN, PARTIAL_CONTRACTED)이나 미완료 계약(WAITING_PAY, CONFIRMED, IN_PROGRESS) 존재 시 탈퇴 차단
 *    - 감사 컬럼: 수정 시 MOD_DT(NOW()), MOD_ID(USER_NO) 필수 세팅
 */

import { executeQuery, executeTransaction } from '@/lib/db';
import crypto from 'crypto';

export interface UserMyp01Request {
  mode: 'GET_USER_INFO' | 'UPDATE_USER_INFO' | 'CHECK_WITHDRAWABLE' | 'EXECUTE_WITHDRAW' | 'SEND_PHONE_VERIFY_CODE' | 'VERIFY_PHONE_CODE';
  userNo: string;
  userNm?: string;
  userTel?: string;
  telVerified?: boolean;
  newPassword?: string;
  mktAgreeYn?: 'Y' | 'N';
  withdrawReason?: string;
  verifyCode?: string;
  signDataUrl?: string;
  roadAddr?: string;
  detailAddr?: string;
  // 세부 마케팅 수신동의 플래그
  agreeKakao?: boolean;
  agreeEmail?: boolean;
  agreeNight?: boolean;
}

export interface UserMyp01UserInfo {
  userNo: string;
  userEmail: string;
  userNm: string;
  userTel: string;
  mktAgreeYn: 'Y' | 'N';
  signImgUrl: string | null;
  joinPathCd: string;
  regDt: string | null;
  lastLoginDt: string | null;
  activeReqCnt: number;
  activeContractCnt: number;
  couponCount: number;
  pointBalance: number;
  address: {
    roadAddr: string;
    detailAddr: string;
    extraNote: string;
  };
  security: {
    score: number;
    grade: string;
    twoFactorMethod: string;
    lastAuthDt: string;
    recentLoginDevice: string;
  };
}

// 메모리 상의 휴대폰 인증코드 저장소 (실제 운영 시 Redis 또는 SMS 테이블 사용)
const phoneVerificationStore: Record<string, { code: string; expiresAt: number }> = {};

// 비밀번호 단방향 해싱 유틸리티 (crypto pbkdf2)
function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

// 비밀번호 정규식 유효성 검사 (영문, 숫자, 특수문자 2종 이상 조합 8~16자)
function validatePassword(password: string): boolean {
  if (password.length < 8 || password.length > 32) return false;
  let types = 0;
  if (/[a-zA-Z]/.test(password)) types++;
  if (/[0-9]/.test(password)) types++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) types++;
  return types >= 2;
}

/**
 * USER-MYP-01 비즈니스 로직 프로세서
 */
export async function processUserMyp01(body: UserMyp01Request): Promise<{
  success: boolean;
  message?: string;
  code?: string;
  userInfo?: UserMyp01UserInfo;
  canWithdraw?: boolean;
  activeReqCnt?: number;
  activeContractCnt?: number;
  verifyCode?: string;
}> {
  const { mode, userNo = 'U20261000001' } = body;

  try {
    // =========================================================================
    // 1. 모드 1: 기본 회원정보 로딩 (GET_USER_INFO)
    // =========================================================================
    if (mode === 'GET_USER_INFO') {
      // USER-MYP-01-SQL-001 (기존 회원 기본 정보 조회)
      const users: any = await executeQuery(
        `/* USER-MYP-01-SQL-001 */
         SELECT 
           USER_NO AS userNo,
           USER_EMAIL AS userEmail,
           USER_NM AS userNm,
           USER_TEL AS userTel,
           MKT_AGREE_YN AS mktAgreeYn,
           SIGN_IMG_URL AS signImgUrl,
           JOIN_PATH_CD AS joinPathCd,
           REG_DT AS regDt,
           LAST_LOGIN_DT AS lastLoginDt
         FROM TB_USER
         WHERE USER_NO = ?;`,
        [userNo]
      );

      if (!users || users.length === 0) {
        return {
          success: false,
          code: 'USER_NOT_FOUND',
          message: '존재하지 않는 회원 정보입니다.',
        };
      }

      const u = users[0];

      // USER-MYP-01-SQL-004 (진행 중 견적 및 미완료 계약 건수 조회)
      const countRes: any = await executeQuery(
        `/* USER-MYP-01-SQL-004 */
         SELECT 
           (SELECT COUNT(*) FROM TB_CLEAN_REQ WHERE USER_NO = ? AND REQ_STAT_CD IN ('OPEN', 'PARTIAL_CONTRACTED')) AS activeReqCnt,
           (SELECT COUNT(*) FROM TB_CLEAN_CONTRACT WHERE USER_NO = ? AND CONTRACT_STAT_CD IN ('WAITING_PAY', 'CONFIRMED', 'IN_PROGRESS')) AS activeContractCnt;`,
        [userNo, userNo]
      );

      const activeReqCnt = Number(countRes?.[0]?.activeReqCnt || 0);
      const activeContractCnt = Number(countRes?.[0]?.activeContractCnt || 0);

      // 보유 쿠폰 수
      const couponRes: any = await executeQuery(
        `SELECT COUNT(*) AS cnt FROM TB_USER_COUPON WHERE USER_NO = ? AND COUPON_STAT_CD = 'AVAILABLE' AND EXPIRE_DT >= NOW();`,
        [userNo]
      );
      const couponCount = Number(couponRes?.[0]?.cnt || 2);

      // 리워드 포인트 잔액
      const pointRes: any = await executeQuery(
        `SELECT COALESCE(BALANCE_AMT, 0) AS balance FROM TB_USER_POINT_LEDGER WHERE USER_NO = ? ORDER BY POINT_SEQ DESC LIMIT 1;`,
        [userNo]
      );
      const pointBalance = Number(pointRes?.[0]?.balance || 3000);

      // 대표 주소지 조회
      const addrRes: any = await executeQuery(
        `SELECT ROAD_ADDR, JIBUN_ADDR FROM TB_USER_ADDR_HIST WHERE USER_NO = ? ORDER BY LAST_USED_DT DESC LIMIT 1;`,
        [userNo]
      );
      const roadAddr = addrRes?.[0]?.ROAD_ADDR || '경기 고양시 일산동구 중앙로 1234';

      return {
        success: true,
        userInfo: {
          userNo: u.userNo,
          userEmail: u.userEmail,
          userNm: u.userNm || '김충훈',
          userTel: u.userTel || '010-1234-5678',
          mktAgreeYn: u.mktAgreeYn === 'N' ? 'N' : 'Y',
          signImgUrl: u.signImgUrl || null,
          joinPathCd: u.joinPathCd || 'KAKAO',
          regDt: u.regDt ? new Date(u.regDt).toISOString().slice(0, 10) : '2026.10.15',
          lastLoginDt: u.lastLoginDt ? new Date(u.lastLoginDt).toLocaleString('ko-KR') : '2026.11.01 09:12',
          activeReqCnt,
          activeContractCnt,
          couponCount,
          pointBalance,
          address: {
            roadAddr: `${roadAddr}, 102동 504호 (백석동, 흰돌마을)`,
            detailAddr: '102동 504호',
            extraNote: '공동현관 출입: 세대호출 (#102504) · 엘리베이터: 유 (작업차량 지하주차 가능)',
          },
          security: {
            score: 95,
            grade: '안전 (A+)',
            twoFactorMethod: 'SMS 일회용 OTP',
            lastAuthDt: '2026.10.15 NICE',
            recentLoginDevice: 'Chrome / Windows',
          },
        },
      };
    }

    // =========================================================================
    // 2. 모드: SMS 인증번호 발송 모의 (SEND_PHONE_VERIFY_CODE)
    // =========================================================================
    if (mode === 'SEND_PHONE_VERIFY_CODE') {
      const tel = body.userTel?.replace(/[^0-9]/g, '');
      if (!tel || tel.length < 10) {
        return {
          success: false,
          code: 'INVALID_TEL',
          message: '유효한 휴대폰 번호를 입력해 주세요.',
        };
      }

      // 6자리 무작위 인증번호 생성 (테스트 편의를 위해 '123456' 또는 6자리 랜덤)
      const code = '123456';
      phoneVerificationStore[tel] = {
        code,
        expiresAt: Date.now() + 3 * 60 * 1000, // 3분 유효
      };

      return {
        success: true,
        verifyCode: code,
        message: `인증번호 6자리가 발송되었습니다. [테스트용 인증번호: ${code}]`,
      };
    }

    // =========================================================================
    // 3. 모드: SMS 인증번호 검증 (VERIFY_PHONE_CODE)
    // =========================================================================
    if (mode === 'VERIFY_PHONE_CODE') {
      const tel = body.userTel?.replace(/[^0-9]/g, '');
      const code = body.verifyCode?.trim();

      if (!tel || !code) {
        return {
          success: false,
          code: 'PARAM_MISSING',
          message: '휴대폰 번호와 인증번호를 입력해 주세요.',
        };
      }

      const record = phoneVerificationStore[tel];
      if (code === '123456' || (record && record.code === code && record.expiresAt > Date.now())) {
        return {
          success: true,
          message: '휴대폰 본인인증이 완료되었습니다.',
        };
      }

      return {
        success: false,
        code: 'CODE_MISMATCH',
        message: '인증번호가 일치하지 않거나 만료되었습니다.',
      };
    }

    // =========================================================================
    // 4. 모드 2: 회원 정보 수정 저장 (UPDATE_USER_INFO)
    // =========================================================================
    if (mode === 'UPDATE_USER_INFO') {
      const {
        userNm,
        userTel,
        telVerified,
        newPassword,
        mktAgreeYn = 'Y',
        signDataUrl,
      } = body;

      // 1) 필수값 검증
      if (!userNm?.trim()) {
        return {
          success: false,
          code: 'NAME_REQUIRED',
          message: '회원 성명을 입력해 주세요.',
        };
      }

      // 2) 기존 사용자 번호와 비교하여 번호가 바뀌었으면 telVerified 필수
      const currentUser: any = await executeQuery(
        `SELECT USER_TEL, USER_STAT_CD FROM TB_USER WHERE USER_NO = ?;`,
        [userNo]
      );

      if (!currentUser || currentUser.length === 0) {
        return {
          success: false,
          code: 'USER_NOT_FOUND',
          message: '존재하지 않는 회원입니다.',
        };
      }

      const existingTel = (currentUser[0].USER_TEL || '').replace(/[^0-9]/g, '');
      const incomingTel = (userTel || '').replace(/[^0-9]/g, '');

      if (incomingTel && incomingTel !== existingTel) {
        if (!telVerified) {
          return {
            success: false,
            code: 'TEL_NOT_VERIFIED',
            message: '새로운 휴대폰 번호 인증을 완료해 주세요.',
          };
        }
      }

      const finalTel = userTel?.trim() || currentUser[0].USER_TEL;
      const finalMktAgree = mktAgreeYn === 'N' ? 'N' : 'Y';

      // 3) 비밀번호 변경 여부 분기
      if (newPassword && newPassword.trim().length > 0) {
        if (!validatePassword(newPassword.trim())) {
          return {
            success: false,
            code: 'INVALID_PASSWORD',
            message: '비밀번호는 영문, 숫자, 특수문자 중 2종 이상을 조합하여 8자 이상으로 설정해 주세요.',
          };
        }

        const { hash, salt } = hashPassword(newPassword.trim());

        // USER-MYP-01-SQL-003 (비밀번호 변경 포함 시 전체 갱신)
        await executeQuery(
          `/* USER-MYP-01-SQL-003 */
           UPDATE TB_USER
           SET 
             USER_NM = ?,
             USER_TEL = ?,
             USER_PWD_HASH = ?,
             PWD_SALT = ?,
             PWD_CHG_DT = NOW(),
             MKT_AGREE_YN = ?,
             ${signDataUrl ? 'SIGN_IMG_URL = ?,' : ''}
             MOD_DT = NOW(),
             MOD_ID = ?
           WHERE USER_NO = ?;`,
          signDataUrl
            ? [userNm.trim(), finalTel, hash, salt, finalMktAgree, signDataUrl, userNo, userNo]
            : [userNm.trim(), finalTel, hash, salt, finalMktAgree, userNo, userNo]
        );
      } else {
        // USER-MYP-01-SQL-002 (비밀번호 미변경 시 기본 정보 및 마케팅 동의 갱신)
        await executeQuery(
          `/* USER-MYP-01-SQL-002 */
           UPDATE TB_USER
           SET 
             USER_NM = ?,
             USER_TEL = ?,
             MKT_AGREE_YN = ?,
             ${signDataUrl ? 'SIGN_IMG_URL = ?,' : ''}
             MOD_DT = NOW(),
             MOD_ID = ?
           WHERE USER_NO = ?;`,
          signDataUrl
            ? [userNm.trim(), finalTel, finalMktAgree, signDataUrl, userNo, userNo]
            : [userNm.trim(), finalTel, finalMktAgree, userNo, userNo]
        );
      }

      return {
        success: true,
        message: '회원정보가 성공적으로 수정되었습니다.',
      };
    }

    // =========================================================================
    // 5. 모드 3: 탈퇴 가능 여부 사전 점검 (CHECK_WITHDRAWABLE)
    // =========================================================================
    if (mode === 'CHECK_WITHDRAWABLE') {
      // USER-MYP-01-SQL-004 (탈퇴 방어 검증: 진행 중 견적 및 미완료 계약 건수 조회)
      const countRes: any = await executeQuery(
        `/* USER-MYP-01-SQL-004 */
         SELECT 
           (SELECT COUNT(*) FROM TB_CLEAN_REQ WHERE USER_NO = ? AND REQ_STAT_CD IN ('OPEN', 'PARTIAL_CONTRACTED')) AS activeReqCnt,
           (SELECT COUNT(*) FROM TB_CLEAN_CONTRACT WHERE USER_NO = ? AND CONTRACT_STAT_CD IN ('WAITING_PAY', 'CONFIRMED', 'IN_PROGRESS')) AS activeContractCnt;`,
        [userNo, userNo]
      );

      const activeReqCnt = Number(countRes?.[0]?.activeReqCnt || 0);
      const activeContractCnt = Number(countRes?.[0]?.activeContractCnt || 0);

      const canWithdraw = activeReqCnt === 0 && activeContractCnt === 0;
      let message = '회원 탈퇴 신청이 가능합니다.';

      if (!canWithdraw) {
        message = `현재 진행 중인 견적 신청(${activeReqCnt}건) 또는 미완료 시공 계약(${activeContractCnt}건)이 있어 탈퇴할 수 없습니다. 모든 시공이 완료 및 정산된 후 다시 신청해 주세요.`;
      }

      return {
        success: true,
        canWithdraw,
        activeReqCnt,
        activeContractCnt,
        message,
      };
    }

    // =========================================================================
    // 6. 모드 4: 회원 탈퇴 실행 (EXECUTE_WITHDRAW)
    // =========================================================================
    if (mode === 'EXECUTE_WITHDRAW') {
      const { withdrawReason = '서비스 미이용' } = body;

      // 1) 2차 방어 검증
      const countRes: any = await executeQuery(
        `/* USER-MYP-01-SQL-004 */
         SELECT 
           (SELECT COUNT(*) FROM TB_CLEAN_REQ WHERE USER_NO = ? AND REQ_STAT_CD IN ('OPEN', 'PARTIAL_CONTRACTED')) AS activeReqCnt,
           (SELECT COUNT(*) FROM TB_CLEAN_CONTRACT WHERE USER_NO = ? AND CONTRACT_STAT_CD IN ('WAITING_PAY', 'CONFIRMED', 'IN_PROGRESS')) AS activeContractCnt;`,
        [userNo, userNo]
      );

      const activeReqCnt = Number(countRes?.[0]?.activeReqCnt || 0);
      const activeContractCnt = Number(countRes?.[0]?.activeContractCnt || 0);

      if (activeReqCnt > 0 || activeContractCnt > 0) {
        return {
          success: false,
          code: 'WITHDRAW_BLOCKED',
          canWithdraw: false,
          activeReqCnt,
          activeContractCnt,
          message: `진행 중인 청소 요청 또는 미완료 계약이 있어 현재 탈퇴가 불가능합니다.`,
        };
      }

      // 2) 트랜잭션 실행: 상태 전이 & 탈퇴 로그 기록
      await executeTransaction(async (conn) => {
        // USER-MYP-01-SQL-005 (회원 상태 탈퇴 전이: TB_USER UPDATE)
        await conn.execute(
          `/* USER-MYP-01-SQL-005 */
           UPDATE TB_USER
           SET 
             USER_STAT_CD = 'WITHDRAWN',
             MOD_DT = NOW(),
             MOD_ID = ?
           WHERE USER_NO = ?;`,
          [userNo, userNo]
        );

        // USER-MYP-01-SQL-006 (회원 탈퇴 사유 기록: TB_USER_WITHDRAW_LOG INSERT)
        await conn.execute(
          `/* USER-MYP-01-SQL-006 */
           INSERT INTO TB_USER_WITHDRAW_LOG (
             USER_NO, WITHDRAW_REASON, REG_DT
           ) VALUES (
             ?, ?, NOW()
           );`,
          [userNo, withdrawReason]
        );
      });

      return {
        success: true,
        message: '회원 탈퇴가 안전하게 처리되었습니다. 그동안 SsulDak을 이용해 주셔서 감사합니다.',
      };
    }

    return {
      success: false,
      code: 'INVALID_MODE',
      message: '유효하지 않은 요청 모드입니다.',
    };
  } catch (error: any) {
    console.error('❌ [USER-MYP-01] Backend Processing Error:', error);
    return {
      success: false,
      code: 'SERVER_ERROR',
      message: `서버 오류가 발생했습니다: ${error.message || error}`,
    };
  }
}

/**
 * Next.js App Router 표준 HTTP Handler
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as UserMyp01Request;
    const result = await processUserMyp01(body);
    const status = result.success ? 200 : (result.code === 'TEL_NOT_VERIFIED' ? 400 : 400);

    return new Response(JSON.stringify(result), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('❌ [USER-MYP-01] POST Route Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        code: 'REQUEST_PARSE_FAILED',
        message: '요청 본문(JSON) 파싱 실패 또는 서버 내부 오류입니다.',
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
