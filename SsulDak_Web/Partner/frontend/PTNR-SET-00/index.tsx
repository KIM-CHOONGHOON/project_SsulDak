'use client';

import React, { useState, useEffect } from 'react';

export interface SettlementSummary {
  monthlyDirectRevenue: number;
  regularRevenue: number;
  applianceRevenue: number;
  regularCompleteCnt: number;
  applianceCompleteCnt: number;
  totalCompleteCnt: number;
  satisfactionScore: number;
  totalSavedFeeAmt: number;
  netFeePaidAmt: number;
  normalFeeAmt: number;
  feeSavedRatio: number;
  savedDetails: {
    welcomeCouponAmt: number;
    excellenceCouponAmt: number;
    excellenceCouponCnt: number;
  };
}

export interface SettlementTransactionItem {
  payNo: string;
  contractNo: string;
  orderNo: string;
  category: 'REGULAR' | 'APPLIANCE' | 'MOVEIN';
  categoryNm: string;
  title: string;
  formattedDate: string;
  clientName: string;
  location: string;
  directPayAmt: number;
  baseFeeAmt: number;
  discountAmt: number;
  actualPaidFeeAmt: number;
  discountReason: string;
  discountBadge: string;
  discountBadgeColor: string;
  statusText: string;
  hasReport: boolean;
}

export interface PtnrSet00Props {
  onNavigate?: (screenId: string, params?: Record<string, string>) => void;
}

