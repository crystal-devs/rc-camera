// constants/styling.ts - Updated with comprehensive template configurations
interface CoverTemplate {
  name: string;
  description: string;
  layout: string;
  hasImage: boolean;
  height: string;
  textPosition?: string;
  overlay?: string;
  bottomBar?: string;
  special?: string;
  border?: string;
  style: {
    objectFit: string;
    objectPosition: string;
    overlay: { opacity: number; color: string };
    textAlign: string;
    contentPosition: string;
  };
}

interface GalleryLayout {
  name: string;
  description: string;
  icon: string;
  css: Record<string, string>;
  itemStyle: Record<string, string>;
  responsive?: {
    mobile?: Record<string, any>;
    tablet?: Record<string, any>;
    desktop?: Record<string, any>;
  };
}

interface GridSpacing {
  name: string;
  description: string;
  value: string;
  css: { "--grid-spacing": string };
}

interface ThumbnailSize {
  name: string;
  description: string;
  width: number;
  height: number;
  size: string;
  css: {
    "--thumbnail-size": string;
    "--thumbnail-width": string;
    "--thumbnail-height": string;
  };
}

interface Theme {
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    accent: string;
    text: string;
    textSecondary: string;
    border: string;
    success?: string;
    warning?: string;
    error?: string;
  };
  css: Record<string, string>;
}

interface FontSet {
  name: string;
  description: string;
  fonts: {
    primary: string;
    secondary: string;
    mono: string;
  };
  css: {
    "--font-primary": string;
    "--font-secondary": string;
    "--font-mono": string;
  };
}

interface CornerRadius {
  name: string;
  value: string;
  css: { "--border-radius": string };
}

interface Animation {
  name: string;
  description: string;
  css: Record<string, string>;
}

interface NavigationStyle {
  name: string;
  description: string;
  css: Record<string, any>;
}

interface Language {
  name: string;
  flag: string;
  rtl: boolean;
}

interface StylingConstants {
  coverTemplates: Record<number, CoverTemplate>;
  galleryLayouts: Record<number, GalleryLayout>;
  gridSpacing: Record<number, GridSpacing>;
  thumbnailSizes: Record<number, ThumbnailSize>;
  themes: Record<number, Theme>;
  fontsets: Record<number, FontSet>;
  cornerRadius: Record<number, CornerRadius>;
  animations: Record<number, Animation>;
  navigationStyles: Record<number, NavigationStyle>;
  languages: Record<string, Language>;
}

