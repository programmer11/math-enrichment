import { useState } from "react";
import { VisualSpec } from "@/lib/types";

const COLORS = {
  forest: "var(--forest)",
  forestDim: "var(--forest-dim)",
  gold: "var(--gold)",
  goldDim: "var(--gold-dim)",
  coral: "var(--coral)",
  ink: "var(--ink)",
  inkSoft: "var(--ink-soft)",
  border: "var(--border)",
  card: "var(--card)",
};

const WIDTH = 400;

function Frame({ children, height = 200 }: { children: React.ReactNode; height?: number }) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      style={{ width: "100%", height: "auto", display: "block" }}
      role="img"
      aria-label="Visual aid illustrating the numbers in this question"
    >
      {children}
    </svg>
  );
}

// ---------------- number_line ----------------
function NumberLine(spec: Extract<VisualSpec, { type: "number_line" }>) {
  const { min, max, step, marks, jump } = spec;
  const padX = 30;
  const y = 110;
  const usableW = WIDTH - padX * 2;
  const x = (v: number) => padX + ((v - min) / (max - min)) * usableW;

  const ticks: number[] = [];
  for (let v = min; v <= max + 1e-9; v += step) ticks.push(Math.round(v * 100) / 100);

  return (
    <Frame>
      <line x1={padX} y1={y} x2={WIDTH - padX} y2={y} stroke={COLORS.ink} strokeWidth={2} />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} y1={y - 6} x2={x(t)} y2={y + 6} stroke={COLORS.inkSoft} strokeWidth={1.5} />
          <text x={x(t)} y={y + 24} fontSize={12} fill={COLORS.inkSoft} textAnchor="middle">
            {t.toLocaleString()}
          </text>
        </g>
      ))}
      {marks.map((m) => (
        <g key={m.label}>
          <circle cx={x(m.value)} cy={y} r={7} fill={COLORS.forest} />
          <text x={x(m.value)} y={y - 16} fontSize={13} fontWeight={600} fill={COLORS.forest} textAnchor="middle">
            {m.label}
          </text>
        </g>
      ))}
      {jump && (
        <g>
          <path
            d={`M ${x(jump.from)} ${y - 10} Q ${(x(jump.from) + x(jump.to)) / 2} ${y - 55}, ${x(jump.to)} ${y - 10}`}
            fill="none"
            stroke={COLORS.gold}
            strokeWidth={2.5}
            markerEnd="url(#arrowhead)"
          />
          <text
            x={(x(jump.from) + x(jump.to)) / 2}
            y={y - 60}
            fontSize={13}
            fontWeight={600}
            fill={COLORS.gold}
            textAnchor="middle"
          >
            {jump.label}
          </text>
          <defs>
            <marker id="arrowhead" markerWidth={8} markerHeight={8} refX={6} refY={4} orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill={COLORS.gold} />
            </marker>
          </defs>
        </g>
      )}
    </Frame>
  );
}

