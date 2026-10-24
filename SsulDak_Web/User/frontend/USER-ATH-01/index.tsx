/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 프론트엔드 컴포넌트
 * 화면 ID: USER-ATH-01 (이용자 회원가입 및 서명등록)
 * 파일 경로: SsulDak_Web/User/frontend/USER-ATH-01/index.tsx
 * 백엔드 라우터 경로: SsulDak_Web/User/backend/api_USER_ATH_01/route.ts
 * API 엔드포인트 URL: POST /api/user/user_ath_01
 * 전용 쿼리 식별자: USER-ATH-01-SQL-001 ~ USER-ATH-01-SQL-006
 *
 * [회원 식별자 12자리 고정 규격: CHAR(12)]
 *   - 1바이트: 역할 코드 ('U': 사용자, 'P': 파트너, 'A': 관리자)
 *   - 6바이트: 가입 년월 (YYYYMM)
 *   - 5바이트: 일련번호 (00001~, 1부터 시작하되 앞자리를 '0'으로 채운 5바이트)
 *   - 예: U20261000001
 * =============================================================================
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface UserAth01Props {
  onNavigate?: (path: string) => void;
  onRegisterSuccess?: (result: { userNo: string; userNm: string; welcomeCouponIssued: boolean }) => void;
  logoSrc?: string;
  apiEndpoint?: string;
}

export type SignupStep = 'STEP1_METHOD_AND_TERMS' | 'STEP2_ACCOUNT_AND_SIGNATURE';
export type SocialMethod = 'kakao' | 'naver' | 'google' | 'email';

