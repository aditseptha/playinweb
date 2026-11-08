"use client";

import { useEffect, useRef, useState } from "react";

let stopCurrent: (() => void) | null = null;

function claim(stop: () => void) {
  if (stopCurrent && stopCurrent !== stop) stopCurrent();
  stopCurrent = stop;
}

function release(stop: () => void) {
  if (stopCurrent === stop) stopCurrent = null;
}

export function canPlayClipOnHover() {
  if (typeof window === "undefined") return false;
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const narrow = window.matchMedia("(max-width: 760px)").matches;
  const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  return fine && !reduce && !saveData && !narrow;
}

/** Muted loop mounted only while a card or peek is actually showing it. */
export function PreviewClip({
  url,
  kind,
  onDisplace,
  className = "absolute inset-0 h-full w-full object-cover",
}: {
  url: string;
  kind: "video" | "gif";
  onDisplace?: () => void;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const displaceRef = useRef(onDisplace);

  useEffect(() => {
    displaceRef.current = onDisplace;
  }, [onDisplace]);

  useEffect(() => {
    const stop = () => displaceRef.current?.();
    claim(stop);
    const video = videoRef.current;
    if (video) void video.play().catch(() => undefined);
    return () => {
      video?.pause();
      release(stop);
    };
  }, [url]);

  if (kind === "gif") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" className={className} />
    );
  }
  return <video ref={videoRef} src={url} muted loop playsInline preload="none" className={className} />;
}

export function useCardClip(url?: string) {
  const [hot, setHot] = useState(false);
  const [paused, setPaused] = useState(false);
  const playing = Boolean(url) && hot && !paused && canPlayClipOnHover();
  return {
    playing,
    onEnter: () => {
      if (url && canPlayClipOnHover()) setHot(true);
    },
    onLeave: () => {
      setHot(false);
      setPaused(false);
    },
    pause: () => setPaused(true),
  };
}