export const STYLING_CONSTANTS: StylingConstants = {
  // Cover Templates - Comprehensive template system from component
  coverTemplates: {
    // No Cover
    0: {
      name: "None",
      description: "No cover section, start directly with gallery",
      layout: "none",
      hasImage: false,
      height: "0px",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0, color: "transparent" },
        textAlign: "center",
        contentPosition: "center"
      }
    },

    // Existing Templates
    1: {
      name: "Center Full Screen",
      description: "Centered overlay text (full viewport height)",
      layout: "fullscreen-center",
      hasImage: true,
      height: "100vh",
      textPosition: "center",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0.4, color: "rgba(0, 0, 0, 0.4)" },
        textAlign: "center",
        contentPosition: "center"
      }
    },
    2: {
      name: "Left Full Screen",
      description: "Left-aligned text (full viewport height)",
      layout: "fullscreen-left",
      hasImage: true,
      height: "100vh",
      textPosition: "left",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0.4, color: "rgba(0, 0, 0, 0.4)" },
        textAlign: "left",
        contentPosition: "left"
      }
    },
    3: {
      name: "Right Full Screen",
      description: "Right-aligned text (full viewport height)",
      layout: "fullscreen-right",
      hasImage: true,
      height: "100vh",
      textPosition: "right",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0.4, color: "rgba(0, 0, 0, 0.4)" },
        textAlign: "right",
        contentPosition: "right"
      }
    },
    4: {
      name: "Center Hero",
      description: "Centered text with hero height (60vh)",
      layout: "fullscreen-center",
      hasImage: true,
      height: "60vh",
      textPosition: "center",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0.4, color: "rgba(0, 0, 0, 0.4)" },
        textAlign: "center",
        contentPosition: "center"
      }
    },
    5: {
      name: "Split Hero Left",
      description: "Split layout with hero height (60vh)",
      layout: "split-left",
      hasImage: true,
      height: "60vh",
      textPosition: "right",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0.3, color: "rgba(0, 0, 0, 0.3)" },
        textAlign: "left",
        contentPosition: "right"
      }
    },

    // NEW ELEGANT TEMPLATES - Border Overlay Templates (100vh)
    8: {
      name: "Simple Border Overlay",
      description: "Clean simple border overlay (full viewport height)",
      layout: "border-overlay-simple",
      hasImage: true,
      height: "100vh",
      textPosition: "center",
      overlay: "border-simple",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0.4, color: "rgba(0, 0, 0, 0.4)" },
        textAlign: "center",
        contentPosition: "center"
      }
    },
    9: {
      name: "Double Border Overlay",
      description: "Elegant double border overlay (full viewport height)",
      layout: "border-overlay-double",
      hasImage: true,
      height: "100vh",
      textPosition: "center",
      overlay: "border-double",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0.3, color: "rgba(0, 0, 0, 0.3)" },
        textAlign: "center",
        contentPosition: "center"
      }
    },
    11: {
      name: "Dashed Border Overlay",
      description: "Stylish dashed border overlay (full viewport height)",
      layout: "border-overlay-dashed",
      hasImage: true,
      height: "100vh",
      textPosition: "center",
      overlay: "border-dashed",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0.3, color: "rgba(0, 0, 0, 0.3)" },
        textAlign: "center",
        contentPosition: "center"
      }
    },

    // Bottom Bar Templates (100vh)
    12: {
      name: "Solid Bottom Bar",
      description: "Solid color bottom information bar (full viewport height)",
      layout: "bottom-bar-solid",
      hasImage: true,
      height: "100vh",
      textPosition: "bottom",
      bottomBar: "solid",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0.2, color: "rgba(0, 0, 0, 0.2)" },
        textAlign: "left",
        contentPosition: "bottom"
      }
    },
    15: {
      name: "Vintage Frame",
      description: "Classic vintage frame style (full viewport height)",
      layout: "vintage-frame",
      hasImage: true,
      height: "100vh",
      textPosition: "center",
      special: "vintage",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0.3, color: "rgba(0, 0, 0, 0.3)" },
        textAlign: "center",
        contentPosition: "center"
      }
    },
    16: {
      name: "Minimalist Frame",
      description: "Minimalist frame style (full viewport height)",
      layout: "minimalist-frame",
      hasImage: true,
      height: "100vh",
      textPosition: "center",
      special: "minimalist",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0.3, color: "rgba(0, 0, 0, 0.3)" },
        textAlign: "center",
        contentPosition: "center"
      }
    }
  },

  // Gallery Layouts
  galleryLayouts: {
    0: {
      name: "Grid",
      description: "Equal sized grid layout",
      icon: "⬜",
      css: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(var(--thumbnail-size), 1fr))",
        gap: "var(--grid-spacing)",
        padding: "var(--grid-spacing)"
      },
      itemStyle: {
        aspectRatio: "1/1",
        borderRadius: "var(--border-radius)",
        overflow: "hidden"
      },
      responsive: {
        mobile: { gridTemplateColumns: "repeat(2, 1fr)" },
        tablet: { gridTemplateColumns: "repeat(3, 1fr)" },
        desktop: { gridTemplateColumns: "repeat(auto-fill, minmax(var(--thumbnail-size), 1fr))" }
      }
    },
    1: {
      name: "Masonry",
      description: "Pinterest-style varying heights",
      icon: "🧱",
      css: {
        columnCount: "auto",
        columnWidth: "var(--thumbnail-size)",
        columnGap: "var(--grid-spacing)",
        padding: "var(--grid-spacing)"
      },
      itemStyle: {
        marginBottom: "var(--grid-spacing)",
        borderRadius: "var(--border-radius)",
        overflow: "hidden",
        breakInside: "avoid",
        display: "inline-block",
        width: "100%"
      },
      responsive: {
        mobile: { columnCount: 2 },
        tablet: { columnCount: 3 },
        desktop: { columnCount: "auto" }
      }
    }
  },

  // Grid Spacing
  gridSpacing: {
    0: {
      name: "Tight",
      description: "Minimal spacing (4px)",
      value: "4px",
      css: { "--grid-spacing": "4px" }
    },
    1: {
      name: "Normal",
      description: "Standard spacing (8px)",
      value: "8px",
      css: { "--grid-spacing": "8px" }
    },
    2: {
      name: "Loose",
      description: "Generous spacing (16px)",
      value: "16px",
      css: { "--grid-spacing": "16px" }
    },
    3: {
      name: "Extra Loose",
      description: "Maximum spacing (24px)",
      value: "24px",
      css: { "--grid-spacing": "24px" }
    }
  },

  // Thumbnail Sizes
  thumbnailSizes: {
    0: {
      name: "Small",
      description: "Compact (180px)",
      width: 180,
      height: 180,
      size: "180px",
      css: {
        "--thumbnail-size": "180px",
        "--thumbnail-width": "180px",
        "--thumbnail-height": "180px"
      }
    },
    1: {
      name: "Medium",
      description: "Standard (250px)",
      width: 250,
      height: 250,
      size: "250px",
      css: {
        "--thumbnail-size": "250px",
        "--thumbnail-width": "250px",
        "--thumbnail-height": "250px"
      }
    },
    2: {
      name: "Large",
      description: "Large (320px)",
      width: 320,
      height: 320,
      size: "320px",
      css: {
        "--thumbnail-size": "320px",
        "--thumbnail-width": "320px",
        "--thumbnail-height": "320px"
      }
    }
  },

  // Themes - Expanded with more options
  themes: {
    1: {
      name: "Sage Elegance",
      description: "Sophisticated sage green with cream and charcoal",
      colors: {
        primary: "#9CAF88",
        secondary: "#F5F5DC",
        background: "#F5F5DC",
        surface: "#F5F5DC",
        accent: "#6B7456",
        text: "#2F3E2B",
        textSecondary: "#5A6B4D",
        border: "#E8EDE6",
        success: "#7A8471",
        warning: "#D4A574",
        error: "#B85C5C"
      },
      css: {
        "--color-primary": "#9CAF88",
        "--color-secondary": "#F5F5DC",
        "--color-background": "#FEFEFE",
        "--color-surface": "#FFFFFF",
        "--color-accent": "#6B7456",
        "--color-text": "#2F3E2B",
        "--color-text-secondary": "#5A6B4D",
        "--color-border": "#E8EDE6"
      }
    },
    2: {
      name: "Pearl Blush",
      description: "Soft pearl white with dusty rose and warm gray",
      colors: {
        primary: "#E8D5D5",
        secondary: "#F8F4F4",
        background: "#FDFCFC",
        surface: "#FFFFFF",
        accent: "#D4A5A5",
        text: "#4A3C3C",
        textSecondary: "#6B5B5B",
        border: "#F0EBEB",
        success: "#A5C4A5",
        warning: "#D4B574",
        error: "#C59999"
      },
      css: {
        "--color-primary": "#E8D5D5",
        "--color-secondary": "#F8F4F4",
        "--color-background": "#FDFCFC",
        "--color-surface": "#FFFFFF",
        "--color-accent": "#D4A5A5",
        "--color-text": "#4A3C3C",
        "--color-text-secondary": "#6B5B5B",
        "--color-border": "#F0EBEB"
      }
    },
    3: {
      name: "Coastal Breeze",
      description: "Soft blue-gray with cream and seafoam",
      colors: {
        primary: "#A8C4D6",
        secondary: "#F7F5F3",
        background: "#FDFDFD",
        surface: "#FFFFFF",
        accent: "#7BA8C2",
        text: "#2D3E4F",
        textSecondary: "#5A6B7D",
        border: "#E6EEF4",
        success: "#8BC4A8",
        warning: "#D6B887",
        error: "#C4889B"
      },
      css: {
        "--color-primary": "#A8C4D6",
        "--color-secondary": "#F7F5F3",
        "--color-background": "#FDFDFD",
        "--color-surface": "#FFFFFF",
        "--color-accent": "#7BA8C2",
        "--color-text": "#2D3E4F",
        "--color-text-secondary": "#5A6B7D",
        "--color-border": "#E6EEF4"
      }
    },
    4: {
      name: "Warm Linen",
      description: "Natural linen with warm beige and soft brown",
      colors: {
        primary: "#D4C4A8",
        secondary: "#F4F1ED",
        background: "#FEFDFB",
        surface: "#FFFFFF",
        accent: "#B8A082",
        text: "#3F362A",
        textSecondary: "#6B5D4F",
        border: "#EDE7DF",
        success: "#A8B894",
        warning: "#D4A574",
        error: "#B87A7A"
      },
      css: {
        "--color-primary": "#D4C4A8",
        "--color-secondary": "#F4F1ED",
        "--color-background": "#FEFDFB",
        "--color-surface": "#FFFFFF",
        "--color-accent": "#B8A082",
        "--color-text": "#3F362A",
        "--color-text-secondary": "#6B5D4F",
        "--color-border": "#EDE7DF"
      }
    },
  },

  // Font Sets
  fontsets: {
    0: {
      name: "System Default",
      description: "System fonts for best performance",
      fonts: {
        primary: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        secondary: "Georgia, 'Times New Roman', serif",
        mono: "'SF Mono', Monaco, 'Cascadia Code', monospace"
      },
      css: {
        "--font-primary": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        "--font-secondary": "Georgia, 'Times New Roman', serif",
        "--font-mono": "'SF Mono', Monaco, 'Cascadia Code', monospace"
      }
    },
    1: {
      name: "Modern Sans",
      description: "Clean contemporary fonts",
      fonts: {
        primary: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        secondary: "'Crimson Text', Georgia, serif",
        mono: "'JetBrains Mono', monospace"
      },
      css: {
        "--font-primary": "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        "--font-secondary": "'Crimson Text', Georgia, serif",
        "--font-mono": "'JetBrains Mono', monospace"
      }
    },
    2: {
      name: "Elegant Serif",
      description: "Traditional elegant fonts",
      fonts: {
        primary: "'Playfair Display', Georgia, serif",
        secondary: "'Source Sans Pro', -apple-system, sans-serif",
        mono: "'Fira Code', monospace"
      },
      css: {
        "--font-primary": "'Playfair Display', Georgia, serif",
        "--font-secondary": "'Source Sans Pro', -apple-system, sans-serif",
        "--font-mono": "'Fira Code', monospace"
      }
    },
    3: {
      name: "Creative Display",
      description: "Unique personality fonts",
      fonts: {
        primary: "'Montserrat', -apple-system, sans-serif",
        secondary: "'Merriweather', Georgia, serif",
        mono: "'Source Code Pro', monospace"
      },
      css: {
        "--font-primary": "'Montserrat', -apple-system, sans-serif",
        "--font-secondary": "'Merriweather', Georgia, serif",
        "--font-mono": "'Source Code Pro', monospace"
      }
    }
  },

  // Corner Radius Options
  cornerRadius: {
    0: {
      name: "None",
      value: "0px",
      css: { "--border-radius": "0px" }
    },
    1: {
      name: "Small",
      value: "4px",
      css: { "--border-radius": "4px" }
    },
    2: {
      name: "Medium",
      value: "8px",
      css: { "--border-radius": "8px" }
    },
    3: {
      name: "Large",
      value: "12px",
      css: { "--border-radius": "12px" }
    },
    4: {
      name: "Extra Large",
      value: "16px",
      css: { "--border-radius": "16px" }
    },
    5: {
      name: "Full",
      value: "9999px",
      css: { "--border-radius": "9999px" }
    }
  },

  // Animation Options
  animations: {
    0: {
      name: "None",
      description: "No animations",
      css: {
        "--transition-duration": "0ms",
        "--animation-scale": "1",
        "--animation-opacity": "1"
      }
    },
    1: {
      name: "Subtle",
      description: "Gentle hover effects",
      css: {
        "--transition-duration": "200ms",
        "--animation-scale": "1.02",
        "--animation-opacity": "0.8"
      }
    },
    2: {
      name: "Smooth",
      description: "Smooth transitions",
      css: {
        "--transition-duration": "300ms",
        "--animation-scale": "1.05",
        "--animation-opacity": "0.7"
      }
    },
    3: {
      name: "Dynamic",
      description: "Enhanced animations",
      css: {
        "--transition-duration": "400ms",
        "--animation-scale": "1.08",
        "--animation-opacity": "0.6"
      }
    }
  },

  // Navigation Styles
  navigationStyles: {
    0: {
      name: "Top Bar",
      description: "Traditional navigation bar",
      css: {
        position: "sticky",
        top: "0",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        padding: "12px 24px",
        zIndex: 100
      }
    },
    1: {
      name: "Floating",
      description: "Modern floating navigation",
      css: {
        position: "fixed",
        top: "20px",
        right: "20px",
        background: "rgba(255, 255, 255, 0.9)",
        backdropFilter: "blur(10px)",
        borderRadius: "12px",
        padding: "8px 16px",
        zIndex: 100
      }
    },
    2: {
      name: "Bottom Bar",
      description: "Mobile-friendly bottom navigation",
      css: {
        position: "fixed",
        bottom: "0",
        left: "0",
        right: "0",
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
        padding: "12px 24px",
        zIndex: 100
      }
    }
  },

  // Languages
  languages: {
    'en': { name: 'English', flag: '🇺🇸', rtl: false },
    'es': { name: 'Español', flag: '🇪🇸', rtl: false },
    'fr': { name: 'Français', flag: '🇫🇷', rtl: false },
    'de': { name: 'Deutsch', flag: '🇩🇪', rtl: false },
    'hi': { name: 'हिंदी', flag: '🇮🇳', rtl: false },
    'ar': { name: 'العربية', flag: '🇸🇦', rtl: true },
    'ja': { name: '日本語', flag: '🇯🇵', rtl: false },
    'ko': { name: '한국어', flag: '🇰🇷', rtl: false },
    'zh': { name: '中文', flag: '🇨🇳', rtl: false }
  }
};

