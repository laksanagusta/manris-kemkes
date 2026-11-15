export type RiskTransactionKind='initial'|'monitoring'|'revision';
export function riskTransactionKind(record:{transactionKind?:string;mode?:string}):RiskTransactionKind {
 if(record.transactionKind==='initial'||record.transactionKind==='revision'||record.transactionKind==='monitoring') return record.transactionKind;
 return record.mode==='with_profile_revision'?'revision':'monitoring';
}
export function riskTransactionLabel(record:{transactionKind?:string;mode?:string}):string {
 return {initial:'Penilaian awal',monitoring:'Pemantauan',revision:'Revisi profil'}[riskTransactionKind(record)];
}
