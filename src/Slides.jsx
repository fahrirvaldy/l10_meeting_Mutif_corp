import React from 'react';
import { useMeeting } from './MeetingContext';
import { Editable, StatusButton, JenisButton, OutcomeButton, cycleJenis } from './Components';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  IdsStepper,
  ProgressBar,
  SlideHeader,
  useConfirm,
  useToast,
} from './ui';
import {
  getRootCauseLabel,
  getThemes,
  hasText,
} from './idsModel';

// Wrapper agar slide yang tidak aktif tetap ada di DOM untuk cetak PDF, namun CSS-nya menyembunyikannya
export const Slide = ({ isActive, children, label }) => (
  <section
    className={`slide ${isActive ? 'active' : 'hidden'}`}
    aria-label={label}
    aria-hidden={isActive ? undefined : true}
  >
    {children}
  </section>
);

const sourceTone = (source) => {
  if (source === 'Rocks') return 'violet';
  if (source === 'Manual') return 'slate';
  return 'blue';
};

/* --------------------------------------------------------------------------
   Daftar isu IDS: pengelompokan divisi + baris ringkas
   -------------------------------------------------------------------------- */
const SCORECARD_KEYS = ['dmlKPI', 'smKPI', 'msKPI', 'khlKPI', 'pmKPI', 'asKPI', 'mcpKPI'];
const ISSUE_GROUP_ORDER = [...SCORECARD_KEYS, 'legacy', 'rockReview', 'manual'];

const getIssueGroupLabel = (key, scorecardTitles = {}) => {
  if (key === 'rockReview') return 'Rocks';
  if (key === 'manual') return 'Manual';
  if (key === 'legacy') return 'Scorecard lainnya';
  return scorecardTitles?.[key] || 'Scorecard';
};

const getIssueGroupIcon = (key) => {
  if (key === 'rockReview') return 'fa-flag';
  if (key === 'manual') return 'fa-pen';
  if (key === 'legacy') return 'fa-circle-question';
  return 'fa-bullseye';
};

