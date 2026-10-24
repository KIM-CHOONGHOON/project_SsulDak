import React, { useState, useEffect, useMemo } from 'react';

/**
 * USER-MYP-02: 내 쿠폰 및 혜택 관리 화면 (React + TypeScript)
 * 
 * 아키텍처 규칙:
 * - 물리적 격리: SsulDak_Web/User/frontend/USER-MYP-02/
 * - 1:1 매핑 백엔드: POST /api/user/user_myp_02
 * - 전용 SQL: USER-MYP-02-SQL-001 ~ USER-MYP-02-SQL-006
 */

export interface CouponItem {
  couponNo: string;
  campaignNm: string;
  discountAmt: number;
  targetCleanType: string;
  couponStatCd: 'AVAILABLE' | 'USED' | 'EXPIRED';
  expireDt: string;
  usedDt: string | null;
  dDayRemaining: number;
  formattedExpireDt: string;
}

export interface CouponCounts {
  available: number;
  used: number;
  expired: number;
}

interface UserMyp02Props {
  userNo?: string;
  onNavigate?: (screen: string) => void;
}

export const UserMyp02Screen: React.FC<UserMyp02Props> = ({
  userNo = 'U20261000001',
  onNavigate
}) => {
  // 상태 관리
  const [activeTab, setActiveTab] = useState<'AVAILABLE' | 'USED' | 'EXPIRED'>('AVAILABLE');
  const [sortOption, setSortOption] = useState<'recent' | 'expiring' | 'discount'>('recent');
  const [counts, setCounts] = useState<CouponCounts>({ available: 2, used: 2, expired: 1 });
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 시리얼 코드 입력 상태
  const [serialInput, setSerialInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 토스트 메시지 상태
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 추천인 코드
  const referralCode = 'SSD-KIM-7788';

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // 쿠폰 목록 및 카운트 불러오기
  const fetchCouponList = async (tab: 'AVAILABLE' | 'USED' | 'EXPIRED' = activeTab) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/user_myp_02', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer MOCK_USER_JWT_TOKEN'
        },
        body: JSON.stringify({
          mode: 'GET_COUPON_LIST',
          userNo,
          tabType: tab
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const resData = await response.json();
      if (resData.success) {
        setCounts(resData.counts || { available: 0, used: 0, expired: 0 });
        setCoupons(resData.coupons || []);
      } else {
        showToast(resData.message || '쿠폰 목록을 불러오지 못했습니다.');
      }
    } catch (err: any) {
      console.error('쿠폰 목록 로딩 오류:', err);
      showToast('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCouponList(activeTab);
  }, [activeTab]);

  // 시리얼 쿠폰 등록 처리
  const handleRegisterSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = serialInput.trim().toUpperCase();
    if (!cleanCode) {
      showToast('16자리 쿠폰 코드를 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/user/user_myp_02', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer MOCK_USER_JWT_TOKEN'
        },
        body: JSON.stringify({
          mode: 'REGISTER_SERIAL_COUPON',
          userNo,
          serialCode: cleanCode
        })
      });

      const resData = await response.json();
      if (response.ok && resData.success) {
        showToast(resData.message || '쿠폰이 성공적으로 등록되었습니다!');
        setSerialInput('');
        // 성공 시 사용 가능 탭으로 이동 후 목록 갱신
        setActiveTab('AVAILABLE');
        fetchCouponList('AVAILABLE');
      } else {
        showToast(resData.message || '쿠폰 등록에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('시리얼 쿠폰 등록 오류:', err);
      showToast('쿠폰 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 추천인 코드 복사
  const handleCopyReferral = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralCode).then(() => {
        showToast(`초대 코드(${referralCode})가 클립보드에 복사되었습니다!`);
      }).catch(() => {
        showToast('코드 복사에 실패했습니다.');
      });
    } else {
      showToast(`초대 코드(${referralCode})가 복사되었습니다.`);
    }
  };

  // 카카오톡 공유
  const handleShareKakao = () => {
    showToast('카카오톡 초대 링크가 생성되었습니다. (테스트 환경)');
  };

  // 정렬된 쿠폰 리스트
  const sortedCoupons = useMemo(() => {
    const list = [...coupons];
    if (sortOption === 'expiring') {
      return list.sort((a, b) => new Date(a.expireDt).getTime() - new Date(b.expireDt).getTime());
    }
    if (sortOption === 'discount') {
      return list.sort((a, b) => b.discountAmt - a.discountAmt);
    }
    // recent (기본)
    return list;
  }, [coupons, sortOption]);

  const nav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.hash = path;
    }
  };

  return (
    <div className="bg-surface font-body-md text-body-md text-on-surface antialiased min-h-screen">
      {/* =========================================================================
          1. HEADER BAR
      ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 max-w-[1280px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop flex items-center justify-between gap-space-md">
          {/* Logo & Region */}
          <div className="flex items-center gap-space-lg">
            <button
              onClick={() => nav('home')}
              className="flex items-center gap-space-sm shrink-0 text-left cursor-pointer focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm">
                <span className="material-symbols-outlined text-[20px]">sanitizer</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm tracking-tight text-primary font-bold">SsulDak</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant -mt-1">쓸고닦고 케어</span>
              </div>
            </button>

            <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-1 bg-surface-container-low rounded-full text-on-surface hover:bg-surface-container transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-secondary text-[16px]">location_on</span>
              <span className="font-label-md text-label-md text-on-surface font-semibold">경기 고양시 일산동구</span>
              <span className="material-symbols-outlined text-outline text-[16px]">expand_more</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-space-xs">
            <button
              onClick={() => nav('home')}
              className="px-space-md py-space-xs font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors"
            >
              홈
            </button>
            <button
              onClick={() => nav('quotes')}
              className="px-space-md py-space-xs font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors"
            >
              견적현황
            </button>
            <button
              onClick={() => nav('booking-history')}
              className="px-space-md py-space-xs font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors"
            >
              이용내역
            </button>
            <button
              onClick={() => nav('coupon-book')}
              className="px-space-md py-space-xs font-label-lg text-label-lg bg-primary-container text-on-primary font-bold rounded-lg shadow-sm"
            >
              쿠폰북
            </button>
            <button
              onClick={() => nav('my-page')}
              className="px-space-md py-space-xs font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-lg transition-colors"
            >
              마이
            </button>
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-space-sm">
            <button
              aria-label="알림"
              type="button"
              onClick={() => showToast('새로운 알림이 없습니다.')}
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors relative"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-secondary ring-2 ring-surface-container-lowest"></span>
            </button>
            <button
              onClick={() => nav('my-page')}
              className="flex items-center pl-space-xs focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. MAIN CONTENT AREA
      ========================================================================= */}
      <main className="w-full pt-16 bg-surface min-h-[calc(100vh-280px)]">
        <div className="flex flex-col w-full">
          <div className="max-w-[1280px] w-full mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop py-space-lg flex flex-col gap-space-lg">
            
            {/* Top Breadcrumbs & Page Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
              <div className="flex flex-col gap-space-xs">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant">
                  <button onClick={() => nav('home')} className="hover:text-primary transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">home</span>
                    <span>홈</span>
                  </button>
                  <span className="material-symbols-outlined text-[14px] text-outline-variant">chevron_right</span>
                  <button onClick={() => nav('my-page')} className="hover:text-primary transition-colors">
                    마이페이지
                  </button>
                  <span className="material-symbols-outlined text-[14px] text-outline-variant">chevron_right</span>
                  <span className="text-on-surface font-bold">내 쿠폰 및 혜택 관리</span>
                </nav>

                {/* Title & Subtitle */}
                <div className="mt-1">
                  <h1 className="font-headline-lg text-headline-lg text-primary font-extrabold tracking-tight">
                    내 쿠폰 및 혜택 관리
                  </h1>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
                    보유 중인 할인 쿠폰과 리워드 혜택을 확인하고 신규 프로모션 코드를 등록하세요.
                  </p>
                </div>
              </div>

              {/* Action: Back to My Page */}
              <button
                onClick={() => nav('my-page')}
                className="inline-flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-surface-container-low text-primary hover:bg-surface-container font-label-lg text-label-lg transition-colors shadow-sm self-start md:self-auto shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>마이페이지로 돌아가기</span>
              </button>
            </div>

            {/* 2-Column Desktop Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
              
              {/* =============================================================
                  LEFT COLUMN: Main Functional Area (8 cols)
              ============================================================= */}
              <div className="lg:col-span-8 flex flex-col gap-space-lg">
                
                {/* 1. Quick Benefits & Wallet Banner / Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-outline-variant/30">
                  {/* Item 1: Usable Coupons */}
                  <div className="flex items-center gap-space-md p-space-sm rounded-xl bg-surface-container-low/60">
                    <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[24px]">confirmation_number</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">보유 쿠폰</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-headline-md text-headline-md font-extrabold text-primary">
                          {counts.available}
                        </span>
                        <span className="font-label-md text-label-md text-primary font-bold">장</span>
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                          사용 가능
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Item 2: SsulDak Reward Points */}
                  <div className="flex items-center gap-space-md p-space-sm rounded-xl bg-surface-container-low/60">
                    <div className="w-12 h-12 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[24px]">monetization_on</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">SsulDak 리워드</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-headline-md text-headline-md font-extrabold text-secondary">3,000</span>
                        <span className="font-label-md text-label-md text-secondary font-bold">P</span>
                      </div>
                      <span className="font-label-sm text-label-sm text-outline -mt-0.5">1P = 1원 즉시 차감</span>
                    </div>
                  </div>

                  {/* Item 3: Monthly Savings */}
                  <div className="flex items-center gap-space-md p-space-sm rounded-xl bg-surface-container-low/60">
                    <div className="w-12 h-12 rounded-xl bg-tertiary-container text-on-tertiary flex items-center justify-center shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[24px]">savings</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">이번 달 절약한 청소비</span>
                      <div className="flex items-baseline gap-1">
                        <span className="font-headline-md text-headline-md font-extrabold text-tertiary-container">15,000</span>
                        <span className="font-label-md text-label-md text-tertiary-container font-bold">원</span>
                      </div>
                      <span className="font-label-sm text-label-sm text-outline -mt-0.5">정기청소 누적할인 포함</span>
                    </div>
                  </div>
                </div>

                {/* 2. Serial Coupon Code Registration Box */}
                <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[20px]">pin</span>
                      </div>
                      <div>
                        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">프로모션 / 지류 시리얼 쿠폰 등록</h2>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">이벤트 및 제휴처에서 발급받은 16자리 쿠폰 코드를 입력해 주세요.</p>
                      </div>
                    </div>
                    <span className="hidden md:inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary font-bold bg-secondary-container/50 px-2.5 py-1 rounded-full">
                      <span className="material-symbols-outlined text-[15px]">verified</span>
                      즉시 계정 등록
                    </span>
                  </div>

                  <form onSubmit={handleRegisterSerial} className="flex flex-col sm:flex-row gap-space-sm items-stretch">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                        key
                      </span>
                      <input
                        value={serialInput}
                        onChange={(e) => setSerialInput(e.target.value.toUpperCase())}
                        maxLength={24}
                        placeholder="16자리 프로모션 시리얼 코드 입력 (예: SSD-2026-XXXX-XXXX)"
                        type="text"
                        className="w-full h-12 pl-11 pr-10 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline font-label-md text-label-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary-container transition-all"
                      />
                      {serialInput.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSerialInput('')}
                          aria-label="입력 내용 지우기"
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-outline hover:text-on-surface transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">cancel</span>
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || !serialInput.trim()}
                      className="h-12 px-6 rounded-xl bg-primary-container text-on-primary font-label-lg text-label-lg font-bold hover:bg-primary transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[20px]">add_circle</span>
                      <span>{isSubmitting ? '등록 중...' : '쿠폰 등록하기'}</span>
                    </button>
                  </form>

                  <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
                    <span className="material-symbols-outlined text-[16px] text-outline">info</span>
                    <span>대소문자 구분 없이 입력 가능하며 등록 즉시 [사용 가능] 목록에 추가됩니다.</span>
                  </div>
                </div>

                {/* 3. Filter Tabs & Order Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md pt-space-xs">
                  {/* Segmented Tab Controls */}
                  <div className="inline-flex p-1 rounded-xl bg-surface-container-low gap-1" role="tablist">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeTab === 'AVAILABLE'}
                      onClick={() => setActiveTab('AVAILABLE')}
                      className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1.5 ${
                        activeTab === 'AVAILABLE'
                          ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface font-semibold'
                      }`}
                    >
                      <span>사용 가능</span>
                      <span className={`w-5 h-5 rounded-full font-label-sm text-label-sm flex items-center justify-center ${
                        activeTab === 'AVAILABLE' ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high text-on-surface'
                      }`}>
                        {counts.available}
                      </span>
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeTab === 'USED'}
                      onClick={() => setActiveTab('USED')}
                      className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1.5 ${
                        activeTab === 'USED'
                          ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface font-semibold'
                      }`}
                    >
                      <span>사용 완료</span>
                      <span className="text-outline">{counts.used}</span>
                    </button>

                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeTab === 'EXPIRED'}
                      onClick={() => setActiveTab('EXPIRED')}
                      className={`px-4 py-2 rounded-lg font-label-md text-label-md transition-all flex items-center gap-1.5 ${
                        activeTab === 'EXPIRED'
                          ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface font-semibold'
                      }`}
                    >
                      <span>기간 만료됨</span>
                      <span className="text-outline">{counts.expired}</span>
                    </button>
                  </div>

                  {/* Sort Filter */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="relative inline-block text-left">
                      <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value as any)}
                        className="appearance-none bg-surface-container-low text-on-surface font-label-md text-label-md font-semibold py-2 pl-3.5 pr-8 rounded-xl cursor-pointer hover:bg-surface-container focus:outline-none transition-colors border-0"
                      >
                        <option value="recent">최신 등록순</option>
                        <option value="expiring">마감 임박순</option>
                        <option value="discount">할인 금액 높은순</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px] pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Coupon Card List (Rich Voucher / Ticket Architecture) */}
                <div className="flex flex-col gap-space-md" id="coupon-card-container">
                  {isLoading ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-3 bg-surface-container-lowest rounded-2xl shadow-sm">
                      <span className="material-symbols-outlined text-[32px] text-primary animate-spin">
                        progress_activity
                      </span>
                      <p className="font-label-md text-label-md text-on-surface-variant">쿠폰 목록을 불러오는 중입니다...</p>
                    </div>
                  ) : sortedCoupons.length === 0 ? (
                    <div className="py-16 flex flex-col items-center justify-center gap-3 bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30">
                      <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-outline">
                        <span className="material-symbols-outlined text-[36px]">confirmation_number</span>
                      </div>
                      <p className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        {activeTab === 'AVAILABLE' && '사용 가능한 쿠폰이 없습니다.'}
                        {activeTab === 'USED' && '사용 완료된 쿠폰이 없습니다.'}
                        {activeTab === 'EXPIRED' && '만료된 쿠폰이 없습니다.'}
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
                        상단의 시리얼 코드 입력창에서 프로모션 쿠폰을 등록해 보세요!
                      </p>
                    </div>
                  ) : (
                    sortedCoupons.map((coupon, idx) => {
                      const isAvailable = activeTab === 'AVAILABLE';
                      const isUsed = activeTab === 'USED';
                      const isExpired = activeTab === 'EXPIRED';

                      return (
                        <div
                          key={coupon.couponNo || idx}
                          className={`relative bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-outline-variant/30 group ${
                            isUsed || isExpired ? 'opacity-80' : ''
                          }`}
                        >
                          <div className="flex flex-col md:flex-row items-stretch">
                            {/* Left Visual Stub / Perforation Graphic */}
                            <div className="w-full md:w-44 bg-surface-container-high/60 p-space-md flex flex-col justify-between items-start md:items-center text-center relative shrink-0">
                              <div className="flex md:flex-col items-center justify-between w-full gap-2">
                                {isAvailable && (
                                  <>
                                    <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                                      {coupon.campaignNm.includes('친구') ? '친구초대' : '웰컴 혜택'}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold flex items-center gap-1">
                                      <span className="material-symbols-outlined text-[14px]">alarm</span>
                                      D-{coupon.dDayRemaining}
                                    </span>
                                  </>
                                )}
                                {isUsed && (
                                  <span className="px-2.5 py-1 rounded-full bg-outline-variant text-on-surface font-label-sm text-label-sm font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                    사용 완료
                                  </span>
                                )}
                                {isExpired && (
                                  <span className="px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">event_busy</span>
                                    기간 만료
                                  </span>
                                )}
                              </div>

                              <div className="my-auto py-2">
                                <div className={`font-headline-lg text-headline-lg font-extrabold tracking-tight ${
                                  isAvailable ? 'text-primary' : 'text-on-surface-variant'
                                }`}>
                                  {coupon.discountAmt.toLocaleString()}
                                  <span className="font-label-lg text-label-lg ml-0.5">원</span>
                                </div>
                                <span className={`font-label-sm text-label-sm font-bold uppercase tracking-wider ${
                                  isAvailable ? 'text-secondary' : 'text-outline'
                                }`}>
                                  {coupon.campaignNm.includes('친구') ? 'Referral Reward' : 'Direct Coupon'}
                                </span>
                              </div>

                              <div className="text-left md:text-center w-full">
                                <span className="font-label-sm text-label-sm text-outline">
                                  {coupon.targetCleanType.includes('정기') ? '추천인 감사 쿠폰' : '데이터 이용료 전용'}
                                </span>
                              </div>

                              {/* Ticket perforation notch dots for desktop */}
                              <div className="hidden md:block absolute -right-2 top-0 bottom-0 w-4 overflow-hidden pointer-events-none">
                                <div className="h-full flex flex-col justify-between py-2">
                                  <div className="w-4 h-4 rounded-full bg-surface"></div>
                                  <div className="w-4 h-4 rounded-full bg-surface"></div>
                                </div>
                              </div>
                            </div>

                            {/* Center Voucher Content Details */}
                            <div className="flex-1 p-space-lg flex flex-col justify-between gap-space-md">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded bg-surface-container-low text-primary font-label-sm text-label-sm font-bold">
                                    {coupon.campaignNm.includes('친구') ? '친구초대 리워드' : '첫 결제 리워드'}
                                  </span>
                                  <span className="font-label-sm text-label-sm text-outline">
                                    코드: {coupon.couponNo}
                                  </span>
                                </div>

                                <h3 className={`font-headline-sm text-headline-sm font-bold ${
                                  isExpired ? 'line-through text-outline' : 'text-on-surface'
                                }`}>
                                  {coupon.campaignNm}
                                </h3>

                                <div className="flex flex-col gap-1 font-body-sm text-body-sm text-on-surface-variant mt-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                                    <span className="font-medium text-on-surface">{coupon.targetCleanType}</span>
                                    <span className="text-outline-variant">|</span>
                                    <span>정기청소, 입주/이사, 가전케어</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-outline">
                                    <span className="material-symbols-outlined text-[16px]">rule</span>
                                    <span>최소 결제금액 20,000원 이상 시 적용 가능 (데이터 이용료 전용)</span>
                                  </div>
                                </div>
                              </div>

                              {/* Bottom Row: Validity & Trigger Button */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm pt-space-xs border-t border-outline-variant/20">
                                <div className="flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant">
                                  <span className="material-symbols-outlined text-[16px] text-outline">calendar_clock</span>
                                  {isUsed && coupon.usedDt ? (
                                    <span>사용일시: <strong className="text-on-surface">{coupon.usedDt.slice(0, 10)}</strong></span>
                                  ) : (
                                    <span>유효기간: <strong className="text-on-surface">~ {coupon.formattedExpireDt} 23:59까지</strong></span>
                                  )}
                                </div>

                                {isAvailable && (
                                  <button
                                    onClick={() => nav('quotes')}
                                    className="inline-flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-all font-label-md text-label-md font-bold shadow-sm active:scale-95"
                                  >
                                    <span>지금 예약에 사용하기</span>
                                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                  </button>
                                )}
                                {isUsed && (
                                  <span className="px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface-variant font-label-md text-label-md font-medium">
                                    사용 완료됨
                                  </span>
                                )}
                                {isExpired && (
                                  <span className="px-3 py-1.5 rounded-lg bg-surface-container-low text-error font-label-md text-label-md font-medium">
                                    기한 만료
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 5. Coupon Usage Guidelines & Notice Box */}
                <div className="bg-surface-container-low rounded-2xl p-space-lg flex flex-col gap-space-sm border border-outline-variant/30">
                  <div className="flex items-center gap-2">
                    <span className="text-secondary text-[20px] font-bold">💡</span>
                    <h4 className="font-headline-sm text-headline-sm font-bold text-primary">쿠폰 및 포인트 이용 안내</h4>
                  </div>
                  <ul className="flex flex-col gap-2 font-body-sm text-body-sm text-on-surface-variant pl-1">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 shrink-0"></span>
                      <span>쿠폰은 파트너 견적 수락 후 플랫폼 데이터 이용료(중개 수수료) 결제 시 1건당 1장씩 선택 적용할 수 있습니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 shrink-0"></span>
                      <span>현장 직불 청소 시공비에는 적용되지 않으며, 예약 취소/환불 시 유효기간 내 자동 복원됩니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 shrink-0"></span>
                      <span>보유 중인 리워드 포인트(SsulDak 캐시)와 쿠폰은 동시 중복 적용이 가능합니다.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 shrink-0"></span>
                      <span>유효기간이 만료된 쿠폰은 자동으로 만료 탭으로 이동하며 재발급이 불가합니다.</span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* =============================================================
                  RIGHT COLUMN: Side Panel / Benefits & Referral (4 cols)
              ============================================================= */}
              <div className="lg:col-span-4 flex flex-col gap-space-lg">
                
                {/* 1. Friend Referral Promotion Card */}
                <div className="bg-primary text-on-primary rounded-2xl p-space-lg shadow-md relative overflow-hidden flex flex-col gap-space-md">
                  {/* Subtle Glow Overlay */}
                  <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-secondary-container/20 blur-2xl pointer-events-none"></div>
                  
                  <div className="flex flex-col gap-1 relative z-10">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary text-on-secondary font-label-sm text-label-sm font-bold self-start">
                      <span className="material-symbols-outlined text-[14px]">celebration</span>
                      상시 리워드 이벤트
                    </div>
                    <h3 className="font-headline-md text-headline-md font-extrabold text-on-primary mt-1">
                      친구 초대하고 5,000P 받기
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-primary-container leading-relaxed">
                      친구에게 쓸고닦고를 추천하면 친구도 나도 각각 <strong>5,000원 쿠폰 &amp; 리워드</strong> 즉시 지급!
                    </p>
                  </div>

                  {/* My Invite Code Card */}
                  <div className="bg-primary-container rounded-xl p-space-md flex flex-col gap-2 relative z-10">
                    <span className="font-label-sm text-label-sm text-on-primary-container">나의 고유 추천인 코드</span>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-headline-sm text-headline-sm font-extrabold tracking-wider text-on-primary">
                        {referralCode}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyReferral}
                        className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-primary hover:bg-surface-container-high transition-colors font-label-md text-label-md font-bold flex items-center gap-1 active:scale-95 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                        <span>코드 복사</span>
                      </button>
                    </div>
                  </div>

                  {/* Kakao Share Action Button */}
                  <button
                    type="button"
                    onClick={handleShareKakao}
                    className="w-full h-12 rounded-xl bg-[#FEE500] text-[#191919] hover:bg-[#ebd300] font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98] relative z-10"
                  >
                    <span className="material-symbols-outlined text-[20px]">chat</span>
                    <span>카카오톡으로 초대 링크 공유하기</span>
                  </button>
                </div>

                {/* 2. Point & Reward Summary Card */}
                <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[22px]">toll</span>
                      <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">리워드 포인트 지갑</h4>
                    </div>
                    <span className="font-label-sm text-label-sm text-outline">실시간 연동</span>
                  </div>

                  {/* Points Breakdown */}
                  <div className="flex flex-col gap-space-sm bg-surface-container-low rounded-xl p-space-md">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-label-md text-on-surface-variant">SsulDak 캐시</span>
                      <span className="font-headline-md text-headline-md font-extrabold text-primary">
                        3,000 <span className="font-label-md text-label-md">P</span>
                      </span>
                    </div>
                    <div className="w-full h-[1px] bg-outline-variant/30"></div>
                    <div className="flex items-center justify-between font-label-sm text-label-sm">
                      <span className="text-outline">30일 이내 소멸 예정</span>
                      <span className="font-bold text-on-surface">0 P</span>
                    </div>
                  </div>

                  {/* Link to detailed points screen */}
                  <button
                    type="button"
                    onClick={() => showToast('포인트 내역 페이지로 이동합니다.')}
                    className="flex items-center justify-between py-2 text-primary hover:text-secondary transition-colors font-label-md text-label-md font-bold text-left"
                  >
                    <span>포인트 적립/사용 내역 확인</span>
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>

                {/* 3. Promotion Graphic Widget / Visual Depth */}
                <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col gap-space-sm">
                  <div
                    className="relative h-32 rounded-xl overflow-hidden bg-cover bg-center"
                    style={{
                      backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuB3pdDLyuQE0oCPgZFO7n9RF_mpbwI9t9Jb0BFBc3wV6HY9BN7-72osbwjZCr777xxFk_MFqFTLBz35sUihWxwkO9SR8Ap0da2ogcrIXNVztaGGmGzLKU-eN344ppge5O1l9F9bcWm38eu2bMJuuZrjjimftlsK2raNygPq73-l4fur_8H8dlvT3saE_qeKDjlvZivERconiXoJBUXrRkSdU_tjmRh8-iAAYVB1tjM-iJwUENQhpbkt')`
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/30 to-transparent flex flex-col justify-end p-space-md text-on-primary">
                      <span className="font-label-sm text-label-sm font-bold text-secondary-container">정기구독 추가 할인</span>
                      <p className="font-headline-sm text-headline-sm font-bold leading-tight">정기청소 신청 시 매달 10% 추가 쿠폰 발급</p>
                    </div>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant px-1">
                    원룸, 아파트 가사도우미 정기 케어 회원은 매월 첫째 주 전용 10% 쿠폰이 자동 적립됩니다.
                  </p>
                </div>

                {/* 4. Customer Support Widget */}
                <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-outline text-[20px]">contact_support</span>
                    <h4 className="font-label-lg text-label-lg font-bold text-on-surface">쿠폰 등록 및 사용에 어려움이 있으신가요?</h4>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    기업 제휴 바우처나 단체 프로모션 쿠폰 오류는 고객센터를 통해 즉시 복구해 드립니다.
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="font-label-sm text-label-sm text-outline">고객만족센터</span>
                      <div className="font-headline-sm text-headline-sm font-extrabold text-primary">1588-0000</div>
                      <span className="font-label-sm text-label-sm text-outline">평일 08:00 ~ 20:00</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast('카카오톡 1:1 상담창이 열립니다.')}
                      className="px-3.5 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary font-label-md text-label-md font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-secondary text-[18px]">chat</span>
                      <span>1:1 카카오톡 상담</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </main>

      {/* =========================================================================
          3. FOOTER
      ========================================================================= */}
      <footer className="w-full bg-surface-container-low text-on-surface-variant py-space-xl border-t border-outline-variant/30">
        <div className="max-w-[1280px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop">
          {/* Guarantee Badges */}
          <div className="flex flex-wrap items-center gap-space-md pb-space-lg mb-space-lg border-b border-outline-variant/30">
            <div className="flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-surface-container-highest text-primary">
              <span className="material-symbols-outlined text-secondary text-[18px]">verified_user</span>
              <span className="font-label-md text-label-md font-bold">10억원 영업배상 책임보험 가입</span>
            </div>
            <div className="flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-surface-container-highest text-primary">
              <span className="material-symbols-outlined text-secondary text-[18px]">security</span>
              <span className="font-label-md text-label-md font-bold">에스크로 안전결제 시스템 가동중</span>
            </div>
            <div className="flex items-center gap-space-xs px-space-md py-1.5 rounded-full bg-surface-container-highest text-primary">
              <span className="material-symbols-outlined text-tertiary-container text-[18px]">workspace_premium</span>
              <span className="font-label-md text-label-md font-bold">검증된 마스터 클리너 배정 100%</span>
            </div>
          </div>

          {/* Company Details */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter-desktop items-start">
            <div className="md:col-span-8 flex flex-col gap-space-xs">
              <div className="flex items-center gap-space-sm mb-1">
                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">(주)쓸고닦고컴퍼니</span>
                <span className="text-outline-variant">|</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">클리닝 &amp; 공간 솔루션 플랫폼</span>
              </div>
              <div className="flex flex-wrap gap-x-space-md gap-y-1 font-body-sm text-body-sm">
                <span className="text-on-surface-variant">대표이사: 홍길동</span>
                <span className="text-outline-variant">·</span>
                <span className="text-on-surface-variant">사업자등록번호: 214-88-00000</span>
                <span className="text-outline-variant">·</span>
                <span className="text-on-surface-variant">통신판매업신고: 2024-경기고양-1049호</span>
              </div>
              <div className="flex flex-wrap gap-x-space-md gap-y-1 font-body-sm text-body-sm">
                <span className="text-on-surface-variant">주소: 경기도 고양시 일산동구 중앙로 1261 백석빌딩 8층</span>
                <span className="text-outline-variant">·</span>
                <span className="text-on-surface-variant">개인정보보호책임자: 김케어 (privacy@ssuldak.co.kr)</span>
              </div>
              <div className="flex flex-wrap gap-x-space-md pt-space-xs font-label-md text-label-md">
                <button type="button" onClick={() => showToast('이용약관 안내')} className="text-on-surface hover:text-primary underline font-medium">이용약관</button>
                <button type="button" onClick={() => showToast('개인정보처리방침 안내')} className="text-on-surface hover:text-primary underline font-bold">개인정보처리방침</button>
                <button type="button" onClick={() => showToast('파트너 가입신청 페이지')} className="text-on-surface-variant hover:text-on-surface transition-colors">파트너 가입신청</button>
                <button type="button" onClick={() => showToast('클리닝 품질보증 가이드')} className="text-on-surface-variant hover:text-on-surface transition-colors">클리닝 품질보증 가이드</button>
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col md:items-end gap-space-xs">
              <div className="font-label-md text-label-md text-on-surface-variant font-medium">고객감동센터 365일 연중무휴</div>
              <a className="font-headline-lg text-headline-lg font-bold text-primary tracking-tight" href="tel:1588-0000">1588-0000</a>
              <div className="font-body-sm text-body-sm text-outline">운영시간 08:00 - 20:00 (점심시간 12:00 - 13:00)</div>
              <div className="font-body-sm text-body-sm text-outline">카카오톡 상담톡 @쓸고닦고케어</div>
            </div>
          </div>

          <div className="mt-space-lg pt-space-md flex flex-col sm:flex-row items-center justify-between gap-space-xs border-t border-outline-variant/20">
            <p className="font-body-sm text-body-sm text-outline">© 2024 SsulDak Company Inc. All rights reserved.</p>
            <p className="font-body-sm text-body-sm text-outline">SsulDak은 통신판매중개자이며 서비스 당사자가 아닌 직영 인증 파트너와 고객을 연결합니다.</p>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          4. FLOATING TOAST NOTIFICATION
      ========================================================================= */}
      {toastMessage && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl bg-inverse-surface text-inverse-on-surface font-label-md text-label-md font-semibold shadow-2xl z-50 flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[18px] text-secondary-container">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default UserMyp02Screen;
