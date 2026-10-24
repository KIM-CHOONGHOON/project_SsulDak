import React, { useState, useEffect, useMemo } from 'react';

// =============================================================================
// SsulDak (쓸고닦고) USER-CNT-00: 계약 확정 및 데이터 이용료 결제
// 규격: Next.js (App Router) & React / TypeScript / Tailwind CSS
// 1:1 매핑 백엔드: /api/user/user_cnt_00 (POST)
// =============================================================================

export interface SelectedSlotParam {
  slotNo: string;
  bidNo: string;
}

export interface ConfirmedServiceItem {
  slotNo: string;
  subItemNm: string;
  serviceTypeCd: string;
  bidNo: string;
  ptnrNo: string;
  bidAmt: number;
  workerCnt: number;
  estDurationHours: string | number;
  proposalNote?: string;
  companyNm: string;
  ceoNm: string;
  profileImgUrl?: string;
  avgRating: number;
  reviewCnt: number;
}

export interface UserCouponItem {
  couponNo: string;
  campaignNm: string;
  discountAmt: number;
  expireDt: string;
}

export interface UserCnt00Props {
  userNo?: string;
  reqNo?: string;
  selectedSlots?: SelectedSlotParam[];
  onNavigate?: (screenId: string, params?: Record<string, any>) => void;
  onBack?: () => void;
}

