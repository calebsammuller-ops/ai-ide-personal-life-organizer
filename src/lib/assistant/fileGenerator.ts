import ExcelJS from 'exceljs'

interface GanttTask {
  name: string
  startDate: string
  endDate: string
  status?: string
  priority?: number
  category?: string
}

interface SpreadsheetData {
  title: string
  headers: string[]
  rows: (string | number | boolean)[][]
}

export async function generateExcelGanttChart(
  tasks: GanttTask[],
  title: string = 'Task Gantt Chart'
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'LockIN Life Organizer'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Gantt Chart')

  // Find date range
  const allDates = tasks.flatMap((t) => [new Date(t.startDate), new Date(t.endDate)])
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())))
  const dayCount = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)) + 1

  // Build columns: Task Name, Status, then one column per day
  const columns: Partial<ExcelJS.Column>[] = [
    { header: 'Task', key: 'task', width: 30 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Priority', key: 'priority', width: 10 },
  ]

  for (let d = 0; d < Math.min(dayCount, 60); d++) {
    const date = new Date(minDate)
    date.setDate(date.getDate() + d)
    const label = `${date.getMonth() + 1}/${date.getDate()}`
    columns.push({ header: label, key: `day_${d}`, width: 6 })
  }

  sheet.columns = columns

  // Style header row
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }
  headerRow.alignment = { horizontal: 'center' }

  // Add task rows
  for (const task of tasks) {
    const row: Record<string, string | number> = {
      task: task.name,
      status: task.status || 'pending',
      priority: task.priority || 3,
    }

    const taskStart = new Date(task.startDate)
    const taskEnd = new Date(task.endDate)

    for (let d = 0; d < Math.min(dayCount, 60); d++) {
      const date = new Date(minDate)
      date.setDate(date.getDate() + d)
      if (date >= taskStart && date <= taskEnd) {
        row[`day_${d}`] = '█'
      }
    }

    const addedRow = sheet.addRow(row)

    // Color the gantt bar cells
    for (let d = 0; d < Math.min(dayCount, 60); d++) {
      const date = new Date(minDate)
      date.setDate(date.getDate() + d)
      if (date >= taskStart && date <= taskEnd) {
        const cell = addedRow.getCell(`day_${d}`)
        const color = task.status === 'completed' ? 'FF22C55E' : task.priority && task.priority <= 2 ? 'FFEF4444' : 'FF8B5CF6'
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
        cell.font = { color: { argb: color } }
        cell.alignment = { horizontal: 'center' }
      }
    }
  }

  // Title
  sheet.insertRow(1, [title])
  sheet.mergeCells(1, 1, 1, 3)
  const titleRow = sheet.getRow(1)
  titleRow.font = { bold: true, size: 14, color: { argb: 'FF1E293B' } }

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    filename: `gantt-chart-${Date.now()}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
}

export async function generateExcelSpreadsheet(
  data: SpreadsheetData
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'LockIN Life Organizer'
  const sheet = workbook.addWorksheet(data.title)

  sheet.columns = data.headers.map((h) => ({ header: h, key: h, width: 20 }))

  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } }

  for (const row of data.rows) {
    const obj: Record<string, string | number | boolean> = {}
    data.headers.forEach((h, i) => { obj[h] = row[i] })
    sheet.addRow(obj)
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer()
  return {
    buffer: Buffer.from(arrayBuffer),
    filename: `${data.title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }
}

export function generateCSV(
  headers: string[],
  rows: (string | number | boolean)[][],
  title: string = 'export'
): { buffer: Buffer; filename: string; mimeType: string } {
  const csvLines = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => {
      const str = String(cell)
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
    }).join(',')),
  ]

  return {
    buffer: Buffer.from(csvLines.join('\n'), 'utf-8'),
    filename: `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.csv`,
    mimeType: 'text/csv',
  }
}

export async function generatePDFReport(
  title: string,
  sections: { heading: string; content: string }[]
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  // Use dynamic import for jspdf since it has ESM issues in some environments
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF()

  // Title
  doc.setFontSize(20)
  doc.setTextColor(59, 130, 246) // blue-500
  doc.text(title, 20, 25)

  // Date
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 33)

  // Line
  doc.setDrawColor(59, 130, 246)
  doc.setLineWidth(0.5)
  doc.line(20, 36, 190, 36)

  let y = 45

  for (const section of sections) {
    if (y > 270) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(14)
    doc.setTextColor(30, 41, 59) // slate-800
    doc.text(section.heading, 20, y)
    y += 8

    doc.setFontSize(10)
    doc.setTextColor(71, 85, 105) // slate-500
    const lines = doc.splitTextToSize(section.content, 170)
    doc.text(lines, 20, y)
    y += lines.length * 5 + 10
  }

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150)
    doc.text(`LockIN Life Organizer | Page ${i} of ${pageCount}`, 20, 287)
  }

  const arrayBuffer = doc.output('arraybuffer')
  return {
    buffer: Buffer.from(arrayBuffer),
    filename: `${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.pdf`,
    mimeType: 'application/pdf',
  }
}
