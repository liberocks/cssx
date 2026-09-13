/** Built-in keyframe rules available to animation utilities. */
export const DEFAULT_KEYFRAMES: Readonly<Record<string, string>> = {
  spin: '@keyframes spin{to{rotate:360deg;}}',
  ping: '@keyframes ping{75%,100%{scale:2;opacity:0;}}',
  pulse: '@keyframes pulse{50%{opacity:.5;}}',
  bounce:
    '@keyframes bounce{0%,100%{translate:0 -25%;animation-timing-function:cubic-bezier(.8,0,1,1);}50%{translate:0 0;animation-timing-function:cubic-bezier(0,0,.2,1);}}',
  'fade-in': '@keyframes fade-in{from{opacity:0;}to{opacity:1;}}',
  'fade-out': '@keyframes fade-out{from{opacity:1;}to{opacity:0;}}',
  'slide-in-up': '@keyframes slide-in-up{from{translate:0 1rem;}to{translate:0 0;}}',
  'slide-in-down': '@keyframes slide-in-down{from{translate:0 -1rem;}to{translate:0 0;}}',
  'slide-in-left': '@keyframes slide-in-left{from{translate:-1rem 0;}to{translate:0 0;}}',
  'slide-in-right': '@keyframes slide-in-right{from{translate:1rem 0;}to{translate:0 0;}}',
  'scale-in': '@keyframes scale-in{from{scale:.95;opacity:0;}to{scale:1;opacity:1;}}',
  'scale-out': '@keyframes scale-out{from{scale:1;opacity:1;}to{scale:.95;opacity:0;}}',
  shimmer: '@keyframes shimmer{from{background-position:200% 0;}to{background-position:-200% 0;}}',
};
