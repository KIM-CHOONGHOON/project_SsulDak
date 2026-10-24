'use client';

import React, { useState, useEffect, useRef } from 'react';

// =============================================================================
// 인터페이스 정의
// =============================================================================

export interface SitePhotoItem {
  id: string;
  photoUrl: string;
  fileName: string;
  fileSize: number; // In bytes
  sortOrd: number;
  category?: string;
  isPrimary?: boolean;
}

export interface UserReq04ModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSavePhotos?: (photos: SitePhotoItem[]) => void;
  initialPhotos?: (SitePhotoItem | string)[];
  userNo?: string;
  apiEndpoint?: string;
}

// 기본 샘플 사진 2종 (제공된 HTML 목업 사양)
const DEFAULT_SAMPLE_PHOTOS: SitePhotoItem[] = [
  {
    id: 'sample-photo-1',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCOLMC7fgVJ2YH9IIeNgMSS0Wbt3E_DKazhGD9SD2lQGfJnUcXdC1RtGIXpfqgNvK2HPkpO0NGZ1WOAxk6XPy9Pa1FIXxHoxQT7ROo5WfIs_RtqqSk6TbP9mPsoThs0gWySiuKsE-rIWVwdx-kImFmvVR4riI1_WCRwRCgc_484sCKPu5lVyg-E74d----e1q9PoOBUCL9k3TLZ9PD_wAnioIYW3-aCEvT0H8_6r2flPvP8bYQOmAG5',
    fileName: '계단_상태_사진.jpg',
    fileSize: 2.4 * 1024 * 1024,
    sortOrd: 1,
    category: '계단 전경 및 난간',
    isPrimary: true,
  },
  {
    id: 'sample-photo-2',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBX4Uhwi_mAh6N4pV-BtJEkug-brUkuJ8azQW1IjzI4C_zDw0I7Rk-uKiQLQsnqnv1oK8rNzrwlBVUP0assnhNz9uBQlefEARP6UnUwsxOuwBJtXrJqGpdGQVy9govQ4HFeaNmkmsnzoZjNeHlYmimHF5-HKHv-HBrXbqCA50tR-JGpzweK-hXP2kqTzSaJvWCgAq1KgrLTPjll5qmXkCadyd9oQvGd9FRn2qMkS2ZXTbWAg7qVVG_A',
    fileName: '에어컨_모델명.png',
    fileSize: 1.8 * 1024 * 1024,
    sortOrd: 2,
    category: '에어컨 모델 라벨',
    isPrimary: false,
  },
];

