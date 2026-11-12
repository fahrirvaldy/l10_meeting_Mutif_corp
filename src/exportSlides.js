import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Ekspor slide menjadi PDF presentasi.
 *
 * Prinsip:
 * - Slide selalu diukur & dirender pada viewport virtual 1280px (16:9), sehingga
 *   hasil ekspor tidak berubah walau aplikasi dibuka di layar kecil.
 * - Halaman PDF memakai A4 landscape. Gambar slide 1280x720 ditempatkan utuh
 *   (tidak dipotong) dengan margin aman.
 * - Konten yang lebih tinggi dari 720px dipecah menjadi halaman lanjutan pada
 *   batas blok (data-export-block), bukan dipotong di tengah elemen.
 */

export const SLIDE_PAGE = {
  width: 1280,
  height: 720,
  // Tinggi area header yang digambar ulang di halaman lanjutan.
  continuationTop: 78,
  paddingX: 48,
};

const A4 = {
  width: 841.89,
  height: 595.28,
  margin: 24,
};

const IMAGE_BOX = {
  x: A4.margin,
  y: (A4.height - ((A4.width - A4.margin * 2) * 9) / 16) / 2,
  width: A4.width - A4.margin * 2,
  height: ((A4.width - A4.margin * 2) * 9) / 16,
};

const FOOTER_Y = A4.height - 20;

const MIN_PAGE_CONTENT = 64;
const SOFT_OVERFLOW = 1.12;
const PAGE_BOTTOM_PADDING = 14;
const MAX_PAGES_PER_SLIDE = 120;
const MAX_CANVAS_AREA = 48_000_000;
const MAX_CANVAS_DIMENSION = 24_000;
const JPEG_QUALITY = 0.98;

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

export const waitForExportLayout = async () => {
  try {
    if (document.fonts?.ready) await document.fonts.ready;
  } catch {
    // Font API tidak selalu tersedia; lanjutkan dengan frame berikutnya.
  }
  await nextFrame();
  await nextFrame();
  // Beri waktu singkat untuk layout/font paint sebelum html2canvas mengkloning DOM.
  await new Promise((resolve) => setTimeout(resolve, 80));
};

const normalizeText = (value) => (value || '').replace(/\s+/g, ' ').trim();

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const measureExportLayout = (root) => {
  const rootRect = root.getBoundingClientRect();
  const slide = root.querySelector('.slide.active');

  if (!slide) {
    return {
      height: Math.max(1, Math.ceil(root.scrollHeight || rootRect.height)),
      blocks: [],
      theads: [],
      title: '',
      kicker: '',
    };
  }

  const slideRect = slide.getBoundingClientRect();
  const height = Math.max(
    1,
    Math.ceil(
      Math.max(
        root.scrollHeight || 0,
        rootRect.height || 0,
        slideRect.bottom - rootRect.top,
      ),
    ),
  );

  const tables = Array.from(slide.querySelectorAll('table'));
  const theads = tables.map((table) => {
    const thead = table.querySelector('thead');
    if (!thead) return null;
    const rect = thead.getBoundingClientRect();
    return {
      top: rect.top - rootRect.top,
      bottom: rect.bottom - rootRect.top,
      left: rect.left - rootRect.left,
      right: rect.right - rootRect.left,
      height: rect.height,
    };
  });

  const blocks = Array.from(slide.querySelectorAll('[data-export-block]'))
    .map((element) => {
      const rect = element.getBoundingClientRect();
      let top = rect.top - rootRect.top;
      const bottom = rect.bottom - rootRect.top;

      let tableIndex = -1;
      let rowIndex = -1;
      const table = element.closest('table');

      if (table) {
        tableIndex = tables.indexOf(table);
        if (element.tagName === 'TR' && element.parentElement) {
          rowIndex = Array.prototype.indexOf.call(element.parentElement.children, element);
        }
      }

      // Baris pertama tabel membawa header tabelnya agar tidak terpisah dari thead.
      if (tableIndex >= 0 && rowIndex === 0 && theads[tableIndex]) {
        top = Math.min(top, theads[tableIndex].top);
      }

      return {
        top,
        bottom,
        left: rect.left - rootRect.left,
        right: rect.right - rootRect.left,
        tableIndex,
        rowIndex,
      };
    })
    .filter((block) => block.bottom > block.top + 0.5)
    .sort((a, b) => a.top - b.top || a.left - b.left);

  return {
    height,
    blocks,
    theads,
    title: normalizeText(slide.querySelector('.slide-title')?.textContent),
    kicker: normalizeText(slide.querySelector('.slide-kicker')?.textContent),
  };
};

