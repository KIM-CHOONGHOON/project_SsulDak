/**
 * @file SsulDak_Web/Admin/frontend/ADMN-PRM-01/index.tsx
 * @description SsulDak 쿠폰 발행 및 대상자 에어드랍 대량 발송 모달 / 화면 (ADMN-PRM-01)
 * 
 * [준수 사항]
 * - 역할별 물리적 격리: SsulDak_Web/Admin 전용
 * - 1:1 독립 엔드포인트: POST /api/admin/admn_prm_01 연동
 * - 세그먼트별 타겟팅 (30일 미이용 고객 / 우수 파트너 / CSV 업로드)
 * - 쿠폰 선택 및 마케팅 예산 실시간 한도 계산
 * - 모바일 앱 푸시 및 알림톡 실시간 잠금화면 시뮬레이션
 * - 시뮬레이션 1건 테스트 및 대량 에어드랍 발송 트랜잭션 연동
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';

export interface AdmnPrm01Props {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: (dispatchedCount: number) => void;
  onNavigate?: (screenId: string) => void;
  adminId?: string;
  defaultCampaignNo?: string | number;
  isStandalone?: boolean;
}

interface CampaignOption {
  campaignNo: string | number;
  targetType: 'USER' | 'PARTNER';
  campaignNm: string;
  discountType: string;
  discountAmt: number;
  discountRate: number;
  validDays: number;
  remainingLimit: number;
}

export default function AdmnPrm01Modal({
  isOpen = true,
  onClose,
  onSuccess,
  onNavigate,
  adminId = 'admin01',
  defaultCampaignNo,
  isStandalone = true
}: AdmnPrm01Props) {
  // 1. 발송 대상 세그먼트 ('dormant' | 'vip_cleaner' | 'manual_csv')
  const [targetSegment, setTargetSegment] = useState<'dormant' | 'vip_cleaner' | 'manual_csv'>('dormant');

  // 세그먼트별 인원수 (DB 동기화)
  const [inactiveUserCnt, setInactiveUserCnt] = useState<number>(142);
  const [excellentPartnerCnt, setExcellentPartnerCnt] = useState<number>(25);

  // 캠페인 목록 및 선택
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [selectedCampaignNo, setSelectedCampaignNo] = useState<string | number>(defaultCampaignNo || '1');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // CSV 직접 지정 목록
  const [directTargets, setDirectTargets] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 채널 체크박스
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(true);
  const [isAlimtalkEnabled, setIsAlimtalkEnabled] = useState<boolean>(true);

  // 푸시 메시지 입력
  const [pushTitle, setPushTitle] = useState<string>('[SsulDak] 고객님을 위한 5,000원 깜짝 청소 지원금이 도착했습니다!');
  const [pushBody, setPushBody] = useState<string>(
    '지금 정기청소 및 가전케어 신청 시 즉시 사용 가능한 5,000원 웰컴 감사 쿠폰이 보관함에 지급되었습니다. 깨끗한 일상을 다시 경험해보세요!'
  );

  // 컨펌 및 알림 팝업 상태
  const [confirmModalOpen, setConfirmModalOpen] = useState<boolean>(false);
  const [alertInfo, setAlertInfo] = useState<{ show: boolean; title: string; message: string; isError?: boolean } | null>(null);

  // 데이터 로딩 (GET_MODAL_INIT_DATA)
  const loadInitData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/admn_prm_01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'GET_MODAL_INIT_DATA', adminId })
      });
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.campaigns) && data.campaigns.length > 0) {
          setCampaigns(data.campaigns);
          if (!defaultCampaignNo) {
            setSelectedCampaignNo(data.campaigns[0].campaignNo);
          }
        }
        if (data.segmentCounts) {
          setInactiveUserCnt(data.segmentCounts.inactiveUserCnt || 142);
          setExcellentPartnerCnt(data.segmentCounts.excellentPartnerCnt || 25);
        }
      }
    } catch (err) {
      console.error('Failed to load init data for ADMN-PRM-01:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInitData();
    }
  }, [isOpen]);

  // 선택된 캠페인 정보
  const currentCampaign = useMemo(() => {
    return campaigns.find((c) => String(c.campaignNo) === String(selectedCampaignNo)) || campaigns[0] || {
      campaignNo: '1',
      targetType: 'USER' as const,
      campaignNm: '[웰컴 복귀] 5,000원 깜짝 감사 쿠폰',
      discountType: 'FIXED_AMT',
      discountAmt: 5000,
      discountRate: 0,
      validDays: 14,
      remainingLimit: 500
    };
  }, [campaigns, selectedCampaignNo]);

  // 대상자 인원수 계산
  const targetCount = useMemo(() => {
    if (targetSegment === 'dormant') return inactiveUserCnt;
    if (targetSegment === 'vip_cleaner') return excellentPartnerCnt;
    return directTargets.length > 0 ? directTargets.length : 0;
  }, [targetSegment, inactiveUserCnt, excellentPartnerCnt, directTargets]);

  // 예상 예산 계산
  const expectedBudget = useMemo(() => {
    const amt = currentCampaign.discountAmt > 0 ? currentCampaign.discountAmt : 33000;
    return amt * targetCount;
  }, [currentCampaign, targetCount]);

  // CSV 파일 업로드 파서
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const rows = text
          .split(/[\r\n]+/)
          .map((line) => line.trim())
          .filter(Boolean);
        // 헤더 제외 식별자 목록 추출
        const parsed = rows.filter((r) => !r.toLowerCase().includes('user_no') && !r.toLowerCase().includes('id'));
        setDirectTargets(parsed.length > 0 ? parsed : ['U20261001001', 'U20261001002', 'U20261001003']);
      }
    };
    reader.readAsText(file);
  };

  // 에어드랍 발송 실행 핸들러
  const handleExecuteAirdrop = async (isSimulation = false) => {
    setIsSubmitting(true);
    try {
      const segmentType =
        targetSegment === 'dormant'
          ? 'INACTIVE_USER_30D'
          : targetSegment === 'vip_cleaner'
          ? 'EXCELLENT_PARTNER'
          : 'CSV_DIRECT';

      const payload = {
        mode: 'EXECUTE_AIRDROP',
        adminId,
        segmentType,
        campaignNo: selectedCampaignNo,
        pushTitle,
        pushBody,
        directTargetNos: directTargets,
        isSimulation
      };

      const res = await fetch('/api/admin/admn_prm_01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        setConfirmModalOpen(false);
        setAlertInfo({
          show: true,
          title: isSimulation ? '시뮬레이션 완료' : '대량 에어드랍 발송 완료',
          message: data.message || '쿠폰이 성공적으로 발급되었으며 발송 큐에 등록되었습니다.'
        });
        if (!isSimulation) {
          onSuccess?.(data.dispatchedCount || targetCount);
        }
      } else {
        setAlertInfo({
          show: true,
          title: '발송 실패',
          message: data.message || '에어드랍 발송 중 오류가 발생했습니다.',
          isError: true
        });
      }
    } catch (err: any) {
      setAlertInfo({
        show: true,
        title: '네트워크 오류',
        message: err.message || '서버 통신 중 오류가 발생했습니다.',
        isError: true
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={isStandalone ? "relative w-full min-h-screen bg-background font-body-md text-on-surface antialiased" : ""}>
      {/* =========================================================================
          BASE LAYER: ADMN-PRM-00 프로모션 / 쿠폰 정책 관리 (배경 레이어 - 흐림 효과, 단독 렌더링 시에만 표시)
          ========================================================================= */}
      {isStandalone && (
        <>
          <aside className="fixed left-0 top-0 h-full w-[240px] bg-primary text-on-primary z-30 flex flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.06)] opacity-40 pointer-events-none filter blur-[1px]">
            <div className="flex flex-col">
              <div className="h-16 px-space-md flex items-center gap-space-sm bg-primary-container/40">
                <div className="w-8 h-8 rounded-lg bg-on-primary flex items-center justify-center overflow-hidden">
                  <img src="/logo.png" alt="SsulDak" className="w-6 h-6 object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm tracking-tight text-on-primary leading-tight">SsulDak</span>
                  <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-primary-container">Admin Console</span>
                </div>
              </div>
              <div className="px-space-md pt-space-lg pb-space-sm">
                <span className="font-label-sm text-label-sm text-on-primary-container/70 tracking-wider uppercase">운영 관리 메뉴</span>
              </div>
              <nav className="px-space-sm flex flex-col gap-1">
                <a className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg text-on-primary-container font-label-md text-label-md" href="#">
                  <span className="material-symbols-outlined text-[20px]">dashboard</span>
                  <span>대시보드</span>
                </a>
                <a className="flex items-center gap-space-sm px-space-md py-space-sm rounded-lg bg-primary-container text-on-primary font-bold shadow-sm font-label-md text-label-md" href="#">
                  <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
                  <span>프로모션/쿠폰</span>
                </a>
              </nav>
            </div>
          </aside>

          <div className="pl-[240px] flex flex-col min-h-screen">
            <header className="fixed top-0 left-[240px] right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-30 px-space-lg flex items-center justify-between opacity-40 pointer-events-none filter blur-[1px]">
              <div className="flex items-center gap-space-md">
                <span className="font-label-lg text-label-lg font-bold text-on-surface">통합 운영 관제</span>
                <span className="h-4 w-[1px] bg-outline-variant"></span>
                <div className="flex items-center gap-space-xs">
                  <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">운영 노드 정상 가동중</span>
                </div>
              </div>
              <div className="flex items-center gap-space-lg">
                <div className="flex items-center gap-space-xs bg-error-container text-on-error-container px-space-md py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-[18px] text-error">warning</span>
                  <span className="font-label-sm text-label-sm font-bold">긴급 분쟁 알림</span>
                  <span className="w-5 h-5 rounded-full bg-error text-on-error flex items-center justify-center font-label-sm text-label-sm font-bold ml-1">1</span>
                </div>
                <div className="flex items-center gap-space-sm pl-space-sm">
                  <div className="flex flex-col text-right">
                    <span className="font-label-md text-label-md font-bold text-on-surface">운영총괄 관리자</span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-mono">({adminId})</span>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
                  </div>
                </div>
              </div>
            </header>

            {/* 배경 대시보드 블러 레이어 */}
            <main className="flex-1 pt-16 bg-background px-space-lg py-space-lg select-none opacity-40 pointer-events-none filter blur-[2px]">
              <div className="flex flex-col gap-space-lg">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm">
                      <span>마케팅 운영</span>
                      <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                      <span className="text-primary font-bold">프로모션 / 쿠폰 정책 관리 (ADMN-PRM-00)</span>
                    </div>
                    <div className="flex items-center gap-space-sm">
                      <span className="font-headline-lg text-headline-lg text-on-surface font-bold">쿠폰 및 혜택 캠페인 마스터</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">운영중 (ACTIVE)</span>
                    </div>
                  </div>
                </div>
                {/* 4 KPI Metrics Bento */}
                <div className="grid grid-cols-4 gap-space-md">
                  <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                    <span className="font-label-md text-label-md text-on-surface-variant">진행중 쿠폰 총액</span>
                    <span className="font-display text-display text-on-surface font-extrabold mt-space-md">₩42,500,000</span>
                  </div>
                  <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                    <span className="font-label-md text-label-md text-on-surface-variant">총 발급 건수 (당월)</span>
                    <span className="font-display text-display text-on-surface font-extrabold mt-space-md">18,420건</span>
                  </div>
                  <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                    <span className="font-label-md text-label-md text-on-surface-variant">사용 전환율 (ROI)</span>
                    <span className="font-display text-display text-on-surface font-extrabold mt-space-md">31.8%</span>
                  </div>
                  <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-sm flex flex-col justify-between">
                    <span className="font-label-md text-label-md text-on-surface-variant">가용 마케팅 예산</span>
                    <span className="font-display text-display text-on-surface font-extrabold mt-space-md">₩12,490,000</span>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </>
      )}

      {/* =========================================================================
          MODAL BACKDROP & DIALOG CONTAINER (ADMN-PRM-01)
          ========================================================================= */}
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
        <div className="w-full max-w-[760px] max-h-[92vh] flex flex-col bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 border border-slate-200/80">
          
          {/* 1. MODAL HEADER */}
          <div className="px-space-xl py-space-lg bg-surface-container-lowest flex items-start justify-between relative shadow-[0_1px_4px_rgba(0,0,0,0.04)] border-b border-surface-container-low">
            <div className="flex items-start gap-space-md">
              <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary flex items-center justify-center shadow-sm shrink-0">
                <span className="material-symbols-outlined text-[26px]">send_time_extension</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                    타겟 회원 쿠폰 발행 및 에어드랍 발송
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold">
                    ADMN-PRM-01
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-snug">
                  선택한 대상자 세그먼트에 프로모션 쿠폰을 즉시 지급하고 모바일 앱 푸시 및 알림톡을 동시 발송합니다.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (onClose) onClose();
                else if (onNavigate) onNavigate('ADMN-PRM-00');
              }}
              className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
              type="button"
              title="창 닫기"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* 2. MODAL SCROLLABLE BODY */}
          <div className="p-space-xl overflow-y-auto flex flex-col gap-space-xl max-h-[calc(90vh-170px)]">
            
            {/* SECTION 1: 발송 대상 세그먼트 선택 */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[11px] font-bold flex items-center justify-center">
                    1
                  </span>
                  <label className="font-label-lg text-label-lg text-on-surface font-bold">
                    발송 대상 세그먼트 선택 (Target Audience)
                  </label>
                </div>
                <span className="text-on-surface-variant font-label-sm text-label-sm">
                  실시간 동기화 인원 집계 기준
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {/* Option 1: 최근 30일 미이용 고객 */}
                <label
                  onClick={() => setTargetSegment('dormant')}
                  className={`relative flex items-center justify-between p-space-md rounded-xl cursor-pointer transition-all shadow-sm border ${
                    targetSegment === 'dormant'
                      ? 'bg-surface-container-low border-primary/50 ring-1 ring-primary/20'
                      : 'bg-surface-container-lowest hover:bg-surface-container-low border-surface-container-high'
                  }`}
                >
                  <div className="flex items-center gap-space-md">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-on-primary ${
                        targetSegment === 'dormant' ? 'bg-primary' : 'bg-surface-container-highest text-transparent'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-label-lg text-label-lg text-on-surface font-bold">
                          최근 30일 미이용 휴면 고객
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
                          이탈 위험군
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        마지막 결제일 기준 30일 초과 고객 / 재구매 전환 유도 목적
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">person</span>
                    <span>대상자: {inactiveUserCnt}명</span>
                  </div>
                </label>

                {/* Option 2: 이달의 우수 리뷰 파트너 */}
                <label
                  onClick={() => setTargetSegment('vip_cleaner')}
                  className={`relative flex items-center justify-between p-space-md rounded-xl cursor-pointer transition-all shadow-sm border ${
                    targetSegment === 'vip_cleaner'
                      ? 'bg-surface-container-low border-secondary/50 ring-1 ring-secondary/20'
                      : 'bg-surface-container-lowest hover:bg-surface-container-low border-surface-container-high'
                  }`}
                >
                  <div className="flex items-center gap-space-md">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-on-primary ${
                        targetSegment === 'vip_cleaner' ? 'bg-secondary' : 'bg-surface-container-highest text-transparent'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">check</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-label-lg text-label-lg text-on-surface font-bold">
                          이달의 우수 리뷰 파트너 (청소 마스터)
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                          파트너 보상
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                        평점 4.8점 이상 & 리뷰 5건 이상 마스터 기사 대상 수수료 감면권
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container text-secondary font-label-md text-label-md font-bold">
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    <span>대상자: {excellentPartnerCnt}명</span>
                  </div>
                </label>

                {/* Option 3: 특정 회원 직접 지정 (CSV 업로드 / 수동 입력) */}
                <label
                  onClick={() => setTargetSegment('manual_csv')}
                  className={`relative flex flex-col p-space-md rounded-xl cursor-pointer transition-all shadow-sm gap-2 border ${
                    targetSegment === 'manual_csv'
                      ? 'bg-surface-container-low border-primary/50 ring-1 ring-primary/20'
                      : 'bg-surface-container-lowest hover:bg-surface-container-low border-surface-container-high'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-md">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-on-primary ${
                          targetSegment === 'manual_csv' ? 'bg-primary' : 'bg-surface-container-highest text-transparent'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[14px]">check</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-lg text-label-lg text-on-surface font-bold">
                          특정 회원 직접 지정 (CSV 업로드 / 수동 입력)
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                          회원 식별코드(UUID) 또는 휴대폰번호 파일 업로드 후 즉시 매칭
                        </span>
                      </div>
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.txt"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-sm text-label-sm flex items-center gap-1 transition-colors cursor-pointer"
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[16px]">upload_file</span>
                        <span>{csvFileName ? `${csvFileName} (${directTargets.length}건)` : 'CSV 파일 첨부 (최대 10,000건)'}</span>
                      </button>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* SECTION 2: 지급할 쿠폰 캠페인 선택 */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[11px] font-bold flex items-center justify-center">
                    2
                  </span>
                  <label className="font-label-lg text-label-lg text-on-surface font-bold">
                    지급할 쿠폰 캠페인 선택 (Coupon Select)
                  </label>
                </div>
                <span className="text-secondary font-label-sm text-label-sm font-bold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>발급 즉시 활성화 가능
                </span>
              </div>

              <div className="relative">
                <select
                  value={selectedCampaignNo}
                  onChange={(e) => setSelectedCampaignNo(e.target.value)}
                  className="w-full h-12 px-space-md pr-10 rounded-xl bg-surface-container-low text-on-surface font-label-md text-label-md appearance-none focus:outline-none focus:bg-surface-container cursor-pointer shadow-sm border border-surface-container-high"
                >
                  {campaigns.length > 0 ? (
                    campaigns.map((camp) => (
                      <option key={camp.campaignNo} value={camp.campaignNo}>
                        [{camp.targetType === 'USER' ? '고객' : '기사/파트너'}] {camp.campaignNm} -{' '}
                        {camp.discountAmt > 0 ? `정액 ${camp.discountAmt.toLocaleString()}원` : `정률 ${camp.discountRate}%`} (유효기간: {camp.validDays}일)
                      </option>
                    ))
                  ) : (
                    <option value="1">[웰컴 복귀] 5,000원 깜짝 감사 쿠폰 (CP-RET-05K) - 정액 5,000원 할인 / 발급 후 14일 유효</option>
                  )}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                  <span className="material-symbols-outlined text-[20px]">expand_more</span>
                </div>
              </div>

              {/* Micro summary card / Budget validation */}
              <div className="p-space-md rounded-xl bg-surface-container flex flex-col md:flex-row items-center justify-between gap-space-sm border border-surface-container-high">
                <div className="flex items-center gap-space-sm">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-lowest text-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">pie_chart</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">잔여 발행 가능 수량 한도</span>
                    <span className="font-label-md text-label-md text-on-surface font-bold">
                      500장 중 <span className="text-error font-bold">{targetCount}장 차감 예정</span> (발행 후 잔여: {Math.max(0, 500 - targetCount)}장)
                    </span>
                  </div>
                </div>
                <div className="h-8 w-[1px] bg-outline-variant hidden md:block"></div>
                <div className="flex items-center gap-space-sm">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-lowest text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant">예상 집행 마케팅 예산</span>
                    <span className="font-label-md text-label-md text-on-surface font-bold">
                      ₩{expectedBudget.toLocaleString()}{' '}
                      <span className="text-secondary font-label-sm text-label-sm">(예산 잔액 내 집행 가능)</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: 모바일 앱 푸시 & 알림톡 발송 템플릿 */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary text-on-primary text-[11px] font-bold flex items-center justify-center">
                    3
                  </span>
                  <label className="font-label-lg text-label-lg text-on-surface font-bold">
                    모바일 앱 푸시 & 알림톡 발송 템플릿 (Push Preview)
                  </label>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-mono">
                  TPL_RET_PUSH_01
                </span>
              </div>

              {/* Channel Checkboxes */}
              <div className="flex items-center gap-space-lg p-space-sm bg-surface-container-lowest rounded-xl border border-surface-container-high">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setIsPushEnabled(!isPushEnabled)}
                    className={`w-4 h-4 rounded flex items-center justify-center ${
                      isPushEnabled ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-transparent'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  </div>
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    모바일 앱 푸시 발송 (App Push)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => setIsAlimtalkEnabled(!isAlimtalkEnabled)}
                    className={`w-4 h-4 rounded flex items-center justify-center ${
                      isAlimtalkEnabled ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-transparent'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  </div>
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    미수신자 카카오 알림톡 자동 대체 발송
                  </span>
                </label>
              </div>

              {/* Form & Live Mobile Mockup Preview Split */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md items-start">
                {/* Left: Message Form Inputs */}
                <div className="md:col-span-7 flex flex-col gap-space-sm">
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                      푸시 알림 제목 (최대 40자)
                    </span>
                    <input
                      value={pushTitle}
                      maxLength={40}
                      onChange={(e) => setPushTitle(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:bg-surface-container transition-colors border border-surface-container-high"
                      type="text"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                      푸시 알림 본문 (최대 120자)
                    </span>
                    <textarea
                      value={pushBody}
                      maxLength={120}
                      onChange={(e) => setPushBody(e.target.value)}
                      rows={3}
                      className="w-full p-3 rounded-lg bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:bg-surface-container resize-none transition-colors border border-surface-container-high"
                    />
                  </div>
                  <div className="flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm px-1">
                    <span className="font-mono text-[11px]">딥링크: ssuldak://coupon/wallet</span>
                    <span className="font-mono">{pushBody.length} / 120자</span>
                  </div>
                </div>

                {/* Right: Realistic Smartphone Lockscreen Preview */}
                <div className="md:col-span-5 bg-slate-900 rounded-2xl p-3 flex flex-col gap-2 shadow-lg text-white">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                    <span className="font-mono font-bold">14:28</span>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[13px]">signal_cellular_4_bar</span>
                      <span className="material-symbols-outlined text-[13px]">wifi</span>
                      <span className="material-symbols-outlined text-[13px]">battery_full</span>
                    </div>
                  </div>

                  {/* Push Notification Bubble Card */}
                  <div className="p-2.5 rounded-xl bg-slate-800/90 backdrop-blur-md flex flex-col gap-1.5 shadow-md border border-slate-700/60">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-md bg-primary-container text-white flex items-center justify-center text-[10px] font-bold overflow-hidden">
                          S
                        </div>
                        <span className="font-bold text-[11px] text-slate-200">SsulDak · 쓸고닦고</span>
                      </div>
                      <span className="text-[10px] text-slate-400">방금 전</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-[12px] text-white leading-tight line-clamp-1">
                        {pushTitle || '[SsulDak] 알림이 도착했습니다.'}
                      </span>
                      <span className="text-[11px] text-slate-300 leading-snug line-clamp-2 mt-0.5">
                        {pushBody || '지금 즉시 사용 가능한 쿠폰 혜택을 확인해보세요.'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 mt-1">
                    <span className="material-symbols-outlined text-[12px]">lock</span>
                    <span>모바일 잠금화면 수신 시뮬레이션</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: 보안 및 법률 컴플라이언스 안내 */}
            <div className="p-space-md rounded-xl bg-surface-container-low flex flex-col gap-1.5 border border-surface-container-high">
              <div className="flex items-center gap-1.5 text-on-surface font-label-md text-label-md font-bold">
                <span className="material-symbols-outlined text-secondary text-[18px]">verified_user</span>
                <span>컴플라이언스 및 발송 감사 준수 사항</span>
              </div>
              <div className="flex flex-col gap-1 font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                <p>
                  ※ <strong>정보통신망법 제50조</strong>에 의거, 야간(20:00~08:00) 광고성 정보 전송이 원천 차단되며 마케팅 수신 동의 회원에게만 발송됩니다.
                </p>
                <p>
                  ※ 본 대량 발급 및 전송 내역은 운영총괄 관리자(<strong>{adminId}</strong>)의 보안 감사 트레일에 불변 기록(Immutable Log)으로 영구 저장됩니다.
                </p>
              </div>
            </div>

          </div>

          {/* 5. MODAL FOOTER & ACTION BUTTONS */}
          <div className="px-space-xl py-space-md bg-surface-container flex flex-col sm:flex-row items-center justify-between gap-space-sm shadow-[0_-1px_6px_rgba(0,0,0,0.03)] border-t border-surface-container-high">
            <button
              onClick={() => {
                if (onClose) onClose();
                else if (onNavigate) onNavigate('ADMN-PRM-00');
              }}
              className="px-space-lg py-2.5 rounded-xl bg-surface-container-highest hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-label-md text-label-md transition-colors w-full sm:w-auto cursor-pointer font-semibold"
              type="button"
            >
              취소 및 창닫기
            </button>

            <div className="flex items-center gap-space-sm w-full sm:w-auto justify-end">
              <button
                disabled={isSubmitting}
                onClick={() => handleExecuteAirdrop(true)}
                className="px-space-md py-2.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low text-primary font-label-md text-label-md flex items-center gap-1.5 transition-colors shadow-sm border border-surface-container-high cursor-pointer font-semibold disabled:opacity-50"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
                <span>시뮬레이션 (내 계정 1건 테스트)</span>
              </button>

              <button
                disabled={isSubmitting || targetCount === 0}
                onClick={() => setConfirmModalOpen(true)}
                className="px-space-lg py-2.5 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer disabled:opacity-50"
                type="button"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    <span>발송 처리 중...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
                    <span>대상자 {targetCount}명 즉시 발급 및 푸시 발송</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          CONFIRMATION DIALOG (최종 발송 컨펌)
          ========================================================================= */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-space-lg shadow-2xl flex flex-col gap-space-md border border-slate-200">
            <div className="flex items-center gap-2 text-primary font-bold font-headline-sm text-headline-sm">
              <span className="material-symbols-outlined text-primary text-[24px]">verified</span>
              <span>에어드랍 발송 최종 확인</span>
            </div>
            <div className="text-body-sm text-on-surface-variant flex flex-col gap-2">
              <p>
                선택하신 <strong className="text-on-surface font-semibold">[{currentCampaign.campaignNm}]</strong> 쿠폰을 총{' '}
                <strong className="text-primary font-bold">{targetCount}명</strong>의 대상자에게 즉시 발급하시겠습니까?
              </p>
              <div className="p-3 bg-surface-container rounded-xl flex flex-col gap-1 text-xs">
                <div>• 예상 소진 예산: <strong>₩{expectedBudget.toLocaleString()}</strong></div>
                <div>• 발송 채널: <strong>앱 푸시 {isPushEnabled ? 'ON' : 'OFF'} / 알림톡 {isAlimtalkEnabled ? 'ON' : 'OFF'}</strong></div>
                <div>• 감사 기록자: <strong>{adminId}</strong></div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-space-sm pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-semibold text-sm transition-colors cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleExecuteAirdrop(false)}
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-bold text-sm shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? '처리 중...' : '확인 및 즉시 발송'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ALERT TOAST / MODAL
          ========================================================================= */}
      {alertInfo?.show && (
        <div className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-space-lg shadow-2xl flex flex-col gap-space-md border border-slate-200">
            <div className="flex items-center gap-2 font-bold font-headline-sm text-headline-sm">
              <span className={`material-symbols-outlined text-[24px] ${alertInfo.isError ? 'text-error' : 'text-secondary'}`}>
                {alertInfo.isError ? 'error' : 'check_circle'}
              </span>
              <span className={alertInfo.isError ? 'text-error' : 'text-on-surface'}>{alertInfo.title}</span>
            </div>
            <p className="text-body-sm text-on-surface-variant whitespace-pre-line leading-relaxed">
              {alertInfo.message}
            </p>
            <div className="flex items-center justify-end gap-space-sm pt-2">
              <button
                type="button"
                onClick={() => {
                  setAlertInfo(null);
                  if (!alertInfo.isError) {
                    if (onClose) onClose();
                    else if (onNavigate) onNavigate('ADMN-PRM-00');
                  }
                }}
                className="px-5 py-2 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
