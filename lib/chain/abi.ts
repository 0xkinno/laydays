export const ledgerAbi = [
  { type: "function", name: "open", stateMutability: "nonpayable", inputs: [
    { name: "voyageId", type: "bytes32" },
    { name: "t", type: "tuple", components: [
      { name: "owner", type: "address" }, { name: "charterer", type: "address" }, { name: "token", type: "address" },
      { name: "completionOfDischarge", type: "uint64" }, { name: "timeBarDays", type: "uint16" }, { name: "requiredDocsMask", type: "uint32" },
      { name: "charterPartyHash", type: "bytes32" }, { name: "rulebookHash", type: "bytes32" } ] },
    { name: "deadline", type: "uint256" }, { name: "ownerSig", type: "bytes" }, { name: "chartererSig", type: "bytes" } ], outputs: [] },
  { type: "function", name: "present", stateMutability: "nonpayable", inputs: [
    { name: "voyageId", type: "bytes32" }, { name: "amount", type: "uint256" }, { name: "statementDigest", type: "bytes32" },
    { name: "docsRoot", type: "bytes32" }, { name: "providedDocsMask", type: "uint32" }, { name: "deadline", type: "uint256" }, { name: "ownerSig", type: "bytes" } ], outputs: [] },
  { type: "function", name: "fundWithAuthorization", stateMutability: "nonpayable", inputs: [
    { name: "voyageId", type: "bytes32" }, { name: "value", type: "uint256" }, { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" }, { name: "v", type: "uint8" }, { name: "r", type: "bytes32" }, { name: "s", type: "bytes32" } ], outputs: [] },
  { type: "function", name: "answer", stateMutability: "nonpayable", inputs: [
    { name: "voyageId", type: "bytes32" }, { name: "accepted", type: "uint256" }, { name: "disputeDigest", type: "bytes32" }, { name: "deadline", type: "uint256" }, { name: "chartererSig", type: "bytes" } ], outputs: [] },
  { type: "function", name: "settle", stateMutability: "nonpayable", inputs: [
    { name: "voyageId", type: "bytes32" }, { name: "toOwner", type: "uint256" }, { name: "deadline", type: "uint256" }, { name: "ownerSig", type: "bytes" }, { name: "chartererSig", type: "bytes" } ], outputs: [] },
  { type: "function", name: "reclaim", stateMutability: "nonpayable", inputs: [{ name: "voyageId", type: "bytes32" }], outputs: [] },
  { type: "function", name: "nonces", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "timeBarDeadline", stateMutability: "view", inputs: [{ name: "voyageId", type: "bytes32" }], outputs: [{ type: "uint64" }] },
  { type: "function", name: "getClaim", stateMutability: "view", inputs: [{ name: "voyageId", type: "bytes32" }], outputs: [{ type: "tuple", components: [
    { name: "terms", type: "tuple", components: [
      { name: "owner", type: "address" }, { name: "charterer", type: "address" }, { name: "token", type: "address" },
      { name: "completionOfDischarge", type: "uint64" }, { name: "timeBarDays", type: "uint16" }, { name: "requiredDocsMask", type: "uint32" },
      { name: "charterPartyHash", type: "bytes32" }, { name: "rulebookHash", type: "bytes32" } ] },
    { name: "stage", type: "uint8" }, { name: "presentedAt", type: "uint64" }, { name: "lastActionAt", type: "uint64" }, { name: "claimAmount", type: "uint256" },
    { name: "statementDigest", type: "bytes32" }, { name: "docsRoot", type: "bytes32" }, { name: "providedDocsMask", type: "uint32" },
    { name: "funded", type: "uint256" }, { name: "accepted", type: "uint256" }, { name: "paidToOwner", type: "uint256" }, { name: "refunded", type: "uint256" } ] }] },
  { type: "error", name: "TimeBarred", inputs: [{ name: "deadline", type: "uint64" }, { name: "nowTs", type: "uint64" }] },
  { type: "error", name: "MissingSupportingDocuments", inputs: [{ name: "missingMask", type: "uint32" }] },
  { type: "error", name: "BadSignature", inputs: [] },
  { type: "error", name: "WrongStage", inputs: [{ name: "got", type: "uint8" }] },
  { type: "error", name: "Expired", inputs: [] },
  { type: "error", name: "OverClaim", inputs: [] },
  { type: "error", name: "Underfunded", inputs: [] },
  { type: "error", name: "BadTerms", inputs: [] },
  { type: "error", name: "TooEarly", inputs: [{ name: "availableAt", type: "uint64" }] },
  { type: "event", name: "Opened", inputs: [{ name: "voyageId", type: "bytes32", indexed: true }, { name: "owner", type: "address" }, { name: "charterer", type: "address" }, { name: "deadline", type: "uint64" }] },
  { type: "event", name: "Presented", inputs: [{ name: "voyageId", type: "bytes32", indexed: true }, { name: "amount", type: "uint256" }, { name: "statementDigest", type: "bytes32" }, { name: "docsRoot", type: "bytes32" }, { name: "docsMask", type: "uint32" }, { name: "at", type: "uint64" }] },
  { type: "event", name: "Funded", inputs: [{ name: "voyageId", type: "bytes32", indexed: true }, { name: "amount", type: "uint256" }] },
  { type: "event", name: "Answered", inputs: [{ name: "voyageId", type: "bytes32", indexed: true }, { name: "accepted", type: "uint256" }, { name: "disputed", type: "uint256" }, { name: "disputeDigest", type: "bytes32" }] },
  { type: "event", name: "Settled", inputs: [{ name: "voyageId", type: "bytes32", indexed: true }, { name: "toOwner", type: "uint256" }, { name: "refunded", type: "uint256" }] },
] as const;

export const usdcAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "version", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
] as const;

export const STAGES = ["None", "Open", "Presented", "Answered", "Settled"] as const;
