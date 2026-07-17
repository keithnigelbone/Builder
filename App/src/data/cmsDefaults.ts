import type { ContentTypeId, CmsEdits } from '../types';

export function getDefaultEditsForContentType(contentType: ContentTypeId): CmsEdits {
  switch (contentType) {
    case 'appscreen':
      return {
        headline: '',
        bodyText: '',
        buttonText: '',
        buttonAction: 'navigate',
        imageUrl: '',
        imageAlt: '',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        layoutVariant: 'center',
      };
    case 'video':
      return {
        title: '',
        subtitle: '',
        voiceoverScript: '',
        backgroundMusic: 'none',
        duration: 30,
      };
    case 'social':
      return {
        headline: '',
        caption: '',
        imageUrl: '',
        ctaText: '',
        platform: 'instagram',
        brandColor: '',
        hashtags: '',
      };
    case 'motion':
      return {
        animationTiming: 600,
        textOverlay: '',
        colorPalette: '#1a2640',
        easing: 'ease-in-out',
      };
    case 'slide':
      return {
        title: '',
        bulletPoints: [],
        backgroundImage: '',
        speakerNotes: '',
        transitionEffect: 'fade',
      };
    default:
      return {};
  }
}
