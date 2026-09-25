import * as React from "react";

import { Card } from "@/components/ui/card";

export function ListGroup(props: React.ComponentProps<typeof Card>) {
  return <Card data-slot="list-group" {...props} />;
}
