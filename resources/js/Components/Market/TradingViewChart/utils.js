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

export function normalizeVisibleRect(a, b, minSize = 8) {
  const rect = normalizeRect(a, b);
  const width = Math.max(rect.width, minSize);
  const height = Math.max(rect.height, minSize);

  return {
    left: rect.left - Math.max((width - rect.width) / 2, 0),
    top: rect.top - Math.max((height - rect.height) / 2, 0),
    width,
    height,
  };
}

export function colorToRgba(color, alpha) {
  if (typeof color !== 'string') return `rgba(96, 165, 250, ${alpha})`;

  const hex = color.trim();
  if (/^#[0-9a-f]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  return color;
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

export function buildStorageKey(symbol) {
  return `replay-drawings:${symbol}`;
}

export function buildLegacyStorageKey(symbol, timeframe) {
  return `replay-drawings:${symbol}:${timeframe}`;
}

export function estimateCandleInterval(candles) {
  if (!Array.isArray(candles) || candles.length < 2) return 60;

  const intervals = [];
  for (let i = 1; i < candles.length; i += 1) {
    const interval = candles[i].time - candles[i - 1].time;
    if (Number.isFinite(interval) && interval > 0) {
      intervals.push(interval);
    }
  }

  if (!intervals.length) return 60;

  intervals.sort((a, b) => a - b);
  return intervals[Math.floor(intervals.length / 2)];
}

export function estimateTimeFromLogical(candles, logical) {
  if (!Array.isArray(candles) || !candles.length || !Number.isFinite(logical)) return null;

  const lowerIndex = Math.floor(logical);
  const upperIndex = Math.ceil(logical);

  if (candles[lowerIndex] && candles[upperIndex]) {
    const progress = logical - lowerIndex;
    return candles[lowerIndex].time + ((candles[upperIndex].time - candles[lowerIndex].time) * progress);
  }

  const interval = estimateCandleInterval(candles);

  if (logical < 0) {
    return candles[0].time + (logical * interval);
  }

  return candles[candles.length - 1].time + ((logical - (candles.length - 1)) * interval);
}

export function estimateLogicalFromTime(candles, time) {
  const numericTime = Number(time);
  if (!Array.isArray(candles) || !candles.length || !Number.isFinite(numericTime)) return null;

  if (candles.length === 1) return 0;

  if (numericTime <= candles[0].time) {
    return (numericTime - candles[0].time) / estimateCandleInterval(candles);
  }

  for (let i = 1; i < candles.length; i += 1) {
    if (numericTime <= candles[i].time) {
      const span = candles[i].time - candles[i - 1].time;
      if (!Number.isFinite(span) || span <= 0) return i;
      return (i - 1) + ((numericTime - candles[i - 1].time) / span);
    }
  }

  return (candles.length - 1) + ((numericTime - candles[candles.length - 1].time) / estimateCandleInterval(candles));
}

export function estimateDrawingLogicalFromTime(candles, time, intervalSeconds = 60) {
  const numericTime = Number(time);
  if (!Array.isArray(candles) || !candles.length || !Number.isFinite(numericTime)) return null;

  if (intervalSeconds >= 1800) {
    const containingIndex = candles.findIndex((candle, index) => {
      const nextCandle = candles[index + 1];
      return (
        numericTime >= candle.time &&
        (!nextCandle || numericTime < nextCandle.time)
      );
    });

    if (containingIndex >= 0) {
      return containingIndex;
    }
  }

  return estimateLogicalFromTime(candles, numericTime);
}

function offsetPoint(point, deltaTime, deltaPrice, deltaLogical) {
  const nextPoint = {
    ...point,
    time: point.time + deltaTime,
    price: point.price + deltaPrice,
  };

  if (Number.isFinite(point.logical) && Number.isFinite(deltaLogical)) {
    nextPoint.logical = point.logical + deltaLogical;
  }

  return nextPoint;
}

export function isTwoPointDrawing(drawing) {
  return ['line', 'horizontal-ray', 'rect', 'measure', 'forecast', 'long-position', 'short-position'].includes(drawing?.type);
}

export function isLineLikeDrawing(drawing) {
  return ['line', 'horizontal-ray', 'measure', 'forecast'].includes(drawing?.type);
}

export function isHorizontalRayDrawing(drawing) {
  return drawing?.type === 'horizontal-ray';
}

export function isPositionDrawing(drawing) {
  return ['long-position', 'short-position'].includes(drawing?.type);
}

export function offsetDrawing(drawing, deltaTime, deltaPrice, deltaLogical) {
  if (isTwoPointDrawing(drawing)) {
    const nextDrawing = {
      ...drawing,
      start: offsetPoint(drawing.start, deltaTime, deltaPrice, deltaLogical),
      end: offsetPoint(drawing.end, deltaTime, deltaPrice, deltaLogical),
    };

    if (drawing.stop) {
      nextDrawing.stop = offsetPoint(drawing.stop, deltaTime, deltaPrice, deltaLogical);
    }

    return nextDrawing;
  }

  if (drawing.type === 'text') {
    return {
      ...drawing,
      point: offsetPoint(drawing.point, deltaTime, deltaPrice, deltaLogical),
    };
  }

  return drawing;
}
