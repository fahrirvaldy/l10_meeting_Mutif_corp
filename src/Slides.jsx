import React from 'react';
import { useMeeting } from './MeetingContext';
import { Editable, StatusButton, JenisButton, OutcomeButton, cycleJenis } from './Components';

// Wrapper agar slide yang tidak aktif tetap ada di DOM untuk cetak PDF, namun CSS-nya menyembunyikannya
const Slide = ({ isActive, children }) => (
  <section className={`slide ${isActive ? 'active' : 'hidden'}`}>{children}</section>
);

// -- SLIDE COVER ---
export const SlideCover = ({ isActive }) => {
  const { data } = useMeeting();
  
  if (!isActive) return <Slide isActive={false} />;

  return (
    <Slide isActive={isActive}>
      <div className="card flex flex-col justify-center items-center text-center border-none bg-transparent shadow-none">
        <div className="bg-white px-[60px] py-[40px] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-[#e2e8f0]">
          <div className="flex justify-center items-center gap-[10px] mb-[15px]">
            <div className="text-[14px] text-slate-400 uppercase tracking-[2px] font-bold">Tanggal Rapat</div>
          </div>
          <div className="text-3xl font-extrabold text-aksana-primary md:text-5xl">
            {data.meetingDate}
          </div>
        </div>
      </div>
    </Slide>
  );
};

