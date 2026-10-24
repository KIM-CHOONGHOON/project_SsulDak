// SsulDak_Web/User/frontend/USER-MYP-00/index.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { UserMyp00Profile, UserMyp00Benefits } from '../../backend/api_USER_MYP_00/route';

interface UserMyp00Props {
  userNo?: string;
  onNavigate?: (path: string, params?: Record<string, any>) => void;
}

export default function UserMyp00({
  userNo = 'U20261000001',
  onNavigate,
}: UserMyp00Props) {
  // 프로필 및 혜택 데이터 상태
  const [profile, setProfile] = useState<UserMyp00Profile>({
    userNo,
    userNm: '김충훈',
    userEmail: 'chunghoon.kim@ssuldak.com',
    maskedTel: '010-****-1234',
    userStatCd: 'NORMAL',
    penaltyBadge: {
      status: 'NORMAL',
      label: '정상 회원 (신뢰도 100%)',
      daysRemaining: 0,
      expireDt: null,
    },
    hasSignature: true,
    signImgUrl: 'https://ssuldak.com/signs/u20261000001.png',
    accountDisplayId: 'UD-88294',
    membershipGrade: 'VIP 케어 멤버십',
  });

  const [benefits, setBenefits] = useState<UserMyp00Benefits>({
    couponCount: 2,
    pointBalance: 14000,
    ongoingContractCount: 2,
    completedContractCount: 8,
  });

  const [loading, setLoading] = useState<boolean>(true);

  // 모달 상태 관리
  // 1. 전자서명 미리보기 모달
  const [showSignPreviewModal, setShowSignPreviewModal] = useState<boolean>(false);
  // 2. 전자서명 재등록 (Canvas 그리기) 모달
  const [showSignCanvasModal, setShowSignCanvasModal] = useState<boolean>(false);
  // 3. 포인트 내역 모달
  const [showPointHistoryModal, setShowPointHistoryModal] = useState<boolean>(false);
  // 4. 회원탈퇴 확인 모달
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);

  // 전자서명 캔버스 참조 및 드로잉 상태
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasCanvasDrawn, setHasCanvasDrawn] = useState<boolean>(false);
  const [isSavingSignature, setIsSavingSignature] = useState<boolean>(false);

  // 토스트 메시지
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastVisible, setToastVisible] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2800);
  };

  // 백엔드 대시보드 데이터 조회 (GET_MYPAGE_DASHBOARD)
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/user_myp_00', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userNo}_TOKEN`,
        },
        body: JSON.stringify({
          actionType: 'GET_MYPAGE_DASHBOARD',
          userNo,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        setBenefits(data.benefits);
      } else {
        showToast(data.message || '데이터를 불러오지 못했습니다.');
      }
    } catch (err) {
      console.error(err);
      showToast('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [userNo]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // ---------------------------------------------------------------------------
  // Canvas 드로잉 핸들러 (자필 전자서명)
  // ---------------------------------------------------------------------------
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasCanvasDrawn(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#00254a';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasCanvasDrawn(false);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasCanvasDrawn) {
      showToast('서명을 먼저 작성해 주세요.');
      return;
    }

    setIsSavingSignature(true);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const res = await fetch('/api/user/user_myp_00', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userNo}_TOKEN`,
        },
        body: JSON.stringify({
          actionType: 'UPDATE_SIGNATURE',
          userNo,
          signImgUrl: dataUrl,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setProfile((prev) => ({
          ...prev,
          hasSignature: true,
          signImgUrl: dataUrl,
        }));
        setShowSignCanvasModal(false);
        showToast('자필 전자서명이 성공적으로 재등록되었습니다.');
      } else {
        showToast(result.message || '서명 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      showToast('서버 통신 오류가 발생했습니다.');
    } finally {
      setIsSavingSignature(false);
    }
  };

  return (
    <div className="bg-[#f8f9ff] font-['Plus_Jakarta_Sans',sans-serif] text-[#0b1c30] antialiased min-h-screen flex flex-col">
      {/* ===================================================================== */}
      {/* HEADER BAR                                                            */}
      {/* ===================================================================== */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-white/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#e5eeff]">
        <div className="h-16 max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <a
              className="flex items-center gap-2 shrink-0 cursor-pointer transition-transform active:scale-95"
              onClick={() => onNavigate ? onNavigate('home') : (window.location.hash = '#home')}
            >
              <div className="w-9 h-9 rounded-xl bg-[#00254a] flex items-center justify-center text-white shadow-xs">
                <span className="material-symbols-outlined text-[20px]">sanitizer</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[17px] font-bold text-[#00254a] tracking-tight leading-none">SsulDak</span>
                <span className="text-[11px] text-[#43474f] font-medium leading-none mt-1">쓸고닦고 케어</span>
              </div>
            </a>

            <div
              className="hidden sm:flex items-center gap-1 px-3 py-1 bg-[#eff4ff] rounded-full text-[#0b1c30] hover:bg-[#e5eeff] transition-colors cursor-pointer border border-[#e5eeff]"
              onClick={() => showToast('시공 가능 지역: 서울 및 경기 전역')}
            >
              <span className="material-symbols-outlined text-[#006c4a] text-[16px]">location_on</span>
              <span className="text-[13px] font-semibold text-[#0b1c30]">경기 고양시 일산동구</span>
              <span className="material-symbols-outlined text-[#737780] text-[16px]">expand_more</span>
            </div>
          </div>

          {/* GNB Navigation */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[#eff4ff]">
            <a
              className="px-4 py-1.5 text-[15px] font-medium text-[#43474f] hover:text-[#0b1c30] hover:bg-white rounded-lg transition-colors cursor-pointer"
              onClick={() => onNavigate ? onNavigate('home') : (window.location.hash = '#home')}
            >
              홈
            </a>
            <a
              className="px-4 py-1.5 text-[15px] font-medium text-[#43474f] hover:text-[#0b1c30] hover:bg-white rounded-lg transition-colors cursor-pointer"
              onClick={() => onNavigate ? onNavigate('quote-status') : (window.location.hash = '#quote-status')}
            >
              견적현황
            </a>
            <a
              className="px-4 py-1.5 text-[15px] font-medium text-[#43474f] hover:text-[#0b1c30] hover:bg-white rounded-lg transition-colors cursor-pointer"
              onClick={() => onNavigate ? onNavigate('history') : (window.location.hash = '#history')}
            >
              이용내역
            </a>
            <a
              className="px-4 py-1.5 text-[15px] font-medium text-[#43474f] hover:text-[#0b1c30] hover:bg-white rounded-lg transition-colors cursor-pointer"
              onClick={() => onNavigate ? onNavigate('user-myp-02') : showToast('쿠폰북으로 이동합니다.')}
            >
              쿠폰북
            </a>
            <a
              aria-current="page"
              className="bg-[#00254a] text-white font-bold rounded-lg px-4 py-1.5 text-[15px] shadow-xs transition-colors cursor-pointer"
            >
              마이
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              aria-label="알림"
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#43474f] hover:bg-[#e5eeff] transition-colors relative cursor-pointer"
              type="button"
              onClick={() => showToast('새로운 알림이 없습니다.')}
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#006c4a] ring-2 ring-white"></span>
            </button>
            <div className="w-8 h-8 rounded-full bg-[#00254a] flex items-center justify-center text-white shadow-xs">
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* MAIN CONTENT AREA                                                     */}
      {/* ===================================================================== */}
      <main className="w-full pt-16 bg-[#f8f9ff] flex-1 pb-16">
        <div className="max-w-[1280px] w-full mx-auto px-4 md:px-8 lg:px-12 py-8 flex flex-col gap-6">

          {/* 1. Breadcrumbs & Top Bar */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
            <div className="flex flex-col gap-1">
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-[#737780]">
                <a
                  className="hover:text-[#00254a] transition-colors flex items-center gap-0.5 cursor-pointer"
                  onClick={() => onNavigate ? onNavigate('home') : (window.location.hash = '#home')}
                >
                  <span className="material-symbols-outlined text-[16px]">home</span>
                  <span>홈</span>
                </a>
                <span className="material-symbols-outlined text-[14px] text-[#c3c6d0]">chevron_right</span>
                <span className="font-semibold text-[#0b1c30]">마이페이지</span>
                <span className="text-[11px] font-bold bg-[#e5eeff] px-1.5 py-0.5 rounded text-[#00254a] ml-1">
                  USER-MYP-00
                </span>
              </nav>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="text-2xl md:text-3xl font-extrabold text-[#0b1c30] tracking-tight">마이페이지</h1>
                <p className="text-[14px] text-[#43474f]">
                  내 프로필, 보유 혜택, 계약 서명 및 청소 이용 현황을 한눈에 관리하세요.
                </p>
              </div>
            </div>

            {/* Quick Action Pill Group */}
            <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] transition-all shadow-xs text-[13px] font-semibold border border-[#e5eeff] cursor-pointer"
                type="button"
                onClick={() => onNavigate ? onNavigate('user-myp-01') : showToast('환경설정 페이지로 이동합니다.')}
              >
                <span className="material-symbols-outlined text-[18px] text-[#00254a]">settings</span>
                <span>환경설정</span>
              </button>
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#eff4ff] hover:bg-[#ffdad6] text-[#43474f] hover:text-[#ba1a1a] transition-all shadow-xs text-[13px] font-semibold border border-[#e5eeff] cursor-pointer"
                type="button"
                onClick={() => {
                  showToast('로그아웃 되었습니다.');
                  setTimeout(() => {
                    if (onNavigate) onNavigate('user-ath-00');
                    else window.location.hash = '#login';
                  }, 800);
                }}
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>로그아웃</span>
              </button>
            </div>
          </div>

          {/* 2. 2-Column Responsive Layout (8 cols left / 4 cols right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* ===================== LEFT COLUMN (65%) ===================== */}
            <div className="lg:col-span-8 flex flex-col gap-6">

              {/* a. Profile Summary Card */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 bg-[#eff4ff]/40 p-4 rounded-xl border border-[#e5eeff]">
                  {/* User Profile Avatar & Meta */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-[#e5eeff] shadow-inner flex items-center justify-center shrink-0 border border-[#dce9ff]">
                      <img
                        className="w-full h-full object-cover"
                        alt="User Profile"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuB50bhpxu-e_zdNVfBTPd1KFHXb1hCumq7TgO5Zj8mgGNWp5ogn1-4DgyUMzVHHPlpbl72rnJoDBP16ypW36Oy-iFOBPUEJNm2U8WUcE_YRpzCWmMToVVZosoa4fBO6NdcjYSX2fbN4PABkSvplxqRscJk9G_L39Eusx25XVV4cND5LiLWDeGnuTlJD5d-ptbtMkVl1KCjhJo-wO3yi5X8MH9rgjypyqju03lEa_15Xe7pfVdk3TLFu"
                      />
                      <button
                        aria-label="프로필 사진 수정"
                        className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#00254a] text-white flex items-center justify-center shadow-md hover:bg-[#163b66] transition-transform active:scale-90 cursor-pointer"
                        type="button"
                        onClick={() => showToast('프로필 이미지 변경 창을 엽니다.')}
                      >
                        <span className="material-symbols-outlined text-[14px]">edit</span>
                      </button>
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[18px] font-bold text-[#0b1c30]">{profile.userNm}</span>
                        <span className="text-[14px] text-[#43474f]">고객님</span>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00254a] text-white text-[11px] font-bold shadow-xs">
                          <span className="material-symbols-outlined text-[14px] text-[#ffb95f]">verified</span>
                          {profile.membershipGrade}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-[#43474f] mt-1">
                        <span className="flex items-center gap-1 font-medium text-[#0b1c30]">
                          <span className="material-symbols-outlined text-[16px] text-[#006c4a]">phone_iphone</span>
                          {profile.maskedTel}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#82f5c1]/30 text-[#006c4a] text-[11px] font-bold">
                          본인인증 완료
                        </span>
                        <span className="text-[#c3c6d0]">·</span>
                        <span className="truncate">{profile.userEmail}</span>
                      </div>
                    </div>
                  </div>

                  {/* Profile Edit Action Button */}
                  <button
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#00254a] text-[13px] font-semibold transition-all shrink-0 cursor-pointer border border-[#dce9ff]"
                    type="button"
                    onClick={() => onNavigate ? onNavigate('user-myp-01') : showToast('회원정보 수정 화면으로 이동합니다.')}
                  >
                    <span>회원정보 수정</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                </div>

                {/* Trust & Reputation Badges Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Normal or Suspended Standing */}
                  {profile.penaltyBadge.status === 'NORMAL' ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#82f5c1]/10 border border-[#82f5c1]/30">
                      <div className="w-10 h-10 rounded-xl bg-[#82f5c1]/25 flex items-center justify-center text-[#006c4a] shrink-0">
                        <span className="material-symbols-outlined text-[22px]">format_image_left</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-bold text-[#006c4a]">{profile.penaltyBadge.label}</span>
                          <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse"></span>
                        </div>
                        <p className="text-[12px] text-[#43474f] truncate">{profile.penaltyBadge.reasonText}</p>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-3 p-3 rounded-xl bg-[#ffdad6]/60 border border-[#ffdad6] cursor-pointer"
                      onClick={() => showToast(profile.penaltyBadge.reasonText || '선취소 패널티가 적용 중입니다.')}
                      title="클릭하여 제재 상세 확인"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#ba1a1a] flex items-center justify-center text-white shrink-0">
                        <span className="material-symbols-outlined text-[22px]">warning</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-bold text-[#ba1a1a]">{profile.penaltyBadge.label}</span>
                          <span className="w-2 h-2 rounded-full bg-[#ba1a1a] animate-ping"></span>
                        </div>
                        <p className="text-[12px] text-[#ba1a1a] truncate font-medium">{profile.penaltyBadge.reasonText}</p>
                      </div>
                    </div>
                  )}

                  {/* Penalty Score System */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#eff4ff] border border-[#e5eeff]">
                    <div className="w-10 h-10 rounded-xl bg-[#dce9ff] flex items-center justify-center text-[#00254a] shrink-0">
                      <span className="material-symbols-outlined text-[22px]">gavel</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold text-[#0b1c30]">제재 없음 / 페널티 0점</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#e5eeff] text-[#00254a]">
                          청정계정
                        </span>
                      </div>
                      <p className="text-[12px] text-[#737780] truncate">누적 경고 0건 · 예약 패널티 0회</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* b. Benefits & Wallet Dashboard */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Coupons */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] flex flex-col justify-between gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-[#006c4a]/5 pointer-events-none group-hover:scale-110 transition-transform"></div>
                  <div className="flex flex-col gap-1 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#006c4a] text-[13px] font-bold">
                        <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
                        <span>내 쿠폰함</span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#82f5c1] text-[#002114] font-bold">
                        사용가능
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-extrabold text-[#00254a] tracking-tight">
                        {benefits.couponCount}
                      </span>
                      <span className="text-[17px] font-bold text-[#0b1c30]">장</span>
                    </div>
                    <p className="text-[12px] text-[#43474f] flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a]"></span>
                      정기청소 웰컴 5,000원 쿠폰 외 1장 보유
                    </p>
                  </div>
                  <button
                    className="relative z-10 w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#00254a] text-[13px] font-semibold transition-colors mt-1 cursor-pointer border border-[#e5eeff]"
                    type="button"
                    onClick={() => onNavigate ? onNavigate('user-myp-02') : showToast('쿠폰함 화면으로 이동합니다.')}
                  >
                    <span>쿠폰함 확인</span>
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>

                {/* Card 2: Reward Points */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] flex flex-col justify-between gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
                  <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-[#00254a]/5 pointer-events-none group-hover:scale-110 transition-transform"></div>
                  <div className="flex flex-col gap-1 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[#00254a] text-[13px] font-bold">
                        <span className="material-symbols-outlined text-[20px]">monetization_on</span>
                        <span>리워드 포인트 (SsulDak 캐시)</span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#d4e3ff] text-[#001c3a] font-bold">
                        1P = 1원
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-extrabold text-[#00254a] tracking-tight">
                        {benefits.pointBalance.toLocaleString()}
                      </span>
                      <span className="text-[17px] font-bold text-[#0b1c30]">P</span>
                    </div>
                    <div className="flex flex-col gap-0.5 mt-1 text-[12px]">
                      <p className="text-[#43474f]">현금처럼 즉시 차감 결제 가능</p>
                      <p className="text-[#737780] flex items-center gap-1">
                        <span>30일 이내 소멸 예정 포인트:</span>
                        <span className="font-semibold text-[#0b1c30]">0 P</span>
                      </p>
                    </div>
                  </div>
                  <button
                    className="relative z-10 w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#00254a] text-[13px] font-semibold transition-colors mt-1 cursor-pointer border border-[#e5eeff]"
                    type="button"
                    onClick={() => setShowPointHistoryModal(true)}
                  >
                    <span>포인트 적립/사용 내역</span>
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </section>

              {/* c. My Services & Contracts Quick Access Menu List */}
              <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-[17px] font-bold text-[#0b1c30]">서비스 및 계약 관리</h2>
                  <span className="text-[13px] text-[#737780]">실시간 안심 케어 매칭 현황</span>
                </div>

                <div className="flex flex-col gap-3">
                  {/* Item 1: Booking & Construction History */}
                  <div
                    className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#e5eeff] cursor-pointer"
                    onClick={() => onNavigate ? onNavigate('user-his-00') : (window.location.hash = '#history')}
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#00254a] text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[24px]">cleaning_services</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[15px] font-bold text-[#0b1c30] group-hover:text-[#00254a] transition-colors">
                            내 청소 신청 및 이용 내역
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#006c4a] text-white text-[11px] font-bold">
                            진행중 {benefits.ongoingContractCount}건
                          </span>
                        </div>
                        <p className="text-[13px] text-[#43474f] mt-0.5">
                          현재 진행 중인 시공 {benefits.ongoingContractCount}건, 지난 청소 완료 내역 {benefits.completedContractCount}건이 있습니다.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[#00254a] text-[13px] font-semibold self-end sm:self-auto shrink-0">
                      <span>내역 보기</span>
                      <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </div>
                  </div>

                  {/* Item 2: Digital Signature Management */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#e5eeff]">
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#e5eeff] text-[#00254a] flex items-center justify-center shrink-0 shadow-xs">
                        <span className="material-symbols-outlined text-[24px]">draw</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[15px] font-bold text-[#0b1c30]">내 등록 자필 전자서명 관리</span>
                          <span className="px-2 py-0.5 rounded-md bg-[#82f5c1]/30 text-[#006c4a] text-[11px] font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            등록 완료 (표준 전자서명)
                          </span>
                        </div>
                        <p className="text-[13px] text-[#43474f] mt-0.5">
                          회원가입 시 등록된 표준 전자서명이 계약서 체결 시 자동 날인됩니다.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      <button
                        className="px-3 py-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[12px] font-semibold transition-colors cursor-pointer border border-[#e5eeff]"
                        type="button"
                        onClick={() => setShowSignPreviewModal(true)}
                      >
                        서명 미리보기
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-lg bg-[#00254a] text-white hover:bg-[#163b66] text-[12px] font-bold transition-colors cursor-pointer shadow-xs"
                        type="button"
                        onClick={() => {
                          setShowSignCanvasModal(true);
                          setHasCanvasDrawn(false);
                        }}
                      >
                        자필 서명 재등록
                      </button>
                    </div>
                  </div>

                  {/* Item 3: Account & Notification Settings */}
                  <div
                    className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#e5eeff] cursor-pointer"
                    onClick={() => onNavigate ? onNavigate('user-myp-01') : showToast('회원정보 및 알림 설정으로 이동합니다.')}
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#00254a] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[24px]">manage_accounts</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-bold text-[#0b1c30] group-hover:text-[#00254a] transition-colors">
                          회원정보 및 알림 설정
                        </span>
                        <p className="text-[13px] text-[#43474f] mt-0.5">
                          휴대폰 번호, 기본 시공 주소지, 카카오 알림톡 수신 설정 관리
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[#00254a] text-[13px] font-semibold self-end sm:self-auto shrink-0">
                      <span>설정 변경</span>
                      <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                        chevron_right
                      </span>
                    </div>
                  </div>

                  {/* Item 4: Payment & Refund Account */}
                  <div
                    className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#e5eeff] cursor-pointer"
                    onClick={() => showToast('등록된 간편결제 카드: 현대카드(****-1029)')}
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[#eff4ff] text-[#00254a] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-[24px]">credit_card</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[15px] font-bold text-[#0b1c30] group-hover:text-[#00254a] transition-colors">
                            결제 수단 및 환불 계좌 관리
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#e5eeff] text-[#00254a] text-[11px] font-bold">
                            간편카드 1건
                          </span>
                        </div>
                        <p className="text-[13px] text-[#43474f] mt-0.5">
                          등록된 간편결제 카드 1건, 가상계좌 에스크로 환불 등록 완료
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[#00254a] text-[13px] font-semibold self-end sm:self-auto shrink-0">
                      <span>관리하기</span>
                      <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                        chevron_right
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Ongoing Service Snapshot Banner */}
              <section className="bg-gradient-to-r from-[#163b66] to-[#00254a] rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-[#85f8c4] shrink-0">
                    <span className="material-symbols-outlined text-[32px]">event_upcoming</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#006c4a] text-white text-[11px] font-bold">
                        다음 예약 안내
                      </span>
                      <span className="text-[13px] text-[#d4e3ff] font-semibold">내일 오전 09:00</span>
                    </div>
                    <h3 className="text-[17px] font-bold mt-1">입주 &amp; 이사 프리미엄 심층 클리닝</h3>
                    <p className="text-[13px] text-white/80 mt-0.5">
                      경기 고양시 일산동구 중앙로 · 담당: 반짝빌라클린 이*수 마스터
                    </p>
                  </div>
                </div>
                <button
                  className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-white text-[#00254a] hover:bg-[#e5eeff] transition-colors text-[13px] font-bold shadow-md shrink-0 cursor-pointer"
                  type="button"
                  onClick={() => onNavigate ? onNavigate('user-his-01') : (window.location.hash = '#inspection')}
                >
                  진행상태 실시간 조회
                </button>
              </section>

            </div>

            {/* ===================== RIGHT COLUMN (35%) ===================== */}
            <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-20">

              {/* a. Safety & Warranty Policy Widget */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] flex flex-col gap-4">
                <div className="flex items-center gap-2 text-[#00254a] pb-1">
                  <div className="w-8 h-8 rounded-lg bg-[#82f5c1]/25 text-[#006c4a] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">verified_user</span>
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-[17px] font-bold text-[#0b1c30]">쓸고닦고 3대 안심 보증</h3>
                    <span className="text-[11px] text-[#737780]">USER-COM-01 품질보증 헌장</span>
                  </div>
                </div>

                <ul className="flex flex-col gap-3">
                  <li className="flex items-start gap-2.5 p-3 rounded-xl bg-[#eff4ff]/70 border border-[#e5eeff]">
                    <span className="material-symbols-outlined text-[#006c4a] text-[20px] shrink-0 mt-0.5">check_circle</span>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[#0b1c30]">100% 무상 재시공 보증제</span>
                      <span className="text-[12px] text-[#43474f]">불만족 발생 시 시공 완료 후 7일 이내 즉시 접수</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5 p-3 rounded-xl bg-[#eff4ff]/70 border border-[#e5eeff]">
                    <span className="material-symbols-outlined text-[#006c4a] text-[20px] shrink-0 mt-0.5">security</span>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[#0b1c30]">현대해상 10억원 영업배상책임</span>
                      <span className="text-[12px] text-[#43474f]">작업 중 파손 및 안전사고 전담 보상 지원</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2.5 p-3 rounded-xl bg-[#eff4ff]/70 border border-[#e5eeff]">
                    <span className="material-symbols-outlined text-[#006c4a] text-[20px] shrink-0 mt-0.5">photo_camera</span>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-[#0b1c30]">전/후 사진 필수 검수 &amp; 에스크로</span>
                      <span className="text-[12px] text-[#43474f]">고객 최종 만족 확인 시에만 대금 정산</span>
                    </div>
                  </li>
                </ul>

                <button
                  className="w-full flex items-center justify-center gap-1 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#00254a] text-[13px] font-bold transition-colors cursor-pointer border border-[#e5eeff]"
                  type="button"
                  onClick={() => onNavigate ? onNavigate('user-com-01') : showToast('안심보증 헌장 안내로 이동합니다.')}
                >
                  <span>안심보증 제도 자세히 보기</span>
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </button>
              </div>

              {/* b. Notices & Policy List */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] flex flex-col gap-3">
                <div className="flex items-center justify-between pb-1">
                  <h3 className="text-[17px] font-bold text-[#0b1c30]">공지사항 &amp; 이용가이드</h3>
                  <a
                    className="text-[12px] text-[#737780] hover:text-[#00254a] transition-colors cursor-pointer font-medium"
                    onClick={() => onNavigate ? onNavigate('user-com-01') : showToast('공지사항 전체보기로 이동합니다.')}
                  >
                    전체보기
                  </a>
                </div>

                <div className="flex flex-col gap-2 divide-y divide-[#eff4ff]">
                  <div
                    className="py-2.5 group flex flex-col gap-0.5 cursor-pointer"
                    onClick={() => showToast('개정 환불 및 노쇼 패널티 규정 전문을 엽니다.')}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#ffdad6] text-[#ba1a1a]">공지</span>
                      <span className="text-[13px] font-medium text-[#0b1c30] group-hover:text-[#00254a] transition-colors line-clamp-1">
                        개정 환불 및 노쇼(No-Show) 페널티 규정 안내
                      </span>
                    </div>
                    <span className="text-[11px] text-[#737780] pl-7">2026.04.01</span>
                  </div>

                  <div
                    className="py-2.5 group flex flex-col gap-0.5 cursor-pointer"
                    onClick={() => showToast('가전케어 분해세척 친환경 가이드를 엽니다.')}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#82f5c1]/40 text-[#006c4a]">안내</span>
                      <span className="text-[13px] font-medium text-[#0b1c30] group-hover:text-[#00254a] transition-colors line-clamp-1">
                        가전케어 분해세척 친환경 인증 약품 사용 가이드
                      </span>
                    </div>
                    <span className="text-[11px] text-[#737780] pl-7">2026.03.22</span>
                  </div>

                  <div
                    className="py-2.5 group flex flex-col gap-0.5 cursor-pointer"
                    onClick={() => showToast('청소 파트너 기사님 배차 FAQ를 엽니다.')}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#e5eeff] text-[#00254a]">FAQ</span>
                      <span className="text-[13px] font-medium text-[#0b1c30] group-hover:text-[#00254a] transition-colors line-clamp-1">
                        청소 파트너 기사님 배차 및 1:1 상담 안내
                      </span>
                    </div>
                    <span className="text-[11px] text-[#737780] pl-7">2026.03.15</span>
                  </div>
                </div>
              </div>

              {/* c. Customer Center & Concierge Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] flex flex-col gap-4">
                <div className="flex items-center gap-2 text-[#00254a]">
                  <div className="w-8 h-8 rounded-lg bg-[#00254a] text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">support_agent</span>
                  </div>
                  <div>
                    <h3 className="text-[17px] font-bold text-[#0b1c30]">고객감동센터</h3>
                    <p className="text-[11px] text-[#737780]">전담 매니저 신속 응대</p>
                  </div>
                </div>

                <div className="bg-[#eff4ff] p-4 rounded-xl flex flex-col gap-1 border border-[#e5eeff]">
                  <span className="text-[12px] text-[#43474f] font-medium">대표 전화 문의</span>
                  <a
                    className="text-2xl font-extrabold text-[#00254a] tracking-tight hover:underline"
                    href="tel:1588-0000"
                  >
                    1588-0000
                  </a>
                  <div className="flex flex-col gap-0.5 text-[11px] text-[#737780] mt-1">
                    <span>평일: 08:00 ~ 20:00</span>
                    <span>주말/공휴일: 09:00 ~ 18:00</span>
                  </div>
                </div>

                {/* KakaoTalk Live Chat CTA */}
                <button
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] text-[13px] font-bold transition-all shadow-xs active:scale-98 cursor-pointer"
                  type="button"
                  onClick={() => showToast('카카오톡 1:1 실시간 상담 채팅창을 연결합니다.')}
                >
                  <span className="material-symbols-outlined text-[20px]">chat</span>
                  <span>카카오톡 1:1 실시간 상담 연결</span>
                </button>

                <button
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#0b1c30] text-[13px] font-semibold transition-colors cursor-pointer border border-[#e5eeff]"
                  type="button"
                  onClick={() => showToast('자주 묻는 질문 FAQ 페이지를 엽니다.')}
                >
                  <span className="material-symbols-outlined text-[18px] text-[#737780]">quiz</span>
                  <span>자주 묻는 질문 (FAQ) 바로가기</span>
                </button>
              </div>

              {/* d. Account Status & Terms Footer Links */}
              <div className="p-4 rounded-2xl bg-[#eff4ff]/50 flex flex-col gap-2 border border-[#e5eeff]">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[#737780]">
                  <a className="hover:text-[#00254a] transition-colors cursor-pointer" onClick={() => showToast('서비스 이용약관')}>서비스 이용약관</a>
                  <span>·</span>
                  <a className="hover:text-[#00254a] font-semibold text-[#43474f] transition-colors cursor-pointer" onClick={() => showToast('개인정보처리방침')}>개인정보처리방침</a>
                  <span>·</span>
                  <a className="hover:text-[#00254a] transition-colors cursor-pointer" onClick={() => showToast('위치기반서비스')}>위치기반서비스</a>
                  <span>·</span>
                  <a className="hover:text-[#00254a] transition-colors cursor-pointer" onClick={() => showToast('전자금융거래약관')}>전자금융거래약관</a>
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-[#e5eeff]/80">
                  <span className="text-[11px] text-[#737780] font-mono">
                    계정 식별번호: {profile.accountDisplayId}
                  </span>
                  <button
                    className="text-[11px] text-[#737780] hover:text-[#ba1a1a] transition-colors underline cursor-pointer"
                    type="button"
                    onClick={() => setShowWithdrawModal(true)}
                  >
                    회원탈퇴 신청
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      </main>

      {/* ===================================================================== */}
      {/* FOOTER BAR                                                            */}
      {/* ===================================================================== */}
      <footer className="w-full bg-[#eff4ff] text-[#43474f] py-12 border-t border-[#e5eeff] mt-auto">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12">
          <div className="flex flex-wrap items-center gap-4 pb-6 mb-6 border-b border-[#dce9ff]">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-[#00254a] shadow-xs border border-[#e5eeff]">
              <span className="material-symbols-outlined text-[#006c4a] text-[18px]">verified_user</span>
              <span className="text-[13px] font-bold">10억원 영업배상 책임보험 가입</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-[#00254a] shadow-xs border border-[#e5eeff]">
              <span className="material-symbols-outlined text-[#006c4a] text-[18px]">security</span>
              <span className="text-[13px] font-bold">에스크로 안전결제 시스템 가동중</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-[#00254a] shadow-xs border border-[#e5eeff]">
              <span className="material-symbols-outlined text-[#e49200] text-[18px]">workspace_premium</span>
              <span className="text-[13px] font-bold">검증된 마스터 클리너 배정 100%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-8 flex flex-col gap-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[17px] font-bold text-[#0b1c30]">(주)쓸고닦고컴퍼니</span>
                <span className="text-[#c3c6d0]">|</span>
                <span className="text-[13px] text-[#43474f]">클리닝 &amp; 공간 솔루션 플랫폼</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#43474f]">
                <span>대표이사: 홍길동</span>
                <span className="text-[#c3c6d0]">·</span>
                <span>사업자등록번호: 214-88-00000</span>
                <span className="text-[#c3c6d0]">·</span>
                <span>통신판매업신고: 2024-경기고양-1049호</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#43474f]">
                <span>주소: 경기도 고양시 일산동구 중앙로 1261 백석빌딩 8층</span>
                <span className="text-[#c3c6d0]">·</span>
                <span>개인정보보호책임자: 김케어 (privacy@ssuldak.co.kr)</span>
              </div>
              <div className="flex flex-wrap gap-x-4 pt-2 text-[13px]">
                <a className="text-[#0b1c30] hover:text-[#00254a] underline font-medium cursor-pointer" onClick={() => showToast('이용약관')}>이용약관</a>
                <a className="text-[#0b1c30] hover:text-[#00254a] underline font-bold cursor-pointer" onClick={() => showToast('개인정보처리방침')}>개인정보처리방침</a>
                <a className="text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer" onClick={() => showToast('파트너 가입신청')}>파트너 가입신청</a>
                <a className="text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer" onClick={() => showToast('클리닝 품질보증 가이드')}>클리닝 품질보증 가이드</a>
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col md:items-end gap-1">
              <div className="text-[13px] text-[#43474f] font-medium">고객감동센터 365일 연중무휴</div>
              <a className="text-2xl font-bold text-[#00254a] tracking-tight" href="tel:1588-0000">1588-0000</a>
              <div className="text-[12px] text-[#737780]">운영시간 08:00 - 20:00 (점심시간 12:00 - 13:00)</div>
              <div className="text-[12px] text-[#737780]">카카오톡 상담톡 @쓸고닦고케어</div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[#dce9ff] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[#737780]">
            <p>© 2026 SsulDak Company Inc. All rights reserved.</p>
            <p>SsulDak은 통신판매중개자이며 서비스 당사자가 아닌 직영 인증 파트너와 고객을 연결합니다.</p>
          </div>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* MODAL 1: SIGNATURE PREVIEW MODAL                                      */}
      {/* ===================================================================== */}
      {showSignPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#e5eeff] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00254a] text-[22px]">draw</span>
                <h3 className="text-[17px] font-bold text-[#00254a]">등록된 자필 전자서명</h3>
              </div>
              <button
                className="w-8 h-8 rounded-full bg-[#eff4ff] hover:bg-[#e5eeff] flex items-center justify-center text-[#43474f] cursor-pointer"
                type="button"
                onClick={() => setShowSignPreviewModal(false)}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-[13px] text-[#43474f] leading-relaxed">
              전자계약 체결 시 이용자의 서명 날인란에 자동으로 적용되는 표준 자필 서명입니다.
            </p>

            <div className="w-full h-44 rounded-xl bg-[#eff4ff]/60 border-2 border-dashed border-[#dce9ff] flex items-center justify-center p-4">
              {profile.signImgUrl && profile.signImgUrl.startsWith('data:') ? (
                <img
                  src={profile.signImgUrl}
                  alt="Saved Signature"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 text-[#00254a]">
                  <span className="font-['Brush_Script_MT',cursive] text-4xl italic font-bold">
                    {profile.userNm}
                  </span>
                  <span className="text-[11px] text-[#737780]">표준 전자서명 암호화 인증됨</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5eeff]">
              <button
                className="px-4 py-2 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#43474f] text-[13px] font-semibold transition-colors cursor-pointer"
                type="button"
                onClick={() => setShowSignPreviewModal(false)}
              >
                닫기
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white text-[13px] font-bold transition-all shadow-xs cursor-pointer"
                type="button"
                onClick={() => {
                  setShowSignPreviewModal(false);
                  setShowSignCanvasModal(true);
                  setHasCanvasDrawn(false);
                }}
              >
                서명 다시 그리기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: SIGNATURE RE-DRAW CANVAS MODAL                                */}
      {/* ===================================================================== */}
      {showSignCanvasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#e5eeff] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00254a] text-[22px]">signature</span>
                <h3 className="text-[17px] font-bold text-[#00254a]">자필 서명 재등록</h3>
              </div>
              <button
                className="w-8 h-8 rounded-full bg-[#eff4ff] hover:bg-[#e5eeff] flex items-center justify-center text-[#43474f] cursor-pointer"
                type="button"
                onClick={() => setShowSignCanvasModal(false)}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <p className="text-[13px] text-[#43474f]">
              아래 박스 안에 마우스 또는 손가락으로 본인 실명 서명을 정자 또는 필기체로 입력해 주세요.
            </p>

            <div className="relative w-full h-48 rounded-xl bg-white border-2 border-dashed border-[#00254a]/40 overflow-hidden shadow-inner cursor-crosshair">
              <canvas
                ref={canvasRef}
                width={380}
                height={192}
                className="w-full h-full touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasCanvasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-[#c3c6d0]">
                  <span className="material-symbols-outlined text-[32px]">gesture</span>
                  <span className="text-[12px] mt-1">여기에 서명을 그려주세요</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                className="px-3 py-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#ba1a1a] text-[12px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                onClick={clearCanvas}
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                다시 쓰기
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-4 py-2 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#43474f] text-[13px] font-semibold transition-colors cursor-pointer"
                  onClick={() => setShowSignCanvasModal(false)}
                  disabled={isSavingSignature}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="px-5 py-2 rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white text-[13px] font-bold transition-all shadow-xs active:scale-98 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  onClick={saveSignature}
                  disabled={!hasCanvasDrawn || isSavingSignature}
                >
                  {isSavingSignature ? (
                    <>
                      <span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
                      저장 중...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">check</span>
                      서명 저장하기
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: POINT HISTORY MODAL                                          */}
      {/* ===================================================================== */}
      {showPointHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#e5eeff] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00254a] text-[22px]">monetization_on</span>
                <h3 className="text-[17px] font-bold text-[#00254a]">포인트 적립/사용 내역</h3>
              </div>
              <button
                className="w-8 h-8 rounded-full bg-[#eff4ff] hover:bg-[#e5eeff] flex items-center justify-center text-[#43474f] cursor-pointer"
                type="button"
                onClick={() => setShowPointHistoryModal(false)}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#dce9ff] flex items-center justify-between">
              <span className="text-[13px] text-[#43474f]">현재 보유 총 포인트</span>
              <span className="text-2xl font-extrabold text-[#006c4a]">
                {benefits.pointBalance.toLocaleString()} P
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
              <div className="p-3 rounded-lg bg-white border border-[#e5eeff] flex items-center justify-between text-[13px]">
                <div className="flex flex-col">
                  <span className="font-bold text-[#0b1c30]">시공 포토리뷰 작성 리워드</span>
                  <span className="text-[11px] text-[#737780]">2026.10.23 (USER-HIS-02)</span>
                </div>
                <span className="font-extrabold text-[#006c4a]">+1,000 P</span>
              </div>
              <div className="p-3 rounded-lg bg-white border border-[#e5eeff] flex items-center justify-between text-[13px]">
                <div className="flex flex-col">
                  <span className="font-bold text-[#0b1c30]">신규 회원가입 웰컴 포인트</span>
                  <span className="text-[11px] text-[#737780]">2026.10.20</span>
                </div>
                <span className="font-extrabold text-[#006c4a]">+3,000 P</span>
              </div>
            </div>

            <button
              className="w-full py-2.5 rounded-xl bg-[#00254a] text-white text-[13px] font-bold hover:bg-[#163b66] transition-colors cursor-pointer"
              type="button"
              onClick={() => setShowPointHistoryModal(false)}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: WITHDRAW CONFIRM MODAL                                       */}
      {/* ===================================================================== */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#e5eeff] flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[#ba1a1a]">
              <span className="material-symbols-outlined text-[24px]">warning</span>
              <h3 className="text-[17px] font-bold">회원탈퇴 신청 안내</h3>
            </div>
            <p className="text-[13px] text-[#43474f] leading-relaxed">
              탈퇴 시 보유 중인 모든 쿠폰과 리워드 포인트({benefits.pointBalance.toLocaleString()}P)가 영구 소멸되며, 진행 중인 청소 계약에 대한 사후 보증 서비스를 받으실 수 없습니다. 정말 탈퇴를 진행하시겠습니까?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5eeff]">
              <button
                className="px-4 py-2 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#43474f] text-[13px] font-semibold transition-colors cursor-pointer"
                type="button"
                onClick={() => setShowWithdrawModal(false)}
              >
                취소
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white text-[13px] font-bold transition-colors cursor-pointer"
                type="button"
                onClick={() => {
                  setShowWithdrawModal(false);
                  showToast('탈퇴 신청이 접수되었습니다. 고객센터에서 1영업일 내 유선 안내드립니다.');
                }}
              >
                탈퇴 신청
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FLOATING TOAST                                                        */}
      {/* ===================================================================== */}
      {toastVisible && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0b1c30]/95 text-white px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-[13px] font-semibold animate-fade-in border border-white/10">
          <span className="material-symbols-outlined text-[18px] text-[#82f5c1]">info</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
