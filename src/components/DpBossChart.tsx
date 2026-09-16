import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * DPBoss-style chart rendering — mirrors the reference platform
 * (sattamatkavip.in) so our charts look and behave like a proper
 * Satta Matka platform:
 *   - Yellow live-result box: blue italic market name, black serif result,
 *     gold "Refresh Result" button. Partial declares show like the
 *     reference (`139-3` = open + ank, `Loading...` when nothing declared).
 *   - Panel table: white, purple groove border, week rows Mon–Sun with
 *     [open | jodi | close] cells, red jodi for doubles + half-reds,
 *     `***` / `**` for undeclared (never fabricated).
 *   - Jodi grid: plain 7-column grid like the reference Jodi chart pages.
 */

export interface DpDay {
  date: string; // YYYY-MM-DD
  open: string | null; // 3-digit panna
  jodi: string | null; // 2-digit
  close: string | null; // 3-digit panna
}

export interface DpWeek {
  /** Monday YYYY-MM-DD */
  monday: string;
  days: Array<DpDay | null>; // 7 slots Mon..Sun, null = out of range
}

/** Doubles (00,11,..99) + half-reds — rendered red on the reference site. */
const HALF_RED = new Set(['05', '50', '16', '61', '27', '72', '38', '83', '49', '94']);

export function isRedJodi(jodi: string | null): boolean {
  if (!jodi) return false;
  if (/^(\d)\1$/.test(jodi)) return true; // doubles incl. 00
  return HALF_RED.has(jodi);
}

/** Ank = digit-sum mod 10 (e.g. 139 -> 1+3+9=13 -> 3). */
export function ankOf(panna: string): string {
  const sum = panna.split('').reduce((s, d) => s + Number(d), 0);
  return String(sum % 10);
}

/**
 * Progressive jodi — mirrors how declares actually land on the source site:
 * the OPEN panna reveals the jodi's FIRST digit (open ank, certain — e.g.
 * open 569 -> "0*"), the CLOSE reveals the second ("07"). `empty` is the
 * pending placeholder for the slot ('**' in trios/tables, '--' in pills).
 * Never fabricates: fully unknown stays the placeholder.
 */
export function progressiveJodi(
  jodi: string | null | undefined,
  open: string | null | undefined,
  empty = '**',
): string {
  if (jodi && /^\d{2}$/.test(jodi)) return jodi;
  if (open && /^\d{3}$/.test(open)) return `${ankOf(open)}*`;
  return empty;
}

/** Live result text like the source site: full trio / open+ank / Loading... */
export function liveResultText(result?: string | null): string {
  if (!result) return 'Loading...';
  const parts = result.split('-');
  if (parts.length === 3) {
    const [open, jodi, close] = parts;
    const openOk = /^\d{3}$/.test(open);
    const jodiOk = /^\d{2}$/.test(jodi);
    const closeOk = /^\d{3}$/.test(close);
    if (openOk && jodiOk && closeOk) return `${open}-${jodi}-${close}`;
    // Open-only: exactly the source format, e.g. "569-0".
    if (openOk) return `${open}-${ankOf(open)}`;
    return 'Loading...';
  }
  return result;
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDaysIso(iso: string, n: number): string {
  const dt = new Date(`${iso}T00:00:00`);
  dt.setDate(dt.getDate() + n);
  return toIso(dt);
}

function mondayOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return toIso(d);
}

