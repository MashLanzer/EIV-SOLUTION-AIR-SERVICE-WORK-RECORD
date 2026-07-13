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
import { useT } from "@/components/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

export interface SignaturePadHandle {
  getDataUrl: () => string | null;
}

interface SignaturePadProps {
  label: string;
  defaultValue?: string;
  className?: string;
  error?: string;
  id?: string;
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  function SignaturePad({ label, defaultValue, className, error, id }, ref) {
    const t = useT().form;
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
      <div id={id} className={cn("flex flex-col gap-2 scroll-mt-4", className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
          {mode === "draw" ? (
            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={() => {
                sigRef.current?.clear();
                setIsEmpty(true);
              }}
            >
              <Eraser className="h-3.5 w-3.5" />
              {t.clearSignature}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="default"
              onClick={() => setMode("draw")}
            >
              <PenLine className="h-3.5 w-3.5" />
              {t.reSign}
            </Button>
          )}
        </div>
        {/* The pad is always a white "sheet of paper" with dark ink, even in
            dark mode - a dark pad would hide the near-black signature and is
            what a signer expects to write on. */}
        <div
          className={cn(
            "relative rounded-md border-2 border-dashed bg-white",
            error ? "border-destructive" : "border-neutral-300 dark:border-neutral-700"
          )}
        >
          {mode === "preview" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={defaultValue}
              alt={t.signaturePreview.replace("{label}", label)}
              className="h-40 w-full object-contain"
            />
          ) : (
            <>
              {isEmpty && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-neutral-300"
                >
                  <PenLine className="h-6 w-6" />
                  <span className="text-xs">{t.signHere}</span>
                </div>
              )}
              {/* Freehand drawing has no meaningful screen-reader
                  equivalent; the label at least identifies the control so
                  it isn't announced as a blank, unlabeled canvas. */}
              <SignatureCanvas
                ref={sigRef}
                penColor="#171717"
                clearOnResize={false}
                onBegin={() => setIsEmpty(false)}
                canvasProps={{
                  className: "w-full h-40 rounded-md",
                  style: { touchAction: "none" },
                  "aria-label": t.drawSignatureHint.replace("{label}", label),
                }}
              />
            </>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
