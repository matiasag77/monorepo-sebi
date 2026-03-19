"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SheetContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const SheetContext = React.createContext<SheetContextType>({
  open: false,
  setOpen: () => {},
})

function Sheet({
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen

  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  )
}

function SheetTrigger({
  children,
  asChild,
  className,
  ...props
}: {
  children: React.ReactNode
  asChild?: boolean
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { setOpen } = React.useContext(SheetContext)

  return (
    <button type="button" className={className} onClick={() => setOpen(true)} {...props}>
      {children}
    </button>
  )
}

function SheetContent({
  children,
  className,
  side = "right",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  side?: "left" | "right" | "top" | "bottom"
}) {
  const { open, setOpen } = React.useContext(SheetContext)

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = ""
    }
  }, [open, setOpen])

  if (!open) return null

  const sideClasses = {
    left: "inset-y-0 left-0 w-72 border-r",
    right: "inset-y-0 right-0 w-72 border-l",
    top: "inset-x-0 top-0 h-auto border-b",
    bottom: "inset-x-0 bottom-0 h-auto border-t",
  }

  const slideClasses = {
    left: "animate-slide-in-left",
    right: "animate-slide-in-right",
    top: "animate-slide-in-top",
    bottom: "animate-slide-in-bottom",
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          "fixed z-50 bg-zinc-950 border-zinc-800 p-6 shadow-xl transition-transform duration-300",
          sideClasses[side],
          className
        )}
        {...props}
      >
        {children}
        <button
          type="button"
          className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 text-zinc-400 hover:text-white"
          onClick={() => setOpen(false)}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </>
  )
}

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold text-white", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-zinc-400", className)} {...props} />
  )
}

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription }
