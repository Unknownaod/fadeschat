import Link from "next/link";
import { Logo, SiteFooter } from "./Site";

export default function Legal({ title, updated, sections }) {
  return (
    <div className="site">
      <header className="site-nav"><div className="wrap site-nav-inner"><Logo />
        <Link href="/" className="btn btn-ghost btn-sm">Back home</Link></div></header>
      <main className="wrap legal">
        <h1>{title}</h1>
        <span className="legal-date">Last updated {updated}</span>
        {sections.map(([h, p]) => (<section key={h}><h2>{h}</h2><p>{p}</p></section>))}
      </main>
      <SiteFooter />
    </div>
  );
}
