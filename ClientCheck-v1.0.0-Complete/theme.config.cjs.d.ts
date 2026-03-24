declare module "@/theme.config.cjs" {
  export const themeColors: Record<string, { light: string; dark: string }>;
  const themeConfig: { themeColors: typeof themeColors };
  export default themeConfig;
}
