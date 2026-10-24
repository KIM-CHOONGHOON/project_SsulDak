/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 프론트엔드 컴포넌트
 * 화면 ID: USER-ATH-00 (이용자 로그인 및 인증)
 * 화면 프론트엔드 경로: SsulDak_Web/User/frontend/USER-ATH-00/index.tsx
 * 백엔드 모듈 경로    : SsulDak_Web/User/backend/api_USER_ATH_00/route.ts
 * API 엔드포인트 URL  : POST /api/user/user_ath_00
 * 전용 쿼리 식별자    : USER-ATH-00-SQL-001, USER-ATH-00-SQL-002, USER-ATH-00-SQL-003
 *
 * [회원 식별자 12자리 고정 규격: CHAR(12)]
 *   - 1바이트: 역할 코드 ('U': 사용자, 'P': 파트너, 'A': 관리자)
 *   - 6바이트: 가입 년월 (YYYYMM)
 *   - 5바이트: 일련번호 (00001~, 1부터 시작하되 앞자리를 '0'으로 채운 5바이트)
 *   - 총 12바이트 필수 충족 (예: U20261000001)
 *
 * [플랫폼 공식 브랜드 로고 원칙]
 *   - 반드시 첨부된 공식 원형 엠블럼 로고(/logo.png)를 일관되게 렌더링한다.
 * =============================================================================
 */

'use client';

import React, { useState, useEffect, useCallback, useId } from 'react';

// =============================================================================
// 회원 식별자 12자리 정규식 및 유효성 검증 함수
// =============================================================================

export const MEMBER_NO_TOTAL_LENGTH = 12;
export const USER_NO_REGEX = /^U(20\d{2})(0[1-9]|1[0-2])(\d{5})$/;

export function validateUserNo(userNo: string | null | undefined): { isValid: boolean; message?: string } {
  if (userNo === null || userNo === undefined || userNo === '') {
    return { isValid: true };
  }

  const trimmed = userNo.trim();
  if (trimmed.length !== MEMBER_NO_TOTAL_LENGTH) {
    return {
      isValid: false,
      message: `회원 식별자는 반드시 12자리여야 합니다. (현재: ${trimmed.length}자리)`,
    };
  }

  if (!trimmed.startsWith('U')) {
    return {
      isValid: false,
      message: `이용자 식별자는 'U'로 시작해야 합니다. ('U': 사용자, 'P': 파트너, 'A': 관리자)`,
    };
  }

  if (!USER_NO_REGEX.test(trimmed)) {
    return {
      isValid: false,
      message: `회원 식별자 규격 오류입니다. (U + YYYYMM 6자리 + 순번 5자리, 예: U20261000001)`,
    };
  }

  return { isValid: true };
}

// =============================================================================
// 인터페이스 정의
// =============================================================================

export interface AuthUser {
  userNo: string;
  userEmail: string;
  userNm: string;
  userTel: string | null;
  hasSignature: boolean;
  userStatCd: 'NORMAL' | 'SUSPENDED_7D' | 'BLOCKED' | 'WITHDRAWN';
  isSuspended: boolean;
  suspendExpireDt: string | null;
}

export interface UserAth00Props {
  onLoginSuccess?: (authData: { token: string; user: AuthUser; session?: any }) => void;
  onNavigate?: (path: string) => void;
  initialEmail?: string;
  logoSrc?: string;
  apiEndpoint?: string;
}

// =============================================================================
// 기기 유형 자동 판별 및 고유 UUID 생성 헬퍼 (PC, 노트북, 태블릿, 휴대전화 4대 관리)
// =============================================================================

export type ClientDeviceType = 'PC' | 'NOTEBOOK' | 'TABLET' | 'MOBILE';

export const detectDeviceType = (): ClientDeviceType => {
  if (typeof window === 'undefined') return 'PC';
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  if (/mobile|iphone|ipod|android.*mobile|blackberry|iemobile/.test(ua)) {
    return 'MOBILE';
  }
  if (/ipad|tablet|android(?!.*mobile)/.test(ua) || (width >= 768 && width <= 1024 && 'ontouchstart' in window)) {
    return 'TABLET';
  }
  if (/macintosh|mac os x/.test(ua) && !/iphone|ipad|ipod/.test(ua)) {
    return width <= 1440 ? 'NOTEBOOK' : 'PC';
  }
  if (/windows/.test(ua)) {
    return width <= 1440 ? 'NOTEBOOK' : 'PC';
  }
  return 'PC';
};

export const getOrCreateDeviceUuid = (): string => {
  if (typeof window === 'undefined') return 'DEVICE-SERVER-UUID';
  let uuid = localStorage.getItem('ssuldak_device_uuid');
  if (!uuid) {
    uuid = 'DEV-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    localStorage.setItem('ssuldak_device_uuid', uuid);
  }
  return uuid;
};

