
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const fetchWithNetworkErrorMessage = async (...args) => {
	try {
		return await fetch(...args)
	} catch (error) {
		if (
			typeof navigator !== 'undefined' &&
			!navigator.onLine &&
			error instanceof Error &&
			/^failed to fetch$/i.test(error.message)
		) {
			throw new TypeError(`${error.message}: internet disconnected`, { cause: error })
		}

		throw error
	}
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
	global: { fetch: fetchWithNetworkErrorMessage },
})