// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

/// @title ArcInvoice — merchant payment links settled in native USDC on Arc
/// @notice A merchant creates an invoice (amount, memo, optional expiry). A payer settles it
///         in a single transaction by sending native USDC (Arc's gas token) as msg.value.
///         Funds are forwarded straight to the merchant; the contract never custodies money
///         beyond the paying transaction. Every state change emits an event so the receipt is
///         verifiable on the Arc explorer.
/// @dev    Amounts are in native units (18 decimals). 1 USDC == 1e18. The ERC-20 view of the
///         same balance uses 6 decimals; this contract deliberately never touches that interface.
contract ArcInvoice {
    enum Status { None, Open, Paid, Cancelled }

    struct Invoice {
        address merchant;
        uint96  amount;     // native USDC, 18 decimals (max ~7.9e10 USDC)
        uint64  createdAt;
        uint64  expiresAt;  // 0 = never
        Status  status;
        address payer;
        uint64  paidAt;
        string  memo;
    }

    uint256 public invoiceCount;
    mapping(uint256 => Invoice) private _invoices;
    mapping(address => uint256[]) private _merchantInvoices;

    uint256 private _lock = 1;

    event InvoiceCreated(uint256 indexed id, address indexed merchant, uint256 amount, uint64 expiresAt, string memo);
    event InvoicePaid(uint256 indexed id, address indexed merchant, address indexed payer, uint256 amount);
    event InvoiceCancelled(uint256 indexed id, address indexed merchant);

    error InvalidAmount();
    error InvalidExpiry();
    error MemoTooLong();
    error NotOpen();
    error NotMerchant();
    error Expired();
    error WrongValue(uint256 expected, uint256 actual);
    error ForwardFailed();
    error Reentrancy();

    modifier nonReentrant() {
        if (_lock != 1) revert Reentrancy();
        _lock = 2;
        _;
        _lock = 1;
    }

    /// @notice Create an invoice payable to msg.sender.
    /// @param amount   Amount due in native USDC units (18 decimals).
    /// @param expiresAt Unix timestamp after which the invoice can no longer be paid; 0 for none.
    /// @param memo     Short human-readable description (<= 140 bytes).
    function createInvoice(uint96 amount, uint64 expiresAt, string calldata memo) external returns (uint256 id) {
        if (amount == 0) revert InvalidAmount();
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvalidExpiry();
        if (bytes(memo).length > 140) revert MemoTooLong();

        id = ++invoiceCount;
        Invoice storage inv = _invoices[id];
        inv.merchant = msg.sender;
        inv.amount = amount;
        inv.createdAt = uint64(block.timestamp);
        inv.expiresAt = expiresAt;
        inv.status = Status.Open;
        inv.memo = memo;
        _merchantInvoices[msg.sender].push(id);

        emit InvoiceCreated(id, msg.sender, amount, expiresAt, memo);
    }

    /// @notice Pay an open invoice by sending exactly the invoiced amount of native USDC.
    function pay(uint256 id) external payable nonReentrant {
        Invoice storage inv = _invoices[id];
        if (inv.status != Status.Open) revert NotOpen();
        if (inv.expiresAt != 0 && block.timestamp > inv.expiresAt) revert Expired();
        if (msg.value != inv.amount) revert WrongValue(inv.amount, msg.value);

        inv.status = Status.Paid;
        inv.payer = msg.sender;
        inv.paidAt = uint64(block.timestamp);

        (bool ok, ) = inv.merchant.call{value: msg.value}("");
        if (!ok) revert ForwardFailed();

        emit InvoicePaid(id, inv.merchant, msg.sender, msg.value);
    }

    /// @notice Cancel an open invoice. Only the merchant may cancel.
    function cancel(uint256 id) external {
        Invoice storage inv = _invoices[id];
        if (inv.status != Status.Open) revert NotOpen();
        if (inv.merchant != msg.sender) revert NotMerchant();
        inv.status = Status.Cancelled;
        emit InvoiceCancelled(id, msg.sender);
    }

    function getInvoice(uint256 id) external view returns (Invoice memory) {
        return _invoices[id];
    }

    function merchantInvoices(address merchant) external view returns (uint256[] memory) {
        return _merchantInvoices[merchant];
    }

    /// @notice Batch read for the frontend (avoids eth_getLogs range limits on Arc).
    function getInvoices(uint256[] calldata ids) external view returns (Invoice[] memory out) {
        out = new Invoice[](ids.length);
        for (uint256 i = 0; i < ids.length; i++) out[i] = _invoices[ids[i]];
    }
}
