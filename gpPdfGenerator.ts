import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import {
  FeeTransaction,
  Namuna9Record,
  PanchayatProfile,
  PropertyAssessment,
} from '../types/grampanchayat';
import {
  buildAlphabeticalNamuna9Rows,
  CONSTRUCTION_RATE_RULES,
  formatINR,
  USAGE_FACTORS,
} from './taxCalculator';

const FONT_STACK = '"Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif';
const MONO_STACK = '"JetBrains Mono", "Noto Sans Devanagari", monospace';

async function ensureFontsLoaded(): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Fallback to system Devanagari font if needed
    }
  }
}

function createHiDpiCanvas(logicalW: number, logicalH: number, scale = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = logicalW * scale;
  canvas.height = logicalH * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, logicalW, logicalH);
  return { canvas, ctx };
}

function formatNowIndianDateOnly(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatNowIndian(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawCenteredWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  topY: number,
  boxH: number,
  maxWidth: number,
  lineHeight: number,
  align: 'center' | 'left' = 'center',
  leftPad = 4
): void {
  const raw = (text || '-').trim();
  const words = raw.split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);

  const totalTextH = lines.length * lineHeight;
  let startY = topY + Math.max(lineHeight, (boxH - totalTextH) / 2 + lineHeight * 0.78);
  if (align === 'left') {
    startY = topY + 14;
  }

  ctx.textAlign = align;
  lines.forEach((ln, idx) => {
    const drawY = startY + idx * lineHeight;
    if (drawY <= topY + boxH - 3) {
      ctx.fillText(ln, align === 'center' ? centerX : centerX - maxWidth / 2 + leftPad, drawY);
    }
  });
}

async function renderQrCanvas(payload: string, sizePx: number): Promise<HTMLCanvasElement> {
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, payload, {
    width: sizePx,
    margin: 1,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });
  return qrCanvas;
}

/**
 * अधिकृत नमुना क्र. ८ — दोन-स्तरीय आडवे (Landscape A4) २७-रकाने रजिस्टर स्वरूप
 */
