import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

function withInlineIcon(icon: ReactNode) {
  if (!isValidElement(icon)) return icon;

  return cloneElement(icon as ReactElement<{ "data-icon"?: string }>, {
    "data-icon": "inline-start",
  });
}

export function buttonContent(children: ReactNode, icon?: ReactNode) {
  if (!icon) return children;
  return <>{withInlineIcon(icon)}{children}</>;
}

export function buttonChildWithIcon(children: ReactNode, icon?: ReactNode) {
  if (!icon || !isValidElement(children)) return children;

  const child = children as ReactElement<{ children?: ReactNode }>;
  return cloneElement(child, {
    children: buttonContent(child.props.children, icon),
  });
}
