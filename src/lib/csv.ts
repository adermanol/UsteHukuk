// Küçük, bağımlılıksız CSV yardımcıları. Kurumlar toplu içe aktarma
// (parseCsv) ve analitik dışa aktarma (toCsv) tarafından paylaşılır —
// RFC4180'in tırnaklı alan/iç virgül/iç tırnak kaçışı kadarını kapsar,
// büyük/özel dosyalar için tam bir CSV kütüphanesi gerekmez.

/** Tek bir CSV metnini satır/hücre dizisine ayrıştırır. Tırnak içindeki
 * virgül ve satır sonlarını, `""` kaçışını doğru işler. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter(r => !(r.length === 1 && r[0].trim() === ''));
}

/** Başlık satırlı bir CSV'yi obje dizisine çevirir — anahtarlar `headerMap`
 * ile normalize edilir (ör. Türkçe kolon adı → alan adı). Eşlenmeyen
 * başlıklar yok sayılır. */
export function parseCsvToObjects(text: string, headerMap: Record<string, string>): Record<string, string>[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const [headerRow, ...dataRows] = rows;
  const keys = headerRow.map(h => headerMap[h.trim().toLowerCase()] ?? null);
  return dataRows.map(row => {
    const obj: Record<string, string> = {};
    keys.forEach((key, i) => {
      if (key) obj[key] = (row[i] ?? '').trim();
    });
    return obj;
  });
}

function escapeCsvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map(row => row.map(escapeCsvField).join(',')).join('\r\n');
}
