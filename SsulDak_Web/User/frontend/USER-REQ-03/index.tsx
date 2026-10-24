/**
 * =============================================================================
 * SsulDak (쓸고닦고) 풀스택 프론트엔드 모달 컴포넌트
 * 화면 ID: USER-REQ-03 (주소 검색 팝업)
 * 파일 경로: SsulDak_Web/User/frontend/USER-REQ-03/index.tsx
 * 백엔드 라우터 경로: SsulDak_Web/User/backend/api_USER_REQ_03/route.ts
 * API 엔드포인트 URL: POST /api/user/user_req_03
 * 전용 쿼리 식별자: USER-REQ-03-SQL-001 ~ USER-REQ-03-SQL-004
 * 호출 부모 컴포넌트: USER-REQ-00 (통합 청소 견적 신청서)
 * =============================================================================
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';

export interface SelectedAddress {
  zonecode: string;
  roadAddr: string;
  jibunAddr?: string;
  bname?: string;
  buildingName?: string;
}

export interface UserReq03ModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSelectAddr?: (addr: SelectedAddress) => void;
  initialKeyword?: string;
  userNo?: string;
  apiEndpoint?: string;
}

export interface AddressResultItem {
  zonecode: string;
  roadAddr: string;
  jibunAddr: string;
  bname: string;
  buildingName?: string;
  accuracy?: string;
}

export interface RecentAddressItem {
  addrSeq: number;
  zonecode: string;
  roadAddr: string;
  jibunAddr: string;
  bname: string;
  lastUsedDt: string;
}

export default function UserReq03Modal({
  isOpen = true,
  onClose,
  onSelectAddr,
  initialKeyword = '중앙로 1234',
  userNo = 'U20261000001',
  apiEndpoint = '/api/user/user_req_03',
}: UserReq03ModalProps) {
  const [keyword, setKeyword] = useState<string>(initialKeyword);
  const [results, setResults] = useState<AddressResultItem[]>([]);
  const [recentList, setRecentList] = useState<RecentAddressItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedRoad, setSelectedRoad] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [manualAddr, setManualAddr] = useState<string>('');

  // ---------------------------------------------------------------------------
  // 1. 최근 주소 이력 조회 (GET_RECENT_ADDR)
  // ---------------------------------------------------------------------------
  const fetchRecentAddresses = useCallback(async () => {
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'GET_RECENT_ADDR',
          userNo,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.recentList)) {
        setRecentList(data.recentList);
      }
    } catch (err) {
      console.warn('[USER-REQ-03] 최근 주소 로드 실패:', err);
    }
  }, [apiEndpoint, userNo]);

  // ---------------------------------------------------------------------------
  // 2. 키워드 검색 수행 (SEARCH_KEYWORD)
  // ---------------------------------------------------------------------------
  const handleSearch = useCallback(
    async (targetKeyword: string = keyword, page: number = 1) => {
      setIsLoading(true);
      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'SEARCH_KEYWORD',
            keyword: targetKeyword.trim(),
            currentPage: page,
            countPerPage: 10,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success && Array.isArray(data.results)) {
          setResults(data.results);
          setTotalCount(data.totalCount || data.results.length);
          setCurrentPage(page);
        }
      } catch (err) {
        console.warn('[USER-REQ-03] 주소 검색 실패:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [apiEndpoint, keyword]
  );

  // 모달 오픈 시 초기 검색 및 최근 주소 조회
  useEffect(() => {
    if (isOpen) {
      fetchRecentAddresses();
      handleSearch(initialKeyword, 1);
    }
  }, [isOpen, fetchRecentAddresses, handleSearch, initialKeyword]);

  // ---------------------------------------------------------------------------
  // 3. 주소 선택 처리 (SAVE_RECENT_ADDR 비동기 호출 & 콜백 바인딩)
  // ---------------------------------------------------------------------------
  const handleSelectAddress = async (item: SelectedAddress) => {
    setSelectedRoad(item.roadAddr);

    // 비동기 이력 저장 (백그라운드)
    try {
      fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'SAVE_RECENT_ADDR',
          userNo,
          zonecode: item.zonecode,
          roadAddr: item.roadAddr,
          jibunAddr: item.jibunAddr,
          bname: item.bname,
        }),
      }).catch((e) => console.warn('최근 주소 저장 실패(무시가능):', e));
    } catch {
      // ignore
    }

    // 시각적 피드백 후 부모 화면으로 전달
    setTimeout(() => {
      if (onSelectAddr) {
        onSelectAddr(item);
      }
      if (onClose) {
        onClose();
      }
    }, 180);
  };

  // 주소 직접 입력 제출
  const handleManualSubmit = () => {
    if (!manualAddr.trim()) return;
    const manualItem: SelectedAddress = {
      zonecode: '00000',
      roadAddr: manualAddr.trim(),
      jibunAddr: manualAddr.trim(),
    };
    handleSelectAddress(manualItem);
  };

  if (!isOpen) return null;

  return (
    <div
      id="address-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#00254a]/45 backdrop-blur-[6px] transition-opacity duration-300 overflow-y-auto"
    >
      {/* Modal Card (Bespoke 570px Width Precision Card) */}
      <div
        id="address-modal-window"
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
        className="w-full max-w-[570px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[920px] my-auto border border-[#e5eeff] animate-fadeIn"
      >
        {/* Top Accent Gradient Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#163b66] via-[#00254a] to-[#006c4a]"></div>

        {/* 1. Modal Header */}
        <div className="p-6 pb-3 bg-white flex items-start justify-between">
          <div className="flex flex-col gap-1.5">
            {/* Institutional Verified Pill */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#82f5c1]/30 text-[#00714e] w-fit">
              <span className="material-symbols-outlined text-[14px] text-[#006c4a]">verified</span>
              <span className="text-[11px] font-bold tracking-tight">행정안전부 도로명주소 API 실시간 연동</span>
            </div>
            <div className="pt-0.5">
              <h2 id="modal-title" className="text-[20px] font-bold text-[#00254a] tracking-tight">
                주소 검색
              </h2>
              <p className="text-[13px] text-[#43474f]">
                정확한 청소지 도로명 주소 또는 주요 건물명을 입력해주세요.
              </p>
            </div>
          </div>
          {/* Close Button */}
          <button
            id="btn-close-modal"
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#eff4ff] text-[#43474f] hover:bg-[#e5eeff] hover:text-[#00254a] transition-colors flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* 2. Search Input Section */}
        <div className="px-6 pt-1 pb-3 flex flex-col gap-2.5">
          <form
            id="address-search-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(keyword, 1);
            }}
            className="relative flex items-center"
          >
            <div className="absolute left-3.5 flex items-center pointer-events-none text-[#737780]">
              <span className="material-symbols-outlined text-[22px]">search</span>
            </div>
            <input
              id="address-search-input"
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="도로명, 건물명, 지번 검색 (예: 테헤란로 152, 역삼동 737)"
              className="w-full pl-11 pr-24 py-3 bg-[#eff4ff] text-[#0b1c30] text-[14px] rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#163b66]/20 transition-all placeholder:text-[#737780]/70 border border-[#dce9ff]"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-[#163b66] hover:bg-[#00254a] text-white text-[13px] font-bold rounded-lg transition-all flex items-center gap-1 active:scale-95 shadow-sm cursor-pointer"
            >
              <span>{isLoading ? '검색중' : '검색'}</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </form>

          {/* Search Tip Callout */}
          <div className="px-3.5 py-2.5 rounded-xl bg-[#eff4ff] flex items-start gap-2 text-[#43474f] border border-[#dce9ff]/60">
            <span className="material-symbols-outlined text-[16px] text-[#e49200] mt-0.5 shrink-0">
              tips_and_updates
            </span>
            <p className="text-[11px] leading-relaxed">
              <strong className="font-bold text-[#00254a]">검색 Tip:</strong> 도로명 + 건물번호(예: 중앙로 1234), 동/읍/면 + 번지, 혹은 공식 건물명(예: 타워팰리스)을 입력하시면 가장 신속하게 조회됩니다.
            </p>
          </div>
        </div>

        {/* 최근 사용 주소 칩 (이력이 존재할 경우 상단 노출) */}
        {recentList.length > 0 && (
          <div className="px-6 py-2 bg-[#f8f9ff] border-y border-[#e5eeff] flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-[#43474f] flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] text-[#006c4a]">history</span>
              최근 신청 주소 바로 선택:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {recentList.map((rec) => (
                <button
                  key={rec.addrSeq}
                  type="button"
                  onClick={() =>
                    handleSelectAddress({
                      zonecode: rec.zonecode,
                      roadAddr: rec.roadAddr,
                      jibunAddr: rec.jibunAddr,
                      bname: rec.bname,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#dce9ff] text-[11px] text-[#00254a] hover:bg-[#eff4ff] hover:border-[#163b66] transition-all flex items-center gap-1 shadow-2xs cursor-pointer truncate max-w-[260px]"
                >
                  <span className="text-[#006c4a] font-mono font-bold">[{rec.zonecode}]</span>
                  <span className="truncate">{rec.roadAddr}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 3. Search Result Summary & Meta Filter */}
        <div className="px-6 py-2.5 bg-[#eff4ff] flex items-center justify-between border-b border-[#dce9ff]">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a]"></span>
            <span className="text-[13px] font-bold text-[#00254a]">
              검색결과 <strong id="result-count" className="text-[#006c4a] font-bold">{totalCount}</strong>건
            </span>
          </div>
          <span className="text-[11px] text-[#737780] flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">touch_app</span>
            선택 시 견적서에 자동 입력
          </span>
        </div>

        {/* 4. Scrollable Result List (Address Cards) */}
        <div className="px-6 py-3 overflow-y-auto space-y-2.5 flex-1 overscroll-contain max-h-[360px]">
          {isManualMode ? (
            <div className="p-4 rounded-xl bg-[#eff4ff] flex flex-col gap-3 border border-[#dce9ff]">
              <div className="flex items-center gap-1.5 text-[#00254a] font-bold text-[14px]">
                <span className="material-symbols-outlined text-[18px]">edit_location</span>
                <span>주소 직접 입력</span>
              </div>
              <input
                type="text"
                value={manualAddr}
                onChange={(e) => setManualAddr(e.target.value)}
                placeholder="상세 청소 대상지 주소를 입력하세요 (예: 서울특별시 종로구 청와대로 1)"
                className="w-full px-3.5 py-2.5 bg-white rounded-lg text-[13px] border border-[#c3c6d0] focus:outline-none"
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsManualMode(false)}
                  className="px-3 py-1.5 rounded-lg bg-white border border-[#c3c6d0] text-[12px] text-[#43474f]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleManualSubmit}
                  className="px-4 py-1.5 rounded-lg bg-[#00254a] text-white text-[12px] font-bold"
                >
                  적용하기
                </button>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-[#737780] text-[13px] flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-[32px] text-[#c3c6d0]">location_off</span>
              <p>검색 결과가 없습니다. 도로명이나 지번을 다시 확인해 주세요.</p>
              <button
                type="button"
                onClick={() => setIsManualMode(true)}
                className="mt-2 text-[12px] text-[#006c4a] underline font-bold"
              >
                주소를 직접 입력하시겠습니까?
              </button>
            </div>
          ) : (
            results.map((card, idx) => {
              const isSelected = selectedRoad === card.roadAddr;
              return (
                <div
                  key={`${card.zonecode}-${idx}`}
                  onClick={() => handleSelectAddress(card)}
                  className={`group address-card relative p-3.5 rounded-xl transition-all cursor-pointer shadow-sm border ${
                    isSelected
                      ? 'bg-[#82f5c1]/30 border-[#006c4a] ring-2 ring-[#006c4a]'
                      : 'bg-white hover:bg-[#eff4ff] border-[#e5eeff] hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      {/* Postal Code Badge & Matching Chip */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#006c4a] text-white text-[11px] tracking-wide font-mono font-bold">
                          <span className="material-symbols-outlined text-[12px]">markunread_mailbox</span>
                          우편번호 {card.zonecode}
                        </span>
                        {card.accuracy && (
                          <span className="px-2 py-0.5 rounded-md bg-[#d4e3ff] text-[#254873] text-[11px] font-bold">
                            정확도 {card.accuracy}
                          </span>
                        )}
                      </div>

                      {/* Road Name Address */}
                      <div className="flex items-baseline gap-1.5 pt-0.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#d3e4fe] text-[#00254a]">
                          도로명
                        </span>
                        <h3 className="text-[15px] text-[#00254a] font-bold group-hover:text-[#163b66] transition-colors truncate">
                          {card.roadAddr}
                        </h3>
                      </div>

                      {/* Jibun Address */}
                      {card.jibunAddr && (
                        <div className="flex items-center gap-1.5 text-[#43474f] text-[12px]">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#e5eeff] text-[#737780]">
                            지번
                          </span>
                          <span className="truncate">{card.jibunAddr}</span>
                        </div>
                      )}

                      {/* Building Landmark Info */}
                      {card.buildingName && (
                        <div className="flex items-center gap-1 text-[#737780] text-[11px] pt-0.5">
                          <span className="material-symbols-outlined text-[14px]">apartment</span>
                          <span className="text-[#43474f] font-semibold">{card.buildingName}</span>
                        </div>
                      )}
                    </div>

                    {/* Select Action Button */}
                    <button
                      type="button"
                      className="shrink-0 self-center px-3.5 py-2 rounded-lg bg-[#163b66] text-white group-hover:bg-[#00254a] text-[13px] font-bold flex items-center gap-1 shadow-sm transition-all transform active:scale-95 cursor-pointer"
                    >
                      <span>선택</span>
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. Bottom Notice & Modal Footer */}
        <div className="p-6 pt-3 bg-white space-y-3 border-t border-[#eff4ff]">
          {/* Pagination Controls */}
          <div className="flex items-center justify-center gap-1 py-0.5">
            <button
              type="button"
              onClick={() => handleSearch(keyword, Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#737780] flex items-center justify-center hover:bg-[#dce9ff] disabled:opacity-40 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            <button
              type="button"
              className="w-8 h-8 rounded-lg bg-[#00254a] text-white text-[12px] font-bold flex items-center justify-center cursor-pointer"
            >
              1
            </button>
            <button
              type="button"
              onClick={() => handleSearch(keyword, 2)}
              className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#0b1c30] text-[12px] flex items-center justify-center hover:bg-[#dce9ff] cursor-pointer"
            >
              2
            </button>
            <button
              type="button"
              onClick={() => handleSearch(keyword, currentPage + 1)}
              className="w-8 h-8 rounded-lg bg-[#eff4ff] text-[#737780] flex items-center justify-center hover:bg-[#dce9ff] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>

          {/* Information Callout */}
          <div className="flex items-center justify-between gap-2 text-[#737780] text-[11px] px-1">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#737780]">info</span>
              <span>찾으시는 주소가 없으신가요? 정부 도로명주소 안내시스템(juso.go.kr)에 등록된 표준 정보로 제공됩니다.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              id="btn-cancel-modal"
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#43474f] text-[13px] font-bold transition-colors cursor-pointer"
            >
              닫기
            </button>
            <button
              id="btn-manual-entry"
              type="button"
              onClick={() => setIsManualMode((prev) => !prev)}
              className="px-5 py-2.5 rounded-xl bg-[#163b66] text-white hover:bg-[#00254a] text-[13px] font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">edit_location_alt</span>
              <span>{isManualMode ? '목록으로 돌아가기' : '주소 직접 입력'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
