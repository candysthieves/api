import { readFile } from 'node:fs/promises';
import { availableParallelism, cpus, freemem, totalmem } from 'node:os';

export async function getRuntimeResources(): Promise<Record<string, unknown>> {
  const [cpuMax, memoryMax] = await Promise.all([
    readOptional('/sys/fs/cgroup/cpu.max'),
    readOptional('/sys/fs/cgroup/memory.max'),
  ]);
  const [quota, period] = cpuMax?.split(/\s+/) ?? [];
  const quotaCores =
    quota && quota !== 'max' && period && Number(quota) > 0 && Number(period) > 0
      ? Number((Number(quota) / Number(period)).toFixed(3))
      : null;
  const memoryLimit = memoryMax && memoryMax !== 'max' ? Number(memoryMax) : null;

  return {
    nodeVersion: process.version,
    hostLogicalCpuCores: cpus().length,
    availableCpuCores: availableParallelism(),
    cgroupCpuQuotaCores: quotaCores,
    hostMemoryTotalMiB: toMiB(totalmem()),
    hostMemoryFreeMiB: toMiB(freemem()),
    cgroupMemoryLimitMiB:
      Number.isFinite(memoryLimit) && memoryLimit! < 2 ** 60
        ? toMiB(memoryLimit!)
        : null,
    processRssMiB: toMiB(process.memoryUsage().rss),
    libuvThreadPoolSize: process.env.UV_THREADPOOL_SIZE ?? 'default (4)',
  };
}

async function readOptional(path: string): Promise<string | null> {
  try {
    return (await readFile(path, 'utf8')).trim();
  } catch {
    return null;
  }
}

function toMiB(bytes: number): number {
  return Number((bytes / 1024 / 1024).toFixed(1));
}
