/**
 * Model & helper untuk sesi IDS.
 *
 * Struktur baru memakai `branches` (5-Why multi-cabang) dan `tasks`
 * (matriks 5W+1H). Data lama yang masih memakai `chain`, `rootCause`, dan
 * `plan` tetap dibaca melalui normalisasi di file ini, sehingga rapat lama
 * tidak perlu dimigrasi paksa di Firestore.
 */

export const IDS_FACTORS = ['man', 'method', 'machine', 'material', 'environment'];

export const FACTOR_LABELS = {
  man: 'Man',
  method: 'Method',
  machine: 'Machine',
  material: 'Material',
  environment: 'Environment',
};

export const FACTOR_HINTS = {
  man: 'Orang / kompetensi / sikap kerja',
  method: 'Prosedur / SOP / cara kerja',
  machine: 'Alat / sistem / perangkat',
  material: 'Bahan / data / input',
  environment: 'Lingkungan / kondisi kerja',
};

let idSequence = 0;

const createId = (prefix) => {
  idSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${idSequence}`;
};

export const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
};

export const hasText = (value) => value != null && String(value).trim().length > 0;

const asText = (value) => (value == null ? '' : String(value));

export const createEmptyWhy = (id = createId('why')) => ({
  id,
  effect: '',
  cause: '',
});

export const createEmptyBranch = (id = createId('branch')) => ({
  id,
  whys: [createEmptyWhy(`${id}-why-1`)],
  rootCauseOverride: '',
});

export const createEmptyTask = (rootCauseId = '', id = createId('task')) => ({
  id,
  rootCauseId,
  what: '',
  why: '',
  who: '',
  when: '',
  where: '',
  how: '',
});

/**
 * Tema kosong. `seed` dibuat deterministik untuk tema bawaan (1-3) agar
 * React key dan relasi task tidak berubah setiap render.
 */
export const createEmptyTheme = (seed = createId('theme')) => ({
  id: seed,
  topic: '',
  currentCond: '',
  desiredCond: '',
  anomalyFactors: [],
  analysis: {
    man: '',
    method: '',
    machine: '',
    material: '',
    environment: '',
  },
  branches: [createEmptyBranch(`${seed}-branch-1`)],
  tasks: [],
});

export const formatDateID = (value) => {
  if (!hasText(value)) return 'Pilih tanggal';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const lastFilledCause = (branch) => {
  const whys = toArray(branch?.whys);
  for (let index = whys.length - 1; index >= 0; index -= 1) {
    const cause = asText(whys[index]?.cause).trim();
    if (cause) return cause;
  }
  return '';
};

export const getBranchRootCause = (branch) => {
  if (!branch) return '';
  const override = asText(branch.rootCauseOverride).trim();
  if (override) return override;
  return lastFilledCause(branch);
};

export const getRootCauses = (theme) =>
  (theme?.branches || []).map((branch, index) => ({
    id: branch.id,
    index,
    label: `Akar Masalah #${index + 1}`,
    text: getBranchRootCause(branch),
  }));

export const getRootCauseLabel = (theme, rootCauseId, { withText = true } = {}) => {
  const rootCauses = getRootCauses(theme);
  const found = rootCauses.find((item) => item.id === rootCauseId) || rootCauses[0];
  if (!found) return 'Belum terhubung';
  if (!withText) return found.label;
  return `${found.label}: ${found.text || 'belum diisi'}`;
};

const normalizeWhys = (rawWhys, seedPrefix) => {
  const whys = toArray(rawWhys)
    .filter((why) => why && typeof why === 'object')
    .map((why, index) => ({
      id: asText(why.id) || `${seedPrefix}-why-${index + 1}`,
      effect: asText(why.effect),
      cause: asText(why.cause),
    }));

  return whys.length > 0 ? whys : [createEmptyWhy(`${seedPrefix}-why-1`)];
};

const normalizeBranch = (rawBranch, seedPrefix) => {
  const whys = normalizeWhys(rawBranch?.whys, seedPrefix);
  return {
    id: asText(rawBranch?.id) || seedPrefix,
    whys,
    rootCauseOverride: asText(rawBranch?.rootCauseOverride),
  };
};

const normalizeTask = (rawTask, seedPrefix, fallbackRootCauseId) => ({
  id: asText(rawTask?.id) || seedPrefix,
  rootCauseId: asText(rawTask?.rootCauseId) || fallbackRootCauseId,
  what: asText(rawTask?.what),
  why: asText(rawTask?.why),
  who: asText(rawTask?.who),
  when: asText(rawTask?.when),
  where: asText(rawTask?.where),
  how: asText(rawTask?.how ?? rawTask?.cost),
});

/**
 * Normalisasi satu tema dari bentuk apa pun (baru / lama / hasil Firestore
 * yang mengubah array menjadi object).
 */
