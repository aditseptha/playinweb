"use client";

import Image from "next/image";
import { useCallback, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";

type Props = {
  src: string;
  /** Through next/image (our storage and allowed hosts) or a plain <img>. */
  optimize: boolean;
  sizes?: string;
  quality?: number;
  priority?: boolean;
  className?: string;
  style?: CSSProperties;
};

/**
 * A cover image with a shimmer behind it until it arrives, then a fade in (#45), so a card is never
 * an empty box while its picture loads. Fills its positioned parent.
 *
 * Without JavaScript, or for an image the browser already has, it shows straight away: the image
 * only starts hidden once the page knows it is still loading.
 */
export function WaitingImage(props: Props) {
  // A new picture starts over.
  return <Waiting key={props.src} {...props} />;
}

function Waiting({ src, optimize, sizes, quality, priority = false, className, style }: Props) {
  const [state, setState] = useState<"unknown" | "loading" | "done">("unknown");
  // The optimizer can refuse a new cover (quota, or a size this browser has not cached).
  // The file on storage still displays, so use that instead of leaving a blank card.
  const [direct, setDirect] = useState(false);
  const done = useCallback(() => setState("done"), []);
  const fail = useCallback(() => {
    if (optimize && !direct) {
      setDirect(true);
      setState("loading");
      return;
    }
    setState("done");
  }, [optimize, direct]);
  const ref = useCallback(
    (img: HTMLImageElement | null) => {
      if (!img) return;
      const reveal = () => {
        if (img.naturalWidth > 0) setState("done");
        else if (img.complete) fail();
      };
      if (img.complete) {
        reveal();
        return;
      }
      setState("loading");
      img.addEventListener("load", reveal, { once: true });
      img.addEventListener("error", () => fail(), { once: true });
      if (img.complete) reveal();
    },
    [fail],
  );
  const cls = cn(className, "transition-[transform,opacity]", state === "loading" && "opacity-0");
  const optimized = optimize && !direct;

  return (
    <>
      {state === "done" ? null : <span aria-hidden data-image-wait="" className="pw-shimmer absolute inset-0" />}
      {optimized ? (
        <Image
          ref={ref}
          src={src}
          alt=""
          fill
          sizes={sizes}
          quality={quality}
          preload={priority}
          className={cls}
          style={style}
          onLoad={done}
          onError={fail}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={ref}
          src={src}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={cn("absolute inset-0 size-full", cls)}
          style={style}
          onLoad={done}
          onError={fail}
        />
      )}
    </>
  );
}
