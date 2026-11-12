import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
// PERBAIKAN 1: Tambahkan 'documentId' di dalam import Firebase
import { doc, onSnapshot, setDoc, updateDoc, collection, query, where, orderBy, limit, getDocs, documentId } from 'firebase/firestore';
import { db } from './firebase';
import { flushPendingEdits } from './pendingEdits';
import {
  createEmptyTheme,
  getThemes,
  hasText,
  themeHasContent,
  toArray,
} from './idsModel';

// Debounce tulis Firestore. Mengetik terus-menerus tidak menghasilkan write;
// write baru terjadi setelah user berhenti mengetik, blur, atau menutup tab.
const WRITE_DEBOUNCE_MS = 700;
const READY_DELAY_MS = 1000;
const RETRY_BASE_MS = 1000;
const RETRY_MAX_MS = 15000;
const MAX_RETRY_ATTEMPTS = 8;

const getDocId = (date = new Date()) => new Date(date).toLocaleDateString('en-CA');

const getCurrentDate = (dateString = null) => {
  let targetDate = new Date();
  if (dateString) {
    const [y, m, d] = dateString.split('-');
    targetDate = new Date(y, m - 1, d); 
  }
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${days[targetDate.getDay()]}, ${targetDate.getDate()} ${months[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
};

// Data lama sempat tersimpan dengan key `fulfilmentKPI` (satu L). Saat dibaca,
// petakan ke key baru tanpa menulis ulang dokumen, agar isi lama tidak hilang.
const normalizeLegacyKeys = (source) => {
  if (!source || typeof source !== 'object') return source;
  if (source.fulfillmentKPI !== undefined || source.fulfilmentKPI === undefined) return source;
  return { ...source, fulfillmentKPI: source.fulfilmentKPI };
};

const SCORECARD_KEYS = ['dmlKPI', 'smKPI', 'msKPI', 'khlKPI', 'pmKPI', 'asKPI', 'mcpKPI'];

// Path notulensi mingguan. Dipakai untuk snapshot undo dan reset manual.
const NOTULENSI_PATHS = [
  ...SCORECARD_KEYS,
  'goodNews.owner',
  'goodNews.integrator',
  'goodNews.team',
  'headlines.customer',
  'headlines.internal',
  'idsSession.issues',
  'idsSession.themes',
  'idsSession.solutions',
];

const getValueAtPath = (source, path) =>
  path.split('.').reduce((current, key) => (current == null ? undefined : current[key]), source);

const setValueAtPath = (target, path, value) => {
  const keys = path.split('.');
  let current = target;

  for (let index = 0; index < keys.length - 1; index += 1) {
    if (!current[keys[index]] || typeof current[keys[index]] !== 'object') {
      current[keys[index]] = {};
    }
    current = current[keys[index]];
  }

  current[keys[keys.length - 1]] = value;
};

const cloneValue = (value) => {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value));
};

const INITIAL_STATE = {
  meetingDate: "", 
  attendances: [
    { id: 1, name: 'Owner', checked: false },
    { id: 2, name: 'Digital Marketing Lead', checked: false },
    { id: 3, name: 'Social Media', checked: false },
    { id: 4, name: 'Marketplace Specialist', checked: false},
    { id: 5, name: 'Performace Marketing', checked: false},
    { id: 6, name: 'Affiliate Specialist', checked: false},
    { id: 7, name: 'Marketing Campaign Program', checked: false},
    { id: 8, name: 'integrator', checked: false},
    { id: 9, name: 'Koordinator Host Live', checked: false}
  ],
  goodNews: { owner: '', integrator: '', team: '' },
  scorecardTitles: { dmlKPI: 'Digital Marketing Lead', smKPI: 'Social Media', msKPI: 'Marketing Specialist', khlKPI: 'Koordinator Host Live', pmKPI: 'Performace Marketing', asKPI: 'Affiliate Specialist', mcpKPI: 'Marketing Campaign Program' },
  dmlKPI: [], smKPI: [], msKPI: [], khlKPI: [], pmKPI: [], asKPI: [], mcpKPI: [],
  rockReview: [], headlines: { customer: [], internal: [] }, todoList: [],
  idsSession: {
    issues: [],
    themes: [
      createEmptyTheme('theme-1'),
      createEmptyTheme('theme-2'),
      createEmptyTheme('theme-3'),
    ],
    solutions: ""
  },
  ratings: {}
};

