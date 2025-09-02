// components/event/EnhancedDynamicEventCover.tsx
import React, { useMemo } from 'react';
import { Calendar, MapPin, Users } from 'lucide-react';
import { generateEventCSS, getStylingConfig } from '@/constants/styling.constant';

interface EnhancedDynamicEventCoverProps {
  eventDetails: {
    title: string;
    description?: string;
    cover_image?: {
      url: string;
      focal_x?: number;
      focal_y?: number;
    };
    start_date?: string;
    location?: {
      name?: string;
      address?: string;
    };
    styling_config?: {
      cover: {
        template_id: number;
      };
      theme: {
        theme_id: number;
        fontset_id: number;
      };
    };
  } | null | undefined;
  photoCount?: number;
  totalPhotos?: number;
  children?: React.ReactNode;
}

export const DynamicEventCover: React.FC<EnhancedDynamicEventCoverProps> = ({
  eventDetails,
  photoCount = 0,
  totalPhotos = 0,
  children
}) => {
  // Handle null/undefined eventDetails
  if (!eventDetails) {
    return (
      <div className="w-full h-screen bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-3xl font-bold mb-2">Loading Event...</h1>
          <p className="opacity-80">Please wait while we load the event details</p>
        </div>
      </div>
    );
  }

  // Generate styling configuration with error handling
  const stylingConfig = useMemo(() => {
    try {
      return getStylingConfig(eventDetails);
    } catch (error) {
      console.warn('Error getting styling config:', error);
      return null;
    }
  }, [eventDetails]);

  const cssVariables = useMemo(() => {
    try {
      return generateEventCSS(eventDetails);
    } catch (error) {
      console.warn('Error generating CSS variables:', error);
      return {
        '--color-primary': '#007bff',
        '--color-background': '#f8f9fa',
        '--color-text': '#212529',
        '--font-primary': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      };
    }
  }, [eventDetails]);

  const templateId = 21;
  // const templateId = eventDetails.styling_config?.cover?.template_id || 1;

  // Enhanced template configuration with all new designs
  const getTemplateConfig = () => {
    const templates = {
      // No Cover
      0: { layout: 'none', hasImage: false, height: '0px' },
      
      // Existing Templates
      1: { layout: 'fullscreen-center', hasImage: true, height: '100vh', textPosition: 'center' },
      2: { layout: 'fullscreen-left', hasImage: true, height: '100vh', textPosition: 'left' },
      3: { layout: 'fullscreen-right', hasImage: true, height: '100vh', textPosition: 'right' },
      4: { layout: 'fullscreen-center', hasImage: true, height: '60vh', textPosition: 'center' },
      5: { layout: 'split-left', hasImage: true, height: '60vh', textPosition: 'right' },
      6: { layout: 'fullscreen-center-border', hasImage: true, height: '100vh', textPosition: 'center' },
      7: { layout: 'fullscreen-frame', hasImage: true, height: '100vh', textPosition: 'center', border: '1px solid #ccc' },

      // NEW ELEGANT TEMPLATES

      // Border Overlay Templates (100vh)
      8: { 
        layout: 'border-overlay-simple', 
        hasImage: true, 
        height: '100vh', 
        textPosition: 'center',
        overlay: 'border-simple'
      },
      9: { 
        layout: 'border-overlay-double', 
        hasImage: true, 
        height: '100vh', 
        textPosition: 'center',
        overlay: 'border-double'
      },
      10: { 
        layout: 'border-overlay-corner', 
        hasImage: true, 
        height: '100vh', 
        textPosition: 'center',
        overlay: 'border-corner'
      },
      11: { 
        layout: 'border-overlay-dashed', 
        hasImage: true, 
        height: '100vh', 
        textPosition: 'center',
        overlay: 'border-dashed'
      },

      // Bottom Bar Templates (100vh)
      12: { 
        layout: 'bottom-bar-solid', 
        hasImage: true, 
        height: '100vh', 
        textPosition: 'bottom',
        bottomBar: 'solid'
      },
      13: { 
        layout: 'bottom-bar-gradient', 
        hasImage: true, 
        height: '100vh', 
        textPosition: 'bottom',
        bottomBar: 'gradient'
      },
      14: { 
        layout: 'bottom-bar-glass', 
        hasImage: true, 
        height: '100vh', 
        textPosition: 'bottom',
        bottomBar: 'glass'
      },

      // Creative Design Templates (100vh)
      15: { 
        layout: 'diagonal-split', 
        hasImage: true, 
        height: '100vh', 
        textPosition: 'diagonal',
        special: 'diagonal'
      },
      16: { 
        layout: 'circular-frame', 
        hasImage: true, 
        height: '100vh', 
        textPosition: 'center',
        special: 'circular'
      },
      17: { 
        layout: 'magazine-style', 
        hasImage: true, 
        height: '100vh', 
        textPosition: 'magazine',
        special: 'magazine'
      },
      18: { 
        layout: 'minimal-corner', 
        hasImage: true, 
        height: '100vh', 
        textPosition: 'corner',
        special: 'minimal'
      },
      19: { 
        layout: 'geometric-overlay', 
        hasImage: true, 
        height: '100vh', 
        textPosition: 'center',
        special: 'geometric'
      },
      20: { 
        layout: 'vintage-frame', 
        hasImage: true, 
        height: '100vh', 
        textPosition: 'center',
        special: 'vintage'
      },

      // Additional Modern Templates
      21: {
        layout: 'split-vertical',
        hasImage: true,
        height: '100vh',
        textPosition: 'bottom',
        special: 'split-vertical'
      },
      22: {
        layout: 'gradient-overlay',
        hasImage: true,
        height: '100vh',
        textPosition: 'center',
        special: 'gradient-modern'
      }
    };

    return templates[templateId as keyof typeof templates] || templates[1];
  };

  const template = getTemplateConfig();

  // If template is 'none', return null (no cover section)
  if (template.layout === 'none') {
    return null;
  }

  // Get cover image style with focal point
  const getCoverImageStyle = () => {
    if (!eventDetails.cover_image?.url || !template.hasImage) {
      return {};
    }

    const focalX = eventDetails.cover_image.focal_x || 50;
    const focalY = eventDetails.cover_image.focal_y || 50;

    return {
      backgroundImage: `url(${eventDetails.cover_image.url})`,
      backgroundPosition: `${focalX}% ${focalY}%`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
    };
  };

  // Enhanced overlay styles
  const getOverlayStyle = () => {
    if (!template.hasImage) return {};
    
    const baseStyle = { 
      position: 'absolute' as const,
      inset: 0,
      zIndex: 5
    };

    // For border templates, overlay covers full area
    if (template.overlay === 'border-simple' || 
        template.overlay === 'border-double' || 
        template.overlay === 'border-corner' || 
        template.overlay === 'border-dashed') {
      return {
        ...baseStyle,
        backgroundColor: 'rgba(0, 0, 0, 0.3)'
      };
    }

    // Special overlay for gradient modern
    if (template.special === 'gradient-modern') {
      return {
        ...baseStyle,
        background: 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.6) 100%)'
      };
    }

    // Default overlay
    return {
      ...baseStyle,
      backgroundColor: 'rgba(0, 0, 0, 0.4)'
    };
  };

  // Enhanced text container positioning
  const getTextContainerStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 10,
      color: stylingConfig?.theme?.colors?.text || 'white',
      fontFamily: stylingConfig?.fontset?.fonts?.primary || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    };

    // Bottom bar positioning
    if (template.textPosition === 'bottom') {
      const bottomBarStyles = {
        solid: {
          backgroundColor: stylingConfig?.theme?.colors?.primary || 'rgba(0, 0, 0, 0.9)',
        },
        gradient: {
          background: `linear-gradient(to top, ${stylingConfig?.theme?.colors?.primary || 'rgba(0, 0, 0, 0.9)'} 0%, rgba(0, 0, 0, 0.6) 50%, transparent 100%)`,
          paddingTop: '6rem'
        },
        glass: {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.2)',
        }
      };

      return {
        ...baseStyle,
        bottom: 0,
        left: 0,
        right: 0,
        padding: '3rem 2rem',
        textAlign: 'left' as const,
        ...((template.bottomBar && bottomBarStyles[template.bottomBar as keyof typeof bottomBarStyles]) || {})
      };
    }

    // Diagonal positioning
    if (template.textPosition === 'diagonal') {
      return {
        ...baseStyle,
        top: '20%',
        left: '10%',
        right: '50%',
        padding: '2rem',
        textAlign: 'left' as const,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '8px',
        backdropFilter: 'blur(10px)'
      };
    }

    // Magazine style positioning
    if (template.textPosition === 'magazine') {
      return {
        ...baseStyle,
        top: '15%',
        left: '5%',
        right: '5%',
        padding: '0',
        textAlign: 'left' as const,
      };
    }

    // Corner positioning
    if (template.textPosition === 'corner') {
      return {
        ...baseStyle,
        bottom: '2rem',
        right: '2rem',
        maxWidth: '40%',
        padding: '1.5rem',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderRadius: '12px',
        textAlign: 'right' as const,
        backdropFilter: 'blur(10px)'
      };
    }

    // Left positioning
    if (template.textPosition === 'left') {
      return {
        ...baseStyle,
        left: 0,
        top: 0,
        bottom: 0,
        width: template.layout.startsWith('split') ? '50%' : '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'flex-start',
        textAlign: 'left' as const,
        padding: '2rem',
        paddingLeft: template.layout.startsWith('split') ? '2rem' : '4rem',
      };
    }

    // Right positioning
    if (template.textPosition === 'right') {
      return {
        ...baseStyle,
        right: 0,
        top: 0,
        bottom: 0,
        width: template.layout.startsWith('split') ? '50%' : '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'flex-end',
        textAlign: 'right' as const,
        padding: '2rem',
        paddingRight: template.layout.startsWith('split') ? '2rem' : '4rem',
      };
    }

    // Default center positioning
    const centerStyle = {
      ...baseStyle,
      inset: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      justifyContent: 'center',
      alignItems: 'center',
      textAlign: 'center' as const,
      padding: '2rem',
    };

    // Special layout modifications
    if (template.special === 'geometric') {
      return {
        ...centerStyle,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        clipPath: 'polygon(20% 0%, 80% 0%, 100% 20%, 100% 80%, 80% 100%, 20% 100%, 0% 80%, 0% 20%)',
        margin: '4rem'
      };
    }

    if (template.special === 'split-vertical') {
      return {
        ...baseStyle,
        bottom: 0,
        left: 0,
        right: 0,
        height: '40%',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center' as const,
        padding: '2rem',
        backgroundColor: stylingConfig?.theme?.colors?.primary || 'rgba(0, 0, 0, 0.9)'
      };
    }

    return centerStyle;
  };

  // Enhanced background image positioning
  const getBackgroundImageStyle = () => {
    if (!template.hasImage) return {};

    const imageStyle = getCoverImageStyle();
    
    // Special background treatments
    if (template.special === 'diagonal') {
      return {
        position: 'absolute' as const,
        inset: 0,
        ...imageStyle,
        clipPath: 'polygon(0 0, 70% 0, 100% 100%, 0 100%)'
      };
    }

    if (template.special === 'circular') {
      return {
        position: 'absolute' as const,
        inset: '8%',
        ...imageStyle,
        borderRadius: '50%',
        border: '8px solid rgba(255, 255, 255, 0.8)',
        boxShadow: '0 0 50px rgba(0,0,0,0.5)'
      };
    }

    if (template.special === 'vintage') {
      return {
        position: 'absolute' as const,
        inset: 0,
        ...imageStyle,
        filter: 'sepia(30%) contrast(1.2) brightness(1.1)',
      };
    }

    if (template.special === 'split-vertical') {
      return {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        height: '60%',
        ...imageStyle,
      };
    }

    if (template.special === 'gradient-modern') {
      return {
        position: 'absolute' as const,
        inset: 0,
        ...imageStyle,
      };
    }

    // Split layouts
    if (template.layout === 'split-left') {
      return {
        position: 'absolute' as const,
        left: 0,
        top: 0,
        bottom: 0,
        width: '50%',
        ...imageStyle,
      };
    }
    
    if (template.layout === 'split-right') {
      return {
        position: 'absolute' as const,
        right: 0,
        top: 0,
        bottom: 0,
        width: '50%',
        ...imageStyle,
      };
    }
    
    // Default full background
    return {
      position: 'absolute' as const,
      inset: 0,
      ...imageStyle,
    };
  };

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (error) {
      return null;
    }
  };

  // Get text size based on template and layout
  const getTextSizes = () => {
    if (template.special === 'magazine') {
      return {
        title: 'text-6xl md:text-8xl',
        description: 'text-xl md:text-2xl',
        details: 'text-base md:text-lg'
      };
    }
    
    if (template.textPosition === 'corner') {
      return {
        title: 'text-xl md:text-2xl',
        description: 'text-sm md:text-base',
        details: 'text-xs md:text-sm'
      };
    }

    if (template.height === '100vh') {
      return {
        title: 'text-4xl md:text-6xl',
        description: 'text-lg md:text-xl',
        details: 'text-sm md:text-base'
      };
    } else if (template.height === '60vh') {
      return {
        title: 'text-3xl md:text-5xl',
        description: 'text-base md:text-lg',
        details: 'text-sm'
      };
    } else {
      return {
        title: 'text-2xl md:text-4xl',
        description: 'text-base',
        details: 'text-sm'
      };
    }
  };

  const textSizes = getTextSizes();

  // Special content rendering for magazine style
  const renderMagazineContent = () => (
    <div>
      <h1 
        className="magazine-title font-black leading-none tracking-tight mb-4"
        style={{ 
          fontSize: 'clamp(3rem, 8vw, 8rem)',
          fontWeight: 900,
          lineHeight: '0.9',
          letterSpacing: '-0.02em',
          textTransform: 'uppercase',
          background: 'linear-gradient(45deg, #ffffff, #cccccc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
        }}
      >
        {eventDetails.title || 'Event Title'}
      </h1>

      {eventDetails.description && (
        <div 
          className="magazine-description"
          style={{
            fontSize: '1.2rem',
            fontWeight: 300,
            maxWidth: '60%',
            background: 'rgba(0,0,0,0.8)',
            padding: '1rem 2rem',
            marginTop: '2rem'
          }}
        >
          <p>{eventDetails.description}</p>
        </div>
      )}

      {/* Event Details for magazine */}
      <div className="flex flex-wrap items-center gap-4 opacity-80 mt-8 text-base">
        {eventDetails.start_date && formatDate(eventDetails.start_date) && (
          <span className="flex items-center gap-2 bg-black bg-opacity-70 px-3 py-1 rounded">
            <Calendar className="w-4 h-4" />
            {formatDate(eventDetails.start_date)}
          </span>
        )}
        
        {eventDetails.location?.name && (
          <span className="flex items-center gap-2 bg-black bg-opacity-70 px-3 py-1 rounded">
            <MapPin className="w-4 h-4" />
            {eventDetails.location.name}
          </span>
        )}
      </div>
    </div>
  );

  // Regular content rendering
  const renderRegularContent = () => (
    <div>
      <h1 
        className={`font-bold mb-4 ${textSizes.title}`}
        style={{ 
          lineHeight: '1.2',
          marginBottom: '1.5rem'
        }}
      >
        {eventDetails.title || 'Event Title'}
      </h1>

      {eventDetails.description && (
        <p 
          className={`mb-6 max-w-2xl opacity-90 ${textSizes.description}`}
          style={{ 
            fontFamily: stylingConfig?.fontset?.fonts?.secondary || 'Georgia, "Times New Roman", serif',
          }}
        >
          {eventDetails.description}
        </p>
      )}

      {/* Event Details */}
      <div className={`flex flex-wrap items-center gap-4 opacity-80 mb-6 ${textSizes.details}`}>
        {eventDetails.start_date && formatDate(eventDetails.start_date) && (
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {formatDate(eventDetails.start_date)}
          </span>
        )}
        
        {eventDetails.location?.name && (
          <span className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {eventDetails.location.name}
          </span>
        )}
        
        {totalPhotos > 0 && (
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {photoCount} of {totalPhotos} photos
          </span>
        )}
      </div>

      {/* Action buttons */}
      {children}
    </div>
  );

  return (
    <div 
      className={`relative w-full overflow-hidden ${template.special === 'geometric' ? 'geometric-container' : ''}`}
      style={{
        height: template.height,
        minHeight: '300px',
        ...cssVariables,
      }}
    >
      {/* Background Image */}
      {template.hasImage && (
        <div style={getBackgroundImageStyle()} />
      )}

      {/* Overlay */}
      {template.hasImage && (
        <div 
          className="absolute inset-0"
          style={getOverlayStyle()}
        />
      )}

      {/* Border Elements - positioned inside overlay */}
      {template.overlay === 'border-simple' && (
        <div className="absolute inset-8 border-4 border-white border-opacity-80 z-6"></div>
      )}

      {template.overlay === 'border-double' && (
        <div className="absolute inset-8 z-6">
          <div className="absolute inset-0 border-2 border-white border-opacity-90"></div>
          <div className="absolute inset-2 border-2 border-white border-opacity-50"></div>
        </div>
      )}

      {template.overlay === 'border-dashed' && (
        <div className="absolute inset-8 border-4 border-dashed border-white border-opacity-80 rounded-lg z-6"></div>
      )}

      {/* Corner Border Elements for border-corner template */}
      {template.overlay === 'border-corner' && (
        <>
          <div className="absolute top-8 left-8 w-16 h-16 border-t-4 border-l-4 border-white opacity-80 z-20"></div>
          <div className="absolute top-8 right-8 w-16 h-16 border-t-4 border-r-4 border-white opacity-80 z-20"></div>
          <div className="absolute bottom-8 left-8 w-16 h-16 border-b-4 border-l-4 border-white opacity-80 z-20"></div>
          <div className="absolute bottom-8 right-8 w-16 h-16 border-b-4 border-r-4 border-white opacity-80 z-20"></div>
        </>
      )}

      {/* Geometric Decorative Elements */}
      {template.special === 'geometric' && (
        <>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white opacity-30 rounded-full z-1"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rotate-45 w-32 h-32 border-2 border-white opacity-20 z-1"></div>
        </>
      )}

      {/* Vintage Frame Elements */}
      {template.special === 'vintage' && (
        <div className="absolute inset-8 border-4 border-amber-200 opacity-60 z-6" style={{
          borderImage: 'linear-gradient(45deg, #d4af37, #ffd700, #d4af37, #b8860b) 1',
          boxShadow: 'inset 0 0 20px rgba(212, 175, 55, 0.3)'
        }}></div>
      )}

      {/* Text Content */}
      <div style={getTextContainerStyle()}>
        {template.special === 'magazine' ? renderMagazineContent() : renderRegularContent()}
      </div>

      {/* Enhanced Mobile Responsive CSS */}
      <style jsx>{`
        @media (max-width: 768px) {
          .absolute[style*="width: 50%"] {
            position: static !important;
            width: 100% !important;
            height: 50% !important;
          }
          
          .magazine-title {
            font-size: 2.5rem !important;
          }
          
          .magazine-description {
            max-width: 90% !important;
            font-size: 1rem !important;
          }
          
          .text-8xl {
            font-size: 3rem !important;
          }
          
          .text-6xl {
            font-size: 2.5rem !important;
          }
          
          .text-5xl {
            font-size: 2rem !important;
          }
          
          .text-4xl {
            font-size: 1.875rem !important;
          }

          /* Adjust special layouts for mobile */
          .geometric-container {
            margin: 1rem !important;
          }
          
          /* Corner template adjustments */
          div[style*="maxWidth: 40%"] {
            max-width: 80% !important;
            bottom: 1rem !important;
            right: 1rem !important;
          }
          
          /* Border margins - mobile adjustments */
          .absolute[class*="inset-8"] {
            inset: 1rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .text-4xl {
            font-size: 1.5rem !important;
          }
          
          .text-2xl {
            font-size: 1.25rem !important;
          }
          
          .magazine-title {
            font-size: 2rem !important;
          }
          
          /* Further mobile optimizations */
          div[style*="clipPath"] {
            clip-path: none !important;
            margin: 0.5rem !important;
          }
          
          .geometric-container .absolute {
            display: none;
          }
        }

        /* Additional styles for special effects */
        .geometric-container::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 200px;
          height: 200px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          z-index: 1;
        }
        
        .geometric-container::after {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          width: 150px;
          height: 150px;
          border: 2px solid rgba(255,255,255,0.2);
          z-index: 1;
        }

        /* Hover effects for interactive elements */
        .relative:hover .border-white {
          border-color: rgba(255, 255, 255, 1);
          transition: border-color 0.3s ease;
        }

        /* Smooth transitions */
        .absolute {
          transition: all 0.3s ease;
        }
      `}</style>
    </div>
  );
};