import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

/**
 * A transparent, border-on-focus-only text field. Used for inline-editable
 * fields on the canvas (table name, column name) so the node reads like a
 * clean schematic label rather than a form until the user actually edits it.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full min-w-0 rounded-sm border border-transparent bg-transparent px-1.5 py-1 text-[#EAF4FB] outline-none placeholder:text-[#8FB4CC]/50",
          "hover:border-[#2E5D82] focus:border-[#57C7E3] focus:bg-[#0B2138]/60",
          "nodrag",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
