const SUPABASE_URL = "https://iyitiknnrcsmbwwwwolu.supabase.co";
const SUPABASE_KEY = "sb_publishable_WdjU1jQEjusa7dt-3hERYQ__GSokW1B";
const SUPABASE_SDK = "./js/supabase.js";

// Load the self-hosted Supabase SDK on demand, so it never delays the app
function loadSupabaseClient(timeoutMs = 8000) {
	return new Promise((resolve, reject) => {
		if (window.supabase) return resolve(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY));

		const script = document.createElement("script");
		script.src = SUPABASE_SDK;
		script.async = true;

		const timer = setTimeout(() => {
			script.remove();
			reject(new Error("Supabase SDK timeout"));
		}, timeoutMs);

		script.onload = () => {
			clearTimeout(timer);
			resolve(window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY));
		};
		script.onerror = () => {
			clearTimeout(timer);
			reject(new Error("Supabase SDK failed to load"));
		};

		document.head.appendChild(script);
	});
}
