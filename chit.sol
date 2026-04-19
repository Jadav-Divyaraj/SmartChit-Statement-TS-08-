// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VanAdhikarLedger {
    struct Family {
        address wallet;
        string name;
        string village;
        uint256 entitled;
        uint256 received;
        bool exists;
        uint256 enrolledAt;
    }
    
    struct Payment {
        uint256 amount;
        uint256 timestamp;
        address officer;
        uint256 season;
    }
    
    mapping(address => Family) public families;
    mapping(address => Payment[]) public paymentHistory;
    address[] public familyList;
    address public owner;
    uint256 public currentSeason;
    
    event FamilyEnrolled(address indexed wallet, string name, string village);
    event EntitlementSet(address indexed wallet, uint256 amount);
    event PaymentMade(address indexed wallet, uint256 amount, address indexed officer, uint256 timestamp);
    
    constructor() {
        owner = msg.sender;
        currentSeason = 1;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    function enrollFamily(address _wallet, string memory _name, string memory _village) public {
        require(!families[_wallet].exists, "Already enrolled");
        families[_wallet] = Family(_wallet, _name, _village, 0, 0, true, block.timestamp);
        familyList.push(_wallet);
        emit FamilyEnrolled(_wallet, _name, _village);
    }
    
    function setEntitlement(address _wallet, uint256 _amount) public onlyOwner {
        require(families[_wallet].exists, "Family not found");
        families[_wallet].entitled = _amount;
        emit EntitlementSet(_wallet, _amount);
    }
    
    function makePayment(address _wallet, uint256 _amount) public payable {
        require(families[_wallet].exists, "Family not found");
        require(msg.value == _amount, "Send exact amount");
        
        families[_wallet].received += _amount;
        paymentHistory[_wallet].push(Payment({
            amount: _amount,
            timestamp: block.timestamp,
            officer: msg.sender,
            season: currentSeason
        }));
        
        emit PaymentMade(_wallet, _amount, msg.sender, block.timestamp);
    }
    
    function getFamilyDetails(address _wallet) public view returns (
        string memory name,
        string memory village,
        uint256 entitled,
        uint256 received,
        uint256 shortfall,
        bool exists,
        bool hasUnderpayment
    ) {
        Family memory f = families[_wallet];
        entitled = f.entitled;
        received = f.received;
        shortfall = entitled > received ? entitled - received : 0;
        hasUnderpayment = shortfall > 0;
        return (f.name, f.village, entitled, received, shortfall, f.exists, hasUnderpayment);
    }
    
    function getPaymentHistory(address _wallet) public view returns (
        uint256[] memory amounts,
        uint256[] memory timestamps,
        address[] memory officers,
        uint256[] memory seasons
    ) {
        uint256 len = paymentHistory[_wallet].length;
        amounts = new uint256[](len);
        timestamps = new uint256[](len);
        officers = new address[](len);
        seasons = new uint256[](len);
        
        for(uint i = 0; i < len; i++) {
            amounts[i] = paymentHistory[_wallet][i].amount;
            timestamps[i] = paymentHistory[_wallet][i].timestamp;
            officers[i] = paymentHistory[_wallet][i].officer;
            seasons[i] = paymentHistory[_wallet][i].season;
        }
        return (amounts, timestamps, officers, seasons);
    }
    
    function getFamilies() public view returns (address[] memory) {
        return familyList;
    }
    
    function getUnderpayments() public view returns (address[] memory, uint256[] memory) {
        uint256 count = 0;
        for(uint i = 0; i < familyList.length; i++) {
            if(families[familyList[i]].received < families[familyList[i]].entitled) {
                count++;
            }
        }
        
        address[] memory wallets = new address[](count);
        uint256[] memory shortfalls = new uint256[](count);
        
        uint256 idx = 0;
        for(uint i = 0; i < familyList.length; i++) {
            if(families[familyList[i]].received < families[familyList[i]].entitled) {
                wallets[idx] = familyList[i];
                shortfalls[idx] = families[familyList[i]].entitled - families[familyList[i]].received;
                idx++;
            }
        }
        return (wallets, shortfalls);
    }
    
    function getCurrentSeason() public view returns (uint256) {
        return currentSeason;
    }
    
    function getAllDisputes() public pure returns (uint256[] memory, string[] memory, address[] memory) {
        uint256[] memory ids = new uint256[](0);
        string[] memory statuses = new string[](0);
        address[] memory families = new address[](0);
        return (ids, statuses, families);
    }
}