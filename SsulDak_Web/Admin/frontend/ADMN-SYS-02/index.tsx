/**
 * @file SsulDak_Web/Admin/frontend/ADMN-SYS-02/index.tsx
 * @description SsulDak 핵심 운영 정책 및 최소 하한선(Floor Price) 관리 화면 (ADMN-SYS-02)
 * 
 * [준수 사항]
 * - 역할별 물리적 격리: SsulDak_Web/Admin 전용
 * - 1:1 독립 엔드포인트: POST /api/admin/admn_sys_02 연동
 * - 5대 핵심 운영 파라미터 (계약기간 3개월 락, 3.3% 수수료율, 33,000원 하한액, 7일 정지, 168시간 환불)
 * - 4대 서비스 분야별 덤핑 방지 최저 하한선 (Floor Price)
 * - 실시간 룰 인터셉터 시각화 (Live Pipeline NODE 01~04)
 * - 정책 변경 감사 로그 모달 및 핫 리로드 배포
 * - ISMS-P 및 공정거래 준법 통제 준수
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';

export interface AdmnSys02Props {
  onNavigate?: (screenId: string) => void;
  adminId?: string;
}

export interface PolicyParameters {
  minContractDays: number;
  dataFeeRate: number;
  minDataFeeAmt: number;
  sanctionSuspendDays: number;
  refund50LimitDays: number;
  refund50LimitHours: number;
}

export interface FloorPrices {
  floorPriceStair4F: number;
  floorPriceAcStand: number;
  floorPriceMoveinPerPyeong: number;
  floorPriceWashDrum: number;
}

export interface AuditLogItem {
  logSeq: number;
  policyKey: string;
  policyDesc: string;
  oldVal: string;
  newVal: string;
  changedAdminId: string;
  regDtFormatted: string;
}

export default function AdmnSys02({
  onNavigate,
  adminId = 'admin01'
}: AdmnSys02Props) {
  // 1. 네비게이션 메뉴 상태
  const [activeNav, setActiveNav] = useState<string>('policy-codes');

  // 2. 5대 핵심 운영 파라미터 상태
  const [parameters, setParameters] = useState<PolicyParameters>({
    minContractDays: 90,
    dataFeeRate: 3.3,
    minDataFeeAmt: 33000,
    sanctionSuspendDays: 7,
    refund50LimitDays: 7,
    refund50LimitHours: 168
  });
  const [originalParameters, setOriginalParameters] = useState<PolicyParameters>({
    minContractDays: 90,
    dataFeeRate: 3.3,
    minDataFeeAmt: 33000,
    sanctionSuspendDays: 7,
    refund50LimitDays: 7,
    refund50LimitHours: 168
  });

  // 3. 서비스 분야별 덤핑 방지 최저 하한선 (Floor Price)
  const [floorPrices, setFloorPrices] = useState<FloorPrices>({
    floorPriceStair4F: 60000,
    floorPriceAcStand: 80000,
    floorPriceMoveinPerPyeong: 11000,
    floorPriceWashDrum: 90000
  });
  const [originalFloorPrices, setOriginalFloorPrices] = useState<FloorPrices>({
    floorPriceStair4F: 60000,
    floorPriceAcStand: 80000,
    floorPriceMoveinPerPyeong: 11000,
    floorPriceWashDrum: 90000
  });

  // 4. 시스템 메타 및 감사 정보
  const [lastModifiedAt, setLastModifiedAt] = useState<string>('2026.10.23 11:20:05');
  const [lastModifiedId, setLastModifiedId] = useState<string>('admin01');

  // 5. 로딩, 저장 진행 및 피드백 상태
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 6. 모달 상태
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState<boolean>(false);
  const [newCatKey, setNewCatKey] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');
  const [newCatPrice, setNewCatPrice] = useState<string>('50000');
  const [isAddingCat, setIsAddingCat] = useState<boolean>(false);

  // 토스트 메시지 헬퍼
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // =========================================================================
  // API: 전체 정책 데이터 로드
  // =========================================================================
  const fetchPolicies = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/admn_sys_02', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'GET_ALL_POLICIES',
          adminId
        })
      });

      if (!res.ok) throw new Error('정책 데이터를 불러오지 못했습니다.');
      const data = await res.json();

      if (data.success) {
        if (data.parameters) {
          setParameters(data.parameters);
          setOriginalParameters(JSON.parse(JSON.stringify(data.parameters)));
        }
        if (data.floorPrices) {
          setFloorPrices(data.floorPrices);
          setOriginalFloorPrices(JSON.parse(JSON.stringify(data.floorPrices)));
        }
        if (data.lastModifiedAt) setLastModifiedAt(data.lastModifiedAt);
        if (data.lastModifiedId) setLastModifiedId(data.lastModifiedId);
      }
    } catch (err: any) {
      console.error('[ADMN-SYS-02] fetchPolicies error:', err);
      showToast('정책 데이터를 로드하는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [adminId, showToast]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // =========================================================================
  // 파라미터 스테퍼 증감 핸들러
  // =========================================================================
  const adjustParam = (field: keyof PolicyParameters, delta: number, min = 1, max = 999999) => {
    setParameters((prev) => {
      const cur = prev[field] as number;
      const next = Math.max(min, Math.min(max, cur + delta));
      return { ...prev, [field]: next };
    });
  };

  const adjustParamFloat = (field: keyof PolicyParameters, delta: number, min = 0.1, max = 50.0) => {
    setParameters((prev) => {
      const cur = prev[field] as number;
      const next = parseFloat(Math.max(min, Math.min(max, cur + delta)).toFixed(1));
      return { ...prev, [field]: next };
    });
  };

  const adjustFloorPrice = (field: keyof FloorPrices, delta: number, min = 1000) => {
    setFloorPrices((prev) => {
      const cur = prev[field];
      const next = Math.max(min, cur + delta);
      return { ...prev, [field]: next };
    });
  };

  // =========================================================================
  // 변경 여부 확인 (Dirty Check)
  // =========================================================================
  const hasChanges = useMemo(() => {
    return (
      JSON.stringify(parameters) !== JSON.stringify(originalParameters) ||
      JSON.stringify(floorPrices) !== JSON.stringify(originalFloorPrices)
    );
  }, [parameters, originalParameters, floorPrices, originalFloorPrices]);

  // =========================================================================
  // 리셋 핸들러 (Reset)
  // =========================================================================
  const handleResetForm = () => {
    if (!hasChanges) {
      showToast('변경된 내용이 없습니다.');
      return;
    }
    if (confirm('이전 설정 상태로 복원하시겠습니까? 입력된 임시 변경사항이 초기화됩니다.')) {
      setParameters(JSON.parse(JSON.stringify(originalParameters)));
      setFloorPrices(JSON.parse(JSON.stringify(originalFloorPrices)));
      showToast('이전 승인된 기준값으로 복원되었습니다.');
    }
  };

  // =========================================================================
  // 정책 저장 및 즉시 운영 반영 (Update Policies)
  // =========================================================================
  const handleSavePolicyChanges = async () => {
    const confirmMessage =
      '⚠️ [중요 정책 변경 안내]\n\n최소 하한선 및 거버넌스 룰을 저장하고 전체 노드(Live Node)에 핫 리로드(Hot Reload) 배포하시겠습니까?\n\n이 작업은 감사 로그(Audit Log)에 영구 기록되며 계약 유효성 검증 엔진에 즉시 반영됩니다.';
    if (!confirm(confirmMessage)) return;

    try {
      setIsSaving(true);
      const res = await fetch('/api/admin/admn_sys_02', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'UPDATE_POLICIES',
          adminId,
          parameters,
          floorPrices
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '정책 저장 실패');
      }

      setOriginalParameters(JSON.parse(JSON.stringify(parameters)));
      setOriginalFloorPrices(JSON.parse(JSON.stringify(floorPrices)));
      setLastModifiedAt(new Date().toLocaleString('ko-KR'));
      setLastModifiedId(adminId);

      showToast('✅ 최소 하한선 및 운영 파라미터가 시스템에 성공적으로 배포 및 활성화되었습니다.');
    } catch (err: any) {
      alert(err.message || '정책 저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // 감사 로그 모달 오픈 & 조회
  // =========================================================================
  const handleOpenAuditModal = async () => {
    setIsAuditModalOpen(true);
    try {
      setIsLoadingLogs(true);
      const res = await fetch('/api/admin/admn_sys_02', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'GET_AUDIT_LOGS',
          adminId
        })
      });
      const data = await res.json();
      if (data.success) {
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  // =========================================================================
  // 신규 서비스 카테고리 하한선 추가 등록
  // =========================================================================
  const handleAddCategoryRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = newCatKey.trim().toUpperCase();
    const cleanPrice = parseInt(newCatPrice.replace(/[^0-9]/g, ''), 10);

    if (!cleanKey) {
      alert('정책 키를 입력하세요.');
      return;
    }
    if (!cleanPrice || isNaN(cleanPrice) || cleanPrice <= 0) {
      alert('올바른 하한 금액을 입력하세요.');
      return;
    }

    try {
      setIsAddingCat(true);
      const res = await fetch('/api/admin/admn_sys_02', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'ADD_FLOOR_PRICE_RULE',
          adminId,
          policyKey: cleanKey.startsWith('FLOOR_PRICE_') ? cleanKey : `FLOOR_PRICE_${cleanKey}`,
          policyVal: String(cleanPrice),
          policyDesc: newCatDesc.trim() || '신규 카테고리 하한선',
          valType: 'INT'
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '추가 실패');
      }

      showToast(data.message);
      setIsAddCategoryModalOpen(false);
      setNewCatKey('');
      setNewCatDesc('');
      setNewCatPrice('50000');
      fetchPolicies();
    } catch (err: any) {
      alert(err.message || '등록 중 오류가 발생했습니다.');
    } finally {
      setIsAddingCat(false);
    }
  };

  return (
    <div className="bg-[#f8f9ff] text-[#0b1c30] antialiased min-h-screen font-['Plus_Jakarta_Sans','Noto_Sans_KR',sans-serif] selection:bg-[#163b66] selection:text-white">
      {/* 1. 상단 토스트 알림 */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-[#00254a] text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 border border-[#dce9ff]/20 animate-slideDown">
          <span className="material-symbols-outlined text-[20px] text-[#82f5c1]">info</span>
          <span className="text-[13px] font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* 2. 좌측 고정 사이드바 (240px) */}
      <aside className="fixed left-0 top-0 h-full w-[240px] bg-[#00254a] text-white z-50 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.06)]">
        <div className="flex flex-col">
          {/* 로고 & 콘솔 타이틀 */}
          <div className="h-16 px-4 flex items-center gap-2 bg-[#163b66]/40 border-b border-[#163b66]/60">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center p-0.5 overflow-hidden">
              <img
                src="/logo.png"
                alt="SsulDak"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent) {
                    parent.innerHTML = '<span class="material-symbols-outlined text-[#00254a] text-[20px]">shield_person</span>';
                  }
                }}
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] font-extrabold tracking-tight text-white leading-tight">SsulDak</span>
              <span className="text-[11px] uppercase tracking-wider text-[#86a6d7] font-semibold">Admin Console</span>
            </div>
          </div>

          <div className="px-4 pt-6 pb-2">
            <span className="text-[11px] font-bold text-[#86a6d7]/70 tracking-wider uppercase">운영 관리 메뉴</span>
          </div>

          {/* 메뉴 리스트 */}
          <nav className="px-2 flex flex-col gap-1">
            {[
              { id: 'dashboard', label: '대시보드', icon: 'dashboard', screen: 'ADMN-DSH-00' },
              { id: 'promotions-coupons', label: '프로모션/쿠폰', icon: 'confirmation_number', screen: 'ADMN-PRM-00' },
              { id: 'policy-codes', label: '코드/정책관리', icon: 'rule_folder', screen: 'ADMN-SYS-02' },
              { id: 'user-management', label: '회원관리', icon: 'group', screen: 'ADMN-USR-00' },
              { id: 'dispute-arbitration', label: '거래/분쟁중재', icon: 'gavel', screen: 'ADMN-REQ-01' },
              { id: 'settlement-billing', label: '수납/정산', icon: 'account_balance_wallet', screen: 'ADMN-SET-00' },
            ].map((menu) => (
              <button
                key={menu.id}
                type="button"
                onClick={() => {
                  setActiveNav(menu.id);
                  if (menu.id !== 'policy-codes' && onNavigate) {
                    onNavigate(menu.screen);
                  }
                }}
                className={`flex items-center gap-2.5 px-4 py-2 rounded-lg transition-colors text-left cursor-pointer ${
                  activeNav === menu.id
                    ? 'bg-[#163b66] text-white font-bold shadow-sm'
                    : 'text-[#86a6d7] hover:bg-[#163b66] hover:text-white font-medium text-[13px]'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">{menu.icon}</span>
                <span className="text-[13px]">{menu.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 보안 레벨 상태 카드 */}
        <div className="p-4 bg-[#163b66]/30 mx-2 mb-4 rounded-xl flex flex-col gap-1.5 border border-[#163b66]/50">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-[#86a6d7]">보안 레벨</span>
            <span className="text-[#82f5c1] font-bold">SECURE (HIGH)</span>
          </div>
          <div className="h-1.5 w-full bg-[#163b66] rounded-full overflow-hidden">
            <div className="h-full w-full bg-[#006c4a]"></div>
          </div>
          <span className="text-[11px] text-[#86a6d7]/70 font-mono">IP: 192.168.0.12 (허가됨)</span>
        </div>
      </aside>

      {/* 3. 본문 레이아웃 컨테이너 */}
      <div className="pl-[240px] flex flex-col min-h-screen">
        {/* 상단 통합 운영 관제 헤더 */}
        <header className="fixed top-0 left-[240px] right-0 h-16 bg-white/95 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 px-6 flex items-center justify-between border-b border-[#dce9ff]">
          <div className="flex items-center gap-4">
            <span className="text-[15px] font-bold text-[#0b1c30]">통합 운영 관제</span>
            <span className="h-4 w-[1px] bg-[#c3c6d0]"></span>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse"></span>
              <span className="text-[13px] text-[#43474f]">운영 노드 정상 가동중</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 bg-[#ffdad6] text-[#93000a] px-4 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-[18px] text-[#ba1a1a]">warning</span>
              <span className="text-[11px] font-bold">긴급 분쟁 알림</span>
              <span className="w-5 h-5 rounded-full bg-[#ba1a1a] text-white flex items-center justify-center text-[11px] font-bold ml-1">
                1
              </span>
            </div>

            <div className="flex items-center gap-2.5 pl-2">
              <div className="flex flex-col text-right">
                <span className="text-[13px] font-bold text-[#0b1c30]">운영총괄 관리자</span>
                <span className="text-[11px] text-[#43474f] font-mono">({adminId})</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-[#00254a] flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-[18px]">person</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('ADMN-ATH-00');
                else window.location.hash = 'admn-ath-00';
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#dce9ff] hover:bg-[#d3e4fe] text-[#0b1c30] text-[13px] font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
              <span>로그아웃</span>
            </button>
          </div>
        </header>

        {/* 메인 콘텐츠 영역 */}
        <main className="flex-1 pt-16 bg-[#f8f9ff] px-6 py-6 pb-28">
          <div className="flex flex-col w-full gap-6 max-w-[1600px] mx-auto">
            {/* Top Breadcrumb & Page Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[#43474f] text-[11px] font-semibold">
                  <span
                    onClick={() => onNavigate && onNavigate('ADMN-DSH-00')}
                    className="hover:text-[#00254a] cursor-pointer transition-colors"
                  >
                    홈
                  </span>
                  <span className="material-symbols-outlined text-[13px] text-[#737780]">chevron_right</span>
                  <span className="hover:text-[#00254a] cursor-pointer transition-colors">시스템 설정</span>
                  <span className="material-symbols-outlined text-[13px] text-[#737780]">chevron_right</span>
                  <span
                    onClick={() => onNavigate && onNavigate('ADMN-SYS-01')}
                    className="hover:text-[#00254a] cursor-pointer transition-colors"
                  >
                    코드/정책관리
                  </span>
                  <span className="material-symbols-outlined text-[13px] text-[#737780]">chevron_right</span>
                  <span className="text-[#00254a] font-bold">최소 하한선 및 운영 정책 관리 (ADMN-SYS-02)</span>
                </nav>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <h1 className="text-[28px] font-bold text-[#0b1c30] tracking-tight leading-none">
                    핵심 운영 정책 및 최소 하한선(Floor Price) 설정
                  </h1>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-md bg-[#163b66] text-white text-[11px] font-bold tracking-wider uppercase">
                      POLICY CONFIG v2.4
                    </span>
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#006c4a] text-white text-[11px] font-bold tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#85f8c4] animate-ping"></span>
                      ENFORCED
                    </span>
                  </div>
                </div>
                <p className="text-[14px] text-[#43474f] max-w-4xl leading-relaxed">
                  덤핑 경쟁 방지와 플랫폼 공정 거래 유지를 위한 최소 수주 금액(Floor Price) 및 취소/제재 거버넌스 룰을 통합 관리합니다.
                </p>
              </div>

              {/* Page Header Right Action CTAs */}
              <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
                <button
                  type="button"
                  onClick={handleOpenAuditModal}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-[#e5eeff] text-[#0b1c30] text-[13px] font-semibold rounded-lg shadow-sm transition-all hover:shadow cursor-pointer border border-[#c3c6d0]"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#43474f]">history</span>
                  <span>정책 변경 감사 로그 (Audit)</span>
                </button>
                <button
                  type="button"
                  onClick={handleSavePolicyChanges}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#00254a] text-white hover:bg-[#163b66] text-[13px] font-bold rounded-lg shadow-sm transition-all hover:shadow active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                  <span>{isSaving ? '반영 중...' : '즉시 운영 반영 (Hot Reload)'}</span>
                </button>
              </div>
            </div>

            {/* Alert / Notice Banner */}
            <div className="relative overflow-hidden rounded-xl bg-[#ffddb8]/30 p-4 shadow-sm border border-[#ffb95f]/40">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#543300] text-[#ffb95f] flex items-center justify-center shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">gavel</span>
                </div>
                <div className="flex flex-col gap-1 pr-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-[#0b1c30]">⚠️ 최소 하한선 및 제재 정책 변경 시 주의사항</span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#543300] text-white">
                      법률 규정 준수
                    </span>
                  </div>
                  <p className="text-[13px] text-[#43474f] leading-relaxed">
                    변경 즉시 고객 신청서(<code className="font-mono bg-[#dce9ff] px-1.5 py-0.5 rounded text-[#00254a]">USER-REQ-00</code>) 실시간 견적 유효성 검증 엔진 및 파트너 투찰 화면에 직렬 반영되며, 진행 중인 기존 체결 계약에는 소급 적용되지 않습니다. (전자상거래 등에서의 소비자보호에 관한 법률 및 약관의 규제에 관한 법률 제6조 준수)
                  </p>
                </div>
              </div>
            </div>

            {/* Main Policy Workspace Bento Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              {/* Section A: 플랫폼 거버넌스 & 과금/제재 파라미터 (Left Column 5 Units) */}
              <section className="xl:col-span-5 flex flex-col gap-4 bg-white rounded-xl p-6 shadow-sm border border-[#dce9ff]">
                <div className="flex items-center justify-between pb-2 border-b border-[#eff4ff]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#163b66] text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-[19px]">tune</span>
                    </div>
                    <div>
                      <h2 className="text-[17px] font-bold text-[#0b1c30]">플랫폼 핵심 운영 파라미터</h2>
                      <p className="text-[13px] text-[#43474f]">시스템 자동 통제 및 벌칙 계산 상수</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-[#43474f] bg-[#e5eeff] px-2 py-1 rounded font-bold">
                    GOV-RULE-SET
                  </span>
                </div>

                <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
                  {/* Parameter 1: 정기청소 최소 의무 계약기간 */}
                  <div className="p-4 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] transition-colors flex flex-col gap-1 border border-[#dce9ff]/60">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-bold text-[#0b1c30] flex items-center gap-1.5" htmlFor="param-contract-lock">
                        <span>정기청소 최소 의무 계약기간</span>
                        <span className="material-symbols-outlined text-[15px] text-[#737780] cursor-help" title="최소 의무 유지 기간 미준수 시 위약율 연산 기본값">info</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#163b66] text-white">3개월 강제 락</span>
                        <span className="px-2 py-0.5 rounded text-[11px] bg-[#dce9ff] text-[#00254a] font-semibold">이탈 방지</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative flex-1">
                        <input
                          id="param-contract-lock"
                          type="number"
                          value={parameters.minContractDays}
                          onChange={(e) => setParameters((prev) => ({ ...prev, minContractDays: parseInt(e.target.value, 10) || 30 }))}
                          min={30}
                          max={365}
                          step={30}
                          className="w-full bg-white text-[#0b1c30] text-[17px] font-bold px-3 py-2 rounded-lg border border-[#c3c6d0] focus:outline-none focus:ring-2 focus:ring-[#00254a] text-right pr-12 shadow-sm font-mono"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#43474f] text-[13px] font-bold">일</span>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => adjustParam('minContractDays', 30, 30, 365)}
                          className="w-8 h-5 bg-[#dce9ff] hover:bg-[#d3e4fe] text-[#0b1c30] flex items-center justify-center rounded text-xs cursor-pointer font-bold"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustParam('minContractDays', -30, 30, 365)}
                          className="w-8 h-5 bg-[#dce9ff] hover:bg-[#d3e4fe] text-[#0b1c30] flex items-center justify-center rounded text-xs cursor-pointer font-bold"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                    <p className="text-[13px] text-[#43474f] mt-1 leading-snug">
                      고객 정기 계약 체결 시 3개월 미만 단기 임의 해약 시 위약금(잔여 금액의 20%) 및 개시 프로모션 할인분 전액 환수 규정이 강제 적용됩니다.
                    </p>
                  </div>

                  {/* Parameter 2: 데이터 이용료 기본 요율 */}
                  <div className="p-4 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] transition-colors flex flex-col gap-1 border border-[#dce9ff]/60">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-bold text-[#0b1c30] flex items-center gap-1.5" htmlFor="param-service-rate">
                        <span>데이터 이용료 기본 요율</span>
                        <span className="material-symbols-outlined text-[15px] text-[#737780] cursor-help" title="거래 성사액 기준 플랫폼 부과 퍼센티지">info</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#d3e4fe] text-[#00254a]">부가세 별도</span>
                        <span className="px-2 py-0.5 rounded text-[11px] bg-[#85f8c4] text-[#002114] font-bold">용역 대금 기준</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative flex-1">
                        <input
                          id="param-service-rate"
                          type="number"
                          value={parameters.dataFeeRate}
                          onChange={(e) => setParameters((prev) => ({ ...prev, dataFeeRate: parseFloat(e.target.value) || 0 }))}
                          min={1.0}
                          max={15.0}
                          step={0.1}
                          className="w-full bg-white text-[#0b1c30] text-[17px] font-bold px-3 py-2 rounded-lg border border-[#c3c6d0] focus:outline-none focus:ring-2 focus:ring-[#00254a] text-right pr-12 shadow-sm font-mono"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#43474f] text-[13px] font-bold">%</span>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => adjustParamFloat('dataFeeRate', 0.1, 1.0, 15.0)}
                          className="w-8 h-5 bg-[#dce9ff] hover:bg-[#d3e4fe] text-[#0b1c30] flex items-center justify-center rounded text-xs cursor-pointer font-bold"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustParamFloat('dataFeeRate', -0.1, 1.0, 15.0)}
                          className="w-8 h-5 bg-[#dce9ff] hover:bg-[#d3e4fe] text-[#0b1c30] flex items-center justify-center rounded text-xs cursor-pointer font-bold"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                    <p className="text-[13px] text-[#43474f] mt-1 leading-snug">
                      파트너 청약 성사 및 대금 에스크로 정산 시 자동 원천 공제되는 중개 및 기술 데이터 이용료 기본 요율입니다.
                    </p>
                  </div>

                  {/* Parameter 3: 데이터 이용료 최저 하한액 */}
                  <div className="p-4 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] transition-colors flex flex-col gap-1 border border-[#dce9ff]/60">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-bold text-[#0b1c30] flex items-center gap-1.5" htmlFor="param-min-infra-fee">
                        <span>데이터 이용료 최저 하한액</span>
                        <span className="material-symbols-outlined text-[15px] text-[#737780] cursor-help" title="초소액 발주 시 인프라 감가보전 최저액">info</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#d4e3ff] text-[#001c3a]">VAT 포함</span>
                        <span className="px-2 py-0.5 rounded text-[11px] bg-[#85f8c4] text-[#002114] font-bold">최저 마진 보장</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative flex-1">
                        <input
                          id="param-min-infra-fee"
                          type="text"
                          value={parameters.minDataFeeAmt.toLocaleString()}
                          onChange={(e) => {
                            const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
                            setParameters((prev) => ({ ...prev, minDataFeeAmt: val }));
                          }}
                          className="w-full bg-white text-[#0b1c30] text-[17px] font-bold px-3 py-2 rounded-lg border border-[#c3c6d0] focus:outline-none focus:ring-2 focus:ring-[#00254a] text-right pr-12 shadow-sm font-mono"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#43474f] text-[13px] font-bold">원</span>
                      </div>
                    </div>
                    <p className="text-[13px] text-[#43474f] mt-1 leading-snug">
                      소액 단기 용역 또는 1회성 테스트 청소라도 최소 33,000원의 기본 플랫폼 인프라 이용료가 보장 청구됩니다.
                    </p>
                  </div>

                  {/* Parameter 4: 선 취소자 이용 정지 일수 */}
                  <div className="p-4 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] transition-colors flex flex-col gap-1 border border-[#dce9ff]/60">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-bold text-[#0b1c30] flex items-center gap-1.5" htmlFor="param-cancel-ban-days">
                        <span>선 취소자 이용 정지 일수</span>
                        <span className="material-symbols-outlined text-[15px] text-[#ba1a1a] cursor-help" title="시공 확정 후 일방적 취소에 대한 계정 제재 일수">warning</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#ffdad6] text-[#93000a]">자동 징계 페널티</span>
                        <span className="px-2 py-0.5 rounded text-[11px] bg-[#dce9ff] text-[#43474f] font-semibold">노쇼 방지</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative flex-1">
                        <input
                          id="param-cancel-ban-days"
                          type="number"
                          value={parameters.sanctionSuspendDays}
                          onChange={(e) => setParameters((prev) => ({ ...prev, sanctionSuspendDays: parseInt(e.target.value, 10) || 1 }))}
                          min={1}
                          max={90}
                          step={1}
                          className="w-full bg-white text-[#ba1a1a] text-[17px] font-bold px-3 py-2 rounded-lg border border-[#c3c6d0] focus:outline-none focus:ring-2 focus:ring-[#ba1a1a] text-right pr-12 shadow-sm font-mono"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#43474f] text-[13px] font-bold">일</span>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => adjustParam('sanctionSuspendDays', 1, 1, 90)}
                          className="w-8 h-5 bg-[#dce9ff] hover:bg-[#d3e4fe] text-[#0b1c30] flex items-center justify-center rounded text-xs cursor-pointer font-bold"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustParam('sanctionSuspendDays', -1, 1, 90)}
                          className="w-8 h-5 bg-[#dce9ff] hover:bg-[#d3e4fe] text-[#0b1c30] flex items-center justify-center rounded text-xs cursor-pointer font-bold"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                    <p className="text-[13px] text-[#43474f] mt-1 leading-snug">
                      시공 매칭 확정 후 불가항력 사유 증빙 없이 당일 또는 임의 취소 시 귀책 당사자(고객/파트너)의 로그인 및 배차 신청이 7일간 전면 잠금됩니다.
                    </p>
                  </div>

                  {/* Parameter 5: 취소 시 50% 환불 가능 기한 */}
                  <div className="p-4 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] transition-colors flex flex-col gap-1 border border-[#dce9ff]/60">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-bold text-[#0b1c30] flex items-center gap-1.5" htmlFor="param-refund-deadline">
                        <span>취소 시 50% 환불 가능 기한</span>
                        <span className="material-symbols-outlined text-[15px] text-[#737780] cursor-help" title="위약금 50% 분기점 시간">info</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#d3e4fe] text-[#00254a]">취소 환불 규정</span>
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#dce9ff] text-[#43474f] font-semibold">{parameters.refund50LimitDays * 24}시간</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative flex-1">
                        <input
                          id="param-refund-deadline"
                          type="number"
                          value={parameters.refund50LimitDays}
                          onChange={(e) => setParameters((prev) => ({ ...prev, refund50LimitDays: parseInt(e.target.value, 10) || 1 }))}
                          min={1}
                          max={30}
                          step={1}
                          className="w-full bg-white text-[#0b1c30] text-[17px] font-bold px-3 py-2 rounded-lg border border-[#c3c6d0] focus:outline-none focus:ring-2 focus:ring-[#00254a] text-right pr-20 shadow-sm font-mono"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#43474f] text-[13px] font-bold">일 전까지</span>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => adjustParam('refund50LimitDays', 1, 1, 30)}
                          className="w-8 h-5 bg-[#dce9ff] hover:bg-[#d3e4fe] text-[#0b1c30] flex items-center justify-center rounded text-xs cursor-pointer font-bold"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => adjustParam('refund50LimitDays', -1, 1, 30)}
                          className="w-8 h-5 bg-[#dce9ff] hover:bg-[#d3e4fe] text-[#0b1c30] flex items-center justify-center rounded text-xs cursor-pointer font-bold"
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                    <p className="text-[13px] text-[#43474f] mt-1 leading-snug">
                      시공 예정일 7일 전까지는 예약금의 50% 위약금 공제 후 환불 처리되며, 7일 이내 임박 취소 시 준비 손실 보전으로 예약금이 100% 몰수 처리됩니다.
                    </p>
                  </div>
                </form>
              </section>

              {/* Section B: 업종/공정별 최저 수주 하한선 가이드 (Right Column 7 Units) */}
              <section className="xl:col-span-7 flex flex-col gap-4 bg-white rounded-xl p-6 shadow-sm border border-[#dce9ff]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#eff4ff]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#006c4a] text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-[19px]">price_change</span>
                    </div>
                    <div>
                      <h2 className="text-[17px] font-bold text-[#0b1c30]">서비스 분야별 덤핑 방지 최저 하한선 (Floor Price)</h2>
                      <p className="text-[13px] text-[#43474f]">파트너 간 출혈 저가 경쟁을 방지하고 최소 시공 품질을 담보하기 위한 공종별 최저 하한 금액</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-[#85f8c4] text-[#002114] text-[11px] font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-[#006c4a]"></span> 4개 공종 방어중
                    </span>
                  </div>
                </div>

                {/* Quick Metrics Ribbon */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-[#eff4ff] rounded-xl border border-[#dce9ff]/60">
                  <div className="bg-white p-3 rounded-lg flex flex-col shadow-xs">
                    <span className="text-[11px] text-[#43474f]">하한선 방어 차단 건수(월)</span>
                    <span className="text-[17px] font-bold text-[#00254a] font-mono mt-0.5">1,248건</span>
                    <span className="text-[11px] text-[#006c4a] flex items-center gap-0.5 mt-0.5 font-semibold">
                      <span className="material-symbols-outlined text-[14px]">trending_up</span> 14.2% 저가덤핑 차단
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg flex flex-col shadow-xs">
                    <span className="text-[11px] text-[#43474f]">파트너 평균 수주 단가율</span>
                    <span className="text-[17px] font-bold text-[#0b1c30] font-mono mt-0.5">124.6%</span>
                    <span className="text-[11px] text-[#43474f] mt-0.5 font-medium">하한 기준선 대비</span>
                  </div>
                  <div className="bg-white p-3 rounded-lg flex flex-col shadow-xs">
                    <span className="text-[11px] text-[#43474f]">시장 적정가 갭 편차</span>
                    <span className="text-[17px] font-bold text-[#006c4a] font-mono mt-0.5">-18.4%</span>
                    <span className="text-[11px] text-[#00714e] mt-0.5 font-bold">안전 마진 영역</span>
                  </div>
                </div>

                {/* Interactive Floor Price Item Cards Container */}
                <div className="flex flex-col gap-4 mt-1">
                  {/* Item 1: 4층 빌라 계단청소 */}
                  <div className="group p-4 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] transition-all flex flex-col gap-2 shadow-sm border border-[#dce9ff]/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#dce9ff] text-[#00254a] flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[20px]">stairs</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-bold text-[#0b1c30]">4층 빌라 계단청소 월 최소 하한선</span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#d4e3ff] text-[#001c3a]">정기청소</span>
                          </div>
                          <span className="text-[13px] text-[#43474f]">기준: 4층 빌라 1개동 월 4회 기준 (주 1회 주기)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 self-start sm:self-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#85f8c4] text-[#002114] text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a]"></span> 정상 가동 ACTIVE
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1">
                      <div className="md:col-span-6 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[#43474f] text-[11px]">
                          <span>통제 하한 금액 설정</span>
                          <span className="font-semibold text-[#00254a]">VAT 별도</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#43474f] font-bold text-sm">₩</span>
                          <input
                            type="text"
                            value={floorPrices.floorPriceStair4F.toLocaleString()}
                            onChange={(e) => {
                              const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
                              setFloorPrices((prev) => ({ ...prev, floorPriceStair4F: val }));
                            }}
                            className="w-full bg-white text-[#0b1c30] text-[17px] font-bold pl-8 pr-12 py-2 rounded-lg border border-[#c3c6d0] focus:outline-none focus:ring-2 focus:ring-[#00254a] text-right shadow-sm font-mono"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#43474f] text-[13px] font-bold">원</span>
                        </div>
                      </div>

                      <div className="md:col-span-6 flex flex-col gap-1 bg-white p-2.5 rounded-lg shadow-xs border border-[#dce9ff]/50">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#43474f]">추천 시장가 범위</span>
                          <span className="font-bold text-[#0b1c30] font-mono">70,000 ~ 90,000원</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#dce9ff] overflow-hidden flex">
                          <div className="bg-[#ba1a1a] h-full" style={{ width: '25%' }} title="덤핑 불가 영역 (~60,000)"></div>
                          <div className="bg-[#006c4a] h-full" style={{ width: '75%' }} title="정상 투찰 구간 (60,000~)"></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-[#43474f]">
                          <span>하한선 {floorPrices.floorPriceStair4F.toLocaleString()}원</span>
                          <span className="text-[#006c4a] font-bold">권장 중앙값 80,000원</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Item 2: 스탠드 에어컨 분해청소 */}
                  <div className="group p-4 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] transition-all flex flex-col gap-2 shadow-sm border border-[#dce9ff]/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#dce9ff] text-[#00254a] flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[20px]">mode_fan</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-bold text-[#0b1c30]">스탠드 에어컨 분해청소 하한선</span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#d3e4fe] text-[#00254a]">계절가전 케어</span>
                          </div>
                          <span className="text-[13px] text-[#43474f]">기준: 가정용/상업용 스탠드형 스마트/듀얼 분해 세척 1대</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 self-start sm:self-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#85f8c4] text-[#002114] text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a]"></span> 정상 가동 ACTIVE
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1">
                      <div className="md:col-span-6 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[#43474f] text-[11px]">
                          <span>통제 하한 금액 설정</span>
                          <span className="font-semibold text-[#00254a]">VAT 별도</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#43474f] font-bold text-sm">₩</span>
                          <input
                            type="text"
                            value={floorPrices.floorPriceAcStand.toLocaleString()}
                            onChange={(e) => {
                              const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
                              setFloorPrices((prev) => ({ ...prev, floorPriceAcStand: val }));
                            }}
                            className="w-full bg-white text-[#0b1c30] text-[17px] font-bold pl-8 pr-12 py-2 rounded-lg border border-[#c3c6d0] focus:outline-none focus:ring-2 focus:ring-[#00254a] text-right shadow-sm font-mono"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#43474f] text-[13px] font-bold">원</span>
                        </div>
                      </div>

                      <div className="md:col-span-6 flex flex-col gap-1 bg-white p-2.5 rounded-lg shadow-xs border border-[#dce9ff]/50">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#43474f]">추천 시장가 범위</span>
                          <span className="font-bold text-[#0b1c30] font-mono">100,000 ~ 130,000원</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#dce9ff] overflow-hidden flex">
                          <div className="bg-[#ba1a1a] h-full" style={{ width: '22%' }}></div>
                          <div className="bg-[#006c4a] h-full" style={{ width: '78%' }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-[#43474f]">
                          <span>하한선 {floorPrices.floorPriceAcStand.toLocaleString()}원</span>
                          <span className="text-[#006c4a] font-bold">권장 중앙값 115,000원</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Item 3: 입주/이사청소 평당 하한선 */}
                  <div className="group p-4 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] transition-all flex flex-col gap-2 shadow-sm border border-[#dce9ff]/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#dce9ff] text-[#00254a] flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[20px]">home_work</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-bold text-[#0b1c30]">입주/이사청소 평당 하한선</span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#d4e3ff] text-[#001c3a]">입주청소</span>
                          </div>
                          <span className="text-[13px] text-[#43474f]">기준: 공급면적 1평(3.3㎡)당 단가 (외창 청소 제외 기본)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 self-start sm:self-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#85f8c4] text-[#002114] text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a]"></span> 정상 가동 ACTIVE
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1">
                      <div className="md:col-span-6 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[#43474f] text-[11px]">
                          <span>통제 하한 금액 설정</span>
                          <span className="font-semibold text-[#00254a]">VAT 별도</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#43474f] font-bold text-sm">₩</span>
                          <input
                            type="text"
                            value={floorPrices.floorPriceMoveinPerPyeong.toLocaleString()}
                            onChange={(e) => {
                              const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
                              setFloorPrices((prev) => ({ ...prev, floorPriceMoveinPerPyeong: val }));
                            }}
                            className="w-full bg-white text-[#0b1c30] text-[17px] font-bold pl-8 pr-16 py-2 rounded-lg border border-[#c3c6d0] focus:outline-none focus:ring-2 focus:ring-[#00254a] text-right shadow-sm font-mono"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#43474f] text-[13px] font-bold">원 / 평</span>
                        </div>
                      </div>

                      <div className="md:col-span-6 flex flex-col gap-1 bg-white p-2.5 rounded-lg shadow-xs border border-[#dce9ff]/50">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#43474f]">추천 시장가 범위</span>
                          <span className="font-bold text-[#0b1c30] font-mono">12,000 ~ 15,000원 / 평</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#dce9ff] overflow-hidden flex">
                          <div className="bg-[#ba1a1a] h-full" style={{ width: '20%' }}></div>
                          <div className="bg-[#006c4a] h-full" style={{ width: '80%' }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-[#43474f]">
                          <span>하한선 {floorPrices.floorPriceMoveinPerPyeong.toLocaleString()}원</span>
                          <span className="text-[#006c4a] font-bold">권장 중앙값 13,500원</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Item 4: 통돌이/드럼 세탁기 분해청소 */}
                  <div className="group p-4 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] transition-all flex flex-col gap-2 shadow-sm border border-[#dce9ff]/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#dce9ff] text-[#00254a] flex items-center justify-center font-bold">
                          <span className="material-symbols-outlined text-[20px]">local_laundry_service</span>
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-bold text-[#0b1c30]">통돌이/드럼 세탁기 분해청소 하한선</span>
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#d3e4fe] text-[#00254a]">가전케어</span>
                          </div>
                          <span className="text-[13px] text-[#43474f]">기준: 15kg 이상 드럼 세탁기 스파이더/이중 튜브 분해 살균 세척</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 self-start sm:self-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#85f8c4] text-[#002114] text-[11px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a]"></span> 정상 가동 ACTIVE
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pt-1">
                      <div className="md:col-span-6 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[#43474f] text-[11px]">
                          <span>통제 하한 금액 설정</span>
                          <span className="font-semibold text-[#00254a]">VAT 별도</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#43474f] font-bold text-sm">₩</span>
                          <input
                            type="text"
                            value={floorPrices.floorPriceWashDrum.toLocaleString()}
                            onChange={(e) => {
                              const val = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
                              setFloorPrices((prev) => ({ ...prev, floorPriceWashDrum: val }));
                            }}
                            className="w-full bg-white text-[#0b1c30] text-[17px] font-bold pl-8 pr-12 py-2 rounded-lg border border-[#c3c6d0] focus:outline-none focus:ring-2 focus:ring-[#00254a] text-right shadow-sm font-mono"
                          />
                          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#43474f] text-[13px] font-bold">원</span>
                        </div>
                      </div>

                      <div className="md:col-span-6 flex flex-col gap-1 bg-white p-2.5 rounded-lg shadow-xs border border-[#dce9ff]/50">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#43474f]">추천 시장가 범위</span>
                          <span className="font-bold text-[#0b1c30] font-mono">110,000 ~ 140,000원</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#dce9ff] overflow-hidden flex">
                          <div className="bg-[#ba1a1a] h-full" style={{ width: '24%' }}></div>
                          <div className="bg-[#006c4a] h-full" style={{ width: '76%' }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-[#43474f]">
                          <span>하한선 {floorPrices.floorPriceWashDrum.toLocaleString()}원</span>
                          <span className="text-[#006c4a] font-bold">권장 중앙값 125,000원</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Add New Category Trigger */}
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(true)}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-[#c3c6d0] hover:border-[#00254a] text-[#43474f] hover:text-[#00254a] flex items-center justify-center gap-2 text-[13px] font-semibold transition-all hover:bg-[#eff4ff] cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>신규 서비스 카테고리 하한선 규정 추가 등록</span>
                </button>
              </section>
            </div>

            {/* Section: Real-time Rule Enforcer Architecture Visualizer */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-[#dce9ff] flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00254a] text-[22px]">account_tree</span>
                  <h3 className="text-[17px] font-bold text-[#0b1c30]">
                    실시간 하한선 필터링 엔진 동작 상태 (Live Pipeline)
                  </h3>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-[#43474f] font-semibold">
                  <span>Latency: <strong>1.8ms</strong></span>
                  <span className="text-[#c3c6d0]">|</span>
                  <span className="text-[#006c4a] font-bold">Zero Bypassing Policy Active</span>
                </div>
              </div>

              {/* Pipeline Visual Nodes */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                <div className="bg-[#eff4ff] p-4 rounded-xl flex flex-col gap-1.5 relative overflow-hidden border border-[#dce9ff]/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#00254a]">NODE 01</span>
                    <span className="material-symbols-outlined text-[#43474f] text-[18px]">badge</span>
                  </div>
                  <span className="text-[13px] font-bold text-[#0b1c30]">파트너 견적 투찰 (REQ)</span>
                  <p className="text-[13px] text-[#43474f] leading-snug">파트너 앱에서 입력된 공종별 단가 및 옵션 수치 페이로드 수신</p>
                </div>

                <div className="bg-[#eff4ff] p-4 rounded-xl flex flex-col gap-1.5 relative overflow-hidden border border-[#dce9ff]/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#006c4a]">NODE 02</span>
                    <span className="material-symbols-outlined text-[#006c4a] text-[18px]">verified</span>
                  </div>
                  <span className="text-[13px] font-bold text-[#0b1c30]">Floor Price 인터셉터</span>
                  <p className="text-[13px] text-[#43474f] leading-snug">ADMN-SYS-02 정의 하한 단가 미달 시 즉시 트랜잭션 400 Reject</p>
                </div>

                <div className="bg-[#eff4ff] p-4 rounded-xl flex flex-col gap-1.5 relative overflow-hidden border border-[#dce9ff]/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#00254a]">NODE 03</span>
                    <span className="material-symbols-outlined text-[#43474f] text-[18px]">receipt_long</span>
                  </div>
                  <span className="text-[13px] font-bold text-[#0b1c30]">데이터 수수료 산출</span>
                  <p className="text-[13px] text-[#43474f] leading-snug">기본 3.3% 요율 대조 및 최저 33,000원 하한 보전 조건 동시 검증</p>
                </div>

                <div className="bg-[#eff4ff] p-4 rounded-xl flex flex-col gap-1.5 relative overflow-hidden border border-[#dce9ff]/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#006c4a]">NODE 04</span>
                    <span className="material-symbols-outlined text-[#006c4a] text-[18px]">send_and_archive</span>
                  </div>
                  <span className="text-[13px] font-bold text-[#0b1c30]">고객 견적서 배포</span>
                  <p className="text-[13px] text-[#43474f] leading-snug">최종 승인된 정량 견적만 USER-REQ 화면에 투명 공개</p>
                </div>
              </div>
            </div>

            {/* Bottom Verification & Submit Dock */}
            <div className="sticky bottom-4 z-30 bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#dce9ff]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#163b66] text-white flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[22px]">policy</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#00254a]">보안 및 감사 승인 프로세스 대기</span>
                  <span className="text-[13px] text-[#43474f]">
                    마지막 정책 수정자: <strong className="text-[#0b1c30] font-mono">{lastModifiedId}</strong> ({lastModifiedAt} KST) | ISMS-P 및 공정거래 준법 통제 승인 대기
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                <button
                  type="button"
                  onClick={handleResetForm}
                  disabled={!hasChanges}
                  className="px-4 py-2.5 rounded-xl bg-[#dce9ff] hover:bg-[#d3e4fe] text-[#0b1c30] text-[13px] font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>이전 설정값으로 되돌리기 (Reset)</span>
                </button>
                <button
                  type="button"
                  onClick={handleSavePolicyChanges}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white text-[13px] font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px] text-[#85f8c4]">verified_user</span>
                  <span>{isSaving ? '정책 엔진 동기화 중...' : '시스템 정책 변경사항 저장 및 적용'}</span>
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* 푸터 */}
        <footer className="w-full bg-[#eff4ff] px-6 py-4 shadow-[0_-1px_6px_rgba(0,0,0,0.02)] border-t border-[#dce9ff]">
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-2 text-[#43474f] text-[11px]">
            <div>
              <span>© 2025 SsulDak Admin Console. All Rights Reserved.</span>
              <span className="mx-2 text-[#c3c6d0]">|</span>
              <span>정보보호 관리체계 (ISMS-P) 인증 취득 완료</span>
              <span className="mx-2 text-[#c3c6d0]">|</span>
              <span>전체 세션 데이터 AES-256 GCM 무결성 실시간 암호화 감사 기록 중</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-[#006c4a]">lock_clock</span>
                <span>자동 로그아웃 세션 만료 잔여: <strong className="text-[#00254a] font-mono">59:42</strong></span>
              </span>
              <a href="#" className="underline text-[#43474f] hover:text-[#0b1c30]">
                보안 로그 현황
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* 5. 감사 로그(Audit Log) 모달 */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#dce9ff] max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-scaleUp">
            <div className="p-5 bg-[#00254a] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[#85f8c4]">history</span>
                <span className="text-[17px] font-bold">운영 정책 변경 감사 로그 (Audit History)</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
              <p className="text-[13px] text-[#43474f]">
                전자금융거래법 및 ISMS-P 감사 기준에 따라 관리자에 의해 변경된 모든 정책 파라미터의 변경 전/후 기록이 영구 보관됩니다.
              </p>

              {isLoadingLogs ? (
                <div className="py-12 text-center text-[#737780]">감사 로그를 조회하는 중입니다...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-[#737780]">기록된 정책 변경 감사 로그가 없습니다.</div>
              ) : (
                <div className="rounded-xl border border-[#dce9ff] overflow-hidden">
                  <table className="w-full text-left text-[12px]">
                    <thead className="bg-[#eff4ff] text-[#43474f] font-bold uppercase border-b border-[#dce9ff]">
                      <tr>
                        <th className="py-2.5 px-3">변경 일시</th>
                        <th className="py-2.5 px-3">정책 키</th>
                        <th className="py-2.5 px-3">이전 값</th>
                        <th className="py-2.5 px-3">변경 값</th>
                        <th className="py-2.5 px-3 text-right">작업자</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eff4ff]">
                      {auditLogs.map((log) => (
                        <tr key={log.logSeq} className="hover:bg-[#eff4ff]/40">
                          <td className="py-2.5 px-3 font-mono text-[#737780]">{log.regDtFormatted}</td>
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-bold text-[#00254a]">{log.policyKey}</span>
                            <div className="text-[11px] text-[#43474f]">{log.policyDesc}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono line-through text-[#ba1a1a]">{log.oldVal}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#006c4a]">{log.newVal}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#0b1c30]">{log.changedAdminId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#eff4ff] border-t border-[#dce9ff] flex justify-end">
              <button
                type="button"
                onClick={() => setIsAuditModalOpen(false)}
                className="px-5 py-2 rounded-lg bg-[#00254a] hover:bg-[#163b66] text-white text-[13px] font-bold cursor-pointer"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. 신규 서비스 카테고리 하한선 추가 등록 모달 */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#dce9ff] max-w-md w-full overflow-hidden animate-scaleUp">
            <div className="p-5 bg-[#00254a] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[#85f8c4]">price_change</span>
                <span className="text-[17px] font-bold">신규 카테고리 하한선 규정 등록</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddCategoryRule} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#0b1c30]">
                  정책 키 식별자 <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  value={newCatKey}
                  onChange={(e) => setNewCatKey(e.target.value.toUpperCase())}
                  placeholder="예: FLOOR_PRICE_WINDOW_CLEAN"
                  className="w-full px-3 py-2 rounded-lg bg-[#eff4ff] border border-[#c3c6d0] text-[#0b1c30] font-mono text-[13px] uppercase focus:outline-none focus:border-[#00254a]"
                  required
                />
                <span className="text-[11px] text-[#737780]">영문 대문자, 언더스코어(_)로 작성됩니다.</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#0b1c30]">
                  정책 설명 <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="예: 유리창/외창 정밀 고압 세척 최저 하한선"
                  className="w-full px-3 py-2 rounded-lg bg-[#eff4ff] border border-[#c3c6d0] text-[#0b1c30] text-[13px] focus:outline-none focus:border-[#00254a]"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#0b1c30]">
                  최저 하한 금액 (원) <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="number"
                  value={newCatPrice}
                  onChange={(e) => setNewCatPrice(e.target.value)}
                  placeholder="예: 50000"
                  step={1000}
                  className="w-full px-3 py-2 rounded-lg bg-[#eff4ff] border border-[#c3c6d0] text-[#0b1c30] font-mono text-[13px] text-right font-bold focus:outline-none focus:border-[#00254a]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#dce9ff]">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-[13px] font-semibold cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isAddingCat}
                  className="px-5 py-2 rounded-lg bg-[#00254a] hover:bg-[#163b66] text-white text-[13px] font-bold cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isAddingCat ? '등록 중...' : '규정 등록 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
