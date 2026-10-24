'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';

// =============================================================================
// 인터페이스 정의
// =============================================================================

export interface BidPartnerInfo {
  bidNo: string;
  slotNo: string;
  ptnrNo: string;
  companyNm: string;
  profileImgUrl: string;
  avgRating: number;
  reviewCnt: number;
  bidAmt: number;
  workerCnt: number;
  estDurationHours: number;
  bidStatCd: string;
  proposalNote?: string;
  bidDt: string;
  dispatchRate?: string;
  isMaster?: boolean;
  isOfficial?: boolean;
  features?: string[];
}

export interface SlotInfo {
  slotNo: string;
  serviceTypeCd: 'REGULAR' | 'APPLIANCE' | 'MOVEIN';
  subItemCd?: string;
  subItemNm: string;
  slotStatCd: 'WAITING' | 'QUOTED' | 'CONTRACTED' | 'UNQUOTED_EXPIRED' | 'CANCELLED';
  proposedUnitAmt: number;
  expireDt: string;
  isExpiredYn: 'Y' | 'N';
  slotIndex: number;
  bids: BidPartnerInfo[];
}

export interface RequestHeaderInfo {
  reqNo: string;
  userNo: string;
  reqStatCd: string;
  addrRoad: string;
  addrDetail: string;
  totalProposedAmt: number;
  regDt: string;
  buildingName?: string;
  serviceTypes?: string[];
  desiredStartDt?: string;
  timeRemainingHours?: number;
}

export interface UserQot00Props {
  initialReqNo?: string;
  initialUserNo?: string;
  onNavigate?: (path: string, payload?: Record<string, unknown>) => void;
  apiEndpoint?: string;
  logoSrc?: string;
}

