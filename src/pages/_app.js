import "@/styles/globals.css";
import SiteFooter from "@/components/SiteFooter";

export default function App({ Component, pageProps }) {
  return (
    <div className="min-h-screen w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <Component {...pageProps} />
      </div>
      <SiteFooter />
    </div>
  );
}
