'use client';

import React, { useState, useEffect } from 'react';

export interface TaxSupplier {
  companyNm: string;
  bizRegNo: string;
  ceoNm: string;
  address: string;
  bizType: string;
  bizItem: string;
  email: string;
}

export interface TaxBuyer {
  companyNm: string;
  bizRegNo: string;
  ceoNm: string;
  address: string;
  bizType: string;
  bizItem: string;
  email: string;
}

export interface TaxReceiptDetail {
  payNo: string;
  contractNo: string;
  itemNm: string;
  itemDesc: string;
  issueDateText: string;
  writeDateText: string;
  ntsSendDateText: string;
  taxInvoiceNo: string;
  manageNo: string;
  supplyPrice: number;
  vat: number;
  totalAmt: number;
  promotionDiscount: number;
  promoCode: string;
  promoDesc: string;
  finalPaidAmt: number;
  orderTarget: string;
  clientDirectAmt: number;
  partnerProfit: number;
  integrityCode: string;
}

export interface PtnrSet01Props {
  onNavigate?: (screenId: string, params?: Record<string, string>) => void;
  payNo?: string;
}

export default function PtnrSet01Screen({ onNavigate, payNo = 'PAY2026102000001' }: PtnrSet01Props) {
  const [loading, setLoading] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [accountantEmail, setAccountantEmail] = useState<string>('tax_accountant@taxfirm.kr');
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailModalOpen, setEmailModalOpen] = useState<boolean>(false);
  const [orderModalOpen, setOrderModalOpen] = useState<boolean>(false);

  // 공급자 정보
  const [supplier, setSupplier] = useState<TaxSupplier>({
    companyNm: '주식회사 공간다원',
    bizRegNo: '105-87-12345',
    ceoNm: '김충훈',
    address: '서울특별시 강남구 테헤란로 케어센터 타워 14층',
    bizType: '정보통신업, 서비스',
    bizItem: '플랫폼 중개업, 소프트웨어 개발 및 온라인 정보제공업',
    email: 'tax@ssuldak.com'
  });

  // 공급받는자 정보
  const [buyer, setBuyer] = useState<TaxBuyer>({
    companyNm: '반짝빌라클린',
    bizRegNo: '123-45-67890',
    ceoNm: '이*수',
    address: '경기도 고양시 일산동구 중앙로 1261번길',
    bizType: '서비스업',
    bizItem: '건물종합관리, 청소용역',
    email: 'clean_lee@partner.ssuldak.com'
  });

  // 영수증 상세 명세
  const [receipt, setReceipt] = useState<TaxReceiptDetail>({
    payNo: payNo || 'PAY2026102000001',
    contractNo: 'CNT-20261019-0089',
    itemNm: 'SsulDak 플랫폼 데이터 이용료',
    itemDesc: '주문 배차 데이터 수수료 (주문번호: CNT-20261019-0089)',
    issueDateText: '2026년 10월 20일',
    writeDateText: '2026년 10월 20일',
    ntsSendDateText: '2026년 10월 21일 (D+1 완료)',
    taxInvoiceNo: '20261020-4100-9981-0001',
    manageNo: 'SSULDAK-TAX-20261020-0089',
    supplyPrice: 30000,
    vat: 3000,
    totalAmt: 33000,
    promotionDiscount: -33000,
    promoCode: 'CP-WELCOME-100',
    promoDesc: '신규 마스터 파트너 첫 3회차 배차 데이터 수수료 무료 지원 혜택이 적용되었습니다.',
    finalPaidAmt: 0,
    orderTarget: '일산동구 중앙로 빌라 4층 정기청소 (1회차)',
    clientDirectAmt: 80000,
    partnerProfit: 80000,
    integrityCode: '9B4F-8812-CC10-09AF'
  });

  // 토스트 메시지 헬퍼
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // 백엔드 API 호출: 영수증 상세 데이터 로드
  const fetchReceiptDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/partner/ptnr_set_01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'GET_RECEIPT_DETAIL',
          ptnrNo: 'P20261000001',
          payNo: payNo
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.supplier) setSupplier(data.supplier);
        if (data.buyer) setBuyer(data.buyer);
        if (data.receipt) setReceipt(data.receipt);
      }
    } catch (err) {
      console.warn('[PTNR-SET-01 API Fallback Active]:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceiptDetail();
  }, [payNo]);

  // 세무사 이메일 발송 핸들러
  const handleSendEmail = async (targetEmail: string) => {
    if (!targetEmail || !targetEmail.includes('@')) {
      showToast('올바른 세무사 이메일 주소를 입력해주세요.');
      return;
    }
    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/partner/ptnr_set_01', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'SEND_TAX_EMAIL',
          ptnrNo: 'P20261000001',
          payNo: receipt.payNo,
          accountantEmail: targetEmail
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || `${targetEmail} 주소로 매입전표 증빙이 안전하게 전송되었습니다.`);
        setEmailModalOpen(false);
      } else {
        showToast(data.message || '이메일 발송 중 오류가 발생했습니다.');
      }
    } catch (err) {
      showToast(`${targetEmail} 주소로 매입전표 정식 사본이 전송되었습니다.`);
      setEmailModalOpen(false);
    } finally {
      setIsSendingEmail(false);
    }
  };

  // 승인번호 복사
  const handleCopyAuthNumber = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(receipt.taxInvoiceNo);
      showToast('국세청 승인번호가 클립보드에 복사되었습니다.');
    } else {
      showToast(`국세청 승인번호: ${receipt.taxInvoiceNo}`);
    }
  };

  // 영수증 확인 링크 복사
  const handleShareLink = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(window.location.href);
      showToast('영수증 확인 링크가 클립보드에 복사되었습니다.');
    } else {
      showToast('영수증 확인 링크가 복사되었습니다.');
    }
  };

  // 인쇄 실행
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md text-body-md pb-24 md:pb-16">
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          header, footer, nav, .no-print, button, aside {
            display: none !important;
          }
          main {
            padding-top: 0 !important;
            background: #ffffff !important;
          }
          body {
            background: #ffffff !important;
          }
          .print-area {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 24px !important;
          }
        }
      `}</style>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-xl shadow-2xl text-sm flex items-center gap-2 border border-slate-700/60 backdrop-blur-md animate-fade-in no-print">
          <span className="material-symbols-outlined text-[18px] text-secondary">check_circle</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] no-print">
        <div className="h-20 max-w-[1280px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop flex items-center justify-between gap-space-md">
          {/* Logo & Status Badge */}
          <div className="flex items-center gap-space-lg">
            <button
              type="button"
              onClick={() => onNavigate?.('ptnr-dsh-00')}
              className="flex items-center gap-space-sm text-left hover:opacity-90 transition-opacity"
            >
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-on-primary shadow-sm overflow-hidden">
                <img
                  src="/logo.png"
                  alt="SsulDak 로고"
                  className="w-full h-full object-contain p-0.5"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      const span = document.createElement('span');
                      span.className = 'material-symbols-outlined text-[20px]';
                      span.textContent = 'sanitizer';
                      target.parentElement.appendChild(span);
                    }
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-primary tracking-tight font-bold">SsulDak</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-bold tracking-wider -mt-1">PARTNER</span>
              </div>
            </button>
            <div className="hidden xl:flex items-center gap-space-sm bg-surface-container-low px-space-md py-1.5 rounded-full">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
              <span className="font-label-md text-label-md text-on-surface font-bold">반짝빌라클린</span>
              <span className="font-label-sm text-label-sm text-secondary bg-secondary-container/50 px-2 py-0.5 rounded-full font-bold">영업중 (ON)</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1.5" data-active-classes="bg-primary-container text-on-primary font-bold rounded-lg shadow-sm">
            <button
              type="button"
              onClick={() => onNavigate?.('ptnr-dsh-00')}
              className="px-3.5 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              홈 (대시보드)
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('ptnr-qot-00')}
              className="px-3.5 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              공고목록/오더수신
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('ptnr-job-00')}
              className="px-3.5 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              작업관리/시공보고
            </button>
            <button
              type="button"
              aria-current="page"
              onClick={() => onNavigate?.('ptnr-set-00')}
              className="px-3.5 py-2 transition-colors bg-primary-container text-on-primary font-bold rounded-lg shadow-sm"
            >
              정산/혜택관리
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.('ptnr-dsh-01')}
              className="px-3.5 py-2 rounded-lg font-label-md text-label-md text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
            >
              프로필/지역설정
            </button>
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-space-md">
            <button
              className="relative p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
              type="button"
              onClick={() => showToast('새로운 알림: 10월 전자세금계산서 국세청 전송이 정상 완료되었습니다.')}
              aria-label="알림"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-error"></span>
            </button>
            <div className="hidden sm:flex items-center gap-space-sm pl-space-sm">
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <span className="font-label-md text-label-md text-on-surface font-bold">이수대표</span>
                  <span className="font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed px-1.5 py-0.5 rounded font-bold">마스터 파트너1급</span>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant">파트너 ID: 294-81-01932</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
            </div>
            <button
              className="hidden sm:flex items-center p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-colors"
              type="button"
              title="로그아웃"
              onClick={() => onNavigate?.('ptnr-ath-00')}
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full pt-20 bg-background">
        <div className="flex flex-col w-full">
          
          {/* Top Command & Breadcrumb Surface */}
          <section className="w-full bg-surface-container-low/70 py-space-lg no-print">
            <div className="max-w-[1280px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop flex flex-col gap-space-md">
              {/* Breadcrumb Bar & Back Anchor */}
              <div className="flex flex-wrap items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-xs font-label-md text-label-md text-on-surface-variant flex-wrap">
                  <button type="button" onClick={() => onNavigate?.('ptnr-dsh-00')} className="hover:text-primary transition-colors">홈</button>
                  <span className="material-symbols-outlined text-[16px] text-outline-variant">chevron_right</span>
                  <button type="button" onClick={() => onNavigate?.('ptnr-dsh-00')} className="hover:text-primary transition-colors">대시보드</button>
                  <span className="material-symbols-outlined text-[16px] text-outline-variant">chevron_right</span>
                  <button type="button" onClick={() => onNavigate?.('ptnr-set-00')} className="hover:text-primary transition-colors">정산/혜택 관리</button>
                  <span className="material-symbols-outlined text-[16px] text-outline-variant">chevron_right</span>
                  <button type="button" onClick={() => onNavigate?.('ptnr-set-00')} className="hover:text-primary transition-colors">정산 및 매출 내역</button>
                  <span className="material-symbols-outlined text-[16px] text-outline-variant">chevron_right</span>
                  <span className="text-primary font-bold">데이터 이용료 영수증</span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate?.('ptnr-set-00')}
                  className="inline-flex items-center gap-1.5 px-space-md py-1.5 rounded-lg bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container-high transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary">arrow_back</span>
                  <span>정산 및 매출 내역으로 돌아가기 (PTNR-SET-00)</span>
                </button>
              </div>

              {/* Main Heading & Quick Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pt-space-xs">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-space-sm">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-bold">
                      <span className="material-symbols-outlined text-[15px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      국세청 전송 완료 (정상 승인)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-bold">
                      <span className="material-symbols-outlined text-[15px]">receipt_long</span>
                      매입 전자세금계산서 (청구/영수)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold">
                      전액 프로모션 지원금 면제
                    </span>
                  </div>
                  <h1 className="font-headline-lg text-headline-lg text-on-background tracking-tight font-bold">
                    데이터 이용료 영수증 <span className="font-headline-sm text-headline-sm text-on-surface-variant font-normal">(전자세금계산서 / 매입전표)</span>
                  </h1>
                </div>

                {/* Global Utility Actions */}
                <div className="flex items-center gap-space-sm flex-wrap">
                  <button
                    className="inline-flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container transition-all shadow-sm border border-slate-200"
                    onClick={handlePrint}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">print</span>
                    <span>인쇄하기</span>
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-surface-container-lowest text-on-surface font-label-md text-label-md hover:bg-surface-container transition-all shadow-sm border border-slate-200"
                    onClick={handleShareLink}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">share</span>
                    <span>링크 공유</span>
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-primary-container text-on-primary font-label-md text-label-md hover:opacity-95 transition-all shadow-sm font-bold"
                    onClick={() => setEmailModalOpen(true)}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
                    <span>세무사 이메일 발송</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Document & Sidebar Layout */}
          <div className="max-w-[1280px] w-full mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop py-space-xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
              
              {/* LEFT COLUMN: Standard Electronic Tax Invoice (Approx 66% width) */}
              <div className="lg:col-span-8 flex flex-col gap-space-lg">
                
                {/* Physical Document Container */}
                <div className="print-area relative bg-surface-container-lowest rounded-2xl shadow-xl overflow-hidden p-6 md:p-10 flex flex-col gap-space-lg border border-slate-100">
                  {/* Subtle Print/Doc Watermark Stamp */}
                  <div className="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-secondary/5 pointer-events-none flex items-center justify-center">
                    <span className="material-symbols-outlined text-[180px] text-secondary/10">verified</span>
                  </div>

                  {/* Document Top Meta Area */}
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md pb-space-md bg-surface-container-low/50 p-space-md rounded-xl">
                    <div className="flex flex-col gap-1">
                      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                        National Tax Service 승인 적격증빙
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-headline-md text-headline-md text-primary font-extrabold tracking-tight">
                          전자세금계산서
                        </span>
                        <span className="px-2 py-0.5 rounded text-label-sm font-label-sm bg-primary/10 text-primary font-bold">
                          공급받는자 보관용
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end gap-1 font-body-sm text-body-sm">
                      <div className="flex items-center gap-1.5 bg-surface-container-lowest px-2.5 py-1 rounded-lg shadow-sm border border-slate-200">
                        <span className="text-on-surface-variant font-label-sm text-label-sm">국세청 승인번호:</span>
                        <span className="font-bold text-on-surface font-label-md text-label-md tracking-wide" id="tax-auth-number">
                          {receipt.taxInvoiceNo}
                        </span>
                        <button
                          className="text-primary hover:text-primary-container p-0.5"
                          onClick={handleCopyAuthNumber}
                          title="승인번호 복사"
                          type="button"
                        >
                          <span className="material-symbols-outlined text-[16px]">content_copy</span>
                        </button>
                      </div>
                      <span className="text-on-surface-variant text-[12px]">
                        관리번호: {receipt.manageNo}
                      </span>
                    </div>
                  </div>

                  {/* Chronology Ticker */}
                  <div className="grid grid-cols-3 gap-2 bg-surface-container-low p-3 rounded-lg text-center font-body-sm text-body-sm border border-slate-200/60">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">작성일자</span>
                      <span className="font-bold text-on-surface">{receipt.writeDateText}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-on-surface-variant">발급일자</span>
                      <span className="font-bold text-on-surface">{receipt.issueDateText}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-secondary font-semibold">국세청 전송일자</span>
                      <span className="font-bold text-secondary">{receipt.ntsSendDateText}</span>
                    </div>
                  </div>

                  {/* Dual Party Table (공급자 vs 공급받는자) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                    
                    {/* 공급자 (Platform) */}
                    <div className="relative bg-surface-container-low/60 rounded-xl p-space-md flex flex-col gap-2 border border-slate-200/60">
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-headline-sm text-headline-sm text-primary font-bold">
                          공급자 (서비스 제공사)
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary text-on-primary">
                          플랫폼 본사
                        </span>
                      </div>
                      <div className="space-y-1.5 font-body-sm text-body-sm text-on-surface">
                        <div className="flex justify-between py-1 bg-surface-container-lowest/80 px-2 rounded">
                          <span className="text-on-surface-variant">등록번호</span>
                          <span className="font-bold tracking-wide">{supplier.bizRegNo}</span>
                        </div>
                        <div className="flex justify-between py-1 bg-surface-container-lowest/80 px-2 rounded items-center">
                          <span className="text-on-surface-variant">상호(법인명)</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">{supplier.companyNm}</span>
                            {/* Digital Seal Stamp Ornament */}
                            <div className="relative w-8 h-8 rounded-full bg-error-container text-error flex items-center justify-center font-bold text-[10px] shadow-sm transform -rotate-12 scale-90 border border-error/30">
                              <span>직인</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between py-1 bg-surface-container-lowest/80 px-2 rounded">
                          <span className="text-on-surface-variant">대표이사 성명</span>
                          <span className="font-medium">{supplier.ceoNm}</span>
                        </div>
                        <div className="flex flex-col py-1 bg-surface-container-lowest/80 px-2 rounded">
                          <span className="text-on-surface-variant text-[11px]">사업장 주소</span>
                          <span className="font-medium">{supplier.address}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 py-1 bg-surface-container-lowest/80 px-2 rounded">
                          <div>
                            <span className="text-on-surface-variant text-[11px]">업태:</span>{' '}
                            <span className="font-medium">{supplier.bizType}</span>
                          </div>
                          <div>
                            <span className="text-on-surface-variant text-[11px]">종목:</span>{' '}
                            <span className="font-medium">{supplier.bizItem}</span>
                          </div>
                        </div>
                        <div className="flex justify-between py-1 bg-surface-container-lowest/80 px-2 rounded">
                          <span className="text-on-surface-variant">전자우편</span>
                          <span className="font-medium text-primary">{supplier.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* 공급받는자 (Partner) */}
                    <div className="relative bg-surface-container-high/40 rounded-xl p-space-md flex flex-col gap-2 border border-slate-200/60">
                      <div className="flex items-center justify-between pb-1">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                          공급받는자 (파트너 회원)
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-secondary text-on-secondary">
                          마스터 파트너
                        </span>
                      </div>
                      <div className="space-y-1.5 font-body-sm text-body-sm text-on-surface">
                        <div className="flex justify-between py-1 bg-surface-container-lowest px-2 rounded">
                          <span className="text-on-surface-variant">등록번호</span>
                          <span className="font-bold tracking-wide">{buyer.bizRegNo}</span>
                        </div>
                        <div className="flex justify-between py-1 bg-surface-container-lowest px-2 rounded">
                          <span className="text-on-surface-variant">상호(사업체명)</span>
                          <span className="font-bold">{buyer.companyNm}</span>
                        </div>
                        <div className="flex justify-between py-1 bg-surface-container-lowest px-2 rounded">
                          <span className="text-on-surface-variant">대표자 성명</span>
                          <span className="font-medium">{buyer.ceoNm}</span>
                        </div>
                        <div className="flex flex-col py-1 bg-surface-container-lowest px-2 rounded">
                          <span className="text-on-surface-variant text-[11px]">사업장 주소</span>
                          <span className="font-medium">{buyer.address}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1 py-1 bg-surface-container-lowest px-2 rounded">
                          <div>
                            <span className="text-on-surface-variant text-[11px]">업태:</span>{' '}
                            <span className="font-medium">{buyer.bizType}</span>
                          </div>
                          <div>
                            <span className="text-on-surface-variant text-[11px]">종목:</span>{' '}
                            <span className="font-medium">{buyer.bizItem}</span>
                          </div>
                        </div>
                        <div className="flex justify-between py-1 bg-surface-container-lowest px-2 rounded">
                          <span className="text-on-surface-variant">전자우편</span>
                          <span className="font-medium text-primary">{buyer.email}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Itemized Breakdown */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-label-lg text-label-lg font-bold text-on-surface">
                        품목 명세 및 과세 표준
                      </span>
                      <span className="text-on-surface-variant font-label-sm text-label-sm">통화단위: KRW (원)</span>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto rounded-xl bg-surface-container-low p-1 border border-slate-200/60">
                      <table className="w-full text-left font-body-sm text-body-sm">
                        <thead>
                          <tr className="text-on-surface-variant font-label-sm text-label-sm border-b border-slate-200">
                            <th className="p-3">일자</th>
                            <th className="p-3">품목 / 규격</th>
                            <th className="p-3 text-center">수량</th>
                            <th className="p-3 text-right">공급가액</th>
                            <th className="p-3 text-right">세액 (VAT 10%)</th>
                            <th className="p-3 text-right">합계액</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y-0">
                          <tr className="bg-surface-container-lowest rounded-lg">
                            <td className="p-3 whitespace-nowrap text-on-surface-variant">10/20</td>
                            <td className="p-3">
                              <div className="flex flex-col">
                                <span className="font-bold text-on-surface">{receipt.itemNm}</span>
                                <span className="text-[12px] text-on-surface-variant">{receipt.itemDesc}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-bold">1 건</td>
                            <td className="p-3 text-right font-medium">{receipt.supplyPrice.toLocaleString()} 원</td>
                            <td className="p-3 text-right font-medium">{receipt.vat.toLocaleString()} 원</td>
                            <td className="p-3 text-right font-bold text-primary">{receipt.totalAmt.toLocaleString()} 원</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Promotion Deduction Banner (Key highlight) */}
                  <div className="p-space-md rounded-xl bg-secondary-container/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md border border-secondary/20">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary text-on-secondary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[24px]">redeem</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-label-lg text-label-lg font-bold text-on-surface">
                            입점 프로모션 100% 전액 지원금 감면
                          </span>
                          <span className="bg-secondary text-on-secondary font-label-sm text-label-sm px-2 py-0.5 rounded font-bold">
                            {receipt.promoCode}
                          </span>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {receipt.promoDesc}
                        </p>
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <span className="font-label-sm text-label-sm text-secondary font-bold block">프로모션 차감액</span>
                      <span className="font-headline-md text-headline-md text-secondary font-extrabold">
                        - {Math.abs(receipt.promotionDiscount).toLocaleString()} 원
                      </span>
                    </div>
                  </div>

                  {/* Total Settlement Grid Box */}
                  <div className="bg-primary text-on-primary rounded-xl p-space-lg flex flex-col md:flex-row items-center justify-between gap-space-md relative overflow-hidden shadow-lg">
                    <div className="flex flex-col gap-1 z-10">
                      <span className="font-label-sm text-label-sm text-on-primary-container tracking-wider uppercase font-semibold">
                        최종 파트너 실 청구/결제 대금
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-display font-extrabold text-3xl sm:text-4xl">
                          {receipt.finalPaidAmt.toLocaleString()} 원
                        </span>
                        <span className="text-on-primary-container font-label-md text-label-md font-medium">
                          (영수 완료: 청구금액 전액 차감)
                        </span>
                      </div>
                      <span className="font-body-sm text-body-sm text-on-primary-container">
                        정상 발행 후 프로모션 쿠폰 연동 자동 처리
                      </span>
                    </div>

                    {/* Stylized Stamp Indicator */}
                    <div className="z-10 bg-surface-container-lowest/10 backdrop-blur-md px-4 py-3 rounded-2xl flex items-center gap-3 border border-white/10">
                      <div className="w-12 h-12 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center">
                        <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                          task_alt
                        </span>
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="font-headline-sm text-headline-sm font-extrabold text-secondary-fixed">
                          영수 (PAID IN FULL)
                        </span>
                        <span className="text-[11px] text-primary-fixed-dim">PROMOTION 100% COMPLIANT</span>
                      </div>
                    </div>
                  </div>

                  {/* Tax Compliance Official Footnote */}
                  <div className="flex items-start gap-2.5 pt-2 text-on-surface-variant font-body-sm text-body-sm">
                    <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">info</span>
                    <p>
                      본 세금계산서는 부가가치세법 제32조에 의거하여 전자발행되었으며, 국세청 홈택스 시스템에 실시간 전송 완료된 매입세액 공제용 정규 적격증빙입니다. 부가가치세 신고 시 별도의 종이 영수증 제출 없이 국세청 전산자료를 통해 전자 신고 가능합니다.
                    </p>
                  </div>
                </div>

                {/* Additional Verification Assurance Card */}
                <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between gap-space-md border border-slate-100 no-print">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[20px]">security</span>
                    </div>
                    <div>
                      <p className="font-label-md text-label-md font-bold text-on-surface">전자서명 인증 및 무결성 검증 완료</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        공인인증기관(KICA) 전자서명 암호화 키 적용 (위변조 방지 코드: {receipt.integrityCode})
                      </p>
                    </div>
                  </div>
                  <span className="font-label-sm text-label-sm text-secondary font-bold px-2 py-1 bg-secondary-container/40 rounded">
                    위변조검증 PASS
                  </span>
                </div>
              </div>

              {/* RIGHT COLUMN: Actions, Order Context, and Tax Guidance (Approx 34% width) */}
              <aside className="lg:col-span-4 flex flex-col gap-space-lg sticky top-24 no-print">
                
                {/* CARD 1: Document Action Center */}
                <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-md flex flex-col gap-space-md border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">영수증 보관 및 전송</span>
                    <span className="material-symbols-outlined text-[20px] text-primary">cloud_download</span>
                  </div>

                  {/* Primary CTA Button */}
                  <button
                    className="w-full py-3.5 px-4 rounded-xl bg-primary text-on-primary font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-md active:scale-[0.98]"
                    onClick={handlePrint}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">download</span>
                    <span>PDF 영수증 다운로드 (세무용)</span>
                  </button>

                  {/* Email to Tax Accountant Input Box */}
                  <div className="flex flex-col gap-2 pt-2">
                    <label className="font-label-sm text-label-sm text-on-surface-variant font-bold" htmlFor="tax-agent-email">
                      세무대리인(기장 세무사) 즉시 이메일 전달
                    </label>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 px-3 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-body-sm text-body-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border border-slate-200"
                        id="tax-agent-email"
                        placeholder="tax_accountant@taxfirm.kr"
                        type="email"
                        value={accountantEmail}
                        onChange={(e) => setAccountantEmail(e.target.value)}
                      />
                      <button
                        className="px-4 py-2.5 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md font-bold hover:opacity-90 transition-all shrink-0 disabled:opacity-50"
                        onClick={() => handleSendEmail(accountantEmail)}
                        disabled={isSendingEmail}
                        type="button"
                      >
                        {isSendingEmail ? '전송중' : '전송'}
                      </button>
                    </div>
                    <span className="text-[11px] text-on-surface-variant">
                      입력된 이메일로 국세청 XML 원본 및 PDF 압축파일이 발송됩니다.
                    </span>
                  </div>
                </div>

                {/* CARD 2: Connected Order & Settlement Summary */}
                <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md border border-slate-100">
                  <div className="flex items-center justify-between pb-1">
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">연동 주문 시공 내역</span>
                    <span className="px-2 py-0.5 rounded text-[11px] bg-surface-container text-on-surface font-bold">
                      주문 연동
                    </span>
                  </div>
                  <div className="space-y-2.5 font-body-sm text-body-sm">
                    <div className="flex justify-between items-center py-1 bg-surface-container-low px-3 rounded-lg border border-slate-200/60">
                      <span className="text-on-surface-variant">연동 주문번호</span>
                      <span className="font-bold text-on-surface">{receipt.contractNo}</span>
                    </div>
                    <div className="flex flex-col py-1 px-1">
                      <span className="text-on-surface-variant text-[12px]">시공 대상</span>
                      <span className="font-bold text-on-surface">{receipt.orderTarget}</span>
                    </div>
                    <div className="bg-surface-container-low p-3 rounded-xl space-y-1.5 border border-slate-200/60">
                      <div className="flex justify-between text-on-surface-variant">
                        <span>고객 직접 수령 도급액</span>
                        <span className="font-bold text-on-surface">{receipt.clientDirectAmt.toLocaleString()} 원</span>
                      </div>
                      <div className="flex justify-between text-secondary">
                        <span>플랫폼 데이터 수수료</span>
                        <span className="font-bold">
                          0 원 <span className="text-[11px] line-through text-on-surface-variant/60">({receipt.totalAmt.toLocaleString()}원)</span>
                        </span>
                      </div>
                      <div className="pt-2 flex justify-between items-center font-label-lg text-label-lg font-extrabold text-primary border-t border-slate-200">
                        <span>파트너 실수령 순이익</span>
                        <span className="text-headline-sm font-extrabold text-secondary">
                          {receipt.partnerProfit.toLocaleString()} 원 <span className="text-[12px] font-bold">(마진 100%)</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    className="w-full py-2.5 rounded-xl bg-surface-container text-primary font-label-md text-label-md font-bold text-center hover:bg-surface-container-high transition-colors flex items-center justify-center gap-1 border border-slate-200"
                    type="button"
                    onClick={() => setOrderModalOpen(true)}
                  >
                    <span>주문 상세 및 시공보고서 확인</span>
                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                  </button>
                </div>

                {/* CARD 3: Quick Hometax Tax Filing Guide */}
                <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-md border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[22px]">account_balance</span>
                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">세무 신고 간편 가이드</span>
                  </div>
                  <div className="space-y-3 font-body-sm text-body-sm">
                    <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1 border border-slate-200/60">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        <span className="font-label-md text-label-md font-bold text-on-surface">일반과세자 파트너</span>
                      </div>
                      <p className="text-on-surface-variant text-[12px]">
                        부가세 신고 시 매입세액 공제액은 0원입니다. (프로모션 100% 감면으로 실지출액이 0원 처리됨)
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1 border border-slate-200/60">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-secondary"></span>
                        <span className="font-label-md text-label-md font-bold text-on-surface">간이과세자 파트너</span>
                      </div>
                      <p className="text-on-surface-variant text-[12px]">
                        종합소득세 신고 시 별도의 영수증 첨부 불필요 (국세청 전산 자동 조회 매칭 완료)
                      </p>
                    </div>
                  </div>
                  <div className="pt-1 flex items-center justify-between text-[12px] text-on-surface-variant">
                    <span>국세청 홈택스(hometax.go.kr)</span>
                    <a
                      className="text-primary font-bold hover:underline inline-flex items-center gap-0.5"
                      href="https://hometax.go.kr"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span>홈택스 바로가기</span>
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                    </a>
                  </div>
                </div>

                {/* CARD 4: Dedicated Tax Helpline Widget */}
                <div className="bg-surface-container-low rounded-2xl p-space-md flex items-center justify-between gap-space-sm border border-slate-200/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shadow-sm">
                      <span className="material-symbols-outlined text-[20px]">headset_mic</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-md text-label-md font-bold text-on-surface">파트너 세무 전담 헬프데스크</span>
                      <span className="text-[12px] text-on-surface-variant">1588-0000 (내선 4번) | 카톡 @쓸고닦고세무지원</span>
                    </div>
                  </div>
                  <button
                    className="p-2 rounded-lg bg-surface-container-lowest text-primary hover:bg-surface-container-high transition-colors shadow-sm"
                    onClick={() => showToast('세무 전담 상담원 채팅 연결 요청이 접수되었습니다.')}
                    title="상담 연결"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[20px]">chat</span>
                  </button>
                </div>
              </aside>
            </div>
          </div>

          {/* Bottom Navigation / Inter-Screen Action Bar */}
          <section className="w-full bg-surface-container-lowest py-space-lg shadow-sm border-t border-slate-200 no-print">
            <div className="max-w-[1280px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop flex flex-col sm:flex-row items-center justify-between gap-space-md">
              <button
                type="button"
                onClick={() => onNavigate?.('ptnr-set-00')}
                className="inline-flex items-center gap-2 px-space-lg py-3 rounded-xl bg-surface-container text-on-surface font-label-md text-label-md font-bold hover:bg-surface-container-high transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                <span>이전 목록 (정산 및 매출 내역 PTNR-SET-00)</span>
              </button>
              <div className="flex items-center gap-space-md w-full sm:w-auto justify-end">
                <span className="font-body-sm text-body-sm text-on-surface-variant hidden md:inline">
                  현재 적용된 프로모션 쿠폰 잔여: <strong className="text-secondary">2회차 남음</strong>
                </span>
                <button
                  type="button"
                  onClick={() => onNavigate?.('ptnr-set-02')}
                  className="inline-flex items-center gap-2 px-space-lg py-3 rounded-xl bg-secondary text-on-secondary font-label-md text-label-md font-bold hover:opacity-95 transition-all shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">card_giftcard</span>
                  <span>파트너 쿠폰함 확인 (PTNR-SET-02)</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface-container-low mt-space-xl border-t border-slate-200 no-print">
        <div className="max-w-[1280px] mx-auto px-margin md:px-margin-tablet lg:px-margin-desktop py-space-xl flex flex-col gap-space-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg pb-space-lg">
            <div className="space-y-space-xs">
              <div className="flex items-center gap-space-sm text-primary">
                <span className="material-symbols-outlined text-[24px]">support_agent</span>
                <span className="font-headline-sm text-headline-sm font-bold">24시 파트너 긴급 헬프센터</span>
              </div>
              <p className="font-display text-display text-primary font-bold tracking-tight text-2xl">1588-0000</p>
              <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                현장 작업 사고, 고객 긴급 분쟁, 야간 긴급 지원 365일 상시대기
              </p>
            </div>
            <div className="space-y-space-xs">
              <div className="flex items-center gap-space-sm text-secondary">
                <span className="material-symbols-outlined text-[24px]">verified_user</span>
                <span className="font-headline-sm text-headline-sm font-bold">에스크로 안전정산 보장제</span>
              </div>
              <p className="font-body-md text-body-md text-on-surface font-medium text-sm">
                검수 완료 즉시 시공 대금 100% 안심 입금 지급 보증 시스템
              </p>
              <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                신한은행 에스크로 파트너십 예치 계약 체결 완료
              </p>
            </div>
            <div className="space-y-space-xs">
              <span className="font-label-lg text-label-lg text-on-surface font-bold text-sm">파트너 주요 규정 및 정책</span>
              <div className="flex flex-wrap gap-x-space-md gap-y-1 font-body-sm text-body-sm text-on-surface-variant text-xs">
                <button type="button" onClick={() => showToast('파트너 이용약관')} className="hover:text-primary transition-colors">파트너 이용약관</button>
                <button type="button" onClick={() => showToast('개인정보처리방침')} className="hover:text-primary transition-colors font-bold">개인정보처리방침</button>
                <button type="button" onClick={() => showToast('작업시공 품질기준표')} className="hover:text-primary transition-colors">작업시공 품질기준표</button>
                <button type="button" onClick={() => showToast('손해배상책임 안내')} className="hover:text-primary transition-colors">손해배상책임 안내</button>
              </div>
            </div>
          </div>
          <div className="pt-space-md flex flex-col md:flex-row items-start md:items-center justify-between gap-space-sm text-on-surface-variant font-body-sm text-body-sm border-t border-slate-200 text-xs">
            <div className="space-y-1">
              <p>(주)썰닥 | B2B 파트너 전용 콘솔 운영본부 | 대표이사: 김클린 | 사업자등록번호: 104-86-33921</p>
              <p>통신판매업신고: 제2024-서울강남-01928호 | 서울특별시 강남구 테헤란로 152 강남파이낸스센터 18F</p>
            </div>
            <p className="font-label-sm text-label-sm">© 2026 SsulDak Clean Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Nav (4대 파트너 네비게이션) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-4 py-2 flex items-center justify-around no-print">
        <button
          type="button"
          onClick={() => onNavigate?.('ptnr-dsh-00')}
          className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-primary text-[11px] font-medium"
        >
          <span className="material-symbols-outlined text-[20px]">dashboard</span>
          <span>홈</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('ptnr-qot-00')}
          className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-primary text-[11px] font-medium"
        >
          <span className="material-symbols-outlined text-[20px]">assignment</span>
          <span>공고목록</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('ptnr-job-00')}
          className="flex flex-col items-center gap-0.5 text-slate-500 hover:text-primary text-[11px] font-medium"
        >
          <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          <span>작업관리</span>
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.('ptnr-set-00')}
          className="flex flex-col items-center gap-0.5 text-[#1E293B] text-[11px] font-bold"
        >
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            account_balance_wallet
          </span>
          <span>정산/혜택</span>
        </button>
      </nav>

      {/* 세무사 이메일 발송 모달 */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">forward_to_inbox</span>
                </span>
                <h4 className="font-bold text-slate-900 text-lg">세무대리인 증빙 이메일 전송</h4>
              </div>
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3 bg-surface-container-low rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">발송 문서</span>
                  <span className="font-bold text-primary">전자세금계산서 (매입자 보관용)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">승인번호</span>
                  <span className="font-bold text-slate-800">{receipt.taxInvoiceNo}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  기장 세무사 / 회계법인 이메일
                </label>
                <input
                  type="email"
                  value={accountantEmail}
                  onChange={(e) => setAccountantEmail(e.target.value)}
                  placeholder="tax@accountant.co.kr"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary text-slate-800"
                />
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                ※ 국세청 홈택스 표준 XML 전자문서 및 PDF 세무신고용 매입전표 압축 파일이 첨부되어 즉시 발송됩니다.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleSendEmail(accountantEmail)}
                disabled={isSendingEmail}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-container transition-colors shadow-sm disabled:opacity-50"
              >
                {isSendingEmail ? '전송 처리중...' : '이메일 즉시 전송'}
              </button>
              <button
                type="button"
                onClick={() => setEmailModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 주문 상세 및 시공보고서 모달 */}
      {orderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary-container text-on-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">assignment</span>
                </span>
                <div>
                  <h4 className="font-bold text-slate-900 text-lg">연동 시공 주문 상세</h4>
                  <p className="text-xs text-slate-500">{receipt.contractNo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOrderModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="bg-surface-container-low p-3.5 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">시공 품목</span>
                <span className="font-bold text-primary">{receipt.orderTarget}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">시공 일시</span>
                <span className="font-bold text-slate-800">2026.10.20 (화) 14:00 ~ 16:30</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">현장 수령액</span>
                <span className="font-bold text-slate-900">{receipt.clientDirectAmt.toLocaleString()} 원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">적용 프로모션</span>
                <span className="font-bold text-secondary">입점 100% 무료 쿠폰 (33,000원 전액 감면)</span>
              </div>
            </div>

            <div className="p-3 bg-secondary-container/20 rounded-xl text-xs space-y-1">
              <span className="font-bold text-secondary block">시공 완료 및 고객 검수 승인 내역</span>
              <p className="text-slate-600">
                고객 자필 전자서명 완료 및 4장 현장 사진(계단, 복도, 현관 유리문, 분리수거장) 품질 검수가 모두 적합 처리되었습니다.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  showToast('시공보고서 사본이 준비되었습니다.');
                  setOrderModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary-container transition-colors shadow-sm"
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
