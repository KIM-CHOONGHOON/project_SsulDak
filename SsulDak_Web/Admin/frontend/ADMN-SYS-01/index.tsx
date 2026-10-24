/**
 * @file SsulDak_Web/Admin/frontend/ADMN-SYS-01/index.tsx
 * @description SsulDak 공통 코드 및 동적 정책 관리 화면 (ADMN-SYS-01)
 * 
 * [준수 사항]
 * - 역할별 물리적 격리: SsulDak_Web/Admin 전용
 * - 1:1 독립 엔드포인트: POST /api/admin/admn_sys_01 연동
 * - 2-Pane Master-Detail 구조:
 *   - Left Pane (Col 4): 코드 그룹 마스터 목록, 실시간 검색, 신규 그룹 등록 모달
 *   - Right Pane (Col 8): 그룹 상세 코드 인라인 편집, 신규 행 추가, 사용여부(Y/N) 토글, 정렬 순서 변경
 * - 실시간 클라이언트 프리뷰 (USER-REQ-00, 01 동적 칩 렌더링)
 * - 즉시 배포 독바 (Deploy to Prod): 변경사항 트랜잭션 저장 및 TB_SYS_POLICY 캐시 버전 갱신
 * - ISMS-P 감사 준수 및 공식 로고 연동
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';

export interface AdmnSys01Props {
  onNavigate?: (screenId: string) => void;
  adminId?: string;
}

export interface CodeGroup {
  grpCd: string;
  grpNm: string;
  grpDesc?: string;
  useYn: string;
  modDtFormatted?: string;
  childCodeCnt: number;
}

export interface DetailCode {
  grpCd: string;
  comCd: string;
  comNm: string;
  sortOrd: number;
  useYn: 'Y' | 'N';
  attrVal1?: string;
  attrVal2?: string;
  modDtFormatted?: string;
  isNew?: boolean;
}

export default function AdmnSys01({
  onNavigate,
  adminId = 'admin01'
}: AdmnSys01Props) {
  // 1. 네비게이션 상태
  const [activeNav, setActiveNav] = useState<string>('policy-codes');

  // 2. 마스터 코드 그룹 목록 & 선택된 그룹
  const [groups, setGroups] = useState<CodeGroup[]>([]);
  const [selectedGrpCd, setSelectedGrpCd] = useState<string>('REGULAR_CLEAN_AREA');
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>('');

  // 3. 상세 코드 목록 (편집 가능한 로컬 상태)
  const [codeList, setCodeList] = useState<DetailCode[]>([]);
  const [originalCodeList, setOriginalCodeList] = useState<DetailCode[]>([]);

  // 4. 시스템 메타 통계
  const [totalActiveCodes, setTotalActiveCodes] = useState<number>(186);
  const [cacheVer, setCacheVer] = useState<string>('20261023112005');
  const [lastDeployedAt, setLastDeployedAt] = useState<string>('2026.10.23 11:20:05');
  const [lastDeployer, setLastDeployer] = useState<string>('admin01');

  // 5. 변경 내역 추적 및 더티 플래그
  const [dirtyCount, setDirtyCount] = useState<number>(0);
  const [lastChangeSummary, setLastChangeSummary] = useState<string>('PARKING 코드 정렬 순서 변경됨');

  // 6. UI 로딩 & 피드백 상태
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 7. 신규 그룹 생성 모달 상태
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState<boolean>(false);
  const [newGrpCd, setNewGrpCd] = useState<string>('');
  const [newGrpNm, setNewGrpNm] = useState<string>('');
  const [newGrpDesc, setNewGrpDesc] = useState<string>('');
  const [isCreatingGroup, setIsCreatingGroup] = useState<boolean>(false);

  // 8. 신규 행 인라인 등록 Draft 상태
  const [draftComCd, setDraftComCd] = useState<string>('');
  const [draftComNm, setDraftComNm] = useState<string>('');
  const [draftAttrVal1, setDraftAttrVal1] = useState<string>('');
  const [draftAttrVal2, setDraftAttrVal2] = useState<string>('apartment');

  // 9. 행 편집 모달 / 인라인 편집 상태
  const [editingComCd, setEditingComCd] = useState<string | null>(null);

  // 토스트 메시지 헬퍼
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // =========================================================================
  // API: 초기 전체 하이라키 로드
  // =========================================================================
  const fetchHierarchy = useCallback(async (targetGrpCd?: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/admn_sys_01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'GET_CODE_HIERARCHY',
          adminId,
          selectedGrpCd: targetGrpCd || selectedGrpCd
        })
      });

      if (!res.ok) throw new Error('데이터 조회 실패');
      const data = await res.json();

      if (data.success) {
        setGroups(data.groups || []);
        if (data.selectedGrpCd) {
          setSelectedGrpCd(data.selectedGrpCd);
        }
        setCodeList(data.codes || []);
        setOriginalCodeList(JSON.parse(JSON.stringify(data.codes || [])));
        setTotalActiveCodes(data.totalActiveCodes || 186);
        setCacheVer(data.cacheVer || '20261023112005');
        setLastDeployedAt(data.lastDeployedAt || '2026.10.23 11:20:05');
        setLastDeployer(data.lastDeployer || 'admin01');
        setDirtyCount(0);
      }
    } catch (err: any) {
      console.error('[ADMN-SYS-01] fetchHierarchy error:', err);
      showToast('코드 정보를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [adminId, selectedGrpCd, showToast]);

  useEffect(() => {
    fetchHierarchy();
  }, []);

  // =========================================================================
  // API: 특정 그룹 선택 시 상세 코드만 로드
  // =========================================================================
  const handleSelectGroup = async (grpCd: string) => {
    if (grpCd === selectedGrpCd) return;

    if (dirtyCount > 0) {
      const confirmMove = window.confirm(
        '저장되지 않은 변경 사항이 있습니다. 다른 그룹으로 이동하시겠습니까?'
      );
      if (!confirmMove) return;
    }

    try {
      setIsLoading(true);
      setSelectedGrpCd(grpCd);
      const res = await fetch('/api/admin/admn_sys_01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'GET_GROUP_CODES',
          grpCd
        })
      });

      const data = await res.json();
      if (data.success) {
        setCodeList(data.codes || []);
        setOriginalCodeList(JSON.parse(JSON.stringify(data.codes || [])));
        setDirtyCount(0);
      }
    } catch (err) {
      console.error('[ADMN-SYS-01] handleSelectGroup error:', err);
      showToast('그룹 상세 코드를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // 그룹 마스터 검색 필터링
  // =========================================================================
  const filteredGroups = useMemo(() => {
    if (!groupSearchQuery.trim()) return groups;
    const q = groupSearchQuery.toLowerCase();
    return groups.filter(
      (g) =>
        g.grpCd.toLowerCase().includes(q) ||
        g.grpNm.toLowerCase().includes(q) ||
        (g.grpDesc && g.grpDesc.toLowerCase().includes(q))
    );
  }, [groups, groupSearchQuery]);

  // 현재 선택된 그룹 객체
  const currentGroup = useMemo(() => {
    return groups.find((g) => g.grpCd === selectedGrpCd) || {
      grpCd: selectedGrpCd,
      grpNm: '정기청소 구역 중분류',
      grpDesc: '건물/빌라 정기청소 신청 시 동적 렌더링 구역 목록 및 기본 단가 파라미터',
      useYn: 'Y',
      childCodeCnt: codeList.length
    };
  }, [groups, selectedGrpCd, codeList]);

  // =========================================================================
  // 인라인 수정 핸들러들
  // =========================================================================
  const handleToggleUseYn = (comCd: string) => {
    setCodeList((prev) =>
      prev.map((item) => {
        if (item.comCd === comCd) {
          const nextYn: 'Y' | 'N' = item.useYn === 'Y' ? 'N' : 'Y';
          setLastChangeSummary(`[${item.comCd}] 사용 상태를 ${nextYn}로 변경함`);
          return { ...item, useYn: nextYn };
        }
        return item;
      })
    );
    setDirtyCount((prev) => prev + 1);
  };

  const handleUpdateSortOrd = (comCd: string, newOrd: number) => {
    setCodeList((prev) =>
      prev.map((item) => {
        if (item.comCd === comCd) {
          setLastChangeSummary(`[${item.comCd}] 정렬 순서를 ${newOrd}로 변경함`);
          return { ...item, sortOrd: newOrd };
        }
        return item;
      })
    );
    setDirtyCount((prev) => prev + 1);
  };

  const handleUpdateField = (comCd: string, field: 'comNm' | 'attrVal1' | 'attrVal2', value: string) => {
    setCodeList((prev) =>
      prev.map((item) => {
        if (item.comCd === comCd) {
          setLastChangeSummary(`[${item.comCd}] ${field} 속성 변경됨`);
          return { ...item, [field]: value };
        }
        return item;
      })
    );
    setDirtyCount((prev) => prev + 1);
  };

  const handleDeleteRow = (comCd: string) => {
    if (!window.confirm(`[${comCd}] 코드를 목록에서 삭제하시겠습니까?`)) return;
    setCodeList((prev) => prev.filter((item) => item.comCd !== comCd));
    setLastChangeSummary(`[${comCd}] 코드 행 삭제됨`);
    setDirtyCount((prev) => prev + 1);
  };

  // 신규 행 등록 (하단 폼)
  const handleAddNewRow = () => {
    const cleanCd = draftComCd.trim().toUpperCase();
    const cleanNm = draftComNm.trim();

    if (!cleanCd) {
      alert('코드 ID(영문 대문자)를 입력하세요.');
      return;
    }
    if (!cleanNm) {
      alert('코드 명칭을 입력하세요.');
      return;
    }

    if (codeList.some((c) => c.comCd === cleanCd)) {
      alert(`이미 존재하는 코드 ID [${cleanCd}]입니다.`);
      return;
    }

    const nextSort = codeList.length > 0 ? Math.max(...codeList.map((c) => c.sortOrd || 0)) + 1 : 1;

    const newRow: DetailCode = {
      grpCd: selectedGrpCd,
      comCd: cleanCd,
      comNm: cleanNm,
      sortOrd: nextSort,
      useYn: 'Y',
      attrVal1: draftAttrVal1.trim() || '선택 구역 / 추가 옵션',
      attrVal2: draftAttrVal2.trim() || 'apartment',
      isNew: true
    };

    setCodeList((prev) => [...prev, newRow]);
    setDraftComCd('');
    setDraftComNm('');
    setDraftAttrVal1('');
    setLastChangeSummary(`[${cleanCd}] 신규 코드 추가됨`);
    setDirtyCount((prev) => prev + 1);
    showToast(`신규 코드 [${cleanCd}]가 목록에 추가되었습니다.`);
  };

  // =========================================================================
  // 변경 취소 (Revert)
  // =========================================================================
  const handleRevertChanges = () => {
    if (dirtyCount === 0) {
      showToast('변경된 내역이 없습니다.');
      return;
    }
    if (!window.confirm('모든 로컬 변경 사항을 취소하고 원본 데이터로 되돌리시겠습니까?')) return;
    setCodeList(JSON.parse(JSON.stringify(originalCodeList)));
    setDirtyCount(0);
    showToast('변경 사항이 모두 취소되었습니다.');
  };

  // =========================================================================
  // 변경사항 즉시 배포 (Deploy to Prod)
  // =========================================================================
  const handleDeployToProd = async () => {
    try {
      setIsDeploying(true);
      const res = await fetch('/api/admin/admn_sys_01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'SAVE_CODES_AND_DEPLOY',
          adminId,
          grpCd: selectedGrpCd,
          codeList
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '배포 실패');
      }

      setOriginalCodeList(JSON.parse(JSON.stringify(codeList)));
      setDirtyCount(0);
      setCacheVer(data.cacheVer || new Date().toISOString().replace(/\D/g, '').slice(0, 14));
      setLastDeployedAt(new Date().toLocaleString('ko-KR'));
      setLastDeployer(adminId);

      // 그룹 마스터 하위 코드 카운트 동기화
      setGroups((prev) =>
        prev.map((g) => (g.grpCd === selectedGrpCd ? { ...g, childCodeCnt: codeList.length } : g))
      );

      showToast('공통 코드가 성공적으로 저장 및 실시간 배포되었습니다.');
    } catch (err: any) {
      console.error('[ADMN-SYS-01] Deploy error:', err);
      showToast(err.message || '배포 중 오류가 발생했습니다.');
    } finally {
      setIsDeploying(false);
    }
  };

  // =========================================================================
  // CDN 캐시 강제 무효화 (Flush CDN)
  // =========================================================================
  const handleFlushCache = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/admn_sys_01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'FLUSH_CACHE',
          adminId
        })
      });

      const data = await res.json();
      if (data.success) {
        setCacheVer(data.cacheVer);
        showToast(data.message || 'CDN 캐시가 강제 무효화되었습니다.');
      } else {
        showToast(data.message || '캐시 플러시 실패');
      }
    } catch (err) {
      showToast('네트워크 통신 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // 신규 그룹 등록 모달 처리
  // =========================================================================
  const handleCreateNewGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCd = newGrpCd.trim().toUpperCase();
    const cleanNm = newGrpNm.trim();

    if (!cleanCd || !cleanNm) {
      alert('그룹 코드 ID와 그룹명을 입력하세요.');
      return;
    }

    if (!/^[A-Z0-9_]+$/.test(cleanCd)) {
      alert('그룹 코드는 영문 대문자, 숫자, 언더스코어(_)만 가능합니다.');
      return;
    }

    try {
      setIsCreatingGroup(true);
      const res = await fetch('/api/admin/admn_sys_01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'CREATE_GROUP',
          adminId,
          grpCd: cleanCd,
          grpNm: cleanNm,
          grpDesc: newGrpDesc.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '그룹 생성 실패');
      }

      showToast(data.message);
      setIsNewGroupModalOpen(false);
      setNewGrpCd('');
      setNewGrpNm('');
      setNewGrpDesc('');

      // 목록 새로고침 및 생성된 그룹 선택
      await fetchHierarchy(cleanCd);
    } catch (err: any) {
      alert(err.message || '그룹 생성 중 오류가 발생했습니다.');
    } finally {
      setIsCreatingGroup(false);
    }
  };

  // 아이콘 헬퍼 매핑
  const getIconName = (val?: string) => {
    if (!val) return 'apartment';
    const v = val.toLowerCase();
    if (v.includes('stair')) return 'stairs';
    if (v.includes('surround')) return 'apartment';
    if (v.includes('basement')) return 'warehouse';
    if (v.includes('park')) return 'local_parking';
    if (v.includes('corridor')) return 'door_sliding';
    if (v.includes('elev')) return 'elevator';
    if (v.includes('roof')) return 'roofing';
    if (v.includes('indoor')) return 'meeting_room';
    if (v.includes('outdoor')) return 'deck';
    if (v.includes('ac') || v.includes('wall') || v.includes('air')) return 'ac_unit';
    if (v.includes('wash') || v.includes('laundry')) return 'local_laundry_service';
    const validIcons = ['apartment', 'stairs', 'warehouse', 'local_parking', 'door_sliding', 'roofing', 'ac_unit', 'cleaning_services', 'elevator', 'meeting_room', 'deck'];
    return validIcons.includes(val) ? val : 'apartment';
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
              { id: 'policy-codes', label: '코드/정책관리', icon: 'rule_folder', screen: 'ADMN-SYS-01' },
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
            {/* 1. Breadcrumbs & Header Section */}
            <div className="flex flex-col gap-2">
              <nav className="flex items-center gap-1 text-[#43474f] text-[11px] font-semibold">
                <span
                  onClick={() => onNavigate && onNavigate('ADMN-DSH-00')}
                  className="hover:text-[#00254a] cursor-pointer transition-colors"
                >
                  홈
                </span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="hover:text-[#00254a] cursor-pointer transition-colors">시스템 설정</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="hover:text-[#00254a] cursor-pointer transition-colors">코드/정책관리</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                <span className="font-bold text-[#00254a]">공통 코드 관리 (ADMN-SYS-01)</span>
              </nav>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
                <div className="flex flex-col gap-1 max-w-3xl">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-[28px] font-bold text-[#0b1c30] tracking-tight leading-none">
                      공통 코드 체계 관리
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#d4e3ff] text-[#001c3a] text-[11px] font-bold uppercase tracking-wide">
                      SYSTEM CONFIG v2.4
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#82f5c1] text-[#00714e] text-[11px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a] animate-pulse"></span>
                      REALTIME REPAIR
                    </span>
                  </div>
                  <p className="text-[14px] text-[#43474f] leading-relaxed">
                    SsulDak 서비스 전역의 분류 카테고리, 결제 상태 및 동적 중분류 메타데이터를 통합 관리합니다. 변경 즉시 모바일 앱 및 웹 사용자 화면에 실시간 반영됩니다.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleFlushCache}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-[13px] font-semibold transition-all shadow-sm active:scale-95 cursor-pointer border border-[#c3c6d0]/50"
                  >
                    <span className="material-symbols-outlined text-[18px]">sync</span>
                    <span>캐시 강제 무효화 (Flush CDN)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeployToProd}
                    disabled={isDeploying}
                    className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-[#00254a] hover:bg-[#163b66] text-white text-[13px] font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                    <span>{isDeploying ? '배포 중...' : '변경사항 즉시 배포'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Quick Status Banner & Meta Stream */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-4 rounded-xl bg-[#eff4ff] shadow-sm border border-[#dce9ff]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#85f8c4] flex items-center justify-center shrink-0 text-[#002114]">
                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                </div>
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[13px] font-bold text-[#0b1c30] shrink-0">[실시간 핫 리로드 활성화]</span>
                  <span className="text-[13px] text-[#43474f] truncate">
                    중분류 코드를 추가하거나 활성화 상태(Y/N)를 변경하면 청소 서비스 신청(USER-REQ-00) 및 견적 모달에 10초 이내 즉시 동기화됩니다.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-[#43474f] text-[11px] font-semibold pt-2 lg:pt-0">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#00254a]">folder_open</span>
                  <span>등록 코드 그룹: <strong className="text-[#0b1c30] font-bold">{groups.length}개</strong></span>
                </div>
                <span className="w-1 h-3 bg-[#c3c6d0]"></span>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#006c4a]">check_circle</span>
                  <span>활성 세부 코드: <strong className="text-[#0b1c30] font-bold">{totalActiveCodes}개</strong></span>
                </div>
                <span className="w-1 h-3 bg-[#c3c6d0]"></span>
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#737780]">history</span>
                  <span>최근 배포: <span className="font-mono text-[#0b1c30]">{lastDeployedAt} ({lastDeployer})</span></span>
                </div>
              </div>
            </div>

            {/* 3. 2-Pane Master-Detail Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Pane: Code Group Master (Col span 4) */}
              <div className="lg:col-span-4 flex flex-col rounded-xl bg-white shadow-sm border border-[#dce9ff] overflow-hidden">
                {/* Master Search & Add Header */}
                <div className="p-4 bg-[#eff4ff] flex flex-col gap-3 border-b border-[#dce9ff]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[#00254a] text-[20px]">dataset</span>
                      <span className="text-[17px] font-bold text-[#0b1c30]">코드 그룹 마스터</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNewGroupModalOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#006c4a] text-white text-[11px] font-bold hover:bg-[#005137] transition-all shadow-sm cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      <span>새 그룹 추가</span>
                    </button>
                  </div>

                  <div className="relative w-full">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#737780]">
                      search
                    </span>
                    <input
                      type="text"
                      value={groupSearchQuery}
                      onChange={(e) => setGroupSearchQuery(e.target.value)}
                      placeholder="그룹명 / 코드 ID 검색..."
                      className="w-full pl-9 pr-3 py-2 rounded-lg bg-white text-[#0b1c30] placeholder:text-[#737780] text-[13px] border border-[#c3c6d0] focus:outline-none focus:border-[#00254a] shadow-sm transition-colors"
                    />
                  </div>
                </div>

                {/* Master Group List */}
                <div className="flex flex-col p-2 gap-1.5 max-h-[640px] overflow-y-auto">
                  {filteredGroups.length === 0 ? (
                    <div className="p-8 text-center text-[#737780] text-[13px]">
                      검색 조건에 맞는 코드 그룹이 없습니다.
                    </div>
                  ) : (
                    filteredGroups.map((group) => {
                      const isSelected = group.grpCd === selectedGrpCd;
                      return (
                        <div
                          key={group.grpCd}
                          onClick={() => handleSelectGroup(group.grpCd)}
                          className={`p-4 rounded-xl cursor-pointer transition-all flex flex-col gap-1 relative overflow-hidden border ${
                            isSelected
                              ? 'bg-[#00254a]/5 border-[#00254a] shadow-sm'
                              : 'bg-white hover:bg-[#eff4ff] border-transparent'
                          }`}
                        >
                          {isSelected && <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#00254a]"></div>}
                          <div className="flex items-center justify-between pl-1">
                            <span className="font-mono font-bold text-[#00254a] text-[13px]">{group.grpCd}</span>
                            {isSelected ? (
                              <span className="px-2 py-0.5 rounded-full bg-[#00254a] text-white text-[11px] font-bold">
                                선택됨
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-[#dce9ff] text-[#43474f] text-[11px] font-semibold">
                                {group.grpCd.includes('PAY') ? '결제제어' : group.grpCd.includes('GRADE') ? '권한' : group.grpCd.includes('DISPUTE') ? '분쟁중재' : '활성'}
                              </span>
                            )}
                          </div>
                          <span className="text-[17px] text-[#0b1c30] font-bold pl-1 leading-snug">
                            {group.grpNm}
                          </span>
                          <p className="text-[13px] text-[#43474f] line-clamp-2 pl-1 leading-relaxed">
                            {group.grpDesc || '시스템 전역 분류 및 파라미터 매핑 코드'}
                          </p>
                          <div className="flex items-center justify-between text-[#43474f] text-[11px] pt-1 pl-1 font-semibold">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[15px] text-[#006c4a]">tune</span>
                              <span>하위 코드 <strong className="text-[#00254a] font-bold">{group.childCodeCnt || 0}개</strong></span>
                            </span>
                            <span className="font-mono text-[#737780]">
                              {group.modDtFormatted || '오늘 수정'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Master Group Footer */}
                <div className="p-3 bg-[#eff4ff] text-center text-[#43474f] text-[11px] border-t border-[#dce9ff]">
                  <span>총 <strong>{groups.length}개</strong> 그룹 정의됨 (ISMS-P 형상관리 감사대상)</span>
                </div>
              </div>

              {/* Right Pane: Code Detail & Dynamic Sub-Category Management (Col span 8) */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                {/* Detail Group Header Card */}
                <div className="p-6 rounded-xl bg-white shadow-sm border border-[#dce9ff] flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[17px] font-bold text-[#00254a]">{currentGroup.grpCd}</span>
                        <span className="px-2 py-0.5 rounded-md bg-[#82f5c1] text-[#00714e] text-[11px] font-bold">
                          ACTIVE
                        </span>
                      </div>
                      <span className="text-[20px] font-bold text-[#0b1c30]">
                        {currentGroup.grpNm} 상세 관리
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        // 스크롤 및 포커스를 하단 신규 등록 폼으로 이동
                        const inputEl = document.getElementById('new-row-code-input');
                        if (inputEl) inputEl.focus();
                      }}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#00254a] hover:bg-[#163b66] text-white text-[13px] font-bold transition-all shadow-sm active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">add_box</span>
                      <span>신규 중분류 코드 추가</span>
                    </button>
                  </div>

                  {/* Detail Meta Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-lg bg-[#eff4ff] text-[#43474f] text-[11px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[#737780]">그룹 유형</span>
                      <span className="font-bold text-[#0b1c30] text-[13px]">동적 서비스 옵션 (DYNAMIC)</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[#737780]">클라이언트 캐시 TTL</span>
                      <span className="font-mono font-bold text-[#0b1c30] text-[13px]">60 SEC (HOT RELOAD)</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[#737780]">사용자 연동 화면</span>
                      <span className="font-mono font-bold text-[#00254a] text-[13px]">USER-REQ-00, 01, 02</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[#737780]">DB 테이블 매핑</span>
                      <span className="font-mono font-bold text-[#0b1c30] text-[13px]">TB_COM_CODE</span>
                    </div>
                  </div>
                </div>

                {/* Data Table Card */}
                <div className="rounded-xl bg-white shadow-sm border border-[#dce9ff] overflow-hidden flex flex-col">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-[#eff4ff] text-[#43474f] text-[11px] font-bold uppercase tracking-wider border-b border-[#dce9ff]">
                          <th className="py-3 px-4 w-16 text-center">정렬</th>
                          <th className="py-3 px-4 w-36">코드 ID</th>
                          <th className="py-3 px-4">코드 명칭 (국문)</th>
                          <th className="py-3 px-4">추가 설정 / 단가 가중치</th>
                          <th className="py-3 px-4 w-28 text-center">앱 아이콘</th>
                          <th className="py-3 px-4 w-24 text-center">사용 여부</th>
                          <th className="py-3 px-4 w-24 text-right">관리</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eff4ff] text-[#0b1c30] text-[13px]">
                        {codeList.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-[#737780]">
                              등록된 하위 세부 코드가 없습니다. 아래 신규 등록 폼을 통해 코드를 추가하세요.
                            </td>
                          </tr>
                        ) : (
                          codeList.map((row) => {
                            const isEditing = editingComCd === row.comCd;
                            return (
                              <tr key={row.comCd} className="hover:bg-[#eff4ff]/50 transition-colors">
                                {/* 정렬 */}
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="material-symbols-outlined text-[16px] text-[#737780] cursor-grab">
                                      drag_indicator
                                    </span>
                                    <input
                                      type="number"
                                      value={row.sortOrd}
                                      onChange={(e) => handleUpdateSortOrd(row.comCd, parseInt(e.target.value) || 1)}
                                      className="w-10 h-7 text-center font-mono font-bold bg-[#eff4ff] border border-[#c3c6d0]/60 rounded focus:outline-none focus:border-[#00254a] text-[13px]"
                                    />
                                  </div>
                                </td>

                                {/* 코드 ID */}
                                <td className="py-3 px-4">
                                  <span className="font-mono font-bold text-[#00254a]">{row.comCd}</span>
                                </td>

                                {/* 코드 명칭 (국문) */}
                                <td className="py-3 px-4">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={row.comNm}
                                      onChange={(e) => handleUpdateField(row.comCd, 'comNm', e.target.value)}
                                      className="w-full px-2 py-1 rounded bg-[#eff4ff] border border-[#00254a] text-[13px] font-bold text-[#0b1c30] focus:outline-none"
                                    />
                                  ) : (
                                    <span className="font-bold text-[#0b1c30]">{row.comNm}</span>
                                  )}
                                </td>

                                {/* 추가 설정 / 단가 가중치 */}
                                <td className="py-3 px-4">
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={row.attrVal1 || ''}
                                      onChange={(e) => handleUpdateField(row.comCd, 'attrVal1', e.target.value)}
                                      className="w-full px-2 py-1 rounded bg-[#eff4ff] border border-[#00254a] text-[12px] text-[#0b1c30] focus:outline-none"
                                    />
                                  ) : (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                                      row.attrVal1?.includes('기본')
                                        ? 'bg-[#dce9ff] text-[#00254a]'
                                        : 'bg-[#82f5c1]/30 text-[#00714e]'
                                    }`}>
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#00254a]"></span>
                                      {row.attrVal1 || '설정 없음'}
                                    </span>
                                  )}
                                </td>

                                {/* 앱 아이콘 */}
                                <td className="py-3 px-4 text-center">
                                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#eff4ff] text-[#00254a] border border-[#dce9ff]">
                                    <span className="material-symbols-outlined text-[20px]">
                                      {getIconName(row.attrVal2 || row.comCd)}
                                    </span>
                                  </div>
                                </td>

                                {/* 사용 여부 토글 버튼 */}
                                <td className="py-3 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUseYn(row.comCd)}
                                    className={`w-11 h-6 inline-flex items-center rounded-full p-0.5 cursor-pointer transition-colors shadow-inner ${
                                      row.useYn === 'Y' ? 'bg-[#006c4a]' : 'bg-[#737780]'
                                    }`}
                                  >
                                    <span
                                      className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform flex items-center justify-center text-[10px] font-bold ${
                                        row.useYn === 'Y'
                                          ? 'translate-x-5 text-[#006c4a]'
                                          : 'translate-x-0 text-[#737780]'
                                      }`}
                                    >
                                      {row.useYn}
                                    </span>
                                  </button>
                                </td>

                                {/* 관리 */}
                                <td className="py-3 px-4 text-right">
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingComCd(isEditing ? null : row.comCd)}
                                      className={`p-1 rounded transition-colors cursor-pointer ${
                                        isEditing ? 'text-[#00254a] bg-[#dce9ff]' : 'text-[#737780] hover:text-[#00254a]'
                                      }`}
                                      title={isEditing ? '완료' : '수정'}
                                    >
                                      <span className="material-symbols-outlined text-[18px]">
                                        {isEditing ? 'done' : 'edit'}
                                      </span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRow(row.comCd)}
                                      className="p-1 rounded text-[#737780] hover:text-[#ba1a1a] transition-colors cursor-pointer"
                                      title="삭제"
                                    >
                                      <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>

                      {/* In-line Add Form / Draft Row */}
                      <tfoot className="bg-[#eff4ff]/80 border-t border-[#dce9ff]">
                        <tr>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 rounded bg-[#d4e3ff] text-[#001c3a] font-mono text-[11px] font-bold">
                              New
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              id="new-row-code-input"
                              type="text"
                              value={draftComCd}
                              onChange={(e) => setDraftComCd(e.target.value.toUpperCase())}
                              placeholder="예: ROOF"
                              className="w-full px-2.5 py-1.5 rounded bg-white text-[#0b1c30] font-mono text-[13px] border border-[#c3c6d0] placeholder:text-[#737780] focus:outline-none focus:border-[#00254a] uppercase"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={draftComNm}
                              onChange={(e) => setDraftComNm(e.target.value)}
                              placeholder="예: 옥상/루프탑"
                              className="w-full px-2.5 py-1.5 rounded bg-white text-[#0b1c30] text-[13px] border border-[#c3c6d0] placeholder:text-[#737780] focus:outline-none focus:border-[#00254a]"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={draftAttrVal1}
                              onChange={(e) => setDraftAttrVal1(e.target.value)}
                              placeholder="옵션가 설정 (예: +40,000원)"
                              className="w-full px-2.5 py-1.5 rounded bg-white text-[#0b1c30] text-[13px] border border-[#c3c6d0] placeholder:text-[#737780] focus:outline-none focus:border-[#00254a]"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <select
                              value={draftAttrVal2}
                              onChange={(e) => setDraftAttrVal2(e.target.value)}
                              className="bg-white border border-[#c3c6d0] text-[11px] rounded px-1.5 py-1 text-[#0b1c30] focus:outline-none"
                            >
                              <option value="apartment">apartment</option>
                              <option value="stairs">stairs</option>
                              <option value="warehouse">warehouse</option>
                              <option value="local_parking">parking</option>
                              <option value="door_sliding">corridor</option>
                              <option value="roofing">roofing</option>
                              <option value="ac_unit">ac_unit</option>
                              <option value="cleaning_services">cleaning</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-mono font-bold text-[#006c4a] text-[13px]">Y</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={handleAddNewRow}
                              className="px-3 py-1.5 rounded-md bg-[#006c4a] text-white text-[11px] font-bold hover:bg-[#005137] transition-all shadow-sm cursor-pointer whitespace-nowrap"
                            >
                              + 등록
                            </button>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Live Preview Callout Box */}
                <div className="p-4 rounded-xl bg-[#eff4ff] flex flex-col gap-3 shadow-sm border border-[#dce9ff]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[#00254a] text-[18px]">devices</span>
                      <span className="text-[13px] font-bold text-[#0b1c30]">
                        모바일 &amp; 웹 실시간 화면 렌더링 프리뷰
                      </span>
                    </div>
                    <span className="text-[11px] text-[#43474f] font-mono font-semibold">
                      CLIENT RENDER ENGINE (ACTIVE)
                    </span>
                  </div>

                  <div className="p-4 rounded-lg bg-white flex flex-col gap-2 border border-[#dce9ff]">
                    <span className="text-[11px] text-[#737780] font-medium">
                      청소 신청 화면(USER-REQ-01)에서 사용자에게 노출되는 선택 칩 리스트:
                    </span>
                    <div className="flex items-center flex-wrap gap-2 pt-1">
                      {codeList
                        .filter((c) => c.useYn === 'Y')
                        .map((c) => (
                          <div
                            key={c.comCd}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#00254a] text-white text-[13px] font-bold shadow-sm"
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {getIconName(c.attrVal2 || c.comCd)}
                            </span>
                            <span>{c.comNm}</span>
                            <span className="material-symbols-outlined text-[14px]">check</span>
                          </div>
                        ))}
                      <button
                        type="button"
                        onClick={() => {
                          const inputEl = document.getElementById('new-row-code-input');
                          if (inputEl) inputEl.focus();
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#dce9ff] text-[#0b1c30] text-[13px] font-medium hover:bg-[#d3e4fe] transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">add</span>
                        <span>직접 추가</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Bottom Sticky Action Dock */}
            <div className="sticky bottom-4 z-30 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white/95 backdrop-blur-xl shadow-xl border border-[#dce9ff]">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full shrink-0 ${dirtyCount > 0 ? 'bg-[#ffb95f] animate-ping' : 'bg-[#006c4a]'}`}></div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-[#0b1c30]">
                    마지막 변경 내역: <span className="text-[#00254a] font-mono">{lastChangeSummary}</span>
                  </span>
                  <span className="text-[11px] text-[#43474f]">
                    {dirtyCount > 0
                      ? `로컬 변경 사항이 있습니다. 클라이언트 배포 대기 중 ${dirtyCount}건`
                      : '모든 변경 사항이 서버 및 클라이언트 배포와 일치합니다.'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleRevertChanges}
                  disabled={dirtyCount === 0}
                  className="px-4 py-2.5 rounded-xl bg-[#dce9ff] hover:bg-[#d3e4fe] text-[#0b1c30] text-[13px] font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  변경 취소 (Revert)
                </button>
                <button
                  type="button"
                  onClick={handleDeployToProd}
                  disabled={isDeploying}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white text-[13px] font-bold shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[20px] text-[#85f8c4]">rocket_launch</span>
                  <span>{isDeploying ? '배포 처리중...' : '변경사항 즉시 배포 (Deploy to Prod)'}</span>
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* 5. 푸터 */}
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

      {/* 6. 새 그룹 추가 모달 */}
      {isNewGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-[#dce9ff] max-w-md w-full overflow-hidden animate-scaleUp">
            <div className="p-5 bg-[#00254a] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[22px] text-[#85f8c4]">dataset</span>
                <span className="text-[17px] font-bold">신규 코드 그룹 등록</span>
              </div>
              <button
                type="button"
                onClick={() => setIsNewGroupModalOpen(false)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateNewGroup} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#0b1c30]">
                  그룹 코드 ID <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  value={newGrpCd}
                  onChange={(e) => setNewGrpCd(e.target.value.toUpperCase())}
                  placeholder="예: DEEP_CLEAN_OPTION"
                  className="w-full px-3 py-2 rounded-lg bg-[#eff4ff] border border-[#c3c6d0] text-[#0b1c30] font-mono text-[13px] uppercase focus:outline-none focus:border-[#00254a]"
                  required
                />
                <span className="text-[11px] text-[#737780]">영문 대문자, 숫자 및 언더스코어(_)만 허용됩니다.</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#0b1c30]">
                  그룹 명칭 (국문) <span className="text-[#ba1a1a]">*</span>
                </label>
                <input
                  type="text"
                  value={newGrpNm}
                  onChange={(e) => setNewGrpNm(e.target.value)}
                  placeholder="예: 특수 심층 청소 옵션"
                  className="w-full px-3 py-2 rounded-lg bg-[#eff4ff] border border-[#c3c6d0] text-[#0b1c30] text-[13px] focus:outline-none focus:border-[#00254a]"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-bold text-[#0b1c30]">그룹 설명</label>
                <textarea
                  value={newGrpDesc}
                  onChange={(e) => setNewGrpDesc(e.target.value)}
                  placeholder="신규 그룹의 용도 및 사용자 화면 연동 기준을 입력하세요."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg bg-[#eff4ff] border border-[#c3c6d0] text-[#0b1c30] text-[13px] focus:outline-none focus:border-[#00254a] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#dce9ff]">
                <button
                  type="button"
                  onClick={() => setIsNewGroupModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#eff4ff] hover:bg-[#dce9ff] text-[#0b1c30] text-[13px] font-semibold transition-colors cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isCreatingGroup}
                  className="px-5 py-2 rounded-lg bg-[#00254a] hover:bg-[#163b66] text-white text-[13px] font-bold transition-colors cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isCreatingGroup ? '등록 중...' : '그룹 등록 완료'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
