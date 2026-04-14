import React from 'react';
import { getThemeByKey, type PosterTheme } from '../../../config/posterConfig';

interface PosterPreviewProps {
  poster: {
    orientation?: 'Portrait' | 'Landscape';
    theme_key?: string | null;
    background_color?: string | null;
    accent_color?: string | null;
    font_size?: 'Small' | 'Medium' | 'Large' | 'Extra Large';
    text_alignment?: 'Left' | 'Center' | 'Right';
    headline?: string | null;
    subheadline?: string | null;
    main_body_text?: string | null;
    bullet_points?: string[] | null;
    warning_text?: string | null;
    call_to_action?: string | null;
    footer_text?: string | null;
    quote_or_slogan?: string | null;
    main_image_url?: string | null;
    secondary_image_url?: string | null;
    background_image_url?: string | null;
    company_logo_url?: string | null;
    category?: string | null;
    poster_type?: string | null;
    poster_code?: string | null;
    site?: string | null;
    [key: string]: unknown;
  };
  scale?: number;
  id?: string;
}

const HEADLINE_SIZES: Record<string, number> = {
  Small: 18,
  Medium: 22,
  Large: 28,
  'Extra Large': 36,
};

function getTextAlign(alignment?: string | null): React.CSSProperties['textAlign'] {
  if (alignment === 'Left') return 'left';
  if (alignment === 'Right') return 'right';
  return 'center';
}

function getDividerMargin(alignment?: string | null): React.CSSProperties {
  if (alignment === 'Right') return { marginLeft: 'auto', marginRight: 0 };
  if (alignment === 'Left') return { marginLeft: 0, marginRight: 'auto' };
  return { marginLeft: 'auto', marginRight: 'auto' };
}

function getCtaAlignment(alignment?: string | null): React.CSSProperties {
  if (alignment === 'Right') return { textAlign: 'right' };
  if (alignment === 'Left') return { textAlign: 'left' };
  return { textAlign: 'center' };
}

function formatDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const PosterPreview: React.FC<PosterPreviewProps> = ({ poster, scale = 1, id }) => {
  const theme: PosterTheme = getThemeByKey(poster.theme_key ?? '');

  const isLandscape = poster.orientation === 'Landscape';
  const docWidth = isLandscape ? 842 : 595;
  const docHeight = isLandscape ? 595 : 842;

  const bgColor = poster.background_color || theme.background;
  const accentColor = poster.accent_color || theme.accent;

  const headlineFontSize = HEADLINE_SIZES[poster.font_size ?? 'Medium'] ?? 22;
  const subheadlineFontSize = Math.round(headlineFontSize * 0.75);
  const textAlign = getTextAlign(poster.text_alignment);

  const bullets = (poster.bullet_points ?? []).filter(
    (b): b is string => typeof b === 'string' && b.trim().length > 0
  );

  return (
    <div
      id={id}
      className="pst-preview-doc"
      style={{
        width: docWidth,
        height: docHeight,
        backgroundColor: bgColor,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
        fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        backgroundImage: poster.background_image_url
          ? `url(${poster.background_image_url})`
          : undefined,
        backgroundSize: poster.background_image_url ? 'cover' : undefined,
        backgroundPosition: poster.background_image_url ? 'center' : undefined,
      }}
    >
      {/* ── 1. HEADER BAR ──────────────────────────────── */}
      <div
        className="pst-preview-doc__header"
        style={{
          backgroundColor: theme.header_bg,
          color: theme.header_text,
        }}
      >
        {/* Left: Logo */}
        <div style={{ flexShrink: 0 }}>
          {poster.company_logo_url ? (
            <img
              src={poster.company_logo_url}
              alt="Company Logo"
              style={{ maxHeight: 60, maxWidth: 120, objectFit: 'contain' }}
            />
          ) : (
            <span style={{ fontSize: 14, fontWeight: 700, opacity: 0.7 }}>LOGO</span>
          )}
        </div>

        {/* Center: Category */}
        <div
          style={{
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            fontWeight: 600,
            opacity: 0.85,
          }}
        >
          {poster.category ?? ''}
        </div>

        {/* Right: Site */}
        <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.85, flexShrink: 0 }}>
          {poster.site ?? ''}
        </div>
      </div>

      {/* ── 2. HERO SECTION ────────────────────────────── */}
      <div className="pst-preview-doc__hero">
        {poster.main_image_url ? (
          <img
            src={poster.main_image_url}
            alt="Main visual"
            style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: 160,
              background: `linear-gradient(135deg, ${theme.primary} 0%, ${accentColor} 100%)`,
            }}
          />
        )}
      </div>

      {/* ── 3. CONTENT AREA ────────────────────────────── */}
      <div
        className="pst-preview-doc__content"
        style={{ textAlign, flex: 1, overflow: 'hidden' }}
      >
        {/* A. Warning Strip */}
        {poster.warning_text && (
          <div
            className="pst-preview-doc__warning"
            style={{
              backgroundColor: accentColor,
              color: '#FFFFFF',
            }}
          >
            ⚠ {poster.warning_text}
          </div>
        )}

        {/* B. Headline */}
        {poster.headline && (
          <div
            className="pst-preview-doc__headline"
            style={{
              fontSize: headlineFontSize,
              color: theme.primary,
            }}
          >
            {poster.headline}
          </div>
        )}

        {/* C. Subheadline */}
        {poster.subheadline && (
          <div
            className="pst-preview-doc__subheadline"
            style={{
              fontSize: subheadlineFontSize,
              color: theme.primary,
            }}
          >
            {poster.subheadline}
          </div>
        )}

        {/* D. Divider */}
        <div
          className="pst-preview-doc__divider"
          style={{
            backgroundColor: accentColor,
            ...getDividerMargin(poster.text_alignment),
          }}
        />

        {/* E. Main Body Text */}
        {poster.main_body_text && (
          <div
            className="pst-preview-doc__body"
            style={{
              color: theme.text,
              maxWidth: '90%',
              ...(textAlign === 'center' ? { marginLeft: 'auto', marginRight: 'auto' } : {}),
              ...(textAlign === 'right' ? { marginLeft: 'auto' } : {}),
            }}
          >
            {poster.main_body_text}
          </div>
        )}

        {/* F. Bullet Points */}
        {bullets.length > 0 && (
          <ul className="pst-preview-doc__bullets">
            {bullets.map((point, idx) => (
              <li key={idx}>
                <span style={{ color: accentColor, flexShrink: 0 }}>&#9654;</span>
                <span style={{ color: theme.text }}>{point}</span>
              </li>
            ))}
          </ul>
        )}

        {/* G. Secondary Image */}
        {poster.secondary_image_url && (
          <div style={{ ...getCtaAlignment(poster.text_alignment), marginBottom: 12 }}>
            <img
              src={poster.secondary_image_url}
              alt="Secondary visual"
              style={{
                maxHeight: 120,
                maxWidth: '100%',
                objectFit: 'contain',
                borderRadius: 4,
              }}
            />
          </div>
        )}

        {/* H. Call To Action */}
        {poster.call_to_action && (
          <div style={getCtaAlignment(poster.text_alignment)}>
            <span
              className="pst-preview-doc__cta"
              style={{
                backgroundColor: accentColor,
                color: '#FFFFFF',
              }}
            >
              {poster.call_to_action}
            </span>
          </div>
        )}

        {/* I. Quote / Slogan */}
        {poster.quote_or_slogan && (
          <div
            className="pst-preview-doc__quote"
            style={{
              borderLeft: `3px solid ${accentColor}`,
              color: theme.text,
            }}
          >
            &ldquo;{poster.quote_or_slogan}&rdquo;
          </div>
        )}
      </div>

      {/* ── 4. FOOTER BAR ──────────────────────────────── */}
      <div style={{ marginTop: 'auto' }}>
        <div
          className="pst-preview-doc__footer"
          style={{
            backgroundColor: theme.header_bg,
            color: theme.header_text,
          }}
        >
          <span>{poster.footer_text || 'Safety First'}</span>
          <span>
            {poster.poster_code ? `${poster.poster_code} | ` : ''}
            {formatDate()}
          </span>
        </div>
        <div
          className="pst-preview-doc__accent-strip"
          style={{ backgroundColor: accentColor }}
        />
      </div>
    </div>
  );
};

export default PosterPreview;
