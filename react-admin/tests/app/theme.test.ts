import { describe, expect, it } from 'vitest';
import { createThemeConfig } from '../../src/styles/theme';

function relativeLuminance(hex: string): number {
  const channels = hex
    .replace('#', '')
    .match(/../g)!
    .map((channel) => parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe('theme tokens', () => {
  it('keeps link and selected-menu text readable on dark surfaces', () => {
    const dark = createThemeConfig('dark');
    const link = dark.token?.colorLink as string;
    expect(link).toBe('#b7afff');
    expect(dark.components?.Menu?.horizontalItemSelectedColor).toBe(link);
    expect(dark.components?.Menu?.itemSelectedColor).toBe(link);
    expect(contrastRatio(link, dark.token?.colorBgContainer as string)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(link, dark.token?.colorBgLayout as string)).toBeGreaterThanOrEqual(4.5);
  });

  it('uses the brand purple for links on light surfaces', () => {
    const light = createThemeConfig('light');
    const link = light.token?.colorLink as string;
    expect(link).toBe('#635bdb');
    expect(contrastRatio(link, light.token?.colorBgContainer as string)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the brand primary color and rounded design tokens in both modes', () => {
    expect(createThemeConfig('light').token?.colorPrimary).toBe('#635bdb');
    expect(createThemeConfig('dark').token?.colorPrimary).toBe('#635bdb');
    expect(createThemeConfig('light').token?.borderRadius).toBe(8);
    expect(createThemeConfig('dark').token?.borderRadius).toBe(8);
  });

  it('aligns every interactive control on one height', () => {
    const light = createThemeConfig('light');
    expect(light.components?.Button?.controlHeight).toBe(32);
    expect(light.components?.Input?.controlHeight).toBe(32);
    expect(light.components?.Select?.controlHeight).toBe(32);
    expect(light.components?.DatePicker?.controlHeight).toBe(32);
  });
});