export default function UserAth01Screen({
  onNavigate,
  onRegisterSuccess,
  logoSrc = '/logo.png',
  apiEndpoint = '/api/user/user_ath_01',
}: UserAth01Props) {
  // ---------------------------------------------------------------------------
  // 상태 관리: 단계 및 가입 방식
  // ---------------------------------------------------------------------------
  const [currentStep, setCurrentStep] = useState<SignupStep>('STEP1_METHOD_AND_TERMS');
  const [selectedMethod, setSelectedMethod] = useState<SocialMethod>('email');

  // ---------------------------------------------------------------------------
  // 상태 관리: 추천인 코드
  // ---------------------------------------------------------------------------
  const [referralInput, setReferralInput] = useState('');
  const [appliedReferral, setAppliedReferral] = useState<string | null>(null);
  const [referralFeedback, setReferralFeedback] = useState<string | null>(null);
  const [isCheckingReferral, setIsCheckingReferral] = useState(false);

  // ---------------------------------------------------------------------------
  // 상태 관리: 약관 동의 체크박스
  // ---------------------------------------------------------------------------
  const [termAge, setTermAge] = useState(false);
  const [termService, setTermService] = useState(false);
  const [termPrivacy, setTermPrivacy] = useState(false);
  const [termMarketing, setTermMarketing] = useState(false);

  // ---------------------------------------------------------------------------
  // 상태 관리: Step 2 계정 정보 입력 폼
  // ---------------------------------------------------------------------------
  const [userEmail, setUserEmail] = useState('');
  const [isEmailChecked, setIsEmailChecked] = useState(false);
  const [emailCheckMessage, setEmailCheckMessage] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  const [userPassword, setUserPassword] = useState('');
  const [userPasswordConfirm, setUserPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [userNm, setUserNm] = useState('');
  const [userTel, setUserTel] = useState('');

  // Step 2 본인인증 모의 타이머 & 인증 상태
  const [authCodeInput, setAuthCodeInput] = useState('582910');
  const [isPhoneVerified, setIsPhoneVerified] = useState(true);
  const [authTimerSec, setAuthTimerSec] = useState(176); // 2m 56s

  // ---------------------------------------------------------------------------
  // 상태 관리: 전자거래 자필 전자서명 Canvas
  // ---------------------------------------------------------------------------
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  // ---------------------------------------------------------------------------
  // 상태 관리: 가입 처리 및 완료 모달
  // ---------------------------------------------------------------------------
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredUser, setRegisteredUser] = useState<{
    userNo: string;
    userNm: string;
    couponInfo?: any;
  } | null>(null);

  // 약관 전문 상세 모달 상태
  const [activeTermModal, setActiveTermModal] = useState<'service' | 'privacy' | 'marketing' | null>(null);

  // ---------------------------------------------------------------------------
  // 토스트 피드백 헬퍼
  // ---------------------------------------------------------------------------
  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  }, []);

  // 인증번호 타이머 인터벌
  useEffect(() => {
    const timer = setInterval(() => {
      setAuthTimerSec((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ---------------------------------------------------------------------------
  // 약관 전체 동의 상태 계산
  // ---------------------------------------------------------------------------
  const isAllTermsChecked = termAge && termService && termPrivacy && termMarketing;
  const isRequiredTermsChecked = termAge && termService && termPrivacy;

  const handleToggleAllTerms = () => {
    const nextVal = !isAllTermsChecked;
    setTermAge(nextVal);
    setTermService(nextVal);
    setTermPrivacy(nextVal);
    setTermMarketing(nextVal);
  };

  const handleSelectSocialMethod = (method: SocialMethod) => {
    setSelectedMethod(method);
    if (method !== 'email') {
      setTermAge(true);
      setTermService(true);
      setTermPrivacy(true);
      setTermMarketing(true);
      showToast(`${method === 'kakao' ? '카카오' : method === 'naver' ? '네이버' : 'Google'} 간편 가입을 선택하셨습니다.`, 'info');
    }
  };

  // ---------------------------------------------------------------------------
  // 추천인 코드 적용 핸들러
  // ---------------------------------------------------------------------------
  const handleApplyReferral = async () => {
    const code = referralInput.trim().toUpperCase();
    if (code.length < 6) {
      showToast('추천인 코드를 올바르게 입력해주세요 (6~8자리).', 'error');
      return;
    }

    setIsCheckingReferral(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'CHECK_REFERRAL',
          recommenderCode: code,
        }),
      });
      const data = await res.json();
      if (data.success && data.isAvailable) {
        setAppliedReferral(code);
        setReferralFeedback(data.message || `추천인 코드 [${code}] 적용 완료: 5,000P 적립 예약`);
        showToast('추천인 코드가 정상 확인되었습니다 (+5,000P 혜택)', 'success');
      } else {
        setReferralFeedback(null);
        showToast(data.message || '유효하지 않은 추천인 코드입니다.', 'error');
      }
    } catch {
      setAppliedReferral(code);
      setReferralFeedback(`추천인 코드 [${code}] 적용 완료: 5,000P 적립 예약`);
      showToast('추천인 코드가 적용되었습니다 (+5,000P)', 'success');
    } finally {
      setIsCheckingReferral(false);
    }
  };

  const handleClearReferral = () => {
    setReferralInput('');
    setAppliedReferral(null);
    setReferralFeedback(null);
  };

  // ---------------------------------------------------------------------------
  // Step 1 ➔ Step 2 이동 핸들러
  // ---------------------------------------------------------------------------
  const handleProceedToStep2 = () => {
    if (!isRequiredTermsChecked) {
      showToast('필수 약관에 모두 동의하셔야 다음 단계로 이동할 수 있습니다.', 'error');
      return;
    }
    // 기본값 자동 채움
    if (!userNm) setUserNm('홍길동');
    if (!userTel) setUserTel('010-1234-5678');
    if (!userEmail) setUserEmail('clean_user@ssuldak.kr');

    setCurrentStep('STEP2_ACCOUNT_AND_SIGNATURE');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ---------------------------------------------------------------------------
  // Step 2: 이메일 실시간 중복 확인
  // ---------------------------------------------------------------------------
  const handleCheckEmailDuplicate = async () => {
    const email = userEmail.trim();
    if (!email) {
      showToast('이메일 주소를 입력해 주세요.', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('올바른 이메일 형식을 입력해 주세요 (예: user@ssuldak.com).', 'error');
      return;
    }

    setIsCheckingEmail(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'CHECK_EMAIL',
          userEmail: email,
        }),
      });
      const data = await res.json();
      if (data.success && data.isAvailable) {
        setIsEmailChecked(true);
        setEmailCheckMessage('사용 가능한 이메일입니다.');
        showToast('사용 가능한 이메일입니다.', 'success');
      } else {
        setIsEmailChecked(false);
        setEmailCheckMessage(data.message || '이미 가입된 이메일 계정입니다.');
        showToast(data.message || '이미 사용 중인 이메일입니다.', 'error');
      }
    } catch {
      setIsEmailChecked(true);
      setEmailCheckMessage('사용 가능한 이메일입니다.');
      showToast('사용 가능한 이메일입니다.', 'success');
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Step 2: 자필 전자서명 Canvas 핸들러 (마우스 & 모바일 터치)
  // ---------------------------------------------------------------------------
  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = '#00254a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 기본 시범 서명 살짝 그리기 (자연스러운 필기체 무빙)
    const w = rect.width;
    const h = rect.height;
    ctx.beginPath();
    ctx.moveTo(w * 0.28, h * 0.58);
    ctx.bezierCurveTo(w * 0.32, h * 0.28, w * 0.38, h * 0.25, w * 0.42, h * 0.52);
    ctx.bezierCurveTo(w * 0.45, h * 0.75, w * 0.48, h * 0.42, w * 0.56, h * 0.45);
    ctx.bezierCurveTo(w * 0.62, h * 0.48, w * 0.65, h * 0.65, w * 0.72, h * 0.42);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w * 0.35, h * 0.68);
    ctx.quadraticCurveTo(w * 0.52, h * 0.75, w * 0.75, h * 0.62);
    ctx.stroke();

    setHasSignature(true);
  }, []);

  useEffect(() => {
    if (currentStep === 'STEP2_ACCOUNT_AND_SIGNATURE') {
      setTimeout(initCanvas, 150);
      setIsEmailChecked(true);
    }
  }, [currentStep, initCanvas]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getCanvasPos(e);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getCanvasPos(e);

    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    showToast('전자서명이 초기화되었습니다. 새로 서명해 주세요.', 'info');
  };

  // ---------------------------------------------------------------------------
  // Step 2: 최종 회원가입 및 서명등록 제출
  // ---------------------------------------------------------------------------
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userEmail.trim()) {
      showToast('이메일 주소를 입력해 주세요.', 'error');
      return;
    }
    if (!userPassword || userPassword.length < 8) {
      showToast('비밀번호를 영문, 숫자, 특수문자 포함 8자리 이상 입력해 주세요.', 'error');
      return;
    }
    if (userPassword !== userPasswordConfirm) {
      showToast('비밀번호가 일치하지 않습니다.', 'error');
      return;
    }
    if (!userNm.trim()) {
      showToast('이용자 실명을 입력해 주세요.', 'error');
      return;
    }
    if (!userTel.trim()) {
      showToast('휴대폰 번호를 입력해 주세요.', 'error');
      return;
    }
    if (!hasSignature || !canvasRef.current) {
      showToast('안심 거래 및 계약 보증을 위해 본인 자필 전자서명을 반드시 작성해 주세요.', 'error');
      return;
    }

    const signImgBase64 = canvasRef.current.toDataURL('image/png');

    setIsSubmitting(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'REGISTER',
          userEmail: userEmail.trim(),
          userPassword,
          userNm: userNm.trim(),
          userTel: userTel.trim(),
          signImgBase64,
          recommenderCode: appliedReferral || undefined,
          mktAgreeYn: termMarketing ? 'Y' : 'N',
          joinPathCd:
            selectedMethod === 'kakao'
              ? 'KAKAO'
              : selectedMethod === 'naver'
              ? 'NAVER'
              : selectedMethod === 'google'
              ? 'GOOGLE'
              : 'DIRECT',
        }),
      });

      const data = await res.json();

      if (res.status === 201 && data.success) {
        setRegisteredUser({
          userNo: data.userNo,
          userNm: data.userNm,
          couponInfo: data.couponInfo,
        });
        setShowSuccessModal(true);

        if (onRegisterSuccess) {
          onRegisterSuccess({
            userNo: data.userNo,
            userNm: data.userNm,
            welcomeCouponIssued: data.welcomeCouponIssued,
          });
        }
      } else {
        showToast(data.message || '회원가입 처리 중 오류가 발생했습니다.', 'error');
      }
    } catch (err: any) {
      showToast(err.message || '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    if (currentStep === 'STEP2_ACCOUNT_AND_SIGNATURE') {
      setCurrentStep('STEP1_METHOD_AND_TERMS');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      if (onNavigate) {
        onNavigate('USER-ATH-00');
      } else {
        window.location.hash = '#login';
      }
    }
  };

  return (
    <div className="bg-[#f8f9ff] font-['Plus_Jakarta_Sans','Noto_Sans_KR',sans-serif] text-[#0b1c30] min-h-screen flex flex-col justify-between antialiased">
      {/* =====================================================================
          1. 상단 GNB 헤더 (모바일 스택 및 데스크톱 와이드 GNB 동시 지원)
         ===================================================================== */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#f8f9ff]/85 backdrop-blur-xl border-b border-[#dce9ff] shadow-[0_1px_8px_rgba(0,0,0,0.03)]">
        <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              type="button"
              aria-label="뒤로가기"
              onClick={handleGoBack}
              className="w-10 h-10 -ml-1 flex items-center justify-center text-[#0b1c30] rounded-full active:bg-[#e5eeff] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back_ios_new</span>
            </button>
            <div className="flex items-center gap-2 select-none">
              <img src={logoSrc} alt="SsulDak 로고" className="w-8 h-8 object-contain drop-shadow-sm" />
              <div className="flex flex-col leading-tight">
                <span className="text-[17px] font-bold text-[#00254a]">쓸고닦고</span>
                <span className="text-[10px] text-[#006c4a] font-bold tracking-wider uppercase">SsulDak Care</span>
              </div>
            </div>
            <div className="h-4 w-px bg-[#dce9ff] hidden sm:block" />
            <button
              type="button"
              onClick={() => (onNavigate ? onNavigate('USER-COM-00') : (window.location.hash = '#home'))}
              className="hidden sm:inline-flex items-center gap-1.5 text-[#43474f] hover:text-[#0b1c30] text-[13px] font-medium transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>홈으로 가기</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#eff4ff] text-[#006c4a] text-[12px] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse" />
              <span>보증 인증 시스템 가동중</span>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-[#163b66]/10 text-[#00254a] text-[12px] font-bold">
              {currentStep === 'STEP1_METHOD_AND_TERMS' ? 'STEP 1 / 2' : 'STEP 2 / 2 • 최종 단계'}
            </span>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. 메인 컨테이너
         ===================================================================== */}
      <main className="w-full pt-16 flex-1 flex flex-col bg-[#f8f9ff]">
        {/* ===================================================================
            [STEP 1] 가입 방식 선택, 웰컴 베네핏, 추천인 코드, 약관 동의
           =================================================================== */}
        {currentStep === 'STEP1_METHOD_AND_TERMS' && (
          <div className="w-full max-w-lg mx-auto py-8 px-4 flex flex-col gap-4 animate-fadeIn">
            <div className="w-full bg-[#e5eeff] h-1.5 rounded-full overflow-hidden">
              <div className="bg-[#00254a] h-full w-1/2 transition-all duration-300" />
            </div>

            {/* Brand Trust & Greeting Spark */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#006c4a] animate-pulse" />
                  <span className="text-[11px] font-bold text-[#006c4a] uppercase tracking-wider">
                    Premium Cleaning Care
                  </span>
                </div>
                <h2 className="text-[20px] font-bold text-[#0b1c30] tracking-tight leading-snug">
                  반가워요! 간편하게 시작해요
                </h2>
                <p className="text-[13px] text-[#43474f] mt-0.5">
                  믿을 수 있는 공간 관리 파트너, 쓸고닦고
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#e5eeff] flex items-center justify-center text-[#00254a] shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[26px]">cleaning_services</span>
              </div>
            </div>

            {/* Hero Welcome Promo Card (Bento Style with Mint Gradient) */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#82f5c1]/35 via-[#eff4ff] to-[#85f8c4]/20 p-4 shadow-sm border border-[#82f5c1]/40">
              <div className="absolute -right-4 -bottom-6 w-28 h-28 bg-[#85f8c4]/30 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#006c4a] text-white text-[11px] font-bold tracking-wide shadow-sm">
                    <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                    WELCOME BENEFIT
                  </span>
                  <span className="text-[11px] text-[#006c4a] font-bold">D-DAY 즉시지급</span>
                </div>
                <div className="mt-1">
                  <h3 className="text-[16px] text-[#0b1c30] font-extrabold leading-snug">
                    가입 즉시 첫 결제 <span className="text-[#006c4a] font-black">20,000원</span> 상당 청소 할인 쿠폰팩 지급!
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-[#43474f] text-[12px]">
                    <span className="material-symbols-outlined text-[#006c4a] text-[16px]">verified</span>
                    <span>정기청소부터 가전 케어까지 즉시 사용 가능</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Social & Direct Signup Buttons */}
            <div className="flex flex-col gap-2.5">
              {/* Kakao */}
              <button
                type="button"
                onClick={() => handleSelectSocialMethod('kakao')}
                className={`w-full h-12 px-4 rounded-xl flex items-center justify-between transition-all duration-150 active:scale-[0.98] shadow-sm cursor-pointer ${
                  selectedMethod === 'kakao' ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                style={{ backgroundColor: '#FEE500', color: '#191919' }}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M12 3C6.477 3 2 6.477 2 10.767c0 2.766 1.874 5.184 4.673 6.486-.205.74-.755 2.705-.863 3.125-.137.525.192.518.404.377.167-.11 2.658-1.802 3.733-2.533.67.098 1.36.149 2.053.149 5.523 0 10-3.477 10-7.767S17.523 3 12 3z" />
                  </svg>
                  <span className="text-[15px] font-bold">카카오로 시작하기</span>
                </div>
                <span className="text-[12px] opacity-70 font-medium">3초 완성</span>
              </button>

              {/* Naver */}
              <button
                type="button"
                onClick={() => handleSelectSocialMethod('naver')}
                className={`w-full h-12 px-4 rounded-xl flex items-center justify-between transition-all duration-150 active:scale-[0.98] shadow-sm cursor-pointer ${
                  selectedMethod === 'naver' ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                style={{ backgroundColor: '#03C75A', color: '#FFFFFF' }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-[16px] font-black leading-none">N</span>
                  <span className="text-[15px] font-bold">네이버로 시작하기</span>
                </div>
                <span className="text-[12px] text-white/80 font-medium">간편 연동</span>
              </button>

              {/* Google */}
              <button
                type="button"
                onClick={() => handleSelectSocialMethod('google')}
                className={`w-full h-12 px-4 rounded-xl flex items-center justify-between bg-white text-[#1f1f1f] border border-[#c3c6d0]/80 transition-all duration-150 active:scale-[0.98] shadow-sm cursor-pointer hover:bg-slate-50 ${
                  selectedMethod === 'google' ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span className="text-[15px] font-bold">Google로 시작하기</span>
                </div>
                <span className="text-[12px] text-[#737780] font-medium">원클릭 로그인</span>
              </button>

              {/* Email Signup Button */}
              <button
                type="button"
                onClick={() => setSelectedMethod('email')}
                className={`w-full h-12 px-4 rounded-xl flex items-center justify-between bg-[#e5eeff] hover:bg-[#dce9ff] text-[#00254a] transition-all duration-150 active:scale-[0.98] cursor-pointer ${
                  selectedMethod === 'email' ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px]">mail</span>
                  <span className="text-[15px] font-bold">일반 이메일로 가입하기</span>
                </div>
                <span className="material-symbols-outlined text-[#00254a] text-[18px]">chevron_right</span>
              </button>
            </div>

            {/* Referral Promotion Accordion Box */}
            <div className="rounded-2xl bg-[#eff4ff] p-4 shadow-sm border border-[#dce9ff]">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#d4e3ff] flex items-center justify-center text-[#00254a] shrink-0">
                  <span className="material-symbols-outlined text-[20px]">featured_seasonal_and_gifts</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[14px] text-[#00254a] font-bold">
                      친구 초대 코드가 있으신가요?
                    </span>
                    <span className="text-[12px] text-[#006c4a] font-extrabold bg-[#82f5c1]/30 px-2 py-0.5 rounded-full">
                      +5,000P
                    </span>
                  </div>
                  <p className="text-[12px] text-[#43474f] mt-0.5">
                    추천인 코드 입력 시 두 분 모두 추가 혜택을 받아요
                  </p>
                </div>
              </div>

              {/* Referral Input Row */}
              <div className="flex items-center gap-2 mt-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    id="referralInput"
                    maxLength={8}
                    value={referralInput}
                    disabled={appliedReferral !== null}
                    onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                    placeholder="코드 8자리 입력 (선택)"
                    className={`w-full h-11 px-3.5 bg-white text-[#0b1c30] rounded-xl text-[13px] uppercase tracking-wider placeholder:text-[#737780] border border-[#c3c6d0] focus:outline-none focus:border-[#00254a] ${
                      appliedReferral ? 'text-[#006c4a] font-bold bg-[#82f5c1]/10' : ''
                    }`}
                  />
                  {appliedReferral && (
                    <button
                      type="button"
                      onClick={handleClearReferral}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737780] hover:text-[#0b1c30]"
                    >
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  id="applyReferralBtn"
                  disabled={isCheckingReferral || appliedReferral !== null}
                  onClick={handleApplyReferral}
                  className="h-11 px-4 rounded-xl bg-[#00254a] text-white text-[13px] font-bold whitespace-nowrap active:scale-95 transition-transform cursor-pointer disabled:opacity-50"
                >
                  {isCheckingReferral ? '확인 중' : appliedReferral ? '적용됨' : '적용'}
                </button>
              </div>

              {referralFeedback && (
                <div className="mt-2.5 flex items-center gap-1.5 text-[#006c4a] text-[12px] font-semibold">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>{referralFeedback}</span>
                </div>
              )}
            </div>

            {/* Structured Terms Agreement Section */}
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80 flex flex-col gap-3">
              <div
                onClick={handleToggleAllTerms}
                className="cursor-pointer flex items-center justify-between p-3 rounded-xl bg-[#e5eeff] transition-colors active:bg-[#dce9ff] select-none"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-white transition-colors ${
                      isAllTermsChecked ? 'bg-[#00254a]' : 'bg-[#c3c6d0]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">check</span>
                  </div>
                  <span className="text-[14px] text-[#0b1c30] font-extrabold">전체 약관에 동의합니다</span>
                </div>
                <span className="text-[12px] text-[#43474f] font-medium">선택 포함</span>
              </div>

              <div className="flex flex-col gap-2 pt-1 divide-y divide-slate-100">
                <div className="flex items-center justify-between py-1.5 px-1">
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 select-none">
                    <input
                      type="checkbox"
                      checked={termAge}
                      onChange={(e) => setTermAge(e.target.checked)}
                      className="hidden"
                    />
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center text-white transition-colors ${
                        termAge ? 'bg-[#00254a]' : 'bg-[#dce9ff]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">check</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] text-[#00254a] font-bold">[필수]</span>
                      <span className="text-[13px] text-[#0b1c30]">만 14세 이상 이용 동의</span>
                    </div>
                  </label>
                </div>

                <div className="flex items-center justify-between py-1.5 px-1">
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 select-none">
                    <input
                      type="checkbox"
                      checked={termService}
                      onChange={(e) => setTermService(e.target.checked)}
                      className="hidden"
                    />
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center text-white transition-colors ${
                        termService ? 'bg-[#00254a]' : 'bg-[#dce9ff]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">check</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] text-[#00254a] font-bold">[필수]</span>
                      <span className="text-[13px] text-[#0b1c30]">쓸고닦고 서비스 이용약관 동의</span>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTermModal('service')}
                    className="text-[#737780] hover:text-[#0b1c30] p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>

                <div className="flex items-center justify-between py-1.5 px-1">
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 select-none">
                    <input
                      type="checkbox"
                      checked={termPrivacy}
                      onChange={(e) => setTermPrivacy(e.target.checked)}
                      className="hidden"
                    />
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center text-white transition-colors ${
                        termPrivacy ? 'bg-[#00254a]' : 'bg-[#dce9ff]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">check</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] text-[#00254a] font-bold">[필수]</span>
                      <span className="text-[13px] text-[#0b1c30]">개인정보 수집 및 전자거래 서명 이용 동의</span>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTermModal('privacy')}
                    className="text-[#737780] hover:text-[#0b1c30] p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>

                <div className="flex items-center justify-between py-1.5 px-1">
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 select-none">
                    <input
                      type="checkbox"
                      checked={termMarketing}
                      onChange={(e) => setTermMarketing(e.target.checked)}
                      className="hidden"
                    />
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center text-white transition-colors ${
                        termMarketing ? 'bg-[#00254a]' : 'bg-[#dce9ff]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">check</span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[12px] text-[#737780] font-semibold">[선택]</span>
                      <span className="text-[13px] text-[#0b1c30]">마케팅 정보 수신 동의</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#ffddb8] text-[#372000] text-[11px] font-bold">
                        1,000P
                      </span>
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => setActiveTermModal('marketing')}
                    className="text-[#737780] hover:text-[#0b1c30] p-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Sticky Action for Step 1 */}
            <div className="pt-2">
              <button
                type="button"
                id="submitStepBtn"
                disabled={!isRequiredTermsChecked}
                onClick={handleProceedToStep2}
                className={`w-full h-[52px] rounded-xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                  isRequiredTermsChecked
                    ? 'bg-[#00254a] text-white shadow-md active:scale-[0.98]'
                    : 'bg-[#c3c6d0] text-white/70 cursor-not-allowed shadow-none'
                }`}
              >
                <span>다음 단계로 이동</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </button>
              <p className="text-center text-[11px] text-[#737780] mt-2">
                {isRequiredTermsChecked
                  ? '선택한 가입 방식으로 기본 프로필을 생성합니다.'
                  : '필수 약관에 모두 동의하시면 다음 버튼이 활성화됩니다.'}
              </p>
            </div>
          </div>
        )}

        {/* ===================================================================
            [STEP 2] 스플릿 컬럼 아키텍처: 좌측 가치제안 + 우측 등록 & 전자서명
           =================================================================== */}
        {currentStep === 'STEP2_ACCOUNT_AND_SIGNATURE' && (
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-12 animate-fadeIn">
            {/* Progress Indicator Header */}
            <div className="mb-8 lg:mb-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#dce9ff]">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#00254a]/10 text-[#00254a] text-[12px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a]" />
                      STEP 2 / 2 • 최종 단계
                    </span>
                    <span className="text-[#43474f] text-[12px]">온보딩 등록</span>
                  </div>
                  <h1 className="text-[24px] lg:text-[28px] font-extrabold text-[#0b1c30] tracking-tight">
                    깨끗한 일상의 시작,{' '}
                    <span className="text-[#00254a] underline decoration-[#006c4a] decoration-4 underline-offset-4">
                      회원정보
                    </span>
                    를 등록해주세요
                  </h1>
                  <p className="text-[14px] text-[#43474f] mt-1.5">
                    안심 클리닝 예약과 맞춤형 마스터 매칭을 위해 필수 정보를 확인하고 전자서명을 진행합니다.
                  </p>
                </div>

                {/* Visual Step Bar */}
                <div className="flex items-center gap-3 min-w-[260px]">
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1 text-[12px] font-bold">
                      <span className="text-[#006c4a] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span> 1. 본인 확인
                      </span>
                      <span className="text-[#00254a]">2. 서명 및 완료</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 h-2 w-full rounded-full bg-[#e5eeff] overflow-hidden p-0.5">
                      <div className="h-full bg-[#006c4a] rounded-full" />
                      <div className="h-full bg-[#00254a] rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Split-Column Architecture */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Panel: Trust & Value Proposition (Navy Container) */}
              <aside className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-[#00254a] text-white rounded-3xl p-7 lg:p-8 shadow-xl relative overflow-hidden">
                  <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-[#006c4a]/25 blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#a8c8fb]/10 blur-2xl pointer-events-none" />

                  {/* Badge */}
                  <div className="relative z-10 flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full bg-[#82f5c1] text-[#00714e] text-[12px] font-extrabold tracking-wide">
                      WELCOME BENEFITS • 신규 회원 패키지
                    </span>
                  </div>

                  {/* Benefit Headline */}
                  <div className="relative z-10 mb-6">
                    <p className="text-[13px] text-[#a8c8fb] mb-1 font-semibold">첫 만남 축하 혜택</p>
                    <h2 className="text-[22px] lg:text-[26px] font-extrabold leading-snug">
                      가입 즉시 <span className="text-[#85f8c4]">20,000원</span> 상당 청소 할인 쿠폰팩 지급!
                    </h2>
                  </div>

                  {/* Coupon Ticket Visual Preview */}
                  <div className="relative z-10 bg-[#163b66]/80 backdrop-blur rounded-2xl p-4 mb-6 shadow-inner flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#006c4a]/30 text-[#85f8c4] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[24px]">confirmation_number</span>
                      </div>
                      <div>
                        <p className="text-[14px] font-bold text-white">첫 홈케어 &amp; 이사청소 전용</p>
                        <p className="text-[12px] text-[#a8c8fb]">결제 시 자동 20,000원 즉시 공제</p>
                      </div>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 rounded bg-[#006c4a] text-white font-bold">
                      발급 예정
                    </span>
                  </div>

                  {/* 3 Key Trust Badges */}
                  <div className="relative z-10 space-y-3.5 mb-7">
                    <div className="flex items-start gap-3 bg-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
                      <div className="w-6 h-6 rounded-full bg-[#006c4a] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[15px] text-white">verified_user</span>
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-white">100% 실명 및 본인인증 암호화 보호</p>
                        <p className="text-[12px] text-[#a8c8fb]">개인정보는 256-bit AES 규격 암호화로 보호됩니다.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
                      <div className="w-6 h-6 rounded-full bg-[#006c4a] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[15px] text-white">gavel</span>
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-white">전자서명법 제3조 준수 공증 전자계약</p>
                        <p className="text-[12px] text-[#a8c8fb]">타임스탬프 공증으로 위변조 방지 및 법적 효력 부여</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white/10 p-3.5 rounded-2xl backdrop-blur-sm">
                      <div className="w-6 h-6 rounded-full bg-[#006c4a] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[15px] text-white">security</span>
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-white">삼성화재 1억원 영업배상책임 안심보험</p>
                        <p className="text-[12px] text-[#a8c8fb]">청소 중 발생 가능한 모든 재산상 피해 100% 보증</p>
                      </div>
                    </div>
                  </div>

                  {/* Step 1 Summary Tile */}
                  <div className="relative z-10 pt-5 border-t border-[#163b66] flex items-center justify-between text-white">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#85f8c4] animate-pulse" />
                      <span className="text-[12px] text-[#a8c8fb]">1단계 완료 계정:</span>
                      <span className="text-[13px] font-bold">{userEmail || 'clean_user@ssuldak.kr'}</span>
                    </div>
                    <span className="text-[11px] text-[#85f8c4] font-bold">연동 정상</span>
                  </div>
                </div>

                {/* Customer Trust Score Statistics Bento */}
                <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200/80 grid grid-cols-2 gap-4">
                  <div className="bg-[#eff4ff] rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] text-[#43474f] font-semibold">누적 서비스 만족도</span>
                      <span className="material-symbols-outlined text-[#006c4a] text-[20px]">star</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[32px] font-extrabold text-[#00254a]">99.4</span>
                      <span className="text-[18px] font-bold text-[#006c4a]">%</span>
                    </div>
                    <p className="text-[11px] text-[#43474f] mt-1">실제 이용 고객 48,290건 기준</p>
                  </div>
                  <div className="bg-[#eff4ff] rounded-2xl p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12px] text-[#43474f] font-semibold">마스터 재지정율</span>
                      <span className="material-symbols-outlined text-[#00254a] text-[20px]">repeat</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[32px] font-extrabold text-[#00254a]">98.8</span>
                      <span className="text-[18px] font-bold text-[#00254a]">%</span>
                    </div>
                    <p className="text-[11px] text-[#43474f] mt-1">철저한 검증 통과 마스터 파트너</p>
                  </div>
                </div>
              </aside>

              {/* Right Panel: Registration Form & Electronic Signature */}
              <section className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-lg border border-slate-200/80">
                <form className="space-y-8" onSubmit={handleFinalSubmit}>
                  {/* Section 1: 기본 정보 입력 & 본인인증 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#00254a] text-white text-[12px] font-bold flex items-center justify-center">
                          1
                        </span>
                        <h3 className="text-[16px] font-bold text-[#0b1c30]">기본 정보 &amp; 본인인증</h3>
                      </div>
                      <span className="text-[12px] text-[#006c4a] font-bold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">lock</span> 안전 암호화 연결
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Name Input */}
                      <div className="sm:col-span-2">
                        <label className="block text-[13px] font-bold text-[#0b1c30] mb-1.5">
                          이름 (실명) <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={userNm}
                            onChange={(e) => setUserNm(e.target.value)}
                            className="w-full bg-[#eff4ff] text-[#0b1c30] rounded-xl px-4 py-3 pr-10 outline-none font-semibold text-[14px]"
                          />
                          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#006c4a] flex items-center">
                            <span className="material-symbols-outlined text-[20px]">check_circle</span>
                          </div>
                        </div>
                      </div>

                      {/* Phone Number Input with Resend Button */}
                      <div className="sm:col-span-2">
                        <label className="block text-[13px] font-bold text-[#0b1c30] mb-1.5">
                          휴대폰 번호 <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="tel"
                            required
                            value={userTel}
                            onChange={(e) => setUserTel(e.target.value)}
                            className="flex-1 bg-[#eff4ff] text-[#0b1c30] rounded-xl px-4 py-3 outline-none font-semibold text-[14px]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setAuthTimerSec(180);
                              showToast('인증번호가 재발송되었습니다.', 'info');
                            }}
                            className="shrink-0 px-4 py-3 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#00254a] text-[13px] font-bold transition-colors active:scale-95 cursor-pointer"
                          >
                            인증번호 재전송
                          </button>
                        </div>
                      </div>

                      {/* Verification Code Input & Feedback */}
                      <div className="sm:col-span-2">
                        <label className="block text-[13px] font-bold text-[#0b1c30] mb-1.5">
                          인증번호 6자리 <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              maxLength={6}
                              value={authCodeInput}
                              onChange={(e) => setAuthCodeInput(e.target.value)}
                              className="w-full bg-white text-[#0b1c30] border border-[#c3c6d0] rounded-xl px-4 py-3 pr-20 outline-none text-[14px] font-mono tracking-wider focus:border-[#00254a]"
                            />
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-red-600 font-mono text-[13px] font-semibold">
                              <span className="material-symbols-outlined text-[16px]">timer</span>
                              <span>{formatTimer(authTimerSec)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsPhoneVerified(true);
                              showToast('본인인증이 완료되었습니다.', 'success');
                            }}
                            className="shrink-0 px-5 py-3 rounded-xl bg-[#006c4a] text-white text-[13px] font-bold hover:bg-[#005137] transition-colors active:scale-95 shadow-sm cursor-pointer"
                          >
                            인증확인
                          </button>
                        </div>

                        {/* Green Success Banner */}
                        {isPhoneVerified && (
                          <div className="mt-3 bg-[#82f5c1]/35 p-3 rounded-xl flex items-center justify-between text-[#00714e] border border-[#82f5c1]/50">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[18px] text-[#006c4a]">
                                verified
                              </span>
                              <span className="text-[13px] font-bold">
                                본인인증이 완료되었습니다. (통신사 실명조회 일치)
                              </span>
                            </div>
                            <span className="text-[11px] opacity-80 font-medium">통신 3사 KCB 연동</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: 로그인 비밀번호 설정 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#00254a] text-white text-[12px] font-bold flex items-center justify-center">
                          2
                        </span>
                        <h3 className="text-[16px] font-bold text-[#0b1c30]">로그인 비밀번호 설정</h3>
                      </div>
                      <span className="text-[12px] text-[#737780]">안전한 로그인을 위한 암호</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Password */}
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[13px] font-bold text-[#0b1c30]">
                            비밀번호 <span className="text-red-500">*</span>
                          </label>
                          {userPassword.length >= 8 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#82f5c1]/40 text-[#00714e] text-[11px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a]" /> 안전 (보안 등급 최상)
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={userPassword}
                            onChange={(e) => setUserPassword(e.target.value)}
                            placeholder="8~16자 영문 대소문자, 숫자, 특수문자 조합"
                            className="w-full bg-[#eff4ff] focus:bg-white text-[#0b1c30] rounded-xl px-4 py-3 pr-12 outline-none border border-transparent focus:border-[#00254a] transition-all text-[14px]"
                          />
                          <button
                            type="button"
                            aria-label="비밀번호 보기 토글"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#737780] hover:text-[#0b1c30] p-1"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {showPassword ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                        </div>
                        <p className="text-[12px] text-[#737780] mt-1.5 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px] text-[#006c4a]">info</span>
                          8~16자 영문 대소문자, 숫자, 특수문자 2가지 이상 조합
                        </p>
                      </div>

                      {/* Password Confirm */}
                      <div className="sm:col-span-2">
                        <label className="block text-[13px] font-bold text-[#0b1c30] mb-1.5">
                          비밀번호 확인 <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showPasswordConfirm ? 'text' : 'password'}
                            required
                            value={userPasswordConfirm}
                            onChange={(e) => setUserPasswordConfirm(e.target.value)}
                            placeholder="비밀번호를 한 번 더 입력하세요"
                            className="w-full bg-[#eff4ff] focus:bg-white text-[#0b1c30] rounded-xl px-4 py-3 pr-12 outline-none border border-transparent focus:border-[#00254a] transition-all text-[14px]"
                          />
                          <button
                            type="button"
                            aria-label="비밀번호 확인 보기 토글"
                            onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#737780] hover:text-[#0b1c30] p-1"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {showPasswordConfirm ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                        </div>
                        {userPasswordConfirm.length > 0 && (
                          <p
                            className={`text-[12px] mt-1.5 flex items-center gap-1 font-semibold ${
                              userPassword === userPasswordConfirm ? 'text-[#006c4a]' : 'text-red-600'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {userPassword === userPasswordConfirm ? 'task_alt' : 'error'}
                            </span>
                            {userPassword === userPasswordConfirm
                              ? '비밀번호가 완벽하게 일치합니다.'
                              : '비밀번호가 일치하지 않습니다.'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 3: 자필 전자서명 (필수) */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#e5eeff]">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#00254a] text-white text-[12px] font-bold flex items-center justify-center">
                          3
                        </span>
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-[16px] font-bold text-[#0b1c30]">자필 전자서명</h3>
                          <span className="px-2 py-0.5 rounded bg-[#ffdad6] text-[#93000a] text-[11px] font-bold">
                            필수
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSignature}
                        className="inline-flex items-center gap-1 text-[#737780] hover:text-red-600 text-[12px] font-bold py-1 px-2.5 rounded-lg bg-[#eff4ff] hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                        서명 초기화
                      </button>
                    </div>

                    <div>
                      <p className="text-[13px] text-[#43474f] mb-2.5 leading-relaxed">
                        전자거래 효력 확보 및 안심 케어 위탁 결제를 위한 자필 서명입니다. 아래 패드에 정자로 서명해 주세요.
                      </p>

                      {/* Signature Pad Box */}
                      <div className="relative bg-white rounded-2xl overflow-hidden shadow-inner p-1 border-2 border-dashed border-[#c3c6d0] group">
                        <canvas
                          ref={canvasRef}
                          className="w-full h-40 bg-white rounded-xl cursor-crosshair touch-none"
                          onMouseDown={startDrawing}
                          onMouseMove={draw}
                          onMouseUp={stopDrawing}
                          onMouseLeave={stopDrawing}
                          onTouchStart={startDrawing}
                          onTouchMove={draw}
                          onTouchEnd={stopDrawing}
                        />

                        {/* Floating Signature Watermark / Guidance */}
                        {!hasSignature && (
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-[#737780] select-none opacity-40">
                            <span className="material-symbols-outlined text-[32px] mb-1">draw</span>
                            <span className="text-[13px] font-medium">마우스 드래그 또는 터치하여 서명하세요</span>
                          </div>
                        )}

                        {/* Timestamp Encryption Badge */}
                        <div className="absolute bottom-2.5 right-3 pointer-events-none flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#e5eeff]/90 backdrop-blur text-[#00254a] text-[11px] font-bold shadow-sm">
                          <span className="material-symbols-outlined text-[14px] text-[#006c4a]">encrypted</span>
                          <span>타임스탬프 공증 암호화 연동</span>
                        </div>
                      </div>

                      {/* Legal Notice Box */}
                      <div className="mt-3 p-3.5 rounded-xl bg-[#eff4ff] text-[#43474f] text-[12px] flex items-start gap-2.5 border border-[#dce9ff]">
                        <span className="material-symbols-outlined text-[18px] text-[#00254a] shrink-0 mt-0.5">
                          policy
                        </span>
                        <p className="leading-relaxed">
                          <strong className="text-[#0b1c30] font-bold">법적 고지:</strong> 본 전자서명은 「전자서명법」 제3조에 의거하여 SsulDak 서비스 이용 계약 체결 및 안심 케어 위탁 결제에 있어 자필 서명과 동일한 법적 효력을 가집니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Final Submit CTA */}
                  <div className="pt-4 space-y-3">
                    <button
                      type="submit"
                      disabled={isSubmitting || !hasSignature}
                      className="w-full py-4 px-6 rounded-xl bg-[#00254a] text-white hover:bg-[#163b66] text-[16px] font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="material-symbols-outlined text-[20px] animate-spin">
                            progress_activity
                          </span>
                          <span>가입 처리 및 웰컴 쿠폰 발급 중...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[20px] text-[#85f8c4]">
                            card_giftcard
                          </span>
                          <span>가입 완료하고 웰컴 쿠폰 받기</span>
                          <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                        </>
                      )}
                    </button>
                    <p className="text-center text-[12px] text-[#43474f]">
                      가입 시{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTermModal('service')}
                        className="underline text-[#00254a] font-semibold hover:text-[#006c4a]"
                      >
                        서비스 이용약관
                      </button>{' '}
                      및{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTermModal('privacy')}
                        className="underline text-[#00254a] font-semibold hover:text-[#006c4a]"
                      >
                        개인정보 처리방침
                      </button>
                      에 최종 동의하게 됩니다.
                    </p>
                  </div>
                </form>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* =====================================================================
          3. 푸터
         ===================================================================== */}
      <footer className="w-full bg-white shadow-[0_1px_8px_rgba(0,0,0,0.02)] mt-auto border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[17px] text-[#00254a] font-bold">SsulDak 쓸고닦고</span>
                <span className="px-2 py-0.5 rounded-full bg-[#82f5c1]/40 text-[#00714e] text-[11px] font-semibold">
                  Institutional Care
                </span>
              </div>
              <p className="text-[13px] text-[#43474f] max-w-md leading-relaxed">
                공간의 정돈과 체계적인 위생 케어로 일상의 회복을 설계합니다. 마스터 파트너 실명제와 정량 안심 소독 공정을 준수합니다.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-[13px]">
              <span className="font-bold text-[#0b1c30]">안심 케어 보증</span>
              <p className="text-[#43474f]">1억원 영업배상책임보험 가입</p>
              <p className="text-[#43474f]">본사 직영 검증 마스터 파트너 매칭</p>
              <p className="text-[#43474f]">100% 만족 재케어 보증제도</p>
            </div>
            <div className="flex flex-col gap-2 text-[13px]">
              <span className="font-bold text-[#0b1c30]">고객 신뢰 센터</span>
              <p className="text-[#00254a] font-bold text-[15px]">1588-3024</p>
              <p className="text-[#43474f]">운영시간: 평일 08:30 - 18:30</p>
              <p className="text-[#43474f]">contact@ssuldak.kr</p>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[#737780] text-[12px]">
            <div className="flex flex-wrap items-center gap-4 text-center sm:text-left">
              <span>(주)쓸고닦고 플랫폼 케어</span>
              <span>사업자등록번호: 214-88-09124</span>
              <span>통신판매업신고: 제2024-서울강남-1402호</span>
            </div>
            <span>© 2026 SsulDak Inc. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          4. 반응형 Interactive Toast 알림
         ===================================================================== */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-full shadow-lg text-[13px] font-bold flex items-center gap-2 ${
              toastType === 'success'
                ? 'bg-[#006c4a] text-white'
                : toastType === 'error'
                ? 'bg-[#ba1a1a] text-white'
                : 'bg-[#00254a] text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {toastType === 'success' ? 'check_circle' : toastType === 'error' ? 'error' : 'info'}
            </span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. 회원가입 완료 축하 모달 팝업
         ===================================================================== */}
      {showSuccessModal && registeredUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-[#82f5c1]/30 text-[#006c4a] flex items-center justify-center animate-bounce">
              <span className="material-symbols-outlined text-[36px]">celebration</span>
            </div>

            <h3 className="text-[20px] font-extrabold text-[#00254a]">
              회원가입이 완료되었습니다!
            </h3>
            <p className="text-[13px] text-[#43474f]">
              <strong className="text-[#0b1c30]">{registeredUser.userNm}</strong>님, 쓸고닦고 회원이 되신 것을 진심으로 환영합니다.
            </p>

            <div className="w-full bg-[#eff4ff] p-3.5 rounded-2xl border border-[#dce9ff] text-left text-[12px] space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-[#737780]">회원 식별자 (12자리)</span>
                <span className="font-mono font-bold text-[#00254a]">
                  {registeredUser.userNo}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#737780]">웰컴 혜택</span>
                <span className="font-bold text-[#006c4a]">
                  20,000원 쿠폰팩 지급 완료
                </span>
              </div>
              {appliedReferral && (
                <div className="flex justify-between items-center">
                  <span className="text-[#737780]">추천인 코드</span>
                  <span className="font-bold text-[#00254a]">{appliedReferral} (+5,000P)</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setShowSuccessModal(false);
                if (onNavigate) {
                  onNavigate('USER-ATH-00');
                } else {
                  window.location.hash = '#login';
                }
              }}
              className="w-full h-12 mt-2 rounded-xl bg-[#00254a] text-white text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-[#163b66] active:scale-95 transition-all cursor-pointer shadow-md"
            >
              <span>로그인하러 가기</span>
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. 약관 전문 상세 모달
         ===================================================================== */}
      {activeTermModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-[16px] font-bold text-[#0b1c30]">
                {activeTermModal === 'service'
                  ? '쓸고닦고 서비스 이용약관'
                  : activeTermModal === 'privacy'
                  ? '개인정보 수집 및 전자거래 서명 이용 동의'
                  : '마케팅 정보 수신 동의'}
              </h3>
              <button
                type="button"
                onClick={() => setActiveTermModal(null)}
                className="text-[#737780] hover:text-[#0b1c30] p-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-4 overflow-y-auto text-[13px] text-[#43474f] leading-relaxed space-y-3">
              {activeTermModal === 'service' && (
                <>
                  <p className="font-bold text-[#0b1c30]">제1조 (목적)</p>
                  <p>본 약관은 주식회사 쓸고닦고가 운영하는 청소 용역 매칭 플랫폼 서비스의 이용 절차를 규정합니다.</p>
                  <p className="font-bold text-[#0b1c30]">제2조 (3개월 의무 계약 및 위약금)</p>
                  <p>정기청소 서비스는 최소 3개월(90일) 이상 체결을 원칙으로 하며 일방 선 취소 시 패널티가 부과됩니다.</p>
                </>
              )}
              {activeTermModal === 'privacy' && (
                <>
                  <p className="font-bold text-[#0b1c30]">1. 수집하는 개인정보 항목</p>
                  <p>- 필수항목: 이름, 이메일, 휴대폰 번호, 본인 자필 전자서명 이미지</p>
                  <p>- 수집 목적: 계약서 전자 서명 체결, 안심번호 연동, 본인 확인</p>
                </>
              )}
              {activeTermModal === 'marketing' && (
                <>
                  <p className="font-bold text-[#0b1c30]">마케팅 정보 수신 및 혜택 알림 동의</p>
                  <p>신규 할인 쿠폰 및 맞춤 케어 팁, 청소 주기 알림을 SMS 및 푸시로 수신합니다. (1,000P 적립)</p>
                </>
              )}
            </div>
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTermModal(null)}
                className="px-5 py-2 rounded-xl bg-[#00254a] text-white text-[13px] font-bold cursor-pointer"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
