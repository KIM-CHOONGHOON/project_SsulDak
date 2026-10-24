/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 프론트엔드 모달 컴포넌트
 * 화면 ID: USER-REQ-02 (계절가전 중분류 추가 모달)
 * 파일 경로: SsulDak_Web/User/frontend/USER-REQ-02/index.tsx
 * 백엔드 라우터 경로: SsulDak_Web/User/backend/api_USER_REQ_02/route.ts
 * API 엔드포인트 URL: POST /api/user/user_req_02
 * 전용 쿼리 식별자: USER-REQ-02-SQL-001 ~ USER-REQ-02-SQL-002
 * 호출 부모 컴포넌트: USER-REQ-00 (통합 청소 견적 신청서)
 * =============================================================================
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';

export interface ApplianceItemToAdd {
  applianceCd: string;
  applianceNm: string;
  brand: string;
  modelDetail?: string;
  quantity: number;
  unitPrice: number;
  propAmt: number;
}

export interface UserReq02ModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAddItem?: (item: ApplianceItemToAdd) => void;
  apiEndpoint?: string;
}

export interface ApplianceCodeItem {
  applianceCd: string;
  applianceNm: string;
  minGuidePrice: number;
  categoryTab: string;
  sortOrd: number;
}

export type CategoryTabType = 'AIR_CON' | 'WASHER' | 'FRIDGE' | 'MATTRESS';

