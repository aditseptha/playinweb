export default function PrivacyPage() {
  return (
    <article className="mx-auto min-w-0 max-w-prose">
      <h1 className="text-display font-semibold tracking-tight">Privacy</h1>
      <p className="mt-1 text-caption text-text-subtle">Last updated Sep 8, 2026</p>
      <div className="mt-8 space-y-5 text-body leading-relaxed text-text-muted">
        <p>
          playinweb is a catalogue of indie web games. We collect the least we can to run accounts,
          listings, and play counts.
        </p>
        <section className="space-y-2">
          <h2 className="text-heading font-semibold text-text">What we store</h2>
          <p>
            If you create an account we keep your email, handle, display name, and the games you
            publish. Play counts, likes, follows, and comments are stored so those features work.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-heading font-semibold text-text">What stays on your device</h2>
          <p>
            Library, local play history, and preview bids for Game showcase are saved in your
            browser. Clearing site data removes them.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-heading font-semibold text-text">Sharing</h2>
          <p>
            We do not sell profile data. Public listings, comments, and follower counts are visible
            to anyone who opens the site. Payments are not processed yet, so we do not collect card
            numbers.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-heading font-semibold text-text">Contact</h2>
          <p>
            Questions about this page can go through Report an issue. We will update this notice if
            the product starts charging or adding analytics.
          </p>
        </section>
      </div>
    </article>
  );
}
