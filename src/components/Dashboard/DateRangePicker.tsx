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

  useEffect(() => {
    if (isOpen) {
      setSelectionState({
        from: value?.from || null,
        to: value?.to || null,
      });
    }
  }, [isOpen, value]);

  const handleDayClick = (day: Date) => {
    if (!selectionState.from || (selectionState.from && selectionState.to)) {
      // First click or reset after completed range
      setSelectionState({ from: startOfDay(day), to: startOfDay(day) });
    } else {
      // Second click
      const clickedDay = startOfDay(day);
      if (isBefore(clickedDay, selectionState.from)) {
        setSelectionState({ from: clickedDay, to: selectionState.from });
      } else if (isAfter(clickedDay, selectionState.from)) {
        setSelectionState({ from: selectionState.from, to: clickedDay });
      } else {
        // Same day clicked
        setSelectionState({ from: clickedDay, to: clickedDay });
      }
    }
  };

  const handleQuickAction = (days: number | "today") => {
    const today = new Date();
    if (days === "today") {
      setSelectionState({ from: startOfDay(today), to: startOfDay(today) });
    } else {
      setSelectionState({
        from: startOfDay(subDays(today, days - 1)),
        to: startOfDay(today),
      });
    }
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
    if (!selectionState.from || !selectionState.to) return false;
    return isWithinInterval(day, { start: selectionState.from, end: selectionState.to });
  };

  const isDaySelected = (day: Date) => {
    if (!selectionState.from) return false;
    if (isSameDay(day, selectionState.from)) return true;
    if (selectionState.to && isSameDay(day, selectionState.to)) return true;
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
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex bg-white rounded-lg shadow-lg">
          {/* Quick Actions */}
          <div className="border-r border-border p-4 space-y-2 min-w-[140px]">
            <button
              onClick={() => handleQuickAction("today")}
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => handleQuickAction(7)}
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Derniers 7 jours
            </button>
            <button
              onClick={() => handleQuickAction(30)}
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Derniers 30 jours
            </button>
            <button
              onClick={() => handleQuickAction(90)}
              className="w-full text-left px-3 py-2 text-sm rounded hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Derniers 90 jours
            </button>
          </div>

          {/* Calendar */}
          <div className="p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="p-2 hover:bg-accent rounded-md transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-lg font-semibold">
                {format(currentMonth, "MMMM yyyy", { locale: fr }).charAt(0).toUpperCase() + format(currentMonth, "MMMM yyyy", { locale: fr }).slice(1)}
              </div>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="p-2 hover:bg-accent rounded-md transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Weekdays */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
                <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="space-y-1">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 gap-1">
                  {week.map((day, dayIdx) => {
                    const isOutside = isOutsideCurrentMonth(day);
                    const isSelected = isDaySelected(day);
                    const isInRange = isDayInRange(day);

                    return (
                      <button
                        key={dayIdx}
                        onClick={() => handleDayClick(day)}
                        disabled={isOutside}
                        className={cn(
                          "h-10 w-10 text-sm rounded-md transition-colors",
                          isOutside && "text-muted-foreground/30 cursor-not-allowed",
                          !isOutside && !isSelected && !isInRange && "hover:bg-accent",
                          isInRange && !isSelected && "bg-primary/20 text-primary",
                          isSelected && "bg-primary text-primary-foreground font-semibold"
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
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-border">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                Annuler
              </Button>
              <Button size="sm" onClick={handleApply} disabled={!selectionState.from}>
                Appliquer
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
