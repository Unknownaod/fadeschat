import Link from "next/link";
import { SiteNav, SiteFooter } from "../components/Site";

const FEATURES = [
  ["⧉", "A tab for every conversation", "Open chats sit in a tab strip, just like a browser. Switch between people without losing your place."],
  ["⌕", "Search everything with ⌘K", "Find a conversation or anyone on Fades from one search bar, then start talking."],
  ["👥", "Group chats", "Name a group, pick the people, and keep everyone in one conversation."],
  ["✓✓", "Live and in sync", "New messages arrive automatically, with read receipts, edits and deletes shown as they happen."],
];

const STEPS = [
  ["Create your account", "Pick a username and password. It takes under a minute."],
  ["Find your people", "Search by name or username and open a conversation."],
  ["Start talking", "Send messages from your phone, tablet or desktop."],
];

const FAQ = [
  ["Is Fades Chat free?", "Yes. Create an account and start chatting."],
  ["Do I need a separate account?", "No. Fades Chat uses your Fades account, so one sign-in covers everything."],
  ["Can I use it on my phone?", "Yes. The layout adapts to any screen size, and conversations are always in sync."],
  ["Can I delete a message after sending it?", "Yes. Deleted messages are replaced with a note so the conversation still makes sense."],
];

export default function Landing() {
  return (
    <div className="site">
      <SiteNav />

      <main>
        <section className="wrap hero">
          <div className="hero-copy">
            <h1>Chat with your people, without the clutter.</h1>
            <p>
              Fades Chat is simple messaging for your Fades account. Direct messages,
              group chats and read receipts, and nothing else in the way.
            </p>
            <div className="hero-actions">
              <Link href="/signup" className="btn btn-primary">Create your account</Link>
              <Link href="/login" className="btn btn-ghost">Sign in</Link>
            </div>
            <span className="hero-note">Free to use. Works in any browser.</span>
          </div>

          <div className="mock" aria-hidden="true">
            <div className="mock-tabs">
              <span className="mock-dot" />
              <div className="mock-tab on"><i>AL</i>Ada Lovelace</div>
              <div className="mock-tab"><i style={{ background: "linear-gradient(145deg,#0f9d8a,#2f6fd6)" }}>PL</i>Project Lab</div>
              <div className="mock-tab"><i style={{ background: "linear-gradient(145deg,#d6568f,#8a4fd6)" }}>GH</i>Grace H.</div>
            </div>
            <div className="mock-bar"><span>☰</span><div>⌕ &nbsp;Search people and conversations</div></div>
            <div className="mock-body">
              <div className="mock-msg other">Are we still on for Thursday?</div>
              <div className="mock-msg own">Yes! Booked the room for 3pm.</div>
              <div className="mock-msg other">Perfect. I'll bring the slides.</div>
              <div className="mock-msg own">Great. Adding Grace to the group now.<em>✓✓ Read</em></div>
            </div>
            <div className="mock-input"><span>Message Ada Lovelace</span><i>↑</i></div>
          </div>
        </section>

        <section id="features" className="wrap section">
          <div className="section-head">
            <h2>Everything a conversation needs</h2>
            <p>The essentials, done well. No feeds, no noise.</p>
          </div>
          <div className="features">
            {FEATURES.map(([icon, title, text]) => (
              <div className="feature" key={title}>
                <span className="feature-icon">{icon}</span>
                <div><h3>{title}</h3><p>{text}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="wrap section">
          <div className="section-head">
            <h2>Up and running in three steps</h2>
          </div>
          <ol className="steps">
            {STEPS.map(([title, text], i) => (
              <li key={title}>
                <span className="step-n">{i + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="faq" className="wrap section faq-section">
          <div className="section-head"><h2>Questions</h2></div>
          <div className="faq">
            {FAQ.map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </section>

        <section className="wrap section">
          <div className="cta">
            <h2>Ready to start a conversation?</h2>
            <p>Create your Fades account and say hello.</p>
            <Link href="/signup" className="btn btn-light">Create your account</Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