const createManualIssueId = () => `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Isu lama belum menyimpan groupKey, jadi kelompoknya ditentukan dari sumber/teks.
const resolveIssueGroupKey = (issue, data) => {
  if (issue.groupKey && ISSUE_GROUP_ORDER.includes(issue.groupKey)) return issue.groupKey;
  if (issue.source === 'Manual') return 'manual';
  if (issue.source === 'Rocks') return 'rockReview';

  const matchedKey = SCORECARD_KEYS.find((key) =>
    (data[key] || []).some((item) => item.kpi === issue.text),
  );
  return matchedKey || 'legacy';
};

const groupIssuesByDivision = (issues, data) => {
  const buckets = new Map();

  issues.forEach((issue, index) => {
    const key = resolveIssueGroupKey(issue, data);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({ issue, index });
  });

  return ISSUE_GROUP_ORDER
    .filter((key) => buckets.has(key))
    .map((key) => ({
      key,
      label: getIssueGroupLabel(key, data.scorecardTitles),
      items: buckets.get(key),
    }));
};

const IssueTextCell = ({ value, isResolved, onCommit }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value || '');

  React.useEffect(() => {
    if (!isEditing) setDraft(value || '');
  }, [value, isEditing]);

  const commit = () => {
    setIsEditing(false);
    if (draft !== (value || '')) onCommit(draft);
  };

  const cancel = () => {
    setDraft(value || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <textarea
        autoFocus
        value={draft}
        rows={1}
        aria-label="Edit deskripsi isu"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.blur();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
          }
        }}
        className="issue-edit text-sm font-bold text-black"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      title={value || 'Klik untuk mengedit'}
      aria-label={`Edit isu: ${value || 'tanpa judul'}`}
      className="w-full cursor-text text-left transition-colors"
    >
      <span
        className={`issue-text text-sm font-bold leading-snug text-black ${
          isResolved ? 'line-through font-medium' : ''
        }`}
      >
        {value || 'Tulis isu…'}
      </span>
    </button>
  );
};

const formatDeadline = (value) => {
  if (!value) return 'Pilih tanggal';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

// -- SLIDE COVER ---
export const SlideCover = ({ isActive }) => {
  const { data } = useMeeting();
  const attendances = data.attendances || [];
  const presentCount = attendances.filter((item) => item.checked).length;

  if (!isActive) return <Slide isActive={false} />;

  return (
    <Slide isActive={isActive} label="Cover rapat">
      <div className="flex flex-1 flex-col items-center justify-center py-4 text-center">
        <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
          <div
            className="h-1.5 w-full bg-gradient-to-r from-aksana-primary via-aksana-accent to-aksana-ids"
            aria-hidden="true"
          />
          <div className="px-6 py-10 md:px-14 md:py-14">
            <Badge tone="blue" className="mb-5">
              <i className="fa-solid fa-people-group" aria-hidden="true" /> Level 10 Meeting
            </Badge>
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.3em] text-slate-400">
              Tanggal Rapat
            </p>
            <div className="mt-3 text-3xl font-black leading-tight tracking-tight text-aksana-primary md:text-5xl">
              {data.meetingDate || 'Tanggal belum diatur'}
            </div>
            <p className="mt-4 text-sm font-bold uppercase tracking-[0.22em] text-aksana-accent">
              MUTIF CORP
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-slate-100 bg-slate-50/80 px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <span className="inline-flex items-center gap-2">
              <i className="fa-regular fa-clock" aria-hidden="true" /> 90 menit
            </span>
            <span className="inline-flex items-center gap-2">
              <i className="fa-solid fa-users" aria-hidden="true" /> {presentCount}/{attendances.length} hadir
            </span>
            <span className="inline-flex items-center gap-2">
              <i className="fa-solid fa-list-check" aria-hidden="true" /> 7 segmen
            </span>
          </div>
        </div>
      </div>
    </Slide>
  );
};

// --- SLIDE AWAL ---
export const SlideAwal = ({ isActive }) => {
  const { data, updateData, handleUpdateAttendance } = useMeeting();
  const attendances = data.attendances || [];
  const presentCount = attendances.filter((item) => item.checked).length;

  if (!isActive) return <Slide isActive={false} />;

  const goodNewsFields = [
    { field: 'owner', label: 'Owner', placeholder: 'Kabar baik dari owner…' },
    { field: 'integrator', label: 'Integrator', placeholder: 'Kabar baik dari integrator…' },
    { field: 'team', label: 'Perwakilan Tim', placeholder: 'Kabar baik dari perwakilan tim…' },
  ];

  return (
    <Slide isActive={isActive} label="Segmen awal">
      <SlideHeader
        kicker="Segmen 1"
        title="Segmen Awal"
        subtitle="Kehadiran & kabar baik · 5 menit"
        badge={<Badge tone={presentCount === attendances.length ? 'emerald' : 'blue'}>{presentCount}/{attendances.length} hadir</Badge>}
      />

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
        <Card className="mt-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="mb-0 flex items-center gap-2">
              <i className="fa-solid fa-users text-aksana-accent" aria-hidden="true" /> Daftar Hadir
            </h3>
            <Badge tone="slate">Centang yang hadir</Badge>
          </div>
          <div id="attendance-grid" className="flex flex-col gap-2">
            {attendances.map((item) => (
              <label
                key={item.id}
                data-export-block
                className={`group flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-all ${
                  item.checked
                    ? 'border-emerald-200 bg-emerald-50/70'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => handleUpdateAttendance(item.id, 'checked', e.target.checked)}
                  className="h-5 w-5 shrink-0 cursor-pointer accent-aksana-primary"
                  aria-label={`${item.name || 'Peserta'} hadir`}
                />
                <span
                  className={`min-w-0 flex-1 truncate text-sm font-semibold ${
                    item.checked ? 'text-slate-800' : 'text-slate-600'
                  }`}
                >
                  {item.name || 'Peserta tanpa nama'}
                </span>
                <i
                  className={`fa-solid fa-circle-check shrink-0 text-emerald-500 transition-opacity ${
                    item.checked ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden="true"
                />
              </label>
            ))}
          </div>
        </Card>

        <Card className="mt-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="mb-0 flex items-center gap-2">
              <i className="fa-solid fa-hand-sparkles text-aksana-accent" aria-hidden="true" /> Good News
            </h3>
            <Badge tone="emerald">Kabar syukur</Badge>
          </div>
          <div className="flex flex-col gap-4">
            {goodNewsFields.map((field) => (
              <div key={field.field} data-export-block>
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  {field.label}
                </span>
                <Editable
                  label={`Good news ${field.label}`}
                  className="input-box mt-1.5"
                  value={data.goodNews?.[field.field] || ''}
                  onChange={(val) => updateData(`goodNews.${field.field}`, val)}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Slide>
  );
};

// --- SLIDE ROCK REVIEW ---
export const SlideRock = ({ isActive }) => {
  const { data, updateListItem, deleteListItem, addRow } = useMeeting();
  const confirm = useConfirm();
  const rocks = data.rockReview || [];

  if (!isActive) return <Slide isActive={false} />;

  const addRock = () => addRow('rockReview', { owner: '', rock: '', status: 'on', note: '' });

  const handleDelete = async (index, item) => {
    const approved = await confirm({
      title: 'Hapus Rock?',
      description: `"${item.rock || 'Rock tanpa judul'}" akan dihapus dari daftar prioritas 90 hari.`,
      confirmLabel: 'Hapus Rock',
      tone: 'danger',
    });
    if (approved) deleteListItem('rockReview', index);
  };

  return (
    <Slide isActive={isActive} label="Rock review">
      <SlideHeader
        kicker="Segmen 2"
        title="Rock Review"
        subtitle="Prioritas 90 hari · 5 menit"
        badge={<Badge tone="slate">{rocks.length} rock</Badge>}
      />

      <Card className="mt-5 flex-1">
        {rocks.length === 0 ? (
          <EmptyState
            icon="fa-flag"
            title="Belum ada Rock"
            description="Rock adalah prioritas utama 90 hari. Tambahkan 3–7 prioritas agar fokus rapat tetap terjaga."
            action={
              <Button variant="accent" size="sm" onClick={addRock} data-html2canvas-ignore="true">
                <i className="fa-solid fa-plus" aria-hidden="true" /> Tambah Rock Pertama
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="responsive-table min-w-[640px] md:min-w-full">
                <thead>
                  <tr>
                    <th scope="col" className="w-[15%]">Owner</th>
                    <th scope="col" className="w-[38%]">Rock</th>
                    <th scope="col" className="w-[15%] text-center">Status</th>
                    <th scope="col" className="w-[27%]">Catatan</th>
                    <th scope="col" className="w-[5%]"><span className="sr-only">Aksi</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rocks.map((item, i) => (
                    <tr key={i} className="group" data-export-block>
                      <td data-label="Owner">
                        <Editable
                          label={`Owner rock ${i + 1}`}
                          value={item.owner}
                          onChange={(val) => updateListItem('rockReview', i, 'owner', val)}
                          placeholder="Input Owner…"
                        />
                      </td>
                      <td data-label="Rock">
                        <Editable
                          label={`Rock ${i + 1}`}
                          value={item.rock}
                          onChange={(val) => updateListItem('rockReview', i, 'rock', val)}
                          placeholder="Tulis prioritas…"
                        />
                      </td>
                      <td data-label="Status" className="text-center">
                        <StatusButton
                          status={item.status}
                          onClick={() => updateListItem('rockReview', i, 'status', item.status === 'on' ? 'off' : 'on')}
                        />
                      </td>
                      <td data-label="Catatan">
                        <Editable
                          label={`Catatan rock ${i + 1}`}
                          value={item.note}
                          onChange={(val) => updateListItem('rockReview', i, 'note', val)}
                          placeholder="Catatan progres…"
                        />
                      </td>
                      <td data-label="" className="responsive-table-action">
                        <button
                          type="button"
                          onClick={() => handleDelete(i, item)}
                          className="row-action"
                          aria-label={`Hapus rock ${item.rock || i + 1}`}
                          data-html2canvas-ignore="true"
                        >
                          <i className="fa-solid fa-trash" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="add-btn"
              onClick={addRock}
              data-html2canvas-ignore="true"
            >
              + Tambah Rock / Prioritas Baru
            </button>
          </>
        )}
      </Card>
    </Slide>
  );
};

// --- SLIDE HEADLINES ---
export const SlideHeadlines = ({ isActive }) => {
  const { data, updateData } = useMeeting();
  const confirm = useConfirm();

  if (!isActive) return <Slide isActive={false} />;

  const columns = [
    {
      key: 'customer',
      title: 'Customer Headlines',
      icon: 'fa-briefcase',
      tone: 'blue',
      accent: 'text-aksana-accent',
      emptyTitle: 'Belum ada headline customer',
      emptyDesc: 'Catat kabar penting dari pelanggan yang perlu diketahui tim.',
    },
    {
      key: 'internal',
      title: 'Internal Headlines',
      icon: 'fa-people-group',
      tone: 'emerald',
      accent: 'text-aksana-success',
      emptyTitle: 'Belum ada headline internal',
      emptyDesc: 'Catat kabar penting internal, misalnya perubahan tim atau proses.',
    },
  ];

  const addHeadline = (type) =>
    updateData(`headlines.${type}`, (currentList) => [...(currentList || []), '']);

  const removeHeadline = async (type, index) => {
    const list = data.headlines?.[type] || [];
    const approved = await confirm({
      title: `Hapus ${type === 'customer' ? 'Customer' : 'Internal'} Headline?`,
      description: list[index]
        ? `"${list[index]}" akan dihapus dari daftar.`
        : 'Headline kosong ini akan dihapus dari daftar.',
      confirmLabel: 'Hapus Headline',
      tone: 'danger',
    });
    if (approved) {
      updateData(`headlines.${type}`, (currentList) =>
        (currentList || []).filter((_, i) => i !== index),
      );
    }
  };

  return (
    <Slide isActive={isActive} label="Headlines">
      <SlideHeader
        kicker="Segmen 3"
        title="Headlines"
        subtitle="Berita penting · customer & internal · 5 menit"
        badge={
          <Badge tone="slate">
            {(data.headlines?.customer?.length || 0) + (data.headlines?.internal?.length || 0)} headline
          </Badge>
        }
      />

      <div className="mt-5 flex flex-col gap-5 md:flex-row md:gap-6">
        {columns.map((column) => {
          const list = data.headlines?.[column.key] || [];
          return (
            <Card key={column.key} className="mt-0 flex-1">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className={`mb-0 flex items-center gap-2 ${column.accent}`}>
                  <i className={`fa-solid ${column.icon}`} aria-hidden="true" /> {column.title}
                </h3>
                <Badge tone={column.tone}>{list.length} item</Badge>
              </div>

              {list.length === 0 ? (
                <EmptyState
                  icon={column.icon}
                  title={column.emptyTitle}
                  description={column.emptyDesc}
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addHeadline(column.key)}
                      data-html2canvas-ignore="true"
                    >
                      <i className="fa-solid fa-plus" aria-hidden="true" /> Tambah Headline
                    </Button>
                  }
                />
              ) : (
                <>
                  <div>
                    {list.map((headline, i) => (
                      <div key={i} data-export-block className="group flex items-start gap-2.5 sm:gap-3">
                        <span className="mt-2.5 w-5 shrink-0 text-right text-sm font-extrabold text-slate-400">
                          {i + 1}.
                        </span>
                        <Editable
                          label={`${column.title} ${i + 1}`}
                          className="input-box flex-grow"
                          value={headline}
                          onChange={(val) => {
                            updateData(`headlines.${column.key}`, (currentList) => {
                              const nextList = [...(currentList || [])];
                              nextList[i] = val;
                              return nextList;
                            });
                          }}
                          placeholder="Tulis headline…"
                        />
                        <button
                          type="button"
                          onClick={() => removeHeadline(column.key, i)}
                          className="row-action mt-1"
                          aria-label={`Hapus ${column.title} ${i + 1}`}
                          data-html2canvas-ignore="true"
                        >
                          <i className="fa-solid fa-trash" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="add-btn"
                    onClick={() => addHeadline(column.key)}
                    data-html2canvas-ignore="true"
                  >
                    + Tambah {column.title}
                  </button>
                </>
              )}
            </Card>
          );
        })}
      </div>
    </Slide>
  );
};

// --- SLIDE TO-DO LIST ---
export const SlideTodoList = ({ isActive }) => {
  const { data, updateData } = useMeeting();
  const confirm = useConfirm();

  if (!isActive) return <Slide isActive={false} />;

  // Pastikan todoList selalu berupa array agar tidak error undefined
  const currentTodos = data.todoList || [];
  const doneCount = currentTodos.filter((todo) => todo.isDone).length;
  const progress = currentTodos.length ? (doneCount / currentTodos.length) * 100 : 0;

  const addTodo = () =>
    updateData('todoList', (currentList) => [
      ...(currentList || []),
      { id: `todo-${Date.now()}`, text: '', owner: 'PIC', isDone: false, deadline: '' },
    ]);

  const handleDelete = async (index, todo) => {
    const approved = await confirm({
      title: 'Hapus To-Do?',
      description: `"${todo.text || 'Tugas tanpa judul'}" akan dihapus dari daftar action plan.`,
      confirmLabel: 'Hapus To-Do',
      tone: 'danger',
    });
    if (approved) {
      updateData('todoList', (currentList) =>
        (currentList || []).filter((_, i) => i !== index),
      );
    }
  };

  return (
    <Slide isActive={isActive} label="To-do list">
      <SlideHeader
        kicker="Segmen 4"
        title="To-Do List"
        subtitle="Review minggu lalu & action plan · 5 menit"
        badge={
          <Badge tone={currentTodos.length > 0 && doneCount === currentTodos.length ? 'emerald' : 'slate'}>
            {doneCount}/{currentTodos.length} selesai
          </Badge>
        }
      />

      {currentTodos.length > 0 && (
        <ProgressBar
          value={progress}
          tone={doneCount === currentTodos.length ? 'success' : 'accent'}
          label="Progres penyelesaian to-do"
          className="mt-4"
        />
      )}

      <Card className="mt-5 flex-1">
        <div className="flex flex-1 flex-col gap-3">
          {currentTodos.map((todo, i) => (
            <div
              key={todo.id || i}
              data-export-block
              className={`group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-slate-300 hover:shadow-card sm:flex-row sm:items-start ${
                todo.isDone ? 'bg-slate-50/70' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  const newList = [...currentTodos];
                  newList[i] = { ...newList[i], isDone: !todo.isDone };
                  updateData('todoList', newList);
                }}
                aria-pressed={todo.isDone}
                aria-label={`Tandai "${todo.text || 'tugas'}" sebagai ${todo.isDone ? 'belum selesai' : 'selesai'}`}
                data-html2canvas-ignore="true"
                className={`icon-btn shrink-0 self-start rounded-full border-2 transition-colors ${
                  todo.isDone
                    ? 'border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'border-slate-300 bg-white text-slate-300 hover:border-emerald-400 hover:text-emerald-500'
                }`}
              >
                <i className="fa-solid fa-check text-sm" aria-hidden="true" />
              </button>

              <div className="min-w-0 flex-1 space-y-1.5">
                <Editable
                  label={`Teks tugas ${i + 1}`}
                  value={todo.text}
                  onChange={(val) => {
                    updateData('todoList', (currentList) => {
                      const newList = [...(currentList || [])];
                      newList[i] = { ...newList[i], text: val };
                      return newList;
                    });
                  }}
                  placeholder="Apa tugasnya?"
                  className={`w-full bg-transparent p-0 text-base font-bold text-black placeholder-slate-400 ${
                    todo.isDone ? 'line-through opacity-40' : ''
                  }`}
                />

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  {todo.isDone && (
                    <Badge tone="emerald" className="export-only">
                      Selesai
                    </Badge>
                  )}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      Owner
                    </span>
                    <Editable
                      label={`Owner tugas ${i + 1}`}
                      value={todo.owner}
                      onChange={(val) => {
                        updateData('todoList', (currentList) => {
                          const newList = [...(currentList || [])];
                          newList[i] = { ...newList[i], owner: val };
                          return newList;
                        });
                      }}
                      placeholder="Nama PIC"
                      className="min-w-[96px] bg-transparent p-0 text-xs font-bold text-blue-600"
                    />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                      Deadline
                    </span>
                    <div className="relative flex min-h-[28px] min-w-[92px] cursor-pointer items-center">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold ${
                          todo.deadline ? 'text-blue-600' : 'text-slate-400'
                        }`}
                      >
                        <i className="fa-regular fa-calendar" aria-hidden="true" />
                        {formatDeadline(todo.deadline)}
                      </span>
                      <input
                        type="date"
                        value={todo.deadline || ''}
                        onChange={(e) => {
                          updateData('todoList', (currentList) => {
                            const newList = [...(currentList || [])];
                            newList[i] = { ...newList[i], deadline: e.target.value };
                            return newList;
                          });
                        }}
                        onClick={(e) => { try { e.target.showPicker(); } catch { /* showPicker tidak didukung di semua browser */ } }}
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        aria-label={`Deadline tugas ${i + 1}`}
                        data-html2canvas-ignore="true"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(i, todo)}
                className="row-action self-end sm:self-start"
                aria-label={`Hapus tugas ${todo.text || i + 1}`}
                data-html2canvas-ignore="true"
              >
                <i className="fa-solid fa-trash" aria-hidden="true" />
              </button>
            </div>
          ))}

          {currentTodos.length === 0 && (
            <EmptyState
              icon="fa-list-check"
              title="Belum ada to-do"
              description="To-do adalah komitmen 7 hari ke depan. Tambahkan action plan pertama untuk minggu ini."
              action={
                <Button variant="accent" size="sm" onClick={addTodo} data-html2canvas-ignore="true">
                  <i className="fa-solid fa-plus" aria-hidden="true" /> Tambah To-Do
                </Button>
              }
            />
          )}

          {currentTodos.length > 0 && (
            <button
              type="button"
              onClick={addTodo}
              className="add-btn"
              data-html2canvas-ignore="true"
            >
              + Tambah To-Do List Baru
            </button>
          )}
        </div>
      </Card>
    </Slide>
  );
};

// --- SLIDE IDS ---
// --- SLIDE IDS 1: IDENTIFY & VOTE ---
const IDS_HELPERS = {
  identify: (
    <>
      <span className="font-bold text-slate-700">Langkah 1:</span> kumpulkan isu, tandai yang sudah selesai,
      lalu pilih isu yang layak dibahas.
    </>
  ),
  vote: (
    <>
      <span className="font-bold text-slate-700">Langkah 2:</span> beri suara pada isu paling berdampak.
      Tiga isu teratas menjadi topik diskusi.
    </>
  ),
  discuss: (
    <>
      <span className="font-bold text-slate-700">Langkah 3:</span> analisis akar masalah dengan Fishbone 5M,
      5-Why, lalu susun rencana 5W+1H.
    </>
  ),
  solve: (
    <>
      <span className="font-bold text-slate-700">Langkah 4:</span> tarik action plan menjadi solusi final dan
      pastikan setiap solusi punya PIC serta tenggat.
    </>
  ),
};

export const SlideIdsIdentify = ({ isActive, exportMode = false, onVotingComplete }) => {
  const { data, updateData, populateIDS } = useMeeting();
  const confirm = useConfirm();
  const [isVotingMode, setIsVotingMode] = React.useState(false);

  if (!isActive) return <Slide isActive={false} />;

  const issues = data.idsSession?.issues || [];
  const selectedIssues = issues.filter(issue => issue.isSelectedForDiscussion);
  const totalVotes = selectedIssues.reduce((sum, issue) => sum + (issue.votes || 0), 0);
  const issueGroups = groupIssuesByDivision(issues, data);

  const updateIssue = (index, patch) => {
    updateData('idsSession.issues', (currentIssues) =>
      (currentIssues || []).map((issue, issueIndex) =>
        issueIndex === index ? { ...issue, ...patch } : issue,
      ),
    );
  };

  const handleAddManualIssue = () => {
    updateData('idsSession.issues', (currentIssues) => [
      ...(currentIssues || []),
      {
        id: createManualIssueId(),
        source: 'Manual',
        groupKey: 'manual',
        text: 'Masalah baru…',
        isResolved: false,
        isSelectedForDiscussion: false,
        votes: 0,
      },
    ]);
  };

  const handleDeleteIssue = async (index, issue) => {
    const approved = await confirm({
      title: 'Hapus isu?',
      description: `Isu "${issue.text || 'tanpa judul'}" akan dihapus dari daftar Identify.`,
      confirmLabel: 'Hapus Isu',
      tone: 'danger',
    });
    if (approved) {
      updateData('idsSession.issues', (currentIssues) =>
        (currentIssues || []).filter((_, idx) => idx !== index),
      );
    }
  };

  if (isVotingMode && !exportMode) {
    // Urutan kartu mengikuti daftar Identify agar posisi tidak berubah saat
    // vote ditambah/dikurangi. Peringkat vote hanya dihitung saat diterapkan.
    const themeSlots = getThemes(data);
    const applyTargetLabel =
      themeSlots.length > 3 ? `Tema 1–${themeSlots.length}` : 'Tema 1–3';

    return (
      <Slide isActive={isActive} label="IDS vote">
        <SlideHeader
          kicker="IDS Session"
          title="Vote"
          subtitle="Pilih prioritas · 5 menit"
          badge={<Badge tone="violet">{selectedIssues.length} isu · {totalVotes} suara</Badge>}
        />
        <IdsStepper current={1} className="mt-4" />
        <p className="mt-3 text-xs font-medium leading-relaxed text-slate-500">{IDS_HELPERS.vote}</p>

        <Card className="mt-4 flex-1">
          <div className="flex flex-1 flex-col gap-3">
            {selectedIssues.length === 0 ? (
              <EmptyState
                icon="fa-check-to-slot"
                title="Belum ada isu terpilih"
                description="Kembali ke langkah Identify dan pilih minimal satu isu untuk diberi suara."
              />
            ) : (
              selectedIssues.map((issue) => (
                <div
                  key={issue.id}
                  data-export-block
                  className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-violet-200 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Badge tone={sourceTone(issue.source)}>{issue.source}</Badge>
                    <p className="m-0 min-h-[24px] whitespace-pre-wrap break-words text-sm font-bold text-black">
                      {issue.text}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        updateData('idsSession.issues', (currentIssues) =>
                          (currentIssues || []).map((item) =>
                            item.id === issue.id
                              ? { ...item, votes: Math.max(0, (item.votes || 0) - 1) }
                              : item,
                          ),
                        );
                      }}
                      className="icon-btn rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                      aria-label={`Kurangi suara untuk ${issue.text || 'isu ini'}`}
                      data-html2canvas-ignore="true"
                    >
                      <i className="fa-solid fa-minus" aria-hidden="true" />
                    </button>
                    <span
                      className="w-9 text-center text-2xl font-black text-aksana-ids"
                      aria-label={`${issue.votes || 0} suara`}
                    >
                      {issue.votes || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        updateData('idsSession.issues', (currentIssues) =>
                          (currentIssues || []).map((item) =>
                            item.id === issue.id
                              ? { ...item, votes: (item.votes || 0) + 1 }
                              : item,
                          ),
                        );
                      }}
                      className="icon-btn rounded-lg bg-aksana-ids text-white hover:bg-violet-700"
                      aria-label={`Tambah suara untuk ${issue.text || 'isu ini'}`}
                      data-html2canvas-ignore="true"
                    >
                      <i className="fa-solid fa-plus" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsVotingMode(false)}
              className="flex-1"
              data-html2canvas-ignore="true"
            >
              <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Kembali
            </Button>
            <Button
              variant="ids"
              size="md"
              className="flex-[2]"
              onClick={() => {
                // 1. Peringkat vote menentukan isu mana yang masuk tema prioritas.
                //    Salinan ini hanya dipakai untuk penerapan, bukan urutan tampilan.
                const rankedIssues = [...selectedIssues].sort(
                  (a, b) => (b.votes || 0) - (a.votes || 0),
                );

                // 2. Ambil tema ternormalisasi dari data TERBARU (minimal 3,
                //    termasuk tema tambahan) agar hasil voting tidak menimpa
                //    perubahan tema yang belum terkirim.
                // 3. Terapkan isu prioritas ke seluruh slot tema yang tersedia.
                //    Tema 1-3 tetap menjadi fokus utama; tema 4+ hanya terisi bila ada.
                // 4. Simpan hasil voting, tutup mode voting, lalu lanjut ke Discuss.
                updateData('idsSession.themes', (storedThemes) => {
                  const newThemes = getThemes({ idsSession: { themes: storedThemes } });

                  newThemes.forEach((theme, index) => {
                    if (rankedIssues[index]) {
                      newThemes[index] = { ...theme, topic: rankedIssues[index].text };
                    }
                  });

                  return newThemes;
                });
                setIsVotingMode(false);
                onVotingComplete?.();
              }}
              data-html2canvas-ignore="true"
            >
              <i className="fa-solid fa-arrow-right-to-bracket" aria-hidden="true" />
              Selesai Voting &amp; Terapkan ke {applyTargetLabel}
            </Button>
          </div>
        </Card>
      </Slide>
    );
  }

  return (
    <Slide isActive={isActive} label="IDS identify">
      <SlideHeader
        kicker="IDS Session"
        title="Identify"
        subtitle="Daftar isu & masalah · 60 menit total"
        badge={<Badge tone="blue">{issues.length} isu</Badge>}
        actions={
          <Button
            variant="danger"
            size="sm"
            onClick={populateIDS}
            aria-label="Tarik data off-track dari scorecard dan rock review"
            data-html2canvas-ignore="true"
          >
            <i className="fa-solid fa-rotate" aria-hidden="true" /> Tarik Data Off-Track
          </Button>
        }
      />
      <IdsStepper current={0} className="mt-4" />
      <p className="mt-3 text-xs font-medium leading-relaxed text-slate-500">
        {IDS_HELPERS.identify}
      </p>

      <Card className="mt-4 flex-1">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="mb-0 text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Daftar Isu
          </h3>
          <span className="text-xs font-semibold text-slate-400">
            {selectedIssues.length} dipilih untuk voting
          </span>
        </div>

        <div className="flex flex-1 flex-col">
          {issues.length === 0 ? (
            <EmptyState
              icon="fa-list-ul"
              title="Belum ada isu"
              description="Tarik otomatis KPI dan Rock yang off-track, atau tambahkan isu manual untuk mulai IDS."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="danger" size="sm" onClick={populateIDS} data-html2canvas-ignore="true">
                    <i className="fa-solid fa-rotate" aria-hidden="true" /> Tarik Off-Track
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddManualIssue}
                    data-html2canvas-ignore="true"
                  >
                    <i className="fa-solid fa-plus" aria-hidden="true" /> Input Manual
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="issue-groups">
              {issueGroups.map((group) => (
                <section
                  key={group.key}
                  className="issue-group"
                  aria-labelledby={`issue-group-${group.key}`}
                >
                  <div
                    data-export-block
                    className={`issue-group-header ${
                      group.key === 'rockReview'
                        ? 'is-rocks'
                        : group.key === 'manual' || group.key === 'legacy'
                          ? 'is-manual'
                          : ''
                    }`.trim()}
                  >
                    <h4 id={`issue-group-${group.key}`} className="issue-group-title">
                      <i className={`fa-solid ${getIssueGroupIcon(group.key)}`} aria-hidden="true" />
                      {group.label}
                    </h4>
                    <span className="issue-group-count">{group.items.length} isu</span>
                  </div>

                  <div className="issue-grid">
                    {group.items.map(({ issue, index }) => (
                      <div
                        key={issue.id || `${group.key}-${index}`}
                        data-export-block
                        className={`issue-row group ${
                          issue.isSelectedForDiscussion ? 'is-selected' : ''
                        } ${issue.isResolved ? 'is-resolved' : ''}`.trim()}
                      >
                        <input
                          type="checkbox"
                          checked={issue.isResolved}
                          onChange={(event) => updateIssue(index, { isResolved: event.target.checked })}
                          className="h-5 w-5 shrink-0 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500 md:h-4 md:w-4"
                          aria-label={`Tandai isu "${issue.text || index + 1}" selesai`}
                          data-html2canvas-ignore="true"
                        />

                        <div className="min-w-0">
                          <IssueTextCell
                            value={issue.text}
                            isResolved={issue.isResolved}
                            onCommit={(value) => updateIssue(index, { text: value })}
                          />
                          <div className="issue-row-flags">
                            {issue.isResolved && (
                              <Badge tone="emerald" className="export-only">
                                Selesai
                              </Badge>
                            )}
                            {issue.isSelectedForDiscussion && (
                              <Badge tone="blue" className="export-only">
                                Dipilih
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="issue-row-actions">
                          <button
                            type="button"
                            onClick={() => updateIssue(index, { isSelectedForDiscussion: !issue.isSelectedForDiscussion })}
                            aria-pressed={Boolean(issue.isSelectedForDiscussion)}
                            aria-label={`${issue.isSelectedForDiscussion ? 'Batalkan pilihan' : 'Pilih'} isu ${issue.text || index + 1} untuk dibahas`}
                            data-html2canvas-ignore="true"
                            className={`min-h-[44px] rounded-md px-2.5 text-[11px] font-bold transition-all md:min-h-[28px] ${
                              issue.isSelectedForDiscussion
                                ? 'bg-aksana-accent text-white hover:bg-blue-700'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {issue.isSelectedForDiscussion ? 'Dipilih' : 'Pilih'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteIssue(index, issue)}
                            className="row-action"
                            aria-label={`Hapus isu ${issue.text || index + 1}`}
                            data-html2canvas-ignore="true"
                          >
                            <i className="fa-solid fa-trash" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleAddManualIssue}
            className="add-btn"
            data-html2canvas-ignore="true"
          >
            + Input Masalah Baru
          </button>
        </div>

        {selectedIssues.length > 0 && (
          <Button
            variant="accent"
            size="md"
            onClick={() => setIsVotingMode(true)}
            className="mt-4 w-full"
            data-html2canvas-ignore="true"
          >
            <i className="fa-solid fa-check-to-slot" aria-hidden="true" />
            Lanjut ke Voting ({selectedIssues.length} isu)
          </Button>
        )}
      </Card>
    </Slide>
  );
};

