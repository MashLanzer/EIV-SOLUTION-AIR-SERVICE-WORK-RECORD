// Ref-counted body scroll lock. When several overlays can be open at once
// (e.g. a day sheet with a "start record" sheet on top of it), each one naively
// saving/restoring document.body.style.overflow clobbers the others — the last
// restore can leave the body stuck at "hidden" and the page unscrollable.
// Counting opens instead: lock on the first, restore the original value only
// when the last one closes.
let lockCount = 0;
let savedOverflow = "";

export function lockBodyScroll(): void {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  lockCount += 1;
}

export function unlockBodyScroll(): void {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow;
  }
}
