import { MONTHS, parseCurrencyToInt, type MonthKey } from '@/lib/utils'

export interface ParsedTitheRow {
  externalId: string
  fullName: string
  phone?: string
  donations: Partial<Record<MonthKey, number>>
  totalCents: number
}

const CSV_MONTH_MAP: Record<string, MonthKey> = {
  janeiro: 'jan',
  fevereiro: 'feb',
  marco: 'mar',
  março: 'mar',
  abril: 'apr',
  maio: 'may',
  junho: 'jun',
  julho: 'jul',
  agosto: 'aug',
  setembro: 'sep',
  outubro: 'oct',
  novembro: 'nov',
  dezembro: 'dec',
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  cells.push(current.trim())
  return cells
}

function parseCsvContent(content: string): string[][] {
  return content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine)
}

export function parseTitheCsv(content: string): ParsedTitheRow[] {
  const rows = parseCsvContent(content)
  if (rows.length < 2) return []

  const headers = rows[0].map(normalizeHeader)
  const nameIdx = headers.findIndex((h) => h === 'nome' || h === 'name')
  if (nameIdx === -1) {
    throw new Error('Coluna "Nome" não encontrada no CSV.')
  }

  const idIdx = headers.findIndex((h) => h === 'identificador' || h === 'id')
  const phoneIdx = headers.findIndex((h) => h === 'telefone' || h === 'phone')
  const totalIdx = headers.findIndex((h) => h === 'total')

  const monthColumns = headers
    .map((header, index) => {
      const key = CSV_MONTH_MAP[header] ?? CSV_MONTH_MAP[header.replace(/ç/g, 'c')]
      return key ? { index, key } : null
    })
    .filter((col): col is { index: number; key: MonthKey } => col !== null)

  if (monthColumns.length === 0) {
    throw new Error('Nenhuma coluna de mês reconhecida (Janeiro, Fevereiro, etc.).')
  }

  const parsed: ParsedTitheRow[] = []

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
    const cells = rows[rowIndex]
    const fullName = (cells[nameIdx] ?? '').trim()
    if (!fullName) continue

    const donations: Partial<Record<MonthKey, number>> = {}
    let totalCents = 0

    for (const { index, key } of monthColumns) {
      const raw = cells[index] ?? ''
      if (!raw.trim()) continue
      const cents = parseCurrencyToInt(raw)
      if (cents > 0) {
        donations[key] = cents
        totalCents += cents
      }
    }

    const rawId = idIdx >= 0 ? (cells[idIdx] ?? '').trim() : ''

    parsed.push({
      externalId: rawId,
      fullName,
      phone: phoneIdx >= 0 ? (cells[phoneIdx] ?? '').trim() || undefined : undefined,
      donations,
      totalCents: totalCents > 0 ? totalCents : (totalIdx >= 0 ? parseCurrencyToInt(cells[totalIdx] ?? '0') : 0),
    })
  }

  parsed.sort((a, b) => a.fullName.localeCompare(b.fullName, 'pt-BR'))

  let autoId = 1
  for (const row of parsed) {
    if (!row.externalId) {
      row.externalId = `DZ-${String(autoId++).padStart(4, '0')}`
    }
  }

  return parsed
}

export function summarizeTitheCsv(rows: ParsedTitheRow[]) {
  const monthTotals = MONTHS.reduce((acc, m) => {
    acc[m.key] = rows.reduce((sum, row) => sum + (row.donations[m.key] ?? 0), 0)
    return acc
  }, {} as Record<MonthKey, number>)

  const grandTotal = rows.reduce((sum, row) => sum + row.totalCents, 0)

  return { monthTotals, grandTotal, count: rows.length }
}
