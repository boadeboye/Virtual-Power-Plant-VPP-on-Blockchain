import { describe, expect, it, vi, beforeEach } from "vitest";

// Interfaces for type safety
interface ClarityResponse<T> {
  ok: boolean;
  value: T | number; // number for error codes
}

interface DeviceAggregate {
  totalEnergy: number;
  lastUpdated: number;
  active: boolean;
}

interface ProductionReport {
  energyKwh: number;
  timestamp: number;
  verified: boolean;
}

interface VppStats {
  totalEnergy: number;
  reserveThreshold: number;
  lastForecast: number;
}

interface Forecast {
  predictedEnergy: number;
  actualEnergy: number;
}

interface ContractState {
  deviceAggregates: Map<string, DeviceAggregate>;
  productionReports: Map<string, ProductionReport>;
  vppStats: Map<string, VppStats>;
  historicalForecasts: Map<string, Forecast>;
  contractPaused: boolean;
  governanceContract: string;
  oracleContract: string;
  marketplaceContract: string;
  reserveThreshold: number;
  totalVppEnergy: number;
  contractOwner: string;
}

// Mock contract implementation
class AggregationContractMock {
  private state: ContractState = {
    deviceAggregates: new Map(),
    productionReports: new Map(),
    vppStats: new Map(),
    historicalForecasts: new Map(),
    contractPaused: false,
    governanceContract: "SP000000000000000000002Q6VF78",
    oracleContract: "SP000000000000000000002Q6VF78",
    marketplaceContract: "SP000000000000000000002Q6VF78",
    reserveThreshold: 1000,
    totalVppEnergy: 0,
    contractOwner: "deployer",
  };

  private ERR_UNAUTHORIZED = 100;
  private ERR_INVALID_AMOUNT = 101;
  private ERR_INVALID_DEVICE = 102;
  private ERR_PAUSED = 103;
  private ERR_GOVERNANCE_NOT_APPROVED = 104;
  private ERR_INVALID_TIMESTAMP = 105;
  private ERR_INVALID_THRESHOLD = 106;

  constructor() {
    // Initialize mock data
    this.state.deviceAggregates.set("1", {
      totalEnergy: 0,
      lastUpdated: 0,
      active: true,
    });
    this.state.vppStats.set("1", {
      totalEnergy: 0,
      reserveThreshold: 1000,
      lastForecast: 0,
    });
  }

  getDeviceAggregate(deviceId: number): ClarityResponse<DeviceAggregate | null> {
    return { ok: true, value: this.state.deviceAggregates.get(deviceId.toString()) ?? null };
  }

  getProductionReport(deviceId: number, reportId: number): ClarityResponse<ProductionReport | null> {
    return { ok: true, value: this.state.productionReports.get(`${deviceId}-${reportId}`) ?? null };
  }

  getVppStats(vppId: number): ClarityResponse<VppStats | null> {
    return { ok: true, value: this.state.vppStats.get(vppId.toString()) ?? null };
  }

  getForecast(vppId: number, timestamp: number): ClarityResponse<Forecast | null> {
    return { ok: true, value: this.state.historicalForecasts.get(`${vppId}-${timestamp}`) ?? null };
  }

  isContractPaused(): ClarityResponse<boolean> {
    return { ok: true, value: this.state.contractPaused };
  }

  getTotalVppEnergy(): ClarityResponse<number> {
    return { ok: true, value: this.state.totalVppEnergy };
  }

  getReserveThreshold(): ClarityResponse<number> {
    return { ok: true, value: this.state.reserveThreshold };
  }

  private mockBlockInfo(): ClarityResponse<number> {
    return { ok: true, value: Date.now() };
  }

  private mockGovernanceCheck(proposalId: number): ClarityResponse<boolean> {
    return { ok: true, value: true };
  }

