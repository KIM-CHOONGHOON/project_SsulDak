import React, { useState, useEffect, useRef } from 'react';
import PtnrJob01Modal from '../PTNR-JOB-01/index.tsx';

export interface ChatMessage {
  msgSeq: number;
  roomNo?: string;
  senderType: 'USER' | 'PARTNER' | 'SYSTEM';
  senderId?: string;
  msgType: 'TEXT' | 'IMAGE' | 'NOTICE';
  content: string;
  attachImgUrl?: string | null;
  isReadYn?: string;
  regDt?: string;
  timeText?: string;
}

export interface PtnrJob02Props {
  contractNo?: string;
  ptnrNo?: string;
  onNavigate?: (screen: string, params?: any) => void;
}

export default function PtnrJob02({
  contractNo = 'CT2026102100001',
  ptnrNo = 'P20261000001',
  onNavigate
}: PtnrJob02Props) {
  // Chat Room & Contract Data
  const [roomNo, setRoomNo] = useState<string>('RM2026102100001');
  const [customerNm, setCustomerNm] = useState<string>('김충훈 고객님');
  const [safeTelNo, setSafeTelNo] = useState<string>('0507-1234-5678');
  const [subItemNm, setSubItemNm] = useState<string>(
    '일산동구 중앙로 빌라 정기청소 3개월 (월 80,000원 직불)'
  );
  const [addrRoad, setAddrRoad] = useState<string>(
    '경기 고양시 일산동구 중앙로 1261번길 18-4'
  );
  const [totalPayAmt, setTotalPayAmt] = useState<number>(240000);
  const [firstVisitText, setFirstVisitText] = useState<string>(
    '2026.11.01(일) 09:00 확정'
  );

  // Messages Stream
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  // Modal for PTNR-JOB-01 integration
  const [isJob01Open, setIsJob01Open] = useState<boolean>(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-scroll ref
  const streamEndRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const scrollToBottom = () => {
    if (streamEndRef.current) {
      streamEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Initial Chat Load
  useEffect(() => {
    loadChat();
  }, [contractNo]);

  // Polling for incremental messages every 3 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      syncMessages();
    }, 3000);
    return () => clearInterval(timer);
  }, [roomNo, messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChat = async () => {
    try {
      const res = await fetch('/api/partner/ptnr_job_02', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'INIT_CHAT',
          ptnrNo,
          contractNo
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          if (json.roomNo) setRoomNo(json.roomNo);
          if (json.contract) {
            setCustomerNm(json.contract.customerNm || '김충훈 고객님');
            setSafeTelNo(json.contract.safeTelNo || '0507-1234-5678');
            setSubItemNm(json.contract.subItemNm);
            setAddrRoad(json.contract.addrRoad);
            setTotalPayAmt(json.contract.totalPayAmt || 240000);
            if (json.contract.firstVisitText) {
              setFirstVisitText(json.contract.firstVisitText);
            }
          }
          if (json.messages && json.messages.length > 0) {
            setMessages(json.messages);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load chat, using demo records', err);
    }
  };

  const syncMessages = async () => {
    if (!roomNo || messages.length === 0) return;
    const lastSeq = messages[messages.length - 1].msgSeq || 0;

    try {
      const res = await fetch('/api/partner/ptnr_job_02', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'SYNC_MESSAGES',
          contractNo,
          roomNo,
          lastMsgSeq: lastSeq
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.newMessages && json.newMessages.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.msgSeq));
            const fresh = json.newMessages.filter((m: ChatMessage) => !existingIds.has(m.msgSeq));
            if (fresh.length > 0) {
              return [...prev, ...fresh];
            }
            return prev;
          });
        }
      }
    } catch (err) {
      // Ignore polling errors
    }
  };

  const handleSendMessage = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;

    setIsSending(true);

    const now = new Date();
    const timeText = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    // Optimistic UI update
    const tempSeq = Date.now();
    const optimisticMsg: ChatMessage = {
      msgSeq: tempSeq,
      roomNo,
      senderType: 'PARTNER',
      senderId: ptnrNo,
      msgType: 'TEXT',
      content: text,
      isReadYn: 'N',
      timeText
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    try {
      const res = await fetch('/api/partner/ptnr_job_02', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'SEND_MESSAGE',
          ptnrNo,
          contractNo,
          roomNo,
          content: text
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.msgSeq) {
          setMessages((prev) =>
            prev.map((m) => (m.msgSeq === tempSeq ? { ...m, msgSeq: json.msgSeq } : m))
          );
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      showToast('메시지 전송에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSending(false);
    }
  };

  const handleInsertTemplate = (template: string) => {
    setInputText(template);
  };

  const handleCallSafeTel = () => {
    window.location.href = `tel:${safeTelNo.replace(/[^0-9]/g, '')}`;
  };

  const handleBackToJobs = () => {
    if (onNavigate) {
      onNavigate('PTNR-JOB-00');
    } else {
      window.location.hash = '#ptnr-job-00';
    }
  };

  return (
    <div className="w-full bg-surface min-h-[calc(100vh-140px)] flex flex-col font-body-md text-on-surface antialiased">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[9999] bg-primary text-on-primary px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-sm font-semibold animate-bounce">
          <span className="material-symbols-outlined text-[20px] text-secondary-container">
            info
          </span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* PTNR-JOB-01 Modal Overlay (Embedded) */}
      {isJob01Open && (
        <PtnrJob01Modal
          isOpen={isJob01Open}
          asModal={true}
          contractNo={contractNo}
          workSeq={2}
          onClose={() => setIsJob01Open(false)}
          onSuccess={() => {
            setIsJob01Open(false);
            showToast('시공 완료 보고서가 성공적으로 전송되었습니다.');
          }}
        />
      )}

      {/* Top Navigation & Control Header */}
      <div className="w-full bg-surface-container-lowest shadow-[0_1px_3px_rgba(22,59,102,0.05)] border-b border-surface-container">
        <div className="max-w-[1440px] mx-auto px-4 md:px-margin-desktop py-space-sm flex flex-col gap-space-xs">
          
          {/* Breadcrumbs & Back Link */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-on-surface-variant font-label-md text-label-md flex-wrap">
              <span
                onClick={() => onNavigate ? onNavigate('PTNR-DSH-00') : (window.location.hash = '#ptnr-dsh-00')}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                홈
              </span>
              <span className="material-symbols-outlined text-[14px] text-outline-variant">
                chevron_right
              </span>
              <span
                onClick={() => onNavigate ? onNavigate('PTNR-DSH-00') : (window.location.hash = '#ptnr-dsh-00')}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                대시보드 (PTNR-DSH-00)
              </span>
              <span className="material-symbols-outlined text-[14px] text-outline-variant">
                chevron_right
              </span>
              <span className="hover:text-primary transition-colors cursor-pointer">
                작업/배차 관제
              </span>
              <span className="material-symbols-outlined text-[14px] text-outline-variant">
                chevron_right
              </span>
              <span
                onClick={handleBackToJobs}
                className="hover:text-primary transition-colors cursor-pointer"
              >
                예약 및 작업 관리 (PTNR-JOB-00)
              </span>
              <span className="material-symbols-outlined text-[14px] text-outline-variant">
                chevron_right
              </span>
              <span className="text-primary font-bold">고객 1:1 상담 채팅</span>
            </div>

            <button
              onClick={handleBackToJobs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-low text-primary hover:bg-surface-container font-label-md text-label-md transition-all group cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px] group-hover:-translate-x-0.5 transition-transform">
                arrow_back
              </span>
              <span>작업 관리로 돌아가기 (PTNR-JOB-00)</span>
            </button>
          </div>

          {/* Customer Action Bar */}
          <div className="flex items-center justify-between flex-wrap gap-4 pt-1">
            <div className="flex items-center gap-space-md">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary-container to-surface-tint flex items-center justify-center text-on-primary font-headline-sm text-headline-sm shadow-sm font-bold">
                  {customerNm.charAt(0) || '김'}
                </div>
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-secondary ring-2 ring-surface-container-lowest"></span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-headline-md text-headline-md text-on-surface font-extrabold">
                    {customerNm}
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-sm text-label-sm font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
                    정기계약 진행중
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold">
                    빌라정기 12회차 패키지
                  </span>
                </div>
                <div className="flex items-center gap-space-sm font-body-sm text-body-sm text-on-surface-variant flex-wrap pt-0.5">
                  <span className="flex items-center gap-1 font-medium text-primary">
                    <span className="material-symbols-outlined text-[14px] text-secondary">
                      verified_user
                    </span>
                    안심번호 {safeTelNo}
                  </span>
                  <span className="text-outline-variant">/</span>
                  <span>최근 시공 완료율 100%</span>
                  <span className="text-outline-variant">/</span>
                  <span className="text-secondary font-semibold">에스크로 전액 예치완료</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-space-sm flex-wrap">
              <button
                onClick={handleCallSafeTel}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed-dim transition-colors font-label-md text-label-md font-bold shadow-sm cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">phone_in_talk</span>
                <span>0507 안심번호 통화 연결</span>
              </button>

              <button
                onClick={() => setIsJob01Open(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container transition-all font-label-md text-label-md font-bold shadow-sm cursor-pointer"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">fact_check</span>
                <span>작업상태 갱신 모달 열기 (PTNR-JOB-01)</span>
              </button>

              <button
                onClick={() => showToast('공동현관 비번: #1234* / 안심번호: ' + safeTelNo)}
                className="w-9 h-9 rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition-colors cursor-pointer"
                title="더보기"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">more_vert</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout (68% : 32%) */}
      <div className="max-w-[1440px] w-full mx-auto px-4 md:px-margin-desktop py-space-lg flex flex-col lg:flex-row gap-gutter-desktop items-start">
        
        {/* Left Column: Full-Featured Chat Console (68%) */}
        <div className="w-full lg:w-[68%] flex flex-col gap-space-md">
          
          {/* Job Context Banner */}
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex flex-col gap-2 border border-surface-container">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-primary-container text-on-primary-container font-label-sm text-label-sm font-bold">
                  오더 번호
                </span>
                <span className="font-label-md text-label-md text-on-surface font-extrabold tracking-tight">
                  CNT-20261021-0001
                </span>
                <span className="text-outline-variant">|</span>
                <span className="font-label-md text-label-md text-primary font-bold">
                  {subItemNm}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">event_available</span>
                D-Day 10/31 18:00 기준 시공 확정
              </span>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-2 text-on-surface-variant font-body-sm text-body-sm bg-surface-container-low px-3 py-2 rounded-lg">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="material-symbols-outlined text-[16px] text-primary">
                  calendar_month
                </span>
                <span>
                  첫 방문일: <strong className="text-on-surface">{firstVisitText}</strong>
                </span>
                <span className="text-outline-variant">·</span>
                <span>범위: 계단(1~4층) + 복도 + 1층 분리수거장 고압 세척</span>
              </div>
              <span className="text-secondary font-bold font-label-sm text-label-sm flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                배차 검증 완료
              </span>
            </div>
          </div>

          {/* Legal & Escrow Warning Notice */}
          <div className="bg-surface-container-high rounded-xl p-3 flex items-start gap-2.5 text-on-surface border border-outline-variant/30">
            <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">
              policy
            </span>
            <div className="flex flex-col">
              <p className="font-body-sm text-body-sm leading-snug">
                안전한 거래와 분쟁 예방을 위해{' '}
                <strong className="text-error font-bold">
                  개인 연락처 및 계좌번호 직거래 유도는 24시간 자동 모니터링
                </strong>
                되며, 시공 관련 모든 대화와 사진은{' '}
                <strong className="text-primary font-bold">
                  에스크로 정산 확정 증빙 자료로 암호화 자동 보관
                </strong>
                됩니다.
              </p>
            </div>
          </div>

          {/* Chat Stream Container */}
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm flex flex-col h-[580px] overflow-hidden border border-surface-container">
            
            {/* Stream Scroll Area */}
            <div
              className="flex-1 p-4 sm:p-space-lg overflow-y-auto flex flex-col gap-space-lg bg-surface-bright/40"
              id="chatStream"
            >
              {/* Date Separator */}
              <div className="flex items-center justify-center my-1">
                <span className="px-3 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm tracking-wide">
                  2026년 10월 30일 (금)
                </span>
              </div>

              {/* Dynamic Messages Loop */}
              {messages.map((m, idx) => {
                if (m.senderType === 'SYSTEM') {
                  return (
                    <div key={`msg-${m.msgSeq || idx}`} className="flex items-start justify-center">
                      <div className="max-w-[85%] bg-surface-container-low rounded-xl px-4 py-3 flex items-center gap-3 shadow-none border border-surface-container-high/50">
                        <span className="material-symbols-outlined text-primary text-[22px] shrink-0">
                          info_spark
                        </span>
                        <p className="font-body-sm text-body-sm text-on-surface leading-snug">
                          {m.content}
                        </p>
                      </div>
                    </div>
                  );
                }

                if (m.senderType === 'PARTNER') {
                  return (
                    <div
                      key={`msg-${m.msgSeq || idx}`}
                      className="flex items-end justify-end gap-2 group animate-fadeIn"
                    >
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-label-sm text-[11px] text-secondary font-bold">
                          {m.isReadYn === 'Y' ? '읽음 1' : '전송됨'}
                        </span>
                        <span className="font-label-sm text-[10px] text-outline">
                          {m.timeText || '14:20'}
                        </span>
                      </div>
                      <div className="max-w-[72%] bg-primary-container text-on-primary rounded-2xl rounded-tr-xs p-space-md shadow-md">
                        {m.attachImgUrl && (
                          <img
                            src={m.attachImgUrl}
                            alt="첨부 사진"
                            className="w-full rounded-xl mb-2 object-cover max-h-48"
                          />
                        )}
                        <p className="font-body-md text-body-md leading-relaxed whitespace-pre-line">
                          {m.content}
                        </p>
                      </div>
                    </div>
                  );
                }

                // USER Message
                return (
                  <div
                    key={`msg-${m.msgSeq || idx}`}
                    className="flex items-end justify-start gap-3 group animate-fadeIn"
                  >
                    <div className="w-8 h-8 rounded-full bg-surface-container-high text-primary flex items-center justify-center font-bold text-[13px] shrink-0">
                      {customerNm.charAt(0) || '김'}
                    </div>
                    <div className="max-w-[72%] bg-surface-container-low text-on-surface rounded-2xl rounded-tl-xs p-space-md shadow-sm flex flex-col gap-1 border border-surface-container">
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                        {customerNm}
                      </span>
                      {m.attachImgUrl && (
                        <img
                          src={m.attachImgUrl}
                          alt="고객 첨부 사진"
                          className="w-full rounded-xl mb-2 object-cover max-h-48"
                        />
                      )}
                      <p className="font-body-md text-body-md leading-relaxed whitespace-pre-line">
                        {m.content}
                      </p>
                    </div>
                    <span className="font-label-sm text-[10px] text-outline pb-1">
                      {m.timeText || '14:24'}
                    </span>
                  </div>
                );
              })}

              <div ref={streamEndRef} />
            </div>

            {/* Quick Reply Suggestion Chips */}
            <div className="px-space-md py-2 bg-surface-container-lowest flex items-center gap-2 overflow-x-auto border-t border-surface-container">
              <span className="font-label-sm text-label-sm text-outline shrink-0 font-bold">
                빠른 응답:
              </span>
              <button
                className="shrink-0 px-3 py-1 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors font-label-sm text-label-sm cursor-pointer"
                onClick={() => handleInsertTemplate('현장 도착 10분 전입니다. 안전하게 대기 중입니다.')}
                type="button"
              >
                ⚡ 현장 도착 10분 전입니다
              </button>
              <button
                className="shrink-0 px-3 py-1 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors font-label-sm text-label-sm cursor-pointer"
                onClick={() => handleInsertTemplate('공동현관 비밀번호 확인 부탁드립니다.')}
                type="button"
              >
                🔑 공동현관 비밀번호 확인 요청
              </button>
              <button
                className="shrink-0 px-3 py-1 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors font-label-sm text-label-sm cursor-pointer"
                onClick={() => handleInsertTemplate('분리수거장 시공 완료 사진 전송드립니다. 확인 부탁드립니다.')}
                type="button"
              >
                📸 분리수거장 시공 완료 사진 전송
              </button>
              <button
                className="shrink-0 px-3 py-1 rounded-full bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors font-label-sm text-label-sm cursor-pointer"
                onClick={() => handleInsertTemplate('오늘 정기 시공 완료 보고서가 플랫폼에 정식 등록되었습니다.')}
                type="button"
              >
                📋 시공 완료 보고서 전송 안내
              </button>
            </div>

            {/* Bottom Chat Input Dock */}
            <div className="p-space-md bg-surface-container-lowest flex flex-col gap-2 border-t border-surface-container">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <button
                  className="p-2 rounded-lg hover:bg-surface-container-low transition-colors text-primary flex items-center justify-center cursor-pointer"
                  title="파일 첨부"
                  type="button"
                  onClick={() => showToast('파일 첨부 기능이 열렸습니다.')}
                >
                  <span className="material-symbols-outlined text-[20px]">attach_file</span>
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-surface-container-low transition-colors text-primary flex items-center justify-center cursor-pointer"
                  title="현장 사진 전송"
                  type="button"
                  onClick={() => setIsJob01Open(true)}
                >
                  <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                </button>
                <button
                  className="p-2 rounded-lg hover:bg-surface-container-low transition-colors text-primary flex items-center justify-center cursor-pointer"
                  title="표준 시공 체크리스트"
                  type="button"
                  onClick={() => setIsJob01Open(true)}
                >
                  <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                </button>
                <div className="h-4 w-px bg-outline-variant/60 mx-1"></div>
                <span className="font-label-sm text-label-sm text-outline">
                  엔터키(Enter)로 즉시 전송
                </span>
              </div>

              <div className="flex items-end gap-space-sm">
                <div className="flex-1 bg-surface-container-low rounded-xl px-4 py-2.5 focus-within:ring-2 focus-within:ring-primary/20 transition-all border border-surface-container-high">
                  <textarea
                    className="w-full bg-transparent resize-none outline-none font-body-md text-body-md text-on-surface placeholder:text-outline text-left"
                    id="chatInput"
                    placeholder={`${customerNm}에게 메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)`}
                    rows={2}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                <button
                  className="h-12 px-6 rounded-xl bg-primary text-on-primary hover:bg-primary-container font-label-lg text-label-lg font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  onClick={handleSendMessage}
                  disabled={!inputText.trim() || isSending}
                  type="button"
                >
                  <span>전송</span>
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Job Context & Safety Sidebar (32%) */}
        <div className="w-full lg:w-[32%] flex flex-col gap-space-md lg:sticky lg:top-20">
          
          {/* Card 1: Job Overview */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md border border-surface-container">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
                <h2 className="font-headline-sm text-headline-sm text-primary font-bold">
                  의뢰 상세 요약
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-bold">
                정기 1/12회차
              </span>
            </div>

            <div className="flex flex-col gap-space-sm">
              {/* Address & Location */}
              <div className="flex flex-col gap-1 p-3 rounded-xl bg-surface-container-low border border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-bold">
                    현장 주소
                  </span>
                  <a
                    href={`https://map.naver.com/v5/search/${encodeURIComponent(addrRoad)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-label-sm text-label-sm text-secondary font-bold flex items-center gap-0.5 hover:underline"
                  >
                    <span className="material-symbols-outlined text-[13px]">navigation</span>
                    <span>T맵 길안내</span>
                  </a>
                </div>
                <p className="font-body-md text-body-md text-on-surface font-semibold">
                  {addrRoad}
                </p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  빌라 4층 상가주택 전 층 (계단·복도·현관)
                </p>
              </div>

              {/* Environment Features */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-surface-container-low flex flex-col items-center justify-center text-center">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    elevator
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface mt-1 font-bold">
                    승강기 있음
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-low flex flex-col items-center justify-center text-center">
                  <span className="material-symbols-outlined text-secondary text-[18px]">
                    local_parking
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface mt-1 font-bold">
                    필로티 무료
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-low flex flex-col items-center justify-center text-center">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    water_drop
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface mt-1 font-bold">
                    1층 수전 사용
                  </span>
                </div>
              </div>

              {/* Access Pin */}
              <div className="p-3 rounded-xl bg-secondary-container/30 flex items-center justify-between border border-secondary/30">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-on-secondary-container text-[20px]">
                    vpn_key
                  </span>
                  <span className="font-label-md text-label-md text-on-secondary-container font-bold">
                    공동현관 비번
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-headline-sm text-headline-sm text-on-secondary-container font-mono tracking-wider font-extrabold">
                    #1234*
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-container-lowest text-on-secondary-container font-label-sm text-label-sm font-bold shadow-xs">
                    잠금해제됨
                  </span>
                </div>
              </div>

              {/* Schedule & Settlement Info */}
              <div className="flex flex-col gap-2 pt-1 font-body-sm text-body-sm">
                <div className="flex items-center justify-between py-1">
                  <span className="text-on-surface-variant">계약 기간</span>
                  <span className="text-on-surface font-semibold">2026.11.01 ~ 2027.01.31 (3개월)</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-on-surface-variant">다음 시공 일시</span>
                  <span className="text-primary font-bold">1회차 {firstVisitText}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-on-surface-variant">총 계약 금액</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-extrabold">
                    {totalPayAmt.toLocaleString()}원
                  </span>
                </div>
                <div className="flex items-center justify-between px-2.5 py-2 rounded-lg bg-surface-container text-[12px]">
                  <span className="text-on-surface-variant font-medium">월 정산 금액 (에스크로)</span>
                  <span className="text-secondary font-bold">월 80,000원 (매월 5일 지급)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Essential Site Checkpoints & Photo Gallery */}
          <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md border border-surface-container">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  add_a_photo
                </span>
                <h3 className="font-headline-sm text-headline-sm text-primary font-bold">
                  현장 체크포인트 &amp; 사진
                </h3>
              </div>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                고객 업로드 2장
              </span>
            </div>

            {/* Thumbnail Previews */}
            <div className="grid grid-cols-2 gap-space-sm">
              <div className="relative group rounded-xl overflow-hidden shadow-sm aspect-video bg-surface-container">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  alt="계단실 (1~4층)"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQvNPxzw28xmG8XhTttxY2plyeTPczN16yAO8PJHiIEmxoL2oOL-KPZ-f4yVu3ZIqxqbp5u4jAxtsNvCXhtfdH64IqFgXOsgcZYrBUlog9MX6VdYGWjLczz09ogTFdkLox0CKSeJ5fWs3s8XasQ1CvwSo8rlY9CoPvIaWSajNns8f1yTOfHENMHAup2mp6oyV3yixCPljT_sAVfz9QsLKGg5LUnrmqFbxnBtr1ro01PKQOYqFHdYYx"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent flex items-end p-2">
                  <span className="text-on-primary font-label-sm text-label-sm font-semibold">
                    계단실 (1~4층)
                  </span>
                </div>
              </div>

              <div className="relative group rounded-xl overflow-hidden shadow-sm aspect-video bg-surface-container">
                <img
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  alt="1층 분리수거장"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCWQF6KjeiMIIu7SalNXfu1EUEctv0LykKB9dSdYusbqHI4WmkjAaxWuEv9bH7R1kjS2L-Qbw5Z30AdcLYE8mhrQSuCuw5VtG2Tkhc-gdNMoA8Vgf2N0DilJpjW_yA-jKzS7tKQzKZKFNjdbsVCVM2dUA4gFrJPJB_e1Yk1rXpiaq42c8LOYYE1K7FVqiR4xsGsMOR1jYDjWUFsV1j0eiGnP7p5sXT1_fXOXlrGy3vsrQ56liRfUGyT"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent flex items-end p-2">
                  <span className="text-on-primary font-label-sm text-label-sm font-semibold">
                    1층 분리수거장
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1.5 border border-surface-container">
              <div className="flex items-center gap-1.5 text-primary font-label-sm text-label-sm font-bold">
                <span className="material-symbols-outlined text-[16px] text-secondary">
                  check_circle
                </span>
                <span>필수 검수 규정 안내</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                정산 승인을 위해 <strong>시공 전 2장, 시공 후 2장</strong>의 증빙 사진을 반드시 현장에서
                촬영하여 업로드해야 합니다.
              </p>
            </div>

            <button
              onClick={() => setIsJob01Open(true)}
              className="w-full py-2.5 rounded-xl bg-surface-container text-primary hover:bg-surface-container-high transition-colors font-label-md text-label-md font-bold flex items-center justify-center gap-1 cursor-pointer"
              type="button"
            >
              <span>PTNR-JOB-01 작업상태 갱신 바로가기</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          </div>

          {/* Card 3: 24h Partner Control Emergency Center */}
          <div className="bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-2xl p-space-lg shadow-md flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary-fixed text-[22px]">
                  emergency
                </span>
                <span className="font-headline-sm text-headline-sm font-bold">24시 파트너 긴급관제</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-on-primary/10 text-on-primary font-label-sm text-label-sm">
                365일 관제
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-primary-container leading-relaxed">
              현장 고객 부재, 진입 불가(도어락 오류), 시공 분쟁 발생 시 즉시 신고하시면 관제사가 중재 개입합니다.
            </p>
            <div className="p-3 rounded-xl bg-on-primary/10 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-on-primary-container font-label-sm text-label-sm">
                  파트너 노쇼 보호
                </span>
                <span className="text-on-primary font-headline-sm text-headline-sm font-extrabold tracking-tight">
                  100% 위약금 보장
                </span>
              </div>
              <a
                href="tel:1588-0000"
                className="px-3.5 py-1.5 rounded-lg bg-secondary text-on-secondary hover:bg-secondary/90 transition-colors font-label-md text-label-md font-bold flex items-center gap-1 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">call</span>
                <span>1588-0000</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
