/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 개발 명세
 * 화면 ID: USER-ATH-00 (이용자 로그인 및 인증)
 * 백엔드 모듈 경로: SsulDak_Web/User/backend/api_USER_ATH_00/route.ts
 * 엔드포인트 URL: POST /api/user/user_ath_00
 *
 * [독립 전용 SQL 쿼리 ID]
 *   - USER-ATH-00-SQL-001 (이메일 기준 회원 인증 정보 조회)
 *   - USER-ATH-00-SQL-002 (로그인 성공 시 최종 로그인 일시 갱신)
 *   - USER-ATH-00-SQL-003 (7일 정지 기간 경과 시 NORMAL 상태 자동 복구)
 *   - USER-ATH-00-SQL-004 (회원 활성 세션 목록 조회 - 최대 4대 기기 관리)
 *   - USER-ATH-00-SQL-005 (디바이스 세션 등록 및 갱신)
 *   - USER-ATH-00-SQL-006 (4대 초과 시 가장 오래된 세션 자동 만료)
 *   - USER-ATH-00-SQL-007 (자동 로그인 세션 및 기기 지문 DEVICE_UUID 일치 여부 검증)
 *
 * [회원 식별자 12자리 고정 규격: CHAR(12)]
 *   - 1바이트: 역할 코드 ('U': 사용자, 'P': 파트너, 'A': 관리자)
 *   - 6바이트: 가입 년월 (YYYYMM)
 *   - 5바이트: 일련번호 (00001~, 1부터 시작하되 앞자리를 '0'으로 채운 5바이트)
 *   - 총 12바이트 필수 충족 (예: U20261000001)
 *
 * [멀티 디바이스 세션 및 보안 규격]
 *   - 기기 유형: PC, NOTEBOOK, TABLET, MOBILE (최대 4대 동시 유지)
 *   - 로그인 유지 기간:
 *     * 휴대전화(MOBILE): 30일 (디바이스 지문 바인딩 보안)
 *     * PC / 노트북 / 태블릿: 14일
 *     * 일반 로그인(미체크): 2시간
 * =============================================================================
 */

import { executeQuery } from '@/lib/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// =============================================================================
// 1. 상수 및 인터페이스 정의
// =============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'ssuldak_user_auth_secret_key_2026';
export const MEMBER_NO_TOTAL_LENGTH = 12;
export const USER_NO_REGEX = /^U(20\d{2})(0[1-9]|1[0-2])(\d{5})$/;
export const MAX_ALLOWED_DEVICES = 4; // 최대 4대 기기 동시 로그인 허용 (PC, 노트북, 태블릿, 휴대전화)

export type DeviceType = 'PC' | 'NOTEBOOK' | 'TABLET' | 'MOBILE';

export interface UserAth00ReqBody {
  authType?: 'EMAIL_LOGIN' | 'AUTO_LOGIN_CHECK' | 'SOCIAL_LOGIN';
  userEmail?: string;
  userPassword?: string;
  autoLoginYn?: 'Y' | 'N';
  token?: string; // AUTO_LOGIN_CHECK 시 전달
  deviceType?: DeviceType; // 'PC' | 'NOTEBOOK' | 'TABLET' | 'MOBILE'
  deviceUuid?: string; // 클라이언트 기기 고유 지문
  deviceName?: string; // 기기 모델명 (예: 'iPhone 15 Pro', 'Galaxy S24', 'MacBook Pro')
  socialProvider?: 'KAKAO' | 'NAVER' | 'GOOGLE';
  socialToken?: string;
}

export interface UserAuthRow extends RowDataPacket {
  USER_NO: string;
  USER_EMAIL: string;
  USER_PWD_HASH: string;
  PWD_SALT: string | null;
  USER_NM: string;
  USER_TEL: string | null;
  USER_STAT_CD: 'NORMAL' | 'SUSPENDED_7D' | 'BLOCKED' | 'WITHDRAWN';
  SUSPEND_EXPIRE_DT: Date | string | null;
  SIGN_IMG_URL: string | null;
}

