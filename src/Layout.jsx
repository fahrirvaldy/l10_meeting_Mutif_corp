import React, { useState, useEffect } from 'react';
import { useMeeting } from './MeetingContext';

export const Header = () => {
  const [timeLeft, setTimeLeft] = useState(90 * 60);
  const [isPaused, setIsPaused] = useState(true);

  useEffect(() => {
    let interval;
    if (!isPaused && timeLeft > 0) interval = setInterval(() => setTimeLeft(p => p - 1), 1000);
    else if (timeLeft === 0) setIsPaused(true);
    return () => clearInterval(interval);
  }, [isPaused, timeLeft]);

  const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <header data-html2canvas-ignore="true" className="sticky top-0 z-40 flex flex-col md:flex-row items-center justify-between gap-6 mb-8 pb-4 border-b bg-white/90 backdrop-blur-md md:-mx-8 md:px-8 md:-mt-8 md:pt-8">
      <div>
        <h1 className="m-0 text-3xl font-bold text-slate-800 md:text-5xl">L10 MEETING</h1>
        <p className="m-0 text-lg font-semibold text-aksana-accent md:text-xl">MUTIF CORP</p>
      </div>
      <div className="flex items-center gap-4 border px-6 py-3 rounded-2xl border-slate-200 bg-white shadow-sm">
        <div className="text-2xl font-mono font-bold text-aksana-accent">{formatTime(timeLeft)}</div>
        <div className="flex items-center gap-3 border-l pl-4">
          <button onClick={() => setIsPaused(!isPaused)} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-aksana-primary">
            <i className={`fa-solid ${isPaused ? 'fa-play' : 'fa-pause'}`}></i>
          </button>
          <button onClick={() => { setIsPaused(true); setTimeLeft(90 * 60); }} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200">
             <i className="fa-solid fa-rotate-right"></i>
          </button>
        </div>
      </div>
    </header>
  );
};

export const Footer = ({ currentSlide, nextSlide, prevSlide, totalSlides, handlePrint, handleDownloadImage }) => {
  const { cloudStatus, cloudMsg } = useMeeting();
  
  return (
    <footer data-html2canvas-ignore="true" className="sticky bottom-0 z-40 flex flex-col md:flex-row items-center justify-between gap-6 mt-auto pt-4 border-t border-slate-200 bg-white/90 backdrop-blur-md md:-mx-8 md:px-8 md:-mb-8 md:pb-8">
      
      <div className="flex justify-center md:justify-start w-full md:w-auto gap-3">
        {/* Tombol PDF Report */}
        <button 
          onClick={handlePrint} 
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-slate-800 shadow-md transition-all active:scale-95 hover:bg-slate-700"
        >
          <i className="fa-solid fa-file-pdf"></i> PDF Report
        </button>

        {/* Tombol Download Image */}
        <button 
          onClick={handleDownloadImage} 
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-slate-700 bg-white border border-slate-200 shadow-sm transition-all active:scale-95 hover:bg-slate-50">
          <i className="fa-solid fa-image text-aksana-accent"></i> Download Slide
        </button>
      </div>

      {/* Indikator Cloud Status */}
      <div className={`flex items-center justify-center gap-3 px-6 py-2 rounded-full border text-sm font-bold shadow-sm transition-all duration-300 ${
          cloudStatus === 'saving' ? 'bg-blue-50 border-blue-200 text-blue-600 animate-pulse scale-105' : 
          cloudStatus === 'error' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-white border-slate-100 text-aksana-primary'
      }`}>
        <i className={`fa-solid ${cloudStatus === 'saving' ? 'fa-spinner fa-spin' : 'fa-cloud'}`}></i>
        <span>{cloudMsg}</span>
      </div>

      {/* Navigasi Slide */}
      <div className="flex justify-center md:justify-end w-full md:w-auto gap-4">
        <button onClick={prevSlide} className="flex items-center justify-center w-14 h-14 rounded-full text-white bg-aksana-primary shadow-lg transition-all active:scale-90 hover:bg-aksana-primary/80">
          <i className="fa-solid fa-chevron-left text-xl"></i>
        </button>
        <div className="flex items-center justify-center px-4 border rounded-xl font-bold text-slate-400 bg-slate-50">
          <span>{currentSlide + 1} / {totalSlides}</span>          
        </div>
        <button onClick={nextSlide} className="flex items-center justify-center w-14 h-14 rounded-full text-white bg-aksana-primary shadow-lg transition-all active:scale-90 hover:bg-aksana-primary/80">
          <i className="fa-solid fa-chevron-right text-xl"></i>
        </button>
      </div>
      
    </footer>
  );
};
