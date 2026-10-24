/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 프론트엔드 모달 컴포넌트
 * 화면 ID: USER-REQ-01 (정기청소 중분류 추가 모달)
 * 파일 경로: SsulDak_Web/User/frontend/USER-REQ-01/index.tsx
 * 백엔드 라우터 경로: SsulDak_Web/User/backend/api_USER_REQ_01/route.ts
 * API 엔드포인트 URL: POST /api/user/user_req_01
 * 전용 쿼리 식별자: USER-REQ-01-SQL-001 ~ USER-REQ-01-SQL-002
 * 호출 부모 컴포넌트: USER-REQ-00 (통합 청소 견적 신청서)
 * =============================================================================
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';

export interface RegularItemToAdd {
  areaCd: string;
  areaNm: string;
  startFloor?: number | string;
  endFloor?: number | string;
  cycleCd: string;
  cycleNm: string;
  propAmt: number;
}

export interface UserReq01ModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onAddItem?: (item: RegularItemToAdd) => void;
  apiEndpoint?: string;
  isStandalone?: boolean;
}

export interface CategoryCardData {
  areaCd: string;
  areaNm: string;
  icon: string;
  desc: string;
  defaultAmt: number;
}

export default function UserReq01Modal({
  isOpen = true,
  onClose,
  onAddItem,
  apiEndpoint = '/api/user/user_req_01',
  isStandalone = false,
}: UserReq01ModalProps) {
  // ---------------------------------------------------------------------------
  // 1. 구역 카드 정의 (6대 공통 코드 카드)
  // ---------------------------------------------------------------------------
  const categoryCards: CategoryCardData[] = [
    {
      areaCd: 'STAIR',
      areaNm: '계단 청소',
      icon: 'stairs',
      desc: '복도 난간 및 손잡이, 계단 바닥 청소',
      defaultAmt: 180000,
    },
    {
      areaCd: 'SURROUND',
      areaNm: '건물 주위 / 외곽',
      icon: 'apartment',
      desc: '필로티 주차장, 건물 외곽 정돈',
      defaultAmt: 120000,
    },
    {
      areaCd: 'BASEMENT',
      areaNm: '지하 창고 / 공용공간',
      icon: 'warehouse',
      desc: '지하 기계실 복도 및 방재실 주변',
      defaultAmt: 100000,
    },
    {
      areaCd: 'PARKING',
      areaNm: '지하 주차장',
      icon: 'local_parking',
      desc: '바닥 물청소 및 배수로 관리',
      defaultAmt: 150000,
    },
    {
      areaCd: 'CORRIDOR',
      areaNm: '복도 / 난간',
      icon: 'door_sliding',
      desc: '각 층 공용 복도 벽면 및 창틀',
      defaultAmt: 100000,
    },
    {
      areaCd: 'RECYCLE',
      areaNm: '쓰레기 분리수거장',
      icon: 'delete_sweep',
      desc: '재활용 분리함 및 거치대 정돈',
      defaultAmt: 90000,
    },
  ];

  // ---------------------------------------------------------------------------
  // 2. 내부 폼 상태
  // ---------------------------------------------------------------------------
  const [selectedAreaCd, setSelectedAreaCd] = useState<string>('STAIR');
  const [startFloor, setStartFloor] = useState<string>('1');
  const [endFloor, setEndFloor] = useState<string>('4');
  const [cycleCd, setCycleCd] = useState<string>('WEEKLY_1');
  const [propAmt, setPropAmt] = useState<number>(180000);
  const [guideInfo, setGuideInfo] = useState<{
    floorCount: number;
    minGuidePrice: number;
    guideMsg: string;
  }>({
    floorCount: 4,
    minGuidePrice: 180000,
    guideMsg: '4층 빌라 계단청소 3개월 최소 권장 하한선은 180,000원(월 6만 원)입니다.',
  });

  // 층수 계산 (B1은 0층으로 간주)
  const floorCount = useMemo(() => {
    const parse = (f: string) => (f === 'B1' ? 0 : Number(f));
    const sf = parse(startFloor);
    const ef = parse(endFloor);
    return Math.max(1, Math.abs(ef - sf) + 1);
  }, [startFloor, endFloor]);

  // 방문 주기 명칭
  const cycleNameMap: Record<string, string> = {
    WEEKLY_1: '주 1회 (월 4회)',
    WEEKLY_2: '주 2회 (월 8회)',
    WEEKLY_3: '주 3회 (월 12회)',
    BIWEEKLY: '격주 1회 (월 2회)',
  };

  const selectedCategory = useMemo(() => {
    return categoryCards.find((c) => c.areaCd === selectedAreaCd) || categoryCards[0];
  }, [selectedAreaCd]);

  // ---------------------------------------------------------------------------
  // 3. 권장 하한선 실시간 연동 (CALC_GUIDE_PRICE)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const fetchGuidePrice = async () => {
      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'CALC_GUIDE_PRICE',
            areaCd: selectedAreaCd,
            startFloor,
            endFloor,
            cycleCd,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setGuideInfo({
            floorCount: data.floorCount || floorCount,
            minGuidePrice: data.minGuidePrice || 180000,
            guideMsg: data.guideMsg || '권장 단가를 확인하세요.',
          });
        }
      } catch {
        // 기본 로컬 계산
        const base = selectedCategory.defaultAmt;
        const diff = (floorCount - 4) * 20000;
        const calc = Math.max(120000, base + diff);
        setGuideInfo({
          floorCount,
          minGuidePrice: calc,
          guideMsg: `${floorCount}개 층 작업 기준 3개월 최소 권장 하한선은 ${calc.toLocaleString()}원입니다.`,
        });
      }
    };

    fetchGuidePrice();
  }, [selectedAreaCd, startFloor, endFloor, cycleCd, floorCount, apiEndpoint, selectedCategory]);

  // 구역 변경 시 기본 금액 동기화
  const handleSelectArea = (areaCd: string) => {
    setSelectedAreaCd(areaCd);
    const target = categoryCards.find((c) => c.areaCd === areaCd);
    if (target) {
      setPropAmt(target.defaultAmt);
    }
  };

  // ---------------------------------------------------------------------------
  // 4. 모달 추가 완료 액션
  // ---------------------------------------------------------------------------
  const handleConfirmAdd = () => {
    const formattedAreaNm =
      selectedAreaCd === 'STAIR'
        ? `계단 청소 (${startFloor === 'B1' ? '지하1' : startFloor}~${endFloor}층)`
        : selectedCategory.areaNm;

    const item: RegularItemToAdd = {
      areaCd: selectedAreaCd,
      areaNm: formattedAreaNm,
      startFloor,
      endFloor,
      cycleCd,
      cycleNm: cycleNameMap[cycleCd] || '주 1회',
      propAmt: Number(propAmt) || selectedCategory.defaultAmt,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      {/* Desktop Modal Container (620px width standard, pristine card styling) */}
      <div className="relative w-full max-w-[620px] bg-white rounded-2xl shadow-2xl flex flex-col my-auto overflow-hidden animate-fadeIn border border-[#e5eeff]">
        {/* Top Primary Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#163b66] via-[#00254a] to-[#006c4a]"></div>

        {/* 1. Modal Header */}
        <div className="p-6 pb-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#e5eeff] text-[#254873] text-[11px] font-bold tracking-tight">
                TB_COM_CODE 연동
              </span>
              <span className="px-2 py-0.5 rounded bg-[#85f8c4]/60 text-[#002114] text-[11px] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a]"></span>
                정기청소 구역 설정
              </span>
            </div>
            {/* Close button with hover circle effect */}
            <button
              aria-label="모달 닫기"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#43474f] hover:text-[#0b1c30] hover:bg-[#e5eeff] transition-all cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="flex flex-col gap-1 mt-1">
            <h1 className="text-[24px] lg:text-[26px] text-[#0b1c30] font-extrabold tracking-tight">
              정기청소 중분류 구역 추가
            </h1>
            <p className="text-[13px] text-[#43474f] leading-relaxed">
              관리 대상 빌딩·상가의 청소 구역과 방문 주기를 설정하고 희망 단가를 입력해주세요.
            </p>
          </div>
        </div>

        {/* Modal Body (Scrollable if viewport is compact) */}
        <div className="p-6 pt-2 flex flex-col gap-5 max-h-[calc(88vh-140px)] overflow-y-auto">
          {/* 2. Section 1: Subcategory Grid (TB_COM_CODE) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[14px] text-[#0b1c30] font-bold flex items-center gap-1">
                청소 관리 구역 (중분류 선택)
                <span className="text-[#ba1a1a] font-bold">*</span>
              </label>
              <span className="text-[11px] text-[#737780]">단일 또는 우선 중점 구역</span>
            </div>

            {/* 6 Selectable Grid Cards */}
            <div className="grid grid-cols-2 gap-2.5 pt-1" id="categoryGrid">
              {categoryCards.map((card) => {
                const isSelected = selectedAreaCd === card.areaCd;
                return (
                  <button
                    key={card.areaCd}
                    type="button"
                    onClick={() => handleSelectArea(card.areaCd)}
                    className={`group relative flex flex-col text-left p-3.5 rounded-xl transition-all shadow-sm cursor-pointer ${
                      isSelected
                        ? 'bg-[#eff4ff] ring-2 ring-[#00254a]'
                        : 'bg-white hover:bg-[#f8f9ff] border border-[#dce9ff]/60 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-md flex items-center justify-center ${
                            isSelected ? 'bg-[#00254a] text-white' : 'bg-[#e5eeff] text-[#43474f] group-hover:text-[#00254a]'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">{card.icon}</span>
                        </div>
                        <span
                          className={`text-[15px] font-bold ${
                            isSelected ? 'text-[#00254a]' : 'text-[#0b1c30]'
                          }`}
                        >
                          {card.areaNm}
                        </span>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-[#00254a] text-white' : 'bg-[#dce9ff] text-[#737780]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {isSelected ? 'check' : 'add'}
                        </span>
                      </div>
                    </div>
                    <p className="text-[12px] text-[#43474f] line-clamp-1">{card.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Section 2: Scope & Frequency Config */}
          <div className="p-4 rounded-xl bg-[#eff4ff] flex flex-col gap-4 border border-[#dce9ff]/70">
            {/* Row 1: Floor Range (계단 청소 선택 시 강조) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#0b1c30] font-bold">작업 층수 범위</span>
                <span className="px-2 py-0.5 rounded-full bg-[#00254a] text-white text-[11px] font-semibold">
                  총 {floorCount}개 층 작업
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* Start Floor Dropdown */}
                <div className="relative flex-1">
                  <select
                    value={startFloor}
                    onChange={(e) => setStartFloor(e.target.value)}
                    className="w-full h-11 px-3.5 pr-8 rounded-xl bg-white text-[#0b1c30] text-[13px] shadow-sm appearance-none focus:outline-none border border-[#c3c6d0]"
                  >
                    <option value="B1">지하 1 층 (B1)</option>
                    <option value="1">1 층 (지상)</option>
                    <option value="2">2 층</option>
                    <option value="3">3 층</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 text-[18px] text-[#737780] pointer-events-none">
                    expand_more
                  </span>
                </div>

                <span className="text-[17px] text-[#737780]">~</span>

                {/* End Floor Dropdown */}
                <div className="relative flex-1">
                  <select
                    value={endFloor}
                    onChange={(e) => setEndFloor(e.target.value)}
                    className="w-full h-11 px-3.5 pr-8 rounded-xl bg-white text-[#0b1c30] text-[13px] shadow-sm appearance-none focus:outline-none border border-[#c3c6d0]"
                  >
                    <option value="2">2 층</option>
                    <option value="3">3 층</option>
                    <option value="4">4 층 (최상층)</option>
                    <option value="5">5 층 (옥상포함)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-3 text-[18px] text-[#737780] pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* Row 2: Frequency */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] text-[#0b1c30] font-bold">방문 주기</span>
              <div className="relative w-full">
                <select
                  value={cycleCd}
                  onChange={(e) => setCycleCd(e.target.value)}
                  className="w-full h-11 px-3.5 pr-8 rounded-xl bg-white text-[#0b1c30] text-[13px] shadow-sm appearance-none focus:outline-none border border-[#c3c6d0]"
                >
                  <option value="WEEKLY_1">주 1회 방문 (월 4회 기준)</option>
                  <option value="WEEKLY_2">주 2회 방문 (월 8회 기준)</option>
                  <option value="WEEKLY_3">주 3회 방문 (월 12회 기준)</option>
                  <option value="BIWEEKLY">격주 1회 방문 (월 2회 기준)</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-3 text-[18px] text-[#737780] pointer-events-none">
                  expand_more
                </span>
              </div>
              <p className="text-[12px] text-[#43474f] flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[15px] text-[#006c4a]">verified</span>
                통상적인 빌라·상가 기본 주기로 파트너들의 입찰 참여율이 가장 높습니다.
              </p>
            </div>
          </div>

          {/* 4. Section 3: Pricing Input & Minimum Guide */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-[14px] text-[#0b1c30] font-bold flex items-center gap-1">
                3개월 청소 용역 희망 단가
                <span className="text-[#ba1a1a] font-bold">*</span>
              </label>
              <span className="text-[13px] text-[#006c4a] font-bold bg-[#85f8c4]/50 px-2.5 py-0.5 rounded-full">
                (월 환산 {Math.round(propAmt / 3).toLocaleString()}원)
              </span>
            </div>

            <div className="relative flex items-center">
              <input
                className="w-full h-13 py-3 px-4 text-[22px] font-bold text-[#00254a] bg-white rounded-xl shadow-sm text-left tracking-tight focus:outline-none focus:bg-[#eff4ff] transition-all pl-4 pr-12 border border-[#c3c6d0] font-mono"
                type="number"
                step="10000"
                value={propAmt}
                onChange={(e) => setPropAmt(Number(e.target.value) || 0)}
              />
              <span className="absolute right-4 text-[17px] text-[#43474f] font-bold pointer-events-none">
                원
              </span>
            </div>

            {/* Minimum Floor Guide Box */}
            <div className="p-3.5 rounded-xl bg-[#dce9ff]/60 border border-[#c3c6d0]/60 flex items-start gap-2.5 mt-1">
              <span className="material-symbols-outlined text-[#00254a] text-[20px] shrink-0 mt-0.5">info</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] text-[#00254a] font-bold">
                  {guideInfo.guideMsg}
                </span>
                <p className="text-[12px] text-[#43474f] leading-snug">
                  비현실적인 저가 책정 시 파트너 입찰이 유찰될 수 있어 실시간 견적 가이드라인을 제공합니다.
                </p>
                {propAmt < guideInfo.minGuidePrice && (
                  <p className="text-[12px] text-[#ba1a1a] font-bold mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">warning</span>
                    ※ 입력하신 금액이 권장 하한선보다 낮습니다. 입찰 참여 파트너 수가 감소할 수 있습니다.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 5. Section 4: Estimated Summary Preview */}
          <div className="p-3.5 rounded-xl bg-[#e5eeff] flex items-center justify-between border border-[#dce9ff]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00254a] text-[18px]">playlist_add_check</span>
              <span className="text-[13px] text-[#0b1c30]">
                <strong className="text-[#00254a] font-bold">추가 예정:</strong> [{selectedCategory.areaNm}
                {selectedAreaCd === 'STAIR' ? ` (${startFloor === 'B1' ? '지하1' : startFloor}~${endFloor}층)` : ''}]
                · {cycleNameMap[cycleCd] || '주 1회'} · 3개월 {propAmt.toLocaleString()}원
              </span>
            </div>
            <span className="text-[12px] text-[#006c4a] font-bold">
              월 {Math.round(propAmt / 3).toLocaleString()}원
            </span>
          </div>
        </div>

        {/* 6. Modal Footer Action */}
        <div className="p-6 pt-3 bg-white flex items-center justify-end gap-3 border-t border-[#eff4ff]">
          <button
            onClick={onClose}
            className="px-5 h-[50px] rounded-xl bg-[#dce9ff] text-[#43474f] text-[14px] font-bold hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-all flex items-center justify-center cursor-pointer"
            type="button"
          >
            취소
          </button>
          <button
            onClick={handleConfirmAdd}
            className="flex-1 max-w-[280px] h-[50px] rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white text-[14px] font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-[19px]">add_circle</span>
            <span>선택 구역 추가하기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