// Template utility function to get template configuration
export const getTemplateConfig = (templateId: number = 1) => {
  const template = STYLING_CONSTANTS.coverTemplates[templateId] || STYLING_CONSTANTS.coverTemplates[1];
  return template;
};

// Helper functions for UI previews - Updated with new templates
export const getTemplatePreviewClass = (templateId: number): string => {
  const previews = {
    0: "bg-gray-100 border-2 border-dashed border-gray-300",
    1: "bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600",
    2: "bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900",
    3: "bg-gradient-to-br from-green-600 via-teal-600 to-cyan-600",
    4: "bg-gradient-to-r from-blue-500 to-transparent",
    5: "bg-gradient-to-l from-purple-500 to-transparent",
    6: "bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-500",
    7: "bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900",
    8: "bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 border-4 border-white border-opacity-60",
    9: "bg-gradient-to-br from-rose-600 via-pink-600 to-orange-500 border-4 border-white border-opacity-60",
    10: "bg-gradient-to-r from-violet-600 to-indigo-600",
    11: "bg-gradient-to-br from-amber-600 via-orange-500 to-red-500 border-4 border-dashed border-white border-opacity-60",
    12: "bg-gradient-to-t from-gray-900 via-transparent to-transparent",
    13: "bg-gradient-to-t from-blue-900 via-blue-600 to-transparent",
    14: "bg-gradient-to-t from-white/20 via-transparent to-transparent backdrop-blur-sm",
    15: "bg-gradient-to-br from-amber-700 via-yellow-600 to-orange-500 border-4 border-amber-300",
    16: "bg-gradient-to-b from-purple-600 to-transparent",
    17: "bg-gradient-to-br from-slate-900 via-purple-900 to-violet-900"
  };
  return previews[templateId as keyof typeof previews] || previews[1];
};