export async function downloadNamuna8UtaraPdf(
  panchayat: PanchayatProfile,
  property: PropertyAssessment,
  feeTx: FeeTransaction
): Promise<void> {
  await ensureFontsLoaded();

  // A4 Landscape logical canvas (297mm x 210mm)
  const pageW = 1123;
  const pageH = 794;
  const marginX = 34;
  const contentW = pageW - marginX * 2; // 1055px

  const { canvas, ctx } = createHiDpiCanvas(pageW, pageH, 2);

  // Subtle outer frame matching standard form sheet
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 1;
  ctx.strokeRect(14, 14, pageW - 28, pageH - 28);

  // Top Header Row: Left pill "नमुना नं. ८" | Center Title | Right pill "पान क्र."
  const topY = 30;
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, marginX + 18, topY, 108, 34, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 15px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText('नमुना नं. ८', marginX + 18 + 54, topY + 22);

  // Right Pill: पान क्र.
  drawRoundedRect(ctx, pageW - marginX - 126, topY, 108, 34, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 13.5px ${FONT_STACK}`;
  ctx.fillText(`पान क्र. ${property.pageNo || '१'}`, pageW - marginX - 72, topY + 22);

  // Center Main Title
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 16px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  const fyText = panchayat.financialYear || '२०२६-२०२७';
  ctx.fillText(
    `सन ${fyText} या वर्षासाठी कर आकारणी नोंदवही`,
    pageW / 2,
    topY + 23
  );

  // Second Line: कार्यालय ग्रामपंचायत ... ता. ... जि. ...
  const line2Y = 88;
  ctx.font = `700 14.5px ${FONT_STACK}`;
  ctx.fillStyle = '#0F172A';
  const gpOfficeLine = `कार्यालय ग्रामपंचायत : ${panchayat.panchayatName}     ता. ${
    panchayat.taluka || '--------'
  }     जि. ${panchayat.district || '--------'}`;
  ctx.fillText(gpOfficeLine, pageW / 2, line2Y);

  // ============================================================
  // TABLE PART 1 (Columns १ to १२)
  // Total Width = 1055px
  // ============================================================
  const t1Y = 108;
  const t1HeaderH = 66;
  const t1SubHeaderH = 34;
  const t1NumH = 22;
  const t1DataH = 152;

  const t1Cols = [
    { w: 38, num: '१', title: 'अ.क्र' },
    { w: 94, num: '२', title: 'रस्त्याचे नाव' },
    { w: 72, num: '३', title: 'सिटी सर्व्हे क्र.' },
    { w: 66, num: '४', title: 'मालमत्ता क्र' },
    { w: 148, num: '५', title: 'मालकाचे नाव' },
    { w: 112, num: '६', title: 'भोगवटादाराचे नाव' },
    { w: 145, num: '७', title: 'मालमत्तेचे वर्णन' },
    { w: 78, num: '८', title: 'मिळकत बांधकामाचे वर्ष' },
    { w: 102, num: '९', title: 'क्षेत्रफळ चौ. फुट / चौ.मी.' },
    { w: 66, num: '१०', title: 'जमीन' },
    { w: 66, num: '११', title: 'इमारत' },
    { w: 68, num: '१२', title: 'बांधकाम' },
  ]; // sum = 1055

  const rrGroupStartX =
    marginX + t1Cols.slice(0, 9).reduce((acc, c) => acc + c.w, 0);
  const rrGroupW = t1Cols[9].w + t1Cols[10].w + t1Cols[11].w;

  // Draw Table 1 outer border
  const t1TotalH = t1HeaderH + t1NumH + t1DataH;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(marginX, t1Y, contentW, t1TotalH);

  // Horizontal lines in Table 1
  ctx.beginPath();
  ctx.moveTo(marginX, t1Y + t1HeaderH);
  ctx.lineTo(marginX + contentW, t1Y + t1HeaderH);
  ctx.moveTo(marginX, t1Y + t1HeaderH + t1NumH);
  ctx.lineTo(marginX + contentW, t1Y + t1HeaderH + t1NumH);
  // Sub-header split inside Cols 10-12
  ctx.moveTo(rrGroupStartX, t1Y + (t1HeaderH - t1SubHeaderH));
  ctx.lineTo(rrGroupStartX + rrGroupW, t1Y + (t1HeaderH - t1SubHeaderH));
  ctx.stroke();

  // Vertical lines and header text in Table 1
  let curX = marginX;
  t1Cols.forEach((col, idx) => {
    if (idx > 0) {
      const startY = idx === 10 || idx === 11 ? t1Y + (t1HeaderH - t1SubHeaderH) : t1Y;
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(curX, startY);
      ctx.lineTo(curX, t1Y + t1TotalH);
      ctx.stroke();
    }

    ctx.fillStyle = '#0F172A';
    ctx.font = `700 10.5px ${FONT_STACK}`;
    if (idx < 9) {
      drawCenteredWrappedText(
        ctx,
        col.title,
        curX + col.w / 2,
        t1Y,
        t1HeaderH,
        col.w - 6,
        13
      );
    } else {
      drawCenteredWrappedText(
        ctx,
        col.title,
        curX + col.w / 2,
        t1Y + (t1HeaderH - t1SubHeaderH),
        t1SubHeaderH,
        col.w - 6,
        13
      );
    }

    // Column Number 1..12
    ctx.font = `600 10.5px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText(col.num, curX + col.w / 2, t1Y + t1HeaderH + 15);

    curX += col.w;
  });

  // Merged Header for Cols 10-12
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 10.5px ${FONT_STACK}`;
  drawCenteredWrappedText(
    ctx,
    'रेडिरेकनर दर प्रति चौ.मि. (रुपये)',
    rrGroupStartX + rrGroupW / 2,
    t1Y,
    t1HeaderH - t1SubHeaderH,
    rrGroupW - 8,
    13
  );

  // Table 1 Data Values
  const consLabel = CONSTRUCTION_RATE_RULES[property.constructionType].shortLabel;
  const usageLabel = USAGE_FACTORS[property.usageType].label;
  const landRate =
    property.rrLandRate ??
    (property.constructionType === 'open_plot'
      ? property.readyReckonerRate
      : Math.round(property.readyReckonerRate * 0.25));
  const buildingRate =
    property.rrBuildingRate ??
    (property.constructionType === 'open_plot' ? 0 : property.readyReckonerRate);
  const constructionRate =
    property.rrConstructionRate ??
    (property.constructionType === 'open_plot'
      ? 0
      : Math.round(property.readyReckonerRate * 0.75));

  const t1Values = [
    '१',
    `वार्ड ${property.wardNo} - ${property.wardName}`,
    property.surveyOrGutNo || '-',
    property.propertyNo,
    `${property.ownerName}${property.spouseName ? ` व ${property.spouseName}` : ''}`,
    property.occupantName || 'स्वतः',
    `${consLabel} (${usageLabel}), ${property.lengthFt}×${property.widthFt} फूट`,
    String(property.constructionYear),
    `${property.areaSqFt} चौ.फूट / ${property.areaSqM} चौ.मी.`,
    landRate > 0 ? `${formatINR(landRate)}` : '-',
    buildingRate > 0 ? `${formatINR(buildingRate)}` : '-',
    constructionRate > 0 ? `${formatINR(constructionRate)}` : '-',
  ];

  const t1DataY = t1Y + t1HeaderH + t1NumH;
  curX = marginX;
  t1Cols.forEach((col, idx) => {
    ctx.fillStyle = '#0F172A';
    ctx.font =
      idx === 3 || idx === 7 || idx >= 9
        ? `600 11px ${MONO_STACK}`
        : `500 11px ${FONT_STACK}`;
    drawCenteredWrappedText(
      ctx,
      t1Values[idx],
      curX + col.w / 2,
      t1DataY,
      t1DataH,
      col.w - 10,
      16
    );
    curX += col.w;
  });

  // ============================================================
  // TABLE PART 2 (Columns १३ to २७)
  // Total Width = 1055px
  // ============================================================
  const t2Y = t1Y + t1TotalH + 22;
  const t2HeaderH = 92;
  const t2SubHeaderH = 52;
  const t2NumH = 22;
  const t2DataH = 152;

  const t2Cols = [
    { w: 50, num: '१३', title: 'घसारा दर' },
    { w: 72, num: '१४', title: 'इमारतीच्या वापरानुसार भारांक' },
    { w: 76, num: '१५', title: 'भांडवली मुल्य (रुपये)' },
    { w: 56, num: '१६', title: 'कराचा दर (पैसे)' },
    // Group 17-21: कराची रक्कम रुपये (5 columns = 266px)
    { w: 56, num: '१७', title: 'घरपट्टी कर' },
    { w: 52, num: '१८', title: 'दिवाबत्ती कर' },
    { w: 50, num: '१९', title: 'आरोग्य कर' },
    { w: 54, num: '२०', title: 'पाणीपट्टी कर' },
    { w: 54, num: '२१', title: 'एकूण' },
    // Group 22-26: अपिलाचे निकाल आणि त्यानंतर केलेले फेरफार (5 columns = 265px)
    { w: 56, num: '२२', title: 'घरपट्टी कर' },
    { w: 52, num: '२३', title: 'दिवाबत्ती कर' },
    { w: 50, num: '२४', title: 'आरोग्य कर' },
    { w: 54, num: '२५', title: 'पाणीपट्टी कर' },
    { w: 53, num: '२६', title: 'एकूण' },
    // Col 27: Remarks (270px)
    {
      w: 270,
      num: '२७',
      title:
        'नंतर वाढ किंवा घट झाल्याच्या बाबतीत आदेशाच्या संदर्भांसह शेरा (टीप- शेरा व दुरुस्त्या सरपंचाने अनुप्रमाणित कराव्यात.)',
    },
  ]; // sum = 50+72+76+56 + 266 + 265 + 270 = 1055

  const g1StartX = marginX + t2Cols.slice(0, 4).reduce((a, c) => a + c.w, 0);
  const g1W = t2Cols.slice(4, 9).reduce((a, c) => a + c.w, 0);
  const g2StartX = g1StartX + g1W;
  const g2W = t2Cols.slice(9, 14).reduce((a, c) => a + c.w, 0);

  const t2TotalH = t2HeaderH + t2NumH + t2DataH;
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(marginX, t2Y, contentW, t2TotalH);

  // Horizontal lines in Table 2
  ctx.beginPath();
  ctx.moveTo(marginX, t2Y + t2HeaderH);
  ctx.lineTo(marginX + contentW, t2Y + t2HeaderH);
  ctx.moveTo(marginX, t2Y + t2HeaderH + t2NumH);
  ctx.lineTo(marginX + contentW, t2Y + t2HeaderH + t2NumH);
  // Sub-header split for Cols 17-26
  ctx.moveTo(g1StartX, t2Y + (t2HeaderH - t2SubHeaderH));
  ctx.lineTo(g1StartX + g1W + g2W, t2Y + (t2HeaderH - t2SubHeaderH));
  ctx.stroke();

  // Vertical lines and header labels in Table 2
  curX = marginX;
  t2Cols.forEach((col, idx) => {
    const isSubDivider =
      (idx >= 5 && idx <= 8) || (idx >= 10 && idx <= 13);
    if (idx > 0) {
      const startY = isSubDivider ? t2Y + (t2HeaderH - t2SubHeaderH) : t2Y;
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(curX, startY);
      ctx.lineTo(curX, t2Y + t2TotalH);
      ctx.stroke();
    }

    ctx.fillStyle = '#0F172A';
    ctx.font = idx === 14 ? `600 9.5px ${FONT_STACK}` : `700 10px ${FONT_STACK}`;

    if (idx >= 4 && idx <= 13) {
      drawCenteredWrappedText(
        ctx,
        col.title,
        curX + col.w / 2,
        t2Y + (t2HeaderH - t2SubHeaderH),
        t2SubHeaderH,
        col.w - 4,
        12
      );
    } else {
      drawCenteredWrappedText(
        ctx,
        col.title,
        curX + col.w / 2,
        t2Y,
        t2HeaderH,
        col.w - 6,
        12.5
      );
    }

    // Column Number 13..27
    ctx.font = `600 10.5px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText(col.num, curX + col.w / 2, t2Y + t2HeaderH + 15);

    curX += col.w;
  });

  // Merged Group Headers for Cols 17-21 & 22-26
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 10.5px ${FONT_STACK}`;
  drawCenteredWrappedText(
    ctx,
    'कराची रक्कम रुपये',
    g1StartX + g1W / 2,
    t2Y,
    t2HeaderH - t2SubHeaderH,
    g1W - 8,
    13
  );
  drawCenteredWrappedText(
    ctx,
    'अपिलाचे निकाल आणि त्यानंतर केलेले फेरफार',
    g2StartX + g2W / 2,
    t2Y,
    t2HeaderH - t2SubHeaderH,
    g2W - 8,
    13
  );

  // Table 2 Data Values
  const totalWater = property.generalWaterTax + property.specialWaterTax;
  const ratePaise = Math.round(property.houseTaxRatePer1000 * 100);
  const t2Values = [
    property.depreciationFactor.toFixed(2),
    property.usageFactor.toFixed(2),
    `₹ ${formatINR(property.capitalValue)}`,
    `${ratePaise} पैसे`,
    formatINR(property.houseTax),
    formatINR(property.lightingTax),
    formatINR(property.healthTax),
    formatINR(totalWater),
    formatINR(property.totalAnnualTax),
    '-',
    '-',
    '-',
    '-',
    '-',
    `${property.encumbranceOrRemarks || 'बोजा नाही'} (ठराव: ${panchayat.resolutionNo})`,
  ];

  const t2DataY = t2Y + t2HeaderH + t2NumH;
  curX = marginX;
  t2Cols.forEach((col, idx) => {
    ctx.fillStyle = idx === 8 ? '#1E3A8A' : '#0F172A';
    ctx.font =
      idx <= 13
        ? idx === 8
          ? `700 11.5px ${MONO_STACK}`
          : `600 11px ${MONO_STACK}`
        : `500 10.5px ${FONT_STACK}`;
    drawCenteredWrappedText(
      ctx,
      t2Values[idx],
      curX + col.w / 2,
      t2DataY,
      t2DataH,
      col.w - 10,
      15
    );
    curX += col.w;
  });

  // ============================================================
  // BOTTOM FOOTER (Date, Fee Receipt, QR, Sarpanch & Gramsevak)
  // ============================================================
  const footerY = t2Y + t2TotalH + 28;

  ctx.fillStyle = '#0F172A';
  ctx.font = `600 12px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText(`दिनांक: ${formatNowIndianDateOnly()}`, marginX + 10, footerY + 12);

  ctx.fillStyle = '#475569';
  ctx.font = `500 10px ${FONT_STACK}`;
  ctx.fillText(
    `पावती क्र.: ${feeTx.receiptNo} (₹${feeTx.amountRs}.00 जमा · UTR: ${feeTx.utrNumber})`,
    marginX + 10,
    footerY + 32
  );

  // Signatures matching screenshot
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 12.5px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText('सरपंच', marginX + 410, footerY + 18);
  ctx.font = `500 10.5px ${FONT_STACK}`;
  ctx.fillStyle = '#475569';
  ctx.fillText(panchayat.sarpanchName || '', marginX + 410, footerY + 36);

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 12.5px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText(
    `ग्रामसेवक/ग्रामविकास अधिकारी ग्रा.पं. ${panchayat.panchayatName}`,
    marginX + 705,
    footerY + 18
  );
  ctx.font = `500 10.5px ${FONT_STACK}`;
  ctx.fillStyle = '#475569';
  ctx.fillText(panchayat.gramsevakName || '', marginX + 705, footerY + 36);

  // Small crisp verification QR on bottom-right
  const qrPayload = JSON.stringify({
    doc: 'NAMUNA_8',
    gp: panchayat.panchayatName,
    propNo: property.propertyNo,
    owner: property.ownerName,
    tax: property.totalAnnualTax,
    receipt: feeTx.receiptNo,
  });
  const qrCanvas = await renderQrCanvas(qrPayload, 64);
  ctx.drawImage(qrCanvas, pageW - marginX - 66, footerY - 8, 56, 56);

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
  pdf.save(`नमुना_८_उतारा_मिळकत_${property.propertyNo}.pdf`);
}

