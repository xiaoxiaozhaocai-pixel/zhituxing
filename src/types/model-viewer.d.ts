import 'react';

interface ModelViewerJSXAttributes {
  src?: string;
  poster?: string;
  alt?: string;
  'auto-rotate'?: boolean;
  'rotation-per-second'?: string;
  'camera-controls'?: boolean;
  'disable-zoom'?: boolean;
  'disable-pan'?: boolean;
  'interaction-prompt'?: string;
  'shadow-intensity'?: string;
  exposure?: string;
  style?: React.CSSProperties;
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerJSXAttributes &
        React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}
