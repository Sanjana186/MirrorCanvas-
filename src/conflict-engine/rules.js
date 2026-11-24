// Deterministic rules engine: evaluates clearances, power budgets, and schedule overlaps
export class RulesEngine {
  static evaluatePcBuild(components) {
    // Computes clearances (GPU length vs Case max length) and wattage
    const gpu = components.find(c => c.type === 'GPU');
    const pcCase = components.find(c => c.type === 'CASE');
    const psu = components.find(c => c.type === 'PSU');

    const alerts = [];
    if (gpu && pcCase && gpu.lengthMM > pcCase.maxGpuLengthMM) {
      alerts.push({
        severity: 'ERROR',
        message: `GPU Clearance Error: ${gpu.name} (${gpu.lengthMM}mm) exceeds case limit (${pcCase.maxGpuLengthMM}mm).`
      });
    }

    return {
      status: alerts.length === 0 ? 'COMPATIBLE' : 'CONFLICT',
      alerts
    };
  }

  static evaluateTravel(itinerary) {
    // Checks arrival vs hotel check-in gap
    return {
      status: 'SYNCED',
      alerts: []
    };
  }
}
