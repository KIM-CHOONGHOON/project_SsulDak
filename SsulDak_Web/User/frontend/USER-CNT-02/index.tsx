import React, { useState, useEffect } from 'react';

// =============================================================================
// SsulDak (쓸고닦고) USER-CNT-02: 결제 승인 실패 / 자산 복원
// 규격: Next.js (App Router) & React / TypeScript / Tailwind CSS
// 1:1 매핑 백엔드: /api/user/user_cnt_02 (POST)
// =============================================================================

export interface UserCnt02Props {
  userNo?: string;
  reqNo?: string;
  contractNo?: string;
  couponNo?: string | null;
  usePointAmt?: number;
  errorCode?: string;
  errorMsg?: string;
  attemptedPaidAmt?: number;
  onNavigate?: (screenId: string, params?: Record<string, any>) => void;
  onBack?: () => void;
}

export interface BookingServiceItem {
  processNo: string;
  serviceName: string;
  subTitle: string;
  partnerName: string;
  partnerCeo: string;
  serviceAmt: number;
  icon: string;
}

export interface FailDetails {
  isCouponRestored: boolean;
  restoredCouponNm: string;
  restoredCouponAmt: number;
  restoredPointAmt: number;
  currentTotalPoints: number;
  orderNo: string;
  txId: string;
  errorCode: string;
  errorMsg: string;
  friendlyErrorMsg: string;
  attemptedPaidAmt: number;
  baseFeeAmt: number;
  attemptedAt: string;
  services: BookingServiceItem[];
  totalServiceAmt: number;
}

