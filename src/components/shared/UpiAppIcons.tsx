export function PhonePeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="PhonePe">
      <rect width="40" height="40" rx="8" fill="#5F259F" />
      <text x="20" y="26" textAnchor="middle" fill="white" fontSize="14" fontWeight="700" fontFamily="system-ui">Pe</text>
    </svg>
  );
}

export function GooglePayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Google Pay">
      <rect width="40" height="40" rx="8" fill="white" />
      <g transform="translate(8, 8)">
        <path d="M10.5 8.5v7H9V6h1.5v2.5z" fill="#4285F4" />
        <path d="M14 6c1.1 0 2 .9 2 2v7h-1.5v-2.5H14a2.5 2.5 0 010-5h.5V6H14z" fill="#34A853" />
        <path d="M14 11h1.5v2H14z" fill="#FBBC04" />
        <circle cx="14" cy="8.5" r="1.5" fill="#EA4335" />
      </g>
    </svg>
  );
}

export function PaytmIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Paytm">
      <rect width="40" height="40" rx="8" fill="#00BAF2" />
      <text x="20" y="26" textAnchor="middle" fill="white" fontSize="10" fontWeight="700" fontFamily="system-ui">Paytm</text>
    </svg>
  );
}

export function BHIMIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="BHIM">
      <rect width="40" height="40" rx="8" fill="#0D6EAD" />
      <text x="20" y="26" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="system-ui">BHIM</text>
    </svg>
  );
}

export function UPIIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="UPI">
      <rect width="40" height="40" rx="8" fill="#1A1A2E" />
      <text x="20" y="26" textAnchor="middle" fill="white" fontSize="13" fontWeight="700" fontFamily="system-ui">UPI</text>
    </svg>
  );
}
