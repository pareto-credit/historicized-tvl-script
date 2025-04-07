const CHAINS_BLOCKS = {
  ethereum: {
    start: 21948291,
    end: 22163174,
    interval: 6931,
  },
  polygon: {
    start: 68495243,
    end: 69703380,
    interval: 38972,
  },
  polygon_zkevm: {
    start: 20323830,
    end: 21107306,
    interval: 25273,
  },
  optimism: {
    start: 132594232,
    end: 133890238,
    interval: 41807,
  },
  arbitrum: {
    start: 310947198,
    end: 321277914,
    interval: 333249,
  },
};

const contracts = {
  ethereum: {
    wrap4626: [
      "0xcf96f4b91c6d424fb34aa9a33855b5c8ed1fe66d",
      "0x79F05f75df6c156B2B98aC1FBfb3637fc1e6f048",
      "0xa35B7A9fe5DC4cD51bA47ACdf67B0f41c893329A",
      "0xA9F908DA2E3Ec7475a743e97Bb5B06081B688aE4",
    ],
    v1: [
      "0xC8E6CA6E96a326dC448307A5fDE90a0b21fd7f80", // idleWETHYield
      "0x5C960a3DCC01BE8a0f49c02A8ceBCAcf5D07fABe", // idleRAIYield
      "0xb2d5CB72A621493fe83C6885E4A776279be595bC", // idleFEIYield
      "0x3fe7940616e5bc47b0775a0dccf6237893353bb4", // idleDAIYield
      "0x5274891bEC421B39D23760c04A6755eCB444797C", // idleUSDCYield
      "0xF34842d05A1c888Ca02769A633DF37177415C2f8", // idleUSDTYield
      "0xf52cdcd458bf455aed77751743180ec4a595fd3f", // idleSUSDYield
      "0xc278041fDD8249FE4c1Aad1193876857EEa3D68c", // idleTUSDYield
      "0x8C81121B15197fA0eEaEE1DC75533419DcfD3151", // idleWBTCYield
      "0xDc7777C771a6e4B3A82830781bDDe4DBC78f320e", // idleUSDCBB
      "0xfa3AfC9a194BaBD56e743fA3b7aA2CcbED3eAaad", // idleUSDTBB
    ],
    v3: [
      "0x78751b12da02728f467a44eac40f5cbc16bd7934", // idleDAIYieldV3
      "0x12B98C621E8754Ae70d0fDbBC73D6208bC3e3cA6", // idleUSDCYieldV3
      "0x63D27B3DA94A9E871222CB0A32232674B02D2f2D", // idleUSDTYieldV3
      "0xe79e177d2a5c7085027d7c64c8f271c81430fc9b", // idleSUSDYieldV3
      "0x51C77689A9c2e8cCBEcD4eC9770a1fA5fA83EeF1", // idleTUSDYieldV3
      "0xD6f279B7ccBCD70F8be439d25B9Df93AEb60eC55", // idleWBTCYieldV3
      "0x1846bdfDB6A0f5c473dEc610144513bd071999fB", // idleDAISafeV3
      "0xcDdB1Bceb7a1979C6caa0229820707429dd3Ec6C", // idleUSDCSafeV3
      "0x42740698959761baf1b06baa51efbd88cb1d862b", // idleUSDTSafeV3
    ],
    safe: [
      "0x28fAc5334C9f7262b3A3Fe707e250E01053e07b5", // idleUSDTSafe
      "0x3391bc034f2935ef0e1e41619445f998b2680d35", // idleUSDCSafe
      "0xa14ea0e11121e6e951e87c66afe460a00bcd6a16", // idleDAISafe
    ],
    cdos: [
      "0xbc48967c34d129a2ef25dd4dc693cc7364d02eb9", // Gearbox
      "0xF87ec7e1Ee467d7d78862089B92dd40497cBa5B8", // MATIC
      "0xDcE26B2c78609b983cF91cCcD43E238353653b0E", // IdleCDO_clearpool_DAI
      "0xd0DbcD556cA22d3f3c142e9a3220053FD7a247BC",
      "0x1f5A97fB665e295303D2F7215bA2160cc5313c8E", //
      "0x8E0A8A5c1e5B3ac0670Ea5a613bB15724D51Fc37", // Instadapp stETH
      "0xf6223C567F21E33e859ED7A045773526E9E3c2D5", // Fasanara Yield vault
    ],
    credits: [
      "0xf6223C567F21E33e859ED7A045773526E9E3c2D5", // Fasanara Yield vault
    ],
  },
  polygon: {
    v1: [
      "0x8a999F5A3546F8243205b2c0eCb0627cC10003ab", // idleDAIYield
      "0x1ee6470CD75D5686d0b2b90C0305Fa46fb0C89A1", // idleUSDCYield
      "0xfdA25D931258Df948ffecb66b5518299Df6527C4", // idleWETHYield
    ],
    cdos: [
      "0xF9E2AE779a7d25cDe46FccC41a27B8A4381d4e52", // Bastion CV
    ],
    credits: [
      "0xF9E2AE779a7d25cDe46FccC41a27B8A4381d4e52", // Bastion CV
    ],
  },
  polygon_zkevm: {
    cdos: [
      "0x6b8A1e78Ac707F9b0b5eB4f34B02D9af84D2b689", // IdleCDO_clearpool_portofino_USDT
    ],
  },
  optimism: {
    cdos: [
      "0xD2c0D848aA5AD1a4C12bE89e713E70B73211989B", // FalconX
    ],
    credits: [
      "0xD2c0D848aA5AD1a4C12bE89e713E70B73211989B", // FalconX
    ],
  },
  arbitrum: {
    cdos: [
      "0x3919396Cd445b03E6Bb62995A7a4CB2AC544245D", // Bastion Credit Vault
    ],
    credits: [
      "0x3919396Cd445b03E6Bb62995A7a4CB2AC544245D", // Bastion Credit Vault
    ],
  },
};

