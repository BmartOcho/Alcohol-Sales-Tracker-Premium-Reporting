// server/routes/analytics.ts
import { Router } from "express";
import { eq, asc } from "drizzle-orm";
import { db } from "../db"; 
import { monthlySales } from "../../shared/schema";

const router = Router();

/**
 * GET /api/analytics/permit/:permit/timeseries
 */
router.get("/permit/:permit/timeseries", async (req, res) => {
  try {
    const permit = req.params.permit;

    if (!permit) {
      return res.status(400).json({ error: "Missing permit parameter" });
    }

    // 1. Query all sales rows for this permit (sorted)
    const rows = await db
      .select()
      .from(monthlySales)
      .where(eq(monthlySales.permitNumber, permit))
      .orderBy(asc(monthlySales.obligationEndDate));

    if (!rows.length) {
      return res.status(404).json({ error: "No data found for permit" });
    }

    // Extract numeric fields safely, because Drizzle returns numeric() as strings
    const totals = rows.map(r => Number(r.totalReceipts));
    const liquorArr = rows.map(r => Number(r.liquorReceipts));
    const wineArr = rows.map(r => Number(r.wineReceipts));
    const beerArr = rows.map(r => Number(r.beerReceipts));

    // Calculate mean and std for totalReceipts
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    const variance = totals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / totals.length;
    const std = Math.sqrt(variance) || 1;

    const zScores = totals.map(v => (v - mean) / std);

    // Rolling mean (4-month window)
    const rollingMean: (number | null)[] = [];
    for (let i = 0; i < totals.length; i++) {
      if (i < 3) {
        rollingMean.push(null);
        continue;
      }
      const w = totals.slice(i - 3, i + 1);
      rollingMean.push(w.reduce((a, b) => a + b, 0) / 4);
    }

    // Build Plotly-ready timeline
    const timeline = rows.map((r, i) => {
      const z = zScores[i];
      const roll = rollingMean[i];

      const trendBreak = roll !== null && totals[i] < roll * 0.8; // 20% drop
      const isOutlier = Math.abs(z) > 3;

      return {
        date: r.obligationEndDate.toISOString().slice(0, 10),
        total: totals[i],
        liquor: liquorArr[i],
        wine: wineArr[i],
        beer: beerArr[i],
        isOutlier,
        trendBreak,
      };
    });

    // Use first row as metadata
    const first = rows[0];

    res.json({
      permit,
      name: first.locationName,
      city: first.locationCity,
      timeline,
    });
  } catch (err) {
    console.error("Timeseries error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
