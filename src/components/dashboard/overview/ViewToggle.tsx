"use client";

import { LayoutGrid, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ViewMode = "cards" | "list";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center rounded-lg border bg-muted/30 p-1">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3",
          value === "cards" && "bg-background shadow-sm"
        )}
        onClick={() => onChange("cards")}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="sr-only">Card view</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3",
          value === "list" && "bg-background shadow-sm"
        )}
        onClick={() => onChange("list")}
      >
        <List className="h-4 w-4" />
        <span className="sr-only">List view</span>
      </Button>
    </div>
  );
}
