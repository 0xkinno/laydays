// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {LaydaysLedger} from "../src/LaydaysLedger.sol";
import {MockUSDC} from "./MockUSDC.sol";

/// Drives the ledger with random but valid-looking calls. Reverts are expected and ignored.
contract LedgerHandler is Test {
    LaydaysLedger public ledger;
    MockUSDC public usdc;
    uint256 internal ownerPk = 0xA11CE;
    uint256 internal chartPk = 0xB0B;
    address public owner;
    address public charterer;
    uint64 internal constant COMPLETION = 1_787_000_000;
    uint256 public constant IDS = 4;

    constructor(LaydaysLedger l, MockUSDC u) {
        ledger = l;
        usdc = u;
        owner = vm.addr(ownerPk);
        charterer = vm.addr(chartPk);
        usdc.mint(charterer, 1_000_000_000_000);
        vm.warp(COMPLETION + 10 days);
    }

    function vid(uint256 i) public pure returns (bytes32) {
        return keccak256(abi.encode("claim", i % 4));
    }

    function _sign(uint256 pk, bytes32 sh) internal view returns (bytes memory) {
        bytes32 d = keccak256(abi.encodePacked("\x19\x01", ledger.domainSeparator(), sh));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, d);
        return abi.encodePacked(r, s, v);
    }

    function openClaim(uint256 i) external {
        LaydaysLedger.Terms memory t = LaydaysLedger.Terms(owner, charterer, address(usdc), COMPLETION, 90, 0x7F, keccak256("cp"), keccak256("rb"));
        uint256 dl = block.timestamp + 1 days;
        bytes32 th = ledger.hashTerms(t);
        bytes memory os = _sign(ownerPk, keccak256(abi.encode(ledger.OPEN_TYPEHASH(), vid(i), th, ledger.nonces(owner), dl)));
        bytes memory cs = _sign(chartPk, keccak256(abi.encode(ledger.OPEN_TYPEHASH(), vid(i), th, ledger.nonces(charterer), dl)));
        try ledger.open(vid(i), t, dl, os, cs) {} catch {}
    }

    function presentClaim(uint256 i, uint256 amount, uint32 mask) external {
        amount = bound(amount, 1, 1_000_000_000);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sign(ownerPk, keccak256(abi.encode(ledger.PRESENT_TYPEHASH(), vid(i), amount, bytes32(0), bytes32(0), mask, ledger.nonces(owner), dl)));
        try ledger.present(vid(i), amount, bytes32(0), bytes32(0), mask, dl, sig) {} catch {}
    }

    function fundClaim(uint256 i, uint256 value) external {
        LaydaysLedger.Claim memory c = ledger.getClaim(vid(i));
        if (c.stage != LaydaysLedger.Stage.Presented || c.claimAmount == c.funded) return;
        value = bound(value, 1, c.claimAmount - c.funded);
        bytes32 nonce = keccak256(abi.encode(i, value, block.timestamp, gasleft()));
        bytes32 sh = keccak256(abi.encode(usdc.RECEIVE_TYPEHASH(), charterer, address(ledger), value, uint256(0), block.timestamp + 1 days, nonce));
        bytes32 dom = keccak256(abi.encode(keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"), keccak256("USD Coin"), keccak256("2"), block.chainid, address(usdc)));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(chartPk, keccak256(abi.encodePacked("\x19\x01", dom, sh)));
        try ledger.fundWithAuthorization(vid(i), value, 0, block.timestamp + 1 days, nonce, v, r, s) {} catch {}
    }

    function answerClaim(uint256 i, uint256 accepted) external {
        LaydaysLedger.Claim memory c = ledger.getClaim(vid(i));
        if (c.stage != LaydaysLedger.Stage.Presented) return;
        accepted = bound(accepted, 0, c.funded);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sign(chartPk, keccak256(abi.encode(ledger.ANSWER_TYPEHASH(), vid(i), accepted, bytes32(0), ledger.nonces(charterer), dl)));
        try ledger.answer(vid(i), accepted, bytes32(0), dl, sig) {} catch {}
    }

    function settleClaim(uint256 i, uint256 toOwner) external {
        LaydaysLedger.Claim memory c = ledger.getClaim(vid(i));
        if (c.stage != LaydaysLedger.Stage.Answered) return;
        uint256 held = c.funded - c.paidToOwner - c.refunded;
        toOwner = bound(toOwner, 0, held);
        uint256 dl = block.timestamp + 1 days;
        bytes memory os = _sign(ownerPk, keccak256(abi.encode(ledger.SETTLE_TYPEHASH(), vid(i), toOwner, ledger.nonces(owner), dl)));
        bytes memory cs = _sign(chartPk, keccak256(abi.encode(ledger.SETTLE_TYPEHASH(), vid(i), toOwner, ledger.nonces(charterer), dl)));
        try ledger.settle(vid(i), toOwner, dl, os, cs) {} catch {}
    }

    function reclaimClaim(uint256 i, uint256 days_) external {
        vm.warp(block.timestamp + bound(days_, 0, 40) * 1 days);
        try ledger.reclaim(vid(i)) {} catch {}
    }

    /// Sum over all claim ids of what the ledger should still hold.
    function expectedHeld() external view returns (uint256 total) {
        for (uint256 i = 0; i < IDS; i++) {
            LaydaysLedger.Claim memory c = ledger.getClaim(vid(i));
            total += c.funded - c.paidToOwner - c.refunded;
        }
    }
}

contract LaydaysLedgerInvariantTest is Test {
    LaydaysLedger ledger;
    MockUSDC usdc;
    LedgerHandler handler;

    function setUp() public {
        ledger = new LaydaysLedger();
        usdc = new MockUSDC();
        handler = new LedgerHandler(ledger, usdc);
        targetContract(address(handler));
    }

    /// The token balance of the ledger always equals funded minus paid to the owner minus refunded, summed over every claim.
    function invariant_balanceMatchesAccounting() public view {
        assertEq(usdc.balanceOf(address(ledger)), handler.expectedHeld());
    }

    /// No claim can ever be funded beyond its claimed amount.
    function invariant_neverOverfunded() public view {
        for (uint256 i = 0; i < 4; i++) {
            LaydaysLedger.Claim memory c = ledger.getClaim(handler.vid(i));
            assertLe(c.funded, c.claimAmount);
        }
    }
}
