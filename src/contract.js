
import { ethers } from "ethers";

export const CONTRACT_ADDRESS =
  "0xe00123179F4ce1Ea618C2D306Ccb8C4A225b8111";

export const ABI = [
  "function admin() view returns (address)",
  "function roles(address) view returns (uint8)",
  "function assignRole(address user, uint8 role)",
  "function isValidIMEI(string imei) pure returns (bool)",
  "function registerSmartphone(string imei, string brand, string model, string manufacturer) returns (uint256)",
  "function transferOwnership(uint256 phoneId, address newOwner)",
  "function verifyIMEI(string imei) view returns (bool validFormat, bool registered, uint256 phoneId)",
  "function getSmartphoneByIMEI(string imei) view returns (uint256 id, string brand, string model, string manufacturer, address currentOwner, uint256 registeredAt)",
  "function getSmartphoneById(uint256 phoneId) view returns (uint256 id, string brand, string model, string manufacturer, address currentOwner, uint256 registeredAt)",
  "function getTransferCount(uint256 phoneId) view returns (uint256)",
  "function getTransferRecord(uint256 phoneId, uint256 index) view returns (address previousOwner, address newOwner, uint256 timestamp)",
  "event SmartphoneRegistered(uint256 indexed phoneId, bytes32 indexed imeiHash, address indexed manufacturer)",
  "event OwnershipTransferred(uint256 indexed phoneId, address previousOwner, address newOwner)"
];

export const getContract = async (withSigner = false) => {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  if (withSigner) {
    const signer = await provider.getSigner();
    return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
  }

  return new ethers.Contract(CONTRACT_ADDRESS, ABI, provider);
};