  registerDeviceEnergy(
    caller: string,
    deviceId: number,
    energyKwh: number,
    timestamp: number,
    reportId: number
  ): ClarityResponse<boolean> {
    if (this.state.contractPaused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    const aggregate = this.state.deviceAggregates.get(deviceId.toString());
    if (!aggregate) {
      return { ok: false, value: this.ERR_INVALID_DEVICE };
    }
    if (!aggregate.active) {
      return { ok: false, value: this.ERR_INVALID_DEVICE };
    }
    if (energyKwh <= 0) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    const currentBlock = this.mockBlockInfo();
    if (!currentBlock.ok) {
      return { ok: false, value: this.ERR_INVALID_TIMESTAMP };
    }

    this.state.productionReports.set(`${deviceId}-${reportId}`, {
      energyKwh,
      timestamp: currentBlock.value,
      verified: false,
    });
    this.state.deviceAggregates.set(deviceId.toString(), {
      ...aggregate,
      totalEnergy: aggregate.totalEnergy + energyKwh,
      lastUpdated: currentBlock.value,
    });
    this.state.totalVppEnergy += energyKwh;
    return { ok: true, value: true };
  }

  verifyReport(caller: string, deviceId: number, reportId: number): ClarityResponse<boolean> {
    if (caller !== this.state.oracleContract) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    const report = this.state.productionReports.get(`${deviceId}-${reportId}`);
    if (!report) {
      return { ok: false, value: this.ERR_INVALID_DEVICE };
    }
    this.state.productionReports.set(`${deviceId}-${reportId}`, {
      ...report,
      verified: true,
    });
    return { ok: true, value: true };
  }

  updateReserveThreshold(caller: string, newThreshold: number, proposalId: number): ClarityResponse<boolean> {
    if (this.state.contractPaused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    if (!this.mockGovernanceCheck(proposalId).ok) {
      return { ok: false, value: this.ERR_GOVERNANCE_NOT_APPROVED };
    }
    if (newThreshold <= 0) {
      return { ok: false, value: this.ERR_INVALID_THRESHOLD };
    }
    this.state.reserveThreshold = newThreshold;
    return { ok: true, value: true };
  }

  generateForecast(caller: string, vppId: number): ClarityResponse<number> {
    if (this.state.contractPaused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    const stats = this.state.vppStats.get(vppId.toString());
    if (!stats) {
      return { ok: false, value: this.ERR_INVALID_DEVICE };
    }
    const forecast = Math.floor(this.state.totalVppEnergy / 5); // Mock forecast
    const currentBlock = this.mockBlockInfo();
    if (!currentBlock.ok) {
      return { ok: false, value: this.ERR_INVALID_TIMESTAMP };
    }
    this.state.historicalForecasts.set(`${vppId}-${currentBlock.value}`, {
      predictedEnergy: forecast,
      actualEnergy: 0,
    });
    this.state.vppStats.set(vppId.toString(), {
      ...stats,
      totalEnergy: this.state.totalVppEnergy,
      reserveThreshold: this.state.reserveThreshold,
      lastForecast: forecast,
    });
    return { ok: true, value: forecast };
  }

  balanceSupply(caller: string, vppId: number, requiredEnergy: number): ClarityResponse<boolean> {
    if (this.state.contractPaused) {
      return { ok: false, value: this.ERR_PAUSED };
    }
    const stats = this.state.vppStats.get(vppId.toString());
    if (!stats) {
      return { ok: false, value: this.ERR_INVALID_DEVICE };
    }
    if (this.state.totalVppEnergy < requiredEnergy + this.state.reserveThreshold) {
      return { ok: false, value: this.ERR_INVALID_AMOUNT };
    }
    this.state.totalVppEnergy -= requiredEnergy;
    this.state.vppStats.set(vppId.toString(), {
      ...stats,
      totalEnergy: stats.totalEnergy - requiredEnergy,
    });
    return { ok: true, value: true };
  }

  pauseContract(caller: string): ClarityResponse<boolean> {
    if (caller !== this.state.contractOwner) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.contractPaused = true;
    return { ok: true, value: true };
  }

  unpauseContract(caller: string): ClarityResponse<boolean> {
    if (caller !== this.state.contractOwner) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.contractPaused = false;
    return { ok: true, value: true };
  }

  setGovernanceContract(caller: string, newGovernance: string): ClarityResponse<boolean> {
    if (caller !== this.state.contractOwner) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.governanceContract = newGovernance;
    return { ok: true, value: true };
  }

  setOracleContract(caller: string, newOracle: string): ClarityResponse<boolean> {
    if (caller !== this.state.contractOwner) {
      return { ok: false, value: this.ERR_UNAUTHORIZED };
    }
    this.state.oracleContract = newOracle;
    return { ok: true, value: true };
  }
}

// Test setup
const accounts = {
  deployer: "deployer",
  oracle: "SP000000000000000000002Q6VF78",
  user1: "wallet_1",
  user2: "wallet_2",
};

describe("AggregationContract", () => {
  let contract: AggregationContractMock;

  beforeEach(() => {
    contract = new AggregationContractMock();
    vi.resetAllMocks();
  });

  it("should initialize with correct state", () => {
    expect(contract.isContractPaused()).toEqual({ ok: true, value: false });
    expect(contract.getTotalVppEnergy()).toEqual({ ok: true, value: 0 });
    expect(contract.getReserveThreshold()).toEqual({ ok: true, value: 1000 });
    expect(contract.getDeviceAggregate(1)).toEqual({
      ok: true,
      value: { totalEnergy: 0, lastUpdated: 0, active: true },
    });
  });

  it("should allow registering device energy", () => {
    const result = contract.registerDeviceEnergy(accounts.user1, 1, 500, Date.now(), 1);
    expect(result).toEqual({ ok: true, value: true });
    expect(contract.getDeviceAggregate(1)).toEqual({
      ok: true,
      value: expect.objectContaining({ totalEnergy: 500, active: true }),
    });
    expect(contract.getProductionReport(1, 1)).toEqual({
      ok: true,
      value: expect.objectContaining({ energyKwh: 500, verified: false }),
    });
    expect(contract.getTotalVppEnergy()).toEqual({ ok: true, value: 500 });
  });

  it("should prevent registering energy for invalid device", () => {
    const result = contract.registerDeviceEnergy(accounts.user1, 999, 500, Date.now(), 1);
    expect(result).toEqual({ ok: false, value: 102 });
  });

  it("should prevent registering zero or negative energy", () => {
    const result = contract.registerDeviceEnergy(accounts.user1, 1, 0, Date.now(), 1);
    expect(result).toEqual({ ok: false, value: 101 });
  });

  it("should allow oracle to verify reports", () => {
    contract.registerDeviceEnergy(accounts.user1, 1, 500, Date.now(), 1);
    const result = contract.verifyReport(accounts.oracle, 1, 1);
    expect(result).toEqual({ ok: true, value: true });
    expect(contract.getProductionReport(1, 1)).toEqual({
      ok: true,
      value: expect.objectContaining({ verified: true }),
    });
  });

  it("should prevent non-oracle from verifying reports", () => {
    contract.registerDeviceEnergy(accounts.user1, 1, 500, Date.now(), 1);
    const result = contract.verifyReport(accounts.user1, 1, 1);
    expect(result).toEqual({ ok: false, value: 100 });
  });

  it("should allow updating reserve threshold with governance approval", () => {
    const result = contract.updateReserveThreshold(accounts.deployer, 2000, 1);
    expect(result).toEqual({ ok: true, value: true });
    expect(contract.getReserveThreshold()).toEqual({ ok: true, value: 2000 });
  });

  it("should prevent updating reserve threshold without governance approval", () => {
    vi.spyOn(contract, "mockGovernanceCheck").mockReturnValueOnce({ ok: false, value: 104 });
    const result = contract.updateReserveThreshold(accounts.deployer, 2000, 1);
    expect(result).toEqual({ ok: false, value: 104 });
  });

  it("should generate forecast", () => {
    contract.registerDeviceEnergy(accounts.user1, 1, 1000, Date.now(), 1);
    const result = contract.generateForecast(accounts.user1, 1);
    expect(result).toEqual({ ok: true, value: expect.any(Number) });
    expect(contract.getVppStats(1)).toEqual({
      ok: true,
      value: expect.objectContaining({ lastForecast: expect.any(Number) }),
    });
  });

  it("should prevent balancing supply when insufficient energy", () => {
    contract.registerDeviceEnergy(accounts.user1, 1, 1000, Date.now(), 1);
    const result = contract.balanceSupply(accounts.user1, 1, 2000);
    expect(result).toEqual({ ok: false, value: 101 });
  });

  it("should allow pausing and unpausing contract by owner", () => {
    const pauseResult = contract.pauseContract(accounts.deployer);
    expect(pauseResult).toEqual({ ok: true, value: true });
    expect(contract.isContractPaused()).toEqual({ ok: true, value: true });

    const registerDuringPause = contract.registerDeviceEnergy(accounts.user1, 1, 500, Date.now(), 1);
    expect(registerDuringPause).toEqual({ ok: false, value: 103 });

    const unpauseResult = contract.unpauseContract(accounts.deployer);
    expect(unpauseResult).toEqual({ ok: true, value: true });
    expect(contract.isContractPaused()).toEqual({ ok: true, value: false });
  });

  it("should prevent non-owner from pausing contract", () => {
    const pauseResult = contract.pauseContract(accounts.user1);
    expect(pauseResult).toEqual({ ok: false, value: 100 });
  });

  it("should allow setting governance contract by owner", () => {
    const result = contract.setGovernanceContract(accounts.deployer, "new-governance");
    expect(result).toEqual({ ok: true, value: true });
  });

  it("should prevent non-owner from setting governance contract", () => {
    const result = contract.setGovernanceContract(accounts.user1, "new-governance");
    expect(result).toEqual({ ok: false, value: 100 });
  });
});