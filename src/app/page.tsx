import React from "react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
      <h1 className="text-4xl font-bold mb-4">Welcome to MuchMate</h1>
      <p className="text-lg text-muted-foreground">
        Please access the menu via a specific restaurant link (e.g.,{" "}
        <code>/restaurant-name</code>) or scan a QR code.
      </p>
    </div>
  );
}
