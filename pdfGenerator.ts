import { jsPDF } from 'jspdf';
import { ComputedMonthlyReport } from '../data/seedData';
import {
  ClassRoom,
  DayRecord,
  SchoolProfile,
} from '../types/attendance';
import {
  formatIsoForDay,
  formatMarathiDate,
  formatShortDate,
  getDaysInMonth,
  getMarathiDayName,
  isSunday,
  makeRecordKey,
  MARATHI_MONTHS,
} from './marathiCalendar';

const FONT_STACK = '"Noto Sans Devanagari", "Plus Jakarta Sans", sans-serif';
const MONO_STACK = '"JetBrains Mono", "Noto Sans Devanagari", monospace';

async function ensureFontsLoaded(): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed with fallback system fonts if font promise fails
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

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 1 && ctx.measureText(trimmed + '…').width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed + '…';
}

function drawSchoolHeader(
  ctx: CanvasRenderingContext2D,
  school: SchoolProfile,
  title: string,
  subtitle: string,
  pageW: number,
  marginX: number,
  pageNum: number,
  totalPages: number
): number {
  let y = 32;

  ctx.fillStyle = '#0F172A';
  ctx.font = `700 17px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.fillText(school.schoolName || 'शाळेचे नाव', pageW / 2, y);
  y += 18;

  ctx.fillStyle = '#475569';
  ctx.font = `400 11px ${FONT_STACK}`;
  const addrParts = [school.address];
  if (school.udiseCode) addrParts.push(`UDISE: ${school.udiseCode}`);
  ctx.fillText(addrParts.filter(Boolean).join('  ·  '), pageW / 2, y);
  y += 14;

  // Header divider line
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(marginX, y);
  ctx.lineTo(pageW - marginX, y);
  ctx.stroke();
  y += 20;

  // Report title left + page number right
  ctx.textAlign = 'left';
  ctx.fillStyle = '#1D4ED8';
  ctx.font = `700 14px ${FONT_STACK}`;
  ctx.fillText(title, marginX, y);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748B';
  ctx.font = `500 10px ${MONO_STACK}`;
  ctx.fillText(`पान ${pageNum} / ${totalPages}`, pageW - marginX, y);
  y += 17;

  ctx.textAlign = 'left';
  ctx.fillStyle = '#334155';
  ctx.font = `500 11px ${FONT_STACK}`;
  ctx.fillText(subtitle, marginX, y);
  y += 12;

  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marginX, y);
  ctx.lineTo(pageW - marginX, y);
  ctx.stroke();

  return y + 14;
}

function drawSignatureFooter(
  ctx: CanvasRenderingContext2D,
  school: SchoolProfile,
  teacherName: string,
  pageW: number,
  pageH: number,
  marginX: number
) {
  const footerY = pageH - 54;
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(marginX, footerY - 24);
  ctx.lineTo(pageW - marginX, footerY - 24);
  ctx.stroke();

  ctx.fillStyle = '#334155';
  ctx.font = `600 11px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText(`वर्गशिक्षक स्वाक्षरी (${teacherName || 'वर्गशिक्षक'})`, marginX, footerY);

  ctx.textAlign = 'right';
  ctx.fillText(
    `मुख्याध्यापक स्वाक्षरी (${school.principalName || 'मुख्याध्यापक'})`,
    pageW - marginX,
    footerY
  );

  const now = new Date();
  const stamp = `अहवाल तयार दिनांक: ${String(now.getDate()).padStart(2, '0')}/${String(
    now.getMonth() + 1
  ).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = `400 9.5px ${FONT_STACK}`;
  ctx.fillText(stamp, pageW / 2, pageH - 22);
}

export async function downloadDailyAttendancePdf(
  school: SchoolProfile,
  classroom: ClassRoom,
  isoDate: string,
  record?: DayRecord
): Promise<void> {
  await ensureFontsLoaded();

  const pageW = 794;
  const pageH = 1123;
  const marginX = 42;
  const contentW = pageW - marginX * 2;
  const students = [...classroom.students].sort((a, b) => a.rollNo - b.rollNo);

  const entries = record?.entries ?? {};
  let presentCount = 0;
  let absentCount = 0;
  let leaveCount = 0;
  let unmarkedCount = 0;

  for (const s of students) {
    const st = entries[s.id]?.status;
    if (st === 'present') presentCount++;
    else if (st === 'absent') absentCount++;
    else if (st === 'leave') leaveCount++;
    else unmarkedCount++;
  }
  const pct =
    students.length > 0 ? Math.round((presentCount / students.length) * 1000) / 10 : 0;

  const rowsPerFirstPage = 27;
  const rowsPerNextPage = 32;
  const pages: Array<typeof students> = [];

  if (students.length <= rowsPerFirstPage) {
    pages.push(students);
  } else {
    pages.push(students.slice(0, rowsPerFirstPage));
    let idx = rowsPerFirstPage;
    while (idx < students.length) {
      pages.push(students.slice(idx, idx + rowsPerNextPage));
      idx += rowsPerNextPage;
    }
  }
  if (pages.length === 0) pages.push([]);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const dayName = getMarathiDayName(isoDate);
  const subtitle = `${classroom.standard} - तुकडी ${classroom.division}  ·  दिनांक: ${formatMarathiDate(
    isoDate
  )} (${dayName})  ·  वर्गशिक्षक: ${classroom.teacherName}  ·  शैक्षणिक वर्ष: ${
    classroom.academicYear
  }`;

  pages.forEach((pageStudents, pageIndex) => {
    if (pageIndex > 0) pdf.addPage();
    const { canvas, ctx } = createHiDpiCanvas(pageW, pageH, 2);

    let y = drawSchoolHeader(
      ctx,
      school,
      'दैनिक विद्यार्थी हजेरी अहवाल',
      subtitle,
      pageW,
      marginX,
      pageIndex + 1,
      pages.length
    );

    if (pageIndex === 0) {
      if (record?.isHoliday) {
        ctx.fillStyle = '#FEF3C7';
        ctx.fillRect(marginX, y, contentW, 38);
        ctx.strokeStyle = '#F59E0B';
        ctx.lineWidth = 1;
        ctx.strokeRect(marginX, y, contentW, 38);
        ctx.fillStyle = '#92400E';
        ctx.font = `700 12px ${FONT_STACK}`;
        ctx.textAlign = 'left';
        ctx.fillText(
          `शाळा सुट्टी नोंद: ${record.holidayReason || 'सुट्टी'}`,
          marginX + 12,
          y + 23
        );
        y += 50;
      } else {
        // Summary KPI strip
        const boxW = contentW / 5;
        const boxes = [
          { label: 'एकूण विद्यार्थी', val: `${students.length}`, color: '#0F172A' },
          { label: 'हजर', val: `${presentCount}`, color: '#15803D' },
          { label: 'गैरहजर', val: `${absentCount}`, color: '#B91C1C' },
          { label: 'रजा', val: `${leaveCount}`, color: '#B45309' },
          {
            label: unmarkedCount > 0 ? 'उपस्थिती % (बाकी)' : 'उपस्थिती %',
            val: unmarkedCount > 0 ? `${pct}% (${unmarkedCount})` : `${pct}%`,
            color: '#1D4ED8',
          },
        ];

        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(marginX, y, contentW, 48);
        ctx.strokeStyle = '#CBD5E1';
        ctx.lineWidth = 1;
        ctx.strokeRect(marginX, y, contentW, 48);

        boxes.forEach((b, i) => {
          const bx = marginX + i * boxW;
          if (i > 0) {
            ctx.beginPath();
            ctx.moveTo(bx, y);
            ctx.lineTo(bx, y + 48);
            ctx.stroke();
          }
          ctx.fillStyle = '#475569';
          ctx.font = `500 10px ${FONT_STACK}`;
          ctx.textAlign = 'center';
          ctx.fillText(b.label, bx + boxW / 2, y + 17);

          ctx.fillStyle = b.color;
          ctx.font = `700 15px ${MONO_STACK}`;
          ctx.fillText(b.val, bx + boxW / 2, y + 38);
        });
        y += 62;
      }
    }

    // Table Header
    const colRoll = 62;
    const colName = 310;
    const colStatus = 120;
    const colNote = contentW - (colRoll + colName + colStatus);
    const headerH = 30;
    const rowH = 27;

    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(marginX, y, contentW, headerH);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    ctx.strokeRect(marginX, y, contentW, headerH);

    ctx.fillStyle = '#0F172A';
    ctx.font = `700 11px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText('ह. क्र.', marginX + colRoll / 2, y + 19);
    ctx.textAlign = 'left';
    ctx.fillText('विद्यार्थ्याचे पूर्ण नाव', marginX + colRoll + 10, y + 19);
    ctx.textAlign = 'center';
    ctx.fillText('उपस्थिती स्थिती', marginX + colRoll + colName + colStatus / 2, y + 19);
    ctx.textAlign = 'left';
    ctx.fillText('शेरा / कारण', marginX + colRoll + colName + colStatus + 10, y + 19);

    y += headerH;

    pageStudents.forEach((student, idx) => {
      const entry = entries[student.id];
      if (idx % 2 === 1) {
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(marginX, y, contentW, rowH);
      }
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.strokeRect(marginX, y, contentW, rowH);

      // Vertical column dividers
      const x1 = marginX + colRoll;
      const x2 = x1 + colName;
      const x3 = x2 + colStatus;
      [x1, x2, x3].forEach((vx) => {
        ctx.beginPath();
        ctx.moveTo(vx, y);
        ctx.lineTo(vx, y + rowH);
        ctx.stroke();
      });

      ctx.fillStyle = '#0F172A';
      ctx.font = `500 11px ${MONO_STACK}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(student.rollNo), marginX + colRoll / 2, y + 18);

      ctx.font = `500 11.5px ${FONT_STACK}`;
      ctx.textAlign = 'left';
      ctx.fillText(truncateText(ctx, student.name, colName - 18), x1 + 10, y + 18);

      let statusText = 'नोंद बाकी';
      let statusColor = '#64748B';
      if (record?.isHoliday) {
        statusText = 'सुट्टी';
        statusColor = '#B45309';
      } else if (entry?.status === 'present') {
        statusText = 'हजर';
        statusColor = '#15803D';
      } else if (entry?.status === 'absent') {
        statusText = 'गैरहजर';
        statusColor = '#B91C1C';
      } else if (entry?.status === 'leave') {
        statusText = 'रजा';
        statusColor = '#B45309';
      }

      ctx.fillStyle = statusColor;
      ctx.font = `700 11px ${FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.fillText(statusText, x2 + colStatus / 2, y + 18);

      ctx.fillStyle = '#475569';
      ctx.font = `400 10.5px ${FONT_STACK}`;
      ctx.textAlign = 'left';
      ctx.fillText(
        truncateText(ctx, entry?.note || '-', colNote - 16),
        x3 + 10,
        y + 18
      );

      y += rowH;
    });

    if (pageIndex === pages.length - 1) {
      drawSignatureFooter(ctx, school, classroom.teacherName, pageW, pageH, marginX);
    }

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
  });

  const safeClass = `${classroom.standard}_${classroom.division}`.replace(/\s+/g, '_');
  pdf.save(`दैनंदिन_हजेरी_${safeClass}_${isoDate}.pdf`);
}