function drawKeyValueGrid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  rows: Array<{ label: string; value: string; mono?: boolean }>,
  colSplit = 230
): number {
  const rowH = 29;
  rows.forEach((row, idx) => {
    const ry = y + idx * rowH;
    ctx.fillStyle = idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF';
    ctx.fillRect(x, ry, w, rowH);

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, ry, w, rowH);

    ctx.beginPath();
    ctx.moveTo(x + colSplit, ry);
    ctx.lineTo(x + colSplit, ry + rowH);
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.font = `600 11px ${FONT_STACK}`;
    ctx.textAlign = 'left';
    ctx.fillText(row.label, x + 12, ry + 19);

    ctx.fillStyle = '#0F172A';
    ctx.font = row.mono ? `600 11.5px ${MONO_STACK}` : `600 11.5px ${FONT_STACK}`;
    ctx.fillText(row.value || '-', x + colSplit + 12, ry + 19);
  });
  return y + rows.length * rowH;
}

function drawOfficialHeaderPortrait(
  ctx: CanvasRenderingContext2D,
  panchayat: PanchayatProfile,
  formTitle: string,
  ruleSubtitle: string,
  pageW: number,
  marginX: number
): number {
  const contentW = pageW - marginX * 2;
  let y = 34;

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(marginX - 10, 20, contentW + 20, 1083);
  ctx.strokeStyle = '#94A3B8';
  ctx.lineWidth = 0.75;
  ctx.strokeRect(marginX - 6, 24, contentW + 12, 1075);

  ctx.fillStyle = '#334155';
  ctx.font = `600 11px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText(
    'महाराष्ट्र शासन  ·  ग्रामविकास विभाग  ·  मुंबई ग्रामपंचायत कर व फी नियम, १९६० (सुधारणा २०१५)',
    pageW / 2,
    y + 4
  );
  y += 26;

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.fillText(panchayat.panchayatName || 'ग्रामपंचायत कार्यालय', pageW / 2, y);
  y += 20;

  ctx.fillStyle = '#475569';
  ctx.font = `500 12px ${FONT_STACK}`;
  ctx.fillText(
    `तालुका: ${panchayat.taluka}   ·   जिल्हा: ${panchayat.district}   ·   पिन कोड: ${panchayat.pinCode}   ·   आर्थिक वर्ष: ${panchayat.financialYear}`,
    pageW / 2,
    y
  );
  y += 14;

  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(marginX, y);
  ctx.lineTo(pageW - marginX, y);
  ctx.stroke();
  y += 22;

  ctx.fillStyle = '#EFF6FF';
  ctx.fillRect(marginX, y - 14, contentW, 44);
  ctx.strokeStyle = '#1E40AF';
  ctx.lineWidth = 1;
  ctx.strokeRect(marginX, y - 14, contentW, 44);

  ctx.fillStyle = '#1E3A8A';
  ctx.font = `700 15px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText(formTitle, pageW / 2, y + 6);

  ctx.fillStyle = '#475569';
  ctx.font = `500 10.5px ${FONT_STACK}`;
  ctx.fillText(ruleSubtitle, pageW / 2, y + 23);

  return y + 44;
}

