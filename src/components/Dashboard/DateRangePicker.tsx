import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, addMonths, subMonths, startOfMonth, endOfMonth, isSameDay, isWithinInterval, isBefore, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}

export const DateRangePicker = ({ value, onChange }: DateRangePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectionState, setSelectionState] = useState<{ from: Date | null; to: Date | null }>({
    from: null,
    to: null,
  });
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Don't pre-select, just show current applied range visually if exists
      setSelectionState({
        from: null,
        to: null,
      });
      setHoveredDay(null);
    }
  }, [isOpen]);

  const handleDayClick = (day: Date) => {
    const clickedDay = startOfDay(day);
    
    // Check if clicking outside existing range - if so, reset
    if (selectionState.from && selectionState.to) {
      const isOutsideRange = isBefore(clickedDay, selectionState.from) || isAfter(clickedDay, selectionState.to);
      if (isOutsideRange) {
        // Reset and start new selection
        setSelectionState({ from: clickedDay, to: null });
        setHoveredDay(null);
        return;
      }
    }
    
    if (!selectionState.from) {
      // First click
      setSelectionState({ from: clickedDay, to: null });
      setHoveredDay(null);
    } else if (!selectionState.to) {
      // Second click - auto-order the range
      if (isSameDay(clickedDay, selectionState.from)) {
        // Same day clicked - keep single day selection
        setSelectionState({ from: clickedDay, to: clickedDay });
      } else {
        // Different day - create range with auto-ordering
        if (isBefore(clickedDay, selectionState.from)) {
          setSelectionState({ from: clickedDay, to: selectionState.from });
        } else {
          setSelectionState({ from: selectionState.from, to: clickedDay });
        }
      }
      setHoveredDay(null);
    } else {
      // Already have a range, clicking within - reset and start new
      setSelectionState({ from: clickedDay, to: null });
      setHoveredDay(null);
    }
  };

  const handleDayHover = (day: Date | null) => {
    if (selectionState.from && !selectionState.to) {
      setHoveredDay(day);
    }
  };

  const handleQuickAction = (days: number | "today") => {
    const today = new Date();
    let from: Date, to: Date;
    
    if (days === "today") {
      from = startOfDay(today);
      to = startOfDay(today);
    } else {
      from = startOfDay(subDays(today, days - 1));
      to = startOfDay(today);
    }
    
    // Preview the range immediately
    setSelectionState({ from, to });
    setHoveredDay(null);
  };

  const handleApply = () => {
    if (selectionState.from) {
      onChange({
        from: startOfDay(selectionState.from),
        to: endOfDay(selectionState.to || selectionState.from),
      });
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setSelectionState({
      from: value?.from || null,
      to: value?.to || null,
    });
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    
    const weeks: (Date | null)[][] = [];
    let days: (Date | null)[] = [];
    let day = new Date(monthStart);
    
    // Add empty cells for days before the start of the month
    const firstDayOfWeek = day.getDay();
    const daysFromPrevMonth = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    for (let i = 0; i < daysFromPrevMonth; i++) {
      days.push(null);
    }

    // Add days of current month only
    while (day <= monthEnd) {
      days.push(new Date(day));
      if (days.length === 7) {
        weeks.push(days);
        days = [];
      }
      day.setDate(day.getDate() + 1);
    }

    // Add empty cells to complete the last week
    if (days.length > 0) {
      while (days.length < 7) {
        days.push(null);
      }
      weeks.push(days);
    }

    return weeks;
  };

  const isDayInRange = (day: Date) => {
    // Show actual selected range
    if (selectionState.from && selectionState.to) {
      return isWithinInterval(day, { start: selectionState.from, end: selectionState.to });
    }
    
    // Show preview range on hover
    if (selectionState.from && hoveredDay && !selectionState.to) {
      const start = isBefore(selectionState.from, hoveredDay) ? selectionState.from : hoveredDay;
      const end = isBefore(selectionState.from, hoveredDay) ? hoveredDay : selectionState.from;
      return isWithinInterval(day, { start, end });
    }
    
    return false;
  };

  const isDaySelected = (day: Date) => {
    if (!selectionState.from) return false;
    if (isSameDay(day, selectionState.from)) return true;
    if (selectionState.to && isSameDay(day, selectionState.to)) return true;
    
    // Show preview end on hover
    if (hoveredDay && !selectionState.to && isSameDay(day, hoveredDay)) return true;
    
    return false;
  };

  const isOutsideRange = (day: Date) => {
    if (!selectionState.from || !selectionState.to) return false;
    return isBefore(day, selectionState.from) || isAfter(day, selectionState.to);
  };

  const formatDateRange = () => {
    if (!value?.from) return "Sélectionner une période";
    if (!value?.to || isSameDay(value.from, value.to)) {
      return format(value.from, "dd/MM/yyyy", { locale: fr });
    }
    return `${format(value.from, "dd/MM/yyyy")} - ${format(value.to, "dd/MM/yyyy")}`;
  };

  const weeks = renderCalendar();

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarIcon className="w-4 h-4" />
          {formatDateRange()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-border/30 shadow-2xl max-h-[80vh] overflow-auto" align="start" style={{ backgroundColor: '#0F1525' }}>
        <div className="flex flex-col md:flex-row rounded-lg overflow-hidden max-w-[620px]">
          {/* Quick Actions */}
          <div className="border-r md:border-b-0 border-b px-3 md:px-4 py-2 md:py-3 space-y-0.5 md:space-y-1 w-full md:w-[180px] flex md:flex-col gap-2 md:gap-0" style={{ backgroundColor: '#121A2B', borderColor: 'rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => handleQuickAction("today")}
              className="flex-1 md:w-full text-left px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm rounded hover:bg-white/5 transition-colors"
              style={{ color: '#A9B4D0' }}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => handleQuickAction(7)}
              className="flex-1 md:w-full text-left px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm rounded hover:bg-white/5 transition-colors"
              style={{ color: '#A9B4D0' }}
            >
              7 jours
            </button>
            <button
              onClick={() => handleQuickAction(30)}
              className="flex-1 md:w-full text-left px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm rounded hover:bg-white/5 transition-colors"
              style={{ color: '#A9B4D0' }}
            >
              30 jours
            </button>
            <button
              onClick={() => handleQuickAction(90)}
              className="flex-1 md:w-full text-left px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm rounded hover:bg-white/5 transition-colors"
              style={{ color: '#A9B4D0' }}
            >
              90 jours
            </button>
          </div>

          {/* Calendar */}
          <div className="p-3 md:p-4" style={{ backgroundColor: '#121A2B' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 md:p-1.5 hover:bg-white/5 rounded transition-colors"
                aria-label="Mois précédent"
                style={{ color: '#E6ECFF' }}
              >
                <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
              </button>
              <div className="text-xs md:text-sm font-semibold capitalize" style={{ color: '#E6ECFF' }}>
                {format(currentMonth, "MMMM yyyy", { locale: fr })}
              </div>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 md:p-1.5 hover:bg-white/5 rounded transition-colors"
                aria-label="Mois suivant"
                style={{ color: '#E6ECFF' }}
              >
                <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-0.5 md:gap-1 mb-1 md:mb-2">
              {["lu", "ma", "me", "je", "ve", "sa", "di"].map((day) => (
                <div key={day} className="text-center text-[10px] md:text-xs font-medium py-0.5 md:py-1 w-7 md:w-9" style={{ color: '#A9B4D0' }}>
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="space-y-0.5 md:space-y-1">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 gap-0.5 md:gap-1">
                  {week.map((day, dayIdx) => {
                    if (!day) {
                      return <div key={dayIdx} className="h-7 w-7 md:h-9 md:w-9" />;
                    }

                    const isSelected = isDaySelected(day);
                    const isInRange = isDayInRange(day);
                    const isToday = isSameDay(day, new Date());
                    const isPreview = hoveredDay && selectionState.from && !selectionState.to;
                    const isOutside = isOutsideRange(day);

                    return (
                      <button
                        key={dayIdx}
                        onClick={() => handleDayClick(day)}
                        onMouseEnter={() => handleDayHover(day)}
                        onMouseLeave={() => handleDayHover(null)}
                        className={cn(
                          "h-7 w-7 md:h-9 md:w-9 text-xs md:text-sm rounded transition-all font-medium",
                          !isSelected && !isInRange && !isToday && !isOutside && "hover:bg-white/5",
                          !isSelected && !isInRange && isToday && "ring-1 ring-inset font-semibold",
                          isInRange && !isSelected && !isPreview && "font-normal",
                          isInRange && !isSelected && isPreview && "font-normal",
                          isSelected && "font-bold shadow-lg",
                          isOutside && "opacity-40"
                        )}
                        style={{
                          color: isSelected ? '#FFFFFF' : isToday ? '#2F6BFF' : isOutside ? '#A9B4D0' : '#E6ECFF',
                          backgroundColor: isSelected ? '#2F6BFF' : isInRange && !isSelected ? 'rgba(47, 107, 255, 0.20)' : 'transparent',
                          borderColor: isToday && !isSelected ? '#2F6BFF' : 'transparent',
                        }}
                      >
                        {format(day, "d")}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 mt-3 md:mt-4 pt-2 md:pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCancel} 
                className="text-[10px] md:text-xs h-7 md:h-8 px-3 md:px-4 hover:bg-white/5"
                style={{ color: '#A9B4D0', borderColor: 'rgba(255,255,255,0.06)' }}
              >
                Annuler
              </Button>
              <Button 
                size="sm" 
                onClick={handleApply} 
                disabled={!selectionState.from} 
                className="text-[10px] md:text-xs h-7 md:h-8 px-3 md:px-4 disabled:opacity-50"
                style={{ 
                  backgroundColor: selectionState.from ? '#2F6BFF' : '#1a2640',
                  color: '#FFFFFF',
                }}
              >
                Appliquer
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
