import React, { useState, useEffect } from 'react';

export interface RegionItem {
  sido: string;
  sigungu: string;
  fullRegionNm: string;
  isMainBase?: boolean;
  memo?: string;
}

export interface RegionCodeItem {
  cd: string;
  nm: string;
  parentCd?: string;
}

export interface PtnrDsh01Props {
  initialPtnrNo?: string;
  onNavigate?: (path: string) => void;
}

export const PtnrDsh01Screen: React.FC<PtnrDsh01Props> = ({
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

  // 1. 전문 시공 서비스 분야
  const [serviceTypes, setServiceTypes] = useState<string[]>(['REGULAR', 'APPLIANCE']);
  
  // 1-1. 서브 설정
  const [urgentDispatchYn, setUrgentDispatchYn] = useState<boolean>(true);
  const [minQuoteAmt, setMinQuoteAmt] = useState<number>(50000);

  // 2. 활동 지역 설정
  const [activeRegions, setActiveRegions] = useState<RegionItem[]>([
    { sido: '경기', sigungu: '고양시 일산동구', fullRegionNm: '경기 고양시 일산동구', isMainBase: true, memo: '메인 활동 거점 (대표 사업장)' },
    { sido: '경기', sigungu: '고양시 일산서구', fullRegionNm: '경기 고양시 일산서구', isMainBase: false, memo: '차량 이동 10분 권역' },
    { sido: '경기', sigungu: '파주시', fullRegionNm: '경기 파주시 전역', isMainBase: false, memo: '운정/교하지구 집중 커버' }
  ]);
  const [sidoList, setSidoList] = useState<RegionCodeItem[]>([
    { cd: '41', nm: '경기도' },
    { cd: '11', nm: '서울특별시' },
    { cd: '28', nm: '인천광역시' }
  ]);
  const [sigunguList, setSigunguList] = useState<RegionCodeItem[]>([
    { cd: '41281', nm: '고양시 일산동구', parentCd: '41' },
    { cd: '41285', nm: '고양시 일산서구', parentCd: '41' },
    { cd: '41287', nm: '고양시 덕양구', parentCd: '41' },
    { cd: '41480', nm: '파주시 전역', parentCd: '41' },
    { cd: '41570', nm: '김포시 전체', parentCd: '41' }
  ]);

  const [selectedSidoCd, setSelectedSidoCd] = useState<string>('41');
  const [selectedSigunguNm, setSelectedSigunguNm] = useState<string>('김포시 전체');

  // 2-1. 출동 반경 슬라이더
  const [dispatchRadiusKm, setDispatchRadiusKm] = useState<number>(15);

  // 3. 작업 요일 및 시간대
  const [workDays, setWorkDays] = useState<string[]>(['월', '화', '수', '목', '금', '토']);
  const [workStartTime, setWorkStartTime] = useState<string>('08:00');
  const [workEndTime, setWorkEndTime] = useState<string>('18:00');
  const [nightCleanYn, setNightCleanYn] = useState<boolean>(false);

  // 모달/다이얼로그
  const [showSupportModal, setShowSupportModal] = useState<boolean>(false);

  // 토스트 타이머
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // ---------------------------------------------------------------------------
  // 데이터 불러오기
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/partner/ptnr_dsh_01', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'GET_SETTINGS', ptnrNo })
        });
        const result = await res.json();
        if (result.success && result.settings) {
          const s = result.settings;
          if (s.serviceTypes && s.serviceTypes.length > 0) {
            setServiceTypes(s.serviceTypes);
          }
          if (s.activeRegions && s.activeRegions.length > 0) {
            setActiveRegions(s.activeRegions);
          }
          if (typeof s.dispatchRadiusKm === 'number') {
            setDispatchRadiusKm(s.dispatchRadiusKm);
          }
          setUrgentDispatchYn(s.urgentDispatchYn === 'Y');
          setMinQuoteAmt(s.minQuoteAmt || 50000);
          if (s.workDays && Array.isArray(s.workDays)) {
            setWorkDays(s.workDays);
          }
          setWorkStartTime(s.workStartTime || '08:00');
          setWorkEndTime(s.workEndTime || '18:00');
          setNightCleanYn(s.nightCleanYn === 'Y');
        }

        if (result.regionCodes) {
          if (result.regionCodes.sidoList) setSidoList(result.regionCodes.sidoList);
          if (result.regionCodes.sigunguList) setSigunguList(result.regionCodes.sigunguList);
        }
      } catch (err) {
        console.warn('초기 설정 로드 실패, 기본값으로 가동:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [ptnrNo]);

  // 선택된 시도에 따른 시군구 목록
  const filteredSigunguList = sigunguList.filter((item) => item.parentCd === selectedSidoCd);

  // 시도 변경 시 기본 시군구 자동 설정
  useEffect(() => {
    if (filteredSigunguList.length > 0) {
      setSelectedSigunguNm(filteredSigunguList[0].nm);
    }
  }, [selectedSidoCd]);

  // ---------------------------------------------------------------------------
  // 실시간 시뮬레이션 계산
  // ---------------------------------------------------------------------------
  const regionCount = Math.max(1, activeRegions.length);
  const hasRegular = serviceTypes.includes('REGULAR');
  const hasAppliance = serviceTypes.includes('APPLIANCE');
  const hasMovein = serviceTypes.includes('MOVEIN');

  const baseVolume = (hasRegular ? 10 : 0) + (hasAppliance ? 7 : 0) + (hasMovein ? 4 : 0);
  const radiusMultiplier = dispatchRadiusKm >= 20 ? 1.25 : dispatchRadiusKm <= 10 ? 0.8 : 1.0;
  const weeklyMin = Math.max(6, Math.round(baseVolume * (regionCount / 3) * radiusMultiplier * 0.9));
  const weeklyMax = Math.max(10, Math.round(baseVolume * (regionCount / 3) * radiusMultiplier * 1.25));

  const totalWeights = (hasRegular ? 60 : 0) + (hasAppliance ? 35 : 0) + (hasMovein ? 30 : 0) || 100;
  const regPct = hasRegular ? Math.round(((hasRegular ? 60 : 0) / totalWeights) * 95) : 0;
  const appPct = hasAppliance ? Math.round(((hasAppliance ? 35 : 0) / totalWeights) * 95) : 0;
  const othPct = Math.max(0, 100 - regPct - appPct);

  const estMonthlyMin = (weeklyMin * 4 * (hasRegular ? 70000 : 120000) * 0.75).toLocaleString();
  const estMonthlyMax = (weeklyMax * 4 * (hasRegular ? 90000 : 150000) * 0.9).toLocaleString();

  // ---------------------------------------------------------------------------
  // 인터랙션 핸들러
  // ---------------------------------------------------------------------------
  const toggleCategory = (catKey: string) => {
    if (serviceTypes.includes(catKey)) {
      if (serviceTypes.length <= 1) {
        showToast('최소 1개 이상의 전문 시공 서비스 분야를 유지해야 맞춤 오더를 수신할 수 있습니다.');
        return;
      }
      setServiceTypes(serviceTypes.filter((c) => c !== catKey));
      showToast(`'${getCategoryName(catKey)}' 분야 수신이 비활성화되었습니다.`);
    } else {
      setServiceTypes([...serviceTypes, catKey]);
      showToast(`'${getCategoryName(catKey)}' 분야가 맞춤 매칭에 추가되었습니다.`);
    }
  };

  const getCategoryName = (key: string) => {
    switch (key) {
      case 'REGULAR': return '정기청소 (빌라·상가·오피스)';
      case 'APPLIANCE': return '계절가전 전문 케어';
      case 'MOVEIN': return '입주 / 이사 청소 (종합 클리닝)';
      default: return key;
    }
  };

  const handleAddRegion = () => {
    if (activeRegions.length >= 5) {
      showToast('활동 지역은 최대 5개까지만 등록 가능합니다.');
      return;
    }

    const curSido = sidoList.find((s) => s.cd === selectedSidoCd)?.nm || '경기도';
    const sidoShort = curSido.startsWith('경기') ? '경기' : curSido.startsWith('서울') ? '서울' : '인천';
    const fullNm = `${sidoShort} ${selectedSigunguNm}`;

    const exists = activeRegions.some((r) => r.fullRegionNm === fullNm || (r.sido === sidoShort && r.sigungu === selectedSigunguNm));
    if (exists) {
      showToast('이미 등록된 활동 권역입니다.');
      return;
    }

    const newRegion: RegionItem = {
      sido: sidoShort,
      sigungu: selectedSigunguNm,
      fullRegionNm: fullNm,
      isMainBase: false,
      memo: '신규 추가 권역'
    };

    setActiveRegions([...activeRegions, newRegion]);
    showToast(`'${fullNm}' 권역이 정상 등록되었습니다. (총 ${activeRegions.length + 1}/5개)`);
  };

  const handleRemoveRegion = (indexToRemove: number) => {
    if (activeRegions.length <= 1) {
      showToast('최소 1곳 이상의 활동 가능 지역을 유지해야 합니다.');
      return;
    }
    const target = activeRegions[indexToRemove];
    setActiveRegions(activeRegions.filter((_, idx) => idx !== indexToRemove));
    showToast(`'${target.fullRegionNm}' 권역이 삭제되었습니다.`);
  };

  const toggleDay = (day: string) => {
    if (workDays.includes(day)) {
      if (workDays.length <= 1) {
        showToast('최소 1일 이상의 작업 요일을 선택해야 합니다.');
        return;
      }
      setWorkDays(workDays.filter((d) => d !== day));
    } else {
      setWorkDays([...workDays, day]);
    }
  };

  const handleReset = () => {
    if (window.confirm('모든 설정값을 일산 거점 기본 추천값으로 초기화하시겠습니까?')) {
      setServiceTypes(['REGULAR', 'APPLIANCE']);
      setActiveRegions([
        { sido: '경기', sigungu: '고양시 일산동구', fullRegionNm: '경기 고양시 일산동구', isMainBase: true, memo: '메인 활동 거점 (대표 사업장)' },
        { sido: '경기', sigungu: '고양시 일산서구', fullRegionNm: '경기 고양시 일산서구', isMainBase: false, memo: '차량 이동 10분 권역' },
        { sido: '경기', sigungu: '파주시', fullRegionNm: '경기 파주시 전역', isMainBase: false, memo: '운정/교하지구 집중 커버' }
      ]);
      setDispatchRadiusKm(15);
      setUrgentDispatchYn(true);
      setMinQuoteAmt(50000);
      setWorkDays(['월', '화', '수', '목', '금', '토']);
      setWorkStartTime('08:00');
      setWorkEndTime('18:00');
      setNightCleanYn(false);
      showToast('설정값이 기본 추천값으로 초기화되었습니다.');
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const payload = {
        mode: 'SAVE_SETTINGS',
        ptnrNo,
        serviceTypes,
        activeRegions,
        dispatchRadiusKm,
        urgentDispatchYn: urgentDispatchYn ? 'Y' : 'N',
        minQuoteAmt,
        workDays,
        workStartTime,
        workEndTime,
        nightCleanYn: nightCleanYn ? 'Y' : 'N'
      };

      const res = await fetch('/api/partner/ptnr_dsh_01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setSaveSuccess(true);
        showToast('맞춤 공고 설정이 안전하게 저장되었습니다. (5분 내 전국 관제 반영)');
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      } else {
        showToast(data.message || '설정 저장 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('설정 저장 통신 에러:', err);
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
        <div className="fixed bottom-8 right-8 z-[100] max-w-md bg-inverse-surface text-inverse-on-surface px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 border border-outline-variant/30 animate-bounce">
          <span className="material-symbols-outlined text-secondary text-[22px]">info</span>
          <span className="font-label-md text-label-md">{toastMessage}</span>
        </div>
      )}

      {/* 헤더 GNB */}
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
              <span className="font-label-md text-label-md text-on-surface">반짝빌라클린</span>
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
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-margin-desktop py-space-lg flex flex-col gap-space-lg">
          
          {/* Breadcrumb & 상단 헤더 */}
          <section className="flex flex-col gap-space-sm">
            <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant">
              <button 
                onClick={() => navigateTo('partner-dashboard')}
                className="hover:text-primary transition-colors flex items-center gap-1"
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">home</span> 홈
              </button>
              <span className="text-outline-variant">/</span>
              <button 
                onClick={() => navigateTo('partner-dashboard')}
                className="hover:text-primary transition-colors"
                type="button"
              >
                대시보드 (PTNR-DSH-00)
              </button>
              <span className="text-outline-variant">/</span>
              <span>파트너 운영 설정</span>
              <span className="text-outline-variant">/</span>
              <span className="text-primary font-bold">서비스 가능 지역 및 분야 설정</span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pt-2">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-space-sm">
                  <button 
                    onClick={() => navigateTo('partner-dashboard')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-primary hover:bg-surface-container-high transition-colors font-label-md text-label-md"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    파트너 대시보드로 돌아가기
                  </button>
                  <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                    배차 알고리즘 4.2 Ver
                  </span>
                </div>
                <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight font-extrabold mt-1">
                  서비스 가능 지역 및 분야 설정
                </h1>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl">
                  파트너사의 보유 자격·전문 장비 및 활동 권역을 맞춤 설정하면 최적의 프리미엄 청소 공고와 긴급 직배차 오더가 실시간으로 자동 수신됩니다.
                </p>
              </div>

              <div className="flex items-center gap-space-md self-start lg:self-center">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container-lowest shadow-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary"></span>
                  </span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-secondary font-bold leading-none">실시간 반영 모드 가동 중</span>
                    <span className="font-label-sm text-[10px] text-on-surface-variant leading-none mt-0.5">최근 동기화: 방금 전</span>
                  </div>
                </div>

                <button 
                  onClick={handleReset}
                  className="px-3.5 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md transition-all flex items-center gap-1.5 shadow-sm"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant">restart_alt</span>
                  기본값으로 초기화
                </button>
              </div>
            </div>
          </section>

          {/* 메인 12컬럼 레이아웃 (좌측 8열 메인 폼, 우측 4열 시뮬레이션 및 보증) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
            
            {/* 좌측 컬럼 (8 Columns) */}
            <main className="lg:col-span-8 flex flex-col gap-space-lg">
              
              {/* CARD 1: 전문 시공 서비스 분야 선택 */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 lg:p-8 shadow-[0_4px_20px_-4px_rgba(22,59,102,0.05)] flex flex-col gap-space-lg">
                <div className="flex items-start justify-between gap-space-md pb-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                        1. 전문 시공 서비스 분야 선택
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                        필수 선택 1개 이상
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      보유 장비 및 전문 자격에 부합하는 시공 분야를 선택해 주세요. 설정된 카테고리의 오더만 선별 매칭됩니다.
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-primary text-[28px] opacity-20">verified</span>
                </div>

                {/* 카테고리 스택 */}
                <div className="grid grid-cols-1 gap-space-md">
                  
                  {/* Category 1: 정기청소 */}
                  <label 
                    onClick={() => toggleCategory('REGULAR')}
                    className={`group relative p-5 rounded-xl cursor-pointer transition-all duration-200 block border ${
                      hasRegular 
                        ? 'bg-[#f1f6ff] border-primary shadow-[0_4px_16px_rgba(0,37,74,0.08)]' 
                        : 'bg-surface-container-low/60 border-transparent hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-start gap-space-md">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center mt-1 flex-shrink-0 transition-colors ${
                        hasRegular ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-high text-transparent'
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </div>
                      <div className="flex-1 flex flex-col gap-2 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                              정기청소 (빌라·상가·오피스)
                            </span>
                            <span className="px-2 py-0.5 rounded bg-primary text-on-primary font-label-sm text-label-sm">
                              대표 전문 분야
                            </span>
                            <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                              배차 가중치 +20%
                            </span>
                          </div>
                          <span className="font-label-md text-label-md text-secondary font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">trending_up</span> 높은 수주율
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface">
                          주 1~3회 정기 순회 관리 오더 수신 (장기 계약 기반의 안정적인 고정 월매출을 확보할 수 있는 핵심 종목)
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="px-2.5 py-1 rounded-md bg-surface-container-lowest text-on-surface-variant font-label-sm text-label-sm shadow-xs">계단 청소</span>
                          <span className="px-2.5 py-1 rounded-md bg-surface-container-lowest text-on-surface-variant font-label-sm text-label-sm shadow-xs">복도/공용부 왁스코팅</span>
                          <span className="px-2.5 py-1 rounded-md bg-surface-container-lowest text-on-surface-variant font-label-sm text-label-sm shadow-xs">빌라 정기관리</span>
                          <span className="px-2.5 py-1 rounded-md bg-surface-container-lowest text-on-surface-variant font-label-sm text-label-sm shadow-xs">분리수거장 방역</span>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Category 2: 계절가전 전문 케어 */}
                  <label 
                    onClick={() => toggleCategory('APPLIANCE')}
                    className={`group relative p-5 rounded-xl cursor-pointer transition-all duration-200 block border ${
                      hasAppliance 
                        ? 'bg-[#f1f6ff] border-primary shadow-[0_4px_16px_rgba(0,37,74,0.08)]' 
                        : 'bg-surface-container-low/60 border-transparent hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-start gap-space-md">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center mt-1 flex-shrink-0 transition-colors ${
                        hasAppliance ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-high text-transparent'
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </div>
                      <div className="flex-1 flex flex-col gap-2 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                              계절가전 전문 케어
                            </span>
                            <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[13px] text-tertiary">workspace_premium</span> 자격 인증 완료
                            </span>
                            <span className="px-2 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                              고단가 집중 배차
                            </span>
                          </div>
                          <span className="font-label-md text-label-md text-primary font-bold">
                            건당 평균 12~18만
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface">
                          전문 분해 세척 자격증 등록 파트너사 전용 고단가 오더 매칭 (성수기 추가 프리미엄 보조금 지급)
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="px-2.5 py-1 rounded-md bg-surface-container-lowest text-on-surface-variant font-label-sm text-label-sm shadow-xs">벽걸이/스탠드 에어컨 완전분해</span>
                          <span className="px-2.5 py-1 rounded-md bg-surface-container-lowest text-on-surface-variant font-label-sm text-label-sm shadow-xs">통돌이/드럼 세탁기 고압세척</span>
                          <span className="px-2.5 py-1 rounded-md bg-surface-container-lowest text-on-surface-variant font-label-sm text-label-sm shadow-xs">실외기 케어</span>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Category 3: 입주/이사 청소 */}
                  <label 
                    onClick={() => toggleCategory('MOVEIN')}
                    className={`group relative p-5 rounded-xl cursor-pointer transition-all duration-200 block border ${
                      hasMovein 
                        ? 'bg-[#f1f6ff] border-primary shadow-[0_4px_16px_rgba(0,37,74,0.08)]' 
                        : 'bg-surface-container-low/60 border-transparent hover:bg-surface-container-low'
                    }`}
                  >
                    <div className="flex items-start gap-space-md">
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center mt-1 flex-shrink-0 transition-colors ${
                        hasMovein ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container-high text-transparent'
                      }`}>
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </div>
                      <div className="flex-1 flex flex-col gap-2 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                              입주 / 이사 청소 (종합 클리닝)
                            </span>
                            <span className={`px-2 py-0.5 rounded font-label-sm text-label-sm ${
                              hasMovein ? 'bg-secondary text-on-secondary font-bold' : 'bg-surface-container-high text-on-surface-variant'
                            }`}>
                              {hasMovein ? '선택됨' : '미선택'}
                            </span>
                          </div>
                          <span className="font-label-sm text-label-sm text-outline">
                            평당 11,000원 기준
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          체크 시 3~4인 규모 전문 장비팀 투입 오더 수신 가능 (팀 구성 및 산업용 청소장비 사전 등록 필요)
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 opacity-80">
                          <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant font-label-sm text-label-sm">아파트·빌라 준공/이사 청소</span>
                          <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant font-label-sm text-label-sm">피톤치드 연무</span>
                          <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant font-label-sm text-label-sm">바닥 광택 코팅</span>
                        </div>
                      </div>
                    </div>
                  </label>

                  {/* Category 4: 특수 청소 (비활성 / 사전 승인 대기) */}
                  <div className="group relative p-5 rounded-xl block bg-surface-container-low/40 opacity-80 border border-dashed border-outline-variant/60">
                    <div className="flex items-start gap-space-md">
                      <div className="w-6 h-6 rounded-lg bg-surface-container-high text-outline-variant flex items-center justify-center mt-1 flex-shrink-0">
                        <span className="material-symbols-outlined text-[14px]">lock</span>
                      </div>
                      <div className="flex-1 flex flex-col gap-2 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-headline-sm text-headline-sm font-semibold text-on-surface-variant">
                              특수 청소 / 준공 화재 청소
                            </span>
                            <span className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-bold">
                              사전 승인 대기
                            </span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setShowSupportModal(true)}
                            className="font-label-sm text-label-sm text-primary underline font-bold hover:text-primary-container"
                          >
                            승인 서류 제출 &gt;
                          </button>
                        </div>
                        <p className="font-body-sm text-body-sm text-outline">
                          특수 고온 스팀기 및 산업 안전 인증 확인 후 활성화됩니다. 서류 심사는 24시간 내 완료됩니다.
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 opacity-60">
                          <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant font-label-sm text-label-sm">인테리어 준공 청소</span>
                          <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant font-label-sm text-label-sm">침수 복구</span>
                          <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant font-label-sm text-label-sm">화재 냄새 탈취</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 서브 설정: 긴급 당일 배차 & 최소 수신 금액 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-4 bg-surface-container-low p-4 rounded-xl">
                  {/* 긴급 당일 배차 */}
                  <div className="flex items-center justify-between gap-space-sm bg-surface-container-lowest p-3.5 rounded-lg shadow-xs">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-secondary text-[18px]">bolt</span>
                        <span className="font-label-md text-label-md text-on-surface font-bold">긴급 당일 배차 오더 수신</span>
                      </div>
                      <span className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">2시간 내 즉시 출동 가능한 단가 +15% 오더</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUrgentDispatchYn(!urgentDispatchYn)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out p-0.5 ${
                        urgentDispatchYn ? 'bg-secondary' : 'bg-surface-container-high'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                        urgentDispatchYn ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* 최소 견적 금액 필터 */}
                  <div className="flex items-center justify-between gap-space-sm bg-surface-container-lowest p-3.5 rounded-lg shadow-xs">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-primary text-[18px]">payments</span>
                        <span className="font-label-md text-label-md text-on-surface font-bold">최소 수신 견적 금액 필터</span>
                      </div>
                      <span className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">설정 미만 단일 오더는 자동 차단</span>
                    </div>
                    <select 
                      value={minQuoteAmt}
                      onChange={(e) => setMinQuoteAmt(Number(e.target.value))}
                      className="px-3 py-1.5 rounded-lg bg-surface-container-low text-on-surface font-label-md text-label-md font-bold focus:outline-none focus:ring-2 focus:ring-primary border border-outline-variant/30"
                    >
                      <option value="30000">30,000원 이상</option>
                      <option value="50000">50,000원 이상</option>
                      <option value="80000">80,000원 이상</option>
                      <option value="100000">100,000원 이상</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* CARD 2: 활동 가능 지역 설정 (시/군/구) */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 lg:p-8 shadow-[0_4px_20px_-4px_rgba(22,59,102,0.05)] flex flex-col gap-space-lg">
                <div className="flex flex-wrap items-center justify-between gap-space-md pb-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                        2. 활동 가능 지역 설정 (시/군/구)
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                        선택된 지역: {activeRegions.length} / 5개
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      대표 사업장 소재지를 기반으로 신속 출동이 가능한 핵심 권역을 최대 5곳까지 등록할 수 있습니다.
                    </p>
                  </div>
                </div>

                {/* 알림 배너 */}
                <div className="flex items-start gap-space-sm p-4 rounded-xl bg-surface-container-low text-primary border border-primary/10">
                  <span className="material-symbols-outlined text-[20px] text-primary flex-shrink-0 mt-0.5">info</span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-label-md text-label-md font-bold">스마트 권역 매칭 시스템 가동 중</span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      등록된 지역 내에서 등록되는 사용자 견적 요청이 실시간 알림톡 및 앱 푸시로 전송됩니다. 이동 소요 시간 단축을 위해 <strong className="text-primary font-bold">반경 15km 이내 인접 구역</strong> 설정을 권장합니다.
                    </p>
                  </div>
                </div>

                {/* 등록된 권역 칩 리스트 */}
                <div className="flex flex-col gap-2">
                  <span className="font-label-md text-label-md text-on-surface font-bold">현재 등록된 출동 가능 권역</span>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
                    {activeRegions.map((region, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center justify-between p-3.5 rounded-xl transition-all group ${
                          idx === 0 
                            ? 'bg-surface-container-high/70 border border-primary/20' 
                            : 'bg-surface-container-low hover:bg-surface-container'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full bg-secondary flex-shrink-0"></span>
                            <span className="font-headline-sm text-[15px] font-bold text-on-surface truncate">
                              {region.fullRegionNm}
                            </span>
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 truncate">
                            {region.memo || (idx === 0 ? '메인 활동 거점 (대표 사업장)' : '인접 집중 권역')}
                          </span>
                        </div>
                        <button 
                          onClick={() => handleRemoveRegion(idx)}
                          className="p-1 rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-error transition-colors flex-shrink-0"
                          title="삭제"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 권역 추가 폼 */}
                <div className="p-4 rounded-xl bg-surface-container-low flex flex-col md:flex-row items-center gap-space-md border border-outline-variant/30">
                  <div className="w-full md:w-1/3 flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">시/도 선택</label>
                    <select 
                      value={selectedSidoCd}
                      onChange={(e) => setSelectedSidoCd(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary shadow-xs border border-outline-variant/20"
                    >
                      {sidoList.map((s) => (
                        <option key={s.cd} value={s.cd}>{s.nm}</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full md:w-1/3 flex flex-col gap-1">
                    <label className="font-label-sm text-label-sm text-on-surface-variant font-bold">시/군/구 선택</label>
                    <select 
                      value={selectedSigunguNm}
                      onChange={(e) => setSelectedSigunguNm(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md focus:outline-none focus:ring-2 focus:ring-primary shadow-xs border border-outline-variant/20"
                    >
                      {filteredSigunguList.map((sg) => (
                        <option key={sg.cd} value={sg.nm}>{sg.nm}</option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full md:w-1/3 flex flex-col justify-end">
                    <span className="font-label-sm text-label-sm text-transparent select-none hidden md:block">액션</span>
                    <button 
                      onClick={handleAddRegion}
                      disabled={activeRegions.length >= 5}
                      className={`w-full py-2.5 px-4 rounded-lg font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                        activeRegions.length >= 5
                          ? 'bg-outline text-surface-container-lowest cursor-not-allowed opacity-60'
                          : 'bg-primary hover:bg-primary-container text-on-primary active:scale-95'
                      }`}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_location_alt</span>
                      + 권역 추가하기
                    </button>
                  </div>
                </div>

                {/* 출동 반경 슬라이더 & 지도 시뮬레이션 */}
                <div className="flex flex-col gap-space-md pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">radar</span>
                      <span className="font-label-md text-label-md text-on-surface font-bold">사업장 기준 최대 출동 반경</span>
                    </div>
                    <span className="font-headline-sm text-headline-sm text-primary font-extrabold">
                      {dispatchRadiusKm} km {dispatchRadiusKm === 15 ? '(권장)' : ''}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    <input 
                      type="range"
                      min={5}
                      max={30}
                      step={5}
                      value={dispatchRadiusKm}
                      onChange={(e) => setDispatchRadiusKm(Number(e.target.value))}
                      className="w-full h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between font-label-sm text-label-sm text-on-surface-variant px-1">
                      <span>5 km (밀착)</span>
                      <span className={dispatchRadiusKm === 15 ? 'text-primary font-bold' : ''}>15 km (효율 최적)</span>
                      <span className={dispatchRadiusKm === 20 ? 'text-primary font-bold' : ''}>20 km</span>
                      <span className={dispatchRadiusKm === 30 ? 'text-primary font-bold' : ''}>30 km (광역)</span>
                    </div>
                  </div>

                  {/* 지도 오버레이 프리뷰 */}
                  <div className="relative w-full h-44 rounded-xl overflow-hidden shadow-inner bg-surface-container-high flex items-center justify-center border border-outline-variant/30">
                    <div 
                      className="absolute inset-0 w-full h-full bg-cover bg-center opacity-85"
                      style={{ 
                        backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuBPvVr28gxQQgeVQUqPz-iXHcwUYH4oXUv-IqKXgPz1Zp8k2Z4QV4BwE8_zU8yEYyEzcHQaSKVZBeH2xYxMmwJYOv44ExNAVdua-lIiCJaz8gcs7K9dl2GoEkJRskvBoqlRpn_x9NbELHHw8-VmJw_zJjsM08Hvy7vdzA8Ap4kUECLrNuETbRjCN6fRrbV1a_PNTo7Ek_ElSBswgP7JpQFlkAAIb_QJKJCWsfSOHAs3ZYAtuBclsCpP')` 
                      }}
                    />
                    
                    {/* 레이더 펄스 시각화 서클 */}
                    <div className="absolute w-36 h-36 rounded-full border-2 border-secondary/40 bg-secondary/10 animate-ping pointer-events-none" />
                    <div className="absolute w-44 h-44 rounded-full border border-primary/30 pointer-events-none" />

                    <div className="relative z-10 flex flex-col items-center gap-1 p-3.5 rounded-xl bg-surface-container-lowest/95 backdrop-blur-md shadow-lg max-w-xs text-center border border-outline-variant/30">
                      <div className="flex items-center gap-1 text-primary">
                        <span className="material-symbols-outlined text-secondary text-[20px]">store</span>
                        <span className="font-label-md text-label-md font-bold text-on-surface">반짝빌라클린 일산 거점</span>
                      </div>
                      <p className="font-label-sm text-label-sm text-on-surface-variant">
                        반경 {dispatchRadiusKm}km 커버리지 내 빌라 {4820 + (dispatchRadiusKm - 15) * 320}개 단지 배차 타겟팅 중
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-bold">
                          출동시간 평균 {Math.round(dispatchRadiusKm * 1.2)}분
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* CARD 3: 작업 가능 요일 및 시간대 설정 */}
              <section className="bg-surface-container-lowest rounded-2xl p-6 lg:p-8 shadow-[0_4px_20px_-4px_rgba(22,59,102,0.05)] flex flex-col gap-space-lg">
                <div className="flex flex-col gap-1 pb-1">
                  <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                    3. 작업 가능 요일 및 시간대 설정
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    고객 견적서 발송 시 일정 중복을 방지하기 위해 파트너사의 주간 고정 활동 일정을 지정합니다.
                  </p>
                </div>

                {/* 요일 필즈 */}
                <div className="flex flex-col gap-2">
                  <span className="font-label-md text-label-md text-on-surface font-bold">오더 수신 요일 (클릭하여 휴무 전환)</span>
                  <div className="grid grid-cols-7 gap-2">
                    {['월', '화', '수', '목', '금', '토', '일'].map((day) => {
                      const isActive = workDays.includes(day);
                      return (
                        <button
                          key={day}
                          onClick={() => toggleDay(day)}
                          type="button"
                          className={`py-3 rounded-xl font-headline-sm text-center font-bold transition-all shadow-xs ${
                            isActive
                              ? day === '일'
                                ? 'bg-secondary text-on-secondary hover:bg-secondary-fixed'
                                : 'bg-primary text-on-primary hover:bg-primary-container'
                              : 'bg-surface-container-low text-outline-variant hover:bg-surface-container-high'
                          }`}
                        >
                          {day} {isActive ? '' : '(휴무)'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 시간대 선택 & 심야 청소 스위치 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md pt-2">
                  <div className="flex flex-col gap-2 bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
                    <span className="font-label-md text-label-md text-on-surface font-bold">주간 작업 가능 시간</span>
                    <div className="flex items-center gap-2">
                      <select 
                        value={workStartTime}
                        onChange={(e) => setWorkStartTime(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md font-bold focus:outline-none shadow-xs border border-outline-variant/20"
                      >
                        <option value="07:00">07:00 (오전 7시)</option>
                        <option value="08:00">08:00 (오전 8시)</option>
                        <option value="09:00">09:00 (오전 9시)</option>
                        <option value="10:00">10:00 (오전 10시)</option>
                      </select>
                      <span className="text-on-surface-variant font-bold">~</span>
                      <select 
                        value={workEndTime}
                        onChange={(e) => setWorkEndTime(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md font-bold focus:outline-none shadow-xs border border-outline-variant/20"
                      >
                        <option value="17:00">17:00 (오후 5시)</option>
                        <option value="18:00">18:00 (오후 6시)</option>
                        <option value="20:00">20:00 (오후 8시)</option>
                        <option value="22:00">22:00 (오후 10시)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-space-sm bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-on-surface-variant text-[18px]">bedtime</span>
                        <span className="font-label-md text-label-md text-on-surface font-bold">야간 / 심야 정기청소 수신</span>
                      </div>
                      <span className="font-body-sm text-[12px] text-on-surface-variant mt-0.5">상가/학원 마감 후 (22:00 ~ 05:00)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNightCleanYn(!nightCleanYn)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out p-0.5 ${
                        nightCleanYn ? 'bg-primary' : 'bg-surface-container-high'
                      }`}
                    >
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                        nightCleanYn ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </section>

              {/* 하단 저장 액션 툴바 */}
              <div className="w-full bg-surface-container-lowest rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border border-outline-variant/20">
                <div className="flex items-center gap-2 text-on-surface-variant">
                  <span className="material-symbols-outlined text-secondary text-[20px]">sync</span>
                  <span className="font-body-sm text-body-sm">
                    설정 변경 시 <strong className="text-on-surface font-semibold">5분 이내</strong> 전국 관제 알고리즘에 즉시 자동 반영됩니다.
                  </span>
                </div>
                <div className="flex items-center gap-space-sm self-end sm:self-auto">
                  <button 
                    onClick={() => navigateTo('partner-dashboard')}
                    className="px-5 py-2.5 rounded-xl bg-surface-container-high text-on-surface font-label-md text-label-md font-bold hover:bg-surface-container-highest transition-all"
                    type="button"
                  >
                    변경사항 취소
                  </button>
                  <button 
                    onClick={handleSaveSettings}
                    disabled={saving}
                    className={`px-6 py-2.5 rounded-xl font-label-md text-label-md font-bold transition-all flex items-center gap-2 shadow-md ${
                      saveSuccess 
                        ? 'bg-secondary text-on-secondary' 
                        : 'bg-primary hover:bg-primary-container text-on-primary active:scale-95'
                    }`}
                    type="button"
                  >
                    {saving ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                        저장 중...
                      </>
                    ) : saveSuccess ? (
                      <>
                        <span className="material-symbols-outlined text-[18px]">done_all</span>
                        설정이 안전하게 저장되었습니다
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        맞춤 공고 설정 저장하기
                      </>
                    )}
                  </button>
                </div>
              </div>

            </main>

            {/* 우측 컬럼 (4 Columns: 시뮬레이션 및 안심 지원) */}
            <aside className="lg:col-span-4 flex flex-col gap-space-lg sticky top-24">
              
              {/* CARD 1: 실시간 오더 풀 시뮬레이션 */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(22,59,102,0.05)] flex flex-col gap-space-md relative overflow-hidden border border-outline-variant/20">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-secondary/15 rounded-full blur-2xl pointer-events-none"></div>
                
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                    실시간 오더 풀 시뮬레이션
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant text-[18px]">auto_graph</span>
                </div>

                <div className="flex flex-col gap-1 pt-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">
                    ESTIMATED WEEKLY VOLUME
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-display text-primary font-extrabold tracking-tight">
                      {weeklyMin} ~ {weeklyMax}
                    </span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold">건 / 주간</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-secondary font-label-sm text-label-sm font-bold">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    오더 매칭 적합도: 96% (매우 높음)
                  </div>
                </div>

                {/* 카테고리별 비중 바 차트 */}
                <div className="flex flex-col gap-2 pt-2 bg-surface-container-low p-4 rounded-xl">
                  <span className="font-label-sm text-label-sm text-on-surface font-bold">수신 예상 오더 비중 구성</span>
                  <div className="w-full h-3 rounded-full bg-surface-container-highest overflow-hidden flex">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${regPct}%` }} title={`정기청소 ${regPct}%`} />
                    <div className="h-full bg-secondary transition-all duration-300" style={{ width: `${appPct}%` }} title={`가전분해 ${appPct}%`} />
                    <div className="h-full bg-tertiary-fixed-dim transition-all duration-300" style={{ width: `${othPct}%` }} title={`기타 ${othPct}%`} />
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1 text-on-surface-variant font-body-sm text-body-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-primary"></span>
                        <span className="text-on-surface font-medium">빌라/상가 정기청소</span>
                      </div>
                      <span className="font-bold text-on-surface">{regPct}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-secondary"></span>
                        <span className="text-on-surface font-medium">계절가전 분해케어</span>
                      </div>
                      <span className="font-bold text-on-surface">{appPct}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-tertiary-fixed-dim"></span>
                        <span className="text-on-surface-variant font-medium">기타 긴급 연계 오더</span>
                      </div>
                      <span className="font-bold text-on-surface-variant">{othPct}%</span>
                    </div>
                  </div>
                </div>

                {/* 예상 월 정산액 */}
                <div className="p-4 rounded-xl bg-surface-container-high/60 flex flex-col gap-1">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">선택 조건 기준 예상 월 정산액</span>
                  <div className="flex items-baseline gap-1">
                    <span className="font-headline-lg text-[22px] font-extrabold text-primary">
                      {estMonthlyMin} ~ {estMonthlyMax}
                    </span>
                    <span className="font-label-md text-label-md font-bold text-on-surface">원</span>
                  </div>
                  <span className="font-label-sm text-[11px] text-outline">플랫폼 수수료 9.9% 정산 차감 전 기준 추정치</span>
                </div>
              </div>

              {/* CARD 2: 안심 배차 보증 정책 3종 */}
              <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-[0_4px_20px_-4px_rgba(22,59,102,0.05)] flex flex-col gap-space-md border border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[22px]">format_image_left</span>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">파트너 안심 배차 보증 정책</h3>
                </div>
                <div className="flex flex-col gap-3 font-body-sm text-body-sm">
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">1</div>
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface">설정 지역 외 강제 배차 절대 없음</span>
                      <span className="text-on-surface-variant text-[12px]">수신된 오더는 100% 자율 수락제이며 미수락 시 패널티가 없습니다.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">2</div>
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface">고객 노쇼 위약금 100% 플랫폼 보상</span>
                      <span className="text-on-surface-variant text-[12px]">현장 도착 후 고객 부재 및 일방 취소 시 공임비 전액 에스크로 보호.</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-[11px] flex-shrink-0 mt-0.5">3</div>
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface">첫 달 배차 수수료 무료 쿠폰 자동 적용</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-[10px] font-bold">D-29 잔여</span>
                        <span className="text-on-surface-variant text-[12px]">신규 마스터 등급 달성 프로모션</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: 설정 변경 지원 및 파트너 핫라인 */}
              <div className="bg-surface-container-low rounded-2xl p-5 flex flex-col gap-space-sm border border-outline-variant/30">
                <div className="flex items-center justify-between">
                  <span className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">support_agent</span>
                    설정 변경 지원 및 파트너 핫라인
                  </span>
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                </div>
                <p className="font-body-sm text-[12px] text-on-surface-variant">
                  다세대 빌라 밀집 구역 추가나 특수 시공 자격 서류 제출에 문의가 있으신가요? 전담 매니저가 즉시 지원합니다.
                </p>
                <div className="flex flex-col gap-2 pt-1">
                  <a 
                    className="flex items-center justify-between p-3 rounded-lg bg-surface-container-lowest hover:bg-surface-container-high transition-colors shadow-xs" 
                    href="tel:1588-0000"
                  >
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">phone_in_talk</span>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-[10px] text-on-surface-variant leading-none">파트너 전담 기술지원 관제실</span>
                        <span className="font-headline-sm text-headline-sm text-primary font-bold leading-tight mt-0.5">1588-0000 (내선 2번)</span>
                      </div>
                    </div>
                    <span className="font-label-sm text-label-sm text-secondary font-bold">24시 운영</span>
                  </a>

                  <button 
                    type="button"
                    onClick={() => setShowSupportModal(true)}
                    className="w-full py-2.5 px-3 rounded-lg bg-surface-container-highest hover:bg-surface-variant text-on-surface font-label-md text-label-md font-bold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px] text-[#3c1e1e]">chat</span>
                    카카오톡 1:1 관제팀 실시간 상담
                  </button>
                </div>
              </div>

            </aside>
          </div>
        </div>
      </main>

      {/* 상담 지원 모달 */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[24px]">support_agent</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">파트너 1:1 관제 상담</h3>
              </div>
              <button 
                onClick={() => setShowSupportModal(false)}
                className="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              특수 청소 자격증(방역/화재복구) 승인 서류 제출 또는 권역 5곳 초과 광역 배차가 필요하신가요? 관제팀에 즉시 연결됩니다.
            </p>
            <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1">
              <span className="font-label-sm text-label-sm font-bold text-primary">직통 카카오톡 상담창구</span>
              <span className="font-body-sm text-body-sm text-on-surface">ID: @ssuldak_partner_fleet</span>
              <span className="font-label-sm text-[11px] text-outline">상담원 연결 대기시간 약 1분</span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button 
                onClick={() => setShowSupportModal(false)}
                className="px-4 py-2 rounded-xl bg-surface-container text-on-surface-variant font-label-md text-label-md"
                type="button"
              >
                닫기
              </button>
              <button 
                onClick={() => {
                  setShowSupportModal(false);
                  showToast('카카오톡 전용 상담창구로 이동합니다.');
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

export default PtnrDsh01Screen;
