export default function TermsPage() {
  return (
    <article className="mx-auto min-w-0 max-w-prose">
      <h1 className="text-display font-semibold tracking-tight">Terms</h1>
      <p className="mt-1 text-caption text-text-subtle">Last updated Sep 8, 2026</p>
      <div className="mt-8 space-y-5 text-body leading-relaxed text-text-muted">
        <p>
          By using playinweb you agree to these terms. If you publish a game you also agree to the
          rules for listings.
        </p>
        <section className="space-y-2">
          <h2 className="text-heading font-semibold text-text">The service</h2>
          <p>
            playinweb hosts listings and, for HTML games, playable files you upload. Features such as
            donate, buy, tips, and Game showcase bids are previews. No payment is taken yet.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-heading font-semibold text-text">Your content</h2>
          <p>
            You keep the rights to games and files you upload. You grant playinweb a license to host
            and display them so other people can browse and play. Do not upload work you cannot
            share, malware, or material that exploits anyone.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-heading font-semibold text-text">Accounts</h2>
          <p>
            You are responsible for what happens under your handle. We may hide or remove a listing
            that breaks these terms or the law.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="text-heading font-semibold text-text">No warranty</h2>
          <p>
            Games are provided by their creators. playinweb is offered as-is. Play at your own risk,
            and keep your own backups of source files.
          </p>
        </section>
      </div>
    </article>
  );
}
