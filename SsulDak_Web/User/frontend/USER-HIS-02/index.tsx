// SsulDak_Web/User/frontend/USER-HIS-02/index.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { TargetContractInfo } from '../../backend/api_USER_HIS_02/route';

interface UserHis02Props {
  userNo?: string;
  contractNo?: string;
  onNavigate?: (path: string, params?: Record<string, any>) => void;
}

export default function UserHis02({
  userNo = 'U20261000001',
  contractNo: initialContractNo = 'CT2026102100001',
  onNavigate,
}: UserHis02Props) {
  const [contractNo, setContractNo] = useState<string>(initialContractNo);
  const [contract, setContract] = useState<TargetContractInfo | null>(null);
  const [currentBalance, setCurrentBalance] = useState<number>(3000);
  const [loading, setLoading] = useState<boolean>(true);

  // 리뷰 입력 폼 상태
  const [rating, setRating] = useState<number>(5);
  const [selectedTags, setSelectedTags] = useState<string[]>([
    '구석구석 꼼꼼해요',
    '약속 시간을 잘 지켜요',
    '친절하고 설명이 자세해요',
    '뒤처리가 깔끔해요',
  ]);
  const [content, setContent] = useState<string>(
    '1회차 정기 청소인데 빌라 계단 난간 틈새와 1층 유리 출입문까지 손지문 하나 없이 완벽하게 반짝여서 입주민분들 모두 만족해하셨습니다! 이*수 마스터님께서 시간도 20분 일찍 도착하셔서 사전 점검 후 진행해 주셨고 사용하시는 세제도 은은한 피톤치드 향이라 상쾌합니다. 다음 달 2회차 일정도 잘 부탁드립니다.'
  );

  // 사진 첨부 슬롯 (최대 2장)
  const [photos, setPhotos] = useState<Array<{ url: string; title: string; size: string }>>([
    {
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBfjnTklHXsdH2_4iMLkNOuXHcjAQ4fv1nuZuU1yIQ0_vnhAYKCvGt3bnkttyYBtZ3FlKpJUbp9MUmMwf9lKHyLbgz0PHvoQCe_70Zzqmi4NoUrfWSg3sOwB6GwQHe9LGFhGvgBzMY1_qE3z5WqkwAigxvbMy5UT9v3ptOCVjX40FNBJe21Zh5SzpsJ5MfAus4-IBtnpuDmfV7x8vx9vkJhvMCDALsoTU4UKgzuEfbECob_kT0l9HPj',
      title: '계단 및 복도 린스 완료',
      size: '2.4 MB · JPG',
    },
    {
      url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4DI2rTyAVsKZ4pSeZrYdrh7UZ93GdUvShCCt1PD9K6Oa4JQCO6K1jRNF09oBBL9nzG2L09J4uVwgOwVyBAw16WeNWR5RswrDe1xUOMq6MsQXUb_yhk39kTiPGK6w8Z_zAT7ZQvL_-Z4kS8pClLdxyUmWQtttuVdLYiPlkqB7ZYAu2xkLQlOMDwhrvDoDPrTiVrJ-aIA_Nbz9hPUteSssaUHYYtTrzFg2pobeaJhv2VlGi2xQawLEV',
      title: '1층 현관문 및 유리창',
      size: '1.8 MB · PNG',
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 동의 옵션
  const [shareToProfile, setShareToProfile] = useState<boolean>(true);
  const [applyHallOfFame, setApplyHallOfFame] = useState<boolean>(true);

  // 모달 및 제출 상태
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [celebrationModal, setCelebrationModal] = useState<{
    show: boolean;
    rewardPoint: number;
    newBalance: number;
  }>({
    show: false,
    rewardPoint: 1000,
    newBalance: 4000,
  });

  // 토스트
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastVisible, setToastVisible] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  useEffect(() => {
    if (initialContractNo) {
      setContractNo(initialContractNo);
    }
  }, [initialContractNo]);

  // 대상 계약 정보 조회
  const fetchTargetContract = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/user_his_02', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userNo}_TOKEN`,
        },
        body: JSON.stringify({
          mode: 'GET_TARGET_CONTRACT',
          userNo,
          contractNo,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setContract(data.contract);
        if (data.currentBalance !== undefined) {
          setCurrentBalance(data.currentBalance);
        }
      } else {
        if (data.code === 'ALREADY_WRITTEN') {
          showToast('이미 리뷰 작성이 완료된 계약입니다.');
          setContract(data.contract);
        } else {
          showToast(data.message || '계약 정보를 조회하지 못했습니다.');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('네트워크 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [userNo, contractNo]);

  useEffect(() => {
    fetchTargetContract();
  }, [fetchTargetContract]);

  // 만족도 별점 텍스트
  const feedbackQuotes: Record<number, string> = {
    1: '“서비스가 매우 불만족스러웠어요. 개선이 필요합니다.”',
    2: '“아쉬운 부분이 다소 있었어요.”',
    3: '“보통이에요. 기본 시공 절차는 진행되었습니다.”',
    4: '“만족해요! 전반적으로 깨끗하게 시공되었습니다.”',
    5: '“매우 만족해요! 공간이 기대 이상으로 깨끗해졌어요.”',
  };

  // 태그 토글 핸들러
  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // 사진 삭제
  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    showToast('사진이 제거되었습니다.');
  };

  // 사진 추가 (파일 인풋 또는 샘플 추가)
  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length >= 2) {
      showToast('사진은 최대 2장까지 첨부할 수 있습니다.');
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setPhotos((prev) => [
        ...prev,
        {
          url,
          title: file.name.substring(0, 16),
          size: `${sizeMb} MB · ${file.type.split('/')[1]?.toUpperCase() || 'IMG'}`,
        },
      ]);
      showToast('사진이 추가되었습니다. (+1,000P 적립 대상)');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // 포인트 계산
  const isPhotoAttached = photos.length > 0;
  const rewardPoint = isPhotoAttached ? 1000 : 300;
  const estimatedNewBalance = currentBalance + rewardPoint;

  // 리뷰 제출
  const handleSubmitReview = async () => {
    const trimmed = content.trim();
    if (trimmed.length < 10) {
      showToast('상세 후기를 최소 10자 이상 작성해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/user/user_his_02', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userNo}_TOKEN`,
        },
        body: JSON.stringify({
          mode: 'SUBMIT_REVIEW',
          userNo,
          contractNo,
          rating,
          content: trimmed,
          cleanTypeNm: contract?.subItemNm || '정기청소',
          photoUrls: photos.map((p) => p.url),
          shareToProfile,
          applyHallOfFame,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCelebrationModal({
          show: true,
          rewardPoint: data.rewardPoint || rewardPoint,
          newBalance: data.newBalance || estimatedNewBalance,
        });
      } else {
        showToast(data.message || '리뷰 등록에 실패했습니다.');
      }
    } catch (err) {
      console.error(err);
      showToast('서버 통신 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f8f9ff] font-['Plus_Jakarta_Sans',sans-serif] text-[#0b1c30] antialiased min-h-screen flex flex-col">
      {/* ===================================================================== */}
      {/* HEADER BAR                                                            */}
      {/* ===================================================================== */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.05)] border-b border-[#e5eeff]">
        <div className="h-20 max-w-7xl mx-auto px-4 md:px-12 flex items-center justify-between">
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
              <span className="text-[13px] font-semibold text-[#0b1c30]">경기 고양시 일산동구</span>
              <span className="material-symbols-outlined text-[16px] text-[#737780]">keyboard_arrow_down</span>
            </button>
          </div>

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

          <div className="flex items-center gap-3">
            <button
              aria-label="알림"
              className="relative w-10 h-10 rounded-lg flex items-center justify-center text-[#43474f] hover:bg-[#e5eeff] transition-colors"
              type="button"
              onClick={() => showToast('새로운 알림이 없습니다.')}
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
      <main className="w-full pt-20 bg-[#f8f9ff] flex-1 pb-16">
        {/* Top Breadcrumb Bar */}
        <section className="w-full bg-[#eff4ff]/70 py-2.5 px-4 md:px-12 border-b border-[#e5eeff]">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[#43474f] text-[13px]">
              <a
                className="hover:text-[#00254a] transition-colors flex items-center gap-1 cursor-pointer"
                onClick={() => onNavigate ? onNavigate('home') : (window.location.hash = '#home')}
              >
                <span className="material-symbols-outlined text-[16px]">home</span>홈
              </a>
              <span className="text-[#c3c6d0]">/</span>
              <a
                className="hover:text-[#00254a] transition-colors cursor-pointer"
                onClick={() => onNavigate ? onNavigate('user-his-00') : (window.location.hash = '#history')}
              >
                이용내역
              </a>
              <span className="text-[#c3c6d0]">/</span>
              <a
                className="hover:text-[#00254a] transition-colors cursor-pointer"
                onClick={() => onNavigate ? onNavigate('user-his-01', { contractNo }) : (window.location.hash = `#inspection?contractNo=${contractNo}`)}
              >
                청소 진행 상세 (USER-HIS-01)
              </a>
              <span className="text-[#c3c6d0]">/</span>
              <span className="text-[#00254a] font-bold">시공 후기 작성</span>
            </nav>
            <div className="hidden sm:flex items-center gap-1.5 text-[#006c4a] text-[11px] font-bold bg-[#82f5c1]/30 px-3 py-1 rounded-full border border-[#82f5c1]">
              <span className="material-symbols-outlined text-[14px]">shield</span>
              100% 실 이용자 검수 후기 시스템
            </div>
          </div>
        </section>

        {/* Page Header */}
        <header className="w-full max-w-6xl mx-auto px-4 md:px-12 pt-6 pb-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <button
                  className="w-9 h-9 rounded-xl bg-[#e5eeff] flex items-center justify-center text-[#00254a] hover:bg-[#dce9ff] transition-colors active:scale-95 shadow-xs cursor-pointer"
                  type="button"
                  onClick={() => onNavigate ? onNavigate('user-his-01', { contractNo }) : (window.location.hash = `#inspection?contractNo=${contractNo}`)}
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <h1 className="text-2xl md:text-3xl font-extrabold text-[#00254a] tracking-tight">
                  서비스 시공 후기 작성
                </h1>
                <span className="px-2.5 py-1 rounded-full bg-[#82f5c1]/50 text-[#006c4a] text-[11px] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">bolt</span> 즉시 1,000P 적립
                </span>
              </div>
              <p className="text-[14px] text-[#43474f] pl-11">
                고객님의 솔직한 후기는 파트너 기사님과 다른 이웃 고객들에게 큰 힘이 됩니다.
              </p>
            </div>
            <div className="text-right hidden md:block">
              <span className="text-[11px] text-[#737780] uppercase tracking-wider block font-semibold">Target Service</span>
              <span className="text-[13px] font-bold text-[#00254a]">
                {contract?.subItemNm || '정기청소 패키지 1회차'}
              </span>
            </div>
          </div>
        </header>

        {/* 2-Column Main Content Container */}
        <div className="w-full max-w-6xl mx-auto px-4 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT COLUMN (Review Form - ~68%) */}
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* 1. Reward Promotion Hero Banner */}
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#006c4a]/10 via-[#e5eeff] to-[#82f5c1]/25 p-6 shadow-sm border border-[#82f5c1]/40">
              <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-[#006c4a]/10 blur-2xl pointer-events-none"></div>
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-[#006c4a] flex items-center justify-center text-white shadow-md shrink-0">
                  <span className="material-symbols-outlined text-[26px]">redeem</span>
                </div>
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full bg-[#006c4a] text-white text-[11px] font-bold">
                      즉시 적립 이벤트 진행 중
                    </span>
                    <span className="text-[#006c4a] text-[11px] font-bold flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[14px]">verified</span> 캐시백 혜택
                    </span>
                  </div>
                  <h2 className="text-[17px] text-[#00254a] font-bold leading-snug">
                    사진을 포함한 포토 리뷰를 작성하시면 즉시 현금성 1,000P를 적립해 드립니다!
                  </h2>
                  <ul className="mt-2 flex flex-col gap-1.5 text-[#43474f] text-[13px]">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a] shrink-0"></span>
                      <span>
                        포토 리뷰 작성 시 <strong className="text-[#00254a] font-bold">즉시 1,000P 지급</strong> (일반 텍스트 리뷰 작성 시 300P 지급)
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a] shrink-0"></span>
                      <span>
                        우수 리뷰어 매월 베스트 후기 선정 시 <strong className="text-[#006c4a] font-bold">10,000P 추가 증정</strong>
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a] shrink-0"></span>
                      <span>
                        적립된 포인트는 다음 회차 정기 청소 또는 가전 분해 세척 시 현금처럼 <strong className="text-[#00254a] font-bold">1P = 1원</strong> 바로 사용 가능
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 2. Completed Service Summary Card */}
            <section className="rounded-2xl bg-white p-6 shadow-sm border border-[#e5eeff]">
              <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006c4a] text-[20px]">task_alt</span>
                  <span className="text-[15px] text-[#00254a] font-bold">시공 완료 내역 확인</span>
                </div>
                <span className="text-[11px] text-[#737780] font-mono">
                  계약번호: {contract?.contractNo || contractNo}
                </span>
              </div>

              <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                <div className="flex flex-col gap-1">
                  <span className="text-[17px] text-[#00254a] font-bold">
                    {contract?.subItemNm || '정기청소 3개월 패키지 · 1회차 완료'}
                  </span>
                  <p className="text-[13px] text-[#43474f]">
                    1~4층 계단 및 공용 복도 고압수 린스 세척 · 현관 유리문 살균 케어
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-[#737780]">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-[#006c4a]">calendar_today</span>
                      2026.11.01 (일) 10:00 ~ 12:30
                    </span>
                    <span className="text-[#c3c6d0]">•</span>
                    <span className="text-[#006c4a] font-semibold">시공 완료 확정</span>
                  </div>
                </div>

                {/* Partner Profile Box */}
                <div className="rounded-xl bg-[#eff4ff] p-4 flex items-center justify-between gap-3 border border-[#e5eeff]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <img
                        className="w-12 h-12 rounded-xl object-cover shadow-xs"
                        alt="Partner cleaner"
                        src={contract?.profileImgUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuDV14IhPQZBjV-OtGVmnjUwBqRe99cwkzsYvALH8YQ2XIYZLRXAww1sv6hQYB8FR5UwlEQcr5T-OXsA6fytArypo3ER9_LtPkeUWo4EEqlvnIqIdEQ4ImxxCuJbSEHxwGdgihvA6LThkwUvanSA8i1-UmHxY8-Z99kdQ2cTxJt1uHE0TLPfCMqU-61MKAC5ZCIU9naJXMNo8jcJq5PQeROM-5biVkSA-PgB-Hr2xnmAGr9fs1I_yEuQ"}
                      />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#006c4a] text-white flex items-center justify-center">
                        <span className="material-symbols-outlined text-[10px]">check</span>
                      </div>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-bold text-[#00254a] truncate">
                          {contract?.companyNm || '반짝빌라클린'}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-[#ffddb8] text-[#2a1700] text-[10px] font-bold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[12px] text-[#2a1700]">verified</span> 마스터
                        </span>
                      </div>
                      <span className="text-[12px] text-[#43474f] truncate">
                        {contract?.ceoNm || '이*수'} 마스터 기사님
                      </span>
                      <span className="text-[11px] text-[#737780]">
                        총 {contract?.reviewCnt || 428}회 시공 · 평점 {contract?.avgRating?.toFixed(1) || '5.0'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-white text-[#00254a] text-[11px] font-bold shadow-xs border border-[#e5eeff]">
                      파트너 검증완료
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Rating Stars Input */}
            <section className="rounded-2xl bg-white p-6 shadow-sm border border-[#e5eeff] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[17px] text-[#00254a] font-bold">이번 시공 서비스는 어떠셨나요?</h3>
                  <p className="text-[13px] text-[#43474f]">별점을 클릭하여 만족도를 평가해 주세요.</p>
                </div>
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-[#e5eeff] text-[#00254a] text-[13px] font-bold">
                  <span className="text-[#e49200] text-[18px] font-extrabold">{rating}.0</span>
                  <span className="text-[#737780]">/ 5.0</span>
                </div>
              </div>

              {/* Large Star Interactive Row */}
              <div className="flex flex-col items-center justify-center py-4 bg-[#eff4ff]/60 rounded-xl border border-[#e5eeff]">
                <div className="flex items-center gap-2 cursor-pointer select-none">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      key={starVal}
                      aria-label={`${starVal}점`}
                      className="hover:scale-110 active:scale-95 transition-transform cursor-pointer"
                      type="button"
                      onClick={() => setRating(starVal)}
                    >
                      <span
                        className={`material-symbols-outlined text-[48px] ${
                          starVal <= rating ? 'text-[#ffb95f]' : 'text-[#c3c6d0]'
                        }`}
                        style={{ fontVariationSettings: starVal <= rating ? "'FILL' 1" : "'FILL' 0" }}
                      >
                        star
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-center">
                  <span className="text-[17px] font-bold text-[#00254a] transition-all">
                    {feedbackQuotes[rating]}
                  </span>
                </div>
              </div>

              {/* Quick Satisfaction Tag Pills */}
              <div className="flex flex-col gap-2 pt-1">
                <label className="text-[13px] text-[#43474f] font-semibold">
                  어떤 점이 특히 마음에 드셨나요? (복수 선택 가능)
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    '구석구석 꼼꼼해요',
                    '약속 시간을 잘 지켜요',
                    '친절하고 설명이 자세해요',
                    '뒤처리가 깔끔해요',
                    '전문 장비가 훌륭해요',
                    '가격대비 만족도가 높아요',
                  ].map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#00254a] text-white shadow-xs'
                            : 'bg-[#eff4ff] hover:bg-[#e5eeff] text-[#43474f]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isSelected ? 'check' : 'add'}
                        </span>
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* 4. Review Text Area */}
            <section className="rounded-2xl bg-white p-6 shadow-sm border border-[#e5eeff] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-[17px] text-[#00254a] font-bold" htmlFor="reviewTextarea">
                    상세 시공 후기 작성 <span className="text-[#ba1a1a] font-bold">*</span>
                  </label>
                  <span className="px-2 py-0.5 rounded bg-[#e5eeff] text-[#737780] text-[11px]">
                    최소 10자 이상 필수
                  </span>
                </div>
                <div className="text-[13px] text-[#737780]">
                  <span
                    className={`font-bold ${
                      content.length < 10 ? 'text-[#ba1a1a]' : 'text-[#006c4a]'
                    }`}
                  >
                    {content.length}
                  </span>{' '}
                  / 500자
                </div>
              </div>

              <div className="relative">
                <textarea
                  id="reviewTextarea"
                  rows={5}
                  maxLength={500}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="청소 품질, 시간 준수, 친절도에 대한 솔직한 후기를 최소 10자 이상 남겨주세요. 구체적인 경험을 들려주시면 파트너에게 큰 격려가 됩니다."
                  className="w-full rounded-xl bg-[#eff4ff]/70 focus:bg-white p-4 text-[#00254a] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#00254a]/20 transition-all resize-none placeholder:text-[#737780]/70 leading-relaxed border border-[#dce9ff]"
                />
              </div>

              {content.length < 10 && (
                <span className="text-[#ba1a1a] text-[11px] font-semibold">
                  * 상세 후기를 최소 10자 이상 입력해 주세요. (현재 {content.length}자)
                </span>
              )}

              <div className="p-3 rounded-lg bg-[#eff4ff] flex items-start gap-2 text-[#737780] text-[12px] border border-[#e5eeff]">
                <span className="material-symbols-outlined text-[18px] text-[#737780] shrink-0 mt-0.5">info</span>
                <span>
                  욕설, 비방, 개인정보(전화번호, 주소 등)가 포함된 후기는 사전 안내 없이 비공개 처리될 수 있으며, 사실과 다른 악의적 비방은 작성 제한 사유가 될 수 있습니다.
                </span>
              </div>
            </section>

            {/* 5. Photo Upload Slots (최대 2장, 1,000P 조건) */}
            <section className="rounded-2xl bg-white p-6 shadow-sm border border-[#e5eeff] flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-[17px] text-[#00254a] font-bold">현장 사진 첨부 (최대 2장)</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#006c4a] text-white text-[11px] font-bold flex items-center gap-1 shadow-xs">
                    <span className="material-symbols-outlined text-[13px]">add_a_photo</span>
                    포토 리뷰 1,000P 적립 대상
                  </span>
                </div>
                <div className="text-[13px] text-[#006c4a] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  사진 {photos.length}장 등록 ({photos.length}/2)
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAddPhoto}
              />

              {/* 2 Photo Slots Mosaic Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {photos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-xl overflow-hidden bg-[#e5eeff] h-56 shadow-xs flex flex-col justify-end border border-[#dce9ff]"
                  >
                    <img
                      className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      alt={`Review photo ${idx + 1}`}
                      src={photo.url}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#00254a]/80 via-transparent to-transparent"></div>

                    {/* Remove Button */}
                    <button
                      aria-label="사진 삭제"
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-[#213145]/70 hover:bg-[#213145] text-white flex items-center justify-center transition-all shadow-md active:scale-95 backdrop-blur-sm cursor-pointer"
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>

                    {/* Verification Tag */}
                    <div className="absolute top-3 left-3 px-2 py-1 rounded bg-[#006c4a]/90 text-white text-[11px] font-semibold flex items-center gap-1 backdrop-blur-sm">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                      슬롯 {idx + 1} 등록
                    </div>

                    {/* Bottom Meta */}
                    <div className="relative z-10 p-3 flex items-center justify-between text-white">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-[#85f8c4]">
                          {idx === 0 ? 'stairs' : 'door_front'}
                        </span>
                        <span className="text-[13px] font-bold">{photo.title}</span>
                      </div>
                      <span className="text-[11px] text-[#eff4ff]/90">{photo.size}</span>
                    </div>
                  </div>
                ))}

                {/* Empty Slot when photos < 2 */}
                {photos.length < 2 && (
                  <div
                    className="rounded-xl border-2 border-dashed border-[#dce9ff] hover:border-[#00254a] h-56 flex flex-col items-center justify-center gap-2.5 p-4 text-center cursor-pointer transition-colors bg-[#eff4ff]/40 hover:bg-[#eff4ff]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#dce9ff] text-[#00254a] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[28px]">add_photo_alternate</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-[#00254a]">
                        사진 추가하기 ({photos.length}/2)
                      </span>
                      <span className="text-[11px] text-[#737780] mt-0.5">
                        JPG, PNG 파일 (장당 최대 10MB)
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-md bg-[#82f5c1]/60 text-[#006c4a] text-[11px] font-bold mt-1">
                      +700P 추가 보너스 적립
                    </span>
                  </div>
                )}
              </div>

              {/* Tip Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-[#e5eeff]">
                <div className="flex items-center gap-2 text-[#43474f] text-[12px]">
                  <span className="material-symbols-outlined text-[#006c4a] text-[18px]">lightbulb</span>
                  <span>청소 전/후 비교 사진이나 깨끗해진 공간 사진을 올려주시면 포인트가 즉시 지급됩니다.</span>
                </div>
                <button
                  className="px-4 py-2 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#00254a] text-[13px] font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="material-symbols-outlined text-[18px]">cached</span>
                  사진 추가 / 순서 변경 ({photos.length}/2)
                </button>
              </div>
            </section>

          </div>

          {/* RIGHT COLUMN (Sticky Summary & Submit Panel - ~32%) */}
          <aside className="lg:col-span-4 flex flex-col gap-4 lg:sticky lg:top-24">

            {/* 1. Review Reward Summary Panel */}
            <section className="rounded-2xl bg-white p-6 shadow-sm border border-[#e5eeff] flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#e5eeff]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#006c4a] text-[22px]">monetization_on</span>
                  <h3 className="text-[17px] text-[#00254a] font-bold">리뷰 작성 혜택 요약</h3>
                </div>
                <span className="text-[11px] bg-[#82f5c1]/60 text-[#006c4a] px-2.5 py-0.5 rounded-full font-bold">
                  실시간 계산
                </span>
              </div>

              {/* Points Calculation Breakdown */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#43474f]">기본 텍스트 리뷰 (10자 이상)</span>
                  <span className="font-semibold text-[#00254a]">+300 P</span>
                </div>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#43474f] flex items-center gap-1">
                    포토 첨부 보너스 ({photos.length}장 완료)
                    {isPhotoAttached && (
                      <span className="material-symbols-outlined text-[#006c4a] text-[16px]">check_circle</span>
                    )}
                  </span>
                  <span className="font-semibold text-[#006c4a]">
                    {isPhotoAttached ? '+700 P' : '+0 P'}
                  </span>
                </div>

                <div className="h-px bg-[#e5eeff] my-1"></div>

                <div className="flex items-baseline justify-between">
                  <div className="flex flex-col">
                    <span className="text-[13px] text-[#00254a] font-bold">총 적립 예정 포인트</span>
                    <span className="text-[11px] text-[#737780]">작성 완료 즉시 지갑 적립</span>
                  </div>
                  <div className="flex items-baseline gap-1 text-[#006c4a]">
                    <span className="text-3xl font-extrabold tracking-tight">
                      {rewardPoint.toLocaleString()}
                    </span>
                    <span className="text-[17px] font-bold">P</span>
                  </div>
                </div>
              </div>

              {/* Wallet Point Transformation */}
              <div className="rounded-xl bg-[#eff4ff] p-4 flex flex-col gap-2 border border-[#e5eeff]">
                <span className="text-[11px] text-[#737780] uppercase tracking-wider font-semibold">
                  내 SsulDak 캐시 변동
                </span>
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-[#43474f]">현재 보유 포인트</span>
                  <span className="text-[#00254a] font-bold">{currentBalance.toLocaleString()} P</span>
                </div>
                <div className="flex items-center justify-center py-0.5 text-[#006c4a]">
                  <span className="material-symbols-outlined text-[18px]">south</span>
                </div>
                <div className="flex items-center justify-between text-[13px] bg-white p-2.5 rounded-lg shadow-xs border border-[#e5eeff]">
                  <span className="text-[#006c4a] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">bolt</span> 후기 등록 후 잔액
                  </span>
                  <span className="text-[#006c4a] font-extrabold text-[17px]">
                    {estimatedNewBalance.toLocaleString()} P
                  </span>
                </div>
              </div>

              {/* Partner Cheering & Hall of Fame Checkboxes */}
              <div className="flex flex-col gap-2 pt-1 border-t border-[#e5eeff]">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shareToProfile}
                    onChange={(e) => setShareToProfile(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-[#006c4a] focus:ring-[#006c4a] accent-[#006c4a] cursor-pointer"
                  />
                  <span className="text-[12px] text-[#00254a] font-medium leading-tight">
                    <strong>{contract?.companyNm || '반짝빌라클린'}</strong> 마스터님 프로필에 감사 후기로 공개 등록
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyHallOfFame}
                    onChange={(e) => setApplyHallOfFame(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded text-[#006c4a] focus:ring-[#006c4a] accent-[#006c4a] cursor-pointer"
                  />
                  <span className="text-[12px] text-[#43474f] leading-tight">
                    쓸고닦고 명예의 전당 베스트 후기 선정 응모 동의 (+10,000P 기회)
                  </span>
                </label>
              </div>

              {/* Bottom Main CTA & Actions */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={content.trim().length < 10 || isSubmitting}
                  onClick={handleSubmitReview}
                  className={`w-full h-[52px] rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] ${
                    content.trim().length < 10 || isSubmitting
                      ? 'bg-[#c3c6d0] text-white cursor-not-allowed'
                      : isPhotoAttached
                      ? 'bg-[#006c4a] hover:bg-[#005137] text-white cursor-pointer shadow-[#006c4a]/20'
                      : 'bg-[#00254a] hover:bg-[#163b66] text-white cursor-pointer'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin material-symbols-outlined text-[20px]">progress_activity</span>
                      포인트 지급 및 등록 중...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px]">card_giftcard</span>
                      {isPhotoAttached ? '1,000P 받고 리뷰 등록 완료하기' : '일반 리뷰 등록하기 (+300P)'}
                    </>
                  )}
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="py-2.5 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#43474f] text-[13px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    onClick={() => showToast('리뷰 내용이 임시 저장되었습니다.')}
                  >
                    <span className="material-symbols-outlined text-[16px]">save</span> 임시저장
                  </button>
                  <button
                    type="button"
                    className="py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#737780] text-[13px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    onClick={() => onNavigate ? onNavigate('user-his-00') : (window.location.hash = '#history')}
                  >
                    나중에 작성
                  </button>
                </div>
              </div>
            </section>

            {/* 2. SsulDak Clean Review Trust Box */}
            <section className="rounded-2xl bg-[#eff4ff]/80 p-4 shadow-xs flex flex-col gap-2.5 border border-[#e5eeff]">
              <div className="flex items-center gap-2 text-[#00254a]">
                <span className="material-symbols-outlined text-[#006c4a] text-[20px]">verified_user</span>
                <span className="text-[13px] font-bold">공정하고 투명한 클린 리뷰 정책</span>
              </div>
              <p className="text-[12px] leading-relaxed text-[#43474f]">
                쓸고닦고는 100% 실제 결제 및 시공 검수를 마친 인증 고객만 후기를 작성할 수 있는 안심 제도를 운영합니다.
              </p>
              <div className="flex items-center gap-2 text-[#737780] text-[11px] pt-1">
                <span className="material-symbols-outlined text-[15px] text-[#006c4a]">lock</span>
                <span>허위 리뷰 원천 차단 · 에스크로 정산 보호 시스템</span>
              </div>
            </section>

            {/* 3. Help Center Micro Card */}
            <div className="rounded-xl bg-white p-3.5 flex items-center justify-between text-[#737780] text-[12px] shadow-xs border border-[#e5eeff]">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">contact_support</span>
                작성 중 도움이 필요하신가요?
              </span>
              <a className="text-[#00254a] font-bold hover:underline" href="tel:1588-0000">
                고객센터 1588-0000
              </a>
            </div>

          </aside>
        </div>
      </main>

      {/* ===================================================================== */}
      {/* CELEBRATION MODAL ON SUBMISSION                                       */}
      {/* ===================================================================== */}
      {celebrationModal.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-[#e5eeff] flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#82f5c1]/50 text-[#006c4a] flex items-center justify-center ring-8 ring-[#82f5c1]/20">
              <span className="material-symbols-outlined text-[36px]">celebration</span>
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-xl font-bold text-[#00254a]">리뷰 작성이 완료되었습니다!</h3>
              <p className="text-[13px] text-[#43474f]">
                소중한 후기를 남겨주셔서 진심으로 감사드립니다.
              </p>
            </div>

            <div className="w-full p-4 rounded-xl bg-[#eff4ff] border border-[#dce9ff] flex items-center justify-between text-[14px]">
              <span className="text-[#43474f]">적립된 캐시백 포인트</span>
              <span className="text-[#006c4a] font-extrabold text-lg">
                +{celebrationModal.rewardPoint.toLocaleString()} P
              </span>
            </div>

            <div className="w-full flex items-center justify-between text-[12px] text-[#737780] px-2">
              <span>현재 총 보유 포인트</span>
              <span className="font-bold text-[#00254a]">
                {celebrationModal.newBalance.toLocaleString()} P
              </span>
            </div>

            <button
              type="button"
              className="w-full py-3.5 rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white text-[14px] font-bold transition-all shadow-md active:scale-98 cursor-pointer mt-2"
              onClick={() => {
                setCelebrationModal({ ...celebrationModal, show: false });
                if (onNavigate) {
                  onNavigate('user-his-00');
                } else {
                  window.location.hash = '#history';
                }
              }}
            >
              이용내역 확인하러 가기
            </button>
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
