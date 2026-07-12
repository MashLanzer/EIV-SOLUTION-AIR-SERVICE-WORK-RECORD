// A keyboard-only "skip to content" link: hidden until focused (Tab from the
// very top of the page), then it appears and jumps past the nav to the main
// region. Standard a11y affordance so keyboard/screen-reader users don't have
// to tab through the whole header on every page.
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:border focus:border-neutral-200 dark:focus:border-neutral-700 focus:bg-white dark:focus:bg-neutral-900 focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-neutral-900 dark:focus:text-neutral-100 focus:shadow-lg"
    >
      Skip to content
    </a>
  );
}
