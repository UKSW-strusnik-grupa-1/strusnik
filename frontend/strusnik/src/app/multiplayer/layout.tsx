import { SocketProvider } from "../context/SocketContext";
import "./../globals.css";

export default function MultiplayerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <div>
        {children}
      </div>
  );
}