export const UserCnt02: React.FC<UserCnt02Props> = ({
  userNo = 'U20261000001',
  reqNo = 'REQ202610210001',
  contractNo = 'CT2026102100001',
  couponNo = 'CPN202610000001',
  usePointAmt = 2000,
  errorCode = 'PG_CARD_LIMIT',
  errorMsg = '카드 한도 초과 또는 잔액 부족',
  attemptedPaidAmt = 26000,
  onNavigate,
  onBack,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [details, setDetails] = useState<FailDetails>({
    isCouponRestored: true,
    restoredCouponNm: '웰컴 신규가입 5,000원 할인 쿠폰',
    restoredCouponAmt: 5000,
    restoredPointAmt: usePointAmt || 2000,
    currentTotalPoints: 3000,
    orderNo: 'CNT-20261021-0001',
    txId: 'TX-20261021-9984',
    errorCode: errorCode || 'PG_CARD_LIMIT',
    errorMsg: errorMsg || '카드 한도 초과 또는 잔액 부족',
    friendlyErrorMsg:
      '등록하신 결제 수단의 온라인 결제 한도가 초과되었거나 잔액이 부족하여 승인되지 않았습니다. 일시적인 금융사 네트워크 지연 또는 설정 한도를 확인해 주세요.',
    attemptedPaidAmt: attemptedPaidAmt || 26000,
    baseFeeAmt: 33000,
    attemptedAt: '2026.10.21 14:35:12',
    services: [
      {
        processNo: '공정 01',
        serviceName: '정기 오피스/빌라 케어 3개월',
        subTitle: '주 2회 정밀 케어 약정',
        partnerName: '반짝빌라클린',
        partnerCeo: '홍길동 대표',
        serviceAmt: 240000,
        icon: 'corporate_fare',
      },
      {
        processNo: '공정 02',
        serviceName: '가전 분해 세척 천장형 에어컨 1대',
        subTitle: '친환경 고압 스팀 소독 포함',
        partnerName: '홈케어마스터',
        partnerCeo: '공식인증 엔지니어',
        serviceAmt: 80000,
        icon: 'mode_fan',
      },
    ],
    totalServiceAmt: 320000,
  });

  // 토스트 메시지 상태
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastShow, setToastShow] = useState<boolean>(false);

  // 실시간 24시간 카운트다운 타이머 (초 단위)
  const [countdownSeconds, setCountdownSeconds] = useState<number>(23 * 3600 + 59 * 60 + 12);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // 백엔드 롤백 API 호출 및 최신 자산 상태 조회
  useEffect(() => {
    let isMounted = true;

    async function executeRollbackAndFetch() {
      setLoading(true);
      try {
        const response = await fetch('/api/user/user_cnt_02', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            actionType: 'ROLLBACK_AND_REPORT',
            userNo,
            reqNo,
            contractNo,
            couponNo,
            usePointAmt,
            errorCode,
            errorMsg,
            attemptedPaidAmt,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (isMounted && data.success) {
            setDetails((prev) => ({
              ...prev,
              isCouponRestored: data.isCouponRestored ?? true,
              restoredCouponNm: data.restoredCouponNm || prev.restoredCouponNm,
              restoredCouponAmt: data.restoredCouponAmt ?? prev.restoredCouponAmt,
              restoredPointAmt: data.restoredPointAmt ?? prev.restoredPointAmt,
              currentTotalPoints: data.currentTotalPoints ?? prev.currentTotalPoints,
              orderNo: data.orderNo || prev.orderNo,
              txId: data.txId || prev.txId,
              errorCode: data.errorCode || prev.errorCode,
              errorMsg: data.errorMsg || prev.errorMsg,
              friendlyErrorMsg: data.friendlyErrorMsg || prev.friendlyErrorMsg,
              attemptedPaidAmt: data.attemptedPaidAmt ?? prev.attemptedPaidAmt,
              baseFeeAmt: data.baseFeeAmt ?? prev.baseFeeAmt,
              attemptedAt: data.attemptedAt || prev.attemptedAt,
              services: data.services && data.services.length > 0 ? data.services : prev.services,
              totalServiceAmt: data.totalServiceAmt ?? prev.totalServiceAmt,
            }));
          }
        }
      } catch (err) {
        console.warn('API error fetching fail details, using fallback state:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    executeRollbackAndFetch();

    return () => {
      isMounted = false;
    };
  }, [userNo, reqNo, contractNo, couponNo, usePointAmt, errorCode, errorMsg, attemptedPaidAmt]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastShow(true);
    setTimeout(() => {
      setToastShow(false);
    }, 2800);
  };

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased selection:bg-primary-fixed selection:text-primary">
      {/* =====================================================================
          0. 인터랙티브 플로팅 토스트 알림
      ===================================================================== */}
      <div
        className={`fixed top-24 right-8 z-50 transform transition-all duration-300 flex items-center gap-2 px-4 py-2.5 bg-brand-navy text-on-primary rounded-xl shadow-2xl font-label-md text-label-md border border-white/20 ${
          toastShow
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-[-20px] opacity-0 pointer-events-none'
        }`}
      >
        <span className="material-symbols-outlined text-secondary-fixed text-[18px]">verified</span>
        <span>{toastMessage}</span>
      </div>

      {/* =====================================================================
          1. 고정형 GNB 헤더 (Header)
      ===================================================================== */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/95 backdrop-blur-md border-b border-surface-container-high/60 shadow-[0_2px_12px_rgba(31,73,125,0.04)]">
        <div className="h-20 max-w-[1440px] mx-auto px-8 md:px-12 flex items-center justify-between gap-gutter-desktop">
          <div className="flex items-center gap-6">
            <a
              className="flex items-center gap-2 text-brand-navy group cursor-pointer"
              onClick={() => onNavigate?.('user-com-00')}
            >
              <img
                alt="SsulDak Brand Logo"
                className="h-9 w-auto object-contain group-hover:scale-105 transition-transform"
                src="/logo.png"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://lh3.googleusercontent.com/aida/AEtjO1XlE5dGCq6Awu7YGl9jLXQCTA7t0IZsmJfZyUQSy_So39r5B_9DgKVRpNgn2lIWPB_vkFwbyJvxRauYr8NrBr8Ev5HNLHcxNuK1dyz8aQQON3nkYvZA0iFnBntaXm5YE-GRy1fdElMY7mqcgcLiOn6Igu7ZM3Dehje1BVaFd_UK3AteIgpBjbsnSSlBOEigu2qfzX9XgGZgL6mO3R9fV4YtByyCV6ArO-jWEfVoHeAtGM8Q98I4mu5IqYg';
                }}
              />
              <span className="font-display text-[22px] font-extrabold tracking-tight text-brand-navy">
                SsulDak <span className="text-secondary font-bold text-[18px]">쓸고닦고</span>
              </span>
            </a>

            <div className="h-5 w-px bg-surface-container-high hidden md:block"></div>

            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container hover:border-outline-variant/60 border border-transparent transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">location_on</span>
              <span className="font-label-md text-label-md font-medium">경기 고양시 일산동구</span>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">expand_more</span>
            </button>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            <a
              className="px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors font-label-md text-label-md cursor-pointer"
              onClick={() => onNavigate?.('user-com-00')}
            >
              홈
            </a>
            <a
              className="px-4 py-2 rounded-lg bg-brand-navy text-on-primary font-bold shadow-sm font-label-md text-label-md cursor-pointer"
              onClick={() => onNavigate?.('user-qot-00')}
            >
              견적현황
            </a>
            <a
              className="px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors font-label-md text-label-md cursor-pointer"
              onClick={() => onNavigate?.('user-his-00')}
            >
              이용내역
            </a>
            <a
              className="px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors font-label-md text-label-md cursor-pointer"
              href="#"
            >
              쿠폰북
            </a>
            <a
              className="px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors font-label-md text-label-md cursor-pointer"
              onClick={() => onNavigate?.('user-ath-03')}
            >
              마이
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              aria-label="장바구니"
              className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors relative cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
            </button>
            <button
              aria-label="알림"
              className="p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors relative cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error ring-2 ring-surface-container-lowest"></span>
            </button>
            <div
              className="w-9 h-9 rounded-full bg-brand-navy flex items-center justify-center text-on-primary cursor-pointer hover:opacity-90 transition-opacity ml-1 ring-2 ring-primary-fixed"
              onClick={() => onNavigate?.('user-ath-03')}
            >
              <span className="material-symbols-outlined text-[20px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. 메인 컨텐츠 영역
      ===================================================================== */}
      <main className="w-full pt-20 bg-surface min-h-[calc(100vh-80px)] pb-16">
        <div className="flex flex-col w-full">
          {/* 상단 브레드크럼 & 세션/주문번호 바 */}
          <div className="w-full bg-surface-container-low/80 border-b border-surface-container-high/60 py-3">
            <div className="max-w-[1440px] mx-auto px-8 md:px-12 flex flex-wrap items-center justify-between gap-3">
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-label-md text-label-md text-outline">
                <a
                  className="hover:text-brand-navy transition-colors flex items-center gap-1 text-on-surface-variant font-medium cursor-pointer"
                  onClick={() => onNavigate?.('user-com-00')}
                >
                  <span className="material-symbols-outlined text-[17px]">home</span>홈
                </a>
                <span className="material-symbols-outlined text-[15px] text-outline-variant">chevron_right</span>
                <a
                  className="hover:text-brand-navy transition-colors text-on-surface-variant font-medium cursor-pointer"
                  onClick={() => onNavigate?.('user-qot-00')}
                >
                  견적 현황
                </a>
                <span className="material-symbols-outlined text-[15px] text-outline-variant">chevron_right</span>
                <a
                  className="hover:text-brand-navy transition-colors text-on-surface-variant font-medium cursor-pointer"
                  onClick={() => onNavigate?.('user-cnt-00')}
                >
                  계약 확정 및 결제 (USER-CNT-00)
                </a>
                <span className="material-symbols-outlined text-[15px] text-outline-variant">chevron_right</span>
                <span className="text-error font-bold flex items-center gap-1 bg-error-container/40 px-2.5 py-0.5 rounded-full text-xs">
                  <span className="material-symbols-outlined text-[15px]">cancel</span>결제 실패/취소
                </span>
              </nav>

              <div className="flex items-center gap-2.5 font-label-sm text-label-sm text-on-surface-variant bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-surface-container shadow-xs">
                <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
                <span className="text-outline">세션/주문 고유번호:</span>
                <span className="font-mono text-brand-navy font-bold">{details.txId}</span>
              </div>
            </div>
          </div>

          {/* 메인 그리드 컨테이너: 1440px */}
          <div className="max-w-[1440px] mx-auto px-8 md:px-12 py-8 w-full flex flex-col gap-6">
            {/* 1. 상단 결제 실패 알림 히어로 배너 */}
            <section className="relative overflow-hidden rounded-2xl bg-surface-container-lowest border border-error-container/70 shadow-[0_12px_36px_rgba(186,26,26,0.06)] p-8 md:p-10 text-center">
              {/* 후광 앰비언트 그라데이션 */}
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[580px] h-72 bg-gradient-to-b from-error-container/40 via-error-container/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
                {/* 에러 뱃지 및 아이콘 */}
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-2xl bg-error-container/60 border border-error/20 flex items-center justify-center text-error shadow-sm animate-pulse">
                    <span className="material-symbols-outlined text-[38px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      error
                    </span>
                  </div>
                  <span className="absolute -bottom-1 -right-2 px-2 py-0.5 rounded-full bg-error text-on-error font-label-sm text-[10px] uppercase font-bold tracking-wider shadow">
                    Declined
                  </span>
                </div>

                {/* 메인 헤드라인 */}
                <h1 className="font-headline-lg text-2xl md:text-[30px] font-extrabold text-on-surface tracking-tight leading-snug">
                  결제 승인 처리에 실패하였습니다
                </h1>
                <p className="mt-2 text-on-surface-variant font-body-lg text-base leading-relaxed">
                  카드사 또는 전자결제대행사(PG)로부터 결제 승인이 정상 처리되지 않았습니다.
                </p>

                {/* 에러 태그 바 */}
                <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 bg-surface-container-low/90 border border-surface-container px-4 py-2 rounded-full text-xs font-medium text-on-surface-variant shadow-sm">
                  <span className="inline-flex items-center gap-1 font-bold text-error bg-error-container/50 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-error"></span>결제 승인 거절
                  </span>
                  <span className="text-outline-variant font-light">•</span>
                  <span className="font-mono font-bold text-brand-navy bg-surface-container-highest/60 px-2 py-0.5 rounded">
                    [{details.errorCode}]
                  </span>
                  <span className="text-outline-variant font-light">•</span>
                  <span className="text-outline">
                    시도 일시: <strong className="text-on-surface font-medium">{details.attemptedAt}</strong>
                  </span>
                </div>
              </div>
            </section>

            {/* 2. 2컬럼 레이아웃 (Left ~65% / Right ~35%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* 좌측 메인 안내 컬럼 (~65%, lg:col-span-8) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                {/* Card A: 실패 사유 및 권장 조치 가이드 */}
                <section className="rounded-2xl bg-surface-container-lowest border border-surface-container-high/70 p-6 md:p-7 shadow-[0_4px_20px_rgba(31,73,125,0.04)]">
                  <div className="flex items-center justify-between pb-3 border-b border-surface-container-low">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-error-container/40 flex items-center justify-center text-error">
                        <span className="material-symbols-outlined text-[20px]">report_problem</span>
                      </div>
                      <h2 className="font-headline-sm text-lg font-bold text-brand-navy">
                        실패 사유 및 권장 조치 가이드
                      </h2>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-surface-container-low text-on-surface-variant font-label-sm text-xs font-semibold">
                      PG 승인 응답 리포트
                    </span>
                  </div>

                  {/* 경고 박스: 실패 상세 원인 */}
                  <div className="mt-4 p-4 rounded-xl bg-error-container/25 border border-error-container flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 text-error font-label-lg text-sm md:text-base font-bold">
                      <span className="material-symbols-outlined text-[19px]">credit_card_off</span>
                      <span>
                        [{details.errorCode}] {details.errorMsg}
                      </span>
                    </div>
                    <p className="font-body-md text-sm text-on-surface-variant leading-relaxed pl-7">
                      {details.friendlyErrorMsg}
                    </p>
                  </div>

                  {/* 권장 해결 조치 체크리스트 */}
                  <div className="mt-5 space-y-3">
                    <h3 className="font-label-md text-xs font-bold uppercase tracking-wider text-outline">
                      권장 해결 조치 체크리스트
                    </h3>
                    <div className="space-y-2.5">
                      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low/70 border border-surface-container-high/40 hover:bg-surface-container-low transition-colors">
                        <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                        </div>
                        <div className="text-sm">
                          <strong className="text-on-surface font-semibold">카드사 앱 한도 점검 및 증액:</strong>
                          <span className="text-on-surface-variant ml-1">
                            이용 중이신 카드사 모바일 앱에서 일일/월간 온라인 전자상거래 이용 한도와 잔여 한도를 점검해
                            주세요.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low/70 border border-surface-container-high/40 hover:bg-surface-container-low transition-colors">
                        <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                        </div>
                        <div className="text-sm">
                          <strong className="text-on-surface font-semibold">유효기간, CVC 보안 인증 재확인:</strong>
                          <span className="text-on-surface-variant ml-1">
                            카드 번호, 유효년월, 뒷면 3자리 CVC 보안코드 및 간편인증(ISP/앱카드) 비밀번호 오류를 확인해
                            주세요.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-low/70 border border-surface-container-high/40 hover:bg-surface-container-low transition-colors">
                        <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                        </div>
                        <div className="text-sm">
                          <strong className="text-on-surface font-semibold">대체 수단으로 결제 권장:</strong>
                          <span className="text-on-surface-variant ml-1">
                            간편결제(네이버페이, 카카오페이, 토스페이) 또는 실시간 가상계좌(에스크로)로 변경 결제하시면
                            즉시 확정 가능합니다.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Card B: 자산 자동 복원 보증 카드 (Benefit Restoration Safeguard) */}
                <section className="rounded-2xl bg-gradient-to-br from-surface-container-low via-surface-container-lowest to-surface-container-low/80 border border-secondary-container/60 p-6 md:p-7 shadow-[0_4px_20px_rgba(0,108,74,0.04)] relative overflow-hidden">
                  <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-secondary-container/20 rounded-full blur-2xl pointer-events-none"></div>

                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 text-secondary font-bold text-xs uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[18px]">verified_user</span>
                      <span>Benefit Restoration Safeguard</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-xs font-bold">
                      100% 안전 보호 중
                    </span>
                  </div>

                  <h3 className="font-headline-sm text-lg font-bold text-brand-navy flex items-center gap-2">
                    <span>💡</span>
                    <span>안심하세요! 적용하셨던 혜택은 안전하게 자동 복원되었습니다.</span>
                  </h3>
                  <p className="text-sm text-on-surface-variant mt-1.5 mb-5 leading-relaxed">
                    결제 시도가 중단되더라도 고객님의 보유 쿠폰과 포인트는 단 1원도 차감되지 않고 즉시 원래 상태로
                    원복되었습니다.
                  </p>

                  {/* 3가지 복원 혜택 그리드 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                    {/* Benefit 1: 쿠폰 원복 */}
                    <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container flex flex-col justify-between shadow-sm hover:border-secondary-container transition-all">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-label-sm text-xs text-outline font-semibold">웰컴 신규가입 쿠폰</span>
                        <span className="px-2 py-0.5 rounded bg-secondary-container/70 text-on-secondary-container font-label-sm text-[11px] font-bold">
                          즉시 사용 가능
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="font-display text-2xl font-extrabold text-brand-navy">
                          {details.restoredCouponAmt.toLocaleString()}
                        </span>
                        <span className="text-sm font-bold text-brand-navy ml-0.5">원</span>
                      </div>
                      <p className="text-xs text-secondary font-medium mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">check_circle</span>
                        <span>쿠폰 원복 완료</span>
                      </p>
                    </div>

                    {/* Benefit 2: 포인트 원복 */}
                    <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container flex flex-col justify-between shadow-sm hover:border-secondary-container transition-all">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-label-sm text-xs text-outline font-semibold">쓸고닦고 포인트</span>
                        <span className="px-2 py-0.5 rounded bg-primary-fixed/60 text-brand-navy font-label-sm text-[11px] font-bold">
                          차감 없음
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="font-display text-2xl font-extrabold text-brand-navy">
                          {details.restoredPointAmt.toLocaleString()}
                        </span>
                        <span className="text-sm font-bold text-brand-navy ml-0.5">P</span>
                      </div>
                      <p className="text-xs text-on-surface-variant font-medium mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-secondary">
                          account_balance_wallet
                        </span>
                        <span>보유 유지 (총 {details.currentTotalPoints.toLocaleString()} P)</span>
                      </p>
                    </div>

                    {/* Benefit 3: 파트너 견적 예약 보호 */}
                    <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container flex flex-col justify-between shadow-sm hover:border-secondary-container transition-all">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-label-sm text-xs text-outline font-semibold">파트너 견적 예약 보호</span>
                        <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-[11px] font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping"></span>
                          {formatCountdown(countdownSeconds)}
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="font-display text-xl font-extrabold text-secondary">24시간 보존</span>
                      </div>
                      <p className="text-xs text-on-surface-variant font-medium mt-2 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-secondary">lock_clock</span>
                        <span>견적 조건 및 단가 유지</span>
                      </p>
                    </div>
                  </div>
                </section>

                {/* Card C: 결제 진행 중이던 시공 의뢰 내역 */}
                <section className="rounded-2xl bg-surface-container-lowest border border-surface-container-high/70 p-6 md:p-7 shadow-[0_4px_20px_rgba(31,73,125,0.04)]">
                  <div className="flex items-center justify-between pb-3 border-b border-surface-container-low mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-brand-navy">
                        <span className="material-symbols-outlined text-[20px]">assignment</span>
                      </div>
                      <div>
                        <h3 className="font-headline-sm text-lg font-bold text-brand-navy">
                          결제 진행 중이던 시공 의뢰 내역
                        </h3>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-xs font-medium">
                      {details.services.length}개 공정 패키지 청약
                    </span>
                  </div>

                  {/* 공정 목록 */}
                  <div className="space-y-3">
                    {details.services.map((item, index) => (
                      <div
                        key={`service_${index}`}
                        className="p-4 rounded-xl bg-surface-container-low/60 border border-surface-container-high/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5">
                          <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                              index === 0
                                ? 'bg-primary-fixed text-brand-navy'
                                : 'bg-secondary-container text-secondary'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  index === 0
                                    ? 'bg-brand-navy text-on-primary'
                                    : 'bg-secondary text-on-secondary'
                                }`}
                              >
                                {item.processNo}
                              </span>
                              <span className="font-label-lg text-sm md:text-base font-bold text-on-surface">
                                {item.serviceName}
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1.5 flex items-center gap-2">
                              <span>
                                파트너: <strong className="text-on-surface">{item.partnerName}</strong> (
                                {item.partnerCeo})
                              </span>
                              <span className="text-outline-variant">•</span>
                              <span>{item.subTitle}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-left md:text-right shrink-0 border-t md:border-t-0 pt-2 md:pt-0 border-surface-container">
                          <span className="font-label-sm text-xs text-outline">현장 결제 예정액</span>
                          <div className="font-headline-sm text-lg font-bold text-brand-navy">
                            {item.serviceAmt.toLocaleString()} 원
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 현장 지불 실제 용역비 합계 바 */}
                  <div className="mt-4 p-4 rounded-xl bg-surface-container/70 border border-surface-container-high flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-2 text-on-surface">
                      <span className="material-symbols-outlined text-secondary text-[20px]">handshake</span>
                      <span>
                        현장 지불 실제 용역비 합계:{' '}
                        <strong className="text-brand-navy font-bold text-base">
                          {details.totalServiceAmt.toLocaleString()}원
                        </strong>
                      </span>
                    </div>
                    <span className="text-xs text-outline">
                      ※ 시공 완료 후 마스터에게 직접 지급되며, 플랫폼 이용료와는 별개입니다.
                    </span>
                  </div>

                  {/* 비활성화 고지 박스 */}
                  <div className="mt-4 flex items-start gap-2.5 p-3.5 rounded-xl bg-error-container/20 border border-error-container/50 text-error text-xs md:text-sm leading-relaxed">
                    <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">info</span>
                    <span>
                      결제가 완료되지 않아 <strong>마스터 파트너 배차 확정</strong> 및{' '}
                      <strong>1:1 안심 상담 채팅방</strong>이 아직 비활성화 상태입니다. 재시도를 완료하시면 즉시
                      활성화됩니다.
                    </span>
                  </div>
                </section>
              </div>

              {/* 우측 사이드바 컬럼 (~35%, lg:col-span-4): 재결제 요약 및 액션 패널 */}
              <aside className="lg:col-span-4 flex flex-col gap-5 sticky top-24">
                {/* Card A: 재결제 시도 요약 카드 */}
                <div className="rounded-2xl bg-surface-container-lowest border border-surface-container-high/80 p-6 shadow-[0_8px_30px_rgba(31,73,125,0.08)] flex flex-col gap-4">
                  <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-brand-navy text-[20px]">receipt_long</span>
                      <h3 className="font-headline-sm text-lg font-bold text-brand-navy">재결제 시도 요약</h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-error-container text-error font-label-sm text-xs font-bold">
                      미완료
                    </span>
                  </div>

                  {/* 주문 메타데이터 */}
                  <div className="p-3 rounded-xl bg-surface-container-low text-xs space-y-1.5 border border-surface-container">
                    <div className="flex justify-between items-center text-outline">
                      <span>청약 주문번호</span>
                      <span className="font-mono text-brand-navy font-bold">{details.orderNo}</span>
                    </div>
                    <div className="flex justify-between items-center text-outline">
                      <span>수납 항목</span>
                      <span className="text-on-surface font-medium">플랫폼 중개 데이터 이용료</span>
                    </div>
                  </div>

                  {/* 요금 계산서 */}
                  <div className="space-y-2.5 py-1 text-sm">
                    <div className="flex justify-between text-on-surface-variant">
                      <span>정상 데이터 이용료</span>
                      <span className="font-semibold text-on-surface">
                        {details.baseFeeAmt.toLocaleString()} 원
                      </span>
                    </div>
                    <div className="flex justify-between text-secondary">
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="material-symbols-outlined text-[15px]">local_offer</span>복원된 쿠폰 할인
                      </span>
                      <span className="font-bold">-{details.restoredCouponAmt.toLocaleString()} 원</span>
                    </div>
                    <div className="flex justify-between text-secondary">
                      <span className="flex items-center gap-1.5 text-xs">
                        <span className="material-symbols-outlined text-[15px]">stars</span>복원된 포인트 사용
                      </span>
                      <span className="font-bold">-{details.restoredPointAmt.toLocaleString()} 원</span>
                    </div>

                    {/* 총 결제 예상액 */}
                    <div className="mt-3 pt-3 border-t border-surface-container-high flex items-baseline justify-between">
                      <div>
                        <span className="font-label-lg text-sm font-bold text-brand-navy block">
                          재시도 승인 예상액
                        </span>
                        <span className="text-[11px] text-outline">부가세(VAT) 포함</span>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-3xl font-extrabold text-brand-navy tracking-tight">
                          {details.attemptedPaidAmt.toLocaleString()}
                        </span>
                        <span className="font-bold text-brand-navy text-base ml-0.5">원</span>
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼 2종 */}
                  <div className="flex flex-col gap-2.5 pt-1">
                    {/* 메인 재시도 버튼 (Deep Navy #1F497D) */}
                    <button
                      className="w-full py-3.5 px-4 rounded-xl bg-[#1F497D] hover:bg-[#183a63] text-on-primary font-bold text-sm md:text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-[0.99] transition-all text-center cursor-pointer group"
                      type="button"
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate('user-cnt-00', {
                            reqNo,
                            contractNo,
                            restored: true,
                          });
                        } else {
                          window.location.hash = '#contract-payment';
                        }
                      }}
                    >
                      <span className="material-symbols-outlined text-[19px] group-hover:rotate-45 transition-transform">
                        refresh
                      </span>
                      <span>다른 결제 수단으로 다시 시도하기 (USER-CNT-00)</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </button>

                    {/* 보조 버튼: 수신 청약 목록 */}
                    <button
                      className="w-full py-3 px-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface font-semibold text-xs md:text-sm flex items-center justify-center gap-1.5 border border-surface-container-high transition-colors text-center cursor-pointer"
                      type="button"
                      onClick={() => {
                        if (onNavigate) {
                          onNavigate('user-qot-00');
                        } else {
                          window.location.hash = '#quote-status';
                        }
                      }}
                    >
                      <span className="material-symbols-outlined text-[17px] text-outline">list_alt</span>
                      <span>수신 청약 목록으로 돌아가기 (USER-QOT-00)</span>
                    </button>
                  </div>

                  {/* 전담 매니저 상담 연결 링크 */}
                  <div className="text-center pt-1 border-t border-surface-container-low">
                    <button
                      className="inline-flex items-center gap-1 text-xs text-outline hover:text-brand-navy transition-colors cursor-pointer py-1"
                      type="button"
                      onClick={() => showToast('전담 매니저 결제 지원 상담창으로 연결되었습니다.')}
                    >
                      <span className="material-symbols-outlined text-[15px]">help_center</span>
                      <span>결제 오류 지속 시 전담 매니저 상담 연결</span>
                    </button>
                  </div>
                </div>

                {/* Card B: 전담 수납 지원 센터 (Dedicated Payment Support Center) */}
                <div className="rounded-2xl bg-surface-container-low border border-surface-container-high/60 p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-outline uppercase tracking-wider">
                      Fast Dedicated Support
                    </span>
                    <span className="flex items-center gap-1 text-xs text-secondary font-bold bg-secondary-container/50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>실시간 대기 2명
                    </span>
                  </div>
                  <div>
                    <h4 className="font-label-lg text-sm font-bold text-on-surface">결제가 계속 실패하시나요?</h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      전담 매니저가 즉시 원인 파악 및 수납을 도와드립니다.
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between py-1 bg-surface-container-lowest px-3.5 py-2.5 rounded-xl border border-surface-container">
                    <span className="text-xs font-semibold text-outline">대표 고객센터</span>
                    <span className="font-display text-xl font-extrabold text-brand-navy">1588-0000</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      className="py-2.5 px-3 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 text-amber-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-amber-300/40 cursor-pointer"
                      type="button"
                      onClick={() => showToast('카카오톡 쓸고닦고 긴급 상담 채널로 연결되었습니다.')}
                    >
                      <span
                        className="material-symbols-outlined text-[16px] text-amber-700"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        chat
                      </span>
                      <span>카카오 긴급 상담</span>
                    </button>
                    <button
                      className="py-2.5 px-3 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-brand-navy font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-surface-container-high cursor-pointer"
                      type="button"
                      onClick={() => showToast('전담 상담원 전화 연결 요청이 완료되었습니다.')}
                    >
                      <span className="material-symbols-outlined text-[16px] text-secondary">phone_in_talk</span>
                      <span>전화 연결 요청</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-outline text-center">평일 09:00 - 18:00 (점심시간 12:00 - 13:00 제외)</p>
                </div>

                {/* Card C: 안전 결제 보증 (Secure Escrow) */}
                <div className="rounded-xl bg-surface-container-lowest border border-surface-container p-4 flex flex-col gap-2 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-navy">
                    <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                    <span>안전 결제 보증 (Secure Escrow)</span>
                  </div>
                  <p className="text-[12px] text-on-surface-variant leading-relaxed">
                    SSL 256-bit 표준 암호화 통신 및 토스페이먼츠·KICC 에스크로 안전 결제 엔진으로 안전하게 보호됩니다.
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-outline border-t border-surface-container-low font-mono">
                    <span>SSL 256-bit Encrypted</span>
                    <span>•</span>
                    <span>TossPayments Secure</span>
                  </div>
                </div>
              </aside>
            </div>

            {/* 하단 에스크로 보안 보증 배너 */}
            <section className="rounded-2xl bg-surface-container-lowest border border-surface-container-high/80 p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary-container/60 text-secondary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">shield</span>
                </div>
                <div>
                  <div className="font-label-md text-sm font-bold text-brand-navy">
                    쓸고닦고 안전 에스크로 결제 보호 시스템
                  </div>
                  <p className="text-xs text-outline mt-0.5">
                    모든 계약 및 데이터 이용료 결제는 금융감독원 인가 전자금융결제업체의 보안망 아래 전액 보호 관리됩니다.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-[16px]">lock</span>
                  <span>256-bit SSL 암호화</span>
                </span>
                <span className="text-outline-variant">|</span>
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-[16px]">verified_user</span>
                  <span>KICC / TossPayments 공식 연동</span>
                </span>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* =====================================================================
          3. 푸터
      ===================================================================== */}
      <footer className="w-full bg-surface-container-low border-t border-surface-container-high/60 pt-12 pb-12">
        <div className="max-w-[1440px] mx-auto px-8 md:px-12 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-surface-container-high/80 gap-4">
            <div className="flex items-center gap-2 text-brand-navy">
              <span className="material-symbols-outlined text-secondary text-[26px]">cleaning_services</span>
              <span className="font-headline-sm text-xl font-extrabold tracking-tight text-brand-navy">
                SsulDak 쓸고닦고
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-6 font-label-md text-sm">
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                이용약관
              </a>
              <a className="text-brand-navy font-bold hover:underline transition-colors" href="#">
                개인정보처리방침
              </a>
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">
                고객만족센터
              </a>
              <a className="text-secondary font-bold hover:underline transition-colors" href="#">
                마스터 파트너 입점문의
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-8 space-y-2 text-on-surface-variant font-body-sm text-xs leading-relaxed">
              <p className="font-label-lg text-sm text-on-surface font-bold mb-1">(주)쓸고닦고 플랫폼 사업자 정보</p>
              <p>대표자: 김대표 | 사업자등록번호: 120-88-99999 | 통신판매업신고: 제2024-경기고양-1234호</p>
              <p>주소: 경기도 고양시 일산동구 중앙로 1234 쏠닥빌딩 8층 | 개인정보보호책임자: cs@ssuldak.kr</p>
              <p className="mt-3 text-outline text-[11px] leading-normal">
                쓸고닦고는 통신판매중개자로서 통신판매의 당사자가 아니며, 개별 마스터 파트너가 직접 제공하는 시공 및 용역
                서비스의 의무와 법적 책임은 해당 시공 파트너에게 있습니다.
              </p>
            </div>

            <div className="lg:col-span-4 bg-surface-container-lowest p-6 rounded-2xl border border-surface-container shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-outline uppercase tracking-wider font-semibold">Customer Care</span>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-xs font-bold">
                  연중무휴
                </span>
              </div>
              <div className="text-2xl font-extrabold text-brand-navy">1588-0000</div>
              <p className="text-xs text-on-surface-variant">평일 08:00 - 20:00 (주말 및 공휴일 09:00 - 18:00)</p>
              <button
                className="mt-2 w-full py-2.5 rounded-xl bg-brand-navy text-on-primary hover:bg-[#183a63] transition-colors font-label-md text-xs font-bold text-center cursor-pointer"
                type="button"
                onClick={() => showToast('1:1 실시간 케어 문의창이 열렸습니다.')}
              >
                1:1 실시간 케어 문의
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-surface-container-high/80 flex flex-col md:flex-row items-center justify-between gap-4 text-outline font-label-sm text-xs">
            <div>© 2026 SsulDak Co., Ltd. All rights reserved. 대한민국 No.1 프리미엄 홈&amp;오피스 케어 플랫폼.</div>
            <div className="flex items-center gap-5">
              <span className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>안심
                책임배상보험 10억원 가입
              </span>
              <span className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-secondary">shield</span>에스크로 안전결제
                적용
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default UserCnt02;
