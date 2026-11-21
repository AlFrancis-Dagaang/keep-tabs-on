import { useSyncExternalStore } from "react";

const query = "(max-width: 767px)"; // Tailwind's max-md: the sidebar takes over from 768px

function subscribe(onChange: () => void) {
  const list = window.matchMedia(query);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

/** True below 768px. False on the server; only read it inside content that mounts after a tap, so nothing hydrates against it. */
export function usePhone() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