const trancheConfig = {
  ethereum: {
    factory: "0x3c9916bb9498f637e2fa86c2028e26275dc9a631",
    fromBlock: 13244388,
  },
  polygon_zkevm: {
    factory: "0xba43DE746840eD16eE53D26af0675d8E6c24FE38",
    fromBlock: 2812767,
  },
  optimism: {
    factory: "0x8aA1379e46A8C1e9B7BB2160254813316b5F35B8",
    fromBlock: 110449062,
  },
};

const MULTICALL_ADDR = "0xcA11bde05977b3631167028862bE2a173976CA11";

const UNISWAP_V3_QUOTER = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";
const QUOTER_ABI = [
  "function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)",
];

const UNISWAWP_PAIRS = {
  ethereum: {
    usdcAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    tokens: {
      "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": {
        version: "v2",
        path: [
          "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
          "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
          "0xae7ab96520de3a18e5e111b5eaab095312d7fe84",
        ],
      },
      "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599": {
        fee: 500,
      },
      "0x03ab458634910aad20ef5f1c8ee96f1d6ac54919": {
        fee: 500,
      },
      "0x956f47f50a910163d8bf957cf5846d573e7f87ca": {
        fee: 100,
      },
      "0xdac17f958d2ee523a2206206994597c13d831ec7": {
        fee: 100,
      },
      "0x6b175474e89094c44da98b954eedeac495271d0f": {
        fee: 100,
      },
    },
  },
  optimism: {
    usdcAddress: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
    tokens: {
      "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58": {
        fee: 100,
      },
      "0x7f5c764cbc14f9669b88837ca1490cca17c31607": {
        fee: 100,
      },
    },
  },
  polygon: {
    usdcAddress: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    tokens: {
      "0xc2132d05d31c914a87c6611c10748aeb04b58e8f": {
        fee: 100,
      },
      "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619": {
        fee: 500,
      },
      "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063": {
        fee: 100,
      },
    },
  },
  polygon_zkevm: {
    usdcAddress: "0xa8ce8aee21bc2a48a5ef670afcc9274c7bbbc035",
  },
  arbitrum: {
    usdcAddress: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  },
};

const UNISWAP_V2_ROUTER = {
  ethereum: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D", // Uniswap V2 Router on Ethereum
};

const UNISWAP_V2_ABI = [
  "function getAmountsIn(uint amountOut, address[] memory path) public view returns (uint[] memory amounts)",
];

module.exports = {
  CHAINS_BLOCKS,
  contracts,
  trancheConfig,
  MULTICALL_ADDR,
  UNISWAP_V3_QUOTER,
  QUOTER_ABI,
  UNISWAWP_PAIRS,
  UNISWAP_V2_ROUTER,
  UNISWAP_V2_ABI,
};
