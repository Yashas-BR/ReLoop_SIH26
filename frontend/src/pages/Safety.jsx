/**
 * Safety Guidance Page — /safety
 *
 * Static content — NO API call required.
 * Renders fully offline once the JS bundle is cached.
 * Designed for field use: large text, short bullets, visible warnings.
 *
 * Available to both Collector and Recycler portals.
 */

import './Safety.css';

const SAFETY_SECTIONS = [
  {
    id: 'general',
    icon: '🦺',
    title: 'General Safety',
    color: 'blue',
    items: [
      'Inspect materials before handling — look for damage, leaks, or unusual smells.',
      'Never handle materials in poor lighting or confined spaces without ventilation.',
      'Keep your work area clean and free of clutter to avoid trips and falls.',
      'Wash hands thoroughly after handling any materials.',
      'Do not eat, drink, or touch your face while handling recyclables.',
      'Always inform someone of your location when working alone in the field.',
    ],
  },
  {
    id: 'ppe',
    icon: '🧤',
    title: 'Protective Equipment',
    color: 'purple',
    items: [
      'Wear heavy-duty gloves when handling any electronic waste.',
      'Use closed-toe footwear — sandals are not appropriate for fieldwork.',
      'Wear safety glasses or goggles when dismantling or breaking materials.',
      'Use a dust mask (N95 or equivalent) in dusty environments or when handling old CRT screens.',
      'Wear long sleeves and trousers to protect skin from sharp edges.',
    ],
  },
  {
    id: 'materials',
    icon: '♻️',
    title: 'Material Handling',
    color: 'green',
    items: [
      'Sort materials before transport — mixed loads are harder and riskier to handle.',
      'Secure loads properly before transporting — loose items shift and cause injury.',
      'Use a trolley or cart for heavy loads — do not strain your back.',
      'Stack heavy items at the bottom of a pile, lighter items on top.',
      'Keep different material categories separate to prevent contamination.',
    ],
  },
  {
    id: 'sharp',
    icon: '⚠️',
    title: 'Sharp & Hazardous Materials',
    color: 'amber',
    warning: true,
    items: [
      'Broken glass, metal shards, and exposed circuit board pins are all sharp — handle with thick gloves.',
      'Never pick up broken CRT glass without eye protection and thick gloves.',
      'If a material has visible rust or corrosion, avoid skin contact.',
      'Do not apply pressure to cracked or bulging batteries — risk of rupture.',
      'Place sharp items in a rigid container — never loose in a bag.',
    ],
    doNot: [
      'Do NOT handle severely broken materials with bare hands.',
      'Do NOT place sharp items in soft bags or pockets.',
      'Do NOT attempt to repair or disassemble damaged equipment yourself.',
    ],
  },
  {
    id: 'ewaste',
    icon: '💻',
    title: 'Electronic Waste (E-Waste)',
    color: 'purple',
    items: [
      'Old CRT monitors and televisions may contain lead — avoid dust from broken units.',
      'Circuit boards (PCBs) may have traces of lead solder — wash hands after contact.',
      'Do not attempt to open or dismantle capacitors or power supplies.',
      'LCD panels may contain mercury — do not break or crush them.',
      'Store e-waste in a dry location away from direct heat or sunlight.',
      'Batteries from electronics should be separated and stored upright.',
    ],
    doNot: [
      'Do NOT attempt to drain or discharge batteries yourself.',
      'Do NOT incinerate or crush batteries.',
      'Do NOT mix e-waste with general household waste.',
    ],
  },
  {
    id: 'chemical',
    icon: '🧪',
    title: 'Chemical & Unknown Materials',
    color: 'red',
    warning: true,
    items: [
      'If a material has an unknown smell, liquid, or powder — do not touch it.',
      'Do not handle materials with visible chemical stains or residues.',
      'If you suspect a hazardous chemical, leave the area and call for assistance.',
      'Never mix unknown liquids — chemical reactions can cause injury.',
    ],
    doNot: [
      'Do NOT handle any container that is leaking, pressurized, or unlabelled.',
      'Do NOT smell or taste unknown substances to identify them.',
      'Do NOT attempt to clean up large chemical spills yourself.',
    ],
  },
  {
    id: 'emergency',
    icon: '🚨',
    title: 'Emergency Guidance',
    color: 'red',
    warning: true,
    items: [
      'If you are injured: apply pressure to wounds, move away from hazards, call for help immediately.',
      'If you inhale fumes: move to fresh air immediately, call for medical help if symptoms persist.',
      'If skin contact with unknown substance: rinse with clean water for at least 15 minutes.',
      'If eyes are exposed: flush gently with clean water for 15 minutes, seek medical help.',
      'Emergency number (India): 112',
      'Poison Control Helpline (India): 1800-11-6117',
    ],
  },
];

