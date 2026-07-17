// App/src/services/cmsEditorSchemas.ts

export type FieldType = 'text' | 'textarea' | 'number' | 'image' | 'color' | 'dropdown' | 'list';

export interface FieldDefinition {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  validation?: (value: any) => string | null; // null = valid, string = error message
  maxLength?: number;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  help?: string;
}

export interface CmsEditorSchema {
  contentType: string;
  displayName: string;
  fields: FieldDefinition[];
}

export const APP_SCREEN_SCHEMA: CmsEditorSchema = {
  contentType: 'appscreen',
  displayName: 'App Screen',
  fields: [
    {
      name: 'headline',
      label: 'Headline',
      type: 'text',
      required: true,
      maxLength: 80,
      validation: (value: string) => {
        if (!value || value.trim().length === 0) return 'Headline is required';
        if (value.length > 80) return 'Headline must be 80 characters or less';
        return null;
      },
      placeholder: 'Power On Your Future',
    },
    {
      name: 'bodyText',
      label: 'Body Copy',
      type: 'textarea',
      required: false,
      maxLength: 500,
      placeholder: 'Describe the value proposition...',
    },
    {
      name: 'buttonText',
      label: 'Button Text',
      type: 'text',
      required: false,
      maxLength: 30,
      placeholder: 'Get Started',
    },
    {
      name: 'buttonAction',
      label: 'Button Action',
      type: 'dropdown',
      required: false,
      options: [
        { label: 'Navigate', value: 'navigate' },
        { label: 'Submit', value: 'submit' },
        { label: 'Modal', value: 'modal' },
        { label: 'Custom', value: 'custom' },
      ],
    },
    {
      name: 'imageUrl',
      label: 'Hero Image',
      type: 'image',
      required: false,
      validation: (value: string) => {
        if (!value) return null;
        if (!value.startsWith('https://')) return 'Image URL must be HTTPS';
        try {
          new URL(value);
          return null;
        } catch {
          return 'Invalid URL format';
        }
      },
      help: 'Upload or paste HTTPS image URL',
    },
    {
      name: 'imageAlt',
      label: 'Image Alt Text',
      type: 'text',
      required: false,
      maxLength: 120,
      placeholder: 'Describe the image for accessibility',
    },
    {
      name: 'backgroundColor',
      label: 'Background Color',
      type: 'color',
      required: false,
      validation: (value: string) => {
        if (!value) return null;
        // Accept hex or token name
        if (value.match(/^#[0-9a-fA-F]{6}$/)) return null;
        if (/^reliance|jio|swadesh|tira/.test(value.toLowerCase())) return null;
        return 'Enter valid hex color (e.g., #1a2640) or token name';
      },
    },
    {
      name: 'textColor',
      label: 'Text Color',
      type: 'color',
      required: false,
    },
    {
      name: 'layoutVariant',
      label: 'Layout Variant',
      type: 'dropdown',
      required: false,
      options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
        { label: 'Split', value: 'split' },
        { label: 'Grid', value: 'grid' },
      ],
    },
  ],
};

export const VIDEO_SCHEMA: CmsEditorSchema = {
  contentType: 'video',
  displayName: 'Video',
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      maxLength: 60,
      placeholder: 'Reliance Energy Platform',
    },
    {
      name: 'subtitle',
      label: 'Subtitle',
      type: 'text',
      required: false,
      maxLength: 120,
    },
    {
      name: 'voiceoverScript',
      label: 'Voiceover Script',
      type: 'textarea',
      required: false,
      maxLength: 2000,
      placeholder: 'Write the narration...',
    },
    {
      name: 'backgroundMusic',
      label: 'Background Music',
      type: 'dropdown',
      required: false,
      options: [
        { label: 'None', value: 'none' },
        { label: 'Uplifting', value: 'uplifting' },
        { label: 'Corporate', value: 'corporate' },
        { label: 'Energetic', value: 'energetic' },
      ],
    },
    {
      name: 'duration',
      label: 'Duration (seconds)',
      type: 'number',
      required: false,
      validation: (value: number) => {
        if (!value) return null;
        if (value < 1 || value > 600) return 'Duration must be between 1 and 600 seconds';
        return null;
      },
    },
  ],
};