const removeIndex = (array, index) => {
  const newArray = [...array];
  newArray.splice(index, 1);
  return newArray;
};

const MeetingContext = createContext();
export const useMeeting = () => useContext(MeetingContext);

export const MeetingProvider = ({ children }) => {

  const [data, setData] = useState(INITIAL_STATE);
  const [activeDate, setActiveDate] = useState(null); 
  const [cloudStatus, setCloudStatus] = useState('loading');
  const [cloudMsg, setCloudMsg] = useState('Menyiapkan...');
  const [isReadyState, setIsReadyState] = useState(false);
  
  const pendingUpdatesRef = useRef({});
  const inFlightUpdatesRef = useRef({});
  const saveTimeoutRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const readyTimeoutRef = useRef(null);
  const retryAttemptRef = useRef(0);
  const isSavingRef = useRef(false);
  const flushAfterSaveRef = useRef(false);
  const flushRef = useRef(null);
  const hasSnapshotRef = useRef(false);
  const isReady = useRef(false);
  const lastResetRef = useRef(null);

  // Sumber data sinkron untuk operasi yang harus langsung terlihat oleh
  // handler `pagehide` (tanpa menunggu render React berikutnya).
  const dataRef = useRef(INITIAL_STATE);
  const activeDateRef = useRef(null);

  const commitData = (nextOrUpdater) => {
    const next = typeof nextOrUpdater === 'function'
      ? nextOrUpdater(dataRef.current)
      : nextOrUpdater;
    dataRef.current = next;
    setData(next);
    return next;
  };

  // Firestore menolak update yang berisi field induk dan subfield sekaligus
  // (mis. `idsSession` + `idsSession.themes`). Rapikan antrian sebelum kirim:
  // - path baru yang merupakan induk menggantikan anak-anaknya (dataRef sudah
  //   memuat nilai anak terbaru);
  // - path baru yang merupakan anak digabung ke objek induk yang sudah antre.
  const queuePendingUpdate = (path, value) => {
    const pending = pendingUpdatesRef.current;
    let mergedIntoParent = false;

    Object.keys(pending).forEach((pendingPath) => {
      if (pendingPath === path) {
        delete pending[pendingPath];
        return;
      }

      if (pendingPath.startsWith(`${path}.`)) {
        delete pending[pendingPath];
        return;
      }

      if (path.startsWith(`${pendingPath}.`)) {
        const parentValue = pending[pendingPath];
        if (parentValue && typeof parentValue === 'object') {
          const nextParent = cloneValue(parentValue);
          setValueAtPath(nextParent, path.slice(pendingPath.length + 1), cloneValue(value));
          pending[pendingPath] = nextParent;
          mergedIntoParent = true;
          return;
        }
        delete pending[pendingPath];
      }
    });

    if (!mergedIntoParent) pending[path] = value;
  };

  useEffect(() => {
    activeDateRef.current = activeDate;
  }, [activeDate]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let urlDate = urlParams.get('date');
    
    // PENANGKAL ERROR: Selalu paksa format URL menjadi YYYY-MM-DD
    if (urlDate) {
      const parts = urlDate.split('-');
      if (parts.length === 3) {
        // PadStart akan otomatis menambahkan '0' jika angkanya cuma 1 digit
        urlDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
    }
    setActiveDate(urlDate || getDocId());
  }, []);

  // Terapkan edit yang belum terkirim di atas data server, agar snapshot
  // realtime tidak menimpa ketikan lokal (mis. saat multi-tab).
  const applyPendingToData = (source) => {
    const inFlight = inFlightUpdatesRef.current;
    const pending = pendingUpdatesRef.current;
    const paths = [...Object.keys(inFlight), ...Object.keys(pending)];
    if (paths.length === 0) return source;

    const merged = JSON.parse(JSON.stringify(source));
    // `pending` lebih baru dari `inFlight`, jadi diterapkan terakhir.
    Object.keys(inFlight).forEach((path) => {
      setValueAtPath(merged, path, cloneValue(inFlight[path]));
    });
    Object.keys(pending).forEach((path) => {
      setValueAtPath(merged, path, cloneValue(pending[path]));
    });
    return merged;
  };

  const queueReady = () => {
    if (isReady.current || readyTimeoutRef.current) return;
    readyTimeoutRef.current = setTimeout(() => {
      readyTimeoutRef.current = null;
      isReady.current = true;
      setIsReadyState(true);
      if (
        Object.keys(pendingUpdatesRef.current).length > 0 ||
        Object.keys(inFlightUpdatesRef.current).length > 0
      ) {
        flushRef.current?.();
      }
    }, READY_DELAY_MS);
  };

  useEffect(() => {
    if (!activeDate) return undefined;

    isReady.current = false;
    hasSnapshotRef.current = false;
    setIsReadyState(false);
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'meetings', activeDate),
      async (docSnap) => {
        if (docSnap.exists()) {
          const serverData = normalizeLegacyKeys(docSnap.data());
          const mergedData = {
            ...INITIAL_STATE,
            ...serverData,
            meetingDate: getCurrentDate(activeDate),
            idsSession: {
              ...INITIAL_STATE.idsSession,
              ...(serverData.idsSession || {})
            }
          };
          commitData(applyPendingToData(mergedData));
          hasSnapshotRef.current = true;

          if (
            Object.keys(pendingUpdatesRef.current).length > 0 ||
            Object.keys(inFlightUpdatesRef.current).length > 0
          ) {
            setCloudStatus('saving');
            setCloudMsg(isReady.current ? 'Menyimpan...' : 'Menunggu data siap...');
          } else {
            setCloudStatus('saved');
            setCloudMsg('Sinkron');
          }

          queueReady();
        } else {
          setCloudStatus('loading');
          setCloudMsg('Membawa data lama...');

          try {
            // PERBAIKAN 2: Gunakan documentId() sebagai ganti '__name__' yang menyebabkan crash
            const q = query(collection(db, 'meetings'), where(documentId(), '<', activeDate), orderBy(documentId(), 'desc'), limit(1));
            const snap = await getDocs(q);

            if (!snap.empty) {
              const lastData = normalizeLegacyKeys(snap.docs[0].data());

              const carryOverData = {
                ...INITIAL_STATE,
                ...lastData,
                meetingDate: getCurrentDate(activeDate),
                attendances: INITIAL_STATE.attendances,
                scorecardTitles: INITIAL_STATE.scorecardTitles,
                ratings: {},
                goodNews: { owner: '', integrator: '', team: '' }
              };

              await setDoc(doc(db, 'meetings', activeDate), carryOverData);
            } else {
              commitData({ ...INITIAL_STATE, meetingDate: getCurrentDate(activeDate) });
              setCloudStatus('saved');
              setCloudMsg('Terhubung');
              queueReady();
            }
          } catch (error) {
            console.error("Gagal menarik data lama:", error);
            commitData({ ...INITIAL_STATE, meetingDate: getCurrentDate(activeDate) });
            // PERBAIKAN 3: Beri tahu layar jika prosesnya gagal agar tidak stuck loading selamanya
            setCloudStatus('error');
            setCloudMsg('Gagal memuat');
            queueReady();
          }
        }
      },
      (error) => {
        console.error('Gagal berlangganan data rapat:', error);
        setCloudStatus('error');
        setCloudMsg('Gagal sinkronisasi');
        // Tetap izinkan edit lokal; antrian dicoba lagi saat ada perubahan.
        queueReady();
      },
    );

    return () => {
      unsubscribe();
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
    };
  }, [activeDate]);

  // Menyusun dokumen penuh untuk fallback ketika dokumen rapat belum ada.
  const buildFullDocument = (extraUpdates = {}) => {
    const base = JSON.parse(JSON.stringify(dataRef.current || INITIAL_STATE));
    Object.keys(extraUpdates).forEach((path) => {
      setValueAtPath(base, path, cloneValue(extraUpdates[path]));
    });
    return base;
  };

  function triggerFirebaseUpdate() {
    if (!activeDateRef.current) return;

    // Selama data awal belum siap, jangan buang edit: cukup tahan antrian.
    if (!isReady.current) {
      setCloudStatus('saving');
      setCloudMsg('Menunggu data siap...');
      return;
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setCloudStatus('saving');
    setCloudMsg('Menunggu disimpan...');
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null;
      flushRef.current?.();
    }, WRITE_DEBOUNCE_MS);
  }

  const scheduleRetry = () => {
    if (retryTimeoutRef.current) return;
    if (retryAttemptRef.current >= MAX_RETRY_ATTEMPTS) return;

    const delay = Math.min(RETRY_BASE_MS * (2 ** retryAttemptRef.current), RETRY_MAX_MS);
    retryAttemptRef.current += 1;
    setCloudMsg(`Gagal menyimpan - mencoba lagi (${retryAttemptRef.current}/${MAX_RETRY_ATTEMPTS})...`);

    retryTimeoutRef.current = setTimeout(() => {
      retryTimeoutRef.current = null;
      flushRef.current?.();
    }, delay);
  };

  // Kirim semua antrian dalam SATU updateDoc (hemat write). Jika gagal,
  // antrian dikembalikan dan dicoba lagi dengan backoff.
  function flushPendingUpdates() {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    const targetDate = activeDateRef.current;
    // Sebelum snapshot pertama, menulis bisa menimpa data server dengan state
    // awal. Setelah snapshot tiba, aman menulis walau jeda "siap" belum lewat.
    if (!targetDate || (!isReady.current && !hasSnapshotRef.current)) {
      return Promise.resolve(false);
    }

    if (isSavingRef.current) {
      // Write yang sedang berjalan akan memeriksa antrian lagi setelah selesai.
      flushAfterSaveRef.current = true;
      return Promise.resolve(false);
    }

    const updates = { ...pendingUpdatesRef.current };
    if (Object.keys(updates).length === 0) return Promise.resolve(true);

    pendingUpdatesRef.current = {};
    inFlightUpdatesRef.current = updates;
    isSavingRef.current = true;
    setCloudStatus('saving');
    setCloudMsg('Menyimpan...');

    return updateDoc(doc(db, 'meetings', targetDate), updates)
      .then(() => {
        isSavingRef.current = false;
        inFlightUpdatesRef.current = {};
        retryAttemptRef.current = 0;
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = null;
        }

        if (Object.keys(pendingUpdatesRef.current).length > 0) {
          if (flushAfterSaveRef.current) {
            flushAfterSaveRef.current = false;
            flushPendingUpdates();
          } else {
            triggerFirebaseUpdate();
          }
        } else {
          flushAfterSaveRef.current = false;
          setCloudStatus('saved');
          setCloudMsg('Tersimpan');
        }
        return true;
      })
      .catch(async (error) => {
        isSavingRef.current = false;
        flushAfterSaveRef.current = false;

        if (error?.code === 'not-found') {
          try {
            await setDoc(doc(db, 'meetings', targetDate), buildFullDocument(updates));
            inFlightUpdatesRef.current = {};
            retryAttemptRef.current = 0;
            if (Object.keys(pendingUpdatesRef.current).length === 0) {
              setCloudStatus('saved');
              setCloudMsg('Tersimpan');
            } else {
              triggerFirebaseUpdate();
            }
            return true;
          } catch (fallbackError) {
            console.error('Gagal membuat dokumen rapat:', fallbackError);
          }
        } else {
          console.error('Gagal menyimpan data rapat:', error);
        }

        // Kembalikan update yang gagal; edit yang lebih baru tetap menang.
        inFlightUpdatesRef.current = {};
        pendingUpdatesRef.current = { ...updates, ...pendingUpdatesRef.current };
        setCloudStatus('error');
        setCloudMsg('Gagal menyimpan');
        scheduleRetry();
        return false;
      });
  }

  // Simpan referensi fungsi terbaru agar timer & event handler memakai versi aktif.
  useEffect(() => {
    flushRef.current = flushPendingUpdates;
  });

  // Saat tab disembunyikan/ditutup/reload: commit draft textarea lebih dulu,
  // lalu kirim antrian Firestore tanpa menunggu debounce.
  useEffect(() => {
    const flushEverything = () => {
      flushPendingEdits();
      flushRef.current?.();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushEverything();
    };

    window.addEventListener('pagehide', flushEverything);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', flushEverything);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
  }, []);

  const handleAddAttendance = () => {
    const prev = dataRef.current;
    const newId = prev.attendances.length > 0 ? Math.max(...prev.attendances.map(a => a.id)) + 1 : 1;
    const newAttendances = [...prev.attendances, { id: newId, name: '', checked: false }];

    queuePendingUpdate('attendances', newAttendances);
    commitData({ ...prev, attendances: newAttendances });
    triggerFirebaseUpdate();
  };

  const loadYesterdayData = async () => {
    if (!activeDate) return;
    try {
      setCloudMsg('Menyiapkan Template...');
      // PERBAIKAN 4: Terapkan juga penangkal crash di tombol manual ini
      const q = query(collection(db, 'meetings'), where(documentId(), '<', activeDate), orderBy(documentId(), 'desc'), limit(1));
      const snap = await getDocs(q);

      if (!snap.empty) {
        const lastData = normalizeLegacyKeys(snap.docs[0].data());
        const newData = { ...lastData, meetingDate: getCurrentDate(activeDate),
          attendances: INITIAL_STATE.attendances,
          scorecardTitles: INITIAL_STATE.scorecardTitles,
          ratings: {},
          goodNews: { owner: '', integrator: '', team: '' } };

        commitData(newData);
        pendingUpdatesRef.current = { ...lastData, meetingDate: getCurrentDate(activeDate), ratings: {}, goodNews: { owner: '', integrator: '', team: '' } };
        triggerFirebaseUpdate();

        setCloudStatus('saved');
        setCloudMsg('Data dimuat');
      } else {
        setCloudStatus('saved');
        setCloudMsg('Tidak ada riwayat lama');
      }
    } catch (err) {
      setCloudStatus('error');
      setCloudMsg('Gagal memuat');
    }
  };

  // Menulis beberapa path sekaligus dalam satu updateDoc. Path yang saling
  // bertabrakan (mis. `idsSession` vs `idsSession.issues`) dibersihkan dulu
  // agar Firestore tidak menolak update dengan field + subfield sekaligus.
  const applyUpdates = (updates) => {
    if (!activeDate || !isReady.current) return false;

    const paths = Object.keys(updates);
    if (paths.length === 0) return false;

    Object.keys(pendingUpdatesRef.current).forEach((pendingPath) => {
      const hasConflict = paths.some(
        (path) =>
          pendingPath === path ||
          pendingPath.startsWith(`${path}.`) ||
          path.startsWith(`${pendingPath}.`),
      );
      if (hasConflict) delete pendingUpdatesRef.current[pendingPath];
    });

    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };

    const newData = JSON.parse(JSON.stringify(dataRef.current));
    paths.forEach((path) => setValueAtPath(newData, path, updates[path]));
    commitData(newData);
    triggerFirebaseUpdate();

    return true;
  };

  // `value` boleh berupa nilai biasa atau fungsi updater. Updater selalu
  // menerima nilai TERBARU dari dataRef, sehingga beberapa field yang di-commit
  // bersamaan (mis. saat flush reload) tidak saling menimpa.
  const updateData = (path, valueOrUpdater) => {
    const currentValue = getValueAtPath(dataRef.current, path);
    const value = typeof valueOrUpdater === 'function'
      ? valueOrUpdater(cloneValue(currentValue))
      : valueOrUpdater;

    queuePendingUpdate(path, value);

    const newData = JSON.parse(JSON.stringify(dataRef.current));
    setValueAtPath(newData, path, value);
    commitData(newData);
    triggerFirebaseUpdate();
  };

  const updateListItem = (listKey, index, field, value) => {
    const prev = dataRef.current;
    const currentList = prev[listKey] || [];
    const newList = [...currentList];
    newList[index] = { ...newList[index], [field]: value };

    queuePendingUpdate(listKey, newList);
    commitData({ ...prev, [listKey]: newList });
    triggerFirebaseUpdate();
  };

  const addRow = (listKey, template) => {
    const prev = dataRef.current;
    const currentList = prev[listKey] || [];
    const newList = [...currentList, template];

    queuePendingUpdate(listKey, newList);
    commitData({ ...prev, [listKey]: newList });
    triggerFirebaseUpdate();
  };

  const deleteListItem = (listKey, index) => {
    const prev = dataRef.current;
    const currentList = prev[listKey] || [];
    const newList = removeIndex(currentList, index);

    queuePendingUpdate(listKey, newList);
    commitData({ ...prev, [listKey]: newList });
    triggerFirebaseUpdate();
  };

  const handleUpdateAttendance = (id, field, value) => {
    const prev = dataRef.current;
    const newRatings = { ...prev.ratings };
    if (field === 'checked' && value === false) delete newRatings['rating_id_' + id];
    const newAttendances = prev.attendances.map(a => a.id === id ? { ...a, [field]: value } : a);

    queuePendingUpdate('attendances', newAttendances);
    queuePendingUpdate('ratings', newRatings);
    commitData({ ...prev, attendances: newAttendances, ratings: newRatings });
    triggerFirebaseUpdate();
  };

  const populateIDS = () => {
    const prev = dataRef.current;
    const offTrack = [];
    const divisiKeys = ['dmlKPI', 'smKPI', 'msKPI', 'khlKPI', 'pmKPI','asKPI','mcpKPI', 'rockReview'];

    divisiKeys.forEach(key => {
      const list = prev[key] || [];
      list.forEach(item => {
        const text = item.kpi || item.rock;
        if (text && item.status === 'off') {
          offTrack.push({
            id: `auto-${Date.now()}-${Math.random()}`,
            text: text,
            source: key === 'rockReview' ? 'Rocks' : 'Scorecard',
            groupKey: key,
            isResolved: false,
            isSelectedForDiscussion: false,
            votes: 0
          });
        }
      });
    });

    const currentIssues = prev.idsSession?.issues || [];
    const currentTexts = currentIssues.map(i => i.text);
    const newIssues = offTrack.filter(item => !currentTexts.includes(item.text));

    if (newIssues.length === 0) return;

    const mergedIssues = [...currentIssues, ...newIssues];
    const newIdsSession = { ...prev.idsSession, issues: mergedIssues };

    queuePendingUpdate('idsSession', newIdsSession);
    commitData({ ...prev, idsSession: newIdsSession });
    triggerFirebaseUpdate();
  };

  const isToday = Boolean(activeDate) && activeDate === getDocId();

  const scorecardHasNotulensi = SCORECARD_KEYS.some((key) =>
    toArray(data[key]).some((item) => hasText(item?.real) || item?.status === 'off'),
  );
  const goodNewsHasNotulensi = ['owner', 'integrator', 'team'].some((field) =>
    hasText(data.goodNews?.[field]),
  );
  const headlinesHasNotulensi =
    toArray(data.headlines?.customer).some((item) => hasText(item)) ||
    toArray(data.headlines?.internal).some((item) => hasText(item));
  const idsHasNotulensi =
    toArray(data.idsSession?.issues).length > 0 ||
    hasText(data.idsSession?.solutions) ||
    getThemes(data).some(themeHasContent);

  const hasNotulensi =
    scorecardHasNotulensi ||
    goodNewsHasNotulensi ||
    headlinesHasNotulensi ||
    idsHasNotulensi;

  const resetNotulensi = () => {
    if (!isReady.current || !isToday || !hasNotulensi) return false;

    const snapshot = {};
    NOTULENSI_PATHS.forEach((path) => {
      snapshot[path] = cloneValue(getValueAtPath(data, path));
    });

    const resetScorecard = (list) =>
      toArray(list).map((item) => ({ ...item, real: '', status: 'on' }));

    const updates = {
      dmlKPI: resetScorecard(data.dmlKPI),
      smKPI: resetScorecard(data.smKPI),
      msKPI: resetScorecard(data.msKPI),
      khlKPI: resetScorecard(data.khlKPI),
      pmKPI: resetScorecard(data.pmKPI),
      asKPI: resetScorecard(data.asKPI),
      mcpKPI: resetScorecard(data.mcpKPI),
      'goodNews.owner': '',
      'goodNews.integrator': '',
      'goodNews.team': '',
      'headlines.customer': [],
      'headlines.internal': [],
      'idsSession.issues': [],
      'idsSession.themes': [
        createEmptyTheme('theme-1'),
        createEmptyTheme('theme-2'),
        createEmptyTheme('theme-3'),
      ],
      'idsSession.solutions': '',
    };

    const applied = applyUpdates(updates);
    if (!applied) return false;

    lastResetRef.current = snapshot;
    return snapshot;
  };

  const undoResetNotulensi = (snapshotOverride = null) => {
    const snapshot = snapshotOverride || lastResetRef.current;
    if (!snapshot || !isReady.current) return false;

    const applied = applyUpdates(snapshot);
    if (applied && snapshot === lastResetRef.current) lastResetRef.current = null;
    return applied;
  };

  return (
    <MeetingContext.Provider value={{
      data, activeDate, cloudStatus, cloudMsg, isToday, isReady: isReadyState, hasNotulensi,
      updateData, updateListItem, addRow, deleteListItem, handleUpdateAttendance, populateIDS, loadYesterdayData, handleAddAttendance,
      resetNotulensi, undoResetNotulensi,
    }}>
      {children}
    </MeetingContext.Provider>
  );
};
