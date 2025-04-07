const BigNumber = require("bignumber.js");
const { CHAINS_BLOCKS, contracts, trancheConfig } = require("./consts");
const {
  getDefaultProvider,
  multiCall,
  sumSingleBalance,
  getLogs,
  call,
  convertBalanceToUSDC,
  createCSVFromBatchResults,
} = require("./helpers");

async function tvl(api) {
  const {
    v1 = [],
    v3 = [],
    safe = [],
    cdos: rawCdos = [],
    wrap4626 = [],
    credits = [],
  } = contracts[api.chain];

  const cdos = [...rawCdos];

  const provider = getDefaultProvider(api.chain);

  const block = await provider.getBlock(api.blockNumber || "latest");

  // console.log({ blockNumber: api.blockNumber, timestamp: block.timestamp });

  const balances = {};

  const [
    totalSupplyV1,
    totalSupplyV3,
    totalSupplySafe,
    tokenPriceV1,
    tokenPriceV3,
    tokenPriceSafe,
    tokenV1,
    tokenV3,
    tokenSafe,
  ] = await Promise.all([
    multiCall({ api, abi: "uint256:totalSupply", calls: v1 }),
    multiCall({ api, abi: "uint256:totalSupply", calls: v3 }),
    multiCall({ api, abi: "uint256:totalSupply", calls: safe }),
    multiCall({ api, abi: "uint256:tokenPrice", calls: v1 }),
    multiCall({ api, abi: "uint256:tokenPrice", calls: v3 }),
    multiCall({ api, abi: "uint256:tokenPrice", calls: safe }),
    multiCall({ api, abi: "address:token", calls: v1 }),
    multiCall({ api, abi: "address:token", calls: v3 }),
    multiCall({ api, abi: "address:token", calls: safe }),
  ]);

  totalSupplyV1.map((supply, i) => {
    const token = tokenV1[i];
    const tokenPrice = tokenPriceV1[i];
    const vaultTVL = BigNumber(supply).times(tokenPrice).div(1e18).toFixed(0);
    sumSingleBalance(balances, token, vaultTVL, api.chain);
  });

  totalSupplyV3.map((supply, i) => {
    const token = tokenV3[i];
    const tokenPrice = tokenPriceV3[i];
    const vaultTVL = BigNumber(supply).times(tokenPrice).div(1e18).toFixed(0);
    sumSingleBalance(balances, token, vaultTVL, api.chain);
  });

  totalSupplySafe.map((supply, i) => {
    const token = tokenSafe[i];
    const tokenPrice = tokenPriceSafe[i];
    const vaultTVL = BigNumber(supply).times(tokenPrice).div(1e18).toFixed(0);
    sumSingleBalance(balances, token, vaultTVL, api.chain);
  });

  const { factory, fromBlock } = trancheConfig[api.chain] ?? {};
  if (factory) {
    const logs = await getLogs({
      api,
      target: factory,
      topics: [
        "0xcfed305fd6d1aebca7d8ef4978868c2fe10910ee8dd94c3be048a9591f37429f",
      ],
      eventAbi: "event CDODeployed(address proxy)",
      onlyArgs: true,
      fromBlock,
    });

    cdos.push(...logs.map((i) => i.proxy));
  }

  const [wrap4626Supplies, wrap4626Tokens] = await Promise.all(
    ["uint256:totalSupply", "address:token"].map((abi) =>
      multiCall({ api, abi, calls: wrap4626 })
    )
  );

  const wrap6426Assets = await Promise.all(
    wrap4626Supplies.map((supply, i) =>
      call({
        api,
        abi: "function convertToAssets(uint256 shares) external view returns (uint256 assets)",
        target: wrap4626[i],
        params: [supply],
      })
    )
  );

  wrap6426Assets.map((value, i) =>
    sumSingleBalance(balances, wrap4626Tokens[i], value, api.chain)
  );

  const [cdoToken, aatrances, bbtrances, aaprices, bbprices] =
    await Promise.all(
      [
        "address:token",
        "address:AATranche",
        "address:BBTranche",
        "uint256:priceAA",
        "uint256:priceBB",
      ].map((abi) => multiCall({ api, abi, calls: cdos }))
    );

  const [creditsStrategies, creditsTokens] = await Promise.all(
    ["address:strategy", "address:token"].map((abi) =>
      multiCall({ api, abi, calls: credits })
    )
  );

  // Load tokens decimals
  const callsDecimals = [
    ...cdoToken,
    ...creditsTokens,
    ...tokenV1,
    ...tokenV3,
    ...tokenSafe,
  ];

  const decimalsResults = await multiCall({
    api,
    abi: "uint8:decimals",
    calls: callsDecimals,
  });

  const tokensDecimals = decimalsResults.reduce(
    (tokensDecimals, decimals, i) => {
      const target = callsDecimals[i];
      tokensDecimals[target] = Number(decimals);
      return tokensDecimals;
    },
    {}
  );

  // Get CDOs contract values
  const [contractValue, pendingWithdraws, pendingInstantWithdraws] =
    await Promise.all([
      multiCall({ api, abi: "uint256:getContractValue", calls: cdos }),
      multiCall({
        api,
        abi: "uint256:pendingWithdraws",
        calls: creditsStrategies,
      }),
      multiCall({
        api,
        abi: "uint256:pendingInstantWithdraws",
        calls: creditsStrategies,
      }),
    ]);

  // Count pending withdraws
  pendingWithdraws.map((amount, i) =>
    sumSingleBalance(balances, creditsTokens[i], amount, api.chain)
  );
  pendingInstantWithdraws.map((amount, i) =>
    sumSingleBalance(balances, creditsTokens[i], amount, api.chain)
  );

  cdoToken.forEach((token, i) => {
    // Get CDOs underlying tokens balances
    sumSingleBalance(balances, token, contractValue[i], api.chain);
  });

  const balancesUSD = await Promise.all(
    Object.entries(balances).map(([token, balance]) => {
      const decimals = tokensDecimals[token] || 18;
      return convertBalanceToUSDC(api, token, balance, decimals).then(
        (USD) => ({
          token,
          decimals,
          balance,
          USD,
          price: BigNumber(USD)
            .div(BigNumber(balance).div(`1e${decimals}`))
            .toString(),
        })
      );
    })
  );

  const TVL = balancesUSD.reduce(
    (acc, d) => BigNumber(acc).plus(d.USD),
    BigNumber(0)
  );

  return {
    blockNumber: api.blockNumber,
    timestamp: block.timestamp,
    TVL: TVL.toString(),
    balancesUSD,
  };
}

async function main() {
  // Find max number of batches needed across all chains
  const maxBatches = Math.max(
    ...Object.values(CHAINS_BLOCKS).map(({ start, end, interval }) =>
      Math.floor((end - start) / interval)
    )
  );

  const batchResults = {};

  for (let i = 0; i <= maxBatches; i++) {
    const batch = {};

    const calls = await Promise.all(
      Object.entries(CHAINS_BLOCKS).map(
        async ([chain, { start, interval }]) => {
          const blockNumber = start + i * interval;
          // if (blockNumber > end) return [chain, null]; // Skip if block is past range

          try {
            const result = await tvl({ chain, blockNumber });
            console.log(i, chain, blockNumber, result.TVL);
            return [chain, result];
          } catch (err) {
            console.error(
              `Error fetching TVL for ${chain} at block ${blockNumber}`,
              err
            );
            return [
              chain,
              {
                blockNumber,
                timestamp: 0,
                TVL: 0,
                balancesUSD: [],
              },
            ];
          }
        }
      )
    );

    for (const [chain, result] of calls) {
      if (result !== null) {
        batch[chain] = result;
      }
    }

    batchResults[i] = batch;
  }

  createCSVFromBatchResults(batchResults);
}

main();
