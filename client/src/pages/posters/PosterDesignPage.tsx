import { useState, useCallback, useRef, useMemo, useEffect, Fragment } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Save, Send, Plus, X, Upload, Check,
  Minus, ChevronDown, AlignLeft, AlignCenter, AlignRight,
  MoreVertical, Eye,
} from 'lucide-react';
import { usePosters } from './hooks/usePosters';
import { useToast } from '../../components/ui/Toast';
import PosterPreview from './components/PosterPreview';
import {
  POSTER_CATEGORIES,
  POSTER_TYPES,
  POSTER_TOPICS,
  POSTER_AUDIENCES,
  POSTER_THEMES,
  POSTER_PRIORITIES,
  POSTER_FONT_SIZES,
  POSTER_TEXT_ALIGNMENTS,
  POSTER_PRINT_SIZES,
  getThemeByKey,
} from '../../config/posterConfig';
import SelectWithOther from '../../components/ui/SelectWithOther';
import './PosterDesignPage.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const STORAGE_BASE = API_BASE.replace('/api', '') + '/storage/';

const LANGUAGES = ['English', 'Arabic', 'Hindi', 'Urdu', 'Tamil', 'Bengali', 'Filipino', 'Nepali'] as const;

/* ── Step metadata ────────────────────────────────── */
const STEP_LABELS = ['Template', 'Content', 'Design', 'Media', 'Links & Meta'];

const STEP_META: { title: string; subtitle: string }[] = [
  { title: 'Choose Template', subtitle: 'Select a starting layout for your poster' },
  { title: 'Add Content', subtitle: 'Write your poster text and message' },
  { title: 'Design & Theme', subtitle: 'Customize colors, fonts, and style' },
  { title: 'Upload Media', subtitle: 'Add images and your company logo' },
  { title: 'Links & Details', subtitle: 'Set classification, location, and dates' },
];

/* ── Initial empty form ───────────────────────────── */
interface PosterForm {
  title: string;
  subtitle: string;
  headline: string;
  subheadline: string;
  main_body_text: string;
  bullet_points: string[];
  warning_text: string;
  call_to_action: string;
  footer_text: string;
  quote_or_slogan: string;

  template_id: number | null;
  layout_type: string;
  orientation: 'Portrait' | 'Landscape';
  print_size: string;

  theme_key: string;
  font_size: 'Small' | 'Medium' | 'Large' | 'Extra Large';
  text_alignment: 'Left' | 'Center' | 'Right';
  background_color: string;
  accent_color: string;

  category: string;
  poster_type: string;
  topic: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  language: string;
  target_audience: string;
  site: string;
  project: string;
  area: string;
  zone: string;
  department: string;
  contractor_name: string;
  effective_date: string;
  expiry_date: string;

  main_image: File | null;
  secondary_image: File | null;
  background_image: File | null;
  company_logo: File | null;

  // existing image paths (edit mode)
  main_image_path: string | null;
  secondary_image_path: string | null;
  background_image_path: string | null;
  company_logo_path: string | null;
}

const emptyForm: PosterForm = {
  title: '',
  subtitle: '',
  headline: '',
  subheadline: '',
  main_body_text: '',
  bullet_points: [''],
  warning_text: '',
  call_to_action: '',
  footer_text: '',
  quote_or_slogan: '',

  template_id: null,
  layout_type: '',
  orientation: 'Portrait',
  print_size: 'A4',

  theme_key: 'safety_green',
  font_size: 'Medium',
  text_alignment: 'Center',
  background_color: '',
  accent_color: '',

  category: '',
  poster_type: '',
  topic: '',
  priority: 'Medium',
  language: 'English',
  target_audience: '',
  site: '',
  project: '',
  area: '',
  zone: '',
  department: '',
  contractor_name: '',
  effective_date: '',
  expiry_date: '',

  main_image: null,
  secondary_image: null,
  background_image: null,
  company_logo: null,

  main_image_path: null,
  secondary_image_path: null,
  background_image_path: null,
  company_logo_path: null,
};

/* ── Component ────────────────────────────────────── */

