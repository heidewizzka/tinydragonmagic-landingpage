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

document.querySelectorAll('a.brand[href="index.html#top"]').forEach((link) => {
  link.addEventListener("click", (event) => {
    const targetUrl = new URL(link.href);
    const isSamePage =
      targetUrl.pathname === window.location.pathname ||
      window.location.pathname.endsWith("/index.html");

    if (!isSamePage) {
      return;
    }

    event.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
});

let youtubeApiPromise = null;

const loadYoutubeApi = () => {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) {
    return youtubeApiPromise;
  }

  youtubeApiPromise = new Promise((resolve) => {
    const previousReadyHandler = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousReadyHandler?.();
      resolve(window.YT);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.append(script);
  });

  return youtubeApiPromise;
};

document.querySelectorAll("[data-carousel]").forEach((carousel) => {
  const slides = Array.from(carousel.querySelectorAll("[data-carousel-slide]"));
  const prevButton = carousel.querySelector("[data-carousel-prev]");
  const nextButton = carousel.querySelector("[data-carousel-next]");
  const dots = Array.from(carousel.querySelectorAll("[data-carousel-dot]"));
  const autoAdvanceMs = 10000;
  let timerId = null;
  let isVideoPlaying = false;
  let videoSlideIndex = -1;
  let getVideoState = null;
  let stopVideo = () => {
    isVideoPlaying = false;
  };

  if (!slides.length || !prevButton || !nextButton) {
    return;
  }

  let activeIndex = slides.findIndex((slide) => slide.classList.contains("is-active"));
  if (activeIndex < 0) {
    activeIndex = 0;
    slides[0].classList.add("is-active");
  }

  const stopTimer = () => {
    window.clearTimeout(timerId);
    timerId = null;
  };

  const startTimer = () => {
    stopTimer();
    if (isVideoPlaying && activeIndex === videoSlideIndex) {
      return;
    }

    timerId = window.setTimeout(() => {
      const videoState = getVideoState?.();
      if (activeIndex === videoSlideIndex && (videoState === 1 || videoState === 3)) {
        isVideoPlaying = true;
        stopTimer();
        return;
      }

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
    stopVideo();
    render(activeIndex - 1);
  });

  nextButton.addEventListener("click", () => {
    stopVideo();
    render(activeIndex + 1);
  });

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      stopVideo();
      render(index);
    });
  });

  const iframe = carousel.querySelector("iframe");
  if (iframe) {
    videoSlideIndex = slides.findIndex((slide) => slide.contains(iframe));

    const handleVideoState = (state) => {
      if (state === 1 || state === 3) {
        isVideoPlaying = true;
        stopTimer();
        return;
      }

      if (state === 0) {
        isVideoPlaying = false;
        if (activeIndex === videoSlideIndex) {
          render(activeIndex + 1);
        }
        return;
      }

      if (state === 2 || state === 5 || state === -1) {
        isVideoPlaying = false;
        startTimer();
      }
    };

    loadYoutubeApi().then((YT) => {
      const player = new YT.Player(iframe, {
        events: {
          onStateChange: (event) => {
            handleVideoState(event.data);
          },
        },
      });

      getVideoState = () => {
        try {
          return player.getPlayerState();
        } catch {
          return null;
        }
      };

      stopVideo = () => {
        isVideoPlaying = false;

        try {
          player.stopVideo();
        } catch {
          iframe.contentWindow?.postMessage(
            JSON.stringify({
              event: "command",
              func: "stopVideo",
              args: [],
            }),
            "*",
          );
        }
      };
    });

    iframe.addEventListener("pointerenter", stopTimer);
    iframe.addEventListener("focus", stopTimer);
    iframe.addEventListener("pointerleave", () => {
      if (!isVideoPlaying) {
        startTimer();
      }
    });

    const parseYoutubeMessage = (message) => {
      if (typeof message === "string") {
        try {
          return JSON.parse(message);
        } catch {
          return null;
        }
      }

      if (message && typeof message === "object") {
        return message;
      }

      return null;
    };

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
      if (event.source !== iframe.contentWindow) {
        return;
      }

      const data = parseYoutubeMessage(event.data);
      if (!data) {
        return;
      }

      if (data.event === "onStateChange" && typeof data.info === "number") {
        handleVideoState(data.info);
      }

      if (data.event === "infoDelivery" && typeof data.info?.playerState === "number") {
        handleVideoState(data.info.playerState);
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
