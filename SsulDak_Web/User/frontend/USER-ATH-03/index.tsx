/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 프론트엔드 컴포넌트
 * 화면 ID: USER-ATH-03 (마이페이지 프로필/서명 관리)
 * 파일 경로: SsulDak_Web/User/frontend/USER-ATH-03/index.tsx
 * 백엔드 라우터 경로: SsulDak_Web/User/backend/api_USER_ATH_03/route.ts
 * API 엔드포인트 URL: POST /api/user/user_ath_03
 * 전용 쿼리 식별자: USER-ATH-03-SQL-001 ~ USER-ATH-03-SQL-007
 * =============================================================================
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface UserAth03Props {
  onNavigate?: (path: string) => void;
  logoSrc?: string;
  apiEndpoint?: string;
  initialUserNo?: string;
}

export interface UserProfile {
  userNo: string;
  userEmail: string;
  userNm: string;
  userTel: string;
  signImgUrl: string | null;
  userStatCd: 'NORMAL' | 'SUSPENDED_7D' | 'BLOCKED' | 'WITHDRAWN';
  suspendExpireDt: string | null;
  cancelAccumCnt: number;
  mktAgreeYn: 'Y' | 'N';
  regDt: string;
}

export default function UserAth03Screen({
  onNavigate,
  logoSrc = '/logo.png',
  apiEndpoint = '/api/user/user_ath_03',
  initialUserNo = 'U20261000001',
}: UserAth03Props) {
  // ---------------------------------------------------------------------------
  // 1. 상태 관리
  // ---------------------------------------------------------------------------
  const [userNo, setUserNo] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ssuldak_user_no');
      if (stored && stored.startsWith('U') && stored.length === 12) {
        return stored;
      }
    }
    return initialUserNo;
  });

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 기본 정보 폼 상태
  const [userNm, setUserNm] = useState<string>('');
  const [userTel, setUserTel] = useState<string>('');
  const [mktAgreeYn, setMktAgreeYn] = useState<'Y' | 'N'>('Y');
  const [currentSignImg, setCurrentSignImg] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState<boolean>(false);

  // 전자서명 캔버스 모달 상태
  const [showSignModal, setShowSignModal] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasDrawn, setHasDrawn] = useState<boolean>(false);

  // 비밀번호 변경 폼 상태
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPwdCurrent, setShowPwdCurrent] = useState<boolean>(false);
  const [showPwdNew, setShowPwdNew] = useState<boolean>(false);
  const [showPwdConfirm, setShowPwdConfirm] = useState<boolean>(false);
  const [isChangingPassword, setIsChangingPassword] = useState<boolean>(false);

  // 회원 탈퇴 모달 상태
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawReasonType, setWithdrawReasonType] = useState<string>('SERVICE_DISSATISFACTION');
  const [customWithdrawReason, setCustomWithdrawReason] = useState<string>('');
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [withdrawErrorNotice, setWithdrawErrorNotice] = useState<string | null>(null);

  // 토스트 피드백 알림 상태
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // ---------------------------------------------------------------------------
  // 2. 프로필 조회 (GET_PROFILE)
  // ---------------------------------------------------------------------------
  const fetchProfile = async (targetUserNo: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'GET_PROFILE',
          userNo: targetUserNo,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.profile) {
        setProfile(data.profile);
        setUserNm(data.profile.userNm || '');
        setUserTel(data.profile.userTel || '');
        setMktAgreeYn(data.profile.mktAgreeYn || 'N');
        setCurrentSignImg(data.profile.signImgUrl || null);
      } else {
        showToast(data.message || '프로필 정보를 불러오지 못했습니다.', 'error');
      }
    } catch {
      showToast('서버와의 통신에 실패했습니다.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userNo) {
      fetchProfile(userNo);
    }
  }, [userNo]);

  // ---------------------------------------------------------------------------
  // 3. 회원번호 클립보드 복사
  // ---------------------------------------------------------------------------
  const handleCopyUserNo = () => {
    if (profile?.userNo) {
      navigator.clipboard.writeText(profile.userNo);
      showToast('회원번호가 클립보드에 복사되었습니다.', 'success');
    }
  };

  // ---------------------------------------------------------------------------
  // 4. 프로필 기본 정보 수정 (UPDATE_PROFILE)
  // ---------------------------------------------------------------------------
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNm.trim()) {
      showToast('회원 실명을 입력해 주세요.', 'error');
      return;
    }
    if (!userTel.trim()) {
      showToast('휴대폰 번호를 입력해 주세요.', 'error');
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'UPDATE_PROFILE',
          userNo,
          userNm: userNm.trim(),
          userTel: userTel.trim(),
          signImgBase64: currentSignImg || undefined,
          mktAgreeYn,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('내 정보가 안전하게 변경되었습니다.', 'success');
        if (data.profile) {
          setProfile(data.profile);
        }
      } else {
        showToast(data.message || '정보 수정에 실패했습니다.', 'error');
      }
    } catch {
      showToast('서버 오류로 정보를 수정할 수 없습니다.', 'error');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 5. 전자서명 캔버스 제어 핸들러
  // ---------------------------------------------------------------------------
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#00254a';
    setHasDrawn(false);
  };

  const handleOpenSignModal = () => {
    setShowSignModal(true);
    setTimeout(() => {
      initCanvas();
    }, 100);
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSaveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) {
      showToast('서명 패드에 자필 서명을 입력해 주세요.', 'error');
      return;
    }
    const base64 = canvas.toDataURL('image/png');
    setCurrentSignImg(base64);
    setShowSignModal(false);

    // 즉시 DB 프로필에 저장 반영
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'UPDATE_PROFILE',
          userNo,
          userNm: userNm.trim() || profile?.userNm,
          userTel: userTel.trim() || profile?.userTel,
          signImgBase64: base64,
          mktAgreeYn,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('새로운 자필 서명이 안전하게 반영되었습니다.', 'success');
        if (data.profile) setProfile(data.profile);
      }
    } catch {
      showToast('서명 저장에 성공했습니다. [기본 정보 저장] 버튼으로 완료해 주세요.', 'info');
    }
  };

  // ---------------------------------------------------------------------------
  // 6. 비밀번호 변경 (CHANGE_PASSWORD)
  // ---------------------------------------------------------------------------
  const hasLength = newPassword.length >= 8;
  const hasAlphaNum = /[a-zA-Z]/.test(newPassword) && /[0-9]/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
  const passedCount = (hasLength ? 1 : 0) + (hasAlphaNum ? 1 : 0) + (hasSpecial ? 1 : 0);

  let strengthLabel = '안전 / 최상 (Strong)';
  let strengthBadgeClass = 'px-2 py-0.5 rounded text-[11px] font-bold bg-[#82f5c1] text-[#00714e]';

  if (passedCount === 3) {
    strengthLabel = '안전 / 최상 (Strong)';
    strengthBadgeClass = 'px-2 py-0.5 rounded text-[11px] font-bold bg-[#82f5c1] text-[#00714e]';
  } else if (passedCount === 2) {
    strengthLabel = '보통 (Medium)';
    strengthBadgeClass = 'px-2 py-0.5 rounded text-[11px] font-bold bg-[#d3e4fe] text-[#43474f]';
  } else {
    strengthLabel = '보안 취약 (Weak)';
    strengthBadgeClass = 'px-2 py-0.5 rounded text-[11px] font-bold bg-[#ffdad6] text-[#ba1a1a]';
  }

  const isPasswordMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showToast('현재 비밀번호를 입력해 주세요.', 'error');
      return;
    }
    if (!hasLength || !hasAlphaNum || !hasSpecial) {
      showToast('새 비밀번호는 영문, 숫자, 특수문자를 포함한 8자리 이상이어야 합니다.', 'error');
      return;
    }
    if (!isPasswordMatch) {
      showToast('새 비밀번호 확인이 일치하지 않습니다.', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'CHANGE_PASSWORD',
          userNo,
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('비밀번호가 성공적으로 변경되었습니다. 보안을 위해 다른 기기는 자동 로그아웃되었습니다.', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.message || '비밀번호 변경에 실패했습니다.', 'error');
      }
    } catch {
      showToast('서버 오류로 비밀번호를 변경하지 못했습니다.', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 7. 회원 탈퇴 신청 (WITHDRAW) 및 계약 방어 검증
  // ---------------------------------------------------------------------------
  const handleWithdrawSubmit = async () => {
    const finalReason =
      withdrawReasonType === 'OTHER'
        ? customWithdrawReason.trim() || '기타 사유'
        : withdrawReasonType === 'SERVICE_DISSATISFACTION'
        ? '서비스 품질 불만족'
        : withdrawReasonType === 'MOVING_CLEAN_NOT_NEEDED'
        ? '이사/청소 완료로 인한 불필요'
        : '타 플랫폼 이용 전환';

    setIsWithdrawing(true);
    setWithdrawErrorNotice(null);

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'WITHDRAW',
          userNo,
          withdrawReason: finalReason,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setShowWithdrawModal(false);
        showToast('회원 탈퇴가 완료되었습니다. 이용해 주셔서 감사합니다.', 'info');
        localStorage.removeItem('ssuldak_user_no');
        localStorage.removeItem('ssuldak_jwt_token');
        setTimeout(() => {
          if (onNavigate) {
            onNavigate('USER-COM-00');
          } else {
            window.location.hash = '#home';
          }
        }, 1200);
      } else {
        // 탈퇴 차단 안내 (미완료 계약 / 진행 중 견적)
        setWithdrawErrorNotice(data.message || '탈퇴 처리 중 오류가 발생했습니다.');
      }
    } catch {
      setWithdrawErrorNotice('서버와의 통신에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleGoHome = () => {
    if (onNavigate) {
      onNavigate('USER-COM-00');
    } else {
      window.location.hash = '#home';
    }
  };

  return (
    <div className="bg-[#f8f9ff] font-['Plus_Jakarta_Sans',sans-serif] text-[#0b1c30] antialiased min-h-screen flex flex-col justify-between">
      {/* =====================================================================
          1. GNB 헤더
         ===================================================================== */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#f8f9ff]/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#eff4ff]">
        <div className="h-16 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a
              onClick={(e) => {
                e.preventDefault();
                handleGoHome();
              }}
              className="inline-flex items-center gap-2 group cursor-pointer"
              href="#home"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#00254a] flex items-center justify-center p-0.5 shadow-sm">
                <img
                  src={logoSrc}
                  alt="SsulDak 로고"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextElementSibling) {
                      (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'block';
                    }
                  }}
                />
                <span className="material-symbols-outlined text-[20px] text-white hidden">sanitizer</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[17px] tracking-tight text-[#00254a] font-bold">쓸고닦고</span>
                <span className="text-[11px] text-[#006c4a] font-bold tracking-wider uppercase">SsulDak Care</span>
              </div>
            </a>
            <div className="h-4 w-px bg-[#dce9ff] hidden sm:block"></div>
            <button
              type="button"
              onClick={handleGoHome}
              className="inline-flex items-center gap-1.5 text-[#43474f] hover:text-[#0b1c30] text-[13px] font-semibold transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>홈으로 가기</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#eff4ff] text-[#006c4a] text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse"></span>
              <span>마이페이지 보안 세션 보호 중</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#00254a] flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[18px]">account_circle</span>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. 메인 콘텐츠
         ===================================================================== */}
      <main className="w-full pt-20 pb-16 flex-1 flex flex-col bg-[#f8f9ff]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
          {/* Header Title & Status Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#dce9ff]/70">
            <div>
              <div className="flex items-center gap-2 text-[12px] font-bold text-[#006c4a] uppercase tracking-wider mb-1">
                <span className="w-2 h-2 rounded-full bg-[#006c4a]"></span>
                <span>User Account & Security Management</span>
              </div>
              <h1 className="text-[28px] sm:text-[32px] font-extrabold text-[#00254a] tracking-tight">
                내 정보 및 전자서명 관리
              </h1>
              <p className="text-[14px] text-[#43474f] mt-1">
                회원 기본 정보, 용역 계약 체결용 자필 전자서명 및 로그인 보안 설정을 안전하게 관리합니다.
              </p>
            </div>

            {/* Member No & Status Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-[#dce9ff] shadow-sm">
                <span className="text-[12px] text-[#43474f] font-medium">회원번호:</span>
                <span className="text-[13px] font-mono font-bold text-[#00254a]">{profile?.userNo || userNo}</span>
                <button
                  type="button"
                  onClick={handleCopyUserNo}
                  className="p-1 text-[#737780] hover:text-[#00254a] transition-colors cursor-pointer"
                  title="회원번호 복사"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                </button>
              </div>

              {profile?.userStatCd === 'SUSPENDED_7D' ? (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#ffddb8] text-[#653e00] text-[12px] font-bold border border-[#ffb95f]">
                  <span className="material-symbols-outlined text-[16px]">warning</span>
                  <span>
                    ※ 선 취소 패널티로 {profile.suspendExpireDt ? profile.suspendExpireDt.substring(0, 10) : '7일간'} 견적 제한 중
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#82f5c1]/40 text-[#00714e] text-[12px] font-bold border border-[#82f5c1]">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  <span>정상 이용 회원</span>
                </div>
              )}
            </div>
          </div>

          {/* Grid Layout: Left (Profile & Signature) / Right (Password & Danger Zone) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT 7 Cols: Basic Info & Digital Signature */}
            <div className="lg:col-span-7 space-y-6">
              {/* Card 1: 기본 정보 수정 */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#e5eeff] space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-[#eff4ff]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#00254a] text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">badge</span>
                    </div>
                    <h2 className="text-[18px] font-bold text-[#00254a]">기본 회원 정보</h2>
                  </div>
                  <span className="text-[11px] text-[#737780]">가입일: {profile?.regDt ? profile.regDt.substring(0, 10) : '-'}</span>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  {/* Email (Disabled) */}
                  <div>
                    <label className="block text-[13px] font-bold text-[#0b1c30] mb-1">
                      이메일 아이디 (계정)
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        disabled
                        value={profile?.userEmail || ''}
                        className="w-full px-4 py-3 rounded-xl bg-[#eff4ff] text-[#43474f] font-mono text-[14px] border border-[#dce9ff] cursor-not-allowed"
                      />
                      <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-[18px] text-[#737780]">
                        lock
                      </span>
                    </div>
                    <p className="text-[11px] text-[#737780] mt-1">※ 가입 이메일 아이디는 보안 및 계약 신원 인증을 위해 변경할 수 없습니다.</p>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-[13px] font-bold text-[#0b1c30] mb-1">
                      실명 (이름) <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={userNm}
                      onChange={(e) => setUserNm(e.target.value)}
                      placeholder="이름 입력"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-[#c3c6d0] text-[14px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#00254a]"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[13px] font-bold text-[#0b1c30] mb-1">
                      휴대폰 번호 <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={userTel}
                      onChange={(e) => setUserTel(e.target.value)}
                      placeholder="010-0000-0000"
                      className="w-full px-4 py-3 rounded-xl bg-white border border-[#c3c6d0] text-[14px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#00254a]"
                    />
                  </div>

                  {/* Marketing Agreement Toggle */}
                  <div className="p-4 rounded-xl bg-[#eff4ff]/60 border border-[#dce9ff]/60 flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-bold text-[#00254a] block">혜택 및 이벤트 알림 수신 동의</span>
                      <span className="text-[12px] text-[#43474f]">할인 쿠폰, 긴급 배차 정보, 안심 케어 리포트 알림</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMktAgreeYn(mktAgreeYn === 'Y' ? 'N' : 'Y')}
                      className={`w-12 h-6 flex items-center rounded-full p-1 duration-300 cursor-pointer ${
                        mktAgreeYn === 'Y' ? 'bg-[#006c4a] justify-end' : 'bg-[#c3c6d0] justify-start'
                      }`}
                    >
                      <div className="bg-white w-4 h-4 rounded-full shadow-md"></div>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="w-full h-12 rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white text-[15px] font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isUpdatingProfile ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        <span>저장 중...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">save</span>
                        <span>기본 정보 저장</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Card 2: 자필 전자서명 관리 */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#e5eeff] space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-[#eff4ff]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#006c4a] text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">draw</span>
                    </div>
                    <div>
                      <h2 className="text-[18px] font-bold text-[#00254a]">자필 전자서명 관리</h2>
                      <p className="text-[12px] text-[#43474f]">견적 확정 및 시공 계약 체결 시 자동 날인되는 공인 자필 서명입니다.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Signature Preview Pad */}
                  <div className="w-full sm:w-64 h-32 rounded-xl border-2 border-dashed border-[#c3c6d0] bg-[#f8f9ff] flex items-center justify-center overflow-hidden p-2 relative shadow-inner">
                    {currentSignImg ? (
                      <img src={currentSignImg} alt="등록된 전자서명" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="text-center text-[#737780] space-y-1">
                        <span className="material-symbols-outlined text-[28px] text-[#c3c6d0]">edit_note</span>
                        <p className="text-[12px]">등록된 서명이 없습니다</p>
                      </div>
                    )}
                    <span className="absolute bottom-1 right-2 text-[10px] text-[#737780] font-mono">SsulDak Seal</span>
                  </div>

                  {/* Actions & Explanations */}
                  <div className="flex-1 space-y-3 text-left">
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#006c4a]">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      <span>전자서명법 제3조 준수 공인 서명</span>
                    </div>
                    <p className="text-[12px] text-[#43474f] leading-relaxed">
                      언제든 새 서명으로 재등록하실 수 있으며, 신규 등록 즉시 앞으로 체결되는 모든 청소 시공 계약서에 자동 반영됩니다.
                    </p>
                    <button
                      type="button"
                      onClick={handleOpenSignModal}
                      className="px-4 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00254a] text-[13px] font-bold flex items-center gap-2 border border-[#dce9ff] transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                      <span>자필 서명 재등록 / 변경</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT 5 Cols: Password Change & Danger Zone */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card 3: 비밀번호 변경 카드 */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-[#e5eeff] space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-[#eff4ff]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#163b66] text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                    </div>
                    <h2 className="text-[18px] font-bold text-[#00254a]">비밀번호 변경</h2>
                  </div>
                  <span className={strengthBadgeClass}>{strengthLabel}</span>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-[13px] font-bold text-[#0b1c30] mb-1">
                      현재 비밀번호 <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPwdCurrent ? 'text' : 'password'}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="현재 비밀번호 입력"
                        className="w-full px-4 py-3 pr-10 rounded-xl bg-white border border-[#c3c6d0] text-[14px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#00254a]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwdCurrent(!showPwdCurrent)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#737780] hover:text-[#0b1c30] cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPwdCurrent ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-[13px] font-bold text-[#0b1c30] mb-1">
                      새 비밀번호 <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPwdNew ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="새 비밀번호 (8자 이상)"
                        className="w-full px-4 py-3 pr-10 rounded-xl bg-white border border-[#c3c6d0] text-[14px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#00254a]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwdNew(!showPwdNew)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#737780] hover:text-[#0b1c30] cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPwdNew ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>

                    {/* Rule Chips */}
                    <div className="grid grid-cols-3 gap-1.5 mt-2">
                      <span
                        className={`text-[10px] py-1 px-1.5 rounded text-center font-bold ${
                          hasLength ? 'bg-[#82f5c1]/50 text-[#00714e]' : 'bg-[#e5eeff] text-[#737780]'
                        }`}
                      >
                        8자리 이상
                      </span>
                      <span
                        className={`text-[10px] py-1 px-1.5 rounded text-center font-bold ${
                          hasAlphaNum ? 'bg-[#82f5c1]/50 text-[#00714e]' : 'bg-[#e5eeff] text-[#737780]'
                        }`}
                      >
                        영문/숫자 조합
                      </span>
                      <span
                        className={`text-[10px] py-1 px-1.5 rounded text-center font-bold ${
                          hasSpecial ? 'bg-[#82f5c1]/50 text-[#00714e]' : 'bg-[#e5eeff] text-[#737780]'
                        }`}
                      >
                        특수문자 포함
                      </span>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-[13px] font-bold text-[#0b1c30] mb-1">
                      새 비밀번호 확인 <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPwdConfirm ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="새 비밀번호 다시 입력"
                        className="w-full px-4 py-3 pr-10 rounded-xl bg-white border border-[#c3c6d0] text-[14px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#00254a]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwdConfirm(!showPwdConfirm)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#737780] hover:text-[#0b1c30] cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {showPwdConfirm ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                    {confirmPassword.length > 0 && (
                      <p
                        className={`text-[11px] mt-1 flex items-center gap-1 ${
                          isPasswordMatch ? 'text-[#006c4a]' : 'text-[#ba1a1a]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isPasswordMatch ? 'check_circle' : 'cancel'}
                        </span>
                        <span>{isPasswordMatch ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.'}</span>
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isChangingPassword || !isPasswordMatch || !hasLength}
                    className="w-full h-12 rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white text-[14px] font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isChangingPassword ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                        <span>변경 중...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">key</span>
                        <span>비밀번호 변경 적용</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Card 4: Danger Zone (회원 탈퇴) */}
              <div className="bg-[#fff8f8] rounded-2xl p-6 shadow-sm border border-[#ffdad6] space-y-4">
                <div className="flex items-center gap-2 text-[#ba1a1a]">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                  <h3 className="text-[16px] font-bold">계정 삭제 및 회원 탈퇴</h3>
                </div>
                <p className="text-[12px] text-[#43474f] leading-relaxed">
                  회원 탈퇴 시 보유 포인트와 쿠폰이 전액 소멸되며, 동일 이메일로는 당일 재가입이 제한됩니다.
                  진행 중인 계약이나 공고가 있는 경우 모든 정산 및 시공 완료 후 탈퇴하실 수 있습니다.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawErrorNotice(null);
                    setShowWithdrawModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-[#ffdad6]/40 text-[#ba1a1a] text-[13px] font-bold border border-[#ffdad6] transition-colors cursor-pointer w-full text-center"
                >
                  회원 탈퇴 신청하기
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================================
          3. 전자서명 캔버스 모달 팝업
         ===================================================================== */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006c4a] text-[22px]">draw</span>
                <h3 className="text-[18px] font-bold text-[#00254a]">자필 전자서명 등록</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSignModal(false)}
                className="p-1 text-[#737780] hover:text-[#0b1c30] cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-[12px] text-[#43474f]">
              마우스 또는 손가락으로 아래 서명 패드에 정자로 자필 서명해 주세요.
            </p>

            {/* Canvas Area */}
            <div className="rounded-2xl border-2 border-dashed border-[#00254a]/30 bg-[#f8f9ff] flex items-center justify-center p-1 overflow-hidden relative shadow-inner">
              <canvas
                ref={canvasRef}
                width={380}
                height={180}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-44 bg-transparent cursor-crosshair touch-none"
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-[#737780] pointer-events-none">
                SsulDak Digital Signature Pad
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={initCanvas}
                className="flex-1 h-12 rounded-xl bg-[#eff4ff] text-[#43474f] text-[14px] font-bold hover:bg-[#dce9ff] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span>지우기</span>
              </button>
              <button
                type="button"
                onClick={handleSaveSignature}
                disabled={!hasDrawn}
                className="flex-2 h-12 rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white text-[14px] font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-[18px]">check</span>
                <span>새 서명 적용</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. 회원 탈퇴 확인 및 방어 모달 팝업
         ===================================================================== */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[28px]">person_remove</span>
              </div>
              <div>
                <h3 className="text-[19px] font-extrabold text-[#00254a]">정말로 탈퇴하시겠습니까?</h3>
                <p className="text-[12px] text-[#43474f]">쓸고닦고 서비스 탈퇴 전 필수 확인 사항</p>
              </div>
            </div>

            {/* Error Notice (진행 중인 계약/견적 방어 안내) */}
            {withdrawErrorNotice && (
              <div className="p-3.5 rounded-xl bg-[#ffdad6]/70 border border-[#ba1a1a]/40 text-[#ba1a1a] text-[12px] font-semibold leading-relaxed flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <span>{withdrawErrorNotice}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-[#eff4ff] text-[12px] text-[#43474f] space-y-1 border border-[#dce9ff]">
              <p className="font-bold text-[#00254a]">※ 탈퇴 시 유의사항:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>보유 중인 웰컴 쿠폰 및 적립 포인트가 즉시 전액 소멸됩니다.</li>
                <li>기존 시공 내역 및 세금계산서 열람이 중단됩니다.</li>
                <li>사기 피해 예방을 위해 동일 이메일 당일 재가입이 제한됩니다.</li>
              </ul>
            </div>

            {/* Withdraw Reason Selector */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-bold text-[#0b1c30]">
                탈퇴 사유를 선택해 주세요 <span className="text-[#ba1a1a]">*</span>
              </label>
              <select
                value={withdrawReasonType}
                onChange={(e) => setWithdrawReasonType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#c3c6d0] text-[13px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#00254a]"
              >
                <option value="SERVICE_DISSATISFACTION">서비스 품질 및 매칭 불만족</option>
                <option value="MOVING_CLEAN_NOT_NEEDED">이사/청소가 완료되어 더 이상 불필요</option>
                <option value="OTHER_PLATFORM">타 플랫폼/사설 용역 이용 전환</option>
                <option value="OTHER">기타 (직접 입력)</option>
              </select>

              {withdrawReasonType === 'OTHER' && (
                <textarea
                  value={customWithdrawReason}
                  onChange={(e) => setCustomWithdrawReason(e.target.value)}
                  placeholder="탈퇴 사유를 입력해 주시면 소중한 피드백으로 반영하겠습니다."
                  className="w-full p-3 rounded-xl bg-white border border-[#c3c6d0] text-[13px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#00254a] h-20 resize-none mt-2"
                />
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 h-12 rounded-xl bg-[#eff4ff] text-[#00254a] text-[14px] font-bold hover:bg-[#dce9ff] transition-all cursor-pointer"
              >
                취소 (유지하기)
              </button>
              <button
                type="button"
                onClick={handleWithdrawSubmit}
                disabled={isWithdrawing}
                className="flex-1 h-12 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white text-[14px] font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isWithdrawing ? (
                  <>
                    <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                    <span>탈퇴 처리 중...</span>
                  </>
                ) : (
                  <span>탈퇴 확정</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. 푸터
         ===================================================================== */}
      <footer className="w-full bg-white shadow-[0_1px_8px_rgba(0,0,0,0.02)] mt-auto border-t border-[#eff4ff]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-2 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[17px] text-[#00254a] font-bold">SsulDak 쓸고닦고</span>
                <span className="px-2 py-0.5 rounded-full bg-[#82f5c1] text-[#00714e] text-[11px] font-semibold">
                  Institutional Care
                </span>
              </div>
              <p className="text-[13px] text-[#43474f] max-w-md leading-relaxed">
                공간의 정돈과 체계적인 위생 케어로 일상의 회복을 설계합니다. 마스터 파트너 실명제와 정량 안심 소독 공정을 준수합니다.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] text-[#0b1c30] font-bold">안심 케어 보증</span>
              <p className="text-[13px] text-[#43474f]">1억원 영업배상책임보험 가입</p>
              <p className="text-[13px] text-[#43474f]">본사 직영 검증 마스터 파트너 매칭</p>
              <p className="text-[13px] text-[#43474f]">100% 만족 재케어 보증제도</p>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-[13px] text-[#0b1c30] font-bold">고객 신뢰 센터</span>
              <p className="text-[13px] text-[#00254a] font-bold">1588-3024</p>
              <p className="text-[13px] text-[#43474f]">운영시간: 평일 08:30 - 18:30 (공휴일 제외)</p>
              <p className="text-[13px] text-[#43474f]">contact@ssuldak.kr</p>
            </div>
          </div>
          <div className="pt-6 border-t border-[#eff4ff] flex flex-col sm:flex-row items-center justify-between gap-4 text-[#43474f] text-[13px]">
            <div className="flex flex-wrap items-center gap-4 text-center sm:text-left">
              <span>(주)쓸고닦고 플랫폼 케어</span>
              <span>사업자등록번호: 214-88-09124</span>
              <span>통신판매업신고: 제2024-서울강남-1402호</span>
            </div>
            <span className="text-[11px] text-[#737780]">© 2026 SsulDak Inc. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          6. 토스트 피드백 알림
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
    </div>
  );
}
