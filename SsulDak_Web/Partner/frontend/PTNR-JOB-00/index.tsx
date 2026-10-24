'use client';

import React, { useState, useEffect } from 'react';

export interface AvailableCoupon {
  couponNo: string;
  campaignNm: string;
  discountRate: number;
  maxDiscountAmt: number;
  discountAmt: number;
}

export interface PendingDispatch {
  contractNo: string;
  orderNo: string;
  subItemNm: string;
  buildingTitle: string;
  totalServiceAmt: number;
  monthlyServiceAmt: number;
  contractMonths: number;
  totalRounds: number;
  firstVisitText: string;
  servicePeriodText: string;
  maskedUserNm: string;
  addrRoad: string;
  baseFeeAmt: number;
  calculatedFeeAmt: number;
  availableCoupons: AvailableCoupon[];
  remainSecondsText: string;
}

export interface ScheduledJob {
  contractNo: string;
  orderNo: string;
  subItemNm: string;
  title: string;
  scopeDesc: string;
  totalPayAmt: number;
  serviceStartDt: string;
  scheduleText: string;
  dDayText: string;
  statusBadge: string;
  statusBadgeColor: string;
  clientName: string;
  safeTelNo: string;
  crewText: string;
  workStatCd: string;
  roundNo: number;
  totalRounds: number;
  photoCount?: number;
  inspectionNotice?: string;
  hasInsurance: boolean;
}

export interface DashboardStats {
  pendingCount: number;
  thisWeekCount: number;
  inspectingCount: number;
  avgRating: number;
  monthlyExpectedSettlement: number;
}

export interface PtnrJob00Props {
  onNavigate?: (screenId: string, params?: Record<string, string>) => void;
}

