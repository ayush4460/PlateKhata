"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ApiClient } from "@/services/api.service";
import {
  QrCode,
  Monitor,
  ChefHat,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Phone,
  Mail,
  Menu,
  X,
  Smartphone,
  Tablet,
  Laptop,
  Instagram,
  Linkedin,
  Twitter,
  MessageCircle,
} from "lucide-react";
import { FadeIn } from "@/components/ui/fade-in";
import { useToast } from "@/hooks/use-toast";

interface Restaurant {
  restaurant_id: number;
  name: string;
  slug: string;
  address?: string;
  contact_email: string;
  logo?: string;
}

export default function LandingPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [date] = useState(new Date().getFullYear());
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Demo Form State
  const [demoOpen, setDemoOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    restaurantName: "",
    phone: "",
    city: "",
    email: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);

    // Fetch partners
    const fetchRestaurants = async () => {
      try {
        const res = await ApiClient.get<Restaurant[]>("/public/restaurants");
        if (Array.isArray(res.data)) {
          setRestaurants(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch restaurants:", error);
      }
    };
    fetchRestaurants();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await ApiClient.post("/public/book-demo", formData);
      toast({
        title: "Request Sent!",
        description:
          "We've received your request. Our team will contact you shortly.",
        variant: "default",
        className: "bg-green-600 text-white border-none",
      });
      setDemoOpen(false);
      setFormData({
        name: "",
        restaurantName: "",
        phone: "",
        city: "",
        email: "",
      });
    } catch (error: any) {
      toast({
        title: "Submission Failed",
        description:
          error.response?.data?.message ||
          "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 selection:bg-orange-100 selection:text-orange-900 font-sans">
      {/* --- NAVBAR --- */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/90 backdrop-blur-md shadow-sm py-2"
            : "bg-transparent py-4"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight flex items-center gap-2 group"
          >
            <div className="h-10 w-10 relative group-hover:scale-110 transition-transform duration-300">
              <img
                src="/favicon.ico"
                alt="PlateKhata Logo"
                className="h-full w-full object-contain drop-shadow-lg"
              />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-600">
              PlateKhata
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-neutral-600">
            <button
              onClick={() => scrollTo("features")}
              className="hover:text-orange-600 transition-colors"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo("analytics")}
              className="hover:text-orange-600 transition-colors"
            >
              Analytics
            </button>
            <button
              onClick={() => scrollTo("partners")}
              className="hover:text-orange-600 transition-colors"
            >
              Partners
            </button>
            <div className="flex flex-col items-end text-xs text-neutral-400 font-normal border-l pl-6 ml-2 border-neutral-200">
              <a
                href="tel:+917878065085"
                className="hover:text-orange-600 transition-colors flex items-center gap-1"
              >
                <Phone className="h-3 w-3" /> +91 7878065085
              </a>
              <a
                href="mailto:support@platekhata.in"
                className="hover:text-orange-600 transition-colors flex items-center gap-1 mt-0.5"
              >
                <Mail className="h-3 w-3" /> support@platekhata.in
              </a>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-neutral-600 hover:text-orange-600 transition-colors"
            >
              Login
            </Link>
            <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
              <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white font-semibold shadow-lg shadow-orange-500/20 rounded-full px-6 transition-all hover:scale-105 active:scale-95">
                  Book a Demo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-white border-none shadow-2xl">
                <div className="bg-orange-50 p-6 border-b border-orange-100">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-orange-900">
                      Get a Free Demo
                    </DialogTitle>
                    <DialogDescription className="text-orange-700/80">
                      See how PlateKhata can transform your restaurant.
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <div className="p-6">
                  <form onSubmit={handleDemoSubmit} className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Your Name</Label>
                      <Input
                        id="name"
                        required
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="border-neutral-200 focus:border-orange-500 focus:ring-orange-500/20"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="restaurant">Restaurant Name</Label>
                      <Input
                        id="restaurant"
                        required
                        placeholder="Spice Garden"
                        value={formData.restaurantName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            restaurantName: e.target.value,
                          })
                        }
                        className="border-neutral-200 focus:border-orange-500 focus:ring-orange-500/20"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          required
                          placeholder="+91 98765..."
                          value={formData.phone}
                          onChange={(e) =>
                            setFormData({ ...formData, phone: e.target.value })
                          }
                          className="border-neutral-200 focus:border-orange-500 focus:ring-orange-500/20"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          required
                          placeholder="Mumbai"
                          value={formData.city}
                          onChange={(e) =>
                            setFormData({ ...formData, city: e.target.value })
                          }
                          className="border-neutral-200 focus:border-orange-500 focus:ring-orange-500/20"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        required
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="border-neutral-200 focus:border-orange-500 focus:ring-orange-500/20"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full mt-4 bg-orange-600 hover:bg-orange-700 text-white font-bold py-6 rounded-xl"
                      disabled={loading}
                    >
                      {loading ? "Sending..." : "Request Demo"}
                    </Button>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden p-2 text-neutral-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-t border-neutral-100 shadow-xl p-4 flex flex-col gap-4 animate-in slide-in-from-top-2">
            <button
              onClick={() => scrollTo("features")}
              className="text-left p-2 hover:bg-neutral-50 rounded-lg font-medium"
            >
              Features
            </button>
            <button
              onClick={() => scrollTo("analytics")}
              className="text-left p-2 hover:bg-neutral-50 rounded-lg font-medium"
            >
              Analytics
            </button>
            <button
              onClick={() => scrollTo("partners")}
              className="text-left p-2 hover:bg-neutral-50 rounded-lg font-medium"
            >
              Partners
            </button>
            <Link
              href="/login"
              className="text-left p-2 hover:bg-neutral-50 rounded-lg font-medium"
            >
              Login Panel
            </Link>
            <Button
              onClick={() => setDemoOpen(true)}
              className="w-full bg-orange-600 text-white"
            >
              Book a Demo
            </Button>
          </div>
        )}
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-[600px] w-[600px] rounded-full bg-orange-500/5 blur-[120px]" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-[400px] w-[400px] rounded-full bg-blue-500/5 blur-[100px]" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="flex-1 text-center lg:text-left">
              <FadeIn delay={100}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-50 text-orange-600 border border-orange-100 text-sm font-semibold mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                  </span>
                  #1 POS for Modern Restaurants
                </div>
              </FadeIn>

              <FadeIn delay={200}>
                <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-neutral-900 mb-6 leading-[1.1]">
                  Manage less. <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">
                    Cook more.
                  </span>
                </h1>
              </FadeIn>

              <FadeIn delay={300}>
                <p className="text-lg lg:text-xl text-neutral-500 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                  PlateKhata is the all-in-one restaurant management platform.
                  From QR ordering to KDS and Inventory, we handle the chaos so
                  you can focus on the food.
                </p>
              </FadeIn>

              <FadeIn delay={400}>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <Button
                    onClick={() => setDemoOpen(true)}
                    size="lg"
                    className="h-14 px-8 rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg shadow-xl shadow-orange-600/20 transition-all hover:scale-105 active:scale-95"
                  >
                    Book a Free Demo
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-14 px-8 rounded-full border-2 border-neutral-200 hover:border-neutral-900 hover:bg-neutral-900 hover:text-white font-bold text-lg transition-all"
                  >
                    <Link href="#features">See How It Works</Link>
                  </Button>
                </div>
              </FadeIn>

              <FadeIn delay={500}>
                <div className="mt-10 flex items-center justify-center lg:justify-start gap-6 text-sm text-neutral-500 font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" /> Free
                    Setup
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" /> 24/7
                    Support
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" /> Cancel
                    Anytime
                  </div>
                </div>
              </FadeIn>
            </div>

            <FadeIn
              delay={300}
              direction="left"
              className="flex-1 w-full max-w-[600px] lg:max-w-none relative perspective-[2000px] group"
            >
              {/* Decorative Elements around image */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-orange-200/20 to-blue-200/20 rounded-full blur-3xl -z-10" />

              <div className="relative transform transition-transform duration-700 hover:rotate-y-2 hover:rotate-x-2 preserve-3d">
                {/* Main Dashboard Image Mockup */}
                <div className="rounded-2xl overflow-hidden shadow-2xl border-[8px] border-neutral-900/5 bg-white relative">
                  <img
                    src="/images/dashboard.png"
                    alt="PlateKhata Dashboard"
                    className="w-full h-auto object-contain"
                  />
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-24 bg-neutral-50">
        <div className="container mx-auto px-4">
          <FadeIn>
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-orange-600 font-semibold tracking-wide uppercase text-sm mb-2">
                Features
              </h2>
              <h3 className="text-3xl md:text-5xl font-bold text-neutral-900 mb-6">
                Everything you need to run your restaurant.
              </h3>
              <p className="text-lg text-neutral-500">
                Replaces multiple tools with one unified platform. Designed for
                speed, reliability, and growth.
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <QrCode className="h-6 w-6 text-white" />,
                color: "bg-purple-600",
                title: "QR Ordering",
                description:
                  "Guests scan, order, and pay. No app download needed. Verify orders with OTP for security.",
              },
              {
                icon: <Monitor className="h-6 w-6 text-white" />,
                color: "bg-blue-600",
                title: "Billing & POS",
                description:
                  "Fast billing for dine-in, takeaway, and delivery. Works offline and syncs when back online.",
              },
              {
                icon: <ChefHat className="h-6 w-6 text-white" />,
                color: "bg-orange-600",
                title: "Kitchen Display System (KDS)",
                description:
                  "Direct order routing to kitchen screens. Track prep times and eliminate paper tickets.",
              },
              {
                icon: <Smartphone className="h-6 w-6 text-white" />,
                color: "bg-green-600",
                title: "Captain App",
                description:
                  "Empower waiters to take orders tableside using any mobile device.",
              },
              {
                icon: <Menu className="h-6 w-6 text-white" />,
                color: "bg-pink-600",
                title: "Menu Management",
                description:
                  "Update prices, toggle item availability, and manage variants instantly across all devices.",
              },
              {
                icon: <BarChart3 className="h-6 w-6 text-white" />,
                color: "bg-indigo-600",
                title: "Reports & Analytics",
                description:
                  "Deep insights into sales, top-selling items, and staff performance.",
              },
            ].map((feature, i) => (
              <FadeIn key={i} delay={i * 100}>
                <FeatureCard {...feature} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* --- ANALYTICS SECTION --- */}
      <section id="analytics" className="py-24 bg-white overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 order-2 lg:order-1 relative">
              <FadeIn direction="right">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-100 to-amber-50 rounded-3xl transform rotate-3 scale-105 -z-10" />
                <div className="bg-neutral-950 rounded-2xl shadow-2xl border border-neutral-800 text-white perspective-[1000px] overflow-hidden">
                  <img
                    src="/images/sales.png"
                    alt="Sales Analytics"
                    className="w-full h-auto opacity-90 hover:opacity-100 transition-opacity"
                  />
                </div>
              </FadeIn>
            </div>
            <div className="flex-1 order-1 lg:order-2">
              <FadeIn>
                <h2 className="text-4xl lg:text-5xl font-bold mb-6 text-neutral-900">
                  Data driven decisions. Not guesswork.
                </h2>
                <p className="text-lg text-neutral-600 mb-8 leading-relaxed">
                  Understand your business like never before. Track wastage,
                  monitor peak hours, and identify your most profitable items.
                  PlateKhata gives you the insights to grow.
                </p>
                <ul className="space-y-4">
                  {[
                    "Sales trends & forecasting",
                    "Inventory consumption reports",
                    "Staff performance tracking",
                    "Customer retention insights",
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 font-medium text-neutral-800"
                    >
                      <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* --- PARTNERS SECTION --- */}
      <section id="partners" className="py-24 bg-neutral-50">
        <div className="container mx-auto px-4">
          <FadeIn>
            <div className="flex flex-col md:flex-row justify-between items-end mb-12">
              <div>
                <h2 className="text-3xl font-bold mb-2">Our Partners</h2>
                <p className="text-neutral-500">Trusted by top restaurants.</p>
              </div>
            </div>
          </FadeIn>

          {restaurants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {restaurants.map((rest, i) => (
                <FadeIn key={rest.restaurant_id} delay={i * 100}>
                  <div className="group cursor-default bg-white p-6 rounded-xl border border-neutral-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-orange-50 flex items-center justify-center text-lg font-bold text-orange-600">
                        {rest.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-neutral-900 line-clamp-1">
                          {rest.name}
                        </h3>
                        <p className="text-xs text-neutral-500">@{rest.slug}</p>
                      </div>
                    </div>
                    {rest.address && (
                      <p className="text-sm text-neutral-400 line-clamp-2">
                        {rest.address}
                      </p>
                    )}
                  </div>
                </FadeIn>
              ))}
            </div>
          ) : (
            <FadeIn>
              <div className="text-center py-12 border border-dashed border-neutral-300 rounded-xl bg-neutral-100">
                <p className="text-neutral-500">Loading partners...</p>
              </div>
            </FadeIn>
          )}
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-24 bg-neutral-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/hero-bg.png')] opacity-10 bg-cover bg-center" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to upgrade your restaurant?
            </h2>
            <p className="text-xl text-neutral-400 mb-10 max-w-2xl mx-auto">
              Join 1000+ restaurants using PlateKhata to streamline operations
              and increase profits.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button
                onClick={() => setDemoOpen(true)}
                size="lg"
                className="h-14 px-10 bg-orange-600 hover:bg-orange-500 text-white font-bold text-lg rounded-full"
              >
                Book Free Demo
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-14 px-10 border-neutral-700 hover:bg-neutral-800 text-white font-semibold text-lg rounded-full bg-transparent"
              >
                <a href="tel:+917878065085">Contact Sales</a>
              </Button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-black text-white py-16 relative z-50 border-0 overflow-hidden -mt-1">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <Link
                href="/"
                className="text-2xl font-bold tracking-tight flex items-center gap-2 mb-6"
              >
                <div className="h-8 w-8 relative">
                  <img
                    src="/favicon.ico"
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                PlateKhata
              </Link>
              <p className="text-neutral-400 max-w-sm mb-6 leading-relaxed">
                The most advanced restaurant management platform built for
                speed, stability, and scale. Empowering restaurants since 2024.
              </p>
              <div className="flex gap-4">
                <a
                  href="https://www.instagram.com/axiom__hitech?igsh=c3Z6bTIxNHV4dHds&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center hover:bg-orange-600 transition-colors text-white"
                >
                  <Linkedin className="h-5 w-5" />
                </a>
                <a
                  href="https://www.instagram.com/axiom__hitech?igsh=c3Z6bTIxNHV4dHds&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center hover:bg-orange-600 transition-colors text-white"
                >
                  <Twitter className="h-5 w-5" />
                </a>
                <a
                  href="https://www.instagram.com/axiom__hitech?igsh=c3Z6bTIxNHV4dHds&utm_source=qr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center hover:bg-orange-600 transition-colors text-white"
                >
                  <Instagram className="h-5 w-5" />
                </a>
                <a
                  href="https://wa.me/917878065085"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center hover:bg-orange-600 transition-colors text-white"
                >
                  <MessageCircle className="h-5 w-5" />
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6 text-white">Product</h4>
              <ul className="space-y-4 text-neutral-400">
                <li>
                  <Link
                    href="#features"
                    className="hover:text-orange-500 transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-orange-500 transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-orange-500 transition-colors"
                  >
                    Hardware
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-orange-500 transition-colors"
                  >
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="hover:text-orange-500 transition-colors"
                  >
                    Login
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-6 text-white">Contact</h4>
              <ul className="space-y-4 text-neutral-400">
                <li className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                  <span>+91 7878065085</span>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-orange-600 shrink-0 mt-0.5" />
                  <span>support@platekhata.in</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="h-5 w-5 rounded-full border border-orange-600 flex items-center justify-center text-orange-600 text-[10px] font-bold shrink-0 mt-0.5">
                    HQ
                  </div>
                  <span>Vadodara, Gujarat, India</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-neutral-900 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-neutral-500">
            <p>© {date} PlateKhata Inc. All rights reserved.</p>
            <div className="flex gap-8">
              <Link href="#" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="p-8 rounded-2xl bg-white border border-neutral-100 hover:shadow-xl hover:border-neutral-200 transition-all duration-300 hover:-translate-y-2 group">
      <div
        className={`mb-6 h-12 w-12 rounded-xl ${color} flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300`}
      >
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-neutral-900">{title}</h3>
      <p className="text-neutral-500 leading-relaxed text-sm">{description}</p>
    </div>
  );
}
