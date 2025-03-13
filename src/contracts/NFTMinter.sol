// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract NFTMinter {
    mapping(address => uint256) private _tokenCount;
    mapping(uint256 => address) private _tokenOwners;
    mapping(uint256 => string) private _tokenURIs;
    
    event NFTMinted(address indexed owner, uint256 tokenId);
    event Transfer(address indexed from, address indexed to, uint256 tokenId);
    
    function mint() public {
        uint256 tokenId = _tokenCount[msg.sender];
        _tokenCount[msg.sender] += 1;
        _tokenOwners[tokenId] = msg.sender;
        
        emit NFTMinted(msg.sender, tokenId);
        emit Transfer(address(0), msg.sender, tokenId);
    }
    
    function ownerOf(uint256 tokenId) public view returns (address) {
        address owner = _tokenOwners[tokenId];
        require(owner != address(0), "Token does not exist");
        return owner;
    }
    
    function getTokenCount(address owner) public view returns (uint256) {
        return _tokenCount[owner];
    }
    
    function setTokenURI(uint256 tokenId, string memory uri) public {
        require(_tokenOwners[tokenId] == msg.sender, "Not token owner");
        _tokenURIs[tokenId] = uri;
    }
    
    function tokenURI(uint256 tokenId) public view returns (string memory) {
        require(_tokenOwners[tokenId] != address(0), "Token does not exist");
        return _tokenURIs[tokenId];
    }
}