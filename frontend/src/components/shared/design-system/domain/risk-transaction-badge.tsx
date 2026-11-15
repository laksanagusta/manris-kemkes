import { Badge } from '@/components/ui/badge';
import { riskTransactionLabel } from '@/lib/risk-transaction-kind';
export function RiskTransactionBadge({record}:{record:{transactionKind?:string;mode?:string}}) {return <Badge variant="outline">{riskTransactionLabel(record)}</Badge>;}
