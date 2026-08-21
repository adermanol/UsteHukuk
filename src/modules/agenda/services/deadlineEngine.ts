/**
 * Süre hesaplama motoru. Saf fonksiyon — veritabanına dokunmaz, kurallar ve
 * takvim verisi argüman olarak geçer. Bu, birim testlenebilirliği ve
 * mesleki-sorumluluk açısından kritik olan "bu tarih nasıl çıktı?" adım
 * dökümünü (steps[]) üretmeyi kolaylaştırır — sonuç UI'da gösterilir ve
 * case_events.computation'a kalıcı yazılır.
 *
 * Kaynak: HMK m.92-104. Bu motor bir hukuki danışman DEĞİLDİR; yalnızca
 * büronun kendi girdiği, düzenlenebilir kural setini mekanik olarak uygular.
 */

export type DurationUnit = 'gun' | 'is_gunu' | 'hafta' | 'ay' | 'yil';

export interface DeadlineRule {
  id: string;
  label: string;
  durationValue: number;
  durationUnit: DurationUnit;
  legalBasis: string;
  affectedByRecess: boolean;
  rollsOverNonWorking: boolean;
  verifiedAt: string | null;
}

export interface RecessPeriod {
  year: number;
  startsOn: string;   // YYYY-MM-DD
  endsOn: string;
  extensionDays: number;
}

export interface DeadlineStep {
  label: string;
  date: string;        // YYYY-MM-DD
  legalBasis: string;
}

export interface DeadlineComputation {
  dueDate: string;
  steps: DeadlineStep[];
  isVerified: boolean;
  /** true ⇒ hesaplama kapsanmayan bir yıla düştü (non_working_days seed'i
   * yok); sonuç yine üretilir ama UI bunu belirgin şekilde uyarmalı. */
  coverageWarning: boolean;
}

function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function toISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export interface DeadlineEngineInput {
  rule: DeadlineRule;
  triggerDate: string;             // tebliğ/tefhim tarihi, YYYY-MM-DD
  isRecessExempt: boolean;         // dosyanın HMK m.103 istisnası
  recessPeriods: RecessPeriod[];
  nonWorkingDays: Set<string>;     // 'YYYY-MM-DD' -> tatil/bayram
  coveredYears: Set<number>;       // non_working_days seed'inin kapsadığı yıllar
}

export function computeDeadline(input: DeadlineEngineInput): DeadlineComputation {
  const { rule, triggerDate, isRecessExempt, recessPeriods, nonWorkingDays, coveredYears } = input;
  const steps: DeadlineStep[] = [];

  // 1. HMK m.92 — tebliğ/tefhim günü sayılmaz, süre ertesi gün işlemeye başlar.
  const start = addDays(toDate(triggerDate), 1);
  steps.push({ label: 'Süre başlangıcı (tebliğ/tefhim günü hariç)', date: toISO(start), legalBasis: 'HMK m.92' });

  // 2. Süre eklenir.
  let result: Date;
  if (rule.durationUnit === 'is_gunu') {
    result = new Date(start);
    let remaining = rule.durationValue;
    while (remaining > 0) {
      result = addDays(result, 1);
      const iso = toISO(result);
      if (!isWeekend(result) && !nonWorkingDays.has(iso)) remaining--;
    }
  } else if (rule.durationUnit === 'gun') {
    // HMK m.93: resmî tatiller süreye dahildir, atlanmaz.
    result = addDays(start, rule.durationValue - 1);
  } else if (rule.durationUnit === 'hafta') {
    result = addDays(start, rule.durationValue * 7 - 1);
  } else {
    // ay/yıl: takvim ayı/yılı, o ayda o gün yoksa ayın son günü (HMK m.92/2)
    const months = rule.durationUnit === 'ay' ? rule.durationValue : rule.durationValue * 12;
    const target = new Date(start);
    const targetMonth = target.getUTCMonth() + months;
    const targetYear = target.getUTCFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    const day = Math.min(target.getUTCDate(), lastDayOfTargetMonth);
    result = new Date(Date.UTC(targetYear, normalizedMonth, day));
  }
  steps.push({ label: `${rule.durationValue} ${rule.durationUnit.replace('_', ' ')} eklendi`, date: toISO(result), legalBasis: rule.legalBasis });

  // 3. Adli tatil (HMK m.104): sonuç adli tatil aralığına denk geliyorsa ve
  // dosya istisna değilse, tatilin bitişinden extensionDays kadar sonraya taşınır.
  if (rule.affectedByRecess && !isRecessExempt) {
    const recess = recessPeriods.find(r => {
      const s = toDate(r.startsOn), e = toDate(r.endsOn);
      return result >= s && result <= e;
    });
    if (recess) {
      result = addDays(toDate(recess.endsOn), recess.extensionDays);
      steps.push({ label: 'Adli tatile denk geldi, tatil bitişinden uzatıldı', date: toISO(result), legalBasis: 'HMK m.104' });
    }
  }

  // 4. Kaydırma (HMK m.93/2): hafta sonu veya resmî tatil olduğu sürece +1 gün.
  if (rule.rollsOverNonWorking) {
    let shifted = false;
    while (isWeekend(result) || nonWorkingDays.has(toISO(result))) {
      result = addDays(result, 1);
      shifted = true;
    }
    if (shifted) {
      steps.push({ label: 'Hafta sonu/resmî tatile denk geldi, ilk iş gününe kaydırıldı', date: toISO(result), legalBasis: 'HMK m.93/2' });
    }
  }

  const resultYear = result.getUTCFullYear();
  const coverageWarning = !coveredYears.has(resultYear);

  return {
    dueDate: toISO(result),
    steps,
    isVerified: rule.verifiedAt !== null,
    coverageWarning,
  };
}
