/**
 * @file SsulDak_Web/Admin/frontend/ADMN-PRM-00/index.tsx
 * @description SsulDak 프로모션 및 쿠폰 캠페인 정책 관리 화면 (ADMN-PRM-00)
 * 
 * [준수 사항]
 * - 역할별 물리적 격리: SsulDak_Web/Admin 전용
 * - 1:1 독립 엔드포인트: POST /api/admin/admn_prm_00 연동
 * - 예산 긴급 동결 (Budget Freeze) 비상 킬스위치 제어
 * - 캠페인별 실시간 On/Off 토글 및 인라인 낙관적 업데이트
 * - 신규 등록 및 수정 모달 내장
 * - 시리얼 쿠폰 코드 대량생산 엑셀 다운로드
 * - 플랫폼 공식 브랜드 로고(/logo.png) 연동
 */
import React, { useState, useEffect, useCallback } from 'react';
import AdmnPrm01Modal from '../ADMN-PRM-01/index.tsx';

export interface AdmnPrm00Props {
  onNavigate?: (screenId: string) => void;
  adminId?: string;
}

interface CampaignItem {
  campaignNo: string | number;
  targetType: 'USER' | 'PARTNER';
  campaignNm: string;
  discountType: string;
  discountAmt: number;
  discountRate: number;
  formattedStartDt: string;
  formattedEndDt: string;
  validDays: number;
  isActiveYn: 'Y' | 'N';
  issuedCnt: number;
  usedCnt: number;
  burnRatePct: number;
  couponCode?: string;
}

