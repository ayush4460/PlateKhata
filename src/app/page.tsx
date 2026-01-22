"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ApiClient } from "@/services/api.service";
import { QrCode, Monitor, ChefHat, BarChart3, ArrowRight } from "lucide-react";

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
  const [date, setDate] = useState(new Date().getFullYear());

  useEffect(() => {
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
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-amber-500/30">
      {/* --- HERO SECTION --- */}
      <section className="relative h-screen w-full overflow-hidden flex items-center justify-center">
        {/* Background Overlay */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url('/images/hero-bg.png')" }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-neutral-950/80 via-neutral-950/50 to-neutral-950" />

        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="inline-block animate-fade-in-up">
            <Badge
              variant="outline"
              className="mb-6 px-4 py-1 text-amber-400 border-amber-400/30 backdrop-blur-md bg-amber-400/10"
            >
              🚀 Transforming Restaurant Management
            </Badge>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
            PlateKhata
          </h1>
          <p className="text-xl md:text-2xl text-neutral-300 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            The ultimate POS and QR ordering solution designed to simplify
            operations for modern restaurants.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold px-8 rounded-full shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all hover:scale-105"
            >
              Get Started
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="bg-transparent border-neutral-700 text-neutral-100 hover:bg-neutral-800 hover:text-white rounded-full px-8"
              asChild
            >
              <Link href="#features">Explore Features</Link>
            </Button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce text-neutral-500">
          <ArrowRight className="h-6 w-6 rotate-90" />
        </div>
      </section>

      {/* --- ABOUT SECTION --- */}
      <section id="about" className="py-24 bg-neutral-950 relative">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold">
                Simplify the Chaos. <br />
                <span className="text-amber-500">Focus on Food.</span>
              </h2>
              <p className="text-neutral-400 text-lg leading-relaxed">
                Running a restaurant is hard. Managing orders, inventory, and
                staff shouldn't be. PlateKhata brings everything into one
                seamless platform.
              </p>
              <p className="text-neutral-400 text-lg leading-relaxed">
                From table-side QR ordering to real-time kitchen display
                systems, we empower you to deliver exceptional dining
                experiences.
              </p>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-amber-500/20 to-purple-500/20 blur-3xl rounded-full opacity-30" />
              <div className="relative p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
                {/* Abstract UI Mockup representation */}
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="h-24 w-24 rounded-lg bg-neutral-800 animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-neutral-800 rounded animate-pulse" />
                      <div className="h-3 w-1/2 bg-neutral-800 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="h-2 rounded bg-neutral-800 w-full" />
                  <div className="h-2 rounded bg-neutral-800 w-5/6" />
                  <div className="h-2 rounded bg-neutral-800 w-4/6" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- SERVICES / FEATURES SECTION --- */}
      <section id="features" className="py-24 bg-neutral-900/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
            <p className="text-neutral-400">
              Everything you need to run a successful restaurant.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<QrCode className="h-8 w-8 text-amber-500" />}
              title="QR Ordering"
              description="Contactless ordering directly from tables. Reduce wait times and errors."
            />
            <FeatureCard
              icon={<Monitor className="h-8 w-8 text-blue-500" />}
              title="Smart POS"
              description="Intuitive Point of Sale system that any staff member can master in minutes."
            />
            <FeatureCard
              icon={<ChefHat className="h-8 w-8 text-red-500" />}
              title="Kitchen Display"
              description="Real-time order routing to the kitchen. Say goodbye to lost paper tickets."
            />
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8 text-green-500" />}
              title="Live Analytics"
              description="Track sales, popular items, and staff performance in real-time."
            />
          </div>
        </div>
      </section>

      {/* --- FEATURED RESTAURANTS SECTION --- */}
      <section className="py-24 bg-neutral-950 border-t border-neutral-900">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Our Partners</h2>
              <p className="text-neutral-400">
                Trusted by top restaurants in the city.
              </p>
            </div>
            <Button
              variant="ghost"
              className="text-amber-500 hover:text-amber-400 hover:bg-neutral-900 mt-4 md:mt-0"
            >
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {restaurants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((rest) => (
                <Link
                  key={rest.restaurant_id}
                  href={`/restaurants/${rest.slug}`}
                  className="group"
                >
                  <div className="h-full p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-800 transition-all hover:border-amber-500/30 group-hover:shadow-[0_0_30px_-10px_rgba(245,158,11,0.2)]">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-neutral-800 flex items-center justify-center text-lg font-bold text-neutral-400 group-hover:text-amber-500 group-hover:bg-neutral-950 transition-colors">
                        {rest.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg group-hover:text-amber-400 transition-colors">
                          {rest.name}
                        </h3>
                        <p className="text-xs text-neutral-500 font-mono">
                          @{rest.slug}
                        </p>
                      </div>
                    </div>
                    {rest.address && (
                      <p className="text-sm text-neutral-400 line-clamp-2">
                        {rest.address}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/20">
              <p className="text-neutral-500">
                Loading partners or no active restaurants found...
              </p>
            </div>
          )}
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 border-t border-neutral-900 bg-neutral-950">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h4 className="font-bold text-xl mb-2">PlateKhata</h4>
            <p className="text-neutral-500 text-sm">
              © {date} PlateKhata Inc. All rights reserved.
            </p>
          </div>
          <div className="flex gap-6 text-sm text-neutral-400">
            <Link href="#" className="hover:text-amber-500 transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-amber-500 transition-colors">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-amber-500 transition-colors">
              Contact Support
            </Link>
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
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/80 transition-all duration-300 hover:-translate-y-1">
      <div className="mb-4 p-3 rounded-lg bg-neutral-950 border border-neutral-800 w-fit">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-neutral-400 leading-relaxed">{description}</p>
    </div>
  );
}
