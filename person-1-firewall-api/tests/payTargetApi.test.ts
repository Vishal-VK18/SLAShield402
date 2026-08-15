async function testLiveApi() {
  console.log("--- LIVE TEST 1: Sending Valid Request ---");
  const res1 = await fetch("http://localhost:3000/shield/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target_api: "weather.example/v1/current",
      provider_address: "0xValidProvider",
      offer_price: 0.02,
      agent_budget_left: 1.00,
      sla_rules: { max_freshness_sec: 60, format: "JSON" }
    }),
  });
  console.log(await res1.json());

  console.log("\n--- LIVE TEST 2: Sending Over-Budget Request ---");
  const res2 = await fetch("http://localhost:3000/shield/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      target_api: "weather.example/v1/current",
      provider_address: "0xValidProvider",
      offer_price: 5.00,
      agent_budget_left: 1.00,
    }),
  });
  console.log(await res2.json());
}

testLiveApi();