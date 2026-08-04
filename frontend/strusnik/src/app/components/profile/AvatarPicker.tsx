"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Check, Crosshair, ImagePlus, Move, X, ZoomIn } from "lucide-react";
import { useLang } from "@/app/lang";
import { t } from "@/app/i18n";
import ProfileAvatar from "./ProfileAvatar";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const DEFAULT_CROP_SIZE = 280;
const CROP_OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type Point = { x: number; y: number };

type ImageDraft = {
  src: string;
  width: number;
  height: number;
};

type ImageMetrics = {
  width: number;
  height: number;
};

interface AvatarPickerProps {
  avatarUrl?: string | null;
  displayName: string;
  inputId: string;
  large?: boolean;
  onUploaded: (avatarUrl: string | null) => void;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unable to read image."));
    };
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  });
}

function readImageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Unable to load image."));
    image.src = src;
  });
}

function getImageMetrics(image: ImageDraft, cropSize: number, zoom: number): ImageMetrics {
  const baseScale = Math.max(cropSize / image.width, cropSize / image.height);
  return {
    width: image.width * baseScale * zoom,
    height: image.height * baseScale * zoom,
  };
}

function clampPosition(position: Point, imageMetrics: ImageMetrics, cropSize: number): Point {
  return {
    x: Math.min(0, Math.max(cropSize - imageMetrics.width, position.x)),
    y: Math.min(0, Math.max(cropSize - imageMetrics.height, position.y)),
  };
}

function centeredPosition(imageMetrics: ImageMetrics, cropSize: number): Point {
  return clampPosition(
    {
      x: (cropSize - imageMetrics.width) / 2,
      y: (cropSize - imageMetrics.height) / 2,
    },
    imageMetrics,
    cropSize,
  );
}

function renderCroppedAvatar(
  image: ImageDraft,
  cropSize: number,
  position: Point,
  imageMetrics: ImageMetrics,
) {
  return new Promise<string>((resolve, reject) => {
    const source = new window.Image();
    source.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = CROP_OUTPUT_SIZE;
        canvas.height = CROP_OUTPUT_SIZE;
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Unable to prepare image."));
          return;
        }

        const outputScale = CROP_OUTPUT_SIZE / cropSize;
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(
          source,
          position.x * outputScale,
          position.y * outputScale,
          imageMetrics.width * outputScale,
          imageMetrics.height * outputScale,
        );
        resolve(canvas.toDataURL("image/jpeg", 0.92));
      } catch (error) {
        reject(error);
      }
    };
    source.onerror = () => reject(new Error("Unable to prepare image."));
    source.src = image.src;
  });
}