export default function PtnrSet00Screen({ onNavigate }: PtnrSet00Props) {
  const [loading, setLoading] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 선택된 기준 년월 (기본: 2026-10)
  const [targetYearMonth, setTargetYearMonth] = useState<string>('2026-10');

  // 필터 탭: 'ALL' | 'REGULAR' | 'APPLIANCE' | 'DISCOUNT'
  const [filterTab, setFilterTab] = useState<'ALL' | 'REGULAR' | 'APPLIANCE' | 'DISCOUNT'>('ALL');

  // 페이징 상태
  const [currentPage, setCurrentPage] = useState<number>(1);

  // 요약 통계 상태
  const [summary, setSummary] = useState<SettlementSummary>({
    monthlyDirectRevenue: 2480000,
    regularRevenue: 1600000,
    applianceRevenue: 880000,
    regularCompleteCnt: 8,
    applianceCompleteCnt: 4,
    totalCompleteCnt: 12,
    satisfactionScore: 4.98,
    totalSavedFeeAmt: 66000,
    netFeePaidAmt: 33000,
    normalFeeAmt: 99000,
    feeSavedRatio: 67,
    savedDetails: {
      welcomeCouponAmt: 33000,
      excellenceCouponAmt: 33000,
      excellenceCouponCnt: 2
    }
  });

  // 트랜잭션 목록 상태
  const [transactions, setTransactions] = useState<SettlementTransactionItem[]>([
    {
      payNo: 'PAY2026102000001',
      contractNo: 'CT202610190089',
      orderNo: 'CNT-20261019-0089',
      category: 'REGULAR',
      categoryNm: '정기청소',
      title: '[정기청소] 중앙로 빌라 4층 상가주택 정기청소 1회차',
      formattedDate: '2026.10.20 (화)',
      clientName: '김*훈 고객님',
      location: '경기 고양시 일산동구 중앙로',
      directPayAmt: 80000,
      baseFeeAmt: 33000,
      discountAmt: 33000,
      actualPaidFeeAmt: 0,
      discountReason: '정상 데이터 이용료 33,000원 전액 면제',
      discountBadge: '신규 입점 100% 무료 쿠폰 적용',
      discountBadgeColor: 'bg-tertiary-fixed text-on-tertiary-fixed font-bold',
      statusText: '정산확정',
      hasReport: true
    },
    {
      payNo: 'PAY2026101500002',
      contractNo: 'CT202610120031',
      orderNo: 'CNT-20261012-0031',
      category: 'APPLIANCE',
      categoryNm: '가전분해',
      title: '[가전케어] 주엽동 문촌마을 아파트 스탠드에어컨+드럼세탁기 분해케어',
      formattedDate: '2026.10.15 (목)',
      clientName: '박*진 고객님',
      location: '경기 고양시 일산서구 주엽동',
      directPayAmt: 198000,
      baseFeeAmt: 33000,
      discountAmt: 16500,
      actualPaidFeeAmt: 16500,
      discountReason: '정상 33,000원 중 16,500원 즉시 할인 반영',
      discountBadge: '우수 파트너 50% 감면',
      discountBadgeColor: 'bg-secondary-container text-on-secondary-container font-bold',
      statusText: '정산확정',
      hasReport: false
    },
    {
      payNo: 'PAY2026101000003',
      contractNo: 'CT202610050012',
      orderNo: 'CNT-20261005-0012',
      category: 'REGULAR',
      categoryNm: '정기청소',
      title: '[정기청소] 마두동 빌라 공용부 3회차 정기관리',
      formattedDate: '2026.10.10 (토)',
      clientName: '이*철 고객님',
      location: '경기 고양시 일산동구 마두동',
      directPayAmt: 80000,
      baseFeeAmt: 33000,
      discountAmt: 16500,
      actualPaidFeeAmt: 16500,
      discountReason: '정기 고객 우대 할인 지원',
      discountBadge: '우수 파트너 50% 감면',
      discountBadgeColor: 'bg-secondary-container text-on-secondary-container font-bold',
      statusText: '정산확정',
      hasReport: false
    },
    {
      payNo: 'PAY2026100300004',
      contractNo: 'CT202609280005',
      orderNo: 'CNT-20260928-0005',
      category: 'REGULAR',
      categoryNm: '정기청소',
      title: '[정기청소] 백석동 상가건물 화장실 및 계단 클리닝',
      formattedDate: '2026.10.03 (토)',
      clientName: '정*호 고객님',
      location: '경기 고양시 일산동구 백석동',
      directPayAmt: 120000,
      baseFeeAmt: 33000,
      discountAmt: 33000,
      actualPaidFeeAmt: 0,
      discountReason: '월간 장기 계약 체결 특전 수수료 0원',
      discountBadge: '정기계약 번들 면제 혜택',
      discountBadgeColor: 'bg-surface-container-highest text-primary font-bold',
      statusText: '정산확정',
      hasReport: false
    }
  ]);

  // 영수증 보기 모달 상태
  const [receiptModal, setReceiptModal] = useState<{
    show: boolean;
    data: SettlementTransactionItem | null;
  }>({ show: false, data: null });

  // 시공보고서 확인 모달 상태
  const [reportModal, setReportModal] = useState<{
    show: boolean;
    data: SettlementTransactionItem | null;
  }>({ show: false, data: null });

  // 정산 계좌 변경 모달 상태
  const [bankModal, setBankModal] = useState<boolean>(false);
  const [bankForm, setBankForm] = useState({
    bankName: '신한은행',
    accountNo: '110-***-123456',
    holderName: '이수택 (반짝빌라클린)'
  });

  // 토스트 메시지 헬퍼
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // 백엔드 API 호출: 당월 정산 내역 로드
  const fetchMonthlySettlement = async (yearMonth: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/partner/ptnr_set_00', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'GET_MONTHLY_SETTLEMENT',
          ptnrNo: 'P20261000001',
          targetYearMonth: yearMonth
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.summary) setSummary(data.summary);
        if (data.transactions && Array.isArray(data.transactions) && data.transactions.length > 0) {
          setTransactions(data.transactions);
        }
      }
    } catch (err) {
      console.warn('[PTNR-SET-00 API Fallback Active]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonthlySettlement(targetYearMonth);
  }, [targetYearMonth]);

  // 월 전환 핸들러
  const handlePrevMonth = () => {
    if (targetYearMonth === '2026-10') setTargetYearMonth('2026-09');
    else if (targetYearMonth === '2026-09') setTargetYearMonth('2026-08');
    else showToast('조회 가능한 이전 데이터의 마지막 월입니다.');
  };

  const handleNextMonth = () => {
    if (targetYearMonth === '2026-08') setTargetYearMonth('2026-09');
    else if (targetYearMonth === '2026-09') setTargetYearMonth('2026-10');
    else showToast('현재 조회 가능한 최신 월(2026년 10월)입니다.');
  };

  // 필터링된 트랜잭션 목록
  const filteredTransactions = transactions.filter((t) => {
    if (filterTab === 'ALL') return true;
    if (filterTab === 'REGULAR') return t.category === 'REGULAR';
    if (filterTab === 'APPLIANCE') return t.category === 'APPLIANCE';
    if (filterTab === 'DISCOUNT') return t.discountAmt > 0;
    return true;
  });

  const monthLabel = targetYearMonth === '2026-10' ? '10월' : targetYearMonth === '2026-09' ? '9월' : '8월';
  const fullMonthLabel = targetYearMonth === '2026-10' ? '2026년 10월' : targetYearMonth === '2026-09' ? '2026년 09월' : '2026년 08월';

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md text-body-md pb-24 md:pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-xl shadow-2xl text-sm flex items-center gap-2 border border-slate-700/60 backdrop-blur-md animate-fade-in">
          <span className="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 max-w-[1280px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop flex items-center justify-between gap-space-md">
          {/* Logo & Status Badge */}
          <div className="flex items-center gap-space-lg">
            <button
              type="button"
              onClick={() => onNavigate?.('ptnr-dsh-00')}
              className="flex items-center gap-space-sm text-left hover:opacity-90 transition-opacity"
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm overflow-hidden">
                <img
                  src="/logo.png"
                  alt="SsulDak 로고"
                  className="w-full h-full object-contain p-0.5"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      const span = document.createElement('span');
                      span.className = 'material-symbols-outlined text-[20px]';
                      span.textContent = 'sanitizer';
                      target.parentElement.appendChild(span);
                    }
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-primary tracking-tight font-bold">SsulDak</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-bold tracking-wider -mt-1">PARTNER</span>
              </div>
            </button>
            <div className="hidden xl:flex items-center gap-space-sm bg-surface-container-low px-space-md py-1.5 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
              <span className="font-label-md text-label-md text-on-surface font-bold">반짝빌라클린</span>
              <span className="font-label-sm text-label-sm text-secondary bg-secondary-container/50 px-2 py-0.5 rounded-full font-bold">영업중 (ON)</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1.5" data-active-classes="bg-primary-container text-on-primary font-bold rounded-lg shadow-sm">
            <button
              type="button"
              onClick={() => onNavigate?.('ptnr-dsh-00')}
              className="px-3.5 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              홈 (대시보드)
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('ptnr-qot-00')}
              className="px-3.5 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              공고목록/오더수신
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('ptnr-job-00')}
              className="px-3.5 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              작업관리/시공보고
            </button>
            <button
              type="button"
              aria-current="page"
              className="px-3.5 py-2 transition-colors bg-primary-container text-on-primary font-bold rounded-lg shadow-sm"
            >
              정산/혜택관리
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('ptnr-dsh-01')}
              className="px-3.5 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              프로필/지역설정
            </button>
          </nav>

          {/* Profile & Notifications */}
          <div className="flex items-center gap-space-md">
            <button
              className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
              type="button"
              onClick={() => showToast('새로운 알림 2건: 10월 에스크로 정산 내역이 마감되었습니다.')}
              aria-label="알림"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error"></span>
            </button>
            <div className="hidden sm:flex items-center gap-space-sm pl-space-sm">
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <span className="font-label-md text-label-md text-on-surface font-bold">이수대표</span>
                  <span className="font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed px-1.5 py-0.5 rounded font-bold">마스터 파트너1급</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">파트너 ID: 294-81-01932</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
            </div>
            <button
              className="hidden sm:flex items-center p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
              type="button"
              title="로그아웃"
              onClick={() => onNavigate?.('ptnr-ath-00')}
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full pt-20 bg-background">
        <div className="flex flex-col w-full">
          <div className="max-w-[1280px] w-full mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop py-space-lg space-y-space-lg">
            
            {/* Breadcrumb & Top Command Bar */}
            <section className="flex flex-col gap-space-sm">
              <nav className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
                <button type="button" onClick={() => onNavigate?.('ptnr-dsh-00')} className="hover:text-primary transition-colors">홈</button>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <button type="button" onClick={() => onNavigate?.('ptnr-dsh-00')} className="hover:text-primary transition-colors">대시보드</button>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-on-surface-variant font-medium">정산/혜택 관리</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-primary font-bold">정산 및 매출 내역 (PTNR-SET-00)</span>
              </nav>

              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md pt-1">
                <div className="space-y-1">
                  <div className="flex items-center gap-space-sm flex-wrap">
                    <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight font-bold">매출 및 수수료 내역</h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/60 text-secondary font-label-sm text-label-sm font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      실시간 에스크로 연동
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant max-w-2xl">
                    월별 현장 도급 수령액 및 플랫폼 데이터 이용료(수수료) 감면 정산 내역을 투명하게 확인하고 증빙 자료를 발급받을 수 있습니다.
                  </p>
                </div>

                {/* Month Navigation & Excel Download */}
                <div className="flex items-center flex-wrap gap-space-sm">
                  <div className="flex items-center bg-surface-container-lowest rounded-xl shadow-sm p-1">
                    <button
                      aria-label="이전 달"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
                      type="button"
                      onClick={handlePrevMonth}
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <div className="relative px-space-sm">
                      <div className="flex items-center gap-1.5 font-label-md text-label-md text-primary font-bold py-1">
                        <span className="material-symbols-outlined text-[18px] text-primary">calendar_month</span>
                        <select
                          value={targetYearMonth}
                          onChange={(e) => setTargetYearMonth(e.target.value)}
                          className="bg-transparent font-bold text-primary focus:outline-none cursor-pointer pr-1"
                        >
                          <option value="2026-10">2026년 10월</option>
                          <option value="2026-09">2026년 09월</option>
                          <option value="2026-08">2026년 08월</option>
                        </select>
                        <span className="material-symbols-outlined text-[16px] pointer-events-none">arrow_drop_down</span>
                      </div>
                    </div>
                    <button
                      aria-label="다음 달"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors"
                      type="button"
                      onClick={handleNextMonth}
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>

                  <button
                    className="h-10 px-space-md bg-surface-container-lowest hover:bg-surface-container-low text-primary rounded-xl font-label-md text-label-md font-bold shadow-sm flex items-center gap-2 transition-all active:scale-[0.98]"
                    type="button"
                    onClick={() => showToast(`${fullMonthLabel} 정산 및 시공 내역 엑셀 다운로드가 완료되었습니다.`)}
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">table_view</span>
                    <span>엑셀 다운로드 (XLSX)</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Main Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
              
              {/* Left Stream: 68% (Col 8) */}
              <div className="lg:col-span-8 space-y-space-lg">
                
                {/* 1. Top Metrics Section: Revenue Summary & Promotion Benefit */}
                <div className="grid grid-cols-1 gap-space-md">
                  
                  {/* Monthly Revenue Metrics Card (다크 슬레이트 매출 요약 카드) */}
                  <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-container to-inverse-surface text-on-primary p-space-lg shadow-xl">
                    {/* Background Watermark Glow */}
                    <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-secondary/15 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col justify-between gap-space-md">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-lowest/15 backdrop-blur-md font-label-sm text-label-sm text-secondary-fixed">
                          <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                          <span>{monthLabel} 정산 마감 완료 (에스크로 정산 100%)</span>
                        </div>
                        <span className="font-label-sm text-label-sm text-primary-fixed-dim">
                          조회 기준: {targetYearMonth}.01 ~ {targetYearMonth}.31
                        </span>
                      </div>

                      <div className="space-y-1">
                        <p className="font-label-sm text-label-sm text-surface-container-highest tracking-wider uppercase font-semibold">
                          {monthLabel} 현장 직접 수령 총액
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-display font-extrabold tracking-tight text-surface-container-lowest">
                            {summary.monthlyDirectRevenue.toLocaleString()}
                          </span>
                          <span className="font-headline-sm text-headline-sm font-medium text-surface-variant">원</span>
                        </div>
                      </div>

                      {/* Breakdown Pill Grid */}
                      <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-surface-container-lowest/10 backdrop-blur-sm rounded-xl p-3 flex flex-col justify-between">
                          <span className="font-label-sm text-label-sm text-surface-container-high">정기관리 ({summary.regularCompleteCnt}회)</span>
                          <span className="font-label-lg text-label-lg font-bold text-surface-container-lowest mt-1">
                            {summary.regularRevenue.toLocaleString()}원
                          </span>
                        </div>
                        <div className="bg-surface-container-lowest/10 backdrop-blur-sm rounded-xl p-3 flex flex-col justify-between">
                          <span className="font-label-sm text-label-sm text-surface-container-high">가전케어 ({summary.applianceCompleteCnt}대)</span>
                          <span className="font-label-lg text-label-lg font-bold text-surface-container-lowest mt-1">
                            {summary.applianceRevenue.toLocaleString()}원
                          </span>
                        </div>
                        <div className="bg-surface-container-lowest/10 backdrop-blur-sm rounded-xl p-3 flex flex-col justify-between">
                          <span className="font-label-sm text-label-sm text-surface-container-high">총 수행 건수</span>
                          <div className="flex items-center gap-1 mt-1">
                            <span className="font-label-lg text-label-lg font-bold text-surface-container-lowest">
                              {summary.totalCompleteCnt}건
                            </span>
                            <span className="font-label-sm text-label-sm text-secondary-fixed">완료</span>
                          </div>
                        </div>
                        <div className="bg-surface-container-lowest/10 backdrop-blur-sm rounded-xl p-3 flex flex-col justify-between">
                          <span className="font-label-sm text-label-sm text-surface-container-high">고객 결제 만족도</span>
                          <div className="flex items-center gap-1 mt-1 text-tertiary-fixed">
                            <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            <span className="font-label-lg text-label-lg font-bold text-surface-container-lowest">
                              {summary.satisfactionScore.toFixed(2)}
                            </span>
                            <span className="font-label-sm text-label-sm text-surface-variant">/ 5.0</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Promotion Saved Cost Card (수수료 절감 Green Box) */}
                  <div className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col md:flex-row items-stretch justify-between gap-space-lg">
                    <div className="space-y-3 flex-1">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/30 text-secondary font-label-md text-label-md font-bold">
                        <span className="material-symbols-outlined text-[18px]">savings</span>
                        <span>프로모션 지원을 통해 절감된 데이터 이용료: -{summary.totalSavedFeeAmt.toLocaleString()} 원</span>
                      </div>
                      <div>
                        <h3 className="font-headline-sm text-headline-sm text-primary font-bold">쓸고닦고 파트너 상생 성장 패키지</h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                          상생 정책으로 이번 달 플랫폼 수수료가 전액 및 대폭 감면되었습니다.
                        </p>
                      </div>

                      {/* Promotion Details mini-cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-label-sm text-label-sm font-bold text-primary">신규 입점 100% 무료 쿠폰</span>
                            <span className="font-label-sm text-label-sm font-extrabold text-secondary">
                              -{summary.savedDetails.welcomeCouponAmt.toLocaleString()}원
                            </span>
                          </div>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            첫 배차 오더 데이터 이용료 전액 면제
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-label-sm text-label-sm font-bold text-primary">우수 파트너 50% 할인 혜택</span>
                            <span className="font-label-sm text-label-sm font-extrabold text-secondary">
                              -{summary.savedDetails.excellenceCouponAmt.toLocaleString()}원
                            </span>
                          </div>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            16,500원 × {summary.savedDetails.excellenceCouponCnt}건 우수시공 1급 등급 혜택
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Net Platform Fee Side Summary */}
                    <div className="md:w-64 bg-surface-container rounded-xl p-space-md flex flex-col justify-between gap-3">
                      <span className="font-label-sm text-label-sm font-bold text-on-surface-variant">이번 달 실 납부 이용료 합계</span>
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-1">
                          <span className="font-headline-lg text-headline-lg font-extrabold text-primary">
                            {summary.netFeePaidAmt.toLocaleString()}
                          </span>
                          <span className="font-label-md text-label-md text-on-surface font-semibold">원</span>
                        </div>
                        <p className="font-label-sm text-label-sm text-secondary font-bold">
                          정상 {summary.normalFeeAmt.toLocaleString()}원 중 {summary.feeSavedRatio}% 절감
                        </p>
                      </div>
                      <div className="pt-2 flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                        <span>정산 결제 방식</span>
                        <span className="font-bold text-primary">자동 차감 완료</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Transaction List (10월 상세 정산 내역) */}
                <section className="space-y-space-md">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                    <div className="flex items-center gap-space-sm">
                      <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                        {monthLabel} 상세 정산 내역
                      </h2>
                      <span className="font-label-sm text-label-sm text-on-surface-variant">
                        총 {filteredTransactions.length}건의 오더
                      </span>
                    </div>

                    {/* Segmented Filter Pills */}
                    <div className="flex items-center p-1 bg-surface-container-low rounded-xl">
                      <button
                        className={`px-3 py-1 rounded-lg font-label-sm text-label-sm transition-all ${
                          filterTab === 'ALL'
                            ? 'bg-surface-container-lowest font-bold text-primary shadow-sm'
                            : 'text-on-surface-variant hover:text-primary font-semibold'
                        }`}
                        type="button"
                        onClick={() => setFilterTab('ALL')}
                      >
                        전체 {transactions.length}건
                      </button>
                      <button
                        className={`px-3 py-1 rounded-lg font-label-sm text-label-sm transition-all ${
                          filterTab === 'REGULAR'
                            ? 'bg-surface-container-lowest font-bold text-primary shadow-sm'
                            : 'text-on-surface-variant hover:text-primary font-semibold'
                        }`}
                        type="button"
                        onClick={() => setFilterTab('REGULAR')}
                      >
                        정기청소 {transactions.filter((t) => t.category === 'REGULAR').length}건
                      </button>
                      <button
                        className={`px-3 py-1 rounded-lg font-label-sm text-label-sm transition-all ${
                          filterTab === 'APPLIANCE'
                            ? 'bg-surface-container-lowest font-bold text-primary shadow-sm'
                            : 'text-on-surface-variant hover:text-primary font-semibold'
                        }`}
                        type="button"
                        onClick={() => setFilterTab('APPLIANCE')}
                      >
                        가전분해 {transactions.filter((t) => t.category === 'APPLIANCE').length}건
                      </button>
                      <button
                        className={`px-3 py-1 rounded-lg font-label-sm text-label-sm transition-all ${
                          filterTab === 'DISCOUNT'
                            ? 'bg-surface-container-lowest font-bold text-primary shadow-sm'
                            : 'text-on-surface-variant hover:text-primary font-semibold'
                        }`}
                        type="button"
                        onClick={() => setFilterTab('DISCOUNT')}
                      >
                        이용료 감면 {transactions.filter((t) => t.discountAmt > 0).length}건
                      </button>
                    </div>
                  </div>

                  {/* Transaction Card List */}
                  <div className="space-y-3">
                    {filteredTransactions.map((item) => (
                      <div
                        key={item.payNo}
                        className="bg-surface-container-lowest rounded-2xl p-space-md md:p-space-lg shadow-sm hover:shadow-md transition-shadow"
                      >
                        {/* Header row */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pb-space-sm">
                          <div className="flex items-center gap-space-sm">
                            <span className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary font-bold">
                              <span className="material-symbols-outlined text-[20px]">
                                {item.category === 'APPLIANCE'
                                  ? 'mode_fan'
                                  : item.title.includes('상가')
                                  ? 'storefront'
                                  : item.title.includes('공용부')
                                  ? 'apartment'
                                  : 'cleaning_services'}
                              </span>
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-label-sm text-label-sm text-on-surface-variant">{item.formattedDate}</span>
                                <span className="font-label-sm text-label-sm text-outline">|</span>
                                <span className="font-label-sm text-label-sm font-bold text-primary tracking-wide">{item.orderNo}</span>
                              </div>
                              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">
                                {item.title}
                              </h3>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-start md:self-auto">
                            <span className="px-2.5 py-1 rounded-full bg-secondary-container/50 text-secondary font-label-sm text-label-sm font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                              {item.statusText}
                            </span>
                          </div>
                        </div>

                        {/* Metadata row */}
                        <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
                          <div className="flex items-center gap-space-md text-on-surface-variant font-body-sm text-body-sm">
                            <span className="flex items-center gap-1 text-on-surface">
                              <span className="material-symbols-outlined text-[16px] text-outline">person</span>
                              {item.clientName}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px] text-outline">location_on</span>
                              {item.location}
                            </span>
                          </div>
                          <div className="flex items-center gap-space-lg">
                            <div className="text-right">
                              <span className="font-label-sm text-label-sm text-on-surface-variant block">현장 도급 수령액</span>
                              <span className="font-label-lg text-label-lg font-bold text-primary">
                                {item.directPayAmt.toLocaleString()}원
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-label-sm text-label-sm text-secondary font-bold block">
                                납부 이용료 ({item.actualPaidFeeAmt === 0 ? (item.discountBadge.includes('번들') ? '번들면제' : '쿠폰면제') : '50% 감면'})
                              </span>
                              <span className="font-label-lg text-label-lg font-bold text-primary">
                                {item.actualPaidFeeAmt === 0 ? (
                                  <span className="text-secondary font-bold">0원</span>
                                ) : (
                                  `${item.actualPaidFeeAmt.toLocaleString()}원`
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Promotion Benefit tag & Action buttons */}
                        <div className="pt-space-sm flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-label-sm text-label-sm px-2 py-0.5 rounded ${item.discountBadgeColor}`}>
                              {item.discountBadge}
                            </span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                              {item.discountReason}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md font-bold flex items-center gap-1 transition-colors"
                              type="button"
                              onClick={() => setReceiptModal({ show: true, data: item })}
                            >
                              <span>영수증 보기</span>
                              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                            </button>
                            {item.hasReport && (
                              <button
                                className="px-3 py-1.5 rounded-lg bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md font-bold flex items-center gap-1 transition-colors"
                                type="button"
                                onClick={() => setReportModal({ show: true, data: item })}
                              >
                                <span className="material-symbols-outlined text-[16px]">task_alt</span>
                                <span>시공보고서 확인</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {filteredTransactions.length === 0 && (
                      <div className="bg-surface-container-lowest rounded-2xl p-12 text-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">receipt_long</span>
                        <p className="font-bold text-base text-primary">해당 조건에 일치하는 정산 내역이 없습니다.</p>
                        <p className="text-sm mt-1">상단 필터 탭을 변경하여 다른 내역을 확인해보세요.</p>
                      </div>
                    )}
                  </div>

                  {/* 3. Pagination & Batch Export Bar */}
                  <div className="p-space-md bg-surface-container-lowest rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-space-md">
                    <button
                      className="w-full sm:w-auto px-space-md py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md font-bold flex items-center justify-center gap-2 transition-colors"
                      type="button"
                      onClick={() => showToast('선택된 4건의 정산 영수증 일괄 인쇄 작업이 전송되었습니다.')}
                    >
                      <span className="material-symbols-outlined text-[18px]">print</span>
                      <span>선택 항목 증빙 일괄 인쇄</span>
                    </button>

                    {/* Pagination Controls */}
                    <div className="flex items-center gap-1.5">
                      <span className="font-body-sm text-body-sm text-on-surface-variant pr-2">
                        1-4 / 총 12건 (페이지 {currentPage}/3)
                      </span>
                      <button
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:bg-surface-container-low transition-colors disabled:opacity-40"
                        disabled={currentPage === 1}
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      >
                        <span className="material-symbols-outlined text-[18px]">keyboard_arrow_left</span>
                      </button>
                      <button
                        className={`w-8 h-8 rounded-lg font-label-md text-label-md font-bold ${
                          currentPage === 1 ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container font-medium'
                        }`}
                        type="button"
                        onClick={() => setCurrentPage(1)}
                      >
                        1
                      </button>
                      <button
                        className={`w-8 h-8 rounded-lg font-label-md text-label-md font-bold ${
                          currentPage === 2 ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container font-medium'
                        }`}
                        type="button"
                        onClick={() => setCurrentPage(2)}
                      >
                        2
                      </button>
                      <button
                        className={`w-8 h-8 rounded-lg font-label-md text-label-md font-bold ${
                          currentPage === 3 ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface-container font-medium'
                        }`}
                        type="button"
                        onClick={() => setCurrentPage(3)}
                      >
                        3
                      </button>
                      <button
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors disabled:opacity-40"
                        disabled={currentPage === 3}
                        type="button"
                        onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
                      >
                        <span className="material-symbols-outlined text-[18px]">keyboard_arrow_right</span>
                      </button>
                    </div>
                  </div>

                  {/* 2열 하단 바로가기 링크 (Grid grid-cols-2 gap-2.5, my-4 - 모바일 & 태블릿 반응형 지원) */}
                  <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-4">
                    <button
                      type="button"
                      onClick={() => onNavigate?.('ptnr-set-01')}
                      className="bg-white border border-slate-200 text-[13px] text-slate-700 p-3 rounded-xl text-center font-bold hover:bg-slate-50 transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <span>세금계산서/매입전표 확인 (PTNR-SET-01) &gt;</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate?.('ptnr-set-02')}
                      className="bg-white border border-teal-300 text-[13px] text-teal-800 p-3 rounded-xl text-center font-bold hover:bg-teal-50 transition-colors shadow-sm flex items-center justify-center gap-1"
                    >
                      <span>파트너 쿠폰함 (PTNR-SET-02) &gt;</span>
                    </button>
                  </div>
                </section>
              </div>

              {/* Right Stream: 32% (Col 4) Sticky Dashboard Panel */}
              <aside className="lg:col-span-4 space-y-space-md lg:sticky lg:top-24">
                
                {/* 1. Tax & Proof Documents Navigation Card */}
                <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm space-y-space-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[22px] text-primary">description</span>
                      <h3 className="font-headline-sm text-headline-sm text-primary font-bold">세무 및 증빙 서류 관리</h3>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {/* Tax Invoice Link Tile */}
                    <button
                      type="button"
                      onClick={() => onNavigate?.('ptnr-set-01')}
                      className="group w-full text-left block p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                          </span>
                          <span className="font-label-lg text-label-lg font-bold text-primary group-hover:text-primary-container transition-colors">
                            세금계산서/매입전표 (PTNR-SET-01)
                          </span>
                        </div>
                        <span className="material-symbols-outlined text-[18px] text-outline group-hover:translate-x-0.5 transition-transform">
                          arrow_forward
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 pl-10">
                        전자세금계산서 자동 발행 및 부가세 신고용 매입자료 다운로드
                      </p>
                    </button>

                    {/* Partner Coupon Wallet Tile */}
                    <button
                      type="button"
                      onClick={() => onNavigate?.('ptnr-set-02')}
                      className="group w-full text-left block p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-lg bg-secondary text-on-secondary flex items-center justify-center">
                            <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-label-lg text-label-lg font-bold text-primary group-hover:text-primary-container transition-colors">
                              파트너 쿠폰함 (PTNR-SET-02)
                            </span>
                            <span className="px-1.5 py-0.5 rounded-full bg-secondary-container text-secondary font-label-sm text-label-sm font-extrabold">
                              2장
                            </span>
                          </div>
                        </div>
                        <span className="material-symbols-outlined text-[18px] text-outline group-hover:translate-x-0.5 transition-transform">
                          arrow_forward
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 pl-10">
                        보유 쿠폰 2장 / 이용료 즉시 할인 및 시공 캐시백 확인
                      </p>
                    </button>
                  </div>
                </div>

                {/* 2. Registered Settlement Account Card */}
                <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm space-y-space-md">
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline-sm text-headline-sm text-primary font-bold">등록된 정산 계좌</h3>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary font-label-sm text-label-sm font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      실명인증 완료
                    </span>
                  </div>

                  <div className="p-space-md rounded-xl bg-surface-container-low space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">입금 기관 / 계좌번호</span>
                      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-highest font-bold text-primary">
                        에스크로 예치
                      </span>
                    </div>
                    <p className="font-label-lg text-label-lg font-extrabold text-primary">
                      {bankForm.bankName} {bankForm.accountNo}
                    </p>
                    <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm pt-1">
                      <span>예금주: <strong className="text-on-surface">{bankForm.holderName}</strong></span>
                      <span className="font-label-sm text-label-sm text-outline">사업자 일치확인</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-on-surface-variant font-body-sm text-body-sm">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5">schedule</span>
                      <span><strong>정기 정산 주기:</strong> 매월 5일 정기정산 / 건별 익일 에스크로 자동 입금</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-[16px] text-secondary mt-0.5">lock</span>
                      <span>금융결제원 안심 이체 연동 보호 중</span>
                    </div>
                  </div>

                  <button
                    className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md font-bold flex items-center justify-center gap-1 transition-colors"
                    type="button"
                    onClick={() => setBankModal(true)}
                  >
                    <span>정산 계좌 변경 신청</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>

                {/* 3. Tax Filing Guide & Support Hotline Box */}
                <div className="bg-gradient-to-br from-surface-container-low to-surface-container rounded-2xl p-space-lg shadow-sm space-y-space-md">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-primary">
                      <span className="material-symbols-outlined text-[20px]">account_balance</span>
                      <span className="font-label-lg text-label-lg font-bold">파트너 부가세 신고 가이드</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      간이과세자 / 일반과세자 유형별로 분기별 세무 리포트가 자동 생성되어 홈택스 간편 신고를 지원합니다.
                    </p>
                  </div>

                  {/* Hotline Call Box */}
                  <div className="p-space-md rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-between gap-space-sm">
                    <div className="space-y-0.5">
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">파트너 세무/정산 전담 핫라인</span>
                      <p className="font-headline-sm text-headline-sm font-extrabold text-primary">1588-0000</p>
                      <span className="font-label-sm text-label-sm text-secondary font-bold">ARS 4번 (정산 세무 회계팀)</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-secondary-container/40 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[22px]">phone_in_talk</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                    <span>운영 시간: 평일 09:00 ~ 18:00</span>
                    <button
                      type="button"
                      onClick={() => showToast('파트너 온라인 세무/부가세 가이드 FAQ 링크가 열렸습니다.')}
                      className="text-primary hover:underline font-bold"
                    >
                      온라인 세무 FAQ &gt;
                    </button>
                  </div>
                </div>

              </aside>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-low mt-space-xl">
        <div className="max-w-[1280px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop py-space-xl flex flex-col gap-space-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg pb-space-lg">
            <div className="space-y-space-xs">
              <div className="flex items-center gap-space-sm text-primary">
                <span className="material-symbols-outlined text-[24px]">support_agent</span>
                <span className="font-headline-sm text-headline-sm font-bold">24시 파트너 긴급 헬프센터</span>
              </div>
              <p className="font-display text-display text-primary font-bold tracking-tight">1588-0000</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                현장 작업 사고, 고객 긴급 분쟁, 야간 긴급 지원 365일 상시대기
              </p>
            </div>
            <div className="space-y-space-xs">
              <div className="flex items-center gap-space-sm text-secondary">
                <span className="material-symbols-outlined text-[24px]">verified_user</span>
                <span className="font-headline-sm text-headline-sm font-bold">에스크로 안전정산 보장제</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface">
                검수 완료 즉시 시공 대금 100% 안심 입금 지급 보증 시스템
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                신한은행 에스크로 파트너십 예치 계약 체결 완료
              </p>
            </div>
            <div className="space-y-space-xs">
              <span className="font-label-lg text-label-lg text-on-surface font-bold">파트너 주요 규정 및 정책</span>
              <div className="flex flex-wrap gap-x-space-md gap-y-1 font-body-sm text-body-sm text-on-surface-variant">
                <button type="button" onClick={() => showToast('파트너 이용약관')} className="hover:text-primary transition-colors">파트너 이용약관</button>
                <button type="button" onClick={() => showToast('개인정보처리방침')} className="hover:text-primary transition-colors font-bold">개인정보처리방침</button>
                <button type="button" onClick={() => showToast('작업시공 품질기준표')} className="hover:text-primary transition-colors">작업시공 품질기준표</button>
                <button type="button" onClick={() => showToast('손해배상책임 안내')} className="hover:text-primary transition-colors">손해배상책임 안내</button>
              </div>
            </div>
          </div>
          <div className="pt-space-md flex flex-col md:flex-row items-start md:items-center justify-between gap-space-sm text-on-surface-variant font-body-sm text-body-sm">
            <div className="space-y-1">
              <p>(주)쓸닥 | B2B 파트너 전용 콘솔 운영본부 | 대표이사: 김클린 | 사업자등록번호: 104-86-33921</p>
              <p>통신판매업신고: 제2024-서울강남-01928호 | 서울특별시 강남구 테헤란로 152 강남파이낸스센터 18F</p>
            </div>
            <p className="font-label-sm text-label-sm">© 2026 SsulDak Clean Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Nav (4대 파트너 네비게이션) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-4 py-2 flex items-center justify-around">
        <button
          type="button"
          onClick={() => onNavigate?.('ptnr-dsh-00')}
          className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-primary text-[11px] font-medium"
        >
          <span className="material-symbols-outlined text-[20px]">dashboard</span>
          <span>홈</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('ptnr-qot-00')}
          className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-primary text-[11px] font-medium"
        >
          <span className="material-symbols-outlined text-[20px]">assignment</span>
          <span>공고목록</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('ptnr-job-00')}
          className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-primary text-[11px] font-medium"
        >
          <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          <span>작업관리</span>
        </button>
        <button
          type="button"
          className="flex flex-col items-center gap-0.5 text-[#1E293B] text-[11px] font-bold"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            account_balance_wallet
          </span>
          <span>정산/혜택</span>
        </button>
      </nav>

      {/* 영수증 보기 모달 (전자 거래 증빙 영수증) */}
      {receiptModal.show && receiptModal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">receipt</span>
                </span>
                <h4 className="font-bold text-slate-900 text-lg">전자 거래 증빙 영수증</h4>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModal({ show: false, data: null })}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500">결제/승인번호</span>
                <span className="font-bold text-slate-800">{receiptModal.data.payNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">계약/오더번호</span>
                <span className="font-bold text-slate-800">{receiptModal.data.orderNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">시공 일시</span>
                <span className="font-bold text-slate-800">{receiptModal.data.formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">시공 명칭</span>
                <span className="font-bold text-slate-900 text-right max-w-[200px]">{receiptModal.data.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">수행 파트너</span>
                <span className="font-bold text-slate-800">이수택 (반짝빌라클린)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">의뢰 고객명</span>
                <span className="font-bold text-slate-800">{receiptModal.data.clientName}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-100 text-sm">
              <div className="flex justify-between font-bold text-slate-800">
                <span>현장 직접 수령액</span>
                <span className="text-base text-primary">{receiptModal.data.directPayAmt.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>정상 데이터 이용료</span>
                <span>{receiptModal.data.baseFeeAmt.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between text-xs text-secondary font-bold">
                <span>프로모션 감면액</span>
                <span>-{receiptModal.data.discountAmt.toLocaleString()}원 ({receiptModal.data.discountBadge})</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 pt-2 border-t border-slate-200">
                <span>실 납부 데이터 이용료</span>
                <span className="text-base text-slate-900">{receiptModal.data.actualPaidFeeAmt.toLocaleString()}원</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center leading-relaxed">
              본 영수증은 쓸닥 플랫폼 데이터 이용료 감면 및 현장 직접 수령을 확인하는 전자 증빙입니다.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  showToast('전자 영수증이 출력/저장되었습니다.');
                  setReceiptModal({ show: false, data: null });
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-container transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">print</span>
                <span>인쇄 / PDF 저장</span>
              </button>
              <button
                type="button"
                onClick={() => setReceiptModal({ show: false, data: null })}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 시공보고서 확인 모달 */}
      {reportModal.show && reportModal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">시공 완료 및 검수 보고서</h4>
                  <p className="text-xs text-slate-500">{reportModal.data.orderNo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportModal({ show: false, data: null })}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="bg-surface-container-low p-3.5 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">시공 명칭</span>
                <span className="font-bold text-primary">{reportModal.data.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">시공 일시</span>
                <span className="font-bold text-slate-800">2026.10.20 (화) 14:00 ~ 16:30 (2시간 30분)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">시공 장소</span>
                <span className="font-bold text-slate-800">{reportModal.data.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">검수 고객</span>
                <span className="font-bold text-slate-800">{reportModal.data.clientName} (서명 확인 완료)</span>
              </div>
            </div>

            {/* 시공 사진 갤러리 */}
            <div className="space-y-2">
              <span className="font-bold text-xs text-slate-700 block">시공 현장 전/후 사진 실사 (4장 등록)</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 h-28 flex flex-col items-center justify-center text-center p-2">
                  <span className="material-symbols-outlined text-2xl text-slate-400">cleaning_services</span>
                  <span className="text-[11px] font-bold text-slate-600 mt-1">[작업 전] 1층 현관 및 우편함</span>
                  <span className="text-[10px] text-slate-400">오염 및 전단지 제거 전</span>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-emerald-50 border border-emerald-200 h-28 flex flex-col items-center justify-center text-center p-2">
                  <span className="material-symbols-outlined text-2xl text-emerald-600">verified</span>
                  <span className="text-[11px] font-bold text-emerald-700 mt-1">[완료] 1층 현관 및 유리문</span>
                  <span className="text-[10px] text-emerald-600">약품 세정 및 광택 완료</span>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 h-28 flex flex-col items-center justify-center text-center p-2">
                  <span className="material-symbols-outlined text-2xl text-slate-400">stairs</span>
                  <span className="text-[11px] font-bold text-slate-600 mt-1">[작업 전] 2~4층 계단실</span>
                  <span className="text-[10px] text-slate-400">먼지 흡입 및 물청소 전</span>
                </div>
                <div className="relative rounded-xl overflow-hidden bg-emerald-50 border border-emerald-200 h-28 flex flex-col items-center justify-center text-center p-2">
                  <span className="material-symbols-outlined text-2xl text-emerald-600">verified</span>
                  <span className="text-[11px] font-bold text-emerald-700 mt-1">[완료] 2~4층 계단실</span>
                  <span className="text-[10px] text-emerald-600">난간 소독 및 왁스코팅 완료</span>
                </div>
              </div>
            </div>

            {/* 체크리스트 */}
            <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs">
              <span className="font-bold text-slate-700 block">품질 검수 체크리스트 (100% 충족)</span>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                  <span>계단 먼지 및 오염 제거 (양호)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                  <span>창틀 및 난간 소독 세정 (양호)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                  <span>현관 센서등 및 우편함 (양호)</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-secondary">check_circle</span>
                  <span>분리수거장 정돈 및 물청소 (양호)</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-secondary-container/20 rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-secondary">고객 검수 만족도 평가</span>
              <div className="flex items-center gap-1 text-tertiary">
                <span className="material-symbols-outlined text-[16px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="font-bold text-slate-900">5.0 / 5.0</span>
                <span className="text-slate-500">(아주 만족)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  showToast('시공보고서 PDF가 다운로드되었습니다.');
                  setReportModal({ show: false, data: null });
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-container transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                <span>보고서 PDF 다운로드</span>
              </button>
              <button
                type="button"
                onClick={() => setReportModal({ show: false, data: null })}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 정산 계좌 변경 신청 모달 */}
      {bankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">account_balance</span>
                </span>
                <h4 className="font-bold text-slate-900 text-lg">정산 계좌 변경 신청</h4>
              </div>
              <button
                type="button"
                onClick={() => setBankModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">입금 은행</label>
                <select
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-slate-800"
                >
                  <option value="신한은행">신한은행</option>
                  <option value="국민은행">KB국민은행</option>
                  <option value="우리은행">우리은행</option>
                  <option value="하나은행">하나은행</option>
                  <option value="기업은행">IBK기업은행</option>
                  <option value="농협은행">NH농협은행</option>
                  <option value="카카오뱅크">카카오뱅크</option>
                  <option value="토스뱅크">토스뱅크</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">계좌번호 (- 제외 입력)</label>
                <input
                  type="text"
                  value={bankForm.accountNo}
                  onChange={(e) => setBankForm({ ...bankForm, accountNo: e.target.value })}
                  placeholder="계좌번호를 입력하세요"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">예금주 성명 (사업자 대표자 일치)</label>
                <input
                  type="text"
                  value={bankForm.holderName}
                  onChange={(e) => setBankForm({ ...bankForm, holderName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-slate-800"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl text-amber-800 text-xs leading-relaxed border border-amber-200">
                ⚠️ 정산 계좌 변경 시 금융결제원 1원 실명 인증 및 사업자등록증 대조가 진행되며, 승인까지 1~2영업일이 소요됩니다.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  showToast('정산 계좌 변경 신청서가 제출되었습니다. (실명 인증 대기)');
                  setBankModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-container transition-colors shadow-sm"
              >
                변경 신청 제출
              </button>
              <button
                type="button"
                onClick={() => setBankModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
