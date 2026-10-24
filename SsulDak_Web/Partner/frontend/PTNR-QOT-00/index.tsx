import React, { useState, useEffect, useMemo } from 'react';

/**
 * SsulDak (쓸고닦고) - PTNR-QOT-00 (매칭 청약 공고 목록)
 * 
 * 물리적 격리: SsulDak_Web/Partner/frontend/PTNR-QOT-00/index.tsx
 * 엔드포인트 URL: POST /api/partner/ptnr_qot_00
 * 연동 화면: PTNR-DSH-00 (메인 대시보드), PTNR-QOT-01 (공고 상세 및 청약 제안)
 */

export interface OrderItem {
  slotNo: string;
  reqNo: string;
  serviceTypeCd: 'REGULAR' | 'APPLIANCE' | 'MOVEIN' | 'SPECIAL' | string;
  categoryLabel: string;
  title: string;
  periodText: string;
  scopeText: string;
  workHoursText?: string;
  proposedAmt: number;
  monthlyAmtText?: string;
  partnerFeeAmt: number;
  canUseFreePass: boolean;
  isNew: boolean;
  dDayText: string;
  remainHours: number;
  remainDays: number;
  isAlreadyBid: boolean;
  addrRoad: string;
  addrDetailMasked: string;
  floorCnt?: number;
  distanceKm: number;
  distanceText: string;
  bidCount: number;
  maxBidCount: number;
  photoUrl: string;
  regDate: string;
  isEmergency?: boolean;
  isExcellentOrder?: boolean;
}

export interface PartnerSettingSummary {
  ptnrNo: string;
  activeRegions: any[];
  activeRegionsText: string;
  serviceTypes: string[];
  serviceTypesText: string;
  dispatchRadiusKm: number;
  urgentDispatchYn: string;
}

