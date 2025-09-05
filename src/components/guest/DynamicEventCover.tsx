// components/event/EnhancedDynamicEventCover.tsx
import React, { useMemo, useEffect, useState } from 'react';
import { Calendar, MapPin, Users, Eye } from 'lucide-react';
import {
  generateEventCSS,
  getStylingConfig,
  getTemplateConfig,
} from '@/constants/styling.constant';

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
      cover: { template_id: number };
      theme: { theme_id: number; fontset_id: number };
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
  const [isVisible, setIsVisible] = useState(false);

  // Always call useEffect - moved before early returns
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Always call useMemo hooks before early returns
  const { stylingConfig, template } = useMemo(() => {
    if (!eventDetails) {
      return {
        stylingConfig: null,
        template: { layout: 'none', textPosition: 'center', hasImage: false, height: '100vh' }
      };
    }

    const styling = (() => {
      try {
        return getStylingConfig(eventDetails);
      } catch (error) {
        console.warn('Error getting styling config:', error);
        return null;
      }
    })();

    const templateId = eventDetails?.styling_config?.cover.template_id || 12;
    const templateConfig = getTemplateConfig(templateId);

    return {
      stylingConfig: styling,
      template: templateConfig
    };
  }, [eventDetails]);

  // Extract theme colors from styling config
  const themeColors = useMemo(() => {
    const colors = stylingConfig?.theme?.colors;
    if (!colors) {
      // Fallback colors if no styling config
      return {
        primary: '#D4C4A8',
        secondary: '#F4F1ED',
        background: '#FEFDFB',
        surface: '#FFFFFF',
        accent: '#B8A082',
        text: '#3F362A',
        textSecondary: '#6B5D4F',
        border: '#EDE7DF',
      };
    }
    return colors;
  }, [stylingConfig]);

  // Extract font configuration
  const fontConfig = useMemo(() => {
    const fonts = stylingConfig?.fontset?.fonts;
    if (!fonts) {
      return {
        primary: "'Playfair Display', Georgia, serif",
        secondary: "'Source Sans Pro', -apple-system, sans-serif",
      };
    }
    return fonts;
  }, [stylingConfig]);

  // Background style with theme integration
  const getBackgroundStyle = useMemo(() => {
    if (!eventDetails?.cover_image?.url || !template.hasImage) {
      return {
        backgroundColor: themeColors.background,
      };
    }

    const focalX = eventDetails.cover_image.focal_x || 50;
    const focalY = eventDetails.cover_image.focal_y || 50;

    return {
      backgroundImage: `url(${eventDetails.cover_image.url})`,
      backgroundPosition: `${focalX}% ${focalY}%`,
      backgroundSize: 'cover',
      backgroundRepeat: 'no-repeat',
    };
  }, [eventDetails?.cover_image, template.hasImage, themeColors.background]);

  // Themed overlay
  const getOverlayStyle = useMemo(() => {
    if (!template.hasImage) return {};
    return {
      background: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.3))`,
    };
  }, [template.hasImage]);

  // Responsive text sizes
  const textSizes = useMemo(() => {
    const sizeMap = {
      '100vh': { title: 'text-3xl sm:text-4xl md:text-5xl lg:text-5xl', desc: 'text-base sm:text-lg md:text-xl', details: 'text-sm md:text-base' },
      '60vh': { title: 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl', desc: 'text-sm sm:text-base md:text-lg', details: 'text-xs sm:text-sm' },
      default: { title: 'text-xl sm:text-2xl md:text-3xl lg:text-4xl', desc: 'text-sm sm:text-base', details: 'text-xs sm:text-sm' }
    };
    return sizeMap[template.height as keyof typeof sizeMap] || sizeMap.default;
  }, [template.height]);

  // Determine if text is overlaid on image (center layout with image)
  const isTextOverlaid = useMemo(() => {
    return template.hasImage && template.textPosition === 'center';
  }, [template.hasImage, template.textPosition]);

  // Text colors based on layout
  const textColors = useMemo(() => {
    if (isTextOverlaid) {
      return {
        primary: '#FFFFFF',
        secondary: 'rgba(255, 255, 255, 0.9)',
        accent: '#FFFFFF'
      };
    }
    return {
      primary: themeColors.text,
      secondary: themeColors.textSecondary,
      accent: themeColors.accent
    };
  }, [isTextOverlaid, themeColors]);

  // Early return for null/undefined eventDetails - after all hooks
  if (!eventDetails) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
        <div className="text-slate-700 text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-4 border-slate-300 border-t-slate-600 rounded-full mx-auto" />
          <h1 className="text-2xl font-semibold">Loading Event...</h1>
          <p className="text-slate-500">Please wait while we load the event details</p>
        </div>
      </div>
    );
  }

  // Early return for 'none' layout
  if (template.layout === 'none') return null;

  // Smooth scroll to gallery function
  const scrollToGallery = () => {
    const gallerySection = document.querySelector('[data-gallery-section]');
    if (gallerySection) {
      gallerySection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Date formatter
  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  };

  // Animation classes
  const fadeInClass = `transition-all duration-1000 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
    }`;

  // Content renderer with theme colors - Updated for bottom bar layout
  const renderContent = () => {
    if (template.textPosition === 'bottom') {
      // Special bottom bar layout - responsive design
      return (
        <div className="w-full">
          {/* Mobile Layout - Each data in separate rows */}
          <div className="flex flex-col gap-3 md:hidden">
            {/* Title */}
            <div className={`text-center ${fadeInClass}`} style={{ transitionDelay: '200ms' }}>
              <h1
                className={`font-bold ${textSizes.title}`}
                style={{
                  color: textColors.primary,
                  fontFamily: fontConfig.primary,
                }}
              >
                {eventDetails.title}
              </h1>
            </div>

            {/* Date Row */}
            {eventDetails.start_date && formatDate(eventDetails.start_date) && (
              <div className={`flex justify-center ${fadeInClass}`} style={{ transitionDelay: '300ms' }}>
                <span
                  className={`flex items-center gap-2 ${textSizes.details}`}
                  style={{
                    color: textColors.secondary,
                    fontFamily: fontConfig.secondary,
                  }}
                >
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{formatDate(eventDetails.start_date)}</span>
                </span>
              </div>
            )}

            {/* Location Row */}
            {eventDetails.location?.name && (
              <div className={`flex justify-center ${fadeInClass}`} style={{ transitionDelay: '400ms' }}>
                <span
                  className={`flex items-center gap-2 ${textSizes.details}`}
                  style={{
                    color: textColors.secondary,
                    fontFamily: fontConfig.secondary,
                  }}
                >
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate max-w-64">{eventDetails.location.name}</span>
                </span>
              </div>
            )}
          </div>

          {/* Desktop Layout - Horizontal */}
          <div className="hidden md:flex items-center justify-between">
            {/* Left side - Date and Location */}
            <div className={`flex flex-col gap-1 ${fadeInClass}`} style={{ transitionDelay: '200ms' }}>
              {eventDetails.start_date && formatDate(eventDetails.start_date) && (
                <span
                  className={`flex items-center gap-2 ${textSizes.details}`}
                  style={{
                    color: textColors.secondary,
                    fontFamily: fontConfig.secondary,
                  }}
                >
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{formatDate(eventDetails.start_date)}</span>
                </span>
              )}
              {eventDetails.location?.name && (
                <span
                  className={`flex items-center gap-2 ${textSizes.details}`}
                  style={{
                    color: textColors.secondary,
                    fontFamily: fontConfig.secondary,
                  }}
                >
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate max-w-48">{eventDetails.location.name}</span>
                </span>
              )}
            </div>

            {/* Center - Title and View Gallery Button */}
            <div className={`flex flex-col items-center gap-3 flex-1 px-4 ${fadeInClass}`} style={{ transitionDelay: '400ms' }}>
              <h1
                className={`font-bold text-center ${textSizes.title}`}
                style={{
                  color: textColors.primary,
                  fontFamily: fontConfig.primary,
                }}
              >
                {eventDetails.title}
              </h1>

              {/* {totalPhotos > 0 && (
                <button
                  onClick={scrollToGallery}
                  className="flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: isTextOverlaid ? 'rgba(255, 255, 255, 0.2)' : themeColors.accent,
                    color: isTextOverlaid ? '#FFFFFF' : themeColors.surface,
                    fontFamily: fontConfig.secondary,
                    backdropFilter: isTextOverlaid ? 'blur(10px)' : 'none',
                    border: isTextOverlaid ? '1px solid rgba(255, 255, 255, 0.3)' : 'none'
                  }}
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-medium">View Gallery</span>
                </button>
              )} */}
            </div>

            {/* Right side - Photo count */}
            <div className={`flex flex-col items-end gap-1 ${fadeInClass}`} style={{ transitionDelay: '600ms' }}>
              {totalPhotos > 0 && (
                <span
                  className={`flex items-center gap-2 ${textSizes.details}`}
                  style={{
                    color: textColors.secondary,
                    fontFamily: fontConfig.secondary,
                  }}
                >
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span>{totalPhotos} photo{totalPhotos !== 1 ? 's' : ''}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Default content for other layouts (center, left, right)
    return (
      <div className="space-y-4">
        <h1
          className={`font-bold ${textSizes.title} ${fadeInClass}`}
          style={{
            color: textColors.primary,
            fontFamily: fontConfig.primary,
            transitionDelay: '200ms'
          }}
        >
          {eventDetails.title}
        </h1>

        {/* Event metadata */}
        <div
          className={`flex flex-wrap items-center gap-x-6 gap-y-2 opacity-80 justify-center ${textSizes.details} ${fadeInClass}`}
          style={{
            color: textColors.secondary,
            fontFamily: fontConfig.secondary,
            transitionDelay: '400ms'
          }}
        >
          {eventDetails.start_date && formatDate(eventDetails.start_date) && (
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{formatDate(eventDetails.start_date)}</span>
            </span>
          )}

          {eventDetails.location?.name && (
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{eventDetails.location.name}</span>
            </span>
          )}

          {totalPhotos > 0 && (
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>{photoCount} of {totalPhotos} photos</span>
            </span>
          )}
        </div>

        {/* View Gallery Button for non-bottom layouts */}
        {totalPhotos > 0 && (
          <div className={`flex justify-center pt-2 ${fadeInClass}`} style={{ transitionDelay: '600ms' }}>
            <button
              onClick={scrollToGallery}
              className="flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                backgroundColor: isTextOverlaid ? 'rgba(255, 255, 255, 0.2)' : themeColors.accent,
                color: isTextOverlaid ? '#FFFFFF' : themeColors.surface,
                fontFamily: fontConfig.secondary,
                backdropFilter: isTextOverlaid ? 'blur(10px)' : 'none',
                border: isTextOverlaid ? '1px solid rgba(255, 255, 255, 0.3)' : 'none'
              }}
            >
              <Eye className="w-5 h-5" />
              <span className="font-medium">View Gallery</span>
            </button>
          </div>
        )}

        {children && (
          <div className={`pt-4 ${fadeInClass}`} style={{ transitionDelay: '800ms' }}>
            {children}
          </div>
        )}
      </div>
    );
  };

  // Enhanced border component with theme colors
  const BorderOverlay = ({ type }: { type: string }) => (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
      {type === 'border-simple' && (
        <div
          className="absolute inset-2 sm:inset-6 border-2"
          style={{ borderColor: template.hasImage ? 'rgba(255, 255, 255, 0.9)' : themeColors.accent }}
        />
      )}

      {type === 'border-double' && (
        <div className="absolute inset-4 sm:inset-8">
          <div
            className="absolute inset-0 border-2"
            style={{ borderColor: template.hasImage ? 'rgba(255, 255, 255, 0.9)' : themeColors.accent }}
          />
          <div
            className="absolute inset-2 border-2"
            style={{ borderColor: template.hasImage ? 'rgba(255, 255, 255, 0.6)' : themeColors.border }}
          />
        </div>
      )}

      {type === 'border-dashed' && (
        <div
          className="absolute inset-4 sm:inset-8 border-2 border-dashed rounded-lg"
          style={{ borderColor: template.hasImage ? 'rgba(255, 255, 255, 0.9)' : themeColors.accent }}
        />
      )}

      {type === 'border-corner' && (
        <>
          {[
            { pos: 'top-4 left-4 sm:top-8 sm:left-8', border: 'border-t-4 border-l-4' },
            { pos: 'top-4 right-4 sm:top-8 sm:right-8', border: 'border-t-4 border-r-4' },
            { pos: 'bottom-4 left-4 sm:bottom-8 sm:left-8', border: 'border-b-4 border-l-4' },
            { pos: 'bottom-4 right-4 sm:bottom-8 sm:right-8', border: 'border-b-4 border-r-4' }
          ].map((corner, i) => (
            <div
              key={i}
              className={`absolute ${corner.pos} w-12 h-12 sm:w-16 sm:h-16 ${corner.border}`}
              style={{ borderColor: template.hasImage ? 'rgba(255, 255, 255, 0.9)' : themeColors.accent }}
            />
          ))}
        </>
      )}

      {type === 'vintage' && (
        <div
          className="absolute inset-4 sm:inset-8 border-4"
          style={{ borderColor: themeColors.warning || '#D4A574' }}
        />
      )}
    </div>
  );

  // Image section component
  const ImageSection = ({ className = "", children }: { className?: string, children?: React.ReactNode }) => (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0" style={getBackgroundStyle} />
      {template.hasImage && <div className="absolute inset-0" style={{ ...getOverlayStyle, zIndex: 5 }} />}
      {(template.overlay || template.special) && (
        <BorderOverlay type={template.overlay || template.special} />
      )}
      {children}
    </div>
  );

  // Text section with theme background for splits
  const TextSection = ({ position, className = "", useBackground = false }: {
    position: string,
    className?: string,
    useBackground?: boolean
  }) => (
    <div
      className={`flex items-center p-6 sm:p-8 md:p-12 relative ${className}`}
      style={{
        backgroundColor: useBackground || !template.hasImage ? themeColors.surface : 'transparent',
        color: textColors.primary,
        fontFamily: fontConfig.secondary,
        zIndex: 20,
        ...(useBackground && {
          borderLeft: !template.hasImage ? `1px solid ${themeColors.border}` : undefined,
          borderRight: !template.hasImage ? `1px solid ${themeColors.border}` : undefined,
        })
      }}
    >
      <div className={`w-full ${position === 'center' ? 'text-center' : position === 'right' ? 'text-right' : 'text-left'}`}>
        {renderContent()}
      </div>
    </div>
  );

  // Main render with theme integration
  return (
    <div
      className="w-full overflow-hidden"
      style={{
        height: template.height,
        minHeight: '300px',
        backgroundColor: themeColors.background,
      }}
    >
      {template.textPosition === 'bottom' ? (
        /* Bottom Bar Layout */
        <div className="h-full flex flex-col">
          <ImageSection className="flex-1" />

          <div
            className="flex-shrink-0 flex items-center px-6 sm:px-8 md:px-12 py-4 md:py-6"
            style={{
              height: '160px',
              fontFamily: fontConfig.secondary,
              color: themeColors.text,
              backgroundColor: themeColors.surface,
              backdropFilter: 'blur(10px)',
              borderTop: `1px solid ${themeColors.border}`
            }}
          >
            {renderContent()}
          </div>
        </div>
      ) : template.textPosition === 'left' ? (
        /* Split Left Layout */
        <div className="h-full flex flex-col md:flex-row">
          <ImageSection className="flex-1 md:w-1/2 min-h-[200px] md:order-2" />
          <TextSection position="center" className="w-full md:w-1/2 justify-center md:order-1" useBackground={true} />
        </div>
      ) : template.textPosition === 'right' ? (
        /* Split Right Layout */
        <div className="h-full flex flex-col md:flex-row">
          <ImageSection className="flex-1 md:w-1/2 min-h-[200px] md:order-1" />
          <TextSection position="center" className="w-full md:w-1/2 justify-center md:order-2" useBackground={true} />
        </div>
      ) : (
        /* Center Layout */
        <ImageSection className="h-full">
          <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 20 }}>
            <TextSection position="center" className="justify-center" />
          </div>
        </ImageSection>
      )}
    </div>
  );
};