import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

export const cx = (...parts) => parts.filter(Boolean).join(' ');

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

const getFocusable = (root) => {
  if (!root) return [];
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement,
  );
};

// Menahan fokus Tab di dalam dialog agar tidak bocor ke konten di belakangnya.
const useFocusTrap = (ref, active) => {
  useEffect(() => {
    if (!active) return undefined;

    const onKeyDown = (event) => {
      if (event.key !== 'Tab') return;
      const focusable = getFocusable(ref.current);
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [ref, active]);
};

/* --------------------------------------------------------------------------
   Button
   -------------------------------------------------------------------------- */
const BUTTON_VARIANTS = {
  primary: 'bg-aksana-primary text-white shadow-sm hover:bg-slate-700',
  accent: 'bg-aksana-accent text-white shadow-sm hover:bg-blue-700',
  outline: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  subtle: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  danger: 'bg-rose-500 text-white shadow-sm hover:bg-rose-600',
  'danger-outline': 'border border-rose-200 bg-white text-rose-600 shadow-sm hover:bg-rose-50 hover:border-rose-300',
  ids: 'bg-aksana-ids text-white shadow-sm hover:bg-violet-700',
};

const BUTTON_SIZES = {
  sm: 'h-10 px-3 text-xs gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-sm gap-2',
  icon: 'h-11 w-11 p-0 text-sm',
};

export const Button = React.forwardRef(function Button(
  { variant = 'primary', size = 'md', type = 'button', className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex select-none items-center justify-center rounded-lg font-bold transition-all duration-200',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

/* --------------------------------------------------------------------------
   Badge
   -------------------------------------------------------------------------- */
const BADGE_TONES = {
  slate: 'border-slate-200 bg-slate-100 text-slate-600',
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
};

export const Badge = ({ tone = 'slate', className, children }) => (
  <span
    className={cx(
      'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider',
      BADGE_TONES[tone] || BADGE_TONES.slate,
      className,
    )}
  >
    {children}
  </span>
);

/* --------------------------------------------------------------------------
   Card
   -------------------------------------------------------------------------- */
export const Card = ({ className, children, ...props }) => (
  <div className={cx('card', className)} {...props}>
    {children}
  </div>
);

/* --------------------------------------------------------------------------
   Slide header
   -------------------------------------------------------------------------- */
export const SlideHeader = ({
  title,
  subtitle,
  kicker,
  badge,
  actions,
  className,
  children,
}) => (
  <div
    className={cx(
      'flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
      className,
    )}
  >
    <div className="min-w-0">
      {kicker && <div className="slide-kicker mb-1">{kicker}</div>}
      <h1 className="slide-title">{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
      {children}
    </div>
    {(badge || actions) && (
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {badge}
        {actions}
      </div>
    )}
  </div>
);

/* --------------------------------------------------------------------------
   Progress bar
   -------------------------------------------------------------------------- */
const PROGRESS_TONES = {
  accent: 'bg-aksana-accent',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  ids: 'bg-aksana-ids',
};

export const ProgressBar = ({
  value = 0,
  tone = 'accent',
  label = 'Progres',
  className,
}) => {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div
      className={cx('h-1.5 w-full overflow-hidden rounded-full bg-slate-200', className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(safeValue)}
    >
      <span
        className={cx('block h-full rounded-full transition-all duration-300', PROGRESS_TONES[tone] || PROGRESS_TONES.accent)}
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
};

/* --------------------------------------------------------------------------
   Empty state
   -------------------------------------------------------------------------- */
export const EmptyState = ({
  icon = 'fa-inbox',
  title,
  description,
  action,
  className,
}) => (
  <div className={cx('empty-state', className)}>
    <span className="empty-state-icon" aria-hidden="true">
      <i className={`fa-solid ${icon}`} />
    </span>
    <p className="empty-state-title">{title}</p>
    {description && <p className="empty-state-desc">{description}</p>}
    {action && <div className="mt-2">{action}</div>}
  </div>
);

/* --------------------------------------------------------------------------
   IDS stepper
   -------------------------------------------------------------------------- */
const IDS_STEPS = ['Identify', 'Vote', 'Discuss', 'Solve'];

export const IdsStepper = ({ current = 0, className }) => (
  <nav
    aria-label="Tahapan IDS: Identify, Vote, Discuss, Solve"
    className={cx('stepper', className)}
    data-html2canvas-ignore="true"
  >
    <ol className="flex w-full items-center gap-1">
      {IDS_STEPS.map((label, index) => {
        const state = index === current ? 'active' : index < current ? 'done' : 'todo';
        return (
          <li key={label} className="flex shrink-0 items-center gap-1">
            <span
              className="stepper-step"
              data-state={state}
              aria-current={index === current ? 'step' : undefined}
            >
              <span className="stepper-index" aria-hidden="true">
                {index < current ? <i className="fa-solid fa-check text-[9px]" /> : index + 1}
              </span>
              {label}
            </span>
            {index < IDS_STEPS.length - 1 && (
              <i className="fa-solid fa-chevron-right stepper-divider" aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);

/* --------------------------------------------------------------------------
   Slide overview drawer
   -------------------------------------------------------------------------- */
export const SlideOverview = ({ open, slides, currentSlide, onSelect, onClose }) => {
  const closeRef = useRef(null);
  const panelRef = useRef(null);
  const previousFocusRef = useRef(null);

  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return undefined;

    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const focusTimer = setTimeout(() => closeRef.current?.focus(), 30);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="slide-overview-title"
      data-html2canvas-ignore="true"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl animate-slide-in" ref={panelRef}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 id="slide-overview-title" className="text-base font-extrabold text-aksana-primary">
              Daftar Slide
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500">
              {currentSlide + 1} dari {slides.length} slide · gunakan ← → untuk berpindah
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="icon-btn shrink-0 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Tutup daftar slide"
          >
            <i className="fa-solid fa-xmark text-lg" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <ol className="flex flex-col gap-1">
            {slides.map((slide, index) => {
              const showGroup = slide.group && slides[index - 1]?.group !== slide.group;
              const isActive = index === currentSlide;
              return (
                <li key={`${slide.type}-${index}`}>
                  {showGroup && (
                    <div className="px-2 pb-1 pt-3 text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                      {slide.group}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(index)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cx(
                      'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors',
                      isActive
                        ? 'border-aksana-accent bg-blue-50'
                        : 'border-transparent hover:border-slate-200 hover:bg-slate-50',
                    )}
                  >
                    <span
                      className={cx(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-extrabold',
                        isActive ? 'bg-aksana-accent text-white' : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {index + 1}
                    </span>
                    <span
                      className={cx(
                        'min-w-0 flex-1 truncate text-sm font-semibold',
                        isActive ? 'text-aksana-accent' : 'text-slate-700',
                      )}
                    >
                      {slide.label}
                    </span>
                    {isActive && (
                      <i className="fa-solid fa-circle text-[6px] text-aksana-accent" aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="border-t border-slate-200 px-5 py-3">
          <ProgressBar
            value={((currentSlide + 1) / slides.length) * 100}
            label="Posisi slide saat ini"
          />
        </div>
      </div>
    </div>
  );
};

/* --------------------------------------------------------------------------
   Toast + Confirm provider
   -------------------------------------------------------------------------- */
const UIContext = createContext(null);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI harus dipakai di dalam <UIProvider>.');
  return context;
};

export const useToast = () => useUI().toast;
export const useConfirm = () => useUI().confirm;

const TOAST_TONES = {
  success: { icon: 'fa-circle-check', accent: 'text-emerald-500', ring: 'border-emerald-200' },
  danger: { icon: 'fa-circle-exclamation', accent: 'text-rose-500', ring: 'border-rose-200' },
  warning: { icon: 'fa-triangle-exclamation', accent: 'text-amber-500', ring: 'border-amber-200' },
  info: { icon: 'fa-circle-info', accent: 'text-aksana-accent', ring: 'border-blue-200' },
};

export const UIProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const timersRef = useRef(new Map());
  const confirmResolverRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const confirmPanelRef = useRef(null);
  const confirmPreviousFocusRef = useRef(null);

  useFocusTrap(confirmPanelRef, Boolean(confirmState));

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const dismissToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message, options = {}) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const duration = options.duration ?? 4200;
      const item = {
        id,
        message,
        tone: options.tone || 'info',
        action: options.action || null,
      };

      setToasts((previous) => {
        const next = [...previous, item];
        // Toast dengan aksi (mis. Undo) dipertahankan agar tidak tergeser
        // oleh toast biasa yang datang setelahnya.
        const pinned = next.filter((toastItem) => toastItem.action);
        const regular = next.filter((toastItem) => !toastItem.action).slice(-2);
        return [...regular, ...pinned];
      });

      const timer = setTimeout(() => dismissToast(id), duration);
      timersRef.current.set(id, timer);
      return id;
    },
    [dismissToast],
  );

  const confirm = useCallback(
    (options = {}) =>
      new Promise((resolve) => {
        confirmPreviousFocusRef.current = document.activeElement;
        confirmResolverRef.current = resolve;
        setConfirmState({
          title: options.title || 'Konfirmasi',
          description: options.description || '',
          confirmLabel: options.confirmLabel || 'Ya, lanjutkan',
          cancelLabel: options.cancelLabel || 'Batal',
          tone: options.tone || 'default',
        });
      }),
    [],
  );

  const closeConfirm = useCallback((result) => {
    const resolve = confirmResolverRef.current;
    confirmResolverRef.current = null;
    setConfirmState(null);
    resolve?.(result);
    confirmPreviousFocusRef.current?.focus?.();
    confirmPreviousFocusRef.current = null;
  }, []);

  useEffect(() => {
    if (!confirmState) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeConfirm(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const focusTimer = setTimeout(() => cancelButtonRef.current?.focus(), 30);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [confirmState, closeConfirm]);

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}

      {confirmState && (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center"
          data-html2canvas-ignore="true"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          aria-describedby={confirmState.description ? 'confirm-dialog-description' : undefined}
        >
          <div
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            onClick={() => closeConfirm(false)}
            aria-hidden="true"
          />
          <div
            ref={confirmPanelRef}
            className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl animate-slide-in"
          >
            <div className="flex items-start gap-3">
              <span
                className={cx(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  confirmState.tone === 'danger'
                    ? 'bg-rose-50 text-rose-500'
                    : 'bg-blue-50 text-aksana-accent',
                )}
                aria-hidden="true"
              >
                <i
                  className={`fa-solid ${
                    confirmState.tone === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-question'
                  }`}
                />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="confirm-dialog-title" className="text-base font-extrabold text-aksana-primary">
                  {confirmState.title}
                </h2>
                {confirmState.description && (
                  <p
                    id="confirm-dialog-description"
                    className="mt-1.5 text-sm leading-relaxed text-slate-500"
                  >
                    {confirmState.description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                ref={cancelButtonRef}
                variant="outline"
                size="md"
                onClick={() => closeConfirm(false)}
              >
                {confirmState.cancelLabel}
              </Button>
              <Button
                variant={confirmState.tone === 'danger' ? 'danger' : 'primary'}
                size="md"
                onClick={() => closeConfirm(true)}
              >
                {confirmState.confirmLabel}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div
        className="pointer-events-none fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[80] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
        data-html2canvas-ignore="true"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((item) => {
          const tone = TOAST_TONES[item.tone] || TOAST_TONES.info;
          return (
            <div
              key={item.id}
              role={item.tone === 'danger' ? 'alert' : 'status'}
              className={cx(
                'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg animate-slide-in',
                tone.ring,
              )}
            >
              <i className={`fa-solid ${tone.icon} mt-0.5 ${tone.accent}`} aria-hidden="true" />
              <p className="min-w-0 flex-1 text-sm font-semibold leading-relaxed text-slate-700">
                {item.message}
              </p>
              {item.action && (
                <button
                  type="button"
                  onClick={() => {
                    const action = item.action;
                    dismissToast(item.id);
                    action?.onClick?.();
                  }}
                  className="shrink-0 whitespace-nowrap rounded-md px-2 py-1 text-xs font-extrabold text-aksana-accent transition-colors hover:bg-blue-50"
                >
                  {item.action.label || 'Urungkan'}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismissToast(item.id)}
                className="icon-btn h-8 w-8 min-h-0 min-w-0 shrink-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup notifikasi"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </UIContext.Provider>
  );
};
