import { forwardRef, type ComponentProps } from "react";

/** Reference-shaped paperclip; standalone counterpart: public/icons/attachment.svg. */
export const AttachmentIcon = forwardRef<SVGSVGElement, ComponentProps<"svg">>(
  function AttachmentIcon(props, ref) {
    return (
      <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
        <path d="m20.5 11.5-8.3 8.3a5.5 5.5 0 0 1-7.8-7.8l8.3-8.3a3.7 3.7 0 0 1 5.2 5.2l-8.3 8.3a1.8 1.8 0 0 1-2.6-2.6l7.7-7.7" />
      </svg>
    );
  },
);
