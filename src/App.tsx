import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { router } from './router'
const client = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, gcTime: 300000, retry: (count, error) => count < 1 && !(isAxiosError(error) && error.response && error.response.status < 500), refetchOnWindowFocus: true } } })
export default function App() { return <QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider> }
