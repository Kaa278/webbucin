"use client";

import { useEffect, useState, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import Swiper from "swiper";
import { EffectCreative, Pagination, Autoplay } from "swiper/modules";
import Lenis from "lenis";
import { getSiteContent, getSliderImages, getGalleryImages } from "@/lib/cms";
import type { SiteContent, SliderImage, GalleryImage } from "@/lib/supabase";

import AOS from "aos";
import "aos/dist/aos.css";

import { motion, AnimatePresence } from "framer-motion";

// Swiper styles
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-creative";
import "swiper/css/effect-cards"; // Added this line

export default function Home() {
  const [daysTogether, setDaysTogether] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState({ src: "", caption: "" });
  const [showToast, setShowToast] = useState(false);

  // Supabase data
  const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
  const [sliderImages, setSliderImages] = useState<SliderImage[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [showAllGallery, setShowAllGallery] = useState(false);
  const [isLetterOpen, setIsLetterOpen] = useState(false);
  const [headerClickCount, setHeaderClickCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fxLayerRef = useRef<HTMLDivElement>(null);

  // Fetch data from Supabase
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const [content, slider, gallery] = await Promise.all([
        getSiteContent(),
        getSliderImages(),
        getGalleryImages(),
      ]);

      setSiteContent(content);
      setSliderImages(slider);
      setGalleryImages(gallery || []);
      setIsLoading(false);
      setTimeout(() => {
        AOS.refresh();
      }, 100);
    }

    fetchData();
  }, []);

  useEffect(() => {
    // 1. Days Together Calculation
    const updateDays = () => {
      const start = new Date((siteContent?.start_date || "2023-06-10") + "T00:00:00");
      const now = new Date();
      const diff = now.getTime() - start.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      setDaysTogether(Math.max(days, 0));
    };
    updateDays();
    const timer = setInterval(updateDays, 60000);

    // Initialize AOS
    AOS.init({
      duration: 800,
      once: false,
      mirror: true,
      offset: 100,
      easing: 'ease-out-cubic',
    });

    // 2. Lenis Smooth Scroll
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // 3. GSAP
    gsap.registerPlugin(ScrollTrigger);

    // Hero Intro
    gsap.from("#heroWrap > *", {
      opacity: 0,
      y: 18,
      duration: 0.9,
      ease: "power3.out",
      stagger: 0.08,
    });

    // Gallery Stagger
    // Gallery Stagger - only if items exist
    if (document.querySelector(".gallery-item")) {
      gsap.from(".gallery-item", {
        scrollTrigger: { trigger: "#gallery", start: "top 75%" },
        opacity: 0,
        y: 18,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.06,
      });
    }

    // Background Parallax animation (subtler movement)
    gsap.to(".bg-parallax", {
      y: 12, // Reduced from 24 to 12 to fit within 5% scale buffer
      duration: 3,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1,
    });


    // 4. Swiper
    const swiper = new Swiper(".aboutSwiper", {
      modules: [EffectCreative, Pagination, Autoplay],
      effect: "creative",
      grabCursor: true,
      centeredSlides: true,
      slidesPerView: "auto",
      loop: true,
      speed: 800,
      watchSlidesProgress: true,
      observer: true, // Auto update when slides change
      observeParents: true,
      creativeEffect: {
        limitProgress: 15, // Increase depth even more
        prev: {
          shadow: true,
          translate: ["-20%", 0, -120], // Mobile default (tighter)
          rotate: [0, 0, -4],
        },
        next: {
          shadow: true,
          translate: ["20%", 0, -120], // Mobile default (tighter)
          rotate: [0, 0, 4],
        },
      },
      breakpoints: {
        640: { // Desktop / Tablet
          creativeEffect: {
            limitProgress: 15,
            prev: {
              shadow: true,
              translate: ["-45%", 0, -150], // Much wider spread for desktop
              rotate: [0, 0, -8],
            },
            next: {
              shadow: true,
              translate: ["45%", 0, -150], // Much wider spread for desktop
              rotate: [0, 0, 8],
            },
          }
        }
      },
      pagination: {
        el: ".aboutSwiper .swiper-pagination",
        clickable: true,
      },
      autoplay: {
        delay: 3500,
        disableOnInteraction: false,
      },
    });

    // 5. Sparkle FX on mouse move
    let lastSpark = 0;
    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastSpark > 34) {
        spawnSparkle(e.clientX, e.clientY);
        lastSpark = now;
      }
    };
    window.addEventListener("mousemove", handleMouseMove);

    const parallaxImgs = document.querySelectorAll(".parallax-img");
    const parallaxHandlers: { img: Element; onMove: any; onLeave: any }[] = [];

    parallaxImgs.forEach((img: any) => {
      img.style.transition = "transform 0.1s ease-out";
      img.style.transform = "scale(1.05)";

      const onMove = (e: MouseEvent) => {
        const rect = img.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        img.style.transform = `scale(1.1) translate(${x * 14}px, ${y * 14}px)`;
      };

      const onLeave = () => {
        img.style.transition = "transform 0.4s ease-out";
        img.style.transform = "scale(1.05) translate(0px, 0px)";
      };

      img.addEventListener("mousemove", onMove);
      img.addEventListener("mouseleave", onLeave);
      parallaxHandlers.push({ img, onMove, onLeave });
    });

    return () => {
      clearInterval(timer);
      lenis.destroy();
      swiper.destroy();
      window.removeEventListener("mousemove", handleMouseMove);
      parallaxHandlers.forEach(({ img, onMove, onLeave }) => {
        img.removeEventListener("mousemove", onMove);
        img.removeEventListener("mouseleave", onLeave);
      });
    };

  }, []);

  // 4. Marquee Effect (Runs when content exists)
  useEffect(() => {
    if (galleryImages.length > 4) {
      // Kill previous animations if any to prevent stacking
      gsap.killTweensOf(".marquee-row-1");
      gsap.killTweensOf(".marquee-row-2");

      // Row 1: Moves Left
      gsap.fromTo(".marquee-row-1",
        { xPercent: 0 },
        { xPercent: -50, repeat: -1, duration: 40, ease: "none" }
      );

      // Row 2: Moves Right (Reversed data + Different speed)
      gsap.fromTo(".marquee-row-2",
        { xPercent: -50 },
        { xPercent: 0, repeat: -1, duration: 45, ease: "none" }
      );
    }
  }, [galleryImages]);

  const spawnSparkle = (x: number, y: number) => {
    if (!fxLayerRef.current) return;
    const el = document.createElement("div");
    el.className = "absolute pointer-events-none";
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.transform = "translate(-50%,-50%)";
    fxLayerRef.current.appendChild(el);
    setTimeout(() => el.remove(), 260);
  };

  const spawnHeart = (x: number, y: number) => {
    if (!fxLayerRef.current) return;
    const el = document.createElement("div");
    el.className = "absolute animate-drift select-none";
    el.style.left = (x + (Math.random() * 18 - 9)) + "px";
    el.style.top = (y + (Math.random() * 10 - 5)) + "px";
    el.style.transform = `translate(-50 %, -50 %) scale(${0.6 + Math.random() * 0.7})`;
    el.innerHTML = `< span style = "filter: drop-shadow(0 10px 20px rgba(59,130,246,.25));" >🤍</span > `;
    fxLayerRef.current.appendChild(el);
    setTimeout(() => el.remove(), 2300);
  };

  const heartBurst = (n = 12) => {
    const x = window.innerWidth * (0.25 + Math.random() * 0.5);
    const y = window.innerHeight * (0.25 + Math.random() * 0.5);
    for (let i = 0; i < n; i++) {
      setTimeout(() => spawnHeart(x, y), i * 30);
    }
  };

  const openLightbox = (src: string, caption: string) => {
    setLightboxData({ src, caption });
    setIsLightboxOpen(true);
    heartBurst(10);
  };

  const closeLightbox = () => {
    setIsLightboxOpen(false);
  };

  const copyLetter = async () => {
    const text = document.getElementById("letterText")?.textContent?.trim();
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 1200);
        heartBurst(12);
      } catch {
        alert("Gagal copy.");
      }
    }
  };

  const shareWA = () => {
    const text = document.getElementById("letterText")?.textContent?.trim();
    const msg = `💌 ${siteContent?.couple_name || ''} \n\n${text} \n\n— dari website kenangan ✦`;
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank");
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden">
      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#f7f9fc]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-600">Loading...</p>
          </div>
        </div>
      )}

      {/* Floating layer */}
      <div id="fx-layer" ref={fxLayerRef} className="pointer-events-none fixed inset-0 z-40"></div>

      {/* NAV */}
      <header className="absolute top-4 left-0 right-0 z-30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="relative px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p
                className="font-semibold text-lg cursor-pointer select-none"
                onClick={() => {
                  const newCount = headerClickCount + 1;
                  setHeaderClickCount(newCount);
                  if (newCount === 5) {
                    window.location.href = '/admin';
                  }
                }}
              >
                {siteContent?.couple_name || 'Loading...'}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img
            src={siteContent?.hero_image_url || '/images/gallery/bg.jpg'}
            alt="hero bg"
            className="w-full h-full object-cover scale-105 bg-parallax transition-[object-position] duration-500 ease-out"
            style={{ objectPosition: `center ${siteContent?.hero_image_position || 50}% ` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/65 via-white/55 to-[#f7f9fc]"></div>
        </div>

        <div className="max-w-4xl mx-auto px-4 text-center">
          <div id="heroWrap">
            <p className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-slate-700 border border-white/60 bg-white/55 rounded-full px-4 py-2 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> dokumentasi kenangan
            </p>

            <h1 className="mt-6 font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
              <span className="text-slate-900">Kita, dan semua hal kecil</span><br />
              <span className="text-slate-700">yang jadi besar karena bareng</span>
            </h1>

            <p className="mt-5 text-slate-700 leading-relaxed max-w-2xl mx-auto">
              Tempat paling rapi untuk nyimpen foto, kata-kata, dan momen yang nggak mau kita lupain.
              Clean, elegan, tapi tetap kerasa “cinematic”.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3" data-aos="fade-up" data-aos-delay="300">
              <a href="#about"
                className="rounded-2xl bg-blue-600 text-white px-6 py-3 font-semibold shadow-lg shadow-blue-500/20 hover:opacity-95 transition">
                Jelajahi Sekarang
              </a>

              <a href="#letter"
                className="rounded-2xl border border-slate-200 bg-white/70 px-6 py-3 font-semibold text-slate-800 hover:bg-white transition shadow-sm">
                Buka Surat
              </a>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative noise glass bg-white/70 border border-slate-200 rounded-2xl p-4 shadow-sm" data-aos="fade-up" data-aos-delay="400">
                <p className="text-xs text-slate-500">Nama</p>
                <p className="mt-1 font-semibold">{siteContent?.couple_name || 'Loading...'}</p>
              </div>
              <div className="relative noise glass bg-white/70 border border-slate-200 rounded-2xl p-4 shadow-sm" data-aos="fade-up" data-aos-delay="500">
                <p className="text-xs text-slate-500">Tanggal jadian</p>
                <p className="mt-1 font-semibold">{siteContent?.start_date || 'Loading...'}</p>
              </div>
              <div className="relative noise glass bg-white/70 border border-slate-200 rounded-2xl p-4 shadow-sm" data-aos="fade-up" data-aos-delay="600">
                <p className="text-xs text-slate-500">Sudah bersama</p>
                <p className="mt-1 font-semibold"><span>{daysTogether}</span> hari</p>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* ABOUT */}
      <section id="about" className="py-20 bg-[#f7f9fc]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="font-serif text-3xl sm:text-4xl text-slate-900" data-aos="fade-up">Tentang Kita</h2>
            <p className="mt-2 text-slate-600 max-w-2xl mx-auto" data-aos="fade-up" data-aos-delay="100">
              Cerita singkat yang nggak pernah selesai: kita yang terus belajar, terus sayang.
            </p>
            <p className="mt-6 text-slate-600 max-w-xl mx-auto leading-relaxed" data-aos="fade-up" data-aos-delay="200">
              {siteContent?.about_text || 'Loading...'}
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto mt-10">


            <div className="swiper aboutSwiper">
              <div className="swiper-wrapper">
                {sliderImages.map((slide) => (
                  <div key={slide.id} className="swiper-slide rounded-[2rem]">
                    <div className="aspect-[9/16] relative rounded-[2rem] overflow-hidden">
                      <img src={slide.image_url} className="parallax-img w-full h-full object-cover" alt={slide.caption} />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent"></div>
                      <div className="absolute bottom-6 left-6 text-white">
                        <p className="font-serif text-lg italic">"{slide.caption}"</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="swiper-pagination"></div>
            </div >
          </div >
        </div >
      </section >

      {/* GALLERY */}
      <section id="gallery" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">
            <h2 className="font-serif text-3xl sm:text-4xl" data-aos="fade-up">Potongan Perjalanan</h2>
            <p className="mt-2 text-slate-600 font-serif italic" data-aos="fade-up" data-aos-delay="100">Beberapa momen yang pengen kita inget terus.</p>
          </div>




          <div id="galleryGrid" className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryImages.slice(0, showAllGallery ? undefined : 8).map((item, index) => (
              <div
                key={item.id}
                className="gallery-item group flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-all duration-300"
                data-aos="fade-up"
                data-aos-delay={index % 4 * 100}
              >
                <div
                  className="relative aspect-[4/5] overflow-hidden cursor-pointer"
                  onClick={() => openLightbox(item.image_url, "")}
                >
                  <img
                    src={item.image_url}
                    alt="Gallery"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                </div>

                <div className="p-3">
                  <button
                    onClick={() => openLightbox(item.image_url, "")}
                    className="w-full py-2 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-500 text-xs font-semibold rounded-lg transition-colors duration-200 flex items-center justify-center gap-1 group-hover/btn"
                  >
                    <span></span> Lihat
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!showAllGallery && galleryImages.length > 8 && (
            <div className="mt-12 text-center">
              <button
                onClick={() => setShowAllGallery(true)}
                className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 font-semibold shadow-sm hover:bg-slate-50 hover:shadow-md hover:scale-105 transition-all duration-300"
              >
                Lihat Semua Gallery ({galleryImages.length})
              </button>
            </div>
          )}

          {showAllGallery && galleryImages.length > 8 && (
            <div className="mt-12 text-center">
              <button
                onClick={() => {
                  setShowAllGallery(false);
                  document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-8 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-slate-700 font-semibold shadow-sm hover:bg-slate-200 hover:scale-105 transition-all duration-300"
              >
                Sembunyikan
              </button>
            </div>
          )}
        </div>

      </section >

      {/* MOVING GALLERY SECTION */}
      {galleryImages.length > 4 && (
        <section className="py-12 bg-slate-50 overflow-hidden border-y border-slate-200">
          <div className="relative">
            {/* Fade edges */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none" />

            {/* Row 1 */}
            <div className="flex w-max marquee-row-1 mb-4 hover:pause">
              {/* Quadruple data for seamless 50% scrolling */}
              {[...galleryImages, ...galleryImages, ...galleryImages, ...galleryImages].map((item, i) => (
                <div key={`m1 - ${i} `} className="w-[200px] h-[120px] mx-2 rounded-xl overflow-hidden shrink-0 relative group shadow-sm opacity-100 transition-opacity">
                  <img src={item.image_url} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-in-out" />
                </div>
              ))}
            </div>

            {/* Row 2 (Reversed Data) */}
            <div className="flex w-max marquee-row-2">
              {/* Quadruple data & Reverse for randomness */}
              {[...galleryImages].reverse().concat([...galleryImages].reverse(), [...galleryImages].reverse(), [...galleryImages].reverse()).map((item, i) => (
                <div key={`m2 - ${i} `} className="w-[200px] h-[120px] mx-2 rounded-xl overflow-hidden shrink-0 relative group shadow-sm opacity-100 transition-opacity">
                  <img src={item.image_url} alt="" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-in-out" />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TRANSITION QUOTE */}
      <section className="py-16 text-center px-4" data-aos="fade-in" data-aos-duration="1200">
        <p className="font-serif italic text-xl text-slate-400 max-w-lg mx-auto leading-relaxed">
          "Dan di antara semua foto ini, ada satu hal yang nggak pernah berubah."
        </p>
      </section>

      {/* LETTER */}
      <section id="letter" className="py-24 bg-slate-50/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl sm:text-4xl text-slate-800" data-aos="fade-up">A Message For You</h2>
            <div className="mt-2 w-16 h-1 bg-red-200 mx-auto rounded-full" data-aos="fade-up" data-aos-delay="100"></div>
          </div>

          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              {!isLetterOpen ? (
                <motion.div
                  key="cta"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
                  className="flex flex-col items-center justify-center p-8 cursor-pointer"
                  onClick={() => setIsLetterOpen(true)}
                >
                  <div className="relative group">
                    <div className="absolute -inset-4 bg-red-100/50 rounded-[3rem] blur-2xl group-hover:bg-red-200/50 transition-colors duration-500"></div>
                    <div className="relative bg-white border border-red-100 p-10 sm:p-16 rounded-[2.5rem] shadow-xl shadow-red-900/5 flex flex-col items-center gap-6 group-hover:translate-y-[-8px] transition-transform duration-500">
                      <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-500">
                        💌
                      </div>
                      <div className="text-center">
                        <p className="font-serif text-xl text-slate-800">Ada pesan untuk kamu...</p>
                        <p className="text-sm text-slate-400 mt-1 uppercase tracking-widest">Klik untuk membuka</p>
                      </div>
                      <button className="mt-4 px-8 py-3 bg-red-500 text-white rounded-2xl font-semibold shadow-lg shadow-red-500/30 hover:bg-red-600 transition-colors">
                        Buka Surat
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="letter"
                  initial={{ opacity: 0, y: 50, rotateX: -15, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                  transition={{ type: "spring", damping: 25, stiffness: 120 }}
                  className="relative lux-letter"
                >
                  <div className="paper-texture rounded-[2rem] p-8 sm:p-12 shadow-2xl luxury-glow border border-orange-100">
                    {/* Decorative Stamp */}
                    <div className="absolute top-8 right-8 w-12 h-12 border-2 border-red-200/30 rounded-full flex items-center justify-center text-red-200/50 font-serif text-xs rotate-12 flex-col leading-none">
                      <span>LOVE</span>
                      <span>14/02</span>
                    </div>

                    <div className="prose prose-slate max-w-none">
                      <p className="text-slate-800 leading-[1.8] font-serif text-lg sm:text-xl whitespace-pre-wrap italic decoration-red-200/30 decoration-wavy underline-offset-8" id="letterText">
                        {siteContent?.letter_text || 'Loading...'}
                      </p>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-100 flex flex-wrap gap-4 justify-between items-center">
                      <div className="flex gap-3">
                        <button onClick={copyLetter}
                          className="rounded-xl bg-slate-900 text-white px-6 py-3 text-sm font-semibold hover:opacity-90 transition shadow-lg">
                          Copy surat
                        </button>
                        <button onClick={shareWA}
                          className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition shadow-md">
                          Share WA
                        </button>
                      </div>
                      <button
                        onClick={() => setIsLetterOpen(false)}
                        className="text-slate-400 hover:text-red-400 transition-colors text-sm font-medium underline underline-offset-4"
                      >
                        Tutup surat
                      </button>
                    </div>

                    {showToast && (
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 text-sm font-medium text-emerald-600 text-center"
                      >
                        Tersalin ke clipboard ✨
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <footer className="py-10">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-500 text-sm">
          {siteContent?.couple_name || ''}
        </div>
      </footer>

      {/* Lightbox */}
      {
        isLightboxOpen && (
          <div onClick={closeLightbox} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 animate-fade-in">
            <div className="relative max-w-4xl w-full animate-pop" onClick={(e) => e.stopPropagation()}>
              <button onClick={closeLightbox}
                className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white text-slate-900 font-bold shadow-lg z-10 hover:scale-110 transition-transform">
                ✕
              </button>
              <div className="rounded-3xl overflow-hidden border border-white/20 bg-white/10 glass shadow-2xl">
                <img src={lightboxData.src} className="w-full max-h-[78vh] object-cover" alt="preview" />
                {lightboxData.caption && <div className="p-4 text-white/90 text-sm font-medium text-center">{lightboxData.caption}</div>}
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}