// --- SLIDE IDS 3: SOLVE ---
export const SlideIdsSolve = ({ isActive }) => {
  const { data, updateData } = useMeeting();
  const toast = useToast();
  
  if (!isActive) return <Slide isActive={false} />;

  // Fungsi untuk menarik data dari matriks rencana aksi (5W+1H) di Discuss Matrix
  const handlePullActionPlan = () => {
    const themes = getThemes(data);
    let pulledText = "";

    themes.forEach((theme, idx) => {
      const tasks = (theme.tasks || []).filter((task) =>
        ['what', 'why', 'who', 'when', 'where', 'how'].some((field) => hasText(task[field])),
      );

      if (tasks.length === 0) return;

      pulledText += `TEMA ${idx + 1}: ${theme.topic || 'Tanpa Judul'}\n`;

      tasks.forEach((task, taskIndex) => {
        pulledText += `Task ${taskIndex + 1} · ${getRootCauseLabel(theme, task.rootCauseId)}\n`;
        if (hasText(task.what)) pulledText += `• What (Apa): ${task.what}\n`;
        if (hasText(task.why)) pulledText += `• Why (Kenapa): ${task.why}\n`;
        if (hasText(task.who)) pulledText += `• Who (Siapa): ${task.who}\n`;
        if (hasText(task.when)) pulledText += `• When (Kapan): ${task.when}\n`;
        if (hasText(task.where)) pulledText += `• Where (Di mana): ${task.where}\n`;
        if (hasText(task.how)) pulledText += `• How (Bagaimana): ${task.how}\n`;
      });

      pulledText += `\n`;
    });

    if (!pulledText) {
      toast('Belum ada data Action Plan 5W+1H yang diisi di Discuss Matrix.', { tone: 'warning' });
      return;
    }

    updateData('idsSession.solutions', (currentSolutions) => {
      const currentText = currentSolutions || '';
      const separator = currentText.trim() ? "\n\n--- HASIL TARIK ACTION PLAN (5W+1H) ---\n\n" : "";
      return currentText + separator + pulledText.trim();
    });
    toast('Action Plan berhasil ditarik ke solusi final.', { tone: 'success' });
  };

  const solutionsLength = (data.idsSession?.solutions || '').trim().length;

  return (
    <Slide isActive={isActive} label="IDS solve">
      <SlideHeader
        kicker="IDS Session"
        title="Solve"
        subtitle="Solusi final & eksekusi · 10 menit"
        badge={<Badge tone={solutionsLength > 0 ? 'emerald' : 'slate'}>{solutionsLength > 0 ? 'Solusi terisi' : 'Belum ada solusi'}</Badge>}
        actions={
          <Button
            variant="ids"
            size="sm"
            onClick={handlePullActionPlan}
            aria-label="Tarik action plan 5W+1H ke solusi final"
            data-html2canvas-ignore="true"
          >
            <i className="fa-solid fa-download" aria-hidden="true" /> Tarik Action Plan
          </Button>
        }
      />
      <IdsStepper current={3} className="mt-4" />
      <p className="mt-3 text-xs font-medium leading-relaxed text-slate-500">{IDS_HELPERS.solve}</p>

      <Card className="mt-4 flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
          <h3 className="mb-0 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-aksana-ids">
            <i className="fa-solid fa-clipboard-check" aria-hidden="true" /> Solusi Final & Eksekusi
          </h3>
          <Badge tone="slate">Dapat diedit langsung</Badge>
        </div>

        {/* PERBAIKAN: Menggunakan komponen Editable yang memiliki "Kembaran Gaib", bukan textarea biasa! */}
        <div className="mt-1 flex-1" data-export-block>
          <Editable 
            label="Solusi final dan eksekusi"
            value={data.idsSession?.solutions || ''} 
            onChange={(val) => updateData('idsSession.solutions', val)} 
            placeholder="Apa keputusan akhir atau solusi konkritnya? Tulis manual di sini atau klik tombol 'Tarik Action Plan' di atas…" 
            className="min-h-[300px] w-full bg-transparent text-base font-bold leading-relaxed text-black" 
          />
        </div>
      </Card>
    </Slide>
  );
};