export default function UserReq02Modal({
  isOpen = true,
  onClose,
  onAddItem,
  apiEndpoint = '/api/user/user_req_02',
}: UserReq02ModalProps) {
  // ---------------------------------------------------------------------------
  // 1. 대분류 탭 정의
  // ---------------------------------------------------------------------------
  const tabs = [
    { key: 'AIR_CON' as CategoryTabType, label: '에어컨', icon: 'mode_fan' },
    { key: 'WASHER' as CategoryTabType, label: '세탁기', icon: 'local_laundry_service' },
    { key: 'FRIDGE' as CategoryTabType, label: '냉장고', icon: 'kitchen' },
    { key: 'MATTRESS' as CategoryTabType, label: '매트리스', icon: 'bed' },
  ];

  const [activeTab, setActiveTab] = useState<CategoryTabType>('AIR_CON');
  const [applianceItems, setApplianceItems] = useState<ApplianceCodeItem[]>([
    { applianceCd: 'AC_STAND', applianceNm: '스탠드형 에어컨 (가정/오피스)', minGuidePrice: 130000, categoryTab: 'AIR_CON', sortOrd: 2 },
    { applianceCd: 'AC_WALL', applianceNm: '벽걸이형 에어컨', minGuidePrice: 80000, categoryTab: 'AIR_CON', sortOrd: 1 },
    { applianceCd: 'AC_2IN1', applianceNm: '2in1 홈멀티 에어컨 세트', minGuidePrice: 180000, categoryTab: 'AIR_CON', sortOrd: 3 },
    { applianceCd: 'AC_4WAY', applianceNm: '4Way 천장형 시스템 에어컨', minGuidePrice: 150000, categoryTab: 'AIR_CON', sortOrd: 4 },
    { applianceCd: 'AC_1WAY', applianceNm: '1Way 천장형 원형 360°', minGuidePrice: 100000, categoryTab: 'AIR_CON', sortOrd: 5 },
    { applianceCd: 'WASH_DRUM', applianceNm: '드럼 세탁기 (15kg 이하)', minGuidePrice: 120000, categoryTab: 'WASHER', sortOrd: 6 },
    { applianceCd: 'WASH_DRUM_BIG', applianceNm: '대용량 드럼 세탁기 (16kg 이상)', minGuidePrice: 150000, categoryTab: 'WASHER', sortOrd: 7 },
    { applianceCd: 'WASH_TOP', applianceNm: '통돌이 세탁기 (일반 전자동)', minGuidePrice: 90000, categoryTab: 'WASHER', sortOrd: 8 },
    { applianceCd: 'FRIDGE_NORM', applianceNm: '일반/양문형 냉장고 살균청소', minGuidePrice: 130000, categoryTab: 'FRIDGE', sortOrd: 9 },
    { applianceCd: 'FRIDGE_4DOOR', applianceNm: '4도어 냉장고 살균청소', minGuidePrice: 160000, categoryTab: 'FRIDGE', sortOrd: 10 },
    { applianceCd: 'MATT_SINGLE', applianceNm: '싱글/슈퍼싱글 매트리스 살균', minGuidePrice: 70000, categoryTab: 'MATTRESS', sortOrd: 11 },
    { applianceCd: 'MATT_QUEEN', applianceNm: '퀸/킹/패밀리 매트리스 살균', minGuidePrice: 90000, categoryTab: 'MATTRESS', sortOrd: 12 },
  ]);

  // ---------------------------------------------------------------------------
  // 2. 폼 선택 상태
  // ---------------------------------------------------------------------------
  const [selectedApplianceCd, setSelectedApplianceCd] = useState<string>('AC_STAND');
  const [selectedBrand, setSelectedBrand] = useState<string>('LG전자');
  const [modelDetail, setModelDetail] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(80000);

  // ---------------------------------------------------------------------------
  // 3. 백엔드 코드 목록 로딩 (GET_APPLIANCE_CODES)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchCodes = async () => {
      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: 'GET_APPLIANCE_CODES' }),
        });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.items) && data.items.length > 0) {
          setApplianceItems(data.items);
        }
      } catch (err) {
        console.warn('[USER-REQ-02] 초기 코드 로딩 실패, 기본 목록 사용:', err);
      }
    };

    fetchCodes();
  }, [apiEndpoint]);

  // 현재 탭에 맞는 기종 필터링
  const filteredAppliances = useMemo(() => {
    return applianceItems.filter((item) => item.categoryTab === activeTab);
  }, [applianceItems, activeTab]);

  // 탭 변경 시 첫 번째 기종으로 자동 세팅
  const handleTabChange = (tabKey: CategoryTabType) => {
    setActiveTab(tabKey);
    const subItems = applianceItems.filter((i) => i.categoryTab === tabKey);
    if (subItems.length > 0) {
      const first = subItems[0];
      setSelectedApplianceCd(first.applianceCd);
      setUnitPrice(first.minGuidePrice);
    }
    // 탭에 맞는 기본 제조사 설정
    if (tabKey === 'MATTRESS') {
      setSelectedBrand('에이스침대');
    } else {
      setSelectedBrand('LG전자');
    }
  };

  // 기종 변경 시 기본 단가 동기화
  const handleSelectAppliance = (cd: string) => {
    setSelectedApplianceCd(cd);
    const item = applianceItems.find((i) => i.applianceCd === cd);
    if (item) {
      setUnitPrice(item.minGuidePrice);
    }
  };

  // 현재 선택된 기종 정보
  const currentAppliance = useMemo(() => {
    return (
      applianceItems.find((i) => i.applianceCd === selectedApplianceCd) ||
      filteredAppliances[0] || {
        applianceCd: 'AC_STAND',
        applianceNm: '스탠드형 에어컨',
        minGuidePrice: 80000,
        categoryTab: 'AIR_CON',
        sortOrd: 1,
      }
    );
  }, [applianceItems, selectedApplianceCd, filteredAppliances]);

  // 총액 연산
  const totalAmt = useMemo(() => {
    return (unitPrice || 0) * quantity;
  }, [unitPrice, quantity]);

  // 하한선 검증 상태
  const isLowerThanGuide = unitPrice < currentAppliance.minGuidePrice;

  // 수량 증감
  const handleIncrement = () => {
    if (quantity < 10) setQuantity((prev) => prev + 1);
  };
  const handleDecrement = () => {
    if (quantity > 1) setQuantity((prev) => prev - 1);
  };

  // ---------------------------------------------------------------------------
  // 4. 품목 추가 액션
  // ---------------------------------------------------------------------------
  const handleConfirmAdd = () => {
    const formattedNm = `${currentAppliance.applianceNm.split('(')[0].trim()} (${selectedBrand}, ${quantity}대)`;

    const item: ApplianceItemToAdd = {
      applianceCd: currentAppliance.applianceCd,
      applianceNm: formattedNm,
      brand: selectedBrand,
      modelDetail: modelDetail.trim() || undefined,
      quantity,
      unitPrice,
      propAmt: totalAmt,
    };

    if (onAddItem) {
      onAddItem(item);
    }

    if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#00254a]/60 backdrop-blur-md transition-opacity duration-200 overflow-y-auto">
      {/* Modal Dialog Window (Width 620px, Pristine Precision Aesthetic) */}
      <div className="w-full max-w-[620px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto transition-all duration-300 border border-[#e5eeff] animate-fadeIn">
        {/* Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#163b66] via-[#00254a] to-[#006c4a]"></div>

        {/* 1. Modal Header */}
        <div className="px-6 pt-5 pb-3 bg-white flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-[#e5eeff] text-[#254873] text-[11px] font-bold">
                TB_COM_CODE 연동
              </span>
              <span className="px-2.5 py-1 rounded-full bg-[#85f8c4]/60 text-[#002114] text-[11px] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a] animate-pulse"></span>
                가전 분해살균 케어
              </span>
            </div>
            {/* Close Action Button */}
            <button
              aria-label="닫기"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#eff4ff] hover:bg-[#e5eeff] text-[#43474f] hover:text-[#0b1c30] flex items-center justify-center transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="pt-1">
            <h2 className="text-[22px] lg:text-[24px] font-extrabold text-[#00254a] tracking-tight">
              가전 케어 제품 추가
            </h2>
            <p className="text-[13px] text-[#43474f] mt-0.5 leading-relaxed">
              전문 마스터의 완전분해 고압세척 및 피톤치드 살균 소독이 포함된 품목을 선택하세요.
            </p>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="px-6 py-2 flex flex-col gap-5 max-h-[calc(85vh-160px)] overflow-y-auto">
          {/* 2. Category Tabs (TB_COM_CODE 대분류 탭) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-[#00254a]">케어 대상 가전 구분</label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-[#eff4ff] rounded-xl border border-[#dce9ff]">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => handleTabChange(tab.key)}
                    className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-lg transition-all cursor-pointer ${
                      isActive
                        ? 'bg-white text-[#00254a] shadow-sm font-bold ring-1 ring-[#00254a]/10'
                        : 'text-[#43474f] hover:bg-white/60 hover:text-[#0b1c30]'
                    }`}
                  >
                    <span
                      className={`material-symbols-outlined text-[22px] ${
                        isActive ? 'text-[#006c4a]' : 'text-[#737780]'
                      }`}
                      style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {tab.icon}
                    </span>
                    <span className="text-[12px] mt-1">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Appliance Specs & Model Selection */}
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 기종 선택 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#00254a] flex items-center justify-between">
                  <span>
                    기종 선택 <span className="text-[#ba1a1a]">*</span>
                  </span>
                  <span className="text-[11px] text-[#737780] font-normal">분해 난이도 상</span>
                </label>
                <div className="relative">
                  <select
                    id="appliance-type"
                    value={selectedApplianceCd}
                    onChange={(e) => handleSelectAppliance(e.target.value)}
                    className="w-full appearance-none bg-white text-[#0b1c30] text-[13px] px-3.5 py-3 rounded-xl shadow-sm focus:outline-none focus:bg-[#eff4ff] transition-all cursor-pointer border border-[#c3c6d0]"
                  >
                    {filteredAppliances.map((item) => (
                      <option key={item.applianceCd} value={item.applianceCd}>
                        {item.applianceNm}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3.5 pointer-events-none text-[#737780] text-[20px]">
                    expand_more
                  </span>
                </div>
              </div>

              {/* 제조사 선택 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#00254a]">
                  제조사 선택 <span className="text-[#ba1a1a]">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full appearance-none bg-white text-[#0b1c30] text-[13px] px-3.5 py-3 rounded-xl shadow-sm focus:outline-none focus:bg-[#eff4ff] transition-all cursor-pointer border border-[#c3c6d0]"
                  >
                    {activeTab === 'MATTRESS' ? (
                      <>
                        <option value="에이스침대">에이스침대 (Ace)</option>
                        <option value="시몬스">시몬스 (Simmons)</option>
                        <option value="템퍼">템퍼 (Tempur)</option>
                        <option value="씰리">씰리 (Sealy)</option>
                        <option value="지누스">지누스 (Zinus)</option>
                        <option value="기타 브랜드">기타 브랜드</option>
                      </>
                    ) : (
                      <>
                        <option value="LG전자">LG전자</option>
                        <option value="삼성전자">삼성전자</option>
                        <option value="캐리어">캐리어 (Carrier)</option>
                        <option value="위니아">위니아 (Winia)</option>
                        <option value="기타 제조사">기타 수입/전문 브랜드</option>
                      </>
                    )}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3.5 pointer-events-none text-[#737780] text-[20px]">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* 상세 모델명 또는 구입 연식 입력 (선택) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[13px] font-bold text-[#00254a]">상세 모델명 또는 구입 연식</label>
                <span className="text-[11px] text-[#737780]">선택 기재 시 매칭 가속</span>
              </div>
              <input
                type="text"
                value={modelDetail}
                onChange={(e) => setModelDetail(e.target.value)}
                placeholder={
                  activeTab === 'AIR_CON'
                    ? '예: LG 휘센 듀얼 에어컨 / 2021년형'
                    : activeTab === 'WASHER'
                    ? '예: 삼성 그랑데 AI 16kg / 2022년형'
                    : activeTab === 'FRIDGE'
                    ? '예: LG 디오스 양문형 820L'
                    : '예: 에이스 하이브리드 테크 V 퀸사이즈'
                }
                className="w-full bg-white text-[13px] text-[#0b1c30] px-3.5 py-2.5 rounded-xl shadow-sm placeholder:text-[#737780] focus:outline-none focus:bg-[#eff4ff] transition-all border border-[#c3c6d0]"
              />
            </div>

            {/* 수량 카운터 Stepper UI */}
            <div className="flex items-center justify-between p-4 bg-[#eff4ff] rounded-xl border border-[#dce9ff]">
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-[#00254a]">신청 수량</span>
                <span className="text-[12px] text-[#43474f]">동일 모델 2대 이상 시 다량 할인 적용 검토</span>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-[#c3c6d0]">
                <button
                  type="button"
                  id="btn-decrement"
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#43474f] flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#dce9ff] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">remove</span>
                </button>
                <div className="w-14 text-center">
                  <span className="text-[17px] font-bold text-[#00254a]" id="unit-count-display">
                    {quantity}
                  </span>
                  <span className="text-[13px] text-[#43474f] ml-0.5">대</span>
                </div>
                <button
                  type="button"
                  id="btn-increment"
                  onClick={handleIncrement}
                  disabled={quantity >= 10}
                  className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#00254a] flex items-center justify-center transition-colors hover:bg-[#dce9ff] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Pricing & Lower-Limit Validation (희망 단가 및 하한선 검증) */}
          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-[#00254a]">
                대당 청소 희망 단가 <span className="text-[#ba1a1a]">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                {isLowerThanGuide ? (
                  <span className="text-[11px] font-bold text-[#ba1a1a] bg-[#ffdad6] px-2 py-0.5 rounded-full">
                    하한선 미달
                  </span>
                ) : (
                  <span className="text-[11px] font-bold text-[#006c4a] bg-[#85f8c4]/50 px-2 py-0.5 rounded-full">
                    ✓ 표준 하한선 준수
                  </span>
                )}
                <span className="text-[11px] text-[#737780]">정찰제 권장 가이드</span>
              </div>
            </div>

            <div className="relative flex items-center">
              <input
                id="unit-price-input"
                type="number"
                step="5000"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
                className="w-full bg-white text-[20px] font-bold text-[#00254a] px-4 py-3 rounded-xl shadow-sm focus:outline-none focus:bg-[#eff4ff] transition-all pr-12 text-right tracking-tight border border-[#c3c6d0] font-mono"
              />
              <span className="absolute right-4 text-[17px] text-[#00254a] font-bold pointer-events-none">
                원
              </span>
            </div>

            {/* 하한선 검증 알림 박스 (Validation Guide Box) */}
            <div
              className={`p-4 rounded-xl flex flex-col gap-1 border transition-all ${
                isLowerThanGuide
                  ? 'bg-[#ffdad6]/40 border-[#ffdad6] text-[#ba1a1a]'
                  : 'bg-[#82f5c1]/20 border-[#82f5c1]/60 text-[#00714e]'
              }`}
            >
              <div className="flex items-start gap-2">
                <span
                  className={`material-symbols-outlined text-[20px] mt-0.5 shrink-0 ${
                    isLowerThanGuide ? 'text-[#ba1a1a]' : 'text-[#006c4a]'
                  }`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {isLowerThanGuide ? 'warning' : 'info'}
                </span>
                <div className="flex flex-col">
                  <p
                    className={`text-[13px] font-bold ${
                      isLowerThanGuide ? 'text-[#ba1a1a]' : 'text-[#00714e]'
                    }`}
                  >
                    {isLowerThanGuide
                      ? `※ ${currentAppliance.applianceNm}의 최소 권장 하한선은 ${currentAppliance.minGuidePrice.toLocaleString()}원입니다.`
                      : `${currentAppliance.applianceNm} 완전분해 세척 권장 하한선은 ${currentAppliance.minGuidePrice.toLocaleString()}원입니다.`}
                  </p>
                  <p
                    className={`text-[12px] mt-0.5 leading-relaxed ${
                      isLowerThanGuide ? 'text-[#93000a]' : 'text-[#006c4a]'
                    }`}
                  >
                    {isLowerThanGuide
                      ? '권장 하한선보다 낮은 금액을 제시하면 마스터 파트너의 입찰 참여율이 저조하거나 배차가 지연될 수 있습니다.'
                      : '친환경 약품 도포, 송풍팬 및 열교환기 고압 수세, 피톤치드 살균 공정이 기본 포함되어 마스터 파트너의 평균 입찰 배차가 15분 이내로 확정됩니다.'}
                  </p>
                </div>
              </div>
            </div>

            {/* 총 가전 용역 금액 계산 요약 (Calculated Total Container) */}
            <div className="mt-1 p-4 rounded-xl bg-[#e5eeff] flex items-center justify-between border border-[#dce9ff]">
              <div className="flex flex-col">
                <span className="text-[11px] text-[#43474f] uppercase tracking-wider font-bold">
                  Estimated Total
                </span>
                <span className="text-[15px] text-[#00254a] font-bold">총 가전 용역 합산 금액</span>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-baseline gap-1">
                  <span
                    className="text-[24px] text-[#00254a] font-extrabold tracking-tight font-mono"
                    id="total-price-display"
                  >
                    {totalAmt.toLocaleString()}
                  </span>
                  <span className="text-[15px] text-[#00254a] font-bold">원</span>
                </div>
                <span className="text-[11px] text-[#43474f]" id="price-vat-note">
                  {quantity}대 기준 (VAT 별도)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Bottom Action Buttons */}
        <div className="px-6 py-4 bg-[#eff4ff] flex items-center justify-end gap-3 border-t border-[#dce9ff]">
          <button
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-white border border-[#c3c6d0] text-[#43474f] hover:text-[#0b1c30] hover:bg-[#dce9ff] text-[14px] font-bold transition-colors cursor-pointer"
            type="button"
          >
            취소
          </button>
          <button
            onClick={handleConfirmAdd}
            className="px-6 py-3 rounded-xl bg-[#006c4a] hover:bg-[#00714e] text-white text-[14px] font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            type="button"
          >
            <span>가전 품목 추가하기</span>
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
          </button>
        </div>
      </div>
    </div>
  );
}
