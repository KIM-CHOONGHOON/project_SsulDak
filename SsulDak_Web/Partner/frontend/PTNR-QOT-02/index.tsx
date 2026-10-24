'use client';

import React, { useState, useEffect } from 'react';

export interface FixedTerms {
  slotNo: string;
  reqNo: string;
  subItemNm: string;
  buildingTitle: string;
  addrRoad: string;
  floorCnt: number;
  scopeText: string;
  reqMemo: string;
  fixedAmt: number;
  monthlyAmt: number;
  contractDays: number;
  formattedStartDt: string;
  firstVisitText: string;
  workCycleText: string;
  slotStatCd: string;
  expireDt: string;
  currentBidCount: number;
  maxBidCount: number;
}

export interface PartnerDefaults {
  ptnrNo: string;
  companyNm: string;
  ratingBadge: string;
  defaultWorkerCnt: number;
  defaultHours: number;
  equipTags: string[];
  equipDesc: string;
  defaultAppealMsg: string;
  alreadyBid: boolean;
}

export interface FeeSummary {
  calcFormula: string;
  dataFeeAmt: number;
  discountAmt: number;
  finalPayAmt: number;
  couponName: string;
  hasFreeCoupon: boolean;
  expectedNetRevenue: number;
}

export interface PtnrQot02Props {
  initialSlotNo?: string;
  onNavigate?: (screenId: string, params?: Record<string, string>) => void;
}

