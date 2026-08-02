"use client";

import Image from "next/image";
import { useState } from "react";

export function avatarInitials(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return displayName.trim().slice(0, 2).toUpperCase() || "?";
}

interface ProfileAvatarProps {
  avatarUrl?: string | null;
  displayName: string;
  large?: boolean;
}

export default function ProfileAvatar({ avatarUrl, displayName, large = false }: ProfileAvatarProps) {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const showImage = Boolean(avatarUrl && failedAvatarUrl !== avatarUrl);

  return (
    <span className={`profile-avatar${large ? " profile-avatar--large" : ""}`} aria-hidden="true">
      {showImage ? (
        <Image
          src={avatarUrl ?? ""}
          alt=""
          width={48}
          height={48}
          unoptimized
          onError={() => setFailedAvatarUrl(avatarUrl ?? null)}
        />
      ) : (
        avatarInitials(displayName)
      )}
    </span>
  );
}