export async function downloadMonthlySummaryPdf(
  school: SchoolProfile,
  classroom: ClassRoom,
  year: number,
  monthIndex0: number,
  report: ComputedMonthlyReport
): Promise<void> {
  await ensureFontsLoaded();

  const pageW = 794;
  const pageH = 1123;
  const marginX = 40;
  const contentW = pageW - marginX * 2;
  const summaries = report.studentSummaries;

  const rowsPerFirstPage = 27;
  const rowsPerNextPage = 32;
  const pages: Array<typeof summaries> = [];
  if (summaries.length <= rowsPerFirstPage) {
    pages.push(summaries);
  } else {
    pages.push(summaries.slice(0, rowsPerFirstPage));
    let idx = rowsPerFirstPage;
    while (idx < summaries.length) {
      pages.push(summaries.slice(idx, idx + rowsPerNextPage));
      idx += rowsPerNextPage;
    }
  }
  if (pages.length === 0) pages.push([]);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const monthName = MARATHI_MONTHS[monthIndex0];
  const subtitle = `${classroom.standard} - तुकडी ${classroom.division}  ·  माह: ${monthName} ${year}  ·  वर्गशिक्षक: ${classroom.teacherName}  ·  एकूण विद्यार्थी: ${summaries.length}`;

  pages.forEach((pageRows, pageIndex) => {
    if (pageIndex > 0) pdf.addPage();
    const { canvas, ctx } = createHiDpiCanvas(pageW, pageH, 2);

    let y = drawSchoolHeader(
      ctx,
      school,
      `मासिक उपस्थिती संक्षिप्त अहवाल — ${monthName} ${year}`,
      subtitle,
      pageW,
      marginX,
      pageIndex + 1,
      pages.length
    );

    if (pageIndex === 0) {
      const boxW = contentW / 4;
      const boxes = [
        { label: 'एकूण कार्यदिवस', val: `${report.workingDays} दिवस`, color: '#0F172A' },
        { label: 'सरासरी उपस्थिती %', val: `${report.averagePercentage}%`, color: '#1D4ED8' },
        { label: 'नियमित (≥ ७५%)', val: `${report.regularCount} विद्यार्थी`, color: '#15803D' },
        {
          label: 'कमी उपस्थिती (< ७५%)',
          val: `${report.lowAttendanceCount} विद्यार्थी`,
          color: '#B91C1C',
        },
      ];

      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(marginX, y, contentW, 48);
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.strokeRect(marginX, y, contentW, 48);

      boxes.forEach((b, i) => {
        const bx = marginX + i * boxW;
        if (i > 0) {
          ctx.beginPath();
          ctx.moveTo(bx, y);
          ctx.lineTo(bx, y + 48);
          ctx.stroke();
        }
        ctx.fillStyle = '#475569';
        ctx.font = `500 10px ${FONT_STACK}`;
        ctx.textAlign = 'center';
        ctx.fillText(b.label, bx + boxW / 2, y + 17);

        ctx.fillStyle = b.color;
        ctx.font = `700 14px ${FONT_STACK}`;
        ctx.fillText(b.val, bx + boxW / 2, y + 38);
      });
      y += 62;
    }

    // Table columns
    const wRoll = 48;
    const wName = 240;
    const wWork = 68;
    const wPres = 62;
    const wAbs = 62;
    const wLeave = 58;
    const wPct = 76;
    const wStatus = contentW - (wRoll + wName + wWork + wPres + wAbs + wLeave + wPct);
    const headerH = 30;
    const rowH = 26;

    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(marginX, y, contentW, headerH);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    ctx.strokeRect(marginX, y, contentW, headerH);

    const cols = [
      { w: wRoll, label: 'ह.क्र.', align: 'center' as const },
      { w: wName, label: 'विद्यार्थ्याचे नाव', align: 'left' as const },
      { w: wWork, label: 'कार्यदिवस', align: 'center' as const },
      { w: wPres, label: 'हजर', align: 'center' as const },
      { w: wAbs, label: 'गैरहजर', align: 'center' as const },
      { w: wLeave, label: 'रजा', align: 'center' as const },
      { w: wPct, label: 'टक्केवारी', align: 'center' as const },
      { w: wStatus, label: 'स्थिती', align: 'center' as const },
    ];

    let cx = marginX;
    ctx.fillStyle = '#0F172A';
    ctx.font = `700 10.5px ${FONT_STACK}`;
    cols.forEach((c) => {
      ctx.textAlign = c.align;
      const tx = c.align === 'left' ? cx + 8 : cx + c.w / 2;
      ctx.fillText(c.label, tx, y + 19);
      cx += c.w;
    });
    y += headerH;

    pageRows.forEach((row, idx) => {
      const isLow = row.workingDays > 0 && row.percentage < 75;
      if (isLow) {
        ctx.fillStyle = '#FEF2F2';
        ctx.fillRect(marginX, y, contentW, rowH);
      } else if (idx % 2 === 1) {
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(marginX, y, contentW, rowH);
      }

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.strokeRect(marginX, y, contentW, rowH);

      let vx = marginX;
      for (let i = 0; i < cols.length - 1; i++) {
        vx += cols[i].w;
        ctx.beginPath();
        ctx.moveTo(vx, y);
        ctx.lineTo(vx, y + rowH);
        ctx.stroke();
      }

      let rx = marginX;
      ctx.fillStyle = '#0F172A';
      ctx.font = `500 10.5px ${MONO_STACK}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(row.student.rollNo), rx + wRoll / 2, y + 17);
      rx += wRoll;

      ctx.font = `500 11px ${FONT_STACK}`;
      ctx.textAlign = 'left';
      ctx.fillText(truncateText(ctx, row.student.name, wName - 14), rx + 8, y + 17);
      rx += wName;

      ctx.font = `500 10.5px ${MONO_STACK}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(row.workingDays), rx + wWork / 2, y + 17);
      rx += wWork;

      ctx.fillStyle = '#15803D';
      ctx.fillText(String(row.presentDays), rx + wPres / 2, y + 17);
      rx += wPres;

      ctx.fillStyle = '#B91C1C';
      ctx.fillText(String(row.absentDays), rx + wAbs / 2, y + 17);
      rx += wAbs;

      ctx.fillStyle = '#B45309';
      ctx.fillText(String(row.leaveDays), rx + wLeave / 2, y + 17);
      rx += wLeave;

      ctx.fillStyle = isLow ? '#B91C1C' : '#0F172A';
      ctx.font = `700 10.5px ${MONO_STACK}`;
      ctx.fillText(`${row.percentage}%`, rx + wPct / 2, y + 17);
      rx += wPct;

      ctx.font = `600 10px ${FONT_STACK}`;
      ctx.fillStyle = row.workingDays === 0 ? '#64748B' : isLow ? '#B91C1C' : '#15803D';
      const stLabel =
        row.workingDays === 0 ? '-' : isLow ? 'कमी उपस्थिती' : 'नियमित';
      ctx.fillText(stLabel, rx + wStatus / 2, y + 17);

      y += rowH;
    });

    if (pageIndex === pages.length - 1) {
      drawSignatureFooter(ctx, school, classroom.teacherName, pageW, pageH, marginX);
    }

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
  });

  const safeClass = `${classroom.standard}_${classroom.division}`.replace(/\s+/g, '_');
  pdf.save(`मासिक_संक्षिप्त_अहवाल_${safeClass}_${monthName}_${year}.pdf`);
}