export default function PtnrQot00() {
  // 상태 관리
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [freePassCouponCnt, setFreePassCouponCnt] = useState<number>(1);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [regionFilter, setRegionFilter] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [sortOption, setSortOption] = useState<'LATEST' | 'CLOSING_SOON' | 'HIGHEST_AMT' | 'CLOSEST'>('LATEST');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [bookmarkedSlots, setBookmarkedSlots] = useState<Set<string>>(new Set());
  
  // 모달 상태
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [selectedOrderForManual, setSelectedOrderForManual] = useState<OrderItem | null>(null);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 카테고리별 건수 카운트
  const [categoryCounts, setCategoryCounts] = useState({
    ALL: 4,
    REGULAR: 2,
    APPLIANCE: 1,
    MOVEIN: 1,
    SPECIAL: 0
  });

  // 파트너 수신 설정 요약
  const [settingSummary, setSettingSummary] = useState<PartnerSettingSummary>({
    ptnrNo: 'P20261000001',
    activeRegions: [],
    activeRegionsText: '고양시 일산동구/일산서구, 파주시 전역 (반경 10km)',
    serviceTypes: ['REGULAR', 'APPLIANCE'],
    serviceTypesText: '정기청소, 계절가전케어',
    dispatchRadiusKm: 10,
    urgentDispatchYn: 'Y'
  });

  // 토스트 메시지 헬퍼
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // 백엔드 API 연동 데이터 로딩
  const loadOrderFeed = async (isManualRefresh: boolean = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await fetch('/api/partner/ptnr_qot_00', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer DUMMY_PARTNER_JWT_TOKEN'
        },
        body: JSON.stringify({
          actionType: 'GET_ORDER_FEED',
          ptnrNo: 'P20261000001',
          categoryFilter,
          searchKeyword,
          sortOption,
          page: currentPage,
          limit: 10
        })
      });

      if (response.ok) {
        const json = await response.json();
        if (json.success) {
          setOrders(json.orders || []);
          setFreePassCouponCnt(json.freePassCouponCnt || 1);
          if (json.categoryCounts) setCategoryCounts(json.categoryCounts);
          if (json.settingSummary) setSettingSummary(json.settingSummary);
          if (isManualRefresh) showToast('최신 맞춤 공고를 성공적으로 동기화했습니다.');
        }
      } else {
        // Fallback demo data if endpoint unavailable
        console.warn('Backend API returned non-200, using cached realistic state');
      }
    } catch (err) {
      console.error('Failed to load order feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrderFeed();
  }, [categoryFilter, sortOption, currentPage]);

  // 검색어 디바운스 필터링
  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrderFeed();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword]);

  // 북마크 토글 핸들러
  const handleToggleBookmark = (slotNo: string, title: string) => {
    setBookmarkedSlots(prev => {
      const next = new Set(prev);
      if (next.has(slotNo)) {
        next.delete(slotNo);
        showToast('관심 공고 스크랩을 해제했습니다.');
      } else {
        next.add(slotNo);
        showToast(`[${title.slice(0, 16)}...] 관심 공고에 스크랩되었습니다.`);
      }
      return next;
    });
  };

  // 지역 필터링 클라이언트 반영
  const filteredOrders = useMemo(() => {
    return orders.filter(item => {
      if (regionFilter === 'ALL') return true;
      if (regionFilter === 'ILSAN_DONG') return item.addrRoad.includes('일산동구');
      if (regionFilter === 'ILSAN_SEO') return item.addrRoad.includes('일산서구');
      if (regionFilter === 'PAJU') return item.addrRoad.includes('파주');
      return true;
    });
  }, [orders, regionFilter]);

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col">
      {/* 1. Header (Fixed GNB) */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.06)]">
        <div className="h-20 w-full px-margin-desktop flex items-center justify-between gap-space-lg">
          {/* Logo & Console Badge */}
          <div className="flex items-center gap-space-lg">
            <div className="flex items-center gap-space-sm cursor-pointer" onClick={() => window.location.hash = '#partner-dashboard'}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[26px]">cleaning_services</span>
                <span className="font-headline-sm text-headline-sm font-bold text-primary tracking-tight">SsulDak</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm uppercase tracking-wider">
                PARTNER CONSOLE
              </span>
            </div>
            <div className="h-6 w-px bg-outline-variant/40 hidden xl:block"></div>
            <div className="hidden xl:flex items-center gap-space-sm bg-surface-container-low px-3 py-1.5 rounded-xl">
              <span className="font-label-md text-label-md text-on-surface font-semibold">반짝빌라클린</span>
              <div className="flex items-center gap-1.5 bg-surface-container-lowest px-2.5 py-1 rounded-full shadow-[0_1px_4px_rgba(22,59,102,0.04)]">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <span className="font-label-sm text-label-sm text-secondary font-bold">영업 중 (ON)</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-space-xs">
            <a 
              className="px-space-md py-space-sm rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
              href="#partner-dashboard"
            >
              홈
            </a>
            <a 
              className="px-space-md py-space-sm rounded-lg font-label-md text-label-md bg-primary-container text-on-primary font-bold shadow-sm transition-all"
              href="#ptnr-qot-00"
            >
              공고목록 / 오더수신
            </a>
            <a 
              className="px-space-md py-space-sm rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
              href="#partner-jobs"
            >
              작업관리 / 시공보고
            </a>
            <a 
              className="px-space-md py-space-sm rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
              href="#partner-settlement"
            >
              정산/혜택관리
            </a>
            <a 
              className="px-space-md py-space-sm rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
              href="#partner-profile"
            >
              프로필/지역설정
            </a>
          </nav>

          {/* Utility / User Area */}
          <div className="flex items-center gap-space-md">
            <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low">
              <span className="material-symbols-outlined text-secondary text-[18px]">headset_mic</span>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant leading-none">긴급 핫라인</span>
                <span className="font-label-md text-label-md text-on-surface font-bold">1588-0000</span>
              </div>
            </div>
            
            <div className="relative flex items-center justify-center p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface cursor-pointer transition-all" title="알림">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error font-label-sm text-[10px] flex items-center justify-center font-bold">
                4
              </span>
            </div>
            
            <div className="h-6 w-px bg-outline-variant/40 hidden sm:block"></div>
            
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xs shadow-sm">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="font-label-md text-label-md text-on-surface font-bold leading-tight">이수 대표</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">마스터 파트너</span>
              </div>
              <button 
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors" 
                title="로그아웃" 
                type="button"
                onClick={() => showToast('파트너 콘솔에서 안전하게 로그아웃되었습니다.')}
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full pt-20 bg-background min-h-screen flex-1">
        <div className="flex flex-col w-full">
          {/* Sub-Header / Breadcrumb & Status Ribbon */}
          <div className="w-full bg-surface-container-low py-space-sm px-margin-desktop border-b border-surface-container-high/60">
            <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-space-sm">
              <nav className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
                <a className="hover:text-primary transition-colors cursor-pointer" href="#partner-dashboard">홈</a>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <a className="hover:text-primary transition-colors cursor-pointer" href="#partner-dashboard">대시보드 (PTNR-DSH-00)</a>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="hover:text-primary transition-colors">오더 수신 센터</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="text-primary font-bold">매칭 청약 공고 목록</span>
              </nav>
              <div className="flex items-center gap-space-md font-label-sm text-label-sm">
                <div className="flex items-center gap-1.5 text-secondary">
                  <span className="material-symbols-outlined text-[16px]">sensors</span>
                  <span className="font-bold">기사앱 실시간 동기화 정상</span>
                </div>
                <div className="h-3 w-px bg-outline-variant/40"></div>
                <div className="flex items-center gap-1.5 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px]">electric_bolt</span>
                  <span>긴급 배차: <strong className="text-primary font-bold">자동 수신 모드</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full px-margin-desktop py-space-lg">
            <div className="max-w-[1280px] mx-auto flex flex-col gap-space-lg">
              
              {/* Page Headline & Control Ribbon */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-primary text-on-primary font-label-sm text-label-sm uppercase tracking-wide font-bold">
                      MATCHING TENDER
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">PTNR-QOT-00</span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg font-bold text-primary tracking-tight">
                    매칭 청약 공고 목록
                  </h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    설정하신 활동 권역<span className="text-primary font-bold">[{settingSummary.activeRegionsText}]</span> 및 주력 전문분야에 기반한 실시간 맞춤 오더 공고입니다.
                  </p>
                </div>
                
                {/* Realtime status indicator and manual refresh */}
                <div className="flex items-center gap-space-sm bg-surface-container-lowest px-4 py-2.5 rounded-xl shadow-sm border border-surface-container-high/50">
                  <div className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping"></div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1">
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        실시간 신규 공고 {filteredOrders.length}건 수신 중
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">자동 새로고침 ON (30s)</span>
                  </div>
                  <button 
                    className={`ml-2 p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary transition-all flex items-center justify-center active:scale-95 ${refreshing ? 'animate-spin' : ''}`}
                    title="공고 새로고침" 
                    type="button"
                    onClick={() => loadOrderFeed(true)}
                    disabled={refreshing}
                  >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                  </button>
                </div>
              </div>

              {/* Welcome Pass Benefit Banner */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary-container via-primary to-primary-container text-on-primary p-space-md shadow-md">
                <div className="absolute -right-8 -top-8 w-44 h-44 bg-secondary/15 rounded-full blur-2xl pointer-events-none"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-space-md">
                  <div className="flex items-start md:items-center gap-space-sm">
                    <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center flex-shrink-0 shadow-sm">
                      <span className="material-symbols-outlined text-[24px]">celebration</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-label-md text-label-md font-bold text-secondary-fixed">
                          첫 배차 100% 무료 웰컴 패스 쿠폰 {freePassCouponCnt}장 보유
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-tertiary-container text-tertiary-fixed font-label-sm text-label-sm font-bold">
                          유효기간 D-29
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-primary-fixed mt-0.5">
                        이번 공고 청약 시 파트너 데이터 매칭 이용료(33,000원)가 <strong className="text-secondary-fixed font-bold">0원</strong>으로 즉시 자동 감면 적용됩니다.
                      </p>
                    </div>
                  </div>
                  <button 
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container-lowest text-primary font-label-md text-label-md font-bold hover:bg-primary-fixed transition-colors flex-shrink-0 shadow-sm"
                    type="button"
                    onClick={() => setIsCouponModalOpen(true)}
                  >
                    <span>내 보유 쿠폰함 확인</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>

              {/* Advanced Filter & Search Toolbar */}
              <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container-high/50 flex flex-col gap-space-md">
                <div className="flex flex-wrap items-center justify-between gap-space-md">
                  {/* Category Quick Chips */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-label-md text-label-md font-bold text-on-surface mr-1">분야 필터:</span>
                    <button 
                      className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all flex items-center gap-1 ${categoryFilter === 'ALL' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                      type="button"
                      onClick={() => setCategoryFilter('ALL')}
                    >
                      {categoryFilter === 'ALL' && <span className="material-symbols-outlined text-[16px]">check</span>}
                      전체분야 ({categoryCounts.ALL})
                    </button>
                    <button 
                      className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all flex items-center gap-1 ${categoryFilter === 'REGULAR' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                      type="button"
                      onClick={() => setCategoryFilter('REGULAR')}
                    >
                      {categoryFilter === 'REGULAR' && <span className="material-symbols-outlined text-[16px]">check</span>}
                      정기청소 ({categoryCounts.REGULAR})
                    </button>
                    <button 
                      className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all flex items-center gap-1 ${categoryFilter === 'APPLIANCE' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                      type="button"
                      onClick={() => setCategoryFilter('APPLIANCE')}
                    >
                      {categoryFilter === 'APPLIANCE' && <span className="material-symbols-outlined text-[16px]">check</span>}
                      계절가전케어 ({categoryCounts.APPLIANCE})
                    </button>
                    <button 
                      className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all flex items-center gap-1 ${categoryFilter === 'MOVEIN' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                      type="button"
                      onClick={() => setCategoryFilter('MOVEIN')}
                    >
                      {categoryFilter === 'MOVEIN' && <span className="material-symbols-outlined text-[16px]">check</span>}
                      입주/이사 ({categoryCounts.MOVEIN})
                    </button>
                    <button 
                      className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all flex items-center gap-1 ${categoryFilter === 'SPECIAL' ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
                      type="button"
                      onClick={() => setCategoryFilter('SPECIAL')}
                    >
                      {categoryFilter === 'SPECIAL' && <span className="material-symbols-outlined text-[16px]">check</span>}
                      특수청소 ({categoryCounts.SPECIAL})
                    </button>
                  </div>

                  {/* Region Dropdown Selector */}
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <select 
                        className="appearance-none flex items-center gap-2 pl-9 pr-9 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container font-label-md text-label-md text-on-surface font-semibold transition-colors border-none outline-none cursor-pointer"
                        value={regionFilter}
                        onChange={(e) => setRegionFilter(e.target.value)}
                      >
                        <option value="ALL">내 활동 권역 전체 (3개 구역)</option>
                        <option value="ILSAN_DONG">고양시 일산동구</option>
                        <option value="ILSAN_SEO">고양시 일산서구</option>
                        <option value="PAJU">파주시 전역</option>
                      </select>
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px] pointer-events-none">
                        location_on
                      </span>
                      <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none text-outline">
                        expand_more
                      </span>
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-surface-container-high"></div>

                {/* Search Bar and Sorting Rules */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
                  <div className="relative flex-1 max-w-xl">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                      search
                    </span>
                    <input 
                      className="w-full pl-11 pr-8 py-2.5 rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-lowest transition-all"
                      placeholder="건물명, 동/도로명, 단지명 검색 (예: 백마마을, 중앙로 빌라)"
                      type="text"
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                    />
                    {searchKeyword && (
                      <button 
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                        type="button"
                        onClick={() => setSearchKeyword('')}
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">정렬:</span>
                    <div className="flex items-center bg-surface-container-low p-1 rounded-xl">
                      <button 
                        className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all ${sortOption === 'LATEST' ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                        type="button"
                        onClick={() => setSortOption('LATEST')}
                      >
                        최신 등록순
                      </button>
                      <button 
                        className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all ${sortOption === 'CLOSING_SOON' ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                        type="button"
                        onClick={() => setSortOption('CLOSING_SOON')}
                      >
                        마감 임박순
                      </button>
                      <button 
                        className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all ${sortOption === 'HIGHEST_AMT' ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                        type="button"
                        onClick={() => setSortOption('HIGHEST_AMT')}
                      >
                        용역금액 높은순
                      </button>
                      <button 
                        className={`px-3 py-1.5 rounded-lg font-label-sm text-label-sm transition-all ${sortOption === 'CLOSEST' ? 'bg-surface-container-lowest text-primary font-bold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`}
                        type="button"
                        onClick={() => setSortOption('CLOSEST')}
                      >
                        거리 가까운순
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Layout 2-Column: Left (Tender List) + Right (Tender Playbook Sidebar) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
                {/* Left List: Tender Cards (8 cols) */}
                <div className="lg:col-span-8 flex flex-col gap-space-md">
                  {loading && (
                    <div className="p-12 text-center bg-surface-container-lowest rounded-xl shadow-sm flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-label-md text-label-md text-on-surface-variant">
                        실시간 청약 공고 목록을 조회 중입니다...
                      </span>
                    </div>
                  )}

                  {!loading && filteredOrders.length === 0 && (
                    <div className="p-16 text-center bg-surface-container-lowest rounded-2xl shadow-sm border border-surface-container-high/60 flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-surface-container-low flex items-center justify-center text-outline">
                        <span className="material-symbols-outlined text-[36px]">campaign</span>
                      </div>
                      <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        현재 조건에 부합하는 신규 매칭 공고가 없습니다.
                      </h3>
                      <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                        선택하신 분야 또는 지역 필터를 조정하시거나, 파트너 설정에서 활동 권역을 확장해 보세요.
                      </p>
                      <div className="flex gap-2 mt-2">
                        <button 
                          className="px-4 py-2 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary font-label-md text-label-md font-bold transition-colors"
                          type="button"
                          onClick={() => { setCategoryFilter('ALL'); setRegionFilter('ALL'); setSearchKeyword(''); }}
                        >
                          필터 전체 초기화
                        </button>
                        <a 
                          className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold transition-colors shadow-sm"
                          href="#partner-profile"
                        >
                          지역 / 분야 설정 변경하기 (PTNR-DSH-01)
                        </a>
                      </div>
                    </div>
                  )}

                  {!loading && filteredOrders.map((order, idx) => {
                    const isBookmarked = bookmarkedSlots.has(order.slotNo);
                    const isCard1 = idx === 0 && order.serviceTypeCd === 'REGULAR';
                    const compPercent = Math.min(100, Math.round((order.bidCount / order.maxBidCount) * 100));

                    return (
                      <article 
                        key={order.slotNo}
                        className={`bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-xl transition-all relative overflow-hidden group border border-surface-container-high/60 ${isCard1 ? 'border-l-4 border-l-secondary' : ''}`}
                      >
                        <div className="flex flex-col gap-space-md pl-1">
                          {/* Top Badges & Time Warning */}
                          <div className="flex flex-wrap items-center justify-between gap-space-sm">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {order.isNew && (
                                <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                                  NEW 신규
                                </span>
                              )}

                              {order.isEmergency && (
                                <span className="px-2.5 py-1 rounded-full bg-tertiary-container text-tertiary-fixed font-label-sm text-label-sm font-bold flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">bolt</span>
                                  단기/긴급
                                </span>
                              )}

                              {order.isExcellentOrder && (
                                <span className="px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold">
                                  장기우수오더 6개월
                                </span>
                              )}

                              {order.serviceTypeCd === 'MOVEIN' && (
                                <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-bold">
                                  팀 시공 3인 권장
                                </span>
                              )}

                              <span className="px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                                {order.dDayText}
                              </span>

                              <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">near_me</span>
                                {order.distanceText}
                              </span>

                              {order.serviceTypeCd === 'REGULAR' && !order.isExcellentOrder && (
                                <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-bold">
                                  정기관리 3개월
                                </span>
                              )}
                            </div>

                            {/* Bookmark Button */}
                            <button 
                              className={`p-1.5 rounded-lg hover:bg-surface-container-high transition-colors ${isBookmarked ? 'text-amber-500' : 'text-outline hover:text-amber-500'}`}
                              title={isBookmarked ? '스크랩 취소' : '관심 공고 스크랩'} 
                              type="button"
                              onClick={() => handleToggleBookmark(order.slotNo, order.title)}
                            >
                              <span 
                                className="material-symbols-outlined text-[20px]" 
                                style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}
                              >
                                {isBookmarked ? 'bookmark' : 'bookmark_border'}
                              </span>
                            </button>
                          </div>

                          {/* Main Title & Photo Anchor */}
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-space-sm">
                            <div className="flex flex-col gap-1">
                              <h2 className="font-headline-md text-headline-md font-bold text-on-surface group-hover:text-primary transition-colors">
                                {order.title}
                              </h2>
                              <div className="flex items-center gap-2 font-body-sm text-body-sm text-on-surface-variant flex-wrap">
                                <span className="material-symbols-outlined text-[16px] text-outline">location_city</span>
                                <span>{order.addrRoad}</span>
                                <span className="text-outline">|</span>
                                <span>등록: 14분 전</span>
                              </div>
                            </div>

                            {/* Scope Visual Chip */}
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-surface-container-high flex-shrink-0 relative shadow-sm">
                              <img 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                alt={order.title} 
                                src={order.photoUrl} 
                              />
                              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-inverse-surface/80 text-inverse-on-surface font-label-sm text-[10px] font-bold">
                                현장사진
                              </span>
                            </div>
                          </div>

                          {/* Scope Spec Container */}
                          <div className="bg-surface-container-low rounded-xl p-space-sm grid grid-cols-1 md:grid-cols-3 gap-space-sm font-body-sm text-body-sm">
                            <div className="flex flex-col">
                              <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">시공 구역 범위</span>
                              <span className="text-on-surface font-semibold mt-0.5 line-clamp-1">{order.scopeText}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">주기 및 총 일정</span>
                              <span className="text-on-surface font-semibold mt-0.5">{order.periodText}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">희망 작업 시간</span>
                              <span className="text-on-surface font-semibold mt-0.5">{order.workHoursText}</span>
                            </div>
                          </div>

                          {/* Settlement & Financial Breakdown */}
                          <div className="bg-surface-container rounded-xl p-space-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-space-md">
                            <div className="flex flex-wrap items-baseline gap-space-md">
                              <div className="flex flex-col">
                                <span className="font-label-sm text-label-sm text-on-surface-variant">고객 제시 확정 용역비</span>
                                <div className="flex items-baseline gap-1 mt-0.5">
                                  <span className="font-headline-md text-headline-md font-extrabold text-primary">
                                    {order.proposedAmt.toLocaleString()}
                                  </span>
                                  <span className="font-label-md text-label-md font-bold text-primary">원</span>
                                  {order.monthlyAmtText && (
                                    <span className="font-label-sm text-label-sm text-on-surface-variant ml-1 font-medium">
                                      {order.monthlyAmtText}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-col">
                                <span className="font-label-sm text-label-sm text-on-surface-variant">플랫폼 청약 이용료</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="line-through text-outline font-label-sm text-label-sm">
                                    {order.partnerFeeAmt.toLocaleString()}원
                                  </span>
                                  <span className="font-label-md text-label-md font-bold text-secondary">
                                    0원 (웰컴패스 적용)
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col">
                                <span className="font-label-sm text-label-sm text-secondary font-bold">파트너 예상 실수령액</span>
                                <span className="font-headline-sm text-headline-sm font-bold text-secondary mt-0.5">
                                  {order.proposedAmt.toLocaleString()}원 (수수료 0%)
                                </span>
                              </div>
                            </div>

                            {/* Tendering Competition Status Gauge */}
                            <div className="flex flex-col items-start md:items-end justify-center min-w-[150px]">
                              <div className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim">group</span>
                                <span className="font-label-sm text-label-sm text-on-surface font-bold">
                                  입찰 경쟁 {order.bidCount} / {order.maxBidCount}개사
                                </span>
                              </div>
                              <div className="w-full bg-surface-container-highest h-2 rounded-full mt-1.5 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all ${order.bidCount >= 2 ? 'bg-error' : 'bg-secondary'}`}
                                  style={{ width: `${compPercent}%` }}
                                ></div>
                              </div>
                              <span className="font-label-sm text-label-sm text-error font-bold mt-1">
                                {order.bidCount >= 2 ? '잔여 슬롯 1개사 마감 임박' : `잔여 슬롯 ${order.maxBidCount - order.bidCount}개사 접수 중`}
                              </span>
                            </div>
                          </div>

                          {/* Action Bar */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pt-1">
                            <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
                              <span className="material-symbols-outlined text-[16px] text-secondary">verified</span>
                              <span>100% 에스크로 익일(D+1) 자동 정산 대상</span>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                              <button 
                                className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors flex items-center gap-1 font-semibold" 
                                type="button"
                                onClick={() => {
                                  setSelectedOrderForManual(order);
                                  setIsManualModalOpen(true);
                                }}
                              >
                                <span className="material-symbols-outlined text-[16px]">visibility</span>
                                <span>시공 매뉴얼 미리보기</span>
                              </button>

                              {order.isAlreadyBid ? (
                                <button 
                                  className="px-5 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant font-label-md text-label-md font-bold cursor-not-allowed flex items-center gap-2"
                                  disabled
                                  type="button"
                                >
                                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                  <span>청약 응모 완료 (심사대기)</span>
                                </button>
                              ) : (
                                <a 
                                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold shadow-md transition-all flex items-center gap-2 active:scale-95" 
                                  href={`#ptnr-qot-01?slotNo=${order.slotNo}`}
                                >
                                  <span>공고 상세 보기 및 청약 제안하기 (PTNR-QOT-01)</span>
                                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}

                  {/* Pagination Bar */}
                  <div className="flex items-center justify-between bg-surface-container-lowest p-space-sm rounded-xl shadow-sm border border-surface-container-high/50 mt-space-sm">
                    <button 
                      className="px-3 py-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container font-label-md text-label-md flex items-center gap-1 disabled:opacity-40" 
                      disabled={currentPage <= 1} 
                      type="button"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                      <span>이전</span>
                    </button>
                    
                    <div className="flex items-center gap-1">
                      <button 
                        className={`w-8 h-8 rounded-lg font-label-md text-label-md font-bold flex items-center justify-center transition-all ${currentPage === 1 ? 'bg-primary text-on-primary shadow-sm' : 'hover:bg-surface-container text-on-surface-variant'}`}
                        type="button"
                        onClick={() => setCurrentPage(1)}
                      >
                        1
                      </button>
                      <button 
                        className={`w-8 h-8 rounded-lg font-label-md text-label-md font-bold flex items-center justify-center transition-all ${currentPage === 2 ? 'bg-primary text-on-primary shadow-sm' : 'hover:bg-surface-container text-on-surface-variant'}`}
                        type="button"
                        onClick={() => setCurrentPage(2)}
                      >
                        2
                      </button>
                      <button 
                        className={`w-8 h-8 rounded-lg font-label-md text-label-md font-bold flex items-center justify-center transition-all ${currentPage === 3 ? 'bg-primary text-on-primary shadow-sm' : 'hover:bg-surface-container text-on-surface-variant'}`}
                        type="button"
                        onClick={() => setCurrentPage(3)}
                      >
                        3
                      </button>
                    </div>
                    
                    <button 
                      className="px-3 py-1.5 rounded-lg text-primary hover:bg-surface-container font-label-md text-label-md flex items-center gap-1 font-semibold" 
                      type="button"
                      onClick={() => setCurrentPage(prev => prev + 1)}
                    >
                      <span>다음</span>
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </div>

                {/* Right Column: Sidebar (Settings, Success Playbook & Hotline) (4 cols) */}
                <aside className="lg:col-span-4 flex flex-col gap-space-md sticky top-24">
                  {/* Current Partner Criteria Box */}
                  <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container-high/50 flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-secondary text-[18px]">tune</span>
                        파트너 맞춤 수신 조건 요약
                      </span>
                      <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    </div>

                    <div className="flex flex-col gap-2 pt-1 font-body-sm text-body-sm">
                      <div className="flex justify-between items-start py-1">
                        <span className="text-on-surface-variant">설정 활동 권역:</span>
                        <span className="text-on-surface font-semibold text-right">
                          {settingSummary.activeRegionsText}
                        </span>
                      </div>
                      <div className="h-px w-full bg-surface-container"></div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-on-surface-variant">수신 전문 분야:</span>
                        <span className="text-on-surface font-semibold">
                          {settingSummary.serviceTypesText}
                        </span>
                      </div>
                      <div className="h-px w-full bg-surface-container"></div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-on-surface-variant">자동 수신 모드:</span>
                        <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                          ON (실시간 푸시)
                        </span>
                      </div>
                    </div>

                    <a 
                      className="w-full mt-2 py-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary font-label-md text-label-md font-bold text-center transition-colors block" 
                      href="#partner-profile"
                    >
                      지역 / 전문분야 설정 변경 (PTNR-DSH-01) &gt;
                    </a>
                  </div>

                  {/* Matching Success Playbook 3-Tips Card */}
                  <div className="bg-gradient-to-br from-surface-container-low to-surface-container rounded-xl p-space-md shadow-sm border border-surface-container-high/50 flex flex-col gap-space-sm">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-tertiary-fixed-dim text-[20px]">lightbulb</span>
                      <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        청약 매칭률 UP 3대 팁
                      </h3>
                    </div>

                    <ul className="flex flex-col gap-space-sm mt-1">
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary text-on-primary font-label-sm text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          1
                        </span>
                        <p className="font-body-sm text-body-sm text-on-surface leading-snug">
                          <strong className="text-primary font-bold">[첫 배차 무료 쿠폰]</strong>으로 선착순 슬롯이 마감되기 전에 부담 없이 우선 입찰하세요.
                        </p>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary text-on-primary font-label-sm text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          2
                        </span>
                        <p className="font-body-sm text-body-sm text-on-surface leading-snug">
                          고압스팀기·친환경 약품 등 <strong className="text-primary font-bold">보유 인증장비 태그</strong> 및 이전 시공 Before/After 포트폴리오를 제안서에 첨부하세요.
                        </p>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-primary text-on-primary font-label-sm text-[11px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          3
                        </span>
                        <p className="font-body-sm text-body-sm text-on-surface leading-snug">
                          공고 등록 후 <strong className="text-secondary font-bold">1시간 이내 청약 제출 시</strong> 고객 매칭 성사율이 평균 2.8배 높아집니다.
                        </p>
                      </li>
                    </ul>

                    {/* Sparkline & Acceptance Rate Visual Indicator */}
                    <div className="mt-2 p-3 rounded-lg bg-surface-container-lowest flex items-center justify-between border border-surface-container-high/40">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-on-surface-variant">반짝빌라클린 최근 청약 낙찰률</span>
                        <span className="font-headline-sm text-headline-sm font-bold text-secondary">
                          87.5% <span className="text-label-sm text-on-surface-variant font-normal">(상위 5% 마스터)</span>
                        </span>
                      </div>
                      
                      {/* Mini acceptance sparkline SVG */}
                      <svg className="w-20 h-8 text-secondary" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 80 32">
                        <polyline points="0,26 15,20 30,22 45,12 60,14 78,4"></polyline>
                      </svg>
                    </div>
                  </div>

                  {/* Hotline & Rapid Operations Dispatch */}
                  <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm border border-surface-container-high/50 flex flex-col gap-space-sm">
                    <span className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[18px]">support_agent</span>
                      청약 현장 긴급 관제 지원
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      고객 요구사항 문의, 시공 견적 조율 등 즉각적인 현장 배차 지원이 필요한 경우 파트너 전용 데스크를 이용하세요.
                    </p>
                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-secondary text-[20px]">call</span>
                          <span className="font-label-md text-label-md font-bold text-on-surface">1588-0000</span>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">ARS 파트너 2번</span>
                      </div>
                      <button 
                        className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-label-md font-bold flex items-center justify-center gap-1.5 transition-colors" 
                        type="button"
                        onClick={() => showToast('카카오톡 @쓸고닦고파트너 실시간 관제 채팅창으로 연결됩니다.')}
                      >
                        <span className="material-symbols-outlined text-[18px]">chat</span>
                        <span>카카오톡 @쓸고닦고파트너 실시간 관제</span>
                      </button>
                    </div>
                  </div>
                </aside>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-low text-on-surface-variant py-space-xl shadow-[0_-1px_8px_rgba(22,59,102,0.03)] border-t border-surface-container-high/60 mt-12">
        <div className="w-full px-margin-desktop flex flex-col gap-space-lg max-w-[1280px] mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-space-md pb-space-lg border-b border-outline-variant/30">
            <div className="flex items-center gap-space-lg flex-wrap">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">verified_user</span>
                <span className="font-label-md text-label-md text-on-surface font-bold">쓸고닦고 공인 플릿 파트너사 보증 시스템</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">shield</span>
                <span className="font-label-md text-label-md text-on-surface font-bold">100% 에스크로 익일 정산 보장</span>
              </div>
            </div>
            <div className="flex items-center gap-space-md font-label-sm text-label-sm">
              <span className="text-on-surface-variant">파트너 24시간 긴급 기술지원:</span>
              <span className="font-label-md text-label-md text-primary font-bold">1588-0000 (ARS 2번)</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pt-space-md">
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-on-surface font-bold">(주)쓸고닦고 파트너 엔터프라이즈 사업본부</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                사업자등록번호: 214-88-99012 | 통신판매업신고: 2024-서울강남-04121호 | 클리닝 안전책임배상보험 5억원 가입
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">© 2025 SsulDak Fleet Operations Network. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-space-md font-label-sm text-label-sm">
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">파트너 운영규약</a>
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">정산 수수료 안내</a>
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">개인정보처리방침</a>
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">긴급 관제센터</a>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL 1: 시공 매뉴얼 미리보기 모달 */}
      {isManualModalOpen && selectedOrderForManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[24px]">menu_book</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-primary">
                  표준 시공 매뉴얼 및 점검 가이드
                </h3>
              </div>
              <button 
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
                type="button"
                onClick={() => setIsManualModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 py-2 text-sm text-on-surface">
              <div className="p-3 bg-surface-container-low rounded-xl">
                <div className="font-bold text-primary mb-1">공고명: {selectedOrderForManual.title}</div>
                <div className="text-xs text-on-surface-variant">위치: {selectedOrderForManual.addrRoad}</div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-[18px]">task_alt</span>
                  시공 준수 핵심 체크포인트
                </div>
                <ul className="list-disc pl-5 text-xs text-on-surface-variant space-y-1">
                  <li>친환경 중성 세제 100% 사용 (유독성 락스 및 강산성 세제 사용 금지)</li>
                  <li>계단 및 공용부 바닥 린스 작업 후 미끄럼 방지 마감 조치 필수</li>
                  <li>시공 당일 착수 전(Before) 2장, 완료 후(After) 2장 사진 기사앱 전송 필수</li>
                  <li>현장 특이사항(외벽 누수, 창문 파손 등) 발생 시 플랫폼 사진 즉시 보고</li>
                </ul>
              </div>

              <div className="p-3 bg-secondary-container/30 rounded-xl text-xs text-secondary-container-on flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">shield</span>
                <span>매뉴얼 준수 시 시공 하자 배상책임 100% 본사 면책 및 보험 적용 대상입니다.</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button 
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high font-bold text-sm text-on-surface"
                type="button"
                onClick={() => setIsManualModalOpen(false)}
              >
                확인 완료
              </button>
              <a 
                className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm hover:bg-primary-container shadow-sm flex items-center gap-1.5"
                href={`#ptnr-qot-01?slotNo=${selectedOrderForManual.slotNo}`}
                onClick={() => setIsManualModalOpen(false)}
              >
                <span>이 공고에 청약하기</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: 내 보유 쿠폰함 모달 */}
      {isCouponModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[24px]">confirmation_number</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-primary">
                  보유 파트너 혜택 쿠폰함
                </h3>
              </div>
              <button 
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 py-2">
              <div className="p-4 rounded-xl border-2 border-dashed border-secondary/50 bg-secondary-container/20 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-secondary text-on-secondary font-bold text-xs">
                    100% 무료 패스
                  </span>
                  <span className="text-xs font-bold text-secondary">D-29 남음</span>
                </div>
                <div className="font-bold text-primary text-base">
                  [웰컴 입점] 첫 배차 데이터 이용료 100% 무료
                </div>
                <p className="text-xs text-on-surface-variant">
                  청약 시 플랫폼 데이터 이용료(최대 33,000원)가 0원으로 자동 감면 차감됩니다.
                </p>
                <div className="text-[11px] text-outline pt-1 border-t border-secondary/20 flex justify-between">
                  <span>발급일: 2026.10.23</span>
                  <span className="text-secondary font-bold">사용 가능 (1매)</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button 
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm hover:bg-primary-container shadow-sm w-full"
                type="button"
                onClick={() => setIsCouponModalOpen(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-inverse-surface text-inverse-on-surface px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200">
          <span className="material-symbols-outlined text-secondary text-[20px]">check_circle</span>
          <span className="font-label-md text-label-md font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