/**
 * Mengambil seluruh slide aktif sebagai satu canvas tinggi.
 * Pengukuran tinggi dan skala dilakukan di dalam `onclone`, yaitu pada dokumen
 * klon ber-viewport 1280px, sehingga hasilnya deterministik di semua perangkat.
 */
export const captureSlideForExport = async (element) => {
  let metrics = null;

  const options = {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#f8fafc',
    logging: false,
    removeContainer: true,
    ignoreElements: (node) => Boolean(node?.hasAttribute?.('data-html2canvas-ignore')),
    windowWidth: SLIDE_PAGE.width,
    windowHeight: 900,
    scrollX: 0,
    scrollY: 0,
    width: SLIDE_PAGE.width,
    height: SLIDE_PAGE.height,
  };

  options.onclone = (_documentClone, clonedRoot) => {
    // Terapkan panggung ekspor 1280px pada dokumen klon saja (bukan halaman
    // asli). Ini mencegah browser mobile memperbesar layout/font halaman asli.
    try {
      _documentClone.body.classList.add('exporting-image');
    } catch {
      // Abaikan bila body klon tidak tersedia.
    }

    metrics = measureExportLayout(clonedRoot);
    options.height = metrics.height;
    options.width = SLIDE_PAGE.width;

    // Batasi luas canvas agar browser tidak kehabisan memori pada data ekstrem.
    const areaScale = Math.sqrt(MAX_CANVAS_AREA / (SLIDE_PAGE.width * metrics.height));
    const dimensionScale = MAX_CANVAS_DIMENSION / metrics.height;
    options.scale = clamp(Math.min(2, areaScale, dimensionScale), 1, 2);
  };

  const canvas = await html2canvas(element, options);

  if (!metrics) {
    throw new Error('Gagal mengukur slide untuk ekspor.');
  }

  return {
    canvas,
    metrics: {
      ...metrics,
      scale: canvas.width / SLIDE_PAGE.width,
    },
  };
};

const isSafeCut = (blocks, y) =>
  !blocks.some((block) => block.top < y - 0.5 && block.bottom > y + 0.5);

const nextBlockAfter = (blocks, y) => {
  for (const block of blocks) {
    if (block.bottom > y + 0.5) return block;
  }
  return null;
};

/**
 * Mencari baris kosong terdekat dari titik potong agar teks tidak terbelah
 * tepat di tengah glyph saat sebuah blok tunggal lebih tinggi dari satu halaman.
 */
const findInkGap = (canvas, targetY, scale) => {
  const radius = Math.round(14 * scale);
  const center = Math.round(targetY * scale);
  const from = Math.max(0, center - radius);
  const to = Math.min(canvas.height - 1, center + radius);

  if (to <= from) return targetY;

  const stripHeight = to - from + 1;
  let data;

  try {
    // Salin strip ke canvas bantu agar pembacaan piksel tidak memicu warning
    // "willReadFrequently" pada canvas utama milik html2canvas.
    const helper = document.createElement('canvas');
    helper.width = canvas.width;
    helper.height = stripHeight;
    const helperContext = helper.getContext('2d', { willReadFrequently: true });
    if (!helperContext) return targetY;
    helperContext.drawImage(
      canvas,
      0,
      from,
      canvas.width,
      stripHeight,
      0,
      0,
      canvas.width,
      stripHeight,
    );
    data = helperContext.getImageData(0, 0, canvas.width, stripHeight).data;
  } catch {
    return targetY;
  }

  let bestRow = center - from;
  let bestScore = Number.POSITIVE_INFINITY;
  const stepX = Math.max(4, Math.round(canvas.width / 240));

  for (let row = 0; row < stripHeight; row += 1) {
    let ink = 0;
    const rowOffset = row * canvas.width * 4;
    for (let x = 0; x < canvas.width; x += stepX) {
      const index = rowOffset + x * 4;
      if (data[index] < 236 || data[index + 1] < 236 || data[index + 2] < 236) {
        ink += 1;
      }
    }
    if (ink < bestScore) {
      bestScore = ink;
      bestRow = row;
    }
  }

  return (from + bestRow) / scale;
};

