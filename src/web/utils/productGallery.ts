export const GALLERY_INTERVAL_MS = 5000;
export const GALLERY_INTERACTION_DELAY_MS = 8000;

export function galleryIndex(current: number, step: number, count: number): number {
  if (count <= 1) return 0;
  return ((current + step) % count + count) % count;
}

export function gallerySwipeStep(deltaX: number, deltaY: number): number {
  if (Math.abs(deltaX) < 45 || Math.abs(deltaX) <= Math.abs(deltaY)) return 0;
  return deltaX < 0 ? 1 : -1;
}

export type GalleryTimerState = {
  count: number;
  playing: boolean;
  hovered: boolean;
  focused: boolean;
  visible: boolean;
  waitUntil: number;
};

export function scheduleGalleryAdvance(state: GalleryTimerState, advance: () => void): () => void {
  if (state.count <= 1 || !state.playing || state.hovered || state.focused || !state.visible) return () => {};
  const delay = Math.max(GALLERY_INTERVAL_MS, state.waitUntil - Date.now());
  const timer = setTimeout(advance, delay);
  return () => clearTimeout(timer);
}