export async function downloadNamuna9DemandPdf(
  panchayat: PanchayatProfile,
  property: PropertyAssessment,
  record: Namuna9Record,
  feeTx: FeeTransaction
): Promise<void> {
  await ensureFontsLoaded();

  const pageW = 794;
  const pageH = 1123;
  const marginX = 44;
  const contentW = pageW - marginX * 2;

  const { canvas, ctx } = createHiDpiCanvas(pageW, pageH, 2);

  let y = drawOfficialHeaderPortrait(
    ctx,
    panchayat,
    'ग्रामपंचायत नमुना क्रमांक ९ — कर मागणी व वसुली नोंदवही उतारा (पट्टी बिल)',
    'नमुना ८ मधील आकारणीवरून चालू वर्ष व मागील थकबाकी मागणी आणि वसुली तपशील',
    pageW,
    marginX
  );

  // Fee & Receipt Strip
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(marginX, y, contentW, 34);
  ctx.strokeStyle = '#CBD5E1';
  ctx.strokeRect(marginX, y, contentW, 34);

  ctx.fillStyle = '#0F172A';
  ctx.font = `600 10.5px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText(`उतारा पावती क्र.: ${feeTx.receiptNo}`, marginX + 12, y + 21);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#15803D';
  ctx.fillText(`शुल्क जमा: ₹ ${feeTx.amountRs}.00 (UTR: ${feeTx.utrNumber})`, pageW / 2, y + 21);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#334155';
  ctx.fillText(`दिनांक: ${formatNowIndian()}`, pageW - marginX - 12, y + 21);
  y += 48;

  // Property Info
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 12.5px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText('१. करदात्याचा व मालमत्तेचा तपशील', marginX, y);
  y += 10;

  y = drawKeyValueGrid(ctx, marginX, y, contentW, [
    { label: 'मिळकत क्रमांक व वार्ड', value: `${property.propertyNo}  (वार्ड क्र. ${property.wardNo} — ${property.wardName})` },
    { label: 'खातेदाराचे नाव (पत्नी/पती सह)', value: `${property.ownerName}${property.spouseName ? ` व ${property.spouseName}` : ''}` },
    { label: 'आर्थिक वर्ष', value: record.financialYear || panchayat.financialYear },
    { label: 'गट / सर्व्हे क्र.', value: property.surveyOrGutNo },
  ]);
  y += 24;

  // Demand Breakdown
  const totalPaid = record.payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const grossDemand =
    record.previousArrears +
    property.totalAnnualTax +
    record.penaltyOrInterest -
    record.rebateOrDiscount;
  const balanceDue = Math.max(0, grossDemand - totalPaid);

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 12.5px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText('२. कर मागणी व थकबाकी गोषवारा (नमुना क्र. ९)', marginX, y);
  y += 10;

  const demandRows = [
    { label: 'मागील वर्षाची थकबाकी', value: `₹ ${formatINR(record.previousArrears)}.00`, mono: true },
    { label: 'चालू वर्ष — घरपट्टी (नमुना ८ नुसार)', value: `₹ ${formatINR(property.houseTax)}.00`, mono: true },
    { label: 'चालू वर्ष — दिवाबत्ती कर', value: `₹ ${formatINR(property.lightingTax)}.00`, mono: true },
    { label: 'चालू वर्ष — आरोग्य / स्वच्छता कर', value: `₹ ${formatINR(property.healthTax)}.00`, mono: true },
    {
      label: 'चालू वर्ष — पाणीपट्टी (सामान्य + विशेष)',
      value: `₹ ${formatINR(property.generalWaterTax + property.specialWaterTax)}.00`,
      mono: true,
    },
    { label: 'दंड / शास्ती (लागू असल्यास)', value: `₹ ${formatINR(record.penaltyOrInterest)}.00`, mono: true },
    { label: 'वजा: सूट / माफी', value: `- ₹ ${formatINR(record.rebateOrDiscount)}.00`, mono: true },
  ];
  y = drawKeyValueGrid(ctx, marginX, y, contentW, demandRows, 390);

  // Summary Banner
  ctx.fillStyle = '#EFF6FF';
  ctx.fillRect(marginX, y, contentW, 34);
  ctx.strokeStyle = '#1E40AF';
  ctx.strokeRect(marginX, y, contentW, 34);
  ctx.fillStyle = '#1E3A8A';
  ctx.font = `700 12px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText('एकूण देय मागणी (थकबाकी + चालू)', marginX + 12, y + 22);
  ctx.font = `700 13px ${MONO_STACK}`;
  ctx.textAlign = 'right';
  ctx.fillText(`₹ ${formatINR(grossDemand)}.00`, marginX + contentW - 14, y + 22);
  y += 34;

  // Paid & Balance boxes
  const halfW = contentW / 2;
  ctx.fillStyle = '#ECFDF5';
  ctx.fillRect(marginX, y, halfW, 38);
  ctx.strokeStyle = '#10B981';
  ctx.strokeRect(marginX, y, halfW, 38);
  ctx.fillStyle = '#065F46';
  ctx.font = `700 11.5px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText('एकूण जमा वसुली:', marginX + 12, y + 24);
  ctx.font = `700 13px ${MONO_STACK}`;
  ctx.textAlign = 'right';
  ctx.fillText(`₹ ${formatINR(totalPaid)}.00`, marginX + halfW - 12, y + 24);

  ctx.fillStyle = balanceDue > 0 ? '#FEF2F2' : '#ECFDF5';
  ctx.fillRect(marginX + halfW, y, halfW, 38);
  ctx.strokeStyle = balanceDue > 0 ? '#EF4444' : '#10B981';
  ctx.strokeRect(marginX + halfW, y, halfW, 38);
  ctx.fillStyle = balanceDue > 0 ? '#991B1B' : '#065F46';
  ctx.font = `700 11.5px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText('शिल्लक देय रक्कम:', marginX + halfW + 12, y + 24);
  ctx.font = `700 13px ${MONO_STACK}`;
  ctx.textAlign = 'right';
  ctx.fillText(`₹ ${formatINR(balanceDue)}.00`, marginX + contentW - 12, y + 24);
  y += 56;

  // Section 3: Payment Receipts List
  ctx.fillStyle = '#0F172A';
  ctx.font = `700 12.5px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText('३. वसूल झालेल्या पावत्यांचा तपशील (नमुना १० संदर्भ)', marginX, y);
  y += 10;

  ctx.fillStyle = '#1E293B';
  ctx.fillRect(marginX, y, contentW, 28);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 10.5px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText('पावती क्रमांक', marginX + 12, y + 18);
  ctx.fillText('दिनांक', marginX + 185, y + 18);
  ctx.fillText('माध्यम / शेरा', marginX + 300, y + 18);
  ctx.textAlign = 'right';
  ctx.fillText('जमा रक्कम (₹)', marginX + contentW - 12, y + 18);
  y += 28;

  if (record.payments.length === 0) {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(marginX, y, contentW, 34);
    ctx.strokeStyle = '#CBD5E1';
    ctx.strokeRect(marginX, y, contentW, 34);
    ctx.fillStyle = '#64748B';
    ctx.font = `500 11px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText('अद्याप कोणतीही वसुली पावती नोंदवलेली नाही.', pageW / 2, y + 21);
    y += 34;
  } else {
    record.payments.slice(0, 6).forEach((p, idx) => {
      ctx.fillStyle = idx % 2 === 1 ? '#F8FAFC' : '#FFFFFF';
      ctx.fillRect(marginX, y, contentW, 28);
      ctx.strokeStyle = '#CBD5E1';
      ctx.strokeRect(marginX, y, contentW, 28);

      ctx.fillStyle = '#0F172A';
      ctx.font = `600 10.5px ${MONO_STACK}`;
      ctx.textAlign = 'left';
      ctx.fillText(p.receiptNo, marginX + 12, y + 18);
      ctx.fillText(p.date, marginX + 185, y + 18);

      ctx.font = `500 10.5px ${FONT_STACK}`;
      ctx.fillText(`${p.mode}${p.note ? ` · ${p.note}` : ''}`, marginX + 300, y + 18);

      ctx.font = `700 11px ${MONO_STACK}`;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#15803D';
      ctx.fillText(`₹ ${formatINR(p.amountPaid)}.00`, marginX + contentW - 12, y + 18);
      y += 28;
    });
  }

  // QR & Signatures
  const qrPayload = JSON.stringify({
    doc: 'NAMUNA_9',
    gp: panchayat.panchayatName,
    propNo: property.propertyNo,
    demand: grossDemand,
    paid: totalPaid,
    balance: balanceDue,
    receipt: feeTx.receiptNo,
  });
  const qrCanvas = await renderQrCanvas(qrPayload, 92);
  const footerTop = pageH - 150;
  ctx.drawImage(qrCanvas, marginX, footerTop, 88, 88);

  ctx.fillStyle = '#475569';
  ctx.font = `500 9.5px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText('नमुना ९ पडताळणी QR', marginX, footerTop + 102);
  ctx.fillText(`पावती: ${feeTx.receiptNo}`, marginX, footerTop + 116);

  ctx.strokeStyle = '#94A3B8';
  ctx.beginPath();
  ctx.moveTo(marginX + 190, footerTop + 58);
  ctx.lineTo(marginX + 410, footerTop + 58);
  ctx.moveTo(pageW - marginX - 220, footerTop + 58);
  ctx.lineTo(pageW - marginX, footerTop + 58);
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = `600 11px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText('वसुली लिपिक / ग्रामसेवक', marginX + 300, footerTop + 76);
  ctx.fillStyle = '#475569';
  ctx.font = `500 10.5px ${FONT_STACK}`;
  ctx.fillText(panchayat.gramsevakName || '', marginX + 300, footerTop + 92);

  ctx.fillStyle = '#0F172A';
  ctx.font = `600 11px ${FONT_STACK}`;
  ctx.fillText('सरपंच / ग्रामपंचायत कार्यालय', pageW - marginX - 110, footerTop + 76);
  ctx.fillStyle = '#475569';
  ctx.font = `500 10.5px ${FONT_STACK}`;
  ctx.fillText(panchayat.sarpanchName || '', pageW - marginX - 110, footerTop + 92);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const imgData = canvas.toDataURL('image/png');
  pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
  pdf.save(`नमुना_९_कर_मागणी_मिळकत_${property.propertyNo}.pdf`);
}

