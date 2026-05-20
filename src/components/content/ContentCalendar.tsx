import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  CalendarDays
} from 'lucide-react'
import { useStore } from '@/store'
import { cn } from '@/utils/cn'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'

export default function ContentCalendar() {
  const { contentPieces } = useStore()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date())

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(monthStart)
  const startDate = startOfWeek(monthStart)
  const endDate = endOfWeek(monthEnd)

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  })

  const piecesForDay = (day: Date) => {
    return contentPieces.filter(p => p.scheduledDate && isSameDay(new Date(p.scheduledDate), day))
  }

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Calendar Grid */}
      <div className="lg:col-span-8 bg-card border border-border/50 rounded-3xl overflow-hidden shadow-xl">
        <div className="p-6 border-b border-border/50 flex items-center justify-between bg-accent/5">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-primary/10 rounded-xl text-primary">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              {format(currentDate, 'MMMM yyyy')}
            </h2>
          </div>
          <div className="flex items-center gap-2 bg-background/50 p-1 rounded-xl border border-border/50">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 text-xs font-bold hover:bg-accent rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-border/50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            const dayPieces = piecesForDay(day)
            const isSelected = selectedDay && isSameDay(day, selectedDay)
            const isToday = isSameDay(day, new Date())
            const isCurrentMonth = isSameMonth(day, monthStart)

            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDay(day)}
                className={cn(
                  "relative h-32 p-2 border-r border-b border-border/40 text-left transition-all hover:bg-accent/30 group",
                  !isCurrentMonth && "bg-accent/5 opacity-40",
                  isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/20",
                  idx % 7 === 6 && "border-r-0"
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={cn(
                    "text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors",
                    isToday ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {dayPieces.length > 0 && (
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                      {dayPieces.length}
                    </span>
                  )}
                </div>
                
                <div className="space-y-1 overflow-hidden">
                  {dayPieces.slice(0, 2).map((piece) => (
                    <div 
                      key={piece.id}
                      className={cn(
                        "text-[9px] font-bold p-1 rounded-md border truncate transition-all",
                        piece.status === 'published' ? "bg-green-500/10 border-green-500/20 text-green-600" :
                        piece.status === 'scheduled' ? "bg-blue-500/10 border-blue-500/20 text-blue-600" :
                        "bg-orange-500/10 border-orange-500/20 text-orange-600"
                      )}
                    >
                      {piece.title}
                    </div>
                  ))}
                  {dayPieces.length > 2 && (
                    <div className="text-[8px] font-bold text-muted-foreground pl-1">
                      + {dayPieces.length - 2} more
                    </div>
                  )}
                </div>

                {isSelected && (
                  <motion.div 
                    layoutId="day-highlight"
                    className="absolute inset-0 border-2 border-primary/50 pointer-events-none rounded-sm z-10"
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Side Detail Panel */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-xl sticky top-24">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent rounded-xl text-accent-foreground">
                <CalendarDays className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-lg">
                {selectedDay ? format(selectedDay, 'MMM d, yyyy') : 'Select a date'}
              </h3>
            </div>
            <button className="p-2 hover:bg-accent rounded-full transition-colors">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {selectedDay && piecesForDay(selectedDay).length > 0 ? (
                piecesForDay(selectedDay).map((piece, idx) => (
                  <motion.div
                    key={piece.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="group bg-accent/30 hover:bg-accent/50 p-4 rounded-2xl border border-border/50 transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                        piece.type === 'blog' ? "text-purple-500 border-purple-500/20 bg-purple-500/5" :
                        piece.type === 'social' ? "text-blue-500 border-blue-500/20 bg-blue-500/5" :
                        "text-orange-500 border-orange-500/20 bg-orange-500/5"
                      )}>
                        {piece.type}
                      </span>
                      <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-background rounded-lg transition-all">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    <h4 className="font-bold text-sm mb-3 group-hover:text-primary transition-colors line-clamp-2">
                      {piece.title}
                    </h4>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {format(new Date(piece.scheduledDate!), 'HH:mm')}
                      </div>
                      <div className="flex items-center gap-1">
                        {piece.status === 'published' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
                        )}
                        <span className="capitalize">{piece.status}</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-accent/30 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-border">
                    <CalendarDays className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No content scheduled</p>
                  <button className="mt-4 text-xs font-bold text-primary hover:underline">
                    Schedule New Piece
                  </button>
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-8 pt-8 border-t border-border/50">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Sync Status</h4>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-medium">Google Calendar Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