export default function PtnrQot02Screen({ initialSlotNo, onNavigate }: PtnrQot02Props) {
  // 슬롯 번호 파싱 (props 또는 window.location)
  const [slotNo, setSlotNo] = useState<string>(() => {
    if (initialSlotNo) return initialSlotNo;
    if (typeof window !== 'undefined') {
      const search = window.location.search || window.location.hash;
      const match = search.match(/slotNo=([^&]+)/);
      if (match) return decodeURIComponent(match[1]);
    }
    return 'SLOT202610230001';
  });

  // 서버 로딩 상태
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 고정 조건 & 파트너 정보
  const [fixedTerms, setFixedTerms] = useState<FixedTerms>({
    slotNo: 'SLOT202610230001',
    reqNo: 'REQ202610210001',
    subItemNm: '정기청소 3개월',
    buildingTitle: '일산동구 중앙로 빌라 4층 상가주택',
    addrRoad: '경기 고양시 일산동구 중앙로',
    floorCnt: 4,
    scopeText: '1~4층 계단실 및 복도 순회 케어, 창틀 먼지 흡입, 1층 필로티 주차장 분리수거장 2개 구역 정리 및 물청소',
    reqMemo: '1층 상가 음식점 냄새 차단을 위해 친환경 탈취 세정을 꼭 적용해주시고, 시공 전/후 사진을 매회차 2장 이상 앱에 등록해주세요.',
    fixedAmt: 240000,
    monthlyAmt: 80000,
    contractDays: 92,
    formattedStartDt: '2026-11-01 09:00',
    firstVisitText: '2026년 11월 01일(일) 첫 방문',
    workCycleText: '매주 수요일 오전 10:00 이전 (총 12회차 케어)',
    slotStatCd: 'WAITING',
    expireDt: '2026-10-25 13:05',
    currentBidCount: 2,
    maxBidCount: 3
  });

  const [partnerDefaults, setPartnerDefaults] = useState<PartnerDefaults>({
    ptnrNo: 'P20261000001',
    companyNm: '반짝빌라클린',
    ratingBadge: '마스터 A+ 등급',
    defaultWorkerCnt: 2,
    defaultHours: 2.0,
    equipTags: [
      '독일산 크란즐 고압스팀기 (150bar)',
      '산업용 헤파필터 집진기',
      '친환경 에코라벨 중성 인증 세제',
      '피톤치드 연무 소독기'
    ],
    equipDesc: '독일산 크란즐 고압스팀기 (150bar), 산업용 헤파필터 집진기, 친환경 에코라벨 중성 인증 세제, 피톤치드 연무 소독기',
    defaultAppealMsg: '1층 현관 도어락 소독과 분리수거장 주변 고압 세척까지 성실히 작업하겠습니다. 매회차 시공 전/후 고화질 비교 사진을 즉시 전송해드리며, 친환경 인증 약품만 사용하여 건물 입주민 건강을 최우선으로 관리하겠습니다.',
    alreadyBid: false
  });

  const [feeSummary, setFeeSummary] = useState<FeeSummary>({
    calcFormula: 'max(대금×3.3%, 33,000원)',
    dataFeeAmt: 33000,
    discountAmt: 33000,
    finalPayAmt: 0,
    couponName: '웰컴 프로모션 패스',
    hasFreeCoupon: true,
    expectedNetRevenue: 240000
  });

  // 파트너 입력 Form State
  const [workerCnt, setWorkerCnt] = useState<number>(2);
  const [estDurationHours, setEstDurationHours] = useState<number>(2.0);
  const [selectedEquips, setSelectedEquips] = useState<string[]>([
    '독일산 크란즐 고압스팀기 (150bar)',
    '산업용 헤파필터 집진기',
    '친환경 에코라벨 중성 인증 세제',
    '피톤치드 연무 소독기'
  ]);
  const [appealMsg, setAppealMsg] = useState<string>(
    '1층 현관 도어락 소독과 분리수거장 주변 고압 세척까지 성실히 작업하겠습니다. 매회차 시공 전/후 고화질 비교 사진을 즉시 전송해드리며, 친환경 인증 약품만 사용하여 건물 입주민 건강을 최우선으로 관리하겠습니다.'
  );

  // 필수 약관 동의 체크박스 3종
  const [agreedTerms, setAgreedTerms] = useState<boolean>(true);
  const [agreedInsurance, setAgreedInsurance] = useState<boolean>(true);
  const [agreedPhotoReport, setAgreedPhotoReport] = useState<boolean>(true);

  // 제출 및 모달 상태
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitSuccessModal, setSubmitSuccessModal] = useState<{
    show: boolean;
    bidNo: string;
  }>({ show: false, bidNo: '' });

  // 토스트 메시지
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  // 1. 초기 데이터 로드 (POST /api/partner/ptnr_qot_02 - GET_FIXED_TERMS)
  useEffect(() => {
    let isMounted = true;
    async function loadFixedTerms() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch('/api/partner/ptnr_qot_02', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'GET_FIXED_TERMS',
            ptnrNo: 'P20261000001',
            slotNo
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.message || `서버 응답 오류 (HTTP ${res.status})`);
        }

        const data = await res.json();
        if (data.success && isMounted) {
          if (data.fixedTerms) setFixedTerms(data.fixedTerms);
          if (data.partnerDefaults) {
            setPartnerDefaults(data.partnerDefaults);
            setWorkerCnt(data.partnerDefaults.defaultWorkerCnt || 2);
            setEstDurationHours(data.partnerDefaults.defaultHours || 2.0);
            if (data.partnerDefaults.equipTags && data.partnerDefaults.equipTags.length > 0) {
              setSelectedEquips(data.partnerDefaults.equipTags);
            }
            if (data.partnerDefaults.defaultAppealMsg) {
              setAppealMsg(data.partnerDefaults.defaultAppealMsg);
            }
          }
          if (data.feeSummary) setFeeSummary(data.feeSummary);
        }
      } catch (err: any) {
        console.warn('[PTNR-QOT-02] API fetch fallback to mock:', err.message);
        // Fallback default state maintained
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFixedTerms();
    return () => {
      isMounted = false;
    };
  }, [slotNo]);

  // 투입 인원 스텝퍼 핸들러
  const handleCrewMinus = () => {
    if (workerCnt > 1) {
      setWorkerCnt((prev) => prev - 1);
    }
  };

  const handleCrewPlus = () => {
    if (workerCnt < 10) {
      setWorkerCnt((prev) => prev + 1);
    }
  };

  // 장비 토글 핸들러
  const handleToggleEquip = (equipName: string) => {
    setSelectedEquips((prev) =>
      prev.includes(equipName) ? prev.filter((item) => item !== equipName) : [...prev, equipName]
    );
  };

  // 전체 필수 약관 일괄 체크 여부
  const allTermsAgreed = agreedTerms && agreedInsurance && agreedPhotoReport;

  // 제출 버튼 활성화 조건
  const isSubmitValid =
    allTermsAgreed &&
    appealMsg.trim().length >= 10 &&
    workerCnt >= 1 &&
    estDurationHours >= 0.5 &&
    !partnerDefaults.alreadyBid &&
    !submitting;

  // 임시저장 핸들러
  const handleSaveDraft = () => {
    try {
      const draftData = {
        slotNo,
        workerCnt,
        estDurationHours,
        selectedEquips,
        appealMsg,
        savedAt: new Date().toISOString()
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(`SSULDAK_BID_DRAFT_${slotNo}`, JSON.stringify(draftData));
      }
      showToast('입력하신 시공 계획이 안전하게 임시저장되었습니다.');
    } catch {
      showToast('임시저장에 실패했습니다.');
    }
  };

  // 청약서 최종 제출 핸들러 (SUBMIT_BID)
  const handleSubmitBid = async () => {
    if (!allTermsAgreed) {
      alert('고객 제시 조건 수락 및 취소 패널티 관련 필수 규정에 모두 동의해 주세요.');
      return;
    }

    if (appealMsg.trim().length < 10) {
      alert('작업 계획 및 고객 어필 메시지를 최소 10자 이상 작성해 주세요.');
      return;
    }

    if (partnerDefaults.alreadyBid) {
      alert('이미 청약서를 제출한 공고입니다.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/partner/ptnr_qot_02', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'SUBMIT_BID',
          ptnrNo: partnerDefaults.ptnrNo,
          slotNo: fixedTerms.slotNo,
          workerCnt,
          estDurationHours,
          appealMsg: appealMsg.trim(),
          equipDesc: selectedEquips.join(', '),
          termsAgreed: allTermsAgreed
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `청약서 제출 실패 (HTTP ${res.status})`);
      }

      // 제출 성공 모달 노출
      setSubmitSuccessModal({
        show: true,
        bidNo: data.bidNo || 'BID2026102300003'
      });

      // 이미 제출 상태 플래그 갱신
      setPartnerDefaults((prev) => ({ ...prev, alreadyBid: true }));
    } catch (err: any) {
      console.error('[PTNR-QOT-02] Submission error:', err);
      alert(`청약서 제출 중 오류가 발생했습니다.\n${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // 목록 또는 상세 화면으로 네비게이션
  const handleGoBack = () => {
    if (onNavigate) {
      onNavigate('PTNR-QOT-01', { slotNo: fixedTerms.slotNo });
    } else if (typeof window !== 'undefined') {
      window.location.hash = `#ptnr-qot-01?slotNo=${fixedTerms.slotNo}`;
    }
  };

  const handleGoOrderList = () => {
    setSubmitSuccessModal({ show: false, bidNo: '' });
    if (onNavigate) {
      onNavigate('PTNR-QOT-00');
    } else if (typeof window !== 'undefined') {
      window.location.hash = '#partner-orders';
    }
  };

  return (
    <div className="bg-background font-body-md text-on-surface min-h-screen flex flex-col antialiased">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-2 backdrop-blur-md animate-fade-in font-label-md text-label-md">
          <span className="material-symbols-outlined text-[20px] text-secondary">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* FIXED GNB HEADER */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.04)]">
        <div className="h-16 max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate ? onNavigate('PTNR-DSH-00') : (window.location.hash = '#ptnr-dsh-00')}>
              <span className="font-display text-headline-md tracking-tight text-primary font-bold">SsulDak</span>
              <span className="bg-primary-container text-on-primary font-label-sm text-label-sm px-2 py-0.5 rounded-lg tracking-wider font-bold">
                PARTNER CONSOLE
              </span>
            </div>
            <div className="hidden xl:flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-xl">
              <span className="font-label-md text-label-md text-on-surface font-semibold">
                {partnerDefaults.companyNm}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-secondary-container px-2 py-0.5 rounded-full font-label-sm text-label-sm text-on-secondary-container font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                영업 중 (ON)
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1.5 bg-surface-container-low p-1 rounded-xl">
            <button
              onClick={() => onNavigate ? onNavigate('PTNR-DSH-00') : (window.location.hash = '#ptnr-dsh-00')}
              className="px-3.5 py-1.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
              type="button"
            >
              홈
            </button>
            <button
              onClick={() => onNavigate ? onNavigate('PTNR-QOT-00') : (window.location.hash = '#partner-orders')}
              className="px-3.5 py-1.5 rounded-lg transition-all bg-primary-container text-on-primary font-bold shadow-sm"
              type="button"
            >
              공고목록/오더수신
            </button>
            <button
              onClick={() => onNavigate ? onNavigate('PTNR-DSH-01') : (window.location.hash = '#ptnr-dsh-01')}
              className="px-3.5 py-1.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
              type="button"
            >
              작업관리/시공보고
            </button>
            <button
              onClick={() => onNavigate ? onNavigate('PTNR-DSH-02') : (window.location.hash = '#ptnr-dsh-02')}
              className="px-3.5 py-1.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
              type="button"
            >
              정산/혜택관리
            </button>
            <button
              onClick={() => onNavigate ? onNavigate('PTNR-DSH-02') : (window.location.hash = '#ptnr-dsh-02')}
              className="px-3.5 py-1.5 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
              type="button"
            >
              프로필/지역설정
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              aria-label="Notifications"
              className="relative p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-error text-on-error font-label-sm text-[10px] leading-none rounded-full flex items-center justify-center px-1 font-bold">
                4
              </span>
            </button>
            <div className="flex items-center gap-2.5 pl-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="font-label-md text-label-md text-on-surface font-semibold">이수대표</span>
                <span className="font-label-sm text-[10px] text-on-tertiary-container font-bold">마스터 파트너</span>
              </div>
            </div>
            <button
              aria-label="Logout"
              className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-container hover:text-error transition-all"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>

        {/* Breadcrumb strip */}
        <div className="bg-surface-container-low/70 py-2 border-t border-surface-container/40">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 flex items-center justify-between text-body-sm">
            <div className="flex items-center gap-2 text-on-surface-variant overflow-x-auto whitespace-nowrap">
              <span className="font-medium cursor-pointer hover:underline" onClick={() => onNavigate ? onNavigate('PTNR-DSH-00') : (window.location.hash = '#ptnr-dsh-00')}>홈</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span>대시보드 (PTNR-DSH-00)</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span>오더 수신 센터</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="cursor-pointer hover:underline" onClick={() => onNavigate ? onNavigate('PTNR-QOT-00') : (window.location.hash = '#partner-orders')}>매칭 청약 공고 목록 (PTNR-QOT-00)</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="cursor-pointer hover:underline" onClick={handleGoBack}>공고 상세 정보 (PTNR-QOT-01)</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="font-semibold text-primary">청약서 작성 및 제안 (PTNR-QOT-02)</span>
            </div>
            <div className="hidden md:flex items-center gap-2 shrink-0">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span className="font-label-sm text-label-sm text-on-surface font-bold">실시간 수신 풀 정상 가동 중</span>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="w-full pt-28 bg-background flex-1 max-w-7xl mx-auto px-6 lg:px-12 pb-16">
        <div className="flex flex-col w-full">
          {/* Top Navigation & Context Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-surface-container-high/60">
            <div className="flex items-center gap-3">
              <button
                onClick={handleGoBack}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-container-lowest text-primary hover:bg-surface-container transition-all shadow-sm font-label-md text-label-md group"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">
                  arrow_back
                </span>
                <span>공고 상세 보기로 돌아가기 (PTNR-QOT-01)</span>
              </button>
              <span className="hidden sm:inline-block w-px h-4 bg-outline-variant/40"></span>
              <span className="inline-flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm bg-surface-container px-2.5 py-1 rounded-lg">
                <span className="material-symbols-outlined text-[16px] text-primary">description</span>
                청약 접수 코드: SSDK-TNDR-202611-0428
              </span>
            </div>

            {/* Live Tender Status Chip */}
            <div className="inline-flex items-center gap-2.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent px-3.5 py-1.5 rounded-xl border border-amber-300/40">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600"></span>
              </span>
              <span className="font-label-md text-label-md font-bold text-amber-900">
                선착순 입찰 마감 임박 (잔여 1개사)
              </span>
              <span className="text-amber-800/60 font-body-sm text-body-sm">|</span>
              <span className="font-label-sm text-label-sm text-amber-800 font-semibold">
                현재 경쟁 {fixedTerms.currentBidCount} : 1
              </span>
            </div>
          </div>

          {/* Header Section */}
          <div className="pt-6 pb-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-primary/10 text-primary font-label-sm text-label-sm font-bold px-2.5 py-0.5 rounded-md">
                    PTNR-QOT-02
                  </span>
                  <span className="text-on-surface-variant font-label-sm text-label-sm">배차 매칭 최종 검토</span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight font-extrabold">
                  청약서 작성 및 조건 수락 제출
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant mt-1.5">
                  고객이 확정한 견적 조건 및 작업 스케줄을 검토 후 파트너사의 시공 투입 계획을 작성하여 최종 청약서를 제출합니다.
                </p>
              </div>

              <div className="flex items-center gap-3 self-start lg:self-auto bg-surface-container-low px-4 py-2.5 rounded-xl">
                <span className="material-symbols-outlined text-secondary text-[22px]">verified</span>
                <div className="text-left">
                  <p className="font-label-sm text-label-sm text-on-surface-variant">파트너사 인증 상태</p>
                  <p className="font-label-md text-label-md text-on-surface font-bold">
                    {partnerDefaults.companyNm} ({partnerDefaults.ratingBadge})
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main 2-Column Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT COLUMN: Form & Specifications (8 of 12 cols ~66%) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              {/* CARD 1: Locked Fixed Terms from Customer */}
              <section className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden relative">
                {/* Top accent banner */}
                <div className="bg-gradient-to-r from-surface-container to-surface-container-low px-6 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">lock</span>
                    <span className="font-label-md text-label-md font-bold text-primary">
                      고객 확정 조건 (금액 및 주요 일정 수정 원천 차단)
                    </span>
                  </div>
                  <span className="bg-primary-container/10 text-primary-container font-label-sm text-label-sm font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-container"></span>
                    스마트 계약 잠금
                  </span>
                </div>

                <div className="p-6 md:p-8 flex flex-col gap-6">
                  {/* Order Metadata Ribbon */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-surface-container">
                    <div className="flex items-center gap-2">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">공고 번호</span>
                      <span className="font-mono text-body-sm font-bold text-on-surface bg-surface-container-low px-2 py-0.5 rounded">
                        {fixedTerms.reqNo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-secondary/10 text-secondary font-label-sm text-label-sm font-bold px-2.5 py-0.5 rounded-md">
                        {fixedTerms.subItemNm}
                      </span>
                      <span className="font-label-md text-label-md font-bold text-on-surface">
                        {fixedTerms.buildingTitle}
                      </span>
                    </div>
                  </div>

                  {/* Fixed Pricing & Timing Duo Tile */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Price Box */}
                    <div className="bg-surface-container-low/70 p-5 rounded-xl flex flex-col justify-between relative overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                          고객 확정 용역 대금
                        </span>
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm bg-surface-container text-outline px-2 py-0.5 rounded-md">
                          <span className="material-symbols-outlined text-[13px]">lock</span> 수정 불가 (확정 제시가)
                        </span>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-baseline gap-2">
                          <span className="font-display text-display text-primary tracking-tight font-extrabold">
                            {fixedTerms.fixedAmt.toLocaleString()}
                          </span>
                          <span className="font-headline-md text-headline-md text-primary font-bold">원</span>
                          <span className="text-body-sm text-on-surface-variant font-normal">(VAT 포함)</span>
                        </div>
                        <p className="font-label-sm text-label-sm text-secondary font-semibold mt-1">
                          월 {fixedTerms.monthlyAmt.toLocaleString()}원 상당 × 3개월 약정 (회당 약 {(fixedTerms.fixedAmt / 12).toLocaleString()}원 상당)
                        </p>
                      </div>
                    </div>

                    {/* Schedule Box */}
                    <div className="bg-surface-container-low/70 p-5 rounded-xl flex flex-col justify-between relative">
                      <div className="flex items-center justify-between">
                        <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                          확정 작업 일정
                        </span>
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm bg-secondary-container/60 text-on-secondary-container px-2 py-0.5 rounded-md font-bold">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span> 일정 100% 수용 확정
                        </span>
                      </div>
                      <div className="mt-4">
                        <p className="font-headline-sm text-headline-sm font-bold text-on-surface">
                          {fixedTerms.firstVisitText}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-on-surface-variant font-body-sm text-body-sm">
                          <span className="material-symbols-outlined text-[16px] text-primary">event_repeat</span>
                          <span>{fixedTerms.workCycleText}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scope and Special Requirements Details */}
                  <div className="flex flex-col gap-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 bg-surface-container/40 p-4 rounded-xl">
                      <div className="flex items-center gap-1.5 sm:w-28 shrink-0 text-on-surface font-label-md text-label-md font-bold">
                        <span className="material-symbols-outlined text-[18px] text-primary">domain</span>
                        시공 범위
                      </div>
                      <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                        {fixedTerms.scopeText}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-start gap-2 bg-surface-container/40 p-4 rounded-xl">
                      <div className="flex items-center gap-1.5 sm:w-28 shrink-0 text-on-surface font-label-md text-label-md font-bold">
                        <span className="material-symbols-outlined text-[18px] text-amber-700">warning_amber</span>
                        고객 특이 요청
                      </div>
                      <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                        &quot;{fixedTerms.reqMemo}&quot;
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* CARD 2: Operational Proposal Form (Partner Input) */}
              <section className="bg-surface-container-lowest rounded-2xl shadow-sm p-6 md:p-8 flex flex-col gap-7">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-surface-container pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-5 rounded-full bg-secondary"></span>
                      <h2 className="font-headline-md text-headline-md text-on-surface font-bold">
                        파트너 시공 실행 계획
                      </h2>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                      고객에게 매칭 신뢰도를 높일 수 있도록 현장 투입 인원과 장비, 작업 시간 및 어필 메시지를 작성해주세요.
                    </p>
                  </div>
                  <span className="font-label-sm text-label-sm text-secondary bg-secondary-container/40 px-3 py-1 rounded-full font-bold self-start md:self-auto">
                    프로필 자동 연동됨
                  </span>
                </div>

                {/* Field 1 & Field 2 (Stepper & Duration) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Stepper: Workers */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-on-surface font-bold flex items-center justify-between">
                      <span>투입 인원 수</span>
                      <span className="text-secondary font-label-sm text-label-sm font-semibold">추천: 2인 1조</span>
                    </label>
                    <div className="flex items-center justify-between bg-surface-container-low p-2 rounded-xl">
                      <button
                        onClick={handleCrewMinus}
                        disabled={workerCnt <= 1}
                        className={`w-10 h-10 rounded-lg bg-surface-container-lowest text-primary hover:bg-surface-container transition-all flex items-center justify-center font-bold shadow-sm active:scale-95 ${
                          workerCnt <= 1 ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                        type="button"
                        aria-label="투입 인원 감소"
                      >
                        <span className="material-symbols-outlined text-[20px]">remove</span>
                      </button>

                      <div className="flex flex-col items-center">
                        <span className="font-headline-sm text-headline-sm font-bold text-primary">
                          {workerCnt} 명
                        </span>
                        <span className="text-[11px] text-on-surface-variant font-medium">
                          {workerCnt === 1
                            ? '(단독 책임 시공)'
                            : workerCnt === 2
                            ? '(숙련 기사 1인 + 보조 1인)'
                            : `(팀 단위 ${workerCnt}인 편성)`}
                        </span>
                      </div>

                      <button
                        onClick={handleCrewPlus}
                        disabled={workerCnt >= 10}
                        className="w-10 h-10 rounded-lg bg-surface-container-lowest text-primary hover:bg-surface-container transition-all flex items-center justify-center font-bold shadow-sm active:scale-95"
                        type="button"
                        aria-label="투입 인원 증가"
                      >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                      </button>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      현장 규모(4개층 및 외곽) 기준 2인 1조 투입 권장 구역입니다.
                    </p>
                  </div>

                  {/* Duration Select */}
                  <div className="flex flex-col gap-2">
                    <label className="font-label-md text-label-md text-on-surface font-bold flex items-center justify-between">
                      <span>1회차 예상 작업 소요 시간</span>
                      <span className="text-on-surface-variant font-label-sm text-label-sm font-normal">기준 소요 120분</span>
                    </label>
                    <div className="relative">
                      <select
                        value={estDurationHours}
                        onChange={(e) => setEstDurationHours(parseFloat(e.target.value))}
                        className="w-full bg-surface-container-low rounded-xl px-4 py-3.5 font-label-md text-label-md font-semibold text-primary appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value={1.0}>1.0 시간 (60분) - 기본 약식 케어</option>
                        <option value={1.5}>1.5 시간 (90분) - 고속 집중 청소</option>
                        <option value={2.0}>2.0 시간 (120분) - 정밀 표준 청소 [권장]</option>
                        <option value={2.5}>2.5 시간 (150분) - 심층 약품 소독 포함</option>
                        <option value={3.0}>3.0 시간 (180분) - 초정밀 디테일링</option>
                        <option value={3.5}>3.5 시간 (210분) - 대규모 복합 케어</option>
                        <option value={4.0}>4.0 시간 (240분) - 반일 전담 정밀 케어</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[20px]">
                        expand_more
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      공용부 대리석 계단 집진 및 물청소, 분리수거장 정리 포함 기준 시간
                    </p>
                  </div>
                </div>

                {/* Field 3: Specialized Equipment & Chemicals Selection */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-on-surface font-bold">
                      투입 전문 장비 및 약품 체크{' '}
                      <span className="text-on-surface-variant font-normal">(PTNR-DSH-02 프로필 등록 장비 자동 로드)</span>
                    </label>
                    <span className="font-label-sm text-label-sm text-secondary font-bold">
                      {selectedEquips.length}개 항목 적용 중
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'equip-1', name: '독일산 크란즐 고압스팀기 (150bar)', icon: 'cleaning_services' },
                      { id: 'equip-2', name: '산업용 헤파필터 집진기', icon: 'air' },
                      { id: 'equip-3', name: '친환경 에코라벨 중성 인증 세제', icon: 'eco', isEco: true },
                      { id: 'equip-4', name: '피톤치드 연무 소독기', icon: 'sanitizer' }
                    ].map((equip) => {
                      const isChecked = selectedEquips.includes(equip.name);
                      return (
                        <label
                          key={equip.id}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer group ${
                            isChecked
                              ? 'bg-surface-container-low border-secondary/40'
                              : 'bg-surface-container-lowest border-surface-container hover:bg-surface-container-low'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleEquip(equip.name)}
                            className="w-4 h-4 rounded text-secondary focus:ring-secondary/20 accent-[#006c4a]"
                          />
                          <div className="flex items-center gap-2">
                            <span
                              className={`material-symbols-outlined text-[18px] ${
                                equip.isEco ? 'text-secondary' : 'text-primary'
                              }`}
                            >
                              {equip.icon}
                            </span>
                            <span className="font-label-md text-label-md text-on-surface font-semibold group-hover:text-primary transition-colors">
                              {equip.name}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Field 4: Textarea Note & Appeal Message */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="font-label-md text-label-md text-on-surface font-bold">
                      작업 계획 및 고객 어필 메시지
                    </label>
                    <span
                      className={`font-label-sm text-label-sm font-mono ${
                        appealMsg.length < 10 ? 'text-error font-bold' : 'text-on-surface-variant'
                      }`}
                    >
                      {appealMsg.length} / 300자 {appealMsg.length < 10 && '(최소 10자 이상)'}
                    </span>
                  </div>

                  <textarea
                    value={appealMsg}
                    onChange={(e) => setAppealMsg(e.target.value)}
                    maxLength={300}
                    rows={4}
                    placeholder="고객에게 전달할 시공 계획과 특이사항을 최소 10자 이상 작성해 주세요..."
                    className="w-full bg-surface-container-low p-4 rounded-xl font-body-md text-body-md text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed resize-none"
                  />
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    제출된 메시지는 고객의 전용 매칭 리포트 상단에 강조 노출됩니다.
                  </p>
                </div>
              </section>

              {/* CARD 3: Mandatory Safeguards & Partner Agreement */}
              <section className="bg-surface-container-low/60 rounded-2xl p-6 md:p-8 flex flex-col gap-5">
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[22px] text-primary">gavel</span>
                  <div>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      필수 준수 확약 및 법적 동의
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      공정한 매칭 생태계 유지를 위해 아래 3가지 의무 규정에 최종 동의합니다.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3.5 pt-1">
                  {/* Checkbox 1 */}
                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-lowest shadow-sm cursor-pointer hover:bg-surface-container-low transition-all">
                    <input
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-secondary focus:ring-secondary/20 accent-[#006c4a] shrink-0"
                    />
                    <span className="font-body-md text-body-md text-on-surface leading-snug">
                      <span className="font-bold text-primary">[필수]</span> 고객 제시 조건(총 용역 대금{' '}
                      {fixedTerms.fixedAmt.toLocaleString()}원 및 첫 방문 일정)을 100% 수락하며, 배차 확정 후 파트너사의 단순 변심 또는 일방 취소 시 플랫폼 운영 규정에 따라{' '}
                      <strong>7일간 신규 입찰 및 투찰이 즉시 정지</strong>됨에 엄숙히 동의합니다.
                    </span>
                  </label>

                  {/* Checkbox 2 */}
                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-lowest shadow-sm cursor-pointer hover:bg-surface-container-low transition-all">
                    <input
                      type="checkbox"
                      checked={agreedInsurance}
                      onChange={(e) => setAgreedInsurance(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-secondary focus:ring-secondary/20 accent-[#006c4a] shrink-0"
                    />
                    <span className="font-body-md text-body-md text-on-surface leading-snug">
                      <span className="font-bold text-primary">[필수]</span> 현장 시공 시{' '}
                      <strong>5억원 영업배상책임보험</strong> 자동 적용 규정 및 플랫폼 표준 작업 안전 수칙 준수에 동의합니다.
                    </span>
                  </label>

                  {/* Checkbox 3 */}
                  <label className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-lowest shadow-sm cursor-pointer hover:bg-surface-container-low transition-all">
                    <input
                      type="checkbox"
                      checked={agreedPhotoReport}
                      onChange={(e) => setAgreedPhotoReport(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded text-secondary focus:ring-secondary/20 accent-[#006c4a] shrink-0"
                    />
                    <span className="font-body-md text-body-md text-on-surface leading-snug">
                      <span className="font-bold text-primary">[필수]</span> 매회차 시공 완료 직후{' '}
                      <strong>전/후 증빙 사진(최소 2매 이상)</strong>을 파트너 앱에 등록하여 관리자 검수를 완료하는 것에 동의합니다.
                    </span>
                  </label>
                </div>
              </section>
            </div>

            {/* RIGHT COLUMN: Sticky Financial Breakdown & Submission CTA (4 of 12 cols ~34%) */}
            <div className="lg:col-span-4 flex flex-col gap-6 lg:sticky lg:top-24">
              {/* Settlement Breakdown Card */}
              <div className="bg-surface-container-lowest rounded-2xl shadow-md overflow-hidden">
                <div className="bg-primary text-on-primary p-6">
                  <div className="flex items-center justify-between text-on-primary/80 font-label-sm text-label-sm mb-1">
                    <span>청약 데이터 이용료 & 정산 계산</span>
                    <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-primary font-bold">
                    정산 및 청약 상세 내역
                  </h3>
                  <p className="font-body-sm text-body-sm text-on-primary/75 mt-0.5">
                    매칭 성사 시 100% 안전 에스크로 지급
                  </p>
                </div>

                <div className="p-6 flex flex-col gap-5">
                  {/* Fee Lines */}
                  <div className="flex flex-col gap-3 pb-5 border-b border-surface-container text-body-md">
                    <div className="flex items-center justify-between text-on-surface-variant">
                      <span>정상 청약 데이터 이용료</span>
                      <span className="font-mono font-medium line-through">
                        {feeSummary.dataFeeAmt.toLocaleString()} 원
                      </span>
                    </div>

                    {/* Discount Highlight */}
                    <div className="flex items-center justify-between bg-secondary-container/30 px-3 py-2 rounded-xl text-on-secondary-container">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px] text-secondary">local_activity</span>
                        <span className="font-label-sm text-label-sm font-bold">{feeSummary.couponName}</span>
                      </div>
                      <span className="font-mono font-bold text-secondary">
                        -{feeSummary.discountAmt.toLocaleString()} 원
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-label-md text-label-md text-on-surface font-semibold">
                        이번 청약 실 납부액
                      </span>
                      <span className="font-headline-sm text-headline-sm font-extrabold text-secondary font-mono">
                        {feeSummary.finalPayAmt.toLocaleString()} 원
                      </span>
                    </div>
                  </div>

                  {/* Payout Line */}
                  <div className="flex flex-col gap-2 pb-5 border-b border-surface-container">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="font-label-md text-label-md text-on-surface font-bold block">
                          최종 매칭 시 파트너 실수령액
                        </span>
                        <span className="font-body-sm text-body-sm text-secondary font-medium">
                          수수료 0% 전액 수령 보장
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-display text-headline-lg font-extrabold text-primary font-mono tracking-tight">
                          {feeSummary.expectedNetRevenue.toLocaleString()}
                        </span>
                        <span className="font-headline-sm text-headline-sm font-bold text-primary">원</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2 bg-surface-container-low p-2.5 rounded-lg text-body-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-[16px] text-primary">event_available</span>
                      <span>
                        <strong>에스크로 정산일:</strong> 고객 검수 승인 익일(D+1) 오전 10:00
                      </span>
                    </div>
                  </div>

                  {/* Submit CTA Group */}
                  <div className="flex flex-col gap-3 pt-1">
                    {partnerDefaults.alreadyBid ? (
                      <div className="bg-secondary-container/40 border border-secondary/30 p-4 rounded-xl text-center flex flex-col items-center gap-1">
                        <span className="material-symbols-outlined text-secondary text-[24px]">verified</span>
                        <span className="font-label-md text-label-md font-bold text-secondary">
                          이미 청약서가 접수된 공고입니다
                        </span>
                        <span className="text-body-sm text-on-surface-variant">
                          고객의 제안서 검토 및 계약 승인을 기다리고 있습니다.
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={handleSubmitBid}
                        disabled={!isSubmitValid}
                        className={`w-full py-4 px-6 rounded-xl font-headline-sm text-headline-sm font-bold shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 group ${
                          isSubmitValid
                            ? 'bg-primary hover:bg-primary-container text-on-primary cursor-pointer hover:shadow-lg'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                        }`}
                        type="button"
                      >
                        {submitting ? (
                          <>
                            <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                            <span>청약서 암호화 전송 중...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[22px] transition-transform group-hover:translate-x-1">
                              send
                            </span>
                            <span>청약서 제출하기 (PTNR-QOT-02)</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={handleSaveDraft}
                      className="w-full bg-surface-container-low hover:bg-surface-container text-on-surface py-3 px-4 rounded-xl font-label-md text-label-md font-semibold transition-all flex items-center justify-center gap-1.5"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">bookmark</span>
                      <span>입력 내용 임시저장</span>
                    </button>

                    <p className="font-body-sm text-body-sm text-on-surface-variant text-center leading-normal px-2 mt-1">
                      청약서를 제출하면 고객에게 즉시 파트너 프로필과 함께 제안서가 전달되며, 고객 채택 시 카카오 알림톡으로 실시간 확정됩니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Partner Safety & Hotline Widgets */}
              <div className="bg-surface-container-low rounded-2xl p-5 flex flex-col gap-4">
                {/* Hotline Item */}
                <div className="flex items-center justify-between pb-3 border-b border-surface-container">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[18px]">phone_in_talk</span>
                    </div>
                    <div>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">24시간 관제 핫라인</p>
                      <p className="font-label-md text-label-md font-bold text-on-surface">1588-0000 (ARS 2번)</p>
                    </div>
                  </div>
                  <span className="bg-secondary/10 text-secondary font-label-sm text-label-sm font-bold px-2 py-0.5 rounded">
                    운영중
                  </span>
                </div>

                {/* Safeguards Assurance */}
                <div className="flex items-start gap-2.5 text-body-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                    verified_user
                  </span>
                  <p>
                    <strong>파트너 안심 보장제:</strong> 고객의 당일 노쇼 및 일방 변심 취소 시 규정에 따라 위약금 100% 에스크로 보상 처리됩니다.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 text-body-sm text-on-surface-variant">
                  <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">balance</span>
                  <p>
                    본 오더는 썰닥 표준 매칭 약관의 보호를 받으며 분쟁 발생 시 플랫폼 중재위원회가 즉각 개입합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-surface-container-low mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-8">
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
                <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  24/7 파트너 긴급 기술 지원
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  현장 이슈 전담 ARS 1588-0000 (내선 2번)
                </p>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col lg:flex-row items-center justify-between gap-4 border-t border-surface-container">
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

      {/* SUBMISSION SUCCESS MODAL */}
      {submitSuccessModal.show && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 sm:p-8 flex flex-col gap-5 shadow-2xl animate-fade-in text-center">
            <div className="w-16 h-16 rounded-full bg-secondary/15 text-secondary mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[36px]">check_circle</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <h3 className="font-headline-md text-headline-md text-primary font-extrabold">
                청약서가 성공적으로 접수되었습니다!
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                고객에게 파트너사의 시공 계획서가 전달되었습니다. 고객이 제안서를 채택하면 알림톡으로 최종 배차가 확정됩니다.
              </p>
            </div>

            <div className="bg-surface-container-low p-4 rounded-xl flex flex-col gap-2 text-left">
              <div className="flex items-center justify-between font-label-md text-label-md">
                <span className="text-on-surface-variant">입찰 접수 번호</span>
                <span className="font-mono font-bold text-primary">{submitSuccessModal.bidNo}</span>
              </div>
              <div className="flex items-center justify-between font-label-md text-label-md">
                <span className="text-on-surface-variant">청약 확정 금액</span>
                <span className="font-bold text-on-surface">{fixedTerms.fixedAmt.toLocaleString()} 원</span>
              </div>
              <div className="flex items-center justify-between font-label-md text-label-md">
                <span className="text-on-surface-variant">투입 편성 계획</span>
                <span className="font-semibold text-secondary">
                  {workerCnt}인 1조 · {estDurationHours}시간 시공
                </span>
              </div>
            </div>

            <button
              onClick={handleGoOrderList}
              className="w-full py-3.5 bg-primary hover:bg-primary-container text-on-primary rounded-xl font-label-lg text-label-lg font-bold shadow-md transition-all active:scale-[0.98]"
              type="button"
            >
              공고 목록으로 돌아가기 (PTNR-QOT-00)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
