import { Point } from "../types";

// --- Configuration ---
const RESAMPLE_POINTS_COUNT = 64; 
const MAX_DISTANCE_THRESHOLD = 0.50; // Slightly relaxed to allow more variations
const CONFIDENCE_GAP_THRESHOLD = 0.05; // Adjusted for better acceptance of variants

// --- Geometry Helpers ---

function distance(p1: Point, p2: Point) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function pathLength(points: Point[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i++) {
    d += distance(points[i - 1], points[i]);
  }
  return d;
}

function resample(points: Point[], n: number): Point[] {
  const I = pathLength(points) / (n - 1);
  if (I === 0) return Array(n).fill(points[0]); 

  let D = 0;
  const newPoints: Point[] = [points[0]];
  let i = 1;
  const srcPts = [...points];

  while (i < srcPts.length) {
    const d = distance(srcPts[i - 1], srcPts[i]);
    if (D + d >= I) {
      const qx = srcPts[i - 1].x + ((I - D) / d) * (srcPts[i].x - srcPts[i - 1].x);
      const qy = srcPts[i - 1].y + ((I - D) / d) * (srcPts[i].y - srcPts[i - 1].y);
      const q = { x: qx, y: qy };
      newPoints.push(q);
      srcPts.splice(i, 0, q); 
      D = 0;
    } else {
      D += d;
    }
    i++;
  }
  
  while (newPoints.length < n) {
    newPoints.push(srcPts[srcPts.length - 1]);
  }
  
  return newPoints;
}

function centroid(points: Point[]): Point {
  let x = 0, y = 0;
  for (const p of points) { x += p.x; y += p.y; }
  return { x: x / points.length, y: y / points.length };
}

function translateToOrigin(points: Point[]): Point[] {
  const c = centroid(points);
  return points.map(p => ({ x: p.x - c.x, y: p.y - c.y }));
}

function getBounds(points: Point[]) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, maxX, minY, maxY };
}

function normalizeScale(points: Point[]): Point[] {
  const { minX, maxX, minY, maxY } = getBounds(points);
  const width = Math.max(maxX - minX, 0.01); 
  const height = Math.max(maxY - minY, 0.01);
  
  // Preserve some aspect ratio info by not stretching excessively if it's a line
  return points.map(p => ({
    x: (p.x - minX) / width,
    y: (p.y - minY) / height
  }));
}

function pathDistance(path1: Point[], path2: Point[]): number {
  if (path1.length !== path2.length) return Infinity;
  let d = 0;
  for (let i = 0; i < path1.length; i++) {
    d += distance(path1[i], path2[i]);
  }
  return d / path1.length;
}

// --- Analysis Tools ---

function getZoneDensity(points: Point[], minX: number, maxX: number, minY: number, maxY: number): number {
  let count = 0;
  for (const p of points) {
    if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
      count++;
    }
  }
  return count / points.length;
}

function hasSharpTurn(points: Point[], minIndexPct: number, maxIndexPct: number, angleThreshold: number): boolean {
    const start = Math.floor(points.length * minIndexPct);
    const end = Math.floor(points.length * maxIndexPct);
    
    // Look for a sharp angle in the specified segment
    for(let i = start; i < end - 2; i += 2) { // Step by 2 to reduce noise
        const p1 = points[i];
        const p2 = points[i+1];
        const p3 = points[i+2];
        
        const v1 = {x: p1.x - p2.x, y: p1.y - p2.y}; // Vector incoming
        const v2 = {x: p3.x - p2.x, y: p3.y - p2.y}; // Vector outgoing
        
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x*v1.x + v1.y*v1.y);
        const mag2 = Math.sqrt(v2.x*v2.x + v2.y*v2.y);
        
        if (mag1 * mag2 === 0) continue;
        const angle = Math.acos(dot / (mag1 * mag2)) * (180/Math.PI);
        
        if (angle < angleThreshold) return true;
    }
    return false;
}

