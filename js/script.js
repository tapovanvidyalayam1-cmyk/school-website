// Mobile nav toggle
document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".main-nav");

  if (toggle && nav) {
    toggle.setAttribute("aria-expanded", "false");
    toggle.addEventListener("click", function () {
      var isOpen = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Highlight the current page in the nav
  var current = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".main-nav a").forEach(function (link) {
    var href = link.getAttribute("href");
    if (href === current) {
      link.classList.add("active");
    }
  });

  // Contact form — no backend, so we hand off to the visitor's email app via mailto:
  var form = document.querySelector(".contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = form.querySelector("#cf-name").value;
      var email = form.querySelector("#cf-email").value;
      var phone = form.querySelector("#cf-phone").value;
      var campusSelect = form.querySelector("#cf-campus");
      var campus = campusSelect.options[campusSelect.selectedIndex].text;
      var message = form.querySelector("#cf-message").value;

      var body = [
        "Name: " + name,
        "Email: " + email,
        "Phone: " + (phone || "-"),
        "Campus: " + campus,
        "",
        message
      ].join("\n");

      window.location.href = "mailto:tapovanvidyalayam1@gmail.com" +
        "?subject=" + encodeURIComponent("Website enquiry from " + name) +
        "&body=" + encodeURIComponent(body);

      var status = document.querySelector(".form-status");
      if (status) {
        status.textContent = "Your email app should now open with your message pre-filled — please hit send there to reach us.";
        status.classList.add("visible");
      }
      form.reset();
    });
  }

  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // Hero slider
  var heroSection = document.getElementById("hero");
  if (heroSection) {
    var heroSlides = [
      {
        heading: "Welcome to Tapovan Vidyalayam",
        desc: "A nurturing school in Jaggaiahpet dedicated to academic excellence, strong values, and the all-round development of every child.",
        ctaText: "Learn More",
        ctaHref: "about.html",
        stat: "5+ Years",
        statLabel: "of shaping young minds across our campuses",
        background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-dark) 100%)"
      },
      {
        heading: "A Foundation for Lifelong Learning",
        desc: "We combine strong academics with values, sports, and creativity to help every student grow into a confident, capable individual.",
        ctaText: "Explore Academics",
        ctaHref: "academics.html",
        stat: "2500+",
        statLabel: "students across our campuses",
        background: "linear-gradient(135deg, #1c6ea4 0%, #2f7d5c 100%)"
      },
      {
        heading: "Safe, Caring, and Inspiring",
        desc: "A secure, supportive environment where every child is known, valued, and encouraged to thrive.",
        ctaText: "Visit Us",
        ctaHref: "contact.html",
        stat: "15+",
        statLabel: "clubs & activities for every interest",
        background: "linear-gradient(135deg, #7a4fa0 0%, #c65b5b 100%)"
      }
    ];

    var heroIndex = 0;
    var heroFadeTimeout;
    var heroHeading = document.getElementById("hero-heading");
    var heroDesc = document.getElementById("hero-desc");
    var heroCta = document.getElementById("hero-cta");
    var heroStat = document.getElementById("hero-stat");
    var heroStatLabel = document.getElementById("hero-stat-label");
    var heroText = heroSection.querySelector(".hero-text");
    var heroVisual = heroSection.querySelector(".hero-visual");
    var heroDots = heroSection.querySelectorAll(".hero-dot");
    var heroTimer;

    function showHeroSlide(index) {
      var slide = heroSlides[index];
      heroText.classList.add("hero-fade");
      heroVisual.classList.add("hero-fade");
      clearTimeout(heroFadeTimeout);
      heroFadeTimeout = setTimeout(function () {
        heroHeading.textContent = slide.heading;
        heroDesc.textContent = slide.desc;
        heroCta.textContent = slide.ctaText;
        heroCta.setAttribute("href", slide.ctaHref);
        heroStat.textContent = slide.stat;
        heroStatLabel.textContent = slide.statLabel;
        heroSection.style.background = slide.background;
        heroText.classList.remove("hero-fade");
        heroVisual.classList.remove("hero-fade");
        heroDots.forEach(function (dot, i) {
          dot.classList.toggle("is-active", i === index);
        });
      }, 400);
    }

    function startHeroTimer() {
      heroTimer = setInterval(function () {
        heroIndex = (heroIndex + 1) % heroSlides.length;
        showHeroSlide(heroIndex);
      }, 6000);
    }

    heroDots.forEach(function (dot) {
      dot.addEventListener("click", function () {
        clearInterval(heroTimer);
        heroIndex = parseInt(dot.getAttribute("data-slide"), 10);
        showHeroSlide(heroIndex);
        startHeroTimer();
      });
    });

    startHeroTimer();
  }

  // Gallery lightbox
  var photoItems = Array.prototype.slice.call(document.querySelectorAll(".photo-item"));
  var lightbox = document.getElementById("lightbox");
  if (lightbox && photoItems.length) {
    var lightboxImg = document.getElementById("lightbox-img");
    var lightboxCaption = document.getElementById("lightbox-caption");
    var lightboxIndex = 0;

    function openLightbox(index) {
      lightboxIndex = index;
      var item = photoItems[lightboxIndex];
      lightboxImg.src = item.getAttribute("href");
      lightboxCaption.textContent = item.getAttribute("data-caption") || "";
      lightbox.classList.add("open");
    }

    function closeLightbox() {
      lightbox.classList.remove("open");
      lightboxImg.src = "";
    }

    function showRelative(delta) {
      lightboxIndex = (lightboxIndex + delta + photoItems.length) % photoItems.length;
      openLightbox(lightboxIndex);
    }

    photoItems.forEach(function (item, index) {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        openLightbox(index);
      });
    });

    lightbox.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
    lightbox.querySelector(".lightbox-prev").addEventListener("click", function () { showRelative(-1); });
    lightbox.querySelector(".lightbox-next").addEventListener("click", function () { showRelative(1); });
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("open")) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") showRelative(-1);
      if (e.key === "ArrowRight") showRelative(1);
    });
  }

  // Scroll reveal animation
  var revealEls = document.querySelectorAll(
    ".card, .section-head, .timeline-item, .gallery-item, .photo-item, .notice-list li, .hero-text, .hero-visual"
  );
  if ("IntersectionObserver" in window && revealEls.length) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) {
      el.classList.add("reveal");
      observer.observe(el);
    });
  }
});
