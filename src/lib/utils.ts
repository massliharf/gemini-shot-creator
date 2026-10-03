import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge, projeye özel tipografi sınıflarını (text-heading-*, text-overline …)
 * ve font-size ölçeğini tanımazsa bunları renk sınıfı sanıp `text-muted-foreground`
 * ile çakıştırarak siler. Özel ölçek burada tanıtılır.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "2xs",
            "overline",
            "display-lg",
            "heading-xl",
            "heading-lg",
            "heading-md",
            "heading-sm",
            "heading-xs",
            "body-lg",
            "body-md",
            "body-sm",
            "label-lg",
            "label-md",
            "label-sm",
            "caption",
            "micro",
            "code",
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