function drawRegisterPageHeader(
  ctx: CanvasRenderingContext2D,
  panchayat: PanchayatProfile,
  formHeading: string,
  subtitle: string,
  rightLine1: string,
  rightLine2: string,
  pageW: number,
  marginX: number
) {
  ctx.fillStyle = '#0F172A';
  ctx.font = `600 11px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText(`ग्रामपंचायत : ${panchayat.panchayatName || '-'}`, marginX, 28);
  ctx.fillText(`तालुका : ${panchayat.taluka || '-'}`, marginX, 45);
  ctx.fillText(`जिल्हा : ${panchayat.district || '-'}`, marginX, 62);

  ctx.textAlign = 'center';
  ctx.font = `700 20px ${FONT_STACK}`;
  ctx.fillText(formHeading, pageW / 2, 36);
  ctx.font = `600 11.5px ${FONT_STACK}`;
  ctx.fillStyle = '#334155';
  ctx.fillText(subtitle, pageW / 2, 58);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#334155';
  ctx.font = `600 10.5px ${FONT_STACK}`;
  ctx.fillText(rightLine1, pageW - marginX, 34);
  ctx.fillText(rightLine2, pageW - marginX, 52);
}

function drawRegisterPageFooter(
  ctx: CanvasRenderingContext2D,
  pageNum: number,
  totalPages: number,
  pageW: number,
  pageH: number
) {
  ctx.fillStyle = '#334155';
  ctx.font = `600 10.5px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText(`पान नं - ${pageNum}/${totalPages}`, pageW / 2, pageH - 16);
}

