pragma solidity 0.4.24;


contract YummyAccessControl {

  event Pause();
  event Unpause();

  address public ceoAddress;
  address public cfoAddress;
  address public cooAddress;

  bool public paused = false;

  constructor() public {
    ceoAddress = msg.sender;
  }

  modifier onlyCEO() {
    require(msg.sender == ceoAddress);
    _;
  }

  modifier onlyCFO() {
    require(msg.sender == cfoAddress);
    _;
  }

  modifier onlyCOO() {
    require(msg.sender == cooAddress);
    _;
  }

  modifier onlyCLevel() {
    require(
      msg.sender == ceoAddress || msg.sender == cfoAddress || msg.sender == cooAddress
    );
    _;
  }

  modifier whenNotPaused() {
    require(!paused);
    _;
  }

  modifier whenPaused {
    require(paused);
    _;
  }

  function setCEO(address _newCEO) external onlyCEO {
    require(_newCEO != address(0));
    ceoAddress = _newCEO;
  }

  function setCFO(address _newCFO) external onlyCEO {
    require(_newCFO != address(0));
    cfoAddress = _newCFO;
  }

  function setCOO(address _newCOO) external onlyCEO {
    require(_newCOO != address(0));
    cooAddress = _newCOO;
  }

  function pause() external onlyCLevel whenNotPaused {
    paused = true;
    emit Pause();
  }

  function unpause() public onlyCEO whenPaused {
    paused = false;
    emit Unpause();
  }
}
