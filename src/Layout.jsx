import React, { useState, useEffect } from 'react';
import { useMeeting } from './MeetingContext';
import { Button, cx, useConfirm, useToast } from './ui';

const MEETING_DURATION = 90 * 60;
const WARNING_THRESHOLD = 10 * 60;
const DANGER_THRESHOLD = 5 * 60;

export const Header = () => {
  const [timeLeft, setTimeLeft] = useState(MEETING_DURATION);
  const [isPaused, setIsPaused] = useState(true);

  useEffect(() => {
    if (isPaused || timeLeft === 0) return undefined;

    const interval = setInterval(() => setTimeLeft((previous) => previous - 1), 1000);
    return () => clearInterval(interval);
  }, [isPaused, timeLeft]);

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const isDanger = timeLeft <= DANGER_THRESHOLD;
  const isWarning = !isDanger && timeLeft <= WARNING_THRESHOLD;
  const timerState = isDanger ? 'danger' : isWarning ? 'warning' : 'normal';
  const timerLabel = isDanger ? 'Waktu hampir habis' : isWarning ? 'Segera selesai' : 'Sisa waktu';
  const progressPercent = (timeLeft / MEETING_DURATION) * 100;
  const isRunning = !isPaused && timeLeft > 0;

  // Diumumkan hanya pada ambang penting agar screen reader tidak bicara tiap detik.
  const announcement =
    timeLeft === 0
      ? 'Waktu rapat habis. Saatnya menutup sesi.'
      : timeLeft === DANGER_THRESHOLD
        ? 'Sisa waktu 5 menit.'
        : timeLeft === WARNING_THRESHOLD
          ? 'Sisa waktu 10 menit.'
          : '';

  return (
    <header
      data-html2canvas-ignore="true"
      className="sticky top-0 z-40 -mx-4 -mt-4 mb-4 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-md md:-mx-8 md:-mt-8 md:mb-6 md:gap-6 md:px-8 md:py-4"
    >
      <div className="min-w-0">
        <div className="hidden text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400 sm:block">
          Level 10 Meeting
        </div>
        <h1 className="m-0 truncate text-xl font-extrabold uppercase leading-tight tracking-tight text-aksana-primary md:text-3xl">
          L10 Meeting
        </h1>
        <p className="m-0 hidden truncate text-[10px] font-extrabold uppercase tracking-[0.2em] text-aksana-accent sm:block md:text-xs">
          MUTIF CORP
        </p>
      </div>

      <div
        className={cx(
          'timer-card flex shrink-0 items-center gap-2 px-2.5 py-2 md:gap-4 md:px-4 md:py-3',
          timerState === 'warning' && 'is-warning',
          timerState === 'danger' && 'is-danger',
        )}
      >
        <div className="min-w-0">
          <div
            className={cx(
              'text-[9px] font-extrabold uppercase leading-none tracking-[0.12em] md:text-[10px]',
              isDanger ? 'text-rose-600' : isWarning ? 'text-amber-700' : 'text-slate-400',
            )}
          >
            {timerLabel}
          </div>
          <div
            className="timer-display mt-1 font-mono text-xl font-bold leading-none md:text-3xl"
            role="timer"
            aria-live="off"
            aria-label={`${timerLabel}: ${Math.floor(timeLeft / 60)} menit ${timeLeft % 60} detik`}
          >
            {formatTime(timeLeft)}
          </div>
          <div
            className={cx(
              'timer-progress mt-2 w-24 md:w-40',
              isDanger ? 'text-rose-500' : isWarning ? 'text-amber-500' : 'text-aksana-accent',
            )}
            aria-hidden="true"
          >
            <span style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-1 border-l border-slate-200 pl-2 md:gap-1.5 md:pl-3">
          <button
            type="button"
            onClick={() => {
              if (timeLeft === 0) {
                setTimeLeft(MEETING_DURATION);
                setIsPaused(false);
                return;
              }
              setIsPaused((previous) => !previous);
            }}
            className="icon-btn text-slate-700 hover:bg-slate-100"
            aria-label={isRunning ? 'Jeda timer' : timeLeft === 0 ? 'Mulai ulang timer' : 'Mulai timer'}
            title={isRunning ? 'Jeda timer' : timeLeft === 0 ? 'Mulai ulang timer' : 'Mulai timer'}
          >
            <i className={`fa-solid ${isRunning ? 'fa-pause' : 'fa-play'}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => { setIsPaused(true); setTimeLeft(MEETING_DURATION); }}
            className="icon-btn text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Reset timer ke 90 menit"
            title="Reset timer ke 90 menit"
          >
            <i className="fa-solid fa-rotate-right" aria-hidden="true" />
          </button>
        </div>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </header>
  );
};

export const Footer = ({
  currentSlide,
  nextSlide,
  prevSlide,
  totalSlides,
  currentLabel,
  onOpenOverview,
  handlePrint,
  handleDownloadImage,
  isExporting,
  exportProgress,
}) => {
  const {
    data,
    cloudStatus,
    cloudMsg,
    isToday,
    isReady,
    hasNotulensi,
    resetNotulensi,
    undoResetNotulensi,
  } = useMeeting();
  const confirm = useConfirm();
  const toast = useToast();

  const isFirst = currentSlide === 0;
  const isLast = currentSlide === totalSlides - 1;
  const canResetNotulensi = isToday && isReady && hasNotulensi;
  const resetNotulensiTitle = !isReady
    ? 'Data rapat belum siap'
    : !hasNotulensi
      ? 'Notulensi sudah kosong'
      : 'Hapus notulensi rapat ini';

  const handleResetNotulensi = async () => {
    if (!canResetNotulensi) return;

    const approved = await confirm({
      title: 'Hapus notulensi rapat ini?',
      description: `${data.meetingDate || 'Rapat hari ini'}. Yang dihapus: realisasi & status scorecard, kabar baik, headline, dan seluruh sesi IDS. Nama KPI, target, Rock, To-Do, peserta, dan rating tetap disimpan.`,
      confirmLabel: 'Hapus Notulensi',
      tone: 'danger',
    });

    if (!approved) return;

    const snapshot = resetNotulensi();
    if (!snapshot) {
      toast('Notulensi belum bisa dihapus. Coba lagi setelah data siap.', {
        tone: 'warning',
      });
      return;
    }

    toast('Notulensi berhasil dihapus.', {
      tone: 'success',
      duration: 10000,
      action: {
        label: 'Urungkan',
        onClick: () => {
          const restored = undoResetNotulensi(snapshot);
          toast(
            restored
              ? 'Notulensi dipulihkan.'
              : 'Tidak ada perubahan yang bisa dipulihkan.',
            { tone: restored ? 'success' : 'warning' },
          );
        },
      },
    });
  };

  const exportCount =
    exportProgress && exportProgress.total > 0
      ? `${Math.min(exportProgress.current + 1, exportProgress.total)}/${exportProgress.total}`
      : '';
  const exportLabel = isExporting
    ? exportCount
      ? `Menyiapkan ${exportCount}…`
      : 'Menyiapkan…'
    : 'Download Slide';

  const cloudTone =
    cloudStatus === 'saving'
      ? 'border-blue-200 bg-blue-50 text-blue-700'
      : cloudStatus === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-600'
        : 'border-slate-200 bg-white text-slate-500';

  return (
    <footer
      data-html2canvas-ignore="true"
      className="sticky bottom-0 z-40 -mx-4 mt-auto flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:-mx-8 md:flex-row md:items-center md:justify-between md:gap-4 md:px-8 md:pb-4"
    >
      {/* Aksi: tampil kedua di mobile, pertama di desktop */}
      <div className="order-2 flex items-center gap-2 md:order-1">
        <Button
          variant="primary"
          size="sm"
          onClick={handlePrint}
          disabled={isExporting}
          aria-label="Cetak PDF Report"
        >
          <i className="fa-solid fa-file-pdf" aria-hidden="true" />
          <span className="hidden sm:inline">PDF Report</span>
          <span className="sr-only sm:hidden">PDF Report</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadImage}
          disabled={isExporting}
          aria-label={isExporting ? `Sedang menyiapkan slide ${exportCount}`.trim() : 'Download slide sebagai PDF'}
        >
          <i
            className={`fa-solid ${isExporting ? 'fa-spinner fa-spin' : 'fa-image'} text-aksana-accent`}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">{exportLabel}</span>
          <span className="sr-only sm:hidden">{exportLabel}</span>
        </Button>

        {isToday && (
          <Button
            variant="danger-outline"
            size="sm"
            onClick={handleResetNotulensi}
            disabled={!canResetNotulensi}
            aria-label="Hapus notulensi rapat ini"
            title={resetNotulensiTitle}
          >
            <i className="fa-solid fa-trash-can" aria-hidden="true" />
            <span className="hidden sm:inline">Hapus Notulensi</span>
            <span className="sr-only sm:hidden">Hapus Notulensi</span>
          </Button>
        )}

        <div
          className={cx(
            'ml-auto flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition-colors md:ml-4',
            cloudTone,
          )}
          role="status"
          aria-live="polite"
        >
          <i
            className={`fa-solid ${
              cloudStatus === 'saving'
                ? 'fa-spinner fa-spin'
                : cloudStatus === 'error'
                  ? 'fa-triangle-exclamation'
                  : 'fa-cloud'
            }`}
            aria-hidden="true"
          />
          <span className="hidden sm:inline">{cloudMsg}</span>
          <span className="sr-only sm:hidden">Status penyimpanan: {cloudMsg}</span>
        </div>
      </div>

      {/* Navigasi: tampil pertama di mobile, kedua di desktop */}
      <div className="order-1 flex items-center gap-2 md:order-2">
        <Button
          variant="outline"
          size="icon"
          onClick={prevSlide}
          disabled={isFirst}
          aria-label="Slide sebelumnya"
          aria-keyshortcuts="ArrowLeft"
          title="Slide sebelumnya (←)"
        >
          <i className="fa-solid fa-chevron-left" aria-hidden="true" />
        </Button>

        <button
          type="button"
          onClick={onOpenOverview}
          aria-haspopup="dialog"
          aria-label={`Buka daftar slide. Sekarang slide ${currentSlide + 1} dari ${totalSlides}, ${currentLabel}`}
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition-colors hover:border-slate-300 hover:bg-white md:w-64 md:flex-none"
        >
          <span className="shrink-0 text-xs font-extrabold tabular-nums text-slate-700">
            {currentSlide + 1}/{totalSlides}
          </span>
          <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-500">
            {currentLabel}
          </span>
          <i
            className="fa-solid fa-table-cells-large ml-auto shrink-0 text-slate-400 transition-colors group-hover:text-aksana-accent"
            aria-hidden="true"
          />
        </button>

        <Button
          variant="outline"
          size="icon"
          onClick={nextSlide}
          disabled={isLast}
          aria-label="Slide berikutnya"
          aria-keyshortcuts="ArrowRight"
          title="Slide berikutnya (→)"
        >
          <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        </Button>

        <span className="hidden shrink-0 text-[11px] font-medium text-slate-400 xl:inline">
          ← → navigasi
        </span>
      </div>
    </footer>
  );
};
