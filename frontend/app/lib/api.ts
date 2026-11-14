const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

if (!process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === 'production') {
  console.error(
    '[API] CRITICAL: NEXT_PUBLIC_API_URL is not set in production. ' +
    'API calls will default to localhost and fail. ' +
    'Please set this in your Vercel Environment Variables.'
  );
}

export { API_URL };