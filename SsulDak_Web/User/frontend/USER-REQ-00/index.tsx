/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 프론트엔드 컴포넌트
 * 화면 ID: USER-REQ-00 (통합 청소 서비스 신청)
 * 파일 경로: SsulDak_Web/User/frontend/USER-REQ-00/index.tsx
 * 백엔드 라우터 경로: SsulDak_Web/User/backend/api_USER_REQ_00/route.ts
 * API 엔드포인트 URL: POST /api/user/user_req_00
 * 전용 쿼리 식별자: USER-REQ-00-SQL-001 ~ USER-REQ-00-SQL-005
 * =============================================================================
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import UserReq01Modal, { RegularItemToAdd } from '../USER-REQ-01/index.tsx';
import UserReq02Modal, { ApplianceItemToAdd } from '../USER-REQ-02/index.tsx';
import UserReq03Modal, { SelectedAddress } from '../USER-REQ-03/index.tsx';
import UserReq04Modal, { SitePhotoItem } from '../USER-REQ-04/index.tsx';

export interface UserReq00Props {
  onNavigate?: (path: string) => void;
  logoSrc?: string;
  apiEndpoint?: string;
  initialUserNo?: string;
}

export interface CodeItem {
  grpCd: string;
  comCd: string;
  comNm: string;
  attrVal1: string | null;
  sortOrd: number;
}

export interface RegularItemState {
  id: string;
  areaCd: string;
  areaNm: string;
  propAmt: number;
}

export interface ApplianceItemState {
  id: string;
  applianceCd: string;
  applianceNm: string;
  propAmt: number;
}

