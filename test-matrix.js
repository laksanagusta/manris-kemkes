const BobotMatrix = [
  [1.0, 1.5, 2.0, 3.0, 4.0],      // Prob 1
  [1.0, 1.8, 1.83, 1.9, 2.1],     // Prob 2
  [1.17, 1.42, 1.43, 1.46, 1.47], // Prob 3
  [1.2, 1.19, 1.3, 1.16, 1.2],    // Prob 4
  [1.5, 1.4, 1.13, 1.15, 1.0],    // Prob 5
];

for(let p=1; p<=5; p++) {
  for(let i=1; i<=5; i++) {
    const bobot = BobotMatrix[p-1][i-1];
    const nilai = Math.round(p * i * bobot * 100) / 100;
    console.log(`Prob: ${p}, Impact: ${i}, Nilai: ${nilai}`);
  }
}
