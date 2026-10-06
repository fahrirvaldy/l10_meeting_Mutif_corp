import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import PdfComponent from './PdfComponent';
import { MeetingProvider, useMeeting } from './MeetingContext';
import { Header, Footer } from './Layout';
import { SlideCover, SlideAwal, SlideScorecard, SlideRock, SlideHeadlines, SlideTodoList, SlideIdsIdentify, SlideIdsDiscuss, SlideIdsSolve, SlideAkhir } from './Slides';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import './App.css';

const AppContent = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [exportThemeIndex, setExportThemeIndex] = useState(undefined);

  const { data } = useMeeting();
  const componentRef = useRef();

const slidesConfig = [
    { type: 'cover' },
    { type: 'awal' },
    { type: 'scorecard', key: 'dmlKPI', title: ' Digital Marketing Lead' },
    { type: 'scorecard', key: 'smKPI', title: 'Social Media'},
    { type: 'scorecard', key: 'msKPI', title: 'Marketplace Specialist'},
    { type: 'scorecard', key: 'khlKPI', title: 'Koordinator Host Live' },
    { type: 'scorecard', key: 'pmKPI', title: 'Performance Marketing'},
    { type: 'scorecard', key: 'asKPI', title: 'Affiliate Specialist' },
    { type: 'scorecard', key: 'mcpKPI', title: 'Marketing Campaign Program'},
    { type: 'rock' },
    { type: 'headlines' },
    { type: 'todo' },
    { type: 'ids-identify' },
    { type: 'ids-discuss' },
    { type: 'ids-solve' },
    { type: 'akhir' }
  ];

  const TOTAL_SLIDES = slidesConfig.length;

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `L10-Meeting-${data.meetingDate}`,
  });

// 2. Fungsi Download Image (Menangkap Slide Aktif)
  const handleDownloadImage = async () => {
    setIsExportingImage(true);
    document.body.classList.add('exporting-image');

    window.scrollTo(0, 0);

    const zip = new JSZip();
    const slideFolder = zip.folder(`L10-Slides-${data.meetingDate}`);

    try {
      for (let i = 0; i < TOTAL_SLIDES; i++) {
        setCurrentSlide(i);
        const configName = slidesConfig[i].type;
        
        if (configName === 'ids-discuss') {
          for (let t = 0; t < 3; t++) {
            setExportThemeIndex(t); 
            await new Promise(resolve => setTimeout(resolve, 800)); 
            
            const element = document.getElementById('pdf-content');
            if (!element) continue;
            
            const canvas = await html2canvas(element, {
              scale: 2, 
              useCORS: true,
              backgroundColor: '#f8fafc',
              ignoreElements: (node) => node.hasAttribute('data-html2canvas-ignore'),
              scrollY: 0, 
              x: 0,
              y: 0,
              windowHeight: element.scrollHeight + 150, // <-- KUNCI UTAMA DIKEMBALIKAN
              height: element.scrollHeight + 150        // <-- KUNCI UTAMA DIKEMBALIKAN
            });

            const imgData = canvas.toDataURL('image/png').replace(/^data:image\/(png|jpg);base64,/, "");
            const slideName = `Slide-${(i + 1).toString().padStart(2, '0')}-${configName}-Tema-${t + 1}.png`;
            slideFolder.file(slideName, imgData, { base64: true });
          }
          setExportThemeIndex(undefined); 
          
        } else {
          await new Promise(resolve => setTimeout(resolve, 800)); 

          const element = document.getElementById('pdf-content');
          if (!element) continue;

          const canvas = await html2canvas(element, {
            scale: 4, 
            useCORS: true,
            backgroundColor: '#f8fafc',
            ignoreElements: (node) => node.hasAttribute('data-html2canvas-ignore'),
            scrollY: 0, 
            x: 0,
            y: 0,
            windowHeight: element.scrollHeight + 150, // <-- KUNCI UTAMA DIKEMBALIKAN
            height: element.scrollHeight + 150        // <-- KUNCI UTAMA DIKEMBALIKAN
          });

          const imgData = canvas.toDataURL('image/png').replace(/^data:image\/(png|jpg);base64,/, "");
          const slideName = `Slide-${(i + 1).toString().padStart(2, '0')}-${configName}.png`;
          slideFolder.file(slideName, imgData, { base64: true });
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `L10-Meeting-Slides-${data.meetingDate}.zip`);
      
    } catch (error) {
      console.error('Gagal mengunduh gambar:', error);
      alert('Terjadi kesalahan saat mengekspor gambar ke ZIP.');
    } finally {
      document.body.classList.remove('exporting-image');
      setCurrentSlide(0); 
      setExportThemeIndex(undefined);
      setIsExportingImage(false);
    }
  };
  return (
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
          case 'ids-identify': return <SlideIdsIdentify key={index} isActive={isActive} />;
          case 'ids-discuss': return <SlideIdsDiscuss key={index} isActive={isActive} exportThemeIndex={exportThemeIndex} />;          
          case 'ids-solve': return <SlideIdsSolve key={index} isActive={isActive} />;
          case 'akhir': return <SlideAkhir key={index} isActive={isActive} />;
          default: return null;
        }
      })}
      
      <Footer 
        currentSlide={currentSlide} 
        totalSlides={TOTAL_SLIDES}
        nextSlide={() => setCurrentSlide(s => Math.min(s + 1, TOTAL_SLIDES - 1))}
        prevSlide={() => setCurrentSlide(s => Math.max(s - 1, 0))}
        handlePrint={handlePrint}
        handleDownloadImage={handleDownloadImage}
      />
    </main>
  );
};

export default function App() {
  return (
    <MeetingProvider>
      <AppContent />
    </MeetingProvider>
  );
}