export default function AvatarPicker({
  avatarUrl,
  displayName,
  inputId,
  large = false,
  onUploaded,
}: AvatarPickerProps) {
  const { lang } = useLang();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const cropViewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState("");
  const [draftImage, setDraftImage] = useState<ImageDraft | null>(null);
  const [cropPosition, setCropPosition] = useState<Point>({ x: 0, y: 0 });
  const [cropSize, setCropSize] = useState(DEFAULT_CROP_SIZE);
  const cropSizeRef = useRef(DEFAULT_CROP_SIZE);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const errorId = `${inputId}-error`;
  const cropTitleId = `${inputId}-crop-title`;
  const cropInstructionsId = `${inputId}-crop-instructions`;
  const labelKey = avatarUrl ? "profile_menu.avatar_change" : "profile_menu.avatar_add";
  const imageMetrics = draftImage ? getImageMetrics(draftImage, cropSize, zoom) : null;

  const resetInput = useCallback(() => {
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const cancelCrop = useCallback(() => {
    setDraftImage(null);
    setCropPosition({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
    setError("");
    resetInput();
  }, [resetInput]);

  useEffect(() => {
    if (!draftImage) return;
    const viewport = cropViewportRef.current;
    if (!viewport) return;

    const updateCropSize = () => {
      const nextSize = Math.round(viewport.clientWidth);
      if (nextSize <= 0 || nextSize === cropSizeRef.current) return;
      const scale = nextSize / cropSizeRef.current;
      cropSizeRef.current = nextSize;
      setCropPosition((current) => ({ x: current.x * scale, y: current.y * scale }));
      setCropSize(nextSize);
    };

    updateCropSize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateCropSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [draftImage]);

  useEffect(() => {
    if (!draftImage) return;
    const nextMetrics = getImageMetrics(draftImage, cropSize, zoom);
    setCropPosition((current) => clampPosition(current, nextMetrics, cropSize));
  }, [cropSize, draftImage, zoom]);

  useEffect(() => {
    if (!draftImage) return;

    const previousActiveElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const focusFrame = window.requestAnimationFrame(() => {
      const firstControl = dialogRef.current?.querySelector<HTMLElement>("[data-avatar-dialog-focus]");
      (firstControl ?? dialogRef.current)?.focus();
    });
    const backgroundElements = Array.from(document.body.children).filter(
      (element) => element.getAttribute("data-avatar-modal-root") !== "true",
    );
    const previouslyInert = new Map<Element, boolean>();
    backgroundElements.forEach((element) => {
      previouslyInert.set(element, element.hasAttribute("inert"));
      if (!element.hasAttribute("inert")) element.setAttribute("inert", "");
    });

    const handleDialogKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        cancelCrop();
        return;
      }
      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex='-1'])",
      ));
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleDialogKeyDown);
      backgroundElements.forEach((element) => {
        if (!previouslyInert.get(element)) element.removeAttribute("inert");
      });
      previousActiveElement?.focus({ preventScroll: true });
    };
  }, [cancelCrop, draftImage]);

  const prepareCrop = async (file: File) => {
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError(t(lang, "profile_menu.avatar_type_error"));
      resetInput();
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError(t(lang, "profile_menu.avatar_size_error"));
      resetInput();
      return;
    }

    setIsPreparing(true);
    setError("");
    try {
      const avatarData = await readFileAsDataUrl(file);
      const dimensions = await readImageDimensions(avatarData);
      if (!dimensions.width || !dimensions.height) throw new Error("Unable to load image.");
      const nextDraft = { src: avatarData, ...dimensions };
      const nextMetrics = getImageMetrics(nextDraft, cropSize, MIN_ZOOM);
      setDraftImage(nextDraft);
      setZoom(MIN_ZOOM);
      setCropPosition(centeredPosition(nextMetrics, cropSize));
    } catch {
      setError(t(lang, "profile_menu.avatar_error"));
      resetInput();
    } finally {
      setIsPreparing(false);
    }
  };

  const handleZoomChange = (nextZoom: number) => {
    if (!draftImage || !imageMetrics) return;
    const safeZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
    const nextMetrics = getImageMetrics(draftImage, cropSize, safeZoom);
    setCropPosition((current) => {
      const focalX = (cropSize / 2 - current.x) / imageMetrics.width;
      const focalY = (cropSize / 2 - current.y) / imageMetrics.height;
      return clampPosition(
        {
          x: cropSize / 2 - focalX * nextMetrics.width,
          y: cropSize / 2 - focalY * nextMetrics.height,
        },
        nextMetrics,
        cropSize,
      );
    });
    setZoom(safeZoom);
  };

  const moveCrop = (delta: Point) => {
    if (!imageMetrics) return;
    setCropPosition((current) => clampPosition({
      x: current.x + delta.x,
      y: current.y + delta.y,
    }, imageMetrics, cropSize));
  };

  const handleCropPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isUploading || !imageMetrics) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: cropPosition.x,
      originY: cropPosition.y,
    };
  };

  const handleCropPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !imageMetrics) return;
    setCropPosition(clampPosition({
      x: drag.originX + event.clientX - drag.startX,
      y: drag.originY + event.clientY - drag.startY,
    }, imageMetrics, cropSize));
  };

  const handleCropPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleCropKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 24 : 8;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      moveCrop({ x: 0, y: -step });
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      moveCrop({ x: 0, y: step });
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveCrop({ x: -step, y: 0 });
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveCrop({ x: step, y: 0 });
    } else if (event.key === "Home") {
      event.preventDefault();
      if (imageMetrics) setCropPosition(centeredPosition(imageMetrics, cropSize));
    }
  };

  const saveCrop = async () => {
    if (!draftImage || !imageMetrics || isUploading) return;

    setIsUploading(true);
    setError("");
    try {
      const avatarData = await renderCroppedAvatar(draftImage, cropSize, cropPosition, imageMetrics);
      const response = await fetch("/api/profile/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatar_url: avatarData }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t(lang, "profile_menu.avatar_error"));
      onUploaded(data.avatar_url ?? avatarData);
      setDraftImage(null);
      setCropPosition({ x: 0, y: 0 });
      setZoom(MIN_ZOOM);
      resetInput();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : t(lang, "profile_menu.avatar_error"));
    } finally {
      setIsUploading(false);
    }
  };

  const cropDialog = draftImage && imageMetrics ? (
    <div
      className="avatar-cropper__layer"
      data-avatar-modal-root="true"
      onMouseDown={(event) => {
        if (!isUploading && event.target === event.currentTarget) cancelCrop();
      }}
    >
      <div
        className="avatar-cropper__backdrop"
        aria-hidden="true"
        onMouseDown={() => {
          if (!isUploading) cancelCrop();
        }}
      />
      <div
        ref={dialogRef}
        className="avatar-cropper__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={cropTitleId}
        aria-describedby={cropInstructionsId}
        tabIndex={-1}
      >
        <header className="avatar-cropper__header">
          <div>
            <h2 id={cropTitleId}>{t(lang, "profile_menu.avatar_crop_title")}</h2>
            <p id={cropInstructionsId}>{t(lang, "profile_menu.avatar_crop_description")}</p>
          </div>
          <button
            type="button"
            className="avatar-cropper__icon-button"
            onClick={cancelCrop}
            disabled={isUploading}
            data-avatar-dialog-focus
            aria-label={t(lang, "profile_menu.avatar_close")}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="avatar-cropper__preview-shell">
          <div
            ref={cropViewportRef}
            className="avatar-cropper__viewport"
            role="region"
            tabIndex={0}
            aria-label={t(lang, "profile_menu.avatar_crop_preview")}
            onPointerDown={handleCropPointerDown}
            onPointerMove={handleCropPointerMove}
            onPointerUp={handleCropPointerUp}
            onPointerCancel={handleCropPointerUp}
            onKeyDown={handleCropKeyDown}
          >
            {/* Native img keeps the crop preview independent from Next image sizing. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draftImage.src}
              alt={t(lang, "profile_menu.avatar_crop_preview")}
              draggable={false}
              style={{
                width: `${imageMetrics.width}px`,
                height: `${imageMetrics.height}px`,
                left: `${cropPosition.x}px`,
                top: `${cropPosition.y}px`,
              }}
            />
            <span className="avatar-cropper__guide" aria-hidden="true" />
          </div>
          <p className="avatar-cropper__hint">
            <Move size={14} aria-hidden="true" />
            {t(lang, "profile_menu.avatar_crop_instructions")}
          </p>
        </div>

        <div className="avatar-cropper__controls">
          <label className="avatar-cropper__zoom-label" htmlFor={`${inputId}-zoom`}>
            <span><ZoomIn size={15} aria-hidden="true" />{t(lang, "profile_menu.avatar_zoom")}</span>
            <output aria-live="polite">{Math.round(zoom * 100)}%</output>
          </label>
          <input
            id={`${inputId}-zoom`}
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step="0.05"
            value={zoom}
            onChange={(event) => handleZoomChange(Number(event.target.value))}
            disabled={isUploading}
            aria-label={t(lang, "profile_menu.avatar_zoom")}
          />
          <button
            type="button"
            className="avatar-cropper__center-button"
            onClick={() => imageMetrics && setCropPosition(centeredPosition(imageMetrics, cropSize))}
            disabled={isUploading}
          >
            <Crosshair size={15} aria-hidden="true" />
            {t(lang, "profile_menu.avatar_center")}
          </button>
        </div>

        {error && <p className="avatar-cropper__error" role="alert">{error}</p>}

        <div className="avatar-cropper__actions">
          <button type="button" className="avatar-cropper__secondary" onClick={cancelCrop} disabled={isUploading}>
            {t(lang, "profile_menu.avatar_cancel")}
          </button>
          <button type="button" className="avatar-cropper__primary" onClick={() => void saveCrop()} disabled={isUploading}>
            <Check size={16} aria-hidden="true" />
            {isUploading ? t(lang, "profile_menu.avatar_uploading") : t(lang, "profile_menu.avatar_save")}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="avatar-picker" aria-busy={isUploading || isPreparing}>
        <button
          type="button"
          className="avatar-picker__trigger"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading || isPreparing}
          aria-label={t(lang, isUploading || isPreparing ? "profile_menu.avatar_uploading" : labelKey)}
          aria-controls={inputId}
          aria-describedby={error ? errorId : undefined}
        >
          <ProfileAvatar avatarUrl={avatarUrl} displayName={displayName} large={large} />
          <span className="avatar-picker__badge" aria-hidden="true">
            <ImagePlus size={large ? 16 : 14} strokeWidth={2} />
          </span>
        </button>
        <input
          ref={inputRef}
          id={inputId}
          className="avatar-picker__input"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={isUploading || isPreparing}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void prepareCrop(file);
          }}
          tabIndex={-1}
          aria-hidden="true"
        />
        {error && !draftImage && <p id={errorId} className="avatar-picker__error" role="alert">{error}</p>}
      </div>
      {cropDialog && typeof document !== "undefined" ? createPortal(cropDialog, document.body) : null}
    </>
  );
}
