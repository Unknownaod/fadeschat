import "./globals.css";
import "./site.css";

export const metadata = {
  title: { default: "Fades Chat", template: "%s · Fades Chat" },
  description: "Simple messaging with your Fades account. Direct messages, group chats and read receipts.",
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#0d0f17" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