export const getThemePreviewClass = (themeId: number): string => {
  const previews = {
    0: "bg-white border-gray-200",
    1: "bg-gray-900 border-gray-700",
    2: "bg-blue-50 border-blue-200",
    3: "bg-green-50 border-green-200",
    4: "bg-orange-50 border-orange-200",
    5: "bg-purple-50 border-purple-200",
    6: "bg-pink-50 border-pink-200",
    7: "bg-teal-50 border-teal-200"
  };
  return previews[themeId as keyof typeof previews] || previews[0];
};

export const getThumbnailPreviewClass = (sizeId: number): string => {
  const previews = {
    0: "w-12 h-12",
    1: "w-16 h-16",
    2: "w-20 h-20",
    3: "w-24 h-24"
  };
  return previews[sizeId as keyof typeof previews] || previews[1];
};

export const getSpacingPreviewClass = (spacingId: number): string => {
  const previews = {
    0: "gap-1",
    1: "gap-2",
    2: "gap-4",
    3: "gap-6"
  };
  return previews[spacingId as keyof typeof previews] || previews[1];
};

export const getCornerRadiusPreviewClass = (radiusId: number): string => {
  const previews = {
    0: "rounded-none",
    1: "rounded",
    2: "rounded-md",
    3: "rounded-lg",
    4: "rounded-xl",
    5: "rounded-full"
  };
  return previews[radiusId as keyof typeof previews] || previews[2];
};