export const normalizeTheme = (rawTheme, themeIndex = 0) => {
  const raw = rawTheme && typeof rawTheme === 'object' ? rawTheme : {};
  const seed = asText(raw.id) || `theme-${themeIndex + 1}`;
  const analysisSource = raw.analysis && typeof raw.analysis === 'object' ? raw.analysis : {};
  const analysis = IDS_FACTORS.reduce((result, factor) => {
    result[factor] = asText(analysisSource[factor]);
    return result;
  }, {});

  const explicitFactors = raw.anomalyFactors !== undefined && raw.anomalyFactors !== null;
  const anomalyFactors = explicitFactors
    ? Array.from(
        new Set(
          toArray(raw.anomalyFactors).filter((factor) => IDS_FACTORS.includes(factor)),
        ),
      )
    : IDS_FACTORS.filter((factor) => hasText(analysis[factor]));

  let branches;

  if (toArray(raw.branches).length > 0) {
    branches = toArray(raw.branches).map((branch, index) =>
      normalizeBranch(branch, `${seed}-branch-${index + 1}`),
    );
  } else {
    // Migrasi dari struktur lama: chain[5] + rootCause string.
    const legacyChain = toArray(raw.chain).filter(
      (item) => hasText(item?.effect) || hasText(item?.cause),
    );
    const legacyWhys = legacyChain.map((item, index) => ({
      id: `${seed}-why-${index + 1}`,
      effect: asText(item?.effect),
      cause: asText(item?.cause),
    }));
    const legacyRootCause = asText(raw.rootCause).trim();
    const derivedFromChain = legacyWhys.length
      ? asText(legacyWhys[legacyWhys.length - 1].cause).trim()
      : '';

    branches = [
      {
        id: `${seed}-branch-1`,
        whys: legacyWhys.length > 0 ? legacyWhys : [createEmptyWhy(`${seed}-branch-1-why-1`)],
        // Pertahankan kesimpulan lama bila berbeda dari baris Why terakhir.
        rootCauseOverride:
          legacyRootCause && legacyRootCause !== derivedFromChain ? legacyRootCause : '',
      },
    ];
  }

  const fallbackRootCauseId = branches[0]?.id || '';

  let tasks;

  if (Array.isArray(raw.tasks) || (raw.tasks && typeof raw.tasks === 'object')) {
    tasks = toArray(raw.tasks).map((task, index) =>
      normalizeTask(task, `${seed}-task-${index + 1}`, fallbackRootCauseId),
    );
  } else {
    // Migrasi dari plan 5W+1H tunggal (what/who/when/where/why/cost).
    const plan = raw.plan && typeof raw.plan === 'object' ? raw.plan : {};
    const hasPlan = ['what', 'why', 'who', 'when', 'where', 'how', 'cost'].some((field) =>
      hasText(plan[field]),
    );

    tasks = hasPlan
      ? [
          normalizeTask(
            {
              id: `${seed}-task-1`,
              rootCauseId: fallbackRootCauseId,
              what: plan.what,
              why: plan.why,
              who: plan.who,
              when: plan.when,
              where: plan.where,
              how: plan.how ?? plan.cost,
            },
            `${seed}-task-1`,
            fallbackRootCauseId,
          ),
        ]
      : [];
  }

  const branchIds = new Set(branches.map((branch) => branch.id));
  tasks = tasks.map((task) => ({
    ...task,
    rootCauseId: branchIds.has(task.rootCauseId) ? task.rootCauseId : fallbackRootCauseId,
  }));

  return {
    id: seed,
    topic: asText(raw.topic),
    currentCond: asText(raw.currentCond),
    desiredCond: asText(raw.desiredCond),
    anomalyFactors,
    analysis,
    branches,
    tasks,
  };
};

const extractThemesSource = (source) => {
  if (!source) return [];
  if (Array.isArray(source.themes)) return source.themes;
  if (source.themes && typeof source.themes === 'object') return Object.values(source.themes);
  if (source.idsSession) return extractThemesSource(source.idsSession);
  return [];
};

/**
 * Mengambil tema ternormalisasi. Minimal 3 tema dipertahankan agar alur
 * "Top 3" tetap konsisten saat data lama hanya memiliki sedikit tema.
 */
export const getThemes = (source, { min = 3 } = {}) => {
  const themes = extractThemesSource(source).map((theme, index) => normalizeTheme(theme, index));

  while (themes.length < min) {
    themes.push(createEmptyTheme(`theme-${themes.length + 1}`));
  }

  return themes;
};

export const themeHasContent = (theme) => {
  if (!theme) return false;
  return (
    hasText(theme.topic) ||
    hasText(theme.currentCond) ||
    hasText(theme.desiredCond) ||
    theme.anomalyFactors.length > 0 ||
    theme.branches.some(
      (branch) =>
        hasText(branch.rootCauseOverride) ||
        (branch.whys || []).some((why) => hasText(why.effect) || hasText(why.cause)),
    ) ||
    theme.tasks.some((task) =>
      ['what', 'why', 'who', 'when', 'where', 'how'].some((field) => hasText(task[field])),
    )
  );
};

/**
 * Jumlah tema yang perlu diekspor: minimal 3, tetapi tema tambahan yang masih
 * kosong tidak perlu menghasilkan halaman kosong.
 */
export const getExportableThemeCount = (themes) => {
  let lastContentIndex = 2;
  themes.forEach((theme, index) => {
    if (themeHasContent(theme)) lastContentIndex = Math.max(lastContentIndex, index);
  });
  return Math.max(3, lastContentIndex + 1);
};
