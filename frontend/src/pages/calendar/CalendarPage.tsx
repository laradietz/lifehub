import { ChevronLeft, ChevronRight, MapPin, Pencil, Plus, Trash2 } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Skeleton } from "@/components/ui/Skeleton"
import { useCategories } from "@/hooks/useCategories"
import { useHouseholds } from "@/hooks/useHouseholds"
import { extractErrorMessage } from "@/services/api"
import { eventService } from "@/services/eventService"
import { EventFormModal } from "@/pages/calendar/EventFormModal"
import { toast } from "@/store/toastStore"
import type { Event, EventPayload } from "@/types/event"
import { WEEKDAY_LABELS, buildMonthGrid, dateKey, dateKeyFromIso, formatMonthLabel, formatTime } from "@/utils/calendar"
import { cn } from "@/utils/cn"

const TODAY_KEY = dateKey(new Date())

export function CalendarPage() {
  const { categories } = useCategories("event")
  const { households } = useHouseholds()
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(TODAY_KEY)
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [deletingEvent, setDeletingEvent] = useState<Event | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const gridDays = useMemo(() => buildMonthGrid(currentMonth), [currentMonth])

  async function loadEvents() {
    setIsLoading(true)
    setError(null)
    try {
      const gridStart = gridDays[0]
      const gridEnd = gridDays[gridDays.length - 1]
      const data = await eventService.list({
        start_after: new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate()).toISOString(),
        start_before: new Date(
          gridEnd.getFullYear(),
          gridEnd.getMonth(),
          gridEnd.getDate(),
          23,
          59,
          59,
        ).toISOString(),
      })
      setEvents(data)
    } catch (err) {
      setError(extractErrorMessage(err, "No pudimos cargar el calendario."))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>()
    for (const event of events) {
      const key = dateKeyFromIso(event.start_at)
      const list = map.get(key) ?? []
      list.push(event)
      map.set(key, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.start_at.localeCompare(b.start_at))
    }
    return map
  }, [events])

  const selectedEvents = eventsByDay.get(selectedDate) ?? []
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories])

  function categoryLabel(event: Event): string | null {
    if (!event.category_id) return null
    return categoryById.get(event.category_id)?.name ?? null
  }

  function householdLabel(event: Event): string | null {
    if (!event.household_id) return null
    return households.find((household) => household.id === event.household_id)?.name ?? null
  }

  async function handleCreateOrUpdate(payload: EventPayload) {
    if (editingEvent) {
      await eventService.update(editingEvent.id, payload)
      toast.success("Evento actualizado.")
    } else {
      await eventService.create(payload)
      toast.success("Evento creado.")
    }
    await loadEvents()
  }

  async function handleDelete() {
    if (!deletingEvent) return
    setIsDeleting(true)
    try {
      await eventService.remove(deletingEvent.id)
      setDeletingEvent(null)
      toast.success("Evento eliminado.")
      await loadEvents()
    } catch (err) {
      toast.error(extractErrorMessage(err, "No pudimos eliminar el evento."))
    } finally {
      setIsDeleting(false)
    }
  }

  function goToToday() {
    const now = new Date()
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
    setSelectedDate(TODAY_KEY)
  }

  function shiftMonth(delta: number) {
    setCurrentMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Calendario</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Tus eventos, personales y de hogar.</p>
        </div>
        <Button
          onClick={() => {
            setEditingEvent(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="size-4" aria-hidden="true" />
          Nuevo evento
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Hoy
          </Button>
        </div>
        <h2 className="text-lg font-semibold capitalize text-slate-900 dark:text-slate-100">
          {formatMonthLabel(currentMonth)}
        </h2>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <Card className="overflow-hidden p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500 dark:text-slate-400">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-1">
              {label}
            </div>
          ))}
        </div>
        {isLoading ? (
          <div className="grid grid-cols-7 gap-1 py-1">
            {Array.from({ length: 42 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1 py-1">
            {gridDays.map((day) => {
              const key = dateKey(day)
              const inCurrentMonth = day.getMonth() === currentMonth.getMonth()
              const dayEvents = eventsByDay.get(key) ?? []
              const isSelected = key === selectedDate
              const isToday = key === TODAY_KEY

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(key)}
                  className={cn(
                    "focus-ring flex h-16 flex-col items-start gap-0.5 rounded-lg border px-1.5 py-1 text-left transition-colors sm:h-20",
                    isSelected
                      ? "border-brand-500 bg-brand-50 dark:border-brand-500 dark:bg-brand-950/40"
                      : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800",
                    !inCurrentMonth && "opacity-40",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-xs font-medium",
                      isToday
                        ? "bg-brand-600 text-white"
                        : "text-slate-700 dark:text-slate-300",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <div className="flex w-full flex-col gap-0.5 overflow-hidden">
                    {dayEvents.slice(0, 2).map((event) => (
                      <span
                        key={event.id}
                        className="truncate rounded bg-slate-200 px-1 text-[10px] leading-4 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                      >
                        {event.title}
                      </span>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="text-[10px] leading-4 text-slate-500 dark:text-slate-400">
                        +{dayEvents.length - 2} más
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      <Card className="px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold capitalize text-slate-900 dark:text-slate-100">
            {selectedDateLabel}
          </h3>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setEditingEvent(null)
              setIsFormOpen(true)
            }}
          >
            <Plus className="size-4" aria-hidden="true" />
            Evento este día
          </Button>
        </div>

        {selectedEvents.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No hay eventos este día.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {selectedEvents.map((event) => (
              <li
                key={event.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{event.title}</span>
                    {!event.all_day && (
                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatTime(event.start_at)}</span>
                    )}
                    {event.all_day && <Badge tone="blue">Todo el día</Badge>}
                    {categoryLabel(event) && <Badge tone="slate">{categoryLabel(event)}</Badge>}
                    {householdLabel(event) && <Badge tone="violet">{householdLabel(event)}</Badge>}
                  </div>
                  {event.location && (
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {event.location}
                    </span>
                  )}
                  {event.description && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">{event.description}</span>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Editar evento"
                    onClick={() => {
                      setEditingEvent(event)
                      setIsFormOpen(true)
                    }}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                  </Button>
                  <Button size="sm" variant="ghost" aria-label="Eliminar evento" onClick={() => setDeletingEvent(event)}>
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <EventFormModal
        isOpen={isFormOpen}
        event={editingEvent}
        defaultDate={selectedDate}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleCreateOrUpdate}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingEvent)}
        title="Eliminar evento"
        description={`¿Seguro que querés eliminar "${deletingEvent?.title}"? Esta acción no se puede deshacer.`}
        isConfirming={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeletingEvent(null)}
      />
    </div>
  )
}
