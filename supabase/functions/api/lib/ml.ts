// supabase/functions/api/lib/ml.ts

/**
 * Z-score standardization — pengganti sklearn.StandardScaler.
 * Setiap kolom di-normalisasi: (x - mean) / std.
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
    if (stds[j] === 0) stds[j] = 1; // hindari division by zero
  }

  return matrix.map((row) =>
    row.map((val, j) => (val - means[j]) / stds[j]),
  );
}

/** Euclidean distance — pengganti np.linalg.norm(a - b). */
export function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.pow(a[i] - b[i], 2);
  return Math.sqrt(sum);
}