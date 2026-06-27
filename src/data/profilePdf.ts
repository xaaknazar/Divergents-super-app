// «Моя анкета» → PDF export. Renders a self-contained, print-styled A4 HTML
// report of the user's Talentslab profile (анкета) in a Talentslab-like layout
// and shares it via the OS share sheet. All text is Russian; no external assets
// (inline CSS only) so it prints identically everywhere. Mirrors the in-app
// TalentProfileScreen content: resume fields, Gallup talents (grouped by domain
// colour), MBTI and a Gardner vertical-bar chart drawn with HTML/CSS bars.
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  TalentProfile, GallupTalent, GALLUP_DOMAIN_META, mbtiName, fmtList,
} from './talentslab';
import { matchGardnerType } from '../components/GardnerChart';

// ─── HTML helpers ──────────────────────────────────────────────────
const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));

// Normalize a resume field to a display string (arrays via fmtList).
const val = (v: any): string =>
  Array.isArray(v) ? fmtList(v) : (v == null ? '' : String(v));

// Build the rows of a section, dropping empty / "undefined" values — same rule
// the screen uses so the PDF matches what the user sees.
const sectionRows = (items: [string, any][]): [string, string][] =>
  items
    .map(([label, v]) => [label, val(v)] as [string, string])
    .filter(([, v]) => v !== '' && v !== 'undefined');

const rowsHtml = (rows: [string, string][]): string =>
  rows.map(([label, value]) => `
    <tr>
      <td class="k">${esc(label)}</td>
      <td class="v">${esc(value)}</td>
    </tr>`).join('');

// A grouped "card" section (skipped entirely when it has no rows).
const cardSection = (title: string, rows: [string, string][]): string => {
  if (rows.length === 0) return '';
  return `
    <section class="card">
      <h2>${esc(title)}</h2>
      <table class="kv">${rowsHtml(rows)}</table>
    </section>`;
};

// ─── Gardner bar chart (HTML/CSS, Talentslab vertical-bar look) ────
const GARDNER_PLOT_H = 150; // px plot height for the bars
function gardnerHtml(data: { category: string; score: number }[]): string {
  if (!data.length) return '';
  const bars = data.map((d) => {
    const cfg = matchGardnerType(d.category);
    const score = Math.max(0, Math.min(100, Math.round(d.score)));
    const h = Math.max(4, (score / 100) * GARDNER_PLOT_H);
    return `
      <div class="g-col">
        <div class="g-bar-wrap">
          <span class="g-score">${score}</span>
          <div class="g-bar" style="height:${h}px;background:${cfg.color};"></div>
        </div>
        <div class="g-emoji">${cfg.emoji}</div>
        <div class="g-label">${esc(cfg.short || d.category)}</div>
      </div>`;
  }).join('');
  const grid = [0, 25, 50, 75, 100].map((v) => {
    const bottom = (v / 100) * GARDNER_PLOT_H;
    return `<div class="g-grid" style="bottom:${bottom}px;"><span>${v}</span></div>`;
  }).join('');
  return `
    <section class="card">
      <h2>Множественный интеллект (Гарднер)</h2>
      <div class="g-chart" style="height:${GARDNER_PLOT_H + 44}px;">
        <div class="g-plot" style="height:${GARDNER_PLOT_H}px;">${grid}</div>
        <div class="g-bars">${bars}</div>
      </div>
    </section>`;
}

// ─── Gallup talents grouped by domain ──────────────────────────────
const DOMAIN_ORDER: (keyof typeof GALLUP_DOMAIN_META)[] = [
  'executing', 'influencing', 'relationship', 'strategic',
];

function gallupHtml(gallup: GallupTalent[]): string {
  if (!gallup.length) return '';
  // Preserve the user's displayed rank as a badge, but group by domain.
  const ranked = gallup.map((g, i) => ({ g, displayRank: i + 1 }));
  const groups = DOMAIN_ORDER
    .map((domain) => {
      const meta = GALLUP_DOMAIN_META[domain];
      const items = ranked.filter((x) => x.g.domain === domain);
      if (!items.length) return '';
      const lis = items.map(({ g, displayRank }) => `
        <li>
          <span class="t-rank" style="background:${meta.color}22;color:${meta.color};">${displayRank}</span>
          <span class="t-name">${esc(g.name)}</span>
        </li>`).join('');
      return `
        <div class="t-group">
          <div class="t-domain"><span class="t-dot" style="background:${meta.color};"></span>${esc(meta.label)}</div>
          <ul class="t-list">${lis}</ul>
        </div>`;
    })
    .join('');
  return `
    <section class="card">
      <h2>Таланты Gallup · ${gallup.length}</h2>
      <div class="t-groups">${groups}</div>
    </section>`;
}

