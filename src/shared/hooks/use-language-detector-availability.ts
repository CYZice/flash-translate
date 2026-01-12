import { useEffect, useState } from "react";
import {
  type LanguageDetectionAvailability,
  languageDetectorManager,
} from "@/shared/utils/language-detector";

interface UseLanguageDetectorAvailabilityOptions {
  enabled?: boolean;
}

export function useLanguageDetectorAvailability(
  options: UseLanguageDetectorAvailabilityOptions = {}
): {
  availability: LanguageDetectionAvailability | null;
  isChecking: boolean;
} {
  const { enabled = true } = options;
  const [availability, setAvailability] =
    useState<LanguageDetectionAvailability | null>(null);
  const [isChecking, setIsChecking] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setAvailability(null);
      setIsChecking(false);
      return;
    }

    let isMounted = true;

    const checkAvailability = async () => {
      setIsChecking(true);
      const result = await languageDetectorManager.checkAvailability();
      if (isMounted) {
        setAvailability(result);
        setIsChecking(false);
      }
    };

    checkAvailability();

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  return { availability, isChecking };
}