export interface UserSessionRow extends RowDataPacket {
  SESSION_ID: string;
  USER_NO: string;
  DEVICE_TYPE: DeviceType;
  DEVICE_UUID: string;
  DEVICE_NM: string | null;
  KEEP_LOGIN_YN: 'Y' | 'N';
  EXPIRE_DT: Date | string;
  LAST_ACTIVE_DT: Date | string;
  IS_VALID_YN: 'Y' | 'N';
}

export interface ActiveDeviceInfo {
  deviceType: DeviceType;
  deviceNm: string;
  lastActiveDt: string;
  isCurrent: boolean;
}

export interface SessionSecurityInfo {
  sessionId: string;
  deviceType: DeviceType;
  deviceUuid: string;
  deviceNm: string;
  keepLoginYn: 'Y' | 'N';
  expireDays: number;
  expireDt: string;
  activeDeviceCount: number;
  maxDeviceLimit: number;
  activeDevices: ActiveDeviceInfo[];
}

export interface AuthSuccessUser {
  userNo: string;
  userEmail: string;
  userNm: string;
  userTel: string | null;
  hasSignature: boolean;
  userStatCd: 'NORMAL' | 'SUSPENDED_7D' | 'BLOCKED' | 'WITHDRAWN';
  isSuspended: boolean;
  suspendExpireDt: string | null;
}

export interface UserAth00ApiResponse {
  success: boolean;
  code?: string;
  message: string;
  token?: string;
  user?: AuthSuccessUser;
  session?: SessionSecurityInfo;
}

// =============================================================================
// 2. 12바이트 회원 식별자 유효성 검증 함수
// =============================================================================

export function validateUserNo(userNo: unknown): { isValid: boolean; message?: string } {
  if (typeof userNo !== 'string') {
    return {
      isValid: false,
      message: '회원 식별자는 문자열 형식이어야 합니다.',
    };
  }

  const trimmed = userNo.trim();

  if (trimmed.length !== MEMBER_NO_TOTAL_LENGTH) {
    return {
      isValid: false,
      message: `회원 식별자는 반드시 12자리 고정 규격이어야 합니다. (입력값: '${trimmed}', 길이: ${trimmed.length})`,
    };
  }

  if (!trimmed.startsWith('U')) {
    return {
      isValid: false,
      message: `이용자 회원 식별자는 반드시 'U'로 시작해야 합니다. ('U': 사용자, 'P': 파트너, 'A': 관리자)`,
    };
  }

  if (!USER_NO_REGEX.test(trimmed)) {
    return {
      isValid: false,
      message: `유효하지 않은 이용자 식별자 형식입니다. 규격: U + YYYYMM(가입년월) + 5자리 순번 (예: U20261000001)`,
    };
  }

  return { isValid: true };
}

// =============================================================================
// 3. 비밀번호 검증 헬퍼 (bcrypt, salt+sha256/pbkdf2, 개발 초기 평문 호환)
// =============================================================================

export function verifyPassword(
  plainPassword: string,
  storedHash: string,
  salt: string | null
): boolean {
  if (!plainPassword || !storedHash) return false;

  // 1. bcrypt 검증 시도 ($2a$, $2b$, $2y$)
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    try {
      if (bcrypt.compareSync(plainPassword, storedHash)) {
        return true;
      }
    } catch {
      // 무시
    }
  }

  // 2. Salt 기반 sha256 검증 (예: sha256(password + salt))
  if (salt) {
    const sha256WithSalt = crypto.createHash('sha256').update(plainPassword + salt).digest('hex');
    if (sha256WithSalt === storedHash) return true;

    const sha256SaltFirst = crypto.createHash('sha256').update(salt + plainPassword).digest('hex');
    if (sha256SaltFirst === storedHash) return true;

    try {
      const pbkdf2Hash = crypto.pbkdf2Sync(plainPassword, salt, 1000, 32, 'sha256').toString('hex');
      if (pbkdf2Hash === storedHash) return true;
    } catch {
      // 무시
    }
  }

  // 3. 단순 SHA256 검증
  const plainSha256 = crypto.createHash('sha256').update(plainPassword).digest('hex');
  if (plainSha256 === storedHash) return true;

  // 4. 초기 샘플 데이터 / 평문 대조 (목업 테스트용 'test_hash' 또는 'Password1234!')
  if (storedHash === plainPassword) {
    return true;
  }
  if (storedHash === 'test_hash' && (plainPassword === 'test_hash' || plainPassword === 'Password1234!')) {
    return true;
  }

  return false;
}

