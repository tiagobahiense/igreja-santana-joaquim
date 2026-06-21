import { useMemo, useState } from 'react'
import {
  Building2,
  Plus,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  ExternalLink,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react'
import { useExpenses } from '@/hooks/use-expenses'
import { AuthorTag } from '@/components/AuthorTag'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { Church, Expense, FinancialEntryType } from '@/types'

const PREVIEW_COUNT = 4

interface ChurchFinanceCardProps {
  church: Church
  onAdd: (churchId: string, type: FinancialEntryType) => void
  onEdit: (expense: Expense) => void
  onDelete: (expense: Expense) => void
}

export function ChurchFinanceCard({ church, onAdd, onEdit, onDelete }: ChurchFinanceCardProps) {
  const { data: result, isLoading } = useExpenses({ churchId: church.id })
  const [expanded, setExpanded] = useState(false)

  const entries = result?.expenses ?? []

  const { totalIncome, totalExpense, balance } = useMemo(() => {
    let income = 0
    let expense = 0
    for (const e of entries) {
      if ((e.type ?? 'expense') === 'income') income += e.amount
      else expense += e.amount
    }
    return { totalIncome: income, totalExpense: expense, balance: income - expense }
  }, [entries])

  const visibleEntries = expanded ? entries : entries.slice(0, PREVIEW_COUNT)
  const hasMore = entries.length > PREVIEW_COUNT

  return (
    <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="church-gradient px-4 py-3 text-white">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Building2 className="w-5 h-5 text-yellow-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm leading-tight truncate">{church.name}</h3>
            {church.address && (
              <p className="text-[11px] text-white/60 mt-0.5 truncate">{church.address}</p>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 divide-x divide-border border-b border-border/60 bg-muted/20">
        <div className="px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-green-600 mb-0.5">
            <TrendingUp className="w-3 h-3" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Entradas</span>
          </div>
          <p className="text-sm font-bold text-green-700">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="px-3 py-2.5 text-center">
          <div className="flex items-center justify-center gap-1 text-red-600 mb-0.5">
            <TrendingDown className="w-3 h-3" />
            <span className="text-[10px] font-medium uppercase tracking-wide">Saídas</span>
          </div>
          <p className="text-sm font-bold text-red-700">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="px-3 py-2.5 text-center">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">Saldo</p>
          <p className={cn('text-sm font-bold', balance >= 0 ? 'text-primary' : 'text-destructive')}>
            {balance >= 0 ? '+' : '−'}{formatCurrency(Math.abs(balance))}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 p-3 border-b border-border/60">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1.5 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
          onClick={() => onAdd(church.id, 'income')}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          Entrada
        </Button>
        <Button
          size="sm"
          className="flex-1 gap-1.5 gold-gradient text-white"
          onClick={() => onAdd(church.id, 'expense')}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Despesa
        </Button>
      </div>

      {/* Entries list */}
      <div className="flex-1 p-3 min-h-[160px]">
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-6">Carregando...</p>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 px-4 rounded-xl border-2 border-dashed border-border/80 bg-muted/10">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Nenhum lançamento nesta igreja
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onAdd(church.id, 'income')}>
                <Plus className="w-3 h-3" />Entrada
              </Button>
              <Button size="sm" className="h-7 text-xs gap-1 gold-gradient text-white" onClick={() => onAdd(church.id, 'expense')}>
                <Plus className="w-3 h-3" />Despesa
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleEntries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                onEdit={() => onEdit(entry)}
                onDelete={() => onDelete(entry)}
              />
            ))}
            {hasMore && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-7 text-xs text-muted-foreground"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? (
                  <>Ver menos <ChevronUp className="w-3 h-3 ml-1" /></>
                ) : (
                  <>Ver todos ({entries.length}) <ChevronDown className="w-3 h-3 ml-1" /></>
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function EntryRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: Expense
  onEdit: () => void
  onDelete: () => void
}) {
  const isIncome = (entry.type ?? 'expense') === 'income'

  return (
    <div
      className={cn(
        'rounded-lg px-3 py-2 flex items-start gap-2 border-l-[3px] bg-background/60 hover:bg-muted/30 transition-colors group',
        isIncome ? 'border-l-green-500' : 'border-l-red-500',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge
            variant={isIncome ? 'success' : 'destructive'}
            className="text-[10px] px-1.5 py-0 h-4"
          >
            {isIncome ? 'Entrada' : 'Saída'}
          </Badge>
          <span className="text-xs font-medium truncate">{entry.category}</span>
          {entry.subcategory && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{entry.subcategory}</Badge>
          )}
          {entry.isRecurring && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-0.5">
              <RefreshCw className="w-2 h-2" />
              {entry.recurrenceRule === 'monthly' ? 'Mensal' : 'Anual'}
            </Badge>
          )}
        </div>
        {entry.description && (
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">{entry.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className={cn('text-sm font-bold', isIncome ? 'text-green-700' : 'text-red-700')}>
            {isIncome ? '+' : '−'}{formatCurrency(entry.amount)}
          </span>
          <span className="text-[10px] text-muted-foreground">{formatDate(entry.date.toDate())}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{entry.paymentMethod}</Badge>
          <AuthorTag userId={entry.createdBy} />
          {entry.receiptLink && (
            <a href={entry.receiptLink} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 flex items-center gap-0.5 hover:underline">
              <ExternalLink className="w-2.5 h-2.5" />Comprovante
            </a>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}>
          <Pencil className="w-3 h-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onDelete}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  )
}
