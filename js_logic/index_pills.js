document.addEventListener("DOMContentLoaded", () => {
  const pills = document.querySelectorAll(".pill");
  const groups = document.querySelectorAll(".tools-group");

  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const target = pill.getAttribute("data-target");

      // Active class update
      pills.forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");

      if (!target || target === "all") {
        // All tools दिखाओ
        groups.forEach((g) => (g.style.display = ""));
        // Top of tools container तक smooth scroll
        const container = document.querySelector(".tools-container");
        if (container) {
          container.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        return;
      }

      // Sirf selected group दिखाओ + scroll
      groups.forEach((g) => {
        if (g.id === target) {
          g.style.display = "";
          g.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          g.style.display = "none";
        }
      });
    });
  });
});
