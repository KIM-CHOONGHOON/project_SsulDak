// SsulDak_Web/User/frontend/USER-MYP-01/index.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { UserMyp01UserInfo } from '../../backend/api_USER_MYP_01/route';

interface UserMyp01Props {
  userNo?: string;
  onNavigate?: (path: string, params?: Record<string, any>) => void;
  apiEndpoint?: string;
}

export default function UserMyp01({
  userNo = 'U20261000001',
  onNavigate,
  apiEndpoint = '/api/user/user_myp_01',
}: UserMyp01Props) {
  // =========================================================================
  // 1. 상태 관리
  // =========================================================================
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [noticeToast, setNoticeToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // 기본 계정 정보 필드
  const [userEmail, setUserEmail] = useState<string>('chunghoon.kim@ssuldak.com');
  const [userNm, setUserNm] = useState<string>('김충훈');
  const [userTel, setUserTel] = useState<string>('010-1234-1234');
  const [originalTel, setOriginalTel] = useState<string>('010-1234-1234');
  const [telVerified, setTelVerified] = useState<boolean>(true);

  // 비밀번호 아코디언 및 입력 필드
  const [isPwSectionOpen, setIsPwSectionOpen] = useState<boolean>(false);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // 시공 대표 주소 및 전자서명
  const [roadAddr, setRoadAddr] = useState<string>('경기 고양시 일산동구 중앙로 1234, 102동 504호 (백석동, 흰돌마을)');
  const [addrDetailNote, setAddrDetailNote] = useState<string>('공동현관 출입: 세대호출 (#102504) · 엘리베이터: 유 (작업차량 지하주차 가능)');
  const [signImgUrl, setSignImgUrl] = useState<string | null>('https://ssuldak.com/signs/u20261000001.png');
  const [isSignPreviewOpen, setIsSignPreviewOpen] = useState<boolean>(false);
  const [isSignCanvasOpen, setIsSignCanvasOpen] = useState<boolean>(false);

  // 마케팅 알림 토글
  const [masterToggle, setMasterToggle] = useState<boolean>(true);
  const [agreeKakao, setAgreeKakao] = useState<boolean>(true);
  const [agreeEmail, setAgreeEmail] = useState<boolean>(true);
  const [agreeNight, setAgreeNight] = useState<boolean>(false);

  // 통계 및 보안 메타데이터
  const [couponCount, setCouponCount] = useState<number>(2);
  const [pointBalance, setPointBalance] = useState<number>(14000);
  const [activeReqCnt, setActiveReqCnt] = useState<number>(2);
  const [activeContractCnt, setActiveContractCnt] = useState<number>(4);
  const [securityInfo, setSecurityInfo] = useState({
    score: 95,
    grade: '안전 (A+)',
    lastLogin: '2026.11.01 09:12 (Chrome / Windows)',
    lastAuth: '2026.10.15 NICE 실명인증',
    twoFactor: 'SMS 일회용 OTP',
  });

  // 모달 상태
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState<boolean>(false);
  const [phoneVerifyCodeInput, setPhoneVerifyCodeInput] = useState<string>('');
  const [phoneVerifyTimer, setPhoneVerifyTimer] = useState<number>(180);
  const [phoneSending, setPhoneSending] = useState<boolean>(false);

  // 주소 변경 모달
  const [isAddrModalOpen, setIsAddrModalOpen] = useState<boolean>(false);
  const [addrSearchKeyword, setAddrSearchKeyword] = useState<string>('중앙로 1234');

  // 회원 탈퇴 모달
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState<boolean>(false);
  const [withdrawBlockInfo, setWithdrawBlockInfo] = useState<{ canWithdraw: boolean; message: string } | null>(null);
  const [withdrawReason, setWithdrawReason] = useState<string>('서비스 이용 빈도 낮음');
  const [withdrawConfirmChecked, setWithdrawConfirmChecked] = useState<boolean>(false);

  // Canvas 서명 패드 Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [hasCanvasDrawn, setHasCanvasDrawn] = useState<boolean>(false);

  // 토스트 메시지 출력 헬퍼
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNoticeToast({ message, type });
    setTimeout(() => {
      setNoticeToast(null);
    }, 3500);
  }, []);

  // =========================================================================
  // 2. 초기 회원정보 로딩 (GET_USER_INFO)
  // =========================================================================
  const fetchUserInfo = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'GET_USER_INFO', userNo }),
      });

      if (!res.ok) {
        throw new Error(`서버 응답 오류 (HTTP ${res.status})`);
      }

      const data = await res.json();
      if (data.success && data.userInfo) {
        const u = data.userInfo as UserMyp01UserInfo;
        setUserEmail(u.userEmail || 'chunghoon.kim@ssuldak.com');
        setUserNm(u.userNm || '김충훈');
        setUserTel(u.userTel || '010-1234-1234');
        setOriginalTel(u.userTel || '010-1234-1234');
        setTelVerified(true);
        setSignImgUrl(u.signImgUrl || null);
        setCouponCount(u.couponCount ?? 2);
        setPointBalance(u.pointBalance ?? 14000);
        setActiveReqCnt(u.activeReqCnt ?? 2);
        setActiveContractCnt(u.activeContractCnt ?? 4);

        if (u.address) {
          setRoadAddr(u.address.roadAddr || '경기 고양시 일산동구 중앙로 1234, 102동 504호');
          setAddrDetailNote(u.address.extraNote || '공동현관 세대호출');
        }

        const isMkt = u.mktAgreeYn === 'Y';
        setMasterToggle(isMkt);
        setAgreeKakao(isMkt);
        setAgreeEmail(isMkt);
      }
    } catch (err: any) {
      console.warn('⚠️ [USER-MYP-01] fetchUserInfo fallback:', err);
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, userNo]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  // 전화번호 변경 감지 -> 변경 시 telVerified 플래그 리셋
  useEffect(() => {
    const cleanCurrent = userTel.replace(/[^0-9]/g, '');
    const cleanOriginal = originalTel.replace(/[^0-9]/g, '');
    if (cleanCurrent !== cleanOriginal) {
      setTelVerified(false);
    } else {
      setTelVerified(true);
    }
  }, [userTel, originalTel]);

  // 마케팅 마스터 토글 핸들러
  const handleMasterToggleChange = (checked: boolean) => {
    setMasterToggle(checked);
    setAgreeKakao(checked);
    setAgreeEmail(checked);
    setAgreeNight(checked ? agreeNight : false);
  };

  // 세부 토글 변경 시 마스터 토글 동기화
  const handleSubToggleChange = (kakao: boolean, email: boolean, night: boolean) => {
    setAgreeKakao(kakao);
    setAgreeEmail(email);
    setAgreeNight(night);
    setMasterToggle(kakao || email);
  };

  // =========================================================================
  // 3. 휴대폰 번호 재인증 로직 (SMS 모의)
  // =========================================================================
  const handleOpenPhoneVerify = async () => {
    const cleanTel = userTel.replace(/[^0-9]/g, '');
    if (cleanTel.length < 10) {
      showToast('올바른 휴대폰 번호(10~11자리)를 먼저 입력해 주세요.', 'error');
      return;
    }

    try {
      setPhoneSending(true);
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'SEND_PHONE_VERIFY_CODE',
          userNo,
          userTel: cleanTel,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setIsPhoneModalOpen(true);
        setPhoneVerifyCodeInput('');
        setPhoneVerifyTimer(180);
        showToast(data.message || '인증번호 6자리가 발송되었습니다. [테스트용: 123456]', 'info');
      } else {
        showToast(data.message || '인증번호 발송 실패', 'error');
      }
    } catch {
      setIsPhoneModalOpen(true);
      setPhoneVerifyTimer(180);
      showToast('인증번호 6자리가 발송되었습니다. [테스트용: 123456]', 'info');
    } finally {
      setPhoneSending(false);
    }
  };

  // 타이머 카운트다운
  useEffect(() => {
    let timer: any = null;
    if (isPhoneModalOpen && phoneVerifyTimer > 0) {
      timer = setInterval(() => {
        setPhoneVerifyTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPhoneModalOpen, phoneVerifyTimer]);

  const handleConfirmPhoneVerify = async () => {
    if (!phoneVerifyCodeInput.trim()) {
      showToast('인증번호 6자리를 입력해 주세요.', 'error');
      return;
    }

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'VERIFY_PHONE_CODE',
          userNo,
          userTel,
          verifyCode: phoneVerifyCodeInput.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTelVerified(true);
        setOriginalTel(userTel);
        setIsPhoneModalOpen(false);
        showToast('새 휴대폰 번호 본인인증이 완료되었습니다!', 'success');
      } else {
        showToast(data.message || '인증번호가 일치하지 않습니다.', 'error');
      }
    } catch {
      if (phoneVerifyCodeInput.trim() === '123456') {
        setTelVerified(true);
        setOriginalTel(userTel);
        setIsPhoneModalOpen(false);
        showToast('새 휴대폰 번호 본인인증이 완료되었습니다!', 'success');
      } else {
        showToast('인증번호가 일치하지 않습니다.', 'error');
      }
    }
  };

  // =========================================================================
  // 4. 자필 전자서명 Canvas 드로잉 핸들러
  // =========================================================================
  const openCanvasModal = () => {
    setIsSignCanvasOpen(true);
    setHasCanvasDrawn(false);
    setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#00254a';
        }
      }
    }, 100);
  };

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: (e as React.MouseEvent).clientX - rect.left,
        y: (e as React.MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    setHasCanvasDrawn(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasCanvasDrawn(false);
  };

  const saveCanvasSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasCanvasDrawn) {
      showToast('서명을 먼저 캔버스에 그려주세요.', 'error');
      return;
    }
    const dataUrl = canvas.toDataURL('image/png');
    setSignImgUrl(dataUrl);
    setIsSignCanvasOpen(false);
    showToast('신규 자필 서명이 등록 대기 상태로 설정되었습니다. 하단 [수정사항 저장하기]를 눌러 반영하세요.', 'info');
  };

  // =========================================================================
  // 5. 회원 탈퇴 검증 및 모달 핸들러
  // =========================================================================
  const handleClickWithdraw = async () => {
    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'CHECK_WITHDRAWABLE', userNo }),
      });
      const data = await res.json();
      setWithdrawBlockInfo({
        canWithdraw: data.canWithdraw,
        message: data.message || '',
      });
      setIsWithdrawModalOpen(true);
    } catch {
      setWithdrawBlockInfo({
        canWithdraw: false,
        message: '현재 진행 중인 견적 신청(2건) 또는 미완료 시공 계약(4건)이 있어 탈퇴할 수 없습니다.',
      });
      setIsWithdrawModalOpen(true);
    }
  };

  const handleExecuteWithdraw = async () => {
    if (!withdrawConfirmChecked) {
      showToast('안내 사항에 동의를 체크해 주세요.', 'error');
      return;
    }

    try {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'EXECUTE_WITHDRAW',
          userNo,
          withdrawReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert('회원 탈퇴가 안전하게 처리되었습니다.\n메인 홈 화면으로 이동합니다.');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('ssuldak_token');
          localStorage.removeItem('ssuldak_user');
        }
        if (onNavigate) {
          onNavigate('USER-COM-00');
        } else {
          window.location.hash = '#home';
        }
      } else {
        showToast(data.message || '탈퇴 처리에 실패했습니다.', 'error');
      }
    } catch (err: any) {
      showToast('탈퇴 처리 중 통신 오류가 발생했습니다.', 'error');
    }
  };

  // =========================================================================
  // 6. 전체 회원정보 수정 저장 (UPDATE_USER_INFO)
  // =========================================================================
  const handleSaveProfile = async () => {
    if (!userNm.trim()) {
      showToast('회원 성명을 입력해 주세요.', 'error');
      return;
    }

    // 휴대폰 번호 변경되었는데 미인증인 경우 방어
    const cleanCurrent = userTel.replace(/[^0-9]/g, '');
    const cleanOriginal = originalTel.replace(/[^0-9]/g, '');
    if (cleanCurrent !== cleanOriginal && !telVerified) {
      showToast('휴대폰 번호가 변경되었습니다. [번호 변경 인증]을 먼저 완료해 주세요.', 'error');
      return;
    }

    // 비밀번호 변경 입력 검증
    if (newPassword.trim()) {
      if (newPassword.trim().length < 8) {
        showToast('새 비밀번호는 8자 이상으로 입력해 주세요.', 'error');
        return;
      }
      if (newPassword.trim() !== confirmPassword.trim()) {
        showToast('새 비밀번호와 확인 입력이 일치하지 않습니다.', 'error');
        return;
      }
    }

    try {
      setSaving(true);
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'UPDATE_USER_INFO',
          userNo,
          userNm: userNm.trim(),
          userTel: userTel.trim(),
          telVerified,
          newPassword: newPassword.trim() || undefined,
          mktAgreeYn: masterToggle ? 'Y' : 'N',
          agreeKakao,
          agreeEmail,
          agreeNight,
          signDataUrl: signImgUrl?.startsWith('data:image') ? signImgUrl : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || '회원정보가 안전하게 저장되었습니다.', 'success');
        setOriginalTel(userTel.trim());
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
        setIsPwSectionOpen(false);

        // 1.5초 후 마이페이지(USER-MYP-00)로 부드럽게 복귀
        setTimeout(() => {
          if (onNavigate) {
            onNavigate('USER-MYP-00');
          } else {
            window.location.hash = '#mypage';
          }
        }, 1200);
      } else {
        showToast(data.message || '회원정보 수정 실패', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full bg-[#f8f9ff] text-[#0b1c30] min-h-screen">
      {/* =====================================================================
          1. 상단 글로벌 네비게이션 헤더
      ====================================================================== */}
      <header className="fixed top-0 left-0 right-0 w-full z-40 bg-white/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-[#e5eeff]">
        <div className="h-16 max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <a
              className="flex items-center gap-2 shrink-0 cursor-pointer"
              onClick={() => (onNavigate ? onNavigate('USER-COM-00') : (window.location.hash = '#home'))}
            >
              <div className="w-9 h-9 rounded-xl bg-[#00254a] flex items-center justify-center text-white shadow-sm">
                <span className="material-symbols-outlined text-[20px]">sanitizer</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[17px] tracking-tight text-[#00254a] font-bold">SsulDak</span>
                <span className="text-[11px] text-[#43474f] -mt-1 font-semibold">쓸고닦고 케어</span>
              </div>
            </a>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-[#eff4ff] rounded-full text-[#0b1c30] hover:bg-[#e5eeff] transition-colors cursor-pointer">
              <span className="material-symbols-outlined text-[#006c4a] text-[16px]">location_on</span>
              <span className="text-[13px] text-[#0b1c30] font-semibold">경기 고양시 일산동구</span>
              <span className="material-symbols-outlined text-[#737780] text-[16px]">expand_more</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            <a
              onClick={() => (onNavigate ? onNavigate('USER-COM-00') : (window.location.hash = '#home'))}
              className="px-4 py-1.5 text-[15px] font-semibold text-[#43474f] hover:text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors cursor-pointer"
            >
              홈
            </a>
            <a
              onClick={() => (onNavigate ? onNavigate('USER-QOT-00') : (window.location.hash = '#quote-status'))}
              className="px-4 py-1.5 text-[15px] font-semibold text-[#43474f] hover:text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors cursor-pointer"
            >
              견적현황
            </a>
            <a
              onClick={() => (onNavigate ? onNavigate('USER-HIS-00') : (window.location.hash = '#history'))}
              className="px-4 py-1.5 text-[15px] font-semibold text-[#43474f] hover:text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors cursor-pointer"
            >
              이용내역
            </a>
            <a
              onClick={() => (onNavigate ? onNavigate('USER-MYP-00') : (window.location.hash = '#mypage'))}
              className="px-4 py-1.5 text-[15px] font-semibold text-[#43474f] hover:text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors cursor-pointer"
            >
              쿠폰북
            </a>
            <a
              onClick={() => (onNavigate ? onNavigate('USER-MYP-00') : (window.location.hash = '#mypage'))}
              className="px-4 py-1.5 text-[15px] font-bold text-[#00254a] bg-[#d3e4fe]/60 rounded-lg transition-colors cursor-pointer"
            >
              마이
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              aria-label="알림"
              className="w-10 h-10 rounded-full flex items-center justify-center text-[#43474f] hover:bg-[#e5eeff] hover:text-[#0b1c30] transition-colors relative cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#006c4a] ring-2 ring-white"></span>
            </button>
            <a
              onClick={() => (onNavigate ? onNavigate('USER-MYP-00') : (window.location.hash = '#mypage'))}
              className="flex items-center pl-1 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-[#00254a] flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[18px]">person</span>
              </div>
            </a>
          </div>
        </div>
      </header>

      {/* =====================================================================
          2. 토스트 알림 메시지 배너
      ====================================================================== */}
      {noticeToast && (
        <div
          className={`fixed top-20 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 transition-all text-[14px] font-bold animate-in fade-in slide-in-from-top-3 ${
            noticeToast.type === 'error'
              ? 'bg-[#ba1a1a] text-white'
              : noticeToast.type === 'info'
              ? 'bg-[#00254a] text-white'
              : 'bg-[#006c4a] text-white'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {noticeToast.type === 'error' ? 'error' : noticeToast.type === 'info' ? 'info' : 'check_circle'}
          </span>
          <span>{noticeToast.message}</span>
        </div>
      )}

      {/* =====================================================================
          3. 메인 바디 영역
      ====================================================================== */}
      <main className="w-full pt-16 min-h-[calc(100vh-280px)]">
        <div className="flex flex-col w-full pb-12">
          {/* Page Header & Breadcrumbs Context Area */}
          <div className="w-full bg-white shadow-sm mb-6 border-b border-[#e5eeff]">
            <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12 py-6">
              {/* Breadcrumb Navigation */}
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[#43474f] text-[13px] font-medium mb-3">
                <a
                  onClick={() => (onNavigate ? onNavigate('USER-COM-00') : (window.location.hash = '#home'))}
                  className="hover:text-[#00254a] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">home</span>
                  홈
                </a>
                <span className="material-symbols-outlined text-[#c3c6d0] text-[14px]">chevron_right</span>
                <a
                  onClick={() => (onNavigate ? onNavigate('USER-MYP-00') : (window.location.hash = '#mypage'))}
                  className="hover:text-[#00254a] transition-colors cursor-pointer"
                >
                  마이페이지 (USER-MYP-00)
                </a>
                <span className="material-symbols-outlined text-[#c3c6d0] text-[14px]">chevron_right</span>
                <span className="text-[#00254a] font-bold">회원정보 수정</span>
              </nav>

              {/* Title & Back Link */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-[#dce9ff] text-[#00254a] text-[11px] font-bold tracking-wider uppercase font-mono">
                      USER-MYP-01
                    </span>
                    <span className="flex items-center gap-1.5 text-[#006c4a] text-[12px] font-bold bg-[#82f5c1]/30 px-2.5 py-0.5 rounded-full">
                      <span className="w-2 h-2 rounded-full bg-[#006c4a] animate-pulse"></span>
                      계정 보안 인증 정상
                    </span>
                  </div>
                  <h1 className="text-[28px] font-extrabold text-[#0b1c30] tracking-tight">회원정보 수정</h1>
                  <p className="text-[14px] text-[#43474f]">
                    로그인 계정 정보, 연락처 변경 및 알림/마케팅 수신 설정을 안전하게 관리하세요.
                  </p>
                </div>
                <a
                  onClick={() => (onNavigate ? onNavigate('USER-MYP-00') : (window.location.hash = '#mypage'))}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#00254a] text-[13px] font-bold transition-all self-start md:self-auto cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                  <span>마이페이지로 돌아가기</span>
                </a>
              </div>
            </div>
          </div>

          {/* Main 2-Column Responsive Body */}
          <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* =============================================================
                  LEFT COLUMN: Primary Forms (8/12 Desktop)
              ============================================================== */}
              <div className="lg:col-span-8 flex flex-col gap-6">
                {/* CARD 1: 기본 계정 정보 (Account Credentials) */}
                <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#e5eeff]">
                  <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#e5eeff]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#dce9ff] text-[#00254a] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[22px]">manage_accounts</span>
                      </div>
                      <div>
                        <h2 className="text-[18px] text-[#0b1c30] font-bold">기본 계정 정보</h2>
                        <p className="text-[13px] text-[#43474f]">
                          로그인 및 실명 기반 인증에 활용되는 핵심 식별 정보입니다.
                        </p>
                      </div>
                    </div>
                    <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#82f5c1]/30 text-[#00714e] text-[12px] font-bold">
                      <span className="material-symbols-outlined text-[14px]">verified</span>
                      본인 확인 100%
                    </span>
                  </div>

                  <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                    {/* Email (Read-only Social Account) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[13px] text-[#0b1c30] font-semibold flex items-center gap-1" htmlFor="userEmail">
                          이메일 계정 (아이디)
                          <span className="material-symbols-outlined text-[16px] text-[#737780]">lock</span>
                        </label>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px] flex items-center gap-1 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          카카오 간편가입 연동 계정
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          className="w-full h-12 px-4 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-[14px] cursor-not-allowed outline-none select-none pl-11 shadow-inner border border-[#dce9ff]"
                          id="userEmail"
                          readOnly
                          type="email"
                          value={userEmail}
                        />
                        <span className="material-symbols-outlined absolute left-3.5 top-3 text-[20px] text-[#737780]">mail</span>
                      </div>
                      <p className="text-[12px] text-[#737780] flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-[15px]">info</span>
                        소셜 간편가입으로 생성된 계정의 고유 이메일은 정책상 변경이 불가합니다.
                      </p>
                    </div>

                    {/* Full Name (Authenticated) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[13px] text-[#0b1c30] font-semibold" htmlFor="userName">
                          회원 성명
                        </label>
                        <span className="text-[#006c4a] text-[12px] flex items-center gap-1 font-bold">
                          <span className="material-symbols-outlined text-[14px]">verified_user</span>
                          NICE 실명인증 완료
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          className="w-full h-12 px-4 rounded-xl bg-[#eff4ff] text-[#0b1c30] text-[14px] font-medium cursor-not-allowed outline-none pl-11 border border-[#dce9ff]"
                          id="userName"
                          readOnly
                          type="text"
                          value={userNm}
                        />
                        <span className="material-symbols-outlined absolute left-3.5 top-3 text-[20px] text-[#737780]">badge</span>
                      </div>
                      <p className="text-[12px] text-[#737780]">
                        개명으로 인한 이름 변경 시 고객감동센터(1588-0000)를 통해 실명 재인증이 필요합니다.
                      </p>
                    </div>

                    {/* Phone Number with Verification Trigger */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[13px] text-[#0b1c30] font-semibold" htmlFor="userPhone">
                          휴대폰 번호 (청소 매니저 안심 연락처)
                        </label>
                        {telVerified ? (
                          <span className="text-[#006c4a] text-[12px] font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">check_circle</span>
                            인증 완료
                          </span>
                        ) : (
                          <span className="text-[#ba1a1a] text-[12px] font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">error</span>
                            번호 변경 인증 필요
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            className="w-full h-12 px-4 rounded-xl bg-white text-[#0b1c30] text-[14px] pl-11 focus:ring-2 focus:ring-[#163b66] outline-none transition-all shadow-xs border border-[#c3c6d0]"
                            id="userPhone"
                            type="tel"
                            value={userTel}
                            onChange={(e) => setUserTel(e.target.value)}
                            placeholder="010-0000-0000"
                          />
                          <span className="material-symbols-outlined absolute left-3.5 top-3 text-[20px] text-[#737780]">
                            smartphone
                          </span>
                        </div>
                        <button
                          className="h-12 px-5 rounded-xl bg-[#00254a] text-white text-[13px] font-bold hover:bg-[#163b66] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm cursor-pointer disabled:opacity-50"
                          id="btnPhoneVerify"
                          type="button"
                          disabled={phoneSending}
                          onClick={handleOpenPhoneVerify}
                        >
                          <span className="material-symbols-outlined text-[18px]">phonelink_ring</span>
                          <span>번호 변경 인증</span>
                        </button>
                      </div>

                      {/* Interactive Verification Banner */}
                      {!telVerified && (
                        <div className="mt-2 p-3 rounded-xl bg-[#dce9ff]/60 text-[#00254a] flex items-start gap-2.5 transition-all text-[13px]">
                          <span className="material-symbols-outlined text-[#006c4a] text-[18px] shrink-0 mt-0.5">
                            info
                          </span>
                          <div>
                            <span className="font-bold">휴대폰 번호가 변경되었습니다.</span> 안전한 서비스 예약 및 파트너
                            매칭을 위해 [번호 변경 인증] 버튼을 눌러 본인인증을 완료해 주세요.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Password Change Section (Collapsible Accordion) */}
                    <div className="pt-4 bg-[#eff4ff]/60 rounded-xl p-4 md:p-6 space-y-4 border border-[#dce9ff]">
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setIsPwSectionOpen(!isPwSectionOpen)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#00254a] text-[20px]">key</span>
                          <span className="text-[15px] text-[#0b1c30] font-bold">비밀번호 변경</span>
                          <span className="px-2 py-0.5 rounded-full bg-[#d3e4fe] text-[#00254a] text-[11px] font-bold">
                            선택항목
                          </span>
                        </div>
                        <button
                          className="text-[#00254a] hover:text-[#163b66] flex items-center gap-1 text-[13px] font-semibold cursor-pointer"
                          type="button"
                        >
                          <span>{isPwSectionOpen ? '접어두기' : '펼쳐서 변경하기'}</span>
                          <span
                            className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${
                              isPwSectionOpen ? 'rotate-180' : ''
                            }`}
                          >
                            expand_more
                          </span>
                        </button>
                      </div>

                      {isPwSectionOpen && (
                        <div className="space-y-4 pt-2 border-t border-[#dce9ff]/70">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Current Password */}
                            <div className="space-y-1">
                              <label className="text-[12px] text-[#43474f] font-semibold">현재 비밀번호</label>
                              <input
                                className="w-full h-11 px-3 rounded-lg bg-white text-[#0b1c30] text-[14px] focus:ring-2 focus:ring-[#163b66] outline-none transition-all shadow-xs border border-[#c3c6d0]"
                                placeholder="••••••••"
                                type="password"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                              />
                            </div>

                            {/* New Password */}
                            <div className="space-y-1">
                              <label className="text-[12px] text-[#43474f] font-semibold">새 비밀번호</label>
                              <input
                                className="w-full h-11 px-3 rounded-lg bg-white text-[#0b1c30] text-[14px] focus:ring-2 focus:ring-[#163b66] outline-none transition-all shadow-xs border border-[#c3c6d0]"
                                placeholder="영문+숫자+특수조합 8~16자"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                              />
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-1">
                              <label className="text-[12px] text-[#43474f] font-semibold">새 비밀번호 확인</label>
                              <input
                                className="w-full h-11 px-3 rounded-lg bg-white text-[#0b1c30] text-[14px] focus:ring-2 focus:ring-[#163b66] outline-none transition-all shadow-xs border border-[#c3c6d0]"
                                placeholder="동일 비밀번호 재입력"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Password validation feedback */}
                          {newPassword && (
                            <div className="flex items-center gap-1.5 text-[12px]">
                              {confirmPassword && newPassword === confirmPassword ? (
                                <span className="text-[#006c4a] flex items-center gap-1 font-semibold">
                                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                  비밀번호가 일치합니다.
                                </span>
                              ) : confirmPassword ? (
                                <span className="text-[#ba1a1a] flex items-center gap-1 font-semibold">
                                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                                  비밀번호가 일치하지 않습니다.
                                </span>
                              ) : null}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 text-[#737780] text-[12px]">
                            <span className="material-symbols-outlined text-[16px] text-[#006c4a]">check</span>
                            <span>영문 대소문자, 숫자, 특수문자(!@#$%^&*)를 2종 이상 조합하여 8자 이상 안전하게 설정해주세요.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </form>
                </section>

                {/* CARD 2: 기본 시공 주소 및 안심 전자서명 */}
                <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#e5eeff]">
                  <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#e5eeff]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#dce9ff] text-[#00254a] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[22px]">home_pin</span>
                      </div>
                      <div>
                        <h2 className="text-[18px] text-[#0b1c30] font-bold">기본 시공 주소 및 안심 전자서명</h2>
                        <p className="text-[13px] text-[#43474f]">
                          원클릭 방문 견적 및 작업 완료 검수증에 자동 반영되는 설정입니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Default Address Management */}
                    <div className="p-4 rounded-xl bg-[#eff4ff] space-y-3 border border-[#dce9ff]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-[#00254a] text-white text-[11px] font-bold">대표 주소</span>
                          <span className="text-[13px] text-[#0b1c30] font-bold">우리집 (아파트/오피스텔)</span>
                        </div>
                        <button
                          className="h-9 px-3.5 rounded-lg bg-white text-[#00254a] hover:bg-[#e5eeff] text-[13px] font-bold transition-all flex items-center gap-1 shadow-xs border border-[#c3c6d0] cursor-pointer"
                          type="button"
                          onClick={() => setIsAddrModalOpen(true)}
                        >
                          <span className="material-symbols-outlined text-[16px]">edit_location</span>
                          주소 변경
                        </button>
                      </div>
                      <div className="flex items-start gap-2 text-[#0b1c30] text-[15px] font-bold">
                        <span className="material-symbols-outlined text-[#006c4a] text-[22px] mt-0.5 shrink-0">
                          location_on
                        </span>
                        <span>{roadAddr}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[#737780] text-[13px] pl-7">
                        <span>{addrDetailNote}</span>
                      </div>
                    </div>

                    {/* Digital Signature Management */}
                    <div className="p-4 rounded-xl bg-[#eff4ff] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-[#dce9ff]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-[#00254a] shadow-xs shrink-0 border border-[#dce9ff]">
                          <span className="material-symbols-outlined text-[24px]">draw</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] text-[#0b1c30] font-bold">등록된 안심 검수 전자서명</span>
                            <span className="px-2 py-0.5 rounded-full bg-[#82f5c1]/40 text-[#00714e] text-[11px] font-bold">
                              정상 효력 유지
                            </span>
                          </div>
                          <p className="text-[13px] text-[#43474f] mt-0.5">
                            최초 등록일시: 2026.10.15 14:22 (시공 완료 리포트 및 에스크로 확정용)
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                        <button
                          className="flex-1 sm:flex-none h-9 px-3.5 rounded-lg bg-white hover:bg-[#e5eeff] text-[#0b1c30] text-[13px] font-semibold transition-all shadow-xs border border-[#c3c6d0] cursor-pointer"
                          type="button"
                          onClick={() => setIsSignPreviewOpen(!isSignPreviewOpen)}
                        >
                          {isSignPreviewOpen ? '미리보기 닫기' : '서명 미리보기'}
                        </button>
                        <button
                          className="flex-1 sm:flex-none h-9 px-3.5 rounded-lg bg-[#00254a] hover:bg-[#163b66] text-white text-[13px] font-bold transition-all shadow-xs cursor-pointer"
                          type="button"
                          onClick={openCanvasModal}
                        >
                          재등록
                        </button>
                      </div>
                    </div>

                    {/* Signature Preview Dropdown / Box */}
                    {isSignPreviewOpen && (
                      <div className="p-4 rounded-xl bg-white text-center space-y-2 shadow-inner border border-[#dce9ff] animate-in fade-in">
                        <div className="text-[12px] text-[#737780] font-medium">등록된 전자 자필 서명 이미지 데이터</div>
                        <div className="w-56 h-24 mx-auto rounded-xl bg-[#f8f9ff] border border-dashed border-[#a8c8fb] flex items-center justify-center p-2">
                          {signImgUrl ? (
                            <img src={signImgUrl} alt="등록된 전자서명" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <div className="text-[#00254a] font-serif text-[28px] font-bold italic tracking-widest">
                              {userNm}
                            </div>
                          )}
                        </div>
                        <span className="text-[12px] text-[#43474f] block">
                          전자서명법 제3조에 의거하여 본인 확인 및 시공 확인서 서명으로 법적 효력을 갖습니다.
                        </span>
                      </div>
                    )}
                  </div>
                </section>

                {/* CARD 3: 마케팅 혜택 및 알림 수신 설정 (Marketing Preferences) */}
                <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-[#e5eeff]">
                  <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#e5eeff]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#dce9ff] text-[#00254a] flex items-center justify-center">
                        <span className="material-symbols-outlined text-[22px]">notifications_active</span>
                      </div>
                      <div>
                        <h2 className="text-[18px] text-[#0b1c30] font-bold">마케팅 혜택 및 알림 수신 설정</h2>
                        <p className="text-[13px] text-[#43474f]">
                          정기 청소 쿠폰 발행 및 시공 변동 안내 수신 채널을 제어합니다.
                        </p>
                      </div>
                    </div>

                    {/* Master Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        checked={masterToggle}
                        onChange={(e) => handleMasterToggleChange(e.target.checked)}
                        className="sr-only peer"
                        type="checkbox"
                      />
                      <div className="w-14 h-8 bg-[#d3e4fe] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#006c4a]"></div>
                      <span className="ml-2 text-[13px] font-bold text-[#0b1c30] hidden sm:inline">혜택 전체 동의</span>
                    </label>
                  </div>

                  {/* Promotion Callout Banner */}
                  <div className="p-4 rounded-xl bg-[#82f5c1]/20 mb-6 flex items-start gap-3 border border-[#82f5c1]/40">
                    <span className="text-[24px] shrink-0">🎁</span>
                    <div className="space-y-1">
                      <p className="text-[13px] text-[#0b1c30] font-bold">
                        혜택 알림 동의 유지 시 매월 1일 정기 청소 5,000원 웰컴 할인 쿠폰이 자동 지급됩니다!
                      </p>
                      <p className="text-[12px] text-[#43474f]">
                        ※ 예약 승인 안내, 마스터 클리너 배차 완료, 안전 안심 리포트 등 거래 필수 정보는 수신 동의 여부와
                        무관하게 카카오 알림톡으로 정상 발송됩니다.
                      </p>
                    </div>
                  </div>

                  {/* Channel Individual Toggles */}
                  <div className="space-y-3">
                    {/* Kakao / SMS */}
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-[#eff4ff] transition-colors border border-transparent hover:border-[#dce9ff]">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-amber-500 text-[24px]">chat_bubble</span>
                        <div>
                          <div className="text-[14px] text-[#0b1c30] font-semibold">카카오 알림톡 및 SMS 혜택 알림</div>
                          <div className="text-[12px] text-[#737780]">깜짝 특가, 시공 예약 알림, 쿠폰 만료 D-3 알림</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          checked={agreeKakao}
                          onChange={(e) => handleSubToggleChange(e.target.checked, agreeEmail, agreeNight)}
                          className="sr-only peer"
                          type="checkbox"
                        />
                        <div className="w-11 h-6 bg-[#c3c6d0] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006c4a]"></div>
                      </label>
                    </div>

                    {/* Email */}
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-[#eff4ff] transition-colors border border-transparent hover:border-[#dce9ff]">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#00254a] text-[24px]">mail</span>
                        <div>
                          <div className="text-[14px] text-[#0b1c30] font-semibold">이메일 뉴스레터 및 월간 리포트</div>
                          <div className="text-[12px] text-[#737780]">계절별 공간 방역 팁, 프로모션 안내, 월간 정산 내역서</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          checked={agreeEmail}
                          onChange={(e) => handleSubToggleChange(agreeKakao, e.target.checked, agreeNight)}
                          className="sr-only peer"
                          type="checkbox"
                        />
                        <div className="w-11 h-6 bg-[#c3c6d0] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006c4a]"></div>
                      </label>
                    </div>

                    {/* Night Alerts */}
                    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-[#eff4ff] transition-colors border border-transparent hover:border-[#dce9ff]">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#737780] text-[24px]">bedtime</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[14px] text-[#0b1c30] font-semibold">
                              야간 혜택 수신 동의 (20:00 ~ 익일 08:00)
                            </span>
                            <span className="px-2 py-0.5 rounded bg-[#e5eeff] text-[#00254a] text-[11px] font-bold">
                              야간 방해금지
                            </span>
                          </div>
                          <div className="text-[12px] text-[#737780]">야간 시간대 진행되는 한정 번개 특가 청소 알림을 수신합니다.</div>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          checked={agreeNight}
                          onChange={(e) => handleSubToggleChange(agreeKakao, agreeEmail, e.target.checked)}
                          className="sr-only peer"
                          type="checkbox"
                        />
                        <div className="w-11 h-6 bg-[#c3c6d0] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006c4a]"></div>
                      </label>
                    </div>
                  </div>
                </section>

                {/* CARD 4: 위험 구역 (Danger Zone / 회원 탈퇴 안내) */}
                <section className="bg-[#ffdad6]/30 rounded-2xl p-6 md:p-8 border border-[#ffdad6]">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#ba1a1a]/10 text-[#ba1a1a] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[22px]">warning</span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-[16px] text-[#ba1a1a] font-bold">회원 탈퇴 안내</h3>
                        <p className="text-[13px] text-[#43474f] max-w-xl">
                          회원 탈퇴 시 현재 보유 중인 <span className="font-bold text-[#0b1c30]">쿠폰 {couponCount}장</span>과{' '}
                          <span className="font-bold text-[#0b1c30]">리워드 {pointBalance.toLocaleString()}P</span>는 영구
                          즉시 소멸되며, 현재 진행 중인{' '}
                          <span className="font-bold text-[#00254a]">청소 계약({activeContractCnt}건)</span>이 최종 완료 및
                          정산 처리되기 전까지는 탈퇴 신청이 일시 제한됩니다.
                        </p>
                      </div>
                    </div>
                    <button
                      className="shrink-0 px-4 py-2.5 rounded-xl text-[#ba1a1a] hover:bg-[#ba1a1a]/10 text-[13px] font-bold transition-all flex items-center gap-1 self-end sm:self-center border border-[#ba1a1a]/20 cursor-pointer"
                      onClick={handleClickWithdraw}
                      type="button"
                    >
                      <span>회원 탈퇴 신청</span>
                      <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                    </button>
                  </div>
                </section>

                {/* Bottom Form Action Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-2 pb-8">
                  <button
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#e5eeff] hover:bg-[#dce9ff] text-[#00254a] text-[15px] font-bold transition-all text-center cursor-pointer shadow-xs"
                    onClick={() => (onNavigate ? onNavigate('USER-MYP-00') : (window.location.hash = '#mypage'))}
                    type="button"
                  >
                    취소하고 돌아가기
                  </button>
                  <button
                    className="w-full sm:w-auto min-w-[220px] px-8 py-3.5 rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white text-[15px] font-bold shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    id="saveChangesBtn"
                    onClick={handleSaveProfile}
                    disabled={saving}
                    type="button"
                  >
                    {saving ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                        <span>저장 중...</span>
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">check</span>
                        <span>수정사항 저장하기</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* =============================================================
                  RIGHT COLUMN: Side Information & Security Panel (4/12 Desktop)
              ============================================================== */}
              <aside className="lg:col-span-4 flex flex-col gap-6 sticky top-20">
                {/* 1. 계정 보안 등급 카드 (Security Level Gauge) */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] space-y-4">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#006c4a] text-[22px]">shield</span>
                      <h3 className="text-[17px] text-[#0b1c30] font-bold">계정 보안 등급</h3>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#82f5c1]/30 text-[#00714e] text-[11px] font-extrabold tracking-wide">
                      {securityInfo.grade}
                    </span>
                  </div>

                  {/* Circular SVG Progress Indicator */}
                  <div className="p-4 rounded-xl bg-[#eff4ff] flex items-center gap-4 border border-[#dce9ff]">
                    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-[#d3e4fe]"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3.5"
                        ></path>
                        <path
                          className="text-[#006c4a]"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeDasharray="95, 100"
                          strokeLinecap="round"
                          strokeWidth="3.5"
                        ></path>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="text-[17px] font-extrabold text-[#0b1c30]">{securityInfo.score}</span>
                        <span className="text-[9px] -mt-1 font-bold text-[#737780]">점</span>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-[13px] text-[#0b1c30] font-bold">탁월한 보안 상태</div>
                      <p className="text-[12px] text-[#43474f] leading-snug">
                        본인인증 및 소셜 간편인증 연동으로 외부 침해로부터 안전하게 보호받고 있습니다.
                      </p>
                    </div>
                  </div>

                  {/* Security Timestamps and Device Log */}
                  <div className="space-y-2.5 pt-2 border-t border-[#e5eeff]">
                    <div className="flex items-start justify-between text-[12px]">
                      <span className="text-[#43474f]">최근 로그인</span>
                      <span className="font-semibold text-[#0b1c30] text-right">
                        {securityInfo.lastLogin.split('(')[0]}
                        <br />
                        <span className="font-normal text-[#737780]">Chrome / Windows</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[#43474f]">본인인증 이력</span>
                      <span className="font-semibold text-[#006c4a] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        {securityInfo.lastAuth}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[#43474f]">2단계 인증</span>
                      <span className="font-semibold text-[#00254a]">{securityInfo.twoFactor}</span>
                    </div>
                  </div>
                </div>

                {/* 2. 개인정보 보호 약속 위젯 (Privacy Trust Widget) */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#e5eeff] space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00254a] text-[22px]">policy</span>
                    <h3 className="text-[17px] text-[#0b1c30] font-bold">개인정보 보호 약속</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff]">
                      <span className="material-symbols-outlined text-[#006c4a] text-[18px] shrink-0 mt-0.5">
                        lock_clock
                      </span>
                      <div className="text-[12px] text-[#0b1c30] leading-snug">
                        <span className="font-bold">100% 일방향 암호화 (SHA-512 / PBKDF2)</span>
                        <br />
                        비밀번호 및 서명 데이터는 당사 관리자도 열람할 수 없도록 암호화되어 분산 보관됩니다.
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[#eff4ff] border border-[#dce9ff]">
                      <span className="material-symbols-outlined text-[#006c4a] text-[18px] shrink-0 mt-0.5">
                        verified
                      </span>
                      <div className="text-[12px] text-[#0b1c30] leading-snug">
                        <span className="font-bold">ISMS-P 인증 규격 철저 준수</span>
                        <br />
                        불필요한 마케팅 개인정보 요구를 엄격히 금지하며 서비스 제공 목적 달성 후 안전 파기됩니다.
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. 전담 고객 지원 안내 (Customer Care Card) */}
                <div className="bg-[#00254a] text-white rounded-2xl p-6 shadow-md space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-[#163b66] text-white text-[11px] font-bold">
                      고객만족센터
                    </span>
                    <span className="material-symbols-outlined text-[#85f8c4] text-[20px]">support_agent</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[17px] font-bold text-white">정보 수정에 어려움이 있으신가요?</h4>
                    <p className="text-[13px] text-[#86a6d7] leading-snug">
                      개명, 외국인 등록번호 변경, 사업자 명의 전환 등 복잡한 수정은 전담 매니저가 1:1로 빠르게
                      도와드립니다.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/10 backdrop-blur-sm space-y-1 border border-white/10">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[12px] text-[#d4e3ff]">전화 문의</span>
                      <a
                        className="text-[20px] font-extrabold text-white tracking-tight hover:underline"
                        href="tel:1588-0000"
                      >
                        1588-0000
                      </a>
                    </div>
                    <div className="text-[11px] text-[#a8c8fb]">연중무휴 08:00 - 20:00 (전국 직영 응대)</div>
                  </div>
                  <a
                    className="w-full h-11 rounded-xl bg-[#FEE500] hover:bg-[#FADA0A] text-[#191919] text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    onClick={() => alert('카카오톡 1:1 실시간 상담톡 채널(@쓸고닦고케어)로 연결됩니다.')}
                  >
                    <span className="material-symbols-outlined text-[18px]">chat</span>
                    <span>1:1 카카오톡 실시간 상담</span>
                  </a>
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================================
          4. 하단 글로벌 푸터
      ====================================================================== */}
      <footer className="w-full bg-[#eff4ff] text-[#43474f] py-12 border-t border-[#dce9ff]">
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12">
          <div className="flex flex-wrap items-center gap-4 pb-6 mb-6 border-b border-[#dce9ff]">
            <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#dce9ff] text-[#00254a]">
              <span className="material-symbols-outlined text-[#006c4a] text-[18px]">verified_user</span>
              <span className="text-[13px] font-bold">10억원 영업배상 책임보험 가입</span>
            </div>
            <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#dce9ff] text-[#00254a]">
              <span className="material-symbols-outlined text-[#006c4a] text-[18px]">security</span>
              <span className="text-[13px] font-bold">에스크로 안전결제 시스템 가동중</span>
            </div>
            <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#dce9ff] text-[#00254a]">
              <span className="material-symbols-outlined text-[#543300] text-[18px]">workspace_premium</span>
              <span className="text-[13px] font-bold">검증된 마스터 클리너 배정 100%</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-8 flex flex-col gap-1 text-[13px]">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[16px] font-bold text-[#0b1c30]">(주)쓸고닦고컴퍼니</span>
                <span className="text-[#c3c6d0]">|</span>
                <span className="text-[13px] text-[#43474f]">클리닝 &amp; 공간 솔루션 플랫폼</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                <span>대표이사: 홍길동</span>
                <span>·</span>
                <span>사업자등록번호: 214-88-00000</span>
                <span>·</span>
                <span>통신판매업신고: 2024-경기고양-1049호</span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                <span>주소: 경기도 고양시 일산동구 중앙로 1261 백석빌딩 8층</span>
                <span>·</span>
                <span>개인정보보호책임자: 김케어 (privacy@ssuldak.co.kr)</span>
              </div>
              <div className="flex flex-wrap gap-4 pt-2 text-[13px]">
                <a className="text-[#0b1c30] hover:text-[#00254a] underline font-medium cursor-pointer">이용약관</a>
                <a className="text-[#0b1c30] hover:text-[#00254a] underline font-bold cursor-pointer">개인정보처리방침</a>
                <a className="text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer">파트너 가입신청</a>
                <a className="text-[#43474f] hover:text-[#0b1c30] transition-colors cursor-pointer">클리닝 품질보증 가이드</a>
              </div>
            </div>
            <div className="md:col-span-4 flex flex-col md:items-end gap-1">
              <div className="text-[13px] text-[#43474f] font-medium">고객감동센터 365일 연중무휴</div>
              <a className="text-[24px] font-bold text-[#00254a] tracking-tight hover:underline" href="tel:1588-0000">
                1588-0000
              </a>
              <div className="text-[12px] text-[#737780]">운영시간 08:00 - 20:00 (점심시간 12:00 - 13:00)</div>
              <div className="text-[12px] text-[#737780]">카카오톡 상담톡 @쓸고닦고케어</div>
            </div>
          </div>
          <div className="mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[#dce9ff] text-[12px] text-[#737780]">
            <p>© 2024 SsulDak Company Inc. All rights reserved.</p>
            <p>SsulDak은 통신판매중개자이며 서비스 당사자가 아닌 직영 인증 파트너와 고객을 연결합니다.</p>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          5. 휴대폰 번호 변경 SMS 인증 모달
      ====================================================================== */}
      {isPhoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-5 border border-[#e5eeff]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#00254a] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">sms</span>
                </div>
                <h3 className="text-[18px] font-bold text-[#0b1c30]">휴대폰 번호 본인인증</h3>
              </div>
              <button
                className="w-8 h-8 rounded-full hover:bg-[#eff4ff] flex items-center justify-center text-[#737780] cursor-pointer"
                onClick={() => setIsPhoneModalOpen(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-[#eff4ff] space-y-1 text-[13px] border border-[#dce9ff]">
              <div className="text-[#00254a] font-bold">인증 대상 번호: {userTel}</div>
              <p className="text-[#43474f]">
                새 번호로 전송된 6자리 인증번호를 입력해 주세요. (테스트용: <span className="font-mono font-bold text-[#006c4a]">123456</span>)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-[13px] font-bold text-[#0b1c30]">인증번호 6자리</label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={phoneVerifyCodeInput}
                  onChange={(e) => setPhoneVerifyCodeInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  className="w-full h-12 px-4 rounded-xl border border-[#c3c6d0] text-[18px] font-mono tracking-widest text-center text-[#0b1c30] focus:ring-2 focus:ring-[#163b66] outline-none"
                />
                <span className="absolute right-4 top-3 text-[13px] font-mono font-bold text-[#ba1a1a]">
                  {Math.floor(phoneVerifyTimer / 60)}:{(phoneVerifyTimer % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPhoneModalOpen(false)}
                className="flex-1 h-12 rounded-xl bg-[#e5eeff] text-[#00254a] font-bold text-[14px] hover:bg-[#dce9ff] transition-all cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmPhoneVerify}
                className="flex-1 h-12 rounded-xl bg-[#00254a] text-white font-bold text-[14px] hover:bg-[#163b66] transition-all shadow-md cursor-pointer"
              >
                인증 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          6. 자필 전자서명 Canvas 재등록 모달
      ====================================================================== */}
      {isSignCanvasOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-[#e5eeff]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#00254a] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">draw</span>
                </div>
                <h3 className="text-[18px] font-bold text-[#0b1c30]">자필 서명 재등록</h3>
              </div>
              <button
                className="w-8 h-8 rounded-full hover:bg-[#eff4ff] flex items-center justify-center text-[#737780] cursor-pointer"
                onClick={() => setIsSignCanvasOpen(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="text-[13px] text-[#43474f]">
              아래 박스 안에 마우스 또는 손가락으로 본인 실명 서명을 정자 또는 필기체로 입력해 주세요.
            </p>

            <div className="relative border-2 border-dashed border-[#a8c8fb] rounded-2xl bg-[#f8f9ff] overflow-hidden flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={460}
                height={200}
                className="w-full h-[200px] cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasCanvasDrawn && (
                <div className="absolute pointer-events-none flex flex-col items-center justify-center text-[#737780]/60">
                  <span className="material-symbols-outlined text-[36px]">gesture</span>
                  <span className="text-[13px] mt-1 font-medium">여기에 서명을 그려주세요</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={clearCanvas}
                className="px-4 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#e5eeff] text-[#00254a] text-[13px] font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                다시쓰기
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSignCanvasOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#eff4ff] text-[#43474f] text-[13px] font-bold hover:bg-[#e5eeff] cursor-pointer"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={saveCanvasSignature}
                  className="px-5 py-2.5 rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white text-[13px] font-bold shadow-md cursor-pointer flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  서명 저장하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          7. 대표 주소 검색/수정 모달
      ====================================================================== */}
      {isAddrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 border border-[#e5eeff]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#00254a] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">edit_location</span>
                </div>
                <h3 className="text-[18px] font-bold text-[#0b1c30]">대표 시공 주소 변경</h3>
              </div>
              <button
                className="w-8 h-8 rounded-full hover:bg-[#eff4ff] flex items-center justify-center text-[#737780] cursor-pointer"
                onClick={() => setIsAddrModalOpen(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-[13px]">
              <div>
                <label className="text-[12px] font-bold text-[#0b1c30]">도로명 주소 검색</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={addrSearchKeyword}
                    onChange={(e) => setAddrSearchKeyword(e.target.value)}
                    className="flex-1 h-11 px-3 rounded-xl border border-[#c3c6d0] text-[13px]"
                    placeholder="도로명 또는 건물명 입력"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      showToast('검색 결과 3건이 조회되었습니다.', 'info');
                    }}
                    className="px-4 h-11 rounded-xl bg-[#00254a] text-white text-[13px] font-bold"
                  >
                    검색
                  </button>
                </div>
              </div>

              {/* 검색 추천 목록 */}
              <div className="space-y-2 pt-1">
                <div
                  className="p-3 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] cursor-pointer transition-colors border border-[#dce9ff]"
                  onClick={() => {
                    setRoadAddr('경기 고양시 일산동구 중앙로 1234, 102동 504호 (백석동, 흰돌마을)');
                    setIsAddrModalOpen(false);
                    showToast('대표 주소가 설정되었습니다.', 'success');
                  }}
                >
                  <div className="font-bold text-[#00254a]">경기 고양시 일산동구 중앙로 1234</div>
                  <div className="text-[11px] text-[#737780]">경기 고양시 일산동구 백석동 130 (흰돌마을)</div>
                </div>
                <div
                  className="p-3 rounded-xl bg-[#f8f9ff] hover:bg-[#dce9ff] cursor-pointer transition-colors border border-[#e5eeff]"
                  onClick={() => {
                    setRoadAddr('경기 고양시 일산동구 마두동 강촌마을 204동 1102호');
                    setIsAddrModalOpen(false);
                    showToast('대표 주소가 변경되었습니다.', 'success');
                  }}
                >
                  <div className="font-bold text-[#0b1c30]">경기 고양시 일산동구 강석로 33 (마두동, 강촌마을)</div>
                  <div className="text-[11px] text-[#737780]">경기 고양시 일산동구 마두동 790</div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsAddrModalOpen(false)}
                className="w-full h-11 rounded-xl bg-[#e5eeff] text-[#00254a] font-bold text-[13px]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          8. 회원 탈퇴 모달 (차단 경고 or 사유 입력)
      ====================================================================== */}
      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 md:p-8 shadow-2xl space-y-5 border border-[#e5eeff]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-[#ba1a1a]/10 text-[#ba1a1a] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">warning</span>
                </div>
                <h3 className="text-[20px] font-bold text-[#ba1a1a]">회원 탈퇴 신청</h3>
              </div>
              <button
                className="w-8 h-8 rounded-full hover:bg-[#eff4ff] flex items-center justify-center text-[#737780] cursor-pointer"
                onClick={() => setIsWithdrawModalOpen(false)}
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* A. 탈퇴 차단인 경우 */}
            {withdrawBlockInfo && !withdrawBlockInfo.canWithdraw ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#ffdad6]/40 border border-[#ffdad6] space-y-2">
                  <div className="text-[15px] font-bold text-[#ba1a1a] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[20px]">block</span>
                    현재 탈퇴가 불가능합니다
                  </div>
                  <p className="text-[13px] text-[#43474f] leading-relaxed">
                    {withdrawBlockInfo.message}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#eff4ff] text-[13px] space-y-2 border border-[#dce9ff]">
                  <div className="font-bold text-[#00254a]">진행 중인 회원 계약 자산 현황:</div>
                  <div className="flex justify-between text-[#43474f]">
                    <span>· 견적 신청 진행 건</span>
                    <span className="font-bold text-[#0b1c30]">{activeReqCnt}건</span>
                  </div>
                  <div className="flex justify-between text-[#43474f]">
                    <span>· 체결 및 시공 중 계약 건</span>
                    <span className="font-bold text-[#00254a]">{activeContractCnt}건</span>
                  </div>
                  <div className="flex justify-between text-[#43474f]">
                    <span>· 보유 할인 쿠폰</span>
                    <span className="font-bold text-[#0b1c30]">{couponCount}장</span>
                  </div>
                  <div className="flex justify-between text-[#43474f]">
                    <span>· 보유 리워드 포인트</span>
                    <span className="font-bold text-[#006c4a]">{pointBalance.toLocaleString()} P</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="w-full h-12 rounded-xl bg-[#00254a] text-white font-bold text-[14px] hover:bg-[#163b66] transition-all cursor-pointer shadow-md"
                >
                  확인하고 닫기
                </button>
              </div>
            ) : (
              /* B. 탈퇴 가능한 경우 */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#ffdad6]/30 text-[13px] text-[#ba1a1a] space-y-1">
                  <div className="font-bold">탈퇴 시 유의사항:</div>
                  <p>
                    회원 탈퇴 즉시 모든 보유 쿠폰({couponCount}장) 및 리워드 캐시({pointBalance.toLocaleString()}P)는 영구 소멸되며 복구되지 않습니다.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[13px] font-bold text-[#0b1c30]">탈퇴 사유 선택</label>
                  <select
                    value={withdrawReason}
                    onChange={(e) => setWithdrawReason(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl border border-[#c3c6d0] text-[14px]"
                  >
                    <option value="서비스 이용 빈도 낮음">서비스 이용 빈도 낮음</option>
                    <option value="타 플랫폼 이용">타 플랫폼 이용</option>
                    <option value="청소 서비스 불만족">청소 서비스 불만족</option>
                    <option value="개인정보 관리 우려">개인정보 관리 우려</option>
                    <option value="기타">기타 직접 입력</option>
                  </select>
                </div>

                <label className="flex items-center gap-2 p-3 rounded-xl bg-[#f8f9ff] border border-[#dce9ff] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withdrawConfirmChecked}
                    onChange={(e) => setWithdrawConfirmChecked(e.target.checked)}
                    className="w-4 h-4 rounded text-[#ba1a1a]"
                  />
                  <span className="text-[13px] font-bold text-[#0b1c30]">
                    위 안내 사항을 모두 숙지하였으며 회원 탈퇴에 동의합니다.
                  </span>
                </label>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsWithdrawModalOpen(false)}
                    className="flex-1 h-12 rounded-xl bg-[#e5eeff] text-[#00254a] font-bold text-[14px]"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteWithdraw}
                    disabled={!withdrawConfirmChecked}
                    className="flex-1 h-12 rounded-xl bg-[#ba1a1a] text-white font-bold text-[14px] hover:bg-[#93000a] transition-all disabled:opacity-40"
                  >
                    탈퇴 완료
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
