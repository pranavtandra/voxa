import Link from "next/link";

export const metadata = {
  title: "Terms of Service | Voxa",
  description: "Terms for using Voxa.",
};

export default function TermsOfService() {
  return <main className="legal-page"><article>
    <Link className="legal-brand" href="/" aria-label="Return to Voxa"><span className="logo" aria-hidden><i/><i/><i/></span><b>Voxa</b></Link>
    <p className="eyebrow">TERMS OF SERVICE</p>
    <h1>Using Voxa.</h1>
    <p className="legal-updated">Last updated October 6, 2026</p>
    <section><h2>About the service</h2><p>Voxa is an assistive communication exploration that helps people assemble and speak messages. It is not a replacement for an AAC device, speech-language professional, medical care, emergency service, or accessibility professional.</p></section>
    <section><h2>Your account</h2><p>You are responsible for keeping your sign-in information secure and for activity performed through your account. Provide accurate information and use Voxa only in lawful ways.</p></section>
    <section><h2>Your content</h2><p>You retain ownership of the phrases and other content you add to Voxa. You permit Voxa to process that content only as needed to provide, secure, and improve the service.</p></section>
    <section><h2>Availability</h2><p>Voxa is provided on an as-available basis. Features may change, and uninterrupted or error-free operation is not guaranteed. Do not rely on Voxa as the only way to communicate in an emergency.</p></section>
    <section><h2>Acceptable use</h2><p>Do not misuse the service, attempt to access another person’s account or data, interfere with service operation, or use Voxa to violate applicable law.</p></section>
    <section><h2>Ending use</h2><p>You may stop using Voxa at any time and can delete your account from your profile. Voxa may restrict access when necessary to protect users, the service, or comply with law.</p></section>
    <footer><Link href="/privacy">Privacy Policy</Link><Link href="/">Return to Voxa</Link></footer>
  </article></main>;
}
