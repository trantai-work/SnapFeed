export function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

/**
 * Temporarily clears scroll-snap during animation; otherwise the browser snaps each frame.
 */
export function animateScrollTop(el, targetTop, durationMs, onComplete) {
  const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
  const clamped = Math.max(0, Math.min(maxScroll, targetTop));
  const start = el.scrollTop;
  const change = clamped - start;
  if (Math.abs(change) < 0.5) {
    onComplete?.();
    return () => {};
  }

  const prevSnap = el.style.scrollSnapType;
  const prevStop = el.style.scrollBehavior;
  el.style.scrollSnapType = "none";
  el.style.scrollBehavior = "auto";

  const t0 = performance.now();
  let rafId = 0;
  let finished = false;

  const cleanup = () => {
    el.style.scrollSnapType = prevSnap;
    el.style.scrollBehavior = prevStop;
  };

  const done = () => {
    if (finished) return;
    finished = true;
    el.scrollTop = clamped;
    cleanup();
    onComplete?.();
  };

  const tick = (now) => {
    const raw = Math.min(1, (now - t0) / durationMs);
    const eased = easeOutCubic(raw);
    el.scrollTop = start + change * eased;
    if (raw < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      done();
    }
  };

  rafId = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(rafId);
    if (!finished) {
      cleanup();
    }
  };
}

/** Index of the slide whose top is at or above the current scroll position. */
export function getActiveSlideIndex(scrollEl, slideElements) {
  const st = scrollEl.scrollTop;
  let idx = 0;
  for (let i = 0; i < slideElements.length; i++) {
    if (slideElements[i].offsetTop <= st + 12) idx = i;
    else break;
  }
  return idx;
}