export default function PtnrJob00Screen({ onNavigate }: PtnrJob00Props) {
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // 대기 건 및 확정 목록 상태
  const [pendingDispatch, setPendingDispatch] = useState<PendingDispatch | null>(null);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    pendingCount: 1,
    thisWeekCount: 2,
    inspectingCount: 1,
    avgRating: 4.98,
    monthlyExpectedSettlement: 980000
  });

  // 쿠폰 선택 상태
  const [selectedCouponNo, setSelectedCouponNo] = useState<string>('PCP2026100100001');

  // 필터 탭 ('ALL' | 'TODAY' | 'WEEK' | 'REGULAR' | 'COMPLETED')
  const [filterTab, setFilterTab] = useState<string>('ALL');

  // 뷰 모드 ('LIST' | 'CALENDAR')
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');

  // 배차 확정 성공 모달
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    contractNo: string;
    safeTelNo: string;
  }>({ show: false, contractNo: '', safeTelNo: '' });

  const [confirming, setConfirming] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // 1. 대시보드 데이터 로드 (POST /api/partner/ptnr_job_00)
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/partner/ptnr_job_00', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'GET_JOB_DASHBOARD',
          ptnrNo: 'P20261000001'
        })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setPendingDispatch(data.pendingDispatch);
        setScheduledJobs(data.scheduledJobs || []);
        if (data.stats) setStats(data.stats);

        if (data.pendingDispatch?.availableCoupons?.length > 0) {
          setSelectedCouponNo(data.pendingDispatch.availableCoupons[0].couponNo);
        }
      }
    } catch (err: any) {
      console.warn('[PTNR-JOB-00] Dashboard fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 선택된 쿠폰에 따른 할인액 계산
  const currentCoupon = pendingDispatch?.availableCoupons.find((c) => c.couponNo === selectedCouponNo);
  const discountAmt = currentCoupon ? currentCoupon.discountAmt : 0;
  const finalPayAmt = Math.max(0, (pendingDispatch?.baseFeeAmt || 33000) - discountAmt);

  // 배차 최종 확정 핸들러 (CONFIRM_DISPATCH)
  const handleConfirmDispatch = async () => {
    if (!pendingDispatch) return;

    if (!confirm('0원 (무료 패스 쿠폰 적용)으로 본 오더의 배차를 최종 확정하시겠습니까?')) {
      return;
    }

    setConfirming(true);
    try {
      const res = await fetch('/api/partner/ptnr_job_00', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'CONFIRM_DISPATCH',
          ptnrNo: 'P20261000001',
          contractNo: pendingDispatch.contractNo,
          couponNo: selectedCouponNo || null,
          baseFeeAmt: pendingDispatch.baseFeeAmt,
          discountCouponAmt: discountAmt,
          actualPaidAmt: finalPayAmt,
          pgProviderCd: finalPayAmt === 0 ? 'FREE_PASS' : 'TOSS',
          pgTid: `FREE_PASS_${Date.now()}`
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '배차 확정에 실패했습니다.');
      }

      // 모달 표시
      setConfirmModal({
        show: true,
        contractNo: pendingDispatch.contractNo,
        safeTelNo: data.safeTelNo || '0507-1429-8821'
      });

      // 대기 건 제거 및 확정 목록으로 이동
      const confirmedNewJob: ScheduledJob = {
        contractNo: pendingDispatch.contractNo,
        orderNo: pendingDispatch.orderNo,
        subItemNm: pendingDispatch.subItemNm,
        title: `[${pendingDispatch.subItemNm.slice(0, 4)} 1회차] ${pendingDispatch.buildingTitle}`,
        scopeDesc: '시공 범위: 1~4층 계단실/복도 난간 청소, 창틀 먼지 흡입, 1층 필로티 분리수거장 고압 세척',
        totalPayAmt: pendingDispatch.totalServiceAmt,
        serviceStartDt: '2026-11-01 09:00',
        scheduleText: '2026.11.01(일) 오전 09:00',
        dDayText: 'D-10',
        statusBadge: '방문 예정 (배차완료)',
        statusBadgeColor: 'bg-secondary-container text-on-secondary-container',
        clientName: pendingDispatch.maskedUserNm + ' 고객님',
        safeTelNo: data.safeTelNo || '0507-1429-8821',
        crewText: '2인 1조 (예상 소요: 2.0시간)',
        workStatCd: 'MATCHED',
        roundNo: 1,
        totalRounds: 12,
        hasInsurance: true
      };

      setPendingDispatch(null);
      setScheduledJobs((prev) => [confirmedNewJob, ...prev]);
      setStats((prev) => ({
        ...prev,
        pendingCount: Math.max(0, prev.pendingCount - 1),
        thisWeekCount: prev.thisWeekCount + 1
      }));

      showToast('배차가 최종 확정되어 작업 관리 목록에 등록되었습니다!');
    } catch (err: any) {
      alert(`배차 확정 처리 중 오류: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  // 필터 탭 적용
  const filteredJobs = scheduledJobs.filter((job) => {
    if (filterTab === 'TODAY') return false; // 오늘 작업 0건
    if (filterTab === 'WEEK') return job.contractNo.includes('00089') || job.contractNo.includes('00054');
    if (filterTab === 'REGULAR') return job.subItemNm.includes('정기청소');
    if (filterTab === 'COMPLETED') return job.workStatCd === 'INSPECTING' || job.statusBadge.includes('검수');
    return true;
  });

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased selection:bg-secondary-container selection:text-on-secondary-container min-h-screen flex flex-col">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 backdrop-blur-md animate-fade-in font-label-md text-label-md">
          <span className="material-symbols-outlined text-[20px] text-secondary">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* FIXED GNB HEADER */}
      <header className="fixed top-0 w-full z-40 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.04)]">
        <div className="h-16 max-w-[1280px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop flex items-center justify-between">
          <div className="flex items-center gap-space-lg">
            <div
              className="flex items-center gap-space-sm cursor-pointer"
              onClick={() => onNavigate ? onNavigate('PTNR-DSH-00') : (window.location.hash = '#ptnr-dsh-00')}
            >
              <div className="flex items-center gap-1.5">
                <span className="font-headline-sm text-headline-sm text-primary tracking-tight font-extrabold">
                  SsulDak
                </span>
                <span className="px-1.5 py-0.5 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm tracking-wider uppercase font-bold">
                  Partner
                </span>
              </div>
              <div className="h-4 w-px bg-outline-variant/50"></div>
              <div className="flex items-center gap-1.5">
                <span className="font-label-md text-label-md text-on-surface font-bold">반짝빌라클린</span>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                  <span>영업중(ON)</span>
                </div>
              </div>
            </div>

            <nav className="hidden xl:flex items-center gap-1">
              <button
                onClick={() => onNavigate ? onNavigate('PTNR-DSH-00') : (window.location.hash = '#ptnr-dsh-00')}
                className="px-3 py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all font-label-md text-label-md"
                type="button"
              >
                홈
              </button>
              <button
                onClick={() => onNavigate ? onNavigate('PTNR-QOT-00') : (window.location.hash = '#partner-orders')}
                className="px-3 py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all font-label-md text-label-md"
                type="button"
              >
                공고목록/오더수신
              </button>
              <button
                onClick={() => onNavigate ? onNavigate('PTNR-JOB-00') : (window.location.hash = '#ptnr-job-00')}
                className="px-3 py-1.5 transition-all bg-primary-container text-on-primary font-bold rounded-lg shadow-sm font-label-md text-label-md"
                type="button"
              >
                작업관리/시공보고
              </button>
              <button
                onClick={() => onNavigate ? onNavigate('PTNR-DSH-02') : (window.location.hash = '#ptnr-dsh-02')}
                className="px-3 py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all font-label-md text-label-md"
                type="button"
              >
                정산/혜택관리
              </button>
              <button
                onClick={() => onNavigate ? onNavigate('PTNR-DSH-01') : (window.location.hash = '#ptnr-dsh-01')}
                className="px-3 py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all font-label-md text-label-md"
                type="button"
              >
                프로필/지역설정
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-space-md">
            <button
              aria-label="알림"
              className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface"></span>
            </button>

            <div className="flex items-center gap-space-sm pl-space-sm">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <div className="flex items-center gap-1">
                  <span className="font-label-md text-label-md text-on-surface font-semibold">이수 대표</span>
                  <span className="px-1 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold">
                    마스터
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">전문 파트너 1급</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate ? onNavigate('PTNR-ATH-00') : (window.location.hash = '#ptnr-ath-00')}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-on-surface-variant hover:bg-error-container hover:text-on-error-container transition-colors font-label-md text-label-md"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>로그아웃</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN BODY */}
      <main className="w-full pt-16 bg-surface min-h-[calc(100vh-140px)] flex-1">
        <div className="max-w-[1280px] w-full mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop py-space-md">
          {/* 1. Breadcrumb & Header Section */}
          <div className="flex flex-col gap-space-sm mb-space-lg">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm overflow-x-auto whitespace-nowrap">
              <button onClick={() => onNavigate ? onNavigate('PTNR-DSH-00') : (window.location.hash = '#ptnr-dsh-00')} className="hover:text-primary transition-colors">
                홈
              </button>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <button onClick={() => onNavigate ? onNavigate('PTNR-DSH-00') : (window.location.hash = '#ptnr-dsh-00')} className="hover:text-primary transition-colors">
                대시보드 (PTNR-DSH-00)
              </button>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-on-surface-variant font-semibold">작업/배차 관제 센터</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-primary font-bold">예약 및 작업 관리 (PTNR-JOB-00)</span>
            </nav>

            {/* Page Header & Utility */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pt-space-xs">
              <div>
                <div className="flex items-center gap-space-sm flex-wrap">
                  <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight font-extrabold">
                    예약 및 작업 관리
                  </h1>
                  <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold flex items-center gap-1.5 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                    {pendingDispatch ? '실시간 관제 가동 중 (신규 배차 1건 대기)' : '실시간 관제 가동 중 (배차 완료)'}
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1">
                  고객이 선결제를 완료한 신규 매칭 오더의 데이터 이용료를 확인하고, 배차를 최종 수락하여 정기 시공 일정을 관리합니다.
                </p>
              </div>

              <div className="flex items-center gap-space-sm self-start lg:self-center">
                <div className="inline-flex p-1 rounded-lg bg-surface-container shadow-sm">
                  <button
                    onClick={() => setViewMode('LIST')}
                    className={`px-3 py-1.5 rounded font-label-md text-label-md font-bold flex items-center gap-1.5 transition-all ${
                      viewMode === 'LIST'
                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
                    <span>리스트 뷰</span>
                  </button>
                  <button
                    onClick={() => setViewMode('CALENDAR')}
                    className={`px-3 py-1.5 rounded font-label-md text-label-md font-medium flex items-center gap-1.5 transition-all ${
                      viewMode === 'CALENDAR'
                        ? 'bg-surface-container-lowest text-primary shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                    <span>캘린더 뷰</span>
                  </button>
                </div>

                <button
                  onClick={fetchDashboardData}
                  className="p-2.5 rounded-lg bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors shadow-sm"
                  type="button"
                  title="새로고침"
                >
                  <span className="material-symbols-outlined text-[20px]">refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. Main Two-Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
            {/* LEFT COLUMN: Orders & Scheduled Cards (8 of 12 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-space-lg">
              {/* 3-A. [긴급/하이라이트 배너 카드] Pending Dispatch Alert */}
              {pendingDispatch && (
                <div className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-space-lg shadow-md transition-all hover:shadow-lg border border-secondary/20">
                  {/* Ambient decorative glow */}
                  <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
                  <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-secondary-container/20 rounded-full blur-2xl pointer-events-none"></div>

                  {/* Alert Top Status Bar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm pb-space-md bg-surface-container-low/70 -mx-space-lg -mt-space-lg px-space-lg pt-space-md mb-space-md">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 rounded bg-primary text-on-primary font-label-sm text-label-sm font-bold uppercase tracking-wide">
                        선결제 완료
                      </span>
                      <span className="font-label-md text-label-md text-primary font-bold">
                        배차 수락 대기 오더
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                      <span className="material-symbols-outlined text-[16px] text-error">timer</span>
                      <span>수락 제한시간 {pendingDispatch.remainSecondsText} 남음</span>
                    </div>
                  </div>

                  {/* Order Summary Details */}
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                          주문번호
                        </span>
                        <span className="font-label-md text-label-md text-primary font-extrabold tracking-tight">
                          {pendingDispatch.orderNo}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(pendingDispatch.orderNo);
                            showToast('주문번호가 클립보드에 복사되었습니다.');
                          }}
                          className="text-on-surface-variant hover:text-primary transition-colors p-0.5"
                          title="주문번호 복사"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">content_copy</span>
                        </button>
                      </div>

                      <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold">
                        {pendingDispatch.subItemNm}
                      </span>
                    </div>

                    <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                      {pendingDispatch.buildingTitle}
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-xs pt-1 text-on-surface-variant font-body-sm text-body-sm">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary-container">
                          location_on
                        </span>
                        <span>{pendingDispatch.addrRoad}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary-container">
                          person
                        </span>
                        <span>{pendingDispatch.maskedUserNm} 고객님 (안심번호 수락 즉시 자동 개설)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary-container">
                          event
                        </span>
                        <span>시공 기간: {pendingDispatch.servicePeriodText}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          event_available
                        </span>
                        <span className="font-bold text-on-surface">첫 방문일: {pendingDispatch.firstVisitText}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section Divider with Inset Tone */}
                  <div className="my-space-md py-space-md px-space-md rounded-xl bg-surface-container-low flex flex-col gap-space-sm border border-surface-container">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-secondary text-[20px]">
                          account_balance_wallet
                        </span>
                        <span className="font-label-lg text-label-lg text-primary font-bold">
                          개정 데이터 이용료 산출 및 혜택 적용
                        </span>
                      </div>
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                        플랫폼 이용 표준 약관 제14조 2항
                      </span>
                    </div>

                    {/* Fee Breakdown Calculation Box */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm pt-space-xs">
                      {/* 고객 결제 총액 */}
                      <div className="p-space-sm rounded-lg bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">
                          고객 결제 총 용역 대금
                        </span>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="font-headline-sm text-headline-sm text-primary font-extrabold">
                            {pendingDispatch.totalServiceAmt.toLocaleString()}
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">원</span>
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px] mt-1">
                          월 {pendingDispatch.monthlyServiceAmt.toLocaleString()}원 × {pendingDispatch.contractMonths}개월 정기결제
                        </span>
                      </div>

                      {/* 데이터 이용료 산정 */}
                      <div className="p-space-sm rounded-lg bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            데이터 이용료 (수수료)
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-[10px] font-bold">
                            최저액 적용
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="font-headline-sm text-headline-sm text-on-surface-variant line-through font-bold">
                            {pendingDispatch.baseFeeAmt.toLocaleString()}
                          </span>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">원</span>
                        </div>
                        <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px] mt-1">
                          max(3.3% {pendingDispatch.calculatedFeeAmt.toLocaleString()}원, 33,000원)
                        </span>
                      </div>

                      {/* 파트너 최종 실결제액 */}
                      <div className="p-space-sm rounded-lg bg-primary-container text-on-primary shadow-sm flex flex-col justify-between relative overflow-hidden">
                        <div className="flex items-center justify-between">
                          <span className="font-label-sm text-label-sm text-on-primary-container font-semibold">
                            파트너 최종 납부액
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-secondary text-on-secondary font-label-sm text-[10px] font-bold">
                            100% 면제
                          </span>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1">
                          <span className="font-headline-lg text-headline-lg text-secondary-container font-extrabold">
                            {finalPayAmt.toLocaleString()}
                          </span>
                          <span className="font-label-md text-label-md text-on-primary">원</span>
                        </div>
                        <span className="font-body-sm text-body-sm text-on-primary-container text-[11px] mt-1">
                          웰컴 프로모션 쿠폰 적용
                        </span>
                      </div>
                    </div>

                    {/* Coupon Selector Dropdown UI */}
                    <div className="mt-space-xs pt-space-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-space-sm bg-surface-container-lowest p-space-sm rounded-lg shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[20px]">
                          confirmation_number
                        </span>
                        <span className="font-label-md text-label-md text-on-surface font-bold">
                          적용 쿠폰 선택:
                        </span>
                      </div>
                      <div className="relative flex-1 max-w-md">
                        <select
                          value={selectedCouponNo}
                          onChange={(e) => setSelectedCouponNo(e.target.value)}
                          className="w-full pl-3 pr-8 py-2 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                        >
                          {pendingDispatch.availableCoupons.map((c) => (
                            <option key={c.couponNo} value={c.couponNo}>
                              {c.campaignNm}
                            </option>
                          ))}
                          <option value="">쿠폰 미적용 (일반 결제 33,000원)</option>
                        </select>
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant absolute right-2.5 top-2.5 pointer-events-none">
                          arrow_drop_down
                        </span>
                      </div>
                    </div>

                    {/* Guarantee Note */}
                    <div className="flex items-center justify-between flex-wrap gap-2 px-1 pt-1">
                      <div className="flex items-center gap-1.5 text-secondary font-label-sm text-label-sm font-bold">
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        <span>
                          파트너 실수령 보장액: {pendingDispatch.totalServiceAmt.toLocaleString()} 원 (100% 전액 익일 정산 보장)
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                        플랫폼 매칭 수수료 0원 혜택 구간
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons & Subtext */}
                  <div className="flex flex-col gap-space-sm mt-space-md">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-sm">
                      <button
                        onClick={handleConfirmDispatch}
                        disabled={confirming}
                        className="flex-1 py-3.5 px-space-lg rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-lg text-label-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer active:scale-[0.98]"
                        type="button"
                      >
                        {confirming ? (
                          <>
                            <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                            <span>배차 확정 및 안심번호 개설 중...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[22px] text-secondary-container group-hover:scale-110 transition-transform">
                              check_circle
                            </span>
                            <span>
                              {finalPayAmt === 0 ? '0원 (쿠폰 적용) 배차 최종 확정하기' : `${finalPayAmt.toLocaleString()}원 결제하고 배차 확정하기`}
                            </span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          if (confirm('본 배차 요청을 거절하시겠습니까? 거절 시 재매칭 풀로 이관됩니다.')) {
                            setPendingDispatch(null);
                            showToast('배차 요청을 거절하였습니다.');
                          }
                        }}
                        className="px-space-md py-3.5 rounded-xl bg-surface-container text-on-surface-variant hover:bg-error-container hover:text-on-error-container font-label-md text-label-md font-bold transition-all cursor-pointer"
                        type="button"
                      >
                        배차 거절 신청
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm text-[12px] flex-wrap gap-1">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">info</span>
                        배차 확정 시 고객 안심번호가 즉시 열람되며, 1:1 상담 채팅방(PTNR-JOB-02)이 개설됩니다.
                      </span>
                      <a className="text-primary hover:underline font-semibold cursor-pointer" onClick={() => alert('배차 확정 후 단순 변심 취소 시 7일간 투찰이 정지될 수 있습니다.')}>
                        배차 취소 및 패널티 규정 확인 &gt;
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* 3-B. [확정 작업 일정 리스트] Scheduled Jobs List */}
              <div className="flex flex-col gap-space-md">
                {/* Section Title & Filter Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                  <div className="flex items-center gap-2">
                    <h2 className="font-headline-md text-headline-md text-primary font-bold">
                      확정 작업 및 시공 관리
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-bold">
                      총 {filteredJobs.length}건
                    </span>
                  </div>

                  {/* Tab Filters */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {[
                      { key: 'ALL', label: `전체 일정 (${scheduledJobs.length})` },
                      { key: 'TODAY', label: '오늘 작업 (0)' },
                      { key: 'WEEK', label: '이번 주 (2)' },
                      { key: 'REGULAR', label: '정기순회 (2)' },
                      { key: 'COMPLETED', label: '완료됨 (1)' }
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setFilterTab(tab.key)}
                        className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm font-bold whitespace-nowrap transition-all ${
                          filterTab === tab.key
                            ? 'bg-primary text-on-primary shadow-sm'
                            : 'bg-surface-container-low text-on-surface-variant hover:text-on-surface'
                        }`}
                        type="button"
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Job Cards Stack */}
                <div className="flex flex-col gap-space-md">
                  {filteredJobs.length === 0 ? (
                    <div className="p-12 text-center bg-surface-container-lowest rounded-xl text-on-surface-variant border border-surface-container">
                      <span className="material-symbols-outlined text-[40px] text-outline-variant mb-2">
                        event_busy
                      </span>
                      <p className="font-headline-sm font-bold text-on-surface">선택하신 조건에 해당하는 작업 일정이 없습니다.</p>
                      <p className="text-body-sm mt-1">상단 필터를 '전체 일정'으로 변경하시거나 신규 공고에 청약서를 제출해보세요.</p>
                    </div>
                  ) : (
                    filteredJobs.map((job) => (
                      <div
                        key={job.contractNo}
                        className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm hover:shadow-md transition-shadow flex flex-col gap-space-md border border-surface-container"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2.5 py-1 rounded bg-surface-container-highest text-primary font-label-sm text-label-sm font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">schedule</span>
                              {job.scheduleText}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-extrabold">
                              {job.dDayText}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold ${job.statusBadgeColor}`}
                            >
                              {job.statusBadge}
                            </span>
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            오더번호: {job.orderNo}
                          </span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                            {job.title}
                          </h3>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            {job.scopeDesc}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm p-space-sm rounded-lg bg-surface-container-low font-body-sm text-body-sm">
                          <div>
                            <span className="text-on-surface-variant block text-[11px]">의뢰 고객</span>
                            <span className="font-semibold text-on-surface">{job.clientName}</span>
                          </div>
                          <div>
                            <span className="text-on-surface-variant block text-[11px]">안심 가상번호</span>
                            <span className="font-semibold text-primary font-mono">{job.safeTelNo}</span>
                          </div>
                          <div>
                            <span className="text-on-surface-variant block text-[11px]">배치 팀</span>
                            <span className="font-semibold text-on-surface">{job.crewText}</span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-space-xs">
                          <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
                            {job.hasInsurance && (
                              <>
                                <span className="material-symbols-outlined text-[16px] text-secondary">
                                  verified_user
                                </span>
                                <span>대물 1억원 안심 배상책임보험 적용 대상</span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-space-sm w-full sm:w-auto">
                            <button
                              onClick={() => {
                                if (onNavigate) {
                                  onNavigate('PTNR-JOB-02', { contractNo: job.contractNo });
                                } else {
                                  window.location.hash = '#ptnr-job-02';
                                }
                              }}
                              className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg bg-surface-container text-primary hover:bg-surface-container-high font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              type="button"
                            >
                              <span className="material-symbols-outlined text-[18px]">forum</span>
                              <span>1:1 고객채팅</span>
                            </button>

                            <button
                              onClick={() => {
                                if (onNavigate) {
                                  onNavigate('PTNR-JOB-01', { contractNo: job.contractNo });
                                } else {
                                  window.location.hash = '#ptnr-job-01';
                                }
                              }}
                              className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                              type="button"
                            >
                              <span>작업상태 갱신 (PTNR-JOB-01)</span>
                              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Calendar Widget, KPI Overview & Safety Rules (4 of 12 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-space-lg">
              {/* 4-1. Mini Schedule Calendar Widget */}
              <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm flex flex-col gap-space-sm border border-surface-container">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">calendar_today</span>
                    <span className="font-headline-sm text-headline-sm text-primary font-bold">2026년 11월</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1 rounded hover:bg-surface-container transition-colors" type="button" aria-label="이전 달">
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>
                    <button className="p-1 rounded hover:bg-surface-container transition-colors" type="button" aria-label="다음 달">
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>

                {/* Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center font-label-sm text-label-sm py-2">
                  <span className="text-error font-bold">일</span>
                  <span className="text-on-surface-variant">월</span>
                  <span className="text-on-surface-variant">화</span>
                  <span className="text-on-surface-variant">수</span>
                  <span className="text-on-surface-variant">목</span>
                  <span className="text-on-surface-variant">금</span>
                  <span className="text-primary font-bold">토</span>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center font-body-sm text-body-sm">
                  {/* W1: 1st is Sunday */}
                  <div className="h-9 rounded-lg bg-primary text-on-primary font-bold flex flex-col items-center justify-center relative cursor-pointer shadow-sm">
                    <span>1</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary-container mt-0.5"></span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>2</span>
                  </div>
                  <div className="h-9 rounded-lg bg-surface-container-high text-primary font-bold flex flex-col items-center justify-center relative cursor-pointer">
                    <span>3</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary mt-0.5"></span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>4</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>5</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>6</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>7</span>
                  </div>

                  {/* W2 */}
                  <div className="h-9 rounded-lg bg-surface-container text-on-surface font-semibold flex flex-col items-center justify-center relative cursor-pointer">
                    <span>8</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5"></span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>9</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>10</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>11</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>12</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>13</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>14</span>
                  </div>

                  {/* W3 */}
                  <div className="h-9 rounded-lg bg-surface-container text-on-surface font-semibold flex flex-col items-center justify-center relative cursor-pointer">
                    <span>15</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5"></span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>16</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>17</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>18</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>19</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>20</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>21</span>
                  </div>

                  {/* W4 */}
                  <div className="h-9 rounded-lg bg-surface-container text-on-surface font-semibold flex flex-col items-center justify-center relative cursor-pointer">
                    <span>22</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5"></span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>23</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>24</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>25</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>26</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>27</span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>28</span>
                  </div>

                  {/* W5 */}
                  <div className="h-9 rounded-lg bg-surface-container text-on-surface font-semibold flex flex-col items-center justify-center relative cursor-pointer">
                    <span>29</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5"></span>
                  </div>
                  <div className="h-9 rounded-lg hover:bg-surface-container flex flex-col items-center justify-center cursor-pointer">
                    <span>30</span>
                  </div>
                  <div className="h-9 rounded-lg text-outline-variant flex items-center justify-center opacity-40">1</div>
                  <div className="h-9 rounded-lg text-outline-variant flex items-center justify-center opacity-40">2</div>
                  <div className="h-9 rounded-lg text-outline-variant flex items-center justify-center opacity-40">3</div>
                  <div className="h-9 rounded-lg text-outline-variant flex items-center justify-center opacity-40">4</div>
                  <div className="h-9 rounded-lg text-outline-variant flex items-center justify-center opacity-40">5</div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    정기청소 방문일
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    가전 분해살균
                  </span>
                </div>
              </div>

              {/* 4-2. Real-time Operation Statistics Card (KPI Overview) */}
              <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm flex flex-col gap-space-sm border border-surface-container">
                <div className="flex items-center justify-between pb-space-xs">
                  <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
                    실시간 시공 관제 현황
                  </h3>
                  <span className="text-on-surface-variant font-label-sm text-label-sm">오늘 기준</span>
                </div>

                <div className="grid grid-cols-2 gap-space-sm">
                  <div className="p-3 rounded-lg bg-surface-container-low flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">배차 수락 대기</span>
                    <span className="font-headline-md text-headline-md text-primary font-extrabold mt-1">
                      {pendingDispatch ? 1 : 0} <span className="text-body-sm font-normal text-on-surface-variant">건</span>
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-low flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">이번 주 예정 작업</span>
                    <span className="font-headline-md text-headline-md text-on-surface font-extrabold mt-1">
                      {stats.thisWeekCount} <span className="text-body-sm font-normal text-on-surface-variant">건</span>
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-low flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">시공 검수 진행 중</span>
                    <span className="font-headline-md text-headline-md text-on-tertiary-container font-extrabold mt-1">
                      {stats.inspectingCount} <span className="text-body-sm font-normal text-on-surface-variant">건</span>
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-surface-container-low flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">평균 시공 만족도</span>
                    <span className="font-headline-md text-headline-md text-secondary font-extrabold mt-1">
                      {stats.avgRating} <span className="text-body-sm font-normal text-on-surface-variant">/5.0</span>
                    </span>
                  </div>
                </div>

                {/* Total Expected Settlement Box */}
                <div className="mt-space-xs p-space-sm rounded-lg bg-primary text-on-primary flex flex-col gap-1 shadow-sm">
                  <span className="font-label-sm text-label-sm text-primary-fixed">이번 달 총 예상 정산액</span>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display-mobile text-display-mobile font-extrabold tracking-tight">
                      {stats.monthlyExpectedSettlement.toLocaleString()} <span className="text-body-lg font-normal">원</span>
                    </span>
                    <span className="font-label-sm text-label-sm text-secondary-container font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      에스크로 익일 100%
                    </span>
                  </div>
                </div>
              </div>

              {/* 4-3. Partner Work Guidelines & Emergency Hotline */}
              <div className="rounded-xl bg-surface-container-lowest p-space-md shadow-sm flex flex-col gap-space-sm border border-surface-container">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">security</span>
                  <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
                    파트너 필수 시공 수칙
                  </h3>
                </div>

                <ul className="flex flex-col gap-2.5 font-body-sm text-body-sm text-on-surface-variant">
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                      touch_app
                    </span>
                    <span>
                      시공 시작 및 종료 시 모바일 콘솔에서 <strong className="text-on-surface font-semibold">&apos;출발 / 도착 / 완료&apos;</strong> 버튼을 단계별로 반드시 클릭해야 정산이 정상 처리됩니다.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                      add_a_photo
                    </span>
                    <span>
                      작업 전/후 비교 사진을 <strong className="text-on-surface font-semibold">최소 2장 이상 필수 등록</strong>하셔야 고객 비대면 자동 검수 승인이 개시됩니다.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                      shield_with_heart
                    </span>
                    <span>
                      현장 대물 손상 발생 시 자체 협의하지 마시고 즉시 관제센터로 사고 접수해 주시기 바랍니다.
                    </span>
                  </li>
                </ul>

                {/* Hotline CTA Bar */}
                <div className="mt-space-xs p-space-sm rounded-lg bg-surface-container flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      24시간 긴급 관제 핫라인
                    </span>
                    <span className="font-label-lg text-label-lg text-primary font-extrabold">
                      1588-0000 (ARS 2번)
                    </span>
                  </div>
                  <button
                    onClick={() => alert('카카오 @쓸고닦고파트너 1:1 관제 채널로 연결됩니다.')}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-on-secondary hover:bg-secondary/90 font-label-sm text-label-sm font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">headset_mic</span>
                    <span>카카오 즉시 관제</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-surface-container-low mt-space-xl shadow-[0_-1px_6px_rgba(22,59,102,0.03)]">
        <div className="max-w-[1280px] mx-auto px-margin-desktop py-space-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-lg pb-space-lg">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-primary font-bold">SsulDak</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">파트너 비즈니스 관제센터</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold">
                  <span className="material-symbols-outlined text-[14px]">verified_user</span>
                  에스크로 정산 안전보증
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                (주)쓸고닦고 B2B 관제본부 | 대표이사: 사업부총괄 | 사업자등록번호: 220-88-00000 | 통신판매업신고: 제2024-서울강남-0000호
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                서울특별시 강남구 테헤란로 케어센터 타워 14층 | 개인정보보호책임자: 파트너사업국
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-1">
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                24시간 파트너 긴급 관제 핫라인
              </span>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">support_agent</span>
                <span className="font-headline-md text-headline-md text-primary font-extrabold tracking-tight">
                  1588-0000
                </span>
                <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface font-label-sm text-label-sm font-bold">
                  ARS 2번
                </span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px]">
                현장 분쟁/오더 취소/안전 사고 365일 즉각 응대
              </span>
            </div>
          </div>

          <div className="pt-space-md flex flex-col sm:flex-row items-center justify-between gap-space-sm border-t border-surface-container">
            <div className="flex flex-wrap items-center gap-space-md">
              <a className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface font-bold transition-colors" href="#">
                파트너 운영규약
              </a>
              <a className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                시공품질 및 패널티 정책
              </a>
              <a className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                개인정보처리방침
              </a>
              <a className="font-label-md text-label-md text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                현장안전보건 수칙
              </a>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
              © 2024 SsulDak Cleaning Partner Console. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* CONFIRM DISPATCH SUCCESS MODAL */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 sm:p-8 flex flex-col gap-5 shadow-2xl animate-fade-in text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/15 text-secondary mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="font-headline-md text-headline-md text-primary font-extrabold">
                배차가 최종 확정되었습니다!
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                고객 안심번호가 개설되었으며, 1:1 고객 상담 채팅방이 열렸습니다.
              </p>
            </div>

            <div className="bg-surface-container-low p-4 rounded-xl flex flex-col gap-2.5 text-left">
              <div className="flex items-center justify-between font-label-md text-label-md">
                <span className="text-on-surface-variant">확정 계약 번호</span>
                <span className="font-mono font-bold text-primary">{confirmModal.contractNo}</span>
              </div>
              <div className="flex items-center justify-between font-label-md text-label-md">
                <span className="text-on-surface-variant">고객 안심 가상번호</span>
                <span className="font-mono font-bold text-secondary text-headline-sm">{confirmModal.safeTelNo}</span>
              </div>
              <div className="flex items-center justify-between font-label-md text-label-md pt-1 border-t border-surface-container">
                <span className="text-on-surface-variant">첫 방문 일정</span>
                <span className="font-semibold text-on-surface">2026.11.01(일) 오전 09:00</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setConfirmModal({ show: false, contractNo: '', safeTelNo: '' });
                  if (onNavigate) {
                    onNavigate('PTNR-JOB-02', { contractNo: confirmModal.contractNo });
                  } else {
                    alert('1:1 고객 상담 채팅방으로 이동합니다.');
                  }
                }}
                className="flex-1 py-3 bg-secondary hover:bg-secondary/90 text-on-secondary rounded-xl font-label-md text-label-md font-bold shadow-md transition-all cursor-pointer"
                type="button"
              >
                1:1 고객채팅 열기
              </button>

              <button
                onClick={() => setConfirmModal({ show: false, contractNo: '', safeTelNo: '' })}
                className="flex-1 py-3 bg-primary hover:bg-primary-container text-on-primary rounded-xl font-label-md text-label-md font-bold shadow-md transition-all cursor-pointer"
                type="button"
              >
                작업 목록 확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
