"use client";

import { useServerInsertedHTML } from "next/navigation";
import { INTRO_SKIP_SCRIPT } from "./intro-curtain";

export function IntroSkipInjector() {
  useServerInsertedHTML(() => {
    return (
      <script
        dangerouslySetInnerHTML={{
          __html: INTRO_SKIP_SCRIPT,
        }}
      />
    );
  });

  return null;
}
