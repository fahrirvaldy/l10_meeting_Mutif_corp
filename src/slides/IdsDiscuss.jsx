import React from 'react';
import { useMeeting } from '../MeetingContext';
import { Editable } from '../Components';
import {
  Badge,
  Button,
  EmptyState,
  IdsStepper,
  SlideHeader,
  cx,
  useConfirm,
} from '../ui';
import { Slide } from '../Slides';
import {
  FACTOR_HINTS,
  FACTOR_LABELS,
  IDS_FACTORS,
  createEmptyBranch,
  createEmptyTask,
  createEmptyTheme,
  createEmptyWhy,
  formatDateID,
  getBranchRootCause,
  getRootCauseLabel,
  getRootCauses,
  getThemes,
  hasText,
} from '../idsModel';

const HELPER_DISCUSS = (
  <>
    <span className="font-bold text-slate-700">Langkah 3:</span> analisis akar masalah dengan Fishbone
    5M, 5-Why multi-cabang, lalu susun rencana 5W+1H yang terhubung ke setiap akar masalah.
  </>
);

const truncate = (value, max = 48) => {
  const text = (value || '').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
};

/**
 * Data lama bisa menyimpan `when` sebagai teks bebas (mis. "minggu depan").
 * Nilai seperti itu tidak boleh dimasukkan ke <input type="date">.
 */