export const SOCIAL_SCHEMA: CmsEditorSchema = {
  contentType: 'social',
  displayName: 'Social Card',
  fields: [
    {
      name: 'headline',
      label: 'Headline',
      type: 'text',
      required: true,
      maxLength: 60,
    },
    {
      name: 'caption',
      label: 'Caption',
      type: 'textarea',
      required: false,
      maxLength: 240,
    },
    {
      name: 'imageUrl',
      label: 'Hero Image',
      type: 'image',
      required: false,
    },
    {
      name: 'ctaText',
      label: 'Call-to-Action Text',
      type: 'text',
      required: false,
      maxLength: 30,
      placeholder: 'Learn More',
    },
    {
      name: 'platform',
      label: 'Platform',
      type: 'dropdown',
      required: false,
      options: [
        { label: 'Instagram', value: 'instagram' },
        { label: 'LinkedIn', value: 'linkedin' },
        { label: 'Twitter', value: 'twitter' },
        { label: 'Facebook', value: 'facebook' },
      ],
    },
    {
      name: 'brandColor',
      label: 'Brand Color Accent',
      type: 'color',
      required: false,
    },
    {
      name: 'hashtags',
      label: 'Hashtags (comma-separated)',
      type: 'text',
      required: false,
      maxLength: 200,
      placeholder: '#RelianceEnergy #CleanPower',
    },
  ],
};

export const MOTION_SCHEMA: CmsEditorSchema = {
  contentType: 'motion',
  displayName: 'Motion',
  fields: [
    {
      name: 'animationTiming',
      label: 'Animation Duration (ms)',
      type: 'number',
      required: false,
      validation: (value: number) => {
        if (!value) return null;
        if (value < 300 || value > 3000) return 'Duration must be between 300 and 3000ms';
        return null;
      },
    },
    {
      name: 'textOverlay',
      label: 'Text Overlay',
      type: 'text',
      required: false,
      maxLength: 100,
    },
    {
      name: 'colorPalette',
      label: 'Primary Color',
      type: 'color',
      required: false,
    },
    {
      name: 'easing',
      label: 'Easing Function',
      type: 'dropdown',
      required: false,
      options: [
        { label: 'Ease In', value: 'ease-in' },
        { label: 'Ease Out', value: 'ease-out' },
        { label: 'Ease In-Out', value: 'ease-in-out' },
        { label: 'Linear', value: 'linear' },
      ],
    },
  ],
};

export const SLIDE_SCHEMA: CmsEditorSchema = {
  contentType: 'slide',
  displayName: 'Slide',
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'text',
      required: true,
      maxLength: 80,
    },
    {
      name: 'bulletPoints',
      label: 'Bullet Points',
      type: 'list',
      required: false,
      maxLength: 5,
      help: 'Up to 5 points, 120 chars each',
    },
    {
      name: 'backgroundImage',
      label: 'Background Image',
      type: 'image',
      required: false,
    },
    {
      name: 'speakerNotes',
      label: 'Speaker Notes',
      type: 'textarea',
      required: false,
      maxLength: 1000,
    },
    {
      name: 'transitionEffect',
      label: 'Transition Effect',
      type: 'dropdown',
      required: false,
      options: [
        { label: 'None', value: 'none' },
        { label: 'Fade', value: 'fade' },
        { label: 'Slide', value: 'slide' },
        { label: 'Zoom', value: 'zoom' },
      ],
    },
  ],
};

const SCHEMAS: Record<string, CmsEditorSchema> = {
  appscreen: APP_SCREEN_SCHEMA,
  video: VIDEO_SCHEMA,
  social: SOCIAL_SCHEMA,
  motion: MOTION_SCHEMA,
  slide: SLIDE_SCHEMA,
};

export function getSchemaForContentType(contentType: string): CmsEditorSchema {
  return SCHEMAS[contentType] || APP_SCREEN_SCHEMA;
}
