"use client";

import ProfileMenu from "./ProfileMenu";

export default function TopRightToggles() {
  return (
    <div className="top-right-controls">
      <ProfileMenu />
      <div id="haxball-tools-slot" className="haxball-tools-slot" />
    </div>
  );
}
