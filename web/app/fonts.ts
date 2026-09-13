// Font tokens for the Karmendra AI Job Hunter dashboard.
//
// The build guide specifies next/font/google faces:
//   Zen Maru Gothic  (display, 500/700/900)  → --font-display
//   Plus Jakarta Sans (UI/body)              → --font-sans
//   Klee One         (handwritten accent)    → --font-hand
//
// Google Fonts is unreachable from this sandbox, so we expose the SAME CSS
// variables via well-matched local stacks. On a machine with internet access,
// replace the bodies of these three constants with:
//
//   import { Zen_Maru_Gothic, Plus_Jakarta_Sans, Klee_One } from 'next/font/google';
//   export const displayFont = Zen_Maru_Gothic({ weight: ['500','700','900'], variable: '--font-display', display: 'swap' });
//   export const uiFont = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
//   export const handFont = Klee_One({ weight: ['400','600'], variable: '--font-hand', display: 'swap', preload: false });

export const displayFont = {
  variable: '--font-display',
  css: [
    "'Zen Maru Gothic'",
    "'Hiragino Maru Gothic ProN'",
    "'Varela Round'",
    'ui-rounded',
    'system-ui',
    'sans-serif',
  ].join(', '),
};

export const uiFont = {
  variable: '--font-sans',
  css: [
    "'Plus Jakarta Sans'",
    'ui-sans-serif',
    'system-ui',
    '-apple-system',
    "'Segoe UI'",
    'Roboto',
    "'Helvetica Neue'",
    'Arial',
    'sans-serif',
  ].join(', '),
};

export const handFont = {
  variable: '--font-hand',
  css: ["'Klee One'", "'Comic Sans MS'", "'Segoe Print'", 'cursive'].join(', '),
};
