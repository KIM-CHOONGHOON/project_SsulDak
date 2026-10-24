import React, { useState, useEffect } from 'react';

export interface PhotoItem {
  id: string;
  title: string;
  photoUrl: string;
  fileName: string;
  fileSizeText: string;
  aiVerificationText: string;
  sortOrd: number;
}

export interface PtnrJob01Props {
  isOpen?: boolean;
  onClose?: () => void;
  onSuccess?: (workSeq: number) => void;
  contractNo?: string;
  workSeq?: number;
  ptnrNo?: string;
  asModal?: boolean;
}

export default function PtnrJob01({
  isOpen = true,
  onClose,
  onSuccess,
  contractNo = 'CT2026102100001',
  workSeq = 2,
  ptnrNo = 'P20261000001',
  asModal = false
}: PtnrJob01Props) {
  // Modal visibility
  const [visible, setVisible] = useState(isOpen);

  // Active step (1: 현장 출발, 2: 작업 시작, 3: 시공 완료)
  const [activeStep, setActiveStep] = useState<number>(3);

  // Data state
  const [orderNo, setOrderNo] = useState('CNT-20261021-0001');
  const [roundNo, setRoundNo] = useState(1);
  const [buildingTitle, setBuildingTitle] = useState('일산동구 중앙로 빌라 4층 상가주택');
  const [clientName, setClientName] = useState('김*훈 고객님');
  const [settlementAmt, setSettlementAmt] = useState(240000);
  const [workerMemo, setWorkerMemo] = useState(
    '1층 분리수거장 재활용 정리 및 1~4층 대리석 계단 친환경 에코라벨 중성세제로 물걸레 및 스팀 청소 완벽히 완료했습니다. 음식 냄새 탈취를 위한 피톤치드 분무까지 마쳤습니다.'
  );

  // Photos state (Default 2 required photos)
  const [photos, setPhotos] = useState<PhotoItem[]>([
    {
      id: 'photo-1',
      title: '1. 계단 시공 후',
      photoUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCVgmdStHYlGBpEaqSV7l7fbzd9--K9eq2RY-zsln12YrNnse2U7W5kHYsPXm7S43v-pybr238UJDkFRtQrpGfP0kElbkWQqpNRsuki8sl3AzzDSAnO3atMzae-o0XZgW2iTaGWwlTB3m83yToxvaW1lWxbmI1T6Y4nNkDPJt3OgLbyLP1D__cMarS30i8PVqfv_HLmgf9l3cZq80rv637TFmY_XrtJO1osA-zXNsw-oLr62MFFKjWI',
      fileName: 'stair_after_20261101.jpg',
      fileSizeText: '2.4 MB',
      aiVerificationText: 'AI 자동 검증 통과: 조도·청결도 우수',
      sortOrd: 1
    },
    {
      id: 'photo-2',
      title: '2. 현관 도어락 세척 후',
      photoUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCmUU9LI2VYgpQ8znE6pURBOhsLRo7Iq1cN09YqCcvTbwyByma50LV43Bm-MF0hOKsTuJbwq10bKW9q7A7Ngfka_-ZUaJelWOW0k54W5FNy5iSFLhJy__cisrwgt_RlabuAzKbMsUpz-yQaDV7uCBqJ_4PUFYmIy8xPLEcs1NY_5u9g55WSgxDl-jt-4FpaP8c4-rtuH9m9MwJ9qzmWLWC7EJm4HuB46V91XkeoNc5KiKOoZnJRFeqT',
      fileName: 'door_after_sanitized.jpg',
      fileSizeText: '1.8 MB',
      aiVerificationText: 'AI 자동 검증 통과: 도어락 식별 완료',
      sortOrd: 2
    }
  ]);

  // Inspection Checklist items
  const [checklist, setChecklist] = useState({
    stairs: true,
    recycling: true,
    doorlock: true
  });

  // UI status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    setVisible(isOpen);
  }, [isOpen]);

  // ESC key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initial Data Fetch
  useEffect(() => {
    fetchInitialStatus();
  }, [contractNo, workSeq]);

  const fetchInitialStatus = async () => {
    try {
      const res = await fetch('/api/partner/ptnr_job_01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'GET_WORK_STATUS',
          ptnrNo,
          contractNo,
          workSeq
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.workStatus) {
          const ws = json.workStatus;
          setOrderNo(ws.orderNo || 'CNT-20261021-0001');
          setRoundNo(ws.roundNo || 1);
          setBuildingTitle(ws.buildingTitle || '일산동구 중앙로 빌라 4층 상가주택');
          setClientName(ws.clientName || '김*훈 고객님');
          setSettlementAmt(ws.settlementAmt || 240000);
          if (ws.workerMemo) {
            setWorkerMemo(ws.workerMemo);
          }
          if (ws.photos && ws.photos.length > 0) {
            setPhotos(
              ws.photos.map((p: any, idx: number) => ({
                id: `photo-${p.photoSeq || idx + 1}`,
                title: p.title,
                photoUrl: p.photoUrl,
                fileName: p.fileName || `work_photo_${idx + 1}.jpg`,
                fileSizeText: p.fileSizeText || '2.1 MB',
                aiVerificationText: p.aiVerificationText || 'AI 자동 검증 통과: 상태 양호',
                sortOrd: p.sortOrd || idx + 1
              }))
            );
          }
        }
      }
    } catch (err) {
      console.warn('Using default demo data for PTNR-JOB-01', err);
    }
  };

  const handleClose = () => {
    setVisible(false);
    if (onClose) {
      onClose();
    } else if (!asModal) {
      window.location.hash = '#ptnr-job-00';
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    showToast('사진이 삭제되었습니다.');
  };

  const handleAddSamplePhoto = () => {
    if (photos.length >= 5) {
      alert('사진은 최대 5장까지 등록할 수 있습니다.');
      return;
    }
    const sampleUrls = [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCQc8jF8fQh-lYvNn4lBqmX_V2x-fNkq1gE-xU7qY2U0e7Mic6JrvDn17Wr6QvOoOY5cL5zJW1cOwPkEHC1okLMJ8H8kV-7d8u1XVHIyiUPJqe4U7cpfWfR',
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB1x3DDfPU4OogTI4uw15zPJaebDDoR8YXDzJMIwaeZ4nmng9Avc3pBpPPx4w5JmVd1SdwOm6Pk-MrVeBjJi2EfMLDJEVM6p7m65MdeDKpl-64amzEaRPTVyAHG9RdSsHFmm_J7lnppT7jXaDpBFdxtphD_2wPFBNr59CF0-gSmhR3qSgmLS_1pucs5XOBgBa5Kb4d0hrgJwI_Yz3hs0tbuXIloIG4gVyr-KWRC3k-j9mrZbfilT2UR'
    ];
    const newIdx = photos.length + 1;
    const newPhoto: PhotoItem = {
      id: `photo-${Date.now()}`,
      title: `${newIdx}. 1층 분리수거장 및 필로티`,
      photoUrl: sampleUrls[newIdx % sampleUrls.length] || sampleUrls[0],
      fileName: `recycling_area_${Date.now().toString().slice(-4)}.jpg`,
      fileSizeText: '2.1 MB',
      aiVerificationText: 'AI 자동 검증 통과: 정리 정돈 우수',
      sortOrd: newIdx
    };
    setPhotos((prev) => [...prev, newPhoto]);
    showToast('추가 시공 사진이 등록되었습니다.');
  };

  const handleSubmitReport = async () => {
    if (photos.length < 2) {
      alert('완료 검수 요청 시 최소 2장 이상의 시공 후 사진 등록이 필수입니다.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/partner/ptnr_job_01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'UPDATE_WORK_STATUS',
          ptnrNo,
          contractNo,
          workSeq,
          targetStatus: 'INSPECTING',
          workerMemo,
          completionPhotos: photos.map((p, idx) => ({
            title: p.title,
            photoUrl: p.photoUrl,
            sortOrd: idx + 1
          }))
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSubmitSuccess(true);
        showToast('검수 요청이 성공적으로 발송되었습니다!');
        setTimeout(() => {
          setIsSubmitting(false);
          if (onSuccess) onSuccess(workSeq);
          handleClose();
        }, 1500);
      } else {
        alert(data.message || '검수 요청 처리 중 오류가 발생했습니다.');
        setIsSubmitting(false);
      }
    } catch (err: any) {
      console.error(err);
      alert('서버와 통신할 수 없습니다.');
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="relative w-full">
      {/* Toast alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[9999] bg-primary text-on-primary px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-semibold animate-bounce">
          <span className="material-symbols-outlined text-[20px] text-secondary-container">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Parent Background Simulation (When viewed standalone) */}
      {!asModal && (
        <div className="w-full max-w-[1280px] mx-auto px-margin-desktop py-space-lg filter blur-[5px] select-none pointer-events-none opacity-40 transition-all">
          <div className="flex items-center justify-between pb-space-md">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-md text-headline-md text-primary font-extrabold">
                작업 일정 및 현장 시공 관리
              </span>
              <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                11월 1일 (금) 금일 4건
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-9 px-4 rounded-lg bg-surface-container-highest text-on-surface font-label-md text-label-md flex items-center">
                주간 달력 보기
              </div>
              <div className="h-9 px-4 rounded-lg bg-primary text-on-primary font-label-md text-label-md flex items-center">
                + 신규 작업 등록
              </div>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-gutter-desktop mt-space-md">
            <div className="col-span-8 flex flex-col gap-space-md">
              <div className="p-space-lg rounded-xl bg-surface-container-lowest shadow-md flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-bold">
                    진행중 (시공중)
                  </span>
                  <span className="font-label-md text-label-md text-outline">오더번호: CNT-20261021-0001</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  일산동구 중앙로 빌라 4층 상가주택 정기 청소
                </h3>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  정기 1회차 • 전층 계단/복도/창틀/분리수거 구역 살균 정밀 세척
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FIXED MODAL OVERLAY WRAPPER */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-primary/60 backdrop-blur-md transition-opacity duration-300"
        id="job-modal-backdrop"
      >
        {/* Centered Modal Box (Max 780px) */}
        <div className="relative w-full max-w-[780px] my-auto bg-surface-container-lowest rounded-2xl shadow-2xl flex flex-col max-h-[942px] overflow-hidden transform transition-all duration-300 border border-surface-container-high/40">
          
          {/* 1. Modal Sticky Header */}
          <div className="sticky top-0 z-20 px-4 sm:px-space-lg py-4 sm:py-5 bg-surface-container-lowest/95 backdrop-blur-md flex flex-col gap-2 border-b border-surface-container">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold tracking-tight">
                    {orderNo}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                    정기케어 {roundNo}회차
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    {buildingTitle}
                  </span>
                </div>
                <h2 className="font-headline-lg text-headline-lg text-primary font-extrabold tracking-tight mt-0.5">
                  작업 상태 업데이트 및 완료 보고
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  현장 시공 단계(출발/시작/완료)를 갱신하고 검수 증빙 사진을 등록합니다.
                </p>
              </div>
              
              {/* Close button */}
              <button
                className="flex-shrink-0 p-2 rounded-xl text-outline hover:text-on-surface hover:bg-surface-container transition-colors group flex items-center gap-1.5"
                onClick={handleClose}
                title="닫기 (Esc)"
                type="button"
              >
                <span className="font-label-sm text-label-sm font-medium text-outline-variant group-hover:text-outline hidden sm:inline">
                  Esc
                </span>
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* 2. Interactive 3-Step Progress Tracker */}
            <div className="mt-2 pt-2">
              <div className="grid grid-cols-3 gap-2 relative">
                {/* Step 1: 현장 출발 (Done) */}
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className={`flex flex-col text-left gap-1 p-2.5 rounded-xl transition-all cursor-pointer ${
                    activeStep === 1
                      ? 'bg-primary text-on-primary shadow-md'
                      : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-label-sm text-label-sm font-bold ${
                        activeStep === 1 ? 'text-secondary-fixed' : 'text-secondary'
                      }`}
                    >
                      1단계
                    </span>
                    <span
                      className={`material-symbols-outlined text-[16px] ${
                        activeStep === 1 ? 'text-secondary-container' : 'text-secondary'
                      }`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  </div>
                  <span
                    className={`font-label-md text-label-md font-bold ${
                      activeStep === 1 ? 'text-on-primary' : 'text-on-surface'
                    }`}
                  >
                    1. 현장 출발
                  </span>
                  <span
                    className={`font-body-sm text-body-sm text-[11px] ${
                      activeStep === 1 ? 'text-primary-fixed-dim' : 'text-on-surface-variant'
                    }`}
                  >
                    전송 완료 08:35
                  </span>
                </button>

                {/* Step 2: 작업 시작 (Done) */}
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className={`flex flex-col text-left gap-1 p-2.5 rounded-xl transition-all cursor-pointer ${
                    activeStep === 2
                      ? 'bg-primary text-on-primary shadow-md'
                      : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-label-sm text-label-sm font-bold ${
                        activeStep === 2 ? 'text-secondary-fixed' : 'text-secondary'
                      }`}
                    >
                      2단계
                    </span>
                    <span
                      className={`material-symbols-outlined text-[16px] ${
                        activeStep === 2 ? 'text-secondary-container' : 'text-secondary'
                      }`}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check_circle
                    </span>
                  </div>
                  <span
                    className={`font-label-md text-label-md font-bold ${
                      activeStep === 2 ? 'text-on-primary' : 'text-on-surface'
                    }`}
                  >
                    2. 작업 시작
                  </span>
                  <span
                    className={`font-body-sm text-body-sm text-[11px] ${
                      activeStep === 2 ? 'text-primary-fixed-dim' : 'text-on-surface-variant'
                    }`}
                  >
                    시작 보고 09:02
                  </span>
                </button>

                {/* Step 3: 시공 완료 (Active Selected) */}
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className={`flex flex-col text-left gap-1 p-2.5 rounded-xl shadow-md relative overflow-hidden transition-all cursor-pointer ${
                    activeStep === 3
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  {activeStep === 3 && (
                    <div className="absolute -right-2 -bottom-2 w-12 h-12 bg-secondary/20 rounded-full blur-md"></div>
                  )}
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-label-sm text-label-sm font-bold ${
                        activeStep === 3 ? 'text-secondary-fixed' : 'text-primary'
                      }`}
                    >
                      최종 단계
                    </span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-fixed opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary-fixed"></span>
                    </span>
                  </div>
                  <span
                    className={`font-label-md text-label-md font-bold ${
                      activeStep === 3 ? 'text-on-primary' : 'text-on-surface'
                    }`}
                  >
                    3. 시공 완료 (작성중)
                  </span>
                  <span
                    className={`font-body-sm text-body-sm text-[11px] ${
                      activeStep === 3 ? 'text-primary-fixed-dim' : 'text-on-surface-variant'
                    }`}
                  >
                    진행률 100% • 보고서 제출
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable Modal Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-space-lg py-space-md flex flex-col gap-space-lg">
            
            {/* Section 3: Mandatory Completion Photo Uploads */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">photo_camera</span>
                  <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
                    시공 완료 필수 증빙 사진 등록{' '}
                    <span className="text-error font-normal text-body-sm">(최소 2장 필수)</span>
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-bold shadow-sm ${
                    photos.length >= 2
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-error-container text-on-error-container'
                  }`}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {photos.length >= 2 ? 'verified' : 'priority_high'}
                  </span>
                  <span>
                    {photos.length >= 2
                      ? `검증 완료 (${photos.length}/2 등록됨)`
                      : `사진 등록 필요 (${photos.length}/2)`}
                  </span>
                </span>
              </div>

              {/* Strict Inspection Notice Banner */}
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface-container-high text-on-surface border border-outline-variant/30">
                <span className="material-symbols-outlined text-tertiary-fixed-variant text-[20px] flex-shrink-0 mt-0.5">
                  warning
                </span>
                <div className="flex flex-col gap-0.5 text-[12px] leading-relaxed">
                  <span className="font-label-md text-label-md text-tertiary font-bold">
                    엄격 품질 검수 규정 안내
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    완료 사진 2장 미등록 시 고객 검수 요청 버튼이 비활성화되며, D+1 에스크로 정산이 자동
                    보류됩니다. 계단실 대리석 광택 및 현관 소독 후 상태가 선명하게 식별되는 고해상도 원본
                    사진을 유지해주세요.
                  </p>
                </div>
              </div>

              {/* Photo Card Grid (2 Completed + 1 Extra Slot) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm mt-1">
                {photos.map((p, idx) => (
                  <div
                    key={p.id}
                    className="group relative flex flex-col rounded-xl overflow-hidden bg-surface-container-lowest shadow-sm hover:shadow-md transition-all border border-surface-container-high"
                  >
                    <div className="relative w-full h-36 bg-surface-container overflow-hidden">
                      <img
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        alt={p.title}
                        src={p.photoUrl}
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-primary/80 backdrop-blur-md text-on-primary font-label-sm text-label-sm font-bold">
                        {p.title}
                      </div>
                      <button
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-surface-container-lowest/90 text-error hover:bg-error hover:text-on-error flex items-center justify-center shadow transition-colors"
                        title="사진 삭제"
                        type="button"
                        onClick={() => handleDeletePhoto(p.id)}
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                    <div className="p-3 flex flex-col gap-1.5 bg-surface-container-lowest">
                      <div className="flex items-center justify-between text-outline">
                        <span className="font-label-sm text-label-sm truncate font-medium text-on-surface max-w-[130px]">
                          {p.fileName}
                        </span>
                        <span className="font-label-sm text-label-sm text-[10px]">{p.fileSizeText}</span>
                      </div>
                      <div className="inline-flex items-center gap-1 px-1.5 py-1 rounded bg-secondary-fixed/50 text-on-secondary-fixed font-label-sm text-label-sm text-[11px] font-semibold">
                        <span className="material-symbols-outlined text-[14px] text-secondary">
                          check_circle
                        </span>
                        <span className="truncate">{p.aiVerificationText}</span>
                      </div>
                      <button
                        className="w-full py-1 text-center font-label-sm text-label-sm text-outline hover:text-primary transition-colors cursor-pointer"
                        type="button"
                        onClick={() => showToast(`${p.title} 사진 재촬영 모드가 활성화되었습니다.`)}
                      >
                        사진 다시 찍기 / 교체
                      </button>
                    </div>
                  </div>
                ))}

                {/* Slot: Additional Upload Area */}
                {photos.length < 5 && (
                  <div
                    onClick={handleAddSamplePhoto}
                    className="relative flex flex-col items-center justify-center h-full min-h-[220px] rounded-xl bg-surface-container-low hover:bg-surface-container transition-all cursor-pointer group p-4 text-center border-2 border-dashed border-outline-variant/60 hover:border-primary"
                  >
                    <div className="w-11 h-11 rounded-full bg-surface-container-highest text-primary group-hover:bg-primary group-hover:text-on-primary flex items-center justify-center transition-colors mb-2 shadow-sm">
                      <span className="material-symbols-outlined text-[24px]">add_photo_alternate</span>
                    </div>
                    <span className="font-label-md text-label-md text-on-surface font-bold">
                      + 추가 사진 등록
                    </span>
                    <span className="font-body-sm text-body-sm text-outline text-[11px] mt-0.5">
                      분리수거장 / 옥상 구역 등
                    </span>
                    <span className="mt-3 px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm font-semibold">
                      최대 5장 ({photos.length}/5)
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Inspection Checklist & Work Note */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
                  현장 필수 시공 점검표 (체크리스트)
                </h3>
                <span className="font-label-sm text-label-sm text-secondary font-bold">
                  전 항목 정상 점검됨 (
                  {Object.values(checklist).filter(Boolean).length}/3)
                </span>
              </div>

              {/* Interactive Checkbox Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label
                  onClick={() => setChecklist((prev) => ({ ...prev, stairs: !prev.stairs }))}
                  className={`flex items-center gap-2.5 p-3 rounded-xl cursor-pointer select-none transition-all ${
                    checklist.stairs ? 'bg-secondary-container/20 border border-secondary/40' : 'bg-surface-container-low'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      checklist.stairs ? 'text-secondary' : 'text-outline-variant'
                    }`}
                    style={{ fontVariationSettings: checklist.stairs ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {checklist.stairs ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md text-on-surface font-bold truncate">
                      1~4층 계단·복도 난간
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px] truncate">
                      스팀 및 먼지 흡입 완료
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setChecklist((prev) => ({ ...prev, recycling: !prev.recycling }))}
                  className={`flex items-center gap-2.5 p-3 rounded-xl cursor-pointer select-none transition-all ${
                    checklist.recycling ? 'bg-secondary-container/20 border border-secondary/40' : 'bg-surface-container-low'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      checklist.recycling ? 'text-secondary' : 'text-outline-variant'
                    }`}
                    style={{ fontVariationSettings: checklist.recycling ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {checklist.recycling ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md text-on-surface font-bold truncate">
                      1층 필로티 분리수거장
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px] truncate">
                      잔재물 정리·바닥 세척
                    </span>
                  </div>
                </label>

                <label
                  onClick={() => setChecklist((prev) => ({ ...prev, doorlock: !prev.doorlock }))}
                  className={`flex items-center gap-2.5 p-3 rounded-xl cursor-pointer select-none transition-all ${
                    checklist.doorlock ? 'bg-secondary-container/20 border border-secondary/40' : 'bg-surface-container-low'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[20px] ${
                      checklist.doorlock ? 'text-secondary' : 'text-outline-variant'
                    }`}
                    style={{ fontVariationSettings: checklist.doorlock ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {checklist.doorlock ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-md text-label-md text-on-surface font-bold truncate">
                      공용 현관문 및 도어락
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px] truncate">
                      피톤치드 살균 소독 완료
                    </span>
                  </div>
                </label>
              </div>

              {/* Partner Work Note Textarea */}
              <div className="flex flex-col gap-1.5 mt-2">
                <div className="flex items-center justify-between">
                  <label
                    className="font-label-md text-label-md text-on-surface font-bold flex items-center gap-1.5"
                    htmlFor="work-report-textarea"
                  >
                    <span>파트너 시공 특이사항 및 완료 리포트</span>
                    <span className="px-1.5 py-0.2 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm text-[11px]">
                      고객 알림톡 및 전용 웹페이지 전송
                    </span>
                  </label>
                  <span className="font-label-sm text-label-sm text-outline">
                    <strong className="text-primary font-bold">{workerMemo.length}</strong> / 300자
                  </span>
                </div>
                <div className="relative rounded-xl bg-surface-container-low p-1 focus-within:bg-surface-container transition-all border border-surface-container-high focus-within:border-primary">
                  <textarea
                    className="w-full bg-transparent p-2.5 font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none resize-none leading-relaxed"
                    id="work-report-textarea"
                    placeholder="현장 특이사항이나 고객 안내 메시지를 작성해 주세요."
                    rows={3}
                    maxLength={300}
                    value={workerMemo}
                    onChange={(e) => setWorkerMemo(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Escrow Settlement & Notification Preview Banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-surface-container-high text-on-surface shadow-sm border border-outline-variant/30">
              <div className="w-9 h-9 rounded-full bg-secondary text-on-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[20px]">mark_email_read</span>
              </div>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="font-label-md text-label-md text-primary font-bold">
                    카카오 알림톡 자동 발송 및 D+1 익일 정산 보장
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-extrabold">
                    안심 에스크로 {settlementAmt.toLocaleString()}원
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  완료 보고서 전송 시 <strong>{clientName}</strong>께 실시간 시공 사진 링크가 담긴 카카오
                  알림톡이 즉시 전송됩니다. 24시간 이내 비대면 자동 승인되며, 정산금{' '}
                  <strong>{settlementAmt.toLocaleString()}원</strong>은 등록된 기업은행 파트너 계좌로 익일
                  오전 10시 정산 입금됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* 6. Sticky Modal Footer Action Bar */}
          <div className="sticky bottom-0 z-20 px-4 sm:px-space-lg py-3.5 bg-surface-container-lowest/95 backdrop-blur-md flex items-center justify-between border-t border-surface-container shadow-lg">
            {/* Left: Cancel / Save draft */}
            <div className="flex items-center gap-3">
              <button
                className="px-4 py-2.5 rounded-xl text-on-surface-variant hover:bg-surface-container font-label-md text-label-md transition-colors cursor-pointer"
                onClick={handleClose}
                type="button"
              >
                취소 / 닫기
              </button>
              <div className="hidden sm:flex items-center gap-1.5 text-outline">
                <span className="material-symbols-outlined text-[16px]">cloud_done</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">임시저장됨 (11:42)</span>
              </div>
            </div>

            {/* Right: Primary Action CTA */}
            <div className="flex items-center gap-2">
              <button
                disabled={photos.length < 2 || isSubmitting}
                className={`group relative inline-flex items-center justify-center gap-2 px-6 sm:px-7 py-3 rounded-xl font-label-lg text-label-lg font-bold shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer ${
                  photos.length >= 2
                    ? submitSuccess
                      ? 'bg-primary text-on-primary'
                      : 'bg-secondary text-on-secondary hover:bg-secondary-container hover:text-on-secondary-container'
                    : 'bg-surface-container text-on-surface-variant opacity-60 cursor-not-allowed'
                }`}
                onClick={handleSubmitReport}
                type="button"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[20px]">
                      progress_activity
                    </span>
                    <span>알림톡 전송 및 에스크로 완료 승인 처리중...</span>
                  </>
                ) : submitSuccess ? (
                  <>
                    <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    <span>전송 완료! 고객 검수 대기중</span>
                  </>
                ) : photos.length >= 2 ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] transition-transform group-hover:translate-x-0.5">
                      send
                    </span>
                    <span>사진 {photos.length}장 검증 완료 / 고객에게 검수 요청 발송</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">warning</span>
                    <span>시공 완료 사진 2장을 등록해 주세요 ({photos.length}/2)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
