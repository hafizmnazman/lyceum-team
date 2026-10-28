// Descriptive direction agreement, not statistical confidence or independence.
// Call with one skill at a time. Duplicate rows do not create extra sources.
export interface SourceDirection {
  sourceId: string;
  delta12m: number;
}

export interface SourceAgreement {
  sourceCount: number;
  conflictingSourceCount: number;
  fraction: number | null;
  status: "insufficient" | "unanimous" | "mixed" | "split";
}

export function summarizeSourceAgreement(rows: readonly SourceDirection[]): SourceAgreement {
  const bySource = new Map<string, Set<number>>();
  for (const row of rows) {
    if (!row.sourceId.trim() || !Number.isFinite(row.delta12m)) continue;
    const directions = bySource.get(row.sourceId) ?? new Set<number>();
    directions.add(Math.sign(row.delta12m));
    bySource.set(row.sourceId, directions);
  }

  const counts = new Map<number, number>();
  let conflictingSourceCount = 0;
  let sourceCount = 0;
  for (const directions of bySource.values()) {
    // Conflicting observations from a source need review, not a majority vote.
    if (directions.size !== 1) {
      conflictingSourceCount += 1;
      continue;
    }
    const direction = [...directions][0];
    counts.set(direction, (counts.get(direction) ?? 0) + 1);
    sourceCount += 1;
  }

  if (sourceCount < 2 || conflictingSourceCount > 0) {
    return { sourceCount, conflictingSourceCount, fraction: null, status: "insufficient" };
  }
  const largest = Math.max(...counts.values());
  const ties = [...counts.values()].filter((n) => n === largest).length;
  return {
    sourceCount,
    conflictingSourceCount,
    fraction: largest / sourceCount,
    status: largest === sourceCount ? "unanimous" : ties > 1 ? "split" : "mixed",
  };
}