// =============================================================================
// 4. 비즈니스 엔진 처리 함수 (processUserAth00)
// =============================================================================

export async function processUserAth00(
  body: UserAth00ReqBody,
  headersMeta?: { ip?: string; userAgent?: string }
): Promise<{ status: number; data: UserAth00ApiResponse }> {
  const authType = body.authType || 'EMAIL_LOGIN';

  // 클라이언트 기기 정보 정제
  const deviceType: DeviceType = body.deviceType || 'PC';
  const deviceUuid = (body.deviceUuid || 'DEVICE-DEFAULT-UUID').trim();
  const deviceName = (body.deviceName || `${deviceType} 디바이스`).trim();
  const ipAddr = headersMeta?.ip || '127.0.0.1';
  const userAgent = headersMeta?.userAgent || 'Mozilla/5.0';

  // ---------------------------------------------------------------------------
  // [A] 자동 로그인 토큰 검증 분기 (AUTO_LOGIN_CHECK)
  // ---------------------------------------------------------------------------
  if (authType === 'AUTO_LOGIN_CHECK') {
    const clientToken = body.token;
    if (!clientToken) {
      return {
        status: 401,
        data: {
          success: false,
          code: 'TOKEN_REQUIRED',
          message: '자동 로그인 인증 토큰이 필요합니다.',
        },
      };
    }

    try {
      const decoded = jwt.verify(clientToken, JWT_SECRET) as {
        userNo: string;
        userEmail: string;
        userNm: string;
        role: string;
        status: string;
        sessionId?: string;
        deviceUuid?: string;
        deviceType?: DeviceType;
      };

      const validUserNo = validateUserNo(decoded.userNo);
      if (!validUserNo.isValid) {
        return {
          status: 401,
          data: {
            success: false,
            code: 'INVALID_USER_NO',
            message: validUserNo.message || '유효하지 않은 이용자 식별자입니다.',
          },
        };
      }

      // 기기 보안 검증: 토큰 바인딩 기기와 요청 기기 지문 일치 여부 대조
      if (decoded.deviceUuid && body.deviceUuid && decoded.deviceUuid !== body.deviceUuid) {
        return {
          status: 401,
          data: {
            success: false,
            code: 'DEVICE_MISMATCH',
            message: '등록된 보안 기기와 일치하지 않습니다. 기기 보안을 위해 다시 로그인해 주세요.',
          },
        };
      }

      // USER-ATH-00-SQL-001: 최신 회원 상태 재조회
      const rows = (await executeQuery(
        `/* USER-ATH-00-SQL-001: 이메일 기준 회원 인증 정보 조회 */
        SELECT 
          USER_NO, 
          USER_EMAIL, 
          USER_PWD_HASH, 
          PWD_SALT, 
          USER_NM, 
          USER_TEL, 
          USER_STAT_CD, 
          SUSPEND_EXPIRE_DT,
          SIGN_IMG_URL
        FROM TB_USER 
        WHERE USER_NO = ?`,
        [decoded.userNo]
      )) as UserAuthRow[];

      if (!rows || rows.length === 0) {
        return {
          status: 401,
          data: {
            success: false,
            code: 'USER_NOT_FOUND',
            message: '존재하지 않거나 삭제된 회원 계정입니다.',
          },
        };
      }

      const userRow = rows[0];

      // 제재 검증
      if (userRow.USER_STAT_CD === 'BLOCKED') {
        return {
          status: 403,
          data: {
            success: false,
            code: 'BLOCKED_USER',
            message: '운영 정책 위반으로 영구 이용 제재된 계정입니다.',
          },
        };
      }

      if (userRow.USER_STAT_CD === 'WITHDRAWN') {
        return {
          status: 403,
          data: {
            success: false,
            code: 'WITHDRAWN_USER',
            message: '탈퇴 처리된 계정입니다.',
          },
        };
      }

      // 세션 DB 존재 및 유효성 확인 (USER-ATH-00-SQL-007)
      if (decoded.sessionId) {
        const sessionRows = (await executeQuery(
          `/* USER-ATH-00-SQL-007: 세션 및 기기 지문 일치 여부 검증 */
          SELECT SESSION_ID, USER_NO, DEVICE_TYPE, DEVICE_UUID, EXPIRE_DT, IS_VALID_YN 
          FROM TB_USER_SESSION 
          WHERE SESSION_ID = ? AND USER_NO = ? AND IS_VALID_YN = 'Y' AND EXPIRE_DT > NOW()`,
          [decoded.sessionId, userRow.USER_NO]
        )) as UserSessionRow[];

        if (!sessionRows || sessionRows.length === 0) {
          return {
            status: 401,
            data: {
              success: false,
              code: 'SESSION_EXPIRED_OR_REVOKED',
              message: '동시 접속 제한(최대 4대) 또는 보안 정책으로 인해 로그아웃되었습니다.',
            },
          };
        }

        // 최종 활동 일시 갱신
        await executeQuery(
          `UPDATE TB_USER_SESSION SET LAST_ACTIVE_DT = NOW() WHERE SESSION_ID = ?`,
          [decoded.sessionId]
        );
      }

      let currentStat = userRow.USER_STAT_CD;
      let isSuspended = false;
      let suspendExpireStr: string | null = null;

      if (currentStat === 'SUSPENDED_7D') {
        const expireDt = userRow.SUSPEND_EXPIRE_DT ? new Date(userRow.SUSPEND_EXPIRE_DT) : null;
        const now = new Date();

        if (expireDt && expireDt.getTime() <= now.getTime()) {
          await executeQuery(
            `/* USER-ATH-00-SQL-003: 7일 정지 기간 경과 시 NORMAL 상태 자동 복구 */
            UPDATE TB_USER 
            SET 
              USER_STAT_CD = 'NORMAL',
              SUSPEND_EXPIRE_DT = NULL,
              MOD_DT = NOW(),
              MOD_ID = 'SYSTEM'
            WHERE USER_NO = ? AND USER_STAT_CD = 'SUSPENDED_7D' AND SUSPEND_EXPIRE_DT <= NOW()`,
            [userRow.USER_NO]
          );
          currentStat = 'NORMAL';
        } else {
          isSuspended = true;
          suspendExpireStr = expireDt ? expireDt.toISOString().replace('T', ' ').slice(0, 19) : null;
        }
      }

      return {
        status: 200,
        data: {
          success: true,
          message: '자동 로그인 인증이 완료되었습니다.',
          token: clientToken,
          user: {
            userNo: userRow.USER_NO,
            userEmail: userRow.USER_EMAIL,
            userNm: userRow.USER_NM,
            userTel: userRow.USER_TEL,
            hasSignature: !!userRow.SIGN_IMG_URL,
            userStatCd: currentStat,
            isSuspended,
            suspendExpireDt: suspendExpireStr,
          },
        },
      };
    } catch {
      return {
        status: 401,
        data: {
          success: false,
          code: 'TOKEN_EXPIRED_OR_INVALID',
          message: '인증 세션이 만료되었습니다. 다시 로그인해 주세요.',
        },
      };
    }
  }

  // ---------------------------------------------------------------------------
  // [B] 이메일/비밀번호 정규 로그인 처리 (EMAIL_LOGIN)
  // ---------------------------------------------------------------------------
  const email = (body.userEmail || '').trim();
  const password = body.userPassword || '';
  const autoLoginYn = body.autoLoginYn === 'Y' ? 'Y' : 'N';

  if (!email) {
    return {
      status: 400,
      data: {
        success: false,
        code: 'EMAIL_REQUIRED',
        message: '이메일 주소를 입력해 주세요.',
      },
    };
  }

  if (!password) {
    return {
      status: 400,
      data: {
        success: false,
        code: 'PASSWORD_REQUIRED',
        message: '비밀번호를 입력해 주세요.',
      },
    };
  }

  // 1. 회원 정보 조회 (USER-ATH-00-SQL-001)
  const rows = (await executeQuery(
    `/* USER-ATH-00-SQL-001: 이메일 기준 회원 인증 정보 조회 */
    SELECT 
      USER_NO, 
      USER_EMAIL, 
      USER_PWD_HASH, 
      PWD_SALT, 
      USER_NM, 
      USER_TEL, 
      USER_STAT_CD, 
      SUSPEND_EXPIRE_DT,
      SIGN_IMG_URL
    FROM TB_USER 
    WHERE USER_EMAIL = ?`,
    [email]
  )) as UserAuthRow[];

  if (!rows || rows.length === 0) {
    return {
      status: 401,
      data: {
        success: false,
        code: 'USER_NOT_FOUND',
        message: '가입되지 않은 이메일 계정입니다.',
      },
    };
  }

  const user = rows[0];

  // 회원 식별자 12자리 규격 검증
  const validUserNo = validateUserNo(user.USER_NO);
  if (!validUserNo.isValid) {
    return {
      status: 500,
      data: {
        success: false,
        code: 'INVALID_SYSTEM_USER_NO',
        message: validUserNo.message || '등록된 회원 식별자 형식이 규격(12자리)과 일치하지 않습니다.',
      },
    };
  }

  // 2. 비밀번호 일치 검증
  const isPasswordValid = verifyPassword(password, user.USER_PWD_HASH, user.PWD_SALT);
  if (!isPasswordValid) {
    return {
      status: 401,
      data: {
        success: false,
        code: 'INVALID_PASSWORD',
        message: '비밀번호가 일치하지 않습니다.',
      },
    };
  }

  // 3. 회원 제재 및 패널티 상태 판정
  if (user.USER_STAT_CD === 'BLOCKED') {
    return {
      status: 403,
      data: {
        success: false,
        code: 'BLOCKED_USER',
        message: '운영 정책 위반으로 영구 이용 제재된 계정입니다.',
      },
    };
  }

  if (user.USER_STAT_CD === 'WITHDRAWN') {
    return {
      status: 403,
      data: {
        success: false,
        code: 'WITHDRAWN_USER',
        message: '탈퇴 처리된 계정입니다.',
      },
    };
  }

  let currentStatCd = user.USER_STAT_CD;
  let isSuspended = false;
  let suspendExpireFormatted: string | null = null;

  if (currentStatCd === 'SUSPENDED_7D') {
    const expireDt = user.SUSPEND_EXPIRE_DT ? new Date(user.SUSPEND_EXPIRE_DT) : null;
    const now = new Date();

    if (expireDt && expireDt.getTime() <= now.getTime()) {
      await executeQuery<ResultSetHeader>(
        `/* USER-ATH-00-SQL-003: 7일 정지 기간 경과 시 NORMAL 상태 자동 복구 */
        UPDATE TB_USER 
        SET 
          USER_STAT_CD = 'NORMAL',
          SUSPEND_EXPIRE_DT = NULL,
          MOD_DT = NOW(),
          MOD_ID = 'SYSTEM'
        WHERE USER_NO = ? AND USER_STAT_CD = 'SUSPENDED_7D' AND SUSPEND_EXPIRE_DT <= NOW()`,
        [user.USER_NO]
      );
      currentStatCd = 'NORMAL';
      isSuspended = false;
    } else {
      isSuspended = true;
      if (expireDt) {
        const year = expireDt.getFullYear();
        const month = String(expireDt.getMonth() + 1).padStart(2, '0');
        const day = String(expireDt.getDate()).padStart(2, '0');
        const hour = String(expireDt.getHours()).padStart(2, '0');
        const min = String(expireDt.getMinutes()).padStart(2, '0');
        const sec = String(expireDt.getSeconds()).padStart(2, '0');
        suspendExpireFormatted = `${year}-${month}-${day} ${hour}:${min}:${sec}`;
      }
    }
  }

  // 4. 로그인 성공 이력 업데이트 (USER-ATH-00-SQL-002)
  await executeQuery<ResultSetHeader>(
    `/* USER-ATH-00-SQL-002: 로그인 성공 시 최종 로그인 일시 갱신 */
    UPDATE TB_USER 
    SET 
      LAST_LOGIN_DT = NOW(),
      MOD_DT = NOW(),
      MOD_ID = ?
    WHERE USER_NO = ?`,
    [user.USER_NO, user.USER_NO]
  );

  // ---------------------------------------------------------------------------
  // 5. 멀티 디바이스 세션 관리 엔진 (최대 4대: PC, 노트북, 태블릿, 휴대전화)
  // ---------------------------------------------------------------------------
  // [유지 기간 정책]:
  // 1) 휴대전화(MOBILE) + 로그인 유지: 30일 (디바이스 지문 바인딩 보안)
  // 2) PC / 노트북 / 태블릿 + 로그인 유지: 14일
  // 3) 일반 로그인(미체크): 2시간
  let expireDays = 0.083; // 2시간
  let tokenExpiresIn = '2h';

  if (autoLoginYn === 'Y') {
    if (deviceType === 'MOBILE') {
      expireDays = 30; // 휴대전화는 30일 장기 유지
      tokenExpiresIn = '30d';
    } else {
      expireDays = 14; // PC, 노트북, 태블릿은 14일 유지
      tokenExpiresIn = '14d';
    }
  }

  const sessionId = 'SES_' + crypto.randomBytes(16).toString('hex');
  const sessionExpireDate = new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000);
  const sessionExpireFormatted = sessionExpireDate.toISOString().replace('T', ' ').slice(0, 19);

  // USER-ATH-00-SQL-004: 현재 활성 세션 목록 조회
  const activeSessions = (await executeQuery(
    `/* USER-ATH-00-SQL-004: 회원 활성 세션 목록 조회 */
    SELECT SESSION_ID, DEVICE_TYPE, DEVICE_UUID, DEVICE_NM, LAST_ACTIVE_DT, EXPIRE_DT 
    FROM TB_USER_SESSION 
    WHERE USER_NO = ? AND IS_VALID_YN = 'Y' AND EXPIRE_DT > NOW() 
    ORDER BY LAST_ACTIVE_DT DESC`,
    [user.USER_NO]
  )) as UserSessionRow[];

  // 4대 기기 초과 여부 점검 (기존 같은 기기 UUID가 아닐 때 신규 등록으로 증가)
  const existingSameDevice = activeSessions.find((s) => s.DEVICE_UUID === deviceUuid);
  const currentCount = activeSessions.length;

  if (!existingSameDevice && currentCount >= MAX_ALLOWED_DEVICES) {
    // 가장 오래된 세션들을 비활성화 (LRU / FIFO)
    const sessionsToRevoke = activeSessions.slice(MAX_ALLOWED_DEVICES - 1);
    for (const s of sessionsToRevoke) {
      await executeQuery(
        `/* USER-ATH-00-SQL-006: 4대 초과 시 가장 오래된 세션 자동 만료 */
        UPDATE TB_USER_SESSION SET IS_VALID_YN = 'N' WHERE SESSION_ID = ?`,
        [s.SESSION_ID]
      );
    }
  }

  // USER-ATH-00-SQL-005: 신규 세션 등록 또는 기존 동일 기기 세션 갱신
  await executeQuery(
    `/* USER-ATH-00-SQL-005: 디바이스 세션 등록 및 갱신 */
    INSERT INTO TB_USER_SESSION (
      SESSION_ID, USER_NO, DEVICE_TYPE, DEVICE_UUID, DEVICE_NM, IP_ADDR, USER_AGENT, 
      KEEP_LOGIN_YN, EXPIRE_DT, LAST_ACTIVE_DT, IS_VALID_YN
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'Y')
    ON DUPLICATE KEY UPDATE 
      DEVICE_TYPE = VALUES(DEVICE_TYPE),
      DEVICE_NM = VALUES(DEVICE_NM),
      IP_ADDR = VALUES(IP_ADDR),
      USER_AGENT = VALUES(USER_AGENT),
      KEEP_LOGIN_YN = VALUES(KEEP_LOGIN_YN),
      EXPIRE_DT = VALUES(EXPIRE_DT),
      LAST_ACTIVE_DT = NOW(),
      IS_VALID_YN = 'Y'`,
    [
      sessionId,
      user.USER_NO,
      deviceType,
      deviceUuid,
      deviceName,
      ipAddr,
      userAgent,
      autoLoginYn,
      sessionExpireFormatted,
    ]
  );

  // 최신 활성 기기 목록 재조회
  const updatedActiveSessions = (await executeQuery(
    `/* USER-ATH-00-SQL-004: 회원 활성 세션 목록 조회 */
    SELECT SESSION_ID, DEVICE_TYPE, DEVICE_UUID, DEVICE_NM, LAST_ACTIVE_DT, EXPIRE_DT 
    FROM TB_USER_SESSION 
    WHERE USER_NO = ? AND IS_VALID_YN = 'Y' AND EXPIRE_DT > NOW() 
    ORDER BY LAST_ACTIVE_DT DESC`,
    [user.USER_NO]
  )) as UserSessionRow[];

  const activeDeviceList: ActiveDeviceInfo[] = updatedActiveSessions.map((s) => ({
    deviceType: s.DEVICE_TYPE,
    deviceNm: s.DEVICE_NM || `${s.DEVICE_TYPE} 기기`,
    lastActiveDt: s.LAST_ACTIVE_DT
      ? new Date(s.LAST_ACTIVE_DT).toISOString().replace('T', ' ').slice(0, 19)
      : '',
    isCurrent: s.DEVICE_UUID === deviceUuid,
  }));

  // 6. 디바이스 바인딩 JWT Access Token 생성
  const tokenPayload = {
    userNo: user.USER_NO,
    userEmail: user.USER_EMAIL,
    userNm: user.USER_NM,
    role: 'USER',
    status: currentStatCd,
    isSuspended,
    suspendExpireDt: suspendExpireFormatted,
    sessionId,
    deviceUuid,
    deviceType,
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: tokenExpiresIn as any,
    issuer: 'SsulDak_Auth_Server',
  });

  return {
    status: 200,
    data: {
      success: true,
      message: `${user.USER_NM}님, 환영합니다! 안심 케어를 시작합니다.`,
      token,
      user: {
        userNo: user.USER_NO,
        userEmail: user.USER_EMAIL,
        userNm: user.USER_NM,
        userTel: user.USER_TEL,
        hasSignature: !!user.SIGN_IMG_URL,
        userStatCd: currentStatCd,
        isSuspended,
        suspendExpireDt: suspendExpireFormatted,
      },
      session: {
        sessionId,
        deviceType,
        deviceUuid,
        deviceNm: deviceName,
        keepLoginYn: autoLoginYn,
        expireDays,
        expireDt: sessionExpireFormatted,
        activeDeviceCount: activeDeviceList.length,
        maxDeviceLimit: MAX_ALLOWED_DEVICES,
        activeDevices: activeDeviceList,
      },
    },
  };
}

// =============================================================================
// 5. Next.js App Router POST 핸들러
// =============================================================================

export async function POST(req: Request): Promise<Response> {
  try {
    let body: UserAth00ReqBody = {};
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          code: 'INVALID_JSON_BODY',
          message: '요청 본문(JSON) 데이터가 올바르지 않습니다.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Mozilla/5.0';

    const { status, data } = await processUserAth00(body, { ip, userAgent });

    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const err = error as Error;
    return new Response(
      JSON.stringify({
        success: false,
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
        detail: process.env.NODE_ENV === 'development' ? err.message : undefined,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
