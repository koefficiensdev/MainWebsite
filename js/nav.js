/* Shared header behaviour.
   Loaded by every page, so subpages get a working mobile menu — previously
   the service pages simply hid every nav link below 850px and left the
   header with nothing but a logo. */

const toggle = document.getElementById("navToggle");
const nav = document.getElementById("mainNav");

if (toggle && nav) {
  const setOpen = (open) => {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));

  nav.querySelectorAll("a").forEach((link) =>
    link.addEventListener("click", () => setOpen(false))
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && nav.classList.contains("is-open")) {
      setOpen(false);
      toggle.focus();
    }
  });

  // Reopening at desktop width would leave a stale panel behind the header.
  matchMedia("(min-width: 769px)").addEventListener("change", (event) => {
    if (event.matches) setOpen(false);
  });
}
