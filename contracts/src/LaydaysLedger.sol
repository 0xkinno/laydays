// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC3009 {
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

/// One record per voyage claim. Only the parties' own signatures move money.
/// The caller of any function (a relayer or the party itself) pays gas and nothing else.
contract LaydaysLedger is EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Terms {
        address owner;
        address charterer;
        address token;
        uint64 completionOfDischarge;
        uint16 timeBarDays;
        uint32 requiredDocsMask;
        bytes32 charterPartyHash;
        bytes32 rulebookHash;
    }

    enum Stage {
        None,
        Open,
        Presented,
        Answered,
        Settled
    }

    struct Claim {
        Terms terms;
        Stage stage;
        uint64 presentedAt;
        uint64 lastActionAt;
        uint256 claimAmount;
        bytes32 statementDigest;
        bytes32 docsRoot;
        uint32 providedDocsMask;
        uint256 funded;
        uint256 accepted;
        uint256 paidToOwner;
        uint256 refunded;
    }

    /// If the counterparty goes silent, the charterer can take back what is still held after this window.
    uint64 public constant RECLAIM_AFTER = 30 days;

    bytes32 public constant TERMS_TYPEHASH = keccak256(
        "Terms(address owner,address charterer,address token,uint64 completionOfDischarge,uint16 timeBarDays,uint32 requiredDocsMask,bytes32 charterPartyHash,bytes32 rulebookHash)"
    );
    bytes32 public constant OPEN_TYPEHASH = keccak256(
        "Open(bytes32 voyageId,Terms terms,uint256 nonce,uint256 deadline)Terms(address owner,address charterer,address token,uint64 completionOfDischarge,uint16 timeBarDays,uint32 requiredDocsMask,bytes32 charterPartyHash,bytes32 rulebookHash)"
    );
    bytes32 public constant PRESENT_TYPEHASH = keccak256(
        "Present(bytes32 voyageId,uint256 amount,bytes32 statementDigest,bytes32 docsRoot,uint32 providedDocsMask,uint256 nonce,uint256 deadline)"
    );
    bytes32 public constant ANSWER_TYPEHASH = keccak256(
        "Answer(bytes32 voyageId,uint256 accepted,bytes32 disputeDigest,uint256 nonce,uint256 deadline)"
    );
    bytes32 public constant SETTLE_TYPEHASH = keccak256(
        "Settle(bytes32 voyageId,uint256 toOwner,uint256 nonce,uint256 deadline)"
    );

    mapping(bytes32 => Claim) private _claims; // voyageId => claim
    mapping(address => uint256) public nonces;

    error TimeBarred(uint64 deadline, uint64 nowTs);
    error MissingSupportingDocuments(uint32 missingMask);
    error BadSignature();
    error WrongStage(Stage got);
    error Expired();
    error OverClaim();
    error Underfunded();
    error BadTerms();
    error TooEarly(uint64 availableAt);
    error NotCharterer();

    event Opened(bytes32 indexed voyageId, address owner, address charterer, uint64 deadline);
    event Presented(
        bytes32 indexed voyageId, uint256 amount, bytes32 statementDigest, bytes32 docsRoot, uint32 docsMask, uint64 at
    );
    event Funded(bytes32 indexed voyageId, uint256 amount);
    event Answered(bytes32 indexed voyageId, uint256 accepted, uint256 disputed, bytes32 disputeDigest);
    event Settled(bytes32 indexed voyageId, uint256 toOwner, uint256 refunded);

    constructor() EIP712("Laydays", "1") {}

    // ----------------------------------------------------------------- views

    function getClaim(bytes32 voyageId) external view returns (Claim memory) {
        return _claims[voyageId];
    }

    function timeBarDeadline(bytes32 voyageId) public view returns (uint64) {
        Terms storage t = _claims[voyageId].terms;
        return t.completionOfDischarge + uint64(t.timeBarDays) * 1 days;
    }

    function hashTerms(Terms calldata t) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                TERMS_TYPEHASH,
                t.owner,
                t.charterer,
                t.token,
                t.completionOfDischarge,
                t.timeBarDays,
                t.requiredDocsMask,
                t.charterPartyHash,
                t.rulebookHash
            )
        );
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    // ------------------------------------------------------------- lifecycle

    /// Both parties sign the Terms. Anyone may submit.
    function open(bytes32 voyageId, Terms calldata t, uint256 deadline, bytes calldata ownerSig, bytes calldata chartererSig)
        external
    {
        Claim storage c = _claims[voyageId];
        if (c.stage != Stage.None) revert WrongStage(c.stage);
        if (block.timestamp > deadline) revert Expired();
        if (t.owner == address(0) || t.charterer == address(0) || t.token == address(0) || t.owner == t.charterer) {
            revert BadTerms();
        }
        if (t.timeBarDays == 0) revert BadTerms();

        bytes32 th = hashTerms(t);
        _verify(t.owner, keccak256(abi.encode(OPEN_TYPEHASH, voyageId, th, nonces[t.owner], deadline)), ownerSig);
        nonces[t.owner]++;
        _verify(t.charterer, keccak256(abi.encode(OPEN_TYPEHASH, voyageId, th, nonces[t.charterer], deadline)), chartererSig);
        nonces[t.charterer]++;

        c.terms = t;
        c.stage = Stage.Open;
        c.lastActionAt = uint64(block.timestamp);
        emit Opened(voyageId, t.owner, t.charterer, timeBarDeadline(voyageId));
    }

    /// The owner presents the claim. Refused if the time bar has passed or a required document is missing.
    function present(
        bytes32 voyageId,
        uint256 amount,
        bytes32 statementDigest,
        bytes32 docsRoot,
        uint32 providedDocsMask,
        uint256 deadline,
        bytes calldata ownerSig
    ) external {
        Claim storage c = _claims[voyageId];
        if (c.stage != Stage.Open) revert WrongStage(c.stage);
        if (block.timestamp > deadline) revert Expired();

        uint64 bar = timeBarDeadline(voyageId);
        if (block.timestamp > bar) revert TimeBarred(bar, uint64(block.timestamp));

        uint32 missing = c.terms.requiredDocsMask & ~providedDocsMask;
        if (missing != 0) revert MissingSupportingDocuments(missing);
        if (amount == 0) revert OverClaim();

        _verify(
            c.terms.owner,
            keccak256(
                abi.encode(
                    PRESENT_TYPEHASH, voyageId, amount, statementDigest, docsRoot, providedDocsMask, nonces[c.terms.owner], deadline
                )
            ),
            ownerSig
        );
        nonces[c.terms.owner]++;

        c.stage = Stage.Presented;
        c.presentedAt = uint64(block.timestamp);
        c.lastActionAt = uint64(block.timestamp);
        c.claimAmount = amount;
        c.statementDigest = statementDigest;
        c.docsRoot = docsRoot;
        c.providedDocsMask = providedDocsMask;
        emit Presented(voyageId, amount, statementDigest, docsRoot, providedDocsMask, uint64(block.timestamp));
    }

    /// The charterer funds the claim with a USDC EIP-3009 authorization addressed to this contract.
    function fundWithAuthorization(
        bytes32 voyageId,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant {
        Claim storage c = _claims[voyageId];
        if (c.stage != Stage.Presented) revert WrongStage(c.stage);
        if (c.funded + value > c.claimAmount) revert OverClaim();

        uint256 before_ = IERC20(c.terms.token).balanceOf(address(this));
        IERC3009(c.terms.token).receiveWithAuthorization(c.terms.charterer, address(this), value, validAfter, validBefore, nonce, v, r, s);
        uint256 received = IERC20(c.terms.token).balanceOf(address(this)) - before_;
        if (received != value) revert Underfunded();

        c.funded += value;
        c.lastActionAt = uint64(block.timestamp);
        emit Funded(voyageId, value);
    }

    /// The charterer answers: `accepted` is paid to the owner now, the rest stays held for a settlement.
    function answer(bytes32 voyageId, uint256 accepted, bytes32 disputeDigest, uint256 deadline, bytes calldata chartererSig)
        external
        nonReentrant
    {
        Claim storage c = _claims[voyageId];
        if (c.stage != Stage.Presented) revert WrongStage(c.stage);
        if (block.timestamp > deadline) revert Expired();
        if (accepted > c.claimAmount) revert OverClaim();
        if (c.funded < accepted) revert Underfunded();

        _verify(
            c.terms.charterer,
            keccak256(abi.encode(ANSWER_TYPEHASH, voyageId, accepted, disputeDigest, nonces[c.terms.charterer], deadline)),
            chartererSig
        );
        nonces[c.terms.charterer]++;

        c.accepted = accepted;
        c.paidToOwner = accepted;
        c.lastActionAt = uint64(block.timestamp);
        uint256 disputed = c.claimAmount - accepted;

        IERC20 token = IERC20(c.terms.token);
        if (accepted > 0) token.safeTransfer(c.terms.owner, accepted);

        if (disputed == 0) {
            // Nothing disputed: refund any surplus funding and close.
            uint256 surplus = c.funded - accepted;
            c.stage = Stage.Settled;
            if (surplus > 0) {
                c.refunded = surplus;
                token.safeTransfer(c.terms.charterer, surplus);
            }
            emit Answered(voyageId, accepted, 0, disputeDigest);
            emit Settled(voyageId, accepted, surplus);
        } else {
            c.stage = Stage.Answered;
            emit Answered(voyageId, accepted, disputed, disputeDigest);
        }
    }

    /// Both parties sign a settlement of the held amount. `toOwner` is paid on top of what was already accepted.
    function settle(bytes32 voyageId, uint256 toOwner, uint256 deadline, bytes calldata ownerSig, bytes calldata chartererSig)
        external
        nonReentrant
    {
        Claim storage c = _claims[voyageId];
        if (c.stage != Stage.Answered) revert WrongStage(c.stage);
        if (block.timestamp > deadline) revert Expired();
        uint256 held = c.funded - c.paidToOwner - c.refunded;
        if (toOwner > held) revert OverClaim();

        _verify(c.terms.owner, keccak256(abi.encode(SETTLE_TYPEHASH, voyageId, toOwner, nonces[c.terms.owner], deadline)), ownerSig);
        nonces[c.terms.owner]++;
        _verify(
            c.terms.charterer, keccak256(abi.encode(SETTLE_TYPEHASH, voyageId, toOwner, nonces[c.terms.charterer], deadline)), chartererSig
        );
        nonces[c.terms.charterer]++;

        uint256 refund = held - toOwner;
        c.stage = Stage.Settled;
        c.paidToOwner += toOwner;
        c.refunded += refund;
        c.lastActionAt = uint64(block.timestamp);

        IERC20 token = IERC20(c.terms.token);
        if (toOwner > 0) token.safeTransfer(c.terms.owner, toOwner);
        if (refund > 0) token.safeTransfer(c.terms.charterer, refund);
        emit Settled(voyageId, toOwner, refund);
    }

    /// If nobody acts for RECLAIM_AFTER, anyone may return what is still held to the charterer.
    function reclaim(bytes32 voyageId) external nonReentrant {
        Claim storage c = _claims[voyageId];
        if (c.stage != Stage.Presented && c.stage != Stage.Answered) revert WrongStage(c.stage);
        uint64 availableAt = c.lastActionAt + RECLAIM_AFTER;
        if (block.timestamp < availableAt) revert TooEarly(availableAt);
        uint256 held = c.funded - c.paidToOwner - c.refunded;
        c.stage = Stage.Settled;
        c.refunded += held;
        if (held > 0) IERC20(c.terms.token).safeTransfer(c.terms.charterer, held);
        emit Settled(voyageId, 0, held);
    }

    // -------------------------------------------------------------- internal

    function _verify(address signer, bytes32 structHash, bytes calldata sig) internal view {
        if (!SignatureChecker.isValidSignatureNow(signer, _hashTypedDataV4(structHash), sig)) revert BadSignature();
    }
}
