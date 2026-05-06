export function formatPrice(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '---';
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function normalizeApiCandles(rawCandles) {
  if (!Array.isArray(rawCandles)) return [];

  return rawCandles
    .map((c) => {
      const rawTime =
        c?.time ??
        c?.timestamp ??
        c?.openTime ??
        c?.open_time ??
        c?.t ??
        c?.[0];

      const open = c?.open ?? c?.o ?? c?.[1];
      const high = c?.high ?? c?.h ?? c?.[2];
      const low = c?.low ?? c?.l ?? c?.[3];
      const close = c?.close ?? c?.c ?? c?.[4];
      const volume = c?.volume ?? c?.v ?? c?.[5] ?? 0;

      let time = Number(rawTime);
      if (!Number.isFinite(time)) return null;

      if (time > 9999999999) {
        time = Math.floor(time / 1000);
      } else {
        time = Math.floor(time);
      }

      const candle = {
        time,
        open: Number(open),
        high: Number(high),
        low: Number(low),
        close: Number(close),
        volume: Number(volume),
      };

      if (
        !Number.isFinite(candle.time) ||
        !Number.isFinite(candle.open) ||
        !Number.isFinite(candle.high) ||
        !Number.isFinite(candle.low) ||
        !Number.isFinite(candle.close) ||
        !Number.isFinite(candle.volume)
      ) {
        return null;
      }

      return candle;
    })
    .filter(Boolean)
    .sort((a, b) => a.time - b.time);
}

export function findNearestCandleIndex(candles, targetTime) {
  if (!candles.length || targetTime == null) return -1;

  const numericTargetTime =
    typeof targetTime === 'object' && targetTime !== null
      ? ('timestamp' in targetTime ? Number(targetTime.timestamp) : Number(targetTime.time))
      : Number(targetTime);

  if (!Number.isFinite(numericTargetTime)) return -1;

  let nearestIndex = 0;
  let nearestDelta = Number.POSITIVE_INFINITY;

  for (let i = 0; i < candles.length; i += 1) {
    const delta = Math.abs(candles[i].time - numericTargetTime);
    if (delta < nearestDelta) {
      nearestDelta = delta;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

export function normalizeRect(a, b) {
  return {
    left: Math.min(a.x, b.x),
    top: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

export function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - a.x, point.y - a.y);
  }

  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;

  return Math.hypot(point.x - projX, point.y - projY);
}

export function buildStorageKey(symbol, timeframe) {
  return `replay-drawings:${symbol}:${timeframe}`;
}

export function offsetDrawing(drawing, deltaTime, deltaPrice) {
  if (drawing.type === 'line' || drawing.type === 'rect') {
    return {
      ...drawing,
      start: {
        time: drawing.start.time + deltaTime,
        price: drawing.start.price + deltaPrice,
      },
      end: {
        time: drawing.end.time + deltaTime,
        price: drawing.end.price + deltaPrice,
      },
    };
  }

  if (drawing.type === 'text') {
    return {
      ...drawing,
      point: {
        time: drawing.point.time + deltaTime,
        price: drawing.point.price + deltaPrice,
      },
    };
  }

  return drawing;
}
