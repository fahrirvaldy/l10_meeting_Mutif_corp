import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { registerPendingEditFlusher } from './pendingEdits';

// Jeda commit draft ke state aplikasi. Cukup pendek agar ketikan cepat aman,
// tetapi tetap menggabungkan beberapa ketukan menjadi satu update.
const EDIT_COMMIT_DELAY = 400;
const normalizeValue = (next) => (typeof next === 'string' ? next : '');

export const Editable = ({
  value,
  onChange,
  placeholder,
  className,
  style,
  id,
  label,
}) => {
  const [localValue, setLocalValue] = useState(() => normalizeValue(value));
  const localValueRef = useRef(localValue);
  const valueRef = useRef(normalizeValue(value));
  const onChangeRef = useRef(onChange);
  const committedRef = useRef(normalizeValue(value));
  // `draftRef` berisi teks yang belum di-commit ke state induk.
  const draftRef = useRef(null);
  const timerRef = useRef(null);

  // Selalu pakai callback terbaru tanpa perlu me-reset timer di setiap render.
  // Layout effect agar flusher saat unload juga memakai closure induk terbaru.
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const commitLocal = useCallback(() => {
    clearTimer();
    const next = normalizeValue(localValueRef.current);

    if (next === committedRef.current) {
      draftRef.current = null;
      return;
    }

    committedRef.current = next;
    draftRef.current = null;
    onChangeRef.current?.(next);
  }, [clearTimer]);

  // Sinkronkan nilai dari server/induk. Draft yang sedang diketik tidak boleh
  // ditimpa snapshot lama; draft selalu menang sampai berhasil di-commit.
  useEffect(() => {
    const nextValue = normalizeValue(value);
    if (nextValue === valueRef.current) return;

    valueRef.current = nextValue;

    if (draftRef.current !== null) {
      // Kalau induk akhirnya menangkap nilai yang sama dengan draft, anggap selesai.
      if (nextValue === localValueRef.current) {
        committedRef.current = nextValue;
        draftRef.current = null;
        clearTimer();
      }
      return;
    }

    committedRef.current = nextValue;
    localValueRef.current = nextValue;
    // Sinkronisasi nilai eksternal (server/induk) ke draft lokal memang butuh
    // setState di effect; ini bukan render berantai karena hanya terjadi saat
    // prop `value` benar-benar berubah.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalValue(nextValue);
  }, [value, clearTimer]);

  // Commit draft saat blur dan saat komponen dilepas (pindah slide).
  const flushDraft = useCallback(() => {
    if (draftRef.current !== null) commitLocal();
  }, [commitLocal]);

  useEffect(() => {
    const unregister = registerPendingEditFlusher(flushDraft);
    return () => {
      flushDraft();
      unregister();
    };
  }, [flushDraft]);

  useEffect(() => clearTimer, [clearTimer]);

  const handleChange = (event) => {
    const next = event.target.value;
    localValueRef.current = next;
    draftRef.current = next;
    setLocalValue(next);

    // Satukan ketukan cepat menjadi satu commit, bukan satu update per huruf.
    clearTimer();
    timerRef.current = setTimeout(commitLocal, EDIT_COMMIT_DELAY);
  };

  const handleBlur = () => {
    flushDraft();
  };

  const stringValue = normalizeValue(localValue);
  const displayValue = stringValue || placeholder || '';

  // KUNCI 1: Tangkap perintah flex-1 dari induk (seperti di baris 5-Why) agar bungkus bisa melebar
  const isFlex1 = className && className.includes('flex-1');

  return (
    // KUNCI 2: Gunakan CSS Grid. Ini membuat Kembaran Gaib dan Textarea saling menumpuk mulus
    <div className={`grid items-start ${isFlex1 ? 'flex-1' : 'w-full'}`}>
      
      {/* KUNCI 3: Kembaran Gaib (Gunakan invisible, BUKAN hidden)
          Karena invisible, ia secara fisik tetap memakan ruang dan mendorong tinggi baris sejak awal */}
      <div 
        className={`print-clone col-start-1 row-start-1 invisible whitespace-pre-wrap break-words border-none p-0 m-0 text-left pointer-events-none ${className || ''}`}
        style={{ ...style, wordBreak: 'break-word' }}
      >
        {displayValue.split('\n').map((line, index) => (
          // Penambahan padding-bottom (pb-[2px]) agar ekor huruf p, g, j, y tidak terpotong
          <div key={index} className="min-h-[1.5em] leading-[1.5] pb-[2px]">{line}</div>
        ))}
      </div>
      
      {/* Textarea Asli */}
      <textarea
        id={id}
        aria-label={label || placeholder || 'Teks dapat diedit'}
        title="Klik untuk mengedit"
        rows={1}
        spellCheck={false}
        className={`print-textarea col-start-1 row-start-1 w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden p-0 m-0 block leading-[1.5] transition-colors ${className || ''}`}
        style={style}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
      />
      
    </div>
  );
};

const STATUS_LABELS = {
  on: 'On Track',
  off: 'Off Track',
};

export const StatusButton = ({ status, onClick }) => {
  const isOn = status === 'on';
  const label = isOn ? STATUS_LABELS.on : STATUS_LABELS.off;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isOn}
      aria-label={`Status ${label}. Aktifkan untuk mengubah.`}
      className={`status-btn ${isOn ? 'on' : 'off'}`}
    >
      <span className="status-dot" aria-hidden="true" />
      <span>{label.toUpperCase()}</span>
    </button>
  );
};

const JENIS_LABELS = {
  lagging: 'Lagging',
  leading: 'Leading',
  kualitas: 'Kualitas',
};

export const JenisButton = ({ jenis, onClick }) => {
  const key = JENIS_LABELS[jenis] ? jenis : 'lagging';
  const label = JENIS_LABELS[key];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Jenis KPI ${label}. Aktifkan untuk mengganti.`}
      className={`jenis-btn ${key}`}
    >
      <span className="status-dot" aria-hidden="true" />
      <span>{label.toUpperCase()}</span>
    </button>
  );
};

export const OutcomeButton = ({ outcome, onClick }) => {
  const isDone = outcome === 'done';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isDone}
      aria-label={`Capaian ${isDone ? 'Tercapai' : 'Belum tercapai'}. Aktifkan untuk mengubah.`}
      className={`outcome-btn ${isDone ? 'done' : 'not'}`}
    >
      <span className="status-dot" aria-hidden="true" />
      <span>{isDone ? 'TERCAPAI' : 'BELUM'}</span>
    </button>
  );
};

export const cycleJenis = (current) => {
  const options = ['lagging', 'leading', 'kualitas'];
  return options[(options.indexOf(current) + 1) % options.length];
};