export async function downloadMonthlyMusterGridPdf(
  school: SchoolProfile,
  classroom: ClassRoom,
  year: number,
  monthIndex0: number,
  records: Record<string, DayRecord>,
  report: ComputedMonthlyReport
): Promise<void> {
  await ensureFontsLoaded();

  const pageW = 1123;
  const pageH = 794;
  const marginX = 30;
  const contentW = pageW - marginX * 2;
  const daysInMonth = getDaysInMonth(year, monthIndex0);
  const summaries = report.studentSummaries;

  const rowsPerPage = 21;
  const pages: Array<typeof summaries> = [];
  for (let i = 0; i < summaries.length; i += rowsPerPage) {
    pages.push(summaries.slice(i, i + rowsPerPage));
  }
  if (pages.length === 0) pages.push([]);

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const monthName = MARATHI_MONTHS[monthIndex0];
  const subtitle = `${classroom.standard} - तुकडी ${classroom.division}  ·  मासिक हजेरी पत्रक: ${monthName} ${year}  ·  वर्गशिक्षक: ${classroom.teacherName}  ·  कार्यदिवस: ${report.workingDays}  ·  संकेत: ह=हजर, गै=गैरहजर, र=रजा, सु=सुट्टी`;

  pages.forEach((pageRows, pageIndex) => {
    if (pageIndex > 0) pdf.addPage();
    const { canvas, ctx } = createHiDpiCanvas(pageW, pageH, 2);

    let y = drawSchoolHeader(
      ctx,
      school,
      `मासिक विद्यार्थी हजेरी पत्रक (Muster Roll) — ${monthName} ${year}`,
      subtitle,
      pageW,
      marginX,
      pageIndex + 1,
      pages.length
    );

    const wRoll = 34;
    const wName = 164;
    const wTotals = 118; // एकूण हजर (38), गैर (38), % (42)
    const gridW = contentW - wRoll - wName - wTotals;
    const dayColW = gridW / daysInMonth;

    const headerH = 28;
    const rowH = 24;

    // Header Row
    ctx.fillStyle = '#F1F5F9';
    ctx.fillRect(marginX, y, contentW, headerH);
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1;
    ctx.strokeRect(marginX, y, contentW, headerH);

    ctx.fillStyle = '#0F172A';
    ctx.font = `700 10px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText('ह.क्र.', marginX + wRoll / 2, y + 18);

    ctx.textAlign = 'left';
    ctx.fillText('विद्यार्थ्याचे नाव', marginX + wRoll + 6, y + 18);

    // Day columns 1..daysInMonth
    for (let d = 1; d <= daysInMonth; d++) {
      const dx = marginX + wRoll + wName + (d - 1) * dayColW;
      const iso = formatIsoForDay(year, monthIndex0, d);
      const sun = isSunday(iso);
      if (sun) {
        ctx.fillStyle = '#FEF3C7';
        ctx.fillRect(dx, y, dayColW, headerH);
      }
      ctx.strokeStyle = '#94A3B8';
      ctx.beginPath();
      ctx.moveTo(dx, y);
      ctx.lineTo(dx, y + headerH);
      ctx.stroke();

      ctx.fillStyle = sun ? '#92400E' : '#0F172A';
      ctx.font = `700 9.5px ${MONO_STACK}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(d), dx + dayColW / 2, y + 18);
    }

    const tx = marginX + wRoll + wName + gridW;
    const wP = 38;
    const wA = 38;
    const wPct = wTotals - wP - wA;

    [tx, tx + wP, tx + wP + wA].forEach((vx) => {
      ctx.beginPath();
      ctx.moveTo(vx, y);
      ctx.lineTo(vx, y + headerH);
      ctx.stroke();
    });

    ctx.fillStyle = '#15803D';
    ctx.font = `700 10px ${FONT_STACK}`;
    ctx.textAlign = 'center';
    ctx.fillText('हजर', tx + wP / 2, y + 18);

    ctx.fillStyle = '#B91C1C';
    ctx.fillText('गैर', tx + wP + wA / 2, y + 18);

    ctx.fillStyle = '#0F172A';
    ctx.fillText('%', tx + wP + wA + wPct / 2, y + 18);

    y += headerH;

    // Student rows
    pageRows.forEach((summary, idx) => {
      if (idx % 2 === 1) {
        ctx.fillStyle = '#F8FAFC';
        ctx.fillRect(marginX, y, contentW, rowH);
      }

      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 1;
      ctx.strokeRect(marginX, y, contentW, rowH);

      ctx.fillStyle = '#0F172A';
      ctx.font = `500 9.5px ${MONO_STACK}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(summary.student.rollNo), marginX + wRoll / 2, y + 16);

      ctx.font = `500 10px ${FONT_STACK}`;
      ctx.textAlign = 'left';
      ctx.fillText(
        truncateText(ctx, summary.student.name, wName - 10),
        marginX + wRoll + 6,
        y + 16
      );

      for (let d = 1; d <= daysInMonth; d++) {
        const dx = marginX + wRoll + wName + (d - 1) * dayColW;
        const iso = formatIsoForDay(year, monthIndex0, d);
        const rec = records[makeRecordKey(classroom.id, iso)];
        const sun = isSunday(iso);

        if (rec?.isHoliday || sun) {
          ctx.fillStyle = '#FFFBEB';
          ctx.fillRect(dx, y, dayColW, rowH);
        }

        ctx.strokeStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.moveTo(dx, y);
        ctx.lineTo(dx, y + rowH);
        ctx.stroke();

        let code = '';
        let color = '#94A3B8';
        if (rec?.isHoliday) {
          code = 'सु';
          color = '#B45309';
        } else if (rec?.entries[summary.student.id]) {
          const st = rec.entries[summary.student.id].status;
          if (st === 'present') {
            code = 'ह';
            color = '#15803D';
          } else if (st === 'absent') {
            code = 'गै';
            color = '#B91C1C';
          } else if (st === 'leave') {
            code = 'र';
            color = '#B45309';
          }
        } else if (sun) {
          code = 'रवि';
          color = '#D97706';
        }

        if (code) {
          ctx.fillStyle = color;
          ctx.font = `700 9px ${FONT_STACK}`;
          ctx.textAlign = 'center';
          ctx.fillText(code, dx + dayColW / 2, y + 16);
        }
      }

      [tx, tx + wP, tx + wP + wA].forEach((vx) => {
        ctx.strokeStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.moveTo(vx, y);
        ctx.lineTo(vx, y + rowH);
        ctx.stroke();
      });

      ctx.font = `700 9.5px ${MONO_STACK}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#15803D';
      ctx.fillText(String(summary.presentDays), tx + wP / 2, y + 16);

      ctx.fillStyle = '#B91C1C';
      ctx.fillText(String(summary.absentDays), tx + wP + wA / 2, y + 16);

      ctx.fillStyle =
        summary.workingDays > 0 && summary.percentage < 75 ? '#B91C1C' : '#0F172A';
      ctx.fillText(`${summary.percentage}%`, tx + wP + wA + wPct / 2, y + 16);

      y += rowH;
    });

    if (pageIndex === pages.length - 1) {
      drawSignatureFooter(ctx, school, classroom.teacherName, pageW, pageH, marginX);
    }

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
  });

  const safeClass = `${classroom.standard}_${classroom.division}`.replace(/\s+/g, '_');
  pdf.save(`मासिक_हजेरी_पत्रक_${safeClass}_${monthName}_${year}.pdf`);
}

export function formatExportTimestamp(iso?: string): string {
  if (!iso) return '';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return `${formatShortDate(
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(
      dt.getDate()
    ).padStart(2, '0')}`
  )} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}