// Type-safe utility functions
export const getStylingConfig = (event: any) => {
  const styling = event?.styling_config || event?.styling || {};

  // Safely get IDs with fallbacks
  const coverTemplateId = styling.cover?.template_id ?? 1;
  const galleryLayoutId = styling.gallery?.layout_id ?? 0;
  const gridSpacingId = styling.gallery?.grid_spacing ?? 1;
  const thumbnailSizeId = styling.gallery?.thumbnail_size ?? 1;
  const themeId = styling.theme?.theme_id ?? 0;
  const fontsetId = styling.theme?.fontset_id ?? 0;
  const cornerRadiusId = styling.theme?.corner_radius ?? 2;
  const animationId = styling.theme?.animations ?? 1;
  const navigationStyleId = styling.navigation?.style_id ?? 0;
  const language = styling.language ?? 'en';

  return {
    coverTemplate: STYLING_CONSTANTS.coverTemplates[coverTemplateId] || STYLING_CONSTANTS.coverTemplates[1],
    galleryLayout: STYLING_CONSTANTS.galleryLayouts[galleryLayoutId] || STYLING_CONSTANTS.galleryLayouts[0],
    gridSpacing: STYLING_CONSTANTS.gridSpacing[gridSpacingId] || STYLING_CONSTANTS.gridSpacing[1],
    thumbnailSize: STYLING_CONSTANTS.thumbnailSizes[thumbnailSizeId] || STYLING_CONSTANTS.thumbnailSizes[1],
    theme: STYLING_CONSTANTS.themes[themeId] || STYLING_CONSTANTS.themes[0],
    fontset: STYLING_CONSTANTS.fontsets[fontsetId] || STYLING_CONSTANTS.fontsets[0],
    cornerRadius: STYLING_CONSTANTS.cornerRadius[cornerRadiusId] || STYLING_CONSTANTS.cornerRadius[2],
    animation: STYLING_CONSTANTS.animations[animationId] || STYLING_CONSTANTS.animations[1],
    navigationStyle: STYLING_CONSTANTS.navigationStyles[navigationStyleId] || STYLING_CONSTANTS.navigationStyles[0],
    language: STYLING_CONSTANTS.languages[language] || STYLING_CONSTANTS.languages['en']
  };
};

