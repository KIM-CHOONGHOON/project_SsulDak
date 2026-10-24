/**
 * =============================================================================
 * SsulDak (쓸고닦고) 프론트엔드 컴포넌트
 * 화면 ID: USER-QOT-01 (파트너 프로필 및 청약 상세 계획 확인)
 * 파일 경로: SsulDak_Web/User/frontend/USER-QOT-01/index.tsx
 * 엔드포인트 URL: POST /api/user/user_qot_01
 * 부모 호출 화면: USER-QOT-00 (수신 청약 목록)
 * 대상 이동 화면: USER-CNT-00 (계약 및 결제 진행)
 * =============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';

// =============================================================================
// 1. 타입 인터페이스 정의
// =============================================================================

export interface PartnerDetailInfo {
  ptnrNo: string;
  companyNm: string;
  ceoNm: string;
  profileImgUrl: string;
  avgRating: number;
  reviewCnt: number;
  totalWorkCnt: number;
  hasInsuranceYn: string;
  isExcellentYn: string;
  introText: string;
  badges: string[];
}

export interface ProposalDetailInfo {
  bidNo: string;
  slotNo: string;
  bidAmt: number;
  workerCnt: number;
  estDurationHours: number;
  equipDesc: string;
  appealMsg: string;
}

export interface PortfolioItem {
  portSeq: number;
  title: string;
  beforeImgUrl: string;
  afterImgUrl: string;
  category?: 'floor' | 'details' | string;
}

export interface CustomerReviewItem {
  reviewSeq: number;
  rating: number;
  content: string;
  cleanTypeNm: string;
  regDt: string;
  maskedUserNm: string;
}

export interface UserQot01Props {
  onNavigate?: (screenId: string, params?: any) => void;
  initialPtnrNo?: string;
  initialBidNo?: string;
  initialSlotNo?: string;
  initialReqNo?: string;
  apiEndpoint?: string;
}

// =============================================================================
// 2. 메인 컴포넌트
// =============================================================================

export default function UserQot01Screen({
  onNavigate,
  initialPtnrNo = 'P20260900012',
  initialBidNo = 'BID2026102200001',
  initialSlotNo = 'REQ202610210001-01',
  initialReqNo = 'REQ202610210001',
  apiEndpoint = '/api/user/user_qot_01',
}: UserQot01Props) {
  // 상태 변수
  const [partner, setPartner] = useState<PartnerDetailInfo>({
    ptnrNo: initialPtnrNo,
    companyNm: '반짝빌라클린',
    ceoNm: '홍길동',
    profileImgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCob15xWA9qrRhaM8miKnlu_G9Vdt1a12KL39adkZf8DJ2Fz86ZFKN6kNl5VJ4tdofR2AY5_5jiXiW2_OA014xbBvpNZAS_Fx0q9RUU2CdlbVQWtlbVisnOZHO_XvA7aF6_-JC02DpFJaj59hNQNVwSTv6JKvZXL01VAv222YNY5FCiMUUgBRMTH_q_OPfiIE18nlPC2Mbd2kEuq_yRaT46B_cGOXVmeKFGIp9rAioJZrUgTkayVKFN',
    avgRating: 5.0,
    reviewCnt: 48,
    totalWorkCnt: 312,
    hasInsuranceYn: 'Y',
    isExcellentYn: 'Y',
    introText: '일산동구 · 마두동 · 백석동 빌라/상가 계단관리 전문 파트너입니다. 빌라 계단 및 복도 정기관리 7년 경력의 베테랑 클리너 2인 1조 팀입니다.',
    badges: ['본인인증 완료', '영업배상책임보험 1억 가입', '2024 우수 마스터', '배차확정률 99%'],
  });

  const [proposal, setProposal] = useState<ProposalDetailInfo>({
    bidNo: initialBidNo,
    slotNo: initialSlotNo,
    bidAmt: 240000,
    workerCnt: 2,
    estDurationHours: 2.0,
    equipDesc: '독일 프리미엄 카처(Kärcher) 고압 스팀기, 환경부 인증 독일 키엘(Kiehl) 친환경 살균약품, 산업용 헤파필터 건·습식 듀얼 집진기, 초미립자 피톤치드 편백 연무 분사 방역기',
    appealMsg: '빌라 계단 및 공용 복도 정기관리 7년 경력의 베테랑 클리너 2인 1조 팀입니다. 단순 바닥 물걸레질에 그치지 않고, 층별 창틀 먼지 제거, 난간 손잡이 알코올 멸균 소독, 1층 현관 자동문 유리 세정 및 우편함/센서등 미세먼지까지 내 집처럼 꼼꼼하게 관리해 드립니다. 매 회차 시공 전/후 상세 사진을 카카오 알림톡으로 실시간 보고서 형태로 전송해 드립니다.',
  });

  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([
    {
      portSeq: 1,
      title: '1. 로비 대리석 고압 수세 세척',
      beforeImgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAj5UjwV3KsqnCdcEQ0knuV28b8xBUKEQLIaVPiD00AqKUFtPiNGUtYa_DezKqYldUl6Lr9LyTTHZV70Jt-lVlAJq3zC_3Tc2wLgwgpp9UP8Z8nK8uzlJCeoYzxx20ouSbYEMwUs5rUxHVPdoZfS2SWHIOBiOXH6XyCxXQ8na7M3Ks9qnxtgFHjwdd_rT1G4dT_MsfkzdIrzez4w9NVZnD8Z6qApWmNrn62HPfqg0VMQ11y1Aq4ZHmd',
      afterImgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBbr7V-XcfOLtEYilxzJJo1MaPnwBGSW5hGNPs4EonyQGicpTIBeKz2siL_oQFYbF3ewiq1KpH04e74tEsWsxJ3WSU9YME02VkoT9D079yCN2SmTg9zc-WxlsNKN7NN7gdghSrZdf88AfMUuB09Mgit1SIuWDh-_TUN45ew4w6m6zZ50ifyAxQgcN5OwBaESxcdiwCnX5Fp-PjWx3Tx_c40QHDA-x2CXSVv2-24sV03Gy8Mi0i-Nh0z',
      category: 'floor',
    },
    {
      portSeq: 2,
      title: '2. 계단실 핸드레일 스팀 살균',
      beforeImgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBhtiM6ofiQVvbSqS9em_vHj2AlIUeMzzROzRmcOl-l8xPgl_o-RX5C8wvKGSODRrmYEg_lwhrQUJYniXCFG2bzX0F1_LdxXMF69t0Yb5k6vm0ceTjbxPqPayh_MpI4DMoK9NWJGypfo-EfyaRXmSn2PAha74Mj-uxwGAE5s7pQQoSVUKiTLwTCMNub7swUWQemSQrWArKMl20PUNq7nSksNCShUfzm6N51E7E54IiEmWSHFxxycoHk',
      afterImgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBf7XrNA0A4MSb9zEMPLQinry9m8UlwRMlOh9igGSrNjInOOXSjSbj8QfE1KLcuvUsR5p5cXghZct79bWDCX7lC3WKMqkJHRLD8wOG9GJ-dqjvLQ2QxeaVYs-Rx4E-FEMPkQxfrm3ZF9QjgYDNXFZGnlfwq1ail29WaGMtq738169onEzmg1hCRNqNpA9pu4qS6DHAPX9F7SOJ3obBelZSudbOklPRSBvXvK1J1-UX7D3RMSCBL0AUV',
      category: 'details',
    },
    {
      portSeq: 3,
      title: '3. 지상 주차장 및 재활용장 정리',
      beforeImgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDTYKpOi_8lsbNuGIYVnNtHQemEKp2ZnPg0Eh6lSgwACkRhSogZg0T7Ohp6XmGNLqJvpxyyfY1qvdwP0MiqRuAWJe754p5800j6Hy2hjrnaLo7fWivbdr3AMI_Bs8npw3vy6FdpWbNSZmrPatHVhwixTb9tWsjm4JQOtP0OR0WcZCsDOOTfPPnyWUobq1GJ7Ai4gjjF3KF_TfjRTEQAvkN0KYqSNeVZwnmTbRPdg-LKTZjCUELKZ0ZA',
      afterImgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCed7q-CozeALav810-CrvlbBnP92V20ppfysZ01aQS6akbQBTNQsSe9Qo3LaIBIN4LcetMcR6NW9pwcnhVEFn6cyCTSco6RUSUvRvWd9dEHGCkGEqXVlRmrV0A3EoeZT0DwvbkSgrXC1QGoB9KfFR-w69que71dXCUHUWLUoYl4FrA9BbntSGMz_uXUtyeZ6IAsMSkSHYJYGpDfDLFBt2AeDPM9Q_gK3lZSYd2qhAOTdAmbwdTfLmy',
      category: 'floor',
    },
    {
      portSeq: 4,
      title: '4. 창틀 틈새 및 세대별 우편함',
      beforeImgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD75JWft_aCJdcMTA48skMTf5APguQkFkQ1o7f_-ibUn5UJ64NCVN7GON51llCbmc7V5rysyvjkby8IJEgOcm4KEf7j-jmbu7BMcPcJTRsmhBcBXQmaNtlPAKexq8GzF6u1lnQSFNFEPIi7tPMkBelUDTKZ7JNvaUWBEiy7mZUB0J8WiRyjoaQR4BOSay3EplZcByN8jphZsx2UvB3iV6Fej8oW5ltJD0b_2DYcSrSCI8SCKCzIe74l',
      afterImgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB7S5MBEERL42u1w0XMkXKBoho8GEzPPYkjQpMMJHUbCjhgdZRxxDZ6TtBUlLAKAEqPFUBWOf5o1A1b0-pSvre7EaVTZ3vRjg8RnmqUHAnnPUFpiMsl2T-dFIMNjel63BO0OxBkClhk0PgRbcpwVURWWjjkGkayYu-TbShZoUAk7LPmlljEhIHP2SdK0sMrdiZnBEpz1vnhL9-qsZwq-lUAir3QxGTjRQxbm57yeryEsP0029yptV2t',
      category: 'details',
    },
  ]);

  const [recentReviews, setRecentReviews] = useState<CustomerReviewItem[]>([
    {
      reviewSeq: 1,
      rating: 5,
      content: '매주 화요일마다 시간 약속 칼같이 지키셔서 와주시고, 계단 구석 창틀 거미줄까지 깨끗하게 닦아주십니다. 끝나면 사진도 8장씩 카톡으로 전송해 주셔서 입주민 회의 때 브리핑하기 너무 편합니다. 입주민분들 만족도가 매우 높습니다.',
      cleanTypeNm: '일산동구 빌라 정기관리 6개월차 이용 중',
      regDt: '2024.10.18',
      maskedUserNm: '일산동구 빌라 관리인 박*훈 님',
    },
    {
      reviewSeq: 2,
      rating: 5,
      content: '고압세척기로 주차장 바닥 누적된 기름때까지 싹 지워주셨어요. 분리수거장 냄새나던 문제도 피톤치드 연무 살균해주신 이후로 싹 사라졌습니다. 다음 번 3개월도 반짝빌라클린에 그대로 연장할 예정입니다.',
      cleanTypeNm: '마두동 다세대 주택 정기관리 1년차 재계약',
      regDt: '2024.10.12',
      maskedUserNm: '마두동 다세대 주택 이*영 님',
    },
    {
      reviewSeq: 3,
      rating: 5,
      content: '클리너 2분이서 손발 척척 맞게 빠르게 끝내주시고 독한 락스 냄새 전혀 없이 은은한 숲 향기만 남아 좋습니다. 계단 난간 손잡이 알코올 소독도 철저히 해주셔서 안심됩니다.',
      cleanTypeNm: '백석동 빌라 자치회 정기관리 3개월차 완료',
      regDt: '2024.09.28',
      maskedUserNm: '백석동 빌라 자치회 김*수 님',
    },
  ]);

  const [activeTab, setActiveTab] = useState<'all' | 'floor' | 'details'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'partner'; text: string; time: string }>>([
    {
      sender: 'partner',
      text: '안녕하세요! 반짝빌라클린 홍길동 대표입니다. 견적 및 시공 일정에 대해 궁금하신 점이 있으시면 편하게 문의해 주세요.',
      time: '오전 10:00',
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ---------------------------------------------------------------------------
  // 백엔드 API 연동 (GET_PARTNER_DETAIL)
  // ---------------------------------------------------------------------------
  const fetchPartnerDetail = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: 'GET_PARTNER_DETAIL',
          ptnrNo: initialPtnrNo,
          bidNo: initialBidNo,
          slotNo: initialSlotNo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.partner) setPartner(data.partner);
        if (data.proposal) setProposal(data.proposal);
        if (data.portfolios && data.portfolios.length > 0) setPortfolios(data.portfolios);
        if (data.recentReviews && data.recentReviews.length > 0) setRecentReviews(data.recentReviews);
      }
    } catch (err) {
      console.warn('API 연동 실패(mock fallback 유지):', err);
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint, initialPtnrNo, initialBidNo, initialSlotNo]);

  useEffect(() => {
    fetchPartnerDetail();
  }, [fetchPartnerDetail]);

  // 필터링된 포트폴리오
  const filteredPortfolios = portfolios.filter((item) => {
    if (activeTab === 'all') return true;
    return item.category === activeTab;
  });

  // 금액 계산
  const monthlyBidAmt = proposal.bidAmt; // 240,000원
  const totalServiceAmt = monthlyBidAmt * 3; // 720,000원 (3개월)
  const dataFee = 33000; // 플랫폼 안심 데이터 이용료
  const couponDiscount = 5000; // 신규 빌라 지원 쿠폰
  const totalDueNow = monthlyBidAmt + dataFee - couponDiscount; // 이번 회차 결제 예정액: 268,000원

  // 계약 확정 핸들러 (USER-CNT-00 연계)
  const handleProceedContract = () => {
    if (onNavigate) {
      onNavigate('USER-CNT-00', {
        ptnrNo: partner.ptnrNo,
        companyNm: partner.companyNm,
        bidNo: proposal.bidNo,
        slotNo: proposal.slotNo,
        reqNo: initialReqNo,
        totalDueNow,
      });
    } else {
      showToast(`[USER-CNT-00] '${partner.companyNm}' 파트너와의 계약 및 결제 화면으로 이동합니다.`);
    }
  };

  // 1:1 메시지 전송
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages((prev) => [
      ...prev,
      { sender: 'user', text: chatInput.trim(), time: nowStr },
    ]);
    const inputCopy = chatInput;
    setChatInput('');

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'partner',
          text: `"${inputCopy}" 문의 확인했습니다! 현장 방문 시 요청하신 사항을 철저히 반영하여 시공해 드리겠습니다.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans antialiased flex flex-col justify-between selection:bg-[#d4e3ff] selection:text-[#00254a]">
      {/* 토스트 메시지 */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-xl bg-[#00254a] text-white text-[13px] font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[18px] text-[#82f5c1]">verified</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =====================================================================
          1. 고정 글로벌 헤더
      ===================================================================== */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#f8f9ff]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.04)] border-b border-[#e5eeff]">
        <div className="h-16 max-w-7xl mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigate && onNavigate('USER-COM-00')}
              className="flex items-center gap-2 cursor-pointer text-left focus:outline-none"
            >
              <img
                alt="SsulDak Brand Logo"
                className="h-8 w-auto object-contain"
                src="https://lh3.googleusercontent.com/aida/AEtjO1XlE5dGCq6Awu7YGl9jLXQCTA7t0IZsmJfZyUQSy_So39r5B_9DgKVRpNgn2lIWPB_vkFwbyJvxRauYr8NrBr8Ev5HNLHcxNuK1dyz8aQQON3nkYvZA0iFnBntaXm5YE-GRy1fdElMY7mqcgcLiOn6Igu7ZM3Dehje1BVaFd_UK3AteIgpBjbsnSSlBOEigu2qfzX9XgGZgL6mO3R9fV4YtByyCV6ArO-jWEfVoHeAtGM8Q98I4mu5IqYg"
              />
              <span className="text-[17px] font-bold text-[#00254a] tracking-tight hidden sm:inline-block">
                쓸고닦고
              </span>
            </button>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#eff4ff] text-[#00254a] hover:bg-[#e5eeff] transition-colors cursor-pointer text-xs font-semibold">
              <span className="material-symbols-outlined text-[16px] text-[#006c4a]">location_on</span>
              <span>경기 고양시 일산동구</span>
              <span className="material-symbols-outlined text-[14px] text-[#737780]">keyboard_arrow_down</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-[15px] font-semibold text-[#43474f]">
            <button onClick={() => onNavigate && onNavigate('USER-COM-00')} className="hover:text-[#0b1c30] transition-colors">홈</button>
            <button onClick={() => onNavigate && onNavigate('USER-QOT-00')} className="text-[#00254a] font-bold">견적현황</button>
            <button onClick={() => showToast('이용내역 화면 준비 중입니다.')} className="hover:text-[#0b1c30] transition-colors">이용내역</button>
            <button onClick={() => showToast('쿠폰북 화면 준비 중입니다.')} className="hover:text-[#0b1c30] transition-colors">쿠폰북</button>
            <button onClick={() => onNavigate && onNavigate('USER-ATH-03')} className="hover:text-[#0b1c30] transition-colors">마이</button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => showToast('보유 쿠폰: 1장')}
              className="relative p-1.5 rounded-full text-[#43474f] hover:bg-[#eff4ff] transition-colors"
              title="쿠폰함"
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">confirmation_number</span>
              <span className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-[#006c4a]"></span>
            </button>
            <button
              onClick={() => showToast('새로운 알림이 1건 있습니다.')}
              className="relative p-1.5 rounded-full text-[#43474f] hover:bg-[#eff4ff] transition-colors"
              title="알림"
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1 right-0.5 min-w-[15px] h-[15px] px-[2px] rounded-full bg-[#ba1a1a] text-white text-[10px] leading-tight flex items-center justify-center font-bold">
                1
              </span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate('USER-ATH-03')}
              className="w-8 h-8 rounded-full bg-[#00254a] flex items-center justify-center cursor-pointer shadow-sm text-white"
            >
              <span className="material-symbols-outlined text-[18px]">person</span>
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. 메인 컨텐츠 영역
      ===================================================================== */}
      <main className="w-full pt-20 bg-[#f8f9ff] min-h-screen pb-24 md:pb-16 flex-1">
        <div className="relative w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-12 py-4">
          
          {/* Breadcrumb & Navigation Header */}
          <div className="flex flex-col gap-2 mb-6">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[#43474f] text-[13px] font-semibold">
              <button
                onClick={() => onNavigate && onNavigate('USER-COM-00')}
                className="hover:text-[#00254a] transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">home</span>
                <span>홈</span>
              </button>
              <span className="material-symbols-outlined text-[14px] text-[#737780]">chevron_right</span>
              <button
                onClick={() => onNavigate && onNavigate('USER-QOT-00')}
                className="hover:text-[#00254a] transition-colors"
              >
                견적 현황
              </button>
              <span className="material-symbols-outlined text-[14px] text-[#737780]">chevron_right</span>
              <button
                onClick={() => onNavigate && onNavigate('USER-QOT-00')}
                className="hover:text-[#00254a] transition-colors"
              >
                받은 견적 및 청약 현황
              </button>
              <span className="material-symbols-outlined text-[14px] text-[#737780]">chevron_right</span>
              <span className="text-[#0b1c30] font-bold">파트너 프로필 상세</span>
            </nav>

            {/* Back Action & Top Price Ribbon */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <button
                onClick={() => onNavigate ? onNavigate('USER-QOT-00') : window.history.back()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#00254a] text-[14px] font-bold transition-all group shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-0.5">
                  arrow_back
                </span>
                <span>청약 목록으로 돌아가기</span>
              </button>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#dce9ff] text-[#00254a] text-[13px] font-bold shadow-sm">
                  <span className="material-symbols-outlined text-[16px] text-[#006c4a]">verified</span>
                  정기청소 제안 파트너
                </span>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#82f5c1]/30 text-[#00714e] text-[13px] font-bold shadow-sm border border-[#82f5c1]/50">
                  <span className="text-[#43474f] font-normal">입찰 제안금액:</span>
                  <span className="text-[17px] text-[#00254a] font-bold tracking-tight">
                    {monthlyBidAmt.toLocaleString()}원
                  </span>
                  <span className="text-xs text-[#43474f] font-medium">/ 월 4회</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2컬럼 레이아웃: 좌측 상세(8 cols) / 우측 고정 청약요약 사이드바(4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* =================================================================
                좌측 컬럼: 파트너 상세 및 시공 계획
            ================================================================= */}
            <div className="lg:col-span-8 flex flex-col gap-6 min-w-0">
              
              {/* Partner Hero Overview Card */}
              <div className="relative bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_rgba(22,59,102,0.06)] border border-[#e5eeff] overflow-hidden">
                <div className="absolute -right-16 -top-16 w-52 h-52 bg-[#eff4ff] rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[#e5eeff]/80">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="relative w-20 h-20 rounded-2xl bg-[#e5eeff] flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0 border-2 border-white">
                      <img
                        className="w-full h-full object-cover"
                        src={partner.profileImgUrl}
                        alt={`${partner.companyNm} 대표 프로필`}
                        onError={(e) => {
                          // 이미지 실패 시 기본 placeholder
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#006c4a] border-2 border-white ring-2 ring-[#82f5c1]/50"></div>
                    </div>

                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-[26px] text-[#00254a] tracking-tight font-extrabold">
                          {partner.companyNm}
                        </h1>
                        <span className="text-[13px] text-[#43474f] font-medium px-2 py-0.5 rounded-md bg-[#eff4ff]">
                          {partner.ceoNm} 대표
                        </span>
                      </div>
                      <p className="text-[13px] text-[#737780] font-medium">
                        {partner.introText.split('.')[0] || '일산동구 · 마두동 · 백석동 빌라/상가 계단관리 전문 파트너'}
                      </p>
                      <div className="flex items-center gap-2 pt-1 text-sm">
                        <div className="flex items-center text-[#e49200]">
                          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            star
                          </span>
                          <span className="text-[17px] text-[#0b1c30] ml-1 font-extrabold">
                            {partner.avgRating.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-[13px] text-[#43474f] font-medium">
                          (리뷰 {partner.reviewCnt}건)
                        </span>
                        <span className="text-[#c3c6d0]">·</span>
                        <span className="text-[13px] text-[#006c4a] font-bold">재계약율 94%</span>
                      </div>
                    </div>
                  </div>

                  {/* 빠른 실적 메트릭 */}
                  <div className="grid grid-cols-2 gap-2 w-full sm:w-auto flex-shrink-0">
                    <div className="bg-[#eff4ff] px-4 py-2 rounded-xl flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] text-[#43474f] font-semibold">총 시공 누적</span>
                      <span className="text-[18px] text-[#00254a] font-black">{partner.totalWorkCnt}건</span>
                    </div>
                    <div className="bg-[#eff4ff] px-4 py-2 rounded-xl flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] text-[#43474f] font-semibold">전문 업력</span>
                      <span className="text-[18px] text-[#00254a] font-black">7년차</span>
                    </div>
                  </div>
                </div>

                {/* 인증 뱃지 스트립 */}
                <div className="pt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e5eeff] text-[#00254a] text-[13px] font-bold shadow-sm">
                    <span className="material-symbols-outlined text-[17px] text-[#006c4a]">verified_user</span>
                    본인인증 완료
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#eff4ff] text-[#163b66] text-[13px] font-bold shadow-sm">
                    <span className="material-symbols-outlined text-[17px] text-[#00254a]">security</span>
                    영업배상책임보험 1억 가입
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ffddb8] text-[#2a1700] text-[13px] font-extrabold shadow-sm">
                    <span className="material-symbols-outlined text-[17px] text-[#543300]">workspace_premium</span>
                    2024 우수 마스터
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#82f5c1]/30 text-[#00714e] text-[13px] font-bold shadow-sm">
                    <span className="material-symbols-outlined text-[17px]">bolt</span>
                    배차확정률 99%
                  </span>
                </div>

                {/* 세무 & 결제 안심 태그 */}
                <div className="mt-4 pt-3 border-t border-[#e5eeff]/60 flex flex-wrap items-center gap-y-2 gap-x-6 text-[13px] text-[#43474f]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-[16px] text-[#006c4a]">check_circle</span>
                    사업자등록 정상 인증
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-[16px] text-[#006c4a]">receipt</span>
                    세금계산서 100% 즉시 발행
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="material-symbols-outlined text-[16px] text-[#006c4a]">credit_card</span>
                    법인/개인 카드 결제 지원
                  </span>
                </div>
              </div>

              {/* ===============================================================
                  Section 1: 청약 제출 시공 계획 및 상세 제안
              =============================================================== */}
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_rgba(22,59,102,0.06)] border border-[#e5eeff] flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-[#e5eeff] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-6 bg-[#00254a] rounded-full"></div>
                    <h2 className="text-[20px] text-[#00254a] font-extrabold">
                      청약 제출 시공 계획 및 상세 제안
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#737780] bg-[#eff4ff] px-2.5 py-1 rounded-md">
                    Execution Plan
                  </span>
                </div>

                {/* 투입 인원 & 방문 일정 스펙 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-[#eff4ff] flex items-start gap-4 border border-[#e5eeff]">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#00254a] shadow-sm flex-shrink-0">
                      <span className="material-symbols-outlined text-[24px]">group</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-[#43474f] font-semibold">투입 인원 및 소요 시간</span>
                      <span className="text-[15px] text-[#0b1c30] font-bold mt-0.5">
                        전문 마스터 클리너 {proposal.workerCnt}인 1조 투입
                      </span>
                      <span className="text-[13px] text-[#43474f] mt-1 leading-snug">
                        1회 방문 시 약 {proposal.estDurationHours}시간 정밀 케어 (층간 창틀·먼지 흡진 포함)
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#eff4ff] flex items-start gap-4 border border-[#e5eeff]">
                    <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-[#00254a] shadow-sm flex-shrink-0">
                      <span className="material-symbols-outlined text-[24px]">calendar_month</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-[#43474f] font-semibold">주간 및 월간 방문 일정</span>
                      <span className="text-[15px] text-[#0b1c30] font-bold mt-0.5">
                        월 4회 (주 1회 정기 방문)
                      </span>
                      <span className="text-[13px] text-[#43474f] mt-1 leading-snug">
                        매주 화요일 오전 09:00 ~ 11:00 (협의 완료 후 일정 고정)
                      </span>
                    </div>
                  </div>
                </div>

                {/* 보유 전문 장비 및 정품 약품 구성 */}
                <div className="p-4 rounded-xl bg-[#eff4ff] flex flex-col gap-3 border border-[#e5eeff]">
                  <span className="text-[13px] text-[#00254a] font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[#006c4a]">cleaning_services</span>
                    보유 전문 장비 및 정품 약품 구성
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#0b1c30] text-[13px] font-medium">
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg shadow-2xs border border-[#e5eeff]/80">
                      <span className="w-2 h-2 rounded-full bg-[#006c4a] flex-shrink-0"></span>
                      <span>독일 프리미엄 카처(Kärcher) 고압 스팀기</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg shadow-2xs border border-[#e5eeff]/80">
                      <span className="w-2 h-2 rounded-full bg-[#006c4a] flex-shrink-0"></span>
                      <span>환경부 인증 독일 키엘(Kiehl) 친환경 살균약품</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg shadow-2xs border border-[#e5eeff]/80">
                      <span className="w-2 h-2 rounded-full bg-[#006c4a] flex-shrink-0"></span>
                      <span>산업용 헤파필터 건·습식 듀얼 집진기</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg shadow-2xs border border-[#e5eeff]/80">
                      <span className="w-2 h-2 rounded-full bg-[#006c4a] flex-shrink-0"></span>
                      <span>초미립자 피톤치드 편백 연무 분사 방역기</span>
                    </div>
                  </div>
                </div>

                {/* 파트너 전달 한마디 */}
                <div className="relative bg-[#e5eeff] rounded-2xl p-5 flex flex-col gap-2 border border-[#d3e4fe]">
                  <div className="flex items-center gap-2 text-[#00254a] text-[15px] font-bold">
                    <span className="material-symbols-outlined text-[20px] text-[#00254a]">chat_bubble</span>
                    파트너 전달 한마디
                  </div>
                  <p className="text-[14px] text-[#0b1c30] leading-relaxed mt-1 whitespace-pre-line font-normal">
                    &quot;{proposal.appealMsg}&quot;
                  </p>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#d3e4fe]/80 text-[#43474f] text-[12px] font-semibold">
                    <span className="material-symbols-outlined text-[16px] text-[#006c4a]">mark_chat_read</span>
                    <span>작업 후 10분 이내 카카오 알림톡 리포트 발송 보장</span>
                  </div>
                </div>
              </div>

              {/* ===============================================================
                  Section 2: 실제 시공 포트폴리오 (Before / After)
              =============================================================== */}
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_rgba(22,59,102,0.06)] border border-[#e5eeff] flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5eeff] pb-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <div className="w-2.5 h-6 bg-[#006c4a] rounded-full"></div>
                      <h2 className="text-[20px] text-[#00254a] font-extrabold">
                        실제 시공 포트폴리오 (Before / After)
                      </h2>
                    </div>
                    <p className="text-[13px] text-[#43474f] mt-1 font-medium">
                      일산동구 및 인근 유사 빌라 현장에서 직접 케어한 전/후 사례입니다.
                    </p>
                  </div>

                  {/* 탭 전환 버튼 */}
                  <div className="inline-flex p-1 bg-[#eff4ff] rounded-xl gap-1 self-start sm:self-center border border-[#e5eeff]">
                    <button
                      type="button"
                      onClick={() => setActiveTab('all')}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all ${
                        activeTab === 'all'
                          ? 'bg-white text-[#00254a] shadow-sm'
                          : 'text-[#43474f] hover:text-[#0b1c30]'
                      }`}
                    >
                      전체 비교 ({portfolios.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('floor')}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all ${
                        activeTab === 'floor'
                          ? 'bg-white text-[#00254a] shadow-sm'
                          : 'text-[#43474f] hover:text-[#0b1c30]'
                      }`}
                    >
                      대리석·바닥
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('details')}
                      className={`px-3 py-1.5 rounded-lg text-[13px] font-bold transition-all ${
                        activeTab === 'details'
                          ? 'bg-white text-[#00254a] shadow-sm'
                          : 'text-[#43474f] hover:text-[#0b1c30]'
                      }`}
                    >
                      창틀·세부구역
                    </button>
                  </div>
                </div>

                {/* 4 포트폴리오 그리드 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredPortfolios.map((item) => (
                    <div
                      key={item.portSeq}
                      className="bg-[#eff4ff] rounded-2xl p-4 flex flex-col gap-2.5 border border-[#e5eeff] group hover:shadow-md transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[14px] text-[#00254a] font-bold">{item.title}</span>
                        <span className="text-[12px] text-[#737780] font-medium">시공 완료</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 relative rounded-xl overflow-hidden h-44 shadow-inner">
                        {/* Before */}
                        <div className="relative w-full h-full group/before overflow-hidden bg-gray-200">
                          <img
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/before:scale-105"
                            src={item.beforeImgUrl}
                            alt={`${item.title} 시공 전`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&auto=format&fit=crop&q=80';
                            }}
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#ba1a1a]/90 text-white text-[11px] font-bold shadow-md">
                            BEFORE
                          </span>
                        </div>

                        {/* After */}
                        <div className="relative w-full h-full group/after overflow-hidden bg-gray-200">
                          <img
                            className="w-full h-full object-cover transition-transform duration-300 group-hover/after:scale-105"
                            src={item.afterImgUrl}
                            alt={`${item.title} 시공 후`}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400&auto=format&fit=crop&q=80';
                            }}
                          />
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-[#006c4a] text-white text-[11px] font-bold shadow-md">
                            AFTER
                          </span>
                        </div>
                      </div>

                      <p className="text-[12px] text-[#43474f] font-medium leading-relaxed mt-0.5">
                        {item.portSeq === 1 && '1층 현관 진입부 찌든 오염 고압 수세 및 친환경 중성 광택 복원 완료'}
                        {item.portSeq === 2 && '1~4층 전 구간 핸드레일 140도 고온 스팀 및 유해세균 알코올 방역'}
                        {item.portSeq === 3 && '혼재된 비닐/박스 완벽 분류 및 주차장 바닥 물청소 스위핑'}
                        {item.portSeq === 4 && '틈새 전용 솔과 고진공 흡진 노즐을 통한 묵은 미세먼지 박멸'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* ===============================================================
                  Section 3: 파트너 보유 자격 및 안심 검증 내역
              =============================================================== */}
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_rgba(22,59,102,0.06)] border border-[#e5eeff] flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-[#e5eeff] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-6 bg-[#00254a] rounded-full"></div>
                    <h2 className="text-[20px] text-[#00254a] font-extrabold">
                      파트너 보유 자격 및 안심 검증 내역
                    </h2>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#82f5c1]/30 text-[#00714e] text-[11px] font-bold border border-[#82f5c1]/50">
                    검증 100% 완료
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 자격 1 */}
                  <div className="p-4 rounded-2xl bg-[#eff4ff] flex flex-col gap-2 border border-[#e5eeff]">
                    <div className="w-12 h-12 rounded-xl bg-white text-[#00254a] flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-[26px]">badge</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] text-[#00254a] font-bold">위생관리용역업 등록</span>
                      <span className="text-[12px] text-[#43474f] mt-1 leading-snug">
                        고양시 일산동구청 정식 인허가 등록 (등록번호: 제2019-3950호)
                      </span>
                    </div>
                    <div className="mt-auto pt-3 flex items-center gap-1 text-[#006c4a] text-[12px] font-bold">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      공식 인허가 확인됨
                    </div>
                  </div>

                  {/* 자격 2 */}
                  <div className="p-4 rounded-2xl bg-[#eff4ff] flex flex-col gap-2 border border-[#e5eeff]">
                    <div className="w-12 h-12 rounded-xl bg-white text-[#00254a] flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-[26px]">assured_workload</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] text-[#00254a] font-bold">영업배상책임보험</span>
                      <span className="text-[12px] text-[#43474f] mt-1 leading-snug">
                        DB손해보험 대인/대물 각 1억원 가입 증권 보관 완료
                      </span>
                    </div>
                    <div className="mt-auto pt-3 flex items-center gap-1 text-[#006c4a] text-[12px] font-bold">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      보험 유효 기간 유효
                    </div>
                  </div>

                  {/* 자격 3 */}
                  <div className="p-4 rounded-2xl bg-[#eff4ff] flex flex-col gap-2 border border-[#e5eeff]">
                    <div className="w-12 h-12 rounded-xl bg-white text-[#00254a] flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-[26px]">fingerprint</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] text-[#00254a] font-bold">신원 및 범죄경력 조회</span>
                      <span className="text-[12px] text-[#43474f] mt-1 leading-snug">
                        쓸고닦고 마스터 인증 기준 신원 및 무결점 실명 인증
                      </span>
                    </div>
                    <div className="mt-auto pt-3 flex items-center gap-1 text-[#006c4a] text-[12px] font-bold">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      안심 신원 보증 마스터
                    </div>
                  </div>
                </div>
              </div>

              {/* ===============================================================
                  Section 4: 실제 고객 이용 후기
              =============================================================== */}
              <div className="bg-white rounded-2xl p-6 md:p-8 shadow-[0_4px_20px_rgba(22,59,102,0.06)] border border-[#e5eeff] flex flex-col gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5eeff] pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-6 bg-[#00254a] rounded-full"></div>
                    <h2 className="text-[20px] text-[#00254a] font-extrabold">
                      실제 고객 이용 후기 ({partner.reviewCnt})
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[#43474f] font-semibold">정기관리 만족도</span>
                    <div className="flex items-center text-[#e49200]">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          star
                        </span>
                      ))}
                      <span className="text-[#0b1c30] font-extrabold ml-1.5 text-sm">5.0 / 5.0</span>
                    </div>
                  </div>
                </div>

                {/* 리뷰 목록 */}
                <div className="flex flex-col gap-4">
                  {recentReviews.map((rev, idx) => (
                    <div
                      key={rev.reviewSeq || idx}
                      className="p-5 rounded-2xl bg-[#eff4ff] flex flex-col gap-2 border border-[#e5eeff]"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full text-white text-[14px] flex items-center justify-center font-bold shadow-sm ${
                              idx % 3 === 0
                                ? 'bg-[#163b66]'
                                : idx % 3 === 1
                                ? 'bg-[#006c4a]'
                                : 'bg-[#00254a]'
                            }`}
                          >
                            {rev.maskedUserNm.charAt(0) || '고'}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[13px] text-[#0b1c30] font-bold">
                              {rev.maskedUserNm}
                            </span>
                            <span className="text-[11px] text-[#737780] font-medium">
                              {rev.cleanTypeNm}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <div className="flex text-[#e49200]">
                            {Array.from({ length: rev.rating || 5 }).map((_, sIdx) => (
                              <span
                                key={sIdx}
                                className="material-symbols-outlined text-[16px]"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                star
                              </span>
                            ))}
                          </div>
                          <span className="text-[11px] text-[#737780] mt-0.5">{rev.regDt}</span>
                        </div>
                      </div>

                      <p className="text-[14px] text-[#0b1c30] mt-2 leading-relaxed font-normal">
                        &quot;{rev.content}&quot;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* =================================================================
                우측 컬럼: Sticky Booking & Contract Confirmation Sidebar (4 cols)
            ================================================================= */}
            <div className="lg:col-span-4 sticky top-20 flex flex-col gap-4">
              
              {/* 청약 요약 및 계약 체결 카드 */}
              <div className="bg-white rounded-2xl p-6 shadow-[0_4px_24px_rgba(22,59,102,0.08)] border border-[#e5eeff] relative overflow-hidden">
                {/* 상단 태그 */}
                <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff]">
                  <span className="px-2.5 py-1 rounded-full bg-[#eff4ff] text-[#00254a] text-[11px] font-bold">
                    공정 01 청약 선택
                  </span>
                  <span className="text-[11px] text-[#006c4a] font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse"></span>
                    계약 가능 상태
                  </span>
                </div>

                <h3 className="text-[18px] text-[#00254a] font-black mt-3">
                  선택 공정 청약 요약
                </h3>
                <p className="text-[12px] text-[#43474f] mt-1 font-medium">
                  고객님의 요청 조건과 파트너의 공식 제안 내역입니다.
                </p>

                {/* 핵심 조건 요약 박스 */}
                <div className="mt-4 p-4 rounded-xl bg-[#eff4ff] flex flex-col gap-2.5 text-[13px] border border-[#e5eeff]">
                  <div className="flex justify-between items-center text-[#0b1c30]">
                    <span className="text-[#43474f] font-medium">대상 공정</span>
                    <span className="font-bold">공정 01 · 빌라 정기청소</span>
                  </div>
                  <div className="flex justify-between items-center text-[#0b1c30]">
                    <span className="text-[#43474f] font-medium">계약 기간</span>
                    <span className="font-semibold">3개월 (주 1회, 총 12회)</span>
                  </div>
                  <div className="flex justify-between items-center text-[#0b1c30]">
                    <span className="text-[#43474f] font-medium">방문 조건</span>
                    <span className="font-bold text-[#006c4a]">2인 1조 / 회당 2시간 정밀</span>
                  </div>
                  <div className="flex justify-between items-center text-[#0b1c30]">
                    <span className="text-[#43474f] font-medium">정기 방문 요일</span>
                    <span className="font-semibold">매주 화요일 (09:00 조율)</span>
                  </div>
                </div>

                {/* 금액 산출 세부 내역 */}
                <div className="mt-4 flex flex-col gap-2 text-[13px] pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[#43474f] font-medium">월 제안 용역비 (4회 기준)</span>
                    <span className="text-[16px] text-[#0b1c30] font-bold">
                      {monthlyBidAmt.toLocaleString()}원
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[#43474f]">
                    <span>총 3개월 용역비 (12회)</span>
                    <span className="font-medium">{totalServiceAmt.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between items-center text-[#43474f]">
                    <span className="flex items-center gap-1">
                      플랫폼 안심 데이터 이용료
                      <span
                        className="material-symbols-outlined text-[15px] text-[#737780] cursor-pointer"
                        title="청약 체결 및 보증보험 제공 수수료"
                        onClick={() => showToast('에스크로 보호 및 결제 보증 수수료 (VAT 포함)')}
                      >
                        info
                      </span>
                    </span>
                    <span className="font-medium">{dataFee.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between items-center text-[#006c4a] font-semibold">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">confirmation_number</span>
                      신규 빌라 지원 쿠폰
                    </span>
                    <span className="font-bold">- {couponDiscount.toLocaleString()}원</span>
                  </div>
                </div>

                {/* 이번 회차 결제 예정액 바 */}
                <div className="mt-5 pt-3 bg-[#e5eeff] rounded-xl p-4 flex items-baseline justify-between border border-[#d3e4fe]">
                  <div className="flex flex-col">
                    <span className="text-[12px] text-[#43474f] font-bold">이번 회차 결제 예정액</span>
                    <span className="text-[11px] text-[#737780]">VAT 포함 · 에스크로 보관</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[24px] text-[#00254a] font-black tracking-tight">
                      {totalDueNow.toLocaleString()}
                    </span>
                    <span className="text-[15px] text-[#00254a] font-bold ml-0.5">원</span>
                  </div>
                </div>

                {/* 액션 버튼 */}
                <div className="mt-5 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handleProceedContract}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#00254a] text-white text-[15px] font-bold flex items-center justify-center gap-2 hover:bg-[#163b66] transition-all active:scale-[0.98] shadow-md cursor-pointer"
                  >
                    <span>이 파트너와 계약 확정하기</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setChatModalOpen(true)}
                    className="w-full py-3 px-4 rounded-xl bg-[#eff4ff] text-[#00254a] text-[14px] font-bold flex items-center justify-center gap-2 hover:bg-[#e5eeff] transition-all border border-[#e5eeff] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#006c4a]">forum</span>
                    <span>1:1 파트너 안심 문의하기</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate('USER-QOT-00')}
                    className="py-2 text-center text-[#43474f] hover:text-[#0b1c30] text-[13px] font-semibold transition-colors cursor-pointer"
                  >
                    다른 파트너 견적과 비교하기
                  </button>
                </div>

                {/* SsulDak 보증 포인트 */}
                <div className="mt-5 pt-4 border-t border-[#e5eeff] flex flex-col gap-2.5 text-[12px] text-[#43474f]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[17px] text-[#006c4a]">verified</span>
                    <span>
                      <strong className="text-[#0b1c30]">에스크로 안심 결제</strong> (시공 확인 후 대금 지급)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[17px] text-[#006c4a]">cached</span>
                    <span>
                      <strong className="text-[#0b1c30]">100% 무상 재시공 보증제</strong> (불만족 시 24시간 내 대응)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[17px] text-[#006c4a]">description</span>
                    <span>
                      <strong className="text-[#0b1c30]">표준 전자계약서</strong> 법적 효력 보유 및 카톡 전송
                    </span>
                  </div>
                </div>
              </div>

              {/* 고객안심센터 카드 */}
              <div className="bg-[#eff4ff] rounded-2xl p-4 flex items-center gap-3.5 border border-[#e5eeff]">
                <div className="w-10 h-10 rounded-full bg-[#163b66] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[20px]">support_agent</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] text-[#00254a] font-bold">계약 전 궁금한 점이 있으신가요?</span>
                  <span className="text-[12px] text-[#43474f] mt-0.5">쓸고닦고 고객안심센터 1588-0000 (평일 09-18시)</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* =====================================================================
          3. 모바일 전용 하단 고정 네비게이션
      ===================================================================== */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#f8f9ff]/90 backdrop-blur-xl border-t border-[#e5eeff] shadow-[0_-4px_16px_rgba(22,59,102,0.06)] md:hidden">
        <div className="max-w-md mx-auto grid grid-cols-4 h-16">
          <button
            onClick={() => onNavigate && onNavigate('USER-COM-00')}
            className="flex flex-col items-center justify-center gap-0.5 text-[#43474f] hover:text-[#0b1c30] transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">home</span>
            <span className="text-[11px] font-semibold">홈</span>
          </button>
          <button
            onClick={() => onNavigate && onNavigate('USER-QOT-00')}
            className="flex flex-col items-center justify-center gap-0.5 text-[#00254a] font-bold transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">request_quote</span>
            <span className="text-[11px]">견적현황</span>
          </button>
          <button
            onClick={() => showToast('이용내역 화면 준비 중입니다.')}
            className="flex flex-col items-center justify-center gap-0.5 text-[#43474f] hover:text-[#0b1c30] transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">receipt_long</span>
            <span className="text-[11px] font-semibold">이용내역</span>
          </button>
          <button
            onClick={() => onNavigate && onNavigate('USER-ATH-03')}
            className="flex flex-col items-center justify-center gap-0.5 text-[#43474f] hover:text-[#0b1c30] transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">person</span>
            <span className="text-[11px] font-semibold">마이</span>
          </button>
        </div>
      </nav>

      {/* =====================================================================
          4. 1:1 파트너 안심 문의 모달 다이얼로그
      ===================================================================== */}
      {chatModalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-[#e5eeff] overflow-hidden flex flex-col h-[560px] animate-scaleUp">
            {/* 모달 헤더 */}
            <div className="p-4 bg-[#00254a] text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#163b66] border border-white/20 overflow-hidden flex items-center justify-center">
                  <img
                    src={partner.profileImgUrl}
                    alt={partner.companyNm}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold">{partner.companyNm}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#006c4a] text-white font-bold">
                      1:1 안심채팅
                    </span>
                  </div>
                  <span className="text-[11px] text-white/70">
                    {partner.ceoNm} 대표 · 개인 연락처 마스킹 보호 중
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatModalOpen(false)}
                className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>
            </div>

            {/* 안심 안내 배너 */}
            <div className="px-4 py-2 bg-[#eff4ff] text-[11px] text-[#43474f] flex items-center gap-1.5 border-b border-[#e5eeff]">
              <span className="material-symbols-outlined text-[15px] text-[#006c4a]">shield</span>
              <span>
                상호 개인정보 보호를 위해 전화번호/외부 메신저 공유는 계약 체결 후 제공됩니다.
              </span>
            </div>

            {/* 채팅 메시지 목록 */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8f9ff]">
              {chatMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-2xl text-[13px] leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#00254a] text-white rounded-br-none shadow-sm'
                        : 'bg-white text-[#0b1c30] rounded-bl-none shadow-sm border border-[#e5eeff]'
                    }`}
                  >
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-[#737780] mt-1 px-1">{msg.time}</span>
                </div>
              ))}
            </div>

            {/* 메시지 입력 폼 */}
            <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-[#e5eeff] flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="궁금하신 시공 조건이나 일정을 입력하세요..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#eff4ff] border border-transparent focus:border-[#00254a] text-[13px] text-[#0b1c30] outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#00254a] text-white text-[13px] font-bold hover:bg-[#163b66] transition-colors flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          5. 데스크탑 푸터
      ===================================================================== */}
      <footer className="hidden md:block w-full bg-[#eff4ff] mt-12 py-8 border-t border-[#e5eeff]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 flex flex-col md:flex-row justify-between items-center gap-4 text-[#43474f]">
          <div className="flex items-center gap-3">
            <span className="text-[17px] text-[#00254a] font-bold">쓸고닦고 (SsulDak)</span>
            <span className="text-xs text-[#737780]">|</span>
            <span className="text-[13px]">전문 홈&amp;빌딩 클리닝 케어 솔루션 플랫폼</span>
          </div>
          <p className="text-[13px]">
            © 2026 SsulDak Inc. All rights reserved. 일산·수도권 공식 케어 센터
          </p>
        </div>
      </footer>
    </div>
  );
}
