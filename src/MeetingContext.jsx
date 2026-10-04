import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
// PERBAIKAN 1: Tambahkan 'documentId' di dalam import Firebase
import { doc, onSnapshot, setDoc, updateDoc, collection, query, where, orderBy, limit, getDocs, documentId } from 'firebase/firestore';
import { db } from './firebase';

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

const INITIAL_STATE = {
  meetingDate: "", 
  attendances: [
    { id: 1, name: 'Owner', checked: false },
    { id: 2, name: 'Digital Marketing Supervisor', checked: false },
    { id: 3, name: 'Social Media Specialist', checked: false },
    { id: 4, name: 'Marketplace Specialist', checked: false},
    { id: 5, name: 'Meta Ads', checked: false},
    { id: 6, name: 'KOL-Affiliate Specialist', checked: false},
    { id: 7, name: 'Marketing Campaign', checked: false}
  ],
  goodNews: { owner: '', integrator: '', team: '' },
  scorecardTitles: { dgmKPI: 'Digital Marketing Supervisor', smsKPI: 'Social Media Specialist', msKPI: 'Marketplace Specialist', maKPI: 'Meta Ads', kasKPI: 'KOL-Affiliate Specialist', mcKPI: 'Marketing Campaign' },
  dgmKPI: [], smsKPI: [], msKPI: [], maKPI: [], kasKPI: [], mcKPI: [], 
  rockReview: [], headlines: { customer: [], internal: [] }, todoList: [],
  idsSession: {
    issues: [],
    themes: [generateDefaultTheme(1), generateDefaultTheme(2), generateDefaultTheme(3)],
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
  
  const pendingUpdatesRef = useRef({});
  const saveTimeoutRef = useRef(null);
  const isReady = useRef(false);

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

  useEffect(() => {
    if (!activeDate) return; 

    isReady.current = false;

    const unsubscribe = onSnapshot(doc(db, 'meetings', activeDate), async (docSnap) => {
      if (docSnap.exists()) {
        const serverData = docSnap.data();
        const mergedData = {
          ...INITIAL_STATE,
          ...serverData,
          meetingDate: getCurrentDate(activeDate), 
          idsSession: {
            ...INITIAL_STATE.idsSession,
            ...(serverData.idsSession || {})
          }
        };
        setData(mergedData);
        setCloudStatus('saved');
        setCloudMsg('Sinkron');
        setTimeout(() => { isReady.current = true; }, 1000);
      } else {
        setCloudStatus('loading');
        setCloudMsg('Membawa data lama...');

        try {
          // PERBAIKAN 2: Gunakan documentId() sebagai ganti '__name__' yang menyebabkan crash
          const q = query(collection(db, 'meetings'), where(documentId(), '<', activeDate), orderBy(documentId(), 'desc'), limit(1));
          const snap = await getDocs(q);

          if (!snap.empty) {
            const lastData = snap.docs[0].data();
            
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
            setData({ ...INITIAL_STATE, meetingDate: getCurrentDate(activeDate) });
            setCloudStatus('saved');
            setCloudMsg('Terhubung');
            setTimeout(() => { isReady.current = true; }, 1000);
          }
        } catch (error) {
          console.error("Gagal menarik data lama:", error);
          setData({ ...INITIAL_STATE, meetingDate: getCurrentDate(activeDate) });
          // PERBAIKAN 3: Beri tahu layar jika prosesnya gagal agar tidak stuck loading selamanya
          setCloudStatus('error');
          setCloudMsg('Gagal memuat');
          setTimeout(() => { isReady.current = true; }, 1000);
        }
      }
    });
    return () => unsubscribe();
  }, [activeDate]);

  const triggerFirebaseUpdate = () => {
    if (!activeDate || !isReady.current) return; 
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      const updates = { ...pendingUpdatesRef.current };
      if (Object.keys(updates).length === 0) return;
      pendingUpdatesRef.current = {}; 
      
      setCloudStatus('saving');
      setCloudMsg('Menyinkronkan...');
      try {
        await updateDoc(doc(db, 'meetings', activeDate), updates); 
        setCloudStatus('saved');
        setCloudMsg('Tersimpan');
      } catch (error) {
        if (error.code === 'not-found') {
           await setDoc(doc(db, 'meetings', activeDate), data);
           setCloudStatus('saved');
        } else {
           setCloudStatus('error');
           setCloudMsg('Gagal');
        }
      }
    }, 1000); 
  };

  const handleAddAttendance = () => {
    setData(prev => {
      const newId = prev.attendances.length > 0 ? Math.max(...prev.attendances.map(a => a.id)) + 1 : 1;
      const newAttendances = [...prev.attendances, { id: newId, name: '', checked: false }];
      pendingUpdatesRef.current['attendances'] = newAttendances;
      triggerFirebaseUpdate();
      return { ...prev, attendances: newAttendances };
    });
  };

  const loadYesterdayData = async () => {
    if (!activeDate) return;
    try {
      setCloudMsg('Menyiapkan Template...');
      // PERBAIKAN 4: Terapkan juga penangkal crash di tombol manual ini
      const q = query(collection(db, 'meetings'), where(documentId(), '<', activeDate), orderBy(documentId(), 'desc'), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const lastData = snap.docs[0].data();
        const newData = { ...lastData, meetingDate: getCurrentDate(activeDate), 
          attendances: INITIAL_STATE.attendances,
          scorecardTitles: INITIAL_STATE.scorecardTitles,
          ratings: {}, 
          goodNews: { owner: '', integrator: '', team: '' } };
        
        setData(newData);
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

  const updateData = (path, value) => {
    if (!isReady.current) return; 
    
    pendingUpdatesRef.current[path] = value;
    triggerFirebaseUpdate();
    setData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let current = newData;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {}; 
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newData;
    });
  };

  const updateListItem = (listKey, index, field, value) => {
    if (!isReady.current) return;
    
    setData((prev) => {
      const currentList = prev[listKey] || [];
      const newList = [...currentList];
      newList[index] = { ...newList[index], [field]: value };
      pendingUpdatesRef.current[listKey] = newList;
      triggerFirebaseUpdate();
      return { ...prev, [listKey]: newList };
    });
  };

  const addRow = (listKey, template) => {
    if (!isReady.current) return;

    setData((prev) => {
      const currentList = prev[listKey] || [];
      const newList = [...currentList, template];
      pendingUpdatesRef.current[listKey] = newList;
      triggerFirebaseUpdate();
      return { ...prev, [listKey]: newList };
    });
  };

  const deleteListItem = (listKey, index) => {
    if (!isReady.current) return;

    setData((prev) => {
      const currentList = prev[listKey] || [];
      const newList = removeIndex(currentList, index);
      pendingUpdatesRef.current[listKey] = newList;
      triggerFirebaseUpdate();
      return { ...prev, [listKey]: newList };
    });
  };

  const handleUpdateAttendance = (id, field, value) => {
    if (!isReady.current) return;

    setData(prev => {
      const newRatings = { ...prev.ratings };
      if (field === 'checked' && value === false) delete newRatings['rating_id_' + id];
      const newAttendances = prev.attendances.map(a => a.id === id ? { ...a, [field]: value } : a);
      
      pendingUpdatesRef.current['attendances'] = newAttendances;
      pendingUpdatesRef.current['ratings'] = newRatings;
      triggerFirebaseUpdate();
      return { ...prev, attendances: newAttendances, ratings: newRatings };
    });
  };

  const populateIDS = () => {
    if (!isReady.current) return;

    setData(prev => {
      const offTrack = [];
      const divisiKeys = ['dmsKPI', 'smsKPI', 'msKPI', 'maKPI', 'kasKPI','mcKPI', 'rockReview'];
      
      divisiKeys.forEach(key => {
        const list = prev[key] || [];
        list.forEach(item => {
          const text = item.kpi || item.rock;
          if (text && item.status === 'off') {
            offTrack.push({
              id: `auto-${Date.now()}-${Math.random()}`, 
              text: text,
              source: key === 'rockReview' ? 'Rocks' : 'Scorecard',
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
      
      if (newIssues.length === 0) return prev; 

      const mergedIssues = [...currentIssues, ...newIssues];
      const newIdsSession = { ...prev.idsSession, issues: mergedIssues };

      pendingUpdatesRef.current['idsSession'] = newIdsSession;
      triggerFirebaseUpdate();

      return { ...prev, idsSession: newIdsSession };
    });
  };

  return (
    <MeetingContext.Provider value={{
      data, activeDate, cloudStatus, cloudMsg, 
      updateData, updateListItem, addRow, deleteListItem, handleUpdateAttendance, populateIDS, loadYesterdayData, handleAddAttendance
    }}>
      {children}
    </MeetingContext.Provider>
  );
};

function generateDefaultTheme(index) {
  return {
    id: index,
    topic: "",
    currentCond: "",
    desiredCond: "",
    analysis: { man: "", method: "", machine: "", material: "", environment: "" },
    chain: Array.from({ length: 5 }, () => ({ effect: "", cause: "" })), 
    rootCause: "",
    plan: { what: "", who: "", when: "", where: "", why: "", cost: "" }
  };
}
