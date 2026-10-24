/**
 * @file SsulDak_Web/Admin/frontend/ADMN-ATH-00/index.tsx
 * @description SsulDak 관리자 콘솔 2차 복합 인증 로그인 화면 (ADMN-ATH-00)
 * 
 * [준수 사항]
 * - 역할별 격리: SsulDak_Web/Admin 전용 화면 컴포넌트
 * - 1:1 독립 엔드포인트: POST /api/admin/admn_ath_00 연동
 * - 2단계 복합 인증: 계정 ID/PW + Google Authenticator TOTP(6자리)
 * - 30분 미활동 자동 로그아웃 인액티비티 타이머 및 세션 만료 모달
 * - 실시간 KST 시스템 클럭 및 OTP 3분 카운트다운 타이머
 * - 플랫폼 공식 브랜드 로고(/logo.png) 연동
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface AdmnAth00Props {
  onNavigate?: (screenId: string) => void;
}

export default function AdmnAth00Screen({ onNavigate }: AdmnAth00Props) {
  // 폼 입력 상태 (HTML 기본값 반영)
  const [adminId, setAdminId] = useState('SD-ADMIN-OP01');
  const [adminPassword, setAdminPassword] = useState('SsulDakOps2025!#');
  const [otpCode, setOtpCode] = useState('');
  const [saveId, setSaveId] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // 로딩 및 피드백 상태
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 모달 제어 상태
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showMfaHelpModal, setShowMfaHelpModal] = useState(false);
  const [showSessionExpiredModal, setShowSessionExpiredModal] = useState(false);
  const [showLoginSuccessModal, setShowLoginSuccessModal] = useState(false);
  const [loginSuccessData, setLoginSuccessData] = useState<any>(null);

  // 실시간 KST 시스템 시계 상태
  const [systemClock, setSystemClock] = useState('');

  // 3분 OTP 유효 카운트다운 (초 단위: 180초)
  const [otpSecondsLeft, setOtpSecondsLeft] = useState(179);

  // 30분 미활동 인액티비티 타이머 (초 단위: 1800초)
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState(1800);
  const lastActivityRef = useRef<number>(Date.now());

  // ID 입력 인풋 참조
  const idInputRef = useRef<HTMLInputElement>(null);

  // 1. 실시간 KST 시계 갱신 (1초 단위)
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const dy = String(now.getDate()).padStart(2, '0');
      const hr = String(now.getHours()).padStart(2, '0');
      const mn = String(now.getMinutes()).padStart(2, '0');
      const sc = String(now.getSeconds()).padStart(2, '0');
      setSystemClock(`${yr}.${mo}.${dy} ${hr}:${mn}:${sc} KST`);
    };

    updateClock();
    const clockInterval = setInterval(updateClock, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // 2. OTP 3분 유효 카운트다운 타이머
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setOtpSecondsLeft((prev) => {
        if (prev <= 1) {
          return 180; // 3분 경과 시 자동 재발급 리셋
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  // 3. 30분 미활동 감지 및 세션 만료 타이머
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setInactivitySecondsLeft(1800);
  }, []);

  useEffect(() => {
    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    const inactivityInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, 1800 - elapsed);
      setInactivitySecondsLeft(remaining);

      if (remaining === 0) {
        setShowSessionExpiredModal(true);
      }
    }, 1000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      clearInterval(inactivityInterval);
    };
  }, []);

  // 로컬 스토리지 사번 복원
  useEffect(() => {
    try {
      const savedAdminId = localStorage.getItem('ssuldak_saved_admin_id');
      if (savedAdminId) {
        setAdminId(savedAdminId);
        setSaveId(true);
      }
    } catch {
      // ignore
    }
  }, []);

  // OTP 포맷 (MM:SS)
  const formatOtpTime = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // 세션 타이머 포맷 (MM:SS)
  const formatSessionTime = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}분 ${s}초`;
  };

  // 폼 제출 핸들러 (2차 복합 인증 실행)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!adminId.trim()) {
      setErrorMessage('사원번호 또는 관리자 계정 ID를 입력해 주십시오.');
      idInputRef.current?.focus();
      return;
    }

    if (!adminPassword) {
      setErrorMessage('관리자 보안 비밀번호를 입력해 주십시오.');
      return;
    }

    if (!otpCode || otpCode.trim().length < 6) {
      setErrorMessage('2차 인증(MFA) 6자리 OTP 코드를 입력해 주십시오.');
      return;
    }

    setIsLoading(true);

    try {
      // POST /api/admin/admn_ath_00 호출
      const response = await fetch('/api/admin/admn_ath_00', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionType: 'ADMIN_LOGIN',
          adminId: adminId.trim(),
          adminPassword: adminPassword,
          otpCode: otpCode.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || '관리자 신원 인증에 실패하였습니다.');
      }

      // 사번 저장 처리
      try {
        if (saveId) {
          localStorage.setItem('ssuldak_saved_admin_id', adminId.trim());
        } else {
          localStorage.removeItem('ssuldak_saved_admin_id');
        }
      } catch {
        // ignore
      }

      // 토큰 및 세션 정보 저장
      if (result.token) {
        sessionStorage.setItem('ssuldak_admin_token', result.token);
      }
      if (result.admin) {
        sessionStorage.setItem('ssuldak_admin_profile', JSON.stringify(result.admin));
      }

      setIsSuccess(true);
      setLoginSuccessData(result.admin);
      setShowLoginSuccessModal(true);

      // 1.5초 후 대시보드로 안전하게 전환
      setTimeout(() => {
        if (onNavigate) {
          onNavigate('ADMN-DSH-00');
        } else {
          window.location.hash = '#admn-dsh-00';
        }
      }, 1500);
    } catch (err: any) {
      setIsLoading(false);
      setIsSuccess(false);
      setErrorMessage(err.message || '인증 서버 통신 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="bg-[#f8f9ff] text-[#0b1c30] min-h-screen flex flex-col justify-between selection:bg-[#163b66] selection:text-[#ffffff] font-['Plus_Jakarta_Sans',sans-serif]">
      {/* 1. 상단 글로벌 GNB 헤더 */}
      <header className="w-full h-16 bg-white border-b border-[#dce9ff] px-4 md:px-12 flex items-center justify-between shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-6">
          {/* 공식 로고 및 타이틀 */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#00254a] flex items-center justify-center shadow-sm overflow-hidden p-0.5">
              <img
                src="/logo.png"
                alt="SsulDak"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent) {
                    parent.innerHTML = '<span class="material-symbols-outlined text-white text-[20px]">shield_lock</span>';
                  }
                }}
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-[16px] text-[#00254a] tracking-tight font-extrabold">SsulDak</span>
                <span className="text-[10px] bg-[#00254a] text-white px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                  ADMIN CONSOLE
                </span>
              </div>
              <span className="text-[11px] text-[#43474f] font-medium">통합 운영 관제 시스템</span>
            </div>
          </div>

          {/* 시스템 엔클레이브 및 관제 상태 (데스크톱) */}
          <div className="hidden lg:flex items-center gap-4 border-l border-[#e5eeff] pl-4 text-[12px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse"></span>
              <span className="text-[#0b1c30] font-semibold">Enclave v4.2 Online</span>
            </div>
            <div className="flex items-center gap-1 text-[#43474f]">
              <span className="material-symbols-outlined text-[15px] text-[#00254a]">dns</span>
              <span>KR-Central-1 Region</span>
            </div>
            <div className="flex items-center gap-1 text-[#43474f]">
              <span className="material-symbols-outlined text-[15px] text-[#006c4a]">verified</span>
              <span>Gateway Status: Normal (8ms)</span>
            </div>
          </div>
        </div>

        {/* 우측 유틸리티 영역 */}
        <div className="flex items-center gap-4">
          {/* 실시간 KST 시스템 시계 */}
          <div className="hidden sm:flex items-center gap-1 bg-[#eff4ff] px-3 py-1.5 rounded-lg border border-[#e5eeff]">
            <span className="material-symbols-outlined text-[15px] text-[#00254a]">schedule</span>
            <span className="font-mono text-[12px] text-[#0b1c30] font-semibold" id="systemClock">
              {systemClock || '2026.10.23 22:31:45 KST'}
            </span>
          </div>

          {/* 보안관제 내선 및 언어 선택 */}
          <div className="flex items-center gap-2">
            <a
              className="flex items-center gap-1 text-[12px] font-semibold text-[#00254a] hover:text-[#163b66] bg-[#eff4ff] hover:bg-[#e5eeff] px-3 py-1.5 rounded-lg transition-colors border border-[#e5eeff]"
              href="tel:0200"
              title="사내 보안관제 데스크 직통"
            >
              <span className="material-symbols-outlined text-[15px] text-[#006c4a]">support_agent</span>
              <span className="hidden sm:inline">ISMS 보안관제</span>
              <span>내선 0200</span>
            </a>
            <div className="flex items-center gap-1 text-[12px] bg-[#dce9ff] px-2 py-1 rounded text-[#00254a] font-semibold">
              <span className="material-symbols-outlined text-[14px]">g_translate</span>
              <span>KO</span>
            </div>
          </div>
        </div>
      </header>

      {/* 2. 중앙 메인 컨텐츠 영역 */}
      <main className="flex-1 flex items-center justify-center px-4 md:px-12 py-6 w-full max-w-[1360px] mx-auto">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* 좌측: 엔터프라이즈 시스템 관제 안내 (6 cols) */}
          <div className="lg:col-span-6 flex flex-col gap-4 py-1">
            {/* 보안 구역 뱃지 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse"></span>
              <span className="font-mono font-bold text-[12px] tracking-widest text-[#00254a] uppercase bg-[#d4e3ff]/60 px-2.5 py-1 rounded-md">
                SEC-LEVEL 1 RESTRICTED ZONE
              </span>
              <span className="text-[11px] font-mono text-[#737780]">AUTH-GATE-KR01</span>
            </div>

            {/* 메인 타이틀 및 개요 */}
            <div className="flex flex-col gap-1">
              <h1 className="text-[32px] font-extrabold text-[#00254a] tracking-tight leading-tight">
                SsulDak Enterprise<br />
                <span className="text-[#0b1c30]">통합 운영 관제 콘솔</span>
              </h1>
              <p className="text-[14px] text-[#43474f] leading-relaxed mt-1">
                본 시스템은 주류 스마트 유통 플랫폼 전역의 인프라 및 가맹 관제, 실시간 데이터 분석, 결제 정산 및 보안 정책을 총괄하는 중앙 통제 센터입니다. 인가된 임직원 계정 및 2차 생체/OTP 인증을 통해서만 접속이 허용됩니다.
              </p>
            </div>

            {/* 보안 카드 2열 그리드 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
              <div className="bg-white p-4 rounded-xl border border-[#e5eeff] shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-[20px] text-[#00254a]">security</span>
                  <span className="text-[11px] font-mono bg-[#82f5c1] text-[#00714e] px-1.5 py-0.5 rounded font-bold">
                    ACTIVE
                  </span>
                </div>
                <div>
                  <div className="text-[14px] font-bold text-[#0b1c30]">실시간 감사 추적 (Audit Trail)</div>
                  <div className="text-[12px] text-[#43474f] leading-snug mt-0.5">
                    접속 시도 및 전 세션 트랜잭션 WORM 스토리지 영구 보관
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-[#e5eeff] shadow-sm flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-[20px] text-[#006c4a]">vpn_lock</span>
                  <span className="text-[11px] font-mono bg-[#d4e3ff] text-[#00254a] px-1.5 py-0.5 rounded font-bold">
                    VERIFIED
                  </span>
                </div>
                <div>
                  <div className="text-[14px] font-bold text-[#0b1c30]">사내 보안망 VPN 고정 연결</div>
                  <div className="text-[12px] text-[#43474f] leading-snug mt-0.5">
                    공인 IP 121.134.89.21 인가 터널링 게이트웨이 경유
                  </div>
                </div>
              </div>
            </div>

            {/* 규제 준수 인증 뱃지 박스 */}
            <div className="bg-white rounded-xl p-4 border border-[#e5eeff] shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#e5eeff] pb-2">
                <div className="flex items-center gap-1.5 font-bold text-[13px] text-[#00254a]">
                  <span className="material-symbols-outlined text-[17px]">verified_user</span>
                  <span>엔터프라이즈 보안 및 규제 준수 인증</span>
                </div>
                <span className="text-[11px] font-mono text-[#737780]">GLOBAL COMPLIANCE</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {['ISMS-P 인증', 'SOC 2 Type II', 'ISO 27001 / 27701', 'PCI-DSS Level 1'].map((badge) => (
                  <div
                    key={badge}
                    className="flex items-center gap-1 bg-[#eff4ff] px-2.5 py-1 rounded-lg border border-[#d3e4fe]/50 text-[12px] font-semibold text-[#0b1c30]"
                  >
                    <span className="material-symbols-outlined text-[14px] text-[#006c4a]">check_circle</span>
                    <span>{badge}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 인프라 상세 스펙 하단 바 */}
            <div className="flex flex-wrap items-center justify-between text-[12px] text-[#737780] px-1 gap-2">
              <span>클러스터: <strong className="text-[#43474f] font-mono">kr-central-ops-gw04</strong></span>
              <span>지연시간: <strong className="text-[#006c4a] font-mono">8ms (Optimal)</strong></span>
              <span>통신암호화: <strong className="text-[#43474f] font-mono">AES-256-GCM / TLS 1.3</strong></span>
            </div>
          </div>

          {/* 우측: 관리자 신원 인증 로그인 폼 카드 (6 cols) */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-[490px] bg-white rounded-2xl shadow-xl border border-[#e5eeff] p-6 sm:p-7 flex flex-col gap-5 relative overflow-hidden">
              {/* 상단 액센트 그라데이션 바 */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00254a] via-[#163b66] to-[#006c4a]"></div>

              {/* 카드 헤더 */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#00254a] flex items-center justify-center shadow-md text-white">
                    <span className="material-symbols-outlined text-[22px]">fingerprint</span>
                  </div>
                  <div>
                    <h2 className="text-[18px] text-[#00254a] font-bold tracking-tight">관리자 신원 인증</h2>
                    <p className="text-[12px] text-[#43474f]">SsulDak Enterprise Identity Provider (IdP)</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] bg-[#ffddb8] text-[#2a1700] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    보안등급 1급
                  </span>
                  <span className="text-[11px] font-mono text-[#737780] mt-0.5">MFA Required</span>
                </div>
              </div>

              {/* 오류 알림 메시지 배너 */}
              {errorMessage && (
                <div className="flex items-start gap-2 bg-[#ffdad6] text-[#93000a] p-3 rounded-xl border border-[#ba1a1a]/20 text-[13px] animate-shake">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                  <div className="flex-1 font-medium">{errorMessage}</div>
                  <button
                    type="button"
                    onClick={() => setErrorMessage(null)}
                    className="text-[#93000a] hover:opacity-80 p-0.5"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}

              {/* 로그인 폼 */}
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                {/* 1단계 필드: 사원번호 / 관리자 계정 ID */}
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center justify-between text-[13px] text-[#0b1c30] font-semibold" htmlFor="adminId">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-[#00254a]">badge</span>
                      사원번호 / 관리자 ID
                    </span>
                    <span className="text-[11px] text-[#006c4a] font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a]"></span>
                      단말 인가 확인됨
                    </span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 material-symbols-outlined text-[18px] text-[#737780] pointer-events-none">
                      account_circle
                    </span>
                    <input
                      ref={idInputRef}
                      className="w-full bg-[#eff4ff] text-[#0b1c30] text-[14px] pl-10 pr-10 py-2.5 rounded-lg border border-[#e5eeff] outline-none focus:bg-white focus:border-[#00254a] focus:ring-2 focus:ring-[#00254a]/20 transition-all placeholder:text-[#c3c6d0] font-medium"
                      id="adminId"
                      name="adminId"
                      placeholder="사원번호 (예: SD-10482 또는 admin_operator01)"
                      required
                      type="text"
                      value={adminId}
                      onChange={(e) => setAdminId(e.target.value)}
                    />
                    {adminId && (
                      <button
                        className="absolute right-3 text-[#737780] hover:text-[#0b1c30] p-1 rounded transition-colors"
                        onClick={() => {
                          setAdminId('');
                          idInputRef.current?.focus();
                        }}
                        title="입력 지우기"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">cancel</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 1단계 필드: 비밀번호 */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[13px] text-[#0b1c30] font-semibold" htmlFor="adminPassword">
                      <span className="material-symbols-outlined text-[16px] text-[#00254a]">key</span>
                      비밀번호
                    </label>
                    <span className="text-[11px] text-[#737780]">대소문자/숫자/특수문자 조합</span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 material-symbols-outlined text-[18px] text-[#737780] pointer-events-none">
                      lock
                    </span>
                    <input
                      className="w-full bg-[#eff4ff] text-[#0b1c30] text-[14px] pl-10 pr-10 py-2.5 rounded-lg border border-[#e5eeff] outline-none focus:bg-white focus:border-[#00254a] focus:ring-2 focus:ring-[#00254a]/20 transition-all placeholder:text-[#c3c6d0] font-mono tracking-wider"
                      id="adminPassword"
                      name="adminPassword"
                      placeholder="보안 패스워드 입력"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                    />
                    <button
                      className="absolute right-3 text-[#737780] hover:text-[#0b1c30] p-1 rounded transition-colors"
                      id="togglePasswordBtn"
                      onClick={() => setShowPassword(!showPassword)}
                      title="비밀번호 보기/숨기기"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* 2단계 필드: 2차 인증 OTP 코드 (Google Authenticator / MFA) */}
                <div className="flex flex-col gap-2 bg-[#eff4ff] p-3.5 rounded-xl border border-[#e5eeff]">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-1.5 text-[13px] text-[#00254a] font-bold" htmlFor="otpCode">
                      <span className="material-symbols-outlined text-[16px] text-[#00254a]">phonelink_lock</span>
                      2차 인증 OTP 코드 (Google Authenticator / MFA)
                    </label>
                    <button
                      className="text-[11px] text-[#006c4a] hover:underline flex items-center gap-0.5 font-medium"
                      onClick={() => setShowSyncModal(true)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[13px]">sync</span>
                      시각 동기화
                    </button>
                  </div>

                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 material-symbols-outlined text-[18px] text-[#737780] pointer-events-none">
                      pin
                    </span>
                    <input
                      autoComplete="one-time-code"
                      className="w-full bg-white text-[#0b1c30] text-[18px] tracking-[0.25em] pl-10 pr-20 py-2.5 rounded-lg border border-[#e5eeff] outline-none focus:ring-2 focus:ring-[#00254a]/20 transition-all font-mono placeholder:tracking-normal placeholder:text-[13px] placeholder:text-[#c3c6d0] text-center font-bold"
                      id="otpCode"
                      inputMode="numeric"
                      maxLength={6}
                      name="otpCode"
                      pattern="[0-9]*"
                      placeholder="6자리 OTP 번호 입력 (예: 123456 또는 849201)"
                      required
                      type="text"
                      value={otpCode}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        if (val.length <= 6) {
                          setOtpCode(val);
                        }
                      }}
                    />
                    <span
                      className="absolute right-3 font-mono text-[12px] text-[#ba1a1a] bg-[#ffdad6]/80 px-2 py-0.5 rounded font-bold"
                      id="otpTimer"
                      title="OTP 코드 잔여 유효시간"
                    >
                      {formatOtpTime(otpSecondsLeft)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#43474f]">
                    <span>앱에 생성된 실시간 6자리 OTP 일회용 코드를 입력하십시오.</span>
                    <span className="text-[#737780]">유효시간 3분</span>
                  </div>
                </div>

                {/* 계정 저장 및 분실 도움말 */}
                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      checked={saveId}
                      onChange={(e) => setSaveId(e.target.checked)}
                      className="w-4 h-4 rounded text-[#00254a] accent-[#00254a] cursor-pointer"
                      type="checkbox"
                    />
                    <span className="text-[13px] text-[#0b1c30] font-medium">관리자 사번(ID) 저장</span>
                  </label>
                  <button
                    type="button"
                    className="text-[12px] text-[#00254a] hover:underline font-semibold"
                    onClick={() => setShowMfaHelpModal(true)}
                  >
                    OTP 분실 / 기기 재등록
                  </button>
                </div>

                {/* 보안 VPN 전용망 연결 인가 배너 */}
                <div className="flex items-start gap-2 bg-[#e5eeff] px-3 py-2 rounded-lg text-[#43474f]">
                  <span className="material-symbols-outlined text-[16px] text-[#006c4a] mt-0.5 shrink-0">verified</span>
                  <div className="flex flex-col text-[12px]">
                    <span className="text-[#0b1c30] font-semibold">인가된 보안 VPN 전용망 연동 상태</span>
                    <span className="text-[#43474f] leading-tight">
                      접속 공인 IP: <strong className="font-mono text-[#00254a]">121.134.89.21</strong> (Gateway-KR-Central-01)
                    </span>
                  </div>
                </div>

                {/* 로그인 액션 버튼 */}
                <button
                  className={`w-full h-12 text-white text-[16px] rounded-xl transition-all shadow-md flex items-center justify-center gap-2 font-bold mt-1 ${
                    isLoading
                      ? 'bg-[#163b66] cursor-not-allowed opacity-90'
                      : isSuccess
                      ? 'bg-[#006c4a] cursor-default'
                      : 'bg-[#00254a] hover:bg-[#163b66] active:scale-[0.99] cursor-pointer'
                  }`}
                  disabled={isLoading || isSuccess}
                  id="loginBtn"
                  type="submit"
                >
                  {isLoading ? (
                    <>
                      <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                      <span>보안 인가 검증 중...</span>
                    </>
                  ) : isSuccess ? (
                    <>
                      <span className="material-symbols-outlined text-[20px]">check_circle</span>
                      <span>인증 승인 완료</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">lock</span>
                      <span>관리자 콘솔 로그인</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* 하단 지원 내선 및 자동 차단 안내 */}
              <div className="flex items-center justify-between pt-1 border-t border-[#e5eeff] text-[12px] text-[#43474f]">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#006c4a]">support_agent</span>
                  <span>
                    보안데스크 문의: <strong className="text-[#00254a]">내선 0200</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[15px] text-[#737780]">schedule</span>
                  <span>비인가 시도 자동 차단</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. 하단 보안 정책 및 법률 안내 푸터 */}
      <footer className="w-full bg-white border-t border-[#e5eeff] px-4 md:px-12 py-3 shrink-0">
        <div className="max-w-[1360px] mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5 text-[12px] text-[#43474f]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              ※ 본 시스템은 인가된 관리자 전용이며, <strong>「정보통신망법」</strong> 및 <strong>「개인정보보호법」</strong>에 따라 모든 접속과 작업 로그가 영구 기록·감사됩니다.
            </span>
            <span className="hidden lg:inline text-[#737780]">|</span>
            <span className="flex items-center gap-1 text-[#00254a] font-medium">
              <span className="material-symbols-outlined text-[14px]">timer</span>
              세션 만료: 30분 미활동 시 자동 로그아웃 (남은 시간: {formatSessionTime(inactivitySecondsLeft)})
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1 font-mono text-[#737780]">
              <span className="material-symbols-outlined text-[14px] text-[#006c4a]">lock</span>
              <span>AES-256-GCM / 256-BIT TLS</span>
            </div>
            <span className="text-[#737780]">|</span>
            <span className="font-medium text-[#0b1c30]">© 2026 SsulDak Enterprise Systems Inc.</span>
          </div>
        </div>
      </footer>

      {/* 모달 1: OTP 시각 동기화 안내 모달 */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-[420px] w-full p-6 shadow-2xl border border-[#e5eeff] flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#82f5c1] text-[#00714e] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">sync</span>
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#00254a]">OTP 시각 동기화 완료</h3>
                <p className="text-[12px] text-[#737780]">NTP: time.kr.ssuldak.internal</p>
              </div>
            </div>
            <div className="bg-[#eff4ff] p-3.5 rounded-xl border border-[#e5eeff] text-[13px] text-[#0b1c30] leading-relaxed">
              인증 서버와의 시각 편차(Time Drift) 보정이 성공적으로 수행되었습니다. OTP 앱에 새로 생성된 실시간 6자리 번호를 재입력해 주십시오.
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSyncModal(false);
                setOtpSecondsLeft(180);
              }}
              className="w-full py-2.5 bg-[#00254a] hover:bg-[#163b66] text-white rounded-xl text-[14px] font-bold transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 모달 2: OTP 분실 및 기기 재등록 안내 모달 */}
      {showMfaHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-[440px] w-full p-6 shadow-2xl border border-[#e5eeff] flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">phonelink_erase</span>
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#ba1a1a]">OTP 분실 / 재발급 신청 절차</h3>
                <p className="text-[12px] text-[#737780]">사내 보안 규정 제14조 준수</p>
              </div>
            </div>
            <div className="bg-[#eff4ff] p-3.5 rounded-xl border border-[#e5eeff] text-[13px] text-[#43474f] leading-relaxed flex flex-col gap-2">
              <p>
                OTP 분실 또는 단말기 교체에 따른 재등록은 <strong>사내 보안데스크(내선 0200)</strong>로 본인 확인 서류 및 신분증 제출 후 관리자 대면 승인을 통해 처리됩니다.
              </p>
              <div className="bg-white p-2.5 rounded-lg border border-[#e5eeff] text-[12px] text-[#00254a] font-medium">
                • 보안데스크 직통: <strong>02-2000-0200 (내선 0200)</strong><br />
                • 운영 시간: 평일 08:30 ~ 18:30 (야간 당직 보안관제실 24h 대응)
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMfaHelpModal(false)}
              className="w-full py-2.5 bg-[#00254a] hover:bg-[#163b66] text-white rounded-xl text-[14px] font-bold transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 모달 3: 30분 미활동 보안 세션 만료 모달 */}
      {showSessionExpiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-[420px] w-full p-6 shadow-2xl border border-[#ba1a1a]/20 flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">timer_off</span>
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#ba1a1a]">보안 세션 만료 알림</h3>
                <p className="text-[12px] text-[#737780]">30분 미활동 자동 보호 조치</p>
              </div>
            </div>
            <div className="bg-[#eff4ff] p-3.5 rounded-xl border border-[#e5eeff] text-[13px] text-[#43474f] leading-relaxed">
              정보통신망법 및 사내 보안 정책에 따라 30분 동안 조작이 없어 관리자 보안 세션이 만료되었습니다. 안전한 시스템 이용을 위해 다시 인증을 진행해 주십시오.
            </div>
            <button
              type="button"
              onClick={() => {
                setShowSessionExpiredModal(false);
                resetInactivityTimer();
                setOtpCode('');
                sessionStorage.removeItem('ssuldak_admin_token');
                sessionStorage.removeItem('ssuldak_admin_profile');
              }}
              className="w-full py-2.5 bg-[#00254a] hover:bg-[#163b66] text-white rounded-xl text-[14px] font-bold transition-colors"
            >
              세션 갱신 및 재인증
            </button>
          </div>
        </div>
      )}

      {/* 모달 4: 인증 성공 및 대시보드 전환 모달 */}
      {showLoginSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-[440px] w-full p-6 shadow-2xl border border-[#82f5c1] flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#82f5c1] text-[#00714e] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#00254a]">관리자 신원 검증 승인</h3>
                <p className="text-[12px] text-[#006c4a] font-semibold">감사 토큰 및 세션 키 발행 완료</p>
              </div>
            </div>
            <div className="bg-[#eff4ff] p-3.5 rounded-xl border border-[#e5eeff] text-[13px] text-[#0b1c30] leading-relaxed flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#43474f]">관리자 성명:</span>
                <strong className="font-semibold">{loginSuccessData?.adminNm || '김수석'} ({loginSuccessData?.role || 'SUPER_ADMIN'})</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#43474f]">소속 부서:</span>
                <span>{loginSuccessData?.deptNm || '보안관제운영팀'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#43474f]">세션 유효시간:</span>
                <span className="font-mono text-[#006c4a] font-bold">1800초 (30분)</span>
              </div>
              <div className="mt-2 text-center text-[12px] text-[#43474f]">
                관리자 콘솔 메인 대시보드로 안전하게 전환합니다...
              </div>
            </div>
            <div className="w-full bg-[#e5eeff] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#006c4a] h-full w-full animate-pulse"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
