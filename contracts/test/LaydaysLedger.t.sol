// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {LaydaysLedger} from "../src/LaydaysLedger.sol";
import {MockUSDC} from "./MockUSDC.sol";

contract LedgerBase is Test {
    LaydaysLedger ledger;
    MockUSDC usdc;
    uint256 ownerPk = 0xA11CE;
    uint256 chartPk = 0xB0B;
    address owner;
    address charterer;
    bytes32 constant VID = keccak256("orla-jansen");
    uint64 constant COMPLETION = 1_787_000_000;
    uint32 constant REQUIRED = 0x7F; // seven documents
    uint256 constant CLAIM = 61_250_000_000; // 61,250 USDC (6 decimals)

    function setUp() public virtual {
        owner = vm.addr(ownerPk);
        charterer = vm.addr(chartPk);
        ledger = new LaydaysLedger();
        usdc = new MockUSDC();
        usdc.mint(charterer, 1_000_000_000_000);
        vm.warp(COMPLETION + 83 days);
    }

    function terms() internal view returns (LaydaysLedger.Terms memory t) {
        t = LaydaysLedger.Terms(owner, charterer, address(usdc), COMPLETION, 90, REQUIRED, keccak256("cp"), keccak256("rulebook"));
    }

    function _sign(uint256 pk, bytes32 structHash) internal view returns (bytes memory) {
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", ledger.domainSeparator(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function openClaim() internal {
        LaydaysLedger.Terms memory t = terms();
        uint256 dl = block.timestamp + 1 days;
        bytes32 th = ledger.hashTerms(t);
        bytes memory os = _sign(ownerPk, keccak256(abi.encode(ledger.OPEN_TYPEHASH(), VID, th, ledger.nonces(owner), dl)));
        bytes memory cs = _sign(chartPk, keccak256(abi.encode(ledger.OPEN_TYPEHASH(), VID, th, ledger.nonces(charterer), dl)));
        ledger.open(VID, t, dl, os, cs);
    }

    function presentSig(uint256 amount, bytes32 sd, bytes32 root, uint32 mask, uint256 dl) internal view returns (bytes memory) {
        return _sign(ownerPk, keccak256(abi.encode(ledger.PRESENT_TYPEHASH(), VID, amount, sd, root, mask, ledger.nonces(owner), dl)));
    }

    function present(uint256 amount, uint32 mask) internal {
        uint256 dl = block.timestamp + 1 days;
        ledger.present(VID, amount, keccak256("stmt"), keccak256("root"), mask, dl, presentSig(amount, keccak256("stmt"), keccak256("root"), mask, dl));
    }

    function fund(uint256 value) internal {
        bytes32 nonce = keccak256(abi.encode("n", value, block.timestamp, usdc.balanceOf(address(ledger))));
        bytes32 sh = keccak256(abi.encode(usdc.RECEIVE_TYPEHASH(), charterer, address(ledger), value, uint256(0), block.timestamp + 1 days, nonce));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _usdcDomain(), sh));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(chartPk, digest);
        ledger.fundWithAuthorization(VID, value, 0, block.timestamp + 1 days, nonce, v, r, s);
    }

    function _usdcDomain() internal view returns (bytes32) {
        return keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("USD Coin"), keccak256("2"), block.chainid, address(usdc)));
    }

    function answerSig(uint256 accepted, bytes32 dd, uint256 dl) internal view returns (bytes memory) {
        return _sign(chartPk, keccak256(abi.encode(ledger.ANSWER_TYPEHASH(), VID, accepted, dd, ledger.nonces(charterer), dl)));
    }

    function settleSigs(uint256 toOwner, uint256 dl) internal view returns (bytes memory o, bytes memory c) {
        o = _sign(ownerPk, keccak256(abi.encode(ledger.SETTLE_TYPEHASH(), VID, toOwner, ledger.nonces(owner), dl)));
        c = _sign(chartPk, keccak256(abi.encode(ledger.SETTLE_TYPEHASH(), VID, toOwner, ledger.nonces(charterer), dl)));
    }
}

