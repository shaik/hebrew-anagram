import { useLayoutEffect, useRef, useState } from "react";

/** One letter tile. `id` is stable across rearrangements of the same letters. */
export interface PlacedTile {
  id: number;
  char: string;
}

interface TileBoardProps {
  /** Rows of tiles — one row per word of the current arrangement. */
  words: readonly (readonly PlacedTile[])[];
  /** Bump to shake the whole board (e.g. "no matches" feedback). */
  shakeNonce: number;
  /**
   * When provided (and there is more than one row), rows can be dragged up
   * and down; called with the dragged row's index and its drop index.
   */
  onReorderWords?: (from: number, to: number) => void;
}

/** Deterministic per-tile resting rotation, so the board feels hand-laid. */
function jitterDeg(id: number): number {
  return ((id * 7919 + 3) % 7) - 3; // -3° .. +3°
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

interface DragState {
  index: number;
  startY: number;
  lastY: number;
  rowStride: number; // row height + gap, for drop-index math
}

/**
 * Renders the current arrangement as Scrabble-style tiles and animates every
 * rearrangement with a FLIP pass: each tile flies from its previous position
 * through a random mid-air scatter point, then settles into its new spot.
 * Tiles are tracked across renders by `data-tile-id`, so the animation works
 * even though React remounts tiles that move between word rows.
 *
 * Word rows can be dragged vertically to reorder; the drop commits through
 * `onReorderWords` and the same FLIP pass flies the letters into place.
 */
export function TileBoard({ words, shakeNonce, onReorderWords }: TileBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const prevRects = useRef<Map<number, DOMRect>>(new Map());
  const drag = useRef<DragState | null>(null);
  const [draggingIndex, setDraggingIndex] = useState(-1);

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const tiles = Array.from(
      board.querySelectorAll<HTMLElement>("[data-tile-id]"),
    );
    const nextRects = new Map<number, DOMRect>();
    const reduced = prefersReducedMotion();

    tiles.forEach((el, i) => {
      const id = Number(el.dataset.tileId);
      const cur = el.getBoundingClientRect();
      nextRects.set(id, cur);
      const prev = prevRects.current.get(id);
      const jit = jitterDeg(id);

      if (prev) {
        const dx = prev.left - cur.left;
        const dy = prev.top - cur.top;
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
        if (reduced) return; // position change is instant, no flight
        // Mid-air scatter point: somewhere off the straight path, with spin.
        const sx = dx / 2 + (Math.random() - 0.5) * 140;
        const sy = dy / 2 + (Math.random() - 0.5) * 110 - 30;
        const spin = (Math.random() - 0.5) * 50;
        el.animate(
          [
            { transform: `translate(${dx}px, ${dy}px) rotate(${jit}deg)` },
            {
              transform: `translate(${sx}px, ${sy}px) rotate(${spin}deg)`,
              offset: 0.45,
            },
            { transform: `translate(0, 0) rotate(${jit}deg)` },
          ],
          {
            duration: 700 + Math.random() * 250,
            delay: i * 24,
            easing: "cubic-bezier(0.3, 0.7, 0.25, 1.05)",
            fill: "backwards",
          },
        );
      } else if (!reduced) {
        // Fresh tile: drop onto the table.
        el.animate(
          [
            {
              transform: `translateY(-14px) scale(1.25) rotate(${jit}deg)`,
              opacity: 0,
            },
            { transform: `translate(0, 0) scale(1) rotate(${jit}deg)`, opacity: 1 },
          ],
          {
            duration: 240,
            delay: i * 14,
            easing: "cubic-bezier(0.2, 0.9, 0.3, 1.2)",
            fill: "backwards",
          },
        );
      }
    });

    prevRects.current = nextRects;
  }, [words]);

  // Horizontal shake on demand — "these letters make nothing".
  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board || shakeNonce === 0 || prefersReducedMotion()) return;
    board.animate(
      [
        { transform: "translateX(0)" },
        { transform: "translateX(7px)" },
        { transform: "translateX(-6px)" },
        { transform: "translateX(4px)" },
        { transform: "translateX(0)" },
      ],
      { duration: 320, easing: "ease-out" },
    );
  }, [shakeNonce]);

  const draggable = onReorderWords !== undefined && words.length > 1;

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>, index: number) {
    if (!draggable) return;
    const row = e.currentTarget;
    row.setPointerCapture(e.pointerId);
    // Stride = distance between consecutive row tops (height + flex gap).
    const rows = boardRef.current!.querySelectorAll<HTMLElement>(".board__word");
    const stride =
      rows.length > 1
        ? rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top
        : row.getBoundingClientRect().height;
    drag.current = { index, startY: e.clientY, lastY: e.clientY, rowStride: stride };
    setDraggingIndex(index);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    d.lastY = e.clientY;
    e.currentTarget.style.transform = `translateY(${e.clientY - d.startY}px)`;
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const row = e.currentTarget;
    const dy = d.lastY - d.startY;
    const target = Math.min(
      words.length - 1,
      Math.max(0, Math.round(d.index + dy / d.rowStride)),
    );
    // Let the FLIP pass take over from where the finger left the row: record
    // the dragged tiles' current (transformed) rects as their "previous"
    // positions before clearing the inline transform.
    row.querySelectorAll<HTMLElement>("[data-tile-id]").forEach((el) => {
      prevRects.current.set(Number(el.dataset.tileId), el.getBoundingClientRect());
    });
    row.style.transform = "";
    setDraggingIndex(-1);
    if (target !== d.index) onReorderWords!(d.index, target);
  }

  const maxLen = Math.max(1, ...words.map((w) => w.length));

  return (
    <div
      className="board"
      ref={boardRef}
      style={{ "--cols": maxLen } as React.CSSProperties}
    >
      {words.map((word, wi) => (
        <div
          className={
            "board__word" +
            (draggable ? " board__word--draggable" : "") +
            (wi === draggingIndex ? " board__word--dragging" : "")
          }
          key={wi}
          onPointerDown={(e) => handlePointerDown(e, wi)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
        >
          {word.map((tile) => (
            <div
              className="tile"
              key={tile.id}
              data-tile-id={tile.id}
              style={{ "--jitter": `${jitterDeg(tile.id)}deg` } as React.CSSProperties}
            >
              {tile.char}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
