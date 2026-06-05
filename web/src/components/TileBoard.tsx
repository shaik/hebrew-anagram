import { useLayoutEffect, useRef } from "react";

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

/**
 * Renders the current arrangement as Scrabble-style tiles and animates every
 * rearrangement with a FLIP pass: each tile flies from its previous position
 * through a random mid-air scatter point, then settles into its new spot.
 * Tiles are tracked across renders by `data-tile-id`, so the animation works
 * even though React remounts tiles that move between word rows.
 */
export function TileBoard({ words, shakeNonce }: TileBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const prevRects = useRef<Map<number, DOMRect>>(new Map());

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

  const maxLen = Math.max(1, ...words.map((w) => w.length));

  return (
    <div
      className="board"
      ref={boardRef}
      style={{ "--cols": maxLen } as React.CSSProperties}
    >
      {words.map((word, wi) => (
        <div className="board__word" key={wi}>
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
