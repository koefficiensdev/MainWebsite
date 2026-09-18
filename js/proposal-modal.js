/* Free-proposal dialog.

   There is exactly one <form id="proposalForm"> on the page. Rather than
   duplicating it (which would mean two nodes with the same id and two sets
   of submit bindings), the dialog borrows the real node on open and puts it
   back on close. Listeners registered with addEventListener survive the
   move, so main.js keeps working untouched. */

const dialog = document.getElementById("proposalDialog");
const body = document.getElementById("proposalDialogBody");
const slot = document.getElementById("proposalFormSlot");
const form = document.getElementById("proposalForm");

if (dialog && body && slot && form) {
  const supportsModal = typeof dialog.showModal === "function";

  const open = () => {
    if (body.contains(form)) return;
    body.append(form);
    if (supportsModal) {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
    document.body.classList.add("is-locked");
    // Land on the first field rather than the close button.
    dialog.querySelector("input, select, textarea")?.focus({ preventScroll: true });
  };

  const close = () => {
    if (slot.contains(form)) return;
    slot.append(form);
    if (supportsModal && dialog.open) {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
    document.body.classList.remove("is-locked");
  };

  document.querySelectorAll("[data-open-proposal]").forEach((trigger) =>
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      open();
    })
  );

  dialog.querySelectorAll("[data-close-proposal]").forEach((trigger) =>
    trigger.addEventListener("click", close)
  );

  // Native Escape fires `close` on the dialog itself; put the form back.
  dialog.addEventListener("close", () => {
    if (!slot.contains(form)) slot.append(form);
    document.body.classList.remove("is-locked");
  });

  // Clicking the backdrop: the dialog element's own box is the backdrop area.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });

  /* If the visitor scrolls to the inline section while the dialog is open,
     the form would be missing from the page behind it — close instead. */
  document.querySelectorAll('a[href="#javaslat"]').forEach((link) =>
    link.addEventListener("click", close)
  );
}
