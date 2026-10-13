// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";
import {ArcInvoice} from "../src/ArcInvoice.sol";

contract Rejector { receive() external payable { revert("no"); } }

contract Reenter {
    ArcInvoice inv; uint256 id;
    constructor(ArcInvoice i) { inv = i; }
    function createAndAttack() external payable {
        id = inv.createInvoice(uint96(msg.value), 0, "attack");
        inv.pay{value: msg.value}(id);
    }
    receive() external payable { inv.pay{value: msg.value}(id); }
}

contract ArcInvoiceTest is Test {
    ArcInvoice inv;
    address merchant = makeAddr("merchant");
    address payer = makeAddr("payer");
    uint96 constant ONE_USDC = 1e18;

    function setUp() public {
        inv = new ArcInvoice();
        vm.deal(payer, 100e18);
    }

    function test_createAndPay() public {
        vm.prank(merchant);
        uint256 id = inv.createInvoice(ONE_USDC, 0, "Coffee");
        assertEq(id, 1);
        ArcInvoice.Invoice memory i = inv.getInvoice(id);
        assertEq(i.merchant, merchant);
        assertEq(i.amount, ONE_USDC);
        assertEq(uint8(i.status), uint8(ArcInvoice.Status.Open));
        assertEq(i.memo, "Coffee");

        vm.prank(payer);
        vm.expectEmit(true, true, true, true);
        emit ArcInvoice.InvoicePaid(id, merchant, payer, ONE_USDC);
        inv.pay{value: ONE_USDC}(id);

        i = inv.getInvoice(id);
        assertEq(uint8(i.status), uint8(ArcInvoice.Status.Paid));
        assertEq(i.payer, payer);
        assertEq(merchant.balance, ONE_USDC);
        assertEq(address(inv).balance, 0);
        assertEq(inv.merchantInvoices(merchant).length, 1);
    }

    function test_revert_wrongValue() public {
        vm.prank(merchant);
        uint256 id = inv.createInvoice(ONE_USDC, 0, "x");
        vm.prank(payer);
        vm.expectRevert(abi.encodeWithSelector(ArcInvoice.WrongValue.selector, ONE_USDC, ONE_USDC - 1));
        inv.pay{value: ONE_USDC - 1}(id);
    }

    function test_revert_doublePay() public {
        vm.prank(merchant);
        uint256 id = inv.createInvoice(ONE_USDC, 0, "x");
        vm.startPrank(payer);
        inv.pay{value: ONE_USDC}(id);
        vm.expectRevert(ArcInvoice.NotOpen.selector);
        inv.pay{value: ONE_USDC}(id);
        vm.stopPrank();
    }

    function test_revert_unknownId() public {
        vm.prank(payer);
        vm.expectRevert(ArcInvoice.NotOpen.selector);
        inv.pay{value: 1}(999);
    }

    function test_expiry() public {
        vm.prank(merchant);
        uint256 id = inv.createInvoice(ONE_USDC, uint64(block.timestamp + 100), "x");
        vm.warp(block.timestamp + 101);
        vm.prank(payer);
        vm.expectRevert(ArcInvoice.Expired.selector);
        inv.pay{value: ONE_USDC}(id);
    }

    function test_revert_badCreate() public {
        vm.startPrank(merchant);
        vm.expectRevert(ArcInvoice.InvalidAmount.selector);
        inv.createInvoice(0, 0, "x");
        vm.expectRevert(ArcInvoice.InvalidExpiry.selector);
        inv.createInvoice(1, uint64(block.timestamp), "x");
        bytes memory long = new bytes(141);
        vm.expectRevert(ArcInvoice.MemoTooLong.selector);
        inv.createInvoice(1, 0, string(long));
        vm.stopPrank();
    }

    function test_cancel_onlyMerchant() public {
        vm.prank(merchant);
        uint256 id = inv.createInvoice(ONE_USDC, 0, "x");
        vm.prank(payer);
        vm.expectRevert(ArcInvoice.NotMerchant.selector);
        inv.cancel(id);
        vm.prank(merchant);
        inv.cancel(id);
        assertEq(uint8(inv.getInvoice(id).status), uint8(ArcInvoice.Status.Cancelled));
        vm.prank(payer);
        vm.expectRevert(ArcInvoice.NotOpen.selector);
        inv.pay{value: ONE_USDC}(id);
        vm.prank(merchant);
        vm.expectRevert(ArcInvoice.NotOpen.selector);
        inv.cancel(id);
    }

    function test_forwardFailure_revertsAndStaysOpen() public {
        Rejector r = new Rejector();
        vm.prank(address(r));
        uint256 id = inv.createInvoice(ONE_USDC, 0, "x");
        vm.prank(payer);
        vm.expectRevert(ArcInvoice.ForwardFailed.selector);
        inv.pay{value: ONE_USDC}(id);
        assertEq(uint8(inv.getInvoice(id).status), uint8(ArcInvoice.Status.Open));
    }

    function test_reentrancyBlocked() public {
        Reenter a = new Reenter(inv);
        vm.deal(address(this), 10e18);
        // The receive() re-enters pay(); the lock reverts it, which makes the forward fail, which reverts the outer pay.
        vm.expectRevert(ArcInvoice.ForwardFailed.selector);
        a.createAndAttack{value: ONE_USDC}();
    }

    function test_batchRead() public {
        vm.startPrank(merchant);
        inv.createInvoice(1, 0, "a");
        inv.createInvoice(2, 0, "b");
        vm.stopPrank();
        uint256[] memory ids = new uint256[](2); ids[0] = 1; ids[1] = 2;
        ArcInvoice.Invoice[] memory out = inv.getInvoices(ids);
        assertEq(out[0].amount, 1); assertEq(out[1].memo, "b");
    }

    function testFuzz_payExact(uint96 amt) public {
        vm.assume(amt > 0 && amt <= 100e18);
        vm.prank(merchant);
        uint256 id = inv.createInvoice(amt, 0, "f");
        vm.prank(payer);
        inv.pay{value: amt}(id);
        assertEq(merchant.balance, amt);
    }
}
