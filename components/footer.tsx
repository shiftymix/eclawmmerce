export default function Footer() {
  return (
    <footer className="bg-bg border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="font-pixel-xs text-text-secondary">
          &copy; COUNCIL OF eCLAWMMERCE
        </span>
        <span className="text-xs font-mono text-text-secondary">
          open source intelligence for agentic ecom builders
        </span>
        <a
          href="#YOUR_DISCORD_INVITE"
          className="text-xs font-mono text-text-secondary hover:text-crab-red transition-colors"
        >
          DISCORD
        </a>
      </div>
    </footer>
  );
}
