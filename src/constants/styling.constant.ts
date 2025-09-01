// constants/styling.ts - Fixed with proper TypeScript types
interface CoverTemplate {
  name: string;
  description: string;
  layout: string;
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
  navigationStyles: Record<number, NavigationStyle>;
  languages: Record<string, Language>;
}

export const STYLING_CONSTANTS: StylingConstants = {
  // Cover Templates
  coverTemplates: {
    0: {
      name: "Classic Full",
      description: "Full-width cover with centered overlay text",
      layout: "full-center",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0.4, color: "rgba(0, 0, 0, 0.4)" },
        textAlign: "center",
        contentPosition: "center"
      }
    },
    1: {
      name: "Split Left",
      description: "Image on left, content on right",
      layout: "split-left",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0, color: "transparent" },
        textAlign: "left",
        contentPosition: "right"
      }
    },
    2: {
      name: "Split Right",
      description: "Content on left, image on right",
      layout: "split-right",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0, color: "transparent" },
        textAlign: "left",
        contentPosition: "left"
      }
    },
    3: {
      name: "Overlay Dark",
      description: "Full image with dark text overlay",
      layout: "overlay-dark",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0.5, color: "rgba(0, 0, 0, 0.5)" },
        textAlign: "center",
        contentPosition: "center"
      }
    },
    4: {
      name: "Overlay Light",
      description: "Full image with light text overlay",
      layout: "overlay-light",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0.3, color: "rgba(255, 255, 255, 0.3)" },
        textAlign: "center",
        contentPosition: "center"
      }
    },
    5: {
      name: "Card Style",
      description: "Contained card with image and text",
      layout: "card",
      style: {
        objectFit: "cover",
        objectPosition: "center",
        overlay: { opacity: 0, color: "transparent" },
        textAlign: "center",
        contentPosition: "center"
      }
    }
  },

  // Cover Types
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
      css: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(var(--thumbnail-size), 1fr))",
        gap: "var(--grid-spacing)",
        padding: "var(--grid-spacing)"
      },
      itemStyle: {
        aspectRatio: "1/1",
        borderRadius: "8px",
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
      css: {
        columnCount: "auto",
        columnWidth: "var(--thumbnail-size)",
        columnGap: "var(--grid-spacing)",
        padding: "var(--grid-spacing)"
      },
      itemStyle: {
        marginBottom: "var(--grid-spacing)",
        borderRadius: "8px",
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
    },
    2: {
      name: "Justified",
      description: "Justified rows maintaining aspect ratios",
      css: {
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--grid-spacing)",
        padding: "var(--grid-spacing)",
        justifyContent: "space-between"
      },
      itemStyle: {
        height: "200px",
        flexGrow: "1",
        borderRadius: "6px",
        overflow: "hidden",
        minWidth: "100px",
        maxWidth: "400px"
      },
      responsive: {
        mobile: { height: "150px" },
        tablet: { height: "180px" },
        desktop: { height: "200px" }
      }
    },
    3: {
      name: "Horizontal",
      description: "Single row horizontal scrolling",
      css: {
        display: "flex",
        gap: "var(--grid-spacing)",
        padding: "var(--grid-spacing)",
        overflowX: "auto",
        scrollSnapType: "x mandatory"
      },
      itemStyle: {
        height: "var(--thumbnail-size)",
        minWidth: "var(--thumbnail-size)",
        borderRadius: "8px",
        overflow: "hidden",
        scrollSnapAlign: "start",
        flexShrink: "0"
      },
      responsive: {
        mobile: { height: "120px", minWidth: "120px" },
        tablet: { height: "160px", minWidth: "160px" },
        desktop: { height: "var(--thumbnail-size)", minWidth: "var(--thumbnail-size)" }
      }
    }
  },

  // Grid Spacing
  gridSpacing: {
    0: {
      name: "Tight",
      description: "Minimal spacing (8px)",
      value: "8px",
      css: { "--grid-spacing": "8px" }
    },
    1: {
      name: "Normal",
      description: "Standard spacing (16px)",
      value: "16px",
      css: { "--grid-spacing": "16px" }
    },
    2: {
      name: "Loose",
      description: "Generous spacing (24px)",
      value: "24px",
      css: { "--grid-spacing": "24px" }
    },
    3: {
      name: "Extra Loose",
      description: "Maximum spacing (32px)",
      value: "32px",
      css: { "--grid-spacing": "32px" }
    }
  },

  // Thumbnail Sizes
  thumbnailSizes: {
    0: {
      name: "Small",
      description: "Compact thumbnails (180px)",
      width: 180,
      height: 180,
      css: {
        "--thumbnail-size": "180px",
        "--thumbnail-width": "180px",
        "--thumbnail-height": "180px"
      }
    },
    1: {
      name: "Medium",
      description: "Standard thumbnails (250px)",
      width: 250,
      height: 250,
      css: {
        "--thumbnail-size": "250px",
        "--thumbnail-width": "250px",
        "--thumbnail-height": "250px"
      }
    },
    2: {
      name: "Large",
      description: "Large thumbnails (320px)",
      width: 320,
      height: 320,
      css: {
        "--thumbnail-size": "320px",
        "--thumbnail-width": "320px",
        "--thumbnail-height": "320px"
      }
    },
    3: {
      name: "Extra Large",
      description: "Maximum thumbnails (400px)",
      width: 400,
      height: 400,
      css: {
        "--thumbnail-size": "400px",
        "--thumbnail-width": "400px",
        "--thumbnail-height": "400px"
      }
    }
  },

  // Themes
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
        accent: "#bbe1fa",
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
        "--color-accent": "#bbe1fa",
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
        accent: "#81c784",
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
        "--color-accent": "#81c784",
        "--color-text": "#1b5e20",
        "--color-text-secondary": "#558b2f",
        "--color-border": "#c8e6c9"
      }
    },
    8: {
      name: "System Default",
      description: "Platform default styling",
      colors: {
        primary: "#007bff",
        secondary: "#6c757d",
        background: "#f8f9fa",
        surface: "#ffffff",
        accent: "#17a2b8",
        text: "#212529",
        textSecondary: "#6c757d",
        border: "#dee2e6",
        success: "#28a745",
        warning: "#ffc107",
        error: "#dc3545"
      },
      css: {
        "--color-primary": "#007bff",
        "--color-secondary": "#6c757d",
        "--color-background": "#f8f9fa",
        "--color-surface": "#ffffff",
        "--color-accent": "#17a2b8",
        "--color-text": "#212529",
        "--color-text-secondary": "#6c757d",
        "--color-border": "#dee2e6"
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

// Type-safe utility functions
export const getStylingConfig = (event: any) => {
  const styling = event?.styling_config || event?.styling || {};

  // Safely get IDs with fallbacks
  const coverTemplateId = styling.cover?.template_id ?? 0;
  const coverTypeId = styling.cover?.type ?? 0;
  const galleryLayoutId = styling.gallery?.layout_id ?? 1;
  const gridSpacingId = styling.gallery?.grid_spacing ?? 1;
  const thumbnailSizeId = styling.gallery?.thumbnail_size ?? 1;
  const themeId = styling.theme?.theme_id ?? 0;
  const fontsetId = styling.theme?.fontset_id ?? 0;
  const navigationStyleId = styling.navigation?.style_id ?? 0;
  const language = styling.language ?? 'en';

  return {
    coverTemplate: STYLING_CONSTANTS.coverTemplates[coverTemplateId] || STYLING_CONSTANTS.coverTemplates[0],
    coverType: STYLING_CONSTANTS.coverTypes[coverTypeId] || STYLING_CONSTANTS.coverTypes[0],
    galleryLayout: STYLING_CONSTANTS.galleryLayouts[galleryLayoutId] || STYLING_CONSTANTS.galleryLayouts[1],
    gridSpacing: STYLING_CONSTANTS.gridSpacing[gridSpacingId] || STYLING_CONSTANTS.gridSpacing[1],
    thumbnailSize: STYLING_CONSTANTS.thumbnailSizes[thumbnailSizeId] || STYLING_CONSTANTS.thumbnailSizes[1],
    theme: STYLING_CONSTANTS.themes[themeId] || STYLING_CONSTANTS.themes[0],
    fontset: STYLING_CONSTANTS.fontsets[fontsetId] || STYLING_CONSTANTS.fontsets[0],
    navigationStyle: STYLING_CONSTANTS.navigationStyles[navigationStyleId] || STYLING_CONSTANTS.navigationStyles[0],
    language: STYLING_CONSTANTS.languages[language] || STYLING_CONSTANTS.languages['en']
  };
};

// Generate CSS variables safely
export const generateEventCSS = (event: any): Record<string, string> => {
  const config = getStylingConfig(event);

  return {
    ...config.theme.css,
    ...config.fontset.css,
    ...config.gridSpacing.css,
    ...config.thumbnailSize.css
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

// Type-safe style options
export const getStyleOptions = () => {
  return {
    coverTemplates: Object.entries(STYLING_CONSTANTS.coverTemplates).map(([id, config]) => ({
      id: Number(id),
      name: config.name,
      description: config.description
    })),
    coverTypes: Object.entries(STYLING_CONSTANTS.coverTypes).map(([id, config]) => ({
      id: Number(id),
      name: config.name,
      description: config.description
    })),
    themes: Object.entries(STYLING_CONSTANTS.themes).map(([id, config]) => ({
      id: Number(id),
      name: config.name,
      description: config.description,
      colors: config.colors
    })),
    galleryLayouts: Object.entries(STYLING_CONSTANTS.galleryLayouts).map(([id, config]) => ({
      id: Number(id),
      name: config.name,
      description: config.description
    })),
    fontsets: Object.entries(STYLING_CONSTANTS.fontsets).map(([id, config]) => ({
      id: Number(id),
      name: config.name,
      description: config.description
    }))
  };
};