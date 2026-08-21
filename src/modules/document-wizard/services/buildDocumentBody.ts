import { Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType, BorderStyle } from 'docx'
import { buildContent, ContentNode, PartyInput } from './contentModel'

const BRAND_COLOR = '594438';

function docTitle(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  });
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, color: BRAND_COLOR, size: 22 })],
    spacing: { before: 240, after: 120 },
  });
}

function keyValueLine(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun({ text: value }),
    ],
    spacing: { after: 80 },
  });
}

function bodyParagraphs(lines: string[]): Paragraph[] {
  return lines.map(line => new Paragraph({ text: line, spacing: { after: 80 } }));
}

function headerCell(text: string): TableCell {
  return new TableCell({
    shading: { fill: 'F2ECE6' },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, size: 18, color: BRAND_COLOR })] })],
  });
}
function dataCell(text: string): TableCell {
  return new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: text || '—', size: 18 })] })] });
}

function partiesTable(parties: PartyInput[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'CCCCCC' },
    },
    rows: [
      new TableRow({ children: [headerCell('Ad Soyad / Unvan'), headerCell('TC Kimlik No / Vergi No'), headerCell('Adres')] }),
      ...parties.map(p => new TableRow({ children: [dataCell(p.ad), dataCell(p.tcVergiNo), dataCell(p.adres)] })),
    ],
  });
}

function closingStatement(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, italics: true })],
    spacing: { before: 300, after: 500 },
  });
}

function signatureBlock(label: string): Paragraph[] {
  return [
    new Paragraph({ text: '', spacing: { before: 400 } }),
    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: '999999', space: 4 } },
      children: [new TextRun({ text: label, bold: true })],
      alignment: AlignmentType.RIGHT,
      spacing: { before: 100 },
    }),
  ];
}

function renderNode(node: ContentNode): (Paragraph | Table)[] {
  switch (node.type) {
    case 'title': return [docTitle(node.text)];
    case 'heading': return [sectionHeading(node.text)];
    case 'keyvalue': return [keyValueLine(node.label, node.value)];
    case 'partiesTable': return [partiesTable(node.parties)];
    case 'body': return bodyParagraphs(node.lines);
    case 'closing': return [closingStatement(node.text)];
    case 'signature': return signatureBlock(node.label);
  }
}

/** `contentModel.ts`'teki nötr belge içeriğini `docx` kütüphanesinin
 * Paragraph/Table ağacına çevirir — hukuki metnin kendisi burada
 * TANIMLANMAZ, yalnızca biçimlendirilir (bkz. contentModel.ts). */
export function buildBody(docType: string, fields: Record<string, any>): (Paragraph | Table)[] {
  return buildContent(docType, fields).flatMap(renderNode);
}
