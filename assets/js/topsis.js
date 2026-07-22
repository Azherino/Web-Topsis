// ═══════════════════════════════════════════
// TOPSIS Algorithm — Pure Math (No DOM)
// ═══════════════════════════════════════════

const TOPSIS = {

  // Step 1: Normalisasi matriks
  normalisasi(data, kriteria) {
    const result = data.map(row => ({ ...row }));
    const pembagi = {};

    kriteria.forEach(k => {
      const sumSq = data.reduce((sum, row) => sum + Math.pow(row[k.kode] || 0, 2), 0);
      pembagi[k.kode] = Math.sqrt(sumSq);

      result.forEach(row => {
        row[k.kode] = pembagi[k.kode] !== 0 ? row[k.kode] / pembagi[k.kode] : 0;
      });
    });

    return { result, pembagi };
  },

  // Step 2: Pembobotan
  pembobotan(normalized, kriteria) {
    return normalized.map(row => {
      const weighted = { ...row };
      kriteria.forEach(k => {
        weighted[k.kode] = row[k.kode] * k.bobot;
      });
      return weighted;
    });
  },

  // Step 3: Solusi ideal
  solusiIdeal(weighted, kriteria) {
    const aPlus = {};
    const aMinus = {};

    kriteria.forEach(k => {
      const values = weighted.map(row => row[k.kode]);
      if (k.jenis === 'benefit') {
        aPlus[k.kode] = Math.max(...values);
        aMinus[k.kode] = Math.min(...values);
      } else {
        aPlus[k.kode] = Math.min(...values);
        aMinus[k.kode] = Math.max(...values);
      }
    });

    return { aPlus, aMinus };
  },

  // Step 4: Jarak Euclidean
  jarakEuclidean(weighted, aPlus, aMinus, kriteria) {
    return weighted.map(row => {
      const dPlus = Math.sqrt(
        kriteria.reduce((sum, k) => sum + Math.pow(row[k.kode] - aPlus[k.kode], 2), 0)
      );
      const dMinus = Math.sqrt(
        kriteria.reduce((sum, k) => sum + Math.pow(row[k.kode] - aMinus[k.kode], 2), 0)
      );
      return { ...row, dPlus, dMinus };
    });
  },

  // Step 5: Nilai preferensi + ranking
  preferensi(withDistance) {
    return withDistance
      .map(row => ({
        ...row,
        preferensi: (row.dPlus + row.dMinus) > 0
          ? row.dMinus / (row.dPlus + row.dMinus)
          : 0
      }))
      .sort((a, b) => b.preferensi - a.preferensi)
      .map((row, i) => ({ ...row, ranking: i + 1 }));
  },

  // Jalankan semua langkah sekaligus
  hitung(data, kriteria) {
    const { result: normalized, pembagi } = this.normalisasi(data, kriteria);
    const weighted = this.pembobotan(normalized, kriteria);
    const { aPlus, aMinus } = this.solusiIdeal(weighted, kriteria);
    const withDistance = this.jarakEuclidean(weighted, aPlus, aMinus, kriteria);
    const hasil = this.preferensi(withDistance);
    return { normalized, weighted, aPlus, aMinus, pembagi, hasil };
  }
};
