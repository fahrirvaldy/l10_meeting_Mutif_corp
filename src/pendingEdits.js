/**
 * Registry kecil untuk draft `Editable` yang belum di-commit.
 *
 * Tujuannya: sebelum halaman ditutup/di-reload, context bisa memaksa semua
 * textarea menuliskan draft terakhirnya ke state aplikasi, lalu antrian
 * Firestore di-flush. Tanpa ini, ketikan yang belum sempat blur/commit bisa
 * hilang saat reload.
 *
 * Semua handler yang mengubah daftar (headline, to-do, IDS) memakai updater
 * berbasis data terbaru, sehingga urutan flush tidak menyebabkan saling timpa.
 */

const flushers = new Set();

export const registerPendingEditFlusher = (flusher) => {
  if (typeof flusher !== 'function') return () => {};
  flushers.add(flusher);
  return () => flushers.delete(flusher);
};

export const flushPendingEdits = () => {
  // Salin dulu agar perubahan listener selama flush tidak mengganggu iterasi.
  Array.from(flushers).forEach((flush) => {
    try {
      flush();
    } catch (error) {
      console.error('Gagal menyimpan draft yang tertunda:', error);
    }
  });
};
