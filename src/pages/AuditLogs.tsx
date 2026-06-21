import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Filter, RefreshCw, Shield } from 'lucide-react'
import { getLogs, type LogFilter, type LogAction } from '@/services/firebase/logs'
import { getManagers } from '@/services/firebase/users'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const ACTION_LABELS: Record<LogAction, { label: string; color: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'gold' }> = {
  create_church: { label: 'Criou Igreja', color: 'success' },
  update_church: { label: 'Editou Igreja', color: 'secondary' },
  delete_church: { label: 'Excluiu Igreja', color: 'destructive' },
  restore_church: { label: 'Restaurou Igreja', color: 'warning' },
  create_manager: { label: 'Criou Gestor', color: 'success' },
  update_manager: { label: 'Editou Gestor', color: 'secondary' },
  create_tithe: { label: 'Cadastrou Dizimista', color: 'success' },
  update_tithe: { label: 'Editou Dizimista', color: 'secondary' },
  transfer_tithe: { label: 'Transferiu Dizimista', color: 'warning' },
  set_donation: { label: 'Lançou Dízimo', color: 'gold' },
  create_expense: { label: 'Registrou Despesa', color: 'success' },
  update_expense: { label: 'Editou Despesa', color: 'secondary' },
  delete_expense: { label: 'Removeu Despesa', color: 'destructive' },
  create_task: { label: 'Criou Tarefa', color: 'success' },
  update_task: { label: 'Editou Tarefa', color: 'secondary' },
  delete_task: { label: 'Excluiu Tarefa', color: 'destructive' },
  toggle_task: { label: 'Concluiu Tarefa', color: 'outline' },
  update_settings: { label: 'Alterou Configurações', color: 'warning' },
  update_profile: { label: 'Atualizou Perfil', color: 'secondary' },
}

export function AuditLogs() {
  const [filter, setFilter] = useState<LogFilter>({})
  const [selectedUser, setSelectedUser] = useState('all')
  const [selectedAction, setSelectedAction] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')

  const { data: managers = [] } = useQuery({
    queryKey: ['managers'],
    queryFn: getManagers,
    staleTime: 1000 * 60 * 5,
  })

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', filter],
    queryFn: () => getLogs(filter, 100),
    staleTime: 0,
  })

  const logs = (data?.logs ?? []).filter(log => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      log.userDisplayName?.toLowerCase().includes(q) ||
      log.userEmail?.toLowerCase().includes(q) ||
      log.entityName?.toLowerCase().includes(q) ||
      log.details?.toLowerCase().includes(q)
    )
  })

  function applyFilters() {
    const f: LogFilter = {}
    if (selectedUser !== 'all') f.userId = selectedUser
    if (selectedAction !== 'all') f.action = selectedAction as LogAction
    if (dateFrom) f.dateFrom = new Date(dateFrom)
    if (dateTo) { const d = new Date(dateTo); d.setHours(23, 59, 59); f.dateTo = d }
    setFilter(f)
  }

  function clearFilters() {
    setSelectedUser('all')
    setSelectedAction('all')
    setDateFrom('')
    setDateTo('')
    setSearch('')
    setFilter({})
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Logs de Auditoria"
        description="Histórico completo de ações dos gestores"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />Atualizar
          </Button>
        }
      />

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Gestor</p>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os gestores</SelectItem>
                  {managers.map(m => <SelectItem key={m.uid} value={m.uid}>{m.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Ação</p>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {Object.entries(ACTION_LABELS).map(([key, val]) => (
                    <SelectItem key={key} value={key}>{val.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Data início</p>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Data fim</p>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={applyFilters} className="gap-1.5">
              <Filter className="w-3.5 h-3.5" />Filtrar
            </Button>
            <Button size="sm" variant="outline" onClick={clearFilters}>Limpar</Button>
            <div className="relative ml-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar nos resultados..."
                className="pl-8 h-9 text-sm w-48 sm:w-64"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Result count */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {logs.length} {logs.length === 1 ? 'registro encontrado' : 'registros encontrados'}
        </p>
      )}

      {/* Logs list */}
      {isLoading ? (
        <div className="p-8 text-center text-muted-foreground">Carregando logs...</div>
      ) : logs.length === 0 ? (
        <EmptyState icon={Shield} title="Nenhum log encontrado" description="As ações dos gestores aparecerão aqui." />
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const actionInfo = ACTION_LABELS[log.action]
            return (
              <div key={log.id} className="glass-card rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{log.userDisplayName}</span>
                      <span className="text-xs text-muted-foreground">{log.userEmail}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={actionInfo?.color ?? 'secondary'} className="text-xs">
                        {actionInfo?.label ?? log.action}
                      </Badge>
                      {log.entityName && (
                        <span className="text-sm text-foreground font-medium truncate">{log.entityName}</span>
                      )}
                      {log.details && (
                        <span className="text-xs text-muted-foreground italic">{log.details}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 sm:text-right">
                  {log.timestamp
                    ? format(log.timestamp.toDate(), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
                    : '—'}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
