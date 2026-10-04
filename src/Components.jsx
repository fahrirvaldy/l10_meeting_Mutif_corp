import React, { useState, useEffect } from 'react';

export const Editable = ({ value, onChange, placeholder, className, style, id }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => { setLocalValue(value); }, [value]);

  const handleBlur = () => {
    if (localValue !== value) onChange(localValue);
  };

  const stringValue = typeof localValue === 'string' ? localValue : '';
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
        className={`print-textarea col-start-1 row-start-1 w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden p-0 m-0 block leading-[1.5] ${className || ''}`}
        style={style}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
      />
      
    </div>
  );
};

export const StatusButton = ({ status, onClick }) => (
  <div className={`status-btn cursor-pointer ${status === 'on' ? 'on' : 'off'}`} onClick={onClick}>
    {status === 'on' ? 'ON TRACK' : 'OFF TRACK'}
  </div>
);

export const JenisButton = ({ jenis, onClick }) => (
  <div className={`jenis-btn cursor-pointer ${jenis}`} onClick={onClick}>
    {jenis === 'lagging' ? 'LAGGING' : jenis === 'leading' ? 'LEADING' : 'KUALITAS'}
  </div>
);

export const OutcomeButton = ({ outcome, onClick }) => (
  <div className={`outcome-btn cursor-pointer ${outcome === 'done' ? 'done' : 'not'}`} onClick={onClick}>
    {outcome === 'done' ? 'TERCAPAI' : 'BELUM'}
  </div>
);

export const cycleJenis = (current) => {
  const options = ['lagging', 'leading', 'kualitas'];
  return options[(options.indexOf(current) + 1) % options.length];
};