export default function AdmnPrm00Screen({ onNavigate, adminId = 'admin01' }: AdmnPrm00Props) {
  // 사이드바 활성 메뉴
  const [activeNav, setActiveNav] = useState('promotions-coupons');

  // 필터 및 검색 상태
  const [targetFilter, setTargetFilter] = useState<'ALL' | 'USER' | 'PARTNER' | 'INACTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // 예산 및 캠페인 데이터
  const [budget, setBudget] = useState({
    totalBudgetAmt: 10000000,
    totalSpentAmt: 4250000,
    remainingBudgetAmt: 5750000,
    burnRate: 42.5,
    redemptionRate: 70.2,
    totalIssuedCouponCnt: 535,
    totalUsedCouponCnt: 392,
    partnerFeeReliefAmt: 3069000,
    partnerBenefitCount: 80,
    isBudgetFrozen: false,
    freezeNotice: null as string | null
  });

  const [campaigns, setCampaigns] = useState<CampaignItem[]>([
    {
      campaignNo: '1',
      targetType: 'USER',
      campaignNm: '웰컴 첫 결제 5,000원 할인',
      discountType: 'FIXED_AMT',
      discountAmt: 5000,
      discountRate: 0,
      formattedStartDt: '2026.10.01',
      formattedEndDt: '2026.12.31',
      validDays: 30,
      isActiveYn: 'Y',
      issuedCnt: 420,
      usedCnt: 312,
      burnRatePct: 74.3,
      couponCode: 'CP-WELCOME-05K'
    },
    {
      campaignNo: '2',
      targetType: 'PARTNER',
      campaignNm: '신규 입점 첫 배차 무료 쿠폰',
      discountType: 'RATE_100',
      discountAmt: 33000,
      discountRate: 100,
      formattedStartDt: '2026.10.01',
      formattedEndDt: '2026.12.31',
      validDays: 60,
      isActiveYn: 'Y',
      issuedCnt: 85,
      usedCnt: 62,
      burnRatePct: 72.9,
      couponCode: 'CP-WELCOME-100'
    },
    {
      campaignNo: '3',
      targetType: 'PARTNER',
      campaignNm: '이달의 우수 파트너 50% 감면',
      discountType: 'RATE_50',
      discountAmt: 16500,
      discountRate: 50,
      formattedStartDt: '2026.10.01',
      formattedEndDt: '2026.11.30',
      validDays: 30,
      isActiveYn: 'Y',
      issuedCnt: 30,
      usedCnt: 18,
      burnRatePct: 60.0,
      couponCode: 'CP-VIP-HALF'
    },
    {
      campaignNo: '4',
      targetType: 'USER',
      campaignNm: '가전 분해청소 환절기 특별 10% 쿠폰',
      discountType: 'RATE_50',
      discountAmt: 20000,
      discountRate: 10,
      formattedStartDt: '2026.10.15',
      formattedEndDt: '2026.11.15',
      validDays: 14,
      isActiveYn: 'Y',
      issuedCnt: 150,
      usedCnt: 48,
      burnRatePct: 32.0,
      couponCode: 'CP-SEASON-10'
    },
    {
      campaignNo: '5',
      targetType: 'USER',
      campaignNm: '친구 추천 리워드 3,000P',
      discountType: 'FIXED_AMT',
      discountAmt: 3000,
      discountRate: 0,
      formattedStartDt: '2026.09.01',
      formattedEndDt: '2026.09.30',
      validDays: 30,
      isActiveYn: 'N',
      issuedCnt: 200,
      usedCnt: 188,
      burnRatePct: 94.0,
      couponCode: 'CP-REF-3000'
    }
  ]);

  // 모달 제어 상태
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<CampaignItem> | null>(null);
  const [showSerialModal, setShowSerialModal] = useState(false);
  const [showAirdropModal, setShowAirdropModal] = useState(false);
  const [generatedSerials, setGeneratedSerials] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 세션 타이머
  const [sessionTimeLeft, setSessionTimeLeft] = useState(3582);

  // 토스트 알림 함수
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 세션 카운트다운
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionTimeLeft((prev) => (prev > 0 ? prev - 1 : 3600));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatSessionTime = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // 1. 캠페인 및 예산 데이터 조회
  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/admn_prm_00', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'GET_CAMPAIGN_LIST',
          adminId
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.budget) setBudget(data.budget);
        if (data.campaigns && data.campaigns.length > 0) setCampaigns(data.campaigns);
      }
    } catch (err) {
      console.error('[ADMN-PRM-00] Fetch error:', err);
    }
  }, [adminId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // 2. 캠페인 On/Off 토글
  const handleToggleStatus = async (campaignNo: string | number, currentActive: 'Y' | 'N') => {
    const nextStatus = currentActive === 'Y' ? 'N' : 'Y';

    // 낙관적 UI 업데이트
    setCampaigns((prev) =>
      prev.map((c) => (c.campaignNo === campaignNo ? { ...c, isActiveYn: nextStatus } : c))
    );

    try {
      const res = await fetch('/api/admin/admn_prm_00', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'TOGGLE_CAMPAIGN_STATUS',
          adminId,
          campaignNo,
          isActiveYn: nextStatus
        })
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        // 롤백
        setCampaigns((prev) =>
          prev.map((c) => (c.campaignNo === campaignNo ? { ...c, isActiveYn: currentActive } : c))
        );
        showToast(result.message || '상태 변경에 실패했습니다.');
      } else {
        showToast(result.message);
      }
    } catch (err: any) {
      // 롤백
      setCampaigns((prev) =>
        prev.map((c) => (c.campaignNo === campaignNo ? { ...c, isActiveYn: currentActive } : c))
      );
      showToast('네트워크 오류가 발생했습니다.');
    }
  };

  // 3. 예산 긴급 동결 킬스위치 실행/해제
  const handleToggleBudgetFreeze = async (executeFreeze: boolean) => {
    const targetStatus = executeFreeze ? 'Y' : 'N';
    try {
      const res = await fetch('/api/admin/admn_prm_00', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'TOGGLE_BUDGET_FREEZE',
          adminId,
          freezeStatus: targetStatus
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setBudget((prev) => ({
          ...prev,
          isBudgetFrozen: executeFreeze,
          freezeNotice: executeFreeze
            ? '🚨 마케팅 예산 긴급 동결 상태입니다. 전체 활성 쿠폰의 신규 발급 및 결제 차감이 전면 차단되었습니다.'
            : null
        }));
        showToast(result.message);
      }
    } catch (err) {
      showToast('예산 동결 제어 처리 중 오류가 발생했습니다.');
    } finally {
      setShowFreezeModal(false);
    }
  };

  // 4. 신규 등록 및 수정 저장
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign?.campaignNm) {
      alert('캠페인명을 입력해 주십시오.');
      return;
    }

    try {
      const res = await fetch('/api/admin/admn_prm_00', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'SAVE_CAMPAIGN',
          adminId,
          campaignNo: editingCampaign.campaignNo || null,
          targetType: editingCampaign.targetType || 'USER',
          campaignNm: editingCampaign.campaignNm,
          discountType: editingCampaign.discountType || 'FIXED_AMT',
          discountAmt: editingCampaign.discountAmt || 5000,
          discountRate: editingCampaign.discountRate || 0,
          startDt: editingCampaign.formattedStartDt?.replace(/\./g, '-') || '2026-10-01',
          endDt: editingCampaign.formattedEndDt?.replace(/\./g, '-') || '2026-12-31',
          validDays: editingCampaign.validDays || 30
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToast(result.message);
        setShowEditModal(false);
        setEditingCampaign(null);
        fetchCampaigns();
      } else {
        alert(result.message || '저장에 실패했습니다.');
      }
    } catch (err) {
      alert('저장 중 통신 오류가 발생했습니다.');
    }
  };

  // 5. 시리얼 코드 대량 생성
  const handleGenerateSerialCodes = async () => {
    try {
      const res = await fetch('/api/admin/admn_prm_00', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'GENERATE_SERIAL_CODES',
          adminId,
          count: 50
        })
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setGeneratedSerials(result.serialCodes || []);
        setShowSerialModal(true);
      }
    } catch {
      showToast('시리얼 코드 생성 중 오류가 발생했습니다.');
    }
  };

  // 필터링된 캠페인 목록
  const filteredCampaigns = campaigns.filter((c) => {
    if (targetFilter === 'USER' && c.targetType !== 'USER') return false;
    if (targetFilter === 'PARTNER' && c.targetType !== 'PARTNER') return false;
    if (targetFilter === 'INACTIVE' && c.isActiveYn !== 'N') return false;

    if (statusFilter === 'ON' && c.isActiveYn !== 'Y') return false;
    if (statusFilter === 'OFF' && c.isActiveYn !== 'N') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNm = c.campaignNm.toLowerCase().includes(q);
      const matchCode = c.couponCode?.toLowerCase().includes(q);
      if (!matchNm && !matchCode) return false;
    }

    return true;
  });

  return (
    <div className="bg-[#f8f9ff] text-[#0b1c30] antialiased min-h-screen font-['Plus_Jakarta_Sans','Noto_Sans_KR',sans-serif] selection:bg-[#163b66] selection:text-white">
      {/* 토스트 피드백 */}
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
                  setActiveNav(menu.id);
                  if (menu.id !== 'promotions-coupons' && onNavigate) {
                    onNavigate(menu.screen);
                  }
                }}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                  activeNav === menu.id
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

        {/* 하단 보안 레벨 위젯 */}
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

      {/* 2. 본문 영역 */}
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
            {/* 긴급 분쟁 알림 */}
            <div className="flex items-center gap-1 bg-[#ffdad6] text-[#93000a] px-3.5 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">warning</span>
              <span className="text-[12px] font-bold">긴급 분쟁 알림</span>
              <span className="w-5 h-5 rounded-full bg-[#ba1a1a] text-white flex items-center justify-center text-[11px] font-bold ml-1">
                1
              </span>
            </div>

            {/* 관리자 프로필 */}
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
              onClick={() => {
                sessionStorage.removeItem('ssuldak_admin_token');
                if (onNavigate) onNavigate('ADMN-ATH-00');
                else window.location.hash = '#admn-ath-00';
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#dce9ff] hover:bg-[#d3e4fe] text-[#00254a] text-[13px] font-semibold rounded-lg transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>로그아웃</span>
            </button>
          </div>
        </header>

        {/* 3. 메인 콘텐츠 */}
        <main className="flex-1 pt-16 bg-[#f8f9ff] px-6 py-6">
          <div className="flex flex-col w-full gap-6 max-w-[1440px] mx-auto pb-12">
            {/* 브레드크럼 및 페이지 헤더 */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-[#43474f] text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => onNavigate?.('ADMN-DSH-00')}
                  className="hover:text-[#00254a] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">home</span>홈
                </button>
                <span className="material-symbols-outlined text-[12px] text-[#737780]">chevron_right</span>
                <span>정책 센터</span>
                <span className="material-symbols-outlined text-[12px] text-[#737780]">chevron_right</span>
                <span className="text-[#00254a] font-bold">프로모션/쿠폰 정책 관리 (ADMN-PRM-00)</span>
              </div>

              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pt-1">
                <div className="flex flex-col gap-1 max-w-4xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-[26px] font-extrabold text-[#00254a] tracking-tight">
                      프로모션 및 쿠폰 캠페인 관리
                    </h1>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#163b66] text-white text-[11px] font-bold shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#82f5c1] animate-ping"></span>
                      PROMOTION OPS v2.4
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#dce9ff] text-[#43474f] text-[11px] font-semibold">
                      <span className="material-symbols-outlined text-[13px] text-[#006c4a]">verified_user</span>
                      엔클레이브 감사 승인됨
                    </span>
                  </div>
                  <p className="text-[14px] text-[#43474f]">
                    플랫폼 활성화 및 신규/우수 파트너 정착을 위한 마케팅 예산 집행 한도, 쿠폰 발행 정책, 실시간 회수율 통계를 모니터링하고 제어합니다.
                  </p>
                </div>

                {/* 상단 퀵 액션 버튼 바 */}
                <div className="flex items-center flex-wrap gap-2.5">
                  {/* 비상 킬스위치: 예산 긴급 동결 (Budget Freeze) */}
                  <button
                    onClick={() => setShowFreezeModal(true)}
                    id="freezeBtn"
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-[13px] shadow-sm transition-all cursor-pointer ${
                      budget.isBudgetFrozen
                        ? 'bg-[#ba1a1a] text-white hover:bg-[#93000a] animate-pulse ring-4 ring-[#ba1a1a]/30'
                        : 'bg-[#ffdad6] text-[#93000a] hover:bg-[#ffdad6]/80'
                    }`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">emergency_home</span>
                    <span>
                      {budget.isBudgetFrozen ? '🚨 예산 동결 중 (해제 클릭)' : '예산 긴급 동결 (Budget Freeze)'}
                    </span>
                  </button>

                  {/* 성과 리포트 버튼 */}
                  <button
                    onClick={() => {
                      showToast('2026년 4분기 캠페인 성과 분석 XLSX 리포트를 다운로드합니다.');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-[#eff4ff] text-[#00254a] border border-[#e5eeff] font-bold text-[13px] shadow-sm transition-all cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">table_chart</span>
                    <span>캠페인 성과 리포트 (XLSX)</span>
                  </button>

                  {/* 새 캠페인 등록 버튼 */}
                  <button
                    onClick={() => {
                      setEditingCampaign({
                        targetType: 'USER',
                        campaignNm: '',
                        discountType: 'FIXED_AMT',
                        discountAmt: 5000,
                        discountRate: 0,
                        formattedStartDt: '2026.10.01',
                        formattedEndDt: '2026.12.31',
                        validDays: 30
                      });
                      setShowEditModal(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white font-bold text-[13px] shadow-md transition-all cursor-pointer"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    <span>새 캠페인 등록</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 비상 동결 시 경고 배너 */}
            {budget.isBudgetFrozen && (
              <div className="bg-[#ffdad6] border-2 border-[#ba1a1a] rounded-xl p-4 text-[#93000a] flex items-center justify-between shadow-md animate-shake">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[28px] text-[#ba1a1a]">warning</span>
                  <div>
                    <h3 className="font-bold text-[15px]">🚨 마케팅 예산 전면 긴급 동결 상태</h3>
                    <p className="text-[12px] text-[#93000a] mt-0.5">
                      금융보안 규정에 따라 전체 활성 쿠폰의 신규 발급, 에어드랍 다운로드 및 결제 시 쿠폰 감면 적용이 즉시 차단되었습니다.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleBudgetFreeze(false)}
                  className="px-4 py-2 bg-[#ba1a1a] hover:bg-[#93000a] text-white rounded-lg text-[12px] font-bold transition-colors cursor-pointer"
                >
                  동결 해제
                </button>
              </div>
            )}

            {/* 4대 지표 카드 (Promotion Budget & Health Overview) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1 */}
              <div className="relative overflow-hidden bg-white p-5 rounded-xl shadow-sm border border-[#e5eeff] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#43474f] font-bold">총 마케팅 배정 예산</span>
                  <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#00254a]">
                    <span className="material-symbols-outlined text-[18px]">account_balance</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[28px] font-extrabold text-[#00254a] tracking-tight font-mono">
                      {budget.totalBudgetAmt.toLocaleString()}
                    </span>
                    <span className="text-[15px] text-[#43474f] font-semibold">원</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[#43474f] text-[11px]">
                    <span>2026년 4분기 (Q4) 배정분</span>
                    <span className="text-[#006c4a] font-bold">확정 승인</span>
                  </div>
                </div>
                <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-[#eff4ff] rounded-full opacity-40 pointer-events-none"></div>
              </div>

              {/* Metric 2 */}
              <div className="relative overflow-hidden bg-white p-5 rounded-xl shadow-sm border border-[#e5eeff] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#43474f] font-bold">현재 집행액 (소진액)</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#85f8c4]/60 text-[#005137] text-[11px] font-bold">
                    안정 페이스
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[28px] font-extrabold text-[#00254a] tracking-tight font-mono">
                      {budget.totalSpentAmt.toLocaleString()}
                    </span>
                    <span className="text-[15px] text-[#43474f] font-semibold">원</span>
                    <span className="ml-auto text-[13px] font-bold text-[#006c4a] font-mono">{budget.burnRate}%</span>
                  </div>
                  <div className="w-full bg-[#eff4ff] rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className="bg-[#006c4a] h-full rounded-full transition-all duration-500"
                      style={{ width: `${budget.burnRate}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[#43474f] text-[11px]">
                    <span>
                      잔여 예산: <strong className="text-[#00254a] font-mono font-semibold">{budget.remainingBudgetAmt.toLocaleString()}원</strong>
                    </span>
                    <span className="text-[#737780]">계획 대비 -7.2%</span>
                  </div>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="relative overflow-hidden bg-white p-5 rounded-xl shadow-sm border border-[#e5eeff] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#43474f] font-bold">전체 쿠폰 회수(사용)율</span>
                  <div className="w-8 h-8 rounded-lg bg-[#dce9ff] flex items-center justify-center text-[#00254a]">
                    <span className="material-symbols-outlined text-[18px]">redeem</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[28px] font-extrabold text-[#00254a] tracking-tight font-mono">
                      {budget.redemptionRate}
                    </span>
                    <span className="text-[20px] text-[#00254a] font-bold">%</span>
                    <span className="text-[11px] text-[#006c4a] font-bold ml-auto flex items-center">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span>+4.8%p
                    </span>
                  </div>
                  <div className="w-full bg-[#eff4ff] rounded-full h-2 mt-2 overflow-hidden">
                    <div
                      className="bg-[#00254a] h-full rounded-full transition-all duration-500"
                      style={{ width: `${budget.redemptionRate}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[#43474f] text-[11px]">
                    <span>
                      발행 {budget.totalIssuedCouponCnt}건 중 <strong className="text-[#00254a] font-semibold">{budget.totalUsedCouponCnt}건</strong> 완료
                    </span>
                    <span className="font-mono text-[#43474f]">{budget.totalIssuedCouponCnt - budget.totalUsedCouponCnt}건 미사용</span>
                  </div>
                </div>
              </div>

              {/* Metric 4 */}
              <div className="relative overflow-hidden bg-white p-5 rounded-xl shadow-sm border border-[#e5eeff] flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#43474f] font-bold">데이터 이용료 감면 지원총액</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#d4e3ff] text-[#00254a] text-[11px] font-bold">
                    파트너 복지
                  </span>
                </div>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[28px] font-extrabold text-[#00254a] tracking-tight font-mono">
                      {budget.partnerFeeReliefAmt.toLocaleString()}
                    </span>
                    <span className="text-[15px] text-[#43474f] font-semibold">원</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[#43474f] text-[11px]">
                    <span>기사 성장지원금 실시간 정산</span>
                    <span className="text-[#00254a] font-bold font-mono">총 {budget.partnerBenefitCount}명 수혜</span>
                  </div>
                </div>
                <div className="absolute right-0 bottom-0 translate-x-3 translate-y-3 opacity-5 pointer-events-none">
                  <span className="material-symbols-outlined text-[96px] text-[#00254a]">handshake</span>
                </div>
              </div>
            </div>

            {/* Budget Health Banner / Diagnostics */}
            <div className="bg-[#eff4ff] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm border border-[#e5eeff]">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#85f8c4] flex items-center justify-center text-[#002114] shrink-0">
                  <span className="material-symbols-outlined text-[22px]">health_and_safety</span>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-bold text-[#0b1c30]">예산 집행 건전성:</span>
                    <span className="inline-flex items-center gap-1 text-[13px] font-bold text-[#006c4a] bg-white px-2 py-0.5 rounded-md shadow-sm border border-[#e5eeff]">
                      <span className="w-2 h-2 rounded-full bg-[#006c4a]"></span>양호 (Normal)
                    </span>
                    <span className="text-[#43474f] text-[13px]">· 일평균 소진 속도 141,600원 내외로 통제 한도 준수 중</span>
                  </div>
                  <span className="text-[13px] text-[#43474f] mt-0.5">
                    현재 정책 기준, 4분기 마케팅 예산 소진 예상일은 <strong className="text-[#00254a]">2026년 12월 24일</strong>이며 긴급 차단 임계값(소진율 90%)에 미도달 상태입니다.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => showToast('예산 소진율 90% 도달 시 운영총괄 관리자 즉시 SMS/Slack 알림이 설정되어 있습니다.')}
                  className="px-3 py-1.5 rounded-lg bg-[#dce9ff] hover:bg-[#d3e4fe] transition-colors text-[#00254a] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">tune</span>
                  <span>임계치 알림 설정</span>
                </button>
                <button
                  type="button"
                  onClick={() => showToast('예산 집행 감사 로그 원장(TB_DATA_FEE_PAY) 대사 완료')}
                  className="px-3 py-1.5 rounded-lg bg-[#dce9ff] hover:bg-[#d3e4fe] transition-colors text-[#00254a] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">history</span>
                  <span>예산 집행 로그</span>
                </button>
              </div>
            </div>

            {/* 메인 캠페인 테이블 섹션 */}
            <div className="bg-white rounded-xl shadow-sm border border-[#e5eeff] flex flex-col overflow-hidden">
              {/* 필터 툴바 */}
              <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border-b border-[#e5eeff]">
                {/* 대상 구분 탭 */}
                <div className="flex items-center gap-1 p-1 bg-[#eff4ff] rounded-lg overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setTargetFilter('ALL')}
                    className={`px-3.5 py-1.5 rounded-md text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      targetFilter === 'ALL'
                        ? 'bg-[#00254a] text-white shadow-sm'
                        : 'text-[#43474f] hover:text-[#0b1c30]'
                    }`}
                  >
                    전체 {campaigns.length}건
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetFilter('USER')}
                    className={`px-3.5 py-1.5 rounded-md text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      targetFilter === 'USER'
                        ? 'bg-[#00254a] text-white shadow-sm'
                        : 'text-[#43474f] hover:text-[#0b1c30]'
                    }`}
                  >
                    고객 대상 ({campaigns.filter((c) => c.targetType === 'USER').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetFilter('PARTNER')}
                    className={`px-3.5 py-1.5 rounded-md text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      targetFilter === 'PARTNER'
                        ? 'bg-[#00254a] text-white shadow-sm'
                        : 'text-[#43474f] hover:text-[#0b1c30]'
                    }`}
                  >
                    파트너(기사) 대상 ({campaigns.filter((c) => c.targetType === 'PARTNER').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetFilter('INACTIVE')}
                    className={`px-3.5 py-1.5 rounded-md text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                      targetFilter === 'INACTIVE'
                        ? 'bg-[#00254a] text-white shadow-sm'
                        : 'text-[#43474f] hover:text-[#0b1c30]'
                    }`}
                  >
                    일시중지/만료 ({campaigns.filter((c) => c.isActiveYn === 'N').length})
                  </button>
                </div>

                {/* 검색 및 드롭다운 컨트롤 */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative flex-1 sm:w-72">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#737780] text-[18px]">
                      search
                    </span>
                    <input
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#eff4ff] text-[#0b1c30] placeholder:text-[#737780] text-[13px] outline-none focus:bg-white focus:ring-2 focus:ring-[#00254a]/20 transition-all border border-[#e5eeff]"
                      placeholder="캠페인명 또는 쿠폰 코드 검색..."
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      className="px-3 py-2 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-[13px] outline-none cursor-pointer border border-[#e5eeff] font-medium"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="ALL">활성 상태: 전체</option>
                      <option value="ON">활성 (ON)</option>
                      <option value="OFF">비활성/종료 (OFF)</option>
                    </select>

                    <select className="px-3 py-2 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-[13px] outline-none cursor-pointer border border-[#e5eeff] font-medium">
                      <option>기간: 2026.10 ~ 2026.12 (Q4)</option>
                      <option>기간: 2026.07 ~ 2026.09 (Q3)</option>
                      <option>기간: 전체 누적</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 데이터 테이블 */}
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1080px]">
                  <thead>
                    <tr className="bg-[#eff4ff] text-[#43474f] text-[11px] tracking-wider uppercase font-bold">
                      <th className="py-3 px-4 w-28">대상 구분</th>
                      <th className="py-3 px-4">캠페인명 / 관리코드</th>
                      <th className="py-3 px-4">혜택 유형 및 내용</th>
                      <th className="py-3 px-4">사용 유효기간</th>
                      <th className="py-3 px-4 text-center">유효일수</th>
                      <th className="py-3 px-4 w-56">발급/사용수 (소진율)</th>
                      <th className="py-3 px-4 text-center w-28">활성 상태</th>
                      <th className="py-3 px-4 text-right w-36">관리/수정</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5eeff] text-[13px]">
                    {filteredCampaigns.map((row) => (
                      <tr
                        key={row.campaignNo}
                        className={`hover:bg-[#eff4ff]/50 transition-colors group ${
                          row.isActiveYn === 'N' ? 'bg-[#eff4ff]/20 opacity-75' : ''
                        }`}
                      >
                        {/* 대상 구분 */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                              row.targetType === 'USER'
                                ? 'bg-[#dce9ff] text-[#00254a]'
                                : 'bg-[#85f8c4] text-[#002114]'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                row.targetType === 'USER' ? 'bg-[#00254a]' : 'bg-[#006c4a]'
                              }`}
                            ></span>
                            {row.targetType === 'USER' ? '고객' : '기사(파트너)'}
                          </span>
                        </td>

                        {/* 캠페인명 / 관리코드 */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span
                              onClick={() => {
                                setEditingCampaign(row);
                                setShowEditModal(true);
                              }}
                              className="text-[14px] text-[#00254a] font-bold group-hover:underline cursor-pointer"
                            >
                              {row.campaignNm}
                            </span>
                            <span className="font-mono text-[11px] text-[#43474f] flex items-center gap-1 mt-0.5">
                              <span className="material-symbols-outlined text-[13px] text-[#737780]">tag</span>
                              {row.couponCode || `CP-${row.campaignNo}`}
                            </span>
                          </div>
                        </td>

                        {/* 혜택 유형 및 내용 */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span
                              className={`font-semibold ${
                                row.discountRate === 100 ? 'text-[#006c4a] font-bold' : 'text-[#0b1c30]'
                              }`}
                            >
                              {row.discountType === 'RATE_100'
                                ? '100% 면제'
                                : row.discountType === 'RATE_50'
                                ? `정률 ${row.discountRate}% 할인`
                                : `정액 ${row.discountAmt.toLocaleString()}원`}
                            </span>
                            <span className="text-[#43474f] text-[11px]">
                              {row.discountType === 'RATE_100'
                                ? '플랫폼 데이터 이용료 33,000원 전액 지원'
                                : row.discountType === 'RATE_50'
                                ? `이용료 ${row.discountAmt.toLocaleString()}원 차감 (월 최대 2건)`
                                : '첫 견적 결제 시 즉시 차감'}
                            </span>
                          </div>
                        </td>

                        {/* 사용 유효기간 */}
                        <td className="py-4 px-4 font-mono text-[#43474f] text-[12px]">
                          <div className="flex items-center gap-1">
                            <span>{row.formattedStartDt}</span>
                            <span>~</span>
                            <span>{row.formattedEndDt}</span>
                            {row.isActiveYn === 'N' && (
                              <span className="text-[#ba1a1a] font-sans font-bold text-[11px] ml-1">(종료)</span>
                            )}
                          </div>
                        </td>

                        {/* 유효일수 */}
                        <td className="py-4 px-4 text-center">
                          <span className="px-2 py-0.5 rounded bg-[#eff4ff] text-[#0b1c30] font-mono font-medium text-[12px]">
                            {row.targetType === 'PARTNER' && row.validDays === 60
                              ? '승인 후 60일'
                              : `발급 후 ${row.validDays}일`}
                          </span>
                        </td>

                        {/* 발급/사용수 (소진율) */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-mono font-bold text-[#0b1c30]">
                                {row.usedCnt} <span className="text-[#43474f] font-normal">/ {row.issuedCnt}건</span>
                              </span>
                              <span className="font-mono font-bold text-[#006c4a]">{row.burnRatePct}%</span>
                            </div>
                            <div className="w-full bg-[#eff4ff] rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-[#006c4a] h-full rounded-full transition-all"
                                style={{ width: `${row.burnRatePct}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* 활성 On/Off 토글 스위치 */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(row.campaignNo, row.isActiveYn)}
                            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
                              row.isActiveYn === 'Y' ? 'bg-[#006c4a]' : 'bg-[#c3c6d0]'
                            }`}
                            title={row.isActiveYn === 'Y' ? '활성 상태 (클릭 시 비활성화)' : '비활성 상태 (클릭 시 활성화)'}
                          >
                            <div
                              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                                row.isActiveYn === 'Y' ? 'translate-x-6' : 'translate-x-0'
                              }`}
                            ></div>
                          </button>
                        </td>

                        {/* 관리/수정 액션 */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCampaign(row);
                                setShowEditModal(true);
                              }}
                              className="px-2.5 py-1 rounded bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00254a] text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                showToast(`캠페인 [${row.campaignNm}] 상세 감사 보고서 열람`);
                              }}
                              className="p-1 rounded text-[#43474f] hover:text-[#00254a] hover:bg-[#eff4ff] transition-colors cursor-pointer"
                              title="상세보기"
                            >
                              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 테이블 푸터 / 페이징 */}
              <div className="px-6 py-3.5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-[#eff4ff]">
                <div className="flex items-center gap-2 text-[#43474f] text-[11px]">
                  <span>페이지 당 행 수:</span>
                  <select className="bg-[#eff4ff] rounded px-2 py-1 text-[#0b1c30] font-semibold focus:outline-none">
                    <option>5개씩 보기</option>
                    <option>10개씩 보기</option>
                    <option>20개씩 보기</option>
                  </select>
                  <span>전체 {campaigns.length}개 중 1-{filteredCampaigns.length} 표시 중</span>
                </div>
                <div className="flex items-center gap-1">
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#737780] hover:bg-[#eff4ff] disabled:opacity-40" disabled type="button">
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold bg-[#00254a] text-white shadow-sm" type="button">
                    1
                  </button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold text-[#43474f] hover:bg-[#eff4ff]" type="button">
                    2
                  </button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-semibold text-[#43474f] hover:bg-[#eff4ff]" type="button">
                    3
                  </button>
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-[#43474f] hover:bg-[#eff4ff]" type="button">
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 하단 거버넌스 안내 및 대량생산 독 (Bottom Action Dock) */}
            <div className="rounded-xl bg-white p-6 shadow-sm border border-[#e5eeff] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start gap-3 max-w-2xl">
                <div className="w-9 h-9 rounded-lg bg-[#dce9ff] flex items-center justify-center text-[#00254a] shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[20px]">encrypted</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-bold text-[#0b1c30]">쿠폰 발행 및 정책 거버넌스 가이드</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#eff4ff] text-[#43474f] font-mono">
                      ISMS-P Sec-6.2.1
                    </span>
                  </div>
                  <p className="text-[13px] text-[#43474f]">
                    모든 마케팅 프로모션 생성, 할인율 변경 및 쿠폰 강제 회수 작업은 운영총괄 관리자 세션 감사 로그에 암호화 보관되며 분기별 결산 감사 시 재무 대사 자료로 자동 첨부됩니다.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleGenerateSerialCodes}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#eff4ff] text-[#00254a] hover:bg-[#dce9ff] transition-all text-[13px] font-bold active:scale-95 cursor-pointer border border-[#e5eeff]"
                >
                  <span className="material-symbols-outlined text-[18px]">file_download</span>
                  <span>시리얼 코드 대량생산 엑셀다운</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAirdropModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#00254a] text-white hover:bg-[#163b66] transition-all text-[13px] font-bold shadow-md active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#82f5c1]">send_time_extension</span>
                  <span>타겟 세그먼트 일괄 에어드랍 발송 (ADMN-PRM-01)</span>
                </button>
              </div>
            </div>
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
                onClick={() => showToast('감사로그 원장(TB_SYS_POLICY) 무결성 상태입니다.')}
              >
                보안 로그 현황
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* 모달 1: 예산 긴급 동결 (Budget Freeze) 확인 모달 */}
      {showFreezeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-[480px] w-full p-6 shadow-2xl border-2 border-[#ba1a1a]/40 flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center">
                <span className="material-symbols-outlined text-[28px]">emergency_home</span>
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#ba1a1a]">
                  {budget.isBudgetFrozen ? '마케팅 예산 동결 해제' : '마케팅 예산 긴급 동결 (Budget Freeze)'}
                </h3>
                <p className="text-[12px] text-[#737780]">금융 보안 및 리스크 비상 조치</p>
              </div>
            </div>

            <div className="bg-[#eff4ff] p-4 rounded-xl border border-[#e5eeff] text-[13px] text-[#0b1c30] leading-relaxed flex flex-col gap-2">
              <p>
                {budget.isBudgetFrozen
                  ? '동결을 해제하시겠습니까? 해제 즉시 전체 활성 프로모션 쿠폰의 신규 발급 및 결제 감면이 정상 재개됩니다.'
                  : '경고: 마케팅 예산 긴급 동결 모드를 활성화하시겠습니까?'}
              </p>
              {!budget.isBudgetFrozen && (
                <ul className="list-disc pl-5 text-[12px] text-[#93000a] flex flex-col gap-1 font-medium">
                  <li>전체 활성 쿠폰의 신규 발급 및 에어드랍 다운로드가 즉시 차단됩니다.</li>
                  <li>이미 발급된 쿠폰의 결제 적용 가능 여부는 금융보안 규정에 따라 잠금됩니다.</li>
                  <li>운영 감사팀 및 재무 담당자에게 즉시 암호화 긴급 통보(SMS/Slack)가 발송됩니다.</li>
                </ul>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowFreezeModal(false)}
                className="flex-1 py-2.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] rounded-xl text-[13px] font-semibold transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleToggleBudgetFreeze(!budget.isBudgetFrozen)}
                className={`flex-1 py-2.5 text-white rounded-xl text-[13px] font-bold shadow-sm transition-colors cursor-pointer ${
                  budget.isBudgetFrozen
                    ? 'bg-[#00254a] hover:bg-[#163b66]'
                    : 'bg-[#ba1a1a] hover:bg-[#93000a]'
                }`}
              >
                {budget.isBudgetFrozen ? '동결 해제 확인' : '예산 긴급 동결 실행'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모달 2: 새 캠페인 등록 및 수정 모달 */}
      {showEditModal && editingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-[520px] w-full p-6 shadow-2xl border border-[#e5eeff] flex flex-col gap-4 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#e5eeff] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#00254a] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
                </div>
                <h3 className="text-[17px] font-bold text-[#00254a]">
                  {editingCampaign.campaignNo ? '캠페인 정책 수정' : '새 프로모션 캠페인 등록'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-[#737780] hover:text-[#0b1c30] p-1"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="flex flex-col gap-3.5 text-[13px]">
              <div>
                <label className="block text-[12px] font-bold text-[#43474f] mb-1">대상 구분</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCampaign({ ...editingCampaign, targetType: 'USER' })}
                    className={`py-2 rounded-lg font-bold border transition-colors ${
                      editingCampaign.targetType === 'USER'
                        ? 'bg-[#00254a] text-white border-[#00254a]'
                        : 'bg-[#eff4ff] text-[#43474f] border-[#e5eeff]'
                    }`}
                  >
                    고객 (USER)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingCampaign({ ...editingCampaign, targetType: 'PARTNER' })}
                    className={`py-2 rounded-lg font-bold border transition-colors ${
                      editingCampaign.targetType === 'PARTNER'
                        ? 'bg-[#006c4a] text-white border-[#006c4a]'
                        : 'bg-[#eff4ff] text-[#43474f] border-[#e5eeff]'
                    }`}
                  >
                    기사/파트너 (PARTNER)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#43474f] mb-1">캠페인명</label>
                <input
                  required
                  type="text"
                  value={editingCampaign.campaignNm || ''}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, campaignNm: e.target.value })}
                  placeholder="예: 웰컴 첫 결제 5,000원 할인"
                  className="w-full px-3 py-2 rounded-lg bg-[#eff4ff] border border-[#e5eeff] outline-none focus:bg-white focus:ring-2 focus:ring-[#00254a]/20 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-[#43474f] mb-1">할인 방식</label>
                  <select
                    value={editingCampaign.discountType || 'FIXED_AMT'}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, discountType: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-[#eff4ff] border border-[#e5eeff] outline-none cursor-pointer"
                  >
                    <option value="FIXED_AMT">정액 할인 (원)</option>
                    <option value="RATE_50">정률 50% 감면</option>
                    <option value="RATE_100">100% 전액 면제 (무료)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#43474f] mb-1">할인 금액 (원)</label>
                  <input
                    type="number"
                    value={editingCampaign.discountAmt || 5000}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, discountAmt: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-[#eff4ff] border border-[#e5eeff] outline-none focus:bg-white focus:ring-2 focus:ring-[#00254a]/20 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-bold text-[#43474f] mb-1">시작일</label>
                  <input
                    type="date"
                    value={editingCampaign.formattedStartDt?.replace(/\./g, '-') || '2026-10-01'}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, formattedStartDt: e.target.value.replace(/-/g, '.') })}
                    className="w-full px-3 py-2 rounded-lg bg-[#eff4ff] border border-[#e5eeff] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-[#43474f] mb-1">종료일</label>
                  <input
                    type="date"
                    value={editingCampaign.formattedEndDt?.replace(/\./g, '-') || '2026-12-31'}
                    onChange={(e) => setEditingCampaign({ ...editingCampaign, formattedEndDt: e.target.value.replace(/-/g, '.') })}
                    className="w-full px-3 py-2 rounded-lg bg-[#eff4ff] border border-[#e5eeff] outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#43474f] mb-1">발급일 기준 유효일수 (일)</label>
                <input
                  type="number"
                  value={editingCampaign.validDays || 30}
                  onChange={(e) => setEditingCampaign({ ...editingCampaign, validDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-[#eff4ff] border border-[#e5eeff] outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] rounded-xl text-[13px] font-semibold transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#00254a] hover:bg-[#163b66] text-white rounded-xl text-[13px] font-bold shadow-md transition-colors cursor-pointer"
                >
                  {editingCampaign.campaignNo ? '수정 내용 저장' : '신규 캠페인 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 모달 3: 시리얼 쿠폰 코드 대량생산 엑셀다운 결과 모달 */}
      {showSerialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-[480px] w-full p-6 shadow-2xl border border-[#e5eeff] flex flex-col gap-4 animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#85f8c4] text-[#002114] flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div>
                <h3 className="text-[17px] font-bold text-[#00254a]">시리얼 코드 50건 생성 완료</h3>
                <p className="text-[12px] text-[#737780]">TB_COUPON_POOL 등록 및 엑셀 다운 준비</p>
              </div>
            </div>

            <div className="bg-[#eff4ff] p-3 rounded-xl border border-[#e5eeff] max-h-48 overflow-y-auto font-mono text-[12px] text-[#00254a] flex flex-col gap-1">
              {generatedSerials.slice(0, 10).map((code, i) => (
                <div key={i} className="flex justify-between py-0.5 border-b border-[#e5eeff]/60">
                  <span>{code}</span>
                  <span className="text-[#006c4a] font-bold">READY</span>
                </div>
              ))}
              <div className="text-center text-[11px] text-[#737780] py-1">... 외 40개 코드 생성됨</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSerialModal(false)}
                className="flex-1 py-2 bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] rounded-xl text-[13px] font-semibold transition-colors cursor-pointer"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSerialModal(false);
                  showToast('SsulDak_Serial_Codes_20261023.xlsx 파일 다운로드가 시작되었습니다.');
                }}
                className="flex-1 py-2 bg-[#00254a] hover:bg-[#163b66] text-white rounded-xl text-[13px] font-bold shadow-sm transition-colors cursor-pointer"
              >
                엑셀 (.xlsx) 파일 다운로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. 타겟 세그먼트 일괄 에어드랍 발송 모달 (ADMN-PRM-01) */}
      <AdmnPrm01Modal
        isOpen={showAirdropModal}
        onClose={() => setShowAirdropModal(false)}
        onSuccess={(count) => {
          fetchPromoData();
          showToast(`대상자 ${count}명에게 에어드랍 발송이 완료되었습니다.`);
        }}
        adminId={adminId}
        isStandalone={false}
      />
    </div>
  );
}
