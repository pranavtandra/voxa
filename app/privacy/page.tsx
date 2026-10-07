import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Voxa",
  description: "How Voxa handles account and communication data.",
};

export default function PrivacyPolicy() {
  return <main className="legal-page"><article>
    <Link className="legal-brand" href="/" aria-label="Return to Voxa"><span className="logo" aria-hidden><i/><i/><i/></span><b>Voxa</b></Link>
    <p className="eyebrow">PRIVACY POLICY</p>
    <h1>Your communication belongs to you.</h1>
    <p className="legal-updated">Last updated October 6, 2026</p>
    <section><h2>What Voxa stores</h2><p>When you create an account, Voxa stores your email address, profile preferences, saved phrases, routines, and communication history so they are available when you return.</p></section>
    <section><h2>How your data is protected</h2><p>Account data is stored through Supabase. Row-level security separates each account so signed-in users can access only their own Voxa data. Passwords are handled by the authentication provider and are not visible to Voxa.</p></section>
    <section><h2>Google sign-in</h2><p>If you sign in with Google, Voxa receives basic account information needed to create and maintain your session, such as your name and email address. Voxa does not receive your Google password.</p></section>
    <section><h2>Guest sessions</h2><p>Guest sessions stay on the device for the current visit. Guest phrases, history, custom words, and settings are not synced to a Voxa account and are cleared when the session ends or the page is refreshed.</p></section>
    <section><h2>Sharing and deletion</h2><p>Voxa does not sell your communication data. You can delete your account from your profile; this permanently removes your stored Voxa profile and associated user data.</p></section>
    <section><h2>Service providers</h2><p>Voxa uses Supabase for authentication and data storage, Vercel for website hosting, and Google when you choose Google sign-in. These providers process information as needed to deliver their services.</p></section>
    <footer><Link href="/terms">Terms of Service</Link><Link href="/">Return to Voxa</Link></footer>
  </article></main>;
}
