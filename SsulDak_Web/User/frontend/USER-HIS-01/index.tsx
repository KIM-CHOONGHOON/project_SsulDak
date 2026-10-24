// SsulDak_Web/User/frontend/USER-HIS-01/index.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { ContractDetail, WorkLogDetail, PhotoItem } from '../../backend/api_USER_HIS_01/route';

interface UserHis01Props {
  userNo?: string;
  contractNo?: string;
  onNavigate?: (path: string, params?: Record<string, any>) => void;
}

export default function UserHis01({
  userNo = 'U20261000001',
  contractNo: initialContractNo = 'CT2026102368719',
  onNavigate,
}: UserHis01Props) {
  // 계약 데이터 및 시공 상태
  const [contractNo, setContractNo] = useState<string>(initialContractNo);

  useEffect(() => {
    if (initialContractNo) {
      setContractNo(initialContractNo);
    }
  }, [initialContractNo]);
  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [workLog, setWorkLog] = useState<WorkLogDetail | null>(null);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [hasMinimumPhotos, setHasMinimumPhotos] = useState<boolean>(true);
  const [refundPolicy, setRefundPolicy] = useState<{
    elapsedHours: number;
    isWithin7Days: boolean;
    refundRate: number;
    refundAmt: number;
    willBeSuspended: boolean;
  }>({
    elapsedHours: 48,
    isWithin7Days: true,
    refundRate: 50,
    refundAmt: 13000,
    willBeSuspended: false,
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [syncedAt, setSyncedAt] = useState<string>('10:42:15');
  const [isDirectPaidConfirmed, setIsDirectPaidConfirmed] = useState<boolean>(true);

  // 모달 상태 관리
  // 1. Lightbox 확대 모달
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; type: string } | null>(null);

  // 2. 시공 완료 확정 모달
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isConfirming, setIsConfirming] = useState<boolean>(false);

  // 3. 예약 취소 / 위약금 모달
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [cancelReason, setCancelReason] = useState<string>('고객 단순 변심 및 일정 변경 불가');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // 4. 고객센터 / 재시공 요청 모달
  const [showReCleanModal, setShowReCleanModal] = useState<boolean>(false);

  // 토스트 메시지
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastVisible, setToastVisible] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3200);
  };

  // 상세 시공 데이터 로드 함수 (GET_WORK_DETAIL)
  const fetchWorkDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/user_his_01', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userNo}_TOKEN`,
        },
        body: JSON.stringify({
          mode: 'GET_WORK_DETAIL',
          userNo,
          contractNo,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setContract(data.contract);
        setWorkLog(data.workLog);
        setPhotos(data.photos || []);
        setHasMinimumPhotos(data.hasMinimumPhotos ?? (data.photos?.length >= 2));
        if (data.refundPolicy) {
          setRefundPolicy(data.refundPolicy);
        }
        if (data.syncedAt) {
          setSyncedAt(data.syncedAt);
        }
      } else {
        showToast(data.message || '데이터를 불러오지 못했습니다.');
      }
    } catch (err: any) {
      console.error('Failed to fetch work detail:', err);
      showToast('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [userNo, contractNo]);

  useEffect(() => {
    fetchWorkDetail();
  }, [fetchWorkDetail]);

  // 시공 완료 확정 승인 처리 (CONFIRM_COMPLETE)
  const handleConfirmComplete = async () => {
    if (!workLog?.workSeq) {
      showToast('작업 정보를 확인할 수 없습니다.');
      return;
    }
    setIsConfirming(true);
    try {
      const res = await fetch('/api/user/user_his_01', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userNo}_TOKEN`,
        },
        body: JSON.stringify({
          mode: 'CONFIRM_COMPLETE',
          userNo,
          contractNo,
          workSeq: workLog.workSeq,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowConfirmModal(false);
        showToast('🎉 시공 완료가 확정되었습니다! 포토리뷰 작성으로 이동합니다.');
        // 상태 갱신
        if (workLog) {
          setWorkLog({ ...workLog, workStatCd: 'VERIFIED' });
        }
        if (contract) {
          setContract({ ...contract, contractStatCd: 'COMPLETED' });
        }
        // 리뷰 작성 화면으로 라우팅 (USER-HIS-02)
        setTimeout(() => {
          if (onNavigate) {
            onNavigate('user-his-02', { contractNo, workSeq: workLog?.workSeq });
          } else {
            window.location.hash = `#review-write?contractNo=${contractNo}`;
          }
        }, 1200);
      } else {
        showToast(data.message || '완료 확정 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      showToast('서버 통신 오류가 발생했습니다.');
    } finally {
      setIsConfirming(false);
    }
  };

  // 예약 취소 처리 (CANCEL_RESERVATION)
  const handleCancelReservation = async () => {
    setIsCancelling(true);
    try {
      const res = await fetch('/api/user/user_his_01', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userNo}_TOKEN`,
        },
        body: JSON.stringify({
          mode: 'CANCEL_RESERVATION',
          userNo,
          contractNo,
          cancelReason,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setShowCancelModal(false);
        showToast(data.message);
        if (contract) {
          setContract({ ...contract, contractStatCd: 'CANCELLED' });
        }
        // 청소 이용 내역(USER-HIS-00)으로 복귀
        setTimeout(() => {
          if (onNavigate) {
            onNavigate('user-his-00');
          } else {
            window.location.hash = '#history';
          }
        }, 1800);
      } else {
        showToast(data.message || '예약 취소 처리에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      showToast('서버 통신 오류가 발생했습니다.');
    } finally {
      setIsCancelling(false);
    }
  };

  // 5단계 시공 상태 판별
  // MATCHED -> DEPARTED -> WORKING -> INSPECTING -> VERIFIED / COMPLETED
  const currentStep = (() => {
    const stat = workLog?.workStatCd || 'INSPECTING';
    if (stat === 'MATCHED') return 1;
    if (stat === 'DEPARTED') return 2;
    if (stat === 'WORKING') return 3;
    if (stat === 'INSPECTING') return 4;
    if (stat === 'VERIFIED' || stat === 'COMPLETED') return 5;
    return 4;
  })();

  const isCompleteDisabled = currentStep < 4 || !hasMinimumPhotos || workLog?.workStatCd === 'VERIFIED';

  return (
    <div className="bg-[#f8f9ff] font-['Plus_Jakarta_Sans',sans-serif] text-[#0b1c30] antialiased min-h-screen flex flex-col">
      {/* ===================================================================== */}
      {/* HEADER BAR                                                            */}
      {/* ===================================================================== */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.05)] border-b border-[#e5eeff]">
        <div className="h-20 max-w-7xl mx-auto px-4 md:px-12 flex items-center justify-between">
          {/* Logo & Location */}
          <div className="flex items-center gap-6">
            <a
              className="flex items-center gap-1 text-[#00254a] transition-transform active:scale-95 cursor-pointer"
              onClick={() => onNavigate ? onNavigate('home') : (window.location.hash = '#home')}
            >
              <div className="w-10 h-10 rounded-xl bg-[#00254a] flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[24px]">cleaning_services</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl tracking-tight text-[#00254a] leading-none">SsulDak</span>
                <span className="text-[11px] text-[#006c4a] font-bold tracking-widest leading-none mt-1">쓸고닦고 케어</span>
              </div>
            </a>
            <div className="h-6 w-px bg-[#dce9ff] hidden sm:block"></div>
            <button
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#eff4ff] hover:bg-[#e5eeff] text-[#43474f] transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-[#006c4a]">location_on</span>
              <span className="text-[13px] font-semibold text-[#0b1c30]">
                {contract?.addrRoad ? contract.addrRoad.split(' ').slice(0, 3).join(' ') : '경기 고양시 일산동구'}
              </span>
              <span className="material-symbols-outlined text-[16px] text-[#737780]">keyboard_arrow_down</span>
            </button>
          </div>

          {/* GNB Navigation */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-[#eff4ff]">
            <a
              className="px-4 py-2 rounded-lg text-[15px] font-medium text-[#43474f] hover:text-[#0b1c30] transition-all cursor-pointer"
              onClick={() => onNavigate ? onNavigate('home') : (window.location.hash = '#home')}
            >
              홈
            </a>
            <a
              className="px-4 py-2 rounded-lg text-[15px] font-medium text-[#43474f] hover:text-[#0b1c30] transition-all cursor-pointer"
              onClick={() => onNavigate ? onNavigate('quote-status') : (window.location.hash = '#quote-status')}
            >
              견적현황
            </a>
            <a
              className="px-4 py-2 rounded-lg text-[15px] font-bold bg-[#00254a] text-white shadow-sm transition-all cursor-pointer"
              onClick={() => onNavigate ? onNavigate('history') : (window.location.hash = '#history')}
            >
              이용내역
            </a>
            <a
              className="px-4 py-2 rounded-lg text-[15px] font-medium text-[#43474f] hover:text-[#0b1c30] transition-all cursor-pointer"
              onClick={() => showToast('쿠폰북 준비 중입니다.')}
            >
              쿠폰북
            </a>
            <a
              className="px-4 py-2 rounded-lg text-[15px] font-medium text-[#43474f] hover:text-[#0b1c30] transition-all cursor-pointer"
              onClick={() => showToast('마이페이지 준비 중입니다.')}
            >
              마이
            </a>
          </nav>

          {/* User & Notifications */}
          <div className="flex items-center gap-3">
            <button
              aria-label="알림"
              className="relative w-10 h-10 rounded-lg flex items-center justify-center text-[#43474f] hover:bg-[#e5eeff] transition-colors"
              type="button"
              onClick={() => showToast('새로운 시공 업데이트 알림이 도착했습니다.')}
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
            </button>
            <div className="h-6 w-px bg-[#dce9ff]"></div>
            <div className="flex items-center gap-2 pl-1">
              <div className="w-8 h-8 rounded-full bg-[#00254a] flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-white text-[18px]">person</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* MAIN CONTAINER                                                        */}
      {/* ===================================================================== */}
      <main className="w-full pt-24 pb-16 bg-[#f8f9ff] flex-1">
        <div className="w-full max-w-7xl mx-auto px-4 md:px-12 flex flex-col gap-6">

          {/* 1. Top Breadcrumb & Page Meta */}
          <div className="flex flex-col gap-1.5">
            <nav className="flex items-center gap-2 text-[12px] text-[#43474f]">
              <a
                className="hover:text-[#00254a] transition-colors cursor-pointer"
                onClick={() => onNavigate ? onNavigate('home') : (window.location.hash = '#home')}
              >
                홈
              </a>
              <span className="material-symbols-outlined text-[14px] text-[#737780]">chevron_right</span>
              <a
                className="hover:text-[#00254a] transition-colors cursor-pointer"
                onClick={() => onNavigate ? onNavigate('user-his-00') : (window.location.hash = '#history')}
              >
                이용내역
              </a>
              <span className="material-symbols-outlined text-[14px] text-[#737780]">chevron_right</span>
              <span className="text-[#00254a] font-bold">청소 진행 상세</span>
            </nav>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
              <div className="flex items-start gap-3">
                <button
                  aria-label="이전 화면으로 이동"
                  className="w-10 h-10 rounded-xl bg-white hover:bg-[#e5eeff] text-[#0b1c30] flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0 border border-[#e5eeff]"
                  type="button"
                  onClick={() => onNavigate ? onNavigate('user-his-00') : (window.location.hash = '#history')}
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-[#00254a] tracking-tight">
                      청소 진행 상세 및 검수 리포트
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#dce9ff] text-[11px] text-[#00254a] font-bold">
                      {contract?.subItemNm || '정기청소 3개월 · 1회차'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#e5eeff] text-[11px] text-[#43474f] font-mono">
                      {contract?.contractNo || contractNo}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#43474f] mt-1">
                    파트너 마스터가 시공을 완료하고 현장 전/후 검수 사진을 업로드하였습니다.
                  </p>
                </div>
              </div>

              {/* Sync Status & Customer Center Call */}
              <div className="flex items-center gap-4 self-start md:self-auto">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white shadow-sm border border-[#e5eeff]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#006c4a] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#006c4a]"></span>
                  </span>
                  <span className="text-[11px] text-[#006c4a] font-bold">실시간 동기화 완료</span>
                </div>
                <a
                  className="flex items-center gap-1.5 text-[13px] text-[#00254a] hover:text-[#006c4a] transition-colors"
                  href="tel:1588-0000"
                >
                  <span className="material-symbols-outlined text-[18px]">support_agent</span>
                  <span className="font-bold">고객센터 1588-0000</span>
                </a>
              </div>
            </div>
          </div>

          {/* 2. Real-time 5-Step Process Stepper */}
          <section className="w-full bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff]">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#006c4a]"></span>
                  <span className="text-[17px] text-[#00254a] font-bold">실시간 시공 진행 상태</span>
                </div>
                <span className="text-[12px] text-[#737780]">최종 갱신: {syncedAt}</span>
              </div>

              {/* 5 Steps Linear Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {/* Step 1 */}
                <div className="flex flex-col gap-2">
                  <div className={`h-2 rounded-full w-full ${currentStep >= 1 ? 'bg-[#006c4a]' : 'bg-[#dce9ff]'}`}></div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${currentStep >= 1 ? 'bg-[#006c4a]' : 'bg-[#737780]'}`}>
                      <span className="material-symbols-outlined text-[13px]">check</span>
                    </div>
                    <span className="text-[13px] text-[#00254a] font-semibold">1. 배차완료</span>
                  </div>
                  <span className="text-[12px] text-[#737780] pl-6">10.28 14:20</span>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col gap-2">
                  <div className={`h-2 rounded-full w-full ${currentStep >= 2 ? 'bg-[#006c4a]' : 'bg-[#dce9ff]'}`}></div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${currentStep >= 2 ? 'bg-[#006c4a]' : 'bg-[#737780]'}`}>
                      <span className="material-symbols-outlined text-[13px]">check</span>
                    </div>
                    <span className="text-[13px] text-[#00254a] font-semibold">2. 현장출발</span>
                  </div>
                  <span className="text-[12px] text-[#737780] pl-6">11.01 08:35</span>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col gap-2">
                  <div className={`h-2 rounded-full w-full ${currentStep >= 3 ? 'bg-[#006c4a]' : 'bg-[#dce9ff]'}`}></div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${currentStep >= 3 ? 'bg-[#006c4a]' : 'bg-[#737780]'}`}>
                      <span className="material-symbols-outlined text-[13px]">check</span>
                    </div>
                    <span className="text-[13px] text-[#00254a] font-semibold">3. 작업시작</span>
                  </div>
                  <span className="text-[12px] text-[#737780] pl-6">11.01 09:00</span>
                </div>

                {/* Step 4 (Active / Pulsing or Completed) */}
                <div className="flex flex-col gap-2">
                  <div className={`h-2 rounded-full w-full ${currentStep >= 4 ? 'bg-[#00254a]' : 'bg-[#dce9ff]'}`}></div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${currentStep === 4 ? 'bg-[#00254a] animate-pulse ring-2 ring-[#a8c8fb]' : currentStep > 4 ? 'bg-[#006c4a]' : 'bg-[#737780]'}`}>
                      <span className="material-symbols-outlined text-[13px]">
                        {currentStep > 4 ? 'check' : 'photo_camera'}
                      </span>
                    </div>
                    <span className="text-[13px] text-[#00254a] font-extrabold flex items-center gap-1">
                      4. 검수대기
                      {currentStep === 4 && (
                        <span className="px-1.5 py-0.2 rounded bg-[#ffddb8] text-[#2a1700] text-[10px] font-bold">
                          진행중
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="text-[12px] text-[#006c4a] font-bold pl-6">11.01 10:40 업로드</span>
                </div>

                {/* Step 5 */}
                <div className={`flex flex-col gap-2 ${currentStep < 5 ? 'opacity-70' : ''}`}>
                  <div className={`h-2 rounded-full w-full ${currentStep >= 5 ? 'bg-[#006c4a]' : 'bg-[#dce9ff]'}`}></div>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white ${currentStep >= 5 ? 'bg-[#006c4a]' : 'bg-[#e5eeff] text-[#737780]'}`}>
                      <span className="material-symbols-outlined text-[13px]">
                        {currentStep >= 5 ? 'check' : 'hourglass_empty'}
                      </span>
                    </div>
                    <span className={`text-[13px] ${currentStep >= 5 ? 'text-[#00254a] font-bold' : 'text-[#737780]'}`}>
                      5. 시공완료
                    </span>
                  </div>
                  <span className="text-[12px] text-[#737780] pl-6">
                    {currentStep >= 5 ? '최종 검수 확정 완료' : '고객 확인 대기'}
                  </span>
                </div>
              </div>

              {/* Banner Info Callout */}
              <div className="mt-3 p-3.5 rounded-xl bg-[#e5eeff]/70 border border-[#dce9ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#00254a] text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                  </div>
                  <p className="text-[13px] text-[#0b1c30] leading-relaxed">
                    <strong className="font-bold text-[#00254a]">{contract?.ceoNm || '이*수'} 마스터</strong> 기사님이 현장 시공 및 필수 검수 구역 전/후 사진 등록을 완료했습니다. 리포트를 확인하시고 하단의 <span className="font-bold text-[#006c4a]">[청소 시공 완료 확정]</span>을 진행해 주세요.
                  </p>
                </div>
                <span className="text-[11px] text-[#43474f] shrink-0 bg-white px-2.5 py-1 rounded-md self-start sm:self-auto font-medium shadow-xs">
                  자동확정 D-3일 (72시간)
                </span>
              </div>
            </div>
          </section>

          {/* 3. Main Content Grid (8 cols / 4 cols Desktop Split) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* LEFT COLUMN: Detailed Inspection (8 cols / ~68%) */}
            <div className="lg:col-span-8 flex flex-col gap-6">

              {/* 3-1. Job & Partner Details Card */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#006c4a] text-[22px]">badge</span>
                    <h2 className="text-[17px] text-[#00254a] font-bold">시공 정보 및 담당 마스터</h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#ffddb8] text-[11px] text-[#2a1700] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
                    마스터 파트너 보증
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Partner Profile Box */}
                  <div className="p-4 rounded-xl bg-[#eff4ff] flex flex-col justify-between gap-4 border border-[#e5eeff]">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-xl bg-[#dce9ff] overflow-hidden shrink-0 relative">
                        <img
                          className="w-full h-full object-cover"
                          alt="Professional Korean male cleaner master"
                          src={contract?.profileImgUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuDgSLxToq3NzZ1FlzDukhqJWCX47EiVqVof0yQtSLqtCW6le_l9786577rPQteDpP9xieW8fndWD5dYIIqiNUA2eWlkAuf6Bzq-4kTn3pzY05OhfbJlQBhooUzwlzuulTE-FRN3fmw-FiI_TwJ-9sg9jaGNwS4Z3DoVG2cyNCcD8jM-0__Ih-KEHjMSIHzY9lPF7EI4My1eF0mzagw9zQ-UIufEFNQ0V4WPksd0MHHZB007SUXlkl16"}
                        />
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#006c4a] ring-2 ring-white"></span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[15px] font-bold text-[#00254a]">{contract?.companyNm || '반짝빌라클린'}</span>
                          <span className="material-symbols-outlined text-[#006c4a] text-[16px]">check_circle</span>
                        </div>
                        <span className="text-[12px] text-[#43474f]">
                          담당 총괄: {contract?.ceoNm || '이*수'} 마스터 (외 1인 팀)
                        </span>
                        <div className="flex items-center gap-1 mt-1 text-[11px]">
                          <span className="material-symbols-outlined text-[15px] text-[#ffb95f]">star</span>
                          <span className="font-bold text-[#0b1c30]">5.0</span>
                          <span className="text-[#737780]">(정기후기 184건)</span>
                          <span className="text-[#c3c6d0]">•</span>
                          <span className="text-[#006c4a] font-semibold">시공 누적 520회+</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Contact Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-white text-[#00254a] text-[13px] font-semibold hover:bg-[#dce9ff] transition-colors shadow-xs border border-[#e5eeff]"
                        href={`tel:${contract?.safeTelNo || '0507-1234-5678'}`}
                      >
                        <span className="material-symbols-outlined text-[16px] text-[#006c4a]">call</span>
                        0507 안심통화
                      </a>
                      <button
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-[#00254a] text-white text-[13px] font-semibold hover:bg-[#163b66] transition-colors shadow-xs"
                        type="button"
                        onClick={() => {
                          if (onNavigate) {
                            onNavigate('user-qot-02', { ptnrNo: contract?.ptnrNo || 'P20260900001', contractNo });
                          } else {
                            window.location.hash = `#chat?contractNo=${contractNo}`;
                          }
                        }}
                      >
                        <span className="material-symbols-outlined text-[16px]">chat</span>
                        1:1 현장 채팅
                      </button>
                    </div>
                  </div>

                  {/* Service Location & Schedule Box */}
                  <div className="p-4 rounded-xl bg-[#eff4ff] flex flex-col justify-between gap-2 text-[13px] border border-[#e5eeff]">
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[18px] text-[#006c4a] shrink-0 mt-0.5">pin_drop</span>
                        <div className="flex flex-col">
                          <span className="text-[13px] text-[#00254a] font-bold">시공 현장</span>
                          <span className="text-[#0b1c30]">{contract?.addrRoad || '경기 고양시 일산동구 중앙로 빌라 단지 A동'}</span>
                          <span className="text-[#737780] text-[11px]">
                            범위: 1~4층 계단, 복도 린스 물청소, 메인 현관 유리문, 분리수거함
                          </span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 pt-1 border-t border-[#e5eeff]">
                        <span className="material-symbols-outlined text-[18px] text-[#00254a] shrink-0 mt-0.5">schedule</span>
                        <div className="flex flex-col">
                          <span className="text-[13px] text-[#00254a] font-bold">작업 소요 및 타임라인</span>
                          <span className="text-[#0b1c30]">2026.11.01(일) 09:00 ~ 10:40 (총 100분 소요)</span>
                          <span className="text-[#006c4a] font-semibold text-[11px]">약정 시간 내 정상 시공 완료</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-[#e5eeff]">
                      <span className="material-symbols-outlined text-[16px] text-[#737780]">sanitizer</span>
                      <span className="text-[#43474f] text-[11px]">친환경 중성 세정제 &amp; 독일산 카처 고압 분사기 사용</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3-2. PHOTO VERIFICATION GALLERY (Core Section) */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#006c4a] text-[24px]">fact_check</span>
                      <h2 className="text-[18px] text-[#00254a] font-bold">현장 전/후 시공 비교 사진</h2>
                      <span className="px-2 py-0.5 rounded bg-[#82f5c1] text-[#002114] text-[11px] font-bold">
                        필수 검수 {photos.length > 0 ? `${Math.ceil(photos.length / 2)}개 구역` : '2개 구역'}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#43474f] mt-1">
                      시공 파트너가 직접 촬영하여 등록한 메타데이터 검증 사진입니다. 각 이미지를 클릭하여 원본 해상도로 확대할 수 있습니다.
                    </p>
                  </div>
                  <span className="text-[12px] text-[#737780] flex items-center gap-1 self-start md:self-auto">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    위변조 방지 워터마크 적용
                  </span>
                </div>

                {/* Photo Gallery Grid or Placeholder */}
                {photos.length === 0 ? (
                  <div className="p-8 rounded-xl bg-[#eff4ff] border-2 border-dashed border-[#dce9ff] flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#dce9ff] flex items-center justify-center text-[#00254a]">
                      <span className="material-symbols-outlined text-[28px]">photo_camera</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[15px] font-bold text-[#00254a]">시공 사진 등록 대기 중입니다</span>
                      <span className="text-[12px] text-[#737780] mt-0.5">
                        파트너 마스터가 작업을 마치고 시공 전/후 사진을 등록하면 자동으로 표시됩니다.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {/* PHOTO CARD 1: 계단 바닥 시공 전/후 */}
                    <div className="flex flex-col gap-2.5 bg-[#eff4ff] p-4 rounded-xl border border-[#e5eeff]">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-[#00254a] text-white text-[12px] font-bold flex items-center justify-center">01</span>
                          <span className="text-[15px] font-bold text-[#00254a]">
                            {photos[0]?.title ? photos[0].title.replace(/ \(시공 .*\)/, '') : '구역 1: 1~4층 계단 및 복도 대리석 바닥'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#43474f] bg-[#e5eeff] px-2 py-0.5 rounded font-mono">
                          촬영 시각: 11.01 09:12 / 10:28
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Before */}
                        <div
                          className="flex flex-col gap-1 group cursor-pointer"
                          onClick={() => setLightboxImage({
                            url: photos[0]?.photoUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuBk4OepuStdpg7U-s9jQvjhinkRruNvaIFsUH-pu_mzyElrqMp2RMLkh7aV0QJamb6H_FfDlgd_-vsTRnfZJXSSkhy-oiIEre2EVefEIwZVK6AalGYWhxIpZjw1EIKlqTDhRktlMpVnzGCpMUtWQC1Gpn1jtpBQ4pBeH1yJ5B7WmC1TLTWrq2SMheKe3XA8ZVqTDkHC7NfaEoa3NISG41q6ljFp3OUmbDPApCe11FP74t7ZExaYuv9l",
                            title: "구역 1: 계단 및 복도 대리석 바닥",
                            type: "시공 전 (BEFORE)"
                          })}
                        >
                          <div className="relative w-full h-64 rounded-xl overflow-hidden bg-[#e5eeff] shadow-inner">
                            <img
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              alt="Staircase before cleaning"
                              src={photos[0]?.photoUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuBk4OepuStdpg7U-s9jQvjhinkRruNvaIFsUH-pu_mzyElrqMp2RMLkh7aV0QJamb6H_FfDlgd_-vsTRnfZJXSSkhy-oiIEre2EVefEIwZVK6AalGYWhxIpZjw1EIKlqTDhRktlMpVnzGCpMUtWQC1Gpn1jtpBQ4pBeH1yJ5B7WmC1TLTWrq2SMheKe3XA8ZVqTDkHC7NfaEoa3NISG41q6ljFp3OUmbDPApCe11FP74t7ZExaYuv9l"}
                            />
                            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#ba1a1a] text-white text-[11px] font-bold shadow-md">
                              시공 전 (BEFORE)
                            </div>
                            <div className="absolute bottom-3 left-3 right-3 p-2 rounded-lg bg-[#213145]/85 backdrop-blur-sm text-white text-[12px] flex items-center justify-between">
                              <span>먼지, 흙먼지 및 유분 오염 축적</span>
                              <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                            </div>
                          </div>
                        </div>

                        {/* After */}
                        <div
                          className="flex flex-col gap-1 group cursor-pointer"
                          onClick={() => setLightboxImage({
                            url: photos[1]?.photoUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuDYB4fwKE2GsTke2OA9p_9nF2zGiqb_AFuk-Ua7GGWmU94iidaDfychExwxDxI7UUiliZaCuV3sNCX1hoR-7ooltr0wLL9rb3FI48f39dZz5TzUVhhGLT4ms9rfSZF7jsJEpzsDwmvH2GkYhfRd2BQ9gr159816gjEn9_mJ-yG0RE0pDPIJ__m21w81qnHJlycK8ElPdgXtvTDoGUputkmfHuNekfHiT9kjcwzjthFYCoWDpnCa8qJn",
                            title: "구역 1: 계단 및 복도 대리석 바닥",
                            type: "시공 후 (AFTER)"
                          })}
                        >
                          <div className="relative w-full h-64 rounded-xl overflow-hidden bg-[#e5eeff] shadow-inner">
                            <img
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              alt="Staircase after professional clean"
                              src={photos[1]?.photoUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuDYB4fwKE2GsTke2OA9p_9nF2zGiqb_AFuk-Ua7GGWmU94iidaDfychExwxDxI7UUiliZaCuV3sNCX1hoR-7ooltr0wLL9rb3FI48f39dZz5TzUVhhGLT4ms9rfSZF7jsJEpzsDwmvH2GkYhfRd2BQ9gr159816gjEn9_mJ-yG0RE0pDPIJ__m21w81qnHJlycK8ElPdgXtvTDoGUputkmfHuNekfHiT9kjcwzjthFYCoWDpnCa8qJn"}
                            />
                            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#006c4a] text-white text-[11px] font-bold shadow-md flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">check</span>
                              시공 후 (AFTER)
                            </div>
                            <div className="absolute bottom-3 left-3 right-3 p-2 rounded-lg bg-[#213145]/85 backdrop-blur-sm text-white text-[12px] flex items-center justify-between">
                              <span>고압 세척 &amp; 중성 린스 코팅 완료</span>
                              <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* PHOTO CARD 2: 현관 유리문 및 출입문 세척 전/후 */}
                    <div className="flex flex-col gap-2.5 bg-[#eff4ff] p-4 rounded-xl border border-[#e5eeff]">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-[#00254a] text-white text-[12px] font-bold flex items-center justify-center">02</span>
                          <span className="text-[15px] font-bold text-[#00254a]">
                            {photos[2]?.title ? photos[2].title.replace(/ \(시공 .*\)/, '') : '구역 2: 1층 메인 공동현관 자동 유리문 및 도어 힌지'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#43474f] bg-[#e5eeff] px-2 py-0.5 rounded font-mono">
                          촬영 시각: 11.01 09:20 / 10:35
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Before */}
                        <div
                          className="flex flex-col gap-1 group cursor-pointer"
                          onClick={() => setLightboxImage({
                            url: photos[2]?.photoUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuB1x3DDfPU4OogTI4uw15zPJaebDDoR8YXDzJMIwaeZ4nmng9Avc3pBpPPx4w5JmVd1SdwOm6Pk-MrVeBjJi2EfMLDJEVM6p7m65MdeDKpl-64amzEaRPTVyAHG9RdSsHFmm_J7lnppT7jXaDpBFdxtphD_2wPFBNr59CF0-gSmhR3qSgmLS_1pucs5XOBgBa5Kb4d0hrgJwI_Yz3hs0tbuXIloIG4gVyr-KWRC3k-j9mrZbfilT2UR",
                            title: "구역 2: 1층 메인 공동현관 유리문",
                            type: "시공 전 (BEFORE)"
                          })}
                        >
                          <div className="relative w-full h-64 rounded-xl overflow-hidden bg-[#e5eeff] shadow-inner">
                            <img
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              alt="Glass door before cleaning"
                              src={photos[2]?.photoUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuB1x3DDfPU4OogTI4uw15zPJaebDDoR8YXDzJMIwaeZ4nmng9Avc3pBpPPx4w5JmVd1SdwOm6Pk-MrVeBjJi2EfMLDJEVM6p7m65MdeDKpl-64amzEaRPTVyAHG9RdSsHFmm_J7lnppT7jXaDpBFdxtphD_2wPFBNr59CF0-gSmhR3qSgmLS_1pucs5XOBgBa5Kb4d0hrgJwI_Yz3hs0tbuXIloIG4gVyr-KWRC3k-j9mrZbfilT2UR"}
                            />
                            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#ba1a1a] text-white text-[11px] font-bold shadow-md">
                              시공 전 (BEFORE)
                            </div>
                            <div className="absolute bottom-3 left-3 right-3 p-2 rounded-lg bg-[#213145]/85 backdrop-blur-sm text-white text-[12px] flex items-center justify-between">
                              <span>테이프 끈끈이 및 지문 얼룩 잔여</span>
                              <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                            </div>
                          </div>
                        </div>

                        {/* After */}
                        <div
                          className="flex flex-col gap-1 group cursor-pointer"
                          onClick={() => setLightboxImage({
                            url: photos[3]?.photoUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuBI2DvnKGfUvoVxkZZBHF5iKwsOOpkjbt6PzNlW3g9uGPA7Ypy3tk6xHBR-zVu4RIPqej0JJ12yjUY2U0e7Mic6JrvDn17Wr6QvOoOY5cL5zJW1cOwPkEHC1okLMJ8H8kV-7d8u1XVHIyiUPJqe4U7cpfWfR-eUpwMdUA4aSG5udR3vHY--F28UJcKwuFSAp93gNfcHXdNrBknL0IWjXw_OE9ZjOst84-HpAECDF4k3xbYGE2Wvqz5t",
                            title: "구역 2: 1층 메인 공동현관 유리문",
                            type: "시공 후 (AFTER)"
                          })}
                        >
                          <div className="relative w-full h-64 rounded-xl overflow-hidden bg-[#e5eeff] shadow-inner">
                            <img
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              alt="Sparkling spotless entrance glass door"
                              src={photos[3]?.photoUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuBI2DvnKGfUvoVxkZZBHF5iKwsOOpkjbt6PzNlW3g9uGPA7Ypy3tk6xHBR-zVu4RIPqej0JJ12yjUY2U0e7Mic6JrvDn17Wr6QvOoOY5cL5zJW1cOwPkEHC1okLMJ8H8kV-7d8u1XVHIyiUPJqe4U7cpfWfR-eUpwMdUA4aSG5udR3vHY--F28UJcKwuFSAp93gNfcHXdNrBknL0IWjXw_OE9ZjOst84-HpAECDF4k3xbYGE2Wvqz5t"}
                            />
                            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-[#006c4a] text-white text-[11px] font-bold shadow-md flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">check</span>
                              시공 후 (AFTER)
                            </div>
                            <div className="absolute bottom-3 left-3 right-3 p-2 rounded-lg bg-[#213145]/85 backdrop-blur-sm text-white text-[12px] flex items-center justify-between">
                              <span>유리 발수 코팅 &amp; 힌지 틈새 먼지 소독</span>
                              <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Partner Memo Box & Quality Checklist */}
                <div className="p-4 rounded-xl bg-[#e5eeff]/80 border border-[#dce9ff] flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#00254a] text-white flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">record_voice_over</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-[#00254a]">
                          {contract?.ceoNm || '이*수'} 마스터의 현장 종합 브리핑
                        </span>
                        <span className="text-[11px] text-[#737780]">10:40 작성</span>
                      </div>
                      <p className="text-[14px] text-[#0b1c30] leading-relaxed">
                        &quot;{workLog?.workerMemo || '안녕하세요 고객님! 요청주신 1~4층 계단 및 복도 린스 물청소와 1층 유리문 손잡이 유분 제거를 중점적으로 처리했습니다. 추가로 1층 분리수거장 정리 및 우편함 살균 소독까지 서비스로 꼼꼼하게 마쳤습니다. 대리석 바닥 물기가 완전히 마를 때까지 약 15분간 미끄럼에 유의해 주세요.'}&quot;
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#dce9ff] text-[12px]">
                    <div className="flex items-center gap-1.5 text-[#006c4a] font-bold">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>계단 난간 손잡이 알코올 소독</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#006c4a] font-bold">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>창틀 먼지 청소기 흡입 완료</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#006c4a] font-bold">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>1층 현관 방풍 매트 세척 털기</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 3-3. SsulDak Quality Assurance & Re-cleaning Policy */}
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006c4a] text-[22px]">verified_user</span>
                  <h3 className="text-[17px] text-[#00254a] font-bold">쓸고닦고 안심 케어 보증 (Quality Guarantee)</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-[#eff4ff] flex items-start gap-3 border border-[#e5eeff]">
                    <div className="w-10 h-10 rounded-lg bg-[#006c4a] text-white flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">published_with_changes</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] text-[#00254a] font-bold">100% 무상 AS 재시공 보증</span>
                      <p className="text-[12px] text-[#43474f] mt-0.5 leading-relaxed">
                        시공 후 7일 이내 클리닝 미흡 구역이 발견될 경우, 담당 마스터가 무상 재방문하여 추가 케어를 진행합니다.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#eff4ff] flex items-start gap-3 border border-[#e5eeff]">
                    <div className="w-10 h-10 rounded-lg bg-[#00254a] text-white flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">policy</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] text-[#00254a] font-bold">현대해상 10억원 배상책임</span>
                      <p className="text-[12px] text-[#43474f] mt-0.5 leading-relaxed">
                        시공 중 발생할 수 있는 시설물 파손 및 대인·대물 사고에 대해 전액 보장하는 전문 영업배상책임보험에 가입되어 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

            </div>

            {/* RIGHT COLUMN: Sticky Action & Inspection Summary Sidebar (4 cols / ~32%) */}
            <aside className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-24">

              {/* 1. Final Inspection Action Primary Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[17px] font-bold text-[#00254a]">최종 검수 및 시공 완료</span>
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    workLog?.workStatCd === 'VERIFIED'
                      ? 'bg-[#82f5c1] text-[#002114]'
                      : 'bg-[#ffddb8] text-[#2a1700]'
                  }`}>
                    {workLog?.workStatCd === 'VERIFIED' ? '확정 완료' : '확정 대기'}
                  </span>
                </div>

                <p className="text-[13px] text-[#43474f] leading-relaxed">
                  업로드된 검수 사진에 이상이 없다면 완료를 확정해 주세요. 고객 확정 시 파트너에게 안전 결제(에스크로) 대금이 정산되며 감사의 리뷰를 작성하실 수 있습니다.
                </p>

                {/* Primary CTA Buttons */}
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 transition-all shadow-md ${
                      isCompleteDisabled
                        ? 'bg-[#c3c6d0] text-white cursor-not-allowed'
                        : 'bg-[#00254a] hover:bg-[#163b66] text-white active:scale-98 cursor-pointer'
                    }`}
                    type="button"
                    disabled={isCompleteDisabled}
                    onClick={() => setShowConfirmModal(true)}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {workLog?.workStatCd === 'VERIFIED' ? 'check_circle' : 'task_alt'}
                    </span>
                    {workLog?.workStatCd === 'VERIFIED' ? '시공 완료 확정됨' : '청소 시공 완료 확정하기'}
                  </button>

                  {/* Secondary Action: Issue / Re-cleaning request */}
                  <button
                    className="w-full py-2.5 px-4 rounded-xl bg-[#eff4ff] hover:bg-[#ffdad6] text-[#ba1a1a] text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-[#dce9ff]"
                    type="button"
                    onClick={() => setShowReCleanModal(true)}
                  >
                    <span className="material-symbols-outlined text-[18px]">report_problem</span>
                    미흡 구역 재시공 / 보수 요청
                  </button>
                </div>

                <div className="p-2.5 rounded-lg bg-[#eff4ff] flex items-center gap-2 text-[11px] text-[#737780] border border-[#e5eeff]">
                  <span className="material-symbols-outlined text-[16px] text-[#006c4a]">info</span>
                  <span>별도 이의제기가 없을 경우 72시간 후 자동 승인됩니다.</span>
                </div>
              </div>

              {/* 2. Payment & Settlement Summary Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] flex flex-col gap-3">
                <span className="text-[17px] font-bold text-[#00254a]">결제 및 정산 내역</span>
                <div className="flex flex-col gap-2 pt-1 text-[13px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#43474f]">정기 서비스 회차</span>
                    <span className="font-bold text-[#0b1c30]">총 3회 중 1회차</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#43474f]">플랫폼 중개 매칭 이용료</span>
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded bg-[#e5eeff] text-[#006c4a] text-[11px] font-bold">
                        결제완료
                      </span>
                      <span className="font-bold text-[#00254a] font-mono">
                        {(contract?.actualPaidAmt || 26000).toLocaleString()}원
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#e5eeff]">
                    <span className="text-[#43474f]">현장 직불 청소 시공비</span>
                    <span className="text-[18px] font-bold text-[#00254a] font-mono">
                      {(contract?.totalPayAmt || 240000).toLocaleString()}원
                    </span>
                  </div>
                </div>

                <div className="mt-1 pt-2 border-t border-[#e5eeff] flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      checked={isDirectPaidConfirmed}
                      onChange={(e) => setIsDirectPaidConfirmed(e.target.checked)}
                      className="w-4 h-4 rounded text-[#006c4a] focus:ring-[#006c4a] cursor-pointer"
                      type="checkbox"
                    />
                    <span className="text-[12px] text-[#0b1c30] font-semibold">
                      현장 직불 청소비 계좌 이체 완료 확인
                    </span>
                  </label>
                  <div className="flex items-center justify-between pt-1">
                    <a
                      className="text-[12px] text-[#00254a] hover:underline flex items-center gap-0.5 cursor-pointer font-medium"
                      onClick={() => showToast('전자세금계산서 신청 페이지로 이동합니다.')}
                    >
                      <span>전자세금계산서 / 현금영수증 발행 신청</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_outward</span>
                    </a>
                  </div>
                </div>
              </div>

              {/* 3. Cancellation & Refund Penalty Warning Notice (Revised Policy Alert) */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#e5eeff] flex flex-col gap-2.5">
                <div className="flex items-center gap-2 text-[#ba1a1a]">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                  <span className="text-[13px] font-bold">예약 취소 및 위약금 규정 안내</span>
                </div>

                <div className="p-3 rounded-lg bg-[#dce9ff]/40 border border-[#dce9ff] flex flex-col gap-1.5 text-[12px] text-[#0b1c30]">
                  <p className="font-bold text-[#00254a]">개정 환불 기준 (소비자보호 규정 준수):</p>
                  <ul className="list-disc pl-4 text-[11px] text-[#43474f] leading-relaxed flex flex-col gap-1">
                    <li>
                      결제 후 7일 이내 취소 시: <strong className="text-[#00254a]">50% 환불</strong> 처리
                    </li>
                    <li>
                      결제 후 7일 경과 후 취소 시: <strong className="text-[#ba1a1a]">전액 몰수 및 7일간 서비스 이용 정지</strong>
                    </li>
                    <li>당일 기사 배차 후 일방적 취소는 재배차가 불가합니다.</li>
                  </ul>
                </div>

                <button
                  className="mt-1 text-left text-[12px] text-[#737780] hover:text-[#ba1a1a] hover:underline transition-colors flex items-center gap-1 self-start cursor-pointer"
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                >
                  <span>계약 해지 / 예약 취소 신청하기</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
              </div>

              {/* 4. Quick Dispute & Care Desk */}
              <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#e5eeff] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00254a] text-[20px]">headset_mic</span>
                  <div className="flex flex-col text-[11px]">
                    <span className="font-bold text-[#00254a]">카카오톡 긴급 분쟁 상담</span>
                    <span className="text-[#737780]">평일 09:00 ~ 18:00 실시간 연결</span>
                  </div>
                </div>
                <button
                  className="px-3 py-1.5 rounded-lg bg-white text-[#00254a] hover:bg-[#e5eeff] text-[12px] font-bold shadow-xs transition-colors border border-[#e5eeff] cursor-pointer"
                  type="button"
                  onClick={() => showToast('상담원 채팅창으로 연결 중입니다...')}
                >
                  상담원 연결
                </button>
              </div>

            </aside>
          </div>

        </div>
      </main>

      {/* ===================================================================== */}
      {/* FOOTER BAR                                                            */}
      {/* ===================================================================== */}
      <footer className="w-full bg-[#eff4ff] shadow-[0_-1px_12px_rgba(22,59,102,0.03)] border-t border-[#e5eeff] mt-auto">
        <div className="max-w-7xl mx-auto px-4 md:px-12 py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-8 border-b border-[#dce9ff]">
            {/* Company Info */}
            <div className="md:col-span-4 flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-7 h-7 rounded-lg bg-[#00254a] flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-[16px]">cleaning_services</span>
                </div>
                <span className="text-[17px] font-bold text-[#00254a]">SsulDak (주)쓸고닦고</span>
              </div>
              <div className="mt-1 flex flex-col gap-1 text-[#43474f] text-[12px] leading-relaxed">
                <p>대표이사: 김대표 | 사업자등록번호: 214-88-02451</p>
                <p>통신판매업신고: 제 2024-고양일산-0129호</p>
                <p>주소: 경기도 고양시 일산동구 중앙로 1234 쓸고닦고 테크센터 8층</p>
                <p>개인정보보호책임자: 김대표 (privacy@ssuldak.kr)</p>
              </div>
            </div>

            {/* Insurance & Escrow */}
            <div className="md:col-span-5 flex flex-col gap-2">
              <span className="text-[14px] font-bold text-[#00254a]">안심 케어 보증 &amp; 금융 보안</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-white shadow-xs flex items-start gap-2 border border-[#e5eeff]">
                  <span className="material-symbols-outlined text-[#006c4a] text-[22px]">verified_user</span>
                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#0b1c30] font-bold">10억원 책임배상보험</span>
                    <span className="text-[11px] text-[#737780]">KB손해보험 영업배상책임</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white shadow-xs flex items-start gap-2 border border-[#e5eeff]">
                  <span className="material-symbols-outlined text-[#006c4a] text-[22px]">shield_with_heart</span>
                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#0b1c30] font-bold">에스크로 안전결제</span>
                    <span className="text-[11px] text-[#737780]">서비스 검수완료 후 정산</span>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-[#737780] mt-1 leading-relaxed">
                (주)쓸고닦고는 통신판매중개자로서 거래 당사자가 아니며, 입점 파트너 마스터가 직접 시공 및 이행하는 서비스에 대한 하자는 보증보험 및 중개규정에 따라 공정하게 보호됩니다.
              </p>
            </div>

            {/* Customer Center CTA */}
            <div className="md:col-span-3 flex flex-col items-start md:items-end justify-between">
              <div className="flex flex-col items-start md:items-end">
                <span className="text-[11px] text-[#006c4a] font-bold uppercase tracking-wider">Customer Center</span>
                <a className="text-2xl font-bold text-[#00254a] hover:text-[#006c4a] transition-colors" href="tel:1588-0000">
                  1588-0000
                </a>
                <div className="text-left md:text-right text-[12px] text-[#43474f] mt-1">
                  <p>평일 08:00 ~ 20:00</p>
                  <p>주말/공휴일 09:00 ~ 18:00</p>
                </div>
              </div>
              <button
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#00254a] text-white text-[13px] font-bold hover:bg-[#163b66] transition-all shadow-sm active:scale-98 cursor-pointer"
                type="button"
                onClick={() => showToast('1:1 고객센터 상담창으로 연결합니다.')}
              >
                <span className="material-symbols-outlined text-[18px]">support_agent</span>
                1:1 실시간 케어 문의
              </button>
            </div>
          </div>

          <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-2 text-[12px]">
            <div className="flex flex-wrap items-center gap-3 text-[#43474f]">
              <a className="hover:text-[#00254a] transition-colors cursor-pointer" onClick={() => showToast('이용약관')}>이용약관</a>
              <span className="text-[#c3c6d0]">•</span>
              <a className="font-bold text-[#00254a] hover:underline cursor-pointer" onClick={() => showToast('개인정보처리방침')}>개인정보처리방침</a>
              <span className="text-[#c3c6d0]">•</span>
              <a className="hover:text-[#00254a] transition-colors cursor-pointer" onClick={() => showToast('배상책임보험안내')}>배상책임보험안내</a>
              <span className="text-[#c3c6d0]">•</span>
              <a className="hover:text-[#00254a] text-[#006c4a] font-bold cursor-pointer" onClick={() => showToast('마스터 파트너 입점신청')}>마스터 파트너 입점신청</a>
            </div>
            <p className="text-[#737780] text-[11px]">© 2026 SsulDak Corp. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* MODAL 1: LIGHTBOX ZOOM MODAL                                          */}
      {/* ===================================================================== */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative max-w-4xl w-full bg-[#0b1c30] rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col">
            {/* Header */}
            <div className="p-4 px-6 bg-[#213145] flex items-center justify-between text-white border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-[#006c4a] text-white">
                  {lightboxImage.type}
                </span>
                <span className="text-[15px] font-bold">{lightboxImage.title}</span>
              </div>
              <button
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
                type="button"
                onClick={() => setLightboxImage(null)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            {/* Image display */}
            <div className="relative w-full max-h-[70vh] overflow-auto flex items-center justify-center bg-black/40 p-2">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-lg"
              />
              <div className="absolute bottom-4 right-4 bg-black/60 px-3 py-1 rounded text-white text-[11px] font-mono">
                위변조 방지 워터마크 인증됨
              </div>
            </div>
            {/* Footer */}
            <div className="p-3 px-6 bg-[#213145] flex items-center justify-between text-white/80 text-[12px]">
              <span>마스터 파트너 현장 실시간 원본 등록 사진</span>
              <button
                className="px-4 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white font-medium transition-colors"
                onClick={() => setLightboxImage(null)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: CONFIRM COMPLETE MODAL                                       */}
      {/* ===================================================================== */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#e5eeff] flex flex-col gap-4">
            <div className="flex items-center gap-3 text-[#00254a]">
              <div className="w-10 h-10 rounded-full bg-[#dce9ff] flex items-center justify-center text-[#00254a]">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-[17px] font-bold text-[#00254a]">시공 완료 확정</h3>
                <span className="text-[12px] text-[#737780]">현장 검수 결과 최종 확인</span>
              </div>
            </div>

            <p className="text-[13px] text-[#43474f] leading-relaxed bg-[#eff4ff] p-3.5 rounded-xl border border-[#e5eeff]">
              시공 결과를 꼼꼼히 확인하셨습니까?<br />
              완료 확정 시 파트너 마스터에게 에스크로 정산이 진행되며, 솔직한 만족도를 남기실 수 있는 <strong className="text-[#00254a]">포토리뷰 작성 화면</strong>으로 이동합니다.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                className="px-4 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#43474f] text-[13px] font-bold transition-colors cursor-pointer"
                type="button"
                disabled={isConfirming}
                onClick={() => setShowConfirmModal(false)}
              >
                취소
              </button>
              <button
                className="px-5 py-2.5 rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white text-[13px] font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-98 cursor-pointer disabled:opacity-60"
                type="button"
                disabled={isConfirming}
                onClick={handleConfirmComplete}
              >
                {isConfirming ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
                    처리 중...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">task_alt</span>
                    시공 완료 확정하기
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: CANCEL RESERVATION & PENALTY MODAL                           */}
      {/* ===================================================================== */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 shadow-2xl border border-[#e5eeff] flex flex-col gap-4">
            <div className="flex items-center gap-3 text-[#ba1a1a]">
              <div className="w-10 h-10 rounded-full bg-[#ffdad6] flex items-center justify-center text-[#ba1a1a]">
                <span className="material-symbols-outlined text-[24px]">warning</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-[17px] font-bold text-[#ba1a1a]">예약 취소 및 위약금 규정 확인</h3>
                <span className="text-[12px] text-[#737780]">소비자 보호 규정 준수</span>
              </div>
            </div>

            {/* Dynamic penalty message based on 7-day rule */}
            {refundPolicy.isWithin7Days ? (
              <div className="p-4 rounded-xl bg-[#eff4ff] border border-[#dce9ff] flex flex-col gap-2">
                <span className="text-[13px] font-bold text-[#00254a]">
                  현재 결제일로부터 7일 이내(경과 {refundPolicy.elapsedHours}시간) 취소 신청입니다.
                </span>
                <p className="text-[12px] text-[#43474f] leading-relaxed">
                  • 결제하신 플랫폼 중개 데이터 이용료({(contract?.actualPaidAmt || 26000).toLocaleString()}원)의 50% 위약 공제 후
                  <strong className="text-[#006c4a] ml-1">
                    {refundPolicy.refundAmt.toLocaleString()}원이 환불
                  </strong> 처리됩니다.<br />
                  • 별도의 서비스 이용 정지 패널티는 부과되지 않습니다.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#ffdad6]/60 border border-[#ffdad6] flex flex-col gap-2">
                <span className="text-[13px] font-bold text-[#ba1a1a]">
                  ※ 주의: 결제일로부터 7일(168시간)이 경과하였습니다.
                </span>
                <p className="text-[12px] text-[#ba1a1a] leading-relaxed font-medium">
                  • 결제하신 데이터 이용료({(contract?.actualPaidAmt || 26000).toLocaleString()}원)는 <strong className="underline">전액 몰수(0원 환불)</strong> 처리됩니다.<br />
                  • 플랫폼 운영 규정에 따라 취소 즉시 <strong className="underline">7일간 계정 서비스 이용이 정지</strong>됩니다.
                </p>
              </div>
            )}

            {/* Cancel Reason Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-bold text-[#00254a]">취소 사유</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl border border-[#dce9ff] text-[13px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#00254a] resize-none"
                placeholder="취소 사유를 구체적으로 기재해 주세요."
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5eeff]">
              <button
                className="px-4 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#43474f] text-[13px] font-bold transition-colors cursor-pointer"
                type="button"
                disabled={isCancelling}
                onClick={() => setShowCancelModal(false)}
              >
                돌아가기
              </button>
              <button
                className="px-5 py-2.5 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-white text-[13px] font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-98 cursor-pointer disabled:opacity-60"
                type="button"
                disabled={isCancelling}
                onClick={handleCancelReservation}
              >
                {isCancelling ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-[16px]">progress_activity</span>
                    처리 중...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">cancel</span>
                    위약 규정 동의 및 취소 확정
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: RE-CLEAN / DISPUTE REQUEST MODAL                             */}
      {/* ===================================================================== */}
      {showReCleanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#e5eeff] flex flex-col gap-4">
            <div className="flex items-center gap-3 text-[#ba1a1a]">
              <div className="w-10 h-10 rounded-full bg-[#ffdad6] flex items-center justify-center text-[#ba1a1a]">
                <span className="material-symbols-outlined text-[24px]">report_problem</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-[17px] font-bold text-[#00254a]">미흡 구역 재시공 / 보수 요청</h3>
                <span className="text-[12px] text-[#737780]">100% 무상 AS 보증 지원</span>
              </div>
            </div>

            <p className="text-[13px] text-[#43474f] leading-relaxed bg-[#eff4ff] p-3.5 rounded-xl border border-[#e5eeff]">
              시공 결과에 미흡한 부분이 있으신가요?<br />
              쓸고닦고 안심 보증 정책에 따라 <strong className="text-[#00254a]">시공 후 7일 이내 무상 AS 재방문</strong>이 가능합니다. 1:1 파트너 현장 채팅 또는 고객센터 상담을 통해 즉시 접수하실 수 있습니다.
            </p>

            <div className="flex flex-col gap-2 pt-1">
              <button
                className="w-full py-2.5 px-4 rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white text-[13px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                type="button"
                onClick={() => {
                  setShowReCleanModal(false);
                  if (onNavigate) {
                    onNavigate('user-qot-02', { ptnrNo: contract?.ptnrNo || 'P20260900001', contractNo });
                  } else {
                    window.location.hash = `#chat?contractNo=${contractNo}`;
                  }
                }}
              >
                <span className="material-symbols-outlined text-[18px]">chat</span>
                담당 마스터에게 1:1 재시공 요청하기
              </button>
              <a
                className="w-full py-2.5 px-4 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#00254a] text-[13px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border border-[#dce9ff]"
                href="tel:1588-0000"
              >
                <span className="material-symbols-outlined text-[18px]">support_agent</span>
                고객센터 1588-0000 전화 상담
              </a>
              <button
                className="w-full py-2 text-center text-[12px] text-[#737780] hover:text-[#0b1c30] transition-colors cursor-pointer mt-1"
                type="button"
                onClick={() => setShowReCleanModal(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FLOATING TOAST                                                        */}
      {/* ===================================================================== */}
      {toastVisible && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#0b1c30]/95 text-white px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-[13px] font-semibold animate-fade-in border border-white/10">
          <span className="material-symbols-outlined text-[18px] text-[#82f5c1]">info</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
