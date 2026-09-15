import { readFile } from 'node:fs/promises';
import {
  arch,
  availableParallelism,
  cpus,
  freemem,
  platform,
  release,
  totalmem,
} from 'node:os';

type CgroupResources = {
  cpuQuotaCores: number | null;
  memoryLimitBytes: number | null;
};

export async function getRuntimeResources(): Promise<Record<string, unknown>> {
  const cgroup = await getCgroupResources();

  return {
    platform: platform(),
    architecture: arch(),
    kernel: release(),
    nodeVersion: process.version,
    hostLogicalCpuCores: cpus().length,
    availableCpuCores: availableParallelism(),
    cgroupCpuQuotaCores: cgroup.cpuQuotaCores,
    hostMemoryTotalMiB: toMiB(totalmem()),
    hostMemoryFreeMiB: toMiB(freemem()),
    cgroupMemoryLimitMiB:
      cgroup.memoryLimitBytes === null ? null : toMiB(cgroup.memoryLimitBytes),
    processRssMiB: toMiB(process.memoryUsage().rss),
    libuvThreadPoolSize: process.env.UV_THREADPOOL_SIZE ?? 'default (4)',
  };
}

async function getCgroupResources(): Promise<CgroupResources> {
  const v2Cpu = await readOptional('/sys/fs/cgroup/cpu.max');
  const v2Memory = await readOptional('/sys/fs/cgroup/memory.max');
  if (v2Cpu !== null || v2Memory !== null) {
    return {
      cpuQuotaCores: parseV2CpuQuota(v2Cpu),
      memoryLimitBytes: parseLimit(v2Memory),
    };
  }

  const [quota, period, memory] = await Promise.all([
    readOptional('/sys/fs/cgroup/cpu/cpu.cfs_quota_us'),
    readOptional('/sys/fs/cgroup/cpu/cpu.cfs_period_us'),
    readOptional('/sys/fs/cgroup/memory/memory.limit_in_bytes'),
  ]);
  const quotaValue = Number(quota);
  const periodValue = Number(period);

  return {
    cpuQuotaCores:
      Number.isFinite(quotaValue) && Number.isFinite(periodValue) && quotaValue > 0 && periodValue > 0
        ? Number((quotaValue / periodValue).toFixed(3))
        : null,
    memoryLimitBytes: parseLimit(memory),
  };
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return (await readFile(path, 'utf8')).trim();
  } catch {
    return null;
  }
}

function parseV2CpuQuota(value: string | null): number | null {
  if (!value) return null;
  const [quota, period] = value.split(/\s+/);
  if (quota === 'max') return null;

  const quotaValue = Number(quota);
  const periodValue = Number(period);
  return Number.isFinite(quotaValue) && Number.isFinite(periodValue) && quotaValue > 0 && periodValue > 0
    ? Number((quotaValue / periodValue).toFixed(3))
    : null;
}

function parseLimit(value: string | null): number | null {
  if (!value || value === 'max') return null;
  const limit = Number(value);
  // cgroup v1 often reports an effectively unlimited value close to 2^63.
  return Number.isFinite(limit) && limit > 0 && limit < 2 ** 60 ? limit : null;
}

function toMiB(bytes: number): number {
  return Number((bytes / 1024 / 1024).toFixed(1));
}