/** DD/MM/YY for week-range labels like the reference site. */
function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y.slice(2)}`;
}

/**
 * Build Mon-Sun weeks covering [startIso, endIso], gap-filled with nulls
 * (rendered as stars like the reference - holidays/off-days stay honest).
 */
export function buildWeeks(
  records: Array<{ date: string; open: string | null; jodi: string | null; close: string | null }>,
  startIso: string,
  endIso: string,
): DpWeek[] {
  const byDate = new Map<string, DpDay>();
  for (const r of records) {
    if (r.date < startIso || r.date > endIso) continue;
    byDate.set(r.date, { date: r.date, open: r.open, jodi: r.jodi, close: r.close });
  }
  const weeks: DpWeek[] = [];
  let monday = mondayOf(startIso);
  const lastMonday = mondayOf(endIso);
  while (monday <= lastMonday) {
    const days: Array<DpDay | null> = [];
    for (let i = 0; i < 7; i++) {
      const d = addDaysIso(monday, i);
      days.push(d < startIso || d > endIso ? null : (byDate.get(d) ?? { date: d, open: null, jodi: null, close: null }));
    }
    // Skip fully-empty leading/trailing weeks outside partial edge coverage —
    // keep weeks that have at least one in-range day (all do by construction).
    weeks.push({ monday, days });
    monday = addDaysIso(monday, 7);
  }
  return weeks;
}

// ---- Yellow live-result box (reference .S1 block) ----

export const LiveResultBox: React.FC<{
  name: string;
  result?: string | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}> = ({ name, result, refreshing = false, onRefresh }) => {
  const text = liveResultText(result);
  const isLoading = text === 'Loading...';
  return (
    <div
      className="w-full text-center px-2 py-2 border-double border-[5px] rounded-sm"
      style={{ backgroundColor: '#FFFF00', borderColor: '#B22222' }}
    >
      <div
        className="italic font-bold leading-tight"
        style={{ color: '#0000EE', fontSize: 25, textShadow: '1px 1px #8BC34A' }}
      >
        {name}
      </div>
      <div
        className="font-bold"
        style={{
          color: isLoading ? '#EF160C' : '#000',
          fontFamily: 'Georgia, serif',
          fontSize: 23,
          letterSpacing: '1pt',
        }}
      >
        {isLoading ? <span className="animate-pulse">{text}</span> : text}
      </div>
      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="mt-1 inline-flex items-center gap-1.5 px-4 py-1 text-[15px] font-bold rounded-2xl active:scale-95 transition disabled:opacity-60"
          style={{
            background: 'linear-gradient(0deg, rgba(195,138,34,1) 0, rgba(253,246,45,1) 100%)',
            border: '1px solid #F7DC6F',
            color: '#000',
            boxShadow: '0 0 15px #000',
          }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing...' : 'Refresh Result'}
        </button>
      )}
    </div>
  );
};

// ---- Shared table shell (reference .pchart / .chat7) ----

const tableShell: React.CSSProperties = {
  backgroundColor: '#fff',
  color: '#000',
  fontWeight: 700,
  fontStyle: 'italic',
  borderWidth: 5,
  borderColor: '#893BFF',
  borderStyle: 'groove',
  textShadow: '1px 1px gold',
  borderCollapse: 'separate',
};

const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

function JodiCell({ value }: { value: string | null }) {
  const text = value ?? '**';
  const red = text === '**' || (value !== null && isRedJodi(value));
  return (
    <td
      className="text-center"
      style={{ color: red ? '#FF0000' : undefined, padding: '5px 3px', fontSize: 18 }}
    >
      {text}
    </td>
  );
}

// ---- Panel chart table (reference panel-chart pages) ----

export const PanelChartTable: React.FC<{ weeks: DpWeek[] }> = ({ weeks }) => {
  if (weeks.length === 0) {
    return (
      <div className="text-center py-10 bg-white border border-[#D1D5DB] rounded-2xl">
        <p className="text-sm font-bold text-[#0F172A]">No chart data in this range</p>
        <p className="mt-1 text-xs text-[#6B7280]">Try a wider date range or pick a different market.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ ...tableShell, minWidth: 640 }}>
        <thead>
          <tr>
            <th style={{ fontSize: 12, padding: '5px 3px' }}>Date</th>
            {DAY_NAMES.map((d) => (
              <th key={d} colSpan={3} style={{ fontSize: 12, padding: '5px 3px' }}>
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.monday}>
              <th style={{ fontSize: 11, padding: '4px 2px', whiteSpace: 'nowrap' }}>
                {shortDate(w.monday)}
                <br />
                to
                <br />
                {shortDate(addDaysIso(w.monday, 6))}
              </th>
              {w.days.map((day, i) => {
                if (!day) return <React.Fragment key={i} />;
                const open = day.open ?? '***';
                const jodi = progressiveJodi(day.jodi, day.open);
                const close = day.close ?? '***';
                const jodiRed = jodi === '**' || isRedJodi(day.jodi);
                return (
                  <React.Fragment key={day.date}>
                    <th style={{ padding: '4px 1px', fontSize: 14 }}>{open}</th>
                    <td
                      className="text-center"
                      style={{ color: jodiRed ? '#FF0000' : undefined, padding: '4px 1px', fontSize: 17 }}
                    >
                      {jodi}
                    </td>
                    <th style={{ padding: '4px 1px', fontSize: 14 }}>{close}</th>
                  </React.Fragment>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ---- Jodi chart grid (reference jodi-chart pages: 7 plain columns) ----

export const JodiChartGrid: React.FC<{ weeks: DpWeek[] }> = ({ weeks }) => {
  // Flatten to week rows of 7 jodis (null week-days render as ** like reference;
  // open-declared days show the revealed first digit, e.g. "0*").
  const rows: string[][] = weeks.map((w) =>
    w.days.map((d) => (d ? progressiveJodi(d.jodi, d.open) : '**')),
  );
  if (rows.length === 0) {
    return (
      <div className="text-center py-10 bg-white border border-[#D1D5DB] rounded-2xl">
        <p className="text-sm font-bold text-[#0F172A]">No chart data in this range</p>
        <p className="mt-1 text-xs text-[#6B7280]">Try a wider date range or pick a different market.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full" style={{ ...tableShell, minWidth: 420 }}>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={weeks[ri].monday}>
              {row.map((j, i) => (
                <JodiCell key={`${ri}-${i}`} value={j} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
