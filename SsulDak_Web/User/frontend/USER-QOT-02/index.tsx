/**
 * =============================================================================
 * SsulDak (쓸고닦고) 프론트엔드 컴포넌트
 * 화면 ID: USER-QOT-02 (파트너 1:1 상담 채팅)
 * 파일 경로: SsulDak_Web/User/frontend/USER-QOT-02/index.tsx
 * 엔드포인트 URL: POST /api/user/user_qot_02
 * 부모 호출 화면: USER-QOT-01 (파트너 프로필 확인) 또는 USER-HIS-00 (계약/시공 내역)
 * =============================================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// =============================================================================
// 1. 타입 인터페이스 정의
// =============================================================================

export interface ChatPartnerInfo {
  ptnrNo: string;
  companyNm: string;
  ceoNm: string;
  profileImgUrl: string;
}

export interface ChatContractInfo {
  contractNo: string;
  contractStatCd: string;
  totalPayAmt: number;
  serviceStartDt: string;
  safeTelNo: string;
  subItemNm: string;
  partner: ChatPartnerInfo;
}

export interface ChatMessageItem {
  msgSeq: number;
  senderType: 'USER' | 'PARTNER' | 'SYSTEM';
  senderId: string;
  msgType: 'TEXT' | 'IMAGE' | 'NOTICE';
  content: string;
  attachImgUrl?: string | null;
  isReadYn: string;
  regDt: string;
}

export interface UserQot02Props {
  onNavigate?: (screenId: string, params?: any) => void;
  initialContractNo?: string;
  initialUserNo?: string;
  apiEndpoint?: string;
}

// =============================================================================
// 2. 메인 컴포넌트
// =============================================================================

export default function UserQot02Screen({
  onNavigate,
  initialContractNo = 'CT2026102200001',
  initialUserNo = 'U20261000001',
  apiEndpoint = '/api/user/user_qot_02',
}: UserQot02Props) {
  // 상태 변수
  const [contract, setContract] = useState<ChatContractInfo>({
    contractNo: initialContractNo,
    contractStatCd: 'CONFIRMED',
    totalPayAmt: 240000,
    serviceStartDt: '2026-11-01 09:00:00',
    safeTelNo: '0507-1234-5678',
    subItemNm: '정기청소 3개월 (월 4회)',
    partner: {
      ptnrNo: 'P20260900012',
      companyNm: '반짝빌라클린',
      ceoNm: '홍길동',
      profileImgUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuB5bKf0Lz0uCFjdpGFGZBfNm1yYpX7CutM1gcBnqEz4F0itndi5cCbW7mEuYSpwzrhZ3Lt3dHzip-Nik3_NwV2JMOiGrx0vjW4reDxmTRtT35MiqiqH-gWzSRhYft-ydBDTyHwk0U1zwI37UjY79RzFWsAWNVmeIHpxjEWmdbcxQUQ2ICv3kd58WpZT1z8vTBD5_ln8aJdqWcw6LTDMWKXTlMoFGh0S5fMaSRnBedlqE2DSm5RfXKij',
    },
  });

  const [roomNo, setRoomNo] = useState<string>('RM2026102200001');
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      msgSeq: 1,
      senderType: 'SYSTEM',
      senderId: 'SYSTEM',
      msgType: 'NOTICE',
      content:
        '양측 데이터 이용료 및 청약 확약이 완료되어 1:1 상담 채팅방이 열렸습니다. 공동현관 비밀번호, 주차 위치, 특이 오염 구역을 조율해 보세요.',
      attachImgUrl: null,
      isReadYn: 'Y',
      regDt: '2026-10-22 10:00:00',
    },
    {
      msgSeq: 2,
      senderType: 'PARTNER',
      senderId: 'P20260900012',
      msgType: 'TEXT',
      content:
        '안녕하세요 고객님! 반짝빌라클린 홍길동 대표입니다. 😊\n11월 1일 일요일 오전 9시에 방문드리겠습니다. 시공 당일 원활한 출입을 위해 1층 공동현관 비밀번호와 주차 유의사항 부탁드립니다.',
      attachImgUrl: null,
      isReadYn: 'Y',
      regDt: '2026-10-22 10:14:00',
    },
    {
      msgSeq: 3,
      senderType: 'USER',
      senderId: initialUserNo,
      msgType: 'TEXT',
      content: '네 기사님! 1층 공동현관 비번은 #1234* 입니다. 주차는 건물 필로티 주차장에 하시면 됩니다.',
      attachImgUrl: null,
      isReadYn: 'Y',
      regDt: '2026-10-22 10:16:00',
    },
    {
      msgSeq: 4,
      senderType: 'PARTNER',
      senderId: 'P20260900012',
      msgType: 'TEXT',
      content:
        '확인 감사드립니다! 혹시 2층 복도 창틀이나 분리수거장 쪽에 특별히 신경써야 할 부분이 있으시면 미리 사진 남겨주세요. 당일 맞춤 장비를 준비해 가겠습니다.',
      attachImgUrl: null,
      isReadYn: 'Y',
      regDt: '2026-10-22 10:17:00',
    },
  ]);

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const chatStreamRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 스크롤 최하단 이동
  const scrollToBottom = useCallback((smooth = true) => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTo({
        top: chatStreamRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  // ---------------------------------------------------------------------------
  // 1. 초기 채팅방 로딩 (INIT_CHAT)
  // ---------------------------------------------------------------------------
  const initChat = useCallback(async () => {
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'INIT_CHAT',
          userNo: initialUserNo,
          contractNo: initialContractNo,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (data.contract) setContract(data.contract);
        if (data.roomNo) setRoomNo(data.roomNo);
        if (data.messages && data.messages.length > 0) {
          setMessages(data.messages);
        }
        setTimeout(() => scrollToBottom(false), 100);
      } else if (data.code === 'PAYMENT_REQUIRED') {
        showToast('⚠️ 상호 결제가 완료되어야 상담 채팅방이 열립니다.');
      }
    } catch (err) {
      console.warn('초기 채팅 로드 실패 (fallback 유지):', err);
    }
  }, [apiEndpoint, initialContractNo, initialUserNo, scrollToBottom]);

  useEffect(() => {
    initChat();
  }, [initChat]);

  // ---------------------------------------------------------------------------
  // 2. 메시지 증분 동기화 폴링 (SYNC_MESSAGES - 4초 간격)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(async () => {
      if (messages.length === 0) return;
      const lastSeq = messages[messages.length - 1].msgSeq || 0;

      try {
        const res = await fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: 'SYNC_MESSAGES',
            contractNo: initialContractNo,
            roomNo,
            lastMsgSeq: lastSeq,
          }),
        });
        const data = await res.json();
        if (data.success && data.messages && data.messages.length > 0) {
          setMessages((prev) => {
            const existingSeqs = new Set(prev.map((m) => m.msgSeq));
            const newOnes = data.messages.filter((m: ChatMessageItem) => !existingSeqs.has(m.msgSeq));
            if (newOnes.length > 0) {
              setTimeout(() => scrollToBottom(true), 50);
              return [...prev, ...newOnes];
            }
            return prev;
          });
        }
      } catch (err) {
        // 백그라운드 폴링 에러 무시
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [apiEndpoint, initialContractNo, roomNo, messages, scrollToBottom]);

  // ---------------------------------------------------------------------------
  // 3. 메시지 전송 (SEND_MESSAGE)
  // ---------------------------------------------------------------------------
  const handleSendMessage = async (textToSend?: string, attachedImgUrl?: string) => {
    const content = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!content && !attachedImgUrl) return;

    setIsSending(true);
    setInputText('');

    // 낙관적 UI 업데이트
    const tempSeq = Date.now();
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const optimisticMsg: ChatMessageItem = {
      msgSeq: tempSeq,
      senderType: 'USER',
      senderId: initialUserNo,
      msgType: attachedImgUrl ? 'IMAGE' : 'TEXT',
      content: content || '사진을 전송했습니다.',
      attachImgUrl: attachedImgUrl || null,
      isReadYn: 'N',
      regDt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom(true), 50);

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'SEND_MESSAGE',
          userNo: initialUserNo,
          contractNo: initialContractNo,
          roomNo,
          msgType: attachedImgUrl ? 'IMAGE' : 'TEXT',
          content: content || '사진을 전송했습니다.',
          imgUrl: attachedImgUrl || null,
        }),
      });

      const data = await res.json();
      if (data.success && data.msgSeq) {
        // 서버 시퀀스로 교체
        setMessages((prev) =>
          prev.map((m) => (m.msgSeq === tempSeq ? { ...m, msgSeq: data.msgSeq, regDt: data.regDt || m.regDt } : m))
        );
      }

      // 파트너 시뮬레이션 자동 응답 (1.5초 후)
      setTimeout(() => {
        const partnerReply: ChatMessageItem = {
          msgSeq: Date.now() + 1,
          senderType: 'PARTNER',
          senderId: contract.partner.ptnrNo,
          msgType: 'TEXT',
          content: `메시지 확인했습니다! 기재해주신 내용("${content.slice(0, 30)}...") 현장 체크리스트에 꼼꼼히 반영해 두겠습니다. 감사합니다. 👍`,
          attachImgUrl: null,
          isReadYn: 'Y',
          regDt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, partnerReply]);
        setTimeout(() => scrollToBottom(true), 50);
      }, 1500);
    } catch (err) {
      console.error('메시지 전송 실패:', err);
      showToast('메시지 전송 중 오류가 발생했습니다.');
    } finally {
      setIsSending(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  // 엔터 키 전송 처리
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 빠른 응답 칩 클릭
  const handleQuickChipClick = (chipText: string) => {
    const cleanText = chipText.replace(/^[^\s]+\s/, '');
    setInputText(cleanText + ' 전달드립니다.');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // 0507 안심통화 클릭
  const handleSafeCall = () => {
    if (contract.safeTelNo) {
      window.location.href = `tel:${contract.safeTelNo}`;
      showToast(`0507 안심번호(${contract.safeTelNo})로 전화를 연결합니다.`);
    } else {
      showToast('발급된 0507 안심번호가 없습니다.');
    }
  };

  // 사진 첨부 핸들러
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const resultUrl = reader.result as string;
        handleSendMessage('현장 특이사항 사진 첨부합니다.', resultUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // 시각 포맷 변환 (e.g. 10:14 -> 오전 10:14)
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '오전 10:14';
      let hours = d.getHours();
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? '오후' : '오전';
      hours = hours % 12 || 12;
      return `${ampm} ${hours}:${minutes}`;
    } catch {
      return '오전 10:14';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-sans antialiased flex flex-col justify-between selection:bg-[#d4e3ff] selection:text-[#00254a]">
      {/* 토스트 피드백 */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[70] px-4 py-2.5 rounded-xl bg-[#00254a] text-white text-[13px] font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[18px] text-[#82f5c1]">verified</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 숨겨진 파일 인풋 */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* =====================================================================
          1. 고정 글로벌 헤더
      ===================================================================== */}
      <header className="fixed top-0 left-0 w-full z-50 bg-white/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(22,59,102,0.06)] border-b border-[#e5eeff]">
        <div className="h-20 max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate && onNavigate('USER-COM-00')}
              className="flex items-center gap-2 text-[#00254a] cursor-pointer text-left focus:outline-none"
            >
              <img
                alt="SsulDak Brand Logo"
                className="h-8 w-auto object-contain"
                src="https://lh3.googleusercontent.com/aida/AEtjO1XlE5dGCq6Awu7YGl9jLXQCTA7t0IZsmJfZyUQSy_So39r5B_9DgKVRpNgn2lIWPB_vkFwbyJvxRauYr8NrBr8Ev5HNLHcxNuK1dyz8aQQON3nkYvZA0iFnBntaXm5YE-GRy1fdElMY7mqcgcLiOn6Igu7ZM3Dehje1BVaFd_UK3AteIgpBjbsnSSlBOEigu2qfzX9XgGZgL6mO3R9fV4YtByyCV6ArO-jWEfVoHeAtGM8Q98I4mu5IqYg"
              />
              <div className="flex flex-col">
                <span className="text-[18px] font-bold tracking-tight text-[#00254a] leading-none">
                  쓸고닦고
                </span>
                <span className="text-[10px] text-[#006c4a] font-bold tracking-wider leading-none mt-1">
                  SSULDAK
                </span>
              </div>
            </button>

            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#eff4ff] text-[#43474f] hover:text-[#0b1c30] cursor-pointer transition-colors text-xs font-semibold">
              <span className="material-symbols-outlined text-[#006c4a] text-[18px]">location_on</span>
              <span className="text-[#0b1c30] font-bold">경기 고양시 일산동구</span>
              <span className="material-symbols-outlined text-[#737780] text-[18px]">expand_more</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-2">
            <button
              onClick={() => onNavigate && onNavigate('USER-COM-00')}
              className="px-3.5 py-2 rounded-lg text-[15px] font-semibold text-[#43474f] hover:text-[#0b1c30] hover:bg-[#e5eeff] transition-all cursor-pointer"
            >
              홈
            </button>
            <button
              onClick={() => onNavigate && onNavigate('USER-QOT-00')}
              className="px-3.5 py-2 transition-all bg-[#00254a] text-white font-bold rounded-lg shadow-[0_2px_8px_rgba(0,37,74,0.12)] cursor-pointer"
            >
              견적현황
            </button>
            <button
              onClick={() => showToast('이용내역 화면 준비 중입니다.')}
              className="px-3.5 py-2 rounded-lg text-[15px] font-semibold text-[#43474f] hover:text-[#0b1c30] hover:bg-[#e5eeff] transition-all cursor-pointer"
            >
              이용내역
            </button>
            <button
              onClick={() => showToast('쿠폰북 화면 준비 중입니다.')}
              className="px-3.5 py-2 rounded-lg text-[15px] font-semibold text-[#43474f] hover:text-[#0b1c30] hover:bg-[#e5eeff] transition-all cursor-pointer"
            >
              쿠폰북
            </button>
            <button
              onClick={() => onNavigate && onNavigate('USER-ATH-03')}
              className="px-3.5 py-2 rounded-lg text-[15px] font-semibold text-[#43474f] hover:text-[#0b1c30] hover:bg-[#e5eeff] transition-all cursor-pointer"
            >
              마이
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => showToast('장바구니함이 비어있습니다.')}
              aria-label="장바구니"
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#43474f] hover:text-[#0b1c30] hover:bg-[#e5eeff] transition-colors relative cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#006c4a]"></span>
            </button>
            <button
              onClick={() => showToast('새로운 알림이 1건 있습니다.')}
              aria-label="알림"
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#43474f] hover:text-[#0b1c30] hover:bg-[#e5eeff] transition-colors relative cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#ba1a1a]"></span>
            </button>
            <button
              onClick={() => onNavigate && onNavigate('USER-ATH-03')}
              className="ml-1 pl-1 flex items-center cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#00254a] flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. 메인 컨텐츠 영역
      ===================================================================== */}
      <main className="w-full pt-24 bg-[#f8f9ff] flex-1 pb-16">
        <div className="max-w-[1280px] w-full mx-auto px-4 md:px-8 lg:px-12 py-3">
          
          {/* Breadcrumb & Back Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center flex-wrap gap-1.5 text-[13px] font-semibold text-[#43474f]">
              <button
                onClick={() => onNavigate && onNavigate('USER-COM-00')}
                className="hover:text-[#00254a] transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">home</span>
                홈
              </button>
              <span className="material-symbols-outlined text-[14px] text-[#737780]">chevron_right</span>
              <button
                onClick={() => onNavigate && onNavigate('USER-QOT-00')}
                className="hover:text-[#00254a] transition-colors"
              >
                견적 현황
              </button>
              <span className="material-symbols-outlined text-[14px] text-[#737780]">chevron_right</span>
              <span className="text-[#00254a] font-bold">
                {contract.partner.companyNm} 파트너 1:1 상담 채팅
              </span>
            </div>

            <button
              onClick={() => onNavigate ? onNavigate('USER-QOT-01') : window.history.back()}
              className="inline-flex items-center gap-1 text-[#43474f] hover:text-[#00254a] transition-colors text-[13px] font-bold group self-start sm:self-auto cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">
                arrow_back
              </span>
              <span>파트너 프로필로 돌아가기 (USER-QOT-01)</span>
            </button>
          </div>

          {/* Title & Status Sub-header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 bg-white p-4 rounded-xl shadow-xs border border-[#e5eeff]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#82f5c1]/30 text-[#00714e] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">forum</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[20px] font-extrabold text-[#00254a] tracking-tight">
                    파트너 1:1 안심 상담 채팅
                  </h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#82f5c1]/40 text-[#006c4a] text-[11px] font-extrabold border border-[#82f5c1]/60">
                    <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse"></span>
                    실시간 상담 가능 (매칭 완료)
                  </span>
                </div>
                <p className="text-[12px] text-[#43474f] mt-0.5">
                  안심번호 및 암호화 보관 체계로 안전하게 현장 정보를 조율하세요.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 text-[#43474f] text-[12px] font-medium bg-[#eff4ff] px-3 py-1.5 rounded-lg border border-[#e5eeff] self-start md:self-auto">
              <span className="material-symbols-outlined text-[#006c4a] text-[16px]">verified_user</span>
              <span>분쟁 케어 100% 보증 에스크로 연계 방</span>
            </div>
          </div>

          {/* 2-Column Responsive Layout (~68% Chat & ~32% Side Info) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* =================================================================
                좌측 컬럼: 대화 인터랙션 허브 (~68% -> 8 cols)
            ================================================================= */}
            <section className="lg:col-span-8 flex flex-col bg-white rounded-2xl shadow-[0_4px_24px_rgba(22,59,102,0.06)] border border-[#e5eeff] overflow-hidden h-[760px]">
              
              {/* Chat Header Bar */}
              <div className="px-5 py-3.5 bg-white flex items-center justify-between border-b border-[#e5eeff]">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative flex-shrink-0">
                    <img
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-[#82f5c1]/60 shadow-xs"
                      src={contract.partner.profileImgUrl}
                      alt={contract.partner.companyNm}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80';
                      }}
                    />
                    <span
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#006c4a] rounded-full ring-2 ring-white"
                      title="온라인 상태"
                    ></span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[15px] font-bold text-[#0b1c30] truncate">
                        {contract.partner.companyNm} {contract.partner.ceoNm} 대표/마스터
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-[#dce9ff] text-[#00254a] text-[11px] font-bold">
                        책임 시공
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[#43474f] text-[12px]">
                      <span className="flex items-center gap-0.5 text-[#543300] font-bold">
                        <span
                          className="material-symbols-outlined text-[15px] text-[#ffb95f]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                        5.0
                      </span>
                      <span className="text-[#c3c6d0]">•</span>
                      <span className="text-[#006c4a] font-semibold">평균 5분 이내 응답</span>
                    </div>
                  </div>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleSafeCall}
                    type="button"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#006c4a] text-white text-[13px] font-bold hover:bg-[#005137] transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[17px]">phone_in_talk</span>
                    <span className="hidden sm:inline">0507 안심번호 통화</span>
                    <span className="hidden md:inline-block text-[10px] font-bold px-1.5 py-0.5 bg-[#85f8c4] text-[#002114] rounded-full ml-1">
                      녹취적용
                    </span>
                  </button>

                  {/* More Dropdown Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setMoreMenuOpen((prev) => !prev)}
                      aria-label="추가 옵션"
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-[#43474f] hover:bg-[#e5eeff] transition-colors cursor-pointer"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[20px]">more_vert</span>
                    </button>

                    {moreMenuOpen && (
                      <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl py-1.5 z-30 text-[13px] text-[#0b1c30] border border-[#e5eeff]">
                        <button
                          onClick={() => {
                            setMoreMenuOpen(false);
                            onNavigate && onNavigate('USER-CNT-00', { contractNo: contract.contractNo });
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-[#eff4ff] flex items-center gap-2 font-medium"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px] text-[#43474f]">description</span>
                          계약서 상세 보기
                        </button>
                        <button
                          onClick={() => {
                            setMoreMenuOpen(false);
                            showToast('신고 접수 센터로 이동합니다.');
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-[#eff4ff] flex items-center gap-2 font-medium"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px] text-[#43474f]">report</span>
                          채팅 신고하기
                        </button>
                        <button
                          onClick={() => {
                            setMoreMenuOpen(false);
                            showToast('파트너 차단 기능이 활성화되었습니다.');
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-[#eff4ff] flex items-center gap-2 font-medium"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px] text-[#43474f]">block</span>
                          파트너 차단
                        </button>
                        <button
                          onClick={() => {
                            setMoreMenuOpen(false);
                            onNavigate ? onNavigate('USER-QOT-01') : window.history.back();
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-[#eff4ff] flex items-center gap-2 text-[#ba1a1a] font-semibold border-t border-[#e5eeff]/80"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[18px]">logout</span>
                          채팅방 나가기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sticky Contract Summary Ribbon */}
              <div className="bg-[#163b66] text-white px-5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 shadow-xs z-10 border-b border-[#00254a]/30">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#006c4a] text-white flex items-center justify-center">
                    <span className="material-symbols-outlined text-[15px]">push_pin</span>
                  </span>
                  <div className="min-w-0 text-[13px]">
                    <div className="truncate">
                      <strong className="text-[#82f5c1] font-bold">계약 연계:</strong>{' '}
                      {contract.subItemNm} ({contract.totalPayAmt.toLocaleString()}원/월){' '}
                      <span className="opacity-60 mx-1">|</span> 첫 방문: 2026.11.01(일) 09:00
                    </div>
                    <div className="text-[11px] text-[#86a6d7] truncate">
                      고양시 일산동구 중앙로 빌라 1~4층 복도/계단/주차장
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => onNavigate && onNavigate('USER-CNT-00', { contractNo: contract.contractNo })}
                  className="inline-flex items-center gap-1 text-[12px] font-bold text-[#82f5c1] hover:underline flex-shrink-0 self-end sm:self-auto cursor-pointer"
                >
                  <span>계약서 보기</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </button>
              </div>

              {/* Scrollable Chat Stream */}
              <div
                ref={chatStreamRef}
                className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#eff4ff]/30 scroll-smooth"
              >
                {/* System Welcome Card */}
                <div className="max-w-xl mx-auto p-4 bg-white rounded-2xl shadow-xs border border-[#e5eeff] text-center space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-[#d4e3ff] flex items-center justify-center text-[#00254a]">
                    <span className="material-symbols-outlined text-[24px]">verified</span>
                  </div>
                  <div className="text-[16px] font-bold text-[#00254a]">
                    안심 사전 조율방이 개설되었습니다
                  </div>
                  <p className="text-[13px] text-[#43474f] leading-relaxed">
                    양측 데이터 이용료 및 청약 확약이 완료되어 1:1 상담 채팅방이 열렸습니다. 공동현관 비밀번호, 주차 위치, 특이 오염 구역을 조율해 보세요.
                  </p>
                  <div className="pt-1 flex items-center justify-center gap-1 text-[#737780] text-[11px]">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    <span>모든 대화 내용은 암호화 보관되며 분쟁 발생 시 고객센터 중재 증빙으로 활용됩니다.</span>
                  </div>
                </div>

                {/* Date Separator */}
                <div className="flex items-center my-3">
                  <div className="flex-grow h-px bg-[#dce9ff]"></div>
                  <span className="px-3 py-0.5 rounded-full bg-[#dce9ff] text-[#43474f] text-[11px] font-semibold tracking-wider">
                    2026년 10월 22일 목요일
                  </span>
                  <div className="flex-grow h-px bg-[#dce9ff]"></div>
                </div>

                {/* Messages List */}
                {messages.map((msg, idx) => {
                  if (msg.senderType === 'SYSTEM') {
                    return (
                      <div key={msg.msgSeq || idx} className="text-center my-2">
                        <span className="inline-block px-3 py-1 bg-[#e5eeff] text-[#00254a] text-[12px] font-medium rounded-full">
                          💡 {msg.content}
                        </span>
                      </div>
                    );
                  }

                  const isUser = msg.senderType === 'USER';

                  if (isUser) {
                    return (
                      <div
                        key={msg.msgSeq || idx}
                        className="flex items-end justify-end gap-1.5 max-w-xl ml-auto animate-fadeIn"
                      >
                        <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                          <span className="text-[11px] text-[#006c4a] font-bold">
                            {msg.isReadYn === 'Y' ? '읽음' : '1'}
                          </span>
                          <span className="text-[10px] text-[#737780]">{formatTime(msg.regDt)}</span>
                        </div>
                        <div className="p-3.5 bg-[#163b66] text-white rounded-2xl rounded-tr-xs shadow-xs text-[14px] leading-relaxed max-w-[80%] whitespace-pre-wrap">
                          {msg.attachImgUrl && (
                            <img
                              src={msg.attachImgUrl}
                              alt="첨부 사진"
                              onClick={() => {
                                setSelectedImage(msg.attachImgUrl || null);
                                setPhotoModalOpen(true);
                              }}
                              className="rounded-lg mb-2 max-w-[240px] max-h-[180px] object-cover cursor-pointer hover:opacity-90 border border-white/20"
                            />
                          )}
                          <div>{msg.content}</div>
                        </div>
                      </div>
                    );
                  }

                  // Partner Message
                  return (
                    <div
                      key={msg.msgSeq || idx}
                      className="flex items-start gap-2.5 max-w-2xl animate-fadeIn"
                    >
                      <img
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5 shadow-xs ring-1 ring-[#e5eeff]"
                        src={contract.partner.profileImgUrl}
                        alt={contract.partner.companyNm}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80';
                        }}
                      />
                      <div className="space-y-1">
                        <span className="text-[11px] text-[#43474f] font-semibold">
                          {contract.partner.ceoNm} 대표 • {contract.partner.companyNm}
                        </span>
                        <div className="flex items-end gap-1.5">
                          <div className="p-3.5 bg-white text-[#0b1c30] rounded-2xl rounded-tl-xs shadow-xs text-[14px] leading-relaxed border border-[#e5eeff] max-w-[85%] whitespace-pre-line">
                            {msg.attachImgUrl && (
                              <img
                                src={msg.attachImgUrl}
                                alt="첨부 사진"
                                onClick={() => {
                                  setSelectedImage(msg.attachImgUrl || null);
                                  setPhotoModalOpen(true);
                                }}
                                className="rounded-lg mb-2 max-w-[240px] max-h-[180px] object-cover cursor-pointer hover:opacity-90 border border-[#e5eeff]"
                              />
                            )}
                            <div>{msg.content}</div>
                          </div>
                          <span className="text-[10px] text-[#737780] flex-shrink-0">
                            {formatTime(msg.regDt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Assist Suggestion Chips */}
              <div className="px-5 py-2 bg-white flex items-center gap-2 overflow-x-auto border-t border-[#e5eeff] scrollbar-none">
                <span className="text-[11px] font-bold text-[#737780] flex-shrink-0 mr-1">빠른 응답:</span>
                <button
                  type="button"
                  onClick={() => handleQuickChipClick('📸 현장 특이사항 사진 첨부')}
                  className="px-3 py-1 rounded-full bg-[#eff4ff] hover:bg-[#e5eeff] text-[#43474f] text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer border border-[#e5eeff]"
                >
                  📸 현장 특이사항 사진 첨부
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickChipClick('🔑 추가 열쇠 보관함 위치 안내')}
                  className="px-3 py-1 rounded-full bg-[#eff4ff] hover:bg-[#e5eeff] text-[#43474f] text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer border border-[#e5eeff]"
                >
                  🔑 추가 열쇠 보관함 위치 안내
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickChipClick('🕒 방문 시간 30분 전 사전 연락 요청')}
                  className="px-3 py-1 rounded-full bg-[#eff4ff] hover:bg-[#e5eeff] text-[#43474f] text-[12px] font-medium whitespace-nowrap transition-colors cursor-pointer border border-[#e5eeff]"
                >
                  🕒 방문 시간 30분 전 사전 연락 요청
                </button>
              </div>

              {/* Bottom Input Dock */}
              <div className="p-4 bg-white border-t border-[#e5eeff] flex flex-col gap-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-end gap-2.5"
                >
                  <div className="flex items-center gap-1 flex-shrink-0 pb-1">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="파일 첨부"
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-[#43474f] hover:text-[#00254a] hover:bg-[#eff4ff] transition-colors cursor-pointer"
                      title="사진 및 서류 첨부"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[22px]">attach_file</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="카메라 사진 촬영"
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-[#43474f] hover:text-[#00254a] hover:bg-[#eff4ff] transition-colors cursor-pointer"
                      title="카메라 즉시 촬영"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[22px]">photo_camera</span>
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 bg-[#eff4ff] rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-[#00254a] focus-within:bg-white transition-all border border-[#e5eeff]">
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={2}
                      placeholder="파트너에게 메시지를 입력하세요... (Enter 키로 전송, Shift+Enter 줄바꿈)"
                      className="w-full bg-transparent border-none outline-none resize-none text-[14px] text-[#0b1c30] placeholder:text-[#737780]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSending || !inputText.trim()}
                    aria-label="메시지 전송"
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-md flex-shrink-0 cursor-pointer ${
                      inputText.trim()
                        ? 'bg-[#00254a] text-white hover:bg-[#163b66] hover:scale-105 active:scale-95'
                        : 'bg-[#e5eeff] text-[#737780] cursor-not-allowed'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">send</span>
                  </button>
                </form>

                <div className="flex items-center justify-between text-[#43474f] text-[11px] px-1">
                  <span className="flex items-center gap-1 text-[#737780]">
                    <span className="material-symbols-outlined text-[13px]">info</span>
                    욕설, 비방, 직거래 유도 시 이용이 제한될 수 있습니다.
                  </span>
                  <span className="hidden sm:inline text-[#006c4a] font-semibold">
                    실시간 종단간 암호화(E2EE) 적용됨
                  </span>
                </div>
              </div>
            </section>

            {/* =================================================================
                우측 컬럼: 파트너 정보 & 계약 요약 사이드 패널 (~32% -> 4 cols)
            ================================================================= */}
            <aside className="lg:col-span-4 space-y-4">
              
              {/* 1. Partner Profile Card */}
              <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(22,59,102,0.06)] border border-[#e5eeff] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#006c4a] tracking-wider uppercase">
                    파트너 마스터 정보
                  </span>
                  <span className="px-2 py-0.5 bg-[#ffddb8] text-[#2a1700] text-[11px] rounded-md font-bold">
                    2024 우수마스터
                  </span>
                </div>

                <div className="flex items-center gap-3.5">
                  <img
                    className="w-16 h-16 rounded-2xl object-cover shadow-sm border border-[#e5eeff]"
                    src={contract.partner.profileImgUrl}
                    alt={contract.partner.companyNm}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-[17px] text-[#00254a] font-bold truncate">
                      {contract.partner.companyNm}
                    </div>
                    <div className="text-[13px] text-[#43474f]">
                      대표자 {contract.partner.ceoNm} 마스터
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[13px]">
                      <span
                        className="material-symbols-outlined text-[16px] text-[#ffb95f]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        star
                      </span>
                      <span className="font-bold text-[#0b1c30]">5.0</span>
                      <span className="text-[#737780] font-normal">(리뷰 48건)</span>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 bg-[#eff4ff] rounded-xl text-center border border-[#e5eeff]">
                    <span className="text-[11px] text-[#43474f] block font-medium">시공 경력</span>
                    <strong className="text-[17px] text-[#00254a] font-extrabold">7년차</strong>
                  </div>
                  <div className="p-2.5 bg-[#eff4ff] rounded-xl text-center border border-[#e5eeff]">
                    <span className="text-[11px] text-[#43474f] block font-medium">총 시공 건수</span>
                    <strong className="text-[17px] text-[#006c4a] font-extrabold">312건+</strong>
                  </div>
                </div>

                {/* Verified Badges List */}
                <div className="space-y-2 pt-2 border-t border-[#e5eeff]">
                  <div className="flex items-center gap-2 text-[13px] text-[#0b1c30]">
                    <span className="material-symbols-outlined text-[18px] text-[#006c4a]">verified</span>
                    <span>쓸고닦고 신원/사업자 본인인증 완료</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-[#0b1c30]">
                    <span className="material-symbols-outlined text-[18px] text-[#006c4a]">health_and_safety</span>
                    <span>영업배상책임보험 (최대 1억원 가입)</span>
                  </div>
                  <div className="flex items-center gap-2 text-[13px] text-[#0b1c30]">
                    <span className="material-symbols-outlined text-[18px] text-[#006c4a]">eco</span>
                    <span>환경부 인증 친환경 안심 세제 100% 사용</span>
                  </div>
                </div>
              </div>

              {/* 2. Contract Specifications Card */}
              <div className="bg-white rounded-2xl p-5 shadow-[0_4px_20px_rgba(22,59,102,0.06)] border border-[#e5eeff] space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[17px] text-[#00254a] font-bold">계약 세부 정보</h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#d4e3ff] text-[#001c3a] font-bold">
                    에스크로 안전보관
                  </span>
                </div>

                <div className="space-y-2.5 text-[13px] divide-y divide-[#e5eeff]">
                  <div className="flex items-start justify-between pt-1">
                    <span className="text-[#43474f]">신청 공정</span>
                    <span className="font-semibold text-[#0b1c30] text-right">
                      {contract.subItemNm}
                    </span>
                  </div>

                  <div className="flex items-start justify-between pt-2.5">
                    <span className="text-[#43474f]">첫 방문 일정</span>
                    <div className="text-right">
                      <span className="font-bold text-[#00254a] block">
                        2026. 11. 01 (일) 09:00
                      </span>
                      <span className="text-[11px] text-[#737780]">회당 약 2시간 집중 정밀 케어</span>
                    </div>
                  </div>

                  <div className="flex items-start justify-between pt-2.5">
                    <span className="text-[#43474f]">시공 투입 인원</span>
                    <span className="font-semibold text-[#0b1c30]">2인 1조 전문 마스터 클리너</span>
                  </div>

                  <div className="flex items-start justify-between pt-2.5">
                    <span className="text-[#43474f]">월 청약 대금</span>
                    <div className="text-right">
                      <span className="text-[18px] text-[#00254a] font-black">
                        {contract.totalPayAmt.toLocaleString()}원
                      </span>
                      <span className="block text-[11px] text-[#006c4a] font-bold">
                        VAT 포함 • 월별 정산
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Ring Micro Indicator */}
                <div className="p-3 bg-[#eff4ff] rounded-xl flex items-center gap-3.5 border border-[#e5eeff]">
                  <svg className="w-12 h-12 flex-shrink-0 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#dce9ff]"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <path
                      className="text-[#006c4a]"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="75, 100"
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                  </svg>
                  <div className="min-w-0">
                    <div className="text-[13px] text-[#0b1c30] font-bold">계약 진행률: 75%</div>
                    <p className="text-[11px] text-[#43474f] mt-0.5 leading-snug">
                      채팅 사전 협의 완료 후 시공 확정 단계로 자동 전환됩니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. Safety & Protection Guide Widget */}
              <div className="bg-[#eff4ff] rounded-2xl p-5 space-y-3 border border-[#e5eeff]">
                <div className="flex items-center gap-2 text-[#00254a] text-[15px] font-bold">
                  <span className="material-symbols-outlined text-[#006c4a] text-[22px]">
                    shield_with_heart
                  </span>
                  <span>쓸고닦고 안심 케어 보증</span>
                </div>
                <p className="text-[12px] text-[#43474f] leading-relaxed">
                  고객님의 개인정보 보호를 위해 임의의 0507 가상번호를 배정하며, 통화 및 채팅 기록은 분쟁 예방 목적으로 안전하게 보존됩니다.
                </p>
                <div className="p-3 bg-white rounded-xl flex items-center justify-between shadow-xs border border-[#e5eeff]">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#006c4a] text-[20px]">
                      support_agent
                    </span>
                    <div className="text-[13px] text-[#00254a] font-bold">고객 신뢰 지원 센터</div>
                  </div>
                  <a
                    className="text-[16px] text-[#00254a] font-black hover:text-[#006c4a] transition-colors"
                    href="tel:1588-3024"
                  >
                    1588-3024
                  </a>
                </div>
              </div>

            </aside>
          </div>
        </div>
      </main>

      {/* 사진 확대 모달 */}
      {photoModalOpen && selectedImage && (
        <div
          onClick={() => setPhotoModalOpen(false)}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-2xl max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl relative">
            <img src={selectedImage} alt="확대 보기" className="w-full h-full object-contain" />
            <button
              onClick={() => setPhotoModalOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. 데스크탑 푸터
      ===================================================================== */}
      <footer className="w-full bg-white mt-12 shadow-[0_-1px_12px_rgba(22,59,102,0.03)] border-t border-[#e5eeff]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-6 border-b border-[#e5eeff]">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[#00254a]">
                <span className="material-symbols-outlined text-[#006c4a] text-[22px]">cleaning_services</span>
                <span className="text-[17px] font-bold tracking-tight text-[#00254a]">
                  쓸고닦고 (SsulDak)
                </span>
              </div>
              <p className="text-[13px] text-[#43474f] max-w-md leading-relaxed">
                프리미엄 공간 케어 및 전문 홈·오피스 클리닝 매칭 플랫폼. 전문 마스터 파트너와 함께 안심하고 쾌적한 공간을 경험하세요.
              </p>
            </div>
            <div className="space-y-1 md:text-right">
              <span className="text-[11px] font-bold text-[#006c4a] uppercase tracking-wider">
                고객만족센터
              </span>
              <div className="text-[20px] font-black text-[#00254a]">1588-0000</div>
              <p className="text-[12px] text-[#43474f]">
                운영시간: 평일 09:00 - 18:00 (점심시간 12:00 - 13:00, 주말/공휴일 휴무)
              </p>
            </div>
          </div>
          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[#43474f] text-[13px]">
            <div className="flex flex-wrap gap-4 font-medium">
              <button onClick={() => showToast('이용약관 준비 중')} className="hover:text-[#0b1c30]">이용약관</button>
              <button onClick={() => showToast('개인정보처리방침 준비 중')} className="font-bold text-[#0b1c30] hover:text-[#00254a]">개인정보처리방침</button>
              <button onClick={() => showToast('서비스운영정책 준비 중')} className="hover:text-[#0b1c30]">서비스운영정책</button>
              <button onClick={() => showToast('마스터파트너 등록문의')} className="hover:text-[#0b1c30]">마스터파트너 등록문의</button>
            </div>
            <p className="text-[11px] text-[#737780]">© 2026 SsulDak Platform Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
