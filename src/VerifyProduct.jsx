
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getContract } from "./contract";

function VerifyProduct() {
  const { productId } = useParams();

  const [phone, setPhone] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSmartphone() {
      try {
        setLoading(true);
        setError("");

        const contract = await getContract(false);

        const details = await contract.getSmartphoneById(productId);

        setPhone({
          id: details.id.toString(),
          brand: details.brand,
          model: details.model,
          manufacturer: details.manufacturer,
          currentOwner: details.currentOwner,
          registeredAt: details.registeredAt.toString()
        });

        const count = Number(
          await contract.getTransferCount(productId)
        );

        const records = await Promise.all(
          Array.from({ length: count }, async (_, index) => {
            const record = await contract.getTransferRecord(
              productId,
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
      } catch (err) {
        console.error("Smartphone verification error:", err);
        setPhone(null);
        setHistory([]);
        setError(
          "Smartphone not found in the blockchain registry."
        );
      } finally {
        setLoading(false);
      }
    }

    if (productId && /^\d+$/.test(productId)) {
      loadSmartphone();
    } else {
      setError("Invalid smartphone ID.");
      setLoading(false);
    }
  }, [productId]);

  if (loading) {
    return (
      <main className="app">
        <h2>Verifying smartphone...</h2>
      </main>
    );
  }

  if (error) {
    return (
      <main className="app">
        <header className="app-header">
          <h1>Smartphone Verification</h1>
        </header>

        <div className="result error-message">
          <h2>Verification Failed</h2>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>Smartphone Verification</h1>
        <p>
          Blockchain-based smartphone authenticity
          verification and ownership traceability.
        </p>
      </header>

      <section className="card">
        <h2>Smartphone Registered</h2>

        <div className="result success-message">
          <h3>Smartphone Found in Blockchain Registry</h3>
        </div>

        <p><strong>Smartphone ID:</strong> {phone.id}</p>
        <p><strong>Brand:</strong> {phone.brand}</p>
        <p><strong>Model:</strong> {phone.model}</p>
        <p><strong>Manufacturer:</strong> {phone.manufacturer}</p>
        <p><strong>Current Owner:</strong> {phone.currentOwner}</p>

        <p>
          <strong>Registration Date:</strong>{" "}
          {new Date(
            Number(phone.registeredAt) * 1000
          ).toLocaleString()}
        </p>
      </section>

      <section className="card">
        <h2>Ownership History</h2>

        {history.length === 0 ? (
          <p>No ownership records found.</p>
        ) : (
          history.map((record, index) => (
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
                <strong>New Owner:</strong>{" "}
                {record.newOwner}
              </p>

              <p>
                <strong>Date:</strong>{" "}
                {new Date(
                  Number(record.timestamp) * 1000
                ).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </section>

      <footer className="app-footer">
        <p>Verified using Ethereum Sepolia blockchain.</p>
      </footer>
    </main>
  );
}

export default VerifyProduct;
