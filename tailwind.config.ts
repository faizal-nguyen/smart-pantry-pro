import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'oklch(var(--border) / <alpha-value>)',
				input: 'oklch(var(--input) / <alpha-value>)',
				ring: 'oklch(var(--ring) / <alpha-value>)',
				background: 'oklch(var(--background) / <alpha-value>)',
				foreground: 'oklch(var(--foreground) / <alpha-value>)',
				primary: {
					DEFAULT: 'oklch(var(--primary) / <alpha-value>)',
					foreground: 'oklch(var(--primary-foreground) / <alpha-value>)',
					hover: 'oklch(var(--primary-hover) / <alpha-value>)',
					active: 'oklch(var(--primary-active) / <alpha-value>)'
				},
				secondary: {
					DEFAULT: 'oklch(var(--secondary) / <alpha-value>)',
					foreground: 'oklch(var(--secondary-foreground) / <alpha-value>)',
					hover: 'oklch(var(--secondary-hover) / <alpha-value>)'
				},
				success: {
					DEFAULT: 'oklch(var(--success) / <alpha-value>)',
					foreground: 'oklch(var(--success-foreground) / <alpha-value>)'
				},
				warning: {
					DEFAULT: 'oklch(var(--warning) / <alpha-value>)',
					foreground: 'oklch(var(--warning-foreground) / <alpha-value>)'
				},
				info: {
					DEFAULT: 'oklch(var(--info) / <alpha-value>)',
					foreground: 'oklch(var(--info-foreground) / <alpha-value>)'
				},
				destructive: {
					DEFAULT: 'oklch(var(--destructive) / <alpha-value>)',
					foreground: 'oklch(var(--destructive-foreground) / <alpha-value>)'
				},
				muted: {
					DEFAULT: 'oklch(var(--muted) / <alpha-value>)',
					foreground: 'oklch(var(--muted-foreground) / <alpha-value>)'
				},
				accent: {
					DEFAULT: 'oklch(var(--accent) / <alpha-value>)',
					foreground: 'oklch(var(--accent-foreground) / <alpha-value>)'
				},
				/* PRP-237 PR1 — explicit AI accent name. Same hue as
				   the legacy `accent` slot ; available so callers can
				   read intent (`bg-accent-ai`) instead of generic accent. */
				'accent-ai': {
					DEFAULT: 'oklch(var(--accent-ai) / <alpha-value>)',
					foreground: 'oklch(var(--accent-ai-foreground) / <alpha-value>)'
				},
				/* PRP-237 PR1 — semantic culinary accents. */
				saffron: {
					DEFAULT: 'oklch(var(--saffron) / <alpha-value>)',
					foreground: 'oklch(var(--saffron-foreground) / <alpha-value>)'
				},
				tomato: {
					DEFAULT: 'oklch(var(--tomato) / <alpha-value>)',
					foreground: 'oklch(var(--tomato-foreground) / <alpha-value>)'
				},
				/* PRP-237 PR1 — surface scale (page > muted > raised). */
				surface: {
					DEFAULT: 'oklch(var(--surface) / <alpha-value>)',
					muted: 'oklch(var(--surface-muted) / <alpha-value>)',
					raised: 'oklch(var(--surface-raised) / <alpha-value>)'
				},
				popover: {
					DEFAULT: 'oklch(var(--popover) / <alpha-value>)',
					foreground: 'oklch(var(--popover-foreground) / <alpha-value>)'
				},
				card: {
					DEFAULT: 'oklch(var(--card) / <alpha-value>)',
					foreground: 'oklch(var(--card-foreground) / <alpha-value>)'
				},
				sidebar: {
					DEFAULT: 'oklch(var(--sidebar-background) / <alpha-value>)',
					foreground: 'oklch(var(--sidebar-foreground) / <alpha-value>)',
					primary: 'oklch(var(--sidebar-primary) / <alpha-value>)',
					'primary-foreground': 'oklch(var(--sidebar-primary-foreground) / <alpha-value>)',
					accent: 'oklch(var(--sidebar-accent) / <alpha-value>)',
					'accent-foreground': 'oklch(var(--sidebar-accent-foreground) / <alpha-value>)',
					border: 'oklch(var(--sidebar-border) / <alpha-value>)',
					ring: 'oklch(var(--sidebar-ring) / <alpha-value>)'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'pulse-mic': {
					'0%, 100%': {
						transform: 'scale(1)',
						opacity: '1'
					},
					'50%': {
						transform: 'scale(1.1)',
						opacity: '0.8'
					}
				},
				'scan': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(100%)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'pulse-mic': 'pulse-mic 1.5s ease-in-out infinite',
				'scan': 'scan 2s ease-in-out infinite'
			}
		}
	},
	plugins: [
		// @ts-expect-error - tailwindcss-animate types not available
		require("tailwindcss-animate")
	],
} satisfies Config;
