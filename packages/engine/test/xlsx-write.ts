import { strToU8, zipSync } from 'fflate';

// Minimal XLSX writer for tests: one sheet per tab, numbers as number cells, everything else inline text.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const col = (i: number) => {
  let s = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

export function buildXlsx(tabs: [string, string[][]][]): Uint8Array {
  const rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const files: Record<string, Uint8Array> = {
    'xl/workbook.xml': strToU8(
      `<workbook xmlns:r="${rel}"><sheets>${tabs.map(([n], i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      `<Relationships>${tabs.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${rel}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`,
    ),
  };
  tabs.forEach(([, rows], i) => {
    const body = rows
      .map(
        (r, ri) =>
          `<row r="${ri + 1}">${r
            .map((v, ci) =>
              ri > 0 && /^-?\d+(\.\d+)?$/.test(v) && v.length < 15
                ? `<c r="${col(ci)}${ri + 1}"><v>${v}</v></c>`
                : `<c r="${col(ci)}${ri + 1}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`,
            )
            .join('')}</row>`,
      )
      .join('');
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(`<worksheet><sheetData>${body}</sheetData></worksheet>`);
  });
  return zipSync(files);
}
