import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronLeft, ChevronRight, Clock3, ImagePlus, Pause, Play } from "lucide-react";
import { StorefrontImage } from "../../config/products";
import {
  GALLERY_INTERACTION_DELAY_MS,
  galleryIndex,
  gallerySwipeStep,
  scheduleGalleryAdvance,
} from "../utils/productGallery";

type ProductGalleryProps = {
  images: StorefrontImage[];
  productName: string;
};

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [waitUntil, setWaitUntil] = useState(0);
  const pointerOrigin = useRef<{ x: number; y: number; id: number } | null>(null);
  const touchInteraction = useRef(false);
  const thumbnailStrip = useRef<HTMLDivElement>(null);
  const count = images.length;
  const index = activeIndex < count ? activeIndex : 0;
  const rotating = playing && !hovered && !focused && visible;

  useEffect(() => {
    setActiveIndex(0);
  }, [count]);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPlaying(!preference.matches);
    const syncVisibility = () => setVisible(document.visibilityState === "visible");
    syncPreference();
    syncVisibility();
    preference.addEventListener("change", syncPreference);
    document.addEventListener("visibilitychange", syncVisibility);
    return () => {
      preference.removeEventListener("change", syncPreference);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  }, []);

  useEffect(
    () =>
      scheduleGalleryAdvance(
        { count, playing, hovered, focused, visible, waitUntil },
        () => {
          setActiveIndex((current) => galleryIndex(current, 1, count));
        }
      ),
    [activeIndex, count, playing, hovered, focused, visible, waitUntil]
  );

  useEffect(() => {
    const strip = thumbnailStrip.current;
    const button = strip?.children[index] as HTMLElement | undefined;
    if (!strip || !button) return;
    const item = button.getBoundingClientRect();
    const frame = strip.getBoundingClientRect();
    if (item.left < frame.left) {
      strip.scrollBy({ left: item.left - frame.left, behavior: "smooth" });
    } else if (item.right > frame.right) {
      strip.scrollBy({ left: item.right - frame.right, behavior: "smooth" });
    }
  }, [index]);

  function chooseImage(next: number) {
    setActiveIndex(galleryIndex(next, 0, count));
    setWaitUntil(Date.now() + GALLERY_INTERACTION_DELAY_MS);
  }

  function moveImage(step: number) {
    setActiveIndex((current) => galleryIndex(current, step, count));
    setWaitUntil(Date.now() + GALLERY_INTERACTION_DELAY_MS);
  }

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (count <= 1) return;
    touchInteraction.current = false;
    setFocused(true);
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      moveImage(event.key === "ArrowLeft" ? 1 : -1);
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      chooseImage(event.key === "Home" ? 0 : count - 1);
    }
  }

  return (
    <div
      className="product-gallery clock-carousel"
      role="region"
      aria-roledescription="معرض صور"
      aria-label={`صور ${productName}`}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onPointerDownCapture={(event) => {
        touchInteraction.current = event.pointerType === "touch";
      }}
      onFocusCapture={() => {
        if (!touchInteraction.current) setFocused(true);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      onKeyDown={handleKey}
    >
      <div className="gallery-stage">
        <div
          className="product-frame carousel-frame"
          tabIndex={count > 1 ? 0 : undefined}
          aria-label={count ? `الصورة ${index + 1} من ${count}؛ استخدم الأسهم للتنقل` : "لا توجد صور بعد"}
          onPointerDown={(event) => {
            if (event.pointerType === "mouse" || count <= 1) return;
            pointerOrigin.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
            setWaitUntil(Date.now() + GALLERY_INTERACTION_DELAY_MS);
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            const start = pointerOrigin.current;
            pointerOrigin.current = null;
            if (!start || start.id !== event.pointerId) return;
            const step = gallerySwipeStep(event.clientX - start.x, event.clientY - start.y);
            if (step) moveImage(step);
          }}
          onPointerCancel={() => {
            pointerOrigin.current = null;
          }}
        >
          {count ? (
            images.map((image, position) => (
              <div
                key={image.id}
                className={`carousel-slide ${position === index ? "is-active" : ""}`}
                aria-hidden={position !== index}
              >
                <img
                  src={image.url}
                  alt={`${productName} — صورة ${position + 1}`}
                  draggable={false}
                  decoding="async"
                  style={{
                    objectFit: image.fit ?? "contain",
                    width: `${image.scale ?? 100}%`,
                    height: `${image.scale ?? 100}%`,
                  }}
                />
              </div>
            ))
          ) : (
            <div className="product-empty-state">
              <span>
                <Clock3 size={54} strokeWidth={1.1} />
              </span>
              <strong>صور ساعتك الجدارية</strong>
              <small>اختر الساعة لرؤية صورها هنا</small>
              <ImagePlus size={17} />
            </div>
          )}
        </div>
        {count > 1 && (
          <>
            <button
              className="gallery-arrow gallery-arrow-previous"
              type="button"
              aria-label="الصورة السابقة"
              onClick={() => moveImage(-1)}
            >
              <ChevronRight size={23} strokeWidth={1.8} />
            </button>
            <button
              className="gallery-arrow gallery-arrow-next"
              type="button"
              aria-label="الصورة التالية"
              onClick={() => moveImage(1)}
            >
              <ChevronLeft size={23} strokeWidth={1.8} />
            </button>
          </>
        )}
      </div>
      {count > 1 && (
        <>
          <div className="gallery-toolbar">
            <button
              className="gallery-playback"
              type="button"
              aria-label={playing ? "إيقاف تبديل الصور التلقائي" : "تشغيل تبديل الصور التلقائي"}
              aria-pressed={playing}
              onClick={() => {
                if (!playing) setFocused(false);
                setPlaying((current) => !current);
                setWaitUntil(0);
              }}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
              <span>{playing ? "إيقاف التبديل" : "تشغيل التبديل"}</span>
            </button>
            <span
              className="gallery-counter"
              dir="ltr"
              aria-live={rotating ? "off" : "polite"}
              aria-atomic="true"
            >
              {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            </span>
          </div>
          <div className="gallery-thumbnails" ref={thumbnailStrip} aria-label="اختيار صورة المنتج">
            {images.map((image, position) => (
              <button
                type="button"
                key={image.id}
                aria-label={`عرض الصورة ${position + 1}`}
                aria-pressed={position === index}
                onClick={() => chooseImage(position)}
              >
                <img src={image.url} alt="" draggable={false} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
