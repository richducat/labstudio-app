import type { DetailedHTMLProps, HTMLAttributes } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'zapier-interfaces-chatbot-embed': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        'is-popup'?: string;
        'chatbot-id'?: string;
        'style-override'?: string;
        'tracked-params'?: string;
        height?: string;
        width?: string;
      };
    }
  }
}
