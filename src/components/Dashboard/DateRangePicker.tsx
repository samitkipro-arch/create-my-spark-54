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
    from: value?.from || null,
    to: value?.to || null,
  });
  const [hoveredDay, setHoveredDay] = useState<Date | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectionState({
        from: value?.from || null,
        to: value?.to || null,
      });
      setHoveredDay(null);
    }
  }, [isOpen, value]);

  const handleDayClick = (day: Date) => {
    const clickedDay = startOfDay(day);
    
    if (!selectionState.from || (selectionState.from && selectionState.to)) {
      // First click or reset after completed range
      setSelectionState({ from: clickedDay, to: null });
      setHoveredDay(null);
    } else {
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
    
    // Apply directly and close
    onChange({
      from: startOfDay(from),
      to: endOfDay(to),
    });
    setIsOpen(false);
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
    const startDate = monthStart;
    
    const weeks: Date[][] = [];
    let days: Date[] = [];
    let day = new Date(monthStart);
    
    // Add days from previous month
    const firstDayOfWeek = day.getDay();
    const daysFromPrevMonth = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    for (let i = daysFromPrevMonth; i > 0; i--) {
      const prevDay = new Date(monthStart);
      prevDay.setDate(prevDay.getDate() - i);
      days.push(prevDay);
    }

    // Add days of current month
    while (day <= monthEnd) {
      days.push(new Date(day));
      if (days.length === 7) {
        weeks.push(days);
        days = [];
      }
      day.setDate(day.getDate() + 1);
    }

    // Add days from next month
    if (days.length > 0) {
      const remainingDays = 7 - days.length;
      for (let i = 1; i <= remainingDays; i++) {
        const nextDay = new Date(monthEnd);
        nextDay.setDate(nextDay.getDate() + i);
        days.push(nextDay);
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

  const isOutsideCurrentMonth = (day: Date) => {
    return day.getMonth() !== currentMonth.getMonth();
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
      <PopoverContent className="w-auto p-0 bg-card/95 backdrop-blur border-border shadow-xl" align="start">
        <div className="flex rounded-lg overflow-hidden max-w-[640px]">
          {/* Quick Actions */}
          <div className="bg-card/80 border-r border-border/50 px-2 py-3 space-y-0.5 min-w-[110px]">
            <button
              onClick={() => handleQuickAction("today")}
              className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-primary/15 hover:text-primary transition-colors font-medium"
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => handleQuickAction(7)}
              className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-primary/15 hover:text-primary transition-colors font-medium"
            >
              7 jours
            </button>
            <button
              onClick={() => handleQuickAction(30)}
              className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-primary/15 hover:text-primary transition-colors font-medium"
            >
              30 jours
            </button>
            <button
              onClick={() => handleQuickAction(90)}
              className="w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-primary/15 hover:text-primary transition-colors font-medium"
            >
              90 jours
            </button>
          </div>

          {/* Calendar */}
          <div className="p-3 bg-card">
            {/* Header */}
            <div className="flex items-center justify-between mb-2.5">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-1 hover:bg-primary/10 rounded transition-colors"
                aria-label="Mois précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-sm font-semibold capitalize">
                {format(currentMonth, "MMMM yyyy", { locale: fr })}
              </div>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-1 hover:bg-primary/10 rounded transition-colors"
                aria-label="Mois suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {["lu", "ma", "me", "je", "ve", "sa", "di"].map((day) => (
                <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1 w-8">
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="space-y-0.5">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 gap-0.5">
                  {week.map((day, dayIdx) => {
                    const isOutside = isOutsideCurrentMonth(day);
                    const isSelected = isDaySelected(day);
                    const isInRange = isDayInRange(day);
                    const isToday = isSameDay(day, new Date());
                    const isPreview = hoveredDay && selectionState.from && !selectionState.to;

                    return (
                      <button
                        key={dayIdx}
                        onClick={() => !isOutside && handleDayClick(day)}
                        onMouseEnter={() => !isOutside && handleDayHover(day)}
                        onMouseLeave={() => handleDayHover(null)}
                        className={cn(
                          "h-8 w-8 text-xs rounded transition-all",
                          isOutside && "text-muted-foreground/15 cursor-default",
                          !isOutside && !isSelected && !isInRange && !isToday && "text-foreground hover:bg-primary/15 hover:scale-105",
                          !isOutside && !isSelected && !isInRange && isToday && "text-primary font-semibold ring-1 ring-inset ring-primary/40",
                          isInRange && !isSelected && !isPreview && "bg-primary/25 text-foreground",
                          isInRange && !isSelected && isPreview && "bg-primary/15 text-foreground",
                          isSelected && "bg-primary text-primary-foreground font-bold shadow-md scale-105"
                        )}
                      >
                        {format(day, "d")}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-1.5 mt-3 pt-2.5 border-t border-border/50">
              <Button variant="ghost" size="sm" onClick={handleCancel} className="text-xs h-7 px-3">
                Annuler
              </Button>
              <Button size="sm" onClick={handleApply} disabled={!selectionState.from} className="text-xs h-7 px-3">
                Appliquer
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
