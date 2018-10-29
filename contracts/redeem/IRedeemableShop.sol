pragma solidity 0.4.24;

contract IRedeemableShop {
  bool public isRedeemableShop = true;
  function redeemYummy(address _owner, uint256 _id, bool _earlyAccess) public;
}
