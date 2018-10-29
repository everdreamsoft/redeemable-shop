pragma solidity 0.4.24;

import "../core/YummyAccessControl.sol";
import "../openzeppelin/math/SafeMath.sol";
import "./IRedeemLogic.sol";
import "./IRedeemableShop.sol";

/**
 * @title RedeemableShop
 * @dev stores the number of redeemable Yummies that each address has
 * and controls when they can be redeemed.
*/
contract RedeemableShop is YummyAccessControl, IRedeemableShop {

  using SafeMath for uint256;

  /// @dev event called when a new redeemable is created by the owners of the contract
  event RedeemableCreated(
    uint256 id,
    uint256 basePrice,
    uint256 increment,
    uint maxBuyDate,
    uint redeemDate
  );

  /// @dev Change events for every parameter
  event BasePriceChanged(address from, uint256 id, uint256 newBasePrice);
  event IncrementChanged(address from, uint256 id, uint256 newIncrement);
  event MaxBuyDateChanged(address from, uint256 id, uint256 newMaxBuyDate);
  event RedeemDateChanged(address from, uint256 id, uint256 newRedeemDate);

  event RedeemableObtained(address buyer, uint256 id, uint256 price, uint256 _amount);
  event YummyRedeemed(address owner, uint256 id);

  struct Redeemable {
    uint256 basePrice;
    uint256 increment;
    uint256 numUnitsSold;
    uint maxBuyDate;
    uint redeemDate;
    mapping (address => uint) owners;
  }

  // Redeemable storage, the redeemable race is the index of the token in this mapping
  mapping(uint256 => Redeemable) public redeemable;

  // Number of different redeemable available (Races)
  uint256 public numRedeemable = 0;

  // Address of the redeem logic contract
  IRedeemLogic public redeemLogic;

  /**
   * @dev Guarantees that the raceId is correct
   * @param _raceId id of the race
   */
  modifier validRaceID(uint256 _raceId) {
    // @notice: valid ids will be always less than the num redeemable
    require(_raceId < numRedeemable);
    _;
  }

  constructor() public {
    ceoAddress = msg.sender;
    cooAddress = msg.sender;
    cfoAddress = msg.sender;
  }

  /// @dev creates a new redeemable race, only CEO, CFO, and CDO can call it.
  /// @param _raceId Id of the new race that is about to be created it need to be an increment of of the last one
  /// @param _startingPrice Initial price that the race will have
  /// @param _increment Increment of price after each buy
  /// @param _maxBuyDate Max date where the users will be able to buy the redeemable
  /// @param _redeemDate Date where the users will be able to start redeem their yummies
  function createNewRedeemable(
    uint256 _raceId,
    uint256 _startingPrice,
    uint256 _increment,
    uint _maxBuyDate,
    uint _redeemDate
  ) external onlyCLevel
  {
    // @notice: Done this way to avoid people to try to create two times the same race
    // there is only one correct _raceId at time.
    require(_raceId == numRedeemable);

    Redeemable memory newRedeemable = Redeemable({
      basePrice: _startingPrice,
      increment: _increment,
      numUnitsSold: 0,
      maxBuyDate: _maxBuyDate,
      redeemDate: _redeemDate
    });

    redeemable[_raceId] = newRedeemable;
    numRedeemable++;
    emit RedeemableCreated(
      _raceId,
      _startingPrice,
      _increment,
      _maxBuyDate,
      _redeemDate);
  }

  /// @dev Gets a redeemable
  /// @param _id id of the race to get the info
  /// returns the following:
  /// 1- Id
  /// 2- Base Price
  /// 3- Price Increment
  /// 4- Num Units Sold
  /// 5- Max Buy Date
  /// 6- Redeem Date
  function getRedeemable(uint256 _id) public view returns(uint256, uint256, uint256, uint256, uint, uint){
    Redeemable storage r = redeemable[_id];
    return (_id, r.basePrice, r.increment, r.numUnitsSold, r.maxBuyDate, r.redeemDate);
  }

  /// @dev Changes the base price of a redeemable only CLevel users can perform this operation
  /// @param _id of the race to modify
  /// @param _newPrice new base price for the race
  function setBasePrice(uint256 _id, uint256 _newPrice) external onlyCLevel validRaceID(_id){
    redeemable[_id].basePrice = _newPrice;
    emit BasePriceChanged(msg.sender, _id, _newPrice);
  }

  /// @dev Change the increment of a redeemable, only C level can perform this operation
  /// @param _id of the race to modify
  /// @param _newIncrement new increment for the race
  function setIncrement(uint256 _id, uint256 _newIncrement) external onlyCLevel validRaceID(_id){
    redeemable[_id].increment = _newIncrement;
    emit IncrementChanged(msg.sender, _id, _newIncrement);
  }

  /// @dev Change the max buy date of an entity, only C level can perform this operation
  /// @param _id of the race to modify
  /// @param _newMaxBuyDate new max buy date for the race
  function setMaxBuyDate(uint256 _id, uint _newMaxBuyDate) external onlyCLevel validRaceID(_id){
    redeemable[_id].maxBuyDate = _newMaxBuyDate;
    emit MaxBuyDateChanged(msg.sender, _id, _newMaxBuyDate);
  }

  /// @dev Change the redeem date of an entity, only C level can perform this operation
  /// @param _id of the race to modify
  /// @param _newRedeemDate new redeem date
  function setRedeemDate(uint256 _id, uint _newRedeemDate) external onlyCLevel validRaceID(_id){
    redeemable[_id].redeemDate = _newRedeemDate;
    emit RedeemDateChanged(msg.sender, _id, _newRedeemDate);
  }

  /// @dev Sets the redeem logic contract
  /// @param _newLogic Address of the redeem contract
  function setRedeemLogic(IRedeemLogic _newLogic) external onlyCLevel {
    require(_newLogic.isRedeemLogic());
    redeemLogic = _newLogic;
  }

  /// @dev Used to buy a redeemable
  /// @param _id of the redeemable to buy
  function buyRedeemable(uint256 _id) public payable whenNotPaused validRaceID(_id){

    // Get the redeemable
    Redeemable storage redeem = redeemable[_id];

    // Check that is stil possible to buy the redeemable
    require(now <= redeem.maxBuyDate);

    // Ensure that the ether send is higher than the price
    uint256 value = msg.value;
    uint256 price = redeemPrice(_id);
    require(value >= price);

    // Give the redeemable to the message sender
    redeem.owners[msg.sender] = redeem.owners[msg.sender].add(1);
    redeem.numUnitsSold = redeem.numUnitsSold.add(1);

    // Compute the change to transfer it back to the buyer
    uint256 change = value.sub(price);
    msg.sender.transfer(change);

    // Send the ether to the CFO
    cfoAddress.transfer(address(this).balance);

    emit RedeemableObtained(msg.sender, _id, price, 1);
  }

  /// @dev Gets the redeem price of a current race
  /// @param _id Id of the race to calc price
  /// @return Current price of the redeemable
  function redeemPrice(uint256 _id) public view returns(uint256) {
    Redeemable memory r = redeemable[_id];
    return r.basePrice.add(r.increment.mul(r.numUnitsSold));
  }

  /// @dev Gets the number of redeemable of the owner by race id
  /// @param _owner Address of the owner
  /// @param _id race id
  function numOwnedRedeemable(address _owner, uint256 _id) public view returns(uint256){
    return redeemable[_id].owners[_owner];
  }

  /// @dev Redeems a certain yummy
  /// @param _owner Address of the owner
  /// @param _id race id
  /// @param _earlyAccess used to allow some users to bypass the redeem date 
  function redeemYummy(address _owner, uint256 _id, bool _earlyAccess) public whenNotPaused validRaceID(_id){
    // @notice: Only the redeem logic contract can perform this opeation
    require(msg.sender == address(redeemLogic));

    // Get the redeemable to redeem
    Redeemable storage redeem = redeemable[_id];

    // Non Early access users needs to pass the redeem date test
    require(now >= redeem.redeemDate || _earlyAccess == true);

    // User should have redeemables
    require(redeem.owners[_owner] > 0);

    // Remove one redeemable
    redeem.owners[_owner] = redeem.owners[_owner].sub(1);

    // Emit the yummy redeemed event
    emit YummyRedeemed(_owner, _id);
  }

  /// @dev Gives away some specific ammount of redeemable for free to an specific user
  /// @param _id Race id for the Redeemable
  /// @param _amount Ammount to giveaway
  /// @param _receiver Address that will receive the Redeemable
  function giveawayRedeemable(uint256 _id, uint256 _amount, address _receiver) public whenNotPaused validRaceID(_id) onlyCLevel {
    require(_amount > 0);
    Redeemable storage redeem = redeemable[_id];
    redeem.owners[_receiver] = redeem.owners[_receiver].add(_amount);
    emit RedeemableObtained(msg.sender, _id, 0, _amount);
  }
}
