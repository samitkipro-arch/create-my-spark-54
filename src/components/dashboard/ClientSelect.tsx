import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClientSelectProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function ClientSelect({ value, onChange }: ClientSelectProps) {
  return (
    <Select value={value || "all"} onValueChange={(val) => onChange(val === "all" ? null : val)}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Tous les clients" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tous les clients</SelectItem>
        {/* TODO: Charger les clients depuis Supabase */}
        <SelectItem value="client1">Client 1</SelectItem>
        <SelectItem value="client2">Client 2</SelectItem>
        <SelectItem value="client3">Client 3</SelectItem>
      </SelectContent>
    </Select>
  );
}
