import type { BuildCategory } from '../types';

/**
 * The five things this app can help build, and the two guided questions asked
 * for each — pure data, kept separate from the screens that render it so new
 * categories can be added here without touching any UI code.
 */
export const BUILD_CATEGORIES: BuildCategory[] = [
  {
    id: 'website',
    label: 'Website',
    description: 'Landing pages, product pages, and campaign sites',
    questions: [
      {
        id: 'website-type',
        prompt: 'What type of website do you want to build?',
        options: [
          { id: 'landing-page', label: 'Landing page' },
          { id: 'product-page', label: 'Product page' },
          { id: 'brand-page', label: 'Brand page' },
          { id: 'campaign-page', label: 'Campaign page' },
          { id: 'dashboard', label: 'Dashboard' },
        ],
      },
      {
        id: 'website-goal',
        prompt: 'What is the main goal of the website?',
        options: [
          { id: 'inform', label: 'Inform' },
          { id: 'convert', label: 'Convert' },
          { id: 'launch', label: 'Launch' },
          { id: 'explain', label: 'Explain' },
          { id: 'sell', label: 'Sell' },
        ],
      },
    ],
  },
  {
    id: 'app-screens',
    label: 'App screens',
    description: 'Mobile and product UI screens',
    questions: [
      {
        id: 'screen-type',
        prompt: 'What kind of app screen do you need?',
        options: [
          { id: 'home', label: 'Home' },
          { id: 'onboarding', label: 'Onboarding' },
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'profile', label: 'Profile' },
          { id: 'checkout', label: 'Checkout' },
          { id: 'chat', label: 'Chat' },
          { id: 'settings', label: 'Settings' },
        ],
      },
      {
        id: 'screen-action',
        prompt: 'What user action should this screen support?',
        options: [
          { id: 'browse', label: 'Browse' },
          { id: 'enter-data', label: 'Enter data' },
          { id: 'confirm', label: 'Confirm' },
          { id: 'track-progress', label: 'Track progress' },
          { id: 'communicate', label: 'Communicate' },
        ],
      },
    ],
  },
  {
    id: 'slides',
    label: 'Slides',
    description: 'Presentation and pitch deck slides',
    questions: [
      {
        id: 'slide-type',
        prompt: 'What kind of slide do you want to create?',
        options: [
          { id: 'title-slide', label: 'Title slide' },
          { id: 'section-divider', label: 'Section divider' },
          { id: 'data-slide', label: 'Data slide' },
          { id: 'storytelling-slide', label: 'Storytelling slide' },
          { id: 'comparison-slide', label: 'Comparison slide' },
          { id: 'closing-slide', label: 'Closing slide' },
        ],
      },
      {
        id: 'slide-message',
        prompt: 'What is the key message?',
        options: [
          { id: 'growth', label: 'Growth' },
          { id: 'results', label: 'Results' },
          { id: 'vision', label: 'Vision' },
          { id: 'comparison', label: 'Comparison' },
          { id: 'next-steps', label: 'Next steps' },
        ],
      },
    ],
  },
  {
    id: 'social-media',
    label: 'Social media',
    description: 'Posts, stories, and campaign assets',
    questions: [
      {
        id: 'social-format',
        prompt: 'What format do you need?',
        options: [
          { id: 'square-post', label: 'Square post' },
          { id: 'story', label: 'Story' },
          { id: 'carousel', label: 'Carousel' },
          { id: 'linkedin-post', label: 'LinkedIn post' },
          { id: 'campaign-asset', label: 'Campaign asset' },
        ],
      },
      {
        id: 'social-message',
        prompt: 'What is the main message or call to action?',
        options: [
          { id: 'announce', label: 'Announce' },
          { id: 'promote', label: 'Promote' },
          { id: 'educate', label: 'Educate' },
          { id: 'celebrate', label: 'Celebrate' },
          { id: 'drive-signups', label: 'Drive sign-ups' },
        ],
      },
    ],
  },
  {
    id: 'motion',
    label: 'Motion',
    description: 'Loaders, transitions, and micro-interactions',
    questions: [
      {
        id: 'motion-type',
        prompt: 'What kind of motion do you want?',
        options: [
          { id: 'loader', label: 'Loader' },
          { id: 'transition', label: 'Transition' },
          { id: 'intro-animation', label: 'Intro animation' },
          { id: 'product-reveal', label: 'Product reveal' },
          { id: 'micro-interaction', label: 'UI micro-interaction' },
        ],
      },
      {
        id: 'motion-feeling',
        prompt: 'What should the motion communicate?',
        options: [
          { id: 'confidence', label: 'Confidence' },
          { id: 'speed', label: 'Speed' },
          { id: 'progress', label: 'Progress' },
          { id: 'intelligence', label: 'Intelligence' },
          { id: 'trust', label: 'Trust' },
          { id: 'energy', label: 'Energy' },
        ],
      },
    ],
  },
];

export function getBuildCategory(id: string): BuildCategory | undefined {
  return BUILD_CATEGORIES.find((category) => category.id === id);
}
