import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MediCare — Medical Clinic Management System",
  description: "Manage patients, appointments and medical records",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=inter:wght@300;400;500;600;700&family=plusJakartaSans:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
      </head>
      <body className="min-h-screen bg-slate-50 font-body-md text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
