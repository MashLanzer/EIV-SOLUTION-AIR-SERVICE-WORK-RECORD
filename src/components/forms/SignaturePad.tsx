"use client";

import {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser, PenLine } from "lucide-react";

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
    const [isEmpty, setIsEmpty] = useState(true);

    useImperativeHandle(ref, () => ({
      getDataUrl: () => {
        if (mode === "preview") return defaultValue ?? null;
        const pad = sigRef.current;
        if (!pad || pad.isEmpty()) return null;
        return pad.getTrimmedCanvas().toDataURL("image/png");
      },
    }));

    // Keep the canvas bitmap in sync with its CSS size (and device pixel
    // ratio), redrawing existing strokes - otherwise strokes land offset
    // from the finger after a rotation/resize, or get cleared entirely.
    useEffect(() => {
      if (mode !== "draw") return;
      const pad = sigRef.current;
      const canvas = pad?.getCanvas();
      if (!pad || !canvas) return;

      const resize = () => {
        const data = pad.toData();
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d")?.scale(ratio, ratio);
        pad.fromData(data);
      };

      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(canvas);
      return () => observer.disconnect();
    }, [mode]);

    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
          {mode === "draw" ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                sigRef.current?.clear();
                setIsEmpty(true);
              }}
            >
              <Eraser className="h-3.5 w-3.5" />
              Clear
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMode("draw")}
            >
              <PenLine className="h-3.5 w-3.5" />
              Re-sign
            </Button>
          )}
        </div>
        <div className="relative rounded-md border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900">
          {mode === "preview" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={defaultValue}
              alt={`${label} preview`}
              className="h-40 w-full object-contain"
            />
          ) : (
            <>
              {isEmpty && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-slate-300 dark:text-slate-600"
                >
                  <PenLine className="h-6 w-6" />
                  <span className="text-xs">Sign here</span>
                </div>
              )}
              {/* Freehand drawing has no meaningful screen-reader
                  equivalent; the label at least identifies the control so
                  it isn't announced as a blank, unlabeled canvas. */}
              <SignatureCanvas
                ref={sigRef}
                penColor="#0f172a"
                clearOnResize={false}
                onBegin={() => setIsEmpty(false)}
                canvasProps={{
                  className: "w-full h-40 rounded-md",
                  style: { touchAction: "none" },
                  "aria-label": `${label} - draw your signature with your finger, mouse, or stylus`,
                }}
              />
            </>
          )}
        </div>
      </div>
    );
  }
);
