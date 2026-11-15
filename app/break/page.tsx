import { Page } from "@/components/shell/Page";
import { BreakPanel } from "@/components/break/BreakPanel";
import { OnchainRecord } from "@/components/OnchainRecord";
import { latestOnchain } from "@/lib/onchain";

export default function Break() {
  return (
    <Page tag="Attack it yourself" title="Break it" wide intro="Each button runs the real checks against a scripted bad model for one role. These are tests of our checks, not findings about SERV. Onchain refusals are recorded in the proof run and shown with their transactions.">
      <BreakPanel />
      <h2 className="display mt-14 text-3xl">Onchain refusals, as recorded</h2>
      <p className="mt-3 max-w-2xl text-sm text-ink-soft">Late, incomplete, wrong signer, tampered digest and a replayed signature. Rows with a transaction were mined and reverted onchain, the others were refused in simulation with the contract's own error.</p>
      <div className="mt-4"><OnchainRecord run={latestOnchain()} /></div>
    </Page>
  );
}