export const getDeviceFriendlyName = (type: ClientDeviceType): string => {
  if (typeof window === 'undefined') return 'PC';
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone 모바일';
  if (/iPad/.test(ua)) return 'iPad 태블릿';
  if (/Android/.test(ua)) return type === 'TABLET' ? 'Galaxy Tab' : 'Galaxy 휴대전화';
  if (/Mac/.test(ua)) return type === 'NOTEBOOK' ? 'MacBook 랩톱' : 'iMac 데스크톱';
  if (/Windows/.test(ua)) return type === 'NOTEBOOK' ? 'Windows 노트북' : 'Windows PC';
  if (type === 'MOBILE') return '스마트폰 (휴대전화)';
  if (type === 'NOTEBOOK') return '휴대용 노트북';
  if (type === 'TABLET') return '스마트 태블릿';
  return '데스크톱 PC';
};

// =============================================================================
// 메인 컴포넌트: UserAth00Screen
// =============================================================================

export const UserAth00Screen: React.FC<UserAth00Props> = ({
  onLoginSuccess,
  onNavigate,
  initialEmail = '',
  logoSrc = '/logo.png',
  apiEndpoint = '/api/user/user_ath_00',
}) => {
  // 고유 ID
  const emailInputId = useId();
  const passwordInputId = useId();
  const keepLoggedInId = useId();
  const saveEmailId = useId();

  // 입력 폼 상태
  const [email, setEmail] = useState<string>(initialEmail);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState<boolean>(true);
  const [saveEmail, setSaveEmail] = useState<boolean>(false);
  const [deviceType, setDeviceType] = useState<ClientDeviceType>('PC');

  // 인터랙션 & 유효성 상태
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [failCount, setFailCount] = useState<number>(0);
  const [lockoutRemainingSec, setLockoutRemainingSec] = useState<number>(0);

  // 피드백 토스트 & 모달 상태
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'info' });

  const [suspendModal, setSuspendModal] = useState<{
    show: boolean;
    expireDt: string;
    pendingAuthData?: { token: string; user: AuthUser };
  }>({ show: false, expireDt: '' });

  const [lockoutModal, setLockoutModal] = useState<boolean>(false);

  // ---------------------------------------------------------------------------
  // [초기화] 아이디 저장 로컬스토리지 복원 & 락다운 타이머 & 기기 판별
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDeviceType(detectDeviceType());
      const savedEmail = localStorage.getItem('ssuldak_saved_email');
      if (savedEmail) {
        setEmail(savedEmail);
        setSaveEmail(true);
      }

      // 연속 5회 오류 락다운 시간 체크
      const lockoutUntil = localStorage.getItem('ssuldak_login_lockout_until');
      if (lockoutUntil) {
        const remaining = Math.ceil((parseInt(lockoutUntil, 10) - Date.now()) / 1000);
        if (remaining > 0) {
          setLockoutRemainingSec(remaining);
          setLockoutModal(true);
        } else {
          localStorage.removeItem('ssuldak_login_lockout_until');
          localStorage.removeItem('ssuldak_login_fail_count');
        }
      }

      const storedFailCount = localStorage.getItem('ssuldak_login_fail_count');
      if (storedFailCount) {
        setFailCount(parseInt(storedFailCount, 10));
      }
    }
  }, []);

  // ---------------------------------------------------------------------------
  // [타이머] 락다운 카운트다운
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (lockoutRemainingSec <= 0) return;

    const interval = setInterval(() => {
      setLockoutRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('ssuldak_login_lockout_until');
            localStorage.removeItem('ssuldak_login_fail_count');
          }
          setFailCount(0);
          setLockoutModal(false);
          showToast('로그인 잠금이 해제되었습니다. 다시 시도해 주세요.', 'info');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [lockoutRemainingSec]);

  // ---------------------------------------------------------------------------
  // [토스트 헬퍼]
  // ---------------------------------------------------------------------------
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ show: true, message, type });
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3200);
    return () => clearTimeout(timer);
  }, []);

  // ---------------------------------------------------------------------------
  // [실시간 이메일 유효성 검사]
  // ---------------------------------------------------------------------------
  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (!val) {
      setEmailError('이메일 계정을 입력해 주세요.');
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)) {
      setEmailError('올바른 이메일 형식이 아닙니다 (예: example@ssuldak.com)');
    } else {
      setEmailError('');
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (passwordError && val.trim().length > 0) {
      setPasswordError('');
    }
  };

  // ---------------------------------------------------------------------------
  // [네비게이션 헬퍼]
  // ---------------------------------------------------------------------------
  const handleNav = (targetPath: string) => {
    if (onNavigate) {
      onNavigate(targetPath);
    } else if (typeof window !== 'undefined') {
      if (targetPath === 'service-overview' || targetPath === 'USER-COM-00' || targetPath === '/') {
        window.location.href = '/';
      } else {
        showToast(`'${targetPath}' 화면으로 이동을 준비 중입니다.`, 'info');
      }
    }
  };

  // ---------------------------------------------------------------------------
  // [로그인 폼 제출]
  // ---------------------------------------------------------------------------
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. 락다운 상태 점검
    if (lockoutRemainingSec > 0) {
      setLockoutModal(true);
      return;
    }

    // 2. 유효성 검증
    let hasError = false;
    if (!email.trim()) {
      setEmailError('이메일 주소를 입력해 주세요.');
      hasError = true;
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim())) {
      setEmailError('올바른 이메일 형식이 아닙니다.');
      hasError = true;
    }

    if (!password) {
      setPasswordError('비밀번호를 입력해 주세요.');
      hasError = true;
    }

    if (hasError) return;

    setIsLoading(true);

    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authType: 'EMAIL_LOGIN',
          userEmail: email.trim(),
          userPassword: password,
          autoLoginYn: keepLoggedIn ? 'Y' : 'N',
          deviceType: deviceType,
          deviceUuid: getOrCreateDeviceUuid(),
          deviceName: getDeviceFriendlyName(deviceType),
        }),
      });

      const resData = await response.json();

      // [A] 로그인 성공 (HTTP 200)
      if (response.ok && resData.success) {
        // 1. 실패 카운트 리셋
        setFailCount(0);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ssuldak_login_fail_count');
          localStorage.removeItem('ssuldak_login_lockout_until');

          // 아이디 저장 처리
          if (saveEmail) {
            localStorage.setItem('ssuldak_saved_email', email.trim());
          } else {
            localStorage.removeItem('ssuldak_saved_email');
          }

          // 토큰, 사용자 정보, 세션 보안 정보 저장
          if (resData.token) {
            localStorage.setItem('ssuldak_token', resData.token);
          }
          if (resData.user) {
            localStorage.setItem('ssuldak_user', JSON.stringify(resData.user));
          }
          if (resData.session) {
            localStorage.setItem('ssuldak_session', JSON.stringify(resData.session));
          }
        }

        const authUser: AuthUser = resData.user;
        const sessionInfo = resData.session;

        // 2. 7일 정지 이용자 팝업 안내 처리
        if (authUser.isSuspended && authUser.suspendExpireDt) {
          setIsLoading(false);
          setSuspendModal({
            show: true,
            expireDt: authUser.suspendExpireDt,
            pendingAuthData: { token: resData.token, user: authUser },
          });
          return;
        }

        // 3. 정상 로그인 안내 및 리다이렉트 (기기 연결 피드백 포함)
        const deviceFeedback = sessionInfo
          ? ` (${sessionInfo.deviceNm} 연결, ${sessionInfo.activeDeviceCount}/${sessionInfo.maxDeviceLimit}대 기기 사용 중)`
          : '';
        showToast(resData.message || `${authUser.userNm}님, 환영합니다!${deviceFeedback}`, 'success');

        setTimeout(() => {
          setIsLoading(false);
          if (onLoginSuccess) {
            onLoginSuccess({ token: resData.token, user: authUser, session: sessionInfo });
          } else {
            handleNav('USER-COM-00');
          }
        }, 800);

        return;
      }

      // [B] 로그인 실패 처리 (401, 403, 500 등)
      setIsLoading(false);

      if (resData.code === 'INVALID_PASSWORD') {
        const nextFail = failCount + 1;
        setFailCount(nextFail);

        if (typeof window !== 'undefined') {
          localStorage.setItem('ssuldak_login_fail_count', String(nextFail));
        }

        if (nextFail >= 5) {
          // 5회 연속 실패 -> 10분 락다운
          const lockoutTime = Date.now() + 10 * 60 * 1000;
          if (typeof window !== 'undefined') {
            localStorage.setItem('ssuldak_login_lockout_until', String(lockoutTime));
          }
          setLockoutRemainingSec(600);
          setLockoutModal(true);
          return;
        }

        setPasswordError(`비밀번호가 일치하지 않습니다. (연속 ${nextFail}/5회 오류)`);
        showToast(`비밀번호가 일치하지 않습니다. (연속 ${nextFail}/5회)`, 'error');
      } else if (resData.code === 'USER_NOT_FOUND') {
        setEmailError('가입되지 않은 이메일 계정입니다.');
        showToast('가입되지 않은 이메일 계정입니다. 회원가입을 진행해 주세요.', 'error');
      } else if (resData.code === 'BLOCKED_USER') {
        showToast('운영 정책 위반으로 영구 이용 제재된 계정입니다. 고객센터에 문의해 주세요.', 'error');
      } else if (resData.code === 'WITHDRAWN_USER') {
        showToast('탈퇴 처리된 계정입니다.', 'error');
      } else {
        showToast(resData.message || '로그인 처리에 실패했습니다. 입력값을 확인해 주세요.', 'error');
      }
    } catch {
      setIsLoading(false);
      showToast('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    }
  };

  // ---------------------------------------------------------------------------
  // [소셜 간편 로그인]
  // ---------------------------------------------------------------------------
  const handleSocialLogin = (provider: 'Kakao' | 'Naver' | 'Google' | 'Apple') => {
    showToast(`${provider} 간편 인증 세션을 연결하고 있습니다...`, 'info');
  };

  // ---------------------------------------------------------------------------
  // [7일 정지 모달 닫기 후 진행]
  // ---------------------------------------------------------------------------
  const handleCloseSuspendModal = () => {
    const data = suspendModal.pendingAuthData;
    setSuspendModal({ show: false, expireDt: '' });

    if (data) {
      showToast('로그인이 완료되었습니다. (신규 견적 신청 제한 상태)', 'info');
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess(data);
        } else {
          handleNav('USER-COM-00');
        }
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased flex flex-col justify-between selection:bg-secondary/20">
      {/* =======================================================================
          TOP GLOBAL HEADER (GNB)
          ======================================================================= */}
      <header className="fixed top-0 w-full z-40 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-surface-container-high/50 transition-all">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* 브랜드 로고 (공식 원형 엠블럼) */}
          <button
            type="button"
            onClick={() => handleNav('USER-COM-00')}
            className="flex items-center gap-3 text-primary no-underline group cursor-pointer focus:outline-none"
            aria-label="SsulDak 쓸고닦고 메인 홈으로 이동"
          >
            <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-primary shadow-sm ring-1 ring-primary/10 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <img
                src={logoSrc}
                alt="SsulDak 쓸고닦고 공식 로고"
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback 아이콘
                  (e.currentTarget as HTMLElement).style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.fallback-logo');
                  if (fallback) (fallback as HTMLElement).style.display = 'flex';
                }}
              />
              <span className="fallback-logo hidden material-symbols-outlined text-on-primary text-[22px]">
                cleaning_services
              </span>
            </div>
            <div className="flex flex-col text-left">
              <span className="font-headline-sm font-bold text-primary leading-tight tracking-tight">
                SsulDak
              </span>
              <span className="font-label-sm text-secondary font-bold -mt-0.5">
                쓸고닦고
              </span>
            </div>
          </button>

          {/* 홈으로 돌아가기 버튼 */}
          <button
            type="button"
            onClick={() => handleNav('USER-COM-00')}
            className="inline-flex items-center gap-1.5 font-label-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer py-1.5 px-3 rounded-lg hover:bg-surface-container/60"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Back to Home</span>
          </button>
        </div>
      </header>

      {/* =======================================================================
          MAIN AUTHENTICATION CONTAINER
          ======================================================================= */}
      <main className="w-full pt-20 pb-12 bg-surface min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col w-full py-6 md:py-10 px-4 sm:px-6 lg:px-8 items-center justify-center">
          {/* Desktop Login Card Container */}
          <div className="w-full max-w-5xl bg-surface-container-lowest rounded-3xl shadow-xl overflow-hidden flex flex-col lg:flex-row transition-all duration-300 border border-surface-container-high/60">
            {/* -----------------------------------------------------------------
                LEFT PANEL: Brand Heritage & Trust Pillars (approx 44%)
                ----------------------------------------------------------------- */}
            <div className="relative lg:w-[44%] bg-primary-container text-on-primary p-8 sm:p-10 lg:p-12 flex flex-col justify-between overflow-hidden">
              {/* Ambient Radial Shimmers & Architectural Glows */}
              <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-secondary/20 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-primary-fixed-dim/15 blur-3xl pointer-events-none" />

              {/* Decorative Geometric SVG Pattern */}
              <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none">
                <svg
                  className="w-full h-full"
                  fill="none"
                  viewBox="0 0 400 600"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    cx="360"
                    cy="80"
                    r="140"
                    stroke="currentColor"
                    strokeDasharray="4 8"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx="360"
                    cy="80"
                    r="220"
                    stroke="currentColor"
                    strokeDasharray="6 12"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M-40 400C80 360 220 480 440 380"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* Left Top: Micro Badge & Headline */}
              <div className="relative z-10 flex flex-col gap-5">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-lowest/10 backdrop-blur-md self-start border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse" />
                  <span className="font-label-sm text-secondary-fixed tracking-wide uppercase font-semibold">
                    Institutional Hygiene Standard
                  </span>
                </div>

                <div className="space-y-3">
                  <h1 className="font-display text-[26px] sm:text-[30px] lg:text-[34px] leading-tight text-on-primary tracking-tight whitespace-pre-line font-extrabold">
                    공간의 가치를 더하는{'\n'}스마트 청소 매칭,{'\n'}
                    <span className="text-secondary-fixed">쓸고닦고</span>
                  </h1>
                  <p className="font-body-md text-on-primary-container leading-relaxed">
                    검증된 마스터의 정밀하고 섬세한 케어로 완성되는
                    <br className="hidden sm:inline" /> 티 없이 산뜻하고 품격 있는 공간 솔루션.
                  </p>
                </div>

                {/* Trust Pillars Trio */}
                <div className="mt-4 flex flex-col gap-3">
                  {/* Pillar 1 */}
                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface-container-lowest/5 backdrop-blur-sm border border-white/5 hover:bg-surface-container-lowest/10 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-secondary/30 text-secondary-fixed flex items-center justify-center shrink-0">
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        verified_user
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-on-primary font-semibold">
                        100% 신원 및 범죄이력 심층 검증
                      </span>
                      <span className="font-body-sm text-on-primary-container text-xs">
                        엄격한 5단계 마스터 인증 필터링 통과
                      </span>
                    </div>
                  </div>

                  {/* Pillar 2 */}
                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface-container-lowest/5 backdrop-blur-sm border border-white/5 hover:bg-surface-container-lowest/10 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-primary-fixed-dim/20 text-primary-fixed flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">
                        published_with_changes
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-on-primary font-semibold">
                        불만족 시 100% 무상 재방문 보증
                      </span>
                      <span className="font-body-sm text-on-primary-container text-xs">
                        결과에 타협 없는 48시간 안심 리콜제 운영
                      </span>
                    </div>
                  </div>

                  {/* Pillar 3 */}
                  <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-surface-container-lowest/5 backdrop-blur-sm border border-white/5 hover:bg-surface-container-lowest/10 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-tertiary-fixed/20 text-tertiary-fixed flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">
                        security
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-on-primary font-semibold">
                        삼성화재 최대 1억원 영업배상책임보험
                      </span>
                      <span className="font-body-sm text-on-primary-container text-xs">
                        작업 전 과정 대물·대인 보상 완전 보장
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Left Bottom: Promotional Value Card & Quality Stamp */}
              <div className="relative z-10 mt-8 pt-6">
                <button
                  type="button"
                  onClick={() => showToast('신규 가입 시 15,000원 쿠폰팩이 즉시 발급됩니다.', 'info')}
                  className="w-full p-4 rounded-2xl bg-surface-container-lowest/10 backdrop-blur-md flex items-center justify-between gap-3 border border-white/10 hover:bg-surface-container-lowest/20 transition-all text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center font-bold shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[22px]">
                        redeem
                      </span>
                    </div>
                    <div>
                      <div className="font-label-sm text-tertiary-fixed font-bold tracking-wider text-[11px]">
                        WELCOME BENEFIT
                      </div>
                      <div className="font-label-md text-on-primary font-semibold">
                        신규 가입 즉시 15,000원 쿠폰팩
                      </div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-secondary-fixed text-[20px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </button>

                <div className="flex items-center justify-between text-on-primary-container font-label-sm mt-5 pt-3 border-t border-white/10">
                  <span>누적 고객 만족도 99.4%</span>
                  <span className="inline-flex items-center gap-1 text-on-primary font-semibold">
                    <span
                      className="material-symbols-outlined text-tertiary-fixed text-[16px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                    4.98 / 5.0
                  </span>
                </div>
              </div>
            </div>

            {/* -----------------------------------------------------------------
                RIGHT PANEL: Authentication Form (approx 56%)
                ----------------------------------------------------------------- */}
            <div className="lg:w-[56%] bg-surface-container-lowest p-8 sm:p-10 lg:p-12 flex flex-col justify-between">
              <div>
                {/* Card Utility Top Navigation */}
                <div className="flex items-center justify-between mb-8">
                  <button
                    type="button"
                    onClick={() => handleNav('USER-COM-00')}
                    className="inline-flex items-center gap-1.5 font-label-md text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">home</span>
                    <span>홈으로</span>
                  </button>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container-high font-label-sm text-primary font-bold text-xs tracking-wide">
                    USER-ATH-00
                  </span>
                </div>

                {/* Section Title & Narrative */}
                <div className="mb-7">
                  <h2 className="font-headline-lg text-[26px] text-on-surface font-extrabold tracking-tight">
                    로그인
                  </h2>
                  <p className="font-body-md text-on-surface-variant mt-1.5">
                    청결한 일상을 관리하는 쓸고닦고 계정으로 접속해 주세요.
                  </p>
                </div>

                {/* Form Submission Section */}
                <form
                  className="space-y-4"
                  id="ssuldakLoginForm"
                  onSubmit={handleLoginSubmit}
                  noValidate
                >
                  {/* Email Input Group */}
                  <div className="space-y-1.5">
                    <label
                      className="block font-label-md text-on-surface font-semibold text-sm"
                      htmlFor={emailInputId}
                    >
                      이메일 계정
                    </label>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none transition-colors">
                        mail
                      </span>
                      <input
                        id={emailInputId}
                        type="email"
                        value={email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        placeholder="이메일 주소를 입력하세요 (example@ssuldak.com)"
                        disabled={isLoading || lockoutRemainingSec > 0}
                        required
                        className={`w-full h-12 pl-11 pr-4 rounded-xl bg-surface text-on-surface placeholder:text-outline font-body-md focus:outline-none focus:ring-2 transition-all duration-200 ${
                          emailError
                            ? 'ring-2 ring-error/80 bg-error-container/10'
                            : 'focus:ring-primary/20 focus:bg-surface-container-lowest'
                        }`}
                      />
                    </div>
                    {emailError && (
                      <p className="text-xs text-error font-medium pl-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        {emailError}
                      </p>
                    )}
                  </div>

                  {/* Password Input Group */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        className="block font-label-md text-on-surface font-semibold text-sm"
                        htmlFor={passwordInputId}
                      >
                        비밀번호
                      </label>
                      <button
                        type="button"
                        onClick={() => handleNav('USER-ATH-02')}
                        className="font-label-sm text-secondary hover:text-on-secondary-fixed-variant transition-colors cursor-pointer text-xs font-semibold"
                      >
                        비밀번호를 잊으셨나요?
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                        lock
                      </span>
                      <input
                        id={passwordInputId}
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => handlePasswordChange(e.target.value)}
                        placeholder="비밀번호 입력 (영문, 숫자 포함)"
                        disabled={isLoading || lockoutRemainingSec > 0}
                        required
                        className={`w-full h-12 pl-11 pr-11 rounded-xl bg-surface text-on-surface placeholder:text-outline font-body-md focus:outline-none focus:ring-2 transition-all duration-200 ${
                          passwordError
                            ? 'ring-2 ring-error/80 bg-error-container/10'
                            : 'focus:ring-primary/20 focus:bg-surface-container-lowest'
                        }`}
                      />
                      <button
                        type="button"
                        id="togglePasswordVisibility"
                        aria-label="비밀번호 표시/숨김 토글"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 p-1 rounded-lg text-outline hover:text-on-surface transition-colors flex items-center justify-center cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-xs text-error font-medium pl-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">error</span>
                        {passwordError}
                      </p>
                    )}
                  </div>

                  {/* Session Preferences & Flags */}
                  <div className="flex items-center justify-between pt-1 pb-1">
                    <label
                      htmlFor={keepLoggedInId}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <input
                        id={keepLoggedInId}
                        type="checkbox"
                        checked={keepLoggedIn}
                        onChange={(e) => setKeepLoggedIn(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-0 accent-primary cursor-pointer"
                      />
                      <span className="font-body-sm text-on-surface-variant font-medium text-xs sm:text-sm">
                        자동 로그인 유지
                      </span>
                    </label>

                    <label
                      htmlFor={saveEmailId}
                      className="flex items-center gap-2 cursor-pointer select-none"
                    >
                      <input
                        id={saveEmailId}
                        type="checkbox"
                        checked={saveEmail}
                        onChange={(e) => setSaveEmail(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-0 accent-primary cursor-pointer"
                      />
                      <span className="font-body-sm text-on-surface-variant font-medium text-xs sm:text-sm">
                        아이디 저장
                      </span>
                    </label>
                  </div>

                  {/* 멀티 디바이스(최대 4대) 및 기기별 보안 유지 기간 안내 배너 */}
                  <div className="p-3 rounded-2xl bg-surface-container/70 border border-surface-container-high/70 text-xs text-on-surface-variant flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[19px] text-primary shrink-0 mt-0.5">
                      {deviceType === 'MOBILE'
                        ? 'smartphone'
                        : deviceType === 'TABLET'
                        ? 'tablet_mac'
                        : deviceType === 'NOTEBOOK'
                        ? 'laptop_mac'
                        : 'desktop_windows'}
                    </span>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-semibold text-primary">
                        <span>현재 접속 기기: {getDeviceFriendlyName(deviceType)}</span>
                        <span className="px-2 py-0.5 rounded-full bg-primary/10 text-[10px] text-primary font-bold">
                          {keepLoggedIn
                            ? deviceType === 'MOBILE'
                              ? '30일 안심 세션 유지'
                              : '14일 안심 세션 유지'
                            : '2시간 보안 세션'}
                        </span>
                      </div>
                      <p className="text-[11px] text-outline leading-relaxed">
                        {deviceType === 'MOBILE'
                          ? '휴대전화 로그인 유지 시 최대 30일간 로그인 상태가 유지되며, 디바이스 지문 바인딩으로 타 기기 도용이 원천 차단됩니다. (PC, 노트북, 태블릿, 휴대전화 최대 4대까지 안전하게 동시 관리)'
                          : '로그인 유지 시 최대 14일간 안전하게 지속되며, PC·노트북·태블릿·휴대전화 최대 4대까지 동시 연결을 지원합니다.'}
                      </p>
                    </div>
                  </div>

                  {/* Submit Action Button */}
                  <button
                    type="submit"
                    id="loginSubmitBtn"
                    disabled={isLoading || lockoutRemainingSec > 0}
                    className="w-full h-[50px] mt-2 rounded-xl bg-primary text-on-primary font-label-lg font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary-container active:scale-[0.99] transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <span className="material-symbols-outlined text-[20px] animate-spin">
                          progress_activity
                        </span>
                        <span>로그인 중...</span>
                      </>
                    ) : lockoutRemainingSec > 0 ? (
                      <span>잠금 상태 ({Math.floor(lockoutRemainingSec / 60)}분 {lockoutRemainingSec % 60}초)</span>
                    ) : (
                      <>
                        <span>로그인</span>
                        <span className="material-symbols-outlined text-[18px]">
                          arrow_forward
                        </span>
                      </>
                    )}
                  </button>
                </form>

                {/* SNS Social Login Divider */}
                <div className="relative my-6 flex items-center justify-center">
                  <div className="w-full h-px bg-surface-container-high" />
                  <span className="absolute px-4 bg-surface-container-lowest font-label-sm text-outline text-xs">
                    또는 SNS 계정으로 로그인
                  </span>
                </div>

                {/* Social Buttons Grid (Kakao, Naver, Google) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Kakao Button */}
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('Kakao')}
                    className="h-11 rounded-xl bg-[#FEE500] text-[#191919] font-label-md font-semibold flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer shadow-sm text-sm"
                  >
                    <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M12 3C6.477 3 2 6.477 2 10.767c0 2.766 1.874 5.184 4.673 6.486-.205.74-.755 2.705-.863 3.125-.137.525.192.518.404.377.167-.11 2.658-1.802 3.733-2.533.67.098 1.36.149 2.053.149 5.523 0 10-3.477 10-7.767S17.523 3 12 3z" />
                    </svg>
                    <span className="truncate">카카오 3초</span>
                  </button>

                  {/* Naver Button */}
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('Naver')}
                    className="h-11 rounded-xl bg-[#03C75A] text-white font-label-md font-semibold flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer shadow-sm text-sm"
                  >
                    <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
                      <path d="M16.273 12.845 7.37 0H0v24h7.727V11.155L16.63 24H24V0h-7.727z" />
                    </svg>
                    <span className="truncate">네이버</span>
                  </button>

                  {/* Google Button (Replaced from Apple) */}
                  <button
                    type="button"
                    onClick={() => handleSocialLogin('Google')}
                    className="h-11 rounded-xl bg-white text-[#1f1f1f] border border-outline-variant/60 font-label-md font-semibold flex items-center justify-center gap-2 hover:bg-surface-container active:scale-[0.98] transition-all cursor-pointer shadow-sm text-sm"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span className="truncate">Google</span>
                  </button>
                </div>

                {/* Mini Assurance Trust Badges */}
                <div className="mt-6 p-3 rounded-2xl bg-surface-container flex items-center justify-around text-center">
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-xs">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      verified
                    </span>
                    <span>100% 신원 보증</span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-outline-variant" />
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-xs">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      eco
                    </span>
                    <span>친환경 약품 전용</span>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-outline-variant" />
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-xs">
                    <span className="material-symbols-outlined text-[16px] text-secondary">
                      thumb_up
                    </span>
                    <span>A/S 책임 보증제</span>
                  </div>
                </div>
              </div>

              {/* Footer & Account Context Paths */}
              <div className="mt-8 pt-5 text-center space-y-3">
                <div className="flex items-center justify-center gap-4 font-label-md text-on-surface-variant text-sm">
                  <button
                    type="button"
                    onClick={() => handleNav('USER-ATH-02')}
                    className="hover:text-primary transition-colors cursor-pointer"
                  >
                    아이디 / 비밀번호 찾기
                  </button>
                  <span className="w-1 h-3.5 bg-surface-container-high rounded-full" />
                  <button
                    type="button"
                    onClick={() => handleNav('USER-ATH-01')}
                    className="text-secondary font-bold hover:text-on-secondary-fixed-variant transition-colors cursor-pointer"
                  >
                    아직 회원이 아니신가요? 회원가입
                  </button>
                </div>
                <p className="font-body-sm text-outline max-w-sm mx-auto leading-relaxed text-xs">
                  로그인 시 SsulDak{' '}
                  <button
                    type="button"
                    onClick={() => showToast('이용약관 내용을 확인합니다.', 'info')}
                    className="underline hover:text-on-surface cursor-pointer"
                  >
                    이용약관
                  </button>{' '}
                  및{' '}
                  <button
                    type="button"
                    onClick={() => showToast('개인정보처리방침을 확인합니다.', 'info')}
                    className="underline hover:text-on-surface cursor-pointer"
                  >
                    개인정보처리방침
                  </button>
                  에 동의하게 됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* =======================================================================
          MODAL: 7일 선 취소 이용정지 고지 팝업
          ======================================================================= */}
      {suspendModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-2xl border border-error-container/30">
            <div className="w-12 h-12 rounded-2xl bg-error-container/20 text-error flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[28px]">warning</span>
            </div>
            <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">
              이용 패널티 적용 안내
            </h3>
            <p className="font-body-md text-on-surface-variant text-sm leading-relaxed mb-4">
              ※ 선 취소 패널티(개정 약관 제8조)로 인해{' '}
              <strong className="text-error font-semibold">{suspendModal.expireDt}</strong>까지 신규 견적
              신청이 제한됩니다.
            </p>
            <div className="p-3.5 rounded-xl bg-surface-container mb-5 text-xs text-on-surface-variant space-y-1">
              <div className="flex items-center gap-1.5 text-secondary font-semibold">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>이용 가능 서비스:</span>
              </div>
              <p className="pl-5 text-outline">
                - 진행 중인 계약 조회 및 상세 내역 확인
                <br />
                - 파트너 1:1 상담 채팅방 이용
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseSuspendModal}
              className="w-full h-11 rounded-xl bg-primary text-on-primary font-label-md font-bold hover:bg-primary-container transition-all cursor-pointer"
            >
              확인 후 계속하기
            </button>
          </div>
        </div>
      )}

      {/* =======================================================================
          MODAL: 5회 오류 10분 잠금 모달
          ======================================================================= */}
      {lockoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-3xl p-6 sm:p-7 shadow-2xl border border-error/20">
            <div className="w-12 h-12 rounded-2xl bg-error/10 text-error flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[28px]">lock_clock</span>
            </div>
            <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">
              비밀번호 5회 연속 오류
            </h3>
            <p className="font-body-md text-on-surface-variant text-sm leading-relaxed mb-4">
              보안을 위해 계정 로그인이 10분간 일시 제한되었습니다.
            </p>
            <div className="p-4 rounded-xl bg-surface-container text-center mb-5">
              <span className="font-label-sm text-outline text-xs block mb-1">
                남은 잠금 시간
              </span>
              <span className="font-headline-md text-2xl font-bold text-error tracking-wider">
                {String(Math.floor(lockoutRemainingSec / 60)).padStart(2, '0')}:
                {String(lockoutRemainingSec % 60).padStart(2, '0')}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleNav('USER-ATH-03')}
                className="w-full h-11 rounded-xl bg-primary text-on-primary font-label-md font-bold hover:bg-primary-container transition-all cursor-pointer"
              >
                비밀번호 찾기 / 재설정
              </button>
              <button
                type="button"
                onClick={() => setLockoutModal(false)}
                className="w-full h-10 rounded-xl bg-surface text-on-surface-variant font-label-md font-semibold hover:bg-surface-container transition-all cursor-pointer text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================================
          INTERACTIVE FEEDBACK TOAST
          ======================================================================= */}
      <div
        id="authNotification"
        aria-live="polite"
        className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 pointer-events-none ${
          toast.show ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
        }`}
      >
        <div
          className={`px-5 py-3 rounded-2xl font-label-md shadow-2xl flex items-center gap-2.5 text-sm ${
            toast.type === 'success'
              ? 'bg-secondary text-white'
              : toast.type === 'error'
              ? 'bg-error text-white'
              : 'bg-inverse-surface text-inverse-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'success'
              ? 'check_circle'
              : toast.type === 'error'
              ? 'error'
              : 'info'}
          </span>
          <span>{toast.message}</span>
        </div>
      </div>

      {/* =======================================================================
          GLOBAL FOOTER
          ======================================================================= */}
      <footer className="w-full bg-surface-container-lowest py-space-md text-center border-t border-surface-container-high/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-body-sm text-outline text-xs">
          © 2025 SsulDak Co., Ltd. Institutional Cleaning Reliability.
        </div>
      </footer>
    </div>
  );
};

export default UserAth00Screen;