async function drawRegisterSummaryAndSignatures(
  ctx: CanvasRenderingContext2D,
  panchayat: PanchayatProfile,
  feeTx: FeeTransaction,
  summaryItems: Array<{ label: string; value: string; accent?: string }>,
  qrDocTag: string,
  qrMeta: Record<string, unknown>,
  startY: number,
  pageW: number,
  marginX: number,
  contentW: number
) {
  // 5-column horizontal totals box matching reference page 153
  const boxH = 44;
  const colW = contentW / summaryItems.length;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(marginX, startY, contentW, boxH);
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(marginX, startY, contentW, boxH);

  summaryItems.forEach((item, idx) => {
    const cx = marginX + idx * colW;
    if (idx > 0) {
      ctx.beginPath();
      ctx.moveTo(cx, startY);
      ctx.lineTo(cx, startY + boxH);
      ctx.stroke();
    }
    ctx.fillStyle = '#475569';
    ctx.font = `600 10px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText(item.label, cx + colW / 2, startY + 16);

    ctx.fillStyle = item.accent || '#0F172A';
    ctx.font = `700 12.5px ${MONO_STACK}`;
    ctx.fillText(item.value, cx + colW / 2, startY + 35);
  });

  const sigY = startY + boxH + 14;
  ctx.fillStyle = '#0F172A';
  ctx.font = `600 11px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText(`दिनांक: ${formatNowIndianDateOnly()}`, marginX, sigY + 14);
  ctx.fillStyle = '#475569';
  ctx.font = `500 9.5px ${FONT_STACK}`;
  ctx.fillText(
    `पावती क्र.: ${feeTx.receiptNo} (₹${feeTx.amountRs}.00 जमा · UTR: ${feeTx.utrNumber})`,
    marginX,
    sigY + 32
  );

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 11.5px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText('सरपंच', marginX + 430, sigY + 18);
  ctx.font = `500 10px ${FONT_STACK}`;
  ctx.fillStyle = '#475569';
  ctx.fillText(panchayat.sarpanchName || '', marginX + 430, sigY + 34);

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 11.5px ${FONT_STACK}`;
  ctx.fillText(
    `ग्रामसेवक / ग्रामविकास अधिकारी ग्रा.पं. ${panchayat.panchayatName}`,
    marginX + 740,
    sigY + 18
  );
  ctx.font = `500 10px ${FONT_STACK}`;
  ctx.fillStyle = '#475569';
  ctx.fillText(panchayat.gramsevakName || '', marginX + 740, sigY + 34);

  const qrCanvas = await renderQrCanvas(
    JSON.stringify({
      doc: qrDocTag,
      gp: panchayat.panchayatName,
      receipt: feeTx.receiptNo,
      ...qrMeta,
    }),
    58
  );
  ctx.drawImage(qrCanvas, pageW - marginX - 54, sigY - 4, 52, 52);
}

/**
 * नमुना नं. ८ — पूर्ण रजिस्टर (सर्व नोंदी क्रमवाईज एकाखाली एक, A4 Landscape बहुपृष्ठीय PDF)
 */
export async function downloadNamuna8FullRegisterPdf(
  panchayat: PanchayatProfile,
  properties: PropertyAssessment[],
  feeTx: FeeTransaction
): Promise<void> {
  await ensureFontsLoaded();

  const pageW = 1123;
  const pageH = 794;
  const marginX = 24;
  const contentW = pageW - marginX * 2; // 1075px
  const fyText = panchayat.financialYear || '२०२६-२०२७';

  // Single wide continuous table columns summing to 1075px
  const cols = [
    { w: 28, num: '१', title: 'अ.क्र.', group: null },
    { w: 58, num: '२,३', title: 'रस्त्याचे नाव व गट क्र.', group: null },
    { w: 38, num: '४', title: 'मि.नं.', group: null },
    { w: 96, num: '५,६', title: 'मालकाचे नाव', group: null },
    { w: 58, num: '', title: 'भोगवटादार नाव', group: null },
    { w: 94, num: '७', title: 'मालमत्तेचे वर्णन', group: null },
    { w: 34, num: '८', title: 'बांधकाम वर्ष', group: null },
    // Group: क्षेत्रफळ (९) -> 136px
    { w: 32, num: '९', title: 'लांबी', group: 'area' },
    { w: 32, num: '', title: 'रुंदी', group: 'area' },
    { w: 36, num: '', title: 'चौ.फू', group: 'area' },
    { w: 36, num: '', title: 'चौ.मी', group: 'area' },
    // Group: रेडिरेकनर दर -> 88px
    { w: 44, num: '१०', title: 'जमीन', group: 'rr' },
    { w: 44, num: '११,१२', title: 'बांधकाम', group: 'rr' },
    { w: 36, num: '१३', title: 'घसारा दर', group: null },
    { w: 34, num: '१४', title: 'भारांक', group: null },
    { w: 64, num: '१५', title: 'भांडवली मूल्य', group: null },
    { w: 36, num: '१६', title: 'कराचा दर', group: null },
    // Group: वार्षिक कराची रक्कम (रुपयात) -> 215px
    { w: 44, num: '१७', title: 'घरपट्टी', group: 'tax' },
    { w: 38, num: '१८', title: 'दिवाबत्ती', group: 'tax' },
    { w: 38, num: '१९', title: 'आरोग्य', group: 'tax' },
    { w: 44, num: '२०', title: 'पा.पट्टी', group: 'tax' },
    { w: 51, num: '२१', title: 'एकूण', group: 'tax' },
    { w: 60, num: '२२-२७', title: 'शेरा', group: null },
  ] as const;

  const tableTopY = 78;
  const headerH = 62;
  const subHeaderTopOffset = 24;
  const numRowH = 18;
  const rowH = 92;
  const maxBodyBottomY = 748;
  const rowsPerPage = Math.floor((maxBodyBottomY - (tableTopY + headerH + numRowH)) / rowH); // 6 rows

  const chunks: PropertyAssessment[][] = [];
  if (properties.length === 0) {
    chunks.push([]);
  } else {
    for (let i = 0; i < properties.length; i += rowsPerPage) {
      chunks.push(properties.slice(i, i + rowsPerPage));
    }
  }

  const lastChunk = chunks[chunks.length - 1];
  const lastChunkEndY = tableTopY + headerH + numRowH + lastChunk.length * rowH;
  const summaryNeedsExtraPage = lastChunkEndY + 132 > pageH - 34;
  const totalPages = chunks.length + (summaryNeedsExtraPage ? 1 : 0);

  const drawTableHeader = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(marginX, tableTopY, contentW, headerH + numRowH);

    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(marginX, tableTopY, contentW, headerH);
    ctx.strokeRect(marginX, tableTopY + headerH, contentW, numRowH);

    const drawGroupTopBar = (startIdx: number, count: number, label: string) => {
      const gx = marginX + cols.slice(0, startIdx).reduce((s, c) => s + c.w, 0);
      const gw = cols.slice(startIdx, startIdx + count).reduce((s, c) => s + c.w, 0);
      ctx.beginPath();
      ctx.moveTo(gx, tableTopY + subHeaderTopOffset);
      ctx.lineTo(gx + gw, tableTopY + subHeaderTopOffset);
      ctx.stroke();

      ctx.fillStyle = '#0F172A';
      ctx.font = `700 9.5px ${FONT_STACK}`;
      drawCenteredWrappedText(ctx, label, gx + gw / 2, tableTopY, subHeaderTopOffset, gw - 4, 11);
    };

    drawGroupTopBar(7, 4, 'क्षेत्रफळ');
    drawGroupTopBar(11, 2, 'रेडिरेकनर दर');
    drawGroupTopBar(17, 5, 'वार्षिक कराची रक्कम (रुपयात)');

    let cx = marginX;
    cols.forEach((col, idx) => {
      if (idx > 0) {
        const prevCol = cols[idx - 1];
        const isSameGroup = col.group !== null && col.group === prevCol.group;
        ctx.beginPath();
        ctx.moveTo(cx, isSameGroup ? tableTopY + subHeaderTopOffset : tableTopY);
        ctx.lineTo(cx, tableTopY + headerH + numRowH);
        ctx.stroke();
      }

      ctx.fillStyle = '#0F172A';
      ctx.font = `700 9px ${FONT_STACK}`;
      if (col.group) {
        drawCenteredWrappedText(
          ctx,
          col.title,
          cx + col.w / 2,
          tableTopY + subHeaderTopOffset,
          headerH - subHeaderTopOffset,
          col.w - 3,
          11
        );
      } else {
        drawCenteredWrappedText(ctx, col.title, cx + col.w / 2, tableTopY, headerH, col.w - 4, 11.5);
      }

      if (col.num) {
        ctx.font = `600 8.5px ${FONT_STACK}`;
        ctx.textAlign = 'center';
        ctx.fillText(col.num, cx + col.w / 2, tableTopY + headerH + 12.5);
      }
      cx += col.w;
    });
  };

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let serialNo = 1;
  let lastPageContext: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; endY: number } | null = null;

  for (let pageIdx = 0; pageIdx < chunks.length; pageIdx++) {
    const chunk = chunks[pageIdx];
    const { canvas, ctx } = createHiDpiCanvas(pageW, pageH, 2);

    drawRegisterPageHeader(
      ctx,
      panchayat,
      'नमुना नं. ८',
      `${fyText} या सालासाठी कर आकारणी नोंदवही (संपूर्ण रजिस्टर)`,
      `दिनांक : ${formatNowIndianDateOnly()}`,
      `एकूण मिळकती : ${properties.length}`,
      pageW,
      marginX
    );

    drawTableHeader(ctx);

    let ry = tableTopY + headerH + numRowH;
    chunk.forEach((prop) => {
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 0.9;
      ctx.strokeRect(marginX, ry, contentW, rowH);

      let cx = marginX;
      cols.forEach((col, idx) => {
        if (idx > 0) {
          ctx.beginPath();
          ctx.moveTo(cx, ry);
          ctx.lineTo(cx, ry + rowH);
          ctx.stroke();
        }
        cx += col.w;
      });

      const landRate =
        prop.rrLandRate ??
        (prop.constructionType === 'open_plot'
          ? prop.readyReckonerRate
          : Math.round(prop.readyReckonerRate * 0.25));
      const buildingRate =
        prop.rrBuildingRate ??
        (prop.constructionType === 'open_plot' ? 0 : prop.readyReckonerRate);
      const totalWater = prop.generalWaterTax + prop.specialWaterTax;
      const ratePaise = Math.round(prop.houseTaxRatePer1000 * 100);
      const consLabel = CONSTRUCTION_RATE_RULES[prop.constructionType].shortLabel;
      const usageLabel = USAGE_FACTORS[prop.usageType].label;

      const rowVals = [
        String(serialNo++),
        `वार्ड ${prop.wardNo} ${prop.wardName} / ${prop.surveyOrGutNo || '-'}`,
        prop.propertyNo,
        `${prop.ownerName}${prop.spouseName ? ` व ${prop.spouseName}` : ''}`,
        prop.occupantName || 'स्वतः',
        `${consLabel} (${usageLabel}), ${prop.lengthFt}×${prop.widthFt} फूट`,
        String(prop.constructionYear),
        String(prop.lengthFt),
        String(prop.widthFt),
        String(prop.areaSqFt),
        String(prop.areaSqM),
        landRate > 0 ? formatINR(landRate) : '0',
        buildingRate > 0 ? formatINR(buildingRate) : '0',
        prop.depreciationFactor.toFixed(2),
        prop.usageFactor.toFixed(2),
        formatINR(prop.capitalValue),
        `${ratePaise} पैसे`,
        formatINR(prop.houseTax),
        formatINR(prop.lightingTax),
        formatINR(prop.healthTax),
        formatINR(totalWater),
        formatINR(prop.totalAnnualTax),
        prop.encumbranceOrRemarks || 'बोजा नाही',
      ];

      cx = marginX;
      cols.forEach((col, idx) => {
        const isNumeric = idx === 0 || idx === 2 || (idx >= 6 && idx <= 21);
        ctx.fillStyle = idx === 21 ? '#1E3A8A' : '#0F172A';
        ctx.font =
          idx === 21
            ? `700 9.5px ${MONO_STACK}`
            : isNumeric
            ? `600 9px ${MONO_STACK}`
            : `500 9px ${FONT_STACK}`;
        drawCenteredWrappedText(ctx, rowVals[idx], cx + col.w / 2, ry, rowH, col.w - 6, 12.5);
        cx += col.w;
      });

      ry += rowH;
    });

    drawRegisterPageFooter(ctx, pageIdx + 1, totalPages, pageW, pageH);

    if (pageIdx < chunks.length - 1 || summaryNeedsExtraPage) {
      if (pageIdx > 0) pdf.addPage('a4', 'landscape');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210);
    } else {
      lastPageContext = { canvas, ctx, endY: ry };
    }
  }

  const totals = properties.reduce(
    (acc, p) => {
      acc.house += p.houseTax;
      acc.light += p.lightingTax;
      acc.health += p.healthTax;
      acc.water += p.generalWaterTax + p.specialWaterTax;
      acc.total += p.totalAnnualTax;
      return acc;
    },
    { house: 0, light: 0, health: 0, water: 0, total: 0 }
  );

  const summaryItems = [
    { label: 'घरपट्टी एकूण', value: `₹ ${formatINR(totals.house)}` },
    { label: 'दिवाबत्ती एकूण', value: `₹ ${formatINR(totals.light)}` },
    { label: 'आरोग्यकर एकूण', value: `₹ ${formatINR(totals.health)}` },
    { label: 'पाणीपट्टी एकूण', value: `₹ ${formatINR(totals.water)}` },
    { label: 'एकूण कर', value: `₹ ${formatINR(totals.total)}`, accent: '#1E3A8A' },
  ];

  if (summaryNeedsExtraPage) {
    const { canvas, ctx } = createHiDpiCanvas(pageW, pageH, 2);
    drawRegisterPageHeader(
      ctx,
      panchayat,
      'नमुना नं. ८',
      `${fyText} या सालासाठी कर आकारणी नोंदवही — एकूण गोषवारा व स्वाक्षरी`,
      `दिनांक : ${formatNowIndianDateOnly()}`,
      `एकूण मिळकती : ${properties.length}`,
      pageW,
      marginX
    );
    await drawRegisterSummaryAndSignatures(
      ctx,
      panchayat,
      feeTx,
      summaryItems,
      'NAMUNA_8_FULL_REGISTER',
      { count: properties.length, totalTax: totals.total },
      110,
      pageW,
      marginX,
      contentW
    );
    drawRegisterPageFooter(ctx, totalPages, totalPages, pageW, pageH);
    pdf.addPage('a4', 'landscape');
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210);
  } else if (lastPageContext) {
    await drawRegisterSummaryAndSignatures(
      lastPageContext.ctx,
      panchayat,
      feeTx,
      summaryItems,
      'NAMUNA_8_FULL_REGISTER',
      { count: properties.length, totalTax: totals.total },
      lastPageContext.endY + 14,
      pageW,
      marginX,
      contentW
    );
    if (chunks.length > 1) pdf.addPage('a4', 'landscape');
    pdf.addImage(lastPageContext.canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210);
  }

  pdf.save(`नमुना_८_पूर्ण_रजिस्टर_${panchayat.panchayatName.replace(/\s+/g, '_')}.pdf`);
}

/**
 * नमुना नं. ९ — पूर्ण रजिस्टर (मिळकतधारकाच्या नावानुसार अल्फाबेटिकल व बहु-मिळकतींची एकत्रित बेरीज, A4 Landscape)
 */
export async function downloadNamuna9FullRegisterPdf(
  panchayat: PanchayatProfile,
  properties: PropertyAssessment[],
  namuna9Records: Record<string, Namuna9Record>,
  feeTx: FeeTransaction
): Promise<void> {
  await ensureFontsLoaded();

  const consolidatedRows = buildAlphabeticalNamuna9Rows(
    properties,
    namuna9Records,
    panchayat.financialYear
  );

  const pageW = 1123;
  const pageH = 794;
  const marginX = 24;
  const contentW = pageW - marginX * 2; // 1075px
  const fyText = panchayat.financialYear || '२०२६-२०२७';

  // Columns summing to 1075px
  const cols = [
    { w: 32, title: 'अ.क्र.' },
    { w: 165, title: 'खातेदाराचे नाव (अल्फाबेटिकल)' },
    { w: 95, title: 'एकत्रित मिळकत क्र.' },
    { w: 45, title: 'वार्ड' },
    { w: 68, title: 'मागील थकबाकी' },
    { w: 65, title: 'चालू घरपट्टी' },
    { w: 55, title: 'दिवाबत्ती' },
    { w: 55, title: 'आरोग्य' },
    { w: 60, title: 'पाणीपट्टी' },
    { w: 72, title: 'एकूण चालू कर' },
    { w: 62, title: 'दंड / सूट' },
    { w: 80, title: 'एकूण देय मागणी' },
    { w: 76, title: 'वसूल रक्कम' },
    { w: 76, title: 'शिल्लक थकबाकी' },
    { w: 69, title: 'स्थिती / नोंदी' },
  ] as const;

  const tableTopY = 78;
  const headerH = 44;
  const rowH = 58;
  const maxBodyBottomY = 746;
  const rowsPerPage = Math.floor((maxBodyBottomY - (tableTopY + headerH)) / rowH); // 10 rows

  const chunks: typeof consolidatedRows[] = [];
  if (consolidatedRows.length === 0) {
    chunks.push([]);
  } else {
    for (let i = 0; i < consolidatedRows.length; i += rowsPerPage) {
      chunks.push(consolidatedRows.slice(i, i + rowsPerPage));
    }
  }

  const lastChunk = chunks[chunks.length - 1];
  const lastChunkEndY = tableTopY + headerH + lastChunk.length * rowH;
  const summaryNeedsExtraPage = lastChunkEndY + 132 > pageH - 34;
  const totalPages = chunks.length + (summaryNeedsExtraPage ? 1 : 0);

  const drawTableHeader = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(marginX, tableTopY, contentW, headerH);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.1;
    ctx.strokeRect(marginX, tableTopY, contentW, headerH);

    let cx = marginX;
    cols.forEach((col, idx) => {
      if (idx > 0) {
        ctx.beginPath();
        ctx.moveTo(cx, tableTopY);
        ctx.lineTo(cx, tableTopY + headerH);
        ctx.stroke();
      }
      ctx.fillStyle = '#0F172A';
      ctx.font = `700 9.5px ${FONT_STACK}`;
      drawCenteredWrappedText(ctx, col.title, cx + col.w / 2, tableTopY, headerH, col.w - 4, 12);
      cx += col.w;
    });
  };

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let serialNo = 1;
  let lastPageContext: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; endY: number } | null = null;

  for (let pageIdx = 0; pageIdx < chunks.length; pageIdx++) {
    const chunk = chunks[pageIdx];
    const { canvas, ctx } = createHiDpiCanvas(pageW, pageH, 2);

    drawRegisterPageHeader(
      ctx,
      panchayat,
      'नमुना नं. ९',
      `${fyText} या सालासाठी कर मागणी व वसुली नोंदवही — खातेदारनिहाय अल्फाबेटिकल (एकत्रित)`,
      `दिनांक : ${formatNowIndianDateOnly()}`,
      `खातेदार : ${consolidatedRows.length} (एकूण मिळकती : ${properties.length})`,
      pageW,
      marginX
    );

    drawTableHeader(ctx);

    let ry = tableTopY + headerH;
    chunk.forEach((row) => {
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 0.9;
      ctx.strokeRect(marginX, ry, contentW, rowH);

      let cx = marginX;
      cols.forEach((col, idx) => {
        if (idx > 0) {
          ctx.beginPath();
          ctx.moveTo(cx, ry);
          ctx.lineTo(cx, ry + rowH);
          ctx.stroke();
        }
        cx += col.w;
      });

      const netPenaltyRebate = row.penaltyOrInterest - row.rebateOrDiscount;
      const penaltyRebateLabel =
        netPenaltyRebate === 0
          ? '0'
          : netPenaltyRebate > 0
          ? `+${formatINR(netPenaltyRebate)}`
          : `-${formatINR(Math.abs(netPenaltyRebate))}`;
      const statusText =
        row.status === 'paid'
          ? `पूर्ण जमा (${row.propertyCount} नोंदी)`
          : row.status === 'partial'
          ? `अंशतः जमा (${row.propertyCount} नोंदी)`
          : `थकीत (${row.propertyCount} नोंदी)`;

      const ownerText = row.spouseNames
        ? `${row.ownerName} (सह: ${row.spouseNames})`
        : row.ownerName;

      const rowVals = [
        String(serialNo++),
        ownerText,
        row.propertyNos.join(', '),
        row.wardNos.join(', '),
        formatINR(row.previousArrears),
        formatINR(row.houseTax),
        formatINR(row.lightingTax),
        formatINR(row.healthTax),
        formatINR(row.waterTax),
        formatINR(row.totalAnnualTax),
        penaltyRebateLabel,
        formatINR(row.grossDemand),
        formatINR(row.totalPaid),
        formatINR(row.balanceDue),
        statusText,
      ];

      cx = marginX;
      cols.forEach((col, idx) => {
        const isNumeric = idx === 0 || (idx >= 4 && idx <= 13);
        ctx.fillStyle =
          idx === 11
            ? '#1E3A8A'
            : idx === 12
            ? '#065F46'
            : idx === 13 && row.balanceDue > 0
            ? '#991B1B'
            : '#0F172A';
        ctx.font =
          idx === 11 || idx === 13
            ? `700 9.5px ${MONO_STACK}`
            : isNumeric
            ? `600 9.5px ${MONO_STACK}`
            : idx === 1
            ? `600 9.5px ${FONT_STACK}`
            : `500 9px ${FONT_STACK}`;
        drawCenteredWrappedText(
          ctx,
          rowVals[idx],
          cx + col.w / 2,
          ry,
          rowH,
          col.w - 6,
          12.5,
          idx === 1 ? 'left' : 'center',
          5
        );
        cx += col.w;
      });

      ry += rowH;
    });

    drawRegisterPageFooter(ctx, pageIdx + 1, totalPages, pageW, pageH);

    if (pageIdx < chunks.length - 1 || summaryNeedsExtraPage) {
      if (pageIdx > 0) pdf.addPage('a4', 'landscape');
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210);
    } else {
      lastPageContext = { canvas, ctx, endY: ry };
    }
  }

  const totals = consolidatedRows.reduce(
    (acc, r) => {
      acc.arrears += r.previousArrears;
      acc.annual += r.totalAnnualTax;
      acc.demand += r.grossDemand;
      acc.paid += r.totalPaid;
      acc.balance += r.balanceDue;
      return acc;
    },
    { arrears: 0, annual: 0, demand: 0, paid: 0, balance: 0 }
  );

  const summaryItems = [
    { label: 'मागील थकबाकी एकूण', value: `₹ ${formatINR(totals.arrears)}` },
    { label: 'चालू वार्षिक कर एकूण', value: `₹ ${formatINR(totals.annual)}` },
    { label: 'एकूण देय मागणी', value: `₹ ${formatINR(totals.demand)}`, accent: '#1E3A8A' },
    { label: 'एकूण वसूल रक्कम', value: `₹ ${formatINR(totals.paid)}`, accent: '#065F46' },
    { label: 'एकूण शिल्लक थकबाकी', value: `₹ ${formatINR(totals.balance)}`, accent: '#991B1B' },
  ];

  if (summaryNeedsExtraPage) {
    const { canvas, ctx } = createHiDpiCanvas(pageW, pageH, 2);
    drawRegisterPageHeader(
      ctx,
      panchayat,
      'नमुना नं. ९',
      `${fyText} या सालासाठी कर मागणी व वसुली नोंदवही — एकूण गोषवारा व स्वाक्षरी`,
      `दिनांक : ${formatNowIndianDateOnly()}`,
      `खातेदार : ${consolidatedRows.length} (एकूण मिळकती : ${properties.length})`,
      pageW,
      marginX
    );
    await drawRegisterSummaryAndSignatures(
      ctx,
      panchayat,
      feeTx,
      summaryItems,
      'NAMUNA_9_FULL_REGISTER',
      { owners: consolidatedRows.length, properties: properties.length, totalDemand: totals.demand },
      110,
      pageW,
      marginX,
      contentW
    );
    drawRegisterPageFooter(ctx, totalPages, totalPages, pageW, pageH);
    pdf.addPage('a4', 'landscape');
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210);
  } else if (lastPageContext) {
    await drawRegisterSummaryAndSignatures(
      lastPageContext.ctx,
      panchayat,
      feeTx,
      summaryItems,
      'NAMUNA_9_FULL_REGISTER',
      { owners: consolidatedRows.length, properties: properties.length, totalDemand: totals.demand },
      lastPageContext.endY + 14,
      pageW,
      marginX,
      contentW
    );
    if (chunks.length > 1) pdf.addPage('a4', 'landscape');
    pdf.addImage(lastPageContext.canvas.toDataURL('image/png'), 'PNG', 0, 0, 297, 210);
  }

  pdf.save(
    `नमुना_९_पूर्ण_रजिस्टर_अल्फाबेटिकल_${panchayat.panchayatName.replace(/\s+/g, '_')}.pdf`
  );
}