// --- High Precision Templates ---
const RAW_TEMPLATES: Record<number, Point[][]> = {
  0: [[{x:0.5,y:0}, {x:1,y:0.5}, {x:0.5,y:1}, {x:0,y:0.5}, {x:0.5,y:0}]], // Standard Circle
  1: [[{x:0.5,y:0}, {x:0.5,y:1}], [{x:0.4,y:0}, {x:0.5,y:0}, {x:0.5,y:1}]], // Stick, Hook
  2: [
    [{x:0,y:0.2}, {x:0.5,y:0}, {x:1,y:0.2}, {x:1,y:0.4}, {x:0,y:1}, {x:1,y:1}], // Standard
    [{x:0.1,y:0.3}, {x:0.5,y:0}, {x:0.9,y:0.3}, {x:0.2,y:0.9}, {x:1,y:0.9}] // Loopy base
  ],
  3: [[{x:0.1,y:0.2}, {x:0.5,y:0}, {x:0.9,y:0.2}, {x:0.5,y:0.5}, {x:0.9,y:0.8}, {x:0.5,y:1}, {x:0.1,y:0.8}]],
  4: [
    [{x:0.8,y:1}, {x:0.8,y:0}, {x:0,y:0.6}, {x:1,y:0.6}], // Standard
    [{x:0.7,y:1}, {x:0.7,y:0}, {x:0,y:0.5}, {x:0.7,y:0.5}], // Open top
    [{x:1,y:1}, {x:1,y:0}, {x:0,y:0.7}, {x:1,y:0.7}] // L-shape
  ],
  5: [
    [{x:1,y:0}, {x:0,y:0}, {x:0,y:0.4}, {x:1,y:0.6}, {x:0.5,y:1}, {x:0,y:0.9}], // Standard
    [{x:0.9,y:0}, {x:0.2,y:0}, {x:0.2,y:0.4}, {x:1,y:0.7}, {x:0.1,y:0.9}] // S-like
  ],
  6: [
    [{x:0.8,y:0}, {x:0.1,y:0.4}, {x:0.1,y:0.9}, {x:0.9,y:0.9}, {x:0.9,y:0.5}, {x:0.2,y:0.5}], // Spiral (C shape)
    [{x:0.7,y:0}, {x:0.2,y:0.8}, {x:0.5,y:1}, {x:0.9,y:0.8}, {x:0.7,y:0.6}, {x:0.3,y:0.7}], // Straight back line
    [{x:0.5,y:0}, {x:0,y:0.5}, {x:0.2,y:0.9}, {x:0.8,y:0.9}, {x:0.8,y:0.6}, {x:0.2,y:0.6}] // Big Loop
  ],
  7: [
    [{x:0,y:0}, {x:1,y:0}, {x:0.4,y:1}], 
    [{x:0,y:0.15}, {x:1,y:0.15}, {x:0.5,y:1}],
    [{x:0,y:0.2}, {x:0.1,y:0}, {x:1,y:0}, {x:0.5,y:1}] // With serif
  ],
  8: [
    [{x:0.5,y:0.5}, {x:0.9,y:0.2}, {x:0.5,y:0}, {x:0.1,y:0.2}, {x:0.5,y:0.5}, {x:0.9,y:0.8}, {x:0.5,y:1}, {x:0.1,y:0.8}, {x:0.5,y:0.5}], // Standard Cross
    [{x:0.5,y:0.5}, {x:0.1,y:0.2}, {x:0.5,y:0}, {x:0.9,y:0.2}, {x:0.5,y:0.5}, {x:0.1,y:0.8}, {x:0.5,y:1}, {x:0.9,y:0.8}, {x:0.5,y:0.5}], // Reverse Cross
    [{x:0.5,y:0.5}, {x:1,y:0.25}, {x:0.5,y:0}, {x:0,y:0.25}, {x:0.5,y:0.5}, {x:1,y:0.75}, {x:0.5,y:1}, {x:0,y:0.75}, {x:0.5,y:0.5}] // Snowman (Stacked)
  ],
  9: [
    [{x:1,y:0.5}, {x:0.5,y:0}, {x:0,y:0.5}, {x:1,y:0.5}, {x:1,y:1}], // Standard Stick
    [{x:1,y:0.5}, {x:0.5,y:0}, {x:0,y:0.5}, {x:1,y:0.5}, {x:0.8,y:1}], // Slight slant
    [{x:1,y:0.6}, {x:0.5,y:0.2}, {x:0,y:0.6}, {x:1,y:0.6}, {x:0.5,y:1}, {x:0.1,y:0.9}] // Curly (g style)
  ]
};

const TEMPLATES: Record<number, Point[][]> = {};
Object.entries(RAW_TEMPLATES).forEach(([digit, variations]) => {
  TEMPLATES[parseInt(digit)] = variations.map(points => {
    const resampled = resample(points, RESAMPLE_POINTS_COUNT);
    const centered = translateToOrigin(resampled);
    return normalizeScale(centered);
  });
});

// --- Structural Verification (The "Certainty" Layer) ---

