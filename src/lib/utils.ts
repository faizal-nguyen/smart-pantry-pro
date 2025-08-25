import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Platform utility for cross-platform styling
export const Platform = {
  select<T>(
    platformValues: {
      ios?: T;
      android?: T;
      web?: T;
      default: T;
    }
  ): T {
    // In a web environment, always return web or default
    return platformValues.web ?? platformValues.default;
  },
  
  OS: 'web' as const,
  
  isWeb: true,
  isIOS: false,
  isAndroid: false,
};
