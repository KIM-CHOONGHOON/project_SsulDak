import React, { useState, useEffect, useRef } from 'react';

export interface PortfolioItem {
  portSeq?: number | null;
  title: string;
  category?: string;
  beforeImgUrl: string;
  afterImgUrl: string;
  sortOrd?: number;
  regDate?: string;
}

export interface PartnerProfileData {
  ptnrNo: string;
  companyNm: string;
  ceoNm: string;
  bizRegNo: string;
  profileImgUrl?: string;
  shortIntro: string;
  introText: string;
  equipTags: string[];
  partnerCode: string;
  avgRating: number;
  totalWorkCnt: number;
  reviewTotalCnt: number;
  activeRegions: string;
  completionScore: number;
}

export interface PtnrDsh02Props {
  initialPtnrNo?: string;
  onNavigate?: (path: string) => void;
}

export const PtnrDsh02Screen: React.FC<PtnrDsh02Props> = ({
  initialPtnrNo = 'P20261000001',
  onNavigate
}) => {
  // ---------------------------------------------------------------------------
  // 상태 관리
  // ---------------------------------------------------------------------------
  const [ptnrNo] = useState<string>(initialPtnrNo);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 기본 프로필 정보
  const [profile, setProfile] = useState<PartnerProfileData>({
    ptnrNo: initialPtnrNo,
    companyNm: '반짝빌라클린',
    ceoNm: '이*수 대표',
    bizRegNo: '123-45-67890',
    profileImgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlBrDONJwlMcVAyZQRNAX9VCUIB31SHMspwkqxeUPxtacY803I8mcUA5ImNt0zXXUlJ8liP-hp7KrJcwxQtzQbaIDMxqrUQ5WOsW7xBMDcp_FAlfDFvqSbnwxtZb8Yu-Q6YmftbRACENxMY_L58mx1x7xQGwLsKxn51Jng6KYsUsqllVbcpKBTUnsJO3QlGmBxCRkYr8lg3NDHxPliRn0N5DO89gGMqbcJzwk15lM3ws-UU48Nq7qo',
    shortIntro: '7년 경력 빌라 계단 및 상가 공용부 정기관리 전문 파트너 반짝빌라클린입니다.',
    introText: '저희 반짝빌라클린은 7년간 고양시 및 파주시 일대의 다세대 빌라, 꼬마빌딩, 상가 건물의 정기 계단청소 및 특수 위생 관리를 전문으로 수행해 온 베테랑 팀입니다.\n\n[주요 시공 원칙]\n1. 친환경 천연 인증 세제 100% 사용 (독일 친환경 에코서트 인증 약품, 유독성 락스 지양)\n2. 공용부 바닥 특수 코팅 및 고압 스팀 살균으로 묵은 찌든 때 원천 제거\n3. 시공 당일 전/후 고화질 사진 및 관리 점검표 고객 안심 보고서 100% 발송\n4. 5억원 한도 영업배상책임보험 가입으로 시설물 하자 안심 보장',
    equipTags: [
      '독일산 크란즐 고압스팀기 (150bar)',
      '산업용 헤파필터 집진기',
      '초미립자 살균소독분무기 (ULV)',
      '보네트 저소음 바닥광택기',
      '유리창 전용 이온수 폴대시스템',
      '에코라벨 인증 중성세제 키트'
    ],
    partnerCode: 'PT-88204-ILSAN',
    avgRating: 4.96,
    totalWorkCnt: 284,
    reviewTotalCnt: 284,
    activeRegions: '경기 고양시 일산동구/서구, 파주시 전역',
    completionScore: 92
  });

  // 태그 입력
  const [newTagInput, setNewTagInput] = useState<string>('');

  // 포트폴리오 목록
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);

  // 모달 제어
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [showAddPortModal, setShowAddPortModal] = useState<boolean>(false);
  const [showHotlineModal, setShowHotlineModal] = useState<boolean>(false);

  // 신규 포트폴리오 등록 폼 상태
  const [newPortTitle, setNewPortTitle] = useState<string>('');
  const [newPortCategory, setNewPortCategory] = useState<string>('정기청소 (계단)');
  const [newPortBeforeImg, setNewPortBeforeImg] = useState<string>('');
  const [newPortAfterImg, setNewPortAfterImg] = useState<string>('');

  // 파일 업로드 ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // ---------------------------------------------------------------------------
  // 데이터 로딩
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/partner/ptnr_dsh_02', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'GET_PROFILE_DATA', ptnrNo })
        });
        const result = await res.json();
        if (result.success && result.profile) {
          setProfile(result.profile);
          if (result.portfolios && Array.isArray(result.portfolios)) {
            setPortfolios(result.portfolios);
          }
        }
      } catch (err) {
        console.warn('프로필 로딩 실패, 기본값 유지:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [ptnrNo]);

  // ---------------------------------------------------------------------------
  // 태그 관리 핸들러
  // ---------------------------------------------------------------------------
  const handleAddTag = (tagToAdd?: string) => {
    const tag = (tagToAdd || newTagInput).trim();
    if (!tag) return;
    if (profile.equipTags.includes(tag)) {
      showToast('이미 등록된 장비/약품 태그입니다.');
      return;
    }
    if (profile.equipTags.length >= 10) {
      showToast('보유 장비 태그는 최대 10개까지 등록 가능합니다.');
      return;
    }

    const updated = [...profile.equipTags, tag];
    setProfile({ ...profile, equipTags: updated });
    setNewTagInput('');
    showToast(`'${tag}' 태그가 추가되었습니다.`);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = profile.equipTags.filter((t) => t !== tagToRemove);
    setProfile({ ...profile, equipTags: updated });
    showToast(`'${tagToRemove}' 태그가 삭제되었습니다.`);
  };

  // ---------------------------------------------------------------------------
  // 포트폴리오 관리 핸들러
  // ---------------------------------------------------------------------------
  const handleRemovePortfolio = (index: number) => {
    if (window.confirm('해당 시공 전/후 포트폴리오를 삭제하시겠습니까?')) {
      const target = portfolios[index];
      const updated = portfolios.filter((_, i) => i !== index);
      setPortfolios(updated);
      showToast(`'${target.title}' 포트폴리오가 삭제되었습니다.`);
    }
  };

  const handleSaveNewPortfolio = () => {
    if (!newPortTitle.trim()) {
      showToast('포트폴리오 시공 제목을 입력해 주세요.');
      return;
    }
    if (!newPortBeforeImg.trim()) {
      showToast('시공 전(Before) 사진 URL 또는 이미지를 입력해 주세요.');
      return;
    }
    if (!newPortAfterImg.trim()) {
      showToast('시공 후(After) 사진 URL 또는 이미지를 입력해 주세요.');
      return;
    }
    if (portfolios.length >= 12) {
      showToast('포트폴리오는 최대 12개까지만 등록 가능합니다.');
      return;
    }

    const newItem: PortfolioItem = {
      portSeq: Date.now(),
      title: newPortTitle.trim(),
      category: newPortCategory,
      beforeImgUrl: newPortBeforeImg.trim(),
      afterImgUrl: newPortAfterImg.trim(),
      sortOrd: portfolios.length + 1,
      regDate: new Date().toISOString().split('T')[0].replace(/-/g, '.')
    };

    setPortfolios([...portfolios, newItem]);
    setShowAddPortModal(false);
    setNewPortTitle('');
    setNewPortBeforeImg('');
    setNewPortAfterImg('');
    showToast('새 시공 전/후 비교 포트폴리오가 추가되었습니다.');
  };

  // 아바타 사진 변경 시뮬레이션
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProfile({ ...profile, profileImgUrl: reader.result as string });
        showToast('대표 프로필 사진이 변경되었습니다. 하단에서 저장해 주세요.');
      };
      reader.readAsDataURL(file);
    }
  };

  // ---------------------------------------------------------------------------
  // 일괄 저장 핸들러
  // ---------------------------------------------------------------------------
  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const payload = {
        mode: 'SAVE_PROFILE_DATA',
        ptnrNo,
        shortIntro: profile.shortIntro,
        introText: profile.introText,
        equipTags: profile.equipTags,
        profileImgUrl: profile.profileImgUrl,
        portfolioList: portfolios
      };

      const res = await fetch('/api/partner/ptnr_dsh_02', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setSaveSuccess(true);
        if (data.profile) setProfile({ ...profile, ...data.profile });
        showToast('프로필 및 포트폴리오가 안전하게 저장되었습니다. (즉시 고객 화면 반영)');
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        showToast(data.message || '저장 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('저장 에러:', err);
      showToast('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const navigateTo = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.hash = path;
    }
  };

  return (
    <div className="bg-background font-body-md text-on-surface antialiased min-h-screen">
      {/* 토스트 알림 */}
      {toastMessage && (
        <div className="fixed bottom-24 right-8 z-[100] max-w-md bg-inverse-surface text-inverse-on-surface px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-outline-variant/30 animate-bounce">
          <span className="material-symbols-outlined text-secondary text-[22px]">info</span>
          <span className="font-label-md text-label-md">{toastMessage}</span>
        </div>
      )}

      {/* 숨은 파일 업로드 인풋 */}
      <input 
        type="file" 
        ref={avatarInputRef} 
        onChange={handleAvatarChange} 
        accept="image/*" 
        className="hidden" 
      />

      {/* 상단 GNB */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.06)]">
        <div className="h-20 w-full px-margin-desktop flex items-center justify-between gap-space-lg">
          <div className="flex items-center gap-space-lg">
            <div 
              className="flex items-center gap-space-sm cursor-pointer"
              onClick={() => navigateTo('partner-dashboard')}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[26px]">cleaning_services</span>
                <span className="font-headline-sm text-headline-sm font-bold text-primary tracking-tight">SsulDak</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-label-sm text-label-sm uppercase tracking-wider">
                PARTNER CONSOLE
              </span>
            </div>
            <div className="h-6 w-px bg-outline-variant/40 hidden xl:block"></div>
            <div className="hidden xl:flex items-center gap-space-sm bg-surface-container-low px-3 py-1.5 rounded-xl">
              <span className="font-label-md text-label-md text-on-surface">{profile.companyNm}</span>
              <div className="flex items-center gap-1.5 bg-surface-container-lowest px-2.5 py-1 rounded-full shadow-[0_1px_4px_rgba(22,59,102,0.04)]">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <span className="font-label-sm text-label-sm text-secondary font-bold">영업 중 (ON)</span>
              </div>
            </div>
          </div>

          <nav className="flex items-center gap-space-xs">
            <button 
              className="px-space-md py-space-sm rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
              onClick={() => navigateTo('partner-dashboard')}
              type="button"
            >
              홈
            </button>
            <button 
              className="px-space-md py-space-sm rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
              onClick={() => navigateTo('partner-orders')}
              type="button"
            >
              공고목록 / 오더수신
            </button>
            <button 
              className="px-space-md py-space-sm rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
              onClick={() => navigateTo('partner-jobs')}
              type="button"
            >
              작업관리 / 시공보고
            </button>
            <button 
              className="px-space-md py-space-sm rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all"
              onClick={() => navigateTo('partner-settlement')}
              type="button"
            >
              정산/혜택관리
            </button>
            <button 
              className="px-space-md py-space-sm rounded-lg font-label-md transition-all bg-primary-container text-on-primary font-bold shadow-xs"
              onClick={() => navigateTo('partner-profile-settings')}
              type="button"
            >
              프로필/지역설정
            </button>
          </nav>

          <div className="flex items-center gap-space-md">
            <div className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-low">
              <span className="material-symbols-outlined text-secondary text-[18px]">headset_mic</span>
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm text-on-surface-variant leading-none">긴급 핫라인</span>
                <span className="font-label-md text-label-md text-on-surface font-bold">1588-0000</span>
              </div>
            </div>

            <div 
              className="relative flex items-center justify-center p-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface cursor-pointer transition-all"
              onClick={() => showToast('신규 매칭 대기 알림 4건이 대기 중입니다.')}
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error font-label-sm text-[10px] flex items-center justify-center font-bold">
                4
              </span>
            </div>

            <div className="h-6 w-px bg-outline-variant/40 hidden sm:block"></div>

            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-sm">
                이
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="font-label-md text-label-md text-on-surface font-bold leading-tight">이수 대표</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant leading-tight">마스터 파트너</span>
              </div>
              <button 
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
                title="로그아웃"
                type="button"
                onClick={() => navigateTo('partner-login')}
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 영역 */}
      <main className="w-full pt-20 bg-background min-h-screen">
        <div className="w-full px-4 sm:px-6 lg:px-margin-desktop py-space-lg flex flex-col gap-space-xl max-w-[1440px] mx-auto">
          
          {/* Breadcrumb & 상단 서브헤더 */}
          <section className="flex flex-col gap-space-sm pb-space-md">
            <div className="flex flex-wrap items-center justify-between gap-space-sm text-on-surface-variant font-label-sm text-label-sm">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigateTo('partner-dashboard')}
                  className="inline-flex items-center gap-1 font-label-md text-label-md text-primary font-bold hover:underline transition-all"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  파트너 대시보드로 돌아가기
                </button>
                <span className="text-outline-variant">/</span>
                <span>홈</span>
                <span className="text-outline-variant">&gt;</span>
                <span>대시보드 (PTNR-DSH-00)</span>
                <span className="text-outline-variant">&gt;</span>
                <span>파트너 프로필/지역 설정</span>
                <span className="text-outline-variant">&gt;</span>
                <span className="text-primary font-bold">프로필 및 포트폴리오 관리</span>
              </div>

              {/* 실시간 상태 배지 */}
              <div className="flex items-center gap-2 bg-surface-container-low px-3 py-1.5 rounded-full shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                </span>
                <span className="font-label-sm text-label-sm text-on-surface font-semibold">실시간 고객 노출 중</span>
                <span className="text-outline-variant">|</span>
                <span className="text-on-surface-variant font-body-sm text-[11px]">최근 수정: 오늘 11:20</span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md pt-space-xs">
              <div className="flex flex-col gap-1 max-w-3xl">
                <div className="flex items-center gap-2.5">
                  <h1 className="font-display text-display font-extrabold text-primary tracking-tight">
                    파트너 프로필 및 포트폴리오 관리
                  </h1>
                  <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">verified</span> 공인 마스터
                  </span>
                </div>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  고객에게 공개되는 공식 프로필과 시공 포트폴리오를 관리합니다. 매력적인 소개와 시공 전/후 사진은 견적 수주율을 <strong className="text-secondary font-bold">최대 45% 향상</strong>시킵니다.
                </p>
              </div>

              <div className="flex items-center gap-space-sm shrink-0">
                <button 
                  onClick={() => setShowPreviewModal(true)}
                  className="inline-flex items-center gap-2 px-space-md py-2.5 rounded-xl bg-surface-container-lowest text-primary font-label-md text-label-md font-bold shadow-sm hover:bg-surface-container-low transition-all border border-outline-variant/30"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">preview</span>
                  고객에게 보이는 프로필 미리보기
                </button>
              </div>
            </div>
          </section>

          {/* 메인 2열 그리드 레이아웃 (좌측 8열 폼, 우측 4열 인텔리전스 및 모바일 시뮬레이터) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start pb-24">
            
            {/* 좌측 메인 폼 (8 Columns) */}
            <div className="lg:col-span-8 flex flex-col gap-space-xl min-w-0">
              
              {/* SECTION 1: 기본 프로필 및 대표 소개 */}
              <section className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-lg relative overflow-hidden border border-outline-variant/20">
                <div className="flex items-center justify-between pb-space-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-6 rounded-full bg-primary-container"></span>
                    <h2 className="font-headline-md text-headline-md font-bold text-primary">
                      기본 프로필 및 대표 소개
                    </h2>
                  </div>
                  <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container-low px-2.5 py-1 rounded-full">
                    파트너 고유코드: <span className="font-mono text-primary font-bold">{profile.partnerCode}</span>
                  </span>
                </div>

                {/* 프로필 사진 & 사업자 정보 행 */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-center bg-surface-container-low p-space-md rounded-xl border border-outline-variant/30">
                  {/* 아바타 업로드 영역 (4 cols) */}
                  <div className="md:col-span-4 flex flex-col items-center sm:flex-row md:flex-col gap-space-md text-center sm:text-left md:text-center">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-md bg-surface-container-high flex items-center justify-center border-2 border-surface-container-lowest">
                        <img 
                          src={profile.profileImgUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlBrDONJwlMcVAyZQRNAX9VCUIB31SHMspwkqxeUPxtacY803I8mcUA5ImNt0zXXUlJ8liP-hp7KrJcwxQtzQbaIDMxqrUQ5WOsW7xBMDcp_FAlfDFvqSbnwxtZb8Yu-Q6YmftbRACENxMY_L58mx1x7xQGwLsKxn51Jng6KYsUsqllVbcpKBTUnsJO3QlGmBxCRkYr8lg3NDHxPliRn0N5DO89gGMqbcJzwk15lM3ws-UU48Nq7qo'} 
                          alt="파트너 대표 사진" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-md" title="국세청 사업자인증 완료">
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 items-center sm:items-start md:items-center">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => avatarInputRef.current?.click()}
                          className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-primary font-label-sm text-label-sm font-bold shadow-xs hover:bg-surface-container-high transition-colors border border-outline-variant/30" 
                          type="button"
                        >
                          사진 변경
                        </button>
                        <button 
                          onClick={() => {
                            setProfile({ ...profile, profileImgUrl: '' });
                            showToast('대표 프로필 사진이 기본 아이콘으로 초기화되었습니다.');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-error font-label-sm text-label-sm font-medium shadow-xs hover:bg-error-container transition-colors border border-outline-variant/30" 
                          type="button"
                        >
                          삭제
                        </button>
                      </div>
                      <p className="font-body-sm text-[11px] text-on-surface-variant leading-tight">
                        JPG/PNG 10MB 이하<br/>권장 800x800px 정방형
                      </p>
                    </div>
                  </div>

                  {/* 사업자 고정 인증 정보 (8 cols) */}
                  <div className="md:col-span-8 flex flex-col gap-2.5 bg-surface-container-lowest p-space-md rounded-lg shadow-xs border border-outline-variant/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-headline-sm text-headline-sm font-bold text-primary">
                          {profile.companyNm}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-bold">
                          인증 파트너
                        </span>
                      </div>
                      <span className="flex items-center gap-1 font-label-sm text-[11px] text-on-surface-variant bg-surface-container-low px-2 py-1 rounded">
                        <span className="material-symbols-outlined text-[13px] text-outline">lock</span> 법인/사업자 고정 정보
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-on-surface-variant font-body-sm text-body-sm pt-1">
                      <div>대표자명: <strong className="text-on-surface font-semibold">{profile.ceoNm}</strong></div>
                      <div>사업자등록번호: <span className="font-mono text-on-surface font-semibold">{profile.bizRegNo}</span></div>
                      <div>서비스 주력권역: <strong className="text-on-surface font-semibold">{profile.activeRegions}</strong></div>
                      <div>가입 상태: <span className="text-secondary font-bold">국세청 실명 인증 완료 (정상)</span></div>
                    </div>
                  </div>
                </div>

                {/* 대표 한 줄 소개 인풋 */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-label-md text-label-md text-primary font-bold flex items-center gap-1.5" htmlFor="catchphrase-input">
                      대표 한 줄 소개
                      <span className="material-symbols-outlined text-[15px] text-secondary">tips_and_updates</span>
                    </label>
                    <span className="font-mono font-label-sm text-label-sm text-on-surface-variant">
                      <span className={`font-bold ${profile.shortIntro.length > 50 ? 'text-error' : 'text-primary'}`}>
                        {profile.shortIntro.length}
                      </span> / 50자 (최대 60자)
                    </span>
                  </div>
                  <input 
                    id="catchphrase-input"
                    type="text"
                    maxLength={60}
                    value={profile.shortIntro}
                    onChange={(e) => setProfile({ ...profile, shortIntro: e.target.value })}
                    className="w-full px-space-md py-3 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary transition-all border border-outline-variant/30"
                    placeholder="고객의 눈길을 사로잡을 한 줄 핵심 전문성을 작성하세요."
                  />
                </div>

                {/* 상세 전문 소개 텍스트영역 */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label className="font-label-md text-label-md text-primary font-bold" htmlFor="detailed-intro">
                      상세 전문 소개 및 시공 원칙
                    </label>
                    <span className="font-mono font-label-sm text-label-sm text-on-surface-variant">
                      <span className={`font-bold ${profile.introText.length > 1000 ? 'text-error' : 'text-primary'}`}>
                        {profile.introText.length}
                      </span> / 1,000자
                    </span>
                  </div>
                  <textarea 
                    id="detailed-intro"
                    rows={7}
                    maxLength={1000}
                    value={profile.introText}
                    onChange={(e) => setProfile({ ...profile, introText: e.target.value })}
                    className="w-full p-space-md rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary transition-all leading-relaxed resize-none border border-outline-variant/30"
                    placeholder="보유 전문 기술, 약품 및 장비 원칙, 안심 A/S 정책을 고객 관점에서 상세히 기술해 주세요."
                  />
                  <div className="flex items-center gap-1.5 text-on-surface-variant font-body-sm text-[12px] pt-1">
                    <span className="material-symbols-outlined text-[15px] text-secondary">info</span>
                    전문 장비명, 친환경 인증 약품, 하자 보증 기간을 구체적으로 명시하면 고객 상담 전환율이 약 35% 증가합니다.
                  </div>
                </div>
              </section>

              {/* SECTION 2: 보유 전문 장비 및 약품 태그 관리 */}
              <section className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md border border-outline-variant/20">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-6 rounded-full bg-secondary"></span>
                      <h2 className="font-headline-md text-headline-md font-bold text-primary">
                        보유 전문 장비 및 친환경 약품 인증 태그
                      </h2>
                    </div>
                    <span className="font-label-sm text-label-sm text-secondary font-bold bg-secondary-container/40 px-2.5 py-1 rounded-full">
                      {profile.equipTags.length}개 장비 인증 등록됨 (최대 10개)
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    보유 중인 고성능 장비와 친환경 인증 약품 태그를 등록하세요. 고객 견적서 및 프로필에 전문 인증 뱃지로 노출됩니다.
                  </p>
                </div>

                {/* 등록된 태그 목록 */}
                <div className="flex flex-wrap gap-2.5 p-space-md bg-surface-container-low rounded-xl min-h-[64px] items-center border border-outline-variant/30">
                  {profile.equipTags.map((tag, idx) => (
                    <div 
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-lowest text-primary font-label-md text-label-md shadow-xs border border-outline-variant/30 group"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">
                        {tag.includes('세제') || tag.includes('에코') ? 'eco' : tag.includes('살균') || tag.includes('분무') ? 'sanitizer' : 'build'}
                      </span>
                      <span>{tag}</span>
                      <button 
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-on-surface-variant hover:text-error transition-colors"
                        type="button"
                        title="태그 삭제"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                  {profile.equipTags.length === 0 && (
                    <span className="text-on-surface-variant text-sm">등록된 장비 태그가 없습니다. 아래에서 추가해 주세요.</span>
                  )}
                </div>

                {/* 태그 입력 및 추가 버튼 */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-3.5 top-3 text-[18px] text-outline">build</span>
                      <input 
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddTag();
                          }
                        }}
                        className="w-full pl-10 pr-space-md py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-primary transition-all border border-outline-variant/30"
                        placeholder="장비명 또는 인증 약품 입력 (예: 고온 스팀기, 친환경 오존탈취기)"
                      />
                    </div>
                    <button 
                      onClick={() => handleAddTag()}
                      className="px-space-md py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold shadow-sm hover:bg-primary-container transition-all flex items-center gap-1.5 shrink-0"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      장비 태그 추가
                    </button>
                  </div>

                  {/* 추천 빠른 추가 칩들 */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">추천 빠른 추가:</span>
                    {[
                      '피톤치드 연무기',
                      '휠체어 리프트 소독기',
                      '오존 살균 탈취기',
                      '산업용 카펫 습식 청소기',
                      '외벽 로프 안전장구 세트'
                    ].map((recTag) => (
                      <button
                        key={recTag}
                        onClick={() => handleAddTag(recTag)}
                        type="button"
                        className="px-2.5 py-1 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm transition-colors flex items-center gap-1 border border-outline-variant/30"
                      >
                        <span className="material-symbols-outlined text-[13px] text-secondary">add</span>
                        {recTag}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              {/* SECTION 3: 시공 전/후 포트폴리오 갤러리 관리 */}
              <section className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-lg border border-outline-variant/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-6 rounded-full bg-primary"></span>
                      <h2 className="font-headline-md text-headline-md font-bold text-primary">
                        시공 전/후 비교 갤러리 (Before &amp; After)
                      </h2>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      등록된 포트폴리오 <strong className="text-primary font-bold">{portfolios.length}개</strong> / 최대 12개 등록 가능
                    </p>
                  </div>

                  <button 
                    onClick={() => setShowAddPortModal(true)}
                    className="inline-flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md font-bold shadow-sm hover:opacity-95 transition-all self-start sm:self-auto"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                    + 신규 시공 전/후 사진 등록
                  </button>
                </div>

                {/* 포트폴리오 카드 그리드 (2열) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                  {portfolios.map((item, idx) => (
                    <div 
                      key={idx}
                      className="bg-surface-container-low rounded-xl overflow-hidden p-3.5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all border border-outline-variant/30"
                    >
                      {/* 분할 이미지 컨테이너 */}
                      <div className="relative w-full h-44 rounded-lg overflow-hidden flex bg-surface-container">
                        <div className="w-1/2 h-full relative overflow-hidden">
                          <img 
                            src={item.beforeImgUrl} 
                            alt={`${item.title} 시공 전`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-on-surface/80 backdrop-blur-xs text-surface-container-lowest font-label-sm text-[10px] font-bold tracking-wider">
                            BEFORE
                          </span>
                        </div>
                        <div className="w-1/2 h-full relative overflow-hidden">
                          <img 
                            src={item.afterImgUrl} 
                            alt={`${item.title} 시공 후`}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-secondary text-on-secondary font-label-sm text-[10px] font-bold tracking-wider">
                            AFTER
                          </span>
                        </div>
                        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-surface-container-lowest shadow"></div>
                      </div>

                      {/* 메타데이터 & 타이틀 */}
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-1">
                          {idx === 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-[11px] font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px]">star</span> 대표 시공
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-[11px] font-semibold">
                              {item.category || '시공 사례'}
                            </span>
                          )}
                          <span className="font-body-sm text-[11px] text-on-surface-variant font-mono">
                            {item.regDate || '2026.10.28'} 시공
                          </span>
                        </div>

                        <h3 className="font-headline-sm text-headline-sm font-bold text-primary truncate" title={item.title}>
                          {item.title}
                        </h3>

                        <div className="flex items-center justify-between pt-1">
                          <span className="font-label-sm text-label-sm text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                            {item.category || '정기청소'}
                          </span>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                setNewPortTitle(item.title);
                                setNewPortCategory(item.category || '정기청소');
                                setNewPortBeforeImg(item.beforeImgUrl);
                                setNewPortAfterImg(item.afterImgUrl);
                                setShowAddPortModal(true);
                              }}
                              className="px-2 py-1 rounded bg-surface-container-lowest text-on-surface font-label-sm text-label-sm hover:bg-surface-container transition-colors border border-outline-variant/30"
                              type="button"
                            >
                              수정
                            </button>
                            <button 
                              onClick={() => handleRemovePortfolio(idx)}
                              className="px-2 py-1 rounded bg-surface-container-lowest text-error font-label-sm text-label-sm hover:bg-error-container transition-colors border border-outline-variant/30"
                              type="button"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 드래그 앤 드롭 업로드 존 */}
                <div 
                  onClick={() => setShowAddPortModal(true)}
                  className="p-space-xl rounded-2xl bg-surface-container-low flex flex-col items-center justify-center text-center gap-2 cursor-pointer hover:bg-surface-container transition-all border border-dashed border-outline-variant/60"
                >
                  <div className="w-12 h-12 rounded-full bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm">
                    <span className="material-symbols-outlined text-[26px]">cloud_upload</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-headline-sm text-headline-sm font-bold text-primary">
                      시공 전/후 고화질 사진을 이곳에 끌어다 놓으세요
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      스마트폰 원본 사진 자동 압축 및 리사이징 지원 (최대 12건까지 등록 가능)
                    </span>
                  </div>
                  <button 
                    className="mt-2 px-4 py-2 rounded-xl bg-surface-container-lowest text-primary font-label-md text-label-md font-bold shadow-sm hover:bg-primary-container hover:text-on-primary transition-all border border-outline-variant/30"
                    type="button"
                  >
                    내 PC에서 사진 파일 선택하기
                  </button>
                </div>
              </section>

            </div>

            {/* 우측 사이드바 (4 Columns: 인텔리전스 및 모바일 시뮬레이터) */}
            <div className="lg:col-span-4 flex flex-col gap-space-lg sticky top-24">
              
              {/* 1. 프로필 완성도 점수 카드 */}
              <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md border border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-sm text-headline-sm font-bold text-primary">프로필 완성도 지수</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                    상위 3% 이내
                  </span>
                </div>

                {/* 원형 프로그레스 SVG */}
                <div className="flex items-center gap-space-md bg-surface-container-low p-space-md rounded-xl border border-outline-variant/30">
                  <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <path 
                        className="text-surface-container-high" 
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="3.5"
                      />
                      <path 
                        className="text-secondary transition-all duration-500" 
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeDasharray={`${profile.completionScore}, 100`} 
                        strokeLinecap="round" 
                        strokeWidth="3.5"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="font-headline-md text-headline-md font-extrabold text-primary leading-none">
                        {profile.completionScore}
                      </span>
                      <span className="font-label-sm text-[9px] text-on-surface-variant font-bold">SCORE</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-label-md text-label-md font-bold text-secondary">
                      최우수 완성도 (매우 높음)
                    </span>
                    <p className="font-body-sm text-[12px] text-on-surface-variant leading-tight">
                      프로필 완성도가 높아 고객 매칭 시 <strong className="text-primary">우선 추천 알고리즘 혜택</strong>을 적용받고 있습니다.
                    </p>
                  </div>
                </div>

                {/* 체크리스트 */}
                <div className="flex flex-col gap-2 pt-1 font-body-sm text-body-sm">
                  <div className="flex items-center justify-between text-on-surface">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                      상호 및 대표자 국세청 인증
                    </span>
                    <span className="font-label-sm text-label-sm text-secondary font-bold">완료</span>
                  </div>
                  <div className="flex items-center justify-between text-on-surface">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                      한 줄 소개 및 상세 원칙 작성
                    </span>
                    <span className="font-label-sm text-label-sm text-secondary font-bold">완료</span>
                  </div>
                  <div className="flex items-center justify-between text-on-surface">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                      전문 장비 태그 5개 이상 등록
                    </span>
                    <span className="font-label-sm text-label-sm text-secondary font-bold">{profile.equipTags.length}개 등록</span>
                  </div>
                  <div className="flex items-center justify-between text-on-surface">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="material-symbols-outlined text-secondary text-[18px]">check_circle</span>
                      시공 전/후 사진 6건 이상 등록
                    </span>
                    <span className="font-label-sm text-label-sm text-secondary font-bold">{portfolios.length}건 등록</span>
                  </div>
                  <div className="flex items-center justify-between text-on-surface-variant bg-surface-container-low p-2 rounded-lg border border-outline-variant/20">
                    <span className="flex items-center gap-1.5 font-medium text-on-surface">
                      <span className="material-symbols-outlined text-outline text-[18px]">radio_button_unchecked</span>
                      고객 응답 가능 시간 영상 등록
                    </span>
                    <span 
                      onClick={() => showToast('시공 장비 현장 시연 영상 업로드 기능이 곧 지원됩니다.')}
                      className="font-label-sm text-label-sm text-primary font-bold hover:underline cursor-pointer"
                    >
                      +8점 권장
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. 고객 화면 실시간 미리보기 미니 카드 (Mobile Preview Simulation) */}
              <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md border border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[20px]">phone_iphone</span>
                    <h3 className="font-headline-sm text-headline-sm font-bold text-primary">고객 화면 실시간 시뮬레이션</h3>
                  </div>
                  <span className="font-label-sm text-[11px] text-on-surface-variant">견적서 카드 뷰</span>
                </div>

                {/* 스마트폰 쉘 프리뷰 */}
                <div className="bg-surface-container-low p-3 rounded-2xl shadow-inner flex flex-col gap-3 border border-outline-variant/30">
                  <div className="bg-surface-container-lowest rounded-xl p-3.5 shadow-sm flex flex-col gap-2.5">
                    {/* 파트너 카드 헤더 */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-surface-container shrink-0 border border-outline-variant/20">
                        <img 
                          src={profile.profileImgUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlBrDONJwlMcVAyZQRNAX9VCUIB31SHMspwkqxeUPxtacY803I8mcUA5ImNt0zXXUlJ8liP-hp7KrJcwxQtzQbaIDMxqrUQ5WOsW7xBMDcp_FAlfDFvqSbnwxtZb8Yu-Q6YmftbRACENxMY_L58mx1x7xQGwLsKxn51Jng6KYsUsqllVbcpKBTUnsJO3QlGmBxCRkYr8lg3NDHxPliRn0N5DO89gGMqbcJzwk15lM3ws-UU48Nq7qo'} 
                          alt="파트너 썸네일" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-headline-sm text-[15px] font-bold text-primary truncate">
                            {profile.companyNm}
                          </span>
                          <span className="material-symbols-outlined text-secondary text-[16px]">verified</span>
                        </div>
                        <div className="flex items-center gap-1 text-[12px]">
                          <span className="material-symbols-outlined text-amber-500 text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          <strong className="font-bold text-on-surface font-mono">{profile.avgRating}</strong>
                          <span className="text-on-surface-variant font-label-sm text-[11px]">(리뷰 {profile.reviewTotalCnt})</span>
                          <span className="text-outline-variant">·</span>
                          <span className="text-secondary font-bold text-[11px]">마스터</span>
                        </div>
                      </div>
                    </div>

                    {/* 한 줄 소개 & 태그 */}
                    <p className="font-body-sm text-[12px] text-on-surface font-medium line-clamp-2 leading-snug">
                      {profile.shortIntro || '전문 파트너의 한 줄 소개가 이곳에 표시됩니다.'}
                    </p>

                    <div className="flex flex-wrap gap-1">
                      {profile.equipTags.slice(0, 3).map((t, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-surface-container-low text-primary font-label-sm text-[10px] font-semibold">
                          {t.split(' ')[0]} {t.split(' ')[1] || ''}
                        </span>
                      ))}
                    </div>

                    {/* 미니 Before/After 쇼케이스 */}
                    {portfolios.length > 0 && (
                      <div className="w-full h-24 rounded-lg overflow-hidden flex bg-surface-container mt-1">
                        <div className="w-1/2 h-full relative">
                          <img 
                            src={portfolios[0].beforeImgUrl} 
                            alt="Before" 
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white font-label-sm text-[8px]">
                            BEFORE
                          </span>
                        </div>
                        <div className="w-1/2 h-full relative">
                          <img 
                            src={portfolios[0].afterImgUrl} 
                            alt="After" 
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-secondary text-white font-label-sm text-[8px]">
                            AFTER
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="pt-1 flex justify-between items-center text-[12px]">
                      <span className="text-on-surface-variant font-body-sm">상담 응답률 <strong className="text-primary font-bold">99%</strong></span>
                      <span 
                        onClick={() => setShowPreviewModal(true)}
                        className="text-primary font-bold font-label-sm text-[11px] flex items-center cursor-pointer hover:underline"
                      >
                        견적 세부서 보기 <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                      </span>
                    </div>
                  </div>
                  <p className="font-body-sm text-[11px] text-on-surface-variant text-center">
                    고객이 앱과 웹 견적 비교함에서 보게 되는 실물 파트너 카드입니다.
                  </p>
                </div>
              </div>

              {/* 3. 플릿 신뢰 정책 및 증빙 혜택 */}
              <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-sm border border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[22px]">gavel</span>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-primary">플릿 신뢰 정책 및 증빙 혜택</h3>
                </div>
                <div className="flex flex-col gap-2.5 pt-1 text-on-surface-variant font-body-sm text-body-sm leading-relaxed">
                  <div className="flex gap-2">
                    <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">warning</span>
                    <p>
                      <strong className="text-on-surface font-semibold">허위/도용 포트폴리오 등록 방지:</strong> 타사 시공 사진 또는 인터넷 불법 도용 적발 시 영구 입점 취소 및 배상 청구 조치됩니다.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">shield</span>
                    <p>
                      <strong className="text-on-surface font-semibold">분쟁 시 면책 증빙 인정:</strong> 등록된 시공 전/후 사진은 고객과의 클레임 발생 시 플랫폼 공식 면책 및 보험 청구의 최우선 입증자료로 인정됩니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* 4. 파트너 전담 고객센터 & 핫라인 */}
              <div className="bg-primary text-on-primary rounded-2xl p-space-lg shadow-md flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary-container text-[22px]">headset_mic</span>
                    <span className="font-headline-sm text-headline-sm font-bold">파트너 핫라인 지원</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-surface-container-lowest/10 text-on-primary font-label-sm text-[11px]">
                    운영본부 직통
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-on-primary-container">대표 유선 문의 (ARS 2번 파트너센터)</span>
                  <span className="font-display text-display font-extrabold text-secondary-container tracking-tight">1588-0000</span>
                  <span className="font-body-sm text-[12px] text-on-primary-container">평일 08:30 ~ 18:30 (주말/공휴일 긴급 시공 관제 상시 가동)</span>
                </div>
                <button 
                  onClick={() => setShowHotlineModal(true)}
                  className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/90 text-on-secondary font-label-md text-label-md font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">chat</span>
                  카카오톡 @쓸고닦고파트너 1:1 상담
                </button>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* 하단 고정 액션 바 */}
      <aside className="sticky bottom-0 left-0 right-0 w-full z-40 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_-8px_24px_-4px_rgba(22,59,102,0.06)] border-t border-outline-variant/30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-margin-desktop py-3.5 flex flex-col sm:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-2.5 text-on-surface-variant font-body-sm text-body-sm">
            <span className="material-symbols-outlined text-secondary text-[20px]">cloud_sync</span>
            <span>
              저장된 프로필 정보는 즉시 고객용 쓸고닦고 앱 및 실시간 웹 견적 비교 화면에 반영됩니다.
            </span>
          </div>
          <div className="flex items-center gap-space-sm shrink-0">
            <button 
              onClick={() => navigateTo('partner-dashboard')}
              className="px-space-md py-3 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md font-bold hover:bg-surface-container-high transition-all"
              type="button"
            >
              변경사항 취소
            </button>
            <button 
              onClick={handleSaveProfile}
              disabled={saving}
              className={`px-space-xl py-3 rounded-xl font-headline-sm text-[16px] font-bold shadow-md transition-all flex items-center gap-2 ${
                saveSuccess 
                  ? 'bg-secondary text-on-secondary' 
                  : 'bg-primary hover:bg-primary-container text-on-primary active:scale-[0.98]'
              }`}
              type="button"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                  저장 중...
                </>
              ) : saveSuccess ? (
                <>
                  <span className="material-symbols-outlined text-[20px]">check</span>
                  프로필 반영 완료!
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  프로필 변경사항 저장
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* 모달 1: 고객 화면 실시간 미리보기 모달 */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto border border-outline-variant/30">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">preview</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-primary">
                  고객용 공식 파트너 프로필 미리보기
                </h3>
              </div>
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4 bg-surface-container-low p-4 rounded-xl">
                <img 
                  src={profile.profileImgUrl} 
                  alt="Avatar" 
                  className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-outline-variant/30" 
                />
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-headline-sm text-headline-sm font-bold text-primary">{profile.companyNm}</span>
                    <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-bold">
                      공인 마스터
                    </span>
                  </div>
                  <span className="text-on-surface-variant font-body-sm text-[12px]">{profile.activeRegions}</span>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    <span className="material-symbols-outlined text-amber-500 text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <strong className="text-on-surface font-bold">{profile.avgRating}</strong>
                    <span className="text-on-surface-variant text-[12px]">(누적 시공 {profile.totalWorkCnt}건 완료)</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-label-md text-label-md font-bold text-primary">대표 소개</span>
                <p className="font-body-md text-body-md text-on-surface bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/20">
                  {profile.shortIntro}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-label-md text-label-md font-bold text-primary">상세 시공 원칙</span>
                <p className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-line bg-surface-container-low p-3.5 rounded-xl leading-relaxed">
                  {profile.introText}
                </p>
              </div>

              <div className="flex flex-col gap-1">
                <span className="font-label-md text-label-md font-bold text-primary">보유 전문 장비 ({profile.equipTags.length})</span>
                <div className="flex flex-wrap gap-1.5">
                  {profile.equipTags.map((tag, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-md bg-surface-container text-primary font-label-sm text-label-sm font-semibold">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button 
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold"
                type="button"
              >
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모달 2: 신규 시공 전/후 사진 등록 모달 */}
      {showAddPortModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-2xl flex flex-col gap-4 border border-outline-variant/30">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">add_photo_alternate</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-primary">
                  신규 시공 전/후 포트폴리오 등록
                </h3>
              </div>
              <button 
                onClick={() => setShowAddPortModal(false)}
                className="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface font-bold">시공 제목</label>
                <input 
                  type="text"
                  value={newPortTitle}
                  onChange={(e) => setNewPortTitle(e.target.value)}
                  placeholder="예: 마두동 빌라 계단 대리석 광택 복원"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest border border-outline-variant/30"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface font-bold">시공 카테고리</label>
                <select 
                  value={newPortCategory}
                  onChange={(e) => setNewPortCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md border border-outline-variant/30"
                >
                  <option value="정기청소 (계단)">정기청소 (계단)</option>
                  <option value="정기청소 (상가)">정기청소 (상가)</option>
                  <option value="정기청소 (공용부)">정기청소 (공용부)</option>
                  <option value="계절가전 케어">계절가전 케어</option>
                  <option value="특수청소 (외곽)">특수청소 (외곽)</option>
                  <option value="특수청소 (옥상)">특수청소 (옥상)</option>
                  <option value="입주/이사 청소">입주/이사 청소</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface font-bold">시공 전(Before) 사진 URL</label>
                <input 
                  type="text"
                  value={newPortBeforeImg}
                  onChange={(e) => setNewPortBeforeImg(e.target.value)}
                  placeholder="https://... 또는 이미지 URL"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm border border-outline-variant/30"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-label-sm text-label-sm text-on-surface font-bold">시공 후(After) 사진 URL</label>
                <input 
                  type="text"
                  value={newPortAfterImg}
                  onChange={(e) => setNewPortAfterImg(e.target.value)}
                  placeholder="https://... 또는 이미지 URL"
                  className="w-full px-3 py-2 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm border border-outline-variant/30"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-outline-variant/30">
              <button 
                onClick={() => setShowAddPortModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant font-label-md text-label-md"
                type="button"
              >
                취소
              </button>
              <button 
                onClick={handleSaveNewPortfolio}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold"
                type="button"
              >
                포트폴리오 등록
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 모달 3: 핫라인 상담 모달 */}
      {showHotlineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4 border border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[24px]">support_agent</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-primary">파트너 관제 1:1 상담</h3>
              </div>
              <button 
                onClick={() => setShowHotlineModal(false)}
                className="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              프로필 인증 심사 또는 포트폴리오 저작권 등록과 관련해 전담 매니저의 1:1 상담이 필요하신가요?
            </p>
            <div className="p-3.5 rounded-xl bg-surface-container-low flex flex-col gap-1 border border-outline-variant/20">
              <span className="font-label-sm text-label-sm font-bold text-primary">카카오톡 공식 채널</span>
              <span className="font-body-md text-body-md text-on-surface font-mono">@쓸고닦고파트너</span>
              <span className="font-label-sm text-[11px] text-on-surface-variant">실시간 응답 가능 (평일 08:30~18:30)</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setShowHotlineModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant font-label-md text-label-md"
                type="button"
              >
                닫기
              </button>
              <button 
                onClick={() => {
                  setShowHotlineModal(false);
                  showToast('카카오톡 파트너 1:1 상담 채널로 연결되었습니다.');
                }}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold"
                type="button"
              >
                상담창 열기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 푸터 */}
      <footer className="w-full bg-surface-container-low text-on-surface-variant py-space-xl shadow-[0_-1px_8px_rgba(22,59,102,0.03)] mt-12">
        <div className="w-full px-margin-desktop flex flex-col gap-space-lg">
          <div className="flex flex-wrap items-center justify-between gap-space-md pb-space-lg">
            <div className="flex items-center gap-space-lg">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">verified_user</span>
                <span className="font-label-md text-label-md text-on-surface font-bold">쓸고닦고 공인 플릿 파트너사 보증 시스템</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[22px]">shield</span>
                <span className="font-label-md text-label-md text-on-surface font-bold">100% 에스크로 익일 정산 보장</span>
              </div>
            </div>
            <div className="flex items-center gap-space-md">
              <span className="font-label-sm text-label-sm text-on-surface-variant">파트너 24시간 긴급 기술지원:</span>
              <span className="font-label-md text-label-md text-primary font-bold">1588-0000 (ARS 2번)</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md pt-space-md">
            <div className="flex flex-col gap-1">
              <span className="font-label-sm text-label-sm text-on-surface font-bold">(주)쓸고닦고 파트너 엔터프라이즈 사업본부</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                사업자등록번호: 214-88-99012 | 통신판매업신고: 2024-서울강남-04121호 | 클리닝 안전책임배상보험 5억원 가입
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">© 2025 SsulDak Fleet Operations Network. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-space-md font-label-sm text-label-sm">
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">파트너 운영규약</a>
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">정산 수수료 안내</a>
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">개인정보처리방침</a>
              <a className="text-on-surface-variant hover:text-on-surface transition-colors" href="#">긴급 관제센터</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PtnrDsh02Screen;
