import { PeriodProcessProgress } from '../domain/period-process-progress';
export function ProfilePeriodProgressExample() {
  return <section className="space-y-4" aria-label="Progres periode profil">
    <h3 className="text-sm font-medium">Progres per periode</h3>
    <div className="grid max-w-2xl gap-6 sm:grid-cols-3">
      <PeriodProcessProgress label="Kertas kerja" progress={{status:'ongoing',completed:2,total:4}} unit="penandatangan" />
      <PeriodProcessProgress label="Evaluasi" progress={{status:'ongoing',completed:20,total:20}} unit="poin" />
      <PeriodProcessProgress label="Pemantauan" progress={{status:'done',completed:4,total:4}} />
      <PeriodProcessProgress label="Pemantauan" progress={{status:'pending',completed:0,total:0}} />
    </div>
  </section>;
}
