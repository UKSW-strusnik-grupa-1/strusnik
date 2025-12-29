import type { Metadata } from "next";
import localFont from 'next/font/local'
import "./globals.css";
import { SocketProvider } from "./context/SocketContext";
import { UserProvider } from "./context/UserContext";
import InvitationModal from "./components/lobby/invitationModal";

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
            <InvitationModal/>
            {children}
          </SocketProvider>
        </UserProvider>
      </body>
    </html>
  );
}
