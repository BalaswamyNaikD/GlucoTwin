const browserApiOrigin =
  typeof window !== 'undefined' && window.location.hostname
    ? `${window.location.protocol}//${window.location.hostname}:5000`
    : 'http://127.0.0.1:5000';

export const API_ORIGIN = process.env.REACT_APP_API_ORIGIN || browserApiOrigin;

export const API_BASE = process.env.REACT_APP_API_URL || `${API_ORIGIN}/api`;

const browserBookingApiOrigin =
  typeof window !== 'undefined' && window.location.hostname
    ? `${window.location.protocol}//${window.location.hostname}:5001`
    : 'http://127.0.0.1:5001';

export const BOOKING_API_ORIGIN =
  process.env.REACT_APP_BOOKING_API_ORIGIN || browserBookingApiOrigin;

export const BOOKING_API_BASE = process.env.REACT_APP_BOOKING_API_URL || `${BOOKING_API_ORIGIN}/api`;