// --- SLIDE AKHIR ---
export const SlideAkhir = ({ isActive }) => {
  const { data, updateData } = useMeeting();
  
  // Kalkulasi average hanya jika slide ini dirender (optimasi performa)
  const relevantRatings = (data.attendances || []).map(a => parseFloat(data.ratings?.['rating_id_' + a.id])).filter(v => !isNaN(v) && v > 0);
  const averageRaw = relevantRatings.length ? (relevantRatings.reduce((a, b) => a + b, 0) / relevantRatings.length) : 0;
  const averageRating = parseFloat(averageRaw.toFixed(1));
  const checkedAttendees = (data.attendances || []).filter(a => a.checked);
  const ratingTone = averageRating >= 8 ? 'emerald' : averageRating >= 6 ? 'amber' : averageRating > 0 ? 'rose' : 'slate';
  const ratingColor = averageRating >= 8 ? 'text-emerald-600' : averageRating >= 6 ? 'text-amber-600' : averageRating > 0 ? 'text-rose-600' : 'text-aksana-primary';

  if (!isActive) return <Slide isActive={false} />;

  return (
    <Slide isActive={isActive} label="Segmen akhir">
      <SlideHeader
        kicker="Segmen 7"
        title="Segmen Akhir"
        subtitle="Rating rapat & penutup · 5 menit"
        badge={<Badge tone={ratingTone}>{relevantRatings.length} penilaian</Badge>}
      />

      <Card className="mt-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="mb-0 flex items-center gap-2">
            <i className="fa-solid fa-star text-amber-400" aria-hidden="true" /> Beri Rating Rapat
          </h3>
          <Badge tone="slate">Skala 1–10</Badge>
        </div>

        {checkedAttendees.length === 0 ? (
          <EmptyState
            icon="fa-user-check"
            title="Belum ada peserta hadir"
            description="Centang kehadiran di Segmen Awal agar form rating muncul untuk setiap peserta."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {checkedAttendees.map((attendee) => {
              const roleKey = 'rating_id_' + attendee.id;
              const inputId = `rating-${attendee.id}`;
              return (
                <div
                  key={attendee.id}
                  data-export-block
                  className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-aksana-accent"
                >
                  <label
                    htmlFor={inputId}
                    className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400"
                  >
                    {attendee.name || 'Isi Nama…'}
                  </label>
                  <input
                    id={inputId}
                    type="number"
                    min="1"
                    max="10"
                    inputMode="numeric"
                    aria-label={`Rating untuk ${attendee.name || 'peserta'}`}
                    className="h-12 w-16 rounded-lg border-2 border-slate-200 text-center text-2xl font-bold text-aksana-primary outline-none transition-all focus:border-aksana-accent focus:ring-4 focus:ring-blue-50"
                    value={data.ratings?.[roleKey] ?? ''}
                    onChange={(e) => updateData(`ratings.${roleKey}`, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
        )}

        <div data-export-block className="mt-8 flex flex-col items-center border-t border-slate-100 pt-8">
          <div className="mb-2 text-sm font-bold uppercase tracking-[3px] text-slate-400">
            Rata-Rata Rating
          </div>
          <div className={`text-7xl font-black leading-none md:text-9xl ${ratingColor}`}>
            {averageRating}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-1" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((star) => (
                <i
                  key={star}
                  className={`fa-solid fa-star text-sm ${
                    averageRating / 2 >= star ? 'text-amber-400' : 'text-slate-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-slate-400">
              dari {relevantRatings.length} peserta
            </span>
          </div>
        </div>

        <p data-export-block className="mt-8 text-center text-base italic text-slate-500 md:text-lg">
          “Rapat yang hebat dimulai dari kedisiplinan dan diakhiri dengan komitmen.”
        </p>
      </Card>
    </Slide>
  );
};

export const SlideScorecard = ({ isActive, kpiCategory, title }) => {
  const { data, updateListItem, deleteListItem, addRow } = useMeeting();
  const confirm = useConfirm();
  const items = data[kpiCategory] || [];
  const offTrackCount = items.filter((item) => item.status === 'off').length;

  if (!isActive) return <Slide isActive={false} />; // Skip proses jika tidak aktif

  const addKpi = () => addRow(kpiCategory, { kpi: '', target: '', real: '', jenis: 'leading', status: 'on' });

  const handleDelete = async (index, item) => {
    const approved = await confirm({
      title: 'Hapus KPI?',
      description: `KPI "${item.kpi || 'tanpa nama'}" akan dihapus dari scorecard ${title}.`,
      confirmLabel: 'Hapus KPI',
      tone: 'danger',
    });
    if (approved) deleteListItem(kpiCategory, index);
  };

  return (
    <Slide isActive={isActive} label={`Scorecard ${title}`}>
      <SlideHeader
        kicker="Scorecard Review"
        title={title}
        subtitle="Pantau KPI mingguan divisi · 5 menit"
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="slate">{items.length} KPI</Badge>
            {offTrackCount > 0 && <Badge tone="rose">{offTrackCount} off track</Badge>}
          </div>
        }
      />

      <Card className="mt-5 flex-1">
        {items.length === 0 ? (
          <EmptyState
            icon="fa-chart-line"
            title="Belum ada KPI"
            description={`Tambahkan KPI untuk ${title} beserta target dan realisasinya agar progres mingguan terukur.`}
            action={
              <Button variant="accent" size="sm" onClick={addKpi} data-html2canvas-ignore="true">
                <i className="fa-solid fa-plus" aria-hidden="true" /> Tambah KPI Pertama
              </Button>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="responsive-table min-w-[640px] md:min-w-full">
                <thead>
                  <tr>
                    <th scope="col" className="w-[30%]">KPI</th>
                    <th scope="col" className="w-[15%]">Target</th>
                    <th scope="col" className="w-[15%]">Realisasi</th>
                    <th scope="col" className="w-[15%] text-center">Jenis</th>
                    <th scope="col" className="w-[15%] text-center">Status</th>
                    <th scope="col" className="w-[10%]"><span className="sr-only">Aksi</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="group" data-export-block>
                      <td data-label="KPI">
                        <Editable
                          label={`KPI ${i + 1}`}
                          value={item.kpi}
                          onChange={(v) => updateListItem(kpiCategory, i, 'kpi', v)}
                          placeholder="Nama KPI…"
                        />
                      </td>
                      <td data-label="Target">
                        <Editable
                          label={`Target KPI ${i + 1}`}
                          value={item.target}
                          onChange={(v) => updateListItem(kpiCategory, i, 'target', v)}
                          placeholder="Target…"
                        />
                      </td>
                      <td data-label="Realisasi">
                        <Editable
                          label={`Realisasi KPI ${i + 1}`}
                          value={item.real}
                          onChange={(v) => updateListItem(kpiCategory, i, 'real', v)}
                          placeholder="Realisasi…"
                        />
                      </td>
                      <td data-label="Jenis" className="text-center">
                        <JenisButton
                          jenis={item.jenis}
                          onClick={() => updateListItem(kpiCategory, i, 'jenis', cycleJenis(item.jenis))}
                        />
                      </td>
                      <td data-label="Status" className="text-center">
                        <StatusButton
                          status={item.status}
                          onClick={() => updateListItem(kpiCategory, i, 'status', item.status === 'on' ? 'off' : 'on')}
                        />
                      </td>
                      <td data-label="" className="responsive-table-action">
                        <button
                          type="button"
                          onClick={() => handleDelete(i, item)}
                          className="row-action"
                          aria-label={`Hapus KPI ${item.kpi || i + 1}`}
                          data-html2canvas-ignore="true"
                        >
                          <i className="fa-solid fa-trash" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              className="add-btn"
              onClick={addKpi}
              data-html2canvas-ignore="true"
            >
              + Tambah KPI
            </button>
          </>
        )}
      </Card>
    </Slide>
  );
};
