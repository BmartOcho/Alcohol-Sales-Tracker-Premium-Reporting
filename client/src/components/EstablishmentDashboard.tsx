import React, { useEffect, useState } from "react";
import Plot from "react-plotly.js";

type TimelinePoint = {
  date: string;
  total: number;
  liquor: number;
  wine: number;
  beer: number;
  isOutlier: boolean;
  trendBreak: boolean;
};

type AnalyticsResponse = {
  permit: string;
  name: string;
  city: string;
  timeline: TimelinePoint[];
};

type Props = {
  permit: string;
};

export const EstablishmentDashboard: React.FC<Props> = ({ permit }) => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `/api/analytics/permit/${encodeURIComponent(permit)}/timeseries`
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || body.message || `HTTP ${res.status}`);
        }

        const json: AnalyticsResponse = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [permit]);

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-500">
        Loading analytics for permit <span className="font-mono">{permit}</span>…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600">
        Failed to load analytics: {error}
      </div>
    );
  }

  if (!data || !data.timeline.length) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No timeline data available for permit <span className="font-mono">{permit}</span>.
      </div>
    );
  }

  const { name, city, timeline } = data;

  const dates = timeline.map((t) => t.date);
  const totals = timeline.map((t) => t.total);
  const liquor = timeline.map((t) => t.liquor);
  const beer = timeline.map((t) => t.beer);
  const wine = timeline.map((t) => t.wine);

  // Basic summary metrics
  const totalSum = totals.reduce((a, b) => a + b, 0);
  const avgMonthly = totals.length ? totalSum / totals.length : 0;
  const maxTotal = Math.max(...totals);
  const minTotal = Math.min(...totals);
  const firstMonth = dates[0];
  const lastMonth = dates[dates.length - 1];
  const outlierCount = timeline.filter((t) => t.isOutlier).length;
  const trendBreakCount = timeline.filter((t) => t.trendBreak).length;

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">
          {name}{" "}
          <span className="text-sm font-normal text-gray-500">
            ({permit})
          </span>
        </h1>
        <p className="text-sm text-gray-600">{city}</p>
        <p className="mt-1 text-xs text-gray-500">
          Data range: {firstMonth} → {lastMonth}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">Avg monthly total</div>
          <div className="text-lg font-medium">
            ${avgMonthly.toFixed(0).toLocaleString?.() || avgMonthly.toFixed(0)}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">High month</div>
          <div className="text-lg font-medium">
            ${maxTotal.toLocaleString()}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">Low month</div>
          <div className="text-lg font-medium">
            ${minTotal.toLocaleString()}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-xs text-gray-500">Flags</div>
          <div className="text-sm">
            {outlierCount} outliers · {trendBreakCount} trend breaks
          </div>
        </div>
      </div>

      {/* Main chart */}
      <div className="rounded-lg border border-gray-200 p-3">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">
          Monthly sales over time
        </h2>
        <Plot
          data={[
            {
              x: dates,
              y: totals,
              type: "scatter",
              mode: "lines+markers",
              name: "Total",
            },
            {
              x: dates,
              y: liquor,
              type: "scatter",
              mode: "lines",
              name: "Liquor",
            },
            {
              x: dates,
              y: beer,
              type: "scatter",
              mode: "lines",
              name: "Beer",
            },
            {
              x: dates,
              y: wine,
              type: "scatter",
              mode: "lines",
              name: "Wine",
            },
          ]}
          layout={{
            autosize: true,
            margin: { l: 40, r: 10, t: 20, b: 40 },
            xaxis: { title: "Month" },
            yaxis: { title: "Sales (USD)" },
          }}
          style={{ width: "100%", height: "400px" }}
          useResizeHandler
        />
      </div>

      {/* Flagged months table (small, just to feel 'dashboard-y') */}
      <div className="rounded-lg border border-gray-200 p-3">
        <h2 className="mb-2 text-sm font-semibold text-gray-700">
          Flagged months
        </h2>
        {trendBreakCount === 0 && outlierCount === 0 ? (
          <p className="text-xs text-gray-500">No outliers or trend breaks detected.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-1 pr-2">Date</th>
                <th className="py-1 pr-2">Total</th>
                <th className="py-1 pr-2">Flags</th>
              </tr>
            </thead>
            <tbody>
              {timeline
                .filter((t) => t.isOutlier || t.trendBreak)
                .map((t) => (
                  <tr key={t.date}>
                    <td className="py-1 pr-2">{t.date}</td>
                    <td className="py-1 pr-2">${t.total.toLocaleString()}</td>
                    <td className="py-1 pr-2">
                      {t.isOutlier && "Outlier"}
                      {t.isOutlier && t.trendBreak && " · "}
                      {t.trendBreak && "Trend break"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
