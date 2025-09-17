import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// Lazily and safely expose a client only when env is present
export const redis: Redis | null = url && token ? new Redis({ url, token }) : null;
