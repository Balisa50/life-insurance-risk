import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Life Insurance Risk Model",
  description:
    "Actuarial risk model for Sub-Saharan African life insurance. Gompertz-Makeham mortality, Kaplan-Meier survival analysis, Cox PH model, actuarial pricing, and Monte Carlo portfolio simulation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg font-sans text-text antialiased">
        {children}
      </body>
    </html>
  );
}
