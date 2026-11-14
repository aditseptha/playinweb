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
  const ref = useCallback((img: HTMLImageElement | null) => {
    if (img) setState(img.complete && img.naturalWidth > 0 ? "done" : "loading");
  }, []);
  // A broken image stops the shimmer too: waiting forever reads as "still loading".
  const done = useCallback(() => setState("done"), []);
  const cls = cn(className, "transition-[transform,opacity]", state === "loading" && "opacity-0");

  return (
    <>
      {state === "done" ? null : <span aria-hidden data-image-wait="" className="pw-shimmer absolute inset-0" />}
      {optimize ? (
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
          onError={done}
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
          onError={done}
        />
      )}
    </>
  );
}
