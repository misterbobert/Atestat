// Minimal linear solver (Gaussian elimination)
export function solveLinear(A, b) {
  const n = A.length;
  const M = A.map((row, i) => row.slice().concat([b[i]]));

  for (let i = 0; i < n; i++) {
    // pivot
    let piv = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
    }
    if (Math.abs(M[piv][i]) < 1e-12) return null;
    if (piv !== i) [M[i], M[piv]] = [M[piv], M[i]];

    // normalize
    const div = M[i][i];
    for (let c = i; c <= n; c++) M[i][c] /= div;

    // eliminate
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const f = M[r][i];
      for (let c = i; c <= n; c++) M[r][c] -= f * M[i][c];
    }
  }

  return M.map((row) => row[n]);
}

/**
 * MNA:
 * unknowns = node voltages (except ground) + currents through voltage sources
 */
export function solveMNA({ nodeCount, ground, resistors, currentSources, voltageSources }) {
  const N = nodeCount - 1; // excluding ground
  const M = voltageSources.length;
  const dim = N + M;

  const A = Array.from({ length: dim }, () => Array(dim).fill(0));
  const z = Array(dim).fill(0);

  function idxNode(n) {
    if (n === ground) return -1;
    return n < ground ? n : n - 1;
  }

  // stamp resistors
  for (const r of resistors) {
    const g = 1 / r.R;
    const a = idxNode(r.a);
    const b = idxNode(r.b);

    if (a !== -1) A[a][a] += g;
    if (b !== -1) A[b][b] += g;
    if (a !== -1 && b !== -1) {
      A[a][b] -= g;
      A[b][a] -= g;
    }
  }

  // stamp current sources (from a to b)
  for (const s of currentSources) {
    const a = idxNode(s.a);
    const b = idxNode(s.b);
    if (a !== -1) z[a] -= s.I;
    if (b !== -1) z[b] += s.I;
  }

  // stamp voltage sources
  for (let k = 0; k < voltageSources.length; k++) {
    const vs = voltageSources[k];
    const a = idxNode(vs.a);
    const b = idxNode(vs.b);
    const row = N + k;

    if (a !== -1) {
      A[a][row] += 1;
      A[row][a] += 1;
    }
    if (b !== -1) {
      A[b][row] -= 1;
      A[row][b] -= 1;
    }

    z[row] = vs.V;
  }

  const x = solveLinear(A, z);
  if (!x) return null;

  // unpack
  const V = Array(nodeCount).fill(0);
  for (let n = 0; n < nodeCount; n++) {
    if (n === ground) V[n] = 0;
    else V[n] = x[idxNode(n)];
  }
  const Ivs = x.slice(N);

  return { V, Ivs };
}