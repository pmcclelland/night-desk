type FsDoc = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

type FsEl = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

export function nativeFullscreenElement(): Element | null {
  const doc = document as FsDoc;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

export function isNativeFullscreen(): boolean {
  return Boolean(nativeFullscreenElement());
}

export async function requestNativeFullscreen(el: HTMLElement): Promise<boolean> {
  const node = el as FsEl;
  try {
    if (node.requestFullscreen) {
      await node.requestFullscreen({ navigationUI: "hide" });
      return true;
    }
    if (node.webkitRequestFullscreen) {
      await node.webkitRequestFullscreen();
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function exitNativeFullscreen(): Promise<void> {
  if (!isNativeFullscreen()) return;
  const doc = document as FsDoc;
  const fn = document.exitFullscreen ?? doc.webkitExitFullscreen;
  if (!fn) return;
  try {
    await fn.call(document);
  } catch {
    /* already out */
  }
}

export function subscribeFullscreen(cb: () => void): () => void {
  document.addEventListener("fullscreenchange", cb);
  document.addEventListener("webkitfullscreenchange", cb);
  return () => {
    document.removeEventListener("fullscreenchange", cb);
    document.removeEventListener("webkitfullscreenchange", cb);
  };
}
