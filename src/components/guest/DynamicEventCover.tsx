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
        type: number;
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
      <div className="w-full h-96 bg-gradient-to-r from-gray-400 to-gray-600 flex items-center justify-center">
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

  const templateId = eventDetails.styling_config?.cover?.template_id || 0;
  const coverTypeId = eventDetails.styling_config?.cover?.type || 0;

  // Get template configuration
  const getTemplateConfig = () => {
    const templates = {
      // Full Screen Templates
      0: { layout: 'fullscreen-center', hasImage: true, textPosition: 'center', decorative: 'none' },
      1: { layout: 'fullscreen-left', hasImage: true, textPosition: 'left', decorative: 'none' },
      2: { layout: 'fullscreen-right', hasImage: true, textPosition: 'right', decorative: 'none' },
      3: { layout: 'fullscreen-top', hasImage: true, textPosition: 'top', decorative: 'none' },
      4: { layout: 'fullscreen-bottom', hasImage: true, textPosition: 'bottom', decorative: 'none' },
      
      // Decorative Templates
      5: { layout: 'fullscreen-center', hasImage: true, textPosition: 'center', decorative: 'frame' },
      6: { layout: 'fullscreen-center', hasImage: true, textPosition: 'center', decorative: 'stripe' },
      7: { layout: 'fullscreen-center', hasImage: true, textPosition: 'center', decorative: 'outline' },
      8: { layout: 'fullscreen-center', hasImage: true, textPosition: 'center', decorative: 'gradient' },
      
      // Split Templates
      9: { layout: 'split-left', hasImage: true, textPosition: 'right', decorative: 'none' },
      10: { layout: 'split-right', hasImage: true, textPosition: 'left', decorative: 'none' },
      
      // Text Only Templates
      11: { layout: 'text-only-center', hasImage: false, textPosition: 'center', decorative: 'none' },
      12: { layout: 'text-only-left', hasImage: false, textPosition: 'left', decorative: 'none' },
      13: { layout: 'text-only-right', hasImage: false, textPosition: 'right', decorative: 'none' },
      14: { layout: 'text-only-center', hasImage: false, textPosition: 'center', decorative: 'frame' },
      15: { layout: 'text-only-center', hasImage: false, textPosition: 'center', decorative: 'stripe' },
    };

    return templates[templateId as keyof typeof templates] || templates[0];
  };

  const template = getTemplateConfig();

  // Get container height based on cover type and template
  const getContainerHeight = () => {
    // Full screen templates override cover type
    if (template.layout.startsWith('fullscreen')) {
      return coverTypeId === 3 ? '100vh' : coverTypeId === 4 ? '80vh' : '100vh';
    }
    
    // Regular height mapping
    const heights = {
      0: '400px',  // Standard
      1: '600px',  // Tall
      2: '250px',  // Compact
      3: '100vh',  // Full Screen
      4: '80vh',   // Hero
      5: '150px'   // Text Header
    };
    
    return heights[coverTypeId as keyof typeof heights] || '400px';
  };

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

  // Get overlay style based on template
  const getOverlayStyle = () => {
    if (!template.hasImage) return {};

    const overlays = {
      'none': { backgroundColor: 'rgba(0, 0, 0, 0.4)', opacity: 1 },
      'gradient': { 
        background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.3) 100%)', 
        opacity: 1 
      }
    };

    return overlays[template.decorative as keyof typeof overlays] || overlays.none;
  };

  // Get text container styles based on template
  const getTextContainerStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      zIndex: 10,
      color: stylingConfig?.theme?.colors?.text || (template.hasImage ? 'white' : '#212529'),
      fontFamily: stylingConfig?.fontset?.fonts?.primary || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    };

    // Text positioning
    const positions = {
      center: {
        inset: 0,
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center' as const,
        padding: '2rem',
      },
      left: {
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
      },
      right: {
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
      },
      top: {
        top: 0,
        left: 0,
        right: 0,
        height: '50%',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center' as const,
        padding: '2rem',
      },
      bottom: {
        bottom: 0,
        left: 0,
        right: 0,
        height: '50%',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center' as const,
        padding: '2rem',
      }
    };

    // For text-only templates, adjust background
    if (!template.hasImage) {
      const textOnlyStyle = {
        backgroundColor: stylingConfig?.theme?.colors?.surface || '#ffffff',
        color: stylingConfig?.theme?.colors?.text || '#212529',
      };
      
      return {
        ...baseStyle,
        ...positions[template.textPosition as keyof typeof positions],
        ...textOnlyStyle
      };
    }

    return {
      ...baseStyle,
      ...positions[template.textPosition as keyof typeof positions]
    };
  };

  // Get background image positioning for split layouts
  const getBackgroundImageStyle = () => {
    if (!template.hasImage) return {};

    const imageStyle = getCoverImageStyle();
    
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
    
    // Full background
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

  // Get text styling based on decorative elements
  const getTextStyle = () => {
    const baseStyle = {};
    
    if (template.decorative === 'outline') {
      return {
        ...baseStyle,
        textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 0px rgba(255,255,255,0.3)',
      };
    }
    
    return baseStyle;
  };

  return (
    <div 
      className="relative w-full overflow-hidden"
      style={{
        height: getContainerHeight(),
        minHeight: template.layout.startsWith('text-only') ? '150px' : '300px',
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
          className="absolute inset-0 z-5"
          style={getOverlayStyle()}
        />
      )}

      {/* Decorative Elements */}
      {template.decorative === 'frame' && (
        <div className="absolute inset-4 border-4 border-white border-opacity-80 rounded-lg z-5" />
      )}
      
      {template.decorative === 'stripe' && (
        <div 
          className="absolute top-0 left-0 right-0 h-3 z-5"
          style={{ backgroundColor: stylingConfig?.theme?.colors?.accent || '#007bff' }}
        />
      )}

      {/* Text Content */}
      <div style={getTextContainerStyle()}>
        <div style={getTextStyle()}>
          <h1 
            className={`font-bold mb-4 ${
              template.layout.startsWith('fullscreen') ? 'text-4xl md:text-6xl' : 
              template.layout.startsWith('text-only') ? 'text-2xl md:text-3xl' :
              'text-3xl md:text-5xl'
            }`}
            style={{ 
              lineHeight: '1.2',
              marginBottom: template.layout.startsWith('text-only') ? '1rem' : '1.5rem'
            }}
          >
            {eventDetails.title || 'Event Title'}
          </h1>

          {eventDetails.description && (
            <p 
              className={`mb-6 max-w-2xl opacity-90 ${
                template.layout.startsWith('text-only') ? 'text-base' : 'text-lg'
              }`}
              style={{ 
                fontFamily: stylingConfig?.fontset?.fonts?.secondary || 'Georgia, "Times New Roman", serif',
              }}
            >
              {eventDetails.description}
            </p>
          )}

          {/* Event Details */}
          <div className="flex flex-wrap items-center gap-4 text-sm opacity-80 mb-6">
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
      </div>

      {/* Mobile responsive adjustments */}
      <style jsx>{`
        @media (max-width: 768px) {
          .absolute[style*="width: 50%"] {
            position: static !important;
            width: 100% !important;
            height: 50% !important;
          }
          
          .text-6xl {
            font-size: 2.5rem !important;
          }
          
          .text-5xl {
            font-size: 2rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .text-4xl {
            font-size: 1.875rem !important;
          }
        }
      `}</style>
    </div>
  );
};