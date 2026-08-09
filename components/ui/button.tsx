import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "bg-[#57C7E3] text-[#0B2138] hover:bg-[#7dd6ec] focus-visible:ring-[#57C7E3]",
        outline:
          "border border-[#2E5D82] bg-transparent text-[#EAF4FB] hover:bg-[#17405f] hover:border-[#4C86AC] focus-visible:ring-[#4C86AC]",
        ghost:
          "bg-transparent text-[#8FB4CC] hover:bg-[#17405f] hover:text-[#EAF4FB] focus-visible:ring-[#4C86AC]",
        destructive:
          "bg-transparent text-[#E2645B] hover:bg-[#E2645B]/10 focus-visible:ring-[#E2645B]",
      },
      size: {
        default: "h-8 px-3",
        sm: "h-7 px-2 text-xs",
        icon: "h-7 w-7 shrink-0 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
