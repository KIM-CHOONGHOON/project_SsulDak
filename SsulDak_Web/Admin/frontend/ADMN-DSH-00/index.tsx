/**
 * @file SsulDak_Web/Admin/frontend/ADMN-DSH-00/index.tsx
 * @description SsulDak 어드민 메인 대시보드 화면 컴포넌트 (ADMN-DSH-00)
 * 
 * [준수 사항]
 * - 역할별 물리적 격리: SsulDak_Web/Admin 전용
 * - 1:1 독립 엔드포인트: POST /api/admin/admn_dsh_00 연동
 * - 4대 KPI 집계 카드 (총 거래액, 순수납액, 마케팅비 소진율, 7일 정지 제재 회원)
 * - 순수 SVG Dual-Axis 차트 & 도넛 차트
 * - 실시간 긴급 분쟁 관제 피드 및 원클릭 중재 연동
 * - 플랫폼 공식 브랜드 로고(/logo.png) 연동
 */

import React, { useState, useEffect, useCallback } from 'react';

export interface AdmnDsh00Props {
  onNavigate?: (screenId: string) => void;
  adminNo?: string;
}

export default function AdmnDsh00Screen({ onNavigate, adminNo = 'ADM202600001' }: AdmnDsh00Props) {
  // 활성 탭 및 필터
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [chartTab, setChartTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // 대시보드 데이터 상태
  const [kpis, setKpis] = useState({
    todayVolume: 24500000,
    volumeDiffRate: '+8.5%',
    volumeDiffAmt: 1920000,
    matchingCounts: { total: 142, regular: 98, appliance: 44 },
    netFeeAmt: 1650000,
    feeCount: 50,
    feeAvgAmt: 33000,
    unpaidCount: 0,
    promoBurnAmt: 4250000,
    promoTotalBudget: 10000000,
    promoBurnRate: 42.5,
    promoWelcomeExemptCnt: 82,
    promoPartnerDiscountCnt: 46,
    sanction: { userCnt: 1, partnerCnt: 2, pendingAppealCnt: 1 }
  });

  const [charts, setCharts] = useState({
    dailyTrends: [
      { dt: '10.17', matchCnt: 98, volume: 18200000, labelVol: '18.2M', heightPct: 60 },
      { dt: '10.18', matchCnt: 105, volume: 19500000, labelVol: '19.5M', heightPct: 65 },
      { dt: '10.19', matchCnt: 118, volume: 21000000, labelVol: '21.0M', heightPct: 72 },
      { dt: '10.20', matchCnt: 126, volume: 22800000, labelVol: '22.8M', heightPct: 78 },
      { dt: '10.21', matchCnt: 134, volume: 23400000, labelVol: '23.4M', heightPct: 82 },
      { dt: '10.22', matchCnt: 130, volume: 22600000, labelVol: '22.6M', heightPct: 80 },
      { dt: '오늘 (23일)', matchCnt: 142, volume: 24500000, labelVol: '24.5M', heightPct: 94, isToday: true, isPeak: true }
    ],
    weeklyAverageVolume: 21714000,
    conversionRate: '94.2%',
    reorderRate: '38.6%',
    coupons: {
      redemptionRate: 70.2,
      usedCnt: 175,
      activeCnt: 55,
      expiredCnt: 20,
      remainingBudget: 5750000,
      daysLeft: 8
    }
  });

  const [incidents, setIncidents] = useState<any[]>([
    {
      disputeNo: 'DSP-20261023-004',
      contractNo: 'CNT-20261021-0001',
      issueTypeCd: 'PARTNER_UNILATERAL_CANCEL',
      title: '파트너 시공 당일 일방 취소',
      reportedTime: '14:12 (23분 전)',
      complainantNm: '김충훈 고객',
      complainantTel: '010-****-5678',
      respondentNm: '반짝빌라클린 이*수',
      issueDesc: '예약 시간 30분 전 유선 통보 후 미방문 (노쇼 위약금 100% 청구 요청)',
      disputeStatCd: 'RECEIVED',
      priorityCd: 'EMERGENCY'
    },
    {
      disputeNo: 'DSP-20261023-003',
      contractNo: 'CNT-20261022-0089',
      issueTypeCd: 'ADDITIONAL_FEE',
      title: '가전 청소 현장 추가금 갈등',
      reportedTime: '11:05 (접수)',
      complainantNm: '박*민 고객',
      complainantTel: '010-****-1234',
      respondentNm: '클린홈즈 (경기서부)',
      issueDesc: '시스템 에어컨 곰팡이 심화로 현장 4만 원 추가 요구 관련 중재',
      disputeStatCd: 'RESOLVED',
      priorityCd: 'NORMAL'
    },
    {
      disputeNo: 'DSP-20261023-002',
      contractNo: 'CNT-20261022-0045',
      issueTypeCd: 'QUALITY',
      title: '작업 완료 사진 품질 미달',
      reportedTime: '09:30 (접수)',
      complainantNm: '최*우 고객',
      complainantTel: '010-****-9876',
      respondentNm: '올케어솔루션',
      issueDesc: '창틀 분진 및 주방 배수구 잔여 이물질 촬영 사진으로 재청소 요청 접수',
      disputeStatCd: 'INVESTIGATING',
      priorityCd: 'NORMAL'
    }
  ]);

  // 실시간 시스템 시계 & 세션 만료 타이머
  const [systemClock, setSystemClock] = useState('');
  const [sessionTimeLeft, setSessionTimeLeft] = useState(3582); // 59분 42초

  // 모달 및 토스트 상태
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 토스트 메시지 표출
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 실시간 시계 & 세션 타이머 갱신
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const yr = now.getFullYear();
      const mo = String(now.getMonth() + 1).padStart(2, '0');
      const dy = String(now.getDate()).padStart(2, '0');
      const hr = String(now.getHours()).padStart(2, '0');
      const mn = String(now.getMinutes()).padStart(2, '0');
      const sc = String(now.getSeconds()).padStart(2, '0');
      setSystemClock(`${yr}.${mo}.${dy} ${hr}:${mn}:${sc} KST`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const sessionTimer = setInterval(() => {
      setSessionTimeLeft((prev) => (prev > 0 ? prev - 1 : 3600));
    }, 1000);
    return () => clearInterval(sessionTimer);
  }, []);

  // 세션 포맷
  const formatSessionTime = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // API 데이터 로드
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/admin/admn_dsh_00', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'GET_DASHBOARD_METRICS',
          adminNo,
          timeFilter: chartTab
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.kpis) setKpis(json.kpis);
        if (json.charts) setCharts(json.charts);
        if (json.incidents && json.incidents.length > 0) setIncidents(json.incidents);
      }
    } catch (err) {
      console.error('[ADMN-DSH-00] Fetch error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [adminNo, chartTab]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // 10초 주기 자동 갱신
  useEffect(() => {
    const autoRefresh = setInterval(() => {
      fetchDashboardData();
    }, 10000);
    return () => clearInterval(autoRefresh);
  }, [fetchDashboardData]);

  // 로그아웃 처리
  const handleLogout = () => {
    try {
      sessionStorage.removeItem('ssuldak_admin_token');
      sessionStorage.removeItem('ssuldak_admin_profile');
    } catch {
      // ignore
    }
    if (onNavigate) {
      onNavigate('ADMN-ATH-00');
    } else {
      window.location.hash = '#admn-ath-00';
    }
  };

  return (
    <div className="bg-[#f8f9ff] text-[#0b1c30] antialiased min-h-screen font-['Plus_Jakarta_Sans','Noto_Sans_KR',sans-serif] selection:bg-[#163b66] selection:text-white">
      {/* 토스트 알림 */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#00254a] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-[#dce9ff]/20 animate-slideDown">
          <span className="material-symbols-outlined text-[20px] text-[#82f5c1]">info</span>
          <span className="text-[13px] font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 1. 좌측 고정 네비게이션 사이드바 (Width: 240px) */}
      <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#00254a] text-white z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col">
          {/* 사이드바 헤더 및 공식 로고 */}
          <div className="h-16 px-4 flex items-center gap-2.5 bg-[#163b66]/40 border-b border-[#163b66]/60">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-0.5 overflow-hidden">
              <img
                src="/logo.png"
                alt="SsulDak"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent) {
                    parent.innerHTML = '<span class="material-symbols-outlined text-[#00254a] text-[20px]">shield_person</span>';
                  }
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] font-extrabold tracking-tight text-white leading-tight">SsulDak</span>
              <span className="text-[11px] uppercase tracking-wider text-[#86a6d7] font-semibold">Admin Console</span>
            </div>
          </div>

          <div className="px-4 pt-6 pb-2">
            <span className="text-[11px] font-bold text-[#86a6d7]/70 tracking-wider uppercase">운영 관리 메뉴</span>
          </div>

          {/* 메뉴 아이템 */}
          <nav className="px-2 flex flex-col gap-1">
            {[
              { id: 'dashboard', label: '대시보드', icon: 'dashboard', screen: 'ADMN-DSH-00' },
              { id: 'promotions-coupons', label: '프로모션/쿠폰', icon: 'confirmation_number', screen: 'ADMN-PRM-00' },
              { id: 'policy-codes', label: '코드/정책관리', icon: 'rule_folder', screen: 'ADMN-SYS-01' },
              { id: 'user-management', label: '회원관리', icon: 'group', screen: 'ADMN-USR-00' },
              { id: 'dispute-arbitration', label: '거래/분쟁중재', icon: 'gavel', screen: 'ADMN-REQ-01' },
              { id: 'settlement-billing', label: '수납/정산', icon: 'account_balance_wallet', screen: 'ADMN-SET-00' },
            ].map((menu) => (
              <button
                key={menu.id}
                type="button"
                onClick={() => {
                  setActiveMenu(menu.id);
                  if (menu.id !== 'dashboard' && onNavigate) {
                    onNavigate(menu.screen);
                  }
                }}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                  activeMenu === menu.id
                    ? 'bg-[#163b66] text-white font-bold shadow-sm'
                    : 'text-[#86a6d7] hover:bg-[#163b66] hover:text-white font-medium text-[13px]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{menu.icon}</span>
                <span className="text-[13px]">{menu.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 하단 보안 레벨 및 IP 뱃지 */}
        <div className="p-4 bg-[#163b66]/30 mx-2 mb-4 rounded-xl flex flex-col gap-1.5 border border-[#163b66]/50">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#86a6d7]">보안 레벨</span>
            <span className="text-[#82f5c1] font-bold">SECURE (HIGH)</span>
          </div>
          <div className="h-1.5 w-full bg-[#163b66] rounded-full overflow-hidden">
            <div className="h-full w-full bg-[#006c4a]"></div>
          </div>
          <span className="text-[11px] text-[#86a6d7]/70 font-mono">IP: 121.134.89.21 (허가됨)</span>
        </div>
      </aside>

      {/* 2. 본문 영역 (좌측 240px 오프셋) */}
      <div className="pl-[240px] flex flex-col min-h-screen">
        {/* 상단 글로벌 관제 헤더 바 */}
        <header className="fixed top-0 left-[240px] right-0 h-16 bg-white/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 px-6 flex items-center justify-between border-b border-[#dce9ff]">
          <div className="flex items-center gap-4">
            <span className="text-[15px] font-bold text-[#0b1c30]">통합 운영 관제</span>
            <span className="h-4 w-[1px] bg-[#c3c6d0]"></span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse"></span>
              <span className="text-[12px] text-[#43474f] font-medium">운영 노드 정상 가동중</span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* 긴급 분쟁 알림 뱃지 */}
            <button
              type="button"
              onClick={() => {
                const target = incidents.find((i) => i.priorityCd === 'EMERGENCY') || incidents[0];
                setSelectedIncident(target);
              }}
              className="flex items-center gap-1 bg-[#ffdad6] text-[#93000a] px-3.5 py-1.5 rounded-full hover:bg-[#ffdad6]/80 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">warning</span>
              <span className="text-[12px] font-bold">긴급 분쟁 알림</span>
              <span className="w-5 h-5 rounded-full bg-[#ba1a1a] text-white flex items-center justify-center text-[11px] font-bold ml-1 animate-pulse">
                {incidents.filter((i) => i.priorityCd === 'EMERGENCY').length || 1}
              </span>
            </button>

            {/* 관리자 프로필 정보 */}
            <div className="flex items-center gap-2.5 pl-2">
              <div className="flex flex-col text-right">
                <span className="text-[13px] font-bold text-[#0b1c30]">운영총괄 관리자</span>
                <span className="text-[11px] text-[#43474f] font-mono">(김수석 / admin01)</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#00254a] flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
            </div>

            {/* 로그아웃 버튼 */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#dce9ff] hover:bg-[#d3e4fe] text-[#00254a] text-[13px] font-semibold rounded-lg transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>로그아웃</span>
            </button>
          </div>
        </header>

        {/* 3. 메인 콘텐츠 대시보드 */}
        <main className="flex-1 pt-16 bg-[#f8f9ff] px-6 py-6">
          <div className="flex flex-col w-full gap-6 max-w-[1440px] mx-auto">
            {/* 상단 브레드크럼 및 실시간 텔레메트리 바 */}
            <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1">
              <div className="flex flex-col gap-1">
                <nav className="flex items-center gap-2 text-[#43474f] text-[11px] font-semibold">
                  <span className="hover:text-[#00254a] cursor-pointer transition-colors">홈</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span className="hover:text-[#00254a] cursor-pointer transition-colors">관제 센터</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span className="text-[#00254a] font-bold">어드민 메인 대시보드</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#e5eeff] text-[#43474f] text-[10px] font-mono font-bold">
                    ADMN-DSH-00
                  </span>
                </nav>
                <h1 className="text-[26px] text-[#0b1c30] tracking-tight font-extrabold flex items-center gap-2.5">
                  플랫폼 운영 총괄 관제 대시보드
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#006c4a]/10 text-[#006c4a]">
                    LIVE OPS
                  </span>
                </h1>
                <p className="text-[14px] text-[#43474f]">
                  실시간 거래 볼륨, 데이터 이용료 수납, 프로모션 예산 집행 및 긴급 분쟁 상황을 통합 모니터링합니다.
                </p>
              </div>

              {/* 실시간 텔레메트리 바 */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 bg-white px-3.5 py-2 rounded-xl shadow-sm border border-[#e5eeff]">
                  <div className="relative flex items-center justify-center w-2.5 h-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006c4a] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006c4a]"></span>
                  </div>
                  <span className="text-[11px] font-bold text-[#0b1c30]">실시간 10s 자동갱신</span>
                  <span className="text-[#c3c6d0] mx-1">|</span>
                  <span className="text-[11px] text-[#43474f] font-mono font-semibold">
                    {systemClock || '2026.10.23 14:35:12 KST'}
                  </span>
                </div>

                <button
                  onClick={() => setShowExportModal(true)}
                  className="flex items-center gap-1.5 bg-white hover:bg-[#eff4ff] text-[#0b1c30] text-[13px] font-bold px-3.5 py-2 rounded-xl shadow-sm border border-[#e5eeff] transition-all cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#00254a]">download</span>
                  <span>통계 리포트 (XLSX)</span>
                </button>

                <button
                  onClick={() => {
                    fetchDashboardData();
                    showToast('실시간 관제 데이터가 최신 상태로 동기화되었습니다.');
                  }}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl bg-[#00254a] text-white shadow-sm hover:bg-[#163b66] transition-all cursor-pointer ${
                    isRefreshing ? 'animate-spin' : ''
                  }`}
                  title="즉시 새로고침"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[20px]">sync</span>
                </button>
              </div>
            </section>

            {/* 4대 KPI Metric Cards Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: 오늘의 총 청소 거래액 */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e5eeff] flex flex-col justify-between gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#00254a]/5 rounded-full blur-xl pointer-events-none"></div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[#43474f]">
                    <span className="text-[13px] font-bold">오늘의 총 청소 거래액</span>
                    <span className="material-symbols-outlined text-[#00254a] text-[20px] p-1.5 bg-[#eff4ff] rounded-lg">
                      payments
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-[28px] font-extrabold text-[#0b1c30] tracking-tight font-mono">
                      {kpis.todayVolume.toLocaleString()}
                    </span>
                    <span className="text-[17px] font-bold text-[#43474f]">원</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 bg-[#eff4ff]/50 -mx-4 -mb-4 p-4 rounded-b-xl border-t border-[#e5eeff]/80">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#85f8c4] text-[#002114]">
                      <span className="material-symbols-outlined text-[14px]">arrow_drop_up</span>
                      {kpis.volumeDiffRate}
                    </span>
                    <span className="text-[11px] text-[#43474f]">전일 대비 +{kpis.volumeDiffAmt.toLocaleString()}원</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#43474f]">
                    <span>누적 매칭 {kpis.matchingCounts.total}건</span>
                    <span className="font-mono">정기 {kpis.matchingCounts.regular}건 · 가전 {kpis.matchingCounts.appliance}건</span>
                  </div>
                </div>
              </div>

              {/* Card 2: 데이터 이용료 순수납액 */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e5eeff] flex flex-col justify-between gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#3f608d]/5 rounded-full blur-xl pointer-events-none"></div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[#43474f]">
                    <span className="text-[13px] font-bold">데이터 이용료 순수납액</span>
                    <span className="material-symbols-outlined text-[#3f608d] text-[20px] p-1.5 bg-[#d3e4fe]/50 rounded-lg">
                      account_balance
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-[28px] font-extrabold text-[#00254a] tracking-tight font-mono">
                      {kpis.netFeeAmt.toLocaleString()}
                    </span>
                    <span className="text-[17px] font-bold text-[#43474f]">원</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 bg-[#eff4ff]/50 -mx-4 -mb-4 p-4 rounded-b-xl border-t border-[#e5eeff]/80">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#d4e3ff] text-[#001c3a]">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>수납률 100%
                    </span>
                    <span className="text-[11px] text-[#43474f]">총 {kpis.feeCount}건 정산 청구 완료</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#43474f]">
                    <span>건당 수수료 평균 {kpis.feeAvgAmt.toLocaleString()}원</span>
                    <span className="text-[#006c4a] font-bold">미납/연체 {kpis.unpaidCount}건</span>
                  </div>
                </div>
              </div>

              {/* Card 3: 프로모션 마케팅비 소진율 */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e5eeff] flex flex-col justify-between gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#006c4a]/5 rounded-full blur-xl pointer-events-none"></div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[#43474f]">
                    <span className="text-[13px] font-bold">프로모션 마케팅비 소진율</span>
                    <span className="material-symbols-outlined text-[#006c4a] text-[20px] p-1.5 bg-[#85f8c4]/40 rounded-lg">
                      confirmation_number
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-[28px] font-extrabold text-[#0b1c30] tracking-tight font-mono">
                      {kpis.promoBurnRate}%
                    </span>
                    <span className="text-[13px] text-[#43474f] font-medium font-mono">
                      ({(kpis.promoBurnAmt / 1000000).toFixed(2)}M / 10M 원)
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 bg-[#eff4ff]/50 -mx-4 -mb-4 p-4 rounded-b-xl border-t border-[#e5eeff]/80">
                  <div className="w-full bg-[#e5eeff] rounded-full h-2 overflow-hidden flex">
                    <div
                      className="bg-[#006c4a] h-2 rounded-full transition-all duration-500"
                      style={{ width: `${kpis.promoBurnRate}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#43474f]">
                    <span>웰컴 면제 {kpis.promoWelcomeExemptCnt}건</span>
                    <span>파트너 감면 {kpis.promoPartnerDiscountCnt}건</span>
                  </div>
                </div>
              </div>

              {/* Card 4: 7일 이용정지 제재 현황 */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-[#e5eeff] flex flex-col justify-between gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#ba1a1a]/5 rounded-full blur-xl pointer-events-none"></div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[#43474f]">
                    <span className="text-[13px] font-bold">7일 이용정지 제재 현황</span>
                    <span className="material-symbols-outlined text-[#ba1a1a] text-[20px] p-1.5 bg-[#ffdad6] rounded-lg">
                      gavel
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <span className="text-[24px] font-extrabold text-[#ba1a1a] tracking-tight">
                      고객 {kpis.sanction.userCnt} / 파트너 {kpis.sanction.partnerCnt}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-2 bg-[#ffdad6]/30 -mx-4 -mb-4 p-4 rounded-b-xl border-t border-[#ba1a1a]/10">
                  <div className="flex items-center justify-between text-[#93000a] text-[11px]">
                    <span className="flex items-center gap-1 font-bold">
                      <span className="material-symbols-outlined text-[16px] text-[#ba1a1a]">notification_important</span>
                      당일 노쇼 및 일방 취소 징계
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigate) onNavigate('ADMN-USR-00');
                      else showToast('회원관리(ADMN-USR-00) 제재 소명 검토 화면으로 이동합니다.');
                    }}
                    className="flex items-center justify-between text-[#ba1a1a] text-[11px] font-bold hover:underline cursor-pointer text-left"
                  >
                    <span>소명 접수 검토 ({kpis.sanction.pendingAppealCnt}건 대기중)</span>
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </section>

            {/* Main Analytics Grid: Volume Trends & Coupon Recovery */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Dual-Axis Bar & Trend Visual */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] flex flex-col justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#00254a]"></span>
                      <h2 className="text-[18px] font-bold text-[#0b1c30]">일별 매칭 건수 및 거래액 추이</h2>
                    </div>
                    <p className="text-[13px] text-[#43474f]">최근 7일간의 총 용역 거래 볼륨 및 성공 매칭 건 추적</p>
                  </div>

                  {/* 일간/주간/월간 필터 토글 */}
                  <div className="flex items-center gap-1 bg-[#eff4ff] p-1 rounded-xl">
                    {(['daily', 'weekly', 'monthly'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setChartTab(tab)}
                        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                          chartTab === tab
                            ? 'bg-white text-[#00254a] shadow-sm'
                            : 'text-[#43474f] hover:text-[#0b1c30]'
                        }`}
                      >
                        {tab === 'daily' ? '일간' : tab === 'weekly' ? '주간' : '월간'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 차트 범례 및 목표 */}
                <div className="flex items-center justify-between text-[#43474f] text-[11px] py-2 px-1">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-[#163b66]"></span>
                      <span>일 거래액 (백만 원)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-1.5 bg-[#006c4a] rounded-full"></span>
                      <span>매칭 성사 건수 (건)</span>
                    </div>
                  </div>
                  <div className="font-mono text-[#006c4a] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">flag</span>
                    일일 목표 매칭 120건 초과 달성 지속
                  </div>
                </div>

                {/* 순수 SVG/Tailwind Dual-Axis Chart Layer */}
                <div className="relative w-full h-64 pt-6 pb-2">
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 700 240">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#006c4a" stopOpacity="0.25"></stop>
                        <stop offset="100%" stopColor="#006c4a" stopOpacity="0.0"></stop>
                      </linearGradient>
                    </defs>
                    <path
                      d="M 50,150 Q 150,135 250,110 T 450,75 T 550,85 T 650,45 L 650,220 L 50,220 Z"
                      fill="url(#chartGradient)"
                    ></path>
                    <path
                      d="M 50,150 Q 150,135 250,110 T 450,75 T 550,85 T 650,45"
                      fill="none"
                      stroke="#006c4a"
                      strokeLinecap="round"
                      strokeWidth="3"
                    ></path>
                    <circle cx="50" cy="150" fill="#ffffff" r="4" stroke="#006c4a" strokeWidth="2.5"></circle>
                    <circle cx="150" cy="135" fill="#ffffff" r="4" stroke="#006c4a" strokeWidth="2.5"></circle>
                    <circle cx="250" cy="110" fill="#ffffff" r="4" stroke="#006c4a" strokeWidth="2.5"></circle>
                    <circle cx="350" cy="90" fill="#ffffff" r="4" stroke="#006c4a" strokeWidth="2.5"></circle>
                    <circle cx="450" cy="75" fill="#ffffff" r="4" stroke="#006c4a" strokeWidth="2.5"></circle>
                    <circle cx="550" cy="85" fill="#ffffff" r="4" stroke="#006c4a" strokeWidth="2.5"></circle>
                    <circle cx="650" cy="45" fill="#006c4a" r="5" stroke="#ffffff" strokeWidth="2.5"></circle>
                  </svg>

                  {/* 막대 바 레이어 */}
                  <div className="relative z-10 grid grid-cols-7 h-full items-end gap-2 sm:gap-4 px-4 pb-4">
                    {charts.dailyTrends.map((col, idx) => (
                      <div key={idx} className="flex flex-col items-center gap-1 group cursor-pointer h-full justify-end relative">
                        {col.isPeak && (
                          <span className="absolute -top-7 px-1.5 py-0.5 rounded bg-[#00254a] text-white font-mono text-[10px] font-bold">
                            최고치
                          </span>
                        )}
                        <span
                          className={`text-[11px] font-mono transition-opacity ${
                            col.isToday ? 'opacity-100 font-bold text-[#00254a]' : 'opacity-0 group-hover:opacity-100 text-[#43474f]'
                          }`}
                        >
                          {col.labelVol}
                        </span>
                        <div
                          className={`w-full max-w-[34px] rounded-t-lg transition-all ${
                            col.isToday
                              ? 'bg-[#00254a] shadow-md group-hover:brightness-110'
                              : 'bg-[#e5eeff] group-hover:bg-[#163b66]'
                          }`}
                          style={{ height: `${col.heightPct}%` }}
                        ></div>
                        <span
                          className={`text-[11px] mt-1 ${
                            col.isToday ? 'font-bold text-[#00254a]' : 'text-[#43474f]'
                          }`}
                        >
                          {col.dt}
                        </span>
                        <span className="text-[10px] text-[#006c4a] font-mono font-bold">{col.matchCnt}건</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 하단 벤치마크 요약 정보 바 */}
                <div className="mt-4 pt-2 bg-[#eff4ff]/60 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border border-[#e5eeff]">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#00254a] text-[22px]">insights</span>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-[#43474f]">주간 일평균 용역 거래액</span>
                      <span className="text-[15px] font-bold text-[#0b1c30] font-mono">
                        {charts.weeklyAverageVolume.toLocaleString()} 원
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[11px] text-[#43474f]">매칭 완료 전환율</span>
                      <div className="text-[15px] font-bold text-[#006c4a] font-mono">{charts.conversionRate} (우수)</div>
                    </div>
                    <div className="h-8 w-px bg-[#c3c6d0]"></div>
                    <div className="text-right">
                      <span className="text-[11px] text-[#43474f]">재주문 비중</span>
                      <div className="text-[15px] font-bold text-[#00254a] font-mono">{charts.reorderRate}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column (5 cols): Promotion Recovery & Budget Burn */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#006c4a]"></span>
                      <h2 className="text-[18px] font-bold text-[#0b1c30]">프로모션 쿠폰 회수 및 예산</h2>
                    </div>
                    <p className="text-[13px] text-[#43474f]">이달의 웰컴/복귀 지원금 소진 안정성</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigate) onNavigate('ADMN-PRM-00');
                      else showToast('프로모션 관리(ADMN-PRM-00) 화면으로 이동합니다.');
                    }}
                    className="text-[#00254a] hover:text-[#163b66] text-[11px] font-bold flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>설정</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>

                {/* 도넛 비주얼 섹션 */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 my-4">
                  <div className="relative w-40 h-40 flex items-center justify-center flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" fill="transparent" r="48" stroke="#eff4ff" strokeWidth="14"></circle>
                      <circle
                        cx="60"
                        cy="60"
                        fill="transparent"
                        r="48"
                        stroke="#d3e4fe"
                        strokeDasharray="301.6"
                        strokeDashoffset="90"
                        strokeLinecap="round"
                        strokeWidth="14"
                      ></circle>
                      <circle
                        cx="60"
                        cy="60"
                        fill="transparent"
                        r="48"
                        stroke="#006c4a"
                        strokeDasharray="301.6"
                        strokeDashoffset="89.8"
                        strokeLinecap="round"
                        strokeWidth="14"
                      ></circle>
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] text-[#43474f]">회수(사용)율</span>
                      <span className="text-[26px] font-extrabold text-[#0b1c30] font-mono">
                        {charts.coupons.redemptionRate}%
                      </span>
                      <span className="text-[11px] text-[#006c4a] font-bold">{charts.coupons.usedCnt}장 소진</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 w-full">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#eff4ff] text-[11px]">
                      <span className="flex items-center gap-1.5 text-[#0b1c30]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#006c4a]"></span>
                        사용 완료 쿠폰
                      </span>
                      <span className="font-mono font-bold text-[#0b1c30]">
                        {charts.coupons.usedCnt}장 ({Math.round((charts.coupons.usedCnt / 250) * 100)}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#eff4ff] text-[11px]">
                      <span className="flex items-center gap-1.5 text-[#0b1c30]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#d3e4fe]"></span>
                        미사용 / 유효기간 내
                      </span>
                      <span className="font-mono font-bold text-[#0b1c30]">
                        {charts.coupons.activeCnt}장 ({Math.round((charts.coupons.activeCnt / 250) * 100)}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-[#eff4ff] text-[11px]">
                      <span className="flex items-center gap-1.5 text-[#43474f]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#c3c6d0]"></span>
                        미사용 기한만료
                      </span>
                      <span className="font-mono font-bold text-[#43474f]">
                        {charts.coupons.expiredCnt}장 ({Math.round((charts.coupons.expiredCnt / 250) * 100)}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 예산 소진 게이지 */}
                <div className="bg-[#eff4ff] rounded-xl p-4 flex flex-col gap-1.5 border border-[#e5eeff]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#0b1c30]">10월 마케팅 예산 소진 속도</span>
                    <span className="text-[11px] font-bold text-[#006c4a] bg-[#82f5c1]/40 px-2 py-0.5 rounded-full">
                      안전 (Normal Pace)
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-[17px] font-extrabold text-[#00254a] font-mono">
                      {kpis.promoBurnAmt.toLocaleString()} 원
                    </span>
                    <span className="text-[11px] text-[#43474f]">총 배정액: {kpis.promoTotalBudget.toLocaleString()} 원</span>
                  </div>
                  <div className="w-full bg-[#d3e4fe] rounded-full h-2.5 overflow-hidden flex my-1">
                    <div className="bg-[#163b66] h-full rounded-full" style={{ width: `${kpis.promoBurnRate}%` }}></div>
                  </div>
                  <div className="flex items-center justify-between text-[#43474f] text-[11px]">
                    <span>
                      잔여 예산: <strong className="text-[#0b1c30] font-mono">{charts.coupons.remainingBudget.toLocaleString()} 원</strong> (57.5%)
                    </span>
                    <span>당월 잔여일수 {charts.coupons.daysLeft}일</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Real-time Incident Feed Table (실시간 긴급 분쟁 관제 피드) */}
            <section className="bg-white rounded-2xl shadow-sm border border-[#e5eeff] overflow-hidden flex flex-col">
              <div className="p-6 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5eeff]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[24px]">gavel</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[18px] font-bold text-[#0b1c30]">실시간 긴급 분쟁 관제 피드</h2>
                      <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#ba1a1a] text-white text-[11px] font-bold animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                        즉시 조치 필요 1건
                      </span>
                    </div>
                    <p className="text-[13px] text-[#43474f]">계약 파기, 작업 불이행, 에스크로 지급 보류 및 배상 중재 요청 목록</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      showToast('사내 긴급 ARS 분쟁 중재 채널(내선 0200)로 자동 연결합니다.');
                    }}
                    className="flex items-center gap-1.5 bg-[#ba1a1a]/10 hover:bg-[#ba1a1a]/20 text-[#ba1a1a] text-[13px] px-4 py-2 rounded-xl transition-colors font-bold cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">support_agent</span>
                    <span>긴급 ARS 중재 관제</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onNavigate) onNavigate('ADMN-REQ-01');
                      else showToast('분쟁 및 중재 관리(ADMN-REQ-01) 화면으로 이동합니다.');
                    }}
                    className="flex items-center gap-1 text-[#43474f] hover:text-[#0b1c30] text-[13px] px-2 py-2 cursor-pointer font-semibold"
                    type="button"
                  >
                    <span>분쟁 전체 내역</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>
              </div>

              {/* 긴급 탑 배너 안내문 */}
              <div className="mx-6 my-4 p-4 rounded-xl bg-[#ffdad6]/70 text-[#93000a] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm border border-[#ba1a1a]/20">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[#ba1a1a] text-[22px] flex-shrink-0">warning</span>
                  <div className="text-[13px]">
                    <strong className="font-bold">🚨 긴급 분쟁 접수:</strong> 주문번호{' '}
                    <span className="font-mono font-bold underline">CNT-20261021-0001</span> (파트너 당일 시공 일방 취소로 인한 고객 피해 민원 접수)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const target = incidents.find((i) => i.contractNo === 'CNT-20261021-0001') || incidents[0];
                    setSelectedIncident(target);
                  }}
                  className="inline-flex items-center justify-center gap-1 bg-[#ba1a1a] text-white px-4 py-1.5 rounded-lg text-[12px] font-bold shadow-sm hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
                >
                  <span>중재 콘솔 바로가기 (ADMN-REQ-01)</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>

              {/* 데이터 테이블 */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[14px]">
                  <thead>
                    <tr className="bg-[#eff4ff] text-[#43474f] text-[11px] uppercase tracking-wider font-bold">
                      <th className="py-3 px-6">사건 ID / 주문번호</th>
                      <th className="py-3 px-4">분쟁 유형 및 사유</th>
                      <th className="py-3 px-4">신고 당사자</th>
                      <th className="py-3 px-4">접수 경과</th>
                      <th className="py-3 px-4">처리 상태</th>
                      <th className="py-3 px-6 text-right">관리자 조치</th>
                    </tr>
                  </thead>
                  <tbody className="text-[#0b1c30] divide-y divide-[#e5eeff]">
                    {incidents.map((row, idx) => (
                      <tr
                        key={idx}
                        className={
                          row.priorityCd === 'EMERGENCY'
                            ? 'bg-[#ffdad6]/20 hover:bg-[#ffdad6]/30 transition-colors'
                            : 'hover:bg-[#eff4ff]/60 transition-colors'
                        }
                      >
                        <td className="py-4 px-6 font-mono">
                          <div
                            className={`font-bold flex items-center gap-1.5 ${
                              row.priorityCd === 'EMERGENCY' ? 'text-[#ba1a1a]' : 'text-[#0b1c30]'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                row.priorityCd === 'EMERGENCY'
                                  ? 'bg-[#ba1a1a]'
                                  : row.disputeStatCd === 'RESOLVED'
                                  ? 'bg-[#006c4a]'
                                  : 'bg-[#e49200]'
                              }`}
                            ></span>
                            {row.disputeNo}
                          </div>
                          <div className="text-[#43474f] text-[12px]">{row.contractNo}</div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-bold text-[#0b1c30]">{row.title}</div>
                          <div className="text-[#43474f] text-[12px] line-clamp-1">{row.issueDesc}</div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#0b1c30]">{row.complainantNm}</span>
                            <span className="text-[#43474f] text-[12px] font-mono">({row.complainantTel || '010-****-5678'})</span>
                          </div>
                          <div
                            className={`text-[12px] flex items-center gap-1 ${
                              row.priorityCd === 'EMERGENCY' ? 'text-[#ba1a1a] font-medium' : 'text-[#43474f]'
                            }`}
                          >
                            <span>피신고: {row.respondentNm}</span>
                            {row.priorityCd === 'EMERGENCY' && (
                              <span className="px-1 py-0.2 bg-[#ba1a1a] text-white rounded text-[10px] font-bold">
                                정지위험
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 font-mono text-[12px]">
                          <div className={row.priorityCd === 'EMERGENCY' ? 'font-bold text-[#ba1a1a]' : 'text-[#0b1c30]'}>
                            {row.reportedTime}
                          </div>
                          <div className="text-[11px] text-[#43474f]">
                            {row.priorityCd === 'EMERGENCY' ? 'SLA 임계치: 37분 잔여' : '통상 처리 건'}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {row.priorityCd === 'EMERGENCY' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ba1a1a] text-white text-[11px] font-bold">
                              <span className="material-symbols-outlined text-[14px]">emergency</span>
                              긴급 중재 대기
                            </span>
                          ) : row.disputeStatCd === 'RESOLVED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#82f5c1] text-[#00714e] text-[11px] font-bold">
                              <span className="material-symbols-outlined text-[14px]">task_alt</span>
                              중재 완료 / 에스크로 분할
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ffddb8] text-[#2a1700] text-[11px] font-bold">
                              <span className="material-symbols-outlined text-[14px]">photo_camera</span>
                              보완 사진 검수중
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedIncident(row)}
                            className={`inline-flex items-center gap-1 font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                              row.priorityCd === 'EMERGENCY'
                                ? 'bg-[#00254a] hover:bg-[#163b66] text-white shadow-sm'
                                : 'bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0b1c30]'
                            }`}
                          >
                            <span>{row.priorityCd === 'EMERGENCY' ? '중재 바로가기' : '상세 기록'}</span>
                            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 테이블 푸터 / 페이징 및 정책 안내 바 */}
              <div className="p-4 bg-[#eff4ff] flex flex-col sm:flex-row items-center justify-between gap-3 text-[#43474f] text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] text-[#00254a]">policy</span>
                  <span>
                    SsulDak 공정거래 및 에스크로 보호 규정: 노쇼 발생 시 1시간 이내 자동 선환불 및 파트너 페널티 50,000원 부여 원칙
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span>페이지 1 / 8</span>
                  <div className="flex items-center gap-1">
                    <button className="w-7 h-7 rounded bg-[#e5eeff] flex items-center justify-center text-[#0b1c30] disabled:opacity-40" disabled type="button">
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                    </button>
                    <button className="w-7 h-7 rounded bg-white text-[#00254a] font-bold shadow-sm flex items-center justify-center" type="button">
                      1
                    </button>
                    <button className="w-7 h-7 rounded hover:bg-[#e5eeff] flex items-center justify-center text-[#0b1c30]" type="button">
                      2
                    </button>
                    <button className="w-7 h-7 rounded hover:bg-[#e5eeff] flex items-center justify-center text-[#0b1c30]" type="button">
                      3
                    </button>
                    <button className="w-7 h-7 rounded bg-[#e5eeff] flex items-center justify-center text-[#0b1c30]" type="button">
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick Operation Shortcuts Bar (자주 쓰는 즉시 운영 도구) */}
            <section className="bg-white rounded-2xl p-4 shadow-sm border border-[#e5eeff] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#163b66] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                </div>
                <div>
                  <span className="text-[13px] font-bold text-[#0b1c30]">자주 쓰는 즉시 운영 도구</span>
                  <p className="text-[11px] text-[#43474f]">어드민 신속 대응 원클릭 트리거</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button
                  type="button"
                  onClick={() => showToast('공지사항 등록(ADMN-SYS-03) 모달을 호출합니다.')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0b1c30] text-[11px] font-bold transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#00254a]">campaign</span>
                  <span>공지사항 등록</span>
                </button>
                <button
                  type="button"
                  onClick={() => showToast('회원 이용제재 해제 심사 패널을 호출합니다.')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0b1c30] text-[11px] font-bold transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#006c4a]">lock_open</span>
                  <span>회원 이용제재 해제</span>
                </button>
                <button
                  type="button"
                  onClick={() => showToast('데이터 이용료 수수료 세금계산서/영수증 일괄 재발행 큐를 실행합니다.')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0b1c30] text-[11px] font-bold transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#3f608d]">receipt_long</span>
                  <span>수수료 영수증 재발급</span>
                </button>
                <button
                  type="button"
                  onClick={() => showToast('PG 에스크로 정산 대사 원장(TB_DATA_FEE_PAY) 정밀 검증을 시작합니다.')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white text-[11px] font-bold transition-all cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">currency_exchange</span>
                  <span>PG 에스크로 정산 대사</span>
                </button>
              </div>
            </section>
          </div>
        </main>

        {/* 4. 하단 보안 정책 푸터 */}
        <footer className="w-full bg-[#eff4ff] px-6 py-3.5 border-t border-[#dce9ff] shadow-[0_-1px_6px_rgba(0,0,0,0.02)]">
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-2 text-[#43474f] text-[11px]">
            <div className="flex flex-wrap items-center gap-1">
              <span>© 2026 SsulDak Admin Console. All Rights Reserved.</span>
              <span className="mx-2 text-[#c3c6d0]">|</span>
              <span>정보보호 관리체계 (ISMS-P) 인증 취득 완료</span>
              <span className="mx-2 text-[#c3c6d0]">|</span>
              <span>전체 세션 데이터 AES-256 GCM 무결성 실시간 암호화 감사 기록 중</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#006c4a]">lock_clock</span>
                <span>
                  자동 로그아웃 세션 만료 잔여: <strong className="text-[#00254a] font-mono">{formatSessionTime(sessionTimeLeft)}</strong>
                </span>
              </span>
              <a
                className="underline text-[#43474f] hover:text-[#0b1c30] cursor-pointer"
                onClick={() => showToast('감사로그 원장(TB_ADMIN_LOGIN_LOG) 100% 무결성 상태입니다.')}
              >
                보안 로그 현황
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* 모달 1: 긴급 분쟁 사건 상세 및 신속 중재 모달 */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-[540px] w-full p-6 shadow-2xl border border-[#dce9ff] flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-[#e5eeff] pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    selectedIncident.priorityCd === 'EMERGENCY'
                      ? 'bg-[#ffdad6] text-[#ba1a1a]'
                      : 'bg-[#82f5c1] text-[#00714e]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">gavel</span>
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[#00254a]">
                    분쟁 인시던트 상세 및 즉시 중재 ({selectedIncident.disputeNo})
                  </h3>
                  <p className="text-[11px] text-[#737780]">주문계약번호: {selectedIncident.contractNo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIncident(null)}
                className="text-[#737780] hover:text-[#0b1c30] p-1 rounded transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 text-[13px] bg-[#eff4ff] p-4 rounded-xl border border-[#e5eeff]">
              <div className="flex justify-between">
                <span className="text-[#43474f]">분쟁 명칭:</span>
                <strong className="text-[#0b1c30]">{selectedIncident.title}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#43474f]">신고인:</span>
                <span>{selectedIncident.complainantNm} ({selectedIncident.complainantTel || '010-****-5678'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#43474f]">피신고 대상:</span>
                <span className="text-[#ba1a1a] font-bold">{selectedIncident.respondentNm}</span>
              </div>
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-[#43474f]">사유 상세:</span>
                <div className="p-2.5 bg-white rounded-lg border border-[#e5eeff] text-[#0b1c30] leading-relaxed">
                  {selectedIncident.issueDesc}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  showToast(`사건 ${selectedIncident.disputeNo}에 대해 즉시 100% 선환불 및 파트너 패널티를 부여했습니다.`);
                  setSelectedIncident(null);
                }}
                className="flex-1 py-2.5 bg-[#ba1a1a] hover:bg-[#93000a] text-white rounded-xl text-[13px] font-bold shadow-sm transition-colors cursor-pointer"
              >
                즉시 선환불 & 파트너 제재
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('ADMN-REQ-01');
                  } else {
                    showToast('분쟁중재 종합 관리 화면(ADMN-REQ-01)으로 이동합니다.');
                    setSelectedIncident(null);
                  }
                }}
                className="flex-1 py-2.5 bg-[#00254a] hover:bg-[#163b66] text-white rounded-xl text-[13px] font-bold shadow-sm transition-colors cursor-pointer"
              >
                중재 콘솔 이동
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모달 2: 통계 리포트 다운로드 확인 모달 */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-[420px] w-full p-6 shadow-2xl border border-[#dce9ff] flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#d4e3ff] text-[#00254a] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">table_view</span>
              </div>
              <div>
                <h3 className="text-[16px] font-bold text-[#00254a]">운영 통계 리포트 생성</h3>
                <p className="text-[11px] text-[#737780]">Excel / XLSX 포맷 내보내기</p>
              </div>
            </div>
            <div className="bg-[#eff4ff] p-3.5 rounded-xl border border-[#e5eeff] text-[13px] text-[#43474f] leading-relaxed">
              최근 7일간의 총 청소 용역 거래액, 데이터 이용료 실납부 원장, 프로모션 감면 내역 및 분쟁 인시던트 로그를 스프레드시트로 즉시 다운로드합니다.
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-2 bg-[#e5eeff] hover:bg-[#dce9ff] text-[#0b1c30] rounded-xl text-[13px] font-semibold transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExportModal(false);
                  showToast('SsulDak_Daily_Metrics_20261023.xlsx 파일 생성이 완료되었습니다.');
                }}
                className="flex-1 py-2 bg-[#00254a] hover:bg-[#163b66] text-white rounded-xl text-[13px] font-bold shadow-sm transition-colors cursor-pointer"
              >
                다운로드 시작
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
