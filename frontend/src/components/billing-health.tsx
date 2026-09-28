import { Button } from "@/components/ui/button";
import { IllustratedEmptyState } from "@/components/shared/design-system";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DashboardCard } from "@/components/dashboard-card";
import { ArrowRightIcon } from "@/components/shared/icons";
import Link from "next/link";

export function BillingHealth() {
	return (
		<DashboardCard className="gap-0">
			<CardHeader className="">
				<CardTitle className="text-balance">Billing health</CardTitle>
				<CardDescription className="text-pretty">
					Nothing urgent needs your attention.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex h-full items-center">
				<IllustratedEmptyState
					title="You&apos;re caught up."
					description="Balances and payouts look fine. Nothing is overdue in this snapshot."
					action={
						<Button asChild variant="ghost">
							<Link href="/#">
								Review open invoices
								<ArrowRightIcon aria-hidden="true" />
							</Link>
						</Button>
					}
				/>
			</CardContent>
		</DashboardCard>
	);
}
