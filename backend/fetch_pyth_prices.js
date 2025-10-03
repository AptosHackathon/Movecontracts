// Fetch LQD prices directly from Pyth Hermes (no on-chain needed!)
const LQD_PRICE_FEED_ID = "e4ff71a60c3d5d5d37c1bba559c2e92745c1501ebd81a97d150cf7cd5119aa9c";

async function getLqdPrice() {
  const hermesUrl = `https://hermes.pyth.network/v2/updates/price/latest?ids[]=${LQD_PRICE_FEED_ID}`;
  
  const response = await fetch(hermesUrl);
  const data = await response.json();
  
  const priceData = data.parsed[0].price;
  
  // Convert to USD
  const price = Number(priceData.price);
  const expo = priceData.expo;
  const priceInUsd = price * Math.pow(10, expo);
  
  return {
    symbol: "LQD/USD",
    price: priceInUsd,
    priceRaw: price,
    expo: expo,
    confidence: priceData.conf,
    timestamp: new Date(priceData.publish_time * 1000).toISOString(),
    timestampUnix: priceData.publish_time
  };
}

// Example usage
getLqdPrice().then(price => {
  console.log("📊 LQD Price:");
  console.log(`   Price: $${price.price.toFixed(2)}`);
  console.log(`   Confidence: ±$${(Number(price.confidence) * Math.pow(10, price.expo)).toFixed(2)}`);
  console.log(`   Timestamp: ${price.timestamp}`);
  console.log("");
  console.log("Full data:", JSON.stringify(price, null, 2));
});

module.exports = { getLqdPrice };

