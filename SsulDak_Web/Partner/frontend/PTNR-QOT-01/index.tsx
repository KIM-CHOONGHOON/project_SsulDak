import React, { useState, useEffect } from 'react';

/**
 * SsulDak (쓸고닦고) - PTNR-QOT-01 (고객 요청서 상세 보기)
 * 
 * 물리적 격리: SsulDak_Web/Partner/frontend/PTNR-QOT-01/index.tsx
 * 엔드포인트 URL: POST /api/partner/ptnr_qot_01
 * 연계 화면: PTNR-QOT-00 (공고 목록), PTNR-QOT-02 (청약서 작성 및 제안)
 */

export interface SubItemDetail {
  name: string;
  amt: number;
  cycle?: string;
  scopeDesc?: string;
}

export interface BuildingFacility {
  label: string;
  available: boolean;
}

export interface OrderDetailData {
  reqNo: string;
  slotNo: string;
  addrRoad: string;
  addrNotice: string;
  envSummary: string;
  floorCnt: number;
  serviceTypeCd: string;
  categoryLabel: string;
  title: string;
  subItemNm: string;
  contractDays: number;
  periodText: string;
  workHoursText: string;
  subItems: SubItemDetail[];
  totalProposedAmt: number;
  monthlyProposedAmt: number;
  isAmtFixed: boolean;
  reqMemo: string;
  customerNotes: string[];
  buildingFacilities: BuildingFacility[];
  distanceText: string;
  dDayText: string;
  bidCount: number;
  maxBidCount: number;
  expireDt: string;
}

export interface PhotoDetail {
  photoSeq: number;
  photoUrl: string;
  title: string;
  description: string;
}

export interface FeePreviewData {
  calcFormula: string;
  calcFeeAmt: number;
  minFeeAmt: number;
  dataFeeAmt: number;
  hasFreeCoupon: boolean;
  couponName: string;
  discountAmt: number;
  finalPartnerFeeAmt: number;
  estimatedNetRevenue: number;
}

interface PtnrQot01Props {
  initialSlotNo?: string;
  onNavigate?: (screen: string) => void;
}

