import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useReactToPrint } from 'react-to-print';
import PdfComponent from './PdfComponent';
import { MeetingProvider, useMeeting } from './MeetingContext';
import { Header, Footer } from './Layout';
import { SlideCover, SlideAwal, SlideScorecard, SlideRock, SlideHeadlines, SlideTodoList, SlideIdsIdentify, SlideIdsSolve, SlideAkhir } from './Slides';
import { SlideIdsDiscuss } from './slides/IdsDiscuss';
import { getExportableThemeCount, getThemes } from './idsModel';
import { UIProvider, SlideOverview, useToast } from './ui';
import {
  captureSlideForExport,
  paginateSlide,
  renderSlidePage,
  savePagesAsPdf,
  waitForExportLayout,
} from './exportSlides';

import './App.css';

const SLIDES_CONFIG = [
  { type: 'cover', label: 'Cover Rapat', group: 'Pembuka' },
  { type: 'awal', label: 'Segmen Awal', group: 'Pembuka' },
  { type: 'scorecard', key: 'dmlKPI', title: 'Digital Marketing Lead', label: 'Scorecard · Digital Marketing Lead', group: 'Scorecard' },
  { type: 'scorecard', key: 'smKPI', title: 'Social Media', label: 'Scorecard · Social Media', group: 'Scorecard' },
  { type: 'scorecard', key: 'msKPI', title: 'Marketplace Specialist', label: 'Scorecard · Marketplace Specialist', group: 'Scorecard' },
  { type: 'scorecard', key: 'khlKPI', title: 'Koordinator Host Live', label: 'Scorecard · Koordinator Host Live', group: 'Scorecard' },
  { type: 'scorecard', key: 'pmKPI', title: 'Performace Marketing', label: 'Scorecard · Performace Marketing', group: 'Scorecard' },
  { type: 'scorecard', key: 'asKPI', title: 'Affiliate Specialist', label: 'Scorecard · Affiliate Specialist', group: 'Scorecard'},
  { type: 'scorecard', key: 'mcpKPI', title: 'Marketing Campaign Program', label: 'Scorecard · Marketing Campaign Program', group: 'Scorecard'},
  { type: 'rock', label: 'Rock Review', group: 'Review' },
  { type: 'headlines', label: 'Headlines', group: 'Review' },
  { type: 'todo', label: 'To-Do List', group: 'Review' },
  { type: 'ids-identify', label: 'IDS · Identify & Vote', group: 'IDS' },
  { type: 'ids-discuss', label: 'IDS · Discuss Matrix', group: 'IDS' },
  { type: 'ids-solve', label: 'IDS · Solve', group: 'IDS' },
  { type: 'akhir', label: 'Segmen Akhir', group: 'Penutup' },
];

// Navigasi cepat dari hasil voting ke slide Discuss tanpa mengunci nomor slide.
const IDS_DISCUSS_INDEX = Math.max(
  0,
  SLIDES_CONFIG.findIndex((item) => item.type === 'ids-discuss'),
);

