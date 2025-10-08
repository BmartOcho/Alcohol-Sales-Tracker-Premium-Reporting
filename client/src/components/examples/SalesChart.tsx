import { SalesChart } from "../SalesChart";

const mockData = [
  { name: "Austin", liquor: 45000, wine: 35000, beer: 28000 },
  { name: "Houston", liquor: 52000, wine: 41000, beer: 38000 },
  { name: "Dallas", liquor: 48000, wine: 38000, beer: 42000 },
  { name: "San Antonio", liquor: 41000, wine: 32000, beer: 35000 },
];

export default function SalesChartExample() {
  return (
    <div className="p-4 max-w-2xl">
      <SalesChart data={mockData} />
    </div>
  );
}
