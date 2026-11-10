import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';

/** Arena brand palette aligned with the CSS custom properties in styles.css. */
export const ArenaPreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '2px',
      sm: '4px',
      md: '6px',
      lg: '8px',
      xl: '12px',
    },
  },
  semantic: {
    primary: {
      50: '#eef8f3',
      100: '#d7efe3',
      200: '#b0dfc9',
      300: '#7fc8a9',
      400: '#4aab86',
      500: '#268d6a',
      600: '#147257',
      700: '#0f5c47',
      800: '#0d4a3a',
      900: '#0b3d31',
      950: '#06251e',
    },
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.color}',
      offset: '2px',
    },
  },
  components: {
    button: {
      root: {
        borderRadius: '0.5rem',
        paddingX: '1rem',
        paddingY: '0.5rem',
        sm: {
          paddingX: '0.75rem',
          paddingY: '0.35rem',
        },
        lg: {
          paddingX: '1.25rem',
          paddingY: '0.65rem',
        },
      },
      colorScheme: {
        light: {
          root: {
            secondary: {
              background: '#f0f3ec',
              hoverBackground: '#e7ece2',
              borderColor: '#dde3d8',
              hoverBorderColor: '#cbd4c6',
              color: '#101a15',
               hoverColor: '#101a15',
            },
          },
        },
        dark: {
          root: {
            secondary: {
              background: '#16201b',
              hoverBackground: '#1d2923',
              borderColor: '#26342d',
              hoverBorderColor: '#34443b',
              color: '#eef3ef',
              hoverColor: '#eef3ef',
            },
          },
        },
      },
    },
    inputtext: {
      root: {
        borderRadius: '0.5rem',
      },
    },
    select: {
      root: {
        borderRadius: '0.5rem',
      },
    },
    datepicker: {
      panel: {
        borderRadius: '0.9rem',
      },
    },
    toast: {
      root: {
        borderRadius: '0.75rem',
      },
    },
    dialog: {
      root: {
        borderRadius: '0.9rem',
      },
    },
  },
});
