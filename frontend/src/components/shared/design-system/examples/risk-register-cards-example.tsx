import { Badge } from "@/components/ui/badge";
import { RiskRegisterCards } from "../domain/risk-register-cards";
import { getRiskLevelDisplayLabel, getRiskLevelFromNilai, levelToColor } from "@/lib/risk";

export function RiskRegisterCardsExample() {
  const examples = [
    { id: "contoh-1", title: "Keterlambatan distribusi persediaan", code: "RSK-001", score: 12 },
    { id: "contoh-2", title: "Keterlambatan verifikasi stok", code: "RSK-002", score: 8 },
  ];
  return (
    <RiskRegisterCards groups={[{
      category: "operasional",
      items: examples.map(({ score, ...item }) => {
        const level = getRiskLevelFromNilai(score);
        return {
          ...item,
          score: String(score),
          level: <Badge variant="outline" className={levelToColor(level)}>{getRiskLevelDisplayLabel(level)}</Badge>,
          status: <Badge variant="secondary">Final</Badge>,
        };
      }),
    }]} />
  );
}