export default function PosterDesignPage() {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const templateParam = searchParams.get('template');

  const toast = useToast();
  const editId = routeId ? Number(routeId) : null;
  const isEdit = editId !== null && !isNaN(editId);

  const {
    templates,
    isTemplatesLoading,
    selectedPoster,
    isDetailLoading,
    setSelectedId,
    create,
    update,
    changeStatus,
    isCreating,
    isUpdating,
  } = usePosters();

  /* ── State ─────────────────────────────────────── */
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<PosterForm>({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [zoom, setZoom] = useState(60);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  /* local blob URLs for file previews */
  const [localPreviews, setLocalPreviews] = useState<Record<string, string>>({});

  /* file input refs */
  const mainImageRef = useRef<HTMLInputElement>(null);
  const secondaryImageRef = useRef<HTMLInputElement>(null);
  const backgroundImageRef = useRef<HTMLInputElement>(null);
  const companyLogoRef = useRef<HTMLInputElement>(null);

  /* ── Load existing poster for edit ─────────────── */
  useEffect(() => {
    if (isEdit) setSelectedId(editId);
  }, [isEdit, editId, setSelectedId]);

  useEffect(() => {
    if (isEdit && selectedPoster && !loaded) {
      setForm({
        title: selectedPoster.title || '',
        subtitle: selectedPoster.subtitle || '',
        headline: selectedPoster.headline || '',
        subheadline: selectedPoster.subheadline || '',
        main_body_text: selectedPoster.main_body_text || '',
        bullet_points:
          selectedPoster.bullet_points && selectedPoster.bullet_points.length > 0
            ? selectedPoster.bullet_points
            : [''],
        warning_text: selectedPoster.warning_text || '',
        call_to_action: selectedPoster.call_to_action || '',
        footer_text: selectedPoster.footer_text || '',
        quote_or_slogan: selectedPoster.quote_or_slogan || '',

        template_id: selectedPoster.template_id ?? null,
        layout_type: selectedPoster.layout_type || '',
        orientation: selectedPoster.orientation || 'Portrait',
        print_size: selectedPoster.print_size || 'A4',

        theme_key: selectedPoster.theme_key || 'safety_green',
        font_size: selectedPoster.font_size || 'Medium',
        text_alignment: selectedPoster.text_alignment || 'Center',
        background_color: selectedPoster.background_color || '',
        accent_color: selectedPoster.accent_color || '',

        category: selectedPoster.category || '',
        poster_type: selectedPoster.poster_type || '',
        topic: selectedPoster.topic || '',
        priority: selectedPoster.priority || 'Medium',
        language: selectedPoster.language || 'English',
        target_audience: selectedPoster.target_audience || '',
        site: selectedPoster.site || '',
        project: selectedPoster.project || '',
        area: selectedPoster.area || '',
        zone: selectedPoster.zone || '',
        department: selectedPoster.department || '',
        contractor_name: selectedPoster.contractor_name || '',
        effective_date: selectedPoster.effective_date || '',
        expiry_date: selectedPoster.expiry_date || '',

        main_image: null,
        secondary_image: null,
        background_image: null,
        company_logo: null,

        main_image_path: selectedPoster.main_image_path ?? null,
        secondary_image_path: selectedPoster.secondary_image_path ?? null,
        background_image_path: selectedPoster.background_image_path ?? null,
        company_logo_path: selectedPoster.company_logo_path ?? null,
      });
      setLoaded(true);
    }
  }, [isEdit, selectedPoster, loaded]);

  /* ── Apply template from query param ───────────── */
  useEffect(() => {
    if (templateParam && !isEdit && templates.length > 0 && !loaded) {
      const tpl = templates.find((t) => String(t.id) === templateParam);
      if (tpl) applyTemplate(tpl);
      setLoaded(true);
    }
  }, [templateParam, templates, isEdit, loaded]);

  /* ── Cleanup blob URLs ─────────────────────────── */
  useEffect(() => {
    return () => {
      Object.values(localPreviews).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [localPreviews]);

  /* ── Form helpers ──────────────────────────────── */
  const set = useCallback(
    <K extends keyof PosterForm>(key: K, value: PosterForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const applyTemplate = useCallback(
    (tpl: (typeof templates)[number]) => {
      const schema = (tpl.placeholder_schema ?? {}) as Record<string, string>;
      setForm((prev) => ({
        ...prev,
        template_id: tpl.id,
        layout_type: tpl.layout_type ?? prev.layout_type,
        orientation: tpl.default_orientation ?? prev.orientation,
        print_size: tpl.print_size ?? prev.print_size,
        theme_key: tpl.default_theme_key ?? prev.theme_key,
        headline: schema.headline ?? prev.headline,
        subheadline: schema.subheadline ?? prev.subheadline,
        main_body_text: schema.main_body_text ?? prev.main_body_text,
        warning_text: schema.warning_text ?? prev.warning_text,
        call_to_action: schema.call_to_action ?? prev.call_to_action,
        footer_text: schema.footer_text ?? prev.footer_text,
        quote_or_slogan: schema.quote_or_slogan ?? prev.quote_or_slogan,
        category: tpl.category ?? prev.category,
      }));
    },
    [],
  );

  /* ── Bullet points ─────────────────────────────── */
  const addBullet = useCallback(() => {
    setForm((prev) => ({ ...prev, bullet_points: [...prev.bullet_points, ''] }));
  }, []);

  const removeBullet = useCallback((idx: number) => {
    setForm((prev) => ({
      ...prev,
      bullet_points: prev.bullet_points.filter((_, i) => i !== idx),
    }));
  }, []);

  const updateBullet = useCallback((idx: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      bullet_points: prev.bullet_points.map((b, i) => (i === idx ? value : b)),
    }));
  }, []);

  /* ── File handling ─────────────────────────────── */
  const handleFile = useCallback(
    (field: 'main_image' | 'secondary_image' | 'background_image' | 'company_logo', file: File | null) => {
      if (file) {
        const blobUrl = URL.createObjectURL(file);
        setLocalPreviews((prev) => {
          if (prev[field]) URL.revokeObjectURL(prev[field]);
          return { ...prev, [field]: blobUrl };
        });
      } else {
        setLocalPreviews((prev) => {
          if (prev[field]) URL.revokeObjectURL(prev[field]);
          const copy = { ...prev };
          delete copy[field];
          return copy;
        });
      }
      setForm((prev) => ({
        ...prev,
        [field]: file,
        [`${field.replace('_image', '_image_path').replace('_logo', '_logo_path')}`]: file
          ? null
          : prev[`${field.replace('_image', '_image_path').replace('_logo', '_logo_path')}` as keyof PosterForm],
      }));
    },
    [],
  );

  const removeImage = useCallback(
    (field: 'main_image' | 'secondary_image' | 'background_image' | 'company_logo') => {
      const pathKey = (field + '_path') as keyof PosterForm;
      setForm((prev) => ({ ...prev, [field]: null, [pathKey]: null }));
      setLocalPreviews((prev) => {
        if (prev[field]) URL.revokeObjectURL(prev[field]);
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    },
    [],
  );

  /* ── Resolve image URL (local blob or server path) */
  const imageUrl = useCallback(
    (field: 'main_image' | 'secondary_image' | 'background_image' | 'company_logo'): string | null => {
      if (localPreviews[field]) return localPreviews[field];
      const pathKey = (field + '_path') as keyof PosterForm;
      const serverPath = form[pathKey] as string | null;
      if (serverPath) return STORAGE_BASE + serverPath;
      return null;
    },
    [localPreviews, form],
  );

  /* ── Preview poster object ─────────────────────── */
  const previewPoster = useMemo(
    () => ({
      ...form,
      main_image_url: imageUrl('main_image'),
      secondary_image_url: imageUrl('secondary_image'),
      background_image_url: imageUrl('background_image'),
      company_logo_url: imageUrl('company_logo'),
    }),
    [form, imageUrl],
  );

  /* ── Build FormData for save ───────────────────── */
  const buildFormData = useCallback((): FormData => {
    const fd = new FormData();

    // text fields
    const textFields: (keyof PosterForm)[] = [
      'title', 'subtitle', 'headline', 'subheadline', 'main_body_text',
      'warning_text', 'call_to_action', 'footer_text', 'quote_or_slogan',
      'layout_type', 'orientation', 'print_size', 'theme_key',
      'font_size', 'text_alignment', 'background_color', 'accent_color',
      'category', 'poster_type', 'topic', 'priority', 'language',
      'target_audience', 'site', 'project', 'area', 'zone',
      'department', 'contractor_name', 'effective_date', 'expiry_date',
    ];

    textFields.forEach((key) => {
      const val = form[key];
      if (val !== null && val !== undefined && val !== '') {
        fd.append(key, String(val));
      }
    });

    if (form.template_id) fd.append('template_id', String(form.template_id));

    // bullet points
    const cleanBullets = form.bullet_points.filter((b) => b.trim().length > 0);
    cleanBullets.forEach((bp, i) => {
      fd.append(`bullet_points[${i}]`, bp);
    });

    // files
    if (form.main_image) fd.append('main_image', form.main_image);
    if (form.secondary_image) fd.append('secondary_image', form.secondary_image);
    if (form.background_image) fd.append('background_image', form.background_image);
    if (form.company_logo) fd.append('company_logo', form.company_logo);

    // signal removal of server images (null paths when no new file)
    if (!form.main_image && !form.main_image_path) fd.append('remove_main_image', '1');
    if (!form.secondary_image && !form.secondary_image_path) fd.append('remove_secondary_image', '1');
    if (!form.background_image && !form.background_image_path) fd.append('remove_background_image', '1');
    if (!form.company_logo && !form.company_logo_path) fd.append('remove_company_logo', '1');

    return fd;
  }, [form]);

  /* ── Save ───────────────────────────────────────── */
  const handleSave = useCallback(
    async (publish = false) => {
      if (!form.title.trim()) {
        setStep(2);
        return;
      }
      setSaving(true);
      try {
        const fd = buildFormData();
        let posterId: number | undefined;
        if (isEdit && editId) {
          await update({ id: editId, data: fd });
          posterId = editId;
        } else {
          const result = await create(fd);
          posterId = result?.id ?? result?.data?.id;
        }
        if (publish && posterId) {
          await changeStatus({ id: posterId, status: 'Published' });
        }
        toast.success(publish ? 'Poster published successfully' : 'Poster saved successfully');
        navigate('/poster-generator');
      } catch (err: any) {
        toast.error(err?.message || 'Failed to save poster');
      } finally {
        setSaving(false);
      }
    },
    [form, isEdit, editId, buildFormData, create, update, changeStatus, navigate],
  );

  /* ── Step navigation ───────────────────────────── */
  const goNext = useCallback(() => setStep((s) => Math.min(s + 1, 5)), []);
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);
  const goToStep = useCallback((s: number) => setStep(s), []);

  /* ── Zoom controls ──────────────────────────────── */
  const zoomUp = useCallback(() => setZoom((z) => Math.min(z + 10, 150)), []);
  const zoomDown = useCallback(() => setZoom((z) => Math.max(z - 10, 20)), []);

  /* ── Close more-menu on outside click ────────────── */
  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMoreMenu]);

  /* ── View poster in new tab ─────────────────────── */
  const handleViewPoster = useCallback(() => {
    setShowMoreMenu(false);
    if (isEdit && editId) {
      window.open(`/poster-generator/${editId}/view`, '_blank');
    }
  }, [isEdit, editId]);

  /* ── Publish poster ─────────────────────────────── */
  const handlePublish = useCallback(() => {
    setShowMoreMenu(false);
    handleSave(true);
  }, [handleSave]);

  /* ── Computed poster dimensions ──────────────────── */
  const posterWidth = form.orientation === 'Landscape' ? 842 : 595;
  const posterHeight = form.orientation === 'Landscape' ? 595 : 842;
  const scaledW = posterWidth * (zoom / 100);
  const scaledH = posterHeight * (zoom / 100);

  /* ── Loading guard ─────────────────────────────── */
  if (isEdit && isDetailLoading) {
    return (
      <div className="psd-page" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--color-text-tertiary)', margin: 'auto' }}>Loading poster...</span>
      </div>
    );
  }

  /* ── Render step panels ─────────────────────────── */
  const renderStep = () => {
    switch (step) {
      case 1:
        return <StepTemplate
          form={form}
          set={set}
          templates={templates}
          isTemplatesLoading={isTemplatesLoading}
          applyTemplate={applyTemplate}
        />;
      case 2:
        return <StepContent
          form={form}
          set={set}
          addBullet={addBullet}
          removeBullet={removeBullet}
          updateBullet={updateBullet}
        />;
      case 3:
        return <StepDesign form={form} set={set} />;
      case 4:
        return <StepMedia
          form={form}
          imageUrl={imageUrl}
          handleFile={handleFile}
          removeImage={removeImage}
          mainImageRef={mainImageRef}
          secondaryImageRef={secondaryImageRef}
          backgroundImageRef={backgroundImageRef}
          companyLogoRef={companyLogoRef}
        />;
      case 5:
        return <StepMeta form={form} set={set} />;
      default:
        return null;
    }
  };

  const currentStepMeta = STEP_META[step - 1];

  return (
    <div className="psd-page">
      {/* ═══ TOP BAR ═══════════════════════════════ */}
      <div className="psd-topbar">
        <button className="psd-topbar__back" onClick={() => navigate('/poster-generator')}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        {/* Step Indicator */}
        <div className="psd-steps">
          {STEP_LABELS.map((label, idx) => {
            const num = idx + 1;
            const isActive = step === num;
            const isDone = step > num;
            // Connector before this step
            const connDone = step > num;     // both sides completed
            const connHalf = step === num;   // left done, right active
            return (
              <Fragment key={num}>
                {idx > 0 && (
                  <div
                    className={`psd-step__connector${connDone ? ' psd-step__connector--done' : connHalf ? ' psd-step__connector--half' : ''}`}
                  />
                )}
                <div className="psd-step" onClick={() => goToStep(num)}>
                  <span
                    className={`psd-step__dot${isDone ? ' psd-step__dot--done' : isActive ? ' psd-step__dot--active' : ''}`}
                  >
                    {isDone ? <Check size={13} /> : num}
                  </span>
                  <span
                    className={`psd-step__label${isDone ? ' psd-step__label--done' : isActive ? ' psd-step__label--active' : ''}`}
                  >
                    {label}
                  </span>
                </div>
              </Fragment>
            );
          })}
        </div>

        <div className="psd-topbar__actions">
          <button
            className="psd-btn-outline"
            disabled={saving || isCreating || isUpdating}
            onClick={() => handleSave(false)}
          >
            <Save size={14} />
            {saving ? 'Saving...' : 'Save'}
          </button>

          <div className="psd-more-menu" ref={moreMenuRef}>
            <button
              className="psd-more-menu__trigger"
              onClick={() => setShowMoreMenu((v) => !v)}
            >
              <MoreVertical size={18} />
            </button>
            {showMoreMenu && (
              <div className="psd-more-menu__dropdown">
                <button
                  className="psd-more-menu__item"
                  disabled={saving || isCreating || isUpdating}
                  onClick={handlePublish}
                >
                  <Send size={14} />
                  Publish
                </button>
                <button
                  className="psd-more-menu__item"
                  disabled={!isEdit}
                  onClick={handleViewPoster}
                >
                  <Eye size={14} />
                  View
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ MAIN LAYOUT ══════════════════════════ */}
      <div className="psd-layout">
        {/* ── LEFT PANEL ───────────────────────── */}
        <div className="psd-left-panel">
          <div className="psd-panel-header">
            <div className="psd-panel-title">{currentStepMeta.title}</div>
            <div className="psd-panel-subtitle">{currentStepMeta.subtitle}</div>
          </div>

          <div className="psd-panel-body">
            {renderStep()}
          </div>

          <div className="psd-panel-footer">
            {step > 1 ? (
              <button className="psd-btn-ghost" onClick={goBack}>
                <ArrowLeft size={14} /> Back
              </button>
            ) : (
              <span />
            )}
            {step < 5 ? (
              <button className="psd-btn-primary" onClick={goNext}>
                Next Step <ArrowRight size={14} />
              </button>
            ) : (
              <button
                className="psd-btn-primary"
                disabled={saving || isCreating || isUpdating}
                onClick={() => handleSave(true)}
              >
                <Send size={14} />
                {saving ? 'Publishing...' : 'Publish Poster'}
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: LIVE PREVIEW CANVAS ───────── */}
        <div className="psd-canvas">
          <span className="psd-canvas__label">LIVE PREVIEW</span>

          <div className="psd-canvas__preview-wrap">
            <div
              className="psd-canvas__poster"
              style={{ width: scaledW, height: scaledH }}
            >
              <PosterPreview
                poster={previewPoster}
                scale={zoom / 100}
                id="poster-preview"
              />
            </div>
          </div>

          <div className="psd-canvas__controls">
            {/* Orientation Pills */}
            <button
              className={`psd-orient-pill${form.orientation === 'Portrait' ? ' psd-orient-pill--active' : ''}`}
              onClick={() => set('orientation', 'Portrait')}
            >
              ◻ Portrait
            </button>
            <button
              className={`psd-orient-pill${form.orientation === 'Landscape' ? ' psd-orient-pill--active' : ''}`}
              onClick={() => set('orientation', 'Landscape')}
            >
              ⬜ Landscape
            </button>

            <div className="psd-canvas__spacer" />

            {/* Zoom Controls */}
            <div className="psd-zoom-control">
              <button className="psd-zoom-btn" onClick={zoomDown}>
                <Minus size={12} />
              </button>
              <span>{zoom}%</span>
              <button className="psd-zoom-btn" onClick={zoomUp}>
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ═══════════════════════════════════════════════════
   STEP 1 — Template
   ═══════════════════════════════════════════════════ */

interface StepTemplateProps {
  form: PosterForm;
  set: <K extends keyof PosterForm>(key: K, value: PosterForm[K]) => void;
  templates: ReturnType<typeof usePosters>['templates'];
  isTemplatesLoading: boolean;
  applyTemplate: (tpl: StepTemplateProps['templates'][number]) => void;
}

function StepTemplate({ form, set, templates, isTemplatesLoading, applyTemplate }: StepTemplateProps) {
  const selectedTemplate = templates.find((t) => t.id === form.template_id);

  return (
    <>
      {/* Print Size Chips */}
      <div className="psd-section-label">Print Size</div>
      <div className="psd-size-chips">
        {POSTER_PRINT_SIZES.map((s) => (
          <button
            key={s}
            className={`psd-size-chip${form.print_size === s ? ' psd-size-chip--active' : ''}`}
            onClick={() => set('print_size', s)}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Template Grid */}
      <div className="psd-section-label">Choose a Starting Template</div>

      {isTemplatesLoading ? (
        <p style={{ fontSize: 13, color: 'var(--color-text-tertiary)' }}>Loading templates...</p>
      ) : (
        <div className="psd-template-grid">
          {/* Blank option */}
          <div
            className={`psd-blank-card${form.template_id === null ? ' psd-blank-card--selected' : ''}`}
            onClick={() => {
              set('template_id', null);
              set('layout_type', '');
            }}
          >
            <Plus size={32} style={{ color: form.template_id === null ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: form.template_id === null ? 'var(--color-primary-700)' : 'var(--color-text-secondary)' }}>
              Start from Blank
            </span>
            <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>Empty canvas</span>
            {form.template_id === null && (
              <span className="psd-check-badge"><Check size={12} /></span>
            )}
          </div>

          {/* Template cards */}
          {templates.map((tpl) => {
            const theme = getThemeByKey(tpl.default_theme_key ?? '');
            const isSelected = form.template_id === tpl.id;
            return (
              <div
                key={tpl.id}
                className={`psd-template-card${isSelected ? ' psd-template-card--selected' : ''}`}
                onClick={() => applyTemplate(tpl)}
              >
                {/* Color-coded visual preview */}
                <div className="psd-template-card__visual">
                  {/* Header stripe */}
                  <div style={{ height: 8, background: theme.header_bg, flexShrink: 0 }} />
                  {/* Content area */}
                  <div
                    style={{
                      flex: 1,
                      background: theme.background,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        color: theme.primary,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {tpl.layout_type ?? 'Standard'}
                    </span>
                    {/* Content block indicators */}
                    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
                      <div style={{ width: 20, height: 4, borderRadius: 1, background: theme.primary, opacity: 0.4 }} />
                      <div style={{ width: 14, height: 4, borderRadius: 1, background: theme.accent, opacity: 0.5 }} />
                      <div style={{ width: 18, height: 4, borderRadius: 1, background: theme.primary, opacity: 0.3 }} />
                    </div>
                  </div>
                  {/* Accent stripe */}
                  <div style={{ height: 5, background: theme.accent, flexShrink: 0 }} />
                </div>

                {/* Footer info */}
                <div className="psd-template-card__footer">
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="psd-template-card__name">{tpl.name}</div>
                    <div className="psd-template-card__cat">{tpl.category ?? 'Template'}</div>
                  </div>
                  <span className="psd-template-card__size">{tpl.print_size ?? 'A4'}</span>
                </div>

                {/* Selected badge */}
                {isSelected && (
                  <span className="psd-check-badge"><Check size={12} /></span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selection summary strip */}
      {selectedTemplate && (
        <div className="psd-selection-strip">
          <Check size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
          <div className="psd-selection-strip__info">
            <div className="psd-selection-strip__name">{selectedTemplate.name}</div>
            <div className="psd-selection-strip__desc">
              {selectedTemplate.description ?? selectedTemplate.category ?? 'Selected template'}
            </div>
          </div>
          <button
            className="psd-selection-strip__change"
            onClick={() => {
              set('template_id', null);
              set('layout_type', '');
            }}
          >
            Change
          </button>
        </div>
      )}
    </>
  );
}


/* ═══════════════════════════════════════════════════
   STEP 2 — Content
   ═══════════════════════════════════════════════════ */

interface StepContentProps {
  form: PosterForm;
  set: <K extends keyof PosterForm>(key: K, value: PosterForm[K]) => void;
  addBullet: () => void;
  removeBullet: (idx: number) => void;
  updateBullet: (idx: number, value: string) => void;
}

function StepContent({ form, set, addBullet, removeBullet, updateBullet }: StepContentProps) {
  return (
    <>
      {/* ── Group 1: Headline ───────────────── */}
      <div className="psd-field-group">
        <div className="psd-field-group__header">
          <span>✦</span> Headline
        </div>
        <div className="psd-field-group__body">
          <div className="pst-form-group">
            <label className="pst-form-label">
              Title <span style={{ color: 'var(--color-danger-500)' }}>*</span>
            </label>
            <input
              className="pst-form-input"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="Poster title (required)"
            />
          </div>
          <div className="pst-form-group">
            <label className="pst-form-label">
              Subtitle <span className="psd-opt-badge">Optional</span>
            </label>
            <input
              className="pst-form-input"
              value={form.subtitle}
              onChange={(e) => set('subtitle', e.target.value)}
              placeholder="Optional subtitle"
            />
          </div>
        </div>
      </div>

      {/* ── Group 2: Main Message ───────────── */}
      <div className="psd-field-group">
        <div className="psd-field-group__header">
          <span>¶</span> Main Message
        </div>
        <div className="psd-field-group__body">
          <div className="pst-form-group">
            <label className="pst-form-label">Headline</label>
            <input
              className="pst-form-input"
              value={form.headline}
              onChange={(e) => set('headline', e.target.value)}
              placeholder="Large headline text"
            />
          </div>
          <div className="pst-form-group">
            <label className="pst-form-label">
              Subheadline <span className="psd-opt-badge">Optional</span>
            </label>
            <input
              className="pst-form-input"
              value={form.subheadline}
              onChange={(e) => set('subheadline', e.target.value)}
              placeholder="Supporting subheadline"
            />
          </div>
          <div className="pst-form-group">
            <label className="pst-form-label">Main Body Text</label>
            <textarea
              className="pst-form-textarea"
              rows={3}
              value={form.main_body_text}
              onChange={(e) => set('main_body_text', e.target.value)}
              placeholder="Main body paragraph text..."
            />
          </div>
        </div>
      </div>

      {/* ── Group 3: Supporting Content ─────── */}
      <div className="psd-field-group">
        <div className="psd-field-group__header">
          <span>≡</span> Supporting Content
        </div>
        <div className="psd-field-group__body">
          {/* Bullet points */}
          <div className="pst-form-group">
            <label className="pst-form-label">Bullet Points</label>
            <div className="psd-bullet-list">
              {form.bullet_points.map((bp, idx) => (
                <div key={idx} className="psd-bullet-item">
                  <span className="psd-bullet-drag">⣿</span>
                  <span className="psd-bullet-indicator">▶</span>
                  <input
                    className="pst-form-input"
                    value={bp}
                    onChange={(e) => updateBullet(idx, e.target.value)}
                    placeholder={`Bullet point ${idx + 1}`}
                  />
                  <button
                    className="psd-bullet-remove"
                    onClick={() => removeBullet(idx)}
                    disabled={form.bullet_points.length <= 1}
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button className="psd-add-btn" onClick={addBullet}>
              <Plus size={14} /> Add Bullet Point
            </button>
          </div>

          <div className="pst-form-group">
            <label className="pst-form-label">
              <span>⚠</span> Warning Text <span className="psd-opt-badge">Optional</span>
            </label>
            <input
              className="pst-form-input"
              value={form.warning_text}
              onChange={(e) => set('warning_text', e.target.value)}
              placeholder="Warning or alert message"
            />
          </div>

          <div className="pst-form-group">
            <label className="pst-form-label">
              Call to Action <span className="psd-opt-badge">Optional</span>
            </label>
            <input
              className="pst-form-input"
              value={form.call_to_action}
              onChange={(e) => set('call_to_action', e.target.value)}
              placeholder='e.g. "Report Now" or "Stay Safe"'
            />
          </div>
        </div>
      </div>

      {/* ── Group 4: Footer ─────────────────── */}
      <div className="psd-field-group">
        <div className="psd-field-group__header">
          <span>⎵</span> Footer
        </div>
        <div className="psd-field-group__body">
          <div className="psd-field-row">
            <div className="pst-form-group">
              <label className="pst-form-label">Footer Text</label>
              <input
                className="pst-form-input"
                value={form.footer_text}
                onChange={(e) => set('footer_text', e.target.value)}
                placeholder="e.g. company tagline"
              />
            </div>
            <div className="pst-form-group">
              <label className="pst-form-label">Quote / Slogan</label>
              <textarea
                className="pst-form-textarea"
                rows={2}
                value={form.quote_or_slogan}
                onChange={(e) => set('quote_or_slogan', e.target.value)}
                placeholder="Safety slogan or quote"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


/* ═══════════════════════════════════════════════════
   STEP 3 — Design
   ═══════════════════════════════════════════════════ */

interface StepDesignProps {
  form: PosterForm;
  set: <K extends keyof PosterForm>(key: K, value: PosterForm[K]) => void;
}

function StepDesign({ form, set }: StepDesignProps) {
  const [showColors, setShowColors] = useState(false);

  return (
    <>
      {/* ── Theme Gallery ───────────────────── */}
      <div className="psd-section-label">Colour Theme</div>
      <div className="psd-theme-gallery">
        {POSTER_THEMES.map((theme) => {
          const isSelected = form.theme_key === theme.key;
          return (
            <div key={theme.key}>
              <div
                className={`psd-theme-card${isSelected ? ' psd-theme-card--selected' : ''}`}
                onClick={() => set('theme_key', theme.key)}
              >
                <div
                  className="psd-theme-card__top"
                  style={{ background: theme.header_bg, color: theme.header_text }}
                >
                  Aa
                </div>
                <div
                  className="psd-theme-card__bottom"
                  style={{ background: theme.background }}
                >
                  <span className="psd-theme-swatch" style={{ background: theme.primary }} />
                  <span className="psd-theme-swatch" style={{ background: theme.accent }} />
                  <span className="psd-theme-swatch" style={{ background: theme.text }} />
                </div>
                {isSelected && (
                  <span className="psd-check-badge" style={{ width: 20, height: 20, top: 5, right: 5 }}>
                    <Check size={11} />
                  </span>
                )}
              </div>
              <div className="psd-theme-name">{theme.label}</div>
            </div>
          );
        })}
      </div>

      {/* ── Typography ──────────────────────── */}
      <div className="psd-section-label">Typography</div>

      {/* Font Size */}
      <div style={{ marginBottom: 14 }}>
        <label className="pst-form-label" style={{ marginBottom: 6 }}>Font Size</label>
        <div className="psd-font-size-group">
          {POSTER_FONT_SIZES.map((s) => {
            const isActive = form.font_size === s;
            const aaSize = s === 'Small' ? 11 : s === 'Medium' ? 13 : s === 'Large' ? 16 : 19;
            return (
              <button
                key={s}
                className={`psd-font-size-btn${isActive ? ' psd-font-size-btn--active' : ''}`}
                onClick={() => set('font_size', s)}
              >
                <span style={{ fontSize: aaSize, fontWeight: 700, lineHeight: 1 }}>Aa</span>
                <span className="psd-font-size-btn__label">{s === 'Extra Large' ? 'XL' : s}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Text Alignment */}
      <div style={{ marginBottom: 16 }}>
        <label className="pst-form-label" style={{ marginBottom: 6 }}>Text Alignment</label>
        <div className="psd-align-group">
          {POSTER_TEXT_ALIGNMENTS.map((a) => {
            const isActive = form.text_alignment === a;
            const Icon = a === 'Left' ? AlignLeft : a === 'Center' ? AlignCenter : AlignRight;
            return (
              <button
                key={a}
                className={`psd-align-btn${isActive ? ' psd-align-btn--active' : ''}`}
                onClick={() => set('text_alignment', a)}
              >
                <Icon size={16} /> {a}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Color Overrides (collapsible) ──── */}
      <div className="psd-collapsible">
        <button
          className="psd-collapsible__trigger"
          onClick={() => setShowColors(!showColors)}
        >
          <span>Custom Color Override</span>
          <ChevronDown
            size={14}
            style={{
              transform: showColors ? 'rotate(180deg)' : 'rotate(0)',
              transition: 'transform 200ms ease',
            }}
          />
        </button>
        {showColors && (
          <div className="psd-collapsible__body">
            {/* Background Color */}
            <div className="pst-form-group">
              <label className="pst-form-label">Background Color</label>
              <div className="psd-color-input-row">
                <input
                  type="color"
                  className="psd-color-swatch"
                  value={form.background_color || getThemeByKey(form.theme_key).background}
                  onChange={(e) => set('background_color', e.target.value)}
                />
                <input
                  className="pst-form-input"
                  value={form.background_color}
                  onChange={(e) => set('background_color', e.target.value)}
                  placeholder={getThemeByKey(form.theme_key).background}
                  style={{ flex: 1 }}
                />
                {form.background_color && (
                  <button className="psd-color-clear" onClick={() => set('background_color', '')}>
                    <XIcon size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Accent Color */}
            <div className="pst-form-group">
              <label className="pst-form-label">Accent Color</label>
              <div className="psd-color-input-row">
                <input
                  type="color"
                  className="psd-color-swatch"
                  value={form.accent_color || getThemeByKey(form.theme_key).accent}
                  onChange={(e) => set('accent_color', e.target.value)}
                />
                <input
                  className="pst-form-input"
                  value={form.accent_color}
                  onChange={(e) => set('accent_color', e.target.value)}
                  placeholder={getThemeByKey(form.theme_key).accent}
                  style={{ flex: 1 }}
                />
                {form.accent_color && (
                  <button className="psd-color-clear" onClick={() => set('accent_color', '')}>
                    <XIcon size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}


/* ═══════════════════════════════════════════════════
   STEP 4 — Media
   ═══════════════════════════════════════════════════ */

type ImageField = 'main_image' | 'secondary_image' | 'background_image' | 'company_logo';

interface StepMediaProps {
  form: PosterForm;
  imageUrl: (field: ImageField) => string | null;
  handleFile: (field: ImageField, file: File | null) => void;
  removeImage: (field: ImageField) => void;
  mainImageRef: React.RefObject<HTMLInputElement | null>;
  secondaryImageRef: React.RefObject<HTMLInputElement | null>;
  backgroundImageRef: React.RefObject<HTMLInputElement | null>;
  companyLogoRef: React.RefObject<HTMLInputElement | null>;
}

const MEDIA_FIELDS: { key: ImageField; label: string; hint: string; refKey: string }[] = [
  { key: 'main_image', label: 'Main Image', hint: 'Primary hero image displayed prominently', refKey: 'mainImageRef' },
  { key: 'secondary_image', label: 'Secondary Image', hint: 'Supporting visual in the content area', refKey: 'secondaryImageRef' },
  { key: 'background_image', label: 'Background Image', hint: 'Full background behind poster content', refKey: 'backgroundImageRef' },
  { key: 'company_logo', label: 'Company Logo', hint: 'Displayed in the header area', refKey: 'companyLogoRef' },
];

function StepMedia({
  form, imageUrl, handleFile, removeImage,
  mainImageRef, secondaryImageRef, backgroundImageRef, companyLogoRef,
}: StepMediaProps) {
  const refs: Record<string, React.RefObject<HTMLInputElement | null>> = {
    mainImageRef,
    secondaryImageRef,
    backgroundImageRef,
    companyLogoRef,
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>, field: ImageField) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(field, file);
    }
  }, [handleFile]);

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <>
      <div className="psd-media-grid">
        {MEDIA_FIELDS.map(({ key, label, hint, refKey }) => {
          const url = imageUrl(key);
          const fileRef = refs[refKey];
          const isLogo = key === 'company_logo';

          return (
            <div
              key={key}
              className={`psd-media-slot${isLogo ? ' psd-media-slot--logo' : ''}${url ? ' psd-media-slot--filled' : ' psd-media-slot--empty'}`}
              onDrop={(e) => onDrop(e, key)}
              onDragOver={onDragOver}
            >
              {url ? (
                <>
                  <img src={url} alt={label} className="psd-media-slot__img" />
                  <span className="psd-media-slot__badge">{label}</span>
                  <div className="psd-media-slot__overlay">
                    <button
                      className="psd-media-overlay-btn"
                      onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                    >
                      Replace
                    </button>
                    <button
                      className="psd-media-overlay-btn psd-media-overlay-btn--danger"
                      onClick={(e) => { e.stopPropagation(); removeImage(key); }}
                    >
                      Remove
                    </button>
                  </div>
                </>
              ) : (
                <div className="psd-media-slot__empty" onClick={() => fileRef.current?.click()}>
                  <Upload size={22} />
                  <span className="psd-media-slot__label">{label}</span>
                  <span className="psd-media-slot__hint">Click or drag · JPG, PNG</span>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  handleFile(key, file);
                  e.target.value = '';
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="psd-media-note">
        Main image appears in the hero section.
        Background image overlays the theme color.
        Logo appears in the poster header.
      </div>
    </>
  );
}


/* ═══════════════════════════════════════════════════
   STEP 5 — Links & Meta
   ═══════════════════════════════════════════════════ */

interface StepMetaProps {
  form: PosterForm;
  set: <K extends keyof PosterForm>(key: K, value: PosterForm[K]) => void;
}

function StepMeta({ form, set }: StepMetaProps) {
  return (
    <>
      {/* ── Card 1: Classification ─────────── */}
      <div className="psd-field-group">
        <div className="psd-field-group__header">
          <span>🏷</span> Classification
        </div>
        <div className="psd-field-group__body">
          <div className="psd-field-row">
            <div className="pst-form-group">
              <label className="pst-form-label">Category</label>
              <SelectWithOther
                options={POSTER_CATEGORIES}
                value={form.category}
                onChange={(v) => set('category', v)}
                placeholder="-- Select --"
                selectClassName="pst-form-select"
                inputClassName="pst-form-select"
              />
            </div>
            <div className="pst-form-group">
              <label className="pst-form-label">Type</label>
              <SelectWithOther
                options={POSTER_TYPES}
                value={form.poster_type}
                onChange={(v) => set('poster_type', v)}
                placeholder="-- Select --"
                selectClassName="pst-form-select"
                inputClassName="pst-form-select"
              />
            </div>
          </div>

          <div className="psd-field-row">
            <div className="pst-form-group">
              <label className="pst-form-label">Topic</label>
              <SelectWithOther
                options={POSTER_TOPICS}
                value={form.topic}
                onChange={(v) => set('topic', v)}
                placeholder="-- Select --"
                selectClassName="pst-form-select"
                inputClassName="pst-form-select"
              />
            </div>
            <div className="pst-form-group">
              <label className="pst-form-label">Priority</label>
              <select
                className="pst-form-select"
                value={form.priority}
                onChange={(e) => set('priority', e.target.value as PosterForm['priority'])}
              >
                {POSTER_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="psd-field-row">
            <div className="pst-form-group">
              <label className="pst-form-label">Language</label>
              <SelectWithOther
                options={LANGUAGES}
                value={form.language}
                onChange={(v) => set('language', v)}
                placeholder="-- Select --"
                selectClassName="pst-form-select"
                inputClassName="pst-form-select"
              />
            </div>
            <div className="pst-form-group">
              <label className="pst-form-label">Target Audience</label>
              <SelectWithOther
                options={POSTER_AUDIENCES}
                value={form.target_audience}
                onChange={(v) => set('target_audience', v)}
                placeholder="-- Select --"
                selectClassName="pst-form-select"
                inputClassName="pst-form-select"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Card 2: Location & Scope ──────── */}
      <div className="psd-field-group">
        <div className="psd-field-group__header">
          <span>📍</span> Location & Scope
        </div>
        <div className="psd-field-group__body">
          <div className="psd-field-row">
            <div className="pst-form-group">
              <label className="pst-form-label">Site</label>
              <input
                className="pst-form-input"
                value={form.site}
                onChange={(e) => set('site', e.target.value)}
                placeholder="e.g. KAEC"
              />
            </div>
            <div className="pst-form-group">
              <label className="pst-form-label">Project</label>
              <input
                className="pst-form-input"
                value={form.project}
                onChange={(e) => set('project', e.target.value)}
                placeholder="e.g. Phase 2"
              />
            </div>
          </div>

          <div className="psd-field-row">
            <div className="pst-form-group">
              <label className="pst-form-label">Area</label>
              <input
                className="pst-form-input"
                value={form.area}
                onChange={(e) => set('area', e.target.value)}
                placeholder="e.g. Zone A"
              />
            </div>
            <div className="pst-form-group">
              <label className="pst-form-label">Zone</label>
              <input
                className="pst-form-input"
                value={form.zone}
                onChange={(e) => set('zone', e.target.value)}
                placeholder="e.g. Block 3"
              />
            </div>
          </div>

          <div className="psd-field-row">
            <div className="pst-form-group">
              <label className="pst-form-label">Department</label>
              <input
                className="pst-form-input"
                value={form.department}
                onChange={(e) => set('department', e.target.value)}
                placeholder="e.g. HSE"
              />
            </div>
            <div className="pst-form-group">
              <label className="pst-form-label">
                Contractor <span className="psd-opt-badge">Optional</span>
              </label>
              <input
                className="pst-form-input"
                value={form.contractor_name}
                onChange={(e) => set('contractor_name', e.target.value)}
                placeholder="Contractor name"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Card 3: Schedule ──────────────── */}
      <div className="psd-field-group">
        <div className="psd-field-group__header">
          <span>📅</span> Schedule
        </div>
        <div className="psd-field-group__body">
          <div className="psd-field-row">
            <div className="pst-form-group">
              <label className="pst-form-label">Effective Date</label>
              <input
                className="pst-form-input"
                type="date"
                value={form.effective_date}
                onChange={(e) => set('effective_date', e.target.value)}
              />
            </div>
            <div className="pst-form-group">
              <label className="pst-form-label">Expiry Date</label>
              <input
                className="pst-form-input"
                type="date"
                value={form.expiry_date}
                onChange={(e) => set('expiry_date', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
