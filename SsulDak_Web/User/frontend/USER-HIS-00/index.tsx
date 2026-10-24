// SsulDak_Web/User/frontend/USER-HIS-00/index.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { ContractItem } from '../../backend/api_USER_HIS_00/route';

interface UserHis00Props {
  userNo?: string;
  onNavigate?: (path: string, params?: Record<string, any>) => void;
}

export default function UserHis00({
  userNo = 'U20261000001',
  onNavigate,
}: UserHis00Props) {
  // 탭 상태: 'ACTIVE' (진행 중인 청소) vs 'PAST' (지난 청소 완료 내역)
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PAST'>('ACTIVE');
  const [periodFilter, setPeriodFilter] = useState<string>('최근 3개월');
  const [serviceFilter, setServiceFilter] = useState<string>('전체 서비스');

  // 데이터 상태
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [counts, setCounts] = useState<{ active: number; past: number }>({
    active: 2,
    past: 1,
  });
  const [benefits, setBenefits] = useState<{ couponCnt: number; pointBalance: number }>({
    couponCnt: 2,
    pointBalance: 11000,
  });
  const [syncedAt, setSyncedAt] = useState<string>('10:42');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // 플로팅 토스트 상태
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastVisible, setToastVisible] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 2800);
  };

  // 백엔드 API 호출 함수
  const fetchContracts = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        let mappedServiceFilter = 'ALL';
        if (serviceFilter === '정기청소') mappedServiceFilter = 'REGULAR';
        else if (serviceFilter === '가전케어') mappedServiceFilter = 'APPLIANCE';
        else if (serviceFilter === '이사/입주청소') mappedServiceFilter = 'MOVEIN';

        const res = await fetch('/api/user/user_his_00', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userNo,
            tabType: activeTab,
            periodFilter,
            serviceFilter: mappedServiceFilter,
            page: 1,
            limit: 20,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setContracts(data.contracts || []);
            if (data.counts) setCounts(data.counts);
            if (data.benefits) setBenefits(data.benefits);
            if (data.syncedAt) setSyncedAt(data.syncedAt);
            if (isManualRefresh) {
              showToast('최신 시공 및 배차 현황이 동기화되었습니다.');
            }
          }
        }
      } catch (err) {
        console.warn('API error in USER-HIS-00, using current state:', err);
      } finally {
        setLoading(false);
        if (isManualRefresh) {
          setTimeout(() => setRefreshing(false), 600);
        }
      }
    },
    [userNo, activeTab, periodFilter, serviceFilter]
  );

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased selection:bg-primary-fixed selection:text-primary">
      {/* =====================================================================
          0. 인터랙티브 플로팅 토스트 알림
      ===================================================================== */}
      <div
        className={`fixed top-24 right-8 z-50 transform transition-all duration-300 flex items-center gap-2 px-4 py-2.5 bg-brand-navy text-on-primary rounded-xl shadow-2xl font-label-md text-label-md border border-white/20 ${
          toastVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-[-20px] opacity-0 pointer-events-none'
        }`}
      >
        <span className="material-symbols-outlined text-secondary-fixed text-[18px]">verified</span>
        <span>{toastMessage}</span>
      </div>

      {/* =====================================================================
          1. 고정형 GNB 헤더 (Header)
      ===================================================================== */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.05)] border-b border-surface-container-high/60">
        <div className="h-20 max-w-7xl mx-auto px-margin-desktop flex items-center justify-between">
          <div className="flex items-center gap-space-lg">
            <a
              className="flex items-center gap-space-xs text-primary transition-transform active:scale-95 cursor-pointer"
              onClick={() => onNavigate?.('user-com-00')}
            >
              <img
                alt="SsulDak Logo"
                className="h-9 w-auto object-contain"
                src="/logo.png"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://lh3.googleusercontent.com/aida/AEtjO1XlE5dGCq6Awu7YGl9jLXQCTA7t0IZsmJfZyUQSy_So39r5B_9DgKVRpNgn2lIWPB_vkFwbyJvxRauYr8NrBr8Ev5HNLHcxNuK1dyz8aQQON3nkYvZA0iFnBntaXm5YE-GRy1fdElMY7mqcgcLiOn6Igu7ZM3Dehje1BVaFd_UK3AteIgpBjbsnSSlBOEigu2qfzX9XgGZgL6mO3R9fV4YtByyCV6ArO-jWEfVoHeAtGM8Q98I4mu5IqYg';
                }}
              />
              <div className="flex flex-col ml-1">
                <span className="font-headline-md text-headline-md tracking-tight text-brand-navy leading-none font-bold">
                  SsulDak
                </span>
                <span className="font-label-sm text-label-sm text-secondary font-bold tracking-widest leading-none mt-1">
                  쓸고닦고 케어
                </span>
              </div>
            </a>

            <div className="h-6 w-px bg-surface-container-high hidden md:block"></div>

            <button
              className="flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container hover:text-on-surface text-on-surface-variant transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[18px] text-secondary">location_on</span>
              <span className="font-label-md text-label-md font-semibold text-on-surface">경기 고양시 일산동구</span>
              <span className="material-symbols-outlined text-[16px] text-outline">keyboard_arrow_down</span>
            </button>
          </div>

          <nav className="hidden lg:flex items-center gap-space-xs p-1 rounded-xl bg-surface-container-low">
            <a
              className="px-space-md py-2 rounded-lg font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
              onClick={() => onNavigate?.('user-com-00')}
            >
              홈
            </a>
            <a
              className="px-space-md py-2 rounded-lg font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
              onClick={() => onNavigate?.('user-qot-00')}
            >
              견적현황
            </a>
            <a
              className="px-space-md py-2 rounded-lg font-label-lg text-label-lg bg-brand-navy text-on-primary font-bold shadow-sm transition-all cursor-pointer"
              onClick={() => onNavigate?.('user-his-00')}
            >
              이용내역
            </a>
            <a
              className="px-space-md py-2 rounded-lg font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
              href="#"
            >
              쿠폰북
            </a>
            <a
              className="px-space-md py-2 rounded-lg font-label-lg text-label-lg text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
              onClick={() => onNavigate?.('user-ath-03')}
            >
              마이
            </a>
          </nav>

          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-xs">
              <button
                aria-label="장바구니 및 보관함"
                className="relative w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[22px]">inventory_2</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-secondary"></span>
              </button>
              <button
                aria-label="알림"
                className="relative w-10 h-10 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[22px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error"></span>
              </button>
            </div>
            <div className="h-6 w-px bg-surface-container-high hidden md:block"></div>
            <div
              className="w-8 h-8 rounded-full bg-brand-navy flex items-center justify-center shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onNavigate?.('user-ath-03')}
            >
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. 메인 컨텐츠 영역
      ===================================================================== */}
      <main className="w-full pt-20 bg-surface min-h-[calc(100vh-80px)] pb-16">
        <div className="flex flex-col w-full">
          <div className="w-full max-w-7xl mx-auto px-margin-desktop py-space-xl">
            {/* 상단 브레드크럼 & 실시간 동기화/새로고침 바 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm mb-space-lg">
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant"
              >
                <a
                  className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                  onClick={() => onNavigate?.('user-com-00')}
                >
                  <span className="material-symbols-outlined text-[16px]">home</span>
                  홈
                </a>
                <span className="text-outline-variant">/</span>
                <span className="text-on-surface-variant">이용내역</span>
                <span className="text-outline-variant">/</span>
                <span className="font-bold text-primary">청소 이용 내역</span>
              </nav>

              {/* Refresh & Sync Notice */}
              <div className="flex items-center gap-space-sm">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">
                  <span className="inline-block w-2 h-2 rounded-full bg-secondary"></span>
                  <span>동기화 완료 {syncedAt} 기준</span>
                </div>
                <button
                  aria-label="내역 새로고침"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-lowest shadow-sm hover:bg-surface-container text-primary font-label-md text-label-md transition-all active:scale-95 cursor-pointer border border-surface-container"
                  onClick={() => fetchContracts(true)}
                  type="button"
                >
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      refreshing ? 'animate-spin text-secondary' : ''
                    }`}
                  >
                    refresh
                  </span>
                  새로고침
                </button>
              </div>
            </div>

            {/* 타이틀 & 목적 안내 */}
            <div className="mb-space-xl">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                  <h1 className="font-headline-lg text-headline-lg font-bold text-primary tracking-tight">
                    청소 이용 내역
                  </h1>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    예약 및 진행 중인 청소 현황을 확인하고 시공 일정 및 사진 검수 리포트를 투명하게 관리하세요.
                  </p>
                </div>
              </div>
            </div>

            {/* 세그먼트 탭 & 필터 드롭다운 바 */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg pb-space-xs">
              {/* Tabs */}
              <div className="inline-flex items-center p-1.5 rounded-2xl bg-surface-container-low shadow-sm">
                <button
                  aria-current={activeTab === 'ACTIVE' ? 'page' : undefined}
                  className={`flex items-center gap-2 px-space-md py-2.5 rounded-xl font-label-lg text-label-lg transition-all cursor-pointer ${
                    activeTab === 'ACTIVE'
                      ? 'bg-surface-container-lowest text-brand-navy font-bold shadow-sm'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                  onClick={() => setActiveTab('ACTIVE')}
                  type="button"
                >
                  <span>진행 중인 청소</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm leading-none ${
                      activeTab === 'ACTIVE'
                        ? 'bg-brand-navy text-on-primary'
                        : 'bg-surface-container-highest text-on-surface'
                    }`}
                  >
                    {counts.active}
                  </span>
                </button>

                <button
                  aria-current={activeTab === 'PAST' ? 'page' : undefined}
                  className={`flex items-center gap-2 px-space-md py-2.5 rounded-xl font-label-lg text-label-lg transition-all cursor-pointer ${
                    activeTab === 'PAST'
                      ? 'bg-surface-container-lowest text-brand-navy font-bold shadow-sm'
                      : 'text-on-surface-variant hover:text-primary'
                  }`}
                  onClick={() => setActiveTab('PAST')}
                  type="button"
                >
                  <span>지난 청소 완료 내역</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm leading-none ${
                      activeTab === 'PAST'
                        ? 'bg-brand-navy text-on-primary'
                        : 'bg-surface-container-highest text-on-surface'
                    }`}
                  >
                    {counts.past}
                  </span>
                </button>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-space-sm self-end md:self-auto">
                <div className="relative">
                  <select
                    className="appearance-none bg-surface-container-lowest pl-space-md pr-8 py-2.5 rounded-xl text-on-surface font-label-md text-label-md shadow-sm focus:outline-none cursor-pointer border border-surface-container"
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                  >
                    <option value="최근 3개월">최근 3개월</option>
                    <option value="최근 6개월">최근 6개월</option>
                    <option value="2026년 전체">2026년 전체</option>
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                    expand_more
                  </span>
                </div>

                <div className="relative">
                  <select
                    className="appearance-none bg-surface-container-lowest pl-space-md pr-8 py-2.5 rounded-xl text-on-surface font-label-md text-label-md shadow-sm focus:outline-none cursor-pointer border border-surface-container"
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                  >
                    <option value="전체 서비스">전체 서비스</option>
                    <option value="정기청소">정기청소</option>
                    <option value="가전케어">가전케어</option>
                    <option value="이사/입주청소">이사/입주청소</option>
                  </select>
                  <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-outline text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>
            </div>

            {/* =====================================================================
                3. 메인 2컬럼 레이아웃 (좌측 8: 우측 4)
            ===================================================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-desktop items-start">
              {/* 좌측 컬럼: 계약 카드 리스트 (8 Cols) */}
              <div className="lg:col-span-8 flex flex-col gap-space-lg">
                {loading ? (
                  <div className="p-16 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col items-center justify-center text-center border border-surface-container">
                    <span className="material-symbols-outlined text-[36px] text-secondary animate-spin">
                      progress_activity
                    </span>
                    <p className="font-label-lg text-sm text-outline mt-3">청소 이용 내역을 불러오는 중입니다...</p>
                  </div>
                ) : contracts.length === 0 ? (
                  /* 내역 없을 때 Empty State */
                  <div className="p-16 rounded-2xl bg-surface-container-lowest shadow-sm flex flex-col items-center justify-center text-center border border-surface-container">
                    <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center text-outline mb-4">
                      <span className="material-symbols-outlined text-[36px]">cleaning_services</span>
                    </div>
                    <h3 className="font-headline-sm text-lg font-bold text-primary">
                      {activeTab === 'ACTIVE' ? '진행 중인 청소 내역이 없습니다.' : '지난 청소 완료 내역이 없습니다.'}
                    </h3>
                    <p className="font-body-md text-sm text-on-surface-variant mt-1.5 max-w-md">
                      {activeTab === 'ACTIVE'
                        ? '새로운 청소 견적을 신청하고 엄선된 마스터 파트너의 맞춤 제안을 받아보세요.'
                        : '완료된 청소 시공 내역이 없습니다. 쓸고닦고 프리미엄 케어를 지금 바로 시작해 보세요.'}
                    </p>
                    <button
                      className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-navy hover:bg-[#183a63] text-on-primary font-bold text-sm shadow-md transition-all cursor-pointer"
                      onClick={() => onNavigate?.('user-req-00')}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">add_circle</span>
                      새로운 청소 견적 신청 (USER-REQ-00)
                    </button>
                  </div>
                ) : (
                  contracts.map((c) => (
                    <article
                      key={c.contractNo}
                      className="bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-surface-container-high/60"
                    >
                      {/* Card Header */}
                      <div className="p-space-lg bg-surface-container-lowest flex flex-wrap items-center justify-between gap-space-sm">
                        <div className="flex items-center gap-space-sm">
                          {c.badgeType === 'CONFIRMED' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed-variant font-label-md text-label-md font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                              {c.badgeText}
                            </span>
                          )}
                          {c.badgeType === 'WAITING_PAY' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-label-md font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping"></span>
                              {c.badgeText}
                            </span>
                          )}
                          {c.badgeType === 'IN_PROGRESS' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-brand-navy font-label-md text-label-md font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                              {c.badgeText}
                            </span>
                          )}
                          {c.badgeType === 'COMPLETED' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container text-outline font-label-md text-label-md font-bold">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              {c.badgeText}
                            </span>
                          )}
                          {c.badgeType === 'CANCELLED' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-error-container text-error font-label-md text-label-md font-bold">
                              {c.badgeText}
                            </span>
                          )}

                          <span className="px-2.5 py-1 rounded-lg bg-surface-container text-primary font-label-sm text-label-sm font-semibold">
                            {c.serviceTypeNm}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-outline font-label-sm text-label-sm">
                          <span>계약번호</span>
                          <span className="font-mono text-brand-navy font-semibold">{c.contractNo}</span>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-px w-full bg-surface-container-low"></div>

                      {/* Card Body */}
                      <div className="p-space-lg flex flex-col gap-space-md">
                        {/* Service Title & Spec */}
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <h2 className="font-headline-md text-headline-md font-bold text-brand-navy">
                              {c.subItemNm}
                            </h2>
                            {c.serviceTypeCd === 'REGULAR' && (
                              <span className="px-2 py-0.5 rounded-md bg-primary-fixed text-brand-navy font-label-sm text-label-sm font-bold">
                                주 1회 케어
                              </span>
                            )}
                            {c.serviceTypeCd === 'APPLIANCE' && (
                              <span className="px-2 py-0.5 rounded-md bg-secondary-fixed text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold">
                                고압 스팀 분해
                              </span>
                            )}
                          </div>
                          <p className="font-body-md text-body-md text-on-surface-variant">
                            {c.serviceTypeCd === 'REGULAR'
                              ? '빌라 1~4층 공용 계단 · 복도 린스 물청소 + 분리수거함 및 지상 주차장 고압 정리'
                              : c.serviceTypeCd === 'APPLIANCE'
                              ? 'LG 휘센 스탠드 에어컨 완전분해 열교환기(핀) 고압 스팀 살균 세척 및 피톤치드 코팅'
                              : '전문 청소 장비 기반 입주 전 정밀 멸균 청소 패키지'}
                          </p>
                        </div>

                        {/* Detailed Spec Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md mt-space-xs p-space-md rounded-xl bg-surface-container-low/70">
                          {/* Partner Profile */}
                          <div className="flex items-start gap-space-sm">
                            <div className="relative w-12 h-12 rounded-xl bg-surface-container-lowest shadow-sm flex items-center justify-center shrink-0 overflow-hidden border border-surface-container">
                              <img
                                alt={c.companyNm}
                                className="w-full h-full object-cover"
                                src={c.profileImgUrl}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://lh3.googleusercontent.com/aida-public/AB6AXuCtVDOX_dLoEjGl_Cer-B0QyQOPLr2Yj-PIRDE3T7rF6by54b0eAvWQnfz96bxZYOjV-ijnadlVL1Ux6-8MtnswXhH0SF7Gp7JaAhCKHRNQODMIDiLKkot_K9y4R4pNOAQzlmQhazMbKSitZ0K4oUGTeb9IKAG-NR_emzgUWEzKWm_t9oLqTRK3WGBboENkonJDhyQ0Oth_iHNGLlq5id0w5sfDyHuQnja53K_r23EQIRQDQf1kdDOA';
                                }}
                              />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-label-lg text-label-lg font-bold text-brand-navy truncate">
                                  {c.companyNm}
                                </span>
                                <span
                                  className="material-symbols-outlined text-[16px] text-secondary"
                                  title="SsulDak 인증 파트너"
                                >
                                  verified
                                </span>
                              </div>
                              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                                {c.ceoNm ? `${c.ceoNm} 대표 마스터` : '공식인증 전문 엔지니어'}
                              </span>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span
                                  className="material-symbols-outlined text-[14px] text-tertiary-fixed-dim"
                                  style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                  star
                                </span>
                                <span className="font-label-sm text-label-sm font-bold text-on-surface">
                                  {c.avgRating.toFixed(1)}
                                </span>
                                <span className="font-body-sm text-body-sm text-outline">
                                  (리뷰 {c.reviewCnt}개)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Location */}
                          <div className="flex items-start gap-space-sm">
                            <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-primary shrink-0 shadow-sm border border-surface-container">
                              <span className="material-symbols-outlined text-[20px]">
                                {c.serviceTypeCd === 'APPLIANCE' ? 'apartment' : 'location_on'}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-label-sm text-label-sm text-outline font-semibold">
                                {c.serviceTypeCd === 'APPLIANCE' ? '서비스 장소' : '시공 대상지'}
                              </span>
                              <span className="font-body-md text-body-md font-semibold text-on-surface mt-0.5">
                                {c.addrRoad}
                              </span>
                              <span className="font-body-sm text-body-sm text-on-surface-variant">
                                {c.addrDetail}
                              </span>
                            </div>
                          </div>

                          {/* Next Schedule */}
                          <div className="flex items-start gap-space-sm md:col-span-2 pt-space-xs border-t-0">
                            <div className="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary shrink-0 shadow-sm border border-surface-container">
                              <span className="material-symbols-outlined text-[20px]">
                                {c.serviceTypeCd === 'APPLIANCE' ? 'alarm' : 'calendar_clock'}
                              </span>
                            </div>
                            <div className="flex flex-col flex-1">
                              <span className="font-label-sm text-label-sm text-outline font-semibold">
                                {c.serviceTypeCd === 'APPLIANCE'
                                  ? '예약 확정 일정'
                                  : activeTab === 'PAST'
                                  ? '시공 완료 일시'
                                  : '다음 방문 예정일'}
                              </span>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <span className="font-headline-sm text-headline-sm font-bold text-brand-navy">
                                  {c.serviceStartFormatted}
                                </span>
                                {c.serviceTypeCd === 'REGULAR' && activeTab === 'ACTIVE' && (
                                  <>
                                    <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm font-semibold">
                                      1회차 첫 방문
                                    </span>
                                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                                      · 매주 정기 방문 (현장 전담 2인 조 편성)
                                    </span>
                                  </>
                                )}
                                {c.serviceTypeCd === 'APPLIANCE' && (
                                  <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-primary font-label-sm text-label-sm font-semibold">
                                    예상 소요시간 약 90분
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 상태별 안내 박스 (WAITING_PAY 일 때 파트너 후결제 대기 안내) */}
                        {c.badgeType === 'WAITING_PAY' && (
                          <div className="p-space-md rounded-xl bg-surface-container-low flex items-start gap-3 border border-amber-200">
                            <span className="material-symbols-outlined text-amber-700 text-[22px] shrink-0 mt-0.5">
                              info
                            </span>
                            <div className="flex flex-col">
                              <span className="font-label-md text-label-md font-bold text-on-surface">
                                파트너 데이터 이용료 입금 절차 진행 중
                              </span>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-relaxed">
                                파트너사가 플랫폼 데이터 이용료를 납부(통상 1시간 이내 완료)하면 배차가 최종 확정되며
                                1:1 상담 채팅이 즉시 활성화됩니다.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Payment Summary Notice Box */}
                        <div className="p-space-sm rounded-xl bg-surface-container-lowest flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm border border-surface-container">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-secondary text-[20px]">payments</span>
                            <span className="font-body-sm text-body-sm text-on-surface">
                              <strong className="font-bold text-brand-navy">데이터 이용료 결제 완료</strong> (26,000원
                              결제완료)
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-label-sm text-label-sm text-outline">현장 직불 시공비</span>
                            <span className="font-label-lg text-label-lg font-bold text-brand-navy ml-1.5">
                              {c.serviceTypeCd === 'REGULAR'
                                ? `월 ${c.totalPayAmt.toLocaleString()}원`
                                : `${c.totalPayAmt.toLocaleString()}원`}
                            </span>
                          </div>
                        </div>

                        {/* Card Actions */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-space-sm pt-space-xs">
                          {activeTab === 'ACTIVE' ? (
                            <>
                              {c.canChat ? (
                                <button
                                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-md py-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-brand-navy font-label-lg text-label-lg font-semibold transition-all active:scale-98 cursor-pointer"
                                  onClick={() =>
                                    onNavigate?.('user-qot-02', {
                                      contractNo: c.contractNo,
                                      ptnrNo: c.ptnrNo,
                                      companyNm: c.companyNm,
                                    })
                                  }
                                  type="button"
                                >
                                  <span className="material-symbols-outlined text-[20px]">chat</span>
                                  1:1 상담 채팅
                                </button>
                              ) : (
                                <button
                                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-md py-3 rounded-xl bg-surface-container-low text-outline font-label-lg text-label-lg font-semibold cursor-not-allowed border border-surface-container"
                                  onClick={() =>
                                    showToast('파트너 이용료 납부 완료 후 1:1 상담 채팅이 즉시 활성화됩니다.')
                                  }
                                  type="button"
                                >
                                  <span className="material-symbols-outlined text-[18px]">lock</span>
                                  1:1 상담 채팅 (대기 중)
                                </button>
                              )}

                              <div className="w-full sm:w-auto flex items-center gap-space-xs">
                                {c.badgeType === 'WAITING_PAY' ? (
                                  <button
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-lg py-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-brand-navy font-label-lg text-label-lg font-bold shadow-sm transition-all active:scale-98 cursor-pointer"
                                    onClick={() => onNavigate?.('user-cnt-01', { contractNo: c.contractNo })}
                                    type="button"
                                  >
                                    예약 정보 상세 (USER-CNT-01)
                                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                  </button>
                                ) : (
                                  <button
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-lg py-3 rounded-xl bg-[#1F497D] hover:bg-[#183a63] text-on-primary font-label-lg text-label-lg font-bold shadow-sm transition-all active:scale-98 cursor-pointer"
                                    onClick={() => onNavigate?.('user-his-01', { contractNo: c.contractNo })}
                                    type="button"
                                  >
                                    진행 상세 · 사진 검수 (USER-HIS-01)
                                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                  </button>
                                )}
                              </div>
                            </>
                          ) : (
                            /* PAST 탭 액션 버튼 */
                            <>
                              <button
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-md py-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-brand-navy font-label-lg text-label-lg font-semibold transition-all cursor-pointer"
                                onClick={() => onNavigate?.('user-his-01', { contractNo: c.contractNo })}
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                시공 완료 리포트 보기
                              </button>

                              <div className="w-full sm:w-auto flex items-center gap-space-xs">
                                {c.canReview ? (
                                  <button
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-lg py-3 rounded-xl bg-secondary hover:bg-emerald-700 text-on-secondary font-label-lg text-label-lg font-bold shadow-sm transition-all cursor-pointer"
                                    onClick={() =>
                                      showToast('포토리뷰 작성 기능(USER-HIS-02)으로 연결됩니다. 작성 시 1,000P 지급!')
                                    }
                                    type="button"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">add_photo_alternate</span>
                                    포토리뷰 작성하고 1,000P 받기 (USER-HIS-02)
                                  </button>
                                ) : (
                                  <span className="text-xs text-outline font-medium px-3 py-1.5 rounded-lg bg-surface-container-low">
                                    리뷰 작성 완료 (+1,000P 적립됨)
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Bottom Guarantee Strip */}
                      <div className="px-space-lg py-2.5 bg-surface-container-low flex items-center gap-2 text-on-secondary-container border-t border-surface-container">
                        <span className="material-symbols-outlined text-secondary text-[18px]">verified_user</span>
                        <span className="font-label-sm text-label-sm font-semibold">
                          100% 무상 재시공 보증제 적용 · 시공 전/후 사진 검수 리포트 발행 완료
                        </span>
                      </div>
                    </article>
                  ))
                )}
              </div>

              {/* 우측 컬럼: 사이드바 요약 패널 (4 Cols) */}
              <aside className="lg:col-span-4 flex flex-col gap-space-lg">
                {/* 1. Quick Stat Summary Card */}
                <section className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md border border-surface-container-high/60">
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline-sm text-headline-sm font-bold text-brand-navy">내 케어 요약</h3>
                    <span className="material-symbols-outlined text-outline text-[20px]">dashboard_customize</span>
                  </div>

                  <div className="grid grid-cols-2 gap-space-sm">
                    <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col border border-surface-container">
                      <span className="font-label-sm text-label-sm text-outline">진행 중인 시공</span>
                      <span className="font-headline-lg text-headline-lg font-extrabold text-brand-navy mt-1">
                        {counts.active}
                        <span className="font-label-md text-label-md font-semibold text-on-surface-variant ml-1">
                          건
                        </span>
                      </span>
                    </div>
                    <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col border border-surface-container">
                      <span className="font-label-sm text-label-sm text-outline">검수 대기 리포트</span>
                      <span className="font-headline-lg text-headline-lg font-extrabold text-brand-navy mt-1">
                        0
                        <span className="font-label-md text-label-md font-semibold text-on-surface-variant ml-1">
                          건
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between border border-surface-container">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[20px]">confirmation_number</span>
                      <span className="font-label-md text-label-md font-semibold text-on-surface">보유 혜택</span>
                    </div>
                    <div className="flex items-center gap-2 font-label-md text-label-md">
                      <span className="text-brand-navy font-bold">쿠폰 {benefits.couponCnt}장</span>
                      <span className="text-outline-variant">·</span>
                      <span className="text-secondary font-bold">{benefits.pointBalance.toLocaleString()} P</span>
                    </div>
                  </div>

                  <button
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-space-md rounded-xl bg-[#1F497D] hover:bg-[#183a63] text-on-primary font-label-lg text-label-lg font-bold shadow-md transition-all active:scale-98 cursor-pointer"
                    onClick={() => onNavigate?.('user-req-00')}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    새로운 청소 견적 신청 (USER-REQ-00)
                  </button>
                </section>

                {/* 2. SsulDak 안심 보증 3대 약속 Card */}
                <section className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md border border-surface-container-high/60">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed-variant">
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm font-bold text-brand-navy">
                      SsulDak 안심 보증 3원칙
                    </h3>
                  </div>

                  <ul className="flex flex-col gap-space-sm">
                    <li className="p-space-sm rounded-xl bg-surface-container-low flex items-start gap-space-xs border border-surface-container">
                      <div className="w-6 h-6 rounded-full bg-surface-container-lowest flex items-center justify-center text-secondary font-bold text-label-sm shrink-0 shadow-sm border border-surface-container">
                        1
                      </div>
                      <div className="flex flex-col ml-1">
                        <span className="font-label-md text-label-md font-bold text-brand-navy">
                          시공 후 7일 이내 100% 무상 AS
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                          불만족 부위 발견 시 즉시 전담 마스터 재방문
                        </span>
                      </div>
                    </li>

                    <li className="p-space-sm rounded-xl bg-surface-container-low flex items-start gap-space-xs border border-surface-container">
                      <div className="w-6 h-6 rounded-full bg-surface-container-lowest flex items-center justify-center text-secondary font-bold text-label-sm shrink-0 shadow-sm border border-surface-container">
                        2
                      </div>
                      <div className="flex flex-col ml-1">
                        <span className="font-label-md text-label-md font-bold text-brand-navy">
                          시공 전/후 사진 필수 승인제
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                          고객이 사진 검수 후 최종 승인 시 시공 완료
                        </span>
                      </div>
                    </li>

                    <li className="p-space-sm rounded-xl bg-surface-container-low flex items-start gap-space-xs border border-surface-container">
                      <div className="w-6 h-6 rounded-full bg-surface-container-lowest flex items-center justify-center text-secondary font-bold text-label-sm shrink-0 shadow-sm border border-surface-container">
                        3
                      </div>
                      <div className="flex flex-col ml-1">
                        <span className="font-label-md text-label-md font-bold text-brand-navy">
                          현대해상 10억원 영업배상책임
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                          작업 중 대물·대인 사고 발생 시 전액 손해보장
                        </span>
                      </div>
                    </li>
                  </ul>
                </section>

                {/* 3. 고객센터 & 핫라인 패널 */}
                <section className="bg-surface-container-low rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-sm border border-surface-container">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-outline font-bold tracking-wider uppercase">
                      고객 케어 지원
                    </span>
                    <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary font-bold">
                      <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                      실시간 접수 가능
                    </span>
                  </div>

                  <div className="flex flex-col mt-1">
                    <a
                      className="font-headline-lg text-headline-lg font-extrabold text-brand-navy hover:text-secondary transition-colors"
                      href="tel:1588-0000"
                    >
                      1588-0000
                    </a>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      평일 09:00 ~ 18:00 (점심시간 12:00~13:00 제외)
                    </p>
                  </div>

                  <div className="pt-space-xs">
                    <button
                      className="w-full inline-flex items-center justify-center gap-2 py-3 px-space-md rounded-xl bg-surface-container-lowest hover:bg-surface-container text-brand-navy font-label-md text-label-md font-bold shadow-sm transition-all active:scale-98 cursor-pointer border border-surface-container"
                      onClick={() => showToast('카카오톡 전담 케어 상담원과 연결 중입니다...')}
                      type="button"
                    >
                      <span
                        className="material-symbols-outlined text-[18px] text-amber-500"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        sms
                      </span>
                      카카오톡 1:1 상담 연결
                    </button>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================================
          4. 하단 모바일 바텀 네비게이션 (Mobile 390px 반응형)
      ===================================================================== */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full z-40 bg-surface-container-lowest/95 backdrop-blur-md border-t border-surface-container-high/60 shadow-[0_-2px_12px_rgba(0,0,0,0.06)] px-4 py-2 flex items-center justify-around">
        <button
          className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-brand-navy cursor-pointer"
          onClick={() => onNavigate?.('user-com-00')}
        >
          <span className="material-symbols-outlined text-[22px]">home</span>
          <span className="text-[11px] font-semibold">홈</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-brand-navy cursor-pointer"
          onClick={() => onNavigate?.('user-qot-00')}
        >
          <span className="material-symbols-outlined text-[22px]">assignment</span>
          <span className="text-[11px] font-semibold">견적현황</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 text-brand-navy font-bold cursor-pointer"
          onClick={() => onNavigate?.('user-his-00')}
        >
          <span className="material-symbols-outlined text-[22px] text-brand-navy">history</span>
          <span className="text-[11px] font-bold">이용내역</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 text-on-surface-variant hover:text-brand-navy cursor-pointer"
          onClick={() => onNavigate?.('user-ath-03')}
        >
          <span className="material-symbols-outlined text-[22px]">person</span>
          <span className="text-[11px] font-semibold">마이</span>
        </button>
      </nav>

      {/* =====================================================================
          5. 공식 푸터 (Footer)
      ===================================================================== */}
      <footer className="w-full bg-surface-container-low shadow-[0_-1px_12px_rgba(22,59,102,0.03)] border-t border-surface-container-high/60">
        <div className="max-w-7xl mx-auto px-margin-desktop py-space-xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter-desktop pb-space-lg">
            <div className="md:col-span-4 flex flex-col gap-space-sm">
              <div className="flex items-center gap-space-xs">
                <div className="w-7 h-7 rounded-lg bg-brand-navy flex items-center justify-center text-on-primary">
                  <span className="material-symbols-outlined text-[16px]">cleaning_services</span>
                </div>
                <span className="font-headline-sm text-headline-sm font-bold text-brand-navy">
                  SsulDak (주)쓸고닦고
                </span>
              </div>
              <div className="mt-space-xs flex flex-col gap-1 text-on-surface-variant font-body-sm text-body-sm">
                <p>대표이사: 김대표 | 사업자등록번호: 214-88-02451</p>
                <p>통신판매업신고: 제 2024-고양일산-0129호</p>
                <p>주소: 경기도 고양시 일산동구 중앙로 1234 쓸고닦고 테크센터 8층</p>
                <p>개인정보보호책임자: 김대표 (privacy@ssuldak.kr)</p>
              </div>
            </div>

            <div className="md:col-span-5 flex flex-col gap-space-sm">
              <span className="font-label-lg text-label-lg text-brand-navy font-bold">
                안심 케어 보증 & 금융 보안
              </span>
              <div className="grid grid-cols-2 gap-space-sm">
                <div className="p-space-sm rounded-xl bg-surface-container-lowest shadow-sm flex items-start gap-space-xs border border-surface-container">
                  <span className="material-symbols-outlined text-secondary text-[22px]">verified_user</span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface font-bold">10억원 책임배상보험</span>
                    <span className="font-body-sm text-body-sm text-outline">KB손해보험 영업배상책임</span>
                  </div>
                </div>
                <div className="p-space-sm rounded-xl bg-surface-container-lowest shadow-sm flex items-start gap-space-xs border border-surface-container">
                  <span className="material-symbols-outlined text-secondary text-[22px]">shield_with_heart</span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface font-bold">에스크로 안전결제</span>
                    <span className="font-body-sm text-body-sm text-outline">서비스 검수완료 후 정산</span>
                  </div>
                </div>
              </div>
              <p className="font-body-sm text-body-sm text-outline mt-1">
                (주)쓸고닦고는 통신판매중개자로서 거래 당사자가 아니며, 입점 파트너 마스터가 직접 시공 및 이행하는
                서비스에 대한 하자는 보증보험 및 중개규정에 따라 공정하게 보호됩니다.
              </p>
            </div>

            <div className="md:col-span-3 flex flex-col items-start md:items-end justify-between">
              <div className="flex flex-col items-start md:items-end">
                <span className="font-label-sm text-label-sm text-secondary font-bold uppercase tracking-wider">
                  Customer Center
                </span>
                <a
                  className="font-headline-lg text-headline-lg font-bold text-brand-navy hover:text-secondary transition-colors"
                  href="tel:1588-0000"
                >
                  1588-0000
                </a>
                <div className="text-left md:text-right font-body-sm text-body-sm text-on-surface-variant mt-1">
                  <p>평일 08:00 ~ 20:00</p>
                  <p>주말/공휴일 09:00 ~ 18:00</p>
                </div>
              </div>
              <button
                className="mt-space-md inline-flex items-center gap-space-xs px-space-md py-2.5 rounded-xl bg-[#1F497D] text-on-primary font-label-md text-label-md hover:bg-[#183a63] transition-all shadow-sm active:scale-98 cursor-pointer"
                onClick={() => showToast('1:1 실시간 케어 매니저와 연결 중입니다...')}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">support_agent</span>
                1:1 실시간 케어 문의
              </button>
            </div>
          </div>

          <div className="pt-space-md flex flex-col md:flex-row items-center justify-between gap-space-sm font-label-md text-label-md border-t border-surface-container-high/60">
            <div className="flex flex-wrap items-center gap-space-md text-on-surface-variant">
              <a className="hover:text-primary transition-colors cursor-pointer" href="#">
                이용약관
              </a>
              <span className="text-outline-variant">•</span>
              <a className="font-bold text-brand-navy hover:underline cursor-pointer" href="#">
                개인정보처리방침
              </a>
              <span className="text-outline-variant">•</span>
              <a className="hover:text-primary transition-colors cursor-pointer" href="#">
                배상책임보험안내
              </a>
              <span className="text-outline-variant">•</span>
              <a className="hover:text-primary transition-colors text-secondary font-bold cursor-pointer" href="#">
                마스터 파트너 입점신청
              </a>
            </div>
            <p className="text-outline font-body-sm text-body-sm">© 2026 SsulDak Corp. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
