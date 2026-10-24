import React, { useState } from 'react';

/**
 * PTNR-ATH-00: 파트너 로그인 화면 (React + TypeScript)
 * 
 * 아키텍처 규칙:
 * - 물리적 격리: SsulDak_Web/Partner/frontend/PTNR-ATH-00/
 * - 1:1 매핑 백엔드: POST /api/partner/ptnr_ath_00
 * - 전용 SQL: PTNR-ATH-00-SQL-001 ~ PTNR-ATH-00-SQL-003
 */

interface PtnrAth00Props {
  onNavigate?: (screen: string, params?: any) => void;
  onLoginSuccess?: (partnerData: any, token: string) => void;
}

export const PtnrAth00Screen: React.FC<PtnrAth00Props> = ({
  onNavigate,
  onLoginSuccess
}) => {
  // 역할 전환 탭: 'business' (사업자 파트너) | 'cleaner' (마스터 클리너)
  const [currentRole, setCurrentRole] = useState<'business' | 'cleaner'>('business');

  // 로그인 폼 입력값
  const [partnerId, setPartnerId] = useState<string>('partner@clean.com');
  const [partnerPw, setPartnerPw] = useState<string>('Password1234!');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [keepLogin, setKeepLogin] = useState<boolean>(true);
  const [rememberId, setRememberId] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 알림 모달 상태
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: 'PENDING' | 'REJECTED' | 'SUSPENDED' | 'ERROR';
    title: string;
    message: string;
    rejectReason?: string;
  }>({
    isOpen: false,
    type: 'ERROR',
    title: '',
    message: ''
  });

  // 토스트 메시지
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const nav = (path: string, params?: any) => {
    if (onNavigate) {
      onNavigate(path, params);
    } else {
      window.location.hash = path;
    }
  };

  // 파트너 로그인 처리
  const handlePartnerLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanEmail = partnerId.trim();
    const cleanPw = partnerPw.trim();

    if (!cleanEmail || !cleanPw) {
      showToast('이메일(아이디)과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/partner/ptnr_ath_00', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          actionType: 'LOGIN',
          ptnrEmail: cleanEmail,
          ptnrPassword: cleanPw,
          roleType: currentRole
        })
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        // 로그인 성공 (APPROVED)
        showToast(resData.message || '로그인에 성공하였습니다.');

        // 토큰 및 파트너 정보 저장
        if (resData.token) {
          localStorage.setItem('ssuldak_ptnr_token', resData.token);
          localStorage.setItem('ssuldak_ptnr_user', JSON.stringify(resData.partner));
        }

        if (onLoginSuccess) {
          onLoginSuccess(resData.partner, resData.token);
        }

        setTimeout(() => {
          nav('PTNR-COM-00', { ptnrNo: resData.partner?.ptnrNo });
        }, 600);
      } else {
        // 심사 상태별 모달 처리
        if (resData.code === 'APPROVAL_PENDING') {
          setModalState({
            isOpen: true,
            type: 'PENDING',
            title: '입점 서류 심사 진행 중',
            message: resData.message || '사업자등록증 및 배상책임보험 서류 심사가 진행 중입니다.'
          });
        } else if (resData.code === 'APPROVAL_REJECTED') {
          setModalState({
            isOpen: true,
            type: 'REJECTED',
            title: '입점 심사 반려 안내',
            message: '제출하신 입점 서류가 반려되었습니다. 사유를 확인하고 서류를 재제출해 주세요.',
            rejectReason: resData.rejectReason || '제출 서류 유효기간 만료 또는 식별 불가'
          });
        } else if (resData.code === 'SUSPENDED') {
          setModalState({
            isOpen: true,
            type: 'SUSPENDED',
            title: '계정 이용 제한 안내',
            message: resData.message || '선취소 패널티로 인해 계정 이용이 일시 제한되었습니다.'
          });
        } else {
          // 비밀번호 불일치 또는 기타 에러
          showToast(resData.message || '로그인에 실패했습니다.');
        }
      }
    } catch (err: any) {
      console.error('로그인 통신 오류:', err);
      showToast('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 카카오 비즈니스 간편 로그인
  const handleKakaoBizLogin = async () => {
    showToast('카카오 비즈니스 인증을 진행합니다.');
    try {
      const response = await fetch('/api/partner/ptnr_ath_00', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionType: 'KAKAO_BIZ_LOGIN' })
      });
      const data = await response.json();
      if (data.success) {
        showToast(data.message || '카카오 비즈니스 계정 동기화 완료');
      }
    } catch {
      showToast('카카오 비즈니스 로그인 연동 실패');
    }
  };

  // 테스트 계정 빠른 채우기 (프리뷰 편의)
  const fillTestAccount = (email: string) => {
    setPartnerId(email);
    setPartnerPw('Password1234!');
    showToast(`테스트 계정(${email})이 입력되었습니다.`);
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex items-center justify-center p-gutter">
      <main className="w-full">
        <div className="w-full max-w-7xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
          
          {/* =====================================================================
              1. TOP IDENTITY MINIMAL BAR
          ===================================================================== */}
          <div className="flex items-center justify-between pb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-container flex items-center justify-center text-on-primary shadow-sm">
                <span className="material-symbols-outlined text-[24px]">cleaning_services</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-headline-md text-primary tracking-tight font-extrabold">SsulDak</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm uppercase font-bold">
                    Partner Web Console
                  </span>
                </div>
                <p className="font-body-sm text-on-surface-variant">프리미엄 공간 케어 파트너 관리 포털</p>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-4 text-on-surface-variant font-body-sm">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-secondary"></span>
                시스템 보안 정상 가동 중 (TLS 1.3)
              </span>
              <span className="text-outline-variant">|</span>
              <button
                type="button"
                onClick={() => showToast('파트너 긴급 지원센터(1588-0000)로 연결됩니다.')}
                className="hover:text-primary transition-colors flex items-center gap-1 font-label-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">support_agent</span>
                긴급 지원 1588-0000
              </button>
            </div>
          </div>

          {/* =====================================================================
              2. MAIN GRID: 2-COLUMN DESKTOP ARCHITECTURE
          ===================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            
            {/* =================================================================
                LEFT COLUMN: Value Proposition & Ecosystem Presentation (7 cols)
            ================================================================= */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
              
              {/* Hero Statement Section */}
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-low text-secondary font-label-sm font-semibold">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  대한민국 1위 공간 클리닝 전문가 네트워크
                </div>
                <h1 className="font-display text-on-surface tracking-tight font-extrabold leading-tight text-3xl sm:text-4xl">
                  청소 전문가를 위한<br />
                  <span className="text-primary-container">스마트 배차 안심 플랫폼</span>
                </h1>
                <p className="font-body-lg text-on-surface-variant max-w-xl text-base sm:text-lg">
                  원하는 시간, 원하는 구역의 프리미엄 청소 오더를 실시간으로 배차받고 투명한 에스크로 시스템으로 익일 안전하게 정산받으세요.
                </p>
              </div>

              {/* Trust Stats Banner */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-outline-variant/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-secondary-fixed/30 pointer-events-none blur-2xl"></div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Active Partners</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm font-bold">
                      인증 파트너 99.4% 만족
                    </span>
                  </div>
                  <div className="font-headline-lg text-primary tracking-tight font-extrabold flex items-baseline gap-1 text-2xl sm:text-3xl">
                    3,500<span className="text-secondary font-bold text-headline-md">+</span>
                    <span className="font-body-sm font-normal text-on-surface-variant ml-2">전국 전문 시공팀 활동</span>
                  </div>
                </div>

                <div className="h-10 w-px bg-surface-container-highest hidden sm:block"></div>

                <div className="space-y-1">
                  <span className="font-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Average Monthly Revenue</span>
                  <div className="font-headline-lg text-primary tracking-tight font-extrabold flex items-baseline gap-1 text-2xl sm:text-3xl">
                    480<span className="text-on-surface-variant font-bold text-headline-sm">만원</span>
                    <span className="font-body-sm font-normal text-secondary ml-2 font-bold">상위 20% 890만 돌파</span>
                  </div>
                </div>
              </div>

              {/* 3 Pillars Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Card 1 */}
                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 space-y-3 transition-transform hover:-translate-y-1 duration-200">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary-container">
                    <span className="material-symbols-outlined text-[22px]">alt_route</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-on-surface font-bold">스마트 오더 배차</h3>
                    <p className="font-body-sm text-on-surface-variant mt-1">
                      이동 동선과 시공 역량에 맞춘 최적화 매칭. 원하는 구역과 일정 자유 선택
                    </p>
                  </div>
                  <div className="font-label-sm text-secondary font-bold flex items-center gap-1">
                    AI 반경 추천 시스템
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </div>
                </div>

                {/* Card 2 */}
                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 space-y-3 transition-transform hover:-translate-y-1 duration-200">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-[22px]">payments</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-on-surface font-bold">100% 에스크로 익일 정산</h3>
                    <p className="font-body-sm text-on-surface-variant mt-1">
                      고객 검수 즉시 자동 송금. 미수금 걱정 없는 대금 보호 체계
                    </p>
                  </div>
                  <div className="font-label-sm text-secondary font-bold flex items-center gap-1">
                    D+1 자동 입금 보장
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  </div>
                </div>

                {/* Card 3 */}
                <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/30 space-y-3 transition-transform hover:-translate-y-1 duration-200">
                  <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[22px]">corporate_fare</span>
                  </div>
                  <div>
                    <h3 className="font-headline-sm text-on-surface font-bold">기업·공공 독점 계약</h3>
                    <p className="font-body-sm text-on-surface-variant mt-1">
                      준공, 오피스 정기관리, 관공서 등 비수기 없는 고단가 단체 오더 우선 연계
                    </p>
                  </div>
                  <div className="font-label-sm text-secondary font-bold flex items-center gap-1">
                    B2B 대형 물량 독점
                    <span className="material-symbols-outlined text-[14px]">star</span>
                  </div>
                </div>
              </div>

              {/* Master Partner App QR Download & Visual Showcase */}
              <div className="bg-surface-container-low rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border border-outline-variant/20">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-surface-container-lowest rounded-xl p-2 shadow-sm flex items-center justify-center shrink-0 border border-outline-variant/30">
                    <svg className="w-full h-full text-on-surface" fill="currentColor" viewBox="0 0 100 100">
                      <path d="M10,10 h30 v30 h-30 z M16,16 v18 h18 v-18 z M22,22 h6 v6 h-6 z M60,10 h30 v30 h-30 z M66,16 v18 h18 v-18 z M72,22 h6 v6 h-6 z M10,60 h30 v30 h-30 z M16,66 v18 h18 v-18 z M22,72 h6 v6 h-6 z M50,10 h6 v12 h-6 z M50,28 h6 v8 h-8 v-4 h2 z M60,50 h8 v8 h-8 z M80,50 h10 v8 h-10 z M70,60 h10 v8 h-10 z M50,60 h8 v14 h-8 z M60,78 h10 v12 h-10 z M80,70 h10 v20 h-10 z"></path>
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm font-semibold">
                      현장용 파트너 앱
                    </span>
                    <h4 className="font-headline-sm text-on-surface font-bold">쓸고닦고 파트너 현장 전용 앱</h4>
                    <p className="font-body-sm text-on-surface-variant">
                      스마트폰으로 카메라 시공 전/후 보고서 제출, 현장 서명 및 실시간 위치 배차 수신
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => showToast('Google Play 스토어로 이동합니다.')}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-lowest text-on-surface font-label-sm shadow-sm hover:bg-surface-container transition-colors border border-outline-variant/20"
                  >
                    <span className="material-symbols-outlined text-[18px]">android</span>
                    Google Play
                  </button>
                  <button
                    type="button"
                    onClick={() => showToast('Apple App Store로 이동합니다.')}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-lowest text-on-surface font-label-sm shadow-sm hover:bg-surface-container transition-colors border border-outline-variant/20"
                  >
                    <span className="material-symbols-outlined text-[18px]">phone_iphone</span>
                    App Store
                  </button>
                </div>
              </div>

            </div>

            {/* =================================================================
                RIGHT COLUMN: Login Console Card & Onboarding Banner (5 cols)
            ================================================================= */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-6">
              
              {/* Main Form Card */}
              <div className="bg-surface-container-lowest rounded-3xl p-7 sm:p-9 shadow-md border border-outline-variant/30 space-y-6">
                
                {/* Card Header & Partner Role Switcher */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-headline-lg text-primary font-extrabold tracking-tight text-2xl">
                        파트너 로그인
                      </h2>
                      <p className="font-body-sm text-on-surface-variant mt-0.5">
                        파트너사 계정으로 안전하게 로그인하세요
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      실시간 접속
                    </span>
                  </div>

                  {/* Segmented Role Tab */}
                  <div className="grid grid-cols-2 p-1 rounded-xl bg-surface-container-low font-label-md">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentRole('business');
                        if (partnerId.includes('cleaner')) setPartnerId('partner@clean.com');
                      }}
                      className={`py-2.5 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        currentRole === 'business'
                          ? 'font-bold bg-surface-container-lowest text-primary shadow-sm'
                          : 'font-medium text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">domain</span>
                      사업자 파트너
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentRole('cleaner');
                        if (partnerId === 'partner@clean.com') setPartnerId('clean_master12@ssuldak.co.kr');
                      }}
                      className={`py-2.5 rounded-lg text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        currentRole === 'cleaner'
                          ? 'font-bold bg-surface-container-lowest text-primary shadow-sm'
                          : 'font-medium text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">badge</span>
                      마스터 클리너 (기사)
                    </button>
                  </div>
                </div>

                {/* Interactive Login Form */}
                <form onSubmit={handlePartnerLogin} className="space-y-4">
                  {/* Business/Email Input */}
                  <div className="space-y-1.5">
                    <label className="block font-label-md text-on-surface font-semibold" htmlFor="partner-id">
                      {currentRole === 'business' ? '사업자/대표자 이메일' : '기사 등록 휴대폰 번호 또는 클리너 ID'}
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-on-surface-variant material-symbols-outlined text-[20px] pointer-events-none">
                        {currentRole === 'business' ? 'apartment' : 'badge'}
                      </span>
                      <input
                        id="partner-id"
                        value={partnerId}
                        onChange={(e) => setPartnerId(e.target.value)}
                        placeholder={currentRole === 'business' ? 'partner@clean.com' : '010-0000-0000 또는 기사 코드'}
                        required
                        type={currentRole === 'business' ? 'email' : 'text'}
                        className="w-full h-12 pl-11 pr-4 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline font-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container transition-all shadow-inner"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block font-label-md text-on-surface font-semibold" htmlFor="partner-pw">
                        비밀번호
                      </label>
                      <button
                        type="button"
                        onClick={() => showToast('비밀번호 찾기 페이지로 이동합니다.')}
                        className="font-label-sm text-secondary hover:underline cursor-pointer"
                      >
                        비밀번호 찾기 / 재설정
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <span className="absolute left-3.5 text-on-surface-variant material-symbols-outlined text-[20px] pointer-events-none">
                        lock
                      </span>
                      <input
                        id="partner-pw"
                        value={partnerPw}
                        onChange={(e) => setPartnerPw(e.target.value)}
                        placeholder="비밀번호를 입력하세요"
                        required
                        type={showPassword ? 'text' : 'password'}
                        className="w-full h-12 pl-11 pr-11 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline font-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container transition-all shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="비밀번호 보기 토글"
                        className="absolute right-3.5 text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none p-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Checkboxes & Quick Utils */}
                  <div className="flex items-center justify-between pt-1 font-body-sm text-on-surface-variant">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={keepLogin}
                        onChange={(e) => setKeepLogin(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-0 accent-primary cursor-pointer"
                      />
                      <span>로그인 상태 유지</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberId}
                        onChange={(e) => setRememberId(e.target.checked)}
                        className="w-4 h-4 rounded text-primary focus:ring-0 accent-primary cursor-pointer"
                      />
                      <span>아이디 저장</span>
                    </label>
                  </div>

                  {/* Primary Submission CTA Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-[52px] rounded-xl bg-primary-container text-on-primary font-headline-sm font-bold flex items-center justify-center gap-2 shadow-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isLoading ? (
                      <>
                        <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                        <span>인증 확인 중...</span>
                      </>
                    ) : (
                      <>
                        <span>{currentRole === 'business' ? '사업자 파트너 로그인' : '마스터 클리너 로그인'}</span>
                        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                      </>
                    )}
                  </button>

                  {/* Kakao Business Alternative Access */}
                  <div className="relative py-2 flex items-center justify-center">
                    <div className="w-full h-px bg-surface-container-high"></div>
                    <span className="absolute px-3 bg-surface-container-lowest font-label-sm text-on-surface-variant">
                      또는 간편 인증
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleKakaoBizLogin}
                    className="w-full h-12 rounded-xl bg-[#FEE500] text-[#191919] font-label-lg font-bold flex items-center justify-center gap-2 hover:bg-[#FADA0A] active:scale-[0.98] transition-all shadow-sm cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3C6.477 3 2 6.477 2 10.767c0 2.76 1.874 5.176 4.697 6.486-.208.775-.75 2.805-.858 3.238-.135.538.196.531.413.388.172-.113 2.732-1.854 3.844-2.61.62.09 1.256.136 1.904.136 5.523 0 10-3.477 10-7.767C22 6.477 17.523 3 12 3z"></path>
                    </svg>
                    카카오 비즈니스 계정으로 파트너 로그인
                  </button>
                </form>

                {/* Secondary Action Meta Link */}
                <div className="pt-2 flex items-center justify-center gap-3 font-body-sm text-on-surface-variant">
                  <button
                    type="button"
                    onClick={() => showToast('사업자 등록 번호 조회 페이지로 이동합니다.')}
                    className="hover:text-primary transition-colors cursor-pointer"
                  >
                    사업자 등록 번호 확인
                  </button>
                  <span className="text-outline-variant">·</span>
                  <button
                    type="button"
                    onClick={() => showToast('시공 기사 PIN 번호 재발급 페이지로 이동합니다.')}
                    className="hover:text-primary transition-colors cursor-pointer"
                  >
                    시공 기사 PIN 재발급
                  </button>
                </div>

                {/* 퀵 테스트 계정 채우기 툴바 (프리뷰 상태 검증용) */}
                <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
                  <span className="font-label-sm text-on-surface-variant font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] text-secondary">tune</span>
                    심사 상태별 테스트 계정 빠른 입력:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => fillTestAccount('partner@clean.com')}
                      className="px-2 py-1.5 rounded-lg bg-surface-container-lowest text-primary text-xs font-semibold hover:bg-surface-container transition-colors text-left"
                    >
                      ✅ 정상 승인 (APPROVED)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillTestAccount('pending@clean.com')}
                      className="px-2 py-1.5 rounded-lg bg-surface-container-lowest text-amber-700 text-xs font-semibold hover:bg-surface-container transition-colors text-left"
                    >
                      ⏳ 심사 대기 (PENDING)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillTestAccount('rejected@clean.com')}
                      className="px-2 py-1.5 rounded-lg bg-surface-container-lowest text-rose-700 text-xs font-semibold hover:bg-surface-container transition-colors text-left"
                    >
                      ❌ 심사 반려 (REJECTED)
                    </button>
                    <button
                      type="button"
                      onClick={() => fillTestAccount('suspended@clean.com')}
                      className="px-2 py-1.5 rounded-lg bg-surface-container-lowest text-neutral-700 text-xs font-semibold hover:bg-surface-container transition-colors text-left"
                    >
                      ⛔ 이용 정지 (SUSPENDED)
                    </button>
                  </div>
                </div>

              </div>

              {/* High-Impact Promotion Card for New Cleaners */}
              <div className="bg-gradient-to-br from-surface-container to-secondary-fixed/40 rounded-3xl p-6 shadow-sm border border-outline-variant/30 space-y-4 relative overflow-hidden">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm font-bold">
                      <span className="material-symbols-outlined text-[14px]">card_giftcard</span>
                      신규 입점 혜택 프로모션
                    </div>
                    <h3 className="font-headline-md text-primary font-extrabold tracking-tight text-xl">
                      아직 쓸고닦고 파트너가 아니신가요?
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest text-secondary flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[28px]">handshake</span>
                  </div>
                </div>

                <p className="font-body-md text-on-surface">
                  입점 승인 완료 즉시 <span className="font-bold text-secondary">‘첫 배차 100% 무료 쿠폰(33,000원 상당)’</span>을 전원 지급합니다!
                </p>

                <div className="flex items-center gap-2 text-on-surface-variant font-body-sm">
                  <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                  <span>사업자등록증과 기본 시공 경력만 있으면 10분 내 신청 완료</span>
                </div>

                <button
                  type="button"
                  onClick={() => nav('PTNR-ATH-01')}
                  className="w-full py-3.5 px-5 rounded-xl bg-primary text-on-primary font-headline-sm font-bold flex items-center justify-between shadow-sm hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span>무료 파트너 입점 신청하기 (PTNR-ATH-01)</span>
                  <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                </button>
              </div>

            </div>
          </div>

          {/* =====================================================================
              3. PARTNER DEDICATED SUPPORT & TRUST CREDENTIALS SECTION
          ===================================================================== */}
          <div className="mt-12 pt-8 bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm border border-outline-variant/30">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-center">
              {/* Support Hotline */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined text-[26px]">headset_mic</span>
                </div>
                <div>
                  <span className="font-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">파트너 전담 핫라인</span>
                  <div className="font-headline-md text-primary font-extrabold text-xl">1588-0000</div>
                  <p className="font-body-sm text-on-surface-variant">평일 07:00 ~ 19:00 (주말·공휴일 현장 긴급 지원)</p>
                </div>
              </div>

              {/* Kakao Channel */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#FEE500] text-[#191919] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[26px]">chat</span>
                </div>
                <div>
                  <span className="font-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">실시간 1:1 상담 채널</span>
                  <div className="font-headline-md text-on-surface font-bold text-xl">카카오톡 @쓸고닦고파트너</div>
                  <p className="font-body-sm text-on-surface-variant">현장 오더 배차 문의 및 정산 내역 즉시 조회</p>
                </div>
              </div>

              {/* Security & Compliance */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-secondary shrink-0">
                  <span className="material-symbols-outlined text-[26px]">security</span>
                </div>
                <div>
                  <span className="font-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">정보보안 및 공정 정산</span>
                  <div className="font-headline-md text-on-surface font-bold text-xl">ISMS-P &amp; 전자금융보호</div>
                  <p className="font-body-sm text-on-surface-variant">금융권 수준 256비트 암호화 및 에스크로 결제 안심망</p>
                </div>
              </div>
            </div>

            {/* Compliance Subtext */}
            <div className="mt-6 pt-6 flex flex-col sm:flex-row items-center justify-between text-on-surface-variant font-body-sm gap-2 border-t border-outline-variant/20">
              <p>© SsulDak Partner Operations. All rights reserved. (주)쓸고닦고 파트너 사업본부</p>
              <div className="flex items-center gap-4 font-label-sm">
                <button type="button" onClick={() => showToast('파트너 이용약관')} className="hover:underline">파트너 이용약관</button>
                <span className="text-outline-variant">·</span>
                <button type="button" onClick={() => showToast('에스크로 정산 운영정책')} className="hover:underline">에스크로 정산 운영정책</button>
                <span className="text-outline-variant">·</span>
                <button type="button" onClick={() => showToast('개인정보처리방침')} className="hover:underline font-bold text-on-surface">개인정보처리방침</button>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* =========================================================================
          4. MODAL DIALOGS FOR PARTNER APPROVAL STATUS
      ========================================================================= */}
      {modalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-outline-variant/30 flex flex-col gap-4">
            
            {/* Modal Icon & Header */}
            <div className="flex items-start gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                modalState.type === 'PENDING'
                  ? 'bg-amber-100 text-amber-700'
                  : modalState.type === 'REJECTED'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-neutral-100 text-neutral-700'
              }`}>
                <span className="material-symbols-outlined text-[28px]">
                  {modalState.type === 'PENDING' ? 'hourglass_top' : modalState.type === 'REJECTED' ? 'cancel' : 'block'}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="font-headline-md text-on-surface font-extrabold text-lg">
                  {modalState.title}
                </h3>
                <p className="font-body-sm text-on-surface-variant mt-1 leading-relaxed">
                  {modalState.message}
                </p>
              </div>
            </div>

            {/* Reject Reason Box */}
            {modalState.type === 'REJECTED' && modalState.rejectReason && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/60 text-rose-900 text-sm font-medium">
                <div className="font-bold flex items-center gap-1 mb-1 text-rose-800">
                  <span className="material-symbols-outlined text-[16px]">info</span>
                  반려 사유:
                </div>
                <p className="text-xs leading-relaxed">{modalState.rejectReason}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2">
              {modalState.type === 'REJECTED' && (
                <button
                  type="button"
                  onClick={() => {
                    setModalState({ ...modalState, isOpen: false });
                    nav('PTNR-ATH-01');
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-primary text-on-primary font-label-lg font-bold text-center hover:bg-primary-container transition-colors shadow-sm"
                >
                  서류 보완 제출하기
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalState({ ...modalState, isOpen: false })}
                className="flex-1 py-3 px-4 rounded-xl bg-surface-container-low text-on-surface font-label-lg font-bold text-center hover:bg-surface-container transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          5. FLOATING TOAST NOTIFICATION
      ========================================================================= */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl bg-inverse-surface text-inverse-on-surface font-label-md text-label-md font-semibold shadow-2xl z-50 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-secondary-container">info</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default PtnrAth00Screen;