const AppContent = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [exportThemeIndex, setExportThemeIndex] = useState(undefined);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);

  const { data } = useMeeting();
  const toast = useToast();
  const componentRef = useRef();

  const slidesConfig = SLIDES_CONFIG;
  const TOTAL_SLIDES = slidesConfig.length;
  const currentSlideLabel = slidesConfig[currentSlide]?.label || '';

  const goToSlide = useCallback((index) => {
    setCurrentSlide((current) => {
      const next = typeof index === 'function' ? index(current) : index;
      return Math.max(0, Math.min(next, SLIDES_CONFIG.length - 1));
    });
  }, []);

  // Setelah hasil voting diterapkan, langsung buka slide Discuss dari bagian atas.
  const handleVotingComplete = useCallback(() => {
    goToSlide(IDS_DISCUSS_INDEX);
    window.scrollTo(0, 0);
  }, [goToSlide]);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `L10-Meeting-${data.meetingDate}`,
  });

  const handleOpenPrint = useCallback(() => {
    setIsOverviewOpen(false);
    handlePrint();
  }, [handlePrint]);

  // Keyboard navigation: ArrowLeft/ArrowRight, Home/End, Escape.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isExportingImage) return;
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;

      const target = event.target;
      const tagName = target?.tagName;
      const isEditable =
        target?.isContentEditable ||
        tagName === 'INPUT' ||
        tagName === 'TEXTAREA' ||
        tagName === 'SELECT' ||
        Boolean(target?.closest?.('[role="tablist"]'));
      if (isEditable) return;

      if (event.key === 'Escape') {
        setIsOverviewOpen(false);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToSlide((current) => Math.min(current + 1, TOTAL_SLIDES - 1));
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToSlide((current) => Math.max(current - 1, 0));
      } else if (event.key === 'Home') {
        event.preventDefault();
        goToSlide(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        goToSlide(TOTAL_SLIDES - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToSlide, isExportingImage, TOTAL_SLIDES]);

// 2. Fungsi Download Slide menjadi PDF presentasi rapi (A4 landscape)
  const handleDownloadImage = async () => {
    if (isExportingImage) return;

    setIsOverviewOpen(false);
    setIsExportingImage(true);
    setExportProgress({ current: 0, total: 0 });
    window.scrollTo(0, 0);

    // Kunci viewport virtual ke 1280px selama ekspor. Tanpa ini, browser mobile
    // akan memperbesar layout/font (font boosting) karena konten lebih lebar
    // dari layar, sehingga hasil ekspor berbeda dari desktop.
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    const previousViewport = viewportMeta?.getAttribute('content') ?? null;
    viewportMeta?.setAttribute('content', 'width=1280');
    document.body.classList.add('exporting-image');

    const pageRecords = [];
    const discussSlideCount = slidesConfig.filter((item) => item.type === 'ids-discuss').length;
    const themeCount =
      discussSlideCount > 0 ? getExportableThemeCount(getThemes(data)) : 0;
    const totalCaptures =
      TOTAL_SLIDES - discussSlideCount + discussSlideCount * themeCount;

    setExportProgress({ current: 0, total: totalCaptures });

    const captureActiveSlide = async (label, accent) => {
      // Tunggu React selesai merender slide & tema yang diminta.
      await waitForExportLayout();

      const root = document.getElementById('pdf-content');
      if (!root) throw new Error('Area slide tidak ditemukan.');

      const captured = await captureSlideForExport(root);
      const pages = paginateSlide(captured);

      pages.forEach((page, index) => {
        pageRecords.push({
          dataUrl: renderSlidePage(captured.canvas, captured.metrics, page, {
            title: captured.metrics.title,
            kicker: captured.metrics.kicker,
            label,
            accent,
            pageIndex: index + 1,
            totalPages: pages.length,
          }),
        });
      });

      setExportProgress((previous) => ({
        ...previous,
        current: Math.min(previous.total, previous.current + 1),
      }));
    };

    try {
      for (let i = 0; i < TOTAL_SLIDES; i++) {
        const config = slidesConfig[i];
        setExportThemeIndex(undefined);
        setCurrentSlide(i);

        if (config.type === 'ids-discuss') {
          for (let themeIndex = 0; themeIndex < themeCount; themeIndex++) {
            setExportThemeIndex(themeIndex);
            await captureActiveSlide(
              `${config.label} · Tema ${themeIndex + 1}`,
              '#8b5cf6',
            );
          }
          setExportThemeIndex(undefined);
        } else {
          await captureActiveSlide(
            config.label,
            config.group === 'IDS' ? '#8b5cf6' : '#2563eb',
          );
        }
      }

      if (pageRecords.length === 0) {
        throw new Error('Tidak ada halaman slide yang bisa diekspor.');
      }

      savePagesAsPdf(pageRecords, {
        meetingDate: data.meetingDate,
        filename: `L10-Meeting-Slides-${data.meetingDate || 'tanpa-tanggal'}.pdf`,
      });

      toast(`PDF slide siap diunduh (${pageRecords.length} halaman).`, { tone: 'success' });
    } catch (error) {
      console.error('Gagal mengunduh PDF Slide:', error);
      toast('Terjadi kesalahan saat mengekspor slide ke PDF.', { tone: 'danger' });
    } finally {
      if (viewportMeta) {
        if (previousViewport === null) viewportMeta.removeAttribute('content');
        else viewportMeta.setAttribute('content', previousViewport);
      }
      document.body.classList.remove('exporting-image');
      setCurrentSlide(0);
      setExportThemeIndex(undefined);
      setIsExportingImage(false);
      setExportProgress({ current: 0, total: 0 });
    }
  };

  return (
    <>
      <SlideOverview
        open={isOverviewOpen}
        slides={slidesConfig}
        currentSlide={currentSlide}
        onSelect={(index) => {
          setCurrentSlide(index);
          setIsOverviewOpen(false);
        }}
        onClose={() => setIsOverviewOpen(false)}
      />

      <div
        className="sr-only"
        role="status"
        aria-live="polite"
        data-html2canvas-ignore="true"
      >
        Slide {currentSlide + 1} dari {TOTAL_SLIDES}: {currentSlideLabel}
      </div>

      <main id="pdf-content" className="flex flex-col min-h-screen max-w-7xl mx-auto p-4 md:p-8">
        {/* File cetak PDF berjalan di background */}
        <div className="visually-hidden" data-html2canvas-ignore="true">
          <PdfComponent ref={componentRef} data={data} />
        </div>
        
        <Header />
        
        {/* Renderer Slide */}
        {slidesConfig.map((config, index) => {
          // Slide dianggap "aktif" jika sedang dibuka, ATAU jika sistem sedang proses export gambar
          const isActive = currentSlide === index;

          switch (config.type) {
            case 'cover': return <SlideCover key={index} isActive={isActive} />;
            case 'awal': return <SlideAwal key={index} isActive={isActive} />;
            case 'scorecard': return <SlideScorecard key={index} isActive={isActive} kpiCategory={config.key} title={config.title} />;
            case 'rock': return <SlideRock key={index} isActive={isActive} />;
            case 'headlines': return <SlideHeadlines key={index} isActive={isActive} />;
            case 'todo': return <SlideTodoList key={index} isActive={isActive} />;
            case 'ids-identify': return <SlideIdsIdentify key={index} isActive={isActive} exportMode={isExportingImage} onVotingComplete={handleVotingComplete} />;
            case 'ids-discuss': return <SlideIdsDiscuss key={index} isActive={isActive} exportThemeIndex={exportThemeIndex} />;          
            case 'ids-solve': return <SlideIdsSolve key={index} isActive={isActive} />;
            case 'akhir': return <SlideAkhir key={index} isActive={isActive} />;
            default: return null;
          }
        })}
        
        <Footer 
          currentSlide={currentSlide} 
          totalSlides={TOTAL_SLIDES}
          currentLabel={currentSlideLabel}
          nextSlide={() => setCurrentSlide(s => Math.min(s + 1, TOTAL_SLIDES - 1))}
          prevSlide={() => setCurrentSlide(s => Math.max(s - 1, 0))}
          onOpenOverview={() => setIsOverviewOpen(true)}
          handlePrint={handleOpenPrint}
          handleDownloadImage={handleDownloadImage}
          isExporting={isExportingImage}
          exportProgress={exportProgress}
        />
      </main>
    </>
  );
};

export default function App() {
  return (
    <MeetingProvider>
      <UIProvider>
        <AppContent />
      </UIProvider>
    </MeetingProvider>
  );
}
