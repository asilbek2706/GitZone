import { z } from 'zod';

/** Server tomonidagi muhit o'zgaruvchilari. Brauzer kodida import qilmang. */
const serverSchema = z.object({
  API_URL: z.string().url().default('http://localhost:5000'),
});

export const getServerEnv = () => serverSchema.parse({ API_URL: process.env.API_URL });
