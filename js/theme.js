const COLOURS = ['paper', 'ink', 'ink-2', 'ink-3', 'ink-4', 'line', 'line-soft', 'deep', 'tint', 'tint-2', 'shadow', 'fault', 'fault-tint'];
const ALIAS = { 'ink-2': 'ink2', 'ink-3': 'ink3', 'ink-4': 'ink4', 'line-soft': 'soft', 'tint-2': 'tint2', 'fault-tint': 'faultTint' };

// Reads the palette and font stacks from the page's CSS variables.
export function readTheme() {
  const css = getComputedStyle(document.documentElement);
  const theme = { mono: css.getPropertyValue('--mono').trim(), sans: css.getPropertyValue('--sans').trim() };
  for (const name of COLOURS) theme[ALIAS[name] || name] = css.getPropertyValue('--' + name).trim();
  return theme;
}