function getStructuralPenalty(digit: number, points: Point[], bounds: {w: number, h: number}): number {
  let penalty = 0;
  const norm = normalizeScale(points);
  const start = norm[0];
  const end = norm[norm.length - 1];
  
  // Quadrant Densities
  const dTop    = getZoneDensity(norm, 0, 1, 0, 0.5);
  const dBot    = getZoneDensity(norm, 0, 1, 0.5, 1);
  const dLeft   = getZoneDensity(norm, 0, 0.5, 0, 1);
  const dRight  = getZoneDensity(norm, 0.5, 1, 0, 1);
  const dCenter = getZoneDensity(norm, 0.3, 0.7, 0.3, 0.7);

  switch (digit) {
    case 0:
      // Must be closed loop. End must be near start (top).
      // If it ends in the middle, it might be a 6
      if (distance(start, end) > 0.35) penalty += 1.0; 
      // Center must be relatively empty
      if (dCenter > 0.15) penalty += 0.8; 
      break;

    case 1:
      if (bounds.w / bounds.h > 0.5) penalty += 1.0; 
      if (dLeft > 0.8 || dRight > 0.8) penalty += 0.5;
      break;

    case 2:
      if (getZoneDensity(norm, 0, 1, 0.85, 1) < 0.15) penalty += 0.5;
      if (getZoneDensity(norm, 0, 0.5, 0, 0.3) < 0.05) penalty += 0.3;
      break;

    case 3:
      if (getZoneDensity(norm, 0, 0.25, 0.3, 0.7) > 0.05) penalty += 0.8; 
      if (dCenter < 0.1) penalty += 0.4;
      break;

    case 4:
      if (dCenter < 0.1) penalty += 0.3;
      if (distance(start, {x:1, y:0.5}) < 0.3) penalty += 0.5; 
      break;

    case 5:
      const hasSharpCorner = hasSharpTurn(norm, 0, 0.4, 110);
      if (!hasSharpCorner) penalty += 0.4; 
      break;

    case 6:
      // 6 must end in the bottom half
      if (end.y < 0.5) penalty += 1.0; 
      // 6 should loop in the bottom. 
      // Check if center-bottom is occupied
      if (getZoneDensity(norm, 0.2, 0.8, 0.6, 0.9) < 0.1) penalty += 0.5;
      
      // Unlike 0, 6 usually starts at Top-Right or Top-Middle and goes left
      if (start.x < 0.2 && start.y > 0.2) penalty += 0.5; // Starts too low-left
      break;

    case 7:
      if (getZoneDensity(norm, 0, 1, 0, 0.15) < 0.1) penalty += 0.7;
      if (getZoneDensity(norm, 0, 0.4, 0.6, 1) > 0.1) penalty += 0.5;
      break;

    case 8:
      // 8 needs a crossing point or a "pinch" in the middle
      // Standard 8 has high density in center
      if (dCenter < 0.15) penalty += 0.8;
      // Must have mass on top and bottom
      if (dTop < 0.2 || dBot < 0.2) penalty += 0.5;
      break;

    case 9:
      // Top MUST be a loop. 
      // Check density in top-left and top-right
      if (getZoneDensity(norm, 0, 0.5, 0, 0.5) < 0.1) penalty += 0.5;
      if (getZoneDensity(norm, 0.5, 1, 0, 0.5) < 0.1) penalty += 0.5;

      // Tail Logic:
      // If it ends in Bottom-Right (standard) -> OK
      // If it ends in Bottom-Left (curly) -> OK
      // BUT, if it curves back UP to the middle/top, it's an 8 or 0.
      if (end.y < 0.6) penalty += 1.0; // Must end at bottom
      
      // Mass check: 9 is top-heavy usually
      if (dTop < 0.2) penalty += 0.5;
      break;
  }
  return penalty;
}

export const recognizeDigit = (strokes: Point[][]): number | null => {
  if (strokes.length === 0) return null;

  const rawPoints = strokes.flat();
  if (rawPoints.length < 5) return null;

  // --- 1. Aspect Ratio Pre-check (The "1" Filter) ---
  const bounds = getBounds(rawPoints);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const ratio = width / height;

  if (height > 20 && ratio < 0.20) return 1; // Strict vertical line

  // --- 2. Normalization ---
  let points = resample(rawPoints, RESAMPLE_POINTS_COUNT);
  points = normalizeScale(translateToOrigin(points));

  // --- 3. Scoring ---
  const candidates: { digit: number, score: number }[] = [];

  for (const [digitStr, variations] of Object.entries(TEMPLATES)) {
    const digit = parseInt(digitStr);
    let minDist = Infinity;

    for (const t of variations) {
      const d1 = pathDistance(points, t);
      const d2 = pathDistance(points, [...t].reverse());
      minDist = Math.min(minDist, Math.min(d1, d2));
    }

    // Apply strict structural penalties
    const penalty = getStructuralPenalty(digit, points, {w: width, h: height});
    candidates.push({ digit, score: minDist + penalty });
  }

  // --- 4. Selection & Certainty Check ---
  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0];
  const runnerUp = candidates[1];

  // Rule 1: Must meet absolute threshold
  if (best.score > MAX_DISTANCE_THRESHOLD) {
    return null;
  }

  // Rule 2: Confidence Gap (Must be significantly better than 2nd place)
  const gap = runnerUp.score - best.score;
  if (gap < CONFIDENCE_GAP_THRESHOLD) {
    return null;
  }

  return best.digit;
};