/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  // Preserve the existing browser defaults and reference layouts.
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
