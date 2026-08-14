import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// tailwind-merge has to be told about Design System v2's type-role scale.
// The v2 roles (text-body-md, text-label, …) are ADDITIONAL text-* names that
// tailwind-merge's stock config has never seen, so it files them under
// text-color and treats them as conflicting with real colours — silently
// dropping whichever came first. Left unconfigured,
// cn("text-accent-fg", "text-body-md") returns just "text-body-md" and every
// primary button loses its foreground colour with no error anywhere.
// Registering the eight roles as font-size restores the two independent
// groups: a role and a colour coexist, while role-vs-role and colour-vs-colour
// still override last-wins as expected.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "h1",
            "h2",
            "title",
            "body-md",
            "body-sm",
            "label",
            "caption",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
