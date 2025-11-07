// Dynamic Seasonal & Time-Based Theme System
// Automatically changes color palette based on current season and time of day

export type Season = 'winter' | 'spring' | 'summer' | 'fall';
export type TimeOfDay = 'day' | 'night';

export interface SeasonalColors {
  primary: string;
  primaryHSL: string;
  primaryForeground: string;
  accent: string;
  accentHSL: string;
  accentForeground: string;
  secondary: string;
  gradient: string;
  cardGradient: string;
  glowColor: string;
  icon: string;
}

// Day themes - Bright and vibrant
const dayThemes: Record<Season, SeasonalColors> = {
  winter: {
    primary: 'hsl(200 95% 65%)', // Bright ice blue
    primaryHSL: '200 95% 65%',
    primaryForeground: 'hsl(0 0% 100%)',
    accent: 'hsl(180 90% 60%)', // Cyan
    accentHSL: '180 90% 60%',
    accentForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(210 80% 70%)',
    gradient: 'linear-gradient(135deg, hsl(200 95% 65% / 0.95), hsl(180 90% 60% / 0.95))',
    cardGradient: 'linear-gradient(135deg, hsl(200 80% 20% / 0.9), hsl(180 70% 25% / 0.9))',
    glowColor: 'rgba(56, 189, 248, 0.6)',
    icon: '❄️',
  },
  spring: {
    primary: 'hsl(330 90% 65%)', // Bright pink
    primaryHSL: '330 90% 65%',
    primaryForeground: 'hsl(0 0% 100%)',
    accent: 'hsl(280 85% 65%)', // Purple
    accentHSL: '280 85% 65%',
    accentForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(310 80% 70%)',
    gradient: 'linear-gradient(135deg, hsl(330 90% 65% / 0.95), hsl(280 85% 65% / 0.95))',
    cardGradient: 'linear-gradient(135deg, hsl(330 70% 25% / 0.9), hsl(280 65% 25% / 0.9))',
    glowColor: 'rgba(236, 72, 153, 0.6)',
    icon: '🌸',
  },
  summer: {
    primary: 'hsl(45 95% 60%)', // Bright yellow
    primaryHSL: '45 95% 60%',
    primaryForeground: 'hsl(45 100% 10%)',
    accent: 'hsl(25 95% 60%)', // Orange
    accentHSL: '25 95% 60%',
    accentForeground: 'hsl(25 100% 10%)',
    secondary: 'hsl(35 90% 65%)',
    gradient: 'linear-gradient(135deg, hsl(45 95% 60% / 0.95), hsl(25 95% 60% / 0.95))',
    cardGradient: 'linear-gradient(135deg, hsl(45 70% 25% / 0.9), hsl(25 70% 25% / 0.9))',
    glowColor: 'rgba(251, 191, 36, 0.6)',
    icon: '☀️',
  },
  fall: {
    primary: 'hsl(25 95% 60%)', // Bright orange
    primaryHSL: '25 95% 60%',
    primaryForeground: 'hsl(0 0% 100%)',
    accent: 'hsl(10 90% 60%)', // Red-orange
    accentHSL: '10 90% 60%',
    accentForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(35 85% 65%)',
    gradient: 'linear-gradient(135deg, hsl(25 95% 60% / 0.95), hsl(10 90% 60% / 0.95))',
    cardGradient: 'linear-gradient(135deg, hsl(25 70% 25% / 0.9), hsl(10 70% 25% / 0.9))',
    glowColor: 'rgba(249, 115, 22, 0.6)',
    icon: '🍂',
  },
};

