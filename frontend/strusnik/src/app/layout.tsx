import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SocketProvider } from "./context/SocketContext";
import { UserProvider } from "./context/UserContext";
import InvitationModal from "./components/lobby/invitationModal";
import { LangProvider } from "./lang";
import TopRightToggles from "./components/TopRightToggles";
import { NotificationProvider } from "./context/NotificationsContext";

const Perciles = localFont({
  src: "./fonts/Perciles.ttf",
  variable: "--font-perciles",
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  try {
    const saved = localStorage.getItem("theme");
    const theme = (saved === "light" || saved === "dark") ? saved : "dark";
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();
            `.trim(),
          }}
        />
      </head>

      <body className="antialiased font-sans">
        <LangProvider>
          <NotificationProvider>
            <UserProvider>
              <SocketProvider>
                <TopRightToggles />
                <InvitationModal />
                {children}
              </SocketProvider>
            </UserProvider>
          </NotificationProvider>
        </LangProvider>
      </body>
    </html>
  );
}