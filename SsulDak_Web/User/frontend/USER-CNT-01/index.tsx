import React, { useState, useEffect } from 'react';

// =============================================================================
// SsulDak (쓸고닦고) USER-CNT-01: 결제 완료 및 파트너 대기
// 규격: Next.js (App Router) & React / TypeScript / Tailwind CSS
// 1:1 매핑 백엔드: /api/user/user_cnt_01 (POST)
// =============================================================================

export interface UserCnt01Props {
  userNo?: string;
  contractNo?: string;
  payNo?: string;
  reqNo?: string;
  onNavigate?: (screenId: string, params?: Record<string, any>) => void;
}

export interface ReceiptInfo {
  orderNo: string;
  contractNo: string;
  payNo: string;
  baseFeeAmt: number;
  discountCouponAmt: number;
  usedPointAmt: number;
  totalDiscountAmt: number;
  actualPaidAmt: number;
  totalServiceAmt: number;
  pgProviderCd: string;
  pgTid: string;
  paidDt: string;
  payStatCd: string;
}

export interface ConfirmedContractService {
  contractNo: string;
  reqNo: string;
  slotNo: string;
  subItemNm: string;
  totalServiceAmt: number;
  contractStatCd: string;
  ptnrFeePaidYn: string;
  serviceStartDt: string;
  partnerCompanyNm: string;
  partnerCeoNm: string;
  avgRating: number;
  reviewCnt: number;
}

export interface PartnerWaitInfo {
  companyNm: string;
  ptnrFeePaidYn: string;
  guideMsg: string;
}

