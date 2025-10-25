import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangePickerProps {
  value: { from: string | null; to: string | null };
  onChange: (range: { from: string | null; to: string | null }) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value.from ? (
            value.to ? (
              <>
                {format(new Date(value.from), "dd/MM/yyyy")} - {format(new Date(value.to), "dd/MM/yyyy")}
              </>
            ) : (
              format(new Date(value.from), "dd/MM/yyyy")
            )
          ) : (
            <span>Sélectionner une période</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{
            from: value.from ? new Date(value.from) : undefined,
            to: value.to ? new Date(value.to) : undefined,
          }}
          onSelect={(range) => {
            onChange({
              from: range?.from ? range.from.toISOString() : null,
              to: range?.to ? range.to.toISOString() : null,
            });
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