// Generate CSS variables safely
export const generateEventCSS = (event: any): Record<string, string> => {
  const config = getStylingConfig(event);
  const advanced = event?.styling_config?.advanced || {};

  return {
    ...config.theme.css,
    ...config.fontset.css,
    ...config.gridSpacing.css,
    ...config.thumbnailSize.css,
    ...config.cornerRadius.css,
    ...config.animation.css,
    // Advanced options
    "--overlay-opacity": `${advanced.overlay_opacity || 40}%`,
    "--blur-strength": `${advanced.blur_strength || 0}px`
  };
};

// Apply styling to element with error handling
export const applyEventStyling = (element: HTMLElement, event: any): void => {
  try {
    const cssVars = generateEventCSS(event);

    Object.entries(cssVars).forEach(([key, value]) => {
      if (key && value && typeof key === 'string' && typeof value === 'string') {
        element.style.setProperty(key, value);
      }
    });

    // Apply custom CSS if provided
    const customCSS = event?.styling_config?.advanced?.custom_css;
    if (customCSS && typeof customCSS === 'string') {
      const style = document.createElement('style');
      style.textContent = customCSS;
      document.head.appendChild(style);
    }
  } catch (error) {
    console.warn('Error applying event styling:', error);
  }
};

// Get responsive styles safely
export const getResponsiveStyles = (
  config: any,
  breakpoint: 'mobile' | 'tablet' | 'desktop' = 'desktop'
): Record<string, any> => {
  try {
    const responsive = config?.responsive?.[breakpoint];
    return responsive ? { ...config.css, ...responsive } : config.css || {};
  } catch (error) {
    console.warn('Error getting responsive styles:', error);
    return {};
  }
};

