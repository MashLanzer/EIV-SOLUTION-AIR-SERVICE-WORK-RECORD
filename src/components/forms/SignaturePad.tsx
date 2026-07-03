"use client";

import { useRef, useState, useImperativeHandle, forwardRef } from "react";
import SignatureCanvas from "react-signature-canvas";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SignaturePadHandle {
  getDataUrl: () => string | null;
}

interface SignaturePadProps {
  label: string;
  defaultValue?: string;
  className?: string;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ label, defaultValue, className }, ref) {
    const sigRef = useRef<SignatureCanvas>(null);
    const [mode, setMode] = useState<"preview" | "draw">(
      defaultValue ? "preview" : "draw"
    );

    useImperativeHandle(ref, () => ({
      getDataUrl: () => {
        if (mode === "preview") return defaultValue ?? null;
        const pad = sigRef.current;
        if (!pad || pad.isEmpty()) return null;
        return pad.getTrimmedCanvas().toDataURL("image/png");
      },
    }));

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          {mode === "draw" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => sigRef.current?.clear()}
            >
              Clear
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMode("draw")}
            >
              Re-sign
            </Button>
          )}
        </div>
        <div className="rounded-md border border-slate-300 bg-white">
          {mode === "preview" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={defaultValue}
              alt={`${label} preview`}
              className="h-40 w-full object-contain"
            />
          ) : (
            <SignatureCanvas
              ref={sigRef}
              penColor="black"
              canvasProps={{
                className: "w-full h-40 rounded-md",
                style: { touchAction: "none" },
              }}
            />
          )}
        </div>
      </div>
    );
  }
);