export const paginateSlide = ({ canvas, metrics }) => {
  const { blocks, theads, height, scale } = metrics;
  const pages = [];
  let start = 0;
  let guard = 0;

  while (start < height - 0.5 && guard < MAX_PAGES_PER_SLIDE) {
    guard += 1;
    const isFirst = pages.length === 0;
    const nextBlock = nextBlockAfter(blocks, start);

    // Hanya tersisa padding bawah slide: jangan buat halaman kosong.
    if (!isFirst && !nextBlock) break;

    let repeatThead = null;
    if (!isFirst && nextBlock && nextBlock.tableIndex >= 0 && nextBlock.rowIndex > 0) {
      const thead = theads[nextBlock.tableIndex];
      if (thead && thead.height > 0) repeatThead = thead;
    }

    const headerHeight = isFirst ? 0 : SLIDE_PAGE.continuationTop;
    const theadSpace = repeatThead ? Math.ceil(repeatThead.height) + 4 : 0;
    const capacity = SLIDE_PAGE.height - headerHeight - theadSpace - PAGE_BOTTOM_PADDING;
    const hardEnd = Math.min(height, start + capacity);

    if (hardEnd >= height - 0.5) {
      pages.push({
        start,
        end: height,
        isFirst,
        repeatThead,
        capacity,
        scale: 1,
      });
      break;
    }

    const softEnd = Math.min(height, start + capacity * SOFT_OVERFLOW);
    const edges = new Set([hardEnd]);

    for (const block of blocks) {
      if (block.top > start + 0.5 && block.top <= softEnd) edges.add(block.top);
      if (block.bottom > start + 0.5 && block.bottom <= softEnd) edges.add(block.bottom);
    }

    const safeCandidates = Array.from(edges)
      .filter((y) => y - start >= MIN_PAGE_CONTENT && isSafeCut(blocks, y))
      .sort((a, b) => b - a);

    // Utamakan batas blok yang masih muat penuh di halaman agar ukuran teks
    // konsisten antar halaman (tidak perlu diperkecil).
    const fittingCut = safeCandidates.find(
      (y) => y <= hardEnd + 0.5 && y - start >= capacity * 0.55,
    );

    const overflowCut = safeCandidates.find((y) => y > hardEnd + 0.5);
    const nextAfterStart = nextBlockAfter(blocks, start);
    const nextBlockTooTall =
      nextAfterStart && nextAfterStart.bottom - nextAfterStart.top > capacity;

    let cut = fittingCut || overflowCut || null;
    let pageScale = 1;

    if (cut === null) {
      // Tidak ada batas blok yang aman: potong paksa, lalu geser ke celah tinta.
      cut = findInkGap(canvas, hardEnd, scale);
      cut = clamp(cut, start + MIN_PAGE_CONTENT, start + capacity);
    } else if (cut > hardEnd + 0.5) {
      // Batas blok terdekat sedikit melewati kapasitas: perkecil halaman ini
      // agar blok tetap utuh, bukan terpotong.
      pageScale = capacity / (cut - start);
    }

    // Hindari halaman pertama yang hanya berisi judul ketika blok berikutnya
    // sendiri lebih tinggi dari satu halaman. Lebih baik mulai memotong isi
    // panjang itu (di celah antarbaris) daripada menyisakan halaman kosong.
    if (
      pages.length === 0 &&
      nextAfterStart &&
      nextBlockTooTall &&
      cut - start < capacity * 0.6
    ) {
      cut = findInkGap(canvas, hardEnd, scale);
      cut = clamp(cut, start + MIN_PAGE_CONTENT, start + capacity);
      pageScale = 1;
    }

    if (cut <= start + 1) {
      cut = Math.min(height, start + capacity);
    }

    pages.push({
      start,
      end: cut,
      isFirst,
      repeatThead,
      capacity,
      scale: pageScale,
    });
    start = cut;
  }

  if (pages.length === 1) pages[0].single = true;

  return pages;
};

const roundRect = (context, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
};

