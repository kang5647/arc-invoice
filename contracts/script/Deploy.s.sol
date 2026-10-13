// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;
import {Script, console} from "forge-std/Script.sol";
import {ArcInvoice} from "../src/ArcInvoice.sol";
contract Deploy is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("PRIVATE_KEY"));
        ArcInvoice inv = new ArcInvoice();
        vm.stopBroadcast();
        console.log("ArcInvoice deployed at", address(inv));
    }
}
