import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CalorieSnap',
  description: 'AI-powered calorie tracking from food photos',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