// Night themes - Deep and mysterious
const nightThemes: Record<Season, SeasonalColors> = {
  winter: {
    primary: 'hsl(220 90% 65%)', // Deep blue
    primaryHSL: '220 90% 65%',
    primaryForeground: 'hsl(0 0% 100%)',
    accent: 'hsl(260 85% 65%)', // Purple-blue
    accentHSL: '260 85% 65%',
    accentForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(240 80% 70%)',
    gradient: 'linear-gradient(135deg, hsl(220 90% 65% / 0.95), hsl(260 85% 65% / 0.95))',
    cardGradient: 'linear-gradient(135deg, hsl(220 60% 15% / 0.9), hsl(260 55% 18% / 0.9))',
    glowColor: 'rgba(96, 165, 250, 0.6)',
    icon: '🌙❄️',
  },
  spring: {
    primary: 'hsl(280 90% 65%)', // Purple
    primaryHSL: '280 90% 65%',
    primaryForeground: 'hsl(0 0% 100%)',
    accent: 'hsl(320 85% 65%)', // Magenta
    accentHSL: '320 85% 65%',
    accentForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(300 80% 70%)',
    gradient: 'linear-gradient(135deg, hsl(280 90% 65% / 0.95), hsl(320 85% 65% / 0.95))',
    cardGradient: 'linear-gradient(135deg, hsl(280 60% 18% / 0.9), hsl(320 55% 20% / 0.9))',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    icon: '🌙🌸',
  },
  summer: {
    primary: 'hsl(190 90% 60%)', // Teal
    primaryHSL: '190 90% 60%',
    primaryForeground: 'hsl(0 0% 100%)',
    accent: 'hsl(170 85% 60%)', // Turquoise
    accentHSL: '170 85% 60%',
    accentForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(180 80% 65%)',
    gradient: 'linear-gradient(135deg, hsl(190 90% 60% / 0.95), hsl(170 85% 60% / 0.95))',
    cardGradient: 'linear-gradient(135deg, hsl(190 60% 20% / 0.9), hsl(170 55% 22% / 0.9))',
    glowColor: 'rgba(34, 211, 238, 0.6)',
    icon: '🌙🌊',
  },
  fall: {
    primary: 'hsl(15 90% 60%)', // Deep orange
    primaryHSL: '15 90% 60%',
    primaryForeground: 'hsl(0 0% 100%)',
    accent: 'hsl(340 85% 60%)', // Red-pink
    accentHSL: '340 85% 60%',
    accentForeground: 'hsl(0 0% 100%)',
    secondary: 'hsl(25 80% 65%)',
    gradient: 'linear-gradient(135deg, hsl(15 90% 60% / 0.95), hsl(340 85% 60% / 0.95))',
    cardGradient: 'linear-gradient(135deg, hsl(15 60% 20% / 0.9), hsl(340 55% 22% / 0.9))',
    glowColor: 'rgba(239, 68, 68, 0.6)',
    icon: '🌙🍂',
  },
};

export function getCurrentSeason(): Season {
  const now = new Date();
  const month = now.getMonth(); // 0-11
  
  if (month >= 0 && month <= 2) return 'winter';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  return 'fall';
}

export function getTimeOfDay(): TimeOfDay {
  const now = new Date();
  const hour = now.getHours();
  
  // Day: 6 AM to 6 PM (6-17)
  // Night: 6 PM to 6 AM (18-23, 0-5)
  return (hour >= 6 && hour < 18) ? 'day' : 'night';
}

export function getSeasonalTheme(): SeasonalColors {
  const season = getCurrentSeason();
  const timeOfDay = getTimeOfDay();
  
  return timeOfDay === 'day' ? dayThemes[season] : nightThemes[season];
}

export function applySeasonalTheme() {
  const theme = getSeasonalTheme();
  const root = document.documentElement;
  
  // Apply all theme colors to CSS custom properties
  root.style.setProperty('--primary', theme.primaryHSL);
  root.style.setProperty('--primary-foreground', '210 40% 100%');
  root.style.setProperty('--accent', theme.accentHSL);
  root.style.setProperty('--accent-foreground', '210 40% 100%');
  
  // Update gradients
  root.style.setProperty('--gradient-hero', theme.gradient);
  root.style.setProperty('--gradient-card', theme.cardGradient);
  root.style.setProperty('--gradient-accent', `linear-gradient(90deg, ${theme.primary}, ${theme.accent})`);
  
  // Update glow effects
  root.style.setProperty('--shadow-glow', `0 0 40px ${theme.glowColor}`);
  
  // Store for component use
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-accent', theme.accent);
  root.style.setProperty('--theme-glow', theme.glowColor);
}

export function getSeasonName(): string {
  const season = getCurrentSeason();
  const timeOfDay = getTimeOfDay();
  const seasonName = season.charAt(0).toUpperCase() + season.slice(1);
  return `${seasonName} ${timeOfDay === 'day' ? 'Day' : 'Night'}`;
}

export function getSeasonIcon(): string {
  const theme = getSeasonalTheme();
  return theme.icon;
}

export function getThemeDescription(): string {
  const season = getCurrentSeason();
  const timeOfDay = getTimeOfDay();
  
  const descriptions = {
    winter: {
      day: 'Crisp winter morning with icy blues',
      night: 'Starry winter night with deep blues',
    },
    spring: {
      day: 'Blooming spring day with vibrant pinks',
      night: 'Mystical spring night with purple hues',
    },
    summer: {
      day: 'Bright summer sunshine with golden yellows',
      night: 'Cool summer evening with teal waters',
    },
    fall: {
      day: 'Warm autumn day with orange leaves',
      night: 'Cozy autumn night with crimson tones',
    },
  };
  
  return descriptions[season][timeOfDay];
}