// --- SLIDE AWAL ---
export const SlideAwal = ({ isActive }) => {
  const { data, updateData, handleUpdateAttendance, handleAddAttendance, handleDeleteAttendance } = useMeeting();
  if (!isActive) return <Slide isActive={false} />;

  return (
    <Slide isActive={isActive}>
      <div className="flex flex-col gap-1 mb-4">
        <h1>Segmen Awal</h1>
        <div className="subtitle">Kehadiran & Kabar Baik (5 Menit)</div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8 h-auto">
        <div className="card h-auto">
          <h3>Daftar Hadir</h3>
          <div id="attendance-grid" className="flex flex-col gap-3 mt-4">
            {data.attendances.map((item) => (
              <div key={item.id} className="group flex items-center justify-between w-full p-3 border rounded-xl border-slate-100 bg-slate-50 transition-all hover:border-slate-200">
                <div className="flex items-center flex-grow gap-3">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => handleUpdateAttendance(item.id, 'checked', e.target.checked)}
                    className="flex-shrink-0 w-5 h-5 cursor-pointer accent-aksana-primary"
                  />
                  <span className="w-full p-0 border-none text-sm font-medium text-slate-700 placeholder-slate-400 outline-none bg-transparent focus:ring-0">
                    {item.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Good News (Kabar Syukur)</h3>
          <div className="flex flex-col gap-5 mt-5 text-lg">
            <div><strong className="text-aksana-accent">Owner:</strong><Editable className="input-box mt-[5px]" value={data.goodNews.owner} onChange={(val) => updateData('goodNews.owner', val)} /></div>
            <div><strong className="text-aksana-accent">Integrator:</strong><Editable className="input-box mt-[5px]" value={data.goodNews.integrator} onChange={(val) => updateData('goodNews.integrator', val)} /></div>
            <div><strong className="text-aksana-accent">Perwakilan Tim:</strong><Editable className="input-box mt-[5px]" value={data.goodNews.team} onChange={(val) => updateData('goodNews.team', val)} /></div>
          </div>
        </div>
      </div>
    </Slide>
  );
};

// --- SLIDE ROCK REVIEW ---
export const SlideRock = ({ isActive }) => {
  const { data, updateListItem, deleteListItem, addRow } = useMeeting();
  if (!isActive) return <Slide isActive={false} />;

  return (
    <Slide isActive={isActive}>
      <div className="flex flex-col gap-1 mb-4">
        <h1>Rock Review</h1>
        <div className="subtitle">Prioritas 90 Hari</div>
      </div>
      <div className="card h-auto">
        <div className="w-full overflow-x-auto">
          <table className="min-w-[600px] md:min-w-full">
            <thead>
              <tr><th className="w-[15%]">Owner</th><th className="w-[40%]">Rock</th><th align="center" className="w-[15%]">Status</th><th className="w-[25%]">Catatan</th><th className="action-btn w-[5%]"></th></tr>
            </thead>
            <tbody>
              {data.rockReview.map((item, i) => (
                <tr key={i} className="group">
                  <td><Editable value={item.owner} onChange={(val) => updateListItem('rockReview', i, 'owner', val)} placeholder="Input Owner..." /></td>
                  <td><Editable value={item.rock} onChange={(val) => updateListItem('rockReview', i, 'rock', val)} /></td>
                  <td align="center"><StatusButton status={item.status} onClick={() => updateListItem('rockReview', i, 'status', item.status === 'on' ? 'off' : 'on')} /></td>
                  <td><Editable value={item.note} onChange={(val) => updateListItem('rockReview', i, 'note', val)} /></td>
                  <td align="center" className="action-btn"><button onClick={() => deleteListItem('rockReview', i)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><i className="fa-solid fa-trash"></i></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="add-btn mt-4" onClick={() => addRow('rockReview', { owner: '', rock: '', status: 'on', note: '' })}>+ Tambah Rock / Prioritas Baru</button>
        </div>
      </div>
    </Slide>
  );
};

// --- SLIDE HEADLINES ---
export const SlideHeadlines = ({ isActive }) => {
  const { data, updateData, deleteHeadline } = useMeeting();
  if (!isActive) return <Slide isActive={false} />;

  return (
    <Slide isActive={isActive}>
      <div className="flex flex-col gap-1 mb-4">
        <h1>Headlines</h1>
        <div className="subtitle">Berita Penting (Customer & Internal)</div>
      </div>
      <div className="flex flex-col gap-5 md:flex-row md:gap-6 h-auto pb-5">
        <div className="card headline-card flex-1 min-h-[300px] md:min-h-0">
          <h3 className="text-aksana-accent">Customer Headlines</h3>
          <div className="mt-4">
            {data.headlines.customer.map((hl, i) => (
              <div key={i} className="group flex items-start gap-4 mb-3">
                <span className="mt-3 text-lg font-extrabold text-slate-400">{i + 1}.</span>
                <Editable className="input-box flex-grow" value={hl} onChange={(val) => { const newHl = [...data.headlines.customer]; newHl[i] = val; updateData('headlines.customer', newHl); }} />
              {/* Untuk bagian Customer Headlines */}
                <button 
                  onClick={() => { 
                  const newHl = data.headlines.customer.filter((_, idx) => idx !== i); 
                  updateData('headlines.customer', newHl); }} 
                  className="action-btn mt-3 text-slate-300 hover:text-red-500 opacity-0 transition-all group-hover:opacity-100">
                  <i className="fa-solid fa-trash"></i>
                </button>             
               </div>
            ))}
          </div>
          <button className="add-btn" onClick={() => updateData('headlines.customer', [...data.headlines.customer, ''])}>+ Tambah Customer Headline</button>
        </div>
        <div className="card headline-card flex-1 min-h-[300px] md:min-h-0">
          <h3 className="text-aksana-success">Internal Headlines</h3>
          <div className="mt-4">
            {data.headlines.internal.map((hl, i) => (
              <div key={i} className="group flex items-start gap-4 mb-3">
                <span className="mt-3 text-lg font-extrabold text-slate-400">{i + 1}.</span>
                <Editable className="input-box flex-grow" value={hl} onChange={(val) => { const newHl = [...data.headlines.internal]; newHl[i] = val; updateData('headlines.internal', newHl); }} />
               <button onClick={() => { 
                  const newHl = data.headlines.internal.filter((_, idx) => idx !== i); 
                  updateData('headlines.internal', newHl); }} 
                  className="action-btn mt-3 text-slate-300 hover:text-red-500 opacity-0 transition-all group-hover:opacity-100">
                  <i className="fa-solid fa-trash"></i>
                </button>              
              </div>
            ))}
          </div>
          <button className="add-btn" onClick={() => updateData('headlines.internal', [...data.headlines.internal, ''])}>+ Tambah Internal Headline</button>
        </div>
      </div>
    </Slide>
  );
};

// --- SLIDE TO-DO LIST ---
export const SlideTodoList = ({ isActive }) => {
  const { data, updateData } = useMeeting();
  
  if (!isActive) return <Slide isActive={false} />;

  // Pastikan todoList selalu berupa array agar tidak error undefined
  const currentTodos = data.todoList || [];

  return (
    <Slide isActive={isActive}>
      <div className="space-y-6 flex-1 flex flex-col">
        <div>
          <h2 className="text-4xl font-bold text-black mb-1">To-Do List</h2>
          <p className="text-black font-normal">Review Minggu Lalu & Action Plan</p>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col pb-6 shadow-sm flex-1">
          <div className="space-y-3 pr-1 flex-1">
            {currentTodos.map((todo, i) => (
              <div key={todo.id || i} className="flex items-center gap-4 p-4 bg-white rounded-xl group border border-slate-200 transition-all hover:bg-slate-50 shadow-sm">
                
                {/* Tombol Checklist */}
                <button 
                  onClick={() => { 
                    const newList = [...currentTodos]; 
                    newList[i] = { ...newList[i], isDone: !todo.isDone }; 
                    updateData('todoList', newList); 
                  }} 
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${todo.isDone ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-200'}`}
                >
                  {todo.isDone && <i className="fa-solid fa-check text-sm"></i>}
                </button>
                
                <div className="flex-1 min-w-0 space-y-0.5">
                  {/* Teks Tugas Utama */}
                  <Editable 
                    value={todo.text} 
                    onChange={(val) => { 
                      const newList = [...currentTodos]; 
                      newList[i] = { ...newList[i], text: val }; 
                      updateData('todoList', newList); 
                    }} 
                    placeholder="Apa tugasnya?" 
                    className={`bg-transparent border-none focus:ring-0 w-full font-bold text-base p-0 text-black placeholder-slate-400 ${todo.isDone ? 'line-through opacity-40' : ''}`} 
                  />
                  
                  <div className="flex items-center gap-4 mt-1">
                    {/* Input Owner */}
                    <div className="flex items-start gap-1.5">
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1">Owner:</span>
                      <Editable 
                        value={todo.owner} 
                        onChange={(val) => { 
                          const newList = [...currentTodos]; 
                          newList[i] = { ...newList[i], owner: val }; 
                          updateData('todoList', newList); 
                        }} 
                        placeholder="Nama PIC"
                        className="bg-transparent border-none focus:ring-0 text-xs font-bold text-blue-500 p-0 h-auto min-w-[100px] w-auto max-w-xs" 
                      />
                    </div>
                    
                    {/* Input Deadline Date dengan Trik Lapisan Transparan & Jubah Gaib */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Deadline:</span>
                      
                      <div className="relative flex items-center cursor-pointer min-w-[85px]">
                        {/* Teks "Kembaran" (Ini yang aman dibaca oleh kamera saat difoto) */}
                        <span className="text-xs font-bold text-blue-500">
                          {todo.deadline ? todo.deadline : 'YYYY-MM-DD'}
                        </span>
                        
                        {/* Input Kalender Asli (Dibuat opacity-0 / transparan agar menutupi teks) */}
                        <input 
                          type="date" 
                          value={todo.deadline || ''} 
                          onChange={(e) => { 
                            const newList = [...currentTodos]; 
                            newList[i] = { ...newList[i], deadline: e.target.value }; 
                            updateData('todoList', newList); 
                          }} 
                          onClick={(e) => { try { e.target.showPicker(); } catch (err) {} }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          data-html2canvas-ignore="true" /* KUNCI PERBAIKAN: Sembunyikan mutlak dari jepretan kamera */
                        />
                      </div>
                    </div>

                  </div>
                </div>
                
                {/* Tombol Hapus */}
                <button 
                  onClick={() => { 
                    const newList = currentTodos.filter((_, index) => index !== i); 
                    updateData('todoList', newList); 
                  }} 
                  className="opacity-0 group-hover:opacity-100 text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-all"
                >
                  <i className="fa-solid fa-trash"></i>
                </button>
              </div>
            ))}
            
            {currentTodos.length === 0 && (
              <div className="text-center py-12 text-black font-medium">Belum ada tugas untuk minggu ini.</div>
            )}
            
            <button 
              onClick={() => updateData('todoList', [...currentTodos, { id: `todo-${Date.now()}`, text: "", owner: "PIC", isDone: false, deadline: "" }])} 
              className="w-full p-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-600 hover:text-blue-500 hover:border-blue-500 transition-all font-bold text-sm bg-white shadow-sm mt-4"
            >
              + Tambah To-Do List Baru
            </button>
          </div>
        </div>
      </div>
    </Slide>
  );
};

// --- SLIDE IDS ---
// --- SLIDE IDS 1: IDENTIFY & VOTE ---
export const SlideIdsIdentify = ({ isActive }) => {
  const { data, updateData, populateIDS } = useMeeting();
  const [isVotingMode, setIsVotingMode] = React.useState(false);

  if (!isActive) return <Slide isActive={false} />;

  const issues = data.idsSession?.issues || [];
  const selectedIssues = issues.filter(issue => issue.isSelectedForDiscussion);

  if (isVotingMode) {
    return (
      <Slide isActive={isActive}>
        <div className="space-y-6 flex-1 flex flex-col">
          <div><h2 className="text-4xl font-bold text-black mb-1">IDS: 1. Vote</h2><p className="text-black font-normal">Vote untuk masalah yang paling penting diselesaikan</p></div>
          <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col shadow-sm flex-1">
            <div className="space-y-3 pr-1 flex-1">
              {selectedIssues.sort((a, b) => (b.votes || 0) - (a.votes || 0)).map((issue) => (
                <div key={issue.id} className="flex items-center gap-3 p-4 rounded-2xl group border transition-all h-auto bg-white border-slate-200 shadow-sm">
                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] bg-white text-black border border-slate-200 font-extrabold uppercase tracking-widest shadow-sm">{issue.source}</span>
                    <p className="w-full min-h-[44px] break-words whitespace-pre-wrap bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-black transition-all">{issue.text}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => {
                      const newIssues = [...issues];
                      const idx = newIssues.findIndex(item => item.id === issue.id);
                      if(idx !== -1) {
                        newIssues[idx] = { ...newIssues[idx], votes: Math.max(0, (newIssues[idx].votes || 0) - 1) };
                        updateData('idsSession.issues', newIssues);
                      }
                    }} className="flex items-center justify-center w-10 h-10 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl transition-all active:scale-95"><i className="fa-solid fa-minus"></i></button>
                    <span className="text-2xl font-black text-blue-500 w-8 text-center">{issue.votes || 0}</span>
                    <button onClick={() => {
                      const newIssues = [...issues];
                      const idx = newIssues.findIndex(item => item.id === issue.id);
                      if(idx !== -1) {
                        newIssues[idx] = { ...newIssues[idx], votes: (newIssues[idx].votes || 0) + 1 };
                        updateData('idsSession.issues', newIssues);
                      }
                    }} className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-all active:scale-95"><i className="fa-solid fa-plus"></i></button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* BAGIAN YANG DIUBAH: Tombol terapkan hasil voting ke Discuss Matrix */}
            <div className="flex gap-4 mt-4">
              <button 
                onClick={() => setIsVotingMode(false)} 
                className="flex-1 py-3.5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-600 hover:text-blue-500 transition-all font-bold text-xs bg-white shadow-sm"
              >
                Kembali
              </button>
              <button 
                onClick={() => {
                  // 1. Urutkan berdasarkan vote terbanyak
                  const sortedSelected = [...selectedIssues].sort((a, b) => (b.votes || 0) - (a.votes || 0));
                  
                  // 2. PERBAIKAN: Gunakan Object.values agar kebal terhadap perubahan dari Firebase
                  const rawThemes = data.idsSession?.themes || {};
                  const newThemes = Object.values(rawThemes);
                  
                  // Pastikan array selalu utuh memiliki 3 kerangka Tema
                  while (newThemes.length < 3) {
                    newThemes.push({ topic: "", currentCond: "", desiredCond: "", analysis: {}, chain: [], rootCause: "", plan: {} });
                  }
                  
                  // 3. Masukkan teks isu top 1, 2, dan 3 ke topik Tema 1, 2, dan 3
                  for (let i = 0; i < 3; i++) {
                    if (sortedSelected[i]) {
                      newThemes[i] = { ...newThemes[i], topic: sortedSelected[i].text };
                    }
                  }
                  
                  // 4. Update data dan kembali ke tampilan identify
                  updateData('idsSession.themes', newThemes);
                  setIsVotingMode(false);
                }} 
                className="flex-[2] py-3.5 bg-purple-500 text-white rounded-2xl hover:bg-purple-600 transition-all active:scale-95 font-bold text-xs shadow-sm"
              >
                Selesai Voting & Terapkan ke Topik Tema (1-3)
              </button>
            </div>
          </div>
        </div>
      </Slide>
    );
  }

  return (
    <Slide isActive={isActive}>
      <div className="space-y-6 flex-1 flex flex-col">
        <div className="flex justify-between items-center flex-shrink-0">
          <div><h2 className="text-4xl font-bold text-black mb-1">IDS: 1. Identify</h2><p className="text-black font-normal">Daftar Isu dan Masalah (60 Menit Total)</p></div>
          <button onClick={populateIDS} className="flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold transition-all active:scale-95 text-sm shadow-sm"><i className="fa-solid fa-sync"></i> Tarik Data Off-Track</button>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col shadow-sm flex-1">
          <div className="space-y-3 pr-1 flex-1">
            {issues.map((issue, i) => (
              <div key={issue.id} className={`flex items-start gap-3 p-4 rounded-2xl group border transition-all h-auto ${issue.isSelectedForDiscussion ? 'bg-blue-50 border-blue-200' : (issue.isResolved ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-white border-slate-200 shadow-sm')}`}>
                <input type="checkbox" checked={issue.isResolved} onChange={(e) => {
                  const newI = [...issues]; newI[i].isResolved = e.target.checked; updateData('idsSession.issues', newI);
                }} className="mt-1.5 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                <div className="flex-1 min-w-0 space-y-1">
                  <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] bg-white text-black border border-slate-200 font-extrabold uppercase tracking-widest shadow-sm">{issue.source}</span>
                  <Editable value={issue.text} onChange={(val) => { const newI = [...issues]; newI[i].text = val; updateData('idsSession.issues', newI); }} className={`w-full min-h-[44px] break-words whitespace-pre-wrap bg-transparent border-none focus:ring-0 p-0 text-sm font-bold text-black transition-all ${issue.isResolved ? 'line-through font-medium' : ''}`} />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { const newIssues = [...issues]; newIssues[i].isSelectedForDiscussion = !newIssues[i].isSelectedForDiscussion; updateData('idsSession.issues', newIssues); }} className={`p-2 rounded-lg text-xs font-bold transition-all ${issue.isSelectedForDiscussion ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>Pilih</button>
                  <button onClick={() => { const newI = issues.filter((_, idx) => idx !== i); updateData('idsSession.issues', newI); }} className="opacity-0 group-hover:opacity-100 text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0"><i className="fa-solid fa-trash"></i></button>
                </div>
              </div>
            ))}
            <button onClick={() => updateData('idsSession.issues', [...issues, { id: `manual-${Date.now()}`, source: 'Manual', text: 'Masalah baru...', isResolved: false, isSelectedForDiscussion: false, votes: 0 }])} className="w-full py-3.5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-600 hover:text-blue-500 transition-all font-bold text-xs bg-white shadow-sm">+ Input Masalah Baru</button>
          </div>
          {selectedIssues.length > 0 && 
            <button onClick={() => setIsVotingMode(true)} className="mt-4 w-full py-4 bg-blue-500 text-white font-bold rounded-2xl hover:bg-blue-600 transition-all active:scale-95">Lanjutkan ke Voting ({selectedIssues.length} Isu)</button>
          }
        </div>
      </div>
    </Slide>
  );
};

// --- SLIDE IDS 2: DISCUSS MATRIX ---
export const SlideIdsDiscuss = ({ isActive, exportThemeIndex }) => { 
  const { data, updateData } = useMeeting();
  const [activeThemeTab, setActiveThemeTab] = React.useState(0);

  if (!isActive) return <Slide isActive={false} />;

  const effectiveTab = exportThemeIndex !== undefined ? exportThemeIndex : activeThemeTab;

  // Ambil data asli dari state
  const rawThemes = data.idsSession?.themes || [];
  // Pastikan selalu dalam format array (jaga-jaga jika terlanjur jadi object karena bug sebelumnya)
  const themesArray = Array.isArray(rawThemes) ? rawThemes : Object.values(rawThemes);
  
  const currentTheme = themesArray[effectiveTab] || { topic: "", currentCond: "", desiredCond: "", analysis: {}, chain: Array.from({ length: 5 }, () => ({ effect: "", cause: "" })), rootCause: "", plan: {} };

// KUNCI PERBAIKAN: Fungsi khusus untuk mengupdate seluruh array themes secara presisi (Deep Merge Modern)
  const handleThemeUpdate = (fieldPath, value) => {
    // 1. Ambil seluruh data Tema (dan pastikan selalu berjumlah 3)
    const newThemes = [...themesArray];
    while(newThemes.length < 3) {
      newThemes.push({ topic: "", currentCond: "", desiredCond: "", analysis: {}, chain: Array.from({ length: 5 }, () => ({ effect: "", cause: "" })), rootCause: "", plan: {} });
    }

    // 2. Tentukan tema mana yang sedang diedit (berdasarkan tab aktif)
    const targetIdx = effectiveTab;
    
    // 3. Update spesifik menggunakan modern destructuring (Anti-Bocor antar tema)
    if (fieldPath.startsWith('analysis.')) {
      const field = fieldPath.split('.')[1];
      newThemes[targetIdx] = { 
        ...newThemes[targetIdx], 
        analysis: { ...(newThemes[targetIdx].analysis || {}), [field]: value } 
      };
    } 
    else if (fieldPath.startsWith('chain.')) {
      const parts = fieldPath.split('.'); // ['chain', '0', 'effect']
      const cIdx = parseInt(parts[1]);
      const field = parts[2];
      
      // PERBAIKAN: Tangkap data chain, dan paksa menjadi Array jika Firebase mengubahnya jadi Object
      const currentChain = newThemes[targetIdx].chain || [];
      const safeChain = Array.isArray(currentChain) ? currentChain : Object.values(currentChain);
      
      const newChain = [...safeChain];
      
      // Pastikan form 5-Why selalu utuh 5 baris
      while(newChain.length < 5) {
        newChain.push({ effect: "", cause: "" });
      }

      newChain[cIdx] = { ...newChain[cIdx], [field]: value };
      newThemes[targetIdx] = { ...newThemes[targetIdx], chain: newChain };
    }
    else if (fieldPath.startsWith('plan.')) {
      const field = fieldPath.split('.')[1];
      newThemes[targetIdx] = { 
        ...newThemes[targetIdx], 
        plan: { ...(newThemes[targetIdx].plan || {}), [field]: value } 
      };
    } 
    else {
      // Untuk field utama yang ada di akar objek (seperti 'rootCause', 'topic', 'currentCond', 'desiredCond')
      newThemes[targetIdx] = { ...newThemes[targetIdx], [fieldPath]: value };
    }

    // 4. Kirim SELURUH array yang sudah dirapikan ke Firebase
    updateData('idsSession.themes', newThemes);
  };
  return (
    <Slide isActive={isActive}>
      <div className="space-y-4 flex-1 flex flex-col h-full w-full">
        <div className="flex justify-between items-center flex-shrink-0">
          <div><h2 className="text-3xl font-black text-black mb-0.5">IDS: 2. Discuss Matrix</h2><p className="text-sm font-bold text-purple-600">Analisis Akar Masalah (Fishbone 5M & Rencana 5W+1H)</p></div>
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
            {[0, 1, 2].map((idx) => (
              <button key={idx} type="button" onClick={() => setActiveThemeTab(idx)} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${effectiveTab === idx ? 'bg-white text-purple-600 shadow-md scale-105' : 'text-slate-500 hover:text-slate-800'}`}><span className="flex items-center gap-1.5"><i className="fa-solid fa-layer-group"></i> Tema {idx + 1}</span></button>
            ))}
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-xl flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar gap-5">
          {/* Judul Tema */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <label className="text-xs font-black text-purple-500 uppercase tracking-widest block mb-1">Judul Topik / Masalah Tema {effectiveTab + 1}</label>
            <Editable value={currentTheme.topic} onChange={(val) => handleThemeUpdate('topic', val)} placeholder="Tuliskan nama topik/isu besar yang sedang dibahas di sini..." className="bg-transparent font-black text-xl text-black outline-none border-none p-0" />
          </div>
          
          {/* Kondisi Sekarang vs Ideal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border border-slate-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-slate-500/20 transition-all"><label className="text-xs font-black text-slate-600 uppercase tracking-widest block mb-2">1. Kondisi Sekarang (Current State)</label><Editable value={currentTheme.currentCond} onChange={(val) => handleThemeUpdate('currentCond', val)} placeholder="Bagaimana realita buruk atau hambatan di lapangan saat ini?" className="bg-transparent text-base font-semibold text-black outline-none border-none p-0" /></div>
            <div className="p-4 border border-slate-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-slate-500/20 transition-all"><label className="text-xs font-black text-slate-600 uppercase tracking-widest block mb-2">2. Kondisi Diinginkan (Goal State)</label><Editable value={currentTheme.desiredCond} onChange={(val) => handleThemeUpdate('desiredCond', val)} placeholder="Target pencapaian ideal atau standar kuantitas yang ingin dituju?" className="bg-transparent text-base font-semibold text-black outline-none border-none p-0" /></div>
          </div>
          
          {/* Fishbone 5M */}
          <div className="space-y-2">
            <label className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5"><i className="fa-solid fa-file-excel text-purple-500"></i> 3. Analisa Kondisi yang Ada (Kerangka Fishbone 5M)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {['man', 'method', 'machine', 'material', 'environment'].map((mField) => (
                <div key={mField} className="p-3 border border-slate-200 rounded-xl bg-slate-50/50 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-500/30 transition-all">
                  <label className="text-xs font-extrabold text-slate-500 uppercase block mb-1">{mField}</label>
                  <Editable value={currentTheme.analysis?.[mField] || ""} onChange={(val) => handleThemeUpdate(`analysis.${mField}`, val)} placeholder={`Faktor ${mField}...`} className="bg-transparent text-sm font-bold text-black outline-none border-none p-0 placeholder-slate-400" />
                </div>
              ))}
            </div>
          </div>
          
          {/* 5-Why Chain */}
          <div className="p-5 border border-slate-200 rounded-xl bg-white space-y-3">
            <label className="text-sm font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5"><i className="fa-solid fa-circle-question"></i> 4. Analisa Sebab Akibat (5-Why Chain Analysis)</label>
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map((cIdx) => {
                const item = (currentTheme.chain && currentTheme.chain[cIdx]) || { effect: "", cause: "" };
                return (
                  <div key={cIdx} className="flex items-start gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-sm font-black text-slate-400 w-5">{cIdx + 1}.</span>
                    <Editable 
                      value={item.effect} 
                      onChange={(val) => handleThemeUpdate(`chain.${cIdx}.effect`, val)} 
                      placeholder="Akibat / Gejala Masalah" 
                      className="flex-1 bg-transparent text-sm font-bold text-black outline-none border-none p-0" 
                    />
                    <span className="text-sm font-black text-purple-500 uppercase px-2 mt-0.5">karena</span>
                    <Editable 
                      value={item.cause} 
                      onChange={(val) => handleThemeUpdate(`chain.${cIdx}.cause`, val)} 
                      placeholder="Sebab / Pemicu Masalah" 
                      className="flex-1 bg-transparent text-sm font-bold text-black outline-none border-none p-0" 
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-3">
              <span className="text-sm font-black text-slate-700 uppercase whitespace-nowrap">Akar Masalahnya Adalah:</span>
              <Editable value={currentTheme.rootCause} onChange={(val) => handleThemeUpdate('rootCause', val)} placeholder="Tulis kesimpulan akar masalah terdalam (Root Cause) hasil telaah 5-Why di atas..." className="flex-1 bg-transparent text-base font-black text-black border-b-2 border-dashed border-purple-400 focus:border-purple-500 outline-none p-0" />
            </div>
          </div>
          
          {/* 5W+1H */}
          <div className="p-5 border border-purple-200 rounded-xl bg-purple-50/30 space-y-3">
            <label className="text-sm font-black text-purple-600 uppercase tracking-wider block">5. Rencana Perbaikan (Action Plan 5W+1H Matrix)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { field: 'what', label: 'Apa yang dilakukan? (What)' }, { field: 'who', label: 'Siapa yang bertugas? (Who)' }, { field: 'when', label: 'Kapan akan selesai? (When)' }, 
                { field: 'where', label: 'Dimana dikerjakan? (Where)' }, { field: 'why', label: 'Kenapa harus dilakukan? (Why)' }, { field: 'cost', label: 'Berapa biayanya? (Cost)' }
              ].map((pItem) => (
                <div key={pItem.field} className="p-3 bg-white border border-slate-200 rounded-xl transition-all focus-within:ring-2 focus-within:ring-purple-500/30">
                  <label className="text-xs font-black text-slate-500 block mb-1.5 uppercase tracking-wide">{pItem.label}</label>
                  <Editable value={currentTheme.plan?.[pItem.field] || ""} onChange={(val) => handleThemeUpdate(`plan.${pItem.field}`, val)} placeholder="Isian deskripsi..." className="bg-transparent text-sm font-black text-black outline-none border-none p-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Slide>
  );
};
// --- SLIDE IDS 3: SOLVE ---
export const SlideIdsSolve = ({ isActive }) => {
  const { data, updateData } = useMeeting();
  
  if (!isActive) return <Slide isActive={false} />;

  // Fungsi untuk menarik data dari Action Plan (5W+1H) di Discuss Matrix
  const handlePullActionPlan = () => {
    const themes = Object.values(data.idsSession?.themes || {});
    let pulledText = "";
    
    themes.forEach((theme, idx) => {
      const plan = theme.plan || {};
      const hasPlan = plan.what || plan.who || plan.when || plan.where || plan.why || plan.cost;
      
      if (hasPlan) {
        pulledText += `TEMA ${idx + 1}: ${theme.topic || 'Tanpa Judul'}\n`;
        if (plan.what) pulledText += `• What (Apa): ${plan.what}\n`;
        if (plan.who) pulledText += `• Who (Siapa): ${plan.who}\n`;
        if (plan.when) pulledText += `• When (Kapan): ${plan.when}\n`;
        if (plan.where) pulledText += `• Where (Di mana): ${plan.where}\n`;
        if (plan.why) pulledText += `• Why (Kenapa): ${plan.why}\n`;
        if (plan.cost) pulledText += `• Cost (Biaya): ${plan.cost}\n`;
        pulledText += `\n`;
      }
    });

    if (!pulledText) {
      alert("Belum ada data Action Plan 5W+1H yang diisi di Discuss Matrix.");
      return;
    }

    const currentSolutions = data.idsSession?.solutions || "";
    const separator = currentSolutions.trim() ? "\n\n--- HASIL TARIK ACTION PLAN (5W+1H) ---\n\n" : "";
    const newFinalText = currentSolutions + separator + pulledText.trim();

    updateData('idsSession.solutions', newFinalText);
  };

  return (
    <Slide isActive={isActive}>
      <div className="space-y-6 flex-1 flex flex-col h-full w-full min-h-0">
        
        <div className="flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-4xl font-bold text-black mb-1">IDS Session</h2>
            <p className="text-black font-normal">3. Solve / Resolutions</p>
          </div>
          <button 
            onClick={handlePullActionPlan}
            className="flex items-center gap-2 px-5 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-2xl font-bold transition-all active:scale-95 text-sm shadow-sm"
          >
            <i className="fa-solid fa-download"></i> Tarik Action Plan (5W+1H)
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-8 flex flex-col shadow-sm flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar">
          <h3 className="text-base font-black border-b border-slate-200 pb-4 text-purple-500 uppercase tracking-wider shadow-sm flex-shrink-0">
            Solusi Final & Eksekusi
          </h3>
          
          {/* PERBAIKAN: Menggunakan komponen Editable yang memiliki "Kembaran Gaib", bukan textarea biasa! */}
          <div className="mt-5 w-full flex-1">
            <Editable 
              value={data.idsSession?.solutions || ''} 
              onChange={(val) => updateData('idsSession.solutions', val)} 
              placeholder="Apa keputusan akhir atau solusi konkritnya? Tulis manual di sini atau klik tombol 'Tarik Action Plan' di atas..." 
              className="w-full bg-transparent text-black outline-none text-base font-bold leading-relaxed min-h-[300px]" 
            />
          </div>
        </div>
        
      </div>
    </Slide>
  );
};

// --- SLIDE AKHIR ---
export const SlideAkhir = ({ isActive }) => {
  const { data, updateData } = useMeeting();
  
  // Kalkulasi average hanya jika slide ini dirender (optimasi performa)
  const relevantRatings = data.attendances.map(a => parseFloat(data.ratings['rating_id_' + a.id])).filter(v => !isNaN(v) && v > 0);
  const averageRaw = relevantRatings.length ? (relevantRatings.reduce((a, b) => a + b, 0) / relevantRatings.length) : 0;
  const averageRating = parseFloat(averageRaw.toFixed(1));

  if (!isActive) return <Slide isActive={false} />;

  return (
    <Slide isActive={isActive}>
      <div className="flex flex-col gap-1 mb-4">
        <h1>Segmen Akhir</h1>
        <div className="subtitle">Rating Rapat & Penutup (5 Menit)</div>
      </div>
      <div className="card h-auto">
        <h3>Beri Rating Rapat (1-10)</h3>
        <div className="grid grid-cols-2 gap-4 my-8 md:grid-cols-3 lg:grid-cols-5">
          {data.attendances.filter(a => a.checked).map((attendee) => {
            const roleKey = 'rating_id_' + attendee.id;
            return (
              <div key={attendee.id} className="flex flex-col items-center p-4 border rounded-xl border-slate-100 bg-white shadow-sm hover:border-aksana-primary">
                <label className="mb-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">{attendee.name || "Isi Nama..."}</label>
                <input type="number" min="1" max="10" className="w-16 h-12 border-2 rounded-lg text-center text-2xl font-bold text-aksana-primary border-slate-200 outline-none transition-all focus:border-aksana-accent focus:ring-4 focus:ring-blue-50" value={data.ratings[roleKey] ?? ''} onChange={(e) => updateData(`ratings.${roleKey}`, e.target.value)} />
              </div>
            );
          })}
        </div>
        <div className="flex flex-col items-center mt-8 pt-8 border-t border-slate-100">
          <div className="mb-2 text-sm font-bold text-slate-400 uppercase tracking-[3px]">Rata-Rata Rating</div>
          <div className="leading-none text-7xl font-black text-aksana-primary md:text-9xl">{averageRating}</div>
        </div>
        <p className="text-center text-[var(--text-light)] mt-[30px] text-[18px] italic">"Rapat yang hebat dimulai dari kedisiplinan dan diakhiri dengan komitmen."</p>
      </div>
    </Slide>
  );
};

export const SlideScorecard = ({ isActive, kpiCategory, title }) => {
  const { data, updateData, updateListItem, deleteListItem, addRow } = useMeeting();
  if (!isActive) return <Slide isActive={false} />; // Skip proses jika tidak aktif
  
  return (
    <Slide isActive={isActive}>
     <span className="text-3xl font-black text-aksana-primary">Scorecard : {title}</span>
      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[600px]">
           <thead><tr><th>KPI</th><th>Target</th><th>Realisasi</th><th>Jenis</th><th>Status</th><th></th></tr></thead>
           <tbody>
             {data[kpiCategory]?.map((item, i) => (
               <tr key={i} className="group">
                 <td><Editable value={item.kpi} onChange={(v) => updateListItem(kpiCategory, i, 'kpi', v)} /></td>
                 <td><Editable value={item.target} onChange={(v) => updateListItem(kpiCategory, i, 'target', v)} /></td>
                 <td><Editable value={item.real} onChange={(v) => updateListItem(kpiCategory, i, 'real', v)} /></td>
                 <td align="center"><JenisButton jenis={item.jenis} onClick={() => updateListItem(kpiCategory, i, 'jenis', cycleJenis(item.jenis))} /></td>
                 <td align="center"><StatusButton status={item.status} onClick={() => updateListItem(kpiCategory, i, 'status', item.status === 'on' ? 'off' : 'on')} /></td>
                 <td align="center"><button onClick={() => deleteListItem(kpiCategory, i)} className="text-red-500 opacity-0 group-hover:opacity-100"><i className="fa-solid fa-trash"></i></button></td>
               </tr>
             ))}
           </tbody>
        </table>
        <button className="mt-4 font-bold text-aksana-accent" onClick={() => addRow(kpiCategory, { kpi: '', target: '', real: '', jenis: 'leading', status: 'on' })}>+ Tambah KPI</button>
      </div>
    </Slide>
  );
};
