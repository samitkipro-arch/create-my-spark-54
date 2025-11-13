import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, TooltipProps } from "recharts";
import { format } from "date-fns";

interface ChartProps {
  data: any[];
  daysCount: number;
  dateRange: any;
}

const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload[0]) {
    const item = payload[0].payload;

    return (
      <div className="bg-gray-900/90 border border-gray-700 text-white px-3 py-2 rounded-md shadow-xl backdrop-blur-sm text-xs">
        <p className="text-blue-400 font-medium">{format(new Date(item.fullDate), "dd/MM/yyyy")}</p>
        <p className="mt-1">{item.count} reçus traités</p>
        <p className="font-semibold mt-1 text-blue-300">
          TVA récupérée :{" "}
          {new Intl.NumberFormat("fr-FR", {
            style: "currency",
            currency: "EUR",
          }).format(item.tva)}
        </p>
      </div>
    );
  }
  return null;
};

export const TvaChart = ({ data, daysCount, dateRange }: ChartProps) => {
  const showDetailedDates = daysCount <= 7;

  const xAxisLabelLeft = dateRange?.from ? format(dateRange.from, "dd/MM/yyyy") : "";
  const xAxisLabelRight = dateRange?.to ? format(dateRange.to, "dd/MM/yyyy") : "";

  const maxY = Math.max(...data.map((d) => d.tva), 0);
  const yStep = 25;
  const yMax = Math.ceil(maxY / yStep) * yStep + yStep;
  const yTicks = Array.from({ length: Math.floor(yMax / yStep) + 1 }, (_, i) => i * yStep);

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
          {/* Gradient satin premium */}
          <defs>
            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
          </defs>

          {showDetailedDates ? (
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 12 }} tickMargin={8} />
          ) : (
            <XAxis
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              tickMargin={8}
              ticks={[0, data.length - 1]}
              tickFormatter={(value) =>
                value === 0 ? xAxisLabelLeft : value === data.length - 1 ? xAxisLabelRight : ""
              }
            />
          )}

          <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} ticks={yTicks} domain={[0, yMax]} />

          <Tooltip content={<CustomTooltip />} />

          {/* Line satinée */}
          <Line
            type="monotone"
            dataKey="tva"
            stroke="url(#blueGradient)"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, fill: "#3B82F6" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