contract LaydaysLedgerTest is LedgerBase {
    function test_happyPath_undisputedPaidImmediately_thenSettlement() public {
        openClaim();
        present(CLAIM, REQUIRED);
        fund(CLAIM);
        uint256 dl = block.timestamp + 1 days;
        uint256 accepted = 50_000_000_000;
        ledger.answer(VID, accepted, keccak256("dispute"), dl, answerSig(accepted, keccak256("dispute"), dl));
        assertEq(usdc.balanceOf(owner), accepted);
        assertEq(usdc.balanceOf(address(ledger)), CLAIM - accepted);

        uint256 toOwner = 4_000_000_000;
        (bytes memory os, bytes memory cs) = settleSigs(toOwner, dl);
        ledger.settle(VID, toOwner, dl, os, cs);
        assertEq(usdc.balanceOf(owner), accepted + toOwner);
        assertEq(usdc.balanceOf(address(ledger)), 0);
        assertEq(uint8(ledger.getClaim(VID).stage), uint8(LaydaysLedger.Stage.Settled));
    }

    function test_fullAcceptance_closesAtOnce() public {
        openClaim();
        present(CLAIM, REQUIRED);
        fund(CLAIM);
        uint256 dl = block.timestamp + 1 days;
        ledger.answer(VID, CLAIM, bytes32(0), dl, answerSig(CLAIM, bytes32(0), dl));
        assertEq(usdc.balanceOf(owner), CLAIM);
        assertEq(uint8(ledger.getClaim(VID).stage), uint8(LaydaysLedger.Stage.Settled));
    }

    function test_refuses_lateByOneSecond() public {
        openClaim();
        uint64 bar = ledger.timeBarDeadline(VID);
        vm.warp(uint256(bar) + 1);
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = presentSig(CLAIM, keccak256("stmt"), keccak256("root"), REQUIRED, dl);
        vm.expectRevert(abi.encodeWithSelector(LaydaysLedger.TimeBarred.selector, bar, uint64(block.timestamp)));
        ledger.present(VID, CLAIM, keccak256("stmt"), keccak256("root"), REQUIRED, dl, sig);
    }

    function test_accepts_exactlyAtTheBar() public {
        openClaim();
        vm.warp(ledger.timeBarDeadline(VID));
        present(CLAIM, REQUIRED);
    }

    function test_refuses_missingBillsOfLading() public {
        openClaim();
        uint32 mask = REQUIRED & ~uint32(1 << 2); // bit 2 = bills of lading
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = presentSig(CLAIM, keccak256("stmt"), keccak256("root"), mask, dl);
        vm.expectRevert(abi.encodeWithSelector(LaydaysLedger.MissingSupportingDocuments.selector, uint32(1 << 2)));
        ledger.present(VID, CLAIM, keccak256("stmt"), keccak256("root"), mask, dl, sig);
    }

    function test_refuses_badSignature() public {
        openClaim();
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = _sign(chartPk, keccak256(abi.encode(ledger.PRESENT_TYPEHASH(), VID, CLAIM, keccak256("stmt"), keccak256("root"), REQUIRED, ledger.nonces(owner), dl)));
        vm.expectRevert(LaydaysLedger.BadSignature.selector);
        ledger.present(VID, CLAIM, keccak256("stmt"), keccak256("root"), REQUIRED, dl, sig);
    }

    function test_refuses_tamperedStatementDigest() public {
        openClaim();
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = presentSig(CLAIM, keccak256("stmt"), keccak256("root"), REQUIRED, dl);
        vm.expectRevert(LaydaysLedger.BadSignature.selector);
        ledger.present(VID, CLAIM, keccak256("other"), keccak256("root"), REQUIRED, dl, sig);
    }

    function test_refuses_replayedSignature() public {
        openClaim();
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = presentSig(CLAIM, keccak256("stmt"), keccak256("root"), REQUIRED, dl);
        ledger.present(VID, CLAIM, keccak256("stmt"), keccak256("root"), REQUIRED, dl, sig);
        vm.expectRevert(abi.encodeWithSelector(LaydaysLedger.WrongStage.selector, LaydaysLedger.Stage.Presented));
        ledger.present(VID, CLAIM, keccak256("stmt"), keccak256("root"), REQUIRED, dl, sig);
    }

    function test_refuses_expiredSignature() public {
        openClaim();
        uint256 dl = block.timestamp + 1 hours;
        bytes memory sig = presentSig(CLAIM, keccak256("stmt"), keccak256("root"), REQUIRED, dl);
        vm.warp(block.timestamp + 2 hours);
        vm.expectRevert(LaydaysLedger.Expired.selector);
        ledger.present(VID, CLAIM, keccak256("stmt"), keccak256("root"), REQUIRED, dl, sig);
    }

    function test_refuses_wrongStage() public {
        vm.expectRevert(abi.encodeWithSelector(LaydaysLedger.WrongStage.selector, LaydaysLedger.Stage.None));
        ledger.present(VID, CLAIM, 0, 0, REQUIRED, block.timestamp + 1, hex"");
    }

    function test_refuses_overFunding() public {
        openClaim();
        present(CLAIM, REQUIRED);
        fund(CLAIM);
        bytes32 nonce = keccak256("x");
        vm.expectRevert(LaydaysLedger.OverClaim.selector);
        ledger.fundWithAuthorization(VID, 1, 0, block.timestamp + 1, nonce, 27, bytes32(0), bytes32(0));
    }

    function test_refuses_acceptingMoreThanClaimed() public {
        openClaim();
        present(CLAIM, REQUIRED);
        fund(CLAIM);
        uint256 dl = block.timestamp + 1 days;
        vm.expectRevert(LaydaysLedger.OverClaim.selector);
        ledger.answer(VID, CLAIM + 1, 0, dl, hex"");
    }

    function test_refuses_acceptingWhatIsNotFunded() public {
        openClaim();
        present(CLAIM, REQUIRED);
        fund(10_000_000_000);
        uint256 dl = block.timestamp + 1 days;
        vm.expectRevert(LaydaysLedger.Underfunded.selector);
        ledger.answer(VID, 20_000_000_000, 0, dl, hex"");
    }

    function test_refuses_settlementBeyondHeld() public {
        openClaim();
        present(CLAIM, REQUIRED);
        fund(CLAIM);
        uint256 dl = block.timestamp + 1 days;
        ledger.answer(VID, 50_000_000_000, 0, dl, answerSig(50_000_000_000, 0, dl));
        uint256 toOwner = CLAIM - 50_000_000_000 + 1;
        (bytes memory os, bytes memory cs) = settleSigs(toOwner, dl);
        vm.expectRevert(LaydaysLedger.OverClaim.selector);
        ledger.settle(VID, toOwner, dl, os, cs);
    }

    function test_refuses_settlementWithOnlyOneSignature() public {
        openClaim();
        present(CLAIM, REQUIRED);
        fund(CLAIM);
        uint256 dl = block.timestamp + 1 days;
        ledger.answer(VID, 50_000_000_000, 0, dl, answerSig(50_000_000_000, 0, dl));
        (bytes memory os,) = settleSigs(1, dl);
        vm.expectRevert(LaydaysLedger.BadSignature.selector);
        ledger.settle(VID, 1, dl, os, os);
    }

    function test_reclaim_onlyAfterTheWindow() public {
        openClaim();
        present(CLAIM, REQUIRED);
        fund(CLAIM);
        vm.expectRevert();
        ledger.reclaim(VID);
        vm.warp(block.timestamp + 31 days);
        uint256 before_ = usdc.balanceOf(charterer);
        ledger.reclaim(VID);
        assertEq(usdc.balanceOf(charterer), before_ + CLAIM);
    }

    function test_cannotOpenTwiceOrWithBadTerms() public {
        openClaim();
        LaydaysLedger.Terms memory t = terms();
        vm.expectRevert(abi.encodeWithSelector(LaydaysLedger.WrongStage.selector, LaydaysLedger.Stage.Open));
        ledger.open(VID, t, block.timestamp + 1, hex"", hex"");
        t.timeBarDays = 0;
        vm.expectRevert(LaydaysLedger.BadTerms.selector);
        ledger.open(keccak256("other"), t, block.timestamp + 1, hex"", hex"");
    }

    /// Fuzz: any missing-document bit is refused with exactly that mask; a full set is accepted.
    function testFuzz_documentMask(uint32 provided) public {
        openClaim();
        uint256 dl = block.timestamp + 1 days;
        bytes memory sig = presentSig(CLAIM, keccak256("stmt"), keccak256("root"), provided, dl);
        uint32 missing = REQUIRED & ~provided;
        if (missing != 0) {
            vm.expectRevert(abi.encodeWithSelector(LaydaysLedger.MissingSupportingDocuments.selector, missing));
        }
        ledger.present(VID, CLAIM, keccak256("stmt"), keccak256("root"), provided, dl, sig);
    }

    /// Fuzz: the payment always splits exactly: accepted to owner, remainder held, nothing created or lost.
    function testFuzz_amountsConserve(uint256 accepted, uint256 toOwner) public {
        accepted = bound(accepted, 0, CLAIM);
        openClaim();
        present(CLAIM, REQUIRED);
        fund(CLAIM);
        uint256 dl = block.timestamp + 1 days;
        ledger.answer(VID, accepted, 0, dl, answerSig(accepted, 0, dl));
        if (accepted < CLAIM) {
            toOwner = bound(toOwner, 0, CLAIM - accepted);
            (bytes memory os, bytes memory cs) = settleSigs(toOwner, dl);
            ledger.settle(VID, toOwner, dl, os, cs);
            assertEq(usdc.balanceOf(owner), accepted + toOwner);
            assertEq(usdc.balanceOf(charterer), 1_000_000_000_000 - accepted - toOwner);
        }
        assertEq(usdc.balanceOf(address(ledger)), 0);
    }

    /// Fuzz: a time-bar boundary at any offset behaves exactly at the deadline.
    function testFuzz_timeBar(uint64 offset) public {
        openClaim();
        uint64 bar = ledger.timeBarDeadline(VID);
        offset = uint64(bound(offset, 0, 400 days));
        uint256 ts = uint256(COMPLETION) + offset;
        vm.warp(ts);
        uint256 dl = ts + 1 days;
        bytes memory sig = presentSig(CLAIM, keccak256("stmt"), keccak256("root"), REQUIRED, dl);
        if (ts > bar) vm.expectRevert(abi.encodeWithSelector(LaydaysLedger.TimeBarred.selector, bar, uint64(ts)));
        ledger.present(VID, CLAIM, keccak256("stmt"), keccak256("root"), REQUIRED, dl, sig);
    }
}