export const UserReq04Modal: React.FC<UserReq04ModalProps> = ({
  isOpen = true,
  onClose,
  onSavePhotos,
  initialPhotos,
  userNo = 'U20261000001',
  apiEndpoint = '/api/user/user_req_04',
}) => {
  // ---------------------------------------------------------------------------
  // 1. 상태 관리
  // ---------------------------------------------------------------------------
  const [photoList, setPhotoList] = useState<SitePhotoItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 초기 사진 세팅
  useEffect(() => {
    if (initialPhotos && initialPhotos.length > 0) {
      const formatted: SitePhotoItem[] = initialPhotos.map((item, idx) => {
        if (typeof item === 'string') {
          return {
            id: `photo-${idx}-${Date.now()}`,
            photoUrl: item,
            fileName: `현장사진_${idx + 1}.jpg`,
            fileSize: 2.1 * 1024 * 1024,
            sortOrd: idx + 1,
            category: idx === 0 ? '대표 사진' : '현장 실사 사진',
            isPrimary: idx === 0,
          };
        }
        return {
          ...item,
          sortOrd: idx + 1,
          isPrimary: idx === 0,
        };
      });
      setPhotoList(formatted);
    } else {
      setPhotoList(DEFAULT_SAMPLE_PHOTOS);
    }
  }, [initialPhotos, isOpen]);

  // 토스트 메시지 헬퍼
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ---------------------------------------------------------------------------
  // 2. 파일 처리 및 업로드 핸들러
  // ---------------------------------------------------------------------------
  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    if (photoList.length + fileArray.length > 5) {
      alert('현장 사진은 최대 5장까지만 등록 가능합니다.');
      return;
    }

    setIsUploading(true);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];

      // 용량 검사 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert(`'${file.name}' 파일이 10MB를 초과하여 제외되었습니다.`);
        continue;
      }

      // 확장자 검사
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext)) {
        alert(`'${file.name}'은(는) 지원하지 않는 형식입니다. (JPG, PNG, WEBP, HEIC만 가능)`);
        continue;
      }

      try {
        // Base64 변환
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const nextSortOrd = photoList.length + 1;

        // 백엔드 API 업로드 요청 (실패 시 프론트엔드 프리뷰로 우아하게 폴백)
        let savedPhotoUrl = base64Data;
        try {
          const res = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mode: 'UPLOAD_PHOTO',
              userNo,
              fileName: file.name,
              fileBase64: base64Data,
              fileSize: file.size,
              sortOrd: nextSortOrd,
            }),
          });
          const result = await res.json();
          if (result.success && result.photo?.photoUrl) {
            savedPhotoUrl = result.photo.photoUrl;
          }
        } catch {
          // 오프라인 / 정적 프리뷰 환경에서는 Base64 유지
        }

        const newItem: SitePhotoItem = {
          id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          photoUrl: savedPhotoUrl,
          fileName: file.name,
          fileSize: file.size,
          sortOrd: nextSortOrd,
          category: '현장 실사 사진',
          isPrimary: photoList.length === 0,
        };

        setPhotoList((prev) => {
          const updated = [...prev, newItem];
          return updated.map((item, idx) => ({
            ...item,
            sortOrd: idx + 1,
            isPrimary: idx === 0,
          }));
        });
      } catch (err) {
        console.error('File read error:', err);
      }
    }

    setIsUploading(false);
    showToast('새 현장 사진이 성공적으로 등록되었습니다.');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  // 사진 단건 삭제
  const handleRemovePhoto = async (id: string, photoUrl: string) => {
    // 백엔드 삭제 호출
    try {
      fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'DELETE_PHOTO',
          userNo,
          photoUrl,
        }),
      }).catch(() => {});
    } catch {}

    setPhotoList((prev) => {
      const filtered = prev.filter((p) => p.id !== id);
      return filtered.map((item, idx) => ({
        ...item,
        sortOrd: idx + 1,
        isPrimary: idx === 0,
      }));
    });
    showToast('사진이 삭제되었습니다.');
  };

  // 전체 삭제
  const handleClearAll = () => {
    if (photoList.length === 0) return;
    if (confirm('등록된 모든 현장 사진을 삭제하시겠습니까?')) {
      setPhotoList([]);
      showToast('모든 사진이 삭제되었습니다.');
    }
  };

  // 최종 완료 및 부모 전달
  const handleApply = () => {
    if (onSavePhotos) {
      onSavePhotos(photoList);
    }
    if (onClose) {
      onClose();
    }
  };

  // 용량 합계 계산 (MB)
  const totalSizeBytes = photoList.reduce((acc, cur) => acc + (cur.fileSize || 0), 0);
  const totalSizeMb = (totalSizeBytes / (1024 * 1024)).toFixed(1);

  if (!isOpen) return null;

  return (
    <div
      id="photoModalBackdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#00254a]/40 backdrop-blur-md transition-opacity duration-300 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      {/* 토스트 피드백 */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl bg-[#00254a] text-white text-[13px] font-bold shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-[18px] text-[#82f5c1]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 모달 윈도우 컨테이너 (너비 620px 기준 데스크톱/모바일 표준 카드) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modalTitle"
        className="w-full max-w-[620px] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all duration-300 animate-in fade-in zoom-in-95 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =====================================================================
            1. Modal Header
           ===================================================================== */}
        <div className="px-6 pt-6 pb-4 bg-white border-b border-[#eff4ff]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#dce9ff] flex items-center justify-center text-[#163b66]">
                <span className="material-symbols-outlined text-[20px]">add_photo_alternate</span>
              </div>
              <h2 id="modalTitle" className="text-[20px] font-bold text-[#00254a] tracking-tight">
                현장 사진 첨부
              </h2>
              <span
                id="photoCountBadge"
                className="px-2.5 py-0.5 rounded-full bg-[#82f5c1]/40 text-[#00714e] text-[11px] font-bold"
              >
                {photoList.length} / 5 등록됨
              </span>
            </div>
            <button
              type="button"
              aria-label="모달 닫기"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#eff4ff] flex items-center justify-center text-[#737780] hover:text-[#00254a] hover:bg-[#dce9ff] transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <p className="text-[13px] text-[#43474f] leading-relaxed">
            오염 부위, 계단 난간, 가전 기종 및 라벨 사진을 등록하시면 마스터 파트너의 정확한 견적 산출과 불필요한 현장 추가금 방지에 큰 도움이 됩니다.
          </p>
        </div>

        {/* =====================================================================
            2. Modal Body Content (스크롤 지원)
           ===================================================================== */}
        <div className="px-6 py-4 space-y-4 overflow-y-auto max-h-[calc(88vh-140px)]">
          {/* 슬롯 헤더 */}
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold text-[#00254a]">등록 슬롯 구성</span>
            <span className="text-[11px] text-[#737780]">최대 5장 업로드 가능</span>
          </div>

          {/* 5 슬롯 그리드 (Desktop 3x2: 상단 3개, 하단 2개 + 6번째 보증 타일) */}
          <div className="grid grid-cols-3 gap-2.5" id="photoSlotGrid">
            {/* 1) 등록된 사진 슬롯들 */}
            {photoList.map((photo) => (
              <div
                key={photo.id}
                className="group relative rounded-xl bg-[#eff4ff] overflow-hidden aspect-[4/3] flex flex-col justify-end p-2.5 transition-all hover:shadow-md border border-[#e5eeff]"
              >
                {/* 배경 이미지 */}
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                  style={{ backgroundImage: `url('${photo.photoUrl}')` }}
                />
                {/* 그라디언트 딤 오버레이 */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#00254a]/90 via-[#00254a]/20 to-transparent" />

                {/* 상단 뱃지 및 삭제 버튼 */}
                <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                  {photo.isPrimary ? (
                    <span className="px-1.5 py-0.5 rounded bg-[#006c4a] text-white text-[10px] font-bold tracking-wide shadow-sm flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px]">star</span>
                      대표 사진
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-black/40 text-white text-[10px] font-medium backdrop-blur-xs">
                      #{photo.sortOrd}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`${photo.fileName} 삭제`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePhoto(photo.id, photo.photoUrl);
                    }}
                    className="w-6 h-6 rounded-full bg-white/90 backdrop-blur-sm text-[#ba1a1a] hover:bg-[#ba1a1a] hover:text-white flex items-center justify-center transition-all shadow-sm cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">close</span>
                  </button>
                </div>

                {/* 하단 파일 정보 라벨 */}
                <div className="relative z-10 text-white">
                  <p className="text-[11px] font-bold truncate leading-tight">{photo.fileName}</p>
                  <div className="flex items-center justify-between text-[10px] text-[#d3e4fe] mt-0.5">
                    <span className="truncate">{photo.category || '현장 실사'}</span>
                    <span className="shrink-0 font-mono ml-1">
                      {photo.fileSize ? `${(photo.fileSize / (1024 * 1024)).toFixed(1)}MB` : '2.1MB'}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* 2) 사진 추가 드롭존 트리거 (5장 미만일 때 노출) */}
            {photoList.length < 5 && (
              <label
                htmlFor="photoFileInput"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
                }}
                className={`cursor-pointer group relative rounded-xl border-2 border-dashed ${
                  dragOver
                    ? 'border-[#006c4a] bg-[#82f5c1]/20'
                    : 'border-[#c3c6d0] bg-[#eff4ff]/70 hover:bg-[#eff4ff] hover:border-[#163b66]'
                } transition-all duration-200 aspect-[4/3] flex flex-col items-center justify-center p-3 text-center`}
              >
                <input
                  ref={fileInputRef}
                  id="photoFileInput"
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <div className="w-10 h-10 rounded-full bg-[#d3e4fe] text-[#00254a] flex items-center justify-center mb-1 group-hover:scale-110 group-hover:bg-[#00254a] group-hover:text-white transition-all duration-200 shadow-sm">
                  {isUploading ? (
                    <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-[22px]">add_a_photo</span>
                  )}
                </div>
                <span className="text-[13px] font-bold text-[#00254a] group-hover:text-[#163b66]">
                  + 사진 추가
                </span>
                <span className="text-[10px] text-[#737780] mt-0.5 leading-tight">클릭 또는 파일 끌어놓기</span>
                <div className="mt-1 px-1.5 py-0.5 rounded bg-white text-[9px] text-[#43474f] font-medium border border-[#e5eeff]">
                  최대 10MB
                </div>
              </label>
            )}

            {/* 3) 빈 슬롯 플레이스홀더 (5개 슬롯 중 비어있는 칸) */}
            {Array.from({ length: Math.max(0, 4 - photoList.length) }).map((_, emptyIdx) => {
              const slotNumber = photoList.length + 2 + emptyIdx;
              return (
                <div
                  key={`empty-slot-${emptyIdx}`}
                  className="rounded-xl bg-[#eff4ff]/40 border border-dashed border-[#e5eeff] aspect-[4/3] flex flex-col items-center justify-center p-3 text-center select-none"
                >
                  <div className="w-7 h-7 rounded-full bg-[#dce9ff]/60 text-[#737780] flex items-center justify-center mb-1">
                    <span className="material-symbols-outlined text-[16px]">crop_original</span>
                  </div>
                  <span className="text-[11px] text-[#737780] font-semibold">슬롯 0{slotNumber}</span>
                  <span className="text-[9px] text-[#737780]/80">대기 중</span>
                </div>
              );
            })}

            {/* 4) 장식용 안심 보증 타일 (3x2 그리드의 6번째 셀을 완성) */}
            <div className="rounded-xl bg-[#163b66]/10 border border-[#163b66]/15 p-3 flex flex-col justify-between aspect-[4/3]">
              <div className="flex items-center gap-1 text-[#00254a]">
                <span className="material-symbols-outlined text-[16px] text-[#006c4a]">verified_user</span>
                <span className="text-[11px] font-bold text-[#00254a]">100% 안심 보장</span>
              </div>
              <p className="text-[10px] text-[#43474f] leading-snug">
                사진 촬영 등록 시 불필요한 현장 추가 비용 발생율이 94% 감소합니다.
              </p>
              <div className="flex items-center gap-1 text-[9px] font-bold text-[#006c4a]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006c4a] animate-pulse" />
                <span>현장 정찰제 매칭 기준</span>
              </div>
            </div>
          </div>

          {/* 사진 촬영 팁 및 가이드 카드 */}
          <div className="rounded-xl bg-[#eff4ff] p-3.5 space-y-1.5 border border-[#dce9ff]">
            <div className="flex items-center gap-1.5 text-[#00254a] text-[13px] font-bold">
              <span className="material-symbols-outlined text-[#e49200] text-[18px]">lightbulb</span>
              <span>견적 정확도를 높이는 사진 촬영 가이드</span>
            </div>
            <p className="text-[11px] text-[#43474f]">
              오염 부위, 계단 난간, 가전 상태 사진을 등록하시면 전문 파트너가 정확한 시공 계획을 수립할 수 있습니다.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5 pt-1">
              <div className="p-2 rounded-lg bg-white flex items-start gap-1.5 shadow-2xs">
                <span className="material-symbols-outlined text-[#00254a] text-[16px] mt-0.5">stairs</span>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#00254a]">계단 / 복도</span>
                  <span className="text-[10px] text-[#737780] leading-tight">1층 입구부터 최상층까지 바닥재와 난간</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white flex items-start gap-1.5 shadow-2xs">
                <span className="material-symbols-outlined text-[#00254a] text-[16px] mt-0.5">mode_fan</span>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#00254a]">가전 제품</span>
                  <span className="text-[10px] text-[#737780] leading-tight">제조사 스티커 모델명 및 냉각팬 상태</span>
                </div>
              </div>
              <div className="p-2 rounded-lg bg-white flex items-start gap-1.5 shadow-2xs">
                <span className="material-symbols-outlined text-[#ba1a1a] text-[16px] mt-0.5">warning</span>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#00254a]">특이 사항</span>
                  <span className="text-[10px] text-[#737780] leading-tight">파손 위험 요소, 고장 부위, 특수 오염</span>
                </div>
              </div>
            </div>
          </div>

          {/* 업로드 상태 바 */}
          <div className="px-1 flex items-center justify-between text-[#43474f] text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#006c4a] text-[16px]">task_alt</span>
              <span className="font-bold text-[#00254a]" id="statusText">
                총 {photoList.length}개 파일 등록 완료
              </span>
              <span className="text-[#737780]" id="capacityText">
                ({totalSizeMb}MB / 최대 50MB)
              </span>
            </div>
            <span className="text-[10px] text-[#737780]">
              지원 포맷: JPG, PNG, WEBP, HEIC (파일당 10MB)
            </span>
          </div>
        </div>

        {/* =====================================================================
            3. Modal Footer (하단 액션 버튼)
           ===================================================================== */}
        <div className="p-5 bg-white border-t border-[#eff4ff] flex items-center justify-between">
          <button
            type="button"
            onClick={handleClearAll}
            disabled={photoList.length === 0}
            className="px-3.5 py-2.5 rounded-xl text-[#737780] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/40 text-[13px] font-bold transition-colors flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
            <span>전체 삭제</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#43474f] text-[13px] font-bold transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              id="submitPhotosBtn"
              onClick={handleApply}
              className="h-11 px-6 rounded-xl bg-[#00254a] hover:bg-[#163b66] text-white text-[14px] font-bold flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all active:scale-[0.98] cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px] text-[#82f5c1]">check_circle</span>
              <span id="submitBtnText">사진 첨부 완료 ({photoList.length}장)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserReq04Modal;
