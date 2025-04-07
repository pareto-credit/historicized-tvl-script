const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const BigNumber = require("bignumber.js");
const {
  UNISWAP_V3_QUOTER,
  QUOTER_ABI,
  UNISWAWP_PAIRS,
  MULTICALL_ADDR,
  UNISWAP_V2_ROUTER,
  UNISWAP_V2_ABI,
} = require("./consts");

require("dotenv").config();
const ALCHEMY_KEY = process.env.ALCHEMY_KEY;

/**
 * Get ethers provider by chain
 * @param {*} chain
 * @returns
 */
function getDefaultProvider(chain) {
  const urls = {
    ethereum: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    polygon: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    polygon_zkevm: `https://polygonzkevm-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    optimism: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  };

  if (!urls[chain])
    throw new Error(`RPC URL non disponibile per la chain: ${chain}`);
  return new ethers.JsonRpcProvider(urls[chain]);
}

function createCSVFromBatchResults(batchResults, outputPath = "./tvls.csv") {
  const batches = Object.entries(batchResults).sort(
    (a, b) => Number(a[0]) - Number(b[0])
  );

  // Estrai l'elenco di tutte le chain presenti
  const allChains = new Set();
  batches.forEach(([_, batch]) => {
    Object.keys(batch).forEach((chain) => allChains.add(chain));
  });
  const chainList = Array.from(allChains).sort();

  // Prepara intestazione
  const header = ["date", ...chainList, "TOTAL"];
  const rows = [header.join(",")];

  // Genera ogni riga
  for (const [_, batch] of batches) {
    let timestamp;
    const tvlByChain = {};
    let totalTVL = BigNumber(0);

    for (const chain of chainList) {
      const data = batch[chain];
      if (data) {
        tvlByChain[chain] = data.TVL;
        totalTVL = totalTVL.plus(data.TVL);
        if (!timestamp) timestamp = data.timestamp;
      } else {
        tvlByChain[chain] = "";
      }
    }

    const date = timestamp ? new Date(timestamp * 1000).toISOString() : "";
    const row = [
      date,
      ...chainList.map((c) => tvlByChain[c]),
      totalTVL.toString(),
    ];
    rows.push(row.join(","));
  }

  // Scrivi su file CSV
  fs.writeFileSync(path.resolve(outputPath), rows.join("\n"));
  console.log(`CSV salvato in: ${outputPath}`);
}

/**
 * Convert token balance in USDC using uniswapv3
 * @param {*} api
 * @param {*} tokenAddress
 * @param {*} balance
 * @param {*} decimals
 * @returns converted balance in USDC
 */
async function convertBalanceToUSDC(
  api,
  tokenAddress,
  balance,
  decimals,
  feeTier = 3000
) {
  const provider = getDefaultProvider(api.chain);
  const quoter = new ethers.Contract(UNISWAP_V3_QUOTER, QUOTER_ABI, provider);

  const balanceBN = BigNumber(balance);
  const usdcAddress = UNISWAWP_PAIRS[api.chain].usdcAddress;

  if (tokenAddress.toLowerCase() === usdcAddress.toLowerCase()) {
    return balanceBN.div(`1e${decimals}`).toString();
  }

  const tokenConfig =
    UNISWAWP_PAIRS[api.chain].tokens?.[tokenAddress.toLowerCase()];

  if (tokenConfig?.version === "v2") {
    return convertBalanceToUSDC_uniV2(api, tokenAddress, balance, decimals);
  }

  feeTier = tokenConfig?.fee || 3000;

  const sqrtPriceLimitX96 = 0; // 0 = no limit

  const amountIn = BigNumber(`1e${decimals}`);

  try {
    const tokenPrice = await quoter.quoteExactInputSingle.staticCall(
      tokenAddress,
      usdcAddress,
      feeTier,
      amountIn.toFixed(0),
      sqrtPriceLimitX96,
      { blockTag: api.blockNumber }
    );

    return balanceBN.div(`1e${decimals}`).times(tokenPrice).div(1e6).toString();
  } catch (err) {
    return balanceBN.div(`1e${decimals}`).toString();
  }
}

/**
 * Convert token balance in USDC using uniswapv2
 * @param {*} api
 * @param {*} tokenAddress
 * @param {*} balance
 * @param {*} decimals
 * @returns converted balance in USDC
 */
async function convertBalanceToUSDC_uniV2(
  api,
  tokenAddress,
  balance,
  decimals
) {
  const provider = getDefaultProvider(api.chain);
  const routerAddress = UNISWAP_V2_ROUTER[api.chain];
  const router = new ethers.Contract(routerAddress, UNISWAP_V2_ABI, provider);

  const balanceBN = BigNumber(balance);
  const usdcAddress = UNISWAWP_PAIRS[api.chain].usdcAddress.toLowerCase();

  if (tokenAddress.toLowerCase() === usdcAddress) {
    return balanceBN.div(`1e${decimals}`).toString();
  }

  const tokenConfig =
    UNISWAWP_PAIRS[api.chain].tokens?.[tokenAddress.toLowerCase()];

  const path = tokenConfig.path || [tokenAddress, usdcAddress];
  const amountOut = BigNumber(`1e${decimals}`).toFixed(0);

  try {
    const amounts = await router.getAmountsIn(amountOut, path, {
      blockTag: api.blockNumber,
    });

    const tokenPrice = BigNumber(amounts[0]); // tokenAmount needed for the USDC output
    const usdcValue = balanceBN.times(tokenPrice).div(amountOut).div(1e6);

    return usdcValue.toString();
  } catch (err) {
    // console.warn(`Uniswap V2 price fetch failed for ${tokenAddress}:`, err);
    return balanceBN.div(`1e${decimals}`).toString(); // Fallback to raw value
  }
}

/**
 * Execute single on-chain call
 * @param {*} param0
 * @returns decoded result
 */
async function call({ api, abi, target, params = [], rpcUrl }) {
  const iface = new ethers.Interface([abi]);
  const fragment = iface.fragments[0];
  const calldata = iface.encodeFunctionData(fragment.name, params);

  const provider = rpcUrl
    ? new ethers.JsonRpcProvider(rpcUrl)
    : getDefaultProvider(api.chain);

  const rawResult = await provider.call(
    { to: target, data: calldata },
    api.blockNumber
  );
  const decoded = iface.decodeFunctionResult(fragment.name, rawResult);

  return decoded.length === 1 ? decoded[0] : decoded;
}

/**
 * Get contract logs for factory
 * @param {*} param0
 * @returns decoded logs
 */
async function getLogs({
  api,
  target,
  topic,
  topics,
  fromBlock,
  toBlock,
  eventAbi,
  onlyArgs = false,
}) {
  if (!target) throw new Error("Missing target");
  if (!fromBlock) throw new Error("Missing fromBlock");
  // if (!toBlock) throw new Error("Missing toBlock");

  const provider = getDefaultProvider(api.chain);

  let iface;
  if (eventAbi) {
    iface = new ethers.Interface([eventAbi]);
    if (!topics?.length && topic) {
      const fragment = iface.fragments[0];
      const eventSig = `${fragment.name}(${fragment.inputs
        .map((i) => i.type)
        .join(",")})`;
      topics = [ethers.id(eventSig)];
    }
  }

  const logs = await provider.getLogs({
    address: target,
    topics,
    fromBlock,
    toBlock,
  });

  if (!eventAbi) return logs;

  return logs.map((log) => {
    const parsed = iface.parseLog(log);
    return onlyArgs
      ? parsed.args
      : {
          ...parsed,
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
          logIndex: log.logIndex,
        };
  });
}

function sumSingleBalance(balances, token, balance, chain) {
  if (typeof balance === "bigint") balance = balance.toString();

  if (typeof balance === "object") {
    if (typeof balance.toString === "function") {
      balance = balance.toString();
    } else {
      throw new Error("Invalid balance object: " + balance);
    }
  }

  if (!isValidNumber(balance)) return;

  if (typeof balance === "number" || typeof balances[token] === "number") {
    const prevBalance = balances[token] ? +balances[token] : 0;
    const newBalance = prevBalance + +balance;
    if (!isValidNumber(newBalance))
      throw new Error(`Invalid numeric merge for ${token}`);
    balances[token] = newBalance;
  } else {
    const prev = balances[token] ? BigInt(balances[token]) : 0n;
    const curr = BigInt(balance);
    balances[token] = (prev + curr).toString();
  }
}

function isValidNumber(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === "bigint") return true;
  const n = Number(val);
  return !isNaN(n);
}

// ABI parser semplificato: 'uint256:totalSupply' => ABI per ethers
function parseAbi(defillamaAbi) {
  const [type, name] = defillamaAbi.split(":");
  return [`function ${name}() view returns (${type})`];
}

/**
 * Execute multi-call
 * @param {*} param0
 * @returns decoded multicall results
 */
async function multiCall({ api, abi, calls }) {
  const parsedAbi = parseAbi(abi);
  const iface = new ethers.Interface(parsedAbi);
  const methodName = parsedAbi[0].match(/function\s+(\w+)\(/)[1];

  const provider = getDefaultProvider(api.chain);

  const encodedCalls = calls.map((address) => ({
    target: address,
    allowFailure: true,
    callData: iface.encodeFunctionData(methodName),
  }));

  const multicall3Abi = [
    {
      inputs: [
        {
          components: [
            { name: "target", type: "address" },
            { name: "allowFailure", type: "bool" },
            { name: "callData", type: "bytes" },
          ],
          name: "calls",
          type: "tuple[]",
        },
      ],
      name: "aggregate3",
      outputs: [
        {
          components: [
            { name: "success", type: "bool" },
            { name: "returnData", type: "bytes" },
          ],
          name: "returnData",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ];

  const multicall = new ethers.Contract(
    MULTICALL_ADDR,
    multicall3Abi,
    provider
  );
  const results = await multicall.aggregate3.staticCall(encodedCalls, {
    blockTag: api.blockNumber,
  });

  return results.map((res, i) =>
    res.success
      ? iface.decodeFunctionResult(methodName, res.returnData)[0]
      : null
  );
}

module.exports = {
  call,
  multiCall,
  getLogs,
  parseAbi,
  isValidNumber,
  sumSingleBalance,
  getDefaultProvider,
  createCSVFromBatchResults,
  convertBalanceToUSDC,
  convertBalanceToUSDC_uniV2,
};