export default function UserReq00Screen({
  onNavigate,
  logoSrc = '/logo.png',
  apiEndpoint = '/api/user/user_req_00',
  initialUserNo = 'U20261000001',
}: UserReq00Props) {
  // ---------------------------------------------------------------------------
  // 1. 공통 코드 및 기초 상태
  // ---------------------------------------------------------------------------
  const [commonCodes, setCommonCodes] = useState<{
    regularCleanAreas: CodeItem[];
    applianceTypes: CodeItem[];
    moveinSpaceTypes: CodeItem[];
    visitCycles: CodeItem[];
    parkingTypes: CodeItem[];
  }>({
    regularCleanAreas: [],
    applianceTypes: [],
    moveinSpaceTypes: [],
    visitCycles: [],
    parkingTypes: [],
  });

  const [isLoadingCodes, setIsLoadingCodes] = useState(true);

  // ---------------------------------------------------------------------------
  // 2. Section 1: 주소 및 현장 환경 상태
  // ---------------------------------------------------------------------------
  const [addrRoad, setAddrRoad] = useState('경기 고양시 일산동구 중앙로 1234');
  const [addrDetail, setAddrDetail] = useState('105동 402호');
  const [hasElevator, setHasElevator] = useState<'Y' | 'N'>('Y');
  const [parkingTypeCd, setParkingTypeCd] = useState<'FREE' | 'PAID' | 'IMPOSSIBLE'>('FREE');
  const [showAddressModal, setShowAddressModal] = useState(false);

  // ---------------------------------------------------------------------------
  // 3. Section 2: 정기청소 (REGULAR) 상태
  // ---------------------------------------------------------------------------
  const [useRegular, setUseRegular] = useState(true);

  // 기본 3개월 세팅: 시작일 = 오늘, 종료일 = 오늘 + 92일
  const getInitialDates = () => {
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + 92);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    return {
      start: formatDate(today),
      end: formatDate(future),
    };
  };

  const initialDates = getInitialDates();
  const [regularStartDt, setRegularStartDt] = useState(initialDates.start);
  const [regularEndDt, setRegularEndDt] = useState(initialDates.end);
  const [visitCycleCd, setVisitCycleCd] = useState('WEEKLY_1');

  // 기본 정기청소 품목 (지시서 기준 예시)
  const [regularItems, setRegularItems] = useState<RegularItemState[]>([
    { id: 'reg-1', areaCd: 'STAIR', areaNm: '계단 청소 (1~4층)', propAmt: 180000 },
    { id: 'reg-2', areaCd: 'SURROUND', areaNm: '건물주위 / 주차장', propAmt: 60000 },
  ]);

  const [showAddRegularModal, setShowAddRegularModal] = useState(false);
  const [selectedAddRegularCd, setSelectedAddRegularCd] = useState('');

  // ---------------------------------------------------------------------------
  // 4. Section 3: 계절 가전케어 (APPLIANCE) 상태
  // ---------------------------------------------------------------------------
  const [useAppliance, setUseAppliance] = useState(true);
  const [applianceItems, setApplianceItems] = useState<ApplianceItemState[]>([
    { id: 'app-1', applianceCd: 'AC_STAND', applianceNm: '스탠드 에어컨 (LG)', propAmt: 80000 },
  ]);

  const [showAddApplianceModal, setShowAddApplianceModal] = useState(false);
  const [selectedAddApplianceCd, setSelectedAddApplianceCd] = useState('');

  // ---------------------------------------------------------------------------
  // 5. Section 4: 입주/이사 청소 (MOVEIN) 상태
  // ---------------------------------------------------------------------------
  const [useMovein, setUseMovein] = useState(false);
  const [moveinSpaceCd, setMoveinSpaceCd] = useState('APT');
  const [moveinPyeong, setMoveinPyeong] = useState(25);
  const [moveinAmt, setMoveinAmt] = useState(300000);

  // ---------------------------------------------------------------------------
  // 6. Section 6: 현장 사진 첨부 상태 (USER-REQ-04 연동)
  // ---------------------------------------------------------------------------
  const [photoUrls, setPhotoUrls] = useState<string[]>([
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCOLMC7fgVJ2YH9IIeNgMSS0Wbt3E_DKazhGD9SD2lQGfJnUcXdC1RtGIXpfqgNvK2HPkpO0NGZ1WOAxk6XPy9Pa1FIXxHoxQT7ROo5WfIs_RtqqSk6TbP9mPsoThs0gWySiuKsE-rIWVwdx-kImFmvVR4riI1_WCRwRCgc_484sCKPu5lVyg-E74d----e1q9PoOBUCL9k3TLZ9PD_wAnioIYW3-aCEvT0H8_6r2flPvP8bYQOmAG5',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBX4Uhwi_mAh6N4pV-BtJEkug-brUkuJ8azQW1IjzI4C_zDw0I7Rk-uKiQLQsnqnv1oK8rNzrwlBVUP0assnhNz9uBQlefEARP6UnUwsxOuwBJtXrJqGpdGQVy9govQ4HFeaNmkmsnzoZjNeHlYmimHF5-HKHv-HBrXbqCA50tR-JGpzweK-hXP2kqTzSaJvWCgAq1KgrLTPjll5qmXkCadyd9oQvGd9FRn2qMkS2ZXTbWAg7qVVG_A',
  ]);
  const [sitePhotos, setSitePhotos] = useState<SitePhotoItem[]>([]);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // ---------------------------------------------------------------------------
  // 7. 제출 및 완료 모달 상태
  // ---------------------------------------------------------------------------
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    reqNo: string;
    totalProposedAmt: number;
    estDataFeeAmt: number;
  } | null>(null);

  // 토스트 피드백 상태
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  // ---------------------------------------------------------------------------
  // 8. 초기 공통 코드 로딩 (GET_INIT_DATA)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchInitData = async () => {
      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actionType: 'GET_INIT_DATA' }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.commonCodes) {
          setCommonCodes(data.commonCodes);
        }
      } catch (err) {
        console.error('Failed to load init codes:', err);
      } finally {
        setIsLoadingCodes(false);
      }
    };

    fetchInitData();
  }, [apiEndpoint]);

  // ---------------------------------------------------------------------------
  // 9. 정기청소 일수 및 3개월(90일) 유효성 계산
  // ---------------------------------------------------------------------------
  const regularPeriodInfo = useMemo(() => {
    if (!regularStartDt || !regularEndDt) {
      return { diffDays: 0, isValid: false, text: '기간 미지정' };
    }
    const start = new Date(regularStartDt);
    const end = new Date(regularEndDt);
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    const isValid = diffDays >= 90;
    const months = Math.floor(diffDays / 30);
    return {
      diffDays,
      isValid,
      months,
      text: isValid
        ? `${months}개월 ${diffDays}일 정상`
        : `현재 ${diffDays}일 (최소 90일 필요)`,
    };
  }, [regularStartDt, regularEndDt]);

  // ---------------------------------------------------------------------------
  // 10. 소계 및 총액, 데이터 이용료 계산
  // ---------------------------------------------------------------------------
  const regularSubTotal = useMemo(() => {
    if (!useRegular) return 0;
    return regularItems.reduce((acc, item) => acc + (Number(item.propAmt) || 0), 0);
  }, [useRegular, regularItems]);

  const applianceSubTotal = useMemo(() => {
    if (!useAppliance) return 0;
    return applianceItems.reduce((acc, item) => acc + (Number(item.propAmt) || 0), 0);
  }, [useAppliance, applianceItems]);

  const moveinSubTotal = useMemo(() => {
    if (!useMovein) return 0;
    return Number(moveinAmt) || 0;
  }, [useMovein, moveinAmt]);

  const totalProposedAmt = useMemo(() => {
    return regularSubTotal + applianceSubTotal + moveinSubTotal;
  }, [regularSubTotal, applianceSubTotal, moveinSubTotal]);

  const calculatedFee33 = Math.round(totalProposedAmt * 0.033);
  const estDataFeeAmt = Math.max(calculatedFee33, 33000);

  // 등록 가능 여부
  const canSubmit = useMemo(() => {
    if (!addrRoad.trim()) return false;
    if (totalProposedAmt <= 0) return false;
    if (!useRegular && !useAppliance && !useMovein) return false;
    if (useRegular && (!regularPeriodInfo.isValid || regularItems.length === 0)) return false;
    if (useAppliance && applianceItems.length === 0) return false;
    return true;
  }, [addrRoad, totalProposedAmt, useRegular, useAppliance, useMovein, regularPeriodInfo, regularItems, applianceItems]);

  // ---------------------------------------------------------------------------
  // 11. 동적 품목 추가 / 삭제 핸들러
  // ---------------------------------------------------------------------------
  const handleAddRegularItemFromReq01 = (item: RegularItemToAdd) => {
    if (regularItems.some((r) => r.areaCd === item.areaCd)) {
      showToast('이미 추가된 구역입니다.', 'error');
      return;
    }
    setRegularItems((prev) => [
      ...prev,
      {
        id: `reg-${Date.now()}`,
        areaCd: item.areaCd,
        areaNm: item.areaNm,
        propAmt: Number(item.propAmt),
      },
    ]);
    setShowAddRegularModal(false);
    showToast(`'${item.areaNm}' 구역이 성공적으로 추가되었습니다.`, 'success');
  };

  const handleRemoveRegularItem = (id: string) => {
    setRegularItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddApplianceItem = () => {
    if (!selectedAddApplianceCd) return;
    const found = commonCodes.applianceTypes.find((c) => c.comCd === selectedAddApplianceCd);
    if (!found) return;

    const defaultAmt = Number(found.attrVal1) || 80000;
    setApplianceItems((prev) => [
      ...prev,
      {
        id: `app-${Date.now()}`,
        applianceCd: found.comCd,
        applianceNm: found.comNm,
        propAmt: defaultAmt,
      },
    ]);
    setShowAddApplianceModal(false);
    setSelectedAddApplianceCd('');
    showToast(`'${found.comNm}' 가전 품목이 추가되었습니다.`, 'success');
  };

  // USER-REQ-02 모달에서 가전 품목 추가 완료 시 호출
  const handleAddApplianceItemFromReq02 = (item: ApplianceItemToAdd) => {
    setApplianceItems((prev) => [
      ...prev,
      {
        id: `app-${Date.now()}`,
        applianceCd: item.applianceCd,
        applianceNm: item.applianceNm,
        propAmt: item.propAmt,
      },
    ]);
    setShowAddApplianceModal(false);
    showToast(`'${item.applianceNm}' 가전 품목이 추가되었습니다. (${item.propAmt.toLocaleString()}원)`, 'success');
  };

  // USER-REQ-03 주소 검색 팝업에서 주소 선택 완료 시 호출
  const handleSelectAddrFromReq03 = (addr: SelectedAddress) => {
    setAddrRoad(addr.roadAddr);
    setShowAddressModal(false);
    showToast(`'${addr.roadAddr}' 주소가 선택되었습니다.`, 'success');
  };

  const handleRemoveApplianceItem = (id: string) => {
    setApplianceItems((prev) => prev.filter((item) => item.id !== id));
  };

  // 사진 삭제 및 USER-REQ-04 연동 핸들러
  const handleRemovePhoto = (index: number) => {
    setPhotoUrls((prev) => prev.filter((_, idx) => idx !== index));
    setSitePhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSavePhotosFromReq04 = (photos: SitePhotoItem[]) => {
    setSitePhotos(photos);
    setPhotoUrls(photos.map((p) => p.photoUrl));
    setShowPhotoModal(false);
    showToast(`현장 사진 ${photos.length}장이 견적서에 성공적으로 반영되었습니다.`, 'success');
  };

  const handleAddSamplePhoto = () => {
    setShowPhotoModal(true);
  };

  // ---------------------------------------------------------------------------
  // 12. 견적 신청서 최종 등록 (CREATE_REQUEST)
  // ---------------------------------------------------------------------------
  const handleSubmitRequest = async () => {
    if (!canSubmit) {
      if (useRegular && !regularPeriodInfo.isValid) {
        showToast('정기청소는 최소 3개월(90일) 이상 선택하셔야 합니다.', 'error');
      } else {
        showToast('필수 항목을 모두 입력했는지 확인해 주세요.', 'error');
      }
      return;
    }

    const cleanServiceTypes: ('REGULAR' | 'APPLIANCE' | 'MOVEIN')[] = [];
    if (useRegular) cleanServiceTypes.push('REGULAR');
    if (useAppliance) cleanServiceTypes.push('APPLIANCE');
    if (useMovein) cleanServiceTypes.push('MOVEIN');

    setIsSubmitting(true);
    try {
      const payload = {
        actionType: 'CREATE_REQUEST',
        userNo: initialUserNo,
        addrRoad,
        addrDetail,
        hasElevator,
        parkingTypeCd,
        cleanServiceTypes,
        regularClean: useRegular
          ? {
              startDt: regularStartDt,
              endDt: regularEndDt,
              visitCycleCd,
              subItems: regularItems.map((r) => ({
                areaCd: r.areaCd,
                areaNm: r.areaNm,
                propAmt: Number(r.propAmt),
              })),
            }
          : null,
        applianceClean: useAppliance
          ? {
              subItems: applianceItems.map((a) => ({
                applianceCd: a.applianceCd,
                applianceNm: a.applianceNm,
                propAmt: Number(a.propAmt),
              })),
            }
          : null,
        moveinClean: useMovein
          ? {
              spaceTypeCd: moveinSpaceCd,
              spaceTypeNm: commonCodes.moveinSpaceTypes.find((m) => m.comCd === moveinSpaceCd)?.comNm || '입주청소',
              pyeongCount: moveinPyeong,
              propAmt: Number(moveinAmt),
            }
          : null,
        photoUrls,
      };

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitResult({
          reqNo: data.reqNo,
          totalProposedAmt: data.totalProposedAmt || totalProposedAmt,
          estDataFeeAmt: data.estDataFeeAmt || estDataFeeAmt,
        });
      } else {
        showToast(data.message || '견적 신청 등록에 실패했습니다.', 'error');
      }
    } catch {
      showToast('서버와의 통신에 실패했습니다.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoHome = () => {
    if (onNavigate) {
      onNavigate('USER-COM-00');
    } else {
      window.location.hash = '#home';
    }
  };

  return (
    <div className="bg-[#f8f9ff] font-['Plus_Jakarta_Sans',sans-serif] text-[#0b1c30] antialiased min-h-screen flex flex-col justify-between">
      {/* =====================================================================
          1. Header (뒤로가기 / 중앙 타이틀 / 닫기)
         ===================================================================== */}
      <header className="fixed top-0 left-0 w-full z-50 bg-[#f8f9ff]/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#eff4ff]">
        <div className="h-14 max-w-xl mx-auto px-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleGoHome}
            className="w-10 h-10 flex items-center justify-center text-[#00254a] hover:bg-[#eff4ff] rounded-full transition-colors cursor-pointer"
            aria-label="뒤로가기"
          >
            <span className="material-symbols-outlined text-[24px]">chevron_left</span>
          </button>

          <h1 className="text-[17px] font-bold text-[#00254a] tracking-tight">청소 견적 신청서 작성</h1>

          <button
            type="button"
            onClick={handleGoHome}
            className="w-10 h-10 flex items-center justify-center text-[#737780] hover:text-[#00254a] rounded-full transition-colors cursor-pointer"
            aria-label="닫기"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      </header>

      {/* =====================================================================
          2. 메인 폼 영역 (모바일 최적화 390px ~ 600px 카드 뷰)
         ===================================================================== */}
      <main className="w-full pt-18 pb-32 flex-1 flex flex-col items-center">
        <div className="w-full max-w-xl px-4 space-y-5">
          {/* Top Banner Guide */}
          <div className="bg-[#e5eeff] rounded-2xl p-4 flex items-center gap-3 border border-[#dce9ff]">
            <div className="w-10 h-10 rounded-xl bg-[#00254a] text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">assignment_add</span>
            </div>
            <div>
              <span className="text-[11px] font-bold text-[#006c4a] uppercase tracking-wider block">
                Integrated Cleaning Tender
              </span>
              <p className="text-[13px] font-bold text-[#00254a]">
                정기청소·가전케어·입주청소를 한 번에 신청하세요
              </p>
            </div>
          </div>

          {/* ===================================================================
              Section 1: 청소지 주소 및 환경 카드
             =================================================================== */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#e5eeff] space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#eff4ff]">
              <span className="material-symbols-outlined text-[#00254a] text-[20px]">location_on</span>
              <h2 className="text-[16px] font-bold text-[#00254a]">1. 청소지 주소 및 작업 여건</h2>
            </div>

            {/* 도로명 주소 & 주소검색 */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-[#0b1c30] flex items-center justify-between">
                <span>도로명 주소 <span className="text-[#ba1a1a]">*</span></span>
                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="text-[11px] text-[#006c4a] font-bold underline cursor-pointer"
                >
                  주소 검색
                </button>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={addrRoad}
                  onChange={(e) => setAddrRoad(e.target.value)}
                  placeholder="예: 경기 고양시 일산동구 중앙로 1234"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#eff4ff]/60 border border-[#c3c6d0] text-[13px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#00254a]"
                />
                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#00254a] text-white text-[12px] font-bold hover:bg-[#163b66] transition-colors shrink-0 cursor-pointer"
                >
                  검색
                </button>
              </div>
            </div>

            {/* 상세 주소 */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-bold text-[#0b1c30]">상세 주소 (동/호수, 층수 등)</label>
              <input
                type="text"
                value={addrDetail}
                onChange={(e) => setAddrDetail(e.target.value)}
                placeholder="예: 105동 402호 또는 3층 전용면적"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#c3c6d0] text-[13px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#00254a]"
              />
            </div>

            {/* 엘리베이터 여부 & 주차 여건 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* 엘리베이터 유무 세그먼트 */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-[#0b1c30]">승강기 (엘리베이터)</label>
                <div className="grid grid-cols-2 gap-2 bg-[#eff4ff] p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setHasElevator('Y')}
                    className={`py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                      hasElevator === 'Y' ? 'bg-white text-[#00254a] shadow-sm' : 'text-[#737780]'
                    }`}
                  >
                    ● 있음 (탑승 가능)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasElevator('N')}
                    className={`py-2 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                      hasElevator === 'N' ? 'bg-white text-[#ba1a1a] shadow-sm' : 'text-[#737780]'
                    }`}
                  >
                    ○ 없음 (계단 이용)
                  </button>
                </div>
              </div>

              {/* 주차 여건 칩 */}
              <div className="space-y-1.5">
                <label className="text-[12px] font-bold text-[#0b1c30]">주차 여건</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setParkingTypeCd('FREE')}
                    className={`py-2 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                      parkingTypeCd === 'FREE'
                        ? 'bg-[#00254a] text-white border-[#00254a]'
                        : 'bg-white text-[#43474f] border-[#c3c6d0]'
                    }`}
                  >
                    무료 주차
                  </button>
                  <button
                    type="button"
                    onClick={() => setParkingTypeCd('PAID')}
                    className={`py-2 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                      parkingTypeCd === 'PAID'
                        ? 'bg-[#00254a] text-white border-[#00254a]'
                        : 'bg-white text-[#43474f] border-[#c3c6d0]'
                    }`}
                  >
                    유료 지원
                  </button>
                  <button
                    type="button"
                    onClick={() => setParkingTypeCd('IMPOSSIBLE')}
                    className={`py-2 rounded-xl text-[11px] font-bold transition-all border cursor-pointer ${
                      parkingTypeCd === 'IMPOSSIBLE'
                        ? 'bg-[#ba1a1a] text-white border-[#ba1a1a]'
                        : 'bg-white text-[#43474f] border-[#c3c6d0]'
                    }`}
                  >
                    주차 불가
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ===================================================================
              Section 2: 정기청소 신청 카드 (Border Light Blue)
             =================================================================== */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border-2 border-[#a8c8fb] space-y-4 relative overflow-hidden">
            {/* Header with Toggle */}
            <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="chk-regular"
                  checked={useRegular}
                  onChange={(e) => setUseRegular(e.target.checked)}
                  className="w-5 h-5 rounded border-[#00254a] text-[#00254a] focus:ring-[#00254a] cursor-pointer"
                />
                <label htmlFor="chk-regular" className="text-[16px] font-bold text-[#00254a] cursor-pointer">
                  2. 정기청소 신청 (건물·상가·계단)
                </label>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#006c4a]">
                최소 3개월 강제 락
              </span>
            </div>

            {useRegular && (
              <div className="space-y-4 animate-fadeIn">
                {/* 계약 기간 From-To 데이트 픽커 */}
                <div className="p-3.5 rounded-xl bg-[#eff4ff]/60 border border-[#dce9ff] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#00254a] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                      계약 기간 (From ~ To)
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        regularPeriodInfo.isValid
                          ? 'bg-[#82f5c1] text-[#00714e]'
                          : 'bg-[#ffdad6] text-[#ba1a1a]'
                      }`}
                    >
                      {regularPeriodInfo.text}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-[#737780] block mb-0.5">시작일 (From)</span>
                      <input
                        type="date"
                        value={regularStartDt}
                        onChange={(e) => setRegularStartDt(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-[#c3c6d0] text-[12px] font-mono text-[#0b1c30]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-[#737780] block mb-0.5">종료일 (To)</span>
                      <input
                        type="date"
                        value={regularEndDt}
                        onChange={(e) => setRegularEndDt(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-white border border-[#c3c6d0] text-[12px] font-mono text-[#0b1c30]"
                      />
                    </div>
                  </div>

                  {!regularPeriodInfo.isValid && (
                    <p className="text-[11px] text-[#ba1a1a] font-bold flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      ※ 정기청소는 플랫폼 약관에 따라 최소 3개월(90일) 이상 선택하셔야 등록이 가능합니다.
                    </p>
                  )}
                </div>

                {/* 방문 주기 */}
                <div className="space-y-1.5">
                  <label className="text-[12px] font-bold text-[#0b1c30]">방문 주기 선택</label>
                  <select
                    value={visitCycleCd}
                    onChange={(e) => setVisitCycleCd(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#c3c6d0] text-[13px] text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#00254a]"
                  >
                    <option value="WEEKLY_1">주 1회 방문 (월 4회 정기 소독 및 청소)</option>
                    <option value="WEEKLY_2">주 2회 방문 (월 8회 집중 케어)</option>
                    <option value="WEEKLY_3">주 3회 방문 (월 12회 다빈도 케어)</option>
                    <option value="BIWEEKLY">격주 1회 방문 (월 2회)</option>
                    <option value="DAILY_WORK">평일 매일 (월 20회 오피스 데일리)</option>
                  </select>
                </div>

                {/* 동적 정기청소 품목 목록 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-bold text-[#0b1c30]">청소 대상 구역 및 3개월 제안 단가</span>
                    <button
                      type="button"
                      onClick={() => setShowAddRegularModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-[#00254a] text-white text-[11px] font-bold flex items-center gap-1 hover:bg-[#163b66] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      <span>구역 추가 (USER-REQ-01)</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {regularItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-[#f8f9ff] border border-[#dce9ff]"
                      >
                        <div className="flex-1">
                          <span className="text-[13px] font-bold text-[#00254a] block">{item.areaNm}</span>
                          <span className="text-[11px] text-[#737780]">코드: {item.areaCd}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-[#737780]">3개월:</span>
                            <input
                              type="number"
                              step="10000"
                              value={item.propAmt}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setRegularItems((prev) =>
                                  prev.map((r) => (r.id === item.id ? { ...r, propAmt: val } : r))
                                );
                              }}
                              className="w-24 px-2 py-1 rounded-lg bg-white border border-[#c3c6d0] text-right font-mono text-[13px] font-bold text-[#00254a]"
                            />
                            <span className="text-[12px] text-[#0b1c30]">원</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRegularItem(item.id)}
                            className="p-1 text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-lg cursor-pointer"
                            title="삭제"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 정기청소 소계 */}
                  <div className="p-3 rounded-xl bg-[#eff4ff] text-right">
                    <span className="text-[12px] text-[#43474f] mr-2">정기청소 3개월 용역 소계:</span>
                    <strong className="text-[15px] text-[#00254a] font-mono font-bold">
                      {regularSubTotal.toLocaleString()} 원
                    </strong>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ===================================================================
              Section 3: 계절 가전 케어 카드
             =================================================================== */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#e5eeff] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="chk-appliance"
                  checked={useAppliance}
                  onChange={(e) => setUseAppliance(e.target.checked)}
                  className="w-5 h-5 rounded border-[#00254a] text-[#00254a] focus:ring-[#00254a] cursor-pointer"
                />
                <label htmlFor="chk-appliance" className="text-[16px] font-bold text-[#00254a] cursor-pointer">
                  3. 계절 가전 케어 (에어컨·세탁기·냉장고 분해소독)
                </label>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#006c4a]">
                선택 옵션
              </span>
            </div>

            {useAppliance && (
              <div className="space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#0b1c30]">가전 품목 및 대당 제안 단가</span>
                  <button
                    type="button"
                    onClick={() => setShowAddApplianceModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-[#00254a] text-white text-[11px] font-bold flex items-center gap-1 hover:bg-[#163b66] cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>가전 품목 추가 (USER-REQ-02)</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {applianceItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#f8f9ff] border border-[#dce9ff]"
                    >
                      <div className="flex-1">
                        <span className="text-[13px] font-bold text-[#00254a] block">{item.applianceNm}</span>
                        <span className="text-[11px] text-[#737780]">분해 세척 및 고온 스팀 살균</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="5000"
                            value={item.propAmt}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setApplianceItems((prev) =>
                                prev.map((a) => (a.id === item.id ? { ...a, propAmt: val } : a))
                              );
                            }}
                            className="w-24 px-2 py-1 rounded-lg bg-white border border-[#c3c6d0] text-right font-mono text-[13px] font-bold text-[#00254a]"
                          />
                          <span className="text-[12px] text-[#0b1c30]">원</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveApplianceItem(item.id)}
                          className="p-1 text-[#ba1a1a] hover:bg-[#ffdad6]/50 rounded-lg cursor-pointer"
                          title="삭제"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 가전케어 소계 */}
                <div className="p-3 rounded-xl bg-[#eff4ff] text-right">
                  <span className="text-[12px] text-[#43474f] mr-2">가전케어 용역 소계:</span>
                  <strong className="text-[15px] text-[#00254a] font-mono font-bold">
                    {applianceSubTotal.toLocaleString()} 원
                  </strong>
                </div>
              </div>
            )}
          </section>

          {/* ===================================================================
              Section 4: 입주/이사 청소 카드
             =================================================================== */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#e5eeff] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#eff4ff]">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  id="chk-movein"
                  checked={useMovein}
                  onChange={(e) => setUseMovein(e.target.checked)}
                  className="w-5 h-5 rounded border-[#00254a] text-[#00254a] focus:ring-[#00254a] cursor-pointer"
                />
                <label htmlFor="chk-movein" className="text-[16px] font-bold text-[#00254a] cursor-pointer">
                  4. 입주 / 이사 청소 (공간 전체 정밀 클리닝)
                </label>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#eff4ff] text-[#006c4a]">
                원스톱 패키지
              </span>
            </div>

            {useMovein && (
              <div className="space-y-3 animate-fadeIn">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[12px] font-bold text-[#0b1c30] block mb-1">공간 타입</label>
                    <select
                      value={moveinSpaceCd}
                      onChange={(e) => setMoveinSpaceCd(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-[#c3c6d0] text-[13px] text-[#0b1c30]"
                    >
                      <option value="APT">아파트 입주/이사</option>
                      <option value="OFFICETEL">오피스텔 입주/이사</option>
                      <option value="VILLA">다세대/연립 빌라</option>
                      <option value="ONEROOM">원룸/투룸 분리형</option>
                      <option value="HOUSE">단독/전원주택</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-bold text-[#0b1c30] block mb-1">전용 공급 평수</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={moveinPyeong}
                        onChange={(e) => {
                          const p = Number(e.target.value);
                          setMoveinPyeong(p);
                          setMoveinAmt(p * 12000);
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-[#c3c6d0] text-right font-mono text-[13px] text-[#0b1c30]"
                      />
                      <span className="text-[12px] text-[#0b1c30]">평</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#eff4ff]">
                  <span className="text-[12px] text-[#43474f]">입주청소 제안 금액:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="10000"
                      value={moveinAmt}
                      onChange={(e) => setMoveinAmt(Number(e.target.value))}
                      className="w-28 px-2 py-1 rounded-lg bg-white border border-[#c3c6d0] text-right font-mono text-[13px] font-bold text-[#00254a]"
                    />
                    <span className="text-[13px] font-bold text-[#00254a]">원</span>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ===================================================================
              Section 5: 청소 용역 대금 및 데이터 이용료 산출 박스 (Highlight Navy)
             =================================================================== */}
          <section className="bg-[#00254a] rounded-2xl p-5 text-white shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/20">
              <span className="text-[13px] text-[#a8c8fb] font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px]">calculate</span>
                청소 용역 대금 및 데이터 이용료 산출
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#82f5c1] text-[#00714e] text-[11px] font-bold">
                플랫폼 확정 과금
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] text-white/80">총 청소 용역 대금 (파트너 지급액):</span>
                <strong className="text-[22px] font-extrabold font-mono text-white">
                  {totalProposedAmt.toLocaleString()} 원
                </strong>
              </div>

              {/* Fee Formula Badge */}
              <div className="p-3 rounded-xl bg-white/10 text-[12px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-white/70">용역총액 3.3% 기준액:</span>
                  <span className="font-mono">{calculatedFee33.toLocaleString()} 원</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/70">플랫폼 기본 최저 하한선:</span>
                  <span className="font-mono">33,000 원</span>
                </div>
                <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[#82f5c1] font-bold text-[13px]">
                  <span>확정 데이터 이용료 (VAT 포함):</span>
                  <span className="font-mono text-[15px]">{estDataFeeAmt.toLocaleString()} 원</span>
                </div>
              </div>
            </div>

            {/* Promo Nudge */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-[#a8c8fb] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#82f5c1]">redeem</span>
              <span>💡 보유 중인 웰컴 쿠폰(-5,000원)을 매칭 후 결제 단계에서 즉시 적용할 수 있습니다.</span>
            </div>
          </section>

          {/* ===================================================================
              Section 6: 현장 사진 첨부 박스
             =================================================================== */}
          <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#e5eeff] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#eff4ff]">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#00254a] text-[20px]">add_photo_alternate</span>
                <h2 className="text-[14px] font-bold text-[#00254a]">현장 사진 첨부 (USER-REQ-04)</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#82f5c1]/30 text-[#00714e]">
                  {photoUrls.length} / 5 등록됨
                </span>
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#00254a] text-[11px] font-bold transition-colors cursor-pointer"
                >
                  수정/상세 관리
                </button>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2">
              {photoUrls.map((url, idx) => (
                <div
                  key={idx}
                  onClick={() => setShowPhotoModal(true)}
                  className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-200 shadow-sm cursor-pointer group hover:opacity-90"
                  title="클릭하여 현장 사진 관리 모달 열기"
                >
                  <img src={url} alt={`현장사진 ${idx + 1}`} className="w-full h-full object-cover" />
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 px-1 py-0.5 rounded bg-[#006c4a] text-white text-[9px] font-bold shadow-xs">
                      대표
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePhoto(idx);
                    }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-[12px] cursor-pointer hover:bg-[#ba1a1a]"
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              ))}

              {photoUrls.length < 5 && (
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(true)}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-[#c3c6d0] text-[#737780] hover:text-[#00254a] hover:border-[#00254a] flex flex-col items-center justify-center gap-1 text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
                  <span>사진 추가</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#737780]">
              ※ 현장 오염도, 층고, 분리수거장 등의 사진을 첨부하시면 파트너 매칭 성공률이 40% 이상 상승합니다.
            </p>
          </section>
        </div>
      </main>

      {/* =====================================================================
          3. Bottom Floating CTA (하단 고정 버튼)
         ===================================================================== */}
      <div className="fixed bottom-0 left-0 w-full z-40 bg-white/95 backdrop-blur-md border-t border-[#e5eeff] p-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="max-w-xl mx-auto flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSubmitRequest}
            disabled={!canSubmit || isSubmitting}
            className="w-full h-14 rounded-2xl bg-[#00254a] hover:bg-[#163b66] text-white text-[16px] font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-xl transition-all active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                <span>견적 공고 등록 중...</span>
              </>
            ) : (
              <>
                <span className="font-mono text-[17px]">{totalProposedAmt.toLocaleString()}원</span>
                <span>조건으로 견적 공고 등록하기</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =====================================================================
          4. 모달 1: 정기청소 구역 추가 모달 (USER-REQ-01 정식 연동)
         ===================================================================== */}
      <UserReq01Modal
        isOpen={showAddRegularModal}
        onClose={() => setShowAddRegularModal(false)}
        onAddItem={handleAddRegularItemFromReq01}
        apiEndpoint="/api/user/user_req_01"
      />

      {/* =====================================================================
          5. 모달 2: 가전케어 품목 추가 모달 (USER-REQ-02 정식 연계)
         ===================================================================== */}
      <UserReq02Modal
        isOpen={showAddApplianceModal}
        onClose={() => setShowAddApplianceModal(false)}
        onAddItem={handleAddApplianceItemFromReq02}
        apiEndpoint="/api/user/user_req_02"
      />

      {/* =====================================================================
          6. 모달 3: 주소 검색 팝업 (USER-REQ-03 정식 연동)
         ===================================================================== */}
      <UserReq03Modal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSelectAddr={handleSelectAddrFromReq03}
        initialKeyword={addrRoad || '중앙로 1234'}
        userNo={initialUserNo}
        apiEndpoint="/api/user/user_req_03"
      />

      {/* =====================================================================
          7. 모달 4: 현장 사진 첨부 모달 (USER-REQ-04 정식 연동)
         ===================================================================== */}
      <UserReq04Modal
        isOpen={showPhotoModal}
        onClose={() => setShowPhotoModal(false)}
        onSavePhotos={handleSavePhotosFromReq04}
        initialPhotos={sitePhotos.length > 0 ? sitePhotos : photoUrls}
        userNo={initialUserNo}
        apiEndpoint="/api/user/user_req_04"
      />

      {/* =====================================================================
          7. 모달 4: 견적 신청 완료 축하 모달
         ===================================================================== */}
      {submitResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-[#82f5c1]/40 text-[#006c4a] flex items-center justify-center animate-bounce">
              <span className="material-symbols-outlined text-[36px]">verified</span>
            </div>
            <h3 className="text-[20px] font-extrabold text-[#00254a]">
              견적 공고가 등록되었습니다!
            </h3>
            <p className="text-[12px] text-[#43474f] leading-relaxed">
              신청하신 조건으로 주변 우수 마스터 파트너에게 1주일간 견적 응모가 진행됩니다.
            </p>

            <div className="w-full bg-[#eff4ff] p-3 rounded-xl text-left text-[12px] space-y-1 my-1">
              <div className="flex justify-between">
                <span className="text-[#737780]">신청서 번호</span>
                <strong className="text-[#00254a] font-mono">{submitResult.reqNo}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737780]">총 제안 용역금액</span>
                <strong className="text-[#00254a] font-mono">{submitResult.totalProposedAmt.toLocaleString()}원</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-[#737780]">확정 데이터 이용료</span>
                <strong className="text-[#006c4a] font-mono">{submitResult.estDataFeeAmt.toLocaleString()}원</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoHome}
              className="w-full h-12 rounded-xl bg-[#00254a] text-white text-[14px] font-bold shadow-md hover:bg-[#163b66] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>확인 및 메인 홈으로 이동</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          8. 반응형 Toast 피드백 알림
         ===================================================================== */}
      {toastMessage && (
        <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-full shadow-lg text-[13px] font-bold flex items-center gap-2 ${
              toastType === 'success'
                ? 'bg-[#006c4a] text-white'
                : toastType === 'error'
                ? 'bg-[#ba1a1a] text-white'
                : 'bg-[#00254a] text-white'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {toastType === 'success' ? 'check_circle' : toastType === 'error' ? 'error' : 'info'}
            </span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
