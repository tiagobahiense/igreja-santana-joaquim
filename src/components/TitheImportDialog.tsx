import { useRef, useState } from 'react'
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { parseTitheCsv, summarizeTitheCsv, type ParsedTitheRow } from '@/lib/tithe-csv'
import { formatCurrency, MONTHS } from '@/lib/utils'
import { useImportTithes } from '@/hooks/use-tithes'

interface TitheImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  churchId: string
  defaultYear: number
  createdBy?: string
}

export function TitheImportDialog({
  open,
  onOpenChange,
  churchId,
  defaultYear,
  createdBy,
}: TitheImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const importTithes = useImportTithes()

  const [year, setYear] = useState(defaultYear)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<ParsedTitheRow[]>([])
  const [error, setError] = useState<string | null>(null)

  const summary = rows.length > 0 ? summarizeTitheCsv(rows) : null

  function reset() {
    setFileName(null)
    setRows([])
    setError(null)
    setYear(defaultYear)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setFileName(file.name)

    try {
      const content = await file.text()
      const parsed = parseTitheCsv(content)
      if (parsed.length === 0) {
        setError('Nenhum dizimista encontrado no arquivo. Verifique se há coluna "Nome" e linhas com dados.')
        setRows([])
        return
      }
      setRows(parsed)
    } catch (err) {
      setRows([])
      setError(err instanceof Error ? err.message : 'Erro ao ler o CSV.')
    }
  }

  async function handleImport() {
    if (!churchId || rows.length === 0) return

    await importTithes.mutateAsync({
      churchId,
      year,
      rows: rows.map(({ externalId, fullName, phone, donations }) => ({
        externalId,
        fullName,
        phone,
        donations,
      })),
      createdBy,
    })
    handleClose(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar Dízimos (CSV)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Colunas esperadas: Nome, Telefone, Janeiro–Dezembro, Total.
            IDs gerados automaticamente (DZ-0001, DZ-0002…) em ordem alfabética.
          </p>

          <div className="space-y-2">
            <Label>Ano dos dízimos</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[defaultYear - 1, defaultYear, defaultYear + 1].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm font-medium">
              {fileName ?? 'Clique para selecionar o arquivo CSV'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Formato .csv exportado da planilha</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {summary && (
            <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
              <p><strong>{summary.count}</strong> dizimista(s) encontrado(s)</p>
              <p>Total geral: <strong className="text-primary">{formatCurrency(summary.grandTotal)}</strong></p>
              <div className="grid grid-cols-3 gap-1 text-xs text-muted-foreground">
                {MONTHS.filter((m) => summary.monthTotals[m.key] > 0).map((m) => (
                  <span key={m.key}>{m.label}: {formatCurrency(summary.monthTotals[m.key])}</span>
                ))}
              </div>
              {rows.length > 0 && (
                <p className="text-xs text-muted-foreground pt-1 border-t">
                  Prévia: {rows.slice(0, 3).map((r) => r.fullName).join(', ')}
                  {rows.length > 3 ? ` e mais ${rows.length - 3}…` : ''}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!rows.length || importTithes.isPending}
            className="gold-gradient text-white"
          >
            {importTithes.isPending ? 'Importando…' : `Importar ${rows.length || ''} dizimista(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
