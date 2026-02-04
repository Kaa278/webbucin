"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getSiteContent, getSliderImages, getGalleryImages, updateSiteContent, uploadImage } from "@/lib/cms";
import type { SiteContent, SliderImage, GalleryImage } from "@/lib/supabase";

export default function AdminPanel() {
    const [user, setUser] = useState<any>(null);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isLogin, setIsLogin] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState<{ type: 'success' | 'error', title: string, message: string }>({ type: 'success', title: '', message: '' });

    // Bulk Selection State
    const [selectedGalleryItems, setSelectedGalleryItems] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const [selectedSliderItems, setSelectedSliderItems] = useState<string[]>([]);
    const [isSliderSelectionMode, setIsSliderSelectionMode] = useState(false);

    // Data states
    const [siteContent, setSiteContent] = useState<SiteContent | null>(null);
    const [sliderImages, setSliderImages] = useState<SliderImage[]>([]);
    const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);

    // Form states
    const [editMode, setEditMode] = useState<"content" | "slider" | "gallery">("content");

    useEffect(() => {
        // Check current session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                loadData();
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                loadData();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const loadData = async () => {
        const [content, slider, gallery] = await Promise.all([
            getSiteContent(),
            getSliderImages(),
            getGalleryImages(),
        ]);
        setSiteContent(content);
        setSliderImages(slider);
        setGalleryImages(gallery);
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                setMessage("✅ Login berhasil!");
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                setMessage("✅ Akun berhasil dibuat! Silakan login.");
                setIsLogin(true);
            }
        } catch (error: any) {
            setMessage(`❌ ${error.message}`);
        }

        setLoading(false);
        setTimeout(() => setMessage(""), 3000);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    const handleUpdateContent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!siteContent) return;

        setLoading(true);
        const success = await updateSiteContent(siteContent);

        if (success) {
            setModalConfig({
                type: 'success',
                title: 'Berhasil!',
                message: 'Data konten website berhasil disimpan.'
            });
            setShowModal(true);
        } else {
            setModalConfig({
                type: 'error',
                title: 'Gagal!',
                message: 'Terjadi kesalahan saat menyimpan data. Cek koneksi atau coba lagi.'
            });
            setShowModal(true);
        }
        setLoading(false);
    };

    const handleImageUpload = async (file: File, type: "slider" | "gallery", position?: number) => {
        setLoading(true);
        const path = `${type}/${Date.now()}_${file.name}`;
        const url = await uploadImage(file, "images", path);

        if (url) {
            if (type === "slider" && position) {
                const { error } = await supabase
                    .from("slider_images")
                    .update({ image_url: url })
                    .eq("position", position);

                if (!error) {
                    setMessage("✅ Gambar slider berhasil diupload!");
                    loadData();
                }
            } else if (type === "gallery") {
                const maxOrder = Math.max(...galleryImages.map(g => g.order), 0);
                const { error } = await supabase
                    .from("gallery_images")
                    .insert({ image_url: url, order: maxOrder + 1 });

                if (!error) {
                    setMessage("✅ Gambar gallery berhasil ditambahkan!");
                    loadData();
                }
            }
        } else {
            setMessage("❌ Gagal upload gambar");
        }

        setLoading(false);
        setTimeout(() => setMessage(""), 3000);
    };

    const handleAddSlider = async (files: File[]) => {
        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        // Debug: Check auth state
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Current User ID:", session?.user?.id);
        if (!session?.user) {
            console.error("❌ NO USER SESSION! Operations will fail RLS.");
            setMessage("❌ Error: Tidak ada sesi login aktif.");
            setLoading(false);
            return;
        }

        // Get initial max position
        const currentSliders = await supabase.from("slider_images").select("position").order("position", { ascending: false }).limit(1);
        let maxPosition = currentSliders.data?.[0]?.position || 0;
        console.log("Current max position in DB:", maxPosition); // Changed log message to avoid confusion

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(`--- Processing File ${i + 1}/${files.length} ---`);
            console.log("File Name:", file.name);
            console.log("File Size:", file.size);
            console.log("File Type:", file.type);
            // Use more unique filename with random string
            const randomStr = Math.random().toString(36).substring(7);
            const path = `slider/${Date.now()}_${randomStr}_${file.name}`;
            console.log(`Uploading file ${i + 1}/${files.length}:`, file.name);


            console.log("Attempting upload...");
            const url = await uploadImage(file, "images", path);
            console.log("Upload Result URL:", url);

            if (url) {
                maxPosition++; // Increment for each new slider
                console.log(`Inserting db record at position ${maxPosition}`);
                const { error } = await supabase
                    .from("slider_images")
                    .insert({ image_url: url, caption: `Slide ${maxPosition}`, position: maxPosition });

                if (!error) {
                    successCount++;
                    console.log(`✅ Slider ${i + 1} inserted successfully`);
                } else {
                    console.error(`❌ DB Insert Error for slider ${i + 1}:`, error);
                    console.error("Error details:", JSON.stringify(error, null, 2));
                    failCount++;
                }
            } else {
                console.error(`❌ Upload Failed for file ${i + 1}:`, file.name);
                failCount++;
            }

            // Small delay to prevent overwhelming the connection
            if (i < files.length - 1) {
                console.log("Waiting 100ms...");
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        if (successCount > 0) {
            setMessage(`✅ ${successCount} slider berhasil ditambahkan!${failCount > 0 ? ` (${failCount} gagal)` : ''}`);
            loadData();
        } else {
            setMessage("❌ Gagal menambahkan slider");
        }

        setLoading(false);
        setTimeout(() => setMessage(""), 3000);
    };

    const handleAddGalleryBulk = async (files: File[]) => {
        setLoading(true);
        let successCount = 0;
        let failCount = 0;

        // Debug: Check auth state
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            console.error("❌ NO USER SESSION IN GALLERY UPLOAD!");
            setMessage("❌ Error: Tidak ada sesi login aktif.");
            setLoading(false);
            return;
        }

        // Get initial max order
        const currentGallery = await supabase.from("gallery_images").select("order").order("order", { ascending: false }).limit(1);
        let maxOrder = currentGallery.data?.[0]?.order || 0;
        console.log("Current max order in DB:", maxOrder); // Changed log message to avoid confusion

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(`--- Processing Gallery File ${i + 1}/${files.length} ---`);
            // Use more unique filename with random string
            const randomStr = Math.random().toString(36).substring(7);
            const path = `gallery/${Date.now()}_${randomStr}_${file.name}`;

            console.log("Attempting upload...", file.name);
            const url = await uploadImage(file, "images", path);
            console.log("Upload Result URL:", url);

            if (url) {
                maxOrder++; // Increment for each new photo
                console.log(`Inserting gallery db record at order ${maxOrder}`);
                const { error } = await supabase
                    .from("gallery_images")
                    .insert({ image_url: url, order: maxOrder });

                if (!error) {
                    successCount++;
                    console.log(`✅ Gallery photo ${i + 1} inserted successfully`);
                } else {
                    console.error(`❌ DB Insert Error for gallery ${i + 1}:`, error);
                    failCount++;
                }
            } else {
                console.error(`❌ Upload Failed for gallery file ${i + 1}:`, file.name);
                failCount++;
            }

            if (i < files.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        if (successCount > 0) {
            setMessage(`✅ ${successCount} foto berhasil ditambahkan!${failCount > 0 ? ` (${failCount} gagal)` : ''}`);
            loadData();
        } else {
            setMessage("❌ Gagal menambahkan foto");
        }

        setLoading(false);
        setTimeout(() => setMessage(""), 3000);
    };


    const handleDeleteSlider = async (id: string) => {
        if (!confirm("Yakin mau hapus slider ini?")) return;

        setLoading(true);
        const { error } = await supabase
            .from("slider_images")
            .delete()
            .eq("id", id);

        if (!error) {
            setMessage("✅ Slider berhasil dihapus!");
            loadData();
        } else {
            setMessage("❌ Gagal hapus slider");
        }

        setLoading(false);
        setTimeout(() => setMessage(""), 3000);
    };

    const toggleSliderSelection = (id: string) => {
        if (selectedSliderItems.includes(id)) {
            setSelectedSliderItems(selectedSliderItems.filter(item => item !== id));
        } else {
            setSelectedSliderItems([...selectedSliderItems, id]);
        }
    };

    const handleBulkDeleteSlider = async () => {
        if (selectedSliderItems.length === 0) return;
        if (!confirm(`Yakin mau hapus ${selectedSliderItems.length} slider sekaligus?`)) return;

        setLoading(true);
        const { error } = await supabase
            .from("slider_images")
            .delete()
            .in("id", selectedSliderItems);

        if (!error) {
            setModalConfig({
                type: 'success',
                title: 'Berhasil!',
                message: `${selectedSliderItems.length} slider berhasil dihapus.`
            });
            setShowModal(true);
            setSelectedSliderItems([]);
            loadData();
        } else {
            setModalConfig({
                type: 'error',
                title: 'Gagal!',
                message: 'Gagal menghapus slider terpilih.'
            });
            setShowModal(true);
        }
        setLoading(false);
    };

    const handleUpdateSliderCaption = async (id: string, caption: string) => {
        const { error } = await supabase
            .from("slider_images")
            .update({ caption })
            .eq("id", id);

        // No success message for caption update to avoid spam, just reload
        if (!error) loadData();
    };

    const handleDeleteGalleryImage = async (id: string) => {
        if (!confirm("Yakin mau hapus gambar ini?")) return;

        setLoading(true);
        const { error } = await supabase
            .from("gallery_images")
            .delete()
            .eq("id", id);

        if (!error) {
            setMessage("✅ Gambar berhasil dihapus!");
            setSelectedGalleryItems(prev => prev.filter(item => item !== id));
            loadData();
        } else {
            setMessage("❌ Gagal hapus gambar");
        }

        setLoading(false);
        setTimeout(() => setMessage(""), 3000);
    };

    const toggleGallerySelection = (id: string) => {
        if (selectedGalleryItems.includes(id)) {
            setSelectedGalleryItems(selectedGalleryItems.filter(item => item !== id));
        } else {
            setSelectedGalleryItems([...selectedGalleryItems, id]);
        }
    };

    const handleBulkDeleteGallery = async () => {
        if (selectedGalleryItems.length === 0) return;
        if (!confirm(`Yakin mau hapus ${selectedGalleryItems.length} gambar sekaligus?`)) return;

        setLoading(true);
        const { error } = await supabase
            .from("gallery_images")
            .delete()
            .in("id", selectedGalleryItems);

        if (!error) {
            setModalConfig({
                type: 'success',
                title: 'Berhasil!',
                message: `${selectedGalleryItems.length} gambar berhasil dihapus.`
            });
            setShowModal(true);
            setSelectedGalleryItems([]);
            loadData();
        } else {
            setModalConfig({
                type: 'error',
                title: 'Gagal!',
                message: 'Gagal menghapus gambar terpilih.'
            });
            setShowModal(true);
        }
        setLoading(false);
    };



    if (!user) {
        return (
            <div className="min-h-screen bg-[#f7f9fc] flex items-center justify-center p-4">
                <div className="max-w-md w-full">
                    {/* Logo & Title */}
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                            <span className="text-4xl">✦</span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Panel</h1>
                        <p className="text-slate-600">Kelola konten website kamu</p>
                    </div>

                    {/* Auth Form */}
                    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-lg">
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setIsLogin(true)}
                                className={`flex-1 py-2 px-4 rounded-xl font-medium transition ${isLogin
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => setIsLogin(false)}
                                className={`flex-1 py-2 px-4 rounded-xl font-medium transition ${!isLogin
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                            >
                                Sign Up
                            </button>
                        </div>

                        <form onSubmit={handleAuth} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@example.com"
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Loading..." : isLogin ? "Login" : "Create Account"}
                            </button>
                        </form>

                        {message && (
                            <div className={`mt-4 p-3 rounded-xl text-sm text-center ${message.includes("✅")
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                                }`}>
                                {message}
                            </div>
                        )}
                    </div>

                    <p className="text-center text-xs text-slate-500 mt-6">
                        Powered by Supabase Authentication
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f7f9fc]">
            {/* Header */}
            <header className="absolute top-0 left-0 right-0 z-30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 border border-slate-900/10 bg-white/50 backdrop-blur-sm rounded-xl flex items-center justify-center">
                            <span className="text-xl">✨</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">The Backstage 🌟</h1>
                            <p className="text-xs text-slate-500 font-medium">Mode Serius 😤 • {user.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white/50 hover:bg-white hover:text-red-500 border border-slate-200/60 rounded-xl transition backdrop-blur-sm flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                        </svg>
                        Cabut
                    </button>
                </div>
            </header>

            {/* Tabs */}
            <div className="pt-24 pb-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="flex gap-2 overflow-x-auto p-1">
                        <button
                            onClick={() => setEditMode("content")}
                            className={`px-5 py-3 text-sm font-semibold rounded-2xl transition flex items-center gap-2 border ${editMode === "content"
                                ? "bg-white border-slate-200 text-slate-900 shadow-sm"
                                : "bg-transparent border-transparent text-slate-500 hover:bg-white/40 hover:text-slate-700"
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            Konten
                        </button>
                        <button
                            onClick={() => setEditMode("slider")}
                            className={`px-5 py-3 text-sm font-semibold rounded-2xl transition flex items-center gap-2 border ${editMode === "slider"
                                ? "bg-white border-slate-200 text-slate-900 shadow-sm"
                                : "bg-transparent border-transparent text-slate-500 hover:bg-white/40 hover:text-slate-700"
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                            </svg>
                            Slider
                        </button>
                        <button
                            onClick={() => setEditMode("gallery")}
                            className={`px-5 py-3 text-sm font-semibold rounded-2xl transition flex items-center gap-2 border ${editMode === "gallery"
                                ? "bg-white border-slate-200 text-slate-900 shadow-sm"
                                : "bg-transparent border-transparent text-slate-500 hover:bg-white/40 hover:text-slate-700"
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                            </svg>
                            Gallery
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Modal Alert */}
                {showModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 transform scale-100 animate-in zoom-in-95 duration-200">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${modalConfig.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {modalConfig.type === 'success' ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-8 h-8">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-center text-slate-900 mb-2">{modalConfig.title}</h3>
                            <p className="text-center text-slate-500 mb-6">{modalConfig.message}</p>
                            <button
                                onClick={() => setShowModal(false)}
                                className="w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition shadow-lg"
                            >
                                Oke, Siap!
                            </button>
                        </div>
                    </div>
                )}

                {/* Content Editor */}
                {editMode === "content" && siteContent && (
                    <form onSubmit={handleUpdateContent} className="space-y-6">
                        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-lg">
                            <h2 className="text-2xl font-bold text-slate-900 mb-6">Edit Konten Website</h2>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Nama Pasangan
                                    </label>
                                    <input
                                        type="text"
                                        value={siteContent.couple_name}
                                        onChange={(e) => setSiteContent({ ...siteContent, couple_name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Tanggal Jadian
                                    </label>
                                    <input
                                        type="date"
                                        value={siteContent.start_date}
                                        onChange={(e) => setSiteContent({ ...siteContent, start_date: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Teks About
                                    </label>
                                    <textarea
                                        value={siteContent.about_text}
                                        onChange={(e) => setSiteContent({ ...siteContent, about_text: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Teks Surat
                                    </label>
                                    <textarea
                                        value={siteContent.letter_text}
                                        onChange={(e) => setSiteContent({ ...siteContent, letter_text: e.target.value })}
                                        rows={4}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Hero Background Image
                                    </label>
                                    <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-slate-200 flex items-center justify-center">
                                        {siteContent.hero_image_url ? (
                                            <img
                                                src={siteContent.hero_image_url}
                                                alt="Hero background"
                                                className="w-full h-full object-cover transition-all duration-300"
                                                style={{ objectPosition: `center ${siteContent.hero_image_position || 50}%` }}
                                            />
                                        ) : (
                                            <span className="text-slate-400 text-sm">Belum ada gambar</span>
                                        )}
                                    </div>

                                    <div className="mb-4 bg-slate-100 p-4 rounded-xl border border-slate-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                                Posisi Foto (Vertikal)
                                            </label>
                                            <span className="text-xs font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">
                                                {siteContent.hero_image_position || 50}%
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={siteContent.hero_image_position || 50}
                                            onChange={(e) => setSiteContent({ ...siteContent, hero_image_position: parseInt(e.target.value) })}
                                            className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
                                        />
                                        <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium uppercase">
                                            <span>Atas</span>
                                            <span>Tengah</span>
                                            <span>Bawah</span>
                                        </div>
                                    </div>

                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setLoading(true);
                                                const path = `hero/${Date.now()}_${file.name}`;
                                                const url = await uploadImage(file, "images", path);
                                                if (url) {
                                                    setSiteContent({ ...siteContent, hero_image_url: url });
                                                    setMessage("✅ Hero image berhasil diupload!");
                                                } else {
                                                    setMessage("❌ Gagal upload gambar");
                                                }
                                                setLoading(false);
                                                setTimeout(() => setMessage(""), 3000);
                                            }
                                            e.target.value = '';
                                        }}
                                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="mt-8 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
                            >
                                {loading ? "Menyimpan..." : "💾 Simpan Perubahan"}
                            </button>
                        </div>
                    </form>
                )}

                {/* Slider Editor */}
                {editMode === "slider" && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Edit Slider Images</h2>

                            <div className="flex gap-2">
                                {isSliderSelectionMode ? (
                                    <>
                                        {selectedSliderItems.length > 0 && (
                                            <button
                                                onClick={handleBulkDeleteSlider}
                                                className="px-4 py-3 bg-red-100 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-200 transition-all animate-in fade-in"
                                            >
                                                🗑️ Hapus ({selectedSliderItems.length})
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setIsSliderSelectionMode(false);
                                                setSelectedSliderItems([]);
                                            }}
                                            className="px-4 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-all"
                                        >
                                            Batal
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setIsSliderSelectionMode(true)}
                                        className="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all"
                                    >
                                        ✅ Pilih Foto
                                    </button>
                                )}

                                <label className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all">
                                    ➕ Tambah Slider
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            const fileList = e.target.files;
                                            if (fileList && fileList.length > 0) {
                                                const filesArray = Array.from(fileList);
                                                handleAddSlider(filesArray);
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {sliderImages.map((slide) => (
                                <div key={slide.id}
                                    className={`group relative bg-slate-50 border-2 rounded-2xl p-4 transition ${isSliderSelectionMode
                                            ? `cursor-pointer ${selectedSliderItems.includes(slide.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`
                                            : 'border-slate-200 hover:border-blue-500'
                                        }`}
                                    onClick={() => isSliderSelectionMode && toggleSliderSelection(slide.id)}
                                >
                                    {isSliderSelectionMode && (
                                        <div className="absolute top-4 right-4 z-10 animate-in fade-in zoom-in duration-200">
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${selectedSliderItems.includes(slide.id) ? 'bg-blue-600 border-blue-600' : 'bg-white/80 border-slate-300'
                                                }`}>
                                                {selectedSliderItems.includes(slide.id) && <span className="text-white text-xs">✓</span>}
                                            </div>
                                        </div>
                                    )}

                                    <div className="aspect-[9/16] rounded-xl overflow-hidden mb-4 bg-slate-200 pointer-events-none">
                                        <img src={slide.image_url} alt={slide.caption} className="w-full h-full object-cover" />
                                    </div>
                                    <input
                                        type="text"
                                        value={slide.caption}
                                        onChange={(e) => handleUpdateSliderCaption(slide.id, e.target.value)}
                                        className={`w-full text-sm px-3 py-2 bg-white border border-slate-200 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500 ${isSliderSelectionMode ? 'pointer-events-none opacity-60' : ''}`}
                                        placeholder="Caption slider"
                                        onClick={(e) => e.stopPropagation()} // Allow typing if not disabled, but prevent selection toggle (if not disabled)
                                        disabled={isSliderSelectionMode}
                                    />
                                    <label className={`block mb-2 ${isSliderSelectionMode ? 'pointer-events-none opacity-60' : ''}`}>
                                        <span className="sr-only">Upload gambar</span>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            disabled={isSliderSelectionMode}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleImageUpload(file, "slider", slide.position);
                                                e.target.value = '';
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 file:cursor-pointer cursor-pointer"
                                        />
                                    </label>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSlider(slide.id);
                                        }}
                                        disabled={isSliderSelectionMode}
                                        className={`w-full text-xs font-semibold text-red-600 hover:text-white hover:bg-red-600 py-2 rounded-lg transition ${isSliderSelectionMode ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        🗑️ Hapus
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Gallery Editor */}
                {editMode === "gallery" && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-lg">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Edit Gallery</h2>

                            <div className="flex gap-2">
                                {isSelectionMode ? (
                                    <>
                                        {selectedGalleryItems.length > 0 && (
                                            <button
                                                onClick={handleBulkDeleteGallery}
                                                className="px-4 py-3 bg-red-100 text-red-600 text-sm font-semibold rounded-xl hover:bg-red-200 transition-all animate-in fade-in"
                                            >
                                                🗑️ Hapus ({selectedGalleryItems.length})
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setIsSelectionMode(false);
                                                setSelectedGalleryItems([]);
                                            }}
                                            className="px-4 py-3 bg-slate-100 text-slate-600 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-all"
                                        >
                                            Batal
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setIsSelectionMode(true)}
                                        className="px-4 py-3 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-all"
                                    >
                                        ✅ Pilih Foto
                                    </button>
                                )}

                                <label className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-semibold rounded-xl cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all">
                                    ➕ Tambah Foto
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={(e) => {
                                            const fileList = e.target.files;
                                            if (fileList && fileList.length > 0) {
                                                const filesArray = Array.from(fileList);
                                                handleAddGalleryBulk(filesArray);
                                            }
                                            e.target.value = '';
                                        }}
                                    />
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {galleryImages.map((img) => (
                                <div key={img.id}
                                    className={`group relative bg-slate-50 border-2 rounded-2xl p-3 transition ${isSelectionMode
                                        ? `cursor-pointer ${selectedGalleryItems.includes(img.id) ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`
                                        : 'border-slate-200'
                                        }`}
                                    onClick={() => isSelectionMode && toggleGallerySelection(img.id)}
                                >
                                    {isSelectionMode && (
                                        <div className="absolute top-4 right-4 z-10 animate-in fade-in zoom-in duration-200">
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${selectedGalleryItems.includes(img.id) ? 'bg-blue-600 border-blue-600' : 'bg-white/80 border-slate-300'
                                                }`}>
                                                {selectedGalleryItems.includes(img.id) && <span className="text-white text-xs">✓</span>}
                                            </div>
                                        </div>
                                    )}

                                    <div className="aspect-square rounded-xl overflow-hidden mb-3 bg-slate-200">
                                        <img src={img.image_url} alt="Gallery Photo" className="w-full h-full object-cover pointer-events-none" />
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent toggling selection
                                            handleDeleteGalleryImage(img.id);
                                        }}
                                        className={`w-full text-xs font-semibold text-red-600 hover:text-white hover:bg-red-600 py-2 rounded-lg transition ${isSelectionMode ? 'opacity-50 pointer-events-none' : ''}`}
                                    >
                                        🗑️ Hapus
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
