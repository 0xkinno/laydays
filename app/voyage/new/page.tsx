import { Page } from "@/components/shell/Page";
import { TryYourOwn } from "@/components/voyage/TryYourOwn";
import { DEMO } from "@/lib/serv/rulebooks.generated";

export default function NewVoyage() {
  return (
    <Page tag="Try your own" title="Rule a log you paste" wide intro="Paste a statement of facts or keep the sample. SERV reads it, the checks run, and the clock counts. A stranger's text is treated as data, and a line that tries to give an instruction is refused or set aside.">
      <TryYourOwn sample={DEMO.sof} />
    </Page>
  );
}