function mbtiHtml(profile: TalentProfile): string {
  if (!profile.mbtiType) return '';
  const name = profile.mbtiName || mbtiName(profile.mbtiType) || 'Тип личности';
  return `
    <section class="card">
      <h2>Тип личности (MBTI)</h2>
      <div class="mbti">
        <div class="mbti-badge">${esc(profile.mbtiType)}</div>
        <div class="mbti-name">${esc(name)}</div>
      </div>
    </section>`;
}

// ─── Document ──────────────────────────────────────────────────────
export function buildProfileHtml(profile: TalentProfile): string {
  const r = profile.resume ?? null;

  const personal = sectionRows([
    ['Город', r?.current_city], ['Телефон', r?.phone], ['Дата рождения', r?.birth_date],
    ['Пол', r?.gender], ['Семейное положение', r?.marital_status], ['Гражданство', r?.citizenship],
    ['Готовность к переезду', r?.ready_to_relocate ? 'Да' : undefined], ['Instagram', r?.instagram],
  ]);
  const career = sectionRows([
    ['Желаемая должность', r?.desired_position || fmtList(r?.desired_positions)],
    ['Сфера', r?.activity_sphere], ['Опыт (лет)', r?.total_experience_years],
    ['Ожидания по зарплате', r?.expected_salary], ['Языки', fmtList(r?.language_skills)],
    ['Компьютерные навыки', r?.computer_skills], ['Образование', r?.school || fmtList(r?.universities)],
  ]);
  const about = sectionRows([
    ['Хобби', r?.hobbies], ['Интересы', r?.interests], ['Спорт', fmtList(r?.favorite_sports)],
    ['Страны', fmtList(r?.visited_countries)], ['Книг в год', r?.books_per_year],
    ['Права', r?.has_driving_license ? 'Есть' : undefined],
  ]);

  // Work experience as its own card list.
  const we: any[] = Array.isArray(r?.work_experience) ? r!.work_experience! : [];
  const workHtml = we.length ? `
    <section class="card">
      <h2>Опыт работы</h2>
      <ul class="exp">
        ${we.map((w) => {
          const title = typeof w === 'string' ? w : [w.position, w.company].filter(Boolean).join(' · ');
          const sub = typeof w === 'object' ? [w.start_date, w.end_date].filter(Boolean).join(' — ') : '';
          return `<li><div class="exp-t">${esc(title)}</div>${sub ? `<div class="exp-s">${esc(sub)}</div>` : ''}</li>`;
        }).join('')}
      </ul>
    </section>` : '';

  const initial = esc((profile.fullName ?? 'D').charAt(0));
  const avatar = profile.photoUrl
    ? `<img class="avatar" src="${esc(profile.photoUrl)}" />`
    : `<div class="avatar avatar-ph">${initial}</div>`;

  const mbtiChip = profile.mbtiType
    ? `<span class="chip chip-brand">MBTI · ${esc(profile.mbtiType)}</span>` : '';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
    color: #1c1c1e; background: #f2f2f7;
    font-size: 12px; line-height: 1.45;
  }
  .page { padding: 32px 36px 40px; }
  .hero {
    display: flex; align-items: center; gap: 16px;
    padding-bottom: 20px; margin-bottom: 8px;
    border-bottom: 1px solid #e3e3e8;
  }
  .avatar { width: 72px; height: 72px; border-radius: 20px; object-fit: cover; }
  .avatar-ph {
    display: flex; align-items: center; justify-content: center;
    background: #234088; color: #fff; font-size: 32px; font-weight: 700;
  }
  .hero h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; color: #000; }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .chip {
    display: inline-block; padding: 4px 10px; border-radius: 999px;
    font-size: 11px; font-weight: 600; background: #e9e9ee; color: #1c1c1e;
  }
  .chip-brand { background: #234088; color: #fff; }
  .doc-title { font-size: 11px; letter-spacing: .5px; text-transform: uppercase; color: #8e8e93; margin-bottom: 2px; }

  .card {
    background: #fff; border: 1px solid #e6e6ea; border-radius: 14px;
    padding: 16px 18px; margin-top: 14px;
    break-inside: avoid; page-break-inside: avoid;
  }
  .card h2 {
    margin: 0 0 10px; font-size: 11px; letter-spacing: .5px;
    text-transform: uppercase; color: #8e8e93; font-weight: 700;
  }
  table.kv { width: 100%; border-collapse: collapse; }
  table.kv td { padding: 6px 0; vertical-align: top; border-bottom: 1px solid #f0f0f3; }
  table.kv tr:last-child td { border-bottom: 0; }
  td.k { color: #6c6c70; width: 42%; padding-right: 12px; }
  td.v { color: #1c1c1e; font-weight: 500; }

  ul.exp { list-style: none; margin: 0; padding: 0; }
  ul.exp li { padding: 7px 0; border-bottom: 1px solid #f0f0f3; }
  ul.exp li:last-child { border-bottom: 0; }
  .exp-t { font-weight: 600; }
  .exp-s { color: #8e8e93; font-size: 11px; margin-top: 2px; }

  .mbti { display: flex; align-items: center; gap: 14px; }
  .mbti-badge {
    width: 50px; height: 50px; border-radius: 13px; background: #234088;
    color: #fff; font-weight: 700; font-size: 15px;
    display: flex; align-items: center; justify-content: center; letter-spacing: .5px;
  }
  .mbti-name { font-size: 14px; font-weight: 500; }

  /* Gallup */
  .t-groups { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 22px; }
  .t-domain { display: flex; align-items: center; gap: 7px; font-weight: 700; font-size: 12px; margin-bottom: 6px; }
  .t-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; }
  ul.t-list { list-style: none; margin: 0; padding: 0; }
  ul.t-list li { display: flex; align-items: center; gap: 9px; padding: 4px 0; }
  .t-rank {
    width: 22px; height: 22px; border-radius: 50%; flex: none;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700;
  }
  .t-name { font-weight: 500; }

  /* Gardner chart */
  .g-chart { position: relative; padding-left: 24px; }
  .g-plot { position: relative; margin-left: -24px; }
  .g-grid { position: absolute; left: 0; right: 0; height: 0; border-top: 1px solid #ededf0; }
  .g-grid span { position: absolute; left: 0; top: -7px; font-size: 9px; color: #b0b0b5; width: 20px; text-align: right; }
  .g-bars { position: absolute; left: 24px; right: 0; bottom: 44px; display: flex; align-items: flex-end; }
  .g-col { flex: 1; text-align: center; padding: 0 2px; }
  .g-bar-wrap { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
  .g-score { font-size: 10px; font-weight: 600; color: #6c6c70; margin-bottom: 3px; }
  .g-bar { width: 60%; max-width: 26px; border-radius: 5px 5px 2px 2px; }
  .g-emoji { font-size: 15px; margin-top: 6px; }
  .g-label { font-size: 9px; color: #8e8e93; margin-top: 2px; line-height: 1.2; }

  .foot { margin-top: 20px; text-align: center; font-size: 10px; color: #aeaeb2; }
</style>
</head>
<body>
  <div class="page">
    <div class="hero">
      ${avatar}
      <div>
        <div class="doc-title">Моя анкета · Divergents</div>
        <h1>${esc(profile.fullName ?? '—')}</h1>
        <div class="chips">
          ${mbtiChip}
          <span class="chip">Анкета ${esc(profile.completeness ?? 0)}%</span>
        </div>
      </div>
    </div>

    ${cardSection('Личные данные', personal)}
    ${cardSection('Карьера и образование', career)}
    ${cardSection('О себе', about)}
    ${workHtml}
    ${mbtiHtml(profile)}
    ${gallupHtml(profile.gallup ?? [])}
    ${gardnerHtml(profile.gardner ?? [])}

    <div class="foot">Сформировано в приложении Divergents</div>
  </div>
</body>
</html>`;
}

/**
 * Generate the анкета PDF and open the OS share sheet (send to other apps /
 * save). Never throws: returns a Russian error message string on failure so the
 * caller can surface it, or null on success.
 */
export async function exportProfilePdf(profile: TalentProfile): Promise<string | null> {
  try {
    const { uri } = await Print.printToFileAsync({ html: buildProfileHtml(profile) });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Моя анкета',
      });
    }
    return null;
  } catch {
    return 'Не удалось создать PDF. Попробуйте ещё раз.';
  }
}