// ---------------- base10 ----------------
function Base10Group({
  tens,
  ones,
  x0,
  y0,
  color,
  interactive,
}: {
  tens: number;
  ones: number;
  x0: number;
  y0: number;
  color: string;
  interactive?: boolean;
}) {
  const total = tens + ones;
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const toggle = (idx: number) =>
    setTapped((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  const rods = Array.from({ length: tens }, (_, i) => (
    <rect
      key={`t${i}`}
      x={x0 + i * 16}
      y={y0}
      width={11}
      height={54}
      rx={2}
      fill={color}
      opacity={0.85}
      stroke={interactive && tapped.has(i) ? COLORS.ink : "none"}
      strokeWidth={interactive && tapped.has(i) ? 2.5 : 0}
      onClick={interactive ? () => toggle(i) : undefined}
      style={interactive ? { cursor: "pointer" } : undefined}
    />
  ));
  const cubes = Array.from({ length: ones }, (_, i) => {
    const idx = tens + i;
    return (
      <rect
        key={`o${i}`}
        x={x0 + (i % 5) * 15}
        y={y0 + 64 + Math.floor(i / 5) * 15}
        width={11}
        height={11}
        rx={2}
        fill={color}
        stroke={interactive && tapped.has(idx) ? COLORS.ink : "none"}
        strokeWidth={interactive && tapped.has(idx) ? 2.5 : 0}
        onClick={interactive ? () => toggle(idx) : undefined}
        style={interactive ? { cursor: "pointer" } : undefined}
      />
    );
  });
  return (
    <>
      {rods}
      {cubes}
      {interactive && (
        <text x={x0} y={y0 + 100} fontSize={11} fontWeight={600} fill={COLORS.ink}>
          Tapped {tapped.size} of {total}
        </text>
      )}
    </>
  );
}

function Base10(spec: Extract<VisualSpec, { type: "base10" }> & { interactive?: boolean }) {
  const { operator, a, b, interactive } = spec;
  return (
    <Frame height={interactive ? 220 : 200}>
      <Base10Group tens={a.tens} ones={a.ones} x0={30} y0={30} color={COLORS.forest} interactive={interactive} />
      <text x={30} y={175} fontSize={15} fontWeight={600} fill={COLORS.ink}>
        {a.label}
      </text>

      <text x={190} y={110} fontSize={28} fontWeight={700} fill={COLORS.inkSoft} textAnchor="middle">
        {operator}
      </text>

      <Base10Group tens={b.tens} ones={b.ones} x0={230} y0={30} color={COLORS.gold} interactive={interactive} />
      <text x={230} y={175} fontSize={15} fontWeight={600} fill={COLORS.ink}>
        {b.label}
      </text>
    </Frame>
  );
}

// ---------------- place_value ----------------
function PlaceValue(spec: Extract<VisualSpec, { type: "place_value" }>) {
  const digits = String(spec.number).split("");
  const boxSize = 56;
  const gap = 12;
  const totalW = digits.length * boxSize + (digits.length - 1) * gap;
  const startX = (WIDTH - totalW) / 2;
  return (
    <Frame height={140}>
      {digits.map((d, i) => (
        <g key={i}>
          <rect
            x={startX + i * (boxSize + gap)}
            y={40}
            width={boxSize}
            height={boxSize}
            rx={8}
            fill={COLORS.card}
            stroke={COLORS.border}
            strokeWidth={1.5}
          />
          <text
            x={startX + i * (boxSize + gap) + boxSize / 2}
            y={40 + boxSize / 2 + 9}
            fontSize={26}
            fontWeight={700}
            fill={COLORS.ink}
            textAnchor="middle"
          >
            {d}
          </text>
        </g>
      ))}
    </Frame>
  );
}

// ---------------- array_grid ----------------
function ArrayGrid(spec: Extract<VisualSpec, { type: "array_grid" }> & { interactive?: boolean; largeTargets?: boolean }) {
  const { rows, cols, label, interactive, largeTargets } = spec;
  const total = rows * cols;
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const toggle = (idx: number) =>
    setTapped((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  const maxW = 320;
  const maxH = largeTargets ? 170 : 150;
  const cell = Math.min(maxW / cols, maxH / rows, largeTargets ? 34 : 26);
  const gridW = cell * cols;
  const gridH = cell * rows;
  const startX = (WIDTH - gridW) / 2;
  const startY = 16;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const isTapped = interactive && tapped.has(idx);
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={startX + c * cell}
          y={startY + r * cell}
          width={cell - 2}
          height={cell - 2}
          rx={2}
          fill={isTapped ? COLORS.gold : COLORS.forestDim}
          stroke={COLORS.forest}
          strokeWidth={0.75}
          onClick={interactive ? () => toggle(idx) : undefined}
          style={interactive ? { cursor: "pointer" } : undefined}
        />
      );
    }
  }
  return (
    <Frame height={190}>
      {cells}
      {interactive ? (
        <text x={WIDTH / 2} y={startY + gridH + 24} fontSize={13} fontWeight={600} fill={COLORS.forest} textAnchor="middle">
          Tap each square &mdash; counted {tapped.size} of {total}
        </text>
      ) : (
        label && (
          <text x={WIDTH / 2} y={startY + gridH + 24} fontSize={13} fill={COLORS.inkSoft} textAnchor="middle">
            {label}
          </text>
        )
      )}
    </Frame>
  );
}

// ---------------- groups ----------------
function Groups(spec: Extract<VisualSpec, { type: "groups" }> & { interactive?: boolean; largeTargets?: boolean }) {
  const { groupCount, itemsPerGroup, interactive, largeTargets } = spec;
  const total = groupCount * itemsPerGroup;
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const toggle = (idx: number) =>
    setTapped((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  const dotRadius = largeTargets ? 7 : 5;
  const dotSpacing = largeTargets ? 18 : 14;
  const cols = Math.min(groupCount, 6);
  const rowsOfGroups = Math.ceil(groupCount / cols);
  const groupW = Math.min(340 / cols, 90);
  const groupH = (interactive ? 150 : 170) / rowsOfGroups;

  const groups = [];
  for (let g = 0; g < groupCount; g++) {
    const gr = Math.floor(g / cols);
    const gc = g % cols;
    const x0 = 20 + gc * groupW;
    const y0 = 10 + gr * groupH;
    const dotCols = Math.min(itemsPerGroup, 4);
    const dots = [];
    for (let i = 0; i < itemsPerGroup; i++) {
      const dr = Math.floor(i / dotCols);
      const dc = i % dotCols;
      const globalIdx = g * itemsPerGroup + i;
      const isTapped = interactive && tapped.has(globalIdx);
      dots.push(
        <circle
          key={i}
          cx={x0 + 12 + dc * dotSpacing}
          cy={y0 + 22 + dr * dotSpacing}
          r={dotRadius}
          fill={isTapped ? COLORS.forest : COLORS.gold}
          onClick={interactive ? () => toggle(globalIdx) : undefined}
          style={interactive ? { cursor: "pointer" } : undefined}
        />
      );
    }
    groups.push(
      <g key={g}>
        <rect x={x0} y={y0} width={groupW - 8} height={groupH - 12} rx={8} fill={COLORS.card} stroke={COLORS.border} />
        {dots}
      </g>
    );
  }

  return (
    <Frame height={interactive ? 190 : 170}>
      {groups}
      {interactive && (
        <text x={WIDTH / 2} y={178} fontSize={13} fontWeight={600} fill={COLORS.forest} textAnchor="middle">
          Tap each dot &mdash; counted {tapped.size} of {total}
        </text>
      )}
    </Frame>
  );
}

// ---------------- area_model ----------------
function AreaModel(spec: Extract<VisualSpec, { type: "area_model" }>) {
  const { widthParts, heightParts } = spec;
  const totalW = widthParts.reduce((a, b) => a + b, 0);
  const totalH = heightParts.reduce((a, b) => a + b, 0);
  const maxPxW = 260;
  const maxPxH = 130;
  const scale = Math.min(maxPxW / totalW, maxPxH / totalH);
  const gridW = totalW * scale;
  const gridH = totalH * scale;
  const startX = (WIDTH - gridW) / 2 + 10;
  const startY = 40;

  const cells = [];
  let yAcc = 0;
  const palette = [COLORS.forestDim, COLORS.goldDim];
  for (let hi = 0; hi < heightParts.length; hi++) {
    let xAcc = 0;
    for (let wi = 0; wi < widthParts.length; wi++) {
      cells.push(
        <rect
          key={`${hi}-${wi}`}
          x={startX + xAcc}
          y={startY + yAcc}
          width={widthParts[wi] * scale}
          height={heightParts[hi] * scale}
          fill={palette[(hi + wi) % 2]}
          stroke={COLORS.ink}
          strokeWidth={1}
        />
      );
      xAcc += widthParts[wi] * scale;
    }
    yAcc += heightParts[hi] * scale;
  }

  let xAccLbl = 0;
  const widthLabels = widthParts.map((w, i) => {
    const el = (
      <text key={i} x={startX + xAccLbl + (w * scale) / 2} y={startY - 10} fontSize={13} fontWeight={600} fill={COLORS.ink} textAnchor="middle">
        {w}
      </text>
    );
    xAccLbl += w * scale;
    return el;
  });

  let yAccLbl = 0;
  const heightLabels = heightParts.map((h, i) => {
    const el = (
      <text key={i} x={startX - 12} y={startY + yAccLbl + (h * scale) / 2 + 4} fontSize={13} fontWeight={600} fill={COLORS.ink} textAnchor="end">
        {h}
      </text>
    );
    yAccLbl += h * scale;
    return el;
  });

  return (
    <Frame height={190}>
      {cells}
      {widthLabels}
      {heightLabels}
    </Frame>
  );
}

// ---------------- fraction_bars ----------------
function FractionBar({ numerator, denominator, label, y }: { numerator: number | null; denominator: number; label: string; y: number }) {
  const barW = 300;
  const barH = 32;
  const x0 = (WIDTH - barW) / 2;
  const segW = barW / denominator;
  const segments = Array.from({ length: denominator }, (_, i) => (
    <rect
      key={i}
      x={x0 + i * segW}
      y={y}
      width={segW}
      height={barH}
      fill={numerator !== null && i < numerator ? COLORS.forest : COLORS.card}
      stroke={COLORS.border}
      strokeWidth={1}
    />
  ));
  return (
    <g>
      {segments}
      <text x={x0 - 12} y={y + barH / 2 + 5} fontSize={13} fontWeight={600} fill={COLORS.ink} textAnchor="end">
        {label}
      </text>
    </g>
  );
}

function FractionBars(spec: Extract<VisualSpec, { type: "fraction_bars" }>) {
  const rowH = 56;
  return (
    <Frame height={Math.max(120, spec.bars.length * rowH + 20)}>
      {spec.bars.map((b, i) => (
        <FractionBar key={i} {...b} y={20 + i * rowH} />
      ))}
    </Frame>
  );
}

// ---------------- decimal_area ----------------
function DecimalArea(spec: Extract<VisualSpec, { type: "decimal_area" }>) {
  const { a, b } = spec;
  const size = 160;
  const x0 = (WIDTH - size) / 2;
  const y0 = 16;
  const cell = size / 10;
  const cellsShadedA = Math.round(a * 10);
  const cellsShadedB = Math.round(b * 10);

  const cells = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      const inA = c < cellsShadedA;
      const inB = r < cellsShadedB;
      let fill = COLORS.card;
      if (inA && inB) fill = COLORS.gold;
      else if (inA) fill = COLORS.forestDim;
      else if (inB) fill = COLORS.goldDim;
      cells.push(
        <rect key={`${r}-${c}`} x={x0 + c * cell} y={y0 + r * cell} width={cell} height={cell} fill={fill} stroke={COLORS.border} strokeWidth={0.5} />
      );
    }
  }

  return (
    <Frame height={200}>
      {cells}
      <text x={x0 - 10} y={y0 + size / 2} fontSize={13} fontWeight={600} fill={COLORS.ink} textAnchor="end">
        {b}
      </text>
      <text x={x0 + size / 2} y={y0 + size + 20} fontSize={13} fontWeight={600} fill={COLORS.ink} textAnchor="middle">
        {a}
      </text>
      <text x={WIDTH / 2} y={y0 + size + 40} fontSize={12} fill={COLORS.inkSoft} textAnchor="middle">
        Overlap (gold) shows the product region
      </text>
    </Frame>
  );
}

// ---------------- percent_grid ----------------
function PercentGrid(spec: Extract<VisualSpec, { type: "percent_grid" }> & { interactive?: boolean; largeTargets?: boolean }) {
  const { shaded, label, interactive, largeTargets } = spec;
  const size = largeTargets ? 190 : 150;
  const x0 = (WIDTH - size) / 2;
  const y0 = 14;
  const cell = size / 10;
  const [tapped, setTapped] = useState<Set<number>>(new Set());
  const toggle = (idx: number) =>
    setTapped((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });

  const cells = [];
  for (let i = 0; i < 100; i++) {
    const r = Math.floor(i / 10);
    const c = i % 10;
    const isTapped = interactive && tapped.has(i);
    cells.push(
      <rect
        key={i}
        x={x0 + c * cell}
        y={y0 + r * cell}
        width={cell}
        height={cell}
        fill={i < shaded ? COLORS.forest : COLORS.card}
        stroke={isTapped ? COLORS.coral : COLORS.border}
        strokeWidth={isTapped ? 2 : 0.5}
        onClick={interactive ? () => toggle(i) : undefined}
        style={interactive ? { cursor: "pointer" } : undefined}
      />
    );
  }
  return (
    <Frame height={y0 + size + 40}>
      {cells}
      {interactive ? (
        <text x={WIDTH / 2} y={y0 + size + 24} fontSize={13} fontWeight={600} fill={COLORS.coral} textAnchor="middle">
          Tap squares to count them &mdash; marked {tapped.size} of 100
        </text>
      ) : (
        label && (
          <text x={WIDTH / 2} y={y0 + size + 24} fontSize={13} fill={COLORS.inkSoft} textAnchor="middle">
            {label}
          </text>
        )
      )}
    </Frame>
  );
}

// ---------------- ratio_blocks ----------------
function RatioBlocks(spec: Extract<VisualSpec, { type: "ratio_blocks" }>) {
  const { ratioA, ratioB, labelA, labelB, multiplier } = spec;
  const rowH = 30;
  const blockW = 20;
  const gap = 4;

  const rows = Array.from({ length: multiplier }, (_, m) => {
    const y = 16 + m * (rowH * 2 + 14);
    const aBlocks = Array.from({ length: ratioA }, (_, i) => (
      <rect key={i} x={30 + i * (blockW + gap)} y={y} width={blockW} height={rowH - 6} rx={4} fill={COLORS.forest} />
    ));
    const bBlocks = Array.from({ length: ratioB }, (_, i) => (
      <rect key={i} x={30 + i * (blockW + gap)} y={y + rowH} width={blockW} height={rowH - 6} rx={4} fill={COLORS.gold} />
    ));
    return (
      <g key={m}>
        {aBlocks}
        {bBlocks}
      </g>
    );
  });

  return (
    <Frame height={16 + multiplier * (rowH * 2 + 14)}>
      {rows}
      <text x={320} y={16 + rowH / 2 + 10} fontSize={12} fontWeight={600} fill={COLORS.forest}>
        {labelA}
      </text>
      <text x={320} y={16 + rowH + rowH / 2 + 6} fontSize={12} fontWeight={600} fill={COLORS.gold}>
        {labelB}
      </text>
    </Frame>
  );
}

// ---------------- tape_diagram ----------------
function TapeDiagram(spec: Extract<VisualSpec, { type: "tape_diagram" }>) {
  const { segments, total } = spec;
  const barW = 320;
  const x0 = (WIDTH - barW) / 2;
  const y0 = 60;
  const barH = 44;

  const constantSum = segments.filter((s) => s.isConstant).reduce((a, s) => a + s.repeatCount, 0);
  const unknownUnits = segments.filter((s) => !s.isConstant).reduce((a, s) => a + s.repeatCount, 0);
  const remaining = Math.max(total - constantSum, unknownUnits);
  const unknownUnitWidth = unknownUnits > 0 ? (barW * (remaining - constantSum)) / (remaining * unknownUnits) : 0;
  const constantUnitWidth = constantSum > 0 ? (barW * constantSum) / remaining : 0;

  let xAcc = 0;
  const blocks: JSX.Element[] = [];
  segments.forEach((seg, si) => {
    for (let i = 0; i < seg.repeatCount; i++) {
      const w = seg.isConstant ? constantUnitWidth / seg.repeatCount : unknownUnitWidth;
      blocks.push(
        <g key={`${si}-${i}`}>
          <rect x={x0 + xAcc} y={y0} width={w - 3} height={barH} fill={seg.color} opacity={0.85} stroke={COLORS.ink} strokeWidth={1} />
          <text x={x0 + xAcc + w / 2} y={y0 + barH / 2 + 5} fontSize={13} fontWeight={700} fill="#fff" textAnchor="middle">
            {seg.label}
          </text>
        </g>
      );
      xAcc += w;
    }
  });

  return (
    <Frame height={150}>
      {blocks}
      <line x1={x0} y1={y0 - 10} x2={x0 + barW} y2={y0 - 10} stroke={COLORS.inkSoft} strokeWidth={1} />
      <text x={WIDTH / 2} y={y0 - 18} fontSize={13} fontWeight={600} fill={COLORS.ink} textAnchor="middle">
        Total = {total}
      </text>
    </Frame>
  );
}

// ---------------- algebra_tiles ----------------
function AlgebraTiles(spec: Extract<VisualSpec, { type: "algebra_tiles" }>) {
  const { terms } = spec;
  let x0 = 24;
  const y0 = 60;
  const groups: JSX.Element[] = [];

  terms.forEach((term, ti) => {
    const count = Math.abs(term.coeff);
    const negative = term.coeff < 0;
    const color = negative ? COLORS.coral : COLORS.forest;
    const tileW = 16;
    const tileH = term.isConstant ? 16 : 44;

    for (let i = 0; i < count; i++) {
      groups.push(
        <rect
          key={`${ti}-${i}`}
          x={x0}
          y={term.isConstant ? y0 + 28 : y0}
          width={tileW}
          height={tileH}
          rx={3}
          fill={negative ? "#fff" : color}
          stroke={color}
          strokeWidth={1.5}
        />
      );
      if (!term.isConstant) {
        groups.push(
          <text key={`lbl-${ti}-${i}`} x={x0 + tileW / 2} y={y0 + tileH / 2 + 4} fontSize={10} fontWeight={700} fill={negative ? color : "#fff"} textAnchor="middle">
            x
          </text>
        );
      }
      x0 += tileW + 4;
    }
    x0 += 14;
  });

  return <Frame height={140}>{groups}</Frame>;
}

// ---------------- expression_steps ----------------
function ExpressionSteps(spec: Extract<VisualSpec, { type: "expression_steps" }>) {
  const { expression, highlight } = spec;
  const idx = expression.indexOf(highlight);
  const before = idx >= 0 ? expression.slice(0, idx) : expression;
  const mid = idx >= 0 ? highlight : "";
  const after = idx >= 0 ? expression.slice(idx + highlight.length) : "";

  return (
    <Frame height={120}>
      <text x={WIDTH / 2} y={55} fontSize={26} fontWeight={600} fill={COLORS.ink} textAnchor="middle">
        <tspan>{before}</tspan>
        <tspan fill={COLORS.forest} fontWeight={700}>
          {mid}
        </tspan>
        <tspan>{after}</tspan>
      </text>
      <text x={WIDTH / 2} y={90} fontSize={13} fill={COLORS.inkSoft} textAnchor="middle">
        Order of operations: calculate the highlighted part first
      </text>
    </Frame>
  );
}

// ---------------- exponent_tower ----------------
function ExponentTower(spec: Extract<VisualSpec, { type: "exponent_tower" }>) {
  const { base, exponent } = spec;
  const groupGap = 54;
  const startX = (WIDTH - (exponent - 1) * groupGap) / 2 - 20;
  return (
    <Frame height={130}>
      {Array.from({ length: exponent }, (_, g) => (
        <g key={g}>
          {Array.from({ length: base }, (_, i) => (
            <circle key={i} cx={startX + g * groupGap} cy={30 + i * 20} r={7} fill={COLORS.forest} />
          ))}
          {g < exponent - 1 && (
            <text x={startX + g * groupGap + groupGap / 2} y={30 + ((base - 1) * 20) / 2 + 5} fontSize={18} fontWeight={700} fill={COLORS.inkSoft} textAnchor="middle">
              x
            </text>
          )}
        </g>
      ))}
      <text x={WIDTH / 2} y={30 + base * 20 + 20} fontSize={13} fill={COLORS.inkSoft} textAnchor="middle">
        {base} multiplied by itself {exponent} times
      </text>
    </Frame>
  );
}

// ---------------- triangle_squares ----------------
function TriangleSquares(spec: Extract<VisualSpec, { type: "triangle_squares" }>) {
  const { legA, legB } = spec;
  const scale = 8;
  const a = legA * scale;
  const b = legB * scale;
  const x0 = 90;
  const y0 = 160;

  const p1 = { x: x0, y: y0 };
  const p2 = { x: x0 + a, y: y0 };
  const p3 = { x: x0, y: y0 - b };

  return (
    <Frame height={190}>
      <rect x={x0} y={y0} width={a} height={a} fill={COLORS.forestDim} stroke={COLORS.forest} strokeWidth={1.5} />
      <text x={x0 + a / 2} y={y0 + a / 2 + 5} fontSize={13} fontWeight={600} fill={COLORS.forest} textAnchor="middle">
        {legA}^2 = {legA * legA}
      </text>

      <rect x={x0 - b} y={y0 - b} width={b} height={b} fill={COLORS.goldDim} stroke={COLORS.gold} strokeWidth={1.5} />
      <text x={x0 - b / 2} y={y0 - b / 2 + 5} fontSize={13} fontWeight={600} fill={COLORS.gold} textAnchor="middle">
        {legB}^2 = {legB * legB}
      </text>

      <polygon points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}`} fill={COLORS.card} stroke={COLORS.ink} strokeWidth={2} />
      <rect x={x0} y={y0 - 8} width={8} height={8} fill="none" stroke={COLORS.ink} strokeWidth={1} />

      <text x={(p1.x + p2.x) / 2} y={y0 + 16} fontSize={12} fill={COLORS.ink} textAnchor="middle">
        {legA}
      </text>
      <text x={x0 - 14} y={(p1.y + p3.y) / 2} fontSize={12} fill={COLORS.ink} textAnchor="middle">
        {legB}
      </text>
      <text x={(p2.x + p3.x) / 2 + 14} y={(p2.y + p3.y) / 2 - 6} fontSize={12} fontWeight={700} fill={COLORS.coral} textAnchor="middle">
        ?
      </text>
    </Frame>
  );
}

// ---------------- shape_row ----------------
// Shows each named basic shape with its label underneath, so a
// pre-reader can match a shape word (the answer options) to a picture.
// All shapes shown equally -- never hints at which one is correct.
function ShapeRow(spec: Extract<VisualSpec, { type: "shape_row" }>) {
  const { shapes } = spec;
  const n = shapes.length;
  const slotW = WIDTH / n;
  const size = 46;
  const cy = 55;

  const palette = [COLORS.forest, COLORS.gold, COLORS.coral, COLORS.ink];
  const dims = [COLORS.forestDim, COLORS.goldDim, "var(--coral-dim)", COLORS.card];

  function renderShape(name: string, cx: number, stroke: string, fill: string) {
    switch (name) {
      case "Circle":
        return <circle cx={cx} cy={cy} r={size / 2} fill={fill} stroke={stroke} strokeWidth={3} />;
      case "Square":
        return (
          <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size} fill={fill} stroke={stroke} strokeWidth={3} />
        );
      case "Triangle": {
        const h = size * 0.87;
        const points = `${cx},${cy - h / 2} ${cx - size / 2},${cy + h / 2} ${cx + size / 2},${cy + h / 2}`;
        return <polygon points={points} fill={fill} stroke={stroke} strokeWidth={3} />;
      }
      case "Rectangle":
        return (
          <rect
            x={cx - size / 1.5}
            y={cy - size / 2.6}
            width={size * 1.33}
            height={size / 1.3}
            fill={fill}
            stroke={stroke}
            strokeWidth={3}
          />
        );
      default:
        return null;
    }
  }

  return (
    <Frame height={120}>
      {shapes.map((s, i) => {
        const cx = slotW * i + slotW / 2;
        return (
          <g key={i}>
            {renderShape(s.name, cx, palette[i % palette.length], dims[i % dims.length])}
            <text x={cx} y={cy + 42} fontSize={12} fontWeight={600} fill={COLORS.inkSoft} textAnchor="middle">
              {s.name}
            </text>
          </g>
        );
      })}
    </Frame>
  );
}

// ---------------- compare_groups ----------------
// Two labeled groups of dots side by side -- used for "which is more"
// comparisons and simple two-quantity combine word problems.
function CompareGroups(spec: Extract<VisualSpec, { type: "compare_groups" }>) {
  const { groupA, groupB } = spec;

  function renderGroup(count: number, x0: number, color: string) {
    const cols = Math.min(count, 5);
    const dots = [];
    for (let i = 0; i < count; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      dots.push(<circle key={i} cx={x0 + c * 22} cy={40 + r * 22} r={8} fill={color} />);
    }
    return dots;
  }

  return (
    <Frame height={150}>
      {renderGroup(groupA.count, 30, COLORS.forest)}
      {renderGroup(groupB.count, WIDTH / 2 + 20, COLORS.gold)}
      <line x1={WIDTH / 2} y1={10} x2={WIDTH / 2} y2={130} stroke={COLORS.border} strokeWidth={1.5} strokeDasharray="4 4" />
      <text x={WIDTH / 4} y={140} fontSize={13} fontWeight={700} fill={COLORS.forest} textAnchor="middle">
        {groupA.label}
      </text>
      <text x={(3 * WIDTH) / 4} y={140} fontSize={13} fontWeight={700} fill={COLORS.gold} textAnchor="middle">
        {groupB.label}
      </text>
    </Frame>
  );
}

export default function VisualAid({
  visual,
  interactive = false,
  largeTargets = false,
}: {
  visual: VisualSpec;
  interactive?: boolean;
  largeTargets?: boolean;
}) {
  const content = (() => {
    switch (visual.type) {
      case "number_line":
        return <NumberLine {...visual} />;
      case "base10":
        return <Base10 {...visual} interactive={interactive} />;
      case "place_value":
        return <PlaceValue {...visual} />;
      case "array_grid":
        return <ArrayGrid {...visual} interactive={interactive} largeTargets={largeTargets} />;
      case "groups":
        return <Groups {...visual} interactive={interactive} largeTargets={largeTargets} />;
      case "area_model":
        return <AreaModel {...visual} />;
      case "fraction_bars":
        return <FractionBars {...visual} />;
      case "decimal_area":
        return <DecimalArea {...visual} />;
      case "percent_grid":
        return <PercentGrid {...visual} interactive={interactive} largeTargets={largeTargets} />;
      case "ratio_blocks":
        return <RatioBlocks {...visual} />;
      case "tape_diagram":
        return <TapeDiagram {...visual} />;
      case "algebra_tiles":
        return <AlgebraTiles {...visual} />;
      case "expression_steps":
        return <ExpressionSteps {...visual} />;
      case "exponent_tower":
        return <ExponentTower {...visual} />;
      case "triangle_squares":
        return <TriangleSquares {...visual} />;
      case "shape_row":
        return <ShapeRow {...visual} />;
      case "compare_groups":
        return <CompareGroups {...visual} />;
      default:
        return null;
    }
  })();

  if (!content) return null;

  return (
    <div
      style={{
        background: "var(--card)",
        border: "3px solid var(--ink)",
        boxShadow: "4px 4px 0 var(--ink)",
        borderRadius: "var(--radius-md)",
        padding: "14px 10px",
        marginBottom: 26,
      }}
    >
      {content}
    </div>
  );
}