// Type-safe style options getters
export const getStyleOptions = () => {
  return {
    coverTemplates: Object.entries(STYLING_CONSTANTS.coverTemplates).map(([id, config]) => ({
      id: Number(id),
      name: config.name,
      description: config.description,
      preview: getTemplatePreviewClass(Number(id))
    })),
    galleryLayouts: Object.entries(STYLING_CONSTANTS.galleryLayouts).map(([id, config]) => ({
      id: Number(id),
      name: config.name,
      description: config.description,
      icon: config.icon
    })),
    gridSpacing: Object.entries(STYLING_CONSTANTS.gridSpacing).map(([id, config]) => ({
      id: Number(id),
      name: config.name,
      description: config.description,
      value: config.value,
      preview: getSpacingPreviewClass(Number(id))
    })),
    thumbnailSizes: Object.entries(STYLING_CONSTANTS.thumbnailSizes).map(([id, config]) => ({
      id: Number(id),
      name: config.name,
      description: config.description,
      size: config.size,
      preview: getThumbnailPreviewClass(Number(id))
    })),
    themes: Object.entries(STYLING_CONSTANTS.themes).map(([id, config]) => ({
      id: Number(id),
      name: config.name,
      description: config.description,
      colors: config.colors,
      preview: getThemePreviewClass(Number(id))
    })),
    fontsets: Object.entries(STYLING_CONSTANTS.fontsets).map(([id, config]) => ({
      id: Number(id),
      name: config.name,
      description: config.description,
      fonts: config.fonts
    })),
    cornerRadius: Object.entries(STYLING_CONSTANTS.cornerRadius).map(([id, config]) => ({
      id: Number(id),
      name: config.name,
      value: config.value,
      preview: getCornerRadiusPreviewClass(Number(id))
    })),
    animations: Object.entries(STYLING_CONSTANTS.animations).map(([id, config]) => ({
      id: Number(id),
      name: config.name,
      description: config.description
    }))
  };
};

// Validation helpers
export const validateStylingConfig = (config: any): boolean => {
  try {
    const cover = config?.cover?.template_id;
    const gallery = config?.gallery?.layout_id;
    const theme = config?.theme?.theme_id;

    return (
      typeof cover === 'number' && cover >= 0 && cover <= 17 &&
      typeof gallery === 'number' && gallery >= 0 && gallery <= 3 &&
      typeof theme === 'number' && theme >= 0 && theme <= 11 // Updated to include new themes
    );
  } catch (error) {
    return false;
  }
};

// Get default styling config
export const getDefaultStylingConfig = () => {
  return {
    cover: { template_id: 1 },
    gallery: { layout_id: 0, grid_spacing: 1, thumbnail_size: 1 },
    theme: {
      theme_id: 0,
      fontset_id: 0,
      corner_radius: 2,
      animations: 1
    },
    advanced: {
      custom_css: '',
      overlay_opacity: 40,
      blur_strength: 0
    }
  };
};