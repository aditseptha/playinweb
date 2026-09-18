export const THEME_KEY = "showcase-theme";

export type Theme = "dark" | "light";

export const THEME_BOOT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark")t="dark";var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.classList.toggle("light",t==="light");}catch(e){}})();`;

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}
