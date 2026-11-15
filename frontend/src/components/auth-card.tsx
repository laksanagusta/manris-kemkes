import type { ReactNode } from "react";
import { ManriskMark } from "@/components/manrisk-mark";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="w-full gap-6 [--card-spacing:--spacing(5)] sm:[--card-spacing:--spacing(8)]">
      <CardHeader className="justify-items-center gap-1.5 text-center">
        <ManriskMark size={36} className="mb-2" />
        <h1 className="text-xl leading-tight font-semibold tracking-normal">{title}</h1>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent>{children}</CardContent>
      <CardFooter className="flex-col justify-center gap-2 py-4 text-center text-sm text-muted-foreground">
        {footer}
      </CardFooter>
    </Card>
  );
}