const toDateInputValue = (value) => {
  if (!hasText(value)) return '';
  const text = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  const parsed = new Date(`${text}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? '' : text;
};

/* --------------------------------------------------------------------------
   Fishbone: hanya faktor yang dipilih yang ditampilkan
   -------------------------------------------------------------------------- */
const FactorSelector = ({ selected, onToggle }) => (
  <div
    className="flex flex-wrap gap-1.5"
    role="group"
    aria-label="Pilih faktor anomali Fishbone 5M"
    data-html2canvas-ignore="true"
  >
    {IDS_FACTORS.map((factor) => {
      const isActive = selected.includes(factor);
      return (
        <button
          key={factor}
          type="button"
          onClick={() => onToggle(factor)}
          aria-pressed={isActive}
          title={FACTOR_HINTS[factor]}
          className={cx(
            'inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3 text-[11px] font-extrabold uppercase tracking-wide transition-colors',
            isActive
              ? 'border-aksana-ids bg-aksana-ids text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-600 hover:border-violet-300 hover:text-aksana-ids',
          )}
        >
          <i
            className={`fa-solid ${isActive ? 'fa-check' : 'fa-plus'} text-[9px]`}
            aria-hidden="true"
          />
          {FACTOR_LABELS[factor]}
        </button>
      );
    })}
  </div>
);

const FishboneSection = ({ theme, onToggleFactor, onChangeFactor }) => {
  const selected = theme.anomalyFactors;

  return (
    <section data-export-block className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="mb-0 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700">
          <i className="fa-solid fa-diagram-project text-aksana-ids" aria-hidden="true" />
          3. Analisa Fishbone 5M
        </h3>
        <span className="text-[10px] font-bold text-slate-400">
          {selected.length} faktor dipilih
        </span>
      </div>

      <FactorSelector selected={selected} onToggle={onToggleFactor} />

      <p className="mt-2 rounded-lg bg-violet-50 px-2.5 py-2 text-[11px] font-medium leading-relaxed text-violet-800">
        <span className="font-black">Ceteris paribus:</span> pilih hanya faktor yang abnormal.
        Semakin sedikit variabel yang diintervensi, semakin teruji validitas perbaikannya.
      </p>

      {selected.length === 0 ? (
        <div className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs font-semibold text-slate-400">
          Pilih faktor yang abnormal untuk mulai mengisi analisa.
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {selected.map((factor) => (
            <div
              key={factor}
              data-export-block
              className="rounded-lg border border-slate-200 bg-slate-50/60 p-2.5 transition-colors focus-within:border-violet-300 focus-within:bg-white"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                  {FACTOR_LABELS[factor]}
                </span>
                <span className="text-[9px] font-semibold text-slate-400">
                  {FACTOR_HINTS[factor]}
                </span>
              </div>
              <Editable
                label={`Analisa faktor ${FACTOR_LABELS[factor]}`}
                value={theme.analysis[factor] || ''}
                onChange={(value) => onChangeFactor(factor, value)}
                placeholder={`Uraikan anomali pada ${FACTOR_LABELS[factor].toLowerCase()}…`}
                className="bg-transparent p-0 text-sm font-bold text-black placeholder-slate-400"
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

/* --------------------------------------------------------------------------
   5-Why multi-cabang
   -------------------------------------------------------------------------- */
const RootCausePanel = ({ branch, index, onOverride, onReset }) => {
  const derived = getBranchRootCause(branch);
  const override = branch.rootCauseOverride || '';
  const isManual = hasText(override);

  return (
    <div
      data-export-block
      className="mt-2 rounded-lg border border-violet-200 bg-violet-50/60 p-2.5"
    >
      <div className="mb-1 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-aksana-ids">
            Akar Masalah #{index + 1}
          </span>
          <Badge tone={isManual ? 'violet' : 'slate'}>{isManual ? 'Manual' : 'Otomatis'}</Badge>
        </div>
        {isManual && (
          <button
            type="button"
            onClick={onReset}
            className="text-[10px] font-bold text-slate-500 underline decoration-dotted hover:text-aksana-ids"
            data-html2canvas-ignore="true"
          >
            Kembalikan otomatis
          </button>
        )}
      </div>

      <Editable
        label={`Akar masalah cabang ${index + 1}`}
        value={override}
        onChange={onOverride}
        placeholder={derived || 'Tulis akar masalah terdalam…'}
        className="bg-transparent p-0 text-sm font-black text-black placeholder-violet-500"
      />
      <p className="mt-1 text-[10px] font-medium text-violet-700/80">
        Otomatis dari baris Why terakhir. Ketik di atas untuk mengoreksi manual.
      </p>
    </div>
  );
};

const WhyBranch = ({
  branch,
  index,
  canDelete,
  onAddWhy,
  onRemoveWhy,
  onUpdateWhy,
  onOverride,
  onResetOverride,
  onRemoveBranch,
}) => (
  <div data-export-block className="rounded-xl border border-slate-200 bg-white p-2.5">
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-black text-aksana-ids">
          {index + 1}
        </span>
        <h4 className="m-0 text-[11px] font-black uppercase tracking-wider text-slate-700">
          Cabang Masalah #{index + 1}
        </h4>
      </div>
      {canDelete && (
        <button
          type="button"
          onClick={onRemoveBranch}
          className="row-action h-8 w-8 min-h-0 min-w-0"
          aria-label={`Hapus cabang masalah ${index + 1}`}
          data-html2canvas-ignore="true"
        >
          <i className="fa-solid fa-trash text-xs" aria-hidden="true" />
        </button>
      )}
    </div>

    <div className="space-y-1.5">
      {branch.whys.map((why, whyIndex) => (
        <div
          key={why.id}
          data-export-block
          className="flex flex-col items-start gap-1.5 rounded-lg bg-slate-50 p-2 sm:flex-row sm:items-start sm:gap-2"
        >
          <span className="w-5 shrink-0 pt-0.5 text-center text-[11px] font-black text-slate-400">
            {whyIndex + 1}.
          </span>
          <Editable
            label={`Why ${whyIndex + 1} akibat cabang ${index + 1}`}
            value={why.effect}
            onChange={(value) => onUpdateWhy(why.id, 'effect', value)}
            placeholder="Akibat / gejala masalah"
            className="flex-1 bg-transparent p-0 text-sm font-bold text-black placeholder-slate-400"
          />
          <span className="shrink-0 px-1 text-[10px] font-black uppercase text-aksana-ids sm:pt-0.5">
            karena
          </span>
          <Editable
            label={`Why ${whyIndex + 1} sebab cabang ${index + 1}`}
            value={why.cause}
            onChange={(value) => onUpdateWhy(why.id, 'cause', value)}
            placeholder="Sebab / pemicu masalah"
            className="flex-1 bg-transparent p-0 text-sm font-bold text-black placeholder-slate-400"
          />
          <button
            type="button"
            onClick={() => onRemoveWhy(why.id)}
            disabled={branch.whys.length <= 1}
            className="row-action h-8 w-8 min-h-0 min-w-0 shrink-0 self-end disabled:pointer-events-none disabled:opacity-30 sm:self-start"
            aria-label={`Hapus Why ${whyIndex + 1} cabang ${index + 1}`}
            data-html2canvas-ignore="true"
          >
            <i className="fa-solid fa-xmark text-xs" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>

    <button
      type="button"
      onClick={onAddWhy}
      className="mt-1.5 inline-flex min-h-[34px] items-center gap-1.5 rounded-md border border-dashed border-violet-300 px-2.5 text-[11px] font-bold text-aksana-ids transition-colors hover:bg-violet-50"
      data-html2canvas-ignore="true"
    >
      <i className="fa-solid fa-plus text-[9px]" aria-hidden="true" /> Tambah Why
    </button>

    <RootCausePanel
      branch={branch}
      index={index}
      onOverride={onOverride}
      onReset={onResetOverride}
    />
  </div>
);

/* --------------------------------------------------------------------------
   5W+1H matrix
   -------------------------------------------------------------------------- */
const ActionPlanSection = ({
  theme,
  whoOptions,
  datalistId,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
}) => {
  const rootCauses = getRootCauses(theme);
  const canAddTask = rootCauses.some((item) => hasText(item.text));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="mb-0 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700">
            <i className="fa-solid fa-table-list text-aksana-ids" aria-hidden="true" />
            5. Matriks Rencana Aksi 5W+1H
          </h3>
          <p className="mt-0.5 text-[10px] font-medium text-slate-400">
            Setiap task harus terhubung ke salah satu Akar Masalah.
          </p>
        </div>
        <Badge tone={theme.tasks.length > 0 ? 'violet' : 'slate'}>
          {theme.tasks.length} task
        </Badge>
      </div>

      <datalist id={datalistId}>
        {whoOptions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {theme.tasks.length === 0 ? (
        <EmptyState
          icon="fa-table-list"
          title="Belum ada rencana aksi"
          description={
            canAddTask
              ? 'Tambahkan task dan hubungkan dengan akar masalah yang sudah dianalisa.'
              : 'Isi minimal satu Akar Masalah pada 5-Why sebelum menambah task.'
          }
          action={
            <Button
              variant="accent"
              size="sm"
              onClick={onAddTask}
              disabled={!canAddTask}
              data-html2canvas-ignore="true"
            >
              <i className="fa-solid fa-plus" aria-hidden="true" /> Tambah Task
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="responsive-table min-w-[980px] md:min-w-full">
              <thead>
                <tr>
                  <th scope="col" className="w-[15%]">Akar Masalah</th>
                  <th scope="col" className="w-[15%]">What</th>
                  <th scope="col" className="w-[14%]">Why</th>
                  <th scope="col" className="w-[13%]">Who</th>
                  <th scope="col" className="w-[12%]">When</th>
                  <th scope="col" className="w-[13%]">Where</th>
                  <th scope="col" className="w-[13%]">How</th>
                  <th scope="col" className="w-[5%]">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {theme.tasks.map((task) => (
                  <tr key={task.id} data-export-block>
                    <td data-label="Akar Masalah">
                      <select
                        value={task.rootCauseId || ''}
                        onChange={(event) => onUpdateTask(task.id, 'rootCauseId', event.target.value)}
                        aria-label="Pilih akar masalah untuk task ini"
                        className="print-control w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-bold text-slate-700 outline-none transition-colors focus:border-aksana-ids"
                      >
                        {rootCauses.map((rootCause) => (
                          <option key={rootCause.id} value={rootCause.id}>
                            {rootCause.label}
                            {rootCause.text ? ` — ${truncate(rootCause.text, 36)}` : ' — belum diisi'}
                          </option>
                        ))}
                      </select>
                      <span className="export-only text-[11px] font-bold leading-snug text-slate-700">
                        {getRootCauseLabel(theme, task.rootCauseId)}
                      </span>
                    </td>
                    <td data-label="What">
                      <Editable
                        label="What rencana aksi"
                        value={task.what}
                        onChange={(value) => onUpdateTask(task.id, 'what', value)}
                        placeholder="Apa tindakannya?"
                        className="bg-transparent p-0 text-sm font-bold text-black"
                      />
                    </td>
                    <td data-label="Why">
                      <Editable
                        label="Why rencana aksi"
                        value={task.why}
                        onChange={(value) => onUpdateTask(task.id, 'why', value)}
                        placeholder="Mengapa perlu?"
                        className="bg-transparent p-0 text-sm font-bold text-black"
                      />
                    </td>
                    <td data-label="Who">
                      <input
                        list={datalistId}
                        value={task.who || ''}
                        onChange={(event) => onUpdateTask(task.id, 'who', event.target.value)}
                        placeholder="Pilih / ketik nama"
                        aria-label="PIC task"
                        className="print-control w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-blue-700 outline-none transition-colors focus:border-aksana-ids"
                      />
                      <span className="export-only text-xs font-bold text-blue-700">
                        {task.who || '—'}
                      </span>
                    </td>
                    <td data-label="When">
                      <div className="relative flex min-h-[30px] min-w-[108px] cursor-pointer items-center">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold ${
                            task.when ? 'text-blue-700' : 'text-slate-400'
                          }`}
                        >
                          <i className="fa-regular fa-calendar" aria-hidden="true" />
                          {formatDateID(task.when)}
                        </span>
                        <input
                          type="date"
                          value={toDateInputValue(task.when)}
                          onChange={(event) => onUpdateTask(task.id, 'when', event.target.value)}
                          onClick={(event) => {
                            try {
                              event.target.showPicker();
                            } catch {
                              // showPicker tidak didukung di semua browser
                            }
                          }}
                          aria-label="Tanggal pelaksanaan task"
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          data-html2canvas-ignore="true"
                        />
                      </div>
                    </td>
                    <td data-label="Where">
                      <Editable
                        label="Where rencana aksi"
                        value={task.where}
                        onChange={(value) => onUpdateTask(task.id, 'where', value)}
                        placeholder="Di mana?"
                        className="bg-transparent p-0 text-sm font-bold text-black"
                      />
                    </td>
                    <td data-label="How">
                      <Editable
                        label="How rencana aksi"
                        value={task.how}
                        onChange={(value) => onUpdateTask(task.id, 'how', value)}
                        placeholder="Bagaimana caranya?"
                        className="bg-transparent p-0 text-sm font-bold text-black"
                      />
                    </td>
                    <td data-label="" className="responsive-table-action">
                      <button
                        type="button"
                        onClick={() => onRemoveTask(task.id)}
                        className="row-action"
                        aria-label={`Hapus task ${task.what || task.id}`}
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
            onClick={onAddTask}
            disabled={!canAddTask}
            className="add-btn disabled:pointer-events-none disabled:opacity-40"
            data-html2canvas-ignore="true"
          >
            + Tambah Task 5W+1H
          </button>
        </>
      )}
    </section>
  );
};

