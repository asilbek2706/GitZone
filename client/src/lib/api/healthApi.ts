import { baseApi } from './baseApi';

export const healthApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getHealth: build.query<{ status?: string }, void>({ query: () => '/api/health' }),
  }),
});

export const { useGetHealthQuery } = healthApi;
