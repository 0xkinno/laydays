import type { OnchainRun } from "@/lib/onchain";

export function OnchainRecord({ run }: { run: OnchainRun | null }) {
  if (!run) return <p className="text-sm text-ink-soft">The onchain proof run has not been recorded yet.</p>;
  return (
    <div className="overflow-x-auto rounded-[14px] border hair">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-paper-deep text-xs"><tr>{["What happened", "Result", "Signer", "Gas", "Transaction"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}</tr></thead>
        <tbody className="divide-y hair">
          {run.steps.map((s) => {
            const refused = s.kind.startsWith("refusal");
            return (
              <tr key={s.step}>
                <td className="px-3 py-3">{s.step}</td>
                <td className="px-3 py-3 font-mono text-xs">{refused ? <span className="text-flare-ink">{s.decoded}</span> : "success"}<span className="block text-[10px] text-ink-soft">{s.kind}</span></td>
                <td className="px-3 py-3 text-xs text-ink-soft">{s.signer}</td>
                <td className="px-3 py-3 font-mono text-xs">{s.gasUsed ?? "n/a"}</td>
                <td className="px-3 py-3 font-mono text-xs">{s.tx ? <a className="underline underline-offset-4" href={s.url} target="_blank" rel="noreferrer">{s.tx.slice(0, 10)}…{s.tx.slice(-6)}</a> : "simulated, no transaction"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