export default function PtnrQot01({ initialSlotNo, onNavigate }: PtnrQot01Props) {
  // 슬롯 번호 파싱 (props 또는 URL hash)
  const getSlotNo = (): string => {
    if (initialSlotNo) return initialSlotNo;
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const match = hash.match(/slotNo=([^&]+)/);
      if (match) return match[1];
    }
    return 'SLOT202610230001';
  };

  const slotNo = getSlotNo();

  // 상태 관리
  const [loading, setLoading] = useState<boolean>(true);
  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [photos, setPhotos] = useState<PhotoDetail[]>([]);
  const [feePreview, setFeePreview] = useState<FeePreviewData | null>(null);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 모달 상태
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoDetail | null>(null);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isApplyConfirmOpen, setIsApplyConfirmOpen] = useState<boolean>(false);

  // 토스트 헬퍼
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // 상세 데이터 로딩
  useEffect(() => {
    const fetchOrderDetail = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/partner/ptnr_qot_01', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer DUMMY_PARTNER_JWT_TOKEN'
          },
          body: JSON.stringify({
            actionType: 'GET_ORDER_DETAIL',
            ptnrNo: 'P20261000001',
            slotNo
          })
        });

        if (response.ok) {
          const json = await response.json();
          if (json.success) {
            setOrder(json.order);
            setPhotos(json.photos || []);
            setFeePreview(json.feePreview);
          }
        }
      } catch (err) {
        console.error('Failed to load order detail:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [slotNo]);

  // 클립보드 공유
  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      showToast('공고 상세 페이지 링크가 클립보드에 복사되었습니다.');
    }
  };

  // 북마크 토글
  const handleToggleBookmark = () => {
    setIsBookmarked(prev => {
      const next = !prev;
      if (next) showToast('관심 공고 목록에 안전하게 저장되었습니다.');
      else showToast('관심 공고 저장을 해제했습니다.');
      return next;
    });
  };

  // 청약서 작성 이동 핸들러
  const handleProceedApply = () => {
    setIsApplyConfirmOpen(false);
    if (onNavigate) {
      onNavigate(`PTNR-QOT-02?slotNo=${order?.slotNo || slotNo}`);
    } else {
      window.location.hash = `#ptnr-qot-02?slotNo=${order?.slotNo || slotNo}`;
    }
  };

  if (loading) {
    return (
      <div className="bg-background font-body-md text-on-surface min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-label-md text-label-md text-on-surface-variant font-medium">
            고객 요청서 및 현장 환경 상세 정보를 불러오는 중입니다...
          </p>
        </div>
      </div>
    );
  }

  const currentOrder = order || {
    reqNo: 'REQ202610210001',
    slotNo: 'SLOT202610230001',
    addrRoad: '경기 고양시 일산동구 중앙로 일대',
    addrNotice: '상세 동/호수 및 현장 공동현관 비밀번호는 파트너 매칭 청약 배차 확정 및 결제 완료 후 시스템에서 자동 잠금 해제되어 열람 가능합니다.',
    envSummary: '엘리베이터 있음, 필로티 전용 주차장 무료 주차 1대 지원',
    floorCnt: 4,
    serviceTypeCd: 'REGULAR',
    categoryLabel: '정기청소 3개월',
    title: '[정기청소 3개월] 일산동구 중앙로 4층 상가주택 정기 순회관리',
    subItemNm: '정기청소 3개월',
    contractDays: 92,
    periodText: '2026.11.01 ~ 2027.01.31 (총 12회차 주 1회 순회정기)',
    workHoursText: '매주 수요일 오전 10:00 이전 (키패드 출입)',
    subItems: [
      {
        name: '계단 및 공용 복도 순회 케어',
        amt: 180000,
        cycle: '주 1회 (월 4회) × 3개월 (월 60,000원 상당)',
        scopeDesc: '1~4층 계단실 먼지 집진, 바닥 세척, 창틀 먼지제거, 핸드레일 살균 소독'
      },
      {
        name: '건물 주위 및 1층 외곽 분리수거장 클리닝',
        amt: 60000,
        cycle: '주 1회 (월 4회) × 3개월 (월 20,000원 상당)',
        scopeDesc: '1층 주차장 쓰레기 수거, 재활용품 분리배출대 고압 물청소 및 잔재물 마대 정리'
      }
    ],
    totalProposedAmt: 240000,
    monthlyProposedAmt: 80000,
    isAmtFixed: true,
    reqMemo: '상가 1층에 음식점이 입점해 있어 계단실 2층 사이에 기름때와 음식 냄새가 유입될 수 있습니다. 친환경 탈취 약품과 바닥 스팀 청소를 꼭 정성스럽게 부탁드립니다.',
    customerNotes: [
      '상가 1층에 음식점이 입점해 있어 계단실 2층 사이에 기름때와 음식 냄새가 유입될 수 있습니다. 친환경 탈취 약품과 바닥 스팀 청소를 꼭 정성스럽게 부탁드립니다.',
      '매회차 시공 완료 후 전/후 비교 검수 사진 2장 이상 파트너 앱으로 등록해 주시면 안심하고 확인하겠습니다.'
    ],
    buildingFacilities: [
      { label: '엘리베이터 있음 (승강기 내부 벽면·바닥 포함)', available: true },
      { label: '필로티 전용 주차장 무료 주차 1대 지원', available: true },
      { label: '공용 수도/전기 사용 가능 (1층 계단 하부 수전함)', available: true },
      { label: '키패드 출입 비밀번호 사전 배차 연동 제공', available: true }
    ],
    distanceText: '거리 2.4km · 차량 10분',
    dDayText: '접수 마감 D-2 | 잔여 1개사 선착순 마감',
    bidCount: 2,
    maxBidCount: 3,
    expireDt: '2026-10-25'
  };

  const currentFee = feePreview || {
    calcFormula: 'max(대금×3.3%, 33,000원)',
    calcFeeAmt: 7920,
    minFeeAmt: 33000,
    dataFeeAmt: 33000,
    hasFreeCoupon: true,
    couponName: '[보유 중] 첫 배차 100% 무료 패스 쿠폰',
    discountAmt: 33000,
    finalPartnerFeeAmt: 0,
    estimatedNetRevenue: 240000
  };

  const compPercent = Math.min(100, Math.round((currentOrder.bidCount / currentOrder.maxBidCount) * 100));

  return (
    <div className="bg-background font-body-md text-on-surface min-h-screen flex flex-col antialiased">
      {/* 1. Header (Fixed GNB) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 shrink-0">
            <div 
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => window.location.hash = '#partner-dashboard'}
            >
              <span className="font-display text-headline-md tracking-tight text-primary font-bold">SsulDak</span>
              <span className="bg-primary-container text-on-primary font-label-sm text-label-sm px-2 py-0.5 rounded-lg tracking-wider font-bold">
                PARTNER CONSOLE
              </span>
            </div>
            <div className="hidden xl:flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-xl">
              <span className="font-label-md text-label-md text-on-surface font-semibold">반짝빌라클린</span>
              <span className="inline-flex items-center gap-1.5 bg-secondary-container px-2 py-0.5 rounded-full font-label-sm text-label-sm text-on-secondary-container font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                영업 중 (ON)
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1.5 bg-surface-container-low p-1 rounded-xl">
            <a className="px-3.5 py-1.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all" href="#partner-dashboard">
              홈
            </a>
            <a className="px-3.5 py-1.5 rounded-lg transition-all bg-primary-container text-on-primary font-bold shadow-sm" href="#partner-orders">
              공고목록/오더수신
            </a>
            <a className="px-3.5 py-1.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all" href="#partner-jobs">
              작업관리/시공보고
            </a>
            <a className="px-3.5 py-1.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all" href="#partner-settlement">
              정산/혜택관리
            </a>
            <a className="px-3.5 py-1.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all" href="#partner-profile">
              프로필/지역설정
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button aria-label="Notifications" className="relative p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all" type="button">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-error text-on-error font-label-sm text-[10px] leading-none rounded-full flex items-center justify-center px-1 font-bold">
                4
              </span>
            </button>
            <div className="flex items-center gap-2.5 pl-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xs shadow-sm">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="font-label-md text-label-md text-on-surface font-semibold">이수대표</span>
                <span className="font-label-sm text-[10px] text-on-tertiary-container font-bold">마스터 파트너</span>
              </div>
            </div>
            <button aria-label="Logout" className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-error transition-all" type="button" onClick={() => showToast('파트너 콘솔에서 안전하게 로그아웃되었습니다.')}>
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>

        {/* Sub-header Breadcrumb Row */}
        <div className="bg-surface-container-low/70 py-2 border-b border-surface-container-high/60">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between text-body-sm">
            <div className="flex items-center gap-2 text-on-surface-variant overflow-x-auto whitespace-nowrap">
              <a className="hover:text-primary transition-colors cursor-pointer" href="#partner-dashboard">홈</a>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <a className="hover:text-primary transition-colors cursor-pointer" href="#partner-dashboard">대시보드 (PTNR-DSH-00)</a>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="hover:text-primary transition-colors">오더 수신 센터</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <a className="hover:text-primary transition-colors cursor-pointer" href="#partner-orders">매칭 청약 공고 목록 (PTNR-QOT-00)</a>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="font-semibold text-primary">공고 상세 정보 (PTNR-QOT-01)</span>
            </div>
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="font-label-sm text-label-sm text-on-surface font-bold">실시간 수신 풀 정상 가동 중</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full pt-28 bg-background flex-1 max-w-7xl mx-auto px-6 lg:px-12 pb-16">
        <div className="flex flex-col w-full">
          
          {/* Top Navigation & Action Header */}
          <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-surface-container">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <a 
                  className="inline-flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors font-label-md text-label-md group cursor-pointer"
                  href="#partner-orders"
                >
                  <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">
                    arrow_back
                  </span>
                  <span>공고 목록으로 돌아가기 (PTNR-QOT-00)</span>
                </a>
              </div>
              <div className="flex items-center gap-1.5 text-on-surface-variant text-body-sm flex-wrap">
                <span>홈</span>
                <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                <span>대시보드 (PTNR-DSH-00)</span>
                <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                <span>공고 목록 (PTNR-QOT-00)</span>
                <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                <span className="font-semibold text-primary">고객 요청서 상세 (PTNR-QOT-01)</span>
              </div>
            </div>

            {/* Quick Utilities & Realtime State */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <div className="inline-flex items-center gap-2 bg-error-container/60 text-on-error-container px-3 py-1.5 rounded-full font-label-sm text-label-sm font-bold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-error animate-ping"></span>
                <span>{currentOrder.dDayText}</span>
              </div>
              <button 
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container rounded-xl shadow-sm transition-all font-label-md text-label-md cursor-pointer border border-surface-container-high/40"
                type="button"
                onClick={handleShare}
              >
                <span className="material-symbols-outlined text-[18px]">share</span>
                <span>공유</span>
              </button>
              <button 
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-lowest rounded-xl shadow-sm transition-all font-label-md text-label-md cursor-pointer border border-surface-container-high/40 ${isBookmarked ? 'text-amber-500 font-bold' : 'text-on-surface-variant hover:text-amber-500'}`}
                type="button"
                onClick={handleToggleBookmark}
              >
                <span 
                  className="material-symbols-outlined text-[18px]"
                  style={{ fontVariationSettings: isBookmarked ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {isBookmarked ? 'bookmark' : 'bookmark_border'}
                </span>
                <span>{isBookmarked ? '관심 공고 저장됨' : '관심 공고 저장'}</span>
              </button>
            </div>
          </div>

          {/* Main 2-Column Responsive Desktop Grid */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 items-start">
            
            {/* LEFT COLUMN: Primary Order & Environmental Detail (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* CARD A: Order Overview & Building Environment */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden border border-surface-container-high/50">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary-fixed/30 to-transparent rounded-full blur-3xl -z-0 pointer-events-none"></div>
                <div className="relative z-10 flex flex-col gap-5">
                  {/* Tag Cluster */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-primary text-on-primary px-2.5 py-1 rounded-lg font-label-sm text-label-sm tracking-wide font-bold">
                      {currentOrder.categoryLabel}
                    </span>
                    <span className="bg-error-container text-on-error-container px-2.5 py-1 rounded-lg font-label-sm text-label-sm font-bold">
                      D-2 응모마감
                    </span>
                    <span className="bg-secondary-container text-on-secondary-container px-2.5 py-1 rounded-lg font-label-sm text-label-sm font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">near_me</span>
                      {currentOrder.distanceText}
                    </span>
                    <span className="bg-surface-container text-on-surface-variant px-2.5 py-1 rounded-lg font-label-sm text-label-sm">
                      단독 상가주택 ({currentOrder.floorCnt}층)
                    </span>
                  </div>

                  {/* Main Title */}
                  <div className="flex flex-col gap-1">
                    <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight font-extrabold">
                      {currentOrder.title}
                    </h1>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      건물주 직영 관리 대상 빌딩으로 상가 및 원룸 복합 다가구의 쾌적한 위생 환경을 위한 지정 청약 공고
                    </p>
                  </div>

                  {/* Structured Info Panel */}
                  <div className="bg-surface-container-low rounded-xl p-5 flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Order ID */}
                      <div className="flex items-center justify-between bg-surface-container-lowest px-4 py-3 rounded-lg shadow-sm border border-surface-container-high/40">
                        <span className="text-on-surface-variant font-label-md text-label-md">공고 접수 번호</span>
                        <div className="flex items-center gap-2">
                          <span className="font-label-lg text-label-lg font-bold text-primary tracking-wider">
                            {currentOrder.reqNo}
                          </span>
                          <button 
                            className="p-1 hover:bg-surface-container text-on-surface-variant rounded transition-colors cursor-pointer"
                            title="공고번호 복사" 
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(currentOrder.reqNo);
                              showToast('공고 접수번호가 복사되었습니다.');
                            }}
                          >
                            <span className="material-symbols-outlined text-[16px]">content_copy</span>
                          </button>
                        </div>
                      </div>

                      {/* Location Reference */}
                      <div className="flex items-center justify-between bg-surface-container-lowest px-4 py-3 rounded-lg shadow-sm border border-surface-container-high/40">
                        <span className="text-on-surface-variant font-label-md text-label-md">기준 권역/위치</span>
                        <span className="font-label-lg text-label-lg font-semibold text-on-surface">
                          {currentOrder.addrRoad}
                        </span>
                      </div>
                    </div>

                    {/* Lock Notice Box */}
                    <div className="flex items-start gap-3 bg-primary/5 p-3.5 rounded-lg text-primary border border-primary/10">
                      <span className="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">lock_clock</span>
                      <div className="text-body-sm font-body-sm flex-1">
                        <p className="font-semibold text-primary">지번/상세 호수 및 현장 비번 보호 정책 적용 중</p>
                        <p className="text-on-surface-variant mt-0.5 leading-relaxed">
                          {currentOrder.addrNotice}
                        </p>
                      </div>
                    </div>

                    {/* Building Conditions & Facilities */}
                    <div className="flex flex-col gap-2 pt-1">
                      <span className="font-label-md text-label-md text-on-surface-variant font-bold">
                        건물 환경 및 현장 편의 시설
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {currentOrder.buildingFacilities.map((fac, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 bg-surface-container-lowest px-3.5 py-2.5 rounded-lg shadow-sm border border-surface-container-high/40">
                            <span className="material-symbols-outlined text-secondary text-[20px]">check_circle</span>
                            <span className="font-body-md text-body-md text-on-surface">{fac.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* CARD B: Detailed Cleaning Scope & Schedule */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 border border-surface-container-high/50">
                <div className="flex items-center justify-between pb-4 border-b border-surface-container">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-primary text-[24px]">assignment_turned_in</span>
                    <h2 className="font-headline-md text-headline-md text-primary font-bold">
                      세부 시공 범위 및 견적 구성 내역
                    </h2>
                  </div>
                  <span className="font-label-sm text-label-sm bg-surface-container text-on-surface-variant px-3 py-1 rounded-full font-semibold">
                    Scope of Work
                  </span>
                </div>

                {/* Schedule & Contract Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-surface-container-low rounded-xl flex items-start gap-3 border border-surface-container-high/30">
                    <span className="material-symbols-outlined text-on-primary-fixed-variant text-[22px] mt-0.5">date_range</span>
                    <div>
                      <p className="font-label-sm text-label-sm text-on-surface-variant font-bold">계약 수행 기간</p>
                      <p className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">
                        2026.11.01 ~ 2027.01.31
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        총 계약일수 {currentOrder.contractDays}일 ({currentOrder.periodText})
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-surface-container-low rounded-xl flex items-start gap-3 border border-surface-container-high/30">
                    <span className="material-symbols-outlined text-on-primary-fixed-variant text-[22px] mt-0.5">alarm_on</span>
                    <div>
                      <p className="font-label-sm text-label-sm text-on-surface-variant font-bold">희망 작업 시간대</p>
                      <p className="font-headline-sm text-headline-sm text-on-surface font-bold mt-0.5">
                        {currentOrder.workHoursText}
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        키패드 자동 출입 (비대면 자율 시공 후 전송)
                      </p>
                    </div>
                  </div>
                </div>

                {/* Service Itemized Breakdown */}
                <div className="flex flex-col gap-3">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    정기 시공 내역 및 표준 대금 산출식
                  </h3>

                  {currentOrder.subItems.map((item, idx) => (
                    <div key={idx} className="p-5 bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                          <span className="material-symbols-outlined text-[22px]">
                            {idx === 0 ? 'stairs' : 'delete_sweep'}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                              {item.name}
                            </h4>
                            <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-bold ${idx === 0 ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-secondary-container text-on-secondary-container'}`}>
                              {idx === 0 ? '기본 영역' : '외곽 환경'}
                            </span>
                          </div>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                            {item.scopeDesc}
                          </p>
                          <div className="flex items-center gap-2 mt-2 font-label-sm text-label-sm text-on-surface-variant flex-wrap">
                            <span className="bg-surface-container px-2 py-0.5 rounded">{item.cycle}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-headline-md text-headline-md text-primary font-extrabold">
                          {item.amt.toLocaleString()}
                        </span>
                        <span className="font-label-lg text-label-lg text-on-surface font-bold"> 원</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total Contract Price Banner */}
                <div className="bg-primary text-on-primary rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-label-sm text-label-sm bg-secondary text-on-secondary px-2 py-0.5 rounded font-bold">
                        고객 확정 제시 금액
                      </span>
                      <span className="font-label-sm text-label-sm text-on-primary-container">
                        금액 수정 불가 / 표준 도급 계약 조건
                      </span>
                    </div>
                    <h4 className="font-headline-md text-headline-md font-bold mt-1">
                      고객 제시 총 청소 용역 대금 (3개월 총합)
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-primary-container">
                      VAT 포함 / 월 {currentOrder.monthlyProposedAmt.toLocaleString()}원 익월 자동 정기결제 도급 모델
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-display text-display font-extrabold tracking-tight text-white">
                      {currentOrder.totalProposedAmt.toLocaleString()}
                    </span>
                    <span className="font-headline-md text-headline-md font-bold text-white/90"> 원</span>
                  </div>
                </div>

                {/* Customer Special Requirements */}
                <div className="bg-tertiary-fixed/40 rounded-xl p-5 flex flex-col gap-3 border border-tertiary-fixed/60">
                  <div className="flex items-center gap-2 text-on-tertiary-fixed font-bold">
                    <span className="material-symbols-outlined text-[20px]">notification_important</span>
                    <span className="font-headline-sm text-headline-sm">고객 특별 요구사항 (Special Customer Notes)</span>
                  </div>
                  <ul className="flex flex-col gap-2.5 text-body-md font-body-md text-on-surface">
                    {currentOrder.customerNotes.map((note, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-on-tertiary-fixed-variant text-[18px] shrink-0 mt-0.5">
                          {idx === 0 ? 'priority_high' : 'photo_camera'}
                        </span>
                        <span className="leading-relaxed">"{note}"</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* CARD C: Site Photos Gallery */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-6 border border-surface-container-high/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-4 border-b border-surface-container">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[24px]">collections</span>
                      <h2 className="font-headline-md text-headline-md text-primary font-bold">
                        현장 실사 사진 (Site Photos Gallery)
                      </h2>
                      <span className="bg-surface-container text-primary font-label-sm text-label-sm px-2 py-0.5 rounded-full font-bold">
                        {photos.length}장 등록됨
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      고객이 직접 촬영한 현장 실제 상태입니다. 사전 장비 준비 시 참고하십시오.
                    </p>
                  </div>
                  <span className="font-label-sm text-label-sm text-secondary font-bold flex items-center gap-1 self-start md:self-auto">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    실사 검증 완료
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {photos.map((photo, idx) => (
                    <div 
                      key={photo.photoSeq || idx}
                      className="flex flex-col gap-2 group cursor-pointer"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <div className="relative w-full h-56 rounded-xl overflow-hidden bg-surface-container shadow-sm border border-surface-container-high/40">
                        <img 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          alt={photo.title}
                          src={photo.photoUrl}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                          <span className="font-label-md text-label-md font-semibold drop-shadow-md line-clamp-1">
                            {photo.title}
                          </span>
                          <span className="material-symbols-outlined text-[20px] bg-white/20 p-1 rounded backdrop-blur">
                            zoom_in
                          </span>
                        </div>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                        {photo.description}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Site Recommendation Box */}
                <div className="p-4 bg-surface-container-low rounded-xl flex items-center gap-3 border border-surface-container-high/40">
                  <span className="material-symbols-outlined text-primary-container text-[24px]">construction</span>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2">
                    <span className="font-body-md text-body-md text-on-surface font-semibold">
                      시공 시 고압스팀기 및 보네트 광택기 투입 권장 구역입니다.
                    </span>
                    <span className="bg-primary-container text-on-primary font-label-sm text-label-sm px-2.5 py-1 rounded-md font-bold shrink-0 text-center">
                      장비 사전 적재 권장
                    </span>
                  </div>
                </div>
              </section>

              {/* CARD D: Partner Safe Matching Guarantees */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col gap-5 border border-surface-container-high/50">
                <div className="flex items-center gap-2.5 pb-2">
                  <span className="material-symbols-outlined text-secondary text-[24px]">verified_user</span>
                  <h2 className="font-headline-md text-headline-md text-primary font-bold">
                    썰닥 파트너 안심 시공 보호 규정 (Partner Safeguards)
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-2 border border-surface-container-high/30">
                    <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center text-secondary">
                      <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                    </div>
                    <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      100% 에스크로 안전 결제
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      고객이 용역비를 사전 예치하며, 작업 보고서 승인 즉시 익일(D+1) 정산 계좌로 100% 자동 지급 보장됩니다.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-2 border border-surface-container-high/30">
                    <div className="w-8 h-8 rounded-lg bg-error-container text-on-error-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">event_busy</span>
                    </div>
                    <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      일방 취소 시 100% 위약금
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      매칭 완료 후 고객의 일방적 계약 철회나 현장 노쇼 시 플랫폼 규정에 따라 위약금 100%를 본사에서 직불 보전합니다.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-2 border border-surface-container-high/30">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">health_and_safety</span>
                    </div>
                    <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      5억 영업배상책임보험
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      작업 중 발생할 수 있는 시설물 파손 및 대인 사고에 대해 DB손해보험 5억원 배상 연동 보험이 자동 적용됩니다.
                    </p>
                  </div>
                </div>
              </section>

            </div>

            {/* RIGHT STICKY ACTION PANEL (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-28">
              
              {/* CARD E: Partner Data Matching Fee & Benefit Preview */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-md flex flex-col gap-5 border border-surface-container-high/50">
                <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[22px]">calculate</span>
                    <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
                      파트너 데이터 이용료 산정
                    </h3>
                  </div>
                  <span className="font-label-sm text-label-sm bg-surface-container text-on-surface-variant px-2 py-0.5 rounded font-bold">
                    공식 요율
                  </span>
                </div>

                {/* Formula Breakdown Box */}
                <div className="bg-surface-container-low p-4 rounded-xl flex flex-col gap-3 border border-surface-container-high/30">
                  <div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
                    <span>공식 청약 산정식</span>
                    <span className="font-label-sm text-label-sm font-bold text-on-surface">
                      {currentFee.calcFormula}
                    </span>
                  </div>
                  <div className="text-body-sm font-body-sm text-on-surface-variant bg-surface-container-lowest p-2.5 rounded-lg flex items-center justify-between border border-surface-container-high/20">
                    <span>대금 연동 기준 ({currentOrder.totalProposedAmt.toLocaleString()}원 × 3.3%)</span>
                    <span className="font-semibold text-on-surface">
                      {currentFee.calcFeeAmt.toLocaleString()} 원
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-label-md text-label-md">
                    <span className="text-on-surface-variant">최저 데이터 기준 요율 적용</span>
                    <span className="font-bold text-primary">
                      {currentFee.minFeeAmt.toLocaleString()} 원
                    </span>
                  </div>
                  <div className="h-px bg-surface-container"></div>
                  <div className="flex items-center justify-between font-headline-sm text-headline-sm">
                    <span className="text-on-surface font-bold">정상 청약 데이터 이용료</span>
                    <span className="font-extrabold text-on-surface">
                      {currentFee.dataFeeAmt.toLocaleString()} 원
                    </span>
                  </div>
                </div>

                {/* Coupon Application Promotion Box */}
                <div className="bg-gradient-to-br from-secondary-container/90 to-secondary-container/50 border border-secondary/20 p-4 rounded-xl flex flex-col gap-3 shadow-sm">
                  <div className="flex items-center gap-2 text-on-secondary-container">
                    <span className="material-symbols-outlined text-[20px]">local_activity</span>
                    <span className="font-label-md text-label-md font-bold">
                      {currentFee.couponName} 자동 적용!
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5 text-body-sm font-body-sm">
                    <div className="flex items-center justify-between text-on-secondary-container">
                      <span>쿠폰 프로모션 할인</span>
                      <span className="font-bold text-secondary text-headline-sm">
                        -{currentFee.discountAmt.toLocaleString()} 원
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-secondary/20 font-label-lg text-label-lg">
                      <span className="text-on-secondary-container font-extrabold">이번 공고 파트너 최종 납부액</span>
                      <span className="font-display text-headline-md text-secondary font-extrabold">
                        {currentFee.finalPartnerFeeAmt.toLocaleString()} 원
                      </span>
                    </div>
                  </div>
                  <div className="bg-surface-container-lowest/90 px-3 py-2 rounded-lg flex items-center justify-between mt-1 border border-secondary/20">
                    <span className="font-label-sm text-label-sm text-on-surface font-semibold">파트너 예상 실수령액</span>
                    <span className="font-headline-sm text-headline-sm text-primary font-bold">
                      {currentFee.estimatedNetRevenue.toLocaleString()} 원 (전액 수령)
                    </span>
                  </div>
                </div>

                {/* Important Notice */}
                <p className="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-1.5 leading-snug">
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant mt-0.5 shrink-0">info</span>
                  <span>
                    청약서 제출 시에는 비용이 발생하지 않으며, 고객이 최종 파트너로 선택하여 계약이 정식 성립된 경우에만 무료 쿠폰이 차감됩니다.
                  </span>
                </p>
              </section>

              {/* CARD F: Action CTA & Quick Info */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 shadow-md flex flex-col gap-5 border border-surface-container-high/50">
                {/* Competition Progress Bar */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between font-label-md text-label-md">
                    <span className="text-on-surface-variant font-medium">현재 입찰 경쟁 현황</span>
                    <span className="text-error font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
                      {currentOrder.bidCount} / {currentOrder.maxBidCount}개사 참여 중 (잔여 1개사)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden flex">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-500" 
                      style={{ width: `${compPercent}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center justify-between text-body-sm font-body-sm text-on-surface-variant">
                    <span>경쟁률: {currentOrder.bidCount}:1</span>
                    <span className="text-error font-semibold">선착순 {currentOrder.maxBidCount}개사 도달 시 자동 조기 마감</span>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col gap-3 pt-2">
                  <button 
                    className="w-full h-[52px] bg-primary text-on-primary hover:bg-primary-container active:scale-[0.98] transition-all rounded-xl font-label-lg text-label-lg font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    type="button"
                    onClick={() => setIsApplyConfirmOpen(true)}
                  >
                    <span>조건 100% 수락하고 청약서 작성 (PTNR-QOT-02)</span>
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </button>
                  <button 
                    className="w-full h-11 bg-surface-container hover:bg-surface-container-high text-on-surface active:scale-[0.98] transition-all rounded-xl font-label-md text-label-md font-semibold flex items-center justify-center gap-2 cursor-pointer"
                    type="button"
                    onClick={() => setIsGuideModalOpen(true)}
                  >
                    <span className="material-symbols-outlined text-[18px]">menu_book</span>
                    <span>시공 가이드 및 매뉴얼 미리보기</span>
                  </button>
                </div>

                {/* Partner Emergency Desk Widget */}
                <div className="mt-2 pt-4 border-t border-surface-container flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-on-surface font-bold">
                    <span className="material-symbols-outlined text-secondary text-[20px]">support_agent</span>
                    <span className="font-label-md text-label-md">24시간 파트너 긴급 관제 센터</span>
                  </div>
                  <div className="bg-surface-container-low p-3.5 rounded-xl flex flex-col gap-2 border border-surface-container-high/30">
                    <div className="flex items-center justify-between">
                      <span className="text-body-sm font-body-sm text-on-surface-variant">현장 긴급 핫라인</span>
                      <a className="font-headline-sm text-headline-sm text-primary font-bold hover:underline" href="tel:1588-0000">
                        1588-0000 (ARS 2번)
                      </a>
                    </div>
                    <div className="flex items-center justify-between text-body-sm font-body-sm">
                      <span className="text-on-surface-variant">카카오 실시간 채널</span>
                      <span className="text-secondary font-bold">@쓸고닦고파트너</span>
                    </div>
                    <div className="flex items-center justify-between text-body-sm font-body-sm pt-1 border-t border-surface-container">
                      <span className="text-on-surface-variant">공고 전담 문의 시간</span>
                      <span className="text-on-surface font-medium">평일/주말 08:00 ~ 20:00</span>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-low mt-auto border-t border-surface-container-high/60">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8 border-b border-outline-variant/30">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary text-[26px]">verified_user</span>
              <div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">파트너 안심 보장제</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  노쇼 및 일방적 취소 시 위약금 100% 에스크로 정산 지원
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-primary-container text-[26px]">lock</span>
              <div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">100% 안전 에스크로</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  공사 착공 승인 및 시공 확인 즉시 자동 안심 입금 시스템
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-on-tertiary-container text-[26px]">support_agent</span>
              <div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">24/7 파트너 긴급 기술 지원</h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  현장 이슈 전담 ARS 1588-0000 (내선 2번)
                </p>
              </div>
            </div>
          </div>
          
          <div className="pt-6 flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                (주)썰닥 비즈니스 솔루션 | 대표이사: 사업부총괄 | 사업자등록번호: 214-88-00000 | 통신판매업신고: 제2024-서울강남-00000호
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                © 2024 SsulDak Partner Console. All rights reserved. 대한민국 마스터 청소·시공 파트너 전용 시스템
              </p>
            </div>
            <div className="flex items-center gap-6 font-label-md text-label-md text-on-surface-variant shrink-0">
              <a className="hover:text-primary transition-colors" href="#">파트너 이용약관</a>
              <a className="font-bold hover:text-primary transition-colors" href="#">개인정보처리방침</a>
              <a className="hover:text-primary transition-colors" href="#">시공분쟁조정규정</a>
              <a className="hover:text-primary transition-colors" href="#">안전관리수칙</a>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL 1: Photo Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full p-6 flex flex-col gap-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
                {selectedPhoto.title}
              </h3>
              <button 
                className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg cursor-pointer" 
                type="button"
                onClick={() => setSelectedPhoto(null)}
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <div className="w-full h-80 rounded-xl overflow-hidden bg-surface-container">
              <img 
                className="w-full h-full object-cover" 
                alt={selectedPhoto.title} 
                src={selectedPhoto.photoUrl} 
              />
            </div>
            
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              {selectedPhoto.description}
            </p>
            
            <div className="flex justify-end pt-2 border-t border-surface-container">
              <button 
                className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-label-md text-label-md font-bold hover:bg-primary-container transition-colors cursor-pointer" 
                type="button"
                onClick={() => setSelectedPhoto(null)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Guide Manual Modal */}
      {isGuideModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-xl w-full p-6 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">verified</span>
                <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
                  정기 상가주택 순회 케어 표준 매뉴얼
                </h3>
              </div>
              <button 
                className="p-1.5 text-on-surface-variant hover:text-on-surface rounded-lg cursor-pointer" 
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 text-body-md font-body-md text-on-surface-variant py-2">
              <div className="p-3 bg-surface-container-low rounded-lg border border-surface-container-high/30">
                <span className="font-bold text-on-surface">1단계: 현장 도착 및 키패드 보안 출입 인증</span>
                <p className="text-body-sm mt-0.5">앱 내 '현장 도착' 버튼 클릭 후 키패드 번호 입력하여 공동현관 입장.</p>
              </div>
              <div className="p-3 bg-surface-container-low rounded-lg border border-surface-container-high/30">
                <span className="font-bold text-on-surface">2단계: 4층부터 1층 하향식 건식 및 습식 집진</span>
                <p className="text-body-sm mt-0.5">창틀 먼지 털기 후 계단실 쓸기 및 중성 탈취세제 마포 작업 실시.</p>
              </div>
              <div className="p-3 bg-surface-container-low rounded-lg border border-surface-container-high/30">
                <span className="font-bold text-on-surface">3단계: 필로티 분리수거장 수거 및 물청소</span>
                <p className="text-body-sm mt-0.5">오수 바닥 제거 후 전용 분리배출 자루 정돈 및 수도 호스 정리.</p>
              </div>
              <div className="p-3 bg-surface-container-low rounded-lg border border-surface-container-high/30">
                <span className="font-bold text-on-surface">4단계: 시공 전/후 사진 2장 촬영 및 업로드</span>
                <p className="text-body-sm mt-0.5">앱 완료 보고서 작성 즉시 고객에게 카카오톡 알림톡 자동 전송.</p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-surface-container">
              <button 
                className="px-5 py-2.5 bg-primary text-on-primary rounded-xl font-label-md text-label-md font-bold hover:bg-primary-container transition-colors cursor-pointer" 
                type="button"
                onClick={() => setIsGuideModalOpen(false)}
              >
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: 청약서 작성 이동 확인 모달 */}
      {isApplyConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[24px]">assignment_add</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm font-bold text-primary">
                청약 제안서 작성 확인
              </h3>
            </div>

            <p className="text-body-md font-body-md text-on-surface-variant leading-relaxed">
              본 공고의 제시 용역 대금(<strong className="text-primary font-bold">{currentOrder.totalProposedAmt.toLocaleString()}원 / 3개월</strong>) 및 시공 가이드라인 조건을 100% 수락하고 <strong className="text-primary">PTNR-QOT-02 (청약서 작성)</strong> 단계로 이동하시겠습니까?
            </p>

            <div className="p-3 bg-secondary-container/30 rounded-xl text-xs text-secondary-container-on flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
              <span>보유 중인 100% 무료 쿠폰이 자동 적용되어 제출 시 비용이 들지 않습니다.</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-container">
              <button 
                className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-bold cursor-pointer transition-colors"
                type="button"
                onClick={() => setIsApplyConfirmOpen(false)}
              >
                취소
              </button>
              <button 
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-1.5"
                type="button"
                onClick={handleProceedApply}
              >
                <span>청약서 작성 이동</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
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