const COLOR_MAP = {
  blue:   { bg: 'var(--color-info-light)',        border: 'var(--color-info)',        icon: 'var(--color-info)' },
  green:  { bg: 'var(--color-success-light)',     border: 'var(--color-success)',     icon: 'var(--color-success)' },
  purple: { bg: 'var(--color-primary-light)',     border: 'var(--color-primary)',     icon: 'var(--color-primary)' },
  amber:  { bg: 'var(--color-warning-light)',     border: 'var(--color-warning)',     icon: 'var(--color-warning)' },
  red:    { bg: 'var(--color-destructive-light)', border: 'var(--color-destructive)', icon: 'var(--color-destructive)' },
};

function SafetySection({ section }) {
  const colors = COLOR_MAP[section.color] ?? COLOR_MAP.blue;

  return (
    <article
      className={`safety-card ${section.warning ? 'safety-card--warning' : ''}`}
      style={{
        borderColor: colors.border,
        '--section-icon-color': colors.icon,
      }}
      aria-labelledby={`safety-${section.id}-heading`}
    >
      <div className="safety-card__header">
        <div
          className="safety-card__icon-wrap"
          style={{ background: colors.bg }}
          aria-hidden="true"
        >
          {section.icon}
        </div>
        <h2
          id={`safety-${section.id}-heading`}
          className="safety-card__title"
        >
          {section.title}
        </h2>
        {section.warning && (
          <span className="safety-warning-badge" aria-label="Warning">⚠ Warning</span>
        )}
      </div>

      <ul className="safety-card__list" aria-label={`${section.title} guidelines`}>
        {section.items.map((item, i) => (
          <li key={i} className="safety-card__item">
            <span className="safety-card__bullet" aria-hidden="true">•</span>
            {item}
          </li>
        ))}
      </ul>

      {section.doNot && section.doNot.length > 0 && (
        <div className="safety-donot-block" role="note">
          <p className="safety-donot-block__heading" aria-label="Do not do the following">
            <span aria-hidden="true">🚫</span> Do NOT:
          </p>
          <ul className="safety-donot-block__list">
            {section.doNot.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

export default function SafetyGuidance() {
  return (
    <div className="container">
      {/* Page Header */}
      <div className="safety-header animate-fade-in">
        <div className="safety-header__icon" aria-hidden="true">🦺</div>
        <div>
          <h1 className="section-title">Safety Guidance</h1>
          <p className="section-subtitle">
            Essential safety information for handling recyclable and electronic materials
          </p>
        </div>
      </div>

      {/* Offline notice — page works offline */}
      <div className="safety-offline-notice animate-fade-in" role="note">
        <span aria-hidden="true">📶</span>
        <span>This page is available offline once loaded. No internet connection required.</span>
      </div>

      {/* Quick jump nav — useful on mobile for long pages */}
      <nav className="safety-jumpnav animate-fade-in" aria-label="Jump to safety section">
        {SAFETY_SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#safety-${s.id}-heading`}
            className="safety-jumpnav__link"
          >
            <span aria-hidden="true">{s.icon}</span>
            {s.title}
          </a>
        ))}
      </nav>

      {/* Sections */}
      <div className="safety-sections animate-fade-in">
        {SAFETY_SECTIONS.map((section) => (
          <SafetySection key={section.id} section={section} />
        ))}
      </div>

      {/* Footer reminder */}
      <div className="safety-footer animate-fade-in" role="contentinfo">
        <p>
          <strong>When in doubt, do not handle the material.</strong> Contact your supervisor
          or the ReLoop support team. Your safety is more important than any collection.
        </p>
      </div>
    </div>
  );
}