/* --------------------------------------------------------------------------
   Slide utama
   -------------------------------------------------------------------------- */
export const SlideIdsDiscuss = ({ isActive, exportThemeIndex }) => {
  const { data, updateData } = useMeeting();
  const confirm = useConfirm();
  const [activeThemeTab, setActiveThemeTab] = React.useState(0);

  if (!isActive) return <Slide isActive={false} />;

  const themes = getThemes(data);
  const safeActiveTab = Math.min(Math.max(activeThemeTab, 0), themes.length - 1);
  const effectiveTab =
    typeof exportThemeIndex === 'number'
      ? Math.min(Math.max(exportThemeIndex, 0), themes.length - 1)
      : safeActiveTab;
  const theme = themes[effectiveTab];
  const rootCauses = getRootCauses(theme);

  const whoOptions = Array.from(
    new Set(
      (data.attendances || [])
        .map((attendee) => (attendee?.name || '').trim())
        .filter(Boolean),
    ),
  );

  // Semua perubahan tema memakai updater agar membaca data TERBARU. Ini
  // penting saat beberapa draft dikirim bersamaan (reload/pindah slide).
  const persistThemes = (nextThemesOrUpdater) => {
    updateData('idsSession.themes', (storedThemes) => {
      const currentThemes = getThemes({ idsSession: { themes: storedThemes } });
      return typeof nextThemesOrUpdater === 'function'
        ? nextThemesOrUpdater(currentThemes)
        : nextThemesOrUpdater;
    });
  };

  const patchTheme = (patchOrUpdater) => {
    persistThemes((currentThemes) =>
      currentThemes.map((item, index) => {
        if (index !== effectiveTab) return item;
        return typeof patchOrUpdater === 'function'
          ? patchOrUpdater(item)
          : { ...item, ...patchOrUpdater };
      }),
    );
  };

  const mutateBranch = (branchId, updater) => {
    patchTheme((currentTheme) => ({
      ...currentTheme,
      branches: currentTheme.branches.map((branch) =>
        branch.id === branchId ? updater(branch) : branch,
      ),
    }));
  };

  const toggleFactor = (factor) => {
    patchTheme((currentTheme) => {
      const selected = currentTheme.anomalyFactors.includes(factor)
        ? currentTheme.anomalyFactors.filter((item) => item !== factor)
        : [...currentTheme.anomalyFactors, factor];
      return { anomalyFactors: selected };
    });
  };

  const changeFactor = (factor, value) => {
    patchTheme((currentTheme) => ({
      analysis: { ...currentTheme.analysis, [factor]: value },
    }));
  };

  const addBranch = () => {
    patchTheme((currentTheme) => ({
      branches: [...currentTheme.branches, createEmptyBranch()],
    }));
  };

  const removeBranch = async (branchId, branchIndex) => {
    if (theme.branches.length <= 1) return;

    const nextBranches = theme.branches.filter((branch) => branch.id !== branchId);
    const nextRootCauseId = nextBranches[0]?.id || '';
    const hasLinkedTasks = theme.tasks.some((task) => task.rootCauseId === branchId);

    if (hasLinkedTasks) {
      const approved = await confirm({
        title: `Hapus Cabang Masalah #${branchIndex + 1}?`,
        description:
          'Task yang terhubung ke cabang ini akan dipindahkan ke Akar Masalah #1. Lanjutkan?',
        confirmLabel: 'Hapus Cabang',
        tone: 'danger',
      });
      if (!approved) return;
    }

    patchTheme((currentTheme) => ({
      branches: currentTheme.branches.filter((branch) => branch.id !== branchId),
      tasks: currentTheme.tasks.map((task) =>
        task.rootCauseId === branchId ? { ...task, rootCauseId: nextRootCauseId } : task,
      ),
    }));
  };

  const addWhy = (branchId) => {
    mutateBranch(branchId, (branch) => ({
      ...branch,
      whys: [...branch.whys, createEmptyWhy()],
    }));
  };

  const removeWhy = (branchId, whyId) => {
    mutateBranch(branchId, (branch) => {
      if (branch.whys.length <= 1) return branch;
      return { ...branch, whys: branch.whys.filter((why) => why.id !== whyId) };
    });
  };

  const updateWhy = (branchId, whyId, field, value) => {
    mutateBranch(branchId, (branch) => ({
      ...branch,
      whys: branch.whys.map((why) => (why.id === whyId ? { ...why, [field]: value } : why)),
    }));
  };

  const setRootCauseOverride = (branchId, value) => {
    mutateBranch(branchId, (branch) => ({ ...branch, rootCauseOverride: value }));
  };

  const resetRootCauseOverride = (branchId) => {
    mutateBranch(branchId, (branch) => ({ ...branch, rootCauseOverride: '' }));
  };

  const addTask = () => {
    const hasRootCause = rootCauses.some((item) => hasText(item.text));
    if (!hasRootCause) return;
    patchTheme((currentTheme) => ({
      tasks: [...currentTheme.tasks, createEmptyTask(rootCauses[0]?.id || '')],
    }));
  };

  const updateTask = (taskId, field, value) => {
    patchTheme((currentTheme) => ({
      tasks: currentTheme.tasks.map((task) =>
        task.id === taskId ? { ...task, [field]: value } : task,
      ),
    }));
  };

  const removeTask = async (taskId) => {
    const task = theme.tasks.find((item) => item.id === taskId);
    const approved = await confirm({
      title: 'Hapus Task?',
      description: `"${task?.what || 'Task tanpa judul'}" akan dihapus dari matriks 5W+1H.`,
      confirmLabel: 'Hapus Task',
      tone: 'danger',
    });
    if (!approved) return;
    patchTheme((currentTheme) => ({
      tasks: currentTheme.tasks.filter((item) => item.id !== taskId),
    }));
  };

  const addTheme = () => {
    const issues = data.idsSession?.issues || [];
    const usedTopics = new Set(themes.map((item) => item.topic.trim()).filter(Boolean));
    const nextIssue = [...issues]
      .filter((issue) => issue.isSelectedForDiscussion && hasText(issue.text))
      .sort((a, b) => (b.votes || 0) - (a.votes || 0))
      .find((issue) => !usedTopics.has(issue.text.trim()));

    const newTheme = createEmptyTheme();
    if (nextIssue) newTheme.topic = nextIssue.text;

    persistThemes((currentThemes) => [...currentThemes, newTheme]);
    setActiveThemeTab(themes.length);
  };

  const removeTheme = async (index) => {
    if (index < 3) return;

    const approved = await confirm({
      title: `Hapus Tema ${index + 1}?`,
      description: 'Seluruh analisa dan task pada tema ini akan dihapus.',
      confirmLabel: 'Hapus Tema',
      tone: 'danger',
    });
    if (!approved) return;

    persistThemes((currentThemes) =>
      currentThemes.filter((_, itemIndex) => itemIndex !== index),
    );
    setActiveThemeTab(Math.min(index, themes.length - 2));
  };

  const handleTabKeyDown = (event) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const next =
      event.key === 'ArrowRight'
        ? (effectiveTab + 1) % themes.length
        : (effectiveTab + themes.length - 1) % themes.length;
    setActiveThemeTab(next);
    document.getElementById(`theme-tab-${next}`)?.focus();
  };

  const isFocusTheme = effectiveTab < 3;

  return (
    <Slide isActive={isActive} label="IDS discuss">
      <SlideHeader
        kicker="IDS Session"
        title="Discuss Matrix"
        subtitle="Analisis akar masalah · Fishbone 5M, 5-Why multi-cabang & 5W+1H"
        badge={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="violet">
              Tema {effectiveTab + 1} dari {themes.length}
            </Badge>
            <Badge tone={isFocusTheme ? 'blue' : 'slate'}>
              {isFocusTheme ? 'Fokus Utama' : 'Tambahan'}
            </Badge>
          </div>
        }
        actions={
          <div className="flex max-w-full items-center gap-2">
            <div
              role="tablist"
              aria-label="Pilih tema diskusi"
              data-html2canvas-ignore="true"
              onKeyDown={handleTabKeyDown}
              className="flex max-w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-100 p-1"
            >
              {themes.map((item, index) => (
                <div key={item.id || index} className="flex shrink-0 items-center">
                  <button
                    type="button"
                    role="tab"
                    id={`theme-tab-${index}`}
                    aria-selected={effectiveTab === index}
                    aria-controls={`theme-panel-${index}`}
                    tabIndex={effectiveTab === index ? 0 : -1}
                    onClick={() => setActiveThemeTab(index)}
                    className={cx(
                      'flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-black transition-all',
                      effectiveTab === index
                        ? 'bg-white text-aksana-ids shadow-sm'
                        : 'text-slate-500 hover:text-slate-800',
                    )}
                  >
                    <i className="fa-solid fa-layer-group text-[10px]" aria-hidden="true" />
                    Tema {index + 1}
                  </button>
                  {index >= 3 && (
                    <button
                      type="button"
                      onClick={() => removeTheme(index)}
                      className="ml-0.5 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                      aria-label={`Hapus tema ${index + 1}`}
                    >
                      <i className="fa-solid fa-xmark text-[10px]" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={addTheme}
              className="shrink-0"
              data-html2canvas-ignore="true"
              aria-label="Tambah tema diskusi baru"
            >
              <i className="fa-solid fa-plus" aria-hidden="true" /> Tema
            </Button>
          </div>
        }
      />

      <IdsStepper current={2} className="mt-3" />
      <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">{HELPER_DISCUSS}</p>

      <div
        role="tabpanel"
        id={`theme-panel-${effectiveTab}`}
        aria-labelledby={`theme-tab-${effectiveTab}`}
        className="mt-3 flex flex-1 flex-col gap-3"
      >
        <div
          data-export-block
          className="rounded-xl border border-slate-200 bg-slate-50 p-3"
        >
          <div className="mb-1 block text-[10px] font-black uppercase tracking-widest text-aksana-ids">
            Judul Topik / Masalah Tema {effectiveTab + 1}
          </div>
          <Editable
            label={`Judul topik tema ${effectiveTab + 1}`}
            value={theme.topic}
            onChange={(value) => patchTheme({ topic: value })}
            placeholder="Tuliskan nama topik/isu besar yang sedang dibahas…"
            className="bg-transparent p-0 text-base font-black text-black md:text-lg"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div
            data-export-block
            className="rounded-xl border border-slate-200 bg-white p-3 transition-colors focus-within:border-blue-300"
          >
            <div className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-600">
              1. Kondisi Sekarang
            </div>
            <Editable
              label="Kondisi sekarang"
              value={theme.currentCond}
              onChange={(value) => patchTheme({ currentCond: value })}
              placeholder="Bagaimana realita buruk atau hambatan saat ini?"
              className="bg-transparent p-0 text-sm font-semibold text-black md:text-base"
            />
          </div>

          <div
            data-export-block
            className="rounded-xl border border-slate-200 bg-white p-3 transition-colors focus-within:border-violet-300"
          >
            <div className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-600">
              2. Kondisi Diinginkan
            </div>
            <Editable
              label="Kondisi diinginkan"
              value={theme.desiredCond}
              onChange={(value) => patchTheme({ desiredCond: value })}
              placeholder="Target ideal atau standar yang ingin dituju?"
              className="bg-transparent p-0 text-sm font-semibold text-black md:text-base"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 min-[1200px]:grid-cols-12">
          <div className="min-[1200px]:col-span-5">
            <FishboneSection
              theme={theme}
              onToggleFactor={toggleFactor}
              onChangeFactor={changeFactor}
            />
          </div>

          <section
            className="rounded-xl border border-slate-200 bg-white p-3 min-[1200px]:col-span-7"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="mb-0 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-slate-700">
                <i className="fa-solid fa-circle-question text-aksana-ids" aria-hidden="true" />
                4. Rantai Sebab-Akibat 5-Why
              </h3>
              <Badge tone="violet">{theme.branches.length} cabang</Badge>
            </div>

            <div className="space-y-2">
              {theme.branches.map((branch, branchIndex) => (
                <WhyBranch
                  key={branch.id}
                  branch={branch}
                  index={branchIndex}
                  canDelete={theme.branches.length > 1}
                  onAddWhy={() => addWhy(branch.id)}
                  onRemoveWhy={(whyId) => removeWhy(branch.id, whyId)}
                  onUpdateWhy={(whyId, field, value) =>
                    updateWhy(branch.id, whyId, field, value)
                  }
                  onOverride={(value) => setRootCauseOverride(branch.id, value)}
                  onResetOverride={() => resetRootCauseOverride(branch.id)}
                  onRemoveBranch={() => removeBranch(branch.id, branchIndex)}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={addBranch}
              className="mt-2 inline-flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-violet-300 px-3 text-[11px] font-black text-aksana-ids transition-colors hover:bg-violet-50"
              data-html2canvas-ignore="true"
            >
              <i className="fa-solid fa-code-branch text-[10px]" aria-hidden="true" />
              Tambah Cabang Masalah
            </button>
          </section>
        </div>

        <ActionPlanSection
          theme={theme}
          whoOptions={whoOptions}
          datalistId={`team-members-${String(theme.id).replace(/[^a-zA-Z0-9_-]/g, '')}`}
          onAddTask={addTask}
          onUpdateTask={updateTask}
          onRemoveTask={removeTask}
        />
      </div>
    </Slide>
  );
};

export default SlideIdsDiscuss;
