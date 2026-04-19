const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const expanded = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!expanded));
    siteNav.classList.toggle("is-open", !expanded);
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navToggle.setAttribute("aria-expanded", "false");
      siteNav.classList.remove("is-open");
    });
  });
}

document.querySelectorAll("[data-carousel]").forEach((carousel) => {
  const slides = Array.from(carousel.querySelectorAll("[data-carousel-slide]"));
  const prevButton = carousel.querySelector("[data-carousel-prev]");
  const nextButton = carousel.querySelector("[data-carousel-next]");
  const dots = Array.from(carousel.querySelectorAll("[data-carousel-dot]"));
  const autoAdvanceMs = 10000;
  let timerId = null;

  if (!slides.length || !prevButton || !nextButton) {
    return;
  }

  let activeIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));
  if (activeIndex < 0) {
    activeIndex = 0;
    slides[0].classList.add("is-active");
  }

  const startTimer = () => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => {
      render(activeIndex + 1);
    }, autoAdvanceMs);
  };

  const render = (nextIndex) => {
    slides[activeIndex].classList.remove("is-active");
    activeIndex = (nextIndex + slides.length) % slides.length;
    slides[activeIndex].classList.add("is-active");
    dots.forEach((dot, index) => {
      const isActive = index === activeIndex;
      dot.classList.toggle("is-active", isActive);
      dot.setAttribute("aria-selected", String(isActive));
    });
    startTimer();
  };

  prevButton.addEventListener("click", () => {
    render(activeIndex - 1);
  });

  nextButton.addEventListener("click", () => {
    render(activeIndex + 1);
  });

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      render(index);
    });
  });

  const iframe = carousel.querySelector("iframe");
  if (iframe) {
    const registerYoutubeEvents = () => {
      iframe.contentWindow?.postMessage(
        JSON.stringify({
          event: "command",
          func: "addEventListener",
          args: ["onStateChange"],
        }),
        "*",
      );
    };

    iframe.addEventListener("load", registerYoutubeEvents);
    registerYoutubeEvents();

    window.addEventListener("message", (event) => {
      if (event.source !== iframe.contentWindow || typeof event.data !== "string") {
        return;
      }

      try {
        const data = JSON.parse(event.data);
        if (data.event === "onStateChange" && data.info === 0) {
          render(activeIndex + 1);
        }
      } catch {
        // Ignore unrelated postMessage payloads.
      }
    });
  }

  startTimer();
});

const copyToast = document.querySelector(".copy-toast");
let copyToastTimerId = null;

const showCopyToast = (message) => {
  if (!copyToast) {
    return;
  }

  copyToast.textContent = message;
  copyToast.classList.add("is-visible");
  window.clearTimeout(copyToastTimerId);
  copyToastTimerId = window.setTimeout(() => {
    copyToast.classList.remove("is-visible");
  }, 1800);
};

const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "absolute";
  helper.style.left = "-9999px";
  document.body.append(helper);
  helper.select();

  try {
    return document.execCommand("copy");
  } finally {
    helper.remove();
  }
};

document.querySelectorAll("[data-copy-text]").forEach((element) => {
  element.addEventListener("click", async (event) => {
    const preservesLink =
      element.matches("a[href^='mailto:']") ||
      element.matches("a[href^='https://discord.gg']");

    if (!preservesLink) {
      event.preventDefault();
      event.stopPropagation();
    }

    const value = element.getAttribute("data-copy-text");
    if (!value) {
      return;
    }

    const successMessage = element.getAttribute("data-copy-success") || "Copied to clipboard";
    const errorMessage = element.getAttribute("data-copy-error") || "Could not copy";

    try {
      const copied = await copyText(value);
      showCopyToast(copied ? successMessage : errorMessage);
    } catch {
      showCopyToast(errorMessage);
    }
  });
});
