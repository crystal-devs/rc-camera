// constants/styling.ts - Consolidated styling constants
interface CoverTemplate {
  name: string;
  description: string;
  layout: string;
  hasImage: boolean;
  height: string;
  textPosition?: string;
  style: {
    objectFit: string;
    objectPosition: string;
    overlay: { opacity: number; color: string };
    textAlign: string;
    contentPosition: string;
  };
}

interface CoverType {
  name: string;
  description: string;
  css: {
    width: string;
    height: string;
    borderRadius: string;
    minHeight?: string;
    margin?: string;
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
  coverTypes: Record<number, CoverType>;
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
  // Cover Templates - Consolidated with heights and layouts
  coverTemplates: {
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
        overlay: { opacity: 0.5, color: "rgba(0, 0, 0, 0.5)" },
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
        overlay: { opacity: 0.5, color: "rgba(0, 0, 0, 0.5)" },
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
        overlay: { opacity: 0.5, color: "rgba(0, 0, 0, 0.5)" },
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
    }
  },

  // Cover Types (keeping for backward compatibility)
  coverTypes: {
    0: {
      name: "Standard",
      description: "Normal height cover (400px)",
      css: {
        width: "100%",
        height: "400px",
        borderRadius: "0"
      }
    },
    1: {
      name: "Tall",
      description: "Increased height for impact (500px)",
      css: {
        width: "100%",
        height: "500px",
        borderRadius: "0"
      }
    },
    2: {
      name: "Compact",
      description: "Reduced height, more content focus (300px)",
      css: {
        width: "100%",
        height: "300px",
        borderRadius: "0"
      }
    },
    3: {
      name: "Hero",
      description: "Full viewport height",
      css: {
        width: "100%",
        height: "60vh",
        minHeight: "500px",
        borderRadius: "0"
      }
    },
    4: {
      name: "Container",
      description: "Contained with rounded corners",
      css: {
        width: "100%",
        height: "400px",
        borderRadius: "12px",
        margin: "1rem"
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
    0: {
      name: "Clean Light",
      description: "Bright and minimal",
      colors: {
        primary: "#000000",
        secondary: "#666666",
        background: "#ffffff",
        surface: "#f8f9fa",
        accent: "#007bff",
        text: "#212529",
        textSecondary: "#6c757d",
        border: "#dee2e6",
        success: "#28a745",
        warning: "#ffc107",
        error: "#dc3545"
      },
      css: {
        "--color-primary": "#000000",
        "--color-secondary": "#666666",
        "--color-background": "#ffffff",
        "--color-surface": "#f8f9fa",
        "--color-accent": "#007bff",
        "--color-text": "#212529",
        "--color-text-secondary": "#6c757d",
        "--color-border": "#dee2e6"
      }
    },
    1: {
      name: "Modern Dark",
      description: "Sophisticated dark theme",
      colors: {
        primary: "#ffffff",
        secondary: "#b3b3b3",
        background: "#121212",
        surface: "#1e1e1e",
        accent: "#bb86fc",
        text: "#ffffff",
        textSecondary: "#b3b3b3",
        border: "#333333",
        success: "#4caf50",
        warning: "#ff9800",
        error: "#f44336"
      },
      css: {
        "--color-primary": "#ffffff",
        "--color-secondary": "#b3b3b3",
        "--color-background": "#121212",
        "--color-surface": "#1e1e1e",
        "--color-accent": "#bb86fc",
        "--color-text": "#ffffff",
        "--color-text-secondary": "#b3b3b3",
        "--color-border": "#333333"
      }
    },
    2: {
      name: "Ocean Blue",
      description: "Professional blue theme",
      colors: {
        primary: "#0f4c75",
        secondary: "#3282b8",
        background: "#f0f8ff",
        surface: "#ffffff",
        accent: "#3282b8",
        text: "#0f4c75",
        textSecondary: "#5a7a95",
        border: "#d1e7ff",
        success: "#16a085",
        warning: "#f39c12",
        error: "#e74c3c"
      },
      css: {
        "--color-primary": "#0f4c75",
        "--color-secondary": "#3282b8",
        "--color-background": "#f0f8ff",
        "--color-surface": "#ffffff",
        "--color-accent": "#3282b8",
        "--color-text": "#0f4c75",
        "--color-text-secondary": "#5a7a95",
        "--color-border": "#d1e7ff"
      }
    },
    3: {
      name: "Forest Green",
      description: "Natural earthy theme",
      colors: {
        primary: "#1b5e20",
        secondary: "#4caf50",
        background: "#f1f8e9",
        surface: "#ffffff",
        accent: "#4caf50",
        text: "#1b5e20",
        textSecondary: "#558b2f",
        border: "#c8e6c9",
        success: "#2e7d32",
        warning: "#ef6c00",
        error: "#c62828"
      },
      css: {
        "--color-primary": "#1b5e20",
        "--color-secondary": "#4caf50",
        "--color-background": "#f1f8e9",
        "--color-surface": "#ffffff",
        "--color-accent": "#4caf50",
        "--color-text": "#1b5e20",
        "--color-text-secondary": "#558b2f",
        "--color-border": "#c8e6c9"
      }
    },
    4: {
      name: "Sunset Orange",
      description: "Warm and vibrant",
      colors: {
        primary: "#e65100",
        secondary: "#ff9800",
        background: "#fff3e0",
        surface: "#ffffff",
        accent: "#ff9800",
        text: "#e65100",
        textSecondary: "#f57c00",
        border: "#ffe0b2",
        success: "#388e3c",
        warning: "#ffa000",
        error: "#d32f2f"
      },
      css: {
        "--color-primary": "#e65100",
        "--color-secondary": "#ff9800",
        "--color-background": "#fff3e0",
        "--color-surface": "#ffffff",
        "--color-accent": "#ff9800",
        "--color-text": "#e65100",
        "--color-text-secondary": "#f57c00",
        "--color-border": "#ffe0b2"
      }
    },
    5: {
      name: "Purple Elegance",
      description: "Rich and elegant",
      colors: {
        primary: "#4a148c",
        secondary: "#9c27b0",
        background: "#f3e5f5",
        surface: "#ffffff",
        accent: "#9c27b0",
        text: "#4a148c",
        textSecondary: "#7b1fa2",
        border: "#e1bee7",
        success: "#388e3c",
        warning: "#ffa000",
        error: "#d32f2f"
      },
      css: {
        "--color-primary": "#4a148c",
        "--color-secondary": "#9c27b0",
        "--color-background": "#f3e5f5",
        "--color-surface": "#ffffff",
        "--color-accent": "#9c27b0",
        "--color-text": "#4a148c",
        "--color-text-secondary": "#7b1fa2",
        "--color-border": "#e1bee7"
      }
    },
    6: {
      name: "Rose Gold",
      description: "Soft and luxurious",
      colors: {
        primary: "#880e4f",
        secondary: "#e91e63",
        background: "#fce4ec",
        surface: "#ffffff",
        accent: "#e91e63",
        text: "#880e4f",
        textSecondary: "#ad1457",
        border: "#f8bbd9",
        success: "#388e3c",
        warning: "#ffa000",
        error: "#d32f2f"
      },
      css: {
        "--color-primary": "#880e4f",
        "--color-secondary": "#e91e63",
        "--color-background": "#fce4ec",
        "--color-surface": "#ffffff",
        "--color-accent": "#e91e63",
        "--color-text": "#880e4f",
        "--color-text-secondary": "#ad1457",
        "--color-border": "#f8bbd9"
      }
    },
    7: {
      name: "Teal Fresh",
      description: "Fresh and modern",
      colors: {
        primary: "#004d40",
        secondary: "#00695c",
        background: "#e0f2f1",
        surface: "#ffffff",
        accent: "#00695c",
        text: "#004d40",
        textSecondary: "#00796b",
        border: "#b2dfdb",
        success: "#388e3c",
        warning: "#ffa000",
        error: "#d32f2f"
      },
      css: {
        "--color-primary": "#004d40",
        "--color-secondary": "#00695c",
        "--color-background": "#e0f2f1",
        "--color-surface": "#ffffff",
        "--color-accent": "#00695c",
        "--color-text": "#004d40",
        "--color-text-secondary": "#00796b",
        "--color-border": "#b2dfdb"
      }
    }
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

// Helper functions for UI previews
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
    8: "bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700",
    9: "bg-gradient-to-br from-rose-600 via-pink-600 to-orange-500",
    10: "bg-gradient-to-r from-violet-600 to-transparent"
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
  const coverTypeId = styling.cover?.type ?? 0;
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
    coverType: STYLING_CONSTANTS.coverTypes[coverTypeId] || STYLING_CONSTANTS.coverTypes[0],
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
    coverTypes: Object.entries(STYLING_CONSTANTS.coverTypes).map(([id, config]) => ({
      id: Number(id),
      name: config.name,
      description: config.description
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
      typeof cover === 'number' && cover >= 0 && cover <= 10 &&
      typeof gallery === 'number' && gallery >= 0 && gallery <= 3 &&
      typeof theme === 'number' && theme >= 0 && theme <= 7
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