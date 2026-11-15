import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-harbour text-paper">
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="display text-3xl">Laydays</p>
          <p className="mt-2 max-w-xs text-sm text-paper/70">A demurrage desk for the analyst who bills a charterer for a ship&rsquo;s waiting time.</p>
        </div>
        <ul className="space-y-2 text-sm">
          {[["/desk", "Desk"], ["/judge", "For judges, 60 seconds"], ["/proof", "Proof"], ["/break", "Break it"], ["/register", "Claims register"], ["/agents", "For agents"], ["/api/status", "Status"]].map(([h, l]) => (
            <li key={h}><Link href={h} className="text-paper/80 underline-offset-4 hover:underline">{l}</Link></li>
          ))}
        </ul>
        <div className="text-sm text-paper/70">
          <p>Fictional people and vessels; real cases and figures.</p>
          <p className="mt-2">Base Sepolia, test USDC. Built for the OpenServ SERV Hackathon, Edition 02, by 0xkinno.</p>
        </div>
      </div>
    </footer>
  );
}
