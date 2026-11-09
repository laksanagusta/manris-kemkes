"use client"

import * as React from "react"
import { cn } from "cn"

function Table({
  className,
  framed = false,
  ...props
}: React.ComponentProps<"table"> & { framed?: boolean }) {
  return (
    <div
      data-slot="table-container"
      data-framed={framed ? "" : undefined}
      className="relative w-full overflow-x-auto"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader(props: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      {...props}
    />
  )
}

function TableBody(props: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "bg-table-footer font-medium text-secondary-foreground [&>tr:first-child>*]:border-t",
        className
      )}
      {...props}
    />
  )
}

function TableRow(props: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      {...props}
    />
  )
}

function TableHead({ className, children, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "text-left align-middle whitespace-nowrap",
        className
      )}
      {...props}
    >
      <div data-table-header-content="">{children}</div>
    </th>
  )
}

function TableCell({ className, children, colSpan, title, ...props }: React.ComponentProps<"td">) {
  const text = typeof children === "string" ? children : undefined;
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "align-middle",
        (!colSpan || colSpan === 1) && (text === undefined ? "whitespace-nowrap" : "truncate"),
        className
      )}
      colSpan={colSpan}
      title={title ?? text}
      {...props}
    >
      {children}
    </td>
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
