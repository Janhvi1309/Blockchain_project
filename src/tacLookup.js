
let tacDatabase = null;

export async function lookupTAC(imei) {
  if (!/^\d{15}$/.test(imei)) {
    throw new Error("Enter a 15-digit IMEI.");
  }

  if (!tacDatabase) {
    const response = await fetch("/tacdb-clean.json");

    if (!response.ok) {
      throw new Error("Unable to load TAC database.");
    }

    tacDatabase = await response.json();
  }

  const tac = imei.substring(0, 8);

  const record = tacDatabase.find(
    (item) => item.tac === tac
  );

  if (!record) {
    return {
      found: false,
      tac
    };
  }

  return {
    found: true,
    tac,
    brand: record.brand,
    model: record.model,
    aka: record.aka || ""
  };
}