export const UserQot00Screen: React.FC<UserQot00Props> = ({
  initialReqNo = 'REQ202610210001',
  initialUserNo = 'U20261000001',
  onNavigate,
  apiEndpoint = '/api/user/user_qot_00',
  logoSrc = 'https://lh3.googleusercontent.com/aida/AEtjO1XlE5dGCq6Awu7YGl9jLXQCTA7t0IZsmJfZyUQSy_So39r5B_9DgKVRpNgn2lIWPB_vkFwbyJvxRauYr8NrBr8Ev5HNLHcxNuK1dyz8aQQON3nkYvZA0iFnBntaXm5YE-GRy1fdElMY7mqcgcLiOn6Igu7ZM3Dehje1BVaFd_UK3AteIgpBjbsnSSlBOEigu2qfzX9XgGZgL6mO3R9fV4YtByyCV6ArO-jWEfVoHeAtGM8Q98I4mu5IqYg',
}) => {
  // ---------------------------------------------------------------------------
  // 1. 상태 관리
  // ---------------------------------------------------------------------------
  const [isLoading, setIsLoading] = useState(true);
  const [header, setHeader] = useState<RequestHeaderInfo>({
    reqNo: initialReqNo,
    userNo: initialUserNo,
    reqStatCd: 'OPEN',
    addrRoad: '경기 고양시 일산동구 중앙로 1234',
    addrDetail: '지상 4층 건물 (엘리베이터 없음)',
    totalProposedAmt: 320000,
    regDt: '2026.10.21',
    buildingName: '일산동구 중앙로 빌라',
    serviceTypes: ['정기청소 3개월', '가전케어 에어컨'],
    desiredStartDt: '2026.11.01 (화)',
    timeRemainingHours: 14,
  });

  const [slots, setSlots] = useState<SlotInfo[]>([]);
  const [selectedSlotNos, setSelectedSlotNos] = useState<string[]>([]);
  const [useCoupon, setUseCoupon] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ---------------------------------------------------------------------------
  // 2. 백엔드 API 연동 (GET_BID_LIST)
  // ---------------------------------------------------------------------------
  const fetchBidList = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'GET_BID_LIST',
          userNo: initialUserNo,
          reqNo: initialReqNo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.requestHeader) {
          setHeader(data.requestHeader);
        }
        if (data.slots && data.slots.length > 0) {
          setSlots(data.slots);
          // 입찰이 들어온 슬롯은 기본적으로 전체 선택
          const quotedSlots = data.slots
            .filter((s: SlotInfo) => s.slotStatCd === 'QUOTED' && s.bids.length > 0)
            .map((s: SlotInfo) => s.slotNo);
          setSelectedSlotNos(quotedSlots);
        }
      }
    } catch (err) {
      console.warn('API error (using fallback state):', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint, initialReqNo, initialUserNo]);

  useEffect(() => {
    fetchBidList();
  }, [fetchBidList]);

  // ---------------------------------------------------------------------------
  // 3. 다중 선택 체크박스 조작
  // ---------------------------------------------------------------------------
  const handleToggleSlot = (slotNo: string) => {
    setSelectedSlotNos((prev) =>
      prev.includes(slotNo) ? prev.filter((s) => s !== slotNo) : [...prev, slotNo]
    );
  };

  // ---------------------------------------------------------------------------
  // 4. 용역 금액 및 데이터 이용료 실시간 산출
  // ---------------------------------------------------------------------------
  const calculation = useMemo(() => {
    let totalServiceAmt = 0;
    const selectedList: { slotNo: string; subItemNm: string; amt: number; bidNo?: string }[] = [];

    slots.forEach((slot) => {
      if (selectedSlotNos.includes(slot.slotNo)) {
        // 입찰 제안가가 있으면 첫 번째 제안가, 없으면 이용자 희망가
        const bidPrice =
          slot.bids.length > 0 ? slot.bids[0].bidAmt : slot.proposedUnitAmt;
        totalServiceAmt += bidPrice;
        selectedList.push({
          slotNo: slot.slotNo,
          subItemNm: slot.subItemNm,
          amt: bidPrice,
          bidNo: slot.bids.length > 0 ? slot.bids[0].bidNo : undefined,
        });
      }
    });

    // 데이터 이용료: max(총 용역비 * 3.3%, 33000원) (VAT 포함)
    const rawFee = Math.round(totalServiceAmt * 0.033);
    const dataFee = totalServiceAmt > 0 ? Math.max(rawFee, 33000) : 0;
    const couponDiscount = useCoupon && totalServiceAmt > 0 ? 5000 : 0;
    const finalTotal = Math.max(0, totalServiceAmt + dataFee - couponDiscount);

    return {
      totalServiceAmt,
      dataFee,
      couponDiscount,
      finalTotal,
      selectedList,
      count: selectedList.length,
    };
  }, [slots, selectedSlotNos, useCoupon]);

  // ---------------------------------------------------------------------------
  // 5. 계약 및 결제 진행 (USER-CNT-00)
  // ---------------------------------------------------------------------------
  const handleProceedContract = () => {
    if (calculation.count === 0) {
      alert('계약을 진행할 견적 항목을 1개 이상 선택해 주세요.');
      return;
    }

    const payload = {
      reqNo: header.reqNo,
      selectedSlots: calculation.selectedList,
      totalServiceAmt: calculation.totalServiceAmt,
      dataFee: calculation.dataFee,
      couponDiscount: calculation.couponDiscount,
      finalTotal: calculation.finalTotal,
    };

    if (onNavigate) {
      onNavigate('USER-CNT-00', payload);
    } else {
      alert(
        `[USER-CNT-00] 계약 및 결제 화면으로 이동합니다.\n\n` +
          `- 선택 공정: ${calculation.count}건\n` +
          `- 총 결제 예상액: ${calculation.finalTotal.toLocaleString()}원\n` +
          `(용역비 ${calculation.totalServiceAmt.toLocaleString()}원 + 이용료 ${calculation.dataFee.toLocaleString()}원 - 쿠폰 ${calculation.couponDiscount.toLocaleString()}원)`
      );
    }
  };

  // 파트너 상세 보기 (USER-QOT-01)
  const handleViewPartnerDetail = (ptnrNo: string, companyNm: string, slotNo: string) => {
    if (onNavigate) {
      onNavigate('USER-QOT-01', { ptnrNo, companyNm, slotNo, reqNo: header.reqNo });
    } else {
      alert(`[USER-QOT-01] '${companyNm}' 파트너의 상세 프로필 및 시공 계획서를 확인합니다.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans antialiased flex flex-col justify-between">
      {/* 토스트 피드백 */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl bg-[#00254a] text-white text-[13px] font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[18px] text-[#82f5c1]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =====================================================================
          1. Header (User HTML identical standard top bar)
         ===================================================================== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#f8f9ff]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.04)] border-b border-[#e5eeff]">
        <div className="h-16 max-w-7xl mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <a
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => onNavigate && onNavigate('USER-COM-00')}
            >
              <img
                alt="SsulDak Brand Logo"
                className="h-8 w-auto object-contain"
                src={logoSrc}
              />
              <span className="text-[17px] text-[#00254a] tracking-tight font-bold hidden sm:inline-block">
                쓸고닦고
              </span>
            </a>
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#eff4ff] text-[#00254a] hover:bg-[#e5eeff] transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[18px] text-[#006c4a]">location_on</span>
              <span className="text-[13px] font-semibold text-[#0b1c30]">경기 고양시 일산동구</span>
              <span className="material-symbols-outlined text-[16px] text-[#737780]">keyboard_arrow_down</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a
              onClick={() => onNavigate && onNavigate('USER-COM-00')}
              className="text-[15px] text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer"
            >
              홈
            </a>
            <a className="text-[15px] bg-[#163b66] text-white font-bold rounded-lg px-3 py-1.5 cursor-pointer">
              견적현황
            </a>
            <a className="text-[15px] text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer">
              이용내역
            </a>
            <a className="text-[15px] text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer">
              쿠폰북
            </a>
            <a
              onClick={() => onNavigate && onNavigate('USER-ATH-03')}
              className="text-[15px] text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer"
            >
              마이
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              className="relative p-2 rounded-full text-[#43474f] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors cursor-pointer"
              title="쿠폰함"
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">confirmation_number</span>
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-[#006c4a]" />
            </button>
            <button
              className="relative p-2 rounded-full text-[#43474f] hover:bg-[#eff4ff] hover:text-[#0b1c30] transition-colors cursor-pointer"
              title="알림"
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              <span className="absolute top-1 right-0.5 min-w-[15px] h-[15px] px-[2px] rounded-full bg-[#ba1a1a] text-white text-[10px] leading-tight flex items-center justify-center font-bold">
                N
              </span>
            </button>
            <div
              onClick={() => onNavigate && onNavigate('USER-ATH-03')}
              className="w-8 h-8 rounded-full bg-[#00254a] flex items-center justify-center cursor-pointer shadow-sm text-white"
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. Main Layout Content
         ===================================================================== */}
      <main className="w-full pt-16 bg-[#f8f9ff] min-h-screen pb-20 md:pb-12">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-6">
          {/* Breadcrumb & Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[#43474f] text-[13px]">
              <a
                onClick={() => onNavigate && onNavigate('USER-COM-00')}
                className="hover:text-[#00254a] transition-colors cursor-pointer"
              >
                홈
              </a>
              <span className="material-symbols-outlined text-[16px] text-[#737780]">chevron_right</span>
              <span className="hover:text-[#00254a] transition-colors cursor-pointer">견적 현황</span>
              <span className="material-symbols-outlined text-[16px] text-[#737780]">chevron_right</span>
              <span className="text-[#0b1c30] font-bold">수신 청약 목록</span>
            </nav>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#dce9ff] rounded-full">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006c4a] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006c4a]" />
                </span>
                <span className="text-[11px] text-[#006c4a] font-bold">실시간 입찰 완료</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  fetchBidList();
                  showToast('청약 입찰 현황을 새로고침했습니다.');
                }}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#43474f] text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[16px] ${isLoading ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <span>새로고침</span>
              </button>
            </div>
          </div>

          {/* Header Section with Request Summary Card */}
          <div className="mb-6">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="px-2.5 py-1 rounded-full bg-[#85f8c4] text-[#005137] text-[11px] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">done_all</span>
                    견적 입찰 완료 ({slots.filter((s) => s.bids.length > 0).length}/{slots.length || 2} 제안 수신)
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#ffdad6] text-[#93000a] text-[11px] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    마감까지 {header.timeRemainingHours || 14}시간 남음
                  </span>
                </div>
                <h1 className="text-[28px] md:text-[36px] text-[#0b1c30] tracking-tight font-extrabold">
                  받은 견적 및 청약 현황
                </h1>
              </div>
              <p className="text-[13px] text-[#43474f] max-w-md leading-relaxed">
                검증된 청약 전문 마스터 파트너들이 고객님의 요청서를 정밀 검토 후 제출한 확정 견적서입니다. 각 공정별로 원하는 파트너를 선택하여 계약할 수 있습니다.
              </p>
            </div>

            {/* Request Details Summary Banner */}
            <div className="w-full bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-[#e5eeff]">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="flex items-start gap-3 md:col-span-2">
                  <div className="w-12 h-12 rounded-xl bg-[#eff4ff] flex items-center justify-center shrink-0 text-[#00254a]">
                    <span className="material-symbols-outlined text-[28px]">apartment</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[17px] text-[#0b1c30] font-bold">
                        {header.buildingName || '일산동구 중앙로 빌라'}
                      </span>
                      <span className="text-[11px] text-[#737780] px-1.5 py-0.5 bg-[#e5eeff] rounded font-mono font-bold">
                        {header.reqNo}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#43474f]">{header.addrRoad} ({header.addrDetail})</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-[#737780] uppercase tracking-wider block font-semibold">
                    신청 공정 분류
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(header.serviceTypes || ['정기청소 3개월', '가전케어 에어컨']).map((type, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          idx === 0 ? 'bg-[#d4e3ff] text-[#254873]' : 'bg-[#e5eeff] text-[#0b1c30]'
                        }`}
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6">
                  <div className="text-left md:text-right">
                    <span className="text-[11px] text-[#737780] uppercase tracking-wider block font-semibold">
                      요청 접수일
                    </span>
                    <span className="text-[13px] text-[#0b1c30] font-semibold">
                      {header.regDt} 접수
                    </span>
                  </div>
                  <div className="h-8 w-px bg-[#dce9ff] hidden md:block" />
                  <div className="text-left md:text-right">
                    <span className="text-[11px] text-[#737780] uppercase tracking-wider block font-semibold">
                      희망 시공 시작
                    </span>
                    <span className="text-[13px] text-[#00254a] font-bold">
                      {header.desiredStartDt || '2026.11.01 (화)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================================================
              Main Content Grid (8 Cols Left, 4 Cols Right)
             =================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Bid Proposals */}
            <section className="lg:col-span-8 flex flex-col gap-4">
              {/* Selection Mode Info Banner */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#eff4ff] border border-[#dce9ff] text-[#0b1c30]">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#006c4a] text-[24px]">tune</span>
                  <div>
                    <span className="text-[15px] font-bold text-[#0b1c30] block">
                      분리 계약 파트너 제안 선택 (총 {slots.length || 2}개 공정)
                    </span>
                    <span className="text-[13px] text-[#43474f]">
                      원하는 제안만 개별 체크하여 파트너별로 각각 분리 체결하거나 일괄 체결할 수 있습니다.
                    </span>
                  </div>
                </div>
                <span className="hidden sm:inline-flex px-2.5 py-1 bg-white text-[#006c4a] text-[11px] font-bold rounded-full shadow-2xs border border-[#82f5c1]">
                  개별선택 가능
                </span>
              </div>

              {/* Slots List */}
              {slots.map((slot) => {
                const isSelected = selectedSlotNos.includes(slot.slotNo);
                const hasBid = slot.bids.length > 0;
                const topBid = hasBid ? slot.bids[0] : null;

                return (
                  <article
                    key={slot.slotNo}
                    className={`bg-white rounded-2xl p-6 shadow-sm border transition-all ${
                      isSelected
                        ? 'border-[#163b66] ring-1 ring-[#163b66]/20'
                        : 'border-[#e5eeff] hover:shadow-md'
                    }`}
                  >
                    {/* Top Row: Checkbox & Category & Bid Amount */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#eff4ff]">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!hasBid || slot.slotStatCd === 'UNQUOTED_EXPIRED'}
                          onChange={() => handleToggleSlot(slot.slotNo)}
                          className="w-5 h-5 rounded border-[#c3c6d0] text-[#00254a] focus:ring-[#00254a] accent-[#00254a] cursor-pointer disabled:opacity-40"
                        />
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-tight ${
                              slot.serviceTypeCd === 'REGULAR'
                                ? 'bg-[#163b66] text-white'
                                : 'bg-[#82f5c1] text-[#00714e]'
                            }`}
                          >
                            공정 0{slot.slotIndex}
                          </span>
                          <span className="text-[18px] text-[#0b1c30] font-bold">
                            {slot.subItemNm}
                          </span>
                        </div>
                      </label>

                      <div className="text-left sm:text-right pl-8 sm:pl-0">
                        <div className="flex items-baseline gap-1 sm:justify-end">
                          <span className="text-[26px] font-bold text-[#00254a] font-mono">
                            {(topBid ? topBid.bidAmt : slot.proposedUnitAmt).toLocaleString()}
                          </span>
                          <span className="text-[15px] font-bold text-[#0b1c30]">원</span>
                        </div>
                        <span className="text-[13px] text-[#43474f]">
                          {slot.serviceTypeCd === 'REGULAR'
                            ? '월 4회 방문 · 3개월 총 12회 관리'
                            : '송풍팬·열교환기 완전분해 고압살균세척'}
                        </span>
                      </div>
                    </div>

                    {/* Partner Bio Block */}
                    {topBid ? (
                      <div className="p-4 rounded-xl bg-[#eff4ff] my-4 border border-[#dce9ff]/60">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-white shrink-0 border border-[#c3c6d0] shadow-2xs">
                              <img
                                className="w-full h-full object-cover"
                                alt={topBid.companyNm}
                                src={topBid.profileImgUrl}
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-[17px] text-[#0b1c30] font-bold">
                                  {topBid.companyNm}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-0.5 ${
                                    topBid.isMaster
                                      ? 'bg-[#ffddb8] text-[#2a1700]'
                                      : 'bg-[#d3e4fe] text-[#00254a]'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[13px]">
                                    {topBid.isMaster ? 'verified' : 'verified_user'}
                                  </span>
                                  <span>{topBid.isMaster ? '마스터 파트너' : '공식인증 엔지니어'}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <div className="flex items-center text-[11px] font-bold text-[#0b1c30]">
                                  <span
                                    className="material-symbols-outlined text-[16px] text-[#ffb95f]"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                  >
                                    star
                                  </span>
                                  <span className="ml-0.5">{topBid.avgRating.toFixed(1)}</span>
                                  <span className="text-[#737780] font-normal ml-0.5">
                                    ({topBid.reviewCnt}개 리뷰)
                                  </span>
                                </div>
                                <span className="text-[#737780] text-xs">|</span>
                                <span className="text-[11px] text-[#006c4a] font-semibold">
                                  {topBid.dispatchRate || '배차 확정률 99%'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 sm:self-center flex-wrap">
                            {(topBid.features || ['세금계산서 발행', '실시간 사진 전송']).map((feat, fIdx) => (
                              <span
                                key={fIdx}
                                className="px-2 py-1 bg-white text-[#43474f] rounded-lg text-[11px] font-medium border border-[#e5eeff] shadow-2xs"
                              >
                                {feat}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : slot.slotStatCd === 'UNQUOTED_EXPIRED' ? (
                      <div className="p-4 rounded-xl bg-[#ffdad6]/40 text-[#ba1a1a] my-4 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[13px]">
                          <span className="material-symbols-outlined text-[20px]">error</span>
                          <span>1주일 동안 청약이 접수되지 않아 공고가 만료되었습니다.</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => alert(`슬롯 [${slot.slotNo}] 재등록 절차로 이동합니다.`)}
                          className="px-3 py-1 rounded-lg bg-white text-[#ba1a1a] font-bold text-[11px] border border-[#ffdad6]"
                        >
                          재등록 신청
                        </button>
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl bg-[#eff4ff]/60 text-center my-4 space-y-2">
                        <div className="w-8 h-8 rounded-full bg-[#dce9ff] text-[#00254a] flex items-center justify-center mx-auto">
                          <span className="material-symbols-outlined text-[20px] animate-spin">
                            hourglass_top
                          </span>
                        </div>
                        <p className="text-[13px] font-semibold text-[#00254a]">
                          전문 파트너의 청약을 기다리고 있습니다...
                        </p>
                        <p className="text-[11px] text-[#737780]">
                          1주일 이내에 매칭 제안이 수신되면 카카오 알림톡으로 안내해 드립니다.
                        </p>
                      </div>
                    )}

                    {/* Detailed Specs Grid */}
                    {topBid && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                        <div className="flex items-start gap-2 p-3 rounded-xl bg-[#f8f9ff] border border-[#eff4ff]">
                          <span className="material-symbols-outlined text-[#00254a] text-[20px] shrink-0 mt-0.5">
                            {slot.serviceTypeCd === 'REGULAR' ? 'group' : 'engineering'}
                          </span>
                          <div>
                            <span className="text-[11px] text-[#737780] block font-semibold">
                              {slot.serviceTypeCd === 'REGULAR' ? '투입 인력 및 일정' : '엔지니어 & 세척 공정'}
                            </span>
                            <span className="text-[13px] text-[#0b1c30] font-medium leading-tight block">
                              {slot.serviceTypeCd === 'REGULAR'
                                ? `전문 클리너 ${topBid.workerCnt}명 1조 · 회당 약 ${topBid.estDurationHours}시간 소요 (총 12회)`
                                : `전문 엔지니어 ${topBid.workerCnt}명 전담 · 약 ${topBid.estDurationHours}시간 소요 (완전분해)`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-start gap-2 p-3 rounded-xl bg-[#f8f9ff] border border-[#eff4ff]">
                          <span className="material-symbols-outlined text-[#006c4a] text-[20px] shrink-0 mt-0.5">
                            {slot.serviceTypeCd === 'REGULAR' ? 'shield_with_heart' : 'sanitizer'}
                          </span>
                          <div>
                            <span className="text-[11px] text-[#737780] block font-semibold">
                              {slot.serviceTypeCd === 'REGULAR' ? '안심 보증 & 케어 범위' : '안심 보증 & 사후 관리'}
                            </span>
                            <span className="text-[13px] text-[#0b1c30] font-medium leading-tight block">
                              {slot.serviceTypeCd === 'REGULAR'
                                ? '친환경 고압수세 및 DB손해보험 배상책임 1억원 가입'
                                : '피톤치드 연무 항균 코팅 및 시공 후 30일 무상 AS'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bottom Action */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-[#eff4ff]">
                      <span className="text-[12px] text-[#737780]">
                        {slot.serviceTypeCd === 'REGULAR'
                          ? '범위: 1층 주차장 바닥/분리수거대 + 1~4층 복도 계단 및 창틀'
                          : '특이사항: 실외기 점검 및 배수 드레인 호스 무상 세척 지원'}
                      </span>
                      {topBid && (
                        <button
                          type="button"
                          onClick={() =>
                            handleViewPartnerDetail(topBid.ptnrNo, topBid.companyNm, slot.slotNo)
                          }
                          className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#00254a] text-[13px] font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          <span>프로필 및 상세 시공계획 확인 (USER-QOT-01)</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}

              {/* Service Guarantees Strip */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-white shadow-sm border border-[#e5eeff] flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#d4e3ff] flex items-center justify-center shrink-0 text-[#00254a]">
                    <span className="material-symbols-outlined text-[22px]">gavel</span>
                  </div>
                  <div>
                    <span className="text-[13px] text-[#0b1c30] font-bold block">전자계약 즉시발행</span>
                    <span className="text-[11px] text-[#43474f] leading-snug block">
                      표준약관 준수 전자서명 및 법적 보호 효력 자동 부여
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white shadow-sm border border-[#e5eeff] flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#85f8c4] flex items-center justify-center shrink-0 text-[#006c4a]">
                    <span className="material-symbols-outlined text-[22px]">lock</span>
                  </div>
                  <div>
                    <span className="text-[13px] text-[#0b1c30] font-bold block">에스크로 안전결제</span>
                    <span className="text-[11px] text-[#43474f] leading-snug block">
                      시공 후 고객 완공 승인 시에만 파트너 대금 정산
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white shadow-sm border border-[#e5eeff] flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#ffddb8] flex items-center justify-center shrink-0 text-[#543300]">
                    <span className="material-symbols-outlined text-[22px]">health_and_safety</span>
                  </div>
                  <div>
                    <span className="text-[13px] text-[#0b1c30] font-bold block">배상책임 1억 보장</span>
                    <span className="text-[11px] text-[#43474f] leading-snug block">
                      작업 중 발생할 수 있는 대인/대물 파손 전액 보상
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* =================================================================
                Right Column: Sticky Settlement & Platform Fee Sidebar
               ================================================================= */}
            <aside className="lg:col-span-4 sticky top-20 flex flex-col gap-4">
              {/* Main Calculation Card */}
              <div className="bg-white rounded-2xl shadow-md border border-[#e5eeff] overflow-hidden">
                {/* Card Header (Navy Theme) */}
                <div className="bg-[#163b66] p-4 text-white">
                  <div className="flex items-center justify-between">
                    <span className="text-[17px] font-bold">분리 계약 정산 및 이용료</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-white font-bold">
                      실시간 자동계산
                    </span>
                  </div>
                  <p className="text-[12px] text-[#86a6d7] mt-1">
                    체크한 견적 항목에 대한 총 견적액 합산입니다.
                  </p>
                </div>

                <div className="p-5 space-y-4">
                  {/* Items Selected List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-[#0b1c30]">
                        선택된 청소 항목 ({calculation.count}건)
                      </span>
                      <span className="text-[15px] font-bold text-[#00254a]">
                        {calculation.totalServiceAmt.toLocaleString()}원
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-[#eff4ff] space-y-1.5 text-[13px] text-[#43474f]">
                      {calculation.selectedList.length > 0 ? (
                        calculation.selectedList.map((item, idx) => (
                          <div key={item.slotNo} className="flex justify-between items-center">
                            <span className="flex items-center gap-1.5 truncate">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  idx === 0 ? 'bg-[#00254a]' : 'bg-[#006c4a]'
                                }`}
                              />
                              <span className="truncate">{item.subItemNm}</span>
                            </span>
                            <span className="font-semibold text-[#0b1c30] shrink-0 font-mono ml-2">
                              {item.amt.toLocaleString()}원
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-[#737780] text-center py-1">
                          선택된 공정 항목이 없습니다.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Platform Data Fee Section */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-bold text-[#0b1c30]">플랫폼 데이터 이용료</span>
                        <span
                          className="material-symbols-outlined text-[16px] text-[#737780] cursor-pointer"
                          title="중개 및 전자계약 시스템 라이선스 비용"
                        >
                          info
                        </span>
                      </div>
                      <span className="text-[15px] font-bold text-[#00254a]">
                        + {calculation.dataFee.toLocaleString()}원
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#f8f9ff] text-[#43474f] text-[12px] space-y-1 border border-[#eff4ff]">
                      <div className="flex items-center justify-between text-[11px] text-[#737780]">
                        <span>산출 기준: max(총액 × 3.3%, 33,000원)</span>
                        <span className="font-bold text-[#006c4a]">
                          {calculation.totalServiceAmt > 0 &&
                          calculation.totalServiceAmt * 0.033 <= 33000
                            ? '최저 요율 적용'
                            : '3.3% 요율 적용'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#737780] leading-tight">
                        ※ 파트너 최종 매칭 및 전자계약 체결 시 청구되는 중개·데이터 라이선스 비용입니다 (VAT 포함).
                      </p>
                    </div>
                  </div>

                  {/* Coupon / Discount Section */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-[#0b1c30]">할인 쿠폰 적용</span>
                      <span className="text-[15px] font-bold text-[#006c4a]">
                        - {calculation.couponDiscount.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#85f8c4]/30 text-[#005137]">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-[#006c4a]">
                          confirmation_number
                        </span>
                        <span className="text-[12px] font-semibold">신규 회원 웰컴 청약 쿠폰</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUseCoupon(!useCoupon);
                          showToast(useCoupon ? '쿠폰 적용이 해제되었습니다.' : '신규 회원 웰컴 쿠폰이 적용되었습니다.');
                        }}
                        className="text-xs text-[#006c4a] font-bold underline cursor-pointer"
                      >
                        {useCoupon ? '해제' : '적용'}
                      </button>
                    </div>
                  </div>

                  {/* Total Settlement Highlight Box */}
                  <div className="p-4 rounded-xl bg-[#e5eeff] space-y-1 border border-[#dce9ff]">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[16px] text-[#0b1c30] font-bold">총 최종 예상 결제액</span>
                      <div className="text-right">
                        <span className="text-[28px] font-extrabold text-[#00254a] font-mono">
                          {calculation.finalTotal.toLocaleString()}
                        </span>
                        <span className="text-[17px] font-bold text-[#00254a] ml-1">원</span>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-[#43474f]">
                      (용역비 {calculation.totalServiceAmt.toLocaleString()}원 + 이용료{' '}
                      {calculation.dataFee.toLocaleString()}원 - 쿠폰{' '}
                      {calculation.couponDiscount.toLocaleString()}원)
                    </div>
                  </div>

                  {/* Primary Action CTA Button */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={handleProceedContract}
                      disabled={calculation.count === 0}
                      className="w-full py-4 px-4 bg-[#00254a] hover:bg-[#163b66] text-white rounded-xl text-[16px] font-bold shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span>선택한 {calculation.count}건 계약 및 결제 진행하기 (USER-CNT-00)</span>
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                    <p className="text-[11px] text-[#737780] text-center leading-normal px-2">
                      결제 후 즉시 전자 계약서가 카카오 알림톡 및 이메일로 전송되며 파트너 일정이 최종 확정됩니다.
                    </p>
                  </div>

                  {/* Secondary Actions */}
                  <div className="pt-2 flex items-center justify-center gap-4 text-center">
                    <button
                      type="button"
                      onClick={() => alert('다른 마스터 파트너의 추가 입찰 견적을 계속 대기합니다.')}
                      className="text-[11px] text-[#43474f] hover:text-[#00254a] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">hourglass_top</span>
                      <span>다른 파트너 견적 추가 대기하기</span>
                    </button>
                    <span className="text-[#c3c6d0] text-xs">|</span>
                    <button
                      type="button"
                      onClick={() => alert('공고 수정/취소 기능으로 이동합니다.')}
                      className="text-[11px] text-[#737780] hover:text-[#ba1a1a] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit_note</span>
                      <span>공고 수정/취소</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Help & CS Box */}
              <div className="p-4 rounded-xl bg-white shadow-2xs border border-[#e5eeff] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#00254a] text-[24px]">support_agent</span>
                  <div>
                    <span className="text-[13px] text-[#0b1c30] font-bold block">견적 상담 고객센터</span>
                    <span className="text-[11px] text-[#43474f]">평일 09:00 ~ 18:00 (1588-3024)</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => alert('1:1 실시간 상담 채팅을 연결합니다.')}
                  className="px-3 py-1.5 rounded-lg bg-[#eff4ff] text-[#00254a] text-[11px] font-bold hover:bg-[#dce9ff] transition-colors cursor-pointer"
                >
                  1:1 문의
                </button>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* =====================================================================
          3. Mobile Bottom Nav
         ===================================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[#e5eeff] shadow-[0_-4px_16px_rgba(22,59,102,0.06)] md:hidden">
        <div className="max-w-md mx-auto grid grid-cols-4 h-16">
          <a
            onClick={() => onNavigate && onNavigate('USER-COM-00')}
            className="flex flex-col items-center justify-center gap-0.5 text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">home</span>
            <span className="text-[11px]">홈</span>
          </a>
          <a className="flex flex-col items-center justify-center gap-0.5 text-[#00254a] font-bold cursor-pointer">
            <span className="material-symbols-outlined text-[22px]">request_quote</span>
            <span className="text-[11px]">견적현황</span>
          </a>
          <a className="flex flex-col items-center justify-center gap-0.5 text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            <span className="text-[11px]">이용내역</span>
          </a>
          <a
            onClick={() => onNavigate && onNavigate('USER-ATH-03')}
            className="flex flex-col items-center justify-center gap-0.5 text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">person</span>
            <span className="text-[11px]">마이</span>
          </a>
        </div>
      </nav>

      {/* =====================================================================
          4. Footer
         ===================================================================== */}
      <footer className="hidden md:block w-full bg-[#eff4ff] mt-12 py-10 border-t border-[#dce9ff]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-4 text-[#43474f]">
          <div className="flex items-center gap-2">
            <span className="text-[17px] text-[#00254a] font-bold">쓸고닦고 (SsulDak)</span>
            <span className="text-xs text-[#737780]">|</span>
            <span className="text-[13px]">전문 홈&amp;빌딩 클리닝 케어 플랫폼</span>
          </div>
          <p className="text-[13px] text-[#43474f]">
            © 2026 SsulDak Inc. All rights reserved. 일산·수도권 공식 케어 센터
          </p>
        </div>
      </footer>
    </div>
  );
};

export default UserQot00Screen;
