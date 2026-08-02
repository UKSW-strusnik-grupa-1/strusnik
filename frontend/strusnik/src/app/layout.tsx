import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SocketProvider } from "./context/SocketContext";
import { UserProvider } from "./context/UserContext";
import InvitationModal from "./components/lobby/invitationModal";
import { LangProvider } from "./lang";
import { MotionProvider } from "./motion";
import TopRightToggles from "./components/TopRightToggles";
import { NotificationProvider } from "./context/NotificationsContext";
import PageTransition from "./components/PageTransition";

const Perciles = localFont({
  src: "./fonts/Perciles.ttf",
  variable: "--font-perciles",
  display: "swap",
  fallback: ["Poppins", "Segoe UI", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: "STRUSNIK - ONLINE GAMES",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pl"
      className={Perciles.variable}
      data-theme="dark"
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>

      <body className="antialiased font-sans">
        <a className="skip-link" href="#main-content">Przejdz do tresci</a>
        <LangProvider>
          <MotionProvider>
            <NotificationProvider>
              <UserProvider>
                <SocketProvider>
                  <TopRightToggles />
                  <InvitationModal />
                  <PageTransition>{children}</PageTransition>
                </SocketProvider>
              </UserProvider>
            </NotificationProvider>
          </MotionProvider>
        </LangProvider>
      </body>
    </html>
  );
}