const fitText = (context, text, maxWidth) => {
  if (context.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && context.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
};

const drawContinuationHeader = (context, scale, meta) => {
  const x = 40;
  const y = 14;
  const width = SLIDE_PAGE.width - x * 2;
  const height = 52;

  context.save();
  context.fillStyle = '#ffffff';
  roundRect(context, x * scale, y * scale, width * scale, height * scale, 12 * scale);
  context.fill();
  context.strokeStyle = '#e2e8f0';
  context.lineWidth = Math.max(1, scale);
  context.stroke();

  context.fillStyle = meta.accent;
  roundRect(context, x * scale, y * scale, 4 * scale, height * scale, 2 * scale);
  context.fill();

  const textX = x + 20;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';

  if (meta.kicker) {
    context.font = `800 ${9 * scale}px Inter, ui-sans-serif, sans-serif`;
    context.fillStyle = meta.accent;
    context.fillText(meta.kicker.toUpperCase(), textX * scale, 33 * scale);
  }

  context.font = `800 ${17 * scale}px Inter, ui-sans-serif, sans-serif`;
  context.fillStyle = '#1e293b';
  const title = fitText(
    context,
    meta.title || meta.label || 'L10 Meeting',
    (SLIDE_PAGE.width - textX - 190) * scale,
  );
  context.fillText(title, textX * scale, 54 * scale);

  context.textAlign = 'right';
  context.font = `700 ${10 * scale}px Inter, ui-sans-serif, sans-serif`;
  context.fillStyle = '#64748b';
  context.fillText(
    `Lanjutan ${meta.pageIndex}/${meta.totalPages}`,
    (x + width - 16) * scale,
    45 * scale,
  );

  context.restore();
};

export const renderSlidePage = (sourceCanvas, metrics, page, meta) => {
  const sourceScale = metrics.scale;
  const pageCanvas = document.createElement('canvas');
  pageCanvas.width = Math.round(SLIDE_PAGE.width * sourceScale);
  pageCanvas.height = Math.round(SLIDE_PAGE.height * sourceScale);

  const context = pageCanvas.getContext('2d');
  context.fillStyle = '#f8fafc';
  context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

  const contentScale = page.scale || 1;
  const contentWidth = SLIDE_PAGE.width * contentScale;
  const offsetX = (SLIDE_PAGE.width - contentWidth) / 2;

  let contentTop = page.isFirst ? 0 : SLIDE_PAGE.continuationTop;

  if (page.repeatThead) {
    const thead = page.repeatThead;
    const theadWidth = thead.right - thead.left;
    context.drawImage(
      sourceCanvas,
      thead.left * sourceScale,
      thead.top * sourceScale,
      theadWidth * sourceScale,
      thead.height * sourceScale,
      (offsetX + thead.left * contentScale) * sourceScale,
      contentTop * sourceScale,
      theadWidth * contentScale * sourceScale,
      thead.height * contentScale * sourceScale,
    );
    contentTop += thead.height * contentScale + 4;
  }

  const sourceHeight = page.end - page.start;

  if (page.single && page.isFirst && sourceHeight < SLIDE_PAGE.height) {
    // Slide pendek (mis. cover) diletakkan di tengah halaman agar tidak terlihat
    // menggantung di atas dengan ruang kosong besar.
    contentTop = (SLIDE_PAGE.height - sourceHeight) / 2;
  }

  context.drawImage(
    sourceCanvas,
    0,
    page.start * sourceScale,
    SLIDE_PAGE.width * sourceScale,
    sourceHeight * sourceScale,
    offsetX * sourceScale,
    contentTop * sourceScale,
    contentWidth * sourceScale,
    sourceHeight * contentScale * sourceScale,
  );

  if (!page.isFirst) {
    drawContinuationHeader(context, sourceScale, meta);
  }

  return pageCanvas.toDataURL('image/jpeg', JPEG_QUALITY);
};

export const buildPdf = (pages, { meetingDate }) => {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
    compress: true,
  });

  const total = pages.length;
  const dateLabel = meetingDate || 'Tanpa tanggal';

  pages.forEach((page, index) => {
    if (index > 0) pdf.addPage('a4', 'landscape');

    pdf.setFillColor(248, 250, 252);
    pdf.rect(0, 0, A4.width, A4.height, 'F');

    pdf.addImage(
      page.dataUrl,
      'JPEG',
      IMAGE_BOX.x,
      IMAGE_BOX.y,
      IMAGE_BOX.width,
      IMAGE_BOX.height,
      undefined,
      'FAST',
    );

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      `L10 Meeting · ${dateLabel} · Hal. ${index + 1}/${total}`,
      A4.width / 2,
      FOOTER_Y,
      { align: 'center' },
    );
  });

  return pdf;
};

export const savePagesAsPdf = (pages, { meetingDate, filename }) => {
  buildPdf(pages, { meetingDate }).save(filename);
};
