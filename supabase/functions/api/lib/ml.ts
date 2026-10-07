// supabase/functions/api/lib/ml.ts

/**
 * Z-score standardization — pengganti sklearn.StandardScaler.
 */
export function standardize(matrix: number[][]): number[][] {
  if (matrix.length === 0) return [];
  const cols = matrix[0].length;
  const means = new Array(cols).fill(0);
  const stds = new Array(cols).fill(0);

  for (let j = 0; j < cols; j++) {
    let sum = 0;
    for (let i = 0; i < matrix.length; i++) sum += matrix[i][j];
    means[j] = sum / matrix.length;

    let variance = 0;
    for (let i = 0; i < matrix.length; i++) {
      variance += Math.pow(matrix[i][j] - means[j], 2);
    }
    stds[j] = Math.sqrt(variance / matrix.length);
    if (stds[j] === 0) stds[j] = 1;
  }

  return matrix.map((row) =>
    row.map((val, j) => (val - means[j]) / stds[j]),
  );
}

/** Euclidean distance. */
export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.pow(a[i] - b[i], 2);
  return Math.sqrt(sum);
}

/** Mulberry32 — seedable RNG untuk reproduksibilitas. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller normal distribution dengan seedable RNG. */
export function seededGaussian(rng: () => number, mean: number, std: number): number {
  const u1 = Math.max(rng(), 1e-9);
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z;
}

export { mulberry32 };

/** K-Means clustering dengan k-means++ init, seedable, multi-run. */
export function kMeans(
  data: number[][],
  k: number,
  seed: number = 42,
  nInit: number = 10,
  maxIter: number = 300,
): { labels: number[]; centroids: number[][] } {
  if (data.length === 0 || k < 1) return { labels: [], centroids: [] };
  const n = data.length;
  const dim = data[0].length;

  let bestLabels: number[] = new Array(n).fill(0);
  let bestCentroids: number[][] = [];
  let bestInertia = Infinity;

  for (let init = 0; init < nInit; init++) {
    const rng = mulberry32(seed + init);
    const centroids: number[][] = [];

    // k-means++ init
    centroids.push([...data[Math.floor(rng() * n)]]);
    for (let c = 1; c < k; c++) {
      const dists = data.map((point) => {
        let minD = Infinity;
        for (const cent of centroids) {
          const d = euclideanDistance(point, cent);
          if (d < minD) minD = d;
        }
        return minD * minD;
      });
      const total = dists.reduce((s, v) => s + v, 0);
      let target = rng() * total;
      let idx = 0;
      for (let i = 0; i < n; i++) {
        target -= dists[i];
        if (target <= 0) {
          idx = i;
          break;
        }
      }
      centroids.push([...data[idx]]);
    }

    // Iterate
    let labels: number[] = new Array(n).fill(0);
    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;
      for (let i = 0; i < n; i++) {
        let minD = Infinity;
        let best = 0;
        for (let c = 0; c < k; c++) {
          const d = euclideanDistance(data[i], centroids[c]);
          if (d < minD) {
            minD = d;
            best = c;
          }
        }
        if (labels[i] !== best) {
          labels[i] = best;
          changed = true;
        }
      }

      // Update centroids
      const sums: number[][] = Array.from({ length: k }, () =>
        new Array(dim).fill(0),
      );
      const counts = new Array(k).fill(0);
      for (let i = 0; i < n; i++) {
        const c = labels[i];
        counts[c] += 1;
        for (let j = 0; j < dim; j++) sums[c][j] += data[i][j];
      }
      for (let c = 0; c < k; c++) {
        if (counts[c] > 0) {
          for (let j = 0; j < dim; j++) centroids[c][j] = sums[c][j] / counts[c];
        }
      }

      if (!changed && iter > 0) break;
    }

    // Compute inertia
    let inertia = 0;
    for (let i = 0; i < n; i++) {
      inertia += Math.pow(euclideanDistance(data[i], centroids[labels[i]]), 2);
    }

    if (inertia < bestInertia) {
      bestInertia = inertia;
      bestLabels = [...labels];
      bestCentroids = centroids.map((c) => [...c]);
    }
  }

  return { labels: bestLabels, centroids: bestCentroids };
}