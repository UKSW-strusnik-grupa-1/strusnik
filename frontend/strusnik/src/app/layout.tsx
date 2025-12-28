import type { Metadata } from "next";
import localFont from 'next/font/local'
import "./globals.css";
import { SocketProvider } from "./context/SocketContext";
import { UserProvider } from "./context/UserContext";

const Perciles = localFont({
  src: './fonts/Perciles.ttf',
})

export const metadata: Metadata = {
  title: "Struśnik",
  description: "Struśnik",
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${Perciles.className} antialiased`}
      >
        <UserProvider>
          <SocketProvider>
            {children}
          </SocketProvider>
        </UserProvider>
      </body>
    </html>
  );
}
