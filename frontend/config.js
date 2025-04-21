// export const API_URL = 'http://192.168.168.100:8000';
// export const WS_URL = 'ws://192.168.168.100:8000';

export const API_URL = import.meta.env.VITE_API_URL || '';
export const WS_URL = import.meta.env.VITE_WS_URL || '';

