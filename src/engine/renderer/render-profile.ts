/**
 * DREAM Engine — Render Profile System
 * Matches DREAM specification (game/godot/DreamSlice/scripts/render_profile.gd)
 * One profile per world and per platform, with named fallbacks when a device cannot draw an effect.
 */

export type WorldMode = 'day' | 'night';
export type PlatformTarget = 'web' | 'desktop';

export interface RenderProfileData {
  world: WorldMode;
  platform: PlatformTarget;
  sky_top: [number, number, number];
  sky_horizon: [number, number, number];
  sky_curve: number;
  ground_bottom: [number, number, number];
  ground_horizon: [number, number, number];
  ground_curve: number;
  sun_angle_max: number;
  sun_curve: number;
  clouds: boolean;
  cloud_lit: [number, number, number];
  cloud_shade: [number, number, number];
  cloud_coverage: number;
  cloud_opacity: number;
  stars: boolean;
  star_count: number;
  ambient_energy: number;
  exposure: number;
  brightness: number;
  contrast: number;
  saturation: number;
  fog: boolean;
  fog_color: [number, number, number];
  fog_density: number;
  fog_height: number;
  glow: boolean;
  glow_intensity: number;
  key_energy: number;
  key_color: [number, number, number];
  key_rotation: [number, number, number]; // pitch, yaw, roll in degrees
  key_shadows: boolean;
  rim_light: boolean;
  rim_color: [number, number, number];
  rim_energy: number;
  material_rim: number;
  // Named fallbacks for browser/web platform
  contact_darkening: boolean;
  haze_cards: boolean;
  light_shafts: boolean;
  mirror_layer: boolean;
  emitter_halos: boolean;
}

export const FALLBACK_NAMES = [
  'contact_darkening',
  'haze_cards',
  'light_shafts',
  'mirror_layer',
  'emitter_halos',
] as const;

export function getRenderProfile(world: WorldMode = 'day', isWeb = true): RenderProfileData {
  const platform: PlatformTarget = isWeb ? 'web' : 'desktop';

  if (world === 'night') {
    return {
      world: 'night',
      platform,
      sky_top: [0.022, 0.02, 0.065],
      sky_horizon: [0.20, 0.14, 0.28],
      sky_curve: 0.07,
      ground_bottom: [0.01, 0.01, 0.02],
      ground_horizon: [0.05, 0.05, 0.11],
      ground_curve: 0.10,
      sun_angle_max: 1.5,
      sun_curve: 0.15,
      clouds: true,
      cloud_lit: [0.42, 0.26, 0.46],
      cloud_shade: [0.06, 0.05, 0.10],
      cloud_coverage: 0.58,
      cloud_opacity: 0.85,
      stars: true,
      star_count: 4200,
      ambient_energy: 0.30,
      exposure: 1.75,
      brightness: 0.98,
      contrast: 1.15,
      saturation: 0.88,
      fog: true,
      fog_color: [0.20, 0.22, 0.36],
      fog_density: 0.0045,
      fog_height: 1.3,
      glow: true,
      glow_intensity: isWeb ? 0.75 : 0.82,
      key_energy: 0.45,
      key_color: [0.58, 0.66, 0.90],
      key_rotation: [-52.0, 200.0, 0.0],
      key_shadows: true,
      rim_light: true,
      rim_color: [0.55, 0.80, 1.0],
      rim_energy: 2.2,
      material_rim: 0.45,
      // Active fallbacks for night on web:
      contact_darkening: isWeb,
      haze_cards: false,
      light_shafts: isWeb,
      mirror_layer: isWeb,
      emitter_halos: isWeb,
    };
  }

  // Day Dream
  return {
    world: 'day',
    platform,
    sky_top: [0.20, 0.13, 0.32],
    sky_horizon: [1.0, 0.70, 0.36],
    sky_curve: 0.13,
    ground_bottom: [0.12, 0.10, 0.09],
    ground_horizon: [0.55, 0.40, 0.24],
    ground_curve: 0.15,
    sun_angle_max: 30.0,
    sun_curve: 0.12,
    clouds: true,
    cloud_lit: [1.0, 0.86, 0.62],
    cloud_shade: [0.46, 0.34, 0.44],
    cloud_coverage: 0.50,
    cloud_opacity: 0.92,
    stars: false,
    star_count: 0,
    ambient_energy: 0.40,
    exposure: 1.0,
    brightness: 1.0,
    contrast: 1.10,
    saturation: 1.04,
    fog: true,
    fog_color: [0.74, 0.64, 0.64],
    fog_density: 0.0030,
    fog_height: 1.1,
    glow: true,
    glow_intensity: isWeb ? 0.9 : 0.7,
    key_energy: 2.2,
    key_color: [1.0, 0.88, 0.70],
    key_rotation: [-14.0, 62.0, 0.0],
    key_shadows: true,
    rim_light: true,
    rim_color: [1.0, 0.86, 0.64],
    rim_energy: 1.6,
    material_rim: 0.4,
    // Active fallbacks for day on web:
    contact_darkening: isWeb,
    haze_cards: isWeb,
    light_shafts: false,
    mirror_layer: false,
    emitter_halos: isWeb,
  };
}

export function getActiveFallbacks(p: RenderProfileData): string[] {
  const active: string[] = [];
  if (p.contact_darkening) active.push('contact_darkening');
  if (p.haze_cards) active.push('haze_cards');
  if (p.light_shafts) active.push('light_shafts');
  if (p.mirror_layer) active.push('mirror_layer');
  if (p.emitter_halos) active.push('emitter_halos');
  return active;
}