export const UserCnt01: React.FC<UserCnt01Props> = ({
  userNo = 'U20261000001',
  contractNo = 'CT2026102100001',
  payNo = 'PAY2026102100001',
  reqNo = 'REQ202610210001',
  onNavigate,
}) => {
  // ---------------------------------------------------------------------------
  // 1. 상태 관리
  // ---------------------------------------------------------------------------
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [receipt, setReceipt] = useState<ReceiptInfo>({
    orderNo: 'CNT-20261021-0001',
    contractNo: 'CT2026102100001',
    payNo: 'PAY2026102100001',
    baseFeeAmt: 33000,
    discountCouponAmt: 5000,
    usedPointAmt: 2000,
    totalDiscountAmt: 7000,
    actualPaidAmt: 26000,
    totalServiceAmt: 320000,
    pgProviderCd: '신용카드 (현대카드 일시불)',
    pgTid: 'APPR-9482104',
    paidDt: '2026.10.21 14:32:05',
    payStatCd: 'COMPLETED',
  });

  const [services, setServices] = useState<ConfirmedContractService[]>([
    {
      contractNo: 'CT2026102100001',
      reqNo: 'REQ202610210001',
      slotNo: 'REQ202610210001-01',
      subItemNm: '정기청소 3개월 (빌라 1~4층 계단+주차장)',
      totalServiceAmt: 240000,
      contractStatCd: 'CONFIRMED',
      ptnrFeePaidYn: 'N',
      serviceStartDt: '2026.11.01(일) 09:00',
      partnerCompanyNm: '반짝빌라클린',
      partnerCeoNm: '홍길동 대표',
      avgRating: 5.0,
      reviewCnt: 184,
    },
    {
      contractNo: 'CT2026102100002',
      reqNo: 'REQ202610210001',
      slotNo: 'REQ202610210001-02',
      subItemNm: '가전케어 에어컨 1대 (LG 스탠드 완전분해 세척)',
      totalServiceAmt: 80000,
      contractStatCd: 'CONFIRMED',
      ptnrFeePaidYn: 'N',
      serviceStartDt: '2026.11.01(일) 11:30',
      partnerCompanyNm: '홈케어마스터',
      partnerCeoNm: '공식인증 엔지니어',
      avgRating: 4.9,
      reviewCnt: 96,
    },
  ]);

  const [partnerInfo, setPartnerInfo] = useState<PartnerWaitInfo>({
    companyNm: '반짝빌라클린',
    ptnrFeePaidYn: 'N',
    guideMsg:
      '파트너가 데이터 이용료를 납부(통상 1시간 이내)하면 0507 안심번호와 1:1 상담 채팅방(USER-QOT-02)이 즉시 열립니다.',
  });

  // ---------------------------------------------------------------------------
  // 2. 초기 데이터 로드 (POST /api/user/user_cnt_01)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    async function fetchReceipt() {
      try {
        setLoading(true);
        const res = await fetch('/api/user/user_cnt_01', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actionType: 'GET_PAY_RECEIPT',
            userNo,
            contractNo,
            payNo,
            reqNo,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            if (data.receipt) setReceipt(data.receipt);
            if (data.services && data.services.length > 0) setServices(data.services);
            if (data.partnerInfo) setPartnerInfo(data.partnerInfo);
          }
        }
      } catch (err) {
        console.warn('영수증 API 호출 실패 (기본 데이터 사용):', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReceipt();
  }, [userNo, contractNo, payNo, reqNo]);

  // ---------------------------------------------------------------------------
  // 3. 토스트 및 복사 / 인쇄 핸들러
  // ---------------------------------------------------------------------------
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleCopyOrderNo = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('계약/주문번호가 클립보드에 복사되었습니다.');
      });
    } else {
      showToast(`복사 완료: ${text}`);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col justify-between">
      {/* =====================================================================
          토스트 알림 컴포넌트
      ===================================================================== */}
      {toastMessage && (
        <div className="fixed top-24 right-8 z-50 flex items-center gap-2 px-4 py-3 bg-primary text-on-primary rounded-xl shadow-2xl font-label-md text-label-md animate-fade-in">
          <span className="material-symbols-outlined text-secondary text-[20px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =====================================================================
          1. GNB 헤더 (공식 브랜드 로고 준수)
      ===================================================================== */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.04)]">
        <div className="h-20 max-w-[1280px] mx-auto px-6 lg:px-12 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <a
              className="flex items-center gap-2 text-primary cursor-pointer"
              onClick={() => onNavigate?.('user-com-00')}
            >
              <img
                alt="SsulDak Brand Logo"
                className="h-9 w-auto object-contain"
                src="/logo.png"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://lh3.googleusercontent.com/aida/AEtjO1XlE5dGCq6Awu7YGl9jLXQCTA7t0IZsmJfZyUQSy_So39r5B_9DgKVRpNgn2lIWPB_vkFwbyJvxRauYr8NrBr8Ev5HNLHcxNuK1dyz8aQQON3nkYvZA0iFnBntaXm5YE-GRy1fdElMY7mqcgcLiOn6Igu7ZM3Dehje1BVaFd_UK3AteIgpBjbsnSSlBOEigu2qfzX9XgGZgL6mO3R9fV4YtByyCV6ArO-jWEfVoHeAtGM8Q98I4mu5IqYg';
                }}
              />
              <span className="font-display text-headline-sm font-bold tracking-tight text-primary">
                쓸고닦고
              </span>
            </a>

            <div className="h-4 w-px bg-surface-container-high hidden md:block"></div>

            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">location_on</span>
              <span className="font-label-md text-label-md">경기 고양시 일산동구</span>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">expand_more</span>
            </button>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            <a
              className="px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors font-label-lg text-label-lg cursor-pointer"
              onClick={() => onNavigate?.('user-com-00')}
            >
              홈
            </a>
            <a
              aria-current="page"
              className="px-4 py-2 rounded-lg transition-colors bg-primary-container text-on-primary font-bold cursor-pointer"
              onClick={() => onNavigate?.('user-qot-00')}
            >
              견적현황
            </a>
            <a
              className="px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors font-label-lg text-label-lg cursor-pointer"
              onClick={() => onNavigate?.('user-his-00')}
            >
              이용내역
            </a>
            <a
              className="px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors font-label-lg text-label-lg cursor-pointer"
              href="#"
            >
              쿠폰북
            </a>
            <a
              className="px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors font-label-lg text-label-lg cursor-pointer"
              href="#"
            >
              마이
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              aria-label="장바구니"
              className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
            </button>
            <button
              aria-label="알림"
              className="p-2 rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors relative"
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary"></span>
            </button>
            <div
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary-container transition-colors"
              onClick={() => onNavigate?.('user-ath-03')}
            >
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. 메인 컨텐츠 영역
      ===================================================================== */}
      <main className="w-full pt-20 bg-surface min-h-[calc(100vh-80px)] pb-16">
        <div className="flex flex-col w-full">
          <div className="max-w-[1280px] w-full mx-auto px-6 lg:px-12 py-8 flex flex-col gap-6">
            {/* 1. 브레드크럼 & 성공 히어로 배너 */}
            <div className="flex flex-col gap-4">
              <nav aria-label="Breadcrumb" className="flex items-center gap-1 font-label-md text-label-md text-on-surface-variant">
                <a
                  className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                  onClick={() => onNavigate?.('user-com-00')}
                >
                  <span className="material-symbols-outlined text-[16px]">home</span>홈
                </a>
                <span className="material-symbols-outlined text-[14px] text-outline-variant">chevron_right</span>
                <a
                  className="hover:text-primary transition-colors cursor-pointer"
                  onClick={() => onNavigate?.('user-qot-00')}
                >
                  견적 현황
                </a>
                <span className="material-symbols-outlined text-[14px] text-outline-variant">chevron_right</span>
                <a
                  className="hover:text-primary transition-colors cursor-pointer"
                  onClick={() => onNavigate?.('user-cnt-00')}
                >
                  계약 확정 및 결제 (USER-CNT-00)
                </a>
                <span className="material-symbols-outlined text-[14px] text-outline-variant">chevron_right</span>
                <span className="text-primary font-bold">결제 완료</span>
              </nav>

              {/* 완료 히어로 박스 */}
              <section className="relative overflow-hidden rounded-2xl bg-surface-container-lowest p-8 shadow-sm text-center flex flex-col items-center justify-center border border-surface-container">
                {/* 배경 조명 효과 */}
                <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-secondary-fixed/30 blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-primary-fixed/40 blur-3xl pointer-events-none"></div>

                {/* 체크마크 뱃지 */}
                <div className="relative mb-4 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-secondary-container/40 flex items-center justify-center animate-pulse"></div>
                  <div className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-secondary flex items-center justify-center shadow-lg shadow-secondary/30">
                    <span className="material-symbols-outlined text-on-secondary text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check
                    </span>
                  </div>
                </div>

                {/* 메인 헤드라인 */}
                <div className="max-w-2xl mx-auto flex flex-col gap-2">
                  <h1 className="font-display text-display text-primary tracking-tight font-extrabold">
                    데이터 이용료 결제가 안전하게 완료되었습니다!
                  </h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant">
                    선택하신 전문 파트너에게 배차 확정(후결제) 승인 요청이 실시간으로 전달되었습니다.
                  </p>
                </div>

                {/* 메타데이터 리본 */}
                <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-low text-on-surface">
                  <span className="inline-flex items-center gap-1.5 font-label-md text-label-md font-bold text-secondary">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    결제 승인 완료
                  </span>
                  <span className="text-outline-variant">•</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">{receipt.paidDt}</span>
                  <span className="text-outline-variant">•</span>
                  <span className="font-label-md text-label-md text-primary tracking-wide font-mono">
                    승인번호 {receipt.pgTid}
                  </span>
                </div>
              </section>
            </div>

            {/* 2. 3단계 실시간 매칭 진행 상태 트래커 */}
            <section aria-label="진행 상태 트래커" className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
                {/* Step 1: 이용료 결제 (완료) */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low/70">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-on-secondary shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">task_alt</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
                        STEP 01
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-secondary-container text-on-secondary-container">
                        완료
                      </span>
                    </div>
                    <div className="font-headline-sm text-headline-sm font-bold text-on-surface truncate">
                      이용료 결제
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">정산 토큰 안전 에스크로</div>
                  </div>
                </div>

                {/* Step 2: 파트너 수락 대기중 (진행중) */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-primary-container text-on-primary relative overflow-hidden shadow-md">
                  <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-on-primary-container/20 pointer-events-none"></div>
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center shrink-0 text-on-secondary relative shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">hourglass_top</span>
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-fixed opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary-fixed"></span>
                    </span>
                  </div>
                  <div className="flex flex-col min-w-0 z-10">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-sm text-label-sm text-secondary-fixed font-bold uppercase tracking-wider">
                        STEP 02
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container-lowest text-primary">
                        통상 1시간 내 수락
                      </span>
                    </div>
                    <div className="font-headline-sm text-headline-sm font-bold text-on-primary truncate">
                      파트너 수락 대기중
                    </div>
                    <div className="font-body-sm text-body-sm text-on-primary-container">
                      스케줄 검토 및 기사 자동 배정
                    </div>
                  </div>
                </div>

                {/* Step 3: 채팅방 오픈 & 시공 (대기중) */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low/40 opacity-75">
                  <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0 text-outline">
                    <span className="material-symbols-outlined text-[24px]">chat_bubble_outline</span>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-sm text-label-sm text-outline font-bold uppercase tracking-wider">
                        STEP 03
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-surface-container-high text-outline">
                        대기
                      </span>
                    </div>
                    <div className="font-headline-sm text-headline-sm font-bold text-on-surface truncate">
                      1:1 채팅 & 현장 시공
                    </div>
                    <div className="font-body-sm text-body-sm text-on-surface-variant">0507 안심번호 활성화</div>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. 2-Column Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (~58-60% width -> 7 cols) */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                {/* A. 후속 안내 카드 */}
                <article className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container flex flex-col gap-4 relative overflow-hidden">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-tertiary-fixed flex items-center justify-center shrink-0 text-on-tertiary-fixed">
                      <span className="material-symbols-outlined text-[26px]">mark_chat_unread</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold">
                          진행 안내
                        </span>
                        <h2 className="font-headline-sm text-headline-sm font-bold text-primary">
                          파트너 매칭 수락 및 1:1 상담 채팅방 오픈 안내
                        </h2>
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                        파트너가 데이터 이용료를 확인 및 수락(통상 1시간 이내)하면 고객님과 파트너 간 전용{' '}
                        <strong className="text-primary font-bold">0507 안심번호</strong>와{' '}
                        <strong className="text-primary font-bold">1:1 실시간 상담 채팅방(USER-QOT-02)</strong>이 즉시
                        활성화됩니다.
                      </p>
                    </div>
                  </div>

                  {/* 강조 알림 박스 */}
                  <div className="p-4 rounded-xl bg-surface-container-low flex items-center gap-3">
                    <span
                      className="material-symbols-outlined text-secondary text-[24px] shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      verified
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface leading-normal">
                      파트너 승인 시 등록된 휴대폰 카카오 알림톡으로{' '}
                      <span className="font-bold text-primary">표준 전자계약서 사본</span> 및{' '}
                      <span className="font-bold text-primary">채팅방 입장 다이렉트 링크</span>가 자동 발송됩니다.
                    </p>
                  </div>
                </article>

                {/* B. 매칭 확정 공정 및 파트너 정보 카드 */}
                <article className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-1 border-b border-surface-container">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[22px]">assignment_turned_in</span>
                      <h2 className="font-headline-sm text-headline-sm font-bold text-primary">
                        매칭 확정 공정 및 파트너 정보
                      </h2>
                    </div>
                    <span className="font-label-sm text-label-sm text-outline">총 {services.length}건 패키지 신청</span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {services.map((item, idx) => (
                      <div
                        key={item.contractNo || idx}
                        className="p-4 rounded-xl bg-surface-container-low/60 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-container-low transition-colors"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-14 h-14 rounded-xl bg-surface-container-high flex items-center justify-center shrink-0 text-primary shadow-sm">
                            <span className="material-symbols-outlined text-[28px]">
                              {idx === 0 ? 'apartment' : 'ac_unit'}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded font-label-sm text-label-sm font-bold ${
                                  idx === 0
                                    ? 'bg-primary-container text-on-primary'
                                    : 'bg-secondary-container text-on-secondary-container'
                                }`}
                              >
                                {idx === 0 ? '정기 빌라케어' : '가전 분해살균'}
                              </span>
                              <span className="font-headline-sm text-headline-sm font-bold text-primary">
                                {item.subItemNm}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body-sm text-body-sm text-on-surface-variant mt-1">
                              <div className="flex items-center gap-1">
                                <span className="font-label-md text-label-md text-on-surface font-semibold">
                                  {item.partnerCompanyNm}
                                </span>
                                <span className="text-outline-variant font-normal">|</span>
                                <span>{item.partnerCeoNm}</span>
                              </div>
                              <div className="inline-flex items-center gap-0.5 text-on-tertiary-container font-label-md text-label-md">
                                <span
                                  className="material-symbols-outlined text-[16px] text-tertiary-fixed-dim"
                                  style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                  star
                                </span>
                                <span className="font-bold">{item.avgRating.toFixed(1)}</span>
                                <span className="text-outline font-normal">({item.reviewCnt}개)</span>
                              </div>
                              {idx === 0 && (
                                <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold">
                                  <span className="material-symbols-outlined text-[12px]">verified</span>
                                  마스터 파트너
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="md:text-right shrink-0 p-2 rounded-lg bg-surface-container-lowest md:bg-transparent">
                          <div className="font-label-sm text-label-sm text-outline">
                            {idx === 0 ? '첫 방문 예정일' : '시공 예정 일시'}
                          </div>
                          <div className="font-label-lg text-label-lg font-bold text-secondary">
                            {item.serviceStartDt}
                          </div>
                          <div className="font-body-sm text-body-sm text-on-surface-variant">
                            {idx === 0 ? '매주 화요일 정기 방문' : '소요시간 약 90분'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                {/* C. 안심 보증 배너 */}
                <article className="rounded-2xl p-6 bg-surface-container-low flex flex-col md:flex-row items-center gap-4 relative overflow-hidden shadow-sm border border-surface-container">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-on-secondary shrink-0 shadow-sm">
                    <span
                      className="material-symbols-outlined text-[26px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      shield_with_heart
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-center md:text-left">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                      <span className="font-headline-sm text-headline-sm font-bold text-primary">
                        쓸고닦고 100% 안심 매칭 보증제
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                        보증 적용
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      파트너 사정으로 인한 취소 또는 1시간 내 미수락 시 결제하신 데이터 이용료는{' '}
                      <strong className="text-on-surface font-semibold">100% 즉시 자동 환불</strong>되며, 최고 등급의
                      대체 파트너가 우선 배차됩니다.
                    </p>
                  </div>
                </article>
              </div>

              {/* Right Column (~40-42% width -> 5 cols) */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                {/* A. 디지털 전자 영수증 카드 */}
                <section
                  aria-label="디지털 전자 영수증"
                  className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container flex flex-col gap-4"
                >
                  {/* 영수증 헤더 */}
                  <div className="flex items-center justify-between pb-2 border-b border-surface-container">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[22px]">receipt_long</span>
                      <h3 className="font-headline-sm text-headline-sm font-bold text-primary">결제 내역 요약</h3>
                    </div>
                    <button
                      className="px-3 py-1 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-primary transition-colors font-label-sm text-label-sm flex items-center gap-1 cursor-pointer"
                      type="button"
                      onClick={handlePrintReceipt}
                    >
                      <span className="material-symbols-outlined text-[14px]">print</span>
                      전자 영수증 인쇄/발송
                    </button>
                  </div>

                  {/* 거래 기본 스펙 박스 */}
                  <div className="bg-surface-container-low p-4 rounded-xl flex flex-col gap-2 font-body-sm text-body-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant">계약/주문번호</span>
                      <div className="flex items-center gap-2">
                        <span className="font-label-md text-label-md font-bold text-primary font-mono tracking-wider">
                          {receipt.orderNo}
                        </span>
                        <button
                          className="px-2 py-0.5 rounded bg-surface-container-highest hover:bg-surface-container text-on-surface text-[11px] font-medium transition-colors cursor-pointer"
                          type="button"
                          onClick={() => handleCopyOrderNo(receipt.orderNo)}
                          title="계약번호 복사"
                        >
                          복사
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant">승인 일시</span>
                      <span className="text-on-surface font-medium">{receipt.paidDt}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-on-surface-variant">결제 수단</span>
                      <span className="text-on-surface font-medium">{receipt.pgProviderCd}</span>
                    </div>
                  </div>

                  {/* 수수료 및 할인 상세 계산 */}
                  <div className="flex flex-col gap-2 py-1">
                    <div className="flex items-center justify-between font-body-md text-body-md">
                      <span className="text-on-surface-variant">정상 데이터 이용료</span>
                      <span className="text-on-surface font-semibold">
                        {receipt.baseFeeAmt.toLocaleString()} 원
                      </span>
                    </div>
                    <div className="flex items-center justify-between font-body-md text-body-md">
                      <div className="flex items-center gap-1 text-secondary">
                        <span className="material-symbols-outlined text-[16px]">sell</span>
                        <span>프로모션 할인</span>
                      </div>
                      <span className="text-secondary font-bold">
                        -{receipt.totalDiscountAmt.toLocaleString()} 원
                      </span>
                    </div>
                    <div className="pl-4 flex flex-col gap-0.5 text-[12px] text-outline">
                      <div className="flex justify-between">
                        <span>└ 신규 첫 이용 환영 쿠폰</span>
                        <span>-{receipt.discountCouponAmt.toLocaleString()} 원</span>
                      </div>
                      <div className="flex justify-between">
                        <span>└ 쓸고닦고 리워드 포인트</span>
                        <span>-{receipt.usedPointAmt.toLocaleString()} P</span>
                      </div>
                    </div>
                  </div>

                  {/* 실 결제 승인액 강조 박스 */}
                  <div className="p-4 rounded-xl bg-surface-container flex flex-col gap-1">
                    <div className="flex items-center justify-between font-label-md text-label-md text-on-surface-variant">
                      <span>실 결제 승인액 (플랫폼 중개 라이선스)</span>
                      <span className="text-[11px] font-normal text-outline">VAT 포함</span>
                    </div>
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="font-headline-lg text-headline-lg font-bold text-primary font-mono tracking-tight">
                        {receipt.actualPaidAmt.toLocaleString()}
                      </span>
                      <span className="font-headline-sm text-headline-sm font-bold text-primary">원</span>
                    </div>
                  </div>

                  {/* 현장 직불 청소 시공비 안내 박스 */}
                  <div className="p-4 rounded-xl bg-surface-container-low flex flex-col gap-2 border border-surface-container">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-primary">
                        <span className="material-symbols-outlined text-[18px]">handshake</span>
                        <span className="font-label-md text-label-md font-bold">현장 직불 청소 시공비</span>
                      </div>
                      <div className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        {receipt.totalServiceAmt.toLocaleString()} 원
                      </div>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                      ※ 청소 완료 후 현장에서 파트너 기사님께 직접 정산하는 시공비입니다. (정기 입주청소 240,000원 +
                      에어컨 가전 살균 80,000원 / 현금영수증 및 카드결제 가능)
                    </p>
                  </div>

                  {/* B. 액션 버튼 그룹 */}
                  <div className="flex flex-col gap-2.5 pt-2">
                    <button
                      className="w-full h-12 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm active:scale-[0.99] cursor-pointer"
                      type="button"
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate('user-his-01', { contractNo: receipt.contractNo });
                        } else {
                          window.location.hash = '#user-his-01';
                        }
                      }}
                    >
                      <span>예약 상세 내역 보기 (USER-HIS-01)</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>

                    <button
                      className="w-full h-12 rounded-xl bg-secondary text-on-secondary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-sm active:scale-[0.99] cursor-pointer hover:bg-secondary/90"
                      type="button"
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate('user-qot-02', { contractNo: receipt.contractNo });
                        } else {
                          window.location.hash = '#user-qot-02';
                        }
                      }}
                    >
                      <span className="material-symbols-outlined text-[18px]">forum</span>
                      <span>파트너 1:1 상담 채팅 바로가기</span>
                    </button>

                    <button
                      className="w-full h-12 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.99] cursor-pointer"
                      type="button"
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate('user-com-00');
                        } else {
                          window.location.hash = '#home';
                        }
                      }}
                    >
                      <span className="material-symbols-outlined text-[18px]">roofing</span>
                      <span>메인 홈으로 이동 (USER-COM-00)</span>
                    </button>
                  </div>

                  {/* 고객센터 안내 */}
                  <div className="text-center pt-2">
                    <p className="font-body-sm text-body-sm text-outline">
                      결제 및 매칭 관련 문의{' '}
                      <a
                        className="font-label-md text-label-md text-primary font-bold hover:underline"
                        href="tel:1588-0000"
                      >
                        1588-0000
                      </a>{' '}
                      <span className="text-[11px]">(평일 09:00~18:00)</span>
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================================
          3. 푸터
      ===================================================================== */}
      <footer className="w-full bg-surface-container-low pt-12 pb-12 border-t border-surface-container">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-12 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 gap-4 border-b border-surface-container">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-secondary text-[24px]">cleaning_services</span>
              <span className="font-headline-sm text-headline-sm font-bold tracking-tight text-primary">
                SsulDak 쓸고닦고
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-6 font-label-md text-label-md">
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                이용약관
              </a>
              <a className="text-primary font-bold hover:text-primary-container transition-colors" href="#">
                개인정보처리방침
              </a>
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                고객만족센터
              </a>
              <a
                className="text-secondary font-bold hover:text-on-secondary-container transition-colors"
                href="#"
              >
                마스터 파트너 입점문의
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 space-y-1 text-on-surface-variant font-body-sm text-body-sm">
              <p className="font-label-lg text-label-lg text-on-surface mb-1">(주)쓸고닦고 플랫폼 사업자 정보</p>
              <p>대표자: 김대표 | 사업자등록번호: 120-88-99999 | 통신판매업신고: 제2024-경기고양-1234호</p>
              <p>주소: 경기도 고양시 일산동구 중앙로 1234 쏠닥빌딩 8층 | 개인정보보호책임자: cs@ssuldak.kr</p>
              <p className="mt-2 text-outline font-label-sm text-label-sm">
                쓸고닦고는 통신판매중개자로서 통신판매의 당사자가 아니며, 개별 마스터 파트너가 제공하는 용역 서비스의 의무와
                책임은 해당 파트너에게 있습니다.
              </p>
            </div>

            <div className="lg:col-span-4 bg-surface-container-lowest p-6 rounded-2xl shadow-[0_1px_8px_rgba(22,59,102,0.04)] flex flex-col gap-2 border border-surface-container">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">
                  Customer Care
                </span>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                  연중무휴
                </span>
              </div>
              <div className="text-headline-md font-headline-md font-bold text-primary">1588-0000</div>
              <p className="text-on-surface-variant font-body-sm text-body-sm">
                평일 08:00 - 20:00 (주말 및 공휴일 09:00 - 18:00)
              </p>
              <button
                className="mt-2 w-full py-2.5 rounded-xl bg-surface-container-high text-primary hover:bg-surface-container-highest transition-colors font-label-md text-label-md text-center font-bold cursor-pointer"
                type="button"
              >
                1:1 실시간 케어 문의
              </button>
            </div>
          </div>

          <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-2 text-outline font-label-sm text-label-sm border-t border-surface-container">
            <div>© 2026 SsulDak Co., Ltd. All rights reserved. 대한민국 1등 홈&빌딩 케어 솔루션.</div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
                안심 책임배상보험 10억원 가입
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">shield</span>
                에스크로 안전결제 적용
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UserCnt01;
