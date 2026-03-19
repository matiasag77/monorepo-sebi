import type { NextConfig } from "next";

// 1. Verificamos si estamos en entorno de desarrollo
const isDev = true; //process.env.NODE_ENV !== 'production';

// 2. Extraemos el origen del API BFF desde la variable de entorno
const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
const apiOrigin = apiUrl ? new URL(apiUrl).origin : '';

// 3. Construimos la regla CSP de forma dinámica
const cspHeader = `
  default-src 'self';
  script-src 'self' ${isDev ? "'unsafe-inline'" : "'sha256-JInuATuLt9Y3pmQmptAtVt487Xjd0sdd21pif4NRzMI='"};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://accounts.google.com${apiOrigin ? ` ${apiOrigin}` : ''};
`
  .replace(/\n/g, '') // Eliminamos los saltos de línea para evitar errores HTTP
  .replace(/\s+/g, ' ') // Quitamos espacios extra
  .trim();

// 3. Tus headers de seguridad, ahora inyectando el CSP dinámico
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: cspHeader,
  },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;