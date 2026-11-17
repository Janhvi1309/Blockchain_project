
import { useCallback, useEffect, useState } from "react";
import { getContract, CONTRACT_ADDRESS } from "./contract";
import { lookupTAC } from "./tacLookup";
import ProductQR from "./ProductQR";
import "./App.css";

const ROLE_NAMES = {
  0: "Unassigned",
  1: "Manufacturer",
  2: "Supplier",
  3: "Retailer",
  4: "Consumer"
};

function shortenAddress(address) {
  if (!address) return "Not available";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [role, setRole] = useState(0);
  const [admin, setAdmin] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Role assignment
  const [roleAddress, setRoleAddress] = useState("");
  const [selectedRole, setSelectedRole] = useState("1");

  // Smartphone registration
  const [imei, setImei] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [registeredPhoneId, setRegisteredPhoneId] = useState("");

  // TAC lookup
  const [tacResult, setTacResult] = useState(null);
  const [tacLoading, setTacLoading] = useState(false);

  // IMEI verification
  const [verifyIMEI, setVerifyIMEI] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);

  // Ownership transfer using IMEI
  const [transferIMEI, setTransferIMEI] = useState("");
  const [newOwner, setNewOwner] = useState("");

  // Ownership history using IMEI
  const [historyIMEI, setHistoryIMEI] = useState("");
  const [history, setHistory] = useState([]);

  // QR lookup
  const [qrPhoneId, setQrPhoneId] = useState("");
  const [qrDetails, setQrDetails] = useState(null);

  const isAdmin =
    account &&
    admin &&
    account.toLowerCase() === admin.toLowerCase();

  const refreshWallet = useCallback(async () => {
    try {
      if (!window.ethereum) return;

      const accounts = await window.ethereum.request({
        method: "eth_accounts"
      });

      if (!accounts.length) {
        setAccount("");
        setContract(null);
        setRole(0);
        setAdmin("");
        return;
      }

      const walletContract = await getContract(true);

      const [walletRole, contractAdmin] = await Promise.all([
        walletContract.roles(accounts[0]),
        walletContract.admin()
      ]);

      setAccount(accounts[0]);
      setContract(walletContract);
      setRole(Number(walletRole));
      setAdmin(contractAdmin);
    } catch (err) {
      setError(err.message || "Unable to connect wallet.");
    }
  }, []);

  useEffect(() => {
    refreshWallet();

    if (!window.ethereum) return;

    const handleAccountsChanged = () => {
      setMessage("");
      setError("");
      refreshWallet();
    };

    const handleChainChanged = () => window.location.reload();

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener(
        "accountsChanged",
        handleAccountsChanged
      );

      window.ethereum.removeListener(
        "chainChanged",
        handleChainChanged
      );
    };
  }, [refreshWallet]);

  async function runAction(action, successMessage) {
    setBusy(true);
    setMessage("");
    setError("");

    try {
      await action();

      if (successMessage) {
        setMessage(successMessage);
      }
    } catch (err) {
      console.error(err);

      setError(
        err.shortMessage ||
        err.reason ||
        err.message ||
        "Operation failed."
      );
    } finally {
      setBusy(false);
    }
  }

  // Connect MetaMask
  async function handleConnectWallet() {
    await runAction(async () => {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask.");
      }

      await window.ethereum.request({
        method: "eth_requestAccounts"
      });

      const walletContract = await getContract(true);
      const signer = await walletContract.runner.getAddress();

      const [walletRole, contractAdmin] = await Promise.all([
        walletContract.roles(signer),
        walletContract.admin()
      ]);

      setAccount(signer);
      setContract(walletContract);
      setRole(Number(walletRole));
      setAdmin(contractAdmin);
    }, "Wallet connected successfully.");
  }

  // Assign roles
  async function handleAssignRole(event) {
    event.preventDefault();

    if (!/^0x[a-fA-F0-9]{40}$/.test(roleAddress.trim())) {
      setError("Enter a valid wallet address.");
      return;
    }

    await runAction(async () => {
      if (!contract || !isAdmin) {
        throw new Error("Connect your admin wallet first.");
      }

      const tx = await contract.assignRole(
        roleAddress.trim(),
        Number(selectedRole)
      );

      await tx.wait();

      setRoleAddress("");
    }, "Role assigned successfully.");
  }

  // Automatic TAC lookup when IMEI is entered
  async function handleIMEIChange(value) {
    const cleanValue = value.replace(/\D/g, "").slice(0, 15);

    setImei(cleanValue);
    setTacResult(null);
    setBrand("");
    setModel("");
    setError("");

    if (!/^\d{15}$/.test(cleanValue)) {
      setTacLoading(false);
      return;
    }

    setTacLoading(true);

    try {
      const result = await lookupTAC(cleanValue);

      setTacResult(result);

      if (result.found) {
        setBrand(result.brand || "");
        setModel(result.model || "");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "TAC lookup failed.");
    } finally {
      setTacLoading(false);
    }
  }

  // Register smartphone
  async function handleRegisterSmartphone(event) {
    event.preventDefault();

    if (
      !imei.trim() ||
      !brand.trim() ||
      !model.trim() ||
      !manufacturer.trim()
    ) {
      setError("Please fill in all smartphone details.");
      return;
    }

    await runAction(async () => {
      if (!contract) {
        throw new Error("Connect your wallet first.");
      }

      if (role !== 1) {
        throw new Error("Only Manufacturers can register smartphones.");
      }

      const valid = await contract.isValidIMEI(imei.trim());

      if (!valid) {
        throw new Error("Invalid IMEI. Enter a valid 15-digit IMEI.");
      }

      const result = await contract.verifyIMEI(imei.trim());

      if (result.registered) {
        throw new Error("This IMEI is already registered.");
      }

      const tx = await contract.registerSmartphone(
        imei.trim(),
        brand.trim(),
        model.trim(),
        manufacturer.trim()
      );

      await tx.wait();

      const verification = await contract.verifyIMEI(imei.trim());

      setRegisteredPhoneId(verification.phoneId.toString());

      setImei("");
      setBrand("");
      setModel("");
      setManufacturer("");
      setTacResult(null);
    }, "Smartphone registered successfully.");
  }

  // Verify IMEI
  async function handleVerifyIMEI(event) {
    event.preventDefault();

    await runAction(async () => {
      const readContract = await getContract(false);
      const enteredIMEI = verifyIMEI.trim();

      const result = await readContract.verifyIMEI(enteredIMEI);

      if (!result.validFormat) {
        setVerificationResult({ status: "invalid" });
        return;
      }

      if (!result.registered) {
        setVerificationResult({ status: "notRegistered" });
        return;
      }

      const details = await readContract.getSmartphoneByIMEI(
        enteredIMEI
      );

      setVerificationResult({
        status: "registered",
        id: details.id.toString(),
        brand: details.brand,
        model: details.model,
        manufacturer: details.manufacturer,
        currentOwner: details.currentOwner,
        registeredAt: details.registeredAt.toString()
      });
    }, "IMEI verification completed.");
  }

  // Transfer ownership using IMEI
  async function handleTransferOwnership(event) {
    event.preventDefault();

    if (!/^0x[a-fA-F0-9]{40}$/.test(newOwner.trim())) {
      setError("Enter a valid new-owner wallet address.");
      return;
    }

    await runAction(async () => {
      if (!contract) {
        throw new Error("Connect your wallet first.");
      }

      if (![1, 2, 3].includes(role)) {
        throw new Error("Your role cannot transfer ownership.");
      }

      const enteredIMEI = transferIMEI.trim();

      const valid = await contract.isValidIMEI(enteredIMEI);

      if (!valid) {
        throw new Error("Invalid IMEI number.");
      }

      const result = await contract.verifyIMEI(enteredIMEI);

      if (!result.registered) {
        throw new Error("This IMEI is not registered.");
      }

      const tx = await contract.transferOwnership(
        result.phoneId,
        newOwner.trim()
      );

      await tx.wait();

      setNewOwner("");
      setTransferIMEI("");
    }, "Smartphone ownership transferred successfully.");
  }

  // Ownership history using IMEI
  async function handleLoadHistory(event) {
    event.preventDefault();

    await runAction(async () => {
      const enteredIMEI = historyIMEI.trim();
      const readContract = await getContract(false);

      const result = await readContract.verifyIMEI(enteredIMEI);

      if (!result.validFormat) {
        throw new Error("Invalid IMEI number.");
      }

      if (!result.registered) {
        throw new Error("This IMEI is not registered.");
      }

      const phoneId = result.phoneId;

      const count = Number(
        await readContract.getTransferCount(phoneId)
      );

      const records = await Promise.all(
        Array.from({ length: count }, async (_, index) => {
          const record = await readContract.getTransferRecord(
            phoneId,
            index
          );

          return {
            previousOwner: record.previousOwner,
            newOwner: record.newOwner,
            timestamp: record.timestamp.toString()
          };
        })
      );

      setHistory(records);
    }, "Ownership history loaded successfully.");
  }

  // QR lookup
  async function handleQRLookup(event) {
    event.preventDefault();

    await runAction(async () => {
      const id = qrPhoneId.trim();

      if (!/^\d+$/.test(id)) {
        throw new Error("Enter a valid smartphone ID.");
      }

      const readContract = await getContract(false);
      const details = await readContract.getSmartphoneById(id);

      setQrDetails({
        id: details.id.toString(),
        brand: details.brand,
        model: details.model,
        manufacturer: details.manufacturer,
        currentOwner: details.currentOwner
      });
    }, "Smartphone found. QR code is ready.");
  }

  return (
    <main className="app">

      <header className="app-header">
        <h1>Smartphone Authenticity & Traceability</h1>

        <p>
          Verify smartphones using IMEI and track ownership
          history on the Ethereum Sepolia blockchain.
        </p>

        <button onClick={handleConnectWallet} disabled={busy}>
          {account ? "Wallet Connected" : "Connect MetaMask"}
        </button>

        {account && (
          <div className="wallet-info">
            <p><strong>Account:</strong> {shortenAddress(account)}</p>
            <p><strong>Role:</strong> {ROLE_NAMES[role]}</p>
          </div>
        )}
      </header>

      {message && (
        <div className="result success-message">
          {message}
        </div>
      )}

      {error && (
        <div className="result error-message">
          {error}
        </div>
      )}

      {/* ADMIN ROLE ASSIGNMENT */}
      {account && isAdmin && (
        <section className="card">
          <h2>Admin: Assign Roles</h2>

          <form onSubmit={handleAssignRole}>
            <label>Wallet Address</label>

            <input
              value={roleAddress}
              onChange={(e) => setRoleAddress(e.target.value)}
              placeholder="0x..."
              required
            />

            <label>Select Role</label>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="1">Manufacturer</option>
              <option value="2">Supplier</option>
              <option value="3">Retailer</option>
              <option value="4">Consumer</option>
            </select>

            <button disabled={busy}>Assign Role</button>
          </form>
        </section>
      )}

      {/* SMARTPHONE REGISTRATION */}
      {account && role === 1 && (
        <section className="card">
          <h2>Register New Smartphone</h2>

          <form onSubmit={handleRegisterSmartphone}>
            <label>IMEI Number (15 digits)</label>

            <input
              value={imei}
              onChange={(e) => handleIMEIChange(e.target.value)}
              placeholder="Enter 15-digit IMEI"
              maxLength="15"
              inputMode="numeric"
              required
            />

            {tacLoading && (
              <p>Identifying smartphone using TAC database...</p>
            )}

            {tacResult?.found && (
              <div className="result success-message">
                <h3>Device Identified</h3>
                <p><strong>TAC:</strong> {tacResult.tac}</p>
                <p><strong>Detected Brand:</strong> {tacResult.brand}</p>
                <p><strong>Detected Model:</strong> {tacResult.model}</p>
                <p>Brand and model have been filled automatically.</p>
              </div>
            )}

            {tacResult && !tacResult.found && (
              <div className="result">
                <p>
                  TAC not found in the local database.
                  Please enter the brand and model manually.
                </p>
              </div>
            )}

            <label>Brand</label>

            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Automatically detected or enter manually"
              required
            />

            <label>Model</label>

            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Automatically detected or enter manually"
              required
            />

            <label>Manufacturer</label>

            <input
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="e.g. Samsung Electronics"
              required
            />

            <button disabled={busy || tacLoading}>
              Register Smartphone
            </button>
          </form>

          {registeredPhoneId && (
            <div className="result success-message">
              <h3>Smartphone Registered Successfully</h3>
              <p>Smartphone ID: {registeredPhoneId}</p>
            </div>
          )}
        </section>
      )}

      {/* IMEI VERIFICATION */}
      <section className="card">
        <h2>Verify Smartphone Using IMEI</h2>

        <p>
          Enter the 15-digit IMEI to check its format and
          registration status on the blockchain.
        </p>

        <form onSubmit={handleVerifyIMEI}>
          <label>IMEI Number</label>

          <input
            value={verifyIMEI}
            onChange={(e) => setVerifyIMEI(e.target.value)}
            placeholder="Enter 15-digit IMEI"
            maxLength="15"
            inputMode="numeric"
            required
          />

          <button disabled={busy}>Verify IMEI</button>
        </form>

        {verificationResult && (
          <div className="result">
            {verificationResult.status === "invalid" && (
              <>
                <h3>Invalid IMEI</h3>
                <p>The entered IMEI is not valid.</p>
              </>
            )}

            {verificationResult.status === "notRegistered" && (
              <>
                <h3>Smartphone Not Registered</h3>
                <p>
                  This IMEI was not found in our blockchain registry.
                </p>
              </>
            )}

            {verificationResult.status === "registered" && (
              <>
                <h3>Smartphone Registered</h3>

                <p><strong>Smartphone ID:</strong> {verificationResult.id}</p>
                <p><strong>Brand:</strong> {verificationResult.brand}</p>
                <p><strong>Model:</strong> {verificationResult.model}</p>
                <p><strong>Manufacturer:</strong> {verificationResult.manufacturer}</p>
                <p><strong>Current Owner:</strong> {verificationResult.currentOwner}</p>

                <p>
                  <strong>Registered At:</strong>{" "}
                  {new Date(
                    Number(verificationResult.registeredAt) * 1000
                  ).toLocaleString()}
                </p>
              </>
            )}
          </div>
        )}
      </section>

      {/* TRANSFER OWNERSHIP USING IMEI */}
      {account && [1, 2, 3].includes(role) && (
        <section className="card">
          <h2>Transfer Smartphone Ownership</h2>

          <form onSubmit={handleTransferOwnership}>
            <label>Smartphone IMEI Number</label>

            <input
              value={transferIMEI}
              onChange={(e) => setTransferIMEI(e.target.value)}
              placeholder="Enter 15-digit IMEI"
              maxLength="15"
              inputMode="numeric"
              required
            />

            <label>Next Owner Wallet Address</label>

            <input
              value={newOwner}
              onChange={(e) => setNewOwner(e.target.value)}
              placeholder="0x..."
              required
            />

            <button disabled={busy}>
              Transfer Smartphone Ownership
            </button>
          </form>
        </section>
      )}

      {/* QR CODE LOOKUP */}
      <section className="card">
        <h2>Smartphone QR Code Lookup</h2>

        <form onSubmit={handleQRLookup}>
          <label>Smartphone ID</label>

          <input
            value={qrPhoneId}
            onChange={(e) => setQrPhoneId(e.target.value)}
            placeholder="Enter smartphone ID"
            required
          />

          <button disabled={busy}>
            Find Smartphone & Generate QR
          </button>
        </form>

        {qrDetails && (
          <div className="result">
            <h3>Smartphone Details</h3>

            <p><strong>ID:</strong> {qrDetails.id}</p>
            <p><strong>Brand:</strong> {qrDetails.brand}</p>
            <p><strong>Model:</strong> {qrDetails.model}</p>
            <p><strong>Manufacturer:</strong> {qrDetails.manufacturer}</p>
            <p>
              <strong>Current Owner:</strong>{" "}
              {shortenAddress(qrDetails.currentOwner)}
            </p>

            <ProductQR productId={qrDetails.id} />
          </div>
        )}
      </section>

      {/* OWNERSHIP HISTORY USING IMEI */}
      <section className="card">
        <h2>Ownership History</h2>

        <form onSubmit={handleLoadHistory}>
          <label>Smartphone IMEI Number</label>

          <input
            value={historyIMEI}
            onChange={(e) => setHistoryIMEI(e.target.value)}
            placeholder="Enter 15-digit IMEI"
            maxLength="15"
            inputMode="numeric"
            required
          />

          <button disabled={busy}>
            View Ownership History
          </button>
        </form>

        {history.map((record, index) => (
          <div className="history-item" key={index}>
            <h3>Record {index + 1}</h3>

            <p>
              <strong>Previous Owner:</strong>{" "}
              {record.previousOwner ===
              "0x0000000000000000000000000000000000000000"
                ? "Initial Registration"
                : record.previousOwner}
            </p>

            <p>
              <strong>New Owner:</strong> {record.newOwner}
            </p>

            <p>
              <strong>Timestamp:</strong>{" "}
              {new Date(
                Number(record.timestamp) * 1000
              ).toLocaleString()}
            </p>
          </div>
        ))}
      </section>

      <footer className="app-footer">
        <p>Network: Ethereum Sepolia Testnet</p>

        <p>Contract: {shortenAddress(CONTRACT_ADDRESS)}</p>

        <p>
          <a
            href={`https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
          >
            View Smart Contract on Etherscan
          </a>
        </p>
      </footer>

    </main>
  );
}

export default App;
