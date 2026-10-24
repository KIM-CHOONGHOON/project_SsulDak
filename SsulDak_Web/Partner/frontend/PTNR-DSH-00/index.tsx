import React, { useState, useEffect, useCallback } from 'react';

/**
 * PTNR-DSH-00: 파트너 메인 대시보드 (React + TypeScript)
 * 
 * 아키텍처 규칙:
 * - 물리적 격리: SsulDak_Web/Partner/frontend/PTNR-DSH-00/
 * - 1:1 매핑 백엔드: POST /api/partner/ptnr_dsh_00
 * - 전용 SQL: PTNR-DSH-00-SQL-001 ~ PTNR-DSH-00-SQL-005
 */

interface PtnrDsh00Props {
  ptnrNo?: string;
  onNavigate?: (screen: string, params?: any) => void;
  onLogout?: () => void;
}

export const PtnrDsh00Screen: React.FC<PtnrDsh00Props> = ({
  ptnrNo = 'P20261000001',
  onNavigate,
  onLogout
}) => {
  // 파트너 정보 & 운영 상태
  const [partner, setPartner] = useState({
    ptnrNo: ptnrNo,
    companyNm: '반짝빌라클린',
    ceoNm: '이순신',
    operStatus: 'ON',
    activeStatusYn: 'Y',
    avgRating: 4.96,
    totalWorkCnt: 284,
    activeRegions: '경기 고양시 일산동구 · 서구, 파주시 전역'
  });

  // 핵심 통계 지표
  const [stats, setStats] = useState({
    waitingOrderCnt: 4,
    activeBuildingCnt: 3,
    activeCoupon: {
      couponNo: 'PCP2026100100001',
      campaignNm: '[웰컴 입점] 첫 배차 데이터 이용료 100% 무료 (Free Pass)',
      badgeText: '첫 배차 100% 무료 1장',
      dDayText: 'D-29'
    },
    settlement: {
      monthEstAmt: 3840000,
      monthEstText: '3,840,000',
      completedCnt: 8,
      inspectingCnt: 2
    }
  });

  // 오늘 시공 일정 리스트
  const [todayJobs, setTodayJobs] = useState<any[]>([
    {
      workSeq: 201,
      contractNo: 'CT20261000001',
      roundNo: 2,
      statusCd: 'DEPARTED',
      statusText: '현장 출발 대기',
      timeText: '14:00~16:30',
      badgeText: '시공 1시간 전 알림',
      serviceType: '정기 관리 (2회차)',
      title: '마두동 빌라 계단청소 2회차 (공용부 4개층 + 1층 필로티 주차장)',
      addr: '경기 고양시 일산동구 마두동 789 백마그린빌 101동',
      manager: '이*수 대표 직영',
      equipments: '고압스팀기, 보네트 광택기 지참 완료',
      safeTelNo: '0507-1234-5678'
    },
    {
      workSeq: 202,
      contractNo: 'CT20261000002',
      roundNo: 1,
      statusCd: 'INSPECTING',
      statusText: '검수완료 / D+1 정산대기',
      timeText: '09:30~11:30',
      badgeText: '시공 완료 검수 승인',
      serviceType: '이사 · 입주청소',
      title: '백석동 단독주택 입주 이사 청소 마무리 (전용 34평형)',
      addr: '경기 고양시 일산동구 백석동 1244-3',
      estPayAmt: '정산 예정액: 420,000원 (수수료 공제 완료)',
      rating: '고객 평가: 별점 5.0 (사진 8장 전송 승인됨)'
    }
  ]);

  // 공지사항 리스트
  const [notices, setNotices] = useState<any[]>([
    {
      id: 1,
      category: '동절기 안전시공',
      title: '동절기 결빙 방지 친환경 계단 세정 약품 사용 권고 안내',
      desc: '외부 계단 및 필로티 주차장 청소 시 미끄럼 방지 약품(C-3 규격) 지참 필수입니다.',
      timeAgo: '10분 전'
    },
    {
      id: 2,
      category: '파트너 보호정책',
      title: '고객 일방 취소(노쇼) 시 파트너 위약금 100% 보장 규정',
      desc: '현장 도착 후 고객 부재 및 단순 변심 시 시공비 전액 에스크로 즉시 정산됩니다.',
      timeAgo: '어제'
    }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg(null);
    }, 2800);
  };

  const nav = (path: string, params?: any) => {
    if (onNavigate) {
      onNavigate(path, params);
    } else {
      window.location.hash = path;
    }
  };

  // 대시보드 데이터 백엔드 조회
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/partner/ptnr_dsh_00', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'GET_DASHBOARD_DATA',
          ptnrNo
        })
      });

      const resData = await res.json();
      if (res.ok && resData.success) {
        if (resData.partner) setPartner(resData.partner);
        if (resData.stats) setStats(resData.stats);
        if (resData.todayJobs) setTodayJobs(resData.todayJobs);
        if (resData.notices) setNotices(resData.notices);
      }
    } catch (err: any) {
      console.error('PTNR-DSH-00 fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [ptnrNo]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // 영업 상태 ON/OFF 토글 (낙관적 업데이트 적용)
  const handleToggleOperStatus = async () => {
    const isCurrentlyOn = partner.operStatus === 'ON';
    const nextStatus = isCurrentlyOn ? 'OFF' : 'ON';
    const nextActiveYn = isCurrentlyOn ? 'N' : 'Y';

    // 1. 낙관적 업데이트 (즉시 UI 반영)
    setPartner(prev => ({
      ...prev,
      operStatus: nextStatus,
      activeStatusYn: nextActiveYn
    }));

    showToast(nextStatus === 'ON' 
      ? '영업 상태가 [영업 중(ON)]으로 전환되었습니다.' 
      : '영업 상태가 [영업 일시 중단(OFF)]으로 전환되었습니다.');

    try {
      const res = await fetch('/api/partner/ptnr_dsh_00', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'TOGGLE_OPER_STATUS',
          ptnrNo: partner.ptnrNo,
          operStatus: nextStatus
        })
      });

      const resData = await res.json();
      if (!res.ok || !resData.success) {
        // 실패 시 원복
        setPartner(prev => ({
          ...prev,
          operStatus: isCurrentlyOn ? 'ON' : 'OFF',
          activeStatusYn: isCurrentlyOn ? 'Y' : 'N'
        }));
        showToast('영업 상태 변경에 실패하여 이전 상태로 복구되었습니다.');
      }
    } catch (err: any) {
      // 오류 시 원복
      setPartner(prev => ({
        ...prev,
        operStatus: isCurrentlyOn ? 'ON' : 'OFF',
        activeStatusYn: isCurrentlyOn ? 'Y' : 'N'
      }));
      showToast('네트워크 오류가 발생했습니다.');
    }
  };

  const isOperOn = partner.operStatus === 'ON';

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col">
      {/* ================= GNB HEADER ================= */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.06)] border-b border-surface-container">
        <div className="h-20 w-full px-4 sm:px-6 lg:px-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => nav('#partner-dashboard')}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[26px]">cleaning_services</span>
                <span className="font-headline-sm font-bold text-primary tracking-tight text-xl">SsulDak</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-[11px] uppercase tracking-wider font-bold">
                PARTNER CONSOLE
              </span>
            </div>

            <div className="h-6 w-px bg-outline-variant/40 hidden xl:block"></div>

            <div className="hidden xl:flex items-center gap-3 bg-surface-container-low px-3.5 py-1.5 rounded-xl border border-surface-container">
              <span className="font-label-md text-on-surface font-bold text-sm">{partner.companyNm}</span>
              <div className="flex items-center gap-1.5 bg-surface-container-lowest px-2.5 py-1 rounded-full shadow-[0_1px_4px_rgba(22,59,102,0.04)]">
                <span className={`w-2 h-2 rounded-full ${isOperOn ? 'bg-secondary animate-pulse' : 'bg-outline'}`}></span>
                <span className={`font-label-sm text-[11px] font-bold ${isOperOn ? 'text-secondary' : 'text-on-surface-variant'}`}>
                  {isOperOn ? '영업 중 (ON)' : '영업 종료 (OFF)'}
                </span>
              </div>
            </div>
          </div>

          {/* GNB Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => nav('#partner-dashboard')}
              className="px-4 py-2 rounded-xl font-label-md text-sm transition-all bg-primary-container text-on-primary font-bold shadow-xs"
            >
              홈
            </button>
            <button
              onClick={() => nav('#partner-orders')}
              className="px-4 py-2 rounded-xl font-label-md text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
            >
              공고목록 / 오더수신
            </button>
            <button
              onClick={() => nav('#partner-jobs')}
              className="px-4 py-2 rounded-xl font-label-md text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
            >
              작업관리 / 시공보고
            </button>
            <button
              onClick={() => nav('#partner-settlement')}
              className="px-4 py-2 rounded-xl font-label-md text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
            >
              정산/혜택관리
            </button>
            <button
              onClick={() => nav('#partner-profile-settings')}
              className="px-4 py-2 rounded-xl font-label-md text-sm text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
            >
              프로필/지역설정
            </button>
          </nav>

          {/* Right Utilities */}
          <div className="flex items-center gap-4">
            <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low border border-surface-container">
              <span className="material-symbols-outlined text-secondary text-[18px]">headset_mic</span>
              <div className="flex flex-col">
                <span className="font-label-sm text-on-surface-variant leading-none text-[11px]">긴급 핫라인</span>
                <span className="font-label-md text-on-surface font-bold text-xs">1588-0000</span>
              </div>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotiDropdown(prev => !prev)}
                className="relative flex items-center justify-center p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error font-label-sm text-[10px] flex items-center justify-center font-bold">
                  4
                </span>
              </button>

              {showNotiDropdown && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-surface-container-lowest p-4 shadow-2xl border border-surface-container z-50 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                    <span className="font-bold text-sm text-primary">실시간 알림 (4건)</span>
                    <button 
                      onClick={() => setShowNotiDropdown(false)}
                      className="text-on-surface-variant hover:text-on-surface text-xs"
                    >
                      닫기
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-lg bg-surface-container-low">
                      <span className="font-bold text-secondary">[긴급 매칭]</span> 고양 마두동 빌라 견적 요청 1건 수신
                    </div>
                    <div className="p-2 rounded-lg bg-surface-container-low">
                      <span className="font-bold text-primary">[시공 알림]</span> 오늘 14:00 계단청소 1시간 전입니다.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-outline-variant/40 hidden sm:block"></div>

            {/* User Profile */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="font-label-md text-on-surface font-bold leading-tight text-xs">{partner.ceoNm} 대표</span>
                <span className="font-label-sm text-on-surface-variant leading-tight text-[11px]">마스터 파트너</span>
              </div>
              <button 
                onClick={() => {
                  if (onLogout) onLogout();
                  else nav('#partner-login');
                }}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                title="로그아웃" 
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="w-full pt-24 bg-background flex-1">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 py-6 flex flex-col gap-6">
          {/* Top Welcome & Live Operation Controller Banner */}
          <section className="w-full bg-surface-container-lowest rounded-2xl shadow-sm p-6 lg:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden border border-surface-container">
            <div className="absolute -right-12 -bottom-12 w-80 h-80 rounded-full bg-primary/5 pointer-events-none blur-3xl"></div>

            <div className="flex flex-col gap-3 z-10">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-headline-lg text-2xl md:text-3xl font-extrabold text-primary tracking-tight">
                  {partner.companyNm}
                </span>
                <span className="font-label-md text-on-surface-variant font-medium text-sm">
                  (대표 {partner.ceoNm})
                </span>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 shadow-sm border border-amber-200">
                  <span className="material-symbols-outlined text-amber-600 text-[18px]">verified</span>
                  <span className="font-label-sm font-bold tracking-wide text-xs">
                    국세청 · 5억 책임보험 인증 마스터 파트너
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-on-surface-variant text-sm">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">near_me</span>
                  <span className="font-body-md text-sm">
                    활동권역: <strong className="text-on-surface font-semibold">{partner.activeRegions}</strong>
                  </span>
                </div>
                <span className="text-outline-variant font-light">|</span>
                <div className="flex items-center gap-1.5 text-on-surface-variant text-sm">
                  <span className="material-symbols-outlined text-amber-500 text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-label-md font-bold text-on-surface text-sm">{partner.avgRating.toFixed(2)}</span>
                  <span className="font-body-sm text-xs text-on-surface-variant">(누적 시공 {partner.totalWorkCnt}건)</span>
                </div>
              </div>
            </div>

            {/* Live Toggle Controller & Quick Toggles */}
            <div className="flex flex-wrap items-center gap-4 z-10">
              {/* Live Status Switcher Pill */}
              <div className="flex items-center gap-3.5 bg-surface-container-low px-4 py-2.5 rounded-2xl border border-surface-container transition-all">
                <div className="flex flex-col text-left">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isOperOn ? 'bg-secondary animate-pulse' : 'bg-outline'}`}></span>
                    <span className={`font-label-lg text-sm font-bold ${isOperOn ? 'text-secondary' : 'text-on-surface-variant'}`}>
                      {isOperOn ? '영업 중 (ON)' : '영업 일시 중단 (OFF)'}
                    </span>
                  </div>
                  <span className="font-body-sm text-[12px] text-on-surface-variant leading-tight">
                    {isOperOn ? '실시간 배차 알림 정상 수신 중' : '신규 매칭 오더 수신이 일시 보류 중입니다'}
                  </span>
                </div>

                <button 
                  type="button"
                  aria-pressed={isOperOn}
                  onClick={handleToggleOperStatus}
                  className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out p-0.5 focus:outline-none ${isOperOn ? 'bg-secondary' : 'bg-outline'}`}
                >
                  <span 
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-surface-container-lowest shadow-md ring-0 transition duration-200 ease-in-out ${isOperOn ? 'translate-x-7' : 'translate-x-0'}`}
                  />
                </button>
              </div>

              {/* Quick Status Indicators */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => nav('#partner-orders')}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-label-md text-xs hover:bg-surface-container transition-colors border border-surface-container"
                  title="긴급 배차 필터 조정"
                >
                  <span className="material-symbols-outlined text-primary text-[19px]">bolt</span>
                  <span>긴급 배차: 자동수신</span>
                </button>
                <div className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 text-secondary font-label-md text-xs border border-emerald-200 font-semibold">
                  <span className="material-symbols-outlined text-[19px]">smartphone</span>
                  <span>기사앱 동기화 정상</span>
                </div>
              </div>
            </div>
          </section>

          {/* Core Status Metrics Cards (4 Columns) */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
            {/* Card 1: 신규 매칭 대기 공고 */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-5 relative overflow-hidden group hover:shadow-md transition-shadow border border-surface-container">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">
                    <span className="material-symbols-outlined text-[26px]">notifications_active</span>
                  </div>
                  <div>
                    <span className="font-label-sm text-on-surface-variant font-bold tracking-wider text-[11px]">NEW MATCH</span>
                    <h2 className="font-headline-sm text-on-surface font-bold text-base">신규 매칭 대기</h2>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-50 text-primary font-label-sm font-bold text-xs border border-blue-200">실시간</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-extrabold text-primary tracking-tight">
                    {stats.waitingOrderCnt}
                  </span>
                  <span className="font-headline-sm text-on-surface font-bold text-lg">건</span>
                </div>
                <p className="font-body-sm text-on-surface-variant text-xs">설정 반경(고양/파주) 맞춤 요청 대기 중</p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => nav('#partner-orders')}
                  className="w-full py-2.5 px-3 rounded-xl bg-surface-container-low text-primary font-label-md text-xs flex items-center justify-between group-hover:bg-primary group-hover:text-on-primary transition-all font-bold"
                >
                  <span>신규 공고 확인 및 견적 제출</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Card 2: 진행 중 정기 관리 */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-5 group hover:shadow-md transition-shadow border border-surface-container">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-surface-container text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[26px]">domain</span>
                  </div>
                  <div>
                    <span className="font-label-sm text-on-surface-variant font-bold tracking-wider text-[11px]">SUBSCRIPTION</span>
                    <h2 className="font-headline-sm text-on-surface font-bold text-base">진행 중 정기 관리</h2>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-secondary font-label-sm font-bold text-xs border border-emerald-200">정상 가동</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-extrabold text-on-surface tracking-tight">
                    {stats.activeBuildingCnt}
                  </span>
                  <span className="font-headline-sm text-on-surface font-bold text-lg">개 건물</span>
                </div>
                <p className="font-body-sm text-on-surface-variant text-xs">마두동 백마빌라 외 2곳 (이번 주 6회차)</p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => nav('#partner-jobs')}
                  className="w-full py-2.5 px-3 rounded-xl bg-surface-container-low text-primary font-label-md text-xs flex items-center justify-between group-hover:bg-primary group-hover:text-on-primary transition-all font-bold"
                >
                  <span>관리 빌라 목록 조회</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Card 3: 보유 배차지원 쿠폰 */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-5 group hover:shadow-md transition-shadow border border-surface-container">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[26px]">confirmation_number</span>
                  </div>
                  <div>
                    <span className="font-label-sm text-on-surface-variant font-bold tracking-wider text-[11px]">BENEFITS</span>
                    <h2 className="font-headline-sm text-on-surface font-bold text-base">배차지원 쿠폰</h2>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-label-sm text-[10px] font-bold">
                  {stats.activeCoupon?.dDayText || 'D-29'}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-extrabold text-on-surface tracking-tight">1</span>
                  <span className="font-headline-sm text-on-surface font-bold text-lg">장</span>
                  <span className="ml-1 text-[11px] px-2 py-0.5 bg-emerald-50 text-secondary font-bold rounded-md border border-emerald-200">
                    수수료 0원
                  </span>
                </div>
                <p className="font-body-sm text-on-surface-variant text-xs">첫 배차 100% 무료 웰컴 패스 (~11.30)</p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => nav('#partner-settlement')}
                  className="w-full py-2.5 px-3 rounded-xl bg-surface-container-low text-primary font-label-md text-xs flex items-center justify-between group-hover:bg-primary group-hover:text-on-primary transition-all font-bold"
                >
                  <span>보유 쿠폰함 확인</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Card 4: 이번 달 정산 예정액 */}
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-5 group hover:shadow-md transition-shadow border border-surface-container">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[26px]">account_balance_wallet</span>
                  </div>
                  <div>
                    <span className="font-label-sm text-on-surface-variant font-bold tracking-wider text-[11px]">SETTLEMENT</span>
                    <h2 className="font-headline-sm text-on-surface font-bold text-base">정산 예정액</h2>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-surface-container text-primary font-label-sm text-xs font-bold">
                  에스크로 D+1
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-1">
                  <span className="font-headline-lg text-2xl md:text-[26px] font-extrabold text-secondary tracking-tight">
                    {stats.settlement.monthEstText}
                  </span>
                  <span className="font-headline-sm text-on-surface font-bold text-lg">원</span>
                </div>
                <p className="font-body-sm text-on-surface-variant text-xs">
                  완료 {stats.settlement.completedCnt}건 정산 완료 · 검수대기 {stats.settlement.inspectingCnt}건
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => nav('#partner-settlement')}
                  className="w-full py-2.5 px-3 rounded-xl bg-surface-container-low text-primary font-label-md text-xs flex items-center justify-between group-hover:bg-primary group-hover:text-on-primary transition-all font-bold"
                >
                  <span>정산 내역서 · 입금계좌</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </section>

          {/* Main Section: Today's Job Timeline & Work Management */}
          <section className="w-full bg-surface-container-lowest rounded-2xl p-6 lg:p-8 shadow-sm flex flex-col gap-6 border border-surface-container">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-surface-container">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-secondary"></div>
                <h2 className="font-headline-md font-bold text-on-surface text-lg md:text-xl">
                  오늘의 시공 일정 <span className="text-on-surface-variant font-normal text-sm md:text-base">(오늘 배정 일정)</span>
                </h2>
                <span className="px-3 py-1 rounded-full bg-primary-container text-on-primary font-label-sm font-bold text-xs">
                  총 {todayJobs.length}건 배정
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-secondary">gps_fixed</span>
                <span>시공 지연 방지 실시간 GPS 체크인 기능 활성화 중</span>
              </div>
            </div>

            {/* Timeline Items Stack */}
            <div className="flex flex-col gap-5">
              {todayJobs.map((job, idx) => {
                const isActiveJob = idx === 0;

                return (
                  <div
                    key={job.workSeq || idx}
                    className={`w-full rounded-2xl p-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-shadow border ${
                      isActiveJob 
                        ? 'bg-surface-container-low border-surface-container hover:shadow-md' 
                        : 'bg-surface-container-lowest border-surface-container'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      {/* Time Badge Box */}
                      <div className={`flex lg:flex-col items-center justify-center rounded-2xl px-5 py-3.5 lg:w-36 text-center shrink-0 shadow-xs ${
                        isActiveJob 
                          ? 'bg-primary-container text-on-primary' 
                          : 'bg-surface-container text-on-surface-variant'
                      }`}>
                        <span className="font-label-sm uppercase tracking-wider text-[11px] opacity-80">
                          {isActiveJob ? 'NEXT JOB' : 'COMPLETED'}
                        </span>
                        <span className="font-headline-sm font-extrabold leading-tight mt-0.5 text-base">
                          {job.timeText}
                        </span>
                        <span className={`text-[11px] font-bold mt-1 ${isActiveJob ? 'text-secondary-container' : 'text-secondary'}`}>
                          {job.badgeText}
                        </span>
                      </div>

                      {/* Job Content */}
                      <div className="flex flex-col gap-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className={`px-2.5 py-1 rounded-md font-label-sm text-xs font-bold flex items-center gap-1 ${
                            isActiveJob 
                              ? 'bg-secondary text-on-secondary' 
                              : 'bg-emerald-100 text-secondary'
                          }`}>
                            {isActiveJob && <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>}
                            {!isActiveJob && <span className="material-symbols-outlined text-[15px]">check_circle</span>}
                            {job.statusText}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-md bg-surface-container-highest text-primary font-label-sm text-xs font-semibold">
                            {job.serviceType}
                          </span>
                          <h3 className="font-headline-sm font-bold text-on-surface truncate text-base">
                            {job.title}
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-on-surface-variant text-xs">
                          <span className="flex items-center gap-1 text-on-surface font-semibold">
                            <span className="material-symbols-outlined text-[17px] text-primary">location_on</span>
                            {job.addr}
                          </span>
                          {job.manager && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[17px] text-secondary">person_check</span>
                              담당: <strong>{job.manager}</strong>
                            </span>
                          )}
                          {job.equipments && (
                            <span className="flex items-center gap-1 text-on-surface-variant">
                              <span className="material-symbols-outlined text-[17px] text-primary">handyman</span>
                              준비: {job.equipments}
                            </span>
                          )}
                          {job.estPayAmt && (
                            <span className="flex items-center gap-1 text-secondary font-bold">
                              <span className="material-symbols-outlined text-[17px]">payments</span>
                              {job.estPayAmt}
                            </span>
                          )}
                          {job.rating && (
                            <span className="flex items-center gap-1 text-on-surface-variant">
                              <span className="material-symbols-outlined text-[17px] text-amber-500">verified</span>
                              {job.rating}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 shrink-0">
                      {isActiveJob ? (
                        <>
                          <button 
                            type="button"
                            onClick={() => showToast(`고객 안심번호 ${job.safeTelNo || '0507-1234-5678'} 통화 연결`)}
                            className="px-4 py-3 rounded-xl bg-surface-container text-primary font-label-md text-xs flex items-center gap-2 hover:bg-surface-container-high transition-colors font-bold"
                          >
                            <span className="material-symbols-outlined text-[18px]">call</span>
                            <span>고객 안심통화 (0507)</span>
                          </button>
                          <button 
                            type="button"
                            onClick={() => nav('#partner-jobs')}
                            className="px-5 py-3 rounded-xl bg-primary text-on-primary font-label-md text-xs flex items-center gap-2 shadow-sm hover:bg-primary-container transition-all font-bold"
                          >
                            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                            <span>작업관리 · 시공 전 사진 등록</span>
                          </button>
                        </>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => nav('#partner-jobs')}
                          className="px-5 py-3 rounded-xl bg-surface-container text-primary font-label-md text-xs flex items-center gap-2 hover:bg-surface-container-high transition-colors font-bold"
                        >
                          <span className="material-symbols-outlined text-[18px]">description</span>
                          <span>시공 보고서 조회</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Two-Column Bottom Row: Quick Action Hub & Guidelines */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Quick Action Hub & Management (7 cols) */}
            <section className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-6 lg:p-8 shadow-sm flex flex-col gap-6 border border-surface-container">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-primary text-[24px]">dashboard_customize</span>
                  <h2 className="font-headline-sm font-bold text-on-surface text-base md:text-lg">파트너 운영 관리 허브</h2>
                </div>
                <span className="font-label-sm text-on-surface-variant text-xs">플릿 설정 · 작업자 관리</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Hub Card 1 */}
                <button
                  type="button"
                  onClick={() => nav('#partner-profile-settings')}
                  className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col justify-between gap-3 group text-left border border-surface-container"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-lowest text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-[22px]">map</span>
                    </div>
                    <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">chevron_right</span>
                  </div>
                  <div>
                    <h3 className="font-label-lg font-bold text-on-surface mb-1 text-sm">지역 · 전문분야 설정</h3>
                    <p className="font-body-sm text-on-surface-variant text-xs line-clamp-2">
                      고양시 일산동구, 일산서구, 파주시 3개 구역 타겟팅 활성
                    </p>
                  </div>
                </button>

                {/* Hub Card 2 */}
                <button
                  type="button"
                  onClick={() => nav('#partner-profile-settings')}
                  className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col justify-between gap-3 group text-left border border-surface-container"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-lowest text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-[22px]">badge</span>
                    </div>
                    <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">chevron_right</span>
                  </div>
                  <div>
                    <h3 className="font-label-lg font-bold text-on-surface mb-1 text-sm">파트너 프로필 · 장비 관리</h3>
                    <p className="font-body-sm text-on-surface-variant text-xs line-clamp-2">
                      사업자 정보, 위생관리 전문자격, 보유 장비 실사진 등록
                    </p>
                  </div>
                </button>

                {/* Hub Card 3 */}
                <button
                  type="button"
                  onClick={() => nav('#partner-settlement')}
                  className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col justify-between gap-3 group text-left border border-surface-container"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-lowest text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-[22px]">bar_chart</span>
                    </div>
                    <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">chevron_right</span>
                  </div>
                  <div>
                    <h3 className="font-label-lg font-bold text-on-surface mb-1 text-sm">매출 및 정산 통계</h3>
                    <p className="font-body-sm text-on-surface-variant text-xs line-clamp-2">
                      월별 정산 추이, 세금계산서 발행 내역, 안전 에스크로 계좌
                    </p>
                  </div>
                </button>

                {/* Hub Card 4 */}
                <button
                  type="button"
                  onClick={() => showToast('기사 PIN 및 보조 작업자 관리 모달')}
                  className="p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all flex flex-col justify-between gap-3 group text-left border border-surface-container"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-lowest text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                      <span className="material-symbols-outlined text-[22px]">group_add</span>
                    </div>
                    <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">chevron_right</span>
                  </div>
                  <div>
                    <h3 className="font-label-lg font-bold text-on-surface mb-1 text-sm">기사 PIN · 보조 작업자 배정</h3>
                    <p className="font-body-sm text-on-surface-variant text-xs line-clamp-2">
                      현장 팀원 2명 등록 상태 (일산 1팀 김*석, 박*진)
                    </p>
                  </div>
                </button>
              </div>

              {/* Weekly Performance Sparkline Inline Banner */}
              <div className="mt-2 p-4 rounded-xl bg-surface-container flex items-center justify-between gap-4 border border-surface-container-high">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary text-[24px]">trending_up</span>
                  <div>
                    <span className="font-label-md font-bold text-on-surface text-xs md:text-sm">이번 주 정시 착수율 100% 달성</span>
                    <p className="font-body-sm text-on-surface-variant text-xs">지난 7일간 고객 컴플레인 0건 및 100% 클린 피드백</p>
                  </div>
                </div>
                {/* Sparkline Mini SVG */}
                <svg className="w-28 h-8 text-secondary overflow-visible" fill="none" viewBox="0 0 120 30">
                  <path d="M 0 25 L 20 22 L 40 18 L 60 12 L 80 15 L 100 6 L 120 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"></path>
                  <circle cx="120" cy="4" fill="currentColor" r="3.5"></circle>
                </svg>
              </div>
            </section>

            {/* Right Column: 파트너 공지 및 안심 운영 가이드 (5 cols) */}
            <section className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-6 lg:p-8 shadow-sm flex flex-col justify-between gap-6 border border-surface-container">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-600 text-[22px]">campaign</span>
                    <h2 className="font-headline-sm font-bold text-on-surface text-base">파트너 안심 공지 · 규정</h2>
                  </div>
                  <button 
                    type="button"
                    onClick={() => showToast('공지사항 전체보기')}
                    className="font-label-sm text-primary hover:underline text-xs"
                  >
                    전체보기
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  {notices.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => showToast(n.title)}
                      className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors flex flex-col gap-1 cursor-pointer border border-surface-container"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded font-label-sm text-[11px] font-bold ${
                          n.id === 1 ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-primary'
                        }`}>
                          {n.category}
                        </span>
                        <span className="font-body-sm text-[12px] text-outline">{n.timeAgo}</span>
                      </div>
                      <h4 className="font-label-md text-on-surface font-semibold text-xs mt-0.5">{n.title}</h4>
                      <p className="font-body-sm text-on-surface-variant text-[11px] line-clamp-1">{n.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 24H Partner Hotline Box */}
              <div className="p-4 rounded-xl bg-primary text-on-primary flex flex-col gap-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary-container text-[22px]">headset_mic</span>
                    <span className="font-label-md font-bold text-xs md:text-sm">파트너 전담 24시 관제 긴급 핫라인</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary font-label-sm text-[10px] font-bold">
                    24H 대기
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex flex-col">
                    <span className="font-headline-md font-extrabold text-secondary-container tracking-wide text-xl">1588-0000</span>
                    <span className="font-body-sm text-on-primary-container text-xs">현장 비상, 장비 고장, 고객 민원 즉시 대응</span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => showToast('카카오톡 파트너 전담 상담원 연결')}
                    className="px-3.5 py-2 rounded-lg bg-surface-container-lowest text-primary font-label-sm text-xs font-bold hover:bg-surface-container transition-colors"
                  >
                    카카오톡 전용 문의
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="w-full bg-surface-container-low text-on-surface-variant py-8 shadow-[0_-1px_8px_rgba(22,59,102,0.03)] border-t border-surface-container mt-12">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-12 flex flex-col gap-6 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-surface-container">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">verified_user</span>
                <span className="font-label-md text-on-surface font-bold text-xs">쓸고닦고 공인 플릿 파트너사 보증 시스템</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">shield</span>
                <span className="font-label-md text-on-surface font-bold text-xs">100% 에스크로 익일 정산 보장</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-label-sm text-on-surface-variant">파트너 24시간 긴급 기술지원:</span>
              <span className="font-label-md text-primary font-bold">1588-0000 (ARS 2번)</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-on-surface font-bold text-xs">(주)쓸고닦고 파트너 엔터프라이즈 사업본부</span>
              <span className="font-body-sm text-on-surface-variant text-[11px]">
                사업자등록번호: 214-88-99012 | 통신판매업신고: 2024-서울강남-04121호 | 클리닝 안전책임배상보험 5억원 가입
              </span>
              <span className="font-body-sm text-on-surface-variant text-[11px]">
                © 2026 SsulDak Fleet Operations Network. All rights reserved.
              </span>
            </div>

            <div className="flex items-center gap-4 font-label-sm text-xs">
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#partner-rules">파트너 운영규약</a>
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#fees">정산 수수료 안내</a>
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#privacy">개인정보처리방침</a>
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#control">긴급 관제센터</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ================= TOAST ================= */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-900 text-white font-label-md text-xs shadow-xl flex items-center gap-2 animate-bounce-short">
          <span className="material-symbols-outlined text-[18px] text-secondary-fixed">info</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};

export default PtnrDsh00Screen;
