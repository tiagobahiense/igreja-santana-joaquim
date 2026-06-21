import { Link } from 'react-router-dom'
import { format, isToday, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, Clock, ChevronRight } from 'lucide-react'
import { useUpcomingEvents } from '@/hooks/use-events'
import { AuthorTag } from '@/components/AuthorTag'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ParishEvent } from '@/types'

function dayLabel(date: Date) {
  if (isToday(date)) return 'Hoje'
  if (isTomorrow(date)) return 'Amanhã'
  return format(date, "dd/MM", { locale: ptBR })
}

export function UpcomingEventsPanel({ limit = 5 }: { limit?: number }) {
  const { data: events = [], isLoading } = useUpcomingEvents(21)

  const upcoming = events.slice(0, limit)

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary" />
          Próximos eventos
        </CardTitle>
        <Link to="/agenda" className="text-xs text-primary hover:underline flex items-center gap-0.5">
          Ver agenda <ChevronRight className="w-3 h-3" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
        ) : upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhum evento nos próximos dias.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((e: ParishEvent) => (
              <li key={e.id} className="flex items-start gap-3 rounded-lg border p-2.5">
                <div className="shrink-0 text-center min-w-[52px]">
                  <p className="text-[10px] uppercase text-muted-foreground font-medium">
                    {dayLabel(e.startAt.toDate())}
                  </p>
                  <p className="text-xs font-semibold flex items-center justify-center gap-0.5 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {format(e.startAt.toDate(), 'HH:mm')}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{e.title}</p>
                  {e.description && (
                    <p className="text-xs text-muted-foreground truncate">{e.description}</p>
                  )}
                  <AuthorTag userId={e.createdBy} className="mt-1" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
