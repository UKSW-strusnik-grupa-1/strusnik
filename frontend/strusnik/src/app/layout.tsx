import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SocketProvider } from "./context/SocketContext";
import { UserProvider } from "./context/UserContext";
import InvitationModal from "./components/lobby/invitationModal";
import { LangProvider } from "./lang";
import TopRightToggles from "./components/TopRightToggles";
import { NotificationProvider } from "./context/NotificationsContext";
import OnlinePlayersList from "./components/lobby/onlinePlayersList";

const Perciles = localFont({
  src: "./fonts/Perciles.ttf",
  variable: "--font-perciles",
});

export const metadata: Metadata = {
  title: "STRUŚNIK - GRY ONLINE",
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
                <OnlinePlayersList collapsible />
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