export const UserCnt00: React.FC<UserCnt00Props> = ({
  userNo = 'U20261000001',
  reqNo = 'REQ202610210001',
  selectedSlots = [
    { slotNo: 'REQ202610210001-01', bidNo: 'BID2026102200001' },
    { slotNo: 'REQ202610210001-02', bidNo: 'BID2026102200002' },
  ],
  onNavigate,
  onBack,
}) => {
  // ---------------------------------------------------------------------------
  // 1. 상태 관리
  // ---------------------------------------------------------------------------
  const [loading, setLoading] = useState<boolean>(true);
  const [services, setServices] = useState<ConfirmedServiceItem[]>([
    {
      slotNo: 'REQ202610210001-01',
      subItemNm: '정기청소 3개월 (빌라 1~4층 계단+주차장)',
      serviceTypeCd: 'REGULAR',
      bidNo: 'BID2026102200001',
      ptnrNo: 'P20260900012',
      bidAmt: 240000,
      workerCnt: 2,
      estDurationHours: '2.0',
      proposalNote: '월 4회 방문 · 3개월 총 12회 관리, 친환경 고압수세 및 계단/복도 전체 소독',
      companyNm: '반짝빌라클린',
      ceoNm: '홍길동',
      avgRating: 5.0,
      reviewCnt: 128,
    },
    {
      slotNo: 'REQ202610210001-02',
      subItemNm: '가전케어 에어컨 1대 (LG 스탠드 완전분해 세척)',
      serviceTypeCd: 'APPLIANCE',
      bidNo: 'BID2026102200002',
      ptnrNo: 'P20260900035',
      bidAmt: 80000,
      workerCnt: 1,
      estDurationHours: '1.5',
      proposalNote: '송풍팬·열교환기 완전분해 고압살균세척 및 피톤치드 연무 항균 코팅',
      companyNm: '홈케어마스터',
      ceoNm: '대표자',
      avgRating: 4.9,
      reviewCnt: 94,
    },
  ]);

  const [coupons, setCoupons] = useState<UserCouponItem[]>([
    {
      couponNo: 'CPN202610000001',
      campaignNm: '[웰컴 가입] 첫 결제 5,000원 할인 쿠폰',
      discountAmt: 5000,
      expireDt: '2026.11.21',
    },
  ]);

  const [selectedCouponNo, setSelectedCouponNo] = useState<string>('CPN202610000001');
  const [pointBalance, setPointBalance] = useState<number>(3000);
  const [inputPoint, setInputPoint] = useState<string>('2000');
  const [pointError, setPointError] = useState<string | null>(null);

  const [payMethod, setPayMethod] = useState<'card' | 'simple' | 'vbank'>('card');
  const [selectedCardCompany, setSelectedCardCompany] = useState<string>('현대카드');
  const [selectedSimplePay, setSelectedSimplePay] = useState<string>('토스페이');
  const [selectedBank, setSelectedBank] = useState<string>('국민은행');

  // 약관 동의 체크박스 상태
  const [term1, setTerm1] = useState<boolean>(true);
  const [term2, setTerm2] = useState<boolean>(true);
  const [term3, setTerm3] = useState<boolean>(true);

  // 모달 상태
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [modalTerm, setModalTerm] = useState<{ title: string; content: string } | null>(null);
  const [successResult, setSuccessResult] = useState<{
    contractNo: string;
    payNo: string;
    actualPaidAmt: number;
    safeTelNo: string;
  } | null>(null);

  // ---------------------------------------------------------------------------
  // 2. 초기 주문서 데이터 로드 (GET_ORDER_SHEET)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function loadOrderSheet() {
      try {
        setLoading(true);
        const res = await fetch('/api/user/user_cnt_00', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'GET_ORDER_SHEET',
            userNo,
            reqNo,
            selectedSlotList: selectedSlots,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (data.services && data.services.length > 0) {
              setServices(data.services);
            }
            if (data.coupons && data.coupons.length > 0) {
              setCoupons(data.coupons);
              // 기본으로 웰컴 쿠폰 또는 첫번째 쿠폰 선택
              setSelectedCouponNo(data.coupons[0].couponNo);
            }
            if (typeof data.pointBalance === 'number') {
              setPointBalance(data.pointBalance);
            }
          }
        }
      } catch (err) {
        console.warn('주문서 API 로드 실패 (기본 목업 유지):', err);
      } finally {
        setLoading(false);
      }
    }

    loadOrderSheet();
  }, [userNo, reqNo, selectedSlots]);

  // ---------------------------------------------------------------------------
  // 3. 결제 금액 계산 로직
  // ---------------------------------------------------------------------------
  // 총 현장 용역비
  const totalServiceAmt = useMemo(() => {
    return services.reduce((sum, item) => sum + item.bidAmt, 0);
  }, [services]);

  // 기준 데이터 이용료: MAX(ROUND(totalServiceAmt * 0.033), 33000)
  const baseFeeAmt = useMemo(() => {
    const calcFee = Math.round(totalServiceAmt * 0.033);
    return Math.max(calcFee, 33000);
  }, [totalServiceAmt]);

  // 선택된 쿠폰 할인액
  const discountCouponAmt = useMemo(() => {
    if (selectedCouponNo === 'none') return 0;
    const found = coupons.find((c) => c.couponNo === selectedCouponNo);
    return found ? found.discountAmt : 0;
  }, [selectedCouponNo, coupons]);

  // 사용 포인트 파싱
  const usedPointAmt = useMemo(() => {
    const raw = parseInt(inputPoint.replace(/[^0-9]/g, '') || '0', 10);
    return isNaN(raw) ? 0 : raw;
  }, [inputPoint]);

  // 포인트 유효성 검사
  useEffect(() => {
    if (usedPointAmt > pointBalance) {
      setPointError(`보유 포인트(${pointBalance.toLocaleString()}P)를 초과할 수 없습니다.`);
    } else if (usedPointAmt % 100 !== 0) {
      setPointError('포인트는 100P 단위로만 사용 가능합니다.');
    } else if (usedPointAmt > baseFeeAmt - discountCouponAmt) {
      setPointError('결제 예정 금액을 초과하여 포인트를 사용할 수 없습니다.');
    } else {
      setPointError(null);
    }
  }, [usedPointAmt, pointBalance, baseFeeAmt, discountCouponAmt]);

  // 최종 실 결제 금액
  const actualPaidAmt = useMemo(() => {
    if (pointError && usedPointAmt > pointBalance) {
      return Math.max(0, baseFeeAmt - discountCouponAmt);
    }
    return Math.max(0, baseFeeAmt - discountCouponAmt - usedPointAmt);
  }, [baseFeeAmt, discountCouponAmt, usedPointAmt, pointError, pointBalance]);

  // 약관 전체 동의 여부
  const allTermsChecked = term1 && term2 && term3;

  const handleToggleAllTerms = () => {
    const next = !allTermsChecked;
    setTerm1(next);
    setTerm2(next);
    setTerm3(next);
  };

  // 포인트 전액 사용 버튼 핸들러
  const handleUseAllPoints = () => {
    const maxUsable = Math.min(pointBalance, baseFeeAmt - discountCouponAmt);
    const validPoint = Math.floor(maxUsable / 100) * 100;
    setInputPoint(validPoint.toLocaleString());
  };

  // ---------------------------------------------------------------------------
  // 4. 결제 처리 핸들러 (CONFIRM_PAYMENT)
  // ---------------------------------------------------------------------------
  const handleConfirmPayment = async () => {
    if (!allTermsChecked) {
      alert('필수 약관 3건에 모두 동의하셔야 결제를 진행할 수 있습니다.');
      return;
    }

    if (pointError) {
      alert(pointError);
      return;
    }

    setIsProcessing(true);

    try {
      const isZeroPay = actualPaidAmt === 0;
      const provider = isZeroPay
        ? 'FREE_PASS'
        : payMethod === 'card'
        ? `CARD_${selectedCardCompany}`
        : payMethod === 'simple'
        ? selectedSimplePay
        : 'VBANK';

      const tid = isZeroPay ? `FREE_${Date.now()}` : `PG_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

      const res = await fetch('/api/user/user_cnt_00', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'CONFIRM_PAYMENT',
          userNo,
          reqNo,
          selectedSlotList: selectedSlots,
          couponNo: selectedCouponNo === 'none' ? null : selectedCouponNo,
          usePointAmt: usedPointAmt,
          baseFeeAmt,
          discountCouponAmt,
          actualPaidAmt,
          pgProviderCd: provider,
          pgTid: tid,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessResult({
          contractNo: data.contractNo,
          payNo: data.payNo,
          actualPaidAmt: data.actualPaidAmt,
          safeTelNo: data.safeTelNo,
        });
      } else {
        if (onNavigate) {
          onNavigate('user-cnt-02', {
            errorCode: data.errorCode || 'PG_CARD_LIMIT',
            errorMsg: data.message || '카드 한도 초과 또는 잔액 부족',
            couponNo: selectedCouponNo,
            usePointAmt: usedPointAmt,
            attemptedPaidAmt: actualPaidAmt,
            reqNo,
          });
        } else {
          window.location.hash = '#payment-fail';
        }
      }
    } catch (err: any) {
      console.error('결제 요청 중 오류:', err);
      alert('서버와의 통신에 실패했습니다: ' + (err.message || ''));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col justify-between">
      {/* =====================================================================
          1. GNB 헤더 (공식 브랜드 로고 준수)
      ===================================================================== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <a
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => onNavigate?.('user-com-00')}
            >
              <img
                alt="SsulDak Brand Logo"
                className="h-9 w-auto object-contain"
                src="/logo.png"
                onError={(e) => {
                  // Fallback CDN image
                  (e.target as HTMLImageElement).src =
                    'https://lh3.googleusercontent.com/aida/AEtjO1XlE5dGCq6Awu7YGl9jLXQCTA7t0IZsmJfZyUQSy_So39r5B_9DgKVRpNgn2lIWPB_vkFwbyJvxRauYr8NrBr8Ev5HNLHcxNuK1dyz8aQQON3nkYvZA0iFnBntaXm5YE-GRy1fdElMY7mqcgcLiOn6Igu7ZM3Dehje1BVaFd_UK3AteIgpBjbsnSSlBOEigu2qfzX9XgGZgL6mO3R9fV4YtByyCV6ArO-jWEfVoHeAtGM8Q98I4mu5IqYg';
                }}
              />
              <span className="font-headline-sm text-headline-sm text-primary tracking-tight font-bold hidden sm:inline-block">
                쓸고닦고
              </span>
            </a>

            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-low text-primary hover:bg-surface-container transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[18px] text-secondary">location_on</span>
              <span className="font-label-md text-label-md font-semibold text-on-surface">경기 고양시 일산동구</span>
              <span className="material-symbols-outlined text-[16px] text-outline">keyboard_arrow_down</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-4">
            <a
              className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              onClick={() => onNavigate?.('user-com-00')}
            >
              홈
            </a>
            <a
              className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              onClick={() => onNavigate?.('user-qot-00')}
            >
              견적현황
            </a>
            <a
              className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              onClick={() => onNavigate?.('user-his-00')}
            >
              이용내역
            </a>
            <a
              className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              href="#"
            >
              쿠폰북
            </a>
            <a
              className="font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              href="#"
            >
              마이
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              className="relative p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
              title="쿠폰함"
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">confirmation_number</span>
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-secondary"></span>
            </button>
            <button
              className="relative p-2 rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
              title="알림"
              type="button"
            >
              <span className="material-symbols-outlined text-[24px]">notifications</span>
              <span className="absolute top-1 right-0.5 min-w-[15px] h-[15px] px-[2px] rounded-full bg-error text-on-error font-label-sm text-[10px] leading-tight flex items-center justify-center font-bold">
                N
              </span>
            </button>
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer shadow-sm">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. 메인 컨텐츠 영역
      ===================================================================== */}
      <main className="w-full pt-16 bg-background min-h-screen pb-20 md:pb-12">
        <div className="flex flex-col w-full">
          {/* 상단 네비게이션 & 헤더 리전 */}
          <div className="w-full bg-surface-container-lowest shadow-[0_4px_20px_-4px_rgba(22,59,102,0.05)]">
            <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-6 flex flex-col gap-2">
              {/* 브레드크럼 & 뒤로가기 링크 */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <nav aria-label="Breadcrumb" className="flex items-center gap-1 font-body-sm text-body-sm text-outline">
                  <a
                    className="hover:text-primary transition-colors cursor-pointer"
                    onClick={() => onNavigate?.('user-com-00')}
                  >
                    홈
                  </a>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <a
                    className="hover:text-primary transition-colors cursor-pointer"
                    onClick={() => onNavigate?.('user-qot-00')}
                  >
                    견적 현황
                  </a>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <a
                    className="hover:text-primary transition-colors cursor-pointer"
                    onClick={() => onNavigate?.('user-qot-00')}
                  >
                    수신 청약 목록 (USER-QOT-00)
                  </a>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span className="font-semibold text-primary">계약 확정 및 결제</span>
                </nav>

                <a
                  className="inline-flex items-center gap-1.5 font-label-md text-label-md text-primary-container hover:text-primary transition-colors group cursor-pointer"
                  onClick={() => {
                    if (onBack) onBack();
                    else onNavigate?.('user-qot-00');
                  }}
                >
                  <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-0.5">
                    arrow_back
                  </span>
                  <span>받은 청약 목록으로 돌아가기 (USER-QOT-00)</span>
                </a>
              </div>

              {/* 메인 타이틀 & 보안 뱃지 */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pt-1">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-primary-container font-label-sm text-label-sm mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                    <span>최종 계약 단계 (Final Escrow Stage)</span>
                  </div>
                  <h1 className="font-display text-display text-primary tracking-tight font-extrabold">
                    계약 확정 및 데이터 이용료 결제
                  </h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant mt-1">
                    전문 마스터 파트너 매칭을 확정하고 안심 계약 및 플랫폼 라이선스 데이터를 활성화합니다.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/10 text-secondary font-label-md text-label-md shadow-sm self-start lg:self-auto">
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    verified_user
                  </span>
                  <span className="font-bold">256-bit SSL 보안 결제 · 에스크로 매칭 보증</span>
                </div>
              </div>
            </div>
          </div>

          {/* 메인 작업 영역: 2-Column Responsive Layout (~65% Left & ~35% Right) */}
          <div className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (8 of 12 cols) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                {/* -------------------------------------------------------------
                    1. 확정 서비스 내역 카드
                ------------------------------------------------------------- */}
                <section className="bg-surface-container-lowest rounded-xl shadow-[0_4px_18px_rgba(22,59,102,0.04)] p-6 flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-6 rounded-full bg-primary-container"></span>
                      <h2 className="font-headline-md text-headline-md text-primary font-bold">확정 서비스 내역</h2>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold tracking-wide">
                      선택 확정 공정 (총 {services.length}건)
                    </span>
                  </div>

                  {/* 공정 목록 */}
                  {services.map((item, idx) => (
                    <div
                      key={item.slotNo}
                      className="p-4 rounded-xl bg-surface-container-low flex flex-col md:flex-row gap-4 transition-all hover:bg-surface-container/60"
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                          idx === 0
                            ? 'bg-primary-container text-on-primary'
                            : 'bg-secondary-container text-on-secondary-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[26px]">
                          {idx === 0 ? 'cleaning_services' : 'mode_fan'}
                        </span>
                      </div>
                      <div className="flex-1 flex flex-col gap-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-headline-sm text-headline-sm font-bold text-primary truncate">
                              {item.subItemNm}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-bold flex items-center gap-1 ${
                                idx === 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-secondary/15 text-secondary'
                              }`}
                            >
                              <span
                                className="material-symbols-outlined text-[14px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                {idx === 0 ? 'workspace_premium' : 'engineering'}
                              </span>
                              {idx === 0 ? '마스터 파트너' : '가전 엔지니어'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-headline-sm text-headline-sm font-bold text-primary">
                              {item.bidAmt.toLocaleString()}원
                            </span>
                            <span className="font-body-sm text-body-sm text-on-surface-variant">
                              {idx === 0 ? ' / 월 (VAT포함)' : ' (1회 시공)'}
                            </span>
                          </div>
                        </div>

                        {/* 파트너 상세 */}
                        <div className="flex items-center gap-3 text-on-surface-variant font-body-sm text-body-sm mt-1">
                          <span className="font-semibold text-primary">
                            {item.companyNm}{' '}
                            <span className="font-normal text-on-surface-variant">({item.ceoNm})</span>
                          </span>
                          <span className="text-outline-variant">•</span>
                          <div className="flex items-center gap-1 text-tertiary-fixed-variant">
                            <span
                              className="material-symbols-outlined text-[16px] text-amber-500"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              star
                            </span>
                            <span className="font-bold text-on-surface">{item.avgRating.toFixed(1)}</span>
                            <span className="text-outline text-xs">({item.reviewCnt}건 완료)</span>
                          </div>
                        </div>

                        {/* 시공 조건 박스 */}
                        <div className="mt-2 p-3 rounded-lg bg-surface-container-lowest grid grid-cols-1 md:grid-cols-2 gap-2 font-body-sm text-body-sm">
                          {idx === 0 ? (
                            <>
                              <div className="flex items-center gap-2 text-on-surface-variant">
                                <span className="material-symbols-outlined text-[18px] text-primary-container">
                                  repeat
                                </span>
                                <span>
                                  <strong>시공 주기:</strong> 주 1회 (3개월 총 12회 케어)
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-on-surface-variant">
                                <span className="material-symbols-outlined text-[18px] text-primary-container">
                                  group
                                </span>
                                <span>
                                  <strong>투입 인력:</strong> 2인 1조 2시간 집중 케어
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-on-surface-variant md:col-span-2">
                                <span className="material-symbols-outlined text-[18px] text-secondary">
                                  calendar_today
                                </span>
                                <span>
                                  <strong>첫 방문 예정:</strong> 2026.11.01 (일) 오전 09:00 (사전 확인 문자 발송)
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 text-on-surface-variant">
                                <span className="material-symbols-outlined text-[18px] text-primary-container">
                                  timer
                                </span>
                                <span>
                                  <strong>소요 시간:</strong> 전문 엔지니어 1명 전담 약 1시간 30분
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-on-surface-variant">
                                <span className="material-symbols-outlined text-[18px] text-secondary">eco</span>
                                <span>
                                  <strong>추가 케어:</strong> 피톤치드 연무 항균 코팅 무료 포함
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        <p className="font-label-sm text-label-sm text-outline mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">info</span>
                          {idx === 0
                            ? '시공 용역비 240,000원: 현장 분할 또는 첫 회차 시공 완료 후 파트너 계좌로 직접 정산'
                            : '시공 용역비 80,000원: 에어컨 세척 정상 작동 검수 후 기사님께 현장 직접 정산'}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* 현장 지불 실제 용역비 합계 알림 박스 (비즈니스 룰 필수 안내) */}
                  <div className="p-4 rounded-xl bg-primary-fixed/50 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-primary font-bold font-headline-sm text-headline-sm">
                      <span className="material-symbols-outlined text-secondary text-[24px]">lightbulb</span>
                      <span>
                        현장 지불 실제 용역비 합계: {totalServiceAmt.toLocaleString()}원 (시공 완료 후 기사님께 직접 정산)
                      </span>
                    </div>
                    <div className="text-on-surface-variant font-body-sm text-body-sm leading-relaxed pl-8">
                      <strong className="text-primary font-semibold">💡 결제 항목 명확한 구분 안내:</strong>
                      <br />
                      본 화면에서 결제하는 금액은 플랫폼 시스템 매칭 및 거래 이력 보증{' '}
                      <strong className="text-primary">데이터 이용료(라이선스)</strong>입니다. 실제 시공 서비스 비용 합계{' '}
                      <strong className="text-primary">{totalServiceAmt.toLocaleString()}원</strong>은 공정 시공이 완료된
                      후 현장에서 파트너에게 직접 결제(계좌이체, 현금영수증, 현장 카드단말기 결제)됩니다.
                    </div>
                  </div>
                </section>

                {/* -------------------------------------------------------------
                    2. 프로모션 할인 및 포인트 사용
                ------------------------------------------------------------- */}
                <section className="bg-surface-container-lowest rounded-xl shadow-[0_4px_18px_rgba(22,59,102,0.04)] p-6 flex flex-col gap-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-6 rounded-full bg-secondary"></span>
                    <h2 className="font-headline-md text-headline-md text-primary font-bold">
                      프로모션 할인 및 포인트 사용
                    </h2>
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* 쿠폰 선택기 */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          className="font-label-lg text-label-lg font-bold text-on-surface flex items-center gap-1.5"
                          htmlFor="coupon-select"
                        >
                          <span className="material-symbols-outlined text-[20px] text-primary-container">
                            confirmation_number
                          </span>
                          청약 할인 쿠폰
                        </label>
                        <span className="text-secondary font-label-md text-label-md font-bold">
                          {coupons.length}장 보유중
                        </span>
                      </div>
                      <div className="relative">
                        <select
                          className="w-full h-12 pl-4 pr-10 rounded-xl bg-surface-container-low font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer"
                          id="coupon-select"
                          value={selectedCouponNo}
                          onChange={(e) => setSelectedCouponNo(e.target.value)}
                        >
                          {coupons.map((c) => (
                            <option key={c.couponNo} value={c.couponNo}>
                              {c.campaignNm} (-{c.discountAmt.toLocaleString()}원 적용됨)
                            </option>
                          ))}
                          <option value="none">쿠폰 미적용 (할인 없음)</option>
                        </select>
                        <span className="material-symbols-outlined absolute right-3 top-3 pointer-events-none text-outline text-[22px]">
                          keyboard_arrow_down
                        </span>
                      </div>
                    </div>

                    {/* 포인트 사용 입력 */}
                    <div className="flex flex-col gap-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label
                          className="font-label-lg text-label-lg font-bold text-on-surface flex items-center gap-1.5"
                          htmlFor="point-input"
                        >
                          <span className="material-symbols-outlined text-[20px] text-tertiary-fixed-variant">toll</span>
                          쓸고닦고 포인트 (SsulDak Point)
                        </label>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">
                          보유 포인트:{' '}
                          <span className="font-bold text-primary font-headline-sm">
                            {pointBalance.toLocaleString()}
                          </span>{' '}
                          P
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            className={`w-full h-12 pl-4 pr-10 text-right font-headline-sm text-headline-sm font-bold text-primary rounded-xl bg-surface-container-low focus:outline-none focus:ring-2 ${
                              pointError ? 'ring-2 ring-error focus:ring-error' : 'focus:ring-primary'
                            }`}
                            id="point-input"
                            type="text"
                            value={inputPoint}
                            onChange={(e) => {
                              const numStr = e.target.value.replace(/[^0-9]/g, '');
                              setInputPoint(numStr ? parseInt(numStr, 10).toLocaleString() : '0');
                            }}
                          />
                          <span className="absolute right-4 top-3 font-bold text-on-surface-variant">P</span>
                        </div>
                        <button
                          className="h-12 px-4 rounded-xl bg-surface-container text-primary font-label-md text-label-md font-bold hover:bg-surface-container-high transition-colors whitespace-nowrap active:scale-95"
                          id="use-all-points-btn"
                          type="button"
                          onClick={handleUseAllPoints}
                        >
                          전액사용
                        </button>
                      </div>

                      {pointError ? (
                        <p className="font-body-sm text-body-sm text-error flex items-center gap-1 mt-0.5 font-medium">
                          <span className="material-symbols-outlined text-[16px]">error</span>
                          {pointError}
                        </p>
                      ) : (
                        <p className="font-body-sm text-body-sm text-outline flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[16px]">info</span>
                          100P 단위로 사용 가능하며, 계약 미체결 또는 취소 시 즉시 전액 환급됩니다.
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* -------------------------------------------------------------
                    3. 결제 수단 선택
                ------------------------------------------------------------- */}
                <section className="bg-surface-container-lowest rounded-xl shadow-[0_4px_18px_rgba(22,59,102,0.04)] p-6 flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-6 rounded-full bg-primary-container"></span>
                      <h2 className="font-headline-md text-headline-md text-primary font-bold">결제 수단 선택</h2>
                    </div>
                    <span className="font-body-sm text-body-sm text-outline">데이터 이용료 전용 안전 결제</span>
                  </div>

                  {/* 결제 수단 탭 버튼 */}
                  <div className="grid grid-cols-3 gap-2" id="pay-method-tabs">
                    <button
                      className={`pay-tab-btn flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl transition-all text-center cursor-pointer ${
                        payMethod === 'card'
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                      }`}
                      type="button"
                      onClick={() => setPayMethod('card')}
                    >
                      <span className="material-symbols-outlined text-[26px]">credit_card</span>
                      <span className="font-label-lg text-label-lg font-bold">신용 / 체크카드</span>
                      <span className="font-label-sm text-[11px] opacity-80">무이자 최대 6개월</span>
                    </button>

                    <button
                      className={`pay-tab-btn flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl transition-all text-center cursor-pointer ${
                        payMethod === 'simple'
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                      }`}
                      type="button"
                      onClick={() => setPayMethod('simple')}
                    >
                      <span
                        className={`material-symbols-outlined text-[26px] ${
                          payMethod === 'simple' ? 'text-secondary-fixed' : 'text-secondary'
                        }`}
                      >
                        bolt
                      </span>
                      <span className="font-label-lg text-label-lg font-bold">간편 결제</span>
                      <span className="font-label-sm text-[11px] opacity-80">카카오 / 네이버 / 토스</span>
                    </button>

                    <button
                      className={`pay-tab-btn flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl transition-all text-center cursor-pointer ${
                        payMethod === 'vbank'
                          ? 'bg-primary text-on-primary shadow-sm'
                          : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                      }`}
                      type="button"
                      onClick={() => setPayMethod('vbank')}
                    >
                      <span className="material-symbols-outlined text-[26px]">account_balance</span>
                      <span className="font-label-lg text-label-lg font-bold">가상계좌 (무통장)</span>
                      <span className="font-label-sm text-[11px] opacity-80">세금계산서 발급 가능</span>
                    </button>
                  </div>

                  {/* 카드사 상세 패널 */}
                  {payMethod === 'card' && (
                    <div className="flex flex-col gap-4 p-4 rounded-xl bg-surface-container-low animate-fade-in">
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-label-md text-label-md font-bold text-primary">카드사 빠른 선택</span>
                        <span className="font-label-sm text-label-sm text-secondary font-semibold">
                          개인 / 법인카드 지원
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {['현대카드', '신한카드', '삼성카드', 'KB국민'].map((card) => (
                          <button
                            key={card}
                            className={`p-2.5 rounded-lg font-label-md text-label-md font-semibold transition-colors text-center shadow-sm cursor-pointer ${
                              selectedCardCompany === card
                                ? 'bg-primary text-on-primary ring-2 ring-primary'
                                : 'bg-surface-container-lowest text-primary hover:bg-primary-fixed'
                            }`}
                            type="button"
                            onClick={() => setSelectedCardCompany(card)}
                          >
                            {card}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1 font-body-sm text-body-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px] text-secondary">shield</span>
                        <span>결제 진행 시 카드사 공식 인증 모듈(ISP/앱카드) 팝업창으로 안전하게 암호화 연결됩니다.</span>
                      </div>
                    </div>
                  )}

                  {/* 간편 결제 상세 패널 */}
                  {payMethod === 'simple' && (
                    <div className="flex flex-col gap-4 p-4 rounded-xl bg-surface-container-low animate-fade-in">
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-label-md text-label-md font-bold text-primary">간편 결제 수단 선택</span>
                        <span className="font-label-sm text-label-sm text-secondary font-semibold">1초 원클릭 결제</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {['토스페이', '카카오페이', '네이버페이'].map((pay) => (
                          <button
                            key={pay}
                            className={`p-3 rounded-lg font-label-md text-label-md font-semibold transition-colors text-center shadow-sm cursor-pointer ${
                              selectedSimplePay === pay
                                ? 'bg-primary text-on-primary ring-2 ring-primary'
                                : 'bg-surface-container-lowest text-primary hover:bg-primary-fixed'
                            }`}
                            type="button"
                            onClick={() => setSelectedSimplePay(pay)}
                          >
                            {pay}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1 font-body-sm text-body-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px] text-secondary">lock</span>
                        <span>간편결제사 앱으로 즉시 이동하여 생체인증(지문/FaceID)으로 간편 승인됩니다.</span>
                      </div>
                    </div>
                  )}

                  {/* 가상계좌 상세 패널 */}
                  {payMethod === 'vbank' && (
                    <div className="flex flex-col gap-4 p-4 rounded-xl bg-surface-container-low animate-fade-in">
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-label-md text-label-md font-bold text-primary">입금 은행 선택</span>
                        <span className="font-label-sm text-label-sm text-secondary font-semibold">
                          입금 기한: 발급 후 24시간
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {['국민은행', '신한은행', '우리은행'].map((bank) => (
                          <button
                            key={bank}
                            className={`p-3 rounded-lg font-label-md text-label-md font-semibold transition-colors text-center shadow-sm cursor-pointer ${
                              selectedBank === bank
                                ? 'bg-primary text-on-primary ring-2 ring-primary'
                                : 'bg-surface-container-lowest text-primary hover:bg-primary-fixed'
                            }`}
                            type="button"
                            onClick={() => setSelectedBank(bank)}
                          >
                            {bank}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1 font-body-sm text-body-sm text-on-surface-variant">
                        <span className="material-symbols-outlined text-[16px] text-secondary">receipt_long</span>
                        <span>입금 확인 즉시 현금영수증 또는 사업자 지출증빙 세금계산서가 자동 발급됩니다.</span>
                      </div>
                    </div>
                  )}
                </section>

                {/* -------------------------------------------------------------
                    4. 필수 계약 및 결제 동의 약관
                ------------------------------------------------------------- */}
                <section className="bg-surface-container-lowest rounded-xl shadow-[0_4px_18px_rgba(22,59,102,0.04)] p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-6 rounded-full bg-primary-container"></span>
                      <h2 className="font-headline-md text-headline-md text-primary font-bold">
                        필수 계약 및 결제 동의 약관
                      </h2>
                    </div>
                    <span className="text-error font-label-sm text-label-sm font-bold">[필수 동의 3건]</span>
                  </div>

                  {/* 전체 동의 박스 */}
                  <div
                    className="p-4 rounded-xl bg-surface-container-high/60 flex items-center justify-between cursor-pointer select-none"
                    onClick={handleToggleAllTerms}
                  >
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        checked={allTermsChecked}
                        className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                        id="check-all"
                        type="checkbox"
                        onChange={handleToggleAllTerms}
                      />
                      <span className="font-headline-sm text-headline-sm font-bold text-primary">
                        약관 전체 동의하기
                      </span>
                    </label>
                    <span className="font-body-sm text-body-sm text-on-surface-variant hidden sm:inline">
                      전체 항목에 일괄 동의합니다.
                    </span>
                  </div>

                  {/* 개별 약관 목록 */}
                  <div className="flex flex-col gap-2 pt-1">
                    {/* 약관 1 */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low transition-colors">
                      <label className="flex items-center gap-3 cursor-pointer select-none flex-1">
                        <input
                          checked={term1}
                          className="term-check w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                          type="checkbox"
                          onChange={(e) => setTerm1(e.target.checked)}
                        />
                        <span className="font-body-md text-body-md text-on-surface">
                          <span className="text-primary font-bold">[필수]</span> 본 결제액은{' '}
                          <strong className="text-primary font-semibold">플랫폼 데이터/매칭 라이선스 이용료</strong>이며
                          청소 용역 계약금이 아닙니다.
                        </span>
                      </label>
                      <button
                        className="text-outline hover:text-primary font-label-sm text-label-sm underline shrink-0 ml-2 cursor-pointer"
                        type="button"
                        onClick={() =>
                          setModalTerm({
                            title: '데이터 이용료 성격에 관한 고지',
                            content: `1. 본 결제액은 쓸고닦고 플랫폼이 제공하는 전문 마스터 파트너 매칭 데이터, 견적 이력 관리, 안심 가상번호 개통, 전자계약서 서명 보존 및 분쟁 해결 지원 라이선스 이용료입니다.\n\n2. 실제 현장에서 수행되는 청소 용역비(${totalServiceAmt.toLocaleString()}원)는 시공 완료 후 현장에서 파트너에게 전액 직접 지불하시게 됩니다.`,
                          })
                        }
                      >
                        전문보기
                      </button>
                    </div>

                    {/* 약관 2 */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low transition-colors">
                      <label className="flex items-center gap-3 cursor-pointer select-none flex-1">
                        <input
                          checked={term2}
                          className="term-check w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                          type="checkbox"
                          onChange={(e) => setTerm2(e.target.checked)}
                        />
                        <span className="font-body-md text-body-md text-on-surface">
                          <span className="text-primary font-bold">[필수]</span> 3개월 내 파트너 귀책 파기 시{' '}
                          <strong className="text-secondary font-semibold">100% 무상 대체배차 안심보증</strong> 조건
                          동의
                        </span>
                      </label>
                      <button
                        className="text-outline hover:text-primary font-label-sm text-label-sm underline shrink-0 ml-2 cursor-pointer"
                        type="button"
                        onClick={() =>
                          setModalTerm({
                            title: '대체배차 100% 안심보증 약관',
                            content: `1. 계약 체결 후 시공일 전 또는 계약 기간 중 파트너의 일방적인 귀책사유로 인해 시공이 중단되거나 파기될 경우, 쓸고닦고 플랫폼은 동일 등급 이상의 우수 마스터 파트너를 무상으로 100% 신속 대체 배차합니다.\n\n2. 대체 배차가 불가능할 경우 납부하신 플랫폼 데이터 이용료 전액이 100% 환불됩니다.`,
                          })
                        }
                      >
                        전문보기
                      </button>
                    </div>

                    {/* 약관 3 */}
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-container-low transition-colors">
                      <label className="flex items-center gap-3 cursor-pointer select-none flex-1">
                        <input
                          checked={term3}
                          className="term-check w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                          type="checkbox"
                          onChange={(e) => setTerm3(e.target.checked)}
                        />
                        <span className="font-body-md text-body-md text-on-surface">
                          <span className="text-primary font-bold">[필수]</span> 결제 후 7일 이내 취소 시 50% 환불, 7일
                          이후 전액 몰수 및 7일 이용 정지 동의
                        </span>
                      </label>
                      <button
                        className="text-outline hover:text-primary font-label-sm text-label-sm underline shrink-0 ml-2 cursor-pointer"
                        type="button"
                        onClick={() =>
                          setModalTerm({
                            title: '계약 취소 및 환불/패널티 정책',
                            content: `1. 결제일로부터 7일 이내 고객 단순 변심으로 계약을 취소하는 경우: 데이터 이용료의 50%가 환불됩니다.\n\n2. 결제일로부터 7일 경과 후 또는 첫 방문 시공일 48시간 이내 취소하는 경우: 파트너의 스케줄 선점 손실 보전을 위해 데이터 이용료가 전액 몰수 처리되며, 공정한 매칭 생태계 유지를 위해 7일간 신규 청약 신청이 제한됩니다.`,
                          })
                        }
                      >
                        전문보기
                      </button>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column (~35% Width: 4 of 12 cols - Sticky Summary Box) */}
              <div className="lg:col-span-4 lg:sticky lg:top-20 flex flex-col gap-4">
                <div className="bg-surface-container-lowest rounded-xl shadow-[0_12px_32px_rgba(22,59,102,0.08)] p-6 flex flex-col gap-4">
                  {/* 요약 헤더 */}
                  <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                    <h3 className="font-headline-md text-headline-md text-primary font-bold">최종 결제 금액 계산</h3>
                    <span className="px-2 py-0.5 rounded bg-surface-container text-primary-container font-label-sm text-label-sm font-semibold">
                      데이터 라이선스
                    </span>
                  </div>

                  {/* 세부 계산 내역 */}
                  <div className="flex flex-col gap-2.5 font-body-md text-body-md text-on-surface-variant">
                    {/* 현장 결제분 참고 */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low/70">
                      <span className="flex items-center gap-1 text-on-surface-variant">
                        <span>선택 공정 합계 용역비</span>
                        <span className="font-label-sm text-[11px] text-outline">(현장 결제분)</span>
                      </span>
                      <span className="font-bold text-on-surface">{totalServiceAmt.toLocaleString()}원</span>
                    </div>

                    {/* 기준 데이터 이용료 */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1 group relative cursor-pointer">
                        <span className="text-on-surface font-medium">기준 데이터 이용료</span>
                        <span className="material-symbols-outlined text-[16px] text-outline hover:text-primary">
                          help
                        </span>
                        {/* 툴팁 */}
                        <div className="absolute bottom-full left-0 mb-2 w-64 p-2.5 rounded-lg bg-inverse-surface text-inverse-on-surface font-body-sm text-xs shadow-xl hidden group-hover:block z-20">
                          <span className="font-bold">이용료 산정 공식:</span>
                          <br />
                          max({totalServiceAmt.toLocaleString()}원 × 3.3% ={' '}
                          {Math.round(totalServiceAmt * 0.033).toLocaleString()}원, 최저 요율 33,000원) ={' '}
                          <strong>{baseFeeAmt.toLocaleString()}원</strong> (VAT 포함)
                        </div>
                      </div>
                      <span className="font-bold text-on-surface">{baseFeeAmt.toLocaleString()}원</span>
                    </div>

                    {/* 쿠폰 할인 */}
                    <div className="flex items-center justify-between text-secondary">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-[18px]">sell</span>
                        쿠폰 할인 ({selectedCouponNo !== 'none' ? '적용됨' : '미적용'})
                      </span>
                      <span className="font-bold">
                        {discountCouponAmt > 0 ? `-${discountCouponAmt.toLocaleString()}원` : '0원'}
                      </span>
                    </div>

                    {/* 포인트 할인 */}
                    <div className="flex items-center justify-between text-secondary">
                      <span className="flex items-center gap-1 font-medium">
                        <span className="material-symbols-outlined text-[18px]">toll</span>
                        포인트 즉시 사용
                      </span>
                      <span className="font-bold">
                        {usedPointAmt > 0 ? `-${usedPointAmt.toLocaleString()} P` : '0 P'}
                      </span>
                    </div>

                    {/* 구분선 */}
                    <div className="h-px w-full bg-surface-container my-1"></div>

                    {/* 최종 결제 금액 강조 */}
                    <div className="flex items-end justify-between pt-1">
                      <div>
                        <span className="font-headline-sm text-headline-sm font-extrabold text-primary">
                          최종 실 결제 금액
                        </span>
                        <p className="font-label-sm text-[11px] text-outline">VAT 10% 포함 · 일시불</p>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-display font-extrabold text-secondary tracking-tight">
                          {actualPaidAmt.toLocaleString()}
                        </span>
                        <span className="font-headline-sm text-headline-sm font-bold text-primary"> 원</span>
                      </div>
                    </div>
                  </div>

                  {/* 결제 실행 큰 CTA 버튼 */}
                  <button
                    disabled={!allTermsChecked || isProcessing || !!pointError}
                    className={`w-full h-[54px] rounded-xl font-headline-sm text-headline-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 group mt-2 cursor-pointer ${
                      !allTermsChecked || !!pointError
                        ? 'bg-surface-container text-outline cursor-not-allowed shadow-none'
                        : isProcessing
                        ? 'bg-primary-container text-on-primary-container cursor-wait'
                        : 'bg-primary text-on-primary hover:bg-primary-container active:scale-[0.99]'
                    }`}
                    type="button"
                    onClick={handleConfirmPayment}
                  >
                    {isProcessing ? (
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
                        안전 결제 처리 중...
                      </span>
                    ) : (
                      <>
                        <span>
                          {actualPaidAmt === 0
                            ? '0원 결제 승인 및 계약 완료하기'
                            : `${actualPaidAmt.toLocaleString()}원 결제하고 계약 완료하기`}
                        </span>
                        <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-1">
                          arrow_forward
                        </span>
                      </>
                    )}
                  </button>

                  {/* 결제 후속 조치 안내 박스 */}
                  <div className="p-3 rounded-lg bg-surface-container-low text-on-surface-variant font-body-sm text-xs leading-relaxed flex items-start gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">
                      mark_chat_unread
                    </span>
                    <p>
                      결제 완료 즉시 양측{' '}
                      <strong className="text-primary font-semibold">
                        안심번호 및 1:1 상담 채팅방(USER-QOT-02)
                      </strong>
                      이 활성화되며, <strong className="text-primary font-semibold">표준 전자계약서</strong>가 카카오
                      알림톡으로 전송됩니다.
                    </p>
                  </div>

                  {/* 신뢰 뱃지 3종 */}
                  <div className="flex flex-col gap-2 pt-1 font-body-sm text-body-sm text-on-surface-variant border-t border-surface-container">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[20px]">verified</span>
                      <span>
                        <strong>에스크로 안심 결제</strong> (배차 미이행 시 100% 환불)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary-container text-[20px]">
                        assignment_turned_in
                      </span>
                      <span>공정위 표준약관 준수 전자서명 자동 연동</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-outline text-[20px]">support_agent</span>
                      <span>고객센터 분쟁 중재 전담팀 지원 (1588-3024)</span>
                    </div>
                  </div>
                </div>

                {/* 고객센터 문의 배너 */}
                <div className="p-4 rounded-xl bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[22px]">contact_support</span>
                    <span className="font-label-md text-label-md text-on-surface font-semibold">
                      결제 및 세금계산서 발행 문의
                    </span>
                  </div>
                  <a className="font-label-sm text-label-sm text-primary font-bold hover:underline" href="tel:1588-3024">
                    1588-3024 →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================================
          3. 모바일 하단 탭 바 (반응형 지원)
      ===================================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl shadow-[0_-4px_16px_rgba(22,59,102,0.06)] md:hidden">
        <div className="max-w-md mx-auto grid grid-cols-4 h-16">
          <a
            className="flex flex-col items-center justify-center gap-0.5 text-on-surface-variant hover:text-on-surface cursor-pointer"
            onClick={() => onNavigate?.('user-com-00')}
          >
            <span className="material-symbols-outlined text-[22px]">home</span>
            <span className="font-label-sm text-label-sm">홈</span>
          </a>
          <a
            className="flex flex-col items-center justify-center gap-0.5 text-primary font-bold cursor-pointer"
            onClick={() => onNavigate?.('user-qot-00')}
          >
            <span className="material-symbols-outlined text-[22px]">request_quote</span>
            <span className="font-label-sm text-label-sm">견적현황</span>
          </a>
          <a
            className="flex flex-col items-center justify-center gap-0.5 text-on-surface-variant hover:text-on-surface cursor-pointer"
            onClick={() => onNavigate?.('user-his-00')}
          >
            <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            <span className="font-label-sm text-label-sm">이용내역</span>
          </a>
          <a
            className="flex flex-col items-center justify-center gap-0.5 text-on-surface-variant hover:text-on-surface cursor-pointer"
            href="#"
          >
            <span className="material-symbols-outlined text-[22px]">person</span>
            <span className="font-label-sm text-label-sm">마이</span>
          </a>
        </div>
      </nav>

      {/* =====================================================================
          4. 푸터
      ===================================================================== */}
      <footer className="hidden md:block w-full bg-surface-container-low mt-8 py-8 border-t border-surface-container">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-4 text-on-surface-variant">
          <div className="flex items-center gap-3">
            <span className="font-headline-sm text-headline-sm text-primary font-bold">쓸고닦고 (SsulDak)</span>
            <span className="text-xs text-outline">|</span>
            <span className="font-body-sm text-body-sm">전문 홈&빌딩 클리닝 케어 플랫폼</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            © 2026 SsulDak Inc. All rights reserved. 일산·수도권 공식 케어 센터
          </p>
        </div>
      </footer>

      {/* =====================================================================
          5. 모달: 약관 상세 전문보기 다이얼로그
      ===================================================================== */}
      {modalTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <h4 className="font-headline-sm text-headline-sm font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">verified_user</span>
                {modalTerm.title}
              </h4>
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-low text-outline"
                type="button"
                onClick={() => setModalTerm(null)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto text-on-surface-variant font-body-sm text-body-sm whitespace-pre-line leading-relaxed pr-2">
              {modalTerm.content}
            </div>
            <div className="flex justify-end pt-2 border-t border-surface-container">
              <button
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold hover:bg-primary-container transition-colors"
                type="button"
                onClick={() => setModalTerm(null)}
              >
                확인 및 닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. 모달: 결제 완료 및 계약 체결 성공 다이얼로그
      ===================================================================== */}
      {successResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-secondary-container flex items-center justify-center text-secondary mb-1">
              <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>

            <div>
              <h3 className="font-headline-md text-headline-md text-primary font-extrabold tracking-tight">
                계약 및 데이터 이용료 결제 완료!
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                전문 마스터 파트너 매칭과 안심 계약이 성공적으로 체결되었습니다.
              </p>
            </div>

            {/* 계약 및 결제 증빙 정보 카드 */}
            <div className="w-full p-4 rounded-xl bg-surface-container-low flex flex-col gap-2 font-body-sm text-body-sm text-left">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">대표 계약 번호</span>
                <span className="font-mono font-bold text-primary">{successResult.contractNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">결제 승인 번호</span>
                <span className="font-mono text-outline">{successResult.payNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">납부 데이터 이용료</span>
                <span className="font-bold text-secondary font-headline-sm">
                  {successResult.actualPaidAmt.toLocaleString()}원
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-surface-container">
                <span className="text-on-surface-variant">발급된 안심번호</span>
                <span className="font-bold text-primary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-secondary">phone_in_talk</span>
                  {successResult.safeTelNo}
                </span>
              </div>
            </div>

            <p className="font-label-sm text-label-sm text-outline">
              표준 전자계약서와 영수증이 카카오 알림톡으로 전송되었습니다.
            </p>

            <div className="w-full flex flex-col gap-2 pt-2">
              <button
                className="w-full h-12 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold hover:bg-primary-container transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                type="button"
                onClick={() => {
                  const res = successResult;
                  setSuccessResult(null);
                  if (onNavigate) {
                    onNavigate('user-cnt-01', { contractNo: res.contractNo, payNo: res.payNo });
                  } else {
                    window.location.hash = '#payment-complete';
                  }
                }}
              >
                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                <span>결제 완료 및 파트너 대기 확인 (USER-CNT-01)</span>
              </button>
              <div className="w-full flex flex-col sm:flex-row gap-2">
                <button
                  className="flex-1 h-11 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md font-bold hover:bg-secondary/90 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  type="button"
                  onClick={() => {
                    const res = successResult;
                    setSuccessResult(null);
                    if (onNavigate) {
                      onNavigate('user-qot-02', { contractNo: res.contractNo });
                    } else {
                      window.location.hash = '#user-qot-02';
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">forum</span>
                  <span>1:1 상담 채팅</span>
                </button>
                <button
                  className="flex-1 h-11 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  type="button"
                  onClick={() => {
                    setSuccessResult(null);
                    if (onNavigate) {
                      onNavigate('user-com-00');
                    } else {
                      window.location.hash = '#home';
                    }
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">home</span>
                  <span>홈으로 이동</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserCnt00;
